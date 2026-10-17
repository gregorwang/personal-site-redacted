-- Store a soft, non-redeemable Echo Token for interactions after the real supply is gone.
ALTER TABLE hidden_supply_interactions ADD COLUMN message_preview TEXT;
ALTER TABLE hidden_supply_interactions ADD COLUMN message_hash TEXT;
ALTER TABLE hidden_supply_interactions ADD COLUMN echo_code TEXT;
ALTER TABLE hidden_supply_interactions ADD COLUMN echo_created_at INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS idx_hidden_supply_interactions_echo_code
  ON hidden_supply_interactions(echo_code)
  WHERE echo_code IS NOT NULL;
