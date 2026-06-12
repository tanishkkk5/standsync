// src/views/ManagerView.jsx
import { useState } from 'react';
import { MEMBERS, TEAM, getPriority, getStatus } from '../lib/team';
import { Avatar, GlassCard, PriorityBadge, StatusBadge, Button, Input, Select, SectionLabel, Spinner } from '../components/UI';

const TABS = [
  { id: 'live',    label: 'Live board',  icon: '⚡' },
  { id: 'team',   label: 'Team view',   icon: '👥' },
  { id: 'history',label: 'History',     icon: '📅' },
];

// ── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, color, sub }) {
  return (
    <GlassCard style={{ padding: '16px 20px' }}>
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color, letterSpacing: '-0.02em', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>{sub}</div>}
    </GlassCard>
  );
}

// ── Task row in live board ───────────────────────────────────────────────────
function TaskRow({ task, onPriorityChange, onStatusChange, onManagerNote }) {
  const [showNote, setShowNote] = useState(false);
  const [note, setNote] = useState(task.manager_note || '');
  const member = TEAM.find(m => m.email === task.assignee_email);
  const p = getPriority(task.priority);

  return (
    <div style={{
      borderBottom: '1px solid rgba(255,255,255,0.05)',
      transition: 'background 0.15s',
    }}
    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px' }}>
        {/* Status toggle */}
        <button
          onClick={() => {
            const next = { 'todo': 'in-progress', 'in-progress': 'done', 'done': 'todo', 'blocked': 'todo' };
            onStatusChange(task.id, next[task.status]);
          }}
          style={{
            width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
            border: `2px solid ${task.status === 'done' ? '#34D399' : 'rgba(255,255,255,0.2)'}`,
            background: task.status === 'done' ? '#34D399' : 'transparent',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s',
          }}
        >
          {task.status === 'done' && (
            <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
              <path d="M2 5l2.5 2.5L8 3" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>

        {/* Priority dot */}
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, flexShrink: 0 }} />

        {/* Title */}
        <span style={{
          flex: 1, fontSize: 13, lineHeight: 1.4,
          color: task.status === 'done' ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.88)',
          textDecoration: task.status === 'done' ? 'line-through' : 'none',
        }}>
          {task.title}
        </span>

        {/* Timeline */}
        {task.timeline && (
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 3 }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            {task.timeline}
          </span>
        )}

        {/* Assignee */}
        {member && <Avatar member={member} size={26} />}

        {/* Status badge */}
        <StatusBadge status={task.status} />

        {/* Priority select */}
        <select
          value={task.priority}
          onChange={e => onPriorityChange(task.id, e.target.value)}
          style={{
            background: 'transparent', border: 'none', color: p.color,
            fontSize: 11, cursor: 'pointer', outline: 'none', fontWeight: 700,
            letterSpacing: '0.04em', textTransform: 'uppercase',
          }}
        >
          {['critical','high','medium','low'].map(v => <option key={v} value={v} style={{ background: '#0D0B24', color: '#fff' }}>{v}</option>)}
        </select>

        {/* Note button */}
        <button
          onClick={() => setShowNote(!showNote)}
          title="Add manager note"
          style={{
            background: task.manager_note ? 'rgba(129,140,248,0.15)' : 'transparent',
            border: task.manager_note ? '1px solid rgba(129,140,248,0.3)' : '1px solid rgba(255,255,255,0.1)',
            borderRadius: 6, cursor: 'pointer', padding: '4px 6px',
            color: task.manager_note ? '#818CF8' : 'rgba(255,255,255,0.3)',
            fontSize: 12,
          }}
        >
          📌
        </button>
      </div>

      {showNote && (
        <div style={{ padding: '0 16px 12px 54px', display: 'flex', gap: 8 }}>
          <Input
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Add a note for this team member…"
            style={{ flex: 1, fontSize: 13 }}
          />
          <Button onClick={() => { onManagerNote(task.id, note); setShowNote(false); }} style={{ padding: '9px 14px', flexShrink: 0 }}>
            Save
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Live board tab ────────────────────────────────────────────────────────────
function LiveBoard({ tasks, onPriorityChange, onStatusChange, onManagerNote }) {
  const [filter, setFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  const filtered = tasks
    .filter(t => filter === 'all' || t.assignee_email === filter)
    .filter(t => priorityFilter === 'all' || t.priority === priorityFilter);

  const todo = tasks.filter(t => t.status === 'todo').length;
  const inProg = tasks.filter(t => t.status === 'in-progress').length;
  const done = tasks.filter(t => t.status === 'done').length;
  const blocked = tasks.filter(t => t.status === 'blocked').length;
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

  return (
    <div>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
        <StatCard label="Total" value={tasks.length} color="#818CF8" />
        <StatCard label="To do" value={todo} color="#94A3B8" />
        <StatCard label="In progress" value={inProg} color="#38BDF8" />
        <StatCard label="Done" value={done} color="#34D399" />
        <StatCard label="Blocked" value={blocked} color="#EF4444" sub={blocked > 0 ? 'needs attention' : 'all clear'} />
      </div>

      {/* Overall progress */}
      {tasks.length > 0 && (
        <GlassCard style={{ padding: '14px 18px', marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>Team progress</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#818CF8' }}>{pct}%</span>
          </div>
          <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: pct + '%',
              background: 'linear-gradient(90deg, #6366F1, #34D399)',
              borderRadius: 4, transition: 'width 0.6s ease',
            }} />
          </div>
        </GlassCard>
      )}

      {/* Filters + task list */}
      <GlassCard style={{ overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {[{ id: 'all', label: 'All members' }, ...MEMBERS.map(m => ({ id: m.email, label: m.name.split(' ')[0] }))].map(f => (
              <button key={f.id} onClick={() => setFilter(f.id)} style={{
                fontSize: 12, padding: '5px 12px', borderRadius: 20,
                border: '1px solid rgba(255,255,255,0.12)',
                background: filter === f.id ? 'rgba(129,140,248,0.2)' : 'transparent',
                color: filter === f.id ? '#818CF8' : 'rgba(255,255,255,0.45)',
                cursor: 'pointer', fontWeight: filter === f.id ? 600 : 400,
                transition: 'all 0.15s',
              }}>{f.label}</button>
            ))}
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            {[{ id: 'all', label: 'All' }, ...['critical','high','medium','low'].map(v => ({ id: v, label: v }))].map(f => (
              <button key={f.id} onClick={() => setPriorityFilter(f.id)} style={{
                fontSize: 11, padding: '4px 10px', borderRadius: 20,
                border: '1px solid rgba(255,255,255,0.1)',
                background: priorityFilter === f.id ? 'rgba(255,255,255,0.1)' : 'transparent',
                color: 'rgba(255,255,255,0.4)',
                cursor: 'pointer', textTransform: 'capitalize',
                fontWeight: priorityFilter === f.id ? 600 : 400,
              }}>{f.label}</button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: 14 }}>
            {tasks.length === 0 ? 'Waiting for team members to add their tasks…' : 'No tasks match this filter'}
          </div>
        ) : (
          filtered.map(t => (
            <TaskRow
              key={t.id} task={t}
              onPriorityChange={onPriorityChange}
              onStatusChange={onStatusChange}
              onManagerNote={onManagerNote}
            />
          ))
        )}
      </GlassCard>
    </div>
  );
}

// ── Team view tab ─────────────────────────────────────────────────────────────
function TeamBoard({ tasks }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
      {MEMBERS.map(member => {
        const mt = tasks.filter(t => t.assignee_email === member.email);
        const done = mt.filter(t => t.status === 'done').length;
        const pct = mt.length ? Math.round((done / mt.length) * 100) : 0;
        const hasBlocked = mt.some(t => t.status === 'blocked');

        return (
          <GlassCard key={member.id} style={{
            padding: '18px 20px',
            border: hasBlocked ? '1px solid rgba(239,68,68,0.25)' : '1px solid rgba(255,255,255,0.08)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <Avatar member={member} size={42} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{member.name}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{member.email}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: member.color }}>{pct}%</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{done}/{mt.length}</div>
              </div>
            </div>

            <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden', marginBottom: 12 }}>
              <div style={{
                height: '100%', width: pct + '%',
                background: `linear-gradient(90deg, ${member.color}66, ${member.color})`,
                borderRadius: 3, transition: 'width 0.5s ease',
              }} />
            </div>

            {mt.length === 0 ? (
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', textAlign: 'center', padding: '8px 0' }}>
                No tasks submitted yet
              </div>
            ) : (
              mt.slice(0, 4).map(t => (
                <div key={t.id} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)',
                }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: getPriority(t.priority).color, flexShrink: 0 }} />
                  <span style={{
                    flex: 1, fontSize: 12, lineHeight: 1.3,
                    color: t.status === 'done' ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.7)',
                    textDecoration: t.status === 'done' ? 'line-through' : 'none',
                  }}>{t.title}</span>
                  <StatusBadge status={t.status} />
                </div>
              ))
            )}
            {mt.length > 4 && (
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', textAlign: 'center', marginTop: 6 }}>
                +{mt.length - 4} more tasks
              </div>
            )}
            {hasBlocked && (
              <div style={{ marginTop: 8, padding: '6px 10px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', fontSize: 11, color: '#F87171' }}>
                ⚠️ Has blocked tasks — follow up needed
              </div>
            )}
          </GlassCard>
        );
      })}
    </div>
  );
}

// ── History tab ───────────────────────────────────────────────────────────────
function HistoryTab({ pastStandups }) {
  const [open, setOpen] = useState(null);
  const fmt = d => new Date(d + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  if (pastStandups.length === 0) {
    return (
      <GlassCard style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>📅</div>
        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>Historical data will appear here after your first standup</div>
      </GlassCard>
    );
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        <StatCard label="Days tracked" value={pastStandups.length} color="#818CF8" />
        <StatCard label="Total tasks completed" value={pastStandups.reduce((a, s) => a + (s.tasks?.filter(t => t.status === 'done').length || 0), 0)} color="#34D399" />
        <StatCard label="Avg per standup" value={Math.round(pastStandups.reduce((a, s) => a + (s.tasks?.length || 0), 0) / pastStandups.length)} color="#F472B6" />
      </div>

      {pastStandups.map(standup => {
        const isOpen = open === standup.id;
        const t = standup.tasks || [];
        const done = t.filter(x => x.status === 'done').length;
        return (
          <GlassCard key={standup.id} style={{ marginBottom: 10, overflow: 'hidden' }}>
            <button onClick={() => setOpen(isOpen ? null : standup.id)} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 12,
              padding: '14px 18px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#fff',
            }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: done === t.length && t.length > 0 ? '#34D399' : '#818CF8', flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 14, fontWeight: 500, textAlign: 'left' }}>{fmt(standup.date)}</span>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.07)', padding: '2px 10px', borderRadius: 20 }}>
                {done}/{t.length} done
              </span>
              <span style={{ color: 'rgba(255,255,255,0.3)', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', fontSize: 16 }}>⌃</span>
            </button>
            {isOpen && (
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                {t.map(task => {
                  const member = TEAM.find(m => m.email === task.assignee_email);
                  return (
                    <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 18px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: getPriority(task.priority).color, flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: 12, color: task.status === 'done' ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.7)', textDecoration: task.status === 'done' ? 'line-through' : 'none' }}>{task.title}</span>
                      {task.timeline && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>{task.timeline}</span>}
                      {member && <Avatar member={member} size={22} />}
                      <StatusBadge status={task.status} />
                    </div>
                  );
                })}
              </div>
            )}
          </GlassCard>
        );
      })}
    </div>
  );
}

// ── Main Manager View ─────────────────────────────────────────────────────────
export default function ManagerView({ user, tasks, pastStandups, onPriorityChange, onStatusChange, onManagerNote, onLogout, liveCount }) {
  const [tab, setTab] = useState('live');
  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const time = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  return (
    <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      {/* Header */}
      <div style={{
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        background: 'rgba(8,6,20,0.75)', backdropFilter: 'blur(24px)',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginRight: 6 }}>
            <div style={{ width: 30, height: 30, borderRadius: 9, background: 'linear-gradient(135deg, #6366F1, #818CF8)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 16px rgba(99,102,241,0.4)' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </div>
            <span style={{ fontSize: 16, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>StandSync</span>
          </div>

          <nav style={{ display: 'flex', gap: 2, flex: 1 }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                padding: '6px 14px', borderRadius: 8, border: 'none',
                background: tab === t.id ? 'rgba(129,140,248,0.18)' : 'transparent',
                color: tab === t.id ? '#818CF8' : 'rgba(255,255,255,0.4)',
                cursor: 'pointer', fontSize: 13, fontWeight: tab === t.id ? 600 : 400,
                display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s',
              }}>
                <span>{t.icon}</span> {t.label}
              </button>
            ))}
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#34D399', boxShadow: '0 0 6px #34D399' }} />
              {liveCount} online
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{today}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>{time}</div>
            </div>
            <Avatar member={user} size={30} />
            <div style={{ fontSize: 12 }}>
              <span style={{ color: '#818CF8', fontWeight: 600 }}>Manager</span>
              <span style={{ color: 'rgba(255,255,255,0.25)', margin: '0 4px' }}>·</span>
              <button onClick={onLogout} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: 12, padding: 0 }}>Switch</button>
            </div>
          </div>
        </div>
      </div>

      {/* Page title */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 24px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#34D399', boxShadow: '0 0 8px #34D399' }} />
          <span style={{ fontSize: 11, color: '#34D399', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Live · Supa daily standup</span>
        </div>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>
          Good morning, Tanisk 👋
        </h1>
        <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>
          Watching {MEMBERS.length} team members · {tasks.length} tasks submitted today
        </p>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 48px' }}>
        {tab === 'live' && <LiveBoard tasks={tasks} onPriorityChange={onPriorityChange} onStatusChange={onStatusChange} onManagerNote={onManagerNote} />}
        {tab === 'team' && <TeamBoard tasks={tasks} />}
        {tab === 'history' && <HistoryTab pastStandups={pastStandups} />}
      </div>
    </div>
  );
}
