// 音乐页：Plate I 谱系树 + Plate II 地层柱。
// SVG 由 app/lib/music-plates.ts 的纯函数生成，服务端直出；浏览器只负责悬停、点击、生长和沉积动画。
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  MUSIC_FAMILIES,
  MUSIC_FOSSILS,
  MUSIC_HEADLINE_STATS,
  MUSIC_LANGS,
  MUSIC_ROCKS,
  MUSIC_SOURCES,
  MUSIC_STRATA,
  MUSIC_TOP_2024,
  MUSIC_YEARLY,
  type MusicFamilyId,
} from "~/data/music-tree";
import {
  STRATA_WIDTH,
  TREE_SIZE,
  Y0,
  Y1,
  buildTree,
  growRadius,
  layersOf,
  n2,
  pathText,
  songName,
  songsOfYear,
  strataSvg,
  treeSvg,
  yearDotX,
  yearText,
  type NamedTip,
  type TreeMode,
  type TreeModel,
  type TreeNode,
} from "~/lib/music-plates";

type TreeSel =
  | { type: "tip"; id: number; key?: string; mode: TreeMode }
  | { type: "art"; id: string }
  | { type: "fam"; id: MusicFamilyId };

const GROW_MS = 7000;

function resolveSel(sel: TreeSel | null, M: TreeModel): TreeSel | null {
  if (!sel) return null;
  if (sel.type === "tip") {
    if (sel.key) {
      const t = M.byKey[sel.key];
      return t ? { type: "tip", id: t.id, key: t.tip.key, mode: M.mode } : null;
    }
    return sel.mode === M.mode && M.byId.has(sel.id) ? sel : null;
  }
  if (sel.type === "art") return M.artInfo[sel.id] ? sel : null;
  return M.famInfo[sel.id] ? sel : null;
}

function selFromEl(el: Element, M: TreeModel): TreeSel | null {
  const ds = (el as HTMLElement | SVGElement).dataset;
  if (ds.tip) {
    const t = M.byId.get(Number(ds.tip));
    return t ? { type: "tip", id: t.id, key: t.tip?.key, mode: M.mode } : null;
  }
  if (ds.art) return { type: "art", id: ds.art };
  if (ds.fam) return { type: "fam", id: ds.fam as MusicFamilyId };
  return null;
}
const selKey = (s: TreeSel | null) => (s ? `${s.type}:${s.id}` : "");

function tipText(sel: TreeSel, M: TreeModel) {
  if (sel.type === "tip") {
    const t = M.byId.get(sel.id);
    if (!t?.tip) return "";
    return t.tip.named ? `${songName(t as NamedTip)} — ${t.tip.artist.name} · ${yearText(t)}` : `未命名 · ${t.tip.family.zh} · ${yearText(t)}（占位）`;
  }
  if (sel.type === "art") {
    const { art, tips } = M.artInfo[sel.id];
    return `${art.name || "未命名歌手（占位）"} · ${tips.length} 首 · 自 ${Math.floor(Math.min(...tips.map((t) => t.year)))}`;
  }
  const info = M.famInfo[sel.id];
  return info ? `${info.fam.letter} ${info.fam.zh} · ${info.crown.count} 首` : "";
}

type ElMaps = { edges: Map<number, Element[]>; ticks: Map<number, Element[]>; specs: Map<number, Element[]>; dots: Map<number, Element[]>; years: [Element, number][] };

function indexEls(svg: SVGSVGElement): ElMaps {
  const map = (selector: string, attr: string) => {
    const m = new Map<number, Element[]>();
    svg.querySelectorAll(selector).forEach((el) => {
      const k = Number(el.getAttribute(attr));
      const list = m.get(k);
      if (list) list.push(el);
      else m.set(k, [el]);
    });
    return m;
  };
  return {
    edges: map("[data-e]", "data-e"),
    ticks: map("[data-k]", "data-k"),
    specs: map(".spec", "data-tip"),
    dots: map("[data-d]", "data-d"),
    years: [...svg.querySelectorAll("[data-y]")].map((el): [Element, number] => [el, Number(el.getAttribute("data-y"))]),
  };
}

function paintHighlight(svg: SVGSVGElement, els: ElMaps, M: TreeModel, sel: TreeSel | null) {
  svg.querySelectorAll(".on").forEach((el) => el.classList.remove("on"));
  if (!sel) {
    svg.classList.remove("focus");
    return;
  }
  svg.classList.add("focus");
  const on = new Set<number>();
  const tipsOn: TreeNode[] = [];
  const up = (start: TreeNode | null) => {
    for (let n = start; n; n = n.parent) on.add(n.id);
  };
  if (sel.type === "tip") {
    const t = M.byId.get(sel.id);
    if (t) {
      up(t);
      tipsOn.push(t);
    }
  } else {
    const field = sel.type === "art" ? "artOnly" : "famOnly";
    for (const n of M.nodes) {
      if (n[field] === sel.id) {
        on.add(n.id);
        if (n.tip) tipsOn.push(n);
      }
    }
    up(sel.type === "art" ? M.artInfo[sel.id]?.crown ?? null : M.famInfo[sel.id]?.crown ?? null);
  }
  for (const id of on) els.edges.get(id)?.forEach((el) => el.classList.add("on"));
  for (const t of tipsOn) {
    for (const m of [els.ticks, els.specs, els.dots]) m.get(t.id)?.forEach((el) => el.classList.add("on"));
  }
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

function onceVisible(el: Element, ratio: number, fn: () => void) {
  if (!("IntersectionObserver" in window)) {
    fn();
    return () => {};
  }
  const io = new IntersectionObserver((entries) => {
    if (entries.some((en) => en.isIntersecting)) {
      io.disconnect();
      fn();
    }
  }, { threshold: ratio });
  io.observe(el);
  return () => io.disconnect();
}

export default function MusicPlates() {
  const model = useMemo(() => buildTree("full"), []);
  const treeHtml = useMemo(() => treeSvg(model), [model]);
  const strata = useMemo(() => strataSvg(), []);
  const [rawSel, setRawSel] = useState<TreeSel | null>(null);
  const sel = resolveSel(rawSel, model);
  const [layer, setLayer] = useState("2025");

  const treeRef = useRef<SVGSVGElement>(null);
  const strataRef = useRef<SVGSVGElement>(null);
  const plateRef = useRef<HTMLElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const elsRef = useRef<ElMaps | null>(null);
  const selRef = useRef<TreeSel | null>(sel);
  selRef.current = sel;
  const hoverRef = useRef("");
  const grow = useRef({ y: Y1, playing: false, raf: 0, played: false });

  /* ---------- 生长：直接改 DOM，不走 React 渲染 ---------- */
  const applyYear = useCallback(() => {
    const svg = treeRef.current, els = elsRef.current;
    if (!svg || !els) return;
    const y = grow.current.y;
    svg.querySelector("[data-grow-circle]")?.setAttribute("r", n2(growRadius(y)));
    svg.querySelector("[data-year-dot]")?.setAttribute("cx", n2(yearDotX(y)));
    for (const [el, ty] of els.years) el.classList.toggle("pending", ty > y);
  }, []);

  const stopGrow = useCallback(() => {
    grow.current.playing = false;
    cancelAnimationFrame(grow.current.raf);
  }, []);

  // 只在进场时自动长一次，没有播放控件
  const playGrow = useCallback(() => {
    const g = grow.current;
    const from = Y0;
    const dur = GROW_MS;
    let start: number | null = null;
    g.playing = true;
    g.played = true;
    const step = (ts: number) => {
      if (!g.playing) return;
      if (start === null) start = ts;
      const k = Math.min(1, (ts - start) / dur);
      g.y = from + (Y1 - from) * k;
      applyYear();
      if (k < 1) g.raf = requestAnimationFrame(step);
      else stopGrow();
    };
    g.raf = requestAnimationFrame(step);
  }, [applyYear, stopGrow]);

  const showAll = useCallback(() => {
    if (grow.current.playing) stopGrow();
    grow.current.y = Y1;
    grow.current.played = true;
    applyYear();
  }, [applyYear, stopGrow]);

  // SVG 挂上后索引元素，并恢复生长进度和高亮
  useEffect(() => {
    const svg = treeRef.current;
    if (!svg) return;
    elsRef.current = indexEls(svg);
    applyYear();
  }, [treeHtml, applyYear]);

  useEffect(() => {
    const svg = treeRef.current, els = elsRef.current;
    if (svg && els) paintHighlight(svg, els, model, sel);
    // sel 每次渲染都是新对象，按 key 比较
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model, treeHtml, selKey(sel)]);

  // 进场：谱系树自动长一次，地层一层层落下；减少动态效果时直接显示完整状态
  useEffect(() => {
    const tree = treeRef.current, strataEl = strataRef.current;
    if (!tree || !strataEl || prefersReducedMotion()) return;
    const g = grow.current;
    g.y = Y0;
    applyYear();
    strataEl.classList.add("armed");
    const offTree = onceVisible(tree, 0.3, () => {
      if (!g.played) playGrow();
    });
    const offStrata = onceVisible(strataEl, 0.25, () => strataEl.classList.add("settled"));
    return () => {
      offTree();
      offStrata();
      g.playing = false;
      cancelAnimationFrame(g.raf);
    };
  }, [applyYear, playGrow]);

  /* ---------- 谱系树交互 ---------- */
  const hideTip = () => tipRef.current?.classList.remove("show");
  const onTreeMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const svg = treeRef.current, els = elsRef.current, tip = tipRef.current;
    if (!svg || !els || !tip) return;
    const el = (e.target as Element).closest("[data-tip],[data-art],[data-fam]");
    const hover = el ? selFromEl(el, model) : null;
    const k = selKey(hover);
    if (k !== hoverRef.current) {
      hoverRef.current = k;
      paintHighlight(svg, els, model, hover ?? selRef.current);
      if (hover) {
        tip.textContent = tipText(hover, model);
        tip.classList.add("show");
      } else hideTip();
    }
    if (hover) tip.style.transform = `translate(${Math.min(e.clientX + 14, window.innerWidth - tip.offsetWidth - 8)}px, ${e.clientY + 16}px)`;
  };
  const onTreeLeave = () => {
    hoverRef.current = "";
    hideTip();
    const svg = treeRef.current, els = elsRef.current;
    if (svg && els) paintHighlight(svg, els, model, selRef.current);
  };
  const onTreeClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const el = (e.target as Element).closest("[data-tip],[data-art],[data-fam]");
    setRawSel(el ? selFromEl(el, model) : null);
  };
  const onTreeKey = (e: React.KeyboardEvent<SVGSVGElement>) => {
    const el = (e.target as Element).closest(".spec");
    if (el && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      setRawSel(selFromEl(el, model));
    }
  };

  // 从地层柱 / 附录跳回谱系
  const locate = (next: TreeSel) => {
    showAll();
    setRawSel(next);
    plateRef.current?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
  };
  const locateSong = (key: string) => {
    const t = model.byKey[key];
    if (t) locate({ type: "tip", id: t.id, key, mode: model.mode });
  };

  /* ---------- 地层柱交互 ---------- */
  const onStrataPick = (e: React.SyntheticEvent<SVGSVGElement>) => {
    const g = (e.target as Element).closest<SVGGElement>(".layer-g");
    if (g?.dataset.layer) setLayer(g.dataset.layer);
  };

  useEffect(() => {
    const el = strataRef.current;
    if (!el) return;
    el.classList.add("focus");
    el.querySelectorAll<SVGGElement>(".layer-g").forEach((g) => g.classList.toggle("on", g.dataset.layer === layer));
  }, [layer]);

  return (
    <main className="music-plates">
      <h1 className="mp-sr-only">音乐图版集：我的听歌谱系与年度歌手地层</h1>

      {/* ================= PLATE I：一进来就要能看到整棵树 ================= */}
      <section className="mp-sec" id="plate-1" ref={plateRef}>
        <div className="mp-wrap mp-stage">
          <figure className="mp-plate">
            <svg
              ref={treeRef}
              className="mp-tree"
              viewBox={`0 0 ${TREE_SIZE} ${TREE_SIZE}`}
              role="img"
              aria-label="音乐谱系放射树：中心是 2015 年的第一首歌，越往外越接近现在"
              onPointerMove={onTreeMove}
              onPointerLeave={onTreeLeave}
              onClick={onTreeClick}
              onKeyDown={onTreeKey}
              dangerouslySetInnerHTML={{ __html: treeHtml }}
              suppressHydrationWarning
            />
          </figure>
          <aside className="mp-card" aria-live="polite">
            <SpecimenCard sel={sel} model={model} onClose={() => setRawSel(null)} />
          </aside>
        </div>
      </section>

      {/* ================= PLATE II ================= */}
      <section className="mp-sec" id="plate-2">
        <div className="mp-wrap mp-plate-head">
          <div className="mp-plate-no">PLATE II · 地层柱</div>
          <h2>每一层的标准化石，是那一年的年度歌手</h2>
        </div>
        <div className="mp-wrap mp-strata-wrap">
          <figure className="mp-plate">
            <svg
              ref={strataRef}
              className="mp-strata"
              viewBox={`0 0 ${STRATA_WIDTH} ${strata.height}`}
              role="img"
              aria-label="年度歌手地层柱，从 2015 年到现在"
              onClick={onStrataPick}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onStrataPick(e);
                }
              }}
              dangerouslySetInnerHTML={{ __html: strata.svg }}
              suppressHydrationWarning
            />
          </figure>
          <aside className="mp-fossil" aria-live="polite">
            <FossilCard layerKey={layer} onLocate={(artist) => locate({ type: "art", id: artist })} />
          </aside>
        </div>
      </section>

      <section className="mp-wrap mp-index" id="appendix">
        <h2>附录 · 图版索引</h2>
        <div className="mp-index-grid">
          {MUSIC_FAMILIES.map((fam) => (
            <section key={fam.id}>
              <h4>{fam.letter} · {fam.zh}<span>{fam.latin}</span></h4>
              <ul>
                {fam.artists.flatMap((a) =>
                  a.songs.map((s, i) => (
                    <li key={`${a.id}:${i}`}>
                      <button type="button" onClick={() => locateSong(`${a.id}:${i}`)}>
                        {s.artistOnly ? a.name : s.t}
                        <span>{a.name} · {s.y}{s.guess ? "?" : ""}</span>
                      </button>
                    </li>
                  )),
                )}
              </ul>
            </section>
          ))}
        </div>
      </section>

      <div className="mp-tooltip" ref={tipRef} role="presentation" />
    </main>
  );
}

/* ================= 标本卡 ================= */
function SpecimenCard({ sel, model, onClose }: { sel: TreeSel | null; model: TreeModel; onClose: () => void }) {
  const close = <button className="mp-close" type="button" onClick={onClose}>关闭</button>;

  if (!sel) {
    return (
      <>
        <div className="mp-no">HOW TO READ</div>
        <h3>我听过的一切</h3>
        <p className="mp-tally">
          {MUSIC_HEADLINE_STATS.map((st) => <span key={st.unit}><b>{st.value}</b> {st.unit}</span>)}
        </p>
        <ul>
          <li><b>中心</b>是第一首歌（2015），<b>越往外越接近现在</b>。</li>
          <li>第一层分叉是<b>风格</b>，第二层是<b>歌手</b>。</li>
          <li>枝条越红，这一支<b>循环得越狠</b>。</li>
          <li>橙色圆点 J–R 是<b>品味转折点</b>。</li>
          <li>外圈：语种 → 来源 → 风格环 → 歌手环 → 封面标本。</li>
        </ul>
        <p className="mp-path">点封面、枝条或圆环，打开那一份标本卡。</p>
      </>
    );
  }

  if (sel.type === "tip") {
    const t = model.byId.get(sel.id);
    const info = t?.tip;
    if (!t || !info) return null;
    const lang = MUSIC_LANGS[info.lang], src = MUSIC_SOURCES[info.src];
    if (!info.named || !info.song) {
      return (
        <>
          {close}
          <div className="mp-no">PLACEHOLDER</div>
          <h3>未命名枝条</h3>
          <p>这是一根占位枝，用来模拟接入完整歌单后的密度。</p>
          <dl>
            <dt>科</dt><dd>{info.family.letter} {info.family.zh}</dd>
            <dt>入谱</dt><dd>{Math.floor(t.year)}</dd>
            <dt>语种</dt><dd><span className="mp-sw" style={{ background: lang.color }} />{lang.label}</dd>
            <dt>来源</dt><dd>{src.label}</dd>
          </dl>
          <p className="mp-path">{pathText(t)}</p>
        </>
      );
    }
    const s = info.song, a = info.artist;
    const name = songName(t as NamedTip);
    const yearly = MUSIC_YEARLY[a.id];
    return (
      <>
        {close}
        <div className="mp-no">SPECIMEN No. {info.no}</div>
        <h3>{name}</h3>
        {s.cover ? <img className="mp-cover" src={s.cover} alt={`${name} 封面`} /> : null}
        <dl>
          <dt>属 · 歌手</dt><dd>{a.name}{s.with ? <span className="mp-dim"> / {s.with}</span> : null}</dd>
          <dt>科 · 风格</dt><dd>{info.family.letter} {info.family.zh}</dd>
          <dt>入谱</dt><dd>{s.y}{s.guess ? <span className="mp-guess"> 推测</span> : null}{s.note ? ` · ${s.note}` : ""}</dd>
          <dt>语种</dt><dd><span className="mp-sw" style={{ background: lang.color }} />{lang.label}</dd>
          <dt>来源</dt><dd>{src.label}{s.srcGuess ? <span className="mp-guess"> 推测</span> : null}</dd>
          <dt>循环</dt><dd>{s.plays ? `${s.plays} 次` : "—"}</dd>
          {yearly ? <><dt>年度歌手</dt><dd>{yearly.join(" · ")}</dd></> : null}
        </dl>
        {s.lyrics?.map((l) => <blockquote key={l}>{l}</blockquote>)}
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        {s.url ? <audio key={s.url} controls preload="none" src={s.url} /> : null}
        {s.butterfly ? <p className="mp-path">副标题叫 Night Butterflies，所以它的标本上停着整张图版唯一一只真蝴蝶。</p> : null}
        <p className="mp-path">{pathText(t)}</p>
      </>
    );
  }

  if (sel.type === "art") {
    const { art, fam, tips } = model.artInfo[sel.id];
    const named = tips.filter((t): t is NamedTip => !!t.tip?.named);
    const yearly = MUSIC_YEARLY[art.id];
    return (
      <>
        {close}
        <div className="mp-no">GENUS · 歌手</div>
        <h3>{art.name || "未命名歌手（占位）"}</h3>
        <dl>
          <dt>科</dt><dd>{fam.letter} {fam.zh}</dd>
          <dt>枝数</dt><dd>{tips.length} 首</dd>
          <dt>首次入谱</dt><dd>{Math.floor(Math.min(...tips.map((t) => t.year)))}</dd>
          {yearly ? <><dt>年度歌手</dt><dd>{yearly.join(" · ")}</dd></> : null}
        </dl>
        {named.length ? (
          <ul>
            {named.map((t) => (
              <li key={t.tip.key}>{t.tip.song.artistOnly ? "（暂无单曲数据）" : t.tip.song.t} <span className="mp-dim">{yearText(t)}</span></li>
            ))}
          </ul>
        ) : null}
      </>
    );
  }

  const info = model.famInfo[sel.id];
  if (!info) return null;
  const arts = Object.values(model.artInfo).filter((i) => i.fam.id === info.fam.id);
  return (
    <>
      {close}
      <div className="mp-no">FAMILY {info.fam.letter}</div>
      <h3>{info.fam.zh}</h3>
      <p className="mp-latin">{info.fam.latin}</p>
      <dl>
        <dt>枝数</dt><dd>{info.crown.count} 首</dd>
        <dt>歌手</dt><dd>{arts.length} 位</dd>
        <dt>首次入谱</dt><dd>{Math.floor(info.crown.app)}</dd>
      </dl>
      <ul>
        {arts.filter((i) => !i.art.placeholder).map((i) => <li key={i.art.id}>{i.art.name}</li>)}
      </ul>
    </>
  );
}

/* ================= 化石卡 ================= */
function FossilCard({ layerKey, onLocate }: { layerKey: string; onLocate: (artist: string) => void }) {
  const r = MUSIC_STRATA.find((x) => x.key === layerKey);
  if (!r) return null;
  if (r.active || !r.artist) {
    return (
      <>
        <div className="mp-no">2026 — 今 · 现代沉积</div>
        <h3>还在往下落的这一层</h3>
        <p className="mp-desc">2026 还没过完，年度歌手要等年底的报告。到时候这一层会固结成岩，长出它的标准化石。</p>
        <p className="mp-desc">如果还是 Vivienne，「Vivienne 组 · 上段」就会再厚一层。</p>
      </>
    );
  }
  const artist = r.artist;
  const f = MUSIC_FOSSILS[artist];
  const span = r.label ?? String(r.year);
  const layers = layersOf(artist);
  const rep = r.year ? songsOfYear(r.year) : [];
  const treeSongs = r.years ? MUSIC_FAMILIES.flatMap((fa) => fa.artists.filter((a) => a.id === artist).flatMap((a) => a.songs)) : [];
  const rock = MUSIC_ROCKS[f.rock];
  const maxPlays = Math.max(...MUSIC_TOP_2024.map(([, c]) => c));
  return (
    <div key={layerKey}>
      <div className="mp-no">INDEX FOSSIL · {span} 层</div>
      <div className="mp-kicker">{span} 年度歌手</div>
      <div className="mp-photo"><img src={f.photo} alt={f.name} /></div>
      {f.photoNote ? <p className="mp-photo-note">{f.photoNote}</p> : null}
      <h3>{f.name}</h3>
      <p className="mp-style">{f.style}</p>
      {f.desc ? <p className="mp-desc">{f.desc}</p> : null}
      <dl>
        <dt>出现层位</dt><dd>{layers.join(" · ")}{layers.length > 1 ? `（${layers.length} 层）` : ""}</dd>
        <dt>岩性</dt><dd>{rock.label}{rock.note ? ` · ${rock.note}` : ""}</dd>
        {rep.length ? (
          <>
            <dt>同层</dt>
            <dd>{rep.map(({ s, a }) => <div key={s.t}>{s.t} <span className="mp-dim">{a.name}</span></div>)}</dd>
          </>
        ) : null}
        {treeSongs.length ? (
          <>
            <dt>谱系里</dt>
            <dd>{treeSongs.map((s) => <div key={s.t}>{s.t} <span className="mp-guess">{s.y}?</span></div>)}</dd>
          </>
        ) : null}
      </dl>
      {r.year === 2024 ? (
        <div className="mp-measure">
          <div className="mp-measure-t">2024 年最常听（原页面榜单）</div>
          {MUSIC_TOP_2024.map(([name, c], i) => (
            <div className="mp-row" key={name}>
              <span>{i + 1}</span><span>{name}</span><span>{c} 次</span>
              <div className="mp-bar"><i style={{ "--w": `${((c / maxPlays) * 100).toFixed(1)}%` } as CSSProperties} /></div>
            </div>
          ))}
        </div>
      ) : null}
      <button type="button" className="mp-linkbtn" onClick={() => onLocate(artist)}>在 Plate I 谱系中找到 {f.name} →</button>
    </div>
  );
}
