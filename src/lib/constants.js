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
export const CHAT_THEMES = [
  { id:'default',  label:'Default',  bg:'linear-gradient(135deg,#060412,#0C0820)', accent:'#818CF8' },
  { id:'ocean',    label:'Ocean',    bg:'linear-gradient(135deg,#0C1445,#0A2A4A)', accent:'#38BDF8' },
  { id:'forest',   label:'Forest',   bg:'linear-gradient(135deg,#052E16,#064E3B)', accent:'#34D399' },
  { id:'sunset',   label:'Sunset',   bg:'linear-gradient(135deg,#4A0404,#7C2D12)', accent:'#FB923C' },
  { id:'lavender', label:'Lavender', bg:'linear-gradient(135deg,#2E1065,#4C1D95)', accent:'#E879F9' },
  { id:'light',    label:'Light',    bg:'linear-gradient(135deg,#F0F4FF,#E0E7FF)', accent:'#6366F1' },
];
export const MEMBER_COLORS = ['#818CF8','#38BDF8','#34D399','#F472B6','#FB923C','#E879F9','#F59E0B','#06B6D4'];
export const getPriority = v => PRIORITIES.find(p=>p.value===v)||PRIORITIES[2];
export const getStatus   = v => STATUSES.find(s=>s.value===v)||STATUSES[0];
export const TODAY = () => new Date().toISOString().split('T')[0];
export const GIPHY_KEY = process.env.REACT_APP_GIPHY_KEY || 'dc6zaTOxFJmzC';

export const FAQ = [
  { q:'How does the daily standup work?', a:'Every morning, open StandSync, enter your team, and add tasks assigned to you during the standup. Set priority and timeline. The manager sees every task appear in real time on the Live Board.' },
  { q:'How do I join a team?', a:'Two ways: (1) Ask your manager for the Room ID and 4-digit password — enter them on the Join Team screen. (2) Ask your manager to send an email invite — click the link in the email and create your account.' },
  { q:'What is a Room ID?', a:'Every team room has a unique 6-character Room ID (like AB3K9M) and a 4-digit password. Managers can create multiple rooms per team — one for daily standup, one for sprint planning, etc. These credentials never change unless the room is deleted.' },
  { q:'How do I create multiple rooms for my team?', a:'Go to Team Settings → Rooms → Create a new room. Give it a name (e.g. "Sprint Planning") and a unique Room ID and password will be generated automatically. Share these with the people you want in that room.' },
  { q:'How do I change an employee\'s designation?', a:'Go to Team Settings → Members → click Edit next to any member. You can update their designation (e.g. "Frontend Developer") and role (Member or Manager).' },
  { q:'How do the AI assistant features work?', a:'The floating AI bubble appears on every page. Click it and ask anything: "What should I focus on today?", "How is the team doing?", "Any blockers?". It uses Google Gemini (free) and always has your latest task data as context.' },
  { q:'How do emails work?', a:'📧 Digest: sends each member their task list for the day. 🕕 EOD: sends pending-task reminders to members and a full summary to the manager. ⚠️ Blocker alerts fire instantly when a member reports a blocker. All emails require the REACT_APP_RESEND_KEY Vercel environment variable.' },
  { q:'How do I send GIFs and images in chat?', a:'In team chat, click the GIF button to search Giphy, or click the image icon to upload a photo from your device. Requires REACT_APP_GIPHY_KEY in Vercel environment variables for better search (a free public key is used by default).' },
  { q:'How do I switch between dark and light mode?', a:'Click the sun/moon icon in any header, or go to Settings → Appearance. Your preference is saved and persists across sessions.' },
  { q:'Why did I get logged out when switching tabs?', a:'This is now fixed in v5. The app stores your session in localStorage so tab switches, browser minimise, and screen lock no longer log you out. Only clicking Sign Out will end your session.' },
  { q:'Can I be in multiple teams?', a:'Yes — you can create or join as many teams as you like. Switch between them from the Home screen.' },
  { q:'How do I change my password?', a:'Go to Settings → Security → enter a new password (min 6 characters) → Save.' },
  { q:'How do I upload a profile photo?', a:'Go to Settings → Profile → click the pencil icon on your avatar → select a photo from your device. It is stored securely in Supabase Storage.' },
  { q:'What happens to unfinished tasks?', a:'Tasks stay on the board until marked done. The EOD email flags pending tasks. Unfinished tasks do not auto-carry to the next day — team members add fresh tasks each morning.' },
  { q:'Is my team\'s data private?', a:'Yes. Each team\'s data is completely isolated using Row Level Security in Supabase. Other teams cannot see your tasks, members, or history.' },
];
