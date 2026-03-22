import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createUser, uploadPDF, uploadURL, getSession, createChallenge, getChallenge, joinChallenge } from '../api';

const SOURCE_TYPES = [
  { id: 'pdf',     label: '📄 PDF',     hint: 'Upload a PDF file' },
  { id: 'youtube', label: '▶️ YouTube', hint: 'Paste a YouTube video URL' },
  { id: 'reddit',  label: '🔴 Reddit',  hint: 'Paste a Reddit post URL' },
  { id: 'web',     label: '🌐 Website', hint: 'Paste any article or docs URL' },
];

const S = {
  input: { width: '100%', padding: '12px 16px', borderRadius: 8, border: '1px solid #2a2a3a', background: '#1a1a24', color: '#f0f0f5', fontFamily: "'DM Mono', monospace", fontSize: 14, outline: 'none' },
  label: { fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#6b6b80', display: 'block', marginBottom: 6 },
};

export default function Upload() {
  const [mode, setMode] = useState('new');
  const [source, setSource] = useState('pdf');
  const [file, setFile] = useState(null);
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [days, setDays] = useState(7);
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const inputRef = useRef();
  const navigate = useNavigate();

  const isPDF = source === 'pdf';
  const sourceLabel = SOURCE_TYPES.find(s => s.id === source)?.label || '';
  const isReady = name && title && (isPDF ? file : url.startsWith('http'));
  const isJoinReady = name && joinCode.trim().length > 4;

  const handleFile = (f) => { if (f && f.name.endsWith('.pdf')) setFile(f); };

  const handleSubmit = async () => {
    if (!isReady) return;
    setLoading(true);
    try {
      setStatus('Setting up your account...');
      const email = `${name.toLowerCase().replace(/\s/g, '')}${Date.now()}@demo.com`;
      const userRes = await createUser(name, email);
      const userId = userRes.data.user_id;
      localStorage.setItem('user_id', userId);
      localStorage.setItem('user_name', name);

      setStatus(`Extracting content from ${sourceLabel} and generating your study plan with AI...`);

      let sessionId, flashcard_count, quiz_count;
      if (isPDF) {
        const form = new FormData();
        form.append('file', file); form.append('user_id', userId);
        form.append('title', title); form.append('total_days', days);
        const res = await uploadPDF(form);
        ({ session_id: sessionId, flashcard_count, quiz_count } = res.data);
      } else {
        const res = await uploadURL({ url, user_id: userId, title, total_days: days });
        ({ session_id: sessionId, flashcard_count, quiz_count } = res.data);
      }

      localStorage.setItem('session_id', sessionId);
      localStorage.setItem('total_days', days);
      localStorage.setItem('current_day', 1);

      const ch = await createChallenge({ title, topic: title, creatorName: name, duration: days, sessionId });
      if (ch?.data?.challengeId) localStorage.setItem('challenge_id', ch.data.challengeId);

      setStatus(`Done! Generated ${flashcard_count} flashcards and ${quiz_count} quiz questions.`);
      setTimeout(() => navigate('/dashboard'), 1200);
    } catch (e) {
      setStatus((e?.response?.data?.detail || 'Something went wrong.') + ' Make sure the backend is running on port 8001.');
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!isJoinReady) return;
    setLoading(true);
    try {
      setStatus('Setting up your account...');
      const email = `${name.toLowerCase().replace(/\s/g, '')}${Date.now()}@demo.com`;
      const userRes = await createUser(name, email);
      const userId = userRes.data.user_id;
      localStorage.setItem('user_id', userId);
      localStorage.setItem('user_name', name);

      setStatus('Looking up challenge...');
      const cid = joinCode.trim();
      const challengeRes = await getChallenge(cid);
      if (challengeRes?.data?.sessionId) {
        await joinChallenge(cid, { opponentName: name });
        localStorage.setItem('session_id', challengeRes.data.sessionId);
        localStorage.setItem('total_days', challengeRes.data.duration || 7);
        localStorage.setItem('challenge_id', cid);
        localStorage.setItem('current_day', 1);
      } else {
        const sessionRes = await getSession(cid);
        if (!sessionRes?.data) throw new Error('not found');
        localStorage.setItem('session_id', cid);
        localStorage.setItem('total_days', sessionRes.data.daily_plans?.length || 7);
        localStorage.setItem('current_day', 1);
      }
      setStatus('Joined! Loading your challenge...');
      setTimeout(() => navigate('/dashboard'), 800);
    } catch (e) {
      setStatus('Could not find that challenge. Double-check the code.');
      setLoading(false);
    }
  };

  const btnTab = (active) => ({
    flex: 1, padding: '10px', borderRadius: 8, border: active ? 'none' : '1px solid #2a2a3a',
    background: active ? '#00ff88' : 'transparent', color: active ? '#000' : '#6b6b80',
    fontFamily: "'DM Mono', monospace", fontSize: 13, cursor: 'pointer', transition: 'all 0.2s',
  });

  const btnSource = (active) => ({
    padding: '9px 18px', borderRadius: 7, border: active ? 'none' : '1px solid #2a2a3a',
    background: active ? '#00ff88' : '#1a1a24', color: active ? '#000' : '#6b6b80',
    fontFamily: "'DM Mono', monospace", fontSize: 13, cursor: 'pointer',
  });

  return (
    <div className="page">
      <h1>Learn<span style={{ color: '#00ff88' }}>OS</span></h1>
      <p className="subtitle">Upload any study material — PDF, YouTube, Reddit, or any webpage. Challenge a friend. Stay consistent.</p>

      {!loading ? (
        <>
          {/* Mode toggle */}
          <div className="card" style={{ padding: '16px 20px' }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={btnTab(mode === 'new')} onClick={() => setMode('new')}>✨ New Session</button>
              <button style={btnTab(mode === 'join')} onClick={() => setMode('join')}>🤝 Join a Challenge</button>
            </div>
          </div>

          {mode === 'join' ? (
            <div className="card">
              <h2>Join a Friend's Challenge</h2>
              <p style={{ color: '#6b6b80', marginBottom: 24, fontSize: 13, lineHeight: 1.7 }}>
                Your friend shares a challenge code. Paste it below — you'll get the exact same AI-generated content and compete on consistency.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div><label style={S.label}>Your name</label><input style={S.input} value={name} onChange={e => setName(e.target.value)} placeholder="Alex K." /></div>
                <div>
                  <label style={S.label}>Challenge code from your friend</label>
                  <input style={{ ...S.input, fontFamily: 'monospace', letterSpacing: 2 }} value={joinCode} onChange={e => setJoinCode(e.target.value)} placeholder="e.g. a1b2c3d4" />
                  <p style={{ color: '#6b6b80', fontSize: 11, marginTop: 6 }}>Find the code on your friend's Challenge page → "Copy Code"</p>
                </div>
                <button className="btn" disabled={!isJoinReady} onClick={handleJoin}>Join Challenge →</button>
              </div>
            </div>
          ) : (
            <>
              {/* Source type */}
              <div className="card" style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {SOURCE_TYPES.map(s => (
                    <button key={s.id} style={btnSource(source === s.id)} onClick={() => { setSource(s.id); setFile(null); setUrl(''); }}>{s.label}</button>
                  ))}
                </div>
              </div>

              {/* Input */}
              <div className="card">
                {isPDF ? (
                  <div className="upload-zone" onClick={() => inputRef.current.click()} onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }} onDragOver={e => e.preventDefault()}>
                    <div className="upload-icon">{file ? '✅' : '📄'}</div>
                    <h2 style={{ color: '#f0f0f5' }}>{file ? file.name : 'Drop your PDF here'}</h2>
                    <p>{file ? `${(file.size / 1024).toFixed(0)} KB` : 'Click to browse or drag and drop'}</p>
                    {!file && <button className="btn">Choose PDF</button>}
                    <input ref={inputRef} type="file" accept=".pdf" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: 44, textAlign: 'center', marginBottom: 14 }}>
                      {source === 'youtube' ? '▶️' : source === 'reddit' ? '🔴' : '🌐'}
                    </div>
                    <p style={{ textAlign: 'center', color: '#6b6b80', marginBottom: 14, fontSize: 13 }}>
                      {SOURCE_TYPES.find(s => s.id === source)?.hint}
                    </p>
                    <input style={S.input} value={url} onChange={e => setUrl(e.target.value)}
                      placeholder={source === 'youtube' ? 'https://youtube.com/watch?v=...' : source === 'reddit' ? 'https://reddit.com/r/...' : 'https://...'}
                    />
                    {url && !url.startsWith('http') && <p style={{ color: '#ff6b6b', fontSize: 12, marginTop: 6 }}>Please enter a full URL starting with https://</p>}
                  </div>
                )}
              </div>

              {/* Setup */}
              <div className="card">
                <h2>Setup</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div><label style={S.label}>Your name</label><input style={S.input} value={name} onChange={e => setName(e.target.value)} placeholder="Alex K." /></div>
                  <div><label style={S.label}>Study topic</label><input style={S.input} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. DSA Prep, AWS Certification" /></div>
                  <div>
                    <label style={S.label}>Study duration</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {[7, 14].map(d => <button key={d} style={btnTab(days === d)} onClick={() => setDays(d)}>{d} days</button>)}
                    </div>
                  </div>
                  <button className="btn" disabled={!isReady} onClick={handleSubmit} style={{ marginTop: 8 }}>Generate Study Plan →</button>
                </div>
              </div>
            </>
          )}
        </>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '60px 32px' }}>
          <div style={{ fontSize: 44, marginBottom: 20 }}>🧠</div>
          <h2>{mode === 'join' ? 'Joining challenge...' : 'AI is building your plan...'}</h2>
          <p style={{ color: '#6b6b80', marginBottom: 24, fontSize: 13 }}>{status}</p>
          <div className="loading-bar"><div className="loading-bar-fill" /></div>
          {mode === 'new' && <p style={{ color: '#6b6b80', fontSize: 12, marginTop: 12 }}>{isPDF ? '~30 seconds' : 'Scraping + generating — ~45 seconds'}</p>}
        </div>
      )}
    </div>
  );
}
