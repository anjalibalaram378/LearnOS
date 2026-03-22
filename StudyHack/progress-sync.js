/**
 * LearnOS — Progress Sync (Person 3)
 * Drop this into your leaderboard page as a <script> tag
 * or import it as a module.
 *
 * Usage:
 *   const sync = new ProgressSync('CHALLENGE_ID', onUpdate);
 *   sync.start();   // begins polling
 *   sync.stop();    // stops polling
 *   sync.refresh(); // manual one-time refresh
 */

class ProgressSync {
  constructor(challengeId, onUpdate, options = {}) {
    this.challengeId = challengeId;
    this.onUpdate = onUpdate;           // callback(data) fired on every successful poll
    this.interval = options.interval || 30000; // default: poll every 30s
    this.apiBase = options.apiBase || 'http://localhost:4000';
    this.timer = null;
    this.lastData = null;
    this.retryCount = 0;
    this.maxRetries = 5;
  }

  // ── Start polling ──
  start() {
    console.log(`[LearnOS Sync] Started polling challenge: ${this.challengeId}`);
    this.refresh(); // immediate first fetch
    this.timer = setInterval(() => this.refresh(), this.interval);
  }

  // ── Stop polling ──
  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      console.log('[LearnOS Sync] Stopped.');
    }
  }

  // ── Single fetch ──
  async refresh() {
    try {
      const res = await fetch(`${this.apiBase}/api/challenge/${this.challengeId}/progress`);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      this.retryCount = 0;

      // Only fire callback if data actually changed
      const serialized = JSON.stringify(data.players);
      if (serialized !== this._lastSerialized) {
        this._lastSerialized = serialized;
        this.lastData = data;
        this.onUpdate(data);
        console.log(`[LearnOS Sync] Data updated at ${new Date().toLocaleTimeString()}`);
      }

      return data;
    } catch (err) {
      this.retryCount++;
      console.warn(`[LearnOS Sync] Poll failed (attempt ${this.retryCount}):`, err.message);

      // Exponential backoff — slow down retries on repeated failures
      if (this.retryCount >= this.maxRetries) {
        console.error('[LearnOS Sync] Max retries reached. Using mock data.');
        this.onUpdate(this._getMockData());
        this.stop();
      }
    }
  }

  // ── Mock data for demo / API-down fallback ──
  _getMockData() {
    return {
      challengeId: this.challengeId,
      title: 'DSA — Arrays & Hashing',
      status: 'active',
      duration: 7,
      currentDay: 5,
      fetchedAt: new Date().toISOString(),
      players: [
        {
          name: 'You',
          accuracy: 84,
          streak: 5,
          progress: 71,
          goalsHit: 15,
          totalGoals: 21,
          dailyLog: [true, true, true, true, true, false, false],
          todayGoals: { review: true, quiz: true, accuracy: false },
          lastUpdated: new Date().toISOString(),
        },
        {
          name: 'Alex K.',
          accuracy: 76,
          streak: 4,
          progress: 57,
          goalsHit: 12,
          totalGoals: 21,
          dailyLog: [true, true, false, true, true, false, false],
          todayGoals: { review: true, quiz: false, accuracy: false },
          lastUpdated: new Date().toISOString(),
        },
      ],
    };
  }
}


// ─────────────────────────────────────────────────────────
// DOM UPDATER — call this inside your onUpdate callback
// to refresh the leaderboard UI automatically
// ─────────────────────────────────────────────────────────

function updateLeaderboardDOM(data) {
  const { players, currentDay, duration, title } = data;

  // Update sprint title
  const titleEl = document.getElementById('sprint-title');
  if (titleEl) titleEl.textContent = title;

  // Update day counter
  const dayEl = document.getElementById('sprint-day');
  if (dayEl) dayEl.textContent = `Day ${currentDay} of ${duration}`;

  // Update each player card
  players.forEach((player, index) => {
    const rank = index + 1;
    const prefix = `player-${rank}`;

    setText(`${prefix}-name`, player.name);
    setText(`${prefix}-accuracy`, player.accuracy + '%');
    setText(`${prefix}-streak`, player.streak);
    setText(`${prefix}-progress`, player.progress + '%');
    setText(`${prefix}-goals`, `${player.goalsHit}/${player.totalGoals}`);

    // Animate progress bar
    const bar = document.getElementById(`${prefix}-bar`);
    if (bar) bar.style.width = player.progress + '%';

    // Update streak bar days
    player.dailyLog.forEach((done, dayIdx) => {
      const dayEl = document.getElementById(`${prefix}-day-${dayIdx}`);
      if (!dayEl) return;
      dayEl.className = 'streak-day';
      if (dayIdx === currentDay - 1) {
        dayEl.classList.add('today');
      } else if (done) {
        dayEl.classList.add(rank === 1 ? 'done-green' : 'done-purple');
      }
    });

    // Update today's goals checkboxes
    const goals = player.todayGoals;
    setGoal(`${prefix}-goal-review`, goals?.review);
    setGoal(`${prefix}-goal-quiz`, goals?.quiz);
    setGoal(`${prefix}-goal-accuracy`, goals?.accuracy);
  });

  // Update last-synced timestamp
  const syncEl = document.getElementById('last-synced');
  if (syncEl) syncEl.textContent = `Last synced: ${new Date().toLocaleTimeString()}`;
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function setGoal(id, done) {
  const el = document.getElementById(id);
  if (!el) return;
  el.className = 'goal-check' + (done ? ' done' : '');
  el.textContent = done ? '✓' : '';
}


// ─────────────────────────────────────────────────────────
// EXAMPLE — paste this into your leaderboard page script
// ─────────────────────────────────────────────────────────

/*
const challengeId = new URLSearchParams(window.location.search).get('id') || 'demo';

const sync = new ProgressSync(challengeId, (data) => {
  updateLeaderboardDOM(data);
}, {
  interval: 30000,  // poll every 30 seconds
  apiBase: 'http://localhost:4000',
});

sync.start();

// Stop polling when tab is hidden (save resources)
document.addEventListener('visibilitychange', () => {
  if (document.hidden) sync.stop();
  else sync.start();
});
*/
