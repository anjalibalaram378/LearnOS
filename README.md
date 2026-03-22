# LearnOS 🧠⚡

> **Apple Fitness. For Your Brain.**

Upload any study material. Get a full AI-generated learning plan. Challenge a friend to a fair sprint. Stay consistent. Win.

---

## 🚀 What is LearnOS?

LearnOS is an AI-powered study accountability platform that combines structured learning with social competition. Unlike traditional study apps that just give you content, LearnOS makes sure you actually show up every day.

**The core loop:**
1. **Upload** — Drop any PDF, notes, or textbook chapter
2. **Generate** — AI instantly creates flashcards, quizzes & a daily schedule
3. **Compete** — Challenge a friend to a 7 or 14-day sprint with identical AI content
4. **Stay on track** — GoalGuard detects distraction and nudges you back in real time

---

## ✨ Features

### 📚 AI Study Plan Generation
- Upload any PDF or study material
- Instantly generates flashcards, quizzes, and a daily schedule
- Works for DSA prep, AWS certs, college exams, system design — anything

### ⚔️ Friend Challenge System
- Create a learning sprint and invite a friend via link
- Both players receive the exact same AI-generated content
- Fair competition — consistency is the only edge

### 📊 Live Leaderboard
- Real-time accuracy, streak, and progress tracking
- Daily goal completion tracking (review, quiz, accuracy target)
- Auto-refreshes every 30 seconds

### 🔔 GoalGuard — Distraction Detection
- Monitors idle time during study sessions
- 3 escalating nudge levels:
  - 🟢 **Gentle Nudge** (2 min) — "Still with us?"
  - 🟡 **Warning** (5 min) — "Your streak is on the line"
  - 🔴 **Distraction Alert** (10 min) — "Your opponent is still studying"
- Mindful guidance, not hard blocking

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML, CSS, JavaScript |
| Backend | Node.js, Express |
| AI Generation | Claude API (Anthropic) |
| Database | In-memory (Supabase-ready) |
| Deployment | Vercel (frontend) + Render (backend) |

---

## 📁 Project Structure

```
StudyHack/
├── learnos-challenge.html   # Main app UI — home, create challenge, leaderboard
├── join-flow.html           # Opponent invite link landing page
├── goalguard-nudge.html     # Distraction detection overlay
├── progress-sync.js         # Live leaderboard polling module
├── server.js                # Express backend — all API endpoints
├── package.json
└── README.md
```

---

## ⚙️ Getting Started

### Prerequisites
- Node.js v18+
- npm

### Installation

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/learnos.git
cd learnos

# Install dependencies
npm install

# Start the backend
node server.js
# Backend runs on http://localhost:4000

# In a second terminal, serve the frontend
npx serve .
# Frontend runs on http://localhost:3000
```

### Open the app
```
http://localhost:3000/learnos-challenge.html
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/challenge/create` | Create a new challenge |
| `GET` | `/api/challenge/:id` | Get challenge details |
| `POST` | `/api/challenge/:id/join` | Join a challenge as opponent |
| `GET` | `/api/challenge/:id/progress` | Get both players' live stats |
| `POST` | `/api/challenge/:id/update-progress` | Update a player's daily progress |

### Example — Create a Challenge
```bash
curl -X POST http://localhost:4000/api/challenge/create \
  -H "Content-Type: application/json" \
  -d '{"title":"DSA Grind","topic":"Arrays","creatorName":"Alex","duration":7,"accuracyTarget":80}'
```

### Response
```json
{
  "challengeId": "f8c45807",
  "inviteUrl": "http://localhost:3000/join-flow.html?id=f8c45807",
  "expiresAt": "2026-03-29T17:04:03.121Z",
  "message": "Challenge created. Share the invite URL with your opponent."
}
```

---

## 🎮 How to Demo

1. Open `http://localhost:3000/learnos-challenge.html`
2. Click **+ New Challenge** → fill in details → copy invite link
3. Open invite link in a second tab or device → enter opponent name → accept
4. Go to **Live Board** → see both players tracked in real time
5. Open `goalguard-nudge.html` → trigger all 3 nudge levels

---

## 👥 Team

Built at **[Hackathon Name]** — 2026

| Role | Responsibility |
|---|---|
| Person 1 | AI Engine & Backend — PDF parsing, Claude integration, quiz generation |
| Person 2 | Frontend & UX — Study dashboard, flashcard UI, daily goals |
| Person 3 | Social Layer & Pitch — Challenge system, leaderboard, GoalGuard |

---

## 📄 License

MIT License — feel free to use, modify, and build on this.

---

> *"You bring the content. AI handles the rest."*
