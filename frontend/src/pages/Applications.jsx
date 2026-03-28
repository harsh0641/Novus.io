import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { jobsAPI, applicationsAPI } from '../api/client';
import Sidebar from '../components/Sidebar';
import useDarkMode from '../hooks/useDarkMode';
import LoadingSpinner, {
  ScrollLoadingIndicator,
  SkeletonCard,
} from '../components/LoadingSpinner';

// ── Helpers ────────────────────────────────────────────────────────────────────
const COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6'];
function getColor(s) { let h = 0; for (let i = 0; i < (s || '').length; i++) h = s.charCodeAt(i) + ((h << 5) - h); return COLORS[Math.abs(h) % COLORS.length]; }
function abbr(n) { const w = (n || '').trim().split(/\s+/); return w.length >= 2 ? (w[0][0] + w[1][0]).toUpperCase() : (n || '??').slice(0, 2).toUpperCase(); }
function fmtDate(d) { if (!d) return '—'; const dt = new Date(d); if (isNaN(dt)) return String(d).slice(0, 10); return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }

// Strip common AI summary prefixes
function cleanSummary(raw) {
  if (!raw) return '';
  return String(raw)
    .replace(/^here(?:'s| is) a \d+-sentence summary[:\s]*/i, '')
    .replace(/^here(?:'s| is) a (?:brief |quick |short )?summary[:\s]*/i, '')
    .replace(/^summary[:\s]*/i, '')
    .trim();
}

// FIX: coerce to string before .split() — API may return array/object/null
function parseReqs(raw) {
  if (!raw) return [];
  const str = Array.isArray(raw) ? raw.join('\n') : String(raw);
  return str.split('\n').map(l => l.replace(/^[•\-\*\d\.]\s*/, '').trim()).filter(l => l.length > 4).slice(0, 7);
}

function getEngNum(job) { const s = String(job.applicants || ''); const m = s.match(/\d+/); return m ? parseInt(m[0]) : 0; }
function dedupeJobs(jobs) {
  const seen = new Set();
  return jobs.filter(j => {
    const key = `${(j.company || '').toLowerCase().trim()}__${(j.title || '').toLowerCase().trim()}`;
    if (seen.has(key)) return false; seen.add(key); return true;
  });
}
function resolveApplyUrl(job) {
  const applyUrl = job.apply_url || '';
  const sourceUrl = job.url || job.source_url || '';
  const isCareerPage = (u) => u && !u.includes('linkedin.com') && (
    u.includes('greenhouse.io') || u.includes('lever.co') || u.includes('workday.com') ||
    u.includes('icims.com') || u.includes('ashbyhq.com') || u.includes('myworkdayjobs') ||
    u.includes('taleo.net') || u.includes('jobvite.com') || u.includes('bamboohr.com') ||
    u.includes('smartrecruiters.com') || u.includes('careers') || u.includes('jobs.')
  );
  if (isCareerPage(applyUrl)) return { url: applyUrl, isLinkedIn: false };
  if (applyUrl && !applyUrl.includes('linkedin.com')) return { url: applyUrl, isLinkedIn: false };
  const liUrl = applyUrl || sourceUrl;
  return { url: liUrl || '#', isLinkedIn: true, isEasyApply: job.easy_apply || applyUrl.includes('linkedin.com') };
}

const BATCH_SIZE = 30;

function getC(dark) {
  return {
    bg: dark ? '#030303' : '#F4F4F5',
    surface: dark ? '#0A0A0A' : '#FFFFFF',
    border: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)',
    text: dark ? '#FFFFFF' : '#09090B',
    textM: dark ? '#A1A1AA' : '#71717A',
    textL: dark ? '#52525B' : '#A1A1AA',
    primary: dark ? '#FFFFFF' : '#09090B',
    primaryText: dark ? '#000000' : '#FFFFFF',
    surfaceL: dark ? 'rgba(255,255,255,0.03)' : '#F9F9FA',
    surfaceLow: dark ? 'rgba(255,255,255,0.01)' : '#FAFAFA',
    blue: '#3b82f6',
    blueL: dark ? 'rgba(59,130,246,0.12)' : '#eff6ff',
    shadow: dark ? 'none' : '0 2px 12px rgba(0,0,0,0.04)',
    cardShadow: dark ? 'inset 0 1px 0 rgba(255,255,255,0.03)' : '0 2px 10px rgba(0,0,0,0.03)',
    green: '#10b981',
    greenL: dark ? 'rgba(16,185,129,0.08)' : '#f0fdf4',
    orange: '#f59e0b',
    orangeL: dark ? 'rgba(245,158,11,0.08)' : '#fffbeb',
    red: '#ef4444',
    redL: dark ? 'rgba(239,68,68,0.08)' : '#fef2f2',
  };
}

const STAGE_S = {
  Applied: { bg: 'rgba(59,130,246,0.1)', color: '#3b82f6' },
  Interview: { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b' },
  Offer: { bg: 'rgba(16,185,129,0.1)', color: '#10b981' },
  Rejected: { bg: 'rgba(239,68,68,0.1)', color: '#ef4444' },
};

// ── 3D Ambient Network Background ─────────────────────────────────────────────
function MinimalNetwork3D({ dark }) {
  const mountRef = useRef(null);
  const cleanupRef = useRef(null);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const initScene = () => {
      const THREE = window.THREE;
      if (!THREE) return;
      let animId, renderer, scene, camera, particles;
      const W = window.innerWidth, H = window.innerHeight;
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(W, H);
      el.appendChild(renderer.domElement);
      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(60, W / H, 1, 100);
      camera.position.set(0, 0, 20);
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(150 * 3);
      for (let i = 0; i < 450; i++) pos[i] = (Math.random() - 0.5) * 50;
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const mat = new THREE.PointsMaterial({ color: dark ? 0xffffff : 0x000000, size: 0.05, transparent: true, opacity: 0.08 });
      particles = new THREE.Points(geo, mat);
      scene.add(particles);
      const tick = () => {
        animId = requestAnimationFrame(tick);
        particles.rotation.y += 0.001;
        renderer.render(scene, camera);
      };
      tick();
      cleanupRef.current = () => {
        cancelAnimationFrame(animId);
        if (renderer) renderer.dispose();
        if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
      };
    };

    if (window.THREE) {
      initScene();
    } else {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
      script.async = true;
      script.onload = initScene;
      document.head.appendChild(script);
    }

    return () => { if (cleanupRef.current) { cleanupRef.current(); cleanupRef.current = null; } };
  }, [dark]);

  return <div ref={mountRef} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }} />;
}

// ── AI Intelligence Summary (job-post focused, not company info) ──────────────
const intelligenceSummaryCache = new Map();

async function fetchIntelligenceSummary(job) {
  const cacheKey = `intel__${job.company}__${job.title}`;
  if (intelligenceSummaryCache.has(cacheKey)) return intelligenceSummaryCache.get(cacheKey);

  const descSource = job.description || job.ai_summary || job.requirements || '';

  try {
    const prompt = `You are a job intelligence analyst. Based ONLY on the following job posting details, write a 2-3 sentence summary focused on: what the candidate will actually DO in this role, what technologies/tools are required, and what the team/product context is. Do NOT mention company funding or generic company background. Be specific and concrete. Keep it under 60 words.

Job Title: ${job.title}
Company: ${job.company}
Location: ${job.location || 'Not specified'}
Job Type: ${job.job_type || 'Not specified'}
Salary: ${job.salary || 'Not specified'}
Description: ${descSource.slice(0, 800)}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await response.json();
    const text = data.content?.map(c => c.text || '').join('').trim() || cleanSummary(job.ai_summary);
    intelligenceSummaryCache.set(cacheKey, text);
    return text;
  } catch {
    return cleanSummary(job.ai_summary) || 'No summary available for this role.';
  }
}

function IntelligenceSummary({ job, dark }) {
  const C = getC(dark);
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setSummary('');
    fetchIntelligenceSummary(job).then(text => {
      if (!cancelled) { setSummary(text); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, [job]);

  return (
    <div style={{ marginBottom: 22, padding: '18px', background: C.surfaceLow, borderRadius: 16, border: `1px solid ${C.border}` }}>
      <div style={{ fontSize: '0.58rem', fontWeight: 700, color: C.textL, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>Intelligence Summary</div>
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: C.textL, animation: `dotBounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
            ))}
          </div>
          <span style={{ fontSize: '0.78rem', color: C.textL }}>Generating role intelligence...</span>
        </div>
      ) : (
        <p style={{ fontSize: '0.875rem', color: C.text, lineHeight: 1.75, margin: 0, fontWeight: 300 }}>{summary}</p>
      )}
    </div>
  );
}

// ── AI-Powered Dynamic Key Qualifications ────────────────────────────────────
const dynamicReqsCache = new Map();

async function fetchDynamicReqs(job) {
  const cacheKey = `reqs__${job.company}__${job.title}`;
  if (dynamicReqsCache.has(cacheKey)) return dynamicReqsCache.get(cacheKey);

  const descSource = job.description || job.ai_requirements || job.requirements || job.ai_summary || '';

  try {
    const prompt = `Extract exactly 5 specific, concrete key qualifications from this job description. Each qualification must be a short phrase (3–8 words) that names a specific skill, technology, or experience required. Do NOT use vague phrases like "relevant experience" or "team player". Return ONLY a plain list, one per line, no bullets or numbering, no extra text.

Job Title: ${job.title}
Company: ${job.company}
Description: ${descSource.slice(0, 1000)}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await response.json();
    const raw = data.content?.map(c => c.text || '').join('').trim() || '';
    const reqs = raw
      .split('\n')
      .map(l => l.replace(/^[•\-\*\d\.]\s*/, '').trim())
      .filter(l => l.length > 3)
      .slice(0, 7);

    const result = reqs.length > 0 ? reqs : parseReqs(job.ai_reqs || job.requirements || '');
    dynamicReqsCache.set(cacheKey, result);
    return result;
  } catch {
    return parseReqs(job.ai_reqs || job.requirements || '');
  }
}

// ── AI-Powered Requirement Tooltip ────────────────────────────────────────────
const reqExplanationCache = new Map();

async function fetchReqExplanation(req, jobTitle, company, jobDescription) {
  const cacheKey = `${company}__${jobTitle}__${req}`;
  if (reqExplanationCache.has(cacheKey)) return reqExplanationCache.get(cacheKey);

  try {
    const prompt = `You are a career advisor. For the job role "${jobTitle}" at "${company}", explain in exactly 1-2 concise sentences why this specific requirement matters for THIS role: "${req}". Be specific to the company/role context. Do not use bullet points. Keep it under 30 words. Company context: ${(jobDescription || '').slice(0, 300)}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await response.json();
    const text = data.content?.map(c => c.text || '').join('').trim() || 'Key skill the employer is looking for in this role.';
    reqExplanationCache.set(cacheKey, text);
    return text;
  } catch {
    return 'Key skill the employer is looking for in this role.';
  }
}

function ReqTooltip({ text, visible, dotColor, loading, explanation }) {
  if (!visible) return null;
  return (
    <div style={{
      position: 'absolute', left: 20, bottom: 'calc(100% + 8px)',
      background: '#09090B', color: '#fff', borderRadius: 8, padding: '12px 16px',
      fontSize: '0.75rem', lineHeight: 1.5, maxWidth: 260, zIndex: 9999,
      boxShadow: '0 20px 40px rgba(0,0,0,0.4)', pointerEvents: 'none',
      whiteSpace: 'normal', fontWeight: 400, border: '1px solid rgba(255,255,255,0.1)',
      animation: 'tooltipFade 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
    }}>
      <div style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor }} />
        <span style={{ fontWeight: 600, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#A1A1AA' }}>Why This Matters</span>
      </div>
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: 0.6 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, animation: 'reqPulse 1s ease-in-out infinite' }} />
          <span>Analyzing for this role...</span>
        </div>
      ) : (
        <span>{explanation}</span>
      )}
    </div>
  );
}

// Dynamic Requirements Timeline — fetches AI-generated reqs, then AI tooltips on hover
function DynamicReqTimeline({ dark, job }) {
  const C = getC(dark);
  const [reqs, setReqs] = useState([]);
  const [loadingReqs, setLoadingReqs] = useState(true);
  const [vis, setVis] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const [explanations, setExplanations] = useState({});
  const [loadingIdx, setLoadingIdx] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoadingReqs(true);
    setVis(false);
    setReqs([]);
    fetchDynamicReqs(job).then(result => {
      if (!cancelled) {
        setReqs(result);
        setLoadingReqs(false);
        setTimeout(() => setVis(true), 80);
      }
    });
    return () => { cancelled = true; };
  }, [job]);

  const handleHover = async (idx, req) => {
    setHoveredIdx(idx);
    if (explanations[idx]) return;
    setLoadingIdx(idx);
    const explanation = await fetchReqExplanation(
      req,
      job?.title || '',
      job?.company || '',
      job?.ai_summary || job?.description || ''
    );
    setExplanations(prev => ({ ...prev, [idx]: explanation }));
    setLoadingIdx(null);
  };

  const dc = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

  if (loadingReqs) {
    return (
      <div style={{ paddingLeft: 24 }}>
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: C.border, flexShrink: 0, animation: 'skelPulse 1.4s ease-in-out infinite', animationDelay: `${i * 0.12}s` }} />
            <div style={{ height: 14, borderRadius: 6, background: C.border, animation: 'skelPulse 1.4s ease-in-out infinite', animationDelay: `${i * 0.12}s`, width: `${55 + (i % 3) * 15}%` }} />
          </div>
        ))}
      </div>
    );
  }

  if (!reqs.length) return null;

  return (
    <div style={{ position: 'relative', paddingLeft: 24 }}>
      <div style={{ position: 'absolute', left: 7, top: 8, bottom: 8, width: 1, background: C.border, opacity: vis ? 1 : 0, transition: 'opacity 0.5s' }} />
      {reqs.map((r, i) => (
        <div key={i}
          style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: i < reqs.length - 1 ? 12 : 0, opacity: vis ? 1 : 0, transform: vis ? 'none' : 'translateX(-8px)', transition: `all 0.4s ${i * 0.07}s`, cursor: 'default' }}
          onMouseEnter={() => handleHover(i, r)}
          onMouseLeave={() => setHoveredIdx(null)}
        >
          <div style={{ position: 'relative', flexShrink: 0, marginTop: 4 }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: hoveredIdx === i ? dc[i % dc.length] : C.border, transition: 'all 0.2s', boxShadow: hoveredIdx === i ? `0 0 12px ${dc[i % dc.length]}` : 'none' }} />
            <ReqTooltip
              text={r}
              visible={hoveredIdx === i}
              dotColor={dc[i % dc.length]}
              loading={loadingIdx === i}
              explanation={explanations[i]}
            />
          </div>
          <span style={{ fontSize: '0.85rem', color: hoveredIdx === i ? C.text : C.textM, lineHeight: 1.5, fontWeight: hoveredIdx === i ? 500 : 400, transition: 'all 0.2s' }}>{r}</span>
        </div>
      ))}
    </div>
  );
}

function ApplicantBar({ job, dark }) {
  const C = getC(dark);
  const n = getEngNum(job);
  const [w, setW] = useState(0);
  useEffect(() => {
    if (!n) { setW(0); return; }
    const t = setTimeout(() => setW(Math.min((n / 500) * 100, 100)), 150);
    return () => clearTimeout(t);
  }, [n]);
  if (!n) return null;
  const color = n < 50 ? '#10b981' : n < 200 ? '#f59e0b' : '#ef4444';
  const label = n < 50 ? 'Low competition' : n < 200 ? 'Moderate' : 'High saturation';
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: '0.65rem', fontWeight: 600, color: C.textL, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Market Competition</span>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color }}>{n}+ applicants · {label}</span>
      </div>
      <div style={{ height: 3, background: C.border, borderRadius: 9999, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${w}%`, background: color, borderRadius: 9999, transition: 'width 1.2s cubic-bezier(.16,1,.3,1)' }} />
      </div>
    </div>
  );
}

function AutoInput({ value, onChange, placeholder, type, disabled, dark }) {
  const [sugg, setSugg] = useState([]); const [open, setOpen] = useState(false); const t = useRef(null);
  const C = getC(dark);
  const doFetch = async (q) => {
    if (!q || q.length < 2) { setSugg([]); setOpen(false); return; }
    try { const r = await jobsAPI.suggestions(q, type); setSugg(r.data.suggestions || []); setOpen((r.data.suggestions || []).length > 0); }
    catch { setSugg([]); setOpen(false); }
  };
  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <input
        value={value}
        onChange={e => { onChange(e.target.value); if (!disabled) { clearTimeout(t.current); t.current = setTimeout(() => doFetch(e.target.value), 350); } }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onFocus={e => {
          if (sugg.length > 0 && !disabled) setOpen(true);
          e.target.style.borderColor = dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.18)';
        }}
        onBlurCapture={e => e.target.style.borderColor = C.border}
        placeholder={placeholder}
        disabled={disabled}
        style={{ width: '100%', height: 42, border: `1px solid ${C.border}`, borderRadius: 11, padding: '0 16px', fontSize: '0.875rem', fontFamily: 'inherit', color: disabled ? C.textL : C.text, outline: 'none', background: C.surfaceL, boxSizing: 'border-box', transition: 'border-color 0.2s', cursor: disabled ? 'not-allowed' : 'text' }}
      />
      {open && !disabled && sugg.length > 0 && (
        <div style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, boxShadow: '0 20px 40px rgba(0,0,0,0.3)', zIndex: 999, overflow: 'hidden' }}>
          {sugg.map((s, i) => (
            <div key={i} onMouseDown={() => { onChange(s); setOpen(false); setSugg([]); }}
              style={{ padding: '11px 16px', fontSize: '0.875rem', color: C.text, cursor: 'pointer', borderBottom: i < sugg.length - 1 ? `1px solid ${C.border}` : 'none' }}
              onMouseEnter={e => e.currentTarget.style.background = C.surfaceL}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>{s}</div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Live Counter ───────────────────────────────────────────────────────────────
function LiveCounter({ count }) {
  const [displayed, setDisplayed] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    if (count === prev.current) return;
    const diff = count - prev.current;
    const steps = Math.min(Math.abs(diff), 20);
    const step = diff / steps;
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayed(Math.round(prev.current + step * i));
      if (i >= steps) { clearInterval(id); prev.current = count; }
    }, 40);
    return () => clearInterval(id);
  }, [count]);
  return <span style={{ fontVariantNumeric: 'tabular-nums' }}>{displayed}</span>;
}

// ── Filter Drawer ──────────────────────────────────────────────────────────────
function FilterDrawer({ dark, open, filters, onChange }) {
  const C = getC(dark);
  if (!open) return null;

  const Section = ({ title, options, field }) => (
    <div>
      <div style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.textL, marginBottom: 10 }}>{title}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {options.map(opt => {
          const active = filters[field]?.includes(opt);
          return (
            <button key={opt} onClick={() => {
              const cur = filters[field] || [];
              onChange(field, active ? cur.filter(x => x !== opt) : [...cur, opt]);
            }}
              style={{ padding: '5px 13px', borderRadius: 7, border: `1px solid ${active ? '#3b82f6' : C.border}`, background: active ? 'rgba(59,130,246,0.1)' : 'transparent', color: active ? '#3b82f6' : C.textM, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div style={{ marginTop: 20, padding: '20px', background: C.surfaceLow, border: `1px solid ${C.border}`, borderRadius: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 24, animation: 'skelFadeIn 0.25s ease' }}>
      <Section title="Experience Level" field="experience" options={['Entry', 'Mid', 'Senior', 'Lead', 'Staff', 'Principal']} />
      <Section title="Company Size" field="companySize" options={['Startup', 'Scale-up', 'Mid-market', 'Enterprise', 'Public']} />
      <Section title="Salary Range" field="salary" options={['$60k–100k', '$100k–150k', '$150k–200k', '$200k+']} />
    </div>
  );
}

function ATSMatchCard({ job, userId, dark }) {
  const [scoreData, setScoreData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const C = getC(dark);

  const handleCalculate = async () => {
    if (!userId) return;
    setLoading(true); setError('');
    try {
      const res = await jobsAPI.getMatchScore({
        user_id: userId,
        job_title: job.title,
        job_description: job.description || job.requirements || job.ai_summary || 'No description provided.'
      });
      if (res.data.success) {
        setScoreData(res.data);
      } else {
        setError(res.data.message || 'Failed to calculate match.');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Make sure you uploaded a resume in Settings first!');
    } finally {
      setLoading(false);
    }
  };

  if (scoreData) {
    const s = scoreData.score || 0;
    const color = s >= 80 ? C.green : s >= 60 ? C.orange : C.red;
    const bgColor = s >= 80 ? C.greenL : s >= 60 ? C.orangeL : C.redL;
    return (
      <div style={{ marginBottom: 24, padding: '20px', background: bgColor, borderRadius: 18, border: `1px solid ${color}30`, animation: 'skelFadeIn 0.4s ease' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', width: 60, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg viewBox="0 0 36 36" style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={`${color}30`} strokeWidth="3" />
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={color} strokeWidth="3" strokeDasharray={`${s}, 100`} style={{ transition: 'stroke-dasharray 1s ease-out' }} />
            </svg>
            <span style={{ fontSize: '1.1rem', fontWeight: 700, color }}>{s}%</span>
          </div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, color, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>Resume Match Analysis</div>
            <p style={{ fontSize: '0.85rem', color: C.text, lineHeight: 1.5, margin: 0, fontWeight: 500 }}>{scoreData.feedback}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 24, padding: '16px', background: C.surfaceL, borderRadius: 16, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
      <div>
        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: C.text }}>Calculate ATS Match</div>
        <div style={{ fontSize: '0.75rem', color: C.textM, marginTop: 2 }}>Compare your saved resume against this role.</div>
        {error && <div style={{ fontSize: '0.75rem', color: C.red, marginTop: 4 }}>{error}</div>}
      </div>
      <button
        onClick={handleCalculate}
        disabled={loading}
        style={{ padding: '8px 16px', borderRadius: 10, background: loading ? C.border : C.text, color: loading ? C.textM : C.bg, border: 'none', fontSize: '0.8rem', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap' }}
      >
        {loading ? 'Analyzing...' : 'Run Analysis'}
      </button>
    </div>
  );
}

// ── Job Modal ──────────────────────────────────────────────────────────────────
function JobModal({ job, onClose, onApply, isApplied, isSaving, dark, userId }) {
  const C = getC(dark);
  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', h); document.body.style.overflow = ''; };
  }, [onClose]);
  if (!job) return null;
  const color = getColor(job.company || '');
  const ab = abbr(job.company || '');
  const { url: applyUrl, isLinkedIn, isEasyApply } = resolveApplyUrl(job);

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', background: dark ? 'rgba(0,0,0,0.88)' : 'rgba(244,244,245,0.85)', backdropFilter: 'blur(16px) saturate(180%)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: C.surface, borderRadius: 24, width: '100%', maxWidth: 680, maxHeight: '90vh', overflowY: 'auto', border: `1px solid ${C.border}`, boxShadow: dark ? '0 40px 100px rgba(0,0,0,0.6)' : '0 40px 100px rgba(0,0,0,0.12)', animation: 'modalIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'sticky', top: 0, background: C.surface, zIndex: 10, borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
            <div style={{ width: 46, height: 46, borderRadius: 12, background: `${color}15`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 700, color, flexShrink: 0 }}>{ab}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 600, color: C.textM, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 4 }}>{job.company}</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 500, color: C.text, lineHeight: 1.2, letterSpacing: '-0.02em' }}>{job.title}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 10, border: `1px solid ${C.border}`, background: 'transparent', cursor: 'pointer', color: C.textM, fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginLeft: 12 }}>✕</button>
        </div>

        <div style={{ padding: '20px 24px 28px' }}>
          {/* Badges */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 20 }}>
            {isApplied && <span style={{ background: STAGE_S.Offer.bg, color: STAGE_S.Offer.color, padding: '4px 12px', borderRadius: 7, fontSize: '0.7rem', fontWeight: 700 }}>✓ Applied</span>}
            {isLinkedIn && <span style={{ background: C.surfaceL, color: C.text, padding: '4px 12px', borderRadius: 7, fontSize: '0.7rem', fontWeight: 600 }}>{isEasyApply ? '⚡ Easy Apply' : 'LinkedIn'}</span>}
            {job.salary && <span style={{ background: STAGE_S.Interview.bg, color: STAGE_S.Interview.color, padding: '4px 12px', borderRadius: 7, fontSize: '0.7rem', fontWeight: 600 }}>{job.salary}</span>}
          </div>

          <ApplicantBar job={job} dark={dark} />
          <ATSMatchCard job={job} userId={userId} dark={dark} />

          {/* Meta grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 22 }}>
            {[{ l: 'LOCATION', v: job.location }, { l: 'TYPE', v: job.job_type }, { l: 'POSTED', v: String(job.posted || '').slice(0, 10) }, { l: 'COMPENSATION', v: job.salary }].map((it, i) => (
              <div key={i} style={{ padding: '12px 14px', background: C.surfaceL, borderRadius: 12, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: '0.58rem', fontWeight: 700, color: C.textL, letterSpacing: '0.1em', marginBottom: 4, textTransform: 'uppercase' }}>{it.l}</div>
                <div style={{ fontSize: '0.825rem', color: C.text, fontWeight: 500 }}>{it.v || '—'}</div>
              </div>
            ))}
          </div>

          {/* AI Intelligence Summary — job-post focused */}
          <IntelligenceSummary job={job} dark={dark} />

          {/* Key Qualifications — AI-generated, specific to JD */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: '0.58rem', fontWeight: 700, color: C.textL, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 14 }}>Key Qualifications</div>
            <DynamicReqTimeline dark={dark} job={job} />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button onClick={() => { onApply(job); onClose(); }} disabled={isSaving || isApplied}
              style={{ flex: 1, minWidth: 160, height: 48, background: isApplied ? C.border : C.primary, color: isApplied ? C.textM : C.primaryText, border: 'none', borderRadius: 12, fontSize: '0.9rem', fontWeight: 600, cursor: isApplied ? 'not-allowed' : 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
              {isSaving ? 'Processing...' : isApplied ? 'Record Tracked' : 'Execute Application'}
            </button>
            <button onClick={onClose}
              style={{ height: 48, padding: '0 20px', borderRadius: 12, background: 'transparent', border: `1px solid ${C.border}`, color: C.text, fontSize: '0.9rem', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Export ────────────────────────────────────────────────────────────────
export default function Applications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { dark } = useDarkMode();
  const C = getC(dark);

  const [tab, setTab] = useState('browse');
  const [keyword, setKeyword] = useState('');
  const [company, setCompany] = useState('');
  const [loc, setLoc] = useState('');
  const [dateFilter, setDateFilter] = useState('Any time');
  const [jobTypeFilter, setJobTypeFilter] = useState('All');
  const [minApplicants, setMinApplicants] = useState(0);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState({ experience: [], companySize: [], salary: [] });

  const [allJobs, setAllJobs] = useState([]);
  const [displayCount, setDisplayCount] = useState(BATCH_SIZE);
  const [searching, setSearching] = useState(false);
  const [searchDone, setSearchDone] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [noMoreResults, setNoMoreResults] = useState(false);

  const [appliedSet, setAppliedSet] = useState(new Set());
  const [saving, setSaving] = useState(null);
  const [appliedJobs, setAppliedJobs] = useState([]);
  const [loadingApplied, setLoadingApplied] = useState(false);
  const [toast, setToast] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  const [selectedApplied, setSelectedApplied] = useState(null);
  const [gmailApps, setGmailApps] = useState([]);

  // ── FIX: Mobile sidebar state (matches Dashboard pattern) ──────────────────
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const sentinelRef = useRef(null);
  const lastSearchParams = useRef({});
  const isLoadingMoreRef = useRef(false);
  const avatarLet = user?.name?.[0]?.toUpperCase() || 'U';

  const showToast = (msg, type = 'success') => {
    setToast({ msg: typeof msg === 'string' ? msg : 'Error', type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    if (user?.id) applicationsAPI.getAll(user.id).then(r => setGmailApps(r.data.data || [])).catch(() => { });
  }, [user]);

  useEffect(() => {
    if (tab === 'applied' && user?.id) {
      setLoadingApplied(true);
      jobsAPI.getApplied(user.id).then(r => setAppliedJobs(r.data.data || [])).catch(() => showToast('Failed to load applications', 'error')).finally(() => setLoadingApplied(false));
    }
  }, [tab, user]);

  const findMatch = (job) => {
    if (!gmailApps.length) return null;
    const co = (job.company || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    return gmailApps.find(a => { const ac = (a.company_name || '').toLowerCase().replace(/[^a-z0-9]/g, ''); return co.length > 2 && (ac.includes(co) || co.includes(ac)); }) || null;
  };

  const activeFilterCount = (
    (jobTypeFilter !== 'All' ? 1 : 0) +
    (minApplicants > 0 ? 1 : 0) +
    advancedFilters.experience.length +
    advancedFilters.companySize.length +
    advancedFilters.salary.length
  );

  const filteredJobs = allJobs.filter(job => {
    if (jobTypeFilter !== 'All' && job.job_type && !job.job_type.toLowerCase().includes(jobTypeFilter.toLowerCase())) return false;
    if (minApplicants > 0) { const n = getEngNum(job); if (n > 0 && n < minApplicants) return false; }
    return true;
  });

  const visibleJobs = filteredJobs.slice(0, displayCount);

  const fetchBatch = useCallback(async (params, isFirstBatch = false) => {
    try {
      const res = await jobsAPI.search({ ...params, user_id: user?.id || '', limit: BATCH_SIZE });
      const newJobs = res.data.jobs || [];
      if (isFirstBatch) {
        setAllJobs(dedupeJobs(newJobs));
        setSearchDone(true);
        setDisplayCount(BATCH_SIZE);
        setNoMoreResults(newJobs.length < 5);
        if (!newJobs.length) showToast('No jobs found. Try different keywords.', 'error');
      } else {
        setAllJobs(prev => dedupeJobs([...prev, ...newJobs]));
        setNoMoreResults(newJobs.length < 5);
      }
    } catch (err) {
      const d = err.response?.data?.detail;
      if (isFirstBatch) showToast(typeof d === 'string' ? d : 'Search failed', 'error');
    }
  }, [user]);

  const handleSearch = async (e, overrideKeyword) => {
    e?.preventDefault();
    const kw = overrideKeyword !== undefined ? overrideKeyword : keyword;
    if (!kw.trim() && !company.trim()) { showToast('Enter parameters to begin query', 'error'); return; }
    const params = { keyword: kw, location: loc, company, date_filter: dateFilter };
    lastSearchParams.current = params;
    setSearching(true); setAllJobs([]); setSearchDone(false); setNoMoreResults(false); setDisplayCount(BATCH_SIZE);
    await fetchBatch(params, true);
    setSearching(false);
  };

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting || isLoadingMoreRef.current || !searchDone || searching) return;
      isLoadingMoreRef.current = true;
      if (displayCount < filteredJobs.length) {
        setLoadingMore(true);
        setTimeout(() => {
          setDisplayCount(prev => Math.min(prev + BATCH_SIZE, filteredJobs.length));
          setLoadingMore(false);
          isLoadingMoreRef.current = false;
        }, 800);
      } else if (!noMoreResults) {
        setLoadingMore(true);
        fetchBatch({ ...lastSearchParams.current, offset: allJobs.length }).finally(() => {
          setLoadingMore(false);
          isLoadingMoreRef.current = false;
        });
      } else {
        isLoadingMoreRef.current = false;
      }
    }, { threshold: 0, rootMargin: '400px' });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [searchDone, searching, filteredJobs.length, displayCount, noMoreResults, allJobs.length, fetchBatch]);

  const handleApply = async (job) => {
    if (!user?.id) return;
    const { url: careerUrl } = resolveApplyUrl(job);
    if (careerUrl && careerUrl !== '#') window.open(careerUrl, '_blank', 'noopener,noreferrer');
    setSaving(job.id);
    try {
      const res = await jobsAPI.save({ user_id: user.id, company: job.company, title: job.title, description: job.description || '', requirements: job.ai_reqs || job.requirements || '', salary: job.salary || '', job_type: job.job_type || '', location: job.location || '', source_url: careerUrl, applicants: job.applicants || '', ai_summary: job.ai_summary || '' });
      if (res.data.already_exists) { showToast(`Already tracking ${job.company}`); }
      else {
        const match = findMatch(job);
        setAppliedSet(prev => new Set([...prev, job.id]));
        showToast(match ? `Gmail matched for ${job.company}` : `Tracking initialized for ${job.company}`);
      }
    } catch (err) { const d = err.response?.data?.detail; showToast(typeof d === 'string' ? d : 'Save failed', 'error'); }
    finally { setSaving(null); }
  };

  const handleHeaderSearch = (e) => {
    if (e.key === 'Enter' && e.target.value.trim()) {
      const val = e.target.value.trim();
      setKeyword(val);
      setTab('browse');
      handleSearch(undefined, val);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: C.bg, transition: 'background 0.4s cubic-bezier(0.16,1,0.3,1)', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}>
      <MinimalNetwork3D dark={dark} />

      {/* FIX: Mobile sidebar overlay — rendered unconditionally, visibility via opacity/pointer-events */}
      {sidebarOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 45 }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* FIX: Pass open/onClose to Sidebar exactly like Dashboard */}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, position: 'relative', zIndex: 10, marginLeft: 'var(--sidebar-width, 280px)', transition: 'margin-left 0.5s cubic-bezier(0.16, 1, 0.3, 1)' }} className="main-content">

        {/* ── TOP BAR ─────────────────────────────────────────────────────── */}
        <header style={{ position: 'sticky', top: 0, zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 24px', background: dark ? 'rgba(3,3,3,0.75)' : 'rgba(244,244,245,0.85)', backdropFilter: 'blur(24px) saturate(180%)', borderBottom: `1px solid ${C.border}`, WebkitBackdropFilter: 'blur(24px) saturate(180%)', gap: 16 }}>

          {/* FIX: Mobile hamburger — always rendered, hidden via CSS on desktop */}
          <button
            className="mobile-only"
            onClick={() => setSidebarOpen(v => !v)}
            style={{ width: 36, height: 36, borderRadius: 9, border: `1px solid ${C.border}`, background: 'transparent', cursor: 'pointer', color: C.text, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
          </button>

          <div style={{ flex: 1, maxWidth: 480 }}>
            <div style={{ position: 'relative' }}>
              <svg width="14" height="14" fill="none" stroke={C.textL} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
              <input
                placeholder="Search opportunities..."
                value={keyword}
                onChange={e => setKeyword(e.target.value)}
                onKeyDown={handleHeaderSearch}
                style={{ width: '100%', paddingLeft: 38, paddingRight: 16, height: 40, background: C.surfaceL, border: `1px solid ${C.border}`, borderRadius: 11, fontSize: '0.875rem', outline: 'none', fontFamily: 'inherit', color: C.text, transition: 'border-color 0.2s' }}
                onFocus={e => e.target.style.borderColor = dark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.2)'}
                onBlur={e => e.target.style.borderColor = C.border}
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
            <div style={{ textAlign: 'right' }} className="header-user-info">
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: C.text, lineHeight: 1.2 }}>{user?.name || 'USER'}</div>
              <div style={{ fontSize: '0.65rem', color: C.textL, letterSpacing: '0.05em', marginTop: 1 }}>
                AI Comms Active
              </div>
            </div>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: C.surfaceL, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, color: C.text, fontSize: '0.875rem', flexShrink: 0 }}>{avatarLet}</div>
          </div>
        </header>

        {/* ── MAIN CONTENT ─────────────────────────────────────────────────── */}
        <main style={{ padding: '32px 24px', overflowY: 'auto', scrollbarWidth: 'none' }} className="main-pad">

          {/* Page title row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 14 }}>
            <div>
              <h2 style={{ fontSize: '1.7rem', fontWeight: 500, letterSpacing: '-0.03em', color: C.text, margin: '0 0 6px' }}>Market Intelligence</h2>
              <p style={{ color: C.textM, margin: 0, fontSize: '0.875rem', fontWeight: 300 }}>
                Llama-3.1 verified opportunities · Gmail cross-referencing
                {searchDone && (
                  <span style={{ marginLeft: 10, color: C.text, fontWeight: 500 }}>
                    · (<LiveCounter count={filteredJobs.length} /> records indexed)
                  </span>
                )}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 6, background: C.surfaceL, padding: 4, borderRadius: 12, border: `1px solid ${C.border}`, alignSelf: 'flex-start' }}>
              {[['browse', 'Live Browse'], ['applied', 'Tracked']].map(([t, label]) => (
                <button key={t} onClick={() => setTab(t)}
                  style={{ padding: '6px 16px', borderRadius: 9, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.8rem', fontWeight: 500, background: tab === t ? C.surface : 'transparent', color: tab === t ? C.text : C.textM, transition: 'all 0.2s', boxShadow: tab === t && !dark ? '0 1px 4px rgba(0,0,0,0.08)' : 'none', whiteSpace: 'nowrap' }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* ── BROWSE TAB ──────────────────────────────────────────────────── */}
          {tab === 'browse' && (
            <div>
              {/* Search panel */}
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: '22px', marginBottom: 24, position: 'relative', overflow: 'hidden', boxShadow: C.shadow }}>
                {searching && <LoadingSpinner overlay dark={dark} />}
                <form onSubmit={handleSearch}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
                    {[
                      { v: keyword, s: setKeyword, ph: 'Role / Title', t: 'keyword' },
                      { v: company, s: setCompany, ph: 'Company Entity', t: 'company' },
                      { v: loc, s: setLoc, ph: 'Geographic Filter', t: 'location' },
                    ].map((f, i) => (
                      <AutoInput key={i} value={f.v} onChange={f.s} placeholder={f.ph} type={f.t} disabled={searching} dark={dark} />
                    ))}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <select value={dateFilter} onChange={e => setDateFilter(e.target.value)} disabled={searching}
                      style={{ height: 38, border: `1px solid ${C.border}`, borderRadius: 10, padding: '0 12px', fontSize: '0.8rem', fontFamily: 'inherit', color: C.textM, background: C.surfaceL, cursor: 'pointer', outline: 'none', appearance: 'none', minWidth: 130 }}>
                      {['Any time', 'Last 24 hours', 'Past week', 'Past month'].map(o => <option key={o} value={o}>{o}</option>)}
                    </select>

                    <div style={{ display: 'flex', gap: 3, background: C.surfaceL, padding: 3, borderRadius: 10, border: `1px solid ${C.border}` }}>
                      {['All', 'Full-time', 'Contract', 'Remote'].map(opt => (
                        <button key={opt} type="button" onClick={() => setJobTypeFilter(opt)}
                          style={{ padding: '4px 10px', borderRadius: 7, border: jobTypeFilter === opt ? `1px solid ${C.border}` : '1px solid transparent', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', background: jobTypeFilter === opt ? C.surface : 'transparent', color: jobTypeFilter === opt ? C.text : C.textM, transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
                          {opt}
                        </button>
                      ))}
                    </div>

                    <div style={{ display: 'flex', gap: 3, background: C.surfaceL, padding: 3, borderRadius: 10, border: `1px solid ${C.border}` }}>
                      {[{ l: 'Any', v: 0 }, { l: '10+', v: 10 }, { l: '50+', v: 50 }].map(opt => (
                        <button key={opt.v} type="button" onClick={() => setMinApplicants(opt.v)}
                          style={{ padding: '4px 10px', borderRadius: 7, border: minApplicants === opt.v ? `1px solid ${C.border}` : '1px solid transparent', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', background: minApplicants === opt.v ? C.surface : 'transparent', color: minApplicants === opt.v ? C.text : C.textM, transition: 'all 0.15s' }}>
                          {opt.l}
                        </button>
                      ))}
                    </div>

                    <button type="button" onClick={() => setFilterDrawerOpen(v => !v)}
                      style={{ height: 38, padding: '0 14px', borderRadius: 10, border: `1px dashed ${filterDrawerOpen ? '#3b82f6' : C.border}`, background: filterDrawerOpen ? 'rgba(59,130,246,0.06)' : 'transparent', color: filterDrawerOpen ? '#3b82f6' : C.textM, fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s' }}>
                      <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="4" y1="6" x2="20" y2="6" /><line x1="8" y1="12" x2="16" y2="12" /><line x1="10" y1="18" x2="14" y2="18" /></svg>
                      Filters
                      {activeFilterCount > 0 && (
                        <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#3b82f6', color: '#fff', fontSize: '9px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{activeFilterCount}</div>
                      )}
                    </button>

                    <button type="submit" disabled={searching}
                      style={{ height: 38, padding: '0 24px', background: searching ? C.border : C.primary, color: searching ? C.textM : C.primaryText, border: 'none', borderRadius: 10, fontSize: '0.85rem', fontWeight: 600, cursor: searching ? 'not-allowed' : 'pointer', marginLeft: 'auto', fontFamily: 'inherit', transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
                      {searching ? 'Executing...' : 'Search Index'}
                    </button>
                  </div>

                  <FilterDrawer dark={dark} open={filterDrawerOpen} filters={advancedFilters} onChange={(field, val) => setAdvancedFilters(prev => ({ ...prev, [field]: val }))} />
                </form>
              </div>

              {/* Empty state */}
              {!searching && !searchDone && (
                <div style={{ textAlign: 'center', padding: '80px 0', animation: 'skelFadeIn 0.4s ease' }}>
                  <div style={{ width: 56, height: 56, background: C.surfaceL, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', border: `1px solid ${C.border}` }}>
                    <svg width="22" height="22" fill="none" stroke={C.textM} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
                  </div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 500, color: C.text, margin: '0 0 8px' }}>Search the Opportunity Graph</h3>
                  <p style={{ color: C.textL, fontSize: '0.875rem', margin: 0, fontWeight: 300 }}>AI classification · Gmail cross-match · Verified career channels</p>
                </div>
              )}

              {/* Results grid */}
              {searchDone && !searching && filteredJobs.length > 0 && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <span style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.textL }}>Search Results</span>
                    <span style={{ padding: '3px 10px', borderRadius: 6, background: 'rgba(59,130,246,0.1)', color: '#3b82f6', fontSize: '0.7rem', fontWeight: 700 }}>
                      {filteredJobs.length} found · {visibleJobs.length} shown
                    </span>
                  </div>

                  <div className="jobs-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                    {visibleJobs.map((job, idx) => {
                      const isApplied = appliedSet.has(job.id);
                      const color = getColor(job.company || '');
                      const ab = abbr(job.company || '');
                      const match = findMatch(job);
                      const summary = cleanSummary(job.ai_summary);
                      return (
                        <div key={job.id}
                          style={{ background: C.surface, borderRadius: 18, padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: `1px solid ${C.border}`, boxShadow: C.cardShadow, animation: `skelFadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${Math.min(idx % BATCH_SIZE * 0.04, 0.3)}s both`, transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'pointer' }}
                          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = dark ? 'inset 0 1px 0 rgba(255,255,255,0.06), 0 0 0 1px rgba(255,255,255,0.04)' : '0 8px 24px rgba(0,0,0,0.07)'; }}
                          onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = C.cardShadow; }}
                          onClick={() => setSelectedJob(job)}
                        >
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                              <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}15`, border: `1px solid ${color}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.825rem', fontWeight: 700, color, flexShrink: 0 }}>{ab}</div>
                              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                {isApplied && <span style={{ background: STAGE_S.Offer.bg, color: STAGE_S.Offer.color, padding: '3px 9px', borderRadius: 6, fontSize: '0.65rem', fontWeight: 700 }}>✓ Tracked</span>}
                                {match && <span style={{ background: C.blueL, color: C.blue, padding: '3px 9px', borderRadius: 6, fontSize: '0.65rem', fontWeight: 700 }}>📬 Gmail</span>}
                                {!isApplied && !match && job.easy_apply && <span style={{ background: STAGE_S.Interview.bg, color: STAGE_S.Interview.color, padding: '3px 9px', borderRadius: 6, fontSize: '0.65rem', fontWeight: 700 }}>⚡ Easy</span>}
                              </div>
                            </div>
                            <h3 style={{ fontSize: '0.95rem', fontWeight: 500, color: C.text, margin: '0 0 4px', lineHeight: 1.35 }}>{job.title}</h3>
                            <div style={{ fontSize: '0.825rem', color: C.textM, marginBottom: 12 }}>{job.company} · {job.location || 'Remote'}</div>
                            {summary && (
                              <p style={{ fontSize: '0.8rem', color: C.textM, lineHeight: 1.65, margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', fontWeight: 300 }}>
                                {summary}
                              </p>
                            )}
                          </div>
                          <div style={{ paddingTop: 16, borderTop: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, flexWrap: 'wrap', gap: 8 }}>
                            <div>
                              <div style={{ fontSize: '0.58rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: C.textL, fontWeight: 700, marginBottom: 3 }}>Compensation</div>
                              <div style={{ fontSize: '0.825rem', fontWeight: 500, color: C.text }}>{job.salary || 'Unspecified'}</div>
                            </div>
                            <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                              <button onClick={() => setSelectedJob(job)}
                                style={{ padding: '6px 12px', borderRadius: 9, border: `1px solid ${C.border}`, background: 'transparent', color: C.text, fontSize: '0.75rem', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
                                Details
                              </button>
                              {!isApplied && (
                                <button onClick={() => handleApply(job)} disabled={saving === job.id}
                                  style={{ padding: '6px 12px', borderRadius: 9, background: C.primary, color: C.primaryText, border: 'none', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s', opacity: saving === job.id ? 0.6 : 1 }}>
                                  {saving === job.id ? '…' : 'Apply'}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {/* No results */}
              {searchDone && !searching && filteredJobs.length === 0 && (
                <div style={{ textAlign: 'center', padding: '72px 0', animation: 'skelFadeIn 0.4s ease' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 500, color: C.text, margin: '0 0 8px' }}>No results found</h3>
                  <p style={{ color: C.textL, fontSize: '0.875rem' }}>Try adjusting your search or filters</p>
                </div>
              )}

              {/* Infinite scroll */}
              {loadingMore && (
                <div style={{ marginTop: 18 }}>
                  <ScrollLoadingIndicator dark={dark} total={filteredJobs.length} loaded={visibleJobs.length} />
                  <div className="jobs-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                    {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} delay={i * 0.08} dark={dark} />)}
                  </div>
                </div>
              )}

              {/* End of results */}
              {searchDone && noMoreResults && !loadingMore && filteredJobs.length > 0 && (
                <div style={{ textAlign: 'center', padding: '28px 0 0', animation: 'skelFadeIn 0.4s ease' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 18px', borderRadius: 8, background: C.surfaceL, border: `1px solid ${C.border}` }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: C.textL }} />
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, color: C.textL, letterSpacing: '0.06em' }}>All results loaded · {filteredJobs.length} total</span>
                  </div>
                </div>
              )}

              <div ref={sentinelRef} style={{ height: 60, width: '100%' }} />
            </div>
          )}

          {/* ── APPLIED / TRACKED TAB ───────────────────────────────────────── */}
          {tab === 'applied' && (
            <div style={{ animation: 'skelFadeIn 0.4s ease' }}>
              {appliedJobs.length > 0 && (
                <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
                  {[
                    { label: 'Total Applications', val: appliedJobs.length, c: '#3b82f6' },
                    { label: 'Unique Entities', val: new Set(appliedJobs.map(j => j.company)).size, c: '#8b5cf6' },
                    { label: 'Gmail Verified', val: appliedJobs.filter(j => findMatch(j)).length, c: '#10b981' },
                    { label: 'Active Pipeline', val: appliedJobs.filter(j => j.stage !== 'Rejected').length, c: '#f59e0b' },
                  ].map((s, i) => (
                    <div key={i} style={{ padding: '20px 16px', textAlign: 'center', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18, boxShadow: C.shadow, animation: `skelFadeIn 0.5s ease ${i * 0.06}s both` }}>
                      <div style={{ fontSize: '2.2rem', fontWeight: 400, color: s.c, lineHeight: 1, letterSpacing: '-0.04em' }}>{s.val}</div>
                      <div style={{ fontSize: '0.58rem', fontWeight: 700, color: C.textL, textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: 10 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              )}

              {loadingApplied ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
                  <LoadingSpinner inline dark={dark} />
                </div>
              ) : appliedJobs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '80px 0', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20 }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 500, color: C.text, margin: '0 0 8px' }}>Zero Activity Records</h3>
                  <p style={{ color: C.textM, marginTop: 8, fontWeight: 300 }}>Begin applying to jobs to populate this infrastructure.</p>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <span style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.textL }}>Application Records</span>
                    <span style={{ padding: '3px 10px', borderRadius: 6, background: 'rgba(59,130,246,0.1)', color: '#3b82f6', fontSize: '0.7rem', fontWeight: 700 }}>{appliedJobs.length} tracked</span>
                  </div>
                  <div className="jobs-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                    {appliedJobs.map((j, i) => {
                      const ss = STAGE_S[j.stage || 'Applied'] || STAGE_S.Applied;
                      const color = getColor(j.company);
                      return (
                        <div key={j.id || i}
                          style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18, padding: 20, boxShadow: C.cardShadow, animation: `skelFadeIn 0.5s ease ${Math.min(i * 0.04, 0.3)}s both` }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                            <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}15`, border: `1px solid ${color}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.825rem', fontWeight: 700, color }}>{abbr(j.company)}</div>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 11px', borderRadius: 8, background: ss.bg, border: `1px solid ${C.border}` }}>
                              <div style={{ width: 5, height: 5, borderRadius: '50%', background: ss.color }} />
                              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: ss.color }}>{j.stage || 'Applied'}</span>
                            </div>
                          </div>
                          <h3 style={{ fontSize: '0.95rem', fontWeight: 500, color: C.text, margin: '0 0 4px' }}>{j.title}</h3>
                          <div style={{ fontSize: '0.825rem', color: C.textM, marginBottom: 16 }}>{j.company}</div>
                          <div style={{ paddingTop: 16, borderTop: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                              <div style={{ fontSize: '0.58rem', color: C.textL, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 3 }}>TIMESTAMP</div>
                              <div style={{ fontSize: '0.825rem', color: C.text, fontWeight: 500 }}>{fmtDate(j.applied_at)}</div>
                            </div>
                            <button onClick={() => setSelectedApplied(j)}
                              style={{ padding: '6px 14px', borderRadius: 9, border: `1px solid ${C.border}`, background: 'transparent', color: C.text, fontSize: '0.775rem', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
                              View Node
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Modals */}
      {selectedJob && (
        <JobModal job={selectedJob} userId={user?.id} dark={dark} onClose={() => setSelectedJob(null)} onApply={handleApply} isApplied={appliedSet.has(selectedJob.id)} isSaving={saving === selectedJob.id} />
      )}
      {selectedApplied && (
        <JobModal job={selectedApplied} dark={dark} onClose={() => setSelectedApplied(null)} onApply={handleApply} isApplied={true} isSaving={false} />
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, padding: '12px 20px', borderRadius: 12, background: toast.type === 'error' ? '#ef4444' : (dark ? '#FFFFFF' : '#09090B'), color: toast.type === 'error' ? '#fff' : (dark ? '#000' : '#fff'), fontSize: '0.875rem', fontWeight: 600, boxShadow: '0 10px 30px rgba(0,0,0,0.25)', animation: 'toastIn 0.3s cubic-bezier(0.16,1,0.3,1)', maxWidth: 300 }}>{toast.msg}</div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { display: none; }

        @keyframes skelFadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes skelPulse {
          0%, 100% { opacity: 0.3; }
          50%       { opacity: 0.7; }
        }
        @keyframes dotBounce {
          0%, 80%, 100% { transform: scale(0.7); opacity: 0.4; }
          40%           { transform: scale(1.15); opacity: 1; }
        }
        @keyframes barSlide {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(250%); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes tooltipFade {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.97) translateY(12px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes reqPulse {
          0%, 100% { opacity: 0.4; transform: scale(0.8); }
          50%       { opacity: 1; transform: scale(1.2); }
        }
        button:active { transform: scale(0.97) !important; }

        /* ── Mobile hamburger: hidden on desktop, shown on mobile ── */
        .mobile-only { display: none; }

        /* ── Mobile Responsive ────────────────────────────────────────── */
        @media (max-width: 768px) {
          .main-content {
            margin-left: 0 !important;
          }
          .mobile-only {
            display: flex !important;
          }
          .header-user-info {
            display: none !important;
          }
          .main-pad {
            padding: 20px 16px !important;
          }
          .jobs-grid {
            grid-template-columns: 1fr !important;
          }
          .stats-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }

        @media (max-width: 480px) {
          .stats-grid {
            grid-template-columns: 1fr 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}