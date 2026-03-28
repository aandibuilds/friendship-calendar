-- ============================================================
-- Friendship Calendar — Full Database Schema (clean install)
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- ── Drop existing policies and tables (clean slate) ─────────
DROP POLICY IF EXISTS "Users manage own profile" ON profiles;
DROP POLICY IF EXISTS "Users manage own friends" ON friends;
DROP POLICY IF EXISTS "Creator manages event" ON events;
DROP POLICY IF EXISTS "Creator manages proposed event" ON proposed_events;
DROP POLICY IF EXISTS "Inviter manages own invites" ON friend_invites;

DROP TABLE IF EXISTS friend_invites CASCADE;
DROP TABLE IF EXISTS proposed_events CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS friends CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- ── Profiles ────────────────────────────────────────────────
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT DEFAULT '',
  avatar_color TEXT DEFAULT '#7C3AED',
  hobbies TEXT[] DEFAULT '{}',
  location TEXT DEFAULT '',
  birthday TEXT DEFAULT '',
  bio TEXT DEFAULT '',
  social TEXT DEFAULT '',
  vibe TEXT DEFAULT '',
  quiet_hours_enabled BOOLEAN DEFAULT FALSE,
  quiet_hours_start TEXT DEFAULT '22:00',
  quiet_hours_end TEXT DEFAULT '08:00',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own profile" ON profiles
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── Friends ─────────────────────────────────────────────────
CREATE TABLE friends (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  linked_user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  color TEXT DEFAULT '#7C3AED',
  tags TEXT[] DEFAULT '{}',
  notes TEXT DEFAULT '',
  cadence INTEGER DEFAULT 30,
  invite_dates TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own friends" ON friends
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── Events ──────────────────────────────────────────────────
CREATE TABLE events (
  id TEXT PRIMARY KEY,
  creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  emoji TEXT DEFAULT '🎉',
  type TEXT NOT NULL CHECK (type IN ('group', '1on1')),
  date TEXT DEFAULT '',
  time TEXT DEFAULT '',
  location TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  dates JSONB DEFAULT '[]',
  invitees JSONB DEFAULT '[]',
  rsvps JSONB DEFAULT '{}',
  vote_deadline TEXT DEFAULT '',
  confirmed TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Creator manages event" ON events
  USING (auth.uid() = creator_id) WITH CHECK (auth.uid() = creator_id);

-- ── Proposed Events ("Share a find") ────────────────────────
CREATE TABLE proposed_events (
  id TEXT PRIMARY KEY,
  creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  date TEXT DEFAULT '',
  time TEXT DEFAULT '',
  location TEXT DEFAULT '',
  description TEXT DEFAULT '',
  category TEXT DEFAULT '',
  source_url TEXT DEFAULT '',
  proposed_to JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE proposed_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Creator manages proposed event" ON proposed_events
  USING (auth.uid() = creator_id) WITH CHECK (auth.uid() = creator_id);

-- ── Friend Invites ───────────────────────────────────────────
CREATE TABLE friend_invites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  inviter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  friend_id TEXT REFERENCES friends(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  accepted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE friend_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Inviter manages own invites" ON friend_invites
  USING (auth.uid() = inviter_id) WITH CHECK (auth.uid() = inviter_id);
