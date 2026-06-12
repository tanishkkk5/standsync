// src/App.jsx
import { useState, useEffect, useCallback } from 'react';
import { supabase, getTodayString, getOrCreateStandup, getTasksForStandup, addTask, updateTask, getPastStandups, subscribeToTasks } from './lib/supabase';
import { AnimatedBg, Spinner } from './components/UI';
import LoginView from './views/LoginView';
import MemberView from './views/MemberView';
import ManagerView from './views/ManagerView';

// ── Demo/offline mode when Supabase isn't configured ─────────────────────────
const DEMO_MODE = !process.env.REACT_APP_SUPABASE_URL ||
  process.env.REACT_APP_SUPABASE_URL === 'YOUR_SUPABASE_URL';

let demoTasks = [
  { id: 'demo1', standup_id: 'demo', title: 'Fix dashboard loading bug', assignee_email: 'deepak.nr@xtransmatrix.com', assignee_name: 'Deepak NR', priority: 'high', status: 'in-progress', timeline: 'Today EOD (6 PM)', notes: '', manager_note: '', created_at: new Date().toISOString() },
  { id: 'demo2', standup_id: 'demo', title: 'Write unit tests for auth module', assignee_email: 'madhan.m@xtransmatrix.com', assignee_name: 'Madhan M', priority: 'medium', status: 'todo', timeline: 'Today 3 PM', notes: '', manager_note: '', created_at: new Date().toISOString() },
  { id: 'demo3', standup_id: 'demo', title: 'Update figma designs for v2 screens', assignee_email: 'monica@xtransmatrix.com', assignee_name: 'Monica M', priority: 'medium', status: 'done', timeline: 'Today noon (12 PM)', notes: '', manager_note: '', created_at: new Date().toISOString() },
  { id: 'demo4', standup_id: 'demo', title: 'Review PR #47 — payment integration', assignee_email: 'sandhya.a@xtransmatrix.com', assignee_name: 'Sandhya A', priority: 'high', status: 'todo', timeline: 'Today EOD (6 PM)', notes: 'Waiting for Deepak to merge first', manager_note: '', created_at: new Date().toISOString() },
  { id: 'demo5', standup_id: 'demo', title: 'QA regression on mobile checkout', assignee_email: 'zeeba.kauser@xtransmatrix.com', assignee_name: 'Zeeba Kauser', priority: 'critical', status: 'blocked', timeline: 'Today 3 PM', notes: 'Blocked — need staging credentials', manager_note: '', created_at: new Date().toISOString() },
];

let demoListeners = [];
function demoNotify() { demoListeners.forEach(fn => fn([...demoTasks])); }

export default function App() {
  const [user, setUser] = useState(null);
  const [standup, setStandup] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [pastStandups, setPastStandups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [liveCount] = useState(Math.floor(Math.random() * 3) + 2); // simulated

  // ── Init standup on login ────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    const init = async () => {
      setLoading(true);

      if (DEMO_MODE) {
        setStandup({ id: 'demo', date: getTodayString() });
        setTasks([...demoTasks]);
        const past = [
          { id: 'p1', date: '2026-06-11', tasks: demoTasks.map(t => ({ ...t, status: 'done' })) },
          { id: 'p2', date: '2026-06-10', tasks: demoTasks.slice(0, 3).map(t => ({ ...t, status: 'done' })) },
          { id: 'p3', date: '2026-06-09', tasks: demoTasks.slice(0, 4).map(t => ({ ...t, status: 'done' })) },
        ];
        setPastStandups(past);
        setLoading(false);
        return;
      }

      // Real Supabase path
      const today = getTodayString();
      const sd = await getOrCreateStandup(today);
      setStandup(sd);

      const [t, past] = await Promise.all([
        getTasksForStandup(sd.id),
        getPastStandups(20),
      ]);
      setTasks(t);
      setPastStandups(past.filter(p => p.date !== today));
      setLoading(false);
    };

    init();
  }, [user]);

  // ── Real-time subscription ───────────────────────────────────────────────
  useEffect(() => {
    if (!standup || !user) return;

    if (DEMO_MODE) {
      const listener = (newTasks) => setTasks(newTasks);
      demoListeners.push(listener);
      return () => { demoListeners = demoListeners.filter(l => l !== listener); };
    }

    const channel = subscribeToTasks(standup.id, (payload) => {
      const { eventType, new: newRow, old: oldRow } = payload;
      setTasks(prev => {
        if (eventType === 'INSERT') return [...prev, newRow];
        if (eventType === 'UPDATE') return prev.map(t => t.id === newRow.id ? newRow : t);
        if (eventType === 'DELETE') return prev.filter(t => t.id !== oldRow.id);
        return prev;
      });
    });

    return () => { supabase.removeChannel(channel); };
  }, [standup, user]);

  // ── Actions ──────────────────────────────────────────────────────────────
  const handleAddTask = useCallback(async (taskData) => {
    if (DEMO_MODE) {
      const newTask = { id: 'demo' + Date.now(), ...taskData, manager_note: '', created_at: new Date().toISOString() };
      demoTasks = [...demoTasks, newTask];
      demoNotify();
      return;
    }
    await addTask(taskData);
    // Real-time subscription handles state update
  }, []);

  const handleUpdateStatus = useCallback(async (id, status) => {
    const updates = { status, ...(status === 'done' ? { completed_at: new Date().toISOString() } : {}) };
    if (DEMO_MODE) {
      demoTasks = demoTasks.map(t => t.id === id ? { ...t, ...updates } : t);
      demoNotify();
      return;
    }
    await updateTask(id, updates);
  }, []);

  const handlePriorityChange = useCallback(async (id, priority) => {
    if (DEMO_MODE) {
      demoTasks = demoTasks.map(t => t.id === id ? { ...t, priority } : t);
      demoNotify();
      return;
    }
    await updateTask(id, { priority });
  }, []);

  const handleManagerNote = useCallback(async (id, manager_note) => {
    if (DEMO_MODE) {
      demoTasks = demoTasks.map(t => t.id === id ? { ...t, manager_note } : t);
      demoNotify();
      return;
    }
    await updateTask(id, { manager_note });
  }, []);

  const handleUpdateNote = useCallback(async (id, notes) => {
    if (DEMO_MODE) {
      demoTasks = demoTasks.map(t => t.id === id ? { ...t, notes } : t);
      demoNotify();
      return;
    }
    await updateTask(id, { notes });
  }, []);

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
        @keyframes orbFloat {
          from { transform: translate(0, 0) scale(1); }
          to   { transform: translate(16px, 22px) scale(1.08); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        input, select, textarea, button { font-family: inherit; }
        input::placeholder, textarea::placeholder { color: rgba(255,255,255,0.28); }
        select option { background: #0D0B24 !important; color: #fff; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 3px; }
        .fade-up { animation: fadeUp 0.35s ease both; }
        .fade-in { animation: fadeIn 0.25s ease both; }
      `}</style>

      <AnimatedBg />

      {/* Demo mode banner */}
      {DEMO_MODE && (
        <div style={{
          position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.35)',
          borderRadius: 10, padding: '8px 18px', zIndex: 9999,
          fontSize: 12, color: '#FCD34D', backdropFilter: 'blur(12px)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span>⚡</span>
          <span>Demo mode · <strong>Add Supabase keys to .env for real persistence & sync</strong></span>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <Spinner size={40} />
        </div>
      )}

      {/* Views */}
      {!user && <LoginView onLogin={setUser} />}
      {user && !loading && user.isManager && (
        <ManagerView
          user={user}
          tasks={tasks}
          pastStandups={pastStandups}
          onPriorityChange={handlePriorityChange}
          onStatusChange={handleUpdateStatus}
          onManagerNote={handleManagerNote}
          onLogout={() => setUser(null)}
          liveCount={liveCount}
        />
      )}
      {user && !loading && !user.isManager && (
        <MemberView
          user={user}
          tasks={tasks}
          standupId={standup?.id}
          onAddTask={handleAddTask}
          onUpdateStatus={handleUpdateStatus}
          onUpdateNote={handleUpdateNote}
          onLogout={() => setUser(null)}
          liveCount={liveCount}
        />
      )}
    </>
  );
}
