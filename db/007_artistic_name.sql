-- Migration: 007_artistic_name.sql
-- Description: Add artistic_name to models table for public display privacy.

ALTER TABLE models 
ADD COLUMN IF NOT EXISTS artistic_name TEXT;
