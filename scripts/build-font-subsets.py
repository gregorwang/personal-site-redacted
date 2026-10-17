#!/usr/bin/env python3
"""Build frequency-ordered Noto Serif SC ExtraLight woff2 subsets.

CJK ideographs (U+4E00-9FFF) are grouped by Google Fonts' frequency-based slicing of
Noto Serif SC (scripts/data/noto-serif-sc-slices.json, index 0 = most common characters).
Only the grouping (unicode-range lists) comes from Google; glyphs are subset from our own
source font. Characters Google does not slice (rare ideographs) are appended as
code-point-ordered tail slices.

On top of that, scripts/data/site-core-chars.json (written by scripts/collect-site-chars.mjs from the
rendered pages) lists the characters this site really uses. They go into a few "core" slices placed
before the Google slices, so a normal page needs 1-3 CJK files instead of ~30. Anything outside the
core set (user-written guestbook text, new copy) still falls through to the Google frequency slices.

Output files are content-hashed (`noto-serif-sc-200-<name>-<sha256[:8]>.woff2`) because
/fonts/* is served from R2 with `immutable` cache headers: a changed font MUST get a new URL.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from fontTools.ttLib import TTFont


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "assets" / "fonts"
PUBLIC_FONT_DIR = ROOT / "public" / "fonts"
CSS_PATH = ROOT / "app" / "styles" / "fonts.css"
SLICES_PATH = ROOT / "scripts" / "data" / "noto-serif-sc-slices.json"
CORE_CHARS_PATH = ROOT / "scripts" / "data" / "site-core-chars.json"
FONT_SLUG = "noto-serif-sc-200"
FONT_SOURCE_NAME = "NotoSerifCJKsc-ExtraLight.otf"
FONT_WEIGHT = 200

DEFAULT_SOURCE = SOURCE_DIR / FONT_SOURCE_NAME
DEFAULT_DOWNLOAD_URL = (
    "https://github.com/notofonts/noto-cjk/raw/main/"
    f"Serif/OTF/SimplifiedChinese/{FONT_SOURCE_NAME}"
)

GOOGLE_CSS_URL = "https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@200&display=swap"
# Google serves the unsliced legacy format unless the UA looks like a modern browser.
GOOGLE_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36"
)

BASE_SUBSETS = [
    ("latin", "U+0000-00FF,U+2000-206F"),
    ("cjk-symbols", "U+3000-303F,U+FF00-FFEF"),
    ("kana", "U+3040-30FF"),
]

CJK_START = 0x4E00
CJK_END = 0x9FFF
CJK_BLOCK = frozenset(range(CJK_START, CJK_END + 1))
# Ideographs Google's slicing does not cover are rare; keep each tail slice small so a stray
# rare character costs one ~100-200KB file instead of one multi-MB file.
TAIL_SLICE_SIZE = 400

# Same flags as the previous code-point-range build for the base slices (latin kerning/ligatures,
# kana/punctuation alternates). CJK ideograph slices drop GSUB/GPOS entirely (see CJK_SUBSET_FLAGS).
SUBSET_FLAGS = [
    "--flavor=woff2",
    "--layout-features=*",
    "--glyph-names",
    "--symbol-cmap",
    "--legacy-cmap",
    "--notdef-glyph",
    "--notdef-outline",
    "--recommended-glyphs",
    "--name-IDs=*",
    "--name-legacy",
    "--name-languages=*",
    "--drop-tables+=DSIG",
]


# Layout features (vert, palt, locl...) roughly double an ideograph slice's size, and the site uses
# none of them on CJK text: no vertical writing, no font-feature-settings, and ja pages already
# share the SC glyphs. Dropped for CJK slices only; re-add `--layout-features=*` here if that changes.
CJK_SUBSET_FLAGS = [flag for flag in SUBSET_FLAGS if not flag.startswith("--layout-features")] + ["--layout-features="]


def parse_unicode_ranges(text: str) -> set[int]:
    code_points: set[int] = set()
    for part in text.split(","):
        part = part.strip()
        if not part:
            continue
        if not part.upper().startswith("U+"):
            raise ValueError(f"Bad unicode-range token: {part!r}")
        body = part[2:]
        if "-" in body:
            start, end = body.split("-", 1)
            code_points.update(range(int(start, 16), int(end, 16) + 1))
        else:
            code_points.add(int(body, 16))
    return code_points


def format_unicode_ranges(code_points: set[int]) -> str:
    ordered = sorted(code_points)
    parts: list[str] = []
    start = prev = ordered[0]
    for cp in ordered[1:] + [None]:  # type: ignore[list-item]
        if cp is not None and cp == prev + 1:
            prev = cp
            continue
        parts.append(f"U+{start:04X}" if start == prev else f"U+{start:04X}-{prev:04X}")
        if cp is not None:
            start = prev = cp
    return ",".join(parts)


def download_source(source: Path, url: str) -> None:
    source.parent.mkdir(parents=True, exist_ok=True)
    if source.exists():
        return

    print(f"Downloading {url}")
    with urllib.request.urlopen(url) as response:
        source.write_bytes(response.read())


def refresh_slices() -> None:
    """Re-fetch Google's frequency slicing. Only run by hand; the build never touches the network."""
    request = urllib.request.Request(GOOGLE_CSS_URL, headers={"User-Agent": GOOGLE_UA})
    with urllib.request.urlopen(request) as response:
        css = response.read().decode("utf-8")

    numbered: list[tuple[int, str]] = []
    for block in re.findall(r"@font-face\s*\{(.*?)\}", css, re.S):
        index = re.search(r"\.(\d+)\.woff2", block)
        ranges = re.search(r"unicode-range:\s*([^;]+);", block)
        # Un-numbered faces are the cyrillic / vietnamese / latin-ext / latin slices.
        if index and ranges:
            numbered.append((int(index.group(1)), ranges.group(1).strip()))

    if len(numbered) < 50:
        raise SystemExit(f"Google CSS looks unsliced or its format changed ({len(numbered)} numbered faces).")

    # Higher Google index = more common characters (index 119 holds 的/一/是/不/了), so descending N
    # gives frequency rank: list index 0 is the most common slice.
    numbered.sort(key=lambda item: item[0], reverse=True)
    SLICES_PATH.parent.mkdir(parents=True, exist_ok=True)
    SLICES_PATH.write_text(json.dumps([ranges for _, ranges in numbered], ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {SLICES_PATH.relative_to(ROOT)} ({len(numbered)} slices)")


def plan_cjk_slices(font_cmap: set[int]) -> list[tuple[str, set[int]]]:
    """Core-first, then frequency-ordered CJK groups: every ideograph in the font lands in exactly one."""
    base_covered: set[int] = set()
    for _, unicode_range in BASE_SUBSETS:
        base_covered |= parse_unicode_ranges(unicode_range)

    available = (set(CJK_BLOCK) & font_cmap) - base_covered
    assigned: set[int] = set()
    planned: list[tuple[str, set[int]]] = []

    # Site core tiers (zh-home, zh-site, ja-site...), in file order. A character belongs to the
    # first tier that needs it.
    core_tiers: dict[str, str] = json.loads(CORE_CHARS_PATH.read_text(encoding="utf-8"))
    for tier, chars in core_tiers.items():
        group = {ord(ch) for ch in chars} & available - assigned
        if group:
            planned.append((f"core-{tier}", group))
            assigned |= group

    groups: list[set[int]] = []
    for unicode_range in json.loads(SLICES_PATH.read_text(encoding="utf-8")):
        group = parse_unicode_ranges(unicode_range) & available - assigned
        if group:
            groups.append(group)
            assigned |= group

    tail = sorted(available - assigned)
    for i in range(0, len(tail), TAIL_SLICE_SIZE):
        groups.append(set(tail[i : i + TAIL_SLICE_SIZE]))

    planned += [(f"{index:03d}", group) for index, group in enumerate(groups)]
    return planned


def subset_font(source: Path, output: Path, code_points: set[int], flags: list[str]) -> None:
    unicodes = ",".join(f"U+{cp:04X}" for cp in sorted(code_points))
    cmd = [
        sys.executable,
        "-m",
        "fontTools.subset",
        str(source),
        f"--output-file={output}",
        f"--unicodes={unicodes}",
        *flags,
    ]
    subprocess.run(cmd, check=True)


def build_slice(source: Path, name: str, wanted: set[int]) -> dict:
    temp = PUBLIC_FONT_DIR / f".tmp-{FONT_SLUG}-{name}.woff2"
    is_base = name in {base_name for base_name, _ in BASE_SUBSETS}
    subset_font(source, temp, wanted, SUBSET_FLAGS if is_base else CJK_SUBSET_FLAGS)

    digest = hashlib.sha256(temp.read_bytes()).hexdigest()[:8]
    final = PUBLIC_FONT_DIR / f"{FONT_SLUG}-{name}-{digest}.woff2"
    temp.replace(final)

    # unicode-range must list what the file really contains, so the browser never downloads a
    # slice for a character that is not in it. Intersect with `wanted` so helper glyphs that
    # --recommended-glyphs may map (space, CR...) never leak into a CJK slice's range.
    with TTFont(final) as font:
        actual = set(font.getBestCmap().keys())
    covered = actual & wanted
    extras = actual - wanted
    return {
        "name": name,
        "file": final.name,
        "size": final.stat().st_size,
        "covered": covered,
        "wanted": wanted,
        "extras": extras,
    }


def write_css(slices: list[dict]) -> None:
    CSS_PATH.parent.mkdir(parents=True, exist_ok=True)
    blocks = [
        "/* Generated by scripts/build-font-subsets.py. Do not edit by hand. */",
        "/* Metric-aligned fallback faces live in app/styles/fonts-fallback.css */",
        "",
    ]

    for item in slices:
        blocks.append("@font-face {")
        blocks.append('  font-family: "SiteSourceHanSerif";')
        blocks.append("  font-style: normal;")
        blocks.append(f"  font-weight: {FONT_WEIGHT};")
        blocks.append("  font-display: swap;")
        blocks.append(f'  src: url("/fonts/{item["file"]}") format("woff2");')
        blocks.append(f"  unicode-range: {format_unicode_ranges(item['covered'])};")
        blocks.append("}")
        blocks.append("")

    CSS_PATH.write_text("\n".join(blocks), encoding="utf-8")


def verify(slices: list[dict], font_cmap: set[int]) -> bool:
    """Script-level coverage check on the built files (not on the plan)."""
    ok = True
    owner: dict[int, str] = {}
    duplicates = 0
    for item in slices:
        for cp in item["covered"]:
            if cp in owner:
                duplicates += 1
            owner[cp] = item["name"]
        missing = item["wanted"] - item["covered"]
        if missing:
            ok = False
            print(f"  FAIL slice {item['name']}: {len(missing)} wanted code points missing from built font")

    cjk_in_font = CJK_BLOCK & font_cmap
    cjk_missing = cjk_in_font - set(owner)
    base_ok = True
    for name, unicode_range in BASE_SUBSETS:
        wanted = parse_unicode_ranges(unicode_range) & font_cmap
        base_ok &= wanted <= {cp for cp in owner if owner[cp] == name}
    base_names = {name for name, _ in BASE_SUBSETS}
    cjk_slices = [item for item in slices if item["name"] not in base_names]
    cjk_covered = {cp for item in cjk_slices for cp in item["covered"]}

    print(f"  U+4E00-9FFF in source font: {len(cjk_in_font)} / {len(CJK_BLOCK)}")
    print(f"  covered by CJK slices:      {len(cjk_covered & CJK_BLOCK)} / {len(cjk_in_font)}")
    print(f"  missing:                    {len(cjk_missing)}")
    print(f"  code points in >1 slice:    {duplicates}")
    print(f"  latin/symbols/kana covered: {'yes' if base_ok else 'NO'}")
    leaks = sum(len(item["extras"]) for item in cjk_slices)
    print(f"  extra cmap entries ignored in unicode-range (helper glyphs): {leaks}")
    return ok and not cjk_missing and duplicates == 0 and base_ok


def main() -> None:
    parser = argparse.ArgumentParser(description="Build frequency-sliced Noto Serif SC ExtraLight woff2 subsets.")
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE, help="Path to Source Han/Noto Serif SC ExtraLight OTF/TTF.")
    parser.add_argument("--download", action="store_true", help=f"Download {FONT_SOURCE_NAME} if --source is missing.")
    parser.add_argument("--download-url", default=DEFAULT_DOWNLOAD_URL, help="Font source URL used with --download.")
    parser.add_argument("--refresh-slices", action="store_true", help="Re-fetch Google's frequency slicing into scripts/data and exit.")
    args = parser.parse_args()

    if args.refresh_slices:
        refresh_slices()
        return

    source = args.source.resolve()
    if args.download:
        download_source(source, args.download_url)

    if not source.exists():
        raise SystemExit(
            f"Font source not found: {source}\n"
            "Pass --source path/to/SourceHanSerifSC-ExtraLight.otf or run with --download."
        )

    with TTFont(source, lazy=True) as font:
        font_cmap = set(font.getBestCmap().keys())

    PUBLIC_FONT_DIR.mkdir(parents=True, exist_ok=True)
    for pattern in (
        "noto-serif-sc-regular-*.woff2",
        "noto-serif-sc-extralight-*.woff2",
        f"{FONT_SLUG}-*.woff2",
        ".tmp-*.woff2",
    ):
        for stale in PUBLIC_FONT_DIR.glob(pattern):
            stale.unlink()

    jobs: list[tuple[str, set[int]]] = [
        (name, parse_unicode_ranges(unicode_range) & font_cmap) for name, unicode_range in BASE_SUBSETS
    ]
    jobs += plan_cjk_slices(font_cmap)
    print(f"Building {len(jobs)} subsets ({len(BASE_SUBSETS)} base + {len(jobs) - len(BASE_SUBSETS)} CJK)")

    with ThreadPoolExecutor(max_workers=os.cpu_count() or 4) as pool:
        slices = list(pool.map(lambda job: build_slice(source, job[0], job[1]), jobs))

    write_css(slices)
    print(f"Wrote {CSS_PATH.relative_to(ROOT)}")

    sizes = [(item["size"], item["file"]) for item in slices]
    total = sum(size for size, _ in sizes)
    largest = max(sizes)
    smallest = min(sizes)
    print(f"Slices: {len(slices)}  Total: {total:,} bytes")
    print(f"Largest:  {largest[0]:,} bytes  {largest[1]}")
    print(f"Smallest: {smallest[0]:,} bytes  {smallest[1]}")

    print("Coverage check:")
    if not verify(slices, font_cmap):
        raise SystemExit("Coverage check FAILED")
    print("Coverage check passed")


if __name__ == "__main__":
    main()
