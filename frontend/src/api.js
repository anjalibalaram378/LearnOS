import axios from 'axios';

const BASE = 'http://localhost:8001';

export const createUser = (name, email) =>
  axios.post(`${BASE}/users/`, { name, email });

export const uploadPDF = (formData) =>
  axios.post(`${BASE}/study/upload`, formData);

export const uploadURL = (data) =>
  axios.post(`${BASE}/study/upload-url`, data);

export const getSession = (sessionId) =>
  axios.get(`${BASE}/study/session/${sessionId}`);

export const getDayContent = (sessionId, day) =>
  axios.get(`${BASE}/study/session/${sessionId}/day/${day}`);

export const logProgress = (data) =>
  axios.post(`${BASE}/progress/log`, data);

export const getStreak = (userId, sessionId) =>
  axios.get(`${BASE}/progress/streak/${userId}/${sessionId}`);

export const getLeaderboard = (sessionId) =>
  axios.get(`${BASE}/progress/leaderboard/${sessionId}`);

export const checkGoalGuard = (data) =>
  axios.post(`${BASE}/goalguard/check`, data).catch(() => null);

export const getGoalGuardStats = (userId) =>
  axios.get(`${BASE}/goalguard/stats/${userId}`).catch(() => null);

export const getGoalGuardEvents = (userId) =>
  axios.get(`${BASE}/goalguard/events/${userId}`).catch(() => null);

// ── StudyHack Challenge Server (port 4000) ────────────────────────────────
const CH = 'http://localhost:4000';

export const createChallenge = (data) =>
  axios.post(`${CH}/api/challenge/create`, data).catch(() => null);

export const getChallenge = (challengeId) =>
  axios.get(`${CH}/api/challenge/${challengeId}`).catch(() => null);

export const joinChallenge = (challengeId, data) =>
  axios.post(`${CH}/api/challenge/${challengeId}/join`, data).catch(() => null);

export const getChallengeProgress = (challengeId) =>
  axios.get(`${CH}/api/challenge/${challengeId}/progress`).catch(() => null);

export const updateChallengeProgress = (challengeId, data) =>
  axios.post(`${CH}/api/challenge/${challengeId}/update-progress`, data).catch(() => null);
