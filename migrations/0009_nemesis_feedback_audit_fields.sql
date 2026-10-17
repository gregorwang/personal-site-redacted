ALTER TABLE nemesis_guard_events ADD COLUMN event_source TEXT NOT NULL DEFAULT 'guard';
ALTER TABLE nemesis_guard_events ADD COLUMN assistant_message TEXT;
ALTER TABLE nemesis_guard_events ADD COLUMN recent_messages TEXT;
ALTER TABLE nemesis_guard_events ADD COLUMN conversation_id TEXT;
ALTER TABLE nemesis_guard_events ADD COLUMN user_message_id TEXT;
ALTER TABLE nemesis_guard_events ADD COLUMN assistant_message_id TEXT;
ALTER TABLE nemesis_guard_events ADD COLUMN feedback_category TEXT;
ALTER TABLE nemesis_guard_events ADD COLUMN feedback_note TEXT;
ALTER TABLE nemesis_guard_events ADD COLUMN feedback_status TEXT NOT NULL DEFAULT 'open';

CREATE INDEX IF NOT EXISTS idx_nemesis_guard_events_source_created_at
  ON nemesis_guard_events(event_source, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_nemesis_guard_events_feedback_status_created_at
  ON nemesis_guard_events(feedback_status, created_at DESC);
