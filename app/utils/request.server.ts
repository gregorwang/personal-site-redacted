/**
 * 服务端请求工具函数
 * 用于从 Remix Request 对象中提取客户端信息
 */

/**
 * 获取客户端真实 IP 地址
 *
 * 支持多种部署环境：
 * - Vercel/Netlify: x-forwarded-for
 * - Cloudflare: CF-Connecting-IP
 * - 通用反向代理: x-real-ip
 * - 本地开发: 127.0.0.1
 *
 * @param request - Remix Request 对象
 * @returns 客户端 IP 地址字符串
 */
export function getClientIP(request: Request): string {
  // 优先级 1: CF-Connecting-IP —— 由 Cloudflare 边缘写入，客户端无法伪造。
  // 注意不能先信 x-forwarded-for：XFF 的第一段是客户端自带的，攻击者可用它绕过 IP 限流。
  const cfIP = request.headers.get("cf-connecting-ip");
  if (cfIP) {
    return cfIP.trim();
  }

  // 优先级 2: true-client-ip (Akamai / Cloudflare Enterprise)
  const trueClientIP = request.headers.get("true-client-ip");
  if (trueClientIP) {
    return trueClientIP.trim();
  }

  // 优先级 3: x-real-ip (Nginx 等自建反向代理)
  const realIP = request.headers.get("x-real-ip");
  if (realIP) {
    return realIP.trim();
  }

  // 优先级 4: x-forwarded-for（仅在没有任何可信头时兜底，取第一段）
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  // 降级: 本地开发环境
  return "127.0.0.1";
}

/**
 * 获取客户端 User-Agent
 *
 * @param request - Remix Request 对象
 * @returns User-Agent 字符串
 */
export function getUserAgent(request: Request): string {
  return request.headers.get("user-agent") || "Unknown";
}

/**
 * 检查请求是否来自移动设备
 *
 * @param request - Remix Request 对象
 * @returns 是否为移动设备
 */
export function isMobileDevice(request: Request): boolean {
  const ua = getUserAgent(request).toLowerCase();
  return /mobile|android|iphone|ipad|ipod|blackberry|windows phone/i.test(ua);
}
