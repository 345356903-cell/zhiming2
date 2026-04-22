// ===================== i18n TRANSLATIONS =====================

export type Lang = 'zh' | 'en'

export const translations = {
  // Header
  appName: { zh: '名鉴', en: 'NameVibe' },
  switchLang: { zh: '切换英文', en: 'Switch to Chinese' },
  
  // Hero
  heroTitle1: { zh: '你的名字，', en: 'Your Name,' },
  heroTitle2: { zh: '你的气场', en: 'Your Vibe' },
  heroSub: { zh: '解码网名背后隐藏的能量 ✨', en: 'Decode the hidden energy behind any online name ✨' },
  
  // Mode toggle
  rateMyName: { zh: '测名评分', en: 'Rate My Name' },
  generateName: { zh: '起名生成', en: 'Generate Name' },
  
  // Form labels
  onlineName: { zh: '网名', en: 'Online Name' },
  onlineNamePlaceholder: { zh: '输入你在网上用的名字...', en: 'Enter the name you go by online...' },
  onlineNameRequired: { zh: '请先输入网名', en: 'Enter a name first' },
  birthDate: { zh: '出生日期', en: 'Birth Date' },
  birthTime: { zh: '出生时间', en: 'Birth Time' },
  optional: { zh: '选填', en: 'optional' },
  birthPlace: { zh: '出生地', en: 'Birth Place' },
  birthPlacePlaceholder: { zh: '如：北京、东京、纽约...', en: 'e.g. Beijing, Tokyo, New York...' },
  mainPlatform: { zh: '主要平台', en: 'Main Platform' },
  selectPlatform: { zh: '选择你的平台', en: 'Select your platform' },
  specialRequirements: { zh: '特别要求', en: 'Special Requirements' },
  specialRequirementsPlaceholder: { zh: '如：赛博朋克风、最多3字、诗意感...', en: 'e.g. Cyberpunk vibe, 3 chars max, poetic feel...' },
  lockWords: { zh: '锁定字词', en: 'Lock Words' },
  lockWordsHint: { zh: '必须包含', en: 'must include' },
  lockWordsPlaceholder: { zh: '如：必须含"月"字', en: 'e.g. must contain "moon"' },
  
  // Submit buttons
  analyzeVibe: { zh: '分析气场', en: 'Analyze Vibe' },
  generateNames: { zh: '生成名字', en: 'Generate Names' },
  
  // Usage
  rating: { zh: '评分', en: 'Rating' },
  generation: { zh: '生成', en: 'Generate' },
  freeLeft: { zh: '次免费/今日', en: 'free today' },
  streak: { zh: '连续', en: 'Streak' },
  streakDays: { zh: '天', en: 'days' },
  streakBonusDesc: { zh: '连续使用+{bonus}次', en: 'Streak +{bonus} tries' },
  shareBonusDesc: { zh: '分享+{bonus}次', en: 'Share +{bonus} tries' },
  
  // Calendar
  calendarSolar: { zh: '阳历', en: 'Gregorian' },
  calendarLunar: { zh: '农历', en: 'Lunar' },
  calendarIslamic: { zh: '伊斯兰历', en: 'Hijri' },
  
  // Platform regions
  regionChina: { zh: '🇨🇳 国内', en: '🇨🇳 China' },
  regionGlobal: { zh: '🌍 国际', en: '🌍 Global' },
  regionOther: { zh: '其他', en: 'Other' },
  
  // Bazi auto-generated
  autoBazi: { zh: '⚡ 自动生成八字', en: '⚡ Auto-Generated Bazi' },
  year: { zh: '年', en: 'Year' },
  month: { zh: '月', en: 'Month' },
  day: { zh: '日', en: 'Day' },
  hour: { zh: '时', en: 'Hour' },
  missing: { zh: '缺：', en: 'Missing: ' },
  calculatingBazi: { zh: '正在计算八字...', en: 'Calculating bazi...' },
  
  // Loading
  analyzingVibes: { zh: '气场解析中...', en: 'Analyzing vibes...' },
  generatingNamesLoading: { zh: '名字生成中...', en: 'Generating names...' },
  analyzingSub: { zh: '解码你名字中隐藏的能量', en: 'Decoding the hidden energy of your name' },
  generatingSub: { zh: '寻找与你命理匹配的名字', en: 'Finding names that match your destiny' },
  
  // Eval result
  overall: { zh: '综合', en: 'OVERALL' },
  yiXue: { zh: '易学', en: 'Yi-Xue' },
  viral: { zh: '传播', en: 'Viral' },
  accept: { zh: '接受度', en: 'Accept' },
  nameInterpretation: { zh: '名字释义', en: 'Name Interpretation' },
  redFlagCheck: { zh: '雷区检查', en: 'Red Flag Check' },
  onlinePresence: { zh: '网络存在感', en: 'Online Presence' },
  viralPotential: { zh: '爆火潜力', en: 'Viral Potential' },
  renameSuggestions: { zh: '改名建议', en: 'Rename Suggestions' },
  shareMyScore: { zh: '分享我的评分', en: 'Share My Score' },
  
  // Gen result
  yiXueAnalysis: { zh: '易学测评', en: 'Yi-Xue Analysis' },
  suggestedIndustries: { zh: '建议行业', en: 'Suggested Industries' },
  top5Picks: { zh: 'Top 5 推荐', en: 'Top 5 Picks' },
  score: { zh: '分', en: 'pts' },
  clickToSelect: { zh: '点击选择', en: 'Click to select' },
  confirmSelect: { zh: '再次点击确认', en: 'Click again to confirm' },
  
  // Selected name eval
  selectedName: { zh: '已选名字', en: 'Selected name' },
  evaluatingSelected: { zh: '正在评测选中的名字...', en: 'Evaluating selected name...' },
  
  // Back button
  back: { zh: '返回', en: 'Back' },
  
  // Paywall
  noMoreFree: { zh: '今日免费次数已用完', en: 'No More Free Attempts Today' },
  shareToUnlock: { zh: '分享给朋友，解锁更多次数', en: 'Share with friends to unlock more' },
  ratings: { zh: '评分次数', en: 'Ratings' },
  generations: { zh: '生成次数', en: 'Generations' },
  shareButton: { zh: '分享解锁 +2', en: 'Share to Unlock +2' },
  gotIt: { zh: '知道了', en: 'Got it' },
  dailyReset: { zh: '每日0点重置', en: 'Resets daily at midnight' },
  resetIn: { zh: '重置倒计时', en: 'Resets in' },
  hours: { zh: '时', en: 'h' },
  minutes: { zh: '分', en: 'm' },
  seconds: { zh: '秒', en: 's' },
  
  // Streak info
  streakTitle: { zh: '🔥 连续使用奖励', en: '🔥 Streak Bonus' },
  streakDesc: { zh: '连续每天使用，每天+1次（最多+5）', en: 'Use daily for +1 try per day (max +5)' },
  currentStreak: { zh: '当前连续', en: 'Current streak' },
  shareBonusTitle: { zh: '📢 分享奖励', en: '📢 Share Bonus' },
  shareBonusInfo: { zh: '每次分享+2次（最多+10）', en: 'Each share +2 tries (max +10)' },
  totalQuota: { zh: '今日总配额', en: "Today's total quota" },
  
  // Footer
  entertainmentOnly: { zh: '名鉴 · 仅供娱乐', en: 'NameVibe · For entertainment only' },
  aiPowered: { zh: 'AI驱动分析 · 非科学建议', en: 'AI-powered analysis · Not scientific advice' },
  
  // Share text
  shareText: { zh: '我的网名评分是 {score}！快来测测你的 🔥', en: 'My name score is {score}! Test yours at NameVibe 🔥' },
  linkCopied: { zh: '链接已复制！分享+2次', en: 'Link copied! +2 tries from sharing' },
  
  // Locked content
  lockedContent: { zh: '🔒 天机不可泄露 — 分享解锁深度分析', en: '🔒 Secrets sealed — share to unlock deeper analysis' },
  locked: { zh: '🔒 已锁定', en: '🔒 Locked' },
} as const

export type TranslationKey = keyof typeof translations

export function t(key: TranslationKey, lang: Lang, vars?: Record<string, string | number>): string {
  const val = translations[key]?.[lang] || translations[key]?.en || key
  if (vars) {
    return Object.entries(vars).reduce((str, [k, v]) => str.replace(`{${k}}`, String(v)), val)
  }
  return val
}
