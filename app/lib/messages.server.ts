import type { IntlShape } from "react-intl";
import { db } from "~/lib/db.server";
import { sendMessageNotificationEmail } from "~/lib/email.server";
import {
  assignRadioFrequency,
  isRadioFrequencyFree,
  normalizeRadioFrequency,
  RADIO_MESSAGE_MAX_LENGTH,
  RADIO_ON_AIR_LIMIT,
} from "~/lib/guestbook-radio";
import { MessageService, RateLimitService } from "~/lib/rate-limit.server";
import { sendMessageNotificationToWeixin } from "~/lib/weixin-notification.server";
import { getClientIP } from "~/utils/request.server";

export const MESSAGE_DAILY_LIMIT = 10;
/** 留言收音机一屏要放得下，按字（码点）算，和前端的 0/140 计数一致 */
export const MESSAGE_CONTENT_MAX_LENGTH = RADIO_MESSAGE_MAX_LENGTH;
/** 首页收音机同时在播的留言数 */
export const MESSAGE_BOARD_LIMIT = RADIO_ON_AIR_LIMIT;

export type MessageStatus = "pending" | "approved" | "rejected";

export type MessageRow = {
  id: number;
  user_id: string;
  username: string;
  content: string;
  status: MessageStatus;
  /** 收音机频率（MHz）；迁移 0010 之前的数据或分配失败时为 null */
  frequency: number | null;
  created_at: string;
  updated_at?: string;
};

export type MessageUser = {
  id: string;
  name?: string | null;
  email?: string | null;
};

export async function getApprovedMessages(cursor?: string | null, limit = MESSAGE_BOARD_LIMIT) {
  const parsedCursor = cursor ? Number.parseInt(cursor, 10) : null;

  // 游标是 id，排序也必须以 id 为准：created_at 只有秒级精度，
  // 同一秒多条留言时按 created_at 排序会让 id 游标漏行或重复。
  if (parsedCursor && Number.isFinite(parsedCursor)) {
    return db.prepare<MessageRow>(`
      SELECT * FROM messages
      WHERE status = 'approved' AND id < ?
      ORDER BY id DESC
      LIMIT ?
    `).all(parsedCursor, limit);
  }

  return db.prepare<MessageRow>(`
    SELECT * FROM messages
    WHERE status = 'approved'
    ORDER BY id DESC
    LIMIT ?
  `).all(limit);
}

export async function getPendingMessagesForUser(userId: string) {
  return db.prepare<MessageRow>(`
    SELECT * FROM messages
    WHERE status = 'pending' AND user_id = ?
    ORDER BY created_at DESC
  `).all(userId);
}

/**
 * 新留言分配频率时要避开的台：正在播的已公开留言，以及所有待审核留言
 * （它们审核通过后也会上台，提前占好位置，避免两台撞在一起）。
 */
async function getTakenRadioFrequencies() {
  const rows = await db.prepare<{ frequency: number }>(`
    SELECT frequency FROM messages
    WHERE frequency IS NOT NULL
      AND (
        status = 'pending'
        OR id IN (SELECT id FROM messages WHERE status = 'approved' ORDER BY id DESC LIMIT ?)
      )
  `).all(MESSAGE_BOARD_LIMIT);
  return rows.map((row) => row.frequency);
}

export async function approveLatestPendingMessage() {
  return db.prepare<MessageRow>(`
    UPDATE messages
    SET status = 'approved', updated_at = datetime('now')
    WHERE id = (
      SELECT id
      FROM messages
      WHERE status = 'pending'
      ORDER BY created_at DESC, id DESC
      LIMIT 1
    )
      AND status = 'pending'
    RETURNING id, user_id, username, content, status, created_at, updated_at
  `).get();
}

/** 精确审批：避免“批最新一条”在新留言并发进来时批错对象。 */
export async function approvePendingMessageById(messageId: number) {
  return db.prepare<MessageRow>(`
    UPDATE messages
    SET status = 'approved', updated_at = datetime('now')
    WHERE id = ? AND status = 'pending'
    RETURNING id, user_id, username, content, status, created_at, updated_at
  `).get(messageId);
}

export async function countPendingMessages() {
  const row = await db.prepare<{ cnt: number }>(`
    SELECT COUNT(*) AS cnt FROM messages WHERE status = 'pending'
  `).get();
  return row?.cnt ?? 0;
}

export async function getMessageLimitStatus(userId: string) {
  const todayCount = await MessageService.getUserTodayCount(userId);

  return {
    dailyLimit: MESSAGE_DAILY_LIMIT,
    todayCount,
    remainingToday: Math.max(0, MESSAGE_DAILY_LIMIT - todayCount),
  };
}

export async function createPendingMessage(
  request: Request,
  user: MessageUser,
  formData: FormData,
  intl: IntlShape,
  executionContext?: ExecutionContext,
) {
  const contentValue = formData.get("content");

  if (typeof contentValue !== "string" || contentValue.trim().length === 0) {
    return {
      ok: false as const,
      status: 400,
      payload: { error: intl.formatMessage({ defaultMessage: "留言内容不能为空", description: "留言提交错误" }) },
    };
  }

  const content = contentValue.trim();

  if ([...content].length > MESSAGE_CONTENT_MAX_LENGTH) {
    return {
      ok: false as const,
      status: 400,
      payload: {
        error: intl.formatMessage(
          { defaultMessage: "留言内容不能超过{max}字", description: "留言提交错误，{max} 是字数上限" },
          { max: MESSAGE_CONTENT_MAX_LENGTH },
        ),
      },
    };
  }

  const clientIP = getClientIP(request);
  console.log("[Message] Submission attempt:", {
    userId: user.id,
    username: user.name || user.email,
    ip: clientIP,
    timestamp: new Date().toISOString(),
  });

  const ipAllowed = await RateLimitService.checkIPRateLimit(clientIP);
  if (!ipAllowed) {
    console.warn("[RateLimit] IP blocked:", { ip: clientIP, userId: user.id });
    return {
      ok: false as const,
      status: 429,
      payload: {
        error: intl.formatMessage({ defaultMessage: "操作过于频繁，请一小时后再试（IP 限制：20次/小时）", description: "留言提交错误：IP 限流" }),
      },
    };
  }

  const userAllowed = await MessageService.checkUserRateLimit(user.id);
  if (!userAllowed) {
    console.warn("[RateLimit] User cooldown active:", { userId: user.id });
    return {
      ok: false as const,
      status: 429,
      payload: { error: intl.formatMessage({ defaultMessage: "请等待 60 秒后再发送下一条留言", description: "留言提交错误：发送冷却" }) },
    };
  }

  const dailyAllowed = await MessageService.consumeDailyLimit(user.id, MESSAGE_DAILY_LIMIT);
  if (!dailyAllowed) {
    const todayCount = await MessageService.getUserTodayCount(user.id);
    console.warn("[RateLimit] Daily limit reached:", { userId: user.id, count: todayCount });
    return {
      ok: false as const,
      status: 429,
      payload: {
        error: intl.formatMessage(
          { defaultMessage: "您今天的留言次数已达上限（{limit}条/天），明天再来吧", description: "留言提交错误：每日上限，{limit} 是每天条数" },
          { limit: MESSAGE_DAILY_LIMIT },
        ),
      },
    };
  }

  const username = user.name || user.email?.split("@")[0] || "User";
  const submittedAt = new Date();

  // 前端会预告「在 FM xx.x 播出」并把这个频率一起提交；它只是建议值，
  // 必须是合法频率槽且没被占用才采用，否则等拿到 id 后由服务端重新分配。
  const takenFrequencies = await getTakenRadioFrequencies();
  const proposedFrequency = normalizeRadioFrequency(formData.get("frequency"));
  let frequency = proposedFrequency !== null && isRadioFrequencyFree(proposedFrequency, takenFrequencies)
    ? proposedFrequency
    : null;

  const result = await db.prepare(`
    INSERT INTO messages (user_id, username, content, status, frequency, created_at)
    VALUES (?, ?, ?, 'pending', ?, datetime('now'))
  `).run(user.id, username, content, frequency);

  const messageId = Number(result.lastInsertRowid);
  if (frequency === null) {
    frequency = assignRadioFrequency(messageId, takenFrequencies);
    if (frequency !== null) {
      await db.prepare(`UPDATE messages SET frequency = ? WHERE id = ?`).run(frequency, messageId);
    }
  }
  const weixinNotificationPromise = sendMessageNotificationToWeixin({
    displayName: user.name,
    content,
    messageId,
    submittedAt,
  }).then((weixinResult) => {
    const logPayload = {
      event: weixinResult.success
        ? "message_notification.weixin_sent"
        : "message_notification.weixin_failed",
      messageId,
      ...(weixinResult.success
        ? { deliveryId: weixinResult.deliveryId }
        : { error: weixinResult.error }),
    };

    if (weixinResult.success) {
      console.log(JSON.stringify(logPayload));
    } else {
      console.error(JSON.stringify(logPayload));
    }
  }).catch((error) => {
    console.error(JSON.stringify({
      event: "message_notification.weixin_failed",
      messageId,
      error: error instanceof Error ? error.message : String(error),
    }));
  });

  const emailNotificationPromise = sendMessageNotificationEmail({
    username,
    userEmail: user.email || null,
    content,
    messageId,
  }).catch((error) => {
    console.error("[Message] Failed to send notification email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }).then((notificationResult) => {
    if (!notificationResult.success) {
      console.error("[Message] Notification email was not sent:", {
        messageId,
        error: notificationResult.error,
      });
    }
  });

  // 通知（微信 + 邮件）都不该阻塞用户的提交响应；只有拿不到 executionContext 时才同步等待。
  const notificationsPromise = Promise.all([weixinNotificationPromise, emailNotificationPromise]);
  if (executionContext) {
    executionContext.waitUntil(notificationsPromise);
  } else {
    await notificationsPromise;
  }

  console.log("[Message] Submission successful:", {
    userId: user.id,
    messageId,
    notificationsDeferred: Boolean(executionContext),
  });

  return {
    ok: true as const,
    status: 200,
    payload: {
      success: intl.formatMessage({ defaultMessage: "留言提交成功，正在等待审核。审核通过后会显示在留言板上。", description: "留言提交成功提示" }),
      message: {
        id: messageId,
        username,
        content,
        status: "pending" as MessageStatus,
        frequency,
      },
    },
  };
}
