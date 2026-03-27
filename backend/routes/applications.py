"""
backend/routes/applications.py
Direct Supabase calls with explicit user_id — bypasses database.py session state
"""

import os, sys, traceback
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, BASE_DIR)
sys.path.insert(0, os.path.join(BASE_DIR, "src"))

from dotenv import load_dotenv
load_dotenv(os.path.join(BASE_DIR, ".env"))

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import datetime

# ── MOVED IMPORT TO TOP: Fails instantly if package is missing ────────────────
try:
    from supabase import create_client
except ImportError:
    print("🛑 CRITICAL: 'supabase' package is missing. Run: pip install supabase")

router = APIRouter()

def _sb():
    url = os.getenv("SUPABASE_URL", "")
    key = os.getenv("SUPABASE_KEY", "")
    if not url or not key: 
        print("🛑 CRITICAL: SUPABASE_URL or SUPABASE_KEY is missing from environment.")
        return None
    return create_client(url, key)

def _now():
    return datetime.now().strftime("%Y-%m-%d")

class AddApplicationRequest(BaseModel):
    user_id:   str
    company:   str
    position:  str
    date:      str
    subject:   str = "Manually added"
    rec_email: str = ""
    rec_name:  str = ""
    rec_title: str = ""
    linkedin:  str = ""

class UpdateStageRequest(BaseModel):
    app_id: int
    stage:  str

class UpdateRecruiterRequest(BaseModel):
    app_id:   int
    email:    str = ""
    name:     str = ""
    title:    str = ""
    linkedin: str = ""

class GetRequest(BaseModel):
    user_id: str

@router.post("/list")
def get_applications(req: GetRequest):
    """Get all applications for a user."""
    sb = _sb()
    if not sb:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    try:
        res = sb.table("applications")\
                .select("*")\
                .eq("user_id", req.user_id)\
                .order("applied_date", desc=True)\
                .execute()
        return {"success": True, "data": res.data or [], "total": len(res.data or [])}
    except Exception as e:
        print("🔥 DATABASE CRASH IN /list:")
        traceback.print_exc()  # This prints the EXACT line and error to the terminal
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/add")
def add_application(req: AddApplicationRequest):
    sb = _sb()
    if not sb:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    try:
        sb.table("applications").upsert({
            "user_id":         req.user_id,
            "company_name":    req.company,
            "position":        req.position,
            "applied_date":    req.date,
            "last_updated":    _now(),
            "email_subject":   req.subject,
            "recruiter_email": req.rec_email,
            "recruiter_name":  req.rec_name,
            "recruiter_title": req.rec_title,
            "linkedin_url":    req.linkedin,
            "stage":           "Applied",
        }, on_conflict="user_id,company_name,position").execute()
        return {"success": True, "message": f"Added {req.position} at {req.company}"}
    except Exception as e:
        print("🔥 DATABASE CRASH IN /add:")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/stage")
def update_stage(req: UpdateStageRequest):
    sb = _sb()
    if not sb:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    try:
        sb.table("applications").update({
            "stage": req.stage, "last_updated": _now()
        }).eq("id", req.app_id).execute()
        return {"success": True, "message": f"Stage updated to {req.stage}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/recruiter")
def update_recruiter(req: UpdateRecruiterRequest):
    sb = _sb()
    if not sb:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    try:
        sb.table("applications").update({
            "recruiter_email": req.email,
            "recruiter_name":  req.name,
            "recruiter_title": req.title,
            "linkedin_url":    req.linkedin,
            "last_updated":    _now(),
        }).eq("id", req.app_id).execute()
        return {"success": True, "message": "Recruiter info updated"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{app_id}")
def delete_app(app_id: int):
    sb = _sb()
    if not sb:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    try:
        sb.table("applications").delete().eq("id", app_id).execute()
        return {"success": True, "message": "Deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))