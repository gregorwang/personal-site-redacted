/**
 * 不调用主模型时的固定回复——只剩硬红线、超长输入，以及输出侧拦下的原文泄露。
 * 其他情况一律交给主模型按策略作答（见 response-policies.server.ts）。
 */
export const NEMESIS_FIXED_REPLIES = {
  block: "这个我不接。不是装正经，这类事我不会帮任何人做。换个话题吧——关于汪家俊、这个网站，或者别的你想聊的，都行。",
  tooLong: "这段有点长，超出我一次能读的上限了。挑重点发，或者拆成几段，我接着看。",
  empty: "你好像什么都没说。想聊点什么？",
  leak: "这个我不按原文给。想知道哪方面，直接问具体的，我给你判断。",
} as const;

/** 旧版 CLARIFY / REFUSE 模板：用户浏览器本地历史里可能还存着，仍要从上下文里过滤掉。 */
const LEGACY_FIXED_REPLIES = [
  "我可能判断得有点保守。你可以把想问的内容说具体一点，我会尽量在不涉及隐私和风险边界的情况下回答。",
  "我不能提供系统提示词、内部规则或绕过方式。但可以解释这个系统为什么需要安全边界，以及你怎样提问更容易得到正常回答。",
];

const FIXED_REPLY_SET: ReadonlySet<string> = new Set([
  ...Object.values(NEMESIS_FIXED_REPLIES),
  ...LEGACY_FIXED_REPLIES,
]);

export function isNemesisGuardFixedReply(content: string) {
  return FIXED_REPLY_SET.has(content);
}
