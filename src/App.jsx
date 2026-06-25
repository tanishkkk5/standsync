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
    bg:'#0A0A0A', surf:'#121212', surfH:'#181818',
    bord:'rgba(255,255,255,.09)', bordH:'rgba(0,122,255,.45)',
    text:'#FFFFFF', sub:'rgba(255,255,255,.66)', mut:'rgba(255,255,255,.44)',
    nav:'rgba(10,10,10,.7)', inp:'rgba(255,255,255,.04)', inpB:'rgba(255,255,255,.16)',
    sel:'#121212', row:'rgba(255,255,255,.02)',
    accent:'#3B9EFF', glow:'rgba(0,122,255,.18)', dark:true,
  } : {
    bg:'#FAFAFA', surf:'#FFFFFF', surfH:'#FFFFFF',
    bord:'rgba(15,18,28,.1)', bordH:'rgba(0,112,243,.45)',
    text:'#0A0A0B', sub:'#3F4147', mut:'#8A8D94',
    nav:'rgba(250,250,250,.72)', inp:'#FFFFFF', inpB:'rgba(15,18,28,.16)',
    sel:'#FFFFFF', row:'rgba(15,18,28,.025)',
    accent:'#0070F3', glow:'rgba(0,112,243,.1)', dark:false,
  };
}

const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Outfit:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
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
.ss-tip::after{content:attr(data-tip);position:absolute;top:calc(100% + 8px);left:50%;transform:translateX(-50%) scale(.88);transform-origin:top center;background:rgba(12,10,35,.97);color:#F0ECFF;font-size:11px;font-weight:600;padding:5px 11px;border-radius:8px;white-space:nowrap;pointer-events:none;opacity:0;transition:opacity .15s,transform .15s;border:1px solid rgba(0,112,243,.3);box-shadow:0 4px 16px rgba(0,0,0,.5);letter-spacing:-.01em;z-index:99999}
.ss-tip:hover::after{opacity:1;transform:translateX(-50%) scale(1)}
@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
@keyframes ssGlow{0%,100%{transform:scale(.92);opacity:.6}50%{transform:scale(1.08);opacity:1}}
.ss-home-root>*{animation:fadeUp .5s cubic-bezier(.22,1,.36,1) both}
.ss-home-root>*:nth-child(1){animation-delay:.02s}
.ss-home-root>*:nth-child(2){animation-delay:.08s}
.ss-home-root>*:nth-child(3){animation-delay:.14s}
.ss-home-root>*:nth-child(4){animation-delay:.20s}
.ss-home-root>*:nth-child(5){animation-delay:.26s}
.ss-home-root>*:nth-child(6){animation-delay:.32s}
.ss-home-root>*:nth-child(7){animation-delay:.38s}
.ss-card-hover{transition:transform .18s cubic-bezier(.22,1,.36,1),box-shadow .18s,border-color .18s}
.ss-card-hover:hover{transform:translateY(-3px)}
.ss-area-enter{animation:ssAreaEnter .34s cubic-bezier(.22,1,.36,1) both}
@keyframes ssAreaEnter{from{opacity:0;transform:translateY(10px) scale(.995)}to{opacity:1;transform:translateY(0) scale(1)}}
@media(prefers-reduced-motion:reduce){.ss-area-enter{animation:none!important}}
@media(prefers-reduced-motion:reduce){.ss-home-root>*{animation:none!important}}
input,select,textarea,button{font-family:inherit}
/* ── Emergent design language ───────────────────────────────────────── */
.font-heading{font-family:'Outfit',sans-serif;letter-spacing:-.025em}
h1,h2,h3{font-family:'Outfit',sans-serif;letter-spacing:-.022em}
.font-mono{font-family:'JetBrains Mono',monospace}
.eyebrow{font-family:'JetBrains Mono',monospace;text-transform:uppercase;letter-spacing:.18em;font-size:11px}
/* Ambient drifting blobs */
@keyframes drift-a{0%,100%{transform:translate3d(-10%,-10%,0) scale(1)}50%{transform:translate3d(10%,5%,0) scale(1.08)}}
@keyframes drift-b{0%,100%{transform:translate3d(10%,15%,0) scale(1.05)}50%{transform:translate3d(-15%,-10%,0) scale(.95)}}
@keyframes drift-c{0%,100%{transform:translate3d(0,0,0) scale(1)}50%{transform:translate3d(20%,-10%,0) scale(1.1)}}
.ambient-blob-a{animation:drift-a 28s ease-in-out infinite}
.ambient-blob-b{animation:drift-b 34s ease-in-out infinite}
.ambient-blob-c{animation:drift-c 40s ease-in-out infinite}
.blueprint-grid{background-image:linear-gradient(to right,currentColor 1px,transparent 1px),linear-gradient(to bottom,currentColor 1px,transparent 1px);background-size:28px 28px}
/* Task completion check-draw */
@keyframes draw-check{to{stroke-dashoffset:0}}
.check-path{stroke-dasharray:24;stroke-dashoffset:24;animation:draw-check .4s .05s cubic-bezier(.65,0,.35,1) forwards}
@keyframes check-burst{0%{transform:scale(.4);opacity:.55}100%{transform:scale(2.4);opacity:0}}
.check-burst{animation:check-burst .55s ease-out forwards}
@media(prefers-reduced-motion:reduce){.ambient-blob-a,.ambient-blob-b,.ambient-blob-c{animation:none}.check-path{stroke-dashoffset:0;animation:none}}
/* Tactile, springy interaction on every button + smooth global transitions */
button{transition:transform .12s cubic-bezier(.22,1,.36,1),background .15s,border-color .15s,box-shadow .15s,opacity .15s,color .15s}
button:active{transform:scale(.96)}
button:disabled:active{transform:none}
a{transition:color .15s,opacity .15s}
input,select,textarea{transition:border-color .15s,box-shadow .15s,background .15s}
input:focus,select:focus,textarea:focus{box-shadow:0 0 0 3px var(--ss-focus,rgba(0,112,243,.15))}
/* Cards & rows gently lift on hover (opt-in via .ss-lift) */
.ss-lift{transition:transform .18s cubic-bezier(.22,1,.36,1),box-shadow .18s,border-color .18s}
.ss-lift:hover{transform:translateY(-2px)}
/* Pop-in for newly mounted modals/menus */
@keyframes ssPop{0%{opacity:0;transform:scale(.97) translateY(8px)}100%{opacity:1;transform:scale(1) translateY(0)}}
.ss-pop{animation:ssPop .22s cubic-bezier(.22,1,.36,1) both}
@media(prefers-reduced-motion:reduce){button:active{transform:none}.ss-lift:hover{transform:none}.ss-pop{animation:none}}
::-webkit-scrollbar{width:4px;height:4px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:rgba(0,112,243,.25);border-radius:10px}
::-webkit-scrollbar-thumb:hover{background:rgba(0,112,243,.45)}
::selection{background:rgba(0,112,243,.3);color:inherit}
.ss-sidebar-desktop{display:block}
@media(max-width:1024px){
  .ss-home-quick{grid-template-columns:repeat(2,1fr)!important}
  .ss-home-stats{grid-template-columns:repeat(2,1fr)!important}
}
@media(max-width:900px){
  .ss-sidebar-desktop{display:none}
  .ss-burger{display:flex!important}
  .ss-create-label{display:none}
  .ss-home-mid{grid-template-columns:1fr!important}
}
@media(max-width:560px){
  .ss-home-quick{grid-template-columns:1fr!important}
  .ss-home-stats{grid-template-columns:1fr!important}
  .ss-tag-label{display:none}
}
@media(max-width:880px){
  .ss-auth-wrap{flex-direction:column!important}
  .ss-auth-hero{flex:none!important;max-width:100%!important;padding:36px 28px 20px!important}
  .ss-auth-side{padding:8px 28px 40px!important}
  .ss-auth-features{grid-template-columns:1fr 1fr!important}
}
@media(max-width:480px){
  .ss-auth-features{grid-template-columns:1fr!important}
  .ss-auth-hero h1{font-size:30px!important}
}
`;

// ─── PRIMITIVES ───────────────────────────────────────────────────────────────
// Slowly drifting ambient gradient blobs + faint grid — quietly alive behind the app.
function AmbientBackground() {
  const c = useC(); const dark = c.dark;
  const blob = (bg) => ({ position:'absolute', borderRadius:'50%', filter:'blur(120px)', background:bg });
  return (
    <div aria-hidden="true" style={{ pointerEvents:'none', position:'fixed', inset:0, zIndex:0, overflow:'hidden' }}>
      <div style={{ position:'absolute', inset:0, background:c.bg }} />
      <div className="blueprint-grid" style={{ position:'absolute', inset:0, color:c.bord, opacity:dark?.5:.6 }} />
      <div className="ambient-blob-a" style={{ ...blob(dark?'radial-gradient(circle at center, rgba(0,122,255,.22), transparent 60%)':'radial-gradient(circle at center, rgba(0,112,243,.10), transparent 60%)'), top:-160, left:-160, height:720, width:720 }} />
      <div className="ambient-blob-b" style={{ ...blob(dark?'radial-gradient(circle at center, rgba(120,80,255,.16), transparent 60%)':'radial-gradient(circle at center, rgba(120,80,255,.07), transparent 60%)'), top:'33%', right:-220, height:640, width:640 }} />
      <div className="ambient-blob-c" style={{ ...blob(dark?'radial-gradient(circle at center, rgba(16,185,129,.12), transparent 60%)':'radial-gradient(circle at center, rgba(16,185,129,.06), transparent 60%)'), bottom:-260, left:'33%', height:680, width:680 }} />
    </div>
  );
}

function Logo({ size=32, onClick, iconOnly=false }) {
  const { dark } = useTheme();
  return (
    <div onClick={onClick} style={{ display:'flex',alignItems:'center',gap:9,cursor:onClick?'pointer':'default',flexShrink:0 }}>
      <div style={{ width:size,height:size,borderRadius:size*.28,background:'linear-gradient(135deg,#0070F3,#3B9EFF)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 0 18px rgba(0,112,243,.4)',flexShrink:0 }}>
        <svg width={size*.55} height={size*.55} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
      </div>
      {!iconOnly && <span style={{ fontSize:size*.56,fontWeight:800,color:dark?'#fff':'#1E1B4B',letterSpacing:'-.025em',lineHeight:1 }}>StandSync</span>}
    </div>
  );
}
// Short notification chime via WebAudio (no asset file needed). Respects ss-sound.
let _ssAudioCtx = null;
// ── Activity event log — real, time-stamped events (not daily-recomputed state) ──
// Stored per team; auto-pruned to recent items. Each event powers a notification.
function eventsKey(teamId){ return 'ss-events-' + (teamId || 'demo'); }
function readEvents(teamId){
  // Prefer the shared (team-wide) event history if hydrated.
  const shared = sharedGetCached(teamId, '__events__');
  if (shared && Array.isArray(shared)) return shared;
  try { return JSON.parse(localStorage.getItem(eventsKey(teamId)) || '[]'); } catch { return []; }
}
function pushEvent(teamId, ev){
  try {
    const list = readEvents(teamId);
    const entry = { id: 'ev_' + Date.now() + '_' + Math.random().toString(36).slice(2,7), at: Date.now(), ...ev };
    // keep last 80 events and only the last 3 days
    const cutoff = Date.now() - 3 * 864e5;
    const next = [entry, ...list].filter(e => e.at >= cutoff).slice(0, 80);
    localStorage.setItem(eventsKey(teamId), JSON.stringify(next));
    // Mirror to the shared backend (append-only history) so teammates see it too.
    try { if (SB.logEvent && teamId) SB.logEvent(teamId, ev); } catch {}
    return entry;
  } catch { return null; }
}

// ── SHARED STORE BRIDGE ───────────────────────────────────────────────────────
// Makes browser-local features (team board, reports, spaces, attendance, notes…)
// shared across the team and historical, by mirroring each localStorage key to
// the Supabase team_store. Reads prefer the shared copy; writes go to BOTH (so
// the app still works offline / before the SQL is run). A small in-memory cache
// lets synchronous code (existing read* helpers) see shared data after hydration.
const _sharedCache = {}; // { 'teamId::storeKey': value }
function _scKey(teamId, k){ return (teamId||'demo') + '::' + k; }

// storeKey from a full localStorage key by stripping the 'ss-' prefix and teamId.
// We keep the human-readable suffix (e.g. 'teamboard', 'reports', 'attendance-2026-06-24').
function sharedSet(teamId, storeKey, value){
  _sharedCache[_scKey(teamId, storeKey)] = value;
  try { if (SB.setShared && teamId) SB.setShared(teamId, storeKey, value); } catch {}
}
function sharedGetCached(teamId, storeKey){
  const v = _sharedCache[_scKey(teamId, storeKey)];
  return v === undefined ? null : v;
}
// Hydrate the cache for a team from the backend; calls onReady when done so UI can refresh.
async function hydrateShared(teamId, onReady){
  if (!SB.getSharedByPrefix || !teamId) { onReady && onReady(false); return; }
  try {
    const all = await SB.getSharedByPrefix(teamId, ''); // all keys for this team
    Object.entries(all || {}).forEach(([k, v]) => { _sharedCache[_scKey(teamId, k)] = v; });
    onReady && onReady(true);
  } catch { onReady && onReady(false); }
}

function playChime() {
  try {
    if (localStorage.getItem('ss-sound') !== '1') return;
    _ssAudioCtx = _ssAudioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const ctx = _ssAudioCtx;
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;
    [880, 1180].forEach((freq, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = freq;
      o.connect(g); g.connect(ctx.destination);
      const t = now + i * 0.12;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.18, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      o.start(t); o.stop(t + 0.24);
    });
  } catch (e) {}
}

function Av({ member, size=36, url }) {
  const color=member?.color||'#3B9EFF';
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
      boxShadow:dark?'0 2px 20px rgba(0,0,0,.28),inset 0 1px 0 rgba(255,255,255,.04)':'0 2px 20px rgba(0,112,243,.06),inset 0 1px 0 rgba(255,255,255,.9)',
      transition:'transform .18s cubic-bezier(.22,1,.36,1),background .18s,border-color .18s,box-shadow .18s',cursor:onClick?'pointer':undefined,transform:h&&onClick?'translateY(-2px)':'none',...style
    }}>{children}</div>
  );
}
function Bar({ pct, color='#3B9EFF', h=6, style={} }) { return <div style={{ height:h,background:'rgba(128,128,128,.15)',borderRadius:h,overflow:'hidden',...style }}><div style={{ height:'100%',width:`${Math.min(100,Math.max(0,pct))}%`,background:color,borderRadius:h,transition:'width .6s ease' }}/></div>; }
function Inp({ label, error, style={}, ...p }) {
  const c=useC(); const [f,setF]=useState(false);
  return <div style={{ width:'100%' }}>{label&&<div style={{ fontSize:11,fontWeight:600,color:c.mut,textTransform:'uppercase',letterSpacing:'.08em',marginBottom:6 }}>{label}</div>}<input {...p} style={{ width:'100%',background:c.inp,border:`1.5px solid ${f?'#0070F3':error?'#EF4444':c.inpB}`,borderRadius:10,padding:'10px 14px',color:c.text,fontSize:14,outline:'none',boxSizing:'border-box',transition:'border-color .2s',...style }} onFocus={e=>{setF(true);p.onFocus&&p.onFocus(e);}} onBlur={e=>{setF(false);p.onBlur&&p.onBlur(e);}}/>{error&&<div style={{ fontSize:11,color:'#F87171',marginTop:4 }}>{error}</div>}</div>;
}
function Textarea({ label, style={}, ...p }) {
  const c=useC(); const [f,setF]=useState(false);
  return <div style={{ width:'100%' }}>{label&&<div style={{ fontSize:11,fontWeight:600,color:c.mut,textTransform:'uppercase',letterSpacing:'.08em',marginBottom:6 }}>{label}</div>}<textarea {...p} style={{ width:'100%',background:c.inp,border:`1.5px solid ${f?'#0070F3':c.inpB}`,borderRadius:10,padding:'10px 14px',color:c.text,fontSize:14,outline:'none',boxSizing:'border-box',resize:'vertical',fontFamily:'inherit',lineHeight:1.55,transition:'border-color .2s',...style }} onFocus={e=>{setF(true);p.onFocus&&p.onFocus(e);}} onBlur={e=>{setF(false);p.onBlur&&p.onBlur(e);}}/></div>;
}
function Sel({ label, children, style={}, ...p }) {
  const c=useC();
  return <div style={{ width:'100%' }}>{label&&<div style={{ fontSize:11,fontWeight:600,color:c.mut,textTransform:'uppercase',letterSpacing:'.08em',marginBottom:6 }}>{label}</div>}<select {...p} style={{ width:'100%',background:c.sel,border:`1.5px solid ${c.inpB}`,borderRadius:10,padding:'10px 12px',color:c.text,fontSize:13,outline:'none',boxSizing:'border-box',cursor:'pointer',...style }}>{children}</select></div>;
}
function Btn({ children, v='primary', style={}, disabled, loading, ...p }) {
  const { dark }=useTheme();
  const vs={
    primary:{background:'linear-gradient(135deg,#0070F3 0%,#3B9EFF 100%)',color:'#fff',border:'none',boxShadow:'0 3px 14px rgba(0,112,243,.34)'},
    ghost:{background:dark?'rgba(255,255,255,.06)':'rgba(0,112,243,.07)',color:dark?'rgba(240,236,255,.7)':'#0059C9',border:dark?'1px solid rgba(255,255,255,.1)':'1px solid rgba(0,112,243,.16)'},
    danger:{background:'rgba(239,68,68,.1)',color:'#F87171',border:'1px solid rgba(239,68,68,.2)'},
    warn:{background:'rgba(245,158,11,.1)',color:'#FCD34D',border:'1px solid rgba(245,158,11,.2)'},
    success:{background:'linear-gradient(135deg,#059669,#34D399)',color:'#fff',border:'none',boxShadow:'0 3px 12px rgba(52,211,153,.28)'},
    google:{background:'#fff',color:'#3C4043',border:'1px solid #dadce0',boxShadow:'0 1px 5px rgba(0,0,0,.1)'},
    gcal:{background:'linear-gradient(135deg,#4285F4,#34A853)',color:'#fff',border:'none'},
  };
  return <button {...p} disabled={disabled||loading} style={{ display:'inline-flex',alignItems:'center',justifyContent:'center',gap:6,padding:'10px 20px',borderRadius:10,fontSize:13,fontWeight:600,cursor:(disabled||loading)?'not-allowed':'pointer',transition:'all .15s',opacity:(disabled||loading)?.5:1,...vs[v]||vs.primary,...style }}>{loading?<div style={{ width:16,height:16,borderRadius:'50%',border:'2px solid rgba(0,0,0,.15)',borderTop:'2px solid currentColor',animation:'spin .75s linear infinite' }}/>:children}</button>;
}
function Spin({ size=28, color='#3B9EFF' }) { return <div style={{ width:size,height:size,borderRadius:'50%',border:`2.5px solid rgba(128,128,128,.15)`,borderTop:`2.5px solid ${color}`,animation:'spin .75s linear infinite',flexShrink:0 }}/>; }
function LiveDot() { return <span style={{ position:'relative',display:'inline-block',width:8,height:8,flexShrink:0 }}><span style={{ position:'absolute',inset:0,borderRadius:'50%',background:'#34D399',opacity:.4,animation:'pulse 2s ease infinite' }}/><span style={{ position:'absolute',inset:1,borderRadius:'50%',background:'#34D399' }}/></span>; }
function ToastEl({ msg, type, onClose }) {
  const ok=type!=='error';
  useEffect(()=>{ const t=setTimeout(onClose,4000); return()=>clearTimeout(t); },[onClose]);
  return <div style={{ position:'fixed',bottom:24,left:'50%',transform:'translateX(-50%)',background:ok?'rgba(52,211,153,.15)':'rgba(239,68,68,.15)',border:`1px solid ${ok?'rgba(52,211,153,.4)':'rgba(239,68,68,.4)'}`,borderRadius:12,padding:'11px 24px',zIndex:9999,fontSize:13,color:ok?'#34D399':'#F87171',backdropFilter:'blur(16px)',fontWeight:600,animation:'slideIn .25s ease',whiteSpace:'nowrap',display:'flex',alignItems:'center',gap:10 }}>{msg}<button onClick={onClose} style={{ background:'none',border:'none',color:'inherit',cursor:'pointer',opacity:.6,fontSize:16,padding:0,lineHeight:1 }}>×</button></div>;
}
function Modal({ children, onClose, title, width=500 }) {
  const c=useC();
  return <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.65)',backdropFilter:'blur(6px)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20 }} onClick={e=>e.target===e.currentTarget&&onClose()}><Card style={{ width:'100%',maxWidth:width,padding:28,animation:'ssPop .26s cubic-bezier(.22,1,.36,1) both',maxHeight:'90vh',overflowY:'auto' }}>{title&&<h3 style={{ margin:'0 0 20px',color:c.text,fontSize:16,fontWeight:700 }}>{title}</h3>}{children}</Card></div>;
}
function StatCard({ label, value, color='#3B9EFF', sub, icon }) {
  const c=useC();
  return <Card style={{ padding:'16px 20px' }}><div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start' }}><div><div className="eyebrow" style={{ color:c.mut,marginBottom:6 }}>{label}</div><div className="font-heading" style={{ fontSize:30,fontWeight:600,color,letterSpacing:'-.025em',lineHeight:1,fontVariantNumeric:'tabular-nums' }}>{value}</div>{sub&&<div style={{ fontSize:11,color:c.mut,marginTop:5,fontFamily:"'JetBrains Mono',monospace" }}>{sub}</div>}</div>{icon&&<span style={{ fontSize:22,opacity:.45 }}>{icon}</span>}</div></Card>;
}
function Lbl({ children, style={} }) { const c=useC(); return <div style={{ fontSize:10,fontWeight:700,letterSpacing:'.1em',color:c.mut,textTransform:'uppercase',marginBottom:8,...style }}>{children}</div>; }
// Reusable empty state: icon/illustration, title, explanation, primary + secondary actions, optional preview.
function EmptyState({ icon='✨', title, desc, primary, secondary, preview, children }) {
  const c=useC();
  return(
    <div style={{ maxWidth:560,margin:'0 auto',padding:'32px 0',textAlign:'center' }}>
      <div style={{ width:64,height:64,borderRadius:18,margin:'0 auto 18px',background:c.surf,border:`1px solid ${c.bord}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:30 }}>{icon}</div>
      {title&&<h2 style={{ fontSize:20,fontWeight:700,color:c.text,marginBottom:8,letterSpacing:'-.02em' }}>{title}</h2>}
      {desc&&<p style={{ fontSize:14,color:c.sub,lineHeight:1.6,marginBottom:22,maxWidth:420,marginLeft:'auto',marginRight:'auto' }}>{desc}</p>}
      {(primary||secondary)&&(
        <div style={{ display:'flex',gap:10,justifyContent:'center',marginBottom:preview?28:0,flexWrap:'wrap' }}>
          {primary&&<Btn onClick={primary.onClick} style={{ padding:'10px 22px',fontSize:14 }}>{primary.label}</Btn>}
          {secondary&&<Btn v="ghost" onClick={secondary.onClick} style={{ padding:'10px 22px',fontSize:14 }}>{secondary.label}</Btn>}
        </div>
      )}
      {preview&&<div style={{ marginTop:8,textAlign:'left' }}>{preview}</div>}
      {children}
    </div>
  );
}
function BgEl() {
  const { dark }=useTheme();
  // Premium SaaS: solid base, no glowing orbs, no gaming aesthetics.
  // Dark = #0B1020 deep navy. Light = clean off-white. One barely-there top accent only.
  const base = dark ? '#0B1020' : '#F4F6FB';
  return(
    <div style={{ position:'fixed',inset:0,zIndex:0,overflow:'hidden',pointerEvents:'none' }}>
      <div style={{ position:'absolute',inset:0,background:base }}/>
      {/* one extremely subtle top vignette for depth — no blobs, no color fog */}
      {dark && <div style={{ position:'absolute',inset:0,background:'linear-gradient(180deg,rgba(0,112,243,.04) 0%,transparent 22%)' }}/>}
    </div>
  );
}
function ThemeToggle() {
  const { dark, toggle }=useTheme(); const c=useC();
  return <button onClick={toggle} style={{ width:34,height:34,borderRadius:'50%',border:`1px solid ${c.bord}`,background:'transparent',color:c.sub,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',transition:'all .2s',flexShrink:0 }} title={dark?'Light mode':'Dark mode'}
    onMouseEnter={e=>{e.currentTarget.style.background=c.row;e.currentTarget.style.color=c.text;}} onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.color=c.sub;}}>
    {dark
      ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4.2"/><line x1="12" y1="2.5" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="21.5"/><line x1="2.5" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="21.5" y2="12"/><line x1="5.2" y1="5.2" x2="6.9" y2="6.9"/><line x1="17.1" y1="17.1" x2="18.8" y2="18.8"/><line x1="5.2" y1="18.8" x2="6.9" y2="17.1"/><line x1="17.1" y1="6.9" x2="18.8" y2="5.2"/></svg>
      : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/></svg>}
  </button>;
}

// ─── PROFILE DROPDOWN ─────────────────────────────────────────────────────────
function ProfileMenu({ session, onSettings, onLogout }) {
  const c=useC(); const [open,setOpen]=useState(false); const ref=useRef();
  const name=session?.user?.user_metadata?.name||session?.user?.email?.split('@')[0]||'You';
  const email=session?.user?.email||''; const color='#3B9EFF';
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
          {(() => {
            const ic = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };
            const icons = {
              Settings: <svg {...ic}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
              Appearance: <svg {...ic}><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.563-2.512 5.563-5.563C21.5 5.74 17.262 2 12 2z"/></svg>,
              'FAQ & Help': <svg {...ic}><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
            };
            return [{ l: 'Settings' }, { l: 'Appearance' }, { l: 'FAQ & Help' }].map(item => (
              <button key={item.l} onClick={() => { onSettings(); setOpen(false); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, border: 'none', background: 'transparent', color: c.text, cursor: 'pointer', fontSize: 13, textAlign: 'left', transition: 'background .15s' }} onMouseEnter={e => e.currentTarget.style.background = c.surfH} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <span style={{ color: c.sub, display: 'flex' }}>{icons[item.l]}</span>{item.l}
              </button>
            ));
          })()}
          <div style={{ borderTop:`1px solid ${c.bord}`,marginTop:4,paddingTop:4 }}>
            <button onClick={()=>{onLogout();setOpen(false);}} style={{ width:'100%',display:'flex',alignItems:'center',gap:10,padding:'9px 12px',borderRadius:8,border:'none',background:'transparent',color:'#F87171',cursor:'pointer',fontSize:13,textAlign:'left',transition:'background .15s' }} onMouseEnter={e=>e.currentTarget.style.background='rgba(239,68,68,.08)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
              <span style={{ display:'flex' }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg></span>Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── AUTH PAGE ────────────────────────────────────────────────────────────────
// ─── SPLASH SCREEN ────────────────────────────────────────────────────────────
function SplashScreen({ onDone }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t0 = setTimeout(() => setShow(true), 60);
    const t1 = setTimeout(() => onDone && onDone(), 2500);
    return () => { clearTimeout(t0); clearTimeout(t1); };
  }, [onDone]);
  const tagline = 'Run standups. Stay aligned.';
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18,
      background: 'radial-gradient(ellipse at 50% 40%, #1A1450 0%, #0B0A2E 45%, #050816 100%)' }}>
      {/* glow pulse */}
      <div style={{ position: 'absolute', width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,92,255,.35), transparent 70%)', filter: 'blur(40px)', animation: 'ssGlow 2.4s ease-in-out infinite' }}/>
      <div style={{ position: 'relative', transform: show ? 'scale(1)' : 'scale(.8)', opacity: show ? 1 : 0, transition: 'transform .7s cubic-bezier(.2,.8,.2,1), opacity .7s ease' }}>
        <Logo size={64}/>
      </div>
      <div style={{ position: 'relative', fontSize: 15, fontWeight: 500, letterSpacing: '.04em', color: 'rgba(255,255,255,.62)',
        opacity: show ? 1 : 0, transform: show ? 'translateY(0)' : 'translateY(8px)',
        transition: 'opacity .6s ease .7s, transform .6s ease .7s' }}>{tagline}</div>
    </div>
  );
}

// ─── ABOUT / HOW IT WORKS / CONTACT MODALS ────────────────────────────────────
function InfoModal({ which, onClose }) {
  const c = useC();
  const titles = { about: 'About StandSync', how: 'How it works', contact: 'Get in touch' };
  return (
    <Modal onClose={onClose} title={titles[which]} width={which === 'how' ? 560 : 480}>
      {which === 'about' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontSize: 14, lineHeight: 1.7, color: c.sub }}>
          <p style={{ margin: 0 }}>StandSync is one workspace for running standups, managing work, and keeping your team aligned — without juggling five different tools.</p>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: c.text, marginBottom: 6 }}>Who it's for</div>
            <p style={{ margin: 0 }}>Fast-moving teams that run daily standups and want tasks, docs, communication, and AI insights in a single place.</p>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: c.text, marginBottom: 6 }}>Our mission</div>
            <p style={{ margin: 0 }}>Cut the busywork around alignment so teams spend their energy on the work that matters.</p>
          </div>
        </div>
      )}
      {which === 'how' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {[
            ['Create workspace', 'Spin up a team space in seconds.'],
            ['Invite your team', 'Bring people in by email or Google.'],
            ['Create tasks', 'Capture work with owners and priorities.'],
            ['Run standups', 'Async or live — track progress and blockers.'],
            ['Track progress', 'See completion, workload, and what is stuck.'],
            ['Get AI insights', 'Automatic summaries and recommended actions.'],
          ].map(([t, d], i, arr) => (
            <div key={t} style={{ display: 'flex', gap: 14 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#0070F3,#3B9EFF)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
                {i < arr.length - 1 && <div style={{ width: 2, flex: 1, background: c.bord, margin: '4px 0' }}/>}
              </div>
              <div style={{ paddingBottom: 18 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: c.text }}>{t}</div>
                <div style={{ fontSize: 13, color: c.mut, marginTop: 2, lineHeight: 1.5 }}>{d}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      {which === 'contact' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontSize: 14, color: c.sub }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span style={{ fontSize: 16 }}>✉️</span> <a href="mailto:hello@standsync.app" style={{ color: c.accent, textDecoration: 'none' }}>hello@standsync.app</a></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span style={{ fontSize: 16 }}>🌐</span> <a href="https://standsync-olive.vercel.app" target="_blank" rel="noreferrer" style={{ color: c.accent, textDecoration: 'none' }}>standsync-olive.vercel.app</a></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span style={{ fontSize: 16 }}>💬</span> Support: <a href="mailto:support@standsync.app" style={{ color: c.accent, textDecoration: 'none' }}>support@standsync.app</a></div>
          <div style={{ marginTop: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: c.mut, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8 }}>Send feedback</div>
            <Textarea placeholder="Tell us what you think…" style={{ minHeight: 90 }}/>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}><Btn onClick={onClose}>Send</Btn></div>
          </div>
        </div>
      )}
    </Modal>
  );
}

function AuthPage({ onLogin, inviteToken }) {
  const c=useC(); const { dark }=useTheme(); const [mode,setMode]=useState(inviteToken?'signup':'login');
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

  const [infoModal, setInfoModal] = useState(null);

  const FEATURES = [
    { icon: '◉', title: 'Daily Standups', desc: 'Run async and live standups effortlessly.' },
    { icon: '◎', title: 'Task Management', desc: 'Track work, priorities, blockers and ownership.' },
    { icon: '✦', title: 'AI Insights', desc: 'Automatic summaries and action items.' },
    { icon: '◈', title: 'Knowledge Hub', desc: 'Docs, SOPs and decisions in one place.' },
  ];

  return (
    <div style={{ minHeight: '100vh', position: 'relative', zIndex: 1, animation: 'fadeIn .4s ease' }}>
      <div className="ss-auth-wrap" style={{ display: 'flex', minHeight: '100vh' }}>

        {/* LEFT — hero (60%) */}
        <div className="ss-auth-hero" style={{ flex: '0 0 58%', maxWidth: '58%', padding: '48px 56px', display: 'flex', flexDirection: 'column', justifyContent: 'center', boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 40 }}>
            <Logo size={32}/>
            <span style={{ fontSize: 18, fontWeight: 800, color: c.text, letterSpacing: '-.02em' }}>StandSync</span>
          </div>
          <h1 style={{ fontSize: 40, fontWeight: 800, color: c.text, letterSpacing: '-.03em', lineHeight: 1.1, margin: '0 0 18px', maxWidth: 520 }}>Run Standups. Manage Work. Stay Aligned.</h1>
          <p style={{ fontSize: 16, color: c.sub, lineHeight: 1.6, margin: '0 0 40px', maxWidth: 480 }}>StandSync brings tasks, standups, collaboration, knowledge, and AI insights into one workspace.</p>

          <div className="ss-auth-features" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, maxWidth: 540 }}>
            {FEATURES.map(f => (
              <div key={f.title} style={{ padding: '18px 20px', borderRadius: 16, background: c.surf, border: `1px solid ${c.bord}`, transition: 'transform .18s, border-color .18s' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.borderColor = c.bordH; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = c.bord; }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(124,92,255,.14)', color: '#A78BFA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, marginBottom: 12 }}>{f.icon}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: c.text, marginBottom: 4 }}>{f.title}</div>
                <div style={{ fontSize: 12.5, color: c.mut, lineHeight: 1.5 }}>{f.desc}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 22, marginTop: 40 }}>
            {[['about', 'About'], ['how', 'How it works'], ['contact', 'Contact']].map(([k, l]) => (
              <button key={k} onClick={() => setInfoModal(k)} style={{ background: 'none', border: 'none', color: c.mut, cursor: 'pointer', fontSize: 13.5, fontWeight: 500, padding: 0, transition: 'color .15s' }}
                onMouseEnter={e => e.currentTarget.style.color = c.text} onMouseLeave={e => e.currentTarget.style.color = c.mut}>{l}</button>
            ))}
          </div>
        </div>

        {/* RIGHT — auth card (40%) */}
        <div className="ss-auth-side" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 32px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 60% 40%, rgba(124,92,255,.12), transparent 60%)', pointerEvents: 'none' }}/>
          <div style={{ position: 'relative', width: '100%', maxWidth: 400, background: dark ? 'rgba(17,24,39,.72)' : 'rgba(255,255,255,.82)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: `1px solid ${c.bord}`, borderRadius: 20, padding: 32, boxShadow: '0 24px 70px rgba(0,0,0,.35)' }}>
            <h2 style={{ color: c.text, fontSize: 22, fontWeight: 700, marginBottom: 6, letterSpacing: '-.02em' }}>
              {mode === 'login' ? 'Welcome to StandSync' : mode === 'signup' ? 'Create your account' : 'Reset password'}
            </h2>
            <p style={{ color: c.mut, fontSize: 14, marginBottom: 24 }}>
              {mode === 'login' ? 'Sign in to continue' : mode === 'signup' ? 'Join and track your standups' : 'We will send a reset link'}
            </p>
            {inviteToken && mode === 'signup' && <div style={{ background: 'rgba(0,112,243,.12)', border: '1px solid rgba(0,112,243,.3)', borderRadius: 10, padding: '10px 14px', marginBottom: 18, fontSize: 13, color: '#3B9EFF' }}>🎉 You were invited! Create an account to join.</div>}
            {info && <div style={{ background: 'rgba(52,211,153,.1)', border: '1px solid rgba(52,211,153,.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#34D399', marginBottom: 14 }}>✅ {info}</div>}
            {gError && <div style={{ background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.25)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#F87171', marginBottom: 14 }}>{gError}</div>}
            {error && !gError && <div style={{ background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.25)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#F87171', marginBottom: 14 }}>{error}</div>}

            {mode !== 'forgot' && (
              <>
                <Btn v="google" onClick={signInWithGoogle} loading={gLoading} style={{ width: '100%', justifyContent: 'center', padding: '11px', fontSize: 14, marginBottom: 16, fontWeight: 600 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                  Continue with Google
                </Btn>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}><div style={{ flex: 1, height: 1, background: c.bord }}/><span style={{ fontSize: 12, color: c.mut }}>or</span><div style={{ flex: 1, height: 1, background: c.bord }}/></div>
              </>
            )}

            {mode === 'signup' && <div style={{ marginBottom: 14 }}><Inp label="Your name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Alex Johnson"/></div>}
            <div style={{ marginBottom: 14 }}><Inp label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" onKeyDown={e => e.key === 'Enter' && submit()} autoComplete="email"/></div>
            {mode !== 'forgot' && <div style={{ marginBottom: 20 }}><Inp label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={mode === 'signup' ? 'Min 6 characters' : 'Your password'} onKeyDown={e => e.key === 'Enter' && submit()} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}/></div>}
            <Btn onClick={submit} loading={loading} style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: 15 }}>
              {mode === 'login' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset link'}
            </Btn>
            <div style={{ marginTop: 18, textAlign: 'center', fontSize: 13, color: c.mut }}>
              {mode === 'login' ? <><button onClick={() => { setMode('forgot'); setGError(''); setError(''); }} style={{ background: 'none', border: 'none', color: '#3B9EFF', cursor: 'pointer', fontSize: 13, textDecoration: 'underline' }}>Forgot password?</button><span style={{ margin: '0 8px' }}>·</span><button onClick={() => { setMode('signup'); setGError(''); setError(''); }} style={{ background: 'none', border: 'none', color: '#3B9EFF', cursor: 'pointer', fontSize: 13 }}>Create account</button></>
              : mode === 'signup' ? <><span>Already have an account? </span><button onClick={() => { setMode('login'); setGError(''); setError(''); }} style={{ background: 'none', border: 'none', color: '#3B9EFF', cursor: 'pointer', fontSize: 13 }}>Sign in</button></>
              : <button onClick={() => { setMode('login'); setGError(''); setError(''); }} style={{ background: 'none', border: 'none', color: '#3B9EFF', cursor: 'pointer', fontSize: 13 }}>Back to login</button>}
            </div>
          </div>
        </div>
      </div>

      {infoModal && <InfoModal which={infoModal} onClose={() => setInfoModal(null)}/>}
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
  const greeting=(()=>{ const h=new Date().getHours(); return h<12?'Good morning':h<18?'Good afternoon':'Good evening'; })();
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
        <h1 className="font-heading" style={{ fontSize:34,fontWeight:600,color:c.text,marginBottom:4,letterSpacing:'-.03em' }}>{greeting}, {name} 👋</h1>
        <p style={{ color:c.mut,fontSize:14,marginBottom:32 }}>What would you like to do today?</p>

        {/* ── TWO-PATH CHOOSER ── */}
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:36 }}>
          {/* Path 1: Join Standup */}
          <div onClick={()=>setView('standup-entry')} style={{ padding:'28px 24px',borderRadius:16,border:`2px solid ${c.bord}`,background:c.surf,cursor:'pointer',transition:'all .2s',position:'relative',overflow:'hidden' }}
            onMouseEnter={e=>{e.currentTarget.style.borderColor='#0070F3';e.currentTarget.style.background=c.dark?'rgba(0,112,243,.08)':'rgba(0,112,243,.05)';}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=c.bord;e.currentTarget.style.background=c.surf;}}>
            <div style={{ fontSize:40,marginBottom:14 }}>⚡</div>
            <div style={{ fontSize:18,fontWeight:800,color:c.text,marginBottom:6 }}>Join Standup</div>
            <div style={{ fontSize:13,color:c.mut,lineHeight:1.6 }}>Pick today's meeting from your calendar and write tasks in real time — even in PiP mode during Google Meet.</div>
            <div style={{ marginTop:16,display:'flex',gap:6,flexWrap:'wrap' }}>
              {['📅 From calendar','✅ Write tasks','🖥️ PiP mode'].map(t=><span key={t} style={{ fontSize:11,background:'rgba(0,112,243,.1)',color:'#3B9EFF',padding:'3px 9px',borderRadius:20 }}>{t}</span>)}
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
                    <div style={{ width:38,height:38,borderRadius:10,background:'linear-gradient(135deg,#0070F3,#3B9EFF)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:18 }}>{ICONS[i%ICONS.length]}</div>
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
                    onMouseEnter={e=>{e.currentTarget.style.borderColor='#0070F3';}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor=c.bord;}}>
                    <div style={{ width:8,borderRadius:4,alignSelf:'stretch',background:ev.colorId?'#'+ev.colorId:'#0070F3',flexShrink:0 }}/>
                    <div style={{ flex:1,minWidth:0 }}>
                      <div style={{ fontSize:15,fontWeight:700,color:c.text,marginBottom:3 }}>{ev.summary||'Untitled'}</div>
                      <div style={{ fontSize:12,color:c.mut }}>{ev.start?.dateTime?new Date(ev.start.dateTime).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}):'All day'}{ev.attendees?` · ${ev.attendees.length} attendees`:''}</div>
                    </div>
                    <span style={{ fontSize:13,color:'#3B9EFF',fontWeight:600,flexShrink:0 }}>Join →</span>
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
                    onMouseEnter={e=>{e.currentTarget.style.borderColor='#0070F3';}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor=c.bord;}}>
                    <div style={{ width:32,height:32,borderRadius:9,background:'linear-gradient(135deg,#0070F3,#3B9EFF)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0 }}>{ICONS[i%ICONS.length]}</div>
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
                  <div style={{ width:48,height:48,borderRadius:14,background:'linear-gradient(135deg,#0070F3,#3B9EFF)',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:14,fontSize:22 }}>{ICONS[i%ICONS.length]}</div>
                  <div style={{ fontSize:16,fontWeight:700,color:c.text,marginBottom:3 }}>{tm.teams?.name}</div>
                  <div style={{ fontSize:12,color:c.mut,marginBottom:8 }}>{tm.role==='manager'?'Manager':'Member'} · {tm.teams?.standup_name||'Standup'}</div>
                  <span style={{ fontSize:11,background:'rgba(0,112,243,.12)',color:'#3B9EFF',padding:'3px 9px',borderRadius:20 }}>Active</span>
                </div>
                {tm.role==='manager'&&<button onClick={e=>{e.stopPropagation();if(window.confirm('Delete "'+tm.teams?.name+'"?'))deleteTeam(tm.teams?.id);}} style={{ position:'absolute',top:10,right:10,width:28,height:28,borderRadius:8,background:'rgba(239,68,68,.1)',border:'1px solid rgba(239,68,68,.2)',color:'#F87171',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13 }}>🗑</button>}
              </Card>
            ))}
            <Card onClick={()=>setView('create')} style={{ padding:'22px',cursor:'pointer',border:`1.5px dashed ${c.bord}`,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:8,minHeight:130 }}>
              <div style={{ width:38,height:38,borderRadius:'50%',background:'rgba(0,112,243,.15)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20 }}>+</div>
              <div style={{ fontSize:13,color:c.sub,fontWeight:600 }}>New team</div>
            </Card>
            <Card onClick={()=>setView('join')} style={{ padding:'22px',cursor:'pointer',border:`1.5px dashed ${c.bord}`,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:8,minHeight:130 }}>
              <div style={{ width:38,height:38,borderRadius:'50%',background:'rgba(0,112,243,.15)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20 }}>🔑</div>
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
          <div style={{ padding:'16px 20px',borderRadius:12,background:'rgba(0,112,243,.08)',border:'1px solid rgba(0,112,243,.2)',marginBottom:28,display:'flex',alignItems:'center',gap:14 }}>
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
              onMouseEnter={e=>{e.currentTarget.style.borderColor='#0070F3';}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=c.bord;}}>
              <div style={{ width:44,height:44,borderRadius:12,background:'linear-gradient(135deg,#0070F3,#3B9EFF)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0 }}>{ICONS[i%ICONS.length]}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:15,fontWeight:700,color:c.text,marginBottom:3 }}>{(tm.teams?.id?tm.teams:(tm.id?tm:tm.teams))?.name||'Team'}</div>
                <div style={{ fontSize:12,color:c.mut }}>{tm.role==='manager'?'Manager':'Member'} · {tm.teams?.standup_name||'Standup'}</div>
              </div>
              <span style={{ fontSize:13,color:'#3B9EFF',fontWeight:600 }}>Open board →</span>
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
          <div style={{ background:'rgba(0,112,243,.1)',border:'1px solid rgba(0,112,243,.3)',borderRadius:12,padding:'16px',textAlign:'center' }}>
            <div style={{ fontSize:10,color:'#3B9EFF',fontWeight:700,textTransform:'uppercase',letterSpacing:'.1em',marginBottom:8 }}>Room ID</div>
            <div style={{ fontSize:26,fontWeight:800,color:'#3B9EFF',letterSpacing:'.15em',fontFamily:'monospace' }}>{createdTeam.default_room_id||'—'}</div>
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
          {[1,2,3].map(s=><div key={s} style={{ flex:1,height:4,borderRadius:2,background:step>=s?'#0070F3':'rgba(128,128,128,.2)',transition:'background .3s' }}/>)}
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
            }} style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:6,padding:'9px 10px',borderRadius:10,border:'1px solid rgba(0,112,243,.3)',background:'rgba(0,112,243,.08)',color:'#3B9EFF',cursor:'pointer',fontSize:12,fontWeight:600 }}>
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
          <button onClick={()=>setMemberEmails(p=>[...p,''])} style={{ background:'none',border:'none',color:'#3B9EFF',cursor:'pointer',fontSize:13,fontWeight:600,marginBottom:18,padding:0 }}>+ Add another</button>
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
          <div style={{ background:'rgba(0,112,243,.08)',border:'1px solid rgba(0,112,243,.2)',borderRadius:10,padding:'11px 14px',fontSize:12,color:'#3B9EFF',marginBottom:20 }}>
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
// Assembles ALL team data the AI can answer from: tasks, attendance, performance,
// spaces, schedule. Returns both structured fields and a readable `siteData` string
// so the AI prompt can include it regardless of how ai.js consumes context.
function buildSiteContext({ teamId = 'demo', tasks = [], members = [], history = [], teamName = 'Team', userName = 'User', myTasks = [] }) {
  const day = new Date().toISOString().slice(0, 10);
  let attendance = {}, spaces = [], schedule = {};
  try { attendance = JSON.parse(localStorage.getItem('ss-attendance-' + teamId + '-' + day) || '{}'); } catch {}
  try { spaces = JSON.parse(localStorage.getItem('ss-spaces-' + teamId) || '[]'); } catch {}
  try { schedule = JSON.parse(localStorage.getItem('ss-schedule-' + teamId) || '{}'); } catch {}

  const fmtT = (ts) => ts ? new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '—';

  // Performance per member
  const perf = members.map(m => {
    const mt = tasks.filter(t => t.assignee_email === m.email);
    const done = mt.filter(t => t.status === 'done').length;
    const blocked = mt.filter(t => t.status === 'blocked').length;
    const open = mt.filter(t => t.status !== 'done').length;
    const pct = mt.length ? Math.round(done / mt.length * 100) : 0;
    return { name: m.name || m.email, role: m.role || 'member', total: mt.length, done, open, blocked, pct };
  });

  // Attendance lines
  const attLines = members.map(m => {
    const r = attendance[m.email] || {};
    const breaks = (r.breaks || []);
    const totalBreak = breaks.reduce((s, b) => s + (b.mins || 0), 0);
    const online = r.online !== false && r.lastSeen && (Date.now() - r.lastSeen) < 120000;
    const onBreak = breaks.some(b => !b.end);
    return `${m.name || m.email}: ${onBreak ? 'on break' : online ? 'online' : 'offline'}, clocked in ${fmtT(r.clockIn)}${r.clockOut ? ', out ' + fmtT(r.clockOut) : ''}, ${totalBreak}m break, last seen ${fmtT(r.lastSeen)}`;
  });

  // Schedule (today's time blocks)
  const schedLines = Object.entries(schedule)
    .filter(([, b]) => b && b.date === day)
    .map(([tid, b]) => { const t = tasks.find(x => x.id === tid); return `${t ? (t.title || t.text) : 'Task'} — ${b.start}–${b.end}${t?.assignee_name ? ' (' + t.assignee_name + ')' : ''}`; });

  // Spaces
  const spaceLines = (Array.isArray(spaces) ? spaces : []).map(s => `${s.name} [${s.key}]: ${(s.items || []).length} items, ${(s.items || []).filter(i => i.status !== 'done').length} open`);

  const taskLines = tasks.slice(0, 40).map(t => `• ${t.title || t.text} — ${t.status || 'todo'}, ${t.priority || 'med'}${t.assignee_name ? ', ' + t.assignee_name : ''}${t.timeline ? ', due ' + t.timeline : ''}${t.blocker ? ', BLOCKER: ' + t.blocker : ''}`);

  const siteData = [
    `TEAM: ${teamName}. Current user: ${userName}. Date: ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}.`,
    `MEMBERS (${members.length}): ${members.map(m => (m.name || m.email) + ' [' + (m.role || 'member') + ']').join(', ') || 'none'}.`,
    `TASKS (${tasks.length} total, ${tasks.filter(t => t.status === 'done').length} done, ${tasks.filter(t => t.status === 'blocked').length} blocked):`,
    taskLines.join('\n') || 'No tasks.',
    `PERFORMANCE: ${perf.map(p => `${p.name} ${p.pct}% (${p.done}/${p.total} done, ${p.open} open${p.blocked ? ', ' + p.blocked + ' blocked' : ''})`).join('; ') || 'n/a'}.`,
    `ATTENDANCE TODAY:\n${attLines.join('\n') || 'No attendance logged.'}`,
    `SCHEDULE TODAY:\n${schedLines.join('\n') || 'No time blocks today.'}`,
    `SPACES/PROJECTS:\n${spaceLines.join('\n') || 'No spaces.'}`,
    `STANDUP HISTORY: ${history.length} past standups recorded.`,
  ].join('\n\n');

  return { tasks, members, history, teamName, userName, myTasks, attendance, spaces, schedule, performance: perf, siteData };
}

// Local answer engine — answers questions directly from real data. Used as the
// reliable fallback whenever the AI service is unavailable or returns junk, so
// "Ask AI" always gives a useful, grounded answer instead of an error.
function answerFromData(question, ctx, reports = []) {
  const raw = (question || '').trim();
  const q = raw.toLowerCase();
  const { tasks = [], members = [], performance = [], history = [], teamName = 'Team', attendance = {}, spaces = [], myTasks = [], userName = 'you' } = ctx || {};

  // ---- shared helpers ----
  const titleOf = (t) => t.title || t.text || 'task';
  const first = (n) => (n || '').split(/[\s@]/)[0];
  const isBlocked = (t) => t.status === 'blocked' || !!t.blocker;
  const isDone = (t) => t.status === 'done';
  const isProg = (t) => t.status === 'in-progress';
  const isTodo = (t) => t.status === 'todo' || (!isDone(t) && !isProg(t) && !isBlocked(t));
  const fmtTasks = (arr, n = 10) => !arr.length ? '' : arr.slice(0, n).map(t => '\u2022 ' + titleOf(t) + (t.assignee_name ? ' \u2014 ' + first(t.assignee_name) : '') + (t.status && t.status !== 'todo' ? ' [' + t.status + ']' : '') + (t.priority && t.priority !== 'medium' ? ' (' + t.priority + ')' : '')).join('\n') + (arr.length > n ? '\n\u2026and ' + (arr.length - n) + ' more' : '');
  const tasksFor = (m) => tasks.filter(t => (t.assignee_email || '').toLowerCase() === (m.email || '').toLowerCase());
  const pctOf = (arr) => arr.length ? Math.round(arr.filter(isDone).length / arr.length * 100) : 0;

  // ---- entity detection: find ALL people named in the question (supports partial) ----
  const matchedPeople = members.filter(m => {
    const fn = (m.name || m.email || '').toLowerCase().split(/[\s@]/)[0];
    const ln = (m.name || '').toLowerCase().split(/\s+/)[1] || '';
    const handle = (m.email || '').split('@')[0].toLowerCase();
    return (fn && fn.length > 2 && q.includes(fn)) ||
           (ln && ln.length > 2 && q.includes(ln)) ||
           (handle && handle.length > 2 && q.includes(handle));
  });
  const person = matchedPeople[0] || null;

  // ---- intent detection (rich synonym sets) ----
  const has = (re) => re.test(q);
  const wantsCount    = has(/\b(how many|how much|count|number of|total|tally)/);
  const wantsBlocked  = has(/\b(blocker|blocked|stuck|blocking|impediment|waiting on)/);
  const wantsDone     = has(/\b(done|completed|finished|complete|closed|shipped|delivered)/);
  const wantsProgress = has(/\b(in progress|working on|wip|ongoing|active|currently doing|underway)/);
  const wantsTodo     = has(/\b(to ?do|pending|left|remaining|yet to|not started|backlog|outstanding|open task)/);
  const wantsOnline   = has(/\b(online|offline|present|available|here|away|on break|active now|clocked|attendance|who('?s| is) (in|here|working))/);
  const wantsFocus    = has(/\b(focus|prioriti|what should|what to do|where to start|next up|recommend)/);
  const wantsReports  = has(/\breport/);
  const wantsSpaces   = has(/\b(space|project|workspace|board)/) && !has(/team ?board/);
  const wantsHistory  = has(/\b(history|trend|past|over time|this week|last week|streak|yesterday|recent)/);
  const wantsList     = has(/\b(list|show|what are|which|give me|display|see)/);
  const wantsWho      = has(/\b(who|whose|which person|which member|assigned to)/);
  const wantsMost     = has(/\b(most|highest|top|best|busiest|leader)/);
  const wantsLeast    = has(/\b(least|fewest|lowest|worst|behind|struggling|lagging)/);
  const wantsStatus   = has(/\b(status|state|update|how('?s| is)|standing|where('?s| is))/);

  // ===== A) PERSON-SPECIFIC =====
  if (person) {
    const pt = tasksFor(person);
    const pName = person.name || first(person.email);
    const d = pt.filter(isDone), b = pt.filter(isBlocked), pr = pt.filter(isProg), td = pt.filter(isTodo);
    const p = pctOf(pt);

    // comparative across two people ("does madhan have more than tanisk")
    if (matchedPeople.length >= 2 && has(/\b(more|less|fewer|than|vs|versus|compare)\b/)) {
      const lines = matchedPeople.map(m => { const mt = tasksFor(m); return `\u2022 ${m.name || first(m.email)}: ${mt.length} tasks, ${pctOf(mt)}% done (${mt.filter(isDone).length}/${mt.length})`; });
      return `Comparison:\n\n${lines.join('\n')}`;
    }

    if (wantsBlocked) return b.length ? `${pName} has ${b.length} blocked task${b.length !== 1 ? 's' : ''}:\n\n${fmtTasks(b)}` : `${pName} has no blocked tasks right now.`;
    if (wantsDone)    return `${pName} has completed ${d.length} of ${pt.length} task${pt.length !== 1 ? 's' : ''} (${p}%).` + (d.length ? `\n\n${fmtTasks(d)}` : '');
    if (wantsProgress)return pr.length ? `${pName} is working on ${pr.length} task${pr.length !== 1 ? 's' : ''}:\n\n${fmtTasks(pr)}` : `${pName} has nothing in progress right now.`;
    if (wantsTodo)    return td.length ? `${pName} has ${td.length} task${td.length !== 1 ? 's' : ''} to do:\n\n${fmtTasks(td)}` : `${pName} has no pending to-do tasks.`;
    if (wantsOnline) {
      const r = attendance[person.email] || {};
      const onBreak = (r.breaks || []).some(x => !x.end);
      const online = r.online !== false && r.lastSeen && (Date.now() - r.lastSeen) < 120000;
      return `${pName} is currently ${onBreak ? 'on a break' : online ? 'online' : 'offline'}.`;
    }
    if (wantsList || wantsStatus || wantsCount || has(/\btasks?\b/) || wantsWho) {
      let out = `${pName} has ${pt.length} task${pt.length !== 1 ? 's' : ''} \u2014 ${d.length} done, ${pr.length} in progress, ${td.length} to do${b.length ? `, ${b.length} blocked` : ''} (${p}% complete).`;
      if (pt.length) out += `\n\n${fmtTasks(pt)}`;
      return out;
    }
    // default person summary
    let out = `${pName}: ${pt.length} task${pt.length !== 1 ? 's' : ''}, ${p}% complete (${d.length} done, ${pr.length} in progress, ${td.length} to do${b.length ? `, ${b.length} blocked` : ''}).`;
    if (pt.length) out += `\n\n${fmtTasks(pt)}`;
    return out;
  }

  // ===== B) SUPERLATIVES ("who has the most tasks / is best / is behind") =====
  if (!wantsOnline && (wantsMost || wantsLeast) && (has(/task|work|load|done|complet|blocker|progress|perform|behind|ahead/) || wantsStatus || true)) {
    const rows = members.map(m => { const mt = tasksFor(m); return { m, total: mt.length, done: mt.filter(isDone).length, blocked: mt.filter(isBlocked).length, pct: pctOf(mt) }; }).filter(r => r.total > 0);
    if (rows.length) {
      if (wantsBlocked) { const r = [...rows].sort((a,b)=>b.blocked-a.blocked)[0]; return r.blocked ? `${r.m.name || first(r.m.email)} has the most blockers (${r.blocked}).` : 'No one has any blockers right now.'; }
      if (wantsDone || has(/best|top|highest/)) { const r = [...rows].sort((a,b)=>b.pct-a.pct||b.done-a.done)[0]; return `${r.m.name || first(r.m.email)} is leading \u2014 ${r.pct}% complete (${r.done}/${r.total} done).`; }
      if (wantsLeast) { const r = [...rows].sort((a,b)=>a.pct-b.pct)[0]; return `${r.m.name || first(r.m.email)} is furthest behind \u2014 ${r.pct}% (${r.done}/${r.total} done).`; }
      // default: most tasks
      const r = [...rows].sort((a,b)=>b.total-a.total)[0];
      return `${r.m.name || first(r.m.email)} has the most tasks (${r.total}).`;
    }
  }

  // ===== C) TEAM-WIDE METRICS =====
  const done = tasks.filter(isDone), blocked = tasks.filter(isBlocked), prog = tasks.filter(isProg), todo = tasks.filter(isTodo);
  const pct = pctOf(tasks);
  const ranked = members.map(m => { const mt = tasksFor(m); return { name: m.name || first(m.email), total: mt.length, done: mt.filter(isDone).length, open: mt.filter(t=>!isDone(t)).length, blocked: mt.filter(isBlocked).length, pct: pctOf(mt) }; }).filter(r => r.total > 0).sort((a,b)=>b.pct-a.pct||b.done-a.done);

  // reports performance
  if (wantsReports && (has(/performance|how|summary|doing|using|tell/) || wantsCount)) {
    if (!reports.length) return "No reports have been submitted yet. Once your team submits daily reports, I can summarize performance, recurring blockers, and trends from them.";
    const byPerson = {}; reports.forEach(r => { const k = r.authorName || r.authorEmail; (byPerson[k] = byPerson[k] || []).push(r); });
    const totalDone = reports.reduce((s, r) => s + (r.stats?.completed || 0), 0);
    const totalBlk = reports.reduce((s, r) => s + (r.stats?.blocked || 0), 0);
    let out = `Across ${reports.length} report${reports.length !== 1 ? 's' : ''} from ${Object.keys(byPerson).length} ${Object.keys(byPerson).length !== 1 ? 'people' : 'person'}: ${totalDone} completed${totalBlk ? `, ${totalBlk} blocked` : ''}.\n\n`;
    out += Object.entries(byPerson).map(([n, rs]) => `\u2022 ${n}: ${rs.length} report${rs.length!==1?'s':''}, ${rs.reduce((s,r)=>s+(r.stats?.completed||0),0)} completed`).join('\n');
    return out;
  }

  // counts
  if (wantsCount) {
    if (wantsBlocked)  return `${blocked.length} blocked task${blocked.length !== 1 ? 's' : ''}.` + (blocked.length ? `\n\n${fmtTasks(blocked)}` : '');
    if (wantsDone)     return `${done.length} of ${tasks.length} task${tasks.length !== 1 ? 's' : ''} done (${pct}%).`;
    if (wantsProgress) return `${prog.length} task${prog.length !== 1 ? 's' : ''} in progress.` + (prog.length ? `\n\n${fmtTasks(prog)}` : '');
    if (wantsTodo)     return `${todo.length} task${todo.length !== 1 ? 's' : ''} to do.` + (todo.length ? `\n\n${fmtTasks(todo)}` : '');
    if (has(/member|people|team size|how many (are|is)/)) return `${members.length} team member${members.length !== 1 ? 's' : ''}: ${members.map(m=>m.name||first(m.email)).join(', ')}.`;
    return `${tasks.length} tasks total: ${done.length} done, ${prog.length} in progress, ${todo.length} to do, ${blocked.length} blocked.`;
  }

  if (wantsBlocked) return blocked.length ? `${blocked.length} blocked task${blocked.length !== 1 ? 's' : ''}:\n\n${blocked.map(t => '\u2022 ' + titleOf(t) + (t.assignee_name ? ' (' + first(t.assignee_name) + ')' : '') + (t.blocker ? ' \u2014 ' + t.blocker : '')).join('\n')}` : "No blockers right now \u2014 nothing is marked blocked.";
  if (wantsProgress && wantsList) return prog.length ? `In progress (${prog.length}):\n\n${fmtTasks(prog)}` : 'Nothing in progress right now.';
  if (wantsDone && wantsList)     return done.length ? `Completed (${done.length}):\n\n${fmtTasks(done)}` : 'Nothing completed yet.';
  if (wantsTodo)                  return todo.length ? `To do (${todo.length}):\n\n${fmtTasks(todo)}` : 'No pending to-do tasks.';

  if (wantsOnline) {
    const lines = members.map(m => { const r = attendance[m.email] || {}; const onBreak = (r.breaks || []).some(x => !x.end); const online = r.online !== false && r.lastSeen && (Date.now() - r.lastSeen) < 120000; return `\u2022 ${m.name || first(m.email)}: ${onBreak ? 'on break' : online ? 'online' : 'offline'}`; });
    const n = members.filter(m => { const r = attendance[m.email] || {}; return r.online !== false && r.lastSeen && (Date.now() - r.lastSeen) < 120000; }).length;
    return `${n} of ${members.length} online:\n\n${lines.join('\n')}`;
  }

  if (wantsSpaces) return spaces.length ? `Project spaces (${spaces.length}):\n\n${spaces.map(s => '\u2022 ' + (s.name || s.key) + ': ' + (s.items || []).length + ' items, ' + (s.items || []).filter(i => i.status !== 'done').length + ' open').join('\n')}` : "No project spaces yet.";

  if (wantsHistory) return history.length ? `Recent stand-ups (${history.length} on record):\n\n${history.slice(0,7).map(h => { const dt = h.tasks || []; return '\u2022 ' + h.date + ': ' + dt.filter(t=>t.status==='done').length + '/' + dt.length + ' done'; }).join('\n')}` : "No stand-up history yet \u2014 trends appear as days accumulate.";

  if (has(/performing|leaderboard|rank/) || (wantsMost && has(/perform/))) {
    if (!ranked.length) return "No task data yet to rank performance.";
    return 'Top performers:\n\n' + ranked.slice(0,5).map((p,i)=>`${i+1}. ${p.name} \u2014 ${p.pct}% (${p.done}/${p.total})`).join('\n');
  }

  if ((has(/team|overall|everyone|we|us/) && (wantsStatus || has(/doing|going|progress/))) || (wantsStatus && !person)) {
    let out = `${teamName} is at ${pct}% completion \u2014 ${done.length}/${tasks.length} done, ${prog.length} in progress${blocked.length ? `, ${blocked.length} blocked` : ''}.`;
    if (ranked.length) out += `\n\nLeading: ${ranked.slice(0, 2).map(p => p.name + ' (' + p.pct + '%)').join(', ')}.`;
    out += blocked.length ? `\n\n\u26a0\ufe0f ${blocked.length} blocker${blocked.length !== 1 ? 's need' : ' needs'} attention.` : `\n\nNo blockers \u2014 clear runway.`;
    return out;
  }

  if (wantsFocus) {
    const mine = (myTasks && myTasks.length ? myTasks : tasks).filter(t => !isDone(t));
    if (!mine.length) return "You're all caught up \u2014 no open tasks.";
    const crit = mine.filter(t => t.priority === 'critical' || t.priority === 'high');
    const mb = mine.filter(isBlocked);
    let out = '';
    if (crit.length) out += `Start with high-priority work:\n${fmtTasks(crit)}\n\n`;
    if (mb.length) out += `Unblock these:\n${fmtTasks(mb)}\n\n`;
    if (!out) out = `Here's what's open:\n${fmtTasks(mine)}`;
    return out.trim();
  }

  if (wantsList && has(/task/)) return tasks.length ? `All tasks (${tasks.length}):\n\n${fmtTasks(tasks, 20)}` : 'No tasks yet.';
  if (has(/member|who('?s| is) (on|in) (the )?team|team list/)) return members.length ? `Team (${members.length}):\n\n${members.map(m => '\u2022 ' + (m.name || first(m.email)) + (m.role ? ' \u2014 ' + m.role : '')).join('\n')}` : 'No members yet.';

  // ===== D) DEFAULT \u2014 snapshot + capability hint =====
  let out = `${teamName} \u2014 snapshot:\n\n\u2022 ${done.length} completed (${pct}%)\n\u2022 ${prog.length} in progress\n\u2022 ${todo.length} to do\n\u2022 ${blocked.length} blocked`;
  if (prog.length) out += `\n\nActively moving:\n${fmtTasks(prog, 4)}`;
  out += `\n\nTry asking: "how many tasks does [name] have", "what is [name] working on", "who has the most tasks", "any blockers", "who's online", "team status", or "this week's trend".`;
  return out;
}

function AIBubble({ tasks=[], members=[], history=[], session, myTasks=[], teamName='Team', teamId='demo' }) {
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
    try{ const msg=input.trim(); const ctx=buildSiteContext({teamId,tasks,members,history,teamName,userName:name,myTasks}); let reports=[]; try{reports=readSubmittedReports(teamId);}catch(e){} const ql=msg.toLowerCase(); const namedPerson=members.some(m=>{ const fn=(m.name||m.email||'').toLowerCase().split(/[\s@]/)[0]; const h=(m.email||'').split('@')[0].toLowerCase(); return (fn&&fn.length>2&&ql.includes(fn))||(h&&h.length>2&&ql.includes(h)); }); const factual=namedPerson||/(how many|how much|count|number of|total|task|blocker|blocked|stuck|online|offline|on break|present|available|to ?do|pending|in progress|working on|done|completed|finished|who|whose|which|list|show|most|least|highest|lowest|best|behind|status|update|trend|spaces?|projects?|members?|performance)/.test(ql); let reply=''; if(factual){ reply=answerFromData(msg,ctx,reports); } else { try{ const ai=await askAI(msg,{...ctx,reports}); reply=(typeof ai==='string'?ai:(ai?.text||'')).trim(); if(!reply||/^(sorry|try again|i can'?t|as an ai)/i.test(reply)) reply=answerFromData(msg,ctx,reports); }catch(e){ reply=answerFromData(msg,ctx,reports); } } setMsgs(p=>[...p,{id:'a'+Date.now(),role:'assistant',text:reply||answerFromData(msg,ctx,reports)}]); }
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
            ?'rgba(0,112,243,.18)'
            :'rgba(255,255,255,.55)',
          backdropFilter:'blur(20px)',
          WebkitBackdropFilter:'blur(20px)',
          border:dark?'1px solid rgba(196,181,253,.25)':'1px solid rgba(0,112,243,.2)',
          cursor:dragging?'grabbing':'grab',
          display:'flex',alignItems:'center',justifyContent:'center',
          boxShadow:dark
            ?'0 4px 24px rgba(0,112,243,.35),inset 0 1px 0 rgba(255,255,255,.1)'
            :'0 4px 24px rgba(0,112,243,.2),inset 0 1px 0 rgba(255,255,255,.8)',
          transition:dragging?'none':'box-shadow .2s',
          userSelect:'none',
        }}
      >
        {/* Minimal star/sparkle AI icon */}
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style={{ flexShrink:0 }}>
          <path d="M12 2L13.5 8.5L20 7L14.5 11.5L17 18L12 14L7 18L9.5 11.5L4 7L10.5 8.5L12 2Z"
            fill={dark?'#C4B5FD':'#0070F3'} opacity=".9"/>
          <circle cx="19" cy="4" r="1.5" fill={dark?'#A78BFA':'#3B9EFF'} opacity=".7"/>
          <circle cx="5" cy="19" r="1" fill={dark?'#A78BFA':'#3B9EFF'} opacity=".5"/>
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
          boxShadow:dark?'0 16px 56px rgba(0,0,0,.6),inset 0 1px 0 rgba(255,255,255,.05)':'0 16px 56px rgba(0,112,243,.15),inset 0 1px 0 rgba(255,255,255,.9)',
          overflow:'hidden',
          animation:'fadeUp .18s ease',
        }}>
          {/* Header */}
          <div style={{ padding:'14px 16px 12px',display:'flex',alignItems:'center',gap:10,flexShrink:0 }}>
            <div style={{ width:32,height:32,borderRadius:'50%',background:'rgba(0,112,243,.15)',border:'1px solid rgba(196,181,253,.25)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L13.5 8.5L20 7L14.5 11.5L17 18L12 14L7 18L9.5 11.5L4 7L10.5 8.5L12 2Z" fill={dark?'#C4B5FD':'#0070F3'}/>
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
                {m.role==='assistant'&&<div style={{ width:22,height:22,borderRadius:'50%',background:'rgba(0,112,243,.15)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginBottom:2 }}><svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M12 2L13.5 8.5L20 7L14.5 11.5L17 18L12 14L7 18L9.5 11.5L4 7L10.5 8.5L12 2Z" fill={dark?'#C4B5FD':'#0070F3'}/></svg></div>}
                <div style={{ maxWidth:'84%',background:m.role==='user'?'linear-gradient(135deg,#0070F3,#3B9EFF)':dark?'rgba(255,255,255,.06)':'rgba(255,255,255,.8)',color:m.role==='user'?'#fff':c.text,padding:'8px 12px',borderRadius:m.role==='user'?'14px 14px 4px 14px':'14px 14px 14px 4px',fontSize:12,lineHeight:1.55,border:m.role==='user'?'none':`1px solid ${c.bord}`,boxShadow:m.role==='assistant'?'0 1px 6px rgba(0,0,0,.06)':'none' }}>
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
            <button onClick={send} disabled={!input.trim()||loading} style={{ width:32,height:32,borderRadius:10,background:input.trim()?'linear-gradient(135deg,#0070F3,#3B9EFF)':'transparent',border:input.trim()?'none':`1px solid ${c.bord}`,color:input.trim()?'#fff':c.mut,cursor:input.trim()?'pointer':'default',display:'flex',alignItems:'center',justifyContent:'center',fontSize:15,flexShrink:0,transition:'all .15s' }}>↑</button>
          </div>
        </div>
      )}
    </>
  );
}

// ─── AI ASSISTANT PAGE ────────────────────────────────────────────────────────
// Modern AI mark — a clean four-point spark in a gradient disc (replaces the robot emoji)
function AIMark({ size=32 }) {
  return (
    <div style={{ width:size,height:size,borderRadius:'50%',background:'linear-gradient(135deg,#0070F3,#3B9EFF)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,boxShadow:'0 2px 8px rgba(0,112,243,.35)' }}>
      <svg width={size*0.56} height={size*0.56} viewBox="0 0 24 24" fill="#fff">
        <path d="M12 2c.4 3.4 2.2 5.2 5.6 5.6C14.2 8 12.4 9.8 12 13.2 11.6 9.8 9.8 8 6.4 7.6 9.8 7.2 11.6 5.4 12 2z"/>
        <path d="M18.5 13c.2 1.7 1.1 2.6 2.8 2.8-1.7.2-2.6 1.1-2.8 2.8-.2-1.7-1.1-2.6-2.8-2.8 1.7-.2 2.6-1.1 2.8-2.8z" opacity=".9"/>
      </svg>
    </div>
  );
}

function AIAssistant({ tasks=[], members=[], history=[], session, myTasks=[], teamName='Team', team=null }) {
  const c=useC();
  const teamId=team?.id||'demo';
  const [msgs,setMsgs]=useState([{id:'w',role:'assistant',text:'Hi! I am your StandSync AI assistant. Ask me anything about your tasks, team progress, blockers, performance, reports, or what to focus on today.'}]);
  const [input,setInput]=useState(''); const [loading,setLoading]=useState(false);
  const bottomRef=useRef(); const name=session?.user?.user_metadata?.name||'User';
  const done=tasks.filter(t=>t.status==='done').length;
  const pct=tasks.length?Math.round(done/tasks.length*100):0;

  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:'smooth'}); },[msgs]);

  const looksBad=(r)=>{ if(!r||typeof r!=='string')return true; const t=r.trim().toLowerCase(); if(t.length<2)return true; return /^(sorry|i (can'?t|cannot|am unable)|as an ai|i don'?t have access|try again)/.test(t); };

  const send=async(text)=>{
    const msg=text||input.trim();
    if(!msg||loading)return;
    setMsgs(p=>[...p,{id:'u'+Date.now(),role:'user',text:msg}]);
    setInput(''); setLoading(true);
    let reports=[]; try{ reports=readSubmittedReports(teamId); }catch(e){}
    const ctx=buildSiteContext({teamId,tasks,members,history,teamName,userName:name,myTasks});
    // Factual lookups (a named person, a count, a status/blocker query) are answered
    // directly from data — accurate and never hallucinated. Open-ended/advisory
    // questions try the AI first, then fall back to the data engine.
    const ql=msg.toLowerCase();
    const namedPerson=members.some(m=>{ const fn=(m.name||m.email||'').toLowerCase().split(/[\s@]/)[0]; const h=(m.email||'').split('@')[0].toLowerCase(); return (fn&&fn.length>2&&ql.includes(fn))||(h&&h.length>2&&ql.includes(h)); });
    const factual=namedPerson||/(how many|how much|count|number of|total|task|blocker|blocked|stuck|online|offline|on break|present|available|to ?do|pending|in progress|working on|done|completed|finished|who|whose|which|list|show|most|least|highest|lowest|best|behind|status|update|trend|spaces?|projects?|members?|performance)/.test(ql);
    let reply='';
    if(factual){
      reply=answerFromData(msg,ctx,reports);
    } else {
      try{
        const ai=await askAI(msg, { ...ctx, reports });
        reply=(typeof ai==='string'?ai:(ai?.text||'')).trim();
        if(looksBad(reply)) reply=answerFromData(msg,ctx,reports);
      }catch(e){
        reply=answerFromData(msg,ctx,reports);
      }
    }
    setMsgs(p=>[...p,{id:'a'+Date.now(),role:'assistant',text:reply||answerFromData(msg,ctx,reports)}]);
    setLoading(false);
  };

  const QUICK=['What should I focus on today?','How is the team doing?','Any blockers?',"Today's summary",'Who is performing best?','Team performance from reports'];

  return(
    <div style={{ display:'flex',flexDirection:'column',height:'calc(100vh - 160px)',minHeight:500,borderRadius:16,overflow:'hidden',border:`1px solid ${c.bord}` }}>
      {/* Header */}
      <div style={{ padding:'16px 20px',background:c.surf,borderBottom:`1px solid ${c.bord}`,display:'flex',alignItems:'center',gap:12,flexShrink:0 }}>
        <AIMark size={42}/>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:15,fontWeight:700,color:c.text }}>StandSync AI</div>
          <div style={{ fontSize:12,color:'#34D399' }}>● Online · grounded in your live data</div>
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontSize:12,color:c.mut }}>Team completion</div>
          <div style={{ fontSize:18,fontWeight:700,color:pct>=80?'#34D399':pct>=50?'#3B9EFF':'#F97316' }}>{pct}%</div>
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
            {m.role==='assistant'&&<AIMark size={32}/>}
            <div style={{ maxWidth:'78%',background:m.role==='user'?'linear-gradient(135deg,#0070F3,#3B9EFF)':c.surf,color:m.role==='user'?'#fff':c.text,padding:'11px 15px',borderRadius:m.role==='user'?'16px 16px 4px 16px':'16px 16px 16px 4px',fontSize:13,lineHeight:1.6,border:m.role==='user'?'none':`1px solid ${c.bord}`,boxShadow:m.role==='assistant'?'0 1px 4px rgba(0,0,0,.06)':'none' }}>
              {m.text.split('\n').map((line,i)=><div key={i} style={{ marginBottom:line?2:6 }}>{line||<br/>}</div>)}
            </div>
          </div>
        ))}
        {loading&&(
          <div style={{ display:'flex',gap:8,alignItems:'flex-start' }}>
            <AIMark size={32}/>
            <div style={{ padding:'11px 16px',background:c.surf,borderRadius:'16px 16px 16px 4px',border:`1px solid ${c.bord}`,display:'flex',gap:5,alignItems:'center' }}>
              {[0,1,2].map(i=><div key={i} style={{ width:7,height:7,borderRadius:'50%',background:'#3B9EFF',animation:`bounce .8s ease ${i*.15}s infinite` }}/>)}
            </div>
          </div>
        )}
        <div ref={bottomRef}/>
      </div>
      {/* Input */}
      <div style={{ padding:'12px 16px',borderTop:`1px solid ${c.bord}`,display:'flex',gap:8,background:c.nav,flexShrink:0 }}>
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&send()} placeholder="Ask about tasks, blockers, team performance..." style={{ flex:1,background:c.inp,border:`1.5px solid ${c.inpB}`,borderRadius:10,padding:'10px 14px',color:c.text,fontSize:13,outline:'none' }}/>
        <button onClick={()=>send()} disabled={!input.trim()||loading} style={{ width:40,height:40,borderRadius:10,background:'linear-gradient(135deg,#0070F3,#3B9EFF)',border:'none',color:'#fff',cursor:input.trim()&&!loading?'pointer':'not-allowed',opacity:input.trim()&&!loading?1:.5,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0 }}>↑</button>
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
            <button key={t.id} onClick={()=>setSsTab(t.id)} style={{ padding:'10px 14px',border:'none',borderBottom:ssTab===t.id?'2px solid #3B9EFF':'2px solid transparent',background:'transparent',color:ssTab===t.id?'#3B9EFF':c.mut,cursor:'pointer',fontSize:13,fontWeight:ssTab===t.id?600:400 }}>{t.l}</button>
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
                          <div key={m.email} onClick={()=>{addMemberToSpace(spaceId,m);setMemberSearch('');}} style={{ padding:'8px 12px',cursor:'pointer',fontSize:12,color:c.text,display:'flex',alignItems:'center',gap:8 }} onMouseEnter={e=>e.currentTarget.style.background='rgba(0,112,243,.1)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
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
                  <div key={opt.v} onClick={()=>isCustom&&isManager&&updateSpaceSettings(spaceId,{access:opt.v})} style={{ display:'flex',alignItems:'center',gap:10,padding:'8px',borderRadius:8,cursor:isCustom&&isManager?'pointer':'default',marginBottom:4,background:cfg.access===opt.v?'rgba(0,112,243,.08)':'transparent' }}>
                    <div style={{ width:14,height:14,borderRadius:'50%',border:`2px solid ${cfg.access===opt.v?'#3B9EFF':'rgba(128,128,128,.4)'}`,background:cfg.access===opt.v?'#3B9EFF':'transparent',flexShrink:0 }}/>
                    <span style={{ fontSize:13,color:c.text }}>{opt.l}</span>
                  </div>
                ))}
              </div>
              <div style={{ borderTop:`1px solid ${c.bord}`,paddingTop:14 }}>
                <div style={{ fontSize:14,fontWeight:700,color:c.text,marginBottom:10 }}>Who can manage members</div>
                {[{v:'all',l:'All members'},{v:'managers',l:'Managers and owners'},{v:'owners',l:'Owners only'}].map(opt=>(
                  <div key={opt.v} onClick={()=>isCustom&&isManager&&updateSpaceSettings(spaceId,{whoManages:opt.v})} style={{ display:'flex',alignItems:'center',gap:10,padding:'6px 8px',borderRadius:8,cursor:isCustom&&isManager?'pointer':'default',marginBottom:4 }}>
                    <div style={{ width:14,height:14,borderRadius:'50%',border:`2px solid ${cfg.whoManages===opt.v?'#3B9EFF':'rgba(128,128,128,.4)'}`,background:cfg.whoManages===opt.v?'#3B9EFF':'transparent',flexShrink:0 }}/>
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


// Modern line icons for the chat composer
function chatIcon(name){
  const p={width:18,height:18,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:2,strokeLinecap:'round',strokeLinejoin:'round'};
  switch(name){
    case 'plus': return <svg {...p}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
    case 'smile': return <svg {...p}><circle cx="12" cy="12" r="9"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>;
    case 'send': return <svg {...p}><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>;
    case 'paperclip': return <svg {...p}><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>;
    case 'image': return <svg {...p}><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>;
    case 'gif': return <svg {...p} strokeWidth={1.8}><rect x="3" y="5" width="18" height="14" rx="2"/><text x="12" y="15.5" fontSize="7" fontWeight="700" textAnchor="middle" fill="currentColor" stroke="none">GIF</text></svg>;
    case 'at': return <svg {...p}><circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94"/></svg>;
    case 'poll': return <svg {...p}><line x1="6" y1="20" x2="6" y2="12"/><line x1="12" y1="20" x2="12" y2="6"/><line x1="18" y1="20" x2="18" y2="14"/></svg>;
    case 'task': return <svg {...p}><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>;
    default: return null;
  }
}

function PollModal({ onClose, onCreate }){
  const c=useC();
  const [q,setQ]=useState(''); const [opts,setOpts]=useState(['','']);
  const setOpt=(i,v)=>setOpts(o=>o.map((x,j)=>j===i?v:x));
  const valid=q.trim()&&opts.filter(o=>o.trim()).length>=2;
  return (
    <Modal onClose={onClose} title="Create a poll" width={440}>
      <Inp value={q} onChange={e=>setQ(e.target.value)} placeholder="Ask a question..." style={{ marginBottom:14 }} autoFocus/>
      <div style={{ display:'flex',flexDirection:'column',gap:8,marginBottom:14 }}>
        {opts.map((o,i)=>(
          <div key={i} style={{ display:'flex',gap:8,alignItems:'center' }}>
            <Inp value={o} onChange={e=>setOpt(i,e.target.value)} placeholder={'Option '+(i+1)} style={{ flex:1 }}/>
            {opts.length>2&&<button onClick={()=>setOpts(o=>o.filter((_,j)=>j!==i))} style={{ background:'none',border:'none',color:c.mut,cursor:'pointer',fontSize:18 }}>×</button>}
          </div>
        ))}
      </div>
      {opts.length<6&&<button onClick={()=>setOpts(o=>[...o,''])} style={{ background:'none',border:'none',color:'#0070F3',cursor:'pointer',fontSize:13,fontWeight:600,padding:0,marginBottom:18 }}>+ Add option</button>}
      <div style={{ display:'flex',justifyContent:'flex-end',gap:8 }}>
        <Btn v="ghost" onClick={onClose}>Cancel</Btn>
        <Btn onClick={()=>onCreate({question:q.trim(),options:opts.filter(o=>o.trim()).map(o=>({text:o.trim(),votes:[]}))})} disabled={!valid}>Post poll</Btn>
      </div>
    </Modal>
  );
}

function ChatTaskModal({ members, onClose, onCreate }){
  const c=useC();
  const [title,setTitle]=useState(''); const [assignee,setAssignee]=useState(members[0]?.email||''); const [priority,setPriority]=useState('medium');
  return (
    <Modal onClose={onClose} title="Create task from chat" width={440}>
      <Inp value={title} onChange={e=>setTitle(e.target.value)} placeholder="Task description..." style={{ marginBottom:12 }} autoFocus/>
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:18 }}>
        <Sel label="Assign to" value={assignee} onChange={e=>setAssignee(e.target.value)}>{members.map(m=><option key={m.email} value={m.email}>{m.name||m.email}</option>)}</Sel>
        <Sel label="Priority" value={priority} onChange={e=>setPriority(e.target.value)}>{['critical','high','medium','low'].map(v=><option key={v} value={v}>{v.charAt(0).toUpperCase()+v.slice(1)}</option>)}</Sel>
      </div>
      <div style={{ display:'flex',justifyContent:'flex-end',gap:8 }}>
        <Btn v="ghost" onClick={onClose}>Cancel</Btn>
        <Btn onClick={()=>{ const m=members.find(x=>x.email===assignee); onCreate({title:title.trim(),assignee_email:assignee,assignee_name:m?.name||assignee,priority,status:'todo',timeline:'Today EOD (6 PM)',notes:'',manager_note:'',blocker:''}); }} disabled={!title.trim()}>Create task</Btn>
      </div>
    </Modal>
  );
}

function GroupCreateModal({ members, myEmail, onClose, onCreate }){
  const c=useC(); const { dark }=useTheme(); const dpRef=useRef();
  const [name,setName]=useState(''); const [desc,setDesc]=useState('');
  const [dp,setDp]=useState(null); const [color,setColor]=useState('#0070F3');
  const [visibility,setVisibility]=useState('public');
  const [basedOn,setBasedOn]=useState('team');
  const [type,setType]=useState('collaboration');
  const [welcome,setWelcome]=useState('');
  const [tags,setTags]=useState(''); const [step,setStep]=useState(1);
  const [selected,setSelected]=useState(members.map(m=>m.email));
  const [admins,setAdmins]=useState([myEmail]);
  const [canSend,setCanSend]=useState('members');
  const [canAddMembers,setCanAddMembers]=useState('admins');
  const [canEditInfo,setCanEditInfo]=useState('admins');
  const [canPin,setCanPin]=useState('admins');
  const [notifications,setNotifications]=useState('all');

  const COLORS=['#6366F1','#8B5CF6','#EC4899','#F59E0B','#10B981','#06B6D4','#EF4444','#64748B'];
  const handleDp=(e)=>{ const f=e.target.files?.[0]; if(!f)return; const r=new FileReader(); r.onload=ev=>setDp(ev.target.result); r.readAsDataURL(f); };
  const toggleMember=(email)=>setSelected(s=>s.includes(email)?s.filter(x=>x!==email):[...s,email]);
  const toggleAdmin=(email)=>setAdmins(a=>a.includes(email)?a.filter(x=>x!==email):[...a,email]);

  const VIS=[
    {v:'public',l:'Public',d:'Anyone in the workspace can find and join'},
    {v:'private',l:'Private',d:'Invite-only; visible but requires approval'},
    {v:'secret',l:'Secret',d:'Hidden; only added members can see it'},
  ];
  const BASED=[{v:'team',l:'Team'},{v:'department',l:'Department'},{v:'project',l:'Project'},{v:'role',l:'Role-based'}];
  const PERM=[{v:'everyone',l:'Everyone'},{v:'members',l:'Members'},{v:'admins',l:'Admins only'}];

  const submit=()=>{ if(!name.trim())return; onCreate({ name,description:desc,dp,color,visibility,basedOn,type,welcome,tags:tags.split(',').map(t=>t.trim()).filter(Boolean),members:members.filter(m=>selected.includes(m.email)),admins,canSend,canAddMembers,canEditInfo,canPin,notifications }); };

  return (
    <Modal onClose={onClose} title="Create a group" width={560}>
      {/* Step tabs */}
      <div style={{ display:'flex',gap:6,marginBottom:18 }}>
        {['Details','Members','Permissions'].map((s,i)=>(
          <button key={s} onClick={()=>setStep(i+1)} style={{ flex:1,padding:'8px',borderRadius:9,border:'none',background:step===i+1?'rgba(0,112,243,.14)':c.row,color:step===i+1?'#0070F3':c.mut,fontWeight:step===i+1?700:500,fontSize:12.5,cursor:'pointer' }}>{i+1}. {s}</button>
        ))}
      </div>

      {step===1&&<div style={{ display:'flex',flexDirection:'column',gap:14 }}>
        {/* DP + name */}
        <div style={{ display:'flex',gap:14,alignItems:'center' }}>
          <button onClick={()=>dpRef.current?.click()} style={{ width:64,height:64,borderRadius:16,flexShrink:0,border:`2px dashed ${c.bord}`,background:dp?'transparent':color+'22',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',position:'relative' }}>
            {dp?<img src={dp} alt="dp" style={{ width:'100%',height:'100%',objectFit:'cover' }}/>:<span style={{ fontSize:24,color }}>{name?name[0].toUpperCase():'+'}</span>}
          </button>
          <input ref={dpRef} type="file" accept="image/*" onChange={handleDp} style={{ display:'none' }}/>
          <div style={{ flex:1 }}>
            <Inp value={name} onChange={e=>setName(e.target.value)} placeholder="Group name" autoFocus/>
            <button onClick={()=>dpRef.current?.click()} style={{ fontSize:11.5,color:'#0070F3',background:'none',border:'none',cursor:'pointer',padding:0,marginTop:6 }}>Upload group picture</button>
          </div>
        </div>
        <Textarea value={desc} onChange={e=>setDesc(e.target.value)} placeholder="What's this group about? (description)" rows={2}/>
        {/* Color/theme */}
        <div>
          <div style={{ fontSize:11.5,fontWeight:600,color:c.mut,marginBottom:7 }}>Group color</div>
          <div style={{ display:'flex',gap:8 }}>{COLORS.map(col=><button key={col} onClick={()=>setColor(col)} style={{ width:26,height:26,borderRadius:8,background:col,border:color===col?'2px solid '+c.text:'2px solid transparent',cursor:'pointer' }}/>)}</div>
        </div>
        {/* Visibility */}
        <div>
          <div style={{ fontSize:11.5,fontWeight:600,color:c.mut,marginBottom:7 }}>Visibility</div>
          <div style={{ display:'flex',flexDirection:'column',gap:6 }}>
            {VIS.map(o=>(
              <div key={o.v} onClick={()=>setVisibility(o.v)} style={{ display:'flex',gap:10,padding:'9px 12px',borderRadius:10,cursor:'pointer',border:`1px solid ${visibility===o.v?'rgba(0,112,243,.4)':c.bord}`,background:visibility===o.v?'rgba(0,112,243,.07)':'transparent' }}>
                <div style={{ width:15,height:15,borderRadius:'50%',marginTop:1,flexShrink:0,border:`2px solid ${visibility===o.v?'#0070F3':c.mut}`,background:visibility===o.v?'#0070F3':'transparent' }}/>
                <div><div style={{ fontSize:12.5,fontWeight:600,color:c.text }}>{o.l}</div><div style={{ fontSize:11,color:c.mut }}>{o.d}</div></div>
              </div>
            ))}
          </div>
        </div>
        {/* Based on + type + tags */}
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10 }}>
          <Sel label="Based on" value={basedOn} onChange={e=>setBasedOn(e.target.value)}>{BASED.map(b=><option key={b.v} value={b.v}>{b.l}</option>)}</Sel>
          <Sel label="Type" value={type} onChange={e=>setType(e.target.value)}><option value="collaboration">Collaboration</option><option value="announcements">Announcements</option></Sel>
        </div>
        <Inp label="Tags / categories (comma-separated)" value={tags} onChange={e=>setTags(e.target.value)} placeholder="engineering, q3, urgent"/>
        <Inp label="Welcome message (optional)" value={welcome} onChange={e=>setWelcome(e.target.value)} placeholder="Posted when the group is created"/>
      </div>}

      {step===2&&<div>
        <div style={{ fontSize:12,color:c.mut,marginBottom:10 }}>{selected.length} of {members.length} selected · tap the shield to make someone an admin</div>
        <div style={{ display:'flex',flexDirection:'column',gap:4,maxHeight:320,overflowY:'auto' }}>
          {members.map(m=>{ const sel=selected.includes(m.email); const adm=admins.includes(m.email); return (
            <div key={m.email} style={{ display:'flex',alignItems:'center',gap:11,padding:'9px 10px',borderRadius:10,background:sel?'rgba(0,112,243,.06)':'transparent',border:`1px solid ${sel?'rgba(0,112,243,.2)':c.bord}` }}>
              <input type="checkbox" checked={sel} onChange={()=>toggleMember(m.email)} style={{ accentColor:'#0070F3' }}/>
              <Av member={m} size={32} url={m.avatar_url}/>
              <div style={{ flex:1,minWidth:0 }}><div style={{ fontSize:13,fontWeight:600,color:c.text }}>{m.name||m.email}</div><div style={{ fontSize:11,color:c.mut }}>{m.email}</div></div>
              <button onClick={()=>toggleAdmin(m.email)} disabled={!sel} title="Toggle admin" style={{ fontSize:11,fontWeight:700,padding:'4px 10px',borderRadius:20,border:`1px solid ${adm?'#A78BFA':c.bord}`,background:adm?'rgba(167,139,250,.15)':'transparent',color:adm?'#A78BFA':c.mut,cursor:sel?'pointer':'not-allowed',opacity:sel?1:.4 }}>{adm?'Admin':'Make admin'}</button>
            </div>
          ); })}
        </div>
      </div>}

      {step===3&&<div style={{ display:'flex',flexDirection:'column',gap:14 }}>
        {[
          {l:'Who can send messages',v:canSend,set:setCanSend},
          {l:'Who can add members',v:canAddMembers,set:setCanAddMembers},
          {l:'Who can edit group info',v:canEditInfo,set:setCanEditInfo},
          {l:'Who can pin messages',v:canPin,set:setCanPin},
        ].map(p=>(
          <div key={p.l} style={{ display:'flex',alignItems:'center',justifyContent:'space-between',gap:12 }}>
            <span style={{ fontSize:13,color:c.text }}>{p.l}</span>
            <select value={p.v} onChange={e=>p.set(e.target.value)} style={{ background:c.inp,border:`1px solid ${c.inpB}`,borderRadius:8,padding:'6px 10px',color:c.text,fontSize:12.5,outline:'none' }}>{PERM.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}</select>
          </div>
        ))}
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,paddingTop:6,borderTop:`1px solid ${c.bord}` }}>
          <span style={{ fontSize:13,color:c.text }}>Default notifications</span>
          <select value={notifications} onChange={e=>setNotifications(e.target.value)} style={{ background:c.inp,border:`1px solid ${c.inpB}`,borderRadius:8,padding:'6px 10px',color:c.text,fontSize:12.5,outline:'none' }}><option value="all">All messages</option><option value="mentions">Mentions only</option><option value="none">Muted</option></select>
        </div>
      </div>}

      <div style={{ display:'flex',justifyContent:'space-between',gap:8,marginTop:20 }}>
        <div>{step>1&&<Btn v="ghost" onClick={()=>setStep(step-1)}>Back</Btn>}</div>
        <div style={{ display:'flex',gap:8 }}>
          <Btn v="ghost" onClick={onClose}>Cancel</Btn>
          {step<3?<Btn onClick={()=>setStep(step+1)} disabled={step===1&&!name.trim()}>Next</Btn>:<Btn onClick={submit} disabled={!name.trim()}>Create group</Btn>}
        </div>
      </div>
    </Modal>
  );
}

function RichChatPanel({ messages=[], onSend, session, members=[], chatTheme='default', onChangeTheme, isManager=false, onCreateTask, teamId='demo' }) {
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
  const [pollVotes,setPollVotes]=useState({}); // {msgId: optionIndex} — this user's vote per poll
  const [replyTo,setReplyTo]=useState(null);
  const [showQuick,setShowQuick]=useState(false);
  const [showMention,setShowMention]=useState(false);
  const [showPoll,setShowPoll]=useState(false);
  const [showTaskModal,setShowTaskModal]=useState(false);
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

  const votePoll=(msgId,optIdx)=>setPollVotes(p=>({...p,[msgId]:p[msgId]===optIdx?undefined:optIdx}));
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
      text:(type==='text'||type==='poll'||type==='tasknote')?text.trim():'',
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
  // Rich group creation from the GroupCreateModal
  const createGroup=(cfg)=>{
    const id='space-'+(cfg.name||'group').toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'')+'-'+Date.now().toString(36).slice(-4);
    const space={ id, name:cfg.name.trim(), label:cfg.name.trim(), type:cfg.type==='announcements'?'announcements':'collaboration',
      description:cfg.description||'', dp:cfg.dp||null, color:cfg.color||'#0070F3', visibility:cfg.visibility||'public',
      basedOn:cfg.basedOn||'team', tags:cfg.tags||[], welcome:cfg.welcome||'',
      settings:{ access:cfg.visibility==='public'?'organisation':'invite', allowRequests:cfg.visibility!=='secret',
        canSend:cfg.canSend||'members', whoManages:cfg.canAddMembers||'admins', canModify:cfg.canEditInfo||'admins',
        canPin:cfg.canPin||'admins', canHistory:'members', canAtAll:'members', canManageApps:'admins', canManageWebhooks:'admins',
        notifications:cfg.notifications||'all',
        members:(cfg.members&&cfg.members.length?cfg.members:members.map(m=>({email:m.email,name:m.name||m.email}))).map(m=>({email:m.email,name:m.name||m.email,role:(cfg.admins||[]).includes(m.email)?'admin':'member'}))
      }
    };
    const updated=[...customSpaces,space];
    setCustomSpaces(updated);
    try{localStorage.setItem('ss-spaces',JSON.stringify(updated));}catch{}
    if(cfg.welcome) onSend?.({space:id,text:cfg.welcome,type:'text'});
    setActiveSpace(id); setShowNewSpace(false);
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
    if(m.type==='poll'){
      let poll; try{ poll=JSON.parse(m.text); }catch{ return <span>{m.text}</span>; }
      const myVote=pollVotes[m.id];
      // Overlay this user's local vote onto the counts
      const opts=poll.options.map((o,i)=>{ const base=(o.votes||[]).filter(v=>v!==myEmail); const list=myVote===i?[...base,myEmail]:base; return {...o,votes:list}; });
      const total=opts.reduce((s,o)=>s+o.votes.length,0);
      return (
        <div style={{ minWidth:240,maxWidth:340,background:c.surf,border:`1px solid ${c.bord}`,borderRadius:12,padding:'12px 14px' }}>
          <div style={{ display:'flex',alignItems:'center',gap:7,marginBottom:10 }}><span style={{ color:'#0070F3' }}>{chatIcon('poll')}</span><span style={{ fontSize:13.5,fontWeight:700,color:c.text }}>{poll.question}</span></div>
          <div style={{ display:'flex',flexDirection:'column',gap:7 }}>
            {opts.map((o,i)=>{ const votes=o.votes.length; const pctv=total?Math.round(votes/total*100):0; const voted=myVote===i; return (
              <button key={i} onClick={()=>votePoll(m.id,i)} style={{ position:'relative',textAlign:'left',padding:'8px 11px',borderRadius:9,border:`1px solid ${voted?'#0070F3':c.bord}`,background:'transparent',cursor:'pointer',overflow:'hidden' }}>
                <div style={{ position:'absolute',inset:0,width:pctv+'%',background:voted?'rgba(0,112,243,.16)':'rgba(128,128,128,.08)',transition:'width .3s' }}/>
                <div style={{ position:'relative',display:'flex',justifyContent:'space-between',fontSize:12.5,color:c.text }}><span>{o.text}{voted?' ✓':''}</span><span style={{ color:c.mut,fontWeight:600 }}>{pctv}%</span></div>
              </button>
            ); })}
          </div>
          <div style={{ fontSize:11,color:c.mut,marginTop:8 }}>{total} vote{total!==1?'s':''} · tap to vote</div>
        </div>
      );
    }
    if(m.type==='tasknote') return <div style={{ display:'inline-flex',alignItems:'center',gap:8,background:'rgba(0,112,243,.1)',border:'1px solid rgba(0,112,243,.25)',borderRadius:10,padding:'8px 12px',fontSize:13,color:c.text }}><span style={{ color:'#0070F3' }}>{chatIcon('task')}</span>{m.text.replace('📋 ','')}</div>;
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
  // ── Per-DM unread tracking ──
  const [dmReads,setDmReads]=useState(()=>{ try{ return JSON.parse(localStorage.getItem('ss-dm-reads-'+myEmail)||'{}'); }catch{ return {}; } });
  const dmUnread=useMemo(()=>{
    const counts={};
    (messages||[]).forEach(m=>{
      if(!m.dm_to) return;
      // a DM addressed to me, from someone else
      if(m.dm_to===myEmail && m.sender_email && m.sender_email!==myEmail){
        const since=dmReads[m.sender_email]||0;
        const t=m.created_at?new Date(m.created_at).getTime():(parseInt(String(m.id).replace(/\D/g,''))||0);
        if(t>since) counts[m.sender_email]=(counts[m.sender_email]||0)+1;
      }
    });
    return counts;
  },[messages,dmReads,myEmail]);
  // Mark the open DM as read
  useEffect(()=>{
    if(activeSpace.startsWith('dm-')){
      const who=activeSpace.slice(3);
      setDmReads(prev=>{ const next={...prev,[who]:Date.now()}; try{localStorage.setItem('ss-dm-reads-'+myEmail,JSON.stringify(next));}catch{} return next; });
    }
  },[activeSpace,messages]); // re-mark as new messages arrive while open

  const dmMembersBase=members.filter(m=>m.email!==myEmail);
  // unread first, then by most-recent activity, then name
  const dmMembers=[...dmMembersBase].sort((a,b)=>{
    const ua=dmUnread[a.email]||0, ub=dmUnread[b.email]||0;
    if(ua!==ub) return ub-ua;
    return (a.name||a.email).localeCompare(b.name||b.email);
  });
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
          {[...DEFAULT_SPACES,...customSpaces].map(sp=>(
            <div key={sp.id} style={{ display:'flex',alignItems:'center',gap:1 }}
              onMouseEnter={e=>e.currentTarget.querySelector('.sp-actions')&&(e.currentTarget.querySelector('.sp-actions').style.opacity='1')}
              onMouseLeave={e=>e.currentTarget.querySelector('.sp-actions')&&(e.currentTarget.querySelector('.sp-actions').style.opacity='0')}
            >
              <button onClick={()=>setActiveSpace(sp.id)} style={{ flex:1,display:'flex',alignItems:'center',gap:8,padding:'7px 10px',borderRadius:9,border:'none',background:activeSpace===sp.id?(c.dark?'rgba(0,112,243,.2)':'rgba(0,112,243,.12)'):'transparent',color:activeSpace===sp.id?'#3B9EFF':c.sub,cursor:'pointer',fontSize:13,fontWeight:activeSpace===sp.id?600:400,textAlign:'left' }}>
                <span style={{ fontSize:12,fontWeight:700,color:activeSpace===sp.id?'#3B9EFF':c.mut,flexShrink:0 }}>{sp.type==='announcements'?'📢':'#'}</span>
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
                <div key={m.email} onClick={()=>{setActiveSpace('dm-'+m.email);setShowAddDM(false);setDmSearch('');}} style={{ display:'flex',alignItems:'center',gap:7,padding:'5px 6px',borderRadius:7,cursor:'pointer',fontSize:12,color:c.text }} onMouseEnter={e=>e.currentTarget.style.background='rgba(0,112,243,.1)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
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
            const unread=dmUnread[m.email]||0;
            return(
              <button key={m.email} onClick={()=>setActiveSpace(dmKey)} style={{ display:'flex',alignItems:'center',gap:9,padding:'7px 10px',borderRadius:9,border:'none',background:isActive?(c.dark?'rgba(0,112,243,.2)':'rgba(0,112,243,.12)'):'transparent',color:isActive?'#3B9EFF':c.sub,cursor:'pointer',fontSize:13,fontWeight:(isActive||unread)?700:400,textAlign:'left',width:'100%' }}>
                <div style={{ position:'relative',flexShrink:0 }}>
                  <Av member={m} size={22} url={m.avatar_url}/>
                  <div style={{ position:'absolute',bottom:-1,right:-1,width:7,height:7,borderRadius:'50%',background:'#34D399',border:'1.5px solid '+(c.dark?'#0F0D2A':'#F3F4FF') }}/>
                </div>
                <span style={{ flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',color:unread&&!isActive?c.text:undefined }}>{(m.name||m.email).split(' ')[0]}</span>
                {unread>0&&<span style={{ flexShrink:0,minWidth:18,height:18,borderRadius:9,background:'#0070F3',color:'#fff',fontSize:11,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',padding:'0 5px' }}>{unread>9?'9+':unread}</span>}
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
          <button onClick={()=>setShowFiles(!showFiles)} title="Files & links" style={{ width:30,height:30,borderRadius:8,border:`1px solid ${c.bord}`,background:showFiles?'rgba(0,112,243,.12)':'transparent',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,color:showFiles?'#3B9EFF':c.mut }}>🗂️</button>
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

        {/* DM status banner — shows if the person you're messaging is on break/away */}
        {activeSpace.startsWith('dm-')&&(()=>{
          const who=activeSpace.slice(3);
          let att={}; try{ att=JSON.parse(localStorage.getItem('ss-attendance-'+teamId+'-'+new Date().toISOString().slice(0,10))||'{}'); }catch{}
          const r=att[who]||{};
          const ab=(r.breaks||[]).find(b=>!b.end);
          const online=r.online!==false&&r.lastSeen&&(Date.now()-r.lastSeen)<120000;
          if(ab){
            const backAt=ab.plannedMins?new Date(ab.start+ab.plannedMins*60000):null;
            const backStr=backAt?backAt.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'}):null;
            return (
              <div style={{ padding:'10px 16px',borderBottom:`1px solid ${c.bord}`,background:'rgba(251,191,36,.08)',flexShrink:0,display:'flex',alignItems:'center',gap:9,fontSize:12.5,color:c.sub }}>
                <span style={{ fontSize:14 }}>⏸️</span>
                <span><strong style={{ color:'#F59E0B' }}>{activeLabel} is on {ab.label} break</strong>{backStr?` · back around ${backStr}`:''}{ab.note?` — "${ab.note}"`:''}. Your message will be waiting when they return.</span>
              </div>
            );
          }
          if(!online&&r.clockIn&&!r.clockOut){
            return (
              <div style={{ padding:'10px 16px',borderBottom:`1px solid ${c.bord}`,background:dark?'rgba(255,255,255,.04)':'rgba(0,0,0,.03)',flexShrink:0,display:'flex',alignItems:'center',gap:9,fontSize:12.5,color:c.mut }}>
                <span style={{ fontSize:14 }}>🌙</span>
                <span><strong>{activeLabel} is away</strong> right now. They'll see your message when they're back.</span>
              </div>
            );
          }
          return null;
        })()}

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
                        {showAvatar?<Av member={{name:m.sender_name,color:member?.color||'#3B9EFF'}} size={34} url={avatarUrl}/>:<div style={{ height:20 }}/>}
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
                          <div style={{ display:'flex',gap:6,alignItems:'center',marginBottom:4,padding:'4px 8px',borderRadius:6,background:c.surf,borderLeft:`3px solid #3B9EFF`,maxWidth:320 }}>
                            <span style={{ fontSize:11,color:'#3B9EFF',fontWeight:600 }}>{m.reply_to.name}</span>
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
                              <button key={emoji} onClick={()=>addReaction(m.id,emoji)} style={{ display:'flex',alignItems:'center',gap:3,padding:'2px 8px',borderRadius:20,background:users.includes(myEmail)?'rgba(0,112,243,.2)':'rgba(255,255,255,.06)',border:`1px solid ${users.includes(myEmail)?'rgba(0,112,243,.4)':c.bord}`,cursor:'pointer',fontSize:13 }}>
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
              <span style={{ fontSize:12,color:c.mut,flex:1 }}>Replying to <strong style={{ color:'#3B9EFF' }}>{replyTo.sender_name}</strong>: {(replyTo.text||'[attachment]').slice(0,60)}</span>
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
                  <button key={g} onClick={()=>setEmojiGroup(g)} style={{ padding:'4px 10px',borderRadius:8,border:'none',background:emojiGroup===g?'rgba(0,112,243,.15)':'transparent',color:emojiGroup===g?'#3B9EFF':c.mut,cursor:'pointer',fontSize:12,fontWeight:emojiGroup===g?700:400 }}>{g}</button>
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

          {/* Quick-actions popup */}
          {showQuick&&(
            <div onClick={e=>e.stopPropagation()} style={{ position:'absolute',bottom:54,left:12,zIndex:30,background:c.dark?'#161B2E':'#fff',border:`1px solid ${c.bord}`,borderRadius:14,boxShadow:'0 12px 40px rgba(0,0,0,.3)',padding:8,width:230 }}>
              {[
                {ic:'paperclip',label:'Attach file',act:()=>{attachRef.current.click();}},
                {ic:'image',label:'Photo or video',act:()=>{fileRef.current.click();}},
                {ic:'gif',label:'GIF',act:()=>{setShowGif(true);setShowEmoji(false);}},
                {ic:'at',label:'Mention someone',act:()=>{setShowMention(true);}},
                {ic:'poll',label:'Create poll',act:()=>setShowPoll(true)},
                {ic:'task',label:'Create task from chat',act:()=>setShowTaskModal(true)},
              ].map(a=>(
                <button key={a.label} onClick={()=>{a.act();setShowQuick(false);}} style={{ display:'flex',alignItems:'center',gap:11,width:'100%',padding:'9px 10px',background:'transparent',border:'none',borderRadius:9,cursor:'pointer',color:c.text,fontSize:13,textAlign:'left' }}
                  onMouseEnter={e=>e.currentTarget.style.background=c.row} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <span style={{ width:30,height:30,borderRadius:8,background:c.row,display:'flex',alignItems:'center',justifyContent:'center',color:'#0070F3',flexShrink:0 }}>{chatIcon(a.ic)}</span>
                  {a.label}
                </button>
              ))}
            </div>
          )}

          {/* Mention picker */}
          {showMention&&(
            <div onClick={e=>e.stopPropagation()} style={{ position:'absolute',bottom:54,left:12,zIndex:30,background:c.dark?'#161B2E':'#fff',border:`1px solid ${c.bord}`,borderRadius:14,boxShadow:'0 12px 40px rgba(0,0,0,.3)',padding:8,width:240,maxHeight:240,overflowY:'auto' }}>
              <div style={{ fontSize:11,fontWeight:700,color:c.mut,textTransform:'uppercase',letterSpacing:'.05em',padding:'4px 8px 8px' }}>Mention</div>
              {members.map(m=>(
                <button key={m.email} onClick={()=>{setMsg(x=>x+'@'+(m.name||m.email.split('@')[0])+' ');setShowMention(false);inputRef.current?.focus();}} style={{ display:'flex',alignItems:'center',gap:10,width:'100%',padding:'7px 8px',background:'transparent',border:'none',borderRadius:9,cursor:'pointer',color:c.text,fontSize:13,textAlign:'left' }}
                  onMouseEnter={e=>e.currentTarget.style.background=c.row} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <Av member={m} size={26} url={m.avatar_url}/>{m.name||m.email.split('@')[0]}
                </button>
              ))}
            </div>
          )}

          {/* Main input */}
          <div style={{ position:'relative',display:'flex',alignItems:'center',gap:5,padding:'8px 12px',background:c.surf,border:`1px solid ${c.bord}`,borderRadius:(replyTo||showGif||showEmoji)?'0 0 12px 12px':'12px',boxShadow:'0 1px 4px rgba(0,0,0,.06)' }}>
            <input ref={fileRef} type="file" accept="image/*,video/*" onChange={handleFile} style={{ display:'none' }}/>
            <input ref={attachRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.mp3,.wav,.ogg,video/*,image/*,application/*" onChange={handleFile} style={{ display:'none' }}/>
            <button onClick={e=>{e.stopPropagation();setShowQuick(!showQuick);setShowMention(false);setShowEmoji(false);setShowGif(false);}} title="More" style={{ width:34,height:34,borderRadius:9,border:'none',background:showQuick?'rgba(0,112,243,.14)':'transparent',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:showQuick?'#0070F3':c.mut,flexShrink:0,transition:'all .15s' }}>{chatIcon('plus')}</button>
            <button onClick={e=>{e.stopPropagation();setShowEmoji(!showEmoji);setShowGif(false);setShowQuick(false);}} title="Emoji" style={{ width:34,height:34,borderRadius:9,border:'none',background:showEmoji?'rgba(0,112,243,.14)':'transparent',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:showEmoji?'#0070F3':c.mut,flexShrink:0 }}>{chatIcon('smile')}</button>
            <input ref={inputRef} value={msg} onChange={e=>setMsg(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMsg(msg);}}} placeholder={'Message '+(activeSpace.startsWith('dm-')?'@ ':'# ')+activeLabel} style={{ flex:1,background:'transparent',border:'none',color:c.text,fontSize:14,outline:'none',lineHeight:1.4 }}/>
            <button onClick={()=>sendMsg(msg)} disabled={!msg.trim()} style={{ width:34,height:34,borderRadius:9,background:msg.trim()?'#0070F3':'transparent',border:msg.trim()?'none':`1px solid ${c.bord}`,color:msg.trim()?'#fff':c.mut,cursor:msg.trim()?'pointer':'default',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transition:'all .15s' }}>{chatIcon('send')}</button>
          </div>
        </div>
      </div>
      {showPoll&&<PollModal onClose={()=>setShowPoll(false)} onCreate={(poll)=>{sendMsg(JSON.stringify(poll),'poll');setShowPoll(false);}}/>}
      {showTaskModal&&<ChatTaskModal members={members} onClose={()=>setShowTaskModal(false)} onCreate={(t)=>{ if(onCreateTask)onCreateTask(t); sendMsg('📋 Created task: '+t.title,'tasknote'); setShowTaskModal(false); }}/>}
      {showNewSpace&&isManager&&<GroupCreateModal members={members} myEmail={myEmail} onClose={()=>setShowNewSpace(false)} onCreate={createGroup}/>}
    </div>
  );
}

// ─── REMINDERS ─────────────────────────────────────────────────────────────
function RemindersPanel() {
  const c=useC();
  const [reminders,setReminders]=useState(()=>{
    try{ const raw=localStorage.getItem('ss-reminders'); if(raw) return JSON.parse(raw); }catch{}
    return [
      {id:'r1',label:'Standup starting soon',enabled:true,minutes:10},
      {id:'r2',label:'Task deadline reminder',enabled:true,minutes:60},
      {id:'r3',label:'EOD incomplete tasks',enabled:true,time:'18:00'},
      {id:'r4',label:'Blocker follow-up',enabled:false,minutes:120},
    ];
  });
  const [saved,setSaved]=useState(false);
  const toggle=id=>setReminders(p=>p.map(r=>r.id===id?{...r,enabled:!r.enabled}:r));
  const updateMins=(id,v)=>setReminders(p=>p.map(r=>r.id===id?{...r,minutes:parseInt(v)||0}:r));
  const save=()=>{ try{ localStorage.setItem('ss-reminders',JSON.stringify(reminders)); }catch{} setSaved(true);setTimeout(()=>setSaved(false),2000);};
  return(
    <div>
      <div style={{ fontSize:15,fontWeight:700,color:c.text,marginBottom:4 }}>Reminders</div>
      <div style={{ fontSize:13,color:c.mut,marginBottom:18 }}>Choose which reminders your team gets and when. These send by email through the server once email delivery is set up.</div>
      <div style={{ display:'flex',flexDirection:'column',gap:10,marginBottom:18 }}>
        {reminders.map(r=>(
          <Card key={r.id} style={{ padding:'14px 16px' }}>
            <div style={{ display:'flex',alignItems:'center',gap:10 }}>
              <div style={{ flex:1 }}><div style={{ fontSize:13,fontWeight:600,color:c.text,marginBottom:2 }}>{r.label}</div><div style={{ fontSize:12,color:c.mut }}>{r.time?`Fires at ${r.time} if pending`:`${r.minutes} minutes before`}</div></div>
              {!r.time&&r.enabled&&<div style={{ display:'flex',alignItems:'center',gap:5 }}><input type="number" value={r.minutes} onChange={e=>updateMins(r.id,e.target.value)} min="5" max="480" style={{ width:56,background:c.inp,border:`1px solid ${c.inpB}`,borderRadius:7,padding:'4px 7px',color:c.text,fontSize:12,outline:'none',textAlign:'center' }}/><span style={{ fontSize:11,color:c.mut }}>min</span></div>}
              <button onClick={()=>toggle(r.id)} style={{ width:42,height:22,borderRadius:11,border:'none',background:r.enabled?'#0070F3':'rgba(128,128,128,.3)',cursor:'pointer',position:'relative',transition:'background .2s',flexShrink:0 }}><div style={{ width:16,height:16,borderRadius:'50%',background:'#fff',position:'absolute',top:3,left:r.enabled?23:3,transition:'left .2s',boxShadow:'0 1px 3px rgba(0,0,0,.2)' }}/></button>
            </div>
          </Card>
        ))}
      </div>
      <Btn onClick={save}>{saved?'✓ Saved!':'Save reminders'}</Btn>
      <p style={{ fontSize:11.5,color:c.mut,marginTop:10,lineHeight:1.6 }}>Your preferences are saved. Automatic timed delivery (e.g. "10 min before standup") runs from a scheduled server job — the same Vercel Cron + email setup used for the daily report. Until that's deployed, these are saved but won't fire on their own.</p>
    </div>
  );
}

// ─── GOOGLE CALENDAR ─────────────────────────────────────────────────────
// ─── SCHEDULE CALENDAR (task time-blocks) ─────────────────────────────────────
// Time blocks are stored in localStorage keyed by task id so this works without
// any DB schema change: ss-schedule-{teamId} = { [taskId]: {date, start, end} }
function schedKey(teamId) { return `ss-schedule-${teamId}`; }
function readSchedule(teamId) { try { return JSON.parse(localStorage.getItem(schedKey(teamId)) || '{}'); } catch { return {}; } }
function writeSchedule(teamId, data) { try { localStorage.setItem(schedKey(teamId), JSON.stringify(data)); } catch {} }

const DAY_START_H = 7;   // calendar shows 7am
const DAY_END_H   = 21;  // to 9pm
const HOUR_PX     = 52;

function hhmm(h) { const hh = Math.floor(h); const mm = Math.round((h - hh) * 60); const ap = hh >= 12 ? 'PM' : 'AM'; const h12 = hh % 12 === 0 ? 12 : hh % 12; return `${h12}:${mm.toString().padStart(2, '0')} ${ap}`; }
function parseHM(str) { // "10:00" -> 10, "13:30" -> 13.5
  if (!str) return null; const [h, m] = str.split(':').map(Number); return h + (m || 0) / 60;
}

function ScheduleCalendar({ team, session, members = [], tasks = [], canViewPerformance, isManager }) {
  const c = useC();
  const { dark } = useTheme();
  const teamId = team?.id || 'demo';
  const myEmail = session?.user?.email || 'me@demo';
  const [sched, setSched] = useState(() => readSchedule(teamId));
  const [day, setDay] = useState(() => new Date());
  const [editTask, setEditTask] = useState(null);
  const [viewEmail, setViewEmail] = useState(myEmail); // whose calendar (managers/TLs can switch)
  const [aiNote, setAiNote] = useState('');
  const [aiBusy, setAiBusy] = useState(false);

  const dayStr = day.toISOString().slice(0, 10);
  const canSwitch = canViewPerformance || isManager;

  // tasks for the viewed person
  const personTasks = tasks.filter(t => t.assignee_email === viewEmail);
  const blockFor = (taskId) => sched[taskId];
  const dayBlocks = personTasks
    .map(t => ({ task: t, block: blockFor(t.id) }))
    .filter(x => x.block && x.block.date === dayStr);

  const saveBlock = (taskId, block) => {
    const next = { ...readSchedule(teamId), [taskId]: block };
    writeSchedule(teamId, next); setSched(next);
  };
  const clearBlock = (taskId) => {
    const next = { ...readSchedule(teamId) }; delete next[taskId];
    writeSchedule(teamId, next); setSched(next);
  };

  // Workload: scheduled hours today + total open tasks
  const scheduledHrsToday = dayBlocks.reduce((s, x) => { const a = parseHM(x.block.start), b = parseHM(x.block.end); return s + (a != null && b != null && b > a ? b - a : 0); }, 0);
  const openTasks = personTasks.filter(t => t.status !== 'done').length;
  const workPct = Math.min(100, Math.round((scheduledHrsToday / 8) * 100)); // 8h day
  const workColor = workPct >= 90 ? '#F87171' : workPct >= 60 ? '#FBBF24' : '#34D399';
  const workLabel = workPct >= 90 ? 'Overloaded' : workPct >= 60 ? 'Busy' : 'Has capacity';

  const assessWithAI = async () => {
    setAiBusy(true); setAiNote('');
    const person = members.find(m => m.email === viewEmail);
    const name = person?.name || viewEmail.split('@')[0];
    try {
      const prompt = `You are a team capacity advisor. Member: ${name}. Today they have ${dayBlocks.length} time-blocked tasks totaling ${scheduledHrsToday.toFixed(1)} hours out of an 8-hour day. They have ${openTasks} open tasks total. Their tasks: ${personTasks.slice(0, 8).map(t => (t.title || t.text) + ' [' + (t.status || 'todo') + ', ' + (t.priority || 'med') + ']').join('; ') || 'none'}. In 2-3 short sentences, advise whether it's wise to assign more work to ${name} right now, and why.`;
      const res = await askAI(prompt, { tasks: personTasks, members, teamName: team?.name || 'Team', userName: name });
      setAiNote(typeof res === 'string' ? res : (res?.text || 'Could not get a recommendation.'));
    } catch (e) {
      // Fallback heuristic if AI unavailable
      if (workPct >= 90) setAiNote(`${name} looks overloaded (${scheduledHrsToday.toFixed(1)}h scheduled, ${openTasks} open). Avoid assigning more today — consider another member or tomorrow.`);
      else if (workPct >= 60) setAiNote(`${name} is fairly busy (${scheduledHrsToday.toFixed(1)}h today). You can assign a small/low-priority task, but watch their load.`);
      else setAiNote(`${name} has capacity (${scheduledHrsToday.toFixed(1)}h scheduled, ${openTasks} open). Good candidate for new work.`);
    }
    setAiBusy(false);
  };

  const hours = [];
  for (let h = DAY_START_H; h <= DAY_END_H; h++) hours.push(h);
  const shiftDay = (n) => setDay(d => { const nd = new Date(d); nd.setDate(nd.getDate() + n); return nd; });

  const prioColor = p => p === 'critical' ? '#EF4444' : p === 'high' ? '#F87171' : p === 'medium' ? '#FBBF24' : '#3B9EFF';

  return (
    <div>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button onClick={() => shiftDay(-1)} style={navBtn(c)}>‹</button>
          <button onClick={() => setDay(new Date())} style={{ ...navBtn(c), width: 'auto', padding: '0 12px', fontSize: 12, fontWeight: 600 }}>Today</button>
          <button onClick={() => shiftDay(1)} style={navBtn(c)}>›</button>
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, color: c.text }}>{day.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</div>
        <div style={{ flex: 1 }}/>
        {canSwitch && (
          <Sel value={viewEmail} onChange={e => { setViewEmail(e.target.value); setAiNote(''); }} style={{ minWidth: 180 }}>
            <option value={myEmail}>My schedule</option>
            {members.filter(m => m.email !== myEmail).map(m => <option key={m.email} value={m.email}>{m.name || m.email.split('@')[0]}</option>)}
          </Sel>
        )}
      </div>

      {/* Workload card (managers/TLs, when viewing someone) */}
      {canSwitch && (
        <div style={{ borderRadius: 14, background: c.surf, border: `1px solid ${c.bord}`, padding: '16px 18px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {(() => { const m = members.find(x => x.email === viewEmail); return m ? <Av member={m} size={32} url={m.avatar_url}/> : null; })()}
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: c.text }}>{(members.find(x => x.email === viewEmail)?.name) || viewEmail.split('@')[0]}</div>
                <div style={{ fontSize: 12, color: c.mut }}>{scheduledHrsToday.toFixed(1)}h scheduled today · {openTasks} open tasks</div>
              </div>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: workColor, background: workColor + '1f', padding: '4px 12px', borderRadius: 20 }}>{workLabel}</span>
          </div>
          <div style={{ height: 8, borderRadius: 4, background: c.row, overflow: 'hidden', marginBottom: 12 }}>
            <div style={{ height: '100%', width: workPct + '%', background: workColor, borderRadius: 4, transition: 'width .3s' }}/>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <Btn onClick={assessWithAI} loading={aiBusy} v="ghost" style={{ fontSize: 12.5 }}>✦ Should I assign work to them?</Btn>
            {aiNote && <div style={{ flex: 1, minWidth: 220, fontSize: 12.5, color: c.sub, background: dark ? 'rgba(0,112,243,.08)' : 'rgba(0,112,243,.05)', border: '1px solid rgba(0,112,243,.2)', borderRadius: 10, padding: '8px 12px', lineHeight: 1.5 }}>{aiNote}</div>}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* Day grid */}
        <div style={{ flex: 1, minWidth: 320, borderRadius: 14, background: c.surf, border: `1px solid ${c.bord}`, overflow: 'hidden' }}>
          <div style={{ position: 'relative' }}>
            {hours.map(h => (
              <div key={h} style={{ display: 'flex', borderTop: `1px solid ${c.bord}`, height: HOUR_PX }}>
                <div style={{ width: 64, flexShrink: 0, padding: '4px 8px', fontSize: 11, color: c.mut, borderRight: `1px solid ${c.bord}` }}>{hhmm(h)}</div>
                <div style={{ flex: 1 }}/>
              </div>
            ))}
            {/* Task blocks overlay */}
            <div style={{ position: 'absolute', left: 64, right: 8, top: 0, bottom: 0 }}>
              {dayBlocks.map(({ task, block }) => {
                const a = parseHM(block.start), b = parseHM(block.end);
                if (a == null || b == null) return null;
                const top = (a - DAY_START_H) * HOUR_PX;
                const height = Math.max(22, (b - a) * HOUR_PX - 4);
                return (
                  <div key={task.id} onClick={() => setEditTask(task)} style={{ position: 'absolute', top: top + 2, left: 0, right: 0, height, background: prioColor(task.priority) + '22', borderLeft: `3px solid ${prioColor(task.priority)}`, borderRadius: 8, padding: '5px 9px', cursor: 'pointer', overflow: 'hidden' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: c.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title || task.text}</div>
                    <div style={{ fontSize: 10.5, color: c.mut }}>{hhmm(a)} – {hhmm(b)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Unscheduled tasks sidebar */}
        <div style={{ width: 280, flexShrink: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: c.mut, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>
            {viewEmail === myEmail ? 'Schedule a task' : 'Their tasks'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {personTasks.filter(t => t.status !== 'done').map(t => {
              const b = blockFor(t.id);
              return (
                <div key={t.id} style={{ borderRadius: 10, background: c.surf, border: `1px solid ${c.bord}`, padding: '10px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: prioColor(t.priority), flexShrink: 0 }}/>
                    <span style={{ fontSize: 12.5, color: c.text, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title || t.text}</span>
                  </div>
                  {b ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 7 }}>
                      <span style={{ fontSize: 11, color: c.sub }}>{b.date === dayStr ? 'Today' : b.date} · {hhmm(parseHM(b.start))}–{hhmm(parseHM(b.end))}</span>
                      <button onClick={() => setEditTask(t)} style={{ fontSize: 11, color: c.accent, background: 'none', border: 'none', cursor: 'pointer' }}>edit</button>
                      <button onClick={() => clearBlock(t.id)} style={{ fontSize: 11, color: c.mut, background: 'none', border: 'none', cursor: 'pointer' }}>clear</button>
                    </div>
                  ) : (
                    <button onClick={() => setEditTask(t)} style={{ marginTop: 7, fontSize: 11.5, color: c.accent, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: 0 }}>+ Set time block</button>
                  )}
                </div>
              );
            })}
            {personTasks.filter(t => t.status !== 'done').length === 0 && <div style={{ fontSize: 12.5, color: c.mut, padding: '14px 4px' }}>No open tasks.</div>}
          </div>
        </div>
      </div>

      {editTask && <TimeBlockModal task={editTask} dayStr={dayStr} existing={blockFor(editTask.id)} onClose={() => setEditTask(null)} onSave={(blk) => { saveBlock(editTask.id, blk); setEditTask(null); }}/>}
    </div>
  );
}

function navBtn(c) { return { width: 32, height: 32, borderRadius: 8, border: `1px solid ${c.bord}`, background: 'transparent', color: c.text, cursor: 'pointer', fontSize: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }; }

function TimeBlockModal({ task, dayStr, existing, onClose, onSave }) {
  const c = useC();
  const [date, setDate] = useState(existing?.date || dayStr);
  const [start, setStart] = useState(existing?.start || '10:00');
  const [end, setEnd] = useState(existing?.end || '12:00');
  const [repeat, setRepeat] = useState(existing?.repeat || 'none');
  const valid = start && end && end > start;
  return (
    <Modal onClose={onClose} title="Set time block" width={420}>
      <div style={{ fontSize: 13.5, color: c.sub, marginBottom: 16 }}>{task.title || task.text}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <div style={lblS(c)}>Date</div>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inpS(c)}/>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div><div style={lblS(c)}>Start</div><input type="time" value={start} onChange={e => setStart(e.target.value)} style={inpS(c)}/></div>
          <div><div style={lblS(c)}>End</div><input type="time" value={end} onChange={e => setEnd(e.target.value)} style={inpS(c)}/></div>
        </div>
        <div>
          <div style={lblS(c)}>Repeat</div>
          <Sel value={repeat} onChange={e => setRepeat(e.target.value)}>
            <option value="none">Does not repeat</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </Sel>
        </div>
        {!valid && <div style={{ fontSize: 12, color: '#F87171' }}>End time must be after start time.</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Btn v="ghost" onClick={onClose}>Cancel</Btn>
          <Btn onClick={() => onSave({ date, start, end, repeat })} disabled={!valid}>Save block</Btn>
        </div>
      </div>
    </Modal>
  );
}
function lblS(c) { return { fontSize: 11, fontWeight: 600, color: c.mut, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }; }
function inpS(c) { return { width: '100%', background: c.inp, border: `1.5px solid ${c.inpB}`, borderRadius: 10, padding: '9px 12px', color: c.text, fontSize: 13, outline: 'none', boxSizing: 'border-box' }; }

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
    const colors={'1':'#ac725e','2':'#d06b64','3':'#f83a22','4':'#fa573c','5':'#ff7537','6':'#ffad46','7':'#42d692','8':'#16a765','9':'#7bd148','10':'#b3dc6c','11':'#fbe983','default':'#0070F3'};
    return colors[ev.colorId]||'#0070F3';
  };

  // ── NOT CONNECTED ──────────────────────────────────────────────────────────
  if(status==='idle'||status==='error') return(
    <div style={{ maxWidth:640,margin:'0 auto',padding:'24px 0' }}>
      <EmptyState
        icon="📅"
        title="Connect your calendar"
        desc="See your meetings and standups inline, auto-detect recurring standups, and import attendees as team members — all in one view."
        primary={CLIENT_ID?{label:'Connect Google Calendar',onClick:connect}:undefined}
        secondary={CLIENT_ID?{label:'Why connect?',onClick:()=>{}}:undefined}
      />
      {error&&<div style={{ background:'rgba(239,68,68,.1)',border:'1px solid rgba(239,68,68,.25)',borderRadius:10,padding:'12px 16px',fontSize:13,color:'#F87171',marginBottom:20,maxWidth:560,marginLeft:'auto',marginRight:'auto' }}>{error}</div>}

      {/* Benefits */}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,maxWidth:560,margin:'0 auto 24px' }}>
        {[
          ['🗓️','Meetings inline','See today\u2019s events beside your tasks'],
          ['◉','Auto standups','Detect recurring standups automatically'],
          ['⚇','Import people','Pull attendees in as team members'],
        ].map(([ic,t,d])=>(
          <Card key={t} style={{ padding:'16px 14px',textAlign:'center' }}>
            <div style={{ fontSize:22,marginBottom:8 }}>{ic}</div>
            <div style={{ fontSize:13,fontWeight:700,color:c.text,marginBottom:4 }}>{t}</div>
            <div style={{ fontSize:11,color:c.mut,lineHeight:1.5 }}>{d}</div>
          </Card>
        ))}
      </div>

      {/* Preview UI — placeholder upcoming events so the empty state feels valuable */}
      <Card style={{ padding:0,maxWidth:560,margin:'0 auto 20px',overflow:'hidden',opacity:.85 }}>
        <div style={{ padding:'12px 18px',borderBottom:`1px solid ${c.bord}`,display:'flex',alignItems:'center',justifyContent:'space-between' }}>
          <span style={{ fontSize:13,fontWeight:700,color:c.text }}>Preview · upcoming</span>
          <span style={{ fontSize:11,color:c.mut }}>Sample data</span>
        </div>
        {[
          ['09:30','Daily standup','#34D399'],
          ['11:00','Sprint planning','#3B9EFF'],
          ['15:30','1:1 with manager','#FBBF24'],
        ].map(([time,title,col])=>(
          <div key={title} style={{ display:'flex',alignItems:'center',gap:14,padding:'12px 18px',borderBottom:`1px solid ${c.bord}` }}>
            <span style={{ fontSize:12,color:c.mut,fontVariantNumeric:'tabular-nums',width:46 }}>{time}</span>
            <span style={{ width:3,height:28,borderRadius:2,background:col,flexShrink:0 }}/>
            <span style={{ fontSize:13,color:c.sub,flex:1 }}>{title}</span>
          </div>
        ))}
        <div style={{ padding:'10px 18px',fontSize:11,color:c.mut,textAlign:'center' }}>Your real events appear here once connected</div>
      </Card>

      {/* Setup instructions only when no client id, collapsed-feel card */}
      {!CLIENT_ID&&(
        <div style={{ background:'rgba(245,158,11,.06)',border:'1px solid rgba(245,158,11,.2)',borderRadius:14,padding:'20px 22px',maxWidth:560,margin:'0 auto' }}>
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
          <div style={{ marginTop:14,padding:'10px 14px',background:'rgba(0,112,243,.08)',borderRadius:8,fontSize:12,color:'#3B9EFF' }}>
            After completing these steps, add REACT_APP_GOOGLE_CLIENT_ID to Vercel and redeploy. The Connect button will then work.
          </div>
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
        <div style={{ background:'rgba(0,112,243,.08)',border:'1px solid rgba(0,112,243,.25)',borderRadius:12,padding:'14px 18px',marginBottom:16,display:'flex',alignItems:'center',gap:14,flexWrap:'wrap' }}>
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
              <div key={ev.id} onClick={()=>{setSelectedStandup(ev);setShowStandupPicker(false);}} style={{ padding:'12px 16px',borderRadius:10,border:`1.5px solid ${selectedStandup?.id===ev.id?'#0070F3':c.bord}`,background:selectedStandup?.id===ev.id?'rgba(0,112,243,.1)':c.surf,cursor:'pointer',transition:'all .2s' }}>
                <div style={{ display:'flex',alignItems:'center',gap:10 }}>
                  <div style={{ width:10,height:10,borderRadius:'50%',background:eventColor(ev),flexShrink:0 }}/>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:14,fontWeight:600,color:c.text }}>{ev.summary}</div>
                    <div style={{ fontSize:12,color:c.mut,marginTop:2 }}>{fmtTime(ev.start?.dateTime)} · {ev.attendees?.length||0} attendees · recurring</div>
                  </div>
                </div>
                {ev.attendees&&ev.attendees.length>0&&(
                  <div style={{ marginTop:8,paddingTop:8,borderTop:`1px solid ${c.bord}`,display:'flex',flexWrap:'wrap',gap:4 }}>
                    {ev.attendees.slice(0,6).map(a=><span key={a.email} style={{ fontSize:10,background:'rgba(0,112,243,.1)',color:'#3B9EFF',padding:'2px 7px',borderRadius:20 }}>{a.displayName||a.email}</span>)}
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
            <button key={v} onClick={()=>setView(v)} style={{ padding:'5px 12px',borderRadius:7,border:'none',background:view===v?'rgba(0,112,243,.2)':'transparent',color:view===v?'#3B9EFF':c.mut,cursor:'pointer',fontSize:12,fontWeight:view===v?700:400,textTransform:'capitalize' }}>{v}</button>
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
                <div key={i} style={{ padding:'10px 8px',textAlign:'center',borderLeft:`1px solid ${c.bord}`,background:isToday?'rgba(0,112,243,.04)':'transparent' }}>
                  <div style={{ fontSize:11,color:isToday?'#0070F3':c.mut,textTransform:'uppercase',letterSpacing:'.06em',fontWeight:600,marginBottom:5 }}>{DAYS[i]}</div>
                  <div style={{ display:'inline-flex',alignItems:'center',justifyContent:'center',width:32,height:32,borderRadius:'50%',background:isToday?'#0070F3':'transparent',fontSize:14,fontWeight:isToday?700:400,color:isToday?'#fff':c.text }}>{day.getDate()}</div>
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
                <div key={i} style={{ borderLeft:`1px solid ${c.bord}`,position:'relative',background:isToday?'rgba(0,112,243,.02)':'transparent' }}>
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
                <div key={i} style={{ minHeight:80,padding:'6px',borderRight:(i+1)%7!==0?`1px solid ${c.bord}`:'none',borderBottom:`1px solid ${c.bord}`,background:isToday?'rgba(0,112,243,.05)':'transparent' }}>
                  {day&&<div style={{ fontSize:12,fontWeight:isToday?700:400,color:isToday?'#3B9EFF':c.sub,width:22,height:22,borderRadius:'50%',background:isToday?'rgba(0,112,243,.15)':'transparent',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:4 }}>{day.getDate()}</div>}
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
                  {ev.attendees&&<div style={{ fontSize:11,color:'#3B9EFF',marginTop:4 }}>{ev.attendees.length} attendees</div>}
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
                      <Av member={{name:a.displayName||a.email,color:'#3B9EFF'}} size={28}/>
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
            {selectedEvent.htmlLink&&<a href={selectedEvent.htmlLink} target="_blank" rel="noreferrer" style={{ fontSize:13,color:'#3B9EFF',textDecoration:'none' }}>Open in Google Calendar →</a>}
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── SETTINGS PAGE ────────────────────────────────────────────────────────────
function AvatarAdjustModal({ url, posX=50, posY=50, zoom=1, onClose, onSave }) {
  const c=useC();
  const [x,setX]=useState(posX); const [y,setY]=useState(posY); const [z,setZ]=useState(zoom);
  const dragRef=useRef(null);
  const onDown=(e)=>{ e.preventDefault(); const startX=e.clientX??e.touches?.[0]?.clientX; const startY=e.clientY??e.touches?.[0]?.clientY; const ox=x, oy=y;
    const move=(ev)=>{ const cx=ev.clientX??ev.touches?.[0]?.clientX; const cy=ev.clientY??ev.touches?.[0]?.clientY; const dx=(cx-startX)/2.4; const dy=(cy-startY)/2.4; setX(Math.max(0,Math.min(100,ox - dx))); setY(Math.max(0,Math.min(100,oy - dy))); };
    const up=()=>{ window.removeEventListener('mousemove',move); window.removeEventListener('mouseup',up); window.removeEventListener('touchmove',move); window.removeEventListener('touchend',up); };
    window.addEventListener('mousemove',move); window.addEventListener('mouseup',up); window.addEventListener('touchmove',move); window.addEventListener('touchend',up);
  };
  return (
    <Modal onClose={onClose} title="Adjust photo" width={360}>
      <p style={{ fontSize:12.5,color:c.mut,marginBottom:14,textAlign:'center' }}>Drag the image to reposition · use the slider to zoom</p>
      <div ref={dragRef} onMouseDown={onDown} onTouchStart={onDown} style={{ width:220,height:220,borderRadius:'50%',overflow:'hidden',margin:'0 auto 16px',border:`3px solid #3B9EFF`,cursor:'grab',background:c.row,touchAction:'none' }}>
        <img src={url} alt="adjust" draggable={false} style={{ width:'100%',height:'100%',objectFit:'cover',objectPosition:`${x}% ${y}%`,transform:`scale(${z})`,transition:'none',userSelect:'none',pointerEvents:'none' }}/>
      </div>
      <div style={{ marginBottom:18 }}>
        <div style={{ fontSize:11,color:c.mut,marginBottom:5 }}>Zoom</div>
        <input type="range" min="1" max="2.5" step="0.05" value={z} onChange={e=>setZ(parseFloat(e.target.value))} style={{ width:'100%',accentColor:'#0070F3' }}/>
      </div>
      <div style={{ display:'flex',gap:8,justifyContent:'flex-end' }}>
        <Btn v="ghost" onClick={onClose}>Cancel</Btn>
        <Btn onClick={()=>onSave(Math.round(x),Math.round(y),z)}>Apply</Btn>
      </div>
    </Modal>
  );
}

function SettingsPage({ session, onBack, onSaved, team, members = [], setMembers, isManager = false }) {
  const c=useC(); const { dark, toggle }=useTheme();
  const [tab,setTab]=useState('profile'); const [name,setName]=useState(session?.user?.user_metadata?.name||'');
  const [saving,setSaving]=useState(false); const [newPw,setNewPw]=useState(''); const [pwErr,setPwErr]=useState(''); const [pwOk,setPwOk]=useState(false);
  const [openFaq,setOpenFaq]=useState(null); const [avatarUrl,setAvatarUrl]=useState(session?.user?.user_metadata?.avatar_url||'');
  const [avatarFit,setAvatarFit]=useState(session?.user?.user_metadata?.avatar_fit||'cover');
  const [avatarPos,setAvatarPos]=useState(session?.user?.user_metadata?.avatar_pos||50);
  const [avatarPosX,setAvatarPosX]=useState(session?.user?.user_metadata?.avatar_posx||50);
  const [avatarZoom,setAvatarZoom]=useState(session?.user?.user_metadata?.avatar_zoom||1);
  const [showAdjust,setShowAdjust]=useState(false);
  const fileRef=useRef();
  const save=async()=>{ setSaving(true); if(SB.IS_LIVE)await SB.updateProfile({name,avatar_url:avatarUrl,avatar_fit:avatarFit,avatar_pos:avatarPos,avatar_posx:avatarPosX,avatar_zoom:avatarZoom}); setSaving(false); onSaved({name,avatar_url:avatarUrl,avatar_fit:avatarFit,avatar_pos:avatarPos,avatar_posx:avatarPosX,avatar_zoom:avatarZoom}); };
  const changePw=async()=>{ setPwErr(''); if(newPw.length<6){setPwErr('Min 6 characters');return;} setSaving(true); const {error}=SB.IS_LIVE?await SB.updatePassword(newPw):{error:null}; if(error)setPwErr(error.message); else{setPwOk(true);setNewPw('');setTimeout(()=>setPwOk(false),3000);} setSaving(false); };
  const handleAvatar=async(e)=>{ const file=e.target.files[0]; if(!file)return; if(SB.IS_LIVE){setSaving(true);const url=await SB.uploadAvatar(session.user.id,file);if(url)setAvatarUrl(url);setSaving(false);} };
  const TABS=[{id:'profile',l:'Profile'},{id:'security',l:'Security'},{id:'appearance',l:'Appearance'},{id:'notifications',l:'Notifications'},...(isManager&&team?[{id:'team',l:'Team & invites'}]:[]),{id:'faq',l:'FAQ & Help'}];
  const tabIcon=(id)=>{ const p={width:16,height:16,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:1.8,strokeLinecap:'round',strokeLinejoin:'round'};
    switch(id){
      case 'profile': return <svg {...p}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
      case 'security': return <svg {...p}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
      case 'appearance': return <svg {...p}><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.563-2.512 5.563-5.563C21.5 5.74 17.262 2 12 2z"/></svg>;
      case 'notifications': return <svg {...p}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>;
      case 'team': return <svg {...p}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
      case 'faq': return <svg {...p}><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
      default: return null;
    }
  };
  const [chatNotifsEnabled,setChatNotifsEnabled]=useState(true);
  const [notifPerm,setNotifPerm]=useState(typeof Notification!=='undefined'?Notification.permission:'unsupported');
  const requestNotif=()=>{
    if(typeof Notification==='undefined'){ setNotifPerm('unsupported'); return; }
    if(Notification.permission==='denied'){ setNotifPerm('denied'); return; } // browser won't re-prompt
    Notification.requestPermission().then(p=>{ setNotifPerm(p); if(p==='granted'){ try{ new Notification('StandSync',{body:'Desktop notifications are on 🎉'}); }catch(e){} } });
  };
  const [soundEnabled,setSoundEnabledRaw]=useState(()=>{ try{ return localStorage.getItem('ss-sound')==='1'; }catch{ return false; } });
  const setSoundEnabled=(v)=>{ setSoundEnabledRaw(v); try{ localStorage.setItem('ss-sound',v?'1':'0'); }catch{} if(v){ try{ playChime(); }catch(e){} } };
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
          {TABS.map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={{ width:'100%',display:'flex',alignItems:'center',gap:10,padding:'10px 14px',borderRadius:10,border:'none',background:tab===t.id?'rgba(0,112,243,.15)':'transparent',color:tab===t.id?'#3B9EFF':c.mut,cursor:'pointer',fontSize:13,fontWeight:tab===t.id?700:400,marginBottom:4,textAlign:'left',transition:'all .15s' }}><span style={{ display:'flex' }}>{tabIcon(t.id)}</span>{t.l}</button>)}
        </div>
        <div style={{ animation:'fadeIn .3s ease' }}>
          {tab==='profile'&&(<Card style={{ padding:'28px' }}><h2 style={{ fontSize:16,fontWeight:700,color:c.text,marginBottom:20 }}>Profile</h2><div style={{ display:'flex',alignItems:'center',gap:16,marginBottom:16 }}><div style={{ position:'relative' }}>{avatarUrl?<div style={{ width:80,height:80,borderRadius:'50%',overflow:'hidden',border:'3px solid #3B9EFF',background:c.row }}><img src={avatarUrl} alt="av" style={{ width:'100%',height:'100%',objectFit:avatarFit==='contain'?'contain':'cover',objectPosition:avatarFit==='manual'?`${avatarPosX}% ${avatarPos}%`:'center',transform:avatarFit==='manual'?`scale(${avatarZoom})`:'none' }}/></div>:<div style={{ width:80,height:80,borderRadius:'50%',background:'rgba(0,112,243,.2)',border:'3px solid #3B9EFF',display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,fontWeight:700,color:'#3B9EFF' }}>{name?name[0].toUpperCase():'?'}</div>}<button onClick={()=>fileRef.current.click()} style={{ position:'absolute',bottom:0,right:0,width:26,height:26,borderRadius:'50%',background:'#0070F3',border:'2px solid #fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13 }}>✏️</button><input ref={fileRef} type="file" accept="image/*" onChange={handleAvatar} style={{ display:'none' }}/></div><div><div style={{ fontSize:16,fontWeight:700,color:c.text }}>{name||session?.user?.email}</div><div style={{ fontSize:13,color:c.mut }}>{session?.user?.email}</div><div style={{ display:'flex',gap:12,marginTop:6 }}><button onClick={()=>fileRef.current.click()} style={{ fontSize:12,color:'#3B9EFF',background:'none',border:'none',cursor:'pointer',padding:0 }}>Change photo</button>{avatarUrl&&<button onClick={()=>{setAvatarUrl('');setAvatarFit('cover');}} style={{ fontSize:12,color:'#F87171',background:'none',border:'none',cursor:'pointer',padding:0 }}>Delete photo</button>}</div></div></div>
            {avatarUrl&&(<div style={{ marginBottom:24,padding:'14px 16px',background:c.row,borderRadius:12 }}>
              <div style={{ fontSize:12,fontWeight:600,color:c.sub,marginBottom:8 }}>Adjust image</div>
              <div style={{ display:'flex',gap:8 }}>
                {[['cover','Fill space'],['contain','Fit whole'],['manual','Manual']].map(([v,l])=>(
                  <button key={v} onClick={()=>{ setAvatarFit(v); if(v==='manual')setShowAdjust(true); }} style={{ flex:1,padding:'7px 6px',borderRadius:8,border:`1px solid ${avatarFit===v?'#0070F3':c.bord}`,background:avatarFit===v?'rgba(0,112,243,.1)':'transparent',color:avatarFit===v?'#0070F3':c.sub,cursor:'pointer',fontSize:12,fontWeight:600 }}>{l}</button>
                ))}
              </div>
              {avatarFit==='manual'&&<button onClick={()=>setShowAdjust(true)} style={{ marginTop:10,fontSize:12,color:'#3B9EFF',background:'rgba(0,112,243,.1)',border:'1px solid rgba(0,112,243,.25)',borderRadius:8,cursor:'pointer',padding:'6px 12px',fontWeight:600 }}>↔ Drag to adjust</button>}
            </div>)}
            {showAdjust&&<AvatarAdjustModal url={avatarUrl} posX={avatarPosX} posY={avatarPos} zoom={avatarZoom} onClose={()=>setShowAdjust(false)} onSave={(x,y,z)=>{setAvatarPosX(x);setAvatarPos(y);setAvatarZoom(z);setAvatarFit('manual');setShowAdjust(false);}}/>}
            <Inp label="Display name" value={name} onChange={e=>setName(e.target.value)} style={{ marginBottom:16 }}/><Inp label="Email" value={session?.user?.email||''} disabled style={{ marginBottom:20,opacity:.6 }}/><Btn onClick={save} loading={saving}>Save changes</Btn></Card>)}
          {tab==='security'&&(<Card style={{ padding:'28px' }}><h2 style={{ fontSize:16,fontWeight:700,color:c.text,marginBottom:20 }}>Security</h2><Lbl>Change password</Lbl><Inp label="New password" type="password" value={newPw} onChange={e=>setNewPw(e.target.value)} placeholder="At least 6 characters" error={pwErr} style={{ marginBottom:16 }}/>{pwOk&&<div style={{ background:'rgba(52,211,153,.12)',border:'1px solid rgba(52,211,153,.3)',borderRadius:8,padding:'10px 14px',fontSize:13,color:'#34D399',marginBottom:14 }}>✅ Password updated</div>}<Btn onClick={changePw} loading={saving} disabled={!newPw}>Update password</Btn></Card>)}
          {tab==='appearance'&&(<Card style={{ padding:'28px' }}><h2 style={{ fontSize:16,fontWeight:700,color:c.text,marginBottom:20 }}>Appearance</h2><div style={{ display:'flex',gap:14 }}>{[{l:'Dark',i:'🌙',d:true},{l:'Light',i:'☀️',d:false}].map(opt=><div key={opt.l} onClick={()=>opt.d!==dark&&toggle()} style={{ flex:1,padding:'20px',borderRadius:14,border:`2px solid ${dark===opt.d?'#0070F3':c.bord}`,background:dark===opt.d?'rgba(0,112,243,.12)':c.surf,cursor:'pointer',textAlign:'center',transition:'all .2s' }}><div style={{ fontSize:32,marginBottom:10 }}>{opt.i}</div><div style={{ fontSize:14,fontWeight:600,color:c.text }}>{opt.l} mode</div>{dark===opt.d&&<div style={{ fontSize:11,color:'#3B9EFF',marginTop:4 }}>✓ Active</div>}</div>)}</div></Card>)}
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
                    <button onClick={()=>n.set(!n.val)} style={{ width:44,height:24,borderRadius:12,border:'none',background:n.val?'#0070F3':'rgba(128,128,128,.25)',cursor:'pointer',position:'relative',transition:'background .2s',flexShrink:0 }}>
                      <div style={{ width:18,height:18,borderRadius:'50%',background:'#fff',position:'absolute',top:3,left:n.val?23:3,transition:'left .2s',boxShadow:'0 1px 3px rgba(0,0,0,.2)' }}/>
                    </button>
                  </div>
                ))}
                {notifPerm==='granted' ? (
                  <div style={{ marginTop:14,display:'flex',alignItems:'center',gap:8,fontSize:13,color:'#34D399',background:'rgba(52,211,153,.1)',border:'1px solid rgba(52,211,153,.25)',borderRadius:8,padding:'10px 14px' }}>✅ Desktop notifications are enabled.</div>
                ) : notifPerm==='denied' ? (
                  <div style={{ marginTop:14,fontSize:13,color:c.sub,background:'rgba(245,158,11,.08)',border:'1px solid rgba(245,158,11,.3)',borderRadius:8,padding:'12px 14px',lineHeight:1.6 }}>
                    <div style={{ fontWeight:700,color:'#F59E0B',marginBottom:4 }}>Notifications are blocked for this site</div>
                    Your browser blocked them earlier, so it won't ask again — this is a browser security rule no website can override. To turn them on: click the <strong>🔒 lock icon</strong> in the address bar → <strong>Notifications</strong> → <strong>Allow</strong>, then reload.
                  </div>
                ) : notifPerm==='unsupported' ? (
                  <div style={{ marginTop:14,fontSize:13,color:c.mut,background:c.row,borderRadius:8,padding:'10px 14px' }}>This browser doesn't support desktop notifications.</div>
                ) : (
                  <button onClick={requestNotif} style={{ marginTop:14,fontSize:13,color:'#3B9EFF',background:'rgba(0,112,243,.1)',border:'1px solid rgba(0,112,243,.25)',borderRadius:8,cursor:'pointer',padding:'8px 14px',fontWeight:600 }}>Enable desktop notifications</button>
                )}
              </Card>
              <RemindersPanel/>
            </div>
          )}
          {tab==='team'&&team&&(<Card style={{ padding:'28px' }}><h2 style={{ fontSize:16,fontWeight:700,color:c.text,marginBottom:6 }}>Team & invites</h2><p style={{ fontSize:12.5,color:c.mut,marginBottom:18 }}>Share room codes and invite people to your team. To change someone's role or remove them, open their card in Team → Directory.</p><TeamSettingsTab team={team} members={members} session={session} hideMembers={true} onMembersUpdate={()=>{ if(setMembers&&SB.IS_LIVE) SB.getTeamMembers(team.id).then(m=>setMembers(m||[])); }}/></Card>)}
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
          <button onClick={()=>onStatus(task.id,next[task.status])} style={{ position:'relative',width:22,height:22,borderRadius:'50%',flexShrink:0,marginTop:1,border:`2px solid ${task.status==='done'?'#34D399':'rgba(128,128,128,.3)'}`,background:task.status==='done'?'#34D399':'transparent',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',transition:'all .2s' }}>
            {task.status==='done'&&<><span className="check-burst" style={{ position:'absolute',inset:-2,borderRadius:'50%',background:'rgba(52,211,153,.5)',pointerEvents:'none' }}/><svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path className="check-path" d="M2 5l2.5 2.5L8 3" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></>}
          </button>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:14,color:task.status==='done'?c.mut:c.text,textDecoration:task.status==='done'?'line-through':'none',lineHeight:1.4,marginBottom:6 }}>{task.title}</div>
            <div style={{ display:'flex',flexWrap:'wrap',gap:5 }}><PBadge priority={task.priority}/><SBadge status={task.status}/>{task.timeline&&<span style={{ fontSize:10,color:c.mut,background:'rgba(128,128,128,.1)',padding:'3px 8px',borderRadius:20 }}>🕐 {task.timeline}</span>}</div>
          </div>
        </div>
        {task.manager_note&&<div style={{ padding:'8px 12px',background:'rgba(129,140,248,.1)',border:'1px solid rgba(129,140,248,.2)',borderRadius:8,fontSize:12,color:c.sub,marginTop:8 }}><span style={{ color:'#3B9EFF',fontWeight:700 }}>📌 Note: </span>{task.manager_note}</div>}
        {task.blocker&&<div style={{ padding:'8px 12px',background:'rgba(239,68,68,.1)',border:'1px solid rgba(239,68,68,.25)',borderRadius:8,fontSize:12,color:'#F87171',marginTop:8 }}><span style={{ fontWeight:700 }}>⚠️ Blocker: </span>{task.blocker}</div>}
      </div>
      <div style={{ padding:'0 16px 12px',display:'flex',gap:6,flexWrap:'wrap' }}>
        <button onClick={()=>onStatus(task.id,next[task.status])} style={{ fontSize:11,padding:'5px 12px',borderRadius:8,border:`1px solid ${s.color}40`,background:s.bg,color:s.color,cursor:'pointer',fontWeight:600 }}>{nLabel[task.status]}</button>
        {task.status!=='blocked'&&<button onClick={()=>{onStatus(task.id,'blocked');setShowB(true);}} style={{ fontSize:11,padding:'5px 12px',borderRadius:8,border:'1px solid rgba(239,68,68,.3)',background:'rgba(239,68,68,.08)',color:'#F87171',cursor:'pointer' }}>⚠️ Report blocker</button>}
        <button onClick={()=>setShowB(!showB)} style={{ fontSize:11,padding:'5px 10px',borderRadius:8,border:`1px solid ${c.bord}`,background:'transparent',color:c.mut,cursor:'pointer',marginLeft:'auto' }}>Note</button>
      </div>
      {showB&&<div style={{ padding:'0 16px 14px',display:'flex',gap:8 }}><input value={btext} onChange={e=>setBtext(e.target.value)} placeholder="What is blocking it? e.g. Waiting on Design team for assets" style={{ flex:1,background:c.inp,border:`1px solid ${c.inpB}`,borderRadius:8,padding:'8px 12px',color:c.text,fontSize:13,outline:'none' }}/><Btn v="danger" onClick={()=>{onBlocker(task.id,btext);setShowB(false);}} style={{ flexShrink:0,padding:'8px 14px' }}>Send</Btn></div>}
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
  const color=myMember?.color||'#3B9EFF';
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
                  style={{ padding:'6px 8px',borderRadius:9,border:'none',background:isA?'rgba(0,112,243,.16)':'transparent',color:isA?'#C4B5FD':c.mut,cursor:'pointer',fontWeight:isA?600:400,display:'flex',alignItems:'center',gap:5,transition:'all .15s',whiteSpace:'nowrap',flexShrink:0,position:'relative' }}>
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
                <StatCard label="Total" value={mine.length} color="#3B9EFF"/><StatCard label="In progress" value={mine.filter(t=>t.status==='in-progress').length} color="#38BDF8"/><StatCard label="Done" value={done} color="#34D399"/><StatCard label="Blocked" value={mine.filter(t=>t.status==='blocked').length} color={mine.some(t=>t.status==='blocked')?'#EF4444':'#34D399'}/>
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
        {activeTab==='chat'&&<RichChatPanel messages={messages} onSend={onSendMessage} session={session} members={members} chatTheme={chatTheme} onChangeTheme={onChangeTheme} teamId={team?.id||'demo'}/>}
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
                <span style={{ fontSize:10,padding:'2px 8px',borderRadius:20,background:'rgba(0,112,243,.1)',color:'#3B9EFF' }}>{t.priority}</span>
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
                {[{l:'Total',v:total,c:'#3B9EFF',i:'📋'},{l:'Done',v:doneCnt,c:'#34D399',i:'✅'},{l:'In progress',v:inProg,c:'#38BDF8',i:'⚡'},{l:'Blocked',v:blkd,c:blkd>0?'#EF4444':'#34D399',i:blkd>0?'⚠️':'✓'}].map(s=>(
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
                  <span style={{ fontSize:13,fontWeight:700,color:pctDone>=80?'#34D399':pctDone>=50?'#3B9EFF':'#F97316' }}>{pctDone}%</span>
                </div>
                <Bar pct={pctDone} h={10} color="linear-gradient(90deg,#0070F3,#34D399)"/>
                <div style={{ display:'flex',gap:16,marginTop:12 }}>
                  {Object.entries(byPri).map(([p,v])=>v>0&&<div key={p} style={{ fontSize:12,color:c.mut }}><span style={{ fontSize:11,padding:'1px 7px',borderRadius:20,background:'rgba(0,112,243,.1)',color:'#3B9EFF',marginRight:4 }}>{p}</span>{v}</div>)}
                </div>
              </Card>
              {/* Self tasks summary */}
              <Card style={{ padding:'16px 20px',marginBottom:16 }}>
                <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8 }}>
                  <span style={{ fontSize:13,fontWeight:600,color:c.text }}>✨ Personal tasks</span>
                  <button onClick={()=>setActiveTab('self')} style={{ fontSize:12,color:'#3B9EFF',background:'none',border:'none',cursor:'pointer' }}>Manage →</button>
                </div>
                <div style={{ fontSize:24,fontWeight:800,color:'#3B9EFF',marginBottom:4 }}>{selfDone}/{selfTasks.length}</div>
                <Bar pct={selfTasks.length?Math.round(selfDone/selfTasks.length*100):0} h={6} color="#3B9EFF"/>
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
function LiveTab({ tasks: allTasks, members, onStatus, onPriority, onNote, onAddTask, onDelete, session, isManager = true }) {
  const c=useC(); const [fu,setFu]=useState('all'); const [fs,setFs]=useState('all'); const [showModal,setShowModal]=useState(false);
  const myEmail=(session?.user?.email||'').toLowerCase();
  // The task LIST is self-only for members; the team STATS/progress are always team-wide.
  const tasks=isManager?allTasks:allTasks.filter(t=>(t.assignee_email||'').toLowerCase()===myEmail);
  const filtered=tasks.filter(t=>fu==='all'||t.assignee_email===fu).filter(t=>fs==='all'||t.status===fs);
  // Team-wide totals (everyone sees the whole team's progress, even members)
  const total=allTasks.length,done=allTasks.filter(t=>t.status==='done').length,inProg=allTasks.filter(t=>t.status==='in-progress').length,blocked=allTasks.filter(t=>t.status==='blocked').length,todo=allTasks.filter(t=>t.status==='todo').length,pct=total?Math.round(done/total*100):0;
  // My own counts (for the member list header)
  const myDone=tasks.filter(t=>t.status==='done').length;
  return (
    <div>
      <div style={{ display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12,marginBottom:20 }}>
        <StatCard label="Total" value={total} color="#3B9EFF" icon="📋"/><StatCard label="To do" value={todo} color="#94A3B8" icon="⭕"/><StatCard label="In progress" value={inProg} color="#38BDF8" icon="⚡"/><StatCard label="Done" value={done} color="#34D399" icon="✅"/><StatCard label="Blocked" value={blocked} color={blocked>0?'#EF4444':'#34D399'} icon="⚠️" sub={blocked>0?'needs attention':'all clear'}/>
      </div>
      {total>0&&<Card style={{ padding:'14px 18px',marginBottom:16 }}><div style={{ display:'flex',justifyContent:'space-between',marginBottom:8 }}><span style={{ fontSize:13,color:c.mut }}>Team progress{!isManager?<span style={{ color:c.mut }}> · you: {myDone}/{tasks.length} done</span>:''}</span><span style={{ fontSize:13,fontWeight:700,color:'#3B9EFF' }}>{pct}% · {done}/{total}</span></div><Bar pct={pct} h={8} color="linear-gradient(90deg,#0070F3,#34D399)"/></Card>}
      <Card style={{ overflow:'hidden' }}>
        <div style={{ padding:'12px 16px',borderBottom:`1px solid ${c.bord}`,display:'flex',gap:8,flexWrap:'wrap',alignItems:'center' }}>
          <div style={{ display:'flex',gap:5,flex:1,flexWrap:'wrap',alignItems:'center' }}>{!isManager&&<span style={{ fontSize:12.5,fontWeight:700,color:c.text,marginRight:4 }}>My tasks</span>}{(isManager?[{v:'all',l:'All'},...members.map(m=>({v:m.email,l:(m.name||m.email).split(' ')[0]}))]:[]).map(f=><button key={f.v} onClick={()=>setFu(f.v)} style={{ fontSize:12,padding:'5px 12px',borderRadius:20,border:`1px solid ${c.bord}`,background:fu===f.v?'rgba(129,140,248,.2)':'transparent',color:fu===f.v?'#3B9EFF':c.mut,cursor:'pointer',fontWeight:fu===f.v?700:400,transition:'all .15s' }}>{f.l}</button>)}</div>
          <div style={{ display:'flex',gap:5 }}>{['all','todo','in-progress','done','blocked'].map(s=><button key={s} onClick={()=>setFs(s)} style={{ fontSize:11,padding:'4px 10px',borderRadius:20,border:`1px solid ${c.bord}`,background:fs===s?'rgba(128,128,128,.12)':'transparent',color:c.mut,cursor:'pointer',fontWeight:fs===s?700:400,textTransform:'capitalize' }}>{s==='all'?'All':s.replace('-',' ')}</button>)}</div>
          {isManager
            ? <Btn onClick={()=>setShowModal(true)} style={{ padding:'7px 14px',fontSize:12,background:'linear-gradient(135deg,#0070F3,#3B9EFF)',border:'none',flexShrink:0 }}>+ Assign task</Btn>
            : <Btn onClick={()=>setShowModal(true)} style={{ padding:'7px 14px',fontSize:12,background:'linear-gradient(135deg,#0070F3,#3B9EFF)',border:'none',flexShrink:0 }}>+ Add my task</Btn>}
        </div>
        {filtered.length===0?<div style={{ padding:'40px',textAlign:'center',color:c.mut,fontSize:14 }}>{(isManager?total:tasks.length)===0?(isManager?'⏳ Waiting for team to add tasks...':'You have no tasks yet — add one above.'):'No tasks match this filter'}</div>
          :filtered.map((t,i)=><MgrRow key={t.id} idx={i} task={t} members={members} onStatus={onStatus} onPriority={onPriority} onNote={onNote} onDelete={onDelete} session={session} isManager={isManager}/>)}
      </Card>
      {showModal&&<AssignModal members={members} onClose={()=>setShowModal(false)} onAdd={onAddTask} isManager={isManager} session={session}/>}
    </div>
  );
}

function MgrRow({ task, members, onStatus, onPriority, onNote, onDelete, session, isManager = true, idx = 0 }) {
  const c=useC(); const [showN,setShowN]=useState(false); const [note,setNote]=useState(task.manager_note||'');
  const member=members.find(m=>m.email===task.assignee_email); const p=getPriority(task.priority);
  // Proper status cycle: todo → in-progress → done → todo. Managers and the
  // assigned member can both move a task through any status.
  const cycle={'todo':'in-progress','in-progress':'done','done':'todo','blocked':'in-progress'};
  const setStatusTo=(s)=>onStatus(task.id,s);
  return (
    <div style={{ borderBottom:`1px solid ${c.bord}`,transition:'background .15s',animation:`slideIn .35s cubic-bezier(.22,1,.36,1) both`,animationDelay:`${Math.min(idx*0.035,0.5)}s` }} onMouseEnter={e=>e.currentTarget.style.background=c.row} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
      <div style={{ display:'flex',alignItems:'center',gap:10,padding:'11px 16px' }}>
        <button onClick={()=>setStatusTo(cycle[task.status]||'in-progress')} title={`Mark ${cycle[task.status]==='done'?'done':cycle[task.status]==='in-progress'?'in progress':'to do'}`} style={{ position:'relative',width:20,height:20,borderRadius:'50%',flexShrink:0,border:`2px solid ${task.status==='done'?'#34D399':task.status==='in-progress'?'#38BDF8':'rgba(128,128,128,.3)'}`,background:task.status==='done'?'#34D399':'transparent',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',transition:'all .2s' }}>
          {task.status==='done'&&<><span className="check-burst" style={{ position:'absolute',inset:-2,borderRadius:'50%',background:'rgba(52,211,153,.5)',pointerEvents:'none' }}/><svg width="9" height="9" viewBox="0 0 10 10" fill="none"><path className="check-path" d="M2 5l2.5 2.5L8 3" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></>}
          {task.status==='in-progress'&&<span style={{ width:7,height:7,borderRadius:'50%',background:'#38BDF8' }}/>}
        </button>
        <div style={{ width:7,height:7,borderRadius:'50%',background:p.color,flexShrink:0 }}/>
        <span style={{ flex:1,fontSize:13,color:task.status==='done'?c.mut:c.text,textDecoration:task.status==='done'?'line-through':'none',lineHeight:1.4 }}>{task.title}</span>
        {task.label&&<span style={{ fontSize:10,fontWeight:700,color:task.label_color||'#0070F3',background:(task.label_color||'#0070F3')+'1f',border:`1px solid ${(task.label_color||'#0070F3')}44`,padding:'2px 8px',borderRadius:6,whiteSpace:'nowrap' }}>{task.label}</span>}
        {task._carriedOver&&<span className="ss-tip" data-tip={'Carried over from '+(task._standupDate||'a previous day')+' — still unfinished'} style={{ fontSize:10,fontWeight:700,color:'#DC2626',background:'rgba(220,38,38,.12)',border:'1px solid rgba(220,38,38,.3)',padding:'2px 7px',borderRadius:6,whiteSpace:'nowrap',display:'inline-flex',alignItems:'center',gap:3 }}>⚠️ Backlog</span>}
        {task.blocker&&<span style={{ fontSize:10,color:'#F87171',background:'rgba(239,68,68,.12)',border:'1px solid rgba(239,68,68,.25)',padding:'2px 7px',borderRadius:6,whiteSpace:'nowrap' }}>⚠️ Blocked</span>}
        {task.timeline&&<span style={{ fontSize:11,color:c.mut,whiteSpace:'nowrap' }}>🕐 {task.timeline}</span>}
        {member&&(
          <span className="ss-tip" data-tip={(member.name||member.email)+(member.email?` · ${member.email}`:'')}
            style={{ display:'inline-flex',alignItems:'center',gap:6,background:c.row,border:`1px solid ${c.bord}`,borderRadius:20,padding:'2px 9px 2px 2px',flexShrink:0,position:'relative',cursor:'default' }}>
            <Av member={member} size={26} url={member.avatar_url}/>
            <span style={{ fontSize:12,fontWeight:600,color:c.sub,whiteSpace:'nowrap',maxWidth:90,overflow:'hidden',textOverflow:'ellipsis' }}>{(member.name||member.email.split('@')[0]).split(' ')[0]}</span>
          </span>
        )}
        {/* Status dropdown — explicit control for every status */}
        <select value={task.status} onChange={e=>setStatusTo(e.target.value)} style={{ background:'transparent',border:`1px solid ${c.bord}`,borderRadius:6,color:c.sub,fontSize:10.5,cursor:'pointer',outline:'none',fontWeight:600,padding:'3px 5px' }}>
          {['todo','in-progress','done','blocked'].map(s=><option key={s} value={s} style={{ background:c.dark?'#0D0B24':'#fff',color:c.text }}>{s==='todo'?'To do':s==='in-progress'?'In progress':s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
        </select>
        <select value={task.priority} onChange={e=>onPriority(task.id,e.target.value)} style={{ background:'transparent',border:'none',color:p.color,fontSize:10,cursor:'pointer',outline:'none',fontWeight:700,letterSpacing:'.05em',textTransform:'uppercase' }}>
          {['critical','high','medium','low'].map(v=><option key={v} value={v} style={{ background:c.dark?'#0D0B24':'#fff',color:c.text }}>{v}</option>)}
        </select>
        <button onClick={()=>setShowN(!showN)} style={{ background:task.manager_note?'rgba(129,140,248,.15)':'transparent',border:task.manager_note?'1px solid rgba(129,140,248,.3)':`1px solid ${c.bord}`,borderRadius:6,cursor:'pointer',padding:'3px 6px',color:task.manager_note?'#3B9EFF':c.mut,fontSize:12 }}>📌</button>
        {onDelete&&<button onClick={()=>{ if(window.confirm('Delete this task?')) onDelete(task.id); }} title="Delete task" style={{ background:'transparent',border:`1px solid ${c.bord}`,borderRadius:6,cursor:'pointer',padding:'3px 7px',color:c.mut,fontSize:12 }} onMouseEnter={e=>{e.currentTarget.style.color='#F87171';e.currentTarget.style.borderColor='rgba(239,68,68,.3)';}} onMouseLeave={e=>{e.currentTarget.style.color=c.mut;e.currentTarget.style.borderColor=c.bord;}}>🗑</button>}
      </div>
      {task.blocker&&<div style={{ padding:'0 16px 10px 54px' }}><div style={{ fontSize:12,color:'#F87171',background:'rgba(239,68,68,.08)',border:'1px solid rgba(239,68,68,.2)',borderRadius:8,padding:'8px 12px' }}>⚠️ {task.blocker}</div></div>}
      {showN&&<div style={{ padding:'0 16px 12px 54px',display:'flex',gap:8 }}><input value={note} onChange={e=>setNote(e.target.value)} placeholder="Add a note..." style={{ flex:1,background:c.inp,border:`1px solid ${c.inpB}`,borderRadius:8,padding:'8px 12px',color:c.text,fontSize:13,outline:'none' }}/><Btn onClick={()=>{onNote(task.id,note);setShowN(false);}} style={{ flexShrink:0,padding:'8px 14px' }}>Save</Btn></div>}
    </div>
  );
}

function AssignModal({ members, onClose, onAdd, isManager = true, session }) {
  const c=useC();
  const myEmail=session?.user?.email||members[0]?.email||'';
  const me=members.find(m=>m.email===myEmail);
  const [title,setTitle]=useState(''); const [assignee,setAssignee]=useState(isManager?(members[0]?.email||''):myEmail); const [priority,setPriority]=useState('medium'); const [timeline,setTimeline]=useState('Today EOD (6 PM)'); const [note,setNote]=useState('');
  const [schedOn,setSchedOn]=useState(false); const [sDate,setSDate]=useState(()=>new Date().toISOString().slice(0,10)); const [sStart,setSStart]=useState('10:00'); const [sEnd,setSEnd]=useState('12:00');
  const [schedTouched,setSchedTouched]=useState(false); // once the user hand-edits, stop auto-deriving
  const [labelId,setLabelId]=useState(''); const [customLabel,setCustomLabel]=useState(''); const [customColor,setCustomColor]=useState('#0070F3');

  // Translate the chosen timeline into a concrete date + start/end window.
  // Start = now (when the task is assigned); End = the deadline the timeline implies.
  const blockFromTimeline=(tl)=>{
    const now=new Date();
    const hhmm=(d)=>`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    const iso=(d)=>d.toISOString().slice(0,10);
    const tomorrow=new Date(now); tomorrow.setDate(now.getDate()+1);
    const endOn=(base,h,m=0)=>{ const d=new Date(base); d.setHours(h,m,0,0); return d; };
    let date=iso(now), startD=now, endD;
    switch(tl){
      case 'Today noon (12 PM)': endD=endOn(now,12); break;
      case 'Today 3 PM': endD=endOn(now,15); break;
      case 'Today EOD (6 PM)': endD=endOn(now,18); break;
      case 'Tomorrow morning': date=iso(tomorrow); startD=endOn(tomorrow,9); endD=endOn(tomorrow,12); break;
      case 'Tomorrow EOD': date=iso(tomorrow); startD=endOn(tomorrow,9); endD=endOn(tomorrow,18); break;
      case 'This week': { const fri=new Date(now); const add=(5-now.getDay()+7)%7; fri.setDate(now.getDate()+(add||0)); date=iso(now); startD=now; endD=endOn(now,18); break; }
      default: endD=endOn(now,18);
    }
    // If the implied end is already past for "today" options, give at least a 1h block from now.
    if(endD<=startD){ endD=new Date(startD.getTime()+60*60000); }
    return { date, start: hhmm(startD), end: hhmm(endD) };
  };
  // When the time-block is switched on (or timeline changes while on & untouched), auto-fill it.
  const enableSched=(on)=>{
    setSchedOn(on);
    if(on && !schedTouched){ const b=blockFromTimeline(timeline); setSDate(b.date); setSStart(b.start); setSEnd(b.end); }
  };
  useEffect(()=>{ if(schedOn && !schedTouched){ const b=blockFromTimeline(timeline); setSDate(b.date); setSStart(b.start); setSEnd(b.end); } /* eslint-disable-next-line */ },[timeline]);

  const submit=()=>{ if(!title.trim())return; const targetEmail=isManager?assignee:myEmail; const m=members.find(x=>x.email===targetEmail); const payload={title:title.trim(),assignee_email:targetEmail,assignee_name:m?.name||targetEmail,priority,status:'todo',timeline,manager_note:isManager?note:'',notes:'',blocker:''}; if(labelId==='__custom'&&customLabel.trim()){ payload.label=customLabel.trim(); payload.label_color=customColor; } else if(labelId){ const L=TASK_LABELS.find(x=>x.id===labelId); if(L){ payload.label=L.label; payload.label_color=L.color; } } if(schedOn&&sStart&&sEnd&&sEnd>sStart) payload._timeBlock={date:sDate,start:sStart,end:sEnd,repeat:'none'}; onAdd(payload); onClose(); };
  return <Modal onClose={onClose} title={isManager?'Assign a task':'Add my task'}><Inp value={title} onChange={e=>setTitle(e.target.value)} placeholder="Task description..." style={{ marginBottom:12 }} autoFocus/><div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10 }}>{isManager?<Sel label="Assign to" value={assignee} onChange={e=>setAssignee(e.target.value)}>{members.map(m=><option key={m.id||m.email} value={m.email}>{m.name||m.email}</option>)}</Sel>:<div><Lbl>Assigned to</Lbl><div style={{ display:'flex',alignItems:'center',gap:8,padding:'9px 12px',background:c.inp,border:`1px solid ${c.inpB}`,borderRadius:10 }}>{me&&<Av member={me} size={22} url={me.avatar_url}/>}<span style={{ fontSize:13,color:c.text }}>{me?.name||myEmail.split('@')[0]} (you)</span></div></div>}<Sel label="Priority" value={priority} onChange={e=>setPriority(e.target.value)}>{['critical','high','medium','low'].map(v=><option key={v} value={v}>{v.charAt(0).toUpperCase()+v.slice(1)}</option>)}</Sel></div><Sel label="Timeline" value={timeline} onChange={e=>setTimeline(e.target.value)} style={{ marginBottom:10 }}>{['Today noon (12 PM)','Today 3 PM','Today EOD (6 PM)','Tomorrow morning','Tomorrow EOD','This week'].map(t=><option key={t} value={t}>{t}</option>)}</Sel>{isManager&&<Inp value={note} onChange={e=>setNote(e.target.value)} placeholder="Note to team member (optional)" style={{ marginBottom:12 }}/>}
    <div style={{ marginBottom:14 }}>
      <Lbl>Label (optional)</Lbl>
      <div style={{ display:'flex',gap:6,flexWrap:'wrap',marginTop:2 }}>
        {TASK_LABELS.map(L=>(
          <button key={L.id} onClick={()=>setLabelId(labelId===L.id?'':L.id)} style={{ fontSize:11.5,fontWeight:600,padding:'4px 11px',borderRadius:20,cursor:'pointer',border:`1px solid ${labelId===L.id?L.color:c.bord}`,background:labelId===L.id?L.color+'22':'transparent',color:labelId===L.id?L.color:c.sub }}>{L.label}</button>
        ))}
        <button onClick={()=>setLabelId(labelId==='__custom'?'':'__custom')} style={{ fontSize:11.5,fontWeight:600,padding:'4px 11px',borderRadius:20,cursor:'pointer',border:`1px dashed ${labelId==='__custom'?customColor:c.bord}`,background:'transparent',color:labelId==='__custom'?customColor:c.mut }}>+ Custom</button>
      </div>
      {labelId==='__custom'&&(
        <div style={{ display:'flex',gap:8,alignItems:'center',marginTop:8 }}>
          <input value={customLabel} onChange={e=>setCustomLabel(e.target.value)} placeholder="Label name" style={{ flex:1,...inpS(c) }}/>
          <input type="color" value={customColor} onChange={e=>setCustomColor(e.target.value)} style={{ width:38,height:38,border:`1px solid ${c.inpB}`,borderRadius:8,background:'transparent',cursor:'pointer',padding:2 }}/>
        </div>
      )}
    </div>
    <div style={{ marginBottom:14 }}>
      <label style={{ display:'flex',alignItems:'center',gap:8,cursor:'pointer',fontSize:13,color:c.sub }}>
        <input type="checkbox" checked={schedOn} onChange={e=>enableSched(e.target.checked)} style={{ accentColor:'#0070F3' }}/>
        Add a time block to the calendar
      </label>
      {schedOn&&<>
      <div style={{ fontSize:11,color:c.mut,marginTop:6 }}>Auto-set from your timeline ({timeline}) — adjust if needed.</div>
      <div style={{ display:'grid',gridTemplateColumns:'1.3fr 1fr 1fr',gap:8,marginTop:8 }}>
        <input type="date" value={sDate} onChange={e=>{setSDate(e.target.value);setSchedTouched(true);}} style={inpS(c)}/>
        <input type="time" value={sStart} onChange={e=>{setSStart(e.target.value);setSchedTouched(true);}} style={inpS(c)}/>
        <input type="time" value={sEnd} onChange={e=>{setSEnd(e.target.value);setSchedTouched(true);}} style={inpS(c)}/>
      </div></>}
    </div>
    <div style={{ display:'flex',gap:8,justifyContent:'flex-end' }}><Btn v="ghost" onClick={onClose}>Cancel</Btn><Btn onClick={submit} disabled={!title.trim()}>{isManager?'Assign task':'Add task'}</Btn></div></Modal>;
}

function MemberCard({ member, tasks = [], teamId = 'demo', isManager, session, onClose, onRemove, onRoleChange }) {
  const c = useC();
  const { dark } = useTheme();
  const [confirm, setConfirm] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [editingRole, setEditingRole] = useState(false);
  const [roleVal, setRoleVal] = useState(member.role || 'member');
  const [savingRole, setSavingRole] = useState(false);
  const day = new Date().toISOString().slice(0, 10);
  let att = {}; try { att = JSON.parse(localStorage.getItem('ss-attendance-' + teamId + '-' + day) || '{}'); } catch {}
  const r = att[member.email] || {};
  const online = r.online !== false && r.lastSeen && (Date.now() - r.lastSeen) < 120000;
  const onBreak = (r.breaks || []).some(b => !b.end);
  const presence = onBreak ? { label: 'On break', col: '#F59E0B' } : online ? { label: 'Online', col: '#34D399' } : (r.clockIn && !r.clockOut) ? { label: 'Away', col: '#FBBF24' } : { label: 'Offline', col: '#94A3B8' };
  const roleLabel = member.role === 'manager' ? 'Manager' : member.role === 'team_lead' ? 'Team Lead' : (member.designation || 'Member');
  const mt = tasks.filter(t => t.assignee_email === member.email);
  const done = mt.filter(t => t.status === 'done').length;
  const open = mt.filter(t => t.status !== 'done');
  const blocked = mt.filter(t => t.status === 'blocked').length;
  const isSelf = session?.user?.email === member.email;
  const canRemove = isManager && !isSelf && member.role !== 'manager' && onRemove;
  const canEditRole = isManager && !isSelf && onRoleChange;

  const saveRole = async () => { setSavingRole(true); await onRoleChange(member, roleVal); setSavingRole(false); setEditingRole(false); };

  const doRemove = async () => { setRemoving(true); await onRemove(member); setRemoving(false); onClose(); };

  return (
    <Modal onClose={onClose} title="" width={420}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginTop: -8 }}>
        <div style={{ position: 'relative' }}>
          <Av member={member} size={84} url={member.avatar_url}/>
          <span style={{ position: 'absolute', bottom: 4, right: 4, width: 16, height: 16, borderRadius: '50%', background: presence.col, border: `3px solid ${c.surf}` }}/>
        </div>
        <div style={{ fontSize: 18, fontWeight: 800, color: c.text, marginTop: 12 }}>{member.name || member.email}</div>
        <div style={{ fontSize: 13, color: c.mut }}>{member.email}</div>
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: member.role === 'manager' ? '#A78BFA' : member.role === 'team_lead' ? '#38BDF8' : c.sub, background: member.role === 'manager' ? 'rgba(124,92,255,.14)' : member.role === 'team_lead' ? 'rgba(56,189,248,.14)' : 'rgba(128,128,128,.1)', padding: '3px 12px', borderRadius: 20 }}>{roleLabel}</span>
          <span style={{ fontSize: 11.5, fontWeight: 600, color: presence.col, background: presence.col + '1f', padding: '3px 12px', borderRadius: 20 }}>● {presence.label}</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
        {[{ l: 'Completed', v: done, col: '#34D399' }, { l: 'Open', v: open.length, col: '#3B9EFF' }, { l: 'Blocked', v: blocked, col: blocked ? '#EF4444' : '#94A3B8' }].map(s => (
          <div key={s.l} style={{ flex: 1, textAlign: 'center', padding: '12px 8px', borderRadius: 12, background: c.row }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: s.col }}>{s.v}</div>
            <div style={{ fontSize: 10.5, color: c.mut, textTransform: 'uppercase', letterSpacing: '.04em', marginTop: 2 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {open.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: c.mut, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>Current tasks</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 160, overflowY: 'auto' }}>
            {open.slice(0, 6).map(t => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: c.sub, padding: '7px 11px', borderRadius: 9, background: c.row }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: getPriority(t.priority).color, flexShrink: 0 }}/>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title || t.text}</span>
                {t.label && <span style={{ fontSize: 9.5, fontWeight: 700, color: t.label_color || '#0070F3' }}>{t.label}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {canEditRole && (
        <div style={{ marginTop: 18, paddingTop: 16, borderTop: `1px solid ${c.bord}` }}>
          {!editingRole ? (
            <button onClick={() => { setRoleVal(member.role || 'member'); setEditingRole(true); }} style={{ width: '100%', padding: '10px', borderRadius: 10, border: `1px solid ${c.bord}`, background: 'transparent', color: c.sub, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Change role</button>
          ) : (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: c.mut, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>Role</div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                {[['member', 'Member'], ['team_lead', 'Team Lead'], ['manager', 'Manager']].map(([v, l]) => (
                  <button key={v} onClick={() => setRoleVal(v)} style={{ flex: 1, padding: '8px 6px', borderRadius: 9, border: `1px solid ${roleVal === v ? '#0070F3' : c.bord}`, background: roleVal === v ? 'rgba(0,112,243,.1)' : 'transparent', color: roleVal === v ? '#0070F3' : c.sub, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>{l}</button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Btn v="ghost" onClick={() => setEditingRole(false)} style={{ flex: 1, justifyContent: 'center' }}>Cancel</Btn>
                <Btn onClick={saveRole} loading={savingRole} disabled={roleVal === member.role} style={{ flex: 1, justifyContent: 'center' }}>Save role</Btn>
              </div>
            </div>
          )}
        </div>
      )}

      {canRemove && (
        <div style={{ marginTop: 18, paddingTop: 16, borderTop: `1px solid ${c.bord}` }}>
          {!confirm ? (
            <button onClick={() => setConfirm(true)} style={{ width: '100%', padding: '10px', borderRadius: 10, border: '1px solid rgba(239,68,68,.3)', background: 'rgba(239,68,68,.06)', color: '#EF4444', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Remove from team</button>
          ) : (
            <div>
              <p style={{ fontSize: 12.5, color: c.sub, lineHeight: 1.6, marginBottom: 12 }}>Remove <strong>{member.name || member.email.split('@')[0]}</strong> from the team? They'll lose access to tasks, boards, and chat. They'd need a new invite to rejoin.</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <Btn v="ghost" onClick={() => setConfirm(false)} style={{ flex: 1, justifyContent: 'center' }}>Cancel</Btn>
                <Btn onClick={doRemove} loading={removing} style={{ flex: 1, justifyContent: 'center', background: '#EF4444', border: 'none' }}>Remove</Btn>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

function TeamTab({ tasks, members, isManager = true, teamId = 'demo', session, onRemoveMember, onRoleChange }) {
  const c=useC();
  const { dark } = useTheme();
  const [now,setNow]=useState(Date.now());
  const [cardMember,setCardMember]=useState(null);
  useEffect(()=>{ const t=setInterval(()=>setNow(Date.now()),20000); return ()=>clearInterval(t); },[]);

  // Live availability from attendance store (online / on break / clocked-in)
  const day=new Date().toISOString().slice(0,10);
  let att={};
  try{ att=JSON.parse(localStorage.getItem('ss-attendance-'+teamId+'-'+day)||'{}'); }catch{}
  const presence=(email)=>{
    const r=att[email]||{};
    const online=r.online!==false && r.lastSeen && (now-r.lastSeen)<120000;
    const onBreak=(r.breaks||[]).some(b=>!b.end);
    if(onBreak) return {label:'On break',col:'#F59E0B',dot:'#F59E0B'};
    if(online) return {label:'Online',col:'#34D399',dot:'#34D399'};
    if(r.clockIn && !r.clockOut) return {label:'Away',col:'#94A3B8',dot:'#FBBF24'};
    return {label:'Offline',col:'#94A3B8',dot:'#94A3B8'};
  };
  const roleLabel=(m)=> m.role==='manager'?'Manager':m.role==='team_lead'?'Team Lead':(m.designation||'Member');
  const roleColor=(m)=> m.role==='manager'?'#A78BFA':m.role==='team_lead'?'#38BDF8':c.sub;

  // Reporting structure: managers at top
  const sorted=[...members].sort((a,b)=>{ const rank=r=>r==='manager'?0:r==='team_lead'?1:2; return rank(a.role)-rank(b.role); });
  const managers=sorted.filter(m=>m.role==='manager');
  const leads=sorted.filter(m=>m.role==='team_lead');

  return (
    <div>
      {/* Team summary strip — composition & availability (NOT task metrics) */}
      <div style={{ display:'flex',gap:12,flexWrap:'wrap',marginBottom:18 }}>
        {[
          {l:'Members',v:members.length,col:'#3B9EFF'},
          {l:'Managers',v:managers.length,col:'#A78BFA'},
          {l:'Team leads',v:leads.length,col:'#38BDF8'},
          {l:'Online now',v:members.filter(m=>presence(m.email).label==='Online').length,col:'#34D399'},
        ].map(s=>(
          <Card key={s.l} style={{ flex:'1 1 140px',padding:'14px 18px' }}>
            <div style={{ fontSize:24,fontWeight:800,color:s.col }}>{s.v}</div>
            <div style={{ fontSize:11,color:c.mut,textTransform:'uppercase',letterSpacing:'.05em',marginTop:2 }}>{s.l}</div>
          </Card>
        ))}
      </div>

      {/* Directory — identity, role, availability, current workload as a COUNT */}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:14 }}>
        {sorted.map(member=>{
          const p=presence(member.email);
          const openCount=tasks.filter(t=>t.assignee_email===member.email && t.status!=='done').length;
          return (
            <Card key={member.id||member.email} onClick={()=>setCardMember(member)} style={{ padding:'18px 20px' }}>
              <div style={{ display:'flex',alignItems:'flex-start',gap:12 }}>
                <div style={{ position:'relative',flexShrink:0 }}>
                  <Av member={member} size={46} url={member.avatar_url}/>
                  <span style={{ position:'absolute',bottom:0,right:0,width:13,height:13,borderRadius:'50%',background:p.dot,border:`2px solid ${c.surf}` }}/>
                </div>
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ fontSize:14,fontWeight:700,color:c.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{member.name||member.email}</div>
                  <div style={{ fontSize:11.5,color:c.mut,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{member.email}</div>
                  <div style={{ display:'flex',alignItems:'center',gap:6,marginTop:8,flexWrap:'wrap' }}>
                    <span style={{ fontSize:10.5,fontWeight:700,color:roleColor(member),background:member.role==='manager'?'rgba(124,92,255,.14)':member.role==='team_lead'?'rgba(56,189,248,.14)':'rgba(128,128,128,.1)',padding:'2px 9px',borderRadius:20 }}>{roleLabel(member)}</span>
                    <span style={{ fontSize:10.5,fontWeight:600,color:p.col,display:'inline-flex',alignItems:'center',gap:4 }}><span style={{ width:6,height:6,borderRadius:'50%',background:p.dot }}/>{p.label}</span>
                  </div>
                </div>
              </div>
              <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:14,paddingTop:12,borderTop:`1px solid ${c.bord}` }}>
                <span style={{ fontSize:11.5,color:c.mut }}>Current workload</span>
                <span style={{ fontSize:12.5,fontWeight:700,color:openCount===0?'#34D399':openCount>=5?'#F59E0B':c.text }}>{openCount===0?'Clear':openCount+' open task'+(openCount>1?'s':'')}</span>
              </div>
            </Card>
          );
        })}
      </div>
      <p style={{ fontSize:11.5,color:c.mut,marginTop:14 }}>Looking for completion rates, scores, or task lists? Those live in the <strong style={{ color:c.sub }}>Performance</strong> and <strong style={{ color:c.sub }}>Tasks</strong> tabs.</p>
      {cardMember&&<MemberCard member={cardMember} tasks={tasks} teamId={teamId} isManager={isManager} session={session} onClose={()=>setCardMember(null)} onRemove={onRemoveMember} onRoleChange={onRoleChange}/>}
    </div>
  );
}

// ─── DAILY REPORT (completed tasks only) ──────────────────────────────────────
// One-click AI summary of the current user's COMPLETED tasks, a manual editor,
// and "email now" via the serverless /api/send endpoint. Reports are saved per
// day in localStorage so the in-site space always shows today's report.
function reportKey(teamId, email) { return `ss-dailyreport-${teamId}-${email}`; }
// Submitted reports the manager can review & question (shared store per team)
function submittedReportsKey(teamId) { return `ss-reports-${teamId}`; }
function readSubmittedReports(teamId) {
  const shared = sharedGetCached(teamId, 'reports');
  if (shared && Array.isArray(shared)) return shared;
  try { return JSON.parse(localStorage.getItem(submittedReportsKey(teamId)) || '[]'); } catch { return []; }
}
function writeSubmittedReports(teamId, list) {
  try { localStorage.setItem(submittedReportsKey(teamId), JSON.stringify(list)); } catch {}
  sharedSet(teamId, 'reports', list); // mirror → manager on any device sees submissions
}

function DailyReportTab({ tasks = [], session, team, members = [], isManager = false }) {
  const c = useC();
  const { dark } = useTheme();
  const myEmail = session?.user?.email || 'me@demo';
  const myName = session?.user?.user_metadata?.name || myEmail.split('@')[0];
  const teamId = team?.id || 'demo';
  const today = new Date().toISOString().slice(0, 10);
  const todayLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  // Scope to THIS user's tasks. For members, `tasks` is already pre-filtered to
  // them upstream, so we keep any task that's either pre-scoped or matches their
  // email case-insensitively (handles look-alike addresses & casing).
  const meLc = (myEmail || '').trim().toLowerCase();
  const mine = tasks.filter(t => { const a = (t.assignee_email || '').trim().toLowerCase(); return !a || a === meLc; });
  // If everything was already scoped to me upstream, `mine` ≈ all tasks; otherwise it filters.
  const myTasks = mine.length ? mine : tasks;
  const completed = myTasks.filter(t => t.status === 'done');
  const open = myTasks.filter(t => t.status !== 'done');
  const blocked = myTasks.filter(t => t.status === 'blocked');

  const [report, setReport] = useState(''); // the report body (AI or manual)
  const [mode, setMode] = useState('view'); // view | edit
  const [busy, setBusy] = useState(false);
  const [emailBusy, setEmailBusy] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [toast, setToast] = useState('');

  // Load today's saved report
  useEffect(() => {
    try {
      const raw = localStorage.getItem(reportKey(teamId, myEmail));
      if (raw) { const d = JSON.parse(raw); if (d.date === today) { setReport(d.body || ''); setSavedAt(d.at || null); } else { setReport(''); setSavedAt(null); } }
    } catch {}
  }, [teamId, myEmail, today]);

  const flash = (m) => { setToast(m); setTimeout(() => setToast(''), 2600); };
  const save = (body) => { try { localStorage.setItem(reportKey(teamId, myEmail), JSON.stringify({ date: today, body, at: Date.now() })); setSavedAt(Date.now()); } catch {} };

  // Rich data-built report (reliable primary path — never a generic greeting)
  const buildPlain = () => {
    const headLines = [`Daily Report — ${myName}`, todayLabel, ''];
    if (completed.length === 0 && open.length === 0) return [...headLines, 'No tasks on record today.'].join('\n');

    // Completed, grouped with priority/label context
    let body = headLines.join('\n');
    if (completed.length) {
      const lines = completed.map(t => {
        const bits = [];
        if (t.priority && t.priority !== 'medium') bits.push(`${t.priority} priority`);
        if (t.label) bits.push(t.label);
        return `• ${t.title || t.text}${bits.length ? ` — ${bits.join(', ')}` : ''}`;
      }).join('\n');
      body += `\n✅ Completed today (${completed.length}):\n${lines}`;
      // a quick insight line
      const highDone = completed.filter(t => t.priority === 'high' || t.priority === 'critical').length;
      if (highDone) body += `\n   ↳ ${highDone} of these ${highDone > 1 ? 'were' : 'was'} high/critical priority.`;
    } else {
      body += `\n✅ Completed today: none yet.`;
    }

    // In progress — what's actively moving
    const inProg = open.filter(t => t.status === 'in-progress');
    if (inProg.length) {
      body += `\n\n⏳ In progress (${inProg.length}):\n` + inProg.slice(0, 5).map(t => `• ${t.title || t.text}${t.timeline ? ` — due ${t.timeline}` : ''}`).join('\n');
    }

    // Blockers with reasons (so the manager sees the "why")
    if (blocked.length) {
      body += `\n\n🚧 Blocked (${blocked.length}):\n` + blocked.map(t => `• ${t.title || t.text}${t.blocker ? ` — ${t.blocker}` : ''}`).join('\n');
    }

    // Planned next — open, not blocked, not in progress
    const next = open.filter(t => t.status === 'todo');
    if (next.length) {
      body += `\n\n🎯 Up next (${next.length}):\n` + next.slice(0, 5).map(t => `• ${t.title || t.text}${t.timeline ? ` (${t.timeline})` : ''}`).join('\n');
    }

    // One-line summary footer
    const rate = myTasks.length ? Math.round(completed.length / myTasks.length * 100) : 0;
    body += `\n\n— ${completed.length} done · ${inProg.length} in progress · ${blocked.length} blocked · ${rate}% of today's load complete.`;
    return body;
  };

  // Heuristic: did ai.js summarize, or return a canned greeting / question?
  const looksLikeJunk = (text) => {
    if (!text || text.length < 12) return true;
    const t = text.toLowerCase();
    const junk = ['good morning','good afternoon','how can i help','what can i help','no tasks added','how can i assist',"i'm here to help",'hello!','hi there','what would you'];
    if (junk.some(j => t.includes(j))) return true;
    const mentionsATask = completed.some(ct => { const words = (ct.title || ct.text || '').toLowerCase().split(/\s+/).filter(w => w.length > 3); return words.some(w => t.includes(w)); });
    return !mentionsATask;
  };

  const generateAI = async () => {
    const plain = buildPlain();
    if (completed.length === 0 && open.length === 0) { setReport(plain); save(plain); flash('No tasks on record today.'); return; }
    setBusy(true);
    setReport(plain); // show the reliable version immediately
    try {
      const doneList = completed.map(t => `- ${t.title || t.text}${t.priority ? ` [${t.priority}]` : ''}${t.label ? ` {${t.label}}` : ''}`).join('\n') || '(none)';
      const progList = open.filter(t => t.status === 'in-progress').map(t => `- ${t.title || t.text}`).join('\n') || '(none)';
      const blockList = blocked.map(t => `- ${t.title || t.text}${t.blocker ? `: ${t.blocker}` : ''}`).join('\n') || '(none)';
      const nextList = open.filter(t => t.status === 'todo' && !t._carriedOver).map(t => `- ${t.title || t.text}`).join('\n') || '(none)';
      const backlogList = open.filter(t => t._carriedOver).map(t => `- ${t.title || t.text} (open since ${t._standupDate || 'earlier'})`).join('\n') || '(none)';
      const rateNow = myTasks.length ? Math.round(completed.length / myTasks.length * 100) : 0;
      const prompt = `You are writing my end-of-day work report for my manager. Make it genuinely insightful, not a list restated as prose. In 4-6 first-person sentences: (1) what I accomplished today and why it matters, (2) honest momentum - am I ahead, on track, or slipping, citing the ${rateNow}% completion, (3) any carried-over backlog and a realistic plan to clear it, (4) blockers and the specific help or decision I need, (5) my focus for tomorrow. Professional, specific, candid. No greeting, no questions, no bullet headers - flowing prose.\n\nCOMPLETED TODAY:\n${doneList}\n\nIN PROGRESS:\n${progList}\n\nCARRIED-OVER BACKLOG (unfinished from previous days - call this out honestly):\n${backlogList}\n\nBLOCKED:\n${blockList}\n\nPLANNED NEXT:\n${nextList}`;
      const res = await askAI(prompt, { tasks: myTasks, members, teamName: team?.name || 'Team', userName: myName });
      const text = (typeof res === 'string' ? res : (res?.text || '')).trim();
      if (text && !looksLikeJunk(text)) {
        const rate = myTasks.length ? Math.round(completed.length / myTasks.length * 100) : 0;
        const polished = `Daily Report \u2014 ${myName}\n${todayLabel}\n\n${text}\n\n\u2014 ${completed.length} done \u00b7 ${open.filter(t=>t.status==='in-progress').length} in progress \u00b7 ${blocked.length} blocked \u00b7 ${rate}% of today's load complete.`;
        setReport(polished); save(polished); flash('\u2728 AI report generated');
      } else {
        save(plain); flash('Generated from your tasks. (AI summary unavailable.)');
      }
    } catch (e) {
      save(plain); flash('Generated from your tasks.');
    }
    setBusy(false);
  };

  const emailFallback = (subject) => {
    // Open a real Gmail compose draft (works for the common case), and copy the
    // report to clipboard so it can be pasted anywhere as a backup.
    try { navigator.clipboard && navigator.clipboard.writeText(report); } catch {}
    const gmail = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(myEmail)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(report)}`;
    window.open(gmail, '_blank', 'noopener');
    flash('Opened a Gmail draft + copied the report to clipboard.');
  };

  const emailReport = async () => {
    if (!report.trim()) { flash('Generate or write a report first.'); return; }
    setEmailBusy(true);
    const subject = `Daily report — ${myName} — ${todayLabel}`;
    try {
      const res = await fetch('/api/send', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: myEmail, subject, text: report, html: '<pre style="font:14px/1.6 system-ui,sans-serif;white-space:pre-wrap">' + report.replace(/</g, '&lt;') + '</pre>' }),
      });
      if (res.ok) { const d = await res.json().catch(() => ({})); flash(d.id ? '📧 Report emailed to ' + myEmail : (d.demo ? '📧 Sent (demo) — set RESEND_API_KEY to deliver' : '📧 Report sent')); }
      else emailFallback(subject);
    } catch (e) {
      emailFallback(subject);
    }
    setEmailBusy(false);
  };

  const copyReport = () => { try { navigator.clipboard.writeText(report); flash('📋 Report copied — paste into any email or chat.'); } catch { flash('Could not copy.'); } };

  const submitReport = () => {
    if (!report.trim()) { flash('Generate or write a report first.'); return; }
    const list = readSubmittedReports(teamId);
    const id = `${myEmail}|${today}`;
    const entry = {
      id, date: today, dateLabel: todayLabel,
      authorEmail: myEmail, authorName: myName,
      body: report,
      stats: { completed: completed.length, open: open.length, blocked: blocked.length },
      submittedAt: Date.now(),
      questions: (list.find(r => r.id === id)?.questions) || [], // preserve any existing thread
    };
    const next = [entry, ...list.filter(r => r.id !== id)]; // upsert by member+day
    writeSubmittedReports(teamId, next);
    flash('✅ Report submitted to your manager.');
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 6 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: c.text, marginBottom: 4 }}>🗒️ Daily report</h2>
          <p style={{ fontSize: 12.5, color: c.mut }}>A summary of what <strong style={{ color: c.sub }}>you completed</strong> today. {todayLabel}.</p>
        </div>
      </div>

      {/* Completed-today snapshot */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', margin: '14px 0 16px' }}>
        {[{ l: 'Completed today', v: completed.length, col: '#16A34A' }, { l: 'Still open', v: open.length, col: '#64748B' }, { l: 'Blocked', v: blocked.length, col: blocked.length ? '#DC2626' : '#16A34A' }].map(s => (
          <div key={s.l} style={{ flex: '1 1 120px', padding: '14px 18px', borderRadius: 14, background: c.surf, border: `1px solid ${c.bord}` }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: s.col }}>{s.v}</div>
            <div style={{ fontSize: 11, color: c.mut, textTransform: 'uppercase', letterSpacing: '.05em', marginTop: 2 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        <Btn onClick={generateAI} loading={busy}>✨ Generate today's report</Btn>
        <Btn v="ghost" onClick={() => setMode(mode === 'edit' ? 'view' : 'edit')}>{mode === 'edit' ? '✓ Done editing' : '✏️ Write / edit manually'}</Btn>
        {!isManager && <Btn onClick={submitReport}>📤 Submit to manager</Btn>}
        <Btn v="ghost" onClick={emailReport} loading={emailBusy}>📧 Email to me</Btn>
        <Btn v="ghost" onClick={copyReport}>📋 Copy report</Btn>
        {toast && <span style={{ alignSelf: 'center', fontSize: 12.5, color: c.sub }}>{toast}</span>}
      </div>

      {/* Report body */}
      <div style={{ borderRadius: 14, background: c.surf, border: `1px solid ${c.bord}`, overflow: 'hidden' }}>
        <div style={{ padding: '12px 18px', borderBottom: `1px solid ${c.bord}`, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: c.text }}>{`Report — ${todayLabel}`}</span>
          {savedAt && <span style={{ fontSize: 11, color: c.mut, marginLeft: 'auto' }}>Saved {new Date(savedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>}
        </div>
        {mode === 'edit' ? (
          <div style={{ padding: 16 }}>
            <textarea value={report} onChange={e => setReport(e.target.value)} onBlur={() => save(report)} placeholder="Write your daily report here, or click 'Generate' to let AI summarize your completed tasks..." style={{ width: '100%', minHeight: 220, background: c.inp, border: `1px solid ${c.inpB}`, borderRadius: 10, padding: '12px 14px', color: c.text, fontSize: 13.5, lineHeight: 1.6, outline: 'none', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit' }}/>
          </div>
        ) : (
          <div style={{ padding: '18px 20px', minHeight: 160 }}>
            {report.trim() ? (
              <div style={{ fontSize: 14, color: c.text, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{report}</div>
            ) : (
              <div style={{ textAlign: 'center', padding: '30px 16px', color: c.mut }}>
                <div style={{ fontSize: 34, marginBottom: 10 }}>🗒️</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: c.sub, marginBottom: 4 }}>No report yet for today</div>
                <div style={{ fontSize: 12.5 }}>Click <strong>Generate today's report</strong> for an AI summary of your completed tasks, or write one manually.</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* What goes in (completed list preview) */}
      {completed.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: c.mut, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>Completed today ({completed.length})</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {completed.map(t => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', borderRadius: 10, background: c.surf, border: `1px solid ${c.bord}` }}>
                <span style={{ color: '#16A34A', flexShrink: 0 }}>✓</span>
                <span style={{ flex: 1, fontSize: 13, color: c.text }}>{t.title || t.text}</span>
                {t.priority && <span style={{ fontSize: 10.5, color: getPriority(t.priority).color, fontWeight: 700, textTransform: 'uppercase' }}>{t.priority}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Manager questions on today's report (member can reply) */}
      <MemberReportThread teamId={teamId} myEmail={myEmail} myName={myName} today={today}/>

      <p style={{ fontSize: 11.5, color: c.mut, marginTop: 16, lineHeight: 1.6 }}>
        💡 The report covers your day's work. <strong>Submit to manager</strong> files it on the manager's Reports page, where they can review and ask follow-up questions you'll see here. "Email to me" works now; scheduled evening delivery needs a backend cron.
      </p>
    </div>
  );
}

// Member's view of manager questions on their submitted report (with reply)
function MemberReportThread({ teamId, myEmail, myName, today }) {
  const c = useC();
  const [entry, setEntry] = useState(null);
  const [replyText, setReplyText] = useState('');
  const id = `${myEmail}|${today}`;
  const load = () => { const list = readSubmittedReports(teamId); setEntry(list.find(r => r.id === id) || null); };
  useEffect(() => { load(); const t = setInterval(load, 8000); return () => clearInterval(t); /* eslint-disable-next-line */ }, [teamId, myEmail, today]);
  if (!entry || !(entry.questions || []).length) return null;

  const sendReply = (qid) => {
    if (!replyText.trim()) return;
    const list = readSubmittedReports(teamId);
    const next = list.map(r => r.id === id ? { ...r, questions: r.questions.map(q => q.id === qid ? { ...q, reply: replyText.trim(), repliedAt: Date.now() } : q) } : r);
    writeSubmittedReports(teamId, next); setReplyText(''); load();
  };

  return (
    <div style={{ marginTop: 16, borderRadius: 14, background: c.surf, border: '1px solid rgba(0,112,243,.25)', overflow: 'hidden' }}>
      <div style={{ padding: '12px 18px', borderBottom: `1px solid ${c.bord}`, fontSize: 13, fontWeight: 700, color: c.text }}>💬 Questions from your manager</div>
      <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {entry.questions.map(q => (
          <div key={q.id}>
            <div style={{ fontSize: 13, color: c.text }}><strong>{q.byName || 'Manager'}:</strong> {q.text}</div>
            {q.reply ? (
              <div style={{ fontSize: 13, color: c.sub, marginTop: 6, paddingLeft: 12, borderLeft: `2px solid ${c.bord}` }}>You: {q.reply}</div>
            ) : (
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <input value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Reply…" style={{ flex: 1, background: c.inp, border: `1px solid ${c.inpB}`, borderRadius: 8, padding: '7px 11px', color: c.text, fontSize: 12.5, outline: 'none' }}/>
                <Btn onClick={() => sendReply(q.id)} style={{ padding: '7px 14px', fontSize: 12.5 }}>Send</Btn>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// MANAGER — submitted reports inbox with the ability to question each report
function ReportsTab({ team, members = [], session }) {
  const c = useC();
  const teamId = team?.id || 'demo';
  const myName = session?.user?.user_metadata?.name || 'Manager';
  const [reports, setReports] = useState(() => readSubmittedReports(teamId));
  const [openId, setOpenId] = useState(null);
  const [qText, setQText] = useState('');
  const [dayFilter, setDayFilter] = useState('all');
  const [period, setPeriod] = useState('week'); // week | month | year | all
  const refresh = () => setReports(readSubmittedReports(teamId));
  useEffect(() => {
    hydrateShared(teamId, () => refresh());
    let unsub = () => {};
    try { if (SB.subscribeToStore) unsub = SB.subscribeToStore(teamId, (key, value) => { if (key === 'reports' && Array.isArray(value)) { _sharedCache[_scKey(teamId, 'reports')] = value; setReports(value); } }); } catch {}
    const t = setInterval(refresh, 8000);
    return () => { clearInterval(t); try { unsub(); } catch {} }; /* eslint-disable-next-line */
  }, [teamId]);

  // Period window: keep reports within the selected look-back range.
  const now = Date.now();
  const periodMs = { week: 7 * 864e5, month: 30 * 864e5, year: 365 * 864e5, all: Infinity }[period];
  const inPeriod = reports.filter(r => period === 'all' || (now - (r.submittedAt || 0)) <= periodMs);
  // Rollup for the selected period
  const rollup = (() => {
    const people = new Set(inPeriod.map(r => r.authorEmail || r.authorName));
    const completed = inPeriod.reduce((s, r) => s + (r.stats?.completed || 0), 0);
    const blocked = inPeriod.reduce((s, r) => s + (r.stats?.blocked || 0), 0);
    return { reports: inPeriod.length, people: people.size, completed, blocked };
  })();
  const periodLabel = { week: 'Past 7 days', month: 'Past 30 days', year: 'Past year', all: 'All time' }[period];

  const days = Array.from(new Set(inPeriod.map(r => r.date)));
  const shown = inPeriod.filter(r => dayFilter === 'all' || r.date === dayFilter).sort((a, b) => b.submittedAt - a.submittedAt);

  const askQuestion = (rid) => {
    if (!qText.trim()) return;
    const list = readSubmittedReports(teamId);
    const next = list.map(r => r.id === rid ? { ...r, questions: [...(r.questions || []), { id: 'q' + Date.now(), text: qText.trim(), byName: myName, at: Date.now() }] } : r);
    writeSubmittedReports(teamId, next); setQText(''); refresh();
  };

  const fmt = (ts) => new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: c.text, marginBottom: 4 }}>📥 Submitted reports</h2>
        <p style={{ fontSize: 12.5, color: c.mut }}>Daily reports your team has submitted. Open one to read it and ask follow-up questions.</p>
      </div>

      {reports.length === 0 ? (
        <Card style={{ padding: '44px', textAlign: 'center' }}>
          <div style={{ fontSize: 34, marginBottom: 12 }}>📭</div>
          <div style={{ color: c.sub, fontSize: 14, fontWeight: 600, marginBottom: 4 }}>No reports submitted yet</div>
          <div style={{ color: c.mut, fontSize: 12.5 }}>When team members click "Submit to manager" on their daily report, it shows up here.</div>
        </Card>
      ) : (
        <>
          {/* Period selector */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
            {[['week', 'Weekly'], ['month', 'Monthly'], ['year', 'Yearly'], ['all', 'All time']].map(([k, label]) => (
              <button key={k} onClick={() => { setPeriod(k); setDayFilter('all'); }} style={{ fontSize: 12.5, padding: '6px 14px', borderRadius: 9, border: `1px solid ${period === k ? c.accent : c.bord}`, background: period === k ? c.accentSoft : 'transparent', color: period === k ? c.accent : c.sub, cursor: 'pointer', fontWeight: period === k ? 700 : 500 }}>{label}</button>
            ))}
          </div>

          {/* Period rollup */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
            {[
              { label: periodLabel, value: rollup.reports, sub: 'reports' },
              { label: 'Team members', value: rollup.people, sub: 'reporting' },
              { label: 'Tasks completed', value: rollup.completed, sub: 'logged', color: '#16A34A' },
              { label: 'Blockers flagged', value: rollup.blocked, sub: 'raised', color: rollup.blocked ? '#DC2626' : undefined },
            ].map((s, i) => (
              <div key={i} style={{ padding: '14px 16px', borderRadius: 14, background: c.surf, border: `1px solid ${c.bord}` }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: s.color || c.text }}>{s.value}</div>
                <div style={{ fontSize: 11, color: c.mut, marginTop: 3 }}>{s.label} · {s.sub}</div>
              </div>
            ))}
          </div>

          {/* Day filter */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
            <button onClick={() => setDayFilter('all')} style={{ fontSize: 12, padding: '5px 12px', borderRadius: 20, border: `1px solid ${c.bord}`, background: dayFilter === 'all' ? 'rgba(0,112,243,.15)' : 'transparent', color: dayFilter === 'all' ? '#3B9EFF' : c.mut, cursor: 'pointer', fontWeight: dayFilter === 'all' ? 700 : 400 }}>All</button>
            {days.map(d => (
              <button key={d} onClick={() => setDayFilter(d)} style={{ fontSize: 12, padding: '5px 12px', borderRadius: 20, border: `1px solid ${c.bord}`, background: dayFilter === d ? 'rgba(0,112,243,.15)' : 'transparent', color: dayFilter === d ? '#3B9EFF' : c.mut, cursor: 'pointer', fontWeight: dayFilter === d ? 700 : 400 }}>{new Date(d + 'T12:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</button>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {shown.length === 0 && <div style={{ padding: '28px', textAlign: 'center', color: c.mut, fontSize: 13 }}>No reports in this period. Try a wider range.</div>}
            {shown.map(r => {
              const m = members.find(x => (x.email || '').toLowerCase() === (r.authorEmail || '').toLowerCase());
              const isOpen = openId === r.id;
              const unanswered = (r.questions || []).filter(q => !q.reply).length;
              return (
                <Card key={r.id} style={{ padding: 0, overflow: 'hidden' }}>
                  <button onClick={() => setOpenId(isOpen ? null : r.id)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                    <Av member={m || { name: r.authorName, email: r.authorEmail }} size={34} url={m?.avatar_url}/>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: c.text }}>{r.authorName}</div>
                      <div style={{ fontSize: 11.5, color: c.mut }}>{r.dateLabel} · submitted {fmt(r.submittedAt)}</div>
                    </div>
                    <span style={{ fontSize: 11, color: '#16A34A' }}>{r.stats?.completed || 0} done</span>
                    {(r.stats?.blocked || 0) > 0 && <span style={{ fontSize: 11, color: '#DC2626' }}>{r.stats.blocked} blocked</span>}
                    {(r.questions || []).length > 0 && <span style={{ fontSize: 10.5, fontWeight: 700, color: unanswered ? '#D97706' : '#16A34A', background: (unanswered ? '#D97706' : '#16A34A') + '1a', padding: '2px 8px', borderRadius: 20 }}>{(r.questions || []).length} Q{unanswered ? ` · ${unanswered} open` : ''}</span>}
                    <span style={{ color: c.mut, fontSize: 13 }}>{isOpen ? '▴' : '▾'}</span>
                  </button>
                  {isOpen && (
                    <div style={{ padding: '0 18px 18px' }}>
                      <div style={{ fontSize: 13.5, color: c.text, lineHeight: 1.7, whiteSpace: 'pre-wrap', padding: '14px 16px', background: c.row, borderRadius: 10, marginBottom: 14 }}>{r.body}</div>

                      {/* Question thread */}
                      {(r.questions || []).length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 14 }}>
                          {r.questions.map(q => (
                            <div key={q.id}>
                              <div style={{ fontSize: 13, color: c.text }}><strong>{q.byName}:</strong> {q.text}</div>
                              {q.reply ? <div style={{ fontSize: 13, color: c.sub, marginTop: 5, paddingLeft: 12, borderLeft: `2px solid ${c.bord}` }}>{r.authorName.split(' ')[0]}: {q.reply}</div>
                                : <div style={{ fontSize: 11.5, color: '#D97706', marginTop: 5 }}>Awaiting reply…</div>}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Ask a question */}
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input value={openId === r.id ? qText : ''} onChange={e => setQText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') askQuestion(r.id); }} placeholder="Ask a question about this report…" style={{ flex: 1, background: c.inp, border: `1px solid ${c.inpB}`, borderRadius: 8, padding: '8px 12px', color: c.text, fontSize: 12.5, outline: 'none' }}/>
                        <Btn onClick={() => askQuestion(r.id)} style={{ padding: '8px 16px', fontSize: 12.5 }}>Ask</Btn>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}


function PerfTab({ tasks, history, members }) {
  const c=useC(); const allDays=useMemo(()=>[...history,{id:'today',date:TODAY(),tasks}],[history,tasks]);
  const stats=useMemo(()=>members.map(member=>{ const all=allDays.flatMap(d=>(d.tasks||[]).filter(t=>t.assignee_email===member.email)); const total=all.length,done=all.filter(t=>t.status==='done').length,blocked=all.filter(t=>t.status==='blocked'||t.blocker).length; const rate=total?Math.round(done/total*100):0,activeDays=allDays.filter(d=>(d.tasks||[]).some(t=>t.assignee_email===member.email)).length,avg=activeDays?+(total/activeDays).toFixed(1):0; const week=history.slice(0,7).map(d=>{const dt=(d.tasks||[]).filter(t=>t.assignee_email===member.email);if(!dt.length)return null;return{date:d.date,pct:Math.round(dt.filter(x=>x.status==='done').length/dt.length*100)};}).filter(Boolean).reverse(); const bscore=total?Math.round((total-blocked)/total*100):100,consist=Math.min(100,Math.round(activeDays/Math.max(allDays.length,1)*100)),score=Math.round(rate*.6+consist*.2+bscore*.2); const grade=score>=90?'A':score>=75?'B':score>=60?'C':score>=40?'D':'F',gc=score>=90?'#34D399':score>=75?'#3B9EFF':score>=60?'#F59E0B':'#EF4444'; const tod=tasks.filter(t=>t.assignee_email===member.email),tdone=tod.filter(t=>t.status==='done').length; return{member,total,done,blocked,rate,avg,week,score,grade,gc,tod,tdone,todPct:tod.length?Math.round(tdone/tod.length*100):0}; }),[allDays,members,tasks,history]);
  const sorted=[...stats].sort((a,b)=>b.score-a.score),top=sorted[0]; const totDone=stats.reduce((a,s)=>a+s.done,0),avgRate=stats.length?Math.round(stats.reduce((a,s)=>a+s.rate,0)/stats.length):0;
  return(<div><div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20 }}><StatCard label="Days tracked" value={allDays.length} color="#3B9EFF" icon="📅"/><StatCard label="Total done" value={totDone} color="#34D399" icon="✅"/><StatCard label="Avg completion" value={avgRate+'%'} color="#F472B6" icon="🎯"/><StatCard label="Top performer" value={top?.member.name?.split(' ')[0]||'—'} color={top?.gc||'#3B9EFF'} sub={top?`Score: ${top.score}`:''} icon="🏆"/></div><Card style={{ padding:'18px 20px',marginBottom:20 }}><Lbl>Leaderboard</Lbl><div style={{ display:'flex',flexDirection:'column',gap:10 }}>{sorted.map((s,i)=><div key={s.member.id||s.member.email} style={{ display:'flex',alignItems:'center',gap:12 }}><div style={{ width:22,fontSize:13,fontWeight:700,color:i===0?'#FCD34D':i===1?'#94A3B8':i===2?'#CD7C2E':c.mut,textAlign:'center',flexShrink:0 }}>{i===0?'🥇':i===1?'🥈':i===2?'🥉':`${i+1}`}</div><Av member={s.member} size={30} url={s.member.avatar_url}/><span style={{ fontSize:13,fontWeight:500,color:c.text,flex:1 }}>{s.member.name||s.member.email}</span><div style={{ width:120 }}><Bar pct={s.rate} color={s.gc} h={4}/></div><span style={{ fontSize:12,fontWeight:700,color:s.gc,width:36,textAlign:'right' }}>{s.rate}%</span><div style={{ width:28,height:28,borderRadius:8,background:s.gc+'20',border:`1px solid ${s.gc}40`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:800,color:s.gc }}>{s.grade}</div></div>)}</div></Card><div style={{ display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:14 }}>{stats.map(s=><Card key={s.member.id||s.member.email} style={{ padding:'20px 22px' }}><div style={{ display:'flex',alignItems:'center',gap:12,marginBottom:14 }}><Av member={s.member} size={44} url={s.member.avatar_url}/><div style={{ flex:1 }}><div style={{ fontSize:14,fontWeight:700,color:c.text }}>{s.member.name||s.member.email}</div></div><div style={{ position:'relative',width:56,height:56,flexShrink:0 }}><svg width="56" height="56" style={{ transform:'rotate(-90deg)' }}><circle cx="28" cy="28" r="20" fill="none" stroke="rgba(128,128,128,.15)" strokeWidth="4"/><circle cx="28" cy="28" r="20" fill="none" stroke={s.gc} strokeWidth="4" strokeLinecap="round" strokeDasharray={`${(s.score/100)*2*Math.PI*20} ${2*Math.PI*20}`}/></svg><div style={{ position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center' }}><div style={{ fontSize:16,fontWeight:800,color:s.gc,lineHeight:1 }}>{s.grade}</div><div style={{ fontSize:9,color:c.mut,lineHeight:1 }}>{s.score}</div></div></div></div>{s.tod.length>0&&<div style={{ marginBottom:12 }}><div style={{ display:'flex',justifyContent:'space-between',marginBottom:5 }}><Lbl style={{ margin:0 }}>Today</Lbl><span style={{ fontSize:11,color:s.member.color||'#3B9EFF',fontWeight:700 }}>{s.tdone}/{s.tod.length}</span></div><Bar pct={s.todPct} color={s.member.color||'#3B9EFF'} h={4}/></div>}<div style={{ marginBottom:12 }}><div style={{ display:'flex',justifyContent:'space-between',marginBottom:5 }}><Lbl style={{ margin:0 }}>Overall</Lbl><span style={{ fontSize:11,color:s.gc,fontWeight:700 }}>{s.rate}%</span></div><Bar pct={s.rate} color={s.gc} h={4}/></div><div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8 }}>{[{l:'Done',v:s.done,col:'#34D399'},{l:'Avg/day',v:s.avg,col:'#3B9EFF'},{l:'Blockers',v:s.blocked,col:s.blocked>0?'#EF4444':'#34D399'}].map(x=><div key={x.l} style={{ background:'rgba(128,128,128,.07)',borderRadius:10,padding:10,textAlign:'center',border:`1px solid ${c.bord}` }}><div style={{ fontSize:18,fontWeight:800,color:x.col }}>{x.v}</div><div style={{ fontSize:9,color:c.mut,textTransform:'uppercase',letterSpacing:'.06em',marginTop:2 }}>{x.l}</div></div>)}</div>{s.week.length>0&&<><Lbl style={{ marginTop:12 }}>7-day trend</Lbl><div style={{ display:'flex',alignItems:'flex-end',gap:4,height:44 }}>{s.week.map((d,i)=><div key={i} style={{ flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:3 }}><div style={{ width:'100%',height:Math.max(3,d.pct/100*36),borderRadius:3,background:d.pct===100?'#34D399':d.pct>=60?'#3B9EFF':'#F97316' }}/><div style={{ fontSize:9,color:c.mut }}>{new Date(d.date+'T12:00').toLocaleDateString('en',{weekday:'narrow'})}</div></div>)}</div></>}</Card>)}</div></div>);
}

// ─── COMMITMENT TRACKING / RELIABILITY ───────────────────────────────────────
// A "commitment" = a task someone owns that has a deadline. When the deadline
// passes, the outcome is Kept (done), Missed (still open/blocked past due), or
// Delayed (done, but after an extension). Reliability = kept / resolved commitments.
function buildCommitments(tasks, history) {
  // Commitments = any owned task with a timeline, across ALL data we have:
  // today's + carried-over live tasks AND every past standup in history.
  const out = [];
  const seen = new Set();
  const consider = (t, dateHint) => {
    if (!t || !t.assignee_email || !t.timeline) return;
    const id = t.id || (t.assignee_email + '|' + (t.title || t.text) + '|' + (dateHint || ''));
    if (seen.has(id)) return;
    seen.add(id);
    const overdue = isCommitmentOverdue(t.timeline, t.created_at || dateHint);
    let outcome;
    if (t.status === 'done') outcome = 'kept';
    else outcome = overdue ? 'missed' : 'pending';
    out.push({
      who: t.assignee_email, whoName: t.assignee_name || t.assignee_email,
      text: t.title || t.text, timeline: t.timeline, outcome, status: t.status,
      date: dateHint || t._standupDate || null,
    });
  };
  (tasks || []).forEach(t => consider(t, t._standupDate));
  // Past standups: each history entry may carry its own tasks array
  (history || []).forEach(h => (h.tasks || []).forEach(t => consider(t, h.date)));
  return out;
}
// Rough deadline interpreter for the fuzzy timeline labels the app uses.
function isCommitmentOverdue(timeline, createdAt) {
  if (!timeline) return false;
  const made = createdAt ? new Date(createdAt).getTime() : Date.now();
  const ageDays = (Date.now() - made) / 864e5;
  const tl = timeline.toLowerCase();
  if (tl.includes('today') || tl.includes('eod') || tl.includes('noon') || /\d\s*pm|\d\s*am/.test(tl)) return ageDays >= 1;
  if (tl.includes('tomorrow')) return ageDays >= 2;
  if (tl.includes('this week') || tl.includes('week')) return ageDays >= 7;
  // explicit date
  const d = Date.parse(timeline);
  if (!isNaN(d)) return d < Date.now();
  return ageDays >= 3;
}
function reliabilityOf(commitments) {
  const resolved = commitments.filter(c => c.outcome === 'kept' || c.outcome === 'missed');
  if (resolved.length === 0) return null; // nothing resolved yet
  const kept = resolved.filter(c => c.outcome === 'kept').length;
  return Math.round(kept / resolved.length * 100);
}

// ─── ACCOUNTABILITY HEATMAP ───────────────────────────────────────────────────
// Composite per-member accountability from four signals:
//   commitments completed, deadlines met, standup participation, task completion.
function computeAccountability(members, tasks, history, commitments) {
  const days = (history || []).slice(0, 14); // last ~2 weeks of standups
  return members.map(m => {
    const email = (m.email || '').toLowerCase();
    const myTasks = (tasks || []).filter(t => (t.assignee_email || '').toLowerCase() === email);
    const myCommit = commitments.filter(x => (x.who || '').toLowerCase() === email);
    const resolved = myCommit.filter(x => x.outcome === 'kept' || x.outcome === 'missed');

    // 1. Task completion %
    const completion = myTasks.length ? Math.round(myTasks.filter(t => t.status === 'done').length / myTasks.length * 100) : null;
    // 2. Commitments completed (kept / all owned commitments)
    const commitPct = myCommit.length ? Math.round(myCommit.filter(x => x.outcome === 'kept').length / myCommit.length * 100) : null;
    // 3. Deadlines met (kept / resolved)
    const deadlinePct = resolved.length ? Math.round(resolved.filter(x => x.outcome === 'kept').length / resolved.length * 100) : null;
    // 4. Standup participation (days they appeared in / total standup days)
    const present = days.filter(d => (d.tasks || []).some(t => (t.assignee_email || '').toLowerCase() === email)).length;
    const participation = days.length ? Math.round(present / days.length * 100) : null;

    const parts = [completion, commitPct, deadlinePct, participation].filter(v => v != null);
    const score = parts.length ? Math.round(parts.reduce((a, b) => a + b, 0) / parts.length) : null;
    return { m, score, completion, commitPct, deadlinePct, participation, hasData: parts.length > 0 };
  }).filter(x => x.hasData).sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
}

function AccountabilityHeatmap({ members, tasks, history, commitments }) {
  const c = useC();
  const rows = computeAccountability(members, tasks, history, commitments);
  if (rows.length === 0) return null;
  const col = (s) => s == null ? '#94A3B8' : s >= 85 ? '#16A34A' : s >= 70 ? '#65A30D' : s >= 55 ? '#D97706' : '#DC2626';
  const cell = (v) => (
    <div style={{ flex: 1, textAlign: 'center' }}>
      <div style={{ height: 30, borderRadius: 7, background: v == null ? 'rgba(128,128,128,.12)' : col(v) + (v >= 85 ? '' : '22'), border: v == null ? 'none' : `1px solid ${col(v)}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: v == null ? c.mut : col(v) }}>{v == null ? '–' : v + '%'}</div>
    </div>
  );
  return (
    <Card style={{ padding: '18px 20px', marginBottom: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: c.text, marginBottom: 4 }}>Accountability heatmap</div>
      <p style={{ fontSize: 11.5, color: c.mut, marginBottom: 14 }}>A composite of commitments completed, deadlines met, stand-up participation, and task completion.</p>

      {/* big bar view */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 11, marginBottom: 18 }}>
        {rows.map(({ m, score }) => (
          <div key={m.email} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Av member={m} size={28} url={m.avatar_url}/>
            <span style={{ width: 110, fontSize: 13, fontWeight: 600, color: c.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name || m.email.split('@')[0]}</span>
            <div style={{ flex: 1, height: 14, borderRadius: 7, background: 'rgba(128,128,128,.12)', overflow: 'hidden' }}>
              <div style={{ width: (score ?? 0) + '%', height: '100%', background: col(score), borderRadius: 7, transition: 'width .5s cubic-bezier(.22,1,.36,1)' }}/>
            </div>
            <span style={{ width: 44, textAlign: 'right', fontSize: 15, fontWeight: 800, color: col(score) }}>{score == null ? '—' : score + '%'}</span>
          </div>
        ))}
      </div>

      {/* metric breakdown grid */}
      <div style={{ borderTop: `1px solid ${c.bord}`, paddingTop: 12 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <span style={{ width: 122, flexShrink: 0 }}/>
          {['Commitments', 'Deadlines', 'Participation', 'Completion'].map(h => (
            <span key={h} style={{ flex: 1, textAlign: 'center', fontSize: 10, color: c.mut, textTransform: 'uppercase', letterSpacing: '.03em' }}>{h}</span>
          ))}
        </div>
        {rows.map(({ m, commitPct, deadlinePct, participation, completion }) => (
          <div key={m.email} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
            <span style={{ width: 122, flexShrink: 0, fontSize: 12, color: c.sub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name || m.email.split('@')[0]}</span>
            {cell(commitPct)}{cell(deadlinePct)}{cell(participation)}{cell(completion)}
          </div>
        ))}
      </div>
    </Card>
  );
}


// ─── SILENT EMPLOYEE DETECTION ────────────────────────────────────────────────
// Surfaces people whose ACTIVITY looks high (present in standups, holding/updating
// tasks, looks busy) but whose DELIVERY is low (missed commitments, low completion,
// creating bottlenecks). The signal is the GAP between looking busy and shipping.
function detectSilentRisk(members, tasks, history, commitments) {
  const days = (history || []).slice(0, 30); // ~last 30 standup days
  const out = [];
  members.forEach(m => {
    const email = (m.email || '').toLowerCase();
    const mine = (tasks || []).filter(t => (t.assignee_email || '').toLowerCase() === email);
    const myCommit = commitments.filter(x => (x.who || '').toLowerCase() === email);
    const resolved = myCommit.filter(x => x.outcome === 'kept' || x.outcome === 'missed');
    const missed = resolved.filter(x => x.outcome === 'missed').length;

    // ACTIVITY signals (looks busy)
    const present = days.filter(d => (d.tasks || []).some(t => (t.assignee_email || '').toLowerCase() === email)).length;
    const participation = days.length ? present / days.length : 0;
    const holding = mine.filter(t => t.status === 'in-progress' || t.status === 'todo').length; // tasks "being worked on"
    const looksBusy = participation >= 0.5 || holding >= 3;

    // DELIVERY signals (actually ships)
    const completion = mine.length ? mine.filter(t => t.status === 'done').length / mine.length : null;
    const delivers = (completion != null && completion >= 0.5);
    const blockersCreated = mine.filter(t => t.status === 'blocked' || t.blocker).length;

    // Need enough data to judge fairly
    const hasSignal = mine.length >= 3 || resolved.length >= 2;
    if (!hasSignal) return;

    // The gap: busy but not delivering
    const reasons = [];
    if (missed >= 3) reasons.push({ text: `Missed ${missed} commitment${missed !== 1 ? 's' : ''}`, weight: missed * 6 });
    if (completion != null && completion < 0.35 && mine.length >= 4) reasons.push({ text: `Only ${Math.round(completion*100)}% of tasks completed`, weight: 30 });
    if (blockersCreated >= 3) reasons.push({ text: `${blockersCreated} tasks stuck / creating bottlenecks`, weight: blockersCreated * 4 });
    if (holding >= 4 && (completion == null || completion < 0.4)) reasons.push({ text: `${holding} tasks open but little shipped`, weight: 14 });

    // Only flag if they LOOK busy yet reasons exist (the silent pattern)
    if (looksBusy && reasons.length >= 1) {
      const risk = Math.min(100, reasons.reduce((s, r) => s + r.weight, 0));
      out.push({
        m, risk, reasons: reasons.sort((a, b) => b.weight - a.weight),
        participation: Math.round(participation * 100),
        completion: completion == null ? null : Math.round(completion * 100),
        missed, holding, blockersCreated,
        level: risk >= 45 ? 'high' : 'watch',
      });
    }
  });
  return out.sort((a, b) => b.risk - a.risk);
}

function SilentRiskPanel({ members, tasks, history, commitments }) {
  const c = useC();
  const flagged = detectSilentRisk(members, tasks, history, commitments);
  const levelMeta = { high: { col: '#DC2626', bg: 'rgba(220,38,38,.08)', bd: 'rgba(220,38,38,.28)', l: 'Execution risk' }, watch: { col: '#D97706', bg: 'rgba(217,119,6,.07)', bd: 'rgba(217,119,6,.25)', l: 'Watch' } };
  if (flagged.length === 0) return (
    <Card style={{ padding: '18px 20px', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 4 }}>
        <span style={{ fontSize: 16 }}>🔍</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: c.text }}>Silent execution risk</span>
        <span style={{ fontSize: 11, color: '#16A34A', background: 'rgba(22,163,74,.1)', padding: '2px 9px', borderRadius: 20, fontWeight: 700 }}>All clear</span>
      </div>
      <p style={{ fontSize: 12.5, color: c.mut, lineHeight: 1.5, margin: 0 }}>No one is showing the "busy but not delivering" pattern right now. This watches for people who attend stand-ups and hold tasks but miss commitments or create bottlenecks — they'll surface here automatically.</p>
    </Card>
  );
  return (
    <Card style={{ padding: '18px 20px', marginBottom: 16, border: '1px solid rgba(220,38,38,.22)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 4 }}>
        <span style={{ fontSize: 16 }}>🔍</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: c.text }}>Silent execution risk</span>
        <span style={{ fontSize: 11, color: '#DC2626', background: 'rgba(220,38,38,.1)', padding: '2px 9px', borderRadius: 20, fontWeight: 700 }}>{flagged.length} flagged</span>
      </div>
      <p style={{ fontSize: 11.5, color: c.mut, marginBottom: 14, lineHeight: 1.5 }}>People who look active — present in stand-ups, holding tasks — but deliver little. The pattern most tools miss.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {flagged.map(f => {
          const lm = levelMeta[f.level];
          return (
            <div key={f.m.email} style={{ borderRadius: 12, border: `1px solid ${lm.bd}`, background: lm.bg, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '12px 14px' }}>
                <Av member={f.m} size={32} url={f.m.avatar_url}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: c.text }}>{f.m.name || f.m.email.split('@')[0]}</div>
                  <div style={{ fontSize: 11, color: c.mut }}>Active: {f.participation}% stand-up presence · {f.holding} tasks held{f.completion != null ? ` · ${f.completion}% delivered` : ''}</div>
                </div>
                <span style={{ fontSize: 10.5, fontWeight: 800, color: lm.col, textTransform: 'uppercase', letterSpacing: '.03em', whiteSpace: 'nowrap' }}>{lm.l}</span>
              </div>
              <div style={{ padding: '0 14px 12px 57px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                {f.reasons.map((r, i) => (
                  <div key={i} style={{ fontSize: 12.5, color: c.sub, display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ color: lm.col }}>•</span>{r.text}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <p style={{ fontSize: 11, color: c.mut, marginTop: 12, lineHeight: 1.5 }}>This flags a <em>pattern worth a conversation</em>, not a verdict — context (leave, scope, dependencies) matters. The signal is the gap between visible activity and delivered outcomes.</p>
    </Card>
  );
}


function ReliabilityTab({ tasks, members, history, team }) {
  const c = useC();
  const commitments = buildCommitments(tasks, history);
  const teamScore = reliabilityOf(commitments);

  // per-member commitment reliability
  const byMember = members.map(m => {
    const cs = commitments.filter(x => (x.who || '').toLowerCase() === (m.email || '').toLowerCase());
    return { m, cs, score: reliabilityOf(cs), kept: cs.filter(x => x.outcome === 'kept').length, missed: cs.filter(x => x.outcome === 'missed').length, pending: cs.filter(x => x.outcome === 'pending').length };
  }).filter(x => x.cs.length > 0).sort((a, b) => (b.score ?? -1) - (a.score ?? -1));

  const scoreColor = (s) => s == null ? '#94A3B8' : s >= 85 ? '#16A34A' : s >= 65 ? '#D97706' : '#DC2626';
  const scoreLabel = (s) => s == null ? 'No data' : s >= 85 ? 'Highly reliable' : s >= 65 ? 'Mostly reliable' : 'At risk';
  const totalKept = commitments.filter(c => c.outcome === 'kept').length;
  const totalMissed = commitments.filter(c => c.outcome === 'missed').length;
  const totalPending = commitments.filter(c => c.outcome === 'pending').length;
  const resolvedCount = totalKept + totalMissed;

  // Reliability trend: this half of history vs the prior half
  const periodScore = (days) => {
    let kept = 0, resolved = 0;
    (days || []).forEach(d => (d.tasks || []).forEach(t => {
      if (!t.assignee_email || !t.timeline) return;
      const overdue = isCommitmentOverdue(t.timeline, t.created_at);
      if (t.status === 'done') { kept++; resolved++; }
      else if (overdue) { resolved++; }
    }));
    return resolved ? Math.round(kept / resolved * 100) : null;
  };
  const recentP = periodScore((history || []).slice(0, 5));
  const olderP = periodScore((history || []).slice(5, 10));
  const trend = (recentP != null && olderP != null) ? recentP - olderP : null;

  // Commitment ledger — who / what / by when / outcome
  const outcomeMeta = { kept: { l: 'Kept', col: '#16A34A', bg: 'rgba(22,163,74,.1)' }, missed: { l: 'Missed', col: '#DC2626', bg: 'rgba(220,38,38,.1)' }, pending: { l: 'Pending', col: '#D97706', bg: 'rgba(217,119,6,.1)' } };
  const ledger = [...commitments].sort((a, b) => {
    const order = { missed: 0, pending: 1, kept: 2 };
    return order[a.outcome] - order[b.outcome];
  }).slice(0, 14);

  const ringSize = 132, r = (ringSize - 16) / 2, circ = 2 * Math.PI * r;

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 5 }}>
          <h2 style={{ fontSize: 19, fontWeight: 800, color: c.text, margin: 0, letterSpacing: '-.01em' }}>Execution Reliability Engine</h2>
          <span style={{ fontSize: 9.5, fontWeight: 800, color: '#0070F3', background: 'rgba(0,112,243,.12)', padding: '3px 8px', borderRadius: 6, letterSpacing: '.04em', textTransform: 'uppercase' }}>Signature</span>
        </div>
        <p style={{ fontSize: 12.5, color: c.mut, lineHeight: 1.6, maxWidth: 720 }}>Who said they would do what, by when — and how often they actually deliver. Most tools track tasks; this tracks <strong>commitments, trust, and execution reliability</strong> across the team. Every owned task with a deadline becomes a commitment, scored when its deadline passes.</p>
      </div>

      {commitments.length === 0 ? (
        <Card style={{ padding: '44px', textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🤝</div>
          <div style={{ color: c.sub, fontSize: 14, fontWeight: 600, marginBottom: 4 }}>No commitments tracked yet</div>
          <div style={{ color: c.mut, fontSize: 12.5 }}>Assign tasks with a timeline and they become tracked commitments here.</div>
        </Card>
      ) : (
        <>
          {/* HERO — team trust score */}
          <div style={{ borderRadius: 18, background: 'linear-gradient(135deg, rgba(0,112,243,.1), rgba(129,140,248,.03))', border: '1px solid rgba(0,112,243,.22)', padding: '24px 26px', marginBottom: 16, display: 'flex', gap: 28, alignItems: 'center', flexWrap: 'wrap' }}>
            <svg width={ringSize} height={ringSize} viewBox={`0 0 ${ringSize} ${ringSize}`} style={{ flexShrink: 0 }}>
              <circle cx={ringSize/2} cy={ringSize/2} r={r} fill="none" stroke="rgba(128,128,128,.15)" strokeWidth="11"/>
              <circle cx={ringSize/2} cy={ringSize/2} r={r} fill="none" stroke={scoreColor(teamScore)} strokeWidth="11" strokeLinecap="round"
                strokeDasharray={circ} strokeDashoffset={circ * (1 - (teamScore ?? 0)/100)} transform={`rotate(-90 ${ringSize/2} ${ringSize/2})`}/>
              <text x="50%" y="46%" dominantBaseline="middle" textAnchor="middle" fontSize="34" fontWeight="800" fill={scoreColor(teamScore)}>{teamScore == null ? '—' : teamScore}</text>
              <text x="50%" y="62%" dominantBaseline="middle" textAnchor="middle" fontSize="11" fill={c.mut}>/ 100</text>
            </svg>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ fontSize: 12, color: c.mut, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Team execution reliability</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: scoreColor(teamScore), marginBottom: 8 }}>{scoreLabel(teamScore)}</div>
              <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
                <div><span style={{ fontSize: 20, fontWeight: 800, color: '#16A34A' }}>{totalKept}</span><span style={{ fontSize: 12, color: c.mut, marginLeft: 5 }}>kept</span></div>
                <div><span style={{ fontSize: 20, fontWeight: 800, color: '#DC2626' }}>{totalMissed}</span><span style={{ fontSize: 12, color: c.mut, marginLeft: 5 }}>missed</span></div>
                <div><span style={{ fontSize: 20, fontWeight: 800, color: '#D97706' }}>{totalPending}</span><span style={{ fontSize: 12, color: c.mut, marginLeft: 5 }}>pending</span></div>
                {trend != null && <div><span style={{ fontSize: 20, fontWeight: 800, color: trend >= 0 ? '#16A34A' : '#DC2626' }}>{trend >= 0 ? '▲' : '▼'}{Math.abs(trend)}%</span><span style={{ fontSize: 12, color: c.mut, marginLeft: 5 }}>vs last period</span></div>}
              </div>
            </div>
          </div>

          {/* Silent execution risk — busy but not delivering */}
          <SilentRiskPanel members={members} tasks={tasks} history={history} commitments={commitments}/>

          {/* Accountability heatmap (composite signals) */}
          <AccountabilityHeatmap members={members} tasks={tasks} history={history} commitments={commitments}/>

          {/* Per-person reliability leaderboard */}
          <Card style={{ padding: '18px 20px', marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: c.text, marginBottom: 14 }}>Reliability by person</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {byMember.map(({ m, score, kept, missed, pending }) => (
                <div key={m.email} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Av member={m} size={30} url={m.avatar_url}/>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: c.text }}>{m.name || m.email.split('@')[0]}</div>
                    <div style={{ fontSize: 11, color: c.mut }}>{kept} kept · {missed} missed{pending ? ` · ${pending} pending` : ''}</div>
                  </div>
                  <div style={{ width: 120 }}><Bar pct={score ?? 0} h={7} color={scoreColor(score)}/></div>
                  <div style={{ width: 48, textAlign: 'right', fontSize: 15, fontWeight: 800, color: scoreColor(score) }}>{score == null ? '—' : score + '%'}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* Commitment ledger — who promised what, by when, outcome */}
          <Card style={{ padding: '18px 20px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: c.text, marginBottom: 4 }}>Commitment ledger</div>
            <p style={{ fontSize: 11.5, color: c.mut, marginBottom: 14 }}>Every promise on record — who, what, by when, and whether it was delivered. Missed and pending shown first.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {ledger.map((x, i) => {
                const om = outcomeMeta[x.outcome];
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 10, background: c.row }}>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: c.sub, width: 92, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(x.whoName || '').split(' ')[0]}</span>
                    <span style={{ flex: 1, fontSize: 13, color: c.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{x.text}</span>
                    <span style={{ fontSize: 11, color: c.mut, whiteSpace: 'nowrap' }}>by {x.timeline}</span>
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: om.col, background: om.bg, padding: '3px 9px', borderRadius: 20, whiteSpace: 'nowrap' }}>{om.l}</span>
                  </div>
                );
              })}
            </div>
          </Card>

          <p style={{ fontSize: 11, color: c.mut, marginTop: 14, lineHeight: 1.5 }}>Reliability = kept ÷ resolved commitments. A commitment resolves once its deadline passes (completed = kept, still open = missed). Pending commitments don't affect the score until they resolve. Precise on-time vs. late tracking unlocks when tasks carry an exact due date and completion timestamp.</p>
        </>
      )}
    </div>
  );
}

function WeeklyExecSummary({ tasks, members, history, team }) {
  const c = useC();
  const [aiText, setAiText] = useState('');
  const [busy, setBusy] = useState(false);

  // This week's window — aggregate across today's tasks AND past stand-ups in history
  const weekAgo = Date.now() - 7 * 864e5;
  const ts = (t) => t.created_at ? new Date(t.created_at).getTime() : (parseInt(String(t.id).replace(/\D/g, '')) || 0);
  const dayInWeek = (dateStr) => { try { return (Date.now() - new Date(dateStr + 'T12:00').getTime()) <= 7 * 864e5; } catch { return false; } };
  // All tasks across the last 7 days: live tasks created this week + tasks from history days within the week
  const histThisWeek = (history || []).filter(h => dayInWeek(h.date)).flatMap(h => h.tasks || []);
  const liveThisWeek = (tasks || []).filter(t => ts(t) >= weekAgo);
  // de-dupe by id
  const weekMap = {}; [...histThisWeek, ...liveThisWeek].forEach(t => { weekMap[t.id || (t.title || t.text)] = t; });
  const weekTasks = Object.values(weekMap);
  const completed = (tasks || []).filter(t => t.status === 'done').length;
  const completedWeek = weekTasks.filter(t => t.status === 'done').length || completed;
  const delayed = weekTasks.filter(t => t.status !== 'done' && isCommitmentOverdue(t.timeline, t.created_at)).length;
  const criticalBlockers = (tasks || []).filter(t => (t.status === 'blocked' || t.blocker) && (t.priority === 'critical' || t.priority === 'high')).length;
  const daysCovered = new Set((history || []).filter(h => dayInWeek(h.date)).map(h => h.date)).size + 1;

  // Productivity trend vs previous standup average
  const recent = (history || []).slice(0, 5);
  const older = (history || []).slice(5, 10);
  const avgPct = (arr) => { const ps = arr.map(d => { const dt = d.tasks || []; return dt.length ? dt.filter(t => t.status === 'done').length / dt.length * 100 : null; }).filter(v => v != null); return ps.length ? Math.round(ps.reduce((a, b) => a + b, 0) / ps.length) : null; };
  const recentAvg = avgPct(recent), olderAvg = avgPct(older);
  const trend = (recentAvg != null && olderAvg != null) ? recentAvg - olderAvg : null;

  // Projects at risk (health < 80)
  let spaces = [];
  try { spaces = JSON.parse(localStorage.getItem('ss-spaces-' + (team?.id || 'demo') + '') || '[]'); } catch {}
  const atRisk = (Array.isArray(spaces) ? spaces : []).map(s => computeHealth(s)).filter(h => h.score < 80).length;

  const stats = [
    { label: 'tasks completed', value: completedWeek || completed, color: '#16A34A' },
    { label: 'delayed', value: delayed, color: '#D97706' },
    { label: 'critical blockers', value: criticalBlockers, color: '#DC2626' },
    { label: 'projects at risk', value: atRisk, color: '#DC2626' },
  ];

  const buildFallback = () => {
    let s = `This week the team completed ${completedWeek || completed} task${(completedWeek||completed) !== 1 ? 's' : ''}`;
    if (delayed) s += `, with ${delayed} now delayed`;
    s += '. ';
    if (criticalBlockers) s += `${criticalBlockers} high-priority blocker${criticalBlockers !== 1 ? 's need' : ' needs'} attention. `;
    if (trend != null) s += `Productivity is ${trend >= 0 ? 'up' : 'down'} ${Math.abs(trend)}% versus the prior period. `;
    if (atRisk) s += `${atRisk} project${atRisk !== 1 ? 's are' : ' is'} below a healthy score and worth a closer look. `;
    else s += 'All projects are in healthy territory. ';
    return s.trim();
  };

  const generate = async () => {
    setBusy(true);
    const fb = buildFallback();
    try {
      const res = await askAI(`Write a 3-4 sentence executive weekly summary for a leadership team. Data: ${completedWeek||completed} tasks completed this week, ${delayed} delayed, ${criticalBlockers} critical blockers, productivity trend ${trend == null ? 'n/a' : (trend >= 0 ? '+' : '') + trend + '%'}, ${atRisk} projects at risk. Be crisp and executive. No greeting, no preamble, no bullet list.`, { teamName: team?.name });
      const text = (typeof res === 'string' ? res : res?.text || '').trim();
      const junk = /good (morning|afternoon)|how can i|what can i help/i;
      setAiText(text && !junk.test(text) && text.length > 30 ? text : fb);
    } catch { setAiText(fb); }
    setBusy(false);
  };
  useEffect(() => { generate(); /* eslint-disable-next-line */ }, []);

  const reportText = () => {
    return `Weekly Executive Summary — ${team?.name || 'Team'}\n${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}\n\n${aiText}\n\n• ${completedWeek || completed} tasks completed\n• ${delayed} delayed\n• ${criticalBlockers} critical blockers\n• Productivity ${trend == null ? 'n/a' : (trend >= 0 ? 'up ' : 'down ') + Math.abs(trend) + '%'}\n• ${atRisk} projects at risk`;
  };
  const copy = () => { try { navigator.clipboard.writeText(reportText()); } catch {} };

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: c.text, marginBottom: 4 }}>Weekly executive summary</h2>
        <p style={{ fontSize: 12.5, color: c.mut, lineHeight: 1.6 }}>The Friday wrap-up executives want — this week's output, risks, and trend in one glance. Generated from your live data.</p>
      </div>

      {/* AI narrative */}
      <div style={{ borderRadius: 16, background: 'linear-gradient(135deg, rgba(0,112,243,.1), rgba(129,140,248,.04))', border: '1px solid rgba(0,112,243,.22)', padding: '20px 22px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: 15 }}>✦</span>
          <span style={{ fontSize: 12, color: c.mut, textTransform: 'uppercase', letterSpacing: '.06em' }}>This week at {team?.name || 'your team'}</span>
        </div>
        <div style={{ fontSize: 15, color: c.text, lineHeight: 1.7, minHeight: 50 }}>{busy ? <span style={{ color: c.mut }}>Generating summary…</span> : aiText}</div>
      </div>

      {/* Metric cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 16 }}>
        {stats.map((s, i) => (
          <div key={i} style={{ padding: '18px', borderRadius: 16, background: c.surf, border: `1px solid ${c.bord}`, textAlign: 'center' }}>
            <div style={{ fontSize: 30, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11.5, color: c.mut, marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Trend line */}
      <Card style={{ padding: '16px 20px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 13, color: c.sub, flex: 1 }}>Team productivity vs. prior period</span>
        {trend == null ? <span style={{ fontSize: 13, color: c.mut }}>Not enough history yet</span> :
          <span style={{ fontSize: 16, fontWeight: 800, color: trend >= 0 ? '#16A34A' : '#DC2626' }}>{trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}%</span>}
      </Card>

      <div style={{ display: 'flex', gap: 10 }}>
        <Btn v="ghost" onClick={generate} loading={busy}>Regenerate</Btn>
        <Btn v="ghost" onClick={copy}>Copy report</Btn>
      </div>
      <p style={{ fontSize: 11, color: c.mut, marginTop: 14, lineHeight: 1.5 }}>Aggregated across the last 7 days ({daysCovered} day{daysCovered !== 1 ? 's' : ''} of data on record). Automatic Friday delivery to inboxes requires the email backend (a scheduled send). Until then, generate and copy/share it here. Numbers are live from your tasks, stand-ups, and project health.</p>
    </div>
  );
}


// ─── STANDSYNC ELEVATE — performance-driven learning ──────────────────────────
// Connects work performance to learning. Detects likely root causes from real
// signals (missed deadlines, recurring blockers, low completion, weak skill areas)
// and recommends matching resources from a curated learning catalog.
const ELEVATE_CATALOG = {
  time: {
    skill: 'Time & deadline management',
    course: 'Owning Your Deadlines: Planning & Estimation',
    path: 'Personal Productivity path (4 modules)',
    assessment: 'Estimation accuracy self-check',
    mins: 90,
  },
  unblock: {
    skill: 'Unblocking & escalation',
    course: 'Raising Blockers Early: Async Communication',
    path: 'Effective Collaboration path (3 modules)',
    assessment: 'Dependency-mapping exercise',
    mins: 60,
  },
  focus: {
    skill: 'Focus & throughput',
    course: 'Deep Work: Finishing What You Start',
    path: 'Execution Habits path (5 modules)',
    assessment: 'Work-in-progress audit',
    mins: 75,
  },
  design: {
    skill: 'Design fundamentals',
    course: 'Design Foundations for Faster Reviews',
    path: 'Design Craft path (4 modules)',
    assessment: 'Design critique exercise',
    mins: 120,
  },
  bug: {
    skill: 'Debugging & quality',
    course: 'Systematic Debugging & Root-Cause Analysis',
    path: 'Engineering Quality path (4 modules)',
    assessment: 'Defect-triage scenario',
    mins: 100,
  },
  docs: {
    skill: 'Technical writing',
    course: 'Clear Docs: Writing for Your Team',
    path: 'Communication path (3 modules)',
    assessment: 'Doc clarity review',
    mins: 50,
  },
  research: {
    skill: 'Research & analysis',
    course: 'Structured Research & Synthesis',
    path: 'Analytical Thinking path (4 modules)',
    assessment: 'Research framing exercise',
    mins: 80,
  },
};

function buildElevateRecs(members, tasks, history, commitments) {
  return members.map(m => {
    const email = (m.email || '').toLowerCase();
    const mine = (tasks || []).filter(t => (t.assignee_email || '').toLowerCase() === email);
    if (mine.length === 0) return null;
    const myCommit = commitments.filter(x => (x.who || '').toLowerCase() === email);
    const resolved = myCommit.filter(x => x.outcome === 'kept' || x.outcome === 'missed');
    const missed = resolved.filter(x => x.outcome === 'missed').length;
    const deadlineRate = resolved.length ? missed / resolved.length : 0;
    const blockers = mine.filter(t => t.status === 'blocked' || t.blocker).length;
    const completion = mine.length ? mine.filter(t => t.status === 'done').length / mine.length : 1;

    // weakest skill area by label: where this person has the most open/blocked work
    const labelTrouble = {};
    mine.forEach(t => {
      if (t.status === 'done') return;
      const key = (t.label || '').toLowerCase();
      const id = key.includes('design') ? 'design' : key.includes('bug') ? 'bug' : key.includes('doc') ? 'docs' : key.includes('research') ? 'research' : null;
      if (id) labelTrouble[id] = (labelTrouble[id] || 0) + 1;
    });
    const weakLabel = Object.entries(labelTrouble).sort((a, b) => b[1] - a[1])[0];

    // Decide root cause (priority order)
    const recs = [];
    if (deadlineRate >= 0.34 && resolved.length >= 2) recs.push({ cause: `Missed ${missed} of ${resolved.length} deadlines`, key: 'time', severity: 'high' });
    if (blockers >= 2) recs.push({ cause: `${blockers} tasks stuck on blockers`, key: 'unblock', severity: 'med' });
    if (completion < 0.4 && mine.length >= 3) recs.push({ cause: `Only ${Math.round(completion*100)}% of tasks completed`, key: 'focus', severity: 'high' });
    if (weakLabel && weakLabel[1] >= 2) recs.push({ cause: `${weakLabel[1]} open ${ELEVATE_CATALOG[weakLabel[0]].skill.toLowerCase()} tasks`, key: weakLabel[0], severity: 'med' });

    if (recs.length === 0) return { m, healthy: true, recs: [] };
    // de-dupe by key, keep first (highest priority)
    const seen = new Set();
    const unique = recs.filter(r => { if (seen.has(r.key)) return false; seen.add(r.key); return true; });
    return { m, healthy: false, recs: unique };
  }).filter(Boolean);
}

function ElevateTab({ tasks, members, history, team }) {
  const c = useC();
  const commitments = buildCommitments(tasks, history);
  const rows = buildElevateRecs(members, tasks, history, commitments);
  const needing = rows.filter(r => !r.healthy);
  const sevColor = (s) => s === 'high' ? '#DC2626' : '#D97706';

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: c.text, marginBottom: 4 }}>✦ StandSync Elevate</h2>
        <p style={{ fontSize: 12.5, color: c.mut, lineHeight: 1.6 }}>Where performance meets learning. Elevate watches real work signals — missed deadlines, recurring blockers, weak skill areas — infers the likely root cause, and recommends targeted learning. Work and growth, connected.</p>
      </div>

      {needing.length === 0 ? (
        <Card style={{ padding: '40px', textAlign: 'center' }}>
          <div style={{ fontSize: 34, marginBottom: 12 }}>🎓</div>
          <div style={{ color: c.sub, fontSize: 14, fontWeight: 600, marginBottom: 4 }}>No learning gaps detected</div>
          <div style={{ color: c.mut, fontSize: 12.5 }}>Everyone's performance signals look healthy. Recommendations appear when patterns emerge.</div>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {needing.map(({ m, recs }) => (
            <Card key={m.email} style={{ padding: '18px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <Av member={m} size={34} url={m.avatar_url}/>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: c.text }}>{m.name || m.email.split('@')[0]}</div>
                  <div style={{ fontSize: 12, color: c.mut }}>{recs.length} recommendation{recs.length !== 1 ? 's' : ''}</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {recs.map((r, i) => {
                  const cat = ELEVATE_CATALOG[r.key];
                  return (
                    <div key={i} style={{ borderRadius: 12, border: `1px solid ${c.bord}`, overflow: 'hidden' }}>
                      <div style={{ padding: '10px 14px', background: sevColor(r.severity) + '12', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: sevColor(r.severity) }}/>
                        <span style={{ fontSize: 12, color: c.sub }}>Detected: <strong style={{ color: c.text }}>{r.cause}</strong></span>
                        <span style={{ marginLeft: 'auto', fontSize: 10.5, color: sevColor(r.severity), fontWeight: 700, textTransform: 'uppercase' }}>{r.severity === 'high' ? 'Priority' : 'Suggested'}</span>
                      </div>
                      <div style={{ padding: '12px 14px' }}>
                        <div style={{ fontSize: 11, color: c.mut, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>Recommended · {cat.skill}</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                            <span style={{ fontSize: 14 }}>📘</span>
                            <span style={{ flex: 1, fontSize: 13, color: c.text, fontWeight: 600 }}>{cat.course}</span>
                            <span style={{ fontSize: 11, color: c.mut }}>~{cat.mins} min</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                            <span style={{ fontSize: 14 }}>🗺️</span>
                            <span style={{ flex: 1, fontSize: 13, color: c.sub }}>{cat.path}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                            <span style={{ fontSize: 14 }}>📝</span>
                            <span style={{ flex: 1, fontSize: 13, color: c.sub }}>{cat.assessment}</span>
                          </div>
                        </div>
                        <button onClick={() => { try { navigator.clipboard.writeText(`Recommended for ${m.name || m.email}: ${cat.course} (${cat.path}). Detected: ${r.cause}.`); } catch {} }}
                          style={{ marginTop: 12, fontSize: 12, fontWeight: 600, color: '#0070F3', background: 'rgba(0,112,243,.1)', border: '1px solid rgba(0,112,243,.25)', borderRadius: 8, padding: '7px 14px', cursor: 'pointer' }}>
                          Share recommendation
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}
          <p style={{ fontSize: 11, color: c.mut, lineHeight: 1.5 }}>Recommendations are generated from live performance signals and mapped to the Elevate learning catalog. Connecting a live LMS/course provider would let assignments and progress flow back into these cards.</p>
        </div>
      )}
    </div>
  );
}


function TimeSavedTab({ tasks, members, history, team }) {
  const c = useC();
  const standups = (history || []).length;
  const tasksTracked = (tasks || []).length;
  const completed = (tasks || []).filter(t => t.status === 'done').length;
  const reportsGenerated = standups; // one daily summary per stand-up cycle

  // Transparent assumptions (minutes saved per action vs. doing it manually)
  const A = { standup: 18, report: 12, statusChase: 4, autoUpdate: 2 };
  const meetingsAvoided = standups; // each async stand-up replaces a sync meeting
  const statusChases = completed; // each tracked completion = a status update not chased
  const minutes = standups * A.standup + reportsGenerated * A.report + statusChases * A.statusChase + tasksTracked * A.autoUpdate;
  const hours = Math.round(minutes / 60 * 10) / 10;

  const stat = (icon, value, label, sub) => (
    <div style={{ padding: '20px', borderRadius: 16, background: c.surf, border: `1px solid ${c.bord}` }}>
      <div style={{ fontSize: 20, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: c.text }}>{value}</div>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: c.sub, marginTop: 4 }}>{label}</div>
      <div style={{ fontSize: 11, color: c.mut, marginTop: 2 }}>{sub}</div>
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: c.text, marginBottom: 4 }}>Time saved</h2>
        <p style={{ fontSize: 12.5, color: c.mut, lineHeight: 1.6 }}>What StandSync has saved you as a manager — meetings replaced by async stand-ups, status updates you didn't have to chase, and reports generated automatically.</p>
      </div>

      {/* Hero hours-saved */}
      <div style={{ borderRadius: 18, background: 'linear-gradient(135deg, rgba(0,112,243,.12), rgba(129,140,248,.06))', border: '1px solid rgba(0,112,243,.25)', padding: '26px', marginBottom: 18, textAlign: 'center' }}>
        <div style={{ fontSize: 12, color: c.mut, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Estimated time saved</div>
        <div style={{ fontSize: 46, fontWeight: 800, color: '#0070F3', lineHeight: 1 }}>{hours} <span style={{ fontSize: 22 }}>hours</span></div>
        <div style={{ fontSize: 12.5, color: c.sub, marginTop: 8 }}>≈ {Math.round(hours * 60)} minutes of manager overhead avoided</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 14, marginBottom: 18 }}>
        {stat('🗓️', meetingsAvoided, 'Meetings avoided', 'async stand-ups instead of sync calls')}
        {stat('📝', reportsGenerated, 'Reports generated', 'daily summaries created automatically')}
        {stat('🔔', statusChases, 'Status updates automated', "completions you didn't have to chase")}
        {stat('✅', tasksTracked, 'Tasks tracked', 'kept current without manual logging')}
      </div>

      <Card style={{ padding: '18px 20px' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: c.text, marginBottom: 10 }}>How this is calculated</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {[
            [`${standups} stand-ups`, `× ${A.standup} min saved vs. a sync meeting`],
            [`${reportsGenerated} reports`, `× ${A.report} min vs. writing a summary by hand`],
            [`${statusChases} status updates`, `× ${A.statusChase} min vs. chasing each person`],
            [`${tasksTracked} tasks tracked`, `× ${A.autoUpdate} min vs. manual logging`],
          ].map((r, i) => (
            <div key={i} style={{ display: 'flex', fontSize: 12.5 }}>
              <span style={{ width: 160, fontWeight: 600, color: c.text }}>{r[0]}</span>
              <span style={{ color: c.mut }}>{r[1]}</span>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 11, color: c.mut, marginTop: 12, lineHeight: 1.5 }}>These are transparent estimates based on typical manual overhead, not tracked stopwatch time. Adjust the per-action assumptions to match your team's reality.</p>
      </Card>
    </div>
  );
}


function HistTab({ history, members }) {
  const c=useC(); const [open,setOpen]=useState(null); const fmt=d=>new Date(d+'T12:00').toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  return(<div><div style={{ marginBottom:18 }}><h2 style={{ fontSize:18,fontWeight:700,color:c.text,marginBottom:4 }}>🕓 Standup history</h2><p style={{ fontSize:12.5,color:c.mut }}>A day-by-day archive of past standups. Open any day to see exactly what each person committed to and whether it was completed — your audit trail and time machine, distinct from Overview (today) and Performance (cumulative scores).</p></div>{history.length===0?<Card style={{ padding:'40px',textAlign:'center' }}><div style={{ fontSize:36,marginBottom:12 }}>📅</div><div style={{ color:c.mut,fontSize:14 }}>History appears after your first standup</div></Card>:history.map(s=>{ const t=s.tasks||[],d=t.filter(x=>x.status==='done').length,b=t.filter(x=>x.status==='blocked').length,pct=t.length?Math.round(d/t.length*100):0,isOpen=open===s.id; return(<Card key={s.id} style={{ marginBottom:10,overflow:'hidden' }}><button onClick={()=>setOpen(isOpen?null:s.id)} style={{ width:'100%',display:'flex',alignItems:'center',gap:12,padding:'14px 18px',background:'transparent',border:'none',cursor:'pointer',color:c.text }}><div style={{ width:7,height:7,borderRadius:'50%',background:pct===100?'#34D399':'#3B9EFF',flexShrink:0 }}/><span style={{ flex:1,fontSize:14,fontWeight:500,textAlign:'left' }}>{fmt(s.date)}</span>{b>0&&<span style={{ fontSize:11,color:'#F87171',background:'rgba(239,68,68,.12)',padding:'2px 8px',borderRadius:20 }}>⚠️ {b}</span>}<span style={{ fontSize:11,color:c.mut,background:'rgba(128,128,128,.1)',padding:'2px 10px',borderRadius:20 }}>{d}/{t.length} · {pct}%</span><span style={{ color:c.mut,transform:isOpen?'rotate(180deg)':'none',transition:'transform .2s',fontSize:16 }}>⌃</span></button>{isOpen&&<div style={{ borderTop:`1px solid ${c.bord}` }}>{t.map(task=>{ const m=members.find(x=>x.email===task.assignee_email); return(<div key={task.id} style={{ display:'flex',alignItems:'center',gap:10,padding:'9px 18px',borderBottom:`1px solid ${c.bord}` }}><div style={{ width:6,height:6,borderRadius:'50%',background:getPriority(task.priority).color,flexShrink:0 }}/><span style={{ flex:1,fontSize:12,color:task.status==='done'?c.mut:c.sub,textDecoration:task.status==='done'?'line-through':'none' }}>{task.title}</span>{task.timeline&&<span style={{ fontSize:10,color:c.mut }}>{task.timeline}</span>}{m&&<Av member={m} size={22}/>}<SBadge status={task.status}/></div>); })}</div>}</Card>); })}</div>);
}

function TeamSettingsTab({ team, members, session, onMembersUpdate, hideMembers = false }) {
  const c=useC();
  const [invEmail,setInvEmail]=useState(''); const [sending,setSending]=useState(false); const [sent,setSent]=useState(false); const [lastInviteLink,setLastInviteLink]=useState(''); const [copied,setCopied]=useState(false);
  const [rooms,setRooms]=useState([]); const [loadingRooms,setLoadingRooms]=useState(true);
  const [newRoomName,setNewRoomName]=useState(''); const [creatingRoom,setCreatingRoom]=useState(false);
  const [editMember,setEditMember]=useState(null); // {id, name, designation, role}
  const [editDesg,setEditDesg]=useState(''); const [editRole,setEditRole]=useState('');
  const [saving,setSaving]=useState(false);
  const [tab,setTab]=useState(hideMembers?'rooms':'members'); // members | rooms | invite

  useEffect(()=>{
    if(!SB.IS_LIVE)return;
    SB.getTeamRooms(team.id).then(r=>{ setRooms(r); setLoadingRooms(false); });
  },[team.id]);

  const [inviteRoom,setInviteRoom]=useState(null); // {roomId,password} to show after invite
  const sendInv=async()=>{
    if(!invEmail.trim()||!invEmail.includes('@'))return;
    setSending(true);
    let link='', roomInfo=null;
    try{
      if(SB.IS_LIVE){
        const myName=session?.user?.user_metadata?.name||session?.user?.email;
        const r=await SB.inviteMember(team.id,team.name,invEmail.trim(),myName);
        link=r?.link||'';
        setLastInviteLink(link);
        // Attach a room code if one exists (first room) so they can join either way
        if(rooms&&rooms.length){ roomInfo={ roomId:rooms[0].room_id||rooms[0].code, password:rooms[0].password }; setInviteRoom(roomInfo); }
        // Send via the serverless endpoint (real delivery once /api/send + RESEND_API_KEY are set)
        const subject=`You're invited to join ${team.name} on StandSync`;
        const lines=[
          `Hi,`,``,
          `${myName} has invited you to join the team "${team.name}" on StandSync.`,``,
          link?`Join with this link: ${link}`:'',
          roomInfo?`\nOr join with a room code:\n  Room ID: ${roomInfo.roomId}\n  Password: ${roomInfo.password}`:'',
          ``,
          `If you already have a StandSync account, the link signs you straight in to the team. If not, you'll be taken to the sign-up page first.`,
        ].filter(Boolean).join('\n');
        try{
          await Promise.race([
            fetch('/api/send',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({to:invEmail.trim(),subject,text:lines})}),
            new Promise(r=>setTimeout(r,5000))
          ]);
        }catch(e){}
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

  const [confirmRemove,setConfirmRemove]=useState(null); // member object pending removal
  const [removing,setRemoving]=useState(false);
  const doRemove=async()=>{
    if(!confirmRemove)return;
    setRemoving(true);
    try{
      if(SB.IS_LIVE){
        const rm=(typeof SB.removeMember==='function')?SB.removeMember:null;
        if(rm){ await rm(confirmRemove.id); }
        else if(SB.supabase){ await SB.supabase.from('team_members').delete().eq('id',confirmRemove.id); }
      }
    }catch(e){}
    onMembersUpdate&&onMembersUpdate();
    setConfirmRemove(null); setRemoving(false); setEditMember(null);
  };

  const TABS=[...(hideMembers?[]:[{id:'members',l:'Members',i:'👥'}]),{id:'rooms',l:'Rooms & codes',i:'🔑'},{id:'invite',l:'Invite',i:'📧'}];

  return(
    <div>
      {confirmRemove&&(
        <Modal onClose={()=>setConfirmRemove(null)} title="Remove team member" width={420}>
          <div style={{ display:'flex',alignItems:'center',gap:12,marginBottom:16 }}>
            <Av member={confirmRemove} size={44} url={confirmRemove.avatar_url}/>
            <div><div style={{ fontSize:14,fontWeight:700,color:c.text }}>{confirmRemove.name||confirmRemove.email}</div><div style={{ fontSize:12,color:c.mut }}>{confirmRemove.email}</div></div>
          </div>
          <p style={{ fontSize:13,color:c.sub,lineHeight:1.6,marginBottom:18 }}>This will remove <strong>{confirmRemove.name||confirmRemove.email.split('@')[0]}</strong> from the team. They'll lose access to the team's tasks, boards, and chat. This can't be undone (they'd need a new invite to rejoin).</p>
          <div style={{ display:'flex',gap:8,justifyContent:'flex-end' }}>
            <Btn v="ghost" onClick={()=>setConfirmRemove(null)}>Cancel</Btn>
            <Btn onClick={doRemove} loading={removing} style={{ background:'#EF4444',border:'none' }}>Remove from team</Btn>
          </div>
        </Modal>
      )}
      <div style={{ display:'flex',gap:6,marginBottom:20 }}>
        {TABS.map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={{ padding:'7px 14px',borderRadius:8,border:`1px solid ${tab===t.id?'#0070F3':c.bord}`,background:tab===t.id?'rgba(0,112,243,.15)':'transparent',color:tab===t.id?'#3B9EFF':c.mut,cursor:'pointer',fontSize:13,fontWeight:tab===t.id?700:400,display:'flex',alignItems:'center',gap:6 }}><span>{t.i}</span>{t.l}</button>)}
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
                  <div style={{ fontSize:11,color:'#3B9EFF',marginTop:2 }}>{m.designation||m.role}</div>
                </div>
                <span style={{ fontSize:11,color:m.role==='manager'?'#3B9EFF':'#34D399',background:m.role==='manager'?'rgba(129,140,248,.12)':'rgba(52,211,153,.12)',padding:'3px 9px',borderRadius:20,textTransform:'capitalize' }}>{m.role}</span>
                {session?.user?.id!==m.user_id&&(
                  <button onClick={()=>{setEditMember(m);setEditDesg(m.designation||'');setEditRole(m.role||'member');}} style={{ fontSize:12,color:c.mut,background:c.surf,border:`1px solid ${c.bord}`,borderRadius:7,cursor:'pointer',padding:'4px 10px' }}>Edit</button>
                )}
              </div>
              {editMember?.id===m.id&&(
                <div style={{ padding:'14px',background:'rgba(0,112,243,.06)',borderRadius:10,margin:'8px 0',display:'flex',flexDirection:'column',gap:10 }}>
                  <Inp label="Designation" value={editDesg} onChange={e=>setEditDesg(e.target.value)} placeholder="e.g. Frontend Developer, QA Lead..."/>
                  <Sel label="Role" value={editRole} onChange={e=>setEditRole(e.target.value)}>
                    <option value="member">Member</option>
                    <option value="team_lead">Team Lead</option>
                    <option value="manager">Manager</option>
                  </Sel>
                  <div style={{ display:'flex',gap:8 }}>
                    <Btn v="ghost" onClick={()=>setEditMember(null)} style={{ flex:1,justifyContent:'center' }}>Cancel</Btn>
                    <Btn onClick={saveDesignation} loading={saving} style={{ flex:2,justifyContent:'center' }}>Save changes</Btn>
                  </div>
                  {isManager&&m.role!=='manager'&&<button onClick={()=>setConfirmRemove(m)} style={{ marginTop:4,padding:'8px',borderRadius:8,border:'1px solid rgba(239,68,68,.3)',background:'rgba(239,68,68,.06)',color:'#EF4444',cursor:'pointer',fontSize:12.5,fontWeight:600 }}>Remove {m.name||m.email.split('@')[0]} from team</button>}
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
                      <div style={{ background:'rgba(0,112,243,.1)',border:'1px solid rgba(0,112,243,.25)',borderRadius:8,padding:'6px 12px',textAlign:'center' }}>
                        <div style={{ fontSize:9,color:'#3B9EFF',fontWeight:700,textTransform:'uppercase',letterSpacing:'.08em',marginBottom:3 }}>Room ID</div>
                        <div style={{ fontSize:16,fontWeight:800,color:'#3B9EFF',letterSpacing:'.12em',fontFamily:'monospace' }}>{room.room_id}</div>
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
              <div style={{ padding:'12px 14px',background:'rgba(0,112,243,.08)',border:'1px solid rgba(0,112,243,.25)',borderRadius:10 }}>
                <div style={{ fontSize:11,fontWeight:700,color:'#3B9EFF',marginBottom:6,textTransform:'uppercase',letterSpacing:'.07em' }}>Share this link</div>
                <div style={{ fontSize:11,color:c.text,wordBreak:'break-all',marginBottom:8,fontFamily:'monospace',background:c.surf,padding:'8px 10px',borderRadius:6,border:`1px solid ${c.bord}` }}>{lastInviteLink}</div>
                <button onClick={()=>{navigator.clipboard&&navigator.clipboard.writeText(lastInviteLink);setCopied(true);setTimeout(()=>setCopied(false),2000);}} style={{ fontSize:12,color:'#3B9EFF',background:'rgba(0,112,243,.12)',border:'1px solid rgba(0,112,243,.25)',borderRadius:7,cursor:'pointer',padding:'5px 12px',fontWeight:600 }}>{copied?'✓ Copied!':'Copy link'}</button>
                <div style={{ fontSize:11,color:c.mut,marginTop:6 }}>They click this link, create an account, and join your team automatically.</div>
                {inviteRoom&&(
                  <div style={{ marginTop:10,paddingTop:10,borderTop:`1px solid ${c.bord}` }}>
                    <div style={{ fontSize:11,fontWeight:700,color:'#3B9EFF',marginBottom:6,textTransform:'uppercase',letterSpacing:'.07em' }}>Or share a room code</div>
                    <div style={{ display:'flex',gap:8,flexWrap:'wrap' }}>
                      <span style={{ fontSize:12,color:c.text,fontFamily:'monospace',background:c.surf,padding:'6px 10px',borderRadius:6,border:`1px solid ${c.bord}` }}>Room: <strong>{inviteRoom.roomId}</strong></span>
                      <span style={{ fontSize:12,color:c.text,fontFamily:'monospace',background:c.surf,padding:'6px 10px',borderRadius:6,border:`1px solid ${c.bord}` }}>Password: <strong>{inviteRoom.password}</strong></span>
                    </div>
                    <button onClick={()=>{const txt=`Join ${team.name} on StandSync\nLink: ${lastInviteLink}\nRoom: ${inviteRoom.roomId}  Password: ${inviteRoom.password}`;navigator.clipboard&&navigator.clipboard.writeText(txt);setCopied(true);setTimeout(()=>setCopied(false),2000);}} style={{ marginTop:8,fontSize:12,color:'#3B9EFF',background:'rgba(0,112,243,.12)',border:'1px solid rgba(0,112,243,.25)',borderRadius:7,cursor:'pointer',padding:'5px 12px',fontWeight:600 }}>{copied?'✓ Copied!':'Copy link + code'}</button>
                  </div>
                )}
              </div>
            )}
            <div style={{ marginTop:10,padding:'9px 12px',background:'rgba(0,112,243,.07)',border:'1px solid rgba(0,112,243,.2)',borderRadius:8,fontSize:12,color:c.sub }}>
              ✉️ The invite is emailed automatically when <code style={{color:'#3B9EFF'}}>RESEND_API_KEY</code> is set in Vercel. You can always copy the link above to share it directly.
            </div>
          </Card>
          <Card style={{ padding:'14px 20px' }}>
            <div style={{ fontSize:13,color:c.sub,fontWeight:600,marginBottom:3 }}>Faster option</div>
            <div style={{ fontSize:13,color:c.mut }}>Share the Room ID + password from the <strong style={{ color:'#3B9EFF' }}>Rooms tab</strong> — members join instantly without any link.</div>
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
    <div style={{ borderRadius: 14, border: `1px solid rgba(0,112,243,.25)`, background: dark ? 'rgba(0,112,243,.06)' : 'rgba(0,112,243,.04)', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '12px 18px', borderBottom: `1px solid rgba(0,112,243,.15)`, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2L13.5 8.5L20 7L14.5 11.5L17 18L12 14L7 18L9.5 11.5L4 7L10.5 8.5L12 2Z" fill="#A78BFA"/></svg>
        <span style={{ fontSize: 14, fontWeight: 700, color: c.text }}>Ask AI about this project</span>
        <span style={{ fontSize: 11, color: '#3B9EFF', background: 'rgba(0,112,243,.1)', padding: '2px 8px', borderRadius: 20 }}>Gemini · Free</span>
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
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(0,112,243,.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 13 }}>✦</div>
              )}
              <div style={{ maxWidth: '82%', padding: '9px 13px', borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '4px 14px 14px 14px',
                background: msg.role === 'user' ? 'linear-gradient(135deg,#0070F3,#3B9EFF)' : (dark ? 'rgba(255,255,255,.07)' : 'rgba(255,255,255,.95)'),
                color: msg.role === 'user' ? '#fff' : c.text, fontSize: 13, lineHeight: 1.65,
                border: msg.role === 'user' ? 'none' : `1px solid ${c.bord}`, whiteSpace: 'pre-wrap' }}>
                {msg.text}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(0,112,243,.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>✦</div>
              <div style={{ padding: '10px 14px', background: dark ? 'rgba(255,255,255,.07)' : 'rgba(255,255,255,.95)', borderRadius: '4px 14px 14px 14px', border: `1px solid ${c.bord}`, display: 'flex', gap: 5, alignItems: 'center' }}>
                {[0,1,2].map(i => <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: '#3B9EFF', animation: `bounce .8s ease ${i*.18}s infinite` }}/>)}
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
            <button key={q} onClick={() => ask(q)} style={{ fontSize: 11, padding: '5px 12px', borderRadius: 20, border: `1px solid rgba(0,112,243,.28)`, background: 'rgba(0,112,243,.07)', color: '#3B9EFF', cursor: 'pointer' }}>{q}</button>
          ))}
        </div>
      )}

      {/* Input — ALWAYS mounted, never remounts */}
      <div style={{ padding: '10px 14px', display: 'flex', gap: 8, borderTop: history.length ? `1px solid rgba(0,112,243,.1)` : 'none', alignItems: 'center' }}>
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(); } }}
          placeholder="Ask anything about this project, its files, SOPs…"
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: c.text, fontSize: 13, lineHeight: 1.5, minWidth: 0 }}
        />
        <button onClick={() => ask()} disabled={!query.trim() || loading}
          style={{ padding: '7px 18px', borderRadius: 9, background: query.trim() && !loading ? 'linear-gradient(135deg,#0070F3,#3B9EFF)' : 'transparent',
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
                  style={{ padding: '6px 14px', borderRadius: 8, background: 'linear-gradient(135deg,#0070F3,#3B9EFF)', color: '#fff', textDecoration: 'none', fontSize: 12, fontWeight: 600 }}>
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
                    <a href={preview.dataUrl} download={preview.name} style={{ display: 'inline-block', marginTop: 16, padding: '10px 24px', borderRadius: 10, background: 'linear-gradient(135deg,#0070F3,#3B9EFF)', color: '#fff', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
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
            style={{ padding: '6px 16px', borderRadius: 8, background: extracting ? 'rgba(0,112,243,.3)' : 'linear-gradient(135deg,#0070F3,#3B9EFF)', color: '#fff', border: 'none', cursor: extracting ? 'wait' : 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
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
                <span key={t} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: dark ? 'rgba(255,255,255,.06)' : 'rgba(0,112,243,.08)', color: c.mut, border: `1px solid ${c.bord}` }}>{t}</span>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px,1fr))', gap: 10, padding: 14 }}>
            {files.map(f => (
              <div key={f.id} style={{ padding: '12px 14px', borderRadius: 10, background: dark ? 'rgba(255,255,255,.05)' : 'rgba(255,255,255,.9)', border: `1px solid ${c.bord}`, position: 'relative', cursor: 'pointer', transition: 'border-color .15s' }}
                onClick={() => openFile(f)}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#3B9EFF'}
                onMouseLeave={e => e.currentTarget.style.borderColor = c.bord}>
                {f.type?.startsWith('image/') && f.dataUrl
                  ? <img src={f.dataUrl} alt={f.name} style={{ width: '100%', height: 72, objectFit: 'cover', borderRadius: 6, marginBottom: 8 }}/>
                  : <div style={{ fontSize: 28, marginBottom: 8, textAlign: 'center' }}>{fileIcon(f)}</div>
                }
                <div style={{ fontSize: 12, fontWeight: 600, color: c.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2 }} title={f.name}>{f.name}</div>
                <div style={{ fontSize: 10, color: c.mut, marginBottom: 3 }}>{Math.round(f.size/1024)}KB · {new Date(f.uploadedAt).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}</div>
                <div style={{ fontSize: 10, color: textExtracted(f) ? '#34D399' : '#3B9EFF' }}>
                  {textExtracted(f) ? '✓ Text extracted · AI readable' : (f.dataUrl ? '👁 Click to view · AI reference' : '📎 AI reference')}
                </div>
                <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
                  <button onClick={e => { e.stopPropagation(); openFile(f); }}
                    style={{ flex: 1, padding: '4px 0', borderRadius: 6, background: dark ? 'rgba(255,255,255,.07)' : 'rgba(0,112,243,.08)', border: 'none', color: c.text, cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>👁 View</button>
                  <button onClick={e => { e.stopPropagation(); removeFile(f.id); }}
                    style={{ width: 28, padding: '4px 0', borderRadius: 6, background: 'rgba(239,68,68,.08)', border: 'none', color: '#F87171', cursor: 'pointer', fontSize: 11 }}>×</button>
                </div>
              </div>
            ))}
            <div onClick={() => fileInputRef.current?.click()}
              style={{ padding: 12, borderRadius: 10, border: `1.5px dashed ${c.bord}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer', minHeight: 80 }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#3B9EFF'}
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
          <button onClick={onNewPage} style={{ padding: '8px 16px', borderRadius: 9, background: 'linear-gradient(135deg,#0070F3,#3B9EFF)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>+ New page</button>
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
                onMouseEnter={e=>e.currentTarget.style.borderColor='#3B9EFF'} onMouseLeave={e=>e.currentTarget.style.borderColor=c.bord}>
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
            <button onClick={onNewPage} style={{ padding: '9px 20px', borderRadius: 9, background: 'linear-gradient(135deg,#0070F3,#3B9EFF)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>+ Create first page</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {projPages.map(pg => (
              <div key={pg.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, cursor: 'pointer', border: '1px solid transparent', transition: 'all .12s' }}
                onClick={() => onOpenPage(pg.id)}
                onMouseEnter={e=>{e.currentTarget.style.background=dark?'rgba(255,255,255,.04)':'rgba(0,112,243,.05)';e.currentTarget.style.borderColor=c.bord;}}
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
  const [npColor, setNpColor] = useState('#0070F3');
  const [npDesc, setNpDesc]   = useState('');

  // new page form
  const [pgTitle, setPgTitle] = useState('');
  const [pgEmoji, setPgEmoji] = useState('📄');

  const EMOJI_PRESETS = ['📁','🚀','⚡','🎯','🔥','💡','🏗️','🎨','🔬','📱','📊','🔧','📋','🌟','🛡️','🤖','💬','📅','🔑','🌐'];
  const COLOR_PRESETS = ['#0070F3','#34D399','#F87171','#FBBF24','#60A5FA','#F472B6','#A78BFA','#14B8A6','#F97316','#8B5CF6'];

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
        const dp = { id:'p1', name:'Getting Started', emoji:'🚀', color:'#0070F3', desc:'Team knowledge base', createdAt:Date.now() };
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
    setNpName(''); setNpDesc(''); setNpEmoji('📁'); setNpColor('#0070F3');
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
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍  Search docs..." style={{ width:'100%', background:dark?'rgba(255,255,255,.06)':'rgba(0,112,243,.07)', border:`1px solid ${c.bord}`, borderRadius:8, padding:'6px 10px', color:c.text, fontSize:12, outline:'none', boxSizing:'border-box' }}/>
            {search && searchResults.length > 0 && (
              <div style={{ position:'absolute', zIndex:100, width:220, background:dark?'#12103A':'#fff', border:`1px solid ${c.bord}`, borderRadius:10, marginTop:4, boxShadow:'0 8px 24px rgba(0,0,0,.2)', maxHeight:240, overflowY:'auto', left:10 }}>
                {searchResults.map(pg => {
                  const proj = projects.find(p => p.id === pg.projectId);
                  return (
                    <div key={pg.id} onClick={() => { setSelProject(pg.projectId); setSelPage(pg.id); setView('page'); setSearch(''); }}
                      style={{ padding:'9px 12px', cursor:'pointer', borderBottom:`1px solid ${c.bord}` }}
                      onMouseEnter={e=>e.currentTarget.style.background='rgba(0,112,243,.08)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
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
                  style={{ display:'flex', alignItems:'center', gap:7, padding:'7px 8px', borderRadius:8, cursor:'pointer', background:selProject===proj.id?(dark?'rgba(0,112,243,.18)':'rgba(0,112,243,.12)'):'transparent', marginBottom:2, transition:'background .12s' }}
                  onMouseEnter={e=>{if(selProject!==proj.id)e.currentTarget.style.background=dark?'rgba(255,255,255,.05)':'rgba(0,112,243,.06)';}}
                  onMouseLeave={e=>{if(selProject!==proj.id)e.currentTarget.style.background='transparent';}}>
                  <span style={{ fontSize:15, flexShrink:0 }}>{proj.emoji}</span>
                  <span style={{ fontSize:13, fontWeight:selProject===proj.id?700:500, color:selProject===proj.id?'#3B9EFF':c.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>{proj.name}</span>
                  <div style={{ width:8, height:8, borderRadius:'50%', background:proj.color, flexShrink:0, opacity:.7 }}/>
                </div>
                {selProject===proj.id && (
                  <div style={{ paddingLeft:16, marginBottom:4 }}>
                    {pages.filter(p=>p.projectId===proj.id).map(pg=>(
                      <div key={pg.id} onClick={()=>{setSelPage(pg.id);setView('page');}}
                        style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 8px', borderRadius:7, cursor:'pointer', background:selPage===pg.id?(dark?'rgba(0,112,243,.14)':'rgba(0,112,243,.09)'):'transparent', marginBottom:1, transition:'background .1s' }}
                        onMouseEnter={e=>{if(selPage!==pg.id)e.currentTarget.style.background=dark?'rgba(255,255,255,.04)':'rgba(0,112,243,.05)';}}
                        onMouseLeave={e=>{if(selPage!==pg.id)e.currentTarget.style.background='transparent';}}>
                        <span style={{ fontSize:12 }}>{pg.pinned?'📌':pg.emoji}</span>
                        <span style={{ fontSize:12, color:selPage===pg.id?'#3B9EFF':c.sub, flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontWeight:selPage===pg.id?600:400 }}>{pg.title}</span>
                      </div>
                    ))}
                    <button onClick={()=>setView('newPage')} style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 8px', width:'100%', background:'transparent', border:'none', color:c.mut, cursor:'pointer', fontSize:11, borderRadius:6, marginTop:2 }}
                      onMouseEnter={e=>e.currentTarget.style.background=dark?'rgba(255,255,255,.04)':'rgba(0,112,243,.06)'}
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
              style={{ width:32, height:32, borderRadius:8, background:selProject===proj.id?'rgba(0,112,243,.2)':'transparent', border:selProject===proj.id?'1.5px solid #3B9EFF':'1.5px solid transparent', cursor:'pointer', fontSize:18, display:'flex', alignItems:'center', justifyContent:'center' }}>
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
      if (type==='quote')    return {...base, fontStyle:'italic', borderLeft:'4px solid #3B9EFF', paddingLeft:16, color:'#374151'};
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
        const ts = {info:{bg:'rgba(0,112,243,.08)',border:'rgba(0,112,243,.25)',icon:'ℹ️'},warning:{bg:'rgba(245,158,11,.08)',border:'rgba(245,158,11,.25)',icon:'⚠️'},success:{bg:'rgba(52,211,153,.08)',border:'rgba(52,211,153,.25)',icon:'✅'},danger:{bg:'rgba(239,68,68,.08)',border:'rgba(239,68,68,.25)',icon:'🚨'}};
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
          <button onClick={()=>setShowAI(s=>!s)} style={{ padding:'4px 12px', borderRadius:7, background:showAI?'rgba(0,112,243,.12)':'transparent', border:`1px solid ${showAI?'rgba(0,112,243,.3)':'rgba(0,0,0,.1)'}`, color:showAI?'#0070F3':'#94A3B8', cursor:'pointer', fontSize:12, fontWeight:600 }}>✦ Ask AI</button>
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
              onMouseEnter={e=>e.currentTarget.style.color='#0070F3'} onMouseLeave={e=>e.currentTarget.style.color='#9CA3AF'}>
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
      <button onClick={()=>setView('newProject')} style={{ padding:'12px 28px', borderRadius:10, background:'linear-gradient(135deg,#0070F3,#3B9EFF)', color:'#fff', border:'none', cursor:'pointer', fontSize:14, fontWeight:700 }}>+ Create your first project</button>
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
            <div style={{ width:52, height:52, borderRadius:12, background:dark?'rgba(255,255,255,.06)':'rgba(0,112,243,.07)', border:`1.5px solid ${c.bord}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, cursor:'pointer' }}>{npEmoji}</div>
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
        <button onClick={createProject} disabled={!npName.trim()} style={{ padding:'11px 28px', borderRadius:10, background:'linear-gradient(135deg,#0070F3,#3B9EFF)', color:'#fff', border:'none', cursor:npName.trim()?'pointer':'not-allowed', fontSize:14, fontWeight:700, opacity:npName.trim()?1:.5 }}>Create project</button>
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
            <div style={{ width:48, height:48, borderRadius:10, background:dark?'rgba(255,255,255,.06)':'rgba(0,112,243,.07)', border:`1.5px solid ${c.bord}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, cursor:'pointer' }}>{pgEmoji}</div>
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
        <button onClick={createPage} disabled={!pgTitle.trim()} style={{ padding:'11px 24px', borderRadius:10, background:'linear-gradient(135deg,#0070F3,#3B9EFF)', color:'#fff', border:'none', cursor:pgTitle.trim()?'pointer':'not-allowed', fontSize:14, fontWeight:700, opacity:pgTitle.trim()?1:.5 }}>Create page</button>
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
// ─── BRAINSTORM: welcome screen + template library ───────────────────────────
const BS_TEMPLATES = [
  // Strategy & Planning
  { id:'swot', cat:'Strategy & Planning', name:'SWOT Analysis', icon:'🎯', desc:'Strengths, Weaknesses, Opportunities, Threats',
    nodes:[
      {k:'t',type:'text',x:300,y:0,w:240,h:36,text:'SWOT Analysis',fontSize:20,fontWeight:700,textAlign:'center'},
      {k:'s',type:'sticky',x:60,y:60,w:230,h:180,text:'STRENGTHS\n\n• \n• \n• ',color:'#BBF7D0'},
      {k:'w',type:'sticky',x:320,y:60,w:230,h:180,text:'WEAKNESSES\n\n• \n• \n• ',color:'#FECACA'},
      {k:'o',type:'sticky',x:60,y:260,w:230,h:180,text:'OPPORTUNITIES\n\n• \n• \n• ',color:'#BFDBFE'},
      {k:'th',type:'sticky',x:320,y:260,w:230,h:180,text:'THREATS\n\n• \n• \n• ',color:'#FDE68A'},
    ]},
  { id:'okr', cat:'Strategy & Planning', name:'OKR Planning', icon:'📈', desc:'Objective with measurable key results',
    nodes:[
      {k:'o',type:'shape',shape:'pill',x:180,y:0,w:300,h:70,text:'OBJECTIVE\nWhat we want to achieve',fill:'#0070F3',color:'#fff',fontSize:13,fontWeight:700,textAlign:'center'},
      {k:'k1',type:'sticky',x:40,y:160,w:200,h:130,text:'Key Result 1\n\nMeasure: ',color:'#BFDBFE'},
      {k:'k2',type:'sticky',x:260,y:160,w:200,h:130,text:'Key Result 2\n\nMeasure: ',color:'#BFDBFE'},
      {k:'k3',type:'sticky',x:480,y:160,w:200,h:130,text:'Key Result 3\n\nMeasure: ',color:'#BFDBFE'},
    ],connections:[{from:'o',to:'k1'},{from:'o',to:'k2'},{from:'o',to:'k3'}]},
  { id:'roadmap', cat:'Strategy & Planning', name:'Roadmap', icon:'🛣️', desc:'Quarterly delivery timeline',
    nodes:[
      {k:'q1',type:'sticky',x:20,y:60,w:180,h:200,text:'Q1\n\n• \n• ',color:'#DDD6FE'},
      {k:'q2',type:'sticky',x:220,y:60,w:180,h:200,text:'Q2\n\n• \n• ',color:'#BFDBFE'},
      {k:'q3',type:'sticky',x:420,y:60,w:180,h:200,text:'Q3\n\n• \n• ',color:'#BBF7D0'},
      {k:'q4',type:'sticky',x:620,y:60,w:180,h:200,text:'Q4\n\n• \n• ',color:'#FDE68A'},
    ],connections:[{from:'q1',to:'q2',type:'straight'},{from:'q2',to:'q3',type:'straight'},{from:'q3',to:'q4',type:'straight'}]},
  // Product & UX
  { id:'journey', cat:'Product & UX', name:'User Journey Map', icon:'🧭', desc:'Stages, actions, emotions, pain points',
    nodes:[
      {k:'h',type:'text',x:0,y:0,w:200,h:30,text:'User Journey',fontSize:18,fontWeight:700},
      {k:'s1',type:'sticky',x:20,y:50,w:170,h:120,text:'AWARENESS\n\nActions:\nFeeling:',color:'#BFDBFE'},
      {k:'s2',type:'sticky',x:210,y:50,w:170,h:120,text:'CONSIDERATION\n\nActions:\nFeeling:',color:'#DDD6FE'},
      {k:'s3',type:'sticky',x:400,y:50,w:170,h:120,text:'DECISION\n\nActions:\nFeeling:',color:'#BBF7D0'},
      {k:'s4',type:'sticky',x:590,y:50,w:170,h:120,text:'RETENTION\n\nActions:\nFeeling:',color:'#FDE68A'},
    ],connections:[{from:'s1',to:'s2',type:'straight'},{from:'s2',to:'s3',type:'straight'},{from:'s3',to:'s4',type:'straight'}]},
  { id:'userflow', cat:'Product & UX', name:'User Flow', icon:'🔀', desc:'Screen-to-screen navigation flow',
    nodes:[
      {k:'a',type:'shape',shape:'rect',x:40,y:80,w:140,h:70,text:'Landing',fill:'#3B9EFF',color:'#fff',textAlign:'center'},
      {k:'b',type:'shape',shape:'diamond',x:240,y:70,w:150,h:90,text:'Signed in?',fill:'#FBBF24',color:'#1a1a1a',textAlign:'center'},
      {k:'c',type:'shape',shape:'rect',x:450,y:20,w:140,h:70,text:'Dashboard',fill:'#34D399',color:'#fff',textAlign:'center'},
      {k:'d',type:'shape',shape:'rect',x:450,y:140,w:140,h:70,text:'Login',fill:'#F87171',color:'#fff',textAlign:'center'},
    ],connections:[{from:'a',to:'b',type:'straight'},{from:'b',to:'c',type:'straight'},{from:'b',to:'d',type:'straight'}]},
  // Agile & PM
  { id:'retro', cat:'Agile & Project', name:'Retrospective', icon:'🔄', desc:'What went well / didn’t / actions',
    nodes:[
      {k:'g',type:'sticky',x:40,y:40,w:220,h:240,text:'😀 WENT WELL\n\n• ',color:'#BBF7D0'},
      {k:'b',type:'sticky',x:290,y:40,w:220,h:240,text:'😕 TO IMPROVE\n\n• ',color:'#FECACA'},
      {k:'a',type:'sticky',x:540,y:40,w:220,h:240,text:'✅ ACTION ITEMS\n\n• ',color:'#BFDBFE'},
    ]},
  { id:'sprint', cat:'Agile & Project', name:'Sprint Planning', icon:'🏃', desc:'Backlog → To do → Doing → Done',
    nodes:[
      {k:'a',type:'sticky',x:20,y:40,w:175,h:260,text:'BACKLOG\n\n• ',color:'#E5E7EB'},
      {k:'b',type:'sticky',x:210,y:40,w:175,h:260,text:'TO DO\n\n• ',color:'#BFDBFE'},
      {k:'c',type:'sticky',x:400,y:40,w:175,h:260,text:'IN PROGRESS\n\n• ',color:'#FDE68A'},
      {k:'d',type:'sticky',x:590,y:40,w:175,h:260,text:'DONE\n\n• ',color:'#BBF7D0'},
    ]},
  { id:'risk', cat:'Agile & Project', name:'Risk Matrix', icon:'⚠️', desc:'Likelihood × impact grid',
    nodes:[
      {k:'h',type:'text',x:0,y:0,w:300,h:30,text:'Risk Matrix (Impact × Likelihood)',fontSize:15,fontWeight:700},
      {k:'hl',type:'sticky',x:40,y:50,w:200,h:140,text:'HIGH impact\nLOW likelihood\n\nMonitor',color:'#FDE68A'},
      {k:'hh',type:'sticky',x:260,y:50,w:200,h:140,text:'HIGH impact\nHIGH likelihood\n\nMitigate now',color:'#FECACA'},
      {k:'ll',type:'sticky',x:40,y:210,w:200,h:140,text:'LOW impact\nLOW likelihood\n\nAccept',color:'#BBF7D0'},
      {k:'lh',type:'sticky',x:260,y:210,w:200,h:140,text:'LOW impact\nHIGH likelihood\n\nPlan',color:'#BFDBFE'},
    ]},
  // Brainstorming
  { id:'mindmap', cat:'Brainstorming', name:'Mind Map', icon:'🧠', desc:'Central idea with branches',
    nodes:[
      {k:'c',type:'shape',shape:'circle',x:300,y:160,w:140,h:140,text:'CENTRAL\nIDEA',fill:'#0070F3',color:'#fff',fontWeight:700,textAlign:'center'},
      {k:'b1',type:'sticky',x:60,y:40,w:150,h:90,text:'Branch 1',color:'#BFDBFE'},
      {k:'b2',type:'sticky',x:540,y:40,w:150,h:90,text:'Branch 2',color:'#BBF7D0'},
      {k:'b3',type:'sticky',x:60,y:340,w:150,h:90,text:'Branch 3',color:'#FDE68A'},
      {k:'b4',type:'sticky',x:540,y:340,w:150,h:90,text:'Branch 4',color:'#FBCFE8'},
    ],connections:[{from:'c',to:'b1'},{from:'c',to:'b2'},{from:'c',to:'b3'},{from:'c',to:'b4'}]},
  { id:'fishbone', cat:'Brainstorming', name:'Fishbone (Cause & Effect)', icon:'🐟', desc:'Root-cause analysis',
    nodes:[
      {k:'e',type:'shape',shape:'pill',x:560,y:170,w:180,h:70,text:'PROBLEM /\nEFFECT',fill:'#F87171',color:'#fff',fontWeight:700,textAlign:'center'},
      {k:'c1',type:'sticky',x:60,y:40,w:160,h:90,text:'People',color:'#BFDBFE'},
      {k:'c2',type:'sticky',x:260,y:40,w:160,h:90,text:'Process',color:'#DDD6FE'},
      {k:'c3',type:'sticky',x:60,y:280,w:160,h:90,text:'Tools',color:'#BBF7D0'},
      {k:'c4',type:'sticky',x:260,y:280,w:160,h:90,text:'Environment',color:'#FDE68A'},
    ],connections:[{from:'c1',to:'e'},{from:'c2',to:'e'},{from:'c3',to:'e'},{from:'c4',to:'e'}]},
  { id:'sixhats', cat:'Brainstorming', name:'Six Thinking Hats', icon:'🎩', desc:'Six perspectives on a decision',
    nodes:[
      {k:'w',type:'sticky',x:20,y:40,w:160,h:120,text:'⚪ WHITE\nFacts & data',color:'#F3F4F6'},
      {k:'r',type:'sticky',x:200,y:40,w:160,h:120,text:'🔴 RED\nFeelings',color:'#FECACA'},
      {k:'b',type:'sticky',x:380,y:40,w:160,h:120,text:'⚫ BLACK\nRisks',color:'#D1D5DB'},
      {k:'y',type:'sticky',x:20,y:180,w:160,h:120,text:'🟡 YELLOW\nBenefits',color:'#FDE68A'},
      {k:'g',type:'sticky',x:200,y:180,w:160,h:120,text:'🟢 GREEN\nIdeas',color:'#BBF7D0'},
      {k:'bl',type:'sticky',x:380,y:180,w:160,h:120,text:'🔵 BLUE\nProcess',color:'#BFDBFE'},
    ]},
  // Team & Ops
  { id:'decision', cat:'Team & Operations', name:'Decision Matrix', icon:'⚖️', desc:'Score options against criteria',
    nodes:[
      {k:'h',type:'text',x:0,y:0,w:300,h:30,text:'Decision Matrix',fontSize:16,fontWeight:700},
      {k:'o1',type:'sticky',x:20,y:50,w:200,h:160,text:'OPTION A\n\nPros:\nCons:\nScore: /10',color:'#BFDBFE'},
      {k:'o2',type:'sticky',x:240,y:50,w:200,h:160,text:'OPTION B\n\nPros:\nCons:\nScore: /10',color:'#DDD6FE'},
      {k:'o3',type:'sticky',x:460,y:50,w:200,h:160,text:'OPTION C\n\nPros:\nCons:\nScore: /10',color:'#BBF7D0'},
    ]},
  { id:'process', cat:'Team & Operations', name:'Process Map', icon:'🔧', desc:'Step-by-step workflow',
    nodes:[
      {k:'s',type:'shape',shape:'pill',x:20,y:120,w:130,h:60,text:'Start',fill:'#34D399',color:'#fff',textAlign:'center'},
      {k:'a',type:'shape',shape:'rect',x:190,y:115,w:140,h:70,text:'Step 1',fill:'#3B9EFF',color:'#fff',textAlign:'center'},
      {k:'b',type:'shape',shape:'rect',x:370,y:115,w:140,h:70,text:'Step 2',fill:'#3B9EFF',color:'#fff',textAlign:'center'},
      {k:'e',type:'shape',shape:'pill',x:550,y:120,w:130,h:60,text:'End',fill:'#F87171',color:'#fff',textAlign:'center'},
    ],connections:[{from:'s',to:'a',type:'straight'},{from:'a',to:'b',type:'straight'},{from:'b',to:'e',type:'straight'}]},
];

function BrainstormWelcome({ c, dark, onPick }) {
  const [picking, setPicking] = useState(null); // null | 'template'
  if (picking === 'template') {
    return <TemplateGallery c={c} dark={dark} forShared onClose={()=>setPicking(null)}
      onApply={(tpl)=>onPick({ mode:'shared', template:tpl })}/>;
  }
  const Card3 = ({ icon, title, lines, badge, badgeCol, onClick }) => (
    <button onClick={onClick} style={{ flex:'1 1 240px',minWidth:240,textAlign:'left',background:c.surf,border:`1px solid ${c.bord}`,borderRadius:16,padding:'22px 22px 20px',cursor:'pointer',transition:'all .15s' }}
      onMouseEnter={e=>{e.currentTarget.style.borderColor='#0070F3';e.currentTarget.style.transform='translateY(-3px)';}}
      onMouseLeave={e=>{e.currentTarget.style.borderColor=c.bord;e.currentTarget.style.transform='none';}}>
      <div style={{ fontSize:34,marginBottom:12 }}>{icon}</div>
      <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:8 }}>
        <span style={{ fontSize:16,fontWeight:700,color:c.text }}>{title}</span>
        {badge && <span style={{ fontSize:10,fontWeight:700,color:badgeCol,background:badgeCol+'1f',padding:'2px 8px',borderRadius:20 }}>{badge}</span>}
      </div>
      <ul style={{ margin:0,padding:'0 0 0 16px',color:c.sub,fontSize:12.5,lineHeight:1.7 }}>{lines.map((l,i)=><li key={i}>{l}</li>)}</ul>
    </button>
  );
  return (
    <div style={{ height:'calc(100vh - 62px)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',borderRadius:14,border:`1px solid ${c.bord}`,background:dark?c.bg:'#fff',padding:24 }}>
      <div style={{ fontSize:13,fontWeight:600,color:'#0070F3',letterSpacing:'.08em',textTransform:'uppercase',marginBottom:8 }}>Brainstorm</div>
      <h2 style={{ fontSize:26,fontWeight:800,color:c.text,marginBottom:6,textAlign:'center' }}>What would you like to work on today?</h2>
      <p style={{ fontSize:13.5,color:c.mut,marginBottom:28,textAlign:'center' }}>Pick a workspace to get started. You can switch any time.</p>
      <div style={{ display:'flex',gap:16,flexWrap:'wrap',maxWidth:840,justifyContent:'center' }}>
        <Card3 icon="🔒" title="Personal" badge="Private" badgeCol="#94A3B8"
          lines={['Rough work & scratch ideas','Only visible to you','Never synced to team boards']}
          onClick={()=>onPick({ mode:'personal' })}/>
        <Card3 icon="👥" title="Shared" badge="Team" badgeCol="#34D399"
          lines={['Team & project collaboration','Visible to authorized members','Activity tracking enabled']}
          onClick={()=>onPick({ mode:'shared' })}/>
        <Card3 icon="▦" title="Start from template" badge="Shared only" badgeCol="#0070F3"
          lines={['Structured frameworks','SWOT, OKR, retros & more','Team collaboration ready']}
          onClick={()=>setPicking('template')}/>
      </div>
    </div>
  );
}

function TemplateGallery({ c, dark, onClose, onApply, forShared }) {
  const [q, setQ] = useState('');
  const [favs, setFavs] = useState(()=>{ try{return JSON.parse(localStorage.getItem('ss-bs-favtpl')||'[]');}catch{return [];} });
  const toggleFav = (id)=>setFavs(f=>{ const nf=f.includes(id)?f.filter(x=>x!==id):[...f,id]; try{localStorage.setItem('ss-bs-favtpl',JSON.stringify(nf));}catch{} return nf; });
  const cats = [...new Set(BS_TEMPLATES.map(t=>t.cat))];
  const ql = q.trim().toLowerCase();
  const match = (t)=> !ql || t.name.toLowerCase().includes(ql) || t.cat.toLowerCase().includes(ql) || t.desc.toLowerCase().includes(ql);
  const favTpls = BS_TEMPLATES.filter(t=>favs.includes(t.id)&&match(t));
  return (
    <div onMouseDown={onClose} style={{ position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,.45)',display:'flex',alignItems:'center',justifyContent:'center',padding:24 }}>
      <div onMouseDown={e=>e.stopPropagation()} style={{ width:'min(940px,96vw)',maxHeight:'88vh',background:dark?'#0F1322':'#fff',border:`1px solid ${c.bord}`,borderRadius:18,overflow:'hidden',display:'flex',flexDirection:'column',boxShadow:'0 24px 70px rgba(0,0,0,.4)' }}>
        <div style={{ padding:'18px 22px',borderBottom:`1px solid ${c.bord}`,display:'flex',alignItems:'center',gap:14 }}>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:17,fontWeight:800,color:c.text }}>Template library</div>
            {forShared && <div style={{ fontSize:11.5,color:c.mut,marginTop:2 }}>Templates open in a Shared workspace for team collaboration.</div>}
          </div>
          <div style={{ display:'flex',alignItems:'center',gap:8,background:c.inp,border:`1px solid ${c.inpB}`,borderRadius:10,padding:'7px 12px',width:240 }}>
            <span style={{ color:c.mut,fontSize:13 }}>⌕</span>
            <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search templates..." style={{ flex:1,background:'transparent',border:'none',outline:'none',color:c.text,fontSize:13 }}/>
          </div>
          <button onClick={onClose} style={{ width:32,height:32,borderRadius:9,border:`1px solid ${c.bord}`,background:'transparent',color:c.mut,cursor:'pointer',fontSize:16 }}>×</button>
        </div>
        <div style={{ flex:1,overflowY:'auto',padding:'18px 22px' }}>
          {favTpls.length>0 && <TplRow title="★ Favorites" list={favTpls} c={c} dark={dark} favs={favs} toggleFav={toggleFav} onApply={onApply}/>}
          {cats.map(cat=>{ const list=BS_TEMPLATES.filter(t=>t.cat===cat&&match(t)); if(!list.length)return null;
            return <TplRow key={cat} title={cat} list={list} c={c} dark={dark} favs={favs} toggleFav={toggleFav} onApply={onApply}/>; })}
          {BS_TEMPLATES.filter(match).length===0 && <div style={{ padding:'40px',textAlign:'center',color:c.mut,fontSize:13 }}>No templates match "{q}"</div>}
        </div>
      </div>
    </div>
  );
}

function TplRow({ title, list, c, dark, favs, toggleFav, onApply }) {
  return (
    <div style={{ marginBottom:22 }}>
      <div style={{ fontSize:12,fontWeight:700,color:c.mut,textTransform:'uppercase',letterSpacing:'.05em',marginBottom:12 }}>{title}</div>
      <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(210px,1fr))',gap:12 }}>
        {list.map(t=>(
          <div key={t.id} style={{ position:'relative',border:`1px solid ${c.bord}`,borderRadius:14,overflow:'hidden',background:c.surf,transition:'all .15s' }}
            onMouseEnter={e=>e.currentTarget.style.borderColor='#0070F3'} onMouseLeave={e=>e.currentTarget.style.borderColor=c.bord}>
            <button onClick={()=>toggleFav(t.id)} title="Favorite" style={{ position:'absolute',top:8,right:8,zIndex:2,background:'rgba(0,0,0,.25)',border:'none',borderRadius:'50%',width:26,height:26,cursor:'pointer',fontSize:13,color:favs.includes(t.id)?'#FCD34D':'#fff' }}>{favs.includes(t.id)?'★':'☆'}</button>
            <button onClick={()=>onApply(t)} style={{ display:'block',width:'100%',textAlign:'left',border:'none',background:'transparent',cursor:'pointer',padding:0 }}>
              <div style={{ height:84,background:`linear-gradient(135deg, ${dark?'#1B2236':'#EEF1FF'}, ${dark?'#141A2B':'#F8FAFF'})`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:34 }}>{t.icon}</div>
              <div style={{ padding:'11px 13px' }}>
                <div style={{ fontSize:13.5,fontWeight:700,color:c.text,marginBottom:3 }}>{t.name}</div>
                <div style={{ fontSize:11.5,color:c.mut,lineHeight:1.4 }}>{t.desc}</div>
              </div>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}


// Full Miro-like infinite canvas. Personal + Shared modes. Auto-saved.
// Features: sticky notes (stack/copy/paste/del), text boxes, shapes (rect/circle/diamond/pill),
// free-draw pen (color + thickness), connectors (straight/curved/elbow), node drag,
// color picker, text formatting, mini-map, undo/redo, fit view, zoom.

const BS_STICKY_COLORS = ['#FDE68A','#FCA5A5','#6EE7B7','#93C5FD','#C4B5FD','#FBB6CE','#FED7AA','#D9F99D','#fff','#1e1b4b'];
const BS_DRAW_COLORS   = ['#3B9EFF','#34D399','#F87171','#FBBF24','#60A5FA','#F472B6','#A78BFA','#000','#fff'];
const BS_SHAPE_COLORS  = [
  {fill:'rgba(0,112,243,.15)',  stroke:'#0070F3'},
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
  const [started, setStarted] = useState(false);       // welcome screen gate
  const [showTemplates, setShowTemplates] = useState(false);
  const [showSens, setShowSens] = useState(false);
  // Sensitivity controls (persisted)
  const [zoomSens, setZoomSens] = useState(()=>{ try{return parseFloat(localStorage.getItem('ss-bs-zoomsens'))||0.0022;}catch{return 0.0022;} });
  const [panSens, setPanSens]   = useState(()=>{ try{return parseFloat(localStorage.getItem('ss-bs-pansens'))||1;}catch{return 1;} });
  const zoomSensRef = useRef(zoomSens); const panSensRef = useRef(panSens);
  useEffect(()=>{ zoomSensRef.current=zoomSens; try{localStorage.setItem('ss-bs-zoomsens',zoomSens);}catch{} },[zoomSens]);
  useEffect(()=>{ panSensRef.current=panSens; try{localStorage.setItem('ss-bs-pansens',panSens);}catch{} },[panSens]);
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

  // ── Load ── (clears state first so personal/shared can NEVER leak across)
  const loadedKeyRef = useRef(null);
  useEffect(() => {
    setNodes([]); nodesRef.current = [];
    setConnections([]); connectionsRef.current = [];
    setDrawPaths([]); drawPathsRef.current = [];
    setSelected(new Set()); setEditingId(null);
    loadedKeyRef.current = BOARD_KEY;
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
    if (loadedKeyRef.current !== BOARD_KEY) return;
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
        // Sensitivity: lower = gentler zoom. Scale by actual delta but clamp each
        // step so a fast trackpad swipe can't jump the zoom dramatically.
        const SENS = zoomSensRef.current || 0.0022;
        let step = -e.deltaY * SENS;            // up = zoom in
        step = Math.max(-0.08, Math.min(0.08, step)); // clamp per-event change
        const factor = Math.exp(step);          // smooth multiplicative zoom
        setZoom(z => {
          const nz = Math.min(4, Math.max(0.1, z * factor));
          setPan(p => { const np = { x: mx - (mx - p.x) * (nz / z), y: my - (my - p.y) * (nz / z) }; panStateRef.current = np; return np; });
          zoomRef.current = nz;
          return nz;
        });
      } else {
        setPan(p => { const ps=panSensRef.current||1; const np = { x: p.x - e.deltaX*ps, y: p.y - e.deltaY*ps }; panStateRef.current = np; return np; });
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
      fill: (type==='shape'||type==='pill')?(BS_SHAPE_COLORS[shapeColorIdx]?.fill||'rgba(0,112,243,.15)'):undefined,
      stroke: (type==='shape'||type==='pill')?(BS_SHAPE_COLORS[shapeColorIdx]?.stroke||'#0070F3'):undefined,
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
    const f=fill||'rgba(0,112,243,.15)', s=stroke||'#0070F3';
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

  // Apply a template: lay its nodes/connections onto the board
  const applyTemplate = (tpl) => {
    let id = nextId.current;
    const idMap = {};
    const newNodes = (tpl.nodes||[]).map(n => { const nid = id++; idMap[n.k] = nid; return { id: nid, type: n.type||'sticky', x: n.x, y: n.y, w: n.w||180, h: n.h||120, text: n.text||'', color: n.color||'#FDE68A', fill: n.fill, fontSize: n.fontSize||13, fontWeight: n.fontWeight||400, fontStyle:'normal', textAlign: n.textAlign||'left', shape: n.shape }; });
    const newConns = (tpl.connections||[]).map(co => ({ id: 'c'+(id++), from: idMap[co.from], to: idMap[co.to], type: co.type||'curve', color: co.color||(dark?'#94A3B8':'#64748B') })).filter(co=>co.from&&co.to);
    nextId.current = id;
    const allN = [...nodesRef.current.filter(n=>!(n.id===1&&/Welcome/.test(n.text||''))), ...newNodes];
    const allC = [...connectionsRef.current, ...newConns];
    setNodes(allN); nodesRef.current = allN;
    setConnections(allC); connectionsRef.current = allC;
    pushHist(allN, allC, drawPathsRef.current);
    saveToStorage(allN, allC, drawPathsRef.current);
    setShowTemplates(false);
    setTimeout(()=>fitView&&fitView(), 60);
  };

  // ── Welcome screen gate ──
  if (!started) {
    return <BrainstormWelcome c={c} dark={dark} onPick={(picked)=>{
      if (picked.mode) setMode(picked.mode);
      setStarted(true);
      if (picked.template) setTimeout(()=>applyTemplate(picked.template), 120);
      else if (picked.openTemplates) setTimeout(()=>setShowTemplates(true), 120);
    }}/>;
  }

  return (
    <div style={{display:'flex',flexDirection:'column',height:'calc(100vh - 62px)',borderRadius:14,overflow:'hidden',border:`1px solid ${c.bord}`,userSelect:'none',position:'relative'}}>

      {/* ══ TOOLBAR ══ */}
      <div style={{display:'flex',alignItems:'center',gap:6,padding:'6px 10px',background:dark?'rgba(10,8,28,.98)':'rgba(255,255,255,.98)',borderBottom:`1px solid ${c.bord}`,flexShrink:0,zIndex:30,flexWrap:'wrap',backdropFilter:'blur(20px)'}}>

        <div style={{display:'flex',borderRadius:8,overflow:'hidden',border:`1px solid ${c.bord}`,flexShrink:0}}>
          {['personal','shared'].map(m=>(
            <button key={m} onClick={()=>setMode(m)} style={{padding:'5px 12px',fontSize:11,fontWeight:600,border:'none',cursor:'pointer',background:mode===m?'#0070F3':'transparent',color:mode===m?'#fff':c.mut,transition:'all .15s'}}>
              {m==='personal'?'🔒 Personal':'👥 Shared'}
            </button>
          ))}
        </div>

        <div style={{width:1,height:24,background:c.bord,flexShrink:0}}/>

        <div style={{display:'flex',gap:2,background:dark?'rgba(255,255,255,.04)':'rgba(0,112,243,.05)',borderRadius:10,padding:3,border:`1px solid ${c.bord}`}}>
          {TOOLS.map(t=>(
            <button key={t.id} onClick={()=>{setTool(t.id);toolRef.current=t.id;if(t.id!=='connect'){setConnectFrom(null);connectFromRef.current=null;setConnPreviewPt(null);}}} title={t.label}
              style={{width:34,height:32,borderRadius:7,border:'none',background:tool===t.id?(dark?'rgba(0,112,243,.28)':'rgba(0,112,243,.18)'):'transparent',color:tool===t.id?'#3B9EFF':c.mut,cursor:'pointer',fontSize:t.id==='text'?13:17,fontWeight:tool===t.id?700:400,transition:'all .12s',display:'flex',alignItems:'center',justifyContent:'center'}}>
              {t.ico}
            </button>
          ))}
        </div>

        {tool==='shape'&&(
          <div style={{display:'flex',gap:2,background:dark?'rgba(255,255,255,.04)':'rgba(0,112,243,.05)',borderRadius:10,padding:3,border:`1px solid ${c.bord}`}}>
            {[['rect','▭'],['circle','○'],['diamond','◇'],['pill','⬭']].map(([st,ic])=>(
              <button key={st} onClick={()=>setShapeType(st)} style={{width:32,height:32,borderRadius:7,border:'none',background:shapeType===st?'rgba(0,112,243,.22)':'transparent',color:shapeType===st?'#3B9EFF':c.mut,cursor:'pointer',fontSize:16}}>{ic}</button>
            ))}
          </div>
        )}

        {tool==='sticky'&&(
          <div style={{display:'flex',gap:3,alignItems:'center'}}>
            {BS_STICKY_COLORS.map(col=>(
              <button key={col} onClick={()=>setStickyColor(col)} style={{width:20,height:20,borderRadius:'50%',background:col,border:stickyColor===col?'2.5px solid #3B9EFF':`1.5px solid ${c.bord}`,cursor:'pointer',flexShrink:0}}/>
            ))}
          </div>
        )}

        {tool==='draw'&&(
          <div style={{display:'flex',gap:6,alignItems:'center'}}>
            <div style={{display:'flex',gap:3}}>
              {['#000000','#333333','#3B9EFF','#34D399','#F87171','#FBBF24','#60A5FA','#F472B6','#A78BFA'].map(col=>(
                <button key={col} onClick={()=>{setDrawColor(col);drawColorRef.current=col;}}
                  style={{width:22,height:22,borderRadius:'50%',background:col,border:drawColor===col?'3px solid #3B9EFF':`2px solid rgba(0,0,0,.2)`,cursor:'pointer',flexShrink:0,boxShadow:drawColor===col?'0 0 0 1px #fff inset':''}}/>
              ))}
            </div>
            <div style={{width:1,height:22,background:c.bord}}/>
            {[1,3,6,12].map(w=>(
              <button key={w} onClick={()=>{setDrawWidth(w);drawWidthRef.current=w;}}
                style={{width:32,height:32,borderRadius:7,background:drawWidth===w?'rgba(0,112,243,.2)':'transparent',border:`1px solid ${c.bord}`,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <div style={{width:Math.min(w*2,20),height:Math.min(w,10),borderRadius:w,background:drawColor,maxWidth:20}}/>
              </button>
            ))}
          </div>
        )}

        {tool==='connect'&&(
          <div style={{display:'flex',gap:6,alignItems:'center'}}>
            <div style={{display:'flex',gap:2,background:dark?'rgba(255,255,255,.04)':'rgba(0,112,243,.05)',borderRadius:10,padding:3,border:`1px solid ${c.bord}`}}>
              {[['curve','⌒ Curve'],['straight','→ Straight'],['elbow','⌐ Elbow']].map(([ct,lbl])=>(
                <button key={ct} onClick={()=>{setConnType(ct);connTypeRef.current=ct;}} style={{padding:'4px 10px',borderRadius:7,border:'none',background:connType===ct?'rgba(0,112,243,.22)':'transparent',color:connType===ct?'#3B9EFF':c.mut,cursor:'pointer',fontSize:11,fontWeight:connType===ct?700:400}}>{lbl}</button>
              ))}
            </div>
            <div style={{display:'flex',gap:3}}>
              {['#000000','#333333','#3B9EFF','#34D399','#F87171','#FBBF24','#60A5FA'].map(col=>(
                <button key={col} onClick={()=>{setConnColor(col);connColorRef.current=col;}}
                  style={{width:20,height:20,borderRadius:'50%',background:col,border:connColor===col?'2.5px solid #3B9EFF':`1.5px solid ${c.bord}`,cursor:'pointer'}}/>
              ))}
            </div>
          </div>
        )}

        {selNode&&tool==='select'&&(
          <div style={{display:'flex',gap:4,alignItems:'center',borderLeft:`1px solid ${c.bord}`,paddingLeft:8,flexWrap:'wrap'}}>
            {[10,12,14,16,20,24].map(fs=>(
              <button key={fs} onClick={()=>updateNodeSave(selNode.id,{fontSize:fs})}
                style={{padding:'1px 6px',borderRadius:5,border:`1px solid ${c.bord}`,background:selNode.fontSize===fs?'rgba(0,112,243,.2)':'transparent',color:c.text,cursor:'pointer',fontSize:11}}>{fs}</button>
            ))}
            <div style={{width:1,height:20,background:c.bord}}/>
            <button onClick={()=>updateNodeSave(selNode.id,{fontWeight:selNode.fontWeight>=700?400:700})}
              style={{width:28,height:28,borderRadius:6,border:`1px solid ${c.bord}`,background:selNode.fontWeight>=700?'rgba(0,112,243,.2)':'transparent',color:c.text,cursor:'pointer',fontWeight:700,fontSize:13}}>B</button>
            <button onClick={()=>updateNodeSave(selNode.id,{fontStyle:selNode.fontStyle==='italic'?'normal':'italic'})}
              style={{width:28,height:28,borderRadius:6,border:`1px solid ${c.bord}`,background:selNode.fontStyle==='italic'?'rgba(0,112,243,.2)':'transparent',color:c.text,cursor:'pointer',fontStyle:'italic',fontSize:13}}>I</button>
            {selNode.type==='sticky'&&BS_STICKY_COLORS.map(col=>(
              <button key={col} onClick={()=>updateNodeSave(selNode.id,{color:col})}
                style={{width:18,height:18,borderRadius:'50%',background:col,border:selNode.color===col?'2.5px solid #3B9EFF':`1px solid ${c.bord}`,cursor:'pointer',flexShrink:0}}/>
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
                style={{width:28,height:28,borderRadius:6,border:`1px solid ${c.bord}`,background:selConn.type===ct?'rgba(0,112,243,.2)':'transparent',color:c.text,cursor:'pointer',fontSize:13}}>{ic}</button>
            ))}
            {['#000000','#3B9EFF','#34D399','#F87171','#FBBF24'].map(col=>(
              <button key={col} onClick={()=>{const nc=connectionsRef.current.map(cc=>cc.id===selConn.id?{...cc,color:col}:cc);setConnections(nc);connectionsRef.current=nc;saveToStorage(nodesRef.current,nc,drawPathsRef.current);}}
                style={{width:18,height:18,borderRadius:'50%',background:col,border:selConn.color===col?'2.5px solid #3B9EFF':`1px solid ${c.bord}`,cursor:'pointer'}}/>
            ))}
            <button onClick={()=>{const nc=connectionsRef.current.filter(c2=>c2.id!==selConn.id);setConnections(nc);connectionsRef.current=nc;setSelected(new Set());pushHist(nodesRef.current,nc,drawPathsRef.current);}}
              style={{padding:'3px 10px',borderRadius:6,background:'rgba(239,68,68,.08)',border:'1px solid rgba(239,68,68,.22)',color:'#F87171',cursor:'pointer',fontSize:11}}>🗑</button>
          </div>
        )}

        {connectFrom&&<span style={{fontSize:11,color:'#34D399',background:'rgba(52,211,153,.1)',padding:'4px 10px',borderRadius:8,border:'1px solid rgba(52,211,153,.2)',flexShrink:0}}>✓ Now click another node · Esc to cancel</span>}

        <div style={{flex:1}}/>
        <div style={{position:'relative',flexShrink:0}}>
          <button onClick={()=>setShowTemplates(true)} style={{padding:'5px 11px',borderRadius:7,border:`1px solid ${c.bord}`,background:'transparent',color:c.sub,cursor:'pointer',fontSize:11.5,fontWeight:600,display:'flex',alignItems:'center',gap:5}}>▦ Templates</button>
        </div>
        <div style={{position:'relative',flexShrink:0}}>
          <button onClick={()=>setShowSens(s=>!s)} title="Board sensitivity" style={{width:30,height:30,borderRadius:7,border:`1px solid ${showSens?'#0070F3':c.bord}`,background:showSens?'rgba(0,112,243,.1)':'transparent',color:showSens?'#0070F3':c.mut,cursor:'pointer',fontSize:14,display:'flex',alignItems:'center',justifyContent:'center'}}>⚙</button>
          {showSens&&(
            <div onMouseDown={e=>e.stopPropagation()} style={{position:'absolute',top:38,right:0,zIndex:60,width:260,background:dark?'#161B2E':'#fff',border:`1px solid ${c.bord}`,borderRadius:14,boxShadow:'0 14px 44px rgba(0,0,0,.3)',padding:16}}>
              <div style={{fontSize:13,fontWeight:700,color:c.text,marginBottom:14}}>Board sensitivity</div>
              <div style={{marginBottom:14}}>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:11.5,color:c.sub,marginBottom:6}}><span>Zoom speed</span><span style={{color:c.mut}}>{zoomSens<=0.0015?'Slow':zoomSens>=0.0035?'Fast':'Balanced'}</span></div>
                <input type="range" min="0.0008" max="0.005" step="0.0002" value={zoomSens} onChange={e=>setZoomSens(parseFloat(e.target.value))} style={{width:'100%',accentColor:'#0070F3'}}/>
              </div>
              <div style={{marginBottom:14}}>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:11.5,color:c.sub,marginBottom:6}}><span>Pan speed</span><span style={{color:c.mut}}>{panSens<=0.7?'Slow':panSens>=1.4?'Fast':'Balanced'}</span></div>
                <input type="range" min="0.4" max="2" step="0.1" value={panSens} onChange={e=>setPanSens(parseFloat(e.target.value))} style={{width:'100%',accentColor:'#0070F3'}}/>
              </div>
              <div style={{display:'flex',gap:6}}>
                {[['Precision',{z:0.0012,p:0.6}],['Balanced',{z:0.0022,p:1}],['Fast',{z:0.004,p:1.6}]].map(([l,v])=>(
                  <button key={l} onClick={()=>{setZoomSens(v.z);setPanSens(v.p);}} style={{flex:1,padding:'7px 4px',borderRadius:8,border:`1px solid ${c.bord}`,background:'transparent',color:c.sub,cursor:'pointer',fontSize:11,fontWeight:600}}>{l}</button>
                ))}
              </div>
              <button onClick={()=>setShowSens(false)} style={{width:'100%',marginTop:12,padding:'7px',borderRadius:8,border:'none',background:'#0070F3',color:'#fff',cursor:'pointer',fontSize:12,fontWeight:600}}>Done</button>
            </div>
          )}
        </div>
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
        data-bs-canvas="1"
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
              <marker id="bsarr-indigo"  markerWidth="10" markerHeight="10" refX="9" refY="4" orient="auto"><path d="M0,0 L0,8 L10,4 z" fill="#3B9EFF"/></marker>
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
              const markId=col==='#3B9EFF'?'bsarr-indigo':col==='#34D399'?'bsarr-green':col==='#F87171'?'bsarr-red':col==='#FBBF24'?'bsarr-yellow':col==='#60A5FA'?'bsarr-blue':'bsarr-black';
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
                    boxShadow:isSel?'0 0 0 2.5px #0070F3,0 10px 32px rgba(0,0,0,.22)':'2px 3px 10px rgba(0,0,0,.13),1px 1px 0 rgba(0,0,0,.06)'}}>
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
                    border:isSel?'1.5px solid #0070F3':isEdit?'1.5px solid #0070F3':'1.5px dashed rgba(100,90,60,.25)',
                    borderRadius:5,background:isSel?'rgba(0,112,243,.04)':'transparent',boxShadow:isSel?'0 0 0 3px rgba(0,112,243,.15)':'none'}}>
                    {isEdit?<textarea autoFocus value={node.text} onChange={e=>updateNode(node.id,{text:e.target.value})} onBlur={commitEdit} onMouseDown={e=>e.stopPropagation()} style={{...textBase,color:'#1a1a1a'}}/>
                      :<div style={{fontSize:node.fontSize||16,fontWeight:node.fontWeight||400,fontStyle:node.fontStyle||'normal',color:node.text?'#1a1a1a':'rgba(100,90,60,.35)',whiteSpace:'pre-wrap',wordBreak:'break-word',userSelect:'none',textAlign:node.textAlign||'left',lineHeight:1.5,width:'100%'}}>
                        {node.text||'Type here…'}
                      </div>}
                  </div>
                )}

                {/* SHAPE */}
                {node.type==='shape'&&(
                  <div style={{width:'100%',height:'100%',position:'relative',boxShadow:isSel?'0 0 0 2.5px #0070F3,0 6px 20px rgba(0,0,0,.1)':'0 2px 8px rgba(0,0,0,.08)',borderRadius:node.shapeType==='rect'?10:0}}>
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
                    style={{position:'absolute',right:-5,bottom:-5,width:12,height:12,borderRadius:3,background:'#0070F3',border:'2px solid #fff',cursor:'se-resize',zIndex:30,boxShadow:'0 1px 4px rgba(0,0,0,.2)'}}/>
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
            return <div style={{position:'absolute',left:sx,top:sy,width:sw,height:sh,border:'1.5px solid #0070F3',background:'rgba(0,112,243,.06)',pointerEvents:'none',borderRadius:4}}/>;
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
            {nodes.map(n=><rect key={n.id} x={65+n.x*0.025} y={44+n.y*0.025} width={Math.max(5,n.w*0.025)} height={Math.max(4,n.h*0.025)} rx={1} fill={n.type==='sticky'?(n.color||'#FDE68A'):n.fill||'#3B9EFF'} opacity={0.85}/>)}
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
      {showTemplates && <TemplateGallery c={c} dark={dark} onClose={()=>setShowTemplates(false)} onApply={applyTemplate}/>}
    </div>
  );
}

// ─── MANAGER VIEW ─────────────────────────────────────────────────────────────

// ─── HOME COMMAND CENTER ──────────────────────────────────────────────────────
// Daily landing page. Focus, not clutter. Replaces the "everything exposed" dashboard.
// Aggregates client-report rows across all spaces → "doing good" vs "needs focus".
// ─── HOME TEAM BOARD ─────────────────────────────────────────────────────────
// Managers post a Task / Message / Reminder to the whole team. Open tasks can be
// claimed by any member. Stored per-team in localStorage (ss-teamboard-<id>).
function boardIcon(name, size=17){
  const p={width:size,height:size,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:1.9,strokeLinecap:'round',strokeLinejoin:'round'};
  switch(name){
    case 'board': return <svg {...p}><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h3"/></svg>;
    case 'task': return <svg {...p}><path d="M9 11l3 3L20 6"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>;
    case 'message': return <svg {...p}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
    case 'reminder': return <svg {...p}><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2"/><path d="M5 3 2 6M22 6l-3-3"/></svg>;
    case 'summary': return <svg {...p}><path d="M3 3v18h18"/><rect x="7" y="11" width="3" height="6"/><rect x="12" y="7" width="3" height="10"/><rect x="17" y="13" width="3" height="4"/></svg>;
    default: return null;
  }
}
function teamBoardKey(teamId){ return 'ss-teamboard-'+teamId; }
function readTeamBoard(teamId){
  // Prefer shared (team-wide) copy; fall back to local cache.
  const shared = sharedGetCached(teamId, 'teamboard');
  if (shared && Array.isArray(shared)) return shared;
  try{ return JSON.parse(localStorage.getItem(teamBoardKey(teamId))||'[]'); }catch{ return []; }
}
function writeTeamBoard(teamId,posts){
  try{ localStorage.setItem(teamBoardKey(teamId),JSON.stringify(posts)); }catch{}
  sharedSet(teamId, 'teamboard', posts); // mirror to backend → visible to all members
}

function TeamBoard({ teamId='demo', session, isManager, onClaimTask, onGoto }){
  const c=useC(); const { dark }=useTheme();
  const myEmail=session?.user?.email||'me@demo';
  const myName=session?.user?.user_metadata?.name||myEmail.split('@')[0];
  const [posts,setPosts]=useState(()=>readTeamBoard(teamId));
  const [kind,setKind]=useState('task');
  const [text,setText]=useState('');
  const [priority,setPriority]=useState('medium');
  const [composing,setComposing]=useState(false);
  const [expanded,setExpanded]=useState(false);
  const openTasks=posts.filter(p=>p.kind==='task'&&!p.claimedBy).length;

  useEffect(()=>{
    const refresh=()=>setPosts(readTeamBoard(teamId));
    const onStorage=(e)=>{ if(e.key===teamBoardKey(teamId)) refresh(); };
    // Hydrate from the shared backend so the whole team sees the same posts.
    hydrateShared(teamId, ()=>refresh());
    // Live updates when any teammate posts/edits.
    let unsub=()=>{};
    try {
      if (SB.subscribeToStore) {
        unsub = SB.subscribeToStore(teamId, (key, value)=>{
          if (key==='teamboard' && Array.isArray(value)) { _sharedCache[_scKey(teamId,'teamboard')] = value; setPosts(value); }
        });
      }
    } catch {}
    const t=setInterval(refresh,15000);
    window.addEventListener('storage',onStorage);
    return ()=>{ clearInterval(t); window.removeEventListener('storage',onStorage); try{unsub();}catch{} };
  },[teamId]);

  const persist=(next)=>{ setPosts(next); writeTeamBoard(teamId,next); };

  const post=()=>{
    if(!text.trim())return;
    const p={ id:'tb'+Date.now(), kind, text:text.trim(), priority:kind==='task'?priority:undefined,
      author:myName, authorEmail:myEmail, at:Date.now(), claimedBy:null, claimedByEmail:null, replies:[] };
    persist([p,...posts]);
    try { pushEvent(teamId, { type:'teamboard', actor:myName, actorEmail:myEmail, title:(kind==='task'?'Task: ':kind==='reminder'?'Reminder: ':'')+text.trim().slice(0,60) }); } catch {}
    setText(''); setComposing(false); setKind('task');
  };

  const claim=(p)=>{
    const next=posts.map(x=>x.id===p.id?{...x,claimedBy:myName,claimedByEmail:myEmail}:x);
    persist(next);
    if(onClaimTask) onClaimTask({ title:p.text.slice(0,140), assignee_email:myEmail, assignee_name:myName,
      priority:p.priority||'medium', status:'todo', timeline:'Today EOD (6 PM)',
      notes:'Claimed from team board · posted by '+p.author, manager_note:'', blocker:'' });
  };

  const reply=(p,replyText)=>{
    if(!replyText.trim())return;
    const next=posts.map(x=>x.id===p.id?{...x,replies:[...(x.replies||[]),{ id:'r'+Date.now(),author:myName,authorEmail:myEmail,text:replyText.trim(),at:Date.now() }]}:x);
    persist(next);
  };

  const removePost=(p)=>persist(posts.filter(x=>x.id!==p.id));

  const KIND_META={
    task:{ label:'Task', icon:'task', color:'#0070F3', bg:'rgba(0,112,243,.12)' },
    message:{ label:'Message', icon:'message', color:'#38BDF8', bg:'rgba(56,189,248,.12)' },
    reminder:{ label:'Reminder', icon:'reminder', color:'#F59E0B', bg:'rgba(245,158,11,.12)' },
  };

  return (
    <div style={{ borderRadius:18, background:c.surf, border:`1px solid ${c.bord}`, overflow:'hidden' }}>
      <div style={{ padding:'18px 22px', borderBottom:expanded?`1px solid ${c.bord}`:'none', display:'flex', alignItems:'center', gap:10 }}>
        <span style={{ color:'#0070F3',display:'flex' }}>{boardIcon('board',18)}</span>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:15, fontWeight:700, color:c.text }}>Team board</div>
          <div style={{ fontSize:12, color:c.mut }}>{posts.length===0?'Open tasks, messages & reminders for the whole team':`${posts.length} post${posts.length!==1?'s':''}${openTasks?` · ${openTasks} open task${openTasks!==1?'s':''} to claim`:''}`}</div>
        </div>
        {isManager&&<button onClick={()=>{setExpanded(true);setComposing(true);}} style={{ padding:'8px 15px', borderRadius:10, border:'none', background:'linear-gradient(135deg,#0070F3,#3B9EFF)', color:'#fff', cursor:'pointer', fontSize:13, fontWeight:600 }}>＋ Post</button>}
        <button onClick={()=>setExpanded(e=>!e)} style={{ width:32,height:32,borderRadius:9,border:`1px solid ${c.bord}`,background:'transparent',color:c.mut,cursor:'pointer',fontSize:13,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>{expanded?'▴':'▾'}</button>
      </div>

      {/* Composer (managers) */}
      {expanded&&isManager&&composing&&(
        <div style={{ padding:'18px 22px', borderBottom:`1px solid ${c.bord}`, background:dark?'rgba(255,255,255,.02)':'rgba(0,112,243,.03)' }}>
          <div style={{ display:'flex', gap:8, marginBottom:12, flexWrap:'wrap' }}>
            {Object.entries(KIND_META).map(([k,m])=>(
              <button key={k} onClick={()=>setKind(k)} style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:20, border:`1px solid ${kind===k?m.color:c.bord}`, background:kind===k?m.bg:'transparent', color:kind===k?m.color:c.sub, cursor:'pointer', fontSize:12.5, fontWeight:600 }}>
                <span style={{ display:'flex' }}>{boardIcon(m.icon,15)}</span>{m.label}
              </button>
            ))}
          </div>
          <textarea value={text} onChange={e=>setText(e.target.value)} autoFocus placeholder={kind==='task'?'Describe the task anyone can pick up...':kind==='reminder'?'What should the team remember?':'Share a message with the team...'} style={{ width:'100%', boxSizing:'border-box', minHeight:70, background:c.inp, border:`1px solid ${c.inpB}`, borderRadius:10, padding:'11px 13px', color:c.text, fontSize:13.5, lineHeight:1.5, outline:'none', resize:'vertical', fontFamily:'inherit', marginBottom:12 }}/>
          <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
            {kind==='task'&&(
              <select value={priority} onChange={e=>setPriority(e.target.value)} style={{ background:c.inp, border:`1px solid ${c.inpB}`, borderRadius:9, padding:'8px 11px', color:c.text, fontSize:12.5, outline:'none' }}>
                {['critical','high','medium','low'].map(v=><option key={v} value={v}>{v.charAt(0).toUpperCase()+v.slice(1)} priority</option>)}
              </select>
            )}
            <div style={{ flex:1 }}/>
            <button onClick={()=>{setComposing(false);setText('');}} style={{ padding:'8px 14px', borderRadius:9, border:`1px solid ${c.bord}`, background:'transparent', color:c.mut, cursor:'pointer', fontSize:13 }}>Cancel</button>
            <button onClick={post} disabled={!text.trim()} style={{ padding:'8px 18px', borderRadius:9, border:'none', background:text.trim()?'#0070F3':c.bord, color:'#fff', cursor:text.trim()?'pointer':'default', fontSize:13, fontWeight:600 }}>Post to team</button>
          </div>
        </div>
      )}

      {/* Feed */}
      {expanded&&<div style={{ padding:'8px 0', maxHeight:340, overflowY:'auto' }}>
        {posts.length===0?(
          <div style={{ padding:'40px 20px', textAlign:'center', color:c.mut }}>
            <div style={{ fontSize:30, marginBottom:8 }}>📋</div>
            <div style={{ fontSize:13.5, fontWeight:600, color:c.sub }}>Nothing on the board yet</div>
            <div style={{ fontSize:12.5, marginTop:3 }}>{isManager?'Post a task, message, or reminder for your team.':'Tasks and updates from your manager will appear here.'}</div>
          </div>
        ):posts.map(p=>(
          <TeamBoardPost key={p.id} post={p} meta={KIND_META[p.kind]||KIND_META.message} c={c} dark={dark} myEmail={myEmail} isManager={isManager}
            onClaim={()=>claim(p)} onReply={(t)=>reply(p,t)} onRemove={()=>removePost(p)} onGoto={onGoto}/>
        ))}
      </div>}
    </div>
  );
}

function TeamBoardPost({ post, meta, c, dark, myEmail, isManager, onClaim, onReply, onRemove, onGoto }){
  const [replyOpen,setReplyOpen]=useState(false);
  const [replyText,setReplyText]=useState('');
  const ago=(ts)=>{ const m=Math.round((Date.now()-ts)/60000); if(m<1)return'just now'; if(m<60)return m+'m ago'; const h=Math.floor(m/60); if(h<24)return h+'h ago'; return Math.floor(h/24)+'d ago'; };
  const isTask=post.kind==='task';
  const mine=post.authorEmail===myEmail;
  return (
    <div style={{ padding:'14px 22px', borderBottom:`1px solid ${c.bord}` }}>
      <div style={{ display:'flex', alignItems:'flex-start', gap:11 }}>
        <span style={{ width:30, height:30, borderRadius:9, background:meta.bg, color:meta.color, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{boardIcon(meta.icon,16)}</span>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4, flexWrap:'wrap' }}>
            <span style={{ fontSize:10.5, fontWeight:700, color:meta.color, textTransform:'uppercase', letterSpacing:'.04em' }}>{meta.label}</span>
            {isTask&&post.priority&&<span style={{ fontSize:10, fontWeight:700, color:getPriority(post.priority).color }}>{post.priority.toUpperCase()}</span>}
            <span style={{ fontSize:11.5, color:c.mut }}>· {post.author} · {ago(post.at)}</span>
          </div>
          <div style={{ fontSize:13.5, color:c.text, lineHeight:1.5, whiteSpace:'pre-wrap' }}>{post.text}</div>

          {/* Task claim status */}
          {isTask&&(
            post.claimedBy?(
              <div style={{ marginTop:9, display:'inline-flex', alignItems:'center', gap:6, fontSize:12, color:'#34D399', background:'rgba(52,211,153,.1)', border:'1px solid rgba(52,211,153,.25)', padding:'4px 11px', borderRadius:20 }}>
                ✓ Claimed by {post.claimedByEmail===myEmail?'you':post.claimedBy}
              </div>
            ):(
              <button onClick={onClaim} style={{ marginTop:9, display:'inline-flex', alignItems:'center', gap:6, fontSize:12.5, fontWeight:600, color:'#0070F3', background:'rgba(0,112,243,.1)', border:'1px solid rgba(0,112,243,.3)', padding:'6px 14px', borderRadius:20, cursor:'pointer' }}>✋ Claim this task</button>
            )
          )}

          {/* Replies */}
          {(post.replies||[]).length>0&&(
            <div style={{ marginTop:10, paddingLeft:12, borderLeft:`2px solid ${c.bord}`, display:'flex', flexDirection:'column', gap:7 }}>
              {post.replies.map(r=>(
                <div key={r.id} style={{ fontSize:12.5, color:c.sub }}><strong style={{ color:c.text }}>{r.author}:</strong> {r.text} <span style={{ color:c.mut, fontSize:11 }}>· {ago(r.at)}</span></div>
              ))}
            </div>
          )}

          {/* Reply action */}
          <div style={{ marginTop:8, display:'flex', gap:14 }}>
            <button onClick={()=>setReplyOpen(!replyOpen)} style={{ fontSize:12, color:c.mut, background:'none', border:'none', cursor:'pointer', padding:0, fontWeight:600 }}>↩ Reply</button>
            {(mine||isManager)&&<button onClick={onRemove} style={{ fontSize:12, color:c.mut, background:'none', border:'none', cursor:'pointer', padding:0 }}>Delete</button>}
          </div>
          {replyOpen&&(
            <div style={{ marginTop:8, display:'flex', gap:8 }}>
              <input value={replyText} onChange={e=>setReplyText(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){onReply(replyText);setReplyText('');setReplyOpen(false);}}} autoFocus placeholder="Write a reply..." style={{ flex:1, background:c.inp, border:`1px solid ${c.inpB}`, borderRadius:8, padding:'7px 11px', color:c.text, fontSize:12.5, outline:'none' }}/>
              <button onClick={()=>{onReply(replyText);setReplyText('');setReplyOpen(false);}} disabled={!replyText.trim()} style={{ padding:'7px 14px', borderRadius:8, border:'none', background:replyText.trim()?'#0070F3':c.bord, color:'#fff', cursor:replyText.trim()?'pointer':'default', fontSize:12.5, fontWeight:600 }}>Send</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


function ProjectSummary({ teamId, onGoto }) {
  const c = useC();
  let spaces = [];
  try { spaces = JSON.parse(localStorage.getItem('ss-spaces-' + teamId) || '[]'); } catch {}
  let good = 0, focus = 0, hasReport = false;
  (Array.isArray(spaces) ? spaces : []).forEach(s => {
    const rep = s.report; if (!rep || !rep.summary) return;
    hasReport = true;
    good += (rep.summary.wins || []).length;
    focus += (rep.summary.bottlenecks || []).length;
  });
  if (!hasReport) return null;
  return (
    <button onClick={() => onGoto('spaces')} style={{ display: 'flex', alignItems: 'center', gap: 16, width: '100%', textAlign: 'left', padding: '16px 22px', borderRadius: 16, background: c.surf, border: `1px solid ${c.bord}`, cursor: 'pointer' }} className="ss-card-hover">
      <span style={{ color: '#0070F3', display: 'flex' }}>{boardIcon('summary', 20)}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: c.text }}>Project summary</div>
        <div style={{ fontSize: 12.5, color: c.mut, marginTop: 2 }}>
          <span style={{ color: '#34D399', fontWeight: 600 }}>{good} doing well</span> · <span style={{ color: '#F87171', fontWeight: 600 }}>{focus} need focus</span> across your spaces
        </div>
      </div>
      <span style={{ fontSize: 12.5, color: '#3B9EFF', fontWeight: 600, whiteSpace: 'nowrap' }}>View in Spaces →</span>
    </button>
  );
}

function ProjectHighlights({ teamId, onGoto }) {
  const c = useC();
  const { dark } = useTheme();
  let spaces = [];
  try { spaces = JSON.parse(localStorage.getItem('ss-spaces-' + teamId) || '[]'); } catch {}
  const rows = [];
  (Array.isArray(spaces) ? spaces : []).forEach(s => {
    const rep = s.report; if (!rep) return;
    // Prefer the pre-computed summary's bottlenecks + wins
    if (rep.summary) {
      (rep.summary.bottlenecks || []).forEach(it => rows.push({ ...it, space: s.name, _focus: true }));
      (rep.summary.wins || []).forEach(it => rows.push({ ...it, space: s.name, _good: true }));
    } else if (Array.isArray(rep.items)) {
      rep.items.filter(it => it.item && !/^[—\-–\s]*section\b/i.test(it.item)).forEach(it => rows.push({ ...it, space: s.name }));
    }
  });
  if (rows.length === 0) return null;

  const cls = (it) => {
    if (it._focus) return 'focus';
    if (it._good) return 'good';
    const ap = (it.approval || '').toLowerCase(), st = (it.status || '').toLowerCase();
    const overdue = it.target && !isNaN(Date.parse(it.target)) && new Date(it.target) < new Date() && st !== 'done';
    if (ap === 'rejected' || overdue) return 'focus';
    if (ap === 'approved' || st === 'done' || (st === 'in review' && ap === 'pending')) return 'good';
    return 'neutral';
  };
  const good = rows.filter(r => cls(r) === 'good');
  const focus = rows.filter(r => cls(r) === 'focus');
  const reason = (r) => {
    const ap = (r.approval || '').toLowerCase(), st = (r.status || '').toLowerCase();
    if (ap === 'rejected') return 'Rejected by client';
    if (r.target && !isNaN(Date.parse(r.target)) && new Date(r.target) < new Date() && st !== 'done') return 'Overdue (' + r.target + ')';
    if (ap === 'approved') return 'Approved';
    if (st === 'done') return 'Delivered';
    return 'On track';
  };

  const Col = ({ title, list, color, emptyText }) => (
    <div style={{ flex: 1, minWidth: 240, borderRadius: 14, background: c.surf, border: `1px solid ${c.bord}`, overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', borderBottom: `1px solid ${c.bord}`, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: color }}/>
        <span style={{ fontSize: 13.5, fontWeight: 700, color: c.text }}>{title}</span>
        <span style={{ fontSize: 12, color: c.mut }}>{list.length}</span>
      </div>
      <div style={{ maxHeight: 200, overflowY: 'auto' }}>
        {list.length === 0 ? <div style={{ padding: '18px 16px', fontSize: 12.5, color: c.mut }}>{emptyText}</div>
          : list.slice(0, 6).map((r, i) => (
            <div key={i} style={{ padding: '10px 16px', borderBottom: `1px solid ${c.bord}` }}>
              <div style={{ fontSize: 13, color: c.text, fontWeight: 500 }}>{r.item}</div>
              <div style={{ fontSize: 11.5, color: c.mut, marginTop: 2 }}>{r.space} · {reason(r)} · {r.pct || 0}%</div>
            </div>
          ))}
        {list.length > 6 && <div style={{ padding: '8px 16px', fontSize: 12, color: c.accent, cursor: 'pointer' }} onClick={() => onGoto && onGoto('spaces')}>+{list.length - 6} more →</div>}
      </div>
    </div>
  );

  return (
    <div style={{ marginTop: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: c.text }}>Project highlights</div>
        <button onClick={() => onGoto && onGoto('spaces')} style={{ fontSize: 12.5, color: c.accent, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>View spaces →</button>
      </div>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        <Col title="Doing good" list={good} color="#16A34A" emptyText="Nothing flagged as on-track yet."/>
        <Col title="Needs focus" list={focus} color="#DC2626" emptyText="Nothing needs urgent focus. 🎉"/>
      </div>
    </div>
  );
}

function HomeCommand({ session, team, tasks: allTasks, members, onGoto, onAddTask, onStartStandup, onNewTask, onNewNote, onStandupOptions, onOpenAttendance, isManager = true }) {
  // Members see only their own tasks across home metrics; managers see the whole team's.
  const myEmail0 = session?.user?.email;
  const tasks = isManager ? allTasks : allTasks.filter(t => t.assignee_email === myEmail0);
  // Team-wide figures for the bottom stat cards (members see the whole team, not just themselves)
  const teamCompletion = allTasks.length ? Math.round(allTasks.filter(t => t.status === 'done').length / allTasks.length * 100) : 0;
  const teamBlocked = allTasks.filter(t => t.status === 'blocked');
  const c = useC();
  const { dark } = useTheme();
  const fullName = session?.user?.user_metadata?.name || session?.user?.email?.split('@')[0] || 'there';
  const name = fullName.split(' ')[0];

  const blocked = tasks.filter(t => t.status === 'blocked');
  const inProgress = tasks.filter(t => t.status === 'in_progress' || t.status === 'inprogress' || t.status === 'in-progress');
  const done = tasks.filter(t => t.status === 'done');
  const active = tasks.filter(t => t.status !== 'done');
  const dueToday = tasks.filter(t => {
    if (!t.due_date && !t.timeline) return false;
    const d = t.due_date ? new Date(t.due_date) : null;
    return d ? d.toDateString() === new Date().toDateString() : /today/i.test(t.timeline || '');
  });
  const completion = tasks.length ? Math.round(done.length / tasks.length * 100) : 0;

  // ── Per-member workload (active tasks / capacity) ──
  const workloads = members.map(m => {
    const mine = active.filter(t => t.assignee_email === m.email);
    const urgent = mine.filter(t => t.priority === 'high' || t.status === 'blocked');
    const pct = Math.min(100, Math.round((mine.length / 5) * 100)); // 5 = nominal full plate
    return { member: m, count: mine.length, urgent: urgent.length, pct };
  });
  const overloaded = [...workloads].sort((a, b) => b.pct - a.pct)[0];
  const avgWorkload = workloads.length ? Math.round(workloads.reduce((s, w) => s + w.pct, 0) / workloads.length) : 0;
  // Real presence from the attendance store (same source as Team directory).
  const presenceNow = (() => {
    let att = {}; try { att = JSON.parse(localStorage.getItem('ss-attendance-' + (team?.id || 'demo') + '-' + new Date().toISOString().slice(0,10)) || '{}'); } catch {}
    const online = [], offline = [];
    members.forEach(m => {
      const r = att[m.email] || {};
      const isOn = r.online !== false && r.lastSeen && (Date.now() - r.lastSeen) < 120000;
      (isOn ? online : offline).push(m);
    });
    return { online, offline };
  })();
  const onlineCount = presenceNow.online.length;

  // Today's focus — prioritized
  const focus = [...tasks].filter(t => t.status !== 'done')
    .sort((a, b) => {
      const s = t => (t.status === 'blocked' ? 3 : 0) + (t.priority === 'high' ? 2 : t.priority === 'medium' ? 1 : 0);
      return s(b) - s(a);
    }).slice(0, 5);

  const greeting = (() => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; })();
  const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase();

  const aiSummary = (() => {
    const parts = [`You have ${active.length} active task${active.length !== 1 ? 's' : ''}.`];
    if (blocked.length) parts.push(`${blocked.length} ${blocked.length === 1 ? 'is' : 'are'} blocked.`);
    if (dueToday.length) parts.push(`${dueToday.length} ${dueToday.length === 1 ? 'is' : 'are'} due today.`);
    if (!active.length) parts.push(`You're all caught up. 🎉`);
    return parts.join(' ');
  })();

  // ── Recent activity (derived from task state) ──
  const activity = (() => {
    const items = [];
    done.slice(0, 2).forEach(t => items.push({ who: (t.assignee_email||'Someone').split('@')[0], verb: 'completed', what: t.title || t.text, ago: '12m' }));
    blocked.slice(0, 1).forEach(t => items.push({ who: (t.assignee_email||'Someone').split('@')[0], verb: 'flagged a blocker on', what: t.title || t.text, ago: '38m' }));
    inProgress.slice(0, 2).forEach(t => items.push({ who: (t.assignee_email||'Someone').split('@')[0], verb: 'is working on', what: t.title || t.text, ago: '1h' }));
    return items.slice(0, 6);
  })();

  const prioColor = p => p === 'high' ? '#F87171' : p === 'medium' ? '#FBBF24' : '#3B9EFF';
  const initials = (email) => (email||'?').split('@')[0].split(/[.\s]/).map(s=>s[0]).slice(0,2).join('').toUpperCase();

  // Detail-card modals for blockers & workload
  const [showBlockers, setShowBlockers] = useState(false);
  const [showWorkload, setShowWorkload] = useState(false);
  const [wlInsight, setWlInsight] = useState('');
  const [wlBusy, setWlBusy] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const [cmpInsight, setCmpInsight] = useState('');
  const [cmpBusy, setCmpBusy] = useState(false);
  const openCompletion = async () => {
    setShowCompletion(true);
    if (cmpInsight) return;
    setCmpBusy(true);
    const teamDone = allTasks.filter(t => t.status === 'done').length;
    const fallback = (() => {
      let s = `Your team has completed ${teamDone} of ${allTasks.length} task${allTasks.length!==1?'s':''} (${teamCompletion}%). `;
      if (teamCompletion >= 80) s += 'Strong throughput — the team is closing work reliably. ';
      else if (teamCompletion >= 50) s += 'Steady progress, with room to push a few more over the line. ';
      else s += 'Completion is lagging — worth checking for blockers or overloaded members. ';
      if (teamBlocked.length) s += `${teamBlocked.length} blocked task${teamBlocked.length!==1?'s are':' is'} likely holding the rate down. `;
      return s.trim();
    })();
    try {
      const res = await askAI(`You are a delivery analyst. The team has completed ${teamDone}/${allTasks.length} tasks (${teamCompletion}%), with ${teamBlocked.length} blocked. Write 2-3 short sentences: how completion is trending, what's holding it back, and one concrete action. No greeting, no preamble.`, { completion: teamCompletion, done: teamDone, total: allTasks.length, blocked: teamBlocked.length, teamName: team?.name });
      const text = (typeof res === 'string' ? res : res?.text || '').trim();
      const junk = /good (morning|afternoon)|how can i|what can i help/i;
      setCmpInsight(text && !junk.test(text) && text.length > 25 ? text : fallback);
    } catch { setCmpInsight(fallback); }
    setCmpBusy(false);
  };
  const openWorkload = async () => {
    setShowWorkload(true);
    if (wlInsight) return;
    setWlBusy(true);
    const lines = workloads.map(w => `${w.member.name || w.member.email.split('@')[0]}: ${w.count} active task${w.count!==1?'s':''}${w.urgent?`, ${w.urgent} urgent/blocked`:''}`).join('\n');
    const fallback = (() => {
      const sorted = [...workloads].sort((a,b)=>b.count-a.count);
      const top = sorted[0], low = sorted[sorted.length-1];
      let s = `The team is averaging ${avgWorkload}% capacity. `;
      if (top && top.count > 0) s += `${top.member.name||top.member.email.split('@')[0]} has the most on their plate (${top.count} task${top.count!==1?'s':''}${top.urgent?`, ${top.urgent} urgent`:''}). `;
      if (low && low.count === 0) s += `${low.member.name||low.member.email.split('@')[0]} has capacity to take more. `;
      if (avgWorkload > 85) s += 'Overall load is high — consider redistributing.'; else if (avgWorkload < 40) s += 'Plenty of headroom across the team.'; else s += 'Distribution looks healthy.';
      return s;
    })();
    try {
      const res = await askAI(`You are a team lead assistant. Given each member's active workload, write 2-3 short sentences of practical insight: who's overloaded, who has capacity, and one suggestion. Be specific, no preamble.\n\n${lines}`, { workloads, teamName: team?.name });
      const text = (typeof res === 'string' ? res : res?.text || '').trim();
      const junk = /good (morning|afternoon)|how can i|what can i help/i;
      setWlInsight(text && !junk.test(text) && text.length > 25 ? text : fallback);
    } catch { setWlInsight(fallback); }
    setWlBusy(false);
  };

  // ── Quick action cards ──
  const QUICK = [
    { l: 'Meeting note', sub: 'Notes & project notes', icon: '≡', fn: () => onNewNote && onNewNote() },
    { l: 'Start standup', sub: 'Run the room', icon: '◉', fn: () => onStandupOptions && onStandupOptions() },
  ];

  // ── Bottom stat cards ──
  const STATS = [
    { label: 'Completion rate', value: `${teamCompletion}%`, delta: teamCompletion >= 50 ? '+3%' : null, deltaColor: '#34D399', sub: 'click for AI insight', onClick: openCompletion },
    { label: 'Open blockers', value: teamBlocked.length, delta: teamBlocked.length ? `+${teamBlocked.length}` : null, deltaColor: '#F87171', sub: teamBlocked.length ? 'click to view' : 'across the team', onClick: () => { if (teamBlocked.length) setShowBlockers(true); } },
    { label: 'Avg workload', value: `${avgWorkload}%`, sub: 'click for AI insight', onClick: openWorkload },
  ];

  return (
    <div className="ss-home-root" style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 40 }}>

      {/* Greeting */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: c.mut, letterSpacing: '.1em', marginBottom: 10 }}>{dateStr}</div>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <h1 style={{ fontSize: 34, fontWeight: 800, color: c.text, letterSpacing: '-.03em', margin: 0, lineHeight: 1.1 }}>{greeting}, {name}</h1>
            <p style={{ fontSize: 15, color: c.sub, margin: '10px 0 0', lineHeight: 1.5 }}>{aiSummary}</p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button onClick={() => onGoto('insights')}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 11, border: `1px solid ${c.bord}`, background: c.surf, color: c.text, cursor: 'pointer', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>
              <span style={{ color: '#A78BFA' }}>✦</span> Ask AI
            </button>
            <button onClick={() => onNewTask && onNewTask()}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 11, border: 'none', background: 'linear-gradient(135deg,#0070F3,#3B9EFF)', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', boxShadow: '0 2px 10px rgba(0,112,243,.3)' }}>
              <span style={{ fontSize: 16 }}>＋</span> {isManager ? 'Assign task' : 'New task'}
            </button>
          </div>
        </div>
      </div>

      {/* Quick action cards */}
      <div className="ss-home-quick" style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 14 }}>
        {QUICK.map(a => (
          <button key={a.l} onClick={a.fn}
            style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '18px 18px', borderRadius: 16, border: `1px solid ${c.bord}`, background: c.surf, cursor: 'pointer', textAlign: 'left', transition: 'all .15s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = c.bordH; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = c.bord; e.currentTarget.style.transform = 'none'; }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: dark ? 'rgba(129,140,248,.12)' : 'rgba(0,112,243,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: c.accent, flexShrink: 0 }}>{a.icon}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: c.text, lineHeight: 1.2 }}>{a.l}</div>
              <div style={{ fontSize: 12, color: c.mut, marginTop: 3 }}>{a.sub}</div>
            </div>
          </button>
        ))}
      </div>

      <ProjectSummary teamId={team?.id || 'demo'} onGoto={onGoto}/>

      {/* Team board — managers post tasks/messages/reminders; anyone claims open tasks */}
      <TeamBoard teamId={team?.id || 'demo'} session={session} isManager={isManager} onClaimTask={(t)=>onAddTask&&onAddTask(t)} onGoto={onGoto}/>

      {/* Focus + AI insights */}
      <div className="ss-home-mid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.5fr) minmax(0,1fr)', gap: 16 }}>

        {/* Today's focus */}
        <div style={{ borderRadius: 16, background: c.surf, border: `1px solid ${c.bord}`, overflow: 'hidden' }}>
          <div style={{ padding: '18px 22px 14px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: c.text }}>Today's focus</div>
              <div style={{ fontSize: 12.5, color: c.mut, marginTop: 3 }}>The {Math.min(focus.length,5) || 'few'} things that matter most.</div>
            </div>
            <button onClick={() => onGoto('tasks')} style={{ fontSize: 13, color: c.accent, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}>View all tasks →</button>
          </div>
          <div style={{ padding: '0 12px 12px' }}>
            {focus.length === 0 ? (
              <div style={{ padding: '32px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>🎯</div>
                <div style={{ fontSize: 14, color: c.sub, fontWeight: 600, marginBottom: 4 }}>Nothing urgent right now</div>
                <div style={{ fontSize: 13, color: c.mut }}>Use <strong style={{ color: c.sub }}>New task</strong> above to plan your day</div>
              </div>
            ) : focus.map(t => {
              const m = members.find(x => x.email === t.assignee_email);
              return (
                <div key={t.id} onClick={() => onGoto('tasks')}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 12px', borderRadius: 10, cursor: 'pointer', transition: 'background .12s' }}
                  onMouseEnter={e => e.currentTarget.style.background = c.row}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <div style={{ width: 9, height: 9, borderRadius: '50%', background: prioColor(t.priority), flexShrink: 0 }}/>
                  <span style={{ flex: 1, fontSize: 14, color: c.text, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title || t.text || 'Untitled task'}</span>
                  {t.tag && <span style={{ fontSize: 12, color: c.mut, flexShrink: 0 }}>{t.tag}</span>}
                  {m
                    ? <Av member={m} size={22} url={m.avatar_url}/>
                    : <span style={{ width: 22, height: 22, borderRadius: '50%', background: dark ? 'rgba(255,255,255,.08)' : 'rgba(0,112,243,.1)', color: c.sub, fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{initials(t.assignee_email)}</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* AI insights */}
        <div style={{ borderRadius: 16, background: c.surf, border: `1px solid ${c.bord}`, padding: '18px 20px' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: c.text }}>AI insights</div>
          <div style={{ fontSize: 12.5, color: c.mut, marginTop: 3, marginBottom: 16 }}>What needs your attention.</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {overloaded && overloaded.pct >= 80 && (
              <div style={{ display: 'flex', gap: 10 }}>
                <span style={{ fontSize: 15, flexShrink: 0 }}>⚠️</span>
                <div style={{ fontSize: 13, color: c.sub, lineHeight: 1.5 }}><strong style={{ color: c.text }}>{(overloaded.member.name||overloaded.member.email||'Someone').split(' ')[0]} is overloaded</strong> — {overloaded.pct}% capacity with {overloaded.urgent} urgent task{overloaded.urgent!==1?'s':''}.</div>
              </div>
            )}
            {blocked.length > 0 && (
              <div style={{ display: 'flex', gap: 10 }}>
                <span style={{ fontSize: 15, flexShrink: 0 }}>🕐</span>
                <div style={{ fontSize: 13, color: c.sub, lineHeight: 1.5 }}><strong style={{ color: c.text }}>{blocked.length} blocker{blocked.length!==1?'s':''}</strong> {blocked.length!==1?'have':'has'} been open — consider reassigning.</div>
              </div>
            )}
            {dueToday.length > 0 && (
              <div style={{ display: 'flex', gap: 10 }}>
                <span style={{ fontSize: 15, flexShrink: 0, color: '#A78BFA' }}>✦</span>
                <div style={{ fontSize: 13, color: c.sub, lineHeight: 1.5 }}>{dueToday[0].title || dueToday[0].text} is due today.</div>
              </div>
            )}
            {blocked.length === 0 && (!overloaded || overloaded.pct < 80) && dueToday.length === 0 && (
              <div style={{ display: 'flex', gap: 10 }}>
                <span style={{ fontSize: 15, flexShrink: 0 }}>✓</span>
                <div style={{ fontSize: 13, color: c.sub, lineHeight: 1.5 }}>Everything looks healthy. {completion}% complete and no blockers.</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom stats */}
      <div className="ss-home-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
        {STATS.map(s => (
          <div key={s.label} onClick={s.onClick}
            style={{ padding: '18px 20px', borderRadius: 16, background: c.surf, border: `1px solid ${c.bord}`, cursor: 'pointer', transition: 'border-color .15s' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = c.bordH}
            onMouseLeave={e => e.currentTarget.style.borderColor = c.bord}>
            <div style={{ fontSize: 11, fontWeight: 700, color: c.mut, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 12 }}>{s.label}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 30, fontWeight: 800, color: c.text, letterSpacing: '-.02em', lineHeight: 1 }}>{s.value}</span>
              {s.delta && <span style={{ fontSize: 12, fontWeight: 700, color: s.deltaColor }}>{s.delta}</span>}
            </div>
            <div style={{ fontSize: 12, color: c.mut, marginTop: 8 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Recent activity */}
      <div style={{ borderRadius: 16, background: c.surf, border: `1px solid ${c.bord}`, padding: '20px 24px' }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: c.text, marginBottom: 16 }}>Recent activity</div>
        {activity.length === 0 ? (
          <div style={{ padding: '20px 0', textAlign: 'center', fontSize: 13, color: c.mut }}>Activity will appear as your team works on tasks.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {activity.map((a, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
                <span style={{ fontSize: 11, color: c.mut, width: 48, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{a.ago} ago</span>
                <span style={{ fontSize: 13.5, color: c.sub, lineHeight: 1.5 }}>
                  <strong style={{ color: c.text, textTransform: 'capitalize' }}>{a.who}</strong> {a.verb} <strong style={{ color: c.text }}>{a.what}</strong>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Blockers detail card */}
      {showBlockers && (
        <Modal onClose={() => setShowBlockers(false)} title={`🚧 Open blockers (${teamBlocked.length})`} width={460}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {teamBlocked.map(t => (
              <div key={t.id} style={{ padding: '12px 14px', borderRadius: 11, background: 'rgba(239,68,68,.06)', border: '1px solid rgba(239,68,68,.2)' }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: c.text, marginBottom: 3 }}>{t.title || t.text}</div>
                <div style={{ fontSize: 12, color: c.mut }}>{t.assignee_name || (t.assignee_email||'Unassigned').split('@')[0]}{t.blocker ? ` · ${t.blocker}` : ''}</div>
              </div>
            ))}
          </div>
          <Btn onClick={() => { setShowBlockers(false); onGoto('tasks'); }} style={{ marginTop: 16, width: '100%', justifyContent: 'center' }}>Open in Tasks</Btn>
        </Modal>
      )}

      {/* Completion rate AI insight card */}
      {showCompletion && (
        <Modal onClose={() => setShowCompletion(false)} title="✦ Completion insight" width={460}>
          <div style={{ padding: '14px 16px', borderRadius: 12, background: 'rgba(52,211,153,.07)', border: '1px solid rgba(52,211,153,.2)', marginBottom: 16, fontSize: 14, color: c.text, lineHeight: 1.65, minHeight: 60 }}>
            {cmpBusy ? <span style={{ color: c.mut }}>Analyzing completion trend…</span> : cmpInsight}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {[{ l: 'Completed', v: allTasks.filter(t=>t.status==='done').length, col: '#34D399' }, { l: 'Active', v: allTasks.filter(t=>t.status!=='done').length, col: '#3B9EFF' }, { l: 'Blocked', v: teamBlocked.length, col: teamBlocked.length?'#F87171':'#94A3B8' }].map(s => (
              <div key={s.l} style={{ flex: 1, textAlign: 'center', padding: '12px 8px', borderRadius: 12, background: c.row }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: s.col }}>{s.v}</div>
                <div style={{ fontSize: 10.5, color: c.mut, textTransform: 'uppercase', letterSpacing: '.04em', marginTop: 2 }}>{s.l}</div>
              </div>
            ))}
          </div>
          <Btn v="ghost" onClick={() => { setShowCompletion(false); onGoto('insights'); }} style={{ marginTop: 16, width: '100%', justifyContent: 'center' }}>See full performance →</Btn>
        </Modal>
      )}

      {/* Workload AI insight card */}
      {showWorkload && (
        <Modal onClose={() => setShowWorkload(false)} title="✦ Workload insight" width={460}>
          <div style={{ padding: '14px 16px', borderRadius: 12, background: 'rgba(0,112,243,.07)', border: '1px solid rgba(0,112,243,.2)', marginBottom: 16, fontSize: 14, color: c.text, lineHeight: 1.65, minHeight: 60 }}>
            {wlBusy ? <span style={{ color: c.mut }}>Analyzing team workload…</span> : wlInsight}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[...workloads].sort((a,b)=>b.count-a.count).map(w => (
              <div key={w.member.email} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Av member={w.member} size={26} url={w.member.avatar_url}/>
                <span style={{ flex: 1, fontSize: 13, color: c.text }}>{w.member.name || w.member.email.split('@')[0]}</span>
                <div style={{ width: 90 }}><Bar pct={w.pct} h={6} color={w.pct>=85?'#F87171':w.pct>=60?'#FBBF24':'#34D399'}/></div>
                <span style={{ fontSize: 12, color: c.mut, width: 54, textAlign: 'right' }}>{w.count} task{w.count!==1?'s':''}</span>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
// ── AI Project Health Score ──────────────────────────────────────────────────
// Scores a space 0–100 from real signals: overdue tasks, blockers, workload
// concentration, completion progress, recency of updates, and report bottlenecks.
// Returns { score, band, color, label, factors:[{label,impact,detail}] }.
function computeHealth(space) {
  const items = Array.isArray(space?.items) ? space.items : [];
  const now = Date.now();
  let score = 100;
  const factors = [];
  const ded = (pts, label, detail) => { score -= pts; factors.push({ label, impact: -pts, detail }); };
  const add = (pts, label, detail) => { score += pts; factors.push({ label, impact: pts, detail }); };

  const open = items.filter(i => i.status !== 'done');
  const done = items.filter(i => i.status === 'done');
  const total = items.length;

  // 1. Overdue / delayed tasks
  const overdue = open.filter(i => i.due && !isNaN(Date.parse(i.due)) && new Date(i.due) < now);
  if (overdue.length) ded(Math.min(28, overdue.length * 7), 'Delayed tasks', `${overdue.length} task${overdue.length>1?'s':''} past due`);

  // 2. Blockers (status blocked, or a blocker note)
  const blocked = items.filter(i => i.status === 'blocked' || i.blocker);
  if (blocked.length) ded(Math.min(24, blocked.length * 8), 'Blockers', `${blocked.length} blocked item${blocked.length>1?'s':''}`);

  // 3. Report bottlenecks (from Client Report summary, if present)
  const bottlenecks = space?.report?.summary?.bottlenecks?.length || 0;
  if (bottlenecks) ded(Math.min(15, bottlenecks * 3), 'Reported bottlenecks', `${bottlenecks} flagged in the client report`);

  // 4. Completion progress
  const pct = total ? Math.round(done.length / total * 100) : 0;
  if (total >= 3) {
    if (pct < 25) ded(14, 'Low completion', `Only ${pct}% of work is done`);
    else if (pct >= 70) add(6, 'Strong progress', `${pct}% complete`);
  }

  // 5. Workload concentration (one person carrying too much open work)
  const byAssignee = {};
  open.forEach(i => { const a = i.assignee_email || i.assignee || 'unassigned'; byAssignee[a] = (byAssignee[a] || 0) + 1; });
  const loads = Object.entries(byAssignee).filter(([k]) => k !== 'unassigned').map(([, v]) => v);
  const maxLoad = loads.length ? Math.max(...loads) : 0;
  if (maxLoad >= 6) ded(Math.min(14, (maxLoad - 5) * 4), 'Workload concentration', `One member has ${maxLoad} open tasks`);

  // 6. Unassigned open work
  const unassigned = open.filter(i => !(i.assignee_email || i.assignee)).length;
  if (unassigned >= 3) ded(Math.min(10, unassigned * 2), 'Unassigned work', `${unassigned} open tasks have no owner`);

  // 7. Staleness — no recent updates / no recently created items
  const recent = items.filter(i => i.updatedAt ? (now - i.updatedAt) < 7 * 864e5 : (i.createdAt ? (now - i.createdAt) < 7 * 864e5 : false)).length;
  if (total >= 4 && recent === 0) ded(12, 'No recent activity', 'No task updates in the last 7 days');
  else if (recent > 0) add(4, 'Active this week', `${recent} item${recent>1?'s':''} touched recently`);

  // 8. Empty project = unknown, not unhealthy
  if (total === 0) { score = 75; factors.length = 0; factors.push({ label: 'No tasks yet', impact: 0, detail: 'Add work to start tracking health' }); }

  score = Math.max(0, Math.min(100, Math.round(score)));
  let band, color, label;
  if (score >= 80) { band = 'green'; color = '#16A34A'; label = 'Healthy'; }
  else if (score >= 55) { band = 'yellow'; color = '#D97706'; label = 'At risk'; }
  else { band = 'red'; color = '#DC2626'; label = 'Critical'; }
  factors.sort((a, b) => a.impact - b.impact);
  return { score, band, color, label, factors, pct, overdue: overdue.length, blocked: blocked.length };
}

function HealthRing({ score, color, size = 46 }) {
  const r = (size - 6) / 2, circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(128,128,128,.18)" strokeWidth="4"/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={circ * (1 - score/100)} transform={`rotate(-90 ${size/2} ${size/2})`}/>
      <text x="50%" y="52%" dominantBaseline="middle" textAnchor="middle" fontSize={size*0.30} fontWeight="800" fill={color}>{score}</text>
    </svg>
  );
}

const SPACE_TEMPLATES = [
  { id: 'pm',       name: 'Project management', icon: '📋', color: '#2563EB', desc: 'Plan and deliver business projects.' },
  { id: 'software', name: 'Software development', icon: '💻', color: '#7C3AED', desc: 'Build, ship, and iterate on products.' },
  { id: 'marketing',name: 'Marketing',           icon: '📣', color: '#DB2777', desc: 'Campaigns, content, and launches.' },
  { id: 'design',   name: 'Design',              icon: '🎨', color: '#EA580C', desc: 'Design work, reviews, and assets.' },
  { id: 'ops',      name: 'Operations',          icon: '⚙️', color: '#0891B2', desc: 'Processes, SOPs, and recurring work.' },
  { id: 'blank',    name: 'Blank space',         icon: '⬜', color: '#64748B', desc: 'Start from scratch, your way.' },
];
const SPACE_STATUSES = [
  { id: 'todo',  label: 'To Do',        color: '#64748B' },
  { id: 'inprog',label: 'In Progress',  color: '#2563EB' },
  { id: 'review',label: 'In Review',    color: '#D97706' },
  { id: 'done',  label: 'Done',         color: '#16A34A' },
];

function SpacesArea({ team, session, members = [] }) {
  const c = useC();
  const { dark } = useTheme();
  const teamId = team?.id || 'demo';
  const KEY = `ss-spaces-${teamId}`;
  const myEmail = session?.user?.email;

  const [spaces, setSpaces]   = useState([]);
  const [selId, setSelId]     = useState(null);
  const [view, setView]       = useState('list'); // list | create | invite | space
  const [draft, setDraft]     = useState(null);   // {name, templateId} while creating

  // load
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) { const d = JSON.parse(raw); setSpaces(d || []); }
    } catch(e) {}
  }, [KEY]);
  const save = useCallback((s) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch(e) {} }, [KEY]);

  const sel = spaces.find(s => s.id === selId);

  const updateSpace = useCallback((id, patch) => {
    setSpaces(prev => { const next = prev.map(s => s.id === id ? { ...s, ...patch } : s); save(next); return next; });
  }, [save]);

  // ── create flow ──
  const startCreate = () => { setDraft({ name: '', templateId: 'pm' }); setView('create'); };
  const goInvite = () => { if (!draft?.name.trim()) return; setView('invite'); };
  const finishCreate = (invited) => {
    const tpl = SPACE_TEMPLATES.find(t => t.id === draft.templateId) || SPACE_TEMPLATES[0];
    const key = draft.name.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 3) || 'SP';
    const sp = {
      id: 'sp' + Date.now(), name: draft.name.trim(), key,
      template: tpl.id, icon: tpl.icon, color: tpl.color,
      createdAt: Date.now(), createdBy: myEmail,
      members: invited || [], items: [], docs: [],
    };
    const next = [...spaces, sp]; setSpaces(next); save(next);
    setSelId(sp.id); setView('space'); setDraft(null);
  };

  const deleteSpace = (id) => {
    if (!window.confirm('Delete this space and all its items?')) return;
    const next = spaces.filter(s => s.id !== id); setSpaces(next); save(next);
    setSelId(null); setView('list');
  };

  // ══ CREATE WIZARD (with live preview) ══
  if (view === 'create') {
    const tpl = SPACE_TEMPLATES.find(t => t.id === draft.templateId) || SPACE_TEMPLATES[0];
    const key = draft.name.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 3) || 'NP';
    return (
      <div style={{ display: 'flex', gap: 40, maxWidth: 1200, margin: '0 auto', flexWrap: 'wrap' }}>
        {/* Left: form */}
        <div style={{ flex: 1, minWidth: 320, maxWidth: 460 }}>
          <button onClick={() => setView('list')} style={{ background: 'none', border: 'none', color: c.mut, cursor: 'pointer', fontSize: 13, marginBottom: 22, padding: 0 }}>← Back to spaces</button>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: c.text, margin: '0 0 8px', letterSpacing: '-.02em' }}>Create space</h1>
          <p style={{ fontSize: 14, color: c.sub, lineHeight: 1.6, margin: '0 0 6px' }}>Explore what's possible when you collaborate with your team. Edit space details anytime in settings.</p>
          <p style={{ fontSize: 12.5, color: c.mut, margin: '0 0 24px' }}>Required fields are marked with an asterisk <span style={{ color: '#F87171' }}>*</span></p>

          <div style={{ marginBottom: 22 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: c.text, marginBottom: 7 }}>Name <span style={{ color: '#F87171' }}>*</span></div>
            <input value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} onKeyDown={e => e.key === 'Enter' && goInvite()} placeholder="e.g. New Project" autoFocus
              style={{ width: '100%', background: c.inp, border: `1.5px solid ${draft.name ? '#0070F3' : c.inpB}`, borderRadius: 8, padding: '11px 14px', color: c.text, fontSize: 15, outline: 'none', boxSizing: 'border-box' }}/>
          </div>

          <div style={{ marginBottom: 22 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: c.text, marginBottom: 10 }}>Template</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {SPACE_TEMPLATES.map(t => (
                <button key={t.id} onClick={() => setDraft(d => ({ ...d, templateId: t.id }))}
                  style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', borderRadius: 10, cursor: 'pointer', textAlign: 'left', width: '100%',
                    border: `1.5px solid ${draft.templateId === t.id ? '#0070F3' : c.bord}`, background: draft.templateId === t.id ? (dark ? 'rgba(0,112,243,.1)' : 'rgba(0,112,243,.06)') : c.surf }}>
                  <div style={{ width: 38, height: 38, borderRadius: 9, background: t.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{t.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: c.text }}>{t.name}</div>
                    <div style={{ fontSize: 12, color: c.mut, marginTop: 1 }}>{t.desc}</div>
                  </div>
                  {draft.templateId === t.id && <span style={{ color: '#0070F3', fontSize: 16 }}>✓</span>}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Btn v="ghost" onClick={() => setView('list')}>Cancel</Btn>
            <Btn onClick={goInvite} disabled={!draft.name.trim()}>Next: invite team →</Btn>
          </div>
        </div>

        {/* Right: live preview */}
        <div style={{ flex: 1, minWidth: 360, display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: 520, position: 'relative' }}>
            {/* blob bg */}
            <div style={{ position: 'absolute', inset: '-30px -10px', background: `radial-gradient(circle at 60% 40%, ${tpl.color}33, transparent 65%)`, borderRadius: 40, filter: 'blur(20px)' }}/>
            <div style={{ position: 'relative', background: dark ? '#0F1525' : '#fff', border: `1px solid ${c.bord}`, borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,.25)', overflow: 'hidden' }}>
              <div style={{ display: 'flex' }}>
                {/* mini sidebar */}
                <div style={{ width: 130, background: dark ? '#0B1020' : '#F8F9FB', borderRight: `1px solid ${c.bord}`, padding: '16px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 16 }}>
                    <div style={{ width: 22, height: 22, borderRadius: 6, background: tpl.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>{tpl.icon}</div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: c.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{draft.name || 'New Space'}</div>
                  </div>
                  {[...Array(7)].map((_, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 11 }}>
                      <div style={{ width: 12, height: 12, borderRadius: '50%', background: c.bord, flexShrink: 0 }}/>
                      <div style={{ height: 7, borderRadius: 4, background: c.bord, width: `${50 + (i % 3) * 18}%` }}/>
                    </div>
                  ))}
                </div>
                {/* mini board/list */}
                <div style={{ flex: 1, padding: '16px 14px' }}>
                  <div style={{ height: 9, width: '55%', borderRadius: 4, background: c.bord, marginBottom: 14 }}/>
                  {[...Array(7)].map((_, i) => {
                    const cols = ['#FCA5A5', '#93C5FD', '#BFDBFE', '#FDE68A', '#FCA5A5', '#86EFAC', '#FDE68A'];
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 9 }}>
                        <div style={{ width: 14, height: 14, borderRadius: 3, background: tpl.color, flexShrink: 0 }}/>
                        <span style={{ fontSize: 11, fontWeight: 700, color: c.sub, width: 34, flexShrink: 0 }}>{key}-{i + 1}</span>
                        <div style={{ flex: 1, height: 7, borderRadius: 4, background: c.bord }}/>
                        <div style={{ width: 36, height: 11, borderRadius: 4, background: cols[i] }}/>
                        <div style={{ width: 11, height: 11, borderRadius: '50%', background: cols[(i + 2) % cols.length] }}/>
                      </div>
                    );
                  })}
                  <div style={{ fontSize: 10, color: c.mut, marginTop: 14 }}>Preview · {tpl.name}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ══ INVITE STEP ══
  if (view === 'invite') {
    return <SpaceInvite draft={draft} members={members} myEmail={myEmail}
      onBack={() => setView('create')} onSkip={() => finishCreate([])} onInvite={(list) => finishCreate(list)}/>;
  }

  // ══ INSIDE A SPACE ══
  if (view === 'space' && sel) {
    return <SpaceWorkspace space={sel} members={members} session={session}
      onBack={() => { setView('list'); setSelId(null); }}
      onUpdate={(patch) => updateSpace(sel.id, patch)}
      onDelete={() => deleteSpace(sel.id)}/>;
  }

  // ══ SPACES LIST ══
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: c.text, margin: 0, letterSpacing: '-.02em' }}>Spaces</h1>
          <p style={{ fontSize: 13.5, color: c.mut, margin: '6px 0 0' }}>Full project workspaces — boards, lists, timelines, and docs.</p>
        </div>
        <Btn onClick={startCreate}>＋ Create space</Btn>
      </div>

      {/* Project highlights — moved here from Home */}
      <div style={{ marginBottom: 24 }}><ProjectHighlights teamId={teamId} onGoto={() => {}}/></div>

      {/* Executive project-health overview */}
      {spaces.length > 0 && (() => {
        const scored = spaces.map(s => ({ s, h: computeHealth(s) })).sort((a, b) => a.h.score - b.h.score);
        const avg = Math.round(scored.reduce((sum, x) => sum + x.h.score, 0) / scored.length);
        const counts = { green: 0, yellow: 0, red: 0 };
        scored.forEach(x => counts[x.h.band]++);
        return (
          <div style={{ marginBottom: 24, borderRadius: 16, background: c.surf, border: `1px solid ${c.bord}`, padding: '18px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 14 }}>
              <span style={{ color: '#0070F3', display: 'flex' }}>{boardIcon('summary', 20)}</span>
              <div style={{ flex: 1, minWidth: 160 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: c.text }}>Project health</div>
                <div style={{ fontSize: 12, color: c.mut }}>AI-scored across delays, blockers, workload & progress</div>
              </div>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                {[['Healthy', counts.green, '#16A34A'], ['At risk', counts.yellow, '#D97706'], ['Critical', counts.red, '#DC2626']].map(([l, n, col]) => (
                  <div key={l} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: col }}>{n}</div>
                    <div style={{ fontSize: 10, color: c.mut, textTransform: 'uppercase', letterSpacing: '.04em' }}>{l}</div>
                  </div>
                ))}
                <div style={{ borderLeft: `1px solid ${c.bord}`, paddingLeft: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: c.text }}>{avg}</div>
                  <div style={{ fontSize: 10, color: c.mut, textTransform: 'uppercase', letterSpacing: '.04em' }}>Avg</div>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {scored.map(({ s, h }) => (
                <button key={s.id} onClick={() => { setSelId(s.id); setView('space'); }} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 10px', borderRadius: 10, border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}
                  onMouseEnter={e => e.currentTarget.style.background = c.row} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <span style={{ fontSize: 16, width: 22, textAlign: 'center' }}>{s.icon}</span>
                  <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: c.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                  {h.overdue > 0 && <span style={{ fontSize: 11, color: '#DC2626' }}>{h.overdue} overdue</span>}
                  {h.blocked > 0 && <span style={{ fontSize: 11, color: '#D97706' }}>{h.blocked} blocked</span>}
                  <span style={{ fontSize: 11, fontWeight: 700, color: h.color, background: h.color + '1f', padding: '3px 9px', borderRadius: 20, whiteSpace: 'nowrap' }}>{h.band === 'red' ? 'Critical' : `${h.score}/100`}</span>
                  <div style={{ width: 90 }}><Bar pct={h.score} h={6} color={h.color}/></div>
                </button>
              ))}
            </div>
          </div>
        );
      })()}

      {spaces.length === 0 ? (
        <div style={{ padding: '48px 20px', textAlign: 'center', borderRadius: 16, border: `1.5px dashed ${c.bord}` }}>
          <div style={{ fontSize: 42, marginBottom: 12 }}>▦</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: c.text, marginBottom: 6 }}>No spaces yet</div>
          <div style={{ fontSize: 13.5, color: c.mut, marginBottom: 18, maxWidth: 360, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>Create a space for each project. Each one gets its own board, list, calendar, timeline, and docs.</div>
          <Btn onClick={startCreate}>＋ Create your first space</Btn>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px,1fr))', gap: 14 }}>
          {spaces.map(s => {
            const open = s.items.filter(i => i.status !== 'done').length;
            const tpl = SPACE_TEMPLATES.find(t => t.id === s.template);
            const health = computeHealth(s);
            return (
              <div key={s.id} onClick={() => { setSelId(s.id); setView('space'); }}
                style={{ padding: '18px', borderRadius: 16, background: c.surf, border: `1px solid ${c.bord}`, cursor: 'pointer', transition: 'border-color .15s', position: 'relative' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = c.bordH}
                onMouseLeave={e => e.currentTarget.style.borderColor = c.bord}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 11, background: (s.color || '#0070F3') + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{s.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: c.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
                    <div style={{ fontSize: 11.5, color: c.mut }}>{tpl?.name || 'Space'} · {s.key}</div>
                  </div>
                  <div title={`Health: ${health.label} (${health.score}/100)`}><HealthRing score={health.score} color={health.color} size={42}/></div>
                </div>
                <div style={{ display: 'flex', gap: 16 }}>
                  <div><span style={{ fontSize: 18, fontWeight: 800, color: c.text }}>{s.items.length}</span><span style={{ fontSize: 11, color: c.mut, marginLeft: 5 }}>items</span></div>
                  <div><span style={{ fontSize: 18, fontWeight: 800, color: open ? '#FBBF24' : c.text }}>{open}</span><span style={{ fontSize: 11, color: c.mut, marginLeft: 5 }}>open</span></div>
                  <div style={{ flex: 1 }}/>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    {(s.members || []).slice(0, 3).map((m, i) => (
                      <div key={i} style={{ width: 24, height: 24, borderRadius: '50%', background: 'linear-gradient(135deg,#0070F3,#3B9EFF)', border: `2px solid ${c.surf}`, marginLeft: i ? -8 : 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#fff' }}>{(m.email || m).slice(0, 2).toUpperCase()}</div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── SPACE INVITE STEP ────────────────────────────────────────────────────────
function SpaceInvite({ draft, members, myEmail, onBack, onSkip, onInvite }) {
  const c = useC();
  const { dark } = useTheme();
  const [chips, setChips] = useState([]);
  const [input, setInput] = useState('');
  const [role, setRole] = useState('member');
  const [showSug, setShowSug] = useState(false);

  const suggestions = members.filter(m => m.email && m.email !== myEmail && !chips.find(c2 => c2.email === m.email));

  const addChip = (m) => { setChips(prev => [...prev, m]); setInput(''); setShowSug(false); };
  const addRaw = () => {
    const v = input.trim();
    if (v && /\S+@\S+/.test(v) && !chips.find(c2 => c2.email === v)) { setChips(prev => [...prev, { email: v, name: v.split('@')[0] }]); setInput(''); }
  };
  const removeChip = (email) => setChips(prev => prev.filter(c2 => c2.email !== email));

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', paddingTop: 8 }}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', color: c.mut, cursor: 'pointer', fontSize: 13, marginBottom: 22, padding: 0 }}>← Back</button>
      <h1 style={{ fontSize: 28, fontWeight: 800, color: c.text, margin: '0 0 8px', letterSpacing: '-.02em' }}>Bring your team along</h1>
      <p style={{ fontSize: 14, color: c.sub, margin: '0 0 28px' }}>Add people to <strong style={{ color: c.text }}>{draft.name}</strong>, or invite someone new.</p>

      <div style={{ background: c.surf, border: `1px solid ${c.bord}`, borderRadius: 14, padding: 20, marginBottom: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: c.text, marginBottom: 8 }}>Enter names or emails</div>
        <div style={{ border: `1.5px solid ${c.inpB}`, borderRadius: 9, padding: '8px 10px', display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', background: c.inp, marginBottom: 18 }}>
          {chips.map(ch => (
            <span key={ch.email} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: dark ? 'rgba(0,112,243,.18)' : 'rgba(0,112,243,.12)', borderRadius: 16, padding: '3px 6px 3px 9px', fontSize: 12.5, color: c.text, fontWeight: 600 }}>
              {ch.name || ch.email}
              <button onClick={() => removeChip(ch.email)} style={{ background: 'none', border: 'none', color: c.mut, cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>
            </span>
          ))}
          <input value={input} onFocus={() => setShowSug(true)} onChange={e => { setInput(e.target.value); setShowSug(true); }} onKeyDown={e => { if (e.key === 'Enter') addRaw(); if (e.key === 'Backspace' && !input && chips.length) removeChip(chips[chips.length - 1].email); }}
            placeholder={chips.length ? 'Enter more' : 'name@company.com'} style={{ flex: 1, minWidth: 140, background: 'transparent', border: 'none', outline: 'none', color: c.text, fontSize: 13, padding: '4px 2px' }}/>
        </div>
        {showSug && suggestions.length > 0 && (
          <div style={{ marginTop: -12, marginBottom: 16, border: `1px solid ${c.bord}`, borderRadius: 9, overflow: 'hidden', maxHeight: 160, overflowY: 'auto' }}>
            {suggestions.slice(0, 6).map(m => (
              <button key={m.email} onClick={() => addChip(m)} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 12px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                onMouseEnter={e => e.currentTarget.style.background = c.row} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg,#0070F3,#3B9EFF)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff' }}>{(m.email || '').slice(0, 2).toUpperCase()}</div>
                <div><div style={{ fontSize: 13, fontWeight: 600, color: c.text }}>{m.name || m.email}</div><div style={{ fontSize: 11, color: c.mut }}>{m.email}</div></div>
              </button>
            ))}
          </div>
        )}
        <div style={{ fontSize: 13, fontWeight: 700, color: c.text, marginBottom: 8 }}>Role</div>
        <Sel value={role} onChange={e => setRole(e.target.value)}>
          <option value="admin">Administrator — full access to the space</option>
          <option value="member">Member — can view and edit work items</option>
          <option value="guest">Guest — limited access, view only</option>
        </Sel>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 14, alignItems: 'center' }}>
        <button onClick={onSkip} style={{ background: 'none', border: 'none', color: c.mut, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>Skip</button>
        <Btn onClick={() => onInvite(chips.map(ch => ({ ...ch, role })))}>Invite and continue</Btn>
      </div>
    </div>
  );
}

// ─── SPACE WORKSPACE (the project, with tabs) ─────────────────────────────────
function SpaceWorkspace({ space, members, session, onBack, onUpdate, onDelete }) {
  const c = useC();
  const { dark } = useTheme();
  const [tab, setTab] = useState('summary');
  const [showNew, setShowNew] = useState(false);
  const myEmail = session?.user?.email;
  const items = space.items || [];

  const TABS = [
    { id: 'summary',  label: 'Summary',  icon: '🌐' },
    { id: 'board',    label: 'Board',    icon: '▦' },
    { id: 'list',     label: 'List',     icon: '☰' },
    { id: 'calendar', label: 'Calendar', icon: '⊟' },
    { id: 'timeline', label: 'Timeline', icon: '↔' },
    { id: 'agile',    label: 'Agile', icon: '🌀' },
    { id: 'report',   label: 'Client Report', icon: '📊' },
    { id: 'docs',     label: 'Docs',     icon: '◈' },
  ];

  const addItem = (data) => {
    const n = items.length + 1;
    const it = { id: 'it' + Date.now(), key: `${space.key}-${n}`, title: data.title, status: data.status || 'todo', assignee: data.assignee || '', priority: data.priority || 'medium', due: data.due || '', createdAt: Date.now() };
    onUpdate({ items: [...items, it] });
    setShowNew(false);
  };
  const setItemStatus = (id, status) => onUpdate({ items: items.map(i => i.id === id ? { ...i, status } : i) });
  const delItem = (id) => onUpdate({ items: items.filter(i => i.id !== id) });

  const stColor = s => (SPACE_STATUSES.find(x => x.id === s) || SPACE_STATUSES[0]).color;
  const stLabel = s => (SPACE_STATUSES.find(x => x.id === s) || SPACE_STATUSES[0]).label;
  const prioColor = p => p === 'high' ? '#F87171' : p === 'medium' ? '#FBBF24' : '#3B9EFF';

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto' }}>
      {/* Header */}
      <button onClick={onBack} style={{ background: 'none', border: 'none', color: c.mut, cursor: 'pointer', fontSize: 13, marginBottom: 12, padding: 0 }}>← All spaces</button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: (space.color || '#0070F3') + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{space.icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: c.text, margin: 0, letterSpacing: '-.02em' }}>{space.name}</h1>
          <div style={{ fontSize: 12, color: c.mut }}>{items.length} work items · {(space.members || []).length + 1} members</div>
        </div>
        <Btn onClick={() => setShowNew(true)}>＋ Create work item</Btn>
        <button onClick={onDelete} style={{ width: 38, height: 38, borderRadius: 10, border: '1px solid rgba(239,68,68,.2)', background: 'rgba(239,68,68,.06)', color: '#F87171', cursor: 'pointer', fontSize: 15 }}>🗑</button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, borderBottom: `1px solid ${c.bord}`, marginBottom: 22, overflowX: 'auto' }}>
        {TABS.map(t => {
          const on = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 14px', border: 'none', borderBottom: `2px solid ${on ? c.accent : 'transparent'}`, background: 'transparent', color: on ? c.text : c.mut, fontSize: 13.5, fontWeight: on ? 700 : 500, cursor: 'pointer', whiteSpace: 'nowrap', marginBottom: -1 }}>
              <span style={{ fontSize: 14 }}>{t.icon}</span>{t.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {tab === 'summary' && <SpaceSummary space={space} items={items} stColor={stColor} stLabel={stLabel}/>}

      {tab === 'board' && (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${SPACE_STATUSES.length},1fr)`, gap: 12, alignItems: 'flex-start' }}>
          {SPACE_STATUSES.map(st => {
            const col = items.filter(i => i.status === st.id);
            return (
              <div key={st.id} style={{ background: c.surf, border: `1px solid ${c.bord}`, borderRadius: 14, padding: 12, minHeight: 120 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12, padding: '0 4px' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: st.color }}/>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: c.text }}>{st.label}</span>
                  <span style={{ fontSize: 11, color: c.mut }}>{col.length}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {col.map(it => (
                    <div key={it.id} style={{ background: dark ? 'rgba(255,255,255,.03)' : '#fff', border: `1px solid ${c.bord}`, borderRadius: 10, padding: '10px 12px' }}>
                      <div style={{ fontSize: 13, color: c.text, fontWeight: 500, marginBottom: 8, lineHeight: 1.4 }}>{it.title}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: prioColor(it.priority) }}/>
                        <span style={{ fontSize: 11, fontWeight: 700, color: c.mut }}>{it.key}</span>
                        <div style={{ flex: 1 }}/>
                        <select value={it.status} onChange={e => setItemStatus(it.id, e.target.value)} style={{ fontSize: 10, background: 'transparent', border: `1px solid ${c.bord}`, borderRadius: 6, color: c.sub, padding: '2px 4px', cursor: 'pointer' }}>
                          {SPACE_STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                        </select>
                        <button onClick={() => delItem(it.id)} style={{ background: 'none', border: 'none', color: c.mut, cursor: 'pointer', fontSize: 12 }}>×</button>
                      </div>
                    </div>
                  ))}
                  {col.length === 0 && <div style={{ fontSize: 11, color: c.mut, textAlign: 'center', padding: '16px 0' }}>—</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'list' && (
        <div style={{ background: c.surf, border: `1px solid ${c.bord}`, borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr 130px 110px 90px 40px', gap: 12, padding: '11px 16px', borderBottom: `1px solid ${c.bord}`, fontSize: 11, fontWeight: 700, color: c.mut, textTransform: 'uppercase', letterSpacing: '.06em' }}>
            <span>Key</span><span>Summary</span><span>Status</span><span>Assignee</span><span>Priority</span><span></span>
          </div>
          {items.length === 0 ? <div style={{ padding: '32px', textAlign: 'center', fontSize: 13, color: c.mut }}>No work items yet.</div> : items.map(it => (
            <div key={it.id} style={{ display: 'grid', gridTemplateColumns: '70px 1fr 130px 110px 90px 40px', gap: 12, padding: '11px 16px', borderBottom: `1px solid ${c.bord}`, alignItems: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: c.accent }}>{it.key}</span>
              <span style={{ fontSize: 13, color: c.text }}>{it.title}</span>
              <select value={it.status} onChange={e => setItemStatus(it.id, e.target.value)} style={{ fontSize: 11, background: stColor(it.status) + '1f', border: 'none', borderRadius: 6, color: stColor(it.status), padding: '4px 6px', cursor: 'pointer', fontWeight: 700 }}>
                {SPACE_STATUSES.map(s => <option key={s.id} value={s.id} style={{ background: c.surf, color: c.text }}>{s.label}</option>)}
              </select>
              <span style={{ fontSize: 12, color: c.sub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(it.assignee || '—').split('@')[0]}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: prioColor(it.priority), textTransform: 'capitalize' }}>{it.priority}</span>
              <button onClick={() => delItem(it.id)} style={{ background: 'none', border: 'none', color: c.mut, cursor: 'pointer', fontSize: 13 }}>×</button>
            </div>
          ))}
        </div>
      )}

      {tab === 'calendar' && <SpaceCalendar items={items} stColor={stColor}/>}

      {tab === 'timeline' && (
        <div style={{ background: c.surf, border: `1px solid ${c.bord}`, borderRadius: 14, padding: 20 }}>
          {items.length === 0 ? <div style={{ textAlign: 'center', fontSize: 13, color: c.mut, padding: 24 }}>Add work items to see them on the timeline.</div> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {items.map((it, i) => (
                <div key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: c.accent, width: 54, flexShrink: 0 }}>{it.key}</span>
                  <span style={{ fontSize: 12, color: c.text, width: 160, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.title}</span>
                  <div style={{ flex: 1, height: 22, background: c.row, borderRadius: 6, position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', left: `${(i % 4) * 12}%`, width: `${30 + (i % 3) * 18}%`, top: 3, bottom: 3, borderRadius: 5, background: stColor(it.status) + 'cc' }}/>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'agile' && <SpaceAgile space={space} onUpdate={onUpdate}/>}
      {tab === 'report' && <SpaceClientReport space={space} onUpdate={onUpdate}/>}
      {tab === 'docs' && <SpaceDocs space={space} onUpdate={onUpdate}/>}

      {showNew && <NewWorkItemModal space={space} members={members} myEmail={myEmail} onClose={() => setShowNew(false)} onAdd={addItem}/>}
    </div>
  );
}

function SpaceSummary({ space, items, stColor, stLabel }) {
  const c = useC();
  const done = items.filter(i => i.status === 'done').length;
  const created7 = items.filter(i => i.createdAt && (Date.now() - i.createdAt) < 7 * 864e5).length;
  const dueSoon = items.filter(i => i.status !== 'done' && i.due).length;
  const cards = [
    { label: 'completed', value: done, sub: 'total done', icon: '✅' },
    { label: 'created', value: created7, sub: 'in the last 7 days', icon: '🆕' },
    { label: 'open', value: items.filter(i => i.status !== 'done').length, sub: 'in progress', icon: '⚡' },
    { label: 'due soon', value: dueSoon, sub: 'have a due date', icon: '📅' },
  ];
  const byStatus = SPACE_STATUSES.map(s => ({ ...s, n: items.filter(i => i.status === s.id).length }));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {(() => {
        const h = computeHealth(space);
        return (
          <div style={{ borderRadius: 16, background: c.surf, border: `1px solid ${c.bord}`, padding: '20px 22px', display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 200 }}>
              <HealthRing score={h.score} color={h.color} size={76}/>
              <div>
                <div style={{ fontSize: 11, color: c.mut, textTransform: 'uppercase', letterSpacing: '.05em' }}>Project health</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: h.color }}>{h.label}</div>
                <div style={{ fontSize: 12, color: c.mut, marginTop: 2 }}>{h.score}/100 · {h.pct}% complete</div>
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 240 }}>
              <div style={{ fontSize: 11, color: c.mut, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>What's affecting the score</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {h.factors.slice(0, 5).map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5 }}>
                    <span style={{ width: 46, textAlign: 'right', fontWeight: 700, color: f.impact < 0 ? '#DC2626' : f.impact > 0 ? '#16A34A' : c.mut }}>{f.impact > 0 ? '+' : ''}{f.impact || '·'}</span>
                    <span style={{ fontWeight: 600, color: c.text }}>{f.label}</span>
                    <span style={{ color: c.mut }}>— {f.detail}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        {cards.map(cd => (
          <div key={cd.label} style={{ padding: '16px 18px', borderRadius: 14, background: c.surf, border: `1px solid ${c.bord}` }}>
            <div style={{ fontSize: 20, marginBottom: 6 }}>{cd.icon}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: c.text }}>{cd.value}</div>
            <div style={{ fontSize: 11, color: c.mut, marginTop: 2 }}>{cd.sub}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ padding: 20, borderRadius: 14, background: c.surf, border: `1px solid ${c.bord}` }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: c.text, marginBottom: 16 }}>Status overview</div>
          {items.length === 0 ? <div style={{ fontSize: 13, color: c.mut, padding: '8px 0' }}>The status overview will display here after you create some work items.</div> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {byStatus.map(s => (
                <div key={s.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}><span style={{ fontSize: 12.5, color: c.sub }}>{s.label}</span><span style={{ fontSize: 12.5, fontWeight: 700, color: c.text }}>{s.n}</span></div>
                  <div style={{ height: 7, borderRadius: 4, background: c.row, overflow: 'hidden' }}><div style={{ height: '100%', width: `${items.length ? (s.n / items.length) * 100 : 0}%`, background: s.color, borderRadius: 4 }}/></div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ padding: 20, borderRadius: 14, background: c.surf, border: `1px solid ${c.bord}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 180 }}>
          {items.length === 0 ? (
            <>
              <div style={{ fontSize: 32, marginBottom: 10 }}>📊</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: c.text, marginBottom: 4 }}>No activity yet</div>
              <div style={{ fontSize: 12.5, color: c.mut, textAlign: 'center', lineHeight: 1.5 }}>Create work items and invite teammates to see space activity.</div>
            </>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 40, fontWeight: 800, color: c.text }}>{items.length}</div>
              <div style={{ fontSize: 12, color: c.mut }}>total work items</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SpaceCalendar({ items, stColor }) {
  const c = useC();
  const now = new Date();
  const [month] = useState(now.getMonth());
  const [year] = useState(now.getFullYear());
  const first = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const cells = [...Array(first).fill(null), ...Array(days).fill(0).map((_, i) => i + 1)];
  const itemsOn = (d) => items.filter(i => i.due && new Date(i.due).getDate() === d && new Date(i.due).getMonth() === month);
  return (
    <div style={{ background: c.surf, border: `1px solid ${c.bord}`, borderRadius: 14, padding: 18 }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: c.text, marginBottom: 14 }}>{now.toLocaleString('en-US', { month: 'long', year: 'numeric' })}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d} style={{ fontSize: 10, fontWeight: 700, color: c.mut, textAlign: 'center', padding: 4 }}>{d}</div>)}
        {cells.map((d, i) => (
          <div key={i} style={{ minHeight: 64, borderRadius: 8, border: d ? `1px solid ${c.bord}` : 'none', padding: 5, background: d === now.getDate() ? (c.dark ? 'rgba(0,112,243,.1)' : 'rgba(0,112,243,.06)') : 'transparent' }}>
            {d && <div style={{ fontSize: 11, color: c.sub, marginBottom: 3 }}>{d}</div>}
            {d && itemsOn(d).slice(0, 2).map(it => <div key={it.id} style={{ fontSize: 9, padding: '1px 4px', borderRadius: 3, background: stColor(it.status) + '33', color: stColor(it.status), marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.key}</div>)}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── CLIENT PROJECT REPORT (Excel/CSV upload + analysis) ──────────────────────
// Parses a CSV natively (zero deps) and .xlsx via SheetJS loaded from CDN at
// parse time (graceful: if blocked, asks for CSV). Rows: Item, Owner, Status,
// Approval, Pipeline Stage, Target Date, % Done, Priority, Notes.
function parseCSV(text) {
  const rows = [];
  let cur = [], val = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { val += '"'; i++; }
      else if (ch === '"') q = false;
      else val += ch;
    } else {
      if (ch === '"') q = true;
      else if (ch === ',') { cur.push(val); val = ''; }
      else if (ch === '\n' || ch === '\r') { if (val !== '' || cur.length) { cur.push(val); rows.push(cur); cur = []; val = ''; } if (ch === '\r' && text[i + 1] === '\n') i++; }
      else val += ch;
    }
  }
  if (val !== '' || cur.length) { cur.push(val); rows.push(cur); }
  return rows;
}

const norm = (s) => (s || '').toString().trim().toLowerCase();

// A row set is the "unfilled template" if its only data rows are the known samples.
function isTemplateSampleRows(rows) {
  const flat = rows.flat().map(norm).join('|');
  const samples = ['homepage redesign', 'api integration', 'onboarding flow'];
  const hits = samples.filter(s => flat.includes(s)).length;
  // template has 3 sample items; if 2+ present and very few rows, treat as placeholder
  return hits >= 2;
}

// Convert a workbook into a single normalized row set (header + data rows in the
// standard Item/Owner/Status/Approval/Pipeline/Target/% /Priority/Notes shape).
// Handles multi-sheet QA reports: each meaningful sheet becomes a "SECTION" with
// its issues mapped onto the standard columns. Skips summary/recommendation and
// the unfilled Project-Tracker template.
function buildRowsFromWorkbook(XLSX, wb) {
  const STD = ['Item', 'Owner', 'Status', 'Approval', 'Pipeline Stage', 'Target Date', '% Done', 'Priority', 'Notes'];
  const out = [STD];
  let added = 0;

  // map a severity/risk word to {priority, approval, pipeline}
  const sevMap = (v) => {
    const s = norm(v);
    if (/high|critical|severe/.test(s)) return { priority: 'High', approval: 'Rejected', pipeline: 'Blocked' };
    if (/med/.test(s)) return { priority: 'Medium', approval: 'Pending', pipeline: 'Active' };
    if (/low/.test(s)) return { priority: 'Low', approval: 'Pending', pipeline: 'Active' };
    return { priority: 'Medium', approval: 'Pending', pipeline: 'Active' };
  };

  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    const r = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, defval: '' });
    if (!r || !r.length) continue;
    const lname = norm(name);

    // Skip non-itemized sheets
    if (/executive summary|recommendation|most affected|overview/.test(lname)) continue;

    const h = findHeaderRow(r);
    if (h < 0) continue;
    const head = r[h].map(norm);
    const col = (names) => head.findIndex(c => names.some(n => c.includes(n)));

    // If this is a standard project-tracker sheet (has Item + Approval columns)…
    const itemCol = col(['item', 'deliverable', 'task', 'feature']);
    const approvalCol = col(['approval', 'verdict', 'qc']);
    const sessionCol = col(['session', 'session id', 'recording', 'file']);

    if (itemCol >= 0 && approvalCol >= 0) {
      // Standard tracker — but skip if it's just the unfilled template samples
      const dataRows = r.slice(h + 1);
      if (isTemplateSampleRows(dataRows)) continue;
      // pass through using standard mapping
      const ownerCol = col(['owner', 'assignee', 'speaker']);
      const statusCol = col(['status']);
      const pipeCol = col(['pipeline', 'stage']);
      const targetCol = col(['target', 'due', 'date']);
      const pctCol = col(['% done', 'percent', 'progress']);
      const prioCol = col(['priority']);
      const notesCol = col(['notes', 'comment', 'remark']);
      out.push(['── SECTION: ' + name + ' ──', '', '', '', '', '', '', '', '']);
      dataRows.forEach(row => {
        const item = (row[itemCol] || '').toString().trim();
        if (!item || /^[—\-–\s]+$/.test(item)) return;
        out.push([item, ownerCol >= 0 ? row[ownerCol] : '', statusCol >= 0 ? row[statusCol] : '', row[approvalCol] || '', pipeCol >= 0 ? row[pipeCol] : '', targetCol >= 0 ? row[targetCol] : '', pctCol >= 0 ? row[pctCol] : '', prioCol >= 0 ? row[prioCol] : '', notesCol >= 0 ? row[notesCol] : '']);
        added++;
      });
      continue;
    }

    // Issue-style sheet (Session ID + Issue/Severity/Risk) — map to standard rows
    if (sessionCol >= 0) {
      const speakerCol = col(['speaker']);
      const issueCol = col(['issue type', 'issue category', 'issue', 'category']);
      const sevCol = col(['severity', 'risk']);
      const descCol = col(['description', 'detail']);
      const actCol = col(['action required', 'action', 'notes']);
      const tsCol = col(['timestamp', 'time']);
      out.push(['── SECTION: ' + name + ' ──', '', '', '', '', '', '', '', '']);
      r.slice(h + 1).forEach(row => {
        const sess = (row[sessionCol] || '').toString().trim();
        if (!sess || /^[⚠—\-–\s]/.test(sess) || norm(sess) === 'session id') return;
        const sev = sevCol >= 0 ? row[sevCol] : '';
        const m = sevMap(sev);
        const issue = issueCol >= 0 ? (row[issueCol] || '').toString().trim() : '';
        const desc = descCol >= 0 ? (row[descCol] || '').toString().trim() : '';
        const act = actCol >= 0 ? (row[actCol] || '').toString().trim() : '';
        const speaker = speakerCol >= 0 ? (row[speakerCol] || '').toString().trim() : '';
        const ts = tsCol >= 0 ? (row[tsCol] || '').toString().trim() : '';
        const notes = [issue && ('Issue: ' + issue), desc, act && ('Action: ' + act), ts && ts !== '–' && ('@ ' + ts)].filter(Boolean).join(' · ');
        out.push([sess, speaker, 'Action Required', m.approval, m.pipeline, '', '0', m.priority, notes]);
        added++;
      });
    }
  }

  return added > 0 ? out : null;
}
// Find the header row: scan up to 15 rows for any recognizable report column.
function findHeaderRow(rows) {
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const cells = (rows[i] || []).map(norm);
    const filled = cells.filter(c => c).length;
    if (filled < 2) continue; // title rows have a single populated cell
    const isHeaderCell = (c) => /^(item|deliverable|task|feature|work item|name|session id|session|owner|assignee|speaker|speaker\(s\)|status|approval|verdict|qc|severity|risk|issue type|issue category|issue|category|pipeline stage|stage|priority|description|notes|action required|action|target date|target|due date|timestamp)$/.test(c) || /session id/.test(c) || /speaker/.test(c);
    const headerHits = cells.filter(isHeaderCell).length;
    if (headerHits >= 2) return i;
  }
  return -1;
}
function rowsToItems(rows) {
  if (!rows || rows.length < 2) return [];
  let h = findHeaderRow(rows);
  if (h < 0) h = 0; // assume first row is the header if nothing recognizable
  const head = rows[h].map(norm);
  const idx = (names) => head.findIndex(c => names.some(n => c.includes(n)));
  // The "item" column accepts many synonyms; if none match, use the first column.
  let itemIdx = idx(['item','deliverable','task','session','feature','work item','name']);
  if (itemIdx < 0) itemIdx = 0;
  const ci = { item: itemIdx, owner: idx(['owner','assignee','speaker']), status: idx(['status']), approval: idx(['approval','verdict','qc']), pipeline: idx(['pipeline','stage']), target: idx(['target','due','date']), pct: idx(['% done','percent','progress','%']), priority: idx(['priority']), notes: idx(['notes','comment','remark','issue']) };
  const out = [];
  for (let r = h + 1; r < rows.length; r++) {
    const row = rows[r]; if (!row || !row.length) continue;
    const get = (k) => ci[k] >= 0 ? (row[ci[k]] || '').toString().trim() : '';
    const item = get('item'); if (!item) continue;
    // Skip section-divider rows like "── SECTION A: ... ──"
    if (/^[—\-–\s]*section\b/i.test(item) || /^[—\-–\s]+$/.test(item)) continue;
    let pct = parseFloat(get('pct')); if (isNaN(pct)) pct = 0; if (pct <= 1 && pct > 0 && get('pct').includes('.')) pct = Math.round(pct * 100);
    out.push({ item, owner: get('owner'), status: get('status') || 'Not Started', approval: get('approval') || 'Pending', pipeline: get('pipeline') || 'Backlog', target: get('target'), pct: Math.max(0, Math.min(100, Math.round(pct))), priority: get('priority') || 'Medium', notes: get('notes') });
  }
  return out;
}

// Build a clean summary + bottlenecks from raw rows. Detects "SECTION" dividers
// to group, and otherwise classifies by approval/status. Capped output.
function summarizeReport(rows) {
  if (!rows || rows.length < 2) return null;
  let h = findHeaderRow(rows);
  if (h < 0) h = 0;
  const head = rows[h].map(norm);
  const idx = (names) => head.findIndex(c => names.some(n => c.includes(n)));
  let itemIdx = idx(['item','deliverable','task','session','feature','work item','name']);
  if (itemIdx < 0) itemIdx = 0;
  const ci = { item: itemIdx, owner: idx(['owner','assignee','speaker']), status: idx(['status']), approval: idx(['approval','verdict','qc']), pipeline: idx(['pipeline','stage']), target: idx(['target','due','date']), pct: idx(['% done','percent','progress','%']) };
  const get = (row, k) => ci[k] >= 0 ? (row[ci[k]] || '').toString().trim() : '';

  let section = 'General';
  const sections = {}; // name -> {count, approved, rejected, pending, done, blocked}
  const all = [];
  for (let r = h + 1; r < rows.length; r++) {
    const row = rows[r]; if (!row || !row.length) continue;
    const item = get(row, 'item'); if (!item) continue;
    const secM = item.match(/section\s+[a-z]?\s*:?\s*(.+?)\s*[—\-–(]*$/i);
    if (/^[—\-–\s]*section\b/i.test(item)) { section = (secM && secM[1] ? secM[1] : item).replace(/[—\-–(]+.*$/, '').replace(/[()]/g,'').trim() || 'Section'; sections[section] = { name: section, count: 0, approved: 0, rejected: 0, pending: 0, done: 0, blocked: 0 }; continue; }
    if (/^[—\-–\s]+$/.test(item)) continue;
    const ap = norm(get(row, 'approval')), st = norm(get(row, 'status')), pl = norm(get(row, 'pipeline'));
    const rec = { item, owner: get(row, 'owner'), approval: get(row, 'approval'), status: get(row, 'status'), pipeline: get(row, 'pipeline'), target: get(row, 'target'), section };
    all.push(rec);
    if (!sections[section]) sections[section] = { name: section, count: 0, approved: 0, rejected: 0, pending: 0, done: 0, blocked: 0 };
    const s = sections[section]; s.count++;
    if (ap === 'approved') s.approved++;
    if (ap === 'rejected') s.rejected++;
    if (ap === 'pending') s.pending++;
    if (st === 'done' || pl === 'delivered' || pl === 'completed') s.done++;
    if (pl === 'blocked' || st.includes('action required')) s.blocked++;
  }

  const totals = Object.values(sections).reduce((a, s) => ({ count: a.count + s.count, approved: a.approved + s.approved, rejected: a.rejected + s.rejected, pending: a.pending + s.pending, done: a.done + s.done, blocked: a.blocked + s.blocked }), { count: 0, approved: 0, rejected: 0, pending: 0, done: 0, blocked: 0 });

  // Bottlenecks: rows that are rejected / blocked / action-required / overdue — capped 20
  const isBottleneck = (r) => { const ap = norm(r.approval), st = norm(r.status), pl = norm(r.pipeline); return ap === 'rejected' || pl === 'blocked' || st.includes('action required') || st.includes('high risk') || (r.target && !isNaN(Date.parse(r.target)) && new Date(r.target) < new Date() && ap !== 'approved' && st !== 'done'); };
  const bottlenecks = all.filter(isBottleneck).slice(0, 20);

  // Wins: approved / done — a few highlights
  const wins = all.filter(r => norm(r.approval) === 'approved' || norm(r.status) === 'done').slice(0, 8);

  const sectionList = Object.values(sections).filter(s => s.count > 0).sort((a, b) => b.count - a.count);
  return { sections: sectionList, totals, bottlenecks, wins, totalRows: all.length };
}


// Classify a row as good / focus / neutral (shared with Home summary)
function classifyReportRow(row) {
  const ap = norm(row.approval), st = norm(row.status);
  const overdue = row.target && !isNaN(Date.parse(row.target)) && new Date(row.target) < new Date() && st !== 'done';
  if (ap === 'rejected' || overdue) return 'focus';
  if (ap === 'approved' || st === 'done') return 'good';
  if (st === 'in review' && ap === 'pending') return 'good';
  return 'neutral';
}

// ─── AGILE: Scrum / Kanban boards + auto targets ──────────────────────────────
// Auto-built from the space's work items AND uploaded client-report rows. No
// manual board setup — it derives columns and cards from existing data.
function agileItems(space) {
  const out = [];
  (space.items || []).forEach(it => out.push({
    id: it.id, title: it.title, status: it.status || 'todo', priority: it.priority || 'medium',
    due: it.due || '', pct: it.status === 'done' ? 100 : 0, source: 'task', owner: it.assignee || '',
  }));
  // From a client report, only surface ACTIONABLE rows on the board (bottlenecks
  // + in-progress/review), not every row — large reports have hundreds of records.
  const rep = space.report;
  if (rep) {
    const rows = (rep.summary && rep.summary.bottlenecks && rep.summary.bottlenecks.length)
      ? rep.summary.bottlenecks
      : (Array.isArray(rep.items) ? rep.items : []);
    rows
      .filter(r => r && r.item && !/^[—\-–\s]*section\b/i.test(r.item) && !/^[—\-–\s]+$/.test(r.item))
      .slice(0, 40)
      .forEach((r, i) => {
        const st = (r.status || '').toLowerCase();
        const ap = (r.approval || '').toLowerCase();
        const pl = (r.pipeline || '').toLowerCase();
        let status = 'todo';
        if (st === 'done' || ap === 'approved' || pl === 'delivered') status = 'done';
        else if (st.includes('review') || ap === 'pending') status = 'review';
        else if (st === 'in progress') status = 'inprog';
        const priority = (ap === 'rejected' || pl === 'blocked' || st.includes('action')) ? 'high' : 'medium';
        out.push({ id: 'r' + i, title: r.item, status, priority, due: r.target || '', pct: r.pct || 0, source: 'report', owner: r.owner || '', approval: r.approval, pipeline: r.pipeline });
      });
  }
  return out;
}

// Map to scrum columns: Backlog → To Do → In Progress → In Review → Done
const SCRUM_COLS = [
  { id: 'backlog', label: 'Backlog', match: ['todo'], filt: (i) => i.status === 'todo' && i.pct === 0, color: '#64748B' },
  { id: 'todo', label: 'Sprint To Do', match: ['todo'], filt: (i) => i.status === 'todo' && i.pct > 0, color: '#0070F3' },
  { id: 'inprog', label: 'In Progress', filt: (i) => i.status === 'inprog', color: '#2563EB' },
  { id: 'review', label: 'In Review', filt: (i) => i.status === 'review', color: '#D97706' },
  { id: 'done', label: 'Done', filt: (i) => i.status === 'done', color: '#16A34A' },
];
// Kanban: continuous flow with WIP limits
const KANBAN_COLS = [
  { id: 'todo', label: 'To Do', filt: (i) => i.status === 'todo', color: '#64748B', wip: 0 },
  { id: 'inprog', label: 'Doing', filt: (i) => i.status === 'inprog', color: '#2563EB', wip: 3 },
  { id: 'review', label: 'Review', filt: (i) => i.status === 'review', color: '#D97706', wip: 2 },
  { id: 'done', label: 'Done', filt: (i) => i.status === 'done', color: '#16A34A', wip: 0 },
];

function deriveTargets(items) {
  const open = items.filter(i => i.status !== 'done');
  const today = new Date(); const in7 = new Date(Date.now() + 7 * 864e5); const in30 = new Date(Date.now() + 30 * 864e5);
  const dueBy = (d) => open.filter(i => i.due && !isNaN(Date.parse(i.due)) && new Date(i.due) <= d);
  const overdue = open.filter(i => i.due && !isNaN(Date.parse(i.due)) && new Date(i.due) < today);
  const review = items.filter(i => i.status === 'review');
  const inprog = items.filter(i => i.status === 'inprog');
  const daily = [];
  if (overdue.length) daily.push(`Clear ${overdue.length} overdue item${overdue.length > 1 ? 's' : ''} first: ${overdue.slice(0, 2).map(i => i.title).join(', ')}${overdue.length > 2 ? '…' : ''}`);
  if (review.length) daily.push(`Push ${review.length} in-review item${review.length > 1 ? 's' : ''} to done (get sign-off)`);
  if (inprog.length) daily.push(`Advance ${Math.min(inprog.length, 2)} in-progress item${inprog.length > 1 ? 's' : ''} today`);
  if (daily.length === 0) daily.push('No urgent items — pull the top backlog item into progress.');
  const weekly = [];
  const dueWeek = dueBy(in7);
  if (dueWeek.length) weekly.push(`Deliver ${dueWeek.length} item${dueWeek.length > 1 ? 's' : ''} due this week`);
  weekly.push(`Move sprint completion toward 80%+ (currently ${items.length ? Math.round(items.filter(i => i.status === 'done').length / items.length * 100) : 0}%)`);
  if (review.length) weekly.push('Resolve all pending client approvals');
  const monthly = [];
  const dueMonth = dueBy(in30);
  if (dueMonth.length) monthly.push(`Complete ${dueMonth.length} item${dueMonth.length > 1 ? 's' : ''} due within 30 days`);
  monthly.push('Keep rejection rate at 0 — review acceptance criteria before submitting');
  monthly.push('Close out the backlog or re-prioritize stale items');
  return { daily, weekly, monthly };
}

function SpaceAgile({ space, onUpdate }) {
  const c = useC();
  const { dark } = useTheme();
  const [mode, setMode] = useState('scrum');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiTargets, setAiTargets] = useState(space.aiTargets || null);
  const items = agileItems(space);
  const cols = mode === 'scrum' ? SCRUM_COLS : KANBAN_COLS;
  const targets = deriveTargets(items);

  const prioColor = p => p === 'critical' ? '#EF4444' : p === 'high' ? '#F87171' : p === 'medium' ? '#FBBF24' : '#3B9EFF';

  const refineWithAI = async () => {
    setAiBusy(true);
    try {
      const summary = items.map(i => `${i.title} [${i.status}, ${i.pct}%${i.due ? ', due ' + i.due : ''}${i.approval ? ', ' + i.approval : ''}]`).join('; ');
      const prompt = `You are a scrum master following agile SOP. Project "${space.name}" has these work items: ${summary || 'none'}. Today is ${new Date().toDateString()}. Produce concrete targets in JSON exactly like {"daily":["..."],"weekly":["..."],"monthly":["..."]} with 2-3 short, actionable bullets each, prioritizing overdue items, client approvals, and sprint flow. Return ONLY the JSON.`;
      const res = await askAI(prompt, { teamName: space.name });
      const txt = typeof res === 'string' ? res : (res?.text || '');
      const m = txt.match(/\{[\s\S]*\}/);
      if (m) { const parsed = JSON.parse(m[0]); setAiTargets(parsed); onUpdate({ aiTargets: parsed }); }
      else setAiTargets({ daily: [txt.slice(0, 200)], weekly: [], monthly: [] });
    } catch (e) {
      setAiTargets(null);
    }
    setAiBusy(false);
  };

  const shown = aiTargets || targets;

  return (
    <div>
      {/* Mode toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'inline-flex', background: c.row, borderRadius: 10, padding: 3 }}>
          {[['scrum', '🏃 Scrum'], ['kanban', '📋 Kanban']].map(([id, l]) => (
            <button key={id} onClick={() => setMode(id)} style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: mode === id ? (dark ? '#1E2536' : '#fff') : 'transparent', color: mode === id ? c.text : c.mut, fontWeight: mode === id ? 700 : 500, fontSize: 13, cursor: 'pointer', boxShadow: mode === id ? '0 1px 3px rgba(0,0,0,.1)' : 'none' }}>{l}</button>
          ))}
        </div>
        <div style={{ fontSize: 12.5, color: c.mut }}>
          {mode === 'scrum' ? 'Sprint flow — auto-built from your items & client report.' : 'Continuous flow with WIP limits.'}
        </div>
        <div style={{ flex: 1 }}/>
        <span style={{ fontSize: 12, color: c.mut }}>{items.length} items</span>
      </div>

      {items.length === 0 && (
        <div style={{ padding: '24px', borderRadius: 12, border: `1.5px dashed ${c.bord}`, fontSize: 13, color: c.mut, textAlign: 'center', marginBottom: 18 }}>
          Add work items (Board tab) or upload a client report — the Agile board fills itself automatically.
        </div>
      )}

      {/* Board */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols.length},1fr)`, gap: 12, alignItems: 'flex-start', marginBottom: 22 }}>
        {cols.map(col => {
          const list = items.filter(col.filt);
          const overWip = col.wip > 0 && list.length > col.wip;
          return (
            <div key={col.id} style={{ background: c.surf, border: `1px solid ${overWip ? '#F87171' : c.bord}`, borderRadius: 14, padding: 12, minHeight: 100 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12, padding: '0 4px' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: col.color }}/>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: c.text }}>{col.label}</span>
                <span style={{ fontSize: 11, color: overWip ? '#F87171' : c.mut, marginLeft: 'auto' }}>{list.length}{col.wip ? '/' + col.wip : ''}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {list.map(it => (
                  <div key={it.id} style={{ background: dark ? 'rgba(255,255,255,.03)' : '#fff', border: `1px solid ${c.bord}`, borderRadius: 10, padding: '9px 11px', borderLeft: `3px solid ${prioColor(it.priority)}` }}>
                    <div style={{ fontSize: 12.5, color: c.text, fontWeight: 500, marginBottom: 5, lineHeight: 1.4 }}>{it.title}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      {it.owner && <span style={{ fontSize: 10, color: c.mut }}>{it.owner}</span>}
                      {it.due && <span style={{ fontSize: 10, color: c.mut }}>· {it.due}</span>}
                      {it.source === 'report' && <span style={{ fontSize: 9, fontWeight: 700, color: '#0070F3', background: 'rgba(0,112,243,.12)', padding: '1px 5px', borderRadius: 4 }}>CLIENT</span>}
                      {it.pct > 0 && it.pct < 100 && <span style={{ fontSize: 10, color: c.mut, marginLeft: 'auto' }}>{it.pct}%</span>}
                    </div>
                  </div>
                ))}
                {list.length === 0 && <div style={{ fontSize: 11, color: c.mut, textAlign: 'center', padding: '14px 0' }}>—</div>}
              </div>
              {overWip && <div style={{ fontSize: 10, color: '#F87171', marginTop: 8, textAlign: 'center' }}>⚠ Over WIP limit</div>}
            </div>
          );
        })}
      </div>

      {/* Targets */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: c.text }}>Targets {aiTargets && <span style={{ fontSize: 11, fontWeight: 600, color: '#0070F3', background: 'rgba(0,112,243,.12)', padding: '2px 8px', borderRadius: 20, marginLeft: 6 }}>AI refined</span>}</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {aiTargets && <button onClick={() => { setAiTargets(null); onUpdate({ aiTargets: null }); }} style={{ fontSize: 12, color: c.mut, background: 'none', border: 'none', cursor: 'pointer' }}>Reset to auto</button>}
          <Btn v="ghost" onClick={refineWithAI} loading={aiBusy} style={{ fontSize: 12.5 }}>✦ Ask AI to refine</Btn>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
        {[['Daily', shown.daily, '☀️'], ['Weekly', shown.weekly, '📅'], ['Monthly', shown.monthly, '🗓️']].map(([label, list, icon]) => (
          <div key={label} style={{ borderRadius: 14, background: c.surf, border: `1px solid ${c.bord}`, padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: c.text, marginBottom: 10 }}>{icon} {label}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(list || []).map((t, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, fontSize: 12.5, color: c.sub, lineHeight: 1.5 }}>
                  <span style={{ color: '#0070F3', flexShrink: 0 }}>▸</span><span>{t}</span>
                </div>
              ))}
              {(!list || list.length === 0) && <div style={{ fontSize: 12, color: c.mut }}>—</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


function SpaceClientReport({ space, onUpdate }) {
  const c = useC();
  const { dark } = useTheme();
  const fileRef = useRef();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const report = space.report || null; // { items:[], uploadedAt, filename }
  const [showPaste, setShowPaste] = useState(false);
  const [pasteText, setPasteText] = useState('');

  const TEMPLATE_HEADERS = ['Item', 'Owner', 'Status', 'Approval', 'Pipeline Stage', 'Target Date', '% Done', 'Priority', 'Notes'];
  const TEMPLATE_SAMPLE = [
    ['Homepage redesign', 'Aarav', 'In Progress', 'Pending', 'Active', '2026-07-10', '60', 'High', 'Client wants hero refresh'],
    ['API integration', 'Meera', 'Done', 'Approved', 'Delivered', '2026-06-15', '100', 'High', 'Signed off'],
    ['Onboarding flow', 'Dev', 'In Review', 'Pending', 'Active', '2026-06-12', '90', 'Medium', 'Awaiting feedback'],
  ];
  const downloadTemplate = () => {
    const esc = (v) => /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
    const csv = [TEMPLATE_HEADERS, ...TEMPLATE_SAMPLE].map(r => r.map(esc).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'StandSync_Project_Report_Template.csv'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const importPaste = () => {
    setErr('');
    const rows = parseCSV(pasteText.trim());
    const items = rowsToItems(rows);
    const summary = summarizeReport(rows);
    if ((!summary || summary.totalRows === 0) && items.length === 0) { setErr('Could not find rows. Paste rows including the header line (Item, Owner, Status, …).'); return; }
    onUpdate({ report: { items, summary, uploadedAt: Date.now(), filename: 'Pasted data' } });
    setShowPaste(false); setPasteText('');
  };

  const handleFile = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    setErr(''); setBusy(true);
    try {
      let rows = [];
      if (/\.csv$/i.test(f.name)) {
        const text = await f.text();
        rows = parseCSV(text);
      } else if (/\.xlsx?$/i.test(f.name)) {
        const XLSX = await loadSheetJS();
        if (!XLSX) { setErr('Could not load the Excel reader. Please re-save your file as CSV and upload that.'); setBusy(false); return; }
        const buf = await f.arrayBuffer();
        const wb = XLSX.read(buf, { type: 'array' });
        // First try the workbook-aware builder (handles multi-sheet QA reports and
        // skips the unfilled template). Fall back to best-single-sheet if it finds nothing.
        const built = buildRowsFromWorkbook(XLSX, wb);
        if (built) {
          rows = built;
        } else {
          let best = null, bestScore = -1;
          for (const name of wb.SheetNames) {
            const ws = wb.Sheets[name];
            const r = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, defval: '' });
            if (!r || !r.length) continue;
            // skip the unfilled template sheet
            if (isTemplateSampleRows(r.slice(1, 6))) continue;
            let hasHeader = 0;
            for (let i = 0; i < Math.min(r.length, 12); i++) {
              const cells = (r[i] || []).map(c => (c || '').toString().trim().toLowerCase());
              if (cells.some(x => ['item','deliverable','task','session'].includes(x)) ||
                  (cells.includes('owner') && cells.includes('status')) ||
                  cells.includes('approval')) { hasHeader = 1; break; }
            }
            const score = hasHeader * 10000 + r.length;
            if (score > bestScore) { bestScore = score; best = r; }
          }
          rows = best || [];
        }
      } else { setErr('Please upload a .xlsx or .csv file.'); setBusy(false); return; }
      const items = rowsToItems(rows);
      const summary = summarizeReport(rows);
      if ((!summary || summary.totalRows === 0) && items.length === 0) { setErr('No rows found. The sheet needs a header row with an "Item" column (or Deliverable/Task/Session) plus at least one data row. Tip: download the template to see the expected columns, or re-save as CSV.'); setBusy(false); return; }
      onUpdate({ report: { items, summary, uploadedAt: Date.now(), filename: f.name } });
    } catch (e2) {
      setErr('Could not read that file: ' + (e2.message || 'unknown error') + '. Try uploading as CSV.');
    }
    setBusy(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  if (!report) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', borderRadius: 16, border: `1.5px dashed ${c.bord}`, background: c.surf }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: c.text, marginBottom: 6 }}>Upload a client project report</div>
        <div style={{ fontSize: 13.5, color: c.mut, maxWidth: 460, margin: '0 auto 18px', lineHeight: 1.6 }}>
          Fill the StandSync report template (one row per work item: status, approval, target date, % done) and upload it here as <strong>.xlsx</strong> or <strong>.csv</strong>. The analysis and Home highlights update automatically.
        </div>
        {err && <div style={{ fontSize: 12.5, color: '#F87171', marginBottom: 12 }}>{err}</div>}
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} style={{ display: 'none' }}/>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
          <Btn onClick={() => fileRef.current?.click()} loading={busy}>⬆ Upload file</Btn>
          <Btn v="ghost" onClick={() => setShowPaste(s => !s)}>📋 Paste data</Btn>
        </div>
        <div style={{ fontSize: 12.5, color: c.mut }}>
          Don't have the format? <button onClick={downloadTemplate} style={{ background: 'none', border: 'none', color: c.accent, cursor: 'pointer', fontSize: 12.5, fontWeight: 600, textDecoration: 'underline', padding: 0 }}>Download the template</button>, fill it in Excel or Google Sheets, then upload or paste it back.
        </div>
        {showPaste && (
          <div style={{ marginTop: 16, textAlign: 'left', maxWidth: 520, marginLeft: 'auto', marginRight: 'auto' }}>
            <div style={{ fontSize: 12, color: c.mut, marginBottom: 6 }}>Paste rows from your sheet (include the header line):</div>
            <textarea value={pasteText} onChange={e => setPasteText(e.target.value)} placeholder={'Item,Owner,Status,Approval,Pipeline Stage,Target Date,% Done,Priority,Notes\nHomepage,Aarav,In Progress,Pending,Active,2026-07-10,60,High,...'} style={{ width: '100%', minHeight: 120, background: c.inp, border: `1px solid ${c.inpB}`, borderRadius: 10, padding: '10px 12px', color: c.text, fontSize: 12, fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box', resize: 'vertical' }}/>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}><Btn onClick={importPaste} disabled={!pasteText.trim()}>Import pasted data</Btn></div>
          </div>
        )}
      </div>
    );
  }

  // Prefer the rolled-up summary (handles multi-section sheets); fall back to items.
  const sum = report.summary;
  const t = sum ? sum.totals : null;
  const total = t ? t.count : report.items.length;
  const approved = t ? t.approved : 0;
  const rejected = t ? t.rejected : 0;
  const pending = t ? t.pending : 0;
  const done = t ? t.done : 0;
  const blocked = t ? t.blocked : 0;
  const approvalRate = (approved + rejected) ? Math.round(approved / (approved + rejected) * 100) : 0;
  const progressPct = total ? Math.round(done / total * 100) : 0;

  const apColor = (a) => { a = norm(a); return a === 'approved' ? '#16A34A' : a === 'rejected' ? '#DC2626' : '#D97706'; };

  const cards = [
    { l: 'Delivered', v: progressPct + '%', col: '#0070F3', sub: `${done}/${total} items` },
    { l: 'Approval rate', v: approvalRate + '%', col: approvalRate >= 70 ? '#16A34A' : approvalRate >= 40 ? '#D97706' : '#DC2626', sub: `${approved} approved · ${rejected} rejected` },
    { l: 'Pending', v: pending, col: '#D97706', sub: 'awaiting decision' },
    { l: 'Blocked / action', v: blocked, col: blocked ? '#DC2626' : '#16A34A', sub: 'need attention' },
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ fontSize: 12.5, color: c.mut }}>From <strong style={{ color: c.text }}>{report.filename}</strong> · {total} items · uploaded {new Date(report.uploadedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} style={{ display: 'none' }}/>
          <button onClick={downloadTemplate} style={{ padding: '8px 12px', borderRadius: 10, border: `1px solid ${c.bord}`, background: 'transparent', color: c.sub, cursor: 'pointer', fontSize: 13 }}>⬇ Template</button>
          <Btn v="ghost" onClick={() => fileRef.current?.click()} loading={busy}>↻ Re-upload</Btn>
          <button onClick={() => onUpdate({ report: null })} style={{ padding: '8px 12px', borderRadius: 10, border: `1px solid ${c.bord}`, background: 'transparent', color: c.mut, cursor: 'pointer', fontSize: 13 }}>Clear</button>
        </div>
      </div>
      {err && <div style={{ fontSize: 12.5, color: '#F87171', marginBottom: 12 }}>{err}</div>}

      {/* Headline cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 18 }}>
        {cards.map(cd => (
          <div key={cd.l} style={{ padding: '16px 18px', borderRadius: 14, background: c.surf, border: `1px solid ${c.bord}` }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: cd.col }}>{cd.v}</div>
            <div style={{ fontSize: 12, color: c.text, fontWeight: 600, marginTop: 3 }}>{cd.l}</div>
            <div style={{ fontSize: 11, color: c.mut, marginTop: 1 }}>{cd.sub}</div>
          </div>
        ))}
      </div>

      {/* Approval breakdown */}
      {(approved + pending + rejected) > 0 && (
        <div style={{ borderRadius: 14, background: c.surf, border: `1px solid ${c.bord}`, padding: 18, marginBottom: 18 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: c.text, marginBottom: 12 }}>Approval breakdown</div>
          <div style={{ display: 'flex', height: 12, borderRadius: 6, overflow: 'hidden', marginBottom: 10, background: c.row }}>
            {approved > 0 && <div style={{ width: (approved / (approved+pending+rejected) * 100) + '%', background: '#16A34A' }}/>}
            {pending > 0 && <div style={{ width: (pending / (approved+pending+rejected) * 100) + '%', background: '#D97706' }}/>}
            {rejected > 0 && <div style={{ width: (rejected / (approved+pending+rejected) * 100) + '%', background: '#DC2626' }}/>}
          </div>
          <div style={{ display: 'flex', gap: 18, fontSize: 12, color: c.sub, flexWrap: 'wrap' }}>
            <span>🟢 Approved {approved}</span><span>🟠 Pending {pending}</span><span>🔴 Rejected {rejected}</span>
          </div>
        </div>
      )}

      {/* Section roll-up */}
      {sum && sum.sections.length > 1 && (
        <div style={{ borderRadius: 14, background: c.surf, border: `1px solid ${c.bord}`, overflow: 'hidden', marginBottom: 18 }}>
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${c.bord}`, fontSize: 13.5, fontWeight: 700, color: c.text }}>By section</div>
          {sum.sections.map((s, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.6fr 70px 90px 90px 90px', gap: 8, padding: '10px 16px', borderBottom: `1px solid ${c.bord}`, alignItems: 'center', fontSize: 12.5 }}>
              <span style={{ color: c.text, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
              <span style={{ color: c.mut }}>{s.count} items</span>
              <span style={{ color: '#16A34A' }}>{s.approved} ok</span>
              <span style={{ color: '#D97706' }}>{s.pending} pending</span>
              <span style={{ color: s.rejected || s.blocked ? '#DC2626' : c.mut }}>{s.rejected + s.blocked} stuck</span>
            </div>
          ))}
        </div>
      )}

      {/* Bottlenecks */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ borderRadius: 14, background: c.surf, border: `1px solid ${c.bord}`, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${c.bord}`, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#DC2626' }}/>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: c.text }}>Bottlenecks — needs focus</span>
            <span style={{ fontSize: 12, color: c.mut, marginLeft: 'auto' }}>{sum ? sum.bottlenecks.length : 0}</span>
          </div>
          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            {sum && sum.bottlenecks.length ? sum.bottlenecks.map((r, i) => (
              <div key={i} style={{ padding: '10px 16px', borderBottom: `1px solid ${c.bord}`, borderLeft: '3px solid #DC2626' }}>
                <div style={{ fontSize: 12.5, color: c.text, fontWeight: 500 }}>{r.item}</div>
                <div style={{ fontSize: 11, color: c.mut, marginTop: 2 }}>{r.section}{r.owner ? ' · ' + r.owner : ''} · <span style={{ color: apColor(r.approval) }}>{r.approval || r.status}</span>{r.target ? ' · ' + r.target : ''}</div>
              </div>
            )) : <div style={{ padding: '20px 16px', fontSize: 12.5, color: c.mut }}>No blockers or rejections. 🎉</div>}
          </div>
        </div>

        {/* Wins */}
        <div style={{ borderRadius: 14, background: c.surf, border: `1px solid ${c.bord}`, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${c.bord}`, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#16A34A' }}/>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: c.text }}>Doing well</span>
            <span style={{ fontSize: 12, color: c.mut, marginLeft: 'auto' }}>{sum ? sum.wins.length : 0}</span>
          </div>
          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            {sum && sum.wins.length ? sum.wins.map((r, i) => (
              <div key={i} style={{ padding: '10px 16px', borderBottom: `1px solid ${c.bord}`, borderLeft: '3px solid #16A34A' }}>
                <div style={{ fontSize: 12.5, color: c.text, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.item}</div>
                <div style={{ fontSize: 11, color: c.mut, marginTop: 2 }}>{r.section}{r.owner ? ' · ' + r.owner : ''} · <span style={{ color: '#16A34A' }}>{r.approval || r.status}</span></div>
              </div>
            )) : <div style={{ padding: '20px 16px', fontSize: 12.5, color: c.mut }}>No approved items yet.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

// Loads SheetJS once from CDN. Returns the XLSX global or null if blocked.
let _sheetJSPromise = null;
function loadSheetJS() {
  if (window.XLSX) return Promise.resolve(window.XLSX);
  if (_sheetJSPromise) return _sheetJSPromise;
  _sheetJSPromise = new Promise((resolve) => {
    try {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
      s.onload = () => resolve(window.XLSX || null);
      s.onerror = () => resolve(null);
      document.head.appendChild(s);
    } catch { resolve(null); }
  });
  return _sheetJSPromise;
}


function SpaceDocs({ space, onUpdate }) {
  const c = useC();
  const docs = space.docs || [];
  const [title, setTitle] = useState('');
  const add = () => { if (!title.trim()) return; onUpdate({ docs: [...docs, { id: 'd' + Date.now(), title: title.trim(), body: '', at: Date.now() }] }); setTitle(''); };
  const [editing, setEditing] = useState(null);
  const ed = docs.find(d => d.id === editing);
  if (ed) return (
    <div style={{ background: c.surf, border: `1px solid ${c.bord}`, borderRadius: 14, padding: 20 }}>
      <button onClick={() => setEditing(null)} style={{ background: 'none', border: 'none', color: c.mut, cursor: 'pointer', fontSize: 13, marginBottom: 14, padding: 0 }}>← All docs</button>
      <input value={ed.title} onChange={e => onUpdate({ docs: docs.map(d => d.id === ed.id ? { ...d, title: e.target.value } : d) })} style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: 24, fontWeight: 800, color: c.text, marginBottom: 14 }}/>
      <textarea value={ed.body} onChange={e => onUpdate({ docs: docs.map(d => d.id === ed.id ? { ...d, body: e.target.value } : d) })} placeholder="Write your doc…" style={{ width: '100%', minHeight: 320, background: 'transparent', border: 'none', outline: 'none', color: c.sub, fontSize: 14, lineHeight: 1.7, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}/>
    </div>
  );
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} placeholder="New doc title…" style={{ flex: 1, background: c.inp, border: `1px solid ${c.inpB}`, borderRadius: 9, padding: '9px 13px', color: c.text, fontSize: 13, outline: 'none' }}/>
        <Btn onClick={add} disabled={!title.trim()}>＋ Add doc</Btn>
      </div>
      {docs.length === 0 ? <div style={{ padding: '40px', textAlign: 'center', borderRadius: 14, border: `1.5px dashed ${c.bord}`, fontSize: 13, color: c.mut }}>No docs yet. Create one to document this project.</div> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 12 }}>
          {docs.map(d => (
            <div key={d.id} onClick={() => setEditing(d.id)} style={{ padding: '16px 18px', borderRadius: 12, background: c.surf, border: `1px solid ${c.bord}`, cursor: 'pointer' }}>
              <div style={{ fontSize: 22, marginBottom: 8 }}>📄</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: c.text, marginBottom: 4 }}>{d.title}</div>
              <div style={{ fontSize: 11, color: c.mut }}>{new Date(d.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NewWorkItemModal({ space, members, myEmail, onClose, onAdd }) {
  const c = useC();
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState('todo');
  const [priority, setPriority] = useState('medium');
  const [assignee, setAssignee] = useState(myEmail || '');
  const [due, setDue] = useState('');
  return (
    <Modal onClose={onClose} title="Create work item" width={460}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Inp value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && title.trim() && onAdd({ title, status, priority, assignee, due })} placeholder="What needs to be done?" autoFocus/>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Sel label="Status" value={status} onChange={e => setStatus(e.target.value)}>{SPACE_STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</Sel>
          <Sel label="Priority" value={priority} onChange={e => setPriority(e.target.value)}><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></Sel>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Sel label="Assignee" value={assignee} onChange={e => setAssignee(e.target.value)}><option value="">Unassigned</option>{members.map(m => <option key={m.email} value={m.email}>{m.name || m.email}</option>)}</Sel>
          <div style={{ width: '100%' }}><div style={{ fontSize: 11, fontWeight: 600, color: c.mut, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>Due date</div><input type="date" value={due} onChange={e => setDue(e.target.value)} style={{ width: '100%', background: c.inp, border: `1.5px solid ${c.inpB}`, borderRadius: 10, padding: '9px 12px', color: c.text, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}/></div>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Btn v="ghost" onClick={onClose}>Cancel</Btn>
          <Btn onClick={() => onAdd({ title, status, priority, assignee, due })} disabled={!title.trim()}>Create</Btn>
        </div>
      </div>
    </Modal>
  );
}

// ─── MEMBER SETTINGS ──────────────────────────────────────────────────────────
function MemberSettings({ session, team, myRole }) {
  const c = useC();
  const name = session?.user?.user_metadata?.name || session?.user?.email?.split('@')[0] || 'You';
  const email = session?.user?.email || '';
  const Row = ({ label, value }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: `1px solid ${c.bord}` }}>
      <span style={{ fontSize: 13, color: c.mut }}>{label}</span>
      <span style={{ fontSize: 13.5, color: c.text, fontWeight: 600 }}>{value}</span>
    </div>
  );
  return (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>
      <Card style={{ padding: '22px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg,#0070F3,#3B9EFF)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: '#fff' }}>{name.split(/[.\s]/).map(s => s[0]).slice(0, 2).join('').toUpperCase()}</div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: c.text }}>{name}</div>
            <div style={{ fontSize: 13, color: c.mut }}>{email}</div>
          </div>
        </div>
        <Row label="Role" value={myRole}/>
        <Row label="Team" value={team?.name || '—'}/>
        <Row label="Email" value={email}/>
        <div style={{ marginTop: 18, fontSize: 12.5, color: c.mut, lineHeight: 1.6 }}>
          Need to change team settings, invites, or reminders? Those are managed by your team's manager.
        </div>
      </Card>
    </div>
  );
}

// ─── NOTIFICATION PANEL ───────────────────────────────────────────────────────
// ─── ATTENDANCE & BREAK TRACKING ──────────────────────────────────────────────
// Manual logging works fully offline (localStorage). Auto-presence is wired to
// Supabase when available (presence helpers) and otherwise reflects only the
// current user's own session. Presence helpers are resolved dynamically so the
// build never fails if lib/supabase.js doesn't export them yet.
const sbFn = (name) => { try { return SB[name]; } catch { return undefined; } };
const DEFAULT_SHIFT_START = 9;   // 9 AM
const DEFAULT_SHIFT_END   = 19;  // 7 PM
// Shift config stored per team (default) + per member (override) in localStorage.
function getShiftConfig(teamId, email) {
  try {
    const team = JSON.parse(localStorage.getItem(`ss-shift-${teamId}`) || '{}');
    const def = { start: team.start ?? DEFAULT_SHIFT_START, end: team.end ?? DEFAULT_SHIFT_END, graceMin: team.graceMin ?? 15, maxBreakMin: team.maxBreakMin ?? 70 };
    if (email && team.overrides && team.overrides[email]) return { ...def, ...team.overrides[email] };
    return def;
  } catch { return { start: DEFAULT_SHIFT_START, end: DEFAULT_SHIFT_END, graceMin: 15, maxBreakMin: 70 }; }
}
function saveShiftConfig(teamId, cfg) { try { localStorage.setItem(`ss-shift-${teamId}`, JSON.stringify(cfg)); } catch {} }
function fmtHour(h) { const ap = h >= 12 ? 'PM' : 'AM'; const hh = h % 12 === 0 ? 12 : h % 12; return `${hh}${ap}`; }
const TASK_LABELS = [
  { id: 'bug', label: 'Bug', color: '#EF4444' },
  { id: 'feature', label: 'Feature', color: '#0070F3' },
  { id: 'urgent', label: 'Urgent', color: '#F59E0B' },
  { id: 'review', label: 'Review', color: '#8B5CF6' },
  { id: 'design', label: 'Design', color: '#EC4899' },
  { id: 'research', label: 'Research', color: '#06B6D4' },
  { id: 'ops', label: 'Ops', color: '#10B981' },
  { id: 'docs', label: 'Docs', color: '#64748B' },
];
const BREAK_TYPES = [
  { id: 'lunch',  label: 'Lunch',     mins: 45, icon: '🍱' },
  { id: 'short20',label: '20 min',    mins: 20, icon: '☕' },
  { id: 'short15',label: '15 min',    mins: 15, icon: '☕' },
  { id: 'short10',label: '10 min',    mins: 10, icon: '🚶' },
  { id: 'custom', label: 'Custom',    mins: 0,  icon: '⏱️' },
];

function fmtClock(ts) { return ts ? new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '—'; }
function fmtDur(ms) { const m = Math.round(ms / 60000); if (m < 60) return m + 'm'; return Math.floor(m / 60) + 'h ' + (m % 60) + 'm'; }

// Shared attendance store so the header tag + Home widget stay in sync with the panel.
function attKey(teamId) { return `ss-attendance-${teamId}-${new Date().toISOString().slice(0,10)}`; }
function readAtt(teamId) { try { return JSON.parse(localStorage.getItem(attKey(teamId)) || '{}'); } catch { return {}; } }
function writeAtt(teamId, data) { try { localStorage.setItem(attKey(teamId), JSON.stringify(data)); } catch {} }
function useAttendance(teamId, email) {
  const [log, setLog] = useState(() => readAtt(teamId));
  useEffect(() => {
    const refresh = () => setLog(readAtt(teamId));
    const t = setInterval(refresh, 20000);
    const onStorage = (e) => { if (e.key === attKey(teamId)) refresh(); };
    window.addEventListener('storage', onStorage);
    return () => { clearInterval(t); window.removeEventListener('storage', onStorage); };
  }, [teamId]);
  const rec = log[email] || {};
  const clockIn = () => { const n = { ...readAtt(teamId) }; n[email] = { ...(n[email] || {}), clockIn: Date.now(), lastSeen: Date.now() }; writeAtt(teamId, n); setLog(n); };
  const clockOut = () => { const n = { ...readAtt(teamId) }; n[email] = { ...(n[email] || {}), clockOut: Date.now() }; writeAtt(teamId, n); setLog(n); };
  const startBreak = (label, plannedMins, note) => { const n = { ...readAtt(teamId) }; const r = { ...(n[email] || {}) }; r.breaks = [...(r.breaks || []), { id: 'b' + Date.now(), label, plannedMins, note: note || '', start: Date.now(), end: null }]; n[email] = r; writeAtt(teamId, n); setLog(n); };
  const endBreak = () => { const n = { ...readAtt(teamId) }; const r = { ...(n[email] || {}) }; r.breaks = (r.breaks || []).map(b => b.end ? b : { ...b, end: Date.now(), mins: Math.round((Date.now() - b.start) / 60000) }); n[email] = r; writeAtt(teamId, n); setLog(n); };
  const activeBreak = (rec.breaks || []).find(b => !b.end);
  const status = activeBreak ? 'break' : (rec.clockIn && !rec.clockOut ? 'online' : 'offline');
  return { rec, status, activeBreak, clockIn, clockOut, startBreak, endBreak };
}

// Compact header status tag — visible to everyone, clickable to open attendance.
function AttendanceTag({ teamId, email, onClick }) {
  const c = useC();
  const { dark } = useTheme();
  const { rec, status, activeBreak, clockIn, clockOut } = useAttendance(teamId, email);
  const map = {
    online: { dot: '#34D399', label: 'Online', bg: 'rgba(52,211,153,.12)', col: '#34D399' },
    break:  { dot: '#FBBF24', label: activeBreak ? `On ${activeBreak.label}` : 'On break', bg: 'rgba(251,191,36,.12)', col: '#FBBF24' },
    offline:{ dot: '#94A3B8', label: rec.clockOut ? 'Clocked out' : 'Offline', bg: dark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.05)', col: c.mut },
  };
  const s = map[status];
  return (
    <button onClick={onClick} title="Attendance" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, height: 34, padding: '0 12px', borderRadius: 18, border: `1px solid ${c.bord}`, background: s.bg, color: s.col, cursor: 'pointer', fontSize: 12.5, fontWeight: 600, flexShrink: 0, whiteSpace: 'nowrap' }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.dot, boxShadow: status === 'online' ? `0 0 6px ${s.dot}` : 'none' }}/>
      <span className="ss-tag-label">{s.label}</span>
    </button>
  );
}

// Compact Home widget — punch in/out + quick break, links to full panel.
function AttendanceWidget({ teamId, email, shift, onOpenFull }) {
  const c = useC();
  const { dark } = useTheme();
  const { rec, status, activeBreak, clockIn, clockOut, startBreak, endBreak } = useAttendance(teamId, email);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 15000); return () => clearInterval(t); }, []);
  const totalBreak = (rec.breaks || []).reduce((s, b) => s + (b.end ? (b.mins || 0) : Math.round((now - b.start) / 60000)), 0);
  const statusMap = { online: ['#34D399', 'Online'], break: ['#FBBF24', activeBreak ? `On ${activeBreak.label}` : 'On break'], offline: ['#94A3B8', rec.clockOut ? 'Clocked out' : 'Not clocked in'] };
  const [sc, sl] = statusMap[status];
  return (
    <div style={{ borderRadius: 16, background: c.surf, border: `1px solid ${c.bord}`, padding: '18px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: sc, boxShadow: status === 'online' ? `0 0 6px ${sc}` : 'none' }}/>
          <span style={{ fontSize: 15, fontWeight: 700, color: c.text }}>{sl}</span>
        </div>
        <button onClick={onOpenFull} style={{ fontSize: 12.5, color: c.accent, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Full view →</button>
      </div>
      <div style={{ display: 'flex', gap: 18, marginBottom: 14, flexWrap: 'wrap' }}>
        <div><div style={{ fontSize: 10.5, color: c.mut, marginBottom: 2 }}>Shift</div><div style={{ fontSize: 13, fontWeight: 600, color: c.text }}>{fmtHour(shift.start)}–{fmtHour(shift.end)}</div></div>
        <div><div style={{ fontSize: 10.5, color: c.mut, marginBottom: 2 }}>In</div><div style={{ fontSize: 13, fontWeight: 600, color: c.text }}>{fmtClock(rec.clockIn)}</div></div>
        <div><div style={{ fontSize: 10.5, color: c.mut, marginBottom: 2 }}>Break</div><div style={{ fontSize: 13, fontWeight: 600, color: totalBreak > shift.maxBreakMin ? '#F87171' : c.text }}>{totalBreak}m</div></div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {!rec.clockIn && <Btn onClick={clockIn} style={{ padding: '8px 16px', fontSize: 13 }}>🟢 Clock in</Btn>}
        {rec.clockIn && !rec.clockOut && !activeBreak && <>
          <Btn v="ghost" onClick={clockOut} style={{ padding: '8px 16px', fontSize: 13 }}>🔴 Clock out</Btn>
          <button onClick={() => startBreak('15 min', 15)} style={{ padding: '8px 14px', borderRadius: 10, border: `1px solid ${c.bord}`, background: c.surf, color: c.text, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>☕ Quick break</button>
          <button onClick={onOpenFull} style={{ padding: '8px 14px', borderRadius: 10, border: `1px solid ${c.bord}`, background: c.surf, color: c.mut, cursor: 'pointer', fontSize: 13 }}>More breaks…</button>
        </>}
        {activeBreak && <Btn onClick={endBreak} style={{ padding: '8px 16px', fontSize: 13 }}>End {activeBreak.label} break</Btn>}
        {rec.clockOut && <span style={{ fontSize: 13, color: '#34D399', fontWeight: 600, alignSelf: 'center' }}>✓ Shift ended at {fmtClock(rec.clockOut)}</span>}
      </div>
    </div>
  );
}

function AttendancePanel({ team, members, session, isManager }) {
  const c = useC();
  const { dark } = useTheme();
  const teamId = team?.id || 'demo';
  const myEmail = session?.user?.email || 'me@demo';
  const dayKey = new Date().toISOString().slice(0, 10);
  const KEY = `ss-attendance-${teamId}-${dayKey}`;
  const [showShiftCfg, setShowShiftCfg] = useState(false);
  const [cfgTick, setCfgTick] = useState(0);
  const myShift = getShiftConfig(teamId, myEmail);

  // record shape: { [email]: { clockIn, clockOut, breaks:[{id,type,label,start,end,mins}], lastSeen } }
  const [log, setLog] = useState(() => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } });
  const [now, setNow] = useState(Date.now());
  const [customMin, setCustomMin] = useState('');
  const [breakNote, setBreakNote] = useState('');

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 15000); return () => clearInterval(t); }, []);

  const save = (next) => { setLog(next); try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {} };
  const myRec = log[myEmail] || {};
  const activeBreak = (myRec.breaks || []).find(b => !b.end);

  // ── Heartbeat / presence: write own lastSeen; pull team presence if backend present ──
  useEffect(() => {
    const beat = () => {
      const next = { ...log }; const r = { ...(next[myEmail] || {}) }; r.lastSeen = Date.now(); next[myEmail] = r; save(next);
      try { const up = sbFn('upsertPresence'); if (SB.IS_LIVE && up) up(teamId, myEmail, Date.now()); } catch {}
    };
    beat();
    const t = setInterval(beat, 60000);
    return () => clearInterval(t);
    // eslint-disable-next-line
  }, [KEY]);

  // Pull cross-user presence from backend when available (manager view benefits most)
  useEffect(() => {
    const getPresence = sbFn('getTeamPresence');
    if (!(SB.IS_LIVE && getPresence)) return;
    let alive = true;
    const pull = async () => {
      try { const rows = await getPresence(teamId); if (!alive || !rows) return;
        setLog(prev => { const next = { ...prev }; rows.forEach(r => { next[r.email] = { ...(next[r.email] || {}), lastSeen: new Date(r.last_seen).getTime() }; }); return next; });
      } catch {}
    };
    pull(); const t = setInterval(pull, 60000); return () => { alive = false; clearInterval(t); };
  }, [teamId]);

  // ── Actions (self) ──
  const clockIn = () => { const next = { ...log }; next[myEmail] = { ...(next[myEmail] || {}), clockIn: Date.now(), lastSeen: Date.now() }; save(next); };
  const clockOut = () => { const next = { ...log }; next[myEmail] = { ...(next[myEmail] || {}), clockOut: Date.now() }; save(next); };
  const startBreak = (bt) => {
    const mins = bt.id === 'custom' ? (parseInt(customMin) || 0) : bt.mins;
    const next = { ...log }; const r = { ...(next[myEmail] || {}) }; r.breaks = [...(r.breaks || []), { id: 'b' + Date.now(), type: bt.id, label: bt.id === 'custom' ? `${mins} min` : bt.label, plannedMins: mins, note: (breakNote||'').trim(), start: Date.now(), end: null }]; next[myEmail] = r; save(next); setCustomMin(''); setBreakNote('');
  };
  const endBreak = () => { const next = { ...log }; const r = { ...(next[myEmail] || {}) }; r.breaks = (r.breaks || []).map(b => b.end ? b : { ...b, end: Date.now(), mins: Math.round((Date.now() - b.start) / 60000) }); next[myEmail] = r; save(next); };

  const isOnline = (rec) => rec?.online !== false && rec?.lastSeen && (now - rec.lastSeen) < 70000; // explicit-offline OR not seen in 70s
  const totalBreakMins = (rec) => (rec?.breaks || []).reduce((s, b) => s + (b.end ? (b.mins || Math.round((b.end - b.start) / 60000)) : Math.round((now - b.start) / 60000)), 0);

  // ── Warnings (manager) ──
  const warningsFor = (rec, email) => {
    const sh = getShiftConfig(teamId, email);
    const w = [];
    const hour = new Date().getHours();
    const inShift = hour >= sh.start && hour < sh.end;
    // Late start: no clock-in within grace window
    if (inShift && !rec?.clockIn && hour >= sh.start) w.push({ t: 'Not clocked in', sev: 'warn' });
    else if (rec?.clockIn) { const ci = new Date(rec.clockIn); const lateBy = (ci.getHours() * 60 + ci.getMinutes()) - (sh.start * 60); if (lateBy > sh.graceMin) w.push({ t: `Late start (${fmtClock(rec.clockIn)})`, sev: 'warn' }); }
    // Over-break
    if (totalBreakMins(rec) > sh.maxBreakMin) w.push({ t: `Over break (${totalBreakMins(rec)}m)`, sev: 'danger' });
    // Active break running long
    const ab = (rec?.breaks || []).find(b => !b.end);
    if (ab && ab.plannedMins && (now - ab.start) / 60000 > ab.plannedMins + 5) w.push({ t: `Break overrun (${ab.label})`, sev: 'danger' });
    // Offline during shift
    if (inShift && rec?.clockIn && !rec?.clockOut && !isOnline(rec)) w.push({ t: `Offline since ${fmtClock(rec.lastSeen)}`, sev: 'warn' });
    return w;
  };

  // ════ SELF VIEW (members + manager's own row) ════
  const SelfCard = () => (
    <div style={{ borderRadius: 16, background: c.surf, border: `1px solid ${c.bord}`, padding: 22, marginBottom: isManager ? 24 : 0, maxWidth: isManager ? '100%' : 560 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: c.text }}>My shift today</div>
          <div style={{ fontSize: 12, color: c.mut, marginTop: 2 }}>Shift {fmtHour(myShift.start)} – {fmtHour(myShift.end)} · {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}{isManager && <button onClick={() => setShowShiftCfg(true)} style={{ marginLeft: 8, fontSize: 11, color: c.accent, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Edit shifts</button>}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {!myRec.clockIn && <Btn onClick={clockIn}>🟢 Clock in</Btn>}
          {myRec.clockIn && !myRec.clockOut && <Btn v="ghost" onClick={clockOut}>🔴 Clock out</Btn>}
          {myRec.clockOut && <span style={{ fontSize: 13, color: '#34D399', fontWeight: 600, alignSelf: 'center' }}>✓ Shift ended</span>}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 20, marginBottom: 18, flexWrap: 'wrap' }}>
        <div><div style={{ fontSize: 11, color: c.mut, marginBottom: 3 }}>Clocked in</div><div style={{ fontSize: 15, fontWeight: 700, color: c.text }}>{fmtClock(myRec.clockIn)}</div></div>
        <div><div style={{ fontSize: 11, color: c.mut, marginBottom: 3 }}>Clocked out</div><div style={{ fontSize: 15, fontWeight: 700, color: c.text }}>{fmtClock(myRec.clockOut)}</div></div>
        <div><div style={{ fontSize: 11, color: c.mut, marginBottom: 3 }}>Total break</div><div style={{ fontSize: 15, fontWeight: 700, color: totalBreakMins(myRec) > 70 ? '#F87171' : c.text }}>{totalBreakMins(myRec)}m</div></div>
      </div>

      {/* Active break banner */}
      {activeBreak ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 12, background: 'rgba(251,191,36,.1)', border: '1px solid rgba(251,191,36,.3)', marginBottom: 14 }}>
          <span style={{ fontSize: 18 }}>⏸️</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#FBBF24' }}>On {activeBreak.label} break</div>
            <div style={{ fontSize: 12, color: c.sub }}>Since {fmtClock(activeBreak.start)} · {fmtDur(now - activeBreak.start)} elapsed</div>
          </div>
          <Btn onClick={endBreak}>End break</Btn>
        </div>
      ) : myRec.clockIn && !myRec.clockOut && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: c.mut, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8 }}>Log a break</div>
          <input value={breakNote} onChange={e => setBreakNote(e.target.value)} placeholder="Optional note shown to teammates (e.g. 'back by 2pm, ping for urgent')" style={{ width: '100%', boxSizing: 'border-box', background: c.inp, border: `1px solid ${c.inpB}`, borderRadius: 9, padding: '8px 11px', color: c.text, fontSize: 12.5, outline: 'none', marginBottom: 10 }}/>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {BREAK_TYPES.filter(b => b.id !== 'custom').map(bt => (
              <button key={bt.id} onClick={() => startBreak(bt)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, border: `1px solid ${c.bord}`, background: c.surf, color: c.text, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                {bt.icon} {bt.label}
              </button>
            ))}
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <input value={customMin} onChange={e => setCustomMin(e.target.value.replace(/\D/g, ''))} placeholder="min" style={{ width: 56, background: c.inp, border: `1px solid ${c.inpB}`, borderRadius: 8, padding: '7px 9px', color: c.text, fontSize: 13, outline: 'none' }}/>
              <button onClick={() => customMin && startBreak({ id: 'custom' })} disabled={!customMin} style={{ padding: '8px 12px', borderRadius: 10, border: `1px solid ${c.bord}`, background: c.surf, color: customMin ? c.text : c.mut, cursor: customMin ? 'pointer' : 'default', fontSize: 13, fontWeight: 600 }}>⏱️ Custom</button>
            </span>
          </div>
        </div>
      )}

      {/* Break log */}
      {(myRec.breaks || []).length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: c.mut, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8 }}>Today's breaks</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {myRec.breaks.map(b => (
              <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: c.sub, padding: '6px 0' }}>
                <span>{BREAK_TYPES.find(t => t.id === b.type)?.icon || '⏱️'}</span>
                <span style={{ fontWeight: 600, color: c.text }}>{b.label}</span>
                <span>{fmtClock(b.start)} → {b.end ? fmtClock(b.end) : 'ongoing'}</span>
                {b.end && <span style={{ marginLeft: 'auto', color: (b.mins > (b.plannedMins || 999) + 5) ? '#F87171' : c.mut }}>{b.mins}m</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  if (!isManager) return <SelfCard/>;

  // ════ MANAGER VIEW: roster ════
  const roster = members.map(m => ({ m, rec: log[m.email] || {} }));
  const onlineNum = roster.filter(r => isOnline(r.rec)).length;
  const onBreakNum = roster.filter(r => (r.rec.breaks || []).some(b => !b.end)).length;
  const warnNum = roster.reduce((s, r) => s + warningsFor(r.rec, r.m.email).length, 0);

  return (
    <div>
      <SelfCard/>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 18 }}>
        {[
          { l: 'Online now', v: `${onlineNum}/${members.length}`, col: '#34D399', icon: '🟢' },
          { l: 'On break', v: onBreakNum, col: '#FBBF24', icon: '⏸️' },
          { l: 'Warnings', v: warnNum, col: warnNum ? '#F87171' : c.text, icon: '⚠️' },
          { l: 'Shift', v: `${fmtHour(myShift.start)}–${fmtHour(myShift.end)}`, col: '#3B9EFF', icon: '🕘' },
        ].map(s => (
          <div key={s.l} style={{ padding: '14px 16px', borderRadius: 14, background: c.surf, border: `1px solid ${c.bord}` }}>
            <div style={{ fontSize: 18, marginBottom: 4 }}>{s.icon}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.col }}>{s.v}</div>
            <div style={{ fontSize: 11, color: c.mut, marginTop: 2 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Backend note */}
      {!(SB.IS_LIVE) && (
        <div style={{ fontSize: 12, color: c.mut, background: 'rgba(0,112,243,.06)', border: `1px solid ${c.bord}`, borderRadius: 10, padding: '10px 14px', marginBottom: 16, lineHeight: 1.5 }}>
          ℹ️ Live online/offline across the team activates once Supabase is connected. Manual shift &amp; break logs work now and are visible per device.
        </div>
      )}

      {/* Roster */}
      <div style={{ borderRadius: 16, background: c.surf, border: `1px solid ${c.bord}`, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 90px 100px 100px 1.2fr', gap: 12, padding: '12px 18px', borderBottom: `1px solid ${c.bord}`, fontSize: 11, fontWeight: 700, color: c.mut, textTransform: 'uppercase', letterSpacing: '.06em' }}>
          <span>Member</span><span>Status</span><span>In</span><span>Break</span><span>Flags</span>
        </div>
        {roster.map(({ m, rec }) => {
          const online = isOnline(rec);
          const ab = (rec.breaks || []).find(b => !b.end);
          const w = warningsFor(rec, m.email);
          return (
            <div key={m.email} style={{ display: 'grid', gridTemplateColumns: '1.4fr 90px 100px 100px 1.2fr', gap: 12, padding: '12px 18px', borderBottom: `1px solid ${c.bord}`, alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <Av member={m} size={30} url={m.avatar_url}/>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: c.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name || m.email.split('@')[0]}</div>
                  <div style={{ fontSize: 11, color: c.mut }}>{rec.lastSeen ? 'seen ' + fmtClock(rec.lastSeen) : 'no activity'}</div>
                </div>
              </div>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: ab ? '#FBBF24' : online ? '#34D399' : c.mut }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: ab ? '#FBBF24' : online ? '#34D399' : '#64748B' }}/>
                {ab ? 'Break' : online ? 'Online' : 'Offline'}
              </span>
              <span style={{ fontSize: 12, color: c.sub }}>{fmtClock(rec.clockIn)}</span>
              <span style={{ fontSize: 12, color: totalBreakMins(rec) > 70 ? '#F87171' : c.sub }}>{totalBreakMins(rec)}m</span>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {w.length === 0 ? <span style={{ fontSize: 11, color: '#34D399' }}>✓ OK</span>
                  : w.map((x, i) => <span key={i} style={{ fontSize: 10.5, fontWeight: 600, padding: '2px 7px', borderRadius: 6, background: x.sev === 'danger' ? 'rgba(248,113,113,.14)' : 'rgba(251,191,36,.14)', color: x.sev === 'danger' ? '#F87171' : '#FBBF24' }}>{x.t}</span>)}
              </div>
            </div>
          );
        })}
        {roster.length === 0 && <div style={{ padding: 32, textAlign: 'center', fontSize: 13, color: c.mut }}>No team members yet.</div>}
      </div>

      {showShiftCfg && <ShiftConfigModal teamId={teamId} members={members} onClose={() => setShowShiftCfg(false)} onSaved={() => setCfgTick(t => t + 1)}/>}
    </div>
  );
}

// ─── SHIFT CONFIG MODAL (manager) ─────────────────────────────────────────────
function ShiftConfigModal({ teamId, members, onClose, onSaved }) {
  const c = useC();
  const [cfg, setCfg] = useState(() => { try { return JSON.parse(localStorage.getItem(`ss-shift-${teamId}`) || '{}'); } catch { return {}; } });
  const def = { start: cfg.start ?? DEFAULT_SHIFT_START, end: cfg.end ?? DEFAULT_SHIFT_END, graceMin: cfg.graceMin ?? 15, maxBreakMin: cfg.maxBreakMin ?? 70 };
  const overrides = cfg.overrides || {};
  const [tab, setTab] = useState('default');
  const HOURS = Array.from({ length: 24 }, (_, i) => i);

  const setDefault = (k, v) => setCfg(p => ({ ...p, [k]: v }));
  const setOverride = (email, k, v) => setCfg(p => ({ ...p, overrides: { ...(p.overrides || {}), [email]: { ...((p.overrides || {})[email] || {}), [k]: v } } }));
  const clearOverride = (email) => setCfg(p => { const o = { ...(p.overrides || {}) }; delete o[email]; return { ...p, overrides: o }; });

  const save = () => { saveShiftConfig(teamId, cfg); onSaved && onSaved(); onClose(); };

  const HourSel = ({ value, onChange }) => (
    <select value={value} onChange={e => onChange(parseInt(e.target.value))} style={{ background: c.inp, border: `1px solid ${c.inpB}`, borderRadius: 8, padding: '6px 8px', color: c.text, fontSize: 13, outline: 'none' }}>
      {HOURS.map(h => <option key={h} value={h}>{fmtHour(h)}</option>)}
    </select>
  );

  return (
    <Modal onClose={onClose} title="Shift settings" width={560}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 18, borderBottom: `1px solid ${c.bord}` }}>
        {[['default', 'Team default'], ['overrides', 'Per-member']].map(([id, l]) => (
          <button key={id} onClick={() => setTab(id)} style={{ padding: '8px 14px', border: 'none', borderBottom: `2px solid ${tab === id ? c.accent : 'transparent'}`, background: 'transparent', color: tab === id ? c.text : c.mut, fontSize: 13, fontWeight: tab === id ? 700 : 500, cursor: 'pointer', marginBottom: -1 }}>{l}</button>
        ))}
      </div>

      {tab === 'default' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: c.sub, width: 130 }}>Shift hours</span>
            <HourSel value={def.start} onChange={v => setDefault('start', v)}/>
            <span style={{ color: c.mut }}>to</span>
            <HourSel value={def.end} onChange={v => setDefault('end', v)}/>
          </div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: c.sub, width: 130 }}>Late grace (min)</span>
            <input type="number" value={def.graceMin} onChange={e => setDefault('graceMin', parseInt(e.target.value) || 0)} style={{ width: 80, background: c.inp, border: `1px solid ${c.inpB}`, borderRadius: 8, padding: '7px 10px', color: c.text, fontSize: 13, outline: 'none' }}/>
            <span style={{ fontSize: 12, color: c.mut }}>clock-in after this = "late"</span>
          </div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: c.sub, width: 130 }}>Max break (min)</span>
            <input type="number" value={def.maxBreakMin} onChange={e => setDefault('maxBreakMin', parseInt(e.target.value) || 0)} style={{ width: 80, background: c.inp, border: `1px solid ${c.inpB}`, borderRadius: 8, padding: '7px 10px', color: c.text, fontSize: 13, outline: 'none' }}/>
            <span style={{ fontSize: 12, color: c.mut }}>total breaks over this = "over break"</span>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 320, overflowY: 'auto' }}>
          {members.map(m => {
            const ov = overrides[m.email];
            const eff = { ...def, ...(ov || {}) };
            return (
              <div key={m.email} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, border: `1px solid ${c.bord}` }}>
                <Av member={m} size={28} url={m.avatar_url}/>
                <span style={{ flex: 1, fontSize: 13, color: c.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name || m.email.split('@')[0]}</span>
                <HourSel value={eff.start} onChange={v => setOverride(m.email, 'start', v)}/>
                <span style={{ color: c.mut, fontSize: 12 }}>–</span>
                <HourSel value={eff.end} onChange={v => setOverride(m.email, 'end', v)}/>
                {ov ? <button onClick={() => clearOverride(m.email)} style={{ fontSize: 11, color: c.mut, background: 'none', border: 'none', cursor: 'pointer' }}>reset</button>
                  : <span style={{ fontSize: 10, color: c.mut, width: 34 }}>default</span>}
              </div>
            );
          })}
          {members.length === 0 && <div style={{ fontSize: 13, color: c.mut, textAlign: 'center', padding: 20 }}>No members to configure.</div>}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
        <Btn v="ghost" onClick={onClose}>Cancel</Btn>
        <Btn onClick={save}>Save shifts</Btn>
      </div>
    </Modal>
  );
}

function NotificationPanel({ notifs, onClose, onAction, onMarkAllRead, onClearAll, unread, onDigest, emailBusy }) {
  const c = useC();
  const { dark } = useTheme();
  const [showAll, setShowAll] = useState(false);
  useEffect(() => {
    const h = (e) => { if (!e.target.closest?.('.ss-notif-panel') && !e.target.closest?.('[title="Notifications"]')) onClose(); };
    setTimeout(() => document.addEventListener('mousedown', h), 0);
    return () => document.removeEventListener('mousedown', h);
  }, [onClose]);
  const visible = showAll ? notifs : notifs.slice(0, 5);
  const dateLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  return (
    <div className="ss-notif-panel" style={{ position: 'absolute', top: 48, right: 0, width: 372, maxWidth: 'calc(100vw - 32px)', background: dark ? '#12182B' : '#fff', border: `1px solid ${c.bord}`, borderRadius: 16, boxShadow: '0 16px 48px rgba(0,0,0,.4)', zIndex: 500, overflow: 'hidden', animation: 'fadeUp .18s ease' }}>
      <div style={{ padding: '14px 18px', borderBottom: `1px solid ${c.bord}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: c.text }}>Notifications</div>
          <div style={{ fontSize: 11, color: c.mut, marginTop: 1 }}>{dateLabel} · {unread} unread</div>
        </div>
        {notifs.length > 0 && (
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {unread > 0 && <button onClick={onMarkAllRead} style={{ fontSize: 12, color: c.accent, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Mark all read</button>}
            <button onClick={onClearAll} style={{ fontSize: 12, color: c.mut, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Clear</button>
          </div>
        )}
      </div>
      <div style={{ maxHeight: 420, overflowY: 'auto' }}>
        {notifs.length === 0 ? (
          <div style={{ padding: '36px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>✅</div>
            <div style={{ fontSize: 14, color: c.sub, fontWeight: 600, marginBottom: 4 }}>You're all caught up</div>
            <div style={{ fontSize: 12.5, color: c.mut }}>No blockers, deadlines, or meetings today.</div>
          </div>
        ) : visible.map(n => (
          <div key={n.id} style={{ display: 'flex', gap: 12, padding: '13px 16px', borderBottom: `1px solid ${c.bord}`, position: 'relative', background: n.read ? 'transparent' : (dark ? 'rgba(129,140,248,.05)' : 'rgba(0,112,243,.03)') }}>
            {!n.read && <span style={{ position: 'absolute', left: 6, top: '50%', transform: 'translateY(-50%)', width: 6, height: 6, borderRadius: '50%', background: '#0070F3' }}/>}
            <div style={{ width: 34, height: 34, borderRadius: 10, background: n.accent + '1f', color: n.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{n.icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: n.read ? 600 : 700, color: c.text }}>{n.title}</div>
              <div style={{ fontSize: 12.5, color: c.sub, marginTop: 2, lineHeight: 1.45 }}>{n.body}</div>
              {n.action && <button onClick={() => onAction(n)} style={{ marginTop: 8, fontSize: 12, fontWeight: 600, color: '#fff', background: 'linear-gradient(135deg,#0070F3,#3B9EFF)', border: 'none', borderRadius: 8, padding: '5px 12px', cursor: 'pointer' }}>{n.action.label} →</button>}
            </div>
          </div>
        ))}
        {notifs.length > 5 && !showAll && (
          <button onClick={() => setShowAll(true)} style={{ width: '100%', padding: '11px', fontSize: 12.5, color: c.accent, background: 'none', border: 'none', borderTop: `1px solid ${c.bord}`, cursor: 'pointer', fontWeight: 600 }}>Read more ({notifs.length - 5} more) →</button>
        )}
        {showAll && notifs.length > 5 && (
          <button onClick={() => setShowAll(false)} style={{ width: '100%', padding: '11px', fontSize: 12.5, color: c.mut, background: 'none', border: 'none', borderTop: `1px solid ${c.bord}`, cursor: 'pointer', fontWeight: 600 }}>Show less ↑</button>
        )}
      </div>
      <div style={{ padding: '10px 16px', borderTop: `1px solid ${c.bord}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {onDigest
          ? <button onClick={() => { onDigest && onDigest(); }} disabled={emailBusy} style={{ fontSize: 12, color: c.accent, background: 'none', border: 'none', cursor: emailBusy ? 'wait' : 'pointer', fontWeight: 600 }}>{emailBusy ? 'Sending…' : '✉ Send team digest'}</button>
          : <span style={{ fontSize: 11, color: c.mut }}>Refreshes daily</span>}
      </div>
    </div>
  );
}

// ─── MAIL PREVIEW MODAL ───────────────────────────────────────────────────────
function MailPreviewModal({ mail, onClose }) {
  const c = useC();
  const { dark } = useTheme();
  const openEmail = () => {
    const url = 'mailto:' + encodeURIComponent(mail.to || '') + '?subject=' + encodeURIComponent(mail.subject || '') + '&body=' + encodeURIComponent(mail.body || '');
    window.open(url, '_blank');
  };
  return (
    <Modal onClose={onClose} title="" width={520}>
      <div style={{ marginTop: -8 }}>
        {/* Mail highlight header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 12, background: dark ? 'rgba(0,112,243,.1)' : 'rgba(0,112,243,.06)', border: '1px solid rgba(0,112,243,.25)', marginBottom: 16 }}>
          <div style={{ width: 40, height: 40, borderRadius: 11, background: 'linear-gradient(135deg,#0070F3,#3B9EFF)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19, flexShrink: 0 }}>📧</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: c.text }}>{mail.subject}</div>
            <div style={{ fontSize: 12, color: c.mut, marginTop: 1 }}>To: {mail.to}</div>
          </div>
        </div>
        {/* Body */}
        <div style={{ background: dark ? 'rgba(255,255,255,.03)' : '#fff', border: `1px solid ${c.bord}`, borderRadius: 12, padding: '16px 18px', fontSize: 13.5, lineHeight: 1.7, color: c.sub, whiteSpace: 'pre-wrap', maxHeight: 320, overflowY: 'auto' }}>
          {mail.body}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
          <Btn v="ghost" onClick={onClose}>Close</Btn>
          <Btn onClick={openEmail}>✉ Open in email app</Btn>
        </div>
      </div>
    </Modal>
  );
}

function ManagerView({
 session, team, tasks, members, history, standup, onStatus, onPriority, onNote, onAddTask, onDeleteTask, onBack, onSettings, onLogout, emailBusy, onDigest, onEOD, messages, onSendMessage, chatTheme, onChangeTheme, setMembers, openPip, pipOpen, isManager = true, canViewPerformance, myRole = 'member' }) {
  // Team leads see performance/insights even though they aren't full managers.
  const canPerf = canViewPerformance !== undefined ? canViewPerformance : isManager;

  const handleRemoveMember = async (member) => {
    if (!member) return;
    setMembers && setMembers(prev => prev.filter(m => (m.id || m.email) !== (member.id || member.email)));
    try {
      if (SB.IS_LIVE) {
        const rm = (typeof SB.removeMember === 'function') ? SB.removeMember : null;
        if (rm) await rm(member.id);
        else if (SB.supabase) await SB.supabase.from('team_members').delete().eq('id', member.id);
      }
    } catch (e) {}
  };

  const handleRoleChange = async (member, newRole) => {
    if (!member) return;
    setMembers && setMembers(prev => prev.map(m => (m.id || m.email) === (member.id || member.email) ? { ...m, role: newRole } : m));
    try {
      if (SB.IS_LIVE && typeof SB.updateMemberDesignation === 'function') {
        await SB.updateMemberDesignation(member.id, member.designation || '', newRole);
      }
    } catch (e) {}
  };

  const c = useC();
  const { dark } = useTheme();

  // ── New IA: 6 primary areas + Calendar + Settings ──
  // area = top-level nav; sub = sub-tab within Knowledge / Insights
  const [area, setArea] = useState('home');
  const [knowledgeSub, setKnowledgeSub] = useState('docs');   // docs | brainstorm
  const [insightsSub, setInsightsSub]   = useState('overview'); // overview | performance | history
  const [teamSub, setTeamSub]           = useState('directory'); // directory | attendance (manager only)
  const [calSub, setCalSub]             = useState('schedule');  // schedule | meetings
  const [tasksSub, setTasksSub]         = useState('board');     // board | overview | performance | ai | history
  const [search, setSearch]             = useState('');
  const [searchOpen, setSearchOpen]     = useState(false);
  const [searchCardMember, setSearchCardMember] = useState(null);
  const [mobileNav, setMobileNav] = useState(false);

  // ── Home quick-action modals ──
  const [taskModal, setTaskModal]       = useState(false);
  const [noteModal, setNoteModal]       = useState(false);
  const [standupModal, setStandupModal] = useState(false);

  // ── Notifications (daily, auto-refresh next day) ──
  const todayKey = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const [notifOpen, setNotifOpen] = useState(false);
  // read set is scoped to today; loading also clears any stale (previous-day) data
  const [readIds, setReadIds] = useState(() => {
    try {
      const raw = JSON.parse(localStorage.getItem('ss-notif-read') || '{}');
      return raw.day === todayKey ? new Set(raw.ids || []) : new Set();
    } catch { return new Set(); }
  });
  const persistRead = (set) => { try { localStorage.setItem('ss-notif-read', JSON.stringify({ day: todayKey, ids: [...set] })); } catch {} };
  const markRead = (id) => setReadIds(prev => { const n = new Set(prev); n.add(id); persistRead(n); return n; });
  const markAllRead = () => setReadIds(prev => { const n = new Set(prev); notifs.forEach(x => n.add(x.id)); persistRead(n); return n; });
  const [dismissedIds, setDismissedIds] = useState(() => {
    try { const raw = JSON.parse(localStorage.getItem('ss-notif-dismissed') || '{}'); return raw.day === todayKey ? new Set(raw.ids || []) : new Set(); } catch { return new Set(); }
  });
  const clearAllNotifs = () => setDismissedIds(prev => { const n = new Set(prev); notifs.forEach(x => n.add(x.id)); try { localStorage.setItem('ss-notif-dismissed', JSON.stringify({ day: todayKey, ids: [...n] })); } catch {} return n; });

  const notifs = useMemo(() => {
    const out = [];
    const myEmail = (session?.user?.email || '').toLowerCase();
    const ago = (ts) => { const m = Math.round((Date.now() - ts) / 60000); if (m < 1) return 'just now'; if (m < 60) return m + 'm ago'; const h = Math.floor(m / 60); if (h < 24) return h + 'h ago'; return Math.floor(h / 24) + 'd ago'; };

    // 1. Real activity events (assigned / created / started / completed / team board / space)
    readEvents(team?.id).forEach(e => {
      const mine = (e.targetEmail || '').toLowerCase() === myEmail;
      const byMe = (e.actorEmail || '').toLowerCase() === myEmail;
      let n = null;
      if (e.type === 'task_assigned' && mine && !byMe) n = { icon: '\uD83D\uDCCC', accent: '#0070F3', title: 'New task assigned to you', body: e.actor + ' assigned "' + e.title + '"', go: 'tasks' };
      else if (e.type === 'task_assigned' && !mine && isManager) n = { icon: '\uD83D\uDCCC', accent: '#3B9EFF', title: 'Task assigned', body: e.actor + ' \u2192 ' + e.target + ': "' + e.title + '"', go: 'tasks' };
      else if (e.type === 'task_created' && !byMe) n = { icon: '\uD83D\uDCDD', accent: '#38BDF8', title: e.actor + ' added a task', body: '"' + e.title + '"', go: 'tasks' };
      else if (e.type === 'task_started' && !byMe) n = { icon: '\u26A1', accent: '#38BDF8', title: e.actor + ' started a task', body: '"' + e.title + '"', go: 'tasks' };
      else if (e.type === 'task_completed' && !byMe) n = { icon: '\u2705', accent: '#34D399', title: e.actor + ' completed a task', body: '"' + e.title + '"', go: 'tasks' };
      else if (e.type === 'teamboard' && !byMe) n = { icon: '\uD83D\uDCCB', accent: '#0070F3', title: 'New on the team board', body: e.actor + ': ' + e.title, go: 'home' };
      else if (e.type === 'space_update' && !byMe) n = { icon: '\u25A6', accent: '#8B5CF6', title: 'Update in ' + (e.spaceName || 'a project space'), body: e.actor + ': ' + e.title, go: 'spaces' };
      else if (e.type === 'backlog' && (mine || isManager)) n = { icon: '\u26A0\uFE0F', accent: '#DC2626', title: mine ? 'Unfinished from ' + (e.fromDate || 'a previous day') : 'Carried-over backlog', body: '"' + e.title + '"' + (mine ? ' is still open' : ' \u2014 ' + (e.actor || 'someone')), go: 'tasks' };
      if (n) out.push({ id: e.id, at: e.at, kind: e.type, icon: n.icon, accent: n.accent, title: n.title, body: n.body + ' \u00b7 ' + ago(e.at), action: { label: 'View', go: n.go } });
    });

    // 2. New chat messages from others (live)
    try {
      (messages || []).filter(m => m.sender_email && m.sender_email.toLowerCase() !== myEmail && m.type === 'text').slice(-6).forEach(m => out.push({
        id: 'msg-' + m.id, at: m.created_at ? new Date(m.created_at).getTime() : Date.now(),
        kind: 'chat', icon: '\uD83D\uDCAC', accent: '#38BDF8',
        title: 'New message from ' + (m.sender_name || m.sender_email.split('@')[0]),
        body: (m.text || '').slice(0, 80), action: { label: 'Open chat', go: 'communication' },
      }));
    } catch {}

    // 3. One concise live "blockers need attention" summary (managers/leads)
    if (canPerf) {
      const blk = tasks.filter(t => t.status === 'blocked');
      if (blk.length) out.push({
        id: 'blk-summary-' + todayKey, at: Date.now(), kind: 'blocker', icon: '\uD83D\uDEA7', accent: '#F87171',
        title: blk.length + ' blocker' + (blk.length > 1 ? 's' : '') + ' need attention',
        body: blk.slice(0, 2).map(t => t.title || t.text).join(', ') + (blk.length > 2 ? '\u2026' : ''),
        action: { label: 'View', go: 'tasks' },
      });
    }

    // 4. Digest/EOD mail delivered to me
    try {
      const digs = JSON.parse(localStorage.getItem('ss-digests-' + (team?.id || 'demo')) || '[]');
      digs.filter(d => (d.email || '').toLowerCase() === myEmail && d.day === todayKey).forEach(d => out.push({
        id: 'mail-' + d.id, at: d.at || Date.now(), kind: 'mail', icon: '\uD83D\uDCE7', accent: '#0070F3',
        title: d.kind === 'eod' ? 'EOD summary from ' + d.from : 'Standup digest from ' + d.from,
        body: d.subject, mail: { subject: d.subject, body: d.body, to: d.to }, action: { label: 'Open email', mail: true },
      }));
    } catch {}

    return out
      .sort((a, b) => (b.at || 0) - (a.at || 0))
      .slice(0, 25)
      .filter(n => !dismissedIds.has(n.id))
      .map(n => ({ ...n, read: readIds.has(n.id) }));
  }, [tasks, messages, readIds, dismissedIds, session, todayKey, team, isManager, canPerf]);

  const unreadNotifs = notifs.filter(n => !n.read).length;
  const [presenceOpen, setPresenceOpen] = useState(false);
  const [banner, setBanner] = useState(null); // transient top banner for fresh notifs
  const bannerTimer = useRef(null);

  // Fire a desktop notification for genuinely-new items (once each), if allowed.
  const seenNotifRef = useRef(null);
  useEffect(() => {
    // First run: record what's already here, don't fire for the backlog.
    if (seenNotifRef.current === null) { seenNotifRef.current = new Set(notifs.map(n => n.id)); return; }
    const fresh = notifs.filter(n => !n.read && !seenNotifRef.current.has(n.id));
    if (fresh.length) {
      try { playChime(); } catch (e) {} // sound (respects ss-sound) — independent of desktop permission
      // In-app banner for the newest fresh item
      setBanner(fresh[0]);
      clearTimeout(bannerTimer.current);
      bannerTimer.current = setTimeout(() => setBanner(null), 6000);
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        fresh.slice(0, 3).forEach(n => {
          try { const d = new Notification(n.title, { body: n.body, tag: n.id, icon: '/favicon.ico' }); setTimeout(() => d.close(), 6000); } catch (e) {}
        });
      }
    }
    notifs.forEach(n => seenNotifRef.current.add(n.id));
  }, [notifs]);

  const [mailView, setMailView] = useState(null);
  const handleNotifAction = (n) => {
    markRead(n.id);
    if (n.action?.mail && n.mail) { setMailView(n.mail); setNotifOpen(false); return; }
    setNotifOpen(false);
    if (n.action?.go === 'standup') setStandupModal(true);
    else if (n.action?.go) goArea(n.action.go);
  };
  // Opening the bell marks everything seen (the count clears)
  const toggleNotif = () => { setNotifOpen(o => { const next = !o; if (next) setTimeout(markAllRead, 1200); return next; }); };

  const [unreadChat, setUnreadChat] = useState(0);
  const prevMsgCount = useRef(messages.length);
  useEffect(() => {
    if (messages.length > prevMsgCount.current) {
      const myEmail = session?.user?.email;
      const externalNew = messages.slice(prevMsgCount.current).filter(m => m.sender_email !== myEmail);
      if (externalNew.length) {
        try { playChime(); } catch (e) {}   // sound on every incoming message (respects ss-sound)
        if (area !== 'communication') setUnreadChat(n => n + externalNew.length);
      }
    }
    prevMsgCount.current = messages.length;
  }, [messages, area]);

  const goArea = (a) => { setArea(a); setMobileNav(false); if (a === 'communication') setUnreadChat(0); };

  // ── Navigation history (for two-finger swipe back/forward) ──
  const navHist = useRef(['home']);   // stack of visited areas
  const navIdx = useRef(0);           // current position in the stack
  const navLock = useRef(false);      // true while we're navigating via back/forward (don't re-push)
  useEffect(() => {
    if (navLock.current) { navLock.current = false; return; }
    // New navigation: drop any forward entries, push current area
    if (navHist.current[navIdx.current] !== area) {
      navHist.current = navHist.current.slice(0, navIdx.current + 1);
      navHist.current.push(area);
      navIdx.current = navHist.current.length - 1;
    }
  }, [area]);
  const goBack = () => {
    if (navIdx.current <= 0) return;
    navIdx.current -= 1; navLock.current = true;
    setArea(navHist.current[navIdx.current]); setMobileNav(false);
  };
  const goForward = () => {
    if (navIdx.current >= navHist.current.length - 1) return;
    navIdx.current += 1; navLock.current = true;
    setArea(navHist.current[navIdx.current]); setMobileNav(false);
  };

  // Two-finger horizontal swipe: right → back, left → forward.
  // Skipped while the pointer is over the Brainstorm canvas (it pans there).
  useEffect(() => {
    let accum = 0, cooldown = false, idleTimer = null;
    const overCanvas = (t) => { let el = t; while (el) { if (el.dataset && el.dataset.bsCanvas) return true; el = el.parentElement; } return false; };
    const onWheel = (e) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY) * 1.4) return; // horizontal only
      if (overCanvas(e.target)) return;
      // Stop the browser's own back/forward swipe-navigation from firing.
      if (e.cancelable) e.preventDefault();
      if (cooldown) return;
      accum += e.deltaX;
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => { accum = 0; }, 160); // reset if the gesture pauses
      if (accum < -110) { goBack(); accum = 0; cooldown = true; setTimeout(() => cooldown = false, 600); }
      else if (accum > 110) { goForward(); accum = 0; cooldown = true; setTimeout(() => cooldown = false, 600); }
    };
    window.addEventListener('wheel', onWheel, { passive: false });
    let tx = null, ty = null, fingers = 0;
    const onTS = (e) => { fingers = e.touches.length; if (fingers === 2) { tx = e.touches[0].clientX; ty = e.touches[0].clientY; } };
    const onTE = (e) => {
      if (fingers === 2 && tx !== null) {
        const dx = (e.changedTouches[0].clientX) - tx, dy = (e.changedTouches[0].clientY) - ty;
        if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.4 && !overCanvas(e.target)) {
          if (dx > 0) goBack(); else goForward();
        }
      }
      tx = ty = null; fingers = 0;
    };
    window.addEventListener('touchstart', onTS, { passive: true });
    window.addEventListener('touchend', onTE, { passive: true });
    return () => { window.removeEventListener('wheel', onWheel); window.removeEventListener('touchstart', onTS); window.removeEventListener('touchend', onTE); clearTimeout(idleTimer); };
  }, []);

  // ── Global search ──
  const NAV_TARGETS = [
    { label: 'Home', area: 'home', kw: 'home dashboard' },
    { label: 'Tasks', area: 'tasks', kw: 'tasks work board' },
    { label: 'Spaces', area: 'spaces', kw: 'spaces projects workspace' },
    { label: 'Client Report', area: 'spaces', kw: 'client report upload xlsx excel deliverables project report' },
    { label: 'Team', area: 'team', kw: 'team members people attendance' },
    { label: 'Communication', area: 'communication', kw: 'chat messages communication dm' },
    { label: 'Knowledge', area: 'knowledge', kw: 'docs knowledge wiki brainstorm notes sop' },
    { label: 'Calendar', area: 'calendar', kw: 'calendar schedule meetings' },
    { label: 'Daily Report', area: 'tasks', kw: 'daily report standup summary' },
    { label: 'Reliability Engine', area: 'tasks', kw: 'reliability commitment execution trust accountability' },
    ...(canPerf ? [{ label: 'Insights & Performance', area: 'tasks', kw: 'insights analytics performance reports leaderboard' }] : []),
  ];
  const searchResults = (() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    const out = [];
    NAV_TARGETS.filter(n => n.label.toLowerCase().includes(q) || n.kw.split(/\s+/).some(w => w.includes(q) && q.length >= 3)).forEach(n =>
      out.push({ type: 'Page', icon: '◧', label: n.label, sub: 'Go to ' + n.label, act: () => goArea(n.area) }));
    tasks.filter(t => (t.title || t.text || '').toLowerCase().includes(q)).slice(0, 6).forEach(t =>
      out.push({ type: 'Task', icon: '◎', label: t.title || t.text, sub: (t.status || 'todo') + (t.assignee_name ? ' · ' + t.assignee_name : ''), act: () => goArea('tasks') }));
    members.filter(m => (m.name || '').toLowerCase().includes(q) || (m.email || '').toLowerCase().includes(q)).slice(0, 5).forEach(m =>
      out.push({ type: 'Person', icon: '◍', label: m.name || m.email, sub: m.email, act: () => { setSearchCardMember(m); setSearch(''); setSearchOpen(false); } }));
    try {
      const docs = JSON.parse(localStorage.getItem('ss-quicknotes-' + (team?.id || 'demo')) || '[]');
      (Array.isArray(docs) ? docs : []).filter(d => (d.title || '').toLowerCase().includes(q)).slice(0, 4).forEach(d =>
        out.push({ type: 'Doc', icon: '◈', label: d.title || 'Untitled', sub: 'Knowledge', act: () => goArea('knowledge') }));
    } catch {}
    return out.slice(0, 12);
  })();
  const runResult = (r) => { r.act(); setSearch(''); setSearchOpen(false); };

  const blocked = tasks.filter(t => t.status === 'blocked').length;
  const myTasks = tasks.filter(t => t.assignee_email === session?.user?.email);

  // ── Nav model ──
  const NAV_WORKSPACE = [
    { id: 'home',          label: 'Home',          icon: '⌂' },
    { id: 'tasks',         label: 'Tasks',         icon: '◎' },
    { id: 'spaces',        label: 'Spaces',        icon: '▦' },
    { id: 'team',          label: 'Team',          icon: '⚇' },
    { id: 'communication', label: 'Communication', icon: '◌', badge: unreadChat },
    { id: 'knowledge',     label: 'Knowledge',     icon: '◈' },
  ];
  const NAV_YOU = [
    { id: 'calendar',      label: 'Calendar',      icon: '⊟' },
  ];

  const areaTitle = {
    home: 'Home', tasks: 'Tasks', spaces: 'Spaces', team: 'Team', communication: 'Communication',
    knowledge: 'Knowledge', insights: 'Insights', calendar: 'Calendar', settings: 'Settings',
  };

  const userName = session?.user?.user_metadata?.name || session?.user?.email?.split('@')[0] || 'You';
  const userRole = isManager ? 'Manager' : (myRole === 'team_lead' ? 'Team Lead' : 'Member');
  const userInitials = userName.split(/[.\s]/).map(s => s[0]).slice(0,2).join('').toUpperCase();

  const NavBtn = (n) => {
    const on = area === n.id;
    return (
      <button key={n.id} onClick={() => goArea(n.id)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '9px 12px', borderRadius: 10, border: 'none', cursor: 'pointer',
          background: on ? (dark ? 'rgba(129,140,248,.14)' : 'rgba(0,112,243,.1)') : 'transparent',
          color: on ? c.accent : c.sub, fontSize: 14, fontWeight: on ? 600 : 500, marginBottom: 2, textAlign: 'left', transition: 'all .12s', position: 'relative' }}
        onMouseEnter={e => { if (!on) e.currentTarget.style.background = c.row; }}
        onMouseLeave={e => { if (!on) e.currentTarget.style.background = 'transparent'; }}>
        <span style={{ fontSize: 18, width: 20, textAlign: 'center', flexShrink: 0 }}>{n.icon}</span>
        <span style={{ flex: 1 }}>{n.label}</span>
        {n.badge > 0 && <span style={{ minWidth: 18, height: 18, borderRadius: 9, background: '#EF4444', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px' }}>{n.badge > 9 ? '9+' : n.badge}</span>}
        {n.id === 'tasks' && blocked > 0 && <span style={{ minWidth: 18, height: 18, borderRadius: 9, background: 'rgba(248,113,113,.18)', color: '#F87171', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px' }}>{blocked}</span>}
      </button>
    );
  };
  const GroupLabel = ({ children }) => (
    <div style={{ fontSize: 10.5, fontWeight: 700, color: c.mut, letterSpacing: '.1em', padding: '14px 14px 6px' }}>{children}</div>
  );

  // ── Sidebar ──
  const SidebarNav = ({ inDrawer }) => (
    <div style={{ width: 260, flexShrink: 0, height: '100vh', position: inDrawer ? 'relative' : 'sticky', top: 0,
      background: dark ? 'rgba(13,13,13,.72)' : 'rgba(255,255,255,.7)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderRight: `1px solid ${c.bord}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Logo + workspace */}
      <div style={{ padding: '18px 20px 8px', display: 'flex', alignItems: 'center', gap: 11 }}>
        <Logo size={30} iconOnly onClick={onBack}/>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: c.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-.01em' }}>{team?.name || 'StandSync'}</div>
          <div style={{ fontSize: 11.5, color: c.mut, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userName.split(' ')[0]}'s workspace</div>
        </div>
      </div>

      {/* Nav groups */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px 8px' }}>
        <GroupLabel>WORKSPACE</GroupLabel>
        {NAV_WORKSPACE.map(NavBtn)}
        <GroupLabel>YOU</GroupLabel>
        {NAV_YOU.map(NavBtn)}
        <div style={{ height: 8 }}/>
        <button onClick={() => openPip && openPip()}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '9px 12px', borderRadius: 10, border: 'none', cursor: 'pointer', background: pipOpen ? 'rgba(129,140,248,.14)' : 'transparent', color: pipOpen ? c.accent : c.sub, fontSize: 14, fontWeight: 500, textAlign: 'left' }}>
          <span style={{ fontSize: 18, width: 20, textAlign: 'center' }}>⧉</span>
          <span style={{ flex: 1 }}>Picture-in-picture</span>
          {pipOpen && <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#34D399' }}/>}
        </button>
      </div>

      {/* Profile footer */}
      <button onClick={onSettings} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '14px 18px', borderTop: `1px solid ${c.bord}`, background: 'transparent', border: 'none', borderTopWidth: 1, cursor: 'pointer', textAlign: 'left', width: '100%' }}
        onMouseEnter={e => e.currentTarget.style.background = c.row}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
        <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg,#0070F3,#3B9EFF)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{userInitials}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: c.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userName}</div>
          <div style={{ fontSize: 11.5, color: c.mut }}>{userRole}</div>
        </div>
      </button>
    </div>
  );

  // ── Sub-tab pill bar ──
  const SubTabs = ({ tabs, value, onChange }) => (
    <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: `1px solid ${c.bord}`, paddingBottom: 0, overflowX: 'auto', scrollbarWidth: 'thin' }}>
      {tabs.map(t => {
        const on = value === t.id;
        return (
          <button key={t.id} onClick={() => onChange(t.id)}
            style={{ padding: '8px 14px', border: 'none', borderBottom: `2px solid ${on ? c.accent : 'transparent'}`, background: 'transparent', color: on ? c.text : c.mut, fontSize: 13, fontWeight: on ? 700 : 500, cursor: 'pointer', marginBottom: -1, transition: 'all .12s', whiteSpace: 'nowrap', flexShrink: 0 }}>
            {t.label}
          </button>
        );
      })}
    </div>
  );

  return (
    <div style={{ position: 'relative', zIndex: 1, display: 'flex', minHeight: '100vh' }}>
      <AmbientBackground/>

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

          <h2 className="font-heading" style={{ fontSize: 19, fontWeight: 600, color: c.text, margin: 0, flexShrink: 0, letterSpacing:'-.02em' }}>{areaTitle[area]}</h2>

          {/* Search */}
          <div style={{ flex: 1, maxWidth: 440, position: 'relative', marginLeft: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 10, background: c.inp, border: `1px solid ${searchOpen ? c.bordH : c.bord}` }}>
              <span style={{ fontSize: 14, color: c.mut }}>⌕</span>
              <input value={search} onChange={e => { setSearch(e.target.value); setSearchOpen(true); }} onFocus={() => setSearchOpen(true)}
                onKeyDown={e => { if (e.key === 'Enter' && searchResults[0]) runResult(searchResults[0]); if (e.key === 'Escape') { setSearch(''); setSearchOpen(false); } }}
                placeholder="Search tasks, people, pages…" style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: c.text, fontSize: 13, minWidth: 0 }}/>
              {search && <button onClick={() => { setSearch(''); setSearchOpen(false); }} style={{ background: 'none', border: 'none', color: c.mut, cursor: 'pointer', fontSize: 15, lineHeight: 1 }}>×</button>}
            </div>
            {searchOpen && search.trim() && (
              <>
                <div onClick={() => setSearchOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 199 }}/>
                <div style={{ position: 'absolute', top: 46, left: 0, right: 0, background: dark ? '#12182B' : '#fff', border: `1px solid ${c.bord}`, borderRadius: 12, boxShadow: '0 16px 48px rgba(0,0,0,.35)', zIndex: 200, overflow: 'hidden', maxHeight: 380, overflowY: 'auto' }}>
                  {searchResults.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', fontSize: 13, color: c.mut }}>No results for "{search}"</div>
                  ) : searchResults.map((r, i) => (
                    <button key={i} onClick={() => runResult(r)} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '10px 14px', background: 'transparent', border: 'none', borderBottom: `1px solid ${c.bord}`, cursor: 'pointer', textAlign: 'left' }}
                      onMouseEnter={e => e.currentTarget.style.background = c.row} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <span style={{ width: 30, height: 30, borderRadius: 8, background: c.row, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: c.sub, flexShrink: 0 }}>{r.icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: c.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.label}</div>
                        <div style={{ fontSize: 11.5, color: c.mut, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.sub}</div>
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 700, color: c.mut, textTransform: 'uppercase', letterSpacing: '.05em', flexShrink: 0 }}>{r.type}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Attendance status tag */}
          <AttendanceTag teamId={team?.id || 'demo'} email={session?.user?.email || 'me@demo'} onClick={() => { setTeamSub('attendance'); goArea('team'); }}/>

          {/* Compact team-presence pill */}
          {(() => {
            let att = {}; try { att = JSON.parse(localStorage.getItem('ss-attendance-' + (team?.id || 'demo') + '-' + new Date().toISOString().slice(0,10)) || '{}'); } catch {}
            const status = (m) => { const r = att[m.email] || {}; const onB = (r.breaks||[]).some(b=>!b.end); const on = r.online !== false && r.lastSeen && (Date.now()-r.lastSeen) < 70000; return onB ? 'break' : on ? 'online' : 'offline'; };
            const online = members.filter(m => status(m) === 'online');
            return (
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <button onClick={() => setPresenceOpen(o => !o)} title="Who's online" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 34, padding: '0 11px', borderRadius: 18, border: `1px solid ${c.bord}`, background: presenceOpen ? c.row : 'transparent', color: c.sub, cursor: 'pointer', fontSize: 12.5, fontWeight: 600 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#34D399' }}/>
                  {online.length}/{members.length}
                </button>
                {presenceOpen && (
                  <>
                    <div onClick={() => setPresenceOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }}/>
                    <div style={{ position: 'absolute', top: 40, right: 0, zIndex: 50, width: 250, maxHeight: 340, overflowY: 'auto', background: dark ? '#161B2E' : '#fff', border: `1px solid ${c.bord}`, borderRadius: 14, boxShadow: '0 14px 44px rgba(0,0,0,.3)', padding: 8, animation: 'popIn .15s ease both' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: c.mut, textTransform: 'uppercase', letterSpacing: '.05em', padding: '6px 10px' }}>{online.length} online now</div>
                      {members.map(m => { const st = status(m); const dot = st === 'online' ? '#34D399' : st === 'break' ? '#F59E0B' : '#94A3B8'; const lbl = st === 'online' ? 'Online' : st === 'break' ? 'On break' : 'Offline'; return (
                        <div key={m.email} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', borderRadius: 9 }}>
                          <div style={{ position: 'relative' }}><Av member={m} size={28} url={m.avatar_url}/><span style={{ position: 'absolute', bottom: -1, right: -1, width: 9, height: 9, borderRadius: '50%', background: dot, border: `1.5px solid ${dark ? '#161B2E' : '#fff'}` }}/></div>
                          <span style={{ flex: 1, fontSize: 13, color: c.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name || m.email.split('@')[0]}</span>
                          <span style={{ fontSize: 11, color: dot, fontWeight: 600 }}>{lbl}</span>
                        </div>
                      ); })}
                    </div>
                  </>
                )}
              </div>
            );
          })()}

          {/* Controls: Notifications, Theme, Profile */}
          <button onClick={toggleNotif} title="Notifications"
            style={{ width: 34, height: 34, borderRadius: '50%', border: `1px solid ${c.bord}`, background: notifOpen ? c.row : 'transparent', color: notifOpen ? c.text : c.sub, cursor: 'pointer', flexShrink: 0, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .2s' }}
            onMouseEnter={e=>{e.currentTarget.style.background=c.row;e.currentTarget.style.color=c.text;}} onMouseLeave={e=>{if(!notifOpen){e.currentTarget.style.background='transparent';e.currentTarget.style.color=c.sub;}}}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>
            {unreadNotifs > 0 && <span style={{ position: 'absolute', top: -2, right: -2, minWidth: 16, height: 16, borderRadius: 8, background: '#EF4444', color: '#fff', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', border: `2px solid ${c.nav}` }}>{unreadNotifs > 9 ? '9+' : unreadNotifs}</span>}
          </button>
          <ThemeToggle/>
          <ProfileMenu session={session} onSettings={onSettings} onLogout={onLogout}/>

          {notifOpen && <NotificationPanel notifs={notifs} onClose={() => setNotifOpen(false)} onAction={handleNotifAction} onMarkAllRead={markAllRead} onClearAll={clearAllNotifs} unread={unreadNotifs} onDigest={isManager ? onDigest : null} emailBusy={emailBusy}/>}
        </div>

        {/* Live status strip (only on Home/Tasks) */}
        {(area === 'home' || area === 'tasks') && (
          <div style={{ padding: '10px 32px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
            <LiveDot/><span style={{ fontSize: 11, color: '#34D399', textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 700 }}>Live · {team?.standup_name || team?.name || 'Standup'}</span>
          </div>
        )}

        {/* Transient notification banner */}
        {banner && (
          <div
            onClick={() => { handleNotifAction(banner); setBanner(null); }}
            style={{ position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 900, width: 'min(440px, calc(100vw - 32px))', cursor: 'pointer', background: c.surf, border: `1px solid ${c.bord}`, borderLeft: `4px solid ${banner.accent || c.accent}`, borderRadius: 12, boxShadow: '0 12px 40px rgba(0,0,0,.25)', padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: 11, animation: 'slideDown .25s ease both' }}
          >
            <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>{banner.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: c.text }}>{banner.title}</div>
              <div style={{ fontSize: 12, color: c.sub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{banner.body}</div>
            </div>
            <button onClick={e => { e.stopPropagation(); setBanner(null); }} style={{ background: 'none', border: 'none', color: c.mut, cursor: 'pointer', fontSize: 16, lineHeight: 1, flexShrink: 0 }}>×</button>
          </div>
        )}

        {/* Content */}
        <div key={area} className="ss-area-enter" style={{ flex: 1, padding: '34px 32px 64px', maxWidth: 1280, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>

          {area === 'home' && (
            <HomeCommand session={session} team={team} tasks={tasks} members={members}
              onGoto={goArea} onAddTask={onAddTask} onStartStandup={() => setStandupModal(true)}
              onNewTask={() => setTaskModal(true)} onNewNote={() => setNoteModal(true)} onStandupOptions={() => setStandupModal(true)}
              onOpenAttendance={() => { setTeamSub('attendance'); goArea('team'); }} isManager={isManager}/>
          )}

          {area === 'tasks' && (
            canPerf ? (
              <>
                <SubTabs value={tasksSub} onChange={setTasksSub}
                  tabs={[{ id: 'board', label: 'Tasks' }, { id: 'overview', label: 'Overview' }, { id: 'reliability', label: 'Reliability Engine' }, { id: 'report', label: 'Daily Report' }, ...(isManager ? [{ id: 'reports', label: 'Reports' }] : []), { id: 'ai', label: 'Ask AI' }, { id: 'history', label: 'History' }, ...(isManager ? [{ id: 'weekly', label: 'Weekly summary' }, { id: 'elevate', label: 'Elevate' }, { id: 'timesaved', label: 'Time saved' }] : [])]}/>
                {tasksSub === 'board' && <LiveTab tasks={tasks} members={members} onStatus={onStatus} onPriority={onPriority} onNote={onNote} onAddTask={onAddTask} onDelete={onDeleteTask} session={session} isManager={isManager}/>}
                {tasksSub === 'overview' && <TeamAnalysisTab tasks={tasks} members={members} history={history}/>}
                {tasksSub === 'reliability' && <ReliabilityTab tasks={tasks} members={members} history={history} team={team}/>}
                {tasksSub === 'report' && <DailyReportTab tasks={tasks} session={session} team={team} members={members} isManager={isManager}/>}
                {tasksSub === 'reports' && isManager && <ReportsTab team={team} members={members} session={session}/>}
                {tasksSub === 'ai' && <AIAssistant tasks={tasks} members={members} history={history} session={session} myTasks={myTasks} teamName={team?.name || 'Team'} team={team}/>}
                {tasksSub === 'history' && <HistTab history={history} members={members}/>}
                {tasksSub === 'weekly' && isManager && <WeeklyExecSummary tasks={tasks} members={members} history={history} team={team}/>}
                {tasksSub === 'elevate' && isManager && <ElevateTab tasks={tasks} members={members} history={history} team={team}/>}
                {tasksSub === 'timesaved' && isManager && <TimeSavedTab tasks={tasks} members={members} history={history} team={team}/>}
              </>
            ) : (
              <>
                <SubTabs value={tasksSub} onChange={setTasksSub}
                  tabs={[{ id: 'board', label: 'My Tasks' }, { id: 'overview', label: 'Overview' }, { id: 'report', label: 'Daily Report' }]}/>
                {tasksSub === 'overview'
                  ? <TeamAnalysisTab tasks={tasks} members={members} history={history} memberView={true}/>
                  : tasksSub === 'report'
                  ? <DailyReportTab tasks={tasks} session={session} team={team} members={members} isManager={isManager}/>
                  : <LiveTab tasks={tasks} members={members} onStatus={onStatus} onPriority={onPriority} onNote={onNote} onAddTask={onAddTask} onDelete={onDeleteTask} session={session} isManager={isManager}/>}
              </>
            )
          )}

          {area === 'team' && (
            isManager ? (
              <>
                <SubTabs value={teamSub} onChange={setTeamSub}
                  tabs={[{ id: 'directory', label: 'Directory' }, { id: 'performance', label: 'Performance' }, { id: 'attendance', label: 'Attendance & breaks' }]}/>
                {teamSub === 'directory' && <TeamTab tasks={tasks} members={members} isManager={true} teamId={team?.id || "demo"} session={session} onRemoveMember={isManager?handleRemoveMember:undefined} onRoleChange={isManager?handleRoleChange:undefined}/>}
                {teamSub === 'performance' && <PerfTab tasks={tasks} history={history} members={members}/>}
                {teamSub === 'attendance' && <AttendancePanel team={team} members={members} session={session} isManager={true}/>}
              </>
            ) : canPerf ? (
              <>
                <SubTabs value={teamSub} onChange={setTeamSub}
                  tabs={[{ id: 'directory', label: 'Directory' }, { id: 'performance', label: 'Performance' }, { id: 'attendance', label: 'My shift & breaks' }]}/>
                {teamSub === 'directory' && <TeamTab tasks={tasks} members={members} isManager={true} teamId={team?.id || "demo"} session={session} onRemoveMember={isManager?handleRemoveMember:undefined} onRoleChange={isManager?handleRoleChange:undefined}/>}
                {teamSub === 'performance' && <PerfTab tasks={tasks} history={history} members={members}/>}
                {teamSub === 'attendance' && <AttendancePanel team={team} members={members} session={session} isManager={false}/>}
              </>
            ) : (
              <>
                <SubTabs value={teamSub} onChange={setTeamSub}
                  tabs={[{ id: 'directory', label: 'Directory' }, { id: 'attendance', label: 'My shift & breaks' }]}/>
                {teamSub === 'directory' && <TeamTab tasks={tasks} members={members} isManager={false} teamId={team?.id || "demo"} session={session}/>}
                {teamSub === 'attendance' && <AttendancePanel team={team} members={members} session={session} isManager={false}/>}
              </>
            )
          )}

          {area === 'communication' && (
            <RichChatPanel messages={messages} onSend={onSendMessage} session={session} members={members} chatTheme={chatTheme} onChangeTheme={onChangeTheme} isManager={true} onCreateTask={onAddTask} teamId={team?.id||'demo'}/>
          )}

          {area === 'spaces' && <SpacesArea team={team} session={session} members={members}/>}

          {area === 'knowledge' && (
            <>
              <SubTabs value={knowledgeSub} onChange={setKnowledgeSub}
                tabs={[{ id: 'docs', label: 'Docs & SOPs' }, { id: 'brainstorm', label: 'Brainstorm' }, { id: 'meetings', label: 'Meeting notes' }]}/>
              {knowledgeSub === 'docs' && <ProjectWiki team={team} session={session} members={members}/>}
              {knowledgeSub === 'brainstorm' && <BrainstormSpace team={team} session={session} members={members}/>}
              {knowledgeSub === 'meetings' && <ManagerNotesTab session={session} team={team}/>}
            </>
          )}

          {area === 'calendar' && (
            <>
              <SubTabs value={calSub} onChange={setCalSub}
                tabs={[{ id: 'schedule', label: 'My Schedule' }, { id: 'meetings', label: 'Meetings' }]}/>
              {calSub === 'schedule' && <ScheduleCalendar team={team} session={session} members={members} tasks={tasks} canViewPerformance={canPerf} isManager={isManager}/>}
              {calSub === 'meetings' && <CalendarPanel team={team} members={members} session={session}/>}
            </>
          )}

        </div>
      </div>

      {/* ── Quick-action modals ── */}
      {taskModal && <AssignModal members={members} onClose={() => setTaskModal(false)} onAdd={(d) => { onAddTask && onAddTask(d); setTaskModal(false); }} isManager={isManager} session={session}/>}
      {noteModal && <QuickNoteModal session={session} team={team} onClose={() => setNoteModal(false)} onOpenKnowledge={() => { setNoteModal(false); setKnowledgeSub('meetings'); goArea('knowledge'); }}/>}
      {standupModal && <StandupOptionsModal team={team} onClose={() => setStandupModal(false)}
        onJoin={() => { setStandupModal(false); goArea('tasks'); }}
        onPip={(mode) => { setStandupModal(false); openPip && openPip(mode); }}/>}

      {/* Floating AI assistant — available on every area */}
      <AIBubble tasks={tasks} members={members} history={history} session={session} myTasks={myTasks} teamName={team?.name || 'Team'} teamId={team?.id || 'demo'}/>
      {searchCardMember && <MemberCard member={searchCardMember} tasks={tasks} teamId={team?.id || 'demo'} isManager={isManager} session={session} onClose={() => setSearchCardMember(null)} onRemove={isManager ? handleRemoveMember : undefined} onRoleChange={isManager ? handleRoleChange : undefined}/>}

      {mailView && <MailPreviewModal mail={mailView} onClose={() => setMailView(null)}/>}
    </div>
  );
}

// ─── QUICK TASK MODAL ─────────────────────────────────────────────────────────
function QuickTaskModal({ members, session, onClose, onAdd, onOpenBoard }) {
  const c = useC();
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('medium');
  const [assignee, setAssignee] = useState(session?.user?.email || '');
  const [timeline, setTimeline] = useState('');
  const submit = () => {
    if (!title.trim()) return;
    onAdd({ title: title.trim(), priority, assignee_email: assignee, timeline: timeline.trim(), status: 'todo' });
  };
  return (
    <Modal onClose={onClose} title="New task" width={460}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Inp value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} placeholder="What needs to get done?" autoFocus/>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Sel label="Priority" value={priority} onChange={e => setPriority(e.target.value)}>
            <option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
          </Sel>
          <Sel label="Assignee" value={assignee} onChange={e => setAssignee(e.target.value)}>
            <option value="">Unassigned</option>
            {members.map(m => <option key={m.email} value={m.email}>{m.name || m.email}</option>)}
          </Sel>
        </div>
        <Inp label="Timeline (optional)" value={timeline} onChange={e => setTimeline(e.target.value)} placeholder="e.g. Today, This week, Fri"/>
        <div style={{ display: 'flex', gap: 8, marginTop: 4, justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={onOpenBoard} style={{ fontSize: 13, color: c.mut, background: 'none', border: 'none', cursor: 'pointer' }}>Open full board →</button>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn v="ghost" onClick={onClose}>Cancel</Btn>
            <Btn onClick={submit} disabled={!title.trim()}>Add task</Btn>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ─── QUICK NOTE MODAL ─────────────────────────────────────────────────────────
function QuickNoteModal({ session, team, onClose, onOpenKnowledge }) {
  const c = useC();
  const { dark } = useTheme();
  const [noteType, setNoteType] = useState(null); // null = choose; 'meeting' | 'project'
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [saved, setSaved] = useState(false);
  const teamId = team?.id || 'demo';
  const save = () => {
    if (!title.trim() && !body.trim()) return;
    try {
      const key = 'ss-quicknotes-' + teamId;
      const list = JSON.parse(localStorage.getItem(key) || '[]');
      list.unshift({ id: 'qn' + Date.now(), type: noteType, title: title.trim() || 'Untitled note', body: body.trim(), at: Date.now(), by: session?.user?.email });
      localStorage.setItem(key, JSON.stringify(list));
    } catch(e) {}
    setSaved(true);
    setTimeout(() => onClose(), 700);
  };

  // Step 1 — choose note type
  if (!noteType) {
    const Choice = ({ icon, title, desc, onClick, accent }) => (
      <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', borderRadius: 12, border: `1px solid ${c.bord}`, background: c.surf, cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'all .15s' }}
        onMouseEnter={e => e.currentTarget.style.borderColor = c.bordH}
        onMouseLeave={e => e.currentTarget.style.borderColor = c.bord}>
        <div style={{ width: 42, height: 42, borderRadius: 11, background: accent + '1f', color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: c.text }}>{title}</div>
          <div style={{ fontSize: 12, color: c.mut, marginTop: 2 }}>{desc}</div>
        </div>
        <span style={{ color: c.mut, fontSize: 16 }}>→</span>
      </button>
    );
    return (
      <Modal onClose={onClose} title="New note" width={460}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Choice icon="≡" title="Meeting notes" desc="Capture decisions and action items from a meeting" accent="#FBBF24" onClick={() => { setNoteType('meeting'); setTitle('Meeting notes — ' + new Date().toLocaleDateString('en-US',{month:'short',day:'numeric'})); }}/>
          <Choice icon="◈" title="Project notes" desc="Docs, SOPs, and project knowledge" accent="#3B9EFF" onClick={() => { setNoteType('project'); }}/>
        </div>
      </Modal>
    );
  }

  // Step 2 — quick editor
  return (
    <Modal onClose={onClose} title={noteType === 'meeting' ? 'Quick meeting note' : 'Quick project note'} width={520}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <button onClick={() => { setNoteType(null); setBody(''); }} style={{ alignSelf: 'flex-start', fontSize: 12, color: c.mut, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>← Back</button>
        <Inp value={title} onChange={e => setTitle(e.target.value)} placeholder={noteType === 'meeting' ? 'Meeting title' : 'Note / doc title'} autoFocus/>
        <Textarea value={body} onChange={e => setBody(e.target.value)} placeholder={noteType === 'meeting' ? 'Jot down decisions, action items, anything from the meeting…' : 'Write your project notes, SOP, or doc…'} style={{ minHeight: 160 }}/>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={onOpenKnowledge} style={{ fontSize: 13, color: c.mut, background: 'none', border: 'none', cursor: 'pointer' }}>Open full editor →</button>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn v="ghost" onClick={onClose}>Cancel</Btn>
            <Btn onClick={save} disabled={!title.trim() && !body.trim()}>{saved ? '✓ Saved!' : 'Save note'}</Btn>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ─── STANDUP OPTIONS MODAL ────────────────────────────────────────────────────
function StandupOptionsModal({ team, onClose, onJoin, onPip }) {
  const c = useC();
  const { dark } = useTheme();
  const [view, setView] = useState('main'); // main | join | pip | pipjoin
  const [pendingPipMode, setPendingPipMode] = useState('both');

  const calEvents = (() => { try { return JSON.parse(sessionStorage.getItem('ss-cal-events') || '[]'); } catch { return []; } })();
  const standupKeywords = ['standup', 'stand-up', 'stand up', 'daily', 'dsu', 'scrum', 'sync'];
  const now = new Date();
  const upcoming = calEvents
    .map(ev => ({ ...ev, _start: new Date(ev.start?.dateTime || ev.start?.date || 0) }))
    .filter(ev => ev._start >= new Date(now.getTime() - 60 * 60 * 1000))
    .sort((a, b) => a._start - b._start)
    .slice(0, 12);
  const standupsOnly = upcoming.filter(ev => standupKeywords.some(k => (ev.summary || '').toLowerCase().includes(k)));
  const joinList = standupsOnly.length ? standupsOnly : upcoming;

  const fmtTime = (d) => d && !isNaN(d) ? d.toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' }) : '';

  const getMeetLink = (ev) => {
    if (ev.hangoutLink) return ev.hangoutLink;
    const cd = ev.conferenceData?.entryPoints?.find(e => e.entryPointType === 'video');
    if (cd?.uri) return cd.uri;
    const text = (ev.location || '') + ' ' + (ev.description || '');
    const m = text.match(/https?:\/\/[^\s"\'<>]+(zoom\.us|teams\.microsoft|teams\.live|meet\.google|skype\.com|webex\.com|whereby\.com|meet\.jit\.si)[^\s"\'<>]*/i);
    if (m) return m[0];
    const any = text.match(/https?:\/\/[^\s"\'<>]+/);
    return any ? any[0] : null;
  };
  const providerOf = (link) => {
    if (!link) return null;
    if (/zoom\.us/i.test(link)) return 'Zoom';
    if (/teams\.(microsoft|live)/i.test(link)) return 'Teams';
    if (/meet\.google/i.test(link)) return 'Meet';
    if (/skype/i.test(link)) return 'Skype';
    if (/webex/i.test(link)) return 'Webex';
    if (/whereby/i.test(link)) return 'Whereby';
    if (/jit\.si/i.test(link)) return 'Jitsi';
    return 'Link';
  };

  // Join only
  const joinMeeting = (ev) => {
    const link = getMeetLink(ev);
    if (link) { window.open(link, '_blank', 'noopener'); onClose(); }
    else { onJoin(); }
  };
  // Join meeting AND open PiP in chosen mode
  const joinWithPip = (ev) => {
    const link = getMeetLink(ev);
    if (link) window.open(link, '_blank', 'noopener');
    onPip(pendingPipMode);
  };

  const Action = ({ icon, title, desc, onClick, accent }) => (
    <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 12, border: '1px solid ' + c.bord, background: c.surf, cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'all .15s' }}
      onMouseEnter={e => e.currentTarget.style.borderColor = c.bordH}
      onMouseLeave={e => e.currentTarget.style.borderColor = c.bord}>
      <div style={{ width: 40, height: 40, borderRadius: 11, background: (accent || '#0070F3') + '1f', color: accent || '#3B9EFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: c.text }}>{title}</div>
        <div style={{ fontSize: 12, color: c.mut, marginTop: 2 }}>{desc}</div>
      </div>
      <span style={{ color: c.mut, fontSize: 18 }}>→</span>
    </button>
  );

  const MeetRow = ({ ev, onPick, cta }) => {
    const link = getMeetLink(ev);
    const prov = providerOf(link);
    return (
      <button onClick={() => onPick(ev)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 11, border: '1px solid ' + c.bord, background: c.surf, cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'all .15s' }}
        onMouseEnter={e => e.currentTarget.style.borderColor = c.bordH}
        onMouseLeave={e => e.currentTarget.style.borderColor = c.bord}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: link ? '#34D399' : '#64748B', flexShrink: 0 }}/>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: c.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.summary || 'Untitled meeting'}</div>
          <div style={{ fontSize: 11, color: c.mut, marginTop: 2 }}>{fmtTime(ev._start)}</div>
        </div>
        {prov
          ? <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg,#0070F3,#3B9EFF)', padding: '4px 12px', borderRadius: 20, flexShrink: 0 }}>{cta} {prov}</span>
          : <span style={{ fontSize: 11, color: c.mut, flexShrink: 0 }}>No link</span>}
      </button>
    );
  };

  const EmptyCal = () => (
    <div style={{ fontSize: 13, color: c.mut, padding: '20px 2px', lineHeight: 1.6, textAlign: 'center' }}>
      No upcoming meetings found.<br/>Connect Google Calendar in the Calendar tab to see your standups here.
    </div>
  );

  // JOIN list
  if (view === 'join') {
    return (
      <Modal onClose={onClose} title="Join a standup" width={520}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button onClick={() => setView('main')} style={{ alignSelf: 'flex-start', fontSize: 12, color: c.mut, background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 2 }}>← Back</button>
          <div style={{ fontSize: 12.5, color: c.mut, lineHeight: 1.5, marginBottom: 4 }}>Pick a meeting to jump straight into its video call.</div>
          {joinList.length === 0 ? <EmptyCal/> : joinList.map(ev => <MeetRow key={ev.id} ev={ev} onPick={joinMeeting} cta="Join"/>)}
          <button onClick={onJoin} style={{ marginTop: 4, fontSize: 13, color: c.accent, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Or open the live board →</button>
        </div>
      </Modal>
    );
  }

  // PIP mode picker
  if (view === 'pip') {
    return (
      <Modal onClose={onClose} title="Picture-in-picture" width={460}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button onClick={() => setView('main')} style={{ alignSelf: 'flex-start', fontSize: 12, color: c.mut, background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 2 }}>← Back</button>
          <div style={{ fontSize: 12.5, color: c.mut, lineHeight: 1.5, marginBottom: 2 }}>Choose what floats over your call.</div>
          <Action icon="📝" title="Meeting notes" desc="Floating notes pad over your call" accent="#FBBF24" onClick={() => onPip('notes')}/>
          <Action icon="✅" title="Create tasks" desc="Floating task board over your call" accent="#60A5FA" onClick={() => onPip('tasks')}/>
          <Action icon="🪟" title="Both" desc="Notes and tasks together in one window" accent="#3B9EFF" onClick={() => onPip('both')}/>
          <div style={{ marginTop: 4, paddingTop: 12, borderTop: '1px solid ' + c.bord }}>
            <Action icon="🎥" title="Join a meeting + open PiP" desc="Open a call from your calendar, then float PiP on top" accent="#34D399" onClick={() => setView('pipjoin')}/>
          </div>
        </div>
      </Modal>
    );
  }

  // PIP + join meeting: choose mode, then pick meeting
  if (view === 'pipjoin') {
    return (
      <Modal onClose={onClose} title="Join meeting with PiP" width={520}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button onClick={() => setView('pip')} style={{ alignSelf: 'flex-start', fontSize: 12, color: c.mut, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>← Back</button>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: c.mut, letterSpacing: '.08em', marginBottom: 8 }}>PIP SHOWS</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[['notes', '📝 Notes'], ['tasks', '✅ Tasks'], ['both', '🪟 Both']].map(([m, lbl]) => (
                <button key={m} onClick={() => setPendingPipMode(m)} style={{ flex: 1, padding: '8px 10px', borderRadius: 9, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', border: '1px solid ' + (pendingPipMode === m ? '#3B9EFF' : c.bord), background: pendingPipMode === m ? 'rgba(0,112,243,.12)' : 'transparent', color: pendingPipMode === m ? c.accent : c.sub }}>{lbl}</button>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: c.mut, letterSpacing: '.08em', marginBottom: 8 }}>PICK A MEETING</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {joinList.length === 0 ? <EmptyCal/> : joinList.map(ev => <MeetRow key={ev.id} ev={ev} onPick={joinWithPip} cta="Join"/>)}
            </div>
          </div>
          <button onClick={() => onPip(pendingPipMode)} style={{ marginTop: 2, fontSize: 13, color: c.accent, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Skip — just open PiP →</button>
        </div>
      </Modal>
    );
  }

  // MAIN
  return (
    <Modal onClose={onClose} title="Start standup" width={520}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Action icon="🎯" title="Join the standup" desc="Pick a meeting from your calendar and jump in" onClick={() => setView('join')} accent="#34D399"/>
        <Action icon="🪟" title="PiP mode" desc="Floating window that stays over your video call" onClick={() => setView('pip')} accent="#3B9EFF"/>
      </div>
    </Modal>
  );
}


// ─── PIP TASK WINDOW ─────────────────────────────────────────────────────────
// Floats over Google Meet / any video call so you can write tasks without switching windows
// ─── PIP MODE ────────────────────────────────────────────────────────────────
function usePip({ tasks, onAdd, onStatus, session, team, standup, isManager = false, members = [] }) {
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

  const openPip = (mode = 'both') => {
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
      win.postMessage({ type:'init', mode, tasks, myEmail, myName, teamName: team ? team.name : 'Team', isManager,
        members: (members||[]).map(m=>({email:m.email,name:m.name||m.email})),
        timelineOptions: ['Today noon (12 PM)','Today 3 PM','Today EOD (6 PM)','Tomorrow morning','Tomorrow EOD','This week'] }, '*');
    });

    // Translate a timeline label into a calendar block (start=now, end=deadline).
    const pipBlockFromTimeline = (tl) => {
      const now = new Date();
      const hhmm = (d) => `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
      const iso = (d) => d.toISOString().slice(0,10);
      const tomorrow = new Date(now); tomorrow.setDate(now.getDate()+1);
      const at = (base,h,m=0)=>{ const d=new Date(base); d.setHours(h,m,0,0); return d; };
      let date=iso(now), startD=now, endD;
      switch (tl) {
        case 'Today noon (12 PM)': endD=at(now,12); break;
        case 'Today 3 PM': endD=at(now,15); break;
        case 'Tomorrow morning': date=iso(tomorrow); startD=at(tomorrow,9); endD=at(tomorrow,12); break;
        case 'Tomorrow EOD': date=iso(tomorrow); startD=at(tomorrow,9); endD=at(tomorrow,18); break;
        default: endD=at(now,18); // Today EOD / This week
      }
      if (endD<=startD) endD=new Date(startD.getTime()+60*60000);
      return { date, start: hhmm(startD), end: hhmm(endD), repeat:'none' };
    };

    // Listen for messages from pip window
    const handler = (e) => {
      if (!e.data) return;
      if (e.data.type === 'status') onStatus(e.data.id, e.data.status);
      if (e.data.type === 'addTask') {
        const t = e.data.task || {};
        // Members can only ever assign to themselves; managers may assign to anyone.
        const assignEmail = isManager ? (t.assignee_email || myEmail) : myEmail;
        const assignName = isManager ? (t.assignee_name || myName) : myName;
        const timeline = t.timeline || 'Today EOD (6 PM)';
        const payload = {
          title: t.title || e.data.title || '',
          status: 'todo',
          priority: t.priority || 'medium',
          due_label: t.due_label || '',
          timeline,
          assignee_email: assignEmail,
          assignee_name: assignName,
          standup_id: standup ? standup.id : null,
          team_id: team ? team.id : null,
        };
        // Time block: use one the PiP supplied, else derive from the timeline if requested.
        if (t._timeBlock && t._timeBlock.start && t._timeBlock.end) payload._timeBlock = t._timeBlock;
        else if (t.addTimeBlock) payload._timeBlock = pipBlockFromTimeline(timeline);
        onAdd(payload);
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
  {id:'dm1',user_id:'u1',email:'tanisk.pandey@xtransmatrix.com',name:'Tanisk Pandey',role:'manager',color:'#3B9EFF'},
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
          <button onClick={()=>{ localStorage.clear(); window.location.href='/'; }} style={{ padding:'10px 24px',borderRadius:10,background:'linear-gradient(135deg,#0070F3,#3B9EFF)',color:'#fff',border:'none',cursor:'pointer',fontSize:14,fontWeight:600 }}>Clear cache &amp; reload</button>
          <button onClick={()=>window.location.reload()} style={{ marginTop:10,padding:'8px 20px',borderRadius:10,background:'transparent',color:'rgba(240,236,255,.5)',border:'1px solid rgba(255,255,255,.1)',cursor:'pointer',fontSize:13 }}>Just reload</button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  // Init supabase from CDN on first render (avoids TDZ bundling crash)
  const [dark,setDark]=useState(()=>(localStorage.getItem('ss-theme')||'light')==='dark');
  const toggle=useCallback(()=>setDark(d=>{const n=!d;localStorage.setItem('ss-theme',n?'dark':'light');document.body.style.background=n?'#060412':'#F4F6FB';return n;}),[]);

  // Unlock WebAudio on the first user interaction so notification chimes can play.
  useEffect(() => {
    const unlock = () => {
      try {
        _ssAudioCtx = _ssAudioCtx || new (window.AudioContext || window.webkitAudioContext)();
        if (_ssAudioCtx.state === 'suspended') _ssAudioCtx.resume();
      } catch (e) {}
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => { window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock); };
  }, []);

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
      if (!raw) return 'splash';
      const parsed = JSON.parse(raw);
      const hasSession = !!(parsed?.currentSession || parsed?.session);
      if (!hasSession) return 'splash';
      const savedView = localStorage.getItem('ss-view');
      const team = localStorage.getItem('ss-team');
      if (savedView === 'standup' && team) return 'standup';
      return 'home';
    } catch(e){ return 'splash'; }
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
  const isTeamLead=myRole==='team_lead';
  // Team leads get performance/insights visibility; managers get everything.
  const canViewPerformance=isManager||isTeamLead;
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
    if(inv){ setInviteToken(inv); setView(v=>v==='splash'?'auth':v); }
    // Also clear any OAuth code/token params that shouldn't stay in URL
    if(p.get('code')||p.get('access_token')){
      window.history.replaceState({},'',window.location.pathname);
    }
  },[]);

  useEffect(()=>{
    if(!SB.IS_LIVE){ setView(v=>v==='splash'?v:'home'); return; }

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
        const todayTasks = t || [];
        // ── Carry-over: pull unfinished tasks from recent past standups so they
        // don't vanish day-to-day. They surface today as backlog with a warning.
        let carried = [];
        try {
          const pastStandups = (past || []).filter(p => p.id && p.id !== sd?.id).slice(0, 14);
          const pastTaskArrays = await Promise.all(pastStandups.map(p =>
            SB.getTasks(p.id).then(arr => (arr || []).map(x => ({ ...x, _standupDate: p.date }))).catch(() => [])
          ));
          const seen = new Set(todayTasks.map(x => x.id));
          carried = pastTaskArrays.flat()
            .filter(x => x.status !== 'done' && !seen.has(x.id))
            .map(x => ({ ...x, _carriedOver: true }));
          // de-dupe by id (keep the most recent occurrence)
          const byId = {};
          carried.forEach(x => { byId[x.id] = x; });
          carried = Object.values(byId);
        } catch (e) {}
        setTasks([...todayTasks, ...carried]);
        // Notify each assignee about their carried-over backlog (once per task per day)
        try {
          const exKey = 'ss-backlog-notified-' + team.id + '-' + TODAY();
          const already = JSON.parse(localStorage.getItem(exKey) || '[]');
          const newOnes = carried.filter(x => !already.includes(x.id));
          newOnes.forEach(x => {
            pushEvent(team.id, { type: 'backlog', actor: x.assignee_name || (x.assignee_email||'').split('@')[0], actorEmail: x.assignee_email, targetEmail: x.assignee_email, title: x.title || x.text, taskId: x.id, fromDate: x._standupDate });
          });
          localStorage.setItem(exKey, JSON.stringify([...already, ...newOnes.map(x => x.id)]));
        } catch (e) {}
        setHistory((past||[]).filter(p=>p.date!==TODAY()));
        // Hydrate shared team data (board, reports, spaces, etc.) + event history.
        try { await hydrateShared(team.id); } catch (e) {}
        try {
          if (SB.getEvents) {
            const evs = await SB.getEvents(team.id, 80);
            if (evs && evs.length) { _sharedCache[_scKey(team.id, '__events__')] = evs; }
          }
        } catch (e) {}
        setMessages(msgs||[]);
        if(mems&&mems.length>0){
          // Ensure the logged-in user's own uploaded avatar shows even if the
          // team_members row hasn't synced avatar_url yet.
          const myAv=session?.user?.user_metadata?.avatar_url;
          const merged=myAv?mems.map(m=>m.user_id===session?.user?.id&&!m.avatar_url?{...m,avatar_url:myAv}:m):mems;
          setMembers(merged);
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
            else setMembers([{id:'me',user_id:session.user.id,email:session.user.email,name:session.user.user_metadata?.name||'You',role:'manager',designation:'Team Manager',color:'#3B9EFF',status:'active'}]);
          }
        }
      } catch(err) {
        console.error('Team load error:',err.message);
      }
    };
    load();
  },[team]);

  useEffect(()=>{ if(!standup||!SB.IS_LIVE)return; return SB.subscribeToTasks(standup.id,({eventType:et,new:n,old:o})=>{setTasks(p=>{ if(et==='INSERT') return p.find(t=>t.id===n.id)?p:[...p,n]; if(et==='UPDATE') return p.map(t=>t.id===n.id?n:t); return p.filter(t=>t.id!==o.id); });}); },[standup]);
  // Safety net: refresh tasks periodically and on window focus so a manager always
  // sees members' newly-added tasks even if a realtime event was missed.
  useEffect(()=>{
    if(!standup||!SB.IS_LIVE)return;
    const refresh=async()=>{ try{ const t=await SB.getTasks(standup.id); if(Array.isArray(t)) setTasks(t); }catch(e){} };
    const iv=setInterval(refresh,30000);
    const onFocus=()=>refresh();
    window.addEventListener('focus',onFocus);
    return ()=>{ clearInterval(iv); window.removeEventListener('focus',onFocus); };
  },[standup]);
  // Real-time chat subscription
  useEffect(()=>{ if(!team||!SB.IS_LIVE)return; return SB.subscribeToMessages(team.id,(msg)=>{setMessages(p=>{if(p.find(m=>m.id===msg.id))return p;return [...p,msg];});}); },[team]);

  const handleAddTask=useCallback(async(d)=>{ if(!d?.title?.trim()) return; const {_timeBlock,...task}=d; const myEmail=session?.user?.email||''; const myName=session?.user?.user_metadata?.name||myEmail.split('@')[0]; const emitAssigned=(tid)=>{ const toSelf=(task.assignee_email||'').toLowerCase()===myEmail.toLowerCase(); pushEvent(team?.id,{ type:toSelf?'task_created':'task_assigned', actor:myName, actorEmail:myEmail, target:task.assignee_name||(task.assignee_email||'').split('@')[0], targetEmail:task.assignee_email, title:task.title, taskId:tid }); }; const persistBlock=(tid)=>{ if(_timeBlock&&_timeBlock.start&&_timeBlock.end){ try{ const k='ss-schedule-'+(team?.id||'demo'); const cur=JSON.parse(localStorage.getItem(k)||'{}'); cur[tid]=_timeBlock; localStorage.setItem(k,JSON.stringify(cur)); }catch(e){} } }; if(!SB.IS_LIVE){const nt={id:'demo_'+Date.now(),...task,created_at:new Date().toISOString()};setTasks(p=>[...p,nt]);persistBlock(nt.id);emitAssigned(nt.id);return;} const{data}=await SB.addTask({...task,standup_id:standup?.id}); if(data){setTasks(p=>[...p,data]);persistBlock(data.id);emitAssigned(data.id);} },[standup,team,session]);
  const handleStatus=useCallback(async(id,status)=>{ const u={status,...(status==='done'?{completed_at:new Date().toISOString()}:{})}; const myEmail=session?.user?.email||''; const myName=session?.user?.user_metadata?.name||myEmail.split('@')[0]; const t=tasks.find(x=>x.id===id); if(t&&(status==='done'||status==='in-progress')){ pushEvent(team?.id,{ type:status==='done'?'task_completed':'task_started', actor:t.assignee_name||myName, actorEmail:t.assignee_email||myEmail, title:t.title||t.text, taskId:id }); } if(!SB.IS_LIVE){setTasks(p=>p.map(t=>t.id===id?{...t,...u}:t));return;} await SB.updateTask(id,u); setTasks(p=>p.map(t=>t.id===id?{...t,...u}:t)); },[tasks,team,session]);
  const handleDeleteTask=useCallback(async(id)=>{ setTasks(p=>p.filter(t=>t.id!==id)); if(SB.IS_LIVE){ try{ const del=sbFn('deleteTask'); if(del){ await del(id); } else if(SB.supabase){ await SB.supabase.from('tasks').delete().eq('id',id); } }catch(e){} } },[]);
  const handlePriority=useCallback(async(id,priority)=>{ if(!SB.IS_LIVE){setTasks(p=>p.map(t=>t.id===id?{...t,priority}:t));return;} await SB.updateTask(id,{priority}); },[]);
  const handleNote=useCallback(async(id,manager_note)=>{ if(!SB.IS_LIVE){setTasks(p=>p.map(t=>t.id===id?{...t,manager_note}:t));return;} await SB.updateTask(id,{manager_note}); },[]);
  const handleBlocker=useCallback(async(id,blocker)=>{ const u={status:'blocked',blocker,blocked_at:new Date().toISOString()}; if(!SB.IS_LIVE){setTasks(p=>p.map(t=>t.id===id?{...t,...u}:t));showToast('⚠️ Blocker reported');return;} await SB.updateTask(id,u); const task=tasks.find(t=>t.id===id),manager=members.find(m=>m.role==='manager'); if(task&&manager)await Email.sendBlockerAlert(manager.email,{email:session.user.email,name:session.user.user_metadata?.name},{...task,blocker}); showToast('⚠️ Blocker reported — manager notified'); },[tasks,members,session,showToast]);
  // Records an in-app "digest delivered" notification each member will see in their bell.
  const recordDigest=useCallback((kind,perMemberTasks,subjectFn,bodyFn)=>{
    try{
      const teamId=team?.id||'demo';
      const day=new Date().toISOString().slice(0,10);
      const key='ss-digests-'+teamId;
      const existing=JSON.parse(localStorage.getItem(key)||'[]');
      const stamp=Date.now();
      const fromName=session?.user?.user_metadata?.name||session?.user?.email?.split('@')[0]||'Manager';
      const recs=members.filter(x=>x.role!=='manager').map(m=>{
        const mt=perMemberTasks(m);
        return { id:kind+'-'+day+'-'+m.email, kind, email:m.email, day, at:stamp, from:fromName,
          subject:subjectFn(m,mt), body:bodyFn(m,mt), to:m.email };
      });
      // de-dup by id (re-sending same day replaces)
      const merged=[...existing.filter(e=>!recs.find(r=>r.id===e.id)),...recs];
      localStorage.setItem(key,JSON.stringify(merged.slice(-200)));
    }catch(e){}
  },[team,members,session]);

  const handleDigest=useCallback(async()=>{
    setEmailBusy(true);
    const nonManagers=members.filter(x=>x.role!=='manager');
    if(nonManagers.length===0){ showToast('No team members to send digest to — invite members first','error'); setEmailBusy(false); return; }
    // 1) Always record the in-app notification (works without backend)
    recordDigest('digest',
      (m)=>tasks.filter(t=>t.assignee_email===m.email),
      (m,mt)=>`Your standup digest — ${team?.name||'Team'}`,
      (m,mt)=>{
        const open=mt.filter(t=>t.status!=='done');
        const lines=mt.length?mt.map(t=>`• ${t.title||t.text} — ${t.status||'todo'}`).join('\n'):'No tasks assigned yet today.';
        return `Good morning ${m.name||m.email.split('@')[0]},\n\nHere's your standup digest for ${team?.name||'the team'}:\n\n${lines}\n\n${open.length} open task${open.length!==1?'s':''}. Have a great day!`;
      });
    // 2) Send real email via the serverless function (server holds RESEND_API_KEY)
    let sent=0, failed=0, demo=false;
    for(const m of nonManagers){
      const mt=tasks.filter(t=>t.assignee_email===m.email);
      try{ const r=await Email.sendMorningDigest(m,mt,team?.name||'Team'); if(r?.ok) sent++; else { failed++; if(r?.demo) demo=true; } }catch(e){ failed++; }
    }
    if(sent>0) showToast('📧 Digest emailed to '+sent+' member'+(sent!==1?'s':'')+' + in-app');
    else if(demo) showToast('🔔 Digest delivered in-app. Set RESEND_API_KEY in Vercel to also email.');
    else showToast('🔔 Digest in-app; email failed ('+failed+'). Check RESEND_API_KEY & domain.','error');
    setEmailBusy(false);
  },[tasks,members,team,showToast,recordDigest]);
  const handleEOD=useCallback(async()=>{
    setEmailBusy(true);
    const nonManagers=members.filter(x=>x.role!=='manager');
    // in-app EOD record
    recordDigest('eod',
      (m)=>tasks.filter(t=>t.assignee_email===m.email&&t.status!=='done'),
      (m,p)=>`EOD backlog — ${team?.name||'Team'}`,
      (m,p)=>{
        const lines=p.length?p.map(t=>`• ${t.title||t.text} — ${t.status||'todo'}`).join('\n'):'Nothing pending. Great work today!';
        return `Hi ${m.name||m.email.split('@')[0]},\n\nEnd-of-day summary for ${team?.name||'the team'}:\n\n${lines}\n\n${p.length} item${p.length!==1?'s':''} still open.`;
      });
    let sent=0, demo=false;
    try{
      for(const m of nonManagers){const p=tasks.filter(t=>t.assignee_email===m.email&&t.status!=='done');if(p.length>0){const r=await Email.sendEODBacklog(m,p,team?.name||'Team'); if(r?.ok) sent++; else if(r?.demo) demo=true;}}
      const mg=members.find(m=>m.role==='manager'); if(mg)await Email.sendManagerSummary(mg.email,tasks,members,team?.name||'Team');
      if(sent>0) showToast('🕕 EOD summary emailed + in-app');
      else if(demo) showToast('🔔 EOD in-app. Set RESEND_API_KEY in Vercel to also email.');
      else showToast('🔔 EOD delivered in-app');
    }catch(e){showToast('In-app EOD delivered; email failed','error');}
    setEmailBusy(false);
  },[tasks,members,team,showToast,recordDigest]);
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
    tasks, onAdd: handleAddTask, onStatus: handleStatus, session, team, standup, isManager, members
  });

  const myMember=members.find(m=>m.user_id===(session?.user?.id||'u1'));
  const userForView={email:session?.user?.email||'tanisk.pandey@xtransmatrix.com',name:session?.user?.user_metadata?.name||'Tanisk Pandey'};

  useEffect(()=>{document.body.style.background=dark?'#060412':'#F4F6FB';document.body.style.overscrollBehaviorX='none';document.documentElement.style.overscrollBehaviorX='none';},[dark]);

  // ── Global presence: online while tab open & visible; offline on hide/close ──
  useEffect(()=>{
    const teamId=team?.id; const email=session?.user?.email;
    if(!teamId||!email) return;
    const key='ss-attendance-'+teamId+'-'+new Date().toISOString().slice(0,10);
    const setPresence=(online)=>{
      try{
        const cur=JSON.parse(localStorage.getItem(key)||'{}');
        const r={...(cur[email]||{})};
        r.lastSeen=Date.now(); r.online=online;
        cur[email]=r; localStorage.setItem(key,JSON.stringify(cur));
      }catch(e){}
      // Push to backend when available (won't break build if absent)
      try{ const up=sbFn('upsertPresence'); if(SB.IS_LIVE&&up) up(teamId,email,Date.now(),online); }catch(e){}
    };
    setPresence(true);
    // Heartbeat keeps running even when the tab is backgrounded, so "app open" = online.
    const beat=setInterval(()=>{ setPresence(true); },25000);
    // Becoming visible again refreshes immediately; backgrounding does NOT mark offline.
    const onVis=()=>{ if(document.visibilityState==='visible') setPresence(true); };
    const onLeave=()=>setPresence(false); // only on actual tab/window close
    document.addEventListener('visibilitychange',onVis);
    window.addEventListener('beforeunload',onLeave);
    window.addEventListener('pagehide',onLeave);
    return ()=>{ clearInterval(beat); document.removeEventListener('visibilitychange',onVis); window.removeEventListener('beforeunload',onLeave); window.removeEventListener('pagehide',onLeave); setPresence(false); };
  },[team,session]);

  // authLoading removed — session is instant from sessionStorage

  return(
    <ThemeCtx.Provider value={{dark,toggle}}>
      <style>{CSS+`select option{background:${dark?'#0D0B24':'#fff'}!important;color:${dark?'#fff':'#1E1B4B'}}input::placeholder,textarea::placeholder{color:${dark?'rgba(255,255,255,.28)':'rgba(0,0,0,.35)'}}`}</style>
      <BgEl/>
      {toast&&<ToastEl msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
      {view==='splash'&&<SplashScreen onDone={()=>setView(v=>{
        if(v!=='splash') return v;
        if(session) return 'home';
        if(!SB.IS_LIVE) return 'home';
        return 'auth';
      })}/>}
      {view==='auth'&&<AuthPage onLogin={handleLogin} inviteToken={inviteToken}/>}
      {/* Safety net: logged-out live user on a non-auth/splash view would otherwise see a blank screen */}
      {SB.IS_LIVE && !session && view!=='auth' && view!=='splash' && <AuthPage onLogin={handleLogin} inviteToken={inviteToken}/>}
      {/* App views */}
      {(session||!SB.IS_LIVE)&&view==='home'&&<HomeView key={homeKey} session={session||{user:{email:'demo@standsync.app',user_metadata:{name:'Demo User'}}}} onSelectTeam={handleSelectTeam} onLogout={handleLogout} onSettings={()=>setView('settings')}/>}
      {(session||!SB.IS_LIVE)&&view==='settings'&&<SettingsPage session={session||{user:{email:'demo@standsync.app',user_metadata:{name:'Demo User'}}}} team={team} members={members} setMembers={setMembers} isManager={isManager} onBack={()=>setView(team?'standup':'home')} onSaved={d=>showToast('Profile saved')}/>}
      {(session||!SB.IS_LIVE)&&view==='standup'&&isManager&&<ManagerView canViewPerformance={canViewPerformance} myRole={myRole} session={session||{user:{email:userForView.email,user_metadata:{name:userForView.name}}}} team={team||{id:'demo',name:'xtransmatrix',standup_name:'Supa Daily Standup'}} tasks={tasks} members={members} history={history} standup={standup} onStatus={handleStatus} onPriority={handlePriority} onNote={handleNote} onAddTask={handleAddTask} onDeleteTask={handleDeleteTask} onBack={()=>{setHomeKey(k=>k+1);setView('home');}} onSettings={()=>setView('settings')} onLogout={handleLogout} emailBusy={emailBusy} onDigest={handleDigest} onEOD={handleEOD} messages={messages} onSendMessage={handleSendMessage} chatTheme={chatTheme} onChangeTheme={setChatTheme} setMembers={setMembers} openPip={openPip} pipOpen={pipOpen}/>}
      {/* PiP is a real popup window — no DOM element needed */}
      {(session||!SB.IS_LIVE)&&view==='standup'&&!isManager&&<ManagerView isManager={false} canViewPerformance={canViewPerformance} myRole={myRole} session={session||{user:{email:userForView.email,user_metadata:{name:userForView.name}}}} team={team||{id:'demo',name:'xtransmatrix',standup_name:'Supa Daily Standup'}} tasks={tasks} members={members} history={history} standup={standup} onStatus={handleStatus} onPriority={handlePriority} onNote={handleNote} onAddTask={handleAddTask} onDeleteTask={handleDeleteTask} onBack={()=>{setHomeKey(k=>k+1);setView('home');}} onSettings={()=>setView('settings')} onLogout={handleLogout} emailBusy={emailBusy} onDigest={handleDigest} onEOD={handleEOD} messages={messages} onSendMessage={handleSendMessage} chatTheme={chatTheme} onChangeTheme={setChatTheme} setMembers={setMembers} openPip={openPip} pipOpen={pipOpen}/>}
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
        <span style={{ fontSize:11,padding:'2px 8px',borderRadius:20,background:selectedNote?.type==='meeting'?'rgba(0,112,243,.12)':'rgba(52,211,153,.12)',color:selectedNote?.type==='meeting'?'#3B9EFF':'#34D399',fontWeight:600 }}>{selectedNote?.type==='meeting'?'📅 Meeting':'📁 Project'}</span>
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
// ─── BLOCKER INTELLIGENCE ─────────────────────────────────────────────────────
// Goes beyond listing blockers: groups by who/what is blocking, how long each has
// been stuck, which projects are affected, and an estimated delivery impact.
const BLOCKER_SOURCES = [
  { id: 'design', label: 'Design', re: /\bdesign(er|s)?\b/i },
  { id: 'eng', label: 'Engineering', re: /\b(eng|engineer(ing|s)?|dev(s|elopers?)?|backend|frontend|api)\b/i },
  { id: 'qa', label: 'QA / Testing', re: /\b(qa|test(ing|ers?)?|review(er|ers)?)\b/i },
  { id: 'product', label: 'Product', re: /\b(product|pm|spec|requirements?)\b/i },
  { id: 'client', label: 'Client', re: /\b(client|customer|stakeholder)\b/i },
  { id: 'data', label: 'Data / Access', re: /\b(data|access|credential|permission|api key|env)\b/i },
  { id: 'vendor', label: 'External / Vendor', re: /\b(vendor|third[- ]?party|external|supplier)\b/i },
];
function classifyBlocker(text, members) {
  if (!text) return { id: 'unspecified', label: 'Unspecified' };
  // explicit member name match first
  for (const m of (members || [])) {
    const first = (m.name || m.email.split('@')[0]).split(' ')[0];
    if (first && first.length > 2 && new RegExp('\\b' + first.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i').test(text)) {
      return { id: 'member:' + m.email, label: m.name || first };
    }
  }
  for (const s of BLOCKER_SOURCES) if (s.re.test(text)) return { id: s.id, label: s.label };
  return { id: 'other', label: 'Other dependency' };
}
function blockerAgeDays(t) {
  const ts = t.blocked_at ? new Date(t.blocked_at).getTime() : (t.created_at ? new Date(t.created_at).getTime() : null);
  if (!ts) return null;
  return Math.max(0, Math.floor((Date.now() - ts) / 864e5));
}

function BlockerIntelligence({ tasks, members }) {
  const c = useC();
  const blocked = (tasks || []).filter(t => t.status === 'blocked' || t.blocker);
  if (blocked.length === 0) return null;

  // group by source
  const groups = {};
  blocked.forEach(t => {
    const src = classifyBlocker(t.blocker || '', members);
    if (!groups[src.id]) groups[src.id] = { label: src.label, items: [] };
    groups[src.id].items.push(t);
  });
  const ranked = Object.values(groups).sort((a, b) => b.items.length - a.items.length);

  // longest-running
  const withAge = blocked.map(t => ({ t, age: blockerAgeDays(t) })).filter(x => x.age != null).sort((a, b) => b.age - a.age);
  const maxAge = withAge.length ? withAge[0].age : 0;

  // crude impact estimate: a blocker chain on critical/high work pushes delivery.
  // Estimate days ≈ longest open blocker age capped, weighted by how many are stuck.
  const impactDays = Math.max(1, Math.min(10, Math.round((maxAge || 1) * 0.6 + blocked.length * 0.4)));

  const topGroup = ranked[0];

  return (
    <Card style={{ padding: '18px 22px', marginBottom: 16, border: '1px solid rgba(239,68,68,.25)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 4 }}>
        <span style={{ fontSize: 16 }}>🧠</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: c.text }}>Blocker intelligence</span>
        <span style={{ fontSize: 11, color: '#DC2626', background: 'rgba(239,68,68,.1)', padding: '2px 9px', borderRadius: 20, fontWeight: 700 }}>{blocked.length} blocked</span>
      </div>

      {/* Headline insight */}
      {topGroup && (
        <div style={{ fontSize: 13.5, color: c.text, lineHeight: 1.6, margin: '8px 0 14px' }}>
          <strong style={{ color: '#DC2626' }}>{topGroup.items.length} task{topGroup.items.length !== 1 ? 's' : ''}</strong> blocked by <strong>{topGroup.label}</strong>.
          {maxAge >= 1 && <> Longest stuck for <strong>{maxAge} day{maxAge !== 1 ? 's' : ''}</strong>.</>}
          {' '}Potential impact: delivery delayed by <strong style={{ color: '#DC2626' }}>~{impactDays} day{impactDays !== 1 ? 's' : ''}</strong>.
        </div>
      )}

      {/* By source */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {ranked.map((g, i) => {
          const ages = g.items.map(blockerAgeDays).filter(a => a != null);
          const longest = ages.length ? Math.max(...ages) : null;
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 10, background: c.row }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#DC2626', flexShrink: 0 }}/>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: c.text }}>Blocked by {g.label}</div>
                <div style={{ fontSize: 11.5, color: c.mut, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {g.items.map(t => (t.assignee_name || t.assignee_email || '').split(' ')[0]).filter(Boolean).slice(0, 3).join(', ')}
                  {g.items.length > 3 ? ` +${g.items.length - 3} more` : ''} affected
                </div>
              </div>
              {longest != null && longest >= 1 && <span style={{ fontSize: 11, color: '#D97706', whiteSpace: 'nowrap' }}>{longest}d</span>}
              <span style={{ fontSize: 13, fontWeight: 800, color: '#DC2626', width: 22, textAlign: 'right' }}>{g.items.length}</span>
            </div>
          );
        })}
      </div>

      <p style={{ fontSize: 11, color: c.mut, marginTop: 12, lineHeight: 1.5 }}>Sources are detected from each blocker's description. Duration counts from when the blocker was reported. The delay estimate is a heuristic from the oldest blocker and how many are stuck — treat it as a directional signal.</p>
    </Card>
  );
}


function TeamAnalysisTab({ tasks, members, history = [], memberView = false }) {
  const c = useC();
  const total = tasks.length, done = tasks.filter(t => t.status === 'done').length;
  const inProg = tasks.filter(t => t.status === 'in-progress').length;
  const blocked = tasks.filter(t => t.status === 'blocked').length;
  const todo = tasks.filter(t => t.status === 'todo').length;
  const pct = total ? Math.round(done / total * 100) : 0;

  // Trend vs the previous standup (from history)
  const yd = history[0];
  const ydTasks = yd?.tasks || [];
  const ydPct = ydTasks.length ? Math.round(ydTasks.filter(t => t.status === 'done').length / ydTasks.length * 100) : null;
  const trend = ydPct == null ? null : pct - ydPct;

  // Alerts — things a leader needs to act on
  const blockedTasks = tasks.filter(t => t.status === 'blocked');
  const overdue = tasks.filter(t => t.status !== 'done' && /today|eod|noon|3 ?pm/i.test(t.timeline || '') && new Date().getHours() >= 17);
  const unassigned = tasks.filter(t => !t.assignee_email);
  const idleMembers = members.filter(m => !tasks.some(t => t.assignee_email === m.email));
  const criticalOpen = tasks.filter(t => t.priority === 'critical' && t.status !== 'done');

  const alerts = [];
  blockedTasks.forEach(t => alerts.push({ sev: 'high', icon: '🚧', text: 'Blocked: ' + t.title, who: (t.assignee_email || '').split('@')[0] }));
  criticalOpen.forEach(t => alerts.push({ sev: 'high', icon: '🔴', text: 'Critical open: ' + t.title, who: (t.assignee_email || '').split('@')[0] }));
  overdue.slice(0, 3).forEach(t => alerts.push({ sev: 'med', icon: '⏰', text: 'Past due: ' + t.title, who: (t.assignee_email || '').split('@')[0] }));
  if (unassigned.length) alerts.push({ sev: 'med', icon: '👤', text: unassigned.length + ' unassigned task' + (unassigned.length > 1 ? 's' : ''), who: '' });
  idleMembers.slice(0, 3).forEach(m => alerts.push({ sev: 'low', icon: '💤', text: (m.name || m.email.split('@')[0]) + ' has no tasks today', who: '' }));

  // Highlights — what's going well
  const highlights = [];
  if (pct >= 80 && total > 0) highlights.push("Strong day — " + pct + "% of today's tasks done");
  if (trend != null && trend > 0) highlights.push('Completion up ' + trend + '% vs last standup');
  if (blocked === 0 && total > 0) highlights.push('No blockers right now');
  const topMember = members.map(m => { const mt = tasks.filter(t => t.assignee_email === m.email); return { m, done: mt.filter(t => t.status === 'done').length, total: mt.length }; }).filter(x => x.total > 0).sort((a, b) => (b.done / b.total) - (a.done / a.total))[0];
  if (topMember && topMember.done > 0) highlights.push((topMember.m.name || topMember.m.email.split('@')[0]) + ' leading with ' + topMember.done + '/' + topMember.total + ' done');
  if (highlights.length === 0) highlights.push(total === 0 ? 'No tasks yet today — assign work to get started' : 'Day in progress — keep momentum going');

  const sevColor = (s) => s === 'high' ? '#EF4444' : s === 'med' ? '#F59E0B' : '#64748B';

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: c.text, marginBottom: 4 }}>📊 {memberView ? 'Team overview' : 'Executive summary'}</h2>
      <p style={{ fontSize: 12.5, color: c.mut, marginBottom: 18 }}>{memberView ? "How the whole team is tracking today — overall progress and momentum." : "A high-level snapshot of today — what needs attention and what's going well. Detailed per-member metrics live in Performance."}</p>

      {!memberView && <BlockerIntelligence tasks={tasks} members={members}/>}

      {/* Today at a glance — one hero strip (does NOT duplicate the Tasks tab cards) */}
      <Card style={{ padding: '20px 22px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ fontSize: 12, color: c.mut, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Today's completion</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span style={{ fontSize: 36, fontWeight: 800, color: pct >= 80 ? '#34D399' : pct >= 50 ? '#3B9EFF' : '#F97316' }}>{pct}%</span>
              {trend != null && <span style={{ fontSize: 13, fontWeight: 700, color: trend > 0 ? '#34D399' : trend < 0 ? '#F87171' : c.mut }}>{trend > 0 ? '▲' : trend < 0 ? '▼' : '–'} {Math.abs(trend)}% vs last</span>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 24 }}>
            {[{ l: 'Done', v: done, col: '#34D399' }, { l: 'Active', v: inProg, col: '#38BDF8' }, { l: 'To do', v: todo, col: '#94A3B8' }, { l: 'Blocked', v: blocked, col: blocked ? '#EF4444' : '#34D399' }].map(s => (
              <div key={s.l} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: s.col }}>{s.v}</div>
                <div style={{ fontSize: 10, color: c.mut, textTransform: 'uppercase', letterSpacing: '.05em' }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ marginTop: 16 }}><Bar pct={pct} h={8} color="linear-gradient(90deg,#0070F3,#34D399)"/></div>
      </Card>

      {/* Alerts + Highlights side by side (members see Highlights only — no per-person call-outs) */}
      <div style={{ display: 'grid', gridTemplateColumns: memberView ? '1fr' : '1fr 1fr', gap: 14 }}>
        {!memberView && <Card style={{ overflow: 'hidden' }}>
          <div style={{ padding: '13px 18px', borderBottom: '1px solid ' + c.bord, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: alerts.length ? '#EF4444' : '#34D399' }}/>
            <span style={{ fontSize: 13, fontWeight: 700, color: c.text }}>Needs attention</span>
            <span style={{ fontSize: 12, color: c.mut, marginLeft: 'auto' }}>{alerts.length}</span>
          </div>
          <div style={{ maxHeight: 320, overflowY: 'auto' }}>
            {alerts.length === 0 ? <div style={{ padding: '24px 18px', fontSize: 13, color: c.mut, textAlign: 'center' }}>✅ Nothing urgent. Team is on track.</div>
              : alerts.map((a, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 18px', borderBottom: i < alerts.length - 1 ? '1px solid ' + c.bord : 'none', borderLeft: '3px solid ' + sevColor(a.sev) }}>
                  <span style={{ fontSize: 15 }}>{a.icon}</span>
                  <span style={{ flex: 1, fontSize: 12.5, color: c.text }}>{a.text}</span>
                  {a.who && <span style={{ fontSize: 11, color: c.mut }}>{a.who}</span>}
                </div>
              ))}
          </div>
        </Card>}
        <Card style={{ overflow: 'hidden' }}>
          <div style={{ padding: '13px 18px', borderBottom: '1px solid ' + c.bord, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#34D399' }}/>
            <span style={{ fontSize: 13, fontWeight: 700, color: c.text }}>Highlights</span>
          </div>
          <div style={{ padding: '6px 0' }}>
            {highlights.map((h, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, padding: '11px 18px', fontSize: 12.5, color: c.sub, lineHeight: 1.5 }}>
                <span style={{ color: '#34D399', flexShrink: 0 }}>✦</span><span>{h}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
