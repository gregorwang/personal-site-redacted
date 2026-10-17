import { NO_STORE_HEADERS } from "~/lib/cache-headers.server";

export const NEMESIS_SSE_HEADERS = {
  ...NO_STORE_HEADERS,
  "Content-Type": "text/event-stream; charset=utf-8",
  Connection: "keep-alive",
} as const;

/** 上游模型可能沉默几十秒；定期发 SSE 注释行，避免中间代理把空闲连接当死连接掐断。 */
const SSE_HEARTBEAT_INTERVAL_MS = 15_000;
const SSE_HEARTBEAT_CHUNK = ": ping\n\n";

export type NemesisSseEmit = (event: string, data: unknown) => void;

export function formatSseEvent(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

/**
 * handler 收到的 signal 在客户端断开（stream cancel / enqueue 失败）时 abort，
 * 下游必须把它传给上游 fetch，否则用户关掉页面后模型仍会把整段回复生成完并计费。
 */
export function createNemesisSseResponse(
  handler: (emit: NemesisSseEmit, signal: AbortSignal) => Promise<void>,
) {
  const encoder = new TextEncoder();
  const disconnect = new AbortController();
  let heartbeat: ReturnType<typeof setInterval> | undefined;

  const stopHeartbeat = () => {
    if (heartbeat !== undefined) {
      clearInterval(heartbeat);
      heartbeat = undefined;
    }
  };

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      // 客户端可能在生成中途断开；此后 enqueue/close 会抛错，必须吞掉而不是让 Worker 报未处理异常。
      let closed = false;

      const markClosed = () => {
        if (closed) {
          return;
        }

        closed = true;
        stopHeartbeat();
        disconnect.abort(new DOMException("Client disconnected", "AbortError"));
      };

      const write = (chunk: string) => {
        if (closed || disconnect.signal.aborted) {
          return;
        }

        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          markClosed();
        }
      };

      const emit: NemesisSseEmit = (event, data) => {
        write(formatSseEvent(event, data));
      };

      heartbeat = setInterval(() => write(SSE_HEARTBEAT_CHUNK), SSE_HEARTBEAT_INTERVAL_MS);

      try {
        await handler(emit, disconnect.signal);
      } catch (error) {
        console.error("[NemesisSSE] Unhandled stream error:", error);
        emit("error", { message: "Nemesis 暂时无法响应，请稍后再试。" });
      } finally {
        stopHeartbeat();
        if (!closed && !disconnect.signal.aborted) {
          closed = true;
          try {
            controller.close();
          } catch {
            // stream already closed by client disconnect
          }
        }
      }
    },
    cancel(reason) {
      stopHeartbeat();
      disconnect.abort(reason ?? new DOMException("Client disconnected", "AbortError"));
    },
  });

  return new Response(stream, { headers: NEMESIS_SSE_HEADERS });
}
