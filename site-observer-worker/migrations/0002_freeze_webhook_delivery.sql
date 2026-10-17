ALTER TABLE deliveries
ADD COLUMN webhook_body_json TEXT;

CREATE TABLE delivery_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  delivery_id TEXT NOT NULL,
  attempt_number INTEGER NOT NULL,
  outcome TEXT NOT NULL CHECK (
    outcome IN ('delivered', 'retry', 'permanent_failure')
  ),
  http_status INTEGER,
  response_excerpt TEXT,
  request_body_sha256 TEXT NOT NULL,
  request_body_bytes INTEGER NOT NULL,
  attempted_at INTEGER NOT NULL,
  UNIQUE (delivery_id, attempt_number),
  FOREIGN KEY (delivery_id) REFERENCES deliveries (delivery_id)
    ON DELETE CASCADE
);

CREATE INDEX delivery_attempts_delivery_idx
  ON delivery_attempts (delivery_id, attempt_number);
