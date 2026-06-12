// src/views/LoginView.jsx
import { useState } from 'react';
import { TEAM } from '../lib/team';
import { Avatar, GlassCard, Button } from '../components/UI';

export default function LoginView({ onLogin }) {
  const [selected, setSelected] = useState(null);
  const [hovering, setHovering] = useState(null);

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '24px', position: 'relative', zIndex: 1,
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 48 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 13,
          background: 'linear-gradient(135deg, #6366F1, #818CF8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 32px rgba(99,102,241,0.4)',
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
        </div>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1 }}>StandSync</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 2 }}>xtransmatrix · daily standup</div>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <h1 style={{ margin: '0 0 10px', fontSize: 28, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>
          Who are you?
        </h1>
        <p style={{ margin: 0, color: 'rgba(255,255,255,0.4)', fontSize: 15 }}>
          Select your profile to enter today's standup
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, width: '100%', maxWidth: 620, marginBottom: 32 }}>
        {TEAM.map(member => {
          const isSelected = selected?.id === member.id;
          const isHover = hovering === member.id;
          return (
            <GlassCard
              key={member.id}
              onClick={() => setSelected(member)}
              onMouseEnter={() => setHovering(member.id)}
              onMouseLeave={() => setHovering(null)}
              style={{
                padding: '20px 16px', cursor: 'pointer', textAlign: 'center',
                border: isSelected
                  ? `1.5px solid ${member.color}88`
                  : isHover
                  ? '1px solid rgba(255,255,255,0.18)'
                  : '1px solid rgba(255,255,255,0.08)',
                background: isSelected
                  ? `${member.color}14`
                  : isHover
                  ? 'rgba(255,255,255,0.075)'
                  : 'rgba(255,255,255,0.045)',
                transform: isSelected ? 'translateY(-2px)' : isHover ? 'translateY(-1px)' : 'none',
                transition: 'all 0.2s',
                position: 'relative', overflow: 'hidden',
              }}
            >
              {isSelected && (
                <div style={{
                  position: 'absolute', top: 10, right: 10,
                  width: 18, height: 18, borderRadius: '50%',
                  background: member.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5l2.5 2.5L8 3" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
              {member.isManager && (
                <div style={{
                  position: 'absolute', top: 10, left: 10,
                  fontSize: 9, fontWeight: 700, letterSpacing: '0.06em',
                  color: member.color, background: member.color + '22',
                  padding: '2px 6px', borderRadius: 6, textTransform: 'uppercase',
                }}>
                  Manager
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10, marginTop: member.isManager ? 14 : 0 }}>
                <Avatar member={member} size={48} />
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 3, lineHeight: 1.3 }}>{member.name}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{member.email.split('@')[0]}</div>
            </GlassCard>
          );
        })}
      </div>

      <Button
        onClick={() => selected && onLogin(selected)}
        style={{
          padding: '12px 40px', fontSize: 15, borderRadius: 12,
          opacity: selected ? 1 : 0.4,
          cursor: selected ? 'pointer' : 'not-allowed',
          background: selected
            ? `linear-gradient(135deg, ${selected?.color || '#6366F1'}, ${selected?.color || '#818CF8'}cc)`
            : 'rgba(255,255,255,0.1)',
          border: 'none',
          boxShadow: selected ? `0 0 24px ${selected?.color || '#6366F1'}44` : 'none',
          transition: 'all 0.3s',
        }}
      >
        {selected ? `Enter as ${selected.name.split(' ')[0]}` : 'Select your profile'}
        {selected && (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
          </svg>
        )}
      </Button>

      <p style={{ marginTop: 24, fontSize: 12, color: 'rgba(255,255,255,0.2)', textAlign: 'center' }}>
        Supa Daily Standup · Mon–Sat 9:00 AM
      </p>
    </div>
  );
}
