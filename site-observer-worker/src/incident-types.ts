export type IncidentSeverity = "critical" | "high" | "medium";
export type IncidentStatus = "pending" | "open" | "recovered" | "expired";
export type IncidentTransition = "opened" | "updated" | "recovered";
export type Confidence = "high" | "medium" | "low";
export type DeliveryAttemptOutcome =
  | "delivered"
  | "retry"
  | "permanent_failure";

export interface TelemetryCandidate {
  eventId: string;
  observedAt: number;
  service: string;
  sourceKind: "runtime" | "http_5xx" | "log_error";
  severity: IncidentSeverity;
  route: string | null;
  errorName: string | null;
  message: string;
  fingerprintHint: string | null;
  statusCode: number | null;
  outcome: string | null;
  level: string | null;
  deploymentVersion: string | null;
}

export interface IncidentRecord {
  id: string;
  fingerprint: string;
  service: string;
  environment: string;
  status: IncidentStatus;
  severity: IncidentSeverity;
  source_kind: string;
  route: string | null;
  error_name: string | null;
  normalized_message: string;
  deployment_version: string | null;
  title: string | null;
  summary: string | null;
  likely_cause: string | null;
  confidence: Confidence | null;
  user_impact: string | null;
  evidence_json: string | null;
  recommended_checks_json: string | null;
  analysis_source: IncidentAnalysis["source"] | null;
  first_seen: number;
  last_seen: number;
  opened_at: number | null;
  recovered_at: number | null;
  occurrence_count: number;
  last_notified_count: number;
  last_notified_at: number | null;
  revision: number;
  created_at: number;
  updated_at: number;
}

export interface IncidentSample {
  message: string;
  route: string | null;
  status_code: number | null;
  outcome: string | null;
  level: string | null;
  observed_at: number;
}

export interface IncidentAnalysis {
  title: string;
  summary: string;
  likelyCause: string;
  confidence: Confidence;
  userImpact: string;
  evidence: string[];
  recommendedChecks: string[];
  source: "workers_ai" | "fallback";
}

export interface StormSummary {
  suppressedCount: number;
  windowStartedAt: number;
}

interface QueueMessageBase {
  schemaVersion: 1;
  deliveryId: string;
  createdAt: number;
}

export interface IncidentQueueMessage extends QueueMessageBase {
  kind: "incident";
  incidentId: string;
  transition: IncidentTransition;
  revision: number;
  stormSummary?: StormSummary;
}

export interface HeartbeatQueueMessage extends QueueMessageBase {
  kind: "heartbeat";
  dateJst: string;
  observedAt: number;
}

export interface DegradedQueueMessage extends QueueMessageBase {
  kind: "degraded";
  reason: string;
  consecutiveFailures: number;
  observedAt: number;
}

export type ObserverQueueMessage =
  | IncidentQueueMessage
  | HeartbeatQueueMessage
  | DegradedQueueMessage;

export interface DeliveryRecord {
  delivery_id: string;
  kind: "incident" | "heartbeat" | "degraded";
  incident_id: string | null;
  transition: string;
  revision: number;
  state:
    | "pending"
    | "queued"
    | "processing"
    | "delivered"
    | "dry_run"
    | "permanent_failure";
  attempts: number;
  payload_json: string;
  webhook_body_json: string | null;
  last_error: string | null;
  queued_at: number | null;
  delivered_at: number | null;
  created_at: number;
  updated_at: number;
}

export interface DeliveryAttemptRecord {
  delivery_id: string;
  attempt_number: number;
  outcome: DeliveryAttemptOutcome;
  http_status: number | null;
  response_excerpt: string | null;
  request_body_sha256: string;
  request_body_bytes: number;
  attempted_at: number;
}

export interface MonitorHealthRecord {
  status: string;
  consecutive_failures: number;
  last_success_at: number | null;
  last_failure_at: number | null;
  last_error: string | null;
  last_alert_at: number | null;
  updated_at: number;
}

export interface MonitorSnapshot {
  status: string;
  checkedAt: number;
  lastLogQueryAt: number | null;
  openIncidentCount: number;
  newIncidents24h: number;
  dlqCount: number;
  permanentFailureCount: number;
  degradedComponents: string[];
}
