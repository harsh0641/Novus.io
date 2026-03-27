"""
recruiter_finder.py — Sequential Multi-Source Recruiter Research v7
Reads ALL API keys from Streamlit secrets first, falls back to .env
"""

import os, re, time, json
import requests

try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass


def _get(key, default=""):
    try:
        import streamlit as st
        val = st.secrets.get(key, "")
        if val:
            return val
    except Exception:
        pass
    return os.getenv(key, default)


# ── Credits tracker ────────────────────────────────────────────────────────────
try:
    import credits_tracker as _ct
    _TRACK = True
except ImportError:
    _TRACK = False
    class _ct:
        @staticmethod
        def consume(k, n=1): return 999
        @staticmethod
        def peek(k): return 999
        @staticmethod
        def get_all(): return {}


def _use(key: str, n: int = 1):
    if _TRACK:
        remaining = _ct.consume(key, n)
        _log(f"   💳 {key}: -{n} used  →  {remaining} remaining")


# ── API Keys — read at call time ───────────────────────────────────────────────
def _keys():
    return {
        "GROQ":        _get("GROQ_API_KEY"),
        "GOOGLE":      _get("GOOGLE_API_KEY"),
        "CSE_ID":      _get("GOOGLE_CSE_ID"),
        "HUNTER":      _get("HUNTER_API_KEY"),
        "APIFY":       _get("APIFY_API_KEY"),
        "APOLLO":      _get("APOLLO_API_KEY"),
        "ROCKETREACH": _get("ROCKETREACH_API_KEY"),
        "SNOV_ID":     _get("SNOV_USER_ID"),
        "SNOV_SEC":    _get("SNOV_SECRET"),
    }


APIFY_ENRICHER = "dev_fusion~linkedin-profile-scraper"
APIFY_BASE     = "https://api.apify.com/v2"

RECRUITER_KEYWORDS = [
    "recruiter", "talent acquisition", "talent partner", "technical recruiter",
    "university recruiter", "campus recruiter", "engineering recruiter",
    "corporate recruiter", "staffing", "human resources", "hr partner",
    "hr manager", "people operations", "talent sourcer", "sourcer",
    "recruiting manager", "head of recruiting", "director of talent",
    "director of recruiting",
]

DOMAIN_MAP = {
    "albertsons": "albertsons.com", "albertsons companies": "albertsons.com",
    "safeway": "safeway.com", "kroger": "kroger.com",
    "whole foods": "wholefoodsmarket.com", "whole foods market": "wholefoodsmarket.com",
    "trader joe's": "traderjoes.com", "trader joes": "traderjoes.com",
    "walmart": "walmart.com", "target": "target.com", "costco": "costco.com",
    "home depot": "homedepot.com", "best buy": "bestbuy.com",
    "cvs": "cvshealth.com", "cvs health": "cvshealth.com",
    "walgreens": "walgreens.com", "publix": "publix.com",
    "moderna": "modernatx.com", "pfizer": "pfizer.com", "merck": "merck.com",
    "biogen": "biogen.com", "abbvie": "abbvie.com", "amgen": "amgen.com",
    "genentech": "gene.com", "eli lilly": "lilly.com",
    "johnson & johnson": "jnj.com", "johnson and johnson": "jnj.com",
    "bristol myers squibb": "bms.com", "astrazeneca": "astrazeneca.com",
    "regeneron": "regeneron.com", "vertex pharmaceuticals": "vrtx.com",
    "gilead": "gilead.com", "strand therapeutics": "strandtx.com",
    "draper laboratory": "draper.com", "draper": "draper.com",
    "mitre": "mitre.org", "mit lincoln laboratory": "ll.mit.edu",
    "booz allen hamilton": "boozallen.com", "leidos": "leidos.com",
    "raytheon": "rtx.com", "rtx": "rtx.com",
    "lockheed martin": "lockheedmartin.com",
    "northrop grumman": "northropgrumman.com",
    "general dynamics": "gd.com", "l3harris": "l3harris.com",
    "anduril": "anduril.com", "palantir": "palantir.com",
    "google": "google.com", "alphabet": "google.com",
    "microsoft": "microsoft.com", "amazon": "amazon.com",
    "apple": "apple.com", "meta": "meta.com", "facebook": "meta.com",
    "netflix": "netflix.com", "nvidia": "nvidia.com",
    "intel": "intel.com", "ibm": "ibm.com", "oracle": "oracle.com",
    "cisco": "cisco.com", "salesforce": "salesforce.com",
    "adobe": "adobe.com", "qualcomm": "qualcomm.com",
    "disney": "disney.com", "the walt disney company": "disney.com",
    "spotify": "spotify.com", "hulu": "hulu.com",
    "jpmorgan chase": "jpmorganchase.com", "goldman sachs": "gs.com",
    "morgan stanley": "morganstanley.com", "bank of america": "bankofamerica.com",
    "wells fargo": "wellsfargo.com", "capital one": "capitalone.com",
    "visa": "visa.com", "mastercard": "mastercard.com",
    "stripe": "stripe.com", "paypal": "paypal.com",
    "deloitte": "deloitte.com", "accenture": "accenture.com",
    "mckinsey": "mckinsey.com", "bcg": "bcg.com", "bain": "bain.com",
    "kpmg": "kpmg.com", "pwc": "pwc.com", "ey": "ey.com",
    "databricks": "databricks.com", "snowflake": "snowflake.com",
    "datadog": "datadoghq.com", "crowdstrike": "crowdstrike.com",
    "palo alto networks": "paloaltonetworks.com", "cloudflare": "cloudflare.com",
    "atlassian": "atlassian.com", "mongodb": "mongodb.com",
    "twilio": "twilio.com", "okta": "okta.com", "workday": "workday.com",
    "servicenow": "servicenow.com", "hubspot": "hubspot.com",
    "github": "github.com", "gitlab": "gitlab.com", "figma": "figma.com",
    "notion": "notion.so", "slack": "slack.com", "zoom": "zoom.us",
    "shopify": "shopify.com", "openai": "openai.com", "anthropic": "anthropic.com",
    "tesla": "tesla.com", "uber": "uber.com", "lyft": "lyft.com",
    "airbnb": "airbnb.com", "doordash": "doordash.com",
    "linkedin": "linkedin.com", "tiktok": "tiktok.com",
    "snap": "snap.com", "roblox": "roblox.com",
}


# ══════════════════════════════════════════════════════════════════════════════
# HELPERS
# ══════════════════════════════════════════════════════════════════════════════

def _log(msg): print(f"[recruiter_finder] {msg}")
def _norm(s):  return re.sub(r"\s+", " ", s.lower().strip().rstrip("., "))
def _is_rec(t): return any(k in t.lower() for k in RECRUITER_KEYWORDS)
def _pname(f): p = f.strip().split(); return (p[0], p[-1]) if len(p) >= 2 else (f, "")
def _valid(u): return bool(re.search(r"linkedin\.com/in/[a-zA-Z0-9\-_%]{3,}", u))
def _slug(u):
    m = re.search(r"linkedin\.com/in/([a-zA-Z0-9\-_%]+)", u)
    return m.group(1).lower() if m else ""
def _empty(): return {"recruiter_name": "", "recruiter_title": "", "linkedin_url": "", "recruiter_email": "", "source": "", "verified": False}

def _variants(c):
    v = [c]
    s = re.sub(r",?\s*(inc\.?|llc\.?|ltd\.?|corp\.?|co\.?|company|companies|group|holdings|technologies|solutions|systems|services|international|global|north america)\s*$", "", c, flags=re.IGNORECASE).strip().rstrip(",.")
    if s and s.lower() != c.lower(): v.append(s)
    f = c.split()[0]
    if f.lower() not in [x.lower() for x in v] and len(f) > 3: v.append(f)
    return v

def _domain(c):
    for v in _variants(c):
        k = _norm(v)
        if k in DOMAIN_MAP: return DOMAIN_MAP[k]
        for mk, md in DOMAIN_MAP.items():
            if mk in k or k in mk: return md
    base = re.sub(r"[^a-z0-9]", "", _norm(_variants(c)[-1]).replace(" ", ""))
    return f"{base}.com" if base else ""

def _alts(c, primary):
    base = primary.split(".")[0] if primary else ""
    if not base: return []
    return [f"{base}{s}.com" for s in ["cos", "hq", "corp", "inc"] if f"{base}{s}.com" != primary][:3]


# ══════════════════════════════════════════════════════════════════════════════
# GROQ
# ══════════════════════════════════════════════════════════════════════════════

def _groq_pick(company, results):
    k = _keys()
    if not k["GROQ"] or not results:
        return _regex_pick(results)
    text = "\n\n".join([f"Result {i+1}:\nURL:{r['url']}\nTitle:{r['title']}\nSnippet:{r.get('snippet','')}" for i, r in enumerate(results[:8])])
    prompt = (f'Search results for LinkedIn recruiter at "{company}":\n\n{text}\n\n'
              f'Pick SINGLE BEST: real PERSON, linkedin.com/in/ URL, works at {company} in recruiting/talent/HR.\n'
              f'Return ONLY JSON: {{"found":true,"name":"Full Name","title":"Title","linkedin_url":"https://linkedin.com/in/slug"}}\n'
              f'No match: {{"found":false,"name":"","title":"","linkedin_url":""}}')
    try:
        _use("groq", 1)
        r = requests.post("https://api.groq.com/openai/v1/chat/completions",
            headers={"Content-Type": "application/json", "Authorization": f"Bearer {k['GROQ']}"},
            json={"model": "llama-3.1-8b-instant", "messages": [{"role": "user", "content": prompt}], "temperature": 0, "max_tokens": 200},
            timeout=15)
        if r.status_code != 200:
            return _regex_pick(results)
        raw  = re.sub(r"```(?:json)?", "", r.json()["choices"][0]["message"]["content"]).strip()
        data = json.loads(raw)
        if data.get("found") and _valid(data.get("linkedin_url", "")):
            _log(f"✓ Groq: {data['name']}")
            return data
        return _regex_pick(results)
    except Exception as e:
        _log(f"Groq error: {e}")
        return _regex_pick(results)

def _regex_pick(results):
    for r in results:
        url = r.get("url", "")
        if not _valid(url): continue
        m = re.match(r"^([A-Z][a-z]+ [A-Z][a-zA-Z\-']+)\s*[-–|]", r.get("title", ""))
        if m:
            name = m.group(1).strip()
            tp   = re.sub(r"^[^-–|]+[-–|]\s*", "", r.get("title", ""))
            tp   = re.sub(r"\s*[|\-–].*$", "", tp).strip()
            return {"found": True, "name": name, "title": tp, "linkedin_url": url}
    return {}


# ══════════════════════════════════════════════════════════════════════════════
# SOURCE 1 — Google CSE
# ══════════════════════════════════════════════════════════════════════════════

def _src_google(company):
    k = _keys()
    if not k["GOOGLE"] or not k["CSE_ID"]:
        _log("Google CSE: SKIP — keys not set"); return {}
    seen, hits = set(), []
    queries = []
    for v in _variants(company)[:2]:
        queries += [
            f'site:linkedin.com/in "{v}" recruiter',
            f'site:linkedin.com/in "{v}" "talent acquisition"',
            f'site:linkedin.com/in "{v}" "technical recruiter"',
            f'site:linkedin.com/in "{v}" "university recruiter"',
            f'site:linkedin.com/in "{v}" "HR" OR "human resources"',
            f'"{v}" recruiter linkedin.com/in',
        ]
    _log(f"Google CSE: {len(queries)} queries for '{company}'")
    for q in queries:
        try:
            _use("google_cse", 1)
            r = requests.get("https://www.googleapis.com/customsearch/v1",
                params={"key": k["GOOGLE"], "cx": k["CSE_ID"], "q": q, "num": 5, "gl": "us"}, timeout=10)
            data = r.json()
            if "error" in data:
                code = data["error"].get("code", 0)
                if code == 403:
                    _log("Google CSE: ❌ 403 — Enable Custom Search API"); break
                elif code == 429:
                    _log("Google CSE: ❌ Daily quota exhausted"); break
                continue
            for item in data.get("items", []):
                url = item.get("link", "")
                if _valid(url) and url not in seen:
                    seen.add(url)
                    hits.append({"url": url, "title": item.get("title", ""), "snippet": item.get("snippet", "")})
        except Exception as e:
            _log(f"Google CSE error: {e}")
        if len(hits) >= 8: break
        time.sleep(0.15)
    _log(f"Google CSE: {len(hits)} profiles found")
    if not hits: return {}
    p = _groq_pick(company, hits)
    if p.get("found"):
        return {"name": p["name"], "title": p.get("title", ""), "linkedin_url": p["linkedin_url"], "source": "google_cse"}
    return {}


# ══════════════════════════════════════════════════════════════════════════════
# SOURCE 2 — Hunter
# ══════════════════════════════════════════════════════════════════════════════

def _src_hunter_domain(dom):
    k = _keys()
    if not k["HUNTER"] or not dom:
        _log("Hunter: SKIP — key or domain missing"); return {}
    try:
        _use("hunter", 1)
        r = requests.get("https://api.hunter.io/v2/domain-search",
            params={"domain": dom, "api_key": k["HUNTER"], "limit": 10, "type": "personal"}, timeout=10)
        data = r.json()
        if data.get("errors"):
            for e in data["errors"]: _log(f"Hunter: ❌ {e.get('details', e)}")
            return {}
        emails = data.get("data", {}).get("emails", [])
        _log(f"Hunter domain: {len(emails)} emails at {dom}")
        best_s, best = -1, None
        for e in emails:
            sc = (50 if _is_rec(e.get("position", "")) else 0) + e.get("confidence", 0)
            if sc > best_s: best_s, best = sc, e
        if not best or best.get("confidence", 0) < 20: return {}
        name  = f"{best.get('first_name', '')} {best.get('last_name', '')}".strip()
        email = best.get("value", "")
        if not email: return {}
        _log(f"✓ Hunter domain: {name} <{email}>")
        return {"name": name, "title": best.get("position", ""), "email": email, "linkedin_url": best.get("linkedin", "") or "", "source": "hunter_domain"}
    except Exception as e:
        _log(f"Hunter domain error: {e}"); return {}

def _src_hunter_finder(first, last, dom):
    k = _keys()
    if not k["HUNTER"] or not first or not last or not dom: return ""
    try:
        _use("hunter", 1)
        r = requests.get("https://api.hunter.io/v2/email-finder",
            params={"first_name": first, "last_name": last, "domain": dom, "api_key": k["HUNTER"]}, timeout=8)
        d = r.json().get("data", {})
        email = d.get("email", "")
        if email and d.get("score", 0) >= 20:
            _log(f"✓ Hunter finder: {email}"); return email
        return ""
    except Exception as e:
        _log(f"Hunter finder error: {e}"); return ""


# ══════════════════════════════════════════════════════════════════════════════
# SOURCE 3 — Snov.io
# ══════════════════════════════════════════════════════════════════════════════

_snov_cache = {"token": "", "expires": 0}
_snov_dead  = False

def _snov_token():
    global _snov_dead
    if _snov_dead: return ""
    k = _keys()
    if not k["SNOV_ID"] or not k["SNOV_SEC"]:
        _log("Snov: SKIP — credentials missing"); return ""
    import time as _t
    now = _t.time()
    if _snov_cache["token"] and now < _snov_cache["expires"] - 30:
        return _snov_cache["token"]
    try:
        r = requests.post("https://api.snov.io/v1/oauth/access_token",
            data={"grant_type": "client_credentials", "client_id": k["SNOV_ID"], "client_secret": k["SNOV_SEC"]}, timeout=8)
        data  = r.json()
        token = data.get("access_token", "")
        if not token:
            _log(f"Snov: ❌ Auth failed — {data.get('error', '?')}")
            _snov_dead = True; return ""
        _snov_cache["token"]   = token
        _snov_cache["expires"] = now + data.get("expires_in", 3600)
        _log("✓ Snov token OK"); return token
    except Exception as e:
        _log(f"Snov token error: {e}"); return ""

def _src_snov_domain(dom):
    token = _snov_token()
    if not token or not dom: return {}
    try:
        _use("snov", 1)
        r = requests.post("https://api.snov.io/v2/domain-emails-with-info",
            headers={"Authorization": f"Bearer {token}"},
            data={"domain": dom, "type": "all", "limit": 10, "lastId": 0}, timeout=12)
        people = r.json().get("emails", [])
        _log(f"Snov domain: {len(people)} contacts at {dom}")
        best_s, best = -1, None
        for p in people:
            sc = 60 if _is_rec(p.get("position", "")) else 10
            if sc > best_s: best_s, best = sc, p
        if not best: return {}
        first = best.get("firstName") or best.get("first_name") or ""
        last  = best.get("lastName")  or best.get("last_name")  or ""
        email = best.get("email", "")
        if email and "@" in email:
            _log(f"✓ Snov domain: {first} {last} <{email}>")
            return {"name": f"{first} {last}".strip(), "title": best.get("position", ""), "email": email, "linkedin_url": "", "source": "snov_domain"}
        return {}
    except Exception as e:
        _log(f"Snov domain error: {e}"); return {}

def _src_snov_finder(first, last, dom):
    token = _snov_token()
    if not token or not first or not last or not dom: return ""
    try:
        _use("snov", 1)
        r = requests.post("https://api.snov.io/v1/get-emails-from-names",
            headers={"Authorization": f"Bearer {token}"},
            data={"firstName": first, "lastName": last, "domain": dom, "type": "all"}, timeout=10)
        data   = r.json()
        emails = data.get("data", {}).get("emails", []) or data.get("emails", [])
        if emails:
            e = (emails[0].get("email", "") if isinstance(emails[0], dict) else str(emails[0]))
            if e and "@" in e:
                _log(f"✓ Snov finder: {first} {last} → {e}"); return e
        return ""
    except Exception as e:
        _log(f"Snov finder error: {e}"); return ""


# ══════════════════════════════════════════════════════════════════════════════
# SOURCE 4 — Apollo
# ══════════════════════════════════════════════════════════════════════════════

def _src_apollo(linkedin_url="", name="", dom=""):
    k = _keys()
    if not k["APOLLO"]: _log("Apollo: SKIP — key not set"); return {}
    if not linkedin_url and not (name and dom):
        _log("Apollo: SKIP — need linkedin_url or name+domain"); return {}
    body = {"reveal_personal_emails": True}
    if linkedin_url: body["linkedin_url"] = linkedin_url
    if name:
        p = name.strip().split()
        if len(p) >= 2: body["first_name"] = p[0]; body["last_name"] = p[-1]
    if dom: body["domain"] = dom
    _use("apollo", 1)
    for url, hdrs in [
        ("https://api.apollo.io/v1/people/match", {"Content-Type": "application/json", "X-Api-Key": k["APOLLO"], "Cache-Control": "no-cache"}),
        ("https://api.apollo.io/v1/people/match", {"Content-Type": "application/json", "Cache-Control": "no-cache"}),
    ]:
        if "X-Api-Key" not in hdrs: body["api_key"] = k["APOLLO"]
        try:
            r = requests.post(url, headers=hdrs, json=body, timeout=12)
            _log(f"Apollo match HTTP {r.status_code}")
            if r.status_code == 200:
                person = r.json().get("person", {}) or {}
                pname  = f"{person.get('first_name','')} {person.get('last_name','')}".strip() or name
                email  = person.get("email", "") or ""
                li     = person.get("linkedin_url", "") or linkedin_url
                if email or li:
                    _log(f"✓ Apollo: {pname} | email={email or 'none'}")
                    return {"name": pname, "title": person.get("title", ""), "email": email, "linkedin_url": li, "source": "apollo_match"}
            elif r.status_code in (403, 404): break
        except Exception as e:
            _log(f"Apollo error: {e}")
    return {}


# ══════════════════════════════════════════════════════════════════════════════
# SOURCE 5 — Apify
# ══════════════════════════════════════════════════════════════════════════════

def _src_apify(linkedin_url):
    k = _keys()
    if not k["APIFY"] or not _valid(linkedin_url):
        _log("Apify: SKIP — no key or invalid LinkedIn URL"); return {}
    _use("apify", 1)
    for payload in [{"profileUrls": [linkedin_url]}, {"profileUrls": [linkedin_url], "proxyConfiguration": {"useApifyProxy": True}}]:
        try:
            resp = requests.post(f"{APIFY_BASE}/acts/{APIFY_ENRICHER}/run-sync-get-dataset-items",
                params={"token": k["APIFY"], "timeout": 60}, json=payload, timeout=70)
            _log(f"Apify HTTP {resp.status_code}")
            if resp.status_code == 200:
                items = (resp.json() if isinstance(resp.json(), list) else resp.json().get("items", []))
                if items:
                    item  = items[0]
                    email = item.get("email") or item.get("emailAddress") or ""
                    name  = item.get("fullName") or item.get("name") or f"{item.get('firstName','')} {item.get('lastName','')}".strip()
                    title = item.get("headline") or item.get("title") or ""
                    _log(f"✓ Apify: {name} | email={email or 'none'}")
                    return {"email": email, "name": name, "title": title, "linkedin_url": linkedin_url, "source": "apify"}
            elif resp.status_code == 402:
                _log("Apify: ❌ Credits exhausted"); break
        except Exception as e:
            _log(f"Apify error: {e}")
    return {}


# ══════════════════════════════════════════════════════════════════════════════
# SOURCE 6 — RocketReach
# ══════════════════════════════════════════════════════════════════════════════

def _src_rocketreach(name, company, li=""):
    k = _keys()
    if not k["ROCKETREACH"]: _log("RocketReach: SKIP"); return {}
    _use("rocketreach", 1)
    try:
        params = {"name": name, "current_employer": company}
        if li: params["linkedin_url"] = li
        r = requests.get("https://api.rocketreach.co/v2/api/lookupProfile",
            headers={"Api-Key": k["ROCKETREACH"]}, params=params, timeout=15)
        _log(f"RocketReach HTTP {r.status_code}")
        if r.status_code == 200:
            data   = r.json()
            emails = data.get("emails", [])
            best   = next((e["email"] for e in emails if "work" in (e.get("type", "")).lower() and e.get("email")), "")
            if not best and emails: best = emails[0].get("email", "")
            if best:
                _log(f"✓ RocketReach: {name} → {best}")
                return {"email": best, "linkedin_url": data.get("linkedin_url", "") or li, "source": "rocketreach"}
        elif r.status_code == 402: _log("RocketReach: ❌ Credits exhausted")
        elif r.status_code == 401: _log("RocketReach: ❌ Invalid key")
        return {}
    except Exception as e:
        _log(f"RocketReach error: {e}"); return {}


# ══════════════════════════════════════════════════════════════════════════════
# VERIFICATION ENGINE
# ══════════════════════════════════════════════════════════════════════════════

class _VR:
    def __init__(self):
        self.li_src = []; self.em_src = []
        self.li = ""; self.em = ""
        self.v_li = False; self.v_em = False

    def add_li(self, url, src):
        if not url or not _valid(url): return
        if not self.li: self.li = url
        if (url == self.li or _slug(url) == _slug(self.li)) and src not in self.li_src:
            self.li_src.append(src)
        if len(self.li_src) >= 2: self.v_li = True

    def add_em(self, email, src):
        if not email or "@" not in email: return
        email = email.lower().strip()
        if not self.em: self.em = email
        if email == self.em and src not in self.em_src:
            self.em_src.append(src)
        if len(self.em_src) >= 2: self.v_em = True


# ══════════════════════════════════════════════════════════════════════════════
# MAIN PIPELINE
# ══════════════════════════════════════════════════════════════════════════════

def enrich_application(company_name: str) -> dict:
    result = _empty()
    dom    = _domain(company_name)
    vr     = _VR()
    k      = _keys()

    _log(f"\n══ Researching: '{company_name}' ══")
    _log(f"   domain={dom}")

    # Phase 1 — LinkedIn via Google CSE
    _log("\n── Phase 1: LinkedIn ──")
    gd = _src_google(company_name)
    if gd.get("linkedin_url"):
        result["recruiter_name"]  = gd["name"]
        result["recruiter_title"] = gd.get("title", "")
        result["linkedin_url"]    = gd["linkedin_url"]
        vr.add_li(gd["linkedin_url"], "google_cse")
        _log(f"✓ Phase 1: {gd['name']}")
    else:
        _log("✗ Phase 1: no LinkedIn found")

    # Phase 2 — Email
    _log("\n── Phase 2: Email ──")

    _log("2A. Hunter domain...")
    hd = _src_hunter_domain(dom)
    if hd.get("email"):
        vr.add_em(hd["email"], "hunter_domain")
        if not result["recruiter_name"] and hd.get("name"):
            result["recruiter_name"] = hd["name"]; result["recruiter_title"] = hd.get("title", "")
        if hd.get("linkedin_url") and not vr.li: vr.add_li(hd["linkedin_url"], "hunter_domain")
    else:
        for alt in _alts(company_name, dom):
            hd2 = _src_hunter_domain(alt)
            if hd2.get("email"):
                vr.add_em(hd2["email"], "hunter_domain")
                if not result["recruiter_name"] and hd2.get("name"):
                    result["recruiter_name"] = hd2["name"]; result["recruiter_title"] = hd2.get("title", "")
                break

    if not vr.em:
        _log("2B. Snov domain...")
        sd = _src_snov_domain(dom)
        if sd.get("email"):
            vr.add_em(sd["email"], "snov_domain")
            if not result["recruiter_name"] and sd.get("name"):
                result["recruiter_name"] = sd["name"]; result["recruiter_title"] = sd.get("title", "")

    if not vr.em and (result["linkedin_url"] or result["recruiter_name"]):
        _log("2C. Apollo match...")
        am = _src_apollo(linkedin_url=result["linkedin_url"], name=result["recruiter_name"], dom=dom)
        if am.get("email"): vr.add_em(am["email"], "apollo_match")
        if am.get("linkedin_url") and not vr.li: vr.add_li(am["linkedin_url"], "apollo_match")
        if am.get("name") and not result["recruiter_name"]:
            result["recruiter_name"] = am["name"]; result["recruiter_title"] = am.get("title", "")

    if not vr.em and result["linkedin_url"]:
        _log("2D. Apify enricher...")
        ae = _src_apify(result["linkedin_url"])
        if ae.get("email"): vr.add_em(ae["email"], "apify")

    if not vr.em and result["recruiter_name"] and k["HUNTER"] and dom:
        _log("2E. Hunter targeted...")
        first, last = _pname(result["recruiter_name"])
        for d in [dom] + _alts(company_name, dom)[:2]:
            em = _src_hunter_finder(first, last, d)
            if em: vr.add_em(em, "hunter_finder"); break

    if not vr.em and result["recruiter_name"] and k["SNOV_ID"]:
        _log("2F. Snov targeted...")
        first, last = _pname(result["recruiter_name"])
        for d in [dom] + _alts(company_name, dom)[:1]:
            se = _src_snov_finder(first, last, d)
            if se: vr.add_em(se, "snov_finder"); break

    if not vr.em and result["recruiter_name"] and k["ROCKETREACH"]:
        _log("2G. RocketReach LAST RESORT...")
        rr = _src_rocketreach(result["recruiter_name"], company_name, result.get("linkedin_url", ""))
        if rr.get("email"): vr.add_em(rr["email"], "rocketreach")

    if not vr.em: _log("✗ Phase 2: no email found")

    # Phase 3 — Verify
    if vr.em and len(vr.em_src) < 2 and result["recruiter_name"]:
        _log("\n── Phase 3: Verification ──")
        first, last = _pname(result["recruiter_name"])
        if "hunter_finder" not in vr.em_src and "hunter_domain" not in vr.em_src:
            if first and last and k["HUNTER"]:
                for d in [dom] + _alts(company_name, dom)[:2]:
                    em = _src_hunter_finder(first, last, d)
                    if em: vr.add_em(em, "hunter_finder"); break
        if not vr.v_em and "snov_finder" not in vr.em_src:
            if first and last and k["SNOV_ID"]:
                for d in [dom] + _alts(company_name, dom)[:1]:
                    em2 = _src_snov_finder(first, last, d)
                    if em2: vr.add_em(em2, "snov_finder"); break

    # Final assembly
    result["linkedin_url"]    = vr.li or result.get("linkedin_url", "")
    result["recruiter_email"] = vr.em
    result["verified"]        = vr.v_li or vr.v_em
    result["source"]          = "+".join(list(dict.fromkeys(vr.li_src + vr.em_src))) or "none"

    found = any([result["recruiter_name"], result["recruiter_email"], result["linkedin_url"]])
    _log(f"\n══ {'✅ FOUND' if found else '❌ NOT FOUND'}: '{company_name}' ══")
    _log(f"   Name:     {result['recruiter_name']  or '—'}")
    _log(f"   Email:    {result['recruiter_email'] or '—'}")
    _log(f"   LinkedIn: {result['linkedin_url']    or '—'}")
    _log(f"   Sources:  {result['source']}")
    _log(f"   Verified: {'✅ 2+ sources' if result['verified'] else '⚠️ 1 source'}")
    time.sleep(0.3)
    return result


def enrich_all(companies: list) -> dict:
    out, seen = {}, set()
    for c in companies:
        k = _norm(c)
        if k not in seen:
            seen.add(k); out[c] = enrich_application(c); time.sleep(0.5)
        else:
            for orig, val in out.items():
                if _norm(orig) == k: out[c] = val; break
    return out