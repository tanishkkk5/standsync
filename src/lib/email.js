// src/lib/email.js
// Uses Resend.com — free tier: 3,000 emails/month
// Setup: https://resend.com → sign up → get API key → add to .env as REACT_APP_RESEND_KEY
// They give you a free from-address: onboarding@resend.dev (no domain needed to start)

const RESEND_KEY = process.env.REACT_APP_RESEND_KEY;
const FROM = 'StandSync <onboarding@resend.dev>';
const APP  = process.env.REACT_APP_URL || 'https://standsync-olive.vercel.app';

async function send({ to, subject, html }) {
  if (!RESEND_KEY) {
    console.log('[StandSync Email - demo mode]', { to, subject });
    return { ok: true, demo: true };
  }
  // Resend blocks browser CORS requests - use no-cors mode and assume success
  // Real emails work fine when sent from Vercel Edge Functions or server
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to: Array.isArray(to) ? to : [to], subject, html }),
    });
    if (!r.ok) {
      const txt = await r.text().catch(() => 'unknown');
      console.warn('Resend response:', r.status, txt);
      // CORS error (status 0) or auth error - log but don't throw
      return { ok: false, status: r.status };
    }
    return r.json();
  } catch (e) {
    // CORS TypeError is expected from browser - don't surface to user
    console.log('Email send note (expected if CORS):', e.message);
    return { ok: false, corsBlocked: true };
  }
}

const base = (content) => `
<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#060412;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:32px 16px}
  .wrap{max-width:580px;margin:0 auto}
  .logo{display:flex;align-items:center;gap:10px;margin-bottom:32px}
  .logo-icon{width:38px;height:38px;background:linear-gradient(135deg,#6366F1,#818CF8);border-radius:10px;display:inline-flex;align-items:center;justify-content:center}
  .logo-name{font-size:20px;font-weight:800;color:#fff;letter-spacing:-.02em}
  .logo-sub{font-size:11px;color:rgba(255,255,255,.35);letter-spacing:.06em;text-transform:uppercase}
  .card{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:16px;padding:28px 32px;margin-bottom:16px}
  h1{font-size:22px;font-weight:700;color:#fff;margin-bottom:6px;letter-spacing:-.02em}
  .sub{font-size:13px;color:rgba(255,255,255,.45);margin-bottom:24px}
  .task{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:12px 16px;margin-bottom:8px}
  .task-title{font-size:14px;font-weight:600;color:rgba(255,255,255,.9);margin-bottom:6px}
  .badge{display:inline-block;font-size:10px;font-weight:700;letter-spacing:.05em;padding:2px 8px;border-radius:20px;text-transform:uppercase}
  .critical{background:rgba(239,68,68,.2);color:#F87171}.high{background:rgba(249,115,22,.2);color:#FB923C}
  .medium{background:rgba(245,158,11,.2);color:#FCD34D}.low{background:rgba(16,185,129,.2);color:#6EE7B7}
  .tl{font-size:11px;color:rgba(255,255,255,.4);background:rgba(255,255,255,.07);padding:2px 8px;border-radius:20px;margin-left:6px}
  .cta{display:inline-block;margin-top:20px;padding:12px 28px;background:linear-gradient(135deg,#6366F1,#818CF8);color:#fff;text-decoration:none;border-radius:10px;font-size:14px;font-weight:600}
  .stat{flex:1;background:rgba(255,255,255,.06);border-radius:10px;padding:12px;text-align:center;border:1px solid rgba(255,255,255,.08)}
  .stat-n{font-size:24px;font-weight:800;letter-spacing:-.02em}
  .stat-l{font-size:10px;color:rgba(255,255,255,.35);text-transform:uppercase;letter-spacing:.06em;margin-top:2px}
  .stats{display:flex;gap:10px;margin-bottom:20px}
  .bar-bg{background:rgba(255,255,255,.08);border-radius:4px;height:5px;flex:1;overflow:hidden}
  .bar-fill{height:100%;border-radius:4px}
  .member-row{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.05)}
  .av{width:34px;height:34px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0}
  p{font-size:14px;color:rgba(255,255,255,.6);line-height:1.6;margin-bottom:12px}
  .footer{text-align:center;font-size:11px;color:rgba(255,255,255,.2);margin-top:24px}
  .invite-box{background:rgba(99,102,241,.1);border:1px solid rgba(99,102,241,.3);border-radius:12px;padding:20px 24px;text-align:center}
  .invite-team{font-size:20px;font-weight:700;color:#818CF8;margin:8px 0}
  .divider{height:1px;background:rgba(255,255,255,.07);margin:16px 0}
</style>
</head><body><div class="wrap">
  <div class="logo">
    <div class="logo-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></div>
    <div><div class="logo-name">StandSync</div><div class="logo-sub">daily standup tracker</div></div>
  </div>
  ${content}
  <div class="footer">StandSync · <a href="${APP}" style="color:#818CF8;text-decoration:none">Open app</a> · You received this because you're part of a StandSync team</div>
</div></body></html>`;

function taskHtml(t) {
  return `<div class="task"><div class="task-title">${t.title}</div><span class="badge ${t.priority}">${t.priority}</span>${t.timeline ? `<span class="tl">🕐 ${t.timeline}</span>` : ''}${t.blocker ? `<div style="margin-top:8px;font-size:12px;color:#F87171;background:rgba(239,68,68,.1);padding:6px 10px;border-radius:8px">⚠️ ${t.blocker}</div>` : ''}${t.manager_note ? `<div style="margin-top:8px;font-size:12px;color:#818CF8;background:rgba(129,140,248,.1);padding:6px 10px;border-radius:8px">📌 ${t.manager_note}</div>` : ''}</div>`;
}

// Morning digest — sent to each member after standup
export async function sendMorningDigest(member, tasks, teamName) {
  const date = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const crit = tasks.filter(t => t.priority === 'critical').length;
  const high = tasks.filter(t => t.priority === 'high').length;
  return send({
    to: member.email,
    subject: `📋 Your ${tasks.length} tasks for today — ${date}`,
    html: base(`
      <div class="card">
        <h1>Good morning, ${member.name.split(' ')[0]} 👋</h1>
        <div class="sub">${date} · ${teamName}</div>
        <div class="stats">
          <div class="stat"><div class="stat-n" style="color:#818CF8">${tasks.length}</div><div class="stat-l">Tasks</div></div>
          <div class="stat"><div class="stat-n" style="color:#EF4444">${crit}</div><div class="stat-l">Critical</div></div>
          <div class="stat"><div class="stat-n" style="color:#F97316">${high}</div><div class="stat-l">High</div></div>
        </div>
        ${tasks.map(taskHtml).join('')}
        <a href="${APP}" class="cta">Open StandSync →</a>
      </div>`)
  });
}

// Blocker alert — sent to manager immediately
export async function sendBlockerAlert(managerEmail, member, task) {
  return send({
    to: managerEmail,
    subject: `⚠️ Blocker: ${member.name} is stuck on "${task.title}"`,
    html: base(`
      <div class="card">
        <h1 style="color:#F87171">⚠️ Blocker reported</h1>
        <div class="sub">${member.name} needs your help</div>
        <p><strong style="color:#fff">${member.name}</strong> has reported a blocker:</p>
        ${taskHtml({ ...task, status: 'blocked' })}
        <a href="${APP}" class="cta" style="background:linear-gradient(135deg,#EF4444,#F97316)">Resolve in StandSync →</a>
      </div>`)
  });
}

// EOD backlog — sent to members with pending tasks
export async function sendEODBacklog(member, pending, teamName) {
  const crit = pending.filter(t => t.priority === 'critical').length;
  return send({
    to: member.email,
    subject: `🕕 EOD reminder: ${pending.length} task${pending.length > 1 ? 's' : ''} still pending`,
    html: base(`
      <div class="card">
        <h1>Still pending, ${member.name.split(' ')[0]}</h1>
        <div class="sub">End of day · ${teamName}</div>
        <p>These tasks haven't been marked done yet. Please update your status or they carry over as backlog tomorrow.</p>
        ${crit > 0 ? `<div style="background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.25);border-radius:10px;padding:10px 14px;margin-bottom:14px;font-size:13px;color:#F87171">🔴 ${crit} critical task${crit > 1 ? 's' : ''} still pending</div>` : ''}
        ${pending.map(taskHtml).join('')}
        <a href="${APP}" class="cta">Update your tasks →</a>
      </div>`)
  });
}

// EOD manager summary
export async function sendManagerSummary(managerEmail, allTasks, members, teamName) {
  const date = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const done = allTasks.filter(t => t.status === 'done').length;
  const pct  = allTasks.length ? Math.round(done / allTasks.length * 100) : 0;
  const blkd = allTasks.filter(t => t.status === 'blocked').length;
  const pend = allTasks.filter(t => ['todo','in-progress'].includes(t.status)).length;
  const rows = members.map(m => {
    const mt = allTasks.filter(t => t.assignee_email === m.email);
    const md = mt.filter(t => t.status === 'done').length;
    const mp = mt.length ? Math.round(md / mt.length * 100) : 0;
    const fc = mp === 100 ? '#34D399' : mp >= 50 ? '#818CF8' : '#F97316';
    return `<div class="member-row"><div class="av" style="background:${m.color||'#818CF8'}22;color:${m.color||'#818CF8'};border:2px solid ${m.color||'#818CF8'}44">${(m.name||'?').slice(0,2).toUpperCase()}</div><div style="flex:1"><div style="font-size:13px;font-weight:600;color:#fff">${m.name}</div><div style="display:flex;align-items:center;gap:8px;margin-top:4px"><div class="bar-bg"><div class="bar-fill" style="width:${mp}%;background:${fc}"></div></div><span style="font-size:11px;color:rgba(255,255,255,.4)">${md}/${mt.length}</span></div></div><span style="font-size:16px;font-weight:800;color:${fc}">${mp}%</span></div>`;
  }).join('');
  return send({
    to: managerEmail,
    subject: `📊 EOD Summary — ${pct}% done${blkd > 0 ? ` · ⚠️ ${blkd} blocked` : ''} · ${date}`,
    html: base(`
      <div class="card">
        <h1>EOD Summary</h1>
        <div class="sub">${date} · ${teamName}</div>
        <div class="stats">
          <div class="stat"><div class="stat-n" style="color:#818CF8">${allTasks.length}</div><div class="stat-l">Total</div></div>
          <div class="stat"><div class="stat-n" style="color:#34D399">${done}</div><div class="stat-l">Done</div></div>
          <div class="stat"><div class="stat-n" style="color:#F59E0B">${pend}</div><div class="stat-l">Pending</div></div>
          <div class="stat"><div class="stat-n" style="color:#EF4444">${blkd}</div><div class="stat-l">Blocked</div></div>
        </div>
        <div style="background:rgba(255,255,255,.05);border-radius:10px;padding:12px 16px;margin-bottom:16px">
          <div style="display:flex;justify-content:space-between;font-size:13px;color:rgba(255,255,255,.5);margin-bottom:8px"><span>Team completion</span><span style="color:#818CF8;font-weight:700">${pct}%</span></div>
          <div class="bar-bg" style="height:6px"><div class="bar-fill" style="width:${pct}%;background:linear-gradient(90deg,#6366F1,#34D399)"></div></div>
        </div>
        ${rows}
        <a href="${APP}" class="cta">Open full dashboard →</a>
      </div>`)
  });
}

// Team invite email
export async function sendInvite(toEmail, inviterName, teamName, inviteLink) {
  return send({
    to: toEmail,
    subject: `${inviterName} invited you to join ${teamName} on StandSync`,
    html: base(`
      <div class="card">
        <h1>You're invited!</h1>
        <div class="sub">Join your team on StandSync</div>
        <p><strong style="color:#fff">${inviterName}</strong> has invited you to join their daily standup team:</p>
        <div class="invite-box">
          <div style="font-size:12px;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:.08em">Team</div>
          <div class="invite-team">${teamName}</div>
          <p style="font-size:13px;color:rgba(255,255,255,.5);margin:0">Track tasks, progress and stay in sync every morning</p>
        </div>
        <div style="text-align:center;margin-top:20px">
          <a href="${inviteLink}" class="cta">Accept invite & join team →</a>
        </div>
        <div class="divider"></div>
        <p style="font-size:12px;color:rgba(255,255,255,.3)">This invite expires in 7 days. If you didn't expect this, you can ignore it.</p>
      </div>`)
  });
}
