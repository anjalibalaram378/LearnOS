import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDayContent } from '../api';

export default function Flashcards() {
  const navigate = useNavigate();
  const sessionId = localStorage.getItem('session_id');
  const currentDay = parseInt(localStorage.getItem('current_day') || '1');

  const [cards, setCards] = useState([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) { navigate('/'); return; }
    getDayContent(sessionId, currentDay)
      .then(r => { setCards(r.data.flashcards || []); setLoading(false); })
      .catch(() => setLoading(false));

    const startTime = Date.now();
    return () => {
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      const timeKey = `study_time_${sessionId}_day_${currentDay}`;
      const prev = parseInt(localStorage.getItem(timeKey) || '0');
      localStorage.setItem(timeKey, prev + elapsed);
    };
  }, []);

  if (loading) return <div className="page"><div className="card" style={{ textAlign: 'center', color: '#6b6b80' }}>Loading flashcards...</div></div>;
  if (!cards.length) return <div className="page"><div className="card" style={{ textAlign: 'center', color: '#6b6b80' }}>No flashcards for Day {currentDay}.</div></div>;

  const card = cards[index];
  const prev = () => { setFlipped(false); setTimeout(() => setIndex(i => Math.max(0, i - 1)), 150); };
  const next = () => { setFlipped(false); setTimeout(() => setIndex(i => Math.min(cards.length - 1, i + 1)), 150); };

  return (
    <div className="page">
      <div className="row" style={{ marginBottom: 6 }}>
        <h1>Flashcards</h1>
        <span className="spacer" />
        <button className="btn btn-outline" onClick={() => navigate('/quiz')}>Quiz →</button>
      </div>
      <p className="subtitle">Day {currentDay} · Tap the card to reveal the answer</p>

      <div className="card">
        {/* Progress bar */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
          {cards.map((_, i) => (
            <div key={i} onClick={() => { setFlipped(false); setIndex(i); }} style={{
              flex: 1, height: 3, borderRadius: 2, cursor: 'pointer',
              background: i < index ? '#00ff88' : i === index ? '#7b61ff' : '#2a2a3a',
              transition: 'background 0.3s',
            }} />
          ))}
        </div>

        <div className="flashcard-container" onClick={() => setFlipped(f => !f)}>
          <div className={`flashcard ${flipped ? 'flipped' : ''}`}>
            <div className="flashcard-front">
              <div style={{ lineHeight: 1.6 }}>{card.front}</div>
            </div>
            <div className="flashcard-back">
              <div style={{ lineHeight: 1.6 }}>{card.back}</div>
            </div>
          </div>
        </div>

        <p style={{ color: '#6b6b80', fontSize: 12, textAlign: 'center', marginTop: 10 }}>
          {flipped ? '💡 Answer revealed' : 'Tap to flip'}
        </p>

        <div className="fc-nav" style={{ marginTop: 20 }}>
          <button className="btn btn-outline" onClick={prev} disabled={index === 0}>← Prev</button>
          <span className="fc-counter">{index + 1} / {cards.length}</span>
          <button className="btn" onClick={next} disabled={index === cards.length - 1}>Next →</button>
        </div>
      </div>

      {/* Dot navigation */}
      <div className="card" style={{ padding: '20px 24px' }}>
        <div style={{ fontSize: 11, color: '#6b6b80', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Jump to card</div>
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
          {cards.map((_, i) => (
            <div key={i} onClick={() => { setFlipped(false); setIndex(i); }} style={{
              width: 32, height: 32, borderRadius: 7, cursor: 'pointer',
              background: i === index ? '#00ff88' : i < index ? 'rgba(0,255,136,0.2)' : '#1a1a24',
              border: `1px solid ${i === index ? '#00ff88' : '#2a2a3a'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 600,
              color: i === index ? '#000' : i < index ? '#00ff88' : '#6b6b80',
              boxShadow: i === index ? '0 0 10px rgba(0,255,136,0.3)' : 'none',
            }}>
              {i + 1}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
