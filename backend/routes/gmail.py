"""
backend/routes/gmail.py
- Clears ALL existing applications for user before sync
- Strict pre-filtering before AI to block government/spam emails
- Uses exact same ai_service + email_service + recruiter_finder from src/
"""

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

class SyncRequest(BaseModel):
    user_id: str

def _sb():
    url = os.getenv("SUPABASE_URL", "")
    key = os.getenv("SUPABASE_KEY", "")
    if not url or not key: return None
    from supabase import create_client
    return create_client(url, key)

def _now():
    return datetime.now().strftime("%Y-%m-%d")

# ── Strict pre-filter — blocks non-job emails before AI ──────────────────────
SKIP_SENDERS = [
    "ircc", "canada.ca", "uscis.gov", "irs.gov", "gov.bc", "ontario.ca",
    "jobs-noreply@linkedin", "noreply@linkedin", "alerts@linkedin",
    "jobalerts@indeed", "noreply@glassdoor", "ziprecruiter",
    "newsletter", "promotions@", "marketing@", "unsubscribe",
]

SKIP_SUBJECTS = [
    "new jobs for you", "jobs matching", "job alert", "jobs you might like",
    "your profile was viewed", "new connection", "people are looking",
    "express entry", "immigration", "permanent residence", "work permit",
    "password reset", "verify your email", "security alert", "invoice",
    "receipt", "order confirmation", "subscription", "billing",
]

def _should_skip(email: dict) -> bool:
    sender  = email.get("sender",  "").lower()
    subject = email.get("subject", "").lower()
    if any(s in sender  for s in SKIP_SENDERS):  return True
    if any(s in subject for s in SKIP_SUBJECTS): return True
    return False

def _upsert(sb, user_id, company_name, position, applied_date,
            email_subject, rec_email="", rec_name="", rec_title="", linkedin=""):
    try:
        sb.table("applications").upsert({
            "user_id":         user_id,
            "company_name":    company_name,
            "position":        position,
            "applied_date":    applied_date,
            "last_updated":    _now(),
            "email_subject":   email_subject or "",
            "recruiter_email": rec_email  or "",
            "recruiter_name":  rec_name   or "",
            "recruiter_title": rec_title  or "",
            "linkedin_url":    linkedin   or "",
            "stage":           "Applied",
        }, on_conflict="user_id,company_name,position").execute()
        return True
    except Exception as e:
        print(f"[gmail] upsert error: {e}")
        return False

@router.post("/sync")
def sync_gmail(req: SyncRequest):
    sb = _sb()
    if not sb:
        raise HTTPException(status_code=500, detail="Supabase not configured")

    # Step 1 — get user credentials
    try:
        res  = sb.table("users").select("*").eq("id", req.user_id).single().execute()
        user = res.data
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"User not found: {e}")

    gmail_account  = (user.get("gmail_account")      or "").strip()
    gmail_password = (user.get("gmail_app_password") or "").strip()

    print(f"[gmail] account={gmail_account}")

    if not gmail_account or not gmail_password:
        raise HTTPException(
            status_code=400,
            detail="Gmail not configured. Add Gmail credentials in Settings."
        )

    # Step 2 — inject credentials + patch module globals
    os.environ["EMAIL_ACCOUNT"]      = gmail_account
    os.environ["EMAIL_APP_PASSWORD"] = gmail_password

    import email_service
    email_service.EMAIL_ACCOUNT      = gmail_account
    email_service.EMAIL_APP_PASSWORD = gmail_password
    
    # ── FIX: Increased from 20 to 250 so it scans the last 60 days of emails!
    email_service.MAX_EMAILS         = 250 

    # Step 3 — clear ALL existing applications for this user
    print(f"[gmail] clearing existing applications for user {req.user_id}")
    try:
        sb.table("applications").delete().eq("user_id", req.user_id).execute()
        print(f"[gmail] ✅ cleared existing data")
    except Exception as e:
        print(f"[gmail] warning: could not clear data: {e}")

    # Step 4 — fetch emails from Gmail
    try:
        emails = email_service.fetch_application_emails()
        print(f"[gmail] fetched {len(emails)} candidate emails")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gmail fetch failed: {str(e)}")

    if not emails:
        return {"success": True, "message": "No new job application emails found", "saved": 0}

    # Step 5 — strict pre-filter before AI
    filtered_emails = [e for e in emails if not _should_skip(e)]
    skipped = len(emails) - len(filtered_emails)
    print(f"[gmail] pre-filter: {skipped} skipped, {len(filtered_emails)} passed to AI")

    if not filtered_emails:
        return {"success": True, "message": "No relevant emails found after filtering", "saved": 0}

    # Step 6 — AI classify
    try:
        import ai_service
        parsed = ai_service.parse_emails_concurrent(filtered_emails, max_workers=5)
        print(f"[gmail] AI found {len(parsed)} real applications")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI parsing failed: {str(e)}")

    if not parsed:
        return {
            "success": True,
            "message": f"Checked {len(filtered_emails)} emails — no job applications detected",
            "saved":   0,
        }

    # Step 7 — enrich recruiters
    enriched = {}
    try:
        from recruiter_finder import enrich_all
        companies = list({p["company_name"] for p in parsed})
        enriched  = enrich_all(companies)
        print(f"[gmail] enriched {len(enriched)} companies")
    except Exception as e:
        print(f"[gmail] enrichment warning: {e}")

    # Step 8 — save fresh results to Supabase
    saved = 0
    for app in parsed:
        info = enriched.get(app["company_name"], {})
        ok   = _upsert(
            sb, req.user_id,
            app["company_name"], app["job_title"],
            app["date"],         app["subject"],
            info.get("recruiter_email", ""),
            info.get("recruiter_name",  ""),
            info.get("recruiter_title", ""),
            info.get("linkedin_url",    ""),
        )
        if ok:
            saved += 1
            print(f"[gmail] ✅ {app['company_name']} — {app['job_title']}")

    return {
        "success":      True,
        "message":      f"✅ Sync complete! {saved} applications saved.",
        "emails_found": len(emails),
        "apps_found":   len(parsed),
        "saved":        saved,
    }

@router.get("/status/{user_id}")
def gmail_status(user_id: str):
    sb = _sb()
    if not sb:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    try:
        res  = sb.table("users").select("gmail_account,gmail_app_password")\
                 .eq("id", user_id).single().execute()
        user = res.data
        account    = (user.get("gmail_account") or "").strip()
        configured = bool(account and (user.get("gmail_app_password") or "").strip())
        return {"configured": configured, "account": account or None}
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))