import { useEffect, useRef } from "react";
import { useIntl } from "react-intl";
import LoginPanel from "~/components/auth/LoginPanel";

interface LoginDialogProps {
  open: boolean;
  onClose: () => void;
  returnTo?: string;
  previewEnabled?: boolean;
  onPreviewSuccess?: () => void;
}

export default function LoginDialog({ open, onClose, returnTo = "/", previewEnabled = false, onPreviewSuccess }: LoginDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const intl = useIntl();
  const closeLabel = intl.formatMessage({ defaultMessage: "关闭登录弹窗", description: "登录弹窗关闭按钮的无障碍标签" });

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") return;

      const panel = panelRef.current;
      if (!panel) return;

      const focusable = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => !element.hasAttribute("disabled") && element.tabIndex !== -1);

      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const firstElement = focusable[0];
      const lastElement = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-labelledby="login-dialog-title">
      <button
        type="button"
        className="fixed inset-0 cursor-default overflow-hidden bg-primary-950/35 backdrop-blur-md"
        onClick={onClose}
        aria-label={closeLabel}
      >
        <span className="pointer-events-none absolute left-1/2 top-1/2 h-[34rem] w-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/18 blur-3xl" />
        <span className="pointer-events-none absolute right-[10%] top-[12%] h-40 w-40 rounded-full border border-white/10" />
        <span className="pointer-events-none absolute bottom-[14%] left-[8%] h-52 w-52 rounded-full border border-accent/10" />
      </button>

      <div className="fixed inset-0 overflow-y-auto px-4 py-8 sm:px-6">
        <div className="flex min-h-full items-center justify-center">
          <div
            ref={panelRef}
            className="relative w-full max-w-xl animate-[login-dialog-enter_420ms_cubic-bezier(0.16,1,0.3,1)] overflow-hidden rounded-[2rem] border border-white/70 bg-primary-50/92 p-7 shadow-2xl shadow-primary-950/25 backdrop-blur-xl sm:p-9"
          >
            <div className="pointer-events-none absolute inset-3 rounded-[1.55rem] border border-primary-950/8" />
            <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-accent/12 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-12 left-8 h-28 w-28 rounded-full border border-primary-950/8" />
            <div className="pointer-events-none absolute inset-x-8 top-6 flex justify-between text-[0.62rem] uppercase tracking-[0.5em] text-primary-950/12">
              <span>enter</span>
              <span>001</span>
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              className="ui-button-ghost absolute right-5 top-5 z-10 px-3 py-2 text-xs uppercase tracking-[0.18em] text-primary-950/48"
            >
              <span className="sr-only">{closeLabel}</span>
              <span aria-hidden="true">Close</span>
            </button>
            <div className="relative pt-7">
              <LoginPanel compact returnTo={returnTo} previewEnabled={previewEnabled} onPreviewSuccess={onPreviewSuccess} />
            </div>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes login-dialog-enter {
          from {
            opacity: 0;
            transform: translateY(1.25rem) scale(0.96);
            filter: blur(8px);
          }

          to {
            opacity: 1;
            transform: translateY(0) scale(1);
            filter: blur(0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          [role="dialog"] [class*="login-dialog-enter"] {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
