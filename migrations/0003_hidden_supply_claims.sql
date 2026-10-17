-- Track Cyber Terminal hidden supply eligibility separately from token claims.
CREATE TABLE IF NOT EXISTS hidden_supply_interactions (
  visitor_id TEXT PRIMARY KEY,
  user_id TEXT,
  completed_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_hidden_supply_interactions_user_id
  ON hidden_supply_interactions(user_id);

ALTER TABLE redeem_tokens ADD COLUMN user_id TEXT;

CREATE INDEX IF NOT EXISTS idx_redeem_tokens_user_id
  ON redeem_tokens(user_id);
