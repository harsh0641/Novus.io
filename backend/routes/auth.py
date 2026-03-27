"""backend/routes/auth.py — Auth endpoints"""

import os, sys, jwt
from datetime import datetime, timezone, timedelta

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, BASE_DIR)
sys.path.insert(0, os.path.join(BASE_DIR, "src"))

from dotenv import load_dotenv
load_dotenv(os.path.join(BASE_DIR, ".env"))

from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel, validator
from middleware.auth_guard import verify_token
from auth import login_user, register_user, get_user_by_id

router = APIRouter()

# ── FIX: Hardcoded Master Key to mathematically guarantee a match ─────────────
JWT_SECRET = "CareerSync_Master_Secret_Key_2026_Secure!@#"
JWT_ALGO   = "HS256"
JWT_EXPIRY = 60 * 24 * 7  # 7 days in minutes


def make_token(user: dict) -> str:
    payload = {
        "sub":   str(user["id"]),
        "email": user["email"],
        "iat":   datetime.now(timezone.utc),
        "exp":   datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRY),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


# ── Request Models ────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email:    str
    password: str

    @validator("email")
    def validate_email(cls, v):
        v = v.strip().lower()
        if len(v) > 254:
            raise ValueError("Email too long")
        if "@" not in v:
            raise ValueError("Invalid email format")
        return v

    @validator("password")
    def validate_password(cls, v):
        if len(v) < 6:
            raise ValueError("Password too short")
        if len(v) > 128:
            raise ValueError("Password too long")
        return v


class RegisterRequest(BaseModel):
    name:               str
    email:              str
    password:           str
    gmail_account:      str = ""
    gmail_app_password: str = ""

    @validator("name")
    def validate_name(cls, v):
        v = v.strip().replace("\r", "").replace("\n", "")
        if len(v) < 1:
            raise ValueError("Name is required")
        if len(v) > 100:
            raise ValueError("Name too long")
        return v

    @validator("email")
    def validate_email(cls, v):
        v = v.strip().lower()
        if len(v) > 254:
            raise ValueError("Email too long")
        if "@" not in v:
            raise ValueError("Invalid email format")
        return v

    @validator("password")
    def validate_password(cls, v):
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        if len(v) > 128:
            raise ValueError("Password too long")
        return v


class UpdateGmailRequest(BaseModel):
    user_id:            str
    gmail_account:      str
    gmail_app_password: str

    @validator("user_id")
    def validate_user_id(cls, v):
        v = v.strip()
        if not v:
            raise ValueError("user_id is required")
        return v

    @validator("gmail_account")
    def validate_gmail(cls, v):
        v = v.strip().lower()
        if "@" not in v:
            raise ValueError("Invalid Gmail address")
        if len(v) > 254:
            raise ValueError("Email too long")
        return v

    @validator("gmail_app_password")
    def validate_app_password(cls, v):
        v = v.strip()
        if len(v) < 8:
            raise ValueError("App password too short")
        if len(v) > 64:
            raise ValueError("App password too long")
        return v


class UpdateProfileRequest(BaseModel):
    user_id: str
    name:    str

    @validator("user_id")
    def validate_user_id(cls, v):
        v = v.strip()
        if not v:
            raise ValueError("user_id is required")
        return v

    @validator("name")
    def validate_name(cls, v):
        v = v.strip().replace("\r", "").replace("\n", "")
        if not v:
            raise ValueError("Name is required")
        if len(v) > 100:
            raise ValueError("Name too long")
        return v


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/login")
def login(req: LoginRequest):
    user = login_user(req.email, req.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = make_token(user)
    return {"success": True, "user": user, "token": token}


@router.post("/register")
def register(req: RegisterRequest):
    ok, msg = register_user(
        name=req.name, email=req.email, password=req.password,
        gmail_account=req.gmail_account,
        gmail_app_password=req.gmail_app_password,
    )
    if not ok:
        raise HTTPException(status_code=400, detail=msg)
    user = login_user(req.email, req.password)
    if not user:
        raise HTTPException(status_code=500, detail="Login after register failed")
    token = make_token(user)
    return {"success": True, "user": user, "token": token}


@router.get("/user/{user_id}")
def get_user(user_id: str, token: dict = Depends(verify_token)):
    if token.get("sub") != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    user = get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"success": True, "user": user}


@router.put("/update-gmail")
def update_gmail(
    req: UpdateGmailRequest,
    request: Request,
    token: dict = Depends(verify_token)
):
    if token.get("sub") != req.user_id:
        raise HTTPException(status_code=403, detail="Cannot update another user's credentials")

    url = os.getenv("SUPABASE_URL", "")
    key = os.getenv("SUPABASE_KEY", "")
    if not url or not key:
        raise HTTPException(status_code=500, detail="Supabase not configured")

    from supabase import create_client
    sb = create_client(url, key)

    try:
        sb.table("users").update({
            "gmail_account":      req.gmail_account,
            "gmail_app_password": req.gmail_app_password,
        }).eq("id", req.user_id).execute()

        res = sb.table("users") \
                .select("id,name,email,gmail_account,created_at") \
                .eq("id", req.user_id).single().execute()
        return {"success": True, "message": "Gmail credentials saved!", "user": res.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save: {str(e)}")


@router.put("/update-profile")
def update_profile(
    req: UpdateProfileRequest,
    token: dict = Depends(verify_token)
):
    if token.get("sub") != req.user_id:
        raise HTTPException(status_code=403, detail="Cannot update another user's profile")

    url = os.getenv("SUPABASE_URL", "")
    key = os.getenv("SUPABASE_KEY", "")
    if not url or not key:
        raise HTTPException(status_code=500, detail="Supabase not configured")

    from supabase import create_client
    sb = create_client(url, key)

    try:
        sb.table("users").update({"name": req.name}).eq("id", req.user_id).execute()
        res = sb.table("users") \
                .select("id,name,email,gmail_account,created_at") \
                .eq("id", req.user_id).single().execute()
        return {"success": True, "message": "Profile updated!", "user": res.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))