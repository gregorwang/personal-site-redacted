/**
 * 单次上游请求的超时 + 整条请求链的取消信号（客户端断开 / 总时限）合并成一个 signal。
 * 只传 timeout 会让客户端断开后上游请求继续跑满，白白消耗模型额度。
 */
export function withTimeoutSignal(timeoutMs: number, parent?: AbortSignal): AbortSignal {
  const timeout = AbortSignal.timeout(timeoutMs);
  return parent ? AbortSignal.any([timeout, parent]) : timeout;
}
