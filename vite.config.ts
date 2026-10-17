import { reactRouter } from "@react-router/dev/vite";
import { cloudflareDevProxy } from "@react-router/dev/vite/cloudflare";
import { defineConfig } from "vite";
import formatjs from "@formatjs/unplugin/vite";
import tsconfigPaths from "vite-tsconfig-paths";

type RuntimeGlobal = typeof globalThis & {
  __REMIX_RUNTIME_ENV__?: unknown;
};

export default defineConfig(() => {
  return {
    server: {
      port: 3000,
    },
    build: {
      cssCodeSplit: true,
      rollupOptions: {
        output: {
          manualChunks(id) {
            const normalizedId = id.replace(/\\/g, '/');

            // Keep shared chunks coarse but meaningful; one giant vendor weakens route-level splitting.
            if (normalizedId.includes('node_modules')) {
              if (
                normalizedId.includes('/node_modules/tone/') ||
                normalizedId.includes('/node_modules/standardized-audio-context/')
              ) {
                return 'audio';
              }
              // framer-motion 被 Header 等组件静态引用；gsap 全部走动态 import()。
              // 两者合成一个 chunk 会让 gsap 跟着 framer-motion 被首屏静态加载，懒加载失效。
              if (
                normalizedId.includes('/node_modules/framer-motion/') ||
                normalizedId.includes('/node_modules/motion-dom/') ||
                normalizedId.includes('/node_modules/motion-utils/')
              ) {
                return 'motion';
              }
              if (normalizedId.includes('/node_modules/gsap/')) {
                return 'gsap';
              }
              if (normalizedId.includes('/node_modules/better-auth/')) {
                return 'auth-vendor';
              }
              if (
                normalizedId.includes('/node_modules/react/') ||
                normalizedId.includes('/node_modules/react-dom/') ||
                normalizedId.includes('/node_modules/scheduler/')
              ) {
                return 'react-vendor';
              }
              if (
                normalizedId.includes('/node_modules/react-router/') ||
                normalizedId.includes('/node_modules/@react-router/') ||
                normalizedId.includes('/node_modules/cookie/') ||
                normalizedId.includes('/node_modules/set-cookie-parser/')
              ) {
                return 'router-vendor';
              }
              return 'vendor';
            }

            // 应用代码交给 Rollup 按路由自动拆分：强行把 app/hooks/ 合成一个 chunk
            // 会让首页也加载 useNemesisChat（含 /api/nemesis 与 localStorage 会话逻辑）。
          },
        },
      },
      // 启用预压缩
      minify: 'esbuild',
      target: 'es2018',
    },
    optimizeDeps: {
      // 首屏前一次性预构建完：漏掉的包会在浏览器打开后才被发现，Vite 二次预构建并强刷页面，
      // 新旧 chunk 混用两份 React，表现为 "Cannot read properties of null (reading 'useContext')"。
      // 服务端包也列上：依赖扫描读的是未剥离 .server 导入的路由源码，同样会触发二次预构建。
      include: [
        'react',
        'react-dom',
        'react-dom/client',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
        'react-router',
        'react-router/dom',
        'react-intl',
        'framer-motion',
        'gsap',
        'gsap/ScrollTrigger',
        'tone',
        'better-auth',
        'better-auth/api',
        'better-auth/plugins',
        'better-auth/react',
        'better-auth/client/plugins',
        'isbot',
        'kysely',
        'kysely-d1',
        'resend',
      ],
    },
    plugins: [
      // 代码里只写 defaultMessage 原文，构建时自动注入 6 位内容哈希 ID（与 OpenAI 同款）。
      // 规则必须和 package.json 里 i18n:extract 的 --id-interpolation-pattern 一致。
      formatjs({ idInterpolationPattern: "[sha512:contenthash:base64:6]" }),
      cloudflareDevProxy({
        getLoadContext(args) {
          (globalThis as RuntimeGlobal).__REMIX_RUNTIME_ENV__ = args.context.cloudflare.env;
          return args.context;
        }
      }),
      reactRouter(),
      tsconfigPaths(),
    ],
  };
});
