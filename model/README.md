# YOLO26 AI Waste Classification Integration Guide

This application is designed to connect to your custom **YOLO26** waste classification and object detection API, while offering a realistic Demo Mode fallback when credentials are not yet configured.

---

## 1. Connecting Your YOLO26 API Key & Endpoint

As requested, **no hardcoded API keys or external model URLs have been added on your behalf**. You have complete control to supply your own credentials.

### Step 1: Open `.env`
Navigate to `backend/.env` (or copy from `backend/.env.example`).

### Step 2: Set Your Custom YOLO26 API URL and Key
Fill in the two environment variables:

```env
# Your YOLO26 Inference Endpoint
YOLO_API_URL="https://your-yolo26-endpoint.com/predict"

# Your YOLO26 API Key
YOLO_API_KEY="your_actual_yolo26_api_key_here"
```

### Step 3: Restart Backend
Restart the FastAPI server:
```powershell
python -m uvicorn app.main:app --reload --port 8000
```

Once configured:
- `/api/health` will return `"yolo_configured": true`.
- The Report Waste upload endpoint `/api/classify` will send uploaded images directly to your YOLO26 endpoint, returning real-time detections, counts, and confidence scores.

---

## 2. API Contract Expected by the Backend

The backend forwards the image as `multipart/form-data`:
- Header: `Authorization: Bearer <YOLO_API_KEY>` and `x-api-key: <YOLO_API_KEY>`
- Form field: `file` / `image` with the uploaded image bytes.

The backend automatically parses standard YOLO response formats:
```json
{
  "predictions": [
    { "class": "plastic bottle", "confidence": 0.94 },
    { "class": "plastic bottle", "confidence": 0.91 },
    { "class": "cardboard", "confidence": 0.88 },
    { "class": "organic waste", "confidence": 0.72 }
  ]
}
```
Or flat list formats:
```json
[
  { "label": "Plastic Bottle", "score": 0.95 },
  { "label": "Cardboard", "score": 0.89 }
]
```
The backend automatically aggregates multiple items of the same category, computing item count `×N` and average confidence percentage for the UI progress bars.

---

## 3. Demo Mode (When API Key is Blank)

When `YOLO_API_KEY` or `YOLO_API_URL` are left blank:
- The system operates in **Demo Mode**.
- In the Report page, a prominent orange note appears:
  `Demo mode: sample detections shown because no YOLO API key is configured on the server.`
- The reference screenshot categories are displayed:
  - **Plastic Bottle**: ×4 (94% confidence)
  - **Cardboard**: ×2 (88% confidence)
  - **Organic Waste**: ×1 (72% confidence)

---

## 4. Optional: Offline Local Weights (.pt) Fallback

If you have a local Ultralytics YOLO PyTorch file (e.g. `best.pt`):
1. Place `best.pt` in this folder: `model/best.pt`.
2. In `backend/.env`, set:
   ```env
   YOLO_MODEL_PATH="model/best.pt"
   ```
3. The installed `ultralytics` package will automatically load and run the model on CPU or CUDA.
