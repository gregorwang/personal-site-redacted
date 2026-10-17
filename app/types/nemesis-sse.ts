import type { ChatAttachment } from "~/types/chat";

export type NemesisSseStep = "guard" | "route" | "generate" | "fallback" | "parse";

export type NemesisSseStepState = "running" | "done";

export type NemesisSseStatusEvent = {
  step: NemesisSseStep;
  state: NemesisSseStepState;
  label: string;
  modelProvider?: string;
  modelName?: string;
  modelRoute?: string;
  fallbackUsed?: boolean;
  hasAttachment?: boolean;
  attempt?: number;
  detail?: string;
  viaGateway?: boolean;
};

export type NemesisSseDoneEvent = {
  text: string;
  attachments?: ChatAttachment[];
  modelRoute?: string;
  modelProvider?: string;
  modelName?: string;
  queryType?: string;
  fallbackUsed?: boolean;
  finishReason?: string;
  incomplete?: boolean;
  /** 服务端对本条回复上下文文本的 HMAC；下一轮随 recentMessages 回传，缺失则该条不进入模型上下文。 */
  contextSignature?: string;
};

export type NemesisSseErrorEvent = {
  message: string;
};

export type NemesisProgressStepId = "guard" | "route" | "generate";

export type NemesisProgressStepStatus = "pending" | "running" | "done";

export type NemesisProgressStep = {
  id: NemesisProgressStepId;
  status: NemesisProgressStepStatus;
  label: string;
  detail?: string;
  /** 主模型失败、正在切换备用模型 */
  fallback?: boolean;
};

export type NemesisModelProgressEvent = NemesisSseStatusEvent;
