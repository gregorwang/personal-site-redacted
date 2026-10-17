import type {
  DeliveryAttemptOutcome,
  DeliveryRecord,
  IncidentAnalysis,
  IncidentQueueMessage,
  IncidentRecord,
  IncidentSample,
  IncidentSeverity,
  IncidentTransition,
  MonitorHealthRecord,
  MonitorSnapshot,
  ObserverQueueMessage,
  TelemetryCandidate,
} from "./incident-types";
import {
  normalizeFingerprintText,
  sha256Hex,
} from "./log-redaction";
import type { ObserverConfig } from "./observer-config";
import { safeErrorMessage } from "./observer-config";
import { parseObserverQueueMessage } from "./queue-message";
import type { TelemetryWindow } from "./telemetry";

const DAY_MS = 86_400_000;
const HOUR_MS = 60 * 60_000;
const POLL_LEASE_MS = 4 * 60_000;
const CURSOR_OVERLAP_MS = 5 * 60_000;
const UPDATE_COOLDOWN_MS = 30 * 60_000;
const DEGRADED_ALERT_COOLDOWN_MS = 6 * 60 * 60_000;
const STALE_DELIVERY_MS = 10 * 60_000;
const MAX_DELIVERY_ATTEMPTS = 8;
const INCIDENT_NOTIFICATION_LIMIT_PER_HOUR = 6;
const UPDATE_MILESTONES = [5, 20, 100, 500, 1_000] as const;

interface TelemetryCursorState {
  lastCompletedTo: number;
  pending?: {
    from: number;
    to: number;
    offset: string;
  };
}

interface CandidateGroup {
  fingerprint: string;
  normalizedMessage: string;
  events: TelemetryCandidate[];
  representative: TelemetryCandidate;
  severity: IncidentSeverity;
}

const SEVERITY_RANK: Record<IncidentSeverity, number> = {
  medium: 1,
  high: 2,
  critical: 3,
};

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function parseCursorState(value: string | null): TelemetryCursorState | null {
  if (!value) {
    return null;
  }
  const parsed = parseJson(value);
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("lastCompletedTo" in parsed) ||
    typeof parsed.lastCompletedTo !== "number" ||
    !Number.isFinite(parsed.lastCompletedTo)
  ) {
    return null;
  }

  const pendingValue = "pending" in parsed ? parsed.pending : undefined;
  if (pendingValue === undefined) {
    return { lastCompletedTo: parsed.lastCompletedTo };
  }
  if (
    typeof pendingValue !== "object" ||
    pendingValue === null ||
    !("from" in pendingValue) ||
    !("to" in pendingValue) ||
    !("offset" in pendingValue) ||
    typeof pendingValue.from !== "number" ||
    typeof pendingValue.to !== "number" ||
    typeof pendingValue.offset !== "string" ||
    !Number.isFinite(pendingValue.from) ||
    !Number.isFinite(pendingValue.to) ||
    !pendingValue.offset
  ) {
    return { lastCompletedTo: parsed.lastCompletedTo };
  }

  return {
    lastCompletedTo: parsed.lastCompletedTo,
    pending: {
      from: pendingValue.from,
      to: pendingValue.to,
      offset: pendingValue.offset,
    },
  };
}

async function readStateValue(
  db: D1Database,
  key: string,
): Promise<string | null> {
  const row = await db
    .prepare("SELECT value FROM ingestion_state WHERE key = ?")
    .bind(key)
    .first<{ value: string }>();
  return row?.value ?? null;
}

async function writeStateValue(
  db: D1Database,
  key: string,
  value: string,
  now: number,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO ingestion_state (key, value, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT (key) DO UPDATE SET
         value = excluded.value,
         updated_at = excluded.updated_at`,
    )
    .bind(key, value, now)
    .run();
}

export async function acquirePollLease(
  db: D1Database,
  now: number,
): Promise<string | null> {
  const leaseExpiresAt = now + POLL_LEASE_MS;
  const leaseToken = String(leaseExpiresAt);
  const row = await db
    .prepare(
      `INSERT INTO ingestion_state (key, value, updated_at)
       VALUES ('poll_lease_until', ?, ?)
       ON CONFLICT (key) DO UPDATE SET
         value = excluded.value,
         updated_at = excluded.updated_at
       WHERE CAST(ingestion_state.value AS INTEGER) <= ?
       RETURNING value`,
    )
    .bind(leaseToken, now, now)
    .first<{ value: string }>();
  return row?.value === leaseToken ? leaseToken : null;
}

export async function releasePollLease(
  db: D1Database,
  leaseToken: string,
  now: number,
): Promise<void> {
  await db
    .prepare(
      `UPDATE ingestion_state
       SET value = '0',
           updated_at = ?
       WHERE key = 'poll_lease_until'
         AND value = ?`,
    )
    .bind(now, leaseToken)
    .run();
}

export async function loadTelemetryWindow(
  db: D1Database,
  now: number,
  lookbackMs: number,
): Promise<TelemetryWindow> {
  const state = parseCursorState(
    await readStateValue(db, "telemetry_cursor_v1"),
  );
  if (state?.pending) {
    return state.pending;
  }

  const latestSafeTo = Math.max(0, now - 15_000);
  const defaultFrom = latestSafeTo - lookbackMs;
  if (!state) {
    return { from: defaultFrom, to: latestSafeTo };
  }

  const from = Math.max(0, state.lastCompletedTo - CURSOR_OVERLAP_MS);
  const to =
    from < defaultFrom
      ? Math.min(latestSafeTo, from + lookbackMs)
      : latestSafeTo;
  return { from, to };
}

export async function saveTelemetryWindowResult(
  db: D1Database,
  window: TelemetryWindow,
  nextOffset: string | undefined,
  now: number,
): Promise<void> {
  const previous = parseCursorState(
    await readStateValue(db, "telemetry_cursor_v1"),
  );
  const lastCompletedTo = previous?.lastCompletedTo ?? window.from;
  const state: TelemetryCursorState = nextOffset
    ? {
        lastCompletedTo,
        pending: {
          from: window.from,
          to: window.to,
          offset: nextOffset,
        },
      }
    : { lastCompletedTo: window.to };
  await writeStateValue(
    db,
    "telemetry_cursor_v1",
    JSON.stringify(state),
    now,
  );
}

function maxSeverity(
  first: IncidentSeverity,
  second: IncidentSeverity,
): IncidentSeverity {
  return SEVERITY_RANK[first] >= SEVERITY_RANK[second] ? first : second;
}

function thresholdForSeverity(severity: IncidentSeverity): number {
  switch (severity) {
    case "critical":
      return 1;
    case "high":
      return 3;
    case "medium":
      return 5;
  }
}

export function shouldNotifyIncidentUpdate(
  previousNotifiedCount: number,
  previousNotifiedAt: number | null,
  nextCount: number,
  now: number,
  severityPromoted: boolean,
): boolean {
  if (severityPromoted || previousNotifiedAt === null) {
    return true;
  }
  const crossedMilestone = UPDATE_MILESTONES.some(
    (milestone) =>
      previousNotifiedCount < milestone && nextCount >= milestone,
  );
  return (
    crossedMilestone ||
    (nextCount > previousNotifiedCount &&
      now - previousNotifiedAt >= UPDATE_COOLDOWN_MS)
  );
}

async function fingerprintCandidate(
  candidate: TelemetryCandidate,
  environment: string,
): Promise<{ fingerprint: string; normalizedMessage: string }> {
  const normalizedMessage = normalizeFingerprintText(candidate.message);
  const errorIdentity =
    candidate.fingerprintHint ??
    `${candidate.errorName ?? "unknown"}:${normalizedMessage}`;
  const normalizedRoute = candidate.route
    ? normalizeFingerprintText(candidate.route)
    : "-";
  const fingerprint = await sha256Hex(
    [
      candidate.service,
      environment,
      candidate.sourceKind,
      normalizedRoute,
      errorIdentity,
      candidate.outcome ?? "-",
      candidate.statusCode ? String(Math.floor(candidate.statusCode / 100)) : "-",
    ].join("|"),
  );
  return { fingerprint, normalizedMessage };
}

async function registerFreshCandidates(
  db: D1Database,
  candidates: TelemetryCandidate[],
  now: number,
): Promise<TelemetryCandidate[]> {
  const fresh: TelemetryCandidate[] = [];
  const expiresAt = now + 3 * DAY_MS;

  for (let offset = 0; offset < candidates.length; offset += 50) {
    const chunk = candidates.slice(offset, offset + 50);
    const statements = chunk.map((candidate) =>
      db
        .prepare(
          `INSERT OR IGNORE INTO processed_events (
             event_id,
             observed_at,
             expires_at
           ) VALUES (?, ?, ?)`,
        )
        .bind(candidate.eventId, candidate.observedAt, expiresAt),
    );
    const results = await db.batch(statements);
    results.forEach((result, index) => {
      if (result.meta.changes > 0) {
        const candidate = chunk[index];
        if (candidate) {
          fresh.push(candidate);
        }
      }
    });
  }

  return fresh;
}

async function groupCandidates(
  candidates: TelemetryCandidate[],
  environment: string,
): Promise<CandidateGroup[]> {
  const keyed = await Promise.all(
    candidates.map(async (candidate) => ({
      candidate,
      ...(await fingerprintCandidate(candidate, environment)),
    })),
  );
  const groups = new Map<string, CandidateGroup>();

  for (const item of keyed) {
    const existing = groups.get(item.fingerprint);
    if (!existing) {
      groups.set(item.fingerprint, {
        fingerprint: item.fingerprint,
        normalizedMessage: item.normalizedMessage,
        events: [item.candidate],
        representative: item.candidate,
        severity: item.candidate.severity,
      });
      continue;
    }

    existing.events.push(item.candidate);
    if (
      SEVERITY_RANK[item.candidate.severity] >
      SEVERITY_RANK[existing.severity]
    ) {
      existing.severity = item.candidate.severity;
      existing.representative = item.candidate;
      existing.normalizedMessage = item.normalizedMessage;
    }
  }

  return [...groups.values()];
}

function fallbackTitle(candidate: TelemetryCandidate): string {
  const location = candidate.route ? ` ${candidate.route}` : "";
  if (candidate.sourceKind === "runtime") {
    return `Worker 运行时异常${location}`;
  }
  if (candidate.sourceKind === "http_5xx") {
    return `网站接口出现 ${candidate.statusCode ?? "5xx"}${location}`;
  }
  return `Worker 错误日志${location}`;
}

function makeIncidentId(now: number, fingerprint: string): string {
  return `inc_${now.toString(36)}_${fingerprint.slice(0, 12)}`;
}

function makeDeliveryId(
  incidentId: string,
  transition: IncidentTransition,
  revision: number,
): string {
  return `site-incident:${incidentId}:${transition}:${revision}`;
}

async function insertDelivery(
  db: D1Database,
  message: ObserverQueueMessage,
  now: number,
): Promise<void> {
  await db
    .prepare(
      `INSERT OR IGNORE INTO deliveries (
         delivery_id,
         kind,
         incident_id,
         transition,
         revision,
         state,
         attempts,
         payload_json,
         created_at,
         updated_at
       ) VALUES (?, ?, ?, ?, ?, 'pending', 0, ?, ?, ?)`,
    )
    .bind(
      message.deliveryId,
      message.kind,
      message.kind === "incident" ? message.incidentId : null,
      message.kind === "incident" ? message.transition : message.kind,
      message.kind === "incident" ? message.revision : 1,
      JSON.stringify(message),
      now,
      now,
    )
    .run();
}

interface StormNotificationState {
  deliveryId: string;
  suppressedCount: number;
}

function parseStormNotificationState(
  value: string | null,
): StormNotificationState | null {
  if (!value) {
    return null;
  }
  const parsed = parseJson(value);
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("deliveryId" in parsed) ||
    typeof parsed.deliveryId !== "string" ||
    !parsed.deliveryId ||
    !("suppressedCount" in parsed) ||
    typeof parsed.suppressedCount !== "number" ||
    !Number.isFinite(parsed.suppressedCount)
  ) {
    return null;
  }
  return {
    deliveryId: parsed.deliveryId,
    suppressedCount: Math.max(1, Math.floor(parsed.suppressedCount)),
  };
}

async function insertIncidentDeliveryWithCap(
  db: D1Database,
  message: IncidentQueueMessage,
  severity: IncidentSeverity,
  now: number,
): Promise<void> {
  if (message.transition === "recovered") {
    await insertDelivery(db, message, now);
    return;
  }
  if (message.transition === "opened" && severity === "critical") {
    await insertDelivery(db, message, now);
    return;
  }

  const recent = await db
    .prepare(
      `SELECT COUNT(*) AS count
       FROM deliveries AS delivery
       LEFT JOIN incidents AS incident
         ON incident.id = delivery.incident_id
       WHERE delivery.kind = 'incident'
         AND delivery.transition IN ('opened', 'updated')
         AND delivery.created_at >= ?
         AND NOT (
           delivery.transition = 'opened'
           AND COALESCE(incident.severity, 'medium') = 'critical'
         )`,
    )
    .bind(now - HOUR_MS)
    .first<{ count: number }>();
  if ((recent?.count ?? 0) < INCIDENT_NOTIFICATION_LIMIT_PER_HOUR) {
    await insertDelivery(db, message, now);
    return;
  }

  const stateKey = `storm_summary:${Math.floor(now / HOUR_MS)}`;
  const previous = parseStormNotificationState(
    await readStateValue(db, stateKey),
  );
  const suppressedCount = (previous?.suppressedCount ?? 0) + 1;
  let stormDeliveryId = previous?.deliveryId;

  if (!stormDeliveryId) {
    stormDeliveryId = makeDeliveryId(
      message.incidentId,
      "updated",
      message.revision,
    );
    const stormMessage: IncidentQueueMessage = {
      ...message,
      deliveryId: stormDeliveryId,
      transition: "updated",
      stormSummary: {
        suppressedCount,
        windowStartedAt: now - HOUR_MS,
      },
    };
    await insertDelivery(db, stormMessage, now);
  } else {
    const delivery = await getDelivery(db, stormDeliveryId);
    const parsed = delivery
      ? parseObserverQueueMessage(parseJson(delivery.payload_json))
      : null;
    if (
      delivery?.state === "pending" &&
      !delivery.webhook_body_json &&
      parsed?.kind === "incident"
    ) {
      await db
        .prepare(
          `UPDATE deliveries
           SET payload_json = ?,
               updated_at = ?
           WHERE delivery_id = ?
             AND state = 'pending'
             AND webhook_body_json IS NULL`,
        )
        .bind(
          JSON.stringify({
            ...parsed,
            stormSummary: {
              suppressedCount,
              windowStartedAt: now - HOUR_MS,
            },
          } satisfies IncidentQueueMessage),
          now,
          stormDeliveryId,
        )
        .run();
    }
  }

  await writeStateValue(
    db,
    stateKey,
    JSON.stringify({ deliveryId: stormDeliveryId, suppressedCount }),
    now,
  );
  console.warn("observer_incident_notification_suppressed", {
    incidentId: message.incidentId,
    transition: message.transition,
    severity,
    suppressedCount,
    stormDeliveryId,
  });
}

async function storeSamples(
  db: D1Database,
  incidentId: string,
  events: TelemetryCandidate[],
  now: number,
): Promise<void> {
  const existing = await db
    .prepare(
      `SELECT COUNT(*) AS count
       FROM incident_samples
       WHERE incident_id = ?`,
    )
    .bind(incidentId)
    .first<{ count: number }>();
  const remaining = Math.max(0, 5 - (existing?.count ?? 0));
  if (remaining === 0) {
    return;
  }

  const expiresAt = now + 7 * DAY_MS;
  const statements = events.slice(0, remaining).map((event) =>
    db
      .prepare(
        `INSERT OR IGNORE INTO incident_samples (
           incident_id,
           event_id,
           observed_at,
           message,
           route,
           status_code,
           outcome,
           level,
           expires_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        incidentId,
        event.eventId,
        event.observedAt,
        event.message,
        event.route,
        event.statusCode,
        event.outcome,
        event.level,
        expiresAt,
      ),
  );
  if (statements.length > 0) {
    await db.batch(statements);
  }
}

async function processGroup(
  db: D1Database,
  config: ObserverConfig,
  group: CandidateGroup,
  now: number,
): Promise<void> {
  const existing = await db
    .prepare(
      `SELECT *
       FROM incidents
       WHERE fingerprint = ?
         AND status IN ('pending', 'open')
       ORDER BY last_seen DESC
       LIMIT 1`,
    )
    .bind(group.fingerprint)
    .first<IncidentRecord>();

  const firstSeen = Math.min(...group.events.map((event) => event.observedAt));
  const lastSeen = Math.max(...group.events.map((event) => event.observedAt));
  const representative = group.representative;

  if (!existing) {
    const incidentId = makeIncidentId(now, group.fingerprint);
    const count = group.events.length;
    const shouldOpen = count >= thresholdForSeverity(group.severity);
    const status = shouldOpen ? "open" : "pending";
    const revision = shouldOpen ? 1 : 0;
    await db
      .prepare(
        `INSERT INTO incidents (
           id,
           fingerprint,
           service,
           environment,
           status,
           severity,
           source_kind,
           route,
           error_name,
           normalized_message,
           deployment_version,
           title,
           first_seen,
           last_seen,
           opened_at,
           occurrence_count,
           last_notified_count,
           last_notified_at,
           revision,
           created_at,
           updated_at
         ) VALUES (
           ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
         )`,
      )
      .bind(
        incidentId,
        group.fingerprint,
        representative.service,
        config.targetEnvironment,
        status,
        group.severity,
        representative.sourceKind,
        representative.route,
        representative.errorName,
        group.normalizedMessage,
        representative.deploymentVersion,
        fallbackTitle(representative),
        firstSeen,
        lastSeen,
        shouldOpen ? now : null,
        count,
        shouldOpen ? count : 0,
        shouldOpen ? now : null,
        revision,
        now,
        now,
      )
      .run();
    await storeSamples(db, incidentId, group.events, now);

    if (shouldOpen) {
      const deliveryId = makeDeliveryId(incidentId, "opened", revision);
      await insertIncidentDeliveryWithCap(
        db,
        {
          schemaVersion: 1,
          kind: "incident",
          deliveryId,
          incidentId,
          transition: "opened",
          revision,
          createdAt: now,
        },
        group.severity,
        now,
      );
    }
    return;
  }

  const nextCount = existing.occurrence_count + group.events.length;
  const nextSeverity = maxSeverity(existing.severity, group.severity);
  const severityPromoted =
    SEVERITY_RANK[nextSeverity] > SEVERITY_RANK[existing.severity];
  let transition: IncidentTransition | null = null;
  if (
    existing.status === "pending" &&
    nextCount >= thresholdForSeverity(nextSeverity)
  ) {
    transition = "opened";
  } else if (
    existing.status === "open" &&
    shouldNotifyIncidentUpdate(
      existing.last_notified_count,
      existing.last_notified_at,
      nextCount,
      now,
      severityPromoted,
    )
  ) {
    transition = "updated";
  }

  const nextStatus = transition === "opened" ? "open" : existing.status;
  const nextRevision = transition ? existing.revision + 1 : existing.revision;
  const notifiedCount = transition
    ? nextCount
    : existing.last_notified_count;
  const notifiedAt = transition ? now : existing.last_notified_at;
  const openedAt =
    transition === "opened" ? now : existing.opened_at;

  await db
    .prepare(
      `UPDATE incidents SET
         status = ?,
         severity = ?,
         source_kind = ?,
         route = COALESCE(route, ?),
         error_name = COALESCE(error_name, ?),
         deployment_version = COALESCE(?, deployment_version),
         last_seen = ?,
         opened_at = ?,
         occurrence_count = ?,
         last_notified_count = ?,
         last_notified_at = ?,
         revision = ?,
         updated_at = ?
       WHERE id = ?`,
    )
    .bind(
      nextStatus,
      nextSeverity,
      representative.sourceKind,
      representative.route,
      representative.errorName,
      representative.deploymentVersion,
      Math.max(existing.last_seen, lastSeen),
      openedAt,
      nextCount,
      notifiedCount,
      notifiedAt,
      nextRevision,
      now,
      existing.id,
    )
    .run();
  await storeSamples(db, existing.id, group.events, now);

  if (transition) {
    const deliveryId = makeDeliveryId(
      existing.id,
      transition,
      nextRevision,
    );
    await insertIncidentDeliveryWithCap(
      db,
      {
        schemaVersion: 1,
        kind: "incident",
        deliveryId,
        incidentId: existing.id,
        transition,
        revision: nextRevision,
        createdAt: now,
      },
      nextSeverity,
      now,
    );
  }
}

export async function processTelemetryCandidates(
  db: D1Database,
  config: ObserverConfig,
  candidates: TelemetryCandidate[],
  now: number,
): Promise<{ received: number; fresh: number; groups: number }> {
  const fresh = await registerFreshCandidates(db, candidates, now);
  const groups = await groupCandidates(fresh, config.targetEnvironment);
  for (const group of groups) {
    await processGroup(db, config, group, now);
  }
  return {
    received: candidates.length,
    fresh: fresh.length,
    groups: groups.length,
  };
}

export async function recoverQuietIncidents(
  db: D1Database,
  recoveryMs: number,
  now: number,
): Promise<number> {
  const quietBefore = now - recoveryMs;
  await db
    .prepare(
      `UPDATE incidents SET
         status = 'expired',
         updated_at = ?
       WHERE status = 'pending'
         AND last_seen <= ?`,
    )
    .bind(now, quietBefore)
    .run();

  const openIncidents = await db
    .prepare(
      `SELECT *
       FROM incidents
       WHERE status = 'open'
         AND last_seen <= ?
       ORDER BY last_seen ASC
       LIMIT 100`,
    )
    .bind(quietBefore)
    .all<IncidentRecord>();
  let recovered = 0;

  for (const incident of openIncidents.results) {
    const revision = incident.revision + 1;
    const result = await db
      .prepare(
        `UPDATE incidents SET
           status = 'recovered',
           recovered_at = ?,
           revision = ?,
           updated_at = ?
         WHERE id = ?
           AND status = 'open'`,
      )
      .bind(now, revision, now, incident.id)
      .run();
    if (result.meta.changes === 0) {
      continue;
    }
    recovered += 1;
    const deliveryId = makeDeliveryId(
      incident.id,
      "recovered",
      revision,
    );
    await insertDelivery(
      db,
      {
        schemaVersion: 1,
        kind: "incident",
        deliveryId,
        incidentId: incident.id,
        transition: "recovered",
        revision,
        createdAt: now,
      },
      now,
    );
  }

  return recovered;
}

function dateAndHourInJst(now: number): { date: string; hour: number } {
  const jst = new Date(now + 9 * 60 * 60_000);
  return {
    date: jst.toISOString().slice(0, 10),
    hour: jst.getUTCHours(),
  };
}

export async function createDailyHeartbeat(
  db: D1Database,
  heartbeatHourJst: number,
  now: number,
): Promise<boolean> {
  const current = dateAndHourInJst(now);
  if (current.hour < heartbeatHourJst) {
    return false;
  }
  const key = `heartbeat_created:${current.date}`;
  if ((await readStateValue(db, key)) === "1") {
    return false;
  }

  const deliveryId = `site-monitor:heartbeat:${current.date}:1`;
  await insertDelivery(
    db,
    {
      schemaVersion: 1,
      kind: "heartbeat",
      deliveryId,
      dateJst: current.date,
      observedAt: now,
      createdAt: now,
    },
    now,
  );
  await writeStateValue(db, key, "1", now);
  return true;
}

export async function setMonitorWaitingForToken(
  db: D1Database,
  now: number,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO monitor_health (
         key,
         status,
         consecutive_failures,
         updated_at
       ) VALUES ('observability_poll', 'waiting_for_token', 0, ?)
       ON CONFLICT (key) DO UPDATE SET
         status = 'waiting_for_token',
         consecutive_failures = 0,
         last_error = NULL,
         updated_at = excluded.updated_at`,
    )
    .bind(now)
    .run();
}

export async function recordMonitorSuccess(
  db: D1Database,
  now: number,
  hasBacklog: boolean,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO monitor_health (
         key,
         status,
         consecutive_failures,
         last_success_at,
         updated_at
       ) VALUES ('observability_poll', ?, 0, ?, ?)
       ON CONFLICT (key) DO UPDATE SET
         status = excluded.status,
         consecutive_failures = 0,
         last_success_at = excluded.last_success_at,
         last_error = NULL,
         updated_at = excluded.updated_at`,
    )
    .bind(hasBacklog ? "backlog" : "healthy", now, now)
    .run();
}

export async function recordMonitorFailure(
  db: D1Database,
  error: unknown,
  now: number,
): Promise<MonitorHealthRecord> {
  const message = safeErrorMessage(error);
  const row = await db
    .prepare(
      `INSERT INTO monitor_health (
         key,
         status,
         consecutive_failures,
         last_failure_at,
         last_error,
         updated_at
       ) VALUES ('observability_poll', 'failing', 1, ?, ?, ?)
       ON CONFLICT (key) DO UPDATE SET
         status = 'failing',
         consecutive_failures = monitor_health.consecutive_failures + 1,
         last_failure_at = excluded.last_failure_at,
         last_error = excluded.last_error,
         updated_at = excluded.updated_at
       RETURNING
         status,
         consecutive_failures,
         last_success_at,
         last_failure_at,
         last_error,
         last_alert_at,
         updated_at`,
    )
    .bind(now, message, now)
    .first<MonitorHealthRecord>();
  if (!row) {
    throw new Error("Could not persist monitor failure state");
  }
  return row;
}

export async function createDegradedAlertIfNeeded(
  db: D1Database,
  health: MonitorHealthRecord,
  now: number,
): Promise<boolean> {
  if (
    health.consecutive_failures < 3 ||
    (health.last_alert_at !== null &&
      now - health.last_alert_at < DEGRADED_ALERT_COOLDOWN_MS)
  ) {
    return false;
  }

  const bucket = Math.floor(now / DEGRADED_ALERT_COOLDOWN_MS);
  const deliveryId = `site-monitor:degraded:${bucket}:1`;
  await insertDelivery(
    db,
    {
      schemaVersion: 1,
      kind: "degraded",
      deliveryId,
      reason: health.last_error ?? "Observability polling failed",
      consecutiveFailures: health.consecutive_failures,
      observedAt: now,
      createdAt: now,
    },
    now,
  );
  await db
    .prepare(
      `UPDATE monitor_health
       SET last_alert_at = ?,
           updated_at = ?
       WHERE key = 'observability_poll'`,
    )
    .bind(now, now)
    .run();
  return true;
}

export async function enqueuePendingDeliveries(
  env: Env,
  now: number,
): Promise<number> {
  const staleBefore = now - STALE_DELIVERY_MS;
  const abandoned = await env.DB
    .prepare(
      `UPDATE deliveries SET
         state = 'permanent_failure',
         last_error = 'Delivery retry ceiling reached after queue timeout',
         updated_at = ?
       WHERE state IN ('queued', 'processing')
         AND updated_at <= ?
         AND attempts >= ?`,
    )
    .bind(now, staleBefore, MAX_DELIVERY_ATTEMPTS)
    .run();
  if (abandoned.meta.changes > 0) {
    console.error("observer_stale_deliveries_abandoned", {
      count: abandoned.meta.changes,
      maximumAttempts: MAX_DELIVERY_ATTEMPTS,
    });
  }

  const reclaimed = await env.DB
    .prepare(
      `UPDATE deliveries SET
         state = 'pending',
         queued_at = NULL,
         last_error = COALESCE(
           last_error,
           'Stale queue delivery reclaimed'
         ),
         updated_at = ?
       WHERE state IN ('queued', 'processing')
         AND updated_at <= ?
         AND attempts < ?`,
    )
    .bind(now, staleBefore, MAX_DELIVERY_ATTEMPTS)
    .run();
  if (reclaimed.meta.changes > 0) {
    console.warn("observer_stale_deliveries_reclaimed", {
      count: reclaimed.meta.changes,
    });
  }

  const pending = await env.DB
    .prepare(
      `SELECT *
       FROM deliveries
       WHERE state = 'pending'
       ORDER BY created_at ASC
       LIMIT 25`,
    )
    .all<DeliveryRecord>();
  let queued = 0;

  for (const delivery of pending.results) {
    const parsed = parseObserverQueueMessage(
      parseJson(delivery.payload_json),
    );
    if (!parsed) {
      await env.DB
        .prepare(
          `UPDATE deliveries SET
             state = 'permanent_failure',
             last_error = 'Invalid stored queue payload',
             updated_at = ?
           WHERE delivery_id = ?`,
        )
        .bind(now, delivery.delivery_id)
        .run();
      continue;
    }

    try {
      await env.INCIDENT_QUEUE.send(parsed, {
        contentType: "json",
      });
      await env.DB
        .prepare(
          `UPDATE deliveries SET
             state = 'queued',
             queued_at = ?,
             updated_at = ?
           WHERE delivery_id = ?
             AND state = 'pending'`,
        )
        .bind(now, now, delivery.delivery_id)
        .run();
      queued += 1;
    } catch (error) {
      await env.DB
        .prepare(
          `UPDATE deliveries SET
             last_error = ?,
             updated_at = ?
           WHERE delivery_id = ?
             AND state = 'pending'`,
        )
        .bind(safeErrorMessage(error), now, delivery.delivery_id)
        .run();
    }
  }

  return queued;
}

export async function runDailyRetention(
  db: D1Database,
  now: number,
): Promise<boolean> {
  const date = new Date(now).toISOString().slice(0, 10);
  const stateKey = `retention_completed:${date}`;
  if ((await readStateValue(db, stateKey)) === "1") {
    return false;
  }

  await db.batch([
    db
      .prepare("DELETE FROM processed_events WHERE expires_at < ?")
      .bind(now),
    db
      .prepare("DELETE FROM incident_samples WHERE expires_at < ?")
      .bind(now),
    db
      .prepare(
        `DELETE FROM deliveries
         WHERE state IN ('delivered', 'dry_run', 'permanent_failure')
           AND updated_at < ?`,
      )
      .bind(now - 30 * DAY_MS),
    db
      .prepare(
        `DELETE FROM incidents
         WHERE status IN ('recovered', 'expired')
           AND updated_at < ?`,
      )
      .bind(now - 90 * DAY_MS),
    db
      .prepare(
        `DELETE FROM ingestion_state
         WHERE (
           key LIKE 'heartbeat_created:%'
           OR key LIKE 'retention_completed:%'
           OR key LIKE 'storm_summary:%'
         )
           AND updated_at < ?`,
      )
      .bind(now - 14 * DAY_MS),
  ]);
  await writeStateValue(db, stateKey, "1", now);
  return true;
}

export async function getDelivery(
  db: D1Database,
  deliveryId: string,
): Promise<DeliveryRecord | null> {
  return (
    (await db
      .prepare("SELECT * FROM deliveries WHERE delivery_id = ?")
      .bind(deliveryId)
      .first<DeliveryRecord>()) ?? null
  );
}

export async function freezeDeliveryWebhookBody(
  db: D1Database,
  deliveryId: string,
  candidateBody: string,
  now: number,
): Promise<string> {
  if (new TextEncoder().encode(candidateBody).byteLength > 65_536) {
    throw new Error("Webhook body exceeds the 64 KiB delivery limit");
  }

  const frozen = await db
    .prepare(
      `UPDATE deliveries SET
         webhook_body_json = COALESCE(webhook_body_json, ?),
         updated_at = ?
       WHERE delivery_id = ?
       RETURNING webhook_body_json`,
    )
    .bind(candidateBody, now, deliveryId)
    .first<{ webhook_body_json: string | null }>();
  if (!frozen?.webhook_body_json) {
    throw new Error(`Unable to freeze webhook body for ${deliveryId}`);
  }
  return frozen.webhook_body_json;
}

export async function recordDeliveryAttempt(
  db: D1Database,
  deliveryId: string,
  attemptNumber: number,
  outcome: DeliveryAttemptOutcome,
  httpStatus: number | null,
  responseExcerpt: string | null,
  requestBodySha256: string,
  requestBodyBytes: number,
  now: number,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO delivery_attempts (
         delivery_id,
         attempt_number,
         outcome,
         http_status,
         response_excerpt,
         request_body_sha256,
         request_body_bytes,
         attempted_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      deliveryId,
      attemptNumber,
      outcome,
      httpStatus,
      responseExcerpt,
      requestBodySha256,
      requestBodyBytes,
      now,
    )
    .run();
}

export async function getIncident(
  db: D1Database,
  incidentId: string,
): Promise<IncidentRecord | null> {
  return (
    (await db
      .prepare("SELECT * FROM incidents WHERE id = ?")
      .bind(incidentId)
      .first<IncidentRecord>()) ?? null
  );
}

export async function getIncidentSamples(
  db: D1Database,
  incidentId: string,
): Promise<IncidentSample[]> {
  const result = await db
    .prepare(
      `SELECT
         message,
         route,
         status_code,
         outcome,
         level,
         observed_at
       FROM incident_samples
       WHERE incident_id = ?
       ORDER BY observed_at DESC
       LIMIT 5`,
    )
    .bind(incidentId)
    .all<IncidentSample>();
  return result.results;
}

export async function saveIncidentAnalysis(
  db: D1Database,
  incidentId: string,
  analysis: IncidentAnalysis,
  now: number,
): Promise<void> {
  await db
    .prepare(
      `UPDATE incidents SET
         title = ?,
         summary = ?,
         likely_cause = ?,
         confidence = ?,
         user_impact = ?,
         evidence_json = ?,
         recommended_checks_json = ?,
         analysis_source = ?,
         updated_at = ?
       WHERE id = ?`,
    )
    .bind(
      analysis.title,
      analysis.summary,
      analysis.likelyCause,
      analysis.confidence,
      analysis.userImpact,
      JSON.stringify(analysis.evidence),
      JSON.stringify(analysis.recommendedChecks),
      analysis.source,
      now,
      incidentId,
    )
    .run();
}

export async function markDeliveryProcessing(
  db: D1Database,
  deliveryId: string,
  now: number,
): Promise<number> {
  const processing = await db
    .prepare(
      `UPDATE deliveries SET
         state = 'processing',
         attempts = attempts + 1,
         updated_at = ?
       WHERE delivery_id = ?
         AND state IN ('pending', 'queued', 'processing')
       RETURNING attempts`,
    )
    .bind(now, deliveryId)
    .first<{ attempts: number }>();
  if (!processing) {
    throw new Error(`Unable to start delivery attempt for ${deliveryId}`);
  }
  return processing.attempts;
}

export async function markDeliveryFinished(
  db: D1Database,
  deliveryId: string,
  state: "delivered" | "dry_run" | "permanent_failure",
  error: string | null,
  now: number,
): Promise<void> {
  await db
    .prepare(
      `UPDATE deliveries SET
         state = ?,
         last_error = ?,
         delivered_at = CASE
           WHEN ? IN ('delivered', 'dry_run') THEN ?
           ELSE delivered_at
         END,
         updated_at = ?
       WHERE delivery_id = ?`,
    )
    .bind(state, error, state, now, now, deliveryId)
    .run();
}

export async function markDeliveryRetry(
  db: D1Database,
  deliveryId: string,
  error: string,
  now: number,
): Promise<void> {
  await db
    .prepare(
      `UPDATE deliveries SET
         state = 'processing',
         last_error = ?,
         updated_at = ?
       WHERE delivery_id = ?`,
    )
    .bind(error, now, deliveryId)
    .run();
}

export async function getMonitorHealth(
  db: D1Database,
): Promise<MonitorHealthRecord | null> {
  return (
    (await db
      .prepare(
        `SELECT
           status,
           consecutive_failures,
           last_success_at,
           last_failure_at,
           last_error,
           last_alert_at,
           updated_at
         FROM monitor_health
         WHERE key = 'observability_poll'`,
      )
      .first<MonitorHealthRecord>()) ?? null
  );
}

export async function getMonitorSnapshot(
  db: D1Database,
  now: number,
): Promise<MonitorSnapshot> {
  const [
    health,
    openIncidents,
    newIncidents,
    probableDlq,
    permanentFailures,
  ] =
    await Promise.all([
      getMonitorHealth(db),
      db
        .prepare(
          `SELECT COUNT(*) AS count
           FROM incidents
           WHERE status = 'open'`,
        )
        .first<{ count: number }>(),
      db
        .prepare(
          `SELECT COUNT(*) AS count
           FROM incidents
           WHERE opened_at >= ?`,
        )
        .bind(now - DAY_MS)
        .first<{ count: number }>(),
      db
        .prepare(
          `SELECT COUNT(*) AS count
           FROM deliveries
           WHERE state = 'processing'
             AND attempts >= 5`,
        )
        .first<{ count: number }>(),
      db
        .prepare(
          `SELECT COUNT(*) AS count
           FROM deliveries
           WHERE state = 'permanent_failure'
             AND updated_at >= ?`,
        )
        .bind(now - DAY_MS)
        .first<{ count: number }>(),
    ]);
  const degradedComponents: string[] = [];
  if (
    health?.status &&
    health.status !== "healthy" &&
    health.status !== "backlog"
  ) {
    degradedComponents.push("observability_poll");
  }
  if ((probableDlq?.count ?? 0) > 0) {
    degradedComponents.push("delivery_queue");
  }
  if ((permanentFailures?.count ?? 0) > 0) {
    degradedComponents.push("webhook_permanent_failure");
  }

  return {
    status: health?.status ?? "initializing",
    checkedAt: now,
    lastLogQueryAt: health?.last_success_at ?? null,
    openIncidentCount: openIncidents?.count ?? 0,
    newIncidents24h: newIncidents?.count ?? 0,
    dlqCount: probableDlq?.count ?? 0,
    permanentFailureCount: permanentFailures?.count ?? 0,
    degradedComponents,
  };
}
