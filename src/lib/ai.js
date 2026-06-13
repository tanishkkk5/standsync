// src/lib/ai.js - Google Gemini (free) powered AI assistant
// Get free key: aistudio.google.com -> Get API key (no credit card needed)

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
  const first = userName.split(' ')[0];

  const taskSummary = tasks.slice(0, 20).map(t =>
    '- [' + t.status + '][' + t.priority + '] ' + t.title + ' assigned to ' + t.assignee_name +
    (t.timeline ? ', due: ' + t.timeline : '') + (t.blocker ? ', BLOCKED: ' + t.blocker : '')
  ).join('\n');

  const memberSummary = members.map(m => {
    const mt = tasks.filter(t => t.assignee_email === m.email);
    const md = mt.filter(t => t.status === 'done').length;
    return '- ' + m.name + ' (' + m.role + '): ' + md + '/' + mt.length + ' done' + (mt.some(t => t.status === 'blocked') ? ' [HAS BLOCKER]' : '');
  }).join('\n');

  const myTasksSummary = myTasks.length > 0
    ? myTasks.map(t => '- [' + t.status + '][' + t.priority + '] ' + t.title + (t.timeline ? ', due: ' + t.timeline : '') + (t.blocker ? ', BLOCKED: ' + t.blocker : '')).join('\n')
    : 'No tasks yet today';

  const prompt = 'You are StandSync AI, a friendly smart productivity assistant inside a daily standup tracker app.\n\n' +
    'CONTEXT:\n' +
    'Today: ' + today + '\n' +
    'Team: ' + teamName + '\n' +
    'Talking to: ' + userName + ' (first name: ' + first + ')\n' +
    'Team completion: ' + pct + '% (' + done + '/' + tasks.length + ' tasks, ' + inProg + ' in progress, ' + blocked + ' blocked)\n' +
    first + "'s progress: " + myPct + '% (' + myDone + '/' + myTasks.length + ' done)\n\n' +
    'TEAM TASKS:\n' + (taskSummary || 'No tasks yet today') + '\n\n' +
    'TEAM MEMBERS:\n' + (memberSummary || 'No members yet') + '\n\n' +
    first + "'S TASKS:\n" + myTasksSummary + '\n\n' +
    'STRICT RULES:\n' +
    '1. NEVER use markdown. No **bold**, no *italic*, no # headers. Plain text only.\n' +
    '2. Use simple ASCII emojis like :) or just plain text. No complex emojis.\n' +
    '3. For casual messages (hi, hey, how are you, thanks, etc.) respond warmly like a friendly colleague.\n' +
    '4. For work questions give specific answers using the real data above.\n' +
    '5. Keep responses under 120 words.\n' +
    '6. Address the person as ' + first + '.\n' +
    '7. Be warm and encouraging.\n\n' +
    'User says: "' + userMessage + '"\n\n' +
    'Respond as StandSync AI:';

  if (!GEMINI_KEY) {
    return smartFallback(userMessage, { tasks, members, myTasks, done, blocked, pct, inProg, userName, teamName, myDone, myPct });
  }

  try {
    const response = await fetch(GEMINI_URL + '?key=' + GEMINI_KEY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.85, maxOutputTokens: 350, topP: 0.9 },
      }),
    });

    const data = await response.json();

    if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts[0]) {
      return cleanText(data.candidates[0].content.parts[0].text);
    }

    if (data.error && data.error.code === 429) {
      return 'Give me a sec, ' + first + ' - hitting the free rate limit (15 req/min). Try again in a moment!';
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
    .replace(/^[-*]\s+\*\*(.+?)\*\*/gm, '- $1')
    .trim();
}

function smartFallback(msg, { tasks, members, myTasks, done, blocked, pct, inProg, userName, teamName, myDone, myPct }) {
  const lower = msg.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  const first = userName.split(' ')[0];
  const words = lower.split(/\s+/);
  const has = function() { return Array.from(arguments).some(function(t) { return lower.includes(t); }); };

  // Greetings
  if (has('hi', 'hey', 'hello', 'hiya', 'yo', 'morning', 'afternoon', 'evening', 'howdy', 'helo', 'hii', 'heya')) {
    var hour = new Date().getHours();
    var greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    var snap = myTasks.length > 0
      ? 'You have ' + myTasks.length + ' task' + (myTasks.length > 1 ? 's' : '') + ' today - ' + myDone + ' done' + (myPct === 100 ? '!' : ', ' + (myTasks.length - myDone) + ' still to go.')
      : 'No tasks added yet today - you are all clear!';
    return greet + ', ' + first + '! Great to see you.\n\n' + snap + '\n\nWhat can I help you with?';
  }

  // How are you - broad matching including typos
  if (
    has('how are you', 'how r u', 'how ru', 'hows it', 'how are u', 'how are yo', 'how are yuo', 'how you doing', 'how u doing', 'how do you', 'you good', 'u good', 'whats up', 'wassup', 'wazzup', 'what up') ||
    (words.indexOf('how') !== -1 && (words.indexOf('are') !== -1 || words.indexOf('r') !== -1)) ||
    (words.indexOf('how') !== -1 && words.indexOf('you') !== -1)
  ) {
    var mood = pct >= 80 ? 'Things are going really well' : pct >= 40 ? 'Making solid progress' : tasks.length === 0 ? 'All quiet so far today' : 'Getting started for the day';
    return 'Doing great, ' + first + '! ' + mood + ' on the ' + teamName + ' board - ' + pct + '% complete' + (blocked > 0 ? ', with ' + blocked + ' blocker' + (blocked > 1 ? 's' : '') + ' to watch' : ', no blockers at all') + '.\n\nHow can I help you today?';
  }

  // Thanks
  if (has('thanks', 'thank you', 'thankyou', 'thx', 'ty', 'cheers', 'great', 'awesome', 'nice', 'cool', 'perfect', 'good job', 'well done', 'amazing', 'excellent', 'brilliant')) {
    var replies = [
      'You are welcome, ' + first + '! Keep up the great work!',
      'Anytime, ' + first + '! Happy to help - you are doing great with ' + myPct + '% of tasks done!',
      'Happy to help, ' + first + '! Let me know if you need anything else.',
      'Of course, ' + first + '! That is what I am here for.',
    ];
    return replies[Math.floor(Math.random() * replies.length)];
  }

  // Bye
  if (has('bye', 'goodbye', 'see you', 'cya', 'later', 'gotta go', 'ttyl', 'take care', 'good night')) {
    return 'See you later, ' + first + '! ' + (myPct === 100 ? 'Great work today - all tasks done!' : 'Don\'t forget you have ' + (myTasks.length - myDone) + ' task' + (myTasks.length - myDone !== 1 ? 's' : '') + ' still pending!');
  }

  // Jokes
  if (has('joke', 'funny', 'laugh', 'humor', 'make me laugh', 'entertain')) {
    var jokes = [
      'Why do developers prefer dark mode? Because light attracts bugs!',
      'Why did the standup end early? Everyone had their tasks under control - no blockers!',
      'How many team members does it take to finish a task? Just one - but they all need to be in a meeting about it first!',
    ];
    return jokes[Math.floor(Math.random() * jokes.length)] + '\n\nBack to work though, ' + first + ' - you have ' + (myTasks.length - myDone) + ' task' + (myTasks.length - myDone !== 1 ? 's' : '') + ' pending!';
  }

  // Priority / focus
  if (has('priority', 'focus', 'what should', 'most important', 'start with', 'work on', 'tackle')) {
    var critical = myTasks.filter(function(t) { return t.priority === 'critical' && t.status !== 'done'; });
    var high = myTasks.filter(function(t) { return t.priority === 'high' && t.status !== 'done'; });
    if (critical.length) return 'Top priority right now, ' + first + ':\n\n' + critical.map(function(t) { return '- ' + t.title + ' (Critical)' + (t.timeline ? ' - due ' + t.timeline : '') + (t.blocker ? '\n  Blocker: ' + t.blocker : ''); }).join('\n\n') + (high.length ? '\n\nAlso high priority:\n' + high.slice(0, 2).map(function(t) { return '- ' + t.title; }).join('\n') : '');
    if (high.length) return 'Focus on these, ' + first + ':\n\n' + high.map(function(t) { return '- ' + t.title + (t.timeline ? ' (due ' + t.timeline + ')' : ''); }).join('\n\n');
    var todo = myTasks.filter(function(t) { return t.status !== 'done'; });
    if (todo.length) return 'No critical tasks! Here is what is next, ' + first + ':\n\n' + todo.slice(0, 3).map(function(t, i) { return (i + 1) + '. ' + t.title + ' (' + t.priority + ')'; }).join('\n');
    return 'All clear, ' + first + '! No pending tasks - you are fully done today!';
  }

  // My progress
  if (has('my progress', 'how am i', 'my status', 'my tasks', 'am i done', 'what have i')) {
    return 'Your progress today, ' + first + ':\n\nDone: ' + myDone + '/' + myTasks.length + ' (' + myPct + '%)\nIn progress: ' + myTasks.filter(function(t) { return t.status === 'in-progress'; }).length + '\nTo do: ' + myTasks.filter(function(t) { return t.status === 'todo'; }).length + '\nBlocked: ' + myTasks.filter(function(t) { return t.status === 'blocked'; }).length + '\n\n' + (myPct === 100 ? 'All tasks done - excellent work!' : myPct >= 50 ? 'Solid progress, keep going!' : 'You have got this - let us finish strong!');
  }

  // Team overview
  if (has('team', 'everyone', 'overall', 'team status', 'whole team')) {
    var top = members.map(function(m) { var mt = tasks.filter(function(t) { return t.assignee_email === m.email; }); var md = mt.filter(function(t) { return t.status === 'done'; }).length; return { name: m.name, pct: mt.length ? Math.round(md / mt.length * 100) : 0 }; }).sort(function(a, b) { return b.pct - a.pct; })[0];
    return 'Team overview for ' + teamName + ':\n\nTotal: ' + tasks.length + ' tasks\nCompleted: ' + done + ' (' + pct + '%)\nIn progress: ' + inProg + '\nBlocked: ' + blocked + (blocked > 0 ? '\n\nBlockers need attention!' : '\n\nNo blockers - running smoothly!') + (top ? '\n\nLeading today: ' + top.name + ' (' + top.pct + '% done)' : '');
  }

  // Blockers
  if (has('block', 'stuck', 'issue', 'problem', 'impediment', 'obstacle')) {
    var bl = tasks.filter(function(t) { return t.status === 'blocked'; });
    if (!bl.length) return 'No blockers right now, ' + first + '! The whole team is running smoothly.';
    return 'Current blockers (' + bl.length + '), ' + first + ':\n\n' + bl.map(function(t) { return '- ' + t.title + '\n  Assigned to: ' + t.assignee_name + '\n  Reason: ' + (t.blocker || 'Not specified'); }).join('\n\n') + '\n\nThese need attention.';
  }

  // Summary
  if (has('summary', 'standup', 'report', 'brief', 'overview', 'update', 'today')) {
    return 'Today\'s standup summary:\n\nTeam: ' + teamName + '\nCompletion: ' + pct + '% (' + done + '/' + tasks.length + ')\nIn progress: ' + inProg + '\nBlockers: ' + blocked + '\n\nYour progress, ' + first + ': ' + myDone + '/' + myTasks.length + ' done (' + myPct + '%)\n\n' + (blocked > 0 ? blocked + ' blocker' + (blocked > 1 ? 's' : '') + ' need attention!' : pct >= 80 ? 'Great day - almost at the finish line!' : 'Good progress - keep going!');
  }

  // Performance
  if (has('perform', 'leaderboard', 'best', 'top performer', 'rank', 'who done most')) {
    var ranked = members.map(function(m) { var mt = tasks.filter(function(t) { return t.assignee_email === m.email; }); var md = mt.filter(function(t) { return t.status === 'done'; }).length; return { name: m.name, pct: mt.length ? Math.round(md / mt.length * 100) : 0, total: mt.length }; }).sort(function(a, b) { return b.pct - a.pct; });
    if (!ranked.length) return 'No performance data yet, ' + first + '. Add tasks to start tracking!';
    return 'Performance leaderboard:\n\n' + ranked.map(function(m, i) { return (i === 0 ? '1st' : i === 1 ? '2nd' : i === 2 ? '3rd' : (i + 1) + 'th') + ' - ' + m.name + ' (' + m.pct + '%, ' + m.total + ' tasks)'; }).join('\n') + (ranked[0] ? '\n\n' + ranked[0].name + ' is leading at ' + ranked[0].pct + '%!' : '');
  }

  // Default
  var taskContext = myTasks.length === 0 ? 'No tasks added yet today.'
    : myPct === 100 ? 'You have completed all ' + myTasks.length + ' tasks today - amazing!'
    : 'You have ' + (myTasks.length - myDone) + ' of ' + myTasks.length + ' tasks still pending today.';

  return 'Hey ' + first + '! ' + taskContext + '\n\nI can help you with:\n- What to focus on today\n- Your task progress\n- Team performance overview\n- Current blockers\n- Today\'s standup summary\n\nWhat would you like to know?';
}
