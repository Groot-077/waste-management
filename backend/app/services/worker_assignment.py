import random
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models import Worker, Complaint
from app.services.auth import hash_password

DEFAULT_WORKERS = [
    {
        "name": "Ravi Kumar",
        "username": "ravi",
        "password": "password123",
        "phone": "+91 98765 43210"
    },
    {
        "name": "Priya Sharma",
        "username": "priya",
        "password": "password123",
        "phone": "+91 98765 43211"
    },
    {
        "name": "Amit Patel",
        "username": "amit",
        "password": "password123",
        "phone": "+91 98765 43212"
    }
]

def seed_default_workers(db: Session):
    """Seed default workers if table is empty."""
    count = db.query(Worker).count()
    if count == 0:
        for w_data in DEFAULT_WORKERS:
            worker = Worker(
                name=w_data["name"],
                username=w_data["username"],
                password_hash=hash_password(w_data["password"]),
                phone=w_data["phone"],
                is_available=True
            )
            db.add(worker)
        db.commit()

def assign_worker_for_complaint(db: Session) -> Optional[Worker]:
    """
    Select an available worker using least-busy assignment strategy.
    Prioritizes workers with fewer assigned/in-progress jobs.
    """
    available_workers = db.query(Worker).filter(Worker.is_available == True).all()
    if not available_workers:
        return None

    # Calculate active jobs count for each worker
    worker_loads = []
    for worker in available_workers:
        active_jobs = (
            db.query(func.count(Complaint.id))
            .filter(
                Complaint.assigned_worker_id == worker.id,
                Complaint.status.in_(["Assigned", "Pending"])
            )
            .scalar()
        )
        worker_loads.append((active_jobs, worker))

    # Sort by fewest active jobs first; if tied, prioritize newly registered workers (higher worker ID first)
    worker_loads.sort(key=lambda x: (x[0], -x[1].id))
    return worker_loads[0][1]
