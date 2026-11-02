import os
import uuid
from datetime import datetime
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.config import settings
from app.database import get_db
from app.models import Complaint, Worker
from app.schemas import ComplaintResponse, WorkerPublic
from app.services.auth import get_current_worker
from app.services.notifications import send_complaint_completed_email
from app.routes.complaints import format_complaint_response

router = APIRouter(prefix="/api/workers", tags=["workers"])

ALLOWED_PROOF_EXTS = {".jpg", ".jpeg", ".png", ".webp"}
MAX_PROOF_SIZE = 15 * 1024 * 1024

@router.get("", response_model=List[WorkerPublic])
def list_available_workers(db: Session = Depends(get_db)) -> List[WorkerPublic]:
    """Retrieve all active workers from the database with current job loads."""
    workers = db.query(Worker).filter(Worker.is_available == True).order_by(Worker.id.desc()).all()
    results = []
    for w in workers:
        active_count = (
            db.query(func.count(Complaint.id))
            .filter(
                Complaint.assigned_worker_id == w.id,
                Complaint.status.in_(["Assigned", "Pending"])
            )
            .scalar()
        )
        results.append(
            WorkerPublic(
                id=w.id,
                name=w.name,
                username=w.username,
                phone=w.phone,
                open_jobs_count=active_count
            )
        )
    return results

@router.get("/jobs")
def get_worker_jobs(
    current_worker: Worker = Depends(get_current_worker),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Retrieve assigned open jobs for the authenticated worker."""
    open_jobs = (
        db.query(Complaint)
        .filter(
            Complaint.assigned_worker_id == current_worker.id,
            Complaint.status.in_(["Assigned", "Pending"])
        )
        .order_by(Complaint.created_at.desc())
        .all()
    )

    open_count = len(open_jobs)
    worker_public = WorkerPublic(
        id=current_worker.id,
        name=current_worker.name,
        username=current_worker.username,
        phone=current_worker.phone,
        open_jobs_count=open_count
    )

    return {
        "worker": worker_public,
        "open_jobs_count": open_count,
        "jobs": [format_complaint_response(job) for job in open_jobs]
    }

@router.patch("/jobs/{public_id}/complete")
async def mark_job_completed(
    public_id: str,
    proof_image: UploadFile = File(...),
    current_worker: Worker = Depends(get_current_worker),
    db: Session = Depends(get_db)
):
    """Mark assigned job as completed by uploading proof of cleanup."""
    clean_id = public_id.strip().upper()
    complaint = db.query(Complaint).filter(Complaint.public_id == clean_id).first()

    if not complaint:
        raise HTTPException(status_code=404, detail=f"Complaint '{public_id}' not found.")

    if complaint.status == "Completed":
        raise HTTPException(status_code=400, detail="This complaint is already marked as completed.")

    # Validate proof image
    if not proof_image or not proof_image.filename:
        raise HTTPException(status_code=400, detail="Cleaned area proof image is required.")

    ext = os.path.splitext(proof_image.filename)[1].lower()
    if ext not in ALLOWED_PROOF_EXTS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported image format '{ext}'. Allowed formats: JPG, JPEG, PNG, WEBP."
        )

    content = await proof_image.read()
    if len(content) > MAX_PROOF_SIZE:
        raise HTTPException(status_code=400, detail="Proof image exceeds 15MB limit.")

    # Save proof image
    proof_filename = f"proof_{uuid.uuid4().hex[:10]}{ext}"
    proof_path = os.path.join(settings.UPLOAD_DIR, proof_filename)
    with open(proof_path, "wb") as f:
        f.write(content)

    proof_url = f"/uploads/{proof_filename}"

    # Update complaint
    complaint.status = "Completed"
    complaint.proof_image_url = proof_url
    complaint.completed_at = datetime.utcnow()
    db.commit()
    db.refresh(complaint)

    # Trigger notification with proof image
    send_complaint_completed_email(
        db=db,
        complaint_id=complaint.id,
        citizen_name=complaint.citizen_name,
        citizen_email=complaint.citizen_email,
        public_id=complaint.public_id,
        worker_name=current_worker.name,
        proof_image_path=proof_path,
        proof_image_url=proof_url
    )

    return {
        "success": True,
        "message": f"Complaint {complaint.public_id} successfully marked as completed!",
        "complaint": format_complaint_response(complaint)
    }
