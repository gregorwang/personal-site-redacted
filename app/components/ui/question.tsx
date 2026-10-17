"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { FormattedMessage, useIntl, type IntlShape } from "react-intl";

type ToneModule = typeof import("tone");
type PianoSampler = InstanceType<ToneModule["Sampler"]>;

type PianoFAQItem = {
  id: number;
  question: string;
  answer: string;
  symbol: string;
};

type PianoSoundConfig = {
  enabled?: boolean;
  notes?: string[];
  sampleUrls?: Record<string, string>;
  release?: number;
  triggerDuration?: string;
  preloadRootMargin?: string;
};

type PianoFAQProps = {
  items?: PianoFAQItem[];
  sound?: PianoSoundConfig;
};

const getDefaultFaqs = (intl: IntlShape): PianoFAQItem[] => [
  {
    id: 1,
    question: intl.formatMessage({ defaultMessage: "这个网站是用来做什么的？" }),
    answer: intl.formatMessage({ defaultMessage: "这是我的一方自留地。我会把喜欢的东西、做过的项目、一些想法和回忆放在这里。它不是商业网站，只是一个慢慢生长的私人空间。" }),
    symbol: "♩"
  },
  {
    id: 2,
    question: intl.formatMessage({ defaultMessage: "这个网站以后会消失吗？" }),
    answer: intl.formatMessage({ defaultMessage: "短期内不会。网站部署在 Cloudflare 上，维护成本很低，主要成本只有域名续费。之后我会尽量把域名续得更久一点，让它稳定地存在下去。" }),
    symbol: "♪"
  },
  {
    id: 3,
    question: intl.formatMessage({ defaultMessage: "网站会持续更新吗？" }),
    answer: intl.formatMessage({ defaultMessage: "会，但不会机械地更新。有空、有想法、有灵感的时候，我就会继续整理和优化它。这个网站也是我用 AI 实现想法的开始。" }),
    symbol: "♯"
  },
  {
    id: 4,
    question: intl.formatMessage({ defaultMessage: "如果网站有问题怎么办？" }),
    answer: intl.formatMessage({ defaultMessage: "这个网站主要在我自己的设备上测试过，复杂环境下可能会有显示或功能问题。如果你发现异常，可以通过邮件或微信告诉我，我会认真查看并尽量修复。" }),
    symbol: "♭"
  },
];

const defaultNotes = ["C3", "D3", "E3", "F3"];
const defaultSampleUrls = {
  C3: "https://tonejs.github.io/audio/salamander/C3.mp3",
  "D#3": "https://tonejs.github.io/audio/salamander/Ds3.mp3",
  "F#3": "https://tonejs.github.io/audio/salamander/Fs3.mp3",
  A3: "https://tonejs.github.io/audio/salamander/A3.mp3",
  C4: "https://tonejs.github.io/audio/salamander/C4.mp3",
};

export default function PianoFAQ({ items: itemsProp, sound }: PianoFAQProps) {
  const intl = useIntl();
  const items = itemsProp ?? getDefaultFaqs(intl);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const sectionRef = useRef<HTMLElement | null>(null);
  const toneRef = useRef<ToneModule | null>(null);
  const samplerRef = useRef<PianoSampler | null>(null);
  const samplerLoadingRef = useRef<Promise<void> | null>(null);
  const samplerReadyRef = useRef(false);
  const disposedRef = useRef(false);

  const soundEnabled = sound?.enabled ?? true;
  const notes = sound?.notes ?? defaultNotes;
  const sampleUrls = sound?.sampleUrls ?? defaultSampleUrls;
  const release = sound?.release ?? 1;
  const triggerDuration = sound?.triggerDuration ?? "8n";
  const preloadRootMargin = sound?.preloadRootMargin ?? "400px";

  const loadSampler = useCallback(() => {
    if (!soundEnabled) return Promise.resolve();
    if (samplerReadyRef.current || samplerLoadingRef.current) {
      return samplerLoadingRef.current ?? Promise.resolve();
    }

    samplerLoadingRef.current = import("tone")
      .then((Tone) => {
        if (disposedRef.current) return;

        toneRef.current = Tone;
        return new Promise<void>((resolve) => {
          const sampler = new Tone.Sampler({
            urls: sampleUrls,
            release,
            onload: () => {
              samplerReadyRef.current = true;
              resolve();
            },
          }).toDestination();

          samplerRef.current = sampler;
        });
      })
      .catch((error) => {
        samplerLoadingRef.current = null;
        console.warn("Piano samples failed to load:", error);
      });

    return samplerLoadingRef.current;
  }, [release, sampleUrls, soundEnabled]);

  useEffect(() => {
    disposedRef.current = false;
    return () => {
      disposedRef.current = true;
      samplerRef.current?.dispose();
      samplerRef.current = null;
      toneRef.current = null;
      samplerLoadingRef.current = null;
      samplerReadyRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!soundEnabled) return;
    const section = sectionRef.current;
    if (!section) return;

    if (!("IntersectionObserver" in window)) {
      void loadSampler();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void loadSampler();
          observer.disconnect();
        }
      },
      { rootMargin: preloadRootMargin }
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, [loadSampler, preloadRootMargin, soundEnabled]);

  const playNote = async (note: string) => {
    if (!soundEnabled) return;

    if (!samplerReadyRef.current || !toneRef.current || !samplerRef.current) {
      void loadSampler();
      return;
    }

    try {
      await toneRef.current.start();
      samplerRef.current.triggerAttackRelease(note, triggerDuration);
    } catch (error) {
      console.warn("Piano note failed to play:", error);
    }
  };

  const handleKeyClick = (index: number, note: string) => {
    setExpandedIndex((currentIndex) => currentIndex === index ? null : index);
    void playNote(note);
  };

  return (
    <section ref={sectionRef} className="py-24 bg-primary-50">
      <div className="container mx-auto px-6 mb-12">
        <h2 className="text-4xl font-semibold leading-tight tracking-tight text-primary-950 sm:text-5xl">
          <FormattedMessage defaultMessage="有疑问？看看这里" />
        </h2>
      </div>
      <div className="max-w-7xl mx-auto">
        {items.map((faq, index) => {
          const isWhite = index % 2 === 0;
          const bgColor = isWhite ? "bg-white" : "bg-[#111111]";
          const textColor = isWhite ? "text-[#111111]" : "text-white";
          const symbolColor = isWhite ? "text-[#111111]" : "text-white";
          const isExpanded = expandedIndex === index;
          const note = notes[index % notes.length] ?? defaultNotes[index % defaultNotes.length];
          const answerId = `faq-answer-${faq.id}`;

          return (
            <div
              key={faq.id}
              className={`
                ${bgColor} ${textColor}
                relative py-10 px-12 cursor-pointer
                transition-[box-shadow,filter] duration-200 ease-expo-out
                hover:shadow-[inset_0_-1px_0_rgba(255,255,255,0.16)]
                active:shadow-[inset_0_3px_10px_rgba(0,0,0,0.16)] active:brightness-95
                border-b border-opacity-10
                ${isWhite ? "border-[#111111]" : "border-white"}
              `}
            >
              <button
                type="button"
                className="absolute inset-0 z-10 cursor-pointer focus-visible:outline-2 focus-visible:outline-accent focus-visible:-outline-offset-4"
                onClick={() => handleKeyClick(index, note)}
                aria-expanded={isExpanded}
                aria-controls={answerId}
                aria-label={intl.formatMessage(
                  { defaultMessage: "{question}：{expanded, select, true {收起} other {展开}}答案", description: "FAQ 按钮的无障碍名称" },
                  { question: faq.question, expanded: String(isExpanded) },
                )}
              />
              <div className="flex items-start justify-between gap-8">
                {/* 左侧：符号 + 问题 */}
                <div className="flex items-start gap-6 flex-1">
                  <span className={`${symbolColor} text-3xl font-light mt-1`}>
                    {faq.symbol}
                  </span>
                  <h3 className="font-black text-2xl tracking-tighter leading-tight">
                    {faq.question}
                  </h3>
                </div>

                {/* 右侧：答案 */}
                <div
                  id={answerId}
                  aria-hidden={!isExpanded}
                  className={`
                  text-right transition-[opacity,transform] duration-150 ease-expo-out
                  ${isExpanded ? "opacity-100" : "opacity-0"}
                `}
                >
                  <p className="text-base font-light tracking-wide max-w-md">
                    {faq.answer}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
