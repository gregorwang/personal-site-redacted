import { Link, type LinkProps } from "~/components/common/LocaleLink";
import { useRef, type ButtonHTMLAttributes, type PointerEvent, type ReactNode } from "react";

type GsapFillLinkProps = LinkProps & {
  children: ReactNode;
};

type GsapFillButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
};

function getDirection(event: PointerEvent<HTMLElement>) {
  const rect = event.currentTarget.getBoundingClientRect();
  const x = event.clientX - rect.left - rect.width / 2;
  const y = event.clientY - rect.top - rect.height / 2;
  const fromHorizontal = Math.abs(x / rect.width) > Math.abs(y / rect.height);

  if (fromHorizontal) {
    return x < 0 ? "left" : "right";
  }

  return y < 0 ? "top" : "bottom";
}

const originMap = {
  left: "left center",
  right: "right center",
  top: "center top",
  bottom: "center bottom",
} as const;

const scalePropMap = {
  left: "scaleX",
  right: "scaleX",
  top: "scaleY",
  bottom: "scaleY",
} as const;

type MagneticElement = HTMLAnchorElement | HTMLButtonElement;
type QuickSetter = (value: number) => void;

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function useMagneticTarget<T extends MagneticElement>() {
  const rootRef = useRef<T>(null);
  const contentRef = useRef<HTMLSpanElement>(null);
  const quickSettersRef = useRef<{
    rootX: QuickSetter;
    rootY: QuickSetter;
    contentX: QuickSetter;
    contentY: QuickSetter;
  }>();

  const setupMagnet = (element: T, content: HTMLSpanElement) => {
    if (quickSettersRef.current) return;

    void import("gsap").then(({ gsap }) => {
      quickSettersRef.current = {
        rootX: gsap.quickTo(element, "x", { duration: 0.42, ease: "expo.out" }),
        rootY: gsap.quickTo(element, "y", { duration: 0.42, ease: "expo.out" }),
        contentX: gsap.quickTo(content, "x", { duration: 0.36, ease: "expo.out" }),
        contentY: gsap.quickTo(content, "y", { duration: 0.36, ease: "expo.out" }),
      };
    }).catch((error) => {
      console.error("[GsapFillLink] Failed to load GSAP magnet", error);
    });
  };

  const updateMagnet = (event: PointerEvent<T>) => {
    if (event.pointerType === "touch" || prefersReducedMotion()) return;

    const root = rootRef.current;
    const content = contentRef.current;
    if (!root || !content) return;

    setupMagnet(root, content);

    const rect = root.getBoundingClientRect();
    const dx = event.clientX - rect.left - rect.width / 2;
    const dy = event.clientY - rect.top - rect.height / 2;
    const rootX = Math.max(-8, Math.min(8, dx * 0.14));
    const rootY = Math.max(-6, Math.min(6, dy * 0.16));
    const contentX = Math.max(-5, Math.min(5, dx * 0.08));
    const contentY = Math.max(-4, Math.min(4, dy * 0.1));
    const setters = quickSettersRef.current;

    if (setters) {
      setters.rootX(rootX);
      setters.rootY(rootY);
      setters.contentX(contentX);
      setters.contentY(contentY);
    }
  };

  const resetMagnet = () => {
    const root = rootRef.current;
    const content = contentRef.current;
    if (!root || !content) return;

    const setters = quickSettersRef.current;
    if (setters) {
      setters.rootX(0);
      setters.rootY(0);
      setters.contentX(0);
      setters.contentY(0);
      return;
    }

    void import("gsap").then(({ gsap }) => {
      gsap.to([root, content], {
        x: 0,
        y: 0,
        duration: 0.42,
        ease: "expo.out",
      });
    }).catch((error) => {
      console.error("[GsapFillLink] Failed to reset magnet", error);
    });
  };

  return { rootRef, contentRef, updateMagnet, resetMagnet };
}

export function GsapFillLink({ children, className = "", onPointerEnter, onPointerLeave, onPointerMove, ...props }: GsapFillLinkProps) {
  const { rootRef, contentRef, updateMagnet, resetMagnet } = useMagneticTarget<HTMLAnchorElement>();
  const fillRef = useRef<HTMLSpanElement>(null);

  const animateFill = (event: PointerEvent<HTMLAnchorElement>, entering: boolean) => {
    const fill = fillRef.current;
    if (!fill || prefersReducedMotion()) return;

    const direction = getDirection(event);
    const scaleProp = scalePropMap[direction];

    void import("gsap").then(({ gsap }) => {
      gsap.killTweensOf(fill);
      gsap.set(fill, {
        scaleX: scaleProp === "scaleX" && entering ? 0 : scaleProp === "scaleX" ? 1 : 1,
        scaleY: scaleProp === "scaleY" && entering ? 0 : scaleProp === "scaleY" ? 1 : 1,
        transformOrigin: originMap[direction],
      });
      gsap.to(fill, {
        [scaleProp]: entering ? 1 : 0,
        duration: entering ? 0.62 : 0.42,
        ease: "expo.out",
      });
    }).catch((error) => {
      console.error("[GsapFillLink] Failed to load GSAP", error);
    });
  };

  return (
    <Link
      {...props}
      ref={rootRef}
      className={`ui-gsap-fill-link ${className}`}
      onPointerEnter={(event) => {
        updateMagnet(event);
        animateFill(event, true);
        onPointerEnter?.(event);
      }}
      onPointerMove={(event) => {
        updateMagnet(event);
        onPointerMove?.(event);
      }}
      onPointerLeave={(event) => {
        animateFill(event, false);
        resetMagnet();
        onPointerLeave?.(event);
      }}
    >
      <span ref={fillRef} className="ui-gsap-fill-link__fill" aria-hidden="true" />
      <span ref={contentRef} className="ui-gsap-fill-link__content">{children}</span>
    </Link>
  );
}

export function GsapFillButton({ children, className = "", onPointerEnter, onPointerLeave, onPointerMove, disabled, ...props }: GsapFillButtonProps) {
  const { rootRef, contentRef, updateMagnet, resetMagnet } = useMagneticTarget<HTMLButtonElement>();
  const fillRef = useRef<HTMLSpanElement>(null);

  const animateFill = (event: PointerEvent<HTMLButtonElement>, entering: boolean) => {
    const fill = fillRef.current;
    if (!fill || disabled || prefersReducedMotion()) return;

    const direction = getDirection(event);
    const scaleProp = scalePropMap[direction];

    void import("gsap").then(({ gsap }) => {
      gsap.killTweensOf(fill);
      gsap.set(fill, {
        scaleX: scaleProp === "scaleX" && entering ? 0 : scaleProp === "scaleX" ? 1 : 1,
        scaleY: scaleProp === "scaleY" && entering ? 0 : scaleProp === "scaleY" ? 1 : 1,
        transformOrigin: originMap[direction],
      });
      gsap.to(fill, {
        [scaleProp]: entering ? 1 : 0,
        duration: entering ? 0.62 : 0.42,
        ease: "expo.out",
      });
    }).catch((error) => {
      console.error("[GsapFillButton] Failed to load GSAP", error);
    });
  };

  return (
    <button
      {...props}
      ref={rootRef}
      disabled={disabled}
      className={`ui-gsap-fill-link ${className}`}
      onPointerEnter={(event) => {
        if (!disabled) updateMagnet(event);
        animateFill(event, true);
        onPointerEnter?.(event);
      }}
      onPointerMove={(event) => {
        if (!disabled) updateMagnet(event);
        onPointerMove?.(event);
      }}
      onPointerLeave={(event) => {
        animateFill(event, false);
        resetMagnet();
        onPointerLeave?.(event);
      }}
    >
      <span ref={fillRef} className="ui-gsap-fill-link__fill" aria-hidden="true" />
      <span ref={contentRef} className="ui-gsap-fill-link__content">{children}</span>
    </button>
  );
}
