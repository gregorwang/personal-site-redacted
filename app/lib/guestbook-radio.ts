/**
 * 留言收音机的频率规则。服务端（创建留言时分配频率）和浏览器（渲染刻度、预告空频率）共用这一份，
 * 所以这里不能引入任何 server-only 或 DOM 依赖。
 */

export const RADIO_MIN = 88;
export const RADIO_MAX = 108;
/** 离电台多近开始收到信号（MHz） */
export const RADIO_LOCK = 0.45;
/** 任意两台之间的最小间距，保证中间一定有一段纯噪声 */
export const RADIO_GAP = 1.2;

/** 刻度上不标点的隐藏电台，播的是页脚词表里的词 */
export const RADIO_HIDDEN_STATIONS = [
  { f: 89.3, text: "hope" },
  { f: 94.1, text: "miku" },
  { f: 101.7, text: "love" },
  { f: 107.3, text: "rezero" },
] as const;

/**
 * 同时在播的留言上限：至少留 40% 的刻度给噪声。
 * floor(20 MHz × 0.6 / (0.45 × 2)) − 4 个隐藏台 = 9。
 */
export const RADIO_ON_AIR_LIMIT = 9;

/** 留言上限（按字/码点算）：收音机的留言区固定高度，太长就只能一直滚 */
export const RADIO_MESSAGE_MAX_LENGTH = 140;

/** 可分配的频率槽：88.5 ～ 107.5，步长 0.1，用整数十分位表示避免浮点误差 */
const SLOT_MIN = 885;
const SLOT_MAX = 1075;
const SLOT_COUNT = SLOT_MAX - SLOT_MIN + 1;

/** 确定性的伪随机：同一个输入永远得到同一个 [0, 1) 的数 */
export function radioHash(a: number, b = 0) {
  let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x632be5ab, 0xc2b2ae35);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h ^= h >>> 12;
  return (h >>> 0) / 4294967296;
}

function takenWithHidden(taken: readonly number[]) {
  return [...taken, ...RADIO_HIDDEN_STATIONS.map((station) => station.f)];
}

/** 把任意输入收窄成合法频率槽（88.5 ～ 107.5、0.1 步长），不合法返回 null */
export function normalizeRadioFrequency(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  if (!Number.isFinite(parsed)) return null;
  const tenths = Math.round(parsed * 10);
  if (tenths < SLOT_MIN || tenths > SLOT_MAX) return null;
  return tenths / 10;
}

/** 这个频率是不是离所有已占用的台（含隐藏台）都至少 RADIO_GAP */
export function isRadioFrequencyFree(frequency: number, taken: readonly number[]) {
  return takenWithHidden(taken).every((t) => Math.abs(t - frequency) >= RADIO_GAP - 1e-9);
}

/**
 * 按 seed（通常是留言 id）算出首选频率，被占了就往两边找最近的空位。
 * 整条刻度都放不下时返回 null。
 */
export function assignRadioFrequency(seed: number, taken: readonly number[]): number | null {
  const occupied = takenWithHidden(taken);
  const start = Math.floor(radioHash(seed, 7) * SLOT_COUNT);
  for (let k = 0; k < SLOT_COUNT; k += 1) {
    for (const dir of [1, -1]) {
      const slot = (SLOT_MIN + ((start + dir * k) % SLOT_COUNT + SLOT_COUNT) % SLOT_COUNT) / 10;
      if (occupied.every((t) => Math.abs(t - slot) >= RADIO_GAP - 1e-9)) return slot;
    }
  }
  return null;
}
