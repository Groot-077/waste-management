import os
import io
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, engine, SessionLocal
from app.services.worker_assignment import seed_default_workers

@pytest.fixture(scope="module")
def client():
    # Setup tables
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    seed_default_workers(db)
    db.close()
    
    with TestClient(app) as test_client:
        yield test_client

def test_health_check(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "service" in data

def test_classify_demo_mode(client):
    # Create fake image
    fake_img = io.BytesIO(b"fake image data in jpeg format")
    files = {"file": ("test.jpg", fake_img, "image/jpeg")}
    
    response = client.post("/api/classify", files=files)
    assert response.status_code == 200
    data = response.json()
    assert data["is_demo"] is True
    assert "Demo mode:" in data["demo_message"]
    assert len(data["detections"]) > 0
    categories = [d["category"] for d in data["detections"]]
    assert "Plastic Bottle" in categories

def test_complaint_lifecycle(client):
    # 1. Create a complaint
    fake_img = io.BytesIO(b"fake image data")
    form_data = {
        "citizen_name": "Test User",
        "citizen_email": "test@example.com",
        "location_text": "Park Street, Sector 4",
        "latitude": 12.92,
        "longitude": 77.61,
        "detections_json": '[{"category": "Plastic Bottle", "count": 2, "confidence": 0.9}]'
    }
    files = {"file": ("test_waste.jpg", fake_img, "image/jpeg")}

    create_resp = client.post("/api/complaints", data=form_data, files=files)
    assert create_resp.status_code == 200
    res_data = create_resp.json()
    assert res_data["success"] is True
    public_id = res_data["public_id"]
    assert public_id.startswith("WM-")
    assert res_data["assigned_worker_name"] != ""

    # 2. Track complaint
    track_resp = client.get(f"/api/complaints/{public_id}")
    assert track_resp.status_code == 200
    track_data = track_resp.json()
    assert track_data["public_id"] == public_id
    assert track_data["status"] == "Assigned"
    assert len(track_data["suggested_cleanup_methods"]) > 0

    # 3. Worker login
    login_resp = client.post("/api/auth/login", json={"username": "ravi", "password": "password123"})
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 4. View assigned jobs
    jobs_resp = client.get("/api/workers/jobs", headers=headers)
    assert jobs_resp.status_code == 200
    jobs_data = jobs_resp.json()
    assert "jobs" in jobs_data
    assert jobs_data["open_jobs_count"] >= 1

    # 5. Mark job complete with proof
    proof_img = io.BytesIO(b"cleaned proof photo")
    proof_files = {"proof_image": ("proof.jpg", proof_img, "image/jpeg")}
    complete_resp = client.patch(f"/api/workers/jobs/{public_id}/complete", files=proof_files, headers=headers)
    assert complete_resp.status_code == 200
    complete_data = complete_resp.json()
    assert complete_data["complaint"]["status"] == "Completed"
    assert complete_data["complaint"]["proof_image_url"] is not None

    # 6. Verify tracking reflects completed status
    track_resp_after = client.get(f"/api/complaints/{public_id}")
    assert track_resp_after.status_code == 200
    assert track_resp_after.json()["status"] == "Completed"
