from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import datetime
import pytesseract
from PIL import Image
import io
import re
from typing import List, Optional

app = FastAPI()

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATABASE_URL = "sqlite:///./weight.db"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class WeightEntry(Base):
    __tablename__ = "weights"
    id = Column(Integer, primary_key=True, index=True)
    weight = Column(Float)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    method = Column(String)  # 'manual' or 'ocr'

Base.metadata.create_all(bind=engine)

@app.post("/weight")
async def add_weight(weight: Optional[float] = Form(None), image: Optional[UploadFile] = File(None)):
    if not weight and not image:
        raise HTTPException(status_code=400, detail="Either weight or image must be provided")
    
    method = 'manual'
    if image:
        image_data = await image.read()
        img = Image.open(io.BytesIO(image_data))
        text = pytesseract.image_to_string(img)
        # Simple regex to find a number, assuming weight is in kg or lbs
        match = re.search(r'(\d+\.?\d*)', text)
        if match:
            weight = float(match.group(1))
            method = 'ocr'
        else:
            raise HTTPException(status_code=400, detail="Could not extract weight from image")
    
    db = SessionLocal()
    entry = WeightEntry(weight=weight, method=method)
    db.add(entry)
    db.commit()
    db.refresh(entry)
    db.close()
    return {"id": entry.id, "weight": entry.weight, "timestamp": entry.timestamp.isoformat(), "method": method}

@app.get("/weights")
def get_weights(start: Optional[str] = None, end: Optional[str] = None) -> List[dict]:
    db = SessionLocal()
    query = db.query(WeightEntry).order_by(WeightEntry.timestamp)
    if start:
        start_dt = datetime.datetime.fromisoformat(start.replace('Z', '+00:00'))
        query = query.filter(WeightEntry.timestamp >= start_dt)
    if end:
        end_dt = datetime.datetime.fromisoformat(end.replace('Z', '+00:00'))
        query = query.filter(WeightEntry.timestamp <= end_dt)
    entries = query.all()
    db.close()
    return [{"id": e.id, "weight": e.weight, "timestamp": e.timestamp.isoformat(), "method": e.method} for e in entries]

@app.delete("/weight/{entry_id}")
def delete_weight(entry_id: int):
    db = SessionLocal()
    entry = db.query(WeightEntry).filter(WeightEntry.id == entry_id).first()
    if not entry:
        db.close()
        raise HTTPException(status_code=404, detail="Weight entry not found")
    db.delete(entry)
    db.commit()
    db.close()
    return {"id": entry_id, "message": "Weight entry deleted successfully"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)