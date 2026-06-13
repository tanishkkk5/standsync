// src/lib/ai.js — Google Gemini (free) with smart fallback
// Get free key: aistudio.google.com → Get API key (no credit card needed)

const GEMINI_KEY = process.env.REACT_APP_GEMINI_KEY;
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

export async function askAI(userMessage, context) {
  const { tasks = [], members = [], history = [], teamName = 'Team', userName = 'User', myTasks = [] } = context;

  const today = new Date().toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
  const done = tasks.filter(t => t.status === 'done').length;
  const blocked = tasks.filter(t => t.status === 'blocked').length;
  const inProg = tasks.filter(t => t.status === 'in-progress').length;
  const pct = tasks.length ? Math.round(done / tasks.length * 100) : 0;
  const myDone = myTasks.filter(t => t.status === 'done').length;
  const myPct = myTasks.length ? Math.round(myDone / myTasks.length * 100) : 0;

  const taskSummary = tasks.slice(0, 20).map(t =>
    `- [${t.status}][${t.priority}] ${t.title} → ${t.assignee_name}${t.timeline ? ` due:${t.timeline}` : ''}${t.blocker ? ` BLOCKED:${t.blocker}` : ''}`
  ).join('\n');

  const memberSummary = members.map(m => {
    const mt = tasks.filter(t => t.assignee_email === m.email);
    const md = mt.filter(t => t.status === 'done').length;
    return `- ${m.name}(${m.role}): ${md}/${mt.length} done${mt.some(t=>t.status==='blocked')?' [BLOCKED]':''}`;
  }).join('\n');

  const myTasksSummary = myTasks.map(t =>
    `- [${t.status}][${t.priority}] ${t.title}${t.timeline?` due:${t.timeline}`:''}${t.blocker?` BLOCKED:${t.blocker}`:''}`
  ).join('\n');

  const prompt = `You are StandSync AI, a friendly and smart productivity assistant inside a daily standup tracker app.

Context:
- Today: ${today}
- Team: ${teamName}
- You are talking to: ${userName}
- Team completion: ${pct}% (${done}/${tasks.length} tasks done, ${inProg} in progress, ${blocked} blocked)
- ${userName}'s personal progress: ${myPct}% (${myDone}/${myTasks.length} done)

${tasks.length > 0 ? `All team tasks:\n${taskSummary}` : 'No tasks added yet today.'}

${members.length > 0 ? `Team members:\n${memberSummary}` : ''}

${myTasks.length > 0 ? `${userName}'s tasks:\n${myTasksSummary}` : `${userName} has no tasks yet today.`}

${history.length > 0 ? `Past standups tracked: ${history.length}` : ''}

RULES:
- You are a helpful, warm assistant — not just a data reader
- For casual messages (hi, hey, how are you, what's up, good morning, thanks, etc.) respond naturally and warmly like a friendly colleague would, then briefly mention their work context
- For work questions give specific, data-driven answers using the actual numbers above
- NEVER use markdown formatting like **bold** or *italic* — use plain text only
- Use emojis naturally to make responses feel alive
- Keep responses concise — under 150 words unless a detailed breakdown is specifically asked for
- Always address the person by their first name (${userName.split(' ')[0]})
- Be encouraging and positive

User message: "${userMessage}"`;

  if (!GEMINI_KEY) {
    return smartFallback(userMessage, { tasks, members, myTasks, done, blocked, pct, inProg, userName, teamName, myDone, myPct });
  }

  try {
    const response = await fetch(`${GEMINI_URL}?key=${GEMINI_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.8, maxOutputTokens: 400, topP: 0.9 },
      }),
    });

    const data = await response.json();

    if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
      // Strip any markdown that sneaks through
      return stripMarkdown(data.candidates[0].content.parts[0].text);
    }

    if (data.error?.code === 429) {
      return `⏳ Just a sec ${userName.split(' ')[0]} — hitting the free rate limit (15 req/min). Try again in a moment!`;
    }

    if (data.error) {
      console.error('Gemini error:', data.error.message);
    }

    return smartFallback(userMessage, { tasks, members, myTasks, done, blocked, pct, inProg, userName, teamName, myDone, myPct });
  } catch (e) {
    console.error('AI error:', e);
    return smartFallback(userMessage, { tasks, members, myTasks, done, blocked, pct, inProg, userName, teamName, myDone, myPct });
  }
}

// Strips markdown formatting from AI responses
function stripMarkdown(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')   // **bold** → bold
    .replace(/\*(.+?)\*/g, '$1')        // *italic* → italic
    .replace(/#{1,6}\s/g, '')            // ## headers
    .replace(/`(.+?)`/g, '$1')           // `code`
    .replace(/\[(.+?)\]\(.+?\)/g, '$1') // [links](url)
    .trim();
}

// Smart fallback — handles casual + work messages without an API key
function smartFallback(msg, { tasks, members, myTasks, done, blocked, pct, inProg, userName, teamName, myDone, myPct }) {
  const lower = msg.toLowerCase().trim();
  const first = userName.split(' ')[0];

  // ── Casual / social messages ───────────────────────────────────────────────
  const greetings = ['hi', 'hello', 'hey', 'hiya', 'yo', 'sup', 'good morning', 'morning', 'good afternoon', 'good evening'];
  const howAreYou = ['how are you', 'how r u', 'hows it going', 'how\'s it going', 'whats up', 'what\'s up', 'wassup', 'wazzup', 'how do you do'];
  const thanks = ['thanks', 'thank you', 'thankyou', 'thx', 'ty', 'great', 'awesome', 'nice', 'cool', 'perfect', 'good job', 'well done'];
  const jokes = ['joke', 'funny', 'laugh', 'humor', 'make me laugh'];
  const bored = ['bored', 'boring', 'nothing to do', 'free time'];
  const bye = ['bye', 'goodbye', 'see you', 'cya', 'later', 'gotta go', 'ttyl'];

  if (greetings.some(g => lower === g || lower.startsWith(g + ' ') || lower.startsWith(g + '!'))) {
    const hour = new Date().getHours();
    const timeGreet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    const snap = myTasks.length > 0
      ? `You've got ${myTasks.length} task${myTasks.length>1?'s':''} today — ${myDone} done${myPct===100?' 🎉 All finished!':`, ${myTasks.length-myDone} still pending.`}`
      : `No tasks added yet today — you\'re all clear! 😎`;
    return `${timeGreet}, ${first}! 👋 Great to see you.\n\n${snap}\n\nAsk me anything about your work, the team, or what to focus on!`;
  }

  if (howAreYou.some(g => lower.includes(g))) {
    const status = pct >= 80 ? 'Things are going great' : pct >= 50 ? 'Making steady progress' : tasks.length === 0 ? 'All quiet so far' : 'Still getting started';
    return `Doing well, ${first}! 😊 ${status} on the ${teamName} board today — ${pct}% complete with ${blocked > 0 ? `${blocked} blocker${blocked > 1 ? 's' : ''} to watch out for` : 'no blockers, which is great'}.\n\nHow can I help you today?`;
  }

  if (thanks.some(g => lower.includes(g))) {
    const encouragements = [
      `You're welcome, ${first}! 😊 Keep up the great work!`,
      `Anytime, ${first}! 🙌 You're doing great — ${myPct}% of your tasks done!`,
      `Happy to help, ${first}! Let me know if you need anything else. 🚀`,
      `Of course, ${first}! That's what I'm here for. 😄`,
    ];
    return encouragements[Math.floor(Math.random() * encouragements.length)];
  }

  if (jokes.some(g => lower.includes(g))) {
    const workJokes = [
      `Why do programmers prefer dark mode? Because light attracts bugs! 🐛😄`,
      `Why did the standup meeting end early? Everyone had their tasks under control — no blockers! ✅`,
      `How many team members does it take to complete a task? Just one, but they all need to be in a meeting about it first! 😂`,
      `What's a developer's favourite thing about standups? They're supposed to be short! ⏱️😄`,
    ];
    return workJokes[Math.floor(Math.random() * workJokes.length)] + `\n\nBack to work though, ${first} — you've got ${myTasks.length - myDone} task${myTasks.length - myDone !== 1 ? 's' : ''} waiting! 😄`;
  }

  if (bored.some(g => lower.includes(g))) {
    const pending = myTasks.filter(t => t.status !== 'done');
    if (pending.length > 0) return `Bored, ${first}? 😄 You've got ${pending.length} task${pending.length > 1 ? 's' : ''} waiting for you! Why not knock out:\n\n${pending.slice(0, 2).map(t => `• ${t.title} (${t.priority})`).join('\n')}\n\nLet's turn that boredom into productivity! 🚀`;
    return `Bored and all tasks done? That's the dream, ${first}! 🎉 Team is at ${pct}% — maybe help a teammate or get a head start on tomorrow!`;
  }

  if (bye.some(g => lower.includes(g))) {
    return `See you later, ${first}! 👋 ${myPct === 100 ? 'Great work today — all tasks done! 🎉' : `Don't forget you have ${myTasks.length - myDone} task${myTasks.length - myDone !== 1 ? 's' : ''} still pending before you go! 😊`}`;
  }

  // ── Work-related messages ──────────────────────────────────────────────────
  if (lower.includes('priority') || lower.includes('focus') || lower.includes('what should') || lower.includes('most important')) {
    const critical = myTasks.filter(t => t.priority === 'critical' && t.status !== 'done');
    const high = myTasks.filter(t => t.priority === 'high' && t.status !== 'done');
    if (critical.length) return `Top priority right now, ${first}:\n\n${critical.map(t=>`🔴 ${t.title} (Critical)${t.timeline?` — due ${t.timeline}`:''}${t.blocker?`\n   ⚠️ Blocker: ${t.blocker}`:''}`).join('\n\n')}${high.length?`\n\nAlso high priority:\n${high.slice(0,2).map(t=>`🟠 ${t.title}`).join('\n')}`:''}`;
    if (high.length) return `Focus on these high-priority tasks, ${first}:\n\n${high.map(t=>`🟠 ${t.title}${t.timeline?` (due ${t.timeline})`:''}`).join('\n\n')}`;
    const todo = myTasks.filter(t => t.status !== 'done');
    if (todo.length) return `No critical tasks! Here's what's next, ${first}:\n\n${todo.slice(0,3).map((t,i)=>`${i+1}. ${t.title} (${t.priority})`).join('\n')}`;
    return `All clear, ${first}! 🎉 No pending tasks — you're fully done today!`;
  }

  if (lower.includes('my progress') || lower.includes('how am i') || lower.includes('my status') || lower.includes('my tasks')) {
    return `Your progress today, ${first}:\n\n✅ Done: ${myDone}/${myTasks.length} (${myPct}%)\n⚡ In progress: ${myTasks.filter(t=>t.status==='in-progress').length}\n⭕ To do: ${myTasks.filter(t=>t.status==='todo').length}\n⚠️ Blocked: ${myTasks.filter(t=>t.status==='blocked').length}\n\n${myPct===100?'🎉 All tasks done! Excellent work today.':myPct>=50?'💪 Solid progress, keep going!':'🚀 You\'ve got this — let\'s finish strong!'}`;
  }

  if (lower.includes('team') || lower.includes('how\'s everyone') || lower.includes('how is everyone') || lower.includes('overall')) {
    const topMember = members.map(m => {
      const mt = tasks.filter(t=>t.assignee_email===m.email);
      const md = mt.filter(t=>t.status==='done').length;
      return { name:m.name, pct:mt.length?Math.round(md/mt.length*100):0 };
    }).sort((a,b)=>b.pct-a.pct)[0];
    return `Team overview for ${teamName}:\n\n📋 Total tasks: ${tasks.length}\n✅ Completed: ${done} (${pct}%)\n⚡ In progress: ${inProg}\n⚠️ Blocked: ${blocked}${blocked>0?'\n\n🚨 Action needed — blockers are slowing things down!':'\n\n✅ No blockers — team is running smoothly!'}${topMember?`\n\n🏆 Leading today: ${topMember.name} (${topMember.pct}% done)`:''}`;
  }

  if (lower.includes('block') || lower.includes('stuck') || lower.includes('issue')) {
    const blockedTasks = tasks.filter(t=>t.status==='blocked');
    if (!blockedTasks.length) return `✅ No blockers right now, ${first}! The whole team is running smoothly.`;
    return `Current blockers (${blockedTasks.length}), ${first}:\n\n${blockedTasks.map(t=>`🔴 ${t.title}\n   👤 ${t.assignee_name}\n   Reason: ${t.blocker||'Not specified'}`).join('\n\n')}\n\n💡 These need attention — they\'re slowing the team down.`;
  }

  if (lower.includes('done') || lower.includes('complet') || lower.includes('finished') || lower.includes('achiev')) {
    const doneTasks = tasks.filter(t=>t.status==='done');
    if (!doneTasks.length) return `Nothing completed yet today, ${first}. The team is still working on it — first task done will show here! 💪`;
    return `Completed today (${doneTasks.length}):\n\n${doneTasks.slice(0,5).map(t=>`✅ ${t.title} — ${t.assignee_name}`).join('\n')}${doneTasks.length>5?`\n...and ${doneTasks.length-5} more`:''}`;
  }

  if (lower.includes('summar') || lower.includes('standup') || lower.includes('report') || lower.includes('brief')) {
    return `Today's standup summary:\n\n🏢 Team: ${teamName}\n📊 Completion: ${pct}% (${done}/${tasks.length})\n⚡ In progress: ${inProg}\n⚠️ Blockers: ${blocked}\n\nYour tasks, ${first}: ${myTasks.length} total, ${myDone} done (${myPct}%)\n\n${blocked>0?`🚨 ${blocked} blocker${blocked>1?'s':''} need attention!`:pct>=80?'🎉 Great day — almost at the finish line!':'💪 Good progress — keep going!'}`;
  }

  if (lower.includes('perform') || lower.includes('leaderboard') || lower.includes('best') || lower.includes('top performer') || lower.includes('rank')) {
    const ranked = members.map(m => {
      const mt = tasks.filter(t=>t.assignee_email===m.email);
      const md = mt.filter(t=>t.status==='done').length;
      return { name:m.name, pct:mt.length?Math.round(md/mt.length*100):0, total:mt.length };
    }).sort((a,b)=>b.pct-a.pct);
    if (!ranked.length) return `No performance data yet, ${first}. Add tasks to start tracking! 📊`;
    return `Performance leaderboard:\n\n${ranked.map((m,i)=>`${i===0?'🥇':i===1?'🥈':i===2?'🥉':`${i+1}.`} ${m.name} — ${m.pct}% (${m.total} tasks)`).join('\n')}\n\n${ranked[0]?.pct===100?`🎉 ${ranked[0].name} is fully done today!`:ranked[0]?`${ranked[0].name} is leading at ${ranked[0].pct}% 🏆`:''}`;
  }

  if (lower.includes('remind') || lower.includes('deadline') || lower.includes('due')) {
    const upcoming = myTasks.filter(t => t.timeline && t.status !== 'done');
    if (!upcoming.length) return `No upcoming deadlines found in your tasks, ${first}. You're all clear! ✅`;
    return `Your upcoming deadlines, ${first}:\n\n${upcoming.map(t=>`⏰ ${t.title}\n   Due: ${t.timeline} (${t.priority} priority)`).join('\n\n')}`;
  }

  if (lower.includes('who') && (lower.includes('not done') || lower.includes('pending') || lower.includes('behind'))) {
    const behind = members.map(m => {
      const mt = tasks.filter(t=>t.assignee_email===m.email&&t.status!=='done');
      return { name:m.name, pending:mt.length };
    }).filter(m=>m.pending>0).sort((a,b)=>b.pending-a.pending);
    if (!behind.length) return `Everyone is done with their tasks, ${first}! 🎉 Amazing team effort today!`;
    return `Team members with pending tasks:\n\n${behind.map(m=>`⏳ ${m.name} — ${m.pending} task${m.pending>1?'s':''} pending`).join('\n')}`;
  }

  // Default — conversational catch-all
  const taskCount = myTasks.length - myDone;
  const workContext = taskCount > 0
    ? `By the way, you still have ${taskCount} pending task${taskCount>1?'s':''} today.`
    : myTasks.length > 0
    ? `You\'ve completed all your tasks today — great work! 🎉`
    : `No tasks added yet today.`;

  return `I'm your StandSync AI assistant, ${first}! 🤖\n\n${workContext}\n\nI can help you with:\n• What to focus on today\n• Your task progress\n• Team performance\n• Current blockers\n• Today's standup summary\n\nWhat would you like to know?`;
}
