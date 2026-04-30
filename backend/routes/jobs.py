"""
backend/routes/jobs.py
FIXED: Correct .env path + genuine ATS scoring (keyword-based, not random).
"""
import os, sys, json, re, io

ROUTES_DIR  = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(ROUTES_DIR)
ROOT_DIR    = os.path.dirname(BACKEND_DIR)

sys.path.insert(0, ROOT_DIR)
sys.path.insert(0, BACKEND_DIR)
sys.path.insert(0, os.path.join(ROOT_DIR, "src"))

from dotenv import load_dotenv
load_dotenv(os.path.join(BACKEND_DIR, ".env"), override=True)

_gk = os.getenv("GROQ_API_KEY", "")
print(f"[jobs.py] GROQ_KEY: {'YES — ' + _gk[:12] + '...' if _gk else 'NO ❌'}")

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import requests as _req

router = APIRouter()

def _get(k, d=""): return os.getenv(k, d)

def _sb():
    u, k = _get("SUPABASE_URL"), _get("SUPABASE_KEY")
    if not u or not k: return None
    from supabase import create_client
    return create_client(u, k)

class SearchRequest(BaseModel):
    keyword: str
    location: str = "United States"
    company: str = ""
    date_filter: str = "Any time"
    user_id: str = ""

class SaveJobRequest(BaseModel):
    user_id: str; company: str; title: str
    description: Optional[str] = ""
    requirements: Optional[str] = ""
    salary: Optional[str] = ""
    job_type: Optional[str] = ""
    location: Optional[str] = ""
    source_url: Optional[str] = ""
    applicants: Optional[str] = ""
    ai_summary: Optional[str] = ""
    apply_url: Optional[str] = ""

class MatchRequest(BaseModel):
    user_id: str
    job_title: str
    job_description: str

ATS_DOMAINS = [
    "jobs.lever.co", "greenhouse.io", "boards.greenhouse.io",
    "myworkdayjobs.com", "workday.com", "icims.com", "taleo.net",
    "smartrecruiters.com", "ashbyhq.com", "bamboohr.com",
    "jobvite.com", "breezy.hr", "recruitee.com", "workable.com",
    "dover.com", "rippling.com", "eightfold.ai", "jazz.co",
    "careers.google.com", "amazon.jobs", "careers.microsoft.com",
    "careers.", "jobs.", "apply.",
]

def _is_ats_url(url: str) -> bool:
    if not url or not url.startswith("http"): return False
    skip = ["linkedin.com", "indeed.com", "glassdoor.com", "ziprecruiter.com",
            "monster.com", "careerbuilder.com", "simplyhired.com", "dice.com"]
    if any(s in url.lower() for s in skip): return False
    return True

def _groq(prompt: str, mt: int = 600) -> str:
    k = _get("GROQ_API_KEY")
    if not k:
        print("[groq] ❌ GROQ_API_KEY empty")
        return ""
    try:
        r = _req.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={"Authorization": f"Bearer {k}", "Content-Type": "application/json"},
            json={
                "model": "llama-3.1-8b-instant",
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": mt,
                "temperature": 0.0,
            },
            timeout=20,
        )
        if r.status_code != 200:
            print(f"[groq] HTTP {r.status_code}: {r.text[:200]}")
            return ""
        choices = r.json().get("choices")
        if not choices: return ""
        return choices[0].get("message", {}).get("content", "").strip()
    except Exception as e:
        print(f"[groq] Exception: {e}")
        return ""

def _clean_json(raw: str) -> str:
    if not raw: return ""
    raw = re.sub(r"```(?:json)?", "", raw).strip().rstrip("`").strip()
    s, e = raw.find("{"), raw.rfind("}")
    if s != -1 and e != -1 and e > s:
        return raw[s:e + 1]
    return raw

def _ai_enrich(job):
    title   = job.get("title", "Unknown")
    company = job.get("company", "Unknown")
    desc    = (job.get("description") or "")[:3000]
    reqs    = (job.get("requirements") or "")[:1200]

    combined = f"Job Title: {title}\nCompany: {company}\n"
    if desc:   combined += f"\nDescription:\n{desc}"
    if reqs:   combined += f"\nRequirements:\n{reqs}"
    if not desc and not reqs:
        combined += "\n(No description available.)"

    prompt = f"""{combined}

Return ONLY valid JSON, no markdown:
{{"summary":"2-3 sentence summary","requirements":"• Req 1\n• Req 2\n• Req 3\n• Req 4\n• Req 5","salary":"range or empty","job_type":"Full-time","engagement":"e.g. 200+ applicants"}}"""

    raw = _groq(prompt, 600)
    if raw:
        try:
            data = json.loads(_clean_json(raw))
            job["ai_summary"]    = data.get("summary", "")
            job["ai_reqs"]       = data.get("requirements", "")
            job["ai_engagement"] = data.get("engagement", "")
            if not job.get("salary"):   job["salary"]   = data.get("salary", "")
            if not job.get("job_type"): job["job_type"] = data.get("job_type", "Full-time")
            return job
        except json.JSONDecodeError as e:
            print(f"[ai_enrich] parse failed: {e}")

    job["ai_summary"]    = f"{title} position at {company}."
    job["ai_reqs"]       = reqs[:400] if reqs else "• Relevant experience required\n• Strong communication skills"
    job["ai_engagement"] = ""
    return job

def _extract_apply_url_from_linkedin(job_id: str) -> str:
    hdrs = {"User-Agent": "Mozilla/5.0", "Accept": "text/html", "Referer": "https://www.linkedin.com/"}
    try:
        r = _req.get(f"https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/{job_id}", headers=hdrs, timeout=10)
        if r.status_code == 200:
            from bs4 import BeautifulSoup
            soup = BeautifulSoup(r.text, "html.parser")
            for a in soup.find_all("a", href=True):
                href = a["href"]
                if _is_ats_url(href) and any(d in href for d in ATS_DOMAINS):
                    return href.split("?")[0]
            for pattern in [
                r'(https://jobs\.lever\.co/[^\s"\'&]+)',
                r'(https://boards\.greenhouse\.io/[^\s"\'&]+)',
                r'(https://[a-zA-Z0-9-]+\.greenhouse\.io/[^\s"\'&]+)',
                r'(https://[a-zA-Z0-9-]+\.myworkdayjobs\.com/[^\s"\'&]+)',
                r'(https://app\.ashbyhq\.com/[^\s"\'&]+)',
            ]:
                m = re.search(pattern, r.text)
                if m:
                    return m.group(1).rstrip('/"\'\\').split("?")[0]
    except Exception as e:
        print(f"[jobs] linkedin fetch error: {e}")
    return ""

def _find_apply_url(title, company, linkedin_url, job_id=""):
    if job_id:
        url = _extract_apply_url_from_linkedin(job_id)
        if url: return url
    gk, cse = _get("GOOGLE_API_KEY"), _get("GOOGLE_CSE_ID")
    if gk and cse:
        skip = ["linkedin.com", "indeed.com", "glassdoor.com", "ziprecruiter.com"]
        for q in [
            f'"{company}" "{title}" site:jobs.lever.co OR site:boards.greenhouse.io OR site:myworkdayjobs.com',
            f'{company} {title} jobs apply official',
        ]:
            try:
                r = _req.get("https://www.googleapis.com/customsearch/v1",
                             params={"key": gk, "cx": cse, "q": q, "num": 3}, timeout=8)
                for item in r.json().get("items", []):
                    url = item.get("link", "")
                    if not any(s in url for s in skip) and url.startswith("http"):
                        return url
            except Exception as e:
                print(f"[jobs] CSE error: {e}")
    return linkedin_url

def _google_engagement(title, company):
    gk, cse = _get("GOOGLE_API_KEY"), _get("GOOGLE_CSE_ID")
    if not gk or not cse: return ""
    try:
        r = _req.get("https://www.googleapis.com/customsearch/v1",
                     params={"key": gk, "cx": cse, "q": f"{title} {company} job", "num": 1}, timeout=8)
        t = r.json().get("searchInformation", {}).get("totalResults", "")
        if t:
            n = int(t)
            if n >= 1_000_000: return f"{n//1_000_000}M+ searches"
            elif n >= 1_000:   return f"{n//1_000}K+ searches"
            elif n > 0:        return f"{n} searches"
    except: pass
    return ""

def _fetch_apify(keyword, location, company, date_filter):
    key = _get("APIFY_API_KEY")
    if not key: return []
    dm = {"Any time": "", "Last 24 hours": "r86400", "Past week": "r604800", "Past month": "r2592000"}
    kw = f"{company.strip()} {keyword.strip()}".strip() if company.strip() else keyword.strip()
    inp = {"title": kw, "location": location or "United States", "rows": 25,
           "scrapeCompany": True, "proxy": {"useApifyProxy": True}}
    if dm.get(date_filter): inp["publishedAt"] = dm[date_filter]
    try:
        r = _req.post(
            "https://api.apify.com/v2/acts/bebity~linkedin-jobs-scraper/run-sync-get-dataset-items",
            params={"token": key, "timeout": 90, "memory": 512}, json=inp, timeout=100)
        if r.status_code == 200:
            items = r.json()
            if isinstance(items, list): return items
    except: pass
    return []

def _fetch_guest(keyword, location, company, date_filter):
    from bs4 import BeautifulSoup
    dm = {"Any time": "", "Last 24 hours": "r86400", "Past week": "r604800", "Past month": "r2592000"}
    kw = f"{keyword.strip()} {company.strip()}".strip() if company.strip() else keyword.strip()
    if not kw: return []
    hdrs = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/121.0.0.0 Safari/537.36", "Accept-Language": "en-US,en;q=0.9"}
    params = {"keywords": kw, "location": location, "start": 0, "count": 25}
    f = dm.get(date_filter, "")
    if f: params["f_TPR"] = f
    try:
        resp = _req.get("https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search",
                        params=params, headers=hdrs, timeout=20)
        if resp.status_code != 200: return []
    except: return []
    soup = BeautifulSoup(resp.text, "html.parser")
    jobs = []
    for card in soup.find_all("li")[:20]:
        try:
            entity = card.find("div", {"data-entity-urn": True})
            jid = ""
            if entity: jid = entity.get("data-entity-urn", "").split(":")[-1]
            if not jid:
                la = card.find("a", href=re.compile(r"/jobs/view/(\d+)"))
                if la:
                    m = re.search(r"/jobs/view/(\d+)", la["href"])
                    if m: jid = m.group(1)
            if not jid: continue
            tt  = card.find("h3") or card.find("span", class_=re.compile("title"))
            ct  = card.find("h4") or card.find("a", class_=re.compile("hidden-nested-link"))
            lt  = card.find("span", class_=re.compile("job-search-card__location"))
            tmt = card.find("time")
            la2 = card.find("a", href=re.compile(r"linkedin\.com/jobs"))
            url = la2["href"].split("?")[0] if la2 else f"https://www.linkedin.com/jobs/view/{jid}"
            jobs.append({"id": jid,
                "title": tt.get_text(strip=True) if tt else "Unknown",
                "companyName": ct.get_text(strip=True) if ct else "Unknown",
                "location": lt.get_text(strip=True) if lt else "",
                "publishedAt": tmt.get("datetime", "") if tmt else "",
                "jobUrl": url, "description": "", "salary": "",
                "applicantsCount": "", "requirements": "", "applyUrl": ""})
        except: continue

    DET = "https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/{id}"
    for job in jobs[:15]:
        try:
            d = _req.get(DET.format(id=job["id"]), headers=hdrs, timeout=10)
            if d.status_code == 200:
                ds = BeautifulSoup(d.text, "html.parser")
                dt = ds.find("div", class_=re.compile("description__text")) or ds.find("div", class_=re.compile("show-more-less-html"))
                if dt: job["description"] = dt.get_text(separator=" ", strip=True)[:3500]
                st = ds.find("span", class_=re.compile("compensation"))
                if st: job["salary"] = st.get_text(strip=True)
                at = ds.find("span", class_=re.compile("num-applicants|applicant"))
                if at: job["applicantsCount"] = at.get_text(strip=True)
                for pattern in [
                    r'(https://jobs\.lever\.co/[^"\'&\s<>]+)',
                    r'(https://boards\.greenhouse\.io/[^"\'&\s<>]+)',
                    r'(https://[a-zA-Z0-9-]+\.greenhouse\.io/[^"\'&\s<>]+)',
                    r'(https://[a-zA-Z0-9-]+\.myworkdayjobs\.com/[^"\'&\s<>]+)',
                    r'(https://app\.ashbyhq\.com/[^"\'&\s<>]+)',
                ]:
                    m2 = re.search(pattern, d.text)
                    if m2:
                        job["applyUrl"] = m2.group(1).rstrip('/"\'').split("?")[0]
                        break
        except: pass
    return jobs

def _norm(raw):
    desc        = raw.get("description") or raw.get("descriptionText") or raw.get("jobDescription") or ""
    co          = raw.get("companyName") or raw.get("company") or "Unknown"
    linkedin_url= raw.get("jobUrl") or raw.get("url") or "#"
    apply_url   = (raw.get("applyUrl") or raw.get("externalApplyUrl") or
                   raw.get("companyApplyUrl") or raw.get("applyLink") or raw.get("externalUrl") or "")
    if apply_url and "linkedin.com" in apply_url: apply_url = ""
    jid = str(raw.get("id") or raw.get("jobId") or abs(hash(linkedin_url + str(raw.get("title", "")))))
    return {
        "id": jid, "job_id": jid,
        "title": raw.get("title", "Unknown"), "company": co,
        "location": raw.get("location", ""),
        "salary": raw.get("salary") or raw.get("salaryRange") or "",
        "description": desc,
        "requirements": raw.get("requirements") or raw.get("jobRequirements") or "",
        "url": linkedin_url, "apply_url": apply_url,
        "posted": raw.get("publishedAt") or raw.get("postedAt") or "",
        "applicants": str(raw.get("applicantsCount") or raw.get("numApplicants") or ""),
        "job_type": raw.get("contractType") or raw.get("employmentType") or "",
        "ai_summary": "", "ai_reqs": "", "ai_engagement": "",
    }

# ══════════════════════════════════════════════════════════════════════════════

@router.post("/search")
def search_jobs(req: SearchRequest):
    raw = []; source = ""
    if _get("APIFY_API_KEY"):
        raw = _fetch_apify(req.keyword, req.location, req.company, req.date_filter)
        source = "Apify LinkedIn Scraper"
    if not raw:
        try:
            raw = _fetch_guest(req.keyword, req.location, req.company, req.date_filter)
            source = "LinkedIn Public API"
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Could not fetch jobs: {e}")
    if not raw: return {"success": True, "jobs": [], "source": source, "total": 0}

    jobs = [_norm(r) for r in raw[:20]]
    for i, job in enumerate(jobs):
        jobs[i] = _ai_enrich(job)
        if not jobs[i].get("apply_url") or "linkedin.com" in (jobs[i].get("apply_url") or ""):
            jobs[i]["apply_url"] = _find_apply_url(job["title"], job["company"], job["url"], job.get("job_id", ""))
        if not jobs[i].get("applicants") and not jobs[i].get("ai_engagement"):
            g = _google_engagement(job["title"], job["company"])
            if g: jobs[i]["ai_engagement"] = g
    return {"success": True, "jobs": jobs, "source": source, "total": len(jobs)}


@router.get("/suggestions")
def get_suggestions(q: str = "", type: str = "keyword"):
    if not q or len(q) < 2: return {"suggestions": []}
    if not _get("GROQ_API_KEY"): return {"suggestions": []}
    prompts = {
        "keyword":  f'List 6 job titles similar to "{q}". Return ONLY a JSON array of strings.',
        "location": f'List 6 locations similar to "{q}". Return ONLY a JSON array of strings.',
        "company":  f'List 6 company names similar to "{q}". Return ONLY a JSON array of strings.',
    }
    raw = _groq(prompts.get(type, prompts["keyword"]), 150)
    try:
        raw = re.sub(r"```(?:json)?", "", raw).strip().rstrip("`").strip()
        s, e = raw.find("["), raw.rfind("]")
        if s != -1 and e != -1: raw = raw[s:e+1]
        parsed = json.loads(raw)
        if isinstance(parsed, list): return {"suggestions": [str(x) for x in parsed[:6]]}
    except: pass
    return {"suggestions": []}


@router.post("/save")
def save_applied_job(req: SaveJobRequest):
    sb = _sb()
    if not sb: raise HTTPException(status_code=500, detail="Supabase not configured")
    try:
        ex = sb.table("applied_jobs").select("id").eq("user_id", req.user_id).eq("title", req.title).eq("company", req.company).execute()
        if ex.data: return {"success": True, "message": "Already saved", "already_exists": True}
    except: pass
    for attempt in [
        {"user_id": req.user_id, "company": req.company, "title": req.title,
         "description": (req.description or "")[:2000], "requirements": req.requirements or "",
         "salary": req.salary or "", "job_type": req.job_type or "", "location": req.location or "",
         "source_url": req.source_url or "", "applicants": req.applicants or "", "ai_summary": req.ai_summary or ""},
        {"user_id": req.user_id, "company": req.company, "title": req.title},
    ]:
        try:
            sb.table("applied_jobs").insert(attempt).execute()
            return {"success": True, "message": f"Saved {req.title} at {req.company}"}
        except Exception as e:
            print(f"[jobs/save] failed: {e}"); continue
    raise HTTPException(status_code=500, detail="Save failed — check Supabase RLS")


@router.get("/applied/{user_id}")
def get_applied_jobs(user_id: str):
    sb = _sb()
    if not sb: raise HTTPException(status_code=500, detail="Supabase not configured")
    try:
        res = sb.table("applied_jobs").select("*").eq("user_id", user_id).order("applied_at", desc=True).execute()
        return {"success": True, "data": res.data or [], "total": len(res.data or [])}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ── Synonym normalization map ─────────────────────────────────────────────────
SYNONYMS = {
    "react": ["react.js", "reactjs", "react js"],
    "node": ["node.js", "nodejs", "node js"],
    "express": ["express.js", "expressjs"],
    "postgres": ["postgresql", "postgres", "pg"],
    "mongo": ["mongodb", "mongo db"],
    "aws": ["amazon web services", "amazon aws"],
    "gcp": ["google cloud", "google cloud platform"],
    "azure": ["microsoft azure", "ms azure"],
    "k8s": ["kubernetes"],
    "js": ["javascript"],
    "ts": ["typescript"],
    "ml": ["machine learning"],
    "dl": ["deep learning"],
    "ci/cd": ["continuous integration", "continuous deployment", "github actions", "jenkins"],
    "restful": ["rest api", "restful api", "rest apis"],
}

# Build reverse lookup: variant → canonical
_VARIANT_MAP = {}
for canonical, variants in SYNONYMS.items():
    for v in variants:
        _VARIANT_MAP[v] = canonical
    _VARIANT_MAP[canonical] = canonical

def _normalize(text: str) -> str:
    """Lowercase and replace known variants with canonical form."""
    t = text.lower()
    for variant, canonical in sorted(_VARIANT_MAP.items(), key=lambda x: -len(x[0])):
        t = t.replace(variant, canonical)
    return t

# Hard skill patterns — what actually matters for ATS matching
TECH_SKILLS = {
    # Languages
    "typescript", "javascript", "python", "java", "sql", "html", "css",
    "c++", "c#", "go", "rust", "ruby", "php", "swift", "kotlin", "scala",
    # Frameworks
    "react", "next.js", "nextjs", "node.js", "nodejs", "express", "django",
    "fastapi", "angular", "vue", "svelte", "tailwind", "graphql", "trpc",
    # Databases
    "postgresql", "mysql", "mongodb", "redis", "supabase", "firebase",
    "dynamodb", "elasticsearch", "sqlite",
    # Cloud / Infra
    "aws", "gcp", "azure", "vercel", "docker", "kubernetes", "terraform",
    "github actions", "ci/cd", "jenkins", "s3", "ec2", "lambda",
    # Tools / Libs
    "git", "linux", "rest", "graphql", "tanstack", "prisma", "drizzle",
    "t3 stack", "t3", "tanstack query", "react query", "zustand", "redux",
    # Concepts
    "full-stack", "fullstack", "full stack", "backend", "frontend",
    "microservices", "api", "restful", "oauth", "jwt", "websocket",
}

def _extract_jd_keywords(jd: str) -> list[str]:
    """
    Two-pass extraction:
    Pass 1 — scan JD for known tech skills from curated list (high precision)
    Pass 2 — TF-IDF on requirement sentences to catch unlisted terms
    """
    import re
    from sklearn.feature_extraction.text import TfidfVectorizer

    jd_lower = jd.lower()
    found = set()

    # Pass 1: curated skill scan (handles multi-word like "next.js", "t3 stack")
    for skill in TECH_SKILLS:
        # word-boundary aware match
        pattern = r'(?<![a-zA-Z0-9])' + re.escape(skill) + r'(?![a-zA-Z0-9])'
        if re.search(pattern, jd_lower):
            found.add(skill)

    # Pass 2: TF-IDF on requirement/qualification lines only
    req_lines = []
    in_req = False
    for line in jd.split('\n'):
        l = line.strip()
        if re.search(r'required|qualif|responsibilities|preferred', l, re.I):
            in_req = True
        if in_req and len(l) > 5:
            req_lines.append(l)

    if req_lines:
        try:
            vec = TfidfVectorizer(
                ngram_range=(1, 2),
                stop_words='english',
                max_features=30,
                token_pattern=r'[a-zA-Z][a-zA-Z0-9\+\#\.\/\-]{1,}',
            )
            vec.fit_transform(req_lines)
            tfidf_terms = vec.get_feature_names_out().tolist()

            # Only keep tfidf terms that look like tech (not business prose)
            noise = {
                'experience', 'work', 'ability', 'strong', 'good', 'knowledge',
                'understanding', 'using', 'including', 'familiarity', 'working',
                'required', 'preferred', 'plus', 'bonus', 'nice', 'have', 'will',
                'must', 'able', 'help', 'join', 'team', 'role', 'position', 'job',
                'company', 'looking', 'seeking', 'candidate', 'opportunity',
                'roofing', 'homeowner', 'marketplace', 'contractor', 'stipend',
                'lunch', 'insurance', 'degree', 'bachelor', 'communication',
                'detail', 'attention', 'verbal', 'written', 'problem', 'solving',
                'independently', 'collaborate', 'roadmap', 'ambitious', 'deliver',
            }
            for term in tfidf_terms:
                if term.lower() not in noise and len(term) > 2:
                    found.add(term.lower())
        except Exception:
            pass

    keywords = list(found)
    print(f"[match] JD keywords extracted ({len(keywords)}): {keywords}")
    return keywords[:40]


def _match_keywords(keywords: list[str], resume_norm: str) -> tuple[list, list]:
    """Check each keyword against normalized resume. Returns (matched, missing)."""
    matched, missing = [], []
    for kw in keywords:
        kw_norm = _normalize(kw)
        # Check canonical form OR any variant in resume
        found = kw_norm in resume_norm
        if not found:
            # Also check original (pre-normalize) in resume_norm
            found = kw.lower() in resume_norm
        (matched if found else missing).append(kw)
    return matched, missing


@router.post("/match")
def get_ats_match_score(req: MatchRequest):
    """
    Hybrid ATS engine:
    - Python: PDF extract → TF-IDF keyword extraction → synonym-normalized matching → score
    - Groq: semantic feedback sentence only (50 tokens)
    """
    sb = _sb()
    if not sb:
        raise HTTPException(status_code=500, detail="Supabase not configured")

    # 1. Get resume URL
    try:
        result = sb.table("users").select("resume_url").eq("id", req.user_id).execute()
        if not result.data or not result.data[0].get("resume_url"):
            return {"success": False, "message": "No resume found. Upload in Settings → Document Vault first."}
        resume_url = result.data[0]["resume_url"]
    except Exception as e:
        return {"success": False, "message": f"Database error: {str(e)}"}

    # 2. Download + extract resume text
    resume_text = ""
    try:
        pdf_resp = _req.get(resume_url, timeout=15)
        if pdf_resp.status_code != 200:
            return {"success": False, "message": f"Could not download resume (HTTP {pdf_resp.status_code})."}
        pdf_bytes = pdf_resp.content
        try:
            import PyPDF2
            reader = PyPDF2.PdfReader(io.BytesIO(pdf_bytes))
            for page in reader.pages:
                t = page.extract_text()
                if t: resume_text += t + "\n"
        except Exception:
            try:
                import pdfplumber
                with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
                    for page in pdf.pages:
                        t = page.extract_text()
                        if t: resume_text += t + "\n"
            except Exception:
                resume_text = pdf_bytes.decode("utf-8", errors="ignore")

        resume_text = resume_text.strip()
        if not resume_text:
            return {"success": False, "message": "Could not extract text from resume PDF."}
        print(f"[match] ✅ {len(resume_text)} chars extracted")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Resume read error: {str(e)}")

    # 3. Normalize resume once
    resume_norm = _normalize(resume_text)

    # 4. Extract keywords from JD using TF-IDF (Python, no Groq tokens)
    keywords = _extract_jd_keywords(req.job_description)
    print(f"[match] JD keywords extracted: {keywords}")

    # 5. Match keywords against resume with synonym normalization
    matched, missing = _match_keywords(keywords, resume_norm)

    # 6. Compute score in Python — never trust LLM math
    total = len(matched) + len(missing)
    score = int((len(matched) / total) * 100) if total > 0 else 0
    score = max(0, min(100, score))

    # 7. Groq generates ONLY the feedback sentence (50 tokens = cheap)
    feedback = f"{len(matched)} of {total} keywords matched."
    if _get("GROQ_API_KEY"):
        fb_prompt = (
            f"Resume for '{req.job_title}': matched {len(matched)}/{total} keywords. "
            f"Top missing: {', '.join(missing[:5])}. "
            f"Write 1 sentence of actionable advice. Under 25 words. No preamble."
        )
        fb = _groq(fb_prompt, mt=60)
        if fb:
            feedback = f"{len(matched)} of {total} keywords matched. {fb}"

    print(f"[match] ✅ Score={score} matched={len(matched)} missing={len(missing)}")
    return {
        "success": True,
        "score": score,
        "feedback": feedback,
        "matched": matched,
        "missing": missing,
    }