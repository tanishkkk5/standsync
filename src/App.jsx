import { useState, useEffect, useCallback, useMemo, useRef, createContext, useContext } from 'react';
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
    bg:'#060412', surf:'rgba(255,255,255,.058)', surfH:'rgba(255,255,255,.09)',
    bord:'rgba(255,255,255,.1)', bordH:'rgba(255,255,255,.2)',
    text:'#fff', sub:'rgba(255,255,255,.6)', mut:'rgba(255,255,255,.38)',
    nav:'rgba(6,4,18,.88)', inp:'rgba(255,255,255,.07)', inpB:'rgba(255,255,255,.13)',
    sel:'rgba(18,15,55,.97)', row:'rgba(255,255,255,.025)', dark:true,
  } : {
    bg:'#F1F5F9', surf:'rgba(255,255,255,.92)', surfH:'#fff',
    bord:'rgba(99,102,241,.15)', bordH:'rgba(99,102,241,.4)',
    text:'#1E1B4B', sub:'#4338CA', mut:'#6B7280',
    nav:'rgba(240,244,255,.95)', inp:'rgba(255,255,255,.9)', inpB:'rgba(99,102,241,.25)',
    sel:'#fff', row:'rgba(99,102,241,.03)', dark:false,
  };
}

const CSS = `*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;-webkit-font-smoothing:antialiased}
@keyframes orb{from{transform:translate(0,0) scale(1)}to{transform:translate(14px,18px) scale(1.07)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes pulse{0%,100%{transform:scale(1);opacity:.4}50%{transform:scale(1.6);opacity:.7}}
@keyframes slideIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes slideDown{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
input,select,textarea,button{font-family:inherit}
::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(128,128,128,.2);border-radius:3px}`;

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
  const c=useC(); const [h,setH]=useState(false);
  return <div onClick={onClick} onMouseEnter={()=>onClick&&setH(true)} onMouseLeave={()=>setH(false)} style={{ background:h?c.surfH:c.surf,backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',border:`1px solid ${h&&onClick?c.bordH:c.bord}`,borderRadius:16,transition:'all .2s',cursor:onClick?'pointer':undefined,...style }}>{children}</div>;
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
  const vs={ primary:{background:'linear-gradient(135deg,#6366F1,#818CF8)',color:'#fff',border:'none'}, ghost:{background:'transparent',color:dark?'rgba(255,255,255,.6)':'#4338CA',border:dark?'1px solid rgba(255,255,255,.18)':'1px solid rgba(99,102,241,.3)'}, danger:{background:'rgba(239,68,68,.14)',color:'#F87171',border:'1px solid rgba(239,68,68,.3)'}, warn:{background:'rgba(245,158,11,.15)',color:'#FCD34D',border:'1px solid rgba(245,158,11,.3)'}, success:{background:'linear-gradient(135deg,#059669,#34D399)',color:'#fff',border:'none'}, google:{background:'#fff',color:'#3C4043',border:'1px solid #dadce0'}, gcal:{background:'linear-gradient(135deg,#4285F4,#34A853)',color:'#fff',border:'none'}, };
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
  if(!dark) return <div style={{ position:'fixed',inset:0,zIndex:0,pointerEvents:'none',background:'linear-gradient(150deg,#E0E7FF 0%,#F0F4FF 50%,#EEF2FF 100%)' }}><div style={{ position:'absolute',inset:0,opacity:.04,backgroundImage:'radial-gradient(circle at 1px 1px,#6366F1 1px,transparent 0)',backgroundSize:'44px 44px' }}/></div>;
  const orbs=[{w:560,h:560,top:'-130px',left:'-90px',c:'#3730A3',d:9},{w:420,h:420,top:'25%',right:'-70px',c:'#0C4A6E',d:13},{w:300,h:300,bottom:'8%',left:'12%',c:'#581C87',d:11},{w:240,h:240,top:'60%',right:'16%',c:'#064E3B',d:15}];
  return <div style={{ position:'fixed',inset:0,zIndex:0,overflow:'hidden',pointerEvents:'none' }}><div style={{ position:'absolute',inset:0,background:'linear-gradient(150deg,#060412 0%,#0C0820 35%,#081428 70%,#060C1C 100%)' }}/>{orbs.map((o,i)=><div key={i} style={{ position:'absolute',width:o.w,height:o.h,borderRadius:'50%',background:`radial-gradient(circle,${o.c}30,transparent 70%)`,top:o.top,left:o.left,right:o.right,bottom:o.bottom,animation:`orb ${o.d}s ease-in-out infinite alternate`,animationDelay:`${i*1.5}s` }}/>)}<div style={{ position:'absolute',inset:0,opacity:.022,backgroundImage:'radial-gradient(circle at 1px 1px,white 1px,transparent 0)',backgroundSize:'48px 48px' }}/></div>;
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

  const goToTeam=(team,role)=>{ if(team&&team.id) onSelectTeam(team,role); };

  // ── Team list ──────────────────────────────────────────────────────────────
  if(view==='list') return(
    <div style={{ minHeight:'100vh',position:'relative',zIndex:1,animation:'fadeIn .3s ease' }}>
      <div style={{ borderBottom:`1px solid ${c.bord}`,background:c.nav,backdropFilter:'blur(24px)',position:'sticky',top:0,zIndex:100 }}>
        <div style={{ maxWidth:920,margin:'0 auto',padding:'0 24px',height:58,display:'flex',alignItems:'center',gap:12 }}>
          <Logo size={28}/><div style={{ flex:1 }}/><ThemeToggle/><ProfileMenu session={session} onSettings={onSettings} onLogout={onLogout}/>
        </div>
      </div>
      <div style={{ maxWidth:920,margin:'0 auto',padding:'36px 24px' }}>
        <h1 style={{ fontSize:24,fontWeight:800,color:c.text,marginBottom:6 }}>Good morning, {name} 👋</h1>
        <p style={{ color:c.mut,fontSize:14,marginBottom:28 }}>Your teams and projects — select one or join / create.</p>
        {!SB.IS_LIVE&&<div style={{ background:'rgba(245,158,11,.1)',border:'1px solid rgba(245,158,11,.3)',borderRadius:12,padding:'14px 18px',marginBottom:20,fontSize:13,color:'#FCD34D' }}>⚡ Demo mode — connect Supabase for real data</div>}

        {/* New user banner */}
        {!loading&&teams.length===0&&(
          <div style={{ background:'rgba(99,102,241,.08)',border:'1px solid rgba(99,102,241,.25)',borderRadius:14,padding:'24px',marginBottom:24,textAlign:'center' }}>
            <div style={{ fontSize:40,marginBottom:12 }}>👋</div>
            <div style={{ fontSize:17,fontWeight:700,color:c.text,marginBottom:6 }}>Welcome to StandSync!</div>
            <div style={{ fontSize:14,color:c.mut,marginBottom:20 }}>Create a new team or join an existing one with a Room ID.</div>
            <div style={{ display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap' }}>
              <Btn onClick={()=>setView('create')} style={{ padding:'12px 28px',fontSize:14 }}>+ Create a team</Btn>
              <Btn v="ghost" onClick={()=>setView('join')} style={{ padding:'12px 28px',fontSize:14 }}>🔑 Join with Room ID</Btn>
            </div>
          </div>
        )}

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
                {tm.role==='manager'&&<button onClick={e=>{e.stopPropagation();if(window.confirm('Delete "'+tm.teams?.name+'"? This removes all tasks, members and history. This cannot be undone.'))deleteTeam(tm.teams?.id);}} style={{ position:'absolute',top:10,right:10,width:28,height:28,borderRadius:8,background:'rgba(239,68,68,.1)',border:'1px solid rgba(239,68,68,.2)',color:'#F87171',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13 }} title="Delete team">🗑</button>}
              </Card>
            ))}
            {teams.length>0&&(<>
              <Card onClick={()=>setView('create')} style={{ padding:'22px',cursor:'pointer',border:`1.5px dashed ${c.bord}`,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:8,minHeight:130 }}>
                <div style={{ width:38,height:38,borderRadius:'50%',background:'rgba(99,102,241,.15)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20 }}>+</div>
                <div style={{ fontSize:13,color:c.sub,fontWeight:600 }}>New team</div>
              </Card>
              <Card onClick={()=>setView('join')} style={{ padding:'22px',cursor:'pointer',border:`1.5px dashed ${c.bord}`,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:8,minHeight:130 }}>
                <div style={{ width:38,height:38,borderRadius:'50%',background:'rgba(99,102,241,.15)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20 }}>🔑</div>
                <div style={{ fontSize:13,color:c.sub,fontWeight:600 }}>Join a team</div>
              </Card>
            </>)}
          </div>
        )}
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
  const c=useC(); const [open,setOpen]=useState(false);
  const [msgs,setMsgs]=useState([{id:'w',role:'assistant',text:'Hi! I am your StandSync AI. Ask me about tasks, blockers, team progress, or what to focus on today.'}]);
  const [input,setInput]=useState(''); const [loading,setLoading]=useState(false);
  const bottomRef=useRef(); const name=session?.user?.user_metadata?.name||'User';
  useEffect(()=>{ if(open) bottomRef.current?.scrollIntoView({behavior:'smooth'}); },[msgs,open]);
  const send=async()=>{
    if(!input.trim()||loading) return;
    const userMsg={id:'u'+Date.now(),role:'user',text:input.trim()};
    setMsgs(p=>[...p,userMsg]); setInput(''); setLoading(true);
    try{ const reply=await askAI(input.trim(),{tasks,members,history,teamName,userName:name,myTasks}); setMsgs(p=>[...p,{id:'a'+Date.now(),role:'assistant',text:reply}]); }
    catch(e){ setMsgs(p=>[...p,{id:'e'+Date.now(),role:'assistant',text:'Sorry, try again!'}]); }
    setLoading(false);
  };
  const QUICK=['Focus today?','Team progress?','Any blockers?','My tasks'];
  return (
    <>
      <button onClick={()=>setOpen(!open)} style={{ position:'fixed',bottom:24,right:24,zIndex:800,width:52,height:52,borderRadius:'50%',background:'linear-gradient(135deg,#6366F1,#818CF8)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,boxShadow:'0 4px 24px rgba(99,102,241,.5)',transition:'transform .2s',transform:open?'scale(.9)':'scale(1)' }}>{open?'✕':'🤖'}</button>
      {open&&(
        <div style={{ position:'fixed',bottom:88,right:24,zIndex:799,width:320,maxHeight:460,background:c.dark?'rgba(12,10,32,.97)':'#fff',border:`1px solid ${c.bord}`,borderRadius:18,display:'flex',flexDirection:'column',boxShadow:'0 8px 40px rgba(0,0,0,.4)',overflow:'hidden',animation:'popIn .2s ease' }}>
          <div style={{ padding:'12px 14px',borderBottom:`1px solid ${c.bord}`,display:'flex',alignItems:'center',gap:8,background:'rgba(99,102,241,.08)',flexShrink:0 }}>
            <div style={{ width:30,height:30,borderRadius:'50%',background:'linear-gradient(135deg,#6366F1,#818CF8)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0 }}>🤖</div>
            <div style={{ flex:1 }}><div style={{ fontSize:13,fontWeight:700,color:c.text }}>StandSync AI</div><div style={{ fontSize:10,color:'#34D399' }}>Online</div></div>
          </div>
          <div style={{ padding:'7px 10px',display:'flex',gap:5,flexWrap:'wrap',borderBottom:`1px solid ${c.bord}`,flexShrink:0 }}>
            {QUICK.map(q=><button key={q} onClick={()=>setInput(q)} style={{ fontSize:11,padding:'3px 9px',borderRadius:20,border:`1px solid ${c.bord}`,background:c.surf,color:c.mut,cursor:'pointer',whiteSpace:'nowrap' }}>{q}</button>)}
          </div>
          <div style={{ flex:1,overflowY:'auto',padding:'10px',display:'flex',flexDirection:'column',gap:7 }}>
            {msgs.map(m=>(
              <div key={m.id} style={{ display:'flex',flexDirection:m.role==='user'?'row-reverse':'row' }}>
                <div style={{ maxWidth:'88%',background:m.role==='user'?'linear-gradient(135deg,#6366F1,#818CF8)':c.surf,color:m.role==='user'?'#fff':c.text,padding:'8px 12px',borderRadius:m.role==='user'?'13px 13px 3px 13px':'13px 13px 13px 3px',fontSize:12,lineHeight:1.5,border:m.role==='user'?'none':`1px solid ${c.bord}` }}>
                  {m.text.split('\n').map((l,i)=><div key={i}>{l||<br/>}</div>)}
                </div>
              </div>
            ))}
            {loading&&<div style={{ display:'flex',gap:5,padding:'7px 11px',background:c.surf,borderRadius:'13px 13px 13px 3px',width:'fit-content',border:`1px solid ${c.bord}` }}>{[0,1,2].map(i=><div key={i} style={{ width:6,height:6,borderRadius:'50%',background:'#818CF8',animation:`bounce .8s ease ${i*.15}s infinite` }}/>)}</div>}
            <div ref={bottomRef}/>
          </div>
          <div style={{ padding:'9px 10px',borderTop:`1px solid ${c.bord}`,display:'flex',gap:7,flexShrink:0 }}>
            <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder="Ask me anything..." style={{ flex:1,background:c.inp,border:`1px solid ${c.inpB}`,borderRadius:9,padding:'8px 11px',color:c.text,fontSize:12,outline:'none' }}/>
            <button onClick={send} disabled={!input.trim()||loading} style={{ width:34,height:34,borderRadius:9,background:'linear-gradient(135deg,#6366F1,#818CF8)',border:'none',color:'#fff',cursor:input.trim()&&!loading?'pointer':'not-allowed',opacity:input.trim()&&!loading?1:.5,display:'flex',alignItems:'center',justifyContent:'center',fontSize:15,flexShrink:0 }}>↑</button>
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
const EMOJI_LIST = ['👍','❤️','😂','😮','😢','🙏','🔥','🎉','✅','👀','💯','🚀','😊','🤔','👏','💪','😅','🤣','😍','🥳','🙌','💡','⚡','🎯','✨','🤝','😎','🫡','👋','💬'];
const EMOJI_GROUPS = {
  'Smileys': ['😀','😁','😂','🤣','😊','😍','🥰','😘','😎','🤩','😏','😒','😞','😔','😟','😕','🙁','😣','😖','😫','😩','🥺','😢','😭','😤','😠','😡','🤬','🤯','😳','🥵','🥶','😱','😨','😰','😥','😓','🤗','🤔','🤭','🤫','🤥','😶','😐','😑','😬','🙄','😯','😦','😧','😮','😲','🥱','😴','🤤','😪','😵','🤐','🥴','🤢','🤮','🤧','🥳'],
  'Gestures': ['👍','👎','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','👋','🤚','🖐','✋','🖖','🙌','👐','🤲','🤝','🙏','✍️','💅','🤳','💪','🦵','🦶','👂','🦻','👃'],
  'Objects': ['💬','📎','📄','🖼️','🎵','🎬','📅','⚡','🔥','💡','🎯','✅','❌','⭐','🏆','🎉','🎊','🎁','📱','💻','⌨️','🖱️','🖨️','📷','📸','📹','🎥','📞','📟','📠','🔋','🔌','💾','💿','📀','🖥️','📺','📻'],
  'Nature': ['🌟','⭐','🌈','☀️','🌤️','⛅','🌦️','🌧️','⛈️','🌩️','🌨️','❄️','🔥','💧','🌊','🌸','🌺','🌻','🌹','🍀','🌿','🌱','🌲','🌳','🌴'],
};

function RichChatPanel({ messages=[], onSend, session, members=[], chatTheme='default', onChangeTheme, isManager=false }) {
  const c=useC();
  const [msg,setMsg]=useState('');
  const [activeSpace,setActiveSpace]=useState('general');
  const [showEmoji,setShowEmoji]=useState(false);
  const [emojiGroup,setEmojiGroup]=useState('Smileys');
  const [showGif,setShowGif]=useState(false);
  const [gifSearch,setGifSearch]=useState(''); const [gifs,setGifs]=useState([]); const [gifLoading,setGifLoading]=useState(false);
  const [showNewSpace,setShowNewSpace]=useState(false); const [newSpaceName,setNewSpaceName]=useState('');
  const [customSpaces,setCustomSpaces]=useState(()=>{ try{return JSON.parse(localStorage.getItem('ss-spaces')||'[]');}catch{return[];} });
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
      return (m.dm_to===myEmail&&m.sender_email===dmEmail)||(m.dm_to===dmEmail&&m.sender_email===myEmail);
    }
    return (m.space||'general')===activeSpace && !m.dm_to;
  });

  const sendMsg=(text,type='text',url='',filename='',filesize=0)=>{
    if(type==='text'&&!text.trim())return;
    const isDM=activeSpace.startsWith('dm-');
    onSend({id:'m'+Date.now(),text:type==='text'?text.trim():'',type,url,filename,filesize,
      sender_email:myEmail,sender_name:myName,created_at:new Date().toISOString(),
      space:activeSpace,dm_to:isDM?activeSpace.slice(3):undefined,
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
    const updated=[...customSpaces,{id,name:newSpaceName.trim()}];
    setCustomSpaces(updated);
    try{localStorage.setItem('ss-spaces',JSON.stringify(updated));}catch{}
    setActiveSpace(id); setShowNewSpace(false); setNewSpaceName('');
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

  const DEFAULT_SPACES=[{id:'general',label:'general',icon:'#'},{id:'announcements',label:'announcements',icon:'#'},{id:'random',label:'random',icon:'#'}];
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
            <div style={{ margin:'4px 6px 8px',padding:'10px',background:c.surf,borderRadius:10,border:`1px solid ${c.bord}` }}>
              <input value={newSpaceName} onChange={e=>setNewSpaceName(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')addCustomSpace();if(e.key==='Escape')setShowNewSpace(false);}} placeholder="Space name..." autoFocus style={{ width:'100%',background:c.inp,border:`1px solid ${c.inpB}`,borderRadius:7,padding:'6px 10px',color:c.text,fontSize:12,outline:'none',boxSizing:'border-box',marginBottom:7 }}/>
              <div style={{ display:'flex',gap:5 }}>
                <button onClick={addCustomSpace} disabled={!newSpaceName.trim()} style={{ flex:1,padding:'5px',borderRadius:7,background:'#6366F1',border:'none',color:'#fff',cursor:'pointer',fontSize:12,fontWeight:600 }}>Create</button>
                <button onClick={()=>setShowNewSpace(false)} style={{ padding:'5px 8px',borderRadius:7,background:'transparent',border:`1px solid ${c.bord}`,color:c.mut,cursor:'pointer',fontSize:12 }}>✕</button>
              </div>
            </div>
          )}
          {[...DEFAULT_SPACES,...customSpaces].map(sp=>(
            <div key={sp.id} style={{ display:'flex',alignItems:'center',gap:1 }}>
              <button onClick={()=>setActiveSpace(sp.id)} style={{ flex:1,display:'flex',alignItems:'center',gap:8,padding:'7px 10px',borderRadius:9,border:'none',background:activeSpace===sp.id?(c.dark?'rgba(99,102,241,.2)':'rgba(99,102,241,.12)'):'transparent',color:activeSpace===sp.id?'#818CF8':c.sub,cursor:'pointer',fontSize:13,fontWeight:activeSpace===sp.id?600:400,textAlign:'left' }}>
                <span style={{ fontSize:12,fontWeight:700,color:activeSpace===sp.id?'#818CF8':c.mut,flexShrink:0 }}>#</span>
                <span style={{ overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{sp.label||sp.name}</span>
              </button>
              {customSpaces.find(s=>s.id===sp.id)&&isManager&&<button onClick={()=>deleteCustomSpace(sp.id)} style={{ background:'none',border:'none',color:c.mut,cursor:'pointer',fontSize:12,padding:'4px',opacity:.5,flexShrink:0 }}>✕</button>}
            </div>
          ))}

          {/* Direct Messages */}
          <div style={{ padding:'10px 10px 4px',marginTop:8 }}>
            <span style={{ fontSize:11,fontWeight:700,color:c.mut,textTransform:'uppercase',letterSpacing:'.08em' }}>Direct messages</span>
          </div>
          {dmMembers.length===0&&<div style={{ fontSize:12,color:c.mut,padding:'6px 10px' }}>No other members yet</div>}
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
  const [status,setStatus]=useState('idle'); // idle | loading | connected | error
  const [events,setEvents]=useState([]);
  const [view,setView]=useState('week'); // week | month | agenda
  const [currentDate,setCurrentDate]=useState(new Date());
  const [selectedEvent,setSelectedEvent]=useState(null);
  const [error,setError]=useState('');
  const [detectedStandups,setDetectedStandups]=useState([]);
  const [selectedStandup,setSelectedStandup]=useState(null); // chosen standup meeting
  const [showStandupPicker,setShowStandupPicker]=useState(false);
  const CLIENT_ID=process.env.REACT_APP_GOOGLE_CLIENT_ID;
  const SCOPES='https://www.googleapis.com/auth/calendar.readonly';

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
  };

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

  const getEventsForDay=(date)=>{
    if(!date)return[];
    const dateStr=date.toDateString();
    return events.filter(ev=>{
      if(ev.start?.dateTime){
        return new Date(ev.start.dateTime).toDateString()===dateStr;
      }
      if(ev.start?.date){
        // All-day event: compare YYYY-MM-DD strings to avoid timezone issues
        const evDate=ev.start.date; // "2026-06-15"
        const y=date.getFullYear(),m=String(date.getMonth()+1).padStart(2,'0'),d=String(date.getDate()).padStart(2,'0');
        return evDate===y+'-'+m+'-'+d;
      }
      return false;
    }).sort((a,b)=>{
      const ta=new Date(a.start?.dateTime||a.start?.date+'T00:00');
      const tb=new Date(b.start?.dateTime||b.start?.date+'T00:00');
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
          <div style={{ display:'grid',gridTemplateColumns:'52px repeat(7,1fr)',height:600,overflowY:'auto' }}>
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
      <div style={{ borderBottom:`1px solid ${c.bord}`,background:c.nav,backdropFilter:'blur(24px)',position:'sticky',top:0,zIndex:100 }}>
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
  const TABS=[{id:'tasks',l:'My tasks',i:'📋'},{id:'chat',l:'Team chat',i:'💬'},{id:'ai',l:'AI assistant',i:'🤖'}];
  return (
    <div style={{ position:'relative',zIndex:1,minHeight:'100vh' }}>
      <div style={{ borderBottom:`1px solid ${c.bord}`,background:c.nav,backdropFilter:'blur(24px)',position:'sticky',top:0,zIndex:100 }}>
        <div style={{ maxWidth:800,margin:'0 auto',padding:'0 20px',height:56,display:'flex',alignItems:'center',gap:12 }}>
          <Logo size={26} onClick={onBack}/>
          <div style={{ display:'flex',gap:2,flex:1 }}>{TABS.map(t=><button key={t.id} onClick={()=>setActiveTab(t.id)} style={{ padding:'5px 12px',borderRadius:8,border:'none',background:activeTab===t.id?'rgba(129,140,248,.18)':'transparent',color:activeTab===t.id?'#818CF8':c.mut,cursor:'pointer',fontSize:12,fontWeight:activeTab===t.id?700:400,display:'flex',alignItems:'center',gap:5 }}><span>{t.i}</span>{t.l}</button>)}</div>
          <div style={{ display:'flex',alignItems:'center',gap:5,fontSize:12,color:c.mut }}><LiveDot/><span>Live</span></div>
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
        {activeTab==='ai'&&<AIAssistant tasks={tasks} members={members} history={[]} session={session} myTasks={mine} teamName="Team"/>}
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
// ─── MANAGER VIEW ─────────────────────────────────────────────────────────────
const MGR_TABS=[{id:'live',l:'Live board',i:'⚡'},{id:'team',l:'Team',i:'👥'},{id:'perf',l:'Performance',i:'📊'},{id:'ai',l:'AI Assistant',i:'🤖'},{id:'chat',l:'Chat',i:'💬'},{id:'cal',l:'Calendar',i:'📅'},{id:'remind',l:'Reminders',i:'🔔'},{id:'hist',l:'History',i:'🗂️'},{id:'tset',l:'Settings',i:'⚙️'}];

function ManagerView({ session, team, tasks, members, history, standup, onStatus, onPriority, onNote, onAddTask, onBack, onSettings, onLogout, emailBusy, onDigest, onEOD, messages, onSendMessage, chatTheme, onChangeTheme, setMembers }) {
  const c=useC(); const [tab,setTab]=useState('live');
  const [unreadChat,setUnreadChat]=useState(0);
  const prevMsgCount=useRef(messages.length);
  useEffect(()=>{
    if(messages.length>prevMsgCount.current&&tab!=='chat'){
      const newMsgs=messages.slice(prevMsgCount.current);
      const myEmail=session?.user?.email;
      const externalNew=newMsgs.filter(m=>m.sender_email!==myEmail);
      if(externalNew.length>0) setUnreadChat(n=>n+externalNew.length);
    }
    prevMsgCount.current=messages.length;
  },[messages,tab]);
  const setTabClear=(t)=>{ setTab(t); if(t==='chat') setUnreadChat(0); };
  const blocked=tasks.filter(t=>t.status==='blocked').length;
  const name=session?.user?.user_metadata?.name||session?.user?.email?.split('@')[0]||'Manager';
  const myTasks=tasks.filter(t=>t.assignee_email===session?.user?.email);
  return(
    <div style={{ position:'relative',zIndex:1,minHeight:'100vh' }}>
      <div style={{ borderBottom:`1px solid ${c.bord}`,background:c.nav,backdropFilter:'blur(24px)',position:'sticky',top:0,zIndex:100 }}>
        <div style={{ maxWidth:1200,margin:'0 auto',padding:'0 24px',height:58,display:'flex',alignItems:'center',gap:10 }}>
          <Logo size={26} onClick={onBack}/>
          <nav style={{ display:'flex',gap:1,flex:1,overflowX:'auto' }}>
            {MGR_TABS.map(t=>(
              <button key={t.id} onClick={()=>setTabClear(t.id)} style={{ padding:'5px 10px',borderRadius:8,border:'none',background:tab===t.id?'rgba(129,140,248,.18)':'transparent',color:tab===t.id?'#818CF8':c.mut,cursor:'pointer',fontSize:11,fontWeight:tab===t.id?700:400,display:'flex',alignItems:'center',gap:4,transition:'all .15s',whiteSpace:'nowrap',flexShrink:0,position:'relative' }}>
                <span>{t.i}</span>{t.l}
                {t.id==='chat'&&unreadChat>0&&<span style={{ position:'absolute',top:0,right:0,minWidth:16,height:16,borderRadius:8,background:'#EF4444',color:'#fff',fontSize:9,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',padding:'0 3px',lineHeight:1 }}>{unreadChat>9?'9+':unreadChat}</span>}
              </button>
            ))}
          </nav>
          <div style={{ display:'flex',alignItems:'center',gap:7,flexShrink:0 }}>
            {blocked>0&&<div style={{ fontSize:11,color:'#F87171',background:'rgba(239,68,68,.12)',border:'1px solid rgba(239,68,68,.25)',padding:'3px 9px',borderRadius:8,fontWeight:700 }}>⚠️ {blocked}</div>}
            <Btn v="ghost" onClick={onDigest} loading={emailBusy} style={{ padding:'5px 10px',fontSize:11 }}>📧</Btn>
            <Btn v="warn" onClick={onEOD} loading={emailBusy} style={{ padding:'5px 10px',fontSize:11 }}>🕕</Btn>
            <ThemeToggle/><ProfileMenu session={session} onSettings={onSettings} onLogout={onLogout}/>
          </div>
        </div>
      </div>
      <div style={{ maxWidth:1200,margin:'0 auto',padding:'18px 24px 8px' }}>
        <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:3 }}><LiveDot/><span style={{ fontSize:11,color:'#34D399',textTransform:'uppercase',letterSpacing:'.08em',fontWeight:700 }}>Live · {team?.standup_name||team?.name||'Standup'}</span></div>
        <h1 style={{ margin:'0 0 2px',fontSize:20,fontWeight:800,color:c.text,letterSpacing:'-.025em' }}>Good morning, {name.split(' ')[0]} 👋</h1>
        <p style={{ margin:0,color:c.mut,fontSize:12 }}>{members.length} members · {tasks.length} tasks today</p>
      </div>
      <div style={{ maxWidth:1200,margin:'0 auto',padding:'0 24px 48px' }}>
        {tab==='live'&&<LiveTab tasks={tasks} members={members} onStatus={onStatus} onPriority={onPriority} onNote={onNote} onAddTask={onAddTask} session={session}/>}
        {tab==='team'&&<TeamTab tasks={tasks} members={members}/>}
        {tab==='perf'&&<PerfTab tasks={tasks} history={history} members={members}/>}
        {tab==='ai'&&<AIAssistant tasks={tasks} members={members} history={history} session={session} myTasks={myTasks} teamName={team?.name||'Team'}/>}
        {tab==='chat'&&<RichChatPanel messages={messages} onSend={onSendMessage} session={session} members={members} chatTheme={chatTheme} onChangeTheme={onChangeTheme} isManager={true}/>}
        {tab==='cal'&&<CalendarPanel team={team} members={members} session={session}/>}
        {tab==='remind'&&<RemindersPanel team={team} members={members} session={session}/>}
        {tab==='hist'&&<HistTab history={history} members={members}/>}
        {tab==='tset'&&<TeamSettingsTab team={team} members={members} session={session} onMembersUpdate={()=>{if(setMembers&&SB.IS_LIVE)SB.getTeamMembers(team.id).then(m=>setMembers(m||[]))}}/>}
      </div>
    </div>
  );
}

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
const DEMO_MEMBERS=[
  {id:'dm1',user_id:'u1',email:'tanisk.pandey@xtransmatrix.com',name:'Tanisk Pandey',role:'manager',color:'#818CF8'},
  {id:'dm2',user_id:'u2',email:'deepak.nr@xtransmatrix.com',name:'Deepak NR',role:'member',color:'#38BDF8'},
  {id:'dm3',user_id:'u3',email:'madhan.m@xtransmatrix.com',name:'Madhan M',role:'member',color:'#34D399'},
  {id:'dm4',user_id:'u4',email:'monica@xtransmatrix.com',name:'Monica M',role:'member',color:'#F472B6'},
  {id:'dm5',user_id:'u5',email:'sandhya.a@xtransmatrix.com',name:'Sandhya A',role:'member',color:'#FB923C'},
  {id:'dm6',user_id:'u6',email:'zeeba.kauser@xtransmatrix.com',name:'Zeeba Kauser',role:'member',color:'#E879F9'},
];

export default function App() {
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
      const raw = localStorage.getItem('ss-auth');
      if (!raw) return 'auth';
      const parsed = JSON.parse(raw);
      const hasSession = !!(parsed?.currentSession || parsed?.session);
      if (!hasSession) return 'auth';
      // Restore last view (e.g. 'standup') so OAuth redirect returns correctly
      const savedView = localStorage.getItem('ss-view');
      // But only restore standup/settings — auth/home are fine as defaults
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

  useEffect(()=>{ const p=new URLSearchParams(window.location.search); const inv=p.get('invite'); if(inv)setInviteToken(inv); },[]);

  useEffect(()=>{
    if(!SB.IS_LIVE){ setView('home'); return; }

    // Get session — handles Google OAuth redirect return (code in URL)
    SB.getSession().then(s=>{
      if(s){ setSession(s); setView(v=>v==='auth'?'home':v); }
    });

    if(SB.supabase){
      const {data:{subscription}} = SB.supabase.auth.onAuthStateChange((event, s)=>{
        if(event==='SIGNED_OUT'){
          setSession(null); setTeam(null); setMyRole('member'); setView('auth');
          try{ localStorage.removeItem('ss-team'); localStorage.removeItem('ss-role'); localStorage.removeItem('ss-view'); }catch(e){}
        } else if(s?.session){
          // Any event with a valid session — update session and go to home if on auth page
          // This covers: SIGNED_IN (normal + Google), INITIAL_SESSION, TOKEN_REFRESHED
          setSession(s.session);
          if(event==='SIGNED_IN' || event==='INITIAL_SESSION'){
            setView(v=>v==='auth'?'home':v);
          }
        }
        // No session + not SIGNED_OUT = token refresh in progress, ignore completely
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

  const handleAddTask=useCallback(async(d)=>{ if(!SB.IS_LIVE){setTasks(p=>[...p,{id:'demo_'+Date.now(),...d,created_at:new Date().toISOString()}]);return;} await SB.addTask({...d,standup_id:standup?.id}); },[standup]);
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
      {(session||!SB.IS_LIVE)&&view==='standup'&&isManager&&<ManagerView session={session||{user:{email:userForView.email,user_metadata:{name:userForView.name}}}} team={team||{id:'demo',name:'xtransmatrix',standup_name:'Supa Daily Standup'}} tasks={tasks} members={members} history={history} standup={standup} onStatus={handleStatus} onPriority={handlePriority} onNote={handleNote} onAddTask={handleAddTask} onBack={()=>{setHomeKey(k=>k+1);setView('home');}} onSettings={()=>setView('settings')} onLogout={handleLogout} emailBusy={emailBusy} onDigest={handleDigest} onEOD={handleEOD} messages={messages} onSendMessage={handleSendMessage} chatTheme={chatTheme} onChangeTheme={setChatTheme} setMembers={setMembers}/>}
      {(session||!SB.IS_LIVE)&&view==='standup'&&!isManager&&<MemberView user={userForView} myMember={myMember} tasks={tasks} onAdd={handleAddTask} onStatus={handleStatus} onBlocker={handleBlocker} onBack={()=>{setHomeKey(k=>k+1);setView('home');}} onSettings={()=>setView('settings')} session={session||{user:{email:userForView.email,user_metadata:{name:userForView.name}}}} members={members} messages={messages} onSendMessage={handleSendMessage} chatTheme={chatTheme} onChangeTheme={setChatTheme}/>}
    </ThemeCtx.Provider>
  );
}
