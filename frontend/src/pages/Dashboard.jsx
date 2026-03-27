import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { applicationsAPI, gmailAPI, recruiterAPI } from '../api/client';
import Sidebar from '../components/Sidebar';
import useDarkMode from '../hooks/useDarkMode';
import LoadingSpinner from '../components/LoadingSpinner';

const PAGE_SIZE = 8;

// ── Ultra-Premium 3D Minimal Network Background ──
function MinimalNetwork3D({ dark }) {
  const mountRef = useRef(null);
  useEffect(() => {
    let animId, renderer, scene;
    const el = mountRef.current;
    if (!el) return;
    const init = () => {
      const THREE = window.THREE;
      if (!THREE) return;
      const W = el.clientWidth, H = el.clientHeight;
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(W, H);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      el.appendChild(renderer.domElement);
      scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(60, W / H, 1, 100);
      camera.position.set(0, 0, 20);
      const particleCount = 120;
      const positions = new Float32Array(particleCount * 3);
      for (let i = 0; i < particleCount * 3; i++) positions[i] = (Math.random() - 0.5) * 40;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const pMat = new THREE.PointsMaterial({ color: dark ? 0xffffff : 0x6366f1, size: 0.15, transparent: true, opacity: dark ? 0.3 : 0.4 });
      scene.add(new THREE.Points(geo, pMat));
      const lineMat = new THREE.LineBasicMaterial({ color: dark ? 0xffffff : 0x6366f1, transparent: true, opacity: dark ? 0.05 : 0.08 });
      const linePositions = [];
      for (let i = 0; i < particleCount; i++) {
        for (let j = i + 1; j < particleCount; j++) {
          const dx = positions[i*3]-positions[j*3], dy = positions[i*3+1]-positions[j*3+1], dz = positions[i*3+2]-positions[j*3+2];
          if (Math.sqrt(dx*dx+dy*dy+dz*dz) < 6) linePositions.push(positions[i*3],positions[i*3+1],positions[i*3+2],positions[j*3],positions[j*3+1],positions[j*3+2]);
        }
      }
      const lineGeo = new THREE.BufferGeometry();
      lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
      scene.add(new THREE.LineSegments(lineGeo, lineMat));
      let mouseX = 0, mouseY = 0;
      const onMove = (e) => { mouseX = (e.clientX/window.innerWidth-0.5)*2; mouseY = (e.clientY/window.innerHeight-0.5)*2; };
      window.addEventListener('mousemove', onMove);
      const clock = new THREE.Clock();
      const tick = () => {
        animId = requestAnimationFrame(tick);
        const t = clock.getElapsedTime();
        scene.rotation.y = t*0.02 + mouseX*0.05;
        scene.rotation.x = t*0.01 + mouseY*0.05;
        renderer.render(scene, camera);
      };
      tick();
      el._cleanup = () => { cancelAnimationFrame(animId); window.removeEventListener('mousemove', onMove); renderer.dispose(); if (renderer.domElement.parentNode === el) el.removeChild(renderer.domElement); };
    };
    if (window.THREE) init();
    else {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
      s.onload = init;
      document.head.appendChild(s);
    }
    return () => { if (el?._cleanup) el._cleanup(); };
  }, [dark]);
  return <div ref={mountRef} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }} />;
}

function getC(dark) {
  return {
    bg:          dark ? '#030303'                : '#F9FAFB',
    surface:     dark ? '#0A0A0A'                : '#FFFFFF',
    border:      dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)',
    text:        dark ? '#FFFFFF'                : '#09090B',
    textM:       dark ? '#A1A1AA'                : '#71717A',
    textL:       dark ? '#52525B'                : '#A1A1AA',
    primary:     dark ? '#FFFFFF'                : '#000000',
    primaryText: dark ? '#000000'                : '#FFFFFF',
    surfaceL:    dark ? 'rgba(255,255,255,0.02)' : '#F4F4F5',
    surfaceLow:  dark ? 'rgba(255,255,255,0.01)' : '#FFFFFF',
    green:  '#10b981', orange: '#f59e0b',
    purple: '#8b5cf6', red:    '#ef4444', blue: '#3b82f6',
  };
}

const STAGE_CFG_FN = (C) => ({
  Applied:   { bg: C.surfaceL, color: C.text, dot: C.blue   },
  Interview: { bg: C.surfaceL, color: C.text, dot: C.orange },
  Offer:     { bg: C.surfaceL, color: C.text, dot: C.green  },
  Rejected:  { bg: C.surfaceL, color: C.text, dot: C.red    },
});

const AV_COLORS = ['#3b82f6','#8b5cf6','#06b6d4','#10b981','#f59e0b','#ef4444','#ec4899','#14b8a6'];
function avatarColor(s) { let h=0; for(let i=0;i<(s||'').length;i++) h=s.charCodeAt(i)+((h<<5)-h); return AV_COLORS[Math.abs(h)%AV_COLORS.length]; }
function initials(n) { const w=(n||'').trim().split(/\s+/); return w.length>=2?(w[0][0]+w[1][0]).toUpperCase():(n||'??').slice(0,2).toUpperCase(); }
function fmtDate(d) { if(!d) return '—'; const dt=new Date(d+'T12:00:00'); if(isNaN(dt)) return String(d).slice(0,10); return dt.toLocaleDateString('en-US',{month:'short',day:'numeric'}); }

function StatBar({ pct, color }) {
  const [w, setW] = useState(0);
  useEffect(() => { const t = setTimeout(() => setW(pct), 120); return () => clearTimeout(t); }, [pct]);
  return (
    <div style={{ height: 3, background: color+'20', borderRadius: 9999, overflow: 'hidden', marginTop: 16 }}>
      <div style={{ height: '100%', width: `${w}%`, background: color, transition: 'width 1s cubic-bezier(0.16, 1, 0.3, 1)' }}/>
    </div>
  );
}

function AnimatedSyncIcon({ syncing }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={syncing ? 'sync-active-svg' : ''}>
      <path d="M4 12a8 8 0 0 1 8-8 8 8 0 0 1 8 8" /><path d="M20 12a8 8 0 0 1-8 8 8 8 0 0 1-8-8" />
      <polyline points="4 4 4 12 12 12" /><polyline points="20 20 20 12 12 12" />
    </svg>
  );
}

const SYNC_STEPS = [
  { key: 'connect', label: 'Connecting to Gmail...'         },
  { key: 'fetch',   label: 'Fetching emails...'             },
  { key: 'filter',  label: 'Pre-filtering noise...'         },
  { key: 'ai',      label: 'AI classifying emails...'       },
  { key: 'enrich',  label: 'Enriching recruiter data...'    },
  { key: 'save',    label: 'Saving applications...'         },
];

function SyncOverlay({ dark, step }) {
  const C = getC(dark);
  const activeIdx = SYNC_STEPS.findIndex(s => s.key === step);
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 30, borderRadius: 20,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24,
      background: dark ? 'rgba(3,3,3,0.90)' : 'rgba(249,250,251,0.93)',
      backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
      animation: 'overlayFadeIn 0.2s ease',
    }}>
      <LoadingSpinner overlay dark={dark} />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <div style={{ fontSize: '0.95rem', fontWeight: 600, color: C.text, letterSpacing: '-0.01em' }}>
          Syncing Your Inbox
        </div>
        <div style={{ fontSize: '0.78rem', color: C.textM }}>
          This may take 15–30 seconds
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 240 }}>
        {SYNC_STEPS.map((s, i) => {
          const isDone   = i < activeIdx;
          const isActive = i === activeIdx;
          return (
            <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 12, opacity: isDone ? 0.35 : isActive ? 1 : 0.18, transition: 'opacity 0.4s ease' }}>
              <div style={{
                width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: isDone ? C.green : isActive ? C.blue : C.surfaceL,
                border: `1px solid ${isDone ? C.green : isActive ? C.blue : C.border}`,
                transition: 'all 0.35s ease',
              }}>
                {isDone ? (
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                ) : isActive ? (
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', animation: 'pulse 1.2s ease-in-out infinite' }}/>
                ) : (
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: C.textL }}/>
                )}
              </div>
              <span style={{ fontSize: '0.8rem', color: isActive ? C.text : C.textM, fontWeight: isActive ? 600 : 400, transition: 'all 0.3s ease' }}>
                {s.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user }    = useAuth();
  const { dark }    = useDarkMode();
  const C           = getC(dark);
  const STAGE_CFG   = STAGE_CFG_FN(C);

  const [apps,        setApps]        = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [syncing,     setSyncing]     = useState(false);
  const [syncStep,    setSyncStep]    = useState('connect');
  const [enriching,   setEnriching]   = useState(false);
  const [search,      setSearch]      = useState('');
  const [stageFilter, setSF]          = useState('All');
  const [page,        setPage]        = useState(0);
  const [toast,       setToast]       = useState(null);
  const [editApp,     setEditApp]     = useState(null);
  const [editForm,    setEditForm]    = useState({});
  const [saving,      setSaving]      = useState(false);
  const [loadError,   setLoadError]   = useState(null);
  const [syncError,   setSyncError]   = useState(null);

  const loadApps = useCallback(async () => {
    if (!user?.id) return;
    setLoadError(null);
    try {
      const r    = await applicationsAPI.getAll(user.id);
      const data = r?.data?.data ?? r?.data ?? [];
      setApps(Array.isArray(data) ? data : []);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      const msg    = typeof detail === 'string' ? detail : 'Failed to load applications';
      setLoadError(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { if (user?.id) loadApps(); }, [user?.id, loadApps]);
  useEffect(() => { setPage(0); }, [search, stageFilter]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg: typeof msg === 'string' ? msg : 'Unknown error', type });
    setTimeout(() => setToast(null), 6000);
  };

  const handleSync = async () => {
    if (!user?.id || syncing) return;
    setSyncing(true);
    setSyncError(null);
    setSyncStep('connect');

    const stepTimings = [
      { key: 'fetch',  delay: 900  },
      { key: 'filter', delay: 2200 },
      { key: 'ai',     delay: 4000 },
      { key: 'enrich', delay: 8000 },
      { key: 'save',   delay: 12000 },
    ];
    const timers = stepTimings.map(({ key, delay }) =>
      setTimeout(() => setSyncStep(key), delay)
    );

    try {
      const r     = await gmailAPI.sync(user.id);
      timers.forEach(clearTimeout);

      const stats  = r?.data?.stats;
      const msg    = r?.data?.message || 'Sync complete!';
      const detail = stats
        ? `✅ ${stats.saved ?? 0} saved · ${stats.ai_processed ?? 0} scanned · ${(stats.l1_blocked ?? 0) + (stats.l2_blocked ?? 0)} filtered`
        : msg;
      showToast(detail);

      await new Promise(res => setTimeout(res, 700));
      await loadApps();
    } catch (err) {
      timers.forEach(clearTimeout);
      const errData = err?.response?.data;
      const status  = err?.response?.status;

      let userMsg = 'Sync failed — check backend logs';
      if (typeof errData?.detail === 'string')       userMsg = errData.detail;
      else if (Array.isArray(errData?.detail))        userMsg = errData.detail.map(e => e?.msg || JSON.stringify(e)).join(' · ');
      else if (typeof errData === 'string')           userMsg = errData;
      else if (err?.message)                          userMsg = err.message;

      setSyncError({ status, message: userMsg });
      showToast(`${status ? `HTTP ${status}: ` : ''}${userMsg}`, 'error');
      await loadApps(); 
    } finally {
      setSyncing(false);
      setSyncStep('connect');
    }
  };

  const handleEnrichMissing = async () => {
    if (!user?.id) return; setEnriching(true);
    try   { const r = await recruiterAPI.enrichMissing(user.id); showToast(r?.data?.message || 'Done!'); await loadApps(); }
    catch (err) { const d = err?.response?.data?.detail; showToast(typeof d==='string'?d:'Failed','error'); }
    finally { setEnriching(false); }
  };

  const handleEnrichAll = async () => {
    if (!user?.id) return; setEnriching(true);
    try   { const r = await recruiterAPI.enrichAll(user.id); showToast(r?.data?.message || 'Done!'); await loadApps(); }
    catch (err) { const d = err?.response?.data?.detail; showToast(typeof d==='string'?d:'Failed','error'); }
    finally { setEnriching(false); }
  };

  const openEdit = (app) => {
    setEditApp(app);
    setEditForm({ company_name: app.company_name||'', position: app.position||'', stage: app.stage||'Applied', recruiter_name: app.recruiter_name||'', recruiter_title: app.recruiter_title||'', recruiter_email: app.recruiter_email||'', linkedin_url: app.linkedin_url||'' });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault(); if (!editApp) return; setSaving(true);
    try {
      await applicationsAPI.updateStage(editApp.id, editForm.stage);
      await applicationsAPI.updateRecruiter(editApp.id, { name: editForm.recruiter_name, title: editForm.recruiter_title, email: editForm.recruiter_email, linkedin: editForm.linkedin_url });
      showToast('Updated!'); setEditApp(null); await loadApps();
    } catch (err) { const d = err?.response?.data?.detail; showToast(typeof d==='string'?d:'Failed','error'); }
    finally { setSaving(false); }
  };

  const total      = apps.length;
  const applied    = apps.filter(a => a.stage==='Applied').length;
  const interviews = apps.filter(a => a.stage==='Interview').length;
  const offers     = apps.filter(a => a.stage==='Offer').length;
  const withRec    = apps.filter(a => (a.recruiter_name||'').trim()||(a.recruiter_email||'').trim()||(a.linkedin_url||'').trim()).length;
  const recPct  = total>0 ? Math.round((withRec/total)*100) : 0;
  const intPct  = total>0 ? Math.round((interviews/total)*100) : 0;
  const offerPct= total>0 ? Math.round((offers/total)*100) : 0;

  const filtered   = apps.filter(a => {
    const ms = !search || a.company_name?.toLowerCase().includes(search.toLowerCase()) || a.position?.toLowerCase().includes(search.toLowerCase());
    const mt = stageFilter==='All' || a.stage===stageFilter;
    return ms && mt;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length/PAGE_SIZE));
  const safePage   = Math.max(0, Math.min(page, totalPages - 1)); // FIX: Bulletproof math
  const pageData   = filtered.slice(safePage*PAGE_SIZE, safePage*PAGE_SIZE+PAGE_SIZE);
  const STAGES     = ['Applied','Interview','Offer','Rejected'];
  const COLS = [
    {key:'company',        label:'COMPANY',   minW:220},
    {key:'position',       label:'ROLE',      minW:180},
    {key:'applied_date',   label:'APPLIED',   minW:100},
    {key:'stage',          label:'STAGE',     minW:120},
    {key:'recruiter_name', label:'RECRUITER', minW:160},
    {key:'recruiter_email',label:'EMAIL',     minW:200},
    {key:'recruiter_title',label:'TITLE',     minW:180},
    {key:'linkedin_url',   label:'LINKEDIN',  minW:100},
  ];

  if (loading) return <LoadingSpinner dark={dark} />;

  return (
    <div className="layout-container" style={{display:'flex',minHeight:'100vh',background:C.bg,fontFamily:"'Inter', system-ui, sans-serif",transition:'background 0.4s cubic-bezier(0.16, 1, 0.3, 1)',position:'relative'}}>

      <MinimalNetwork3D dark={dark} />
      <Sidebar />

      <div className="main-content" style={{flex:1,display:'flex',flexDirection:'column',minWidth:0,position:'relative',zIndex:10,marginLeft:'var(--sidebar-width, 280px)',transition:'margin-left 0.5s cubic-bezier(0.16, 1, 0.3, 1)'}}>

        {/* ── Header ── */}
        <header className="dash-header" style={{background:dark?'rgba(3,3,3,0.7)':'rgba(249,250,251,0.8)',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'20px 48px',position:'sticky',top:0,zIndex:50,backdropFilter:'blur(24px) saturate(180%)',borderBottom:`1px solid ${C.border}`}}>
          <div className="header-left" style={{display:'flex',alignItems:'center',gap:16}}>
            <h1 style={{fontSize:'1.5rem',fontWeight:600,color:C.text,margin:0,letterSpacing:'-0.03em'}}>Workspace</h1>
            {syncing && (
              <span style={{display:'inline-flex',alignItems:'center',gap:7,fontSize:'0.65rem',color:C.bg,padding:'4px 14px',borderRadius:999,fontWeight:600,letterSpacing:'0.12em',textTransform:'uppercase',animation:'pulse 2s infinite'}}>
                <LoadingSpinner inline dark={!dark} />
                
              </span>
            )}
          </div>
          <div className="header-actions" style={{display:'flex',alignItems:'center',gap:12}}>
            <button onClick={handleSync} disabled={syncing} className={`btn-sync ${syncing?'is-syncing':''}`}
              style={{display:'inline-flex',alignItems:'center',gap:10,height:44,padding:'0 24px',background:syncing?C.surfaceL:C.primary,color:syncing?C.text:C.primaryText,border:`1px solid ${syncing?C.border:'transparent'}`,borderRadius:12,fontSize:'0.85rem',fontWeight:600,fontFamily:'inherit',cursor:syncing?'not-allowed':'pointer',transition:'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'}}>
              <AnimatedSyncIcon syncing={syncing} />
              {syncing ? 'Syncing via IMAP...' : 'Sync Inbox'}
            </button>
            <button onClick={handleEnrichMissing} disabled={enriching} className="btn-ghost"
              style={{display:'inline-flex',alignItems:'center',gap:8,height:44,padding:'0 24px',background:C.surfaceL,color:C.text,border:`1px solid ${C.border}`,borderRadius:12,fontSize:'0.85rem',fontWeight:500,fontFamily:'inherit',cursor:enriching?'not-allowed':'pointer',transition:'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'}}>
              {enriching ? <><LoadingSpinner inline dark={dark} /> Processing...</> : 'Find Recruiters'}
            </button>
            <button onClick={handleEnrichAll} disabled={enriching} className="btn-ghost mobile-hide"
              style={{height:44,padding:'0 24px',background:'transparent',color:C.textM,border:`1px solid ${C.border}`,borderRadius:12,fontSize:'0.85rem',fontWeight:500,fontFamily:'inherit',cursor:enriching?'not-allowed':'pointer',transition:'all 0.3s'}}>
              Force Re-Enrich
            </button>
          </div>
        </header>

        <main className="dash-body" style={{flex:1,overflowY:'auto',padding:'48px'}}>

          {/* ── 500 Error Banner ── */}
          {syncError && (
            <div className="fade-in" style={{marginBottom:24,padding:'16px 20px',borderRadius:12,background:dark?'rgba(239,68,68,0.08)':'#fef2f2',border:`1px solid ${C.red}50`,display:'flex',alignItems:'flex-start',gap:12}}>
              <svg width="18" height="18" fill="none" stroke={C.red} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,marginTop:1}}>
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <div style={{flex:1}}>
                <div style={{fontSize:'0.85rem',fontWeight:600,color:C.red,marginBottom:4}}>
                  Sync Failed {syncError.status ? `— HTTP ${syncError.status}` : ''}
                </div>
                <div style={{fontSize:'0.8rem',color:C.textM,fontFamily:'monospace',wordBreak:'break-all',lineHeight:1.6}}>
                  {syncError.message}
                </div>
              </div>
              <button onClick={() => setSyncError(null)} style={{background:'none',border:'none',cursor:'pointer',color:C.textM,padding:'0 4px',flexShrink:0,fontSize:'1rem'}}>✕</button>
            </div>
          )}

          {/* ── Stats Grid ── */}
          <div className="stats-grid" style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:24,marginBottom:40}}>
            {[
              {label:'Total Applications',  value:total,      sub:`${applied} pending review`,    bar:total>0?(applied/total)*100:0, barColor:C.blue,   icon:'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2'},
              {label:'Interviews Scheduled',value:interviews, sub:`${intPct}% conversion rate`,   bar:intPct,                        barColor:C.orange, icon:'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'},
              {label:'Offers Secured',      value:offers,     sub:`${offerPct}% offer rate`,      bar:offerPct,                      barColor:C.green,  icon:'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z'},
              {label:'Recruiters Enriched', value:withRec,    sub:`${recPct}% contact matched`,   bar:recPct,                        barColor:C.purple, icon:'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z'},
            ].map((card, i) => (
              <div key={i} className="bento fade-up" style={{animationDelay:`${i*0.1}s`,background:C.surface,border:`1px solid ${C.border}`,borderRadius:20,padding:'32px',position:'relative',overflow:'hidden',boxShadow:dark?'inset 0 1px 1px rgba(255,255,255,0.03)':'0 2px 10px rgba(0,0,0,0.02)'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:24}}>
                  <span style={{fontSize:'0.65rem',fontWeight:600,color:C.textM,letterSpacing:'0.12em',textTransform:'uppercase'}}>{card.label}</span>
                  <svg width="18" height="18" fill="none" stroke={card.barColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d={card.icon}/></svg>
                </div>
                <div style={{fontSize:'3.25rem',fontWeight:400,color:C.text,lineHeight:1,marginBottom:12,letterSpacing:'-0.04em'}}>{card.value}</div>
                <div style={{fontSize:'0.85rem',fontWeight:400,color:C.textM}}>{card.sub}</div>
                <StatBar pct={card.bar} color={card.barColor}/>
              </div>
            ))}
          </div>

          {/* ── Application Table ── */}
          <div className="bento" style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:20,marginBottom:40,overflow:'hidden',boxShadow:dark?'inset 0 1px 1px rgba(255,255,255,0.03)':'0 2px 10px rgba(0,0,0,0.02)',position:'relative'}}>

            {/* Sync overlay */}
            {syncing && <SyncOverlay dark={dark} step={syncStep} />}

            <div className="table-header-bar" style={{padding:'28px 36px',display:'flex',alignItems:'center',justifyContent:'space-between',borderBottom:`1px solid ${C.border}`}}>
              <div className="table-title-group" style={{display:'flex',alignItems:'center',gap:20}}>
                <h2 style={{fontSize:'1.15rem',fontWeight:600,color:C.text,margin:0,letterSpacing:'-0.02em'}}>Application Records</h2>
                <span style={{fontSize:'0.75rem',color:C.textM,background:C.surfaceL,padding:'4px 12px',borderRadius:999,border:`1px solid ${C.border}`}}>{filtered.length} Items</span>
                <div className="stage-filters" style={{display:'flex',gap:8,marginLeft:24}}>
                  {['All','Applied','Interview','Offer','Rejected'].map(s => (
                    <button key={s} onClick={() => setSF(s)}
                      style={{padding:'6px 16px',borderRadius:999,border:`1px solid ${stageFilter===s?C.border:'transparent'}`,fontSize:'0.8rem',fontWeight:500,cursor:'pointer',fontFamily:'inherit',transition:'all 0.2s',background:stageFilter===s?C.surfaceL:'transparent',color:stageFilter===s?C.text:C.textM}}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{position:'relative'}}>
                <svg width="14" height="14" fill="none" stroke={C.textM} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{position:'absolute',left:16,top:'50%',transform:'translateY(-50%)'}}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                <input placeholder="Search company or role..." value={search} onChange={e => setSearch(e.target.value)} className="search-input"
                  style={{paddingLeft:40,paddingRight:16,height:44,border:`1px solid ${C.border}`,borderRadius:12,fontSize:'0.85rem',outline:'none',width:260,fontFamily:'inherit',color:C.text,background:C.surfaceL,transition:'all 0.2s'}}
                  onFocus={e => { e.target.style.borderColor=C.textM; e.target.style.background=C.surfaceLow; }}
                  onBlur={e  => { e.target.style.borderColor=C.border; e.target.style.background=C.surfaceL; }}/>
              </div>
            </div>

            <div style={{overflowX:'auto',WebkitOverflowScrolling:'touch'}}>
              <table style={{width:'100%',minWidth:1100,borderCollapse:'collapse'}}>
                <thead>
                  <tr style={{background:C.surfaceL,borderBottom:`1px solid ${C.border}`}}>
                    {COLS.map(col => (
                      <th key={col.key} style={{padding:'20px 36px',fontSize:'0.65rem',fontWeight:600,color:C.textM,textAlign:'left',letterSpacing:'0.12em',whiteSpace:'nowrap',minWidth:col.minW,textTransform:'uppercase'}}>{col.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loadError ? (
                    <tr><td colSpan={8} style={{textAlign:'center',padding:'80px 0'}}>
                      <div style={{fontSize:'1rem',fontWeight:500,color:C.red,marginBottom:8}}>⚠ {loadError}</div>
                      <button onClick={loadApps} style={{padding:'10px 24px',background:C.primary,color:C.primaryText,border:'none',borderRadius:10,fontSize:'0.85rem',fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Retry</button>
                    </td></tr>
                  ) : pageData.length === 0 ? (
                    <tr><td colSpan={8} style={{textAlign:'center',padding:'100px 0'}}>
                      <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:16}}>
                        <svg width="36" height="36" fill="none" stroke={C.textL} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                        <div style={{fontSize:'1rem',fontWeight:500,color:C.text}}>
                          {apps.length>0 ? 'No results for this filter.' : 'No applications yet.'}
                        </div>
                        <div style={{fontSize:'0.85rem',color:C.textM}}>
                          {apps.length>0 ? 'Clear your search or change the stage filter.' : 'Click "Sync Inbox" to import from Gmail.'}
                        </div>
                      </div>
                    </td></tr>
                  ) : pageData.map((row, i) => {
                    const color = avatarColor(row.company_name||'');
                    const ab    = initials(row.company_name||'');
                    const stage = STAGE_CFG[row.stage] || STAGE_CFG.Applied;
                    return (
                      <tr key={row.id||i} style={{borderBottom:`1px solid ${C.border}`,transition:'background 0.2s',cursor:'pointer'}}
                        onMouseEnter={e => e.currentTarget.style.background=C.surfaceL}
                        onMouseLeave={e => e.currentTarget.style.background='transparent'}
                        onClick={() => openEdit(row)}>
                        <td style={{padding:'20px 36px',minWidth:220}}>
                          <div style={{display:'flex',alignItems:'center',gap:16}}>
                            <div style={{width:36,height:36,borderRadius:10,background:color+'15',border:`1px solid ${color}30`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.75rem',fontWeight:600,color,flexShrink:0}}>{ab}</div>
                            <span style={{fontSize:'0.9rem',fontWeight:500,color:C.text,whiteSpace:'nowrap'}}>{row.company_name}</span>
                          </div>
                        </td>
                        <td style={{padding:'20px 36px'}}><span style={{fontSize:'0.85rem',color:C.textM,whiteSpace:'nowrap',fontWeight:400}}>{row.position}</span></td>
                        <td style={{padding:'20px 36px'}}><span style={{fontSize:'0.85rem',color:C.textM,whiteSpace:'nowrap'}}>{fmtDate(row.applied_date)}</span></td>
                        <td style={{padding:'20px 36px'}}>
                          <div style={{display:'inline-flex',alignItems:'center',gap:8,padding:'6px 12px',borderRadius:8,background:stage.bg,border:`1px solid ${C.border}`}}>
                            <div style={{width:6,height:6,borderRadius:'50%',background:stage.dot,boxShadow:`0 0 8px ${stage.dot}80`}}/>
                            <span style={{fontSize:'0.75rem',fontWeight:500,color:stage.color,whiteSpace:'nowrap'}}>{row.stage||'Applied'}</span>
                          </div>
                        </td>
                        <td style={{padding:'20px 36px'}}>
                          {row.recruiter_name ? <span style={{fontSize:'0.85rem',color:C.text,whiteSpace:'nowrap'}}>{row.recruiter_name}</span> : <span style={{fontSize:'0.85rem',color:C.textL,fontStyle:'italic'}}>Pending</span>}
                        </td>
                        <td style={{padding:'20px 36px'}} onClick={e => e.stopPropagation()}>
                          {row.recruiter_email
                            ? <a href={`mailto:${row.recruiter_email}`} style={{fontSize:'0.85rem',color:C.text,textDecoration:'none',display:'inline-flex',alignItems:'center',background:C.surfaceL,border:`1px solid ${C.border}`,borderRadius:8,padding:'6px 14px',whiteSpace:'nowrap',transition:'all 0.2s'}} onMouseEnter={e=>e.currentTarget.style.background=C.border} onMouseLeave={e=>e.currentTarget.style.background=C.surfaceL}>{row.recruiter_email}</a>
                            : <span style={{fontSize:'0.85rem',color:C.textL,fontStyle:'italic'}}>—</span>}
                        </td>
                        <td style={{padding:'20px 36px'}}>
                          {row.recruiter_title ? <span style={{fontSize:'0.85rem',color:C.textM,whiteSpace:'nowrap'}}>{row.recruiter_title}</span> : <span style={{fontSize:'0.85rem',color:C.textL,fontStyle:'italic'}}>—</span>}
                        </td>
                        <td style={{padding:'20px 36px'}} onClick={e => e.stopPropagation()}>
                          {row.linkedin_url
                            ? <a href={row.linkedin_url} target="_blank" rel="noreferrer" style={{display:'inline-flex',alignItems:'center',gap:8,background:C.surfaceL,color:C.text,border:`1px solid ${C.border}`,borderRadius:8,padding:'6px 14px',fontSize:'0.75rem',fontWeight:500,textDecoration:'none',whiteSpace:'nowrap',transition:'all 0.2s'}} onMouseEnter={e=>e.currentTarget.style.background=C.border} onMouseLeave={e=>e.currentTarget.style.background=C.surfaceL}>
                                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                                Profile
                              </a>
                            : <span style={{fontSize:'0.85rem',color:C.textL,fontStyle:'italic'}}>—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'20px 36px',borderTop:`1px solid ${C.border}`}}>
                <span style={{fontSize:'0.8rem',color:C.textM}}>
                  Showing {filtered.length===0?0:safePage*PAGE_SIZE+1}–{Math.min(safePage*PAGE_SIZE+PAGE_SIZE,filtered.length)} of {filtered.length}
                </span>
                <div style={{display:'flex',gap:8}}>
                  <button onClick={() => setPage(p => Math.max(0,p-1))} disabled={safePage===0} style={{height:36,padding:'0 16px',background:C.surfaceL,color:safePage===0?C.textL:C.text,border:`1px solid ${C.border}`,borderRadius:8,fontSize:'0.8rem',fontFamily:'inherit',cursor:safePage===0?'not-allowed':'pointer',transition:'all 0.2s'}}>← Prev</button>
                  <button onClick={() => setPage(p => Math.min(totalPages-1,p+1))} disabled={safePage>=totalPages-1} style={{height:36,padding:'0 16px',background:C.surfaceL,color:safePage>=totalPages-1?C.textL:C.text,border:`1px solid ${C.border}`,borderRadius:8,fontSize:'0.8rem',fontFamily:'inherit',cursor:safePage>=totalPages-1?'not-allowed':'pointer',transition:'all 0.2s'}}>Next →</button>
                </div>
              </div>
            )}
          </div>

          {/* ── Record Context / Edit ── */}
          <div className="bento fade-up" style={{animationDelay:'0.6s',background:C.surface,border:`1px solid ${C.border}`,borderRadius:20,boxShadow:dark?'inset 0 1px 1px rgba(255,255,255,0.03)':'0 2px 10px rgba(0,0,0,0.02)',overflow:'hidden'}}>
            <div style={{padding:'28px 36px',borderBottom:`1px solid ${C.border}`}}>
              <div style={{fontSize:'1.15rem',fontWeight:600,color:C.text,letterSpacing:'-0.02em'}}>Record Context</div>
              <div style={{fontSize:'0.85rem',color:C.textM,marginTop:6}}>Click any row above, or pick from the dropdown below.</div>
            </div>
            <div style={{padding:'36px'}}>
              <div style={{marginBottom:36}}>
                <label style={{display:'block',fontSize:'0.65rem',fontWeight:600,color:C.textM,marginBottom:10,textTransform:'uppercase',letterSpacing:'0.12em'}}>Target Application</label>
                <select
                  style={{height:52,border:`1px solid ${C.border}`,borderRadius:12,padding:'0 16px',fontSize:'0.9rem',fontFamily:'inherit',color:C.text,backgroundColor:C.surface,width:'100%',maxWidth:600,cursor:'pointer',outline:'none',transition:'border-color 0.2s',appearance:'none',backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='${encodeURIComponent(C.textM)}' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,backgroundRepeat:'no-repeat',backgroundPosition:'right 16px center',backgroundSize:'16px'}}
                  value={editApp?.id||''} onChange={e => { const a = apps.find(x => String(x.id)===e.target.value); a ? openEdit(a) : setEditApp(null); }}>
                  <option value="" style={{backgroundColor:C.surface,color:C.text}}>— Select an application —</option>
                  {apps.map(a => <option key={a.id} value={a.id} style={{backgroundColor:C.surface,color:C.text}}>{a.company_name} — {a.position}</option>)}
                </select>
              </div>

              {editApp && (
                <form onSubmit={handleSaveEdit} className="fade-in">
                  <div className="form-grid" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:24,marginBottom:24}}>
                    {[
                      {label:'Company Name',   key:'company_name',   ph:'e.g. Google',            type:'text'},
                      {label:'Job Title',      key:'position',       ph:'e.g. Software Engineer',  type:'text'},
                      {label:'Recruiter Name', key:'recruiter_name', ph:'e.g. Jane Smith',         type:'text'},
                      {label:'Recruiter Title',key:'recruiter_title',ph:'e.g. Tech Recruiter',     type:'text'},
                      {label:'Work Email',     key:'recruiter_email',ph:'e.g. jane@co.com',        type:'email'},
                    ].map(f => (
                      <div key={f.key}>
                        <label style={{display:'block',fontSize:'0.65rem',fontWeight:600,color:C.textM,marginBottom:10,textTransform:'uppercase',letterSpacing:'0.12em'}}>{f.label}</label>
                        <input type={f.type} value={editForm[f.key]||''} placeholder={f.ph}
                          onChange={e => setEditForm({...editForm,[f.key]:e.target.value})}
                          style={{width:'100%',height:52,border:`1px solid ${C.border}`,borderRadius:12,padding:'0 16px',fontSize:'0.9rem',fontFamily:'inherit',color:C.text,outline:'none',background:C.surfaceL,transition:'all 0.2s'}}
                          onFocus={e => { e.target.style.borderColor=C.textM; e.target.style.background=C.surfaceLow; }}
                          onBlur={e  => { e.target.style.borderColor=C.border; e.target.style.background=C.surfaceL; }}/>
                      </div>
                    ))}
                    <div>
                      <label style={{display:'block',fontSize:'0.65rem',fontWeight:600,color:C.textM,marginBottom:10,textTransform:'uppercase',letterSpacing:'0.12em'}}>Stage</label>
                      <select value={editForm.stage||'Applied'} onChange={e => setEditForm({...editForm,stage:e.target.value})}
                        style={{width:'100%',height:52,border:`1px solid ${C.border}`,borderRadius:12,padding:'0 16px',fontSize:'0.9rem',fontFamily:'inherit',color:C.text,backgroundColor:C.surface,cursor:'pointer',outline:'none',transition:'all 0.2s',appearance:'none',backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='${encodeURIComponent(C.textM)}' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,backgroundRepeat:'no-repeat',backgroundPosition:'right 16px center',backgroundSize:'16px'}}>
                        {STAGES.map(s => <option key={s} value={s} style={{backgroundColor:C.surface,color:C.text}}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="form-actions" style={{display:'flex',alignItems:'center',gap:16}}>
                    <button type="submit" disabled={saving} className="btn-solid"
                      style={{display:'inline-flex',alignItems:'center',gap:10,height:48,padding:'0 36px',background:saving?C.border:C.primary,color:saving?C.textM:C.primaryText,border:'none',borderRadius:12,fontSize:'0.95rem',fontWeight:600,fontFamily:'inherit',cursor:saving?'not-allowed':'pointer',transition:'all 0.2s'}}>
                      {saving ? <><LoadingSpinner save /> Saving...</> : 'Update Record'}
                    </button>
                    <button type="button" onClick={() => setEditApp(null)} className="btn-ghost"
                      style={{height:48,padding:'0 24px',background:'transparent',color:C.textM,border:`1px solid ${C.border}`,borderRadius:12,fontSize:'0.95rem',fontWeight:500,fontFamily:'inherit',cursor:'pointer',transition:'all 0.2s'}}>
                      Clear Form
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

        </main>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fade-in" style={{position:'fixed',bottom:32,right:32,zIndex:9999,padding:'16px 24px',borderRadius:12,background:toast.type==='error'?C.red:C.green,color:'#fff',fontSize:'0.9rem',fontWeight:500,boxShadow:'0 10px 30px rgba(0,0,0,0.3)',border:'1px solid rgba(255,255,255,0.1)',maxWidth:440,lineHeight:1.5}}>
          {toast.msg}
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        ::selection { background: ${C.text}; color: ${C.bg}; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 9999px; }
        ::-webkit-scrollbar-thumb:hover { background: ${C.textM}; }
        @keyframes pulse        { 0%,100% { opacity:1; }    50% { opacity:0.5; } }
        @keyframes spin          { to { transform:rotate(360deg); } }
        @keyframes fadeUp        { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes overlayFadeIn { from { opacity:0; } to { opacity:1; } }
        .sync-spin-ring  { animation: spin 1.2s cubic-bezier(0.5,0,0.5,1) infinite; }
        .sync-active-svg { animation: spin 1.5s cubic-bezier(0.4,0,0.2,1) infinite; }
        .btn-sync.is-syncing { box-shadow: 0 0 20px ${dark?'rgba(255,255,255,0.1)':'rgba(0,0,0,0.1)'} !important; }
        .fade-in  { animation: fadeUp 0.4s cubic-bezier(0.16,1,0.3,1) both; }
        .fade-up  { animation: fadeUp 0.8s cubic-bezier(0.16,1,0.3,1) both; }
        .btn-solid:hover:not(:disabled)  { transform:scale(0.98); background:${dark?'#E5E5E5':'#333333'} !important; }
        .btn-sync:not(:disabled):hover   { transform:translateY(-2px); box-shadow:0 4px 15px rgba(255,255,255,0.15) !important; }
        .btn-ghost:hover:not(:disabled)  { background:${C.surfaceL} !important; color:${C.text} !important; border-color:${C.textM} !important; }
        @media (max-width:1400px) { .stats-grid { grid-template-columns:repeat(2,1fr) !important; } }
        @media (max-width:640px)  { .stats-grid { grid-template-columns:1fr !important; } }
        @media (max-width:1024px) { .dash-body { padding:32px !important; } .dash-header { padding:16px 32px !important; } }
        @media (max-width:768px)  {
          .main-content  { margin-left:0 !important; }
          .dash-header   { padding:16px 20px !important; flex-direction:column; align-items:flex-start !important; gap:16px; }
          .header-left   { margin-left:48px !important; }
          .dash-body     { padding:20px !important; }
          .header-actions{ width:100%; justify-content:flex-start; overflow-x:auto; padding-bottom:8px; gap:8px !important; }
          .mobile-hide   { display:none !important; }
          .table-header-bar  { flex-direction:column; align-items:flex-start !important; gap:20px; padding:20px !important; }
          .table-title-group { flex-direction:column; align-items:flex-start !important; gap:12px !important; }
          .stage-filters { margin-left:0 !important; flex-wrap:wrap; gap:6px !important; }
          .search-input  { width:100% !important; }
          .form-grid     { grid-template-columns:1fr !important; gap:16px !important; }
          .form-actions  { flex-direction:column !important; gap:12px !important; }
          .form-actions button { width:100% !important; }
          .bento { padding:20px !important; }
        }
        @media (max-width:480px) {
          .dash-header { padding:14px 16px !important; }
          .header-left h1 { font-size:1.15rem !important; }
          .dash-body   { padding:16px !important; }
          .stats-grid  { gap:14px !important; }
          .bento       { border-radius:14px !important; }
          .btn-sync,.btn-ghost { padding:0 14px !important; font-size:0.8rem !important; height:38px !important; gap:6px !important; }
          .stage-filters button { padding:5px 12px !important; font-size:0.75rem !important; }
        }
        @media (max-width:360px) { .dash-body { padding:12px !important; } .stats-grid { gap:10px !important; } }
      `}</style>
    </div>
  );
}