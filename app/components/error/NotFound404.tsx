import { useEffect, useRef, useState } from "react";
import { useIntl } from "react-intl";
import { GsapFillLink } from "~/components/ui/GsapFillLink";

export default function NotFound404() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [displayText, setDisplayText] = useState("");
  const intl = useIntl();
  const fullText = intl.formatMessage({ defaultMessage: "你来到了无人之境", description: "404页打字机标题" });

  // 打字机效果
  useEffect(() => {
    let index = 0;
    const timer = setInterval(() => {
      if (index <= fullText.length) {
        setDisplayText(fullText.slice(0, index));
        index++;
      } else {
        clearInterval(timer);
      }
    }, 150);

    return () => clearInterval(timer);
  }, [fullText]);

  // 像素龙动画
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const dragonSegments: { x: number; y: number; angle: number }[] = [];
    const segmentCount = 35;
    const segmentDistance = 18;

    for (let i = 0; i < segmentCount; i++) {
      dragonSegments.push({
        x: canvas.width / 2 - i * segmentDistance,
        y: canvas.height / 2,
        angle: 0,
      });
    }

    let angle = 0;
    let time = 0;

    const drawDragonHead = (x: number, y: number, angle: number, size: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);

      // 龙头 - 圆形
      ctx.fillStyle = "hsl(28, 70%, 42%)";
      ctx.beginPath();
      ctx.arc(0, 0, size, 0, Math.PI * 2);
      ctx.fill();

      // 龙角 - 三角形
      ctx.fillStyle = "hsl(28, 70%, 32%)";
      ctx.beginPath();
      ctx.moveTo(-size * 0.5, -size * 0.7);
      ctx.lineTo(-size * 0.3, -size * 1.5);
      ctx.lineTo(-size * 0.1, -size * 0.8);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(size * 0.5, -size * 0.7);
      ctx.lineTo(size * 0.3, -size * 1.5);
      ctx.lineTo(size * 0.1, -size * 0.8);
      ctx.closePath();
      ctx.fill();

      // 眼睛 - 圆形
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(-size * 0.35, -size * 0.2, size * 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(size * 0.35, -size * 0.2, size * 0.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.arc(-size * 0.35, -size * 0.2, size * 0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(size * 0.35, -size * 0.2, size * 0.1, 0, Math.PI * 2);
      ctx.fill();

      // 鼻孔 - 小圆形
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.beginPath();
      ctx.arc(-size * 0.25, size * 0.4, size * 0.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(size * 0.25, size * 0.4, size * 0.08, 0, Math.PI * 2);
      ctx.fill();

      // 龙须 - 线条
      ctx.strokeStyle = "hsl(28, 70%, 35%)";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";

      ctx.beginPath();
      ctx.moveTo(-size * 0.7, size * 0.3);
      ctx.lineTo(-size * 1.1, size * 0.9);
      ctx.lineTo(-size * 1.3, size * 1.3);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(size * 0.7, size * 0.3);
      ctx.lineTo(size * 1.1, size * 0.9);
      ctx.lineTo(size * 1.3, size * 1.3);
      ctx.stroke();

      ctx.restore();
    };

    const drawDragonBody = (x: number, y: number, angle: number, size: number, index: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);

      const bodySize = size * (1 - index * 0.012);

      // 龙身 - 方形
      ctx.fillStyle = `hsl(28, 70%, ${42 + index * 0.5}%)`;
      ctx.fillRect(-bodySize / 2, -bodySize / 2, bodySize, bodySize);

      // 鳞片纹理 - 小方块
      if (index % 3 === 0) {
        ctx.fillStyle = `hsl(28, 70%, ${52 + index * 0.5}%)`;
        const scaleSize = bodySize * 0.3;
        ctx.fillRect(-scaleSize / 2, -bodySize * 0.3, scaleSize, scaleSize * 0.6);
      }

      ctx.restore();
    };

    const drawDragonClaw = (x: number, y: number, angle: number, isLeft: boolean) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);

      const direction = isLeft ? -1 : 1;

      // 龙爪 - 三角形
      ctx.fillStyle = "hsl(28, 70%, 38%)";

      // 主爪
      ctx.beginPath();
      ctx.moveTo(direction * 12, 0);
      ctx.lineTo(direction * 18, 22);
      ctx.lineTo(direction * 10, 24);
      ctx.closePath();
      ctx.fill();

      // 爪尖 - 三个小三角形
      ctx.beginPath();
      ctx.moveTo(direction * 16, 24);
      ctx.lineTo(direction * 14, 30);
      ctx.lineTo(direction * 12, 26);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(direction * 12, 26);
      ctx.lineTo(direction * 10, 32);
      ctx.lineTo(direction * 8, 28);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(direction * 8, 28);
      ctx.lineTo(direction * 6, 33);
      ctx.lineTo(direction * 5, 29);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      time += 0.01;
      angle += 0.01;

      const headX = canvas.width / 2 + Math.cos(angle) * 320;
      const headY = canvas.height / 2 + Math.sin(angle) * 240;

      dragonSegments[0].x = headX;
      dragonSegments[0].y = headY;
      dragonSegments[0].angle = angle + Math.PI / 2;

      for (let i = 1; i < segmentCount; i++) {
        const prev = dragonSegments[i - 1];
        const current = dragonSegments[i];

        const dx = prev.x - current.x;
        const dy = prev.y - current.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > segmentDistance) {
          const ratio = (distance - segmentDistance) / distance;
          current.x += dx * ratio * 0.2;
          current.y += dy * ratio * 0.2;
        }

        current.y += Math.sin(time + i * 0.15) * 1.5;
        current.angle = Math.atan2(dy, dx) + Math.PI / 2;
      }

      // 绘制龙身（从尾到头，这样头部在最上层）
      for (let i = segmentCount - 1; i >= 0; i--) {
        const segment = dragonSegments[i];

        if (i === 0) {
          // 龙头
          drawDragonHead(segment.x, segment.y, segment.angle, 32);
        } else if (i >= segmentCount - 6) {
          // 龙尾 - 弧形
          const tailIndex = i - (segmentCount - 6);
          const tailSize = 24 * (1 - tailIndex * 0.15);

          ctx.save();
          ctx.translate(segment.x, segment.y);
          ctx.rotate(segment.angle);

          ctx.fillStyle = `hsl(28, 70%, ${48 + tailIndex * 2}%)`;

          // 用弧线画尾巴
          ctx.beginPath();
          ctx.moveTo(-tailSize / 2, -tailSize / 2);
          ctx.quadraticCurveTo(0, -tailSize, tailSize / 2, -tailSize / 2);
          ctx.lineTo(tailSize / 2, tailSize / 2);
          ctx.quadraticCurveTo(0, tailSize, -tailSize / 2, tailSize / 2);
          ctx.closePath();
          ctx.fill();

          // 尾尖 - 三角形
          if (i === segmentCount - 1) {
            ctx.fillStyle = "hsl(28, 70%, 55%)";
            ctx.beginPath();
            ctx.moveTo(-6, tailSize / 2);
            ctx.lineTo(0, tailSize / 2 + 20);
            ctx.lineTo(6, tailSize / 2);
            ctx.closePath();
            ctx.fill();
          }

          ctx.restore();
        } else {
          // 龙身
          drawDragonBody(segment.x, segment.y, segment.angle, 24, i);

          // 龙爪（在特定位置）
          if (i === 6 || i === 12 || i === 18 || i === 24) {
            drawDragonClaw(segment.x, segment.y, segment.angle, true);
            drawDragonClaw(segment.x, segment.y, segment.angle, false);
          }
        }
      }

      requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
    };
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-primary-50">
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{ opacity: 0.4 }}
      />

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6">
        <div className="mb-12 text-center">
          <h1 className="text-5xl font-semibold leading-tight tracking-tight text-primary-950 sm:text-6xl">
            {displayText}
            <span className="animate-pulse">|</span>
          </h1>
        </div>

        <GsapFillLink
          to="/"
          className="ui-button-primary px-10 py-5 text-lg"
        >
          <span className="relative">{intl.formatMessage({ defaultMessage: "让龙带你回家", description: "404页返回首页按钮" })}</span>
          <span className="relative text-2xl">→</span>
        </GsapFillLink>
      </div>
    </div>
  );
}
