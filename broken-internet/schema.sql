-- Broken Internet Database Schema
-- Run this against your PostgreSQL database:
--   psql -U postgres -d broken_internet -f schema.sql

CREATE TABLE IF NOT EXISTS players (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  levels_completed INTEGER DEFAULT 0,
  total_attempts INTEGER DEFAULT 0,
  started_at BIGINT,
  completed_at BIGINT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS level_progress (
  id SERIAL PRIMARY KEY,
  player_id INTEGER REFERENCES players(id) ON DELETE CASCADE,
  level_name VARCHAR(50) NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  attempts INTEGER DEFAULT 0,
  completed_at BIGINT,
  UNIQUE(player_id, level_name)
);

CREATE INDEX IF NOT EXISTS idx_level_progress_player ON level_progress(player_id);
CREATE INDEX IF NOT EXISTS idx_level_progress_level ON level_progress(level_name);
