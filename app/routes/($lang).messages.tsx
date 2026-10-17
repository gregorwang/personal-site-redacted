import { data } from "react-router";
import type { LoaderFunctionArgs, ActionFunctionArgs, MetaFunction, HeadersFunction } from "react-router";
import { getSessionCached, requestHasAuthSessionCookie } from "~/lib/auth.server";
import { forwardLoaderCacheControl } from "~/lib/cache-headers.server";
import { getRouteLocale, getServerIntl } from "~/lib/i18n.server";
import { getMetaIntl, pageMeta } from "~/utils/seo";
import {
  createPendingMessage,
  getApprovedMessages,
  getMessageLimitStatus,
  getPendingMessagesForUser,
  MESSAGE_BOARD_LIMIT,
} from "~/lib/messages.server";

type CloudflareLoadContext = {
  cloudflare?: {
    ctx?: ExecutionContext;
  };
};

export const meta: MetaFunction = ({ matches }) => pageMeta.messages(getMetaIntl(matches));

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  // 匿名请求不进入 session 读取链路；留言列表与 session 并行取，消掉瀑布。
  const [session, approvedMessages] = await Promise.all([
    requestHasAuthSessionCookie(request) ? getSessionCached(request) : Promise.resolve(null),
    getApprovedMessages(url.searchParams.get("cursor"), MESSAGE_BOARD_LIMIT),
  ]);
  const [userPendingMessages, limitStatus] = session?.user
    ? await Promise.all([
        getPendingMessagesForUser(session.user.id),
        getMessageLimitStatus(session.user.id),
      ])
    : [[], null];
  const hasMore = approvedMessages.length === MESSAGE_BOARD_LIMIT;
  const nextCursor = hasMore ? approvedMessages[approvedMessages.length - 1].id : null;

  return data({
    messages: approvedMessages,
    userPendingMessages,
    limitStatus,
    defaultAvatar: "https://oss.xn--cckl9nsb.com/taobao.jfif",
    nextCursor,
    hasMore,
  }, {
    headers: session?.user
      ? { "Cache-Control": "private, no-store" }
      : {
          // Vary: Cookie 防止共享缓存把匿名版响应回给带登录态的请求。
          "Cache-Control": "public, max-age=60, stale-while-revalidate=120",
          Vary: "Cookie",
        },
  });
};

export const headers: HeadersFunction = forwardLoaderCacheControl;

export const action = async ({ request, context, params }: ActionFunctionArgs) => {
  // 收音机按当前语言提交到 /messages、/ja/messages、/en/messages，错误提示跟着页面语言
  const intl = getServerIntl(getRouteLocale(params));
  const session = await getSessionCached(request);

  if (!session?.user) {
    return data({ error: intl.formatMessage({ defaultMessage: "请先登录", description: "留言提交错误：未登录" }) }, { status: 401 });
  }

  try {
    const cloudflare = (context as CloudflareLoadContext).cloudflare;
    const result = await createPendingMessage(
      request,
      session.user,
      await request.formData(),
      intl,
      cloudflare?.ctx,
    );
    return data(result.payload, { status: result.status });
  } catch (error) {
    console.error("[Message] Error creating message:", error);
    return data({ error: intl.formatMessage({ defaultMessage: "提交失败，请稍后重试", description: "留言提交错误：服务端异常" }) }, { status: 500 });
  }
};

