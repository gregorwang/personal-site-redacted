import { defineMessage, defineMessages } from "react-intl";

export const HERO_CONTACT_EMAIL = "gregorwang@エミリア.com";

export const heroMessages = defineMessages({
  title: {
    defaultMessage: "这片空间先向你开放一部分",
    description: "首页 hero 主标题",
  },
  intro: {
    defaultMessage: "我是汪家俊。这个网站还在整理，先把已经成形的光、声音、故事与入口交给你。",
    description: "首页 hero 第一段",
  },
  notice: {
    defaultMessage: "我借一个温柔的名字，做一个自己的私人空间。这里不是任何作品、角色或版权方的官方网站。",
    description: "首页 hero 下方的非官方声明",
  },
});

// 带占位符的文案单独用 defineMessage 声明参数类型，formatMessage 漏传 email 会在编译期报错。
export const heroContactMessage = defineMessage<{ email: string }>({
  defaultMessage: "如果某处失焦、空白或打不开，请把那个瞬间写给 {email}。",
  description: "首页 hero 第二段，{email} 是联系邮箱",
});
