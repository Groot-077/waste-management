from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime

class WasteDetectionSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    category: str
    count: int = 1
    confidence: float = 0.90

class ClassifyResponse(BaseModel):
    is_demo: bool
    demo_message: Optional[str] = None
    detections: List[WasteDetectionSchema]
    temp_image_url: Optional[str] = None

class WorkerPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    username: str
    phone: Optional[str] = None
    open_jobs_count: int = 0

class ComplaintResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    public_id: str
    citizen_name: str
    citizen_email: str
    location_text: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    original_image_url: str
    proof_image_url: Optional[str] = None
    status: str  # 'Pending', 'Assigned', 'Completed'
    assigned_worker: Optional[WorkerPublic] = None
    detections: List[WasteDetectionSchema] = []
    suggested_cleanup_methods: List[str] = []
    created_at: datetime
    assigned_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

class ComplaintAssignRequest(BaseModel):
    worker_id: int

class ComplaintCreateFormResponse(BaseModel):
    success: bool
    public_id: str
    assigned_worker_name: str
    status: str
    message: str

class WorkerLoginRequest(BaseModel):
    username: str
    password: str

class WorkerRegisterRequest(BaseModel):
    name: str
    username: str
    password: str
    phone: Optional[str] = None

class WorkerTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    worker: WorkerPublic
