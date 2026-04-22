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
  // Try to extract from markdown code block first
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  // Try to find a JSON object in the text
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return jsonMatch[0].trim();
  }

  // Return the raw text as a last resort
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

// Default fallback for evaluation results
const defaultEvaluationResult: NameEvaluationResult = {
  nameInterpretation: '暂无释义',
  ambiguityCheck: '未检测到明显歧义',
  yiXueScore: 50,
  onlineUsageAnalysis: '暂无分析数据',
  influencerLevel: 30,
  acceptanceLevel: 50,
  viralPotential: '暂无分析',
  renameSuggestions: '暂无建议',
  overallScore: 50,
  summary: '评测完成，但结果解析异常，请重试',
};

// Default fallback for generation results
const defaultGenerationResult: NameGenerationResult = {
  yiXueAnalysis: '暂无分析',
  suggestedIndustries: '暂无建议',
  names: [
    { name: '云逸', score: 75, reason: '意境悠远，适合文艺类平台', style: '文艺' },
    { name: '星河', score: 72, reason: '大气磅礴，适用范围广', style: '大气' },
    { name: '清风', score: 70, reason: '简洁明快，接受度高', style: '简约' },
    { name: '墨染', score: 68, reason: '古风韵味，适合创作类', style: '古风' },
    { name: '浅语', score: 65, reason: '温柔细腻，适合社交平台', style: '温婉' },
  ],
};

/**
 * Evaluate an online name from multiple perspectives
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
  if (params.birthDate) userInfo.push(isEn ? `Birth date: ${params.birthDate}` : `出生日期：${params.birthDate}`);
  if (params.bazi) userInfo.push(isEn ? `Bazi: ${params.bazi}` : `八字信息：${params.bazi}`);
  if (params.birthPlace) userInfo.push(isEn ? `Birth place: ${params.birthPlace}` : `出生地：${params.birthPlace}`);
  if (params.platform) userInfo.push(isEn ? `Platform: ${params.platform}` : `使用平台：${params.platform}`);

  const userInfoStr = userInfo.length > 0 ? (isEn ? `\n\nUser info:\n${userInfo.join('\n')}` : `\n\n用户信息：\n${userInfo.join('\n')}`) : '';

  const systemPrompt = isEn
    ? `You are a master of Chinese Yi-Xue (易学/I Ching studies), internet culture, and naming science. You need to comprehensively evaluate this online name from multiple angles.

Evaluation dimensions:
1. **Name Interpretation**: From a stranger's perspective, what associations and impressions does this name create? What are the literal and deeper meanings?
2. **Red Flag Check**: Does this name have homophone issues, internet meme associations, dialect misunderstandings, or inappropriate connotations? Check carefully.
3. **Yi-Xue Score**: Rate from a Yi-Xue (Five Elements, stroke numerology, phonetics) perspective, 0-100. Analyze based on the user's Bazi and birth info.
4. **Online Presence Analysis**: How common is this name online? Are there famous people using it? How is its search visibility?
5. **Influencer Level**: What is the viral potential of this name? 0-100. Consider uniqueness, memorability, shareability.
6. **Acceptance Level**: How well is this name accepted by the general public? 0-100. Consider acceptance across age groups.
7. **Viral Potential & Positioning**: If this name goes viral, in what field? Give specific positioning advice.
8. **Rename Suggestions**: If improvement is needed, give specific rename suggestions and directions.
9. **Overall Score**: Weighted score across all dimensions, 0-100.
10. **Summary**: A concise and powerful one-sentence summary of the name's core evaluation.

Please output strictly in the following JSON format, nothing else:
{
  "nameInterpretation": "name interpretation content",
  "ambiguityCheck": "red flag check content",
  "yiXueScore": 85,
  "onlineUsageAnalysis": "online presence analysis",
  "influencerLevel": 70,
  "acceptanceLevel": 80,
  "viralPotential": "viral potential and positioning analysis",
  "renameSuggestions": "rename suggestions",
  "overallScore": 78,
  "summary": "one-sentence summary"
}`
    : `你是一位精通易学、网络文化和命名学的大师。你需要从多个角度对这个网名进行全面、深入的评测分析。

评测维度包括：
1. **名字释义/陌生人解读**：从陌生人视角，第一眼看到这个名字会产生什么联想和印象？字面含义和深层寓意是什么？
2. **歧义/垃圾梗/方言错误检查**：这个名字是否存在谐音歧义、网络垃圾梗、方言误解、不雅联想等问题？要特别仔细检查。
3. **易学评分**：从易学（五行、笔画数理、音韵）角度评分，0-100分。结合用户提供的八字和出生信息进行分析。
4. **网上使用情况分析**：这个名字在网络上是否常见？是否有知名人物使用？搜索可见度如何？
5. **网红程度**：这个名字的网红潜力有多大？0-100分。考虑独特性、记忆度、传播性。
6. **接受程度**：大众对这个名字的接受程度如何？0-100分。考虑各年龄层和群体的接受度。
7. **爆火可能性及定位方向**：这个名字如果爆火，最可能在什么领域？给出具体的定位建议。
8. **改名建议**：如果需要改进，给出具体的改名建议和方向。
9. **综合评分**：综合所有维度的加权评分，0-100分。
10. **一句话总结**：用一句简洁有力的话总结这个网名的核心评价。

请严格按照以下JSON格式输出，不要输出任何其他内容：
{
  "nameInterpretation": "名字释义内容",
  "ambiguityCheck": "歧义检查内容",
  "yiXueScore": 85,
  "onlineUsageAnalysis": "网上使用情况分析",
  "influencerLevel": 70,
  "acceptanceLevel": 80,
  "viralPotential": "爆火可能性分析及定位方向",
  "renameSuggestions": "改名建议",
  "overallScore": 78,
  "summary": "一句话总结"
}`;

  const userPrompt = isEn
    ? `Please evaluate this online name: "${params.name}"${userInfoStr}

Analyze from all dimensions including name interpretation, red flag check, Yi-Xue score, online presence, influencer level, acceptance, viral potential, and rename suggestions. Provide an overall score and summary.

Output JSON format only, nothing else.`
    : `请评测以下网名：「${params.name}」${userInfoStr}

请从名字释义、歧义检查、易学评分、网上使用情况、网红程度、接受程度、爆火可能性、改名建议等维度进行全面分析，并给出综合评分和一句话总结。

请直接输出JSON格式的评测结果，不要输出其他内容。`;

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
 * Generate creative online name suggestions
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
  if (params.bazi) userInfo.push(isEn ? `Bazi: ${params.bazi}` : `八字信息：${params.bazi}`);
  if (params.birthPlace) userInfo.push(isEn ? `Birth place: ${params.birthPlace}` : `出生地：${params.birthPlace}`);
  if (params.platform) userInfo.push(isEn ? `Platform: ${params.platform}` : `使用平台：${params.platform}`);
  if (params.requirements) userInfo.push(isEn ? `Requirements: ${params.requirements}` : `命名要求：${params.requirements}`);
  if (params.lockedWords) userInfo.push(isEn ? `Locked words (must include): ${params.lockedWords}` : `锁定的字词（必须包含）：${params.lockedWords}`);

  const userInfoStr = userInfo.length > 0 ? (isEn ? `\n\nUser info:\n${userInfo.join('\n')}` : `\n\n用户信息：\n${userInfo.join('\n')}`) : '';

  const systemPrompt = isEn
    ? `You are a master of Chinese Yi-Xue (易学/I Ching studies), internet culture, and creative naming. Based on the user's information, generate 5 creative and excellent online name suggestions.

You need to:
1. **Yi-Xue Analysis**: Based on Bazi and Five Elements, analyze suitable elemental properties and character directions.
2. **Suggested Industries**: Based on destiny characteristics, suggest suitable industries and development directions.
3. **Generate 5 names**: Each name should come with a score, recommendation reason, and style tag.

Name generation principles:
- Catchy and memorable
- Positive meaning, no ambiguity
- Follows Five Elements mutual generation principles
- Suitable for target platform and user positioning
- Unique, avoiding overly common names
- If user specified locked words, the generated names must include them

Style categories: Artistic, Classical, Minimalist, Grand, Elegant, Bold, Fresh, Mysterious, Trendy, Cute, Cool, Zen, etc.

Please output strictly in the following JSON format, nothing else:
{
  "yiXueAnalysis": "Yi-Xue analysis content",
  "suggestedIndustries": "suggested industries",
  "names": [
    {
      "name": "name1",
      "score": 85,
      "reason": "recommendation reason",
      "style": "style tag"
    },
    {
      "name": "name2",
      "score": 82,
      "reason": "recommendation reason",
      "style": "style tag"
    },
    {
      "name": "name3",
      "score": 80,
      "reason": "recommendation reason",
      "style": "style tag"
    },
    {
      "name": "name4",
      "score": 78,
      "reason": "recommendation reason",
      "style": "style tag"
    },
    {
      "name": "name5",
      "score": 75,
      "reason": "recommendation reason",
      "style": "style tag"
    }
  ]
}`
    : `你是一位精通易学、网络文化和命名创意的大师。你需要根据用户提供的信息，生成5个富有创意且各方面优秀的网名建议。

你需要：
1. **易学测评**：根据八字五行等易学知识，分析适合的五行属性和用字方向。
2. **推测建议行业**：根据命理特征，推测适合的行业和发展方向。
3. **生成5个网名**：每个网名都要附带评分、推荐理由和风格标签。

网名生成原则：
- 朗朗上口，记忆度高
- 寓意美好，无歧义
- 符合易学五行相生原则
- 适合目标平台和用户定位
- 有独特性，避免过于大众化
- 如果用户指定了锁定字词，生成的网名必须包含该字词

风格分类参考：文艺、古风、简约、大气、温婉、豪放、清新、神秘、潮流、可爱、酷飒、禅意等

请严格按照以下JSON格式输出，不要输出任何其他内容：
{
  "yiXueAnalysis": "易学测评内容",
  "suggestedIndustries": "推测建议行业",
  "names": [
    {
      "name": "网名1",
      "score": 85,
      "reason": "推荐理由",
      "style": "风格标签"
    },
    {
      "name": "网名2",
      "score": 82,
      "reason": "推荐理由",
      "style": "风格标签"
    },
    {
      "name": "网名3",
      "score": 80,
      "reason": "推荐理由",
      "style": "风格标签"
    },
    {
      "name": "网名4",
      "score": 78,
      "reason": "推荐理由",
      "style": "风格标签"
    },
    {
      "name": "网名5",
      "score": 75,
      "reason": "推荐理由",
      "style": "风格标签"
    }
  ]
}`;

  const userPrompt = isEn
    ? `Please generate 5 online name suggestions based on the following info:${userInfoStr}

Requirements:
1. First perform a Yi-Xue analysis
2. Suggest suitable industry directions
3. Generate 5 distinctive names, each with score, reason, and style tag
4. Ensure diversity in styles among the names

Output JSON format only, nothing else.`
    : `请根据以下信息为我生成5个网名建议：${userInfoStr}

要求：
1. 先进行易学测评分析
2. 推测适合的行业方向
3. 生成5个各具特色的网名，每个都要有评分、理由和风格标签
4. 确保网名之间风格多样化

请直接输出JSON格式的生成结果，不要输出其他内容。`;

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
