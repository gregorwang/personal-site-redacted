import type { ActionFunctionArgs } from "react-router";
import { JSON_NO_STORE_HEADERS, NO_STORE_HEADERS } from "~/lib/cache-headers.server";
import { createNemesisSseResponse } from "~/lib/nemesis-sse.server";
import { requireNemesisUser } from "~/services/nemesis-auth.server";
import { recordNemesisGuardEvent } from "~/services/nemesis-guard-events.server";
import { guardNemesisMessage, validateNemesisRequest } from "~/services/nemesis-guard.server";
import type { NemesisLeakCheck } from "~/services/nemesis-leak-guard.server";
import { checkNemesisRateLimit } from "~/services/nemesis-rate-limit.server";
import { callNemesisModel, NemesisModelError } from "~/services/nemesis.server";
import { signNemesisContextText } from "~/services/nemesis-context-signature.server";
import { formatMessageForRecentContext } from "~/lib/nemesis-message";
import { finalizeNemesisReply } from "~/services/nemesis-reply.server";
import { NEMESIS_FIXED_REPLIES } from "~/nemesis/guard-replies";
import type { RuntimeEnv } from "~/utils/cloudflare-env.server";

/**
 * 整条链（Guard 分类器 + 路由分类器 + 主模型 + fallback）的总时限。
 * 单个 provider 90s 超时，gemini_flash 依次 fallback 时最坏可达 270s+，必须有总预算兜底。
 */
const NEMESIS_TOTAL_BUDGET_MS = 150_000;

type CloudflareLoadContext = {
  cloudflare?: {
    env?: RuntimeEnv;
    ctx?: ExecutionContext;
  };
};

export async function action({ request, context }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: NO_STORE_HEADERS });
  }

  let user;
  try {
    user = await requireNemesisUser(request);
  } catch (error) {
    if (error instanceof Response) {
      return Response.json({ error: "请先登录后再使用 Nemesis。" }, { status: error.status, headers: NO_STORE_HEADERS });
    }
    throw error;
  }

  const validation = await validateNemesisRequest(request, { userId: user.id });
  if (!validation.ok) {
    return Response.json(validation.payload, { status: validation.status, headers: JSON_NO_STORE_HEADERS });
  }

  const limitResult = await checkNemesisRateLimit(user);
  if (!limitResult.allowed) {
    if (limitResult.reason === "unavailable") {
      return Response.json(
        { error: "Nemesis 暂时无法响应，请稍后再试。" },
        { status: 503, headers: NO_STORE_HEADERS },
      );
    }

    const message =
      limitResult.reason === "minute"
        ? "请求过于频繁，请稍后再试。"
        : "今天的 Nemesis 使用次数已达上限，明天再来吧。";

    return Response.json({ error: message }, { status: 429, headers: NO_STORE_HEADERS });
  }

  const cloudflare = (context as CloudflareLoadContext).cloudflare;

  return createNemesisSseResponse(async (emit, disconnectSignal) => {
    const signal = AbortSignal.any([disconnectSignal, AbortSignal.timeout(NEMESIS_TOTAL_BUDGET_MS)]);

    emit("status", {
      step: "guard",
      state: "running",
      label: "正在理解你的问题…",
    });

    const guard = await guardNemesisMessage(
      cloudflare?.env ?? {},
      validation.message,
      validation.recentMessages,
      signal,
    );

    // 客户端已断开：分类器被 abort 后会走降级分支，这时不该再写一条误导性的审计记录。
    if (disconnectSignal.aborted) {
      return;
    }

    if (process.env.NODE_ENV === "development") {
      console.log("[NemesisGuard]", {
        messageLength: validation.message.length,
        recentMessageCount: validation.recentMessages.length,
        recentRoles: validation.recentMessages.map((item) => item.role),
        policy: guard.policy,
        degraded: guard.degraded,
        category: guard.category,
        stage: guard.stage,
        ruleId: guard.ruleId,
        confidence: guard.classifierConfidence,
        classifierReason: guard.classifierReason,
        route: guard.route.preferredRoute,
        reason: guard.reason,
      });
    }

    // 策略、类别、分类理由都不下发：前端能看到分类结果，就能拿它反复调 prompt 试探边界。
    emit("status", {
      step: "guard",
      state: "done",
      label: "已理解问题",
    });

    const recordAudit = (input: {
      assistantMessage?: string | null;
      modelResult?: {
        provider: string;
        route: string;
        model: string;
        queryType?: string;
        queryRouteConfidence?: number;
        fallbackUsed?: boolean;
        fallbackChain?: string[];
        finishReason?: string;
        incomplete?: boolean;
      };
      leak?: NemesisLeakCheck;
    } = {}) => {
      if (!guard.shouldAudit && !input.leak) {
        return;
      }

      const auditPromise = recordNemesisGuardEvent({
        userId: user.id,
        userEmail: user.email,
        message: validation.message,
        assistantMessage: input.assistantMessage,
        recentMessages: validation.recentMessages,
        decision: guard,
        modelResult: input.modelResult,
        leak: input.leak,
      }).catch((error) => {
        console.error("[NemesisGuardAudit] Failed to record event:", {
          userId: user.id,
          stage: guard.stage,
          policy: guard.policy,
          category: guard.category,
          error,
        });
      });

      cloudflare?.ctx?.waitUntil(auditPromise);
    };

    // 只有硬红线、超长、空输入才不调用主模型；固定文案不签名，不会进入下一轮上下文。
    if (guard.policy === "block") {
      recordAudit({ assistantMessage: guard.fixedReply });
      emit("done", { text: guard.fixedReply });
      return;
    }

    const policy = guard.policy;

    try {
      const result = await callNemesisModel({
        env: cloudflare?.env ?? {},
        message: validation.message,
        recentMessages: validation.recentMessages,
        policy,
        routeDecision: guard.route,
        onProgress: (event) => {
          emit("status", event);
        },
        signal,
      });

      const reply = finalizeNemesisReply(result.text, { policy, userMessage: validation.message });
      // 整段搬运隐藏 prompt / canon 时整条换成固定回复；审计里留原始输出方便排查。
      if (reply.leaked) {
        console.warn("[Nemesis] Reply replaced by output leak check:", {
          userId: user.id,
          route: result.route,
          model: result.model,
          ...reply.leak,
        });
        recordAudit({ assistantMessage: result.text, modelResult: result, leak: reply.leak });
        emit("done", {
          text: NEMESIS_FIXED_REPLIES.leak,
          modelRoute: result.route,
          modelProvider: result.provider,
          modelName: result.model,
        });
        return;
      }

      const { text, attachments } = reply;
      // 签的是客户端下一轮会原样回传的上下文文本（见 buildRecentMessagesForApi）。
      const contextSignature = result.incomplete
        ? null
        : await signNemesisContextText(user.id, formatMessageForRecentContext(text, attachments).trim());

      recordAudit({ assistantMessage: text, modelResult: result });

      emit("done", {
        text,
        attachments,
        contextSignature: contextSignature ?? undefined,
        modelRoute: result.route,
        modelProvider: result.provider,
        modelName: result.model,
        queryType: result.queryType,
        fallbackUsed: result.fallbackUsed,
        finishReason: result.finishReason,
        incomplete: result.incomplete,
      });
    } catch (error) {
      if (disconnectSignal.aborted) {
        return;
      }

      recordAudit();
      if (error instanceof NemesisModelError) {
        emit("error", { message: error.message });
        return;
      }

      console.error("[Nemesis] Unexpected API error:", error);
      emit("error", { message: "Nemesis 暂时无法响应，请稍后再试。" });
    }
  });
}

export async function loader() {
  return Response.json(
    {
      message: "Nemesis API",
      method: "POST",
    },
    { headers: JSON_NO_STORE_HEADERS }
  );
}
