from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import sessionmaker, relationship, declarative_base
from jose import JWTError, jwt
from pydantic import BaseModel, EmailStr
from dotenv import load_dotenv
import datetime
import pytesseract
from PIL import Image
import io
import re
import os
import uuid
import resend
from typing import List, Optional

# Load environment variables from .env file
load_dotenv()

app = FastAPI()

# Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 7
MAGIC_LINK_EXPIRE_MINUTES = 15
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
FROM_EMAIL = os.getenv("FROM_EMAIL", "onboarding@resend.dev")  # Use your verified domain in production

# Resend API key
resend.api_key = os.getenv("RESEND_API_KEY", "")

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./weight.db")
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Security
security = HTTPBearer()


# ==================== MODELS ====================

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    weights = relationship("WeightEntry", back_populates="user")
    magic_tokens = relationship("MagicLinkToken", back_populates="user")


class MagicLinkToken(Base):
    __tablename__ = "magic_link_tokens"
    id = Column(Integer, primary_key=True, index=True)
    token = Column(String, unique=True, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    used = Column(Boolean, default=False)
    
    user = relationship("User", back_populates="magic_tokens")


class WeightEntry(Base):
    __tablename__ = "weights"
    id = Column(Integer, primary_key=True, index=True)
    weight = Column(Float)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    method = Column(String)  # 'manual' or 'ocr'
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    user = relationship("User", back_populates="weights")


# Create tables if they don't exist
Base.metadata.create_all(bind=engine)


# ==================== PYDANTIC SCHEMAS ====================

class MagicLinkRequest(BaseModel):
    email: EmailStr


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


class UserResponse(BaseModel):
    id: int
    email: str
    created_at: str


# ==================== AUTH HELPERS ====================

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_access_token(user_id: int, email: str) -> str:
    expire = datetime.datetime.utcnow() + datetime.timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    to_encode = {
        "sub": str(user_id),
        "email": email,
        "exp": expire
    }
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        email = payload.get("email")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return {"user_id": int(user_id), "email": email}
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


def get_current_user(token_data: dict = Depends(verify_token), db=Depends(get_db)) -> User:
    user = db.query(User).filter(User.id == token_data["user_id"]).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def send_magic_link_email(email: str, token: str):
    magic_link = f"{FRONTEND_URL}/auth/verify?token={token}"
    
    # If no API key, just print to console (for development)
    if not resend.api_key:
        print(f"\n{'='*50}")
        print(f"MAGIC LINK FOR {email}:")
        print(f"{magic_link}")
        print(f"{'='*50}\n")
        return
    
    resend.Emails.send({
        "from": FROM_EMAIL,
        "to": email,
        "subject": "Your Magic Link to Weight Tracker",
        "html": f"""
        <h2>Welcome to Weight Tracker!</h2>
        <p>Click the link below to sign in:</p>
        <p><a href="{magic_link}" style="display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px;">Sign In</a></p>
        <p>Or copy this link: {magic_link}</p>
        <p>This link expires in {MAGIC_LINK_EXPIRE_MINUTES} minutes.</p>
        <p>If you didn't request this, you can safely ignore this email.</p>
        """
    })


# ==================== AUTH ENDPOINTS ====================

@app.post("/auth/request-magic-link")
def request_magic_link(request: MagicLinkRequest, db=Depends(get_db)):
    email = request.email.lower().strip()
    
    # Find or create user
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(email=email)
        db.add(user)
        db.commit()
        db.refresh(user)
    
    # Create magic link token
    token = str(uuid.uuid4())
    expires_at = datetime.datetime.utcnow() + datetime.timedelta(minutes=MAGIC_LINK_EXPIRE_MINUTES)
    
    magic_token = MagicLinkToken(
        token=token,
        user_id=user.id,
        expires_at=expires_at
    )
    db.add(magic_token)
    db.commit()
    
    # Send email
    send_magic_link_email(email, token)
    
    return {"message": "Magic link sent! Check your email."}


@app.get("/auth/verify")
def verify_magic_link(token: str, db=Depends(get_db)):
    # Find token
    magic_token = db.query(MagicLinkToken).filter(
        MagicLinkToken.token == token,
        MagicLinkToken.used == False
    ).first()
    
    if not magic_token:
        raise HTTPException(status_code=400, detail="Invalid or already used token")
    
    # Check expiration
    if magic_token.expires_at < datetime.datetime.utcnow():
        raise HTTPException(status_code=400, detail="Token has expired")
    
    # Mark as used
    magic_token.used = True
    db.commit()
    
    # Get user
    user = magic_token.user
    
    # Create JWT
    access_token = create_access_token(user.id, user.email)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "created_at": user.created_at.isoformat()
        }
    }


@app.get("/auth/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "created_at": current_user.created_at.isoformat()
    }


# ==================== WEIGHT ENDPOINTS (Protected) ====================

@app.post("/weight")
async def add_weight(
    weight: Optional[float] = Form(None),
    image: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user),
    db=Depends(get_db)
):
    if not weight and not image:
        raise HTTPException(status_code=400, detail="Either weight or image must be provided")
    
    method = 'manual'
    if image:
        image_data = await image.read()
        img = Image.open(io.BytesIO(image_data))
        text = pytesseract.image_to_string(img)
        match = re.search(r'(\d+\.?\d*)', text)
        if match:
            weight = float(match.group(1))
            method = 'ocr'
        else:
            raise HTTPException(status_code=400, detail="Could not extract weight from image")
    
    entry = WeightEntry(weight=weight, method=method, user_id=current_user.id)
    db.add(entry)
    db.commit()
    db.refresh(entry)
    
    return {"id": entry.id, "weight": entry.weight, "timestamp": entry.timestamp.isoformat(), "method": method}


@app.get("/weights")
def get_weights(
    start: Optional[str] = None,
    end: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db)
) -> List[dict]:
    query = db.query(WeightEntry).filter(
        WeightEntry.user_id == current_user.id
    ).order_by(WeightEntry.timestamp)
    
    if start:
        start_dt = datetime.datetime.fromisoformat(start.replace('Z', '+00:00'))
        query = query.filter(WeightEntry.timestamp >= start_dt)
    if end:
        end_dt = datetime.datetime.fromisoformat(end.replace('Z', '+00:00'))
        query = query.filter(WeightEntry.timestamp <= end_dt)
    
    entries = query.all()
    return [{"id": e.id, "weight": e.weight, "timestamp": e.timestamp.isoformat(), "method": e.method} for e in entries]


@app.delete("/weight/{entry_id}")
def delete_weight(
    entry_id: int,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db)
):
    entry = db.query(WeightEntry).filter(
        WeightEntry.id == entry_id,
        WeightEntry.user_id == current_user.id
    ).first()
    
    if not entry:
        raise HTTPException(status_code=404, detail="Weight entry not found")
    
    db.delete(entry)
    db.commit()
    return {"id": entry_id, "message": "Weight entry deleted successfully"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)