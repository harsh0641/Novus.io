import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { applicationsAPI } from '../api/client';
import Sidebar from '../components/Sidebar';
import useDarkMode from '../hooks/useDarkMode';
import LoadingSpinner from '../components/LoadingSpinner';

// ── Ultra-Premium Token Map ──
function getC(dark) {
  return {
    bg:       dark ? '#030303' : '#FAFAFA',
    surface:  dark ? '#0A0A0A' : '#FFFFFF',
    border:   dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)',
    text:     dark ? '#FFFFFF' : '#09090B',
    textM:    dark ? '#A1A1AA' : '#71717A',
    textL:    dark ? '#52525B' : '#A1A1AA',
    primary:  dark ? '#FFFFFF' : '#000000',
    primaryText: dark ? '#000000' : '#FFFFFF',
    surfaceL: dark ? 'rgba(255,255,255,0.02)' : '#F4F4F5',
    surfaceLow:dark? 'rgba(255,255,255,0.01)' : '#FFFFFF',
    blue:     '#3b82f6',
    blueL:    dark ? 'rgba(59,130,246,0.1)' : '#eff6ff',
  };
}

// ── 3D Ambient Background ──
function MinimalNetwork3D({ dark }) {
  const mountRef = useRef(null);
  useEffect(() => {
    let animId, renderer, scene, camera, particles;
    const el = mountRef.current;
    if (!el) return;
    const init = () => {
      const THREE = window.THREE;
      if (!THREE) return;
      const W = window.innerWidth, H = window.innerHeight;
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(W, H);
      el.appendChild(renderer.domElement);
      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(60, W / H, 1, 100);
      camera.position.set(0, 0, 25);
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(200 * 3);
      for (let i = 0; i < 600; i++) pos[i] = (Math.random() - 0.5) * 60;
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const mat = new THREE.PointsMaterial({ color: dark ? 0xffffff : 0x000000, size: 0.04, transparent: true, opacity: 0.1 });
      particles = new THREE.Points(geo, mat);
      scene.add(particles);
      const tick = () => {
        animId = requestAnimationFrame(tick);
        particles.rotation.y += 0.0005;
        renderer.render(scene, camera);
      };
      tick();
    };
    init();
    return () => { cancelAnimationFrame(animId); if(renderer) renderer.dispose(); };
  }, [dark]);
  return <div ref={mountRef} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }} />;
}

// ── FIX 2: URL validator ──
const isValidUrl = (url) => {
  try {
    const u = new URL(url);
    return ['https:', 'http:'].includes(u.protocol);
  } catch { return false; }
};

// ── Main Component ──
export default function ColdEmail() {
  const { user } = useAuth();
  const { dark } = useDarkMode();
  const C = getC(dark);

  const [apps, setApps] = useState([]);
  const [selectedAppId, setSelectedAppId] = useState('');
  const [tone, setTone] = useState('Professional');
  const [mode, setMode] = useState('humanized'); // 'humanized' | 'ai'
  const [extraContext, setExtraContext] = useState('');
  const [resumeLink, setResumeLink] = useState('');

  const [generatedSubject, setGeneratedSubject] = useState('');
  const [generatedBody, setGeneratedBody] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [toast, setToast] = useState(null);

  const avatarLet = user?.name?.[0]?.toUpperCase() || 'U';

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // 1. Fetch all applications and filter those that have recruiters
  useEffect(() => {
    if (user?.id) {
      applicationsAPI.getAll(user.id)
        .then(r => {
          const withRecruiters = (r.data.data || []).filter(a => a.recruiter_email);
          setApps(withRecruiters);
        })
        .catch(() => showToast('Failed to load contacts', 'error'));
    }
  }, [user]);

  const selectedApp = apps.find(a => String(a.id) === selectedAppId);

  // 2. Generate Email logic (Connects to Groq / Backend)
  const handleGenerate = async () => {
    if (!selectedAppId) {
      showToast('Please select a target recruiter first.', 'error');
      return;
    }

    setIsGenerating(true);
    setGeneratedSubject('');
    setGeneratedBody('');

    // TODO: Replace setTimeout with real Groq backend call:
    // const res = await fetch('/api/v1/email/generate', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ appId: selectedAppId, tone, mode, extraContext: extraContext.slice(0, 500) })
    // });
    // const data = await res.json();
    // setGeneratedSubject(data.subject);
    // setGeneratedBody(data.body);
    // setIsGenerating(false);

    setTimeout(() => {
      // FIX 3: Sanitize all user-controlled strings before injecting into email body
      const recName = (selectedApp.recruiter_name
        ? selectedApp.recruiter_name.split(' ')[0]
        : 'Team'
      ).replace(/[\r\n<>&]/g, '').slice(0, 60);

      const safeName = (user?.name || 'Your Name')
        .replace(/[\r\n<>&]/g, '')
        .slice(0, 100);

      const role     = (selectedApp.position || 'open position').replace(/[\r\n<>&]/g, '').slice(0, 100);
      const comp     = (selectedApp.company  || 'your team').replace(/[\r\n<>&]/g, '').slice(0, 100);
      const compFormal = comp;

      // FIX 5: Always slice extraContext to 500 chars before injecting
      const safeContext = extraContext.slice(0, 500);

      let subject = '';
      let body = '';

      if (mode === 'humanized') {
        if (tone === 'Friendly') {
          subject = `Quick question re: ${role} at ${comp} 👋`;
          body = `Hi ${recName},\n\nHope you're having a great week!\n\nSaw the ${role} opening and had to reach out. I've been following ${comp} for a bit and really love the direction you're taking the product.\n\n${safeContext ? safeContext + '\n\n' : ''}I recently submitted my application but wanted to say hello directly. Let me know if you're open to a quick chat this week—would love to see if I'm a fit for the team.\n\nBest,\n${safeName}`;
        } else if (tone === 'Direct & Concise') {
          subject = `${role} at ${comp} - ${safeName}`;
          body = `Hi ${recName},\n\nReaching out because I just applied for the ${role} role at ${comp}.\n\n${safeContext ? safeContext + '\n\n' : ''}I know you're busy, so I'll keep it brief. My background aligns perfectly with what you're looking for, and I'd love to grab 10 minutes to chat if you're open to it.\n\nThanks,\n${safeName}`;
        } else {
          subject = `Connecting regarding the ${role} role at ${compFormal}`;
          body = `Hi ${recName},\n\nI'm reaching out because I recently applied for the ${role} role at ${compFormal}.\n\n${safeContext ? safeContext + '\n\n' : ''}I wanted to personally share my interest as I've been highly impressed by your team's recent work. I'd appreciate the opportunity to connect briefly and discuss how my experience aligns with your goals.\n\nBest regards,\n${safeName}`;
        }
      } else {
        if (tone === 'Friendly') {
          subject = `Enthusiastic Application for ${role} - ${compFormal}`;
          body = `Dear ${recName},\n\nI am writing to you today with great enthusiasm regarding the ${role} opportunity at ${compFormal}. I have formally submitted my application for your review.\n\n${safeContext ? safeContext + '\n\n' : ''}I am very passionate about the innovations happening at ${compFormal} and I am eager to bring my expertise to your esteemed team. I look forward to the possibility of discussing this further.\n\nWarm regards,\n${safeName}`;
        } else if (tone === 'Direct & Concise') {
          subject = `Application Submission: ${role}`;
          body = `Dear ${recName},\n\nI have submitted my application for the ${role} vacancy at ${compFormal}.\n\n${safeContext ? safeContext + '\n\n' : ''}Please review my qualifications at your earliest convenience. I am available for an interview to discuss how my skill set matches your requirements.\n\nSincerely,\n${safeName}`;
        } else {
          subject = `Inquiry Regarding ${role} Opportunity - ${safeName}`;
          body = `Dear ${recName},\n\nI am writing to formally express my interest in the ${role} position at ${compFormal}. I have successfully submitted my application materials through your official portal.\n\n${safeContext ? safeContext + '\n\n' : ''}My professional background strongly aligns with the core requirements of this role, and I am confident in my ability to contribute effectively to your organization. I welcome the opportunity to discuss my qualifications with you in detail.\n\nSincerely,\n${safeName}`;
        }
      }

      setGeneratedSubject(subject);
      setGeneratedBody(body);
      setIsGenerating(false);
      showToast('Draft synthesized successfully.');
    }, 1600);
  };

  // 3. Open Mail Client via mailto:
  const handleSend = () => {
    if (!selectedApp) return;

    // FIX 4: Validate recruiter email before building mailto link
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(selectedApp.recruiter_email)) {
      showToast('Invalid recruiter email address.', 'error');
      return;
    }

    // FIX 2: Validate resume URL before injecting
    if (resumeLink && !isValidUrl(resumeLink)) {
      showToast('Please enter a valid https:// URL for your resume link.', 'error');
      return;
    }

    let finalBody = generatedBody;
    if (resumeLink) {
      finalBody += `\n\nPortfolio/Resume Link:\n${resumeLink}`;
    }

    const mailto = `mailto:${selectedApp.recruiter_email}?subject=${encodeURIComponent(generatedSubject)}&body=${encodeURIComponent(finalBody)}`;
    window.open(mailto, '_blank');
    showToast('Mail client initialized.');
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: C.bg, transition: 'background 0.4s cubic-bezier(0.16,1,0.3,1)', fontFamily: "'Inter', sans-serif" }}>
      <MinimalNetwork3D dark={dark} />
      <Sidebar />

      <div className="main-content" style={{ flex: 1, position: 'relative', zIndex: 10, marginLeft: 'var(--sidebar-width, 280px)', transition: 'margin-left 0.5s cubic-bezier(0.16, 1, 0.3, 1)' }}>

        {/* ── TOP BAR ── */}
        <header className="dash-header" style={{ position: 'sticky', top: 0, zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 48px', background: dark ? 'rgba(3,3,3,0.7)' : 'rgba(250,250,251,0.8)', backdropFilter: 'blur(24px) saturate(180%)', borderBottom: `1px solid ${C.border}` }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 500, color: C.text, margin: 0, letterSpacing: '-0.03em' }}>Outreach Protocol</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <div style={{ textAlign: 'right' }} className="mobile-hide">
              <div style={{ fontSize: '0.85rem', fontWeight: 500, color: C.text, lineHeight: 1.2 }}>{user?.name || 'USER'}</div>
              <div style={{ fontSize: '0.7rem', color: C.textL, letterSpacing: '0.05em' }}>AI Comms Active</div>
            </div>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: C.surfaceL, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, color: C.text, fontSize: '0.9rem' }}>{avatarLet}</div>
          </div>
        </header>

        <main style={{ padding: '48px', maxWidth: 1400, margin: '0 auto' }}>

          <div style={{ marginBottom: 40 }} className="fade-in">
            <h2 style={{ fontSize: '2rem', fontWeight: 500, letterSpacing: '-0.03em', color: C.text, margin: '0 0 8px' }}>Groq AI Email Generator</h2>
            <p style={{ color: C.textM, margin: 0, fontSize: '1rem', fontWeight: 300 }}>
              Draft hyper-personalized cold outreach to verified recruiters instantly.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 32 }} className="responsive-grid">

            {/* ── LEFT COLUMN: Configuration ── */}
            <div className="bento fade-up" style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 24, padding: 36, display: 'flex', flexDirection: 'column', gap: 24, boxShadow: dark ? 'inset 0 1px 1px rgba(255,255,255,0.03)' : '0 2px 10px rgba(0,0,0,0.02)' }}>

              {/* Generation Mode Toggle */}
              <div>
                <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 600, color: C.textL, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Syntax Engine</label>
                <div style={{ display: 'flex', background: C.surfaceL, borderRadius: 14, padding: 4, border: `1px solid ${C.border}` }}>
                  <button
                    onClick={() => setMode('humanized')}
                    style={{ flex: 1, padding: '10px 0', borderRadius: 10, background: mode === 'humanized' ? C.surface : 'transparent', color: mode === 'humanized' ? C.text : C.textM, border: mode === 'humanized' ? `1px solid ${C.border}` : '1px solid transparent', boxShadow: mode === 'humanized' ? (dark ? '0 2px 8px rgba(0,0,0,0.4)' : '0 2px 8px rgba(0,0,0,0.05)') : 'none', fontSize: '0.85rem', fontWeight: 600, transition: 'all 0.2s', cursor: 'pointer' }}>
                    Humanized
                  </button>
                  <button
                    onClick={() => setMode('ai')}
                    style={{ flex: 1, padding: '10px 0', borderRadius: 10, background: mode === 'ai' ? C.surface : 'transparent', color: mode === 'ai' ? C.text : C.textM, border: mode === 'ai' ? `1px solid ${C.border}` : '1px solid transparent', boxShadow: mode === 'ai' ? (dark ? '0 2px 8px rgba(0,0,0,0.4)' : '0 2px 8px rgba(0,0,0,0.05)') : 'none', fontSize: '0.85rem', fontWeight: 600, transition: 'all 0.2s', cursor: 'pointer' }}>
                    AI Standard
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 600, color: C.textL, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Target Recruiter & Role</label>
                <select value={selectedAppId} onChange={e => setSelectedAppId(e.target.value)}
                  style={{ width: '100%', height: 48, border: `1px solid ${C.border}`, borderRadius: 12, padding: '0 16px', fontSize: '0.9rem', fontFamily: 'inherit', color: C.text, backgroundColor: C.surfaceL, cursor: 'pointer', outline: 'none', appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='${encodeURIComponent(C.textM)}' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center', backgroundSize: '16px', transition: 'all 0.2s' }}>
                  <option value="" disabled style={{ backgroundColor: C.surface, color: C.text }}>— Select a discovered contact —</option>
                  {apps.length === 0 && <option disabled style={{ backgroundColor: C.surface, color: C.text }}>No recruiters found in your pipeline yet.</option>}
                  {apps.map(a => (
                    <option key={a.id} value={a.id} style={{ backgroundColor: C.surface, color: C.text }}>
                      {a.recruiter_name || 'Recruiter'} ({a.company || 'Unknown'}) - {a.position || 'Open Role'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 600, color: C.textL, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Communication Tone</label>
                <select value={tone} onChange={e => setTone(e.target.value)}
                  style={{ width: '100%', height: 48, border: `1px solid ${C.border}`, borderRadius: 12, padding: '0 16px', fontSize: '0.9rem', fontFamily: 'inherit', color: C.text, backgroundColor: C.surfaceL, cursor: 'pointer', outline: 'none', appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='${encodeURIComponent(C.textM)}' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center', backgroundSize: '16px', transition: 'all 0.2s' }}>
                  {['Professional', 'Friendly', 'Direct & Concise', 'Confident'].map(t => (
                    <option key={t} value={t} style={{ backgroundColor: C.surface, color: C.text }}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 600, color: C.textL, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
                  Key Value Proposition (Optional)
                  {/* FIX 1: Show character counter */}
                  <span style={{ float: 'right', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
                    {extraContext.length}/500
                  </span>
                </label>
                <textarea
                  value={extraContext}
                  // FIX 1: Block input beyond 500 chars
                  onChange={e => { if (e.target.value.length <= 500) setExtraContext(e.target.value); }}
                  maxLength={500}
                  placeholder="e.g. I scaled a similar platform to 10k users..."
                  className="custom-scrollbar"
                  style={{ width: '100%', height: 100, border: `1px solid ${C.border}`, borderRadius: 12, padding: '16px', fontSize: '0.9rem', fontFamily: 'inherit', color: C.text, backgroundColor: C.surfaceL, outline: 'none', resize: 'none', transition: 'border-color 0.2s' }}
                  onFocus={e => e.target.style.borderColor = C.textM}
                  onBlur={e => e.target.style.borderColor = C.border}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 600, color: C.textL, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Attachment Link Injection</label>
                <input
                  type="url"
                  value={resumeLink}
                  onChange={e => setResumeLink(e.target.value)}
                  placeholder="https://yourwebsite.com/resume.pdf"
                  style={{ width: '100%', height: 48, border: `1px solid ${C.border}`, borderRadius: 12, padding: '0 16px', fontSize: '0.9rem', fontFamily: 'inherit', color: C.text, backgroundColor: C.surfaceL, outline: 'none', transition: 'border-color 0.2s' }}
                  onFocus={e => e.target.style.borderColor = C.textM}
                  onBlur={e => e.target.style.borderColor = C.border}
                />
                <div style={{ fontSize: '0.7rem', color: C.textM, marginTop: 8, fontWeight: 300, lineHeight: 1.4 }}>
                  Browsers block direct file attachments via automation. Paste your resume URL here to inject it cleanly into the draft.
                </div>
              </div>

              <button
                onClick={handleGenerate}
                disabled={isGenerating || !selectedAppId}
                className="btn-solid"
                style={{ height: 56, marginTop: 'auto', background: isGenerating || !selectedAppId ? C.border : C.primary, color: isGenerating || !selectedAppId ? C.textM : C.primaryText, border: 'none', borderRadius: 12, fontSize: '1rem', fontWeight: 600, cursor: isGenerating || !selectedAppId ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}>
                {isGenerating ? 'Synthesizing...' : generatedBody ? 'Regenerate Draft' : 'Generate Outreach'}
              </button>

            </div>

            {/* ── RIGHT COLUMN: Output ── */}
            <div className="bento fade-up" style={{ animationDelay: '0.1s', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 24, padding: 36, display: 'flex', flexDirection: 'column', boxShadow: dark ? 'inset 0 1px 1px rgba(255,255,255,0.03)' : '0 2px 10px rgba(0,0,0,0.02)', position: 'relative', overflow: 'hidden', minHeight: 600 }}>

              {isGenerating && (
                <div style={{ position: 'absolute', inset: 0, background: dark ? 'rgba(10,10,10,0.7)' : 'rgba(255,255,255,0.7)', backdropFilter: 'blur(8px)', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <LoadingSpinner inline />
                  <div style={{ marginTop: 16, fontSize: '0.8rem', color: C.text, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Groq AI Processing</div>
                </div>
              )}

              {!generatedBody && !isGenerating && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: C.textL, textAlign: 'center' }}>
                  <svg width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24" style={{ marginBottom: 16, opacity: 0.5 }}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" strokeLinecap="round" strokeLinejoin="round"/><polyline points="22,6 12,13 2,6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  <p style={{ fontSize: '1rem', fontWeight: 300, margin: 0 }}>Select a target and generate to view the draft here.</p>
                </div>
              )}

              {generatedBody && !isGenerating && (
                <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>

                  <div style={{ marginBottom: 24 }}>
                    <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 600, color: C.textL, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Subject Line</label>
                    <input
                      value={generatedSubject}
                      onChange={e => setGeneratedSubject(e.target.value)}
                      style={{ width: '100%', height: 48, border: `1px solid ${C.border}`, borderRadius: 12, padding: '0 16px', fontSize: '0.95rem', fontFamily: 'inherit', color: C.text, backgroundColor: C.surfaceL, outline: 'none', fontWeight: 500, transition: 'border-color 0.2s' }}
                      onFocus={e => e.target.style.borderColor = C.textM}
                      onBlur={e => e.target.style.borderColor = C.border}
                    />
                  </div>

                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 600, color: C.textL, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Message Body</label>
                    <textarea
                      value={generatedBody}
                      onChange={e => setGeneratedBody(e.target.value)}
                      className="custom-scrollbar"
                      style={{ width: '100%', flex: 1, minHeight: 300, border: `1px solid ${C.border}`, borderRadius: 12, padding: '20px', fontSize: '0.95rem', fontFamily: 'inherit', color: C.text, backgroundColor: C.surfaceL, outline: 'none', resize: 'none', lineHeight: 1.6, transition: 'border-color 0.2s' }}
                      onFocus={e => e.target.style.borderColor = C.textM}
                      onBlur={e => e.target.style.borderColor = C.border}
                    />
                  </div>

                  <button
                    onClick={handleSend}
                    className="btn-solid"
                    style={{ height: 56, marginTop: 24, background: C.text, color: C.bg, border: 'none', borderRadius: 12, fontSize: '1rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, transition: 'all 0.2s' }}>
                    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                    Execute via Local Mail Client
                  </button>

                </div>
              )}

            </div>
          </div>
        </main>
      </div>

      {toast && <div className="fade-in" style={{ position: 'fixed', bottom: 32, right: 32, zIndex: 9999, padding: '16px 24px', borderRadius: 12, background: toast.type === 'error' ? '#ef4444' : '#FFFFFF', color: toast.type === 'error' ? '#fff' : '#000', fontSize: '0.9rem', fontWeight: 600, boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>{toast.msg}</div>}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        .bento { transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
        .btn-solid:hover:not(:disabled) { transform: scale(0.98); opacity: 0.9; }
        .btn-ghost:hover { background: ${C.surfaceL} !important; }

        @keyframes skelFadeIn { from { opacity:0; transform: translateY(20px); } to { opacity:1; transform: translateY(0); } }
        .fade-up { animation: skelFadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .fade-in { animation: skelFadeIn 0.4s ease both; }

        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: ${C.textM}; }

        ::-webkit-scrollbar { display: none; }

        @media (max-width: 1024px) {
          .responsive-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 768px) {
          .mobile-hide { display: none !important; }
          .main-content { margin-left: 0 !important; }
          main { padding: 24px !important; }
          .dash-header { padding: 20px 24px !important; }
        }
      `}</style>
    </div>
  );
}