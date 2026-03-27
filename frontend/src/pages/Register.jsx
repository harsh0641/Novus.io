import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NovusLogo from '../components/NovusLogo';
import { PremiumOrb3D } from './Login'; 

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '', gmail_account: '', gmail_app_password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState('');
  const [gmailOpen, setGmailOpen] = useState(false);

  const T = { bg: '#030303', border: 'rgba(255,255,255,0.06)', text: '#FFFFFF', textDim: '#888888' };

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); 
    if (form.password !== form.confirmPassword) { setError("Passwords do not match."); return; }
    setLoading(true);
    try {
      const res = await register({ name: form.name, email: form.email, password: form.password, gmail_account: form.gmail_account, gmail_app_password: form.gmail_app_password });
      if (res.success) navigate('/dashboard');
      else setError(res.error || 'Registration failed.');
    } catch (err) { setError(err.response?.data?.detail || 'Registration failed.'); } 
    finally { setLoading(false); }
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
        .integration-panel { overflow: hidden; transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1); }

        /* ── RESPONSIVE ── */
        @media (max-width: 1024px) {
          .auth-left { flex: 0 0 40% !important; padding: 40px !important; }
          .auth-left h2 { font-size: 2rem !important; }
          .auth-right { flex: 0 0 60% !important; padding: 40px !important; }
          .auth-form-box { max-width: 100% !important; }
        }
        @media (max-width: 768px) {
          .auth-wrapper { flex-direction: column !important; }
          .auth-left { flex: 0 0 auto !important; min-height: 240px !important; padding: 36px 28px 28px !important; border-right: none !important; border-bottom: 1px solid ${T.border} !important; }
          .auth-left-text { display: none !important; }
          .auth-right { flex: 1 !important; padding: 40px 28px !important; align-items: flex-start !important; overflow-y: auto !important; }
          .auth-form-box { max-width: 100% !important; width: 100% !important; }
          .register-pw-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 480px) {
          .auth-left { min-height: 190px !important; padding: 28px 20px 20px !important; }
          .auth-right { padding: 32px 20px !important; }
          .auth-form-box h1 { font-size: 1.25rem !important; margin-bottom: 28px !important; }
          .register-pw-grid { gap: 16px !important; }
        }
      `}</style>

      <div className="auth-left" style={{ flex: '1 1 45%', position: 'relative', overflow: 'hidden', borderRight: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', padding: '56px' }}>
        <PremiumOrb3D />
        <div style={{ position: 'relative', zIndex: 10 }}><NovusLogo size="sm" textColor={T.text} /></div>
        <div className="auth-left-text" style={{ position: 'relative', zIndex: 10, marginTop: 'auto' }}>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 500, letterSpacing: '-0.04em', marginBottom: 16 }}>Initialize workspace.</h2>
          <p style={{ color: T.textDim, fontSize: '1.05rem', lineHeight: 1.6, maxWidth: 420, fontWeight: 300 }}>Create your profile to start syncing and enriching your career data automatically.</p>
        </div>
      </div>

      <div className="auth-right" style={{ flex: '1 1 55%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '56px', background: T.bg, overflowY: 'auto' }}>
        <div className="auth-form-box fade-in" style={{ width: '100%', maxWidth: 420 }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, margin: '0 0 40px', letterSpacing: '-0.03em' }}>Create Account</h1>
          {error && <div style={{ background: 'transparent', borderLeft: '2px solid #ef4444', color: '#ef4444', padding: '8px 16px', fontSize: '0.85rem', marginBottom: 32 }}>{error}</div>}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="register-pw-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: T.textDim, marginBottom: 8 }}>Full Name</label>
                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Jane Doe" required style={inputBase} className={focused === 'name' ? 'inp-focus' : ''} onFocus={() => setFocused('name')} onBlur={() => setFocused('')} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: T.textDim, marginBottom: 8 }}>Email</label>
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="name@domain.com" required style={inputBase} className={focused === 'email' ? 'inp-focus' : ''} onFocus={() => setFocused('email')} onBlur={() => setFocused('')} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: T.textDim, marginBottom: 8 }}>Password</label>
                <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="••••••••" required style={inputBase} className={focused === 'pwd' ? 'inp-focus' : ''} onFocus={() => setFocused('pwd')} onBlur={() => setFocused('')} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: T.textDim, marginBottom: 8 }}>Confirm Password</label>
                <input type="password" value={form.confirmPassword} onChange={e => setForm({ ...form, confirmPassword: e.target.value })} placeholder="••••••••" required style={inputBase} className={focused === 'cpwd' ? 'inp-focus' : ''} onFocus={() => setFocused('cpwd')} onBlur={() => setFocused('')} />
              </div>
            </div>

            <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 24, marginTop: 8 }}>
              <button type="button" onClick={() => setGmailOpen(!gmailOpen)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', color: T.text, fontSize: '0.9rem', fontWeight: 400, cursor: 'pointer', padding: 0 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 7.00005L10.2 11.65C11.2667 12.45 12.7333 12.45 13.8 11.65L20 7" strokeLinecap="round" strokeLinejoin="round"/><rect x="3" y="5" width="18" height="14" rx="2" strokeLinecap="round"/></svg>
                  Connect IMAP Integration <span style={{ color: T.textDim }}>(Optional)</span>
                </span>
                <span style={{ transition: 'transform 0.4s', transform: gmailOpen ? 'rotate(180deg)' : 'none', color: T.textDim }}>↓</span>
              </button>

              <div className="integration-panel" style={{ maxHeight: gmailOpen ? '250px' : '0', opacity: gmailOpen ? 1 : 0, marginTop: gmailOpen ? 24 : 0 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <input type="email" value={form.gmail_account} onChange={e => setForm({ ...form, gmail_account: e.target.value })} placeholder="Google Account Email" style={inputBase} className={focused === 'gml' ? 'inp-focus' : ''} onFocus={() => setFocused('gml')} onBlur={() => setFocused('')} />
                  <div>
                    <input type="password" value={form.gmail_app_password} onChange={e => setForm({ ...form, gmail_app_password: e.target.value })} placeholder="16-Digit App Password" style={inputBase} className={focused === 'gpwd' ? 'inp-focus' : ''} onFocus={() => setFocused('gpwd')} onBlur={() => setFocused('')} />
                    <div style={{ marginTop: 10, textAlign: 'right' }}>
                      <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem', color: T.textDim, textDecoration: 'underline' }}>Generate App Password</a>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-premium" style={{ height: 48, marginTop: 16, borderRadius: 12, fontSize: '0.95rem', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Initializing...' : 'Create Workspace'}
            </button>
          </form>

          <div style={{ marginTop: 40, textAlign: 'center', fontSize: '0.85rem', color: T.textDim }}>
            Already have an account? <Link to="/login" style={{ color: T.text, fontWeight: 500, textDecoration: 'none' }}>Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}