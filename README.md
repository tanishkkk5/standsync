# StandSync — Daily Standup Tracker
### Built for xtransmatrix · Supa Daily Standup

A real-time team standup tracker. Each morning during your 9 AM Google Meet, team members open this app and add the tasks Tanisk assigns them. Tanisk sees everything live on his manager dashboard.

---

## Features

- **Role-based views** — Manager (Tanisk) sees all tasks; members see only their own
- **Real-time sync** — Tasks appear on Tanisk's screen the moment a member submits
- **Priority control** — Manager can reprioritize any task inline
- **Timeline per task** — Each member sets when they'll finish
- **Manager notes** — Tanisk can pin a note to any task visible to that member
- **Status tracking** — Todo → In Progress → Done → Blocked
- **History** — Past standups with full task data
- **Demo mode** — Works without Supabase for local preview

---

## Team

| Name | Email | Role |
|------|-------|------|
| Tanisk Pandey | tanisk.pandey@xtransmatrix.com | Manager |
| Deepak NR | deepak.nr@xtransmatrix.com | Member |
| Madhan M | madhan.m@xtransmatrix.com | Member |
| Monica M | monica@xtransmatrix.com | Member |
| Sandhya A | sandhya.a@xtransmatrix.com | Member |
| Zeeba Kauser | zeeba.kauser@xtransmatrix.com | Member |

---

## Getting Started (Local)

```bash
# 1. Clone the repo
git clone https://github.com/YOUR_USERNAME/standsync.git
cd standsync

# 2. Install dependencies
npm install

# 3. Run in demo mode (no Supabase needed)
npm start
```

The app runs at `http://localhost:3000` in demo mode with sample data.

---

## Setting Up Supabase (Real Persistence + Sync)

### Step 1 — Create a Supabase project
1. Go to [https://supabase.com](https://supabase.com) → **New project**
2. Name it `standsync`, choose a region close to India (Singapore works well)
3. Wait ~2 minutes for it to spin up

### Step 2 — Run the database schema
1. In your Supabase dashboard → **SQL Editor** → **New query**
2. Paste the entire contents of `supabase/schema.sql`
3. Click **Run** — this creates all tables and enables real-time

### Step 3 — Get your API keys
1. Go to **Settings → API**
2. Copy **Project URL** and **anon/public** key

### Step 4 — Add your .env file
```bash
cp .env.example .env
```
Edit `.env`:
```
REACT_APP_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI...
```

### Step 5 — Restart
```bash
npm start
```
The yellow "Demo mode" banner disappears — you're now on live data.

---

## Hosting on GitHub + Vercel (Free)

### Step 1 — Push to GitHub
```bash
# In your standsync folder
git init
git add .
git commit -m "Initial commit — StandSync"

# Create a new repo on github.com named "standsync"
# Then:
git remote add origin https://github.com/YOUR_USERNAME/standsync.git
git branch -M main
git push -u origin main
```

### Step 2 — Deploy on Vercel
1. Go to [https://vercel.com](https://vercel.com) → **Add New Project**
2. Import your `standsync` GitHub repo
3. Framework: **Create React App** (auto-detected)
4. Add environment variables:
   - `REACT_APP_SUPABASE_URL` → your Supabase URL
   - `REACT_APP_SUPABASE_ANON_KEY` → your anon key
5. Click **Deploy**

Your app is live at `https://standsync.vercel.app` (or similar) in ~2 minutes.

### Step 3 — Share with team
Send the Vercel URL to your team. Everyone opens it at 9 AM during the Meet and logs in by selecting their name.

---

## How It Works (Daily Flow)

```
9:00 AM  Google Meet starts
         Tanisk speaks: "Deepak, fix the payment bug by EOD"

9:02 AM  Deepak opens standsync.vercel.app
         Clicks his name → sees member view
         Types: "Fix payment bug"
         Sets priority: High
         Sets timeline: Today EOD (6 PM)
         Hits Submit

9:02 AM  Tanisk's manager dashboard instantly shows Deepak's task
         Tanisk can reprioritize, add a note, or approve

Throughout the day:
         Deepak marks task "In progress" when he starts
         Marks "Done" when complete
         Tanisk sees progress update live
```

---

## Project Structure

```
standsync/
├── public/
│   └── index.html
├── src/
│   ├── lib/
│   │   ├── supabase.js     ← DB client + helpers
│   │   └── team.js         ← Team config (names, emails, colors)
│   ├── components/
│   │   └── UI.jsx          ← Shared design components
│   ├── views/
│   │   ├── LoginView.jsx   ← Who are you? selector
│   │   ├── MemberView.jsx  ← Team member UI
│   │   └── ManagerView.jsx ← Tanisk's dashboard
│   ├── App.jsx             ← Root + Supabase orchestration
│   └── index.js            ← Entry point
├── supabase/
│   └── schema.sql          ← Run this in Supabase SQL editor
├── .env.example
├── .gitignore
└── README.md
```

---

## Customisation

**Add/remove team members** → edit `src/lib/team.js`

**Change meeting time label** → search for "9:00 AM" and update

**Upgrade to auth** → replace the name-picker login with Supabase Auth (email magic links work great for a team this size)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 |
| Database | Supabase (PostgreSQL) |
| Real-time | Supabase Realtime (WebSockets) |
| Hosting | Vercel |
| Styling | Pure CSS-in-JS (no framework) |

---

Built with ❤️ for xtransmatrix
