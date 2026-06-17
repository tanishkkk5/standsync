// StandSync v3 - fixed build
import React, { useState, useEffect, useCallback, useMemo, useRef, createContext, useContext } from 'react';
import * as SB from './lib/supabase';
import * as Email from './lib/email';
import { askAI } from './lib/ai';
import { getPriority, getStatus, PRIORITIES, STATUSES, TODAY, FAQ, CHAT_THEMES, MEMBER_COLORS } from './lib/constants';
// ─── THEME ────────────────────────────────────────────────────────────────────
const ThemeCtx = createContext({ dark:true, toggle:()=>{} });
const useTheme = () => useContext(ThemeCtx);
function useC() {
  const { dark } = useTheme();
  return dark ? {
    bg:'#0B1020', surf:'#111827', surfH:'#161E2E',
    bord:'rgba(255,255,255,.08)', bordH:'rgba(129,140,248,.35)',
    text:'#F1F4F9', sub:'rgba(241,244,249,.64)', mut:'rgba(241,244,249,.42)',
    nav:'rgba(11,16,32,.88)', inp:'rgba(255,255,255,.04)', inpB:'rgba(129,140,248,.22)',
    sel:'#111827', row:'rgba(255,255,255,.02)',
    accent:'#818CF8', glow:'rgba(99,102,241,.18)', dark:true,
  } : {
    bg:'#ECEEFF', surf:'rgba(255,255,255,.72)', surfH:'rgba(255,255,255,.95)',
    bord:'rgba(99,102,241,.11)', bordH:'rgba(99,102,241,.32)',
    text:'#16145A', sub:'#3730A3', mut:'#7879A8',
    nav:'rgba(236,238,255,.78)', inp:'rgba(255,255,255,.88)', inpB:'rgba(99,102,241,.2)',
    sel:'rgba(255,255,255,.97)', row:'rgba(99,102,241,.025)',
    accent:'#6366F1', glow:'rgba(99,102,241,.1)', dark:false,
  };
}

const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
@keyframes orb{from{transform:translate(0,0) scale(1) rotate(0deg)}to{transform:translate(20px,24px) scale(1.1) rotate(5deg)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes pulse{0%,100%{transform:scale(1);opacity:.35}50%{transform:scale(1.7);opacity:.65}}
@keyframes slideIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
@keyframes slideDown{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}
@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
@keyframes popIn{0%{opacity:0;transform:scale(.92) translateY(8px)}100%{opacity:1;transform:scale(1) translateY(0)}}
.ss-tip{position:relative;display:inline-flex}
.ss-tip{position:relative!important}
.ss-tip::after{content:attr(data-tip);position:absolute;top:calc(100% + 8px);left:50%;transform:translateX(-50%) scale(.88);transform-origin:top center;background:rgba(12,10,35,.97);color:#F0ECFF;font-size:11px;font-weight:600;padding:5px 11px;border-radius:8px;white-space:nowrap;pointer-events:none;opacity:0;transition:opacity .15s,transform .15s;border:1px solid rgba(124,110,245,.3);box-shadow:0 4px 16px rgba(0,0,0,.5);letter-spacing:-.01em;z-index:99999}
.ss-tip:hover::after{opacity:1;transform:translateX(-50%) scale(1)}
@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
input,select,textarea,button{font-family:inherit}
::-webkit-scrollbar{width:4px;height:4px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:rgba(124,110,245,.25);border-radius:10px}
::-webkit-scrollbar-thumb:hover{background:rgba(124,110,245,.45)}
::selection{background:rgba(124,110,245,.3);color:inherit}
.ss-sidebar-desktop{display:block}
@media(max-width:900px){
  .ss-sidebar-desktop{display:none}
  .ss-burger{display:flex!important}
  .ss-create-label{display:none}
}
`;

// ─── PRIMITIVES ───────────────────────────────────────────────────────────────
function Logo({ size=32, onClick }) {
  const { dark } = useTheme();
  return (
    <div onClick={onClick} style={{ display:'flex',alignItems:'center',gap:9,cursor:onClick?'pointer':'default',flexShrink:0 }}>
      <div style={{ width:size,height:size,borderRadius:size*.28,background:'linear-gradient(135deg,#6366F1,#818CF8)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 0 18px rgba(99,102,241,.4)',flexShrink:0 }}>
        <svg width={size*.55} height={size*.55} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
      </div>
      <span style={{ fontSize:size*.56,fontWeight:800,color:dark?'#fff':'#1E1B4B',letterSpacing:'-.025em',lineHeight:1 }}>StandSync</span>
    </div>
  );
}
function Av({ member, size=36, url }) {
  const color=member?.color||'#818CF8';
  const ini=member?.name?member.name.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase():'?';
  if(url) return <img src={url} alt={ini} style={{ width:size,height:size,borderRadius:'50%',objectFit:'cover',flexShrink:0,border:`2px solid ${color}55` }}/>;
  return <div style={{ width:size,height:size,borderRadius:'50%',background:color+'22',border:`2px solid ${color}55`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:size*.32,fontWeight:700,color,flexShrink:0 }}>{ini}</div>;
}
function PBadge({ priority }) { const p=getPriority(priority); return <span style={{ fontSize:10,fontWeight:700,letterSpacing:'.06em',background:p.bg,color:p.color,padding:'3px 8px',borderRadius:20,textTransform:'uppercase',border:`1px solid ${p.color}35`,whiteSpace:'nowrap' }}>{p.label}</span>; }
function SBadge({ status }) { const s=getStatus(status); return <span style={{ fontSize:10,fontWeight:700,letterSpacing:'.06em',background:s.bg,color:s.color,padding:'3px 8px',borderRadius:20,textTransform:'uppercase',border:`1px solid ${s.color}35`,whiteSpace:'nowrap' }}>{s.label}</span>; }
function Card({ children, style={}, onClick }) {
  const c=useC(); const { dark }=useTheme(); const [h,setH]=useState(false);
  return(
    <div onClick={onClick} onMouseEnter={()=>onClick&&setH(true)} onMouseLeave={()=>setH(false)} style={{
      background:dark?(h&&onClick?'rgba(255,255,255,.07)':'rgba(255,255,255,.048)'):(h&&onClick?'rgba(255,255,255,.92)':'rgba(255,255,255,.72)'),
      border:`1px solid ${h&&onClick?c.bordH:c.bord}`,borderRadius:16,
      backdropFilter:'blur(28px)',WebkitBackdropFilter:'blur(28px)',
      boxShadow:dark?'0 2px 20px rgba(0,0,0,.28),inset 0 1px 0 rgba(255,255,255,.04)':'0 2px 20px rgba(99,102,241,.06),inset 0 1px 0 rgba(255,255,255,.9)',
      transition:'all .18s',cursor:onClick?'pointer':undefined,...style
    }}>{children}</div>
  );
}
function Bar({ pct, color='#818CF8', h=6, style={} }) { return <div style={{ height:h,background:'rgba(128,128,128,.15)',borderRadius:h,overflow:'hidden',...style }}><div style={{ height:'100%',width:`${Math.min(100,Math.max(0,pct))}%`,background:color,borderRadius:h,transition:'width .6s ease' }}/></div>; }
function Inp({ label, error, style={}, ...p }) {
  const c=useC(); const [f,setF]=useState(false);
  return <div style={{ width:'100%' }}>{label&&<div style={{ fontSize:11,fontWeight:600,color:c.mut,textTransform:'uppercase',letterSpacing:'.08em',marginBottom:6 }}>{label}</div>}<input {...p} style={{ width:'100%',background:c.inp,border:`1.5px solid ${f?'#6366F1':error?'#EF4444':c.inpB}`,borderRadius:10,padding:'10px 14px',color:c.text,fontSize:14,outline:'none',boxSizing:'border-box',transition:'border-color .2s',...style }} onFocus={e=>{setF(true);p.onFocus&&p.onFocus(e);}} onBlur={e=>{setF(false);p.onBlur&&p.onBlur(e);}}/>{error&&<div style={{ fontSize:11,color:'#F87171',marginTop:4 }}>{error}</div>}</div>;
}
function Textarea({ label, style={}, ...p }) {
  const c=useC(); const [f,setF]=useState(false);
  return <div style={{ width:'100%' }}>{label&&<div style={{ fontSize:11,fontWeight:600,color:c.mut,textTransform:'uppercase',letterSpacing:'.08em',marginBottom:6 }}>{label}</div>}<textarea {...p} style={{ width:'100%',background:c.inp,border:`1.5px solid ${f?'#6366F1':c.inpB}`,borderRadius:10,padding:'10px 14px',color:c.text,fontSize:14,outline:'none',boxSizing:'border-box',resize:'vertical',fontFamily:'inherit',lineHeight:1.55,transition:'border-color .2s',...style }} onFocus={e=>{setF(true);p.onFocus&&p.onFocus(e);}} onBlur={e=>{setF(false);p.onBlur&&p.onBlur(e);}}/></div>;
}
function Sel({ label, children, style={}, ...p }) {
  const c=useC();
  return <div style={{ width:'100%' }}>{label&&<div style={{ fontSize:11,fontWeight:600,color:c.mut,textTransform:'uppercase',letterSpacing:'.08em',marginBottom:6 }}>{label}</div>}<select {...p} style={{ width:'100%',background:c.sel,border:`1.5px solid ${c.inpB}`,borderRadius:10,padding:'10px 12px',color:c.text,fontSize:13,outline:'none',boxSizing:'border-box',cursor:'pointer',...style }}>{children}</select></div>;
}
function Btn({ children, v='primary', style={}, disabled, loading, ...p }) {
  const { dark }=useTheme();
  const vs={
    primary:{background:'linear-gradient(135deg,#6B5FE4 0%,#9B8AFB 100%)',color:'#fff',border:'none',boxShadow:'0 3px 14px rgba(107,95,228,.38)'},
    ghost:{background:dark?'rgba(255,255,255,.06)':'rgba(99,102,241,.07)',color:dark?'rgba(240,236,255,.7)':'#4338CA',border:dark?'1px solid rgba(255,255,255,.1)':'1px solid rgba(99,102,241,.16)'},
    danger:{background:'rgba(239,68,68,.1)',color:'#F87171',border:'1px solid rgba(239,68,68,.2)'},
    warn:{background:'rgba(245,158,11,.1)',color:'#FCD34D',border:'1px solid rgba(245,158,11,.2)'},
    success:{background:'linear-gradient(135deg,#059669,#34D399)',color:'#fff',border:'none',boxShadow:'0 3px 12px rgba(52,211,153,.28)'},
    google:{background:'#fff',color:'#3C4043',border:'1px solid #dadce0',boxShadow:'0 1px 5px rgba(0,0,0,.1)'},
    gcal:{background:'linear-gradient(135deg,#4285F4,#34A853)',color:'#fff',border:'none'},
  };
  return <button {...p} disabled={disabled||loading} style={{ display:'inline-flex',alignItems:'center',justifyContent:'center',gap:6,padding:'10px 20px',borderRadius:10,fontSize:13,fontWeight:600,cursor:(disabled||loading)?'not-allowed':'pointer',transition:'all .15s',opacity:(disabled||loading)?.5:1,...vs[v]||vs.primary,...style }}>{loading?<div style={{ width:16,height:16,borderRadius:'50%',border:'2px solid rgba(0,0,0,.15)',borderTop:'2px solid currentColor',animation:'spin .75s linear infinite' }}/>:children}</button>;
}
function Spin({ size=28, color='#818CF8' }) { return <div style={{ width:size,height:size,borderRadius:'50%',border:`2.5px solid rgba(128,128,128,.15)`,borderTop:`2.5px solid ${color}`,animation:'spin .75s linear infinite',flexShrink:0 }}/>; }
function LiveDot() { return <span style={{ position:'relative',display:'inline-block',width:8,height:8,flexShrink:0 }}><span style={{ position:'absolute',inset:0,borderRadius:'50%',background:'#34D399',opacity:.4,animation:'pulse 2s ease infinite' }}/><span style={{ position:'absolute',inset:1,borderRadius:'50%',background:'#34D399' }}/></span>; }
function ToastEl({ msg, type, onClose }) {
  const ok=type!=='error';
  useEffect(()=>{ const t=setTimeout(onClose,4000); return()=>clearTimeout(t); },[onClose]);
  return <div style={{ position:'fixed',bottom:24,left:'50%',transform:'translateX(-50%)',background:ok?'rgba(52,211,153,.15)':'rgba(239,68,68,.15)',border:`1px solid ${ok?'rgba(52,211,153,.4)':'rgba(239,68,68,.4)'}`,borderRadius:12,padding:'11px 24px',zIndex:9999,fontSize:13,color:ok?'#34D399':'#F87171',backdropFilter:'blur(16px)',fontWeight:600,animation:'slideIn .25s ease',whiteSpace:'nowrap',display:'flex',alignItems:'center',gap:10 }}>{msg}<button onClick={onClose} style={{ background:'none',border:'none',color:'inherit',cursor:'pointer',opacity:.6,fontSize:16,padding:0,lineHeight:1 }}>×</button></div>;
}
function Modal({ children, onClose, title, width=500 }) {
  const c=useC();
  return <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.65)',backdropFilter:'blur(6px)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20 }} onClick={e=>e.target===e.currentTarget&&onClose()}><Card style={{ width:'100%',maxWidth:width,padding:28,animation:'fadeUp .22s ease',maxHeight:'90vh',overflowY:'auto' }}>{title&&<h3 style={{ margin:'0 0 20px',color:c.text,fontSize:16,fontWeight:700 }}>{title}</h3>}{children}</Card></div>;
}
function StatCard({ label, value, color='#818CF8', sub, icon }) {
  const c=useC();
  return <Card style={{ padding:'16px 20px' }}><div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start' }}><div><div style={{ fontSize:10,color:c.mut,textTransform:'uppercase',letterSpacing:'.08em',marginBottom:6 }}>{label}</div><div style={{ fontSize:28,fontWeight:800,color,letterSpacing:'-.02em',lineHeight:1 }}>{value}</div>{sub&&<div style={{ fontSize:11,color:c.mut,marginTop:4 }}>{sub}</div>}</div>{icon&&<span style={{ fontSize:22,opacity:.45 }}>{icon}</span>}</div></Card>;
}
function Lbl({ children, style={} }) { const c=useC(); return <div style={{ fontSize:10,fontWeight:700,letterSpacing:'.1em',color:c.mut,textTransform:'uppercase',marginBottom:8,...style }}>{children}</div>; }
function BgEl() {
  const { dark }=useTheme();
  // Premium SaaS: solid base, no glowing orbs, no gaming aesthetics.
  // Dark = #0B1020 deep navy. Light = clean off-white. One barely-there top accent only.
  const base = dark ? '#0B1020' : '#F7F8FC';
  return(
    <div style={{ position:'fixed',inset:0,zIndex:0,overflow:'hidden',pointerEvents:'none' }}>
      <div style={{ position:'absolute',inset:0,background:base }}/>
      {/* one extremely subtle top vignette for depth — no blobs, no color fog */}
      {dark && <div style={{ position:'absolute',inset:0,background:'linear-gradient(180deg,rgba(99,102,241,.04) 0%,transparent 22%)' }}/>}
    </div>
  );
}
function ThemeToggle() {
  const { dark, toggle }=useTheme();
  return <button onClick={toggle} style={{ width:34,height:34,borderRadius:'50%',border:'1px solid rgba(128,128,128,.2)',background:'transparent',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:15,transition:'all .2s',flexShrink:0 }} title={dark?'Light mode':'Dark mode'}>{dark?'☀️':'🌙'}</button>;
}

// ─── PROFILE DROPDOWN ─────────────────────────────────────────────────────────
function ProfileMenu({ session, onSettings, onLogout }) {
  const c=useC(); const [open,setOpen]=useState(false); const ref=useRef();
  const name=session?.user?.user_metadata?.name||session?.user?.email?.split('@')[0]||'You';
  const email=session?.user?.email||''; const color='#818CF8';
  const ini=name.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();
  const avatarUrl=session?.user?.user_metadata?.avatar_url;
  useEffect(()=>{ const h=e=>{ if(ref.current&&!ref.current.contains(e.target))setOpen(false); }; document.addEventListener('mousedown',h); return()=>document.removeEventListener('mousedown',h); },[]);
  return (
    <div ref={ref} style={{ position:'relative' }}>
      <button onClick={()=>setOpen(!open)} style={{ width:34,height:34,borderRadius:'50%',background:avatarUrl?'transparent':color+'22',border:`2px solid ${color}55`,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0,overflow:'hidden',padding:0 }}>
        {avatarUrl?<img src={avatarUrl} alt={ini} style={{ width:'100%',height:'100%',objectFit:'cover' }}/>:<span style={{ fontSize:12,fontWeight:700,color }}>{ini}</span>}
      </button>
      {open&&(
        <div style={{ position:'absolute',right:0,top:42,width:230,background:c.dark?'rgba(18,15,50,.98)':'#fff',border:`1px solid ${c.bord}`,borderRadius:14,padding:8,zIndex:500,backdropFilter:'blur(20px)',animation:'slideDown .2s ease',boxShadow:'0 8px 32px rgba(0,0,0,.3)' }}>
          <div style={{ padding:'10px 12px',borderBottom:`1px solid ${c.bord}`,marginBottom:4 }}>
            <div style={{ fontSize:13,fontWeight:700,color:c.text }}>{name}</div>
            <div style={{ fontSize:11,color:c.mut,marginTop:2 }}>{email}</div>
          </div>
          {[{i:'⚙️',l:'Settings'},{i:'🎨',l:'Appearance'},{i:'❓',l:'FAQ & Help'}].map(item=>(
            <button key={item.l} onClick={()=>{onSettings();setOpen(false);}} style={{ width:'100%',display:'flex',alignItems:'center',gap:10,padding:'9px 12px',borderRadius:8,border:'none',background:'transparent',color:c.text,cursor:'pointer',fontSize:13,textAlign:'left',transition:'background .15s' }} onMouseEnter={e=>e.currentTarget.style.background=c.surfH} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
              <span>{item.i}</span>{item.l}
            </button>
          ))}
          <div style={{ borderTop:`1px solid ${c.bord}`,marginTop:4,paddingTop:4 }}>
            <button onClick={()=>{onLogout();setOpen(false);}} style={{ width:'100%',display:'flex',alignItems:'center',gap:10,padding:'9px 12px',borderRadius:8,border:'none',background:'transparent',color:'#F87171',cursor:'pointer',fontSize:13,textAlign:'left',transition:'background .15s' }} onMouseEnter={e=>e.currentTarget.style.background='rgba(239,68,68,.08)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
              <span>🚪</span>Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── AUTH PAGE ────────────────────────────────────────────────────────────────
function AuthPage({ onLogin, inviteToken }) {
  const c=useC(); const [mode,setMode]=useState(inviteToken?'signup':'login');
  const [email,setEmail]=useState(''); const [password,setPassword]=useState(''); const [name,setName]=useState('');
  const [loading,setLoading]=useState(false); const [gLoading,setGLoading]=useState(false);
  const [error,setError]=useState(''); const [info,setInfo]=useState(''); const [gError,setGError]=useState('');

  const submit=async()=>{
    setError('');setInfo('');setLoading(true);
    if(mode==='login'){
      const {data,error:e}=await SB.signIn(email,password);
      if(e)setError(e.message); else onLogin(data.session);
    } else if(mode==='signup'){
      if(!name.trim()){setError('Name is required');setLoading(false);return;}
      const {data,error:e}=await SB.signUp(email,password,{name,invite_token:inviteToken});
      if(e)setError(e.message); else if(data.session)onLogin(data.session); else setInfo('Check your email to confirm, then sign in.');
    } else {
      const {error:e}=await SB.resetPassword(email);
      if(e)setError(e.message); else setInfo('Reset link sent! Check your email.');
    }
    setLoading(false);
  };

  const signInWithGoogle=async()=>{
    if(!SB.IS_LIVE){setGError('Supabase not connected. Add environment variables to Vercel first.');return;}
    if(!process.env.REACT_APP_GOOGLE_CLIENT_ID){setGError('Google Sign-In not configured. Add REACT_APP_GOOGLE_CLIENT_ID to Vercel, then enable Google provider in Supabase Auth settings.');return;}
    setGLoading(true);
    const {error:e}=await SB.signInWithGoogle();
    if(e){setGError(e.message);setGLoading(false);}
    // On success: Supabase redirects to window.location.origin
  };

  return (
    <div style={{ minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:24,position:'relative',zIndex:1,animation:'fadeIn .4s ease' }}>
      <div style={{ marginBottom:40 }}><Logo size={40}/></div>
      <Card style={{ width:'100%',maxWidth:420,padding:32 }}>
        <h2 style={{ color:c.text,fontSize:22,fontWeight:700,marginBottom:6,letterSpacing:'-.02em' }}>
          {mode==='login'?'Welcome back':mode==='signup'?'Create account':'Reset password'}
        </h2>
        <p style={{ color:c.mut,fontSize:14,marginBottom:24 }}>
          {mode==='login'?'Sign in to StandSync':mode==='signup'?'Join and track your standups':'We will send a reset link'}
        </p>
        {inviteToken&&mode==='signup'&&<div style={{ background:'rgba(99,102,241,.12)',border:'1px solid rgba(99,102,241,.3)',borderRadius:10,padding:'10px 14px',marginBottom:18,fontSize:13,color:'#818CF8' }}>🎉 You were invited! Create an account to join.</div>}
        {info&&<div style={{ background:'rgba(52,211,153,.1)',border:'1px solid rgba(52,211,153,.3)',borderRadius:8,padding:'10px 14px',fontSize:13,color:'#34D399',marginBottom:14 }}>✅ {info}</div>}
        {gError&&<div style={{ background:'rgba(239,68,68,.1)',border:'1px solid rgba(239,68,68,.25)',borderRadius:8,padding:'10px 14px',fontSize:13,color:'#F87171',marginBottom:14 }}>{gError}</div>}
        {error&&!gError&&<div style={{ background:'rgba(239,68,68,.1)',border:'1px solid rgba(239,68,68,.25)',borderRadius:8,padding:'10px 14px',fontSize:13,color:'#F87171',marginBottom:14 }}>{error}</div>}

        {/* Google Sign-In */}
        {mode!=='forgot'&&(
          <>
            <Btn v="google" onClick={signInWithGoogle} loading={gLoading} style={{ width:'100%',justifyContent:'center',padding:'11px',fontSize:14,marginBottom:16,fontWeight:600 }}>
              <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              Continue with Google
            </Btn>

            <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:16 }}><div style={{ flex:1,height:1,background:c.bord }}/><span style={{ fontSize:12,color:c.mut }}>or</span><div style={{ flex:1,height:1,background:c.bord }}/></div>
          </>
        )}

        {mode==='signup'&&<div style={{ marginBottom:14 }}><Inp label="Your name" value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Alex Johnson"/></div>}
        <div style={{ marginBottom:14 }}><Inp label="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@company.com" onKeyDown={e=>e.key==='Enter'&&submit()} autoComplete="email"/></div>
        {mode!=='forgot'&&<div style={{ marginBottom:20 }}><Inp label="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder={mode==='signup'?'Min 6 characters':'Your password'} onKeyDown={e=>e.key==='Enter'&&submit()} autoComplete={mode==='signup'?'new-password':'current-password'}/></div>}
        <Btn onClick={submit} loading={loading} style={{ width:'100%',justifyContent:'center',padding:'12px',fontSize:15 }}>
          {mode==='login'?'Sign in':mode==='signup'?'Create account':'Send reset link'}
        </Btn>
        <div style={{ marginTop:18,textAlign:'center',fontSize:13,color:c.mut }}>
          {mode==='login'?<><button onClick={()=>{setMode('forgot');setGError('');setError('');}} style={{ background:'none',border:'none',color:'#818CF8',cursor:'pointer',fontSize:13,textDecoration:'underline' }}>Forgot password?</button><span style={{ margin:'0 8px' }}>·</span><button onClick={()=>{setMode('signup');setGError('');setError('');}} style={{ background:'none',border:'none',color:'#818CF8',cursor:'pointer',fontSize:13 }}>Create account</button></>
          :mode==='signup'?<><span>Already have an account? </span><button onClick={()=>{setMode('login');setGError('');setError('');}} style={{ background:'none',border:'none',color:'#818CF8',cursor:'pointer',fontSize:13 }}>Sign in</button></>
          :<button onClick={()=>{setMode('login');setGError('');setError('');}} style={{ background:'none',border:'none',color:'#818CF8',cursor:'pointer',fontSize:13 }}>Back to login</button>}
        </div>
      </Card>
    </div>
  );
}

// ─── HOME — multiple teams/projects ───────────────────────────────────────────
function HomeView({ session, onSelectTeam, onLogout, onSettings }) {
  const c=useC();
  const [teams,setTeams]=useState([]); const [loading,setLoading]=useState(true);
  const [view,setView]=useState('list'); // list | create | join
  const [step,setStep]=useState(1);
  const [teamName,setTeamName]=useState(''); const [standupName,setStandupName]=useState('');
  const [memberEmails,setMemberEmails]=useState(['']); const [creating,setCreating]=useState(false);
  const [createdTeam,setCreatedTeam]=useState(null); const [deletingId,setDeletingId]=useState(null);
  const [calEvents,setCalEvents]=useState(()=>{ try{ return JSON.parse(sessionStorage.getItem('ss-cal-events')||'[]'); }catch{ return []; } });
  const [selectedCalEvent,setSelectedCalEvent]=useState(null);
  // Load today's calendar events if gapi is connected
  useEffect(()=>{
    const saved=sessionStorage.getItem('ss-cal-events');
    if(saved)try{ setCalEvents(JSON.parse(saved)); }catch{}
    // Try to get from gapi if connected
    if(window.gapi?.client?.calendar&&localStorage.getItem('ss-cal-status')==='connected'){
      const now=new Date();
      const start=new Date(now.getFullYear(),now.getMonth(),1).toISOString();
      const end=new Date(now.getFullYear(),now.getMonth()+2,0).toISOString();
      window.gapi.client.calendar.events.list({calendarId:'primary',timeMin:start,timeMax:end,singleEvents:true,maxResults:200,orderBy:'startTime'})
        .then(r=>{ const items=r.result.items||[]; setCalEvents(items); try{sessionStorage.setItem('ss-cal-events',JSON.stringify(items));}catch{}; })
        .catch(()=>{});
    }
  },[]);
  const [roomId,setRoomId]=useState(''); const [roomPass,setRoomPass]=useState('');
  const [joinLoading,setJoinLoading]=useState(false); const [joinError,setJoinError]=useState('');
  const name=session?.user?.user_metadata?.name||session?.user?.email?.split('@')[0]||'there';
  const ICONS=['⚡','🚀','🎯','🔥','💡','🌟','🏗️','🎨','🔬','📱'];

  useEffect(()=>{
    if(!SB.IS_LIVE){setLoading(false);return;}
    setLoading(true);
    SB.getMyTeams(session.user.id).then(d=>{
      setTeams(d);
      setLoading(false);
      // If empty, retry once after 1.5s in case of schema cache delay
      if(!d||d.length===0){
        setTimeout(()=>{
          SB.getMyTeams(session.user.id).then(d2=>{
            if(d2&&d2.length>0) setTeams(d2);
          });
        },1500);
      }
    });
  },[session]);

  const [createError,setCreateError]=useState('');
  const deleteTeam=async(teamId)=>{
    if(!teamId)return;
    setDeletingId(teamId);
    if(SB.IS_LIVE) await SB.deleteTeam(teamId);
    setTeams(p=>p.filter(t=>t.teams?.id!==teamId));
    setDeletingId(null);
  };
  const create=async()=>{
    if(!teamName.trim())return;
    setCreating(true);setCreateError('');
    const myName=session?.user?.user_metadata?.name||session?.user?.email;
    if(SB.IS_LIVE){
      try{
        const team=await SB.createTeam(teamName.trim(),session.user.id,session.user.email,myName,standupName.trim());
        if(team&&!team.__error){
          const ownEmail=session?.user?.email?.toLowerCase();
          const validEmails=memberEmails.filter(e=>e.trim()&&e.includes('@')&&e.trim().toLowerCase()!==ownEmail);
          for(const em of validEmails){
            try{
              const {link}=await SB.inviteMember(team.id,teamName,em,myName);
              await Promise.race([Email.sendInvite(em,myName,teamName,link),new Promise(r=>setTimeout(r,4000))]);
            }catch(e){console.log('invite failed for',em);}
          }
          setCreatedTeam(team);
        } else {
          const msg=team?.__error||'Unknown error';
          setCreateError('DB error: '+msg+'. Open browser console (F12) for full details.');
        }
      }catch(err){
        setCreateError('Error: '+err.message);
        console.error('createTeam error:',err);
      }
    } else {
      setCreatedTeam({id:'demo',name:teamName,standup_name:standupName||teamName,default_room_id:'DEMO01',default_room_password:'MXR-4KP'});
    }
    setCreating(false);
  };

  const joinTeam=async()=>{
    if(!roomId.trim()||!roomPass.trim()){setJoinError('Enter both Room ID and password');return;}
    setJoinLoading(true);setJoinError('');
    if(SB.IS_LIVE){
      const myName=session?.user?.user_metadata?.name||session?.user?.email;
      const result=await SB.joinTeamByCode(roomId,roomPass,session.user.id,session.user.email,myName);
      if(result.error){setJoinError(result.error);setJoinLoading(false);return;}
      onSelectTeam(result.team,'member');
    } else {
      setJoinError('Demo mode — connect Supabase to use Room ID join');
    }
    setJoinLoading(false);
  };

  const goToTeam=(team,role)=>{
    const normalized = team && team.id ? team : (team && team.teams ? team.teams : null);
    if(normalized&&normalized.id) onSelectTeam(normalized,role);
  };

  // ── Team list ──────────────────────────────────────────────────────────────
  if(view==='list') return(
    <div style={{ minHeight:'100vh',position:'relative',zIndex:1,animation:'fadeIn .3s ease' }}>
      {/* Nav */}
      <div style={{ borderBottom:`1px solid ${c.bord}`,background:c.nav,backdropFilter:'blur(32px)',WebkitBackdropFilter:'blur(32px)',boxShadow:'0 1px 0 rgba(255,255,255,.06)',position:'sticky',top:0,zIndex:100,overflow:'visible' }}>
        <div style={{ maxWidth:960,margin:'0 auto',padding:'0 24px',height:58,display:'flex',alignItems:'center',gap:12 }}>
          <Logo size={28}/><div style={{ flex:1 }}/><ThemeToggle/><ProfileMenu session={session} onSettings={onSettings} onLogout={onLogout}/>
        </div>
      </div>

      <div style={{ maxWidth:960,margin:'0 auto',padding:'36px 24px' }}>
        <h1 style={{ fontSize:26,fontWeight:800,color:c.text,marginBottom:4 }}>Good morning, {name} 👋</h1>
        <p style={{ color:c.mut,fontSize:14,marginBottom:32 }}>What would you like to do today?</p>

        {/* ── TWO-PATH CHOOSER ── */}
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:36 }}>
          {/* Path 1: Join Standup */}
          <div onClick={()=>setView('standup-entry')} style={{ padding:'28px 24px',borderRadius:16,border:`2px solid ${c.bord}`,background:c.surf,cursor:'pointer',transition:'all .2s',position:'relative',overflow:'hidden' }}
            onMouseEnter={e=>{e.currentTarget.style.borderColor='#6366F1';e.currentTarget.style.background=c.dark?'rgba(99,102,241,.08)':'rgba(99,102,241,.05)';}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=c.bord;e.currentTarget.style.background=c.surf;}}>
            <div style={{ fontSize:40,marginBottom:14 }}>⚡</div>
            <div style={{ fontSize:18,fontWeight:800,color:c.text,marginBottom:6 }}>Join Standup</div>
            <div style={{ fontSize:13,color:c.mut,lineHeight:1.6 }}>Pick today's meeting from your calendar and write tasks in real time — even in PiP mode during Google Meet.</div>
            <div style={{ marginTop:16,display:'flex',gap:6,flexWrap:'wrap' }}>
              {['📅 From calendar','✅ Write tasks','🖥️ PiP mode'].map(t=><span key={t} style={{ fontSize:11,background:'rgba(99,102,241,.1)',color:'#818CF8',padding:'3px 9px',borderRadius:20 }}>{t}</span>)}
            </div>
          </div>

          {/* Path 2: Team / Projects */}
          <div onClick={()=>setView('team-entry')} style={{ padding:'28px 24px',borderRadius:16,border:`2px solid ${c.bord}`,background:c.surf,cursor:'pointer',transition:'all .2s',position:'relative',overflow:'hidden' }}
            onMouseEnter={e=>{e.currentTarget.style.borderColor='#34D399';e.currentTarget.style.background=c.dark?'rgba(52,211,153,.06)':'rgba(52,211,153,.04)';}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=c.bord;e.currentTarget.style.background=c.surf;}}>
            <div style={{ fontSize:40,marginBottom:14 }}>👥</div>
            <div style={{ fontSize:18,fontWeight:800,color:c.text,marginBottom:6 }}>Team & Projects</div>
            <div style={{ fontSize:13,color:c.mut,lineHeight:1.6 }}>View your teams, manage tasks, check performance, and collaborate in chat — full team dashboard.</div>
            <div style={{ marginTop:16,display:'flex',gap:6,flexWrap:'wrap' }}>
              {['💬 Chat','📊 Performance','🗂️ History'].map(t=><span key={t} style={{ fontSize:11,background:'rgba(52,211,153,.1)',color:'#34D399',padding:'3px 9px',borderRadius:20 }}>{t}</span>)}
            </div>
          </div>
        </div>

        {/* Quick-access: your teams */}
        {teams.length>0&&(
          <div>
            <div style={{ fontSize:13,fontWeight:700,color:c.mut,textTransform:'uppercase',letterSpacing:'.08em',marginBottom:12 }}>Your teams</div>
            <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:10 }}>
              {teams.map((tm,i)=>{
                const teamData = tm.teams?.id ? tm.teams : (tm.id ? tm : tm.teams);
                const role = tm.role || 'member';
                return(
                <Card key={tm.team_id||tm.id} style={{ padding:'16px 18px',position:'relative',cursor:'pointer' }}>
                  <div onClick={()=>goToTeam(teamData,role)} style={{ display:'flex',alignItems:'center',gap:12 }}>
                    <div style={{ width:38,height:38,borderRadius:10,background:'linear-gradient(135deg,#6366F1,#818CF8)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:18 }}>{ICONS[i%ICONS.length]}</div>
                    <div style={{ flex:1,minWidth:0 }}>
                      <div style={{ fontSize:14,fontWeight:700,color:c.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{teamData?.name||'Team'}</div>
                      <div style={{ fontSize:11,color:c.mut }}>{role==='manager'?'Manager':'Member'}</div>
                    </div>
                  </div>
                  {role==='manager'&&<button onClick={e=>{e.stopPropagation();if(window.confirm('Delete "'+teamData?.name+'"?'))deleteTeam(teamData?.id);}} style={{ position:'absolute',top:8,right:8,width:24,height:24,borderRadius:6,background:'rgba(239,68,68,.1)',border:'none',color:'#F87171',cursor:'pointer',fontSize:12,display:'flex',alignItems:'center',justifyContent:'center' }}>🗑</button>}
                </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // ── STANDUP ENTRY: pick meeting from today's calendar ─────────────────────
  if(view==='standup-entry'){
    const todayEvts=calEvents.filter(ev=>{
      const evDate=new Date(ev.start?.dateTime||ev.start?.date);
      return evDate.toDateString()===new Date().toDateString();
    }).sort((a,b)=>new Date(a.start?.dateTime||a.start?.date)-new Date(b.start?.dateTime||b.start?.date));
    return(
      <div style={{ minHeight:'100vh',position:'relative',zIndex:1,animation:'fadeIn .3s ease' }}>
        <div style={{ borderBottom:`1px solid ${c.bord}`,background:c.nav,backdropFilter:'blur(32px)',WebkitBackdropFilter:'blur(32px)',boxShadow:'0 1px 0 rgba(255,255,255,.06)',position:'sticky',top:0,zIndex:100,overflow:'visible' }}>
          <div style={{ maxWidth:760,margin:'0 auto',padding:'0 24px',height:58,display:'flex',alignItems:'center',gap:12 }}>
            <button onClick={()=>setView('list')} style={{ background:'none',border:'none',color:c.mut,cursor:'pointer',fontSize:13,padding:0 }}>← Back</button>
            <Logo size={26}/>
            <div style={{ flex:1 }}/>
            <ThemeToggle/><ProfileMenu session={session} onSettings={onSettings} onLogout={onLogout}/>
          </div>
        </div>
        <div style={{ maxWidth:760,margin:'0 auto',padding:'36px 24px' }}>
          <h2 style={{ fontSize:22,fontWeight:800,color:c.text,marginBottom:4 }}>Join Standup ⚡</h2>
          <p style={{ color:c.mut,fontSize:14,marginBottom:28 }}>Pick a meeting to write tasks for, or jump straight into a team.</p>

          {/* Today's meetings from calendar */}
          {todayEvts.length>0&&(
            <div style={{ marginBottom:28 }}>
              <div style={{ fontSize:13,fontWeight:700,color:c.mut,textTransform:'uppercase',letterSpacing:'.08em',marginBottom:12 }}>Today's meetings ({new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'})})</div>
              <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
                {todayEvts.map(ev=>(
                  <div key={ev.id} onClick={()=>{setSelectedCalEvent(ev);setView('standup-select-team');}} style={{ padding:'16px 18px',borderRadius:12,border:`1.5px solid ${c.bord}`,background:c.surf,cursor:'pointer',display:'flex',alignItems:'center',gap:14,transition:'all .15s' }}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor='#6366F1';}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor=c.bord;}}>
                    <div style={{ width:8,borderRadius:4,alignSelf:'stretch',background:ev.colorId?'#'+ev.colorId:'#6366F1',flexShrink:0 }}/>
                    <div style={{ flex:1,minWidth:0 }}>
                      <div style={{ fontSize:15,fontWeight:700,color:c.text,marginBottom:3 }}>{ev.summary||'Untitled'}</div>
                      <div style={{ fontSize:12,color:c.mut }}>{ev.start?.dateTime?new Date(ev.start.dateTime).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}):'All day'}{ev.attendees?` · ${ev.attendees.length} attendees`:''}</div>
                    </div>
                    <span style={{ fontSize:13,color:'#818CF8',fontWeight:600,flexShrink:0 }}>Join →</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {todayEvts.length===0&&(
            <div style={{ padding:'24px',borderRadius:12,background:c.surf,border:`1px solid ${c.bord}`,textAlign:'center',marginBottom:28 }}>
              <div style={{ fontSize:32,marginBottom:8 }}>📅</div>
              <div style={{ fontSize:14,color:c.mut }}>No meetings found for today. Connect Google Calendar in the Calendar tab to see your meetings here.</div>
            </div>
          )}

          {/* Jump to team directly */}
          {teams.length>0&&(
            <div>
              <div style={{ fontSize:13,fontWeight:700,color:c.mut,textTransform:'uppercase',letterSpacing:'.08em',marginBottom:12 }}>Or jump to a team</div>
              <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:8 }}>
                {teams.map((tm,i)=>{
                  const td=tm.teams?.id?tm.teams:(tm.id?tm:tm.teams);
                  return(
                  <div key={tm.team_id||tm.id} onClick={()=>goToTeam(td,tm.role)} style={{ padding:'14px 16px',borderRadius:10,border:`1px solid ${c.bord}`,background:c.surf,cursor:'pointer',display:'flex',alignItems:'center',gap:10,transition:'all .15s' }}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor='#6366F1';}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor=c.bord;}}>
                    <div style={{ width:32,height:32,borderRadius:9,background:'linear-gradient(135deg,#6366F1,#818CF8)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0 }}>{ICONS[i%ICONS.length]}</div>
                    <div style={{ flex:1,minWidth:0 }}><div style={{ fontSize:13,fontWeight:700,color:c.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{td?.name||'Team'}</div><div style={{ fontSize:11,color:c.mut }}>{tm.role==='manager'?'Manager':'Member'}</div></div>
                  </div>
                  );
                })}
              </div>
            </div>
          )}
          {teams.length===0&&<div style={{ marginTop:8 }}><Btn onClick={()=>setView('create')}>+ Create your first team</Btn></div>}
        </div>
      </div>
    );
  }

  // ── TEAM ENTRY: select project / team ────────────────────────────────────
  if(view==='team-entry') return(
    <div style={{ minHeight:'100vh',position:'relative',zIndex:1,animation:'fadeIn .3s ease' }}>
      <div style={{ borderBottom:`1px solid ${c.bord}`,background:c.nav,backdropFilter:'blur(32px)',WebkitBackdropFilter:'blur(32px)',boxShadow:'0 1px 0 rgba(255,255,255,.06)',position:'sticky',top:0,zIndex:100,overflow:'visible' }}>
        <div style={{ maxWidth:920,margin:'0 auto',padding:'0 24px',height:58,display:'flex',alignItems:'center',gap:12 }}>
          <button onClick={()=>setView('list')} style={{ background:'none',border:'none',color:c.mut,cursor:'pointer',fontSize:13,padding:0 }}>← Back</button>
          <Logo size={26}/>
          <div style={{ flex:1 }}/><ThemeToggle/><ProfileMenu session={session} onSettings={onSettings} onLogout={onLogout}/>
        </div>
      </div>
      <div style={{ maxWidth:920,margin:'0 auto',padding:'36px 24px' }}>
        <h2 style={{ fontSize:22,fontWeight:800,color:c.text,marginBottom:4 }}>Teams & Projects 👥</h2>
        <p style={{ color:c.mut,fontSize:14,marginBottom:28 }}>Select a team to open the dashboard.</p>
        {loading?<div style={{ display:'flex',justifyContent:'center',padding:40 }}><Spin/></div>:(
          <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(230px,1fr))',gap:14 }}>
            {teams.map((tm,i)=>(
              <Card key={tm.team_id} style={{ padding:'22px',position:'relative',cursor:'pointer' }}>
                <div onClick={()=>goToTeam(tm.teams,tm.role)}>
                  <div style={{ width:48,height:48,borderRadius:14,background:'linear-gradient(135deg,#6366F1,#818CF8)',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:14,fontSize:22 }}>{ICONS[i%ICONS.length]}</div>
                  <div style={{ fontSize:16,fontWeight:700,color:c.text,marginBottom:3 }}>{tm.teams?.name}</div>
                  <div style={{ fontSize:12,color:c.mut,marginBottom:8 }}>{tm.role==='manager'?'Manager':'Member'} · {tm.teams?.standup_name||'Standup'}</div>
                  <span style={{ fontSize:11,background:'rgba(99,102,241,.12)',color:'#818CF8',padding:'3px 9px',borderRadius:20 }}>Active</span>
                </div>
                {tm.role==='manager'&&<button onClick={e=>{e.stopPropagation();if(window.confirm('Delete "'+tm.teams?.name+'"?'))deleteTeam(tm.teams?.id);}} style={{ position:'absolute',top:10,right:10,width:28,height:28,borderRadius:8,background:'rgba(239,68,68,.1)',border:'1px solid rgba(239,68,68,.2)',color:'#F87171',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13 }}>🗑</button>}
              </Card>
            ))}
            <Card onClick={()=>setView('create')} style={{ padding:'22px',cursor:'pointer',border:`1.5px dashed ${c.bord}`,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:8,minHeight:130 }}>
              <div style={{ width:38,height:38,borderRadius:'50%',background:'rgba(99,102,241,.15)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20 }}>+</div>
              <div style={{ fontSize:13,color:c.sub,fontWeight:600 }}>New team</div>
            </Card>
            <Card onClick={()=>setView('join')} style={{ padding:'22px',cursor:'pointer',border:`1.5px dashed ${c.bord}`,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:8,minHeight:130 }}>
              <div style={{ width:38,height:38,borderRadius:'50%',background:'rgba(99,102,241,.15)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20 }}>🔑</div>
              <div style={{ fontSize:13,color:c.sub,fontWeight:600 }}>Join a team</div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );

  // ── SELECT TEAM FOR STANDUP ──────────────────────────────────────────────
  if(view==='standup-select-team') return(
    <div style={{ minHeight:'100vh',position:'relative',zIndex:1,animation:'fadeIn .3s ease' }}>
      <div style={{ borderBottom:`1px solid ${c.bord}`,background:c.nav,backdropFilter:'blur(32px)',WebkitBackdropFilter:'blur(32px)',boxShadow:'0 1px 0 rgba(255,255,255,.06)',position:'sticky',top:0,zIndex:100,overflow:'visible' }}>
        <div style={{ maxWidth:760,margin:'0 auto',padding:'0 24px',height:58,display:'flex',alignItems:'center',gap:12 }}>
          <button onClick={()=>setView('standup-entry')} style={{ background:'none',border:'none',color:c.mut,cursor:'pointer',fontSize:13,padding:0 }}>← Back</button>
          <Logo size={26}/><div style={{ flex:1 }}/><ThemeToggle/><ProfileMenu session={session} onSettings={onSettings} onLogout={onLogout}/>
        </div>
      </div>
      <div style={{ maxWidth:760,margin:'0 auto',padding:'36px 24px' }}>
        {selectedCalEvent&&(
          <div style={{ padding:'16px 20px',borderRadius:12,background:'rgba(99,102,241,.08)',border:'1px solid rgba(99,102,241,.2)',marginBottom:28,display:'flex',alignItems:'center',gap:14 }}>
            <div style={{ fontSize:32 }}>📅</div>
            <div>
              <div style={{ fontSize:16,fontWeight:700,color:c.text }}>{selectedCalEvent.summary}</div>
              <div style={{ fontSize:13,color:c.mut }}>{selectedCalEvent.start?.dateTime?new Date(selectedCalEvent.start.dateTime).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}):'All day'}{selectedCalEvent.attendees?' · '+selectedCalEvent.attendees.length+' attendees':''}</div>
            </div>
          </div>
        )}
        <h2 style={{ fontSize:20,fontWeight:700,color:c.text,marginBottom:6 }}>Which team is this standup for?</h2>
        <p style={{ fontSize:13,color:c.mut,marginBottom:22 }}>Select a team to open the task board for this meeting.</p>
        <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
          {teams.map((tm,i)=>(
            <div key={tm.team_id} onClick={()=>{ goToTeam(tm.teams?.id?tm.teams:(tm.id?tm:tm.teams),tm.role); }} style={{ padding:'18px 22px',borderRadius:12,border:`1.5px solid ${c.bord}`,background:c.surf,cursor:'pointer',display:'flex',alignItems:'center',gap:14,transition:'all .15s' }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor='#6366F1';}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=c.bord;}}>
              <div style={{ width:44,height:44,borderRadius:12,background:'linear-gradient(135deg,#6366F1,#818CF8)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0 }}>{ICONS[i%ICONS.length]}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:15,fontWeight:700,color:c.text,marginBottom:3 }}>{(tm.teams?.id?tm.teams:(tm.id?tm:tm.teams))?.name||'Team'}</div>
                <div style={{ fontSize:12,color:c.mut }}>{tm.role==='manager'?'Manager':'Member'} · {tm.teams?.standup_name||'Standup'}</div>
              </div>
              <span style={{ fontSize:13,color:'#818CF8',fontWeight:600 }}>Open board →</span>
            </div>
          ))}
          {teams.length===0&&(
            <Card style={{ padding:'28px',textAlign:'center' }}>
              <div style={{ fontSize:32,marginBottom:8 }}>👥</div>
              <div style={{ color:c.mut,marginBottom:16 }}>No teams yet — create or join one first</div>
              <div style={{ display:'flex',gap:10,justifyContent:'center' }}>
                <Btn onClick={()=>setView('create')}>+ Create team</Btn>
                <Btn v="ghost" onClick={()=>setView('join')}>Join team</Btn>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );

  // ── Join team ──────────────────────────────────────────────────────────────
  if(view==='join') return(
    <div style={{ minHeight:'100vh',position:'relative',zIndex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:24,animation:'fadeIn .3s ease' }}>
      <Card style={{ width:'100%',maxWidth:420,padding:32 }}>
        <button onClick={()=>setView('list')} style={{ background:'none',border:'none',color:c.mut,cursor:'pointer',fontSize:13,marginBottom:20,padding:0 }}>← Back</button>
        <div style={{ textAlign:'center',marginBottom:24 }}>
          <div style={{ fontSize:44,marginBottom:10 }}>🔑</div>
          <h2 style={{ fontSize:20,fontWeight:700,color:c.text,marginBottom:6 }}>Join a team</h2>
          <p style={{ fontSize:13,color:c.mut }}>Get the Room ID and password from your manager</p>
        </div>
        <Inp label="Room ID" value={roomId} onChange={e=>setRoomId(e.target.value.toUpperCase())} placeholder="e.g. AB3K9M" style={{ marginBottom:14,letterSpacing:'.12em',textTransform:'uppercase',fontSize:18,textAlign:'center',fontWeight:700 }} autoFocus/>
        <Inp label="Room password" type="password" value={roomPass} onChange={e=>setRoomPass(e.target.value.toUpperCase())} placeholder="4-digit PIN" style={{ marginBottom:18,textAlign:'center',fontSize:18,letterSpacing:'.15em' }} onKeyDown={e=>e.key==='Enter'&&joinTeam()}/>
        {joinError&&<div style={{ background:'rgba(239,68,68,.1)',border:'1px solid rgba(239,68,68,.25)',borderRadius:8,padding:'10px 14px',fontSize:13,color:'#F87171',marginBottom:14 }}>{joinError}</div>}
        <Btn onClick={joinTeam} loading={joinLoading} disabled={!roomId.trim()||!roomPass.trim()} style={{ width:'100%',justifyContent:'center',padding:'12px',fontSize:15 }}>Join team →</Btn>
        <div style={{ marginTop:16,fontSize:12,color:c.mut,textAlign:'center' }}>Don't have a Room ID? Ask your manager to share it from Team Settings</div>
      </Card>
    </div>
  );

  // ── Create team (3 steps) ──────────────────────────────────────────────────
  // Show room code after creation
  if(createdTeam) return(
    <div style={{ minHeight:'100vh',position:'relative',zIndex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:24,animation:'fadeIn .3s ease' }}>
      <Card style={{ width:'100%',maxWidth:460,padding:32 }}>
        <div style={{ textAlign:'center',marginBottom:24 }}>
          <div style={{ fontSize:44,marginBottom:10 }}>🎉</div>
          <h2 style={{ fontSize:20,fontWeight:700,color:c.text,marginBottom:6 }}>Team created!</h2>
          <p style={{ fontSize:13,color:c.mut }}>Share these credentials with your team so they can join</p>
        </div>
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:20 }}>
          <div style={{ background:'rgba(99,102,241,.1)',border:'1px solid rgba(99,102,241,.3)',borderRadius:12,padding:'16px',textAlign:'center' }}>
            <div style={{ fontSize:10,color:'#818CF8',fontWeight:700,textTransform:'uppercase',letterSpacing:'.1em',marginBottom:8 }}>Room ID</div>
            <div style={{ fontSize:26,fontWeight:800,color:'#818CF8',letterSpacing:'.15em',fontFamily:'monospace' }}>{createdTeam.default_room_id||'—'}</div>
          </div>
          <div style={{ background:'rgba(52,211,153,.08)',border:'1px solid rgba(52,211,153,.25)',borderRadius:12,padding:'16px',textAlign:'center' }}>
            <div style={{ fontSize:10,color:'#34D399',fontWeight:700,textTransform:'uppercase',letterSpacing:'.1em',marginBottom:8 }}>Password</div>
            <div style={{ fontSize:26,fontWeight:800,color:'#34D399',letterSpacing:'.2em',fontFamily:'monospace' }}>{createdTeam.default_room_password||'—'}</div>
          </div>
        </div>
        <div style={{ background:'rgba(245,158,11,.08)',border:'1px solid rgba(245,158,11,.2)',borderRadius:10,padding:'11px 14px',fontSize:12,color:'#FCD34D',marginBottom:20 }}>
          ⚠️ These never change unless you delete the room. Find them anytime in Team Settings → Rooms.
        </div>
        <Btn onClick={()=>{
          SB.getMyTeams(session.user.id).then(d=>setTeams(d));
          onSelectTeam(createdTeam,'manager');
        }} style={{ width:'100%',justifyContent:'center',padding:'12px',fontSize:15 }}>Go to dashboard →</Btn>
      </Card>
    </div>
  );

  return(
    <div style={{ minHeight:'100vh',position:'relative',zIndex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:24,animation:'fadeIn .3s ease' }}>
      <Card style={{ width:'100%',maxWidth:500,padding:32 }}>
        <button onClick={()=>{setView('list');setStep(1);setTeamName('');setStandupName('');setMemberEmails(['']);}} style={{ background:'none',border:'none',color:c.mut,cursor:'pointer',fontSize:13,marginBottom:20,padding:0 }}>← Back</button>
        <div style={{ textAlign:'center',marginBottom:24 }}>
          <div style={{ fontSize:44,marginBottom:10 }}>🏗️</div>
          <h2 style={{ fontSize:20,fontWeight:700,color:c.text,marginBottom:4 }}>Create a new team</h2>
          <p style={{ fontSize:13,color:c.mut }}>Step {step} of 3</p>
        </div>
        {/* Step progress */}
        <div style={{ display:'flex',gap:4,marginBottom:24 }}>
          {[1,2,3].map(s=><div key={s} style={{ flex:1,height:4,borderRadius:2,background:step>=s?'#6366F1':'rgba(128,128,128,.2)',transition:'background .3s' }}/>)}
        </div>

        {step===1&&(<>
          <Inp label="Team name" value={teamName} onChange={e=>setTeamName(e.target.value)} placeholder="e.g. xtransmatrix · Product" style={{ marginBottom:14 }} autoFocus/>
          <Inp label="Standup / room name" value={standupName} onChange={e=>setStandupName(e.target.value)} placeholder="e.g. Supa Daily Standup" style={{ marginBottom:24 }}/>
          <Btn onClick={()=>setStep(2)} disabled={!teamName.trim()} style={{ width:'100%',justifyContent:'center',padding:'12px',fontSize:15 }}>Next →</Btn>
        </>)}

        {step===2&&(<>
          <p style={{ fontSize:13,color:c.mut,marginBottom:12 }}>Add team members by email. They will get an invite link. You can also add more later from Team Settings.</p>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12 }}>
            <button onClick={()=>{
              const contacts=prompt('Paste email addresses separated by commas or new lines:');
              if(contacts){
                const emails=contacts.split(/[,\n]/).map(e=>e.trim()).filter(e=>e.includes('@')&&e.toLowerCase()!==(session?.user?.email||'').toLowerCase());
                if(emails.length) setMemberEmails(p=>[...p.filter(x=>x.trim()),...emails]);
              }
            }} style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:6,padding:'9px 10px',borderRadius:10,border:'1px solid rgba(99,102,241,.3)',background:'rgba(99,102,241,.08)',color:'#818CF8',cursor:'pointer',fontSize:12,fontWeight:600 }}>
              📋 Paste multiple emails
            </button>
            <button onClick={()=>{
              if(!process.env.REACT_APP_GOOGLE_CLIENT_ID){
                alert('Google integration requires REACT_APP_GOOGLE_CLIENT_ID in Vercel environment variables. Add it to enable importing from Google Contacts.');
                return;
              }
              // Open Google account picker to get contacts
              const win=window.open(
                'https://contacts.google.com',
                'GoogleContacts',
                'width=800,height=600,scrollbars=yes'
              );
              alert('Copy the email addresses from Google Contacts and use "Paste multiple emails" to add them here.');
            }} style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:6,padding:'9px 10px',borderRadius:10,border:'1px solid rgba(34,197,94,.3)',background:'rgba(34,197,94,.06)',color:'#34D399',cursor:'pointer',fontSize:12,fontWeight:600 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" style={{ flexShrink:0 }}><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              Google Contacts
            </button>
          </div>
          {memberEmails.map((em,i)=>{
            const isOwn=em.trim()!==''&&em.trim().toLowerCase()===(session?.user?.email||'').toLowerCase();
            const isInvalid=em.trim()!==''&&!em.trim().match(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/)&&!isOwn;
            return(
              <div key={i} style={{ marginBottom:8 }}>
                <div style={{ display:'flex',gap:8 }}>
                  <Inp value={em} onChange={e=>setMemberEmails(p=>p.map((x,idx)=>idx===i?e.target.value:x))} placeholder="colleague@company.com" type="email" style={{ flex:1,borderColor:isOwn?'rgba(239,68,68,.6)':isInvalid?'rgba(245,158,11,.6)':undefined }}/>
                  {memberEmails.length>1&&<button onClick={()=>setMemberEmails(p=>p.filter((_,idx)=>idx!==i))} style={{ background:'rgba(239,68,68,.1)',border:'1px solid rgba(239,68,68,.2)',borderRadius:8,color:'#F87171',cursor:'pointer',padding:'0 12px',fontSize:18,flexShrink:0 }}>×</button>}
                </div>
                {isOwn&&<div style={{ fontSize:11,color:'#F87171',marginTop:3,paddingLeft:2 }}>⚠️ That is your own email — you are already the manager</div>}
                {!isOwn&&isInvalid&&<div style={{ fontSize:11,color:'#F97316',marginTop:3,paddingLeft:2 }}>⚠️ This does not look like a valid email address</div>}
              </div>
            );
          })}
          <button onClick={()=>setMemberEmails(p=>[...p,''])} style={{ background:'none',border:'none',color:'#818CF8',cursor:'pointer',fontSize:13,fontWeight:600,marginBottom:18,padding:0 }}>+ Add another</button>
          <div style={{ display:'flex',gap:10 }}>
            <Btn v="ghost" onClick={()=>setStep(1)} style={{ flex:1,justifyContent:'center' }}>← Back</Btn>
            <Btn onClick={()=>setStep(3)} disabled={memberEmails.some(e=>e.trim()!==''&&e.trim().toLowerCase()===(session?.user?.email||'').toLowerCase())} style={{ flex:1,justifyContent:'center' }}>Next →</Btn>
          </div>
        </>)}

        {step===3&&(<>
          <div style={{ background:c.surf,border:`1px solid ${c.bord}`,borderRadius:12,padding:'16px 18px',marginBottom:20 }}>
            <div style={{ fontSize:13,fontWeight:700,color:c.text,marginBottom:8 }}>Review</div>
            <div style={{ fontSize:13,color:c.sub,marginBottom:4 }}>Team: <strong>{teamName}</strong></div>
            <div style={{ fontSize:13,color:c.sub,marginBottom:4 }}>Standup: <strong>{standupName||teamName}</strong></div>
            <div style={{ fontSize:13,color:c.sub }}>Inviting: <strong>{memberEmails.filter(e=>e.trim()&&e.includes('@')).length} member{memberEmails.filter(e=>e.trim()&&e.includes('@')).length!==1?'s':''}</strong> by email</div>
          </div>
          <div style={{ background:'rgba(99,102,241,.08)',border:'1px solid rgba(99,102,241,.2)',borderRadius:10,padding:'11px 14px',fontSize:12,color:'#818CF8',marginBottom:20 }}>
            A unique Room ID and password will be generated so anyone can join without an email invite.
          </div>
          {createError&&<div style={{ background:'rgba(239,68,68,.1)',border:'1px solid rgba(239,68,68,.25)',borderRadius:8,padding:'11px 14px',fontSize:12,color:'#F87171',marginBottom:14,lineHeight:1.55 }}>{createError}</div>}
          <div style={{ display:'flex',gap:10 }}>
            <Btn v="ghost" onClick={()=>setStep(2)} style={{ flex:1,justifyContent:'center' }}>← Back</Btn>
            <Btn onClick={create} loading={creating} style={{ flex:2,justifyContent:'center',padding:'12px' }}>Create team</Btn>
          </div>
        </>)}
      </Card>
    </div>
  );
}

// ─── FLOATING AI BUBBLE ───────────────────────────────────────────────
function AIBubble({ tasks=[], members=[], history=[], session, myTasks=[], teamName='Team' }) {
  const c=useC(); const { dark }=useTheme();
  const [open,setOpen]=useState(false);
  const [msgs,setMsgs]=useState([{id:'w',role:'assistant',text:'Hi! Ask me about your tasks, team progress, or what to focus on today.'}]);
  const [input,setInput]=useState(''); const [loading,setLoading]=useState(false);
  // Draggable position
  const [pos,setPos]=useState(()=>{ try{return {x:(window.innerWidth||800)-80,y:(window.innerHeight||600)-80};}catch(e){return {x:720,y:520};} });
  const [dragging,setDragging]=useState(false);
  const [dragStart,setDragStart]=useState({mx:0,my:0,px:0,py:0});
  const [moved,setMoved]=useState(false);
  const bottomRef=useRef(); const name=session?.user?.user_metadata?.name||'User';

  useEffect(()=>{ if(open) bottomRef.current?.scrollIntoView({behavior:'smooth'}); },[msgs,open]);

  const onMouseDown=(e)=>{
    e.preventDefault();
    setDragging(true); setMoved(false);
    setDragStart({mx:e.clientX,my:e.clientY,px:pos.x,py:pos.y});
  };
  useEffect(()=>{
    if(!dragging)return;
    const mv=(e)=>{
      const dx=e.clientX-dragStart.mx, dy=e.clientY-dragStart.my;
      if(Math.abs(dx)>4||Math.abs(dy)>4) setMoved(true);
      setPos({
        x:Math.max(28,Math.min(window.innerWidth-28,dragStart.px+dx)),
        y:Math.max(28,Math.min(window.innerHeight-28,dragStart.py+dy)),
      });
    };
    const up=()=>setDragging(false);
    window.addEventListener('mousemove',mv); window.addEventListener('mouseup',up);
    return()=>{ window.removeEventListener('mousemove',mv); window.removeEventListener('mouseup',up); };
  },[dragging,dragStart]);

  const handleClick=()=>{ if(!moved) setOpen(o=>!o); };

  const send=async()=>{
    if(!input.trim()||loading)return;
    setMsgs(p=>[...p,{id:'u'+Date.now(),role:'user',text:input.trim()}]);
    setInput(''); setLoading(true);
    try{ const reply=await askAI(input.trim(),{tasks,members,history,teamName,userName:name,myTasks}); setMsgs(p=>[...p,{id:'a'+Date.now(),role:'assistant',text:reply}]); }
    catch(e){ setMsgs(p=>[...p,{id:'e'+Date.now(),role:'assistant',text:'Try again!'}]); }
    setLoading(false);
  };

  const QUICK=['Focus today','Team status','Blockers?','My progress'];

  // Chat panel — opens above the button
  const panelLeft=pos.x>window.innerWidth/2?pos.x-320:pos.x-8;
  const panelTop=pos.y>window.innerHeight/2?pos.y-480:pos.y+64;

  return (
    <>
      {/* Close panel on outside click */}
      {open&&<div onClick={()=>setOpen(false)} style={{ position:'fixed',inset:0,zIndex:898 }}/>}
      {/* Frosted glass AI orb button */}
      <button
        onMouseDown={onMouseDown}
        onClick={handleClick}
        style={{
          position:'fixed',
          left:pos.x-28, top:pos.y-28,
          zIndex:900,
          width:56, height:56,
          borderRadius:'50%',
          background:dark
            ?'rgba(124,110,245,.18)'
            :'rgba(255,255,255,.55)',
          backdropFilter:'blur(20px)',
          WebkitBackdropFilter:'blur(20px)',
          border:dark?'1px solid rgba(196,181,253,.25)':'1px solid rgba(99,102,241,.2)',
          cursor:dragging?'grabbing':'grab',
          display:'flex',alignItems:'center',justifyContent:'center',
          boxShadow:dark
            ?'0 4px 24px rgba(124,110,245,.35),inset 0 1px 0 rgba(255,255,255,.1)'
            :'0 4px 24px rgba(99,102,241,.2),inset 0 1px 0 rgba(255,255,255,.8)',
          transition:dragging?'none':'box-shadow .2s',
          userSelect:'none',
        }}
      >
        {/* Minimal star/sparkle AI icon */}
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style={{ flexShrink:0 }}>
          <path d="M12 2L13.5 8.5L20 7L14.5 11.5L17 18L12 14L7 18L9.5 11.5L4 7L10.5 8.5L12 2Z"
            fill={dark?'#C4B5FD':'#6366F1'} opacity=".9"/>
          <circle cx="19" cy="4" r="1.5" fill={dark?'#A78BFA':'#818CF8'} opacity=".7"/>
          <circle cx="5" cy="19" r="1" fill={dark?'#A78BFA':'#818CF8'} opacity=".5"/>
        </svg>
      </button>

      {/* Chat panel */}
      {open&&(
        <div style={{
          position:'fixed',
          left:Math.max(8,Math.min(window.innerWidth-336,panelLeft)),
          top:Math.max(8,Math.min(window.innerHeight-496,panelTop)),
          zIndex:899, width:328, maxHeight:480,
          background:dark?'rgba(10,8,26,.92)':'rgba(255,255,255,.88)',
          backdropFilter:'blur(32px)',
          WebkitBackdropFilter:'blur(32px)',
          border:`1px solid ${c.bord}`,
          borderRadius:20,
          display:'flex',flexDirection:'column',
          boxShadow:dark?'0 16px 56px rgba(0,0,0,.6),inset 0 1px 0 rgba(255,255,255,.05)':'0 16px 56px rgba(99,102,241,.15),inset 0 1px 0 rgba(255,255,255,.9)',
          overflow:'hidden',
          animation:'fadeUp .18s ease',
        }}>
          {/* Header */}
          <div style={{ padding:'14px 16px 12px',display:'flex',alignItems:'center',gap:10,flexShrink:0 }}>
            <div style={{ width:32,height:32,borderRadius:'50%',background:'rgba(124,110,245,.15)',border:'1px solid rgba(196,181,253,.25)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L13.5 8.5L20 7L14.5 11.5L17 18L12 14L7 18L9.5 11.5L4 7L10.5 8.5L12 2Z" fill={dark?'#C4B5FD':'#6366F1'}/>
              </svg>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13,fontWeight:700,color:c.text,letterSpacing:'-.01em' }}>StandSync AI</div>
              <div style={{ fontSize:10,color:'#34D399',display:'flex',alignItems:'center',gap:4 }}><div style={{ width:5,height:5,borderRadius:'50%',background:'#34D399' }}/>Online</div>
            </div>
            <button onClick={()=>setOpen(false)} style={{ width:26,height:26,borderRadius:8,background:'transparent',border:'none',color:c.mut,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16 }}>×</button>
          </div>
          {/* Quick actions */}
          <div style={{ padding:'0 12px 10px',display:'flex',gap:5,flexWrap:'wrap',flexShrink:0 }}>
            {QUICK.map(q=><button key={q} onClick={()=>setInput(q)} style={{ fontSize:11,padding:'4px 10px',borderRadius:20,border:`1px solid ${c.bord}`,background:c.surf,color:c.mut,cursor:'pointer',whiteSpace:'nowrap',transition:'all .12s' }}>{q}</button>)}
          </div>
          {/* Messages */}
          <div style={{ flex:1,overflowY:'auto',padding:'8px 12px',display:'flex',flexDirection:'column',gap:8 }}>
            {msgs.map(m=>(
              <div key={m.id} style={{ display:'flex',flexDirection:m.role==='user'?'row-reverse':'row',alignItems:'flex-end',gap:6 }}>
                {m.role==='assistant'&&<div style={{ width:22,height:22,borderRadius:'50%',background:'rgba(124,110,245,.15)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginBottom:2 }}><svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M12 2L13.5 8.5L20 7L14.5 11.5L17 18L12 14L7 18L9.5 11.5L4 7L10.5 8.5L12 2Z" fill={dark?'#C4B5FD':'#6366F1'}/></svg></div>}
                <div style={{ maxWidth:'84%',background:m.role==='user'?'linear-gradient(135deg,#6B5FE4,#9B8AFB)':dark?'rgba(255,255,255,.06)':'rgba(255,255,255,.8)',color:m.role==='user'?'#fff':c.text,padding:'8px 12px',borderRadius:m.role==='user'?'14px 14px 4px 14px':'14px 14px 14px 4px',fontSize:12,lineHeight:1.55,border:m.role==='user'?'none':`1px solid ${c.bord}`,boxShadow:m.role==='assistant'?'0 1px 6px rgba(0,0,0,.06)':'none' }}>
                  {m.text.split('\n').map((l,i)=><div key={i} style={{ marginBottom:l?0:4 }}>{l||<br/>}</div>)}
                </div>
              </div>
            ))}
            {loading&&<div style={{ display:'flex',gap:4,padding:'8px 11px',background:dark?'rgba(255,255,255,.06)':'rgba(255,255,255,.8)',borderRadius:'14px 14px 14px 4px',width:'fit-content',border:`1px solid ${c.bord}` }}>{[0,1,2].map(i=><div key={i} style={{ width:5,height:5,borderRadius:'50%',background:'#A78BFA',animation:'bounce .7s ease '+(i*.14)+'s infinite' }}/>)}</div>}
            <div ref={bottomRef}/>
          </div>
          {/* Input */}
          <div style={{ padding:'10px 12px',borderTop:`1px solid ${c.bord}`,display:'flex',gap:8,flexShrink:0,background:dark?'rgba(255,255,255,.02)':'rgba(255,255,255,.5)' }}>
            <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder="Ask anything..." style={{ flex:1,background:'transparent',border:'none',color:c.text,fontSize:13,outline:'none',letterSpacing:'-.01em' }}/>
            <button onClick={send} disabled={!input.trim()||loading} style={{ width:32,height:32,borderRadius:10,background:input.trim()?'linear-gradient(135deg,#6B5FE4,#9B8AFB)':'transparent',border:input.trim()?'none':`1px solid ${c.bord}`,color:input.trim()?'#fff':c.mut,cursor:input.trim()?'pointer':'default',display:'flex',alignItems:'center',justifyContent:'center',fontSize:15,flexShrink:0,transition:'all .15s' }}>↑</button>
          </div>
        </div>
      )}
    </>
  );
}

// ─── AI ASSISTANT PAGE ────────────────────────────────────────────────────────
function AIAssistant({ tasks=[], members=[], history=[], session, myTasks=[], teamName='Team' }) {
  const c=useC();
  const [msgs,setMsgs]=useState([{id:'w',role:'assistant',text:'Hi! I am your StandSync AI assistant. Ask me anything about your tasks, team progress, blockers, or what to focus on today.'}]);
  const [input,setInput]=useState(''); const [loading,setLoading]=useState(false);
  const bottomRef=useRef(); const name=session?.user?.user_metadata?.name||'User';
  const done=tasks.filter(t=>t.status==='done').length;
  const pct=tasks.length?Math.round(done/tasks.length*100):0;

  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:'smooth'}); },[msgs]);

  const send=async(text)=>{
    const msg=text||input.trim();
    if(!msg||loading)return;
    setMsgs(p=>[...p,{id:'u'+Date.now(),role:'user',text:msg}]);
    setInput(''); setLoading(true);
    try{
      const reply=await askAI(msg,{tasks,members,history,teamName,userName:name,myTasks});
      setMsgs(p=>[...p,{id:'a'+Date.now(),role:'assistant',text:reply}]);
    }catch(e){
      setMsgs(p=>[...p,{id:'e'+Date.now(),role:'assistant',text:'Sorry, had trouble with that. Try again!'}]);
    }
    setLoading(false);
  };

  const QUICK=['What should I focus on today?','How is the team doing?','Any blockers?',"Today's summary",'Who is performing best?'];

  return(
    <div style={{ display:'flex',flexDirection:'column',height:'calc(100vh - 160px)',minHeight:500,borderRadius:16,overflow:'hidden',border:`1px solid ${c.bord}` }}>
      {/* Header */}
      <div style={{ padding:'16px 20px',background:c.surf,borderBottom:`1px solid ${c.bord}`,display:'flex',alignItems:'center',gap:12,flexShrink:0 }}>
        <div style={{ width:42,height:42,borderRadius:'50%',background:'linear-gradient(135deg,#6366F1,#818CF8)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0 }}>🤖</div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:15,fontWeight:700,color:c.text }}>StandSync AI</div>
          <div style={{ fontSize:12,color:'#34D399' }}>● Online · {process.env.REACT_APP_GEMINI_KEY?'Google Gemini':'Smart fallback mode'}</div>
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontSize:12,color:c.mut }}>Team completion</div>
          <div style={{ fontSize:18,fontWeight:700,color:pct>=80?'#34D399':pct>=50?'#818CF8':'#F97316' }}>{pct}%</div>
        </div>
      </div>
      {/* Quick actions */}
      <div style={{ padding:'10px 16px',borderBottom:`1px solid ${c.bord}`,display:'flex',gap:6,flexWrap:'wrap',flexShrink:0,background:c.nav }}>
        {QUICK.map(q=><button key={q} onClick={()=>send(q)} style={{ fontSize:12,padding:'5px 12px',borderRadius:20,border:`1px solid ${c.bord}`,background:c.surf,color:c.sub,cursor:'pointer',whiteSpace:'nowrap',transition:'all .15s' }}>{q}</button>)}
      </div>
      {/* Messages */}
      <div style={{ flex:1,overflowY:'auto',padding:'16px',display:'flex',flexDirection:'column',gap:10,background:c.bg }}>
        {msgs.map(m=>(
          <div key={m.id} style={{ display:'flex',gap:10,alignItems:'flex-start',flexDirection:m.role==='user'?'row-reverse':'row' }}>
            {m.role==='assistant'&&<div style={{ width:32,height:32,borderRadius:'50%',background:'linear-gradient(135deg,#6366F1,#818CF8)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0 }}>🤖</div>}
            <div style={{ maxWidth:'78%',background:m.role==='user'?'linear-gradient(135deg,#6366F1,#818CF8)':c.surf,color:m.role==='user'?'#fff':c.text,padding:'11px 15px',borderRadius:m.role==='user'?'16px 16px 4px 16px':'16px 16px 16px 4px',fontSize:13,lineHeight:1.6,border:m.role==='user'?'none':`1px solid ${c.bord}`,boxShadow:m.role==='assistant'?'0 1px 4px rgba(0,0,0,.06)':'none' }}>
              {m.text.split('\n').map((line,i)=><div key={i} style={{ marginBottom:line?2:6 }}>{line||<br/>}</div>)}
            </div>
          </div>
        ))}
        {loading&&(
          <div style={{ display:'flex',gap:8,alignItems:'flex-start' }}>
            <div style={{ width:32,height:32,borderRadius:'50%',background:'linear-gradient(135deg,#6366F1,#818CF8)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0 }}>🤖</div>
            <div style={{ padding:'11px 16px',background:c.surf,borderRadius:'16px 16px 16px 4px',border:`1px solid ${c.bord}`,display:'flex',gap:5,alignItems:'center' }}>
              {[0,1,2].map(i=><div key={i} style={{ width:7,height:7,borderRadius:'50%',background:'#818CF8',animation:`bounce .8s ease ${i*.15}s infinite` }}/>)}
            </div>
          </div>
        )}
        <div ref={bottomRef}/>
      </div>
      {/* Input */}
      <div style={{ padding:'12px 16px',borderTop:`1px solid ${c.bord}`,display:'flex',gap:8,background:c.nav,flexShrink:0 }}>
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&send()} placeholder="Ask about tasks, blockers, team performance..." style={{ flex:1,background:c.inp,border:`1.5px solid ${c.inpB}`,borderRadius:10,padding:'10px 14px',color:c.text,fontSize:13,outline:'none' }}/>
        <button onClick={()=>send()} disabled={!input.trim()||loading} style={{ width:40,height:40,borderRadius:10,background:'linear-gradient(135deg,#6366F1,#818CF8)',border:'none',color:'#fff',cursor:input.trim()&&!loading?'pointer':'not-allowed',opacity:input.trim()&&!loading?1:.5,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0 }}>↑</button>
      </div>
    </div>
  );
}

// ─── RICH CHAT ──────────────────────────────────────────────────────────
// ─── RICH CHAT PANEL (Google Chat replica) ────────────────────────────────────
var EMOJI_LIST = ['👍','❤️','😂','😮','😢','🙏','🔥','🎉','✅','👀','💯','🚀','😊','🤔','👏','💪','😅','🤣','😍','🥳','🙌','💡','⚡','🎯','✨','🤝','😎','🫡','👋','💬'];
var EMOJI_GROUPS = {
  'Smileys': ['😀','😁','😂','🤣','😊','😍','🥰','😘','😎','🤩','😏','😒','😞','😔','😟','😕','🙁','😣','😖','😫','😩','🥺','😢','😭','😤','😠','😡','🤬','🤯','😳','🥵','🥶','😱','😨','😰','😥','😓','🤗','🤔','🤭','🤫','🤥','😶','😐','😑','😬','🙄','😯','😦','😧','😮','😲','🥱','😴','🤤','😪','😵','🤐','🥴','🤢','🤮','🤧','🥳'],
  'Gestures': ['👍','👎','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','👋','🤚','🖐','✋','🖖','🙌','👐','🤲','🤝','🙏','✍️','💅','🤳','💪','🦵','🦶','👂','🦻','👃'],
  'Objects': ['💬','📎','📄','🖼️','🎵','🎬','📅','⚡','🔥','💡','🎯','✅','❌','⭐','🏆','🎉','🎊','🎁','📱','💻','⌨️','🖱️','🖨️','📷','📸','📹','🎥','📞','📟','📠','🔋','🔌','💾','💿','📀','🖥️','📺','📻'],
  'Nature': ['🌟','⭐','🌈','☀️','🌤️','⛅','🌦️','🌧️','⛈️','🌩️','🌨️','❄️','🔥','💧','🌊','🌸','🌺','🌻','🌹','🍀','🌿','🌱','🌲','🌳','🌴'],
};

// ─── SPACE SETTINGS MODAL ────────────────────────────────────────────────────
function SpaceSettingsModal({ spaceId, customSpaces, members, isManager, onClose, updateSpaceSettings, addMemberToSpace, removeMemberFromSpace, setCustomSpaces, getSpaceSettings }) {
  const c = useC();
  const [ssTab, setSsTab] = useState('members');
  const [memberSearch, setMemberSearch] = useState('');

  const DEFAULT_SPACES = [{id:'general',label:'general'},{id:'announcements',label:'announcements'},{id:'random',label:'random'}];
  const sp = customSpaces.find(s=>s.id===spaceId) || DEFAULT_SPACES.find(s=>s.id===spaceId) || {name:spaceId};
  const isCustom = !!customSpaces.find(s=>s.id===spaceId);
  const cfg = getSpaceSettings ? getSpaceSettings(spaceId) : (sp?.settings || {access:'organisation',allowRequests:true,whoManages:'members',canModify:'owners',canHistory:'managers',canAtAll:'members',canManageApps:'managers',canManageWebhooks:'managers',members:[]});
  const spMembers = cfg.members || [];

  return (
    <div style={{ position:'fixed',inset:0,zIndex:9999,background:'rgba(0,0,0,.6)',display:'flex',alignItems:'center',justifyContent:'center' }} onClick={onClose}>
      <div style={{ width:520,maxHeight:'85vh',background:c.dark?'#0F0D2A':'#fff',borderRadius:16,border:`1px solid ${c.bord}`,overflow:'hidden',display:'flex',flexDirection:'column',boxShadow:'0 20px 60px rgba(0,0,0,.5)' }} onClick={e=>e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding:'16px 20px',borderBottom:`1px solid ${c.bord}`,display:'flex',alignItems:'center',gap:10 }}>
          <span style={{ fontSize:16,fontWeight:700,color:c.text,flex:1 }}>{sp?.type==='announcements'?'📢':'#'} {sp?.name||sp?.label}</span>
          <button onClick={onClose} style={{ background:'none',border:'none',color:c.mut,cursor:'pointer',fontSize:20 }}>✕</button>
        </div>
        {/* Tabs */}
        <div style={{ display:'flex',borderBottom:`1px solid ${c.bord}`,padding:'0 12px' }}>
          {[{id:'members',l:'Manage members'},{id:'settings',l:'Space settings'},{id:'permissions',l:'Permissions'}].map(t=>(
            <button key={t.id} onClick={()=>setSsTab(t.id)} style={{ padding:'10px 14px',border:'none',borderBottom:ssTab===t.id?'2px solid #818CF8':'2px solid transparent',background:'transparent',color:ssTab===t.id?'#818CF8':c.mut,cursor:'pointer',fontSize:13,fontWeight:ssTab===t.id?600:400 }}>{t.l}</button>
          ))}
        </div>
        {/* Content */}
        <div style={{ flex:1,overflowY:'auto',padding:'16px 20px' }}>
          {/* MEMBERS TAB */}
          {ssTab==='members'&&(
            <div>
              <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14 }}>
                <div style={{ fontSize:13,color:c.mut }}>{spMembers.length} member{spMembers.length!==1?'s':''}</div>
                {isCustom&&isManager&&(
                  <div style={{ position:'relative' }}>
                    <input value={memberSearch} onChange={e=>setMemberSearch(e.target.value)} placeholder="+ Add member..." style={{ background:c.inp,border:`1px solid ${c.inpB}`,borderRadius:8,padding:'6px 10px',color:c.text,fontSize:12,outline:'none',width:160 }}/>
                    {memberSearch&&(
                      <div style={{ position:'absolute',top:'100%',right:0,width:220,background:c.dark?'#1A1740':'#fff',border:`1px solid ${c.bord}`,borderRadius:10,zIndex:100,marginTop:4,boxShadow:'0 8px 24px rgba(0,0,0,.2)',maxHeight:160,overflowY:'auto' }}>
                        {members.filter(m=>!spMembers.find(sm=>sm.email===m.email)&&(m.name?.toLowerCase().includes(memberSearch.toLowerCase())||m.email?.toLowerCase().includes(memberSearch.toLowerCase()))).map(m=>(
                          <div key={m.email} onClick={()=>{addMemberToSpace(spaceId,m);setMemberSearch('');}} style={{ padding:'8px 12px',cursor:'pointer',fontSize:12,color:c.text,display:'flex',alignItems:'center',gap:8 }} onMouseEnter={e=>e.currentTarget.style.background='rgba(99,102,241,.1)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                            <Av member={m} size={22}/><span>{m.name||m.email}</span>
                          </div>
                        ))}
                        {members.filter(m=>!spMembers.find(sm=>sm.email===m.email)).length===0&&<div style={{ padding:'10px 12px',fontSize:12,color:c.mut }}>All members added</div>}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <table style={{ width:'100%',borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ borderBottom:`1px solid ${c.bord}` }}>
                    {['Name','Email','Role',''].map(h=><th key={h} style={{ padding:'8px 10px',textAlign:'left',fontSize:11,fontWeight:700,color:c.mut,textTransform:'uppercase',letterSpacing:'.05em' }}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {spMembers.length===0&&<tr><td colSpan={4} style={{ padding:'16px',textAlign:'center',color:c.mut,fontSize:13 }}>No members yet — add some above</td></tr>}
                  {spMembers.map((m,i)=>{
                    const fullM=members.find(tm=>tm.email===m.email)||m;
                    return(
                      <tr key={m.email} style={{ borderBottom:`1px solid ${c.bord}` }}>
                        <td style={{ padding:'10px' }}><div style={{ display:'flex',alignItems:'center',gap:8 }}><Av member={fullM} size={28}/><span style={{ fontSize:13,fontWeight:600,color:c.text }}>{m.name||m.email}</span></div></td>
                        <td style={{ padding:'10px',fontSize:12,color:c.mut }}>{m.email}</td>
                        <td style={{ padding:'10px' }}>
                          <select value={m.role||'member'} onChange={e=>{
                            const updated=customSpaces.map(s=>s.id===spaceId?{...s,settings:{...s.settings,members:s.settings.members.map((mb,mi)=>mi===i?{...mb,role:e.target.value}:mb)}}:s);
                            setCustomSpaces(updated);
                            try{localStorage.setItem('ss-spaces',JSON.stringify(updated));}catch{}
                          }} style={{ background:c.inp,border:`1px solid ${c.inpB}`,borderRadius:6,padding:'3px 6px',color:c.text,fontSize:11,cursor:'pointer' }}>
                            <option value="member">Member</option>
                            <option value="manager">Manager</option>
                            <option value="owner">Owner</option>
                          </select>
                        </td>
                        <td style={{ padding:'10px' }}>{isCustom&&isManager&&<button onClick={()=>removeMemberFromSpace(spaceId,m.email)} style={{ background:'none',border:'none',color:'#F87171',cursor:'pointer',fontSize:12 }}>Remove</button>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {/* SETTINGS TAB */}
          {ssTab==='settings'&&(
            <div style={{ display:'flex',flexDirection:'column',gap:16 }}>
              <div>
                <div style={{ fontSize:14,fontWeight:700,color:c.text,marginBottom:4 }}>Access</div>
                <div style={{ fontSize:12,color:c.mut,marginBottom:10 }}>Control who can find and join this space.</div>
                {[{v:'organisation',l:'Anyone in organisation can find, view and join'},{v:'restricted',l:'Only invited members can join'},{v:'request',l:'Anyone can request to join'}].map(opt=>(
                  <div key={opt.v} onClick={()=>isCustom&&isManager&&updateSpaceSettings(spaceId,{access:opt.v})} style={{ display:'flex',alignItems:'center',gap:10,padding:'8px',borderRadius:8,cursor:isCustom&&isManager?'pointer':'default',marginBottom:4,background:cfg.access===opt.v?'rgba(99,102,241,.08)':'transparent' }}>
                    <div style={{ width:14,height:14,borderRadius:'50%',border:`2px solid ${cfg.access===opt.v?'#818CF8':'rgba(128,128,128,.4)'}`,background:cfg.access===opt.v?'#818CF8':'transparent',flexShrink:0 }}/>
                    <span style={{ fontSize:13,color:c.text }}>{opt.l}</span>
                  </div>
                ))}
              </div>
              <div style={{ borderTop:`1px solid ${c.bord}`,paddingTop:14 }}>
                <div style={{ fontSize:14,fontWeight:700,color:c.text,marginBottom:10 }}>Who can manage members</div>
                {[{v:'all',l:'All members'},{v:'managers',l:'Managers and owners'},{v:'owners',l:'Owners only'}].map(opt=>(
                  <div key={opt.v} onClick={()=>isCustom&&isManager&&updateSpaceSettings(spaceId,{whoManages:opt.v})} style={{ display:'flex',alignItems:'center',gap:10,padding:'6px 8px',borderRadius:8,cursor:isCustom&&isManager?'pointer':'default',marginBottom:4 }}>
                    <div style={{ width:14,height:14,borderRadius:'50%',border:`2px solid ${cfg.whoManages===opt.v?'#818CF8':'rgba(128,128,128,.4)'}`,background:cfg.whoManages===opt.v?'#818CF8':'transparent',flexShrink:0 }}/>
                    <span style={{ fontSize:13,color:c.text }}>{opt.l}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* PERMISSIONS TAB */}
          {ssTab==='permissions'&&(
            <div>
              <div style={{ fontSize:12,color:c.mut,marginBottom:14 }}>Customise permissions for this space.</div>
              <table style={{ width:'100%',borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ borderBottom:`1px solid ${c.bord}` }}>
                    <th style={{ padding:'8px 10px',textAlign:'left',fontSize:11,fontWeight:700,color:c.mut,textTransform:'uppercase' }}>Who can</th>
                    {['Owners','Managers','Members'].map(r=><th key={r} style={{ padding:'8px',textAlign:'center',fontSize:11,fontWeight:700,color:c.mut,textTransform:'uppercase' }}>{r}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {[{key:'canModify',l:'Modify space details'},{key:'canHistory',l:'Turn history on/off'},{key:'canAtAll',l:'Use @all'},{key:'canManageApps',l:'Manage apps'},{key:'canManageWebhooks',l:'Manage webhooks'}].map(row=>{
                    const levels={owners:3,managers:2,members:1};
                    const cur=cfg[row.key]||'owners';
                    return(
                      <tr key={row.key} style={{ borderBottom:`1px solid ${c.bord}` }}>
                        <td style={{ padding:'10px',fontSize:13,color:c.text }}>{row.l}</td>
                        {['owners','managers','members'].map(role=>(
                          <td key={role} style={{ padding:'10px',textAlign:'center' }}>
                            <input type="checkbox" checked={levels[role]>=levels[cur]} onChange={()=>{
                              if(isCustom&&isManager){
                                const newLevel=levels[role]>=levels[cur]&&role===cur?(['owners','managers','members'].find(r=>levels[r]<levels[role])||'owners'):role;
                                updateSpaceSettings(spaceId,{[row.key]:newLevel});
                              }
                            }} style={{ cursor:'pointer',width:14,height:14 }}/>
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


function RichChatPanel({ messages=[], onSend, session, members=[], chatTheme='default', onChangeTheme, isManager=false }) {
  const c=useC();
  const [msg,setMsg]=useState('');
  const [activeSpace,setActiveSpace]=useState('general');
  const [showEmoji,setShowEmoji]=useState(false);
  const [emojiGroup,setEmojiGroup]=useState('Smileys');
  const [showGif,setShowGif]=useState(false);
  const [gifSearch,setGifSearch]=useState(''); const [gifs,setGifs]=useState([]); const [gifLoading,setGifLoading]=useState(false);
  const [showNewSpace,setShowNewSpace]=useState(false); const [newSpaceName,setNewSpaceName]=useState('');
  const [newSpaceType,setNewSpaceType]=useState('collaboration'); // collaboration | announcements
  const [showSpaceSettings,setShowSpaceSettings]=useState(null); // space id
  const [showAddDM,setShowAddDM]=useState(false);
  const [dmSearch,setDmSearch]=useState('');
  const DEFAULT_SPACE_DEFS=[
    {id:'general',name:'general',label:'general',type:'collaboration'},
    {id:'announcements',name:'announcements',label:'announcements',type:'announcements'},
    {id:'random',name:'random',label:'random',type:'collaboration'},
  ];
  const [customSpaces,setCustomSpaces]=useState(()=>{ try{return JSON.parse(localStorage.getItem('ss-spaces')||'[]');}catch{return[];} });
  // Settings for ALL spaces including defaults - stored separately
  const [spaceSettings,setSpaceSettings]=useState(()=>{
    try{return JSON.parse(localStorage.getItem('ss-spacesettings')||'{}');}catch{return {};}
  });
  const saveSpaceSettings=(newSettings)=>{
    setSpaceSettings(newSettings);
    try{localStorage.setItem('ss-spacesettings',JSON.stringify(newSettings));}catch{}
  };
  const [pinnedMsgs,setPinnedMsgs]=useState([]);
  const [showPinned,setShowPinned]=useState(false);
  const [showFiles,setShowFiles]=useState(false);
  const [contextMenu,setContextMenu]=useState(null);
  const [reactions,setReactions]=useState({}); // {msgId: {emoji: [email,...]}}
  const [replyTo,setReplyTo]=useState(null);
  const bottomRef=useRef(); const fileRef=useRef(); const attachRef=useRef(); const inputRef=useRef();

  const myEmail=session?.user?.email||'demo@standsync.app';
  const myName=session?.user?.user_metadata?.name||myEmail.split('@')[0];
  const myAvatar=session?.user?.user_metadata?.avatar_url;

  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:'smooth'}); },[messages,activeSpace]);

  // Open file via blob URL (fixes about:blank issue)
  const openFile=(url,filename)=>{
    if(!url)return;
    if(url.startsWith('data:')){
      const arr=url.split(','), mime=arr[0].match(/:(.*?);/)?.[1]||'application/octet-stream';
      const bstr=atob(arr[1]), n=bstr.length, u8=new Uint8Array(n);
      for(let i=0;i<n;i++)u8[i]=bstr.charCodeAt(i);
      const blob=new Blob([u8],{type:mime});
      const blobUrl=URL.createObjectURL(blob);
      const opened=window.open(blobUrl,'_blank');
      if(!opened){ const a=document.createElement('a'); a.href=blobUrl; a.download=filename||'file'; a.click(); }
      setTimeout(()=>URL.revokeObjectURL(blobUrl),10000);
    } else { window.open(url,'_blank'); }
  };

  const handleFile=(e)=>{
    const file=e.target.files[0]; if(!file)return;
    const t=file.type;
    const msgType=t.startsWith('image/')?'image':t.startsWith('video/')?'video':t.startsWith('audio/')?'audio':t==='application/pdf'?'pdf':'file';
    const reader=new FileReader();
    reader.onload=ev=>sendMsg('',msgType,ev.target.result,file.name,file.size);
    reader.readAsDataURL(file);
    e.target.value='';
  };

  const fmtSize=(b)=>b>1048576?(b/1048576).toFixed(1)+'MB':b>1024?(b/1024).toFixed(0)+'KB':b+'B';

  const addReaction=(msgId,emoji)=>{
    setReactions(prev=>{
      const r={...prev};
      if(!r[msgId])r[msgId]={};
      if(!r[msgId][emoji])r[msgId][emoji]=[];
      const idx=r[msgId][emoji].indexOf(myEmail);
      if(idx>=0) r[msgId][emoji]=r[msgId][emoji].filter(e=>e!==myEmail);
      else r[msgId][emoji]=[...r[msgId][emoji],myEmail];
      if(r[msgId][emoji].length===0)delete r[msgId][emoji];
      return r;
    });
    setContextMenu(null);
  };

  // Filter messages by active space/DM
  const spaceMessages=messages.filter(m=>{
    if(activeSpace.startsWith('dm-')){
      const dmEmail=activeSpace.slice(3);
      // Match DMs in both directions
      return m.dm_to && (
        (m.dm_to===myEmail && m.sender_email===dmEmail) ||
        (m.dm_to===dmEmail && m.sender_email===myEmail) ||
        (m.dm_to===dmEmail && m.sender_email===myEmail)
      );
    }
    // Space messages: must have matching space AND no dm_to
    return !m.dm_to && (m.space||'general')===activeSpace;
  });

  const sendMsg=(text,type='text',url='',filename='',filesize=0)=>{
    if(type==='text'&&!text.trim())return;
    const isDM=activeSpace.startsWith('dm-');
    const dmTo=isDM?activeSpace.slice(3):null;
    onSend({
      id:'m'+Date.now(),
      text:type==='text'?text.trim():'',
      type,url,filename,filesize,
      sender_email:myEmail,
      sender_name:myName,
      created_at:new Date().toISOString(),
      space: dmTo ? 'dm' : activeSpace,
      dm_to: dmTo || undefined,
      reply_to:replyTo?{id:replyTo.id,text:replyTo.text||'[attachment]',name:replyTo.sender_name}:undefined,
    });
    setMsg(''); setShowEmoji(false); setShowGif(false); setReplyTo(null);
  };

  const searchGifs=async(q)=>{
    if(!q.trim())return; setGifLoading(true);
    try{
      const key=process.env.REACT_APP_GIPHY_KEY||'dc6zaTOxFJmzC';
      const r=await fetch('https://api.giphy.com/v1/gifs/search?api_key='+key+'&q='+encodeURIComponent(q)+'&limit=16&rating=g');
      if(!r.ok){setGifLoading(false);return;}
      const d=await r.json(); setGifs(d.data||[]);
    }catch(e){}
    setGifLoading(false);
  };

  const addCustomSpace=()=>{
    if(!newSpaceName.trim())return;
    const id='space-'+newSpaceName.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'');
    const updated=[...customSpaces,{id,name:newSpaceName.trim(),type:newSpaceType||'collaboration',
      settings:{access:'organisation',allowRequests:true,whoManages:'members',
        canModify:'owners',canHistory:'managers',canAtAll:'members',canManageApps:'managers',
        canManageWebhooks:'managers',members:members.map(m=>({email:m.email,name:m.name||m.email,role:'member'}))
      }
    }];
    setCustomSpaces(updated);
    try{localStorage.setItem('ss-spaces',JSON.stringify(updated));}catch{}
    setActiveSpace(id); setShowNewSpace(false); setNewSpaceName(''); setNewSpaceType('collaboration');
  };
  const updateSpaceSettings=(spaceId, newSettings)=>{
    // Update in unified spaceSettings store (works for both default and custom spaces)
    const newAll={...spaceSettings,[spaceId]:{...getSpaceSettings(spaceId),...newSettings}};
    saveSpaceSettings(newAll);
    // Also update customSpaces if it's a custom space
    if(customSpaces.find(s=>s.id===spaceId)){
      const updated=customSpaces.map(s=>s.id===spaceId?{...s,settings:{...s.settings,...newSettings}}:s);
      setCustomSpaces(updated);
      try{localStorage.setItem('ss-spaces',JSON.stringify(updated));}catch{}
    }
  };
  const getSpaceSettings=(spaceId)=>{
    const defaultCfg={access:'organisation',allowRequests:true,whoManages:'members',
      canModify:'owners',canHistory:'managers',canAtAll:'members',
      canManageApps:'managers',canManageWebhooks:'managers',members:[]};
    const fromCustom=customSpaces.find(s=>s.id===spaceId)?.settings||{};
    const fromStore=spaceSettings[spaceId]||{};
    return {...defaultCfg,...fromCustom,...fromStore};
  };
  const addMemberToSpace=(spaceId, member)=>{
    const cur=getSpaceSettings(spaceId);
    const existing=cur.members||[];
    if(existing.find(m=>m.email===member.email))return;
    const newMembers=[...existing,{email:member.email,name:member.name||member.email,role:'member'}];
    updateSpaceSettings(spaceId,{members:newMembers});
  };
  const removeMemberFromSpace=(spaceId, email)=>{
    const cur=getSpaceSettings(spaceId);
    updateSpaceSettings(spaceId,{members:(cur.members||[]).filter(m=>m.email!==email)});
  };

  const deleteCustomSpace=(id)=>{
    const updated=customSpaces.filter(s=>s.id!==id);
    setCustomSpaces(updated);
    try{localStorage.setItem('ss-spaces',JSON.stringify(updated));}catch{}
    if(activeSpace===id)setActiveSpace('general');
  };

  const renderMsg=(m)=>{
    if(m.type==='image') return <img src={m.url} alt="img" onClick={()=>openFile(m.url,m.filename)} style={{ maxWidth:260,maxHeight:260,borderRadius:10,objectFit:'cover',cursor:'pointer',display:'block' }}/>;
    if(m.type==='gif') return <img src={m.url} alt="gif" style={{ maxWidth:260,borderRadius:10,display:'block' }}/>;
    if(m.type==='video') return <video src={m.url} controls style={{ maxWidth:280,borderRadius:10,display:'block' }}/>;
    if(m.type==='audio') return <audio src={m.url} controls style={{ maxWidth:280 }}/>;
    if(m.type==='pdf'||m.type==='file'){
      const icon=m.type==='pdf'?'📄':m.filename?.match(/\.(doc|docx)$/i)?'📝':m.filename?.match(/\.(xls|xlsx)$/i)?'📊':m.filename?.match(/\.(mp3|wav)$/i)?'🎵':m.filename?.match(/\.(mp4|mov)$/i)?'🎬':'📎';
      return(
        <div onClick={()=>openFile(m.url,m.filename)} style={{ display:'flex',alignItems:'center',gap:10,padding:'10px 14px',background:'rgba(255,255,255,.1)',borderRadius:10,cursor:'pointer',maxWidth:260,border:'1px solid rgba(255,255,255,.15)' }}>
          <span style={{ fontSize:26,flexShrink:0 }}>{icon}</span>
          <div style={{ flex:1,minWidth:0 }}>
            <div style={{ fontSize:12,fontWeight:700,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{m.filename||'File'}</div>
            <div style={{ fontSize:10,opacity:.6,marginTop:2 }}>{m.filesize?fmtSize(m.filesize):m.type.toUpperCase()} · Tap to open</div>
          </div>
        </div>
      );
    }
    const parts=(m.text||'').split(/(https?:\/\/[^\s]+)/g);
    return <span style={{ whiteSpace:'pre-wrap',wordBreak:'break-word' }}>{parts.map((p,i)=>p.match(/^https?:\/\//)?<a key={i} href={p} target="_blank" rel="noreferrer" style={{ color:'#93C5FD',textDecoration:'underline' }}>{p}</a>:<span key={i}>{p}</span>)}</span>;
  };

  const grouped=spaceMessages.reduce((acc,m)=>{
    const date=new Date(m.created_at).toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'});
    if(!acc.length||acc[acc.length-1].date!==date)acc.push({date,msgs:[]});
    acc[acc.length-1].msgs.push(m); return acc;
  },[]);

  const DEFAULT_SPACES=[{id:'general',label:'general',icon:'#'},{id:'announcements',label:'announcements',icon:'#'},{id:'random',label:'random',icon:'#'}]; // kept for chat sidebar
  const dmMembers=members.filter(m=>m.email!==myEmail);
  const activeLabel=activeSpace.startsWith('dm-')
    ? (members.find(m=>m.email===activeSpace.slice(3))?.name||activeSpace.slice(3)).split(' ')[0]
    : (customSpaces.find(s=>s.id===activeSpace)?.name||DEFAULT_SPACES.find(s=>s.id===activeSpace)?.label||activeSpace);
  const sharedFiles=spaceMessages.filter(m=>['image','pdf','video','audio','file'].includes(m.type));
  const sharedLinks=spaceMessages.filter(m=>m.type==='text'&&(m.text||'').match(/https?:\/\//));
  const isPinned=(id)=>pinnedMsgs.some(m=>m.id===id);
  const pinMsg=(m)=>{ setPinnedMsgs(p=>isPinned(m.id)?p.filter(x=>x.id!==m.id):[...p,m]); setContextMenu(null); };

  return (
    <div style={{ display:'flex',height:'calc(100vh - 155px)',minHeight:480,borderRadius:14,overflow:'hidden',border:`1px solid ${c.bord}`,background:c.bg }} onClick={()=>{setContextMenu(null);setShowEmoji(false);}}>

      {/* ── LEFT SIDEBAR ───────────────────────────────────────────────── */}
      <div style={{ width:220,flexShrink:0,background:c.dark?'#0F0D2A':'#F3F4FF',borderRight:`1px solid ${c.bord}`,display:'flex',flexDirection:'column',overflow:'hidden' }}>
        {/* Header */}
        <div style={{ padding:'14px 14px 10px',borderBottom:`1px solid ${c.bord}`,flexShrink:0 }}>
          <div style={{ fontSize:14,fontWeight:800,color:c.text,letterSpacing:'-.02em' }}>Chat</div>
        </div>
        <div style={{ flex:1,overflowY:'auto',padding:'8px 6px' }}>
          {/* Spaces */}
          <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'6px 10px 4px',marginTop:4 }}>
            <span style={{ fontSize:11,fontWeight:700,color:c.mut,textTransform:'uppercase',letterSpacing:'.08em' }}>Spaces</span>
            {isManager&&<button onClick={()=>setShowNewSpace(!showNewSpace)} style={{ width:20,height:20,borderRadius:5,background:'transparent',border:'none',color:c.mut,cursor:'pointer',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700 }} title="Create space">+</button>}
          </div>
          {showNewSpace&&isManager&&(
            <div style={{ margin:'4px 6px 8px',padding:'12px',background:c.surf,borderRadius:12,border:`1px solid ${c.bord}` }}>
              <div style={{ fontSize:12,fontWeight:700,color:c.text,marginBottom:8 }}>Create a space</div>
              <input value={newSpaceName} onChange={e=>setNewSpaceName(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')addCustomSpace();if(e.key==='Escape')setShowNewSpace(false);}} placeholder="Space name..." autoFocus style={{ width:'100%',background:c.inp,border:`1px solid ${c.inpB}`,borderRadius:7,padding:'6px 10px',color:c.text,fontSize:12,outline:'none',boxSizing:'border-box',marginBottom:8 }}/>
              <div style={{ fontSize:11,fontWeight:600,color:c.mut,marginBottom:5 }}>What is this space for?</div>
              {[{v:'collaboration',l:'Collaboration',d:'Share files, assign tasks and organise conversations'},{v:'announcements',l:'Announcements',d:'Broadcast and share updates with your group'}].map(t=>(
                <div key={t.v} onClick={()=>setNewSpaceType(t.v)} style={{ display:'flex',alignItems:'flex-start',gap:8,padding:'7px 8px',borderRadius:8,cursor:'pointer',background:newSpaceType===t.v?'rgba(99,102,241,.1)':'transparent',marginBottom:4,border:newSpaceType===t.v?`1px solid rgba(99,102,241,.3)`:`1px solid transparent` }}>
                  <div style={{ width:14,height:14,borderRadius:'50%',border:`2px solid ${newSpaceType===t.v?'#818CF8':'rgba(128,128,128,.4)'}`,background:newSpaceType===t.v?'#818CF8':'transparent',marginTop:1,flexShrink:0 }}/>
                  <div>
                    <div style={{ fontSize:12,fontWeight:600,color:c.text }}>{t.l}</div>
                    <div style={{ fontSize:10,color:c.mut }}>{t.d}</div>
                  </div>
                </div>
              ))}
              <div style={{ display:'flex',gap:5,marginTop:8 }}>
                <button onClick={addCustomSpace} disabled={!newSpaceName.trim()} style={{ flex:1,padding:'6px',borderRadius:7,background:'#6366F1',border:'none',color:'#fff',cursor:'pointer',fontSize:12,fontWeight:600 }}>Create</button>
                <button onClick={()=>setShowNewSpace(false)} style={{ padding:'6px 10px',borderRadius:7,background:'transparent',border:`1px solid ${c.bord}`,color:c.mut,cursor:'pointer',fontSize:12 }}>Cancel</button>
              </div>
            </div>
          )}
          {[...DEFAULT_SPACES,...customSpaces].map(sp=>(
            <div key={sp.id} style={{ display:'flex',alignItems:'center',gap:1 }}
              onMouseEnter={e=>e.currentTarget.querySelector('.sp-actions')&&(e.currentTarget.querySelector('.sp-actions').style.opacity='1')}
              onMouseLeave={e=>e.currentTarget.querySelector('.sp-actions')&&(e.currentTarget.querySelector('.sp-actions').style.opacity='0')}
            >
              <button onClick={()=>setActiveSpace(sp.id)} style={{ flex:1,display:'flex',alignItems:'center',gap:8,padding:'7px 10px',borderRadius:9,border:'none',background:activeSpace===sp.id?(c.dark?'rgba(99,102,241,.2)':'rgba(99,102,241,.12)'):'transparent',color:activeSpace===sp.id?'#818CF8':c.sub,cursor:'pointer',fontSize:13,fontWeight:activeSpace===sp.id?600:400,textAlign:'left' }}>
                <span style={{ fontSize:12,fontWeight:700,color:activeSpace===sp.id?'#818CF8':c.mut,flexShrink:0 }}>{sp.type==='announcements'?'📢':'#'}</span>
                <span style={{ overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{sp.label||sp.name}</span>
              </button>
              <div className="sp-actions" style={{ display:'flex',gap:1,opacity:0,transition:'opacity .15s',flexShrink:0 }}>
                <button onClick={()=>setShowSpaceSettings(sp.id)} style={{ background:'none',border:'none',color:c.mut,cursor:'pointer',fontSize:11,padding:'4px 3px' }} title="Space settings">⚙</button>
                {customSpaces.find(s=>s.id===sp.id)&&isManager&&<button onClick={()=>deleteCustomSpace(sp.id)} style={{ background:'none',border:'none',color:c.mut,cursor:'pointer',fontSize:12,padding:'4px 3px',opacity:.7 }} title="Delete space">✕</button>}
              </div>
            </div>
          ))}

          {/* Direct Messages */}
          <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 10px 4px',marginTop:8 }}>
            <span style={{ fontSize:11,fontWeight:700,color:c.mut,textTransform:'uppercase',letterSpacing:'.08em' }}>Direct messages</span>
            <button onClick={()=>setShowAddDM(!showAddDM)} style={{ width:18,height:18,borderRadius:5,background:'transparent',border:'none',color:c.mut,cursor:'pointer',fontSize:15,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700 }} title="New direct message">+</button>
          </div>
          {showAddDM&&(
            <div style={{ margin:'2px 6px 6px',padding:'8px',background:c.surf,borderRadius:10,border:`1px solid ${c.bord}` }}>
              <input value={dmSearch} onChange={e=>setDmSearch(e.target.value)} placeholder="Search members..." autoFocus style={{ width:'100%',background:c.inp,border:`1px solid ${c.inpB}`,borderRadius:7,padding:'5px 8px',color:c.text,fontSize:11,outline:'none',boxSizing:'border-box',marginBottom:5 }}/>
              {members.filter(m=>m.email!==myEmail&&(!dmSearch||m.name?.toLowerCase().includes(dmSearch.toLowerCase())||m.email?.toLowerCase().includes(dmSearch.toLowerCase()))).map(m=>(
                <div key={m.email} onClick={()=>{setActiveSpace('dm-'+m.email);setShowAddDM(false);setDmSearch('');}} style={{ display:'flex',alignItems:'center',gap:7,padding:'5px 6px',borderRadius:7,cursor:'pointer',fontSize:12,color:c.text }} onMouseEnter={e=>e.currentTarget.style.background='rgba(99,102,241,.1)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <Av member={m} size={20} url={m.avatar_url}/>
                  <span>{m.name||m.email}</span>
                </div>
              ))}
              {members.filter(m=>m.email!==myEmail).length===0&&<div style={{ fontSize:11,color:c.mut }}>No other members in team</div>}
            </div>
          )}
          {dmMembers.length===0&&!showAddDM&&<div style={{ fontSize:12,color:c.mut,padding:'6px 10px' }}>No other members yet</div>}
          {dmMembers.map(m=>{
            const dmKey='dm-'+m.email;
            const isActive=activeSpace===dmKey;
            return(
              <button key={m.email} onClick={()=>setActiveSpace(dmKey)} style={{ display:'flex',alignItems:'center',gap:9,padding:'7px 10px',borderRadius:9,border:'none',background:isActive?(c.dark?'rgba(99,102,241,.2)':'rgba(99,102,241,.12)'):'transparent',color:isActive?'#818CF8':c.sub,cursor:'pointer',fontSize:13,fontWeight:isActive?600:400,textAlign:'left',width:'100%' }}>
                <div style={{ position:'relative',flexShrink:0 }}>
                  <Av member={m} size={22} url={m.avatar_url}/>
                  <div style={{ position:'absolute',bottom:-1,right:-1,width:7,height:7,borderRadius:'50%',background:'#34D399',border:'1.5px solid '+(c.dark?'#0F0D2A':'#F3F4FF') }}/>
                </div>
                <span style={{ overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{(m.name||m.email).split(' ')[0]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── MAIN AREA ──────────────────────────────────────────────────── */}
      <div style={{ flex:1,display:'flex',flexDirection:'column',minWidth:0,background:c.bg }}>

        {/* Header */}
        <div style={{ padding:'0 16px',height:52,display:'flex',alignItems:'center',gap:10,borderBottom:`1px solid ${c.bord}`,background:c.nav,flexShrink:0 }}>
          <span style={{ fontSize:13,fontWeight:700,color:c.mut }}>{activeSpace.startsWith('dm-')?'@':'#'}</span>
          <span style={{ fontSize:14,fontWeight:700,color:c.text }}>{activeLabel}</span>
          {!activeSpace.startsWith('dm-')&&<span style={{ fontSize:12,color:c.mut }}>· {members.length} members</span>}
          <div style={{ flex:1 }}/>
          {pinnedMsgs.length>0&&<button onClick={()=>setShowPinned(!showPinned)} style={{ display:'flex',alignItems:'center',gap:5,padding:'4px 10px',borderRadius:8,border:`1px solid ${c.bord}`,background:'transparent',cursor:'pointer',color:c.mut,fontSize:12 }}>📌 {pinnedMsgs.length}</button>}
          <button onClick={()=>setShowFiles(!showFiles)} title="Files & links" style={{ width:30,height:30,borderRadius:8,border:`1px solid ${c.bord}`,background:showFiles?'rgba(99,102,241,.12)':'transparent',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,color:showFiles?'#818CF8':c.mut }}>🗂️</button>
        </div>

        {/* Pinned messages */}
        {showPinned&&pinnedMsgs.length>0&&(
          <div style={{ padding:'8px 16px',borderBottom:`1px solid ${c.bord}`,background:'rgba(245,158,11,.05)',flexShrink:0,maxHeight:120,overflowY:'auto' }}>
            {pinnedMsgs.map(m=>(
              <div key={m.id} style={{ display:'flex',alignItems:'center',gap:8,padding:'5px 0',borderBottom:`1px solid rgba(245,158,11,.1)` }}>
                <span style={{ fontSize:12,flexShrink:0 }}>📌</span>
                <span style={{ fontSize:12,color:c.sub,flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}><strong>{m.sender_name}:</strong> {m.text||'[attachment]'}</span>
                <button onClick={()=>pinMsg(m)} style={{ background:'none',border:'none',color:c.mut,cursor:'pointer',fontSize:13,flexShrink:0 }}>✕</button>
              </div>
            ))}
          </div>
        )}

        {/* Messages + Files panel */}
        <div style={{ flex:1,display:'flex',minHeight:0 }}>

          {/* Messages */}
          <div style={{ flex:1,overflowY:'auto',padding:'12px 0' }} onClick={()=>{setContextMenu(null);setShowEmoji(false);}}>
            {spaceMessages.length===0&&(
              <div style={{ display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100%',color:c.mut,gap:10 }}>
                <div style={{ fontSize:48 }}>{activeSpace.startsWith('dm-')?'👋':'💬'}</div>
                <div style={{ fontSize:15,fontWeight:600,color:c.text }}>Start the conversation</div>
                <div style={{ fontSize:13,color:c.mut }}>{activeSpace.startsWith('dm-')?'Send a message to '+activeLabel:'This is the start of #'+activeLabel}</div>
              </div>
            )}
            {grouped.map(group=>(
              <div key={group.date}>
                <div style={{ display:'flex',alignItems:'center',gap:10,margin:'16px 16px 8px' }}>
                  <div style={{ flex:1,height:1,background:c.bord }}/>
                  <span style={{ fontSize:11,color:c.mut,fontWeight:600,whiteSpace:'nowrap' }}>{group.date}</span>
                  <div style={{ flex:1,height:1,background:c.bord }}/>
                </div>
                {group.msgs.map((m,mi)=>{
                  const isMe=m.sender_email===myEmail;
                  const member=members.find(x=>x.email===m.sender_email);
                  const avatarUrl=member?.avatar_url||(isMe?myAvatar:undefined);
                  const showAvatar=mi===0||group.msgs[mi-1]?.sender_email!==m.sender_email;
                  const msgReactions=reactions[m.id]||{};
                  return(
                    <div key={m.id}
                      onContextMenu={e=>{e.preventDefault();e.stopPropagation();setContextMenu({msg:m,x:Math.min(e.clientX,window.innerWidth-180),y:Math.min(e.clientY,window.innerHeight-200)});}}
                      style={{ display:'flex',gap:10,padding:'2px 16px',alignItems:'flex-start',position:'relative' }}
                      onMouseEnter={e=>e.currentTarget.querySelector('.msg-actions')?.style&&(e.currentTarget.querySelector('.msg-actions').style.opacity='1')}
                      onMouseLeave={e=>e.currentTarget.querySelector('.msg-actions')?.style&&(e.currentTarget.querySelector('.msg-actions').style.opacity='0')}
                    >
                      {/* Avatar column */}
                      <div style={{ width:36,flexShrink:0,marginTop:showAvatar?2:0 }}>
                        {showAvatar?<Av member={{name:m.sender_name,color:member?.color||'#818CF8'}} size={34} url={avatarUrl}/>:<div style={{ height:20 }}/>}
                      </div>
                      {/* Bubble */}
                      <div style={{ flex:1,minWidth:0 }}>
                        {showAvatar&&(
                          <div style={{ display:'flex',alignItems:'baseline',gap:8,marginBottom:3 }}>
                            <span style={{ fontSize:13,fontWeight:700,color:c.text }}>{m.sender_name}</span>
                            <span style={{ fontSize:10,color:c.mut }}>{new Date(m.created_at).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}</span>
                          </div>
                        )}
                        {/* Reply preview */}
                        {m.reply_to&&(
                          <div style={{ display:'flex',gap:6,alignItems:'center',marginBottom:4,padding:'4px 8px',borderRadius:6,background:c.surf,borderLeft:`3px solid #818CF8`,maxWidth:320 }}>
                            <span style={{ fontSize:11,color:'#818CF8',fontWeight:600 }}>{m.reply_to.name}</span>
                            <span style={{ fontSize:11,color:c.mut,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{m.reply_to.text}</span>
                          </div>
                        )}
                        {/* Message content */}
                        <div style={{ fontSize:14,color:c.text,lineHeight:1.5,maxWidth:'80%' }}>
                          {renderMsg(m)}
                        </div>
                        {isPinned(m.id)&&<span style={{ fontSize:10 }}>📌</span>}
                        {/* Reactions */}
                        {Object.keys(msgReactions).length>0&&(
                          <div style={{ display:'flex',flexWrap:'wrap',gap:4,marginTop:5 }}>
                            {Object.entries(msgReactions).map(([emoji,users])=>users.length>0&&(
                              <button key={emoji} onClick={()=>addReaction(m.id,emoji)} style={{ display:'flex',alignItems:'center',gap:3,padding:'2px 8px',borderRadius:20,background:users.includes(myEmail)?'rgba(99,102,241,.2)':'rgba(255,255,255,.06)',border:`1px solid ${users.includes(myEmail)?'rgba(99,102,241,.4)':c.bord}`,cursor:'pointer',fontSize:13 }}>
                                <span>{emoji}</span><span style={{ fontSize:11,color:c.mut,fontWeight:600 }}>{users.length}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      {/* Hover actions */}
                      <div className="msg-actions" style={{ opacity:0,transition:'opacity .15s',position:'absolute',right:16,top:-2,display:'flex',gap:2,background:c.nav,border:`1px solid ${c.bord}`,borderRadius:10,padding:'2px 4px',zIndex:10 }}>
                        {['👍','❤️','😂','🎉'].map(e=>(
                          <button key={e} onClick={()=>addReaction(m.id,e)} style={{ width:28,height:28,borderRadius:7,border:'none',background:'transparent',cursor:'pointer',fontSize:15,display:'flex',alignItems:'center',justifyContent:'center' }} title={'React '+e}>{e}</button>
                        ))}
                        <button onClick={()=>{setReplyTo(m);inputRef.current?.focus();}} style={{ width:28,height:28,borderRadius:7,border:'none',background:'transparent',cursor:'pointer',fontSize:13,display:'flex',alignItems:'center',justifyContent:'center',color:c.mut }} title="Reply">↩</button>
                        <button onClick={()=>pinMsg(m)} style={{ width:28,height:28,borderRadius:7,border:'none',background:'transparent',cursor:'pointer',fontSize:13,display:'flex',alignItems:'center',justifyContent:'center',color:c.mut }} title="Pin">📌</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
            <div ref={bottomRef}/>
          </div>

          {/* Files/Links sidebar */}
          {showFiles&&(
            <div style={{ width:240,flexShrink:0,borderLeft:`1px solid ${c.bord}`,background:c.dark?'rgba(10,8,30,.95)':'rgba(230,234,255,.9)',display:'flex',flexDirection:'column' }}>
              <div style={{ padding:'14px 14px 12px',borderBottom:`1px solid ${c.bord}`,display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0 }}>
                <span style={{ fontSize:13,fontWeight:700,color:c.text }}>Files & Links</span>
                <button onClick={()=>setShowFiles(false)} style={{ background:'none',border:'none',color:c.mut,cursor:'pointer',fontSize:18,lineHeight:1 }}>✕</button>
              </div>
              <div style={{ flex:1,overflowY:'auto',padding:'10px' }}>
                {sharedFiles.length>0&&<>
                  <div style={{ fontSize:11,fontWeight:700,color:c.mut,textTransform:'uppercase',letterSpacing:'.07em',marginBottom:8 }}>Files ({sharedFiles.length})</div>
                  {sharedFiles.map(m=>(
                    <div key={m.id} onClick={()=>openFile(m.url,m.filename)} style={{ display:'flex',alignItems:'center',gap:8,padding:'9px',borderRadius:9,background:c.surf,marginBottom:7,cursor:'pointer',border:`1px solid ${c.bord}`,transition:'background .1s' }}>
                      <span style={{ fontSize:22,flexShrink:0 }}>{m.type==='image'?'🖼️':m.type==='pdf'?'📄':m.type==='video'?'🎬':m.type==='audio'?'🎵':'📎'}</span>
                      <div style={{ flex:1,minWidth:0 }}>
                        <div style={{ fontSize:12,fontWeight:600,color:c.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{m.filename||m.type}</div>
                        <div style={{ fontSize:10,color:c.mut }}>{m.sender_name} · {new Date(m.created_at).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}</div>
                      </div>
                    </div>
                  ))}
                </>}
                {sharedLinks.length>0&&<>
                  <div style={{ fontSize:11,fontWeight:700,color:c.mut,textTransform:'uppercase',letterSpacing:'.07em',margin:'12px 0 8px' }}>Links ({sharedLinks.length})</div>
                  {sharedLinks.map(m=>{
                    const urls=(m.text||'').match(/https?:\/\/[^\s]+/g)||[];
                    return urls.map((url,i)=>(
                      <a key={m.id+i} href={url} target="_blank" rel="noreferrer" style={{ display:'block',padding:'8px',borderRadius:9,background:c.surf,marginBottom:7,border:`1px solid ${c.bord}`,textDecoration:'none' }}>
                        <div style={{ fontSize:12,color:'#93C5FD',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{url}</div>
                        <div style={{ fontSize:10,color:c.mut,marginTop:2 }}>{m.sender_name}</div>
                      </a>
                    ));
                  })}
                </>}
                {sharedFiles.length===0&&sharedLinks.length===0&&<div style={{ fontSize:12,color:c.mut,textAlign:'center',padding:'24px 0' }}>No files or links yet</div>}
              </div>
            </div>
          )}
        </div>

        {showSpaceSettings&&<SpaceSettingsModal spaceId={showSpaceSettings} customSpaces={customSpaces} members={members} isManager={isManager} onClose={()=>setShowSpaceSettings(null)} updateSpaceSettings={updateSpaceSettings} addMemberToSpace={addMemberToSpace} removeMemberFromSpace={removeMemberFromSpace} setCustomSpaces={setCustomSpaces} getSpaceSettings={getSpaceSettings}/>}
      {/* Context menu */}
        {contextMenu&&(
          <div style={{ position:'fixed',left:contextMenu.x,top:contextMenu.y,zIndex:9999,background:c.dark?'rgba(18,15,50,.98)':'#fff',border:`1px solid ${c.bord}`,borderRadius:12,padding:6,boxShadow:'0 8px 30px rgba(0,0,0,.25)',minWidth:180 }} onClick={e=>e.stopPropagation()}>
            <div style={{ padding:'6px 10px 4px',borderBottom:`1px solid ${c.bord}`,marginBottom:4 }}>
              <div style={{ fontSize:11,color:c.mut,marginBottom:6 }}>React</div>
              <div style={{ display:'flex',gap:4 }}>{EMOJI_LIST.slice(0,8).map(e=><button key={e} onClick={()=>addReaction(contextMenu.msg.id,e)} style={{ width:30,height:30,borderRadius:8,border:'none',background:'transparent',cursor:'pointer',fontSize:17 }}>{e}</button>)}</div>
            </div>
            {[
              {l:'↩️  Reply',a:()=>{setReplyTo(contextMenu.msg);setContextMenu(null);inputRef.current?.focus();}},
              {l:isPinned(contextMenu.msg.id)?'📌 Unpin':'📌 Pin message',a:()=>pinMsg(contextMenu.msg)},
              {l:'📋 Copy text',a:()=>{navigator.clipboard?.writeText(contextMenu.msg.text||'');setContextMenu(null);}},
            ].map(item=>(
              <button key={item.l} onClick={item.a} style={{ display:'block',width:'100%',padding:'8px 12px',borderRadius:8,border:'none',background:'transparent',color:c.text,cursor:'pointer',fontSize:13,textAlign:'left',fontWeight:400 }}
                onMouseEnter={e=>{e.target.style.background=c.dark?'rgba(255,255,255,.06)':'rgba(0,0,0,.05)';}}
                onMouseLeave={e=>{e.target.style.background='transparent';}}
              >{item.l}</button>
            ))}
          </div>
        )}

        {/* Input area */}
        <div style={{ padding:'0 16px 14px',flexShrink:0 }}>
          {/* Reply preview */}
          {replyTo&&(
            <div style={{ display:'flex',alignItems:'center',gap:10,padding:'7px 12px',borderRadius:'10px 10px 0 0',background:c.surf,border:`1px solid ${c.bord}`,borderBottom:'none',marginBottom:-1 }}>
              <span style={{ fontSize:12 }}>↩️</span>
              <span style={{ fontSize:12,color:c.mut,flex:1 }}>Replying to <strong style={{ color:'#818CF8' }}>{replyTo.sender_name}</strong>: {(replyTo.text||'[attachment]').slice(0,60)}</span>
              <button onClick={()=>setReplyTo(null)} style={{ background:'none',border:'none',color:c.mut,cursor:'pointer',fontSize:16 }}>✕</button>
            </div>
          )}

          {/* GIF picker */}
          {showGif&&(
            <div style={{ padding:'10px',background:c.surf,border:`1px solid ${c.bord}`,borderRadius:replyTo?'0':'10px 10px 0 0',borderBottom:'none',marginBottom:-1 }}>
              <div style={{ display:'flex',gap:7,marginBottom:8 }}>
                <input value={gifSearch} onChange={e=>setGifSearch(e.target.value)} onKeyDown={e=>e.key==='Enter'&&searchGifs(gifSearch)} placeholder="Search GIFs..." style={{ flex:1,background:c.inp,border:`1px solid ${c.inpB}`,borderRadius:8,padding:'6px 10px',color:c.text,fontSize:12,outline:'none' }}/>
                <Btn onClick={()=>searchGifs(gifSearch)} loading={gifLoading} style={{ padding:'6px 12px',fontSize:12 }}>Search</Btn>
              </div>
              <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:5,maxHeight:160,overflowY:'auto' }}>
                {gifs.map(g=><img key={g.id} src={g.images.fixed_height_small.url} alt={g.title} onClick={()=>{sendMsg('','gif',g.images.original.url);setShowGif(false);}} style={{ width:'100%',borderRadius:7,cursor:'pointer',objectFit:'cover',height:70 }}/>)}
              </div>
            </div>
          )}

          {/* Emoji picker */}
          {showEmoji&&(
            <div style={{ padding:'10px',background:c.dark?'rgba(18,15,50,.98)':'#fff',border:`1px solid ${c.bord}`,borderRadius:'10px 10px 0 0',borderBottom:'none',marginBottom:-1,boxShadow:'0 -4px 20px rgba(0,0,0,.15)' }} onClick={e=>e.stopPropagation()}>
              <div style={{ display:'flex',gap:2,marginBottom:8,borderBottom:`1px solid ${c.bord}`,paddingBottom:6 }}>
                {Object.keys(EMOJI_GROUPS).map(g=>(
                  <button key={g} onClick={()=>setEmojiGroup(g)} style={{ padding:'4px 10px',borderRadius:8,border:'none',background:emojiGroup===g?'rgba(99,102,241,.15)':'transparent',color:emojiGroup===g?'#818CF8':c.mut,cursor:'pointer',fontSize:12,fontWeight:emojiGroup===g?700:400 }}>{g}</button>
                ))}
              </div>
              <div style={{ display:'grid',gridTemplateColumns:'repeat(9,1fr)',gap:2,maxHeight:160,overflowY:'auto' }}>
                {EMOJI_GROUPS[emojiGroup].map(e=>(
                  <button key={e} onClick={()=>{setMsg(m=>m+e);inputRef.current?.focus();}} style={{ width:32,height:32,borderRadius:7,border:'none',background:'transparent',cursor:'pointer',fontSize:20,display:'flex',alignItems:'center',justifyContent:'center' }}
                    onMouseEnter={ev=>ev.target.style.background=c.dark?'rgba(255,255,255,.08)':'rgba(0,0,0,.06)'}
                    onMouseLeave={ev=>ev.target.style.background='transparent'}
                  >{e}</button>
                ))}
              </div>
            </div>
          )}

          {/* Main input */}
          <div style={{ display:'flex',alignItems:'center',gap:7,padding:'8px 12px',background:c.surf,border:`1px solid ${c.bord}`,borderRadius:(replyTo||showGif||showEmoji)?'0 0 12px 12px':'12px',boxShadow:'0 1px 4px rgba(0,0,0,.06)' }}>
            <input ref={fileRef} type="file" accept="image/*,video/*" onChange={handleFile} style={{ display:'none' }}/>
            <input ref={attachRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.mp3,.wav,.ogg,video/*,image/*,application/*" onChange={handleFile} style={{ display:'none' }}/>
            <button onClick={e=>{e.stopPropagation();setShowEmoji(!showEmoji);setShowGif(false);}} title="Emoji" style={{ width:32,height:32,borderRadius:8,border:'none',background:'transparent',cursor:'pointer',fontSize:20,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>😊</button>
            <button onClick={()=>{attachRef.current.click();}} title="Attach file" style={{ width:32,height:32,borderRadius:8,border:'none',background:'transparent',cursor:'pointer',fontSize:17,display:'flex',alignItems:'center',justifyContent:'center',color:c.mut,flexShrink:0 }}>📎</button>
            <button onClick={()=>{fileRef.current.click();}} title="Image" style={{ width:32,height:32,borderRadius:8,border:'none',background:'transparent',cursor:'pointer',fontSize:17,display:'flex',alignItems:'center',justifyContent:'center',color:c.mut,flexShrink:0 }}>🖼️</button>
            <button onClick={e=>{e.stopPropagation();setShowGif(!showGif);setShowEmoji(false);}} title="GIF" style={{ height:28,padding:'0 8px',borderRadius:8,border:`1px solid ${c.bord}`,background:'transparent',cursor:'pointer',fontSize:11,fontWeight:700,color:c.mut,flexShrink:0 }}>GIF</button>
            <input ref={inputRef} value={msg} onChange={e=>setMsg(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMsg(msg);}}} placeholder={'Message '+(activeSpace.startsWith('dm-')?'@ ':'# ')+activeLabel} style={{ flex:1,background:'transparent',border:'none',color:c.text,fontSize:14,outline:'none',lineHeight:1.4 }}/>
            <button onClick={()=>sendMsg(msg)} disabled={!msg.trim()} style={{ width:34,height:34,borderRadius:9,background:msg.trim()?'#6366F1':'transparent',border:msg.trim()?'none':`1px solid ${c.bord}`,color:msg.trim()?'#fff':c.mut,cursor:msg.trim()?'pointer':'default',display:'flex',alignItems:'center',justifyContent:'center',fontSize:17,flexShrink:0,transition:'all .15s' }}>↑</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── REMINDERS ─────────────────────────────────────────────────────────────
function RemindersPanel() {
  const c=useC();
  const [reminders,setReminders]=useState([
    {id:'r1',label:'Standup starting soon',enabled:true,minutes:10},
    {id:'r2',label:'Task deadline reminder',enabled:true,minutes:60},
    {id:'r3',label:'EOD incomplete tasks',enabled:true,time:'18:00'},
    {id:'r4',label:'Blocker follow-up',enabled:false,minutes:120},
  ]);
  const [saved,setSaved]=useState(false);
  const toggle=id=>setReminders(p=>p.map(r=>r.id===id?{...r,enabled:!r.enabled}:r));
  const updateMins=(id,v)=>setReminders(p=>p.map(r=>r.id===id?{...r,minutes:parseInt(v)||0}:r));
  const save=()=>{setSaved(true);setTimeout(()=>setSaved(false),2000);};
  return(
    <div>
      <div style={{ fontSize:15,fontWeight:700,color:c.text,marginBottom:4 }}>Reminders</div>
      <div style={{ fontSize:13,color:c.mut,marginBottom:18 }}>Email reminders for your team. Requires REACT_APP_RESEND_KEY.</div>
      <div style={{ display:'flex',flexDirection:'column',gap:10,marginBottom:18 }}>
        {reminders.map(r=>(
          <Card key={r.id} style={{ padding:'14px 16px' }}>
            <div style={{ display:'flex',alignItems:'center',gap:10 }}>
              <div style={{ flex:1 }}><div style={{ fontSize:13,fontWeight:600,color:c.text,marginBottom:2 }}>{r.label}</div><div style={{ fontSize:12,color:c.mut }}>{r.time?`Fires at ${r.time} if pending`:`${r.minutes} minutes before`}</div></div>
              {!r.time&&r.enabled&&<div style={{ display:'flex',alignItems:'center',gap:5 }}><input type="number" value={r.minutes} onChange={e=>updateMins(r.id,e.target.value)} min="5" max="480" style={{ width:56,background:c.inp,border:`1px solid ${c.inpB}`,borderRadius:7,padding:'4px 7px',color:c.text,fontSize:12,outline:'none',textAlign:'center' }}/><span style={{ fontSize:11,color:c.mut }}>min</span></div>}
              <button onClick={()=>toggle(r.id)} style={{ width:42,height:22,borderRadius:11,border:'none',background:r.enabled?'#6366F1':'rgba(128,128,128,.3)',cursor:'pointer',position:'relative',transition:'background .2s',flexShrink:0 }}><div style={{ width:16,height:16,borderRadius:'50%',background:'#fff',position:'absolute',top:3,left:r.enabled?23:3,transition:'left .2s',boxShadow:'0 1px 3px rgba(0,0,0,.2)' }}/></button>
            </div>
          </Card>
        ))}
      </div>
      <Btn onClick={save}>{saved?'✓ Saved!':'Save reminders'}</Btn>
    </div>
  );
}

// ─── GOOGLE CALENDAR ─────────────────────────────────────────────────────
function CalendarPanel({ team, session, members, onInviteMember }) {
  const c=useC();
  // Persist connection status so tab switches don't disconnect
  const [status,setStatus]=useState(()=>localStorage.getItem('ss-cal-status')||'idle');
  const [events,setEvents]=useState([]);
  const [view,setView]=useState('week');
  const [currentDate,setCurrentDate]=useState(new Date());
  const [selectedEvent,setSelectedEvent]=useState(null);
  const [error,setError]=useState('');
  const [detectedStandups,setDetectedStandups]=useState([]);
  const [selectedStandup,setSelectedStandup]=useState(null);
  const [showStandupPicker,setShowStandupPicker]=useState(false);
  const CLIENT_ID=process.env.REACT_APP_GOOGLE_CLIENT_ID;
  const SCOPES='https://www.googleapis.com/auth/calendar.readonly';

  // Auto-reconnect silently when component mounts (no popup shown)
  useEffect(()=>{
    if(status==='connected'&&events.length===0&&CLIENT_ID){
      setStatus('loading');
      reconnectSilent();
    }
    // Safety: if stuck on loading, reset after 8s
    if(status==='loading'){
      const t=setTimeout(()=>setStatus(s=>s==='loading'?'idle':s),8000);
      return()=>clearTimeout(t);
    }
  },[]);

  const reconnectSilent=async()=>{
    if(!CLIENT_ID)return;
    try{
      await Promise.all([
        loadScript('https://apis.google.com/js/api.js'),
        loadScript('https://accounts.google.com/gsi/client'),
      ]);
      await new Promise(res=>window.gapi.load('client',res));
      await window.gapi.client.init({});
      await window.gapi.client.load('https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest');
      const tc=window.google.accounts.oauth2.initTokenClient({
        client_id:CLIENT_ID,scope:SCOPES,
        callback:async(resp)=>{
          if(!resp.error){ await fetchEvents(); }
          else { console.log('Silent reconnect failed — need manual connect'); setStatus('idle'); }
        },
      });
      // prompt:'' = silent, no popup
      tc.requestAccessToken({prompt:''});
    }catch(e){
      console.warn('Calendar reconnect error:',e.message);
      setStatus('idle');
    }
  };

  // Load a script tag and resolve when ready
  const loadScript=(src)=>new Promise((res,rej)=>{
    if(document.querySelector('script[src="'+src+'"]')){res();return;}
    const s=document.createElement('script');
    s.src=src; s.onload=res; s.onerror=()=>rej(new Error('Failed to load: '+src));
    document.head.appendChild(s);
  });

  const connect=async()=>{
    if(!CLIENT_ID){
      setError('REACT_APP_GOOGLE_CLIENT_ID not set. Complete setup steps below then redeploy.');
      setStatus('error'); return;
    }
    setStatus('loading'); setError('');
    try {
      // Step 1: Load both scripts in parallel
      await Promise.all([
        loadScript('https://apis.google.com/js/api.js'),
        loadScript('https://accounts.google.com/gsi/client'),
      ]);

      // Step 2: Load gapi client
      await new Promise(res=>window.gapi.load('client',res));

      // Step 3: Init gapi client (no API key needed for OAuth flow)
      await window.gapi.client.init({});

      // Step 4: Load calendar API explicitly
      await window.gapi.client.load('https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest');

      // Step 5: Init token client (GIS)
      const tokenClient=window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: async(resp)=>{
          if(resp.error){
            setError('Google auth error: '+resp.error+'. Make sure your domain is in Authorised JavaScript origins in Google Cloud Console.');
            setStatus('error'); return;
          }
          await fetchEvents();
        },
      });

      // Step 6: Request token — opens Google popup
      tokenClient.requestAccessToken({ prompt: 'consent' });

    } catch(e) {
      console.error('Calendar connect error:', e);
      setError('Setup error: '+e.message+'. Check browser console for details.');
      setStatus('error');
    }
  };

  const fetchEvents=async(centerDate)=>{
    try {
      const base=centerDate||new Date();
      // Fetch 6 months around current date so all views have data
      const start=new Date(base.getFullYear(),base.getMonth()-3,1).toISOString();
      const end=new Date(base.getFullYear(),base.getMonth()+4,0).toISOString();
      const resp=await window.gapi.client.calendar.events.list({
        calendarId:'primary',
        timeMin:start,
        timeMax:end,
        showDeleted:false,
        singleEvents:true,
        maxResults:500,
        orderBy:'startTime',
      });
      const items=resp.result.items||[];
      setEvents(items);
      setStatus('connected');
      // Scroll to current time in week view after events load
      setTimeout(()=>{
        const el=document.getElementById('cal-week-scroll');
        if(el){ const now=new Date(); el.scrollTop=Math.max(0,(now.getHours()-1)*48); }
      },200);
      // Auto-detect recurring standup meetings
      const recurring=items.filter(ev=>ev.recurrence||ev.recurringEventId);
      const standupKeywords=['standup','stand-up','stand up','daily','dsu','scrum'];
      const standups=recurring.filter(ev=>standupKeywords.some(k=>(ev.summary||'').toLowerCase().includes(k)));
      if(standups.length>0) setDetectedStandups([...new Map(standups.map(e=>[e.summary,e])).values()]);
    } catch(e) {
      console.error('fetchEvents error:', e);
      setError('Failed to load events: '+(e.result?.error?.message||e.message));
      setStatus('error');
    }
  };

  const disconnect=()=>{
    setStatus('idle');setEvents([]);setSelectedEvent(null);setError('');
    localStorage.removeItem('ss-cal-status');
  };

  // Save status to localStorage whenever it changes
  useEffect(()=>{
    localStorage.setItem('ss-cal-status',status);
  },[status]);

  // Calendar helpers
  const getDaysInMonth=(date)=>{
    const year=date.getFullYear(),month=date.getMonth();
    const first=new Date(year,month,1);
    const days=[];
    const startDay=first.getDay();
    for(let i=0;i<startDay;i++)days.push(null);
    const total=new Date(year,month+1,0).getDate();
    for(let d=1;d<=total;d++)days.push(new Date(year,month,d));
    return days;
  };

  const toYMD=(date)=>{
    const y=date.getFullYear();
    const m=String(date.getMonth()+1).padStart(2,'0');
    const d=String(date.getDate()).padStart(2,'0');
    return y+'-'+m+'-'+d;
  };

  const getEventsForDay=(date)=>{
    if(!date)return[];
    const ymd=toYMD(date); // "2026-06-15"
    return events.filter(ev=>{
      if(ev.start?.dateTime){
        // Parse the dateTime and get its LOCAL date (not UTC)
        const evLocal=new Date(ev.start.dateTime);
        return toYMD(evLocal)===ymd;
      }
      if(ev.start?.date){
        return ev.start.date===ymd;
      }
      return false;
    }).sort((a,b)=>{
      const ta=new Date(a.start?.dateTime||a.start?.date+'T00:00:00');
      const tb=new Date(b.start?.dateTime||b.start?.date+'T00:00:00');
      return ta-tb;
    });
  };

  const getWeekDays=(date)=>{
    // Fix: create new Date objects, don't mutate
    const sunday=new Date(date);
    sunday.setDate(date.getDate()-date.getDay());
    sunday.setHours(0,0,0,0);
    return Array.from({length:7},(_,i)=>{
      const d=new Date(sunday);
      d.setDate(sunday.getDate()+i);
      return d;
    });
  };

  const fmtTime=(iso)=>{
    if(!iso)return'All day';
    return new Date(iso).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
  };

  const fmtDate=(date)=>date.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'});

  const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
  const DAYS=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  const navigate=(dir)=>{
    const d=new Date(currentDate);
    if(view==='week') d.setDate(d.getDate()+(dir*7));
    else d.setMonth(d.getMonth()+dir);
    setCurrentDate(d);
    // Reload events if navigating outside current fetch range
    const now=new Date();
    const monthsDiff=(d.getFullYear()-now.getFullYear())*12+(d.getMonth()-now.getMonth());
    if(Math.abs(monthsDiff)>2) fetchEvents(d);
  };
  const navPrev=()=>navigate(-1);
  const navNext=()=>navigate(1);

  const eventColor=(ev)=>{
    const colors={'1':'#ac725e','2':'#d06b64','3':'#f83a22','4':'#fa573c','5':'#ff7537','6':'#ffad46','7':'#42d692','8':'#16a765','9':'#7bd148','10':'#b3dc6c','11':'#fbe983','default':'#6366F1'};
    return colors[ev.colorId]||'#6366F1';
  };

  // ── NOT CONNECTED ──────────────────────────────────────────────────────────
  if(status==='idle'||status==='error') return(
    <div style={{ maxWidth:560,margin:'0 auto',padding:'20px 0' }}>
      <div style={{ textAlign:'center',marginBottom:28 }}>
        <div style={{ fontSize:52,marginBottom:14 }}>📅</div>
        <h2 style={{ fontSize:20,fontWeight:700,color:c.text,marginBottom:8 }}>Google Calendar</h2>
        <p style={{ fontSize:13,color:c.mut,lineHeight:1.7 }}>Connect your Google Calendar to see meetings, dates, and import attendees as team members.</p>
      </div>
      {error&&<div style={{ background:'rgba(239,68,68,.1)',border:'1px solid rgba(239,68,68,.25)',borderRadius:10,padding:'12px 16px',fontSize:13,color:'#F87171',marginBottom:16 }}>{error}</div>}
      {!CLIENT_ID?(
        <div style={{ background:'rgba(245,158,11,.06)',border:'1px solid rgba(245,158,11,.2)',borderRadius:14,padding:'20px 22px',marginBottom:20 }}>
          <div style={{ fontSize:14,fontWeight:700,color:'#FCD34D',marginBottom:14 }}>One-time setup needed (5 min)</div>
          {[
            ['1','Go to console.cloud.google.com → Create/select a project'],
            ['2','APIs & Services → Library → search "Google Calendar API" → Enable'],
            ['3','APIs & Services → OAuth consent screen → External → App name: StandSync → Save'],
            ['4','APIs & Services → Credentials → + Create → OAuth 2.0 Client ID → Web application'],
            ['5','Authorised JavaScript origins → add: https://standsync-olive.vercel.app'],
            ['6','Authorised redirect URIs → add: https://yqvzmbwaofplxzejiavw.supabase.co/auth/v1/callback'],
            ['7','Copy Client ID → Vercel → Environment Variables → REACT_APP_GOOGLE_CLIENT_ID'],
            ['8','Supabase → Authentication → Providers → Google → Enable → paste Client ID + Secret → Save'],
          ].map(([n,s])=>(
            <div key={n} style={{ display:'flex',gap:12,marginBottom:10,alignItems:'flex-start' }}>
              <div style={{ width:22,height:22,borderRadius:'50%',background:'rgba(245,158,11,.2)',color:'#FCD34D',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,flexShrink:0,marginTop:1 }}>{n}</div>
              <div style={{ fontSize:13,color:c.sub,lineHeight:1.5 }}>{s}</div>
            </div>
          ))}
          <div style={{ marginTop:14,padding:'10px 14px',background:'rgba(99,102,241,.08)',borderRadius:8,fontSize:12,color:'#818CF8' }}>
            After completing these steps, add REACT_APP_GOOGLE_CLIENT_ID to Vercel and redeploy. The Connect button will then work.
          </div>
        </div>
      ):(
        <div style={{ textAlign:'center' }}>
          <Btn onClick={connect} style={{ padding:'13px 32px',fontSize:15,margin:'0 auto' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" style={{ flexShrink:0 }}>
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Connect Google Calendar
          </Btn>
          <p style={{ fontSize:12,color:c.mut,marginTop:10 }}>Opens Google sign-in to grant calendar access</p>
        </div>
      )}
    </div>
  );

  if(status==='loading') return(
    <div style={{ display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:60,gap:16 }}>
      <Spin size={36}/>
      <div style={{ fontSize:14,color:c.mut }}>Connecting to Google Calendar...</div>
    </div>
  );

  // ── CONNECTED — full calendar ──────────────────────────────────────────────
  const weekDays=getWeekDays(currentDate);
  const monthDays=getDaysInMonth(currentDate);
  const today=new Date();

  return(
    <div>
      {/* Standup picker banner */}
      {detectedStandups.length>0&&!selectedStandup&&(
        <div style={{ background:'rgba(99,102,241,.08)',border:'1px solid rgba(99,102,241,.25)',borderRadius:12,padding:'14px 18px',marginBottom:16,display:'flex',alignItems:'center',gap:14,flexWrap:'wrap' }}>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:14,fontWeight:700,color:c.text,marginBottom:3 }}>📅 Standup meetings detected!</div>
            <div style={{ fontSize:12,color:c.mut }}>Select your standup to link tasks and team to this recurring meeting</div>
          </div>
          <Btn onClick={()=>setShowStandupPicker(true)} style={{ flexShrink:0,padding:'8px 18px',fontSize:13 }}>Select standup →</Btn>
        </div>
      )}
      {selectedStandup&&(
        <div style={{ background:'rgba(52,211,153,.06)',border:'1px solid rgba(52,211,153,.2)',borderRadius:12,padding:'12px 18px',marginBottom:16,display:'flex',alignItems:'center',gap:12 }}>
          <span style={{ fontSize:18 }}>✅</span>
          <div style={{ flex:1 }}><div style={{ fontSize:13,fontWeight:700,color:'#34D399' }}>Linked: {selectedStandup.summary}</div><div style={{ fontSize:11,color:c.mut }}>{selectedStandup.attendees?.length||0} attendees · recurring</div></div>
          <button onClick={()=>setSelectedStandup(null)} style={{ fontSize:12,color:c.mut,background:'none',border:'none',cursor:'pointer' }}>Change</button>
        </div>
      )}
      {/* Standup picker modal */}
      {showStandupPicker&&(
        <Modal onClose={()=>setShowStandupPicker(false)} title="Select your standup meeting" width={500}>
          <p style={{ fontSize:13,color:c.mut,marginBottom:16 }}>These recurring meetings were detected in your calendar. Select the one that is your daily standup.</p>
          <div style={{ display:'flex',flexDirection:'column',gap:8,marginBottom:20 }}>
            {detectedStandups.map(ev=>(
              <div key={ev.id} onClick={()=>{setSelectedStandup(ev);setShowStandupPicker(false);}} style={{ padding:'12px 16px',borderRadius:10,border:`1.5px solid ${selectedStandup?.id===ev.id?'#6366F1':c.bord}`,background:selectedStandup?.id===ev.id?'rgba(99,102,241,.1)':c.surf,cursor:'pointer',transition:'all .2s' }}>
                <div style={{ display:'flex',alignItems:'center',gap:10 }}>
                  <div style={{ width:10,height:10,borderRadius:'50%',background:eventColor(ev),flexShrink:0 }}/>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:14,fontWeight:600,color:c.text }}>{ev.summary}</div>
                    <div style={{ fontSize:12,color:c.mut,marginTop:2 }}>{fmtTime(ev.start?.dateTime)} · {ev.attendees?.length||0} attendees · recurring</div>
                  </div>
                </div>
                {ev.attendees&&ev.attendees.length>0&&(
                  <div style={{ marginTop:8,paddingTop:8,borderTop:`1px solid ${c.bord}`,display:'flex',flexWrap:'wrap',gap:4 }}>
                    {ev.attendees.slice(0,6).map(a=><span key={a.email} style={{ fontSize:10,background:'rgba(99,102,241,.1)',color:'#818CF8',padding:'2px 7px',borderRadius:20 }}>{a.displayName||a.email}</span>)}
                    {ev.attendees.length>6&&<span style={{ fontSize:10,color:c.mut }}>+{ev.attendees.length-6} more</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
          <Btn v="ghost" onClick={()=>setShowStandupPicker(false)} style={{ width:'100%',justifyContent:'center' }}>Skip for now</Btn>
        </Modal>
      )}
      {/* Toolbar */}
      <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:16,flexWrap:'wrap' }}>
        <div style={{ display:'flex',alignItems:'center',gap:6 }}>
          <div style={{ width:8,height:8,borderRadius:'50%',background:'#34D399' }}/>
          <span style={{ fontSize:13,color:'#34D399',fontWeight:600 }}>Google Calendar</span>
          <span style={{ fontSize:12,color:c.mut }}>· {events.length} events loaded</span>
        </div>
        <div style={{ flex:1 }}/>
        {/* View toggle */}
        <div style={{ display:'flex',gap:4,background:c.surf,borderRadius:10,padding:4,border:`1px solid ${c.bord}` }}>
          {['week','month','agenda'].map(v=>(
            <button key={v} onClick={()=>setView(v)} style={{ padding:'5px 12px',borderRadius:7,border:'none',background:view===v?'rgba(99,102,241,.2)':'transparent',color:view===v?'#818CF8':c.mut,cursor:'pointer',fontSize:12,fontWeight:view===v?700:400,textTransform:'capitalize' }}>{v}</button>
          ))}
        </div>
        {/* Nav */}
        <button onClick={navPrev} style={{ width:30,height:30,borderRadius:8,border:`1px solid ${c.bord}`,background:'transparent',cursor:'pointer',color:c.text,fontSize:16,display:'flex',alignItems:'center',justifyContent:'center' }}>‹</button>
        <button onClick={()=>setCurrentDate(new Date())} style={{ padding:'5px 12px',borderRadius:8,border:`1px solid ${c.bord}`,background:'transparent',cursor:'pointer',color:c.text,fontSize:12 }}>Today</button>
        <button onClick={navNext} style={{ width:30,height:30,borderRadius:8,border:`1px solid ${c.bord}`,background:'transparent',cursor:'pointer',color:c.text,fontSize:16,display:'flex',alignItems:'center',justifyContent:'center' }}>›</button>
        <div style={{ fontSize:14,fontWeight:700,color:c.text,minWidth:140 }}>
          {view==='week'?fmtDate(weekDays[0])+' – '+fmtDate(weekDays[6]):MONTHS[currentDate.getMonth()]+' '+currentDate.getFullYear()}
        </div>
        <button onClick={disconnect} style={{ fontSize:12,color:c.mut,background:'none',border:'none',cursor:'pointer' }}>Disconnect</button>
      </div>

      {/* WEEK VIEW */}
      {view==='week'&&(
        <Card style={{ overflow:'hidden' }}>
          {/* Day headers */}
          <div style={{ display:'grid',gridTemplateColumns:'52px repeat(7,1fr)',borderBottom:`1px solid ${c.bord}`,background:c.surf }}>
            <div/>
            {weekDays.map((day,i)=>{
              const isToday=day.toDateString()===today.toDateString();
              const dayEvts=getEventsForDay(day);
              return(
                <div key={i} style={{ padding:'10px 8px',textAlign:'center',borderLeft:`1px solid ${c.bord}`,background:isToday?'rgba(99,102,241,.04)':'transparent' }}>
                  <div style={{ fontSize:11,color:isToday?'#6366F1':c.mut,textTransform:'uppercase',letterSpacing:'.06em',fontWeight:600,marginBottom:5 }}>{DAYS[i]}</div>
                  <div style={{ display:'inline-flex',alignItems:'center',justifyContent:'center',width:32,height:32,borderRadius:'50%',background:isToday?'#6366F1':'transparent',fontSize:14,fontWeight:isToday?700:400,color:isToday?'#fff':c.text }}>{day.getDate()}</div>
                  {dayEvts.length>0&&<div style={{ fontSize:9,color:c.mut,marginTop:3 }}>{dayEvts.length} event{dayEvts.length!==1?'s':''}</div>}
                </div>
              );
            })}
          </div>
          {/* Time slots */}
          <div id="cal-week-scroll" style={{ display:'grid',gridTemplateColumns:'52px repeat(7,1fr)',height:580,overflowY:'auto' }}>
            {/* Time labels */}
            <div style={{ borderRight:`1px solid ${c.bord}` }}>
              {Array.from({length:24},(_,h)=>(
                <div key={h} style={{ height:48,display:'flex',alignItems:'flex-start',justifyContent:'flex-end',paddingRight:8,paddingTop:2,fontSize:10,color:c.mut,borderBottom:`1px solid ${c.bord}22` }}>
                  {h===0?'':h<12?h+' AM':h===12?'12 PM':(h-12)+' PM'}
                </div>
              ))}
            </div>
            {/* Day columns */}
            {weekDays.map((day,i)=>{
              const dayEvts=getEventsForDay(day);
              const isToday=day.toDateString()===today.toDateString();
              return(
                <div key={i} style={{ borderLeft:`1px solid ${c.bord}`,position:'relative',background:isToday?'rgba(99,102,241,.02)':'transparent' }}>
                  {/* Hour lines */}
                  {Array.from({length:24},(_,h)=>(
                    <div key={h} style={{ height:48,borderBottom:`1px solid ${c.bord}22` }}/>
                  ))}
                  {/* Current time indicator */}
                  {isToday&&(()=>{
                    const now=new Date();
                    const top=(now.getHours()*60+now.getMinutes())/60*48;
                    return <div style={{ position:'absolute',left:0,right:0,top:top,height:2,background:'#EF4444',zIndex:10 }}><div style={{ width:8,height:8,borderRadius:'50%',background:'#EF4444',position:'absolute',left:-4,top:-3 }}/></div>;
                  })()}
                  {/* Events */}
                  {dayEvts.map(ev=>{
                    if(!ev.start?.dateTime){
                      // All-day event — show at top
                      return(
                        <div key={ev.id} onClick={()=>setSelectedEvent(ev)} style={{ position:'absolute',top:2,left:2,right:2,padding:'2px 5px',borderRadius:4,background:eventColor(ev)+'33',border:`1px solid ${eventColor(ev)}66`,color:eventColor(ev),fontSize:10,fontWeight:600,cursor:'pointer',zIndex:5,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>
                          {ev.summary}
                        </div>
                      );
                    }
                    const start=new Date(ev.start.dateTime);
                    const end=new Date(ev.end?.dateTime||ev.start.dateTime);
                    const startMin=start.getHours()*60+start.getMinutes();
                    const duration=Math.max(30,(end-start)/60000);
                    const top=startMin/60*48;
                    const height=Math.max(20,duration/60*48-2);
                    return(
                      <div key={ev.id} onClick={()=>setSelectedEvent(ev)} style={{ position:'absolute',left:2,right:2,top:top,height:height,padding:'2px 5px',borderRadius:5,background:eventColor(ev)+'33',borderLeft:`3px solid ${eventColor(ev)}`,color:eventColor(ev),fontSize:10,fontWeight:600,cursor:'pointer',zIndex:5,overflow:'hidden',boxSizing:'border-box' }}>
                        <div style={{ fontWeight:700,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{ev.summary}</div>
                        {height>28&&<div style={{ opacity:.7 }}>{fmtTime(ev.start.dateTime)}</div>}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* MONTH VIEW */}
      {view==='month'&&(
        <Card style={{ overflow:'hidden' }}>
          <div style={{ display:'grid',gridTemplateColumns:'repeat(7,1fr)',borderBottom:`1px solid ${c.bord}` }}>
            {DAYS.map(d=><div key={d} style={{ padding:'10px',textAlign:'center',fontSize:11,fontWeight:700,color:c.mut,textTransform:'uppercase',letterSpacing:'.06em' }}>{d}</div>)}
          </div>
          <div style={{ display:'grid',gridTemplateColumns:'repeat(7,1fr)' }}>
            {monthDays.map((day,i)=>{
              const dayEvts=day?getEventsForDay(day):[];
              const isToday=day&&day.toDateString()===today.toDateString();
              return(
                <div key={i} style={{ minHeight:80,padding:'6px',borderRight:(i+1)%7!==0?`1px solid ${c.bord}`:'none',borderBottom:`1px solid ${c.bord}`,background:isToday?'rgba(99,102,241,.05)':'transparent' }}>
                  {day&&<div style={{ fontSize:12,fontWeight:isToday?700:400,color:isToday?'#818CF8':c.sub,width:22,height:22,borderRadius:'50%',background:isToday?'rgba(99,102,241,.15)':'transparent',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:4 }}>{day.getDate()}</div>}
                  {dayEvts.slice(0,2).map(ev=>(
                    <div key={ev.id} onClick={()=>setSelectedEvent(ev)} style={{ padding:'2px 5px',borderRadius:4,background:eventColor(ev)+'22',color:eventColor(ev),fontSize:10,fontWeight:600,marginBottom:2,cursor:'pointer',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{ev.summary}</div>
                  ))}
                  {dayEvts.length>2&&<div style={{ fontSize:10,color:c.mut }}>+{dayEvts.length-2} more</div>}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* AGENDA VIEW */}
      {view==='agenda'&&(
        <div>
          {events.length===0&&<Card style={{ padding:'32px',textAlign:'center' }}><div style={{ fontSize:32,marginBottom:8 }}>📅</div><div style={{ color:c.mut,fontSize:14 }}>No upcoming events</div></Card>}
          {events.slice(0,30).map(ev=>{
            const start=new Date(ev.start?.dateTime||ev.start?.date);
            const end=new Date(ev.end?.dateTime||ev.end?.date);
            return(
              <div key={ev.id} onClick={()=>setSelectedEvent(ev)} style={{ display:'flex',gap:14,padding:'12px 0',borderBottom:`1px solid ${c.bord}`,cursor:'pointer' }}>
                <div style={{ width:4,borderRadius:2,background:eventColor(ev),flexShrink:0 }}/>
                <div style={{ width:80,flexShrink:0 }}>
                  <div style={{ fontSize:12,fontWeight:600,color:c.text }}>{start.toLocaleDateString('en-GB',{day:'numeric',month:'short'})}</div>
                  <div style={{ fontSize:11,color:c.mut }}>{fmtTime(ev.start?.dateTime)}</div>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14,fontWeight:600,color:c.text,marginBottom:2 }}>{ev.summary||'(No title)'}</div>
                  {ev.location&&<div style={{ fontSize:11,color:c.mut,marginBottom:2 }}>📍 {ev.location}</div>}
                  {ev.description&&<div style={{ fontSize:11,color:c.mut,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:400 }}>{ev.description.replace(/<[^>]+>/g,'')}</div>}
                  {ev.attendees&&<div style={{ fontSize:11,color:'#818CF8',marginTop:4 }}>{ev.attendees.length} attendees</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Event detail modal */}
      {selectedEvent&&(
        <Modal onClose={()=>setSelectedEvent(null)} title={selectedEvent.summary||'Event'} width={480}>
          <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
            <div style={{ display:'flex',gap:8,alignItems:'center' }}>
              <span style={{ fontSize:13,color:c.mut }}>When:</span>
              <span style={{ fontSize:13,color:c.text }}>
                {new Date(selectedEvent.start?.dateTime||selectedEvent.start?.date).toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
                {selectedEvent.start?.dateTime&&' · '+fmtTime(selectedEvent.start.dateTime)+' – '+fmtTime(selectedEvent.end?.dateTime)}
              </span>
            </div>
            {selectedEvent.location&&<div style={{ display:'flex',gap:8 }}><span style={{ fontSize:13,color:c.mut }}>Where:</span><span style={{ fontSize:13,color:c.text }}>{selectedEvent.location}</span></div>}
            {selectedEvent.description&&<div style={{ padding:'10px 14px',background:c.surf,borderRadius:8,fontSize:12,color:c.sub,lineHeight:1.6 }}>{selectedEvent.description.replace(/<[^>]+>/g,'').slice(0,300)}</div>}
            {selectedEvent.attendees&&selectedEvent.attendees.length>0&&(
              <div>
                <Lbl>Attendees ({selectedEvent.attendees.length})</Lbl>
                <div style={{ display:'flex',flexDirection:'column',gap:6,maxHeight:180,overflowY:'auto' }}>
                  {selectedEvent.attendees.map(a=>(
                    <div key={a.email} style={{ display:'flex',alignItems:'center',gap:10,padding:'7px 0',borderBottom:`1px solid ${c.bord}` }}>
                      <Av member={{name:a.displayName||a.email,color:'#818CF8'}} size={28}/>
                      <div style={{ flex:1 }}><div style={{ fontSize:13,color:c.text }}>{a.displayName||a.email}</div><div style={{ fontSize:11,color:c.mut }}>{a.email}</div></div>
                      <span style={{ fontSize:11,color:a.responseStatus==='accepted'?'#34D399':a.responseStatus==='declined'?'#F87171':'#F59E0B',background:a.responseStatus==='accepted'?'rgba(52,211,153,.1)':a.responseStatus==='declined'?'rgba(239,68,68,.1)':'rgba(245,158,11,.1)',padding:'2px 8px',borderRadius:20,textTransform:'capitalize' }}>{a.responseStatus||'invited'}</span>
                    </div>
                  ))}
                </div>
                <Btn onClick={()=>{
                  const emails=selectedEvent.attendees.map(a=>a.email).filter(e=>e!==session?.user?.email);
                  if(emails.length) alert('To invite these '+emails.length+' attendees to StandSync, go to Team Settings → Invite and add their emails:\n\n'+emails.join('\n'));
                  setSelectedEvent(null);
                }} style={{ marginTop:12 }}>Import attendees to team</Btn>
              </div>
            )}
            {selectedEvent.htmlLink&&<a href={selectedEvent.htmlLink} target="_blank" rel="noreferrer" style={{ fontSize:13,color:'#818CF8',textDecoration:'none' }}>Open in Google Calendar →</a>}
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── SETTINGS PAGE ────────────────────────────────────────────────────────────
function SettingsPage({ session, onBack, onSaved }) {
  const c=useC(); const { dark, toggle }=useTheme();
  const [tab,setTab]=useState('profile'); const [name,setName]=useState(session?.user?.user_metadata?.name||'');
  const [saving,setSaving]=useState(false); const [newPw,setNewPw]=useState(''); const [pwErr,setPwErr]=useState(''); const [pwOk,setPwOk]=useState(false);
  const [openFaq,setOpenFaq]=useState(null); const [avatarUrl,setAvatarUrl]=useState(session?.user?.user_metadata?.avatar_url||'');
  const fileRef=useRef();
  const save=async()=>{ setSaving(true); if(SB.IS_LIVE)await SB.updateProfile({name,avatar_url:avatarUrl}); setSaving(false); onSaved({name,avatar_url:avatarUrl}); };
  const changePw=async()=>{ setPwErr(''); if(newPw.length<6){setPwErr('Min 6 characters');return;} setSaving(true); const {error}=SB.IS_LIVE?await SB.updatePassword(newPw):{error:null}; if(error)setPwErr(error.message); else{setPwOk(true);setNewPw('');setTimeout(()=>setPwOk(false),3000);} setSaving(false); };
  const handleAvatar=async(e)=>{ const file=e.target.files[0]; if(!file)return; if(SB.IS_LIVE){setSaving(true);const url=await SB.uploadAvatar(session.user.id,file);if(url)setAvatarUrl(url);setSaving(false);} };
  const TABS=[{id:'profile',l:'Profile',i:'👤'},{id:'security',l:'Security',i:'🔒'},{id:'appearance',l:'Appearance',i:'🎨'},{id:'notifications',l:'Notifications',i:'🔔'},{id:'faq',l:'FAQ & Help',i:'❓'}];
  const [chatNotifsEnabled,setChatNotifsEnabled]=useState(true);
  const [soundEnabled,setSoundEnabled]=useState(false);
  return (
    <div style={{ position:'relative',zIndex:1,minHeight:'100vh' }}>
      <div style={{ borderBottom:`1px solid ${c.bord}`,background:c.nav,backdropFilter:'blur(32px)',WebkitBackdropFilter:'blur(32px)',boxShadow:'0 1px 0 rgba(255,255,255,.06)',position:'sticky',top:0,zIndex:100,overflow:'visible' }}>
        <div style={{ maxWidth:900,margin:'0 auto',padding:'0 24px',height:58,display:'flex',alignItems:'center',gap:12 }}>
          <Logo size={28} onClick={onBack}/><div style={{ flex:1 }}/><ThemeToggle/><Btn v="ghost" onClick={onBack} style={{ padding:'6px 14px',fontSize:13 }}>← Back</Btn>
        </div>
      </div>
      <div style={{ maxWidth:900,margin:'0 auto',padding:'32px 24px 60px',display:'grid',gridTemplateColumns:'190px 1fr',gap:24 }}>
        <div>
          <div style={{ fontSize:18,fontWeight:700,color:c.text,marginBottom:20 }}>Settings</div>
          {TABS.map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={{ width:'100%',display:'flex',alignItems:'center',gap:10,padding:'10px 14px',borderRadius:10,border:'none',background:tab===t.id?'rgba(99,102,241,.15)':'transparent',color:tab===t.id?'#818CF8':c.mut,cursor:'pointer',fontSize:13,fontWeight:tab===t.id?700:400,marginBottom:4,textAlign:'left',transition:'all .15s' }}><span>{t.i}</span>{t.l}</button>)}
        </div>
        <div style={{ animation:'fadeIn .3s ease' }}>
          {tab==='profile'&&(<Card style={{ padding:'28px' }}><h2 style={{ fontSize:16,fontWeight:700,color:c.text,marginBottom:20 }}>Profile</h2><div style={{ display:'flex',alignItems:'center',gap:16,marginBottom:24 }}><div style={{ position:'relative' }}>{avatarUrl?<img src={avatarUrl} alt="av" style={{ width:80,height:80,borderRadius:'50%',objectFit:'cover',border:'3px solid #818CF8' }}/>:<div style={{ width:80,height:80,borderRadius:'50%',background:'rgba(99,102,241,.2)',border:'3px solid #818CF8',display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,fontWeight:700,color:'#818CF8' }}>{name?name[0].toUpperCase():'?'}</div>}<button onClick={()=>fileRef.current.click()} style={{ position:'absolute',bottom:0,right:0,width:26,height:26,borderRadius:'50%',background:'#6366F1',border:'2px solid #fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13 }}>✏️</button><input ref={fileRef} type="file" accept="image/*" onChange={handleAvatar} style={{ display:'none' }}/></div><div><div style={{ fontSize:16,fontWeight:700,color:c.text }}>{name||session?.user?.email}</div><div style={{ fontSize:13,color:c.mut }}>{session?.user?.email}</div><button onClick={()=>fileRef.current.click()} style={{ fontSize:12,color:'#818CF8',background:'none',border:'none',cursor:'pointer',padding:0,marginTop:6 }}>Change photo</button></div></div><Inp label="Display name" value={name} onChange={e=>setName(e.target.value)} style={{ marginBottom:16 }}/><Inp label="Email" value={session?.user?.email||''} disabled style={{ marginBottom:20,opacity:.6 }}/><Btn onClick={save} loading={saving}>Save changes</Btn></Card>)}
          {tab==='security'&&(<Card style={{ padding:'28px' }}><h2 style={{ fontSize:16,fontWeight:700,color:c.text,marginBottom:20 }}>Security</h2><Lbl>Change password</Lbl><Inp label="New password" type="password" value={newPw} onChange={e=>setNewPw(e.target.value)} placeholder="At least 6 characters" error={pwErr} style={{ marginBottom:16 }}/>{pwOk&&<div style={{ background:'rgba(52,211,153,.12)',border:'1px solid rgba(52,211,153,.3)',borderRadius:8,padding:'10px 14px',fontSize:13,color:'#34D399',marginBottom:14 }}>✅ Password updated</div>}<Btn onClick={changePw} loading={saving} disabled={!newPw}>Update password</Btn></Card>)}
          {tab==='appearance'&&(<Card style={{ padding:'28px' }}><h2 style={{ fontSize:16,fontWeight:700,color:c.text,marginBottom:20 }}>Appearance</h2><div style={{ display:'flex',gap:14 }}>{[{l:'Dark',i:'🌙',d:true},{l:'Light',i:'☀️',d:false}].map(opt=><div key={opt.l} onClick={()=>opt.d!==dark&&toggle()} style={{ flex:1,padding:'20px',borderRadius:14,border:`2px solid ${dark===opt.d?'#6366F1':c.bord}`,background:dark===opt.d?'rgba(99,102,241,.12)':c.surf,cursor:'pointer',textAlign:'center',transition:'all .2s' }}><div style={{ fontSize:32,marginBottom:10 }}>{opt.i}</div><div style={{ fontSize:14,fontWeight:600,color:c.text }}>{opt.l} mode</div>{dark===opt.d&&<div style={{ fontSize:11,color:'#818CF8',marginTop:4 }}>✓ Active</div>}</div>)}</div></Card>)}
          {tab==='notifications'&&(
            <div>
              <Card style={{ padding:'28px',marginBottom:14 }}>
                <h2 style={{ fontSize:16,fontWeight:700,color:c.text,marginBottom:4 }}>Chat notifications</h2>
                <p style={{ fontSize:13,color:c.mut,marginBottom:18 }}>Control how you get notified about new messages.</p>
                {[
                  {id:'chat',label:'New chat messages',sub:'Show unread badge when teammates send messages',val:chatNotifsEnabled,set:setChatNotifsEnabled},
                  {id:'sound',label:'Sound alerts',sub:'Play a sound when a new message arrives',val:soundEnabled,set:setSoundEnabled},
                ].map(n=>(
                  <div key={n.id} style={{ display:'flex',alignItems:'center',gap:12,padding:'12px 0',borderBottom:`1px solid ${c.bord}` }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:14,fontWeight:600,color:c.text,marginBottom:2 }}>{n.label}</div>
                      <div style={{ fontSize:12,color:c.mut }}>{n.sub}</div>
                    </div>
                    <button onClick={()=>n.set(!n.val)} style={{ width:44,height:24,borderRadius:12,border:'none',background:n.val?'#6366F1':'rgba(128,128,128,.25)',cursor:'pointer',position:'relative',transition:'background .2s',flexShrink:0 }}>
                      <div style={{ width:18,height:18,borderRadius:'50%',background:'#fff',position:'absolute',top:3,left:n.val?23:3,transition:'left .2s',boxShadow:'0 1px 3px rgba(0,0,0,.2)' }}/>
                    </button>
                  </div>
                ))}
                <button onClick={()=>{ if('Notification' in window) Notification.requestPermission().then(p=>alert(p==='granted'?'Desktop notifications enabled!':'Permission denied. Enable in browser settings.')); }} style={{ marginTop:14,fontSize:13,color:'#818CF8',background:'rgba(99,102,241,.1)',border:'1px solid rgba(99,102,241,.25)',borderRadius:8,cursor:'pointer',padding:'8px 14px',fontWeight:600 }}>Enable desktop notifications</button>
              </Card>
              <RemindersPanel/>
            </div>
          )}
          {tab==='faq'&&(<Card style={{ padding:'28px' }}><h2 style={{ fontSize:16,fontWeight:700,color:c.text,marginBottom:20 }}>FAQ & Help</h2>{FAQ.map((item,i)=><div key={i} style={{ borderBottom:`1px solid ${c.bord}`,padding:'14px 0' }}><button onClick={()=>setOpenFaq(openFaq===i?null:i)} style={{ width:'100%',display:'flex',justifyContent:'space-between',alignItems:'center',background:'none',border:'none',cursor:'pointer',color:c.text,fontSize:14,fontWeight:600,textAlign:'left',gap:12 }}><span>{item.q}</span><span style={{ transform:openFaq===i?'rotate(180deg)':'none',transition:'transform .2s',color:c.mut,fontSize:18,flexShrink:0 }}>⌃</span></button>{openFaq===i&&<p style={{ fontSize:13,color:c.mut,lineHeight:1.6,marginTop:10,marginBottom:0 }}>{item.a}</p>}</div>)}</Card>)}
        </div>
      </div>
    </div>
  );
}

// ─── TASK CARDS ───────────────────────────────────────────────────────────────
function MemberTaskCard({ task, user, onStatus, onBlocker }) {
  const c=useC(); const [showB,setShowB]=useState(false); const [btext,setBtext]=useState(task.blocker||'');
  const s=getStatus(task.status); const next={'todo':'in-progress','in-progress':'done','done':'todo','blocked':'in-progress'}; const nLabel={'todo':'▶ Start','in-progress':'✓ Mark done','done':'↺ Reopen','blocked':'↺ Unblock'};
  return (
    <Card style={{ marginBottom:10,overflow:'hidden',border:task.status==='blocked'?'1px solid rgba(239,68,68,.35)':task.status==='done'?'1px solid rgba(52,211,153,.25)':`1px solid ${c.bord}` }}>
      <div style={{ padding:'14px 16px' }}>
        <div style={{ display:'flex',alignItems:'flex-start',gap:10,marginBottom:6 }}>
          <button onClick={()=>onStatus(task.id,next[task.status])} style={{ width:22,height:22,borderRadius:'50%',flexShrink:0,marginTop:1,border:`2px solid ${task.status==='done'?'#34D399':'rgba(128,128,128,.3)'}`,background:task.status==='done'?'#34D399':'transparent',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',transition:'all .2s' }}>
            {task.status==='done'&&<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          </button>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:14,color:task.status==='done'?c.mut:c.text,textDecoration:task.status==='done'?'line-through':'none',lineHeight:1.4,marginBottom:6 }}>{task.title}</div>
            <div style={{ display:'flex',flexWrap:'wrap',gap:5 }}><PBadge priority={task.priority}/><SBadge status={task.status}/>{task.timeline&&<span style={{ fontSize:10,color:c.mut,background:'rgba(128,128,128,.1)',padding:'3px 8px',borderRadius:20 }}>🕐 {task.timeline}</span>}</div>
          </div>
        </div>
        {task.manager_note&&<div style={{ padding:'8px 12px',background:'rgba(129,140,248,.1)',border:'1px solid rgba(129,140,248,.2)',borderRadius:8,fontSize:12,color:c.sub,marginTop:8 }}><span style={{ color:'#818CF8',fontWeight:700 }}>📌 Note: </span>{task.manager_note}</div>}
        {task.blocker&&<div style={{ padding:'8px 12px',background:'rgba(239,68,68,.1)',border:'1px solid rgba(239,68,68,.25)',borderRadius:8,fontSize:12,color:'#F87171',marginTop:8 }}><span style={{ fontWeight:700 }}>⚠️ Blocker: </span>{task.blocker}</div>}
      </div>
      <div style={{ padding:'0 16px 12px',display:'flex',gap:6,flexWrap:'wrap' }}>
        <button onClick={()=>onStatus(task.id,next[task.status])} style={{ fontSize:11,padding:'5px 12px',borderRadius:8,border:`1px solid ${s.color}40`,background:s.bg,color:s.color,cursor:'pointer',fontWeight:600 }}>{nLabel[task.status]}</button>
        {task.status!=='blocked'&&<button onClick={()=>{onStatus(task.id,'blocked');setShowB(true);}} style={{ fontSize:11,padding:'5px 12px',borderRadius:8,border:'1px solid rgba(239,68,68,.3)',background:'rgba(239,68,68,.08)',color:'#F87171',cursor:'pointer' }}>⚠️ Report blocker</button>}
        <button onClick={()=>setShowB(!showB)} style={{ fontSize:11,padding:'5px 10px',borderRadius:8,border:`1px solid ${c.bord}`,background:'transparent',color:c.mut,cursor:'pointer',marginLeft:'auto' }}>Note</button>
      </div>
      {showB&&<div style={{ padding:'0 16px 14px',display:'flex',gap:8 }}><input value={btext} onChange={e=>setBtext(e.target.value)} placeholder="Describe the blocker" style={{ flex:1,background:c.inp,border:`1px solid ${c.inpB}`,borderRadius:8,padding:'8px 12px',color:c.text,fontSize:13,outline:'none' }}/><Btn v="danger" onClick={()=>{onBlocker(task.id,btext);setShowB(false);}} style={{ flexShrink:0,padding:'8px 14px' }}>Send</Btn></div>}
    </Card>
  );
}

// ─── MEMBER VIEW ──────────────────────────────────────────────────────────────
function MemberView({ user, myMember, tasks, onAdd, onStatus, onBlocker, onBack, onSettings, session, members, messages, onSendMessage, chatTheme, onChangeTheme }) {
  const c=useC();
  const mine=tasks.filter(t=>t.assignee_email===user.email);
  const done=mine.filter(t=>t.status==='done').length; const pct=mine.length?Math.round(done/mine.length*100):0;
  const today=new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'});
  const TL=['Today noon (12 PM)','Today 3 PM','Today EOD (6 PM)','Tomorrow morning','Tomorrow EOD','This week','Custom...'];
  const [title,setTitle]=useState(''); const [priority,setPriority]=useState('medium'); const [tl,setTl]=useState('Today EOD (6 PM)'); const [custom,setCustom]=useState(''); const [showCustom,setShowCustom]=useState(false); const [notes,setNotes]=useState('');
  const [activeTab,setActiveTab]=useState('tasks');
  const color=myMember?.color||'#818CF8';
  const submit=()=>{ if(!title.trim())return; onAdd({title:title.trim(),assignee_email:user.email,assignee_name:user.name||user.email,priority,status:'todo',timeline:showCustom?custom:tl,notes,manager_note:'',blocker:''}); setTitle('');setPriority('medium');setTl('Today EOD (6 PM)');setNotes('');setShowCustom(false);setCustom(''); };
  const hTl=v=>{ if(v==='Custom...'){setShowCustom(true);setTl('');}else{setShowCustom(false);setTl(v);}};
  const TABS=[
    {id:'tasks',   l:'My tasks',      ic:'◈'},
    {id:'self',    l:'Self tasks',    ic:'✦'},
    {id:'overview',l:'My overview',   ic:'▤'},
    {id:'notes',   l:'Meeting notes', ic:'≡'},
    {id:'chat',    l:'Team chat',     ic:'◌'},
    {id:'cal',     l:'Calendar',      ic:'⊟'},
    {id:'wiki',    l:'Project Wiki',  ic:'📚'},
    {id:'brain',   l:'Brainstorm',    ic:'⬡'},
    {id:'ai',      l:'AI assistant',  ic:'◉'},
  ];
  // meetingNotes moved to NotesTab component
  const [selfTasks,setSelfTasks]=useState(()=>{ try{return JSON.parse(localStorage.getItem('ss-self-tasks-'+(user.email||''))||'[]');}catch{return[];} });
  const [selfTitle,setSelfTitle]=useState(''); const [selfPriority,setSelfPriority]=useState('medium');
  const saveSelfTask=()=>{ if(!selfTitle.trim())return; const t={id:'s'+Date.now(),title:selfTitle.trim(),priority:selfPriority,done:false,created_at:new Date().toISOString()}; const updated=[...selfTasks,t]; setSelfTasks(updated); try{localStorage.setItem('ss-self-tasks-'+(user.email||''),JSON.stringify(updated));}catch{}; setSelfTitle(''); };
  const toggleSelf=(id)=>{ const updated=selfTasks.map(t=>t.id===id?{...t,done:!t.done}:t); setSelfTasks(updated); try{localStorage.setItem('ss-self-tasks-'+(user.email||''),JSON.stringify(updated));}catch{}; };
  const deleteSelf=(id)=>{ const updated=selfTasks.filter(t=>t.id!==id); setSelfTasks(updated); try{localStorage.setItem('ss-self-tasks-'+(user.email||''),JSON.stringify(updated));}catch{}; };

  return (
    <div style={{ position:'relative',zIndex:1,minHeight:'100vh' }}>
      <div style={{ borderBottom:`1px solid ${c.bord}`,background:c.nav,backdropFilter:'blur(32px)',WebkitBackdropFilter:'blur(32px)',boxShadow:'0 1px 0 rgba(255,255,255,.06)',position:'sticky',top:0,zIndex:100,overflow:'visible' }}>
        <div style={{ maxWidth:800,margin:'0 auto',padding:'0 20px',height:56,display:'flex',alignItems:'center',gap:12 }}>
          <Logo size={26} onClick={onBack}/>
          <div style={{ display:'flex',gap:2,flex:1,overflowX:'auto',overflowY:'visible' }}>
            {TABS.map(t=>{
              const isA=activeTab===t.id;
              return(
                <button key={t.id} onClick={()=>setActiveTab(t.id)}
                  className="ss-tip" data-tip={t.l}
                  style={{ padding:'6px 8px',borderRadius:9,border:'none',background:isA?'rgba(124,110,245,.16)':'transparent',color:isA?'#C4B5FD':c.mut,cursor:'pointer',fontWeight:isA?600:400,display:'flex',alignItems:'center',gap:5,transition:'all .15s',whiteSpace:'nowrap',flexShrink:0,position:'relative' }}>
                  <span style={{ fontSize:16,lineHeight:1,transition:'transform .15s' }}>{t.ic}</span>
                  {isA&&<span style={{ fontSize:11 }}>{t.l}</span>}
                </button>
              );
            })}
          </div>
          <div style={{ display:'flex',alignItems:'center',gap:5,fontSize:12,color:c.mut,flexShrink:0 }}><LiveDot/><span>Live</span></div>
          <ThemeToggle/><ProfileMenu session={session} onSettings={onSettings} onLogout={onBack}/>
        </div>
      </div>
      <div style={{ maxWidth:800,margin:'0 auto',padding:'24px 20px 60px' }}>
        {activeTab==='tasks'&&(
          <>
            <div style={{ marginBottom:22,animation:'fadeUp .35s ease' }}>
              <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:5 }}><LiveDot/><span style={{ fontSize:11,color:'#34D399',textTransform:'uppercase',letterSpacing:'.08em',fontWeight:700 }}>Live · {today}</span></div>
              <h1 style={{ margin:'0 0 4px',fontSize:22,fontWeight:800,color:c.text,letterSpacing:'-.025em' }}>Good morning, {(user.name||user.email).split(' ')[0]} 👋</h1>
              <p style={{ margin:0,color:c.mut,fontSize:14,lineHeight:1.5 }}>Add tasks assigned to you. You'll get an email reminder and an EOD alert.</p>
            </div>
            {mine.length>0&&(<>
              <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:16 }}>
                <StatCard label="Total" value={mine.length} color="#818CF8"/><StatCard label="In progress" value={mine.filter(t=>t.status==='in-progress').length} color="#38BDF8"/><StatCard label="Done" value={done} color="#34D399"/><StatCard label="Blocked" value={mine.filter(t=>t.status==='blocked').length} color={mine.some(t=>t.status==='blocked')?'#EF4444':'#34D399'}/>
              </div>
              <Card style={{ padding:'14px 18px',marginBottom:20 }}>
                <div style={{ display:'flex',justifyContent:'space-between',marginBottom:8 }}><span style={{ fontSize:13,color:c.mut }}>Today's progress</span><span style={{ fontSize:13,fontWeight:700,color }}>{pct}% · {done}/{mine.length}</span></div>
                <Bar pct={pct} color={`linear-gradient(90deg,${color}88,${color})`} h={7}/>
                {pct===100&&<div style={{ marginTop:10,fontSize:13,color:'#34D399',fontWeight:600,textAlign:'center' }}>🎉 All tasks done!</div>}
              </Card>
            </>)}
            <Card style={{ padding:'20px 22px',marginBottom:16,border:`1px solid ${color}30` }}>
              <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:12 }}><div style={{ width:4,height:16,borderRadius:2,background:color }}/><Lbl style={{ margin:0 }}>Add a task assigned to you</Lbl></div>
              <Inp value={title} onChange={e=>setTitle(e.target.value)} onKeyDown={e=>e.key==='Enter'&&submit()} placeholder="What were you assigned in the standup?" style={{ marginBottom:12 }} autoFocus/>
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10 }}>
                <Sel label="Priority" value={priority} onChange={e=>setPriority(e.target.value)}>{PRIORITIES.map(p=><option key={p.value} value={p.value}>{p.label}</option>)}</Sel>
                <Sel label="I'll finish by" value={showCustom?'Custom...':tl} onChange={e=>hTl(e.target.value)}>{TL.map(t=><option key={t} value={t}>{t}</option>)}</Sel>
              </div>
              {showCustom&&<Inp value={custom} onChange={e=>setCustom(e.target.value)} placeholder="e.g. Wednesday 2 PM" style={{ marginBottom:10 }}/>}
              <Inp value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Notes (optional)" style={{ marginBottom:14 }}/>
              <Btn onClick={submit} disabled={!title.trim()} style={{ width:'100%',justifyContent:'center',padding:'11px',fontSize:14,background:`linear-gradient(135deg,${color}cc,${color})`,border:'none' }}>+ Submit task</Btn>
            </Card>
            {mine.length>0&&<Lbl style={{ marginBottom:10 }}>Your tasks ({mine.length})</Lbl>}
            {mine.map(t=><MemberTaskCard key={t.id} task={t} user={user} onStatus={onStatus} onBlocker={onBlocker}/>)}
            {mine.length===0&&<Card style={{ padding:'40px 20px',textAlign:'center' }}><div style={{ fontSize:36,marginBottom:12 }}>📋</div><div style={{ color:c.mut,fontSize:14 }}>No tasks yet — add what was assigned above</div></Card>}
          </>
        )}
        {activeTab==='chat'&&<RichChatPanel messages={messages} onSend={onSendMessage} session={session} members={members} chatTheme={chatTheme} onChangeTheme={onChangeTheme}/>}
        {activeTab==='cal'&&<CalendarPanel team={null} session={session} members={members}/>}
        {activeTab==='brain'&&<BrainstormSpace team={null} session={session} members={members}/>}
        {activeTab==='wiki'&&<ProjectWiki team={null} session={session} members={members}/>}
        {activeTab==='ai'&&<AIAssistant tasks={tasks} members={members} history={[]} session={session} myTasks={mine} teamName="Team"/>}

        {/* ── SELF TASKS (personal, not team) ── */}
        {activeTab==='self'&&(
          <div>
            <div style={{ marginBottom:16 }}>
              <h2 style={{ fontSize:18,fontWeight:700,color:c.text,marginBottom:4 }}>✨ Personal tasks</h2>
              <p style={{ fontSize:13,color:c.mut }}>Private to-dos only visible to you — not shared with your team.</p>
            </div>
            <Card style={{ padding:'20px',marginBottom:16 }}>
              <div style={{ display:'flex',gap:10,marginBottom:10 }}>
                <Inp value={selfTitle} onChange={e=>setSelfTitle(e.target.value)} onKeyDown={e=>e.key==='Enter'&&saveSelfTask()} placeholder="Add a personal task..." style={{ flex:1 }}/>
                <Sel value={selfPriority} onChange={e=>setSelfPriority(e.target.value)} style={{ width:110 }}><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></Sel>
                <Btn onClick={saveSelfTask} disabled={!selfTitle.trim()}>Add</Btn>
              </div>
            </Card>
            {selfTasks.length===0&&<Card style={{ padding:'32px',textAlign:'center' }}><div style={{ fontSize:32,marginBottom:8 }}>✨</div><div style={{ color:c.mut }}>No personal tasks yet</div></Card>}
            {selfTasks.map(t=>(
              <Card key={t.id} style={{ padding:'12px 16px',marginBottom:8,display:'flex',alignItems:'center',gap:12,opacity:t.done?.65:1 }}>
                <button onClick={()=>toggleSelf(t.id)} style={{ width:22,height:22,borderRadius:'50%',flexShrink:0,border:`2px solid ${t.done?'#34D399':'rgba(128,128,128,.35)'}`,background:t.done?'#34D399':'transparent',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}>{t.done&&<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}</button>
                <span style={{ flex:1,fontSize:13,color:t.done?c.mut:c.text,textDecoration:t.done?'line-through':'none' }}>{t.title}</span>
                <span style={{ fontSize:10,padding:'2px 8px',borderRadius:20,background:'rgba(99,102,241,.1)',color:'#818CF8' }}>{t.priority}</span>
                <button onClick={()=>deleteSelf(t.id)} style={{ background:'none',border:'none',color:c.mut,cursor:'pointer',fontSize:14,opacity:.5 }}>🗑</button>
              </Card>
            ))}
          </div>
        )}

        {/* ── MY OVERVIEW / ANALYSIS ── */}
        {activeTab==='overview'&&(()=>{
          const total=mine.length, doneCnt=mine.filter(t=>t.status==='done').length;
          const inProg=mine.filter(t=>t.status==='in-progress').length;
          const blkd=mine.filter(t=>t.status==='blocked').length;
          const pctDone=total?Math.round(doneCnt/total*100):0;
          const byPri={critical:mine.filter(t=>t.priority==='critical').length,high:mine.filter(t=>t.priority==='high').length,medium:mine.filter(t=>t.priority==='medium').length,low:mine.filter(t=>t.priority==='low').length};
          const selfDone=selfTasks.filter(t=>t.done).length;
          return(
            <div>
              <h2 style={{ fontSize:18,fontWeight:700,color:c.text,marginBottom:16 }}>📊 My overview</h2>
              {/* Progress ring area */}
              <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:16 }}>
                {[{l:'Total',v:total,c:'#818CF8',i:'📋'},{l:'Done',v:doneCnt,c:'#34D399',i:'✅'},{l:'In progress',v:inProg,c:'#38BDF8',i:'⚡'},{l:'Blocked',v:blkd,c:blkd>0?'#EF4444':'#34D399',i:blkd>0?'⚠️':'✓'}].map(s=>(
                  <Card key={s.l} style={{ padding:'16px',textAlign:'center' }}>
                    <div style={{ fontSize:24,marginBottom:6 }}>{s.i}</div>
                    <div style={{ fontSize:28,fontWeight:800,color:s.c,marginBottom:4 }}>{s.v}</div>
                    <div style={{ fontSize:11,color:c.mut,textTransform:'uppercase',letterSpacing:'.06em' }}>{s.l}</div>
                  </Card>
                ))}
              </div>
              {/* Progress bar */}
              <Card style={{ padding:'16px 20px',marginBottom:16 }}>
                <div style={{ display:'flex',justifyContent:'space-between',marginBottom:8 }}>
                  <span style={{ fontSize:13,fontWeight:600,color:c.text }}>Today's completion</span>
                  <span style={{ fontSize:13,fontWeight:700,color:pctDone>=80?'#34D399':pctDone>=50?'#818CF8':'#F97316' }}>{pctDone}%</span>
                </div>
                <Bar pct={pctDone} h={10} color="linear-gradient(90deg,#6366F1,#34D399)"/>
                <div style={{ display:'flex',gap:16,marginTop:12 }}>
                  {Object.entries(byPri).map(([p,v])=>v>0&&<div key={p} style={{ fontSize:12,color:c.mut }}><span style={{ fontSize:11,padding:'1px 7px',borderRadius:20,background:'rgba(99,102,241,.1)',color:'#818CF8',marginRight:4 }}>{p}</span>{v}</div>)}
                </div>
              </Card>
              {/* Self tasks summary */}
              <Card style={{ padding:'16px 20px',marginBottom:16 }}>
                <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8 }}>
                  <span style={{ fontSize:13,fontWeight:600,color:c.text }}>✨ Personal tasks</span>
                  <button onClick={()=>setActiveTab('self')} style={{ fontSize:12,color:'#818CF8',background:'none',border:'none',cursor:'pointer' }}>Manage →</button>
                </div>
                <div style={{ fontSize:24,fontWeight:800,color:'#818CF8',marginBottom:4 }}>{selfDone}/{selfTasks.length}</div>
                <Bar pct={selfTasks.length?Math.round(selfDone/selfTasks.length*100):0} h={6} color="#818CF8"/>
              </Card>
              {/* Task list split by status */}
              {blkd>0&&<Card style={{ padding:'14px 18px',marginBottom:12,border:'1px solid rgba(239,68,68,.25)',background:'rgba(239,68,68,.04)' }}>
                <div style={{ fontSize:13,fontWeight:700,color:'#F87171',marginBottom:10 }}>⚠️ Blocked tasks</div>
                {mine.filter(t=>t.status==='blocked').map(t=><div key={t.id} style={{ padding:'8px 0',borderBottom:`1px solid ${c.bord}`,fontSize:13,color:c.text }}>{t.title}{t.blocker&&<span style={{ fontSize:11,color:'#F87171',marginLeft:8 }}>· {t.blocker}</span>}</div>)}
              </Card>}
            </div>
          );
        })()}

        {/* ── MEETING NOTES ── */}
        {activeTab==='notes'&&<NotesTab session={session} team={{id:user?.team_id||'t1'}} role={'member-'+user?.email}/>}
      </div>
    </div>
  );
}

// ─── MANAGER TABS ─────────────────────────────────────────────────────────────
function LiveTab({ tasks, members, onStatus, onPriority, onNote, onAddTask, session }) {
  const c=useC(); const [fu,setFu]=useState('all'); const [fs,setFs]=useState('all'); const [showModal,setShowModal]=useState(false);
  const filtered=tasks.filter(t=>fu==='all'||t.assignee_email===fu).filter(t=>fs==='all'||t.status===fs);
  const total=tasks.length,done=tasks.filter(t=>t.status==='done').length,inProg=tasks.filter(t=>t.status==='in-progress').length,blocked=tasks.filter(t=>t.status==='blocked').length,todo=tasks.filter(t=>t.status==='todo').length,pct=total?Math.round(done/total*100):0;
  return (
    <div>
      <div style={{ display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12,marginBottom:20 }}>
        <StatCard label="Total" value={total} color="#818CF8" icon="📋"/><StatCard label="To do" value={todo} color="#94A3B8" icon="⭕"/><StatCard label="In progress" value={inProg} color="#38BDF8" icon="⚡"/><StatCard label="Done" value={done} color="#34D399" icon="✅"/><StatCard label="Blocked" value={blocked} color={blocked>0?'#EF4444':'#34D399'} icon="⚠️" sub={blocked>0?'needs attention':'all clear'}/>
      </div>
      {total>0&&<Card style={{ padding:'14px 18px',marginBottom:16 }}><div style={{ display:'flex',justifyContent:'space-between',marginBottom:8 }}><span style={{ fontSize:13,color:c.mut }}>Team progress</span><span style={{ fontSize:13,fontWeight:700,color:'#818CF8' }}>{pct}% · {done}/{total}</span></div><Bar pct={pct} h={8} color="linear-gradient(90deg,#6366F1,#34D399)"/></Card>}
      <Card style={{ overflow:'hidden' }}>
        <div style={{ padding:'12px 16px',borderBottom:`1px solid ${c.bord}`,display:'flex',gap:8,flexWrap:'wrap',alignItems:'center' }}>
          <div style={{ display:'flex',gap:5,flex:1,flexWrap:'wrap' }}>{[{v:'all',l:'All'},...members.map(m=>({v:m.email,l:(m.name||m.email).split(' ')[0]}))].map(f=><button key={f.v} onClick={()=>setFu(f.v)} style={{ fontSize:12,padding:'5px 12px',borderRadius:20,border:`1px solid ${c.bord}`,background:fu===f.v?'rgba(129,140,248,.2)':'transparent',color:fu===f.v?'#818CF8':c.mut,cursor:'pointer',fontWeight:fu===f.v?700:400,transition:'all .15s' }}>{f.l}</button>)}</div>
          <div style={{ display:'flex',gap:5 }}>{['all','todo','in-progress','done','blocked'].map(s=><button key={s} onClick={()=>setFs(s)} style={{ fontSize:11,padding:'4px 10px',borderRadius:20,border:`1px solid ${c.bord}`,background:fs===s?'rgba(128,128,128,.12)':'transparent',color:c.mut,cursor:'pointer',fontWeight:fs===s?700:400,textTransform:'capitalize' }}>{s==='all'?'All':s.replace('-',' ')}</button>)}</div>
          <Btn onClick={()=>setShowModal(true)} style={{ padding:'7px 14px',fontSize:12,background:'linear-gradient(135deg,#6366F1,#818CF8)',border:'none',flexShrink:0 }}>+ Assign task</Btn>
        </div>
        {filtered.length===0?<div style={{ padding:'40px',textAlign:'center',color:c.mut,fontSize:14 }}>{total===0?'⏳ Waiting for team to add tasks...':'No tasks match this filter'}</div>
          :filtered.map(t=><MgrRow key={t.id} task={t} members={members} onStatus={onStatus} onPriority={onPriority} onNote={onNote} session={session}/>)}
      </Card>
      {showModal&&<AssignModal members={members} onClose={()=>setShowModal(false)} onAdd={onAddTask}/>}
    </div>
  );
}

function MgrRow({ task, members, onStatus, onPriority, onNote, session }) {
  const c=useC(); const [showN,setShowN]=useState(false); const [note,setNote]=useState(task.manager_note||'');
  const member=members.find(m=>m.email===task.assignee_email); const p=getPriority(task.priority);
  // Managers can start tasks and unblock them, but ONLY employees mark tasks done
  const next={'todo':'in-progress','in-progress':'in-progress','done':'todo','blocked':'todo'};
  const canToggle=task.status!=='in-progress'||task.assignee_email===session?.user?.email;
  return (
    <div style={{ borderBottom:`1px solid ${c.bord}`,transition:'background .15s' }} onMouseEnter={e=>e.currentTarget.style.background=c.row} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
      <div style={{ display:'flex',alignItems:'center',gap:10,padding:'11px 16px' }}>
        <button onClick={()=>canToggle&&onStatus(task.id,next[task.status])} title={task.status==='in-progress'&&!canToggle?'Only the assigned member can mark this done':''} style={{ width:20,height:20,borderRadius:'50%',flexShrink:0,border:`2px solid ${task.status==='done'?'#34D399':'rgba(128,128,128,.3)'}`,background:task.status==='done'?'#34D399':'transparent',cursor:canToggle?'pointer':'not-allowed',opacity:task.status==='in-progress'&&!canToggle?.45:1,display:'flex',alignItems:'center',justifyContent:'center',transition:'all .2s' }}>
          {task.status==='done'&&<svg width="9" height="9" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
        </button>
        <div style={{ width:7,height:7,borderRadius:'50%',background:p.color,flexShrink:0 }}/>
        <span style={{ flex:1,fontSize:13,color:task.status==='done'?c.mut:c.text,textDecoration:task.status==='done'?'line-through':'none',lineHeight:1.4 }}>{task.title}</span>
        {task.blocker&&<span style={{ fontSize:10,color:'#F87171',background:'rgba(239,68,68,.12)',border:'1px solid rgba(239,68,68,.25)',padding:'2px 7px',borderRadius:6,whiteSpace:'nowrap' }}>⚠️ Blocked</span>}
        {task.timeline&&<span style={{ fontSize:11,color:c.mut,whiteSpace:'nowrap' }}>🕐 {task.timeline}</span>}
        {member&&<Av member={member} size={24} url={member.avatar_url}/>}
        <SBadge status={task.status}/>
        <select value={task.priority} onChange={e=>onPriority(task.id,e.target.value)} style={{ background:'transparent',border:'none',color:p.color,fontSize:10,cursor:'pointer',outline:'none',fontWeight:700,letterSpacing:'.05em',textTransform:'uppercase' }}>
          {['critical','high','medium','low'].map(v=><option key={v} value={v} style={{ background:c.dark?'#0D0B24':'#fff',color:c.text }}>{v}</option>)}
        </select>
        <button onClick={()=>setShowN(!showN)} style={{ background:task.manager_note?'rgba(129,140,248,.15)':'transparent',border:task.manager_note?'1px solid rgba(129,140,248,.3)':`1px solid ${c.bord}`,borderRadius:6,cursor:'pointer',padding:'3px 6px',color:task.manager_note?'#818CF8':c.mut,fontSize:12 }}>📌</button>
      </div>
      {task.blocker&&<div style={{ padding:'0 16px 10px 54px' }}><div style={{ fontSize:12,color:'#F87171',background:'rgba(239,68,68,.08)',border:'1px solid rgba(239,68,68,.2)',borderRadius:8,padding:'8px 12px' }}>⚠️ {task.blocker}</div></div>}
      {showN&&<div style={{ padding:'0 16px 12px 54px',display:'flex',gap:8 }}><input value={note} onChange={e=>setNote(e.target.value)} placeholder="Add a note..." style={{ flex:1,background:c.inp,border:`1px solid ${c.inpB}`,borderRadius:8,padding:'8px 12px',color:c.text,fontSize:13,outline:'none' }}/><Btn onClick={()=>{onNote(task.id,note);setShowN(false);}} style={{ flexShrink:0,padding:'8px 14px' }}>Save</Btn></div>}
    </div>
  );
}

function AssignModal({ members, onClose, onAdd }) {
  const c=useC(); const [title,setTitle]=useState(''); const [assignee,setAssignee]=useState(members[0]?.email||''); const [priority,setPriority]=useState('medium'); const [timeline,setTimeline]=useState('Today EOD (6 PM)'); const [note,setNote]=useState('');
  const submit=()=>{ if(!title.trim())return; const m=members.find(x=>x.email===assignee); onAdd({title:title.trim(),assignee_email:assignee,assignee_name:m?.name||assignee,priority,status:'todo',timeline,manager_note:note,notes:'',blocker:''}); onClose(); };
  return <Modal onClose={onClose} title="Assign a task"><Inp value={title} onChange={e=>setTitle(e.target.value)} placeholder="Task description..." style={{ marginBottom:12 }} autoFocus/><div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10 }}><Sel label="Assign to" value={assignee} onChange={e=>setAssignee(e.target.value)}>{members.map(m=><option key={m.id||m.email} value={m.email}>{m.name||m.email}</option>)}</Sel><Sel label="Priority" value={priority} onChange={e=>setPriority(e.target.value)}>{['critical','high','medium','low'].map(v=><option key={v} value={v}>{v.charAt(0).toUpperCase()+v.slice(1)}</option>)}</Sel></div><Sel label="Timeline" value={timeline} onChange={e=>setTimeline(e.target.value)} style={{ marginBottom:10 }}>{['Today noon (12 PM)','Today 3 PM','Today EOD (6 PM)','Tomorrow morning','Tomorrow EOD','This week'].map(t=><option key={t} value={t}>{t}</option>)}</Sel><Inp value={note} onChange={e=>setNote(e.target.value)} placeholder="Note to team member (optional)" style={{ marginBottom:18 }}/><div style={{ display:'flex',gap:8,justifyContent:'flex-end' }}><Btn v="ghost" onClick={onClose}>Cancel</Btn><Btn onClick={submit} disabled={!title.trim()}>Assign task</Btn></div></Modal>;
}

function TeamTab({ tasks, members }) {
  const c=useC();
  return <div style={{ display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:14 }}>{members.map(member=>{ const mt=tasks.filter(t=>t.assignee_email===member.email); const done=mt.filter(t=>t.status==='done').length,inProg=mt.filter(t=>t.status==='in-progress').length,blocked=mt.filter(t=>t.status==='blocked').length; const pct=mt.length?Math.round(done/mt.length*100):0,pc=pct===100?'#34D399':pct>=50?'#818CF8':'#F97316'; return(<Card key={member.id||member.email} style={{ padding:'20px 22px',border:blocked>0?'1px solid rgba(239,68,68,.3)':`1px solid ${c.bord}` }}><div style={{ display:'flex',alignItems:'center',gap:12,marginBottom:14 }}><Av member={member} size={44} url={member.avatar_url}/><div style={{ flex:1 }}><div style={{ fontSize:14,fontWeight:700,color:c.text,marginBottom:2 }}>{member.name||member.email}</div><div style={{ fontSize:11,color:c.mut }}>{member.email}</div></div><div style={{ textAlign:'right' }}><div style={{ fontSize:22,fontWeight:800,color:pc }}>{pct}%</div><div style={{ fontSize:10,color:c.mut }}>{done}/{mt.length}</div></div></div><Bar pct={pct} color={`linear-gradient(90deg,${member.color||'#818CF8'}80,${member.color||'#818CF8'})`} h={5} style={{ marginBottom:12 }}/><div style={{ display:'flex',gap:8,marginBottom:12 }}>{[{l:'In prog',v:inProg,col:'#38BDF8'},{l:'Done',v:done,col:'#34D399'},{l:'Blocked',v:blocked,col:'#EF4444'}].map(s=><div key={s.l} style={{ flex:1,background:s.v>0?s.col+'15':'rgba(128,128,128,.07)',border:`1px solid ${s.v>0?s.col+'30':c.bord}`,borderRadius:8,padding:'8px 6px',textAlign:'center' }}><div style={{ fontSize:16,fontWeight:700,color:s.v>0?s.col:c.mut }}>{s.v}</div><div style={{ fontSize:9,color:c.mut,textTransform:'uppercase',letterSpacing:'.05em',marginTop:2 }}>{s.l}</div></div>)}</div>{mt.length===0?<div style={{ fontSize:12,color:c.mut,textAlign:'center',padding:'8px 0' }}>No tasks yet</div>:mt.slice(0,3).map(t=><div key={t.id} style={{ display:'flex',alignItems:'center',gap:8,padding:'6px 0',borderTop:`1px solid ${c.bord}` }}><div style={{ width:6,height:6,borderRadius:'50%',background:getPriority(t.priority).color,flexShrink:0 }}/><span style={{ flex:1,fontSize:12,color:t.status==='done'?c.mut:c.sub,textDecoration:t.status==='done'?'line-through':'none' }}>{t.title}</span><SBadge status={t.status}/></div>)}{mt.length>3&&<div style={{ fontSize:11,color:c.mut,textAlign:'center',marginTop:8 }}>+{mt.length-3} more</div>}{blocked>0&&<div style={{ marginTop:10,padding:'8px 12px',background:'rgba(239,68,68,.1)',border:'1px solid rgba(239,68,68,.25)',borderRadius:8,fontSize:12,color:'#F87171' }}>⚠️ {blocked} blocked</div>}</Card>);})}</div>;
}

function PerfTab({ tasks, history, members }) {
  const c=useC(); const allDays=useMemo(()=>[...history,{id:'today',date:TODAY(),tasks}],[history,tasks]);
  const stats=useMemo(()=>members.map(member=>{ const all=allDays.flatMap(d=>(d.tasks||[]).filter(t=>t.assignee_email===member.email)); const total=all.length,done=all.filter(t=>t.status==='done').length,blocked=all.filter(t=>t.status==='blocked'||t.blocker).length; const rate=total?Math.round(done/total*100):0,activeDays=allDays.filter(d=>(d.tasks||[]).some(t=>t.assignee_email===member.email)).length,avg=activeDays?+(total/activeDays).toFixed(1):0; const week=history.slice(0,7).map(d=>{const dt=(d.tasks||[]).filter(t=>t.assignee_email===member.email);if(!dt.length)return null;return{date:d.date,pct:Math.round(dt.filter(x=>x.status==='done').length/dt.length*100)};}).filter(Boolean).reverse(); const bscore=total?Math.round((total-blocked)/total*100):100,consist=Math.min(100,Math.round(activeDays/Math.max(allDays.length,1)*100)),score=Math.round(rate*.6+consist*.2+bscore*.2); const grade=score>=90?'A':score>=75?'B':score>=60?'C':score>=40?'D':'F',gc=score>=90?'#34D399':score>=75?'#818CF8':score>=60?'#F59E0B':'#EF4444'; const tod=tasks.filter(t=>t.assignee_email===member.email),tdone=tod.filter(t=>t.status==='done').length; return{member,total,done,blocked,rate,avg,week,score,grade,gc,tod,tdone,todPct:tod.length?Math.round(tdone/tod.length*100):0}; }),[allDays,members,tasks,history]);
  const sorted=[...stats].sort((a,b)=>b.score-a.score),top=sorted[0]; const totDone=stats.reduce((a,s)=>a+s.done,0),avgRate=stats.length?Math.round(stats.reduce((a,s)=>a+s.rate,0)/stats.length):0;
  return(<div><div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20 }}><StatCard label="Days tracked" value={allDays.length} color="#818CF8" icon="📅"/><StatCard label="Total done" value={totDone} color="#34D399" icon="✅"/><StatCard label="Avg completion" value={avgRate+'%'} color="#F472B6" icon="🎯"/><StatCard label="Top performer" value={top?.member.name?.split(' ')[0]||'—'} color={top?.gc||'#818CF8'} sub={top?`Score: ${top.score}`:''} icon="🏆"/></div><Card style={{ padding:'18px 20px',marginBottom:20 }}><Lbl>Leaderboard</Lbl><div style={{ display:'flex',flexDirection:'column',gap:10 }}>{sorted.map((s,i)=><div key={s.member.id||s.member.email} style={{ display:'flex',alignItems:'center',gap:12 }}><div style={{ width:22,fontSize:13,fontWeight:700,color:i===0?'#FCD34D':i===1?'#94A3B8':i===2?'#CD7C2E':c.mut,textAlign:'center',flexShrink:0 }}>{i===0?'🥇':i===1?'🥈':i===2?'🥉':`${i+1}`}</div><Av member={s.member} size={30} url={s.member.avatar_url}/><span style={{ fontSize:13,fontWeight:500,color:c.text,flex:1 }}>{s.member.name||s.member.email}</span><div style={{ width:120 }}><Bar pct={s.rate} color={s.gc} h={4}/></div><span style={{ fontSize:12,fontWeight:700,color:s.gc,width:36,textAlign:'right' }}>{s.rate}%</span><div style={{ width:28,height:28,borderRadius:8,background:s.gc+'20',border:`1px solid ${s.gc}40`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:800,color:s.gc }}>{s.grade}</div></div>)}</div></Card><div style={{ display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:14 }}>{stats.map(s=><Card key={s.member.id||s.member.email} style={{ padding:'20px 22px' }}><div style={{ display:'flex',alignItems:'center',gap:12,marginBottom:14 }}><Av member={s.member} size={44} url={s.member.avatar_url}/><div style={{ flex:1 }}><div style={{ fontSize:14,fontWeight:700,color:c.text }}>{s.member.name||s.member.email}</div></div><div style={{ position:'relative',width:56,height:56,flexShrink:0 }}><svg width="56" height="56" style={{ transform:'rotate(-90deg)' }}><circle cx="28" cy="28" r="20" fill="none" stroke="rgba(128,128,128,.15)" strokeWidth="4"/><circle cx="28" cy="28" r="20" fill="none" stroke={s.gc} strokeWidth="4" strokeLinecap="round" strokeDasharray={`${(s.score/100)*2*Math.PI*20} ${2*Math.PI*20}`}/></svg><div style={{ position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center' }}><div style={{ fontSize:16,fontWeight:800,color:s.gc,lineHeight:1 }}>{s.grade}</div><div style={{ fontSize:9,color:c.mut,lineHeight:1 }}>{s.score}</div></div></div></div>{s.tod.length>0&&<div style={{ marginBottom:12 }}><div style={{ display:'flex',justifyContent:'space-between',marginBottom:5 }}><Lbl style={{ margin:0 }}>Today</Lbl><span style={{ fontSize:11,color:s.member.color||'#818CF8',fontWeight:700 }}>{s.tdone}/{s.tod.length}</span></div><Bar pct={s.todPct} color={s.member.color||'#818CF8'} h={4}/></div>}<div style={{ marginBottom:12 }}><div style={{ display:'flex',justifyContent:'space-between',marginBottom:5 }}><Lbl style={{ margin:0 }}>Overall</Lbl><span style={{ fontSize:11,color:s.gc,fontWeight:700 }}>{s.rate}%</span></div><Bar pct={s.rate} color={s.gc} h={4}/></div><div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8 }}>{[{l:'Done',v:s.done,col:'#34D399'},{l:'Avg/day',v:s.avg,col:'#818CF8'},{l:'Blockers',v:s.blocked,col:s.blocked>0?'#EF4444':'#34D399'}].map(x=><div key={x.l} style={{ background:'rgba(128,128,128,.07)',borderRadius:10,padding:10,textAlign:'center',border:`1px solid ${c.bord}` }}><div style={{ fontSize:18,fontWeight:800,color:x.col }}>{x.v}</div><div style={{ fontSize:9,color:c.mut,textTransform:'uppercase',letterSpacing:'.06em',marginTop:2 }}>{x.l}</div></div>)}</div>{s.week.length>0&&<><Lbl style={{ marginTop:12 }}>7-day trend</Lbl><div style={{ display:'flex',alignItems:'flex-end',gap:4,height:44 }}>{s.week.map((d,i)=><div key={i} style={{ flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:3 }}><div style={{ width:'100%',height:Math.max(3,d.pct/100*36),borderRadius:3,background:d.pct===100?'#34D399':d.pct>=60?'#818CF8':'#F97316' }}/><div style={{ fontSize:9,color:c.mut }}>{new Date(d.date+'T12:00').toLocaleDateString('en',{weekday:'narrow'})}</div></div>)}</div></>}</Card>)}</div></div>);
}

function HistTab({ history, members }) {
  const c=useC(); const [open,setOpen]=useState(null); const fmt=d=>new Date(d+'T12:00').toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'}); const totAll=history.reduce((a,s)=>a+(s.tasks?.length||0),0),doneAll=history.reduce((a,s)=>a+(s.tasks?.filter(t=>t.status==='done').length||0),0),avgPct=history.length?Math.round(doneAll/Math.max(totAll,1)*100):0;
  return(<div><div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20 }}><StatCard label="Standups" value={history.length} color="#818CF8" icon="📅"/><StatCard label="Total tasks" value={totAll} color="#38BDF8" icon="📋"/><StatCard label="Total done" value={doneAll} color="#34D399" icon="✅"/><StatCard label="Avg completion" value={avgPct+'%'} color="#F472B6" icon="🎯"/></div>{history.length===0?<Card style={{ padding:'40px',textAlign:'center' }}><div style={{ fontSize:36,marginBottom:12 }}>📅</div><div style={{ color:c.mut,fontSize:14 }}>History appears after your first standup</div></Card>:history.map(s=>{ const t=s.tasks||[],d=t.filter(x=>x.status==='done').length,b=t.filter(x=>x.status==='blocked').length,pct=t.length?Math.round(d/t.length*100):0,isOpen=open===s.id; return(<Card key={s.id} style={{ marginBottom:10,overflow:'hidden' }}><button onClick={()=>setOpen(isOpen?null:s.id)} style={{ width:'100%',display:'flex',alignItems:'center',gap:12,padding:'14px 18px',background:'transparent',border:'none',cursor:'pointer',color:c.text }}><div style={{ width:7,height:7,borderRadius:'50%',background:pct===100?'#34D399':'#818CF8',flexShrink:0 }}/><span style={{ flex:1,fontSize:14,fontWeight:500,textAlign:'left' }}>{fmt(s.date)}</span>{b>0&&<span style={{ fontSize:11,color:'#F87171',background:'rgba(239,68,68,.12)',padding:'2px 8px',borderRadius:20 }}>⚠️ {b}</span>}<span style={{ fontSize:11,color:c.mut,background:'rgba(128,128,128,.1)',padding:'2px 10px',borderRadius:20 }}>{d}/{t.length} · {pct}%</span><span style={{ color:c.mut,transform:isOpen?'rotate(180deg)':'none',transition:'transform .2s',fontSize:16 }}>⌃</span></button>{isOpen&&<div style={{ borderTop:`1px solid ${c.bord}` }}>{t.map(task=>{ const m=members.find(x=>x.email===task.assignee_email); return(<div key={task.id} style={{ display:'flex',alignItems:'center',gap:10,padding:'9px 18px',borderBottom:`1px solid ${c.bord}` }}><div style={{ width:6,height:6,borderRadius:'50%',background:getPriority(task.priority).color,flexShrink:0 }}/><span style={{ flex:1,fontSize:12,color:task.status==='done'?c.mut:c.sub,textDecoration:task.status==='done'?'line-through':'none' }}>{task.title}</span>{task.timeline&&<span style={{ fontSize:10,color:c.mut }}>{task.timeline}</span>}{m&&<Av member={m} size={22}/>}<SBadge status={task.status}/></div>); })}</div>}</Card>); })}</div>);
}

function TeamSettingsTab({ team, members, session, onMembersUpdate }) {
  const c=useC();
  const [invEmail,setInvEmail]=useState(''); const [sending,setSending]=useState(false); const [sent,setSent]=useState(false); const [lastInviteLink,setLastInviteLink]=useState(''); const [copied,setCopied]=useState(false);
  const [rooms,setRooms]=useState([]); const [loadingRooms,setLoadingRooms]=useState(true);
  const [newRoomName,setNewRoomName]=useState(''); const [creatingRoom,setCreatingRoom]=useState(false);
  const [editMember,setEditMember]=useState(null); // {id, name, designation, role}
  const [editDesg,setEditDesg]=useState(''); const [editRole,setEditRole]=useState('');
  const [saving,setSaving]=useState(false);
  const [tab,setTab]=useState('members'); // members | rooms | invite

  useEffect(()=>{
    if(!SB.IS_LIVE)return;
    SB.getTeamRooms(team.id).then(r=>{ setRooms(r); setLoadingRooms(false); });
  },[team.id]);

  const sendInv=async()=>{
    if(!invEmail.trim()||!invEmail.includes('@'))return;
    setSending(true);
    try{
      if(SB.IS_LIVE){
        const myName=session?.user?.user_metadata?.name||session?.user?.email;
        const {link}=await SB.inviteMember(team.id,team.name,invEmail.trim(),myName);
        setLastInviteLink(link); // Always show link so manager can share manually
        try{ await Promise.race([Email.sendInvite(invEmail.trim(),myName,team.name,link),new Promise(r=>setTimeout(r,5000))]); }catch(e){}
      }
    }catch(e){ console.error('invite error:',e); }
    setSent(true);setSending(false);
    setTimeout(()=>{setSent(false);},3000);
  };

  const addRoom=async()=>{
    if(!newRoomName.trim())return;
    setCreatingRoom(true);
    const room=await SB.createRoom(team.id,newRoomName.trim(),session?.user?.id);
    if(room) setRooms(p=>[...p,room]);
    setNewRoomName('');setCreatingRoom(false);
  };

  const deleteRoom=async(roomDbId)=>{
    await SB.deleteRoom(roomDbId);
    setRooms(p=>p.filter(r=>r.id!==roomDbId));
  };

  const saveDesignation=async()=>{
    if(!editMember)return;
    setSaving(true);
    await SB.updateMemberDesignation(editMember.id,editDesg,editRole);
    onMembersUpdate&&onMembersUpdate();
    setEditMember(null);setSaving(false);
  };

  const TABS=[{id:'members',l:'Members',i:'👥'},{id:'rooms',l:'Rooms & codes',i:'🔑'},{id:'invite',l:'Invite',i:'📧'}];

  return(
    <div>
      <div style={{ display:'flex',gap:6,marginBottom:20 }}>
        {TABS.map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={{ padding:'7px 14px',borderRadius:8,border:`1px solid ${tab===t.id?'#6366F1':c.bord}`,background:tab===t.id?'rgba(99,102,241,.15)':'transparent',color:tab===t.id?'#818CF8':c.mut,cursor:'pointer',fontSize:13,fontWeight:tab===t.id?700:400,display:'flex',alignItems:'center',gap:6 }}><span>{t.i}</span>{t.l}</button>)}
      </div>

      {/* ── MEMBERS TAB ── */}
      {tab==='members'&&(
        <Card style={{ padding:'20px 22px' }}>
          <Lbl>Team members ({members.length}) — click to edit designation</Lbl>
          {members.map(m=>(
            <div key={m.id||m.email}>
              <div style={{ display:'flex',alignItems:'center',gap:12,padding:'10px 0',borderBottom:`1px solid ${c.bord}` }}>
                <Av member={m} size={40} url={m.avatar_url}/>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13,fontWeight:600,color:c.text }}>{m.name||m.email}</div>
                  <div style={{ fontSize:11,color:c.mut }}>{m.email}</div>
                  <div style={{ fontSize:11,color:'#818CF8',marginTop:2 }}>{m.designation||m.role}</div>
                </div>
                <span style={{ fontSize:11,color:m.role==='manager'?'#818CF8':'#34D399',background:m.role==='manager'?'rgba(129,140,248,.12)':'rgba(52,211,153,.12)',padding:'3px 9px',borderRadius:20,textTransform:'capitalize' }}>{m.role}</span>
                {session?.user?.id!==m.user_id&&(
                  <button onClick={()=>{setEditMember(m);setEditDesg(m.designation||'');setEditRole(m.role||'member');}} style={{ fontSize:12,color:c.mut,background:c.surf,border:`1px solid ${c.bord}`,borderRadius:7,cursor:'pointer',padding:'4px 10px' }}>Edit</button>
                )}
              </div>
              {editMember?.id===m.id&&(
                <div style={{ padding:'14px',background:'rgba(99,102,241,.06)',borderRadius:10,margin:'8px 0',display:'flex',flexDirection:'column',gap:10 }}>
                  <Inp label="Designation" value={editDesg} onChange={e=>setEditDesg(e.target.value)} placeholder="e.g. Frontend Developer, QA Lead..."/>
                  <Sel label="Role" value={editRole} onChange={e=>setEditRole(e.target.value)}>
                    <option value="member">Member</option>
                    <option value="manager">Manager</option>
                  </Sel>
                  <div style={{ display:'flex',gap:8 }}>
                    <Btn v="ghost" onClick={()=>setEditMember(null)} style={{ flex:1,justifyContent:'center' }}>Cancel</Btn>
                    <Btn onClick={saveDesignation} loading={saving} style={{ flex:2,justifyContent:'center' }}>Save changes</Btn>
                  </div>
                </div>
              )}
            </div>
          ))}
        </Card>
      )}

      {/* ── ROOMS TAB ── */}
      {tab==='rooms'&&(
        <div>
          <Card style={{ padding:'20px 22px',marginBottom:14 }}>
            <Lbl>Create a new room</Lbl>
            <p style={{ fontSize:13,color:c.mut,marginBottom:12 }}>Each room gets a unique Room ID and password. Members join using these credentials.</p>
            <div style={{ display:'flex',gap:10 }}>
              <Inp value={newRoomName} onChange={e=>setNewRoomName(e.target.value)} placeholder="e.g. Sprint Planning, Design Review..." onKeyDown={e=>e.key==='Enter'&&addRoom()} style={{ flex:1 }}/>
              <Btn onClick={addRoom} loading={creatingRoom} disabled={!newRoomName.trim()} style={{ flexShrink:0 }}>+ Create</Btn>
            </div>
          </Card>
          {loadingRooms?<div style={{ display:'flex',justifyContent:'center',padding:24 }}><Spin/></div>:
            rooms.length===0?<Card style={{ padding:'32px',textAlign:'center' }}><div style={{ fontSize:32,marginBottom:8 }}>🔑</div><div style={{ color:c.mut,fontSize:13 }}>No rooms yet — create one above</div></Card>:
            rooms.map(room=>(
              <Card key={room.id} style={{ padding:'18px 20px',marginBottom:10 }}>
                <div style={{ display:'flex',alignItems:'center',gap:12 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:14,fontWeight:700,color:c.text,marginBottom:6 }}>{room.name}</div>
                    <div style={{ display:'flex',gap:10,flexWrap:'wrap' }}>
                      <div style={{ background:'rgba(99,102,241,.1)',border:'1px solid rgba(99,102,241,.25)',borderRadius:8,padding:'6px 12px',textAlign:'center' }}>
                        <div style={{ fontSize:9,color:'#818CF8',fontWeight:700,textTransform:'uppercase',letterSpacing:'.08em',marginBottom:3 }}>Room ID</div>
                        <div style={{ fontSize:16,fontWeight:800,color:'#818CF8',letterSpacing:'.12em',fontFamily:'monospace' }}>{room.room_id}</div>
                      </div>
                      <div style={{ background:'rgba(52,211,153,.08)',border:'1px solid rgba(52,211,153,.2)',borderRadius:8,padding:'6px 12px',textAlign:'center' }}>
                        <div style={{ fontSize:9,color:'#34D399',fontWeight:700,textTransform:'uppercase',letterSpacing:'.08em',marginBottom:3 }}>Password</div>
                        <div style={{ fontSize:16,fontWeight:800,color:'#34D399',letterSpacing:'.2em',fontFamily:'monospace' }}>{room.room_password}</div>
                      </div>
                    </div>
                    <div style={{ fontSize:11,color:c.mut,marginTop:8 }}>These credentials are permanent until you delete this room</div>
                  </div>
                  <button onClick={()=>deleteRoom(room.id)} style={{ background:'rgba(239,68,68,.1)',border:'1px solid rgba(239,68,68,.2)',borderRadius:8,color:'#F87171',cursor:'pointer',padding:'6px 12px',fontSize:12,flexShrink:0 }}>Delete</button>
                </div>
              </Card>
            ))
          }
        </div>
      )}

      {/* ── INVITE TAB ── */}
      {tab==='invite'&&(
        <div>
          <Card style={{ padding:'20px 22px',marginBottom:12 }}>
            <Lbl>Create invite link</Lbl>
            <p style={{ fontSize:13,color:c.mut,marginBottom:12 }}>Enter their email to generate a join link. Share the link directly via WhatsApp, Slack, or email — it works instantly.</p>
            <div style={{ display:'flex',gap:10,marginBottom:12 }}>
              <Inp value={invEmail} onChange={e=>setInvEmail(e.target.value)} placeholder="colleague@company.com" onKeyDown={e=>e.key==='Enter'&&sendInv()} style={{ flex:1 }}/>
              <Btn onClick={sendInv} loading={sending} disabled={!invEmail.trim()} style={{ flexShrink:0 }}>{sent?'✓ Created!':'Create invite'}</Btn>
            </div>
            {lastInviteLink&&(
              <div style={{ padding:'12px 14px',background:'rgba(99,102,241,.08)',border:'1px solid rgba(99,102,241,.25)',borderRadius:10 }}>
                <div style={{ fontSize:11,fontWeight:700,color:'#818CF8',marginBottom:6,textTransform:'uppercase',letterSpacing:'.07em' }}>Share this link</div>
                <div style={{ fontSize:11,color:c.text,wordBreak:'break-all',marginBottom:8,fontFamily:'monospace',background:c.surf,padding:'8px 10px',borderRadius:6,border:`1px solid ${c.bord}` }}>{lastInviteLink}</div>
                <button onClick={()=>{navigator.clipboard&&navigator.clipboard.writeText(lastInviteLink);setCopied(true);setTimeout(()=>setCopied(false),2000);}} style={{ fontSize:12,color:'#818CF8',background:'rgba(99,102,241,.12)',border:'1px solid rgba(99,102,241,.25)',borderRadius:7,cursor:'pointer',padding:'5px 12px',fontWeight:600 }}>{copied?'✓ Copied!':'Copy link'}</button>
                <div style={{ fontSize:11,color:c.mut,marginTop:6 }}>They click this link, create an account, and join your team automatically.</div>
              </div>
            )}
            {!process.env.REACT_APP_RESEND_KEY&&(
              <div style={{ marginTop:10,padding:'9px 12px',background:'rgba(245,158,11,.07)',border:'1px solid rgba(245,158,11,.2)',borderRadius:8,fontSize:12,color:'#FCD34D' }}>
                ⚠️ Email delivery needs REACT_APP_RESEND_KEY in Vercel. Use the copy link above to share manually.
              </div>
            )}
          </Card>
          <Card style={{ padding:'14px 20px' }}>
            <div style={{ fontSize:13,color:c.sub,fontWeight:600,marginBottom:3 }}>Faster option</div>
            <div style={{ fontSize:13,color:c.mut }}>Share the Room ID + password from the <strong style={{ color:'#818CF8' }}>Rooms tab</strong> — members join instantly without any link.</div>
          </Card>
        </div>
      )}

      {/* Edit designation modal */}
    </div>
  );
}


// ─── PROJECT WIKI ─────────────────────────────────────────────────────────────
// Notion/Confluence-like per-project knowledge base.
// Pages, SOPs, rich blocks, AI Q&A from content, project overview.
// Fully localStorage-persisted, auto-saved, free (Gemini AI).

// ── Block types ──────────────────────────────────────────────────────────────
// heading1, heading2, heading3, paragraph, bullet, numbered, todo,
// callout, code, divider, table, image-url, quote

// ─── PROJECT FILE PANEL ───────────────────────────────────────────────────────
// ─── WIKI AI PANEL ───────────────────────────────────────────────────────────
// Standalone stable component — never defined inside another render
// This fixes the "loses focus after one keystroke" bug completely
function WikiAIPanel({ projectId, projectName, getProjectContext, compact }) {
  const c = useC();
  const { dark } = useTheme();
  const [query, setQuery]     = useState('');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef   = useRef();
  const bottomRef  = useRef();

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [history, loading]);

  const ask = async (q) => {
    const text = (q || query).trim();
    if (!text || loading) return;
    setHistory(h => [...h, { role: 'user', text }]);
    setQuery('');
    setLoading(true);
    // keep focus on input after clearing
    setTimeout(() => inputRef.current?.focus(), 0);
    try {
      const ctx = getProjectContext(projectId);
      const hasFiles = ctx.includes('===FILE ATTACHMENTS===') || ctx.includes('[PDF:') || ctx.includes('[Presentation:');
      const prompt = `You are a helpful project assistant for "${projectName || 'this project'}".

${ctx ? `Here is the complete project documentation, pages, and uploaded files:\n\n${ctx}` : 'No documentation added yet.'}

---
User question: "${text}"

Instructions:
- Answer based on the project documentation above
- If files are mentioned (PDFs, presentations, docs), reference them by name
- If the answer isn't in the docs, say so clearly and offer general guidance
- Use bullet points for lists
- Be concise and specific`;

      const reply = await askAI(prompt, { teamName: projectName || 'Project' });
      setHistory(h => [...h, { role: 'assistant', text: reply }]);
    } catch(e) {
      setHistory(h => [...h, { role: 'assistant', text: 'Could not reach AI. Make sure REACT_APP_GEMINI_KEY is set in Vercel.' }]);
    }
    setLoading(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const QUICK = ['Summarize this project', 'What SOPs are documented?', 'What are the key processes?', 'What files are uploaded?'];

  return (
    <div style={{ borderRadius: 14, border: `1px solid rgba(124,110,245,.25)`, background: dark ? 'rgba(99,102,241,.06)' : 'rgba(99,102,241,.04)', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '12px 18px', borderBottom: `1px solid rgba(124,110,245,.15)`, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2L13.5 8.5L20 7L14.5 11.5L17 18L12 14L7 18L9.5 11.5L4 7L10.5 8.5L12 2Z" fill="#A78BFA"/></svg>
        <span style={{ fontSize: 14, fontWeight: 700, color: c.text }}>Ask AI about this project</span>
        <span style={{ fontSize: 11, color: '#818CF8', background: 'rgba(99,102,241,.1)', padding: '2px 8px', borderRadius: 20 }}>Gemini · Free</span>
        {history.length > 0 && (
          <button onClick={() => setHistory([])} style={{ marginLeft: 'auto', fontSize: 11, color: c.mut, background: 'none', border: 'none', cursor: 'pointer', padding: '2px 8px' }}>Clear chat</button>
        )}
      </div>

      {/* Chat */}
      {history.length > 0 && (
        <div style={{ maxHeight: 340, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {history.map((msg, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, flexDirection: msg.role === 'user' ? 'row-reverse' : 'row', alignItems: 'flex-start' }}>
              {msg.role === 'assistant' && (
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(124,110,245,.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 13 }}>✦</div>
              )}
              <div style={{ maxWidth: '82%', padding: '9px 13px', borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '4px 14px 14px 14px',
                background: msg.role === 'user' ? 'linear-gradient(135deg,#6B5FE4,#9B8AFB)' : (dark ? 'rgba(255,255,255,.07)' : 'rgba(255,255,255,.95)'),
                color: msg.role === 'user' ? '#fff' : c.text, fontSize: 13, lineHeight: 1.65,
                border: msg.role === 'user' ? 'none' : `1px solid ${c.bord}`, whiteSpace: 'pre-wrap' }}>
                {msg.text}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(124,110,245,.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>✦</div>
              <div style={{ padding: '10px 14px', background: dark ? 'rgba(255,255,255,.07)' : 'rgba(255,255,255,.95)', borderRadius: '4px 14px 14px 14px', border: `1px solid ${c.bord}`, display: 'flex', gap: 5, alignItems: 'center' }}>
                {[0,1,2].map(i => <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: '#818CF8', animation: `bounce .8s ease ${i*.18}s infinite` }}/>)}
              </div>
            </div>
          )}
          <div ref={bottomRef}/>
        </div>
      )}

      {/* Quick prompts */}
      {history.length === 0 && (
        <div style={{ padding: '10px 16px 4px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {QUICK.map(q => (
            <button key={q} onClick={() => ask(q)} style={{ fontSize: 11, padding: '5px 12px', borderRadius: 20, border: `1px solid rgba(124,110,245,.28)`, background: 'rgba(99,102,241,.07)', color: '#818CF8', cursor: 'pointer' }}>{q}</button>
          ))}
        </div>
      )}

      {/* Input — ALWAYS mounted, never remounts */}
      <div style={{ padding: '10px 14px', display: 'flex', gap: 8, borderTop: history.length ? `1px solid rgba(124,110,245,.1)` : 'none', alignItems: 'center' }}>
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(); } }}
          placeholder="Ask anything about this project, its files, SOPs…"
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: c.text, fontSize: 13, lineHeight: 1.5, minWidth: 0 }}
        />
        <button onClick={() => ask()} disabled={!query.trim() || loading}
          style={{ padding: '7px 18px', borderRadius: 9, background: query.trim() && !loading ? 'linear-gradient(135deg,#6B5FE4,#9B8AFB)' : 'transparent',
            border: query.trim() && !loading ? 'none' : `1px solid ${c.bord}`, color: query.trim() && !loading ? '#fff' : c.mut,
            cursor: query.trim() && !loading ? 'pointer' : 'default', fontSize: 13, fontWeight: 600, flexShrink: 0, transition: 'all .15s', whiteSpace: 'nowrap' }}>
          {loading ? '…' : '✦ Ask'}
        </button>
      </div>
    </div>
  );
}

// ─── WIKI FILE PANEL ──────────────────────────────────────────────────────────
// Handles upload, PDF text extraction, image preview, file viewer modal
function WikiFilePanel({ selProject, projectFiles, setProjectFiles, saveWiki, projects, pages, dark, c }) {
  const [extracting, setExtracting] = useState(false);
  const [preview, setPreview]       = useState(null); // {file} for modal
  const fileInputRef = useRef();
  const files = projectFiles[selProject] || [];

  const fileIcon = (f) => {
    if (f.type?.startsWith('image/')) return '🖼️';
    if (f.name?.match(/\.pdf$/i)) return '📄';
    if (f.name?.match(/\.pptx?$/i)) return '📊';
    if (f.name?.match(/\.docx?$/i)) return '📝';
    if (f.name?.match(/\.xlsx?$/i)) return '📈';
    return '📎';
  };

  // Extract text from PDF using PDF.js CDN
  const extractPDFText = async (dataUrl) => {
    try {
      // Load PDF.js from CDN if not already loaded
      if (!window.pdfjsLib) {
        await new Promise((res, rej) => {
          const s = document.createElement('script');
          s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
          s.onload = res; s.onerror = rej;
          document.head.appendChild(s);
        });
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      }
      const base64 = dataUrl.split(',')[1];
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const pdf = await window.pdfjsLib.getDocument({ data: bytes }).promise;
      let text = '';
      for (let p = 1; p <= Math.min(pdf.numPages, 30); p++) {
        const page = await pdf.getPage(p);
        const content = await page.getTextContent();
        text += content.items.map(i => i.str).join(' ') + '\n';
      }
      return text.trim() || null;
    } catch(e) {
      return null;
    }
  };

  const handleFiles = async (fileList) => {
    if (!fileList?.length) return;
    setExtracting(true);
    const newFiles = [];

    for (const file of Array.from(fileList)) {
      const id = 'f' + Date.now() + Math.random().toString(36).slice(2);
      const type = file.type || '';
      let extractedText = '';
      let dataUrl = '';

      const readDataUrl = () => new Promise(res => { const r = new FileReader(); r.onload = e => res(e.target.result); r.readAsDataURL(file); });
      const readText    = () => new Promise(res => { const r = new FileReader(); r.onload = e => res(e.target.result); r.readAsText(file); });

      try {
        if (type.startsWith('image/')) {
          dataUrl = await readDataUrl();
          extractedText = `[Image: ${file.name}]`;
        } else if (file.name?.match(/\.pdf$/i) || type === 'application/pdf') {
          dataUrl = await readDataUrl();
          // Try real text extraction
          const pdfText = await extractPDFText(dataUrl);
          if (pdfText && pdfText.length > 50) {
            extractedText = pdfText;
          } else {
            extractedText = `[PDF file: ${file.name} · ${Math.round(file.size/1024)}KB · Could not extract text — may be scanned/image-based]`;
          }
        } else if (file.name?.match(/\.pptx?$/i) || type.includes('presentation')) {
          dataUrl = await readDataUrl();
          extractedText = `[Presentation: ${file.name} · ${Math.round(file.size/1024)}KB · PPTX text extraction not supported in browser — describe this file's contents in a wiki page for AI to reference]`;
        } else if (file.name?.match(/\.docx?$/i) || type.includes('word')) {
          dataUrl = await readDataUrl();
          extractedText = `[Word document: ${file.name} · ${Math.round(file.size/1024)}KB]`;
        } else if (file.name?.match(/\.(txt|md|csv|json)$/i) || type.includes('text')) {
          extractedText = await readText();
          dataUrl = await readDataUrl();
        } else {
          dataUrl = await readDataUrl();
          extractedText = `[File: ${file.name} · ${Math.round(file.size/1024)}KB]`;
        }
      } catch(e) {
        extractedText = `[${file.name}]`;
      }

      newFiles.push({ id, name: file.name, type, size: file.size, dataUrl, extractedText, uploadedAt: Date.now() });
    }

    const updated = { ...projectFiles, [selProject]: [...files, ...newFiles] };
    setProjectFiles(updated);
    saveWiki(projects, pages, updated);
    setExtracting(false);
  };

  const removeFile = (fid) => {
    if (!window.confirm('Remove this file?')) return;
    const updated = { ...projectFiles, [selProject]: files.filter(f => f.id !== fid) };
    setProjectFiles(updated);
    saveWiki(projects, pages, updated);
  };

  const openFile = (f) => setPreview(f);

  const textExtracted = (f) => f.extractedText && !f.extractedText.startsWith('[');

  return (
    <>
      {/* File viewer modal */}
      {preview && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={() => setPreview(null)}>
          <div style={{ background: dark ? '#12103A' : '#fff', borderRadius: 16, width: '90%', maxWidth: 900, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,.5)' }}
            onClick={e => e.stopPropagation()}>
            {/* Modal header */}
            <div style={{ padding: '14px 20px', borderBottom: `1px solid ${c.bord}`, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 20 }}>{fileIcon(preview)}</span>
              <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: c.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{preview.name}</span>
              <span style={{ fontSize: 11, color: c.mut }}>{Math.round(preview.size/1024)}KB</span>
              {preview.dataUrl && (
                <a href={preview.dataUrl} download={preview.name}
                  style={{ padding: '6px 14px', borderRadius: 8, background: 'linear-gradient(135deg,#6B5FE4,#9B8AFB)', color: '#fff', textDecoration: 'none', fontSize: 12, fontWeight: 600 }}>
                  ⬇ Download
                </a>
              )}
              <button onClick={() => setPreview(null)} style={{ width: 32, height: 32, borderRadius: '50%', border: `1px solid ${c.bord}`, background: 'transparent', color: c.text, cursor: 'pointer', fontSize: 18 }}>×</button>
            </div>
            {/* Modal body */}
            <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
              {preview.type?.startsWith('image/') && preview.dataUrl && (
                <img src={preview.dataUrl} alt={preview.name} style={{ maxWidth: '100%', height: 'auto', borderRadius: 8, display: 'block', margin: '0 auto' }}/>
              )}
              {preview.name?.match(/\.pdf$/i) && preview.dataUrl && (
                <iframe src={preview.dataUrl} title={preview.name} style={{ width: '100%', height: 600, border: 'none', borderRadius: 8 }}/>
              )}
              {textExtracted(preview) && !preview.type?.startsWith('image/') && !preview.name?.match(/\.pdf$/i) && (
                <pre style={{ fontFamily: 'Inter,monospace', fontSize: 13, lineHeight: 1.7, color: c.text, whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: dark ? 'rgba(255,255,255,.04)' : '#f9f9f9', padding: 20, borderRadius: 10, border: `1px solid ${c.bord}` }}>
                  {preview.extractedText}
                </pre>
              )}
              {!textExtracted(preview) && !preview.type?.startsWith('image/') && !preview.name?.match(/\.pdf$/i) && (
                <div style={{ textAlign: 'center', padding: 40, color: c.mut }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>{fileIcon(preview)}</div>
                  <div style={{ fontSize: 14, marginBottom: 8 }}>{preview.name}</div>
                  <div style={{ fontSize: 12 }}>{preview.extractedText}</div>
                  {preview.dataUrl && (
                    <a href={preview.dataUrl} download={preview.name} style={{ display: 'inline-block', marginTop: 16, padding: '10px 24px', borderRadius: 10, background: 'linear-gradient(135deg,#6B5FE4,#9B8AFB)', color: '#fff', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
                      ⬇ Download file
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Panel */}
      <div style={{ marginBottom: 24, borderRadius: 14, border: `1px solid ${c.bord}`, overflow: 'visible', background: dark ? 'rgba(255,255,255,.03)' : 'rgba(255,255,255,.7)' }}>
        <div style={{ padding: '12px 18px', borderBottom: `1px solid ${c.bord}`, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 16 }}>📎</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: c.text, flex: 1 }}>Project Files & SOPs</span>
          <span style={{ fontSize: 11, color: c.mut }}>{files.length} file{files.length !== 1 ? 's' : ''}</span>
          {files.some(f => textExtracted(f)) && <span style={{ fontSize: 11, color: '#34D399', background: 'rgba(52,211,153,.1)', padding: '2px 8px', borderRadius: 20 }}>✓ AI reads extracted text</span>}
          <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.ppt,.pptx,.doc,.docx,.txt,.csv,.json,.xlsx,.xls,.md"
            onChange={e => handleFiles(e.target.files)} style={{ display: 'none' }}/>
          <button onClick={() => fileInputRef.current?.click()} disabled={extracting}
            style={{ padding: '6px 16px', borderRadius: 8, background: extracting ? 'rgba(99,102,241,.3)' : 'linear-gradient(135deg,#6B5FE4,#9B8AFB)', color: '#fff', border: 'none', cursor: extracting ? 'wait' : 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
            {extracting ? <><div style={{ width: 11, height: 11, borderRadius: '50%', border: '2px solid rgba(255,255,255,.3)', borderTop: '2px solid #fff', animation: 'spin .75s linear infinite' }}/> Extracting…</> : '+ Browse files'}
          </button>
        </div>

        {files.length === 0 ? (
          <div style={{ padding: '28px 20px', textAlign: 'center', cursor: 'pointer' }} onClick={() => fileInputRef.current?.click()}>
            <div style={{ fontSize: 38, marginBottom: 10 }}>📁</div>
            <div style={{ fontSize: 13, color: c.text, fontWeight: 600, marginBottom: 5 }}>Upload PDFs, presentations, images, docs, SOPs</div>
            <div style={{ fontSize: 11, color: c.mut, marginBottom: 14 }}>PDFs: text extracted automatically · AI reads everything</div>
            <div style={{ display: 'inline-flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
              {['📄 PDF (text extracted)','📊 PPT/PPTX','📝 DOC/DOCX','🖼️ Images','📃 TXT/CSV/MD'].map(t => (
                <span key={t} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: dark ? 'rgba(255,255,255,.06)' : 'rgba(99,102,241,.08)', color: c.mut, border: `1px solid ${c.bord}` }}>{t}</span>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px,1fr))', gap: 10, padding: 14 }}>
            {files.map(f => (
              <div key={f.id} style={{ padding: '12px 14px', borderRadius: 10, background: dark ? 'rgba(255,255,255,.05)' : 'rgba(255,255,255,.9)', border: `1px solid ${c.bord}`, position: 'relative', cursor: 'pointer', transition: 'border-color .15s' }}
                onClick={() => openFile(f)}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#818CF8'}
                onMouseLeave={e => e.currentTarget.style.borderColor = c.bord}>
                {f.type?.startsWith('image/') && f.dataUrl
                  ? <img src={f.dataUrl} alt={f.name} style={{ width: '100%', height: 72, objectFit: 'cover', borderRadius: 6, marginBottom: 8 }}/>
                  : <div style={{ fontSize: 28, marginBottom: 8, textAlign: 'center' }}>{fileIcon(f)}</div>
                }
                <div style={{ fontSize: 12, fontWeight: 600, color: c.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2 }} title={f.name}>{f.name}</div>
                <div style={{ fontSize: 10, color: c.mut, marginBottom: 3 }}>{Math.round(f.size/1024)}KB · {new Date(f.uploadedAt).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}</div>
                <div style={{ fontSize: 10, color: textExtracted(f) ? '#34D399' : '#818CF8' }}>
                  {textExtracted(f) ? '✓ Text extracted · AI readable' : (f.dataUrl ? '👁 Click to view · AI reference' : '📎 AI reference')}
                </div>
                <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
                  <button onClick={e => { e.stopPropagation(); openFile(f); }}
                    style={{ flex: 1, padding: '4px 0', borderRadius: 6, background: dark ? 'rgba(255,255,255,.07)' : 'rgba(99,102,241,.08)', border: 'none', color: c.text, cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>👁 View</button>
                  <button onClick={e => { e.stopPropagation(); removeFile(f.id); }}
                    style={{ width: 28, padding: '4px 0', borderRadius: 6, background: 'rgba(239,68,68,.08)', border: 'none', color: '#F87171', cursor: 'pointer', fontSize: 11 }}>×</button>
                </div>
              </div>
            ))}
            <div onClick={() => fileInputRef.current?.click()}
              style={{ padding: 12, borderRadius: 10, border: `1.5px dashed ${c.bord}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer', minHeight: 80 }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#818CF8'}
              onMouseLeave={e => e.currentTarget.style.borderColor = c.bord}>
              <div style={{ fontSize: 22, color: c.mut }}>+</div>
              <div style={{ fontSize: 11, color: c.mut }}>Add more</div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ─── PROJECT WIKI OVERVIEW ────────────────────────────────────────────────────
// Stable top-level component so WikiAIPanel input never loses focus
function WikiOverview({ curProject, projPages, pinnedPages, projectId, projectFiles, setProjectFiles, saveWiki, projects, pages, getProjectContext, onNewPage, onDeleteProject, onOpenPage, onTogglePin, onDeletePage, dark, c }) {
  const totalPages = projPages.length;
  const lastEdited = [...projPages].sort((a,b) => b.updatedAt - a.updatedAt)[0];
  const wordCount = projPages.reduce((acc, pg) => acc + (pg.blocks?.map(b => b.content||'').join(' ').split(/\s+/).filter(Boolean).length||0), 0);

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '32px 40px', maxWidth: 860, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 28 }}>
        <div style={{ width: 56, height: 56, borderRadius: 14, background: curProject?.color+'22', border: `2px solid ${curProject?.color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0 }}>{curProject?.emoji}</div>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: c.text, margin: 0, letterSpacing: '-.025em' }}>{curProject?.name}</h1>
          {curProject?.desc && <p style={{ color: c.mut, fontSize: 14, marginTop: 5, marginBottom: 0, lineHeight: 1.6 }}>{curProject.desc}</p>}
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button onClick={onNewPage} style={{ padding: '8px 16px', borderRadius: 9, background: 'linear-gradient(135deg,#6B5FE4,#9B8AFB)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>+ New page</button>
          <button onClick={onDeleteProject} style={{ padding: '8px 14px', borderRadius: 9, background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', color: '#F87171', cursor: 'pointer', fontSize: 13 }}>🗑</button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 24 }}>
        {[{label:'Pages',value:totalPages,icon:'📄'},{label:'Words documented',value:wordCount.toLocaleString(),icon:'📝'},{label:'Last edited',value:lastEdited?new Date(lastEdited.updatedAt).toLocaleDateString('en-GB',{day:'numeric',month:'short'}):'—',icon:'🕐'}].map(s=>(
          <div key={s.label} style={{ padding: '16px 18px', borderRadius: 12, background: dark?'rgba(255,255,255,.04)':'rgba(255,255,255,.8)', border: `1px solid ${c.bord}` }}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>{s.icon}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: c.text, letterSpacing: '-.02em' }}>{s.value}</div>
            <div style={{ fontSize: 11, color: c.mut, textTransform: 'uppercase', letterSpacing: '.07em', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* File panel */}
      <WikiFilePanel selProject={projectId} projectFiles={projectFiles} setProjectFiles={setProjectFiles} saveWiki={saveWiki} projects={projects} pages={pages} dark={dark} c={c}/>

      {/* AI panel — stable, never remounts */}
      <div style={{ marginBottom: 24 }}>
        <WikiAIPanel projectId={projectId} projectName={curProject?.name} getProjectContext={getProjectContext}/>
      </div>

      {/* Pinned */}
      {pinnedPages.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: c.mut, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10 }}>📌 Pinned</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px,1fr))', gap: 10 }}>
            {pinnedPages.map(pg => (
              <div key={pg.id} onClick={() => onOpenPage(pg.id)} style={{ padding: '14px 16px', borderRadius: 12, background: dark?'rgba(255,255,255,.05)':'rgba(255,255,255,.8)', border: `1px solid ${c.bord}`, cursor: 'pointer', transition: 'all .15s' }}
                onMouseEnter={e=>e.currentTarget.style.borderColor='#818CF8'} onMouseLeave={e=>e.currentTarget.style.borderColor=c.bord}>
                <div style={{ fontSize: 22, marginBottom: 6 }}>{pg.emoji}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: c.text, marginBottom: 4 }}>{pg.title}</div>
                <div style={{ fontSize: 11, color: c.mut }}>{new Date(pg.updatedAt).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All pages */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: c.mut, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10 }}>All pages ({projPages.length})</div>
        {projPages.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', borderRadius: 12, border: `1.5px dashed ${c.bord}` }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>📄</div>
            <div style={{ color: c.mut, fontSize: 14, marginBottom: 14 }}>No pages yet</div>
            <button onClick={onNewPage} style={{ padding: '9px 20px', borderRadius: 9, background: 'linear-gradient(135deg,#6B5FE4,#9B8AFB)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>+ Create first page</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {projPages.map(pg => (
              <div key={pg.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, cursor: 'pointer', border: '1px solid transparent', transition: 'all .12s' }}
                onClick={() => onOpenPage(pg.id)}
                onMouseEnter={e=>{e.currentTarget.style.background=dark?'rgba(255,255,255,.04)':'rgba(99,102,241,.05)';e.currentTarget.style.borderColor=c.bord;}}
                onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.borderColor='transparent';}}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{pg.emoji}</span>
                <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: c.text }}>{pg.title}</span>
                <span style={{ fontSize: 11, color: c.mut }}>{new Date(pg.updatedAt).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}</span>
                <span style={{ fontSize: 13, cursor: 'pointer', color: pg.pinned?'#FBBF24':c.mut }} onClick={e=>{e.stopPropagation();onTogglePin(pg.id);}} title={pg.pinned?'Unpin':'Pin'}>{pg.pinned?'📌':'📍'}</span>
                <span style={{ fontSize: 11, color: '#F87171', cursor: 'pointer', opacity: 0.6 }} onClick={e=>{e.stopPropagation();onDeletePage(pg.id);}} title="Delete">🗑</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── PROJECT WIKI ─────────────────────────────────────────────────────────────
function ProjectWiki({ team, session, members = [] }) {
  const c = useC();
  const { dark } = useTheme();
  const teamId = team?.id || 'demo';
  const WIKI_KEY = `ss-wiki-${teamId}`;

  const [projects, setProjects]     = useState([]);
  const [pages, setPages]           = useState([]);
  const [selProject, setSelProject] = useState(null);
  const [selPage, setSelPage]       = useState(null);
  const [view, setView]             = useState('home');
  const [sideCollapsed, setSideCollapsed] = useState(false);
  const [projectFiles, setProjectFiles]   = useState({});
  const [search, setSearch]         = useState('');
  const [saving, setSaving]         = useState(false);

  // new project form
  const [npName, setNpName]   = useState('');
  const [npEmoji, setNpEmoji] = useState('📁');
  const [npColor, setNpColor] = useState('#6366F1');
  const [npDesc, setNpDesc]   = useState('');

  // new page form
  const [pgTitle, setPgTitle] = useState('');
  const [pgEmoji, setPgEmoji] = useState('📄');

  const EMOJI_PRESETS = ['📁','🚀','⚡','🎯','🔥','💡','🏗️','🎨','🔬','📱','📊','🔧','📋','🌟','🛡️','🤖','💬','📅','🔑','🌐'];
  const COLOR_PRESETS = ['#6366F1','#34D399','#F87171','#FBBF24','#60A5FA','#F472B6','#A78BFA','#14B8A6','#F97316','#8B5CF6'];

  // ── Load ──
  useEffect(() => {
    try {
      const raw = localStorage.getItem(WIKI_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        setProjects(d.projects || []);
        setPages(d.pages || []);
        if (d.projectFiles) setProjectFiles(d.projectFiles);
        if (d.projects?.length) setSelProject(d.projects[0].id);
      } else {
        const dp = { id:'p1', name:'Getting Started', emoji:'🚀', color:'#6366F1', desc:'Team knowledge base', createdAt:Date.now() };
        const dpg = { id:'pg1', projectId:'p1', title:'Welcome to Project Wiki', emoji:'👋', pinned:true, updatedAt:Date.now(),
          blocks:[
            {id:'b1',type:'heading1',content:'Welcome to Project Wiki 👋'},
            {id:'b2',type:'callout',content:'Create SOPs, docs, and notes — all searchable by AI.',calloutType:'info'},
            {id:'b3',type:'heading2',content:'Getting started'},
            {id:'b4',type:'bullet',content:'Create projects for each product or workstream'},
            {id:'b5',type:'bullet',content:'Upload PDFs and SOPs — AI extracts and reads them'},
            {id:'b6',type:'bullet',content:'Ask AI anything about your project'},
            {id:'b7',type:'divider',content:''},
            {id:'b8',type:'paragraph',content:'Type / to add block types: /h1 /bullet /todo /callout /code'},
          ]};
        const initP=[dp], initPg=[dpg];
        setProjects(initP); setPages(initPg); setSelProject('p1');
        saveWiki(initP, initPg, {});
      }
    } catch(e) {}
  }, [WIKI_KEY]);

  const saveWiki = useCallback((p, pg, pf) => {
    try {
      const files = pf !== undefined ? pf : projectFiles;
      // Strip dataUrls from non-image files to save space
      const fs = {};
      Object.keys(files).forEach(pid => {
        fs[pid] = files[pid].map(f => ({ ...f, dataUrl: f.type?.startsWith('image/') ? f.dataUrl : f.dataUrl }));
      });
      localStorage.setItem(WIKI_KEY, JSON.stringify({ projects: p, pages: pg, projectFiles: fs, savedAt: Date.now() }));
    } catch(e) {}
  }, [WIKI_KEY, projectFiles]);

  const autoSave = useCallback((p, pg, pf) => {
    setSaving(true);
    saveWiki(p, pg, pf);
    setTimeout(() => setSaving(false), 800);
  }, [saveWiki]);

  // ── Derived ──
  const curProject  = projects.find(p => p.id === selProject);
  const projPages   = pages.filter(p => p.projectId === selProject);
  const curPage     = pages.find(p => p.id === selPage);
  const pinnedPages = projPages.filter(p => p.pinned);

  const searchResults = search.trim().length > 1
    ? pages.filter(pg => {
        const q = search.toLowerCase();
        return pg.title.toLowerCase().includes(q) || pg.blocks?.some(b => b.content?.toLowerCase().includes(q));
      }).slice(0, 8)
    : [];

  // ── AI context — includes page text + extracted file text ──
  const getProjectContext = useCallback((projectId) => {
    const pgs = pages.filter(p => p.projectId === projectId);
    const pageText = pgs.map(pg => `## ${pg.emoji} ${pg.title}\n${pg.blocks?.map(b=>b.content||'').join('\n')||''}`).join('\n\n---\n\n');
    const files = projectFiles[projectId] || [];
    const fileText = files.filter(f => f.extractedText).map(f => {
      const isRealText = f.extractedText && !f.extractedText.startsWith('[');
      return `## 📎 ${f.name}\n${isRealText ? f.extractedText.slice(0, 8000) : f.extractedText}`;
    }).join('\n\n---\n\n');
    return [pageText, fileText].filter(Boolean).join('\n\n=== UPLOADED FILES ===\n\n');
  }, [pages, projectFiles]);

  // ── Actions ──
  const createProject = () => {
    if (!npName.trim()) return;
    const p = { id:'p'+Date.now(), name:npName.trim(), emoji:npEmoji, color:npColor, desc:npDesc.trim(), createdAt:Date.now() };
    const np = [...projects, p];
    setProjects(np); setSelProject(p.id); setView('overview');
    setNpName(''); setNpDesc(''); setNpEmoji('📁'); setNpColor('#6366F1');
    autoSave(np, pages);
  };

  const deleteProject = (id) => {
    if (!window.confirm('Delete this project and all its pages?')) return;
    const np = projects.filter(p => p.id !== id);
    const npg = pages.filter(p => p.projectId !== id);
    setProjects(np); setPages(npg);
    setSelProject(np[0]?.id || null);
    setView(np.length ? 'overview' : 'home');
    autoSave(np, npg);
  };

  const createPage = () => {
    if (!pgTitle.trim() || !selProject) return;
    const pg = { id:'pg'+Date.now(), projectId:selProject, title:pgTitle.trim(), emoji:pgEmoji, pinned:false, updatedAt:Date.now(),
      blocks:[{id:'b'+Date.now(),type:'heading1',content:pgTitle.trim()},{id:'b'+(Date.now()+1),type:'paragraph',content:''}] };
    const npg = [...pages, pg];
    setPages(npg); setSelPage(pg.id); setView('page');
    setPgTitle(''); setPgEmoji('📄');
    autoSave(projects, npg);
  };

  const deletePage = (id) => {
    if (!window.confirm('Delete this page?')) return;
    const npg = pages.filter(p => p.id !== id);
    setPages(npg); setSelPage(null); setView('overview');
    autoSave(projects, npg);
  };

  const togglePin = (id) => {
    const npg = pages.map(p => p.id === id ? { ...p, pinned: !p.pinned } : p);
    setPages(npg); autoSave(projects, npg);
  };

  const updatePageBlocks = useCallback((pageId, blocks) => {
    setPages(pgs => {
      const npg = pgs.map(p => p.id === pageId ? { ...p, blocks, updatedAt: Date.now() } : p);
      saveWiki(projects, npg);
      return npg;
    });
  }, [projects, saveWiki]);

  const updatePageMeta = (pageId, meta) => {
    const npg = pages.map(p => p.id === pageId ? { ...p, ...meta, updatedAt: Date.now() } : p);
    setPages(npg); autoSave(projects, npg);
  };

  // ── Sidebar ──
  const Sidebar = () => (
    <div style={{ width: sideCollapsed?44:240, flexShrink:0, background: dark?'rgba(8,6,22,.97)':'#F8F8FC', borderRight:`1px solid ${c.bord}`, display:'flex', flexDirection:'column', transition:'width .2s', overflow:'hidden' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:sideCollapsed?'center':'space-between', padding:sideCollapsed?'10px 0':'10px 12px', borderBottom:`1px solid ${c.bord}`, flexShrink:0 }}>
        {!sideCollapsed && <span style={{ fontSize:12, fontWeight:700, color:c.mut, textTransform:'uppercase', letterSpacing:'.08em' }}>Projects</span>}
        <button onClick={() => setSideCollapsed(s=>!s)} style={{ width:28, height:28, borderRadius:7, border:`1px solid ${c.bord}`, background:'transparent', color:c.mut, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13 }}>
          {sideCollapsed?'→':'←'}
        </button>
      </div>
      {!sideCollapsed && (
        <>
          <div style={{ padding:'8px 10px', borderBottom:`1px solid ${c.bord}`, flexShrink:0, position:'relative' }}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍  Search docs..." style={{ width:'100%', background:dark?'rgba(255,255,255,.06)':'rgba(99,102,241,.07)', border:`1px solid ${c.bord}`, borderRadius:8, padding:'6px 10px', color:c.text, fontSize:12, outline:'none', boxSizing:'border-box' }}/>
            {search && searchResults.length > 0 && (
              <div style={{ position:'absolute', zIndex:100, width:220, background:dark?'#12103A':'#fff', border:`1px solid ${c.bord}`, borderRadius:10, marginTop:4, boxShadow:'0 8px 24px rgba(0,0,0,.2)', maxHeight:240, overflowY:'auto', left:10 }}>
                {searchResults.map(pg => {
                  const proj = projects.find(p => p.id === pg.projectId);
                  return (
                    <div key={pg.id} onClick={() => { setSelProject(pg.projectId); setSelPage(pg.id); setView('page'); setSearch(''); }}
                      style={{ padding:'9px 12px', cursor:'pointer', borderBottom:`1px solid ${c.bord}` }}
                      onMouseEnter={e=>e.currentTarget.style.background='rgba(99,102,241,.08)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                      <div style={{ fontSize:12, fontWeight:600, color:c.text }}>{pg.emoji} {pg.title}</div>
                      <div style={{ fontSize:10, color:c.mut }}>{proj?.emoji} {proj?.name}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div style={{ flex:1, overflowY:'auto', padding:'8px 6px' }}>
            {projects.map(proj => (
              <div key={proj.id}>
                <div onClick={() => { setSelProject(proj.id); setView('overview'); setSelPage(null); }}
                  style={{ display:'flex', alignItems:'center', gap:7, padding:'7px 8px', borderRadius:8, cursor:'pointer', background:selProject===proj.id?(dark?'rgba(99,102,241,.18)':'rgba(99,102,241,.12)'):'transparent', marginBottom:2, transition:'background .12s' }}
                  onMouseEnter={e=>{if(selProject!==proj.id)e.currentTarget.style.background=dark?'rgba(255,255,255,.05)':'rgba(99,102,241,.06)';}}
                  onMouseLeave={e=>{if(selProject!==proj.id)e.currentTarget.style.background='transparent';}}>
                  <span style={{ fontSize:15, flexShrink:0 }}>{proj.emoji}</span>
                  <span style={{ fontSize:13, fontWeight:selProject===proj.id?700:500, color:selProject===proj.id?'#818CF8':c.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>{proj.name}</span>
                  <div style={{ width:8, height:8, borderRadius:'50%', background:proj.color, flexShrink:0, opacity:.7 }}/>
                </div>
                {selProject===proj.id && (
                  <div style={{ paddingLeft:16, marginBottom:4 }}>
                    {pages.filter(p=>p.projectId===proj.id).map(pg=>(
                      <div key={pg.id} onClick={()=>{setSelPage(pg.id);setView('page');}}
                        style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 8px', borderRadius:7, cursor:'pointer', background:selPage===pg.id?(dark?'rgba(99,102,241,.14)':'rgba(99,102,241,.09)'):'transparent', marginBottom:1, transition:'background .1s' }}
                        onMouseEnter={e=>{if(selPage!==pg.id)e.currentTarget.style.background=dark?'rgba(255,255,255,.04)':'rgba(99,102,241,.05)';}}
                        onMouseLeave={e=>{if(selPage!==pg.id)e.currentTarget.style.background='transparent';}}>
                        <span style={{ fontSize:12 }}>{pg.pinned?'📌':pg.emoji}</span>
                        <span style={{ fontSize:12, color:selPage===pg.id?'#818CF8':c.sub, flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontWeight:selPage===pg.id?600:400 }}>{pg.title}</span>
                      </div>
                    ))}
                    <button onClick={()=>setView('newPage')} style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 8px', width:'100%', background:'transparent', border:'none', color:c.mut, cursor:'pointer', fontSize:11, borderRadius:6, marginTop:2 }}
                      onMouseEnter={e=>e.currentTarget.style.background=dark?'rgba(255,255,255,.04)':'rgba(99,102,241,.06)'}
                      onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                      <span style={{ fontSize:14, fontWeight:700 }}>+</span> New page
                    </button>
                  </div>
                )}
              </div>
            ))}
            <button onClick={()=>setView('newProject')} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 10px', width:'100%', background:'transparent', border:`1px dashed ${c.bord}`, borderRadius:9, color:c.mut, cursor:'pointer', fontSize:12, marginTop:10 }}>
              <span style={{ fontSize:16, fontWeight:700 }}>+</span> New project
            </button>
          </div>
        </>
      )}
      {sideCollapsed && (
        <div style={{ flex:1, overflowY:'auto', padding:'6px 0', display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
          {projects.map(proj=>(
            <button key={proj.id} onClick={()=>{setSelProject(proj.id);setView('overview');setSideCollapsed(false);}} title={proj.name}
              style={{ width:32, height:32, borderRadius:8, background:selProject===proj.id?'rgba(99,102,241,.2)':'transparent', border:selProject===proj.id?'1.5px solid #818CF8':'1.5px solid transparent', cursor:'pointer', fontSize:18, display:'flex', alignItems:'center', justifyContent:'center' }}>
              {proj.emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  // ── Page Editor ──
  const PageEditor = ({ page }) => {
    const [blocks, setBlocks]         = useState(() => page.blocks || []);
    const [localTitle, setLocalTitle] = useState(page.title);
    const [localEmoji, setLocalEmoji] = useState(page.emoji);
    const [showAI, setShowAI]         = useState(false);
    const blockRefs  = useRef({});
    const nextBId    = useRef(Date.now());

    useEffect(() => {
      const t = setTimeout(() => {
        updatePageBlocks(page.id, blocks);
        if (localTitle !== page.title || localEmoji !== page.emoji)
          updatePageMeta(page.id, { title:localTitle, emoji:localEmoji });
      }, 600);
      return () => clearTimeout(t);
    }, [blocks, localTitle, localEmoji]);

    const insertBlock = (afterIdx, type='paragraph', content='') => {
      const id = 'b'+(nextBId.current++);
      setBlocks(bs => {
        const nb = { id, type, content };
        return [...bs.slice(0, afterIdx+1), nb, ...bs.slice(afterIdx+1)];
      });
      setTimeout(() => blockRefs.current[id]?.focus(), 30);
    };

    const deleteBlock = (idx) => {
      if (blocks.length <= 1) return;
      const prev = blocks[idx-1];
      setBlocks(bs => bs.filter((_,i) => i !== idx));
      setTimeout(() => prev && blockRefs.current[prev.id]?.focus(), 30);
    };

    const updateBlock = (id, props) => setBlocks(bs => bs.map(b => b.id===id?{...b,...props}:b));

    const handleKey = (e, block, idx) => {
      const val = e.target.value || '';
      if (e.key==='Enter' && !e.shiftKey) {
        e.preventDefault();
        if (val.startsWith('/')) {
          const m={'/h1':'heading1','/h2':'heading2','/h3':'heading3','/bullet':'bullet','/num':'numbered','/todo':'todo','/code':'code','/quote':'quote','/callout':'callout','/divider':'divider'};
          if (m[val.toLowerCase().trim()]) { updateBlock(block.id,{type:m[val.toLowerCase().trim()],content:''}); return; }
        }
        insertBlock(idx); return;
      }
      if (e.key==='Backspace' && !val) { e.preventDefault(); deleteBlock(idx); return; }
      if (e.key==='ArrowUp' && idx>0) { blockRefs.current[blocks[idx-1]?.id]?.focus(); e.preventDefault(); }
      if (e.key==='ArrowDown' && idx<blocks.length-1) { blockRefs.current[blocks[idx+1]?.id]?.focus(); e.preventDefault(); }
    };

    const bStyle = (type) => {
      const base = { width:'100%', background:'transparent', border:'none', outline:'none', fontFamily:'Inter,sans-serif', color:'#111827', resize:'none', lineHeight:1.7, display:'block', boxSizing:'border-box', fontSize:14 };
      if (type==='heading1') return {...base, fontSize:28, fontWeight:800, letterSpacing:'-.02em', lineHeight:1.3};
      if (type==='heading2') return {...base, fontSize:22, fontWeight:700};
      if (type==='heading3') return {...base, fontSize:17, fontWeight:700};
      if (type==='code')     return {...base, fontFamily:'monospace', fontSize:13, background:'rgba(0,0,0,.05)', padding:'12px 14px', borderRadius:8, color:'#c7254e'};
      if (type==='quote')    return {...base, fontStyle:'italic', borderLeft:'4px solid #818CF8', paddingLeft:16, color:'#374151'};
      return base;
    };

    const renderBlock = (block, idx) => {
      if (block.type==='divider') return (
        <div key={block.id} style={{ padding:'8px 0', position:'relative' }}
          onMouseEnter={e=>e.currentTarget.querySelector('.bdel')&&(e.currentTarget.querySelector('.bdel').style.opacity='1')}
          onMouseLeave={e=>e.currentTarget.querySelector('.bdel')&&(e.currentTarget.querySelector('.bdel').style.opacity='0')}>
          <hr style={{ border:'none', borderTop:`2px solid ${c.bord}`, margin:'8px 0' }}/>
          <button className="bdel" onClick={()=>deleteBlock(idx)} style={{ position:'absolute', right:-26, top:'50%', transform:'translateY(-50%)', width:20, height:20, borderRadius:'50%', background:'rgba(239,68,68,.1)', border:'none', color:'#F87171', cursor:'pointer', opacity:0, transition:'opacity .15s' }}>×</button>
        </div>
      );

      if (block.type==='callout') {
        const ts = {info:{bg:'rgba(99,102,241,.08)',border:'rgba(99,102,241,.25)',icon:'ℹ️'},warning:{bg:'rgba(245,158,11,.08)',border:'rgba(245,158,11,.25)',icon:'⚠️'},success:{bg:'rgba(52,211,153,.08)',border:'rgba(52,211,153,.25)',icon:'✅'},danger:{bg:'rgba(239,68,68,.08)',border:'rgba(239,68,68,.25)',icon:'🚨'}};
        const t = ts[block.calloutType||'info'];
        return (
          <div key={block.id} style={{ display:'flex', gap:12, padding:'12px 16px', background:t.bg, border:`1px solid ${t.border}`, borderRadius:10, margin:'4px 0', position:'relative' }}
            onMouseEnter={e=>e.currentTarget.querySelector('.bdel')&&(e.currentTarget.querySelector('.bdel').style.opacity='1')}
            onMouseLeave={e=>e.currentTarget.querySelector('.bdel')&&(e.currentTarget.querySelector('.bdel').style.opacity='0')}>
            <span style={{ fontSize:18, flexShrink:0, marginTop:2 }}>{t.icon}</span>
            <textarea ref={el=>blockRefs.current[block.id]=el} value={block.content} rows={Math.max(1,(block.content||'').split('\n').length)}
              onChange={e=>updateBlock(block.id,{content:e.target.value})} onKeyDown={e=>handleKey(e,block,idx)}
              style={{...bStyle('paragraph'),flex:1,height:'auto',minHeight:24}} placeholder="Callout text…"/>
            <div style={{ display:'flex', gap:3, flexShrink:0 }}>
              {Object.keys(ts).map(tp=><button key={tp} onClick={()=>updateBlock(block.id,{calloutType:tp})} style={{ width:20, height:20, borderRadius:'50%', border:'none', background:ts[tp].bg, cursor:'pointer', fontSize:10 }}>{ts[tp].icon}</button>)}
            </div>
            <button className="bdel" onClick={()=>deleteBlock(idx)} style={{ position:'absolute', right:-26, top:10, width:20, height:20, borderRadius:'50%', background:'rgba(239,68,68,.1)', border:'none', color:'#F87171', cursor:'pointer', opacity:0, transition:'opacity .15s' }}>×</button>
          </div>
        );
      }

      if (block.type==='todo') {
        return (
          <div key={block.id} style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'3px 0', position:'relative' }}
            onMouseEnter={e=>e.currentTarget.querySelector('.bdel')&&(e.currentTarget.querySelector('.bdel').style.opacity='1')}
            onMouseLeave={e=>e.currentTarget.querySelector('.bdel')&&(e.currentTarget.querySelector('.bdel').style.opacity='0')}>
            <button onClick={()=>updateBlock(block.id,{checked:!block.checked})} style={{ width:18, height:18, borderRadius:4, border:`2px solid ${block.checked?'#34D399':'#94A3B8'}`, background:block.checked?'#34D399':'transparent', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:4 }}>
              {block.checked&&<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            </button>
            <textarea ref={el=>blockRefs.current[block.id]=el} value={block.content} rows={1}
              onChange={e=>updateBlock(block.id,{content:e.target.value})} onKeyDown={e=>handleKey(e,block,idx)}
              style={{...bStyle('paragraph'),textDecoration:block.checked?'line-through':'none',opacity:block.checked?.55:1,flex:1,height:'auto',minHeight:28}} placeholder="To-do item…"/>
            <button className="bdel" onClick={()=>deleteBlock(idx)} style={{ position:'absolute', right:-26, top:4, width:20, height:20, borderRadius:'50%', background:'rgba(239,68,68,.1)', border:'none', color:'#F87171', cursor:'pointer', opacity:0, transition:'opacity .15s' }}>×</button>
          </div>
        );
      }

      const prefix = block.type==='bullet'?'•':block.type==='numbered'?`${idx+1}.`:null;
      return (
        <div key={block.id} style={{ display:'flex', alignItems:'flex-start', gap:8, padding:'2px 0', position:'relative' }}
          onMouseEnter={e=>e.currentTarget.querySelector('.bdel')&&(e.currentTarget.querySelector('.bdel').style.opacity='1')}
          onMouseLeave={e=>e.currentTarget.querySelector('.bdel')&&(e.currentTarget.querySelector('.bdel').style.opacity='0')}>
          {prefix&&<span style={{ fontSize:14, color:'#64748B', flexShrink:0, marginTop:4, minWidth:20, fontWeight:600 }}>{prefix}</span>}
          <textarea ref={el=>blockRefs.current[block.id]=el} value={block.content}
            rows={Math.max(1,Math.ceil((block.content||'').length/80))}
            onChange={e=>{updateBlock(block.id,{content:e.target.value});e.target.style.height='auto';e.target.style.height=e.target.scrollHeight+'px';}}
            onKeyDown={e=>handleKey(e,block,idx)}
            placeholder={block.type==='heading1'?'Heading 1':block.type==='heading2'?'Heading 2':block.type==='heading3'?'Heading 3':block.type==='code'?'Code…':block.type==='quote'?'Quote…':block.type==='bullet'?'Bullet…':block.type==='numbered'?'Item…':'Type or / for commands…'}
            style={{...bStyle(block.type),flex:1,height:'auto',minHeight:block.type.startsWith('heading')?36:28}}/>
          <button className="bdel" onClick={()=>deleteBlock(idx)} style={{ position:'absolute', right:-26, top:4, width:20, height:20, borderRadius:'50%', background:'rgba(239,68,68,.1)', border:'none', color:'#F87171', cursor:'pointer', opacity:0, transition:'opacity .15s' }}>×</button>
        </div>
      );
    };

    return (
      <div style={{ flex:1, display:'flex', flexDirection:'column', background:'#fff', overflowY:'auto' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 16px 10px 24px', borderBottom:'1px solid rgba(0,0,0,.07)', flexShrink:0, background:'#fafafa', flexWrap:'wrap' }}>
          <button onClick={()=>{setSelPage(null);setView('overview');}} style={{ background:'none', border:'none', color:'#94A3B8', cursor:'pointer', fontSize:13, padding:0 }}>
            ← {curProject?.emoji} {curProject?.name}
          </button>
          <span style={{ color:'#CBD5E1' }}>/</span>
          <span style={{ fontSize:13, color:'#374151', fontWeight:600 }}>{page.emoji} {page.title}</span>
          <div style={{ flex:1 }}/>
          <span style={{ fontSize:11, color:'#94A3B8' }}>{saving?'Saving…':'Auto-saved'}</span>
          <button onClick={()=>togglePin(page.id)} style={{ padding:'4px 10px', borderRadius:7, background:page.pinned?'rgba(251,191,36,.12)':'transparent', border:`1px solid ${page.pinned?'rgba(251,191,36,.3)':'rgba(0,0,0,.1)'}`, color:page.pinned?'#D97706':'#94A3B8', cursor:'pointer', fontSize:12 }}>{page.pinned?'📌 Pinned':'📍 Pin'}</button>
          <button onClick={()=>setShowAI(s=>!s)} style={{ padding:'4px 12px', borderRadius:7, background:showAI?'rgba(99,102,241,.12)':'transparent', border:`1px solid ${showAI?'rgba(99,102,241,.3)':'rgba(0,0,0,.1)'}`, color:showAI?'#6366F1':'#94A3B8', cursor:'pointer', fontSize:12, fontWeight:600 }}>✦ Ask AI</button>
          <button onClick={()=>deletePage(page.id)} style={{ padding:'4px 10px', borderRadius:7, background:'rgba(239,68,68,.06)', border:'1px solid rgba(239,68,68,.15)', color:'#EF4444', cursor:'pointer', fontSize:12 }}>🗑 Delete</button>
        </div>

        <div style={{ display:'flex', flex:1, minHeight:0 }}>
          <div style={{ flex:1, overflowY:'auto', padding:'40px 60px', maxWidth:780, margin:'0 auto', width:'100%', boxSizing:'border-box' }}>
            <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:32 }}>
              <div style={{ position:'relative' }}>
                <div style={{ fontSize:40, cursor:'pointer', lineHeight:1 }}>{localEmoji}</div>
                <select value={localEmoji} onChange={e=>setLocalEmoji(e.target.value)} style={{ position:'absolute', inset:0, opacity:0, cursor:'pointer', width:'100%' }}>
                  {EMOJI_PRESETS.map(em=><option key={em} value={em}>{em}</option>)}
                </select>
              </div>
              <input value={localTitle} onChange={e=>setLocalTitle(e.target.value)}
                style={{ flex:1, background:'transparent', border:'none', outline:'none', fontSize:32, fontWeight:800, color:'#111827', letterSpacing:'-.025em', fontFamily:'Inter,sans-serif' }}
                placeholder="Page title…"/>
            </div>
            <div style={{ fontSize:11, color:'#9CA3AF', marginBottom:20, padding:'5px 10px', background:'rgba(0,0,0,.03)', borderRadius:7, display:'inline-block' }}>
              Type <code style={{ background:'rgba(0,0,0,.06)', padding:'1px 5px', borderRadius:3 }}>/h1</code> <code style={{ background:'rgba(0,0,0,.06)', padding:'1px 5px', borderRadius:3 }}>/bullet</code> <code style={{ background:'rgba(0,0,0,.06)', padding:'1px 5px', borderRadius:3 }}>/todo</code> <code style={{ background:'rgba(0,0,0,.06)', padding:'1px 5px', borderRadius:3 }}>/callout</code> then Enter
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:2, position:'relative' }}>
              {blocks.map((block, idx) => renderBlock(block, idx))}
            </div>
            <button onClick={()=>insertBlock(blocks.length-1)} style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 0', color:'#9CA3AF', background:'none', border:'none', cursor:'pointer', fontSize:13, marginTop:16 }}
              onMouseEnter={e=>e.currentTarget.style.color='#6366F1'} onMouseLeave={e=>e.currentTarget.style.color='#9CA3AF'}>
              <span style={{ width:22, height:22, borderRadius:'50%', border:'1.5px solid currentColor', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:300 }}>+</span>
              Add block
            </button>
          </div>

          {/* Per-page AI sidebar — also uses WikiAIPanel, stable component */}
          {showAI && (
            <div style={{ width:320, flexShrink:0, borderLeft:'1px solid rgba(0,0,0,.07)', display:'flex', flexDirection:'column', background:'#fafafa', overflowY:'auto', padding:12 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                <span style={{ fontSize:13, fontWeight:700, color:'#374151' }}>✦ Ask AI</span>
                <button onClick={()=>setShowAI(false)} style={{ background:'none', border:'none', color:'#9CA3AF', cursor:'pointer', fontSize:18 }}>×</button>
              </div>
              <WikiAIPanel projectId={selProject} projectName={curProject?.name} getProjectContext={getProjectContext}/>
            </div>
          )}
        </div>
      </div>
    );
  };

  const HomeView = () => (
    <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:40, gap:20 }}>
      <div style={{ fontSize:56 }}>📚</div>
      <h2 style={{ fontSize:24, fontWeight:800, color:c.text, margin:0 }}>Project Wiki</h2>
      <p style={{ color:c.mut, fontSize:14, textAlign:'center', maxWidth:380, lineHeight:1.7, margin:0 }}>SOPs, runbooks, decisions, onboarding docs — all in one place with AI search.</p>
      <button onClick={()=>setView('newProject')} style={{ padding:'12px 28px', borderRadius:10, background:'linear-gradient(135deg,#6B5FE4,#9B8AFB)', color:'#fff', border:'none', cursor:'pointer', fontSize:14, fontWeight:700 }}>+ Create your first project</button>
    </div>
  );

  const NewProjectView = () => (
    <div style={{ flex:1, overflowY:'auto', padding:40, display:'flex', justifyContent:'center' }}>
      <div style={{ width:'100%', maxWidth:520 }}>
        <button onClick={()=>setView(selProject?'overview':'home')} style={{ background:'none', border:'none', color:c.mut, cursor:'pointer', fontSize:13, marginBottom:24, padding:0 }}>← Back</button>
        <h2 style={{ fontSize:20, fontWeight:800, color:c.text, marginBottom:6 }}>New project</h2>
        <p style={{ color:c.mut, fontSize:13, marginBottom:28 }}>Projects group pages, SOPs, and docs together.</p>
        <div style={{ display:'flex', gap:10, marginBottom:16 }}>
          <div style={{ position:'relative' }}>
            <div style={{ width:52, height:52, borderRadius:12, background:dark?'rgba(255,255,255,.06)':'rgba(99,102,241,.07)', border:`1.5px solid ${c.bord}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, cursor:'pointer' }}>{npEmoji}</div>
            <select value={npEmoji} onChange={e=>setNpEmoji(e.target.value)} style={{ position:'absolute', inset:0, opacity:0, cursor:'pointer' }}>
              {EMOJI_PRESETS.map(em=><option key={em} value={em}>{em}</option>)}
            </select>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:11, fontWeight:600, color:c.mut, textTransform:'uppercase', letterSpacing:'.07em', marginBottom:6 }}>Project name</div>
            <input value={npName} onChange={e=>setNpName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&createProject()} placeholder="e.g. Mobile App, Q3 Sprint, Onboarding…" autoFocus
              style={{ width:'100%', background:dark?'rgba(255,255,255,.06)':'rgba(255,255,255,.9)', border:`1.5px solid ${c.inpB}`, borderRadius:10, padding:'10px 14px', color:c.text, fontSize:14, outline:'none', boxSizing:'border-box' }}/>
          </div>
        </div>
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:11, fontWeight:600, color:c.mut, textTransform:'uppercase', letterSpacing:'.07em', marginBottom:8 }}>Color</div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {COLOR_PRESETS.map(col=><button key={col} onClick={()=>setNpColor(col)} style={{ width:26, height:26, borderRadius:'50%', background:col, border:npColor===col?'3px solid #fff':'3px solid transparent', cursor:'pointer', boxShadow:npColor===col?`0 0 0 2px ${col}`:'none' }}/>)}
          </div>
        </div>
        <div style={{ marginBottom:24 }}>
          <div style={{ fontSize:11, fontWeight:600, color:c.mut, textTransform:'uppercase', letterSpacing:'.07em', marginBottom:6 }}>Description (optional)</div>
          <textarea value={npDesc} onChange={e=>setNpDesc(e.target.value)} placeholder="What is this project about?" rows={3}
            style={{ width:'100%', background:dark?'rgba(255,255,255,.06)':'rgba(255,255,255,.9)', border:`1.5px solid ${c.inpB}`, borderRadius:10, padding:'10px 14px', color:c.text, fontSize:13, outline:'none', boxSizing:'border-box', resize:'vertical', fontFamily:'inherit', lineHeight:1.6 }}/>
        </div>
        <button onClick={createProject} disabled={!npName.trim()} style={{ padding:'11px 28px', borderRadius:10, background:'linear-gradient(135deg,#6B5FE4,#9B8AFB)', color:'#fff', border:'none', cursor:npName.trim()?'pointer':'not-allowed', fontSize:14, fontWeight:700, opacity:npName.trim()?1:.5 }}>Create project</button>
      </div>
    </div>
  );

  const NewPageView = () => (
    <div style={{ flex:1, overflowY:'auto', padding:40, display:'flex', justifyContent:'center' }}>
      <div style={{ width:'100%', maxWidth:480 }}>
        <button onClick={()=>setView('overview')} style={{ background:'none', border:'none', color:c.mut, cursor:'pointer', fontSize:13, marginBottom:24, padding:0 }}>← Back</button>
        <h2 style={{ fontSize:20, fontWeight:800, color:c.text, marginBottom:6 }}>New page</h2>
        <p style={{ color:c.mut, fontSize:13, marginBottom:24 }}>in <strong>{curProject?.emoji} {curProject?.name}</strong></p>
        <div style={{ display:'flex', gap:10, marginBottom:20 }}>
          <div style={{ position:'relative' }}>
            <div style={{ width:48, height:48, borderRadius:10, background:dark?'rgba(255,255,255,.06)':'rgba(99,102,241,.07)', border:`1.5px solid ${c.bord}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, cursor:'pointer' }}>{pgEmoji}</div>
            <select value={pgEmoji} onChange={e=>setPgEmoji(e.target.value)} style={{ position:'absolute', inset:0, opacity:0, cursor:'pointer' }}>
              {EMOJI_PRESETS.map(em=><option key={em} value={em}>{em}</option>)}
            </select>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:11, fontWeight:600, color:c.mut, textTransform:'uppercase', letterSpacing:'.07em', marginBottom:6 }}>Page title</div>
            <input value={pgTitle} onChange={e=>setPgTitle(e.target.value)} onKeyDown={e=>e.key==='Enter'&&createPage()} placeholder="e.g. Deployment SOP, Onboarding Guide…" autoFocus
              style={{ width:'100%', background:dark?'rgba(255,255,255,.06)':'rgba(255,255,255,.9)', border:`1.5px solid ${c.inpB}`, borderRadius:10, padding:'10px 14px', color:c.text, fontSize:14, outline:'none', boxSizing:'border-box' }}/>
          </div>
        </div>
        <button onClick={createPage} disabled={!pgTitle.trim()} style={{ padding:'11px 24px', borderRadius:10, background:'linear-gradient(135deg,#6B5FE4,#9B8AFB)', color:'#fff', border:'none', cursor:pgTitle.trim()?'pointer':'not-allowed', fontSize:14, fontWeight:700, opacity:pgTitle.trim()?1:.5 }}>Create page</button>
      </div>
    </div>
  );

  return (
    <div style={{ display:'flex', height:'calc(100vh - 62px)', borderRadius:14, overflow:'hidden', border:`1px solid ${c.bord}`, background:dark?c.bg:'#fff' }}>
      <Sidebar/>
      <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0, overflow:'hidden' }}>
        {view==='home' && <HomeView/>}
        {view==='newProject' && <NewProjectView/>}
        {view==='newPage' && <NewPageView/>}
        {view==='overview' && curProject && (
          <WikiOverview
            key={selProject}
            curProject={curProject}
            projPages={projPages}
            pinnedPages={pinnedPages}
            projectId={selProject}
            projectFiles={projectFiles}
            setProjectFiles={setProjectFiles}
            saveWiki={saveWiki}
            projects={projects}
            pages={pages}
            getProjectContext={getProjectContext}
            onNewPage={() => setView('newPage')}
            onDeleteProject={() => deleteProject(selProject)}
            onOpenPage={(id) => { setSelPage(id); setView('page'); }}
            onTogglePin={togglePin}
            onDeletePage={deletePage}
            dark={dark}
            c={c}
          />
        )}
        {view==='page' && curPage && <PageEditor key={curPage.id} page={curPage}/>}
      </div>
    </div>
  );
}


// ─── BRAINSTORM SPACE ─────────────────────────────────────────────────────────
// Full Miro-like infinite canvas. Personal + Shared modes. Auto-saved.
// Features: sticky notes (stack/copy/paste/del), text boxes, shapes (rect/circle/diamond/pill),
// free-draw pen (color + thickness), connectors (straight/curved/elbow), node drag,
// color picker, text formatting, mini-map, undo/redo, fit view, zoom.

const BS_STICKY_COLORS = ['#FDE68A','#FCA5A5','#6EE7B7','#93C5FD','#C4B5FD','#FBB6CE','#FED7AA','#D9F99D','#fff','#1e1b4b'];
const BS_DRAW_COLORS   = ['#818CF8','#34D399','#F87171','#FBBF24','#60A5FA','#F472B6','#A78BFA','#000','#fff'];
const BS_SHAPE_COLORS  = [
  {fill:'rgba(99,102,241,.15)',  stroke:'#6366F1'},
  {fill:'rgba(52,211,153,.15)', stroke:'#34D399'},
  {fill:'rgba(248,113,113,.15)',stroke:'#F87171'},
  {fill:'rgba(251,191,36,.18)', stroke:'#FBBF24'},
  {fill:'rgba(196,181,253,.2)', stroke:'#A78BFA'},
  {fill:'rgba(255,255,255,.9)', stroke:'#94A3B8'},
];

function BrainstormSpace({ team, session, members=[] }) {
  const c = useC();
  const { dark } = useTheme();
  const canvasRef = useRef();
  const nextId = useRef(1);

  const userId = session?.user?.id || 'anon';
  const teamId = team?.id || 'demo';
  const [mode, setMode] = useState('personal');
  const BOARD_KEY = `ss-bs-${mode === 'personal' ? userId : 'shared-' + teamId}`;

  const [pan, setPan]   = useState({ x: 80, y: 60 });
  const [zoom, setZoom] = useState(1);
  const [nodes, setNodes]             = useState([]);
  const [connections, setConnections] = useState([]);
  const [drawPaths, setDrawPaths]     = useState([]);
  const [selected, setSelected]       = useState(new Set());
  const [tool, setTool]               = useState('select');
  const [editingId, setEditingId]     = useState(null);

  // ── Draw — use refs so window mousemove always has fresh data ──
  const [drawColor, setDrawColor]   = useState('#000000');
  const [drawWidth, setDrawWidth]   = useState(3);
  const [livePathPts, setLivePathPts] = useState(null); // [{x,y},...] or null
  const livePathRef   = useRef(null); // always fresh copy
  const drawColorRef  = useRef('#000000');
  const drawWidthRef  = useRef(3);
  const isDrawingRef  = useRef(false);

  // sync refs when state changes
  useEffect(() => { drawColorRef.current = drawColor; }, [drawColor]);
  useEffect(() => { drawWidthRef.current = drawWidth; }, [drawWidth]);

  // sticky / shape
  const [stickyColor, setStickyColor]     = useState('#FDE68A');
  const [shapeType, setShapeType]         = useState('rect');
  const [shapeColorIdx, setShapeColorIdx] = useState(0);

  // connector
  const [connType, setConnType]     = useState('curve');
  const [connColor, setConnColor]   = useState('#000000');
  const [connectFrom, setConnectFrom] = useState(null);
  const connectFromRef = useRef(null);
  useEffect(() => { connectFromRef.current = connectFrom; }, [connectFrom]);

  // live preview line when using connect tool
  const [connPreviewPt, setConnPreviewPt] = useState(null);
  const connPreviewRef = useRef(null);
  useEffect(() => { connPreviewRef.current = connPreviewPt; }, [connPreviewPt]);

  // port drag
  const [portDrag, setPortDrag]   = useState(null);
  const portDragRef = useRef(null);
  useEffect(() => { portDragRef.current = portDrag; }, [portDrag]);

  // drag / resize
  const [dragging, setDragging]   = useState(null);
  const draggingRef = useRef(null);
  useEffect(() => { draggingRef.current = dragging; }, [dragging]);

  const [resizing, setResizing]   = useState(null);
  const resizingRef = useRef(null);
  useEffect(() => { resizingRef.current = resizing; }, [resizing]);

  const [selBox, setSelBox]   = useState(null);
  const selBoxRef = useRef(null);
  useEffect(() => { selBoxRef.current = selBox; }, [selBox]);

  const [isPanning, setIsPanning] = useState(false);
  const isPanningRef = useRef(false);
  const panRef = useRef({ x: 0, y: 0 });
  const panStateRef = useRef({ x: 80, y: 60 });
  useEffect(() => { panStateRef.current = pan; }, [pan]);

  const [clipboard, setClipboard] = useState(null);
  const [ctxMenu, setCtxMenu]     = useState(null);
  const nodesRef = useRef([]);
  useEffect(() => { nodesRef.current = nodes; }, [nodes]);
  const connectionsRef = useRef([]);
  useEffect(() => { connectionsRef.current = connections; }, [connections]);
  const drawPathsRef = useRef([]);
  useEffect(() => { drawPathsRef.current = drawPaths; }, [drawPaths]);
  const selectedRef = useRef(new Set());
  useEffect(() => { selectedRef.current = selected; }, [selected]);
  const toolRef = useRef('select');
  useEffect(() => { toolRef.current = tool; }, [tool]);
  const zoomRef = useRef(1);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  const connTypeRef = useRef('curve');
  useEffect(() => { connTypeRef.current = connType; }, [connType]);
  const connColorRef = useRef('#000000');
  useEffect(() => { connColorRef.current = connColor; }, [connColor]);

  const [bsHist, setBsHist] = useState([]);
  const [bsIdx, setBsIdx]   = useState(-1);
  const bsIdxRef = useRef(-1);
  useEffect(() => { bsIdxRef.current = bsIdx; }, [bsIdx]);

  // ── Load ──
  useEffect(() => {
    try {
      const raw = localStorage.getItem(BOARD_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (d.nodes)       { setNodes(d.nodes); nodesRef.current = d.nodes; if (d.nodes.length) nextId.current = Math.max(...d.nodes.map(n => n.id), 0) + 1; }
        if (d.connections) { setConnections(d.connections); connectionsRef.current = d.connections; }
        if (d.drawPaths)   { setDrawPaths(d.drawPaths); drawPathsRef.current = d.drawPaths; }
      } else {
        const welcome = { id: 1, type: 'sticky', x: 60, y: 40, w: 200, h: 160,
          text: '👋 Welcome!\nDouble-click to edit\nDrag to move\nS=sticky T=text D=draw C=connect', color: '#FDE68A',
          fontSize: 12, fontWeight: 400, fontStyle: 'normal', textAlign: 'left' };
        setNodes([welcome]); nodesRef.current = [welcome]; nextId.current = 2;
      }
    } catch(e) {}
  }, [BOARD_KEY]);

  const saveToStorage = useCallback((n, co, dp) => {
    try { localStorage.setItem(BOARD_KEY, JSON.stringify({ nodes: n, connections: co, drawPaths: dp, savedAt: Date.now() })); } catch(e) {}
  }, [BOARD_KEY]);

  const pushHist = useCallback((n, co, dp) => {
    const idx = bsIdxRef.current;
    setBsHist(h => [...h.slice(0, idx + 1), { nodes: JSON.parse(JSON.stringify(n)), connections: JSON.parse(JSON.stringify(co)), drawPaths: JSON.parse(JSON.stringify(dp)) }]);
    setBsIdx(i => i + 1);
    saveToStorage(n, co, dp);
  }, [saveToStorage]);

  const undo = useCallback(() => {
    setBsHist(h => {
      const idx = bsIdxRef.current;
      if (idx < 1) return h;
      const s = h[idx - 1];
      setNodes(s.nodes); nodesRef.current = s.nodes;
      setConnections(s.connections); connectionsRef.current = s.connections;
      setDrawPaths(s.drawPaths); drawPathsRef.current = s.drawPaths;
      setBsIdx(i => i - 1);
      saveToStorage(s.nodes, s.connections, s.drawPaths);
      return h;
    });
  }, [saveToStorage]);

  const redo = useCallback(() => {
    setBsHist(h => {
      const idx = bsIdxRef.current;
      if (idx >= h.length - 1) return h;
      const s = h[idx + 1];
      setNodes(s.nodes); nodesRef.current = s.nodes;
      setConnections(s.connections); connectionsRef.current = s.connections;
      setDrawPaths(s.drawPaths); drawPathsRef.current = s.drawPaths;
      setBsIdx(i => i + 1);
      saveToStorage(s.nodes, s.connections, s.drawPaths);
      return h;
    });
  }, [saveToStorage]);

  // ── Coordinate transform ──
  const toCanvas = useCallback((cx, cy) => {
    const rect = canvasRef.current?.getBoundingClientRect() || { left: 0, top: 0 };
    const z = zoomRef.current, p = panStateRef.current;
    return { x: (cx - rect.left - p.x) / z, y: (cy - rect.top - p.y) / z };
  }, []);

  // ── Wheel zoom ──
  useEffect(() => {
    const el = canvasRef.current; if (!el) return;
    const handler = (e) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const rect = el.getBoundingClientRect();
        const mx = e.clientX - rect.left, my = e.clientY - rect.top;
        const factor = e.deltaY < 0 ? 1.1 : 0.91;
        setZoom(z => {
          const nz = Math.min(4, Math.max(0.1, z * factor));
          setPan(p => { const np = { x: mx - (mx - p.x) * (nz / z), y: my - (my - p.y) * (nz / z) }; panStateRef.current = np; return np; });
          zoomRef.current = nz;
          return nz;
        });
      } else {
        setPan(p => { const np = { x: p.x - e.deltaX, y: p.y - e.deltaY }; panStateRef.current = np; return np; });
      }
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, []);

  // ══ WINDOW-LEVEL MOUSE MOVE + UP ══
  // This is the critical fix: attach to window so events fire even when mouse
  // is over node divs or SVG elements, which would otherwise swallow events.
  useEffect(() => {
    const onMove = (e) => {
      const pt = toCanvas(e.clientX, e.clientY);

      // PAN
      if (isPanningRef.current) {
        const np = { x: e.clientX - panRef.current.x, y: e.clientY - panRef.current.y };
        setPan(np); panStateRef.current = np;
        return;
      }

      // DRAW — always track if drawing
      if (isDrawingRef.current && livePathRef.current) {
        const updated = [...livePathRef.current, [pt.x, pt.y]];
        livePathRef.current = updated;
        setLivePathPts([...updated]);
        return;
      }

      // DRAG nodes
      const drag = draggingRef.current;
      if (drag) {
        const dx = pt.x - drag.startPt.x, dy = pt.y - drag.startPt.y;
        setNodes(ns => ns.map(n => drag.nodeIds.includes(n.id) ? { ...n, x: drag.origPositions[n.id].x + dx, y: drag.origPositions[n.id].y + dy } : n));
        return;
      }

      // RESIZE
      const res = resizingRef.current;
      if (res) {
        setNodes(ns => ns.map(n => n.id === res.id ? { ...n, w: Math.max(80, res.origW + (pt.x - res.startPt.x)), h: Math.max(36, res.origH + (pt.y - res.startPt.y)) } : n));
        return;
      }

      // PORT DRAG preview
      const pd = portDragRef.current;
      if (pd) {
        setPortDrag(p => ({ ...p, preview: pt }));
        portDragRef.current = { ...pd, preview: pt };
        return;
      }

      // CONNECT tool preview
      if (connectFromRef.current) {
        setConnPreviewPt(pt);
        connPreviewRef.current = pt;
      }

      // SELECTION BOX
      const sb = selBoxRef.current;
      if (sb) {
        const nsb = { ...sb, x2: pt.x, y2: pt.y };
        setSelBox(nsb); selBoxRef.current = nsb;
        const x1 = Math.min(nsb.x1, nsb.x2), x2 = Math.max(nsb.x1, nsb.x2);
        const y1 = Math.min(nsb.y1, nsb.y2), y2 = Math.max(nsb.y1, nsb.y2);
        const ns = nodesRef.current;
        setSelected(new Set(ns.filter(n => n.x + n.w > x1 && n.x < x2 && n.y + n.h > y1 && n.y < y2).map(n => n.id)));
      }
    };

    const onUp = (e) => {
      isPanningRef.current = false;
      setIsPanning(false);

      // Commit draw
      if (isDrawingRef.current) {
        isDrawingRef.current = false;
        const pts = livePathRef.current;
        if (pts && pts.length > 1) {
          const id = nextId.current++;
          const newPath = { id, color: drawColorRef.current, width: drawWidthRef.current, pts };
          const np = [...drawPathsRef.current, newPath];
          setDrawPaths(np); drawPathsRef.current = np;
          pushHist(nodesRef.current, connectionsRef.current, np);
        }
        livePathRef.current = null;
        setLivePathPts(null);
        return;
      }

      // Commit drag
      if (draggingRef.current) {
        pushHist(nodesRef.current, connectionsRef.current, drawPathsRef.current);
        setDragging(null); draggingRef.current = null;
      }
      // Commit resize
      if (resizingRef.current) {
        pushHist(nodesRef.current, connectionsRef.current, drawPathsRef.current);
        setResizing(null); resizingRef.current = null;
      }
      // Cancel port drag if not dropped on a node
      if (portDragRef.current) {
        setPortDrag(null); portDragRef.current = null;
        setConnectFrom(null); connectFromRef.current = null;
        setConnPreviewPt(null);
      }

      setSelBox(null); selBoxRef.current = null;
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [toCanvas, pushHist]);

  // ── Keyboard ──
  useEffect(() => {
    const handler = (e) => {
      if (editingId) return;
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if ((e.metaKey||e.ctrlKey) && e.key==='z' && !e.shiftKey) { e.preventDefault(); undo(); return; }
      if ((e.metaKey||e.ctrlKey) && (e.key==='y'||(e.key==='z'&&e.shiftKey))) { e.preventDefault(); redo(); return; }
      if ((e.metaKey||e.ctrlKey) && e.key==='c') {
        const sn = nodesRef.current.filter(n => selectedRef.current.has(n.id));
        if (sn.length) setClipboard({ nodes: sn, connections: connectionsRef.current.filter(c => selectedRef.current.has(c.from) && selectedRef.current.has(c.to)) });
        return;
      }
      if ((e.metaKey||e.ctrlKey) && e.key==='v') {
        const cb = clipboard; if (!cb) return;
        const idMap = {};
        const nn2 = cb.nodes.map(n => { const nid = nextId.current++; idMap[n.id]=nid; return {...n,id:nid,x:n.x+20,y:n.y+20}; });
        const nc2 = (cb.connections||[]).map(c => ({...c,id:nextId.current++,from:idMap[c.from],to:idMap[c.to]}));
        const nn=[...nodesRef.current,...nn2], nc=[...connectionsRef.current,...nc2];
        setNodes(nn); nodesRef.current = nn; setConnections(nc); connectionsRef.current = nc;
        setSelected(new Set(nn2.map(n=>n.id)));
        setClipboard({nodes:nn2,connections:nc2}); pushHist(nn,nc,drawPathsRef.current); return;
      }
      if ((e.metaKey||e.ctrlKey) && e.key==='d') {
        e.preventDefault();
        const sn = nodesRef.current.filter(n => selectedRef.current.has(n.id)); if (!sn.length) return;
        const nn2 = sn.map(n=>({...n,id:nextId.current++,x:n.x+20,y:n.y+20}));
        const nn=[...nodesRef.current,...nn2]; setNodes(nn); nodesRef.current = nn;
        setSelected(new Set(nn2.map(n=>n.id))); pushHist(nn,connectionsRef.current,drawPathsRef.current); return;
      }
      if ((e.metaKey||e.ctrlKey) && e.key==='a') { e.preventDefault(); setSelected(new Set(nodesRef.current.map(n=>n.id))); return; }
      if (e.key==='Delete'||e.key==='Backspace') {
        if (!selectedRef.current.size) return;
        const nn=nodesRef.current.filter(n=>!selectedRef.current.has(n.id));
        const nc=connectionsRef.current.filter(c=>!selectedRef.current.has(c.id)&&!selectedRef.current.has(c.from)&&!selectedRef.current.has(c.to));
        const np=drawPathsRef.current.filter(p=>!selectedRef.current.has(p.id));
        setNodes(nn); nodesRef.current=nn; setConnections(nc); connectionsRef.current=nc; setDrawPaths(np); drawPathsRef.current=np;
        setSelected(new Set()); pushHist(nn,nc,np); return;
      }
      if (e.key==='Escape') { setSelected(new Set()); setConnectFrom(null); connectFromRef.current=null; setConnPreviewPt(null); setCtxMenu(null); }
      if (!e.metaKey&&!e.ctrlKey) {
        if (e.key==='v') setTool('select');
        if (e.key==='s') setTool('sticky');
        if (e.key==='t') setTool('text');
        if (e.key==='d') setTool('draw');
        if (e.key==='c') setTool('connect');
        if (e.key==='h') setTool('shape');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [editingId, clipboard, undo, redo, pushHist]);

  // ── addNode ──
  const addNode = useCallback((type, x, y, extra={}) => {
    const id = nextId.current++;
    const node = {
      id, x, y,
      type: type==='pill'?'shape':type,
      shapeType: type==='pill'?'pill':(type==='shape'?shapeType:undefined),
      w: type==='sticky'?180:type==='text'?220:140,
      h: type==='sticky'?160:type==='text'?56:type==='pill'?52:90,
      text: type==='sticky'?'':(type==='text'?'Type here...':(type==='shape'||type==='pill'?'Label':'')),
      color: type==='sticky'?stickyColor:undefined,
      fill: (type==='shape'||type==='pill')?(BS_SHAPE_COLORS[shapeColorIdx]?.fill||'rgba(99,102,241,.15)'):undefined,
      stroke: (type==='shape'||type==='pill')?(BS_SHAPE_COLORS[shapeColorIdx]?.stroke||'#6366F1'):undefined,
      fontSize: type==='text'?16:13, fontWeight:(type==='shape'||type==='pill')?700:400,
      fontStyle:'normal', textAlign:(type==='shape'||type==='pill')?'center':'left',
      ...extra
    };
    const nn=[...nodesRef.current, node];
    setNodes(nn); nodesRef.current = nn;
    setSelected(new Set([id]));
    pushHist(nn, connectionsRef.current, drawPathsRef.current);
    return id;
  }, [stickyColor, shapeColorIdx, shapeType, pushHist]);

  const updateNode = useCallback((id,props) => setNodes(ns=>ns.map(n=>n.id===id?{...n,...props}:n)), []);
  const updateNodeSave = useCallback((id,props) => {
    setNodes(ns=>{const nn=ns.map(n=>n.id===id?{...n,...props}:n); nodesRef.current=nn; saveToStorage(nn,connectionsRef.current,drawPathsRef.current); return nn;});
  }, [saveToStorage]);
  const commitEdit = useCallback(() => {
    if (!editingId) return;
    setEditingId(null); saveToStorage(nodesRef.current,connectionsRef.current,drawPathsRef.current);
    pushHist(nodesRef.current,connectionsRef.current,drawPathsRef.current);
  }, [editingId, saveToStorage, pushHist]);

  // ── Geometry ──
  const getCenter = useCallback((id) => {
    const n = nodesRef.current.find(x=>x.id===id); if(!n) return null;
    return {x:n.x+n.w/2, y:n.y+n.h/2};
  }, []);

  const connPath = (x1,y1,x2,y2,type) => {
    if (type==='straight') return `M${x1},${y1} L${x2},${y2}`;
    if (type==='elbow') { const mx=(x1+x2)/2; return `M${x1},${y1} L${mx},${y1} L${mx},${y2} L${x2},${y2}`; }
    const dx=Math.abs(x2-x1)*0.5;
    return `M${x1},${y1} C${x1+dx},${y1} ${x2-dx},${y2} ${x2},${y2}`;
  };

  const pathStr = (pts) => pts && pts.length>1 ? 'M'+pts.map(p=>`${p[0]},${p[1]}`).join(' L') : '';

  const fitView = useCallback(() => {
    const ns = nodesRef.current;
    if (!ns.length) { setPan({x:80,y:60}); panStateRef.current={x:80,y:60}; setZoom(1); return; }
    const pad=60;
    const minX=Math.min(...ns.map(n=>n.x))-pad, minY=Math.min(...ns.map(n=>n.y))-pad;
    const maxX=Math.max(...ns.map(n=>n.x+n.w))+pad, maxY=Math.max(...ns.map(n=>n.y+n.h))+pad;
    const rect=canvasRef.current?.getBoundingClientRect()||{width:1100,height:650};
    const z=Math.min(1.5,Math.min(rect.width/(maxX-minX),rect.height/(maxY-minY))*0.9);
    zoomRef.current=z; setZoom(z);
    const np={x:(-minX*z)+(rect.width-(maxX-minX)*z)/2, y:(-minY*z)+(rect.height-(maxY-minY)*z)/2};
    setPan(np); panStateRef.current=np;
  }, []);

  const renderShapeSvg = (node) => {
    const {w,h,shapeType:st,fill,stroke}=node;
    const f=fill||'rgba(99,102,241,.15)', s=stroke||'#6366F1';
    if (st==='circle')  return <ellipse cx={w/2} cy={h/2} rx={w/2-2} ry={h/2-2} fill={f} stroke={s} strokeWidth={2}/>;
    if (st==='diamond') return <polygon points={`${w/2},2 ${w-2},${h/2} ${w/2},${h-2} 2,${h/2}`} fill={f} stroke={s} strokeWidth={2}/>;
    if (st==='pill')    return <rect x={1} y={1} width={w-2} height={h-2} rx={Math.min(h/2-1,28)} fill={f} stroke={s} strokeWidth={2}/>;
    return <rect x={1} y={1} width={w-2} height={h-2} rx={10} fill={f} stroke={s} strokeWidth={2}/>;
  };

  // ── Canvas mousedown — start operations ──
  const onCanvasMouseDown = (e) => {
    if (e.button===1||(e.button===0&&e.altKey)) {
      isPanningRef.current=true; setIsPanning(true);
      panRef.current={x:e.clientX-panStateRef.current.x,y:e.clientY-panStateRef.current.y};
      return;
    }
    if (e.button!==0) return;
    setCtxMenu(null);
    const pt=toCanvas(e.clientX,e.clientY);

    if (tool==='sticky') { addNode('sticky',pt.x-90,pt.y-80); setTool('select'); return; }
    if (tool==='text')   { const id=addNode('text',pt.x-110,pt.y-28); setTimeout(()=>setEditingId(id),50); setTool('select'); return; }
    if (tool==='shape')  { addNode('shape',pt.x-70,pt.y-45); setTool('select'); return; }
    if (tool==='draw') {
      isDrawingRef.current=true;
      livePathRef.current=[[pt.x,pt.y]];
      setLivePathPts([[pt.x,pt.y]]);
      return;
    }
    // select/connect — start rubber band
    if (!e.shiftKey) setSelected(new Set());
    const sb={x1:pt.x,y1:pt.y,x2:pt.x,y2:pt.y};
    setSelBox(sb); selBoxRef.current=sb;
  };

  // ── Node mousedown ──
  const onNodeMouseDown = (e, node) => {
    e.stopPropagation();
    if (e.button!==0) return;
    setCtxMenu(null);

    if (tool==='connect') {
      if (!connectFromRef.current) {
        setConnectFrom(node.id); connectFromRef.current=node.id;
        setSelected(new Set([node.id]));
      } else if (connectFromRef.current !== node.id) {
        // Complete connection
        const id=nextId.current++;
        const nc=[...connectionsRef.current,{id,from:connectFromRef.current,to:node.id,type:connTypeRef.current,color:connColorRef.current,strokeWidth:2}];
        setConnections(nc); connectionsRef.current=nc;
        pushHist(nodesRef.current,nc,drawPathsRef.current);
        setConnectFrom(null); connectFromRef.current=null;
        setConnPreviewPt(null);
      }
      return;
    }

    const newSel=e.shiftKey?new Set([...selectedRef.current,node.id]):(selectedRef.current.has(node.id)?selectedRef.current:new Set([node.id]));
    setSelected(newSel);
    const pt=toCanvas(e.clientX,e.clientY);
    const ids=[...newSel];
    const origPositions={};
    nodesRef.current.forEach(n=>{if(ids.includes(n.id))origPositions[n.id]={x:n.x,y:n.y};});
    const drag={nodeIds:ids,startPt:pt,origPositions};
    setDragging(drag); draggingRef.current=drag;
  };

  const onNodeMouseUp = (e, node) => {
    const pd = portDragRef.current;
    if (pd && pd.fromId && pd.fromId!==node.id) {
      e.stopPropagation();
      const id=nextId.current++;
      const nc=[...connectionsRef.current,{id,from:pd.fromId,to:node.id,type:connTypeRef.current,color:connColorRef.current,strokeWidth:2}];
      setConnections(nc); connectionsRef.current=nc;
      pushHist(nodesRef.current,nc,drawPathsRef.current);
      setPortDrag(null); portDragRef.current=null;
      setConnectFrom(null); connectFromRef.current=null;
      setConnPreviewPt(null);
    }
  };

  const onPortMouseDown = (e, node, side) => {
    e.stopPropagation(); e.preventDefault();
    const pt=toCanvas(e.clientX,e.clientY);
    const pd={fromId:node.id,side,preview:pt};
    setPortDrag(pd); portDragRef.current=pd;
    setConnectFrom(node.id); connectFromRef.current=node.id;
    setSelected(new Set([node.id]));
  };

  const onResizeMouseDown = (e, node) => {
    e.stopPropagation();
    const pt=toCanvas(e.clientX,e.clientY);
    const res={id:node.id,startPt:pt,origW:node.w,origH:node.h};
    setResizing(res); resizingRef.current=res;
  };

  const onNodeDblClick = (e, node) => { e.stopPropagation(); setEditingId(node.id); setSelected(new Set([node.id])); };
  const onNodeContextMenu = (e, node) => { e.preventDefault(); e.stopPropagation(); setSelected(new Set([node.id])); setCtxMenu({x:e.clientX,y:e.clientY,nodeId:node.id}); };

  const PORT_SIDES = ['top','right','bottom','left'];
  const selNode = nodes.find(n=>selected.size===1&&selected.has(n.id));
  const selConn = connections.find(c=>selected.size===1&&selected.has(c.id));

  const TOOLS=[
    {id:'select', label:'Select  V',  ico:'↖'},
    {id:'sticky', label:'Sticky  S',  ico:'🗒'},
    {id:'text',   label:'Text  T',    ico:'T'},
    {id:'shape',  label:'Shape  H',   ico:'⬜'},
    {id:'draw',   label:'Pen  D',     ico:'✏'},
    {id:'connect',label:'Connect  C', ico:'⤳'},
  ];

  return (
    <div style={{display:'flex',flexDirection:'column',height:'calc(100vh - 62px)',borderRadius:14,overflow:'hidden',border:`1px solid ${c.bord}`,userSelect:'none',position:'relative'}}>

      {/* ══ TOOLBAR ══ */}
      <div style={{display:'flex',alignItems:'center',gap:6,padding:'6px 10px',background:dark?'rgba(10,8,28,.98)':'rgba(255,255,255,.98)',borderBottom:`1px solid ${c.bord}`,flexShrink:0,zIndex:30,flexWrap:'wrap',backdropFilter:'blur(20px)'}}>

        <div style={{display:'flex',borderRadius:8,overflow:'hidden',border:`1px solid ${c.bord}`,flexShrink:0}}>
          {['personal','shared'].map(m=>(
            <button key={m} onClick={()=>setMode(m)} style={{padding:'5px 12px',fontSize:11,fontWeight:600,border:'none',cursor:'pointer',background:mode===m?'#6366F1':'transparent',color:mode===m?'#fff':c.mut,transition:'all .15s'}}>
              {m==='personal'?'🔒 Personal':'👥 Shared'}
            </button>
          ))}
        </div>

        <div style={{width:1,height:24,background:c.bord,flexShrink:0}}/>

        <div style={{display:'flex',gap:2,background:dark?'rgba(255,255,255,.04)':'rgba(99,102,241,.05)',borderRadius:10,padding:3,border:`1px solid ${c.bord}`}}>
          {TOOLS.map(t=>(
            <button key={t.id} onClick={()=>{setTool(t.id);toolRef.current=t.id;if(t.id!=='connect'){setConnectFrom(null);connectFromRef.current=null;setConnPreviewPt(null);}}} title={t.label}
              style={{width:34,height:32,borderRadius:7,border:'none',background:tool===t.id?(dark?'rgba(99,102,241,.28)':'rgba(99,102,241,.18)'):'transparent',color:tool===t.id?'#818CF8':c.mut,cursor:'pointer',fontSize:t.id==='text'?13:17,fontWeight:tool===t.id?700:400,transition:'all .12s',display:'flex',alignItems:'center',justifyContent:'center'}}>
              {t.ico}
            </button>
          ))}
        </div>

        {tool==='shape'&&(
          <div style={{display:'flex',gap:2,background:dark?'rgba(255,255,255,.04)':'rgba(99,102,241,.05)',borderRadius:10,padding:3,border:`1px solid ${c.bord}`}}>
            {[['rect','▭'],['circle','○'],['diamond','◇'],['pill','⬭']].map(([st,ic])=>(
              <button key={st} onClick={()=>setShapeType(st)} style={{width:32,height:32,borderRadius:7,border:'none',background:shapeType===st?'rgba(99,102,241,.22)':'transparent',color:shapeType===st?'#818CF8':c.mut,cursor:'pointer',fontSize:16}}>{ic}</button>
            ))}
          </div>
        )}

        {tool==='sticky'&&(
          <div style={{display:'flex',gap:3,alignItems:'center'}}>
            {BS_STICKY_COLORS.map(col=>(
              <button key={col} onClick={()=>setStickyColor(col)} style={{width:20,height:20,borderRadius:'50%',background:col,border:stickyColor===col?'2.5px solid #818CF8':`1.5px solid ${c.bord}`,cursor:'pointer',flexShrink:0}}/>
            ))}
          </div>
        )}

        {tool==='draw'&&(
          <div style={{display:'flex',gap:6,alignItems:'center'}}>
            <div style={{display:'flex',gap:3}}>
              {['#000000','#333333','#818CF8','#34D399','#F87171','#FBBF24','#60A5FA','#F472B6','#A78BFA'].map(col=>(
                <button key={col} onClick={()=>{setDrawColor(col);drawColorRef.current=col;}}
                  style={{width:22,height:22,borderRadius:'50%',background:col,border:drawColor===col?'3px solid #818CF8':`2px solid rgba(0,0,0,.2)`,cursor:'pointer',flexShrink:0,boxShadow:drawColor===col?'0 0 0 1px #fff inset':''}}/>
              ))}
            </div>
            <div style={{width:1,height:22,background:c.bord}}/>
            {[1,3,6,12].map(w=>(
              <button key={w} onClick={()=>{setDrawWidth(w);drawWidthRef.current=w;}}
                style={{width:32,height:32,borderRadius:7,background:drawWidth===w?'rgba(99,102,241,.2)':'transparent',border:`1px solid ${c.bord}`,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <div style={{width:Math.min(w*2,20),height:Math.min(w,10),borderRadius:w,background:drawColor,maxWidth:20}}/>
              </button>
            ))}
          </div>
        )}

        {tool==='connect'&&(
          <div style={{display:'flex',gap:6,alignItems:'center'}}>
            <div style={{display:'flex',gap:2,background:dark?'rgba(255,255,255,.04)':'rgba(99,102,241,.05)',borderRadius:10,padding:3,border:`1px solid ${c.bord}`}}>
              {[['curve','⌒ Curve'],['straight','→ Straight'],['elbow','⌐ Elbow']].map(([ct,lbl])=>(
                <button key={ct} onClick={()=>{setConnType(ct);connTypeRef.current=ct;}} style={{padding:'4px 10px',borderRadius:7,border:'none',background:connType===ct?'rgba(99,102,241,.22)':'transparent',color:connType===ct?'#818CF8':c.mut,cursor:'pointer',fontSize:11,fontWeight:connType===ct?700:400}}>{lbl}</button>
              ))}
            </div>
            <div style={{display:'flex',gap:3}}>
              {['#000000','#333333','#818CF8','#34D399','#F87171','#FBBF24','#60A5FA'].map(col=>(
                <button key={col} onClick={()=>{setConnColor(col);connColorRef.current=col;}}
                  style={{width:20,height:20,borderRadius:'50%',background:col,border:connColor===col?'2.5px solid #818CF8':`1.5px solid ${c.bord}`,cursor:'pointer'}}/>
              ))}
            </div>
          </div>
        )}

        {selNode&&tool==='select'&&(
          <div style={{display:'flex',gap:4,alignItems:'center',borderLeft:`1px solid ${c.bord}`,paddingLeft:8,flexWrap:'wrap'}}>
            {[10,12,14,16,20,24].map(fs=>(
              <button key={fs} onClick={()=>updateNodeSave(selNode.id,{fontSize:fs})}
                style={{padding:'1px 6px',borderRadius:5,border:`1px solid ${c.bord}`,background:selNode.fontSize===fs?'rgba(99,102,241,.2)':'transparent',color:c.text,cursor:'pointer',fontSize:11}}>{fs}</button>
            ))}
            <div style={{width:1,height:20,background:c.bord}}/>
            <button onClick={()=>updateNodeSave(selNode.id,{fontWeight:selNode.fontWeight>=700?400:700})}
              style={{width:28,height:28,borderRadius:6,border:`1px solid ${c.bord}`,background:selNode.fontWeight>=700?'rgba(99,102,241,.2)':'transparent',color:c.text,cursor:'pointer',fontWeight:700,fontSize:13}}>B</button>
            <button onClick={()=>updateNodeSave(selNode.id,{fontStyle:selNode.fontStyle==='italic'?'normal':'italic'})}
              style={{width:28,height:28,borderRadius:6,border:`1px solid ${c.bord}`,background:selNode.fontStyle==='italic'?'rgba(99,102,241,.2)':'transparent',color:c.text,cursor:'pointer',fontStyle:'italic',fontSize:13}}>I</button>
            {selNode.type==='sticky'&&BS_STICKY_COLORS.map(col=>(
              <button key={col} onClick={()=>updateNodeSave(selNode.id,{color:col})}
                style={{width:18,height:18,borderRadius:'50%',background:col,border:selNode.color===col?'2.5px solid #818CF8':`1px solid ${c.bord}`,cursor:'pointer',flexShrink:0}}/>
            ))}
            {selNode.type==='shape'&&BS_SHAPE_COLORS.map((sc,i)=>(
              <button key={i} onClick={()=>updateNodeSave(selNode.id,{fill:sc.fill,stroke:sc.stroke})}
                style={{width:18,height:18,borderRadius:4,background:sc.fill,border:`2px solid ${sc.stroke}`,cursor:'pointer',flexShrink:0}}/>
            ))}
            <div style={{width:1,height:20,background:c.bord}}/>
            <button onClick={()=>{
              const nn=nodesRef.current.filter(n=>!selectedRef.current.has(n.id));
              const nc=connectionsRef.current.filter(c2=>!selectedRef.current.has(c2.from)&&!selectedRef.current.has(c2.to));
              setNodes(nn);nodesRef.current=nn;setConnections(nc);connectionsRef.current=nc;setSelected(new Set());pushHist(nn,nc,drawPathsRef.current);
            }} style={{padding:'3px 10px',borderRadius:6,background:'rgba(239,68,68,.08)',border:'1px solid rgba(239,68,68,.22)',color:'#F87171',cursor:'pointer',fontSize:11}}>🗑 Delete</button>
          </div>
        )}

        {selConn&&tool==='select'&&(
          <div style={{display:'flex',gap:4,alignItems:'center',borderLeft:`1px solid ${c.bord}`,paddingLeft:8}}>
            {[['curve','⌒'],['straight','→'],['elbow','⌐']].map(([ct,ic])=>(
              <button key={ct} onClick={()=>{const nc=connectionsRef.current.map(cc=>cc.id===selConn.id?{...cc,type:ct}:cc);setConnections(nc);connectionsRef.current=nc;saveToStorage(nodesRef.current,nc,drawPathsRef.current);}}
                style={{width:28,height:28,borderRadius:6,border:`1px solid ${c.bord}`,background:selConn.type===ct?'rgba(99,102,241,.2)':'transparent',color:c.text,cursor:'pointer',fontSize:13}}>{ic}</button>
            ))}
            {['#000000','#818CF8','#34D399','#F87171','#FBBF24'].map(col=>(
              <button key={col} onClick={()=>{const nc=connectionsRef.current.map(cc=>cc.id===selConn.id?{...cc,color:col}:cc);setConnections(nc);connectionsRef.current=nc;saveToStorage(nodesRef.current,nc,drawPathsRef.current);}}
                style={{width:18,height:18,borderRadius:'50%',background:col,border:selConn.color===col?'2.5px solid #818CF8':`1px solid ${c.bord}`,cursor:'pointer'}}/>
            ))}
            <button onClick={()=>{const nc=connectionsRef.current.filter(c2=>c2.id!==selConn.id);setConnections(nc);connectionsRef.current=nc;setSelected(new Set());pushHist(nodesRef.current,nc,drawPathsRef.current);}}
              style={{padding:'3px 10px',borderRadius:6,background:'rgba(239,68,68,.08)',border:'1px solid rgba(239,68,68,.22)',color:'#F87171',cursor:'pointer',fontSize:11}}>🗑</button>
          </div>
        )}

        {connectFrom&&<span style={{fontSize:11,color:'#34D399',background:'rgba(52,211,153,.1)',padding:'4px 10px',borderRadius:8,border:'1px solid rgba(52,211,153,.2)',flexShrink:0}}>✓ Now click another node · Esc to cancel</span>}

        <div style={{flex:1}}/>
        <div style={{display:'flex',gap:3,alignItems:'center',flexShrink:0}}>
          <button onClick={undo} title="Undo Ctrl+Z" style={{width:28,height:28,borderRadius:7,border:`1px solid ${c.bord}`,background:'transparent',color:c.mut,cursor:'pointer',fontSize:14,display:'flex',alignItems:'center',justifyContent:'center'}}>↩</button>
          <button onClick={redo} title="Redo Ctrl+Y" style={{width:28,height:28,borderRadius:7,border:`1px solid ${c.bord}`,background:'transparent',color:c.mut,cursor:'pointer',fontSize:14,display:'flex',alignItems:'center',justifyContent:'center'}}>↪</button>
          <div style={{width:1,height:20,background:c.bord}}/>
          <button onClick={()=>{const nz=Math.max(0.1,zoomRef.current/1.2);setZoom(nz);zoomRef.current=nz;}} style={{width:26,height:26,borderRadius:6,border:`1px solid ${c.bord}`,background:'transparent',color:c.text,cursor:'pointer',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center'}}>−</button>
          <button onClick={()=>{setZoom(1);zoomRef.current=1;}} style={{fontSize:11,color:c.mut,width:46,textAlign:'center',background:'transparent',border:`1px solid ${c.bord}`,borderRadius:6,height:26,cursor:'pointer',fontWeight:600}}>{Math.round(zoom*100)}%</button>
          <button onClick={()=>{const nz=Math.min(4,zoomRef.current*1.2);setZoom(nz);zoomRef.current=nz;}} style={{width:26,height:26,borderRadius:6,border:`1px solid ${c.bord}`,background:'transparent',color:c.text,cursor:'pointer',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center'}}>+</button>
          <button onClick={fitView} style={{padding:'4px 8px',borderRadius:6,border:`1px solid ${c.bord}`,background:'transparent',color:c.mut,cursor:'pointer',fontSize:11}}>Fit</button>
          <button onClick={()=>{if(window.confirm('Clear entire board?')){setNodes([]);nodesRef.current=[];setConnections([]);connectionsRef.current=[];setDrawPaths([]);drawPathsRef.current=[];setSelected(new Set());pushHist([],[],[]);}}}
            style={{padding:'4px 8px',borderRadius:6,border:'1px solid rgba(239,68,68,.2)',background:'rgba(239,68,68,.05)',color:'#F87171',cursor:'pointer',fontSize:11}}>Clear</button>
        </div>
      </div>

      {/* ══ CANVAS ══ */}
      <div
        ref={canvasRef}
        onMouseDown={onCanvasMouseDown}
        style={{flex:1,position:'relative',overflow:'hidden',
          cursor:isPanning?'grabbing':tool==='draw'?'crosshair':['sticky','text','shape'].includes(tool)?'cell':tool==='connect'?'crosshair':'default',
          background:'#F5F4F0'}}
        onClick={()=>setCtxMenu(null)}
      >
        {/* Dot grid */}
        <svg style={{position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'none'}}>
          <defs>
            <pattern id="bsgrid" x={pan.x%(20*zoom)} y={pan.y%(20*zoom)} width={20*zoom} height={20*zoom} patternUnits="userSpaceOnUse">
              <circle cx={1} cy={1} r={0.9} fill="rgba(140,130,110,.4)"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="#F5F4F0"/>
          <rect width="100%" height="100%" fill="url(#bsgrid)"/>
        </svg>

        {/* Transform layer */}
        <div style={{position:'absolute',left:pan.x,top:pan.y,transform:`scale(${zoom})`,transformOrigin:'0 0',width:0,height:0}}>

          {/* SVG: connections + draw paths.
              CRITICAL: an SVG with width/height 0 clips its children regardless of
              CSS overflow:visible (the SVG VIEWPORT clips, not the CSS box).
              Give it a large viewBox offset to cover negative coords too. */}
          <svg width="40000" height="40000" viewBox="-20000 -20000 40000 40000"
            style={{position:'absolute',left:-20000,top:-20000,overflow:'visible',pointerEvents:'none'}}>
            <defs>
              <marker id="bsarr-black"   markerWidth="10" markerHeight="10" refX="9" refY="4" orient="auto"><path d="M0,0 L0,8 L10,4 z" fill="#000"/></marker>
              <marker id="bsarr-indigo"  markerWidth="10" markerHeight="10" refX="9" refY="4" orient="auto"><path d="M0,0 L0,8 L10,4 z" fill="#818CF8"/></marker>
              <marker id="bsarr-green"   markerWidth="10" markerHeight="10" refX="9" refY="4" orient="auto"><path d="M0,0 L0,8 L10,4 z" fill="#34D399"/></marker>
              <marker id="bsarr-red"     markerWidth="10" markerHeight="10" refX="9" refY="4" orient="auto"><path d="M0,0 L0,8 L10,4 z" fill="#F87171"/></marker>
              <marker id="bsarr-yellow"  markerWidth="10" markerHeight="10" refX="9" refY="4" orient="auto"><path d="M0,0 L0,8 L10,4 z" fill="#FBBF24"/></marker>
              <marker id="bsarr-blue"    markerWidth="10" markerHeight="10" refX="9" refY="4" orient="auto"><path d="M0,0 L0,8 L10,4 z" fill="#60A5FA"/></marker>
              <marker id="bsarr-preview" markerWidth="10" markerHeight="10" refX="9" refY="4" orient="auto"><path d="M0,0 L0,8 L10,4 z" fill="#34D399"/></marker>
            </defs>

            {/* Rendered connections */}
            {connections.map(conn=>{
              const f=getCenter(conn.from), t=getCenter(conn.to);
              if (!f||!t) return null;
              const isSel=selected.has(conn.id);
              const col=conn.color||'#000000';
              const markId=col==='#818CF8'?'bsarr-indigo':col==='#34D399'?'bsarr-green':col==='#F87171'?'bsarr-red':col==='#FBBF24'?'bsarr-yellow':col==='#60A5FA'?'bsarr-blue':'bsarr-black';
              return(
                <g key={conn.id} style={{pointerEvents:'all'}}>
                  <path d={connPath(f.x,f.y,t.x,t.y,conn.type||'curve')} fill="none" stroke="transparent" strokeWidth={14} style={{cursor:'pointer'}}
                    onClick={e=>{e.stopPropagation();setSelected(new Set([conn.id]));}}/>
                  <path d={connPath(f.x,f.y,t.x,t.y,conn.type||'curve')} fill="none"
                    stroke={isSel?'#A78BFA':col} strokeWidth={isSel?3:2}
                    markerEnd={`url(#${isSel?'bsarr-indigo':markId})`}/>
                </g>
              );
            })}

            {/* Connect preview line */}
            {(() => {
              const fromId = portDrag?.fromId || connectFrom;
              const preview = portDrag?.preview || connPreviewPt;
              if (!fromId || !preview) return null;
              const f = getCenter(fromId);
              if (!f) return null;
              return <path d={connPath(f.x,f.y,preview.x,preview.y,connType)} fill="none" stroke="#34D399" strokeWidth={2} strokeDasharray="7,4" markerEnd="url(#bsarr-preview)"/>;
            })()}

            {/* Saved draw paths */}
            {drawPaths.map(p=>(
              <path key={p.id} d={pathStr(p.pts)} fill="none"
                stroke={p.color||'#000000'} strokeWidth={p.width||3}
                strokeLinecap="round" strokeLinejoin="round"
                style={{pointerEvents:'all',cursor:'pointer',opacity:selected.has(p.id)?0.5:1}}
                onClick={e=>{e.stopPropagation();setSelected(new Set([p.id]));}}/>
            ))}

            {/* Live path while drawing */}
            {livePathPts&&livePathPts.length>1&&(
              <path d={pathStr(livePathPts)} fill="none"
                stroke={drawColor||'#000000'} strokeWidth={drawWidth||3}
                strokeLinecap="round" strokeLinejoin="round"
                style={{pointerEvents:'none'}}/>
            )}
          </svg>

          {/* Nodes */}
          {nodes.map(node=>{
            const isSel=selected.has(node.id);
            const isEdit=editingId===node.id;
            const textBase={width:'100%',height:'100%',background:'transparent',border:'none',outline:'none',resize:'none',fontFamily:'Inter,sans-serif',fontSize:node.fontSize||13,fontWeight:node.fontWeight||400,fontStyle:node.fontStyle||'normal',color:'rgba(0,0,0,.82)',lineHeight:1.55,textAlign:node.textAlign||'left',boxSizing:'border-box'};

            return(
              <div key={node.id}
                onMouseDown={e=>onNodeMouseDown(e,node)}
                onMouseUp={e=>onNodeMouseUp(e,node)}
                onDoubleClick={e=>onNodeDblClick(e,node)}
                onContextMenu={e=>onNodeContextMenu(e,node)}
                style={{position:'absolute',left:node.x,top:node.y,width:node.w,height:node.h,zIndex:isSel?20:1,
                  cursor:tool==='connect'?'pointer':isPanning?'grabbing':'grab'}}
              >
                {/* STICKY */}
                {node.type==='sticky'&&(
                  <div style={{width:'100%',height:'100%',background:node.color||'#FDE68A',borderRadius:3,display:'flex',flexDirection:'column',overflow:'hidden',
                    boxShadow:isSel?'0 0 0 2.5px #6366F1,0 10px 32px rgba(0,0,0,.22)':'2px 3px 10px rgba(0,0,0,.13),1px 1px 0 rgba(0,0,0,.06)'}}>
                    <div style={{height:26,background:'rgba(0,0,0,.09)',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 9px'}}>
                      <div style={{display:'flex',gap:4}}>{['0.5','0.3','0.2'].map((o,i)=><div key={i} style={{width:8,height:8,borderRadius:'50%',background:`rgba(0,0,0,${o})`}}/>)}</div>
                      {isSel&&<div style={{fontSize:9,color:'rgba(0,0,0,.35)',fontWeight:600}}>DBL-CLICK TO EDIT</div>}
                    </div>
                    <div style={{flex:1,padding:'8px 10px',overflow:'hidden'}}>
                      {isEdit?<textarea autoFocus value={node.text} onChange={e=>updateNode(node.id,{text:e.target.value})} onBlur={commitEdit} onMouseDown={e=>e.stopPropagation()} style={{...textBase}}/>
                        :<div style={{fontSize:node.fontSize||13,fontWeight:node.fontWeight||400,fontStyle:node.fontStyle||'normal',color:'rgba(0,0,0,.82)',lineHeight:1.55,whiteSpace:'pre-wrap',wordBreak:'break-word',userSelect:'none',textAlign:node.textAlign||'left',height:'100%',overflow:'hidden'}}>
                          {node.text||<span style={{opacity:.35}}>Double-click…</span>}
                        </div>}
                    </div>
                  </div>
                )}

                {/* TEXT */}
                {node.type==='text'&&(
                  <div style={{width:'100%',height:'100%',display:'flex',alignItems:'flex-start',padding:'4px 6px',overflow:'hidden',
                    border:isSel?'1.5px solid #6366F1':isEdit?'1.5px solid #6366F1':'1.5px dashed rgba(100,90,60,.25)',
                    borderRadius:5,background:isSel?'rgba(99,102,241,.04)':'transparent',boxShadow:isSel?'0 0 0 3px rgba(99,102,241,.15)':'none'}}>
                    {isEdit?<textarea autoFocus value={node.text} onChange={e=>updateNode(node.id,{text:e.target.value})} onBlur={commitEdit} onMouseDown={e=>e.stopPropagation()} style={{...textBase,color:'#1a1a1a'}}/>
                      :<div style={{fontSize:node.fontSize||16,fontWeight:node.fontWeight||400,fontStyle:node.fontStyle||'normal',color:node.text?'#1a1a1a':'rgba(100,90,60,.35)',whiteSpace:'pre-wrap',wordBreak:'break-word',userSelect:'none',textAlign:node.textAlign||'left',lineHeight:1.5,width:'100%'}}>
                        {node.text||'Type here…'}
                      </div>}
                  </div>
                )}

                {/* SHAPE */}
                {node.type==='shape'&&(
                  <div style={{width:'100%',height:'100%',position:'relative',boxShadow:isSel?'0 0 0 2.5px #6366F1,0 6px 20px rgba(0,0,0,.1)':'0 2px 8px rgba(0,0,0,.08)',borderRadius:node.shapeType==='rect'?10:0}}>
                    <svg style={{position:'absolute',inset:0,width:'100%',height:'100%',overflow:'visible'}}>{renderShapeSvg(node)}</svg>
                    <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',padding:8}}>
                      {isEdit?<textarea autoFocus value={node.text} onChange={e=>updateNode(node.id,{text:e.target.value})} onBlur={commitEdit} onMouseDown={e=>e.stopPropagation()} style={{background:'transparent',border:'none',outline:'none',resize:'none',textAlign:node.textAlign||'center',fontFamily:'Inter,sans-serif',fontSize:node.fontSize||13,fontWeight:node.fontWeight||700,color:'#1a1a1a',width:'90%',lineHeight:1.4,boxSizing:'border-box'}}/>
                        :<div style={{fontSize:node.fontSize||13,fontWeight:node.fontWeight||700,color:'#1a1a1a',textAlign:node.textAlign||'center',userSelect:'none',wordBreak:'break-word',lineHeight:1.4,width:'100%',padding:'0 6px'}}>{node.text}</div>}
                    </div>
                  </div>
                )}

                {/* Resize handle */}
                {isSel&&!isEdit&&(
                  <div onMouseDown={e=>onResizeMouseDown(e,node)}
                    style={{position:'absolute',right:-5,bottom:-5,width:12,height:12,borderRadius:3,background:'#6366F1',border:'2px solid #fff',cursor:'se-resize',zIndex:30,boxShadow:'0 1px 4px rgba(0,0,0,.2)'}}/>
                )}

                {/* Port dots — visible when selected, draggable to connect */}
                {isSel&&!isEdit&&PORT_SIDES.map(side=>{
                  const isActive=portDrag?.fromId===node.id&&portDrag?.side===side;
                  const pos={
                    top:    {left:'50%',top:-7,transform:'translateX(-50%)'},
                    bottom: {left:'50%',bottom:-7,transform:'translateX(-50%)'},
                    left:   {top:'50%',left:-7,transform:'translateY(-50%)'},
                    right:  {top:'50%',right:-7,transform:'translateY(-50%)'},
                  }[side];
                  return(
                    <div key={side} onMouseDown={e=>onPortMouseDown(e,node,side)}
                      style={{position:'absolute',width:12,height:12,borderRadius:'50%',
                        background:isActive?'#34D399':'#3B82F6',
                        border:'2.5px solid #fff',cursor:'crosshair',zIndex:40,
                        boxShadow:isActive?'0 0 8px rgba(52,211,153,.8)':'0 0 6px rgba(59,130,246,.6)',
                        ...pos}}
                      title="Drag to connect"/>
                  );
                })}
              </div>
            );
          })}

          {/* Selection box */}
          {selBox&&(()=>{
            const sx=Math.min(selBox.x1,selBox.x2),sy=Math.min(selBox.y1,selBox.y2);
            const sw=Math.abs(selBox.x2-selBox.x1),sh=Math.abs(selBox.y2-selBox.y1);
            return <div style={{position:'absolute',left:sx,top:sy,width:sw,height:sh,border:'1.5px solid #6366F1',background:'rgba(99,102,241,.06)',pointerEvents:'none',borderRadius:4}}/>;
          })()}
        </div>

        {/* Context menu */}
        {ctxMenu&&(
          <div style={{position:'fixed',left:ctxMenu.x,top:ctxMenu.y,zIndex:9999,background:'#fff',border:'1px solid rgba(0,0,0,.1)',borderRadius:10,padding:5,boxShadow:'0 8px 28px rgba(0,0,0,.15)',minWidth:175}} onMouseDown={e=>e.stopPropagation()}>
            {[
              {l:'✏️  Edit', a:()=>{setEditingId(ctxMenu.nodeId);setCtxMenu(null);}},
              {l:'📋  Copy  Ctrl+C', a:()=>{const n=nodesRef.current.find(x=>x.id===ctxMenu.nodeId);if(n)setClipboard({nodes:[n],connections:[]});setCtxMenu(null);}},
              {l:'📄  Duplicate', a:()=>{const n=nodesRef.current.find(x=>x.id===ctxMenu.nodeId);if(!n)return;const nn=[...nodesRef.current,{...n,id:nextId.current++,x:n.x+20,y:n.y+20}];setNodes(nn);nodesRef.current=nn;pushHist(nn,connectionsRef.current,drawPathsRef.current);setCtxMenu(null);}},
              {l:'⤳  Connect from here', a:()=>{setTool('connect');toolRef.current='connect';setConnectFrom(ctxMenu.nodeId);connectFromRef.current=ctxMenu.nodeId;setCtxMenu(null);}},
              {sep:true},
              {l:'🗑  Delete', danger:true, a:()=>{const nn=nodesRef.current.filter(n=>n.id!==ctxMenu.nodeId);const nc=connectionsRef.current.filter(c=>c.from!==ctxMenu.nodeId&&c.to!==ctxMenu.nodeId);setNodes(nn);nodesRef.current=nn;setConnections(nc);connectionsRef.current=nc;pushHist(nn,nc,drawPathsRef.current);setCtxMenu(null);}},
            ].map((item,i)=>item.sep
              ?<div key={i} style={{height:1,background:'rgba(0,0,0,.08)',margin:'3px 0'}}/>
              :<button key={i} onClick={item.a} style={{display:'block',width:'100%',padding:'8px 12px',borderRadius:7,border:'none',background:'transparent',color:item.danger?'#EF4444':'#1a1a1a',cursor:'pointer',fontSize:13,textAlign:'left',fontWeight:item.danger?600:400}}
                  onMouseEnter={e=>e.target.style.background=item.danger?'rgba(239,68,68,.08)':'rgba(0,0,0,.04)'}
                  onMouseLeave={e=>e.target.style.background='transparent'}>{item.l}</button>
            )}
          </div>
        )}

        {/* Mini-map */}
        <div style={{position:'absolute',bottom:12,right:12,width:130,height:88,background:'rgba(245,244,240,.92)',border:'1px solid rgba(0,0,0,.1)',borderRadius:8,overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,.1)'}}>
          <svg width="130" height="88">
            {nodes.map(n=><rect key={n.id} x={65+n.x*0.025} y={44+n.y*0.025} width={Math.max(5,n.w*0.025)} height={Math.max(4,n.h*0.025)} rx={1} fill={n.type==='sticky'?(n.color||'#FDE68A'):n.fill||'#818CF8'} opacity={0.85}/>)}
          </svg>
          <div style={{position:'absolute',bottom:3,left:6,fontSize:9,color:'rgba(0,0,0,.35)',fontWeight:600}}>OVERVIEW</div>
        </div>

        {/* Hints */}
        <div style={{position:'absolute',bottom:12,left:12,fontSize:10,color:'rgba(100,90,60,.45)',pointerEvents:'none',lineHeight:1.7}}>
          Scroll to pan · Ctrl+scroll to zoom · Alt+drag to pan<br/>
          Ctrl+C copy · Ctrl+V paste · Del to delete · V S T H D C = tools
        </div>
        <div style={{position:'absolute',top:10,right:10,fontSize:10,color:'rgba(100,90,60,.45)',background:'rgba(245,244,240,.8)',padding:'2px 8px',borderRadius:20,border:'1px solid rgba(0,0,0,.06)'}}>
          {mode==='personal'?'🔒 Personal':'👥 Shared'} · Auto-saved
        </div>
      </div>
    </div>
  );
}

// ─── MANAGER VIEW ─────────────────────────────────────────────────────────────

// ─── HOME COMMAND CENTER ──────────────────────────────────────────────────────
// Daily landing page. Focus, not clutter. Replaces the "everything exposed" dashboard.
function HomeCommand({ session, team, tasks, members, onGoto, onAddTask, onStartStandup }) {
  const c = useC();
  const { dark } = useTheme();
  const name = (session?.user?.user_metadata?.name || session?.user?.email?.split('@')[0] || 'there').split(' ')[0];

  const myEmail = session?.user?.email;
  const blocked = tasks.filter(t => t.status === 'blocked');
  const inProgress = tasks.filter(t => t.status === 'in_progress' || t.status === 'inprogress');
  const done = tasks.filter(t => t.status === 'done');
  const active = tasks.filter(t => t.status !== 'done');
  const completion = tasks.length ? Math.round(done.length / tasks.length * 100) : 0;

  // Today's focus — max 5, prioritized: blocked first, then high priority, then in progress
  const focus = [...tasks]
    .filter(t => t.status !== 'done')
    .sort((a, b) => {
      const score = t => (t.status === 'blocked' ? 3 : 0) + (t.priority === 'high' ? 2 : t.priority === 'medium' ? 1 : 0);
      return score(b) - score(a);
    })
    .slice(0, 5);

  const greeting = (() => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  })();

  const aiSummary = (() => {
    const parts = [];
    parts.push(`You have ${active.length} active task${active.length !== 1 ? 's' : ''}.`);
    if (blocked.length) parts.push(`${blocked.length} ${blocked.length === 1 ? 'is' : 'are'} blocked.`);
    if (inProgress.length) parts.push(`${inProgress.length} in progress.`);
    if (!active.length) parts.push(`You're all caught up. 🎉`);
    return parts.join(' ');
  })();

  const Stat = ({ label, value, accent, onClick }) => (
    <div onClick={onClick} style={{ flex: 1, padding: '16px 18px', borderRadius: 16, background: c.surf, border: `1px solid ${c.bord}`, cursor: onClick ? 'pointer' : 'default', transition: 'border-color .15s' }}
      onMouseEnter={e => onClick && (e.currentTarget.style.borderColor = c.bordH)}
      onMouseLeave={e => onClick && (e.currentTarget.style.borderColor = c.bord)}>
      <div style={{ fontSize: 28, fontWeight: 800, color: accent || c.text, letterSpacing: '-.02em', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, color: c.mut, marginTop: 6, fontWeight: 500 }}>{label}</div>
    </div>
  );

  const prioColor = p => p === 'high' ? '#F87171' : p === 'medium' ? '#FBBF24' : '#818CF8';

  return (
    <div style={{ maxWidth: 1040, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Greeting + AI summary */}
      <div>
        <h1 style={{ fontSize: 32, fontWeight: 800, color: c.text, letterSpacing: '-.03em', margin: 0 }}>{greeting}, {name}</h1>
        <p style={{ fontSize: 15, color: c.sub, margin: '8px 0 0', lineHeight: 1.5, maxWidth: 600 }}>{aiSummary}</p>
      </div>

      {/* Quick actions */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {[
          { l: 'New task', icon: '＋', primary: true, fn: () => onAddTask && onAddTask() },
          { l: 'Start standup', icon: '◉', fn: () => onStartStandup ? onStartStandup() : onGoto('tasks') },
          { l: 'New doc', icon: '≡', fn: () => onGoto('knowledge') },
          { l: 'Ask AI', icon: '✦', fn: () => onGoto('insights') },
        ].map(a => (
          <button key={a.l} onClick={a.fn}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'all .15s',
              border: a.primary ? 'none' : `1px solid ${c.bord}`,
              background: a.primary ? 'linear-gradient(135deg,#6366F1,#818CF8)' : c.surf,
              color: a.primary ? '#fff' : c.text }}>
            <span style={{ fontSize: 16 }}>{a.icon}</span>{a.l}
          </button>
        ))}
      </div>

      {/* Two-column: Focus + Team snapshot */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.6fr) minmax(0,1fr)', gap: 16 }}>

        {/* Today's focus */}
        <div style={{ borderRadius: 16, background: c.surf, border: `1px solid ${c.bord}`, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${c.bord}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: c.text }}>Today's focus</span>
            <button onClick={() => onGoto('tasks')} style={{ fontSize: 13, color: c.accent, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>View all →</button>
          </div>
          <div style={{ padding: 8 }}>
            {focus.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>🎯</div>
                <div style={{ fontSize: 14, color: c.sub, fontWeight: 600, marginBottom: 4 }}>Nothing urgent right now</div>
                <div style={{ fontSize: 13, color: c.mut, marginBottom: 16 }}>Add a task to start planning your day</div>
                <button onClick={() => onAddTask && onAddTask()} style={{ padding: '8px 18px', borderRadius: 10, background: 'linear-gradient(135deg,#6366F1,#818CF8)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>＋ New task</button>
              </div>
            ) : focus.map(t => (
              <div key={t.id} onClick={() => onGoto('tasks')}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 12px', borderRadius: 10, cursor: 'pointer', transition: 'background .12s' }}
                onMouseEnter={e => e.currentTarget.style.background = c.row}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: prioColor(t.priority), flexShrink: 0 }}/>
                <span style={{ flex: 1, fontSize: 14, color: c.text, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title || t.text || 'Untitled task'}</span>
                {t.status === 'blocked' && <span style={{ fontSize: 11, color: '#F87171', background: 'rgba(248,113,113,.12)', padding: '2px 8px', borderRadius: 6, fontWeight: 600, flexShrink: 0 }}>Blocked</span>}
                {(t.status === 'in_progress' || t.status === 'inprogress') && <span style={{ fontSize: 11, color: '#FBBF24', background: 'rgba(251,191,36,.12)', padding: '2px 8px', borderRadius: 6, fontWeight: 600, flexShrink: 0 }}>In progress</span>}
                <span style={{ fontSize: 12, color: c.mut, flexShrink: 0 }}>{(t.assignee_email || '').split('@')[0]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Team snapshot */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ borderRadius: 16, background: c.surf, border: `1px solid ${c.bord}`, padding: 20 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: c.text, marginBottom: 16 }}>Team snapshot</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: c.sub }}>Completion</span>
                  <span style={{ fontSize: 13, color: c.text, fontWeight: 700 }}>{completion}%</span>
                </div>
                <div style={{ height: 8, borderRadius: 4, background: c.row, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${completion}%`, background: 'linear-gradient(90deg,#6366F1,#818CF8)', borderRadius: 4, transition: 'width .4s' }}/>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <Stat label="Blocked" value={blocked.length} accent={blocked.length ? '#F87171' : c.text} onClick={() => onGoto('tasks')}/>
                <Stat label="Members" value={members.length} onClick={() => onGoto('team')}/>
              </div>
            </div>
          </div>

          {/* AI insights */}
          <div style={{ borderRadius: 16, background: dark ? 'rgba(99,102,241,.06)' : 'rgba(99,102,241,.04)', border: `1px solid rgba(99,102,241,.2)`, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 15 }}>✦</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: c.text }}>Needs attention</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {blocked.length > 0 && <div style={{ fontSize: 13, color: c.sub, lineHeight: 1.5 }}>🚧 {blocked.length} blocked task{blocked.length !== 1 ? 's' : ''} need unblocking</div>}
              {inProgress.length > 3 && <div style={{ fontSize: 13, color: c.sub, lineHeight: 1.5 }}>⚡ {inProgress.length} tasks in progress — consider focusing</div>}
              {completion >= 80 && <div style={{ fontSize: 13, color: c.sub, lineHeight: 1.5 }}>🎉 Strong progress — {completion}% complete</div>}
              {blocked.length === 0 && inProgress.length <= 3 && completion < 80 && <div style={{ fontSize: 13, color: c.sub, lineHeight: 1.5 }}>✓ Everything looks healthy. Keep going.</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ManagerView({
 session, team, tasks, members, history, standup, onStatus, onPriority, onNote, onAddTask, onBack, onSettings, onLogout, emailBusy, onDigest, onEOD, messages, onSendMessage, chatTheme, onChangeTheme, setMembers, openPip, pipOpen }) {

  const c = useC();
  const { dark } = useTheme();

  // ── New IA: 6 primary areas + Calendar + Settings ──
  // area = top-level nav; sub = sub-tab within Knowledge / Insights
  const [area, setArea] = useState('home');
  const [knowledgeSub, setKnowledgeSub] = useState('docs');   // docs | brainstorm
  const [insightsSub, setInsightsSub]   = useState('overview'); // overview | performance | history
  const [mobileNav, setMobileNav] = useState(false);

  const [unreadChat, setUnreadChat] = useState(0);
  const prevMsgCount = useRef(messages.length);
  useEffect(() => {
    if (messages.length > prevMsgCount.current && area !== 'communication') {
      const myEmail = session?.user?.email;
      const externalNew = messages.slice(prevMsgCount.current).filter(m => m.sender_email !== myEmail);
      if (externalNew.length) setUnreadChat(n => n + externalNew.length);
    }
    prevMsgCount.current = messages.length;
  }, [messages, area]);

  const goArea = (a) => { setArea(a); setMobileNav(false); if (a === 'communication') setUnreadChat(0); };

  const blocked = tasks.filter(t => t.status === 'blocked').length;
  const myTasks = tasks.filter(t => t.assignee_email === session?.user?.email);

  // ── Nav model ──
  const NAV = [
    { id: 'home',          label: 'Home',          icon: '⌂' },
    { id: 'tasks',         label: 'Tasks',         icon: '◎' },
    { id: 'team',          label: 'Team',          icon: '⚇' },
    { id: 'communication', label: 'Communication', icon: '◌', badge: unreadChat },
    { id: 'knowledge',     label: 'Knowledge',     icon: '◈' },
    { id: 'insights',      label: 'Insights',      icon: '▤' },
    { id: 'calendar',      label: 'Calendar',      icon: '⊟' },
  ];

  const areaTitle = {
    home: 'Home', tasks: 'Tasks', team: 'Team', communication: 'Communication',
    knowledge: 'Knowledge', insights: 'Insights', calendar: 'Calendar', settings: 'Settings',
  };

  // ── Sidebar ──
  const SidebarNav = ({ inDrawer }) => (
    <div style={{ width: 260, flexShrink: 0, height: '100vh', position: inDrawer ? 'relative' : 'sticky', top: 0,
      background: dark ? '#0D1322' : '#FFFFFF', borderRight: `1px solid ${c.bord}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Logo + team */}
      <div style={{ padding: '18px 20px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Logo size={26} onClick={onBack}/>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: c.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{team?.name || 'StandSync'}</div>
          <div style={{ fontSize: 11, color: c.mut }}>Manager workspace</div>
        </div>
      </div>

      {/* Primary nav */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 12px' }}>
        {NAV.map(n => {
          const on = area === n.id;
          return (
            <button key={n.id} onClick={() => goArea(n.id)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '9px 12px', borderRadius: 10, border: 'none', cursor: 'pointer',
                background: on ? (dark ? 'rgba(129,140,248,.14)' : 'rgba(99,102,241,.1)') : 'transparent',
                color: on ? c.accent : c.sub, fontSize: 14, fontWeight: on ? 600 : 500, marginBottom: 2, textAlign: 'left', transition: 'all .12s', position: 'relative' }}
              onMouseEnter={e => { if (!on) e.currentTarget.style.background = c.row; }}
              onMouseLeave={e => { if (!on) e.currentTarget.style.background = 'transparent'; }}>
              <span style={{ fontSize: 18, width: 20, textAlign: 'center', flexShrink: 0 }}>{n.icon}</span>
              <span style={{ flex: 1 }}>{n.label}</span>
              {n.badge > 0 && <span style={{ minWidth: 18, height: 18, borderRadius: 9, background: '#EF4444', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px' }}>{n.badge > 9 ? '9+' : n.badge}</span>}
              {n.id === 'tasks' && blocked > 0 && <span style={{ minWidth: 18, height: 18, borderRadius: 9, background: 'rgba(248,113,113,.18)', color: '#F87171', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px' }}>{blocked}</span>}
            </button>
          );
        })}
      </div>

      {/* Bottom: Settings + PiP */}
      <div style={{ padding: '10px 12px', borderTop: `1px solid ${c.bord}` }}>
        <button onClick={() => openPip && openPip()}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '9px 12px', borderRadius: 10, border: 'none', cursor: 'pointer', background: pipOpen ? 'rgba(129,140,248,.14)' : 'transparent', color: pipOpen ? c.accent : c.sub, fontSize: 14, fontWeight: 500, marginBottom: 2, textAlign: 'left' }}>
          <span style={{ fontSize: 18, width: 20, textAlign: 'center' }}>⧉</span>
          <span style={{ flex: 1 }}>Picture-in-picture</span>
          {pipOpen && <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#34D399' }}/>}
        </button>
        <button onClick={() => goArea('settings')}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '9px 12px', borderRadius: 10, border: 'none', cursor: 'pointer', background: area === 'settings' ? (dark ? 'rgba(129,140,248,.14)' : 'rgba(99,102,241,.1)') : 'transparent', color: area === 'settings' ? c.accent : c.sub, fontSize: 14, fontWeight: 500, textAlign: 'left' }}>
          <span style={{ fontSize: 18, width: 20, textAlign: 'center' }}>⚙</span>
          <span style={{ flex: 1 }}>Settings</span>
        </button>
      </div>
    </div>
  );

  // ── Sub-tab pill bar ──
  const SubTabs = ({ tabs, value, onChange }) => (
    <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: `1px solid ${c.bord}`, paddingBottom: 0 }}>
      {tabs.map(t => {
        const on = value === t.id;
        return (
          <button key={t.id} onClick={() => onChange(t.id)}
            style={{ padding: '8px 14px', border: 'none', borderBottom: `2px solid ${on ? c.accent : 'transparent'}`, background: 'transparent', color: on ? c.text : c.mut, fontSize: 13, fontWeight: on ? 700 : 500, cursor: 'pointer', marginBottom: -1, transition: 'all .12s' }}>
            {t.label}
          </button>
        );
      })}
    </div>
  );

  return (
    <div style={{ position: 'relative', zIndex: 1, display: 'flex', minHeight: '100vh' }}>

      {/* Desktop sidebar */}
      <div className="ss-sidebar-desktop"><SidebarNav/></div>

      {/* Mobile drawer */}
      {mobileNav && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex' }} onClick={() => setMobileNav(false)}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.5)' }}/>
          <div style={{ position: 'relative', zIndex: 1 }} onClick={e => e.stopPropagation()}><SidebarNav inDrawer/></div>
        </div>
      )}

      {/* Main column */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>

        {/* Top header — max 4 controls */}
        <div style={{ height: 60, borderBottom: `1px solid ${c.bord}`, background: c.nav, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', position: 'sticky', top: 0, zIndex: 100, display: 'flex', alignItems: 'center', gap: 12, padding: '0 24px' }}>
          <button className="ss-burger" onClick={() => setMobileNav(true)} style={{ display: 'none', width: 38, height: 38, borderRadius: 10, border: `1px solid ${c.bord}`, background: 'transparent', color: c.text, cursor: 'pointer', fontSize: 18, alignItems: 'center', justifyContent: 'center' }}>☰</button>

          <h2 style={{ fontSize: 18, fontWeight: 700, color: c.text, margin: 0, flexShrink: 0 }}>{areaTitle[area]}</h2>

          {/* Search */}
          <div style={{ flex: 1, maxWidth: 420, display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 10, background: c.inp, border: `1px solid ${c.bord}`, marginLeft: 8 }}>
            <span style={{ fontSize: 14, color: c.mut }}>⌕</span>
            <input placeholder="Search tasks, docs, people…" style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: c.text, fontSize: 13, minWidth: 0 }}/>
          </div>

          <div style={{ flex: 1 }}/>

          {/* 4 controls: Create, Notifications, Theme, Profile */}
          <button onClick={() => onAddTask && onAddTask()} title="Create"
            style={{ display: 'flex', alignItems: 'center', gap: 6, height: 38, padding: '0 16px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#6366F1,#818CF8)', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
            <span style={{ fontSize: 16 }}>＋</span><span className="ss-create-label">Create</span>
          </button>
          <button onClick={onDigest} title="Send digest" disabled={emailBusy}
            style={{ width: 38, height: 38, borderRadius: 10, border: `1px solid ${c.bord}`, background: 'transparent', color: blocked > 0 ? '#F87171' : c.sub, cursor: 'pointer', fontSize: 16, flexShrink: 0, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            ◔{blocked > 0 && <span style={{ position: 'absolute', top: 6, right: 6, width: 7, height: 7, borderRadius: '50%', background: '#F87171' }}/>}
          </button>
          <ThemeToggle/>
          <ProfileMenu session={session} onSettings={onSettings} onLogout={onLogout}/>
        </div>

        {/* Live status strip (only on Home/Tasks) */}
        {(area === 'home' || area === 'tasks') && (
          <div style={{ padding: '10px 32px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
            <LiveDot/><span style={{ fontSize: 11, color: '#34D399', textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 700 }}>Live · {team?.standup_name || team?.name || 'Standup'}</span>
          </div>
        )}

        {/* Content */}
        <div style={{ flex: 1, padding: '24px 32px 48px', maxWidth: 1280, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>

          {area === 'home' && (
            <HomeCommand session={session} team={team} tasks={tasks} members={members}
              onGoto={goArea} onAddTask={onAddTask} onStartStandup={() => goArea('tasks')}/>
          )}

          {area === 'tasks' && (
            <LiveTab tasks={tasks} members={members} onStatus={onStatus} onPriority={onPriority} onNote={onNote} onAddTask={onAddTask} session={session}/>
          )}

          {area === 'team' && <TeamTab tasks={tasks} members={members}/>}

          {area === 'communication' && (
            <RichChatPanel messages={messages} onSend={onSendMessage} session={session} members={members} chatTheme={chatTheme} onChangeTheme={onChangeTheme} isManager={true}/>
          )}

          {area === 'knowledge' && (
            <>
              <SubTabs value={knowledgeSub} onChange={setKnowledgeSub}
                tabs={[{ id: 'docs', label: 'Docs & SOPs' }, { id: 'brainstorm', label: 'Brainstorm' }, { id: 'meetings', label: 'Meeting notes' }]}/>
              {knowledgeSub === 'docs' && <ProjectWiki team={team} session={session} members={members}/>}
              {knowledgeSub === 'brainstorm' && <BrainstormSpace team={team} session={session} members={members}/>}
              {knowledgeSub === 'meetings' && <ManagerNotesTab session={session} team={team}/>}
            </>
          )}

          {area === 'insights' && (
            <>
              <SubTabs value={insightsSub} onChange={setInsightsSub}
                tabs={[{ id: 'overview', label: 'Overview' }, { id: 'performance', label: 'Performance' }, { id: 'ai', label: 'Ask AI' }, { id: 'history', label: 'History' }]}/>
              {insightsSub === 'overview' && <TeamAnalysisTab tasks={tasks} members={members}/>}
              {insightsSub === 'performance' && <PerfTab tasks={tasks} history={history} members={members}/>}
              {insightsSub === 'ai' && <AIAssistant tasks={tasks} members={members} history={history} session={session} myTasks={myTasks} teamName={team?.name || 'Team'}/>}
              {insightsSub === 'history' && <HistTab history={history} members={members}/>}
            </>
          )}

          {area === 'calendar' && <CalendarPanel team={team} members={members} session={session}/>}

          {area === 'settings' && (
            <>
              <SubTabs value={insightsSub === 'reminders' ? 'reminders' : 'team'} onChange={(v) => setInsightsSub(v)}
                tabs={[{ id: 'team', label: 'Team settings' }, { id: 'reminders', label: 'Reminders' }]}/>
              {insightsSub !== 'reminders' && <TeamSettingsTab team={team} members={members} session={session} onMembersUpdate={() => { if (setMembers && SB.IS_LIVE) SB.getTeamMembers(team.id).then(m => setMembers(m || [])); }}/>}
              {insightsSub === 'reminders' && <RemindersPanel team={team} members={members} session={session}/>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}


// ─── PIP TASK WINDOW ─────────────────────────────────────────────────────────
// Floats over Google Meet / any video call so you can write tasks without switching windows
// ─── PIP MODE ────────────────────────────────────────────────────────────────
function usePip({ tasks, onAdd, onStatus, session, team, standup }) {
  const [isOpen, setIsOpen] = useState(false);
  const winRef = useRef(null);
  const myEmail = session?.user?.email || '';
  const myName = session?.user?.user_metadata?.name || myEmail.split('@')[0];

  // Sync tasks to pip window whenever they change
  useEffect(()=>{
    if (winRef.current && !winRef.current.closed) {
      winRef.current.postMessage({ type:'tasks', tasks, myEmail }, '*');
    }
  }, [tasks, myEmail]);

  const openPip = () => {
    if (winRef.current && !winRef.current.closed) { winRef.current.focus(); return; }
    // Open as a proper popup window — stays visible when switching tabs or minimizing
    // NOTE: Browser must allow popups for standsync-olive.vercel.app
    const w=360, h=580;
    const left = Math.max(0, (window.screen.availWidth||1200) - w - 20);
    const top  = Math.max(0, (window.screen.availHeight||800) - h - 60);
    const features = 'width='+w+',height='+h+',left='+left+',top='+top+',resizable=yes,scrollbars=no,toolbar=no,menubar=no,location=no,status=no,popup=1';
    const win = window.open('/pip.html', 'standsync_pip', features);
    if (!win) {
      alert('Popups are blocked.\n\nIn your browser address bar, click the popup blocked icon and choose "Always allow popups from standsync-olive.vercel.app". Then click PiP again.');
      return;
    }
    // If browser opened it as a tab instead of popup, warn user
    setTimeout(()=>{
      try {
        if(win.outerWidth >= window.outerWidth - 50) {
          // Opened as tab - show instructions
          console.warn('PiP opened as tab. User needs to allow popups.');
        }
      } catch(e){}
    }, 500);

    // Send init data once window loads
    win.addEventListener('load', function() {
      win.postMessage({ type:'init', tasks, myEmail, myName, teamName: team ? team.name : 'Team' }, '*');
    });

    // Listen for messages from pip window
    const handler = (e) => {
      if (!e.data) return;
      if (e.data.type === 'status') onStatus(e.data.id, e.data.status);
      if (e.data.type === 'addTask') {
        const t = e.data.task || {};
        onAdd({
          title: t.title || e.data.title || '',
          status: 'todo',
          priority: t.priority || 'medium',
          due_label: t.due_label || '',
          assignee_email: t.assignee_email || myEmail,
          assignee_name: t.assignee_name || myName,
          standup_id: standup ? standup.id : null,
          team_id: team ? team.id : null,
        });
      }
    };
    window.addEventListener('message', handler);
    win.onbeforeunload = () => {
      window.removeEventListener('message', handler);
      setIsOpen(false);
      winRef.current = null;
    };
    winRef.current = win;
    setIsOpen(true);
  };

  return { openPip, isOpen };
}

function PipWindow() { return null; }


// ─── ROOT APP ─────────────────────────────────────────────────────────────────
var DEMO_MEMBERS=[
  {id:'dm1',user_id:'u1',email:'tanisk.pandey@xtransmatrix.com',name:'Tanisk Pandey',role:'manager',color:'#818CF8'},
  {id:'dm2',user_id:'u2',email:'deepak.nr@xtransmatrix.com',name:'Deepak NR',role:'member',color:'#38BDF8'},
  {id:'dm3',user_id:'u3',email:'madhan.m@xtransmatrix.com',name:'Madhan M',role:'member',color:'#34D399'},
  {id:'dm4',user_id:'u4',email:'monica@xtransmatrix.com',name:'Monica M',role:'member',color:'#F472B6'},
  {id:'dm5',user_id:'u5',email:'sandhya.a@xtransmatrix.com',name:'Sandhya A',role:'member',color:'#FB923C'},
  {id:'dm6',user_id:'u6',email:'zeeba.kauser@xtransmatrix.com',name:'Zeeba Kauser',role:'member',color:'#E879F9'},
];

class ErrorBoundary extends React.Component {
  constructor(p){ super(p); this.state={crashed:false,err:''}; }
  static getDerivedStateFromError(e){ return {crashed:true,err:e?.message||'Unknown error'}; }
  componentDidCatch(e,info){ console.error('StandSync crash:',e,info); }
  render(){
    if(this.state.crashed){
      return(
        <div style={{ minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:'#06040F',color:'#F0ECFF',padding:32,textAlign:'center' }}>
          <div style={{ fontSize:48,marginBottom:16 }}>⚡</div>
          <h2 style={{ fontSize:20,fontWeight:700,marginBottom:8 }}>StandSync ran into an issue</h2>
          <p style={{ fontSize:13,color:'rgba(240,236,255,.5)',marginBottom:24,maxWidth:360 }}>{this.state.err}</p>
          <button onClick={()=>{ localStorage.clear(); window.location.href='/'; }} style={{ padding:'10px 24px',borderRadius:10,background:'linear-gradient(135deg,#6B5FE4,#9B8AFB)',color:'#fff',border:'none',cursor:'pointer',fontSize:14,fontWeight:600 }}>Clear cache &amp; reload</button>
          <button onClick={()=>window.location.reload()} style={{ marginTop:10,padding:'8px 20px',borderRadius:10,background:'transparent',color:'rgba(240,236,255,.5)',border:'1px solid rgba(255,255,255,.1)',cursor:'pointer',fontSize:13 }}>Just reload</button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  // Init supabase from CDN on first render (avoids TDZ bundling crash)
  const [dark,setDark]=useState(()=>(localStorage.getItem('ss-theme')||'dark')==='dark');
  const toggle=useCallback(()=>setDark(d=>{const n=!d;localStorage.setItem('ss-theme',n?'dark':'light');document.body.style.background=n?'#060412':'#F1F5F9';return n;}),[]);

  // SESSION: Supabase stores it in localStorage with key 'ss-auth'
  // We read it synchronously so there is zero flicker on load or tab switch
  const [session,setSession]=useState(()=>{
    try {
      // Read directly from Supabase's localStorage key — instant, synchronous
      const raw = localStorage.getItem('ss-auth');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed?.currentSession || parsed?.session || null;
    } catch(e){ return null; }
  });
  const [authLoading,setAuthLoading]=useState(false);
  const [view,setView]=useState(()=>{
    try {
      // If URL has OAuth error, always show auth page
      const urlParams=new URLSearchParams(window.location.search);
      if(urlParams.get('error')||urlParams.get('error_code')) return 'auth';
      const raw = localStorage.getItem('ss-auth');
      if (!raw) return 'auth';
      const parsed = JSON.parse(raw);
      const hasSession = !!(parsed?.currentSession || parsed?.session);
      if (!hasSession) return 'auth';
      const savedView = localStorage.getItem('ss-view');
      const team = localStorage.getItem('ss-team');
      if (savedView === 'standup' && team) return 'standup';
      return 'home';
    } catch(e){ return 'auth'; }
  });
  // Persist team + role so page reloads (OAuth redirects) don't lose state
  const [team,setTeam]=useState(()=>{
    try{ const t=localStorage.getItem('ss-team'); return t?JSON.parse(t):null; }catch(e){return null;}
  });
  const [myRole,setMyRole]=useState(()=>{
    try{ return localStorage.getItem('ss-role')||'member'; }catch(e){return 'member';}
  });
  const [members,setMembers]=useState(SB.IS_LIVE?[]:DEMO_MEMBERS);
  const [homeKey,setHomeKey]=useState(0); const [tasks,setTasks]=useState([]); const [standup,setStandup]=useState(null);
  const [history,setHistory]=useState([]); const [messages,setMessages]=useState([]); const [chatTheme,setChatTheme]=useState('default');
  const [toast,setToast]=useState(null); const [emailBusy,setEmailBusy]=useState(false); const [inviteToken,setInviteToken]=useState(null);
  const [showPip,setShowPip]=useState(false); // legacy, not used
  const isManager=myRole==='manager'||!SB.IS_LIVE;
  const showToast=useCallback((msg,type='success')=>setToast({msg,type}),[]);

  // Session persistence handled by Supabase client (localStorage key: ss-auth)
  // Persist team, role, view so OAuth redirects don't lose state
  useEffect(()=>{
    if(team){ try{ localStorage.setItem('ss-team',JSON.stringify(team)); }catch(e){} }
    else { try{ localStorage.removeItem('ss-team'); }catch(e){} }
  },[team]);
  useEffect(()=>{
    try{ localStorage.setItem('ss-role',myRole); }catch(e){}
  },[myRole]);
  useEffect(()=>{
    try{ localStorage.setItem('ss-view',view); }catch(e){}
  },[view]);

  useEffect(()=>{
    const p=new URLSearchParams(window.location.search);
    // Handle OAuth error redirect (e.g. bad_oauth_state, expired)
    const oauthError=p.get('error') || p.get('error_code');
    if(oauthError){
      console.warn('OAuth redirect error:', oauthError, p.get('error_description'));
      // Clear the error params from URL so page renders normally
      window.history.replaceState({},'',window.location.pathname);
      // Stay on auth page — don't crash
      setView('auth');
    }
    const inv=p.get('invite');
    if(inv) setInviteToken(inv);
    // Also clear any OAuth code/token params that shouldn't stay in URL
    if(p.get('code')||p.get('access_token')){
      window.history.replaceState({},'',window.location.pathname);
    }
  },[]);

  useEffect(()=>{
    if(!SB.IS_LIVE){ setView('home'); return; }

    // Get session — handles Google OAuth redirect return (code in URL)
    SB.getSession().then(s=>{
      if(s){ setSession(s); setView(v=>v==='auth'?'home':v); }
    });

    if(SB.supabase){
      const {data:{subscription}} = SB.supabase.auth.onAuthStateChange((event, s)=>{
        try {
          if(event==='SIGNED_OUT'){
            setSession(null); setTeam(null); setMyRole('member'); setView('auth');
            try{ localStorage.removeItem('ss-team'); localStorage.removeItem('ss-role'); localStorage.removeItem('ss-view'); }catch(e){}
          } else if(s?.session){
            setSession(s.session);
            if(event==='SIGNED_IN' || event==='INITIAL_SESSION'){
              setView(v=>v==='auth'?'home':v);
            }
          }
        } catch(err) {
          console.error('Auth state change error:', err);
        }
      });
      return ()=>subscription.unsubscribe();
    }
  },[]);

  useEffect(()=>{
    if(!team||!SB.IS_LIVE)return;
    const load=async()=>{
      try {
        const sd=await SB.getOrCreateStandup(team.id,TODAY());
        setStandup(sd);
        const [t,past,mems,msgs]=await Promise.all([
          SB.getTasks(sd?.id),
          SB.getPastStandups(team.id,30),
          SB.getTeamMembers(team.id),
          SB.getChatMessages(team.id,100),
        ]);
        setTasks(t||[]);
        setHistory((past||[]).filter(p=>p.date!==TODAY()));
        setMessages(msgs||[]);
        if(mems&&mems.length>0){
          setMembers(mems);
          // Verify and correct role from DB (fixes manager showing as member)
          const myMem=mems.find(m=>m.user_id===session?.user?.id);
          if(myMem&&myMem.role!==myRole){
            setMyRole(myMem.role);
            try{ localStorage.setItem('ss-role',myMem.role); }catch(e){}
          }
        } else {
          // No members yet — create self as manager in DB then reload
          if(session?.user?.id){
            await SB.ensureManagerMember(team.id,session.user.id,session.user.email,
              session.user.user_metadata?.name||session.user.email.split('@')[0]);
            const mems2=await SB.getTeamMembers(team.id);
            if(mems2&&mems2.length>0) setMembers(mems2);
            else setMembers([{id:'me',user_id:session.user.id,email:session.user.email,name:session.user.user_metadata?.name||'You',role:'manager',designation:'Team Manager',color:'#818CF8',status:'active'}]);
          }
        }
      } catch(err) {
        console.error('Team load error:',err.message);
      }
    };
    load();
  },[team]);

  useEffect(()=>{ if(!standup||!SB.IS_LIVE)return; return SB.subscribeToTasks(standup.id,({eventType:et,new:n,old:o})=>{setTasks(p=>et==='INSERT'?[...p,n]:et==='UPDATE'?p.map(t=>t.id===n.id?n:t):p.filter(t=>t.id!==o.id));}); },[standup]);
  // Real-time chat subscription
  useEffect(()=>{ if(!team||!SB.IS_LIVE)return; return SB.subscribeToMessages(team.id,(msg)=>{setMessages(p=>{if(p.find(m=>m.id===msg.id))return p;return [...p,msg];});}); },[team]);

  const handleAddTask=useCallback(async(d)=>{ if(!d?.title?.trim()) return; if(!SB.IS_LIVE){setTasks(p=>[...p,{id:'demo_'+Date.now(),...d,created_at:new Date().toISOString()}]);return;} const{data}=await SB.addTask({...d,standup_id:standup?.id}); if(data) setTasks(p=>[...p,data]); },[standup]);
  const handleStatus=useCallback(async(id,status)=>{ const u={status,...(status==='done'?{completed_at:new Date().toISOString()}:{})}; if(!SB.IS_LIVE){setTasks(p=>p.map(t=>t.id===id?{...t,...u}:t));return;} await SB.updateTask(id,u); },[]);
  const handlePriority=useCallback(async(id,priority)=>{ if(!SB.IS_LIVE){setTasks(p=>p.map(t=>t.id===id?{...t,priority}:t));return;} await SB.updateTask(id,{priority}); },[]);
  const handleNote=useCallback(async(id,manager_note)=>{ if(!SB.IS_LIVE){setTasks(p=>p.map(t=>t.id===id?{...t,manager_note}:t));return;} await SB.updateTask(id,{manager_note}); },[]);
  const handleBlocker=useCallback(async(id,blocker)=>{ const u={status:'blocked',blocker}; if(!SB.IS_LIVE){setTasks(p=>p.map(t=>t.id===id?{...t,...u}:t));showToast('⚠️ Blocker reported');return;} await SB.updateTask(id,u); const task=tasks.find(t=>t.id===id),manager=members.find(m=>m.role==='manager'); if(task&&manager)await Email.sendBlockerAlert(manager.email,{email:session.user.email,name:session.user.user_metadata?.name},{...task,blocker}); showToast('⚠️ Blocker reported — manager notified'); },[tasks,members,session,showToast]);
  const handleDigest=useCallback(async()=>{
    setEmailBusy(true);
    if(!process.env.REACT_APP_RESEND_KEY){ showToast('⚠️ Add REACT_APP_RESEND_KEY to Vercel to send emails','error'); setEmailBusy(false); return; }
    let sent=0;
    const nonManagers=members.filter(x=>x.role!=='manager');
    if(nonManagers.length===0){ showToast('No team members to send digest to — invite members first','error'); setEmailBusy(false); return; }
    for(const m of nonManagers){
      const mt=tasks.filter(t=>t.assignee_email===m.email);
      // Send digest even if no tasks — member should know standup started
      await Email.sendMorningDigest(m,mt,team?.name||'Team');
      sent++;
    }
    setEmailBusy(false);
    showToast('📧 Digest sent to '+sent+' member'+(sent!==1?'s':''));
  },[tasks,members,team,showToast]);
  const handleEOD=useCallback(async()=>{ setEmailBusy(true); try{ for(const m of members.filter(x=>x.role!=='manager')){const p=tasks.filter(t=>t.assignee_email===m.email&&t.status!=='done');if(p.length>0)await Email.sendEODBacklog(m,p,team?.name||'Team');} const mg=members.find(m=>m.role==='manager'); if(mg)await Email.sendManagerSummary(mg.email,tasks,members,team?.name||'Team'); showToast('🕕 EOD summary sent'); }catch(e){showToast('Failed to send EOD','error');} setEmailBusy(false); },[tasks,members,team,showToast]);
  const handleLogin=useCallback(async(sess)=>{ setSession(sess); if(inviteToken&&SB.IS_LIVE){const r=await SB.acceptInvite(inviteToken,sess.user.id,sess.user.email,sess.user.user_metadata?.name||sess.user.email);if(r.teamId)showToast(`✅ Joined: ${r.teamName}`);window.history.replaceState({},'',window.location.pathname);setInviteToken(null);} setView('home'); },[inviteToken,showToast]);
  const handleSelectTeam=useCallback((t,role)=>{
    // Normalize: if t comes from getMyTeams it might be tm.teams
    // Ensure it always has .id at top level
    const normalized = t && t.id ? t : (t && t.teams ? t.teams : t);
    setTeam(normalized);
    setMyRole(role||'member');
    setView('standup');
    if(!SB.IS_LIVE){ setMembers(DEMO_MEMBERS); setTasks([]); }
  },[]);
  const handleLogout=useCallback(()=>{
    SB.signOut();
    setSession(null); setTeam(null); setMyRole('member'); setView('auth');
    setTasks([]); setMembers([]); setMessages([]); setStandup(null);
    try{
      localStorage.removeItem('ss-team');
      localStorage.removeItem('ss-role');
      localStorage.removeItem('ss-view');
    }catch(e){}
  },[]);
  const handleSendMessage=useCallback(async(m)=>{
    if(SB.IS_LIVE&&team){
      // Add to local state immediately for sender
      const localId='local-'+Date.now();
      const localMsg={...m,id:localId};
      setMessages(p=>[...p,localMsg]);
      // Save to DB
      const saved=await SB.sendChatMessage(team.id,m);
      if(saved){
        // Replace local message with saved one
        setMessages(p=>p.map(x=>x.id===localId?{...saved,type:m.type,url:m.url,text:m.text}:x));
        // Broadcast to all other online members instantly
        await SB.broadcastMessage(team.id,{...saved,type:m.type,url:m.url,text:m.text});
      }
    } else {
      setMessages(p=>[...p,m]);
    }
  },[team]);

  // PiP popup — declared AFTER all handlers to avoid TDZ
  const { openPip, isOpen: pipOpen } = usePip({
    tasks, onAdd: handleAddTask, onStatus: handleStatus, session, team, standup
  });

  const myMember=members.find(m=>m.user_id===(session?.user?.id||'u1'));
  const userForView={email:session?.user?.email||'tanisk.pandey@xtransmatrix.com',name:session?.user?.user_metadata?.name||'Tanisk Pandey'};

  useEffect(()=>{document.body.style.background=dark?'#060412':'#F1F5F9';},[dark]);

  // authLoading removed — session is instant from sessionStorage

  return(
    <ThemeCtx.Provider value={{dark,toggle}}>
      <style>{CSS+`select option{background:${dark?'#0D0B24':'#fff'}!important;color:${dark?'#fff':'#1E1B4B'}}input::placeholder,textarea::placeholder{color:${dark?'rgba(255,255,255,.28)':'rgba(0,0,0,.35)'}}`}</style>
      <BgEl/>
      {toast&&<ToastEl msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
      {view==='auth'&&<AuthPage onLogin={handleLogin} inviteToken={inviteToken}/>}
      {/* App views */}
      {(session||!SB.IS_LIVE)&&view==='home'&&<HomeView key={homeKey} session={session||{user:{email:'demo@standsync.app',user_metadata:{name:'Demo User'}}}} onSelectTeam={handleSelectTeam} onLogout={handleLogout} onSettings={()=>setView('settings')}/>}
      {(session||!SB.IS_LIVE)&&view==='settings'&&<SettingsPage session={session||{user:{email:'demo@standsync.app',user_metadata:{name:'Demo User'}}}} onBack={()=>setView(team?'standup':'home')} onSaved={d=>showToast('Profile saved')}/>}
      {(session||!SB.IS_LIVE)&&view==='standup'&&isManager&&<ManagerView session={session||{user:{email:userForView.email,user_metadata:{name:userForView.name}}}} team={team||{id:'demo',name:'xtransmatrix',standup_name:'Supa Daily Standup'}} tasks={tasks} members={members} history={history} standup={standup} onStatus={handleStatus} onPriority={handlePriority} onNote={handleNote} onAddTask={handleAddTask} onBack={()=>{setHomeKey(k=>k+1);setView('home');}} onSettings={()=>setView('settings')} onLogout={handleLogout} emailBusy={emailBusy} onDigest={handleDigest} onEOD={handleEOD} messages={messages} onSendMessage={handleSendMessage} chatTheme={chatTheme} onChangeTheme={setChatTheme} setMembers={setMembers} openPip={openPip} pipOpen={pipOpen}/>}
      {/* PiP is a real popup window — no DOM element needed */}
      {(session||!SB.IS_LIVE)&&view==='standup'&&!isManager&&<MemberView user={userForView} myMember={myMember} tasks={tasks} onAdd={handleAddTask} onStatus={handleStatus} onBlocker={handleBlocker} onBack={()=>{setHomeKey(k=>k+1);setView('home');}} onSettings={()=>setView('settings')} session={session||{user:{email:userForView.email,user_metadata:{name:userForView.name}}}} members={members} messages={messages} onSendMessage={handleSendMessage} chatTheme={chatTheme} onChangeTheme={setChatTheme}/>}
    </ThemeCtx.Provider>
  );
}

// ─── MANAGER MEETING NOTES ───────────────────────────────────────────────────
function NotesTab({ session, team, role='manager' }) {
  const c=useC();
  const teamId=team?.id||'demo';
  const userId=session?.user?.email||'user';
  const storageKey=(type,id)=>'ss-notes-'+role+'-'+teamId+'-'+type+'-'+id;

  const todayKey=new Date().toISOString().slice(0,10);
  const [view,setView]=useState('list'); // list | editor
  const [noteType,setNoteType]=useState('meeting'); // meeting | project
  const [selectedNote,setSelectedNote]=useState(null);
  const [noteContent,setNoteContent]=useState('');
  const [noteTitle,setNoteTitle]=useState('');
  const [saved,setSaved]=useState(false);

  // Load all saved notes
  const [allNotes,setAllNotes]=useState(()=>{
    try{
      const raw=localStorage.getItem('ss-notesindex-'+role+'-'+teamId);
      return raw?JSON.parse(raw):[];
    }catch{return [];}
  });

  const saveIndex=(notes)=>{
    try{localStorage.setItem('ss-notesindex-'+role+'-'+teamId,JSON.stringify(notes));}catch{}
  };

  const openNote=(note)=>{
    setSelectedNote(note);
    setNoteTitle(note.title);
    setNoteType(note.type);
    try{setNoteContent(localStorage.getItem(storageKey(note.type,note.id))||'');}catch{setNoteContent('');}
    setView('editor');
  };

  const newNote=(type)=>{
    const id='note-'+Date.now();
    const title=type==='meeting'
      ?'Meeting · '+new Date().toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})
      :'Project note · '+new Date().toLocaleDateString('en-GB',{day:'numeric',month:'short'});
    const note={id,type,title,created:new Date().toISOString()};
    const updated=[note,...allNotes];
    setAllNotes(updated); saveIndex(updated);
    openNote(note);
  };

  const saveNote=()=>{
    if(!selectedNote)return;
    try{localStorage.setItem(storageKey(selectedNote.type,selectedNote.id),noteContent);}catch{}
    // Update title in index
    const updated=allNotes.map(n=>n.id===selectedNote.id?{...n,title:noteTitle,updated:new Date().toISOString()}:n);
    setAllNotes(updated); saveIndex(updated);
    setSaved(true); setTimeout(()=>setSaved(false),2000);
  };

  const deleteNote=(id,e)=>{
    e.stopPropagation();
    if(!window.confirm('Delete this note?'))return;
    const updated=allNotes.filter(n=>n.id!==id);
    setAllNotes(updated); saveIndex(updated);
    try{localStorage.removeItem(storageKey(allNotes.find(n=>n.id===id)?.type||'meeting',id));}catch{}
    if(selectedNote?.id===id){setView('list');setSelectedNote(null);}
  };

  const meeting=allNotes.filter(n=>n.type==='meeting');
  const project=allNotes.filter(n=>n.type==='project');

  if(view==='editor') return(
    <div>
      <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:14 }}>
        <button onClick={()=>setView('list')} style={{ background:'none',border:'none',color:c.mut,cursor:'pointer',fontSize:13,padding:0 }}>← Back</button>
        <span style={{ fontSize:11,padding:'2px 8px',borderRadius:20,background:selectedNote?.type==='meeting'?'rgba(99,102,241,.12)':'rgba(52,211,153,.12)',color:selectedNote?.type==='meeting'?'#818CF8':'#34D399',fontWeight:600 }}>{selectedNote?.type==='meeting'?'📅 Meeting':'📁 Project'}</span>
        <div style={{ flex:1 }}/>
        <Btn onClick={saveNote}>{saved?'✓ Saved!':'Save'}</Btn>
      </div>
      <input value={noteTitle} onChange={e=>setNoteTitle(e.target.value)} onBlur={saveNote} style={{ width:'100%',background:'transparent',border:'none',borderBottom:`1px solid ${c.bord}`,color:c.text,fontSize:18,fontWeight:700,padding:'0 0 10px',outline:'none',marginBottom:12,boxSizing:'border-box' }}/>
      <Card style={{ padding:'4px' }}>
        <textarea value={noteContent} onChange={e=>setNoteContent(e.target.value)} onBlur={saveNote}
          placeholder="Write your notes here..."
          style={{ width:'100%',minHeight:460,background:'transparent',border:'none',color:c.text,fontSize:14,lineHeight:1.8,padding:'16px',outline:'none',resize:'vertical',fontFamily:'inherit',boxSizing:'border-box' }}/>
      </Card>
    </div>
  );

  return(
    <div>
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18 }}>
        <h2 style={{ fontSize:18,fontWeight:700,color:c.text,margin:0 }}>📝 Notes</h2>
        <div style={{ display:'flex',gap:7 }}>
          <Btn onClick={()=>newNote('meeting')} style={{ fontSize:12,padding:'6px 12px' }}>+ Meeting note</Btn>
          <Btn v="ghost" onClick={()=>newNote('project')} style={{ fontSize:12,padding:'6px 12px' }}>+ Project note</Btn>
        </div>
      </div>
      {/* Meeting notes section */}
      <div style={{ marginBottom:20 }}>
        <div style={{ fontSize:12,fontWeight:700,color:c.mut,textTransform:'uppercase',letterSpacing:'.07em',marginBottom:10,display:'flex',alignItems:'center',gap:6 }}>
          <span>📅 Meeting notes</span><span style={{ fontSize:11,fontWeight:400 }}>({meeting.length})</span>
        </div>
        {meeting.length===0&&<div style={{ fontSize:13,color:c.mut,padding:'12px 0' }}>No meeting notes yet — click "+ Meeting note" to create one</div>}
        <div style={{ display:'flex',flexDirection:'column',gap:6 }}>
          {meeting.map(n=>(
            <Card key={n.id} onClick={()=>openNote(n)} style={{ padding:'12px 16px',cursor:'pointer',display:'flex',alignItems:'center',gap:10 }}>
              <span style={{ fontSize:18 }}>📅</span>
              <div style={{ flex:1,minWidth:0 }}>
                <div style={{ fontSize:13,fontWeight:600,color:c.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{n.title}</div>
                <div style={{ fontSize:11,color:c.mut }}>{n.updated?new Date(n.updated).toLocaleDateString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):new Date(n.created).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}</div>
              </div>
              <button onClick={e=>deleteNote(n.id,e)} style={{ background:'none',border:'none',color:c.mut,cursor:'pointer',fontSize:14,opacity:.5,flexShrink:0 }}>🗑</button>
            </Card>
          ))}
        </div>
      </div>
      {/* Project notes section */}
      <div>
        <div style={{ fontSize:12,fontWeight:700,color:c.mut,textTransform:'uppercase',letterSpacing:'.07em',marginBottom:10,display:'flex',alignItems:'center',gap:6 }}>
          <span>📁 Project notes</span><span style={{ fontSize:11,fontWeight:400 }}>({project.length})</span>
        </div>
        {project.length===0&&<div style={{ fontSize:13,color:c.mut,padding:'12px 0' }}>No project notes yet — click "+ Project note" to create one</div>}
        <div style={{ display:'flex',flexDirection:'column',gap:6 }}>
          {project.map(n=>(
            <Card key={n.id} onClick={()=>openNote(n)} style={{ padding:'12px 16px',cursor:'pointer',display:'flex',alignItems:'center',gap:10 }}>
              <span style={{ fontSize:18 }}>📁</span>
              <div style={{ flex:1,minWidth:0 }}>
                <div style={{ fontSize:13,fontWeight:600,color:c.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{n.title}</div>
                <div style={{ fontSize:11,color:c.mut }}>{n.updated?new Date(n.updated).toLocaleDateString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):new Date(n.created).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}</div>
              </div>
              <button onClick={e=>deleteNote(n.id,e)} style={{ background:'none',border:'none',color:c.mut,cursor:'pointer',fontSize:14,opacity:.5,flexShrink:0 }}>🗑</button>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
function ManagerNotesTab({ session, team }) { return <NotesTab session={session} team={team} role="manager"/>; }

// ─── TEAM ANALYSIS TAB ───────────────────────────────────────────────────────
function TeamAnalysisTab({ tasks, members }) {
  const c=useC();
  const total=tasks.length, done=tasks.filter(t=>t.status==='done').length;
  const inProg=tasks.filter(t=>t.status==='in-progress').length;
  const blocked=tasks.filter(t=>t.status==='blocked').length;
  const pct=total?Math.round(done/total*100):0;

  // Per-member stats
  const memberStats=members.map(m=>{
    const mt=tasks.filter(t=>t.assignee_email===m.email);
    const md=mt.filter(t=>t.status==='done').length;
    const mb=mt.filter(t=>t.status==='blocked').length;
    const mp=mt.length?Math.round(md/mt.length*100):0;
    return {...m,total:mt.length,done:md,blocked:mb,pct:mp};
  }).sort((a,b)=>b.pct-a.pct);

  // Priority distribution
  const byPri={critical:tasks.filter(t=>t.priority==='critical').length,high:tasks.filter(t=>t.priority==='high').length,medium:tasks.filter(t=>t.priority==='medium').length,low:tasks.filter(t=>t.priority==='low').length};
  const priColors={critical:'#EF4444',high:'#F97316',medium:'#F59E0B',low:'#10B981'};

  return(
    <div>
      <h2 style={{ fontSize:18,fontWeight:700,color:c.text,marginBottom:16 }}>📈 Team analysis</h2>
      {/* Summary cards */}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20 }}>
        {[{l:'Completion',v:pct+'%',c:'#818CF8'},{l:'Done',v:done+'/'+total,c:'#34D399'},{l:'In progress',v:inProg,c:'#38BDF8'},{l:'Blocked',v:blocked,c:blocked>0?'#EF4444':'#34D399'}].map(s=>(
          <Card key={s.l} style={{ padding:'16px',textAlign:'center' }}>
            <div style={{ fontSize:26,fontWeight:800,color:s.c,marginBottom:4 }}>{s.v}</div>
            <div style={{ fontSize:11,color:c.mut,textTransform:'uppercase',letterSpacing:'.06em' }}>{s.l}</div>
          </Card>
        ))}
      </div>
      {/* Team completion bar */}
      <Card style={{ padding:'18px 20px',marginBottom:16 }}>
        <div style={{ display:'flex',justifyContent:'space-between',marginBottom:8 }}><span style={{ fontSize:13,fontWeight:600,color:c.text }}>Overall team progress</span><span style={{ fontSize:13,fontWeight:700,color:pct>=80?'#34D399':pct>=50?'#818CF8':'#F97316' }}>{pct}%</span></div>
        <Bar pct={pct} h={10} color="linear-gradient(90deg,#6366F1,#34D399)"/>
      </Card>
      {/* Priority breakdown */}
      <Card style={{ padding:'18px 20px',marginBottom:16 }}>
        <div style={{ fontSize:13,fontWeight:700,color:c.text,marginBottom:14 }}>Priority breakdown</div>
        <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
          {Object.entries(byPri).map(([p,v])=>(
            <div key={p} style={{ display:'flex',alignItems:'center',gap:12 }}>
              <span style={{ width:70,fontSize:12,fontWeight:600,color:priColors[p],textTransform:'capitalize' }}>{p}</span>
              <div style={{ flex:1,height:8,borderRadius:4,background:'rgba(128,128,128,.15)',overflow:'hidden' }}>
                <div style={{ height:'100%',borderRadius:4,background:priColors[p],width:(total?v/total*100:0)+'%',transition:'width .4s' }}/>
              </div>
              <span style={{ fontSize:12,color:c.mut,width:20,textAlign:'right' }}>{v}</span>
            </div>
          ))}
        </div>
      </Card>
      {/* Per-member performance */}
      <Card style={{ overflow:'hidden' }}>
        <div style={{ padding:'14px 18px',borderBottom:`1px solid ${c.bord}`,fontSize:13,fontWeight:700,color:c.text }}>Member performance</div>
        {memberStats.length===0&&<div style={{ padding:'24px',textAlign:'center',color:c.mut,fontSize:13 }}>Add team members to see analysis</div>}
        {memberStats.map((m,i)=>(
          <div key={m.email} style={{ padding:'14px 18px',borderBottom:i<memberStats.length-1?`1px solid ${c.bord}`:'none',display:'flex',alignItems:'center',gap:14 }}>
            <div style={{ width:28,height:28,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,color:'rgba(255,255,255,.5)' }}>{i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}</div>
            <Av member={m} size={34} url={m.avatar_url}/>
            <div style={{ flex:1,minWidth:0 }}>
              <div style={{ fontSize:14,fontWeight:600,color:c.text,marginBottom:4 }}>{m.name||m.email}</div>
              <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                <div style={{ flex:1,height:6,borderRadius:3,background:'rgba(128,128,128,.15)',overflow:'hidden' }}>
                  <div style={{ height:'100%',borderRadius:3,background:m.pct>=80?'#34D399':m.pct>=50?'#818CF8':'#F97316',width:m.pct+'%',transition:'width .4s' }}/>
                </div>
                <span style={{ fontSize:11,color:c.mut }}>{m.done}/{m.total}</span>
              </div>
            </div>
            <div style={{ textAlign:'right',flexShrink:0 }}>
              <div style={{ fontSize:18,fontWeight:800,color:m.pct>=80?'#34D399':m.pct>=50?'#818CF8':'#F97316' }}>{m.pct}%</div>
              {m.blocked>0&&<div style={{ fontSize:10,color:'#F87171' }}>⚠️ {m.blocked} blocked</div>}
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
