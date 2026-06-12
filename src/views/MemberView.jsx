// src/views/MemberView.jsx
import { useState, useEffect } from 'react';
import { PRIORITIES, STATUSES, getPriority, getStatus, TEAM } from '../lib/team';
import { Avatar, GlassCard, PriorityBadge, StatusBadge, Button, Input, Select, SectionLabel, Spinner } from '../components/UI';

const TIMELINE_PRESETS = [
  'Today EOD (6 PM)',
  'Today noon (12 PM)',
  'Today 3 PM',
  'Tomorrow morning',
  'Tomorrow EOD',
  'This week',
  'Custom…',
];

function TaskForm({ member, standupId, onSubmit }) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('medium');
  const [timeline, setTimeline] = useState('');
  const [timelineCustom, setTimelineCustom] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCustom, setShowCustom] = useState(false);

  const handleTimeline = (val) => {
    if (val === 'Custom…') { setShowCustom(true); setTimeline(''); }
    else { setShowCustom(false); setTimeline(val); }
  };

  const handleSubmit = async () => {
    const t = title.trim();
    if (!t) return;
    setLoading(true);
    await onSubmit({
      standup_id: standupId,
      title: t,
      assignee_email: member.email,
      assignee_name: member.name,
      priority,
      status: 'todo',
      timeline: showCustom ? timelineCustom : timeline,
      notes,
    });
    setTitle(''); setPriority('medium'); setTimeline(''); setNotes('');
    setShowCustom(false); setTimelineCustom('');
    setLoading(false);
  };

  return (
    <GlassCard style={{ padding: '22px 24px', marginBottom: 16 }}>
      <SectionLabel>Add a task assigned to you</SectionLabel>
      <Input
        value={title}
        onChange={e => setTitle(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSubmit()}
        placeholder="What were you assigned in the standup?"
        style={{ marginBottom: 14 }}
        autoFocus
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: showCustom ? 12 : 14 }}>
        <div>
          <SectionLabel>Priority</SectionLabel>
          <Select value={priority} onChange={e => setPriority(e.target.value)}>
            {PRIORITIES.map(p => <option key={p.value} value={p.value} style={{ background: '#0D0B24' }}>{p.label}</option>)}
          </Select>
        </div>
        <div>
          <SectionLabel>I'll finish by</SectionLabel>
          <Select value={showCustom ? 'Custom…' : timeline} onChange={e => handleTimeline(e.target.value)}>
            <option value="" style={{ background: '#0D0B24' }}>Select timeline…</option>
            {TIMELINE_PRESETS.map(t => <option key={t} value={t} style={{ background: '#0D0B24' }}>{t}</option>)}
          </Select>
        </div>
      </div>

      {showCustom && (
        <Input
          value={timelineCustom}
          onChange={e => setTimelineCustom(e.target.value)}
          placeholder="e.g. Wednesday 2pm, Friday EOD…"
          style={{ marginBottom: 14 }}
        />
      )}

      <Input
        value={notes}
        onChange={e => setNotes(e.target.value)}
        placeholder="Any blockers or notes? (optional)"
        style={{ marginBottom: 16 }}
      />

      <Button
        onClick={handleSubmit}
        style={{ width: '100%', padding: '11px', fontSize: 14, justifyContent: 'center',
          background: `linear-gradient(135deg, ${member.color}cc, ${member.color})`,
          boxShadow: `0 4px 20px ${member.color}33`,
        }}
        disabled={loading || !title.trim()}
      >
        {loading ? <Spinner size={18} color="#fff" /> : <>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Submit task
        </>}
      </Button>
    </GlassCard>
  );
}

function MyTaskCard({ task, onUpdateStatus, onUpdateNote }) {
  const [showNote, setShowNote] = useState(false);
  const [note, setNote] = useState(task.notes || '');
  const p = getPriority(task.priority);
  const s = getStatus(task.status);

  const nextStatus = { 'todo': 'in-progress', 'in-progress': 'done', 'done': 'todo', 'blocked': 'in-progress' };
  const nextLabel = { 'todo': 'Start', 'in-progress': 'Mark done', 'done': 'Reopen', 'blocked': 'Unblock' };

  return (
    <GlassCard style={{
      marginBottom: 10, overflow: 'hidden',
      border: task.status === 'done' ? '1px solid rgba(52,211,153,0.2)' : '1px solid rgba(255,255,255,0.08)',
    }}>
      <div style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <button
            onClick={() => onUpdateStatus(task.id, nextStatus[task.status])}
            style={{
              width: 22, height: 22, borderRadius: '50%', flexShrink: 0, marginTop: 1,
              border: `2px solid ${task.status === 'done' ? '#34D399' : 'rgba(255,255,255,0.2)'}`,
              background: task.status === 'done' ? '#34D399' : 'transparent',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s',
            }}
          >
            {task.status === 'done' && (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2 5l2.5 2.5L8 3" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: 14, color: task.status === 'done' ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.9)',
              textDecoration: task.status === 'done' ? 'line-through' : 'none',
              marginBottom: 6, lineHeight: 1.4,
            }}>
              {task.title}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <PriorityBadge priority={task.priority} />
              <StatusBadge status={task.status} />
              {task.timeline && (
                <span style={{
                  fontSize: 10, color: 'rgba(255,255,255,0.4)',
                  background: 'rgba(255,255,255,0.07)', padding: '3px 8px',
                  borderRadius: 20, display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                  {task.timeline}
                </span>
              )}
              {task.manager_note && (
                <span style={{
                  fontSize: 10, color: '#818CF8',
                  background: 'rgba(129,140,248,0.12)', padding: '3px 8px',
                  borderRadius: 20, border: '1px solid rgba(129,140,248,0.25)',
                }}>
                  📌 Manager note
                </span>
              )}
            </div>
            {task.manager_note && (
              <div style={{
                marginTop: 8, padding: '8px 12px', borderRadius: 8,
                background: 'rgba(129,140,248,0.08)', border: '1px solid rgba(129,140,248,0.2)',
                fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5,
              }}>
                <span style={{ color: '#818CF8', fontWeight: 600 }}>Tanisk: </span>{task.manager_note}
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ padding: '0 16px 12px', display: 'flex', gap: 8, alignItems: 'center' }}>
        <button
          onClick={() => onUpdateStatus(task.id, nextStatus[task.status])}
          style={{
            fontSize: 11, padding: '5px 12px', borderRadius: 8,
            border: `1px solid ${s.color}44`,
            background: s.bg, color: s.color,
            cursor: 'pointer', fontWeight: 600,
          }}
        >
          {nextLabel[task.status]}
        </button>
        <button
          onClick={() => onUpdateStatus(task.id, 'blocked')}
          style={{
            fontSize: 11, padding: '5px 12px', borderRadius: 8,
            border: '1px solid rgba(239,68,68,0.3)',
            background: 'rgba(239,68,68,0.08)', color: '#F87171',
            cursor: 'pointer',
            display: task.status === 'blocked' ? 'none' : 'block',
          }}
        >
          Blocked
        </button>
        <button
          onClick={() => setShowNote(!showNote)}
          style={{
            fontSize: 11, padding: '5px 12px', borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'transparent', color: 'rgba(255,255,255,0.4)',
            cursor: 'pointer', marginLeft: 'auto',
          }}
        >
          {showNote ? 'Hide note' : 'Add note'}
        </button>
      </div>

      {showNote && (
        <div style={{ padding: '0 16px 14px', display: 'flex', gap: 8 }}>
          <Input
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Add a note or blocker detail…"
            style={{ flex: 1 }}
          />
          <Button
            onClick={() => { onUpdateNote(task.id, note); setShowNote(false); }}
            style={{ padding: '9px 14px', flexShrink: 0 }}
          >Save</Button>
        </div>
      )}
    </GlassCard>
  );
}

export default function MemberView({ user, tasks, standupId, onAddTask, onUpdateStatus, onUpdateNote, onLogout, liveCount }) {
  const myTasks = tasks.filter(t => t.assignee_email === user.email);
  const done = myTasks.filter(t => t.status === 'done').length;
  const pct = myTasks.length ? Math.round((done / myTasks.length) * 100) : 0;
  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      {/* Header */}
      <div style={{
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        background: 'rgba(8,6,20,0.7)', backdropFilter: 'blur(20px)',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 20px', height: 58, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: 'linear-gradient(135deg, #6366F1, #818CF8)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </div>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>StandSync</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#34D399', boxShadow: '0 0 6px #34D399' }} />
            {liveCount} online
          </div>

          <Avatar member={user} size={32} />
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>{user.name.split(' ')[0]}</span>
          <button onClick={onLogout} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: 12, padding: '4px 8px' }}>
            Switch
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '28px 20px 60px' }}>
        {/* Greeting */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#34D399', boxShadow: '0 0 8px #34D399' }} />
            <span style={{ fontSize: 11, color: '#34D399', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Live standup · {today}</span>
          </div>
          <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>
            Good morning, {user.name.split(' ')[0]} 👋
          </h1>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>
            Add the tasks Tanisk assigned to you in the standup
          </p>
        </div>

        {/* Progress if has tasks */}
        {myTasks.length > 0 && (
          <GlassCard style={{ padding: '14px 18px', marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>Your progress today</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: user.color }}>{pct}% · {done}/{myTasks.length} done</span>
            </div>
            <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: pct + '%',
                background: `linear-gradient(90deg, ${user.color}88, ${user.color})`,
                borderRadius: 4, transition: 'width 0.5s ease',
              }} />
            </div>
          </GlassCard>
        )}

        {/* Add task form */}
        <TaskForm member={user} standupId={standupId} onSubmit={onAddTask} />

        {/* My tasks */}
        {myTasks.length > 0 && (
          <>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: 10, marginTop: 4 }}>
              Your tasks today ({myTasks.length})
            </div>
            {myTasks.map(t => (
              <MyTaskCard key={t.id} task={t} onUpdateStatus={onUpdateStatus} onUpdateNote={onUpdateNote} />
            ))}
          </>
        )}

        {myTasks.length === 0 && (
          <GlassCard style={{ padding: '32px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
            <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>No tasks yet — add what Tanisk assigned to you above</div>
          </GlassCard>
        )}
      </div>
    </div>
  );
}
