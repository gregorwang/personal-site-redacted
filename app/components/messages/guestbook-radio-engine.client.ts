/**
 * 留言收音机的命令式内核：刻度 canvas、噪声文字、巡台、长留言滚动、沙沙声。
 * 每帧都要改 DOM，所以不走 React state；React 组件只负责数据、表单和钢琴采样，
 * 通过 setStations / tuneTo / toggleScan 等方法驱动这里。
 * 交互和数值都来自 .tmp-guestbook-radio/guestbook-radio-v10.html 原型。
 */
import { FOOTER_WORDS } from "~/data/footer-words";
import { RADIO_HIDDEN_STATIONS, RADIO_LOCK, RADIO_MAX, RADIO_MIN, radioHash } from "~/lib/guestbook-radio";

export type RadioStation = {
  key: string;
  f: number;
  text: string;
  author?: string;
  time?: string;
  pending?: boolean;
  hidden?: boolean;
};

export type RadioEngineElements = {
  canvas: HTMLCanvasElement;
  freq: HTMLElement;
  view: HTMLElement;
  text: HTMLElement;
  by: HTMLElement;
  msg: HTMLElement;
  bars: HTMLElement[];
  stereo: HTMLElement;
  /** 屏幕阅读器用：只在锁定一个新电台时更新，避免每秒 18 次的噪声刷屏 */
  live: HTMLElement;
};

/** 内核里写进 DOM / canvas 的界面文案，由 React 组件按当前语言传进来。 */
export type RadioEngineLabels = {
  /** 悬停标签和署名里自己的待公开留言 */
  selfPending: string;
  /** 没锁定任何电台时的署名行 */
  static: string;
  /** 隐藏电台的署名 */
  unknownSource: string;
  /** 「你」 */
  self: string;
  /** 待公开留言署名后的提示 */
  pendingNote: string;
  /** 屏幕阅读器播报：FM 频率 + 来源 + 内容 */
  announce: (frequency: string, source: string, text: string) => string;
  /** 88.0 上能拼出来的开场句，不超过 16 个字符（FRAG），否则 88.0 显示不全 */
  opening: string;
  /** 开场句里一直定住的字的下标 */
  openingPinned: readonly number[];
};

export type RadioEngineOptions = {
  onScanChange: (scanning: boolean) => void;
  playNote: (note: string) => void;
  labels: RadioEngineLabels;
};

export type RadioEngine = {
  setStations: (stations: RadioStation[]) => void;
  seek: (dir: 1 | -1) => void;
  tuneTo: (frequency: number) => void;
  toggleScan: () => void;
  stopScan: () => void;
  /** 第一次在收音机上有操作时调用：浏览器要求先有用户手势才能出声 */
  arm: () => void;
  /** 收音机滚出视口时停掉动画和沙沙声 */
  setVisible: (visible: boolean) => void;
  destroy: () => void;
};

const INK = "20,20,19";
const ACCENT = "#d97757";
const BG = "#faf9f5";
const PIANO_NOTES = ["C4", "D4", "E4", "F4", "G4", "A4"];

const GLYPH_HALF = "+-/<>#%*=~ｴﾐﾘｱ".split("");
const GLYPH_FULL = "＋－／＜＞＃％＊＝～".split("");
const glyphSet = (ch: string) => (ch.charCodeAt(0) > 0xff ? GLYPH_FULL : GLYPH_HALF);
const randomGlyph = (ch: string) => {
  const set = glyphSet(ch);
  return set[(Math.random() * set.length) | 0];
};
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);

/* 铺满整条刻度的噪声文本。开头一句落在 88.0（打开就停在这里），盯着看能拼出来，引导人留言；
   开头一句跟着页面语言，后面是网站标题和页脚完整词表（中文），正面负面的词都保留。 */
const buildNoiseText = (opening: string) => [...([opening, "将我的爱弃置于此", ...FOOTER_WORDS].join(" · ") + " · ")];

/* 可观测的噪声：每个 0.1 MHz 固定对应 16 个字，相邻频率错开 2 个字。
   停得越久，锚点字一个接一个定住（最多约四分之一），其余的字在符号里闪现真身、永远不停住。 */
const FRAG = 16;
const STEP = 2;
const ANCHOR_SHARE = 0.25;
const FLASH_MAX = 0.22;

// 刻度布局：上面是信号频谱，下面是刻度线
const H = 112;
const TICK = 84;
const FLOOR = 52;
const PEAK = 30;
const PAD = 14;
const STEP_PX = 3;

const SCAN_SPEED = 2.5 / 1000; // 巡台 2.5 MHz/s，约 8 秒扫一圈
const SCAN_HOLD = 5000; // 遇到留言停 5 秒
const NOISE_VOLUME = 0.02; // 沙沙声压到很轻

export function createRadioEngine(els: RadioEngineElements, opts: RadioEngineOptions): RadioEngine {
  const ctx = els.canvas.getContext("2d");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const NOISE_TEXT = buildNoiseText(opts.labels.opening);
  const hiddenStations: RadioStation[] = RADIO_HIDDEN_STATIONS.map((s) => ({ key: `hidden-${s.f}`, f: s.f, text: s.text, hidden: true }));

  let stations: RadioStation[] = [...hiddenStations];
  let f = RADIO_MIN;
  let W = 0;
  let dpr = 1;
  let raf = 0;
  let inView = false;
  let destroyed = false;

  let sweep: { from: number; to: number; t0: number; dur: number } | null = null;
  let scanning = false;
  let scanHold = 0;
  let scanAt = 0;
  let dragging = false;
  let hoverMsg = false;
  let hoverKey: string | null = null;
  let lastLockKey: string | null = null;
  let lastLiveKey: string | null = null;
  let lastShow = 0;
  let lastFrame = 0;
  let lastFreqText = "";
  let lastBy = "";
  let obsIdx = -1;
  let obsSince = 0;
  let seen = 0;
  let floorNoise: number[] = [];
  let spikes = new Set<string>();
  const scroll = { key: null as string | null, y: 0, phase: "start" as "start" | "run" | "end", t: 0 };

  // 沙沙声：WebAudio 白噪声 → 700Hz 低通，音量很轻
  let actx: AudioContext | null = null;
  let noiseGain: GainNode | null = null;
  let staticLevel = 0;
  let armed = false;

  const visible = () => stations.filter((s) => !s.hidden).sort((a, b) => a.f - b.f);
  const xOf = (v: number) => PAD + ((v - RADIO_MIN) / (RADIO_MAX - RADIO_MIN)) * (W - PAD * 2);
  const fOf = (x: number) => Math.min(RADIO_MAX, Math.max(RADIO_MIN, RADIO_MIN + ((x - PAD) / (W - PAD * 2)) * (RADIO_MAX - RADIO_MIN)));
  const clampF = (v: number) => Math.min(RADIO_MAX, Math.max(RADIO_MIN, Math.round(v * 10) / 10));

  function nearest() {
    let best: RadioStation | null = null;
    let d = Infinity;
    stations.forEach((s) => {
      const dd = Math.abs(s.f - f);
      if (dd < d) { d = dd; best = s; }
    });
    return { s: best as RadioStation | null, lock: Math.max(0, 1 - d / RADIO_LOCK) };
  }

  /* ----- 声音 ----- */
  function ensureNoise() {
    if (noiseGain || !armed || destroyed) return;
    try {
      const AudioCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtor) return;
      actx = new AudioCtor();
      const buffer = actx.createBuffer(1, actx.sampleRate * 2, actx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
      const src = actx.createBufferSource();
      src.buffer = buffer;
      src.loop = true;
      const lowpass = actx.createBiquadFilter();
      lowpass.type = "lowpass";
      lowpass.frequency.value = 700;
      lowpass.Q.value = 0.4;
      noiseGain = actx.createGain();
      noiseGain.gain.value = 0;
      src.connect(lowpass).connect(noiseGain).connect(actx.destination);
      src.start();
    } catch (error) {
      console.warn("Radio static failed to start:", error);
    }
  }
  function setStatic() {
    if (!noiseGain || !actx) return;
    const target = inView && !document.hidden ? staticLevel * NOISE_VOLUME : 0;
    noiseGain.gain.setTargetAtTime(target, actx.currentTime, 0.04);
  }

  /* ----- 信号频谱 -----
     两台之间是一条微微抖动的底噪线，有留言的频率鼓起一个信号峰，宽度就是收台范围（±RADIO_LOCK）。
     峰的范围内随便点，指针都会被吸到峰顶。隐藏电台不鼓包，只偶尔冒一下几乎看不见的小尖。 */
  const bump = (s: RadioStation, v: number) => {
    const d = Math.abs(v - s.f) / RADIO_LOCK;
    return d >= 1 ? 0 : Math.pow(Math.cos((d * Math.PI) / 2), 2);
  };
  function refreshFloor() {
    const n = Math.ceil(W / STEP_PX) + 2;
    floorNoise = Array.from({ length: n }, (_, i) => (reduceMotion ? (radioHash(i, 3) - 0.5) * 2 : (Math.random() - 0.5) * 3.2));
    spikes = new Set(reduceMotion ? [] : hiddenStations.filter(() => Math.random() < 0.05).map((s) => s.key));
  }
  const stationAt = (v: number) => visible().find((s) => Math.abs(s.f - v) < RADIO_LOCK) ?? null;

  function drawDial(lockKey: string | null) {
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const t = performance.now();
    const vis = visible();
    const amp = (s: RadioStation) => (s.pending && !reduceMotion ? 0.82 + (0.18 * (Math.sin(t / 300) + 1)) / 2 : 1);
    const yAt = (x: number, i: number) => {
      const v = fOf(x);
      let sig = 0;
      vis.forEach((s) => { sig = Math.max(sig, bump(s, v) * amp(s)); });
      return FLOOR - sig * PEAK + (floorNoise[i] ?? 0) * (1 - sig);
    };

    // 每个信号峰下面填一层淡色
    vis.forEach((s) => {
      const x0 = xOf(s.f - RADIO_LOCK);
      const x1 = xOf(s.f + RADIO_LOCK);
      const on = s.key === lockKey;
      const hov = s.key === hoverKey;
      ctx.fillStyle = s.pending ? `rgba(217,119,87,${on || hov ? 0.22 : 0.12})` : `rgba(${INK},${on ? 0.14 : hov ? 0.1 : 0.05})`;
      ctx.beginPath();
      ctx.moveTo(x0, FLOOR);
      for (let x = x0; x <= x1; x += 1) ctx.lineTo(x, FLOOR - bump(s, fOf(x)) * PEAK * amp(s));
      ctx.lineTo(x1, FLOOR);
      ctx.closePath();
      ctx.fill();
    });

    // 整条频谱线
    ctx.strokeStyle = `rgba(${INK},.38)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0, x = PAD; x <= W - PAD; i += 1, x += STEP_PX) {
      if (i) ctx.lineTo(x, yAt(x, i));
      else ctx.moveTo(x, yAt(x, i));
    }
    ctx.stroke();

    // 峰顶描深：锁定、悬停的那台最深；待公开的是陶土橙
    vis.forEach((s) => {
      const x0 = xOf(s.f - RADIO_LOCK);
      const x1 = xOf(s.f + RADIO_LOCK);
      const on = s.key === lockKey;
      const hov = s.key === hoverKey;
      ctx.strokeStyle = s.pending ? ACCENT : `rgba(${INK},${on ? 0.95 : hov ? 0.75 : 0.5})`;
      ctx.lineWidth = on || hov ? 2 : 1.5;
      ctx.beginPath();
      for (let x = x0; x <= x1; x += 1) {
        const y = FLOOR - bump(s, fOf(x)) * PEAK * amp(s);
        if (x === x0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    });
    ctx.lineWidth = 1;

    // 隐藏电台偶尔冒一下的小尖
    hiddenStations.forEach((s) => {
      if (!spikes.has(s.key)) return;
      const x = Math.round(xOf(s.f)) + 0.5;
      ctx.strokeStyle = `rgba(${INK},.3)`;
      ctx.beginPath();
      ctx.moveTo(x, FLOOR);
      ctx.lineTo(x, FLOOR - 7);
      ctx.stroke();
    });

    // 刻度
    ctx.font = "11px ui-monospace, Consolas, monospace";
    ctx.textAlign = "center";
    for (let i = 0; i <= 200; i += 1) {
      const x = Math.round(xOf(RADIO_MIN + i / 10)) + 0.5;
      const major = i % 10 === 0;
      const mid = i % 5 === 0;
      ctx.strokeStyle = `rgba(${INK},${major ? 0.75 : mid ? 0.4 : 0.18})`;
      ctx.beginPath();
      ctx.moveTo(x, TICK);
      ctx.lineTo(x, TICK - (major ? 20 : mid ? 12 : 6));
      ctx.stroke();
      if (i % 20 === 0) {
        ctx.fillStyle = `rgba(${INK},.45)`;
        ctx.fillText(String(RADIO_MIN + i / 10), x, TICK + 20);
      }
    }
    ctx.strokeStyle = `rgba(${INK},.35)`;
    ctx.beginPath();
    ctx.moveTo(PAD, TICK + 0.5);
    ctx.lineTo(W - PAD, TICK + 0.5);
    ctx.stroke();

    // 指针
    const nx = xOf(f);
    ctx.fillStyle = ACCENT;
    ctx.fillRect(nx - 1, 6, 2, TICK);
    ctx.beginPath();
    ctx.arc(nx, 6, 4, 0, 7);
    ctx.fill();

    // 悬停标签：谁的台
    const hover = hoverKey ? vis.find((s) => s.key === hoverKey) : null;
    if (hover) {
      const label = `FM ${hover.f.toFixed(1)} · ${hover.pending ? opts.labels.selfPending : hover.author ?? ""}`;
      ctx.font = "600 12px Inter, -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif";
      const w = ctx.measureText(label).width + 14;
      const lx = Math.min(W - PAD - w / 2, Math.max(PAD + w / 2, xOf(hover.f)));
      ctx.fillStyle = BG;
      ctx.fillRect(lx - w / 2, 2, w, 18);
      ctx.fillStyle = hover.pending ? ACCENT : `rgb(${INK})`;
      ctx.fillText(label, lx, 15);
    }
  }

  function noiseHTML(idx: number, level: number) {
    const frag = Array.from({ length: FRAG }, (_, k) => NOISE_TEXT[(idx * STEP + k) % NOISE_TEXT.length]);
    const order = frag.map((_, k) => k).filter((k) => frag[k] !== " ").sort((a, b) => radioHash(idx, a) - radioHash(idx, b));
    const anchors = new Set(order.slice(0, Math.floor(level * Math.round(order.length * ANCHOR_SHARE) + 1e-6)));
    if (idx === 0) opts.labels.openingPinned.forEach((k) => { if (k < FRAG) anchors.add(k); });
    const flash = 0.03 + level * (FLASH_MAX - 0.03);
    return frag.map((ch, k) => {
      if (ch === " ") return " ";
      if (anchors.has(k)) return `<b>${esc(ch)}</b>`;
      if (reduceMotion) return `<i>${glyphSet(ch)[(radioHash(k, idx) * 10) | 0]}</i>`;
      if (Math.random() < flash) return `<u>${esc(ch)}</u>`;
      return `<i>${randomGlyph(ch)}</i>`;
    }).join("");
  }

  /* 署名行只在内容变化时才重写 DOM；作者名是用户输入，一律走 textContent。 */
  function setBy(s: RadioStation | null) {
    const key = s ? `${s.key}|${s.author}|${s.time}` : "noise";
    if (key === lastBy) return;
    lastBy = key;
    els.by.replaceChildren();
    if (!s) { els.by.textContent = opts.labels.static; return; }
    if (s.hidden) { els.by.textContent = `— ${opts.labels.unknownSource}`; return; }
    if (s.pending) {
      els.by.appendChild(document.createTextNode(`— ${opts.labels.self} · ${s.time ?? ""} · `));
      const em = document.createElement("em");
      em.textContent = opts.labels.pendingNote;
      els.by.appendChild(em);
      return;
    }
    els.by.textContent = `— ${s.author ?? ""} · ${s.time ?? ""}`;
  }

  /* 长留言：固定高度，锁定后先停 1.2 秒，再以 26px/s 往上走，到底停 1.6 秒后回到开头；鼠标放上去就暂停。 */
  function updateScroll(dt: number, key: string | null) {
    if (key !== scroll.key) { scroll.key = key; scroll.y = 0; scroll.phase = "start"; scroll.t = 0; }
    const over = key ? els.text.offsetHeight - els.view.clientHeight : 0;
    if (over <= 2) {
      els.view.classList.remove("is-scrolling");
      els.text.style.transform = "";
      scroll.y = 0;
      return;
    }
    els.view.classList.add("is-scrolling");
    if (!hoverMsg && !reduceMotion) {
      scroll.t += dt;
      if (scroll.phase === "start" && scroll.t > 1200) { scroll.phase = "run"; scroll.t = 0; }
      else if (scroll.phase === "run") {
        scroll.y = Math.min(over, scroll.y + dt * 0.026);
        if (scroll.y >= over) { scroll.phase = "end"; scroll.t = 0; }
      } else if (scroll.phase === "end" && scroll.t > 1600) { scroll.phase = "start"; scroll.t = 0; scroll.y = 0; }
    }
    els.text.style.transform = `translateY(${-scroll.y}px)`;
  }

  /* ----- 巡台 -----
     像真收音机一样匀速往右扫；扫过一条留言的中心就停下（钢琴音由锁定逻辑负责），停 5 秒再走。
     长留言要等它滚完一轮，鼠标放在留言上也会一直等。扫到 108 从 88 重来。
     隐藏电台不停，扫过时只能瞥一眼。减少动画时不扫，直接一台一台跳。 */
  function scanStep(now: number) {
    const dt = scanAt ? Math.min(100, now - scanAt) : 0;
    scanAt = now;
    if (now < scanHold) {
      const busy = hoverMsg || (els.view.classList.contains("is-scrolling") && scroll.phase !== "end");
      if (busy) scanHold = Math.max(scanHold, now + 600);
      return;
    }
    if (reduceMotion) {
      if (visible().length) seek(1, true);
      scanHold = now + SCAN_HOLD;
      return;
    }
    const prev = f;
    let next = f + dt * SCAN_SPEED;
    const hit = visible().find((s) => s.f > prev && s.f <= next);
    if (hit) { f = hit.f; scanHold = now + SCAN_HOLD; return; }
    if (next > RADIO_MAX) next = RADIO_MIN;
    f = next;
  }

  function frame(now: number) {
    raf = requestAnimationFrame(frame);
    if (!W) return;
    if (scanning && !sweep && !dragging) scanStep(now);
    if (sweep) {
      const k = Math.min(1, (now - sweep.t0) / sweep.dur);
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      f = sweep.from + (sweep.to - sweep.from) * e;
      if (k >= 1) sweep = null;
    }

    // 观测：指针停在同一个 0.1 MHz 上的时间，约 5 秒到上限
    const idx = Math.round((f - RADIO_MIN) * 10);
    if (idx !== obsIdx) { obsIdx = idx; obsSince = now; }
    const raw = Math.min(1, Math.max(0, (now - obsSince - 200) / 4800));
    seen = raw * raw * (3 - 2 * raw);

    const { s, lock } = nearest();
    staticLevel = lock > 0 ? 1 - lock : 1 - seen * 0.6;
    setStatic();
    const cur = s && lock > 0.5 && !s.hidden ? s : null;
    drawDial(cur?.key ?? null);

    const freqText = f.toFixed(1);
    if (freqText !== lastFreqText) {
      lastFreqText = freqText;
      els.freq.textContent = freqText;
      els.canvas.setAttribute("aria-valuenow", freqText);
      els.canvas.setAttribute("aria-valuetext", `FM ${freqText}`);
    }

    // 信号格冷热提示：离留言 3 MHz 以内开始亮 1～2 格，进入收台范围后再从 2 格涨到 5 格
    let dv = Infinity;
    visible().forEach((v) => { dv = Math.min(dv, Math.abs(v.f - f)); });
    const warm = Math.max(0, Math.min(1, 1 - (dv - RADIO_LOCK) / 2.5));
    const strength = lock > 0 ? 0.4 + 0.6 * lock : 0.4 * warm;
    els.bars.forEach((b, i) => b.classList.toggle("is-on", strength > 0.02 && i < Math.ceil(strength * 5)));
    els.stereo.classList.toggle("is-on", lock > 0.95);

    if (s && lock > 0.95 && lastLockKey !== s.key) {
      lastLockKey = s.key;
      opts.playNote(PIANO_NOTES[stations.indexOf(s) % PIANO_NOTES.length]);
      if (lastLiveKey !== s.key) {
        lastLiveKey = s.key;
        const source = s.hidden ? opts.labels.unknownSource : s.pending ? opts.labels.selfPending : s.author ?? "";
        els.live.textContent = opts.labels.announce(s.f.toFixed(1), source, s.text);
      }
    }
    if (lock < 0.5) { lastLockKey = null; lastLiveKey = null; }

    const dt = lastFrame ? Math.min(100, now - lastFrame) : 0;
    lastFrame = now;
    updateScroll(dt, s && lock > 0.95 && !s.hidden ? s.key : null);

    // 文字每秒刷新约 18 次
    if (now - lastShow < 55) return;
    lastShow = now;
    refreshFloor();
    if (!s || lock <= 0) {
      els.text.className = "gr-text gr-text--noise";
      els.text.style.setProperty("--seen", seen.toFixed(3));
      els.text.innerHTML = noiseHTML(idx, seen);
      setBy(null);
      els.by.style.opacity = (1 - seen).toFixed(3);
      return;
    }
    els.text.style.removeProperty("--seen");
    const miss = Math.pow(1 - lock, 1.4);
    els.text.className = `gr-text${s.hidden ? " gr-text--hidden" : ""}${[...s.text].length > 26 ? " gr-text--long" : ""}`;
    els.text.textContent = [...s.text].map((ch) => (ch !== " " && Math.random() < miss ? randomGlyph(ch) : ch)).join("");
    els.by.style.opacity = String(Math.max(0, (lock - 0.5) * 2));
    setBy(s);
  }

  function tuneTo(to: number) {
    sweep = { from: f, to, t0: performance.now(), dur: reduceMotion ? 1 : 260 + Math.abs(to - f) * 70 };
  }
  function setScanning(next: boolean) {
    if (scanning === next) return;
    scanning = next;
    scanHold = 0;
    scanAt = 0;
    if (next) sweep = null;
    opts.onScanChange(next);
  }
  function stopScan() { setScanning(false); }
  function seek(dir: 1 | -1, auto = false) {
    if (!auto) stopScan();
    const vis = visible().map((s) => s.f);
    if (!vis.length) return;
    const next = dir > 0
      ? vis.find((v) => v > f + 0.05) ?? vis[0]
      : [...vis].reverse().find((v) => v < f - 0.05) ?? vis[vis.length - 1];
    tuneTo(next);
  }

  function resize() {
    const r = els.canvas.getBoundingClientRect();
    if (!r.width) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width;
    els.canvas.width = W * dpr;
    els.canvas.height = H * dpr;
    refreshFloor();
  }

  /* ----- 事件 ----- */
  const onPointerDown = (e: PointerEvent) => {
    stopScan();
    dragging = true;
    sweep = null;
    els.canvas.setPointerCapture(e.pointerId);
    f = fOf(e.offsetX);
  };
  const onPointerMove = (e: PointerEvent) => {
    if (dragging) { f = fOf(e.offsetX); return; }
    hoverKey = stationAt(fOf(e.offsetX))?.key ?? null;
    els.canvas.style.cursor = hoverKey ? "pointer" : "";
  };
  const onPointerLeave = () => {
    if (dragging) return;
    hoverKey = null;
    els.canvas.style.cursor = "";
  };
  // 松手时如果落在某个信号峰范围内，就自动对准峰顶（自动微调）
  const onPointerUp = () => {
    if (!dragging) return;
    dragging = false;
    const s = stationAt(f);
    if (s) tuneTo(s.f);
    else f = clampF(f);
  };
  // 手机上竖向滑动会被浏览器接管成页面滚动，这时取消拖动
  const onPointerCancel = () => { dragging = false; f = clampF(f); };
  // 滚轮只在刻度获得焦点（点过或 Tab 进来）时调台，避免滚页面时路过刻度被拦住
  const onWheel = (e: WheelEvent) => {
    if (document.activeElement !== els.canvas) return;
    e.preventDefault();
    stopScan();
    sweep = null;
    f = clampF(f + (e.deltaY > 0 ? 0.1 : -0.1));
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    stopScan();
    sweep = null;
    f = clampF(f + (e.key === "ArrowRight" ? 1 : -1) * (e.shiftKey ? 1 : 0.1));
  };
  const onMsgEnter = () => { hoverMsg = true; };
  const onMsgLeave = () => { hoverMsg = false; };
  const onVisibility = () => setStatic();

  els.canvas.addEventListener("pointerdown", onPointerDown);
  els.canvas.addEventListener("pointermove", onPointerMove);
  els.canvas.addEventListener("pointerleave", onPointerLeave);
  els.canvas.addEventListener("pointerup", onPointerUp);
  els.canvas.addEventListener("pointercancel", onPointerCancel);
  els.canvas.addEventListener("wheel", onWheel, { passive: false });
  els.canvas.addEventListener("keydown", onKeyDown);
  els.msg.addEventListener("mouseenter", onMsgEnter);
  els.msg.addEventListener("mouseleave", onMsgLeave);
  document.addEventListener("visibilitychange", onVisibility);
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(els.canvas);
  resize();

  return {
    setStations(list) {
      stations = [...hiddenStations, ...list];
      if (hoverKey && !stations.some((s) => s.key === hoverKey)) hoverKey = null;
    },
    seek: (dir) => seek(dir),
    tuneTo(frequency) {
      stopScan();
      tuneTo(frequency);
    },
    toggleScan() { setScanning(!scanning); },
    stopScan,
    arm() {
      if (armed) return;
      armed = true;
      ensureNoise();
      void actx?.resume().catch(() => undefined);
    },
    setVisible(next) {
      if (destroyed || inView === next) return;
      inView = next;
      if (next) {
        lastFrame = 0;
        raf = requestAnimationFrame(frame);
      } else {
        cancelAnimationFrame(raf);
        raf = 0;
      }
      setStatic();
    },
    destroy() {
      destroyed = true;
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      els.canvas.removeEventListener("pointerdown", onPointerDown);
      els.canvas.removeEventListener("pointermove", onPointerMove);
      els.canvas.removeEventListener("pointerleave", onPointerLeave);
      els.canvas.removeEventListener("pointerup", onPointerUp);
      els.canvas.removeEventListener("pointercancel", onPointerCancel);
      els.canvas.removeEventListener("wheel", onWheel);
      els.canvas.removeEventListener("keydown", onKeyDown);
      els.msg.removeEventListener("mouseenter", onMsgEnter);
      els.msg.removeEventListener("mouseleave", onMsgLeave);
      document.removeEventListener("visibilitychange", onVisibility);
      void actx?.close().catch(() => undefined);
      actx = null;
      noiseGain = null;
    },
  };
}
