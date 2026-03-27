  import React, { useState, useEffect, useRef } from 'react';
  import { useNavigate, useLocation } from 'react-router-dom';
  import { useAuth } from '../context/AuthContext';
  import NovusLogo from './NovusLogo';
  import useDarkMode from '../hooks/useDarkMode';

  // ── Ultra-Premium Thin-Line Icons ──
  const NAV = [
    { label: 'Workspace',    path: '/dashboard',    icon: HomeIcon    },
    { label: 'Applications', path: '/applications', icon: BriefcaseIcon },
    { label: 'Cold Email',   path: '/cold-email',   icon: MailIcon    },
    { label: 'Settings',     path: '/settings',     icon: SettingsIcon },
  ];

  function HomeIcon({ active }) { return <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.2 : 1.5} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /></svg>; }
  function BriefcaseIcon({ active }) { return <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.2 : 1.5} strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>; }
  function MailIcon({ active }) { return <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.2 : 1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>; }
  function SettingsIcon({ active }) { return <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.2 : 1.5} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>; }
  function MoonIcon() { return <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>; }
  function SunIcon() { return <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>; }
  function LogoutIcon() { return <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>; }

  // ── The Premium Gradient Icon ──
  function NovusGradientIcon({ size = 26 }) {
    const id = `ng-side-${size}`;
    const gf = `gf-side-${size}`;
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
        <defs>
          <linearGradient id={id} x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#3b82f6"/>
            <stop offset="50%"  stopColor="#8b5cf6"/>
            <stop offset="100%" stopColor="#e879f9"/>
          </linearGradient>
          <filter id={gf}><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        </defs>
        <polyline points="10,52 22,37 36,26 54,13" stroke={`url(#${id})`} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="10" cy="52" r="5" fill="#3b82f6" filter={`url(#${gf})`}/><circle cx="10" cy="52" r="2.5" fill="#FFFFFF"/>
        <circle cx="22" cy="37" r="5.5" fill="#6366f1" filter={`url(#${gf})`}/><circle cx="22" cy="37" r="2.5" fill="#FFFFFF"/>
        <circle cx="36" cy="26" r="6.5" fill="#8b5cf6" filter={`url(#${gf})`}/><circle cx="36" cy="26" r="3" fill="#FFFFFF"/>
        <circle cx="54" cy="13" r="8" fill="#e879f9" filter={`url(#${gf})`}/><circle cx="54" cy="13" r="3.5" fill="#FFFFFF"/>
      </svg>
    );
  }

  export default function Sidebar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { dark, toggle } = useDarkMode();
    
    // UI States
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [animating, setAnimating] = useState(false);
    const isAnimatingRef = useRef(false);

    // Sync layout variable to Dashboard globally
    useEffect(() => {
      document.documentElement.style.setProperty('--sidebar-width', isCollapsed ? '88px' : '280px');
    }, [isCollapsed]);

    // Close mobile drawer seamlessly on route change
    useEffect(() => { setMobileOpen(false); }, [location.pathname]);

    // ── LOGOUT & REDIRECT LOGIC ──
    const handleSignOut = async () => {
      await logout(); 
      navigate('/');  
    };

    const handleToggle = () => {
      if (isAnimatingRef.current) return;
      
      isAnimatingRef.current = true;
      setAnimating(true);

      setTimeout(() => {
        if (window.innerWidth <= 1024) {
          setMobileOpen(!mobileOpen);
        } else {
          setIsCollapsed(!isCollapsed);
        }
      }, 250); 

      setTimeout(() => {
        setAnimating(false);
        isAnimatingRef.current = false;
      }, 600);
    };

    const avatarLet = user?.name?.[0]?.toUpperCase() || 'U';
    const width = isCollapsed ? 88 : 280;

    const T = {
      bg:       dark ? '#030303' : '#F9FAFB',
      surface:  dark ? '#0A0A0A' : '#FFFFFF',
      border:   dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)',
      text:     dark ? '#FFFFFF' : '#09090B',
      textM:    dark ? '#A1A1AA' : '#52525B',
      textL:    dark ? '#52525B' : '#A1A1AA',
      activeBg: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
      hoverBg:  dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
    };

    return (
      <>
        {/* ── Fixed Mobile Floating Toggle (Top Right, Transparent, 3D Animated) ── */}
        <button 
          className={`mobile-fab-toggle ${mobileOpen ? 'is-open' : ''}`}
          onClick={() => setMobileOpen(!mobileOpen)}
          style={{
            position: 'fixed', top: 20, right: 20, zIndex: 120, // 120 ensures it stays above the overlay
            background: 'transparent', border: 'none', padding: 8,
            display: 'none', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            boxShadow: 'none', outline: 'none', WebkitTapHighlightColor: 'transparent'
          }}
        >
          <div className="mobile-toggle-inner">
            <NovusGradientIcon size={28} />
          </div>
        </button>

        {/* ── Mobile Blur Overlay ── */}
        <div 
          className={`mobile-overlay ${mobileOpen ? 'open' : ''}`} onClick={() => setMobileOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: dark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)',
            backdropFilter: 'blur(12px)', zIndex: 95, opacity: mobileOpen ? 1 : 0, 
            pointerEvents: mobileOpen ? 'auto' : 'none', transition: 'opacity 0.4s ease', display: 'none'
          }}
        />

        {/* ── Premium Sidebar Container ── */}
        <aside className={`sidebar-container ${mobileOpen ? 'mobile-open' : ''}`} style={{
          width: width, minWidth: width, background: T.bg, borderRight: `1px solid ${T.border}`,
          display: 'flex', flexDirection: 'column', padding: isCollapsed ? '0 16px 24px' : '0 24px 24px',
          position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 100,
          fontFamily: "'Inter', system-ui, sans-serif", transition: 'width 0.5s cubic-bezier(0.16, 1, 0.3, 1), min-width 0.5s cubic-bezier(0.16, 1, 0.3, 1), transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
          overflowX: 'hidden', overflowY: 'auto'
        }}>

          {/* ── Header: Wordmark & Desktop Animated Logo Toggle ── */}
          <div style={{ 
            padding: '32px 0 32px', display: 'flex', alignItems: 'center', 
            justifyContent: isCollapsed ? 'center' : 'space-between', 
            minHeight: 90, boxSizing: 'border-box' 
          }}>
            
            <div style={{ 
              opacity: isCollapsed ? 0 : 1, width: isCollapsed ? 0 : 'auto', overflow: 'hidden',
              transition: 'opacity 0.3s ease, width 0.3s ease', fontFamily: "'Inter', sans-serif", fontWeight: 600, 
              fontSize: '1.2rem', letterSpacing: '0.2em', color: T.text, whiteSpace: 'nowrap'
            }}>
              NOVUS
            </div>

            {/* This button is only visible on Desktop/Tablets */}
            <button 
              onClick={handleToggle} 
              className={`logo-3d-toggle desktop-logo-toggle ${animating ? 'wave-anim' : ''}`}
              disabled={animating}
              style={{ 
                background: 'transparent', border: 'none', cursor: animating ? 'default' : 'pointer', padding: 0, 
                display: 'flex', alignItems: 'center', justifyContent: 'center', outline: 'none'
              }}
            >
              <NovusGradientIcon size={28} />
            </button>
          </div>

          {/* ── Navigation Links ── */}
          <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 12 }}>
            <div style={{ 
              fontSize: '0.65rem', fontWeight: 600, color: T.textL, letterSpacing: '0.12em', textTransform: 'uppercase', 
              marginBottom: 16, paddingLeft: 12, opacity: isCollapsed ? 0 : 1, transition: 'opacity 0.3s', whiteSpace: 'nowrap'
            }}>Platform</div>
            
            {NAV.map(item => {
              const active = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <button
                  key={item.path} onClick={() => navigate(item.path)} title={isCollapsed ? item.label : ''}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'flex-start',
                    gap: 16, padding: isCollapsed ? '14px 0' : '14px 16px', borderRadius: 12, border: 'none',
                    cursor: 'pointer', background: active ? T.activeBg : 'transparent', color: active ? T.text : T.textM,
                    fontSize: '0.9rem', fontWeight: active ? 600 : 500, fontFamily: 'inherit', textAlign: 'left',
                    transition: 'all 0.2s', whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={e => { if (!active) { e.currentTarget.style.background = T.hoverBg; e.currentTarget.style.color = T.text; } }}
                  onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = T.textM; } }}
                >
                  <span style={{ color: active ? (dark ? '#FFFFFF' : '#000000') : T.textM, flexShrink: 0 }}><Icon active={active} /></span>
                  <span style={{ opacity: isCollapsed ? 0 : 1, width: isCollapsed ? 0 : 'auto', transition: 'opacity 0.3s, width 0.3s', overflow: 'hidden' }}>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* ── Bottom Section: Profile & Actions ── */}
          <div style={{ paddingTop: 24, display: 'flex', flexDirection: 'column', gap: 16, borderTop: `1px solid ${T.border}` }}>
            
            <div className="profile-block" style={{ 
              display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'flex-start', 
              gap: 12, padding: isCollapsed ? '0' : '8px 4px', background: 'transparent', transition: 'all 0.3s'
            }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: T.activeBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, color: T.text, fontSize: '0.9rem', flexShrink: 0, border: `1px solid ${T.border}` }}>{avatarLet}</div>
              <div style={{ minWidth: 0, opacity: isCollapsed ? 0 : 1, width: isCollapsed ? 0 : 'auto', transition: 'opacity 0.3s, width 0.3s', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: T.text, textOverflow: 'ellipsis', overflow: 'hidden' }}>{user?.name || 'Workspace'}</div>
                <div style={{ fontSize: '0.75rem', color: T.textM, textOverflow: 'ellipsis', overflow: 'hidden' }}>{user?.email || ''}</div>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: 12, flexDirection: isCollapsed ? 'column' : 'row' }}>
              <button
                className="theme-toggle" onClick={toggle} title="Toggle Theme"
                style={{
                  flex: isCollapsed ? 'none' : 1, height: 48, width: isCollapsed ? '100%' : 'auto',
                  borderRadius: 14, border: `1px solid ${T.border}`, background: T.surface, color: T.textM, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = T.text; e.currentTarget.style.borderColor = T.textM; }}
                onMouseLeave={e => { e.currentTarget.style.color = T.textM; e.currentTarget.style.borderColor = T.border; }}
              >
                {dark ? <SunIcon /> : <MoonIcon />}
              </button>

              <button
                onClick={handleSignOut} 
                title="End Session"
                style={{
                  flex: isCollapsed ? 'none' : 1, height: 48, width: isCollapsed ? '100%' : 'auto',
                  borderRadius: 14, border: `1px solid ${T.border}`, background: T.surface, color: T.textM, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', gap: 8, fontSize: '0.85rem', fontWeight: 500
                }}
                onMouseEnter={e => { e.currentTarget.style.color = T.text; e.currentTarget.style.borderColor = T.textM; }}
                onMouseLeave={e => { e.currentTarget.style.color = T.textM; e.currentTarget.style.borderColor = T.border; }}
              >
                <LogoutIcon />
              </button>
            </div>
          </div>
        </aside>

        <style>{`
          /* 3D Wave Animation for the Desktop Toggle Logo */
          @keyframes wave3D {
            0%   { transform: perspective(400px) rotateY(0deg) scale(1) translateZ(0); }
            50%  { transform: perspective(400px) rotateY(180deg) scale(0.8) translateZ(30px); filter: brightness(1.5); }
            100% { transform: perspective(400px) rotateY(360deg) scale(1) translateZ(0); }
          }
          .logo-3d-toggle { 
            transition: transform 0.4s ease, filter 0.4s ease; 
            transform-style: preserve-3d; 
          }
          .logo-3d-toggle:hover:not(:disabled) { transform: scale(1.08); filter: drop-shadow(0 0 8px rgba(139,92,246,0.4)); }
          .logo-3d-toggle.wave-anim { animation: wave3D 0.6s cubic-bezier(0.25, 1, 0.5, 1) forwards; }

          /* Mobile Creative 3D Toggle Animation */
          .mobile-toggle-inner {
            transition: transform 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55), filter 0.5s ease;
            transform-style: preserve-3d;
          }
          .mobile-fab-toggle.is-open .mobile-toggle-inner {
            transform: perspective(400px) rotateX(180deg) rotateY(180deg) scale(0.9);
            filter: drop-shadow(0 0 15px rgba(232,121,249,0.6));
          }

          /* Hide scrollbar for sidebar */
          .sidebar-container::-webkit-scrollbar { display: none; }
          .sidebar-container { -ms-overflow-style: none; scrollbar-width: none; }

          /* ── RESPONSIVE RIGHT-SIDE ANIMATION OVERRIDES ── */
          @media (max-width: 1024px) {
            .mobile-fab-toggle { display: flex !important; }
            .desktop-logo-toggle { display: none !important; }
            
            /* Slide in from the RIGHT instead of LEFT */
            .sidebar-container { 
              left: auto !important; 
              right: 0 !important; 
              border-right: none !important; 
              border-left: 1px solid ${T.border} !important;
              
              /* Premium 3D Perspective Entrance */
              transform: perspective(1000px) translateX(100%) rotateY(15deg) scale(0.95) !important; 
              opacity: 0 !important;
              transform-origin: right center !important;
              
              width: 280px !important; 
              min-width: 280px !important; 
              padding: 0 24px 24px !important; 
              
              transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1) !important;
            }
            
            /* Open State */
            .sidebar-container.mobile-open { 
              transform: perspective(1000px) translateX(0) rotateY(0deg) scale(1) !important; 
              opacity: 1 !important;
            }
          }
          
          @media (max-width: 768px) {
            .mobile-overlay { display: block !important; }
            .sidebar-container { width: 300px !important; min-width: 300px !important; padding: 0 24px 32px !important; }
          }
        `}</style>
      </>
    );
  }