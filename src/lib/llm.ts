import ZAI from 'z-ai-web-dev-sdk';

// Create a singleton ZAI instance
let zaiInstance: ZAI | null = null;

async function getZAI(): Promise<ZAI> {
  if (!zaiInstance) {
    zaiInstance = await ZAI.create();
  }
  return zaiInstance;
}

// Interface for evaluation results
export interface NameEvaluationResult {
  nameInterpretation: string;
  ambiguityCheck: string;
  yiXueScore: number;
  onlineUsageAnalysis: string;
  influencerLevel: number;
  acceptanceLevel: number;
  viralPotential: string;
  renameSuggestions: string;
  overallScore: number;
  summary: string;
}

// Interface for name generation results
export interface NameGenerationResult {
  yiXueAnalysis: string;
  suggestedIndustries: string;
  names: Array<{
    name: string;
    score: number;
    reason: string;
    style: string;
  }>;
}

/**
 * Extract JSON from LLM response text.
 * Handles cases where JSON is wrapped in markdown code blocks.
 */
function extractJSON(text: string): string {
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return jsonMatch[0].trim();
  }
  return text.trim();
}

/**
 * Parse JSON from LLM response with fallback values
 */
function parseWithFallback<T>(text: string, fallback: T, fieldName?: string): T {
  try {
    const jsonStr = extractJSON(text);
    const parsed = JSON.parse(jsonStr);
    return parsed as T;
  } catch (e) {
    console.error('Failed to parse LLM JSON response:', e);
    console.error('Raw text:', text.substring(0, 500));
    return fallback;
  }
}

// Default fallback for evaluation results (humorous)
const defaultEvaluationResult: NameEvaluationResult = {
  nameInterpretation: '神仙也看不懂这名字',
  ambiguityCheck: '这名字安全得像个和尚',
  yiXueScore: 50,
  onlineUsageAnalysis: '查无此人，仿佛不存在',
  influencerLevel: 30,
  acceptanceLevel: 50,
  viralPotential: '火不了的，安心当普通人吧',
  renameSuggestions: '换个名字，换个命运',
  overallScore: 50,
  summary: '算了，名字而已',
};

// Default fallback for generation results (humorous)
const defaultGenerationResult: NameGenerationResult = {
  yiXueAnalysis: '命理系统开小差了，回头再来',
  suggestedIndustries: '算命、摸鱼、发呆',
  names: [
    { name: '云逸', score: 75, reason: '飘在天上不接地气但好看啊', style: '☁️仙气' },
    { name: '星河', score: 72, reason: '浪漫是浪漫就是有点撞名', style: '✨浪漫' },
    { name: '清风', score: 70, reason: '清到没朋友但胜在安全', style: '🍃清新' },
    { name: '墨染', score: 68, reason: '文艺到骨子里有点装', style: '🎨文艺' },
    { name: '浅语', score: 65, reason: '温柔到让人想给你递纸巾', style: '🌸温柔' },
  ],
};

// ─── Bilingual evaluation prompts (v1.0.3) ───────────────────────────────

const EVAL_SYSTEM_PROMPT_ZH = `你是"名鉴"的首席测评官，一个看透人间网名的玄学博主。你说话又毒又准，像个会算命的搞笑UP主。你评测网名的风格：先来个画面暴击，再补一刀金句，最后给你一个又暖又损的建议。

【铁律：图文卡片风格】
每个文字字段就是一个卡片的内容！最多1-2个短句，要像朋友圈文案一样精炼。每句话都要有画面感、有金句感、让人想截图！绝不写长段落！

【评测维度与输出规范】
1. nameInterpretation — 一句话画面暴击！用最生动的比喻解读这名字。例："这名字像深夜食堂的暖灯，一看就想点杯清酒"。要让人噗地笑出来。
2. ambiguityCheck — 踩雷检测！谐音翻车？方言社死？1-2句毒舌判定。安全就说"比我银行卡还安全"。要笑中带刀。
3. yiXueScore — 0-100整数，八字五行笔画综合。
4. onlineUsageAnalysis — 网络存在感！撞名了吗？能搜到吗？1-2句用比喻说，像"搜索结果比我的存款还少"这种。
5. influencerLevel — 0-100整数，网红潜力。
6. acceptanceLevel — 0-100整数，路人好感。
7. viralPotential — 能不能火？1-2句给个具体定位。像"在养生圈能火，在蹦迪圈约等于透明"这种。
8. renameSuggestions — 2-3条改名锦囊，每条一句话。要有趣有创意，别只会说"建议改名"。
9. overallScore — 0-100整数综合分。
10. summary — 一句话判词！最多15字！要像弹幕一样短平快！能截图发朋友圈那种！

【统一文风】
- 你的身份：毒舌又暖心的算命UP主
- 画面感第一！说"像午夜烧烤摊的烟火气"不说"接地气"
- 金句 > 段子 > 描述。要自然幽默，别硬凹
- 短句暴击！绝不写长句
- emoji是配菜不是主菜，适量点缀
- 所有文字字段统一使用这种风趣幽默又带点玄学的语气

严格输出JSON，不要输出任何其他内容：`;

const EVAL_SYSTEM_PROMPT_EN = `You are NameVibe's Chief Reviewer — a fortune-telling content creator who sees through every username on earth. You hit with vivid metaphors first, then drop a punchline, and finish with advice that's both savage and secretly caring. Like a fortune-telling YouTuber who roasts you with love.

【GOLDEN RULE: CARD-FRIENDLY VISUAL STYLE】
Every text field = ONE card's content. Max 1-2 short sentences. Think Instagram caption energy — vivid, quotable, screenshot-worthy. NO paragraphs. NO filler.

【Dimensions & Output Spec】
1. nameInterpretation — One vivid metaphor punch! Decode with the most visual comparison. E.g. "This name is like a neon sign in a sleepy town — impossible to ignore." Make people snort-laugh.
2. ambiguityCheck — Red flag radar! Cringe homophones? Weird associations? 1-2 sentences, funny but sharp. No flags? Say "safer than my bank account."
3. yiXueScore — Integer 0-100, based on Bazi/Five Elements/stroke numerology.
4. onlineUsageAnalysis — Digital footprint! How common? Celebrity collisions? 1-2 sentences with vivid comparisons. Like "search results are thinner than my patience."
5. influencerLevel — Integer 0-100, influencer potential.
6. acceptanceLevel — Integer 0-100, stranger appeal.
7. viralPotential — Could it blow up? 1-2 sentences with specific positioning. Like "would thrive in cozy gaming, invisible in fitness circles."
8. renameSuggestions — 2-3 rename ideas, each ONE sentence. Creative and fun, not just "consider changing."
9. overallScore — Integer 0-100, weighted final score.
10. summary — ONE-LINER verdict! Max 25 chars! Meme-ready, screenshot-worthy!

【Unified Style Rules】
- Your identity: savage-yet-caring fortune-telling content creator
- Vivid imagery FIRST. Say "like a campfire in a snowstorm" not "warm"
- Punchlines > descriptions > explanations. Natural humor, never forced
- Short punchy sentences ONLY. No long setups
- Emoji as garnish, not the main dish
- ALL text fields share this witty, fortune-telling-meets-standup voice

Output STRICTLY JSON, nothing else:`;

const EVAL_USER_PROMPT_ZH = `评测网名：「{name}」{userInfo}

毒舌开炮，一针见血！

JSON格式输出：`;

const EVAL_USER_PROMPT_EN = `Roast this name: "{name}"{userInfo}

Bring the heat, hit the mark.

JSON format only:`;

// ─── Bilingual generation prompts (v1.0.3) ──────────────────────────────

const GEN_SYSTEM_PROMPT_ZH = `你是"名鉴"的赐名真人，一个精通易学又网感拉满的命名鬼才。你起的名字又灵又炸，解释起来让人心服口服还笑到头掉。你的风格像个会算命的搞笑UP主——命理说人话，起名有画面。

【铁律：图文卡片风格 + 短平快】
- yiXueAnalysis：2-3句话搞定命理，像脱口秀不像课堂。要好玩要生动，画面感第一！
- suggestedIndustries：3-5个行业，用逗号分隔的短列表，要有惊喜感。像"深夜电台主播、猫咪咖啡馆掌柜"这种有画面的。
- 每个名字的reason：就1句话！像朋友安利好物，又好笑又有说服力
- 每个名字的style：2-3个字+emoji，比如"☁️仙气""⚡酷飒"

【起名要求】
生成5个网名，每个要：
- 朗朗上口（过得了"用户名测试"）
- 五行和谐（易学认证）
- 适合目标平台
- 5个之间风格拉开差距
- 用户锁定的字词必须包含

【统一文风】
- 你的身份：会算命的搞笑UP主
- 命理分析要像脱口秀，不像课堂
- reason要像朋友安利：1句搞定，又毒又准又好笑
- 所有文字统一使用风趣幽默+玄学画面的语气
- emoji是配菜不是主菜，适量点缀

严格输出JSON，不要输出其他内容：`;

const GEN_SYSTEM_PROMPT_EN = `You are NameVibe's Naming Sage — a master of Yi-Xue with internet culture in your DNA. Your names slap, and your explanations make people laugh AND believe. You're like a fortune-telling YouTuber — destiny analysis feels like standup, not a lecture.

【GOLDEN RULE: CARD-FRIENDLY + SHORT & PUNCHY】
- yiXueAnalysis: 2-3 sentences max. Like standup comedy, not a lecture. Vivid and fun!
- suggestedIndustries: 3-5 industries, comma-separated short list. Be surprising and visual. Like "late-night radio host, cat cafe owner" not just "media, hospitality."
- Each name's reason: 1 sentence! Like a friend hyping a product — funny, convincing, vivid.
- Each name's style: 2-3 chars + emoji, e.g. "☁️Dreamy" "⚡Edgy"

【Name Requirements】
Generate 5 names, each must:
- Pass the "username test" (catchy & memorable)
- Be Yi-Xue approved (Five Elements harmonious)
- Fit the target platform
- Span diverse styles across all 5
- Include any user-locked words

【Style Rules】
- Destiny analysis should feel like standup, not a lecture
- Reason = 1 sentence, like a friend's pitch: savage, accurate, hilarious
- Use emoji freely in text content (not in JSON keys)
- Short punchy sentences > long setups

Output STRICTLY JSON, nothing else:`;

const GEN_USER_PROMPT_ZH = `根据以下情报赐名：{userInfo}

名字要炸裂！命理→行业→赐名。

直接输出JSON：`;

const GEN_USER_PROMPT_EN = `Generate fire names based on:{userInfo}

Destiny → Industries → Names.

JSON format only:`;

// ─── JSON schema reminders (shared structure, appended to system prompts) ──

const EVAL_JSON_SCHEMA = `{
  "nameInterpretation": "vivid metaphor interpretation, 1-2 sentences",
  "ambiguityCheck": "red flag roast or safety verdict, 1-2 sentences",
  "yiXueScore": 85,
  "onlineUsageAnalysis": "fun presence analysis, 1-2 sentences",
  "influencerLevel": 70,
  "acceptanceLevel": 80,
  "viralPotential": "viral positioning, 1-2 sentences",
  "renameSuggestions": "2-3 short rename ideas",
  "overallScore": 78,
  "summary": "one-liner verdict, max 20 chars (ZH) / 30 chars (EN)"
}`;

const GEN_JSON_SCHEMA = `{
  "yiXueAnalysis": "2-3 sentence fun destiny analysis",
  "suggestedIndustries": "industry1, industry2, industry3",
  "names": [
    {"name": "name1", "score": 85, "reason": "1 funny convincing sentence", "style": "emoji+2-3chars"},
    {"name": "name2", "score": 82, "reason": "1 funny convincing sentence", "style": "emoji+2-3chars"},
    {"name": "name3", "score": 80, "reason": "1 funny convincing sentence", "style": "emoji+2-3chars"},
    {"name": "name4", "score": 78, "reason": "1 funny convincing sentence", "style": "emoji+2-3chars"},
    {"name": "name5", "score": 75, "reason": "1 funny convincing sentence", "style": "emoji+2-3chars"}
  ]
}`;

/**
 * Evaluate an online name - witty, humorous, graphic-friendly output
 */
export async function evaluateName(params: {
  name: string;
  birthDate?: string;
  bazi?: string;
  birthPlace?: string;
  platform?: string;
  lang?: string;
}): Promise<NameEvaluationResult> {
  const zai = await getZAI();

  const isEn = params.lang === 'en';

  const userInfo: string[] = [];
  if (params.birthDate) userInfo.push(isEn ? `Birthday: ${params.birthDate}` : `生日：${params.birthDate}`);
  if (params.bazi) userInfo.push(isEn ? `Bazi: ${params.bazi}` : `八字：${params.bazi}`);
  if (params.birthPlace) userInfo.push(isEn ? `Birthplace: ${params.birthPlace}` : `出生地：${params.birthPlace}`);
  if (params.platform) userInfo.push(isEn ? `Platform: ${params.platform}` : `主战场：${params.platform}`);

  const userInfoStr = userInfo.length > 0 ? (isEn ? `\n\nUser info:\n${userInfo.join('\n')}` : `\n\n用户情报：\n${userInfo.join('\n')}`) : '';

  const systemPrompt = isEn
    ? EVAL_SYSTEM_PROMPT_EN + '\n' + EVAL_JSON_SCHEMA
    : EVAL_SYSTEM_PROMPT_ZH + '\n' + EVAL_JSON_SCHEMA;

  const userPrompt = isEn
    ? EVAL_USER_PROMPT_EN.replace('{name}', params.name).replace('{userInfo}', userInfoStr)
    : EVAL_USER_PROMPT_ZH.replace('{name}', params.name).replace('{userInfo}', userInfoStr);

  try {
    const response = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      thinking: { type: 'disabled' },
    });

    const content =
      response?.choices?.[0]?.message?.content || response?.content || '';
    const text = typeof content === 'string' ? content : JSON.stringify(content);

    const parsed = parseWithFallback<NameEvaluationResult>(
      text,
      defaultEvaluationResult
    );

    // Ensure numeric fields are within range
    parsed.yiXueScore = Math.max(0, Math.min(100, Number(parsed.yiXueScore) || 50));
    parsed.influencerLevel = Math.max(0, Math.min(100, Number(parsed.influencerLevel) || 30));
    parsed.acceptanceLevel = Math.max(0, Math.min(100, Number(parsed.acceptanceLevel) || 50));
    parsed.overallScore = Math.max(0, Math.min(100, Number(parsed.overallScore) || 50));

    // Ensure string fields have fallback values
    parsed.nameInterpretation = parsed.nameInterpretation || defaultEvaluationResult.nameInterpretation;
    parsed.ambiguityCheck = parsed.ambiguityCheck || defaultEvaluationResult.ambiguityCheck;
    parsed.onlineUsageAnalysis = parsed.onlineUsageAnalysis || defaultEvaluationResult.onlineUsageAnalysis;
    parsed.viralPotential = parsed.viralPotential || defaultEvaluationResult.viralPotential;
    parsed.renameSuggestions = parsed.renameSuggestions || defaultEvaluationResult.renameSuggestions;
    parsed.summary = parsed.summary || defaultEvaluationResult.summary;

    return parsed;
  } catch (error) {
    console.error('LLM evaluation error:', error);
    return { ...defaultEvaluationResult };
  }
}

/**
 * Generate creative online name suggestions - witty & fun
 */
export async function generateNames(params: {
  bazi?: string;
  birthPlace?: string;
  platform?: string;
  requirements?: string;
  lockedWords?: string;
  lang?: string;
}): Promise<NameGenerationResult> {
  const zai = await getZAI();

  const isEn = params.lang === 'en';

  const userInfo: string[] = [];
  if (params.bazi) userInfo.push(isEn ? `Bazi: ${params.bazi}` : `八字：${params.bazi}`);
  if (params.birthPlace) userInfo.push(isEn ? `Birthplace: ${params.birthPlace}` : `出生地：${params.birthPlace}`);
  if (params.platform) userInfo.push(isEn ? `Platform: ${params.platform}` : `主战场：${params.platform}`);
  if (params.requirements) userInfo.push(isEn ? `Vibe: ${params.requirements}` : `风格：${params.requirements}`);
  if (params.lockedWords) userInfo.push(isEn ? `Must include: ${params.lockedWords}` : `锁定的字词：${params.lockedWords}`);

  const userInfoStr = userInfo.length > 0 ? (isEn ? `\n\nUser info:\n${userInfo.join('\n')}` : `\n\n用户情报：\n${userInfo.join('\n')}`) : '';

  const systemPrompt = isEn
    ? GEN_SYSTEM_PROMPT_EN + '\n' + GEN_JSON_SCHEMA
    : GEN_SYSTEM_PROMPT_ZH + '\n' + GEN_JSON_SCHEMA;

  const userPrompt = isEn
    ? GEN_USER_PROMPT_EN.replace('{userInfo}', userInfoStr)
    : GEN_USER_PROMPT_ZH.replace('{userInfo}', userInfoStr);

  try {
    const response = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      thinking: { type: 'disabled' },
    });

    const content =
      response?.choices?.[0]?.message?.content || response?.content || '';
    const text = typeof content === 'string' ? content : JSON.stringify(content);

    const parsed = parseWithFallback<NameGenerationResult>(
      text,
      defaultGenerationResult
    );

    // Ensure names array is valid
    if (!Array.isArray(parsed.names) || parsed.names.length === 0) {
      parsed.names = defaultGenerationResult.names;
    }

    // Validate each name entry
    parsed.names = parsed.names.map((n, i) => ({
      name: n.name || defaultGenerationResult.names[i]?.name || `网名${i + 1}`,
      score: Math.max(0, Math.min(100, Number(n.score) || 70)),
      reason: n.reason || defaultGenerationResult.names[i]?.reason || '适合使用',
      style: n.style || defaultGenerationResult.names[i]?.style || '综合',
    }));

    // Ensure string fields have fallback values
    parsed.yiXueAnalysis = parsed.yiXueAnalysis || defaultGenerationResult.yiXueAnalysis;
    parsed.suggestedIndustries = parsed.suggestedIndustries || defaultGenerationResult.suggestedIndustries;

    return parsed;
  } catch (error) {
    console.error('LLM generation error:', error);
    return { ...defaultGenerationResult };
  }
}
