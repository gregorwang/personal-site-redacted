/** gregorwang R2 公网自定义域 */
export const CDN_BASE = "https://cdn.xn--cckl9nsb.com";

/** 历史首页资源桶公网域（与 gregorwang 分离） */
export const OSS_BASE = "https://oss.xn--cckl9nsb.com";

function encodeObjectKey(key: string): string {
  return key
    .replace(/^\/+/, "")
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

export function cdnUrl(r2Key: string): string {
  return `${CDN_BASE}/${encodeObjectKey(r2Key)}`;
}

export function ossUrl(objectKey: string): string {
  return `${OSS_BASE}/${encodeObjectKey(objectKey)}`;
}
