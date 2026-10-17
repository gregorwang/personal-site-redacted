import { useRef, type ReactNode } from "react";

type GsapGlassCardProps = {
  children: ReactNode;
  className?: string;
};

export function GsapGlassCard({ children, className = "" }: GsapGlassCardProps) {
  const cardRef = useRef<HTMLElement>(null);
  const wipeRef = useRef<HTMLSpanElement>(null);
  const glowRef = useRef<HTMLSpanElement>(null);

  const runHover = (entering: boolean) => {
    const card = cardRef.current;
    const wipe = wipeRef.current;
    const glow = glowRef.current;
    if (!card || !wipe || !glow || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    void import("gsap").then(({ gsap }) => {
      gsap.killTweensOf([card, wipe, glow]);

      if (entering) {
        gsap.set(wipe, { xPercent: -180, opacity: 0 });
        gsap.timeline({ defaults: { ease: "expo.out" } })
          .to(card, {
            borderColor: "rgba(217,119,87,0.28)",
            boxShadow: "0 16px 38px rgba(65,45,35,0.11)",
            duration: 0.34,
          }, 0)
          .to(glow, { opacity: 1, duration: 0.48 }, 0)
          .to(wipe, { xPercent: 230, opacity: 1, duration: 1.05, ease: "sine.inOut" }, 0)
          .to(wipe, { opacity: 0, duration: 0.22 }, 0.86);
        return;
      }

      gsap.to(card, {
        borderColor: "rgba(20,20,19,0.08)",
        boxShadow: "0 8px 24px rgba(65,45,35,0.06)",
        duration: 0.38,
        ease: "expo.out",
      });
      gsap.to(glow, { opacity: 0, duration: 0.3, ease: "expo.out" });
      gsap.to(wipe, { opacity: 0, duration: 0.16, ease: "expo.out" });
    }).catch((error) => {
      console.error("[GsapGlassCard] Failed to load GSAP", error);
    });
  };

  return (
    <article
      ref={cardRef}
      className={`ui-gsap-glass-card ${className}`}
      onPointerEnter={() => runHover(true)}
      onPointerLeave={() => runHover(false)}
    >
      <span ref={glowRef} className="ui-gsap-glass-card__glow" aria-hidden="true" />
      <span ref={wipeRef} className="ui-gsap-glass-card__wipe" aria-hidden="true" />
      {children}
    </article>
  );
}
