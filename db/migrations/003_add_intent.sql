-- Migration: Add intent column to messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS intent TEXT;
