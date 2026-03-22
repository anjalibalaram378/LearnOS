import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStreak, logProgress, getDayContent } from '../api';
import GoalGuardPopup from '../components/GoalGuardPopup';

function ActivityRings({ review, quiz, accuracy }) {
  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const strokeWidth = 20;
  const gap = 10;

  const rings = [
    { r: 88, color: '#ef4444', done: review,   label: 'Review',   icon: '📖' },
    { r: 88 - strokeWidth - gap, color: '#22c55e', done: quiz,     label: 'Quiz',     icon: '❓' },
    { r: 88 - (strokeWidth + gap) * 2, color: '#6c63ff', done: accuracy, label: 'Accuracy', icon: '🎯' },
  ];

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 40, flexWrap: 'wrap' }}>
      <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
        <svg width={size} height={size}>
          <defs>
            {rings.map((_ring, i) => (
              <filter key={i} id={`glow${i}`}>
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            ))}
          </defs>
          {rings.map((ring, i) => {
            const circumference = 2 * Math.PI * ring.r;
            const offset = ring.done ? 0 : circumference;
            return (
              <g key={i}>
                {/* Track (always visible gray) */}
                <circle
                  cx={cx} cy={cy} r={ring.r}
                  fill="none"
                  stroke="#2a2a3a"
                  strokeWidth={strokeWidth}
                />
                {/* Active fill */}
                <circle
                  cx={cx} cy={cy} r={ring.r}
                  fill="none"
                  stroke={ring.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${circumference} ${circumference}`}
                  strokeDashoffset={offset}
                  strokeLinecap="round"
                  transform={`rotate(-90 ${cx} ${cy})`}
                  filter={ring.done ? `url(#glow${i})` : undefined}
                  style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)' }}
                />
              </g>
            );
          })}
        </svg>
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 32 }}>
            {review && quiz && accuracy ? '🏆' : review && quiz ? '🔥' : '💪'}
          </div>
          <div style={{ fontSize: 11, color: '#888', marginTop: 2, fontWeight: 600 }}>
            {review && quiz && accuracy ? 'ALL DONE' : 'TODAY'}
          </div>
        </div>
      </div>

      {/* Ring legend */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {rings.map((ring, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 18, height: 18, borderRadius: '50%',
              background: ring.done ? ring.color : '#e5e7eb',
              flexShrink: 0,
              boxShadow: ring.done ? `0 0 10px ${ring.color}` : 'none',
              transition: 'all 0.4s',
            }} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: ring.done ? '#1a1a2e' : '#888' }}>
                {ring.icon} {ring.label}
              </div>
              <div style={{ fontSize: 12, color: ring.done ? ring.color : '#bbb', fontWeight: 600 }}>
                {ring.done ? 'Complete' : 'Pending'}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const userId = localStorage.getItem('user_id');
  const sessionId = localStorage.getItem('session_id');
  const totalDays = parseInt(localStorage.getItem('total_days') || '7');
  const [currentDay, setCurrentDay] = useState(parseInt(localStorage.getItem('current_day') || '1'));
  const userName = localStorage.getItem('user_name') || 'You';

  const [streak, setStreak] = useState({ current_streak: 0, average_accuracy: 0, total_days_completed: 0 });
  const [goals, setGoals] = useState({ review: false, quiz: false, accuracy: false });
  const [dayPlan, setDayPlan] = useState(null);
  const [showGoalGuard, setShowGoalGuard] = useState(false);
  const [studySeconds, setStudySeconds] = useState(0);

  useEffect(() => {
    if (!sessionId) { navigate('/'); return; }
    const latestDay = parseInt(localStorage.getItem('current_day') || '1');
    setCurrentDay(latestDay);

    // Load saved goals for today
    const goalsKey = `goals_${sessionId}_day_${latestDay}`;
    const saved = JSON.parse(localStorage.getItem(goalsKey) || '{}');
    setGoals({ review: !!saved.review, quiz: !!saved.quiz, accuracy: !!saved.accuracy });

    // Load study time for today
    const timeKey = `study_time_${sessionId}_day_${latestDay}`;
    setStudySeconds(parseInt(localStorage.getItem(timeKey) || '0'));

    // Refresh study time every 10s in case they just came back from studying
    const interval = setInterval(() => {
      setStudySeconds(parseInt(localStorage.getItem(timeKey) || '0'));
    }, 10000);

    getStreak(userId, sessionId).then(r => setStreak(r.data)).catch(() => {});
    getDayContent(sessionId, latestDay).then(r => setDayPlan(r.data.plan)).catch(() => {});

    const t = setTimeout(() => setShowGoalGuard(true), 8000);
    return () => { clearTimeout(t); clearInterval(interval); };
  }, []);

  const markReview = async () => {
    const newGoals = { ...goals, review: true };
    setGoals(newGoals);
    const goalsKey = `goals_${sessionId}_day_${currentDay}`;
    localStorage.setItem(goalsKey, JSON.stringify(newGoals));
    await logProgress({
      user_id: userId, session_id: sessionId, day_number: currentDay,
      review_done: true, quiz_done: goals.quiz, accuracy: goals.accuracy ? streak.average_accuracy : null,
    }).catch(() => {});
  };

  const allDone = goals.review && goals.quiz && goals.accuracy;
  const doneCount = [goals.review, goals.quiz, goals.accuracy].filter(Boolean).length;
  const studyMins = Math.floor(studySeconds / 60);

  return (
    <div className="page">
      {showGoalGuard && (
        <GoalGuardPopup
          message="You planned to study today — let's get back on track!"
          redirect="/flashcards"
          onDismiss={() => setShowGoalGuard(false)}
        />
      )}

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1>Hey, {userName} 👋</h1>
        <p className="subtitle">
          Day {currentDay} of {totalDays}
          {dayPlan?.topic && <> · <strong style={{ color: '#00ff88' }}>{dayPlan.topic}</strong></>}
        </p>
      </div>

      {/* Streak Banner */}
      <div className="streak-banner">
        <div>
          <div className="streak-num">🔥 {streak.current_streak}</div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 20, fontWeight: 700 }}>Day Streak</div>
          <div className="streak-label">
            {streak.total_days_completed} days completed · {Math.round(streak.average_accuracy)}% avg accuracy
          </div>
        </div>
        <div style={{ display: 'flex', gap: 24 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{doneCount}/3</div>
            <div style={{ fontSize: 11, opacity: 0.8 }}>goals</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 800 }}>⏱ {studyMins}m</div>
            <div style={{ fontSize: 11, opacity: 0.8 }}>today</div>
          </div>
        </div>
      </div>

      {/* Activity Rings + Today's Goals */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <h2 style={{ marginBottom: 0 }}>Today's Activity</h2>
          {allDone && (
            <span style={{ background: 'rgba(0,255,136,0.1)', color: '#00ff88', border: '1px solid rgba(0,255,136,0.3)', fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 20 }}>
              🎉 All Complete!
            </span>
          )}
        </div>

        <ActivityRings review={goals.review} quiz={goals.quiz} accuracy={goals.accuracy} />

        {/* Today's plan snippet */}
        {dayPlan?.summary && (
          <div style={{ marginTop: 24, background: '#1a1a24', border: '1px solid #2a2a3a', borderRadius: 12, padding: '16px 20px' }}>
            <div style={{ fontSize: 11, color: '#00ff88', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Today's Topic
            </div>
            <div style={{ fontSize: 14, color: '#f0f0f5', lineHeight: 1.7 }}>{dayPlan.summary}</div>
            {dayPlan.key_concepts?.length > 0 && (
              <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {dayPlan.key_concepts.map((c, i) => (
                  <span key={i} className="tag">{c}</span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Goal action buttons */}
        <div style={{ display: 'flex', gap: 12, marginTop: 24, flexWrap: 'wrap' }}>
          {!goals.review && (
            <button className="btn btn-outline" style={{ fontSize: 13, padding: '8px 18px' }} onClick={markReview}>
              📖 Mark Review Done
            </button>
          )}
          <button className="btn" style={{ fontSize: 13, padding: '8px 18px' }} onClick={() => navigate('/flashcards')}>
            📚 Flashcards
          </button>
          <button
            className={goals.quiz ? 'btn btn-outline' : 'btn'}
            style={{ fontSize: 13, padding: '8px 18px' }}
            onClick={() => navigate('/quiz')}
          >
            {goals.quiz ? '✅ Quiz Done' : '❓ Start Quiz'}
          </button>
        </div>
      </div>

      {/* Progress grid */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ marginBottom: 0 }}>Sprint Progress</h2>
          <span style={{ fontSize: 13, color: '#00ff88', fontWeight: 600 }}>
            {currentDay - 1}/{totalDays} days done
          </span>
        </div>
        <div className="day-grid">
          {Array.from({ length: totalDays }, (_, i) => {
            const day = i + 1;
            const cls = day < currentDay ? 'done' : day === currentDay ? 'today' : 'empty';
            return <div key={day} className={`day-dot ${cls}`}>{day}</div>;
          })}
        </div>
      </div>

      {/* GoalGuard CTA */}
      <div
        style={{
          background: '#111118', border: '1px solid #2a2a3a',
          borderRadius: 16, padding: '20px 28px',
          display: 'flex', alignItems: 'center', gap: 16,
          cursor: 'pointer', position: 'relative', overflow: 'hidden',
          marginBottom: 12,
        }}
        onClick={() => navigate('/goalguard')}
      >
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, #6c63ff, #00ff88)' }} />
        <div style={{ fontSize: 36 }}>🛡️</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, color: '#f0f0f5', marginBottom: 3 }}>GoalGuard</div>
          <div style={{ color: '#6b6b80', fontSize: 12 }}>Set your goals. Beat distractions. Stay on track.</div>
        </div>
        <div style={{ color: '#6c63ff', fontSize: 18 }}>→</div>
      </div>

      {/* Challenge CTA */}
      <div
        style={{
          background: '#111118', border: '1px solid #2a2a3a',
          borderRadius: 16, padding: '24px 32px',
          display: 'flex', alignItems: 'center', gap: 16,
          cursor: 'pointer', position: 'relative', overflow: 'hidden',
        }}
        onClick={() => navigate('/leaderboard')}
      >
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, #00ff88, #7b61ff)' }} />
        <div style={{ fontSize: 40 }}>⚔️</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, marginBottom: 4, color: '#f0f0f5' }}>Challenge a Friend</div>
          <div style={{ color: '#6b6b80', fontSize: 13 }}>Same content. Same schedule. Who studies harder?</div>
        </div>
        <div style={{ color: '#00ff88', fontSize: 18 }}>→</div>
      </div>
    </div>
  );
}
