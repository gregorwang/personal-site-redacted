import { useEffect, useRef, useState } from "react";
import { useIntl } from "react-intl";
import { HERO_CONTACT_EMAIL, heroContactMessage, heroMessages } from "~/components/home/hero-messages";

export default function HomeHero() {
  const rootRef = useRef<HTMLElement>(null);
  const [noticeEmphasized, setNoticeEmphasized] = useState(false);
  const intl = useIntl();
  const title = intl.formatMessage(heroMessages.title);
  const lines = [
    intl.formatMessage(heroMessages.intro),
    intl.formatMessage(heroContactMessage, { email: HERO_CONTACT_EMAIL }),
  ];

  useEffect(() => {
    let rafId = 0;

    const updateNoticeTone = () => {
      const root = rootRef.current;
      if (!root) return;

      const rect = root.getBoundingClientRect();
      const threshold = Math.min(220, window.innerHeight * 0.24);
      setNoticeEmphasized(rect.top < -threshold);
    };

    const scheduleUpdate = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(updateNoticeTone);
    };

    scheduleUpdate();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, []);

  return (
    <section id="home" ref={rootRef} className="relative overflow-hidden">
      <div className="flex flex-col items-center justify-center px-4 pb-8 pt-20 text-center md:pb-10 md:pt-24">
        <div className="w-full px-2">
          <div className="hero-manifesto relative mx-auto h-full max-w-6xl overflow-visible px-5 py-7 transition-[padding] duration-600 ease-expo-out md:px-10 md:py-12">
            <div className="hero-text-stage mx-auto max-w-5xl">
              <h1 className="hero-title flex flex-wrap items-center justify-center px-3 py-2 text-center text-4xl font-bold leading-none tracking-tight md:text-6xl lg:text-7xl">
                {title}
              </h1>

              <div className="hero-copy mx-auto mt-7 max-w-3xl space-y-2 px-2 [text-wrap:pretty] [word-break:auto-phrase] text-sm leading-relaxed text-primary-950/70 sm:text-base md:mt-8 md:text-[1.05rem]">
                {lines.map((line) => (
                  <p key={`${intl.locale}-${line}`}>
                    {line}
                  </p>
                ))}
              </div>

              <div className="hero-site-note mx-auto mt-6 max-w-3xl px-3" data-emphasized={noticeEmphasized}>
                <p className="hero-site-note__primary">{intl.formatMessage(heroMessages.notice)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 h-6 w-px bg-primary-950/20" aria-hidden="true" />
      </div>

      <div className="absolute inset-0 mx-auto pointer-events-none bg-gradient-to-br from-primary-50 via-transparent to-primary-100 opacity-30" />
    </section>
  );
}
