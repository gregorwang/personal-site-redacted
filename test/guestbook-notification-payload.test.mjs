import assert from "node:assert/strict";
import { after, describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const vite = await createServer({
  root: projectRoot,
  configFile: false,
  appType: "custom",
  logLevel: "error",
  optimizeDeps: {
    noDiscovery: true,
  },
  server: {
    hmr: false,
    middlewareMode: true,
    ws: false,
  },
});

after(async () => {
  await vite.close();
});

const {
  buildGuestbookNotificationPayload,
  GUESTBOOK_NOTIFICATION_EVENT_TYPE,
  GUESTBOOK_NOTIFICATION_HEADING,
} = await vite.ssrLoadModule("/app/lib/guestbook-notification-payload.ts");

describe("guestbook notification payload", () => {
  it("keeps the event type and starts message with the pending-review heading", () => {
    const payload = buildGuestbookNotificationPayload({
      messageId: 42,
      displayName: "测试访客",
      content: "这是一条测试留言。",
      submittedAt: new Date("2026-07-24T00:34:56.000Z"),
    });

    assert.equal(
      payload.event_type,
      GUESTBOOK_NOTIFICATION_EVENT_TYPE,
    );
    assert.equal(payload.event_type, "guestbook.message.created");
    assert.ok(payload.message.startsWith(GUESTBOOK_NOTIFICATION_HEADING));
    assert.ok(
      payload.message.startsWith(
        "【EMT WEB｜GUESTBOOK｜PENDING REVIEW】",
      ),
    );
  });

  it("uses the required single-message structure and Tokyo time", () => {
    const payload = buildGuestbookNotificationPayload({
      messageId: 314,
      displayName: "汪小客",
      content: "第一行\n第二行",
      submittedAt: new Date("2026-07-24T00:34:56.000Z"),
    });

    assert.equal(
      payload.message,
      [
        "【EMT WEB｜GUESTBOOK｜PENDING REVIEW】",
        "",
        "状态：待审核",
        "留言 ID：#314",
        "留言者：汪小客",
        "提交时间：2026-07-24 09:34:56 JST",
        "",
        "留言内容",
        "第一行",
        "第二行",
      ].join("\n"),
    );
  });

  it("falls back to anonymous and never serializes an email display name", () => {
    const missingNamePayload = buildGuestbookNotificationPayload({
      messageId: 1,
      displayName: undefined,
      content: "匿名测试",
      submittedAt: new Date("2026-07-24T00:00:00.000Z"),
    });
    const emailNamePayload = buildGuestbookNotificationPayload({
      messageId: 2,
      displayName: "private@example.com",
      content: "邮箱隐私测试",
      submittedAt: new Date("2026-07-24T00:00:00.000Z"),
    });

    assert.match(missingNamePayload.message, /留言者：匿名访客/);
    assert.doesNotMatch(missingNamePayload.message, /undefined|null/);
    assert.equal(emailNamePayload.username, "匿名访客");
    assert.doesNotMatch(
      JSON.stringify(emailNamePayload),
      /private@example\.com/,
    );
  });

  it("removes control characters, preserves normal line breaks, and truncates", () => {
    const payload = buildGuestbookNotificationPayload({
      messageId: 9,
      displayName: "控\u0000制\t名",
      content: `第一行\r\n第二\t行\u0000\r第三行\n${"长".repeat(520)}`,
      submittedAt: new Date("2026-07-24T00:00:00.000Z"),
    });

    assert.match(payload.message, /留言者：控制名/);
    assert.match(payload.message, /第一行\n第二行\n第三行/);
    assert.equal(payload.message.includes("\u0000"), false);
    assert.equal(payload.message.includes("\t"), false);
    assert.equal(payload.message.includes("\r"), false);
    assert.ok(payload.message.endsWith("…（已截断）"));
  });

  it("does not add incident vocabulary or private request metadata", () => {
    const payload = buildGuestbookNotificationPayload({
      messageId: 7,
      displayName: null,
      content: "普通留言",
      submittedAt: new Date("2026-07-24T00:00:00.000Z"),
    });
    const serialized = JSON.stringify(payload);

    for (const forbidden of ["EMT SRE", "SEV", "FIRING", "ERROR"]) {
      assert.doesNotMatch(payload.message, new RegExp(forbidden));
    }
    for (const privateField of ["ip", "email", "cookie", "user-agent"]) {
      assert.equal(
        Object.keys(payload).some(
          (key) => key.toLowerCase() === privateField,
        ),
        false,
      );
    }
    assert.doesNotMatch(serialized, /User-Agent|Cookie/);
  });
});
