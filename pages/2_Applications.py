import os, sys, json, re, time, requests
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(__file__)), "src"))

import streamlit as st
from auth import get_user_by_id, inject_gmail_env

st.set_page_config(
    page_title="CareerSync — Applications",
    page_icon="📋",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ══════════════════════════════════════════════════════════════════════════════
# AUTH GUARD
# ══════════════════════════════════════════════════════════════════════════════
def _restore():
    if st.session_state.get("user"): return True
    uid = st.query_params.get("uid", "")
    if uid:
        user = get_user_by_id(uid)
        if user:
            st.session_state["user"]    = user
            st.session_state["user_id"] = uid
            return True
    return False

def _logout():
    for k in ["user", "user_id"]: st.session_state.pop(k, None)
    st.query_params.clear()
    st.switch_page("app.py")

if not _restore():
    st.switch_page("app.py"); st.stop()

user = st.session_state["user"]
st.query_params["uid"] = user["id"]
inject_gmail_env(user)

# ══════════════════════════════════════════════════════════════════════════════
# CONFIG & KEYS
# ══════════════════════════════════════════════════════════════════════════════
def _get(key, default=""):
    try:
        val = st.secrets.get(key, "")
        if val: return val
    except Exception: pass
    return os.getenv(key, default)

GROQ_KEY    = _get("GROQ_API_KEY")
APIFY_KEY   = _get("APIFY_API_KEY")
GOOGLE_KEY  = _get("GOOGLE_API_KEY")
GOOGLE_CSE  = _get("GOOGLE_CSE_ID")
SUP_URL     = _get("SUPABASE_URL")
SUP_KEY     = _get("SUPABASE_KEY")

try:
    from supabase import create_client
    _sb = create_client(SUP_URL, SUP_KEY) if SUP_URL and SUP_KEY else None
except Exception:
    _sb = None

user_id = user["id"]

# ══════════════════════════════════════════════════════════════════════════════
# SIDEBAR
# ══════════════════════════════════════════════════════════════════════════════
with st.sidebar:
    st.markdown("""
    <style>
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap');
    @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap');
    [data-testid="stSidebar"]{background:#fff!important;border-right:1px solid #e2e8f0!important;}
    [data-testid="stSidebar"] .stButton>button{
      text-align:left!important;justify-content:flex-start!important;
      background:transparent!important;color:#475569!important;
      border:none!important;box-shadow:none!important;
      font-size:0.9rem!important;font-weight:500!important;
      padding:9px 12px!important;border-radius:8px!important;width:100%!important;
      font-family:'DM Sans',sans-serif!important;}
    [data-testid="stSidebar"] .stButton>button:hover{
      background:#f8fafc!important;color:#0f172a!important;}
    [data-testid="collapsedControl"]{display:none!important;}
    </style>
    """, unsafe_allow_html=True)

    name_disp  = user.get("name", "User")
    email_disp = user.get("email", "")
    avatar_let = name_disp[0].upper() if name_disp else "U"

    st.markdown(f"""
    <div style="padding:20px 16px 16px;display:flex;align-items:center;gap:10px;border-bottom:1px solid #f1f5f9;">
      <div style="width:32px;height:32px;background:#2563EB;border-radius:8px;display:flex;
                  align-items:center;justify-content:center;flex-shrink:0;">
        <span style="font-family:'Material Symbols Outlined';font-size:17px;color:#fff;
                     font-variation-settings:'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24;line-height:1;">sync_alt</span>
      </div>
      <span style="font-size:1.1rem;font-weight:700;color:#0f172a;font-family:'DM Sans',sans-serif;">CareerSync</span>
    </div>
    <div style="padding:12px 12px 8px;">
    """, unsafe_allow_html=True)

    nav_pages = [
        ("dashboard",  "Dashboard",        "pages/1_Dashboard.py"),
        ("work",       "Applications",     "pages/2_Applications.py"),
        ("mail",       "Cold Email",       "pages/3_Cold_Email.py"),
        ("plumbing",   "Research Pipeline","pages/4_Pipeline.py"),
        ("settings",   "Settings",         "pages/5_Settings.py"),
    ]
    for icon, label, path in nav_pages:
        is_active = (label == "Applications")
        if is_active:
            st.markdown(f"""
            <div style="display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:8px;
                        background:rgba(37,99,235,0.08);color:#2563EB;font-weight:600;font-size:0.9rem;
                        font-family:'DM Sans',sans-serif;margin-bottom:2px;">
              <span style="font-family:'Material Symbols Outlined';font-size:20px;
                           font-variation-settings:'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 24;line-height:1;">{icon}</span>
              {label}
            </div>""", unsafe_allow_html=True)
        else:
            st.markdown(f"""
            <div style="display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:8px;
                        color:#64748b;font-size:0.9rem;font-weight:500;font-family:'DM Sans',sans-serif;">
              <span style="font-family:'Material Symbols Outlined';font-size:20px;
                           font-variation-settings:'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24;line-height:1;">{icon}</span>
              {label}
            </div>""", unsafe_allow_html=True)
            if st.button(label, key=f"nav_{label}"):
                try: st.switch_page(path)
                except: st.info(f"{label} coming soon!")

    st.markdown("</div>", unsafe_allow_html=True)
    st.markdown("<div style='height:1px;background:#f1f5f9;margin:8px 0;'></div>", unsafe_allow_html=True)

    st.markdown(f"""
    <div style="padding:8px 16px 12px;">
      <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;background:#f8fafc;">
        <div style="width:36px;height:36px;border-radius:50%;background:#e0e7ff;display:flex;align-items:center;
                    justify-content:center;font-weight:700;color:#3730a3;font-size:0.875rem;flex-shrink:0;">{avatar_let}</div>
        <div style="min-width:0;">
          <div style="font-size:0.85rem;font-weight:600;color:#0f172a;font-family:'DM Sans',sans-serif;
                      overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">{name_disp}</div>
          <div style="font-size:0.7rem;color:#64748b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">{email_disp}</div>
        </div>
      </div>
    </div>
    """, unsafe_allow_html=True)

    if st.button("🚪  Logout", key="sidebar_logout", use_container_width=True):
        _logout()

# ══════════════════════════════════════════════════════════════════════════════
# GLOBAL CSS
# ══════════════════════════════════════════════════════════════════════════════
st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap');
*,*::before,*::after{box-sizing:border-box;}
html,body,.stApp,[data-testid="stAppViewContainer"],section.main,[data-testid="stMain"]{
  background:#f8fafc!important;font-family:'DM Sans',sans-serif!important;color:#0f172a!important;}
.block-container{padding-top:1.5rem!important;padding-bottom:3rem!important;max-width:1280px!important;}

/* ══ JOB CARD — full detail layout ══ */
.jc{
  background:#fff;border:1px solid #e2e8f0;border-radius:18px;
  padding:0;overflow:hidden;
  box-shadow:0 1px 4px rgba(0,0,0,0.05);
  transition:box-shadow 0.15s,transform 0.12s;
  margin-bottom:18px;
}
.jc:hover{box-shadow:0 8px 28px rgba(0,0,0,0.09);transform:translateY(-2px);}

/* Card header strip */
.jc-header{
  padding:20px 24px 16px;
  border-bottom:1px solid #f1f5f9;
  display:flex;justify-content:space-between;align-items:flex-start;gap:16px;
}
.jc-header-left{flex:1;min-width:0;}
.jc-company-row{
  display:flex;align-items:center;gap:8px;margin-bottom:6px;
}
.jc-company-logo{
  width:38px;height:38px;border-radius:10px;
  background:linear-gradient(135deg,#eff6ff,#dbeafe);
  border:1px solid #bfdbfe;
  display:flex;align-items:center;justify-content:center;
  font-size:0.85rem;font-weight:800;color:#2563EB;flex-shrink:0;
}
.jc-company-name{
  font-size:0.78rem;font-weight:700;color:#2563EB;
  text-transform:uppercase;letter-spacing:0.7px;
}
.jc-title{
  font-size:1.12rem;font-weight:700;color:#0f172a;line-height:1.3;margin-bottom:10px;
}
.jc-location{
  display:inline-flex;align-items:center;gap:5px;
  font-size:0.8rem;color:#64748b;font-weight:500;
}
.jc-location .mi{
  font-family:'Material Symbols Outlined';font-size:15px;
  font-variation-settings:'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24;
  line-height:1;color:#94a3b8;
}

/* Pills */
.pill-row{display:flex;flex-wrap:wrap;gap:7px;margin-top:10px;}
.pill{
  display:inline-flex;align-items:center;gap:4px;
  padding:4px 12px;border-radius:9999px;
  font-size:0.72rem;font-weight:700;white-space:nowrap;
  letter-spacing:0.2px;
}
.pill-applied  {background:#dcfce7;color:#15803d;}
.pill-salary   {background:#fef3c7;color:#92400e;border:1px solid #fde68a;}
.pill-views    {background:#ede9fe;color:#6d28d9;border:1px solid #ddd6fe;}
.pill-posted   {background:#f0f9ff;color:#0369a1;border:1px solid #bae6fd;}
.pill-type     {background:#f1f5f9;color:#475569;border:1px solid #e2e8f0;}
.pill-apps     {background:#fff7ed;color:#c2410c;border:1px solid #fed7aa;}

/* Card body */
.jc-body{padding:20px 24px;}

/* Section rows inside body */
.jc-section{margin-bottom:16px;}
.jc-section:last-child{margin-bottom:0;}
.jc-section-label{
  font-size:0.68rem;font-weight:700;color:#94a3b8;
  text-transform:uppercase;letter-spacing:0.8px;
  margin-bottom:6px;display:flex;align-items:center;gap:5px;
}
.jc-section-label .mi{
  font-family:'Material Symbols Outlined';font-size:14px;
  font-variation-settings:'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24;
  line-height:1;
}
.jc-summary{
  font-size:0.875rem;color:#334155;line-height:1.7;
  background:#f8fafc;border-radius:10px;padding:12px 16px;
  border-left:3px solid #93c5fd;
}
.jc-reqs{
  font-size:0.83rem;color:#334155;line-height:1.8;
  background:#f0fdf4;border-radius:10px;padding:12px 16px;
  border-left:3px solid #86efac;
}
.jc-reqs-item{
  display:flex;align-items:flex-start;gap:8px;margin-bottom:3px;
  font-size:0.83rem;color:#334155;
}
.jc-reqs-bullet{
  width:6px;height:6px;border-radius:50%;background:#22c55e;
  flex-shrink:0;margin-top:7px;
}
.jc-salary-box{
  display:inline-flex;align-items:center;gap:8px;
  background:#fffbeb;border:1px solid #fde68a;border-radius:10px;
  padding:10px 16px;
}
.jc-salary-val{font-size:1rem;font-weight:700;color:#92400e;}
.jc-na{font-size:0.8rem;color:#cbd5e1;font-style:italic;}

/* Stats bar */
.jc-stats-row{
  display:flex;gap:20px;padding:14px 24px;
  background:#fafbfc;border-top:1px solid #f1f5f9;
  flex-wrap:wrap;
}
.jc-stat{
  display:flex;align-items:center;gap:6px;
  font-size:0.8rem;color:#64748b;font-weight:500;
}
.jc-stat .mi{
  font-family:'Material Symbols Outlined';font-size:16px;
  font-variation-settings:'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24;
  line-height:1;color:#94a3b8;
}
.jc-stat-val{font-weight:700;color:#334155;}

/* Card footer — action bar */
.jc-footer{
  padding:16px 24px;border-top:1px solid #f1f5f9;
  display:flex;align-items:center;gap:12px;flex-wrap:wrap;
}

/* ══ SEARCH PANEL ══ */
.search-panel{
  background:#fff;border:1px solid #e2e8f0;border-radius:16px;
  padding:24px 28px;margin-bottom:22px;box-shadow:0 1px 4px rgba(0,0,0,0.04);
}
.search-panel-title{
  font-size:0.78rem;font-weight:700;color:#0f172a;
  text-transform:uppercase;letter-spacing:0.8px;margin-bottom:16px;
  display:flex;align-items:center;gap:6px;
}

/* ══ APPLIED TABLE ══ */
.at-wrap{
  background:#fff;border:1px solid #e2e8f0;border-radius:18px;
  overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.04);
}
.at-table{width:100%;border-collapse:collapse;}
.at-table th{
  background:#f8fafc;color:#64748b;font-weight:700;font-size:0.68rem;
  text-transform:uppercase;letter-spacing:0.7px;padding:14px 18px;
  border-bottom:2px solid #e2e8f0;text-align:left;white-space:nowrap;
}
.at-table td{
  padding:16px 18px;border-bottom:1px solid #f1f5f9;
  vertical-align:top;color:#334155;font-size:0.83rem;
}
.at-table tr:last-child td{border-bottom:none;}
.at-table tr:hover td{background:#f8fafc;}

/* Company cell */
.at-co{display:flex;align-items:center;gap:10px;}
.at-logo{
  width:36px;height:36px;border-radius:10px;
  background:linear-gradient(135deg,#eff6ff,#dbeafe);
  border:1px solid #bfdbfe;
  display:flex;align-items:center;justify-content:center;
  font-size:0.82rem;font-weight:800;color:#2563EB;flex-shrink:0;
}
.at-co-name{font-weight:700;color:#0f172a;font-size:0.875rem;}
.at-co-loc{font-size:0.73rem;color:#64748b;margin-top:2px;}

/* Role cell */
.at-role-title{font-weight:700;color:#0f172a;font-size:0.875rem;margin-bottom:4px;}
.at-role-badges{display:flex;gap:5px;flex-wrap:wrap;margin-top:4px;}

/* Description / Requirements cells */
.at-desc{
  font-size:0.78rem;color:#475569;line-height:1.6;
  display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;
  max-width:220px;
}
.at-req{
  font-size:0.75rem;color:#334155;line-height:1.6;
  display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden;
  max-width:200px;
  background:#f0fdf4;border-radius:8px;padding:8px 10px;border-left:2px solid #86efac;
}

/* Salary cell */
.at-salary{
  font-size:0.85rem;font-weight:700;color:#92400e;
  background:#fffbeb;border:1px solid #fde68a;
  border-radius:8px;padding:5px 10px;display:inline-block;white-space:nowrap;
}
.at-salary-na{font-size:0.78rem;color:#cbd5e1;font-style:italic;}

/* URL cell */
.at-url{
  color:#2563EB;font-weight:700;font-size:0.78rem;
  text-decoration:none;display:inline-flex;align-items:center;gap:4px;
  background:#eff6ff;border:1px solid #bfdbfe;border-radius:7px;
  padding:5px 10px;white-space:nowrap;transition:background 0.15s;
}
.at-url:hover{background:#dbeafe;}

/* Timestamp cell */
.at-ts{
  font-size:0.75rem;color:#64748b;white-space:nowrap;
  background:#f8fafc;border-radius:6px;padding:4px 8px;
  border:1px solid #e2e8f0;display:inline-block;
}

/* ══ STAT MINI ══ */
.stat-mini{
  background:#fff;border:1px solid #e2e8f0;border-radius:14px;
  padding:20px;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,0.04);
}
.stat-mini-val{font-size:2rem;font-weight:700;line-height:1;}
.stat-mini-lbl{
  font-size:0.68rem;color:#64748b;font-weight:700;
  text-transform:uppercase;letter-spacing:0.7px;margin-top:5px;
}

/* ══ EMPTY STATE ══ */
.empty-state{text-align:center;padding:72px 0;color:#94a3b8;}
.empty-state-icon{font-size:3rem;margin-bottom:14px;}
.empty-state-title{font-size:1.05rem;font-weight:600;color:#64748b;}
.empty-state-sub{font-size:0.85rem;margin-top:8px;}

/* ══ STREAMLIT OVERRIDES ══ */
div.stButton>button{
  background:#fff!important;color:#475569!important;border:1px solid #e2e8f0!important;
  border-radius:8px!important;font-weight:600!important;font-size:0.85rem!important;
  font-family:'DM Sans',sans-serif!important;padding:8px 14px!important;transition:all 0.15s!important;}
div.stButton>button:hover{background:#f8fafc!important;border-color:#cbd5e1!important;}
div.stButton>button[kind="primary"]{
  background:#2563EB!important;color:#fff!important;
  border-color:#2563EB!important;box-shadow:0 2px 8px rgba(37,99,235,0.25)!important;}
div.stButton>button[kind="primary"]:hover{background:#1d4ed8!important;}
div[data-testid="stTextInput"] input{
  background:#fff!important;border:1px solid #e2e8f0!important;border-radius:8px!important;}
div[data-testid="stSelectbox"] div[data-baseweb="select"]>div{
  background:#fff!important;border:1px solid #e2e8f0!important;border-radius:8px!important;}
.stAlert{border-radius:10px!important;}
a.stLinkButton{
  background:#fff!important;color:#2563EB!important;border:1px solid #bfdbfe!important;
  border-radius:8px!important;font-weight:600!important;font-size:0.85rem!important;
  font-family:'DM Sans',sans-serif!important;transition:all 0.15s!important;
  text-decoration:none!important;}
a.stLinkButton:hover{background:#eff6ff!important;}
</style>
""", unsafe_allow_html=True)

# ══════════════════════════════════════════════════════════════════════════════
# SESSION STATE
# ══════════════════════════════════════════════════════════════════════════════
for k, v in [("app_view","browse"),("job_results",[]),("applied_jobs",{}),("ai_data",{})]:
    if k not in st.session_state: st.session_state[k] = v

# ══════════════════════════════════════════════════════════════════════════════
# CORE HELPERS
# ══════════════════════════════════════════════════════════════════════════════
def _groq(prompt: str, max_tokens: int = 300) -> str:
    if not GROQ_KEY: return ""
    try:
        r = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={"Authorization": f"Bearer {GROQ_KEY}", "Content-Type": "application/json"},
            json={"model":"llama-3.1-8b-instant",
                  "messages":[{"role":"user","content":prompt}],
                  "max_tokens":max_tokens,"temperature":0.3},
            timeout=15)
        return r.json()["choices"][0]["message"]["content"].strip()
    except Exception:
        return ""


def _google_job_clicks(title: str, company: str) -> str:
    """
    Use Google Custom Search API to estimate engagement/click interest.
    Returns a formatted views-like string or empty string.
    """
    if not GOOGLE_KEY or not GOOGLE_CSE:
        return ""
    try:
        query = f"{title} {company} job"
        r = requests.get(
            "https://www.googleapis.com/customsearch/v1",
            params={"key": GOOGLE_KEY, "cx": GOOGLE_CSE, "q": query, "num": 1},
            timeout=8
        )
        data = r.json()
        total = data.get("searchInformation", {}).get("totalResults", "")
        if total and int(total) > 0:
            t = int(total)
            if t >= 1_000_000:
                return f"{t//1_000_000}M+ searches"
            elif t >= 1_000:
                return f"{t//1_000}K+ searches"
            else:
                return f"{t} searches"
    except Exception:
        pass
    return ""


def _ai_enrich(job: dict) -> dict:
    """
    Use Groq to extract:
    - 2-3 sentence AI summary
    - requirements bullet list (4-6 items)
    - salary (if parseable)
    - job_type
    Always fills every field even if scraping was sparse.
    """
    title   = job.get("title","")
    company = job.get("company","")
    desc    = job.get("description","")[:3000]
    reqs    = job.get("requirements","")[:1200]

    # Build prompt — use everything available
    combined = f"Job Title: {title}\nCompany: {company}\n"
    if desc:  combined += f"\nFull Description:\n{desc}"
    if reqs:  combined += f"\n\nRequirements Section:\n{reqs}"

    if not desc and not reqs:
        # No content at all — generate from title/company alone
        combined += "\n(No description provided — generate a realistic summary based on the role title.)"

    prompt = f"""{combined}

Based on the above, return ONLY a JSON object with exactly these keys:
{{
  "summary": "2-3 sentence summary: what the role involves, what kind of team/company, and who would thrive here",
  "requirements": "exactly 5 key requirements as bullet points, each on its own line starting with •",
  "salary": "salary range as string if mentioned or inferrable from role level, else empty string",
  "job_type": "Full-time / Part-time / Contract / Internship / Freelance based on clues, else 'Full-time'",
  "engagement": "estimated number of applicants or interest level as short string, e.g. '200+ applicants' or 'High demand role', based on role seniority and company size"
}}
Return ONLY the JSON. No markdown fences. No explanation."""

    raw = _groq(prompt, max_tokens=500)
    try:
        raw = re.sub(r"```(?:json)?", "", raw).strip().rstrip("```").strip()
        data = json.loads(raw)
        job["ai_summary"]   = data.get("summary", "")
        job["ai_reqs"]      = data.get("requirements", "")
        job["ai_engagement"]= data.get("engagement", "")
        if not job.get("salary"):
            job["salary"]   = data.get("salary", "")
        if not job.get("job_type") or job["job_type"] == "":
            job["job_type"] = data.get("job_type", "Full-time")
    except Exception:
        job["ai_summary"]   = _groq(
            f"Summarise this job in 2 sentences:\nTitle:{title}\nCompany:{company}\n{desc[:600]}",
            max_tokens=150)
        job["ai_reqs"]      = reqs[:500] if reqs else f"• Experience in {title}-related field\n• Strong communication skills\n• Problem-solving ability\n• Team collaboration\n• Relevant degree or equivalent"
        job["ai_engagement"]= ""

    # Supplement engagement with Google searches if available
    if not job.get("applicants") and not job.get("ai_engagement"):
        google_val = _google_job_clicks(title, company)
        if google_val:
            job["ai_engagement"] = google_val

    return job


# ── SOURCE 1: Apify LinkedIn Jobs Scraper ─────────────────────────────────────
def _fetch_apify(keyword: str, location: str, company: str,
                 date_filter: str) -> list[dict]:
    if not APIFY_KEY:
        return []

    date_map = {
        "Any time":      "",
        "Last 24 hours": "r86400",
        "Past week":     "r604800",
        "Past month":    "r2592000",
    }

    search_kw = keyword.strip()
    if company.strip(): search_kw = f"{company.strip()} {search_kw}".strip()

    input_data = {
        "title":        search_kw,
        "location":     location.strip() or "United States",
        "rows":         25,
        "scrapeCompany": True,
        "proxy":        {"useApifyProxy": True},
    }
    if date_map.get(date_filter):
        input_data["publishedAt"] = date_map[date_filter]

    try:
        run_url = "https://api.apify.com/v2/acts/bebity~linkedin-jobs-scraper/run-sync-get-dataset-items"
        resp = requests.post(
            run_url,
            params={"token": APIFY_KEY, "timeout": 90, "memory": 512},
            json=input_data,
            timeout=100
        )
        if resp.status_code == 200:
            items = resp.json()
            if isinstance(items, list): return items
    except Exception:
        pass
    return []


# ── SOURCE 2: LinkedIn Guest API ─────────────────────────────────────────────
def _fetch_linkedin_guest(keyword: str, location: str, company: str,
                          date_filter: str) -> list[dict]:
    from bs4 import BeautifulSoup

    date_map = {"Any time":"","Last 24 hours":"r86400","Past week":"r604800","Past month":"r2592000"}
    f_tpr = date_map.get(date_filter, "")

    search_kw = keyword.strip()
    if company.strip(): search_kw = f"{search_kw} {company.strip()}".strip()
    if not search_kw: return []

    SEARCH = "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search"
    DETAIL = "https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/{job_id}"
    hdrs = {
        "User-Agent": ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                       "AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36"),
        "Accept-Language": "en-US,en;q=0.9",
    }
    params = {"keywords": search_kw, "location": location.strip(),
              "start": 0, "count": 25}
    if f_tpr: params["f_TPR"] = f_tpr

    try:
        resp = requests.get(SEARCH, params=params, headers=hdrs, timeout=20)
        if resp.status_code != 200: return []
    except Exception:
        return []

    soup = BeautifulSoup(resp.text, "html.parser")
    cards = soup.find_all("li")
    jobs = []

    for card in cards[:20]:
        try:
            entity = card.find("div", {"data-entity-urn": True})
            job_id = ""
            if entity:
                job_id = entity.get("data-entity-urn","").split(":")[-1]
            if not job_id:
                link_tag = card.find("a", href=re.compile(r"/jobs/view/(\d+)"))
                if link_tag:
                    m = re.search(r"/jobs/view/(\d+)", link_tag["href"])
                    if m: job_id = m.group(1)
            if not job_id: continue

            title_tag   = card.find("h3") or card.find("span",class_=re.compile("title"))
            company_tag = card.find("h4") or card.find("a",class_=re.compile("hidden-nested-link"))
            loc_tag     = card.find("span",class_=re.compile("job-search-card__location"))
            time_tag    = card.find("time")
            link_a      = card.find("a", href=re.compile(r"linkedin\.com/jobs"))

            job_url = (link_a["href"].split("?")[0] if link_a
                       else f"https://www.linkedin.com/jobs/view/{job_id}")

            j = {
                "id":          job_id,
                "title":       title_tag.get_text(strip=True) if title_tag else "Unknown Role",
                "companyName": company_tag.get_text(strip=True) if company_tag else "Unknown Company",
                "location":    loc_tag.get_text(strip=True) if loc_tag else "",
                "publishedAt": time_tag.get("datetime","") if time_tag else "",
                "jobUrl":      job_url,
                "description": "", "salary": "", "applicantsCount": "", "requirements": "",
            }
            jobs.append(j)
        except Exception:
            continue

    # Fetch descriptions for top 15
    for job in jobs[:15]:
        try:
            det = requests.get(DETAIL.format(job_id=job["id"]), headers=hdrs, timeout=10)
            if det.status_code == 200:
                ds = BeautifulSoup(det.text, "html.parser")
                desc_tag = (ds.find("div", class_=re.compile("description__text")) or
                            ds.find("div", class_=re.compile("show-more-less-html")))
                if desc_tag:
                    job["description"] = desc_tag.get_text(separator=" ", strip=True)[:3500]
                sal_tag = ds.find("span", class_=re.compile("compensation"))
                if sal_tag: job["salary"] = sal_tag.get_text(strip=True)
                app_tag = ds.find("span", class_=re.compile("num-applicants|applicant"))
                if app_tag: job["applicantsCount"] = app_tag.get_text(strip=True)
                views_tag = ds.find("span", class_=re.compile("views|impression"))
                if views_tag: job["views"] = views_tag.get_text(strip=True)
        except Exception:
            pass

    return jobs


# ── NORMALISE raw → standard dict ────────────────────────────────────────────
def _normalise(raw: dict) -> dict:
    desc = (raw.get("description") or raw.get("descriptionText") or
            raw.get("jobDescription") or "")
    company = (raw.get("companyName") or raw.get("company") or "Unknown Company")
    url = (raw.get("jobUrl") or raw.get("url") or raw.get("applyUrl") or "#")
    job_id = str(raw.get("id") or raw.get("jobId") or
                 abs(hash(url + str(raw.get("title","")))))
    applicants = str(raw.get("applicantsCount") or raw.get("numApplicants") or "")
    views = str(raw.get("views") or raw.get("impressions") or raw.get("clicks") or "")
    return {
        "id":           job_id,
        "title":        raw.get("title","Unknown Role"),
        "company":      company,
        "location":     raw.get("location",""),
        "salary":       (raw.get("salary") or raw.get("salaryRange") or ""),
        "description":  desc,
        "requirements": (raw.get("requirements") or raw.get("jobRequirements") or ""),
        "url":          url,
        "posted":       (raw.get("publishedAt") or raw.get("postedAt") or raw.get("posted_date") or ""),
        "applicants":   applicants,
        "views":        views,
        "job_type":     (raw.get("contractType") or raw.get("employmentType") or ""),
        "company_url":  raw.get("companyUrl",""),
        "logo_url":     raw.get("companyLogo",""),
        "ai_summary":   "",
        "ai_reqs":      "",
        "ai_engagement":"",
    }


# ── FETCH + ENRICH pipeline ───────────────────────────────────────────────────
def fetch_and_enrich(keyword, location, company, date_filter) -> tuple[list, str]:
    raw = []
    source = ""

    if APIFY_KEY:
        raw = _fetch_apify(keyword, location, company, date_filter)
        if raw: source = "Apify LinkedIn Scraper"

    if not raw:
        try:
            raw = _fetch_linkedin_guest(keyword, location, company, date_filter)
            if raw: source = "LinkedIn Public API"
        except Exception as e:
            return [], f"Could not fetch jobs: {e}"

    if not raw:
        return [], "No jobs found. Try a broader keyword or different location."

    jobs = [_normalise(r) for r in raw[:20]]

    for i, job in enumerate(jobs):
        jobs[i] = _ai_enrich(job)

    return jobs, ""


# ── DB helpers ────────────────────────────────────────────────────────────────
def _save_applied(job: dict) -> bool:
    if not _sb: return False
    try:
        _sb.table("applied_jobs").insert({
            "user_id":      user_id,
            "company":      job.get("company",""),
            "title":        job.get("title",""),
            "description":  job.get("description","")[:2000],
            "requirements": job.get("ai_reqs") or job.get("requirements",""),
            "salary":       job.get("salary",""),
            "job_type":     job.get("job_type",""),
            "location":     job.get("location",""),
            "source_url":   job.get("url",""),
            "applicants":   job.get("applicants",""),
            "views":        job.get("views",""),
            "ai_summary":   job.get("ai_summary",""),
            "ai_engagement":job.get("ai_engagement",""),
        }).execute()
        return True
    except Exception:
        return False


def _load_applied() -> list[dict]:
    if not _sb: return []
    try:
        res = (_sb.table("applied_jobs")
               .select("*")
               .eq("user_id", user_id)
               .order("applied_at", desc=True)
               .execute())
        return res.data or []
    except Exception:
        return []


# ── Helper: parse requirements into clean bullet list ─────────────────────────
def _parse_reqs(reqs_str: str) -> list[str]:
    """Split requirement string into individual items."""
    if not reqs_str: return []
    items = []
    for line in reqs_str.replace("• ", "\n• ").split("\n"):
        line = line.strip().lstrip("•").lstrip("-").lstrip("*").strip()
        if line and len(line) > 5:
            items.append(line)
    return items[:6]


# ── Helper: format engagement metric ─────────────────────────────────────────
def _engagement(job: dict) -> str:
    """Return best available engagement/views/clicks metric."""
    if job.get("applicants") and job["applicants"] not in ("", "0"):
        return f"👥 {job['applicants']}"
    if job.get("views") and job["views"] not in ("", "0"):
        return f"👁️ {job['views']} views"
    if job.get("ai_engagement"):
        return f"📊 {job['ai_engagement']}"
    return ""


# ══════════════════════════════════════════════════════════════════════════════
# PAGE HEADER + TOGGLE
# ══════════════════════════════════════════════════════════════════════════════
st.markdown(
    "<h2 style='font-size:1.5rem;font-weight:700;color:#0f172a;margin-bottom:4px;'>Job Applications</h2>"
    "<p style='font-size:0.875rem;color:#64748b;margin-bottom:20px;'>"
    "Live LinkedIn jobs · AI-powered summaries & requirements · Full engagement metrics · Track every application.</p>",
    unsafe_allow_html=True)

c_browse, c_applied, _ = st.columns([1.1, 1.1, 6])
with c_browse:
    if st.button("🔍  Browse Jobs",
                 type="primary" if st.session_state.app_view=="browse" else "secondary",
                 use_container_width=True, key="btn_browse"):
        st.session_state.app_view = "browse"; st.rerun()
with c_applied:
    if st.button("📋  Applied Jobs",
                 type="primary" if st.session_state.app_view=="applied" else "secondary",
                 use_container_width=True, key="btn_applied"):
        st.session_state.app_view = "applied"; st.rerun()

st.markdown("<div style='height:8px'></div>", unsafe_allow_html=True)


# ══════════════════════════════════════════════════════════════════════════════
# ══  VIEW A: BROWSE JOBS
# ══════════════════════════════════════════════════════════════════════════════
if st.session_state.app_view == "browse":

    # ── Search Panel ────────────────────────────────────────────────────────
    st.markdown('<div class="search-panel">', unsafe_allow_html=True)
    st.markdown('<div class="search-panel-title">🔍 Search LinkedIn Jobs</div>', unsafe_allow_html=True)
    f1, f2, f3, f4 = st.columns([3, 2, 2, 2])
    with f1: kw        = st.text_input("Role", placeholder="e.g. Data Scientist, Product Manager", key="jb_kw", label_visibility="collapsed")
    with f2: company_q = st.text_input("Company", placeholder="e.g. Google, Amazon", key="jb_co", label_visibility="collapsed")
    with f3: location_q= st.text_input("Location", placeholder="e.g. New York, Remote", key="jb_loc", label_visibility="collapsed")
    with f4: date_f    = st.selectbox("Posted", ["Any time","Last 24 hours","Past week","Past month"], key="jb_date", label_visibility="collapsed")
    st.markdown("</div>", unsafe_allow_html=True)

    _, btn_col, _ = st.columns([4, 2, 4])
    with btn_col:
        search_clicked = st.button("🚀  Search Jobs", type="primary", use_container_width=True, key="jb_search")

    if search_clicked:
        if not kw.strip() and not company_q.strip():
            st.warning("⚠️ Please enter a job title or company name.")
        else:
            with st.status("🔎 Fetching live LinkedIn jobs & generating AI insights…", expanded=True) as status:
                st.write("⏳ Connecting to job data sources…")
                jobs, err = fetch_and_enrich(kw, location_q, company_q, date_f)
                if err:
                    status.update(label=f"❌ {err}", state="error")
                    st.session_state.job_results = []
                else:
                    st.write(f"✅ Found {len(jobs)} jobs")
                    st.write("🤖 AI extracted summaries, requirements, salary & engagement data")
                    st.session_state.job_results = jobs
                    status.update(label=f"✅ {len(jobs)} jobs ready with full AI analysis!", state="complete")

    # ── Results ─────────────────────────────────────────────────────────────
    jobs = st.session_state.get("job_results", [])

    if not jobs:
        st.markdown("""
        <div class="empty-state">
          <div class="empty-state-icon">🎯</div>
          <div class="empty-state-title">Search for jobs above</div>
          <div class="empty-state-sub">Live LinkedIn results · AI summaries · Full requirements · Salary · Engagement metrics</div>
        </div>""", unsafe_allow_html=True)
    else:
        st.markdown(
            f"<div style='font-size:0.875rem;color:#64748b;margin-bottom:20px;'>"
            f"Showing <strong>{len(jobs)}</strong> live results with full AI analysis · "
            f"<span style='color:#2563EB;font-weight:600;font-size:0.78rem;'>Click Apply Now to track</span></div>",
            unsafe_allow_html=True)

        for job in jobs:
            jid = str(job["id"])
            already_applied = jid in st.session_state.applied_jobs

            # Prepare data
            company_letter = (job["company"][0].upper() if job.get("company") else "?")
            location_html  = (f'<span class="jc-location"><span class="mi">location_on</span>{job["location"]}</span>'
                              if job.get("location") else "")

            # Pills row
            pills = []
            if already_applied:
                pills.append('<span class="pill pill-applied">✅ Applied</span>')
            if job.get("job_type"):
                pills.append(f'<span class="pill pill-type">{job["job_type"]}</span>')
            if job.get("posted"):
                pills.append(f'<span class="pill pill-posted">🕐 {str(job["posted"])[:10]}</span>')
            pills_html = "".join(pills)

            # Summary
            summary = job.get("ai_summary","") or job.get("description","")[:300] or "No description available."

            # Requirements — parse into bullets
            raw_reqs  = job.get("ai_reqs","") or job.get("requirements","")
            req_items = _parse_reqs(raw_reqs)
            if req_items:
                reqs_inner = "".join(
                    f'<div class="jc-reqs-item"><div class="jc-reqs-bullet"></div><div>{r}</div></div>'
                    for r in req_items
                )
                reqs_block = (
                    '<div class="jc-section">'
                    '<div class="jc-section-label"><span class="mi">checklist</span>Requirements &amp; Qualifications</div>'
                    f'<div class="jc-reqs">{reqs_inner}</div>'
                    '</div>'
                )
            else:
                reqs_block = ""

            # Salary
            salary_val = job.get("salary","")
            if salary_val:
                salary_block = (
                    '<div class="jc-section">'
                    '<div class="jc-section-label"><span class="mi">payments</span>Salary</div>'
                    f'<div class="jc-salary-box"><span style="font-family:\'Material Symbols Outlined\';font-size:18px;color:#d97706;font-variation-settings:\'FILL\' 0,\'wght\' 400,\'GRAD\' 0,\'opsz\' 24;line-height:1;">monetization_on</span>'
                    f'<span class="jc-salary-val">{salary_val}</span></div>'
                    '</div>'
                )
            else:
                salary_block = (
                    '<div class="jc-section">'
                    '<div class="jc-section-label"><span class="mi">payments</span>Salary</div>'
                    '<span class="jc-na">Not specified — may be discussed at interview</span>'
                    '</div>'
                )

            # Engagement metric
            engagement = _engagement(job)
            engagement_stat = (
                f'<div class="jc-stat"><span class="mi">bar_chart</span>'
                f'<span>Engagement:</span><span class="jc-stat-val">&nbsp;{engagement}</span></div>'
            ) if engagement else ""

            # Build stats bar items BEFORE the f-string to avoid nested ternary rendering bugs
            posted_stat = ""
            if job.get("posted"):
                posted_stat = f'<div class="jc-stat"><span class="mi">schedule</span><span>Posted:</span><span class="jc-stat-val">&nbsp;{str(job["posted"])[:10]}</span></div>'

            type_stat = ""
            if job.get("job_type"):
                type_stat = f'<div class="jc-stat"><span class="mi">work</span><span>Type:</span><span class="jc-stat-val">&nbsp;{job["job_type"]}</span></div>'

            loc_stat = ""
            if job.get("location"):
                loc_stat = f'<div class="jc-stat"><span class="mi">place</span><span>Location:</span><span class="jc-stat-val">&nbsp;{job["location"]}</span></div>'

            # Full card HTML — all variables pre-built, no inline ternaries
            card_html = (
                '<div class="jc">'
                '<div class="jc-header">'
                '<div class="jc-header-left">'
                '<div class="jc-company-row">'
                f'<div class="jc-company-logo">{company_letter}</div>'
                '<div>'
                f'<div class="jc-company-name">{job["company"]}</div>'
                f'{location_html}'
                '</div>'
                '</div>'
                f'<div class="jc-title">{job["title"]}</div>'
                f'<div class="pill-row">{pills_html}</div>'
                '</div>'
                '</div>'
                '<div class="jc-body">'
                '<div class="jc-section">'
                '<div class="jc-section-label"><span class="mi">auto_awesome</span>AI Summary</div>'
                f'<div class="jc-summary">{summary}</div>'
                '</div>'
                f'{reqs_block}'
                f'{salary_block}'
                '</div>'
                '<div class="jc-stats-row">'
                f'{engagement_stat}'
                f'{posted_stat}'
                f'{type_stat}'
                f'{loc_stat}'
                '</div>'
                '</div>'
            )
            st.markdown(card_html, unsafe_allow_html=True)

            # Action row under the card — Streamlit native buttons
            a1, a2, a3 = st.columns([2, 2, 6])
            with a1:
                if job.get("url") and job["url"] != "#":
                    st.link_button("🔗 View on LinkedIn", job["url"], use_container_width=True)
            with a2:
                if already_applied:
                    st.button("✅ Applied", key=f"apply_{jid}", disabled=True, use_container_width=True)
                else:
                    if st.button("🚀 Apply Now", key=f"apply_{jid}", type="primary", use_container_width=True):
                        _save_applied(job)
                        st.session_state.applied_jobs[jid] = job
                        st.success(f"✅ Saved **{job['title']}** at **{job['company']}**!")
                        st.rerun()

            st.markdown("<div style='height:4px'></div>", unsafe_allow_html=True)


# ══════════════════════════════════════════════════════════════════════════════
# ══  VIEW B: APPLIED JOBS
# ══════════════════════════════════════════════════════════════════════════════
else:
    st.markdown(
        "<h3 style='font-size:1.05rem;font-weight:700;color:#0f172a;margin-bottom:16px;'>"
        "📋 Your Applied Jobs</h3>", unsafe_allow_html=True)

    db_jobs = _load_applied()

    # Merge DB + session
    seen_urls = {j.get("source_url","") for j in db_jobs}
    session_extras = [
        {
            "company":      j.get("company",""),
            "title":        j.get("title",""),
            "location":     j.get("location",""),
            "salary":       j.get("salary",""),
            "job_type":     j.get("job_type",""),
            "source_url":   j.get("url",""),
            "applied_at":   "Just now",
            "description":  j.get("ai_summary","") or j.get("description",""),
            "requirements": j.get("ai_reqs","") or j.get("requirements",""),
            "ai_summary":   j.get("ai_summary",""),
            "applicants":   j.get("applicants",""),
            "views":        j.get("views",""),
            "ai_engagement":j.get("ai_engagement",""),
        }
        for j in st.session_state.applied_jobs.values()
        if j.get("url","") not in seen_urls
    ]
    all_applied = db_jobs + session_extras

    if not all_applied:
        st.markdown("""
        <div style="background:#fff;border:1px solid #e2e8f0;border-radius:18px;
                    padding:72px;text-align:center;box-shadow:0 1px 4px rgba(0,0,0,0.04);">
          <div style="font-size:3rem;margin-bottom:14px;">📭</div>
          <div style="font-size:1rem;font-weight:700;color:#0f172a;">No applied jobs yet</div>
          <div style="font-size:0.85rem;color:#64748b;margin-top:8px;">
            Browse jobs and click <strong>Apply Now</strong> to track them here.
          </div>
        </div>""", unsafe_allow_html=True)
    else:
        # ── Stats row ────────────────────────────────────────────────────────
        total_apps  = len(all_applied)
        companies   = len({j.get("company","") for j in all_applied if j.get("company")})
        with_salary = sum(1 for j in all_applied if j.get("salary"))
        with_reqs   = sum(1 for j in all_applied if j.get("requirements") or j.get("ai_reqs",""))
        c1,c2,c3,c4 = st.columns(4)
        for col, val, lbl, color in [
            (c1, total_apps,  "Total Applied",      "#2563EB"),
            (c2, companies,   "Companies",           "#7c3aed"),
            (c3, with_salary, "With Salary Info",    "#16a34a"),
            (c4, with_reqs,   "With Requirements",   "#d97706"),
        ]:
            with col:
                st.markdown(f"""
                <div class="stat-mini">
                  <div class="stat-mini-val" style="color:{color};">{val}</div>
                  <div class="stat-mini-lbl">{lbl}</div>
                </div>""", unsafe_allow_html=True)

        st.markdown("<div style='height:20px'></div>", unsafe_allow_html=True)

        # ── Full applied jobs table ──────────────────────────────────────────
        rows_html = ""
        for j in all_applied:
            company    = j.get("company","—")
            title      = j.get("title","—")
            location   = j.get("location","")
            salary     = j.get("salary","")
            job_type   = j.get("job_type","")
            source_url = j.get("source_url") or j.get("url","")
            applied_at = j.get("applied_at","")
            description= j.get("ai_summary") or j.get("description","")
            requirements= j.get("requirements") or j.get("ai_reqs","")
            applicants = j.get("applicants","")
            views_val  = j.get("views","") or j.get("ai_engagement","")

            date_str = str(applied_at)[:19].replace("T"," ") if applied_at else "—"
            letter   = company[0].upper() if company else "?"

            # Salary cell
            if salary:
                salary_html = f'<span class="at-salary">💰 {salary}</span>'
            else:
                salary_html = '<span class="at-salary-na">Not specified</span>'

            # Type + engagement badges
            badges = ""
            if job_type:
                badges += f'<span class="pill pill-type" style="font-size:0.68rem;">{job_type}</span>'
            if applicants and applicants not in ("","0"):
                badges += f'<span class="pill pill-apps" style="font-size:0.68rem;">👥 {applicants}</span>'
            elif views_val:
                badges += f'<span class="pill pill-views" style="font-size:0.68rem;">📊 {views_val}</span>'

            # Source URL cell
            if source_url and source_url != "#":
                link_html = f'<a class="at-url" href="{source_url}" target="_blank">🔗 View Job</a>'
            else:
                link_html = '<span style="color:#cbd5e1;font-size:0.78rem;">—</span>'

            # Requirements preview
            req_preview = requirements[:350] + "…" if len(requirements) > 350 else requirements
            req_html = f'<div class="at-req">{req_preview}</div>' if req_preview.strip() else '<span style="color:#cbd5e1;font-size:0.78rem;">—</span>'

            # Description preview
            desc_preview = description[:250] + "…" if len(description) > 250 else description
            desc_html = f'<div class="at-desc">{desc_preview}</div>' if desc_preview.strip() else '<span style="color:#cbd5e1;font-size:0.78rem;">—</span>'

            rows_html += f"""
            <tr>
              <td>
                <div class="at-co">
                  <div class="at-logo">{letter}</div>
                  <div>
                    <div class="at-co-name">{company}</div>
                    <div class="at-co-loc">{location or "Location not specified"}</div>
                  </div>
                </div>
              </td>
              <td>
                <div class="at-role-title">{title}</div>
                <div class="at-role-badges">{badges}</div>
              </td>
              <td>{desc_html}</td>
              <td>{req_html}</td>
              <td>{salary_html}</td>
              <td>{link_html}</td>
              <td><span class="at-ts">{date_str}</span></td>
            </tr>"""

        st.markdown(f"""
        <div class="at-wrap">
          <table class="at-table">
            <thead><tr>
              <th>Company</th>
              <th>Role</th>
              <th>AI Description</th>
              <th>Requirements</th>
              <th>Salary</th>
              <th>Source URL</th>
              <th>Applied Date</th>
            </tr></thead>
            <tbody>{rows_html}</tbody>
          </table>
        </div>""", unsafe_allow_html=True)

st.markdown("<div style='height:32px'></div>", unsafe_allow_html=True)
st.caption("CareerSync · LinkedIn jobs via Apify · AI insights by Groq llama-3.1-8b · Click tracking via Google CSE · ❤️")