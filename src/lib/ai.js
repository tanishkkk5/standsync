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
    `- [${t.status}][${t.priority}] ${t.title} assigned to ${t.assignee_name}${t.timeline ? `, due: ${t.timeline}` : ''}${t.blocker ? `, BLOCKED: ${t.blocker}` : ''}`
  ).join('\n');

  const memberSummary = members.map(m => {
    const mt = tasks.filter(t => t.assignee_email === m.email);
    const md = mt.filter(t => t.status === 'done').length;
    return `- ${m.name} (${m.role}): ${md}/${mt.length} tasks done${mt.some(t => t.status === 'blocked') ? ' [HAS BLOCKER]' : ''}`;
  }).join('\n');

  const myTasksSummary = myTasks.length > 0
    ? myTasks.map(t => `- [${t.status}][${t.priority}] ${t.title}${t.timeline ? `, due: ${t.timeline}` : ''}${t.blocker ? `, BLOCKED: ${t.blocker}` : ''}`).join('\n')
    : 'No tasks yet today';

  const prompt = `You are StandSync AI — a friendly, smart productivity assistant inside a daily standup tracker app.

CONTEXT:
Today: ${today}
Team: ${teamName}
You are talking to: ${userName} (first name: ${userName.split(' ')[0]})
Team completion: ${pct}% (${done}/${tasks.length} tasks, ${inProg} in progress, ${blocked} blocked)
${userName}'s progress: ${myPct}% (${myDone}/${myTasks.length} done)

TEAM TASKS:
${taskSummary || 'No tasks added yet today'}

TEAM MEMBERS:
${memberSummary || 'No members yet'}

${userName.split(' ')[0]}'S TASKS:
${myTasksSummary}

STRICT RULES - follow these exactly:
1. NEVER use markdown. No **bold**, no *italic*, no # headers, no bullet dashes with **text**. Plain text only.
2. Use emojis naturally to show personality.
3. For casual messages (hi, hey, hello, how are you, what's up, good morning, thanks, etc.) respond like a warm friendly colleague first, then briefly mention their work.
4. For work questions give specific answers using the real numbers from the context above.
5. Keep responses under 120 words unless a detailed breakdown is asked for.
6. Address the person by their first name: ${userName.split(' ')[0]}
7. Be warm, encouraging and positive.
8. NEVER start your response with a markdown symbol.

User says: "${userMessage}"

Respond naturally as StandSync AI:`;

  if (!GEMINI_KEY) {
    return smartFallback(userMessage, { tasks, members, myTasks, done, blocked, pct, inProg, userName, teamName, myDone, myPct });
  }

  try {
    const response = await fetch(`${GEMINI_URL}?key=${GEMINI_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.85, maxOutputTokens: 350, topP: 0.9 },
      }),
    });

    const data = await response.json();

    if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
      return cleanText(data.candidates[0].content.parts[0].text);
    }

    if (data.error?.code === 429) {
      return `Give me a sec, ${userName.split(' ')[0]} — hitting the free rate limit (15 requests/min). Try again in a moment! ⏳`;
    }

    return smartFallback(userMessage, { tasks, members, myTasks, done, blocked, pct, inProg, userName, teamName, myDone, myPct });
  } catch (e) {
    return smartFallback(userMessage, { tasks, members, myTasks, done, blocked, pct, inProg, userName, teamName, myDone, myPct });
  }
}

function cleanText(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/`(.+?)`/g, '$1')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .replace(/^[-*]\s+\*\*(.+?)\*\*/gm, '• $1')
    .replace(/^[-*]\s+/gm, '• ')
    .trim();
}

function smartFallback(msg, { tasks, members, myTasks, done, blocked, pct, inProg, userName, teamName, myDone, myPct }) {
  const lower = msg.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  const first = userName.split(' ')[0];
  const words = lower.split(/\s+/);

  const has = (...terms) => terms.some(t => lower.includes(t));

  // Greetings
  if (has('hi', 'hey', 'hello', 'hiya', 'yo', 'sup', 'morning', 'afternoon', 'evening', 'howdy', 'helo', 'hii', 'heya')) {
    const hour = new Date().getHours();
    const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    const snap = myTasks.length > 0
      ? `You have ${myTasks.length} task${myTasks.length > 1 ? 's' : ''} today — ${myDone} done${myPct === 100 ? ' 🎉' : `, ${myTasks.length - myDone} still to go`}.`
      : `No tasks added yet today — you're all clear! 😎`;
    return `${greet}, ${first}! 👋 Great to see you.\n\n${snap}\n\nWhat can I help you with?`;
  }

  // How are you — very broad matching
  if (
    has('how are you', 'how r u', 'how ru', 'hows it going', 'how\'s it going', 'how are u', 'how are yo', 'how are yuo', 'how are yuor', 'how you doing', 'how u doing', 'how do you do', 'you good', 'u good', 'all good', 'what\'s up', 'whats up', 'wassup', 'wazzup', 'sup', 'what up') ||
    (words.includes('how') && (words.includes('are') || words.includes('r'))) ||
    (words.includes('how') && words.includes('you'))
  ) {
    const mood = pct >= 80 ? `Things are going really well` : pct >= 40 ? `Making solid progress` : tasks.length === 0 ? `All quiet so far today` : `Getting started for the day`;
    return `Doing great, ${first}! 😊 ${mood} on the ${teamName} board — ${pct}% complete${blocked > 0 ? `, with ${blocked} blocker${blocked > 1 ? 's' : ''} to watch` : ', no blockers at all'}.\n\nHow can I help you today?`;
  }

  // Thanks / positive reactions
  if (has('thanks', 'thank you', 'thankyou', 'thx', 'ty', 'cheers', 'great', 'awesome', 'nice', 'cool', 'perfect', 'good job', 'well done', 'amazing', 'excellent', 'brilliant')) {
    const replies = [
      `You're welcome, ${first}! 😊 Keep up the great work!`,
      `Anytime, ${first}! 🙌 Happy to help — you're doing great with ${myPct}% of tasks done!`,
      `Happy to help, ${first}! Let me know if you need anything else. 🚀`,
      `Of course, ${first}! That's what I'm here for. 😄`,
    ];
    return replies[Math.floor(Math.random() * replies.length)];
  }

  // Bye
  if (has('bye', 'goodbye', 'see you', 'cya', 'later', 'gotta go', 'ttyl', 'take care', 'good night')) {
    return `See you later, ${first}! 👋 ${myPct === 100 ? 'Great work today — all tasks done! 🎉' : `Don't forget you have ${myTasks.length - myDone} task${myTasks.length - myDone !== 1 ? 's' : ''} still pending! 😊`}`;
  }

  // Jokes
  if (has('joke', 'funny', 'laugh', 'humor', 'make me laugh', 'tell me something', 'entertain')) {
    const jokes = [
      `Why do developers prefer dark mode? Because light attracts bugs! 🐛😄`,
      `Why did the standup end early? Everyone had their tasks under control — no blockers! ✅`,
      `How many team members does it take to finish a task? Just one — but they all need to be in a meeting about it first! 😂`,
    ];
    return jokes[Math.floor(Math.random() * jokes.length)] + `\n\nBack to work though, ${first} — you've got ${myTasks.length - myDone} task${myTasks.length - myDone !== 1 ? 's' : ''} pending! 😄`;
  }

  // Work: priority / focus
  if (has('priority', 'focus', 'what should', 'most important', 'start with', 'work on', 'tackle')) {
    const critical = myTasks.filter(t => t.priority === 'critical' && t.status !== 'done');
    const high = myTasks.filter(t => t.priority === 'high' && t.status !== 'done');
    if (critical.length) return `Top priority right now, ${first}:\n\n${critical.map(t => `🔴 ${t.title} (Critical)${t.timeline ? ` — due ${t.timeline}` : ''}${t.blocker ? `\n   Blocker: ${t.blocker}` : ''}`).join('\n\n')}${high.length ? `\n\nAlso high priority:\n${high.slice(0, 2).map(t => `🟠 ${t.title}`).join('\n')}` : ''}`;
    if (high.length) return `Focus on these, ${first}:\n\n${high.map(t => `🟠 ${t.title}${t.timeline ? ` (due ${t.timeline})` : ''}`).join('\n\n')}`;
    const todo = myTasks.filter(t => t.status !== 'done');
    if (todo.length) return `No critical tasks! Here's what's next, ${first}:\n\n${todo.slice(0, 3).map((t, i) => `${i + 1}. ${t.title} (${t.priority})`).join('\n')}`;
    return `All clear, ${first}! 🎉 No pending tasks — you're fully done today!`;
  }

  // Work: my progress
  if (has('my progress', 'how am i', 'my status', 'my tasks', 'am i done', 'what have i')) {
    return `Your progress today, ${first}:\n\n✅ Done: ${myDone}/${myTasks.length} (${myPct}%)\n⚡ In progress: ${myTasks.filter(t => t.status === 'in-progress').length}\n⭕ To do: ${myTasks.filter(t => t.status === 'todo').length}\n⚠️ Blocked: ${myTasks.filter(t => t.status === 'blocked').length}\n\n${myPct === 100 ? '🎉 All tasks done — excellent work!' : myPct >= 50 ? '💪 Solid progress, keep going!' : '🚀 You\'ve got this — let\'s finish strong!'}`;
  }

  // Work: team overview
  if (has('team', 'everyone', 'overall', 'how is team', 'team status', 'whole team')) {
    const top = members.map(m => { const mt = tasks.filter(t => t.assignee_email === m.email); const md = mt.filter(t => t.status === 'done').length; return { name: m.name, pct: mt.length ? Math.round(md / mt.length * 100) : 0 }; }).sort((a, b) => b.pct - a.pct)[0];
    return `Team overview for ${teamName}:\n\n📋 Total: ${tasks.length} tasks\n✅ Completed: ${done} (${pct}%)\n⚡ In progress: ${inProg}\n⚠️ Blocked: ${blocked}${blocked > 0 ? '\n\n🚨 Blockers need attention!' : '\n\n✅ No blockers — running smoothly!'}${top ? `\n\n🏆 Leading today: ${top.name} (${top.pct}% done)` : ''}`;
  }

  // Work: blockers
  if (has('block', 'stuck', 'issue', 'problem', 'impediment', 'obstacle')) {
    const bl = tasks.filter(t => t.status === 'blocked');
    if (!bl.length) return `✅ No blockers right now, ${first}! The whole team is running smoothly.`;
    return `Current blockers (${bl.length}), ${first}:\n\n${bl.map(t => `🔴 ${t.title}\n   👤 ${t.assignee_name}\n   Reason: ${t.blocker || 'Not specified'}`).join('\n\n')}\n\n💡 These need attention.`;
  }

  // Work: summary
  if (has('summary', 'standup', 'report', 'brief', 'overview', 'update', 'today')) {
    return `Today's standup summary:\n\n🏢 Team: ${teamName}\n📊 Completion: ${pct}% (${done}/${tasks.length})\n⚡ In progress: ${inProg}\n⚠️ Blockers: ${blocked}\n\nYour progress, ${first}: ${myDone}/${myTasks.length} done (${myPct}%)\n\n${blocked > 0 ? `🚨 ${blocked} blocker${blocked > 1 ? 's' : ''} need attention!` : pct >= 80 ? '🎉 Great day — almost at the finish line!' : '💪 Good progress — keep going!'}`;
  }

  // Work: performance / leaderboard
  if (has('perform', 'leaderboard', 'best', 'top performer', 'rank', 'who is best', 'who done most')) {
    const ranked = members.map(m => { const mt = tasks.filter(t => t.assignee_email === m.email); const md = mt.filter(t => t.status === 'done').length; return { name: m.name, pct: mt.length ? Math.round(md / mt.length * 100) : 0, total: mt.length }; }).sort((a, b) => b.pct - a.pct);
    if (!ranked.length) return `No performance data yet, ${first}. Add tasks to start tracking! 📊`;
    return `Performance leaderboard:\n\n${ranked.map((m, i) => `${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`} ${m.name} — ${m.pct}% (${m.total} tasks)`).join('\n')}\n\n${ranked[0]?.pct === 100 ? `🎉 ${ranked[0].name} is fully done!` : `${ranked[0]?.name || ''} is leading at ${ranked[0]?.pct || 0}% 🏆`}`;
  }

  // Default catch-all — friendly, not robotic
  const taskContext = myTasks.length === 0
    ? `No tasks added yet today.`
    : myPct === 100
    ? `You've completed all ${myTasks.length} tasks today — amazing! 🎉`
    : `You have ${myTasks.length - myDone} of ${myTasks.length} tasks still pending today.`;

  return `Hey ${first}! 😊 ${taskContext}\n\nI can help you with:\n• What to focus on today\n• Your task progress\n• Team performance overview\n• Current blockers\n• Today's standup summary\n\nWhat would you like to know?`;
}\
