import httpx
from pathlib import Path

key = "ul_1ee11d93eb10641793e5b225123c7e97da1733fb"
url = "https://predict-6addb30660ff18ac6953805d-dproatj77a-el.a.run.app/predict"

headers = {
    "Authorization": f"Bearer {key}",
}

sample_img = Path("uploads/sample_waste_dump.jpg")
if sample_img.exists():
    with open(sample_img, "rb") as f:
        img_bytes = f.read()

    files = {"file": ("test.jpg", img_bytes, "image/jpeg")}
    try:
        r = httpx.post(url, headers=headers, files=files, timeout=25)
        print(f"Status: {r.status_code}")
        print("Response:", r.json())
    except Exception as e:
        print(f"Error calling {url}: {e}")
else:
    print(f"Sample image {sample_img} not found.")



