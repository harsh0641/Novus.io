"""
src/credits_tracker.py
========================
Tracks API credit usage. On Streamlit Cloud, persists to Supabase.
Falls back to in-memory tracking if Supabase not available.
Auto-resets daily (Google CSE, Groq) and monthly (Hunter, Snov) credits.
"""

import os
from datetime import datetime, date

# ── Service definitions ───────────────────────────────────────────────────────
SERVICES = {
    "google_cse": {
        "name":  "Google Custom Search",
        "desc":  "Search API calls",
        "emoji": "🔍",
        "color": "#2563EB",
        "total": 1000,
        "reset": "daily",
    },
    "hunter": {
        "name":  "Hunter.io",
        "desc":  "Email finding credits",
        "emoji": "🎯",
        "color": "#22c55e",
        "total": 50,
        "reset": "monthly",
    },
    "groq": {
        "name":  "Groq AI",
        "desc":  "AI generation calls",
        "emoji": "⚡",
        "color": "#8b5cf6",
        "total": 14400,
        "reset": "daily",
    },
    "snov": {
        "name":  "Snov.io",
        "desc":  "Email finder credits",
        "emoji": "📧",
        "color": "#f59e0b",
        "total": 50,
        "reset": "monthly",
    },
    "apollo": {
        "name":  "Apollo.io",
        "desc":  "People match lookups",
        "emoji": "🚀",
        "color": "#06b6d4",
        "total": 75,
        "reset": "never",
    },
    "apify": {
        "name":  "Apify",
        "desc":  "LinkedIn enrichment",
        "emoji": "🕷️",
        "color": "#64748b",
        "total": 100,
        "reset": "never",
    },
    "rocketreach": {
        "name":  "RocketReach",
        "desc":  "Profile lookups",
        "emoji": "🔓",
        "color": "#ef4444",
        "total": 3,
        "reset": "never",
    },
}

# ── In-memory fallback ────────────────────────────────────────────────────────
_mem: dict = {}


def _get_supabase():
    """Return Supabase client or None."""
    try:
        import streamlit as st
        url = st.secrets.get("SUPABASE_URL", "") or os.getenv("SUPABASE_URL", "")
        key = st.secrets.get("SUPABASE_KEY", "") or os.getenv("SUPABASE_KEY", "")
    except Exception:
        url = os.getenv("SUPABASE_URL", "")
        key = os.getenv("SUPABASE_KEY", "")
    if not url or not key:
        return None
    try:
        from supabase import create_client
        return create_client(url, key)
    except Exception:
        return None


def _should_reset(entry: dict, reset_type: str) -> bool:
    if reset_type == "never":
        return False
    last  = entry.get("reset_date", "")
    today = str(date.today())
    if reset_type == "daily":
        return last != today
    if reset_type == "monthly":
        try:
            last_dt  = datetime.strptime(last, "%Y-%m-%d")
            today_dt = date.today()
            return (last_dt.year, last_dt.month) != (today_dt.year, today_dt.month)
        except Exception:
            return True
    return False


def _init_entry(key: str) -> dict:
    total = SERVICES.get(key, {}).get("total", 100)
    return {
        "used":       0,
        "remaining":  total,
        "reset_date": str(date.today()),
    }


# ── Supabase persistence ──────────────────────────────────────────────────────

def _load_from_supabase() -> dict:
    sb = _get_supabase()
    if not sb:
        return {}
    try:
        res = sb.table("credits").select("*").execute()
        out = {}
        for row in (res.data or []):
            out[row["service_key"]] = {
                "used":       row.get("used", 0),
                "remaining":  row.get("remaining", 0),
                "reset_date": row.get("reset_date", str(date.today())),
            }
        return out
    except Exception:
        return {}


def _save_to_supabase(key: str, entry: dict):
    sb = _get_supabase()
    if not sb:
        return
    try:
        sb.table("credits").upsert({
            "service_key": key,
            "used":        entry["used"],
            "remaining":   entry["remaining"],
            "reset_date":  entry["reset_date"],
        }, on_conflict="service_key").execute()
    except Exception:
        pass


def _get_state() -> dict:
    # Try Supabase first, fall back to memory
    data = _load_from_supabase() or _mem.copy()

    changed = False
    for key, svc in SERVICES.items():
        if key not in data:
            data[key] = _init_entry(key)
            changed = True
        else:
            if _should_reset(data[key], svc["reset"]):
                data[key] = _init_entry(key)
                changed = True

    if changed:
        for key in SERVICES:
            if key in data:
                _save_to_supabase(key, data[key])
                _mem[key] = data[key]

    return data


# ── Public API ────────────────────────────────────────────────────────────────

def consume(service_key: str, amount: int = 1) -> int:
    """Deduct amount from service credits. Returns new remaining count."""
    data  = _get_state()
    entry = data.get(service_key, _init_entry(service_key))
    total = SERVICES.get(service_key, {}).get("total", 100)

    entry["used"]      = min(total, entry.get("used", 0) + amount)
    entry["remaining"] = max(0, total - entry["used"])

    _save_to_supabase(service_key, entry)
    _mem[service_key] = entry
    return entry["remaining"]


def get_all() -> dict:
    """Return full state dict for all services."""
    return _get_state()


def peek(service_key: str) -> int:
    """Return remaining credits without modifying state."""
    state = _get_state()
    return state.get(service_key, {}).get(
        "remaining", SERVICES.get(service_key, {}).get("total", 0))


def reset_service(service_key: str):
    """Manually reset a single service to full credits."""
    entry = _init_entry(service_key)
    _save_to_supabase(service_key, entry)
    _mem[service_key] = entry


def reset_all():
    """Manually reset ALL services to full credits."""
    for key in SERVICES:
        reset_service(key)