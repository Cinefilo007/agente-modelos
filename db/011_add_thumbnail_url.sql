
-- Migration: 011_add_thumbnail_url.sql
-- Description: Adds thumbnail_url column to posts table to store video frames.

ALTER TABLE posts ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
