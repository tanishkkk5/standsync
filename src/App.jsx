import { useState, useEffect, useCallback, useMemo, useRef, createContext, useContext } from 'react';
import * as SB from './lib/supabase';
import * as Email from './lib/email';
import { getPriority, getStatus, PRIORITIES, STATUSES, MEMBER_COLORS, TODAY, FAQ } from './lib/constants';

// ─── THEME ────────────────────────────────────────────────────────────────────
const ThemeCtx = createContext({ dark: true, toggle: () => {} });
const useTheme = () => useContext(ThemeCtx);
function useC() {
  const { dark } = useTheme();
  return dark ? {
    bg:'#060412', grad:'linear-gradient(150deg,#060412 0%,#0C0820 40%,#081428 100%)',
    surf:'rgba(255,255,255,.055)', surfH:'rgba(255,255,255,.085)',
    bord:'rgba(255,255,255,.1)', bordH:'rgba(255,255,255,.2)',
    text:'#fff', sub:'rgba(255,255,255,.55)', mut:'rgba(255,255,255,.35)',
    nav:'rgba(6,4,18,.85)', inp:'rgba(255,255,255,.07)', inpB:'rgba(255,255,255,.12)',
    sel:'rgba(20,17,60,.95)', row:'rgba(255,255,255,.025)', dark:true,
  } : {
    bg:'#F1F5F9', grad:'linear-gradient(150deg,#E0E7FF 0%,#F0F4FF 50%,#EEF2FF 100%)',
    surf:'rgba(255,255,255,.9)', surfH:'#fff',
    bord:'rgba(99,102,241,.15)', bordH:'rgba(99,102,241,.4)',
    text:'#1E1B4B', sub:'#4338CA', mut:'#6B7280',
    nav:'rgba(240,244,255,.93)', inp:'rgba(255,255,255,.9)', inpB:'rgba(99,102,241,.25)',
    sel:'#fff', row:'rgba(99,102,241,.03)', dark:false,
  };
}

// ─── GLOBAL CSS ───────────────────────────────────────────────────────────────
const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;-webkit-font-smoothing:antialiased}
@keyframes orb{from{transform:translate(0,0) scale(1)}to{transform:translate(14px,18px) scale(1.07)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes pulse{0%,100%{transform:scale(1);opacity:.4}50%{transform:scale(1.6);opacity:.7}}
@keyframes slideIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
input,select,textarea,button{font-family:inherit}
::-webkit-scrollbar{width:5px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:rgba(128,128,128,.2);border-radius:3px}
`;

// ─── PRIMITIVES ───────────────────────────────────────────────────────────────
function Logo({ size=32, onClick }) {
  return (
    <div onClick={onClick} style={{ display:'flex', alignItems:'center', gap:9, cursor:onClick?'pointer':'default' }}>
      <div style={{ width:size, height:size, borderRadius:size*.28, background:'linear-gradient(135deg,#6366F1,#818CF8)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 0 18px rgba(99,102,241,.4)', flexShrink:0 }}>
        <svg width={size*.55} height={size*.55} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
        </svg>
      </div>
      <span style={{ fontSize:size*.56, fontWeight:800, color:'#fff', letterSpacing:'-.025em', lineHeight:1 }}>StandSync</span>
    </div>
  );
}

function Av({ member, size=36, url }) {
  const color = member?.color || '#818CF8';
  const ini = member?.name ? member.name.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase() : '?';
  if (url) return <img src={url} alt={ini} style={{ width:size, height:size, borderRadius:'50%', objectFit:'cover', flexShrink:0, border:`2px solid ${color}55` }}/>;
  return <div style={{ width:size, height:size, borderRadius:'50%', background:color+'20', border:`2px solid ${color}55`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:size*.32, fontWeight:700, color, flexShrink:0 }}>{ini}</div>;
}

function PBadge({ priority }) {
  const p = getPriority(priority);
  return <span style={{ fontSize:10, fontWeight:700, letterSpacing:'.06em', background:p.bg, color:p.color, padding:'3px 8px', borderRadius:20, textTransform:'uppercase', border:`1px solid ${p.color}35`, whiteSpace:'nowrap' }}>{p.label}</span>;
}
function SBadge({ status }) {
  const s = getStatus(status);
  return <span style={{ fontSize:10, fontWeight:700, letterSpacing:'.06em', background:s.bg, color:s.color, padding:'3px 8px', borderRadius:20, textTransform:'uppercase', border:`1px solid ${s.color}35`, whiteSpace:'nowrap' }}>{s.label}</span>;
}

function Card({ children, style={}, onClick }) {
  const c = useC();
  const [h, setH] = useState(false);
  return (
    <div onClick={onClick} onMouseEnter={() => onClick && setH(true)} onMouseLeave={() => setH(false)}
      style={{ background:h?c.surfH:c.surf, backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', border:`1px solid ${h&&onClick?c.bordH:c.bord}`, borderRadius:16, transition:'all .2s', cursor:onClick?'pointer':undefined, ...style }}>
      {children}
    </div>
  );
}

function Bar({ pct, color='#818CF8', h=6, style={} }) {
  return (
    <div style={{ height:h, background:'rgba(128,128,128,.15)', borderRadius:h, overflow:'hidden', ...style }}>
      <div style={{ height:'100%', width:`${Math.min(100,Math.max(0,pct))}%`, background:color, borderRadius:h, transition:'width .6s ease' }}/>
    </div>
  );
}

function Inp({ label, error, style={}, ...p }) {
  const c = useC();
  const [f, setF] = useState(false);
  return (
    <div style={{ width:'100%' }}>
      {label && <div style={{ fontSize:11, fontWeight:600, color:c.mut, textTransform:'uppercase', letterSpacing:'.08em', marginBottom:6 }}>{label}</div>}
      <input {...p}
        style={{ width:'100%', background:c.inp, border:`1.5px solid ${f?'#6366F1':error?'#EF4444':c.inpB}`, borderRadius:10, padding:'10px 14px', color:c.text, fontSize:14, outline:'none', boxSizing:'border-box', transition:'border-color .2s', ...style }}
        onFocus={e=>{setF(true);p.onFocus&&p.onFocus(e);}} onBlur={e=>{setF(false);p.onBlur&&p.onBlur(e);}}/>
      {error && <div style={{ fontSize:11, color:'#F87171', marginTop:4 }}>{error}</div>}
    </div>
  );
}

function Sel({ label, children, style={}, ...p }) {
  const c = useC();
  return (
    <div style={{ width:'100%' }}>
      {label && <div style={{ fontSize:11, fontWeight:600, color:c.mut, textTransform:'uppercase', letterSpacing:'.08em', marginBottom:6 }}>{label}</div>}
      <select {...p} style={{ width:'100%', background:c.sel, border:`1.5px solid ${c.inpB}`, borderRadius:10, padding:'10px 12px', color:c.text, fontSize:13, outline:'none', boxSizing:'border-box', cursor:'pointer', ...style }}>{children}</select>
    </div>
  );
}

function Btn({ children, v='primary', style={}, disabled, loading, ...p }) {
  const vs = {
    primary: { background:'linear-gradient(135deg,#6366F1,#818CF8)', color:'#fff', border:'none' },
    ghost:   { background:'transparent', color:'rgba(255,255,255,.6)', border:'1px solid rgba(255,255,255,.18)' },
    ghostL:  { background:'transparent', color:'#4338CA', border:'1px solid rgba(99,102,241,.3)' },
    danger:  { background:'rgba(239,68,68,.14)', color:'#F87171', border:'1px solid rgba(239,68,68,.3)' },
    warn:    { background:'rgba(245,158,11,.15)', color:'#FCD34D', border:'1px solid rgba(245,158,11,.3)' },
    success: { background:'linear-gradient(135deg,#059669,#34D399)', color:'#fff', border:'none' },
  };
  const { dark } = useTheme();
  const finalV = !dark && v === 'ghost' ? 'ghostL' : v;
  return (
    <button {...p} disabled={disabled||loading}
      style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', gap:6, padding:'10px 20px', borderRadius:10, fontSize:13, fontWeight:600, cursor:(disabled||loading)?'not-allowed':'pointer', transition:'all .15s', opacity:(disabled||loading)?.5:1, ...vs[finalV], ...style }}>
      {loading ? <div style={{ width:16, height:16, borderRadius:'50%', border:'2px solid rgba(255,255,255,.2)', borderTop:'2px solid #fff', animation:'spin .75s linear infinite' }}/> : children}
    </button>
  );
}

function Spin({ size=28, color='#818CF8' }) {
  return <div style={{ width:size, height:size, borderRadius:'50%', border:`2.5px solid rgba(128,128,128,.15)`, borderTop:`2.5px solid ${color}`, animation:'spin .75s linear infinite', flexShrink:0 }}/>;
}

function LiveDot() {
  return (
    <span style={{ position:'relative', display:'inline-block', width:8, height:8, flexShrink:0 }}>
      <span style={{ position:'absolute', inset:0, borderRadius:'50%', background:'#34D399', opacity:.4, animation:'pulse 2s ease infinite' }}/>
      <span style={{ position:'absolute', inset:1, borderRadius:'50%', background:'#34D399' }}/>
    </span>
  );
}

function ToastEl({ msg, type, onClose }) {
  const ok = type !== 'error';
  useEffect(() => { const t = setTimeout(onClose, 4000); return ()=>clearTimeout(t); }, [onClose]);
  return (
    <div style={{ position:'fixed', bottom:24, left:'50%', transform:'translateX(-50%)', background:ok?'rgba(52,211,153,.15)':'rgba(239,68,68,.15)', border:`1px solid ${ok?'rgba(52,211,153,.4)':'rgba(239,68,68,.4)'}`, borderRadius:12, padding:'11px 24px', zIndex:9999, fontSize:13, color:ok?'#34D399':'#F87171', backdropFilter:'blur(16px)', fontWeight:600, animation:'slideIn .25s ease', whiteSpace:'nowrap', display:'flex', alignItems:'center', gap:10 }}>
      {msg}<button onClick={onClose} style={{ background:'none', border:'none', color:'inherit', cursor:'pointer', opacity:.6, fontSize:16, padding:0, lineHeight:1 }}>×</button>
    </div>
  );
}

function Modal({ children, onClose, title, width=500 }) {
  const c = useC();
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.65)', backdropFilter:'blur(6px)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <Card style={{ width:'100%', maxWidth:width, padding:28, animation:'fadeUp .22s ease', maxHeight:'90vh', overflowY:'auto' }}>
        {title && <h3 style={{ margin:'0 0 20px', color:c.text, fontSize:16, fontWeight:700 }}>{title}</h3>}
        {children}
      </Card>
    </div>
  );
}

function StatCard({ label, value, color='#818CF8', sub, icon }) {
  const c = useC();
  return (
    <Card style={{ padding:'16px 20px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div>
          <div style={{ fontSize:10, color:c.mut, textTransform:'uppercase', letterSpacing:'.08em', marginBottom:6 }}>{label}</div>
          <div style={{ fontSize:28, fontWeight:800, color, letterSpacing:'-.02em', lineHeight:1 }}>{value}</div>
          {sub && <div style={{ fontSize:11, color:c.mut, marginTop:4 }}>{sub}</div>}
        </div>
        {icon && <span style={{ fontSize:22, opacity:.45 }}>{icon}</span>}
      </div>
    </Card>
  );
}

function Lbl({ children, style={} }) {
  const c = useC();
  return <div style={{ fontSize:10, fontWeight:700, letterSpacing:'.1em', color:c.mut, textTransform:'uppercase', marginBottom:8, ...style }}>{children}</div>;
}

function BgEl() {
  const { dark } = useTheme();
  if (!dark) return <div style={{ position:'fixed', inset:0, zIndex:0, pointerEvents:'none', background:'linear-gradient(150deg,#E0E7FF 0%,#F0F4FF 50%,#EEF2FF 100%)' }}><div style={{ position:'absolute', inset:0, opacity:.04, backgroundImage:'radial-gradient(circle at 1px 1px,#6366F1 1px,transparent 0)', backgroundSize:'44px 44px' }}/></div>;
  const orbs = [{w:560,h:560,top:'-130px',left:'-90px',c:'#3730A3',d:9},{w:420,h:420,top:'25%',right:'-70px',c:'#0C4A6E',d:13},{w:300,h:300,bottom:'8%',left:'12%',c:'#581C87',d:11},{w:240,h:240,top:'60%',right:'16%',c:'#064E3B',d:15}];
  return (
    <div style={{ position:'fixed', inset:0, zIndex:0, overflow:'hidden', pointerEvents:'none' }}>
      <div style={{ position:'absolute', inset:0, background:'linear-gradient(150deg,#060412 0%,#0C0820 35%,#081428 70%,#060C1C 100%)' }}/>
      {orbs.map((o,i) => <div key={i} style={{ position:'absolute', width:o.w, height:o.h, borderRadius:'50%', background:`radial-gradient(circle,${o.c}30,transparent 70%)`, top:o.top, left:o.left, right:o.right, bottom:o.bottom, animation:`orb ${o.d}s ease-in-out infinite alternate`, animationDelay:`${i*1.5}s` }}/>)}
      <div style={{ position:'absolute', inset:0, opacity:.022, backgroundImage:'radial-gradient(circle at 1px 1px,white 1px,transparent 0)', backgroundSize:'48px 48px' }}/>
    </div>
  );
}

// ─── AUTH PAGES ───────────────────────────────────────────────────────────────
function AuthPage({ onLogin, inviteToken }) {
  const c = useC();
  const [mode, setMode] = useState(inviteToken ? 'signup' : 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);

  const submit = async () => {
    setError(''); setLoading(true);
    if (mode === 'login') {
      const { data, error: e } = await SB.signIn(email, password);
      if (e) setError(e.message);
      else onLogin(data.session);
    } else if (mode === 'signup') {
      if (!name.trim()) { setError('Name is required'); setLoading(false); return; }
      const { data, error: e } = await SB.signUp(email, password, { name, invite_token: inviteToken });
      if (e) setError(e.message);
      else if (data.session) onLogin(data.session);
      else setError('Check your email to confirm your account, then log in.');
    } else {
      const { error: e } = await SB.resetPassword(email);
      if (e) setError(e.message);
      else setResetSent(true);
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:24, position:'relative', zIndex:1, animation:'fadeIn .4s ease' }}>
      <div style={{ marginBottom:40 }}><Logo size={40}/></div>
      <Card style={{ width:'100%', maxWidth:420, padding:32 }}>
        <h2 style={{ color:c.text, fontSize:22, fontWeight:700, marginBottom:6, letterSpacing:'-.02em' }}>
          {mode==='login'?'Welcome back':mode==='signup'?'Create your account':'Reset password'}
        </h2>
        <p style={{ color:c.mut, fontSize:14, marginBottom:24 }}>
          {mode==='login'?'Sign in to your StandSync account':mode==='signup'?'Join StandSync and track your standups':'Enter your email to receive a reset link'}
        </p>
        {inviteToken && mode==='signup' && <div style={{ background:'rgba(99,102,241,.12)', border:'1px solid rgba(99,102,241,.3)', borderRadius:10, padding:'10px 14px', marginBottom:18, fontSize:13, color:'#818CF8' }}>🎉 You were invited! Create an account to accept.</div>}
        {resetSent ? (
          <div style={{ textAlign:'center', padding:'20px 0' }}>
            <div style={{ fontSize:32, marginBottom:12 }}>📧</div>
            <p style={{ color:c.sub, fontSize:14 }}>Reset link sent! Check your email.</p>
            <button onClick={()=>setMode('login')} style={{ marginTop:16, color:'#818CF8', background:'none', border:'none', cursor:'pointer', fontSize:14, textDecoration:'underline' }}>Back to login</button>
          </div>
        ) : (
          <>
            {mode==='signup' && <div style={{ marginBottom:14 }}><Inp label="Your name" value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Tanisk Pandey"/></div>}
            <div style={{ marginBottom:14 }}><Inp label="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@company.com" onKeyDown={e=>e.key==='Enter'&&submit()}/></div>
            {mode!=='forgot' && <div style={{ marginBottom:20 }}><Inp label="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder={mode==='signup'?'At least 6 characters':'Your password'} onKeyDown={e=>e.key==='Enter'&&submit()}/></div>}
            {error && <div style={{ background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.25)', borderRadius:8, padding:'10px 14px', fontSize:13, color:'#F87171', marginBottom:14 }}>{error}</div>}
            <Btn onClick={submit} loading={loading} style={{ width:'100%', justifyContent:'center', padding:'12px', fontSize:15 }}>
              {mode==='login'?'Sign in':mode==='signup'?'Create account':'Send reset link'}
            </Btn>
            <div style={{ marginTop:18, textAlign:'center', fontSize:13, color:c.mut }}>
              {mode==='login' ? <>
                <button onClick={()=>setMode('forgot')} style={{ background:'none', border:'none', color:'#818CF8', cursor:'pointer', fontSize:13, textDecoration:'underline' }}>Forgot password?</button>
                <span style={{ margin:'0 8px' }}>·</span>
                <button onClick={()=>setMode('signup')} style={{ background:'none', border:'none', color:'#818CF8', cursor:'pointer', fontSize:13 }}>Create account</button>
              </> : mode==='signup' ? <>
                Already have an account?
                <button onClick={()=>setMode('login')} style={{ background:'none', border:'none', color:'#818CF8', cursor:'pointer', fontSize:13, marginLeft:4 }}>Sign in</button>
              </> : <>
                <button onClick={()=>setMode('login')} style={{ background:'none', border:'none', color:'#818CF8', cursor:'pointer', fontSize:13 }}>Back to login</button>
              </>}
            </div>
          </>
        )}
      </Card>
      <p style={{ marginTop:20, fontSize:12, color:c.mut, textAlign:'center', opacity:.6 }}>StandSync · Mon–Sat 9:00 AM standup</p>
    </div>
  );
}

// ─── HOME — choose team ────────────────────────────────────────────────────────
function HomeView({ session, onSelectTeam, onCreateTeam, onLogout, onSettings }) {
  const c = useC();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const name = session?.user?.user_metadata?.name || session?.user?.email?.split('@')[0] || 'there';

  useEffect(() => {
    if (!SB.IS_LIVE) { setLoading(false); return; }
    SB.getMyTeams(session.user.id).then(data => { setTeams(data); setLoading(false); });
  }, [session]);

  const create = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    const team = await SB.createTeam(newName.trim(), session.user.id, session.user.email, name);
    if (team) { onCreateTeam(team, 'manager'); }
    setCreating(false);
  };

  return (
    <div style={{ minHeight:'100vh', position:'relative', zIndex:1, animation:'fadeIn .35s ease' }}>
      <div style={{ borderBottom:`1px solid ${c.bord}`, background:c.nav, backdropFilter:'blur(24px)', position:'sticky', top:0, zIndex:100 }}>
        <div style={{ maxWidth:800, margin:'0 auto', padding:'0 24px', height:58, display:'flex', alignItems:'center', gap:12 }}>
          <Logo size={28}/>
          <div style={{ flex:1 }}/>
          <ThemeToggle/>
          <Btn v="ghost" onClick={onSettings} style={{ padding:'6px 12px', fontSize:12 }}>⚙️ Settings</Btn>
          <Btn v="ghost" onClick={onLogout} style={{ padding:'6px 12px', fontSize:12 }}>Sign out</Btn>
        </div>
      </div>
      <div style={{ maxWidth:800, margin:'0 auto', padding:'40px 24px' }}>
        <h1 style={{ fontSize:26, fontWeight:800, color:c.text, letterSpacing:'-.025em', marginBottom:6 }}>Good morning, {name} 👋</h1>
        <p style={{ color:c.mut, fontSize:15, marginBottom:32 }}>Choose a team to enter, or create a new one.</p>
        {loading ? <div style={{ display:'flex', justifyContent:'center', padding:40 }}><Spin/></div> : (
          <>
            {!SB.IS_LIVE && (
              <div style={{ background:'rgba(245,158,11,.1)', border:'1px solid rgba(245,158,11,.3)', borderRadius:12, padding:'14px 18px', marginBottom:24, fontSize:13, color:'#FCD34D' }}>
                ⚡ Demo mode — configure Supabase to enable real login and data persistence
              </div>
            )}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:14, marginBottom:20 }}>
              {teams.map(tm => (
                <Card key={tm.team_id} onClick={() => onSelectTeam(tm.teams, tm.role)} style={{ padding:'20px 22px', cursor:'pointer' }}>
                  <div style={{ width:44, height:44, borderRadius:12, background:'linear-gradient(135deg,#6366F1,#818CF8)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:14, fontSize:20 }}>⚡</div>
                  <div style={{ fontSize:16, fontWeight:700, color:c.text, marginBottom:4 }}>{tm.teams?.name}</div>
                  <div style={{ fontSize:12, color:c.mut, textTransform:'capitalize' }}>{tm.role}</div>
                </Card>
              ))}
              <Card onClick={() => setShowCreate(true)} style={{ padding:'20px 22px', cursor:'pointer', border:`1.5px dashed ${c.bord}`, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:8, minHeight:120 }}>
                <div style={{ width:36, height:36, borderRadius:'50%', background:'rgba(99,102,241,.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>+</div>
                <div style={{ fontSize:13, color:c.sub, fontWeight:600 }}>Create new team</div>
              </Card>
            </div>
          </>
        )}
      </div>
      {showCreate && (
        <Modal onClose={() => setShowCreate(false)} title="Create a new team">
          <Inp label="Team name" value={newName} onChange={e=>setNewName(e.target.value)} placeholder="e.g. xtransmatrix · product team" onKeyDown={e=>e.key==='Enter'&&create()} style={{ marginBottom:18 }}/>
          <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
            <Btn v="ghost" onClick={() => setShowCreate(false)}>Cancel</Btn>
            <Btn onClick={create} loading={creating} disabled={!newName.trim()}>Create team</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── THEME TOGGLE ─────────────────────────────────────────────────────────────
function ThemeToggle() {
  const { dark, toggle } = useTheme();
  return (
    <button onClick={toggle} style={{ width:38, height:38, borderRadius:'50%', border:'1px solid rgba(128,128,128,.2)', background:'transparent', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, transition:'all .2s' }} title={dark?'Switch to light mode':'Switch to dark mode'}>
      {dark ? '☀️' : '🌙'}
    </button>
  );
}

// ─── MEMBER TASK CARD ─────────────────────────────────────────────────────────
function MemberTaskCard({ task, user, onStatus, onBlocker }) {
  const c = useC();
  const [showB, setShowB] = useState(false);
  const [btext, setBtext] = useState(task.blocker || '');
  const s = getStatus(task.status);
  const next = { 'todo':'in-progress', 'in-progress':'done', 'done':'todo', 'blocked':'in-progress' };
  const nLabel = { 'todo':'▶ Start', 'in-progress':'✓ Mark done', 'done':'↺ Reopen', 'blocked':'↺ Unblock' };
  return (
    <Card style={{ marginBottom:10, overflow:'hidden', border:task.status==='blocked'?'1px solid rgba(239,68,68,.35)':task.status==='done'?'1px solid rgba(52,211,153,.25)':`1px solid ${c.bord}` }}>
      <div style={{ padding:'14px 16px' }}>
        <div style={{ display:'flex', alignItems:'flex-start', gap:10, marginBottom:6 }}>
          <button onClick={() => onStatus(task.id, next[task.status])} style={{ width:22, height:22, borderRadius:'50%', flexShrink:0, marginTop:1, border:`2px solid ${task.status==='done'?'#34D399':'rgba(128,128,128,.3)'}`, background:task.status==='done'?'#34D399':'transparent', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'all .2s' }}>
            {task.status==='done' && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          </button>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:14, color:task.status==='done'?c.mut:c.text, textDecoration:task.status==='done'?'line-through':'none', lineHeight:1.4, marginBottom:6 }}>{task.title}</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
              <PBadge priority={task.priority}/>
              <SBadge status={task.status}/>
              {task.timeline && <span style={{ fontSize:10, color:c.mut, background:'rgba(128,128,128,.1)', padding:'3px 8px', borderRadius:20 }}>🕐 {task.timeline}</span>}
            </div>
          </div>
        </div>
        {task.manager_note && <div style={{ padding:'8px 12px', background:'rgba(129,140,248,.1)', border:'1px solid rgba(129,140,248,.2)', borderRadius:8, fontSize:12, color:c.sub, marginTop:8 }}><span style={{ color:'#818CF8', fontWeight:700 }}>📌 Note: </span>{task.manager_note}</div>}
        {task.blocker && <div style={{ padding:'8px 12px', background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.25)', borderRadius:8, fontSize:12, color:'#F87171', marginTop:8 }}><span style={{ fontWeight:700 }}>⚠️ Blocker: </span>{task.blocker}</div>}
      </div>
      <div style={{ padding:'0 16px 12px', display:'flex', gap:6, flexWrap:'wrap' }}>
        <button onClick={() => onStatus(task.id, next[task.status])} style={{ fontSize:11, padding:'5px 12px', borderRadius:8, border:`1px solid ${s.color}40`, background:s.bg, color:s.color, cursor:'pointer', fontWeight:600 }}>{nLabel[task.status]}</button>
        {task.status !== 'blocked' && <button onClick={() => { onStatus(task.id,'blocked'); setShowB(true); }} style={{ fontSize:11, padding:'5px 12px', borderRadius:8, border:'1px solid rgba(239,68,68,.3)', background:'rgba(239,68,68,.08)', color:'#F87171', cursor:'pointer' }}>⚠️ Report blocker</button>}
        <button onClick={() => setShowB(!showB)} style={{ fontSize:11, padding:'5px 10px', borderRadius:8, border:`1px solid ${c.bord}`, background:'transparent', color:c.mut, cursor:'pointer', marginLeft:'auto' }}>Note</button>
      </div>
      {showB && (
        <div style={{ padding:'0 16px 14px', display:'flex', gap:8 }}>
          <input value={btext} onChange={e=>setBtext(e.target.value)} placeholder="Describe the blocker" style={{ flex:1, background:'rgba(128,128,128,.1)', border:`1px solid ${c.bord}`, borderRadius:8, padding:'8px 12px', color:c.text, fontSize:13, outline:'none' }}/>
          <Btn v="danger" onClick={() => { onBlocker(task.id, btext); setShowB(false); }} style={{ flexShrink:0, padding:'8px 14px' }}>Send</Btn>
        </div>
      )}
    </Card>
  );
}

// ─── MEMBER VIEW ──────────────────────────────────────────────────────────────
function MemberView({ user, myMember, tasks, onAdd, onStatus, onBlocker, onBack }) {
  const c = useC();
  const mine = tasks.filter(t => t.assignee_email === user.email);
  const done = mine.filter(t => t.status === 'done').length;
  const pct = mine.length ? Math.round(done/mine.length*100) : 0;
  const today = new Date().toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long' });
  const TL = ['Today noon (12 PM)','Today 3 PM','Today EOD (6 PM)','Tomorrow morning','Tomorrow EOD','This week','Custom...'];
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('medium');
  const [tl, setTl] = useState('Today EOD (6 PM)');
  const [custom, setCustom] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [notes, setNotes] = useState('');

  const submit = () => {
    if (!title.trim()) return;
    onAdd({ title:title.trim(), assignee_email:user.email, assignee_name:user.name||user.email, priority, status:'todo', timeline:showCustom?custom:tl, notes, manager_note:'', blocker:'' });
    setTitle(''); setPriority('medium'); setTl('Today EOD (6 PM)'); setNotes(''); setShowCustom(false); setCustom('');
  };
  const hTl = v => { if (v==='Custom...') { setShowCustom(true); setTl(''); } else { setShowCustom(false); setTl(v); } };
  const color = myMember?.color || '#818CF8';

  return (
    <div style={{ position:'relative', zIndex:1, minHeight:'100vh' }}>
      <div style={{ borderBottom:`1px solid ${c.bord}`, background:c.nav, backdropFilter:'blur(24px)', position:'sticky', top:0, zIndex:100 }}>
        <div style={{ maxWidth:740, margin:'0 auto', padding:'0 20px', height:56, display:'flex', alignItems:'center', gap:12 }}>
          <Logo size={26} onClick={onBack}/>
          <div style={{ flex:1 }}/>
          <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, color:c.mut }}><LiveDot/><span>Live</span></div>
          <ThemeToggle/>
          <Av member={{ ...myMember, name:user.name||user.email }} size={30} url={myMember?.avatar_url}/>
          <span style={{ fontSize:13, color:c.sub, fontWeight:500 }}>{(user.name||user.email).split(' ')[0]}</span>
          <button onClick={onBack} style={{ background:'transparent', border:`1px solid ${c.bord}`, color:c.mut, cursor:'pointer', fontSize:11, padding:'4px 10px', borderRadius:6 }}>Home</button>
        </div>
      </div>
      <div style={{ maxWidth:740, margin:'0 auto', padding:'28px 20px 60px' }}>
        <div style={{ marginBottom:24, animation:'fadeUp .35s ease' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5 }}><LiveDot/><span style={{ fontSize:11, color:'#34D399', textTransform:'uppercase', letterSpacing:'.08em', fontWeight:700 }}>Live standup · {today}</span></div>
          <h1 style={{ margin:'0 0 4px', fontSize:24, fontWeight:800, color:c.text, letterSpacing:'-.025em' }}>Good morning, {(user.name||user.email).split(' ')[0]} 👋</h1>
          <p style={{ margin:0, color:c.mut, fontSize:14, lineHeight:1.5 }}>Add the tasks assigned to you. You'll get an email reminder and an EOD alert if anything is unfinished.</p>
        </div>
        {mine.length > 0 && (
          <>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:16 }}>
              <StatCard label="Total" value={mine.length} color="#818CF8"/>
              <StatCard label="In progress" value={mine.filter(t=>t.status==='in-progress').length} color="#38BDF8"/>
              <StatCard label="Done" value={done} color="#34D399"/>
              <StatCard label="Blocked" value={mine.filter(t=>t.status==='blocked').length} color={mine.some(t=>t.status==='blocked')?'#EF4444':'#34D399'}/>
            </div>
            <Card style={{ padding:'14px 18px', marginBottom:20 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                <span style={{ fontSize:13, color:c.mut }}>Today's progress</span>
                <span style={{ fontSize:13, fontWeight:700, color }}>{pct}% · {done}/{mine.length}</span>
              </div>
              <Bar pct={pct} color={`linear-gradient(90deg,${color}88,${color})`} h={7}/>
              {pct===100 && <div style={{ marginTop:10, fontSize:13, color:'#34D399', fontWeight:600, textAlign:'center' }}>🎉 All tasks done! Great work today.</div>}
            </Card>
          </>
        )}
        <Card style={{ padding:'20px 22px', marginBottom:16, border:`1px solid ${color}30` }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
            <div style={{ width:4, height:16, borderRadius:2, background:color }}/>
            <Lbl style={{ margin:0 }}>Add a task assigned to you</Lbl>
          </div>
          <Inp value={title} onChange={e=>setTitle(e.target.value)} onKeyDown={e=>e.key==='Enter'&&submit()} placeholder="What were you assigned in the standup?" style={{ marginBottom:12 }} autoFocus/>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
            <Sel label="Priority" value={priority} onChange={e=>setPriority(e.target.value)}>
              {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </Sel>
            <Sel label="I'll finish by" value={showCustom?'Custom...':tl} onChange={e=>hTl(e.target.value)}>
              {TL.map(t => <option key={t} value={t}>{t}</option>)}
            </Sel>
          </div>
          {showCustom && <Inp value={custom} onChange={e=>setCustom(e.target.value)} placeholder="e.g. Wednesday 2 PM" style={{ marginBottom:10 }}/>}
          <Inp value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Notes or context (optional)" style={{ marginBottom:14 }}/>
          <Btn onClick={submit} disabled={!title.trim()} style={{ width:'100%', justifyContent:'center', padding:'11px', fontSize:14, background:`linear-gradient(135deg,${color}cc,${color})`, border:'none' }}>+ Submit task</Btn>
        </Card>
        {mine.length > 0 && <Lbl style={{ marginBottom:10 }}>Your tasks today ({mine.length})</Lbl>}
        {mine.map(t => <MemberTaskCard key={t.id} task={t} user={user} onStatus={onStatus} onBlocker={onBlocker}/>)}
        {mine.length === 0 && <Card style={{ padding:'40px 20px', textAlign:'center' }}><div style={{ fontSize:36, marginBottom:12 }}>📋</div><div style={{ color:c.mut, fontSize:14 }}>No tasks yet — add what was assigned to you above</div></Card>}
      </div>
    </div>
  );
}

// ─── MANAGER TABS ─────────────────────────────────────────────────────────────
function LiveTab({ tasks, members, standupId, onStatus, onPriority, onNote, onAddTask }) {
  const c = useC();
  const [fu, setFu] = useState('all');
  const [fs, setFs] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const filtered = tasks.filter(t=>fu==='all'||t.assignee_email===fu).filter(t=>fs==='all'||t.status===fs);
  const total=tasks.length, done=tasks.filter(t=>t.status==='done').length, inProg=tasks.filter(t=>t.status==='in-progress').length, blocked=tasks.filter(t=>t.status==='blocked').length, todo=tasks.filter(t=>t.status==='todo').length, pct=total?Math.round(done/total*100):0;
  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12, marginBottom:20 }}>
        <StatCard label="Total" value={total} color="#818CF8" icon="📋"/>
        <StatCard label="To do" value={todo} color="#94A3B8" icon="⭕"/>
        <StatCard label="In progress" value={inProg} color="#38BDF8" icon="⚡"/>
        <StatCard label="Done" value={done} color="#34D399" icon="✅"/>
        <StatCard label="Blocked" value={blocked} color={blocked>0?'#EF4444':'#34D399'} icon="⚠️" sub={blocked>0?'needs attention':'all clear'}/>
      </div>
      {total>0 && <Card style={{ padding:'14px 18px', marginBottom:16 }}><div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}><span style={{ fontSize:13, color:c.mut }}>Team progress</span><span style={{ fontSize:13, fontWeight:700, color:'#818CF8' }}>{pct}% · {done}/{total}</span></div><Bar pct={pct} h={8} color="linear-gradient(90deg,#6366F1,#34D399)"/></Card>}
      <Card style={{ overflow:'hidden' }}>
        <div style={{ padding:'12px 16px', borderBottom:`1px solid ${c.bord}`, display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
          <div style={{ display:'flex', gap:5, flex:1, flexWrap:'wrap' }}>
            {[{v:'all',l:'All'},...members.map(m=>({v:m.email,l:(m.name||m.email).split(' ')[0]}))].map(f=>(
              <button key={f.v} onClick={()=>setFu(f.v)} style={{ fontSize:12, padding:'5px 12px', borderRadius:20, border:`1px solid ${c.bord}`, background:fu===f.v?'rgba(129,140,248,.2)':'transparent', color:fu===f.v?'#818CF8':c.mut, cursor:'pointer', fontWeight:fu===f.v?700:400, transition:'all .15s' }}>{f.l}</button>
            ))}
          </div>
          <div style={{ display:'flex', gap:5 }}>
            {['all','todo','in-progress','done','blocked'].map(s=>(
              <button key={s} onClick={()=>setFs(s)} style={{ fontSize:11, padding:'4px 10px', borderRadius:20, border:`1px solid ${c.bord}`, background:fs===s?'rgba(128,128,128,.12)':'transparent', color:c.mut, cursor:'pointer', fontWeight:fs===s?700:400, textTransform:'capitalize' }}>{s==='all'?'All':s.replace('-',' ')}</button>
            ))}
          </div>
          <Btn onClick={()=>setShowModal(true)} style={{ padding:'7px 14px', fontSize:12, background:'linear-gradient(135deg,#6366F1,#818CF8)', border:'none', flexShrink:0 }}>+ Assign task</Btn>
        </div>
        {filtered.length===0 ? <div style={{ padding:'40px', textAlign:'center', color:c.mut, fontSize:14 }}>{total===0?'⏳ Waiting for team members to add their tasks...':'No tasks match this filter'}</div>
          : filtered.map(t=><MgrTaskRow key={t.id} task={t} members={members} onStatus={onStatus} onPriority={onPriority} onNote={onNote}/>)}
      </Card>
      {showModal && <AssignModal members={members} onClose={()=>setShowModal(false)} onAdd={onAddTask}/>}
    </div>
  );
}

function MgrTaskRow({ task, members, onStatus, onPriority, onNote }) {
  const c = useC();
  const [showN, setShowN] = useState(false);
  const [note, setNote] = useState(task.manager_note || '');
  const member = members.find(m => m.email === task.assignee_email);
  const p = getPriority(task.priority);
  const next = { 'todo':'in-progress', 'in-progress':'done', 'done':'todo', 'blocked':'todo' };
  return (
    <div style={{ borderBottom:`1px solid ${c.bord}`, transition:'background .15s' }} onMouseEnter={e=>e.currentTarget.style.background=c.row} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 16px' }}>
        <button onClick={()=>onStatus(task.id,next[task.status])} style={{ width:20, height:20, borderRadius:'50%', flexShrink:0, border:`2px solid ${task.status==='done'?'#34D399':'rgba(128,128,128,.3)'}`, background:task.status==='done'?'#34D399':'transparent', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'all .2s' }}>
          {task.status==='done'&&<svg width="9" height="9" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
        </button>
        <div style={{ width:7, height:7, borderRadius:'50%', background:p.color, flexShrink:0 }}/>
        <span style={{ flex:1, fontSize:13, color:task.status==='done'?c.mut:c.text, textDecoration:task.status==='done'?'line-through':'none', lineHeight:1.4 }}>{task.title}</span>
        {task.blocker && <span style={{ fontSize:10, color:'#F87171', background:'rgba(239,68,68,.12)', border:'1px solid rgba(239,68,68,.25)', padding:'2px 7px', borderRadius:6, whiteSpace:'nowrap' }}>⚠️ Blocked</span>}
        {task.timeline && <span style={{ fontSize:11, color:c.mut, whiteSpace:'nowrap' }}>🕐 {task.timeline}</span>}
        {member && <Av member={member} size={24} url={member.avatar_url}/>}
        <SBadge status={task.status}/>
        <select value={task.priority} onChange={e=>onPriority(task.id,e.target.value)} style={{ background:'transparent', border:'none', color:p.color, fontSize:10, cursor:'pointer', outline:'none', fontWeight:700, letterSpacing:'.05em', textTransform:'uppercase' }}>
          {['critical','high','medium','low'].map(v=><option key={v} value={v} style={{ background:c.dark?'#0D0B24':'#fff', color:c.text }}>{v}</option>)}
        </select>
        <button onClick={()=>setShowN(!showN)} style={{ background:task.manager_note?'rgba(129,140,248,.15)':'transparent', border:task.manager_note?'1px solid rgba(129,140,248,.3)':`1px solid ${c.bord}`, borderRadius:6, cursor:'pointer', padding:'3px 6px', color:task.manager_note?'#818CF8':c.mut, fontSize:12 }}>📌</button>
      </div>
      {task.blocker && <div style={{ padding:'0 16px 10px 54px' }}><div style={{ fontSize:12, color:'#F87171', background:'rgba(239,68,68,.08)', border:'1px solid rgba(239,68,68,.2)', borderRadius:8, padding:'8px 12px' }}>⚠️ {task.blocker}</div></div>}
      {showN && (
        <div style={{ padding:'0 16px 12px 54px', display:'flex', gap:8 }}>
          <input value={note} onChange={e=>setNote(e.target.value)} placeholder="Add a note visible to this member..." style={{ flex:1, background:c.inp, border:`1px solid ${c.inpB}`, borderRadius:8, padding:'8px 12px', color:c.text, fontSize:13, outline:'none' }}/>
          <Btn onClick={()=>{onNote(task.id,note);setShowN(false);}} style={{ flexShrink:0, padding:'8px 14px' }}>Save</Btn>
        </div>
      )}
    </div>
  );
}

function AssignModal({ members, onClose, onAdd }) {
  const c = useC();
  const [title, setTitle] = useState('');
  const [assignee, setAssignee] = useState(members[0]?.email || '');
  const [priority, setPriority] = useState('medium');
  const [timeline, setTimeline] = useState('Today EOD (6 PM)');
  const [note, setNote] = useState('');
  const submit = () => {
    if (!title.trim()) return;
    const m = members.find(x => x.email === assignee);
    onAdd({ title:title.trim(), assignee_email:assignee, assignee_name:m?.name||assignee, priority, status:'todo', timeline, manager_note:note, notes:'', blocker:'' });
    onClose();
  };
  return (
    <Modal onClose={onClose} title="Assign a task">
      <Inp value={title} onChange={e=>setTitle(e.target.value)} placeholder="Task description..." style={{ marginBottom:12 }} autoFocus/>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
        <Sel label="Assign to" value={assignee} onChange={e=>setAssignee(e.target.value)}>{members.map(m=><option key={m.id} value={m.email}>{m.name||m.email}</option>)}</Sel>
        <Sel label="Priority" value={priority} onChange={e=>setPriority(e.target.value)}>{['critical','high','medium','low'].map(v=><option key={v} value={v}>{v.charAt(0).toUpperCase()+v.slice(1)}</option>)}</Sel>
      </div>
      <Sel label="Timeline" value={timeline} onChange={e=>setTimeline(e.target.value)} style={{ marginBottom:10 }}>
        {['Today noon (12 PM)','Today 3 PM','Today EOD (6 PM)','Tomorrow morning','Tomorrow EOD','This week'].map(t=><option key={t} value={t}>{t}</option>)}
      </Sel>
      <Inp value={note} onChange={e=>setNote(e.target.value)} placeholder="Note to team member (optional)" style={{ marginBottom:18 }}/>
      <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
        <Btn v="ghost" onClick={onClose}>Cancel</Btn>
        <Btn onClick={submit} disabled={!title.trim()}>Assign task</Btn>
      </div>
    </Modal>
  );
}

function TeamTab({ tasks, members }) {
  const c = useC();
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:14 }}>
      {members.map(member => {
        const mt = tasks.filter(t=>t.assignee_email===member.email);
        const done=mt.filter(t=>t.status==='done').length, inProg=mt.filter(t=>t.status==='in-progress').length, blocked=mt.filter(t=>t.status==='blocked').length;
        const pct=mt.length?Math.round(done/mt.length*100):0, pc=pct===100?'#34D399':pct>=50?'#818CF8':'#F97316';
        return (
          <Card key={member.id} style={{ padding:'20px 22px', border:blocked>0?'1px solid rgba(239,68,68,.3)':`1px solid ${c.bord}` }}>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
              <Av member={member} size={44} url={member.avatar_url}/>
              <div style={{ flex:1 }}><div style={{ fontSize:14, fontWeight:700, color:c.text, marginBottom:2 }}>{member.name||member.email}</div><div style={{ fontSize:11, color:c.mut }}>{member.email}</div></div>
              <div style={{ textAlign:'right' }}><div style={{ fontSize:22, fontWeight:800, color:pc }}>{pct}%</div><div style={{ fontSize:10, color:c.mut }}>{done}/{mt.length}</div></div>
            </div>
            <Bar pct={pct} color={`linear-gradient(90deg,${member.color||'#818CF8'}80,${member.color||'#818CF8'})`} h={5} style={{ marginBottom:12 }}/>
            <div style={{ display:'flex', gap:8, marginBottom:12 }}>
              {[{l:'In prog',v:inProg,col:'#38BDF8'},{l:'Done',v:done,col:'#34D399'},{l:'Blocked',v:blocked,col:'#EF4444'}].map(s=>(
                <div key={s.l} style={{ flex:1, background:s.v>0?s.col+'15':'rgba(128,128,128,.07)', border:`1px solid ${s.v>0?s.col+'30':c.bord}`, borderRadius:8, padding:'8px 6px', textAlign:'center' }}>
                  <div style={{ fontSize:16, fontWeight:700, color:s.v>0?s.col:c.mut }}>{s.v}</div>
                  <div style={{ fontSize:9, color:c.mut, textTransform:'uppercase', letterSpacing:'.05em', marginTop:2 }}>{s.l}</div>
                </div>
              ))}
            </div>
            {mt.length===0?<div style={{ fontSize:12, color:c.mut, textAlign:'center', padding:'8px 0' }}>No tasks yet</div>:mt.slice(0,3).map(t=>(
              <div key={t.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 0', borderTop:`1px solid ${c.bord}` }}>
                <div style={{ width:6, height:6, borderRadius:'50%', background:getPriority(t.priority).color, flexShrink:0 }}/>
                <span style={{ flex:1, fontSize:12, color:t.status==='done'?c.mut:c.sub, textDecoration:t.status==='done'?'line-through':'none' }}>{t.title}</span>
                <SBadge status={t.status}/>
              </div>
            ))}
            {mt.length>3 && <div style={{ fontSize:11, color:c.mut, textAlign:'center', marginTop:8 }}>+{mt.length-3} more</div>}
            {blocked>0 && <div style={{ marginTop:10, padding:'8px 12px', background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.25)', borderRadius:8, fontSize:12, color:'#F87171' }}>⚠️ {blocked} blocked — follow up needed</div>}
          </Card>
        );
      })}
    </div>
  );
}

function PerfTab({ tasks, history, members }) {
  const c = useC();
  const allDays = useMemo(() => [...history, { id:'today', date:TODAY(), tasks }], [history, tasks]);
  const stats = useMemo(() => members.map(member => {
    const all = allDays.flatMap(d=>(d.tasks||[]).filter(t=>t.assignee_email===member.email));
    const total=all.length, done=all.filter(t=>t.status==='done').length, blocked=all.filter(t=>t.status==='blocked'||t.blocker).length;
    const rate=total?Math.round(done/total*100):0, activeDays=allDays.filter(d=>(d.tasks||[]).some(t=>t.assignee_email===member.email)).length;
    const avg=activeDays?+(total/activeDays).toFixed(1):0;
    const week=history.slice(0,7).map(d=>{const dt=(d.tasks||[]).filter(t=>t.assignee_email===member.email);if(!dt.length)return null;return{date:d.date,pct:Math.round(dt.filter(x=>x.status==='done').length/dt.length*100)};}).filter(Boolean).reverse();
    const bscore=total?Math.round((total-blocked)/total*100):100, consist=Math.min(100,Math.round(activeDays/Math.max(allDays.length,1)*100)), score=Math.round(rate*.6+consist*.2+bscore*.2);
    const grade=score>=90?'A':score>=75?'B':score>=60?'C':score>=40?'D':'F';
    const gc=score>=90?'#34D399':score>=75?'#818CF8':score>=60?'#F59E0B':'#EF4444';
    const tod=tasks.filter(t=>t.assignee_email===member.email), tdone=tod.filter(t=>t.status==='done').length;
    return { member, total, done, blocked, rate, avg, week, score, grade, gc, tod, tdone, todPct:tod.length?Math.round(tdone/tod.length*100):0 };
  }), [allDays, members, tasks, history]);
  const sorted=[...stats].sort((a,b)=>b.score-a.score), top=sorted[0];
  const totDone=stats.reduce((a,s)=>a+s.done,0), avgRate=stats.length?Math.round(stats.reduce((a,s)=>a+s.rate,0)/stats.length):0;
  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
        <StatCard label="Days tracked" value={allDays.length} color="#818CF8" icon="📅"/>
        <StatCard label="Total done" value={totDone} color="#34D399" icon="✅"/>
        <StatCard label="Avg completion" value={avgRate+'%'} color="#F472B6" icon="🎯"/>
        <StatCard label="Top performer" value={top?.member.name?.split(' ')[0]||'—'} color={top?.gc||'#818CF8'} sub={top?`Score: ${top.score}`:''} icon="🏆"/>
      </div>
      <Card style={{ padding:'18px 20px', marginBottom:20 }}>
        <Lbl>Leaderboard</Lbl>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {sorted.map((s,i) => (
            <div key={s.member.id} style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:22, fontSize:13, fontWeight:700, color:i===0?'#FCD34D':i===1?'#94A3B8':i===2?'#CD7C2E':c.mut, textAlign:'center', flexShrink:0 }}>{i===0?'🥇':i===1?'🥈':i===2?'🥉':`${i+1}`}</div>
              <Av member={s.member} size={30} url={s.member.avatar_url}/>
              <span style={{ fontSize:13, fontWeight:500, color:c.text, flex:1 }}>{s.member.name||s.member.email}</span>
              <div style={{ width:120 }}><Bar pct={s.rate} color={s.gc} h={4}/></div>
              <span style={{ fontSize:12, fontWeight:700, color:s.gc, width:36, textAlign:'right' }}>{s.rate}%</span>
              <div style={{ width:28, height:28, borderRadius:8, background:s.gc+'20', border:`1px solid ${s.gc}40`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:800, color:s.gc }}>{s.grade}</div>
            </div>
          ))}
        </div>
      </Card>
      <Lbl style={{ marginBottom:12 }}>Individual breakdown</Lbl>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:14 }}>
        {stats.map(s => (
          <Card key={s.member.id} style={{ padding:'20px 22px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
              <Av member={s.member} size={44} url={s.member.avatar_url}/>
              <div style={{ flex:1 }}><div style={{ fontSize:14, fontWeight:700, color:c.text }}>{s.member.name||s.member.email}</div></div>
              <div style={{ position:'relative', width:56, height:56, flexShrink:0 }}>
                <svg width="56" height="56" style={{ transform:'rotate(-90deg)' }}>
                  <circle cx="28" cy="28" r="20" fill="none" stroke="rgba(128,128,128,.15)" strokeWidth="4"/>
                  <circle cx="28" cy="28" r="20" fill="none" stroke={s.gc} strokeWidth="4" strokeLinecap="round" strokeDasharray={`${(s.score/100)*2*Math.PI*20} ${2*Math.PI*20}`}/>
                </svg>
                <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
                  <div style={{ fontSize:16, fontWeight:800, color:s.gc, lineHeight:1 }}>{s.grade}</div>
                  <div style={{ fontSize:9, color:c.mut, lineHeight:1 }}>{s.score}</div>
                </div>
              </div>
            </div>
            {s.tod.length>0&&(<div style={{ marginBottom:12 }}><div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}><Lbl style={{ margin:0 }}>Today</Lbl><span style={{ fontSize:11, color:s.member.color||'#818CF8', fontWeight:700 }}>{s.tdone}/{s.tod.length}</span></div><Bar pct={s.todPct} color={s.member.color||'#818CF8'} h={4}/></div>)}
            <div style={{ marginBottom:12 }}><div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}><Lbl style={{ margin:0 }}>Overall</Lbl><span style={{ fontSize:11, color:s.gc, fontWeight:700 }}>{s.rate}%</span></div><Bar pct={s.rate} color={s.gc} h={4}/></div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:12 }}>
              {[{l:'Done',v:s.done,col:'#34D399'},{l:'Avg/day',v:s.avg,col:'#818CF8'},{l:'Blockers',v:s.blocked,col:s.blocked>0?'#EF4444':'#34D399'}].map(x=>(
                <div key={x.l} style={{ background:'rgba(128,128,128,.07)', borderRadius:10, padding:10, textAlign:'center', border:`1px solid ${c.bord}` }}>
                  <div style={{ fontSize:18, fontWeight:800, color:x.col }}>{x.v}</div>
                  <div style={{ fontSize:9, color:c.mut, textTransform:'uppercase', letterSpacing:'.06em', marginTop:2 }}>{x.l}</div>
                </div>
              ))}
            </div>
            {s.week.length>0&&(<><Lbl>7-day trend</Lbl><div style={{ display:'flex', alignItems:'flex-end', gap:4, height:44 }}>{s.week.map((d,i)=>(<div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}><div style={{ width:'100%', height:Math.max(3,d.pct/100*36), borderRadius:3, background:d.pct===100?'#34D399':d.pct>=60?'#818CF8':'#F97316' }}/><div style={{ fontSize:9, color:c.mut }}>{new Date(d.date+'T12:00').toLocaleDateString('en',{weekday:'narrow'})}</div></div>))}</div></>)}
          </Card>
        ))}
      </div>
    </div>
  );
}

function HistTab({ history, members }) {
  const c = useC();
  const [open, setOpen] = useState(null);
  const fmt = d => new Date(d+'T12:00').toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  const totAll=history.reduce((a,s)=>a+(s.tasks?.length||0),0), doneAll=history.reduce((a,s)=>a+(s.tasks?.filter(t=>t.status==='done').length||0),0), avgPct=history.length?Math.round(doneAll/Math.max(totAll,1)*100):0;
  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
        <StatCard label="Standups" value={history.length} color="#818CF8" icon="📅"/>
        <StatCard label="Total tasks" value={totAll} color="#38BDF8" icon="📋"/>
        <StatCard label="Total done" value={doneAll} color="#34D399" icon="✅"/>
        <StatCard label="Avg completion" value={avgPct+'%'} color="#F472B6" icon="🎯"/>
      </div>
      {history.length===0?<Card style={{ padding:'40px', textAlign:'center' }}><div style={{ fontSize:36, marginBottom:12 }}>📅</div><div style={{ color:c.mut, fontSize:14 }}>History appears here after your first standup</div></Card>
        :history.map(s=>{
          const t=s.tasks||[],d=t.filter(x=>x.status==='done').length,b=t.filter(x=>x.status==='blocked').length,pct=t.length?Math.round(d/t.length*100):0,isOpen=open===s.id;
          return (
            <Card key={s.id} style={{ marginBottom:10, overflow:'hidden' }}>
              <button onClick={()=>setOpen(isOpen?null:s.id)} style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'14px 18px', background:'transparent', border:'none', cursor:'pointer', color:c.text }}>
                <div style={{ width:7, height:7, borderRadius:'50%', background:pct===100?'#34D399':'#818CF8', flexShrink:0 }}/>
                <span style={{ flex:1, fontSize:14, fontWeight:500, textAlign:'left' }}>{fmt(s.date)}</span>
                {b>0&&<span style={{ fontSize:11, color:'#F87171', background:'rgba(239,68,68,.12)', padding:'2px 8px', borderRadius:20 }}>⚠️ {b}</span>}
                <span style={{ fontSize:11, color:c.mut, background:'rgba(128,128,128,.1)', padding:'2px 10px', borderRadius:20 }}>{d}/{t.length} · {pct}%</span>
                <span style={{ color:c.mut, transform:isOpen?'rotate(180deg)':'none', transition:'transform .2s', fontSize:16 }}>⌃</span>
              </button>
              {isOpen && <div style={{ borderTop:`1px solid ${c.bord}` }}>{t.map(task=>{const m=members.find(x=>x.email===task.assignee_email);return(<div key={task.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 18px', borderBottom:`1px solid ${c.bord}` }}><div style={{ width:6, height:6, borderRadius:'50%', background:getPriority(task.priority).color, flexShrink:0 }}/><span style={{ flex:1, fontSize:12, color:task.status==='done'?c.mut:c.sub, textDecoration:task.status==='done'?'line-through':'none' }}>{task.title}</span>{task.timeline&&<span style={{ fontSize:10, color:c.mut }}>{task.timeline}</span>}{m&&<Av member={m} size={22}/>}<SBadge status={task.status}/></div>);})}</div>}
            </Card>
          );
        })}
    </div>
  );
}

function TeamSettingsTab({ team, members, session, onInvite }) {
  const c = useC();
  const [inviteEmail, setInviteEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const sendInvite = async () => {
    if (!inviteEmail.trim()) return;
    setSending(true);
    if (SB.IS_LIVE) {
      const name = session?.user?.user_metadata?.name || session?.user?.email;
      const { invite, link } = await SB.inviteMember(team.id, team.name, inviteEmail.trim(), name);
      await Email.sendInvite(inviteEmail.trim(), name, team.name, link);
    }
    setSent(true); setSending(false);
    setTimeout(() => { setSent(false); setInviteEmail(''); }, 3000);
    onInvite && onInvite(inviteEmail);
  };
  return (
    <div>
      <Card style={{ padding:'20px 22px', marginBottom:16 }}>
        <Lbl>Invite a team member</Lbl>
        <p style={{ fontSize:13, color:c.mut, marginBottom:14 }}>They'll receive an email with a link to join your team.</p>
        <div style={{ display:'flex', gap:10 }}>
          <Inp value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)} placeholder="colleague@company.com" onKeyDown={e=>e.key==='Enter'&&sendInvite()} style={{ flex:1 }}/>
          <Btn onClick={sendInvite} loading={sending} disabled={!inviteEmail.trim()} style={{ flexShrink:0 }}>{sent?'✓ Sent!':'Send invite'}</Btn>
        </div>
      </Card>
      <Card style={{ padding:'20px 22px' }}>
        <Lbl>Team members ({members.length})</Lbl>
        {members.map(m => (
          <div key={m.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom:`1px solid ${c.bord}` }}>
            <Av member={m} size={38} url={m.avatar_url}/>
            <div style={{ flex:1 }}><div style={{ fontSize:13, fontWeight:600, color:c.text }}>{m.name||m.email}</div><div style={{ fontSize:11, color:c.mut }}>{m.email}</div></div>
            <span style={{ fontSize:11, color:m.role==='manager'?'#818CF8':'#34D399', background:m.role==='manager'?'rgba(129,140,248,.12)':'rgba(52,211,153,.12)', padding:'3px 10px', borderRadius:20, textTransform:'capitalize' }}>{m.role}</span>
          </div>
        ))}
      </Card>
    </div>
  );
}

// ─── SETTINGS PAGE ────────────────────────────────────────────────────────────
function SettingsPage({ session, onBack, onSave }) {
  const c = useC();
  const { dark, toggle } = useTheme();
  const [tab, setTab] = useState('profile');
  const [name, setName] = useState(session?.user?.user_metadata?.name || '');
  const [avatarUrl, setAvatarUrl] = useState(session?.user?.user_metadata?.avatar_url || '');
  const [saving, setSaving] = useState(false);
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [pwErr, setPwErr] = useState('');
  const [pwOk, setPwOk] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);
  const fileRef = useRef();

  const saveProfile = async () => {
    setSaving(true);
    await SB.updateProfile({ name });
    setSaving(false);
    onSave({ name, avatar_url: avatarUrl });
  };

  const changePw = async () => {
    setPwErr('');
    if (newPw.length < 6) { setPwErr('Password must be at least 6 characters'); return; }
    setSaving(true);
    const { error } = await SB.updatePassword(newPw);
    if (error) setPwErr(error.message);
    else { setPwOk(true); setOldPw(''); setNewPw(''); setTimeout(()=>setPwOk(false),3000); }
    setSaving(false);
  };

  const handleAvatar = async (e) => {
    const file = e.target.files[0];
    if (!file || !SB.IS_LIVE) return;
    setSaving(true);
    const url = await SB.uploadAvatar(session.user.id, file);
    if (url) { setAvatarUrl(url); await SB.updateProfile({ name, avatar_url: url }); }
    setSaving(false);
  };

  const TABS = [{ id:'profile', label:'Profile', icon:'👤' },{ id:'security', label:'Security', icon:'🔒' },{ id:'appearance', label:'Appearance', icon:'🎨' },{ id:'faq', label:'FAQ', icon:'❓' }];

  return (
    <div style={{ position:'relative', zIndex:1, minHeight:'100vh' }}>
      <div style={{ borderBottom:`1px solid ${c.bord}`, background:c.nav, backdropFilter:'blur(24px)', position:'sticky', top:0, zIndex:100 }}>
        <div style={{ maxWidth:900, margin:'0 auto', padding:'0 24px', height:58, display:'flex', alignItems:'center', gap:12 }}>
          <Logo size={28} onClick={onBack}/>
          <div style={{ flex:1 }}/>
          <ThemeToggle/>
          <Btn v="ghost" onClick={onBack} style={{ padding:'6px 12px', fontSize:12 }}>← Back</Btn>
        </div>
      </div>
      <div style={{ maxWidth:900, margin:'0 auto', padding:'32px 24px 60px', display:'grid', gridTemplateColumns:'200px 1fr', gap:24 }}>
        {/* Sidebar */}
        <div>
          <div style={{ fontSize:18, fontWeight:700, color:c.text, marginBottom:20 }}>Settings</div>
          {TABS.map(t => (
            <button key={t.id} onClick={()=>setTab(t.id)} style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderRadius:10, border:'none', background:tab===t.id?'rgba(99,102,241,.15)':'transparent', color:tab===t.id?'#818CF8':c.mut, cursor:'pointer', fontSize:13, fontWeight:tab===t.id?700:400, marginBottom:4, textAlign:'left', transition:'all .15s' }}>
              <span>{t.icon}</span>{t.label}
            </button>
          ))}
        </div>
        {/* Content */}
        <div style={{ animation:'fadeIn .3s ease' }}>
          {tab === 'profile' && (
            <Card style={{ padding:'28px 28px' }}>
              <h2 style={{ fontSize:16, fontWeight:700, color:c.text, marginBottom:20 }}>Profile settings</h2>
              <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:24 }}>
                <div style={{ position:'relative' }}>
                  {avatarUrl ? <img src={avatarUrl} alt="Avatar" style={{ width:80, height:80, borderRadius:'50%', objectFit:'cover', border:'3px solid #818CF8' }}/> : <div style={{ width:80, height:80, borderRadius:'50%', background:'rgba(99,102,241,.2)', border:'3px solid #818CF8', display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, fontWeight:700, color:'#818CF8' }}>{name?name[0].toUpperCase():'?'}</div>}
                  <button onClick={()=>fileRef.current.click()} style={{ position:'absolute', bottom:0, right:0, width:26, height:26, borderRadius:'50%', background:'#6366F1', border:'2px solid #fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13 }}>✏️</button>
                  <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatar} style={{ display:'none' }}/>
                </div>
                <div>
                  <div style={{ fontSize:16, fontWeight:700, color:c.text }}>{name || session?.user?.email}</div>
                  <div style={{ fontSize:13, color:c.mut }}>{session?.user?.email}</div>
                  <button onClick={()=>fileRef.current.click()} style={{ fontSize:12, color:'#818CF8', background:'none', border:'none', cursor:'pointer', padding:0, marginTop:6 }}>Change photo</button>
                </div>
              </div>
              <Inp label="Display name" value={name} onChange={e=>setName(e.target.value)} style={{ marginBottom:16 }}/>
              <Inp label="Email" value={session?.user?.email||''} disabled style={{ marginBottom:20, opacity:.6 }}/>
              <Btn onClick={saveProfile} loading={saving}>Save changes</Btn>
            </Card>
          )}
          {tab === 'security' && (
            <Card style={{ padding:'28px 28px' }}>
              <h2 style={{ fontSize:16, fontWeight:700, color:c.text, marginBottom:20 }}>Security</h2>
              <Lbl>Change password</Lbl>
              <p style={{ fontSize:13, color:c.mut, marginBottom:16 }}>Choose a strong password of at least 6 characters.</p>
              <Inp label="New password" type="password" value={newPw} onChange={e=>setNewPw(e.target.value)} placeholder="At least 6 characters" error={pwErr} style={{ marginBottom:16 }}/>
              {pwOk && <div style={{ background:'rgba(52,211,153,.12)', border:'1px solid rgba(52,211,153,.3)', borderRadius:8, padding:'10px 14px', fontSize:13, color:'#34D399', marginBottom:14 }}>✅ Password updated successfully</div>}
              <Btn onClick={changePw} loading={saving} disabled={!newPw}>Update password</Btn>
              <div style={{ marginTop:28, paddingTop:20, borderTop:`1px solid ${c.bord}` }}>
                <Lbl>Danger zone</Lbl>
                <p style={{ fontSize:13, color:c.mut, marginBottom:12 }}>Sign out of all devices.</p>
                <Btn v="danger" onClick={() => SB.signOut()}>Sign out everywhere</Btn>
              </div>
            </Card>
          )}
          {tab === 'appearance' && (
            <Card style={{ padding:'28px 28px' }}>
              <h2 style={{ fontSize:16, fontWeight:700, color:c.text, marginBottom:20 }}>Appearance</h2>
              <div style={{ display:'flex', gap:14 }}>
                {[{ label:'Dark', icon:'🌙', isDark:true },{ label:'Light', icon:'☀️', isDark:false }].map(opt => (
                  <div key={opt.label} onClick={() => opt.isDark !== dark && toggle()} style={{ flex:1, padding:'20px', borderRadius:14, border:`2px solid ${dark===opt.isDark?'#6366F1':c.bord}`, background:dark===opt.isDark?'rgba(99,102,241,.12)':c.surf, cursor:'pointer', textAlign:'center', transition:'all .2s' }}>
                    <div style={{ fontSize:32, marginBottom:10 }}>{opt.icon}</div>
                    <div style={{ fontSize:14, fontWeight:600, color:c.text }}>{opt.label} mode</div>
                    {dark===opt.isDark && <div style={{ fontSize:11, color:'#818CF8', marginTop:4 }}>✓ Active</div>}
                  </div>
                ))}
              </div>
            </Card>
          )}
          {tab === 'faq' && (
            <Card style={{ padding:'28px 28px' }}>
              <h2 style={{ fontSize:16, fontWeight:700, color:c.text, marginBottom:20 }}>Frequently asked questions</h2>
              {FAQ.map((item, i) => (
                <div key={i} style={{ borderBottom:`1px solid ${c.bord}`, padding:'14px 0' }}>
                  <button onClick={() => setOpenFaq(openFaq===i?null:i)} style={{ width:'100%', display:'flex', justifyContent:'space-between', alignItems:'center', background:'none', border:'none', cursor:'pointer', color:c.text, fontSize:14, fontWeight:600, textAlign:'left', gap:12 }}>
                    <span>{item.q}</span>
                    <span style={{ transform:openFaq===i?'rotate(180deg)':'none', transition:'transform .2s', color:c.mut, fontSize:18, flexShrink:0 }}>⌃</span>
                  </button>
                  {openFaq===i && <p style={{ fontSize:13, color:c.mut, lineHeight:1.6, marginTop:10, marginBottom:0 }}>{item.a}</p>}
                </div>
              ))}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── MANAGER VIEW ─────────────────────────────────────────────────────────────
const MGR_TABS = [{ id:'live', label:'Live board', icon:'⚡' },{ id:'team', label:'Team view', icon:'👥' },{ id:'perf', label:'Performance', icon:'📊' },{ id:'hist', label:'History', icon:'📅' },{ id:'tset', label:'Team settings', icon:'⚙️' }];

function ManagerView({ session, team, myRole, tasks, members, history, standup, onStatus, onPriority, onNote, onAddTask, onBack, onSettings, emailBusy, onDigest, onEOD }) {
  const c = useC();
  const [tab, setTab] = useState('live');
  const blocked = tasks.filter(t => t.status === 'blocked').length;
  const name = session?.user?.user_metadata?.name || session?.user?.email?.split('@')[0] || 'Manager';
  const myMember = members.find(m => m.user_id === session?.user?.id);

  return (
    <div style={{ position:'relative', zIndex:1, minHeight:'100vh' }}>
      <div style={{ borderBottom:`1px solid ${c.bord}`, background:c.nav, backdropFilter:'blur(24px)', position:'sticky', top:0, zIndex:100 }}>
        <div style={{ maxWidth:1160, margin:'0 auto', padding:'0 24px', height:58, display:'flex', alignItems:'center', gap:12 }}>
          <Logo size={28} onClick={onBack}/>
          <nav style={{ display:'flex', gap:2, flex:1 }}>
            {MGR_TABS.map(t => (
              <button key={t.id} onClick={()=>setTab(t.id)} style={{ padding:'6px 12px', borderRadius:8, border:'none', background:tab===t.id?'rgba(129,140,248,.18)':'transparent', color:tab===t.id?'#818CF8':c.mut, cursor:'pointer', fontSize:12, fontWeight:tab===t.id?700:400, display:'flex', alignItems:'center', gap:5, transition:'all .15s' }}>
                <span>{t.icon}</span>{t.label}
              </button>
            ))}
          </nav>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            {blocked>0 && <div style={{ fontSize:12, color:'#F87171', background:'rgba(239,68,68,.12)', border:'1px solid rgba(239,68,68,.25)', padding:'4px 10px', borderRadius:8, fontWeight:700 }}>⚠️ {blocked} blocked</div>}
            <Btn v="ghost" onClick={onDigest} loading={emailBusy} style={{ padding:'6px 11px', fontSize:12 }}>📧 Digest</Btn>
            <Btn v="warn" onClick={onEOD} loading={emailBusy} style={{ padding:'6px 11px', fontSize:12 }}>🕕 EOD</Btn>
            <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, color:c.mut }}><LiveDot/><span>Live</span></div>
            <ThemeToggle/>
            <Av member={{ ...myMember, name }} size={30} url={myMember?.avatar_url}/>
            <button onClick={onSettings} style={{ background:'transparent', border:`1px solid ${c.bord}`, color:c.mut, cursor:'pointer', fontSize:11, padding:'4px 10px', borderRadius:6 }}>⚙️</button>
            <button onClick={onBack} style={{ background:'transparent', border:`1px solid ${c.bord}`, color:c.mut, cursor:'pointer', fontSize:11, padding:'4px 10px', borderRadius:6 }}>Home</button>
          </div>
        </div>
      </div>
      <div style={{ maxWidth:1160, margin:'0 auto', padding:'22px 24px 12px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}><LiveDot/><span style={{ fontSize:11, color:'#34D399', textTransform:'uppercase', letterSpacing:'.08em', fontWeight:700 }}>Live · {team?.name}</span></div>
        <h1 style={{ margin:'0 0 3px', fontSize:22, fontWeight:800, color:c.text, letterSpacing:'-.025em' }}>Good morning, {name.split(' ')[0]} 👋</h1>
        <p style={{ margin:0, color:c.mut, fontSize:13 }}>{members.length} members · {tasks.length} tasks today · Blocker alerts are automatic</p>
      </div>
      <div style={{ maxWidth:1160, margin:'0 auto', padding:'0 24px 48px' }}>
        {tab==='live' && <LiveTab tasks={tasks} members={members} standupId={standup?.id} onStatus={onStatus} onPriority={onPriority} onNote={onNote} onAddTask={onAddTask}/>}
        {tab==='team' && <TeamTab tasks={tasks} members={members}/>}
        {tab==='perf' && <PerfTab tasks={tasks} history={history} members={members}/>}
        {tab==='hist' && <HistTab history={history} members={members}/>}
        {tab==='tset' && <TeamSettingsTab team={team} members={members} session={session} onInvite={()=>{}}/>}
      </div>
    </div>
  );
}

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
const DEMO_TASKS = [];
const DEMO_MEMBERS = [
  { id:'dm1', user_id:'u1', email:'tanisk.pandey@xtransmatrix.com', name:'Tanisk Pandey', role:'manager', color:'#818CF8' },
  { id:'dm2', user_id:'u2', email:'deepak.nr@xtransmatrix.com',    name:'Deepak NR',      role:'member',  color:'#38BDF8' },
  { id:'dm3', user_id:'u3', email:'madhan.m@xtransmatrix.com',     name:'Madhan M',       role:'member',  color:'#34D399' },
  { id:'dm4', user_id:'u4', email:'monica@xtransmatrix.com',       name:'Monica M',       role:'member',  color:'#F472B6' },
  { id:'dm5', user_id:'u5', email:'sandhya.a@xtransmatrix.com',    name:'Sandhya A',      role:'member',  color:'#FB923C' },
  { id:'dm6', user_id:'u6', email:'zeeba.kauser@xtransmatrix.com', name:'Zeeba Kauser',   role:'member',  color:'#E879F9' },
];

export default function App() {
  const [dark, setDark] = useState(() => (localStorage.getItem('ss-theme')||'dark') === 'dark');
  const toggle = useCallback(() => setDark(d => { const n=!d; localStorage.setItem('ss-theme',n?'dark':'light'); document.body.style.background=n?'#060412':'#F1F5F9'; return n; }), []);

  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [view, setView] = useState('home'); // auth|home|standup|settings
  const [team, setTeam] = useState(null);
  const [myRole, setMyRole] = useState('member');
  const [members, setMembers] = useState(DEMO_MEMBERS);
  const [tasks, setTasks] = useState(DEMO_TASKS);
  const [standup, setStandup] = useState(null);
  const [history, setHistory] = useState([]);
  const [toast, setToast] = useState(null);
  const [emailBusy, setEmailBusy] = useState(false);
  const [inviteToken, setInviteToken] = useState(null);

  const showToast = useCallback((msg, type='success') => { setToast({ msg, type }); }, []);

  // Check for invite token in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const inv = params.get('invite');
    if (inv) setInviteToken(inv);
  }, []);

  // Auth state
  useEffect(() => {
    if (!SB.IS_LIVE) { setAuthLoading(false); return; }
    SB.getSession().then(s => { setSession(s); setAuthLoading(false); if (s) setView('home'); else setView('auth'); });
    return SB.onAuthChange((_, s) => { setSession(s?.session||null); if (s?.session) setView('home'); else setView('auth'); });
  }, []);

  // Load standup when team selected
  useEffect(() => {
    if (!team || !SB.IS_LIVE) return;
    const load = async () => {
      const sd = await SB.getOrCreateStandup(team.id, TODAY());
      setStandup(sd);
      const [t, past, mems] = await Promise.all([SB.getTasks(sd.id), SB.getPastStandups(team.id, 30), SB.getTeamMembers(team.id)]);
      setTasks(t); setHistory(past.filter(p=>p.date!==TODAY())); setMembers(mems);
    };
    load();
  }, [team]);

  // Realtime
  useEffect(() => {
    if (!standup || !SB.IS_LIVE) return;
    return SB.subscribeToTasks(standup.id, ({ eventType, new: n, old: o }) => {
      setTasks(prev => eventType==='INSERT'?[...prev,n]:eventType==='UPDATE'?prev.map(t=>t.id===n.id?n:t):prev.filter(t=>t.id!==o.id));
    });
  }, [standup]);

  const handleAddTask = useCallback(async (taskData) => {
    if (!SB.IS_LIVE) { setTasks(p=>[...p,{id:'demo_'+Date.now(),...taskData,created_at:new Date().toISOString()}]); return; }
    await SB.addTask({ ...taskData, standup_id: standup?.id });
  }, [standup]);

  const handleStatus = useCallback(async (id, status) => {
    const upd = { status, ...(status==='done'?{completed_at:new Date().toISOString()}:{}) };
    if (!SB.IS_LIVE) { setTasks(p=>p.map(t=>t.id===id?{...t,...upd}:t)); return; }
    await SB.updateTask(id, upd);
  }, []);

  const handlePriority = useCallback(async (id, priority) => {
    if (!SB.IS_LIVE) { setTasks(p=>p.map(t=>t.id===id?{...t,priority}:t)); return; }
    await SB.updateTask(id, { priority });
  }, []);

  const handleNote = useCallback(async (id, manager_note) => {
    if (!SB.IS_LIVE) { setTasks(p=>p.map(t=>t.id===id?{...t,manager_note}:t)); return; }
    await SB.updateTask(id, { manager_note });
  }, []);

  const handleBlocker = useCallback(async (id, blocker) => {
    const upd = { status:'blocked', blocker };
    if (!SB.IS_LIVE) { setTasks(p=>p.map(t=>t.id===id?{...t,...upd}:t)); showToast('⚠️ Blocker reported'); return; }
    await SB.updateTask(id, upd);
    const task = tasks.find(t=>t.id===id);
    const manager = members.find(m=>m.role==='manager');
    if (task && manager) await Email.sendBlockerAlert(manager.email, { email:session.user.email, name:session.user.user_metadata?.name }, { ...task, blocker });
    showToast('⚠️ Blocker reported — manager notified by email');
  }, [tasks, members, session, showToast]);

  const handleDigest = useCallback(async () => {
    setEmailBusy(true);
    const myTasks = tasks;
    let sent = 0;
    for (const m of members.filter(x=>x.role!=='manager')) {
      const mt = myTasks.filter(t=>t.assignee_email===m.email);
      if (mt.length>0) { await Email.sendMorningDigest(m, mt, team?.name||'Team'); sent++; }
    }
    setEmailBusy(false);
    showToast(`📧 Morning digest sent to ${sent} team member${sent!==1?'s':''}`, sent>0?'success':'error');
  }, [tasks, members, team, showToast]);

  const handleEOD = useCallback(async () => {
    setEmailBusy(true);
    for (const m of members.filter(x=>x.role!=='manager')) {
      const pending = tasks.filter(t=>t.assignee_email===m.email&&t.status!=='done');
      if (pending.length>0) await Email.sendEODBacklog(m, pending, team?.name||'Team');
    }
    const manager = members.find(m=>m.role==='manager');
    if (manager) await Email.sendManagerSummary(manager.email, tasks, members, team?.name||'Team');
    setEmailBusy(false);
    showToast('🕕 EOD summary sent to everyone');
  }, [tasks, members, team, showToast]);

  const handleLogin = useCallback(async (sess) => {
    setSession(sess);
    if (inviteToken && SB.IS_LIVE) {
      const result = await SB.acceptInvite(inviteToken, sess.user.id, sess.user.email, sess.user.user_metadata?.name||sess.user.email);
      if (result.teamId) showToast(`✅ Joined team: ${result.teamName}`);
      window.history.replaceState({}, '', window.location.pathname);
      setInviteToken(null);
    }
    setView('home');
  }, [inviteToken, showToast]);

  const handleSelectTeam = useCallback((t, role) => {
    setTeam(t); setMyRole(role); setView('standup');
    if (!SB.IS_LIVE) { setMembers(DEMO_MEMBERS); setTasks(DEMO_TASKS); }
  }, []);

  const myMember = members.find(m => m.user_id === (session?.user?.id || 'u1'));
  const isManager = myRole === 'manager' || (!SB.IS_LIVE && true);

  useEffect(() => { document.body.style.background = dark?'#060412':'#F1F5F9'; }, [dark]);

  if (authLoading) return (
    <>
      <style>{CSS}</style>
      <BgEl/>
      <div style={{ position:'relative', zIndex:1, minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', gap:16 }}>
        <Spin size={36}/>
      </div>
    </>
  );

  return (
    <ThemeCtx.Provider value={{ dark, toggle }}>
      <style>{CSS+`select option{background:${dark?'#0D0B24':'#fff'}!important;color:${dark?'#fff':'#1E1B4B'}}input::placeholder,textarea::placeholder{color:${dark?'rgba(255,255,255,.28)':'rgba(0,0,0,.35)'}}`}</style>
      <BgEl/>
      {toast && <ToastEl msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}

      {(!SB.IS_LIVE || view==='auth') && !session && <AuthPage onLogin={handleLogin} inviteToken={inviteToken}/>}
      {(session || !SB.IS_LIVE) && view==='home' && <HomeView session={session||{user:{email:'demo@standsync.app',user_metadata:{name:'Demo User'}}}} onSelectTeam={handleSelectTeam} onCreateTeam={(t,r)=>handleSelectTeam(t,r)} onLogout={()=>{SB.signOut();setSession(null);setView('auth');}} onSettings={()=>setView('settings')}/>}
      {(session || !SB.IS_LIVE) && view==='settings' && <SettingsPage session={session||{user:{email:'demo@standsync.app',user_metadata:{name:'Demo User'}}}} onBack={()=>setView(team?'standup':'home')} onSave={(d)=>showToast('✅ Profile saved')}/>}
      {(session || !SB.IS_LIVE) && view==='standup' && isManager && (
        <ManagerView session={session||{user:{email:'tanisk.pandey@xtransmatrix.com',user_metadata:{name:'Tanisk Pandey'}}}} team={team||{id:'demo',name:'xtransmatrix'}} myRole={myRole} tasks={tasks} members={members} history={history} standup={standup} onStatus={handleStatus} onPriority={handlePriority} onNote={handleNote} onAddTask={handleAddTask} onBack={()=>setView('home')} onSettings={()=>setView('settings')} emailBusy={emailBusy} onDigest={handleDigest} onEOD={handleEOD}/>
      )}
      {(session || !SB.IS_LIVE) && view==='standup' && !isManager && (
        <MemberView user={session?.user||{email:'deepak.nr@xtransmatrix.com',user_metadata:{name:'Deepak NR'}}} myMember={myMember} tasks={tasks} onAdd={handleAddTask} onStatus={handleStatus} onBlocker={handleBlocker} onBack={()=>setView('home')}/>
      )}
    </ThemeCtx.Provider>
  );
}
