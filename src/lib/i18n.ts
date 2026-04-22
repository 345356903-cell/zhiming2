// ===================== i18n System =====================

export type Lang = 'zh' | 'en'

type TranslationKeys = {
  // App
  appName: string
  appSlogan: string
  appTagline: string

  // Mode Toggle
  rateMyName: string
  generateName: string

  // Form Labels
  onlineName: string
  onlineNameRequired: string
  onlineNamePlaceholder: string
  birthDate: string
  birthTime: string
  optional: string
  birthPlace: string
  birthPlacePlaceholder: string
  mainPlatform: string
  selectPlatform: string
  specialReqs: string
  specialReqsPlaceholder: string
  lockWords: string
  lockWordsPlaceholder: string

  // Calendar
  solar: string
  lunar: string
  hijri: string

  // Bazi
  autoBazi: string
  year: string
  month: string
  day: string
  hour: string
  missing: string
  calculating: string

  // Buttons
  analyzeVibe: string
  generateNames: string
  back: string
  shareMyScore: string
  shareToUnlock: string
  gotIt: string

  // Loading
  analyzingVibes: string
  generatingNames: string
  decodingEnergy: string
  findingNames: string

  // Results - Eval
  overall: string
  yiXue: string
  viral: string
  accept: string
  nameInterpretation: string
  redFlagCheck: string
  onlinePresence: string
  viralPotential: string
  renameSuggestions: string

  // Results - Gen
  yiXueAnalysis: string
  suggestedIndustries: string
  topPicks: string
  selectedName: string
  evaluatingSelected: string
  score: string
  reason: string
  style: string
  tapToSelect: string
  tapAgain: string

  // Usage
  ratingFree: string
  generateFree: string
  dailyFree: string
  sharedBonus: string

  // Paywall
  noMoreFree: string
  shareUnlockDesc: string
  ratings: string
  generations: string
  dailyReset: string

  // Footer
  entertainment: string
  aiPowered: string

  // China / Global labels
  china: string
  global: string

  // Error
  enterName: string

  // Share text
  shareText: (score: number | string) => string

  // Locked
  locked: string
  freeExhausted: string
  deeperAnalysis: string
  selectedButLocked: (name: string) => string

  // Version
  version: string
}

const zh: TranslationKeys = {
  appName: '名鉴',
  appSlogan: '你的名字，你的气场',
  appTagline: '解码网名背后隐藏的能量 ✨',

  rateMyName: '评测我的网名',
  generateName: '生成新网名',

  onlineName: '网名',
  onlineNameRequired: '必填',
  onlineNamePlaceholder: '输入你的网名...',
  birthDate: '出生日期',
  birthTime: '出生时辰',
  optional: '选填',
  birthPlace: '出生地',
  birthPlacePlaceholder: '如：北京、东京、纽约...',
  mainPlatform: '主要平台',
  selectPlatform: '选择你的平台',
  specialReqs: '特殊要求',
  specialReqsPlaceholder: '如：赛博朋克风、最多3字、诗意感...',
  lockWords: '锁定字词',
  lockWordsPlaceholder: '如：必须包含"月"',

  solar: '阳历',
  lunar: '农历',
  hijri: '伊斯兰历',

  autoBazi: '⚡ 自动生成八字',
  year: '年',
  month: '月',
  day: '日',
  hour: '时',
  missing: '缺',
  calculating: '八字计算中...',

  analyzeVibe: '分析气场',
  generateNames: '生成网名',
  back: '返回',
  shareMyScore: '分享我的分数',
  shareToUnlock: '分享解锁更多',
  gotIt: '知道了',

  analyzingVibes: '正在分析气场...',
  generatingNames: '正在生成网名...',
  decodingEnergy: '解码名字中隐藏的能量',
  findingNames: '寻找匹配你命运的名字',

  overall: '综合',
  yiXue: '易学',
  viral: '传播',
  accept: '接受度',
  nameInterpretation: '名字释义',
  redFlagCheck: '避坑检查',
  onlinePresence: '网上影响力',
  viralPotential: '爆火潜力',
  renameSuggestions: '改名建议',

  yiXueAnalysis: '易学测评',
  suggestedIndustries: '推荐行业',
  topPicks: '精选 TOP 5',
  selectedName: '已选网名',
  evaluatingSelected: '评测已选网名...',
  score: '评分',
  reason: '推荐理由',
  style: '风格',
  tapToSelect: '点击选择',
  tapAgain: '再次确认',

  ratingFree: '评测',
  generateFree: '生成',
  dailyFree: '次免费/天',
  sharedBonus: '分享已加赠',

  noMoreFree: '今日免费次数已用完',
  shareUnlockDesc: '分享给朋友，解锁更多次数',
  ratings: '评测次数',
  generations: '生成次数',
  dailyReset: '每日零点重置',

  entertainment: '名鉴 · 仅供娱乐',
  aiPowered: 'AI 驱动分析 · 非科学建议',

  china: '🇨🇳 国内',
  global: '🌍 国际',

  enterName: '请先输入网名',

  shareText: (score) => `我的网名评分 ${score}！来测测你的 🔥`,

  locked: '🔒 已锁定',
  freeExhausted: '🔒 免费次数已用完 — 深度分析需解锁',
  deeperAnalysis: '深度分析已封印',
  selectedButLocked: (name) => `你选择了「${name}」，深度分析已封印`,

  version: 'v1.0.2',
}

const en: TranslationKeys = {
  appName: 'NameVibe',
  appSlogan: 'Your Name, Your Vibe',
  appTagline: 'Decode the hidden energy behind any online name ✨',

  rateMyName: 'Rate My Name',
  generateName: 'Generate Name',

  onlineName: 'Online Name',
  onlineNameRequired: 'required',
  onlineNamePlaceholder: 'Enter the name you go by online...',
  birthDate: 'Birth Date',
  birthTime: 'Birth Time',
  optional: 'optional',
  birthPlace: 'Birth Place',
  birthPlacePlaceholder: 'e.g. Beijing, Tokyo, New York...',
  mainPlatform: 'Main Platform',
  selectPlatform: 'Select your platform',
  specialReqs: 'Special Requirements',
  specialReqsPlaceholder: 'e.g. Cyberpunk vibe, 3 chars max, poetic feel...',
  lockWords: 'Lock Words',
  lockWordsPlaceholder: 'e.g. must contain "moon"',

  solar: 'Gregorian',
  lunar: 'Lunar',
  hijri: 'Hijri',

  autoBazi: '⚡ Auto-Generated Bazi',
  year: 'Year',
  month: 'Month',
  day: 'Day',
  hour: 'Hour',
  missing: 'Missing',
  calculating: 'Calculating bazi...',

  analyzeVibe: 'Analyze Vibe',
  generateNames: 'Generate Names',
  back: 'Back',
  shareMyScore: 'Share My Score',
  shareToUnlock: 'Share to Unlock',
  gotIt: 'Got it',

  analyzingVibes: 'Analyzing vibes...',
  generatingNames: 'Generating names...',
  decodingEnergy: 'Decoding the hidden energy of your name',
  findingNames: 'Finding names that match your destiny',

  overall: 'OVERALL',
  yiXue: 'Yi-Xue',
  viral: 'Viral',
  accept: 'Accept',
  nameInterpretation: 'Name Interpretation',
  redFlagCheck: 'Red Flag Check',
  onlinePresence: 'Online Presence',
  viralPotential: 'Viral Potential',
  renameSuggestions: 'Rename Suggestions',

  yiXueAnalysis: 'Yi-Xue Analysis',
  suggestedIndustries: 'Suggested Industries',
  topPicks: 'Top 5 Picks',
  selectedName: 'Selected name',
  evaluatingSelected: 'Evaluating selected name...',
  score: 'Score',
  reason: 'Reason',
  style: 'Style',
  tapToSelect: 'Tap to select',
  tapAgain: 'Tap again to confirm',

  ratingFree: 'Rating',
  generateFree: 'Generate',
  dailyFree: 'free/day',
  sharedBonus: 'Share bonus added',

  noMoreFree: 'No More Free Attempts Today',
  shareUnlockDesc: 'Share with friends to unlock more',
  ratings: 'Ratings',
  generations: 'Generations',
  dailyReset: 'Resets daily at midnight',

  entertainment: 'NameVibe · For entertainment only',
  aiPowered: 'AI-powered analysis · Not scientific advice',

  china: '🇨🇳 China',
  global: '🌍 Global',

  enterName: 'Enter a name first',

  shareText: (score) => `My name score is ${score}! Test yours at NameVibe 🔥`,

  locked: '🔒 Locked',
  freeExhausted: '🔒 Free attempts exhausted — deeper analysis requires unlock',
  deeperAnalysis: 'Deeper analysis is sealed',
  selectedButLocked: (name) => `You selected "${name}". Deeper analysis is sealed.`,

  version: 'v1.0.2',
}

const translations: Record<Lang, TranslationKeys> = { zh, en }

export function t(lang: Lang): TranslationKeys {
  return translations[lang]
}

export function getInitialLang(): Lang {
  if (typeof window === 'undefined') return 'zh'
  const stored = localStorage.getItem('namevibe_lang') as Lang | null
  if (stored === 'zh' || stored === 'en') return stored
  // Auto-detect from browser language
  const navLang = navigator.language.toLowerCase()
  if (navLang.startsWith('zh')) return 'zh'
  return 'en'
}

export function setStoredLang(lang: Lang) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('namevibe_lang', lang)
  }
}
