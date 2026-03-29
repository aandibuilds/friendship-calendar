-- ============================================================
-- Friendship Calendar — Invite System Rebuild v2
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- Safe to run on existing database (uses IF NOT EXISTS)
-- ============================================================

-- ── Add missing columns to profiles ──────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT DEFAULT '';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS completed_profile BOOLEAN DEFAULT false;

-- ── Update trigger to include email + completed_profile ──────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO profiles (id, name, email, completed_profile)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.email, ''),
    false
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

-- ── Invitations table ────────────────────────────────────────
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

-- ── CRITICAL: Postgres trigger for automatic friendship creation ─
-- Fires AFTER UPDATE on invitations when status changes to 'accepted'.
-- Guarantees friendships are ALWAYS created — cannot be skipped.
CREATE OR REPLACE FUNCTION on_invitation_accepted()
RETURNS TRIGGER SECURITY DEFINER SET search_path = public AS $$
DECLARE
  invitee_user_id UUID;
BEGIN
  -- Only fire when status changes TO 'accepted'
  IF NEW.status = 'accepted' AND (OLD.status IS DISTINCT FROM 'accepted') THEN
    -- Find the invitee's auth user by email
    SELECT id INTO invitee_user_id
    FROM auth.users
    WHERE email = NEW.invitee_email
    LIMIT 1;

    IF invitee_user_id IS NOT NULL THEN
      -- Create bidirectional friendship (idempotent via ON CONFLICT)
      INSERT INTO friendships (user_id, friend_id)
      VALUES (NEW.inviter_id, invitee_user_id)
      ON CONFLICT (user_id, friend_id) DO NOTHING;

      INSERT INTO friendships (user_id, friend_id)
      VALUES (invitee_user_id, NEW.inviter_id)
      ON CONFLICT (user_id, friend_id) DO NOTHING;

      -- Update the inviter's friend card for UI badge
      IF NEW.friend_id IS NOT NULL THEN
        UPDATE friends
        SET linked_user_id = invitee_user_id
        WHERE id = NEW.friend_id AND user_id = NEW.inviter_id;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_invitation_accepted ON invitations;
CREATE TRIGGER trigger_invitation_accepted
  AFTER UPDATE ON invitations
  FOR EACH ROW EXECUTE FUNCTION on_invitation_accepted();

-- ── Auto-expire old invitations ──────────────────────────────
CREATE OR REPLACE FUNCTION expire_old_invitations()
RETURNS void SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE invitations SET status = 'expired'
  WHERE status = 'pending' AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- ── Mark existing users' profiles as complete ────────────────
-- (So current users aren't blocked by the new completed_profile check)
UPDATE profiles SET completed_profile = true
WHERE name IS NOT NULL AND name != '';
