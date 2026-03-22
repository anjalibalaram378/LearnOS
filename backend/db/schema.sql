-- GoalGuard + StudyApp Schema
-- Paste this into InsForge SQL Editor and click Run

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS study_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    title TEXT NOT NULL,
    pdf_url TEXT,
    raw_text TEXT,
    total_days INTEGER DEFAULT 7,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS flashcards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES study_sessions(id),
    front TEXT NOT NULL,
    back TEXT NOT NULL,
    day_number INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quiz_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES study_sessions(id),
    question TEXT NOT NULL,
    options JSONB NOT NULL,
    correct_index INTEGER NOT NULL,
    explanation TEXT,
    day_number INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS daily_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES study_sessions(id),
    day_number INTEGER NOT NULL,
    topic TEXT NOT NULL,
    summary TEXT,
    key_concepts JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS goal_completions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    session_id UUID REFERENCES study_sessions(id),
    day_number INTEGER NOT NULL,
    review_done BOOLEAN DEFAULT FALSE,
    quiz_done BOOLEAN DEFAULT FALSE,
    accuracy NUMERIC(5,2),
    completed_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, session_id, day_number)
);

CREATE TABLE IF NOT EXISTS streaks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    session_id UUID REFERENCES study_sessions(id),
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_activity_date DATE,
    total_days_completed INTEGER DEFAULT 0,
    average_accuracy NUMERIC(5,2) DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, session_id)
);

CREATE TABLE IF NOT EXISTS challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES study_sessions(id),
    creator_id UUID REFERENCES users(id),
    title TEXT NOT NULL,
    duration_days INTEGER NOT NULL,
    invite_code TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'active',
    starts_at TIMESTAMPTZ DEFAULT NOW(),
    ends_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS challenge_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challenge_id UUID REFERENCES challenges(id),
    user_id UUID REFERENCES users(id),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(challenge_id, user_id)
);

CREATE TABLE IF NOT EXISTS goalguard_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    domain TEXT,
    url TEXT,
    classification TEXT,
    user_goals JSONB,
    nudge_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
