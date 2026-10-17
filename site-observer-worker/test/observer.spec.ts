import { env } from "cloudflare:workers";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  acquirePollLease,
  enqueuePendingDeliveries,
  freezeDeliveryWebhookBody,
  getIncident,
  getMonitorSnapshot,
  loadTelemetryWindow,
  processTelemetryCandidates,
  recordDeliveryAttempt,
  recoverQuietIncidents,
  releasePollLease,
  runDailyRetention,
  saveIncidentAnalysis,
  shouldNotifyIncidentUpdate,
} from "../src/incident-store";
import {
  analysisFromStoredIncident,
  analyzeIncident,
} from "../src/incident-analysis";
import type {
  IncidentAnalysis,
  IncidentRecord,
  IncidentSample,
  TelemetryCandidate,
} from "../src/incident-types";
import {
  normalizeFingerprintText,
  sanitizeLogText,
} from "../src/log-redaction";
import type { ObserverConfig } from "../src/observer-config";
import { parseObserverQueueMessage } from "../src/queue-message";
import {
  buildObserverWebhookPayload,
  createWebhookSignature,
  sendSignedWebhook,
} from "../src/signed-webhook";
import {
  buildTelemetryQuery,
  fetchTelemetryWindow,
  parseTelemetryQueryPage,
} from "../src/telemetry";

const testConfig: ObserverConfig = {
  accountId: "account-id",
  targetWorkerName: "my-remix-worker",
  targetEnvironment: "production",
  deliveryEnabled: false,
  aiEnabled: false,
  aiGatewayId: "my-ai-gateway",
  lookbackMs: 10 * 60_000,
  recoveryMs: 30 * 60_000,
  queryEventLimit: 100,
  heartbeatHourJst: 9,
  observabilityToken: undefined,
  webhookUrl: undefined,
  webhookSecret: undefined,
};

beforeEach(async () => {
  await env.DB.batch([
    env.DB.prepare("DELETE FROM delivery_attempts"),
    env.DB.prepare("DELETE FROM deliveries"),
    env.DB.prepare("DELETE FROM incident_samples"),
    env.DB.prepare("DELETE FROM incidents"),
    env.DB.prepare("DELETE FROM processed_events"),
    env.DB.prepare("DELETE FROM ingestion_state"),
  ]);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function candidate(
  eventId: string,
  observedAt: number,
  overrides: Partial<TelemetryCandidate> = {},
): TelemetryCandidate {
  return {
    eventId,
    observedAt,
    service: "my-remix-worker",
    sourceKind: "http_5xx",
    severity: "high",
    route: "/api/messages",
    errorName: "UpstreamError",
    message: "Upstream returned status 500",
    fingerprintHint: null,
    statusCode: 500,
    outcome: null,
    level: "error",
    deploymentVersion: "test-version",
    ...overrides,
  };
}

function incidentRecord(now: number): IncidentRecord {
  return {
    id: "incident-test",
    fingerprint: "abc123",
    service: "my-remix-worker",
    environment: "production",
    status: "open",
    severity: "high",
    source_kind: "http_5xx",
    route: "/api/messages",
    error_name: "UpstreamError",
    normalized_message: "Upstream returned status 500",
    deployment_version: "version-1",
    title: "留言接口异常",
    summary: "留言接口连续返回服务器错误。",
    likely_cause: "上游服务异常。",
    confidence: "medium",
    user_impact: "留言可能提交失败。",
    evidence_json: null,
    recommended_checks_json: null,
    analysis_source: null,
    first_seen: now,
    last_seen: now,
    opened_at: now,
    recovered_at: null,
    occurrence_count: 3,
    last_notified_count: 3,
    last_notified_at: now,
    revision: 1,
    created_at: now,
    updated_at: now,
  };
}

describe("privacy redaction", () => {
  it("removes credentials, personal identifiers, and URL queries", () => {
    const sanitized = sanitizeLogText(
      "owner@example.com 203.0.113.7 Authorization=Bearer-secret-value " +
        "Authorization: Bearer short-token 2001:db8::1 12:34:56 " +
        "https://example.com/api/messages?token=visible",
    );
    expect(sanitized).not.toContain("owner@example.com");
    expect(sanitized).not.toContain("203.0.113.7");
    expect(sanitized).not.toContain("Bearer-secret-value");
    expect(sanitized).not.toContain("short-token");
    expect(sanitized).not.toContain("2001:db8::1");
    expect(sanitized).not.toContain("token=visible");
    expect(sanitized).toContain("https://example.com/api/messages");
    expect(sanitized).toContain("12:34:56");
  });

  it("normalizes volatile identifiers for stable grouping", () => {
    expect(
      normalizeFingerprintText(
        "Request 123456 failed for 550e8400-e29b-41d4-a716-446655440000",
      ),
    ).toBe("request <number> failed for <uuid>");
  });
});

describe("Observability query boundary", () => {
  it("builds a server-filtered paginated query", () => {
    const query = buildTelemetryQuery(testConfig, {
      from: 100,
      to: 200,
      offset: "event-cursor",
    });
    expect(query.offsetDirection).toBe("next");
    expect(query.offset).toBe("event-cursor");
    expect(JSON.stringify(query)).toContain("my-remix-worker");
    expect(JSON.stringify(query)).toContain("$workers.outcome");
  });

  it("parses only the target worker and sanitizes evidence", () => {
    const parsed = parseTelemetryQueryPage(
      {
        result: {
          events: {
            count: 2,
            events: [
              {
                timestamp: "2026-07-24T00:00:00.000Z",
                $metadata: {
                  id: "event-1",
                  service: "my-remix-worker",
                  level: "error",
                  error:
                    "TypeError: owner@example.com Authorization=Bearer-secret " +
                    "https://example.com/api/messages?token=visible",
                  url: "https://example.com/api/messages?token=visible",
                  statusCode: 500,
                },
                $workers: {
                  outcome: "exception",
                  scriptVersion: "version-1",
                  event: {
                    response: { status: 500 },
                  },
                },
              },
              {
                timestamp: "2026-07-24T00:00:01.000Z",
                $metadata: {
                  id: "event-2",
                  service: "another-worker",
                  level: "error",
                  error: "Should be ignored",
                },
              },
            ],
          },
        },
      },
      "my-remix-worker",
    );

    expect(parsed.matchedCount).toBe(2);
    expect(parsed.candidates).toHaveLength(1);
    expect(parsed.candidates[0]?.route).toBe("/api/messages");
    expect(parsed.candidates[0]?.severity).toBe("critical");
    expect(parsed.candidates[0]?.message).not.toContain(
      "owner@example.com",
    );
    expect(parsed.candidates[0]?.message).not.toContain(
      "Bearer-secret",
    );
  });

  it("preserves an HTTP status when an API error is not JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("Bad Gateway", { status: 502 })),
    );

    await expect(
      fetchTelemetryWindow(
        {
          ...testConfig,
          observabilityToken: "test-token",
        },
        { from: 100, to: 200 },
      ),
    ).rejects.toThrow("Observability API HTTP 502");
  });
});

describe("poll cursor and lease", () => {
  it("walks an old cursor forward without skipping the downtime gap", async () => {
    const now = Date.parse("2026-07-24T02:00:00.000Z");
    const lastCompletedTo = now - 60 * 60_000;
    await env.DB
      .prepare(
        `INSERT INTO ingestion_state (key, value, updated_at)
         VALUES ('telemetry_cursor_v1', ?, ?)`,
      )
      .bind(JSON.stringify({ lastCompletedTo }), now)
      .run();

    const window = await loadTelemetryWindow(env.DB, now, 10 * 60_000);
    expect(window).toEqual({
      from: lastCompletedTo - 5 * 60_000,
      to: lastCompletedTo + 5 * 60_000,
    });
  });

  it("does not let an expired lease owner release a newer lease", async () => {
    const now = Date.parse("2026-07-24T02:00:00.000Z");
    const firstToken = await acquirePollLease(env.DB, now);
    expect(firstToken).not.toBeNull();

    const secondNow = now + 4 * 60_000 + 1;
    const secondToken = await acquirePollLease(env.DB, secondNow);
    expect(secondToken).not.toBeNull();
    expect(secondToken).not.toBe(firstToken);

    await releasePollLease(env.DB, firstToken!, secondNow + 1);
    await expect(
      acquirePollLease(env.DB, secondNow + 2),
    ).resolves.toBeNull();

    await releasePollLease(env.DB, secondToken!, secondNow + 3);
    await expect(
      acquirePollLease(env.DB, secondNow + 4),
    ).resolves.not.toBeNull();
  });
});

describe("incident policy", () => {
  it("notifies on milestones, cooldowns, and severity promotion", () => {
    const now = 2_000_000;
    expect(
      shouldNotifyIncidentUpdate(3, now - 1_000, 5, now, false),
    ).toBe(true);
    expect(
      shouldNotifyIncidentUpdate(5, now - 1_000, 6, now, false),
    ).toBe(false);
    expect(
      shouldNotifyIncidentUpdate(
        5,
        now - 31 * 60_000,
        6,
        now,
        false,
      ),
    ).toBe(true);
    expect(
      shouldNotifyIncidentUpdate(5, now - 1_000, 6, now, true),
    ).toBe(true);
  });

  it("deduplicates events, opens at threshold, and records recovery", async () => {
    const now = Date.parse("2026-07-24T01:00:00.000Z");
    const events = [
      candidate("event-a", now),
      candidate("event-b", now + 1),
      candidate("event-c", now + 2),
    ];

    const first = await processTelemetryCandidates(
      env.DB,
      testConfig,
      events,
      now,
    );
    expect(first).toEqual({ received: 3, fresh: 3, groups: 1 });

    const incident = await env.DB
      .prepare("SELECT * FROM incidents LIMIT 1")
      .first<IncidentRecord>();
    expect(incident?.status).toBe("open");
    expect(incident?.occurrence_count).toBe(3);

    const duplicate = await processTelemetryCandidates(
      env.DB,
      testConfig,
      events,
      now + 1_000,
    );
    expect(duplicate.fresh).toBe(0);

    const openedDeliveries = await env.DB
      .prepare(
        "SELECT COUNT(*) AS count FROM deliveries WHERE transition = 'opened'",
      )
      .first<{ count: number }>();
    expect(openedDeliveries?.count).toBe(1);

    const recovered = await recoverQuietIncidents(
      env.DB,
      testConfig.recoveryMs,
      now + testConfig.recoveryMs + 10_000,
    );
    expect(recovered).toBe(1);
    const recoveryDeliveries = await env.DB
      .prepare(
        "SELECT COUNT(*) AS count FROM deliveries WHERE transition = 'recovered'",
      )
      .first<{ count: number }>();
    expect(recoveryDeliveries?.count).toBe(1);
  });

  it("groups dynamic route identifiers into one incident fingerprint", async () => {
    const now = Date.parse("2026-07-24T03:00:00.000Z");
    await processTelemetryCandidates(
      env.DB,
      testConfig,
      [
        candidate("route-a", now, { route: "/messages/12345" }),
        candidate("route-b", now + 1, { route: "/messages/67890" }),
        candidate("route-c", now + 2, { route: "/messages/24680" }),
      ],
      now,
    );

    const result = await env.DB
      .prepare(
        `SELECT COUNT(*) AS count, MAX(occurrence_count) AS occurrences
         FROM incidents`,
      )
      .first<{ count: number; occurrences: number }>();
    expect(result).toEqual({ count: 1, occurrences: 3 });
  });

  it("keeps at most five samples for a long-running incident", async () => {
    const now = Date.parse("2026-07-24T04:00:00.000Z");
    const shared = { fingerprintHint: "sample-cap" };
    await processTelemetryCandidates(
      env.DB,
      testConfig,
      [
        candidate("sample-a", now, shared),
        candidate("sample-b", now + 1, shared),
        candidate("sample-c", now + 2, shared),
      ],
      now,
    );
    await processTelemetryCandidates(
      env.DB,
      testConfig,
      Array.from({ length: 5 }, (_, index) =>
        candidate(`sample-update-${index}`, now + 1_000 + index, shared),
      ),
      now + 1_000,
    );

    const samples = await env.DB
      .prepare("SELECT COUNT(*) AS count FROM incident_samples")
      .first<{ count: number }>();
    expect(samples?.count).toBe(5);
  });

  it("caps ordinary incident notifications and creates one storm summary", async () => {
    const now = Date.parse("2026-07-24T05:00:00.000Z");
    const events = Array.from({ length: 8 }, (_, groupIndex) =>
      Array.from({ length: 3 }, (_, eventIndex) =>
        candidate(
          `storm-${groupIndex}-${eventIndex}`,
          now + groupIndex * 10 + eventIndex,
          { fingerprintHint: `storm-group-${groupIndex}` },
        ),
      ),
    ).flat();
    vi.spyOn(console, "warn").mockImplementation(() => undefined);

    await processTelemetryCandidates(env.DB, testConfig, events, now);

    const deliveries = await env.DB
      .prepare(
        `SELECT transition, payload_json
         FROM deliveries
         ORDER BY created_at, delivery_id`,
      )
      .all<{ transition: string; payload_json: string }>();
    expect(deliveries.results).toHaveLength(7);
    expect(
      deliveries.results.filter((delivery) => delivery.transition === "opened"),
    ).toHaveLength(6);
    const summary = deliveries.results.find(
      (delivery) => delivery.transition === "updated",
    );
    expect(summary).toBeDefined();
    expect(JSON.parse(summary!.payload_json)).toMatchObject({
      kind: "incident",
      transition: "updated",
      stormSummary: {
        suppressedCount: 2,
      },
    });
  });

  it("never rate-limits newly opened critical incidents", async () => {
    const now = Date.parse("2026-07-24T06:00:00.000Z");
    const events = Array.from({ length: 7 }, (_, index) =>
      candidate(`critical-${index}`, now + index, {
        severity: "critical",
        fingerprintHint: `critical-group-${index}`,
      }),
    );

    await processTelemetryCandidates(env.DB, testConfig, events, now);

    const deliveries = await env.DB
      .prepare("SELECT COUNT(*) AS count FROM deliveries")
      .first<{ count: number }>();
    expect(deliveries?.count).toBe(7);
  });

  it("persists fallback analysis provenance for recovery notifications", async () => {
    const now = Date.parse("2026-07-24T07:00:00.000Z");
    await processTelemetryCandidates(
      env.DB,
      testConfig,
      [
        candidate("analysis-a", now),
        candidate("analysis-b", now + 1),
        candidate("analysis-c", now + 2),
      ],
      now,
    );
    const incidentId = await env.DB
      .prepare("SELECT id FROM incidents LIMIT 1")
      .first<{ id: string }>();
    expect(incidentId).toBeDefined();
    const fallbackAnalysis: IncidentAnalysis = {
      title: "规则分析",
      summary: "AI 暂不可用，使用规则分析。",
      likelyCause: "上游服务异常。",
      confidence: "low",
      userImpact: "请求可能失败。",
      evidence: ["HTTP 500"],
      recommendedChecks: ["检查上游服务"],
      source: "fallback",
    };
    await saveIncidentAnalysis(
      env.DB,
      incidentId!.id,
      fallbackAnalysis,
      now + 100,
    );
    const stored = await getIncident(env.DB, incidentId!.id);
    expect(stored?.analysis_source).toBe("fallback");
    expect(
      analysisFromStoredIncident(stored!, []).source,
    ).toBe("fallback");
  });
});

describe("delivery and health recovery", () => {
  it("requeues stale deliveries and abandons rows at the retry ceiling", async () => {
    const now = Date.parse("2026-07-24T08:00:00.000Z");
    const staleAt = now - 11 * 60_000;
    const makePayload = (deliveryId: string) =>
      JSON.stringify({
        schemaVersion: 1,
        kind: "heartbeat",
        deliveryId,
        dateJst: "2026-07-24",
        observedAt: staleAt,
        createdAt: staleAt,
      });
    await env.DB.batch([
      env.DB
        .prepare(
          `INSERT INTO deliveries (
             delivery_id, kind, incident_id, transition, revision, state,
             attempts, payload_json, created_at, updated_at
           ) VALUES (?, 'heartbeat', NULL, 'heartbeat', 1, 'processing', 8, ?, ?, ?)`,
        )
        .bind("stale-abandoned", makePayload("stale-abandoned"), staleAt, staleAt),
      env.DB
        .prepare(
          `INSERT INTO deliveries (
             delivery_id, kind, incident_id, transition, revision, state,
             attempts, payload_json, created_at, updated_at
           ) VALUES (?, 'heartbeat', NULL, 'heartbeat', 1, 'queued', 3, ?, ?, ?)`,
        )
        .bind("stale-requeued", makePayload("stale-requeued"), staleAt, staleAt),
    ]);
    const send = vi.fn(async () => undefined);
    const fakeEnv = {
      ...env,
      INCIDENT_QUEUE: { send },
    } as unknown as Env;
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);

    await expect(
      enqueuePendingDeliveries(fakeEnv, now),
    ).resolves.toBe(1);

    const rows = await env.DB
      .prepare(
        `SELECT delivery_id, state
         FROM deliveries
         ORDER BY delivery_id`,
      )
      .all<{ delivery_id: string; state: string }>();
    expect(rows.results).toEqual([
      { delivery_id: "stale-abandoned", state: "permanent_failure" },
      { delivery_id: "stale-requeued", state: "queued" },
    ]);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("surfaces recent permanent failures in monitor health", async () => {
    const now = Date.parse("2026-07-24T09:00:00.000Z");
    await env.DB
      .prepare(
        `INSERT INTO deliveries (
           delivery_id, kind, incident_id, transition, revision, state,
           attempts, payload_json, created_at, updated_at
         ) VALUES (
           'failed-webhook', 'heartbeat', NULL, 'heartbeat', 1,
           'permanent_failure', 1, '{}', ?, ?
         )`,
      )
      .bind(now, now)
      .run();

    const snapshot = await getMonitorSnapshot(env.DB, now);
    expect(snapshot.permanentFailureCount).toBe(1);
    expect(snapshot.degradedComponents).toContain(
      "webhook_permanent_failure",
    );
  });

  it("removes old daily latch state during retention", async () => {
    const now = Date.parse("2026-07-24T10:00:00.000Z");
    const old = now - 15 * 86_400_000;
    await env.DB.batch([
      env.DB
        .prepare(
          `INSERT INTO ingestion_state (key, value, updated_at)
           VALUES ('heartbeat_created:2026-07-01', '1', ?)`,
        )
        .bind(old),
      env.DB
        .prepare(
          `INSERT INTO ingestion_state (key, value, updated_at)
           VALUES ('retention_completed:2026-07-01', '1', ?)`,
        )
        .bind(old),
    ]);

    await runDailyRetention(env.DB, now);

    const oldLatches = await env.DB
      .prepare(
        `SELECT COUNT(*) AS count
         FROM ingestion_state
         WHERE key LIKE '%:2026-07-01'`,
      )
      .first<{ count: number }>();
    expect(oldLatches?.count).toBe(0);
  });
});

describe("signed delivery contract", () => {
  it("creates the documented HMAC-SHA256 signature", async () => {
    await expect(
      createWebhookSignature("secret", "1700000000", "{}"),
    ).resolves.toBe(
      "b8569b78799ff9e3cbff0fc2d63a33a2b57f3282abd07c37ae5e8e7d79a5f163",
    );
  });

  it("rejects malformed queue payloads", () => {
    expect(parseObserverQueueMessage({ kind: "incident" })).toBeNull();
    expect(
      parseObserverQueueMessage({
        schemaVersion: 1,
        kind: "heartbeat",
        deliveryId: "heartbeat:2026-07-24",
        dateJst: "2026-07-24",
        observedAt: 123,
        createdAt: 123,
      }),
    ).not.toBeNull();
  });

  it("includes only redacted, bounded original error excerpts", () => {
    const now = Date.parse("2026-07-24T01:00:00.000Z");
    const incident = incidentRecord(now);
    const analysis: IncidentAnalysis = {
      title: "留言接口异常",
      summary: "留言接口连续返回服务器错误。",
      likelyCause: "上游服务异常。",
      confidence: "medium",
      userImpact: "留言可能提交失败。",
      evidence: ["HTTP 500"],
      recommendedChecks: ["检查上游服务"],
      source: "workers_ai",
    };
    const samples: IncidentSample[] = [
      {
        message:
          "UpstreamError owner@example.com Authorization=secret-value",
        route: "https://example.com/api/messages?token=visible",
        status_code: 500,
        outcome: "exception",
        level: "error",
        observed_at: now,
      },
    ];

    const payload = buildObserverWebhookPayload(
      testConfig,
      {
        schemaVersion: 1,
        kind: "incident",
        deliveryId: "site-incident:incident-test:opened:1",
        incidentId: "incident-test",
        transition: "opened",
        revision: 1,
        createdAt: now,
      },
      incident,
      analysis,
      samples,
    );
    const serialized = JSON.stringify(payload);

    expect(serialized).toContain("\"error_samples_redacted\":true");
    expect(serialized).toContain("\"message\":\"UpstreamError");
    expect(serialized).toContain("\"route\":\"/api/messages\"");
    expect(serialized).not.toContain("owner@example.com");
    expect(serialized).not.toContain("secret-value");
    expect(serialized).not.toContain("token=visible");
  });

  it("preserves a bounded, redacted webhook validation error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json(
          {
            detail:
              "Invalid event for owner@example.com token=abcdefghijklmnopqrstuvwxyz0123456789",
          },
          { status: 400 },
        )),
    );

    const result = await sendSignedWebhook(
      {
        ...testConfig,
        deliveryEnabled: true,
        webhookUrl: "https://example.com/webhooks/site-incident",
        webhookSecret: "test-secret",
      },
      "site-monitor:heartbeat:test",
      "{\"schema_version\":1}",
    );

    expect(result.outcome).toBe("permanent_failure");
    if (result.outcome !== "permanent_failure") {
      throw new Error("Expected a permanent webhook failure");
    }
    expect(result.error).toContain("Webhook HTTP 400");
    expect(result.error).toContain("Invalid event");
    expect(result.error).not.toContain("owner@example.com");
    expect(result.error).not.toContain(
      "abcdefghijklmnopqrstuvwxyz0123456789",
    );
  });

  it("sends the exact frozen bytes and records a success excerpt", async () => {
    const rawBody =
      "{\"schema_version\":1,\"delivery_id\":\"site-monitor:heartbeat:test\"}";
    let sentBody: BodyInit | null | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
        sentBody = init?.body;
        return Response.json({ status: "queued" }, { status: 202 });
      }),
    );

    const result = await sendSignedWebhook(
      {
        ...testConfig,
        deliveryEnabled: true,
        webhookUrl: "https://example.com/webhooks/site-incident",
        webhookSecret: "test-secret",
      },
      "site-monitor:heartbeat:test",
      rawBody,
    );

    expect(sentBody).toBe(rawBody);
    expect(result).toMatchObject({
      outcome: "delivered",
      status: 202,
      responseExcerpt: "{\"status\":\"queued\"}",
    });
  });

  it("freezes one outbound body and preserves attempt evidence", async () => {
    const now = Date.parse("2026-07-24T01:00:00.000Z");
    const deliveryId = "site-monitor:heartbeat:2026-07-24:2";
    await env.DB
      .prepare(
        `INSERT INTO deliveries (
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
         ) VALUES (?, 'heartbeat', NULL, 'heartbeat', 2, 'pending', 0, ?, ?, ?)`,
      )
      .bind(
        deliveryId,
        JSON.stringify({
          schemaVersion: 1,
          kind: "heartbeat",
          deliveryId,
          dateJst: "2026-07-24",
          observedAt: now,
          createdAt: now,
        }),
        now,
        now,
      )
      .run();

    const firstBody = `{"schema_version":1,"delivery_id":"${deliveryId}"}`;
    const frozenFirst = await freezeDeliveryWebhookBody(
      env.DB,
      deliveryId,
      firstBody,
      now,
    );
    const frozenSecond = await freezeDeliveryWebhookBody(
      env.DB,
      deliveryId,
      "{\"should_not\":\"replace\"}",
      now + 1,
    );
    expect(frozenFirst).toBe(firstBody);
    expect(frozenSecond).toBe(firstBody);

    await recordDeliveryAttempt(
      env.DB,
      deliveryId,
      1,
      "delivered",
      202,
      "{\"status\":\"queued\"}",
      "a".repeat(64),
      new TextEncoder().encode(firstBody).byteLength,
      now + 2,
    );
    const attempt = await env.DB
      .prepare(
        `SELECT *
         FROM delivery_attempts
         WHERE delivery_id = ? AND attempt_number = 1`,
      )
      .bind(deliveryId)
      .first<{
        http_status: number;
        response_excerpt: string;
        request_body_sha256: string;
      }>();
    expect(attempt).toMatchObject({
      http_status: 202,
      response_excerpt: "{\"status\":\"queued\"}",
      request_body_sha256: "a".repeat(64),
    });
  });
});

describe("AI Gateway routing", () => {
  it("routes Workers AI analysis through the configured gateway", async () => {
    const now = Date.parse("2026-07-24T01:00:00.000Z");
    const calls: unknown[][] = [];
    const fakeEnv = {
      AI: {
        run: async (...args: unknown[]) => {
          calls.push(args);
          return {
            response: JSON.stringify({
              title: "留言接口异常",
              summary: "留言接口连续返回服务器错误。",
              likely_cause: "上游服务异常。",
              confidence: "medium",
              user_impact: "留言可能提交失败。",
              evidence: ["HTTP 500"],
              recommended_checks: ["检查上游服务"],
            }),
          };
        },
      },
    } as unknown as Env;

    const analysis = await analyzeIncident(
      fakeEnv,
      { ...testConfig, aiEnabled: true },
      incidentRecord(now),
      [
        {
          message: "Upstream returned status 500",
          route: "/api/messages",
          status_code: 500,
          outcome: "exception",
          level: "error",
          observed_at: now,
        },
      ],
    );

    expect(analysis.source).toBe("workers_ai");
    expect(calls).toHaveLength(1);
    expect(calls[0]?.[2]).toMatchObject({
      gateway: {
        id: "my-ai-gateway",
        skipCache: true,
        collectLog: true,
      },
      tags: ["site-observer", "incident-analysis", "high"],
    });
  });
});
