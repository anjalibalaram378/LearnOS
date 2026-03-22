import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDayContent, logProgress, updateChallengeProgress } from '../api';

export default function Quiz() {
  const navigate = useNavigate();
  const sessionId = localStorage.getItem('session_id');
  const userId = localStorage.getItem('user_id');
  const currentDay = parseInt(localStorage.getItem('current_day') || '1');
  const totalDays = parseInt(localStorage.getItem('total_days') || '7');

  const [allQuestions, setAllQuestions] = useState([]);
  const [queue, setQueue] = useState([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [wrongOnes, setWrongOnes] = useState([]);
  const [round, setRound] = useState(1);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) { navigate('/'); return; }
    getDayContent(sessionId, currentDay)
      .then(r => { const qs = r.data.quiz_questions || []; setAllQuestions(qs); setQueue(qs); setLoading(false); })
      .catch(() => setLoading(false));

    const startTime = Date.now();
    return () => {
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      const timeKey = `study_time_${sessionId}_day_${currentDay}`;
      const prev = parseInt(localStorage.getItem(timeKey) || '0');
      localStorage.setItem(timeKey, prev + elapsed);
    };
  }, []);

  if (loading) return <div className="page"><div className="card" style={{ textAlign: 'center', color: '#6b6b80' }}>Loading quiz...</div></div>;
  if (!queue.length && !done) return <div className="page"><div className="card" style={{ textAlign: 'center', color: '#6b6b80' }}>No quiz questions for Day {currentDay}.</div></div>;

  const q = queue[index];
  const accuracy = totalAnswered > 0 ? Math.round((correctCount / allQuestions.length) * 100) : 0;

  const handleAnswer = (i) => {
    if (answered) return;
    setSelected(i); setAnswered(true); setTotalAnswered(t => t + 1);
    if (i === q.correct_index) setCorrectCount(c => c + 1);
    else setWrongOnes(w => [...w, q]);
  };

  const handleNext = async () => {
    const isLast = index + 1 >= queue.length;
    if (isLast) {
      if (wrongOnes.length > 0 && round === 1) {
        setRound(2); setQueue(wrongOnes); setWrongOnes([]);
        setIndex(0); setSelected(null); setAnswered(false);
      } else {
        const finalAccuracy = Math.round((correctCount / allQuestions.length) * 100);
        try {
          await logProgress({ user_id: userId, session_id: sessionId, day_number: currentDay, review_done: true, quiz_done: true, accuracy: finalAccuracy });
          const goalsKey = `goals_${sessionId}_day_${currentDay}`;
          localStorage.setItem(goalsKey, JSON.stringify({ review: true, quiz: true, accuracy: finalAccuracy >= 70 }));
          const challengeId = localStorage.getItem('challenge_id');
          const userName = localStorage.getItem('user_name');
          if (challengeId && userName) {
            const goalsCompleted = 2 + (finalAccuracy >= 70 ? 1 : 0);
            updateChallengeProgress(challengeId, { playerName: userName, accuracy: finalAccuracy, goalsCompleted });
          }
          if (finalAccuracy >= 70 && currentDay < totalDays) localStorage.setItem('current_day', currentDay + 1);
        } catch (e) {}
        setDone(true);
      }
    } else {
      setSelected(null); setAnswered(false); setIndex(i => i + 1);
    }
  };

  if (done) {
    const finalAccuracy = Math.round((correctCount / allQuestions.length) * 100);
    const passed = finalAccuracy >= 70;
    const nextDay = currentDay + 1;
    const dayAdvanced = passed && nextDay <= totalDays;

    return (
      <div className="page">
        <div className="card" style={{ textAlign: 'center', padding: '56px 32px' }}>
          <div style={{ fontSize: 56, marginBottom: 14 }}>{passed ? '🎉' : '💪'}</div>
          <h1 style={{ marginBottom: 8 }}>{passed ? 'Day Complete!' : 'Keep Going!'}</h1>
          <p className="subtitle">{passed ? (dayAdvanced ? `Day ${currentDay} done! Day ${nextDay} unlocked.` : "You've completed all days!") : 'Score 70%+ to advance. You got this!'}</p>

          <div style={{ background: '#1a1a24', border: `1px solid ${passed ? '#00ff88' : '#ff6b6b'}`, borderRadius: 14, padding: 28, margin: '20px 0' }}>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: '3rem', fontWeight: 800, color: passed ? '#00ff88' : '#ff6b6b' }}>{finalAccuracy}%</div>
            <div style={{ color: '#6b6b80', marginTop: 4, fontSize: 13 }}>
              {correctCount}/{allQuestions.length} correct
              {round === 2 && <span style={{ color: '#7b61ff', marginLeft: 8 }}>· adaptive retry</span>}
            </div>
            <div className="accuracy-bar" style={{ marginTop: 14 }}>
              <div className="accuracy-fill" style={{ width: `${finalAccuracy}%`, background: passed ? '#00ff88' : '#ff6b6b' }} />
            </div>
            {dayAdvanced && (
              <div style={{ marginTop: 14, background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.3)', borderRadius: 8, padding: 10, color: '#00ff88', fontSize: 13, fontWeight: 600 }}>
                ✅ Day {nextDay} unlocked!
              </div>
            )}
          </div>

          <div className="row" style={{ justifyContent: 'center' }}>
            {!passed && (
              <button className="btn btn-outline" onClick={() => {
                setDone(false); setIndex(0); setCorrectCount(0); setTotalAnswered(0);
                setSelected(null); setAnswered(false); setWrongOnes([]); setRound(1); setQueue(allQuestions);
              }}>Retry Quiz</button>
            )}
            <button className="btn" onClick={() => navigate('/dashboard')}>
              {dayAdvanced ? `Go to Day ${nextDay} →` : 'Back to Dashboard'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="row" style={{ marginBottom: 6 }}>
        <h1>Quiz {round === 2 && <span style={{ fontSize: 14, color: '#7b61ff', fontWeight: 600 }}>· Adaptive Retry</span>}</h1>
        <span className="spacer" />
        <span style={{ color: '#6b6b80', fontSize: 13 }}>{index + 1} / {queue.length}</span>
      </div>
      <p className="subtitle">Day {currentDay}{round === 2 && ` · Reviewing ${queue.length} missed question${queue.length > 1 ? 's' : ''}`}</p>

      {round === 2 && (
        <div style={{ background: 'rgba(123,97,255,0.08)', border: '1px solid rgba(123,97,255,0.3)', borderRadius: 10, padding: '12px 18px', marginBottom: 14, fontSize: 13, color: '#7b61ff' }}>
          🔄 Adaptive mode — questions you missed. Get them right to improve your score!
        </div>
      )}

      {/* Live score */}
      <div className="card" style={{ padding: '14px 20px' }}>
        <div className="row">
          <span style={{ fontSize: 13, color: '#6b6b80' }}>Score: {correctCount}/{allQuestions.length}</span>
          <span className="spacer" />
          <span style={{ fontSize: 13, fontWeight: 600, color: accuracy >= 70 ? '#00ff88' : '#ff6b6b' }}>{accuracy}%</span>
        </div>
        <div className="accuracy-bar" style={{ marginTop: 8 }}>
          <div className="accuracy-fill" style={{ width: `${accuracy}%`, background: accuracy >= 70 ? '#00ff88' : '#ff6b6b' }} />
        </div>
      </div>

      <div className="card">
        <div className="quiz-question">{q.question}</div>
        <div className="quiz-options">
          {q.options.map((opt, i) => {
            let cls = '';
            if (answered) { if (i === q.correct_index) cls = 'correct'; else if (i === selected) cls = 'wrong'; }
            return (
              <button key={i} className={`quiz-option ${cls}`} onClick={() => handleAnswer(i)} disabled={answered}>
                <span style={{ fontWeight: 700, marginRight: 10, color: cls === 'correct' ? '#00ff88' : cls === 'wrong' ? '#ff6b6b' : '#7b61ff' }}>
                  {['A', 'B', 'C', 'D'][i]}.
                </span>
                {opt}
              </button>
            );
          })}
        </div>

        {answered && (
          <div className="quiz-explanation">
            {selected === q.correct_index ? '✅ Correct! ' : '❌ Incorrect. '}{q.explanation}
          </div>
        )}

        {answered && (
          <div style={{ marginTop: 18, textAlign: 'right' }}>
            <button className="btn" onClick={handleNext}>
              {index + 1 >= queue.length ? (wrongOnes.length > 0 && round === 1 ? `Retry ${wrongOnes.length} missed →` : 'See Results →') : 'Next →'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
