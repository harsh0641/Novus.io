import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import { authAPI, gmailAPI, supabase } from '../api/client'; // ← ADDED 'supabase' HERE
import useDarkMode from '../hooks/useDarkMode';

// ── Ultra-Premium Token Map ──
function getC(dark) {
  return {
    bg:       dark ? '#030303' : '#F9FAFB',
    surface:  dark ? '#0A0A0A' : '#FFFFFF',
    border:   dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)',
    text:     dark ? '#FFFFFF' : '#09090B',
    textM:    dark ? '#A1A1AA' : '#71717A',
    textL:    dark ? '#52525B' : '#A1A1AA',
    primary:  dark ? '#FFFFFF' : '#000000',
    primaryText: dark ? '#000000' : '#FFFFFF',
    surfaceL: dark ? 'rgba(255,255,255,0.02)' : '#F4F4F5',
    surfaceLow:dark? 'rgba(255,255,255,0.01)' : '#FFFFFF',
    green:   '#10b981', greenL:  dark ? 'rgba(16,185,129,0.1)'  : '#ecfdf5',
    red:     '#ef4444', redL:    dark ? 'rgba(239,68,68,0.1)'   : '#fef2f2',
    blue:    '#3b82f6', blueL:   dark ? 'rgba(59,130,246,0.1)'  : '#eff6ff',
  };
}

const APIS = [
  {name:'Supabase',      desc:'Database & authentication',       ok:true },
  {name:'Groq AI',       desc:'Email classification & AI gen',   ok:true },
  {name:'Apify',         desc:'LinkedIn job scraper',             ok:true },
  {name:'Hunter.io',     desc:'Recruiter email finder',           ok:true },
  {name:'Apollo.io',     desc:'Recruiter profile search',         ok:true },
  {name:'Google Search', desc:'Career page discovery',            ok:true },
  {name:'Snov.io',       desc:'Email enrichment',                 ok:true },
  {name:'RocketReach',   desc:'Contact lookup (last resort)',     ok:true },
];

// ── Premium Icons ──
function FilePdfIcon() {
  return (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinecap="round" strokeLinejoin="round"/>
      <polyline points="14 2 14 8 20 8" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="16" y1="13" x2="8" y2="13" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="16" y1="17" x2="8" y2="17" strokeLinecap="round" strokeLinejoin="round"/>
      <polyline points="10 9 9 9 8 9" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
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
      const pos = new Float32Array(150 * 3);
      for (let i = 0; i < 450; i++) pos[i] = (Math.random() - 0.5) * 60;
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
  // ← Only change: added className="network-3d-bg" for mobile CSS targeting
  return <div ref={mountRef} className="network-3d-bg" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }} />;
}

function InputField({label,value,onChange,type='text',placeholder,hint}){
  const { dark } = useDarkMode();
  const C = getC(dark);
  const [focused,setFocused]=useState(false);
  return(
    <div style={{marginBottom:24}}>
      <label style={{display:'block',fontSize:'0.65rem',fontWeight:600,color:C.textM,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:8}}>{label}</label>
      <input type={type} value={value} onChange={onChange} placeholder={placeholder}
        style={{width:'100%',height:48,border:`1px solid ${focused?C.textM:C.border}`,borderRadius:12,padding:'0 16px',fontSize:'0.9rem',fontFamily:'inherit',color:C.text,outline:'none',background:C.surfaceL,transition:'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',boxSizing:'border-box', boxShadow: focused ? `0 0 0 1px ${C.text}` : 'none'}}
        onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}/>
      {hint&&<p style={{margin:'8px 0 0',fontSize:'0.75rem',color:C.textL, fontWeight:300}}>{hint}</p>}
    </div>
  );
}

function Card({children,style={}, className=""}){
  const { dark } = useDarkMode();
  const C = getC(dark);
  return(
    <div className={`bento ${className}`} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:24,padding:'32px',marginBottom:24,position:'relative',overflow:'hidden',boxShadow: dark ? 'inset 0 1px 1px rgba(255,255,255,0.03)' : '0 2px 10px rgba(0,0,0,0.02)',...style}}>
      {children}
    </div>
  );
}

function SectionTitle({children}){
  const { dark } = useDarkMode();
  const C = getC(dark);
  return <h2 style={{fontSize:'1.25rem',fontWeight:500,color:C.text,margin:'0 0 6px',letterSpacing:'-0.02em'}}>{children}</h2>;
}

function SectionSub({children}){
  const { dark } = useDarkMode();
  const C = getC(dark);
  return <p style={{fontSize:'0.85rem',color:C.textM,margin:'0 0 24px', fontWeight:300}}>{children}</p>;
}

export default function Settings(){
  const {user, logout}=useAuth();
  const { dark } = useDarkMode();
  const C = getC(dark);

  const [gmailAccount,setGmailAccount]=useState(user?.gmail_account||'');
  const [gmailPassword,setGmailPassword]=useState('');
  const [gmailStatus,setGmailStatus]=useState(null); 
  const [savingGmail,setSavingGmail]=useState(false);
  const [editingName,setEditingName]=useState(false);
  const [nameVal,setNameVal]=useState(user?.name||'');
  const [savingProfile,setSavingProfile]=useState(false);
  const [testSyncing,setTestSyncing]=useState(false);
  const [toast,setToast]=useState(null);

  // ── Document Vault State ──
  const [resumeName, setResumeName] = useState(user?.resume_name || '');
  const [coverName, setCoverName] = useState(user?.cover_letter_name || '');
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const resumeRef = useRef(null);
  const coverRef = useRef(null);

  const showToast=(msg,type='success')=>{setToast({msg,type});setTimeout(()=>setToast(null),4000);};

  useEffect(()=>{
    if(!user?.id)return;
    gmailAPI.status(user.id).then(r=>setGmailStatus(r.data)).catch(()=>{});
  },[user]);

  const handleSaveGmail=async(e)=>{
    e.preventDefault();
    if(!gmailAccount.trim()){showToast('Gmail address is required','error');return;}
    if(!gmailPassword.trim()){showToast('App password is required','error');return;}
    setSavingGmail(true);
    try{
      const res=await authAPI.updateGmail(user.id, gmailAccount.trim(), gmailPassword.trim());
      if(res.data.success){
        showToast('Integration configuration updated.');
        setGmailPassword('');
        const status=await gmailAPI.status(user.id);
        setGmailStatus(status.data);
      }
    }catch(err){
      const d=err.response?.data?.detail;
      showToast(typeof d==='string'?d:'Update failed','error');
    }finally{
      setSavingGmail(false);
    }
  };

  const handleTestSync=async()=>{
    if(!user?.id)return;
    setTestSyncing(true);
    try{
      const res=await gmailAPI.sync(user.id);
      showToast(res.data.message||'Protocol executed successfully.');
    }catch(err){
      showToast('Synchronization failure','error');
    }finally{setTestSyncing(false);}
  };

  const handleSaveName=async(e)=>{
    e.preventDefault();
    if(!nameVal.trim()){showToast('Identifier required','error');return;}
    setSavingProfile(true);
    try{
      await authAPI.updateProfile(user.id, nameVal.trim());
      showToast('Identity updated.');
      setEditingName(false);
    }catch(err){
      showToast('Update failure','error');
    }finally{setSavingProfile(false);}
  };

  // ── Document Upload Handler (Supabase logic included) ──
  const handleFileUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      showToast('System strictly requires .pdf formats for parsing.', 'error');
      e.target.value = null;
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('File exceeds maximum 5MB limitation.', 'error');
      e.target.value = null;
      return;
    }

    setUploadingDoc(true);
    try {
      // 1. Define file path in Supabase Storage
      const filePath = `${user.id}/${type}_${Date.now()}.pdf`;

      // 2. Upload to 'vault' bucket
      const { error: uploadError } = await supabase.storage
        .from('vault')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // 3. Retrieve public URL
      const { data: publicUrlData } = supabase.storage
        .from('vault')
        .getPublicUrl(filePath);

      const fileUrl = publicUrlData.publicUrl;

      // 4. Save to Database
      const updateData = type === 'resume' 
        ? { resume_name: file.name, resume_url: fileUrl }
        : { cover_letter_name: file.name, cover_letter_url: fileUrl };

      const { error: dbError } = await supabase
        .from('users') // We use 'users' based on your ERD mapping
        .update(updateData)
        .eq('id', user.id);

      if (dbError) throw dbError;
      
      // 5. Update UI
      if (type === 'resume') setResumeName(file.name);
      if (type === 'cover') setCoverName(file.name);
      
      showToast(`${type === 'resume' ? 'Master Resume' : 'Cover Letter'} securely vaulted.`);
    } catch (err) {
      console.error("Upload error:", err);
      showToast('Document upload failed. Check console for details.', 'error');
    } finally {
      setUploadingDoc(false);
      e.target.value = null;
    }
  };

  const avatarLet=user?.name?.[0]?.toUpperCase()||'U';

  return(
    <div style={{display:'flex',minHeight:'100vh',background:C.bg, fontFamily:"'Inter', sans-serif", transition:'background 0.4s cubic-bezier(0.16, 1, 0.3, 1)'}}>
      <MinimalNetwork3D dark={dark} />
      <Sidebar/>

      <div className="main-content" style={{flex:1,display:'flex',flexDirection:'column',minWidth:0, position:'relative', zIndex:10, marginLeft: 'var(--sidebar-width, 280px)', transition: 'margin-left 0.5s cubic-bezier(0.16, 1, 0.3, 1)'}}>

        <header className="dash-header" style={{background: dark ? 'rgba(3,3,3,0.7)' : 'rgba(250,250,251,0.8)',borderBottom:`1px solid ${C.border}`,height:80,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 48px',position:'sticky',top:0,zIndex:50,backdropFilter:'blur(24px) saturate(180%)'}}>
          <div>
            <h1 style={{fontSize:'1.5rem',fontWeight:500,color:C.text,margin:0,letterSpacing:'-0.03em'}}>Settings</h1>
          </div>
          <div style={{width:40,height:40,borderRadius:'50%',background:C.surfaceL,border:`1px solid ${C.border}`,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:600,color:C.text,fontSize:'0.9rem'}}>{avatarLet}</div>
        </header>

        <main style={{padding:'48px',maxWidth:800}}>

          {/* ── Profile ── */}
          <Card className="fade-up">
            <SectionTitle>User Identity</SectionTitle>
            <SectionSub>Manage your administrative profile and account metrics.</SectionSub>

            <div style={{display:'flex',alignItems:'center',gap:24,marginBottom:32}}>
              <div style={{width:64,height:64,borderRadius:'50%',background:C.surfaceL,border:`1px solid ${C.border}`,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:600,color:C.text,fontSize:'1.5rem',flexShrink:0}}>
                {avatarLet}
              </div>
              <div>
                <div style={{fontSize:'1.1rem',fontWeight:500,color:C.text,marginBottom:4}}>{user?.name||'—'}</div>
                <div style={{fontSize:'0.9rem',color:C.textM, fontWeight:300}}>{user?.email||'—'}</div>
                <span style={{display:'inline-flex',alignItems:'center',gap:8,marginTop:12,padding:'4px 12px',borderRadius:8,background:C.blueL,fontSize:'0.75rem',fontWeight:600,color:C.blue, border:`1px solid ${C.border}`}}>
                  <div style={{width:6,height:6,borderRadius:'50%',background:C.blue, boxShadow:`0 0 8px ${C.blue}`}}/>
                  Authorized Administrator
                </span>
              </div>
            </div>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:32}}>
              {[{label:'ROOT EMAIL',val:user?.email||'—'},{label:'INITIALIZED',val:user?.created_at?new Date(user.created_at).toLocaleDateString('en-US',{month:'short',year:'numeric'}):'—'}].map((f,i)=>(
                <div key={i} style={{background:C.surfaceL,borderRadius:16,padding:16,border:`1px solid ${C.border}`}}>
                  <div style={{fontSize:'0.6rem',fontWeight:600,color:C.textL,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:6}}>{f.label}</div>
                  <div style={{fontSize:'0.9rem',fontWeight:500,color:C.text}}>{f.val}</div>
                </div>
              ))}
            </div>

            {!editingName?(
              <div style={{display:'flex',alignItems:'center',gap:16}}>
                <div style={{background:C.surfaceL,borderRadius:16,padding:16,border:`1px solid ${C.border}`,flex:1}}>
                  <div style={{fontSize:'0.6rem',fontWeight:600,color:C.textL,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:6}}>Full Name</div>
                  <div style={{fontSize:'0.9rem',fontWeight:500,color:C.text}}>{user?.name||'—'}</div>
                </div>
                <button onClick={()=>setEditingName(true)} className="btn-ghost"
                  style={{height:52,padding:'0 24px',background:'transparent',color:C.text,border:`1px solid ${C.border}`,borderRadius:12,fontSize:'0.9rem',fontWeight:500,cursor:'pointer',whiteSpace:'nowrap', transition:'all 0.3s'}}>
                  Modify Identity
                </button>
              </div>
            ):(
              <form onSubmit={handleSaveName} className="fade-in" style={{display:'flex',alignItems:'flex-end',gap:12}}>
                <div style={{flex:1}}>
                  <InputField label="Full Name" value={nameVal} onChange={e=>setNameVal(e.target.value)} placeholder="Enter new identifier"/>
                </div>
                <button type="submit" disabled={savingProfile} className="btn-solid"
                  style={{height:48,padding:'0 24px',background:C.primary,color:C.primaryText,border:'none',borderRadius:12,fontSize:'0.9rem',fontWeight:600,cursor:'pointer', marginBottom:24}}>
                  {savingProfile?'Syncing...':'Commit'}
                </button>
                <button type="button" onClick={()=>{setEditingName(false);setNameVal(user?.name||'');}} className="btn-ghost"
                  style={{height:48,padding:'0 20px',background:'transparent',color:C.textM,border:`1px solid ${C.border}`,borderRadius:12,fontSize:'0.9rem',fontWeight:500,cursor:'pointer', marginBottom:24}}>
                  Cancel
                </button>
              </form>
            )}
          </Card>

          {/* ── Document Vault ── */}
          <Card className="fade-up" style={{animationDelay: '0.1s'}}>
            <SectionTitle>Document Vault</SectionTitle>
            <SectionSub>Securely store your PDF master documents for AI-assisted analysis and automated extraction.</SectionSub>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              
              {/* Resume Row */}
              <div style={{ background: C.surfaceL, borderRadius: 16, padding: 20, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: resumeName ? C.blueL : C.surface, border: `1px solid ${resumeName ? C.blue : C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: resumeName ? C.blue : C.textM, transition: 'all 0.3s' }}>
                    <FilePdfIcon />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: C.text, letterSpacing: '0.02em' }}>Master Resume <span style={{ color: C.red, marginLeft: 4 }}>*</span></div>
                    <div style={{ fontSize: '0.75rem', color: resumeName ? C.blue : C.textM, marginTop: 4, fontWeight: 300 }}>{resumeName ? resumeName : 'No document vaulted (.pdf)'}</div>
                  </div>
                </div>
                <div>
                  <input type="file" accept=".pdf" ref={resumeRef} style={{ display: 'none' }} onChange={e => handleFileUpload(e, 'resume')} />
                  <button onClick={() => resumeRef.current.click()} disabled={uploadingDoc} className="btn-ghost" style={{ height: 40, padding: '0 20px', background: 'transparent', color: C.text, border: `1px solid ${C.border}`, borderRadius: 10, fontSize: '0.85rem', fontWeight: 500, cursor: uploadingDoc ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}>
                    {uploadingDoc ? 'Encrypting...' : resumeName ? 'Replace' : 'Upload'}
                  </button>
                </div>
              </div>

              {/* Cover Letter Row */}
              <div style={{ background: C.surfaceL, borderRadius: 16, padding: 20, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: coverName ? C.blueL : C.surface, border: `1px solid ${coverName ? C.blue : C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: coverName ? C.blue : C.textM, transition: 'all 0.3s' }}>
                    <FilePdfIcon />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: C.text, letterSpacing: '0.02em' }}>Cover Letter <span style={{ color: C.textM, marginLeft: 4, fontWeight: 400 }}>(Optional)</span></div>
                    <div style={{ fontSize: '0.75rem', color: coverName ? C.blue : C.textM, marginTop: 4, fontWeight: 300 }}>{coverName ? coverName : 'No document vaulted (.pdf)'}</div>
                  </div>
                </div>
                <div>
                  <input type="file" accept=".pdf" ref={coverRef} style={{ display: 'none' }} onChange={e => handleFileUpload(e, 'cover')} />
                  <button onClick={() => coverRef.current.click()} disabled={uploadingDoc} className="btn-ghost" style={{ height: 40, padding: '0 20px', background: 'transparent', color: C.text, border: `1px solid ${C.border}`, borderRadius: 10, fontSize: '0.85rem', fontWeight: 500, cursor: uploadingDoc ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}>
                    {uploadingDoc ? 'Encrypting...' : coverName ? 'Replace' : 'Upload'}
                  </button>
                </div>
              </div>

            </div>
          </Card>

          {/* ── Gmail Integration ── */}
          <Card className="fade-up" style={{animationDelay: '0.15s'}}>
            <SectionTitle>IMAP Infrastructure</SectionTitle>
            <SectionSub>Configure the neural bridge to your Gmail workspace for automated ingestion.</SectionSub>

            {gmailStatus&&(
              <div style={{marginBottom:32,padding:16,borderRadius:16,background:gmailStatus.configured?C.greenL:C.redL,border:`1px solid ${C.border}`,display:'flex',alignItems:'center',gap:16}}>
                <div style={{width:10,height:10,borderRadius:'50%',background:gmailStatus.configured?C.green:C.red,flexShrink:0, boxShadow: `0 0 10px ${gmailStatus.configured?C.green:C.red}`}}/>
                <div>
                  <div style={{fontSize:'0.9rem',fontWeight:500,color:C.text}}>
                    {gmailStatus.configured?`Uplink Active: ${gmailStatus.account}`:'Infrastructure Offline'}
                  </div>
                  <div style={{fontSize:'0.8rem',color:C.textM,marginTop:2, fontWeight:300}}>
                    {gmailStatus.configured?'Telemetry ready for inbox synchronization.':'Credentials required to initialize IMAP bridge.'}
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSaveGmail}>
              <InputField label="Gmail Interface Address" value={gmailAccount} type="email"
                placeholder="identity@gmail.com"
                onChange={e=>setGmailAccount(e.target.value)}/>

              <InputField label="IMAP Access Key (App Password)" value={gmailPassword} type="password"
                placeholder="16-character secure key"
                onChange={e=>setGmailPassword(e.target.value)}
                hint="Requires a Google App Password, not your master account password."/>

              <div style={{background:C.surfaceL,border:`1px solid ${C.border}`,borderRadius:16,padding:20,marginBottom:32}}>
                <div style={{fontSize:'0.85rem',fontWeight:500,color:C.text,marginBottom:8}}>Configuration Protocol</div>
                <div style={{fontSize:'0.8rem',color:C.textM,lineHeight:1.6, fontWeight:300}}>
                  1. Visit <strong style={{color:C.text}}>Google Security</strong> → 2-Step Verification<br/>
                  2. Initialize "App Passwords" selection<br/>
                  3. Select <strong style={{color:C.text}}>Mail</strong> + <strong style={{color:C.text}}>Custom</strong> → Generate<br/>
                  4. Deploy the 16-character key into the field above
                </div>
                <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer"
                  style={{display:'inline-block',marginTop:16,fontSize:'0.8rem',color:C.text,fontWeight:600,textDecoration:'underline'}}>
                  Open Key Generator ↗
                </a>
              </div>

              <div style={{display:'flex',gap:12,alignItems:'center',flexWrap:'wrap'}}>
                <button type="submit" disabled={savingGmail} className="btn-solid"
                  style={{height:48,padding:'0 28px',background:C.primary,color:C.primaryText,border:'none',borderRadius:12,fontSize:'0.9rem',fontWeight:600,cursor:'pointer'}}>
                  {savingGmail?'Deploying...':'Update Infrastructure'}
                </button>

                {gmailStatus?.configured&&(
                  <button type="button" onClick={handleTestSync} disabled={testSyncing} className="btn-ghost"
                    style={{height:48,padding:'0 24px',background:'transparent',color:C.text,border:`1px solid ${C.border}`,borderRadius:12,fontSize:'0.9rem',fontWeight:500,cursor:'pointer',display:'inline-flex',alignItems:'center',gap:10}}>
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{animation:testSyncing?'spin 1s linear infinite':'none'}}><path d="M21 2v6h-6M3 12a9 9 0 0115-6.7L21 8M3 22v-6h6M21 12a9 9 0 01-15 6.7L3 16"/></svg>
                    {testSyncing?'Executing...':'Test Uplink'}
                  </button>
                )}
              </div>
            </form>
          </Card>

          {/* ── API Integrations ── */}
          <Card className="fade-up" style={{animationDelay: '0.2s'}}>
            <SectionTitle>Service Cascade</SectionTitle>
            <SectionSub>Operational status of the multi-source enrichment pipeline.</SectionSub>
            <div style={{display:'flex', flexDirection:'column', gap:4}}>
              {APIS.map((api,i)=>(
                <div key={api.name} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 0',borderBottom:i<APIS.length-1?`1px solid ${C.border}`:'none'}}>
                  <div style={{display:'flex',alignItems:'center',gap:16}}>
                    <div style={{width:8,height:8,borderRadius:'50%',flexShrink:0,background:[C.text,'#6366f1','#8b5cf6','#06b6d4',C.text,'#6366f1','#8b5cf6','#06b6d4'][i%8]}}/>
                    <div>
                      <div style={{fontSize:'0.95rem',fontWeight:500,color:C.text}}>{api.name}</div>
                      <div style={{fontSize:'0.8rem',color:C.textM,marginTop:2, fontWeight:300}}>{api.desc}</div>
                    </div>
                  </div>
                  <span style={{display:'inline-flex',alignItems:'center',gap:8,padding:'4px 12px',borderRadius:8,fontSize:'0.75rem',fontWeight:600,background:api.ok?C.greenL:C.redL,color:api.ok?C.green:C.red,flexShrink:0, border:`1px solid ${C.border}`}}>
                    <div style={{width:6,height:6,borderRadius:'50%',background:api.ok?C.green:C.red}}/>
                    {api.ok?'Operational':'Offline'}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {/* ── Danger Zone ── */}
          <div className="fade-up" style={{animationDelay: '0.3s', background:C.surface,border:`1px solid ${C.red}30`,borderRadius:24,padding:'32px',boxShadow:'0 10px 30px rgba(239,68,68,0.05)',position:'relative',overflow:'hidden'}}>
            <h2 style={{fontSize:'1.25rem',fontWeight:500,color:C.red,margin:'0 0 6px', letterSpacing:'-0.02em'}}>Danger Zone</h2>
            <p style={{fontSize:'0.85rem',color:C.textM,margin:'0 0 24px', fontWeight:300}}>Destructive actions are irreversible. Proceed with absolute certainty.</p>
            <button
              style={{height:44,padding:'0 24px',background:'transparent',color:C.red,border:`1px solid ${C.red}40`,borderRadius:12,fontSize:'0.85rem',fontWeight:600,fontFamily:'inherit',cursor:'pointer',transition:'all 0.2s'}}
              onMouseEnter={e=>{e.currentTarget.style.background=`${C.red}10`;}}
              onMouseLeave={e=>{e.currentTarget.style.background='transparent';}}>
              Purge All Application Records
            </button>
          </div>

        </main>
      </div>

      {toast&&<div className="fade-in" style={{position:'fixed',bottom:32,right:32,zIndex:9999,padding:'16px 24px',borderRadius:12,background:toast.type==='error'?C.red:'#FFFFFF',color:toast.type==='error'?'#fff':'#000',fontSize:'0.9rem',fontWeight:600,boxShadow:'0 10px 30px rgba(0,0,0,0.3)',display:'flex',alignItems:'center',gap:12}}>
        <div style={{width:6,height:6,borderRadius:'50%',background:toast.type==='error'?'#fff':'#000'}}/>
        {toast.msg}
      </div>}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .fade-in { animation: fadeUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .fade-up { animation: fadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .btn-solid:hover:not(:disabled) { transform: scale(0.98); background: ${dark ? '#E5E5E5' : '#333333'} !important; }
        .btn-ghost:hover:not(:disabled) { background: ${C.surfaceL} !important; border-color: ${C.textM} !important; }
        ::-webkit-scrollbar { display: none; }

        /* ── MOBILE RESPONSIVE ── */

        /* Tablet: 768px and below */
        @media (max-width: 768px) {
          /* Hide the 3D network background on mobile (performance + visual clarity) */
          .network-3d-bg { display: none !important; }

          /* Main content: remove sidebar offset, take full width */
          .main-content {
            margin-left: 0 !important;
            width: 100% !important;
          }

          /* Header: reduce horizontal padding */
          .dash-header {
            padding: 0 20px !important;
            height: 64px !important;
          }

          /* Main content area: reduce padding */
          .main-content > main {
            padding: 24px 16px !important;
            max-width: 100% !important;
          }

          /* Cards: reduce padding for small screens */
          .bento {
            padding: 20px !important;
            border-radius: 16px !important;
          }

          /* Profile grid: stack to single column on mobile */
          .bento > div[style*="grid-template-columns: 1fr 1fr"] {
            grid-template-columns: 1fr !important;
          }

          /* Name edit row: stack vertically */
          .bento form[style*="flex-end"] {
            flex-direction: column !important;
            align-items: stretch !important;
          }
          .bento form[style*="flex-end"] button {
            margin-bottom: 0 !important;
          }

          /* Modify Identity button row: stack on small screens */
          .bento > div[style*="align-items: center"][style*="gap: 16"] {
            flex-direction: column !important;
            align-items: stretch !important;
          }

          /* Toast: full-width bottom bar on mobile */
          .fade-in[style*="bottom: 32px"] {
            bottom: 16px !important;
            right: 16px !important;
            left: 16px !important;
          }
        }

        /* Small phones: 480px and below */
        @media (max-width: 480px) {
          .dash-header {
            padding: 0 16px !important;
          }

          .main-content > main {
            padding: 16px 12px !important;
          }

          .bento {
            padding: 16px !important;
            border-radius: 14px !important;
          }

          /* Gmail action buttons: stack vertically */
          div[style*="display:'flex'"][style*="gap:12"][style*="flexWrap:'wrap'"] {
            flex-direction: column !important;
          }

          /* Document vault rows: stack icon+label above button */
          .bento div[style*="justify-content: space-between"][style*="flexWrap: wrap"] {
            flex-direction: column !important;
            align-items: flex-start !important;
          }

          /* Danger zone: reduce padding */
          div[style*="border-radius:24px"][style*="padding:'32px'"] {
            padding: 20px !important;
            border-radius: 14px !important;
          }
        }

        /* Landscape phones */
        @media (max-width: 896px) and (orientation: landscape) {
          .network-3d-bg { display: none !important; }
          .main-content { margin-left: 0 !important; }
          .main-content > main { padding: 20px 24px !important; }
        }
      `}</style>
    </div>
  );
}