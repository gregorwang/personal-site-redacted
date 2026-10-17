import { useEffect, useRef } from "react";
import { FOOTER_WORDS } from "~/data/footer-words";

const BG = "#F9F9F6";
const FG = "#111111";

const LETTER_SPACING = "-4px";
const MONO_FONT = "bold 12px monospace";

const WORDS = FOOTER_WORDS;

const JP_CHARS = ["ｴ", "ﾐ", "ﾘ", "ｱ"] as const;
const FILL_SYMBOLS = ["+", "-", "/", ">", "<"] as const;

const HIT_RADIUS = 15;
const HIT_RADIUS_SQ = HIT_RADIUS * HIT_RADIUS;
const HOVER_EASE = 0.08;
const GRID_GAP = 10;

interface SkeletonPoint {
  x: number;
  y: number;
  brightness: number;
}

interface EngineState {
  width: number;
  height: number;
  dpr: number;
  fontSize: number;
  points: SkeletonPoint[];
  characterArray: string[];
  spatialBuckets: Map<string, number[]>;
  hoverTarget: number;
  hoverMix: number;
}

export interface CreativeFooterProps {
  text?: string;
  className?: string;
}

function calculateFontSize(
  text: string,
  width: number,
  targetRatio: number = 0.92,
): number {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return 140;

  let fontSize = 80;
  let measured = 0;

  while (fontSize < 500) {
    ctx.font = `900 ${fontSize}px "Inter", -apple-system, "Arial Black", sans-serif`;
    ctx.letterSpacing = LETTER_SPACING;
    measured = ctx.measureText(text).width;

    if (measured >= width * targetRatio) break;
    fontSize += 5;
  }

  while (fontSize > 60 && measured > width * targetRatio) {
    fontSize -= 1;
    ctx.font = `900 ${fontSize}px "Inter", -apple-system, "Arial Black", sans-serif`;
    ctx.letterSpacing = LETTER_SPACING;
    measured = ctx.measureText(text).width;
  }

  return Math.max(80, fontSize);
}

function buildCharacterArray(totalPoints: number): string[] {
  if (totalPoints <= 0) return [];

  const sequence: string[] = [];

  sequence.push(...FILL_SYMBOLS.slice(0, 1));
  sequence.push(...JP_CHARS);
  sequence.push(...FILL_SYMBOLS.slice(1, 2));

  for (const word of WORDS) {
    sequence.push(...FILL_SYMBOLS.slice(0, 1));
    sequence.push(...word.split(""));
    sequence.push(...FILL_SYMBOLS.slice(1, 2));
  }

  const out: string[] = [];
  for (let i = 0; i < totalPoints; i++) {
    out.push(sequence[i % sequence.length]);
  }

  return out;
}

function bucketKey(x: number, y: number, cell: number) {
  return `${Math.floor(x / cell)},${Math.floor(y / cell)}`;
}

function buildSpatialIndex(
  points: SkeletonPoint[],
  cell: number,
): Map<string, number[]> {
  const buckets = new Map<string, number[]>();
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const key = bucketKey(p.x, p.y, cell);
    const list = buckets.get(key);
    if (list) list.push(i);
    else buckets.set(key, [i]);
  }
  return buckets;
}

function hitTestText(
  mx: number,
  my: number,
  points: SkeletonPoint[],
  buckets: Map<string, number[]>,
): boolean {
  if (points.length === 0) return false;

  const cell = HIT_RADIUS * 2;
  const bx = Math.floor(mx / cell);
  const by = Math.floor(my / cell);

  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const indices = buckets.get(`${bx + dx},${by + dy}`);
      if (!indices) continue;

      for (let n = 0; n < indices.length; n++) {
        const p = points[indices[n]];
        const distX = p.x - mx;
        const distY = p.y - my;
        if (distX * distX + distY * distY <= HIT_RADIUS_SQ) return true;
      }
    }
  }
  return false;
}

function buildSampleCache(
  label: string,
  width: number,
  height: number,
  dpr: number,
  fontSize: number,
): SkeletonPoint[] {
  const off = document.createElement("canvas");
  off.width = Math.max(1, Math.floor(width * dpr));
  off.height = Math.max(1, Math.floor(height * dpr));
  const ctx = off.getContext("2d", { willReadFrequently: true });
  if (!ctx) return [];

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = FG;
  ctx.font = `900 ${fontSize}px "Inter", -apple-system, "Arial Black", sans-serif`;
  ctx.letterSpacing = LETTER_SPACING;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, width / 2, height / 2);

  const step = Math.max(2, Math.floor(GRID_GAP * dpr));
  const { data } = ctx.getImageData(0, 0, off.width, off.height);
  const points: SkeletonPoint[] = [];

  for (let y = 0; y < off.height; y += step) {
    for (let x = 0; x < off.width; x += step) {
      const i = (y * off.width + x) * 4;
      const lum =
        (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) / 255;
      const alpha = data[i + 3] / 255;
      if (alpha < 0.4 || lum > 0.88) continue;

      points.push({
        x: x / dpr + GRID_GAP * 0.5,
        y: y / dpr + GRID_GAP * 0.5,
        brightness: Math.min(1, Math.max(0, 1 - lum)),
      });
    }
  }

  return points;
}

export default function CreativeFooter({
  text = "wangjiajun",
  className = "",
}: CreativeFooterProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const stateRef = useRef<EngineState>({
    width: 0,
    height: 0,
    dpr: 1,
    fontSize: 140,
    points: [],
    characterArray: [],
    spatialBuckets: new Map(),
    hoverTarget: 0,
    hoverMix: 0,
  });
  const rafRef = useRef(0);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const state = stateRef.current;

    const layout = () => {
      const rect = container.getBoundingClientRect();
      const width = Math.max(1, rect.width);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      const fontSize = calculateFontSize(text, width);
      const height = Math.round(fontSize * 1.4);

      state.width = width;
      state.height = height;
      state.dpr = dpr;
      state.fontSize = fontSize;

      container.style.height = `${height}px`;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);

      const points = buildSampleCache(text, width, height, dpr, fontSize);

      state.points = points;
      state.characterArray = buildCharacterArray(points.length);
      state.spatialBuckets = buildSpatialIndex(points, HIT_RADIUS * 2);
    };

    const drawSolid = (alpha: number) => {
      if (alpha <= 0.001) return;
      const { width, height, dpr, fontSize } = state;

      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = FG;
      ctx.font = `900 ${fontSize}px "Inter", -apple-system, "Arial Black", sans-serif`;
      ctx.letterSpacing = LETTER_SPACING;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, width / 2, height / 2);
      ctx.restore();
    };

    const drawGlyphGrid = (mix: number) => {
      const { width, height, dpr, points, characterArray } = state;
      const count = Math.min(points.length, characterArray.length);
      if (mix <= 0.001 || count === 0) return;

      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, width, height);
      ctx.font = MONO_FONT;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = FG;

      for (let i = 0; i < count; i++) {
        const glyph = characterArray[i];
        if (glyph === " ") continue;

        const p = points[i];
        ctx.globalAlpha = (0.44 + p.brightness * 0.56) * mix;
        ctx.fillText(glyph, p.x, p.y);
      }

      ctx.restore();
    };

    const frame = () => {
      state.hoverMix += (state.hoverTarget - state.hoverMix) * HOVER_EASE;

      const mix = state.hoverMix;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (mix < 0.995) drawSolid(1 - mix * 0.94);
      if (mix > 0.005) drawGlyphGrid(mix);

      rafRef.current = requestAnimationFrame(frame);
    };

    const updateHoverFromPointer = (mx: number, my: number) => {
      const over = hitTestText(mx, my, state.points, state.spatialBuckets);
      state.hoverTarget = over ? 1 : 0;
      canvas.style.cursor = over ? "pointer" : "default";
    };

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      updateHoverFromPointer(e.clientX - rect.left, e.clientY - rect.top);
    };

    const onLeave = () => {
      state.hoverTarget = 0;
      canvas.style.cursor = "default";
    };

    layout();
    rafRef.current = requestAnimationFrame(frame);

    const ro = new ResizeObserver(() => layout());
    ro.observe(container);

    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mouseleave", onLeave);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("mouseleave", onLeave);
    };
  }, [text]);

  return (
    <section
      className={`w-full overflow-hidden bg-[#F9F9F6] text-[#111111] ${className}`}
      aria-label="Site footer"
    >
      <div
        ref={containerRef}
        className="relative flex w-full items-end justify-center"
      >
        <canvas
          ref={canvasRef}
          className="block h-full w-full"
          role="img"
          aria-label={text}
        />
      </div>
    </section>
  );
}
