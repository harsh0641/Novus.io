"""
backend/main.py — CareerSync FastAPI Backend
"""

import os, sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)
sys.path.insert(0, os.path.join(BASE_DIR, "src"))

from dotenv import load_dotenv
ENV_PATH = os.path.join(BASE_DIR, ".env")
load_dotenv(ENV_PATH)

print(f"✅ BASE_DIR: {BASE_DIR}")
print(f"✅ .env exists: {os.path.exists(ENV_PATH)}")
print(f"✅ SUPABASE_URL: {bool(os.getenv('SUPABASE_URL'))}")

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from middleware.rate_limit import check_rate_limit
from middleware.auth_guard import verify_token

from routes.auth          import router as auth_router
from routes.applications import router as applications_router
from routes.gmail         import router as gmail_router
from routes.recruiter    import router as recruiter_router
from routes.jobs         import router as jobs_router

app = FastAPI(title="CareerSync API", version="1.0.0")

# ── CORS CONFIGURATION ────────────────────────────────────────────────────────
# Add your production Vercel URL here
origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "https://novusio.vercel.app",  # Your Vercel frontend
]

# Optional: Also allow origins defined in Environment Variables
env_origins = os.getenv("ALLOWED_ORIGINS")
if env_origins:
    origins.extend([o.strip() for o in env_origins.split(",")])

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# ──────────────────────────────────────────────────────────────────────────────

# Auth routes — rate limited only (no token needed to login/register)
app.include_router(auth_router,             prefix="/api/auth",         tags=["Auth"],
                   dependencies=[Depends(check_rate_limit)])

# Protected routes — rate limited + token required
app.include_router(applications_router, prefix="/api/applications", tags=["Applications"],
                   dependencies=[Depends(check_rate_limit), Depends(verify_token)])
app.include_router(gmail_router,         prefix="/api/gmail",        tags=["Gmail"],
                   dependencies=[Depends(check_rate_limit), Depends(verify_token)])
app.include_router(recruiter_router,    prefix="/api/recruiter",    tags=["Recruiter"],
                   dependencies=[Depends(check_rate_limit), Depends(verify_token)])
app.include_router(jobs_router,         prefix="/api/jobs",         tags=["Jobs"],
                   dependencies=[Depends(check_rate_limit), Depends(verify_token)])

@app.get("/")
def root():
    return {"status": "ok", "message": "CareerSync API is running 🚀"}

@app.get("/api/health")
def health():
    return {"status": "healthy", "version": "1.0.0"}