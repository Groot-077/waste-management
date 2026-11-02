import os
import uuid
from fastapi import APIRouter, UploadFile, File, HTTPException
from app.config import settings
from app.services.classifier import classify_waste_image
from app.schemas import ClassifyResponse, WasteDetectionSchema

router = APIRouter(prefix="/api", tags=["classify"])

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
MAX_FILE_SIZE = 15 * 1024 * 1024  # 15 MB

@router.post("/classify", response_model=ClassifyResponse)
async def classify_image(file: UploadFile = File(...)):
    if not file:
        raise HTTPException(status_code=400, detail="No image file provided.")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '{ext}'. Allowed: JPG, JPEG, PNG, WEBP."
        )

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File size exceeds maximum 15MB limit.")

    # Save to uploads so the frontend can preview it immediately
    filename = f"preview_{uuid.uuid4().hex[:10]}{ext}"
    filepath = os.path.join(settings.UPLOAD_DIR, filename)
    with open(filepath, "wb") as f:
        f.write(content)

    temp_image_url = f"/uploads/{filename}"

    is_demo, demo_msg, raw_detections = await classify_waste_image(content, file.filename)

    detections = [
        WasteDetectionSchema(
            category=d["category"],
            count=d.get("count", 1),
            confidence=d.get("confidence", 0.90)
        )
        for d in raw_detections
    ]

    return ClassifyResponse(
        is_demo=is_demo,
        demo_message=demo_msg,
        detections=detections,
        temp_image_url=temp_image_url
    )
