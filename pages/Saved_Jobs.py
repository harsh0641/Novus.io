import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(__file__)), "src"))

import streamlit as st
import pandas as pd
from datetime import datetime, timedelta
from database import get_all_applications, update_stage, delete_application, update_recruiter_info
from recruiter_finder import enrich_application

st.set_page_config(page_title="Saved Jobs · CareerSync", page_icon="📁", layout="wide")

# ── CSS (same light theme) ────────────────────────────────────────────────────
st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

:root, [data-theme="dark"], [data-theme="light"] {
    --background-color:           #f8fafc !important;
    --secondary-background-color: #f1f5f9 !important;
    --text-color:                 #0f172a !important;
    --primary-color:              #2563eb !important;
}
html, body, [class*="css"] { font-family: 'Inter', sans-serif !important; background-color: #f8fafc !important; color: #0f172a !important; }
.stApp, section.main, [data-testid="stAppViewContainer"], [data-testid="stMain"] {
    background-color: #f8fafc !important; color: #0f172a !important;
}
.block-container { padding-top: 2.5rem !important; padding-bottom: 4rem !important; max-width: 1200px !important; }

div.stButton > button {
    background-color: #ffffff !important; color: #475569 !important;
    border: 1px solid #e2e8f0 !important; border-radius: 8px !important;
    font-weight: 600 !important; font-size: 0.9rem !important;
    font-family: 'Inter', sans-serif !important; padding: 0.5rem 1rem !important;
    box-shadow: 0 1px 2px rgba(0,0,0,0.05) !important;
}
div.stButton > button:hover { background-color: #f8fafc !important; color: #0f172a !important; border-color: #cbd5e1 !important; }
div.stButton > button[kind="primary"] { background-color: #2563eb !important; color: #ffffff !important; border-color: #2563eb !important; }
div.stButton > button[kind="primary"]:hover { background-color: #1d4ed8 !important; }

div[data-testid="stTextInput"] input { background-color: #ffffff !important; color: #0f172a !important; border: 1px solid #e2e8f0 !important; border-radius: 8px !important; }
div[data-testid="stSelectbox"] div[data-baseweb="select"] > div { background-color: #ffffff !important; color: #0f172a !important; border: 1px solid #e2e8f0 !important; border-radius: 8px !important; }
div[data-testid="stSelectbox"] label, div[data-testid="stTextInput"] label { color: #374151 !important; font-size: 0.88rem !important; font-weight: 500 !important; }
[role="option"] { background-color: #ffffff !important; color: #0f172a !important; }
[role="option"]:hover, [aria-selected="true"] { background-color: #eff6ff !important; color: #2563eb !important; }
[data-testid="stTabs"] button { color: #64748b !important; border-bottom: 2px solid transparent !important; font-weight: 600 !important; }
[data-testid="stTabs"] button[aria-selected="true"] { color: #2563eb !important; border-bottom-color: #2563eb !important; }
[data-testid="stExpander"] { background-color: #ffffff !important; border: 1px solid #e2e8f0 !important; border-radius: 10px !important; }

/* Page header */
.arch-header {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 8px;
}
.arch-title { font-size: 2rem; font-weight: 800; color: #0f172a !important; letter-spacing: -0.6px; }
.arch-sub   { font-size: 0.95rem; color: #64748b !important; margin-top: 2px; margin-bottom: 20px; }

/* Stat cards */
.stat-card {
    background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px;
    padding: 22px 20px; text-align: center;
    box-shadow: 0 2px 6px rgba(0,0,0,0.04);
    height: 110px; display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    transition: transform 0.2s, box-shadow 0.2s;
}
.stat-card:hover { transform: translateY(-2px); box-shadow: 0 8px 16px rgba(0,0,0,0.07); }
.stat-num   { font-size: 2.1rem; font-weight: 800; line-height: 1; margin-bottom: 6px; }
.stat-label { font-size: 0.7rem; color: #64748b !important; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; }

/* Timeline badge */
.timeline-badge {
    display: inline-flex; align-items: center; gap: 6px;
    background: #fef3c7; color: #92400e !important;
    border: 1px solid #fde68a; border-radius: 20px;
    padding: 4px 12px; font-size: 0.75rem; font-weight: 600;
    margin-bottom: 20px;
}

/* Table */
.table-container {
    background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px;
    overflow-x: auto; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.03); margin-top: 12px;
}
.cs-table { width: 100%; border-collapse: collapse; min-width: 800px; }
.cs-table th {
    background: #f8fafc; color: #475569 !important; font-weight: 600; font-size: 0.75rem;
    text-transform: uppercase; letter-spacing: 0.5px; padding: 16px 24px;
    border-bottom: 1px solid #e2e8f0; text-align: left; white-space: nowrap;
}
.cs-table td { padding: 18px 24px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; color: #334155 !important; font-size: 0.85rem; }
.cs-table tr:hover td { background: #f8fafc; }
.cs-table tr:last-child td { border-bottom: none; }
.co-name  { font-weight: 700; color: #0f172a !important; font-size: 0.95rem; }
.job-role { color: #475569 !important; font-weight: 500; }
.date-txt { color: #64748b !important; font-size: 0.8rem; }
.age-chip {
    display: inline-block; background: #f1f5f9; color: #64748b !important;
    border-radius: 20px; padding: 2px 10px; font-size: 0.72rem; font-weight: 600;
}

.badge { display: inline-flex; align-items: center; justify-content: center; padding: 4px 12px; border-radius: 6px; font-size: 0.75rem; font-weight: 600; }
.b-applied   { background: #eff6ff; color: #2563eb !important; }
.b-interview { background: #fefce8; color: #d97706 !important; }
.b-offer     { background: #f0fdf4; color: #16a34a !important; }
.b-rejected  { background: #fef2f2; color: #dc2626 !important; }
.b-other     { background: #f1f5f9; color: #475569 !important; }

.rec-card { display: flex; flex-direction: column; gap: 4px; }
.rec-name { font-weight: 600; color: #0f172a !important; font-size: 0.85rem; }
.rec-title { color: #64748b !important; font-size: 0.75rem; }
.rec-li {
    display: inline-flex; align-items: center; gap: 4px; background: #ffffff;
    color: #2563eb !important; border: 1px solid #bfdbfe; border-radius: 6px;
    padding: 4px 10px; font-size: 0.7rem; font-weight: 600; text-decoration: none;
    margin-top: 4px; width: fit-content;
}
.email-chip {
    display: inline-flex; align-items: center; gap: 4px; background: #ffffff;
    color: #16a34a !important; border: 1px solid #bbf7d0; border-radius: 6px;
    padding: 4px 10px; font-size: 0.7rem; font-weight: 600; text-decoration: none; width: fit-content;
}
.no-data { color: #cbd5e1 !important; font-size: 0.8rem; font-style: italic; }

/* Section divider with label */
.section-sep {
    display: flex; align-items: center; gap: 12px; margin: 28px 0 16px;
}
.section-sep-line { flex: 1; height: 1px; background: #e2e8f0; }
.section-sep-label { font-size: 0.75rem; font-weight: 700; color: #94a3b8 !important; text-transform: uppercase; letter-spacing: 0.6px; white-space: nowrap; }

hr { border-color: #e2e8f0 !important; }
</style>
""", unsafe_allow_html=True)

# ── Load all data ─────────────────────────────────────────────────────────────
all_apps = get_all_applications()
df_all = pd.DataFrame(all_apps) if all_apps else pd.DataFrame(columns=[
    "id","company_name","position","stage","applied_date","last_updated",
    "email_subject","recruiter_email","recruiter_name","recruiter_title","linkedin_url"])

for col in ["recruiter_email","recruiter_name","recruiter_title","linkedin_url"]:
    if col not in df_all.columns: df_all[col] = ""
    df_all[col] = df_all[col].fillna("").astype(str)
if "stage" not in df_all.columns: df_all["stage"] = "Applied"

# ── Split: current (≤60 days) vs archive (>60 days) ──────────────────────────
cutoff = datetime.now() - timedelta(days=60)

def parse_date(d):
    try: return datetime.strptime(str(d).strip(), "%Y-%m-%d")
    except: return None

df_all["_date"] = df_all["applied_date"].apply(parse_date)
df_archive = df_all[df_all["_date"].apply(lambda d: d is not None and d < cutoff)].copy()
df_archive = df_archive.drop(columns=["_date"])

# ── Header ────────────────────────────────────────────────────────────────────
st.markdown('<div class="arch-title">📁 Saved Jobs Archive</div>', unsafe_allow_html=True)
st.markdown('<div class="arch-sub">All job applications older than 60 days · Permanently saved from every past sync</div>', unsafe_allow_html=True)

st.markdown(f"""
<div class="timeline-badge">
  🗓️ Showing jobs applied before {cutoff.strftime("%b %d, %Y")} — older than 60 days
</div>
""", unsafe_allow_html=True)

if df_archive.empty:
    st.info("No archived jobs yet. Applications older than 60 days will automatically appear here after your first sync.")
    st.stop()

# ── Stats ─────────────────────────────────────────────────────────────────────
a_total  = len(df_archive)
a_offer  = len(df_archive[df_archive.stage == "Offer"])
a_rej    = len(df_archive[df_archive.stage == "Rejected"])
a_inter  = len(df_archive[df_archive.stage == "Interview"])
a_app    = len(df_archive[df_archive.stage == "Applied"])
a_rec    = len(df_archive[df_archive.linkedin_url.str.len() > 0])

c1,c2,c3,c4,c5,c6 = st.columns(6)
for col, label, val, color in zip(
    [c1,c2,c3,c4,c5,c6],
    ["Total Archived","Applied","Interviews","Offers","Rejected","Recruiters Found"],
    [a_total, a_app, a_inter, a_offer, a_rej, a_rec],
    ["#0f172a","#2563eb","#d97706","#16a34a","#dc2626","#7c3aed"],
):
    with col:
        st.markdown(f"""
        <div class="stat-card">
            <div class="stat-num" style="color:{color}">{val}</div>
            <div class="stat-label">{label}</div>
        </div>""", unsafe_allow_html=True)

st.markdown("<br>", unsafe_allow_html=True)
st.divider()

# ── Filters ───────────────────────────────────────────────────────────────────
f1, f2, f3 = st.columns([3, 1, 1])
with f1:
    search = st.text_input("🔍 Search company or job title", placeholder="e.g. Google, Engineer...", key="arch_search")
with f2:
    stage_f = st.selectbox("Stage", ["All","Applied","Interview","Offer","Rejected"], key="arch_stage")
with f3:
    rec_f = st.selectbox("Recruiter", ["All","Found","Not Found"], key="arch_rec")

filtered = df_archive.copy()
if search:
    m = (filtered.company_name.str.contains(search, case=False, na=False) |
         filtered.position.str.contains(search, case=False, na=False))
    filtered = filtered[m]
if stage_f != "All":
    filtered = filtered[filtered.stage == stage_f]
if rec_f == "Found":
    filtered = filtered[filtered.linkedin_url.str.len() > 0]
elif rec_f == "Not Found":
    filtered = filtered[filtered.linkedin_url.str.len() == 0]

# ── Table ─────────────────────────────────────────────────────────────────────
st.markdown(f"<h3 style='font-size:1.1rem;font-weight:700;color:#0f172a;margin-bottom:4px;'>📋 Archived Applications ({len(filtered)})</h3>", unsafe_allow_html=True)

BADGE = {"Applied":"b-applied","Interview":"b-interview","Offer":"b-offer","Rejected":"b-rejected"}

if filtered.empty:
    st.info("No archived applications match your filters.")
else:
    def days_ago(d_str):
        try:
            d = datetime.strptime(str(d_str).strip(), "%Y-%m-%d")
            n = (datetime.now() - d).days
            if n < 365: return f"{n}d ago"
            return f"{n//365}y {(n%365)//30}m ago"
        except: return "—"

    rows_html = ""
    for _, r in filtered.iterrows():
        badge_cls = BADGE.get(r["stage"], "b-other")
        age = days_ago(r["applied_date"])

        name  = str(r.get("recruiter_name","")).strip()
        title = str(r.get("recruiter_title","")).strip()
        li    = str(r.get("linkedin_url","")).strip()
        em    = str(r.get("recruiter_email","")).strip()

        if name and li:
            rec_html = f'<div class="rec-card"><span class="rec-name">👤 {name}</span><span class="rec-title">{title}</span><a href="{li}" target="_blank" class="rec-li">🔗 View LinkedIn</a></div>'
        elif li:
            rec_html = f'<a href="{li}" target="_blank" class="rec-li">🔗 View LinkedIn</a>'
        else:
            rec_html = '<span class="no-data">Not found</span>'

        email_html = f'<a href="mailto:{em}" class="email-chip">✉️ {em}</a>' if em else '<span class="no-data">—</span>'

        rows_html += f"""<tr>
<td><span class="co-name">{r['company_name']}</span></td>
<td><span class="job-role">{r['position']}</span></td>
<td><span class="badge {badge_cls}">{r['stage']}</span></td>
<td><span class="date-txt">{r['applied_date']}</span><br><span class="age-chip">{age}</span></td>
<td>{rec_html}</td>
<td>{email_html}</td>
</tr>"""

    st.markdown(f"""<div class="table-container">
<table class="cs-table">
<thead><tr>
<th>Company</th><th>Job Title</th><th>Stage</th>
<th>Applied Date</th><th>Recruiter (LinkedIn)</th><th>Recruiter Email</th>
</tr></thead>
<tbody>{rows_html}</tbody>
</table>
</div>""", unsafe_allow_html=True)

st.divider()

# ── Manage archived entries ───────────────────────────────────────────────────
st.markdown("<h3 style='font-size:1.15rem;font-weight:700;color:#0f172a;'>⚙️ Manage Archived Applications</h3>", unsafe_allow_html=True)

tab1, tab2, tab3 = st.tabs(["✏️ Update Stage", "🔍 Find Recruiter", "🗑️ Delete"])

with tab1:
    opts = {f"{r['company_name']} — {r['position']}": r['id'] for _, r in df_archive.iterrows()}
    c1, c2 = st.columns(2)
    with c1:
        sel = st.selectbox("Application", list(opts.keys()), key="at1_sel")
    with c2:
        ns = st.selectbox("New Stage", ["Applied","Interview","Offer","Rejected"], key="at1_ns")
    st.markdown("<br>", unsafe_allow_html=True)
    if st.button("Update Stage", key="at1_btn", type="primary"):
        update_stage(opts[sel], ns)
        st.success(f"Updated to **{ns}**.")
        st.rerun()

with tab2:
    opts2 = {f"{r['company_name']} — {r['position']}": (r['id'], r['company_name']) for _, r in df_archive.iterrows()}
    sel2 = st.selectbox("Select application", list(opts2.keys()), key="at2_sel")
    app_id2, company2 = opts2[sel2]
    col_a, col_b = st.columns(2)
    with col_a:
        st.markdown("<br>", unsafe_allow_html=True)
        if st.button("🔍 Auto-find Recruiter", key="at2_find", use_container_width=True, type="primary"):
            with st.spinner(f"Searching for recruiter at {company2}..."):
                info = enrich_application(company2)
                update_recruiter_info(app_id2,
                    info.get("recruiter_email",""), info.get("recruiter_name",""),
                    info.get("recruiter_title",""), info.get("linkedin_url",""))
                if info.get("recruiter_name"):
                    st.success(f"Found: **{info['recruiter_name']}**")
                elif info.get("linkedin_url"):
                    st.success(f"Found LinkedIn: {info['linkedin_url']}")
                else:
                    st.warning("No recruiter found.")
                st.rerun()
    with col_b:
        with st.expander("✏️ Override manually"):
            me = st.text_input("Email",    key="at2_me")
            mn = st.text_input("Name",     key="at2_mn")
            mt = st.text_input("Title",    key="at2_mt")
            ml = st.text_input("LinkedIn", key="at2_ml")
            if st.button("💾 Save", key="at2_save"):
                update_recruiter_info(app_id2, me, mn, mt, ml)
                st.success("Saved!")
                st.rerun()

with tab3:
    d_opts = {f"{r['company_name']} — {r['position']}": r['id'] for _, r in df_archive.iterrows()}
    d_sel  = st.selectbox("Select to delete", list(d_opts.keys()), key="at3_sel")
    st.markdown("<br>", unsafe_allow_html=True)
    if st.button("🗑️ Delete", type="primary", key="at3_btn"):
        delete_application(d_opts[d_sel])
        st.success("Deleted.")
        st.rerun()

st.divider()
st.caption("CareerSync · Saved Jobs Archive · All data stored locally in job_tracker.db · ❤️")