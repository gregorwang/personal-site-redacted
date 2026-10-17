export const GUESTBOOK_NOTIFICATION_EVENT_TYPE =
  "guestbook.message.created" as const;
export const GUESTBOOK_NOTIFICATION_HEADING =
  "【EMT WEB｜GUESTBOOK｜PENDING REVIEW】" as const;

const ANONYMOUS_VISITOR_NAME = "匿名访客";
const MAX_DISPLAY_NAME_LENGTH = 80;
const MAX_MESSAGE_CONTENT_LENGTH = 500;
const TRUNCATION_MARKER = "…（已截断）";

export type GuestbookNotificationInput = {
  messageId: number;
  displayName?: string | null;
  content: string;
  submittedAt: Date;
};

export type GuestbookNotificationPayload = {
  event_type: typeof GUESTBOOK_NOTIFICATION_EVENT_TYPE;
  message: string;
  message_id: number;
  username: string;
  created_at: string;
};

function normalizeLineEndings(value: string) {
  return value
    .split("\r\n")
    .join("\n")
    .split("\r")
    .join("\n")
    .split("\u2028")
    .join("\n")
    .split("\u2029")
    .join("\n");
}

function removeUnsafeControlCharacters(value: string) {
  let sanitized = "";

  for (const character of normalizeLineEndings(value)) {
    const codePoint = character.codePointAt(0);
    if (codePoint === undefined) {
      continue;
    }

    const isControlCharacter =
      (codePoint >= 0x00 && codePoint <= 0x09) ||
      (codePoint >= 0x0b && codePoint <= 0x1f) ||
      (codePoint >= 0x7f && codePoint <= 0x9f);
    const isBidirectionalControl =
      (codePoint >= 0x202a && codePoint <= 0x202e) ||
      (codePoint >= 0x2066 && codePoint <= 0x2069);

    if (
      isControlCharacter ||
      isBidirectionalControl ||
      codePoint === 0xfeff
    ) {
      continue;
    }

    sanitized += character;
  }

  return sanitized;
}

function truncateByCodePoint(value: string, maxLength: number) {
  const characters = Array.from(value);
  if (characters.length <= maxLength) {
    return value;
  }

  return `${characters.slice(0, maxLength).join("").trimEnd()}${TRUNCATION_MARKER}`;
}

function sanitizeDisplayName(displayName: string | null | undefined) {
  const sanitized = removeUnsafeControlCharacters(displayName ?? "")
    .split("\n")
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  const normalized = sanitized.toLowerCase();

  if (
    !sanitized ||
    normalized === "undefined" ||
    normalized === "null" ||
    sanitized.includes("@")
  ) {
    return ANONYMOUS_VISITOR_NAME;
  }

  return truncateByCodePoint(sanitized, MAX_DISPLAY_NAME_LENGTH);
}

function sanitizeMessageContent(content: string) {
  const sanitized = removeUnsafeControlCharacters(content).trim();
  if (!sanitized) {
    return "（留言内容为空）";
  }

  return truncateByCodePoint(sanitized, MAX_MESSAGE_CONTENT_LENGTH);
}

function formatTokyoDateTime(date: Date) {
  if (Number.isNaN(date.getTime())) {
    throw new RangeError("submittedAt must be a valid Date");
  }

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values: Record<string, string> = {};

  for (const part of parts) {
    values[part.type] = part.value;
  }

  return `${values.year}-${values.month}-${values.day} ${values.hour}:${values.minute}:${values.second} JST`;
}

export function buildGuestbookNotificationPayload(
  input: GuestbookNotificationInput,
): GuestbookNotificationPayload {
  const displayName = sanitizeDisplayName(input.displayName);
  const content = sanitizeMessageContent(input.content);
  const message = [
    GUESTBOOK_NOTIFICATION_HEADING,
    "",
    "状态：待审核",
    `留言 ID：#${input.messageId}`,
    `留言者：${displayName}`,
    `提交时间：${formatTokyoDateTime(input.submittedAt)}`,
    "",
    "留言内容",
    content,
  ].join("\n");

  return {
    event_type: GUESTBOOK_NOTIFICATION_EVENT_TYPE,
    message,
    message_id: input.messageId,
    username: displayName,
    created_at: input.submittedAt.toISOString(),
  };
}
