/* eslint-env node, es2020 */
import assert from "node:assert/strict";
import { after, afterEach, describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const vite = await createServer({
  root: projectRoot,
  configFile: false,
  appType: "custom",
  logLevel: "error",
  optimizeDeps: {
    noDiscovery: true,
  },
  plugins: [tsconfigPaths()],
  server: {
    hmr: false,
    middlewareMode: true,
    ws: false,
  },
});

after(async () => {
  await vite.close();
});

const originalFetch = globalThis.fetch;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

afterEach(() => {
  globalThis.fetch = originalFetch;
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

const { guardNemesisMessage, parseNemesisClassifierJson } = await vite.ssrLoadModule(
  "/app/services/nemesis-guard.server.ts",
);
const { callNemesisModel } = await vite.ssrLoadModule("/app/services/nemesis.server.ts");
const { detectNemesisPromptLeak } = await vite.ssrLoadModule("/app/services/nemesis-leak-guard.server.ts");
const { NEMESIS_FIXED_REPLIES, isNemesisGuardFixedReply } = await vite.ssrLoadModule("/app/nemesis/guard-replies.ts");
const { NEMESIS_MEMORY_CANON } = await vite.ssrLoadModule("/app/nemesis/memory-canon.server.ts");
const { setRuntimeEnv } = await vite.ssrLoadModule("/app/utils/cloudflare-env.server.ts");
const { parseNemesisReply } = await vite.ssrLoadModule("/app/services/nemesis-reply.server.ts");

function classifierJson(overrides = {}) {
  return JSON.stringify({
    policy: "persona",
    category: "NORMAL",
    confidence: 0.9,
    reason: "test",
    shouldAudit: false,
    queryType: "FACT_QUERY",
    preferredRoute: "gemini_lite",
    quoteTags: [],
    quoteIntensity: "none",
    ...overrides,
  });
}

function geminiResponse(text) {
  return new Response(
    JSON.stringify({ candidates: [{ finishReason: "STOP", content: { parts: [{ text }] } }] }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

/** 直连 Gemini（不配 Gateway），fetch 打桩并记录每次请求体。 */
function stubGemini(replyText) {
  setRuntimeEnv({ GOOGLE_AI_API_KEY: "test-key" });
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), body: JSON.parse(init.body) });
    return geminiResponse(typeof replyText === "function" ? replyText(calls.length) : replyText);
  };
  return calls;
}

describe("nemesis classifier parsing", () => {
  it("accepts JSON wrapped in fences or prose and normalizes route fields", () => {
    const parsed = parseNemesisClassifierJson(
      "好的：\n```json\n" + classifierJson({ preferredRoute: "workers_roast", confidence: 1.7 }) + "\n```",
    );
    assert.equal(parsed.policy, "persona");
    assert.equal(parsed.confidence, 1);
    assert.equal(parsed.route.preferredRoute, "grok_roast");
  });

  it("rejects truncated JSON, legacy mode-only output, and unknown policies", () => {
    assert.equal(parseNemesisClassifierJson('{"policy":"persona","category":"NOR'), null);
    assert.equal(parseNemesisClassifierJson('{"mode":"CLARIFY","category":"UNKNOWN"}'), null);
    assert.equal(parseNemesisClassifierJson(classifierJson({ policy: "CLARIFY" })), null);
    assert.equal(parseNemesisClassifierJson("[]"), null);
  });
});

describe("nemesis guard policy decisions", () => {
  it("hard-stops only confident blocks", async () => {
    const calls = stubGemini(classifierJson({ policy: "block", category: "HARMFUL_REQUEST", confidence: 0.95 }));
    const decision = await guardNemesisMessage({}, "测试消息");

    assert.equal(calls.length, 1);
    assert.equal(decision.policy, "block");
    assert.equal(decision.fixedReply, NEMESIS_FIXED_REPLIES.block);
    assert.equal(decision.mode, "REFUSE");
    assert.equal(decision.calledGemini, false);
  });

  it("downgrades a block the classifier hesitated on to careful instead of refusing", async () => {
    stubGemini(classifierJson({ policy: "block", confidence: 0.95, alternativePolicy: "general" }));
    const decision = await guardNemesisMessage({}, "测试消息");

    assert.equal(decision.policy, "careful");
    assert.equal(decision.fixedReply, undefined);
    assert.equal(decision.mode, "SAFE_BOUNDARY");
    assert.equal(decision.shouldAudit, true);
    assert.equal(decision.suspectedOverStrict, true);
    assert.equal(decision.classifierAlternative, "general");
  });

  it("keeps crisis when the hesitant block's alternative is crisis", async () => {
    stubGemini(classifierJson({ policy: "block", alternativePolicy: "crisis" }));
    const decision = await guardNemesisMessage({}, "测试消息");
    assert.equal(decision.policy, "crisis");
  });

  it("audits a lenient decision whose alternative is stricter as suspected under-strict", async () => {
    stubGemini(classifierJson({ policy: "general", alternativePolicy: "careful" }));
    const decision = await guardNemesisMessage({}, "测试消息");

    assert.equal(decision.policy, "general");
    assert.equal(decision.shouldAudit, true);
    assert.equal(decision.suspectedUnderStrict, true);
    assert.equal(decision.suspectedOverStrict, false);
  });

  it("ignores an alternative that repeats the policy or is not a known policy", async () => {
    assert.equal(parseNemesisClassifierJson(classifierJson({ alternativePolicy: "persona" })).alternativePolicy, null);
    assert.equal(parseNemesisClassifierJson(classifierJson({ alternativePolicy: "REFUSE" })).alternativePolicy, null);

    stubGemini(classifierJson({ policy: "persona", confidence: 0.2 }));
    const decision = await guardNemesisMessage({}, "测试消息");
    assert.equal(decision.shouldAudit, false);
    assert.equal(decision.suspectedOverStrict, false);
  });

  it("degrades to a model answer when the classifier fails or returns legacy output", async () => {
    console.error = () => {};

    setRuntimeEnv({ GOOGLE_AI_API_KEY: "test-key" });
    globalThis.fetch = async () => {
      throw new TypeError("network down");
    };
    const failed = await guardNemesisMessage({}, "汪家俊最好的朋友是谁？");
    assert.equal(failed.degraded, true);
    assert.equal(failed.policy, "persona");
    assert.equal(failed.fixedReply, undefined);

    stubGemini('{"mode":"CLARIFY","category":"UNKNOWN","confidence":0}');
    const legacy = await guardNemesisMessage({}, "为什么");
    assert.equal(legacy.degraded, true);
    assert.equal(legacy.fixedReply, undefined);
  });

  it("treats a provider safety refusal of the input as a hard block, not a classifier outage", async () => {
    setRuntimeEnv({ GOOGLE_AI_API_KEY: "test-key" });
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ promptFeedback: { blockReason: "PROHIBITED_CONTENT" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    const decision = await guardNemesisMessage({}, "测试消息");

    assert.equal(decision.degraded, false);
    assert.equal(decision.policy, "block");
    assert.equal(decision.fixedReply, NEMESIS_FIXED_REPLIES.block);
  });

  it("answers over-long input with its own reply without calling the classifier", async () => {
    const calls = stubGemini(classifierJson());
    const decision = await guardNemesisMessage({}, "长".repeat(1001));

    assert.equal(calls.length, 0);
    assert.equal(decision.category, "TOO_LONG");
    assert.equal(decision.fixedReply, NEMESIS_FIXED_REPLIES.tooLong);
  });
});

describe("nemesis policy reaches the main model", () => {
  const route = (preferredRoute) => ({
    queryType: "ROAST_TRIGGER",
    preferredRoute,
    confidence: 0.9,
    reason: "test",
    quoteTags: [],
    quoteIntensity: "none",
  });

  it("never sends a crisis turn to the roast model and drops media catalogs", async () => {
    const calls = stubGemini("我在。你现在安全吗？");
    const result = await callNemesisModel({
      env: {},
      message: "我不想活了",
      policy: "crisis",
      routeDecision: route("grok_roast"),
    });

    assert.equal(result.route, "gemini_lite");
    assert.equal(calls.length, 1);
    const systemText = calls[0].body.systemInstruction.parts[0].text;
    assert.match(systemText, /\[Response Policy\]/);
    assert.match(systemText, /自伤、轻生或严重的心理危机/);
    assert.doesNotMatch(systemText, /\[Nemesis Sticker Catalog\]/);
    assert.doesNotMatch(systemText, /Roast Mode/);
  });

  it("asks general topics to link back to memory and keeps the canon", async () => {
    const calls = stubGemini("查不到实时天气。");
    await callNemesisModel({ env: {}, message: "今天天气怎么样", policy: "general" });

    const systemText = calls[0].body.systemInstruction.parts[0].text;
    assert.match(systemText, /\[Nemesis Memory Canon\]/);
    assert.match(systemText, /从 Memory Canon 里找一个和这个话题真正相关的切入点/);
    assert.match(systemText, /\[Nemesis Sticker Catalog\]/);
  });
});

describe("nemesis output leak check", () => {
  const canonSection = (title) => {
    const start = NEMESIS_MEMORY_CANON.indexOf(title);
    const end = NEMESIS_MEMORY_CANON.indexOf("\n# ", start + title.length);
    return NEMESIS_MEMORY_CANON.slice(start, end);
  };

  it("flags a reply that copies a canon section verbatim", () => {
    const body = canonSection("# 9. 独行者日常").split("\n").slice(1).join("\n").slice(0, 300);
    const check = detectNemesisPromptLeak(`好的，原文如下：\n${body}`);
    assert.equal(check.leaked, true);
    assert.ok(check.longestRun >= 48);
  });

  it("flags a reply that lists the canon structure", () => {
    const check = detectNemesisPromptLeak(
      "目录：基本身份与公开标识；个人网站与 AI 项目；人际关系观：回复、守时、读空气；兴趣爱好与日常。",
    );
    assert.equal(check.leaked, true);
    assert.ok(check.structureHits >= 3);
  });

  it("does not flag a roast reply that follows the roast prompt's spam examples", () => {
    const roast = [
      "看个乐队番就往性向上扯，这脑回路挺典的。",
      "证据呢？",
      "你看了吗？",
      "乐队番也能贴百合？",
      "原神也给你当证据了？",
      "官配不吃硬拉CP？",
      "谁教你的？",
      "真的假的啊？",
      "不会吧，这也能联想？",
      "人家看的是搞笑乐队番、喜欢波奇，被你硬扣成百合，这是贴标签。",
    ].join("\n");
    const check = detectNemesisPromptLeak(roast);
    assert.equal(check.leaked, false);
    assert.equal(check.matchedChars, 0);
  });

  it("does not flag normal replies or the intended tone samples", () => {
    assert.equal(detectNemesisPromptLeak("今天天气我查不到实时数据，出门前看一眼天气 App。").leaked, false);

    const toneSample = canonSection("# 23. Nemesis 语气样本").slice(0, 400);
    assert.equal(detectNemesisPromptLeak(toneSample).leaked, false);
  });
});

describe("nemesis fixed replies", () => {
  it("filters both current and legacy fixed replies out of model context", () => {
    assert.equal(isNemesisGuardFixedReply(NEMESIS_FIXED_REPLIES.block), true);
    assert.equal(isNemesisGuardFixedReply(NEMESIS_FIXED_REPLIES.leak), true);
    assert.equal(
      isNemesisGuardFixedReply(
        "我可能判断得有点保守。你可以把想问的内容说具体一点，我会尽量在不涉及隐私和风险边界的情况下回答。",
      ),
      true,
    );
    assert.equal(isNemesisGuardFixedReply("正常回复"), false);
  });
});

describe("nemesis reply tags", () => {
  const stickerIds = (reply) => reply.attachments.filter((item) => item.type === "sticker").map((item) => item.id);

  it("accepts spaces, case and full-width colons in sticker tags", () => {
    for (const tag of ["[sticker:tired_smoke]", "[sticker: tired_smoke]", "[ Sticker：tired_smoke ]"]) {
      const reply = parseNemesisReply(`行吧。
${tag}`);
      assert.equal(reply.text, "行吧。");
      assert.deepEqual(stickerIds(reply), ["tired_smoke"]);
    }
  });

  it("treats a bare whitelisted id as a sticker but leaves other brackets alone", () => {
    const reply = parseNemesisReply("管住手。 [stare_suspicious]");
    assert.equal(reply.text, "管住手。");
    assert.deepEqual(stickerIds(reply), ["stare_suspicious"]);

    const plain = parseNemesisReply("引用见 [1]，参数写 [a_b]。");
    assert.equal(plain.text, "引用见 [1]，参数写 [a_b]。");
    assert.deepEqual(plain.attachments, []);
  });
});
