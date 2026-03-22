import React from 'react';

export default function GoalGuardPopup({ message, redirect, onDismiss }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem',
      animation: 'ggFadeIn 0.2s ease',
      backdropFilter: 'blur(4px)',
    }}>
      <div style={{
        background: '#111118',
        border: '1px solid #2a2a3a',
        borderRadius: 20,
        padding: '2.5rem',
        maxWidth: 420, width: '100%',
        textAlign: 'center',
        fontFamily: "'DM Mono', monospace",
        boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Green glow top */}
        <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 200, height: 1, background: 'linear-gradient(90deg, transparent, #00ff88, transparent)' }} />

        <div style={{ fontSize: 48, marginBottom: 16 }}>🛡️</div>

        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '1.4rem', color: '#f0f0f5', marginBottom: 8 }}>
          Goal<span style={{ color: '#00ff88' }}>Guard</span>
        </div>

        <p style={{ color: '#6b6b80', fontSize: '0.88rem', lineHeight: 1.7, marginBottom: '2rem' }}>
          {message || "You planned to study today — want to get back on track?"}
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button
            onClick={onDismiss}
            style={{
              background: 'transparent', color: '#6b6b80',
              border: '1px solid #2a2a3a', fontFamily: "'DM Mono', monospace",
              fontSize: '0.82rem', padding: '0.75rem 1.5rem', borderRadius: 8, cursor: 'pointer',
            }}
          >
            Dismiss
          </button>
          <button
            onClick={() => {
              onDismiss();
              const dest = redirect || '/flashcards';
              if (dest.startsWith('http')) window.open(dest, '_blank');
              else window.location.href = dest;
            }}
            style={{
              background: '#00ff88', color: '#000',
              border: 'none', fontFamily: "'DM Mono', monospace", fontWeight: 500,
              fontSize: '0.82rem', padding: '0.75rem 1.5rem', borderRadius: 8, cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(0,255,136,0.3)',
            }}
          >
            Go Study →
          </button>
        </div>
      </div>

      <style>{`@keyframes ggFadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style>
    </div>
  );
}
