// src/components/LoadingSpinner.jsx
// Full-screen (3s):   <LoadingSpinner />
// Overlay (sync):     <LoadingSpinner overlay />
// Inline dots:        <LoadingSpinner inline />
// Save indicator:     <LoadingSpinner save />
// Scroll bar:         <LoadingSpinner scroll />

import React, { useEffect, useState } from 'react';

// ── Keyframes (injected once) ─────────────────────────────────────────────────
const KEYFRAMES = `
  @keyframes drawLine {
    from { stroke-dashoffset: 500; }
    to   { stroke-dashoffset: 0; }
  }
  @keyframes nodeIn {
    0%   { transform: scale(0);    opacity: 0; }
    60%  { transform: scale(1.22); opacity: 1; }
    82%  { transform: scale(0.91);             }
    100% { transform: scale(1);    opacity: 1; }
  }
  @keyframes breathe {
    0%,100% { opacity: 0.15; transform: scale(1);    }
    50%     { opacity: 0.42; transform: scale(1.20); }
  }
  @keyframes orbit {
    from { transform: rotate(0deg);   }
    to   { transform: rotate(360deg); }
  }
  @keyframes ping {
    0%   { transform: scale(1);   opacity: 0.6; }
    80%  { transform: scale(2.6); opacity: 0;   }
    100% { transform: scale(2.6); opacity: 0;   }
  }
  @keyframes plFadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes spinRing {
    to { transform: rotate(360deg); }
  }
  @keyframes dotBounce {
    0%, 80%, 100% { transform: scale(0.65); opacity: 0.35; }
    40%           { transform: scale(1.1);  opacity: 1;    }
  }
  @keyframes orbitDot {
    to { transform: rotate(360deg); }
  }
  @keyframes barSlide {
    0%   { transform: translateX(-100%); }
    100% { transform: translateX(250%);  }
  }
  @keyframes skelPulse {
    0%, 100% { opacity: 0.3; }
    50%      { opacity: 0.8; }
  }
  @keyframes overlayFadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes fullscreenFadeOut {
    from { opacity: 1; }
    to   { opacity: 0; }
  }
`;

// ── Novus Brand SVG Icon ───────────────────────────────────────────────────────
function NovusIcon({ size = 120, dark = true, animated = true, uid = 'n' }) {
  const g   = `${uid}g`;
  const f1  = `${uid}f1`;
  const f2  = `${uid}f2`;
  const f3  = `${uid}f3`;
  const fp  = `${uid}fp`;

  const ring1 = dark ? '#1d4ed8' : '#3b82f6';
  const ring2 = dark ? '#4338ca' : '#6366f1';
  const ring3 = dark ? '#7c3aed' : '#9333ea';
  const ring4 = dark ? '#a21caf' : '#c026d3';
  const pingC = dark ? '#e879f9' : '#c026d3';
  const coreW = dark ? '#fdf4ff' : '#ffffff';
  const burst = dark ? '#fdf4ff' : '#9333ea';
  const orbitC = dark ? '#e879f9' : '#c026d3';
  const core1 = dark ? '#bfdbfe' : '#ffffff';
  const core2 = dark ? '#e0e7ff' : '#ffffff';
  const core3 = dark ? '#ede9fe' : '#ffffff';

  return (
    <svg width={size} height={size} viewBox="0 0 200 200"
      xmlns="http://www.w3.org/2000/svg"
      style={{ overflow: 'visible', display: 'block', flexShrink: 0 }}>
      <defs>
        <linearGradient id={g} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#1d4ed8"/>
          <stop offset="33%"  stopColor="#6366f1"/>
          <stop offset="66%"  stopColor="#9333ea"/>
          <stop offset="100%" stopColor="#e879f9"/>
        </linearGradient>
        <filter id={f1} x="-120%" y="-120%" width="340%" height="340%">
          <feGaussianBlur stdDeviation="7"  result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id={f2} x="-120%" y="-120%" width="340%" height="340%">
          <feGaussianBlur stdDeviation="10" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id={f3} x="-120%" y="-120%" width="340%" height="340%">
          <feGaussianBlur stdDeviation="13" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id={fp} x="-140%" y="-140%" width="380%" height="380%">
          <feGaussianBlur stdDeviation="20" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      {/* Breathe rings */}
      <circle cx="44"  cy="155" r="24" fill={ring1} opacity="0.15"
        style={{ transformOrigin:'44px 155px', animation:`breathe 2.6s ease-in-out ${animated?'1.4s':'0s'} infinite` }}/>
      <circle cx="82"  cy="116" r="28" fill={ring2} opacity="0.15"
        style={{ transformOrigin:'82px 116px', animation:`breathe 2.6s ease-in-out ${animated?'1.55s':'0.15s'} infinite` }}/>
      <circle cx="120" cy="85"  r="32" fill={ring3} opacity="0.13"
        style={{ transformOrigin:'120px 85px', animation:`breathe 2.6s ease-in-out ${animated?'1.70s':'0.30s'} infinite` }}/>
      <circle cx="158" cy="45"  r="50" fill={ring4} opacity="0.12"
        style={{ transformOrigin:'158px 45px', animation:`breathe 3.0s ease-in-out ${animated?'1.85s':'0.45s'} infinite` }}/>

      {/* Ping ring */}
      <circle cx="158" cy="45" r="24"
        fill="none" stroke={pingC} strokeWidth="1.5" opacity="0"
        style={{ transformOrigin:'158px 45px', animation:`ping 2.2s ease-out ${animated?'0.5s':'0s'} infinite` }}/>

      {/* Connecting line */}
      {animated ? (
        <polyline points="44,155 82,116 120,85 158,45"
          stroke={`url(#${g})`} strokeWidth="3" fill="none"
          strokeLinecap="round" strokeLinejoin="round" opacity="0.9"
          strokeDasharray="500" strokeDashoffset="500"
          style={{ animation:'drawLine 0.8s cubic-bezier(0.4,0,0.2,1) 0.1s forwards' }}/>
      ) : (
        <polyline points="44,155 82,116 120,85 158,45"
          stroke={`url(#${g})`} strokeWidth="3" fill="none"
          strokeLinecap="round" strokeLinejoin="round" opacity="0.9"/>
      )}

      {/* Node 1 — Blue */}
      <circle cx="44" cy="155" r="17" fill="#2563eb" filter={`url(#${f1})`} opacity="0"
        style={{ transformOrigin:'44px 155px', transform:'scale(0)', animation:`nodeIn 0.52s cubic-bezier(0.34,1.56,0.64,1) ${animated?'0.55s':'0s'} forwards` }}/>
      <circle cx="44" cy="155" r="8.5" fill={core1} opacity="0"
        style={{ transformOrigin:'44px 155px', transform:'scale(0)', animation:`nodeIn 0.36s cubic-bezier(0.34,1.56,0.64,1) ${animated?'0.68s':'0.1s'} forwards` }}/>

      {/* Node 2 — Indigo */}
      <circle cx="82" cy="116" r="20" fill="#6366f1" filter={`url(#${f2})`} opacity="0"
        style={{ transformOrigin:'82px 116px', transform:'scale(0)', animation:`nodeIn 0.52s cubic-bezier(0.34,1.56,0.64,1) ${animated?'0.72s':'0s'} forwards` }}/>
      <circle cx="82" cy="116" r="10" fill={core2} opacity="0"
        style={{ transformOrigin:'82px 116px', transform:'scale(0)', animation:`nodeIn 0.36s cubic-bezier(0.34,1.56,0.64,1) ${animated?'0.85s':'0.1s'} forwards` }}/>

      {/* Node 3 — Violet */}
      <circle cx="120" cy="85" r="23" fill="#9333ea" filter={`url(#${f3})`} opacity="0"
        style={{ transformOrigin:'120px 85px', transform:'scale(0)', animation:`nodeIn 0.52s cubic-bezier(0.34,1.56,0.64,1) ${animated?'0.89s':'0s'} forwards` }}/>
      <circle cx="120" cy="85" r="11" fill={core3} opacity="0"
        style={{ transformOrigin:'120px 85px', transform:'scale(0)', animation:`nodeIn 0.36s cubic-bezier(0.34,1.56,0.64,1) ${animated?'1.02s':'0.1s'} forwards` }}/>

      {/* Node 4 — Fuchsia Peak */}
      <circle cx="158" cy="45" r="36" fill="#c026d3" filter={`url(#${fp})`} opacity="0"
        style={{ transformOrigin:'158px 45px', transform:'scale(0)', animation:`nodeIn 0.58s cubic-bezier(0.34,1.56,0.64,1) ${animated?'1.05s':'0s'} forwards` }}/>
      <circle cx="158" cy="45" r="27" fill="#e879f9" filter={`url(#${f3})`} opacity="0"
        style={{ animation:`plFadeIn 0.32s ease ${animated?'1.16s':'0.05s'} forwards` }}/>
      <circle cx="158" cy="45" r="16" fill="#f0abfc" opacity="0"
        style={{ transformOrigin:'158px 45px', transform:'scale(0)', animation:`nodeIn 0.40s cubic-bezier(0.34,1.56,0.64,1) ${animated?'1.16s':'0s'} forwards` }}/>
      <circle cx="158" cy="45" r="9" fill={coreW} opacity="0"
        style={{ transformOrigin:'158px 45px', transform:'scale(0)', animation:`nodeIn 0.30s cubic-bezier(0.34,1.56,0.64,1) ${animated?'1.28s':'0.1s'} forwards` }}/>

      {/* Star burst */}
      <g opacity="0" style={{ animation:`plFadeIn 0.35s ease ${animated?'1.34s':'0.2s'} forwards` }}>
        <line x1="158" y1="30" x2="158" y2="60" stroke={burst} strokeWidth="2"   opacity="0.32" strokeLinecap="round"/>
        <line x1="143" y1="45" x2="173" y2="45" stroke={burst} strokeWidth="2"   opacity="0.32" strokeLinecap="round"/>
        <line x1="147" y1="34" x2="151" y2="38" stroke={burst} strokeWidth="1.5" opacity="0.44" strokeLinecap="round"/>
        <line x1="169" y1="34" x2="165" y2="38" stroke={burst} strokeWidth="1.5" opacity="0.44" strokeLinecap="round"/>
        <line x1="147" y1="56" x2="151" y2="52" stroke={burst} strokeWidth="1.5" opacity="0.44" strokeLinecap="round"/>
        <line x1="169" y1="56" x2="165" y2="52" stroke={burst} strokeWidth="1.5" opacity="0.44" strokeLinecap="round"/>
      </g>

      {/* Orbit dot */}
      <g style={{ transformOrigin:'158px 45px', animation:`orbit 3.2s linear ${animated?'1.55s':'0s'} infinite` }}>
        <circle cx="186" cy="45" r="4.5" fill={orbitC} opacity="0.78"/>
      </g>
    </svg>
  );
}

// ── Spinner: Search Active (ring) ─────────────────────────────────────────────
function SearchSpinner({ size = 32, color = '#3b82f6' }) {
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <div style={{
        position: 'absolute', inset: 0,
        border: `2px solid transparent`,
        borderTopColor: color,
        borderRightColor: color,
        borderRadius: '50%',
        animation: 'spinRing 0.9s linear infinite',
      }} />
      <div style={{
        position: 'absolute',
        width: size * 0.38, height: size * 0.38,
        borderRadius: '50%',
        background: color,
        opacity: 0.2,
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        animation: 'breathe 1.4s ease-in-out infinite',
      }} />
    </div>
  );
}

// ── Spinner: Tri-dot bounce (fetch / inline) ───────────────────────────────────
function DotsSpinner({ color1 = '#3b82f6', color2 = '#8b5cf6', color3 = '#06b6d4', size = 7 }) {
  return (
    <div style={{ display: 'flex', gap: size * 0.7, alignItems: 'center' }}>
      {[{ c: color1, d: '0s' }, { c: color2, d: '0.15s' }, { c: color3, d: '0.3s' }].map((dot, i) => (
        <div key={i} style={{
          width: size, height: size,
          borderRadius: '50%',
          background: dot.c,
          animation: `dotBounce 1.2s ease-in-out ${dot.d} infinite`,
        }} />
      ))}
    </div>
  );
}

// ── Spinner: Orbit square (save/record) ───────────────────────────────────────
function OrbitSpinner({ size = 32, color = '#10b981' }) {
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      {/* Center square */}
      <div style={{
        position: 'absolute',
        width: size * 0.36, height: size * 0.36,
        borderRadius: 3,
        background: color,
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
      }} />
      {/* Orbiting dot */}
      <div style={{
        position: 'absolute',
        top: 0, left: '50%',
        transformOrigin: `0 ${size / 2}px`,
        animation: 'orbitDot 1.3s linear infinite',
      }}>
        <div style={{
          width: size * 0.22, height: size * 0.22,
          borderRadius: '50%',
          background: color,
          opacity: 0.55,
          marginLeft: -(size * 0.11),
        }} />
      </div>
    </div>
  );
}

// ── Spinner: Sliding progress bar (infinite scroll) ───────────────────────────
export function ScrollLoadingBar({ dark = false, width = 120, height = 3, colors = ['#3b82f6', '#8b5cf6'] }) {
  const trackBg = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  return (
    <div style={{ width, height, borderRadius: 99, background: trackBg, overflow: 'hidden', flexShrink: 0 }}>
      <div style={{
        height: '100%', borderRadius: 99,
        background: `linear-gradient(90deg, ${colors[0]}, ${colors[1]})`,
        animation: 'barSlide 1.5s ease-in-out infinite',
      }} />
    </div>
  );
}

// ── ScrollLoadingIndicator: for infinite scroll bottom ────────────────────────
export function ScrollLoadingIndicator({ dark = false, total, loaded }) {
  const C_text   = dark ? '#A1A1AA' : '#71717A';
  const C_surfL  = dark ? 'rgba(255,255,255,0.03)' : '#F9F9FA';
  const C_border = dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 16px', borderRadius: 10,
      background: C_surfL, border: `1px solid ${C_border}`,
      marginBottom: 16,
    }}>
      <DotsSpinner color1="#3b82f6" color2="#8b5cf6" color3="#06b6d4" size={6} />
      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: C_text }}>
        {typeof total === 'number'
          ? `Fetching next batch · ${loaded} of ${total} loaded`
          : 'Fetching next batch…'
        }
      </span>
      <ScrollLoadingBar dark={dark} width={100} height={2} />
    </div>
  );
}

// ── SkeletonCard: shimmer placeholder card ─────────────────────────────────────
export function SkeletonCard({ delay = 0, dark = false }) {
  const C_surface = dark ? '#0A0A0A' : '#FFFFFF';
  const C_border  = dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)';
  const C_surfL   = dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)';
  return (
    <div style={{
      background: C_surface, border: `1px solid ${C_border}`, borderRadius: 20, padding: 24,
      minHeight: 240, opacity: 0,
      animation: `skelFadeIn 0.5s ease ${delay}s forwards`,
    }}>
      <style>{`
        @keyframes skelFadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes skelPulse {
          0%, 100% { opacity: 0.3; }
          50%      { opacity: 0.8; }
        }
      `}</style>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ width: 46, height: 46, borderRadius: 12, background: C_surfL, animation: 'skelPulse 1.6s ease-in-out infinite' }} />
        <div style={{ width: 78, height: 24, borderRadius: 8, background: C_surfL, animation: 'skelPulse 1.6s ease-in-out 0.1s infinite' }} />
      </div>
      <div style={{ width: '78%', height: 17, borderRadius: 5, background: C_surfL, marginBottom: 10, animation: 'skelPulse 1.6s ease-in-out 0.05s infinite' }} />
      <div style={{ width: '48%', height: 12, borderRadius: 5, background: C_surfL, marginBottom: 20, animation: 'skelPulse 1.6s ease-in-out 0.12s infinite' }} />
      <div style={{ width: '96%', height: 11, borderRadius: 4, background: C_surfL, marginBottom: 7, animation: 'skelPulse 1.6s ease-in-out 0.18s infinite' }} />
      <div style={{ width: '68%', height: 11, borderRadius: 4, background: C_surfL, marginBottom: 22, animation: 'skelPulse 1.6s ease-in-out 0.24s infinite' }} />
      <div style={{ height: 1, background: C_border, marginBottom: 18 }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ width: 88, height: 28, borderRadius: 7, background: C_surfL, animation: 'skelPulse 1.6s ease-in-out 0.1s infinite' }} />
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ width: 68, height: 32, borderRadius: 9, background: C_surfL, animation: 'skelPulse 1.6s ease-in-out 0.2s infinite' }} />
          <div style={{ width: 56, height: 32, borderRadius: 9, background: C_surfL, animation: 'skelPulse 1.6s ease-in-out 0.3s infinite' }} />
        </div>
      </div>
    </div>
  );
}

// ── Main Export ───────────────────────────────────────────────────────────────
// Props:
//   overlay  — blurred card overlay while searching
//   inline   — small tri-dot for inline use
//   save     — orbit spinner for save actions
//   scroll   — slide-bar for scroll loading
//   (none)   — full-screen 3s splash
export default function LoadingSpinner({
  overlay = false,
  inline = false,
  save = false,
  scroll = false,
  dark: darkProp,
}) {
  const dark = darkProp !== undefined ? darkProp : document.documentElement.classList.contains('dark');
  const [show, setShow] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (overlay || inline || save || scroll) return;
    const fadeTimer = setTimeout(() => setFading(true), 2600);
    const hideTimer = setTimeout(() => setShow(false), 3000);
    return () => { clearTimeout(fadeTimer); clearTimeout(hideTimer); };
  }, [overlay, inline, save, scroll]);

  // ── Inline: tri-dots ────────────────────────────────────────────────────────
  if (inline) {
    return (
      <>
        <style>{KEYFRAMES}</style>
        <DotsSpinner />
      </>
    );
  }

  // ── Save: orbit spinner ──────────────────────────────────────────────────────
  if (save) {
    return (
      <>
        <style>{KEYFRAMES}</style>
        <OrbitSpinner size={28} color="#10b981" />
      </>
    );
  }

  // ── Scroll: progress bar ─────────────────────────────────────────────────────
  if (scroll) {
    return (
      <>
        <style>{KEYFRAMES}</style>
        <ScrollLoadingBar dark={dark} />
      </>
    );
  }

  // ── Overlay: frosted glass on search bento ───────────────────────────────────
  if (overlay) {
    return (
      <>
        <style>{KEYFRAMES}</style>
        <div style={{
          position: 'absolute', inset: 0, zIndex: 30, borderRadius: 'inherit',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18,
          background: dark ? 'rgba(3,3,3,0.82)' : 'rgba(244,244,245,0.88)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          animation: 'overlayFadeIn 0.2s ease',
        }}>
          <NovusIcon size={44} dark={dark} animated={false} uid="ov" />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        
            <span style={{
              fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: dark ? '#52525B' : '#A1A1AA',
            }}>
              
            </span> 
          </div>
        </div>
      </>
    );
  }

  // ── Full-screen: 3s splash ────────────────────────────────────────────────────
  if (!show) return null;

  return (
    <>
      <style>{KEYFRAMES}</style>
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: dark ? '#030303' : '#F4F4F5',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 32,
        opacity: fading ? 0 : 1,
        transition: 'opacity 0.4s ease',
        pointerEvents: fading ? 'none' : 'auto',
      }}>
        <NovusIcon size={72} dark={dark} animated uid="pl" />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
           <span style={{
              fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: dark ? '#dedede' : '#0c0c0c',
            }}>
              N o v u s
            </span>
       
        </div>
      </div>
    </>
  );
}