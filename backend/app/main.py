import os
from datetime import datetime, timezone
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.config import settings
from app.database import engine, Base, SessionLocal
from app.models import Worker, Complaint, WasteDetection
from app.services.worker_assignment import seed_default_workers
from app.routes import classify, complaints, workers, auth

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create DB tables
    Base.metadata.create_all(bind=engine)
    
    # Seed workers and reference demo complaint
    db = SessionLocal()
    try:
        seed_default_workers(db)
        
        # Check if reference complaint WM-84476 exists
        existing_ref = db.query(Complaint).filter(Complaint.public_id == "WM-84476").first()
        if not existing_ref:
            ravi = db.query(Worker).filter(Worker.username == "ravi").first()
            ref_complaint = Complaint(
                public_id="WM-84476",
                citizen_name="Priya Nair",
                citizen_email="priya@example.com",
                location_text="12 MG Road, near the bus stop",
                latitude=12.9716,
                longitude=77.5946,
                original_image_url="/uploads/sample_waste_dump.jpg",
                status="Assigned",
                assigned_worker_id=ravi.id if ravi else None,
                created_at=datetime(2026, 10, 25, 14, 4, 23),
                assigned_at=datetime(2026, 10, 25, 14, 4, 23)
            )
            db.add(ref_complaint)
            db.commit()
            db.refresh(ref_complaint)

            detections_data = [
                {"category": "Plastic Bottle", "count": 4, "confidence": 0.94},
                {"category": "Cardboard", "count": 2, "confidence": 0.88},
                {"category": "Organic Waste", "count": 1, "confidence": 0.72},
            ]
            for d in detections_data:
                det = WasteDetection(
                    complaint_id=ref_complaint.id,
                    category=d["category"],
                    count=d["count"],
                    confidence=d["confidence"]
                )
                db.add(det)
            db.commit()
    finally:
        db.close()
    yield

app = FastAPI(
    title=settings.APP_NAME,
    description="Smart Waste Management with AI-based Waste Classification and Worker Assignment API",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount uploads static files
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Include API Routers
app.include_router(classify.router)
app.include_router(complaints.router)
app.include_router(workers.router)
app.include_router(auth.router)

from app.services.classifier import resolve_model_path

@app.get("/api/health")
def health_check():
    local_model = resolve_model_path(settings.YOLO_MODEL_PATH)
    remote_api = bool(settings.YOLO_API_KEY.strip() and settings.YOLO_API_URL.strip())
    
    mode = "local" if local_model else ("api" if remote_api else "demo")
    
    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "yolo_configured": bool(local_model or remote_api),
        "model_mode": mode,
        "local_model_path": local_model if local_model else None,
        "time": datetime.now(timezone.utc).isoformat()
    }
