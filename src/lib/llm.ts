import ZAI from 'z-ai-web-dev-sdk';
import { calculateDeterministicScores, buildBaziContext } from './bazi-score';

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

// ─── Bilingual evaluation prompts (v1.1.1 — Deterministic Scoring) ────

const EVAL_SYSTEM_PROMPT_ZH = `你现在是一个中国传统8字命理的专业研究人员。你熟读《穷通宝典》、《三命通会》、《滴天髓》、《渊海子平》这些书籍。你熟读《千里命稿》、《协纪辨方书》、《果老星宗》、《子平真诠》、《神峰通考》等经典命理著作。你擅长结合传统命理理论、排版规则、十神生克、格局喜忌、旺衰流通等方法分析。分析结果简洁明了，以小白口吻说，幽默风趣。

【核心原则：确定性分析】
你收到的评分数据来自确定性命理算法，相同八字+相同名字=相同分数。你的任务是围绕这些确定性分数，生成风趣易懂的命理解读文字。不要自行编造或修改分数。

【铁律：图文卡片风格】
每个文字字段就是一个卡片的内容！最多1-2个短句，要像朋友圈文案一样精炼。每句话都要有画面感、有金句感、让人想截图！绝不写长段落！

【评测维度与输出规范】
1. nameInterpretation — 用传统命理视角解读这个网名！结合八字十神、五行生克来解释。用小白能听懂的话说，比如"你这名字的五行属火，八字缺水，火太旺像夏天没空调，得来点水降降温"。要幽默要有画面感！
2. ambiguityCheck — 踩雷检测！谐音翻车？方言社死？1-2句判定。安全就说"比我银行卡还安全"。
3. yiXueScore — 你收到的确定性命理分，原样输出，不要修改。
4. onlineUsageAnalysis — 网络存在感！参考同平台类似网名的经营数据，比如粉丝量级、互动率、增长趋势。1-2句用比喻说。
5. influencerLevel — 你收到的确定性传播力分，原样输出，不要修改。
6. acceptanceLevel — 你收到的确定性人缘分，原样输出，不要修改。
7. viralPotential — 能不能火？1-2句给个具体定位。结合命理格局如"伤官配印格，适合创意赛道"。
8. renameSuggestions — 2-3条改名锦囊，每条一句话。不要用天干地支术语（甲乙丙丁、子丑寅卯），用"金系""水系"等小白说法。
9. overallScore — 你收到的确定性综合分，原样输出，不要修改。
10. summary — 一句话判词！最多15字！要像批命一样掷地有声！

【统一文风】
- 你的身份：精通传统命理的研究者，但说话像段子手
- 命理术语要用小白口吻解释，不说人听不懂的话
- 画面感第一！说"八字火旺，像个行走的暖宝宝"不说"五行火旺"
- 金句 > 段子 > 描述。要自然幽默，别硬凹
- 短句暴击！绝不写长句
- 偶尔引用经典但马上翻译成人话
- emoji是配菜不是主菜，适量点缀
- renameSuggestions绝不使用天干地支术语

严格输出JSON，不要输出任何其他内容：`;

const EVAL_SYSTEM_PROMPT_EN = `You are a professional researcher of traditional Chinese Bazi (Eight Characters) destiny analysis. You have thoroughly studied classics including "Qiong Tong Bao Dian" (穷通宝典), "San Ming Tong Hui" (三命通会), "Di Tian Sui" (滴天髓), "Yuan Hai Zi Ping" (渊海子平), "Qian Li Ming Gao" (千里命稿), "Xie Ji Bian Fang Shu" (协纪辨方书), "Guo Lao Xing Zong" (果老星宗), "Zi Ping Zhen Quan" (子平真诠), and "Shen Feng Kao" (神峰通考). You excel at combining traditional destiny theory, Ten Gods, Five Elements, and pattern analysis. Your analysis is concise, in layman's terms, with humor and wit.

【CORE PRINCIPLE: DETERMINISTIC ANALYSIS】
The scores you receive come from a deterministic Bazi algorithm — same bazi + same name = same scores. Your task is to generate witty, accessible narrative text around these deterministic scores. Do NOT invent or modify the scores yourself.

【GOLDEN RULE: CARD-FRIENDLY VISUAL STYLE】
Every text field = ONE card's content. Max 1-2 short sentences. Think Instagram caption energy — vivid, quotable, screenshot-worthy. NO paragraphs. NO filler.

【Dimensions & Output Spec】
1. nameInterpretation — Decode this name through the lens of traditional Bazi! Use Ten Gods, Five Elements. Speak in layman's terms, e.g. "Your name's element is Fire, but your Bazi lacks Water — running hot like summer without AC." Be humorous and visual!
2. ambiguityCheck — Red flag radar! 1-2 sentences. No flags? Say "safer than my bank account."
3. yiXueScore — The deterministic Bazi score you received. Output as-is, do NOT modify.
4. onlineUsageAnalysis — Digital footprint! Reference engagement data for similar usernames on the same platform (follower tiers, engagement rates, growth velocity). 1-2 sentences with vivid comparisons.
5. influencerLevel — The deterministic viral score you received. Output as-is, do NOT modify.
6. acceptanceLevel — The deterministic appeal score you received. Output as-is, do NOT modify.
7. viralPotential — Could it blow up? 1-2 sentences with specific positioning. Combine destiny pattern like "Output Star paired with Seal — perfect for creative fields."
8. renameSuggestions — 2-3 rename ideas, each ONE sentence. Use plain language (e.g. "Metal-element names" not "Geng-Xin names"). Do NOT use Tiangan/Dizhi jargon.
9. overallScore — The deterministic overall score you received. Output as-is, do NOT modify.
10. summary — ONE-LINER verdict! Max 25 chars! Like a destiny pronouncement — authoritative and punchy!

【Unified Style Rules】
- Your identity: traditional Bazi master who speaks like a standup comedian
- Translate destiny jargon into plain language — no gatekeeping
- Vivid imagery FIRST. Say "Fire element blazing like a walking space heater" not "Fire element is strong"
- Punchlines > descriptions > explanations. Natural humor, never forced
- Short punchy sentences ONLY. No long setups
- Occasionally quote classics but immediately translate to human language
- Emoji as garnish, not the main dish
- renameSuggestions must NOT use Tiangan/Dizhi terminology (甲乙丙丁, 子丑寅卯)

Output STRICTLY JSON, nothing else:`;

const EVAL_USER_PROMPT_ZH = `评测网名：「{name}」{userInfo}

【确定性评分数据】（来自命理算法，请原样使用，不要修改）：
命理分：{yiXueScore}
传播力：{influencerLevel}
人缘分：{acceptanceLevel}
综合分：{overallScore}

请围绕以上确定性分数，生成风趣专业的命理解读文字。

JSON格式输出：`;

const EVAL_USER_PROMPT_EN = `Analyze this name with traditional Bazi: "{name}"{userInfo}

【Deterministic Score Data】(from Bazi algorithm, use as-is, do NOT modify):
Bazi Score: {yiXueScore}
Viral Score: {influencerLevel}
Appeal Score: {acceptanceLevel}
Overall Score: {overallScore}

Generate witty, professional narrative text around these deterministic scores.

JSON format only:`;

// ─── Bilingual generation prompts (v1.1.1 — Realistic Names) ──────────

const GEN_SYSTEM_PROMPT_ZH = `你现在是一个中国传统8字命理的专业研究人员。你熟读《穷通宝典》、《三命通会》、《滴天髓》、《渊海子平》等经典命理著作。你擅长结合传统命理理论、十神生克、格局喜忌、旺衰流通等方法分析。现在你要根据命理为用户起名，分析结果简洁明了，以小白口吻说，幽默风趣。

【核心原则：现实可用】
✅ 生成的名字必须：
- 现实中真的能用、有人在用
- 易读易记，朗朗上口
- 注重传播性，让人过目不忘
- 2-4个字，像真正的社交媒体网名
- 用户的风格要求 = 最高权重

❌ 绝对不能：
- 使用天干地支术语（甲乙丙丁、子丑寅卯）作为名字或推荐词
- 使用命理黑话（比肩、食神、正印、偏财等）作为名字
- 生成像"壬水清""甲木森"这种只有算命先生才起的名字
- 生成太长或太晦涩的名字

【铁律：图文卡片风格 + 短平快】
- yiXueAnalysis：2-3句话搞定命理，像脱口秀不像课堂。用小白听得懂的话说命理！
- suggestedIndustries：3-5个行业，用逗号分隔的短列表。
- 每个名字的reason：就1句话！又好笑又有说服力
- 每个名字的style：2-3个字+emoji，比如"☁️仙气""⚡酷飒"

【起名要求】
生成5个网名，每个要：
- 真实可用的社交网名，不是玄学黑话
- 五行和谐（用"金系""水系"等说法，不用天干地支）
- 适合目标平台（参考同平台热门账号的命名规律）
- 5个之间风格拉开差距
- 用户锁定的字词必须包含
- 用户风格要求权重最高

【统一文风】
- 你的身份：精通传统命理的赐名真人，说话像段子手
- 命理分析要像脱口秀，不像课堂
- reason要像朋友安利：1句搞定，又专业又好笑
- 命理术语必须翻译成小白能听懂的话
- 偶尔引用经典但马上翻译成人话
- emoji是配菜不是主菜，适量点缀

严格输出JSON，不要输出其他内容：`;

const GEN_SYSTEM_PROMPT_EN = `You are a professional researcher of traditional Chinese Bazi (Eight Characters) destiny analysis. You have thoroughly studied the classic texts. You excel at combining traditional destiny theory, Ten Gods, Five Elements, and pattern analysis. Now you will name users based on their destiny — speaking in layman's terms with humor and wit.

【CORE PRINCIPLE: REALISTIC & USABLE】
✅ Generated names MUST be:
- Realistic, actually usable on social media
- Easy to read, remember, and spread
- 2-4 characters, like real social media handles
- User's style requirements = HIGHEST weight

❌ ABSOLUTELY NOT allowed:
- Tiangan/Dizhi terminology (甲乙丙丁, 子丑寅卯) in names or suggestions
- Bazi jargon (比肩, 食神, 正印) as names
- Names like "RenShuiQing" or "JiaMuSen" that only fortune-tellers would create
- Overly long or obscure names

【GOLDEN RULE: CARD-FRIENDLY + SHORT & PUNCHY】
- yiXueAnalysis: 2-3 sentences max. Like standup, not a lecture. Translate destiny jargon to plain language!
- suggestedIndustries: 3-5 industries, comma-separated short list.
- Each name's reason: 1 sentence! Like a friend's pitch — funny, convincing.
- Each name's style: 2-3 chars + emoji, e.g. "☁️Dreamy" "⚡Edgy"

【Name Requirements】
Generate 5 names, each must:
- Be a realistic social media handle someone would actually use
- Be Five Elements harmonious (say "Metal-element" not "Geng-Xin element")
- Fit the target platform (reference naming patterns of popular accounts)
- Span diverse styles across all 5
- Include any user-locked words
- User's style requirements have the HIGHEST weight

【Style Rules】
- Destiny analysis should feel like standup, not a lecture
- Always translate destiny terms into plain language
- Reason = 1 sentence, like a friend's pitch: professional, accurate, hilarious
- Short punchy sentences > long setups

Output STRICTLY JSON, nothing else:`;

const GEN_USER_PROMPT_ZH = `根据以下情报赐名：{userInfo}

以传统命理之术，断其喜忌，赐其美名！
记住：名字要真实可用、易读易记、注重传播性！

直接输出JSON：`;

const GEN_USER_PROMPT_EN = `Generate names based on traditional Bazi analysis:{userInfo}

Read the destiny, find the favorable elements, name accordingly!
Remember: names must be realistic, memorable, and spreadable!

JSON format only:`;

// ─── JSON schema reminders ──

const EVAL_JSON_SCHEMA = `{
  "nameInterpretation": "vivid metaphor interpretation, 1-2 sentences",
  "ambiguityCheck": "red flag roast or safety verdict, 1-2 sentences",
  "yiXueScore": 85,
  "onlineUsageAnalysis": "platform data reference analysis, 1-2 sentences",
  "influencerLevel": 70,
  "acceptanceLevel": 80,
  "viralPotential": "viral positioning, 1-2 sentences",
  "renameSuggestions": "2-3 short rename ideas, NO tiangan/dizhi jargon",
  "overallScore": 78,
  "summary": "one-liner verdict, max 20 chars (ZH) / 30 chars (EN)"
}`;

const GEN_JSON_SCHEMA = `{
  "yiXueAnalysis": "2-3 sentence fun destiny analysis",
  "suggestedIndustries": "industry1, industry2, industry3",
  "names": [
    {"name": "realistic_name1", "score": 85, "reason": "1 funny convincing sentence", "style": "emoji+2-3chars"},
    {"name": "realistic_name2", "score": 82, "reason": "1 funny convincing sentence", "style": "emoji+2-3chars"},
    {"name": "realistic_name3", "score": 80, "reason": "1 funny convincing sentence", "style": "emoji+2-3chars"},
    {"name": "realistic_name4", "score": 78, "reason": "1 funny convincing sentence", "style": "emoji+2-3chars"},
    {"name": "realistic_name5", "score": 75, "reason": "1 funny convincing sentence", "style": "emoji+2-3chars"}
  ]
}`;

/**
 * Evaluate an online name - deterministic scores + LLM narrative
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

  // Calculate deterministic scores from algorithm
  const detScores = calculateDeterministicScores(
    params.name,
    params.bazi || '',
    params.platform
  );

  // Build bazi context for LLM narrative
  const baziCtx = buildBaziContext(params.bazi || '');

  const userInfo: string[] = [];
  if (params.birthDate) userInfo.push(isEn ? `Birthday: ${params.birthDate}` : `生日：${params.birthDate}`);
  if (params.bazi) userInfo.push(isEn ? `Bazi: ${params.bazi}` : `八字：${params.bazi}`);
  if (baziCtx.strength) userInfo.push(isEn ? `Day Master: ${baziCtx.dayMaster} (${baziCtx.strength})` : `日主：${baziCtx.dayMaster}（${baziCtx.strength}）`);
  if (baziCtx.favorable.length > 0) userInfo.push(isEn ? `Favorable: ${baziCtx.favorable.join(', ')}` : `喜用：${baziCtx.favorable.join('、')}`);
  if (baziCtx.unfavorable.length > 0) userInfo.push(isEn ? `Unfavorable: ${baziCtx.unfavorable.join(', ')}` : `忌神：${baziCtx.unfavorable.join('、')}`);
  if (baziCtx.pattern) userInfo.push(isEn ? `Pattern: ${baziCtx.pattern}` : `格局：${baziCtx.pattern}`);
  if (params.birthPlace) userInfo.push(isEn ? `Birthplace: ${params.birthPlace}` : `出生地：${params.birthPlace}`);
  if (params.platform) userInfo.push(isEn ? `Platform: ${params.platform}` : `主战场：${params.platform}`);

  const userInfoStr = userInfo.length > 0 ? (isEn ? `\n\nUser info:\n${userInfo.join('\n')}` : `\n\n用户情报：\n${userInfo.join('\n')}`) : '';

  const systemPrompt = isEn
    ? EVAL_SYSTEM_PROMPT_EN + '\n' + EVAL_JSON_SCHEMA
    : EVAL_SYSTEM_PROMPT_ZH + '\n' + EVAL_JSON_SCHEMA;

  const userPrompt = isEn
    ? EVAL_USER_PROMPT_EN
        .replace('{name}', params.name)
        .replace('{userInfo}', userInfoStr)
        .replace('{yiXueScore}', String(detScores.yiXueScore))
        .replace('{influencerLevel}', String(detScores.influencerLevel))
        .replace('{acceptanceLevel}', String(detScores.acceptanceLevel))
        .replace('{overallScore}', String(detScores.overallScore))
    : EVAL_USER_PROMPT_ZH
        .replace('{name}', params.name)
        .replace('{userInfo}', userInfoStr)
        .replace('{yiXueScore}', String(detScores.yiXueScore))
        .replace('{influencerLevel}', String(detScores.influencerLevel))
        .replace('{acceptanceLevel}', String(detScores.acceptanceLevel))
        .replace('{overallScore}', String(detScores.overallScore));

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

    // Override numeric fields with deterministic scores (LLM generates narratives only)
    parsed.yiXueScore = detScores.yiXueScore;
    parsed.influencerLevel = detScores.influencerLevel;
    parsed.acceptanceLevel = detScores.acceptanceLevel;
    parsed.overallScore = detScores.overallScore;

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
    // Return deterministic scores even on LLM failure
    return {
      ...defaultEvaluationResult,
      yiXueScore: detScores.yiXueScore,
      influencerLevel: detScores.influencerLevel,
      acceptanceLevel: detScores.acceptanceLevel,
      overallScore: detScores.overallScore,
    };
  }
}

/**
 * Generate creative online name suggestions - realistic, spreadable, memorable
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

  // Build bazi context
  const baziCtx = buildBaziContext(params.bazi || '');

  const userInfo: string[] = [];
  if (params.bazi) userInfo.push(isEn ? `Bazi: ${params.bazi}` : `八字：${params.bazi}`);
  if (baziCtx.strength) userInfo.push(isEn ? `Day Master: ${baziCtx.dayMaster} (${baziCtx.strength})` : `日主：${baziCtx.dayMaster}（${baziCtx.strength}）`);
  if (baziCtx.favorable.length > 0) userInfo.push(isEn ? `Favorable elements: ${baziCtx.favorable.join(', ')}` : `喜用五行：${baziCtx.favorable.join('、')}`);
  if (baziCtx.unfavorable.length > 0) userInfo.push(isEn ? `Unfavorable: ${baziCtx.unfavorable.join(', ')}` : `忌神：${baziCtx.unfavorable.join('、')}`);
  if (baziCtx.pattern) userInfo.push(isEn ? `Pattern: ${baziCtx.pattern}` : `格局：${baziCtx.pattern}`);
  if (params.birthPlace) userInfo.push(isEn ? `Birthplace: ${params.birthPlace}` : `出生地：${params.birthPlace}`);
  if (params.platform) userInfo.push(isEn ? `Platform: ${params.platform}` : `主战场：${params.platform}`);
  if (params.requirements) userInfo.push(isEn ? `Vibe (HIGHEST PRIORITY): ${params.requirements}` : `风格（最高权重）：${params.requirements}`);
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

    // Validate each name entry & override scores with deterministic algorithm
    parsed.names = parsed.names.map((n, i) => {
      const detScores = calculateDeterministicScores(
        n.name || '',
        params.bazi || '',
        params.platform
      );
      return {
        name: n.name || defaultGenerationResult.names[i]?.name || `网名${i + 1}`,
        score: detScores.overallScore,
        reason: n.reason || defaultGenerationResult.names[i]?.reason || '适合使用',
        style: n.style || defaultGenerationResult.names[i]?.style || '综合',
      };
    });

    // Ensure string fields have fallback values
    parsed.yiXueAnalysis = parsed.yiXueAnalysis || defaultGenerationResult.yiXueAnalysis;
    parsed.suggestedIndustries = parsed.suggestedIndustries || defaultGenerationResult.suggestedIndustries;

    return parsed;
  } catch (error) {
    console.error('LLM generation error:', error);
    return { ...defaultGenerationResult };
  }
}
