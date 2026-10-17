// 音乐页图版的纯函数：建树、出 SVG 字符串。服务端和浏览器都能跑，同一份数据出同一份 SVG。
// 算法从 docs/design/music-phylogeny-preview-2026-10-16.html 搬过来。
import {
  MUSIC_ERAS,
  MUSIC_EVENTS,
  MUSIC_FAMILIES,
  MUSIC_FOSSILS,
  MUSIC_LANGS,
  MUSIC_ROCKS,
  MUSIC_SOURCES,
  MUSIC_STRATA,
  type MusicFamily,
  type MusicFamilyId,
  type MusicLang,
  type MusicRock,
  type MusicSong,
  type MusicSource,
} from "~/data/music-tree";

/* ================= 几何 ================= */
export const TREE_SIZE = 1060;
const CX = 530, CY = 530;
export const Y0 = 2015, Y1 = 2026.8; // 根 = 2015，外缘 = 现在
export const R0 = 26, RT = 290; // 根半径 / 枝梢半径
const LANG_R = [293, 303] as const; // 语种细环
const SRC_R = [305, 311] as const; // 来源细环
const FAM_BAND = [315, 333] as const; // 风格环
const ART_BAND = [336, 350] as const; // 歌手环
const SPEC_R = 398, MAT = 42, IMG = 36; // 标本
const GAP = (12 * Math.PI) / 180; // 右侧时间轴缺口
const TAU = Math.PI * 2;
const BG = "#f5f4ed";

export const rOf = (y: number) => R0 + ((y - Y0) / (Y1 - Y0)) * (RT - R0);
const pt = (r: number, a: number): [number, number] => [CX + r * Math.cos(a), CY + r * Math.sin(a)];
export const n2 = (v: number) => (Math.round(v * 100) / 100).toString();
const P = (r: number, a: number) => pt(r, a).map(n2).join(",");
const ESC: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
const esc = (s: string | number) => String(s).replace(/[&<>"]/g, (c) => ESC[c] ?? c);

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
type Rng = () => number;
const gauss = (rng: Rng) => {
  let u = 0, v = 0;
  while (!u) u = rng();
  while (!v) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v);
};
function pick<K extends string>(rng: Rng, mix: Partial<Record<K, number>>): K {
  const keys = Object.keys(mix) as K[];
  const x = rng();
  let acc = 0;
  for (const k of keys) {
    acc += mix[k] ?? 0;
    if (x < acc) return k;
  }
  return keys[keys.length - 1];
}

/* ================= 建树：科 → 属 → 种，按出现年份做梯形分叉 ================= */
export type TreeMode = "full" | "known";

export interface PlotArtist {
  id: string;
  /** null = 占位歌手 */
  name: string | null;
  placeholder: boolean;
  heat: number;
  extra: number;
  songs: readonly MusicSong[];
}

export interface TipInfo {
  named: boolean;
  key?: string;
  song?: MusicSong;
  art: string;
  fam: MusicFamilyId;
  lang: MusicLang;
  src: MusicSource;
  plays: number;
  artist: PlotArtist;
  family: MusicFamily;
  slot: number;
  /** 标本编号（仅具名） */
  no?: string;
}

export interface TreeNode {
  id: number;
  year: number;
  app: number;
  children: TreeNode[];
  parent: TreeNode | null;
  tip?: TipInfo;
  count: number;
  playSum: number;
  artOnly: string | null;
  famOnly: MusicFamilyId | null;
  a: number;
  r: number;
  /** 循环强度 0–1 */
  t: number;
}

export interface NamedTip extends TreeNode {
  tip: TipInfo & { named: true; key: string; song: MusicSong; no: string };
}

export interface TreeModel {
  mode: TreeMode;
  full: boolean;
  root: TreeNode;
  nodes: TreeNode[];
  tips: TreeNode[];
  named: NamedTip[];
  byKey: Record<string, NamedTip>;
  byId: Map<number, TreeNode>;
  artInfo: Record<string, { art: PlotArtist; fam: MusicFamily; crown: TreeNode; tips: TreeNode[] }>;
  famInfo: Partial<Record<MusicFamilyId, { fam: MusicFamily; crown: TreeNode }>>;
  slotAngle: number;
  playRange: [number, number];
}

const isNamed = (n: TreeNode): n is NamedTip => !!n.tip?.named;

export function buildTree(mode: TreeMode): TreeModel {
  const full = mode === "full";
  const rng = mulberry32(20261016);
  let uid = 0;
  const mk = (year: number, children: TreeNode[], tip?: TipInfo): TreeNode => ({
    id: uid++, year, app: year, children, parent: null, tip,
    count: 0, playSum: 0, artOnly: null, famOnly: null, a: 0, r: 0, t: 0,
  });
  const ladder = (items: TreeNode[]) => {
    items.sort((a, b) => a.app - b.app);
    let node = items[items.length - 1];
    for (let i = items.length - 2; i >= 0; i--) node = mk(items[i].app, [items[i], node]);
    return node;
  };

  const artInfo: TreeModel["artInfo"] = {};
  const famInfo: TreeModel["famInfo"] = {};
  const famCrowns: TreeNode[] = [];

  for (const fam of MUSIC_FAMILIES) {
    const famStart = Math.min(...fam.artists.flatMap((a) => a.songs.map((s) => s.y))) + 0.5;
    const artists: PlotArtist[] = fam.artists.map((a) => ({ ...a, placeholder: false }));
    if (full) {
      for (let i = 0; i < fam.fill.artists; i++) {
        artists.push({ id: `${fam.id}-p${i}`, name: null, placeholder: true, heat: Math.exp(gauss(rng) * 0.35) * 0.85, songs: [], extra: 0 });
      }
    }
    const crowns: TreeNode[] = [];
    for (const art of artists) {
      const tips: TreeNode[] = [];
      art.songs.forEach((s, i) => {
        tips.push(mk(s.y + 0.5, [], {
          named: true, key: `${art.id}:${i}`, song: s, art: art.id, fam: fam.id, lang: s.lang, src: s.src,
          plays: s.plays ?? Math.round(art.heat * 42 * Math.exp(gauss(rng) * 0.3)), artist: art, family: fam, slot: 0,
        }));
      });
      if (full) {
        let start: number, count: number;
        if (art.placeholder) {
          start = famStart + (2026.3 - famStart) * Math.pow(rng(), 0.9);
          const [lo, hi] = fam.fill.tips;
          count = lo + Math.floor(Math.pow(rng(), 1.5) * (hi - lo + 1));
        } else {
          start = Math.min(...art.songs.map((s) => s.y)) + 0.5;
          count = art.extra;
        }
        for (let k = 0; k < count; k++) {
          const y = art.placeholder && k === 0 ? start : start + (2026.6 - start) * Math.pow(rng(), 0.85);
          tips.push(mk(y, [], {
            named: false, art: art.id, fam: fam.id, lang: pick(rng, fam.mix), src: pick(rng, fam.src),
            plays: Math.round(art.heat * 42 * Math.exp(gauss(rng) * 0.45)), artist: art, family: fam, slot: 0,
          }));
        }
      }
      const crown = ladder(tips);
      artInfo[art.id] = { art, fam, crown, tips };
      crowns.push(crown);
    }
    const fc = ladder(crowns);
    famInfo[fam.id] = { fam, crown: fc };
    famCrowns.push(fc);
  }
  const root = ladder(famCrowns);
  root.year = Y0;
  root.app = Y0;

  const nodes: TreeNode[] = [], tips: TreeNode[] = [];
  (function walk(n: TreeNode, parent: TreeNode | null) {
    n.parent = parent;
    nodes.push(n);
    if (n.tip) {
      tips.push(n);
      n.count = 1;
      n.playSum = n.tip.plays;
      n.artOnly = n.tip.art;
      n.famOnly = n.tip.fam;
      return;
    }
    for (const c of n.children) walk(c, n);
    n.count = n.children.reduce((s, c) => s + c.count, 0);
    n.playSum = n.children.reduce((s, c) => s + c.playSum, 0);
    const a0 = n.children[0].artOnly, f0 = n.children[0].famOnly;
    n.artOnly = n.children.every((c) => c.artOnly === a0) ? a0 : null;
    n.famOnly = n.children.every((c) => c.famOnly === f0) ? f0 : null;
  })(root, null);

  const famGap = full ? 3 : 1.2;
  let slot = 0;
  let prev: MusicFamilyId | null = null;
  for (const t of tips) {
    const info = t.tip!;
    if (prev && info.fam !== prev) slot += famGap;
    info.slot = slot;
    slot += 1;
    prev = info.fam;
  }
  const slotAngle = (TAU - GAP) / slot;
  for (const t of tips) t.a = GAP / 2 + (t.tip!.slot + 0.5) * slotAngle;
  (function ang(n: TreeNode) {
    if (n.tip) return;
    n.children.forEach(ang);
    n.a = (n.children[0].a + n.children[n.children.length - 1].a) / 2;
  })(root);

  const stem = full ? 2.2 : 5;
  (function rad(n: TreeNode) {
    if (n.tip) n.r = RT;
    else if (!n.parent) n.r = R0;
    else n.r = Math.min(RT - 6, Math.max(rOf(n.year), n.parent.r + stem));
    n.children.forEach(rad);
  })(root);

  const logs = nodes.filter((n) => !n.tip).map((n) => Math.log(n.playSum / n.count)).sort((a, b) => a - b);
  const lo = logs[Math.floor(logs.length * 0.05)], hi = logs[Math.floor(logs.length * 0.95)];
  const heatT = (n: TreeNode) => Math.max(0, Math.min(1, (Math.log(n.playSum / n.count) - lo) / (hi - lo || 1)));
  for (const n of nodes) n.t = n.tip && n.parent ? heatT(n.parent) : heatT(n);

  const named = tips.filter(isNamed);
  named.forEach((t, i) => { t.tip.no = String(i + 1).padStart(3, "0"); });
  const byKey = Object.fromEntries(named.map((t) => [t.tip.key, t]));
  const byId = new Map(nodes.map((n) => [n.id, n]));

  return { mode, full, root, nodes, tips, named, byKey, byId, artInfo, famInfo, slotAngle, playRange: [Math.exp(lo), Math.exp(hi)] };
}

/* ================= 文本工具（卡片和 SVG 共用） ================= */
export const songName = (t: NamedTip) => (t.tip.song.artistOnly ? t.tip.artist.name ?? "" : t.tip.song.full || t.tip.song.t);
export const yearText = (t: TreeNode) =>
  t.tip?.named && t.tip.song ? `${t.tip.song.y}${t.tip.song.guess ? "?" : ""}` : `${Math.floor(t.year)}`;
export const eraOf = (y: number) => (MUSIC_ERAS.find(([a, b]) => y >= a && y < b) ?? MUSIC_ERAS[MUSIC_ERAS.length - 1])[2];

export function pathText(t: TreeNode) {
  const info = t.tip!;
  const leaf = info.named && info.song ? (info.song.artistOnly ? "（暂无单曲）" : info.song.t) : "未命名";
  return ["A 起点 2015", `${info.family.letter} ${info.family.zh}`, info.artist.name || "未命名歌手", leaf].join(" → ");
}

/* ================= 画谱系树 ================= */
const RAMP: readonly (readonly [number, string])[] = [[0, "#958e7f"], [0.5, "#c2ad86"], [0.78, "#d9875f"], [1, "#a33b22"]];
const hexRgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
function ramp(t: number) {
  for (let i = 1; i < RAMP.length; i++) {
    if (t <= RAMP[i][0]) {
      const [t0, c0] = RAMP[i - 1], [t1, c1] = RAMP[i];
      const k = (t - t0) / (t1 - t0), a = hexRgb(c0), b = hexRgb(c1);
      return `rgb(${a.map((v, j) => Math.round(v + (b[j] - v) * k)).join(",")})`;
    }
  }
  return RAMP[RAMP.length - 1][1];
}

function edgePath(p: TreeNode, n: TreeNode) {
  const d = n.a - p.a;
  let s = `M${P(p.r, p.a)}`;
  if (Math.abs(d) > 1e-4) s += `A${n2(p.r)},${n2(p.r)} 0 ${Math.abs(d) > Math.PI ? 1 : 0} ${d > 0 ? 1 : 0} ${P(p.r, n.a)}`;
  return s + `L${P(n.r, n.a)}`;
}
function sector(r0: number, r1: number, a0: number, a1: number) {
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M${P(r1, a0)}A${r1},${r1} 0 ${large} 1 ${P(r1, a1)}L${P(r0, a1)}A${r0},${r0} 0 ${large} 0 ${P(r0, a0)}Z`;
}
function textArc(r: number, a0: number, a1: number) {
  const large = a1 - a0 > Math.PI ? 1 : 0;
  const bottom = Math.sin((a0 + a1) / 2) > 0;
  return bottom ? `M${P(r, a1)}A${r},${r} 0 ${large} 0 ${P(r, a0)}` : `M${P(r, a0)}A${r},${r} 0 ${large} 1 ${P(r, a1)}`;
}
function textW(s: string, size: number) {
  let w = 0;
  for (const ch of s) w += /[\u3000-\u9fff\uff00-\uffef\u3040-\u30ff\uac00-\ud7af]/.test(ch) ? 1 : /[A-Z0-9]/.test(ch) ? 0.66 : 0.52;
  return w * size;
}
function clip(s: string, max: number) {
  if (textW(s, 1) <= max) return s;
  let o = "";
  for (const ch of s) {
    if (textW(o + ch + "…", 1) > max) break;
    o += ch;
  }
  return o + "…";
}
const halo = `paint-order="stroke" stroke="${BG}" stroke-width="3" stroke-linejoin="round"`;

export function treeSvg(M: TreeModel) {
  const back: string[] = [], grown: string[] = [], front: string[] = [], defs: string[] = [];
  const { full, nodes, tips, slotAngle } = M;

  defs.push(`<linearGradient id="mpRampGrad">${RAMP.map(([t, c]) => `<stop offset="${t}" stop-color="${c}"/>`).join("")}</linearGradient>`);
  defs.push(`<clipPath id="mpGrowClip"><circle data-grow-circle cx="${CX}" cy="${CY}" r="${RT + 40}"/></clipPath>`);

  MUSIC_ERAS.forEach(([a, b], i) => {
    if (i % 2) return;
    const r0 = rOf(a), r1 = rOf(b);
    back.push(`<circle cx="${CX}" cy="${CY}" r="${n2((r0 + r1) / 2)}" fill="none" stroke="#938a78" stroke-opacity=".08" stroke-width="${n2(r1 - r0)}" class="nohit"/>`);
  });
  for (let y = 2016; y <= 2026; y += 2) {
    back.push(`<circle cx="${CX}" cy="${CY}" r="${n2(rOf(y))}" fill="none" stroke="#938a78" stroke-opacity=".55" stroke-width=".6" stroke-dasharray="1.5 3.5" class="nohit"/>`);
  }

  const ew = full ? { tip: 0.5, named: 0.9, inner: 0.85 } : { tip: 1.3, named: 1.3, inner: 1.5 };
  for (const n of nodes) {
    if (!n.parent) continue;
    const w = n.tip ? (n.tip.named ? ew.named : ew.tip) : ew.inner;
    grown.push(`<path class="edge" fill="none" stroke-linecap="round" data-e="${n.id}" d="${edgePath(n.parent, n)}" stroke="${ramp(n.t)}" stroke-width="${w}"/>`);
  }
  for (const t of M.named) {
    const [x, y] = pt(RT, t.a);
    grown.push(`<circle class="dot" data-d="${t.id}" cx="${n2(x)}" cy="${n2(y)}" r="${full ? 1.7 : 2.4}" fill="#262421"/>`);
  }

  const bubbles: [number, number, number][] = [];
  for (const ev of MUSIC_EVENTS) {
    const info = M.artInfo[ev.artist];
    if (!info) continue;
    const inner = nodes.filter((n) => !n.tip && n.artOnly === ev.artist);
    let x: number, y: number, rr: number, a: number;
    const br = 2.6 + 9 * Math.sqrt(ev.s);
    if (inner.length) {
      const best = inner.reduce((b, n) => (Math.abs(n.year - ev.year) < Math.abs(b.year - ev.year) ? n : b));
      [x, y] = pt(best.r, best.a);
      rr = best.r;
      a = best.a;
    } else {
      rr = Math.min(rOf(ev.year), RT - 12);
      a = info.crown.a;
      [x, y] = pt(rr, a);
    }
    const [lx, ly] = pt(rr + br + 7, a);
    bubbles.push([x, y, br], [lx, ly, 6]);
    grown.push(`<g class="bubble nohit"><title>${ev.letter} · ${esc(ev.label)}</title><circle cx="${n2(x)}" cy="${n2(y)}" r="${n2(br)}" fill="#d97757" fill-opacity=".85" stroke="${BG}" stroke-width=".8"/>`
      + `<text x="${n2(lx)}" y="${n2(ly)}" font-size="11" font-weight="700" fill="#262421" text-anchor="middle" dominant-baseline="central" ${halo}>${ev.letter}</text></g>`);
  }

  for (const info of Object.values(M.famInfo)) {
    if (!info) continue;
    const { fam, crown } = info;
    const cr = crown.tip ? Math.min(rOf(crown.app), RT - 20) : crown.r;
    let lr = Math.min(Math.max(cr + 14, 96), 222);
    const near = (r: number) => {
      const [x, y] = pt(r, crown.a);
      return bubbles.some(([bx, by, br]) => Math.hypot(bx - x, by - y) < br + 16);
    };
    for (let i = 0; i < 6 && near(lr); i++) lr = lr + 14 > 236 ? lr - 30 : lr + 14;
    const [x0, y0] = pt(cr, crown.a), [x1, y1] = pt(lr, crown.a);
    const c = Math.cos(crown.a);
    const anchor = c > 0.3 ? "start" : c < -0.3 ? "end" : "middle";
    const dy = Math.abs(c) <= 0.3 ? (Math.sin(crown.a) > 0 ? 9 : -3) : 4;
    grown.push(`<g class="nohit"><line x1="${n2(x0)}" y1="${n2(y0)}" x2="${n2(x1)}" y2="${n2(y1)}" stroke="#262421" stroke-width=".5"/>`
      + `<text x="${n2(x1 + (anchor === "start" ? 3 : anchor === "end" ? -3 : 0))}" y="${n2(y1 + dy)}" font-size="12.5" fill="#262421" text-anchor="${anchor}" ${halo}>${fam.letter}: ${esc(fam.zh)}</text></g>`);
  }
  {
    const [x, y] = pt(M.root.r, M.root.a);
    grown.push(`<circle cx="${n2(x)}" cy="${n2(y)}" r="2.4" fill="#262421" class="nohit"/>`);
    front.push(`<text x="${CX}" y="${CY + 4}" font-size="12" font-weight="700" fill="#262421" text-anchor="middle" ${halo} class="nohit">A</text>`);
  }

  // 两道细环：语种（每首都画）、来源（原创不画）
  const tw = Math.min(full ? 5.5 : 6, slotAngle * 298 * 0.72);
  for (const t of tips) {
    const info = t.tip!;
    const [x0, y0] = pt(LANG_R[0], t.a), [x1, y1] = pt(LANG_R[1], t.a);
    front.push(`<line class="tick" data-k="${t.id}" data-y="${n2(t.year)}" x1="${n2(x0)}" y1="${n2(y0)}" x2="${n2(x1)}" y2="${n2(y1)}" stroke="${MUSIC_LANGS[info.lang].color}" stroke-width="${n2(tw)}"/>`);
    const sc = MUSIC_SOURCES[info.src].color;
    if (sc) {
      const [u0, v0] = pt(SRC_R[0], t.a), [u1, v1] = pt(SRC_R[1], t.a);
      front.push(`<line class="tick" data-k="${t.id}" data-y="${n2(t.year)}" x1="${n2(u0)}" y1="${n2(v0)}" x2="${n2(u1)}" y2="${n2(v1)}" stroke="${sc}" stroke-width="${n2(tw)}"/>`);
    }
  }
  for (const t of tips) {
    front.push(`<path class="hit" fill="transparent" data-tip="${t.id}" d="${sector(full ? 236 : 120, SRC_R[1] + 1, t.a - slotAngle / 2, t.a + slotAngle / 2)}"/>`);
  }

  let artIdx = 0, pid = 0;
  for (const info of Object.values(M.famInfo)) {
    if (!info) continue;
    const { fam } = info;
    const ft = tips.filter((t) => t.tip!.fam === fam.id);
    const a0 = ft[0].a - slotAngle / 2, a1 = ft[ft.length - 1].a + slotAngle / 2;
    front.push(`<path class="band" data-fam="${fam.id}" d="${sector(FAM_BAND[0], FAM_BAND[1], a0, a1)}" fill="#e2dac7"/>`);
    const len = (a1 - a0) * ((FAM_BAND[0] + FAM_BAND[1]) / 2);
    if (textW(fam.latin, 9.5) * 1.18 < len - 8) {
      defs.push(`<path id="mpTp${pid}" d="${textArc((FAM_BAND[0] + FAM_BAND[1]) / 2, a0, a1)}"/>`);
      front.push(`<text font-size="9.5" letter-spacing="1.6" fill="#5b554b" text-anchor="middle" dominant-baseline="central" class="nohit"><textPath href="#mpTp${pid}" startOffset="50%">${esc(fam.latin)}</textPath></text>`);
      pid++;
    }
    const arts = [...new Set(ft.map((t) => t.tip!.art))];
    for (const aid of arts) {
      const at = ft.filter((t) => t.tip!.art === aid);
      const b0 = at[0].a - slotAngle / 2, b1 = at[at.length - 1].a + slotAngle / 2;
      const art = M.artInfo[aid].art;
      front.push(`<path class="band" data-art="${esc(aid)}" d="${sector(ART_BAND[0], ART_BAND[1], b0, b1)}" fill="${artIdx % 2 ? "#7a7062" : "#2f2b27"}" stroke="${BG}" stroke-width=".5"/>`);
      artIdx++;
      if (art.name) {
        const name = /[a-z]/i.test(art.name) ? art.name.toUpperCase() : art.name;
        const blen = (b1 - b0) * ((ART_BAND[0] + ART_BAND[1]) / 2);
        if (textW(name, 8) * 1.1 < blen - 4) {
          defs.push(`<path id="mpTp${pid}" d="${textArc((ART_BAND[0] + ART_BAND[1]) / 2, b0, b1)}"/>`);
          front.push(`<text font-size="8" letter-spacing=".6" fill="${BG}" text-anchor="middle" dominant-baseline="central" class="nohit"><textPath href="#mpTp${pid}" startOffset="50%">${esc(name)}</textPath></text>`);
          pid++;
        }
      }
    }
  }

  // 封面标本：沿外圈互相推开，再慢慢拉回自己的枝梢
  const specs = M.named.filter((t) => t.tip.song.cover).map((t) => {
    const label = clip(t.tip.song.artistOnly ? t.tip.artist.name ?? "" : t.tip.song.t, 15);
    return { t, label, w: textW(label, 9.5), a: t.a };
  });
  const foot = (s: { a: number; w: number }) => Math.abs(Math.sin(s.a)) * Math.max(MAT, s.w * 0.9) + Math.abs(Math.cos(s.a)) * MAT;
  for (let it = 0; it < 400 && specs.length > 1; it++) {
    specs.sort((p, q) => p.a - q.a);
    for (let i = 0; i < specs.length; i++) {
      const p = specs[i], q = specs[(i + 1) % specs.length];
      let d = q.a - p.a;
      if (i === specs.length - 1) d += TAU;
      const need = ((foot(p) + foot(q)) / 2 + 6) / SPEC_R;
      if (d < need) {
        const push = (need - d) / 2;
        p.a -= push;
        q.a += push;
      }
    }
    for (const s of specs) s.a += (s.t.a - s.a) * 0.015;
  }
  for (const s of specs) {
    const { t } = s;
    const song = t.tip.song;
    const [x, y] = pt(SPEC_R, s.a);
    const [lx0, ly0] = pt(ART_BAND[1] + 2, t.a), [lx1, ly1] = pt(SPEC_R - MAT / 2 - 5, s.a);
    const c = Math.cos(s.a), sn = Math.sin(s.a);
    const k = (MAT / 2 + 5) / Math.max(Math.abs(c), Math.abs(sn));
    const tx = k * c;
    let ty = k * sn;
    const anchor = Math.abs(c) < 0.35 ? "middle" : c > 0 ? "start" : "end";
    if (Math.abs(sn) >= Math.abs(c)) ty += sn > 0 ? 9 : -2;
    else ty += 3.5;
    const moth = song.butterfly
      ? `<g transform="translate(16,-17) rotate(-28)"><title>Night Butterflies：这张图版上唯一一只真的蝴蝶</title>`
        + `<ellipse cx="-3.3" cy="-1.5" rx="3.6" ry="2.2" transform="rotate(-18 -3.3 -1.5)" fill="#3d3934"/><ellipse cx="3.3" cy="-1.5" rx="3.6" ry="2.2" transform="rotate(18 3.3 -1.5)" fill="#3d3934"/>`
        + `<ellipse cx="-2.2" cy="2.2" rx="2.3" ry="1.5" transform="rotate(20 -2.2 2.2)" fill="#7a7062"/><ellipse cx="2.2" cy="2.2" rx="2.3" ry="1.5" transform="rotate(-20 2.2 2.2)" fill="#7a7062"/>`
        + `<line x1="0" y1="-4.5" x2="0" y2="4" stroke="#262421" stroke-width="1"/></g>`
      : "";
    const aria = `${song.artistOnly ? t.tip.artist.name ?? "" : song.t} — ${t.tip.artist.name ?? ""}`;
    front.push(`<g class="spec" data-tip="${t.id}" data-y="${n2(t.year)}" tabindex="0" role="button" aria-label="${esc(aria)}">`
      + `<line class="nohit" x1="${n2(lx0)}" y1="${n2(ly0)}" x2="${n2(lx1)}" y2="${n2(ly1)}" stroke="#938a78" stroke-width=".6"/>`
      + `<g transform="translate(${n2(x)},${n2(y)})"><g class="pin">`
      + `<rect x="${-MAT / 2}" y="${-MAT / 2}" width="${MAT}" height="${MAT}" fill="#fbfaf6" stroke="#cfc8b6" stroke-width=".8"/>`
      + `<image href="${esc(song.cover ?? "")}" x="${-IMG / 2}" y="${-IMG / 2}" width="${IMG}" height="${IMG}" preserveAspectRatio="xMidYMid slice"/>`
      + `<circle cx="0" cy="${-MAT / 2}" r="1.5" fill="#3d3934"/>${moth}`
      + `<text x="${n2(tx)}" y="${n2(ty)}" font-size="9.5" fill="#262421" text-anchor="${anchor}">${esc(s.label)}</text></g></g></g>`);
  }

  front.push(`<line x1="${CX + R0}" y1="${CY}" x2="${CX + RT}" y2="${CY}" stroke="#938a78" stroke-width=".5" class="nohit"/>`);
  for (let y = 2016; y <= 2026; y += 2) {
    front.push(`<text x="${n2(CX + rOf(y))}" y="${CY + 3}" font-size="8" fill="#5b554b" text-anchor="middle" ${halo} class="nohit">${y}</text>`);
  }
  front.push(`<text x="${CX + RT + 2}" y="${CY + 3}" font-size="8" fill="#5b554b" ${halo} class="nohit">今</text>`);
  front.push(`<circle data-year-dot class="nohit" cx="${CX + RT}" cy="${CY - 9}" r="3" fill="#d97757"/>`);

  front.push(legends(M));
  return `<defs>${defs.join("")}</defs>${back.join("")}<g clip-path="url(#mpGrowClip)">${grown.join("")}</g>${front.join("")}`;
}

/** 生长动画：把裁剪圆和年份点移到某一年 */
export const growRadius = (y: number) => (y >= Y1 - 0.05 ? RT + 40 : rOf(y) + 1);
export const yearDotX = (y: number) => CX + Math.min(rOf(y), RT);

function legends(M: TreeModel) {
  const g: string[] = [];
  g.push(`<g transform="translate(20,34)" class="nohit">`
    + `<text font-size="22" font-weight="700" letter-spacing="2" fill="#262421">PLATE I</text>`
    + `<text y="19" font-size="10.5" fill="#5b554b">音乐谱系 · 2015—2026</text>`
    + `<text y="34" font-size="9" fill="#938a78">半径 = 时间 · 中心 = 第一首歌</text></g>`);
  const W = 230, x0 = TREE_SIZE - 20 - W;
  const [pl, ph] = M.playRange;
  g.push(`<g transform="translate(${x0},26)" class="nohit">`
    + `<text font-size="10.5" fill="#262421">循环强度</text><text x="${W}" font-size="9" fill="#938a78" text-anchor="end">平均播放次数</text>`
    + `<rect y="8" width="${W}" height="7" fill="url(#mpRampGrad)"/>`
    + `<text y="27" font-size="8.5" fill="#5b554b">≈${Math.round(pl)}</text><text x="${W}" y="27" font-size="8.5" fill="#5b554b" text-anchor="end">≈${Math.round(ph)}</text>`
    + eraBar(W) + `</g>`);
  // 左下：语种 + 来源
  const L = Object.values(MUSIC_LANGS);
  const S = Object.values(MUSIC_SOURCES).filter((s): s is { label: string; color: string } => !!s.color);
  const rowsL = Math.ceil(L.length / 2), rowsS = Math.ceil(S.length / 2);
  const sy = 22 + rowsL * 16 + 14;
  const H = sy + 22 + rowsS * 16;
  const item = (l: { label: string; color: string }, i: number, y0: number) =>
    `<g transform="translate(${(i % 2) * 86},${y0 + Math.floor(i / 2) * 16})"><rect y="-8" width="10" height="10" fill="${l.color}"/><text x="15" font-size="9.5" fill="#262421">${l.label}</text></g>`;
  g.push(`<g transform="translate(20,${TREE_SIZE - 18 - H + 12})" class="nohit">`
    + `<text font-size="10.5" fill="#262421">内环 · 语种</text><line x1="0" y1="6" x2="164" y2="6" stroke="#262421" stroke-width=".5"/>`
    + L.map((l, i) => item(l, i, 22)).join("")
    + `<text y="${sy}" font-size="10.5" fill="#262421">外环 · 来源<tspan fill="#938a78" font-size="9">（原创不标）</tspan></text><line x1="0" y1="${sy + 6}" x2="164" y2="${sy + 6}" stroke="#262421" stroke-width=".5"/>`
    + S.map((s, i) => item(s, i, sy + 22)).join("")
    + `</g>`);
  const SZ = [0.94, 0.75, 0.5, 0.25];
  g.push(`<g transform="translate(${TREE_SIZE - 20},${TREE_SIZE - 20 - SZ.length * 22 - 14})" class="nohit">`
    + `<text font-size="10.5" fill="#262421" text-anchor="end">品味转折强度</text>`
    + `<line x1="-110" y1="6" x2="0" y2="6" stroke="#262421" stroke-width=".5"/>`
    + SZ.map((s, i) => `<g transform="translate(0,${24 + i * 22})"><circle cx="-62" cy="-4" r="${n2(2.6 + 9 * Math.sqrt(s))}" fill="#d97757" fill-opacity=".85"/><text font-size="9.5" fill="#262421" text-anchor="end">${s.toFixed(2)}</text></g>`).join("")
    + `</g>`);
  return g.join("");
}

function eraBar(W: number) {
  const x = (y: number) => ((y - Y0) / (Y1 - Y0)) * W;
  const fills = ["#e6dcc6", "#d6c9ad", "#ebe3d1", "#dacdb2", "#e7dfca"];
  let s = `<g transform="translate(0,44)"><text font-size="10.5" fill="#262421">年代</text><text x="${W}" font-size="9" fill="#938a78" text-anchor="end">按年度歌手划分</text>`;
  MUSIC_ERAS.forEach(([a, b, name], i) => {
    const w = x(b) - x(a);
    s += `<rect x="${n2(x(a))}" y="7" width="${n2(w)}" height="14" fill="${fills[i % fills.length]}" stroke="${BG}" stroke-width=".6"/>`;
    if (textW(name, 8) < w - 2) s += `<text x="${n2(x(a) + w / 2)}" y="17.5" font-size="8" fill="#3d3934" text-anchor="middle">${esc(name)}</text>`;
  });
  [2015, 2018, 2021, 2024].forEach((y) => {
    s += `<line x1="${n2(x(y))}" y1="21" x2="${n2(x(y))}" y2="24" stroke="#5b554b" stroke-width=".5"/><text x="${n2(x(y))}" y="33" font-size="8" fill="#5b554b" text-anchor="middle">${y}</text>`;
  });
  s += `<text x="${W}" y="33" font-size="8" fill="#5b554b" text-anchor="end">今</text></g>`;
  return s;
}

/* ================= Plate II · 地层柱 ================= */
export const STRATA_WIDTH = 600;

/** 某年确定入谱（非推测）的歌 */
export const songsOfYear = (y: number) =>
  MUSIC_FAMILIES.flatMap((f) => f.artists.flatMap((a) => a.songs.filter((s) => s.y === y && !s.guess && !s.artistOnly).map((s) => ({ s, a }))));
/** 某位年度歌手出现过的层位（从老到新） */
export const layersOf = (artist: string) =>
  MUSIC_STRATA.filter((x) => x.artist === artist).map((x) => x.label ?? String(x.year)).reverse();

export function strataSvg() {
  const X = { year: [0, 52], form: [60, 150], lith: [158, 360], note: [378, 600] } as const;
  const HEAD = 30;
  let y = HEAD;
  const rows = MUSIC_STRATA.map((s) => {
    const h = s.active ? 44 : s.years ? 104 : 56;
    const rock: MusicRock = s.rock ?? (s.artist ? MUSIC_FOSSILS[s.artist].rock : "loose");
    const r = { ...s, y0: y, y1: y + h, rock };
    y += h;
    return r;
  });
  const bottom = y;
  const n = rows.length;
  const wave = (x: number, i: number, amp: number) => amp * (Math.sin(x / 23 + i * 1.7) * 0.65 + Math.sin(x / 9.5 + i * 2.3) * 0.35);
  const bounds: [number, number][][] = [];
  for (let b = 0; b <= n; b++) {
    const yy = b === n ? bottom : rows[b].y0;
    const amp = b === 0 || b === n ? 0 : rows[b].years ? 3.2 : 1.6;
    const pts: [number, number][] = [];
    for (let x = X.lith[0]; x <= X.lith[1] + 0.1; x += 5) pts.push([x, yy + wave(x, b, amp)]);
    bounds.push(pts);
  }
  const poly = (i: number) =>
    "M" + bounds[i].map((p) => p.map(n2).join(",")).join("L") + "L" + [...bounds[i + 1]].reverse().map((p) => p.map(n2).join(",")).join("L") + "Z";

  const defs = `
    <pattern id="mp-rock-sand" width="9" height="9" patternUnits="userSpaceOnUse"><rect width="9" height="9" fill="#ebe1ca"/><circle cx="2" cy="2" r=".85" fill="#5b554b"/><circle cx="6.5" cy="6.5" r=".6" fill="#5b554b"/></pattern>
    <pattern id="mp-rock-lime" width="18" height="10" patternUnits="userSpaceOnUse"><rect width="18" height="10" fill="#e3dac6"/><path d="M0 .5H18M0 5.5H18M4.5 .5V5.5M13.5 5.5V10" stroke="#5b554b" stroke-width=".55" fill="none"/></pattern>
    <pattern id="mp-rock-shale" width="16" height="8" patternUnits="userSpaceOnUse"><rect width="16" height="8" fill="#e6dccb"/><path d="M0 2H9M8 6H16" stroke="#5b554b" stroke-width=".6" fill="none"/></pattern>
    <pattern id="mp-rock-schist" width="24" height="8" patternUnits="userSpaceOnUse"><rect width="24" height="8" fill="#ddd2bd"/><path d="M0 4Q6 1 12 4T24 4" stroke="#5b554b" stroke-width=".6" fill="none"/></pattern>
    <pattern id="mp-rock-loose" width="14" height="12" patternUnits="userSpaceOnUse"><rect width="14" height="12" fill="#f0eadc"/><circle cx="3" cy="4" r=".7" fill="#938a78"/><circle cx="10" cy="9" r=".5" fill="#938a78"/><circle cx="8.5" cy="2" r=".4" fill="#938a78"/></pattern>`;
  const out: string[] = [];
  const T = (x: number, yy: number, s: string, a = "") => `<text x="${n2(x)}" y="${n2(yy)}" ${a}>${s}</text>`;
  out.push(T(X.year[1], 18, "年份", `font-size="10" fill="#938a78" text-anchor="end"`));
  out.push(T((X.form[0] + X.form[1]) / 2, 18, "组", `font-size="10" fill="#938a78" text-anchor="middle"`));
  out.push(T((X.lith[0] + X.lith[1]) / 2, 18, "岩性柱", `font-size="10" fill="#938a78" text-anchor="middle"`));
  out.push(T(X.note[0], 18, "标准化石 · 年度歌手", `font-size="10" fill="#938a78"`));

  for (let i = 0; i < n;) {
    let j = i;
    while (j + 1 < n && rows[j + 1].form.join() === rows[i].form.join()) j++;
    const y0 = rows[i].y0, y1 = rows[j].y1, cy = (y0 + y1) / 2;
    const [name, part] = rows[i].form;
    out.push(`<rect x="${X.form[0]}" y="${n2(y0)}" width="${X.form[1] - X.form[0]}" height="${n2(y1 - y0)}" fill="none" stroke="#b7af9d" stroke-width=".6"/>`);
    out.push(T((X.form[0] + X.form[1]) / 2, part ? cy - 2 : cy + 4, esc(name), `font-size="10" fill="#3d3934" text-anchor="middle"`));
    if (part) out.push(T((X.form[0] + X.form[1]) / 2, cy + 12, esc(part), `font-size="9" fill="#938a78" text-anchor="middle"`));
    i = j + 1;
  }

  rows.forEach((r, i) => {
    const cy = (r.y0 + r.y1) / 2;
    const g: string[] = [];
    g.push(`<path class="layer dimmable" d="${poly(i)}" fill="url(#mp-rock-${r.rock})" stroke="#5b554b" stroke-width=".6"/>`);
    if (i % 2) g.push(`<path class="dimmable" d="${poly(i)}" fill="#262421" fill-opacity=".035"/>`);
    // Mili 那一层：四年压在一起，画出细纹层
    if (r.years) {
      const bh = (r.y1 - r.y0) / r.years.length;
      r.years.slice().reverse().forEach((yr, k) => {
        if (k) g.push(`<line class="dimmable" x1="${X.lith[0]}" y1="${n2(r.y0 + k * bh)}" x2="${X.lith[1]}" y2="${n2(r.y0 + k * bh)}" stroke="#5b554b" stroke-width=".5" stroke-dasharray="3 3"/>`);
        g.push(T(X.lith[0] + 5, r.y0 + k * bh + 11, String(yr), `font-size="8" fill="#5b554b" class="dimmable" ${halo}`));
      });
    }
    const yearTxt = r.year ? String(r.year) : r.label ?? "";
    const yearSvg = r.years && r.label
      ? r.label.split("—").map((p, k) => `<tspan x="${X.year[1]}" dy="${k ? 13 : -3}">${esc(p)}${k ? "" : "—"}</tspan>`).join("")
      : esc(yearTxt);
    g.push(T(X.year[1], cy + 4, yearSvg, `font-size="${r.year ? 12 : 10}" font-weight="${r.year ? 600 : 400}" fill="#262421" text-anchor="end" font-variant-numeric="tabular-nums"`));
    if (r.artist) {
      const f = MUSIC_FOSSILS[r.artist];
      const fx = X.lith[0] + (i % 2 ? 76 : 132);
      g.push(`<clipPath id="mpFc${i}"><circle cx="${fx}" cy="${n2(cy)}" r="18"/></clipPath>`);
      g.push(`<circle class="dimmable" cx="${fx}" cy="${n2(cy)}" r="21.5" fill="#faf9f5" stroke="#5b554b" stroke-width=".7"/>`);
      g.push(`<image class="dimmable" href="${esc(f.photo)}" x="${fx - 18}" y="${n2(cy - 18)}" width="36" height="36" preserveAspectRatio="xMidYMid slice" clip-path="url(#mpFc${i})"/>`);
      g.push(`<line class="dimmable" x1="${fx + 23}" y1="${n2(cy)}" x2="${X.note[0] - 6}" y2="${n2(cy)}" stroke="#938a78" stroke-width=".6" stroke-dasharray="2 2"/>`);
      let sub: string;
      if (r.years) sub = `${r.years.length} 年年度歌手`;
      else {
        const rep = r.year ? songsOfYear(r.year).map(({ s }) => s.t).join(" · ") : "";
        let streak = 1;
        for (let k = i + 1; k < n && rows[k].artist === r.artist && rows[k].year; k++) streak++;
        sub = rep ? `同层：${rep}` : streak > 1 ? `连续第 ${streak} 年` : "";
      }
      g.push(T(X.note[0], cy - 3, esc(f.name), `font-size="13" font-weight="600" fill="#262421"`));
      if (sub) g.push(T(X.note[0], cy + 13, esc(clip(sub, 22)), `font-size="9.5" fill="#938a78"`));
    } else if (r.active) {
      g.push(T(X.note[0], cy - 2, "仍在沉积", `font-size="12" fill="#262421"`));
      g.push(T(X.note[0], cy + 13, "2026 年度歌手要等年底", `font-size="9.5" fill="#938a78"`));
    }
    out.push(`<g class="layer-g" data-layer="${esc(r.key)}" tabindex="0" role="button" aria-label="${esc(yearTxt)} 层" style="--i:${n - 1 - i}">${g.join("")}</g>`);
  });

  const used = [...new Set(rows.map((r) => r.rock))];
  const ly = bottom + 30;
  out.push(used.map((k, i) => `<g transform="translate(${(i % 3) * 200},${ly + Math.floor(i / 3) * 22})"><rect y="-10" width="16" height="12" fill="url(#mp-rock-${k})" stroke="#5b554b" stroke-width=".5"/>`
    + `<text x="22" font-size="10" fill="#262421">${MUSIC_ROCKS[k].label}<tspan fill="#938a78" dx="4">= ${esc(MUSIC_ROCKS[k].who)}</tspan></text></g>`).join(""));
  return { svg: `<defs>${defs}</defs>${out.join("")}`, height: ly + Math.ceil(used.length / 3) * 22 - 6 };
}
