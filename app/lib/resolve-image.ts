import { imageWidths, images, r2KeyIndex, type ImageManifestKey } from "~/generated/image-manifest";
import { cdnUrl, ossUrl } from "~/lib/media-cdn";

export function resolveImage(key: ImageManifestKey): string {
  return images[key] ?? "";
}

/**
 * 管线生成过缩小版的图片返回 srcset（如 `….w320.webp 320w, …, ….webp 3072w`），否则 undefined。
 * 必须同时给 <img> 写 sizes，浏览器才知道该挑哪一档。
 */
export function imageSrcSet(src: string): string | undefined {
  const widths = imageWidths[src];
  if (!widths) return undefined;
  const original = widths[widths.length - 1];
  return widths
    .map((width) => (width === original ? `${src} ${width}w` : `${src.replace(/\.webp$/, `.w${width}.webp`)} ${width}w`))
    .join(", ");
}

/** gregorwang 对象：优先 manifest 中的 hash URL，否则 CDN 直链 */
export function resolveR2Image(r2Key: string): string {
  const normalized = r2Key.replace(/^\/+/, "");
  const manifestKey = r2KeyIndex[normalized];
  if (manifestKey && images[manifestKey]) {
    return images[manifestKey];
  }
  return cdnUrl(normalized);
}

/** oss 首页等资源：manifest 未生成时回退 oss 直链 */
export function resolveOssAsset(manifestKey: ImageManifestKey, objectKey: string): string {
  return resolveImage(manifestKey) || resolveOssImage(objectKey);
}

/** oss 桶对象：优先 manifest，否则 oss 直链 */
export function resolveOssImage(objectKey: string): string {
  const normalized = objectKey.replace(/^\/+/, "");
  const manifestKey = r2KeyIndex[normalized];
  if (manifestKey && images[manifestKey]) {
    return images[manifestKey];
  }
  return ossUrl(normalized);
}
