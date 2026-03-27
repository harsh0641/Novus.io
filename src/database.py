"""
src/database.py — CareerSync Database via Supabase
====================================================
Replaces SQLite with Supabase so data persists on Streamlit Cloud.
Each user's applications are isolated by user_id.

Supabase SQL to run once:

    CREATE TABLE IF NOT EXISTS applications (
        id              BIGSERIAL PRIMARY KEY,
        user_id         UUID NOT NULL,
        company_name    TEXT NOT NULL,
        position        TEXT NOT NULL,
        stage           TEXT DEFAULT 'Applied',
        applied_date    TEXT,
        last_updated    TEXT,
        email_subject   TEXT DEFAULT '',
        recruiter_email TEXT DEFAULT '',
        recruiter_name  TEXT DEFAULT '',
        recruiter_title TEXT DEFAULT '',
        linkedin_url    TEXT DEFAULT '',
        salary_range    TEXT DEFAULT '',
        interview_date  TEXT DEFAULT '',
        interview_type  TEXT DEFAULT '',
        location        TEXT DEFAULT 'United States',
        notes           TEXT DEFAULT '',
        UNIQUE(user_id, company_name, position)
    );
"""

import os
from datetime import datetime


def _get(key, default=""):
    try:
        import streamlit as st
        val = st.secrets.get(key, "")
        if val:
            return val
    except Exception:
        pass
    return os.getenv(key, default)


def _sb():
    url = _get("SUPABASE_URL")
    key = _get("SUPABASE_KEY")
    if not url or not key:
        return None
    try:
        from supabase import create_client
        return create_client(url, key)
    except Exception:
        return None


def _user_id():
    """Get current logged-in user's ID from session state."""
    try:
        import streamlit as st
        user = st.session_state.get("user", {})
        return user.get("id", "") if user else ""
    except Exception:
        return ""


def _now():
    return datetime.now().strftime("%Y-%m-%d")


# ── No-op for compatibility (SQLite had init_db) ──────────────────────────────
def init_db():
    pass


# ══════════════════════════════════════════════════════════════════════════════
# READ
# ══════════════════════════════════════════════════════════════════════════════

def get_all_applications() -> list[dict]:
    sb = _sb()
    uid = _user_id()
    if not sb or not uid:
        return []
    try:
        res = sb.table("applications")\
                .select("*")\
                .eq("user_id", uid)\
                .order("applied_date", desc=True)\
                .execute()
        return res.data or []
    except Exception as e:
        print(f"[database] get_all_applications error: {e}")
        return []


# ══════════════════════════════════════════════════════════════════════════════
# WRITE
# ══════════════════════════════════════════════════════════════════════════════

def upsert_application(company_name, position, applied_date, email_subject,
                       recruiter_email="", recruiter_name="", recruiter_title="",
                       linkedin_url="", salary_range="", interview_date="",
                       interview_type="", location="United States"):
    sb  = _sb()
    uid = _user_id()
    if not sb or not uid:
        print("[database] upsert_application: Supabase not ready or no user")
        return

    try:
        sb.table("applications").upsert({
            "user_id":        uid,
            "company_name":   company_name,
            "position":       position,
            "applied_date":   applied_date,
            "last_updated":   _now(),
            "email_subject":  email_subject or "",
            "recruiter_email": recruiter_email or "",
            "recruiter_name":  recruiter_name  or "",
            "recruiter_title": recruiter_title or "",
            "linkedin_url":    linkedin_url    or "",
            "salary_range":    salary_range    or "",
            "interview_date":  interview_date  or "",
            "interview_type":  interview_type  or "",
            "location":        location        or "United States",
            "stage":           "Applied",
        }, on_conflict="user_id,company_name,position").execute()
    except Exception as e:
        print(f"[database] upsert_application error: {e}")


def update_recruiter_info(app_id, recruiter_email, recruiter_name,
                          recruiter_title, linkedin_url):
    sb = _sb()
    if not sb:
        return
    try:
        sb.table("applications").update({
            "recruiter_email": recruiter_email or "",
            "recruiter_name":  recruiter_name  or "",
            "recruiter_title": recruiter_title or "",
            "linkedin_url":    linkedin_url    or "",
            "last_updated":    _now(),
        }).eq("id", app_id).execute()
    except Exception as e:
        print(f"[database] update_recruiter_info error: {e}")


def update_stage(app_id, new_stage):
    sb = _sb()
    if not sb:
        return
    try:
        sb.table("applications").update({
            "stage":        new_stage,
            "last_updated": _now(),
        }).eq("id", app_id).execute()
    except Exception as e:
        print(f"[database] update_stage error: {e}")


def update_application_details(app_id, salary_range, interview_date,
                                interview_type, location, notes):
    sb = _sb()
    if not sb:
        return
    try:
        sb.table("applications").update({
            "salary_range":   salary_range  or "",
            "interview_date": interview_date or "",
            "interview_type": interview_type or "",
            "location":       location       or "",
            "notes":          notes          or "",
            "last_updated":   _now(),
        }).eq("id", app_id).execute()
    except Exception as e:
        print(f"[database] update_application_details error: {e}")


def delete_application(app_id):
    sb = _sb()
    if not sb:
        return
    try:
        sb.table("applications").delete().eq("id", app_id).execute()
    except Exception as e:
        print(f"[database] delete_application error: {e}")