from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models import Worker, Complaint
from app.schemas import WorkerLoginRequest, WorkerRegisterRequest, WorkerTokenResponse, WorkerPublic
from app.services.auth import verify_password, hash_password, create_access_token, get_current_worker

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/register", response_model=WorkerTokenResponse)
def register(request: WorkerRegisterRequest, db: Session = Depends(get_db)):
    """Register a real sanitation worker."""
    username = request.username.strip().lower()
    if not username:
        raise HTTPException(status_code=400, detail="Username is required.")
    if len(username) < 3:
        raise HTTPException(status_code=400, detail="Username must be at least 3 characters.")
    if not request.name.strip():
        raise HTTPException(status_code=400, detail="Full name is required.")
    if len(request.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")

    existing = db.query(Worker).filter(Worker.username == username).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Username already exists. Please choose a different username."
        )

    new_worker = Worker(
        name=request.name.strip(),
        username=username,
        password_hash=hash_password(request.password),
        phone=request.phone.strip() if request.phone else None,
        is_available=True
    )
    db.add(new_worker)
    db.commit()
    db.refresh(new_worker)

    token = create_access_token(data={"sub": new_worker.username, "worker_id": new_worker.id})
    worker_public = WorkerPublic(
        id=new_worker.id,
        name=new_worker.name,
        username=new_worker.username,
        phone=new_worker.phone,
        open_jobs_count=0
    )

    return WorkerTokenResponse(
        access_token=token,
        token_type="bearer",
        worker=worker_public
    )

@router.post("/login", response_model=WorkerTokenResponse)
def login(request: WorkerLoginRequest, db: Session = Depends(get_db)):
    worker = db.query(Worker).filter(Worker.username == request.username.strip().lower()).first()
    if not worker or not verify_password(request.password, worker.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password. Please try again."
        )

    open_jobs = (
        db.query(func.count(Complaint.id))
        .filter(
            Complaint.assigned_worker_id == worker.id,
            Complaint.status.in_(["Assigned", "Pending"])
        )
        .scalar()
    )

    token = create_access_token(data={"sub": worker.username, "worker_id": worker.id})
    worker_public = WorkerPublic(
        id=worker.id,
        name=worker.name,
        username=worker.username,
        phone=worker.phone,
        open_jobs_count=open_jobs
    )

    return WorkerTokenResponse(
        access_token=token,
        token_type="bearer",
        worker=worker_public
    )

@router.get("/me", response_model=WorkerPublic)
def get_me(current_worker: Worker = Depends(get_current_worker), db: Session = Depends(get_db)):
    open_jobs = (
        db.query(func.count(Complaint.id))
        .filter(
            Complaint.assigned_worker_id == current_worker.id,
            Complaint.status.in_(["Assigned", "Pending"])
        )
        .scalar()
    )
    return WorkerPublic(
        id=current_worker.id,
        name=current_worker.name,
        username=current_worker.username,
        phone=current_worker.phone,
        open_jobs_count=open_jobs
    )
