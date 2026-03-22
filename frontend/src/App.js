import React from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import './App.css';
import Upload from './pages/Upload';
import Dashboard from './pages/Dashboard';
import Flashcards from './pages/Flashcards';
import Quiz from './pages/Quiz';
import Leaderboard from './pages/Leaderboard';
import GoalGuard from './pages/GoalGuard';

function Nav() {
  const session = localStorage.getItem('session_id');
  const location = useLocation();
  const active = (path) => location.pathname === path ? { color: 'var(--accent)' } : {};
  return (
    <nav className="nav">
      <Link to="/" className="nav-brand">Learn<span>OS</span></Link>
      {session && <>
        <Link to="/dashboard" style={active('/dashboard')}>Dashboard</Link>
        <Link to="/flashcards" style={active('/flashcards')}>Flashcards</Link>
        <Link to="/quiz" style={active('/quiz')}>Quiz</Link>
        <Link to="/leaderboard" style={active('/leaderboard')}>⚔ Challenge</Link>
        <Link to="/goalguard" style={active('/goalguard')}>🛡 GoalGuard</Link>
      </>}
    </nav>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Nav />
      <Routes>
        <Route path="/" element={<Upload />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/flashcards" element={<Flashcards />} />
        <Route path="/quiz" element={<Quiz />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/goalguard" element={<GoalGuard />} />
      </Routes>
    </BrowserRouter>
  );
}
