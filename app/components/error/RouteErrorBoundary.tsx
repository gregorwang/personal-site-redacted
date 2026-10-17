import { useRouteError, isRouteErrorResponse } from "react-router";
import { useEffect, useRef, useState } from "react";
import { useIntl } from "react-intl";
import { GsapFillLink } from "~/components/ui/GsapFillLink";

export default function RouteErrorBoundary() {
  const error = useRouteError();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [displayText, setDisplayText] = useState("");
  const intl = useIntl();
  const fullText = intl.formatMessage({ defaultMessage: "页面游走了", description: "错误页页打字机标题" });

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

  // 鱼的动画
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

    let time = 0;
    const fish1 = { x: -100, y: canvas.height * 0.3, speed: 1.2, direction: 1 };
    const fish2 = { x: canvas.width + 50, y: canvas.height * 0.6, speed: 0.9, direction: -1 };
    const fish3 = { x: canvas.width * 0.5, y: canvas.height * 0.45, speed: 1.5, direction: 1 };

    const drawFish = (x: number, y: number, rotation: number, size: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);

      ctx.fillStyle = "hsl(200, 70%, 50%)";
      ctx.beginPath();
      ctx.ellipse(0, 0, size * 1.5, size, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "hsl(200, 70%, 45%)";
      ctx.beginPath();
      ctx.moveTo(-size * 1.5, -size * 0.6);
      ctx.lineTo(-size * 2.5, 0);
      ctx.lineTo(-size * 1.5, size * 0.6);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(size * 0.3, -size);
      ctx.lineTo(size * 0.6, -size * 1.6);
      ctx.lineTo(size * 0.9, -size);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(size * 0.5, -size * 0.3, size * 0.25, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.arc(size * 0.5, -size * 0.3, size * 0.12, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      time += 0.01;

      [fish1, fish2, fish3].forEach((fish) => {
        fish.x += fish.speed * fish.direction;

        if (fish.direction > 0 && fish.x > canvas.width + 100) {
          fish.x = -100;
        } else if (fish.direction < 0 && fish.x < -100) {
          fish.x = canvas.width + 100;
        }

        const waveY = Math.sin(time * 2 + fish.x * 0.01) * 15;
        const rotation = fish.direction > 0 ? 0 : Math.PI;

        drawFish(fish.x, fish.y + waveY, rotation, 30);
      });

      requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
    };
  }, []);

  const errorMessage = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
    ? error.message
    : intl.formatMessage({ defaultMessage: "未知错误", description: "错误页：无法识别的错误" });

  return (
    <div className="relative min-h-screen overflow-hidden bg-primary-50">
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{ opacity: 0.3 }}
      />

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6">
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-primary-950 sm:text-5xl">
            {displayText}
            <span className="animate-pulse">|</span>
          </h1>
          <p className="mt-4 text-base text-primary-950/62">
            {errorMessage}
          </p>
        </div>

        <GsapFillLink
          to="/"
          className="ui-button-primary px-8 py-4"
        >
          <span className="relative">{intl.formatMessage({ defaultMessage: "游回首页", description: "错误页页返回首页按钮" })}</span>
          <span className="relative text-xl">→</span>
        </GsapFillLink>
      </div>
    </div>
  );
}
