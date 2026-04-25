// ===================== i18n TRANSLATIONS =====================
// v1.1.1 — 知名 ZhiMing · Deterministic Bazi Scoring

export type Lang = 'zh' | 'en'

export const translations = {
  // App branding
  appName: { zh: '知名', en: 'ZhiMing' },
  switchLang: { zh: 'EN', en: '中' },

  // Hero — Premium professional phrasing
  heroTitle1: { zh: '鉴名识运', en: 'Decode Your Name' },
  heroTitle2: { zh: '一字见乾坤', en: 'One Name, Infinite Destiny' },
  heroSub: { zh: 'AI命理精算 · 八字定盘 · 专业鉴名', en: 'AI Bazi Precision · Professional Name Analysis' },

  // Mode toggle
  rateMyName: { zh: '测名', en: 'Rate' },
  generateName: { zh: '起名', en: 'Name' },

  // Form
  birthDate: { zh: '生日', en: 'Birthday' },
  birthTime: { zh: '时辰(选填)', en: 'Time(opt)' },
  calendarToggle: { zh: '历法', en: 'Calendar' },
  calendarSolar: { zh: '公历', en: 'Solar' },
  calendarLunar: { zh: '农历', en: 'Lunar' },
  optional: { zh: '选填', en: 'optional' },
  onlineName: { zh: '网名', en: 'Name' },
  onlineNamePlaceholder: { zh: '你网上叫啥？', en: 'What do you go by?' },
  onlineNameRequired: { zh: '得填个名字~', en: 'Enter a name~' },
  birthPlace: { zh: '出生地', en: 'Birthplace' },
  birthPlacePlaceholder: { zh: '北京/东京/纽约...', en: 'Beijing/Tokyo/NYC...' },
  mainPlatform: { zh: '主战场', en: 'Platform' },
  selectPlatform: { zh: '哪个平台？', en: 'Which platform?' },
  specialRequirements: { zh: '风格', en: 'Vibe' },
  specialRequirementsPlaceholder: { zh: '选择下方标签或输入自定义风格...', en: 'Pick tags below or type your vibe...' },
  lockWords: { zh: '必含字', en: 'Must Have' },
  lockWordsHint: { zh: '必须包含', en: 'must include' },
  lockWordsPlaceholder: { zh: '如：必须含"月"', en: 'e.g. must have "moon"' },
  styleRequired: { zh: '请填写风格要求', en: 'Style is required' },

  // Submit
  analyzeVibe: { zh: '算一卦', en: 'Divine' },
  generateNames: { zh: '赐名', en: 'Name Me' },

  // Usage
  rating: { zh: '测名', en: 'Rate' },
  generation: { zh: '起名', en: 'Name' },
  streakDays: { zh: '天', en: 'd' },
  dailyReset: { zh: '每日0点重置', en: 'Resets at midnight' },

  // Bazi
  autoBazi: { zh: '八字自动排盘', en: 'Auto Bazi' },
  year: { zh: '年', en: 'Yr' },
  month: { zh: '月', en: 'Mo' },
  day: { zh: '日', en: 'Dy' },
  hour: { zh: '时', en: 'Hr' },
  missing: { zh: '缺：', en: 'Missing: ' },
  calculatingBazi: { zh: '排盘中...', en: 'Calculating...' },

  // Loading
  analyzingVibes: { zh: '命理精算中...', en: 'Calculating destiny...' },
  generatingNamesLoading: { zh: '赐名中...', en: 'Naming...' },
  analyzingSub: { zh: '以传统命理，断此名吉凶', en: 'Analyzing with traditional Bazi' },
  generatingSub: { zh: '五行调和，补偏救弊', en: 'Balancing Five Elements' },

  // Score verdicts
  verdictGodTier: { zh: '天选之名 👑', en: 'God Tier 👑' },
  verdictGreat: { zh: '相当不错 🌟', en: 'Pretty Great 🌟' },
  verdictDecent: { zh: '中规中矩 😐', en: 'Decent 😐' },
  verdictMeh: { zh: '有点拉 🫠', en: 'Kinda Meh 🫠' },
  verdictDanger: { zh: '快改吧 💀', en: 'Change It 💀' },

  // Result sections
  overall: { zh: '综合评分', en: 'OVERALL' },
  yiXue: { zh: '命理', en: 'Bazi' },
  viral: { zh: '传播', en: 'Viral' },
  accept: { zh: '人缘', en: 'Appeal' },
  nameInterpretation: { zh: '命理解读', en: 'Destiny Reading' },
  redFlagCheck: { zh: '踩雷检测', en: 'Red Flag Check' },
  onlinePresence: { zh: '网络存在感', en: 'Online Presence' },
  viralPotential: { zh: '传播潜力', en: 'Viral Potential' },
  renameSuggestions: { zh: '改名建议', en: 'Rename Tips' },
  shareMyScore: { zh: '炫耀分数', en: 'Flex Score' },

  // Deterministic scoring labels
  scoreBazi: { zh: '命理分', en: 'Bazi' },
  scoreSpread: { zh: '传播力', en: 'Viral' },
  scorePopularity: { zh: '人缘分', en: 'Appeal' },
  deterministicNote: { zh: '基于传统命理规则精算', en: 'Calculated by traditional Bazi rules' },

  // Fortune card
  fortuneCard: { zh: '知名命盘', en: 'Name Oracle' },
  fortuneReveal: { zh: '命理精算，结果恒定', en: 'Precision Bazi, Deterministic Results' },

  // Gen result
  yiXueAnalysis: { zh: '命理分析', en: 'Destiny Analysis' },
  suggestedIndustries: { zh: '天命行业', en: 'Calling' },
  top5Picks: { zh: '赐名榜', en: 'Top Picks' },
  score: { zh: '分', en: 'pts' },
  clickToSelect: { zh: '点我选择', en: 'Tap to select' },
  confirmSelect: { zh: '再点确认！', en: 'Tap again!' },

  // Selected name
  selectedName: { zh: '已选', en: 'Selected' },
  evaluatingSelected: { zh: '深度解读中...', en: 'Deep analyzing...' },

  // Back
  back: { zh: '返回', en: 'Back' },

  // Paywall
  noMoreFree: { zh: '今日次数用完了', en: 'No more free tries today' },
  shareToUnlock: { zh: '分享好友解锁更多', en: 'Share to unlock more' },
  ratings: { zh: '测名', en: 'Ratings' },
  generations: { zh: '起名', en: 'Generations' },
  shareButton: { zh: '分享 +2', en: 'Share +2' },
  gotIt: { zh: '知道了', en: 'Got it' },
  resetIn: { zh: '重置倒计时', en: 'Resets in' },
  hours: { zh: '时', en: 'h' },
  minutes: { zh: '分', en: 'm' },
  seconds: { zh: '秒', en: 's' },

  // Streak
  streakTitle: { zh: '连续使用奖励', en: 'Streak Bonus' },
  streakDesc: { zh: '每天坚持用，+1次/天（最多+5）', en: 'Use daily, +1/day (max +5)' },
  shareBonusTitle: { zh: '分享奖励', en: 'Share Bonus' },
  shareBonusInfo: { zh: '每次分享+2次（最多+10）', en: 'Each share +2 (max +10)' },

  // Footer
  entertainmentOnly: { zh: '知名 · AI命理精算', en: 'ZhiMing · AI Bazi Precision' },
  aiPowered: { zh: '传统命理 · 确定性算法', en: 'Traditional Bazi · Deterministic AI' },

  // Share
  shareText: { zh: '知名鉴名："{name}"命理评分 {score} 分', en: 'ZhiMing: "{name}" scored {score} in Bazi analysis' },
  linkCopied: { zh: '已复制！分享+2次', en: 'Copied! +2 tries' },

  // Locked
  lockedContent: { zh: '🔒 天机不可泄露', en: '🔒 Secrets sealed' },
  locked: { zh: '🔒 已锁定', en: '🔒 Locked' },

  // Platform regions
  regionChina: { zh: '🇨🇳 国内', en: '🇨🇳 China' },
  regionGlobal: { zh: '🌍 国际', en: '🌍 Global' },

  // Date input
  datePlaceholder: { zh: '选择日期', en: 'Pick date' },
  today: { zh: '今天', en: 'Today' },
  yesterday: { zh: '昨天', en: 'Yesterday' },

  // User Manual
  manualTitle: { zh: '使用指南', en: 'User Guide' },
  manualClose: { zh: '知道了', en: 'Got it' },

  // Manual - About
  manualAboutTitle: { zh: '📜 什么是知名？', en: '📜 What is ZhiMing?' },
  manualAboutContent: { zh: '知名是一款基于传统八字命理的AI网名评测与起名工具。它熟读《穷通宝典》《三命通会》《滴天髓》《渊海子平》等经典著作，结合十神生克、格局喜忌、旺衰流通等方法，为你的网名评分，还能根据命理智能推荐网名。\n\n基于传统命理规则进行确定性评分，相同名字和八字永远得到相同结果。\n\n⚠️ 本应用纯属娱乐，结果由AI生成，请勿当真！', en: 'ZhiMing is an AI name rating & generator based on traditional Chinese Bazi (Eight Characters) destiny analysis. It studies classics like "Qiong Tong Bao Dian", "San Ming Tong Hui", "Di Tian Sui", and "Yuan Hai Zi Ping", combining Ten Gods, Five Elements, and pattern analysis to score your name and suggest new ones.\n\nScores are calculated by deterministic Bazi rules — same name + same birthdate always yields identical results.\n\n⚠️ This app is for entertainment only. Results are AI-generated — don\'t take them seriously!' },

  // Manual - Rate
  manualRateTitle: { zh: '⭐ 如何测名？', en: '⭐ How to Rate a Name?' },
  manualRateContent: { zh: '1️⃣ 切换到「测名」模式\n2️⃣ 输入你的网名（必填）\n3️⃣ 选择出生日期（系统自动排八字）\n4️⃣ 可选填写出生地、主战场平台\n5️⃣ 点击「算一卦」等待AI解读\n\n系统会从命理分、传播力、人缘分三个维度给出确定性评分和风趣解读。', en: '1️⃣ Switch to "Rate" mode\n2️⃣ Enter your online name (required)\n3️⃣ Select your birthday (auto bazi calculation)\n4️⃣ Optionally add birthplace & platform\n5️⃣ Tap "Divine" and wait for AI analysis\n\nThe system scores your name deterministically across Bazi, Viral, and Appeal dimensions with witty commentary.' },

  // Manual - Generate
  manualGenTitle: { zh: '⚡ 如何起名？', en: '⚡ How to Generate Names?' },
  manualGenContent: { zh: '1️⃣ 切换到「起名」模式\n2️⃣ 选择出生日期（自动排盘）\n3️⃣ 可选填写风格要求，如"赛博朋克""诗意"\n4️⃣ 可选填写必含字，如"必须含月"\n5️⃣ 点击「赐名」获取AI推荐\n\nAI会根据你的命理推荐5个现实可用的网名，点击任一名字可深度评测。', en: '1️⃣ Switch to "Name" mode\n2️⃣ Select your birthday (auto bazi)\n3️⃣ Optionally describe your vibe, e.g. "cyberpunk" "poetic"\n4️⃣ Optionally add must-have words, e.g. "must have moon"\n5️⃣ Tap "Name Me" to get AI suggestions\n\nAI suggests 5 realistic, usable names based on your destiny. Tap any name for a deep evaluation.' },

  // Manual - Bazi
  manualBaziTitle: { zh: '🔮 八字排盘说明', en: '🔮 About Auto Bazi' },
  manualBaziContent: { zh: '选择出生日期后，系统自动排八字。排盘结果包括：\n\n• 年柱、月柱、日柱、时柱\n• 生肖与星座\n• 五行缺什么\n\n如果提供出生时辰，排盘更精准；不填则默认午时(12:00)。支持公历和农历切换。', en: 'After selecting your birthday, bazi is auto-calculated. Results include:\n\n• Year, Month, Day, Hour pillars\n• Zodiac sign & constellation\n• Missing elements\n\nProviding birth time improves accuracy; defaults to noon (12:00) if omitted. Supports solar/lunar calendar toggle.' },

  // Manual - Score
  manualScoreTitle: { zh: '📊 评分等级', en: '📊 Score Levels' },
  manualScoreContent: { zh: '👑 90-100分：天选之名\n🌟 75-89分：相当不错\n😐 55-74分：中规中矩\n🫠 35-54分：有点拉\n💀 0-34分：快改吧\n\n评分基于传统命理规则精算，综合了命理分、传播力、人缘分三个维度。相同输入永远得到相同结果。', en: '👑 90-100: God Tier\n🌟 75-89: Pretty Great\n😐 55-74: Decent\n🫠 35-54: Kinda Meh\n💀 0-34: Change It\n\nScores are calculated deterministically by traditional Bazi rules, combining Bazi, Viral, and Appeal indices. Same input = same result, always.' },

  // Manual - Usage
  manualUsageTitle: { zh: '🎫 使用次数', en: '🎫 Usage Limits' },
  manualUsageContent: { zh: '每日免费次数：测名5次 + 起名5次\n每日0点自动重置\n\n增加次数方法：\n• 📢 分享好友 → 每次分享+2次（最多+10）\n• 🔥 连续使用 → 每天+1次（最多+5）\n\n次数用完后会弹出分享解锁弹窗。', en: 'Daily free tries: 5 ratings + 5 name generations\nResets at midnight\n\nHow to get more:\n• 📢 Share with friends → +2 per share (max +10)\n• 🔥 Daily streak → +1/day (max +5)\n\nWhen runs out, a share-to-unlock dialog appears.' },

  // Manual - Lang
  manualLangTitle: { zh: '🌐 语言切换', en: '🌐 Language Toggle' },
  manualLangContent: { zh: '点击右上角的语言按钮（EN/中）可在中文和英文之间切换。系统会自动检测你的浏览器语言作为默认。', en: 'Tap the language button (EN/中) in the top-right to switch between Chinese and English. The app auto-detects your browser language as default.' },

  // Manual - Result
  manualResultTitle: { zh: '📖 结果解读', en: '📖 Understanding Results' },
  manualResultContent: { zh: '测名结果包含以下卡片：\n\n👀 命理解读 — 基于八字五行解读你的网名\n💣 踩雷检测 — 网名可能的歧义或雷区\n🌐 网络存在感 — 你在网络上的辨识度\n🔥 传播潜力 — 你的网名传播力\n💡 改名锦囊 — AI给你的改名建议\n\n所有评分为确定性算法精算，相同输入结果恒定不变。', en: 'Rating results include these cards:\n\n👀 Destiny Reading — Bazi/Five Elements interpretation of your name\n💣 Red Flag Check — Potential ambiguities or pitfalls\n🌐 Online Presence — Your digital distinctiveness\n🔥 Viral Potential — How shareable your name is\n💡 Rename Tips — AI suggestions for improvement\n\nAll scores are deterministically calculated — same input always yields the same result.' },
} as const

export type TranslationKey = keyof typeof translations

export function t(key: TranslationKey, lang: Lang, vars?: Record<string, string | number>): string {
  const val = translations[key]?.[lang] || translations[key]?.en || key
  if (vars) {
    return Object.entries(vars).reduce((str: string, [k, v]) => str.replace(`{${k}}`, String(v)), val as string)
  }
  return val
}
