// src/lib/ai.js
// Powers the StandSync AI Assistant using Google Gemini (Free)
// Add REACT_APP_GEMINI_KEY to your Vercel env variables
// Get your free key at: https://aistudio.google.com/app/apikey

const GEMINI_KEY = process.env.REACT_APP_GEMINI_KEY;

export async function askAI(userMessage, context) {
  const { tasks = [], members = [], history = [], teamName = 'Team', userName = 'User', myTasks = [] } = context;

  const today = new Date().toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
  const done = tasks.filter(t => t.status === 'done').length;
  const blocked = tasks.filter(t => t.status === 'blocked').length;
  const inProg = tasks.filter(t => t.status === 'in-progress').length;
  const pct = tasks.length ? Math.round(done / tasks.length * 100) : 0;

  const taskSummary = tasks.slice(0, 20).map(t =>
    `- [${t.status}][${t.priority}] ${t.title} → ${t.assignee_name}${t.timeline ? ` (due: ${t.timeline})` : ''}${t.blocker ? ` ⚠️ BLOCKED: ${t.blocker}` : ''}`
  ).join('\n');

  const memberSummary = members.map(m => {
    const mt = tasks.filter(t => t.assignee_email === m.email);
    const md = mt.filter(t => t.status === 'done').length;
    return `- ${m.name} (${m.role}): ${md}/${mt.length} tasks done${mt.some(t=>t.status==='blocked') ? ' ⚠️ has blockers' : ''}`;
  }).join('\n');

  const historySummary = history.slice(0, 5).map(s => {
    const t = s.tasks || [];
    const d = t.filter(x => x.status === 'done').length;
    return `- ${s.date}: ${d}/${t.length} tasks completed`;
  }).join('\n');

  const systemPrompt = `You are StandSync AI, an intelligent assistant embedded in StandSync — a daily standup and team productivity tracker.

Today is ${today}.
Team: ${teamName}
You are talking to: ${userName}

=== TODAY'S STANDUP DATA ===
Total tasks: ${tasks.length} | Done: ${done} | In Progress: ${inProg} | Blocked: ${blocked} | Completion: ${pct}%

Tasks:
${taskSummary || 'No tasks added yet today'}

Team members:
${memberSummary || 'No team data available'}

${userName}'s tasks today:
${myTasks.length ? myTasks.map(t=>`- [${t.status}][${t.priority}] ${t.title}${t.timeline?` (due: ${t.timeline})`:''}${t.blocker?` ⚠️ ${t.blocker}`:''}`).join('\n') : 'No personal tasks yet'}

=== RECENT HISTORY ===
${historySummary || 'No history yet'}

=== YOUR ROLE ===
- Help ${userName} understand their priorities and progress
- Provide actionable insights about team performance
- Alert about blockers and critical tasks
- Suggest focus areas and next steps
- Answer questions about standup data, tasks, and team
- Be concise, friendly, and data-driven
- Use emojis naturally but not excessively
- Format responses cleanly with bullet points when listing items`;

  // No key — use smart fallback
  if (!GEMINI_KEY) {
    console.warn('StandSync AI: No REACT_APP_GEMINI_KEY found. Using offline fallback.');
    return generateSmartFallback(userMessage, { tasks, members, myTasks, done, blocked, pct, inProg, userName, teamName });
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: userMessage }] }],
          generationConfig: { maxOutputTokens: 1024, temperature: 0.7 }
        })
      }
    );

    const data = await response.json();

    // Log full response in dev to help debug
    if (process.env.NODE_ENV !== 'production') {
      console.log('Gemini raw response:', JSON.stringify(data, null, 2));
    }

    // Handle Gemini API errors (wrong key, quota exceeded, etc.)
    if (data.error) {
      console.error('Gemini API error:', data.error.message);
      if (data.error.code === 400) return '❌ Invalid Gemini API key. Please check your REACT_APP_GEMINI_KEY in Vercel settings.';
      if (data.error.code === 429) return '⏳ Gemini API quota exceeded. You\'ve hit the free limit — try again in a minute.';
      return `❌ AI error: ${data.error.message}`;
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (text) return text;

    // If candidates exist but are blocked (safety filter)
    if (data.candidates?.[0]?.finishReason === 'SAFETY') {
      return generateSmartFallback(userMessage, { tasks, members, myTasks, done, blocked, pct, inProg, userName, teamName });
    }

    // Unexpected empty response — fall back gracefully
    console.warn('Gemini returned no text. Full response:', data);
    return generateSmartFallback(userMessage, { tasks, members, myTasks, done, blocked, pct, inProg, userName, teamName });

  } catch (e) {
    console.error('AI fetch error:', e);
    return generateSmartFallback(userMessage, { tasks, members, myTasks, done, blocked, pct, inProg, userName, teamName });
  }
}

function generateSmartFallback(msg, { tasks, members, myTasks, done, blocked, pct, inProg, userName, teamName }) {
  const lower = msg.toLowerCase();

  if (lower.includes('priority') || lower.includes('focus') || lower.includes('what should')) {
    const critical = myTasks.filter(t => t.priority === 'critical' && t.status !== 'done');
    const high = myTasks.filter(t => t.priority === 'high' && t.status !== 'done');
    if (critical.length) return `🎯 **Top priority for you right now:**\n\n${critical.map(t=>`🔴 **${t.title}** — Critical${t.timeline?` (due: ${t.timeline})`:''}${t.blocker?`\n   ⚠️ Blocked: ${t.blocker}`:''}`).join('\n\n')}${high.length?`\n\nAlso high priority:\n${high.slice(0,2).map(t=>`🟠 ${t.title}`).join('\n')}`:''}`;
    if (high.length) return `🎯 **Focus on these high-priority tasks:**\n\n${high.map(t=>`🟠 **${t.title}**${t.timeline?` (due: ${t.timeline})`:''}${t.blocker?`\n   ⚠️ ${t.blocker}`:''}`).join('\n\n')}`;
    return `✅ No critical or high-priority tasks pending. You're in good shape! Focus on your in-progress tasks.`;
  }

  if (lower.includes('progress') || lower.includes('how am i') || lower.includes('my status')) {
    const myDone = myTasks.filter(t=>t.status==='done').length;
    const myPct = myTasks.length ? Math.round(myDone/myTasks.length*100) : 0;
    return `📊 **Your progress today:**\n\n✅ Done: ${myDone}/${myTasks.length} tasks (${myPct}%)\n⚡ In progress: ${myTasks.filter(t=>t.status==='in-progress').length}\n⭕ To do: ${myTasks.filter(t=>t.status==='todo').length}\n⚠️ Blocked: ${myTasks.filter(t=>t.status==='blocked').length}\n\n${myPct===100?'🎉 All done! Excellent work today.':myPct>=50?'💪 Good progress! Keep going.':'🚀 You\'ve got this! Time to pick up the pace.'}`;
  }

  if (lower.includes('team') || lower.includes('everyone') || lower.includes('overall')) {
    const topMember = members.map(m => {
      const mt = tasks.filter(t=>t.assignee_email===m.email);
      const md = mt.filter(t=>t.status==='done').length;
      return { name:m.name, pct:mt.length?Math.round(md/mt.length*100):0 };
    }).sort((a,b)=>b.pct-a.pct)[0];
    return `👥 **Team overview for ${teamName}:**\n\n📋 Total tasks: ${tasks.length}\n✅ Completed: ${done} (${pct}%)\n⚡ In progress: ${inProg}\n⚠️ Blocked: ${blocked}\n\n${blocked>0?`🚨 **${blocked} task${blocked>1?'s are':' is'} blocked** — needs immediate attention!\n\n`:''}${topMember?`🏆 Top performer today: **${topMember.name}** (${topMember.pct}% done)`:''}`;
  }

  if (lower.includes('block') || lower.includes('stuck')) {
    const blockedTasks = tasks.filter(t=>t.status==='blocked');
    if (!blockedTasks.length) return '✅ Great news — no blockers right now! The team is running smoothly.';
    return `⚠️ **Current blockers (${blockedTasks.length}):**\n\n${blockedTasks.map(t=>`🔴 **${t.title}**\n   👤 ${t.assignee_name}\n   Reason: ${t.blocker||'Not specified'}`).join('\n\n')}\n\n💡 Tip: Address these first — they're blocking team progress.`;
  }

  if (lower.includes('done') || lower.includes('complet') || lower.includes('finish')) {
    const doneTasks = tasks.filter(t=>t.status==='done');
    if (!doneTasks.length) return '⏳ No tasks completed yet today. The team is still working on it!';
    return `✅ **Completed today (${doneTasks.length}):**\n\n${doneTasks.slice(0,5).map(t=>`✅ ${t.title} — ${t.assignee_name}`).join('\n')}${doneTasks.length>5?`\n...and ${doneTasks.length-5} more`:''}`;
  }

  if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
    return `👋 Hey ${userName}! I'm your StandSync AI assistant.\n\nHere's your quick snapshot:\n📋 You have **${myTasks.length} tasks** today\n✅ **${myTasks.filter(t=>t.status==='done').length}** completed\n⚡ **${myTasks.filter(t=>t.status==='in-progress').length}** in progress\n\nAsk me anything — priorities, team progress, blockers, or what to focus on next! 🚀`;
  }

  if (lower.includes('summar') || lower.includes('today') || lower.includes('standup')) {
    return `📋 **Today's standup summary:**\n\n🏢 Team: ${teamName}\n📊 Team completion: ${pct}% (${done}/${tasks.length} tasks)\n⚡ In progress: ${inProg}\n⚠️ Blockers: ${blocked}\n\n**Your tasks:** ${myTasks.length} total, ${myTasks.filter(t=>t.status==='done').length} done\n\n${blocked>0?`🚨 Action needed: ${blocked} task${blocked>1?'s':''} blocked!`:pct>=80?'🎉 Great day — team is almost done!':'💪 Keep pushing — good progress so far!'}`;
  }

  return `I'm your StandSync AI! I can help with:\n\n• 🎯 **"What should I focus on?"** — your priorities\n• 📊 **"How's my progress?"** — your task status\n• 👥 **"How's the team doing?"** — team overview\n• ⚠️ **"Any blockers?"** — current blockers\n• 📋 **"Today's summary"** — full standup overview\n\nWhat would you like to know, ${userName}?`;
}
