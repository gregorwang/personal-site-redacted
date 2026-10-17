import type { ActionFunctionArgs } from "react-router";
import {
  approveLatestPendingMessage,
  approvePendingMessageById,
  countPendingMessages,
} from "~/lib/messages.server";
import { getEnvVar } from "~/utils/cloudflare-env.server";

const RESPONSE_HEADERS = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
};

function methodNotAllowed() {
  return Response.json(
    {
      ok: false,
      error: "METHOD_NOT_ALLOWED",
      message: "Use POST to approve the latest pending message.",
    },
    {
      status: 405,
      headers: {
        ...RESPONSE_HEADERS,
        Allow: "POST",
      },
    },
  );
}

function getAllowedClientIPs() {
  return new Set(
    (getEnvVar("MESSAGE_MODERATION_ALLOWED_IPS") || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
}

function getClientIP(request: Request) {
  return request.headers.get("CF-Connecting-IP")?.trim() || "";
}

export const loader = () => methodNotAllowed();

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return methodNotAllowed();
  }

  const clientIP = getClientIP(request);
  const allowedClientIPs = getAllowedClientIPs();

  if (!clientIP || allowedClientIPs.size === 0 || !allowedClientIPs.has(clientIP)) {
    console.warn(JSON.stringify({
      event: "message_moderation.denied",
      clientIP: clientIP || null,
      rayId: request.headers.get("CF-Ray"),
    }));
    return Response.json(
      {
        ok: false,
        error: "FORBIDDEN",
        message: "This endpoint is restricted to the configured moderation server.",
      },
      { status: 403, headers: RESPONSE_HEADERS },
    );
  }

  // 可选 body: { messageId?: number } —— 指定 id 时做精确审批，
  // 避免“批最新一条”在新留言并发进来时批错对象；完全不带 body 时保持原有行为。
  let requestedMessageId: number | null = null;
  const rawBody = (await request.text()).trim();
  if (rawBody) {
    let body: unknown;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return Response.json(
        {
          ok: false,
          error: "INVALID_JSON",
          message: "Request body must be valid JSON.",
        },
        { status: 400, headers: RESPONSE_HEADERS },
      );
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return Response.json(
        {
          ok: false,
          error: "INVALID_BODY",
          message: "Request body must be a JSON object.",
        },
        { status: 400, headers: RESPONSE_HEADERS },
      );
    }

    const messageId = (body as Record<string, unknown>).messageId;
    if (
      messageId !== undefined &&
      (typeof messageId !== "number" || !Number.isSafeInteger(messageId) || messageId <= 0)
    ) {
      return Response.json(
        {
          ok: false,
          error: "INVALID_MESSAGE_ID",
          message: "messageId must be a positive safe integer.",
        },
        { status: 400, headers: RESPONSE_HEADERS },
      );
    }

    if (typeof messageId === "number") {
      requestedMessageId = messageId;
    }
  }

  try {
    const message = requestedMessageId !== null
      ? await approvePendingMessageById(requestedMessageId)
      : await approveLatestPendingMessage();

    if (!message) {
      return Response.json(
        {
          ok: false,
          error: requestedMessageId !== null ? "MESSAGE_NOT_PENDING" : "NO_PENDING_MESSAGE",
          message: requestedMessageId !== null
            ? `Message #${requestedMessageId} does not exist or is not pending.`
            : "There are no pending messages to approve.",
        },
        { status: 404, headers: RESPONSE_HEADERS },
      );
    }

    const pendingRemaining = await countPendingMessages().catch(() => null);

    console.log(JSON.stringify({
      event: requestedMessageId !== null
        ? "message_moderation.approved_by_id"
        : "message_moderation.approved_latest",
      messageId: message.id,
      requestedMessageId,
      pendingRemaining,
      clientIP,
      rayId: request.headers.get("CF-Ray"),
    }));

    return Response.json(
      {
        ok: true,
        action: requestedMessageId !== null ? "approved_by_id" : "approved_latest_pending",
        pendingRemaining,
        message: {
          id: message.id,
          username: message.username,
          content: message.content,
          status: message.status,
          createdAt: message.created_at,
          updatedAt: message.updated_at ?? null,
        },
      },
      { headers: RESPONSE_HEADERS },
    );
  } catch (error) {
    console.error(JSON.stringify({
      event: "message_moderation.failed",
      error: error instanceof Error ? error.message : String(error),
      clientIP,
      rayId: request.headers.get("CF-Ray"),
    }));
    return Response.json(
      {
        ok: false,
        error: "INTERNAL_ERROR",
        message: "Failed to approve the latest pending message.",
      },
      { status: 500, headers: RESPONSE_HEADERS },
    );
  }
};
