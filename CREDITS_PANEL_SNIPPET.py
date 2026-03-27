"""
════════════════════════════════════════════════════════════
  HOW TO ADD THE CREDITS PANEL TO YOUR EXISTING app.py
════════════════════════════════════════════════════════════

STEP 1 — Add this import near the top of app.py (after other imports):

    try:
        import sys, os
        sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))
        from credits_tracker import get_all as credits_get_all, SERVICES as CREDIT_SERVICES
        _CREDITS_OK = True
    except ImportError:
        _CREDITS_OK = False

────────────────────────────────────────────────────────────
STEP 2 — Add this CSS inside your existing st.markdown(\"\"\"<style>...\"\"\") block:

    /* ── Credits Panel ── */
    .credit-panel-wrap {
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 20px;
        box-shadow: 0 4px 6px -1px rgba(0,0,0,0.04);
    }
    .credit-panel-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 20px;
    }
    .credit-panel-title {
        font-size: 1rem;
        font-weight: 700;
        color: #0f172a;
    }
    .credit-item { margin-bottom: 18px; }
    .credit-item:last-of-type { margin-bottom: 0; }
    .credit-item-top {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        margin-bottom: 5px;
    }
    .credit-name { font-size: .875rem; font-weight: 700; color: #0f172a; }
    .credit-sub  { font-size: .72rem;  color: #94a3b8; margin-top: 2px; }
    .credit-count{ font-size: .78rem;  font-weight: 700; color: #334155; }
    .credit-bar-bg {
        height: 8px;
        background: #f1f5f9;
        border-radius: 9999px;
        overflow: hidden;
    }
    .credit-bar-fill {
        height: 100%;
        border-radius: 9999px;
        transition: width .5s ease;
    }
    .credit-divider { height: 1px; background: #f1f5f9; margin: 18px 0; }
    .upgrade-btn {
        display: flex; width: 100%;
        justify-content: center;
        padding: 11px; border-radius: 10px;
        border: 1px solid #e2e8f0; background: white;
        font-size: .9rem; font-weight: 700; color: #0f172a;
        cursor: pointer; font-family: 'Inter', sans-serif;
        transition: background .15s;
    }
    .upgrade-btn:hover { background: #f8fafc; }
    .pro-tip-card {
        background: rgba(37,99,235,.06);
        border: 1px solid rgba(37,99,235,.15);
        border-radius: 12px; padding: 18px;
        display: flex; gap: 12px; align-items: flex-start;
        margin-top: 16px;
    }
    .pro-tip-icon { font-size: 1.4rem; flex-shrink: 0; }
    .pro-tip-title { font-size: .9rem; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
    .pro-tip-text  { font-size: .82rem; color: #475569; line-height: 1.55; }

────────────────────────────────────────────────────────────
STEP 3 — Place the credits panel function ABOVE your stat cards section:

    def _build_credits_panel() -> str:
        \"\"\"Returns HTML for the Credit Usage panel matching Image 2.\"\"\"
        if not _CREDITS_OK:
            return '<div class="credit-panel-wrap"><p style="color:#94a3b8;font-size:.85rem;">credits_tracker not loaded.</p></div>'

        state = credits_get_all()

        # Which 3 services to show prominently (matching Image 2)
        SHOW = [
            ("google_cse", "Google Custom Search", "Search API calls",       "#2563EB"),
            ("hunter",     "Hunter.io",            "Email finding credits",   "#22c55e"),
            ("groq",       "Groq AI",              "Cover letter generation", "#8b5cf6"),
        ]

        items_html = ""
        for key, name, sub, color in SHOW:
            svc    = CREDIT_SERVICES.get(key, {})
            entry  = state.get(key, {})
            total  = svc.get("total", 100)
            used   = entry.get("used", 0)
            pct    = max(2, int((used / total) * 100)) if total > 0 else 0
            items_html += f'''
    <div class="credit-item">
      <div class="credit-item-top">
        <div>
          <div class="credit-name">{name}</div>
          <div class="credit-sub">{sub}</div>
        </div>
        <span class="credit-count">{used:,} / {total:,}</span>
      </div>
      <div class="credit-bar-bg">
        <div class="credit-bar-fill" style="background:{color};width:{pct}%;"></div>
      </div>
    </div>'''

        return f'''
    <div class="credit-panel-wrap">
      <div class="credit-panel-header">
        <span class="credit-panel-title">Credit Usage</span>
        <span style="font-size:1.1rem;cursor:pointer;" title="Refresh">&#x21bb;</span>
      </div>
      {items_html}
      <div class="credit-divider"></div>
      <button class="upgrade-btn">Upgrade Plan</button>
    </div>
    <div class="pro-tip-card">
      <span class="pro-tip-icon">&#128161;</span>
      <div>
        <div class="pro-tip-title">Pro Tip</div>
        <div class="pro-tip-text">Syncing your Gmail daily improves response tracking accuracy by up to 45%.</div>
      </div>
    </div>'''

────────────────────────────────────────────────────────────
STEP 4 — Find the section where you render your table and wrap it in a 2-column layout.

Replace this (approximate) in your existing app.py:

    st.markdown(build_table(page_df), unsafe_allow_html=True)

With this:

    # Two-column layout: table (left 2/3) + credits (right 1/3)
    col_left, col_right = st.columns([2, 1], gap="medium")

    with col_left:
        st.markdown(
            "<h3 style='font-size:1.1rem;font-weight:700;color:#0f172a;margin-bottom:12px;'>"
            "Recent Applications</h3>",
            unsafe_allow_html=True,
        )
        st.markdown(build_table(page_df), unsafe_allow_html=True)   # your existing table

    with col_right:
        st.markdown(
            "<div style='display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;'>"
            "<span style='font-size:1.1rem;font-weight:700;color:#0f172a;'>Credit Usage</span>"
            "</div>",
            unsafe_allow_html=True,
        )
        st.markdown(_build_credits_panel(), unsafe_allow_html=True)

────────────────────────────────────────────────────────────
STEP 5 — Consume credits automatically in your existing sync code.

Find where you call enrich_all() or enrich_application() and add:

    if _CREDITS_OK:
        from credits_tracker import consume
        consume("google_cse", 1)   # after each Google CSE call
        consume("hunter",     1)   # after each Hunter call
        consume("groq",       1)   # after each Groq AI call

NOTE: recruiter_finder.py already calls credits_tracker.consume() internally
      if it finds the module — so this is only needed for manual Groq calls
      in the cold email generator.
════════════════════════════════════════════════════════════
"""

# ════════════════════════════════════════════════════════════
#  SELF-CONTAINED WORKING VERSION
#  If you'd prefer a clean full replacement of just the
#  credits + layout section, here is a minimal standalone
#  demo you can test independently:
# ════════════════════════════════════════════════════════════

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))

import streamlit as st

try:
    from credits_tracker import get_all as credits_get_all, SERVICES as CREDIT_SERVICES, reset_all, reset_service
    _CREDITS_OK = True
except ImportError:
    _CREDITS_OK = False

st.set_page_config(page_title="Credits Demo", layout="wide")

st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
html,body,[class*="css"]{font-family:'Inter',sans-serif!important;}

.credit-panel-wrap{background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;
    padding:20px;box-shadow:0 4px 6px -1px rgba(0,0,0,.04);}
.credit-panel-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;}
.credit-panel-title{font-size:1rem;font-weight:700;color:#0f172a;}
.credit-item{margin-bottom:18px;}
.credit-item:last-of-type{margin-bottom:0;}
.credit-item-top{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:5px;}
.credit-name{font-size:.875rem;font-weight:700;color:#0f172a;}
.credit-sub{font-size:.72rem;color:#94a3b8;margin-top:2px;}
.credit-count{font-size:.78rem;font-weight:700;color:#334155;}
.credit-bar-bg{height:8px;background:#f1f5f9;border-radius:9999px;overflow:hidden;}
.credit-bar-fill{height:100%;border-radius:9999px;transition:width .5s ease;}
.credit-divider{height:1px;background:#f1f5f9;margin:18px 0;}
.upgrade-btn{display:flex;width:100%;justify-content:center;padding:11px;border-radius:10px;
    border:1px solid #e2e8f0;background:white;font-size:.9rem;font-weight:700;
    color:#0f172a;cursor:pointer;font-family:'Inter',sans-serif;transition:background .15s;}
.upgrade-btn:hover{background:#f8fafc;}
.pro-tip-card{background:rgba(37,99,235,.06);border:1px solid rgba(37,99,235,.15);
    border-radius:12px;padding:18px;display:flex;gap:12px;align-items:flex-start;margin-top:16px;}
.pro-tip-icon{font-size:1.4rem;flex-shrink:0;}
.pro-tip-title{font-size:.9rem;font-weight:700;color:#0f172a;margin-bottom:4px;}
.pro-tip-text{font-size:.82rem;color:#475569;line-height:1.55;}
</style>
""", unsafe_allow_html=True)


def _build_credits_panel() -> str:
    if not _CREDITS_OK:
        return '<div class="credit-panel-wrap"><p style="color:#94a3b8;">credits_tracker not found in src/.</p></div>'

    state = credits_get_all()

    SHOW = [
        ("google_cse", "Google Custom Search", "Search API calls",        "#2563EB"),
        ("hunter",     "Hunter.io",            "Email finding credits",    "#22c55e"),
        ("groq",       "Groq AI",              "Cover letter generation",  "#8b5cf6"),
    ]

    items_html = ""
    for key, name, sub, color in SHOW:
        svc   = CREDIT_SERVICES.get(key, {})
        entry = state.get(key, {})
        total = svc.get("total", 100)
        used  = entry.get("used", 0)
        pct   = max(2, int((used / total) * 100)) if total > 0 else 0
        items_html += f"""
<div class="credit-item">
  <div class="credit-item-top">
    <div>
      <div class="credit-name">{name}</div>
      <div class="credit-sub">{sub}</div>
    </div>
    <span class="credit-count">{used:,} / {total:,}</span>
  </div>
  <div class="credit-bar-bg">
    <div class="credit-bar-fill" style="background:{color};width:{pct}%;"></div>
  </div>
</div>"""

    return f"""
<div class="credit-panel-wrap">
  <div class="credit-panel-header">
    <span class="credit-panel-title">Credit Usage</span>
    <span style="font-size:1.1rem;cursor:pointer;color:#64748b;" title="Refresh">&#x21bb;</span>
  </div>
  {items_html}
  <div class="credit-divider"></div>
  <button class="upgrade-btn">Upgrade Plan</button>
</div>
<div class="pro-tip-card">
  <span class="pro-tip-icon">&#128161;</span>
  <div>
    <div class="pro-tip-title">Pro Tip</div>
    <div class="pro-tip-text">Syncing your Gmail daily improves response tracking accuracy by up to 45%.</div>
  </div>
</div>"""


# ── Demo layout ───────────────────────────────────────────
st.title("Credits Panel Demo")
st.caption("This shows how the Credit Usage panel looks in the dashboard")

col_table, col_credits = st.columns([2, 1], gap="medium")

with col_table:
    st.markdown("""
    <div style="background:white;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;padding:0;">
      <table style="width:100%;border-collapse:collapse;font-family:'Inter',sans-serif;">
        <thead><tr style="background:#f8fafc;border-bottom:1px solid #e2e8f0;">
          <th style="padding:14px 20px;font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:#94a3b8;text-align:left;">Company</th>
          <th style="padding:14px 20px;font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:#94a3b8;text-align:left;">Position</th>
          <th style="padding:14px 20px;font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:#94a3b8;text-align:left;">Date Applied</th>
          <th style="padding:14px 20px;font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:#94a3b8;text-align:right;">Stage</th>
        </tr></thead>
        <tbody>
          <tr style="border-bottom:1px solid #f1f5f9;">
            <td style="padding:16px 20px;"><div style="display:flex;align-items:center;gap:12px;"><div style="width:32px;height:32px;border-radius:8px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;font-size:.75rem;font-weight:700;color:#475569;">G</div><span style="font-weight:600;color:#0f172a;">Google</span></div></td>
            <td style="padding:16px 20px;color:#64748b;">Senior Software Engineer</td>
            <td style="padding:16px 20px;color:#64748b;">Oct 24, 2023</td>
            <td style="padding:16px 20px;text-align:right;"><span style="background:#dbeafe;color:#1d4ed8;padding:4px 10px;border-radius:20px;font-size:.75rem;font-weight:700;">Interview</span></td>
          </tr>
          <tr style="border-bottom:1px solid #f1f5f9;">
            <td style="padding:16px 20px;"><div style="display:flex;align-items:center;gap:12px;"><div style="width:32px;height:32px;border-radius:8px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;font-size:.75rem;font-weight:700;color:#475569;">S</div><span style="font-weight:600;color:#0f172a;">Stripe</span></div></td>
            <td style="padding:16px 20px;color:#64748b;">Product Designer</td>
            <td style="padding:16px 20px;color:#64748b;">Oct 23, 2023</td>
            <td style="padding:16px 20px;text-align:right;"><span style="background:#f1f5f9;color:#475569;padding:4px 10px;border-radius:20px;font-size:.75rem;font-weight:700;">Applied</span></td>
          </tr>
          <tr style="border-bottom:1px solid #f1f5f9;">
            <td style="padding:16px 20px;"><div style="display:flex;align-items:center;gap:12px;"><div style="width:32px;height:32px;border-radius:8px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;font-size:.75rem;font-weight:700;color:#475569;">N</div><span style="font-weight:600;color:#0f172a;">Netflix</span></div></td>
            <td style="padding:16px 20px;color:#64748b;">UI/UX Engineer</td>
            <td style="padding:16px 20px;color:#64748b;">Oct 22, 2023</td>
            <td style="padding:16px 20px;text-align:right;"><span style="background:#dcfce7;color:#15803d;padding:4px 10px;border-radius:20px;font-size:.75rem;font-weight:700;">Offer</span></td>
          </tr>
          <tr style="border-bottom:1px solid #f1f5f9;">
            <td style="padding:16px 20px;"><div style="display:flex;align-items:center;gap:12px;"><div style="width:32px;height:32px;border-radius:8px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;font-size:.75rem;font-weight:700;color:#475569;">M</div><span style="font-weight:600;color:#0f172a;">Meta</span></div></td>
            <td style="padding:16px 20px;color:#64748b;">Frontend Developer</td>
            <td style="padding:16px 20px;color:#64748b;">Oct 20, 2023</td>
            <td style="padding:16px 20px;text-align:right;"><span style="background:#f1f5f9;color:#475569;padding:4px 10px;border-radius:20px;font-size:.75rem;font-weight:700;">Applied</span></td>
          </tr>
          <tr>
            <td style="padding:16px 20px;"><div style="display:flex;align-items:center;gap:12px;"><div style="width:32px;height:32px;border-radius:8px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;font-size:.75rem;font-weight:700;color:#475569;">A</div><span style="font-weight:600;color:#0f172a;">Amazon</span></div></td>
            <td style="padding:16px 20px;color:#64748b;">Full Stack Lead</td>
            <td style="padding:16px 20px;color:#64748b;">Oct 18, 2023</td>
            <td style="padding:16px 20px;text-align:right;"><span style="background:#fee2e2;color:#dc2626;padding:4px 10px;border-radius:20px;font-size:.75rem;font-weight:700;">Rejected</span></td>
          </tr>
        </tbody>
      </table>
    </div>
    """, unsafe_allow_html=True)

with col_credits:
    st.markdown(_build_credits_panel(), unsafe_allow_html=True)

st.markdown("---")
st.caption("Reset buttons (for testing):")
c1, c2, c3 = st.columns(3)
with c1:
    if st.button("Simulate 10 Google CSE calls"):
        if _CREDITS_OK:
            from credits_tracker import consume
            for _ in range(10): consume("google_cse")
            st.rerun()
with c2:
    if st.button("Simulate 5 Hunter calls"):
        if _CREDITS_OK:
            from credits_tracker import consume
            for _ in range(5): consume("hunter")
            st.rerun()
with c3:
    if st.button("Reset All Credits"):
        if _CREDITS_OK: reset_all()
        st.rerun()