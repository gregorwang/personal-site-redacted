import type { MetaFunction } from "react-router";
import { lazy, Suspense } from "react";
import { ClientOnly } from "~/components/common/ClientOnly";

// .client 模块在服务端是空导出，直接渲染会 SSR 500；只在浏览器里加载。
const RapidLayersPreview = lazy(() => import("~/components/home/RapidLayersPreview.client"));

export const meta: MetaFunction = () => [
  { title: "Rapid Layers Preview - 汪家俊" },
  { name: "description", content: "Codrops rapid image layers animation preview." },
];

export default function RapidLayersPreviewRoute() {
  return (
    <ClientOnly>
      {() => (
        <Suspense fallback={null}>
          <RapidLayersPreview />
        </Suspense>
      )}
    </ClientOnly>
  );
}
