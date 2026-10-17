import { useLocation, useNavigation } from "react-router";
import { useEffect, useState } from "react";
import { disarmRouteReveal } from "./route-reveal";

// 跳转 300ms 内完成就什么都不显示（硬切）；超过才出顶部进度条并把旧页面压暗一点。
const SHOW_AFTER_MS = 300;
const DONE_FADE_MS = 240;
// 圆形展开动画 550ms，结束后再撤掉标记，免得后退时也播圆形。
const REVEAL_CLEANUP_MS = 700;

type Phase = "idle" | "loading" | "done";

/** 全站跳转反馈：慢跳转才出现的顶部细进度条。同模块内和后退是硬切，跨页面跳转是圆形展开。 */
export default function RouteTransition() {
  const location = useLocation();
  const navigation = useNavigation();
  const busy = navigation.state !== "idle";
  const [phase, setPhase] = useState<Phase>("idle");

  useEffect(() => {
    if (busy) {
      const timer = window.setTimeout(() => setPhase("loading"), SHOW_AFTER_MS);
      return () => window.clearTimeout(timer);
    }
    setPhase((current) => (current === "loading" ? "done" : current));
    const timer = window.setTimeout(() => setPhase("idle"), DONE_FADE_MS);
    return () => window.clearTimeout(timer);
  }, [busy]);

  useEffect(() => {
    const timer = window.setTimeout(disarmRouteReveal, REVEAL_CLEANUP_MS);
    return () => window.clearTimeout(timer);
  }, [location.key]);

  if (phase === "idle") return null;

  return (
    <div className="route-progress" data-phase={phase} aria-hidden="true">
      <div className="route-progress__dim" />
      <div className="route-progress__bar" />
      <style>{`
        .route-progress {
          position: fixed;
          inset: 0;
          z-index: 60;
          pointer-events: none;
        }

        .route-progress__dim {
          position: absolute;
          inset: 0;
          background: #f9f9f6;
          opacity: 0;
          animation: route-progress-dim 260ms ease forwards;
        }

        .route-progress__bar {
          position: absolute;
          left: 0;
          top: 0;
          height: 2px;
          width: 100%;
          background: #9a5937;
          transform-origin: left center;
          transform: scaleX(0);
          animation: route-progress-grow 8s cubic-bezier(0.08, 0.82, 0.17, 1) forwards;
        }

        .route-progress[data-phase="done"] .route-progress__dim {
          animation: route-progress-out ${DONE_FADE_MS}ms ease forwards;
          --route-progress-from: 0.35;
        }

        .route-progress[data-phase="done"] .route-progress__bar {
          transform: scaleX(1);
          animation: route-progress-out ${DONE_FADE_MS}ms ease 60ms forwards;
          --route-progress-from: 1;
        }

        @keyframes route-progress-out {
          from { opacity: var(--route-progress-from); }
          to { opacity: 0; }
        }

        @keyframes route-progress-dim {
          to { opacity: 0.35; }
        }

        @keyframes route-progress-grow {
          to { transform: scaleX(0.9); }
        }

        @media (prefers-reduced-motion: reduce) {
          .route-progress__bar {
            animation: none;
            transform: scaleX(0.6);
          }
        }
      `}</style>
    </div>
  );
}
