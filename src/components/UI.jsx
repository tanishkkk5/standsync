// src/components/UI.jsx
import { TEAM, getPriority, getStatus } from '../lib/team';

export function Avatar({ member, size = 36 }) {
  if (!member) return null;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: member.color + '22',
      border: `2px solid ${member.color}55`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.33, fontWeight: 700, color: member.color,
      flexShrink: 0, fontFamily: 'inherit', letterSpacing: '-0.01em',
    }}>
      {member.initials}
    </div>
  );
}

export function PriorityBadge({ priority }) {
  const p = getPriority(priority);
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
      background: p.bg, color: p.color,
      padding: '3px 8px', borderRadius: 20,
      textTransform: 'uppercase', whiteSpace: 'nowrap',
      border: `1px solid ${p.color}33`,
    }}>
      {p.label}
    </span>
  );
}

export function StatusBadge({ status }) {
  const s = getStatus(status);
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
      background: s.bg, color: s.color,
      padding: '3px 8px', borderRadius: 20,
      textTransform: 'uppercase', whiteSpace: 'nowrap',
      border: `1px solid ${s.color}33`,
    }}>
      {s.label}
    </span>
  );
}

export function GlassCard({ children, style = {}, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: 'rgba(255,255,255,0.055)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 16,
      transition: 'border-color 0.2s, background 0.2s',
      ...style,
    }}>
      {children}
    </div>
  );
}

export function Spinner({ size = 32, color = '#818CF8' }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      border: `2.5px solid rgba(255,255,255,0.1)`,
      borderTop: `2.5px solid ${color}`,
      animation: 'spin 0.75s linear infinite',
      flexShrink: 0,
    }} />
  );
}

export function AnimatedBg() {
  const orbs = [
    { w: 500, h: 500, top: '-120px', left: '-80px', color: '#4F46E5', dur: 9 },
    { w: 400, h: 400, top: '20%', right: '-60px', color: '#0EA5E9', dur: 12 },
    { w: 300, h: 300, bottom: '5%', left: '15%', color: '#7C3AED', dur: 10 },
    { w: 250, h: 250, top: '55%', right: '20%', color: '#059669', dur: 14 },
    { w: 160, h: 160, top: '12%', left: '42%', color: '#EC4899', dur: 8 },
  ];
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(145deg, #080614 0%, #0D0B24 30%, #0A1628 65%, #070D1E 100%)' }} />
      {orbs.map((o, i) => (
        <div key={i} style={{
          position: 'absolute', width: o.w, height: o.h, borderRadius: '50%',
          background: `radial-gradient(circle, ${o.color}28, transparent 70%)`,
          top: o.top, left: o.left, right: o.right, bottom: o.bottom,
          animation: `orbFloat ${o.dur}s ease-in-out infinite alternate`,
          animationDelay: `${i * 1.3}s`,
        }} />
      ))}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.025,
        backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
        backgroundSize: '44px 44px',
      }} />
    </div>
  );
}

export function Input({ style = {}, ...props }) {
  return (
    <input {...props} style={{
      width: '100%', background: 'rgba(255,255,255,0.07)',
      border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10,
      padding: '10px 14px', color: '#fff', fontSize: 14,
      outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
      transition: 'border-color 0.2s',
      ...style,
    }}
    onFocus={e => e.target.style.borderColor = 'rgba(129,140,248,0.6)'}
    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.12)'}
    />
  );
}

export function Select({ children, style = {}, ...props }) {
  return (
    <select {...props} style={{
      width: '100%', background: 'rgba(255,255,255,0.07)',
      border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10,
      padding: '10px 12px', color: '#fff', fontSize: 13,
      outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
      cursor: 'pointer',
      ...style,
    }}>
      {children}
    </select>
  );
}

export function Button({ children, variant = 'primary', style = {}, ...props }) {
  const variants = {
    primary: { background: 'linear-gradient(135deg, #6366F1, #818CF8)', color: '#fff', border: 'none' },
    ghost: { background: 'transparent', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.15)' },
    danger: { background: 'rgba(239,68,68,0.15)', color: '#F87171', border: '1px solid rgba(239,68,68,0.3)' },
    success: { background: 'linear-gradient(135deg, #059669, #34D399)', color: '#fff', border: 'none' },
  };
  return (
    <button {...props} style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      gap: 6, padding: '9px 18px', borderRadius: 10, fontSize: 13,
      fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
      transition: 'all 0.15s', ...variants[variant], ...style,
    }}>
      {children}
    </button>
  );
}

export function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
      color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase',
      marginBottom: 6,
    }}>
      {children}
    </div>
  );
}
