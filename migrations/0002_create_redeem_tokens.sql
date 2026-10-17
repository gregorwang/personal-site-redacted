-- Create redeem_tokens table for the Peach Oolong interactive game
CREATE TABLE IF NOT EXISTS redeem_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token_code TEXT UNIQUE NOT NULL,
  is_claimed INTEGER DEFAULT 0,
  claimed_at INTEGER, -- Unix timestamp (in seconds)
  visitor_id TEXT
);

-- Insert 10 unique cyber-themed peach oolong redeem tokens
INSERT OR IGNORE INTO redeem_tokens (token_code) VALUES
  ('PEACH-OOLONG-9E2B'),
  ('PEACH-OOLONG-4F7C'),
  ('PEACH-OOLONG-1A8D'),
  ('PEACH-OOLONG-8C3F'),
  ('PEACH-OOLONG-5D9A'),
  ('PEACH-OOLONG-3B6E'),
  ('PEACH-OOLONG-7F2A'),
  ('PEACH-OOLONG-6C8B'),
  ('PEACH-OOLONG-2D4E'),
  ('PEACH-OOLONG-0A5C');
