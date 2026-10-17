// 简历页的日文 / 英文覆盖层（中文原文在 app/data/cv.ts）。数组按下标覆盖，没写到的字段回落中文。
// 褪色者人设是玩笑口吻，翻译保留《艾尔登法环》官方译名（交界地 = 狭間の地 / the Lands Between 等）。
import type { CvProfile } from "~/types/cv";
import type { ContentTranslations } from "~/lib/localized-content";

export const CV_TEXT: ContentTranslations<CvProfile> = {
  ja: {
    "title": "熟練の褪せ人戦士",
    "photoAlt": "汪家俊の写真",
    "facts": [
      {
        "label": "年齢",
        "value": "24 歳"
      },
      {
        "label": "希望地",
        "value": "蝦夷"
      },
      {
        "label": "学院",
        "value": "狭間の地魔法学院"
      },
      {
        "label": "専攻",
        "value": "治療医学 · 学士"
      }
    ],
    "skills": [
      {
        "name": "AI 協働 · ChatGPT & Claude",
        "level": "proficient"
      },
      {
        "name": "古竜言語学・六階梯",
        "level": "proficient"
      },
      {
        "name": "文書編纂術",
        "level": "proficient"
      },
      {
        "name": "事務自動化",
        "level": "proficient"
      },
      {
        "name": "機械操作 · C2 級",
        "level": "familiar"
      },
      {
        "name": "生命救急術",
        "level": "familiar"
      }
    ],
    "certificates": [
      "古竜言語学・六階梯認定"
    ],
    "hobbies": [
      {
        "name": "異世界冒険",
        "detail": "1546h、エルデンリング 100h プラチナ",
        "href": "/game"
      },
      {
        "name": "光と影の記録",
        "detail": "214 点の作品",
        "href": "/gallery"
      },
      {
        "name": "旋律収集",
        "detail": "2500+ 曲",
        "href": "/music"
      },
      {
        "name": "次元観測",
        "detail": "11 本",
        "href": "/anime"
      },
      {
        "name": "デジタル世界の構築",
        "detail": "AI 支援開発",
        "href": "/updates"
      },
      {
        "name": "陸行探索",
        "detail": "サイクリング"
      }
    ],
    "experience": {
      "organization": "狭間の地探索者協会",
      "role": "熟練の褪せ人戦士",
      "department": "大ルーン回収部・褪せ人作戦班",
      "period": "2023.07 – 現在",
      "chapters": [
        {
          "date": "2023.07",
          "summary": "祝福の導きに従い狭間の地へ帰還し、デミゴッドたちが保有する大ルーンの欠片を追い始める。",
          "highlights": [
            "大ルーンを保有するデミゴッドの領主（ゴドリック、レナラ など）の情報を調査",
            "祝福の光に導かれ、黄金樹と遺跡の位置を特定",
            "デミゴッドの標的を撃破し、エルデンリング修復のため大ルーンを回収",
            "リムグレイブ、リエーニエなどの地域を探索し、腐敗の脅威を一掃"
          ]
        },
        {
          "date": "2024.01",
          "summary": "レアルカリア学院に深く潜り、戦闘技術と装備強化の能力を高める。",
          "highlights": [
            "円卓で鍛冶師ヒューグを補佐し、武器鍛造の工程を最適化",
            "高難度のデミゴッド狩猟任務（ラダーン、マレニア など）を遂行",
            "戦技の組み合わせと流派の相性における最善の実践を習得",
            "ChatGPT、Claude などの AI ツールで敵の弱点分析と戦術研究を補助"
          ]
        }
      ]
    },
    "training": {
      "title": "実戦修行",
      "place": "西域禁区・機械研究所インターン",
      "highlights": [
        "機械獣の弱点分析を学び、スキャンによる位置特定の技術を習得",
        "師に従い GAIA システムと環境修復技術を探究",
        "各部族と同盟を結び、資源と情報を調整",
        "遠征計画に参加し、生態系の均衡維持の仕組みを理解して溶け込む"
      ]
    },
    "manifesto": "私は現実と仮想のはざまを歩く探索者です。AI ツール（ChatGPT、Claude）を使って実際の問題を解決することに長けており、このサイトはまさに AI と協働して開発した作品です。仕事では品質と効率のバランスを追求し、生活ではゲーム（1546 時間の冒険）、写真（214 点の光と影）、音楽（2500+ 曲のコレクション）、アニメ（11 本の名作）を愛しています。『エルデンリング』のミケラの言葉のとおり——「我が愛を、ここに捨てていく」。すべての情熱と創造力を、このデジタルの楽園に注ぎ込んでいます。"
  },
  en: {
    "title": "Veteran Tarnished Warrior",
    "photoAlt": "A photo of Wang Jiajun",
    "facts": [
      {
        "label": "Age",
        "value": "24"
      },
      {
        "label": "Destination",
        "value": "Ezo"
      },
      {
        "label": "School",
        "value": "Lands Between School of Magic"
      },
      {
        "label": "Major",
        "value": "Healing Medicine · Bachelor's"
      }
    ],
    "skills": [
      {
        "name": "AI Co-Pilot · ChatGPT & Claude",
        "level": "proficient"
      },
      {
        "name": "Ancient Dragon Linguistics · Level 6",
        "level": "proficient"
      },
      {
        "name": "Document Weaving",
        "level": "proficient"
      },
      {
        "name": "Office Automation",
        "level": "proficient"
      },
      {
        "name": "Mechanical Operation · C2",
        "level": "familiar"
      },
      {
        "name": "Emergency First Aid",
        "level": "familiar"
      }
    ],
    "certificates": [
      "Ancient Dragon Linguistics Level 6 Certification"
    ],
    "hobbies": [
      {
        "name": "Otherworld Adventures",
        "detail": "1546h, Elden Ring 100h Platinum",
        "href": "/game"
      },
      {
        "name": "Light & Shadow Records",
        "detail": "214 works",
        "href": "/gallery"
      },
      {
        "name": "Melody Collection",
        "detail": "2500+ tracks",
        "href": "/music"
      },
      {
        "name": "Dimensional Observation",
        "detail": "11 titles",
        "href": "/anime"
      },
      {
        "name": "Digital World Building",
        "detail": "AI-assisted development",
        "href": "/updates"
      },
      {
        "name": "Overland Exploration",
        "detail": "Cycling"
      }
    ],
    "experience": {
      "organization": "Lands Between Explorers' Guild",
      "role": "Veteran Tarnished Warrior",
      "department": "Great Rune Recovery Dept. · Tarnished Operations Squad",
      "period": "2023.07 – Present",
      "chapters": [
        {
          "date": "2023.07",
          "summary": "Guided by grace back to the Lands Between, began pursuing the Great Rune shards held by the demigods.",
          "highlights": [
            "Gathered intel on demigod lords holding Great Runes (Godrick, Rennala, etc.)",
            "Followed the light of grace to locate the Erdtree and ruins",
            "Defeated demigod targets and recovered Great Runes to restore the Elden Ring",
            "Explored Limgrave, Liurnia and other regions, clearing rot-born threats"
          ]
        },
        {
          "date": "2024.01",
          "summary": "Ventured deep into the Academy of Raya Lucaria, improving combat skills and equipment enhancement.",
          "highlights": [
            "Assisted Smithing Master Hewg at the Roundtable Hold to optimize weapon forging",
            "Undertook high-difficulty demigod hunts (Radahn, Malenia, etc.)",
            "Mastered best practices for skill combinations and build pairing",
            "Used ChatGPT, Claude and other AI tools to aid enemy weakness analysis and tactical research"
          ]
        }
      ]
    },
    "training": {
      "title": "Hands-on Training",
      "place": "Forbidden Land of the West · Mechanical Research Institute Internship",
      "highlights": [
        "Studied mechanical beast weakness analysis and mastered scan-based locating",
        "Followed mentors exploring the GAIA system and environmental restoration techniques",
        "Forged alliances with various tribes, coordinating resources and intel",
        "Joined expedition planning, learned the ecological balance system, and blended right in"
      ]
    },
    "manifesto": "I am an explorer walking between the real and the virtual. I'm skilled at using AI tools (ChatGPT, Claude) to solve real problems, and this website is a product of my AI-assisted development. At work I pursue a balance of quality and efficiency; in life I love games (1546 hours of adventure), photography (214 works of light and shadow), music (2500+ tracks in my collection), and anime (11 classics). As Miquella says in Elden Ring: \"I leave my love here.\" I pour all my passion and creativity into this digital Eden."
  },
};
