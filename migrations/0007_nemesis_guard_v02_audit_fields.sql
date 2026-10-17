-- Expand Nemesis Guard audit events for v0.2 mode-based routing.
CREATE TABLE IF NOT EXISTS nemesis_guard_events_v02 (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  user_email_masked TEXT,
  message TEXT NOT NULL,
  message_digest TEXT NOT NULL,
  input_length INTEGER,
  stage TEXT NOT NULL CHECK(stage IN (
    'RULE_GUARD',
    'WORKERS_AI',
    'ROUTER',
    'GEMINI',
    'input_length',
    'hard_rule',
    'workers_ai_classifier'
  )),
  label TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'REFUSE' CHECK(mode IN (
    'PASS_TO_GEMINI',
    'CLARIFY',
    'SAFE_BOUNDARY',
    'REFUSE'
  )),
  category TEXT NOT NULL DEFAULT 'UNKNOWN',
  rule_id TEXT,
  rule_strength TEXT CHECK(rule_strength IS NULL OR rule_strength IN ('strong', 'medium', 'weak')),
  classifier_confidence REAL,
  confidence REAL,
  called_gemini INTEGER NOT NULL DEFAULT 0,
  suspected_over_strict INTEGER NOT NULL DEFAULT 0,
  reason TEXT,
  suggested_change TEXT,
  metadata TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);

INSERT INTO nemesis_guard_events_v02 (
  id,
  user_id,
  message,
  message_digest,
  input_length,
  stage,
  label,
  mode,
  category,
  classifier_confidence,
  confidence,
  called_gemini,
  suspected_over_strict,
  created_at
)
SELECT
  id,
  user_id,
  message,
  message_digest,
  length(message),
  CASE stage
    WHEN 'input_length' THEN 'RULE_GUARD'
    WHEN 'hard_rule' THEN 'RULE_GUARD'
    WHEN 'workers_ai_classifier' THEN 'WORKERS_AI'
    ELSE stage
  END,
  label,
  'REFUSE',
  CASE
    WHEN label IN ('PROMPT_EXTRACTION', 'JAILBREAK', 'PRIVACY_PROBE', 'OWNER_BOUNDARY', 'PUBLIC_AFFAIRS_INFERENCE', 'NORMAL', 'UNKNOWN', 'TOO_LONG') THEN label
    WHEN label = 'PRIVACY_OR_SECURITY_ABUSE' THEN 'PRIVACY_PROBE'
    WHEN label = 'POLITICAL_OR_PUBLIC_AFFAIRS' THEN 'PUBLIC_AFFAIRS_INFERENCE'
    ELSE 'UNKNOWN'
  END,
  confidence,
  confidence,
  0,
  CASE WHEN label = 'UNKNOWN' THEN 1 ELSE 0 END,
  created_at
FROM nemesis_guard_events
WHERE NOT EXISTS (SELECT 1 FROM nemesis_guard_events_v02);

DROP TABLE nemesis_guard_events;

ALTER TABLE nemesis_guard_events_v02 RENAME TO nemesis_guard_events;

CREATE INDEX IF NOT EXISTS idx_nemesis_guard_events_created_at
  ON nemesis_guard_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_nemesis_guard_events_user_created_at
  ON nemesis_guard_events(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_nemesis_guard_events_label_created_at
  ON nemesis_guard_events(label, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_nemesis_guard_events_digest
  ON nemesis_guard_events(message_digest);

CREATE INDEX IF NOT EXISTS idx_nemesis_guard_events_mode_created_at
  ON nemesis_guard_events(mode, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_nemesis_guard_events_category_created_at
  ON nemesis_guard_events(category, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_nemesis_guard_events_stage_created_at
  ON nemesis_guard_events(stage, created_at DESC);
