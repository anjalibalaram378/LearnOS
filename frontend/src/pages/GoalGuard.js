import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { checkGoalGuard, getGoalGuardStats } from '../api';

const GOAL_OPTIONS = [
  { id: 'studying',         label: 'Studying',         icon: '📚', redirect: '/flashcards',                                          color: '#6c63ff' },
  { id: 'coding',           label: 'Coding Practice',  icon: '💻', redirect: 'https://leetcode.com',                                 color: '#00ff88' },
  { id: 'job applications', label: 'Job Applications', icon: '📝', redirect: 'https://linkedin.com/jobs',                            color: '#f59e0b' },
  { id: 'networking',       label: 'Networking',        icon: '🤝', redirect: 'https://linkedin.com',                                color: '#06b6d4' },
  { id: 'system design',   label: 'System Design',    icon: '🏗️', redirect: 'https://github.com/donnemartin/system-design-primer',  color: '#ec4899' },
  { id: 'aws',              label: 'AWS / Cloud',      icon: '☁️', redirect: 'https://aws.amazon.com/training',                     color: '#f97316' },
];

const DISTRACTION_SITES = [
  { label: 'Instagram', icon: '📸', domain: 'instagram.com' },
  { label: 'Facebook',  icon: '👤', domain: 'facebook.com' },
  { label: 'TikTok',    icon: '🎵', domain: 'tiktok.com' },
  { label: 'Twitter/X', icon: '🐦', domain: 'twitter.com' },
  { label: 'YouTube',   icon: '▶️', domain: 'youtube.com' },
  { label: 'Reddit',    icon: '🔴', domain: 'reddit.com' },
  { label: 'Netflix',   icon: '🎬', domain: 'netflix.com' },
  { label: 'Other',     icon: '🌐', domain: 'other' },
];

function NudgePopup({ nudge, onDismiss, onGo }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem', animation: 'ggFadeIn 0.2s ease',
    }}>
      <div style={{
        background: '#111118', border: '1px solid #2a2a3a',
        borderRadius: 20, padding: '2.5rem',
        maxWidth: 440, width: '100%', textAlign: 'center',
        boxShadow: '0 24px 80px rgba(0,0,0,0.7)', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, #ef4444, #f59e0b, #ef4444)' }} />
        <div style={{ fontSize: 52, marginBottom: 16 }}>🚨</div>
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '1.3rem', color: '#f0f0f5', marginBottom: 10 }}>
          Distraction <span style={{ color: '#ef4444' }}>Detected</span>
        </div>
        <p style={{ color: '#9ca3af', fontSize: 14, lineHeight: 1.8, marginBottom: 10 }}>{nudge.message}</p>
        {nudge.duration && (
          <div style={{ fontSize: 13, color: '#f59e0b', marginBottom: 24, fontWeight: 600 }}>
            ⏱ You were away for {nudge.duration}
          </div>
        )}
        <p style={{ color: '#6b6b80', fontSize: 12, marginBottom: 24 }}>
          What were you on? <span style={{ color: '#ef4444' }}>Tap to log it.</span>
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 24 }}>
          {DISTRACTION_SITES.map(s => (
            <button key={s.domain} onClick={() => onGo(s)} style={{
              padding: '8px 14px', borderRadius: 8,
              border: '1px solid #2a2a3a', background: '#0a0a0f',
              color: '#f0f0f5', fontFamily: "'DM Mono', monospace",
              fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            }}>
              {s.icon} {s.label}
            </button>
          ))}
        </div>
        <button onClick={() => onDismiss('focused')} style={{
          background: '#00ff88', color: '#000', border: 'none',
          fontFamily: "'DM Mono', monospace", fontWeight: 600,
          fontSize: 13, padding: '10px 28px', borderRadius: 8, cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(0,255,136,0.35)',
        }}>
          I was focused ✓
        </button>
      </div>
      <style>{`@keyframes ggFadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }`}</style>
    </div>
  );
}

function FocusScore({ score }) {
  const color = score >= 70 ? '#00ff88' : score >= 40 ? '#f59e0b' : '#ef4444';
  const r = 42;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - score / 100);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <svg width={100} height={100}>
        <circle cx={50} cy={50} r={r} fill="none" stroke="#1a1a24" strokeWidth={10} />
        <circle cx={50} cy={50} r={r} fill="none" stroke={color} strokeWidth={10}
          strokeDasharray={`${circ} ${circ}`} strokeDashoffset={offset}
          strokeLinecap="round" transform="rotate(-90 50 50)"
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1)' }}
          filter={`drop-shadow(0 0 6px ${color})`}
        />
        <text x="50" y="55" textAnchor="middle" fill={color} fontSize="18" fontWeight="800" fontFamily="'Syne', sans-serif">{score}%</text>
      </svg>
      <div style={{ fontSize: 11, color: '#6b6b80', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Focus Score</div>
    </div>
  );
}

export default function GoalGuard() {
  const navigate = useNavigate();
  const userId = localStorage.getItem('user_id');
  const blockedSite = new URLSearchParams(window.location.search).get('blocked');

  const [savedGoals, setSavedGoals] = useState(() => {
    try { return JSON.parse(localStorage.getItem('gg_goals') || '[]'); } catch { return []; }
  });
  const [isActive, setIsActive] = useState(() => localStorage.getItem('gg_active') === 'true');
  const [, setStats] = useState(null);
  const [nudge, setNudge] = useState(null);
  const [log, setLog] = useState(() => {
    try { return JSON.parse(localStorage.getItem('gg_log') || '[]'); } catch { return []; }
  });
  const [urlInput, setUrlInput] = useState('');
  const [urlChecking, setUrlChecking] = useState(false);
  const [urlResult, setUrlResult] = useState(null);

  const blurTimeRef = useRef(null);
  const activeRef = useRef(isActive);
  activeRef.current = isActive;

  // Compute focus score from local log
  const totalLogs = log.length;
  const distractionCount = log.filter(e => e.type === 'distraction').length;
  const localFocusScore = totalLogs > 0 ? Math.round(((totalLogs - distractionCount) / totalLogs) * 100) : 100;

  const addLog = useCallback((entry) => {
    setLog(prev => {
      const next = [entry, ...prev.slice(0, 49)];
      localStorage.setItem('gg_log', JSON.stringify(next));
      return next;
    });
  }, []);

  // Window blur = user left tab/app
  const handleBlur = useCallback(() => {
    if (!activeRef.current) return;
    blurTimeRef.current = Date.now();
  }, []);

  // Window focus = user returned
  const handleFocus = useCallback(() => {
    if (!activeRef.current || !blurTimeRef.current) return;
    const elapsed = Math.round((Date.now() - blurTimeRef.current) / 1000);
    blurTimeRef.current = null;
    if (elapsed < 3) return; // ignore very brief blurs

    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    const durationStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

    const goalLabel = savedGoals[0] || 'your goal';
    setNudge({
      message: `You were away from your study session. You're working on ${goalLabel} — stay on track!`,
      duration: durationStr,
      elapsed,
    });
  }, [savedGoals]);

  useEffect(() => {
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, [handleBlur, handleFocus]);

  useEffect(() => {
    if (userId) {
      getGoalGuardStats(userId).then(r => { if (r?.data) setStats(r.data); });
    }
  }, [userId]);

  // Sync to chrome.storage so the extension picks up changes
  const syncToExtension = useCallback((key, value) => {
    if (typeof window.chrome !== 'undefined' && window.chrome.storage) {
      window.chrome.storage.local.set({ [key]: value });
    }
  }, []);

  const toggleGoal = (id) => {
    setSavedGoals(prev => {
      const next = prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id];
      localStorage.setItem('gg_goals', JSON.stringify(next));
      syncToExtension('gg_goals', next);
      return next;
    });
  };

  const toggleActive = () => {
    const next = !isActive;
    setIsActive(next);
    localStorage.setItem('gg_active', String(next));
    syncToExtension('gg_active', next);
    blurTimeRef.current = null;
  };

  // User logs what distraction site they were on
  const handleDistractionLog = (site) => {
    const entry = {
      type: 'distraction',
      site: site.label,
      domain: site.domain,
      icon: site.icon,
      time: new Date().toLocaleTimeString(),
      date: new Date().toLocaleDateString(),
      duration: nudge?.elapsed ? (
        nudge.elapsed < 60 ? `${nudge.elapsed}s` : `${Math.floor(nudge.elapsed / 60)}m ${nudge.elapsed % 60}s`
      ) : '—',
    };
    addLog(entry);

    // Also send to backend
    if (userId) {
      checkGoalGuard({
        user_id: userId,
        domain: site.domain,
        url: `https://${site.domain}`,
        page_title: site.label,
        user_goals: savedGoals,
      });
    }
    setNudge(null);
  };

  const handleFocusedDismiss = () => {
    addLog({
      type: 'focused',
      site: 'App',
      domain: 'localhost',
      icon: '✅',
      time: new Date().toLocaleTimeString(),
      date: new Date().toLocaleDateString(),
      duration: nudge?.elapsed ? `${nudge.elapsed}s` : '—',
    });
    setNudge(null);
  };

  // Manual URL checker
  const checkUrl = async () => {
    if (!urlInput.startsWith('http') || !userId) return;
    setUrlChecking(true);
    setUrlResult(null);
    try {
      const domain = new URL(urlInput).hostname.replace('www.', '');
      const res = await checkGoalGuard({
        user_id: userId,
        domain,
        url: urlInput,
        page_title: domain,
        user_goals: savedGoals,
      });
      if (res?.data) {
        setUrlResult(res.data);
        addLog({
          type: res.data.classification,
          site: domain,
          domain,
          icon: res.data.classification === 'productive' ? '✅' : res.data.classification === 'distraction' ? '🚫' : '➖',
          time: new Date().toLocaleTimeString(),
          date: new Date().toLocaleDateString(),
          duration: '—',
          nudge: res.data.nudge_message,
        });
      }
    } catch (e) {
      setUrlResult({ classification: 'error', nudge_message: 'Invalid URL' });
    }
    setUrlChecking(false);
  };

  const primaryGoalObj = GOAL_OPTIONS.find(g => savedGoals.includes(g.id));

  return (
    <div className="page">
      {nudge && isActive && (
        <NudgePopup
          nudge={nudge}
          onDismiss={handleFocusedDismiss}
          onGo={handleDistractionLog}
        />
      )}

      {/* Blocked banner */}
      {blockedSite && (
        <div style={{
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.35)',
          borderRadius: 14, padding: '18px 24px', marginBottom: 24,
          display: 'flex', alignItems: 'center', gap: 14, position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, #ef4444, #f59e0b)' }} />
          <div style={{ fontSize: 32 }}>🚫</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: '#ef4444', fontSize: 15, marginBottom: 3 }}>
              Blocked: {blockedSite}
            </div>
            <div style={{ fontSize: 13, color: '#6b6b80' }}>
              GoalGuard redirected you here. Stay focused on your goals!
            </div>
          </div>
          <button
            onClick={() => navigate('/goalguard')}
            style={{ background: '#00ff88', color: '#000', border: 'none', fontFamily: "'DM Mono', monospace", fontWeight: 600, fontSize: 12, padding: '8px 16px', borderRadius: 8, cursor: 'pointer' }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1>Goal<span style={{ color: '#00ff88' }}>Guard</span> 🛡️</h1>
        <p className="subtitle">Beat distractions. Stay aligned with your goals.</p>
      </div>

      {/* Status bar */}
      <div style={{
        background: isActive ? 'rgba(0,255,136,0.05)' : '#111118',
        border: `1px solid ${isActive ? 'rgba(0,255,136,0.3)' : '#2a2a3a'}`,
        borderRadius: 14, padding: '20px 24px',
        display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24,
      }}>
        <div style={{
          width: 12, height: 12, borderRadius: '50%', flexShrink: 0,
          background: isActive ? '#00ff88' : '#374151',
          boxShadow: isActive ? '0 0 10px #00ff88' : 'none',
        }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, color: '#f0f0f5', fontSize: 15 }}>
            {isActive ? 'GoalGuard is Active' : 'GoalGuard is Paused'}
          </div>
          <div style={{ fontSize: 12, color: '#6b6b80', marginTop: 2 }}>
            {isActive
              ? 'Watching for tab switches — will ask what you were doing when you return'
              : 'Enable to start tracking distractions'}
          </div>
        </div>
        <button
          onClick={toggleActive}
          disabled={savedGoals.length === 0}
          style={{
            background: isActive ? 'transparent' : '#00ff88',
            color: isActive ? '#ef4444' : '#000',
            border: isActive ? '1px solid #ef4444' : 'none',
            fontFamily: "'DM Mono', monospace", fontWeight: 600,
            fontSize: 13, padding: '10px 22px', borderRadius: 8,
            cursor: savedGoals.length === 0 ? 'not-allowed' : 'pointer',
            opacity: savedGoals.length === 0 ? 0.5 : 1, transition: 'all 0.2s',
          }}
        >
          {isActive ? 'Pause' : 'Activate'}
        </button>
      </div>

      {/* Goals */}
      <div className="card">
        <h2 style={{ marginBottom: 6 }}>Your Goals</h2>
        <p style={{ color: '#6b6b80', fontSize: 13, marginBottom: 20 }}>
          GoalGuard nudges you when you drift away from these.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {GOAL_OPTIONS.map(g => {
            const active = savedGoals.includes(g.id);
            return (
              <button key={g.id} onClick={() => toggleGoal(g.id)} style={{
                padding: '11px 18px', borderRadius: 10,
                border: `1px solid ${active ? g.color : '#2a2a3a'}`,
                background: active ? `${g.color}15` : '#1a1a24',
                color: active ? g.color : '#6b6b80',
                fontFamily: "'DM Mono', monospace", fontSize: 13, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s',
                boxShadow: active ? `0 0 16px ${g.color}30` : 'none',
              }}>
                <span style={{ fontSize: 17 }}>{g.icon}</span>
                {g.label}
                {active && <span style={{ fontSize: 10 }}>✓</span>}
              </button>
            );
          })}
        </div>
        {savedGoals.length === 0 && (
          <p style={{ marginTop: 14, color: '#f59e0b', fontSize: 12 }}>⚠️ Select at least one goal to activate</p>
        )}
      </div>

      {/* Focus stats */}
      <div className="card">
        <h2 style={{ marginBottom: 20 }}>Focus Score</h2>
        <div style={{ display: 'flex', gap: 32, alignItems: 'center', flexWrap: 'wrap' }}>
          <FocusScore score={localFocusScore} />
          <div style={{ flex: 1, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {[
              { label: 'Focused', count: log.filter(e => e.type === 'focused' || e.type === 'productive').length, color: '#00ff88', icon: '🎯' },
              { label: 'Distractions', count: distractionCount, color: '#ef4444', icon: '🚫' },
              { label: 'Total Checks', count: totalLogs, color: '#6b6b80', icon: '📊' },
            ].map(item => (
              <div key={item.label} style={{
                background: '#1a1a24', border: `1px solid ${item.color}30`,
                borderRadius: 12, padding: '14px 18px', flex: 1, minWidth: 90,
              }}>
                <div style={{ fontSize: 20, marginBottom: 4 }}>{item.icon}</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: item.color, fontFamily: "'Syne', sans-serif" }}>{item.count}</div>
                <div style={{ fontSize: 11, color: '#6b6b80', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Manual URL checker */}
      <div className="card">
        <h2 style={{ marginBottom: 6 }}>Check Any URL</h2>
        <p style={{ color: '#6b6b80', fontSize: 13, marginBottom: 16 }}>
          Paste a URL to instantly check if it aligns with your goals.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            value={urlInput}
            onChange={e => { setUrlInput(e.target.value); setUrlResult(null); }}
            placeholder="https://instagram.com"
            style={{
              flex: 1, padding: '11px 16px', borderRadius: 8,
              border: '1px solid #2a2a3a', background: '#1a1a24',
              color: '#f0f0f5', fontFamily: "'DM Mono', monospace", fontSize: 13, outline: 'none',
            }}
            onKeyDown={e => e.key === 'Enter' && checkUrl()}
          />
          <button
            onClick={checkUrl}
            disabled={urlChecking || !urlInput.startsWith('http') || savedGoals.length === 0}
            className="btn"
            style={{ fontSize: 13, padding: '11px 20px', flexShrink: 0 }}
          >
            {urlChecking ? '...' : 'Check'}
          </button>
        </div>
        {urlResult && (
          <div style={{
            marginTop: 14, padding: '14px 18px', borderRadius: 10,
            background: urlResult.classification === 'productive' ? 'rgba(0,255,136,0.08)' : urlResult.classification === 'distraction' ? 'rgba(239,68,68,0.08)' : 'rgba(107,107,128,0.08)',
            border: `1px solid ${urlResult.classification === 'productive' ? 'rgba(0,255,136,0.3)' : urlResult.classification === 'distraction' ? 'rgba(239,68,68,0.3)' : '#2a2a3a'}`,
          }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: urlResult.classification === 'productive' ? '#00ff88' : urlResult.classification === 'distraction' ? '#ef4444' : '#6b6b80', marginBottom: 4 }}>
              {urlResult.classification === 'productive' ? '✅ Productive' : urlResult.classification === 'distraction' ? '🚫 Distraction' : '➖ Neutral'}
            </div>
            {urlResult.nudge_message && (
              <div style={{ fontSize: 13, color: '#9ca3af', lineHeight: 1.6 }}>{urlResult.nudge_message}</div>
            )}
            {urlResult.redirect_suggestion && (
              <button
                onClick={() => window.open(urlResult.redirect_suggestion, '_blank')}
                style={{ marginTop: 10, background: '#00ff88', color: '#000', border: 'none', fontFamily: "'DM Mono', monospace", fontSize: 12, fontWeight: 600, padding: '6px 14px', borderRadius: 6, cursor: 'pointer' }}
              >
                Go there instead →
              </button>
            )}
          </div>
        )}
      </div>

      {/* Distraction log */}
      {log.length > 0 && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ marginBottom: 0 }}>Distraction Log</h2>
            <button
              onClick={() => { setLog([]); localStorage.removeItem('gg_log'); }}
              style={{ background: 'transparent', color: '#6b6b80', border: '1px solid #2a2a3a', fontFamily: "'DM Mono', monospace", fontSize: 11, padding: '5px 12px', borderRadius: 6, cursor: 'pointer' }}
            >
              Clear
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {log.map((entry, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px', background: '#0a0a0f', borderRadius: 8,
                border: `1px solid ${entry.type === 'focused' || entry.type === 'productive' ? '#00ff8820' : entry.type === 'distraction' ? '#ef444420' : '#2a2a3a'}`,
              }}>
                <div style={{ fontSize: 20, flexShrink: 0 }}>{entry.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: '#f0f0f5', fontWeight: 600 }}>{entry.site}</div>
                  <div style={{ fontSize: 11, color: '#6b6b80', marginTop: 2 }}>
                    {entry.date} · {entry.time} · away {entry.duration}
                  </div>
                  {entry.nudge && <div style={{ fontSize: 11, color: '#6b6b80', marginTop: 2, fontStyle: 'italic' }}>{entry.nudge}</div>}
                </div>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20, flexShrink: 0,
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                  background: entry.type === 'distraction' ? 'rgba(239,68,68,0.15)' : 'rgba(0,255,136,0.1)',
                  color: entry.type === 'distraction' ? '#ef4444' : '#00ff88',
                }}>
                  {entry.type === 'distraction' ? 'distracted' : 'focused'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick redirect */}
      {primaryGoalObj && (
        <div
          style={{
            background: '#111118', border: '1px solid #2a2a3a',
            borderRadius: 16, padding: '20px 24px',
            display: 'flex', alignItems: 'center', gap: 16,
            cursor: 'pointer', position: 'relative', overflow: 'hidden',
          }}
          onClick={() => {
            const dest = primaryGoalObj.redirect;
            if (dest.startsWith('http')) window.open(dest, '_blank');
            else navigate(dest);
          }}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${primaryGoalObj.color}, transparent)` }} />
          <div style={{ fontSize: 32 }}>{primaryGoalObj.icon}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, color: '#f0f0f5', marginBottom: 3 }}>
              Jump to {primaryGoalObj.label}
            </div>
            <div style={{ fontSize: 12, color: '#6b6b80' }}>Get back on track now</div>
          </div>
          <div style={{ color: primaryGoalObj.color, fontSize: 18 }}>→</div>
        </div>
      )}

      <button className="btn btn-outline" onClick={() => navigate('/dashboard')} style={{ marginTop: 8 }}>
        ← Back to Dashboard
      </button>
    </div>
  );
}
