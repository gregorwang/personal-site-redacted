import { useEffect, useRef, useState } from "react";
import { FormattedMessage } from "react-intl";

interface LoginSuccessVeilProps {
  active: boolean;
  onDone?: () => void;
  cleanUrl?: boolean;
}

export default function LoginSuccessVeil({ active, onDone, cleanUrl = true }: LoginSuccessVeilProps) {
  const [visible, setVisible] = useState(active);
  const rootRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const markRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (active) setVisible(true);
  }, [active]);

  useEffect(() => {
    if (!visible || !active) return;

    const root = rootRef.current;
    const card = cardRef.current;
    const mark = markRef.current;
    if (!root || !card || !mark) return;

    const finish = () => {
      if (cleanUrl) {
        const url = new URL(window.location.href);
        url.searchParams.delete("login");
        window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
      }

      setVisible(false);
      onDone?.();
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const timer = window.setTimeout(finish, 650);
      return () => window.clearTimeout(timer);
    }

    const authTarget = document.querySelector<HTMLElement>("[data-auth-target='true']");
    const targetRect = authTarget?.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const travel = targetRect
      ? {
          x: targetRect.left + targetRect.width / 2 - (cardRect.left + cardRect.width / 2),
          y: targetRect.top + targetRect.height / 2 - (cardRect.top + cardRect.height / 2),
        }
      : { x: 0, y: -56 };

    let cancelled = false;
    let ctx: { revert: () => void } | null = null;

    void import("gsap").then(({ gsap }) => {
      if (cancelled) return;

      ctx = gsap.context(() => {
        gsap.set(root, { opacity: 0 });
        gsap.set(card, { opacity: 0, y: 14, scale: 0.96, filter: "blur(8px)" });
        gsap.set(mark, { scale: 0.72, opacity: 0 });

        const timeline = gsap.timeline({ onComplete: finish });

        timeline
          .to(root, { opacity: 1, duration: 0.16, ease: "power2.out" })
          .to(card, { opacity: 1, y: 0, scale: 1, filter: "blur(0px)", duration: 0.42, ease: "power3.out" }, 0)
          .to(mark, { opacity: 1, scale: 1, duration: 0.32, ease: "back.out(1.7)" }, 0.08)
          .to(card, { y: -4, duration: 0.24, ease: "power1.inOut" }, 0.55)
          .to(card, {
            x: travel.x,
            y: travel.y,
            scale: targetRect ? 0.32 : 0.94,
            opacity: targetRect ? 0 : 1,
            duration: targetRect ? 0.72 : 0.24,
            ease: "power3.inOut",
          }, 0.78)
          .to(root, { opacity: 0, duration: 0.18, ease: "power2.out" }, targetRect ? 1.32 : 1.0);
      }, root);
    }).catch((error) => {
      console.error("[LoginSuccessVeil] Failed to load GSAP", error);
      finish();
    });

    return () => {
      cancelled = true;
      ctx?.revert();
    };
  }, [active, cleanUrl, onDone, visible]);

  if (!visible) return null;

  return (
    <div ref={rootRef} className="pointer-events-none fixed inset-0 z-[80] flex items-start justify-center px-4 pt-24">
      <div
        ref={cardRef}
        className="flex min-h-14 max-w-[min(28rem,calc(100vw-2rem))] items-center gap-3 rounded-full border border-primary-950/10 bg-white/88 px-4 py-3 shadow-[0_18px_50px_rgba(20,20,19,0.12)] backdrop-blur-xl"
      >
        <div ref={markRef} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/12 text-sm font-semibold text-accent">
          ✓
        </div>
        <div className="min-w-0 pr-1">
          <p className="truncate text-sm font-semibold tracking-[0.08em] text-primary-950">
            <FormattedMessage defaultMessage="欢迎回来" description="登录成功提示标题" />
          </p>
          <p className="mt-0.5 truncate text-xs tracking-[0.04em] text-primary-950/54">
            <FormattedMessage defaultMessage="登录状态已同步" description="登录成功提示副标题" />
          </p>
        </div>
      </div>
    </div>
  );
}
