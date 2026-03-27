"""backend/routes/recruiter.py — Recruiter enrichment with direct Supabase"""

import os, sys
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, BASE_DIR)
sys.path.insert(0, os.path.join(BASE_DIR, "src"))

from dotenv import load_dotenv
load_dotenv(os.path.join(BASE_DIR, ".env"))

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()

def _sb():
    url = os.getenv("SUPABASE_URL","")
    key = os.getenv("SUPABASE_KEY","")
    if not url or not key: return None
    from supabase import create_client
    return create_client(url, key)

def _now():
    return datetime.now().strftime("%Y-%m-%d")

class EnrichOneRequest(BaseModel):
    app_id:  int
    company: str

class UserRequest(BaseModel):
    user_id: str

@router.post("/enrich-one")
def enrich_one(req: EnrichOneRequest):
    try:
        from recruiter_finder import enrich_application
        info = enrich_application(req.company)
        sb = _sb()
        if sb:
            sb.table("applications").update({
                "recruiter_email": info.get("recruiter_email",""),
                "recruiter_name":  info.get("recruiter_name",""),
                "recruiter_title": info.get("recruiter_title",""),
                "linkedin_url":    info.get("linkedin_url",""),
                "last_updated":    _now(),
            }).eq("id", req.app_id).execute()
        return {"success": True, "found": bool(info.get("recruiter_name") or info.get("linkedin_url")), "data": info}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/enrich-missing")
def enrich_missing(req: UserRequest):
    sb = _sb()
    if not sb: raise HTTPException(status_code=500, detail="Supabase not configured")
    try:
        res  = sb.table("applications").select("*").eq("user_id", req.user_id).execute()
        apps = res.data or []
        missing = [a for a in apps if not str(a.get("linkedin_url","")).strip()
                   and not str(a.get("recruiter_email","")).strip()
                   and not str(a.get("recruiter_name","")).strip()]
        if not missing:
            return {"success": True, "message": "All apps have recruiter data", "found": 0}
        from recruiter_finder import enrich_all
        companies = list({a["company_name"] for a in missing})
        enriched  = enrich_all(companies)
        found = 0
        for app in missing:
            info = enriched.get(app["company_name"], {})
            sb.table("applications").update({
                "recruiter_email": info.get("recruiter_email",""),
                "recruiter_name":  info.get("recruiter_name",""),
                "recruiter_title": info.get("recruiter_title",""),
                "linkedin_url":    info.get("linkedin_url",""),
                "last_updated":    _now(),
            }).eq("id", app["id"]).execute()
            if info.get("recruiter_name") or info.get("linkedin_url"): found += 1
        return {"success": True, "message": f"Found recruiters for {found}/{len(companies)} companies", "found": found}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/enrich-all")
def enrich_all_apps(req: UserRequest):
    sb = _sb()
    if not sb: raise HTTPException(status_code=500, detail="Supabase not configured")
    try:
        res  = sb.table("applications").select("*").eq("user_id", req.user_id).execute()
        apps = res.data or []
        if not apps:
            return {"success": True, "message": "No applications yet", "found": 0}
        from recruiter_finder import enrich_all
        companies = list({a["company_name"] for a in apps})
        enriched  = enrich_all(companies)
        found = 0
        for app in apps:
            info = enriched.get(app["company_name"], {})
            sb.table("applications").update({
                "recruiter_email": info.get("recruiter_email",""),
                "recruiter_name":  info.get("recruiter_name",""),
                "recruiter_title": info.get("recruiter_title",""),
                "linkedin_url":    info.get("linkedin_url",""),
                "last_updated":    _now(),
            }).eq("id", app["id"]).execute()
            if info.get("recruiter_name") or info.get("linkedin_url"): found += 1
        return {"success": True, "message": f"Found recruiters for {found}/{len(companies)} companies", "found": found}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))