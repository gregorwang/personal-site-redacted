import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFetcher } from "react-router";
import { FormattedMessage, useIntl, type IntlShape } from "react-intl";
import { Link, useLocale } from "~/components/common/LocaleLink";
import { localizePath, type Locale } from "~/lib/i18n";
import {
  assignRadioFrequency,
  isRadioFrequencyFree,
  normalizeRadioFrequency,
  RADIO_MESSAGE_MAX_LENGTH,
  RADIO_ON_AIR_LIMIT,
} from "~/lib/guestbook-radio";
import { createRadioEngine, type RadioEngine, type RadioEngineLabels, type RadioStation } from "./guestbook-radio-engine.client";

type ToneModule = typeof import("tone");
type PianoSampler = InstanceType<ToneModule["Sampler"]>;

type MessageStatus = "pending" | "approved" | "rejected";

type MessageInput = {
  id?: string | number;
  author?: string;
  username?: string;
  content: string;
  status?: MessageStatus;
  frequency?: number | null;
  createdAt?: string;
  created_at?: string;
};

type GuestbookRadioProps = {
  initialMessages?: MessageInput[];
  pendingMessages?: MessageInput[];
  currentUser?: {
    id: string;
    name?: string | null;
    email?: string | null;
  } | null;
  limitStatus?: {
    dailyLimit: number;
    todayCount: number;
    remainingToday: number;
  } | null;
};

type MessageActionData = {
  success?: string;
  error?: string;
  message?: {
    id: number;
    username: string;
    content: string;
    status: MessageStatus;
    frequency: number | null;
  };
};

// 锁定电台时的钢琴音：和问答区同一套 Salamander 采样，取 C4 往上一个八度
const PIANO_SAMPLE_URLS = {
  C4: "https://tonejs.github.io/audio/salamander/C4.mp3",
  "D#4": "https://tonejs.github.io/audio/salamander/Ds4.mp3",
  "F#4": "https://tonejs.github.io/audio/salamander/Fs4.mp3",
  A4: "https://tonejs.github.io/audio/salamander/A4.mp3",
  C5: "https://tonejs.github.io/audio/salamander/C5.mp3",
};

const randomSeed = () => Math.floor(Math.random() * 1e9);

// 留言时间统一按北京时间显示，不跟着访客所在时区变
const BEIJING_TIME = new Intl.DateTimeFormat("zh-CN", {
  timeZone: "Asia/Shanghai",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** SQLite 的 datetime('now') 是 UTC、没有时区标记，按 UTC 解析后转成北京时间，显示成 06.11 12:48（数字格式各语言通用） */
function formatTime(value: string | undefined, justNow: string) {
  if (!value) return justNow;
  const iso = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(value) ? `${value.replace(" ", "T")}Z` : value;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return justNow;
  const part = (type: Intl.DateTimeFormatPartTypes) => BEIJING_TIME.formatToParts(date).find((p) => p.type === type)?.value ?? "00";
  return `${part("month")}.${part("day")} ${part("hour")}:${part("minute")}`;
}

const numericId = (id: MessageInput["id"]) => {
  const n = Number(id);
  return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
};

/**
 * 把留言变成电台：只播最新的 RADIO_ON_AIR_LIMIT 条已公开留言，加上自己的待审核留言。
 * 频率以数据库里存的为准；旧数据没有频率、或和更早的台撞了，才按同一规则临时补算。
 */
function buildStations(
  approved: MessageInput[],
  pending: MessageInput[],
  local: MessageInput[],
  text: { anonymous: string; justNow: string },
): RadioStation[] {
  const onAir = [...approved].sort((a, b) => numericId(b.id) - numericId(a.id)).slice(0, RADIO_ON_AIR_LIMIT);
  const byId = new Map<string, { message: MessageInput; pending: boolean }>();
  [...local, ...pending].forEach((message) => byId.set(String(message.id), { message, pending: true }));
  // 审核通过后同一条会出现在 approved 里，以 approved 为准
  onAir.forEach((message) => byId.set(String(message.id), { message, pending: false }));

  const taken: number[] = [];
  return [...byId.values()]
    .sort((a, b) => numericId(a.message.id) - numericId(b.message.id))
    .flatMap(({ message, pending: isPending }) => {
      let f = normalizeRadioFrequency(message.frequency);
      if (f === null || !isRadioFrequencyFree(f, taken)) f = assignRadioFrequency(numericId(message.id), taken);
      if (f === null) return [];
      taken.push(f);
      return [{
        key: `m-${message.id}`,
        f,
        text: message.content,
        author: message.author ?? message.username ?? text.anonymous,
        time: formatTime(message.createdAt ?? message.created_at, text.justNow),
        pending: isPending,
      }];
    });
}

// 88.0 上的开场句按语言写死（不进词典）：长度和定住的字位置都跟字形相关，翻译时要一起调。
const RADIO_OPENING: Record<Locale, { opening: string; openingPinned: number[] }> = {
  zh: { opening: "你的话将变成电波，向宇宙扩散", openingPinned: [0, 2] }, // 你、话
  ja: { opening: "あなたの言葉は電波になる", openingPinned: [4, 5] }, // 言葉
  en: { opening: "Words into waves", openingPinned: [0, 11] }, // W、w
};

function buildEngineLabels(intl: IntlShape, locale: Locale): RadioEngineLabels {
  return {
    ...RADIO_OPENING[locale],
    selfPending: intl.formatMessage({ defaultMessage: "你 · 待公开", description: "留言收音机：自己待审核留言的署名" }),
    static: intl.formatMessage({ defaultMessage: "沙沙……", description: "留言收音机：没对上电台时的署名行（噪声声响）" }),
    unknownSource: intl.formatMessage({ defaultMessage: "来源不明的电台", description: "留言收音机：隐藏彩蛋电台的署名" }),
    self: intl.formatMessage({ defaultMessage: "你", description: "留言收音机：自己留言的署名" }),
    pendingNote: intl.formatMessage({ defaultMessage: "待公开，这个频率现在只有你收得到", description: "留言收音机：自己待审核留言的提示" }),
    announce: (frequency, source, text) =>
      intl.formatMessage(
        { defaultMessage: "FM {frequency}，{source}：{text}", description: "留言收音机：屏幕阅读器播报锁定的电台，{source} 是署名，{text} 是留言内容" },
        { frequency, source, text },
      ),
  };
}

export default function GuestbookRadio({
  initialMessages = [],
  pendingMessages = [],
  currentUser = null,
  limitStatus = null,
}: GuestbookRadioProps) {
  const fetcher = useFetcher<MessageActionData>();
  const actionData = fetcher.data;
  const intl = useIntl();
  const locale = useLocale();
  const anonymousLabel = intl.formatMessage({ defaultMessage: "匿名访客", description: "留言收音机：没有用户名时的署名" });
  const justNowLabel = intl.formatMessage({ defaultMessage: "刚刚", description: "留言收音机：刚发出的留言时间" });
  // 内核创建时拿到文案；intl 只在切换语言时变，那时内核随之重建
  const engineLabels = useMemo(() => buildEngineLabels(intl, locale), [intl, locale]);
  const [content, setContent] = useState("");
  const [submittedCount, setSubmittedCount] = useState(0);
  const [localPending, setLocalPending] = useState<MessageInput[]>([]);
  const [previewSeed, setPreviewSeed] = useState(randomSeed);
  const [scanning, setScanning] = useState(false);

  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const freqRef = useRef<HTMLSpanElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const byRef = useRef<HTMLDivElement>(null);
  const msgRef = useRef<HTMLDivElement>(null);
  const barsRef = useRef<HTMLElement[]>([]);
  const stereoRef = useRef<HTMLSpanElement>(null);
  const liveRef = useRef<HTMLParagraphElement>(null);
  const engineRef = useRef<RadioEngine | null>(null);
  const tuneToIdRef = useRef<number | null>(null);

  const toneRef = useRef<ToneModule | null>(null);
  const samplerRef = useRef<PianoSampler | null>(null);
  const samplerLoadingRef = useRef<Promise<void> | null>(null);
  const samplerReadyRef = useRef(false);
  const disposedRef = useRef(false);

  const stations = useMemo(
    () => buildStations(initialMessages, pendingMessages, localPending, { anonymous: anonymousLabel, justNow: justNowLabel }),
    [initialMessages, pendingMessages, localPending, anonymousLabel, justNowLabel],
  );
  const visibleCount = stations.length;
  // 「在 FM xx.x 播出」：预告一个空频率并随表单提交；服务端发现被占了会改分配
  const previewFrequency = useMemo(
    () => assignRadioFrequency(previewSeed, stations.map((s) => s.f)),
    [previewSeed, stations],
  );

  const isLoggedIn = Boolean(currentUser);
  const isSubmitting = fetcher.state !== "idle";
  const remainingToday = Math.max(0, (limitStatus?.remainingToday ?? 0) - submittedCount);
  const length = [...content].length;
  const canSubmit = isLoggedIn && remainingToday > 0 && content.trim().length > 0 && !isSubmitting && previewFrequency !== null;

  /* ----- 钢琴采样：进入视口附近才加载，卸载时 dispose（参照问答区 question.tsx） ----- */
  const loadSampler = useCallback(() => {
    if (samplerReadyRef.current || samplerLoadingRef.current) {
      return samplerLoadingRef.current ?? Promise.resolve();
    }
    samplerLoadingRef.current = import("tone")
      .then((Tone) => {
        if (disposedRef.current) return;
        toneRef.current = Tone;
        return new Promise<void>((resolve) => {
          samplerRef.current = new Tone.Sampler({
            urls: PIANO_SAMPLE_URLS,
            release: 1,
            onload: () => {
              samplerReadyRef.current = true;
              resolve();
            },
          }).toDestination();
        });
      })
      .catch((error) => {
        samplerLoadingRef.current = null;
        console.warn("Radio piano samples failed to load:", error);
      });
    return samplerLoadingRef.current;
  }, []);

  const playNote = useCallback((note: string) => {
    if (!samplerReadyRef.current || !toneRef.current || !samplerRef.current) {
      void loadSampler();
      return;
    }
    const tone = toneRef.current;
    const sampler = samplerRef.current;
    // 没有用户手势前 Tone.start() 不会成功，静默跳过即可
    if (tone.getContext().state !== "running") return;
    try {
      sampler.triggerAttackRelease(note, "8n");
    } catch (error) {
      console.warn("Radio piano note failed to play:", error);
    }
  }, [loadSampler]);

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

  /* ----- 收音机内核 ----- */
  useEffect(() => {
    const canvas = canvasRef.current;
    const freq = freqRef.current;
    const view = viewRef.current;
    const text = textRef.current;
    const by = byRef.current;
    const msg = msgRef.current;
    const stereo = stereoRef.current;
    const live = liveRef.current;
    const section = sectionRef.current;
    if (!canvas || !freq || !view || !text || !by || !msg || !stereo || !live || !section) return;

    const engine = createRadioEngine(
      { canvas, freq, view, text, by, msg, stereo, live, bars: barsRef.current },
      { onScanChange: setScanning, playNote, labels: engineLabels },
    );
    engineRef.current = engine;

    // 只在收音机看得见时跑动画和沙沙声；快到视口时顺便预加载钢琴采样
    let observer: IntersectionObserver | null = null;
    if ("IntersectionObserver" in window) {
      observer = new IntersectionObserver(([entry]) => {
        if (!entry) return;
        engine.setVisible(entry.isIntersecting);
        if (entry.isIntersecting) void loadSampler();
      }, { rootMargin: "200px 0px" });
      observer.observe(section);
    } else {
      engine.setVisible(true);
      void loadSampler();
    }

    return () => {
      observer?.disconnect();
      engine.destroy();
      engineRef.current = null;
    };
  }, [loadSampler, playNote, engineLabels]);

  useEffect(() => {
    engineRef.current?.setStations(stations);
    // 刚播出的留言进了电台列表后，指针扫过去，再弹一个上行的两音
    const id = tuneToIdRef.current;
    if (id === null) return;
    const station = stations.find((s) => s.key === `m-${id}`);
    if (!station) return;
    tuneToIdRef.current = null;
    engineRef.current?.tuneTo(station.f);
    playNote("G4");
    window.setTimeout(() => playNote("C5"), 140);
  }, [stations, playNote]);

  useEffect(() => {
    setSubmittedCount(0);
  }, [limitStatus?.remainingToday, currentUser?.id]);

  const submittedMessage = actionData?.message;
  useEffect(() => {
    if (!submittedMessage) return;
    setLocalPending((current) => current.some((m) => String(m.id) === String(submittedMessage.id))
      ? current
      : [...current, { ...submittedMessage, createdAt: new Date().toISOString() }]);
    setContent("");
    setSubmittedCount((count) => count + 1);
    setPreviewSeed(randomSeed());
    tuneToIdRef.current = submittedMessage.id;
  }, [submittedMessage]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = content.trim();
    if (!canSubmit || !trimmed || previewFrequency === null) return;
    fetcher.submit(
      { content: trimmed, frequency: previewFrequency.toFixed(1) },
      { method: "post", action: localizePath("/messages", locale) },
    );
  }

  // 浏览器要求先有用户手势才能出声：第一次在收音机上按下时同时解锁沙沙声和钢琴
  const arm = () => {
    engineRef.current?.arm();
    void toneRef.current?.start().catch(() => undefined);
  };

  return (
    <section ref={sectionRef} className="gr" aria-label={intl.formatMessage({ defaultMessage: "留言板", description: "留言收音机区块的无障碍标签" })} onPointerDownCapture={arm} onKeyDownCapture={arm}>
      <h2 className="text-[28px] font-semibold leading-tight tracking-tight text-primary-950 md:text-4xl lg:text-5xl">
        <FormattedMessage
          defaultMessage="慢慢拨动旋钮，<br></br>和穿透虚空发出的电波对频"
          description="留言收音机标题，<br></br> 是手机上的换行位置"
          values={{ br: () => <br className="md:hidden" /> }}
        />
      </h2>

      <div className="gr-radio">
        <div className="gr-top">
          <div className="gr-freq"><small>FM</small><span ref={freqRef}>88.0</span></div>
          <div className="gr-gauge" aria-hidden="true">
            <div className="gr-bars">
              {[20, 40, 60, 80, 100].map((height, index) => (
                <i
                  key={height}
                  ref={(el) => { if (el) barsRef.current[index] = el; }}
                  style={{ height: `${height}%` }}
                />
              ))}
            </div>
            <span ref={stereoRef} className="gr-st">● STEREO</span>
          </div>
        </div>

        <div ref={msgRef} className="gr-msg">
          <div ref={viewRef} className="gr-view" aria-hidden="true">
            <div ref={textRef} className="gr-text" />
          </div>
          <div ref={byRef} className="gr-by" aria-hidden="true" />
          <p ref={liveRef} className="sr-only" aria-live="polite" />
        </div>

        <div className="gr-dial">
          <canvas
            ref={canvasRef}
            tabIndex={0}
            role="slider"
            aria-label={intl.formatMessage({ defaultMessage: "调频刻度，左右方向键调节，按住 Shift 一次调 1 MHz", description: "留言收音机刻度滑块的无障碍标签" })}
            aria-valuemin={88}
            aria-valuemax={108}
            aria-valuenow={88}
          />
        </div>

        <div className="gr-ctl">
          <button
            type="button"
            className={`gr-scan${scanning ? " is-on" : ""}`}
            onClick={() => engineRef.current?.toggleScan()}
            aria-pressed={scanning}
          >
            <span className="gr-scan__ic" aria-hidden="true">{scanning ? "■" : "▶"}</span>
            {scanning
              ? intl.formatMessage({ defaultMessage: "停", description: "留言收音机：停止自动巡台按钮" })
              : intl.formatMessage({ defaultMessage: "巡台", description: "留言收音机：自动扫描电台按钮" })}
          </button>

          {visibleCount > 1 && (
            <div className="gr-seek">
              <button type="button" aria-label={intl.formatMessage({ defaultMessage: "上一台", description: "留言收音机：跳到上一个电台" })} onClick={() => engineRef.current?.seek(-1)}>
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M13 8H3M7 4 3 8l4 4" /></svg>
              </button>
              <button type="button" aria-label={intl.formatMessage({ defaultMessage: "下一台", description: "留言收音机：跳到下一个电台" })} onClick={() => engineRef.current?.seek(1)}>
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4" /></svg>
              </button>
            </div>
          )}

          <form className="gr-form" onSubmit={handleSubmit}>
            <label htmlFor="gr-input">
              <FormattedMessage
                defaultMessage="在 FM <b>{frequency}</b> 播出："
                description="留言收音机输入框标签，{frequency} 是预告的频率"
                values={{ frequency: previewFrequency?.toFixed(1) ?? "—", b: (chunks) => <b>{chunks}</b> }}
              />
            </label>
            <input
              id="gr-input"
              value={content}
              onChange={(event) => setContent([...event.target.value].slice(0, RADIO_MESSAGE_MAX_LENGTH).join(""))}
              onFocus={() => engineRef.current?.stopScan()}
              placeholder={
                !isLoggedIn
                  ? intl.formatMessage({ defaultMessage: "登录后就能播出", description: "留言收音机输入框占位：未登录" })
                  : remainingToday <= 0
                    ? intl.formatMessage({ defaultMessage: "今天的电波发完了，明天再来", description: "留言收音机输入框占位：今日次数用完" })
                    : intl.formatMessage({ defaultMessage: "想说的话……", description: "留言收音机输入框占位" })
              }
              disabled={!isLoggedIn || remainingToday <= 0 || isSubmitting}
              autoComplete="off"
            />
            <small className="gr-len">{length}/{RADIO_MESSAGE_MAX_LENGTH}</small>
            {isLoggedIn ? (
              <button type="submit" className="gr-air" disabled={!canSubmit}>
                {isSubmitting
                  ? intl.formatMessage({ defaultMessage: "播出中", description: "留言收音机：提交中按钮" })
                  : remainingToday <= 0
                    ? intl.formatMessage({ defaultMessage: "今日已满", description: "留言收音机：今日次数用完的按钮" })
                    : intl.formatMessage({ defaultMessage: "播出", description: "留言收音机：提交留言按钮" })}
              </button>
            ) : (
              <Link className="gr-air" to={`/auth?returnTo=${encodeURIComponent(localizePath("/", locale))}`}>
                {intl.formatMessage({ defaultMessage: "登录后播出", description: "留言收音机：未登录时的登录链接" })}
              </Link>
            )}
          </form>
        </div>
        {actionData?.error && <p className="gr-error" role="alert">{actionData.error}</p>}
      </div>

      <style>{`
        .gr { --gr-ink: #141413; --gr-ink-60: rgba(20,20,19,.6); --gr-ink-40: rgba(20,20,19,.4); --gr-ink-25: rgba(20,20,19,.25);
          --gr-line: rgba(20,20,19,.12); --gr-bg-2: #f5f4ed; --gr-accent: #d97757;
          --gr-sans: "Inter", -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif;
          --gr-mono: ui-monospace, "Cascadia Mono", Consolas, "Microsoft YaHei", monospace;
          color: var(--gr-ink); }
        .gr-radio { margin-top: 56px; user-select: none; font-family: var(--gr-sans); }
        .gr-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; }
        .gr-freq { font: 900 clamp(76px, 11vw, 148px)/.86 "Inter", "Arial Black", sans-serif; letter-spacing: -0.055em; font-variant-numeric: tabular-nums; }
        .gr-freq small { font-size: .19em; letter-spacing: .1em; margin-right: .45em; vertical-align: .34em; color: var(--gr-ink-40); font-weight: 700; }
        .gr-gauge { display: flex; flex-direction: column; align-items: flex-end; gap: 12px; padding-top: 12px; font: 11px/1 var(--gr-mono); color: var(--gr-ink-40); letter-spacing: .14em; }
        .gr-bars { display: flex; gap: 4px; align-items: flex-end; height: 22px; }
        .gr-bars i { width: 6px; background: rgba(20,20,19,.1); transition: background 120ms; }
        .gr-bars i.is-on { background: var(--gr-ink); }
        .gr-st.is-on { color: var(--gr-accent); }

        .gr-msg { padding: 36px 0 30px; }
        /* 留言区固定高度：不管多长，收音机都不变形；放不下就在里面滚 */
        .gr-view { height: 112px; overflow: hidden; display: flex; align-items: center; }
        .gr-view.is-scrolling { align-items: flex-start;
          -webkit-mask-image: linear-gradient(transparent, #000 12px, #000 calc(100% - 16px), transparent);
                  mask-image: linear-gradient(transparent, #000 12px, #000 calc(100% - 16px), transparent); }
        .gr-text { font-weight: 900; letter-spacing: -0.03em; line-height: 1.25; font-size: 42px; overflow-wrap: anywhere; white-space: pre-wrap; }
        .gr-text--long { font-size: 30px; }
        .gr-text--hidden { font-family: var(--gr-mono); letter-spacing: .3em; }
        /* 噪声：被观测到的真字 <b> 随停留时间变深，闪现的真字 <u> 半透明，没坍缩的位置 <i> 是闪烁的符号 */
        .gr-text--noise { --seen: 0; font-family: var(--gr-mono); font-weight: 700; letter-spacing: .02em; }
        .gr-text--noise b { font-weight: 900; color: rgba(20,20,19, calc(.3 + .7 * var(--seen))); }
        .gr-text--noise u { text-decoration: none; font-weight: 900; color: rgba(20,20,19,.5); }
        .gr-text--noise i { font-style: normal; color: rgba(20,20,19, calc(.22 - .1 * var(--seen))); }
        .gr-by { margin-top: 14px; font-size: 14px; color: var(--gr-ink-60); min-height: 20px; }
        .gr-by em { font-style: normal; color: var(--gr-accent); }

        .gr-dial canvas { display: block; width: 100%; height: 112px; cursor: ew-resize; touch-action: pan-y; outline: none; border-radius: 4px; }
        .gr-dial canvas:focus-visible { box-shadow: 0 0 0 2px var(--gr-line); }

        .gr-ctl { display: flex; flex-wrap: wrap; align-items: center; gap: 12px 20px; margin-top: 24px; padding: 24px 0; border-top: 1px solid var(--gr-line); border-bottom: 1px solid var(--gr-line); }
        /* 巡台按钮：描边圆角；巡台时左边亮一个跳动的陶土橙点（黑底只留给「播出」） */
        .gr-scan { height: 44px; padding: 0 18px; border-radius: 999px; border: 1px solid var(--gr-line); background: transparent; color: var(--gr-ink);
          cursor: pointer; font: inherit; font-weight: 700; font-size: 14px; white-space: nowrap; display: inline-flex; align-items: center; gap: 8px; transition: background 200ms, border-color 200ms; }
        .gr-scan:hover { background: var(--gr-bg-2); }
        .gr-scan__ic { font-size: 11px; }
        .gr-scan.is-on { border-color: var(--gr-ink); }
        .gr-scan.is-on .gr-scan__ic { color: var(--gr-accent); animation: gr-pulse 1.2s ease-in-out infinite; }
        @keyframes gr-pulse { 50% { opacity: .25; } }
        .gr-seek { display: flex; gap: 8px; }
        .gr-seek button { width: 44px; height: 44px; border-radius: 50%; border: 1px solid var(--gr-line); background: transparent; color: var(--gr-ink); cursor: pointer; display: grid; place-items: center; transition: background 200ms; }
        .gr-seek button:hover { background: var(--gr-bg-2); }
        .gr-seek svg { width: 16px; height: 16px; }
        .gr-scan:focus-visible, .gr-seek button:focus-visible, .gr-air:focus-visible { outline: 2px solid var(--gr-accent); outline-offset: 2px; }

        .gr-form { flex: 1; display: flex; align-items: center; gap: 14px; min-width: 280px; }
        .gr-form label { font-size: 14px; color: var(--gr-ink-60); white-space: nowrap; }
        .gr-form label b { color: var(--gr-ink); font-weight: 900; font-variant-numeric: tabular-nums; }
        .gr-form input { flex: 1; min-width: 0; background: transparent; border: 0; border-bottom: 1px solid var(--gr-ink-25); color: var(--gr-ink); font-size: 16px; font-weight: 600; padding: 10px 2px; outline: none; transition: border-color 200ms; user-select: text; }
        .gr-form input:focus { border-color: var(--gr-ink); }
        .gr-form input::placeholder { color: var(--gr-ink-25); }
        .gr-form input:disabled { cursor: not-allowed; }
        .gr-len { font: 12px/1 var(--gr-mono); color: var(--gr-ink-40); font-variant-numeric: tabular-nums; white-space: nowrap; }
        .gr-air { display: inline-flex; align-items: center; border: 0; border-radius: 999px; background: var(--gr-ink); color: #fff; padding: 12px 20px; font-weight: 900; font-size: 15px; cursor: pointer; white-space: nowrap; text-decoration: none; transition: transform 120ms, opacity 200ms; }
        .gr-air:active { transform: translateY(1px); }
        .gr-air:disabled { opacity: .45; cursor: not-allowed; }
        .gr-air::before { content: ""; display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: var(--gr-accent); margin-right: 8px; }
        .gr-error { margin: 14px 0 0; font-size: 13px; color: #a4583e; }

        @media (max-width: 760px) {
          .gr-radio { margin-top: 36px; }
          .gr-text { font-size: 28px; }
          .gr-text--long { font-size: 22px; }
          .gr-form { flex-wrap: wrap; min-width: 100%; }
          .gr-form label { width: 100%; }
        }
        @media (prefers-reduced-motion: reduce) {
          .gr-scan.is-on .gr-scan__ic { animation: none; }
        }
      `}</style>
    </section>
  );
}
