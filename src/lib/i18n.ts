// ===================== i18n TRANSLATIONS =====================
// v1.0.3 — Cleaner, more modern UI

export type Lang = 'zh' | 'en'

export const translations = {
  // App branding
  appName: { zh: '名鉴', en: 'NameVibe' },
  switchLang: { zh: 'EN', en: '中' },

  // Hero - more concise
  heroTitle1: { zh: '你的名字', en: 'Your Name' },
  heroTitle2: { zh: '值几分？', en: 'Score?' },
  heroSub: { zh: 'AI算一卦，看你的网名行不行', en: 'AI reveals your name truth' },

  // Mode toggle - shorter
  rateMyName: { zh: '测名', en: 'Rate' },
  generateName: { zh: '起名', en: 'Name' },

  // Form - simplified birth date
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
  specialRequirementsPlaceholder: { zh: '赛博朋克/诗意/3字内...', en: 'Cyberpunk/Poetic/3 chars...' },
  lockWords: { zh: '必含字', en: 'Must Have' },
  lockWordsHint: { zh: '必须包含', en: 'must include' },
  lockWordsPlaceholder: { zh: '如：必须含"月"', en: 'e.g. must have "moon"' },

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
  analyzingVibes: { zh: '通灵中...', en: 'Channeling...' },
  generatingNamesLoading: { zh: '赐名中...', en: 'Naming...' },
  analyzingSub: { zh: '解读名字里的天机', en: 'Decoding name secrets' },
  generatingSub: { zh: '寻找命理CP', en: 'Finding name soulmate' },

  // Score verdicts
  verdictGodTier: { zh: '天选之名 👑', en: 'God Tier 👑' },
  verdictGreat: { zh: '相当不错 🌟', en: 'Pretty Great 🌟' },
  verdictDecent: { zh: '中规中矩 😐', en: 'Decent 😐' },
  verdictMeh: { zh: '有点拉 🫠', en: 'Kinda Meh 🫠' },
  verdictDanger: { zh: '快改吧 💀', en: 'Change It 💀' },

  // Result sections - shorter, more visual
  overall: { zh: '综合', en: 'OVERALL' },
  yiXue: { zh: '易学', en: 'Yi-Xue' },
  viral: { zh: '传播', en: 'Viral' },
  accept: { zh: '人缘', en: 'Appeal' },
  nameInterpretation: { zh: '别人怎么看你', en: 'How Others See You' },
  redFlagCheck: { zh: '踩雷检测', en: 'Red Flag Check' },
  onlinePresence: { zh: '网络存在感', en: 'Online Presence' },
  viralPotential: { zh: '能不能火', en: 'Viral Potential' },
  renameSuggestions: { zh: '改名锦囊', en: 'Rename Tips' },
  shareMyScore: { zh: '炫耀分数', en: 'Flex Score' },

  // Fortune card (new)
  fortuneCard: { zh: '命鉴天书', en: 'Name Oracle' },
  fortuneReveal: { zh: '揭秘你的网名命运', en: 'Revealing your name destiny' },

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
  entertainmentOnly: { zh: '名鉴 · 仅供娱乐', en: 'NameVibe · For Fun Only' },
  aiPowered: { zh: 'AI玄学 · 别当真', en: 'AI mystic · Not serious' },

  // Share
  shareText: { zh: '我的网名评分 {score}！你的呢？', en: 'My name scored {score}! Yours?' },
  linkCopied: { zh: '已复制！分享+2次', en: 'Copied! +2 tries' },

  // Locked
  lockedContent: { zh: '🔒 天机不可泄露', en: '🔒 Secrets sealed' },
  locked: { zh: '🔒 已锁定', en: '🔒 Locked' },

  // Platform regions
  regionChina: { zh: '🇨🇳 国内', en: '🇨🇳 China' },
  regionGlobal: { zh: '🌍 国际', en: '🌍 Global' },

  // Date input
  datePlaceholder: { zh: '选择日期', en: 'Pick date' },

  // Quick date shortcuts (new)
  today: { zh: '今天', en: 'Today' },
  yesterday: { zh: '昨天', en: 'Yesterday' },
} as const

export type TranslationKey = keyof typeof translations

export function t(key: TranslationKey, lang: Lang, vars?: Record<string, string | number>): string {
  const val = translations[key]?.[lang] || translations[key]?.en || key
  if (vars) {
    return Object.entries(vars).reduce((str: string, [k, v]) => str.replace(`{${k}}`, String(v)), val as string)
  }
  return val
}
