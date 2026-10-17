import { defineMessages, type MessageDescriptor } from "react-intl";
import type { NemesisFeedbackCategory } from "~/types/nemesis-chat";

export const NEMESIS_CHAT_SESSIONS_KEY = "nemesisChatSessions";
export const NEMESIS_PRIVACY_ACK_KEY = "nemesisPrivacyNoticeAccepted";
export const MAX_NEMESIS_CHAT_SESSIONS = 20;

const FEEDBACK_LABELS = defineMessages({
  persona_mismatch: { defaultMessage: "不像汪家俊", description: "Nemesis 反馈分类" },
  hallucination: { defaultMessage: "疑似瞎说", description: "Nemesis 反馈分类：编造事实" },
  contradiction: { defaultMessage: "前后矛盾", description: "Nemesis 反馈分类" },
  low_quality: { defaultMessage: "回答质量差", description: "Nemesis 反馈分类" },
  unsafe: { defaultMessage: "边界不合适", description: "Nemesis 反馈分类：回答越界" },
  other: { defaultMessage: "其他", description: "Nemesis 反馈分类" },
}) satisfies Record<NemesisFeedbackCategory, MessageDescriptor>;

export const NEMESIS_FEEDBACK_CATEGORIES: Array<{ value: NemesisFeedbackCategory; label: MessageDescriptor }> = (
  ["persona_mismatch", "hallucination", "contradiction", "low_quality", "unsafe", "other"] as const
).map((value) => ({ value, label: FEEDBACK_LABELS[value] }));

const PRIVACY_MESSAGES = defineMessages({
  title: { defaultMessage: "聊天隐私提示", description: "Nemesis 隐私说明弹层标题" },
  local: {
    defaultMessage: "平时的聊天记录不会保存到网站数据库，只存在你当前设备的浏览器本地存储里，方便你下次继续查看。",
    description: "Nemesis 隐私说明",
  },
  audit: {
    defaultMessage:
      "以下几种情况，这一轮的问题、回复和少量上下文会留存到后台审计，用于排查问题和改进安全规则：触发安全规则（比如被拦下或被婉拒）；安全系统临时故障、按降级模式回答；你主动点了某条回复的「反馈」。",
    description: "Nemesis 隐私说明",
  },
  thirdParty: {
    defaultMessage: "为了生成回复，你的消息会发送给第三方大模型服务（如 Google Gemini、DeepSeek）处理。",
    description: "Nemesis 隐私说明",
  },
  lost: {
    defaultMessage: "如果你清理浏览器数据、更换设备、更换浏览器，或使用无痕模式，本地聊天记录可能会消失。",
    description: "Nemesis 隐私说明",
  },
  sensitive: { defaultMessage: "请不要输入密码、身份证、银行卡、住址等高度敏感信息。", description: "Nemesis 隐私说明" },
  emphasis: {
    defaultMessage: "日常闲聊我看不到；只有触发审核或你主动反馈的那几轮，我会看到。",
    description: "Nemesis 隐私说明末尾的强调句，「我」是站长",
  },
});

export const NEMESIS_PRIVACY_NOTICE = {
  title: PRIVACY_MESSAGES.title,
  paragraphs: [
    PRIVACY_MESSAGES.local,
    PRIVACY_MESSAGES.audit,
    PRIVACY_MESSAGES.thirdParty,
    PRIVACY_MESSAGES.lost,
    PRIVACY_MESSAGES.sensitive,
  ],
  emphasis: PRIVACY_MESSAGES.emphasis,
} as const;
