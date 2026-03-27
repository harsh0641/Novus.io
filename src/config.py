import os
from dotenv import load_dotenv

load_dotenv()

def _get(key, default=""):
    try:
        import streamlit as st
        val = st.secrets.get(key, "")
        if val:
            return val
    except Exception:
        pass
    return os.getenv(key, default)

EMAIL_ACCOUNT       = _get("EMAIL_ACCOUNT")
EMAIL_PASSWORD      = _get("EMAIL_APP_PASSWORD")
GROQ_API_KEY        = _get("GROQ_API_KEY")
GOOGLE_API_KEY      = _get("GOOGLE_API_KEY")
GOOGLE_CSE_ID       = _get("GOOGLE_CSE_ID")
HUNTER_API_KEY      = _get("HUNTER_API_KEY")
APIFY_API_KEY       = _get("APIFY_API_KEY")
APOLLO_API_KEY      = _get("APOLLO_API_KEY")
ROCKETREACH_API_KEY = _get("ROCKETREACH_API_KEY")
SNOV_USER_ID        = _get("SNOV_USER_ID")
SNOV_SECRET         = _get("SNOV_SECRET")
PROXYCURL_API_KEY   = _get("PROXYCURL_API_KEY")
SUPABASE_URL        = _get("SUPABASE_URL")
SUPABASE_KEY        = _get("SUPABASE_KEY")
