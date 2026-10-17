"use client";

import { type CSSProperties, useEffect, useMemo, useRef } from "react";
import { useIntl, type IntlShape } from "react-intl";
import { imageSrcSet, resolveImage } from "~/lib/resolve-image";

type PhotoNode = {
  key: string;
  src: string;
  alt: string;
  style: CSSProperties;
};

type NetworkPath = {
  key: string;
  lineD: string;
  textD: string;
  text?: string;
  startOffset: string;
};

const getNetworkPaths = (intl: IntlShape): NetworkPath[] => [
  {
    key: "poem-1",
    lineD: "M588.3714379429686 -48.25962910181204C350.004 98.0456 501.231 92.7954 415.004 201.046",
    textD: "M415.004 201.046C501.231 92.7954 350.004 98.0456 588.3714379429686 -48.25962910181204",
    text: intl.formatMessage({ defaultMessage: "世上本无连城诀" }),
    startOffset: "41%",
  },
  {
    key: "poem-2",
    lineD: "M856.7641799325859 58.6376511120414C663.005 134.573 354.004 154.046 432.006 287.046",
    textD: "M432.006 287.046C354.004 154.046 663.005 134.573 856.7641799325859 58.6376511120414",
    text: intl.formatMessage({ defaultMessage: "君可愿怀素心剑？" }),
    startOffset: "36%",
  },
  {
    key: "poem-3",
    lineD: "M350.687 182.181C242.416 233.82 718.004 383.046 945.8233526248508 255.10004391299907",
    textD: "M350.687 182.181C242.416 233.82 718.004 383.046 945.8233526248508 255.10004391299907",
    text: intl.formatMessage({ defaultMessage: "数声风笛离亭晚" }),
    startOffset: "47%",
  },
  {
    key: "poem-4",
    lineD: "M268.004 214.048C387.098 -22.361 704.004 312.047 813.877179334599 428.0058722590502",
    textD: "M268.004 214.048C387.098 -22.361 704.004 312.047 813.877179334599 428.0058722590502",
    text: intl.formatMessage({ defaultMessage: "君向潇湘我向秦" }),
    startOffset: "38%",
  },
  {
    key: "poem-5",
    lineD: "M518.903 184.022C459.416 199.964 408.894 321.318 522.6647409627121 522.415978229515",
    textD: "M518.903 184.022C459.416 199.964 408.894 321.318 522.6647409627121 522.415978229515",
    text: intl.formatMessage({ defaultMessage: "一松一竹真朋友" }),
    startOffset: "48%",
  },
  {
    key: "poem-6",
    lineD: "M558.004 301.045C349.827 465.719 148.09 206.405 266.229073486009 -22.94634978604976",
    textD: "M279.246 194.291C322.343 127.344 385.660 119.980 454.646 143.836",
    text: intl.formatMessage({ defaultMessage: "山鸟山花好弟兄" }),
    startOffset: "6%",
  },
  {
    key: "poem-7",
    lineD: "M495.522 253.711C537.396 340.813 330.508 386.218 18.25138272243266 308.80884775185285",
    textD: "M18.25138272243266 308.80884775185285C330.508 386.218 537.396 340.813 495.522 253.711",
    text: intl.formatMessage({ defaultMessage: "水无沾月之心" }),
    startOffset: "37%",
  },
  {
    key: "poem-8",
    lineD: "M323.438 265.475C246.334 265.475 145.199 283.983 41.07107910470195 120.41509793117103",
    textD: "M41.07107910470195 120.41509793117103C145.199 283.983 246.334 265.475 323.438 265.475",
    text: intl.formatMessage({ defaultMessage: "月无分照之意" }),
    startOffset: "33%",
  },
  {
    key: "left-lower-line",
    lineD: "M286.171 303.306C270.568 462.528 523.166 385.25 208.44757388914027 458.12321496395987",
    textD: "M208.44757388914027 458.12321496395987C523.166 385.25 270.568 462.528 286.171 303.306",
    startOffset: "36%",
  },
];

// 桌面端最大一格是舞台宽 min(76vw, 1100px) 的 17.45%；900px 以下 CSS 固定为 112px
const PORTRAIT_SIZES = "(max-width: 900px) 112px, min(13.3vw, 192px)";

const getPhotoNodes = (intl: IntlShape): PhotoNode[] => [
  {
    key: "top-center",
    src: resolveImage("emt1"),
    alt: intl.formatMessage({ defaultMessage: "中国风影像作品一" }),
    style: { left: "19.38%", top: "5.0%", width: "17.45%", height: "22.7%" },
  },
  {
    key: "top-right",
    src: resolveImage("n4"),
    alt: intl.formatMessage({ defaultMessage: "中国风影像作品二" }),
    style: { left: "53.4%", top: "1.6%", width: "17.45%", height: "24.1%" },
  },
  {
    key: "right-upper",
    src: resolveImage("n10"),
    alt: intl.formatMessage({ defaultMessage: "个人摄影作品九" }),
    style: { left: "83.5%", top: "18.2%", width: "13.96%", height: "19.6%" },
  },
  {
    key: "right-mid",
    src: resolveImage("n1"),
    alt: intl.formatMessage({ defaultMessage: "中国风影像作品三" }),
    style: { left: "92.0%", top: "41.7%", width: "13.96%", height: "21.9%" },
  },
  {
    key: "right-lower",
    src: resolveImage("gallery_photo_17"),
    alt: intl.formatMessage({ defaultMessage: "个人摄影作品十七" }),
    style: { left: "79.0%", top: "64.5%", width: "13.96%", height: "23.1%" },
  },
  {
    key: "bottom-mid",
    src: resolveImage("n13"),
    alt: intl.formatMessage({ defaultMessage: "中国风影像作品四" }),
    style: { left: "48.2%", top: "79.0%", width: "13.96%", height: "16.5%" },
  },
  {
    key: "bottom-left",
    src: resolveImage("n11"),
    alt: intl.formatMessage({ defaultMessage: "个人摄影作品二十一" }),
    style: { left: "13.3%", top: "68.5%", width: "17.45%", height: "25.1%" },
  },
  {
    key: "left-lower",
    src: resolveImage("gallery_photo_14"),
    alt: intl.formatMessage({ defaultMessage: "个人摄影作品十四" }),
    style: { left: "-5.1%", top: "51.0%", width: "13.96%", height: "18.4%" },
  },
  {
    key: "left-mid",
    src: resolveImage("n12"),
    alt: intl.formatMessage({ defaultMessage: "个人摄影作品一" }),
    style: { left: "-2.7%", top: "23.9%", width: "13.96%", height: "21.8%" },
  },
];

export default function CursorTeamSection() {
  const rootRef = useRef<HTMLElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const intl = useIntl();
  const networkPaths = useMemo(() => getNetworkPaths(intl), [intl]);
  const portraits = useMemo(() => getPhotoNodes(intl).filter((node) => node.src), [intl]);

  useEffect(() => {
    const root = rootRef.current;
    const stage = stageRef.current;
    if (!root || !stage) return;

    const portraitEls = Array.from(root.querySelectorAll<HTMLElement>(".photo-network__portrait"));
    const labelEls = Array.from(root.querySelectorAll<SVGTextElement>(".photo-network__label"));
    const pathEls = Array.from(root.querySelectorAll<SVGPathElement>(".photo-network__line"));
    const timers: number[] = [];
    const animations: Animation[] = [];
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    pathEls.forEach((path, index) => {
      const length = path.getTotalLength();
      path.style.strokeDasharray = `${length}`;
      path.style.strokeDashoffset = reduceMotion ? "0" : `${length}`;
      path.style.opacity = reduceMotion ? "1" : "0";

      if (!reduceMotion) {
        animations.push(
          path.animate(
            [
              { strokeDashoffset: length, opacity: 0 },
              { strokeDashoffset: 0, opacity: 1 },
            ],
            {
              duration: 1300 + index * 95,
              delay: 160 + index * 65,
              easing: "cubic-bezier(.19,1,.22,1)",
              fill: "forwards",
            },
          ),
        );
      }
    });

    portraitEls.forEach((portrait, index) => {
      timers.push(window.setTimeout(() => portrait.classList.add("is-visible"), reduceMotion ? 0 : 220 + index * 85));
    });

    labelEls.forEach((label, index) => {
      timers.push(window.setTimeout(() => label.classList.add("is-visible"), reduceMotion ? 0 : 720 + index * 45));
    });

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      animations.forEach((animation) => animation.cancel());
    };
  }, []);

  return (
    <section ref={rootRef} className="photo-network" aria-label={intl.formatMessage({ defaultMessage: "诗句与影像网络" })}>
      <div ref={stageRef} className="photo-network__stage">
        <svg className="photo-network__lines" viewBox="0 0 947 588" aria-hidden="true">
          <defs>
            {networkPaths.map((path) => (
              <path key={`${path.key}-text-path`} id={`photo-network-${path.key}`} d={path.textD} />
            ))}
          </defs>

          {networkPaths.map((path) => (
            <path key={path.key} className="photo-network__line" d={path.lineD} />
          ))}

          {networkPaths.filter((path) => path.text).map((path) => (
            <text key={`${path.key}-text`} data-key={path.key} className="photo-network__label" dy="-5">
              <textPath href={`#photo-network-${path.key}`} startOffset={path.startOffset}>
                {path.text}
              </textPath>
            </text>
          ))}
        </svg>

        {portraits.map((portrait) => (
          <figure key={portrait.key} data-key={portrait.key} className="photo-network__portrait" style={portrait.style}>
            <img
              src={portrait.src}
              srcSet={imageSrcSet(portrait.src)}
              sizes={PORTRAIT_SIZES}
              alt={portrait.alt}
              loading="lazy"
              decoding="async"
            />
          </figure>
        ))}
      </div>
    </section>
  );
}
