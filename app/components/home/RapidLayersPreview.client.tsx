import { FormattedMessage } from "react-intl";
import { Link } from "~/components/common/LocaleLink";
import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";

const layerFrames = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
const PUBLIC_ASSET_BASE_URL = "https://cdn.xn--cckl9nsb.com";
const rapidLayerAsset = (name: string) => `${PUBLIC_ASSET_BASE_URL}/images/rapid-layers/${name}`;

const layers = layerFrames.map((frame) => ({
  id: frame,
  src: rapidLayerAsset(`rapid-layer-${String(frame).padStart(2, "0")}.webp`),
}));

const poems = [
  "世上本无连城诀，君可愿怀素心剑？",
  "数声风笛离亭晚，君向潇湘我向秦",
  "一松一竹真朋友，山鸟山花好弟兄",
  "水无沾月之心，月无分照之意",
  "山中何所有，岭上多白云",
  "行到水穷处，坐看云起时",
] as const;

const gridItems = [
  {
    id: "phone-a",
    src: rapidLayerAsset("rapid-grid-phone-01.webp"),
    gridColumn: "1 / 3",
    gridRow: "2 / 5",
    imageClassName: "h-full w-auto",
    lift: 180,
    poem: poems[0],
    poemSide: "left",
    poemSize: "clamp(1.06rem, 1.45vw, 1.62rem)",
    type: "phone",
  },
  {
    id: "phone-b",
    src: rapidLayerAsset("rapid-grid-phone-02.webp"),
    gridColumn: "2 / 5",
    gridRow: "6 / 9",
    imageClassName: "h-full w-auto",
    lift: 360,
    poem: poems[1],
    poemSide: "left",
    poemSize: "clamp(0.96rem, 1.28vw, 1.45rem)",
    type: "phone",
  },
  {
    id: "phone-c",
    src: rapidLayerAsset("rapid-grid-phone-03.webp"),
    gridColumn: "4 / 7",
    gridRow: "3 / 7",
    imageClassName: "h-full w-auto",
    lift: 260,
    poem: poems[2],
    poemSide: "right",
    poemSize: "clamp(1.02rem, 1.38vw, 1.56rem)",
    type: "phone",
  },
  {
    id: "phone-d",
    src: rapidLayerAsset("rapid-grid-phone-04.webp"),
    gridColumn: "8 / 10",
    gridRow: "1 / 4",
    imageClassName: "h-full w-auto",
    lift: 420,
    poem: poems[3],
    poemSide: "right",
    poemSize: "clamp(1rem, 1.32vw, 1.5rem)",
    type: "phone",
  },
  {
    id: "wide-a",
    src: rapidLayerAsset("rapid-grid-wide-01.webp"),
    gridColumn: "10 / 14",
    gridRow: "4 / 7",
    imageClassName: "w-full h-auto",
    lift: 220,
    poem: poems[4],
    poemSide: "top",
    poemSize: "clamp(1.08rem, 1.28vw, 1.48rem)",
    poemWidth: "82%",
    type: "wide",
  },
  {
    id: "wide-b",
    src: rapidLayerAsset("rapid-layer-03.webp"),
    gridColumn: "9 / 12",
    gridRow: "6 / 9",
    imageClassName: "w-full h-auto",
    lift: 320,
    poem: poems[5],
    poemSide: "bottom",
    poemSize: "clamp(0.98rem, 1.12vw, 1.28rem)",
    poemWidth: "74%",
    type: "wide",
  },
];

const layerDuration = 1;
const exitDuration = 1;
const panelDelay = 0.15;
const finalLayerDelay = panelDelay * (layers.length - 1);
const halfway = finalLayerDelay + layerDuration;

function poemCharacters(poem: string) {
  return Array.from(poem);
}

export default function RapidLayersPreview() {
  const [replayKey, setReplayKey] = useState(0);
  const [showLayers, setShowLayers] = useState(true);
  const layerRefs = useRef<Array<HTMLDivElement | null>>([]);
  const layerImageRefs = useRef<Array<HTMLDivElement | null>>([]);
  const gridItemRefs = useRef<Array<HTMLDivElement | null>>([]);

  useEffect(() => {
    setShowLayers(true);
    const timer = window.setTimeout(() => setShowLayers(false), (halfway + exitDuration + 0.12) * 1000);
    return () => window.clearTimeout(timer);
  }, [replayKey]);

  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | undefined;

    void import("gsap").then(({ gsap }) => {
      if (cancelled) return;

      const layerElements = layerRefs.current.filter(Boolean) as HTMLDivElement[];
      const imageElements = layerImageRefs.current.filter(Boolean) as HTMLDivElement[];
      const gridElements = gridItemRefs.current.filter(Boolean) as HTMLDivElement[];
      const lastLayer = layerElements.at(-1);
      const lastImage = imageElements.at(-1);

      if (
        !lastLayer ||
        !lastImage ||
        layerElements.length !== layers.length ||
        imageElements.length !== layers.length ||
        gridElements.length !== gridItems.length
      ) {
        return;
      }

      gsap.killTweensOf([...layerElements, ...imageElements, ...gridElements]);
      gsap.set(layerElements, { clearProps: "transform" });
      gsap.set(imageElements, { clearProps: "transform,filter" });
      gsap.set(layerElements, { yPercent: 101, opacity: 1, visibility: "visible" });
      gsap.set(imageElements, { yPercent: -101, scale: 1.015, filter: "brightness(0.88) saturate(0.95)" });
      gsap.set(layerElements[0], { yPercent: 0 });
      gsap.set(imageElements[0], { yPercent: 0 });
      gsap.set(gridElements, {
        opacity: 0,
        y: (index) => gridItems[index].lift,
        filter: "brightness(0.42) saturate(0.85)",
      });

      const timeline = gsap.timeline();

      layerElements.slice(1).forEach((layer, offset) => {
        const index = offset + 1;
        timeline.to([layer, imageElements[index]], {
          duration: layerDuration,
          ease: "power2.inOut",
          yPercent: 0,
        }, panelDelay * index);
      });

      timeline.call(() => {
        gsap.set(layerElements.slice(0, -1), { opacity: 0, visibility: "hidden" });
      }, undefined, halfway);

      timeline.to([lastLayer, lastImage], {
        duration: exitDuration,
        ease: "expo.inOut",
        yPercent: (index) => (index === 0 ? -101 : 101),
      }, halfway);

      timeline.to(gridElements, {
        duration: layerDuration * 2,
        ease: "expo.out",
        y: 0,
        opacity: 1,
        filter: "brightness(0.7) saturate(1)",
        stagger: 0,
      }, halfway);

      cleanup = () => {
        timeline.kill();
        gsap.killTweensOf([...layerElements, ...imageElements, ...gridElements]);
      };
    }).catch((error) => {
      console.error("[RapidLayersPreview] Failed to load GSAP", error);
    });

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [replayKey]);

  return (
    <main className="relative min-h-screen overflow-hidden text-[#111111]" style={{ backgroundColor: "#F9F9F6" }}>
      <div key={replayKey} className="absolute inset-0">
        <div className="pointer-events-none absolute inset-0 z-0 grid place-items-center overflow-hidden">
          <div
            className="absolute left-1/2 top-1/2 grid -translate-x-1/2 -translate-y-1/2 opacity-95"
            style={{
              width: "min(80vw, 118rem)",
              height: "93vh",
              gridTemplateColumns: "repeat(13, minmax(0, 1fr))",
              gridTemplateRows: "repeat(8, minmax(0, 1fr))",
              gap: "1vw",
            }}
          >
            {gridItems.map((item, index) => (
              <div
                key={item.id}
                data-rapid-grid-item="true"
                ref={(element) => {
                  gridItemRefs.current[index] = element;
                }}
                className={[
                  "relative flex opacity-0 will-change-transform",
                  item.type === "wide" ? "flex-col items-stretch justify-center gap-3" : "items-stretch gap-3",
                  item.poemSide === "right" ? "justify-end" : "justify-start",
                ].join(" ")}
                style={{
                  gridColumn: item.gridColumn,
                  gridRow: item.gridRow,
                  "--lift": `${item.lift}px`,
                } as CSSProperties}
              >
                {item.type === "wide" ? (
                  <>
                    {item.poemSide === "top" ? (
                      <p
                        className="mx-auto flex whitespace-nowrap text-center font-serif font-semibold leading-none tracking-normal text-[#7f625c]"
                        style={{
                          "--poem-y": "14px",
                          width: item.poemWidth,
                          fontSize: item.poemSize,
                          justifyContent: "space-between",
                        } as CSSProperties}
                      >
                        {poemCharacters(item.poem).map((char, charIndex) => (
                          <span key={`${item.id}-top-${charIndex}`}>{char}</span>
                        ))}
                      </p>
                    ) : null}
                    <img
                      src={item.src}
                      alt=""
                      className={`${item.imageClassName} max-h-full object-contain shadow-[0_2.5rem_5rem_rgba(0,0,0,0.34)]`}
                      loading="eager"
                      decoding="async"
                    />
                    {item.poemSide === "bottom" ? (
                      <p
                        className="mx-auto flex whitespace-nowrap text-center font-serif font-semibold leading-none tracking-normal text-[#7f625c]"
                        style={{
                          "--poem-y": "-14px",
                          width: item.poemWidth,
                          fontSize: item.poemSize,
                          justifyContent: "space-between",
                        } as CSSProperties}
                      >
                        {poemCharacters(item.poem).map((char, charIndex) => (
                          <span key={`${item.id}-bottom-${charIndex}`}>{char}</span>
                        ))}
                      </p>
                    ) : null}
                  </>
                ) : item.poemSide === "right" ? (
                  <>
                    <img
                      src={item.src}
                      alt=""
                      className={`${item.imageClassName} max-w-none object-contain shadow-[0_2.5rem_5rem_rgba(0,0,0,0.34)]`}
                      style={{ height: "100%", width: "auto", maxWidth: "none" }}
                      loading="eager"
                      decoding="async"
                    />
                    <p
                      className="flex self-stretch py-1 text-center font-serif font-semibold leading-none tracking-normal text-[#7f625c]"
                      style={{
                        "--poem-x": "12px",
                        "--poem-y": "0px",
                        width: "1.45em",
                        fontSize: item.poemSize,
                        flexDirection: "column",
                        justifyContent: "space-between",
                      } as CSSProperties}
                    >
                      {poemCharacters(item.poem).map((char, charIndex) => (
                        <span key={`${item.id}-right-${charIndex}`}>{char}</span>
                      ))}
                    </p>
                  </>
                ) : (
                  <>
                    <p
                      className="flex self-stretch py-1 text-center font-serif font-semibold leading-none tracking-normal text-[#7f625c]"
                      style={{
                        "--poem-x": "-12px",
                        "--poem-y": "0px",
                        width: "1.45em",
                        fontSize: item.poemSize,
                        flexDirection: "column",
                        justifyContent: "space-between",
                      } as CSSProperties}
                    >
                      {poemCharacters(item.poem).map((char, charIndex) => (
                        <span key={`${item.id}-left-${charIndex}`}>{char}</span>
                      ))}
                    </p>
                    <img
                      src={item.src}
                      alt=""
                      className={`${item.imageClassName} max-w-none object-contain shadow-[0_2.5rem_5rem_rgba(0,0,0,0.34)]`}
                      style={{ height: "100%", width: "auto", maxWidth: "none" }}
                      loading="eager"
                      decoding="async"
                    />
                  </>
                )}
              </div>
            ))}
            <div className="pointer-events-none absolute bottom-8 left-1/2 hidden h-24 w-px -translate-x-1/2 bg-[#111111]/25 md:block" aria-hidden="true" />
          </div>
        </div>

        {showLayers ? (
          <div className="pointer-events-none absolute inset-0 z-50 overflow-hidden">
            {layers.map((item, index) => (
              <div
                key={item.id}
                ref={(element) => {
                  layerRefs.current[index] = element;
                }}
                className="absolute inset-0 overflow-hidden will-change-transform"
                style={{
                  zIndex: 20 + index,
                  transform: index === 0 ? "translate3d(0, 0, 0)" : "translate3d(0, 101%, 0)",
                }}
              >
                <div
                  ref={(element) => {
                    layerImageRefs.current[index] = element;
                  }}
                  className="h-full w-full bg-cover bg-center will-change-transform"
                  style={{
                    backgroundImage: `url(${item.src})`,
                    transform: index === 0 ? "translate3d(0, 0, 0) scale(1.015)" : "translate3d(0, -101%, 0) scale(1.045)",
                  }}
                />
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <nav className="pointer-events-auto absolute left-6 top-6 z-[70] flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.22em] text-[#111111]/70 md:left-10 md:top-10">
        <Link to="/" className="rounded-full border border-[#111111]/20 px-4 py-2 transition hover:border-[#111111]/55 hover:text-[#111111]">
          <FormattedMessage defaultMessage="返回首页" description="Rapid Layers 预览页左上角返回链接" />
        </Link>
        <button
          type="button"
          onClick={() => setReplayKey((value) => value + 1)}
          className="rounded-full border border-[#111111]/20 px-4 py-2 transition hover:border-[#111111]/55 hover:text-[#111111]"
        >
          Replay
        </button>
      </nav>

      <div className="absolute bottom-8 right-6 z-[70] text-right text-xs font-semibold uppercase tracking-[0.34em] text-[#111111]/55 md:right-10">
        <p>Rapid Layers</p>
        <p className="mt-2 text-[#111111]/35">09 Frames</p>
      </div>
    </main>
  );
}
