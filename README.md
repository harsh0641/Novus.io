# Novus — AI-Driven Job Application & Market Intelligence Platform

> CIS 600 Master's Project — University of Massachusetts Dartmouth  
> Harsh Hetalkumar Vora · Student ID: 02175306  
> Advisor: Prof. Dr. Yuchou Chang

---

## Overview

Novus is a full-stack AI-powered career platform that automates and optimizes the end-to-end job application pipeline. It combines live LinkedIn job scraping, hybrid ATS resume scoring, AI-tailored resume generation, and a Playwright-based browser agent that autonomously submits LinkedIn Easy Apply applications on the user's behalf.

The platform was built to solve a specific problem: 99% of Fortune 500 companies use Applicant Tracking Systems that reject 75% of resumes before any human reviews them. Novus gives job seekers the tools to understand, optimize, and automate their way through that filter.

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Local Development Setup](#local-development-setup)
  - [Prerequisites](#prerequisites)
  - [1. Clone the Repository](#1-clone-the-repository)
  - [2. Backend Setup](#2-backend-setup)
  - [3. Frontend Setup](#3-frontend-setup)
  - [4. Environment Variables](#4-environment-variables)
  - [5. Running the Project](#5-running-the-project)
- [Key Technical Decisions](#key-technical-decisions)
- [API Reference](#api-reference)
- [Known Limitations](#known-limitations)

---

## Features

**Market Intelligence Browser**
- Live LinkedIn job search via Apify scraper with LinkedIn Guest API fallback
- AI-generated job summaries, key qualifications, and engagement metrics via Groq Llama 3.1
- Infinite scroll with real-time deduplication
- Applicant competition bars, salary data, and Easy Apply detection

**ATS Resume Scoring Engine**
- Hybrid Python + LLM architecture — Python handles all score computation deterministically
- Two-pass keyword extraction: curated 80+ skill vocabulary scan + TF-IDF on JD requirement sentences
- Synonym normalization map (e.g. `react.js`, `reactjs`, `react js` → `react`)
- Visual output: circular score gauge, matched keywords (green), missing keywords (red)
- 91.3% precision / 89.7% recall on 15-JD software engineering test set

**AI Resume Optimizer**
- Downloads user's base resume PDF from Supabase Document Vault
- Generates a role-specific, ATS-optimized resume using Groq Llama 3.1 (1,400 token budget)
- Strict prompt rules — never fabricates credentials not in the original resume
- Export as PDF (browser print) or Microsoft Word .doc
- Rate limited to 10 optimizations per user per hour

**LinkedIn Easy Apply Agent**
- Playwright-based Chromium automation with anti-detection measures
- Persistent session thread architecture — one dedicated daemon thread per user session owns all browser objects, eliminating Playwright cross-thread crashes
- Sequential tab processing: open tab → navigate → validate Easy Apply → fill form → submit → close tab → next job
- OTP/2FA handling via frontend polling
- Human-simulated login (per-character typing with randomized delays)

**Application Tracker**
- Track applications by stage: Applied → Interview → Offer → Rejected
- Gmail cross-referencing via connected applications API
- CSV export of full application history

**Custom Email Verification**
- Gmail SMTP with App Password — no third-party auth provider
- Cryptographically signed tokens with secure Supabase redirect flow

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     PRESENTATION LAYER                       │
│              React + Vite  →  Deployed on Vercel            │
└──────────────────────────┬──────────────────────────────────┘
                           │ Axios (JWT interceptors)
┌──────────────────────────▼──────────────────────────────────┐
│                  APPLICATION LOGIC LAYER                     │
│           FastAPI (Python 3.11)  →  Deployed on Render      │
│                                                              │
│   /api/auth        Custom email verification (Gmail SMTP)   │
│   /api/jobs        Search · ATS score · Resume generation   │
│   /api/agent       Playwright Easy Apply automation         │
│   /api/applications  Tracking · stages · CSV export         │
└───────────┬──────────────────────────┬──────────────────────┘
            │                          │
┌───────────▼──────────┐  ┌────────────▼──────────────────────┐
│   AI PROCESSING      │  │        DATA PERSISTENCE            │
│                      │  │                                    │
│  Groq API            │  │  Supabase (PostgreSQL)             │
│  Llama 3.1-8b-instant│  │  · users, applied_jobs tables      │
│  · Job enrichment    │  │  · Row-Level Security (RLS)        │
│  · ATS feedback      │  │                                    │
│  · Resume generation │  │  Supabase Storage                  │
│                      │  │  · PDF resume Document Vault       │
│  Apify               │  │                                    │
│  · LinkedIn scraper  │  └────────────────────────────────────┘
└──────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React.js, Vite, Axios, Three.js (r128) |
| Backend | FastAPI, Python 3.11, Pydantic, python-dotenv |
| Database | Supabase (PostgreSQL + Storage) |
| AI / LLM | Groq API — Llama 3.1 8b instant |
| Job Scraping | Apify LinkedIn Jobs Scraper, BeautifulSoup (fallback) |
| Browser Automation | Playwright (Chromium, sync API) |
| PDF Processing | PyPDF2, pdfplumber |
| Keyword Extraction | scikit-learn TF-IDF |
| Email | Gmail SMTP (smtplib) |
| Frontend Deploy | Vercel |
| Backend Deploy | Render (persistent web service) |

---

## Project Structure

```
novus/
├── frontend/                        # React + Vite SPA
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Applications.jsx     # Job browser + agent modal
│   │   │   ├── Settings.jsx         # Document vault, profile
│   │   │   └── Auth.jsx             # Login, register, verify
│   │   ├── components/
│   │   │   ├── Sidebar.jsx
│   │   │   └── LoadingSpinner.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── hooks/
│   │   │   └── useDarkMode.js
│   │   └── api/
│   │       └── client.js            # Axios instance + interceptors
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── backend/                         # FastAPI Python backend
│   ├── main.py                      # App entry point, CORS, router registration
│   ├── .env                         # Environment variables (never commit)
│   └── routes/
│       ├── jobs.py                  # Search, ATS scoring, resume generation
│       ├── agent.py                 # Playwright Easy Apply agent
│       ├── auth.py                  # Email verification flow
│       └── applications.py          # Application tracking
│
└── README.md
```

---

## Local Development Setup

### Prerequisites

- Node.js 18+
- Python 3.11+
- Git
- A Supabase project (free tier works)
- A Groq API key (free at console.groq.com)
- Apify API key (optional — falls back to LinkedIn Guest API)
- Gmail account with App Password enabled

---

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/novus.git
cd novus
```

---

### 2. Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv venv

# macOS / Linux
source venv/bin/activate

# Windows
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

**`requirements.txt` should include:**

```
fastapi
uvicorn[standard]
pydantic
python-dotenv
supabase
requests
beautifulsoup4
PyPDF2
pdfplumber
scikit-learn
playwright
```

After installing, install the Playwright browser:

```bash
playwright install chromium
```

---

### 3. Frontend Setup

```bash
cd frontend
npm install
```

---

### 4. Environment Variables

Create `backend/.env` with the following:

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-anon-key

# Groq
GROQ_API_KEY=gsk_your_groq_key

# Apify (optional — falls back to LinkedIn Guest API if not set)
APIFY_API_KEY=apify_your_key

# Google Custom Search (optional — used for apply URL discovery)
GOOGLE_API_KEY=your_google_api_key
GOOGLE_CSE_ID=your_cse_id

# Gmail SMTP (for email verification)
GMAIL_USER=your_email@gmail.com
GMAIL_APP_PASSWORD=your_16_char_app_password

# Frontend URL (for email verification redirect)
FRONTEND_URL=http://localhost:5173
```

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:8000
```

---

### 5. Running the Project

**Start the backend:**

```bash
cd backend
uvicorn main:app --reload --port 8000
```

**Start the frontend (in a separate terminal):**

```bash
cd frontend
npm run dev
```

Frontend runs on `http://localhost:5173`  
Backend API runs on `http://localhost:8000`  
API docs available at `http://localhost:8000/docs`

---

## Key Technical Decisions

**Why Render (persistent service) instead of serverless for the backend**

The Playwright Easy Apply agent requires a long-lived background thread per user session. Serverless functions have hard execution time limits (10–30 seconds) and cannot maintain stateful threads. Render as a persistent web service supports both requirements. The tradeoff is a cold-start delay on first request after inactivity on the free tier.

**Why the ATS engine uses Python for scoring, not the LLM**

Early versions delegated score computation to Groq. LLMs produce inconsistent numeric outputs across identical inputs — the same resume and JD scored differently on consecutive calls. The final architecture uses Python for all deterministic scoring (matched / total keywords) and reserves the LLM for a single 60-token feedback sentence only.

**Why the Playwright agent uses a persistent daemon thread + queue**

Playwright's synchronous API binds all browser objects to the thread that created the `playwright` instance. FastAPI's `run_in_executor` assigns a different thread to each incoming request. Accessing browser objects created in thread-1 from thread-2 causes a hard crash: `cannot switch to a different thread (which happens to have exited)`. The fix: one dedicated `threading.Thread` per user session owns all Playwright objects for its entire lifetime. A `queue.Queue` bridges FastAPI request handlers to the session thread without any cross-thread Playwright access.

**Why Groq over OpenAI for LLM inference**

Groq's LPU inference engine runs Llama 3.1 8B at approximately 280 tokens/second — roughly 4× faster than comparable API providers. For interactive features like real-time ATS scoring where a user is actively waiting, this latency difference is significant. The Llama 3.1 8B model is also sufficient for the structured JSON extraction tasks the platform requires.

---

## API Reference

### Jobs

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/jobs/search` | Search LinkedIn jobs with AI enrichment |
| `GET` | `/api/jobs/suggestions` | Autocomplete for keyword/location/company |
| `POST` | `/api/jobs/save` | Save a job to the application tracker |
| `GET` | `/api/jobs/applied/{user_id}` | Get all tracked applications |
| `POST` | `/api/jobs/match` | Run ATS resume score against a JD |
| `POST` | `/api/jobs/generate-resume` | Generate an ATS-optimized resume |

### Agent

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/agent/apply` | Apply to one LinkedIn Easy Apply job |
| `POST` | `/api/agent/otp` | Submit OTP when 2FA is triggered |
| `GET` | `/api/agent/otp-status/{session_id}` | Poll for OTP required state |

### Auth

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register + send verification email |
| `GET` | `/api/auth/verify` | Verify email token + redirect to frontend |
| `POST` | `/api/auth/login` | Login with email + password |

---

## Known Limitations

- **LinkedIn scraping:** LinkedIn actively rate-limits and blocks scrapers. The Apify integration is more reliable than the Guest API fallback but requires a paid Apify account for sustained usage.
- **Easy Apply only:** The agent works exclusively with LinkedIn's built-in Easy Apply modal. External redirect jobs (Greenhouse, Lever, Workday) are not supported.
- **Render cold starts:** The free Render tier spins down after 15 minutes of inactivity. The first request after inactivity takes 30–60 seconds to respond.
- **Resume PDF text extraction:** Scanned image-based PDFs are not supported. The resume must be a text-based PDF for the ATS engine and optimizer to function.
- **OTP timeout:** If LinkedIn triggers 2FA during agent login, the user has 3 minutes to submit the OTP via the frontend modal before the session times out.

---

## Author

**Harsh Hetalkumar Vora**  
M.S. Computer Science — University of Massachusetts Dartmouth  
[LinkedIn](https://www.linkedin.com/in/harshvora14) · [GitHub](https://github.com/harsh0641)

---

*Built as CIS 600 Master's Project under the guidance of Prof. Dr. Yuchou Chang, UMass Dartmouth, 2026.*
