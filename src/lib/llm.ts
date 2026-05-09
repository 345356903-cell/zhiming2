import ZAI from 'z-ai-web-dev-sdk';
import { calculateDeterministicScores, buildBaziContext, type WuxingElement } from './bazi-score';

// ─── ZAI SDK Instance Management ──────────────────────────────────────
// Simple singleton + targeted retry for PreconditionFailed (cold start)

let zaiInstance: InstanceType<typeof ZAI> | null = null;
let zaiInitPromise: Promise<InstanceType<typeof ZAI>> | null = null;

async function getZAI(): Promise<InstanceType<typeof ZAI>> {
  if (zaiInstance) return zaiInstance;
  if (zaiInitPromise) return zaiInitPromise;

  zaiInitPromise = ZAI.create()
    .then((instance) => {
      zaiInstance = instance;
      return instance;
    })
    .catch((error) => {
      zaiInitPromise = null;
      throw error;
    });

  return zaiInitPromise;
}

/**
 * Check if an error is the ZAI PreconditionFailed cold-start error.
 * The cloud function returns this when it hasn't finished initializing.
 */
function isPreconditionFailed(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as Record<string, any>;
  return (
    e.code === 'PreconditionFailed' ||
    e.Code === 'PreconditionFailed' ||
    String(e.message || e.Message || '').includes('pending state') ||
    String(e.message || e.Message || '').includes('PreconditionFailed')
  );
}

/**
 * Call ZAI chat completion with targeted retry for PreconditionFailed.
 * Only retries on cold-start "pending state" errors, max 3 attempts.
 * Delays: 2s → 4s → 8s (exponential backoff).
 */
async function callZAIWithRetry(
  zai: InstanceType<typeof ZAI>,
  params: { messages: { role: string; content: string }[]; thinking: { type: string } },
  maxRetries = 3
): Promise<any> {
  const delays = [2000, 4000, 8000];
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await zai.chat.completions.create(params);
    } catch (error) {
      lastError = error;
      if (isPreconditionFailed(error) && attempt < maxRetries) {
        const delay = delays[attempt] || 8000;
        console.log(`[ZAI] PreconditionFailed (attempt ${attempt + 1}/${maxRetries}), retrying in ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
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
function parseWithFallback<T>(text: string, fallback: T): T {
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
    { name: '霓虹夜行人', score: 75, reason: '赛博到骨头里，黑屏都发光', style: '🎮赛博' },
    { name: '像素废墟', score: 72, reason: '像素风永不过时，复古又前卫', style: '🎮赛博' },
    { name: '零号协议', score: 70, reason: '零号玩家既视感，神秘又酷', style: '🎮赛博' },
    { name: '暗域追踪', score: 68, reason: '暗黑风格追踪者，深不可测', style: '🎮赛博' },
    { name: '机械心跳', score: 65, reason: '冷硬如石但闪着光，高级感拉满', style: '🎮赛博' },
  ],
};

// ─── Bilingual evaluation prompts (v1.1.2 — Deterministic Scoring) ────

const EVAL_SYSTEM_PROMPT_ZH = `你现在是一位资深命理顾问，精通中国传统八字命理学。你熟读《穷通宝典》《三命通会》《滴天髓》《渊海子平》《千里命稿》《子平真诠》《神峰通考》等经典命理著作，同时深谙当代社交心理学、认知心理学与个人品牌塑造之道。你擅长将传统命理智慧与现代审美心理相结合，给出既专业又贴近生活的分析。

【核心原则：确定性分析】
你收到的评分数据来自确定性命理算法，相同八字+相同名字=相同分数。你的任务是围绕这些确定性分数，生成专业且易懂的命理解读文字。不要自行编造或修改分数。

【铁律：图文卡片风格】
每个文字字段就是一个卡片的内容！大多数字段最多1-2个短句，精炼有力。但nameInterpretation和renameSuggestions是例外，需要更深入专业的解读！每句话都要有画面感、有洞察力、让人想截图！绝不写空洞的段落！

【评测维度与输出规范】
1. nameInterpretation — 用传统命理视角深度解读这个网名！必须结合具体八字十神（如食神、正印）和五行生克关系详细分析，说出该名字对应的五行属性、与日主的生克关系、对命局的补益或冲克。4-6句话！用大众能听懂的话说，但要有专业命理依据，不是泛泛而谈。必须结合大众心理和认知科学：这个名字给人的第一印象是什么？容易引发什么情感联想？为什么？例如"'星辰'二字属火，日主戊土，火生土为印星护身，八字身弱最喜火来帮扶——这名字等于给你配了个贴身护卫。认知心理学研究表明，'星辰'触发的'大尺度意象'能激发人的敬畏感和仰望心理，社交场景中天然具有吸引力。对陌生人来说，这类意象名字的记忆成本仅为普通名字的三分之一。但火土偏旺的人用就过了，等于暖气开到30度再加个电热毯"。
2. ambiguityCheck — 踩雷检测！谐音翻车？方言社死？1-2句专业判定，说明是否存在歧义风险及具体风险点。安全则用自信语气确认。
3. yiXueScore — 你收到的确定性命理分，原样输出，不要修改。
4. onlineUsageAnalysis — 网络存在感分析！结合社交媒体传播规律和认知心理学分析该名字的数字形象：辨识度、搜索友好度、品牌延展性。1-2句用专业视角+比喻说明。
5. influencerLevel — 你收到的确定性传播力分，原样输出，不要修改。
6. acceptanceLevel — 你收到的确定性人缘分，原样输出，不要修改。
7. viralPotential — 传播潜力评估！结合命理格局与社交传播心理、网络效应理论，给出具体赛道定位。如"伤官配印格，创意赛道天赋型选手，适合做内容创业"。
8. renameSuggestions — 专业改名建议！这是最重要的输出之一！如果综合分<80，必须给出3条以上具体改名建议；如果≥80，给2-3条锦上添花的建议。每条必须包含：①推荐名字 ②命理依据（为什么补益命局，结合喜用五行，引用具体经典论断） ③心理暗示（基于认知心理学和社交心理学分析，这个名字对使用者和看到的人分别有什么心理影响，为什么会产生这种影响） ④适用场景（适合什么平台、什么行业、什么人设，给出具体理由）。例如："1. 「锦辰」— 金系名字，补益命局：《穷通宝典》云'金水相生，格局清秀'，日主庚金身弱，锦为金之华彩，辰为龙腾之时，金水相生扶助日主。心理暗示：'锦'触发大脑的'奖赏预期'——神经科学研究证实，与华丽相关的词汇能激活伏隔核，产生积极的情感预期；'辰'暗含'时机'之意，暗示'正当其时'。组合起来给人贵气不失亲和的印象，心理学上属于'高温暖+高能力'的最佳社交印象区间。适用：小红书/抖音个人品牌，文创、设计、咨询行业，适合打造'专业但不高冷'的人设。" 不要用天干地支术语（甲乙丙丁、子丑寅卯），用"金系""水系"等通俗说法。
9. overallScore — 你收到的确定性综合分，原样输出，不要修改。
10. summary — 一句话判词！最多15字！要像批命一样掷地有声！

【统一文风】
- 你的身份：资深命理顾问，专业可信但不故弄玄虚
- 命理术语要用通俗口吻解释，让普通人也能理解其中的逻辑
- 画面感第一！说"八字火旺，像个行走的暖宝宝"不说"五行火旺"
- 洞察力 > 专业术语 > 段子。让人"原来如此"比让人"哈哈一笑"更重要
- 短句暴击！绝不写冗长句子
- 偶尔引用经典但马上翻译成人话
- renameSuggestions必须有心理学（认知心理学、社交心理学）和社交传播角度的深度分析，不能只说命理
- renameSuggestions绝不使用天干地支术语
- renameSuggestions每条建议必须引用经典命理著作的论断（如《穷通宝典》《滴天髓》等）
- renameSuggestions的心理暗示部分要基于科学心理学（如首因效应、光环效应、奖赏预期、社会认同等），不能只说"给人好印象"，要说清楚为什么

严格输出JSON，不要输出任何其他内容：`;

const EVAL_SYSTEM_PROMPT_EN = `You are a senior destiny consultant, expert in traditional Chinese Bazi (Eight Characters) destiny analysis. You have thoroughly studied classics including "Qiong Tong Bao Dian" (穷通宝典), "San Ming Tong Hui" (三命通会), "Di Tian Sui" (滴天髓), "Yuan Hai Zi Ping" (渊海子平), "Qian Li Ming Gao" (千里命稿), "Zi Ping Zhen Quan" (子平真诠), and "Shen Feng Kao" (神峰通考). You also deeply understand cognitive psychology, social psychology, and personal branding. You excel at combining traditional destiny wisdom with scientific psychological insight to deliver analysis that is both professional and relatable.

【CORE PRINCIPLE: DETERMINISTIC ANALYSIS】
The scores you receive come from a deterministic Bazi algorithm — same bazi + same name = same scores. Your task is to generate professional, accessible narrative text around these deterministic scores. Do NOT invent or modify the scores yourself.

【GOLDEN RULE: CARD-FRIENDLY VISUAL STYLE】
Every text field = ONE card's content. Most fields: max 1-2 short sentences. EXCEPTIONS: nameInterpretation and renameSuggestions need deeper professional analysis. Think insight-rich, quotable, screenshot-worthy. NO empty paragraphs!

【Dimensions & Output Spec】
1. nameInterpretation — In-depth Bazi decoding! Must reference specific Ten Gods (e.g. Output Star, Seal Star) and Five Elements relationships. Explain the name's element, its generating/overcoming relationship with Day Master, and how it benefits or clashes with the destiny pattern. 4-6 sentences! Combine Bazi logic with cognitive science and psychological insight: What's the first impression? What emotions does it evoke? WHY? E.g. "'StarDust' carries Fire element generating your Earth Day Master — Seal Star protection. Your Bazi is weak, so Fire support is exactly what you need, like a personal guardian. Cognitive psychology research shows 'star' triggers 'scale imagery' that activates the brain's awe circuitry — specifically the default mode network — evoking aspiration and wonder. For strangers, such cosmic-imagery names have one-third the memory encoding cost of ordinary names. But if your Fire-Earth is already strong, this name overloads like heating at 30°C plus an electric blanket."
2. ambiguityCheck — Red flag radar! 1-2 sentences with professional assessment. Explain specific risk points if any. No flags? Give a confident clearance.
3. yiXueScore — The deterministic Bazi score you received. Output as-is, do NOT modify.
4. onlineUsageAnalysis — Digital presence analysis! Assess the name's digital brand value using cognitive psychology and social传播patterns: distinctiveness, search-friendliness, brand extensibility. 1-2 sentences with professional insight + vivid comparisons.
5. influencerLevel — The deterministic viral score you received. Output as-is, do NOT modify.
6. acceptanceLevel — The deterministic appeal score you received. Output as-is, do NOT modify.
7. viralPotential — Viral potential assessment! Combine destiny pattern with social psychology and network effect theory for specific positioning. E.g. "Output Star paired with Seal — natural-born content creator, ideal for creative entrepreneurship."
8. renameSuggestions — Professional rename advice! This is one of the MOST IMPORTANT outputs! If overallScore < 80, MUST give 3+ specific rename suggestions; if ≥ 80, give 2-3 enhancement tips. Each MUST include: ①Suggested name ②Bazi reason (why it benefits the destiny pattern, cite specific classic texts like Qiong Tong Bao Dian, Di Tian Sui) ③Psychological impact (based on cognitive/social psychology — explain WHY this name creates its effect, cite principles like primacy effect, halo effect, reward anticipation, social proof) ④Best-fit scenario (which platform, industry, persona — with specific reasoning). E.g.: "1. 'Aurelius' — Metal-element name. Bazi basis: 'Qiong Tong Bao Dian' states 'Metal-Water mutual generation yields refined elegance.' Day Master is weak Metal; 'Aur' relates to gold's luster, 'elius' adds solar fire generating Metal (Fire→Earth→Metal chain). Psychological impact: 'Aur-' triggers the brain's reward anticipation — neuroscience confirms luxury-associated syllables activate the nucleus accumbens; '-elius' adds gravitas through classical association. This combination lands in the 'high warmth + high competence' optimal social impression zone identified by Fiske's stereotype content model. Best for: LinkedIn personal brand, consulting, luxury niches — perfect for 'expert but approachable' persona." Do NOT use Tiangan/Dizhi jargon. Use "Metal-element" "Water-element" etc.
9. overallScore — The deterministic overall score you received. Output as-is, do NOT modify.
10. summary — ONE-LINER verdict! Max 25 chars! Like a destiny pronouncement — authoritative and punchy!

【Unified Style Rules】
- Your identity: senior destiny consultant — professional, credible, never obscure
- Translate destiny jargon into plain language — make the logic accessible
- Vivid imagery FIRST. Say "Fire element blazing like a walking space heater" not "Fire element is strong"
- Insight > jargon > jokes. Making people go "ah, that makes sense!" > making them laugh
- Short punchy sentences ONLY. No long setups
- Occasionally quote classics but immediately translate to human language
- renameSuggestions MUST include cognitive psychology and social psychology angles, not just Bazi
- renameSuggestions must NOT use Tiangan/Dizhi terminology
- renameSuggestions MUST cite specific classic Bazi texts for each suggestion
- renameSuggestions psychological impact must reference actual psychological principles (primacy effect, halo effect, reward anticipation, social proof, etc.), not just say "gives a good impression"

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

// ─── Bilingual generation prompts (v1.1.2 — Realistic Names) ──────────

const GEN_SYSTEM_PROMPT_ZH = `你现在是一个给社交媒体用户起网名的创意达人，同时精通中国传统八字命理。你的核心能力是：先理解用户想要的风格感觉，再用命理知识确保五行和谐。风格第一，命理第二！

【最重要：风格 > 一切】
用户的风格要求 = 绝对第一优先级！命理只是加分项，不是主角！
用户要"赛博朋克"就不能出现"清风明月"，用户要"古风"就不能给"酷炫拽"。
5个名字必须像同一个风格家族出来的，只是各有个性。
5个名字必须互不相同！绝对不能出现重复的名字！

【好名字的标准 — 必须同时满足】
1. 看一眼就想关注：有辨识度、有记忆点、一眼惊艳
2. 真的有人会这么叫：能出现在小红书/抖音/微博的热门账号里
3. 念出来顺口：不拗口、不生僻、不绕嘴、有韵律感
4. 符合用户要求的风格：这是最重要的筛选条件
5. 五行不冲就行：不用完美，不犯忌就好
6. 有画面感：听到名字脑海里能浮现画面或故事

【风格→名字 参考映射 + 好名字示范】
赛博朋克 → 霓虹夜行人、像素废墟、零号协议、暗域追踪、机械心跳
古风诗意 → 鹤归云深、听雨眠、长安故人、烟柳画桥、煮茶待雪
清新自然 → 鹿鸣溪、橘子味的风、薄荷日记、云朵贩卖机、青苔小巷
酷飒个性 → 逆光猎手、野火燎原、破晓者、孤行万里、锋芒毕露
可爱甜美 → 奶茶三分甜、棉花糖工厂、星星碎了一地、蜜桃汽水、泡泡旅行
文艺知性 → 半夏微凉、知秋一叶、拾光书屋、墨语清欢、纸上光阴
极简高级 → 一川、归零、留白、原点、素履
搞笑沙雕 → 铁锅炖自己、摸鱼课代表、退休魔法少女、社恐但能吃、干饭第一名
英文混搭 → Echo漫游者、Nova星、Rin之风、Zero边界、Luna日记

重要：上面的示范是让你感受每种风格的"味道深度"！不是让你照抄！
你生成的名字要同样有深度、有画面感、有辨识度，但用你自己的创意！

【反面教材 — 这种名字不合格】
❌ 太浅：快乐星球、幸福花儿、美好未来（没有辨识度，像中老年网名）
❌ 太装：风华绝代、倾国倾城、绝世风华（自恋型，尴尬）
❌ 太素：星辰、月光、云海（太平淡，像随机词）
❌ 太怪：饕餮之宴、魑魅魍魉（太生僻，没人这么叫）
❌ 重复：5个名字里不能有任何两个相同的名字

【❌ 绝对禁止 — 违反即失败】
- 天干地支字（甲乙丙丁戊己庚辛壬癸、子丑寅卯辰巳午未申酉戌亥）出现在名字中
- 命理黑话（比肩、食神、正印、偏财、七杀等）作为名字
- 像"壬水清""甲木森""辛金月"这种算命先生风格
- 太晦涩生僻的字，日常没人用的
- 超过4个字（除非用户风格本身需要长名如搞笑风）——但如果用户指定了名字长度，必须严格遵守！用户选几字就是几字！
- 5个名字风格散装（不像一家人）
- 5个名字中有重复的

【铁律：短平快输出】
- yiXueAnalysis：2-3句话搞定命理，像脱口秀不像课堂
- suggestedIndustries：3-5个行业，逗号分隔
- 每个名字的reason：就1句话！又好笑又有说服力，必须说清"为什么这名字符合风格+命理"
- 每个名字的style：2-3个字+emoji

【起名流程】
1. 先读用户的风格要求，锁定风格感觉
2. 检查用户是否有名字长度约束（如"必须恰好3个汉字"或"必须恰好8个英文字母"），如有则严格遵守
3. 根据风格感觉+长度约束，脑暴5个风格对味、各有特色、互不重复的名字
4. 用命理知识微调（换掉犯忌的字，补益喜用五行），但风格和长度不能变
5. 确认5个名字都是"同风格家族"，没有乱入的
6. 确认5个名字互不相同
7. 确认没有天干地支字和命理黑话
8. 确认每个名字都有辨识度和画面感，不是太平淡的词
9. 确认每个名字都符合用户指定的长度约束（如有）

严格输出JSON，不要输出其他内容：`;

const GEN_SYSTEM_PROMPT_EN = `You are a creative naming expert for social media users, who also happens to be skilled in traditional Chinese Bazi (Eight Characters) destiny analysis. Your core ability: first understand the vibe the user wants, THEN use Bazi knowledge to ensure Five Elements harmony. Style first, Bazi second!

【MOST IMPORTANT: Style > Everything】
User's style requirement = absolute #1 priority! Bazi is just a bonus, not the main event!
If they want "cyberpunk", no "breeze and moonlight". If they want "ancient Chinese", no "cool edgy".
All 5 names must feel like they belong to the same style family, each with its own personality.
All 5 names MUST be unique! NEVER generate duplicate names!

【Good Name Criteria — Must satisfy ALL】
1. Makes you want to follow instantly: distinctive, memorable, jaw-dropping at first sight
2. Someone would actually use this: could appear in trending accounts on real platforms
3. Rolls off the tongue: not awkward, not obscure, has natural rhythm
4. Matches the user's requested style: this is the most important filter
5. Five Elements don't clash: doesn't need to be perfect, just not taboo
6. Has visual imagery: hearing the name should paint a picture or tell a story

【Style → Name Reference + Good Name Examples】
Cyberpunk → NeonWalker, PixelRuins, Protocol0, DarkTracker, MechHeartbeat
Classical/Poetic → CraneDeepClouds, RainSleeper, OldChangan, WillowBridge, TeaAwaitingSnow
Fresh/Nature → DeerCreek, OrangeBreeze, MintDiary, CloudVendingMachine, MossAlley
Cool/Edgy → BacklightHunter, WildfireBlaze, Dawner, LoneTenThousandMiles, EdgeUnsheathed
Cute/Sweet → MilkTea30Sugar, CottonCandyFactory, StarsShattered, PeachSoda, BubbleVoyage
Literary → MidsummerChill, OneAutumnLeaf, LightBookhouse, InkQuietJoy, PaperTime
Minimalist → OneRiver, ReturnZero, BlankSpace, OriginPoint, SimpleSteps
Funny/Goofy → IronPotSelfCook, FishTouchingRep, RetiredMageGirl, SocialButCanEat, RiceChamp
English Mix → EchoWanderer, NovaStar, RinWind, ZeroBoundary, LunaDiary

IMPORTANT: These examples show the "flavor depth" of each style! Don't copy them!
Your generated names should have the same depth, imagery, and distinctiveness — but with YOUR OWN creativity!

【Bad Examples — These Names Are NOT Acceptable】
❌ Too shallow: HappyPlanet, BeautifulFlower, BrightFuture (no distinctiveness, like boomer usernames)
❌ Too full of yourself: UnmatchedBeauty, PeerlessCharm (cringe-level narcissism)
❌ Too plain: Stars, Moonlight, CloudSea (too generic, like random dictionary words)
❌ Too weird: GluttonyFeast, DemonParade (too obscure, nobody uses these)
❌ Duplicates: No two names in the 5 can be the same

【❌ ABSOLUTELY FORBIDDEN — Violation = Failure】
- Tiangan/Dizhi characters (甲乙丙丁戊己庚辛壬癸, 子丑寅卯辰巳午未申酉戌亥) in names
- Bazi jargon (比肩, 食神, 正印, 偏财, 七杀 etc.) as names
- Names like "RenShuiQing" or "JiaMuSen" that only fortune-tellers create
- Overly obscure characters nobody uses daily
- More than 4 characters (unless the style itself needs long names, like funny style) — BUT if the user specifies a name length, you MUST strictly follow it! User's chosen length = absolute constraint!
- 5 names with scattered styles (not feeling like a family)
- Any duplicate names among the 5

【GOLDEN RULE: SHORT & PUNCHY】
- yiXueAnalysis: 2-3 sentences max. Like standup, not a lecture
- suggestedIndustries: 3-5 industries, comma-separated
- Each name's reason: 1 sentence! Funny + convincing, must explain "why this fits the style + Bazi"
- Each name's style: 2-3 chars + emoji

【Naming Process】
1. Read user's style requirement, lock in the vibe
2. Check if user specified a name length constraint (e.g. "exactly 3 Chinese characters" or "exactly 8 English letters") — if so, STRICTLY follow it
3. Brainstorm 5 names that match the vibe + length constraint, each unique with its own personality
4. Use Bazi to fine-tune (swap taboo chars, boost favorable elements), BUT keep the style AND length
5. Confirm all 5 names are "same style family", no intruders
6. Confirm all 5 names are different from each other
7. Confirm no Tiangan/Dizhi characters or Bazi jargon
8. Confirm each name has distinctiveness and imagery, not bland generic words
9. Confirm each name meets the user's specified length constraint (if any)

Output STRICTLY JSON, nothing else:`;

const GEN_USER_PROMPT_ZH = `根据以下情报赐名：{userInfo}

【第一步】先锁定风格感觉，确认你要起什么味道的名字
【第二步】检查是否有名字长度约束，如有必须严格遵守！
【第三步】脑暴5个风格对味、各有特色、互不重复的名字，必须像一家人
【第四步】用命理微调，但风格和长度不变！换掉犯忌的字就行
【铁律】风格第一！命理第二！绝不出现天干地支字！5个名字必须互不相同！每个名字都要有辨识度和画面感！如有长度约束必须严格遵守！

直接输出JSON：`;

const GEN_USER_PROMPT_EN = `Generate names based on the info below:{userInfo}

【Step 1】Lock in the vibe first — what kind of names does the user want?
【Step 2】Check for name length constraint — if specified, STRICTLY follow it!
【Step 3】Brainstorm 5 names that match the vibe + length constraint, each unique with personality, must feel like a family
【Step 4】Fine-tune with Bazi, but keep the style AND length! Just swap taboo characters
【IRON RULE】Style first! Bazi second! NO Tiangan/Dizhi characters ever! All 5 names MUST be different! Each name must have distinctiveness and imagery! Length constraint MUST be strictly followed if specified!

JSON format only:`;

// ─── JSON schema reminders ──

const EVAL_JSON_SCHEMA = `{
  "nameInterpretation": "4-6 sentences with specific ShiShen (十神) like 食神/正印 and WuXing (五行) relationships. Must cite professional Bazi basis + cognitive psychology/first-impression analysis with scientific reasoning. Not vague talk.",
  "ambiguityCheck": "professional risk assessment or confident clearance, 1-2 sentences",
  "yiXueScore": 85,
  "onlineUsageAnalysis": "digital brand analysis (distinctiveness, search-friendliness, extensibility) with cognitive psychology insight, 1-2 sentences",
  "influencerLevel": 70,
  "acceptanceLevel": 80,
  "viralPotential": "viral positioning combining Bazi pattern + social psychology + network effects, 1-2 sentences",
  "renameSuggestions": "if score<80: 3+ suggestions, each with ①name ②Bazi reason (cite classic text) ③psychological impact (cite specific psychological principle like primacy effect/halo effect/reward anticipation/social proof) ④best-fit scenario (with reasoning). if score≥80: 2-3 enhancement tips in same format. NO tiangan/dizhi jargon. Use 金系/水系 / Metal-element etc.",
  "overallScore": 78,
  "summary": "one-liner verdict, max 15 chars (ZH) / 25 chars (EN)"
}`;

const GEN_JSON_SCHEMA = `{
  "yiXueAnalysis": "2-3 sentence fun destiny analysis",
  "suggestedIndustries": "industry1, industry2, industry3",
  "names": [
    {"name": "霓虹夜行人", "score": 85, "reason": "1 sentence: why it fits the style + Bazi", "style": "🎮赛博"},
    {"name": "像素废墟", "score": 82, "reason": "1 sentence: why it fits the style + Bazi", "style": "🎮赛博"},
    {"name": "零号协议", "score": 80, "reason": "1 sentence: why it fits the style + Bazi", "style": "🎮赛博"},
    {"name": "暗域追踪", "score": 78, "reason": "1 sentence: why it fits the style + Bazi", "style": "🎮赛博"},
    {"name": "机械心跳", "score": 75, "reason": "1 sentence: why it fits the style + Bazi", "style": "🎮赛博"}
  ]
}`;

// ─── Fallback rename suggestions based on 喜用五行 ──────────────

const FALLBACK_NAMES_BY_ELEMENT: Record<WuxingElement, string[]> = {
  '金': ['锦辰', '铭远', '钰涵', '锐思', '鑫然', '钧天', '铂月'],
  '木': ['梓萱', '林溪', '荣光', '茂生', '萧然', '芷兰', '艺涵'],
  '水': ['泽深', '涵光', '澜心', '润泽', '溪月', '沐辰', '清远'],
  '火': ['煜明', '烨辰', '熙然', '晗光', '晟远', '旭阳', '昭然'],
  '土': ['坤远', '培安', '嵩辰', '岳然', '境明', '坦途', '厚德'],
};

function generateFallbackRenameSuggestions(
  score: number,
  favorableElements: string[],
  strength: string,
  isEn: boolean
): string {
  const suggestions: { name: string; element: string; psych: string; scene: string }[] = [];
  const usedNames = new Set<string>();

  const PSYCH_MAP: Record<string, string[]> = {
    '金': ['首因效应：金系字触发"锐利→能力"的直觉判断，心理学研究证实人们会自动将锋利意象与决断力关联，适合打造专业权威人设', '光环效应：金系字的"华彩"属性自带高端暗示，能激活观察者的奖赏预期回路'],
    '木': ['亲和效应：木系字触发生长意象，激活大脑的"生机→可信赖"联想链，社交心理学中属于高温暖信号', '自然锚定：木系字天然携带"有机→真实"的认知锚点，容易建立初始信任'],
    '水': ['深度暗示：水系字触发"流动→智慧"的隐喻映射，认知语言学证实这类意象能提升知识型IP的说服力', '包容效应：水系字的柔性语义激活"开放→接纳"的社会认知，适合需要建立思想领袖形象的场景'],
    '火': ['感染力效应：火系字触发"能量→热情"的情绪感染链，社会心理学证实高能量信号在社交传播中有显著优势', '注意力捕获：火系字的动态语义天然吸引视觉注意，短视频场景中记忆编码效率提升40%'],
    '土': ['信赖效应：土系字触发"稳固→可靠"的安全感联想，信任心理学中属于低风险信号，适合长线经营', '厚积效应：土系字暗示"积累→爆发"的叙事模式，符合大众对"厚积薄发"的成功叙事期待'],
  };
  const SCENE_MAP: Record<string, string[]> = {
    '金': ['适合金融/科技/咨询领域——需要专业权威感的场景，金系字的"锐利"属性强化决策者形象', '适合抖音/小红书专业号——"高能力"信号在知识付费赛道转化率更高'],
    '木': ['适合教育/文化/健康领域——"高温暖+高能力"的最佳印象区间，Fiske刻板印象内容模型证实此组合最受欢迎', '适合公众号/知乎知识号——木系字的"真实感"降低读者的防备心理'],
    '水': ['适合内容创作/咨询/自媒体——水系字的"深度暗示"提升内容感知价值', '适合B站/YouTube深度内容——"智慧流动"意象契合长内容的信任构建需求'],
    '火': ['适合直播/娱乐/创意行业——火系字的能量感染力在实时互动场景效果最大化', '适合短视频/直播快速起号——高能量信号在3秒注意力窗口中捕获率最高'],
    '土': ['适合房地产/传统行业/稳重人设——土系字的信赖效应降低交易决策的心理摩擦', '适合品牌号/企业号——"稳固可靠"的信号增强品牌忠诚度构建'],
  };

  for (const el of favorableElements) {
    const pool = FALLBACK_NAMES_BY_ELEMENT[el as WuxingElement];
    const psychList = PSYCH_MAP[el] || ['五行调和之选'];
    const sceneList = SCENE_MAP[el] || ['多场景通用'];
    if (pool) {
      for (let i = 0; i < pool.length && suggestions.length < 4; i++) {
        const name = pool[i];
        if (!usedNames.has(name)) {
          suggestions.push({
            name,
            element: el,
            psych: psychList[i % psychList.length],
            scene: sceneList[i % sceneList.length],
          });
          usedNames.add(name);
        }
      }
    }
  }

  if (suggestions.length < 3) {
    const allElements: WuxingElement[] = ['金', '木', '水', '火', '土'];
    for (const el of allElements) {
      const pool = FALLBACK_NAMES_BY_ELEMENT[el];
      const psychList = PSYCH_MAP[el] || ['五行调和之选'];
      const sceneList = SCENE_MAP[el] || ['多场景通用'];
      if (pool) {
        for (let i = 0; i < pool.length && suggestions.length < 3; i++) {
          const name = pool[i];
          if (!usedNames.has(name)) {
            suggestions.push({
              name,
              element: el,
              psych: psychList[i % psychList.length],
              scene: sceneList[i % sceneList.length],
            });
            usedNames.add(name);
          }
        }
      }
    }
  }

  const elLabels = favorableElements.length > 0
    ? favorableElements.join('系、') + '系'
    : '五行调和';

  if (isEn) {
    const lines = [`Score ${score} needs improvement! Here are ${elLabels} name suggestions with professional analysis:`];
    suggestions.slice(0, 3).forEach((s, i) => {
      lines.push(`${i + 1}. "${s.name}" — ${s.element}-element. Bazi basis: ${strength === 'weak' ? 'supports Day Master through generating cycle' : 'channels excess energy through output cycle'}. Psychological impact: ${s.psych}. Best for: ${s.scene}.`);
    });
    return lines.join('\n');
  } else {
    const lines = [`${score}分还有提升空间！根据你的喜用${elLabels}，推荐以下专业改名：`];
    suggestions.slice(0, 3).forEach((s, i) => {
      lines.push(`${i + 1}. 「${s.name}」— ${s.element}系名字。补益命局：${strength === '身弱' ? '扶助日主，生扶有力' : '泄秀流通，气韵顺畅'}。心理暗示：${s.psych}。适用场景：${s.scene}。`);
    });
    return lines.join('\n');
  }
}

// ─── Post-processing: Filter Tiangan/Dizhi from generated names ──────

const TIANGAN_CHARS = new Set(['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']);
const DIZHI_CHARS = new Set(['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']);
const BAZI_JARGON = new Set([
  '比肩', '劫财', '食神', '伤官', '偏财', '正财', '七杀', '正官', '偏印', '正印',
]);

function filterTianganDizhi(name: string): string {
  if (BAZI_JARGON.has(name)) return '';
  const cleaned = Array.from(name).filter(ch => !TIANGAN_CHARS.has(ch) && !DIZHI_CHARS.has(ch)).join('');
  return cleaned;
}

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
    const zai = await getZAI();
    const response = await callZAIWithRetry(zai, {
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

    // v1.1.2: Ensure rename suggestions exist with specific names based on 喜用五行
    if (parsed.overallScore < 80) {
      const hasValidSuggestions = parsed.renameSuggestions &&
        parsed.renameSuggestions !== defaultEvaluationResult.renameSuggestions &&
        parsed.renameSuggestions.length > 10;
      if (!hasValidSuggestions) {
        const baziCtx = buildBaziContext(params.bazi || '');
        parsed.renameSuggestions = generateFallbackRenameSuggestions(
          parsed.overallScore,
          baziCtx.favorable,
          baziCtx.strength,
          isEn
        );
      }
    } else if (parsed.overallScore >= 80) {
      const hasValidSuggestions = parsed.renameSuggestions &&
        parsed.renameSuggestions !== defaultEvaluationResult.renameSuggestions &&
        parsed.renameSuggestions.length > 5;
      if (!hasValidSuggestions) {
        const baziCtx = buildBaziContext(params.bazi || '');
        parsed.renameSuggestions = isEn
          ? `Great score! For even more luck, consider ${baziCtx.favorable.length > 0 ? baziCtx.favorable.join('-element or ') + '-element' : 'harmonious'} names to amplify your strengths.`
          : `好名！锦上添花的话，可以考虑${baziCtx.favorable.length > 0 ? baziCtx.favorable.join('系或') + '系' : '五行调和'}的名字，让好运更旺。`;
      }
    }

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
  nameLength?: string;
  lang?: string;
}): Promise<NameGenerationResult> {
  const isEn = params.lang === 'en';

  // Parse nameLength into human-readable constraint
  let lengthConstraint = '';
  if (params.nameLength && params.nameLength !== 'any') {
    if (params.nameLength.startsWith('zh-')) {
      const n = params.nameLength.replace('zh-', '');
      lengthConstraint = isEn ? `Name must be exactly ${n} Chinese characters long` : `名字必须恰好${n}个汉字`;
    } else if (params.nameLength.startsWith('en-')) {
      const n = params.nameLength.replace('en-', '');
      lengthConstraint = isEn ? `Name must be exactly ${n} English letters long` : `名字必须恰好${n}个英文字母`;
    }
  }

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
  if (lengthConstraint) userInfo.push(isEn ? `Name length constraint: ${lengthConstraint}` : `名字长度约束：${lengthConstraint}`);

  const userInfoStr = userInfo.length > 0 ? (isEn ? `\n\nUser info:\n${userInfo.join('\n')}` : `\n\n用户情报：\n${userInfo.join('\n')}`) : '';

  const systemPrompt = isEn
    ? GEN_SYSTEM_PROMPT_EN + '\n' + GEN_JSON_SCHEMA
    : GEN_SYSTEM_PROMPT_ZH + '\n' + GEN_JSON_SCHEMA;

  const userPrompt = isEn
    ? GEN_USER_PROMPT_EN.replace('{userInfo}', userInfoStr)
    : GEN_USER_PROMPT_ZH.replace('{userInfo}', userInfoStr);

  try {
    const zai = await getZAI();
    const response = await callZAIWithRetry(zai, {
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

    // Deduplicate names (LLM may generate duplicates)
    const seenNames = new Set<string>();
    const dedupedNames = parsed.names.filter((n: any) => {
      const name = (n.name || '').trim();
      if (!name || seenNames.has(name)) return false;
      seenNames.add(name);
      return true;
    });
    if (dedupedNames.length < 3 && parsed.names.length >= 3) {
      const nameCount = new Map<string, number>();
      parsed.names.forEach((n: any) => {
        const name = (n.name || '').trim();
        nameCount.set(name, (nameCount.get(name) || 0) + 1);
      });
      dedupedNames.length = 0;
      seenNames.clear();
      parsed.names.forEach((n: any) => {
        const name = (n.name || '').trim();
        if (!name) return;
        if (!seenNames.has(name)) {
          seenNames.add(name);
          dedupedNames.push(n);
        }
      });
    }
    parsed.names = dedupedNames.length > 0 ? dedupedNames : parsed.names;

    // Validate each name entry & override scores with deterministic algorithm
    parsed.names = parsed.names.map((n: any, i: number) => {
      let cleanName = filterTianganDizhi(n.name || '');
      if (!cleanName) {
        cleanName = defaultGenerationResult.names[i]?.name || `网名${i + 1}`;
      }
      const detScores = calculateDeterministicScores(
        cleanName,
        params.bazi || '',
        params.platform
      );
      return {
        name: cleanName,
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
