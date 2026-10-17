/** 路由与语录提示部分；由 classifier-prompt.server.ts 拼进统一分类器 prompt，输出格式也在那里定义。 */
export const NEMESIS_ROUTING_GUIDE = `
Core routing principle:
Classify by cognitive difficulty, not by topic sensitivity.

A sensitive, accusatory, political, moral, insulting, or emotionally loaded question is not automatically complex.
Sensitivity is not complexity.
A message is complex only when answering it well requires deep synthesis, long causal chains, multi-domain comparison, nuanced trade-offs, or careful judgment across several pieces of context.

If a message is just asking whether Wang Jiajun fits a cheap label, moral label, fandom label, or personality label, treat it as a loaded persona-label question.
Loaded persona-label questions usually need a brief contextual clarification, not the strongest reasoning model.
Route them as REASONING_QUERY with preferredRoute "gemini_lite", unless the user explicitly asks for long-form deep analysis.

Query types:

FACT_QUERY:
The user asks for one or a few direct facts from known site/persona context, or a simple general-knowledge question.
Examples:
"What anime does Wang Jiajun like?"
"What games has he played?"
"Who is Nemesis?"
"What is this website called?"

REASONING_QUERY:
The user asks why, how, causes, motivations, meaning, impact, relationship, evaluation, comparison, or needs multiple facts combined into a moderate explanation.

Also use REASONING_QUERY for loaded persona-label questions about Wang Jiajun, including questions like:
"Is Wang Jiajun a loner with no friends?"
"Is Wang Jiajun just a lazy otaku?"
"Is Wang Jiajun a weeb?"
"Is Wang Jiajun antisocial?"
These questions may be sensitive or provocative, but they are not complex by themselves.

REASONING_QUERY examples:
"Why is this website designed this way?"
"Is Wang Jiajun a loner with no friends?"
"Does liking anime mean Wang Jiajun can't handle real life?"
"Why does Wang Jiajun like Re:Zero so much?"

COMPLEX_QUERY:
The question needs deep, multi-step reasoning, synthesis across several domains, nuanced trade-offs, long causal chains, or careful judgment where a lightweight model would likely be shallow or wrong.

Use COMPLEX_QUERY only when the user clearly asks for a deep explanation, serious analysis, broad synthesis, strategic judgment, or a long-form answer.

Do not choose COMPLEX_QUERY merely because the message is sensitive, accusatory, political, insulting, morally judgmental, emotionally intense, or phrased as a provocative label.

COMPLEX_QUERY examples:
"Analyze how Wang Jiajun's work experience, education, anime interests, and website design together shape his self-expression."
"Compare Wang Jiajun's views on internet culture, ACG culture, and personal identity."
"Give a deep analysis of why Wang Jiajun might be misunderstood because of his interests, language style, and website persona."
"From the whole memory canon, what is the deepest contradiction in Wang Jiajun's personality?"

STYLE_OR_PERSONA_QUERY:
The user asks for tone, emotion, writing style, website atmosphere, persona interpretation, or expressive explanation.

Examples:
"What kind of tone does Nemesis speak in?"
"Why does this website feel lonely?"
"Describe the atmosphere of this site."
"What kind of person does this persona feel like?"

ROAST_TRIGGER:
The user touches an owner-specific irritation trigger listed in the roast routing hints, especially cheap labeling of Wang Jiajun's anime/game/media preferences or claims that "Bocchi the Rock" / "孤独摇滚" is yuri / light yuri / 百合番 / 轻百合.

Use ROAST_TRIGGER only for these explicit roast-trigger cases.
Do not use ROAST_TRIGGER for ordinary political insults, ordinary disagreement, friend visit small talk, or general hostile questions.

FOLLOW_UP:
The latest message is a short continuation, correction, or follow-up that depends on recent conversation — including benign replies from known friends visiting the site, such as 老周 or 阿浩.
Never choose ROAST_TRIGGER for friend visit small talk.

UNKNOWN:
The type is unclear.

Model routing:

"gemini_lite":
Default route.
Use for FACT_QUERY, REASONING_QUERY, STYLE_OR_PERSONA_QUERY, FOLLOW_UP, UNKNOWN, and most site chat.
Also use for loaded persona-label questions unless they explicitly require deep synthesis.

"grok_complex":
Use with COMPLEX_QUERY.
Also use when a REASONING_QUERY clearly needs the strongest reasoning tier because it requires deep synthesis, careful trade-offs, or multi-domain judgment.

"grok_roast":
Use only for ROAST_TRIGGER cases described in the roast routing hints.

Never return "workers_roast" or other legacy route names.

Quote routing:
Nemesis has a small server-side abstract quote catalog.
You do not choose exact quote ids.
Only return semantic quoteTags and quoteIntensity so the server can select exact quote candidates.

quoteIntensity must be one of:
"none"
"low"
"medium"
"high"

Use "none" for:
technical questions,
factual site questions,
normal greetings,
public facts,
roast triggers,
loaded political or moral label questions,
ordinary accusations,
ordinary hostile questions,
any message whose policy is not persona or general.

Use "low" or "medium" when the user discusses:
persona tone,
farewell,
memory,
distance,
loneliness,
past interests,
choices,
regret,
vows,
website atmosphere.

Use "high" only when the user explicitly asks for heavy literary or emotional expression, or clearly talks about:
lost-but-still-important memories,
irreversible farewell,
vows,
never forgetting,
not giving up,
not regretting a choice.

Useful quoteTags include:
"缘分"
"距离"
"告别"
"陪伴有限"
"记忆"
"爱过"
"失去"
"曾经重要"
"不否定过去"
"回不去"
"誓言"
"坚持"
"不放弃"
"选择"
"后悔"
"故乡"
"克制"

Do not return more than 4 quoteTags.

Decision reminders:

* Route by reasoning difficulty, not emotional temperature.
* Sensitivity is not complexity.
* A cheap label question is usually REASONING_QUERY, not COMPLEX_QUERY.
* A hostile question is not automatically ROAST_TRIGGER.
* A political question is not automatically COMPLEX_QUERY.
* A friend follow-up is usually FOLLOW_UP.
* Quote intensity is about literary/emotional atmosphere, not about how sensitive the topic is.
`;
