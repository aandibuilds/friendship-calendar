-- ============================================================
-- Friendship Calendar — Add hangouts column to friends table
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- Safe to run multiple times (uses IF NOT EXISTS pattern)
-- ============================================================

-- Add hangouts JSONB column to friends table
-- Stores array of { date: string, activity: string } objects
ALTER TABLE friends ADD COLUMN IF NOT EXISTS hangouts JSONB DEFAULT '[]';
