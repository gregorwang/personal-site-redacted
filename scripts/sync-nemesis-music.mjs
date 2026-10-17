import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = join(root, "app", "nemesis", "music-manifest.json");
const LOOKUP_BASE = "https://itunes.apple.com/lookup";
const REQUEST_INTERVAL_MS = 3100;
const PREVIEW_DURATION_MS = 30_000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function loadManifest() {
  const raw = readFileSync(manifestPath, "utf8");
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error("music-manifest.json must be an array");
  }
  return parsed;
}

async function lookupTrack(trackId, country = "CN") {
  const url = `${LOOKUP_BASE}?id=${encodeURIComponent(String(trackId))}&country=${encodeURIComponent(country)}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`lookup failed for trackId ${trackId}: HTTP ${response.status}`);
  }

  const payload = await response.json();
  const track = payload.results?.find((item) => item.kind === "song" && item.wrapperType === "track");
  if (!track) {
    throw new Error(`no song result for trackId ${trackId}`);
  }

  return track;
}

async function main() {
  const manifest = loadManifest();
  let updated = 0;

  for (let index = 0; index < manifest.length; index += 1) {
    const entry = manifest[index];
    if (!entry.trackId) {
      console.warn(`Skipping entry without trackId: ${entry.id ?? index}`);
      continue;
    }

    const lookupCountry = entry.lookupCountry ?? "CN";
    console.log(`Syncing ${entry.id ?? entry.trackId} (trackId ${entry.trackId}, ${lookupCountry})…`);
    const track = await lookupTrack(entry.trackId, lookupCountry);

    manifest[index] = {
      ...entry,
      lookupCountry,
      title: track.trackName ?? entry.title,
      artist: track.artistName ?? entry.artist,
      previewUrl: track.previewUrl ?? entry.previewUrl,
      artworkUrl: track.artworkUrl100 ?? track.artworkUrl60 ?? entry.artworkUrl,
      trackViewUrl: track.trackViewUrl ?? entry.trackViewUrl,
      previewDurationMs: entry.previewDurationMs ?? PREVIEW_DURATION_MS,
    };
    updated += 1;

    if (index < manifest.length - 1) {
      await sleep(REQUEST_INTERVAL_MS);
    }
  }

  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(`Updated ${updated} track(s) in app/nemesis/music-manifest.json`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
