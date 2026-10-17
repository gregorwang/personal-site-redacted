import type {
  NemesisProgressStep,
  NemesisSseDoneEvent,
  NemesisSseStatusEvent,
} from "~/types/nemesis-sse";
import type { ChatAttachment } from "~/types/chat";

export const INITIAL_NEMESIS_PROGRESS: NemesisProgressStep[] = [
  { id: "guard", status: "running", label: "正在理解你的问题…" },
  { id: "route", status: "pending", label: "选择模型" },
  { id: "generate", status: "pending", label: "生成回复" },
];

const STEP_ORDER: NemesisProgressStep["id"][] = ["guard", "route", "generate"];

function mapSseStepToProgressId(step: NemesisSseStatusEvent["step"]): NemesisProgressStep["id"] | null {
  if (step === "fallback" || step === "parse") {
    return step === "fallback" ? "generate" : null;
  }

  return step;
}

export function applyStatusToProgress(
  current: NemesisProgressStep[],
  event: NemesisSseStatusEvent
): NemesisProgressStep[] {
  const targetId = mapSseStepToProgressId(event.step);
  if (!targetId) {
    return current;
  }

  const targetIndex = STEP_ORDER.indexOf(targetId);
  const next = current.map((step, index) => {
    if (step.id === targetId) {
      return {
        ...step,
        status: event.state === "running" ? "running" : "done",
        label: event.label || step.label,
        fallback: event.state === "running" && event.step === "fallback",
        detail:
          event.state === "done" && event.modelName
            ? event.modelName
            : event.state === "running" && event.step === "fallback"
              ? event.label
              : step.detail,
      } satisfies NemesisProgressStep;
    }

    if (index < targetIndex) {
      return { ...step, status: "done" as const };
    }

    if (event.state === "running" && index > targetIndex) {
      return { ...step, status: "pending" as const };
    }

    return step;
  });

  return next;
}

type NemesisSseHandlers = {
  onStatus?: (event: NemesisSseStatusEvent, progress: NemesisProgressStep[]) => void;
  onDone?: (event: NemesisSseDoneEvent) => void;
  onError?: (message: string) => void;
};

function parseSseBlock(block: string) {
  let eventName = "message";
  const dataLines: string[] = [];

  for (const line of block.split("\n")) {
    if (line.startsWith("event:")) {
      eventName = line.slice(6).trim();
      continue;
    }

    if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).trim());
    }
  }

  if (dataLines.length === 0) {
    return null;
  }

  try {
    return {
      event: eventName,
      data: JSON.parse(dataLines.join("\n")) as unknown,
    };
  } catch {
    return null;
  }
}

export async function readNemesisSseResponse(response: Response, handlers: NemesisSseHandlers) {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("Nemesis 没有返回可读取的流式响应。");
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let progress = INITIAL_NEMESIS_PROGRESS.map((step) => ({ ...step }));

  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });

    let boundary = buffer.indexOf("\n\n");
    while (boundary !== -1) {
      const block = buffer.slice(0, boundary).trim();
      buffer = buffer.slice(boundary + 2);

      if (block) {
        const parsed = parseSseBlock(block);
        if (parsed) {
          if (parsed.event === "status") {
            const statusEvent = parsed.data as NemesisSseStatusEvent;
            progress = applyStatusToProgress(progress, statusEvent);
            handlers.onStatus?.(statusEvent, progress);
          } else if (parsed.event === "done") {
            handlers.onDone?.(parsed.data as NemesisSseDoneEvent);
          } else if (parsed.event === "error") {
            const payload = parsed.data as { message?: string };
            handlers.onError?.(payload.message || "Nemesis 暂时无法响应，请稍后再试。");
          }
        }
      }

      boundary = buffer.indexOf("\n\n");
    }
  }
}

export type NemesisStreamResult = {
  text: string;
  attachments: ChatAttachment[];
  incomplete: boolean;
  finishReason?: string;
  modelRoute?: string;
  modelProvider?: string;
  modelName?: string;
  fallbackUsed?: boolean;
  contextSignature?: string;
};

export type NemesisStreamCallbacks = {
  onStatus?: (event: NemesisSseStatusEvent, progress: NemesisProgressStep[]) => void;
  /** abort 后服务端 stream 会被 cancel，进而中止上游模型请求，不再继续计费。 */
  signal?: AbortSignal;
};

export async function requestNemesisStream(
  message: string,
  recentMessages: Array<{ role: string; text: string; signature?: string }>,
  callbacks: NemesisStreamCallbacks = {}
): Promise<NemesisStreamResult> {
  const response = await fetch("/api/nemesis", {
    method: "POST",
    signal: callbacks.signal,
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify({
      message,
      recentMessages,
    }),
  });

  const contentType = response.headers.get("Content-Type") ?? "";

  if (!response.ok || !contentType.includes("text/event-stream")) {
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error || "上游模型服务暂时繁忙，稍后重试通常可以恢复。");
  }

  return new Promise<NemesisStreamResult>((resolve, reject) => {
    let settled = false;

    const finish = (handler: () => void) => {
      if (settled) {
        return;
      }

      settled = true;
      handler();
    };

    void readNemesisSseResponse(response, {
      onStatus: (event, progress) => {
        callbacks.onStatus?.(event, progress);
      },
      onDone: (event) => {
        finish(() => {
          const text = event.text?.trim() ?? "";
          const attachments = event.attachments ?? [];

          if (!text && attachments.length === 0) {
            reject(new Error("Nemesis 暂时没有拿到有效回复，稍后重试通常可以恢复。"));
            return;
          }

          resolve({
            text,
            attachments,
            incomplete: Boolean(event.incomplete),
            finishReason: event.finishReason,
            modelRoute: event.modelRoute,
            modelProvider: event.modelProvider,
            modelName: event.modelName,
            fallbackUsed: event.fallbackUsed,
            contextSignature: typeof event.contextSignature === "string" ? event.contextSignature : undefined,
          });
        });
      },
      onError: (message) => {
        finish(() => {
          reject(new Error(message));
        });
      },
    })
      .then(() => {
        finish(() => {
          reject(new Error("Nemesis 流式响应意外结束。"));
        });
      })
      .catch((error) => {
        finish(() => {
          reject(error instanceof Error ? error : new Error("Nemesis 流式响应读取失败。"));
        });
      });
  });
}
