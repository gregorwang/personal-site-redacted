const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;
const model = process.env.NEMESIS_GEMINI_LITE_MODEL || "gemini-3.5-flash-lite";
const thinkingLevel = (process.env.NEMESIS_GEMINI_THINKING_LEVEL || "high").toLowerCase();

if (!apiKey) {
  console.error("Set GOOGLE_AI_API_KEY or GEMINI_API_KEY before running this script.");
  process.exit(1);
}

async function callGemini(contents, label) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const started = Date.now();
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents,
      generationConfig: {
        maxOutputTokens: 512,
        thinkingConfig: { thinkingLevel },
      },
    }),
  });

  const data = await response.json();
  const elapsedMs = Date.now() - started;
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  const answer = parts
    .filter((part) => !part.thought && part.text)
    .map((part) => part.text)
    .join("\n")
    .trim();

  console.log(`\n=== ${label} ===`);
  console.log("status:", response.status);
  console.log("elapsedMs:", elapsedMs);
  console.log("finishReason:", data.candidates?.[0]?.finishReason);
  console.log("thoughtsTokenCount:", data.usageMetadata?.thoughtsTokenCount);
  console.log("candidatesTokenCount:", data.usageMetadata?.candidatesTokenCount);
  console.log("answerPreview:", answer.slice(0, 160) || "(empty)");
  if (!response.ok) {
    console.log("error:", data.error?.message || data);
  }
}

const singleTurn = [{ role: "user", parts: [{ text: "用一句话解释 Occam's Razor。" }] }];
const multiTurn = [
  { role: "user", parts: [{ text: "他叫小明，不喜欢抽烟。" }] },
  { role: "model", parts: [{ text: "记住了，他不抽烟。" }] },
  { role: "user", parts: [{ text: "我怎么才能帮助他呢？" }] },
];

await callGemini(singleTurn, `single-turn (${model}, thinking=${thinkingLevel})`);
await callGemini(multiTurn, `multi-turn without thought signatures (${model}, thinking=${thinkingLevel})`);
