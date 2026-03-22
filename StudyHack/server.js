// LearnOS — Person 3 Backend
// Run: npm install express cors uuid && node server.js

const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(express.json());

// ─── In-memory store (swap for Supabase/Firebase on Day 2) ───
const challenges = {};
const progress = {};

// ─────────────────────────────────────────
// POST /api/challenge/create
// Body: { title, topic, creatorName, duration, accuracyTarget }
// Returns: { challengeId, inviteUrl, expiresAt }
// ─────────────────────────────────────────
app.post('/api/challenge/create', (req, res) => {
  const { title, topic, creatorName, duration, accuracyTarget, sessionId } = req.body;

  if (!title || !topic || !creatorName) {
    return res.status(400).json({ error: 'title, topic, and creatorName are required' });
  }

  const challengeId = uuidv4().split('-')[0]; // short ID e.g. "a1b2c3d4"
  const inviteUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/join/${challengeId}`;

  challenges[challengeId] = {
    id: challengeId,
    title,
    topic,
    duration: duration || 7,
    accuracyTarget: accuracyTarget || 80,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + (duration || 7) * 86400000).toISOString(),
    status: 'pending', // pending | active | complete
    players: {
      creator: {
        name: creatorName,
        joinedAt: new Date().toISOString(),
      },
      opponent: null,
    },
    sessionId: sessionId || null, // FastAPI session ID — shared with joining player
    sharedContent: { sessionId: sessionId || null },
  };

  // Init progress for creator
  progress[challengeId] = {
    [creatorName]: createEmptyProgress(creatorName, duration || 7),
  };

  console.log(`✅ Challenge created: ${challengeId} — "${title}"`);

  res.json({
    challengeId,
    inviteUrl,
    expiresAt: challenges[challengeId].expiresAt,
    message: 'Challenge created. Share the invite URL with your opponent.',
  });
});


// ─────────────────────────────────────────
// GET /api/challenge/:id
// Returns challenge details (for join page)
// ─────────────────────────────────────────
app.get('/api/challenge/:id', (req, res) => {
  const challenge = challenges[req.params.id];
  if (!challenge) return res.status(404).json({ error: 'Challenge not found' });

  res.json({
    id: challenge.id,
    title: challenge.title,
    topic: challenge.topic,
    duration: challenge.duration,
    accuracyTarget: challenge.accuracyTarget,
    status: challenge.status,
    sessionId: challenge.sessionId,
    creatorName: challenge.players.creator.name,
    opponentName: challenge.players.opponent?.name || null,
    createdAt: challenge.createdAt,
    expiresAt: challenge.expiresAt,
  });
});


// ─────────────────────────────────────────
// POST /api/challenge/:id/join
// Body: { opponentName }
// Returns: { success, sharedContent, challengeDetails }
// ─────────────────────────────────────────
app.post('/api/challenge/:id/join', (req, res) => {
  const challenge = challenges[req.params.id];
  if (!challenge) return res.status(404).json({ error: 'Challenge not found' });
  if (challenge.players.opponent) return res.status(409).json({ error: 'Challenge already has an opponent' });

  const { opponentName } = req.body;
  if (!opponentName) return res.status(400).json({ error: 'opponentName is required' });

  challenge.players.opponent = {
    name: opponentName,
    joinedAt: new Date().toISOString(),
  };
  challenge.status = 'active';

  // Init progress for opponent
  progress[challenge.id][opponentName] = createEmptyProgress(opponentName, challenge.duration);

  console.log(`🤝 ${opponentName} joined challenge: ${challenge.id}`);

  res.json({
    success: true,
    message: `Welcome ${opponentName}! Challenge is now active.`,
    sharedContent: challenge.sharedContent,
    challengeDetails: {
      id: challenge.id,
      title: challenge.title,
      topic: challenge.topic,
      duration: challenge.duration,
      accuracyTarget: challenge.accuracyTarget,
      startedAt: new Date().toISOString(),
      expiresAt: challenge.expiresAt,
    },
  });
});


// ─────────────────────────────────────────
// GET /api/challenge/:id/progress
// Returns both players' latest stats (used by polling)
// ─────────────────────────────────────────
app.get('/api/challenge/:id/progress', (req, res) => {
  const challenge = challenges[req.params.id];
  if (!challenge) return res.status(404).json({ error: 'Challenge not found' });

  const playerProgress = progress[req.params.id] || {};
  const players = Object.values(playerProgress).map(p => ({
    name: p.name,
    accuracy: p.accuracy,
    streak: p.streak,
    progress: p.progress,
    goalsHit: p.goalsHit,
    totalGoals: p.totalGoals,
    dailyLog: p.dailyLog,
    todayGoals: p.todayGoals,
    lastUpdated: p.lastUpdated,
  }));

  // Sort by progress desc
  players.sort((a, b) => b.progress - a.progress);

  res.json({
    challengeId: req.params.id,
    title: challenge.title,
    status: challenge.status,
    duration: challenge.duration,
    currentDay: getCurrentDay(challenge.createdAt),
    players,
    fetchedAt: new Date().toISOString(),
  });
});


// ─────────────────────────────────────────
// POST /api/challenge/:id/update-progress
// Body: { playerName, accuracy, goalsCompleted }
// Called by Person 1's backend when a player completes daily goals
// ─────────────────────────────────────────
app.post('/api/challenge/:id/update-progress', (req, res) => {
  const challenge = challenges[req.params.id];
  if (!challenge) return res.status(404).json({ error: 'Challenge not found' });

  const { playerName, accuracy, goalsCompleted } = req.body;
  const playerData = progress[req.params.id]?.[playerName];
  if (!playerData) return res.status(404).json({ error: 'Player not found in this challenge' });

  const today = getCurrentDay(challenge.createdAt) - 1; // 0-indexed
  playerData.dailyLog[today] = goalsCompleted >= 2; // hit streak if 2+ goals done
  playerData.accuracy = accuracy;
  playerData.goalsHit += goalsCompleted;
  playerData.streak = calculateStreak(playerData.dailyLog);
  playerData.progress = Math.round((playerData.goalsHit / playerData.totalGoals) * 100);
  playerData.todayGoals = {
    review: goalsCompleted >= 1,
    quiz: goalsCompleted >= 2,
    accuracy: accuracy >= challenge.accuracyTarget,
  };
  playerData.lastUpdated = new Date().toISOString();

  res.json({ success: true, updatedProgress: playerData });
});


// ─── Helpers ───────────────────────────────

function createEmptyProgress(name, duration) {
  return {
    name,
    accuracy: 0,
    streak: 0,
    progress: 0,
    goalsHit: 0,
    totalGoals: duration * 3, // 3 goals per day
    dailyLog: new Array(duration).fill(false),
    todayGoals: { review: false, quiz: false, accuracy: false },
    lastUpdated: new Date().toISOString(),
  };
}

function calculateStreak(dailyLog) {
  let streak = 0;
  for (let i = dailyLog.length - 1; i >= 0; i--) {
    if (dailyLog[i]) streak++;
    else break;
  }
  return streak;
}

function getCurrentDay(createdAt) {
  const diff = Date.now() - new Date(createdAt).getTime();
  return Math.min(Math.floor(diff / 86400000) + 1, 999);
}

function generateMockContent(topic) {
  // Replace with Person 1's AI generation endpoint
  return {
    flashcards: [
      { id: 1, front: `What is the time complexity of binary search?`, back: `O(log n)` },
      { id: 2, front: `What data structure uses LIFO order?`, back: `Stack` },
      { id: 3, front: `Define ${topic} in one sentence.`, back: `[AI will fill this in]` },
    ],
    quizzes: [
      {
        id: 1,
        question: `Which sorting algorithm has the best average case?`,
        options: ['Bubble Sort', 'Merge Sort', 'Quick Sort', 'Insertion Sort'],
        answer: 2,
      },
    ],
  };
}

// ─── Serve HTML files ─────────────────────────────────────────────────────
const path = require('path');
app.use(express.static(__dirname));

// Clean URL: /join/:id → join-flow.html (ID read from URL by the page JS)
app.get('/join/:id', (req, res) => res.sendFile(path.join(__dirname, 'join-flow.html')));

// Root → challenge arena
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'learnos-challenge.html')));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 LearnOS backend running on http://localhost:${PORT}`));
