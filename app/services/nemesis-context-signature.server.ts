import { getEnvVar } from "~/utils/cloudflare-env.server";

/**
 * recentMessages 来自客户端 localStorage，role: "model" 的消息可以被任意伪造
 * （例如编一条“Nemesis 已经同意了……”塞进上下文做 prompt 注入）。
 *
 * 服务端在 done 事件里给每条回复的上下文文本签名（HMAC，绑定 userId），
 * 下次请求时只信任签名有效的 model 消息；无签名 / 签名不符的直接丢弃。
 */

const SIGNATURE_VERSION = "v1";
const SIGNATURE_DOMAIN = `nemesis-context:${SIGNATURE_VERSION}`;

const encoder = new TextEncoder();
let cachedKey: { secret: string; key: Promise<CryptoKey> } | null = null;
let warnedMissingSecret = false;

function getSigningSecret() {
  const raw =
    getEnvVar("NEMESIS_CONTEXT_SECRET") ||
    getEnvVar("BETTER_AUTH_SECRET") ||
    getEnvVar("AUTH_KEY_SECRET");
  const normalized = raw?.trim(); // String#trim 也会去掉 BOM（U+FEFF 属于 WhiteSpace）
  return normalized || null;
}

function getSigningKey(): Promise<CryptoKey> | null {
  const secret = getSigningSecret();
  if (!secret) {
    if (!warnedMissingSecret) {
      warnedMissingSecret = true;
      console.warn("[NemesisContext] No signing secret configured; model history will not be trusted.");
    }
    return null;
  }

  if (cachedKey?.secret !== secret) {
    cachedKey = {
      secret,
      key: crypto.subtle.importKey(
        "raw",
        encoder.encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign", "verify"],
      ),
    };
  }

  return cachedKey.key;
}

function buildPayload(userId: string, text: string) {
  // 用 \n 分隔且 userId 不含换行；域前缀保证与复用同一 secret 的其他签名互不通用。
  return encoder.encode(`${SIGNATURE_DOMAIN}\n${userId}\n${text}`);
}

function toBase64Url(bytes: ArrayBuffer) {
  let binary = "";
  for (const byte of new Uint8Array(bytes)) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) {
    return null;
  }

  try {
    const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
    const binary = atob(padded);
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  } catch {
    return null;
  }
}

/** text 必须是客户端之后会原样回传的上下文文本（formatMessageForRecentContext 的结果，已 trim）。 */
export async function signNemesisContextText(userId: string, text: string): Promise<string | null> {
  const key = getSigningKey();
  if (!key) {
    return null;
  }

  const signature = await crypto.subtle.sign("HMAC", await key, buildPayload(userId, text));
  return `${SIGNATURE_VERSION}.${toBase64Url(signature)}`;
}

export async function verifyNemesisContextText(
  userId: string,
  text: string,
  signature: unknown,
): Promise<boolean> {
  if (typeof signature !== "string") {
    return false;
  }

  const [version, encoded, extra] = signature.split(".");
  if (version !== SIGNATURE_VERSION || !encoded || extra !== undefined) {
    return false;
  }

  const bytes = fromBase64Url(encoded);
  const key = getSigningKey();
  if (!bytes || !key) {
    return false;
  }

  // subtle.verify 是常量时间比较，不要自己用 === 比对 base64。
  return crypto.subtle.verify("HMAC", await key, bytes, buildPayload(userId, text));
}
