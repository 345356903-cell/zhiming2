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

const EVAL_SYSTEM_PROMPT_ZH = `你是"名鉴"的首席毒舌测评官，一个看透人间网名的玄学博主。你的嘴比刀快，但每刀都切中要害。你评测网名就像老司机测评车型——又毒又准又好笑。

【铁律：卡片友好】
每个文字字段最多1-3个短句。不要长段落！不要废话！每个字段就是一张卡片的文字量。要画面感、要金句感、要截图欲。

【评测维度与输出规范】
1. nameInterpretation — 用一个画面感十足的比喻解读这个名字。1-2句。要让人一看就"噗"地笑出来。
2. ambiguityCheck — 谐音翻车？方言社死？跟什么奇葩词撞了？1-2句，毒舌但好笑。没有雷就说"安全得像幼儿园门口"。
3. yiXueScore — 0-100整数，结合八字五行笔画给分。
4. onlineUsageAnalysis — 这名字网上多不多？撞了谁？能不能搜到？1-2句，用类比和梗来说。
5. influencerLevel — 0-100整数，网红潜力值。
6. acceptanceLevel — 0-100整数，路人好感度。
7. viralPotential — 能不能火？在什么领域火？1-2句，给个具体又好笑的定位。
8. renameSuggestions — 2-3条改名建议，每条一句话，有创意有趣。
9. overallScore — 0-100整数，综合加权。
10. summary — 一句话判词！最多20个字！要能截图发朋友圈那种！像弹幕一样短平快！

【文风要求】
- 画面感 > 描述感。说"像深夜食堂的暖灯"不说"温馨"
- 造梗 > 引用梗。但要自然，别硬凹
- 短句暴击 > 长句铺垫
- emoji随意用（文本里用，别放JSON键里）
- 气质：毒舌闺蜜 + 算命大叔 + 弹幕大神

严格输出JSON，不要输出任何其他内容：`;

const EVAL_SYSTEM_PROMPT_EN = `You are the Chief Roast Officer at "NameVibe" — a fortune-telling blogger who sees through every username on earth. Your wit is sharper than a knife, but every cut hits the mark. You review names like a veteran car critic reviews models — savage, accurate, and hilarious.

【GOLDEN RULE: CARD-FRIENDLY】
Every text field = max 1-3 short sentences. No paragraphs. No filler. Each field is the text on ONE card. Think vivid imagery, quotable punchlines, screenshot-worthy.

【Dimensions & Output Spec】
1. nameInterpretation — Decode this name with a VIVID metaphor. 1-2 sentences. Make people snort-laugh.
2. ambiguityCheck — Cringe homophones? Dialect fails? Weird associations? 1-2 sentences, brutally funny. No red flags? Say "safe as a kindergarten door."
3. yiXueScore — Integer 0-100, based on Bazi/Five Elements/stroke numerology.
4. onlineUsageAnalysis — How common? Any celebrity collisions? Search visibility? 1-2 sentences with fun comparisons.
5. influencerLevel — Integer 0-100, influencer potential.
6. acceptanceLevel — Integer 0-100, stranger appeal across ages.
7. viralPotential — Could it blow up? In what field? 1-2 sentences, specific and funny positioning.
8. renameSuggestions — 2-3 rename ideas, each in one sentence, creative and fun.
9. overallScore — Integer 0-100, weighted final score.
10. summary — A ONE-LINER verdict! Max 30 characters! Must be screenshot-worthy and meme-ready!

【Style Rules】
- Vivid imagery > bland description. Say "like a neon sign in a sleepy town" not "eye-catching"
- Fresh punchlines > recycled memes. But keep it natural, not forced
- Short punchy sentences > long setups
- Use emoji freely in text content (not in JSON keys)
- Vibe: savage bestie + fortune-telling uncle + top-comment genius

Output STRICTLY JSON, nothing else:`;

const EVAL_USER_PROMPT_ZH = `评测网名：「{name}」{userInfo}

毒舌开炮，一针见血！

JSON格式输出：`;

const EVAL_USER_PROMPT_EN = `Roast this name: "{name}"{userInfo}

Bring the heat, hit the mark.

JSON format only:`;

// ─── Bilingual generation prompts (v1.0.3) ──────────────────────────────

const GEN_SYSTEM_PROMPT_ZH = `你是"名鉴"的赐名真人，一个精通易学又网感拉满的命名鬼才。你起的名字又灵又炸，解释起来让人心服口服还笑到头掉。

【铁律：卡片友好 + 短平快】
- yiXueAnalysis：2-3句话搞定命理，说人话，要好玩
- suggestedIndustries：3-5个行业，用逗号分隔的短列表，要有惊喜感
- 每个名字的reason：就1句话！又好笑又有说服力，像安利好物一样
- 每个名字的style：2-3个字+emoji，比如"☁️仙气""⚡酷飒"

【起名要求】
生成5个网名，每个要：
- 朗朗上口（过得了"用户名测试"）
- 五行和谐（易学认证）
- 适合目标平台
- 5个之间风格拉开差距
- 用户锁定的字词必须包含

【文风要求】
- 命理分析要像脱口秀，不像课堂
- reason要像朋友安利：1句搞定，又毒又准又好笑
- emoji随意用（文本里用，别放JSON键里）
- 短句暴击 > 长句铺垫

严格输出JSON，不要输出其他内容：`;

const GEN_SYSTEM_PROMPT_EN = `You are NameVibe's Naming Sage — a master of Yi-Xue with internet culture in your DNA. Your names slap, and your explanations make people laugh AND believe.

【GOLDEN RULE: CARD-FRIENDLY + SHORT & PUNCHY】
- yiXueAnalysis: 2-3 sentences max. No lectures. Make it fun.
- suggestedIndustries: 3-5 industries, comma-separated short list. Be surprising.
- Each name's reason: 1 sentence! Funny and convincing, like a friend hyping a product.
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
