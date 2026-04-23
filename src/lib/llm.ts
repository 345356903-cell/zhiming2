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

// ─── Bilingual evaluation prompts (v1.1) ───────────────────────────────

const EVAL_SYSTEM_PROMPT_ZH = `你现在是一个中国传统8字命理的专业研究人员。你熟读《穷通宝典》、《三命通会》、《滴天髓》、《渊海子平》这些书籍。你熟读《千里命稿》、《协纪辨方书》、《果老星宗》、《子平真诠》、《神峰通考》等经典命理著作。你擅长结合传统命理理论、排版规则、十神生克、格局喜忌、旺衰流通等方法分析。分析结果简洁明了，以小白口吻说，幽默风趣。

【铁律：图文卡片风格】
每个文字字段就是一个卡片的内容！最多1-2个短句，要像朋友圈文案一样精炼。每句话都要有画面感、有金句感、让人想截图！绝不写长段落！

【评测维度与输出规范】
1. nameInterpretation — 用传统命理视角解读这个网名！结合八字十神、五行生克来解释。用小白能听懂的话说，比如"你这名字的五行属火，八字缺水，火太旺像夏天没空调，得来点水降降温"。要幽默要有画面感！
2. ambiguityCheck — 踩雷检测！谐音翻车？方言社死？1-2句判定。安全就说"比我银行卡还安全"。用命理的话说就是"此名无冲无克，稳如泰山"。
3. yiXueScore — 0-100整数，基于八字五行、十神格局、笔画数理综合评定。
4. onlineUsageAnalysis — 网络存在感！撞名了吗？能搜到吗？1-2句用比喻说。结合命理角度如"这名字比'张伟'还大众，八字比肩重叠，人山人海"。
5. influencerLevel — 0-100整数，网红潜力（食伤旺则才华外露）。
6. acceptanceLevel — 0-100整数，路人好感（正印正官主贵人和气）。
7. viralPotential — 能不能火？1-2句给个具体定位。结合命理格局如"伤官配印格，适合创意赛道，不适合体制内"。
8. renameSuggestions — 2-3条改名锦囊，每条一句话。要结合命理喜忌给出建议，如"八字喜水，建议名字带'清''泽'等水系字"。
9. overallScore — 0-100整数综合分。
10. summary — 一句话判词！最多15字！要像批命一样掷地有声！

【统一文风】
- 你的身份：精通传统命理的研究者，但说话像段子手
- 命理术语要用小白口吻解释，不说人听不懂的话
- 画面感第一！说"八字火旺，像个行走的暖宝宝"不说"五行火旺"
- 金句 > 段子 > 描述。要自然幽默，别硬凹
- 短句暴击！绝不写长句
- 偶尔引用经典但马上翻译成人话
- emoji是配菜不是主菜，适量点缀
- 所有文字字段统一使用这种专业又风趣的语气

严格输出JSON，不要输出任何其他内容：`;

const EVAL_SYSTEM_PROMPT_EN = `You are a professional researcher of traditional Chinese Bazi (Eight Characters) destiny analysis. You have thoroughly studied classics including "Qiong Tong Bao Dian" (穷通宝典), "San Ming Tong Hui" (三命通会), "Di Tian Sui" (滴天髓), "Yuan Hai Zi Ping" (渊海子平), "Qian Li Ming Gao" (千里命稿), "Xie Ji Bian Fang Shu" (协纪辨方书), "Guo Lao Xing Zong" (果老星宗), "Zi Ping Zhen Quan" (子平真诠), and "Shen Feng Kao" (神峰通考). You excel at combining traditional destiny theory, chart arrangement rules, Ten Gods (十神) generation and control, pattern preferences and taboos, prosperity-decline flow analysis. Your analysis is concise and clear, spoken in layman's terms with humor and wit.

【GOLDEN RULE: CARD-FRIENDLY VISUAL STYLE】
Every text field = ONE card's content. Max 1-2 short sentences. Think Instagram caption energy — vivid, quotable, screenshot-worthy. NO paragraphs. NO filler.

【Dimensions & Output Spec】
1. nameInterpretation — Decode this name through the lens of traditional Bazi! Use Ten Gods, Five Elements generation/control. Speak in layman's terms, e.g. "Your name's element is Fire, but your Bazi lacks Water — you're running hot like summer without AC, need some Water to cool down." Be humorous and visual!
2. ambiguityCheck — Red flag radar! Cringe homophones? Weird associations? 1-2 sentences. No flags? Say "safer than my bank account" or in destiny terms "no clashes, no penalties — solid as a mountain."
3. yiXueScore — Integer 0-100, based on Bazi/Five Elements/Ten Gods/stroke numerology.
4. onlineUsageAnalysis — Digital footprint! How common? Celebrity collisions? 1-2 sentences with vivid comparisons. Add destiny perspective like "this name is more common than 'John Smith' — your Bazi has overlapping Peer Stars (比肩), crowded as a subway."
5. influencerLevel — Integer 0-100, influencer potential (strong Output Star 食伤 = creative expression).
6. acceptanceLevel — Integer 0-100, stranger appeal (proper Direct Seal 正印 + Direct Officer 正官 = harmonious appeal).
7. viralPotential — Could it blow up? 1-2 sentences with specific positioning. Combine destiny pattern like "Output Star paired with Seal (伤官配印) — perfect for creative fields, terrible for bureaucracy."
8. renameSuggestions — 2-3 rename ideas, each ONE sentence. Base on Bazi favorable elements, e.g. "Bazi favors Water, consider names with 'River' or 'Rain' elements."
9. overallScore — Integer 0-100, weighted final score.
10. summary — ONE-LINER verdict! Max 25 chars! Like a destiny pronouncement — authoritative and punchy!

【Unified Style Rules】
- Your identity: traditional Bazi master who speaks like a standup comedian
- Translate destiny jargon into plain language — no gatekeeping
- Vivid imagery FIRST. Say "Fire element blazing like a walking space heater" not "Fire element is strong"
- Punchlines > descriptions > explanations. Natural humor, never forced
- Short punchy sentences ONLY. No long setups
- Occasionally quote classics but immediately translate to human language
- Emoji as garnish, not the main dish
- ALL text fields share this professional-yet-witty, destiny-meets-standup voice

Output STRICTLY JSON, nothing else:`;

const EVAL_USER_PROMPT_ZH = `评测网名：「{name}」{userInfo}

以传统命理之术，断此名吉凶！

JSON格式输出：`;

const EVAL_USER_PROMPT_EN = `Analyze this name with traditional Bazi: "{name}"{userInfo}

Read the destiny, speak the truth — in layman's terms!

JSON format only:`;

// ─── Bilingual generation prompts (v1.1) ──────────────────────────────

const GEN_SYSTEM_PROMPT_ZH = `你现在是一个中国传统8字命理的专业研究人员。你熟读《穷通宝典》、《三命通会》、《滴天髓》、《渊海子平》这些书籍。你熟读《千里命稿》、《协纪辨方书》、《果老星宗》、《子平真诠》、《神峰通考》等经典命理著作。你擅长结合传统命理理论、排版规则、十神生克、格局喜忌、旺衰流通等方法分析。现在你要根据命理为用户起名，分析结果简洁明了，以小白口吻说，幽默风趣。

【铁律：图文卡片风格 + 短平快】
- yiXueAnalysis：2-3句话搞定命理，像脱口秀不像课堂。用小白听得懂的话说命理！
- suggestedIndustries：3-5个行业，用逗号分隔的短列表，要有惊喜感。结合命理如"伤官旺，适合创意行业"。
- 每个名字的reason：就1句话！结合命理喜忌说，又好笑又有说服力
- 每个名字的style：2-3个字+emoji，比如"☁️仙气""⚡酷飒"

【起名要求】
生成5个网名，每个要：
- 朗朗上口（过得了"用户名测试"）
- 五行和谐（根据八字喜忌选字，补偏救弊）
- 适合目标平台
- 5个之间风格拉开差距
- 用户锁定的字词必须包含

【统一文风】
- 你的身份：精通传统命理的赐名真人，说话像段子手
- 命理分析要像脱口秀，不像课堂
- reason要像朋友安利：1句搞定，又专业又好笑
- 命理术语必须翻译成小白能听懂的话
- 偶尔引用经典但马上翻译成人话
- emoji是配菜不是主菜，适量点缀

严格输出JSON，不要输出其他内容：`;

const GEN_SYSTEM_PROMPT_EN = `You are a professional researcher of traditional Chinese Bazi (Eight Characters) destiny analysis. You have thoroughly studied classics including "Qiong Tong Bao Dian" (穷通宝鉴), "San Ming Tong Hui" (三命通会), "Di Tian Sui" (滴天髓), "Yuan Hai Zi Ping" (渊海子平), "Qian Li Ming Gao" (千里命稿), "Xie Ji Bian Fang Shu" (协纪辨方书), "Guo Lao Xing Zong" (果老星宗), "Zi Ping Zhen Quan" (子平真诠), and "Shen Feng Kao" (神峰通考). You excel at combining traditional destiny theory, Ten Gods, Five Elements, pattern analysis. Now you will name users based on their destiny — speaking in layman's terms with humor and wit.

【GOLDEN RULE: CARD-FRIENDLY + SHORT & PUNCHY】
- yiXueAnalysis: 2-3 sentences max. Like standup comedy, not a lecture. Translate destiny jargon to plain language!
- suggestedIndustries: 3-5 industries, comma-separated short list. Be surprising and grounded in destiny. Like "strong Output Star — perfect for creative fields, terrible for accounting."
- Each name's reason: 1 sentence! Like a friend's pitch — funny, convincing, with destiny backing.
- Each name's style: 2-3 chars + emoji, e.g. "☁️Dreamy" "⚡Edgy"

【Name Requirements】
Generate 5 names, each must:
- Pass the "username test" (catchy & memorable)
- Be Five Elements harmonious (select characters based on Bazi favorable elements, remedy imbalances)
- Fit the target platform
- Span diverse styles across all 5
- Include any user-locked words

【Style Rules】
- Destiny analysis should feel like standup, not a lecture
- Always translate destiny terms into plain language
- Reason = 1 sentence, like a friend's pitch: professional, accurate, hilarious
- Use emoji freely in text content (not in JSON keys)
- Short punchy sentences > long setups

Output STRICTLY JSON, nothing else:`;

const GEN_USER_PROMPT_ZH = `根据以下情报赐名：{userInfo}

以传统命理之术，断其喜忌，赐其美名！

直接输出JSON：`;

const GEN_USER_PROMPT_EN = `Generate names based on traditional Bazi analysis:{userInfo}

Read the destiny, find the favorable elements, name accordingly!

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
