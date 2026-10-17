请先完整阅读当前项目结构，不要直接大规模改代码。我的目标是给个人网站的图片资源增加“内容哈希文件名 + 长缓存”机制，主要资源都在 Cloudflare R2 / 自定义域名上。

需求如下：

1. 先扫描项目里所有图片引用位置，包括：

   * React / Remix / React Router 页面和组件
   * CSS / Tailwind / inline style 里的 background-image
   * public 目录、本地 assets 目录
   * 已经写死的 R2 图片 URL

2. 不要手动一个个改文件名。请新增一个图片处理脚本，例如：

   * `scripts/process-images.ts`
   * 或更适合当前项目的脚本路径

3. 脚本目标：

   * 从指定原图目录读取图片，例如 `assets/images/raw` 或当前项目已有图片目录
   * 对图片做必要压缩和格式转换，优先输出 webp
   * 根据图片内容计算 hash，例如取 sha256 前 8～12 位
   * 输出文件名格式：`原名.hash.webp`，例如 `emt1.8f3a21c9.webp`
   * 输出到 `public/assets/images` 或用于上传 R2 的临时目录
   * 生成一份 manifest，例如：

     * `app/generated/image-manifest.ts`
     * 或 `src/generated/image-manifest.ts`
     * 或 `public/image-manifest.json`

4. manifest 示例结构可以是：

```ts
export const images = {
  emt1: "https://我的R2自定义域名/emt1.8f3a21c9.webp",
  baiquan: "https://我的R2自定义域名/baiquan.91ab32ef.webp"
} as const
```

5. 页面代码不要继续直接写死：

   * `/emt1.webp`
   * `https://xxx/emt1.webp`
   * `https://xxx/baiquan.jpg`

   而是统一从 manifest 引入，例如：

   * `images.emt1`
   * `images.baiquan`

6. 如果当前项目里图片很多，请优先改首页首屏和 Lighthouse 报告里提示的图片：

   * `/emt1.webp`
   * `/internal-brand-023-3291bb4c.webp`
   * `/baiquan.jpg`
   * `/asset-85923e7....webp`

7. R2 / CDN 缓存策略：

   * 对带 hash 的图片，设置：
     `Cache-Control: public, max-age=31536000, immutable`
   * 对 HTML 不要设置一年缓存，HTML 保持短缓存或 no-cache
   * 不要对没有 hash 的固定图片 URL 直接设置一年缓存，避免用户长期看到旧图

8. 如果项目当前没有自动上传 R2 的能力，请先不要强行实现复杂上传。可以先完成：

   * 本地处理图片
   * 生成 hash 文件名
   * 生成 manifest
   * 给出后续如何上传到 R2，以及上传时应设置的 Cache-Control

9. 请保持改动可回滚：

   * 不要删除原图
   * 不要一次性重构所有图片组件
   * 先做一个最小可用版本
   * 改完后列出被替换的图片引用、生成的文件、需要我手动配置的 R2 / Cloudflare 设置

10. 最后请运行：

* typecheck
* build
* 如果项目有 lint，也运行 lint

完成后请总结：

* 新增了哪些脚本
* manifest 在哪里
* 页面如何引用 hash 图片
* R2 / Cloudflare 缓存应该怎么设置
* 哪些图片还没有迁移
