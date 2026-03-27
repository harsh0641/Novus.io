import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NovusLogo from '../components/NovusLogo';

/* ─── Premium 3D Element: Liquid Obsidian Orb ─── */
export function PremiumOrb3D() {
  const mountRef = useRef(null);
  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    let animId;

    const init = () => {
      const THREE = window.THREE;
      const W = el.clientWidth, H = el.clientHeight;
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(W, H);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      el.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(35, W / H, 0.1, 100);
      camera.position.set(0, 0, 7);

      const geo = new THREE.SphereGeometry(1.6, 64, 64);
      const mat = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.1, metalness: 0.8 });
      const sphere = new THREE.Mesh(geo, mat);
      scene.add(sphere);

      const light1 = new THREE.PointLight(0xffffff, 2, 50);
      light1.position.set(5, 5, 5);
      scene.add(light1);

      const light2 = new THREE.PointLight(0x6366f1, 3, 50);
      light2.position.set(-5, -5, 2);
      scene.add(light2);

      const ambient = new THREE.AmbientLight(0xffffff, 0.2);
      scene.add(ambient);

      const posAttribute = geo.attributes.position;
      const v0 = [];
      for (let i = 0; i < posAttribute.count; i++) v0.push(new THREE.Vector3().fromBufferAttribute(posAttribute, i));

      let mouseX = 0, mouseY = 0;
      window.addEventListener('mousemove', (e) => {
        mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
        mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
      });

      const clock = new THREE.Clock();
      const tick = () => {
        animId = requestAnimationFrame(tick);
        const t = clock.getElapsedTime();

        for (let i = 0; i < posAttribute.count; i++) {
          const v = v0[i];
          const noise = Math.sin(v.x * 2 + t) * Math.cos(v.y * 2 + t * 0.8) * 0.1;
          posAttribute.setXYZ(i, v.x + v.x * noise, v.y + v.y * noise, v.z + v.z * noise);
        }
        geo.computeVertexNormals();
        posAttribute.needsUpdate = true;
        sphere.rotation.y = t * 0.1 + mouseX * 0.2;
        sphere.rotation.x = t * 0.05 + mouseY * 0.2;
        light1.position.x = Math.sin(t * 0.5) * 5;
        light1.position.z = Math.cos(t * 0.5) * 5;
        renderer.render(scene, camera);
      };
      tick();
      el._r = renderer; el._el = renderer.domElement;
    };

    if (window.THREE) init();
    else {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
      s.onload = init;
      document.head.appendChild(s);
    }
    return () => {
      cancelAnimationFrame(animId);
      if (el._r) el._r.dispose();
      if (el._el && el._el.parentNode === el) el.removeChild(el._el);
    };
  }, []);
  return <div ref={mountRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />;
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState('');

  const T = { bg: '#030303', border: 'rgba(255,255,255,0.06)', text: '#FFFFFF', textDim: '#888888' };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await login(form.email, form.password);
      if (res.success) navigate('/dashboard');
      else setError(res.message || 'Invalid credentials.');
    } catch (err) {
      const detail = err.response?.data?.detail;

      if (Array.isArray(detail)) {
        // Pydantic validation errors — extract human-readable messages
        setError(detail.map(e => e.msg).join(', '));
      } else if (typeof detail === 'string') {
        setError(detail);
      } else {
        setError(err.message || 'Login failed.');
      }
    } finally {
      setLoading(false);
    }
  };
  const inputBase = {
    width: '100%', height: 48, padding: '0 16px', boxSizing: 'border-box',
    background: 'rgba(255,255,255,0.02)', border: `1px solid transparent`, borderRadius: 12,
    fontSize: '0.95rem', fontFamily: 'inherit', color: T.text, outline: 'none',
    transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
    boxShadow: 'inset 0 1px 1px rgba(0,0,0,0.5)',
  };

  return (
    <div className="auth-wrapper" style={{ minHeight: '100vh', display: 'flex', fontFamily: "'Inter', sans-serif", background: T.bg, color: T.text }}>
      <style>{`
        ::placeholder { color: ${T.textDim}; opacity: 0.5; }
        .inp-focus { background: rgba(255,255,255,0.04) !important; border-color: rgba(255,255,255,0.1) !important; box-shadow: 0 0 0 1px rgba(255,255,255,0.8), inset 0 1px 1px rgba(0,0,0,0.5) !important; }
        .btn-premium { background: #FFFFFF; color: #000000; font-weight: 600; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); border: none; cursor: pointer; }
        .btn-premium:hover:not(:disabled) { transform: scale(0.98); background: #E5E5E5; }
        .fade-in { animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) both; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

        /* ── RESPONSIVE ── */
        @media (max-width: 1024px) {
          .auth-left { flex: 0 0 42% !important; padding: 40px !important; }
          .auth-left h2 { font-size: 2rem !important; }
          .auth-right { flex: 0 0 58% !important; padding: 40px !important; }
        }
        @media (max-width: 768px) {
          .auth-wrapper { flex-direction: column !important; }
          .auth-left { flex: 0 0 auto !important; min-height: 260px !important; padding: 40px 28px 32px !important; border-right: none !important; border-bottom: 1px solid ${T.border} !important; }
          .auth-left-text { display: none !important; }
          .auth-right { flex: 1 !important; padding: 40px 28px !important; align-items: flex-start !important; }
          .auth-form-box { max-width: 100% !important; width: 100% !important; }
        }
        @media (max-width: 480px) {
          .auth-left { min-height: 200px !important; padding: 28px 20px 24px !important; }
          .auth-right { padding: 32px 20px !important; }
          .auth-form-box h1 { font-size: 1.25rem !important; margin-bottom: 28px !important; }
        }
      `}</style>

      <div className="auth-left" style={{ flex: '1 1 50%', position: 'relative', overflow: 'hidden', borderRight: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', padding: '56px' }}>
        <PremiumOrb3D />
        <div style={{ position: 'relative', zIndex: 10 }}><NovusLogo size="sm" textColor={T.text} /></div>
        <div className="auth-left-text" style={{ position: 'relative', zIndex: 10, marginTop: 'auto' }}>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 500, letterSpacing: '-0.04em', marginBottom: 16 }}>Welcome back.</h2>
          <p style={{ color: T.textDim, fontSize: '1.05rem', lineHeight: 1.6, maxWidth: 420, fontWeight: 300 }}>Enter your credentials to access your workspace and resume your automated pipeline.</p>
        </div>
      </div>

      <div className="auth-right" style={{ flex: '1 1 50%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px', background: T.bg }}>
        <div className="auth-form-box fade-in" style={{ width: '100%', maxWidth: 360 }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, margin: '0 0 40px', letterSpacing: '-0.03em' }}>Sign in</h1>
          {error && <div style={{ background: 'transparent', borderLeft: '2px solid #ef4444', color: '#ef4444', padding: '8px 16px', fontSize: '0.85rem', marginBottom: 32 }}>{error}</div>}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: T.textDim, marginBottom: 8 }}>Email address</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="name@domain.com" required style={inputBase} className={focused === 'email' ? 'inp-focus' : ''} onFocus={() => setFocused('email')} onBlur={() => setFocused('')} />
            </div>
            <div>
              <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 500, color: T.textDim, marginBottom: 8 }}>
                <span>Password</span>
                <span style={{ color: '#6366f1', cursor: 'pointer' }}>Forgot?</span>
              </label>
              <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="••••••••" required style={inputBase} className={focused === 'pwd' ? 'inp-focus' : ''} onFocus={() => setFocused('pwd')} onBlur={() => setFocused('')} />
            </div>
            <button type="submit" disabled={loading} className="btn-premium" style={{ height: 48, marginTop: 16, borderRadius: 12, fontSize: '0.95rem', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>

          <div style={{ marginTop: 40, textAlign: 'center', fontSize: '0.85rem', color: T.textDim }}>
            Don't have an account? <Link to="/register" style={{ color: T.text, fontWeight: 500, textDecoration: 'none' }}>Create one</Link>
          </div>
        </div>
      </div>
    </div>
  );
}