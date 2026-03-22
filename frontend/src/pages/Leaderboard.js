import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLeaderboard, getChallengeProgress } from '../api';

const dark = {
  bg: '#0a0a0f', surface: '#111118', surface2: '#1a1a24',
  border: '#2a2a3a', accent: '#00ff88', accent2: '#7b61ff',
  accent3: '#ff6b6b', text: '#f0f0f5', muted: '#6b6b80',
  gold: '#ffd700', silver: '#c0c0c0', bronze: '#cd7f32',
};

const medals = ['🥇', '🥈', '🥉'];

export default function Leaderboard() {
  const navigate = useNavigate();
  const sessionId = localStorage.getItem('session_id');
  const challengeId = localStorage.getItem('challenge_id');
  const userName = localStorage.getItem('user_name');
  const [players, setPlayers] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!sessionId) { navigate('/'); return; }

    const load = async () => {
      // Try StudyHack challenge server first
      if (challengeId) {
        const res = await getChallengeProgress(challengeId);
        if (res?.data?.players) {
          setPlayers(res.data.players);
          setMeta(res.data);
          setLoading(false);
          return;
        }
      }
      // Fallback to FastAPI leaderboard
      const res = await getLeaderboard(sessionId).catch(() => null);
      setPlayers(res?.data?.leaderboard || []);
      setLoading(false);
    };

    load();
    const interval = setInterval(load, 8000); // poll every 8s
    return () => clearInterval(interval);
  }, []);

  const copyInvite = () => {
    const code = challengeId || sessionId;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const inviteCode = challengeId || sessionId;
  const isShortId = challengeId && challengeId.length <= 12;

  return (
    <div style={{ background: dark.bg, minHeight: '100vh', color: dark.text, fontFamily: "'DM Mono', monospace", position: 'relative' }}>
      {/* Grid background */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: 'linear-gradient(rgba(0,255,136,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,136,0.03) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 900, margin: '0 auto', padding: '2rem' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3rem', paddingBottom: '1.5rem', borderBottom: `1px solid ${dark.border}` }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '1.6rem', letterSpacing: '-0.02em' }}>
            Learn<span style={{ color: dark.accent }}>OS</span>
          </div>
          <div style={{ background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.3)', color: dark.accent, fontSize: '0.7rem', padding: '0.3rem 0.8rem', borderRadius: 100, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {meta?.status || 'CHALLENGE'}
          </div>
          <button onClick={() => navigate('/dashboard')} style={{ background: 'transparent', border: `1px solid ${dark.border}`, color: dark.muted, fontFamily: "'DM Mono', monospace", fontSize: '0.8rem', padding: '0.6rem 1.2rem', borderRadius: 6, cursor: 'pointer' }}>
            ← Dashboard
          </button>
        </div>

        {/* Invite card */}
        <div style={{ background: dark.surface, border: `1px solid ${dark.border}`, borderRadius: 16, padding: '1.5rem 2rem', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.1rem', marginBottom: 4 }}>
                Challenge a Friend
              </div>
              <div style={{ color: dark.muted, fontSize: '0.8rem' }}>
                Same AI content · Same schedule · Who's more consistent?
              </div>
            </div>
            <button
              onClick={copyInvite}
              style={{ background: copied ? 'rgba(0,255,136,0.15)' : dark.accent, color: copied ? dark.accent : '#000', border: copied ? `1px solid ${dark.accent}` : 'none', fontFamily: "'DM Mono', monospace", fontWeight: 500, fontSize: '0.82rem', padding: '0.7rem 1.4rem', borderRadius: 6, cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap' }}
            >
              {copied ? '✓ Copied!' : 'Copy Code'}
            </button>
          </div>
          <div style={{ background: dark.surface2, border: `1px solid ${dark.border}`, borderRadius: 8, padding: '0.8rem 1rem', fontFamily: "'DM Mono', monospace", fontSize: '0.82rem', color: dark.accent, wordBreak: 'break-all' }}>
            {inviteCode}
          </div>
          <div style={{ color: dark.muted, fontSize: '0.72rem', marginTop: 8 }}>
            {isShortId ? 'Friend pastes this code on the home page → "Join a Challenge"' : 'Share this session ID with your friend to compete'}
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '4rem', color: dark.muted }}>
            <div style={{ width: 36, height: 36, border: `2px solid ${dark.border}`, borderTopColor: dark.accent, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem' }} />
            Loading challenge data...
          </div>
        )}

        {/* No players yet */}
        {!loading && players.length === 0 && (
          <div style={{ background: dark.surface, border: `1px solid ${dark.border}`, borderRadius: 16, padding: '4rem', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>👥</div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.3rem', marginBottom: 8 }}>No challengers yet</div>
            <div style={{ color: dark.muted, fontSize: '0.85rem' }}>Share your challenge code to get started</div>
          </div>
        )}

        {/* Player cards */}
        {players.map((p, i) => {
          const isMe = p.name === userName;
          const medal = medals[i] || `#${i + 1}`;

          return (
            <div
              key={i}
              style={{
                background: dark.surface,
                border: `1px solid ${isMe ? dark.accent : dark.border}`,
                borderRadius: 16, padding: '1.5rem 2rem', marginBottom: '1rem',
                boxShadow: isMe ? `0 0 20px rgba(0,255,136,0.08)` : 'none',
                transition: 'border-color 0.2s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                <div style={{ fontSize: 32 }}>{medal}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                    {p.name}
                    {isMe && <span style={{ background: 'rgba(0,255,136,0.12)', border: '1px solid rgba(0,255,136,0.3)', color: dark.accent, fontSize: '0.65rem', padding: '0.2rem 0.6rem', borderRadius: 100, letterSpacing: '0.08em' }}>YOU</span>}
                  </div>
                  <div style={{ color: dark.muted, fontSize: '0.78rem', marginTop: 2 }}>🔥 {p.streak} day streak</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '2rem', color: p.accuracy >= 70 ? dark.accent : dark.accent3 }}>
                    {p.accuracy}%
                  </div>
                  <div style={{ color: dark.muted, fontSize: '0.72rem' }}>accuracy</div>
                </div>
              </div>

              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
                {[
                  { label: 'PROGRESS', val: `${p.progress}%` },
                  { label: 'GOALS HIT', val: p.goalsHit },
                  { label: 'TOTAL GOALS', val: p.totalGoals },
                ].map(s => (
                  <div key={s.label} style={{ background: dark.surface2, border: `1px solid ${dark.border}`, borderRadius: 10, padding: '0.9rem', textAlign: 'center' }}>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.2rem', color: dark.accent2 }}>{s.val}</div>
                    <div style={{ fontSize: '0.65rem', color: dark.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Daily consistency */}
              <div>
                <div style={{ fontSize: '0.65rem', color: dark.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Daily Consistency</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {(p.dailyLog || []).map((done, d) => (
                    <div key={d} title={`Day ${d + 1}`} style={{
                      width: 28, height: 28, borderRadius: 6,
                      background: done ? dark.accent : dark.surface2,
                      border: `1px solid ${done ? dark.accent : dark.border}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, fontWeight: 600,
                      color: done ? '#000' : dark.muted,
                      boxShadow: done ? `0 0 8px rgba(0,255,136,0.4)` : 'none',
                    }}>
                      {d + 1}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}

        {/* Head to head */}
        {players.length === 2 && (
          <div style={{ background: dark.surface, border: `1px solid ${dark.border}`, borderRadius: 16, padding: '1.5rem 2rem', marginTop: '1rem' }}>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.1rem', marginBottom: '1.5rem' }}>
              ⚡ Head to Head
            </div>
            {['accuracy', 'progress', 'streak'].map(metric => {
              const a = metric === 'streak' ? players[0].streak : players[0][metric];
              const b = metric === 'streak' ? players[1].streak : players[1][metric];
              const total = (a + b) || 1;
              return (
                <div key={metric} style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.75rem' }}>
                    <span style={{ color: dark.accent, fontWeight: 600 }}>{players[0].name}</span>
                    <span style={{ color: dark.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{metric}</span>
                    <span style={{ color: dark.accent2, fontWeight: 600 }}>{players[1].name}</span>
                  </div>
                  <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', background: dark.surface2 }}>
                    <div style={{ width: `${(a / total) * 100}%`, background: dark.accent, transition: 'width 0.6s ease' }} />
                    <div style={{ flex: 1, background: dark.accent2 }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: '0.72rem' }}>
                    <span style={{ color: dark.accent }}>{a}{metric !== 'streak' ? '%' : ''}</span>
                    <span style={{ color: dark.accent2 }}>{b}{metric !== 'streak' ? '%' : ''}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Live indicator */}
        {players.length > 0 && (
          <div style={{ textAlign: 'center', marginTop: '1.5rem', color: dark.muted, fontSize: '0.72rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: dark.accent, boxShadow: `0 0 6px ${dark.accent}`, animation: 'pulse 2s infinite' }} />
            Live · refreshes every 8s
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </div>
  );
}
