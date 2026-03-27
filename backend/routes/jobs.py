"""
backend/routes/jobs.py
Extracts real ATS apply URL (Lever/Greenhouse/Workday) from LinkedIn job posting.
"""
import os, sys, json, re, io
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, BASE_DIR)
sys.path.insert(0, os.path.join(BASE_DIR, "src"))
from dotenv import load_dotenv
load_dotenv(os.path.join(BASE_DIR, ".env"))

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import requests as _req
import PyPDF2

router = APIRouter()

def _get(k, d=""): return os.getenv(k, d)
def _sb():
    u,k=_get("SUPABASE_URL"),_get("SUPABASE_KEY")
    if not u or not k: return None
    from supabase import create_client
    return create_client(u, k)

class SearchRequest(BaseModel):
    keyword: str; location: str="United States"; company: str=""
    date_filter: str="Any time"; user_id: str=""

class SaveJobRequest(BaseModel):
    user_id: str; company: str; title: str
    description: Optional[str]=""; requirements: Optional[str]=""
    salary: Optional[str]=""; job_type: Optional[str]=""; location: Optional[str]=""
    source_url: Optional[str]=""; applicants: Optional[str]=""; ai_summary: Optional[str]=""
    apply_url: Optional[str]=""

# ── ATS domain patterns ────────────────────────────────────────────────────────
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
    """Returns True if URL is a real ATS/career page, not LinkedIn/aggregator."""
    if not url or not url.startswith("http"): return False
    skip = ["linkedin.com", "indeed.com", "glassdoor.com", "ziprecruiter.com",
            "monster.com", "careerbuilder.com", "simplyhired.com", "dice.com"]
    url_lower = url.lower()
    if any(s in url_lower for s in skip): return False
    return True

def _extract_apply_url_from_linkedin(job_id: str) -> str:
    """
    Fetch the LinkedIn job apply redirect URL.
    LinkedIn's apply button hits: /jobs/view/{id}/apply
    which redirects to the real ATS URL.
    """
    hdrs = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/121.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://www.linkedin.com/",
    }

    # Method 1: Try the job detail API for externalApplyUrl
    try:
        det_url = f"https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/{job_id}"
        r = _req.get(det_url, headers=hdrs, timeout=10)
        if r.status_code == 200:
            from bs4 import BeautifulSoup
            soup = BeautifulSoup(r.text, "html.parser")

            # Look for apply button with external URL
            for a in soup.find_all("a", href=True):
                href = a["href"]
                if _is_ats_url(href):
                    if "lever.co" in href:
                        base = href.split("?")[0]
                        print(f"[jobs] ✅ Lever URL found: {base}")
                        return base
                    if any(ats in href for ats in ATS_DOMAINS):
                        base = href.split("?")[0]
                        print(f"[jobs] ✅ ATS URL found: {base}")
                        return base

            # Search HTML text for ATS URLs
            text = r.text
            for pattern in [
                r'(https://jobs\.lever\.co/[^\s"\'&]+)',
                r'(https://boards\.greenhouse\.io/[^\s"\'&]+)',
                r'(https://[a-zA-Z0-9-]+\.greenhouse\.io/[^\s"\'&]+)',
                r'(https://[a-zA-Z0-9-]+\.myworkdayjobs\.com/[^\s"\'&]+)',
                r'(https://[a-zA-Z0-9-]+\.icims\.com/[^\s"\'&]+)',
                r'(https://app\.ashbyhq\.com/[^\s"\'&]+)',
                r'(https://[a-zA-Z0-9-]+\.smartrecruiters\.com/[^\s"\'&]+)',
                r'(https://[a-zA-Z0-9-]+\.workday\.com/[^\s"\'&]+)',
            ]:
                m = re.search(pattern, text)
                if m:
                    url = m.group(1).rstrip('/"\'\\')
                    if "lever.co" in url:
                        url = url.split("?")[0]
                    print(f"[jobs] ✅ ATS URL from HTML: {url}")
                    return url

    except Exception as e:
        print(f"[jobs] detail fetch error: {e}")

    # Method 2: Google CSE to find the exact job posting
    gk = _get("GOOGLE_API_KEY"); cse = _get("GOOGLE_CSE_ID")
    if gk and cse:
        try:
            pass
        except: pass

    return ""

def _find_apply_url(title: str, company: str, linkedin_url: str, job_id: str = "") -> str:
    """
    Find the official ATS career page URL for a job.
    Priority: LinkedIn detail page → Google CSE → LinkedIn fallback
    """
    if job_id:
        url = _extract_apply_url_from_linkedin(job_id)
        if url: return url

    gk = _get("GOOGLE_API_KEY"); cse = _get("GOOGLE_CSE_ID")
    if gk and cse:
        queries = [
            f'"{company}" "{title}" site:jobs.lever.co OR site:boards.greenhouse.io OR site:myworkdayjobs.com OR site:ashbyhq.com',
            f'"{company}" "{title}" apply job lever greenhouse workday',
            f'{company} {title} jobs apply official',
        ]
        skip = ["linkedin.com","indeed.com","glassdoor.com","ziprecruiter.com","monster.com","careerbuilder.com"]
        for q in queries:
            try:
                r = _req.get("https://www.googleapis.com/customsearch/v1",
                    params={"key":gk,"cx":cse,"q":q,"num":3},timeout=8)
                for item in r.json().get("items",[]):
                    url = item.get("link","")
                    if not any(s in url for s in skip) and url.startswith("http"):
                        print(f"[jobs] ✅ Google CSE apply URL: {url}")
                        return url
            except Exception as e:
                print(f"[jobs] Google CSE error: {e}")
                continue

    print(f"[jobs] ⚠️ Falling back to LinkedIn URL: {linkedin_url}")
    return linkedin_url

# ── Groq AI ───────────────────────────────────────────────────────────────────
def _groq(prompt, mt=500):
    k=_get("GROQ_API_KEY")
    if not k: return ""
    try:
        r=_req.post("https://api.groq.com/openai/v1/chat/completions",
            headers={"Authorization":f"Bearer {k}","Content-Type":"application/json"},
            json={"model":"llama-3.1-8b-instant","messages":[{"role":"user","content":prompt}],"max_tokens":mt,"temperature":0.3},timeout=15)
        return r.json()["choices"][0]["message"]["content"].strip()
    except: return ""

def _ai_enrich(job):
    title=job.get("title",""); company=job.get("company","")
    desc=job.get("description","")[:3000]; reqs=job.get("requirements","")[:1200]
    combined=f"Job Title: {title}\nCompany: {company}\n"
    if desc: combined+=f"\nDescription:\n{desc}"
    if reqs: combined+=f"\nRequirements:\n{reqs}"
    if not desc and not reqs: combined+="\n(Generate realistic summary.)"
    prompt=f"""{combined}\n\nReturn ONLY JSON:\n{{"summary":"2-3 sentence summary","requirements":"5 requirements each starting with •","salary":"salary or empty","job_type":"Full-time/Part-time/Contract/Internship","engagement":"e.g. 200+ applicants"}}"""
    raw=_groq(prompt,500)
    try:
        raw=re.sub(r"```(?:json)?","",raw).strip().rstrip("`").strip()
        data=json.loads(raw)
        job["ai_summary"]=data.get("summary",""); job["ai_reqs"]=data.get("requirements","")
        job["ai_engagement"]=data.get("engagement","")
        if not job.get("salary"): job["salary"]=data.get("salary","")
        if not job.get("job_type"): job["job_type"]=data.get("job_type","Full-time")
    except:
        job["ai_summary"]=_groq(f"2 sentence summary:\n{title} at {company}\n{desc[:400]}",120)
        job["ai_reqs"]=reqs[:400] if reqs else "• Relevant experience\n• Communication skills\n• Problem-solving\n• Team player\n• Degree or equivalent"
        job["ai_engagement"]=""
    return job

def _google_engagement(title,company):
    gk=_get("GOOGLE_API_KEY"); cse=_get("GOOGLE_CSE_ID")
    if not gk or not cse: return ""
    try:
        r=_req.get("https://www.googleapis.com/customsearch/v1",
            params={"key":gk,"cx":cse,"q":f"{title} {company} job","num":1},timeout=8)
        t=r.json().get("searchInformation",{}).get("totalResults","")
        if t:
            n=int(t)
            if n>=1_000_000: return f"{n//1_000_000}M+ searches"
            elif n>=1_000: return f"{n//1_000}K+ searches"
            elif n>0: return f"{n} searches"
    except: pass
    return ""

def _fetch_apify(keyword,location,company,date_filter):
    key=_get("APIFY_API_KEY")
    if not key: return []
    dm={"Any time":"","Last 24 hours":"r86400","Past week":"r604800","Past month":"r2592000"}
    kw=f"{company.strip()} {keyword.strip()}".strip() if company.strip() else keyword.strip()
    inp={"title":kw,"location":location or "United States","rows":25,"scrapeCompany":True,"proxy":{"useApifyProxy":True}}
    if dm.get(date_filter): inp["publishedAt"]=dm[date_filter]
    try:
        r=_req.post("https://api.apify.com/v2/acts/bebity~linkedin-jobs-scraper/run-sync-get-dataset-items",
            params={"token":key,"timeout":90,"memory":512},json=inp,timeout=100)
        if r.status_code==200:
            items=r.json()
            if isinstance(items,list): return items
    except: pass
    return []

def _fetch_guest(keyword,location,company,date_filter):
    from bs4 import BeautifulSoup
    dm={"Any time":"","Last 24 hours":"r86400","Past week":"r604800","Past month":"r2592000"}
    kw=f"{keyword.strip()} {company.strip()}".strip() if company.strip() else keyword.strip()
    if not kw: return []
    hdrs={"User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/121.0.0.0 Safari/537.36","Accept-Language":"en-US,en;q=0.9"}
    params={"keywords":kw,"location":location,"start":0,"count":25}
    f=dm.get(date_filter,"")
    if f: params["f_TPR"]=f
    try:
        resp=_req.get("https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search",params=params,headers=hdrs,timeout=20)
        if resp.status_code!=200: return []
    except: return []
    soup=BeautifulSoup(resp.text,"html.parser"); jobs=[]
    for card in soup.find_all("li")[:20]:
        try:
            entity=card.find("div",{"data-entity-urn":True}); jid=""
            if entity: jid=entity.get("data-entity-urn","").split(":")[-1]
            if not jid:
                la=card.find("a",href=re.compile(r"/jobs/view/(\d+)"))
                if la:
                    m=re.search(r"/jobs/view/(\d+)",la["href"])
                    if m: jid=m.group(1)
            if not jid: continue
            tt=card.find("h3") or card.find("span",class_=re.compile("title"))
            ct=card.find("h4") or card.find("a",class_=re.compile("hidden-nested-link"))
            lt=card.find("span",class_=re.compile("job-search-card__location"))
            tmt=card.find("time"); la2=card.find("a",href=re.compile(r"linkedin\.com/jobs"))
            url=la2["href"].split("?")[0] if la2 else f"https://www.linkedin.com/jobs/view/{jid}"
            jobs.append({"id":jid,"title":tt.get_text(strip=True) if tt else "Unknown",
                "companyName":ct.get_text(strip=True) if ct else "Unknown",
                "location":lt.get_text(strip=True) if lt else "",
                "publishedAt":tmt.get("datetime","") if tmt else "",
                "jobUrl":url,"description":"","salary":"","applicantsCount":"","requirements":"","applyUrl":""})
        except: continue
    DET="https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/{id}"
    for job in jobs[:15]:
        try:
            d=_req.get(DET.format(id=job["id"]),headers=hdrs,timeout=10)
            if d.status_code==200:
                ds=BeautifulSoup(d.text,"html.parser")
                dt=ds.find("div",class_=re.compile("description__text")) or ds.find("div",class_=re.compile("show-more-less-html"))
                if dt: job["description"]=dt.get_text(separator=" ",strip=True)[:3500]
                st=ds.find("span",class_=re.compile("compensation"))
                if st: job["salary"]=st.get_text(strip=True)
                at=ds.find("span",class_=re.compile("num-applicants|applicant"))
                if at: job["applicantsCount"]=at.get_text(strip=True)
                text=d.text
                for pattern in [
                    r'(https://jobs\.lever\.co/[^"\'&\s<>]+)',
                    r'(https://boards\.greenhouse\.io/[^"\'&\s<>]+)',
                    r'(https://[a-zA-Z0-9-]+\.greenhouse\.io/[^"\'&\s<>]+)',
                    r'(https://[a-zA-Z0-9-]+\.myworkdayjobs\.com/[^"\'&\s<>]+)',
                    r'(https://[a-zA-Z0-9-]+\.icims\.com/[^"\'&\s<>]+)',
                    r'(https://app\.ashbyhq\.com/[^"\'&\s<>]+)',
                    r'(https://[a-zA-Z0-9-]+\.smartrecruiters\.com/[^"\'&\s<>]+)',
                ]:
                    m2=re.search(pattern,text)
                    if m2:
                        found=m2.group(1).rstrip('/"\'')
                        found=found.split("?")[0] if "lever.co" in found else found
                        job["applyUrl"]=found
                        print(f"[jobs] ✅ ATS URL in HTML: {found}")
                        break
        except: pass
    return jobs

def _norm(raw):
    desc=raw.get("description") or raw.get("descriptionText") or raw.get("jobDescription") or ""
    co=raw.get("companyName") or raw.get("company") or "Unknown"
    linkedin_url=raw.get("jobUrl") or raw.get("url") or "#"
    apply_url=(raw.get("applyUrl") or raw.get("externalApplyUrl") or
               raw.get("companyApplyUrl") or raw.get("applyLink") or
               raw.get("externalUrl") or "")
    if apply_url and "linkedin.com" in apply_url: apply_url=""
    jid=str(raw.get("id") or raw.get("jobId") or abs(hash(linkedin_url+str(raw.get("title","")))))
    return {
        "id":jid, "job_id":jid,
        "title":raw.get("title","Unknown"),"company":co,
        "location":raw.get("location",""),
        "salary":raw.get("salary") or raw.get("salaryRange") or "",
        "description":desc,
        "requirements":raw.get("requirements") or raw.get("jobRequirements") or "",
        "url":linkedin_url,
        "apply_url":apply_url,
        "posted":raw.get("publishedAt") or raw.get("postedAt") or "",
        "applicants":str(raw.get("applicantsCount") or raw.get("numApplicants") or ""),
        "job_type":raw.get("contractType") or raw.get("employmentType") or "",
        "ai_summary":"","ai_reqs":"","ai_engagement":"",
    }

# ══════════════════════════════════════════════════════════════════════════════
@router.post("/search")
def search_jobs(req: SearchRequest):
    raw=[]; source=""
    if _get("APIFY_API_KEY"):
        raw=_fetch_apify(req.keyword,req.location,req.company,req.date_filter)
        source="Apify LinkedIn Scraper"
    if not raw:
        try:
            raw=_fetch_guest(req.keyword,req.location,req.company,req.date_filter)
            source="LinkedIn Public API"
        except Exception as e:
            raise HTTPException(status_code=500,detail=f"Could not fetch jobs: {e}")
    if not raw: return {"success":True,"jobs":[],"source":source,"total":0}

    jobs=[_norm(r) for r in raw[:20]]
    for i,job in enumerate(jobs):
        jobs[i]=_ai_enrich(job)
        if not jobs[i].get("apply_url") or "linkedin.com" in (jobs[i].get("apply_url") or ""):
            jobs[i]["apply_url"]=_find_apply_url(
                job["title"], job["company"],
                job["url"], job.get("job_id","")
            )
        if not jobs[i].get("applicants") and not jobs[i].get("ai_engagement"):
            g=_google_engagement(job["title"],job["company"])
            if g: jobs[i]["ai_engagement"]=g

        print(f"[jobs] {job['company']} — apply_url: {jobs[i].get('apply_url','none')[:80]}")

    return {"success":True,"jobs":jobs,"source":source,"total":len(jobs)}

@router.get("/suggestions")
def get_suggestions(q: str="", type: str="keyword"):
    if not q or len(q)<2: return {"suggestions":[]}
    k=_get("GROQ_API_KEY")
    if not k: return {"suggestions":[]}
    prompts={
        "keyword":f'List 6 job titles similar to "{q}". Return ONLY JSON array of strings.',
        "location":f'List 6 job search locations similar to "{q}". Return ONLY JSON array of strings.',
        "company":f'List 6 company names similar to "{q}". Return ONLY JSON array of strings.',
    }
    try:
        r=_req.post("https://api.groq.com/openai/v1/chat/completions",
            headers={"Authorization":f"Bearer {k}","Content-Type":"application/json"},
            json={"model":"llama-3.1-8b-instant","messages":[{"role":"user","content":prompts.get(type,prompts["keyword"])}],"max_tokens":150,"temperature":0.3},timeout=8)
        raw=r.json()["choices"][0]["message"]["content"].strip()
        raw=re.sub(r"```(?:json)?","",raw).strip().rstrip("`").strip()
        s=json.loads(raw)
        if isinstance(s,list): return {"suggestions":[str(x) for x in s[:6]]}
    except: pass
    return {"suggestions":[]}

@router.post("/save")
def save_applied_job(req: SaveJobRequest):
    sb=_sb()
    if not sb: raise HTTPException(status_code=500,detail="Supabase not configured")
    print(f"[jobs/save] {req.company} — {req.title}")
    try:
        ex=sb.table("applied_jobs").select("id").eq("user_id",req.user_id).eq("title",req.title).eq("company",req.company).execute()
        if ex.data: return {"success":True,"message":"Already saved","already_exists":True}
    except: pass
    for attempt in [
        {"user_id":req.user_id,"company":req.company,"title":req.title,
         "description":(req.description or "")[:2000],"requirements":req.requirements or "",
         "salary":req.salary or "","job_type":req.job_type or "","location":req.location or "",
         "source_url":req.source_url or "","applicants":req.applicants or "","ai_summary":req.ai_summary or ""},
        {"user_id":req.user_id,"company":req.company,"title":req.title,
         "salary":req.salary or "","location":req.location or "","source_url":req.source_url or ""},
        {"user_id":req.user_id,"company":req.company,"title":req.title},
    ]:
        try:
            sb.table("applied_jobs").insert(attempt).execute()
            print(f"[jobs/save] ✅ {req.company}")
            return {"success":True,"message":f"Saved {req.title} at {req.company}"}
        except Exception as e:
            print(f"[jobs/save] attempt failed: {e}"); continue
    raise HTTPException(status_code=500,detail="Save failed — check Supabase RLS")

@router.get("/applied/{user_id}")
def get_applied_jobs(user_id: str):
    sb=_sb()
    if not sb: raise HTTPException(status_code=500,detail="Supabase not configured")
    try:
        res=sb.table("applied_jobs").select("*").eq("user_id",user_id).order("applied_at",desc=True).execute()
        return {"success":True,"data":res.data or [],"total":len(res.data or [])}
    except Exception as e:
        raise HTTPException(status_code=500,detail=str(e))

class MatchRequest(BaseModel):
    user_id: str
    job_title: str
    job_description: str

@router.post("/match")
def get_ats_match_score(req: MatchRequest):
    sb = _sb()
    if not sb: raise HTTPException(status_code=500, detail="Supabase not configured")

    # 1. Fetch user's resume URL from the database
    try:
        user_data = sb.table("users").select("resume_url").eq("id", req.user_id).single().execute()
        resume_url = user_data.data.get("resume_url")
        if not resume_url:
            return {"success": False, "message": "No resume found. Please upload your resume in the Settings tab."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

    # 2. Download and extract the text from the PDF
    try:
        pdf_response = _req.get(resume_url, timeout=10)
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(pdf_response.content))
        resume_text = ""
        for page in pdf_reader.pages:
            resume_text += page.extract_text() or ""
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not read PDF: {str(e)}")

    # 3. Ask Groq AI to act as an ATS System
    prompt = f"""
    You are an expert ATS (Applicant Tracking System).
    Compare the user's Resume to the Job Description.
    Return ONLY a valid JSON object. Do not include markdown or conversational text.
    Format exactly like this: {{"score": 85, "feedback": "Strong match in React, but missing AWS experience."}}

    Job Title: {req.job_title}
    Job Description: {req.job_description}

    Resume:
    {resume_text[:4000]}
    """

    k = _get("GROQ_API_KEY")
    if not k:
        raise HTTPException(status_code=500, detail="Groq API key not configured")

    try:
        r = _req.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={"Authorization": f"Bearer {k}", "Content-Type": "application/json"},
            json={
                "model": "llama-3.1-8b-instant",
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": 200,
                "temperature": 0.1,
            },
            timeout=15,
        )
        raw = r.json()["choices"][0]["message"]["content"].strip()
        raw = re.sub(r"```(?:json)?", "", raw).strip().rstrip("`").strip()
        data = json.loads(raw)
        return {
            "success": True,
            "score": data.get("score", 0),
            "feedback": data.get("feedback", ""),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI scoring error: {str(e)}")