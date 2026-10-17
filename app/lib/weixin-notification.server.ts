import { getEnvVar } from "~/utils/cloudflare-env.server";
import { buildGuestbookNotificationPayload } from "~/lib/guestbook-notification-payload";

const WEBHOOK_TIMEOUT_MS = 8_000;

type MessageNotificationInput = {
  messageId: number;
  displayName?: string | null;
  content: string;
  submittedAt?: Date;
};

type MessageNotificationResult =
  | { success: true; deliveryId?: string }
  | { success: false; error: string };

function cleanEnvValue(value: string | undefined) {
  return value?.replace(/^\uFEFF/, "").trim();
}

function bytesToHex(value: ArrayBuffer) {
  return Array.from(new Uint8Array(value))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function createWebhookSignature(
  body: string,
  timestamp: string,
  secret: string,
) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`${timestamp}.${body}`),
  );
  return bytesToHex(signature);
}

export async function sendMessageNotificationToWeixin(
  input: MessageNotificationInput,
): Promise<MessageNotificationResult> {
  const webhookUrlValue = cleanEnvValue(
    getEnvVar("MESSAGE_NOTIFICATION_WEBHOOK_URL"),
  );
  const webhookSecret = cleanEnvValue(
    getEnvVar("MESSAGE_NOTIFICATION_WEBHOOK_SECRET"),
  );

  if (!webhookUrlValue || !webhookSecret) {
    return {
      success: false,
      error: "Weixin message notification webhook is not configured",
    };
  }

  let webhookUrl: URL;
  try {
    webhookUrl = new URL(webhookUrlValue);
  } catch {
    return {
      success: false,
      error: "Weixin message notification webhook URL is invalid",
    };
  }

  if (webhookUrl.protocol !== "https:") {
    return {
      success: false,
      error: "Weixin message notification webhook must use HTTPS",
    };
  }

  const deliveryId = `guestbook-message-${input.messageId}`;
  const timestamp = Math.floor(Date.now() / 1_000).toString();
  const body = JSON.stringify(buildGuestbookNotificationPayload({
    messageId: input.messageId,
    displayName: input.displayName,
    content: input.content,
    submittedAt: input.submittedAt ?? new Date(),
  }));
  const signature = await createWebhookSignature(
    body,
    timestamp,
    webhookSecret,
  );

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Request-ID": deliveryId,
        "X-Webhook-Signature-V2": signature,
        "X-Webhook-Timestamp": timestamp,
      },
      body,
      signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
    });

    if (!response.ok) {
      const responseText = (await response.text()).slice(0, 512);
      return {
        success: false,
        error: `Weixin notification webhook returned ${response.status}: ${responseText}`,
      };
    }

    return { success: true, deliveryId };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
