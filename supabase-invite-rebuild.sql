-- ============================================================
-- Friendship Calendar — Invite System Rebuild
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- Safe to run on existing database (uses IF NOT EXISTS)
-- ============================================================

-- ── Add email column to profiles if missing ──────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT DEFAULT '';

-- ── Update trigger to include email on signup ────────────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.email, '')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, profiles.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── Invitations table (replaces friend_invites) ──────────────
CREATE TABLE IF NOT EXISTS invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  inviter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  invitee_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  friend_id TEXT REFERENCES friends(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  UNIQUE(inviter_id, invitee_email)
);

ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Inviter manages own invitations" ON invitations;
CREATE POLICY "Inviter manages own invitations" ON invitations
  FOR ALL USING (auth.uid() = inviter_id) WITH CHECK (auth.uid() = inviter_id);

DROP POLICY IF EXISTS "Invitee can view invitations for them" ON invitations;
CREATE POLICY "Invitee can view invitations for them" ON invitations
  FOR SELECT USING (invitee_email = (auth.jwt() ->> 'email'));

-- ── Friendships table (bidirectional, 2 rows per friendship) ─
CREATE TABLE IF NOT EXISTS friendships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  friend_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, friend_id)
);

ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own friendships" ON friendships;
CREATE POLICY "Users see own friendships" ON friendships
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own friendships" ON friendships;
CREATE POLICY "Users delete own friendships" ON friendships
  FOR DELETE USING (auth.uid() = user_id);

-- ── Function to auto-expire old invitations ──────────────────
CREATE OR REPLACE FUNCTION expire_old_invitations()
RETURNS void AS $$
BEGIN
  UPDATE invitations SET status = 'expired'
  WHERE status = 'pending' AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
