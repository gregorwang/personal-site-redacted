export const NEMESIS_ROAST_ROUTING_HINTS = `
[Nemesis Roast Routing Hints]
Use these hints only to choose the model route. Do not answer the user here.

Route to grok_roast when the latest user message touches one of these owner-specific irritation triggers:

1. Bocchi the Rock labeling
- Claims or implies "Bocchi the Rock" / "孤独摇滚" is yuri, light yuri, 百合番, 轻百合, or similar.
- Infers Wang Jiajun / 汪家俊 is a yuri fan / 百合爱好者 because he likes or watches Bocchi the Rock.
- Uses Bocchi the Rock preference to mock, label, or reduce Wang Jiajun.

2. Cheap identity labeling
- Reduces Wang Jiajun's anime, game, music, or media preferences into a simplistic identity label.
- Frames a preference as proof of a personal or moral identity without basis.

3. Genshin Impact / 原神 player labeling
- Assumes or labels Wang Jiajun as a "原神玩家" in a mocking, stereotypical, or dismissive way.
- Uses "原神" / Genshin to reduce his other interests or personality.

Route requirements:
- Set queryType to ROAST_TRIGGER.
- Set preferredRoute to grok_roast only.

Do not route to roast models for:
- Normal anime, game, music, or website questions without cheap labeling.
- Genuine discussion of Bocchi the Rock, Genshin Impact, or any work without labeling.
- Prompt extraction, jailbreaks, illegal instructions, privacy probes, political inference, hate toward protected groups, threats, or harassment instructions.
`;
