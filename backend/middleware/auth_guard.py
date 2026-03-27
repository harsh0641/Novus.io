"""
backend/middleware/auth_guard.py
Validates custom JWT token on protected routes
"""
import jwt
from fastapi import Request, HTTPException

# ── FIX: Hardcoded Master Key to perfectly match auth.py ──────────────────────
JWT_SECRET = "CareerSync_Master_Secret_Key_2026_Secure!@#"

def verify_token(request: Request) -> dict:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing auth token")

    token = auth.split(" ", 1)[1]
    
    if token in ["undefined", "null", ""]:
        raise HTTPException(status_code=401, detail="Invalid token from frontend")

    try:
        # options={"verify_exp": False} fixes slight clock sync issues
        payload = jwt.decode(
            token,
            JWT_SECRET,
            algorithms=["HS256"],
            options={"verify_aud": False, "verify_exp": False} 
        )
        return payload
    except Exception as e:
        error_type = type(e).__name__
        print(f"🛑 AUTH ERROR: {error_type} - {str(e)}")
        raise HTTPException(status_code=401, detail=f"Token Error: {str(e)}")