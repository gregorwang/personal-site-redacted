import { useRef, useState, type ReactNode, type RefObject } from "react";

type StageWindowProps = {
  stageRef: RefObject<HTMLDivElement>;
  title: string;
  width: number;
  height: number;
  /** 初始中心点位置（占舞台的百分比） */
  x: number;
  y: number;
  /** 共享的置顶计数器：点哪个窗口，哪个就到最前面 */
  raise: () => number;
  initialZ?: number;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
};

/**
 * 可拖动的窗口外壳，定位方式照 cursor.com：中心点用百分比，clamp 保证拖不出舞台，再 translate(-50%,-50%)。
 * 拖动时只改 left/top，窗口内容不重渲染以外的东西。
 */
export function StageWindow({
  stageRef,
  title,
  width,
  height,
  x,
  y,
  raise,
  initialZ = 10,
  className = "",
  bodyClassName = "",
  children,
}: StageWindowProps) {
  const [position, setPosition] = useState({ x, y });
  const [z, setZ] = useState(initialZ);
  const drag = useRef<{ startX: number; startY: number; originX: number; originY: number; rect: DOMRect } | null>(null);

  const onBarPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const stage = stageRef.current;
    if (!stage || event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { startX: event.clientX, startY: event.clientY, originX: position.x, originY: position.y, rect: stage.getBoundingClientRect() };
  };
  const onBarPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    setPosition({
      x: d.originX + ((event.clientX - d.startX) / d.rect.width) * 100,
      y: d.originY + ((event.clientY - d.startY) / d.rect.height) * 100,
    });
  };
  const endDrag = () => {
    drag.current = null;
  };

  return (
    <div
      className={`bl-win ${className}`}
      style={{
        width,
        height,
        zIndex: z,
        left: `clamp(calc(var(--pad) + ${width / 2}px), ${position.x}%, calc(100% - var(--pad) - ${width / 2}px))`,
        top: `clamp(calc(var(--pad) + ${height / 2}px), ${position.y}%, calc(100% - var(--pad) - ${height / 2}px))`,
      }}
      onPointerDownCapture={() => setZ(raise())}
    >
      <div className="bl-bar" onPointerDown={onBarPointerDown} onPointerMove={onBarPointerMove} onPointerUp={endDrag} onPointerCancel={endDrag}>
        <div className="bl-dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
        <div className="bl-title">{title}</div>
      </div>
      <div className={`bl-win-body ${bodyClassName}`}>{children}</div>
    </div>
  );
}
