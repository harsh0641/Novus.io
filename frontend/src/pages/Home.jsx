import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import NovusLogo from '../components/NovusLogo';

/* ─── Premium 3D Element: Liquid Obsidian Wave ─── */
function LiquidWave3D({ style }) {
  const mountRef = useRef(null);
  useEffect(() => {
    let animId, renderer, scene, camera, plane;
    const el = mountRef.current;
    if (!el) return;

    const init = () => {
      const THREE = window.THREE;
      const W = el.clientWidth, H = el.clientHeight;

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(W, H);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      el.appendChild(renderer.domElement);

      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(45, W / H, 1, 100);
      camera.position.set(0, -2, 12);
      camera.lookAt(0, 0, 0);

      // Liquid Metal Plane
      const geo = new THREE.PlaneGeometry(30, 15, 64, 64);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x050505,
        roughness: 0.2,
        metalness: 0.9,
        wireframe: false,
      });
      plane = new THREE.Mesh(geo, mat);
      plane.rotation.x = -Math.PI / 2.5; // Tilt it back
      plane.position.y = -3;
      scene.add(plane);

      // Studio Lighting
      const light1 = new THREE.PointLight(0xffffff, 2, 50);
      light1.position.set(5, 5, 5);
      scene.add(light1);

      const light2 = new THREE.PointLight(0x6366f1, 4, 50); // Deep indigo rim light
      light2.position.set(-10, 5, 2);
      scene.add(light2);

      const ambient = new THREE.AmbientLight(0xffffff, 0.1);
      scene.add(ambient);

      // Save base vertices for fluid animation
      const posAttribute = geo.attributes.position;
      const v0 = [];
      for (let i = 0; i < posAttribute.count; i++) {
        v0.push(new THREE.Vector3().fromBufferAttribute(posAttribute, i));
      }

      let mouseX = 0, mouseY = 0;
      window.addEventListener('mousemove', (e) => {
        mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
        mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
      });

      const clock = new THREE.Clock();
      const tick = () => {
        animId = requestAnimationFrame(tick);
        const t = clock.getElapsedTime();

        // Fluid vertex displacement (gentle rolling waves)
        for (let i = 0; i < posAttribute.count; i++) {
          const v = v0[i];
          const noise = Math.sin(v.x * 0.5 + t * 0.5) * Math.cos(v.y * 0.5 + t * 0.4) * 0.8;
          posAttribute.setZ(i, v.z + noise);
        }
        geo.computeVertexNormals();
        posAttribute.needsUpdate = true;

        // Subtle camera parallax
        camera.position.x += (mouseX * 1.5 - camera.position.x) * 0.05;
        camera.position.y += (-mouseY * 1.5 - 2 - camera.position.y) * 0.05;
        camera.lookAt(0, -2, 0);
        
        // Dynamic lighting movement
        light1.position.x = Math.sin(t * 0.3) * 8;
        light1.position.z = Math.cos(t * 0.3) * 8;

        renderer.render(scene, camera);
      };
      tick();

      el._cleanup = () => {
        cancelAnimationFrame(animId);
        window.removeEventListener('mousemove', null);
        renderer.dispose();
        if (renderer.domElement.parentNode === el) el.removeChild(renderer.domElement);
      };
    };

    if (window.THREE) init();
    else {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
      script.onload = init;
      document.head.appendChild(script);
    }
    return () => { if (el._cleanup) el._cleanup(); };
  }, []);

  return <div ref={mountRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, ...style }} />;
}

export default function Home() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const T = { bg: '#030303', surface: '#0A0A0A', border: 'rgba(255,255,255,0.06)', text: '#FFFFFF', textDim: '#888888' };

  return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.text, fontFamily: "'Inter', sans-serif", overflowX: 'hidden' }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      
      <style>{`
        * { box-sizing: border-box; }
        ::selection { background: #FFFFFF; color: #000000; }
        .glass-nav {
          background: ${scrolled ? 'rgba(3, 3, 3, 0.7)' : 'transparent'};
          backdrop-filter: ${scrolled ? 'blur(20px) saturate(180%)' : 'none'};
          border-bottom: ${scrolled ? `1px solid ${T.border}` : '1px solid transparent'};
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .btn-ghost { background: transparent; color: ${T.textDim}; border: none; transition: color 0.3s; }
        .btn-ghost:hover { color: ${T.text}; }
        .btn-premium { background: #FFFFFF; color: #000000; font-weight: 600; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        .btn-premium:hover { transform: scale(0.98); background: #E5E5E5; box-shadow: 0 0 20px rgba(255,255,255,0.1); }
        .bento { 
          background: rgba(255,255,255,0.015); border: 1px solid ${T.border}; border-radius: 16px; 
          padding: 40px; transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1); position: relative; overflow: hidden;
          box-shadow: inset 0 1px 1px rgba(255,255,255,0.03);
        }
        .bento:hover { border-color: rgba(255,255,255,0.15); background: rgba(255,255,255,0.03); transform: translateY(-2px); }
        .fade-up { animation: fadeUp 1s cubic-bezier(0.16, 1, 0.3, 1) both; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }

        /* ─── RESPONSIVE ─── */

        /* Tablet: 481px – 1024px */
        @media (max-width: 1024px) {
          .novus-nav { padding: 0 28px !important; }
          .novus-bento-section { padding: 40px 28px 120px !important; }
          .novus-bento-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .novus-bento-wide { grid-column: 1 / -1 !important; padding: 40px 36px !important; flex-direction: column !important; gap: 32px !important; }
          .novus-bento-wide-inner { max-width: 100% !important; }
          .novus-bento-visual { width: 100% !important; height: 140px !important; }
          .novus-hero-title { font-size: clamp(2.4rem, 5.5vw, 4rem) !important; }
          .novus-hero-sub { font-size: 1rem !important; }
          .novus-footer { padding: 32px 28px !important; }
        }

        /* Mobile: up to 480px */
        @media (max-width: 480px) {
          .novus-nav { padding: 0 20px !important; height: 60px !important; }
          .novus-nav-btn-ghost { display: none !important; }
          .novus-nav-btn-primary { height: 34px !important; padding: 0 14px !important; font-size: 0.8rem !important; border-radius: 7px !important; }

          .novus-hero { padding-top: 60px !important; min-height: 100svh !important; }
          .novus-hero-content { padding: 0 20px !important; margin-top: -6vh !important; }
          .novus-hero-pill { padding: 5px 13px !important; margin-bottom: 24px !important; }
          .novus-hero-pill-dot { width: 5px !important; height: 5px !important; }
          .novus-hero-pill-text { font-size: 0.6rem !important; }
          .novus-hero-title { font-size: clamp(2rem, 9vw, 2.8rem) !important; margin-bottom: 18px !important; letter-spacing: -0.03em !important; }
          .novus-hero-sub { font-size: 0.92rem !important; margin-bottom: 36px !important; }
          .novus-hero-cta { gap: 12px !important; flex-direction: column !important; align-items: center !important; }
          .novus-hero-cta-btn { width: 100% !important; max-width: 320px !important; height: 48px !important; font-size: 0.9rem !important; }

          .novus-bento-section { padding: 32px 16px 80px !important; }
          .novus-bento-heading { font-size: 1.5rem !important; margin-bottom: 12px !important; }
          .novus-bento-sub { font-size: 0.9rem !important; margin-bottom: 48px !important; }
          .novus-bento-grid { grid-template-columns: 1fr !important; gap: 16px !important; }
          .novus-bento-wide { grid-column: 1 / -1 !important; flex-direction: column !important; padding: 28px 24px !important; gap: 24px !important; }
          .novus-bento-wide-inner { max-width: 100% !important; }
          .novus-bento-wide-inner h3 { font-size: 1.6rem !important; }
          .novus-bento-visual { width: 100% !important; height: 110px !important; }
          .novus-bento-card { padding: 28px 24px !important; }
          .novus-bento-card h4 { font-size: 1.1rem !important; }

          .novus-footer { padding: 28px 20px !important; flex-direction: column !important; gap: 12px !important; align-items: flex-start !important; }
          .novus-footer-copy { font-size: 0.7rem !important; }
        }

        /* Very small phones: up to 360px */
        @media (max-width: 360px) {
          .novus-hero-title { font-size: clamp(1.75rem, 9.5vw, 2.4rem) !important; }
          .novus-bento-section { padding: 24px 12px 60px !important; }
        }
      `}</style>

      {/* ── NAV ── */}
      <nav className="glass-nav novus-nav" style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, height: 72, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 48px' }}>
        <NovusLogo size="sm" textColor={T.text} />
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <button onClick={() => navigate('/login')} className="btn-ghost novus-nav-btn-ghost" style={{ fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer' }}>Sign in</button>
          <button onClick={() => navigate('/register')} className="btn-premium novus-nav-btn-primary" style={{ height: 36, padding: '0 18px', borderRadius: 8, fontSize: '0.85rem', border: 'none', cursor: 'pointer' }}>Create Workspace</button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="novus-hero" style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 80 }}>
        
        <LiquidWave3D />

        {/* Ambient top glow */}
        <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '60vw', height: '30vh', background: 'radial-gradient(ellipse at top, rgba(255,255,255,0.05) 0%, transparent 70%)', filter: 'blur(50px)', pointerEvents: 'none' }} />

        <div className="novus-hero-content fade-up" style={{ position: 'relative', zIndex: 10, textAlign: 'center', maxWidth: 900, padding: '0 24px', marginTop: '-10vh' }}>
          
          <div className="fade-up novus-hero-pill" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '6px 16px', borderRadius: 999, marginBottom: 32, background: 'rgba(255,255,255,0.02)', border: `1px solid ${T.border}`, boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.05)' }}>
            <span className="novus-hero-pill-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: '#FFFFFF', boxShadow: '0 0 10px #FFFFFF' }} />
            <span className="novus-hero-pill-text" style={{ fontSize: '0.65rem', fontWeight: 600, color: T.textDim, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Novus v3.0 Is Live</span>
          </div>

          <h1 className="fade-up novus-hero-title" style={{ animationDelay: '0.1s', margin: '0 0 24px', fontSize: 'clamp(3rem, 7vw, 5.5rem)', fontWeight: 600, letterSpacing: '-0.04em', lineHeight: 1.05 }}>
            Automate your pipeline.<br />
            <span style={{ color: T.textDim }}>Eliminate data entry.</span>
          </h1>

          <p className="fade-up novus-hero-sub" style={{ animationDelay: '0.2s', fontSize: '1.15rem', color: T.textDim, lineHeight: 1.6, margin: '0 auto 48px', maxWidth: 650, fontWeight: 300 }}>
            The professional application tracker. Novus connects to Gmail via IMAP, extracts data with Groq Llama-3.1, and runs an 8-source pipeline to find recruiter contacts instantly.
          </p>

          <div className="fade-up novus-hero-cta" style={{ animationDelay: '0.3s', display: 'flex', gap: 16, justifyContent: 'center' }}>
            <button onClick={() => navigate('/register')} className="btn-premium novus-hero-cta-btn" style={{ height: 52, padding: '0 32px', border: 'none', borderRadius: 12, fontSize: '0.95rem', cursor: 'pointer' }}>
              Initialize Workspace
            </button>
          </div>
        </div>

        {/* Fading gradient to blend 3D into the next section */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '25vh', background: `linear-gradient(to bottom, transparent, ${T.bg})`, pointerEvents: 'none', zIndex: 5 }} />
      </section>

      {/* ── BENTO FEATURES ── */}
      <section className="novus-bento-section" style={{ position: 'relative', zIndex: 10, padding: '40px 48px 160px', maxWidth: 1200, margin: '0 auto' }}>
        
        <div className="fade-up" style={{ animationDelay: '0.4s', textAlign: 'center', marginBottom: 80 }}>
          <h2 className="novus-bento-heading" style={{ fontSize: '2rem', fontWeight: 500, letterSpacing: '-0.03em', margin: '0 0 16px' }}>Enterprise-grade architecture.</h2>
          <p className="novus-bento-sub" style={{ color: T.textDim, fontSize: '1.05rem', fontWeight: 300 }}>Built entirely on local SQLite storage. No remote servers, absolute privacy.</p>
        </div>

        <div className="fade-up novus-bento-grid" style={{ animationDelay: '0.5s', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
          
          {/* Main Feature */}
          <div className="bento novus-bento-wide" style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '56px 64px' }}>
            <div className="novus-bento-wide-inner" style={{ maxWidth: 500 }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 600, color: T.text, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16 }}>01 / Intelligent Inbox Sync</div>
              <h3 style={{ fontSize: '2.25rem', fontWeight: 500, letterSpacing: '-0.03em', margin: '0 0 16px' }}>Zero-touch extraction.</h3>
              <p style={{ fontSize: '1rem', color: T.textDim, lineHeight: 1.6, margin: 0, fontWeight: 300 }}>
                Novus pulls from your inbox and applies Llama-3.1 AI classification to parse messy threads, pulling company names, roles, and stages automatically.
              </p>
            </div>
            {/* Minimal visual abstract */}
            <div className="novus-bento-visual" style={{ width: 320, height: 200, background: 'rgba(255,255,255,0.02)', border: `1px solid ${T.border}`, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.05)' }}>
               <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '70%' }}>
                 <div style={{ height: 6, width: '100%', background: 'rgba(255,255,255,0.1)', borderRadius: 99 }} />
                 <div style={{ height: 6, width: '60%', background: 'rgba(255,255,255,0.1)', borderRadius: 99 }} />
                 <div style={{ height: 6, width: '80%', background: '#FFFFFF', borderRadius: 99, boxShadow: '0 0 10px rgba(255,255,255,0.5)', marginTop: 8 }} />
               </div>
            </div>
          </div>

          {[
            { n: '02', title: '8-Source Waterfall', desc: 'Queries Google CSE, Hunter, Apollo, and Apify in sequence. Stops immediately when a verified email and LinkedIn URL are found.' },
            { n: '03', title: 'Credit Management', desc: 'A built-in skip-if-found mechanism guarantees zero duplicate API calls, preserving your finite rate limits.' },
            { n: '04', title: 'AI Cold Outreach', desc: 'Generates personalized cold emails using 4 tone presets (Professional, Friendly, Concise, Enthusiastic) for verified recruiters.' },
          ].map((f, i) => (
            <div key={i} className="bento novus-bento-card" style={{ padding: '40px' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 600, color: T.textDim, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 24 }}>{f.n} / Module</div>
              <h4 style={{ fontSize: '1.25rem', fontWeight: 500, margin: '0 0 12px', letterSpacing: '-0.02em' }}>{f.title}</h4>
              <p style={{ fontSize: '0.9rem', color: T.textDim, lineHeight: 1.6, margin: 0, fontWeight: 300 }}>{f.desc}</p>
            </div>
          ))}

        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="novus-footer" style={{ padding: '40px 48px', borderTop: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <NovusLogo size="sm" textColor={T.textDim} />
        <span className="novus-footer-copy" style={{ fontSize: '0.75rem', color: T.textDim, fontWeight: 400 }}>© 2026 Novus Systems. Confidential Internal Use Only.</span>
      </footer>
    </div>
  );
}