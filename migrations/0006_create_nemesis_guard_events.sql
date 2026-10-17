-- Persist blocked Nemesis Guard cases for admin audit and rule tuning.
CREATE TABLE IF NOT EXISTS nemesis_guard_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  message TEXT NOT NULL,
  message_digest TEXT NOT NULL,
  stage TEXT NOT NULL CHECK(stage IN (
    'input_length',
    'hard_rule',
    'workers_ai_classifier'
  )),
  label TEXT NOT NULL,
  confidence REAL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_nemesis_guard_events_created_at
  ON nemesis_guard_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_nemesis_guard_events_user_created_at
  ON nemesis_guard_events(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_nemesis_guard_events_label_created_at
  ON nemesis_guard_events(label, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_nemesis_guard_events_digest
  ON nemesis_guard_events(message_digest);
