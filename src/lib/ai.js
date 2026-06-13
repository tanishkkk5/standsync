// src/lib/ai.js
// Google Gemini  completely free, no credit card
// Get key: aistudio.google.com  Get API key  Create in new project
// Add to Vercel: REACT_APP_GEMINI_KEY = AIza...

const GEMINI_KEY = process.env.REACT_APP_GEMINI_KEY;
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

export async function askAI(userMsg, ctx) {
  const {
    tasks = [], members = [], history = [],
    teamName = 'Team', userName = 'User', myTasks = []
  } = ctx;

  const first = userName.split(' ')[0];
  const done  = tasks.filter(t => t.status === 'done').length;
  const blkd  = tasks.filter(t => t.status === 'blocked').length;
  const inProg= tasks.filter(t => t.status === 'in-progress').length;
  const pct   = tasks.length ? Math.round(done / tasks.length * 100) : 0;
  const myDone= myTasks.filter(t => t.status === 'done').length;
  const myPct = myTasks.length ? Math.round(myDone / myTasks.length * 100) : 0;

  if (!GEMINI_KEY) {
    return fallback(userMsg, { tasks, members, myTasks, done, blkd, pct, inProg, first, teamName, myDone, myPct });
  }

  const taskLines = tasks.slice(0, 15).map(t =>
    '[' + t.status + '][' + t.priority + '] ' + t.title +
    ' (' + (t.assignee_name||t.assignee_email) + ')' +
    (t.timeline ? ' due:' + t.timeline : '') +
    (t.blocker ? ' BLOCKED:' + t.blocker : '')
  ).join('\n');

  const myLines = myTasks.map(t =>
    '[' + t.status + '][' + t.priority + '] ' + t.title +
    (t.timeline ? ' due:' + t.timeline : '') +
    (t.blocker ? ' BLOCKED:' + t.blocker : '')
  ).join('\n');

  const memberLines = members.map(m => {
    const mt = tasks.filter(t => t.assignee_email === m.email);
    const md = mt.filter(t => t.status === 'done').length;
    return m.name + ' (' + m.role + '): ' + md + '/' + mt.length + ' done';
  }).join('\n');

  const prompt =
    'You are StandSync AI, a friendly and smart productivity assistant embedded in a daily standup tracker.\n\n' +
    'TODAY\'S DATA:\n' +
    'Team: ' + teamName + '\n' +
    'Talking to: ' + userName + '\n' +
    'Team: ' + pct + '% done (' + done + '/' + tasks.length + ' tasks, ' + inProg + ' in progress, ' + blkd + ' blocked)\n' +
    first + '\'s progress: ' + myPct + '% (' + myDone + '/' + myTasks.length + ' tasks done)\n\n' +
    (tasks.length ? 'All tasks:\n' + taskLines + '\n\n' : '') +
    (myTasks.length ? first + '\'s tasks:\n' + myLines + '\n\n' : '') +
    (members.length ? 'Team members:\n' + memberLines + '\n\n' : '') +
    'RULES:\n' +
    '- Respond naturally and warmly to casual messages (hi, thanks, how are you, etc.)\n' +
    '- Use real numbers from the data above when answering work questions\n' +
    '- NO markdown formatting  plain text only, no **bold** or *italic*\n' +
    '- Keep responses under 120 words\n' +
    '- Address person as ' + first + '\n' +
    '- Be encouraging and positive\n\n' +
    'Message: "' + userMsg + '"';

  try {
    const res = await fetch(GEMINI_URL + '?key=' + GEMINI_KEY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.8, maxOutputTokens: 300 },
      }),
    });
    const data = await res.json();
    if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
      return stripMd(data.candidates[0].content.parts[0].text);
    }
    if (data.error?.code === 429) {
      return 'Just a moment, ' + first + '  hitting the free rate limit (15 req/min). Try again in a moment!';
    }
  } catch(e) {}

  return fallback(userMsg, { tasks, members, myTasks, done, blkd, pct, inProg, first, teamName, myDone, myPct });
}

function stripMd(t) {
  return t
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/`(.+?)`/g, '$1')
    .replace(/^[-*]\s+/gm, '- ')
    .trim();
}

//  Smart fallback  works with zero API key 
function fallback(msg, { tasks, members, myTasks, done, blkd, pct, inProg, first, teamName, myDone, myPct }) {
  const l = msg.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  const has = (...terms) => terms.some(t => l.includes(t));
  const words = l.split(/\s+/);
  const hw = w => words.includes(w);

  // Greetings
  if (has('hi','hey','hello','hiya','morning','afternoon','evening','howdy','yo')) {
    const hour = new Date().getHours();
    const g = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    const snap = myTasks.length
      ? first + ', you have ' + myTasks.length + ' task' + (myTasks.length>1?'s':'') + ' today  ' + myDone + ' done' + (myPct===100?'!' : ', ' + (myTasks.length-myDone) + ' to go.')
      : 'No tasks added yet today.';
    return g + ', ' + first + '! ' + snap + ' What can I help you with?';
  }

  // How are you  catches typos like "how are yuo"
  if (
    has('how are','how r u','hows it','whats up','wassup','you good','u good','how you') ||
    (hw('how') && (hw('are') || hw('r') || hw('you')))
  ) {
    const mood = pct>=80 ? 'Things are going great' : pct>=40 ? 'Making solid progress' : tasks.length===0 ? 'All quiet so far' : 'Getting started';
    return 'Doing well, ' + first + '! ' + mood + ' on the ' + teamName + ' board  ' + pct + '% complete' + (blkd>0 ? ', ' + blkd + ' blocker' + (blkd>1?'s':'') + ' to watch' : ', no blockers') + '. How can I help?';
  }

  // Thanks
  if (has('thanks','thank you','thx','ty','cheers','awesome','great','amazing','nice','cool','perfect')) {
    const opts = [
      'You are welcome, ' + first + '! Keep up the great work!',
      'Anytime, ' + first + '! Happy to help.',
      'Of course, ' + first + '! That is what I am here for.',
    ];
    return opts[Math.floor(Math.random() * opts.length)];
  }

  // Bye
  if (has('bye','goodbye','see you','cya','later','good night','take care')) {
    return 'See you later, ' + first + '! ' + (myPct===100 ? 'All tasks done  great work today!' : (myTasks.length-myDone) + ' task' + (myTasks.length-myDone!==1?'s':'') + ' still pending. Do not forget!');
  }

  // Priority / focus
  if (has('priority','focus','what should','most important','start with','work on')) {
    const crit = myTasks.filter(t => t.priority==='critical' && t.status!=='done');
    const high = myTasks.filter(t => t.priority==='high' && t.status!=='done');
    if (crit.length) return 'Top priority right now, ' + first + ':\n\n' + crit.map(t => '- ' + t.title + ' (Critical)' + (t.timeline?' due '+t.timeline:'') + (t.blocker?'\n  Blocker: '+t.blocker:'')).join('\n\n') + (high.length ? '\n\nAlso high: ' + high.slice(0,2).map(t=>'- '+t.title).join(', ') : '');
    if (high.length) return 'Focus on these, ' + first + ':\n\n' + high.map(t => '- ' + t.title + (t.timeline?' (due '+t.timeline+')':'')).join('\n');
    const todo = myTasks.filter(t => t.status!=='done');
    if (todo.length) return 'No critical tasks! Next up:\n\n' + todo.slice(0,3).map((t,i) => (i+1)+'. '+t.title+' ('+t.priority+')').join('\n');
    return 'All clear, ' + first + '! No pending tasks  you are fully done today!';
  }

  // My progress
  if (has('my progress','how am i','my status','my tasks','am i done')) {
    return 'Your progress today, ' + first + ':\n\nDone: ' + myDone + '/' + myTasks.length + ' (' + myPct + '%)\nIn progress: ' + myTasks.filter(t=>t.status==='in-progress').length + '\nTo do: ' + myTasks.filter(t=>t.status==='todo').length + '\nBlocked: ' + myTasks.filter(t=>t.status==='blocked').length + '\n\n' + (myPct===100 ? 'All done  excellent work!' : myPct>=50 ? 'Solid progress, keep going!' : 'You have got this  push through!');
  }

  // Team overview
  if (has('team','everyone','overall','whole team','how is team')) {
    const top = members.map(m => { const mt=tasks.filter(t=>t.assignee_email===m.email); const md=mt.filter(t=>t.status==='done').length; return {name:m.name,pct:mt.length?Math.round(md/mt.length*100):0}; }).sort((a,b)=>b.pct-a.pct)[0];
    return 'Team overview for ' + teamName + ':\n\nTotal: ' + tasks.length + ' tasks\nDone: ' + done + ' (' + pct + '%)\nIn progress: ' + inProg + '\nBlocked: ' + blkd + (blkd>0?'\n\nBlockers need attention!':'\n\nNo blockers  running smoothly!') + (top ? '\n\nLeading today: ' + top.name + ' (' + top.pct + '%)' : '');
  }

  // Blockers
  if (has('block','stuck','issue','impediment','obstacle','problem')) {
    const bl = tasks.filter(t => t.status==='blocked');
    if (!bl.length) return 'No blockers right now, ' + first + '! The team is running smoothly.';
    return 'Current blockers (' + bl.length + '):\n\n' + bl.map(t => '- ' + t.title + '\n  Assigned to: ' + (t.assignee_name||t.assignee_email) + '\n  Reason: ' + (t.blocker||'Not specified')).join('\n\n') + '\n\nThese need attention.';
  }

  // Summary
  if (has('summary','standup','report','brief','update','today','overview')) {
    return 'Standup summary:\n\nTeam: ' + teamName + '\nCompletion: ' + pct + '% (' + done + '/' + tasks.length + ')\nIn progress: ' + inProg + '\nBlocked: ' + blkd + '\n\nYour progress, ' + first + ': ' + myDone + '/' + myTasks.length + ' (' + myPct + '%)\n\n' + (blkd>0 ? blkd + ' blocker' + (blkd>1?'s':'') + ' need attention!' : pct>=80 ? 'Great day  nearly done!' : 'Good progress  keep going!');
  }

  // Leaderboard
  if (has('leaderboard','best','top performer','rank','performing','who done')) {
    const ranked = members.map(m => { const mt=tasks.filter(t=>t.assignee_email===m.email); const md=mt.filter(t=>t.status==='done').length; return {name:m.name||m.email, pct:mt.length?Math.round(md/mt.length*100):0, total:mt.length}; }).sort((a,b)=>b.pct-a.pct);
    if (!ranked.length) return 'No data yet, ' + first + '. Add tasks to start tracking performance!';
    return 'Performance today:\n\n' + ranked.map((m,i) => (i===0?'1st':i===1?'2nd':i===2?'3rd':(i+1)+'th') + ' - ' + m.name + ' (' + m.pct + '%, ' + m.total + ' tasks)').join('\n') + (ranked[0] ? '\n\n' + ranked[0].name + ' is leading at ' + ranked[0].pct + '%!' : '');
  }

  // Default
  const ctx2 = myTasks.length===0 ? 'No tasks added yet today.'
    : myPct===100 ? 'You have completed all ' + myTasks.length + ' tasks today!'
    : 'You have ' + (myTasks.length-myDone) + ' of ' + myTasks.length + ' tasks still pending.';

  return 'Hi ' + first + '! ' + ctx2 + '\n\nI can help with:\n- What to focus on today\n- Your task progress\n- Team overview\n- Current blockers\n- Standup summary\n- Leaderboard\n\nWhat would you like to know?';
}
