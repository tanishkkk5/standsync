// src/lib/constants.js
export const PRIORITIES = [
  { value:'critical', label:'Critical', color:'#EF4444', bg:'rgba(239,68,68,0.14)'  },
  { value:'high',     label:'High',     color:'#F97316', bg:'rgba(249,115,22,0.14)' },
  { value:'medium',   label:'Medium',   color:'#F59E0B', bg:'rgba(245,158,11,0.14)' },
  { value:'low',      label:'Low',      color:'#10B981', bg:'rgba(16,185,129,0.14)' },
];
export const STATUSES = [
  { value:'todo',        label:'To do',       color:'#94A3B8', bg:'rgba(148,163,184,0.12)' },
  { value:'in-progress', label:'In progress', color:'#38BDF8', bg:'rgba(56,189,248,0.12)'  },
  { value:'done',        label:'Done',        color:'#34D399', bg:'rgba(52,211,153,0.12)'  },
  { value:'blocked',     label:'Blocked',     color:'#EF4444', bg:'rgba(239,68,68,0.12)'   },
];
export const MEMBER_COLORS = ['#818CF8','#38BDF8','#34D399','#F472B6','#FB923C','#E879F9','#F59E0B','#06B6D4','#8B5CF6','#EC4899'];
export const CHAT_THEMES = [
  { id:'default',  label:'Default',    bg:'linear-gradient(135deg,#060412,#0C0820)', accent:'#818CF8' },
  { id:'ocean',    label:'Ocean',      bg:'linear-gradient(135deg,#0C1445,#0A2A4A)', accent:'#38BDF8' },
  { id:'forest',   label:'Forest',     bg:'linear-gradient(135deg,#052E16,#064E3B)', accent:'#34D399' },
  { id:'sunset',   label:'Sunset',     bg:'linear-gradient(135deg,#4A0404,#7C2D12)', accent:'#FB923C' },
  { id:'lavender', label:'Lavender',   bg:'linear-gradient(135deg,#2E1065,#4C1D95)', accent:'#E879F9' },
  { id:'light',    label:'Clean Light',bg:'linear-gradient(135deg,#F0F4FF,#E0E7FF)', accent:'#6366F1' },
];
export const REMINDER_TYPES = [
  { value:'standup_start',   label:'Standup starting soon',  default_mins: 10 },
  { value:'task_deadline',   label:'Task deadline reminder',  default_mins: 60 },
  { value:'eod_incomplete',  label:'EOD incomplete tasks',    default_mins: 0  },
  { value:'blocker_followup',label:'Blocker follow-up',       default_mins: 120},
];
export const getPriority = v => PRIORITIES.find(p => p.value === v) || PRIORITIES[2];
export const getStatus   = v => STATUSES.find(s => s.value === v)   || STATUSES[0];
export const TODAY = () => new Date().toISOString().split('T')[0];

export const FAQ = [
  { q:'How does the daily standup work?', a:'Every morning, team members open StandSync, add their assigned tasks, set priority and timeline. The manager sees everything live in real time.' },
  { q:'How do I add multiple projects or standups?', a:'From the home screen, click "Create new team". Each team can have its own standup name, members, and meeting. You can switch between teams anytime.' },
  { q:'How does Google Sign-In work?', a:'Click "Continue with Google" on the login screen. If your company uses Google Workspace, it will automatically link your Google Calendar so you can select your standup meeting.' },
  { q:'How do reminders work?', a:'Go to any team → Settings → Reminders. You can set reminders for standup start, task deadlines, EOD incomplete tasks, and blocker follow-ups. They arrive by email.' },
  { q:'What can the AI assistant do?', a:'The AI assistant knows your tasks, team progress, blockers, and history. Ask it things like "What should I focus on today?", "How is my team performing?", or "Summarise this week\'s blockers".' },
  { q:'How do I invite someone?', a:'Team Settings → Invite member → enter their email. They get an invite link by email. Once they sign up, they appear in your team.' },
  { q:'Can I customise the chat space?', a:'Yes! In Team Chat, click the palette icon to change the chat theme. You can also send images and GIFs.' },
  { q:'How do emails work?', a:'📧 Digest sends each member their task list. 🕕 EOD sends pending reminders to members and a summary to the manager. Both are triggered manually or automatically.' },
  { q:'Is my data private?', a:'Yes. Each team\'s data is completely isolated. Only team members can access their team\'s tasks, chat, and history.' },
  { q:'How do I change my password?', a:'Settings → Security → enter new password (min 6 characters) → Save.' },
];

// Google OAuth config — user fills these in after setting up Google Cloud
export const GOOGLE_CONFIG = {
  // Step 1: Go to console.cloud.google.com → New project → "StandSync"
  // Step 2: APIs & Services → OAuth consent screen → External → fill in app name
  // Step 3: APIs & Services → Credentials → Create OAuth 2.0 Client ID
  // Step 4: Add your Vercel URL to Authorized redirect URIs
  // Step 5: In Supabase → Authentication → Providers → Google → paste Client ID & Secret
  CLIENT_ID: process.env.REACT_APP_GOOGLE_CLIENT_ID || '',
  ENABLED: !!process.env.REACT_APP_GOOGLE_CLIENT_ID,
};
