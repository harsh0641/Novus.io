"""
src/auth.py — CareerSync Auth via Supabase
==========================================
Uses Supabase (free PostgreSQL cloud DB) so the app can be deployed
to Streamlit Cloud and shared with friends via a URL.

Each user stores:
  name, email, password_hash
  gmail_account       → their Gmail address (EMAIL_ACCOUNT for email_service.py)
  gmail_app_password  → their App Password  (EMAIL_APP_PASSWORD for email_service.py)

Setup (one-time):
  1. Go to https://supabase.com → New Project
  2. SQL Editor → run this:

     CREATE TABLE users (
       id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       name                TEXT NOT NULL,
       email               TEXT UNIQUE NOT NULL,
       password_hash       TEXT NOT NULL,
       gmail_account       TEXT DEFAULT '',
       gmail_app_password  TEXT DEFAULT '',
       created_at          TIMESTAMPTZ DEFAULT now(),
       last_login          TIMESTAMPTZ DEFAULT now()
     );

  3. Add to .env (or Streamlit Cloud secrets):
       SUPABASE_URL=https://xxxx.supabase.co
       SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

  4. pip install supabase
"""

import os
import hashlib
from datetime import datetime, timezone

# ── Supabase client ────────────────────────────────────────────────────────────
try:
    from supabase import create_client, Client

    _URL = os.getenv("SUPABASE_URL", "")
    _KEY = os.getenv("SUPABASE_KEY", "")

    if _URL and _KEY:
        _sb: Client = create_client(_URL, _KEY)
        _SUPABASE_READY = True
    else:
        _sb = None
        _SUPABASE_READY = False
except ImportError:
    _sb = None
    _SUPABASE_READY = False

SALT = "careersync_v1_salt"


def _supabase_ok() -> bool:
    return _SUPABASE_READY and _sb is not None


def _hash(pw: str) -> str:
    return hashlib.sha256((SALT + pw).encode()).hexdigest()


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ══════════════════════════════════════════════════════════════════════════════
# USER CRUD
# ══════════════════════════════════════════════════════════════════════════════

def register_user(name: str, email: str, password: str,
                  gmail_account: str = "",
                  gmail_app_password: str = "") -> tuple[bool, str]:
    """
    Create a new user in Supabase.
    Returns (True, '') on success or (False, error_message) on failure.
    """
    if not _supabase_ok():
        return False, "Supabase not configured. Add SUPABASE_URL and SUPABASE_KEY to your .env"

    name  = name.strip()
    email = email.strip().lower()

    if not name or not email or not password:
        return False, "All fields are required."
    if "@" not in email:
        return False, "Enter a valid email address."
    if len(password) < 6:
        return False, "Password must be at least 6 characters."

    try:
        res = _sb.table("users").insert({
            "name":               name,
            "email":              email,
            "password_hash":      _hash(password),
            "gmail_account":      gmail_account.strip().lower(),
            "gmail_app_password": gmail_app_password.replace(" ", "").strip(),
            "created_at":         _now_iso(),
            "last_login":         _now_iso(),
        }).execute()

        if res.data:
            return True, ""
        return False, "Registration failed. Please try again."

    except Exception as e:
        err = str(e)
        if "duplicate" in err.lower() or "unique" in err.lower():
            return False, "An account with this email already exists."
        return False, f"Error: {err}"


def login_user(email: str, password: str) -> dict | None:
    """
    Verify credentials. Returns full user dict or None.
    Also updates last_login timestamp.
    """
    if not _supabase_ok():
        return None

    email = email.strip().lower()
    try:
        res = _sb.table("users")\
                 .select("*")\
                 .eq("email", email)\
                 .eq("password_hash", _hash(password))\
                 .single()\
                 .execute()

        if res.data:
            user = res.data
            # Update last_login
            _sb.table("users")\
               .update({"last_login": _now_iso()})\
               .eq("id", user["id"])\
               .execute()
            return user
    except Exception:
        pass
    return None


def get_user_by_id(user_id: str) -> dict | None:
    """Fetch latest user record from Supabase by UUID."""
    if not _supabase_ok():
        return None
    try:
        res = _sb.table("users")\
                 .select("*")\
                 .eq("id", user_id)\
                 .single()\
                 .execute()
        return res.data if res.data else None
    except Exception:
        return None


def update_gmail_credentials(user_id: str, gmail_account: str,
                              gmail_app_password: str) -> bool:
    """Save/update the user's Gmail address and App Password in Supabase."""
    if not _supabase_ok():
        return False
    try:
        _sb.table("users").update({
            "gmail_account":      gmail_account.strip().lower(),
            "gmail_app_password": gmail_app_password.replace(" ", "").strip(),
        }).eq("id", user_id).execute()
        return True
    except Exception:
        return False


def change_password(user_id: str, old_pw: str, new_pw: str) -> tuple[bool, str]:
    """Change password after verifying old one."""
    if not _supabase_ok():
        return False, "Supabase not configured."
    if len(new_pw) < 6:
        return False, "New password must be at least 6 characters."
    try:
        # Verify old password
        res = _sb.table("users")\
                 .select("id")\
                 .eq("id", user_id)\
                 .eq("password_hash", _hash(old_pw))\
                 .single()\
                 .execute()
        if not res.data:
            return False, "Current password is incorrect."
        _sb.table("users")\
           .update({"password_hash": _hash(new_pw)})\
           .eq("id", user_id)\
           .execute()
        return True, ""
    except Exception as e:
        return False, str(e)


# ══════════════════════════════════════════════════════════════════════════════
# GMAIL HELPERS
# ══════════════════════════════════════════════════════════════════════════════

def gmail_configured(user: dict) -> bool:
    """True if the user has both gmail_account and gmail_app_password set."""
    return bool(
        user.get("gmail_account", "").strip() and
        user.get("gmail_app_password", "").strip()
    )


def inject_gmail_env(user: dict):
    """
    Set os.environ["EMAIL_ACCOUNT"] and ["EMAIL_APP_PASSWORD"] from this
    user's stored credentials so email_service.py syncs THEIR Gmail inbox.
    Must be called on every dashboard page load after login.
    """
    os.environ["EMAIL_ACCOUNT"]      = user.get("gmail_account", "").strip()
    os.environ["EMAIL_APP_PASSWORD"] = user.get("gmail_app_password", "").strip()


def supabase_ready() -> bool:
    """True if Supabase is configured and reachable."""
    return _supabase_ok()