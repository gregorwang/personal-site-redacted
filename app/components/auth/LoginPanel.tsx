import { useEffect, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { useLocale } from "~/components/common/LocaleLink";
import { DEFAULT_LOCALE } from "~/lib/i18n";
import { withLoginSuccessMarker } from "~/lib/auth-return";
import { GsapFillButton } from "~/components/ui/GsapFillLink";

let authClientPromise: Promise<typeof import("~/lib/auth-client.client")> | null = null;

const getAuthClient = async () => {
  authClientPromise ??= import("~/lib/auth-client.client");
  const { authClient } = await authClientPromise;
  return authClient;
};

interface LoginPanelProps {
  compact?: boolean;
  returnTo?: string;
  previewEnabled?: boolean;
  onPreviewSuccess?: () => void;
}

export default function LoginPanel({ compact = false, returnTo = "/", previewEnabled = false, onPreviewSuccess }: LoginPanelProps) {
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [socialSubmitting, setSocialSubmitting] = useState<"google" | "microsoft" | null>(null);
  const [countdown, setCountdown] = useState(0);
  const callbackURL = withLoginSuccessMarker(returnTo);
  const intl = useIntl();
  const locale = useLocale();
  const enteringLabel = intl.formatMessage({ defaultMessage: "正在进入...", description: "登录面板：第三方登录跳转中" });
  const sendFailedMessage = intl.formatMessage({ defaultMessage: "发送邮件失败，请稍后重试", description: "登录面板：登录邮件发送失败" });

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleSocialSignIn = async (provider: "google" | "microsoft") => {
    setError("");
    setSocialSubmitting(provider);

    try {
      const authClient = await getAuthClient();
      await authClient.signIn.social({
        provider,
        callbackURL,
      });
    } catch (err) {
      console.error(`${provider} sign-in error:`, err);
      setError(
        intl.formatMessage(
          { defaultMessage: "{provider} 登录失败，请稍后重试", description: "登录面板：第三方登录失败，{provider} 是 Google 或 Microsoft" },
          { provider: provider === "google" ? "Google" : "Microsoft" },
        ),
      );
      setSocialSubmitting(null);
    }
  };

  const handleMagicLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const authClient = await getAuthClient();
      const result = await authClient.signIn.magicLink({
        email,
        callbackURL,
      });

      const resultError = (result as { error?: unknown }).error;
      if (resultError) {
        const errorMsg = extractErrorMessage(resultError);
        // 服务端限流文案是固定中文格式（auth.server.ts 的 buildMagicLinkRateLimitMessage），只解析出秒数，提示按当前语言渲染
        const cooldownMatch = errorMsg?.match(/请等待 (\d+) 秒/);

        if (cooldownMatch) {
          setCountdown(parseInt(cooldownMatch[1]));
          setError(errorMsg ?? "");
        } else {
          console.error("Magic link error:", resultError);
          // 其它服务端错误是中文原文，非中文页面换成通用提示
          setError(errorMsg && locale === DEFAULT_LOCALE ? errorMsg : sendFailedMessage);
        }
      } else {
        setEmailSent(true);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error("Magic link error:", err);
      setError(errorMessage && locale === DEFAULT_LOCALE ? errorMessage : sendFailedMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (emailSent) {
    return (
      <div className={`relative text-center ${compact ? "py-7" : "py-10"}`}>
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full border border-accent/10" />
        <div className="relative mx-auto mb-6 flex h-20 w-28 rotate-[-3deg] items-center justify-center rounded-[1.4rem] border border-accent/25 bg-primary-100 shadow-xl shadow-primary-950/10">
          <div className="absolute inset-x-4 top-1/2 border-t border-accent/25" />
          <svg className="relative h-8 w-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.7}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>
        <p className="mb-3 text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-accent/80">Letter dispatched</p>
        <h3 className="mb-3 text-3xl font-semibold tracking-tight text-primary-950">
          <FormattedMessage defaultMessage="一封入口信已寄出" description="登录面板：登录邮件已发送的标题" />
        </h3>
        <p className="mx-auto mb-6 max-w-sm text-sm leading-7 text-primary-950/60">
          <FormattedMessage
            defaultMessage="请检查 <email>{address}</email> 的收件箱，邮件里的链接会把你带回刚才的位置。"
            description="登录面板：登录邮件已发送的说明，{address} 是用户填的邮箱"
            values={{ address: email, email: (chunks) => <span className="font-medium text-accent">{chunks}</span> }}
          />
        </p>
        <button
          type="button"
          onClick={() => {
            setEmailSent(false);
            setEmail("");
            setError("");
          }}
          className="ui-button-ghost px-4 py-2 text-sm"
        >
          <FormattedMessage defaultMessage="重新填写邮箱" description="登录面板：发送后重新填写邮箱的按钮" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className={`relative ${compact ? "mb-7" : "mb-9"}`}>
        <div className="mb-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-primary-950/10" />
          <span className="text-[0.68rem] font-semibold uppercase tracking-[0.32em] text-accent/80">Private passage</span>
          <span className="h-px flex-1 bg-primary-950/10" />
        </div>
        <h2 className="text-balance text-center text-4xl font-semibold leading-tight tracking-tight text-primary-950 sm:text-5xl">
          <FormattedMessage defaultMessage="继续进入这片空间" description="登录面板标题" />
        </h2>
        <p className="mx-auto mt-4 max-w-md text-center text-sm leading-7 text-primary-950/58">
          <FormattedMessage defaultMessage="推荐优先使用 Google 或 Microsoft，一键登录最顺畅。国内若按钮打不开或一直转圈，可先开启代理后再试。" description="登录面板说明" />
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <GsapFillButton
          onClick={() => handleSocialSignIn("google")}
          type="button"
          disabled={Boolean(socialSubmitting) || isSubmitting}
          className="ui-button-primary min-h-14 w-full px-4 py-4 text-sm disabled:cursor-not-allowed disabled:opacity-60"
        >
          <svg className="relative h-5 w-5 rounded-full bg-white p-0.5" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          <span className="relative">{socialSubmitting === "google" ? enteringLabel : "Google"}</span>
        </GsapFillButton>

        <GsapFillButton
          onClick={() => handleSocialSignIn("microsoft")}
          type="button"
          disabled={Boolean(socialSubmitting) || isSubmitting}
          className="ui-button-primary min-h-14 w-full px-4 py-4 text-sm disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="grid h-5 w-5 grid-cols-2 gap-0.5" aria-hidden="true">
            <span className="bg-[#f25022]" />
            <span className="bg-[#7fba00]" />
            <span className="bg-[#00a4ef]" />
            <span className="bg-[#ffb900]" />
          </span>
          <span className="relative">{socialSubmitting === "microsoft" ? enteringLabel : "Microsoft"}</span>
        </GsapFillButton>
      </div>

      <p className="mt-3 text-center text-xs leading-5 text-primary-950/42">
        <FormattedMessage defaultMessage="管理员走同一入口，登录后自动识别权限。" description="登录面板：第三方登录按钮下方说明" />
      </p>

      <div className="my-6 flex items-center gap-3 text-[0.68rem] uppercase tracking-[0.26em] text-primary-950/35">
        <span className="h-px flex-1 bg-primary-950/10" />
        <span><FormattedMessage defaultMessage="备用 · 邮箱登录" description="登录面板：邮箱登录分隔线" /></span>
        <span className="h-px flex-1 bg-primary-950/10" />
      </div>

      <p className="mb-4 text-center text-xs leading-5 text-primary-950/48">
        <FormattedMessage defaultMessage="填邮箱、等邮件、再点链接，比上方多几步。没有 Google / Microsoft 账号时再用。" description="登录面板：邮箱登录说明" />
      </p>

      <form onSubmit={handleMagicLinkSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-2 block text-sm font-medium text-primary-950/70">
            <FormattedMessage defaultMessage="邮箱地址" description="登录面板：邮箱输入框标签" />
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            disabled={isSubmitting || Boolean(socialSubmitting) || countdown > 0}
            className="w-full rounded-2xl border border-primary-950/10 bg-primary-50/80 px-4 py-3.5 text-primary-950 outline-none transition-[border-color,background-color,box-shadow,opacity] duration-300 ease-expo-out placeholder:text-primary-950/30 focus:border-accent/40 focus:bg-white/70 focus:ring-4 focus:ring-accent/10 disabled:cursor-not-allowed disabled:opacity-60"
          />
        </div>

        {error && (
          <div className={`rounded-2xl border px-4 py-3 ${countdown > 0 ? "border-amber-200 bg-amber-50/90" : "border-red-200 bg-red-50/90"}`}>
            <p className={`text-sm leading-6 ${countdown > 0 ? "text-amber-700" : "text-red-600"}`}>
              {countdown > 0 ? (
                <span>
                  <FormattedMessage
                    defaultMessage="请稍候，<b>{seconds}</b> 秒后可以重新发送"
                    description="登录面板：登录邮件发送冷却倒计时，{seconds} 是剩余秒数"
                    values={{ seconds: countdown, b: (chunks) => <span className="font-semibold">{chunks}</span> }}
                  />
                </span>
              ) : (
                error
              )}
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting || Boolean(socialSubmitting) || !email.trim() || countdown > 0}
          className="ui-button-secondary w-full px-4 py-3.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting
            ? intl.formatMessage({ defaultMessage: "正在寄出...", description: "登录面板：登录邮件发送中" })
            : countdown > 0
              ? intl.formatMessage(
                  { defaultMessage: "{seconds} 秒后可重新发送", description: "登录面板：冷却中的发送按钮，{seconds} 是剩余秒数" },
                  { seconds: countdown },
                )
              : intl.formatMessage({ defaultMessage: "寄出登录信", description: "登录面板：发送登录邮件按钮" })}
        </button>
      </form>

      {previewEnabled && onPreviewSuccess && (
        <button
          type="button"
          onClick={onPreviewSuccess}
          className="ui-button-ghost mt-4 w-full border-dashed px-4 py-3 text-xs uppercase tracking-[0.2em]"
        >
          Preview entrance motion
        </button>
      )}

      <p className="mt-6 text-center text-xs leading-5 text-primary-950/38">
        <FormattedMessage defaultMessage="登录即表示你同意服务条款和隐私政策。" description="登录面板底部声明" />
      </p>
    </div>
  );
}

const extractErrorMessage = (errorValue: unknown): string | undefined => {
  if (typeof errorValue === "string") return errorValue || undefined;
  if (typeof errorValue === "object" && errorValue !== null) {
    const maybeError = errorValue as { message?: string; error?: { message?: string } };
    return maybeError.message || maybeError.error?.message || undefined;
  }
  return undefined;
};
