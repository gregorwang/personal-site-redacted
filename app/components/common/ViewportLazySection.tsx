import { useEffect, useRef, useState, type ReactNode } from "react";

type ViewportLazySectionProps = {
  children: ReactNode;
  fallback: ReactNode;
  rootMargin?: string;
  className?: string;
};

export default function ViewportLazySection({
  children,
  fallback,
  rootMargin = "520px 0px",
  className,
}: ViewportLazySectionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (shouldRender) return;

    const element = containerRef.current;
    if (!element) return;

    if (!("IntersectionObserver" in window)) {
      setShouldRender(true);
      return;
    }

    // Gate below-the-fold imports so React.lazy does not start every home module on first paint.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setShouldRender(true);
        observer.disconnect();
      },
      { rootMargin },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [rootMargin, shouldRender]);

  return (
    <div ref={containerRef} className={className}>
      {shouldRender ? children : fallback}
    </div>
  );
}
