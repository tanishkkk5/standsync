// src/lib/email.js — sends through the Vercel serverless function /api/send
// (server-side Resend call: no CORS, API key never exposed to the browser).
//
// Set RESEND_API_KEY in Vercel (server-side env, NOT REACT_APP_). The frontend
// no longer needs REACT_APP_RESEND_KEY for delivery — it just POSTs here.

const APP  = process.env.REACT_APP_URL || 'https://standsync-olive.vercel.app';
const FROM = 'StandSync <onboarding@resend.dev>';
// Where the serverless function lives. Same-origin in production.
const SEND_ENDPOINT = '/api/send';

// Returns { ok, id? , error? , demo? }
async function send({ to, subject, html }) {
  const toArr = Array.isArray(to) ? to : [to];
  try {
    const r = await fetch(SEND_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to: toArr, subject, html }),
    });
    const d = await r.json().catch(() => ({}));
    if (r.ok && d.ok) {
      console.log('[Email] sent to', toArr.join(', '), d.id ? '(' + d.id + ')' : '');
      return { ok: true, id: d.id };
    }
    // 500 with "RESEND_API_KEY not set" → behave like demo so the UI still works
    if (d.error && /RESEND_API_KEY/.test(d.error)) {
      console.warn('[Email] server key not set — running in demo mode (no real email).');
      return { ok: false, demo: true, error: d.error };
    }
    console.warn('[Email] send failed:', r.status, d.error || '');
    return { ok: false, error: d.error || ('HTTP ' + r.status) };
  } catch (e) {
    console.error('[Email] request failed:', e.message);
    return { ok: false, error: e.message };
  }
}

// ── HTML templates ────────────────────────────────────────────────────────────
const wrap = (body) => `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>*{box-sizing:border-box;margin:0;padding:0}body{background:#060412;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;padding:32px 16px}.w{max-width:560px;margin:0 auto}.logo{display:flex;align-items:center;gap:10px;margin-bottom:28px}.li{width:36px;height:36px;background:linear-gradient(135deg,#6366F1,#818CF8);border-radius:9px;display:inline-flex;align-items:center;justify-content:center}.ln{font-size:18px;font-weight:800;color:#fff}.card{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:24px 28px;margin-bottom:14px}h1{font-size:20px;font-weight:700;color:#fff;margin-bottom:5px}.sub{font-size:13px;color:rgba(255,255,255,.45);margin-bottom:18px}.task{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:9px;padding:11px 14px;margin-bottom:7px}.tt{font-size:13px;font-weight:600;color:rgba(255,255,255,.9);margin-bottom:4px}.badge{display:inline-block;font-size:10px;font-weight:700;letter-spacing:.05em;padding:2px 7px;border-radius:20px;text-transform:uppercase}.crit{background:rgba(239,68,68,.2);color:#F87171}.high{background:rgba(249,115,22,.2);color:#FB923C}.medium{background:rgba(245,158,11,.2);color:#FCD34D}.low{background:rgba(16,185,129,.2);color:#6EE7B7}.cta{display:inline-block;margin-top:16px;padding:11px 26px;background:linear-gradient(135deg,#6366F1,#818CF8);color:#fff;text-decoration:none;border-radius:9px;font-size:13px;font-weight:600}p{font-size:13px;color:rgba(255,255,255,.6);line-height:1.6;margin-bottom:10px}.foot{text-align:center;font-size:11px;color:rgba(255,255,255,.2);margin-top:20px}.ibox{background:rgba(99,102,241,.1);border:1px solid rgba(99,102,241,.3);border-radius:11px;padding:18px 22px;text-align:center;margin:12px 0}.iteam{font-size:19px;font-weight:700;color:#818CF8;margin:6px 0}</style>
</head><body><div class="w">
<div class="logo"><div class="li"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></div><div class="ln">StandSync</div></div>
${body}
<div class="foot">StandSync &middot; <a href="${APP}" style="color:#818CF8;text-decoration:none">Open app</a></div>
</div></body></html>`;

const taskHtml = (t) =>
  '<div class="task"><div class="tt">'+t.title+'</div>'+
  '<span class="badge '+(t.priority||'medium')+'">'+( t.priority||'medium')+'</span>'+
  (t.timeline?'<span style="font-size:11px;color:rgba(255,255,255,.4);background:rgba(255,255,255,.07);padding:2px 7px;border-radius:20px;margin-left:5px">'+t.timeline+'</span>':'')+
  (t.blocker?'<div style="margin-top:6px;font-size:12px;color:#F87171;background:rgba(239,68,68,.1);padding:5px 9px;border-radius:7px">Blocker: '+t.blocker+'</div>':'')+
  '</div>';

export async function sendMorningDigest(member, tasks, teamName) {
  const date = new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'});
  return send({
    to: member.email,
    subject: 'Your '+tasks.length+' tasks for today — '+date,
    html: wrap('<div class="card"><h1>Good morning, '+(member.name||member.email).split(' ')[0]+'!</h1><div class="sub">'+date+' &middot; '+teamName+'</div>'+(tasks.length?tasks.map(taskHtml).join(''):'<p>No tasks assigned yet today.</p>')+'<a href="'+APP+'" class="cta">Open StandSync &rarr;</a></div>'),
  });
}

export async function sendBlockerAlert(managerEmail, member, task) {
  return send({
    to: managerEmail,
    subject: 'Blocker: '+(member.name||member.email)+' is stuck on "'+task.title+'"',
    html: wrap('<div class="card"><h1 style="color:#F87171">Blocker reported</h1><div class="sub">'+(member.name||member.email)+' needs your help</div>'+taskHtml({...task,status:'blocked'})+'<a href="'+APP+'" class="cta" style="background:linear-gradient(135deg,#EF4444,#F97316)">Resolve in StandSync &rarr;</a></div>'),
  });
}

export async function sendEODBacklog(member, pending, teamName) {
  return send({
    to: member.email,
    subject: 'EOD: '+pending.length+' task'+(pending.length>1?'s':'')+' still pending',
    html: wrap('<div class="card"><h1>Still pending, '+(member.name||member.email).split(' ')[0]+'</h1><div class="sub">End of day &middot; '+teamName+'</div><p>Please update your task status before end of day.</p>'+pending.map(taskHtml).join('')+'<a href="'+APP+'" class="cta">Update tasks &rarr;</a></div>'),
  });
}

export async function sendManagerSummary(managerEmail, allTasks, members, teamName) {
  const date = new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'});
  const done = allTasks.filter(t=>t.status==='done').length;
  const pct  = allTasks.length?Math.round(done/allTasks.length*100):0;
  const blkd = allTasks.filter(t=>t.status==='blocked').length;
  const rows = members.map(m=>{
    const mt=allTasks.filter(t=>t.assignee_email===m.email);
    const md=mt.filter(t=>t.status==='done').length;
    const mp=mt.length?Math.round(md/mt.length*100):0;
    const fc=mp===100?'#34D399':mp>=50?'#818CF8':'#F97316';
    return '<div style="display:flex;align-items:center;gap:9px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.05)">'+
      '<div style="width:28px;height:28px;border-radius:50%;background:'+(m.color||'#818CF8')+'22;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:'+(m.color||'#818CF8')+'">'+((m.name||m.email).slice(0,2).toUpperCase())+'</div>'+
      '<div style="flex:1;font-size:13px;font-weight:600;color:#fff">'+(m.name||m.email)+'</div>'+
      '<span style="font-size:15px;font-weight:800;color:'+fc+'">'+mp+'%</span></div>';
  }).join('');
  return send({
    to: managerEmail,
    subject: 'EOD Summary — '+pct+'% done'+(blkd>0?' · '+blkd+' blocked':'')+' · '+date,
    html: wrap('<div class="card"><h1>EOD Summary</h1><div class="sub">'+date+' &middot; '+teamName+'</div><div style="background:rgba(255,255,255,.05);border-radius:9px;padding:11px 14px;margin-bottom:14px"><div style="display:flex;justify-content:space-between;font-size:13px;color:rgba(255,255,255,.5);margin-bottom:6px"><span>Team completion</span><span style="color:#818CF8;font-weight:700">'+pct+'%</span></div><div style="background:rgba(255,255,255,.08);border-radius:4px;height:5px"><div style="height:100%;border-radius:4px;background:linear-gradient(90deg,#6366F1,#34D399);width:'+pct+'%"></div></div></div>'+rows+'<a href="'+APP+'" class="cta">Open dashboard &rarr;</a></div>'),
  });
}

export async function sendInvite(toEmail, inviterName, teamName, inviteLink) {
  return send({
    to: toEmail,
    subject: inviterName+' invited you to join '+teamName+' on StandSync',
    html: wrap('<div class="card"><h1>You are invited!</h1><div class="sub">Join your team on StandSync</div><p><strong style="color:#fff">'+inviterName+'</strong> invited you to join:</p><div class="ibox"><div style="font-size:11px;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:.08em">Team</div><div class="iteam">'+teamName+'</div></div><div style="text-align:center;margin-top:16px"><a href="'+inviteLink+'" class="cta">Accept invite &amp; join &rarr;</a></div><div style="margin-top:12px;font-size:12px;color:rgba(255,255,255,.3)">This invite expires in 7 days.</div></div>'),
  });
}
