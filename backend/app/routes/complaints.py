import os
import json
import random
import uuid
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.config import settings
from app.database import get_db
from app.models import Complaint, WasteDetection, Worker
from app.schemas import ComplaintResponse, ComplaintCreateFormResponse, ComplaintAssignRequest, WorkerPublic, WasteDetectionSchema
from app.services.worker_assignment import assign_worker_for_complaint
from app.services.classifier import get_cleanup_methods, get_demo_detections
from app.services.notifications import send_complaint_assigned_email

router = APIRouter(prefix="/api/complaints", tags=["complaints"])

def generate_public_id(db: Session) -> str:
    """Generate a unique complaint ID matching WM-XXXXX format."""
    for _ in range(50):
        candidate = f"WM-{random.randint(10000, 99999)}"
        exists = db.query(Complaint).filter(Complaint.public_id == candidate).first()
        if not exists:
            return candidate
    return f"WM-{uuid.uuid4().hex[:5].upper()}"

def format_complaint_response(complaint: Complaint) -> ComplaintResponse:
    worker_public = None
    if complaint.assigned_worker:
        worker_public = WorkerPublic(
            id=complaint.assigned_worker.id,
            name=complaint.assigned_worker.name,
            username=complaint.assigned_worker.username,
            phone=complaint.assigned_worker.phone,
            open_jobs_count=0
        )

    detections_list = [
        WasteDetectionSchema(
            category=d.category,
            count=d.count,
            confidence=d.confidence
        )
        for d in complaint.detections
    ]
    
    categories = [d.category for d in complaint.detections]
    methods = get_cleanup_methods(categories)

    return ComplaintResponse(
        id=complaint.id,
        public_id=complaint.public_id,
        citizen_name=complaint.citizen_name,
        citizen_email=complaint.citizen_email,
        location_text=complaint.location_text,
        latitude=complaint.latitude,
        longitude=complaint.longitude,
        original_image_url=complaint.original_image_url,
        proof_image_url=complaint.proof_image_url,
        status=complaint.status,
        assigned_worker=worker_public,
        detections=detections_list,
        suggested_cleanup_methods=methods,
        created_at=complaint.created_at,
        assigned_at=complaint.assigned_at,
        completed_at=complaint.completed_at
    )

@router.post("", response_model=ComplaintCreateFormResponse)
async def create_complaint(
    citizen_name: str = Form(...),
    citizen_email: str = Form(...),
    location_text: str = Form(...),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    temp_image_url: Optional[str] = Form(None),
    detections_json: Optional[str] = Form(None),
    assigned_worker_id: Optional[int] = Form(None),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    if not citizen_name.strip():
        raise HTTPException(status_code=400, detail="Name is required.")
    if not citizen_email.strip() or "@" not in citizen_email:
        raise HTTPException(status_code=400, detail="A valid email address is required.")
    if not location_text.strip():
        raise HTTPException(status_code=400, detail="Location is required.")

    # Determine image path
    image_url = temp_image_url
    if file and file.filename:
        ext = os.path.splitext(file.filename)[1].lower()
        filename = f"waste_{uuid.uuid4().hex[:10]}{ext}"
        filepath = os.path.join(settings.UPLOAD_DIR, filename)
        content = await file.read()
        with open(filepath, "wb") as f:
            f.write(content)
        image_url = f"/uploads/{filename}"

    if not image_url:
        raise HTTPException(status_code=400, detail="Please upload a photo of the waste.")

    # Assign worker: either explicitly selected from database or auto-assigned
    worker = None
    if assigned_worker_id:
        worker = db.query(Worker).filter(Worker.id == assigned_worker_id, Worker.is_available == True).first()
    
    if not worker:
        worker = assign_worker_for_complaint(db)

    chosen_worker_id = worker.id if worker else None
    assigned_worker_name = worker.name if worker else "Unassigned"
    initial_status = "Assigned" if worker else "Pending"

    public_id = generate_public_id(db)

    complaint = Complaint(
        public_id=public_id,
        citizen_name=citizen_name.strip(),
        citizen_email=citizen_email.strip(),
        location_text=location_text.strip(),
        latitude=latitude,
        longitude=longitude,
        original_image_url=image_url,
        status=initial_status,
        assigned_worker_id=chosen_worker_id,
        created_at=datetime.utcnow(),
        assigned_at=datetime.utcnow() if worker else None
    )
    db.add(complaint)
    db.commit()
    db.refresh(complaint)
    db.refresh(complaint)

    # Process detections
    parsed_detections = []
    if detections_json:
        try:
            parsed_detections = json.loads(detections_json)
        except Exception:
            pass

    if not parsed_detections:
        parsed_detections = get_demo_detections()

    for item in parsed_detections:
        det = WasteDetection(
            complaint_id=complaint.id,
            category=item.get("category", "General Waste"),
            count=int(item.get("count", 1)),
            confidence=float(item.get("confidence", 0.90))
        )
        db.add(det)
    db.commit()

    # Trigger notification
    send_complaint_assigned_email(
        db=db,
        complaint_id=complaint.id,
        citizen_name=complaint.citizen_name,
        citizen_email=complaint.citizen_email,
        public_id=complaint.public_id,
        worker_name=assigned_worker_name,
        location=complaint.location_text
    )

    return ComplaintCreateFormResponse(
        success=True,
        public_id=complaint.public_id,
        assigned_worker_name=assigned_worker_name,
        status=complaint.status,
        message=f"Assigned to {assigned_worker_name}. A confirmation email is on its way."
    )

@router.get("/{public_id}", response_model=ComplaintResponse)
def get_complaint_by_public_id(public_id: str, db: Session = Depends(get_db)):
    clean_id = public_id.strip().upper()
    complaint = db.query(Complaint).filter(Complaint.public_id == clean_id).first()
    if not complaint:
        raise HTTPException(
            status_code=404,
            detail=f"No complaint found with ticket number '{public_id}'. Please check the ID and try again."
        )
    return format_complaint_response(complaint)

@router.patch("/{public_id}/assign", response_model=ComplaintResponse)
def assign_complaint_worker(
    public_id: str,
    payload: ComplaintAssignRequest,
    db: Session = Depends(get_db)
):
    """Assign or reassign an existing complaint to any worker in the database."""
    clean_id = public_id.strip().upper()
    complaint = db.query(Complaint).filter(Complaint.public_id == clean_id).first()
    if not complaint:
        raise HTTPException(
            status_code=404,
            detail=f"Complaint '{public_id}' not found."
        )

    worker = db.query(Worker).filter(Worker.id == payload.worker_id, Worker.is_available == True).first()
    if not worker:
        raise HTTPException(
            status_code=404,
            detail=f"Worker with ID {payload.worker_id} not found or unavailable."
        )

    complaint.assigned_worker_id = worker.id
    complaint.assigned_at = datetime.utcnow()
    if complaint.status == "Pending":
        complaint.status = "Assigned"
    db.commit()
    db.refresh(complaint)

    # Trigger email notification
    send_complaint_assigned_email(
        db=db,
        complaint_id=complaint.id,
        citizen_name=complaint.citizen_name,
        citizen_email=complaint.citizen_email,
        public_id=complaint.public_id,
        worker_name=worker.name,
        location=complaint.location_text
    )

    return format_complaint_response(complaint)

@router.get("", response_model=List[ComplaintResponse])
def list_complaints(skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    complaints = db.query(Complaint).order_by(Complaint.created_at.desc()).offset(skip).limit(limit).all()
    return [format_complaint_response(c) for c in complaints]
