"""
app.py — CareerSync Landing + Login + Register
Mobile responsive. Blue #2563EB. Inter font. White button text.
Clean minimal design. No iframe. Pure Streamlit st.markdown.
"""

import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))

import streamlit as st

st.set_page_config(
    page_title="CareerSync — Automated Job Tracker",
    page_icon="🎯",
    layout="wide",
    initial_sidebar_state="collapsed",
)

from auth import register_user, login_user, supabase_ready, get_user_by_id

# ══════════════════════════════════════════════════════════════════════════════
# AUTH
# ══════════════════════════════════════════════════════════════════════════════
def _restore_session():
    if st.session_state.get("user"):
        return True
    if st.session_state.get("logged_out"):
        return False
    uid = st.query_params.get("uid", "")
    if uid:
        user = get_user_by_id(uid)
        if user:
            st.session_state["user"]    = user
            st.session_state["user_id"] = uid
            return True
    return False

def _set_login(user: dict):
    st.session_state.pop("logged_out", None)
    st.session_state["user"]    = user
    st.session_state["user_id"] = user["id"]
    st.query_params["uid"]      = user["id"]

def go(view: str):
    st.session_state.auth_view = view

_restore_session()

_nav = st.query_params.get("nav", "")
if _nav == "login":
    st.query_params.clear()
    go("login")
elif _nav == "signup":
    st.query_params.clear()
    go("register")

if st.session_state.get("user"):
    st.switch_page("pages/1_Dashboard.py")
    st.stop()

if "auth_view" not in st.session_state:
    st.session_state.auth_view = "landing"

# ── Hide Streamlit chrome ──────────────────────────────────────────────────────
st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
#MainMenu,header,footer,[data-testid="stToolbar"],[data-testid="stDecoration"],
[data-testid="stStatusWidget"],[data-testid="stSidebar"],
[data-testid="collapsedControl"],[data-testid="stHeader"]{display:none!important;}
html,body,.stApp,[data-testid="stAppViewContainer"],
section.main,[data-testid="stMain"]{
  background:#fff!important;
  font-family:'Inter',sans-serif!important;
  margin:0!important;padding:0!important;
}
.block-container{padding:0!important;max-width:100%!important;margin:0!important;}
[data-testid="stVerticalBlock"]{gap:0!important;}
</style>
""", unsafe_allow_html=True)

# ── Auth CSS (used by login + register pages) ─────────────────────────────────
_AUTH_CSS = """
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
body,.stApp,[data-testid="stAppViewContainer"],section.main,[data-testid="stMain"]{
  background:#f0f2f5!important;font-family:'Inter',sans-serif!important;}
.block-container{padding:0!important;max-width:100%!important;margin:0!important;}
[data-testid="stVerticalBlock"]{gap:0!important;}
.auth-page{min-height:100vh;display:flex;flex-direction:column;background:#f0f2f5;}
.auth-nav{height:56px;background:#fff;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;
  justify-content:space-between;padding:0 clamp(1rem,4vw,2rem);flex-shrink:0;}
.auth-nav-logo{display:flex;align-items:center;gap:8px;}
.auth-nav-logo-icon{width:28px;height:28px;border-radius:7px;background:#2563EB;
  display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.auth-nav-brand{font-size:0.95rem;font-weight:700;color:#0f172a;}
.auth-nav-right{font-size:0.82rem;color:#64748b;display:flex;align-items:center;gap:8px;
  flex-wrap:wrap;justify-content:flex-end;}
.auth-nav-link{color:#2563EB;font-weight:600;font-size:0.82rem;border:1.5px solid #2563EB;
  border-radius:7px;padding:6px 14px;text-decoration:none!important;transition:all 0.15s;white-space:nowrap;}
.auth-nav-link:hover{background:#2563EB;color:#fff!important;}
.auth-body{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;
  padding:clamp(20px,5vh,48px) clamp(16px,4vw,24px);}
.auth-logo{display:flex;align-items:center;gap:10px;margin-bottom:24px;}
.auth-logo-icon{width:44px;height:44px;border-radius:12px;background:#2563EB;
  display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.auth-logo-text{font-size:1.15rem;font-weight:700;color:#0f172a;}
.auth-card{background:#fff;border-radius:16px;border:1px solid #e8edf2;
  padding:clamp(24px,5vw,40px) clamp(20px,5vw,40px);
  width:100%;max-width:440px;box-shadow:0 2px 16px rgba(0,0,0,0.07);}
.auth-card-wide{max-width:480px;}
.auth-card-title{font-size:clamp(1.3rem,4vw,1.6rem);font-weight:800;color:#0f172a;
  margin-bottom:6px;letter-spacing:-0.4px;text-align:center;}
.auth-card-sub{font-size:0.875rem;color:#64748b;margin-bottom:28px;text-align:center;line-height:1.5;}
div[data-testid="stTextInput"] input{
  border-radius:10px!important;border:1.5px solid #e2e8f0!important;
  background:#fff!important;padding:12px 14px!important;color:#0f172a!important;
  font-size:0.9rem!important;font-family:'Inter',sans-serif!important;width:100%!important;}
div[data-testid="stTextInput"] input:focus{
  border-color:#2563EB!important;box-shadow:0 0 0 3px rgba(37,99,235,0.1)!important;}
div[data-testid="stTextInput"] input::placeholder{color:#94a3b8!important;}
div[data-testid="stTextInput"] label{
  font-size:0.82rem!important;font-weight:600!important;color:#374151!important;
  font-family:'Inter',sans-serif!important;margin-bottom:4px!important;}
div[data-testid="stFormSubmitButton"] button{
  width:100%!important;border-radius:10px!important;background:#2563EB!important;
  padding:14px!important;font-size:0.95rem!important;font-weight:700!important;
  color:#fff!important;border:none!important;font-family:'Inter',sans-serif!important;
  box-shadow:0 2px 10px rgba(37,99,235,0.28)!important;margin-top:6px!important;
  letter-spacing:-0.1px!important;}
div[data-testid="stFormSubmitButton"] button:hover{background:#1d4ed8!important;}
div.stButton>button{background:transparent!important;border:none!important;padding:3px!important;
  font-size:0.82rem!important;box-shadow:none!important;font-family:'Inter',sans-serif!important;
  color:#64748b!important;font-weight:400!important;}
div.stButton>button:hover{color:#0f172a!important;}
.auth-footer{text-align:center;padding:20px 16px;font-size:0.72rem;color:#94a3b8;font-family:'Inter',sans-serif;}
@media(max-width:480px){
  .auth-nav-right span{display:none;}
  .auth-card{border-radius:12px;}
}
</style>
"""

# ══════════════════════════════════════════════════════════════════════════════
# LANDING
# ══════════════════════════════════════════════════════════════════════════════
if st.session_state.auth_view == "landing":

    st.markdown("""
    <style>
    *{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:'Inter',sans-serif;background:#fff;color:#0f172a;-webkit-font-smoothing:antialiased;}
    a{text-decoration:none!important;}

    /* ══ NAVBAR ══ */
    .nav{
      width:100%;background:rgba(255,255,255,0.92);
      backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);
      border-bottom:1px solid #f1f5f9;
      height:60px;display:flex;align-items:center;
      justify-content:space-between;padding:0 2rem;
      position:sticky;top:0;z-index:999;
    }
    .nav-left{display:flex;align-items:center;gap:9px;}
    .nav-icon{
      width:32px;height:32px;border-radius:8px;background:#2563EB;
      display:flex;align-items:center;justify-content:center;flex-shrink:0;
    }
    .nav-brand{font-size:1rem;font-weight:700;color:#0f172a;letter-spacing:-0.2px;white-space:nowrap;}
    .nav-center{display:flex;align-items:center;gap:24px;}
    .nav-link{font-size:0.85rem;font-weight:500;color:#64748b;text-decoration:none!important;transition:color 0.15s;white-space:nowrap;}
    .nav-link:hover{color:#0f172a;}
    .nav-right{display:flex;align-items:center;gap:12px;}
    .nav-login{font-size:0.85rem;font-weight:600;color:#0f172a;text-decoration:none!important;white-space:nowrap;transition:color 0.15s;}
    .nav-login:hover{color:#2563EB;}
    .nav-cta{
      background:#2563EB;color:#fff!important;border:none;border-radius:8px;
      padding:8px 16px;font-size:0.82rem;font-weight:700;
      cursor:pointer;font-family:'Inter',sans-serif;
      text-decoration:none!important;display:inline-block;white-space:nowrap;
      transition:background 0.15s;
    }
    .nav-cta:hover{background:#1d4ed8;}

    /* Mobile nav */
    @media(max-width:640px){
      .nav{padding:0 1.2rem;height:56px;}
      .nav-center{display:none!important;}
      .nav-login{
        display:inline-block!important;
        font-size:0.82rem;font-weight:600;
        color:#0f172a;text-decoration:none!important;
        white-space:nowrap;padding:7px 10px;
      }
      .nav-right{gap:6px;align-items:center;}
      .nav-cta{padding:7px 12px;font-size:0.8rem;}
      .nav-brand{font-size:0.92rem;}
    }

    /* ══ HERO ══ */
    .hero{
      max-width:1120px;margin:0 auto;
      padding:72px 2rem 64px;
      display:grid;grid-template-columns:7fr 5fr;
      gap:56px;align-items:center;
    }
    @media(max-width:860px){
      .hero{grid-template-columns:1fr;padding:40px 1.5rem 36px;gap:36px;text-align:center;}
      .hero-desc{max-width:100%!important;margin-left:auto;margin-right:auto;}
      .hero-btns{justify-content:center;flex-wrap:wrap;gap:12px;}
      .trusted{justify-content:center;flex-wrap:wrap;gap:8px;}
      .trusted-names{justify-content:center;}
    }
    @media(max-width:480px){
      .hero{padding:28px 1.2rem 28px;}
      .hero h1{font-size:2.1rem;letter-spacing:-1px;}
      .hero-tag{font-size:0.68rem;}
      .btn-hero-p{width:100%;text-align:center;padding:14px;}
      .btn-hero-s{width:100%;justify-content:center;}
      .hero-btns{flex-direction:column;align-items:stretch;width:100%;}
    }

    .hero-tag{
      display:inline-flex;align-items:center;gap:6px;
      padding:4px 12px;border-radius:9999px;
      border:1px solid #e2e8f0;background:#f8fafc;
      font-size:0.72rem;color:#64748b;font-weight:500;
      margin-bottom:20px;
    }
    .hero-tag a{font-weight:600;color:#2563EB;text-decoration:none!important;}

    .hero h1{
      font-size:clamp(2.2rem,5vw,3.8rem);font-weight:800;
      color:#0d1b2a;line-height:1.06;letter-spacing:-1.5px;
      margin-bottom:18px;
    }
    .hero h1 .blue{color:#2563EB;}
    .hero-desc{
      font-size:0.975rem;color:#64748b;line-height:1.75;
      margin-bottom:32px;max-width:460px;
    }

    .hero-btns{display:flex;align-items:center;gap:16px;margin-bottom:36px;flex-wrap:wrap;}
    .btn-hero-p{
      background:#2563EB;color:#fff!important;border:none;border-radius:10px;
      padding:13px 24px;font-size:0.9rem;font-weight:700;
      cursor:pointer;font-family:'Inter',sans-serif;
      text-decoration:none!important;display:inline-block;
      box-shadow:0 3px 10px rgba(37,99,235,0.28);transition:all 0.15s;
    }
    .btn-hero-p:hover{background:#1d4ed8;transform:translateY(-1px);}
    .btn-hero-s{
      display:inline-flex;align-items:center;gap:5px;
      font-size:0.875rem;font-weight:600;color:#0f172a;
      text-decoration:none!important;transition:color 0.15s;
    }
    .btn-hero-s:hover{color:#2563EB;}

    .trusted{display:flex;align-items:center;gap:12px;flex-wrap:wrap;}
    .trusted-lbl{font-size:0.68rem;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;white-space:nowrap;}
    .trusted-names{display:flex;gap:14px;flex-wrap:wrap;}
    .trusted-name{font-size:0.78rem;font-weight:700;color:#94a3b8;letter-spacing:0.3px;opacity:0.7;}

    /* ══ HERO VISUAL ══ */
    .hero-visual{
      background:#fff;border-radius:16px;border:1px solid #e8edf2;
      padding:6px;box-shadow:0 16px 48px -10px rgba(0,0,0,0.12);
      position:relative;
    }
    .hero-visual-inner{
      height:340px;border-radius:12px;background:#f8fafc;
      display:flex;align-items:center;justify-content:center;
      overflow:hidden;
    }
    .hero-ph{display:flex;flex-direction:column;align-items:center;gap:10px;opacity:0.12;}
    .hero-ph svg{width:64px;height:64px;}
    .hero-ph-line{height:6px;border-radius:9999px;background:#475569;}
    .hero-glow{
      position:absolute;top:-40px;right:-40px;
      width:200px;height:200px;border-radius:50%;
      background:rgba(37,99,235,0.06);filter:blur(50px);pointer-events:none;
    }
    @media(max-width:860px){
      .hero-visual-inner{height:240px;}
    }

    /* ══ PROOF BAR ══ */
    .proof{
      background:#fff;border-top:1px solid #f1f5f9;border-bottom:1px solid #f1f5f9;
      padding:28px 2rem;
    }
    .proof-inner{max-width:1120px;margin:0 auto;text-align:center;}
    .proof-lbl{font-size:0.65rem;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1.2px;margin-bottom:18px;}
    .proof-logos{display:flex;justify-content:center;gap:20px;flex-wrap:wrap;opacity:0.25;}
    .proof-logo{width:72px;height:20px;background:#94a3b8;border-radius:3px;}

    /* ══ FEATURES ══ */
    .feat-wrap{background:#f8fafc;border-top:1px solid #f1f5f9;border-bottom:1px solid #f1f5f9;padding:56px 1.5rem;}
    @media(max-width:480px){.feat-wrap{padding:44px 1.2rem;}}
    .feat-inner{max-width:1120px;margin:0 auto;}
    .feat-eyebrow{font-size:0.7rem;font-weight:600;color:#2563EB;text-transform:uppercase;letter-spacing:1.2px;text-align:center;margin-bottom:10px;}
    .feat-title{font-size:clamp(1.5rem,2.5vw,2.1rem);font-weight:700;color:#0d1b2a;text-align:center;margin-bottom:8px;letter-spacing:-0.3px;}
    .feat-sub{font-size:0.9rem;color:#64748b;text-align:center;line-height:1.65;max-width:500px;margin:0 auto 48px;}
    .feat-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;}
    @media(max-width:860px){.feat-grid{grid-template-columns:1fr 1fr;}}
    @media(max-width:540px){.feat-grid{grid-template-columns:1fr;}}
    .feat-card{
      background:#fff;border:1px solid #f1f5f9;border-radius:14px;
      padding:28px 24px;transition:all 0.2s;
    }
    .feat-card:hover{box-shadow:0 8px 24px -6px rgba(0,0,0,0.08);border-color:#e2e8f0;}
    .feat-icon{
      width:40px;height:40px;border-radius:10px;
      background:rgba(37,99,235,0.08);
      display:flex;align-items:center;justify-content:center;
      margin-bottom:14px;transition:background 0.2s;
    }
    .feat-card:hover .feat-icon{background:#2563EB;}
    .feat-card:hover .feat-icon svg{stroke:#fff;}
    .feat-card-title{font-size:0.95rem;font-weight:700;color:#0d1b2a;margin-bottom:7px;}
    .feat-card-desc{font-size:0.82rem;color:#64748b;line-height:1.6;margin-bottom:14px;}
    .feat-card-link{font-size:0.78rem;font-weight:600;color:#2563EB;text-decoration:none!important;}
    .feat-card-link:hover{text-decoration:underline!important;}

    /* ══ STATS ══ */
    .stats-wrap{padding:56px 1.5rem;}
    @media(max-width:480px){.stats-wrap{padding:40px 1.2rem;}}
    .stats-inner{max-width:1120px;margin:0 auto;}
    .stats-title{font-size:clamp(1.5rem,2.5vw,2.1rem);font-weight:700;color:#0d1b2a;text-align:center;margin-bottom:6px;letter-spacing:-0.3px;}
    .stats-sub{font-size:0.9rem;color:#64748b;text-align:center;margin-bottom:40px;}
    .stats-grid{
      display:grid;grid-template-columns:repeat(4,1fr);
      border:1px solid #f1f5f9;border-radius:14px;overflow:hidden;
    }
    @media(max-width:640px){.stats-grid{grid-template-columns:repeat(2,1fr);}}
    .stat-cell{
      background:#f8fafc;padding:28px 16px;text-align:center;
      border-right:1px solid #f1f5f9;
    }
    .stat-cell:last-child{border-right:none;}
    @media(max-width:640px){
      .stat-cell:nth-child(2){border-right:none;}
      .stat-cell:nth-child(3){border-top:1px solid #f1f5f9;}
      .stat-cell:nth-child(4){border-top:1px solid #f1f5f9;border-right:none;}
    }
    .stat-num{font-size:1.75rem;font-weight:700;color:#2563EB;letter-spacing:-0.5px;margin-bottom:4px;}
    .stat-lbl{font-size:0.72rem;font-weight:500;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;}

    /* ══ CTA ══ */
    .cta-wrap{padding:0 1.5rem 48px;}
    @media(max-width:480px){.cta-wrap{padding:0 1rem 36px;}}
    .cta-card{
      max-width:1120px;margin:0 auto;
      background:#0d1b2a;border-radius:20px;
      padding:64px 3rem;text-align:center;
      position:relative;overflow:hidden;
    }
    .cta-blob{
      position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
      width:500px;height:250px;
      background:linear-gradient(135deg,rgba(37,99,235,0.35),rgba(99,102,241,0.2));
      filter:blur(70px);border-radius:50%;pointer-events:none;
    }
    .cta-inner{position:relative;z-index:1;}
    .cta h2{font-size:clamp(1.5rem,3vw,2.2rem);font-weight:700;color:#fff;margin-bottom:12px;letter-spacing:-0.5px;line-height:1.2;}
    .cta p{font-size:0.9rem;color:#94a3b8;margin-bottom:32px;line-height:1.7;}
    .cta-btns{display:flex;justify-content:center;align-items:center;gap:16px;flex-wrap:wrap;}
    .btn-cta-p{
      background:#2563EB;color:#fff!important;border:none;border-radius:10px;
      padding:13px 26px;font-size:0.9rem;font-weight:700;
      cursor:pointer;font-family:'Inter',sans-serif;
      text-decoration:none!important;display:inline-block;
      box-shadow:0 3px 10px rgba(37,99,235,0.35);transition:all 0.15s;
    }
    .btn-cta-p:hover{background:#1d4ed8;}
    .btn-cta-s{
      display:inline-flex;align-items:center;gap:5px;
      font-size:0.875rem;font-weight:600;color:#fff;
      text-decoration:none!important;opacity:0.8;transition:opacity 0.15s;
    }
    .btn-cta-s:hover{opacity:1;}
    @media(max-width:540px){
      .cta-card{padding:44px 1.5rem;}
      .cta-btns{flex-direction:column;gap:10px;}
      .btn-cta-p,.btn-cta-s{width:100%;text-align:center;justify-content:center;}
    }

    /* ══ FOOTER ══ */
    .footer{background:#fff;border-top:1px solid #f1f5f9;padding:18px 1.5rem;}
    @media(max-width:480px){
      .footer-inner{flex-direction:column;text-align:center;gap:8px;}
      .footer-icons{justify-content:center;}
    }
    .footer-inner{
      max-width:1120px;margin:0 auto;
      display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;
    }
    .footer-copy{font-size:0.72rem;color:#94a3b8;}
    .footer-icons{display:flex;gap:14px;}
    .footer-icon{color:#94a3b8;text-decoration:none!important;transition:color 0.15s;display:flex;}
    .footer-icon:hover{color:#64748b;}
    </style>

    <!-- NAVBAR -->
    <nav class="nav">
      <div class="nav-left">
        <div class="nav-icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M7 16V4m0 0L3 8m4-4l4 4"/><path d="M17 8v12m0 0l4-4m-4 4l-4-4"/>
          </svg>
        </div>
        <span class="nav-brand">CareerSync</span>
      </div>
      <div class="nav-center">
        <a class="nav-link" href="#features">Features</a>
        <a class="nav-link" href="#how-it-works">How it Works</a>
        <a class="nav-link" href="#pricing">Pricing</a>
      </div>
      <div class="nav-right">
        <a class="nav-login" href="/?nav=login">Log in</a>
        <a class="nav-cta"   href="/?nav=signup">Start Tracking</a>
      </div>
    </nav>

    <!-- HERO -->
    <section class="hero">
      <div>
        <div class="hero-tag">
          Introducing the new Skill Roadmap.
          <a href="/?nav=signup">Read more →</a>
        </div>
        <h1>Master your <span class="blue">career<br>trajectory.</span></h1>
        <p class="hero-desc">The minimalist tracking tool for modern professionals. Manage applications, cultivate networking relationships, and bridge skill gaps in one clean workspace.</p>
        <div class="hero-btns">
          <a class="btn-hero-p" href="/?nav=signup">Get Started for Free</a>
          <a class="btn-hero-s" href="/?nav=login">
            Watch demo
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none"/>
            </svg>
          </a>
        </div>
        <div class="trusted">
          <span class="trusted-lbl">Trusted by pros at</span>
          <div class="trusted-names">
            <span class="trusted-name">FORBES</span>
            <span class="trusted-name">TECHHUBS</span>
            <span class="trusted-name">MODERN.CO</span>
          </div>
        </div>
      </div>
      <div style="position:relative;">
        <div class="hero-glow"></div>
        <div class="hero-visual">
          <div class="hero-visual-inner">
            <div class="hero-ph">
              <svg viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
              </svg>
              <div class="hero-ph-line" style="width:140px;"></div>
              <div class="hero-ph-line" style="width:90px;"></div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- PROOF -->
    <div class="proof">
      <div class="proof-inner">
        <div class="proof-lbl">Trusted by candidates hired at</div>
        <div class="proof-logos">
          <div class="proof-logo"></div><div class="proof-logo"></div>
          <div class="proof-logo"></div><div class="proof-logo"></div>
          <div class="proof-logo"></div>
        </div>
      </div>
    </div>

    <!-- FEATURES -->
    <div id="features" class="feat-wrap">
      <div class="feat-inner">
        <div class="feat-eyebrow">Built for Clarity</div>
        <div class="feat-title">Everything you need, nothing you don't.</div>
        <div class="feat-sub">We've stripped away the noise to help you focus on what actually moves the needle in your career.</div>
        <div class="feat-grid">
          <div class="feat-card">
            <div class="feat-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
              </svg>
            </div>
            <div class="feat-card-title">Application Tracker</div>
            <div class="feat-card-desc">Visual pipelines to monitor every job application from initial contact to the final signed offer.</div>
            <a class="feat-card-link" href="/?nav=signup">Learn more →</a>
          </div>
          <div class="feat-card">
            <div class="feat-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
              </svg>
            </div>
            <div class="feat-card-title">Networking CRM</div>
            <div class="feat-card-desc">A professional relationship manager to keep mentors and peers within reach with smart follow-ups.</div>
            <a class="feat-card-link" href="/?nav=signup">Learn more →</a>
          </div>
          <div class="feat-card">
            <div class="feat-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
            </div>
            <div class="feat-card-title">Skill Roadmap</div>
            <div class="feat-card-desc">Bridge the expertise gap with structured learning goals integrated directly into your daily routine.</div>
            <a class="feat-card-link" href="/?nav=signup">Learn more →</a>
          </div>
        </div>
      </div>
    </div>

    <!-- STATS -->
    <div id="how-it-works" class="stats-wrap">
      <div class="stats-inner">
        <div class="stats-title">Empowering growth for thousands</div>
        <div class="stats-sub">Our users are landing roles at the world's most innovative companies.</div>
        <div class="stats-grid">
          <div class="stat-cell"><div class="stat-num">12k+</div><div class="stat-lbl">Active Professionals</div></div>
          <div class="stat-cell"><div class="stat-num">4.5k</div><div class="stat-lbl">Jobs Landed</div></div>
          <div class="stat-cell"><div class="stat-num">94%</div><div class="stat-lbl">Success Rate</div></div>
          <div class="stat-cell"><div class="stat-num">80k+</div><div class="stat-lbl">Skill Progress</div></div>
        </div>
      </div>
    </div>

    <!-- CTA -->
    <div id="pricing" class="cta-wrap">
      <div class="cta-card">
        <div class="cta-blob"></div>
        <div class="cta-inner">
          <div class="cta">
            <h2>Ready to take the next step in your career?</h2>
            <p>Join CareerSync today and start organizing your professional journey with purpose and clarity.</p>
            <div class="cta-btns">
              <a class="btn-cta-p" href="/?nav=signup">Get Started for Free</a>
              <a class="btn-cta-s" href="/?nav=login">Schedule a Demo →</a>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- FOOTER -->
    <footer class="footer">
      <div class="footer-inner">
        <span class="footer-copy">© 2026 CareerSync Inc. All rights reserved. Made for professional excellence.</span>
        <div class="footer-icons">
          <a class="footer-icon" href="#" title="Twitter">
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
              <path d="M13.682 10.622 20.239 3h-1.554l-5.693 6.618L8.445 3H3.203l6.875 10.007L3.203 21h1.554l6.012-6.989L15.368 21h5.242l-6.928-10.378Zm-2.129 2.474-.697-.996-5.543-7.924h2.387l4.474 6.397.697.996 5.815 8.312h-2.387l-4.746-6.785Z"/>
            </svg>
          </a>
          <a class="footer-icon" href="#" title="GitHub">
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
              <path clip-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" fill-rule="evenodd"/>
            </svg>
          </a>
        </div>
      </div>
    </footer>
    """, unsafe_allow_html=True)


# ══════════════════════════════════════════════════════════════════════════════

# ══════════════════════════════════════════════════════════════════════════════
# LOGIN — CSS-only card approach (no HTML wrapper around st.form)
# ══════════════════════════════════════════════════════════════════════════════
elif st.session_state.auth_view == "login":
    st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
html,body,.stApp,[data-testid="stAppViewContainer"],
section.main,[data-testid="stMain"]{
  background:#f0f2f5!important;font-family:'Inter',sans-serif!important;
  margin:0!important;padding:0!important;
}
/* Center the entire page content */
.block-container{
  padding:0!important;margin:0 auto!important;
  max-width:460px!important;
  padding-top:clamp(40px,8vh,80px)!important;
  padding-bottom:40px!important;
  padding-left:16px!important;
  padding-right:16px!important;
}
[data-testid="stVerticalBlock"]{gap:0!important;}

/* Logo area */
.login-logo-wrap{
  display:flex;align-items:center;justify-content:center;
  gap:10px;margin-bottom:28px;
}
.login-logo-icon{
  width:44px;height:44px;border-radius:12px;background:#2563EB;
  display:flex;align-items:center;justify-content:center;
}
.login-logo-text{font-size:1.15rem;font-weight:700;color:#0f172a;font-family:'Inter',sans-serif;}

/* Card — wrap the form visually */
[data-testid="stForm"]{
  background:#fff!important;
  border-radius:16px!important;
  border:1px solid #e2e8f0!important;
  padding:32px 32px 28px!important;
  box-shadow:0 2px 20px rgba(0,0,0,0.07)!important;
  margin-bottom:0!important;
}
@media(max-width:480px){
  [data-testid="stForm"]{padding:24px 20px 20px!important;}
  .block-container{padding-top:32px!important;}
}

/* Title + subtitle inside form — injected via st.markdown inside form */
.form-title{font-size:1.45rem;font-weight:800;color:#0f172a;margin-bottom:6px;letter-spacing:-0.4px;text-align:center;font-family:'Inter',sans-serif;}
.form-sub{font-size:0.875rem;color:#64748b;margin-bottom:24px;text-align:center;font-family:'Inter',sans-serif;}

/* Inputs */
div[data-testid="stTextInput"]{margin-bottom:4px!important;}
div[data-testid="stTextInput"] label{
  font-size:0.82rem!important;font-weight:600!important;
  color:#374151!important;font-family:'Inter',sans-serif!important;}
div[data-testid="stTextInput"] input{
  border-radius:10px!important;border:1.5px solid #e8edf2!important;
  background:#f8fafc!important;padding:12px 14px!important;
  color:#0f172a!important;font-size:0.9rem!important;
  font-family:'Inter',sans-serif!important;}
div[data-testid="stTextInput"] input:focus{
  border-color:#2563EB!important;background:#fff!important;
  box-shadow:0 0 0 3px rgba(37,99,235,0.1)!important;}
div[data-testid="stTextInput"] input::placeholder{color:#94a3b8!important;}

/* Submit button */
div[data-testid="stFormSubmitButton"]{margin-top:8px!important;}
div[data-testid="stFormSubmitButton"] button{
  width:100%!important;border-radius:10px!important;
  background:#2563EB!important;padding:14px!important;
  font-size:0.95rem!important;font-weight:700!important;
  color:#fff!important;border:none!important;
  font-family:'Inter',sans-serif!important;
  box-shadow:0 2px 10px rgba(37,99,235,0.25)!important;
  letter-spacing:-0.1px!important;}
div[data-testid="stFormSubmitButton"] button:hover{background:#1d4ed8!important;}

/* Below-card links */
.auth-below{
  margin-top:18px;text-align:center;
  font-size:0.875rem;color:#64748b;font-family:'Inter',sans-serif;
}
.auth-below a{color:#2563EB;font-weight:600;text-decoration:none!important;}
.auth-footer{
  margin-top:24px;text-align:center;
  font-size:0.72rem;color:#94a3b8;font-family:'Inter',sans-serif;
}

/* Ghost back button */
div.stButton>button{
  background:transparent!important;border:none!important;
  color:#94a3b8!important;font-size:0.78rem!important;font-weight:400!important;
  box-shadow:none!important;padding:2px!important;
  font-family:'Inter',sans-serif!important;width:100%!important;
  margin-top:4px!important;
}
div.stButton>button:hover{color:#64748b!important;}
</style>
""", unsafe_allow_html=True)

    # Logo
    st.markdown("""
<div class="login-logo-wrap">
  <div class="login-logo-icon">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M7 16V4m0 0L3 8m4-4l4 4"/><path d="M17 8v12m0 0l4-4m-4 4l-4-4"/>
    </svg>
  </div>
  <span class="login-logo-text">CareerSync</span>
</div>
""", unsafe_allow_html=True)

    # Form (card styled via CSS targeting [data-testid="stForm"])
    with st.form("login_form"):
        st.markdown('<div class="form-title">Welcome back</div><div class="form-sub">Please enter your details to sign in</div>', unsafe_allow_html=True)
        email    = st.text_input("Email address", placeholder="name@company.com")
        password = st.text_input("Password", placeholder="••••••••", type="password")
        sub      = st.form_submit_button("Sign in", use_container_width=True)

    if sub:
        if not email or not password:
            st.error("Please fill in all fields.")
        elif not supabase_ready():
            st.error("❌ Supabase not configured.")
        else:
            user = login_user(email, password)
            if user:
                _set_login(user)
                st.switch_page("pages/1_Dashboard.py")
            else:
                st.error("❌ Invalid email or password.")

    st.markdown("""
<div class="auth-below">
  Don't have an account?&nbsp;<a href="/?nav=signup">Sign up for free</a>
</div>
<div class="auth-footer">© 2026 CareerSync Inc. All rights reserved.</div>
""", unsafe_allow_html=True)

    _, bc, _ = st.columns([3, 2, 3])
    with bc:
        if st.button("← Back to home", key="back_home", use_container_width=True):
            go("landing"); st.rerun()


# ══════════════════════════════════════════════════════════════════════════════
# REGISTER — same CSS-only card approach
# ══════════════════════════════════════════════════════════════════════════════
elif st.session_state.auth_view == "register":
    st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
html,body,.stApp,[data-testid="stAppViewContainer"],
section.main,[data-testid="stMain"]{
  background:#f0f2f5!important;font-family:'Inter',sans-serif!important;
  margin:0!important;padding:0!important;
}
/* Top nav bar */
.reg-nav{
  position:fixed;top:0;left:0;right:0;z-index:999;
  height:56px;background:#fff;border-bottom:1px solid #f1f5f9;
  display:flex;align-items:center;justify-content:space-between;
  padding:0 clamp(1rem,4vw,2.5rem);
}
.reg-nav-logo{display:flex;align-items:center;gap:8px;}
.reg-nav-logo-icon{width:28px;height:28px;border-radius:7px;background:#2563EB;display:flex;align-items:center;justify-content:center;}
.reg-nav-brand{font-size:0.95rem;font-weight:700;color:#0f172a;font-family:'Inter',sans-serif;}
.reg-nav-right{display:flex;align-items:center;gap:10px;font-size:0.82rem;color:#64748b;font-family:'Inter',sans-serif;}
.reg-nav-link{color:#2563EB;font-weight:600;border:1.5px solid #2563EB;border-radius:7px;padding:6px 14px;text-decoration:none!important;font-size:0.82rem;white-space:nowrap;transition:all 0.15s;}
.reg-nav-link:hover{background:#2563EB;color:#fff!important;}
@media(max-width:480px){.reg-nav-right span{display:none;}}

/* Offset content below fixed nav */
.block-container{
  padding:0!important;margin:0 auto!important;
  max-width:500px!important;
  padding-top:clamp(72px,12vh,100px)!important;
  padding-bottom:40px!important;
  padding-left:16px!important;
  padding-right:16px!important;
}
[data-testid="stVerticalBlock"]{gap:0!important;}

/* Card */
[data-testid="stForm"]{
  background:#fff!important;
  border-radius:16px!important;
  border:1px solid #e2e8f0!important;
  padding:32px 32px 28px!important;
  box-shadow:0 2px 20px rgba(0,0,0,0.07)!important;
}
@media(max-width:480px){
  [data-testid="stForm"]{padding:24px 18px 20px!important;}
}

.form-title{font-size:1.4rem;font-weight:800;color:#0f172a;margin-bottom:5px;letter-spacing:-0.4px;font-family:'Inter',sans-serif;}
.form-sub{font-size:0.875rem;color:#64748b;margin-bottom:24px;font-family:'Inter',sans-serif;}

div[data-testid="stTextInput"]{margin-bottom:2px!important;}
div[data-testid="stTextInput"] label{
  font-size:0.82rem!important;font-weight:600!important;
  color:#374151!important;font-family:'Inter',sans-serif!important;}
div[data-testid="stTextInput"] input{
  border-radius:10px!important;border:1.5px solid #e8edf2!important;
  background:#f8fafc!important;padding:11px 14px!important;
  color:#0f172a!important;font-size:0.875rem!important;
  font-family:'Inter',sans-serif!important;}
div[data-testid="stTextInput"] input:focus{
  border-color:#2563EB!important;background:#fff!important;
  box-shadow:0 0 0 3px rgba(37,99,235,0.1)!important;}
div[data-testid="stTextInput"] input::placeholder{color:#94a3b8!important;}

div[data-testid="stFormSubmitButton"]{margin-top:8px!important;}
div[data-testid="stFormSubmitButton"] button{
  width:100%!important;border-radius:10px!important;
  background:#2563EB!important;padding:14px!important;
  font-size:0.95rem!important;font-weight:700!important;
  color:#fff!important;border:none!important;
  font-family:'Inter',sans-serif!important;
  box-shadow:0 2px 10px rgba(37,99,235,0.25)!important;
  letter-spacing:-0.1px!important;}
div[data-testid="stFormSubmitButton"] button:hover{background:#1d4ed8!important;}

.auth-below{margin-top:18px;text-align:center;font-size:0.875rem;color:#64748b;font-family:'Inter',sans-serif;}
.auth-below a{color:#2563EB;font-weight:600;text-decoration:none!important;}
.auth-footer{margin-top:20px;text-align:center;font-size:0.72rem;color:#94a3b8;font-family:'Inter',sans-serif;}
.auth-footer a{color:#94a3b8;text-decoration:none!important;margin:0 5px;}

div.stButton>button{
  background:transparent!important;border:none!important;
  color:#94a3b8!important;font-size:0.78rem!important;font-weight:400!important;
  box-shadow:none!important;padding:2px!important;
  font-family:'Inter',sans-serif!important;width:100%!important;
}
div.stButton>button:hover{color:#64748b!important;}
</style>
""", unsafe_allow_html=True)

    # Fixed top nav
    st.markdown("""
<div class="reg-nav">
  <div class="reg-nav-logo">
    <div class="reg-nav-logo-icon">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M7 16V4m0 0L3 8m4-4l4 4"/><path d="M17 8v12m0 0l4-4m-4 4l-4-4"/>
      </svg>
    </div>
    <span class="reg-nav-brand">CareerSync</span>
  </div>
  <div class="reg-nav-right">
    <span>Already have an account?</span>
    <a class="reg-nav-link" href="/?nav=login">Log in</a>
  </div>
</div>
""", unsafe_allow_html=True)

    # Form card
    with st.form("register_form"):
        st.markdown('<div class="form-title">Create your account</div><div class="form-sub">Join thousands of professionals today.</div>', unsafe_allow_html=True)
        name  = st.text_input("Full Name",        placeholder="Enter your full name")
        r_em  = st.text_input("Email Address",    placeholder="name@company.com")
        r_pw  = st.text_input("Password",         placeholder="Create a strong password", type="password")
        r_pw2 = st.text_input("Confirm Password", placeholder="Repeat your password",     type="password")
        st.markdown("""
<div style="margin:10px 0 4px;padding-top:10px;border-top:1px solid #f1f5f9;">
  <p style="font-size:0.68rem;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:.06em;margin-bottom:3px;font-family:'Inter',sans-serif;">📬 Gmail Sync</p>
  <p style="font-size:0.7rem;color:#94a3b8;margin:0;font-family:'Inter',sans-serif;">
    <a href="https://myaccount.google.com/apppasswords" target="_blank" style="color:#2563EB;font-weight:600;text-decoration:none;">Get App Password →</a>
    &nbsp;App: Mail · Device: Other · Name: CareerSync
  </p>
</div>
""", unsafe_allow_html=True)
        gm_acc  = st.text_input("Your Gmail Address", placeholder="yourname@gmail.com")
        gm_pass = st.text_input("Gmail App Password", placeholder="abcd efgh ijkl mnop", type="password")
        sub     = st.form_submit_button("Create Account", use_container_width=True)

    if sub:
        if r_pw != r_pw2:
            st.error("❌ Passwords don't match.")
        elif not supabase_ready():
            st.error("❌ Supabase not configured.")
        else:
            ok, msg = register_user(name=name, email=r_em, password=r_pw,
                                    gmail_account=gm_acc, gmail_app_password=gm_pass)
            if ok:
                st.success("✅ Account created! Signing you in...")
                user = login_user(r_em, r_pw)
                if user:
                    _set_login(user)
                    st.switch_page("pages/1_Dashboard.py")
            else:
                st.error(f"❌ {msg}")

    st.markdown("""
<div class="auth-below">
  Already have an account?&nbsp;<a href="/?nav=login">Log in</a>
</div>
<div class="auth-footer">
  <a href="#">Help</a> · <a href="#">Privacy</a> · <a href="#">Terms</a><br>
  © 2026 CareerSync Inc. All rights reserved.
</div>
""", unsafe_allow_html=True)