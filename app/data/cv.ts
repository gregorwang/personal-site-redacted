// 简历页静态内容（褪色者人设版）
import type { CvProfile } from "~/types/cv";

export const cvAvatarSource = "Feedback/person.webp";

export const cvProfile: CvProfile = {
  name: "汪家俊",
  title: "资深褪色者战士",
  photoAlt: "汪家俊的照片",
  facts: [
    { label: "年龄", value: "24 岁" },
    { label: "期望地点", value: "虾夷" },
    { label: "学院", value: "交界地魔法学院" },
    { label: "专业", value: "治疗医学 · 学士" },
  ],
  skills: [
    { name: "AI 协同 · ChatGPT & Claude", level: "proficient" },
    { name: "古龙语言学·六阶", level: "proficient" },
    { name: "文档编织术", level: "proficient" },
    { name: "办公自动化", level: "proficient" },
    { name: "机械操控 · C2 级", level: "familiar" },
    { name: "生命急救术", level: "familiar" },
  ],
  certificates: ["古龙语言学·六阶认证"],
  hobbies: [
    { name: "异世界冒险", detail: "1546h，艾尔登法环 100h 白金", href: "/game" },
    { name: "光影记录", detail: "214 幅作品", href: "/gallery" },
    { name: "旋律收集", detail: "2500+ 首", href: "/music" },
    { name: "次元观测", detail: "11 部", href: "/anime" },
    { name: "数字世界构筑", detail: "AI 辅助开发", href: "/updates" },
    { name: "陆行探索", detail: "骑行" },
  ],
  experience: {
    organization: "交界地探险者协会",
    role: "资深褪色者战士",
    department: "大卢恩回收部·褪色者行动组",
    period: "2023.07 – 至今",
    chapters: [
      {
        date: "2023.07",
        summary: "赐福引导返回交界地，开始追寻半神们持有的大卢恩碎片。",
        highlights: [
          "调研持有大卢恩的半神领主（葛德瑞克、蕾娜菈等）情报",
          "跟随赐福之光指引，定位黄金树与遗迹位置",
          "击败半神目标，回收大卢恩用于修复艾尔登法环",
          "探索宁姆格福、利耶尼亚等区域，清理腐败威胁",
        ],
      },
      {
        date: "2024.01",
        summary: "深入王城雷亚卢卡利亚，提升战斗技能与装备强化能力。",
        highlights: [
          "在圆桌厅堂协助铁匠休格优化武器锻造流程",
          "执行高难度半神狩猎任务（拉达恩、玛莲妮亚等）",
          "掌握战技组合与流派搭配最佳实践",
          "运用 ChatGPT、Claude 等 AI 工具辅助敌人弱点分析与战术研究",
        ],
      },
    ],
  },
  training: {
    title: "实战修行",
    place: "西域禁地·机械研究所实习",
    highlights: [
      "学习机械兽弱点分析，掌握扫描定位技能",
      "跟随导师探索盖亚系统与环境修复技术",
      "与各部落建立联盟，协调资源与情报",
      "参与远征规划，了解生态平衡维护体系，融合进去",
    ],
  },
  manifesto:
    "我是一个行走在现实与虚拟之间的探索者。善于运用 AI 工具（ChatGPT、Claude）解决实际问题，这个网站就是我用 AI 协同开发的作品。工作中追求品质与效率的平衡；生活中热爱游戏（1546 小时冒险）、摄影（214 幅光影）、音乐（2500+ 首收藏）、动漫（11 部经典）。正如《艾尔登法环》中米凯拉所说——「将我的爱弃置于此」，我将所有热情与创造力都倾注在这片数字伊甸园中。",
};
