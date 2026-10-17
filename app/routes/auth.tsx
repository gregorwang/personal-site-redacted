import type { LoaderFunctionArgs } from "react-router";
import { data, redirect, useLoaderData } from "react-router";
import { getSessionCached } from "~/lib/auth.server";
import { getSafeReturnTo } from "~/lib/auth-return";
import { FormattedMessage } from "react-intl";
import LoginPanel from "~/components/auth/LoginPanel";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const session = await getSessionCached(request);
  const url = new URL(request.url);
  const returnTo = getSafeReturnTo(url.searchParams.get("returnTo"));

  if (session?.user) {
    return redirect(returnTo);
  }

  return data({ returnTo });
};

export default function AuthPage() {
  const { returnTo } = useLoaderData<typeof loader>();

  return (
    <main className="relative min-h-screen overflow-hidden bg-primary-50 px-5 py-10 text-primary-950 sm:px-8 lg:px-12">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-8rem] top-[-8rem] h-96 w-96 rounded-full bg-accent/10 blur-3xl" />
        <div className="absolute bottom-[-10rem] right-[-6rem] h-[32rem] w-[32rem] rounded-full bg-primary-100 blur-3xl" />
        <div className="absolute left-8 top-8 text-[0.62rem] uppercase tracking-[0.55em] text-primary-950/10">auth / passage</div>
        <div className="absolute inset-x-10 top-1/2 border-t border-primary-950/5" />
        <div className="absolute bottom-10 right-10 text-8xl font-semibold text-primary-950/[0.025]">进入</div>
      </div>

      <div className="relative mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl items-center gap-10 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="max-w-xl">
          <p className="mb-5 text-[0.68rem] font-semibold uppercase tracking-[0.38em] text-accent/80">Private passage</p>
          <h1 className="text-balance text-5xl font-semibold leading-[0.98] tracking-tight sm:text-6xl lg:text-7xl">
            <FormattedMessage
              defaultMessage="不是登录页，<br></br>是进入一座房间。"
              description="独立登录页大标题，<br></br> 是换行位置"
              values={{ br: () => <br /> }}
            />
          </h1>
          <p className="mt-7 max-w-md text-base leading-8 text-primary-950/58">
            <FormattedMessage defaultMessage="这里保留留言和一些还在生长的功能。进入后可以继续完成需要身份确认的操作。" description="独立登录页说明" />
          </p>
          <p className="mt-5 max-w-md text-sm leading-7 text-primary-950/48">
            <FormattedMessage defaultMessage="登录建议优先 Google 或 Microsoft；邮箱登录信可作为备用，步骤会多一些。" description="独立登录页说明" />
          </p>
          <div className="mt-10 flex items-center gap-4 text-xs uppercase tracking-[0.28em] text-primary-950/30">
            <span className="h-px w-16 bg-primary-950/15" />
            <span><FormattedMessage defaultMessage="Google · Microsoft · 邮箱" description="独立登录页登录方式列表" /></span>
          </div>
        </section>

        <section className="relative">
          <div className="absolute -inset-6 rounded-[2.5rem] border border-white/70 bg-white/20 shadow-2xl shadow-primary-950/5 backdrop-blur-sm" />
          <div className="relative overflow-hidden rounded-[2rem] border border-primary-950/10 bg-primary-50/92 p-7 shadow-2xl shadow-primary-950/12 backdrop-blur-xl sm:p-9">
            <div className="pointer-events-none absolute inset-3 rounded-[1.55rem] border border-primary-950/8" />
            <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-accent/10 blur-2xl" />
            <div className="relative">
              <LoginPanel returnTo={returnTo} />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
