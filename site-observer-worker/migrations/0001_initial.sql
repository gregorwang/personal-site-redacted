PRAGMA foreign_keys = ON;

CREATE TABLE ingestion_state (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE processed_events (
  event_id TEXT PRIMARY KEY,
  observed_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE INDEX processed_events_expires_at_idx
  ON processed_events (expires_at);

CREATE TABLE incidents (
  id TEXT PRIMARY KEY,
  fingerprint TEXT NOT NULL,
  service TEXT NOT NULL,
  environment TEXT NOT NULL,
  status TEXT NOT NULL CHECK (
    status IN ('pending', 'open', 'recovered', 'expired')
  ),
  severity TEXT NOT NULL CHECK (
    severity IN ('critical', 'high', 'medium')
  ),
  source_kind TEXT NOT NULL,
  route TEXT,
  error_name TEXT,
  normalized_message TEXT NOT NULL,
  deployment_version TEXT,
  title TEXT,
  summary TEXT,
  likely_cause TEXT,
  confidence TEXT CHECK (
    confidence IS NULL OR confidence IN ('high', 'medium', 'low')
  ),
  user_impact TEXT,
  evidence_json TEXT,
  recommended_checks_json TEXT,
  first_seen INTEGER NOT NULL,
  last_seen INTEGER NOT NULL,
  opened_at INTEGER,
  recovered_at INTEGER,
  occurrence_count INTEGER NOT NULL,
  last_notified_count INTEGER NOT NULL DEFAULT 0,
  last_notified_at INTEGER,
  revision INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX incidents_active_fingerprint_idx
  ON incidents (fingerprint, status, last_seen DESC);

CREATE INDEX incidents_recovery_idx
  ON incidents (status, last_seen);

CREATE INDEX incidents_retention_idx
  ON incidents (status, updated_at);

CREATE TABLE incident_samples (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  incident_id TEXT NOT NULL,
  event_id TEXT NOT NULL UNIQUE,
  observed_at INTEGER NOT NULL,
  message TEXT NOT NULL,
  route TEXT,
  status_code INTEGER,
  outcome TEXT,
  level TEXT,
  expires_at INTEGER NOT NULL,
  FOREIGN KEY (incident_id) REFERENCES incidents (id) ON DELETE CASCADE
);

CREATE INDEX incident_samples_incident_idx
  ON incident_samples (incident_id, observed_at DESC);

CREATE INDEX incident_samples_expires_at_idx
  ON incident_samples (expires_at);

CREATE TABLE deliveries (
  delivery_id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (
    kind IN ('incident', 'heartbeat', 'degraded')
  ),
  incident_id TEXT,
  transition TEXT NOT NULL,
  revision INTEGER NOT NULL,
  state TEXT NOT NULL CHECK (
    state IN (
      'pending',
      'queued',
      'processing',
      'delivered',
      'dry_run',
      'permanent_failure'
    )
  ),
  attempts INTEGER NOT NULL DEFAULT 0,
  payload_json TEXT NOT NULL,
  last_error TEXT,
  queued_at INTEGER,
  delivered_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (incident_id) REFERENCES incidents (id) ON DELETE SET NULL
);

CREATE INDEX deliveries_pending_idx
  ON deliveries (state, created_at);

CREATE INDEX deliveries_retention_idx
  ON deliveries (updated_at);

CREATE TABLE monitor_health (
  key TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  last_success_at INTEGER,
  last_failure_at INTEGER,
  last_error TEXT,
  last_alert_at INTEGER,
  updated_at INTEGER NOT NULL
);

INSERT INTO monitor_health (
  key,
  status,
  consecutive_failures,
  updated_at
) VALUES (
  'observability_poll',
  'waiting_for_token',
  0,
  unixepoch() * 1000
);
