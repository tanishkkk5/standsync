const GEMINI_KEY = process.env.REACT_APP_GEMINI_KEY;
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

export async function askAI(userMsg, ctx) {
  const { tasks=[], members=[], history=[], teamName='Team', userName='User', myTasks=[] } = ctx;
  const first = userName.split(' ')[0];
  const done  = tasks.filter(t=>t.status==='done').length;
  const blkd  = tasks.filter(t=>t.status==='blocked').length;
  const inProg= tasks.filter(t=>t.status==='in-progress').length;
  const pct   = tasks.length?Math.round(done/tasks.length*100):0;
  const myDone= myTasks.filter(t=>t.status==='done').length;
  const myPct = myTasks.length?Math.round(myDone/myTasks.length*100):0;
  const fb    = ()=>fallback(userMsg,{tasks,members,myTasks,done,blkd,pct,inProg,first,teamName,myDone,myPct});

  if (!GEMINI_KEY) return fb();

  const taskLines = tasks.slice(0,15).map(t=>
    '['+t.status+']['+t.priority+'] '+t.title+' ('+( t.assignee_name||t.assignee_email)+')'+(t.timeline?', due:'+t.timeline:'')+(t.blocker?', BLOCKED:'+t.blocker:'')
  ).join('\n');

  const myLines = myTasks.map(t=>
    '['+t.status+']['+t.priority+'] '+t.title+(t.timeline?', due:'+t.timeline:'')+(t.blocker?', BLOCKED:'+t.blocker:'')
  ).join('\n');

  const prompt =
    'You are StandSync AI, a friendly smart productivity assistant in a daily standup tracker.\n\n'+
    'CONTEXT:\nTeam: '+teamName+'\nTalking to: '+userName+'\n'+
    'Team: '+pct+'% done ('+done+'/'+tasks.length+' tasks, '+inProg+' in progress, '+blkd+' blocked)\n'+
    first+'\'s progress: '+myPct+'% ('+myDone+'/'+myTasks.length+' tasks done)\n\n'+
    (tasks.length?'All tasks:\n'+taskLines+'\n\n':'')+
    (myTasks.length?first+'\'s tasks:\n'+myLines+'\n\n':'')+
    'RULES:\n'+
    '- Respond warmly to casual messages (hi, hey, how are you, thanks etc)\n'+
    '- Use real numbers for work questions\n'+
    '- NO markdown - plain text only, no **bold**\n'+
    '- Under 120 words\n'+
    '- Address as '+first+'\n\n'+
    'Message: "'+userMsg+'"';

  try {
    const res = await fetch(GEMINI_URL+'?key='+GEMINI_KEY, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        contents:[{parts:[{text:prompt}]}],
        generationConfig:{temperature:0.8,maxOutputTokens:300},
      }),
    });
    const data = await res.json();
    if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
      return stripMd(data.candidates[0].content.parts[0].text);
    }
    // Any error from Gemini (429, 403, etc) -> use smart fallback, never show error to user
    if (data.error) {
      console.warn('Gemini error:', data.error.code, data.error.message);
      return fb();
    }
  } catch(e) {
    console.warn('Gemini fetch failed:', e.message);
  }
  return fb();
}

function stripMd(t) {
  return t
    .replace(/\*\*(.+?)\*\*/g,'$1')
    .replace(/\*(.+?)\*/g,'$1')
    .replace(/^#{1,6}\s+/gm,'')
    .replace(/`(.+?)`/g,'$1')
    .replace(/^[-*]\s+/gm,'- ')
    .trim();
}

function fallback(msg, {tasks,members,myTasks,done,blkd,pct,inProg,first,teamName,myDone,myPct}) {
  const l = msg.toLowerCase().replace(/[^a-z0-9\s]/g,'').trim();
  const has = (...t) => t.some(w=>l.includes(w));
  const words = l.split(/\s+/);
  const hw = w => words.includes(w);

  if (has('hi','hey','hello','hiya','morning','afternoon','evening','howdy')) {
    const h=new Date().getHours();
    const g=h<12?'Good morning':h<17?'Good afternoon':'Good evening';
    const snap=myTasks.length?first+', you have '+myTasks.length+' task'+(myTasks.length>1?'s':'')+' today - '+myDone+' done'+(myPct===100?'!':', '+(myTasks.length-myDone)+' to go.'):'No tasks added yet today.';
    return g+', '+first+'! '+snap+' What can I help with?';
  }

  if (has('how are','whats up','wassup','how you','you good') || (hw('how')&&(hw('are')||hw('you')||hw('r')))) {
    const mood=pct>=80?'Things are going great':pct>=40?'Making solid progress':tasks.length===0?'All quiet so far':'Getting started';
    return 'Doing well, '+first+'! '+mood+' on '+teamName+' - '+pct+'% complete'+(blkd>0?', '+blkd+' blocker'+(blkd>1?'s':'')+' to watch':', no blockers')+'. How can I help?';
  }

  if (has('thanks','thank you','thx','ty','cheers','awesome','great','nice','cool','perfect')) {
    const r=['You are welcome, '+first+'! Keep it up!','Anytime, '+first+'! Happy to help.','Of course, '+first+'! That is what I am here for.'];
    return r[Math.floor(Math.random()*r.length)];
  }

  if (has('bye','goodbye','see you','cya','later','good night')) {
    return 'See you later, '+first+'! '+(myPct===100?'All tasks done - great work!':'You have '+(myTasks.length-myDone)+' task'+(myTasks.length-myDone!==1?'s':'')+' still pending!');
  }

  if (has('priority','focus','what should','most important','start with','work on')) {
    const crit=myTasks.filter(t=>t.priority==='critical'&&t.status!=='done');
    const high=myTasks.filter(t=>t.priority==='high'&&t.status!=='done');
    if(crit.length) return 'Top priority now, '+first+':\n\n'+crit.map(t=>'- '+t.title+' (Critical)'+(t.timeline?' due '+t.timeline:'')+(t.blocker?'\n  Blocker: '+t.blocker:'')).join('\n\n')+(high.length?'\n\nAlso high: '+high.slice(0,2).map(t=>t.title).join(', '):'');
    if(high.length) return 'Focus on these, '+first+':\n\n'+high.map(t=>'- '+t.title+(t.timeline?' (due '+t.timeline+')':'')).join('\n');
    const todo=myTasks.filter(t=>t.status!=='done');
    if(todo.length) return 'No critical tasks! Next up:\n\n'+todo.slice(0,3).map((t,i)=>(i+1)+'. '+t.title+' ('+t.priority+')').join('\n');
    return 'All clear, '+first+'! No pending tasks.';
  }

  if (has('my progress','how am i','my status','my tasks','am i done')) {
    return 'Your progress today, '+first+':\n\nDone: '+myDone+'/'+myTasks.length+' ('+myPct+'%)\nIn progress: '+myTasks.filter(t=>t.status==='in-progress').length+'\nTo do: '+myTasks.filter(t=>t.status==='todo').length+'\nBlocked: '+myTasks.filter(t=>t.status==='blocked').length+'\n\n'+(myPct===100?'All done - excellent!':myPct>=50?'Solid progress, keep going!':'You have got this!');
  }

  if (has('team','everyone','overall','whole team')) {
    const top=members.map(m=>{const mt=tasks.filter(t=>t.assignee_email===m.email);const md=mt.filter(t=>t.status==='done').length;return{name:m.name,pct:mt.length?Math.round(md/mt.length*100):0};}).sort((a,b)=>b.pct-a.pct)[0];
    return 'Team overview - '+teamName+':\n\nTotal: '+tasks.length+' tasks\nDone: '+done+' ('+pct+'%)\nIn progress: '+inProg+'\nBlocked: '+blkd+(blkd>0?'\n\nBlockers need attention!':'\n\nNo blockers - running smoothly!')+(top?'\n\nLeading: '+top.name+' ('+top.pct+'%)':'');
  }

  if (has('block','stuck','issue','impediment')) {
    const bl=tasks.filter(t=>t.status==='blocked');
    if(!bl.length) return 'No blockers right now, '+first+'! Team is running smoothly.';
    return 'Current blockers ('+bl.length+'):\n\n'+bl.map(t=>'- '+t.title+'\n  Assigned to: '+(t.assignee_name||t.assignee_email)+'\n  Reason: '+(t.blocker||'Not specified')).join('\n\n');
  }

  if (has('summary','standup','report','brief','overview','today')) {
    return 'Standup summary:\n\nTeam: '+teamName+'\nCompletion: '+pct+'% ('+done+'/'+tasks.length+')\nIn progress: '+inProg+'\nBlocked: '+blkd+'\n\nYour progress, '+first+': '+myDone+'/'+myTasks.length+' ('+myPct+'%)\n\n'+(blkd>0?blkd+' blocker'+(blkd>1?'s':'')+' need attention!':pct>=80?'Great day - nearly done!':'Good progress - keep going!');
  }

  if (has('leaderboard','best','top performer','rank','performing')) {
    const ranked=members.map(m=>{const mt=tasks.filter(t=>t.assignee_email===m.email);const md=mt.filter(t=>t.status==='done').length;return{name:m.name||m.email,pct:mt.length?Math.round(md/mt.length*100):0,total:mt.length};}).sort((a,b)=>b.pct-a.pct);
    if(!ranked.length) return 'No data yet, '+first+'. Add tasks to start tracking!';
    return 'Performance today:\n\n'+ranked.map((m,i)=>(i===0?'1st':i===1?'2nd':i===2?'3rd':(i+1)+'th')+' - '+m.name+' ('+m.pct+'%, '+m.total+' tasks)').join('\n')+(ranked[0]?'\n\n'+ranked[0].name+' is leading!':'');
  }

  const ctx2=myTasks.length===0?'No tasks added yet today.':myPct===100?'You completed all '+myTasks.length+' tasks - great work!':(myTasks.length-myDone)+' of '+myTasks.length+' tasks still pending.';
  return 'Hi '+first+'! '+ctx2+'\n\nI can help with:\n- What to focus on\n- Your progress\n- Team overview\n- Blockers\n- Standup summary\n\nWhat would you like to know?';
}
