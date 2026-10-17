import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = join(root, "app", "nemesis", "music-manifest.json");
const LOOKUP_BASE = "https://itunes.apple.com/lookup";
const REQUEST_INTERVAL_MS = 3100;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function loadManifest() {
  const parsed = JSON.parse(readFileSync(manifestPath, "utf8"));
  if (!Array.isArray(parsed)) {
    throw new Error("music-manifest.json must be an array");
  }
  return parsed;
}

async function lookupTrack(trackId, country) {
  const url = `${LOOKUP_BASE}?id=${encodeURIComponent(String(trackId))}&country=${encodeURIComponent(country)}`;
  const response = await fetch(url);
  if (!response.ok) {
    return { ok: false, error: `lookup HTTP ${response.status}` };
  }

  const payload = await response.json();
  const track = payload.results?.find((item) => item.kind === "song" && item.wrapperType === "track");
  if (!track) {
    return { ok: false, error: "lookup resultCount=0 or no song" };
  }

  return { ok: true, track };
}

async function probePreviewUrl(previewUrl) {
  if (!previewUrl) {
    return { ok: false, error: "missing previewUrl" };
  }

  try {
    const response = await fetch(previewUrl, {
      method: "GET",
      headers: { Range: "bytes=0-1023" },
    });

    if (!(response.ok || response.status === 206)) {
      return { ok: false, error: `preview HTTP ${response.status}` };
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("audio") && !contentType.includes("mpeg") && !contentType.includes("mp4")) {
      return { ok: false, error: `unexpected content-type: ${contentType || "(empty)"}` };
    }

    const bytes = await response.arrayBuffer();
    if (bytes.byteLength < 64) {
      return { ok: false, error: "preview body too small" };
    }

    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

function isCnStoreUrl(url) {
  return typeof url === "string" && url.includes("music.apple.com/cn/");
}

async function verifyEntry(entry) {
  const country = entry.lookupCountry ?? "CN";
  const issues = [];

  if (!isCnStoreUrl(entry.trackViewUrl)) {
    issues.push("manifest trackViewUrl is not CN store");
  }

  const lookup = await lookupTrack(entry.trackId, country);
  if (!lookup.ok) {
    issues.push(`iTunes lookup (${country}): ${lookup.error}`);
    return { id: entry.id, trackId: entry.trackId, title: entry.title, ok: false, issues };
  }

  const { track } = lookup;
  if (!track.previewUrl) {
    issues.push("iTunes: no previewUrl in API");
  } else if (!track.isStreamable) {
    issues.push("iTunes: isStreamable=false");
  }

  if (track.previewUrl && entry.previewUrl && track.previewUrl !== entry.previewUrl) {
    issues.push("manifest previewUrl differs from live lookup (run music:sync)");
  }

  const livePreview = track.previewUrl ?? entry.previewUrl;
  const preview = await probePreviewUrl(livePreview);
  if (!preview.ok) {
    issues.push(`preview fetch: ${preview.error}`);
  }

  if (!isCnStoreUrl(track.trackViewUrl)) {
    issues.push(`live trackViewUrl is not CN: ${track.trackViewUrl ?? "(missing)"}`);
  }

  return {
    id: entry.id,
    trackId: entry.trackId,
    title: entry.title ?? track.trackName,
    ok: issues.length === 0,
    issues,
    liveTitle: track.trackName,
    livePreviewUrl: track.previewUrl,
    liveTrackViewUrl: track.trackViewUrl,
  };
}

async function main() {
  const manifest = loadManifest();
  const results = [];

  console.log(`Verifying ${manifest.length} track(s) against iTunes lookup + preview probe…\n`);

  for (let index = 0; index < manifest.length; index += 1) {
    const entry = manifest[index];
    process.stdout.write(`[${index + 1}/${manifest.length}] ${entry.id} … `);
    const result = await verifyEntry(entry);
    results.push(result);
    console.log(result.ok ? "OK" : `FAIL — ${result.issues.join("; ")}`);

    if (index < manifest.length - 1) {
      await sleep(REQUEST_INTERVAL_MS);
    }
  }

  const passed = results.filter((item) => item.ok);
  const failed = results.filter((item) => !item.ok);

  console.log("\n--- Summary ---");
  console.log(`Pass: ${passed.length}/${results.length}`);
  console.log(`Fail: ${failed.length}/${results.length}`);

  if (failed.length > 0) {
    console.log("\nFailed tracks:");
    for (const item of failed) {
      console.log(`  - ${item.id} (trackId ${item.trackId}): ${item.issues.join("; ")}`);
    }
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
