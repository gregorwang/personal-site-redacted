import { useEffect, type ReactNode } from "react";
import { useFetcher, useOutletContext } from "react-router";
import { useLocale } from "~/components/common/LocaleLink";
import { localizePath } from "~/lib/i18n";
import type { loader as messagesLoader } from "~/routes/($lang).messages";
import type { AppOutletContext } from "~/types/remix";
import GuestbookRadio from "./GuestbookRadio.client";

type HomeGuestbookProps = {
  fallback: ReactNode;
};

// 首页留言收音机：滚到附近才挂载，挂载后再向 /messages loader 取留言，
// 首页 HTML 请求本身不碰 D1。提交走 GuestbookRadio 自己的 fetcher，action 后 React Router 会自动重新 load 这里的数据。
export default function HomeGuestbook({ fallback }: HomeGuestbookProps) {
  const { session } = useOutletContext<AppOutletContext>();
  const locale = useLocale();
  const fetcher = useFetcher<typeof messagesLoader>();
  const href = localizePath("/messages", locale);

  useEffect(() => {
    fetcher.load(href);
    // fetcher 对象每次渲染都会变，只在路径变化时重新加载
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [href]);

  if (!fetcher.data) return <>{fallback}</>;

  return (
    <GuestbookRadio
      initialMessages={fetcher.data.messages}
      pendingMessages={fetcher.data.userPendingMessages}
      currentUser={session?.user ?? null}
      limitStatus={fetcher.data.limitStatus}
    />
  );
}
