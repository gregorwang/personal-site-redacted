import type { LoaderFunctionArgs, MetaFunction, HeadersFunction, LinksFunction } from "react-router";
import { data, redirect } from "react-router";
import { lazy, Suspense } from "react";
import { ClientOnly } from "~/components/common/ClientOnly";
import { forwardLoaderCacheControl } from "~/lib/cache-headers.server";
import { requireNemesisUser } from "~/services/nemesis-auth.server";
import nemesisChatStyles from "~/styles/nemesis-chat.css?url";
import { getMetaIntl, pageMeta } from "~/utils/seo";

// .client 模块在服务端是空导出，直接渲染会 SSR 500；只在浏览器里加载。
const NemesisChatPage = lazy(() => import("~/components/nemesis/chat/NemesisChatPage.client"));

export const meta: MetaFunction = ({ matches }) => pageMeta.chat(getMetaIntl(matches));

export const links: LinksFunction = () => [{ rel: "stylesheet", href: nemesisChatStyles }];

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    await requireNemesisUser(request);
  } catch (error) {
    const url = new URL(request.url);
    if (error instanceof Response && error.status === 401) {
      throw redirect(`/auth?returnTo=${encodeURIComponent(url.pathname + url.search)}`);
    }

    throw error;
  }

  return data(null, {
    headers: {
      "Cache-Control": "private, no-store",
      "Vary": "Accept-Encoding",
    },
  });
}

export const headers: HeadersFunction = forwardLoaderCacheControl;

export default function ChatRoute() {
  const fallback = <div className="nm-root" aria-busy="true" />;

  return (
    <ClientOnly fallback={fallback}>
      {() => (
        <Suspense fallback={fallback}>
          <NemesisChatPage />
        </Suspense>
      )}
    </ClientOnly>
  );
}
