/**
 * bazi-score.ts — Deterministic Bazi Scoring Engine
 *
 * Provides deterministic scores for name evaluation.
 * Same name + same bazi = identical scores every time.
 * NO Math.random() allowed. All scoring is purely algorithmic.
 */

// ═══════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════

export type WuxingElement = '金' | '木' | '水' | '火' | '土';

export interface BaziPillar {
  tiangan: string;   // 天干 character
  dizhi: string;     // 地支 character
  tgElement: WuxingElement;  // 天干五行
  dzElement: WuxingElement;  // 地支五行
}

export interface ParsedBazi {
  year: BaziPillar;
  month: BaziPillar;
  day: BaziPillar;
  hour: BaziPillar;
  dayMaster: WuxingElement;   // 日主五行
  strength: '身强' | '身弱';
  favorable: WuxingElement[]; // 喜用神
  unfavorable: WuxingElement[]; // 忌神
  pattern: string;            // 格局
}

export interface DeterministicScores {
  yiXueScore: number;       // 0-100, Bazi compatibility score
  influencerLevel: number;  // 0-100, viral/spread potential
  acceptanceLevel: number;  // 0-100, popularity/appeal score
  overallScore: number;     // 0-100, weighted combination
}

export interface BaziContext {
  dayMaster: string;        // e.g. "戊土"
  pattern: string;          // e.g. "食神生财格"
  favorable: string[];      // e.g. ["金", "水"]
  unfavorable: string[];    // e.g. ["火", "木"]
  strength: string;         // e.g. "身强" or "身弱"
}

// ═══════════════════════════════════════════════════════════════════════
// Fixed Lookup Tables
// ═══════════════════════════════════════════════════════════════════════

/** 天干 → 五行 mapping */
const TIANGAN_WUXING: Record<string, WuxingElement> = {
  '甲': '木', '乙': '木',
  '丙': '火', '丁': '火',
  '戊': '土', '己': '土',
  '庚': '金', '辛': '金',
  '壬': '水', '癸': '水',
};

/** 地支 → 五行 mapping */
const DIZHI_WUXING: Record<string, WuxingElement> = {
  '子': '水', '丑': '土', '寅': '木', '卯': '木',
  '辰': '土', '巳': '火', '午': '火', '未': '土',
  '申': '金', '酉': '金', '戌': '土', '亥': '水',
};

/** 五行相生 (generation): key generates value */
const GENERATES: Record<WuxingElement, WuxingElement> = {
  '木': '火', '火': '土', '土': '金', '金': '水', '水': '木',
};

/** 五行相克 (overcoming): key overcomes value */
const OVERCOMES: Record<WuxingElement, WuxingElement> = {
  '木': '土', '土': '水', '水': '火', '火': '金', '金': '木',
};

/** Reverse generation: what generates me */
function whatGeneratesMe(el: WuxingElement): WuxingElement {
  const entries: [WuxingElement, WuxingElement][] = [
    ['木', '水'], ['火', '木'], ['土', '火'], ['金', '土'], ['水', '金'],
  ];
  for (const [val, gen] of entries) {
    if (val === el) return gen;
  }
  return el; // fallback
}

/** All five elements */
const ALL_ELEMENTS: WuxingElement[] = ['金', '木', '水', '火', '土'];

// ═══════════════════════════════════════════════════════════════════════
// Chinese Character → Wuxing Mapping (300+ characters)
// Categorized by radical, meaning, and traditional Wuxing association
// ═══════════════════════════════════════════════════════════════════════

const CHAR_WUXING: Record<string, WuxingElement> = {
  // ─── 木 (Wood) — 70+ characters ─────────────────────────────────
  // Trees & plants
  '林': '木', '森': '木', '树': '木', '木': '木', '花': '木', '草': '木',
  '芳': '木', '芝': '木', '兰': '木', '梅': '木', '桃': '木', '柳': '木',
  '松': '木', '柏': '木', '桐': '木', '桂': '木', '枫': '木', '枝': '木',
  '叶': '木', '根': '木', '芽': '木', '苗': '木', '荣': '木', '华': '木',
  '蕊': '木', '蕾': '木', '荷': '木', '莲': '木', '菊': '木', '薇': '木',
  '蓉': '木', '芹': '木', '茗': '木', '茜': '木', '菱': '木', '蕙': '木',
  '萍': '木', '藤': '木', '竹': '木', '筠': '木', '筱': '木', '翠': '木',
  // Growth & vitality
  '春': '木', '生': '木', '茂': '木', '繁': '木', '郁': '木', '苍': '木',
  '蔚': '木', '蓁': '木', '葳': '木', '蕤': '木', '栋': '木', '梁': '木',
  '材': '木', '楠': '木', '榕': '木', '槐': '木', '榆': '木', '樟': '木',
  '杉': '木', '桢': '木', '柯': '木', '柔': '木', '柱': '木', '桥': '木',
  // Flowers & herbs (continued)
  '茹': '木', '莉': '木', '莎': '木', '莹': '木', '莺': '木', '菀': '木',
  '菁': '木', '菘': '木', '菡': '木', '萝': '木', '萱': '木', '萌': '木',
  '萸': '木', '蔓': '木', '蕴': '木', '薪': '木', '筝': '木',
  '箫': '木', '简': '木', '策': '木', '笙': '木', '笠': '木', '笛': '木',
  // Wood-related qualities
  '青': '木', '碧': '木', '东': '木', '甲': '木', '乙': '木', '寅': '木',
  '卯': '木', '仁': '木', '英': '木', '秀': '木', '颖': '木', '聪': '木',

  // ─── 火 (Fire) — 70+ characters ─────────────────────────────────
  // Fire & flame
  '火': '火', '炎': '火', '焱': '火', '焰': '火', '焚': '火', '燃': '火',
  '灿': '火', '烂': '火', '炜': '火', '炫': '火', '烽': '火', '烨': '火',
  '熙': '火', '熹': '火', '煌': '火', '煜': '火', '炯': '火', '焕': '火',
  '炳': '火', '烁': '火', '熠': '火', '炽': '火', '炼': '火', '烜': '火',
  '炀': '火', '烊': '火', '烘': '火', '烤': '火', '烙': '火', '焙': '火',
  '煮': '火', '熬': '火', '熏': '火', '熨': '火', '燎': '火', '燠': '火',
  '燧': '火', '燮': '火', '烺': '火', '焓': '火', '焘': '火', '煊': '火',
  // Sun & light
  '日': '火', '明': '火', '亮': '火', '光': '火', '辉': '火', '耀': '火',
  '晖': '火', '晨': '火', '旭': '火', '昕': '火', '昊': '火', '昱': '火',
  '晗': '火', '晟': '火', '晔': '火', '晴': '火', '暖': '火', '暄': '火',
  '曜': '火', '曦': '火', '昭': '火', '映': '火', '晓': '火', '晶': '火',
  // Red & bright colors
  '丹': '火', '赤': '火', '红': '火', '朱': '火', '彤': '火', '绛': '火',
  // Fire-related qualities
  '夏': '火', '南': '火', '丙': '火', '丁': '火', '巳': '火', '午': '火',
  '礼': '火', '烈': '火', '猛': '火', '刚': '火', '勇': '火', '武': '火',
  '威': '火', '毅': '火', '震': '火', '阳': '火', '彰': '火', '彩': '火',

  // ─── 土 (Earth) — 70+ characters ────────────────────────────────
  // Earth & land
  '土': '土', '地': '土', '山': '土', '岩': '土', '峰': '土', '岭': '土',
  '岳': '土', '崇': '土', '嵬': '土', '嵩': '土', '峦': '土', '崖': '土',
  '崛': '土', '崧': '土', '巅': '土', '岚': '土', '岛': '土', '岱': '土',
  '岷': '土', '峭': '土', '崎': '土', '峻': '土', '丘': '土', '陵': '土',
  '谷': '土', '川': '土', '坪': '土', '坦': '土', '垣': '土', '城': '土',
  '堡': '土', '堤': '土', '堪': '土', '塑': '土', '塔': '土', '境': '土',
  '墉': '土', '增': '土', '壁': '土', '壤': '土', '坊': '土', '坚': '土',
  // Earth-related structures
  '均': '土', '坤': '土', '培': '土', '基': '土', '堂': '土', '填': '土',
  '墅': '土', '场': '土', '垒': '土', '垠': '土', '埴': '土', '埏': '土',
  '塾': '土', '墈': '土', '墩': '土', '壕': '土', '壑': '土',
  // Earth qualities: stability, trust, center
  '戊': '土', '己': '土', '丑': '土', '辰': '土', '未': '土', '戌': '土',
  '中': '土', '黄': '土', '褐': '土', '信': '土', '诚': '土', '忠': '土',
  '厚': '土', '德': '土', '恩': '土', '惠': '土', '义': '土', '让': '土',
  '谦': '土', '逊': '土', '容': '土', '宽': '土', '广': '土', '博': '土',
  '伟': '土', '宏': '土', '巨': '土', '大': '土', '丰': '土', '盛': '土',
  '昌': '土', '隆': '土', '兴': '土', '泰': '土', '安': '土', '宁': '土',
  '定': '土', '静': '土', '平': '土', '稳': '土', '固': '土',

  // ─── 金 (Metal) — 70+ characters ────────────────────────────────
  // Metals
  '金': '金', '银': '金', '铁': '金', '钢': '金', '铜': '金', '铝': '金',
  '锡': '金', '铅': '金', '铸': '金', '锻': '金', '铃': '金', '铭': '金',
  '铮': '金', '链': '金', '锋': '金', '锐': '金', '锦': '金', '键': '金',
  '镇': '金', '镜': '金', '钏': '金', '钗': '金', '钧': '金', '钦': '金',
  '钰': '金', '钱': '金', '铂': '金', '铎': '金', '铖': '金', '铠': '金',
  '铨': '金', '铿': '金', '锵': '金', '铄': '金', '锬': '金', '锭': '金',
  '锰': '金', '锲': '金', '锴': '金',
  '镁': '金', '镂': '金', '镖': '金', '镗': '金', '镛': '金', '镝': '金',
  '镞': '金', '镡': '金', '镧': '金', '镨': '金', '镩': '金', '镫': '金',
  '镬': '金', '镭': '金', '镯': '金', '镰': '金', '镶': '金', '铢': '金',
  // Weapons & sharp objects
  '剑': '金', '刀': '金', '刃': '金', '划': '金', '创': '金', '刑': '金',
  '利': '金', '刻': '金', '刹': '金', '刺': '金', '削': '金', '剔': '金',
  '剖': '金', '剪': '金', '割': '金', '劈': '金', '戈': '金', '矛': '金',
  // Metal qualities
  '庚': '金', '辛': '金', '申': '金', '酉': '金', '秋': '金', '西': '金',
  '白': '金', '素': '金', '断': '金', '决': '金',
  '果': '金', '裁': '金', '制': '金', '肃': '金', '敛': '金',
  '玫': '金', '瑰': '金', '珠': '金', '珍': '金', '宝': '金', '琼': '金',

  // ─── 水 (Water) — 70+ characters ────────────────────────────────
  // Water bodies & flow
  '水': '水', '冰': '水', '泉': '水', '流': '水', '河': '水', '江': '水',
  '海': '水', '洋': '水', '波': '水', '浪': '水', '潮': '水', '涛': '水',
  '溪': '水', '源': '水', '渊': '水', '淼': '水', '湘': '水', '沁': '水',
  '淳': '水', '澄': '水', '澈': '水', '漾': '水', '潇': '水', '澜': '水',
  '浅': '水', '深': '水', '清': '水', '洁': '水', '净': '水', '洗': '水',
  '浴': '水', '泡': '水', '沫': '水', '泪': '水', '汗': '水', '汁': '水',
  '池': '水', '湖': '水', '泊': '水', '湾': '水', '港': '水', '滩': '水',
  // More water characters
  '泽': '水', '润': '水', '涵': '水', '淑': '水', '淇': '水', '淞': '水',
  '添': '水', '渡': '水', '渤': '水', '游': '水', '渺': '水', '滨': '水',
  '满': '水', '滢': '水', '滔': '水', '滚': '水', '漫': '水', '演': '水',
  '澎': '水', '灌': '水', '泣': '水', '泌': '水', '泅': '水', '泠': '水',
  '泾': '水', '洇': '水', '洲': '水', '浔': '水', '浸': '水', '涅': '水',
  '涤': '水', '涧': '水', '涠': '水', '涣': '水', '涪': '水', '涯': '水',
  '淋': '水', '淘': '水', '淡': '水', '淤': '水', '淬': '水', '淮': '水',
  '混': '水', '淹': '水', '渐': '水', '渔': '水', '渗': '水', '温': '水',
  // Water qualities
  '壬': '水', '癸': '水', '子': '水', '亥': '水', '冬': '水', '北': '水',
  '黑': '水', '玄': '水', '智': '水', '慧': '水', '敏': '水',
  '灵': '水', '妙': '水', '微': '水', '幽': '水', '悠': '水', '远': '水',
  '虚': '水', '幻': '水', '梦': '水', '云': '水', '雾': '水', '露': '水', '霜': '水',
  '雪': '水', '雨': '水', '雷': '水',
};

// ═══════════════════════════════════════════════════════════════════════
// Character commonality scores (for memorability / acceptance calc)
// Higher value = more common / readable
// Range: 1-10
// ═══════════════════════════════════════════════════════════════════════

const CHAR_COMMONALITY: Record<string, number> = {
  // Very common (8-10): top 500 most frequent Chinese characters
  '的': 10, '一': 10, '是': 10, '了': 10, '不': 10, '人': 10, '我': 10,
  '在': 10, '有': 10, '他': 10, '这': 10, '中': 10, '大': 10, '来': 10,
  '上': 10, '国': 10, '个': 10, '到': 10, '说': 10, '们': 10, '为': 10,
  '子': 10, '和': 10, '你': 10, '地': 10, '出': 10, '道': 10, '也': 10,
  '时': 10, '年': 10, '得': 10, '就': 10, '那': 10, '要': 10, '下': 10,
  '看': 10, '生': 10, '会': 10, '着': 10, '发': 10, '多': 10, '过': 10,
  '后': 10, '能': 10, '对': 10, '么': 10, '心': 10, '前': 10, '所': 10,
  '天': 9, '又': 9, '如': 9, '方': 9, '行': 9, '知': 9,
  '三': 9, '经': 9, '电': 9, '开': 9, '手': 9, '情': 9, '最': 9, '理': 9,
  '家': 9, '法': 9, '本': 9, '动': 9, '已': 9, '长': 9, '从': 9, '与': 9,

  // Common (6-7): frequently used in names and writing
  '云': 7, '风': 7, '雨': 7, '雪': 7, '花': 7, '月': 7, '星': 7, '海': 7,
  '山': 7, '水': 7, '林': 7, '木': 7, '金': 7, '银': 7, '玉': 7, '宝': 7,
  '龙': 7, '凤': 7, '春': 7, '夏': 7, '秋': 7, '冬': 7, '东': 7, '南': 7,
  '西': 7, '北': 7, '红': 7, '白': 7, '青': 7, '黑': 7, '紫': 7, '黄': 7,
  '兰': 7, '菊': 7, '竹': 7, '梅': 7, '松': 7, '柏': 7, '柳': 7, '桃': 7,
  '光': 7, '亮': 7, '辉': 7, '耀': 7, '阳': 7, '晨': 7, '旭': 7,
  '华': 8, '荣': 7, '茂': 7, '英': 7, '秀': 7, '丽': 7, '美': 8, '佳': 7,
  '文': 8, '武': 7, '博': 7, '伟': 8, '强': 8, '刚': 7, '勇': 7, '毅': 7,
  '宁': 7, '静': 7, '瑞': 7, '祥': 7, '福': 7,
  '德': 7, '恩': 7, '惠': 7, '仁': 7, '义': 7, '礼': 7, '智': 7, '信': 7,
  '诚': 7, '忠': 7, '厚': 7, '谦': 6, '容': 7, '宽': 7, '广': 7, '宏': 6,
  '浩': 6, '瀚': 5, '澜': 5, '清': 7, '洁': 7, '净': 6, '润': 6, '泽': 6,
  '涵': 6, '淑': 6, '淳': 5, '澄': 5, '澈': 5, '潇': 5, '波': 7, '涛': 6,

  // Moderately common (4-5): used but less frequent
  '煜': 4, '烨': 4, '炜': 4, '烁': 4, '焕': 4, '炳': 3, '炽': 3, '焱': 3,
  '焰': 4, '烽': 3, '熹': 3, '煌': 4, '炯': 4, '炫': 4, '灿': 5,
  '锋': 5, '锐': 5, '锦': 5, '铭': 5, '钰': 4, '钧': 4, '钦': 5,
  '铮': 4, '铠': 3, '铎': 3, '铖': 2, '铿': 3,
  '蕾': 5, '蕊': 4, '薇': 5, '蓉': 5, '荷': 5, '莲': 5, '菱': 4,
  '萱': 5, '萌': 6, '蔓': 4, '蕴': 4, '蕙': 3, '茜': 4, '茗': 4,
  '筠': 3, '筱': 3, '笙': 4, '箫': 3, '筝': 4,
  '峰': 6, '岭': 5, '岳': 5, '崇': 5, '嵩': 4, '峻': 5, '峭': 3,
  '崖': 4, '峦': 4, '岚': 5, '岱': 3, '崎': 4, '丘': 5, '陵': 5,
  '壁': 5, '城': 7, '塔': 6, '堂': 6, '基': 6, '坤': 5, '垣': 3,
  '剑': 6, '刀': 7, '刃': 5, '戈': 4, '矛': 4, '利': 7,
  '珠': 6, '珍': 6, '琼': 5, '瑰': 4, '玫': 5,

  // Rare (1-3): uncommon characters
  '焓': 1, '烺': 1, '燮': 2, '燧': 2, '燠': 1,
  '锬': 1, '锭': 3, '锲': 2, '锴': 2, '镁': 3, '镂': 2, '镛': 2,
  '镝': 2, '镞': 1, '镡': 1, '镧': 1, '镨': 1, '镬': 1, '镭': 2,
  '蓁': 2, '葳': 2, '蕤': 1, '桢': 2, '菀': 2, '菘': 2,
  '洇': 2, '浔': 2, '涅': 2, '涤': 2, '涠': 1, '涣': 3,
  '涪': 2, '淞': 3, '滢': 2, '泌': 3, '泅': 1, '泠': 2,
  '埴': 1, '埏': 1, '墈': 1, '壑': 2, '嵬': 2,
};

// ═══════════════════════════════════════════════════════════════════════
// Platform factors (deterministic multipliers for influencer scoring)
// ═══════════════════════════════════════════════════════════════════════

const PLATFORM_FACTORS: Record<string, number> = {
  'douyin': 1.20,
  '抖音': 1.20,
  'tiktok': 1.18,
  '小红书': 1.10,
  'xiaohongshu': 1.10,
  'red': 1.10,
  '微博': 1.05,
  'weibo': 1.05,
  'wechat': 1.00,
  '微信': 1.00,
  'bilibili': 1.08,
  '哔哩哔哩': 1.08,
  'B站': 1.08,
  '快手': 1.12,
  'kuaishou': 1.12,
  'ins': 1.06,
  'instagram': 1.06,
  'twitter': 1.04,
  '推特': 1.04,
  'X': 1.04,
  'qq': 0.95,
  'QQ': 0.95,
  '知乎': 0.98,
  'zhihu': 0.98,
  '豆瓣': 0.96,
  'douban': 0.96,
  'telegram': 1.02,
  'youtube': 1.07,
  '油管': 1.07,
};

// ═══════════════════════════════════════════════════════════════════════
// Helper functions
// ═══════════════════════════════════════════════════════════════════════

/**
 * Deterministic hash for a string — always returns the same number for the same string.
 * Uses a simple polynomial rolling hash (djb2 variant).
 */
function deterministicHash(str: string, seed: number = 5381): number {
  let h = seed;
  for (let i = 0; i < str.length; i++) {
    // djb2: h * 33 + charCode
    h = ((h << 5) + h + str.charCodeAt(i)) & 0x7FFFFFFF; // keep positive 31-bit
  }
  return h;
}

/**
 * Get wuxing element for a character.
 * Falls back to a deterministic assignment based on char code if not in the mapping.
 */
function getCharWuxing(ch: string): WuxingElement {
  if (CHAR_WUXING[ch]) return CHAR_WUXING[ch];
  // Deterministic fallback: use char code modulo 5
  const code = ch.charCodeAt(0);
  const idx = code % 5;
  return ALL_ELEMENTS[idx];
}

/**
 * Get a deterministic "stroke count" for a character.
 * Uses a hash-based approach since we don't have a full stroke database.
 * Returns a value in range [1, 30] to simulate realistic stroke counts.
 */
function getDeterministicStrokes(ch: string): number {
  const h = deterministicHash(ch, 0x9E3779B9); // golden ratio hash seed
  return (h % 30) + 1;
}

/**
 * Get commonality score for a character (1-10).
 * Falls back to a deterministic score based on char code.
 */
function getCharCommonality(ch: string): number {
  if (CHAR_COMMONALITY[ch] !== undefined) return CHAR_COMMONALITY[ch];
  // Deterministic fallback: range 3-6 based on hash
  const h = deterministicHash(ch, 0x12345);
  return (h % 4) + 3;
}

/**
 * Clamp a number to [min, max]
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ═══════════════════════════════════════════════════════════════════════
// Pattern (格局) determination
// ═══════════════════════════════════════════════════════════════════════

/** 十神 mapping relative to Day Master */
type ShiShen = '比肩' | '劫财' | '食神' | '伤官' | '偏财' | '正财' | '七杀' | '正官' | '偏印' | '正印';

/**
 * Determine the ShiShen (十神) relationship between Day Master and another element.
 * Based on the Tiangan of the Day Master and the Tiangan of the compared pillar.
 */
function getShiShen(dayMasterTG: string, otherTG: string): ShiShen {
  const tgOrder = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  const dmIdx = tgOrder.indexOf(dayMasterTG);
  const otIdx = tgOrder.indexOf(otherTG);

  if (dmIdx === -1 || otIdx === -1) return '比肩'; // fallback

  // Same element, same yin/yang → 比肩
  // Same element, diff yin/yang → 劫财
  const dmElementIdx = Math.floor(dmIdx / 2); // 0=木,1=火,2=土,3=金,4=水
  const otElementIdx = Math.floor(otIdx / 2);
  const dmYinYang = dmIdx % 2; // 0=yang, 1=yin
  const otYinYang = otIdx % 2;
  const samePolarity = dmYinYang === otYinYang;

  if (dmElementIdx === otElementIdx) {
    return samePolarity ? '比肩' : '劫财';
  }

  // Calculate the generating/overcoming relationship
  // Element order: 0=木,1=火,2=土,3=金,4=水
  // Generation: 0→1→2→3→4→0
  // Overcoming: 0→2→4→1→3→0

  const isGenerating = (dmElementIdx + 1) % 5 === otElementIdx; // 我生
  const isOvercoming = (dmElementIdx + 2) % 5 === otElementIdx; // 我克
  const isGeneratedBy = (otElementIdx + 1) % 5 === dmElementIdx; // 生我
  const isOvercomeBy = (otElementIdx + 2) % 5 === dmElementIdx; // 克我

  if (isGenerating) {
    return samePolarity ? '食神' : '伤官';
  }
  if (isOvercoming) {
    return samePolarity ? '偏财' : '正财';
  }
  if (isOvercomeBy) {
    return samePolarity ? '七杀' : '正官';
  }
  if (isGeneratedBy) {
    return samePolarity ? '偏印' : '正印';
  }

  return '比肩'; // fallback
}

/**
 * Determine the pattern (格局) based on the bazi pillars.
 * Uses the month branch's hidden stem relationship to Day Master.
 */
function determinePattern(
  dayMasterTG: string,
  monthTG: string,
  pillars: BaziPillar[],
  strength: '身强' | '身弱'
): string {
  const monthShiShen = getShiShen(dayMasterTG, monthTG);

  // Pattern based on month's ShiShen and strength
  if (strength === '身强') {
    switch (monthShiShen) {
      case '食神': return '食神生财格';
      case '伤官': return '伤官配印格';
      case '偏财': return '偏财格';
      case '正财': return '正财格';
      case '七杀': return '食伤制杀格';
      case '正官': return '官印相生格';
      case '比肩': return '建禄格';
      case '劫财': return '羊刃格';
      case '偏印': return '偏印格';
      case '正印': return '正印格';
    }
  } else {
    switch (monthShiShen) {
      case '食神': return '食神泄秀格';
      case '伤官': return '伤官见官格';
      case '偏财': return '财多身弱格';
      case '正财': return '财滋弱杀格';
      case '七杀': return '杀重身轻格';
      case '正官': return '官杀混杂格';
      case '比肩': return '比劫帮身格';
      case '劫财': return '劫财扶身格';
      case '偏印': return '偏印夺食格';
      case '正印': return '印绶护身格';
    }
  }

  return '正格';
}

// ═══════════════════════════════════════════════════════════════════════
// Core: parseBaziBrief
// ═══════════════════════════════════════════════════════════════════════

/**
 * Parse a bazi brief string like "甲子年 丙寅月 戊午日 庚申时"
 * to extract Tiangan/Dizhi and determine Day Master, strength, favorable/unfavorable elements, pattern.
 */
export function parseBaziBrief(baziBrief: string): ParsedBazi {
  // Extract pillars from the string
  // Accept formats: "甲子年 丙寅月 戊午日 庚申时" or "甲子 丙寅 戊午 庚申"
  const pillarPattern = /([甲乙丙丁戊己庚辛壬癸])([子丑寅卯辰巳午未申酉戌亥])/g;
  const matches: string[][] = [];

  let match: RegExpExecArray | null;
  while ((match = pillarPattern.exec(baziBrief)) !== null) {
    matches.push([match[1], match[2]]); // [tiangan, dizhi]
  }

  // Default pillars if parsing fails
  const defaultPillars: [string, string][] = [
    ['甲', '子'], ['丙', '寅'], ['戊', '午'], ['庚', '申'],
  ];

  const pillarData: [string, string][] = matches.length >= 4
    ? matches.slice(0, 4) as [string, string][]
    : defaultPillars;

  const makePillar = (tg: string, dz: string): BaziPillar => ({
    tiangan: tg,
    dizhi: dz,
    tgElement: TIANGAN_WUXING[tg] || '木',
    dzElement: DIZHI_WUXING[dz] || '水',
  });

  const year = makePillar(pillarData[0][0], pillarData[0][1]);
  const month = makePillar(pillarData[1][0], pillarData[1][1]);
  const day = makePillar(pillarData[2][0], pillarData[2][1]);
  const hour = makePillar(pillarData[3][0], pillarData[3][1]);

  // Day Master = Day pillar's Tiangan element
  const dayMaster = day.tgElement;

  // Determine strength by counting supporting vs opposing elements
  const allElements: WuxingElement[] = [
    year.tgElement, year.dzElement,
    month.tgElement, month.dzElement,
    day.tgElement, day.dzElement,
    hour.tgElement, hour.dzElement,
  ];

  // Same as Day Master (同我/比劫) or generates Day Master (生我/印星) = supporting
  const generatesMe = whatGeneratesMe(dayMaster);
  let supportingCount = 0;
  let opposingCount = 0;

  for (const el of allElements) {
    if (el === dayMaster || el === generatesMe) {
      supportingCount++;
    } else {
      opposingCount++;
    }
  }

  const strength: '身强' | '身弱' = supportingCount > opposingCount ? '身强' : '身弱';

  // Determine favorable and unfavorable elements
  let favorable: WuxingElement[];
  let unfavorable: WuxingElement[];

  if (strength === '身强') {
    // 身强: favor elements that weaken/consume the Day Master
    // 我生 (食伤) and 我克 (财星)
    favorable = [GENERATES[dayMaster], OVERCOMES[dayMaster]];
    // 忌神: 生我 (印星) and 同我 (比劫)
    unfavorable = [generatesMe, dayMaster];
  } else {
    // 身弱: favor elements that strengthen the Day Master
    // 生我 (印星) and 同我 (比劫)
    favorable = [generatesMe, dayMaster];
    // 忌神: 我生 (食伤) and 我克 (财星) and 克我 (官杀)
    unfavorable = [GENERATES[dayMaster], OVERCOMES[dayMaster]];
  }

  // Determine pattern
  const pattern = determinePattern(day.tiangan, month.tiangan, [year, month, day, hour], strength);

  return {
    year,
    month,
    day,
    hour,
    dayMaster,
    strength,
    favorable,
    unfavorable,
    pattern,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// Core: calculateDeterministicScores
// ═══════════════════════════════════════════════════════════════════════

/**
 * Calculate deterministic scores for a name given a bazi brief.
 * Same name + same bazi = identical scores every time.
 * NO randomness. Purely algorithmic.
 *
 * @param name - The name to score
 * @param baziBrief - Bazi string like "甲子年 丙寅月 戊午日 庚申时"
 * @param platform - Optional platform string for influencer scoring
 * @returns DeterministicScores with four dimensions
 */
export function calculateDeterministicScores(
  name: string,
  baziBrief: string,
  platform?: string,
): DeterministicScores {
  const parsed = parseBaziBrief(baziBrief);

  // ─── 1. yiXueScore (Bazi compatibility) ─────────────────────────
  // Weight: 五行匹配度(40%) + 格局协调(30%) + 笔画数理(30%)

  // 1a. 五行匹配度: How many name characters' wuxing match favorable elements
  const nameChars = Array.from(name); // handle Unicode properly
  let favorableMatchCount = 0;
  let unfavorableMatchCount = 0;

  for (const ch of nameChars) {
    const charWuxing = getCharWuxing(ch);
    if (parsed.favorable.includes(charWuxing)) {
      favorableMatchCount++;
    }
    if (parsed.unfavorable.includes(charWuxing)) {
      unfavorableMatchCount++;
    }
  }

  const totalChars = Math.max(nameChars.length, 1);
  const favorableRatio = favorableMatchCount / totalChars;
  const unfavorableRatio = unfavorableMatchCount / totalChars;
  const wuxingMatchScore = clamp(
    50 + (favorableRatio * 50) - (unfavorableRatio * 30),
    0,
    100,
  );

  // 1b. 格局协调: Whether name elements coordinate with the pattern
  // Check if the name's overall element distribution supports the pattern's needs
  const nameElements: WuxingElement[] = nameChars.map((ch) => getCharWuxing(ch));
  const elementCounts: Record<string, number> = {};
  for (const el of nameElements) {
    elementCounts[el] = (elementCounts[el] || 0) + 1;
  }

  // Pattern coordination: count how many favorable elements appear in name
  let patternCoordScore = 40; // base
  for (const el of nameElements) {
    if (parsed.favorable.includes(el)) {
      patternCoordScore += 15;
    }
    if (parsed.unfavorable.includes(el)) {
      patternCoordScore -= 10;
    }
  }

  // Bonus if name covers diverse favorable elements
  const coveredFavorable = parsed.favorable.filter(fav =>
    nameElements.some(el => el === fav)
  );
  patternCoordScore += coveredFavorable.length * 10;

  patternCoordScore = clamp(patternCoordScore, 0, 100);

  // 1c. 笔画数理: Deterministic stroke-based numerology
  // Use the total stroke count and check for auspicious numbers
  const strokeCounts = nameChars.map(ch => getDeterministicStrokes(ch));
  const totalStrokes = strokeCounts.reduce((a, b) => a + b, 0);

  // Auspicious total stroke ranges (traditional naming numerology)
  const auspiciousRanges = [
    [11, 15], [21, 25], [31, 35], [41, 45],
  ];
  let strokeScore = 40; // base
  for (const [lo, hi] of auspiciousRanges) {
    if (totalStrokes >= lo && totalStrokes <= hi) {
      strokeScore += 25;
      break;
    }
  }

  // Bonus for even distribution of strokes among characters
  if (strokeCounts.length > 1) {
    const avg = totalStrokes / strokeCounts.length;
    const variance = strokeCounts.reduce((sum, s) => sum + Math.abs(s - avg), 0) / strokeCounts.length;
    if (variance < 3) strokeScore += 15; // balanced strokes
    else if (variance < 6) strokeScore += 8;
  }

  // Bonus/penalty based on stroke hash harmony
  const strokeHash = deterministicHash(strokeCounts.join(','), 0xABCD);
  strokeScore += (strokeHash % 11) - 5; // -5 to +5

  strokeScore = clamp(strokeScore, 0, 100);

  // Final yiXueScore
  const yiXueScore = clamp(
    wuxingMatchScore * 0.4 + patternCoordScore * 0.3 + strokeScore * 0.3,
    0,
    100,
  );

  // ─── 2. influencerLevel (viral/spread potential) ────────────────
  // Based on platform factor + name memorability + character uniqueness

  // 2a. Platform factor
  const normalizedPlatform = (platform || '').toLowerCase().trim();
  let platformFactor = 1.0;
  if (normalizedPlatform && PLATFORM_FACTORS[normalizedPlatform]) {
    platformFactor = PLATFORM_FACTORS[normalizedPlatform];
  } else if (normalizedPlatform) {
    // Unknown platform: use a deterministic hash-based factor (0.90 - 1.10)
    const hashFactor = deterministicHash(normalizedPlatform, 0x5AFE) % 21;
    platformFactor = 0.90 + (hashFactor / 100);
  }

  // 2b. Name memorability based on character uniqueness
  // Characters that are uncommon tend to be more memorable in certain contexts
  let memorabilityScore = 40;
  for (const ch of nameChars) {
    const common = getCharCommonality(ch);
    // Moderately common (5-7) is ideal for memorability
    if (common >= 5 && common <= 7) memorabilityScore += 5;
    else if (common >= 3 && common <= 8) memorabilityScore += 3;
    else memorabilityScore -= 2;
  }

  // 2c. Name length effect
  // 2-4 characters optimal for social media
  const nameLen = nameChars.length;
  let lengthBonus = 0;
  if (nameLen === 2) lengthBonus = 10;
  else if (nameLen === 3) lengthBonus = 8;
  else if (nameLen === 4) lengthBonus = 5;
  else if (nameLen === 1) lengthBonus = 3;
  else lengthBonus = -5; // too long

  memorabilityScore += lengthBonus;

  // 2d. Character visual distinctiveness (deterministic)
  // More visually distinct chars = more memorable
  const charCodes = nameChars.map(ch => ch.charCodeAt(0));
  const uniqueCodeRanges = new Set(
    charCodes.map(code => Math.floor(code / 0x100)) // group by Unicode block
  );
  memorabilityScore += Math.min(uniqueCodeRanges.size * 2, 6);

  memorabilityScore = clamp(memorabilityScore, 0, 100);

  // Final influencerLevel
  const influencerLevel = clamp(
    Math.round(memorabilityScore * platformFactor),
    0,
    100,
  );

  // ─── 3. acceptanceLevel (popularity/appeal) ─────────────────────
  // Based on name readability, common vs rare characters, and bazi harmony

  // 3a. Readability: average commonality of characters
  let readabilityScore = 0;
  for (const ch of nameChars) {
    readabilityScore += getCharCommonality(ch);
  }
  readabilityScore = (readabilityScore / totalChars) * 10; // scale to 0-100

  // 3b. Bazi harmony: how well the name resonates with the bazi
  let baziHarmonyScore = 50;
  for (const ch of nameChars) {
    const charWuxing = getCharWuxing(ch);
    if (parsed.favorable.includes(charWuxing)) {
      baziHarmonyScore += 12;
    } else if (parsed.unfavorable.includes(charWuxing)) {
      baziHarmonyScore -= 8;
    } else {
      // Neutral element - small bonus for balance
      baziHarmonyScore += 3;
    }
  }

  // 3c. Aesthetic appeal: based on stroke balance and name structure
  let aestheticScore = 55;
  if (strokeCounts.length > 1) {
    const maxStroke = Math.max(...strokeCounts);
    const minStroke = Math.min(...strokeCounts);
    const range = maxStroke - minStroke;
    // Small range = balanced = aesthetic
    if (range <= 3) aestheticScore += 20;
    else if (range <= 6) aestheticScore += 12;
    else if (range <= 10) aestheticScore += 5;
    else aestheticScore -= 5;
  }

  // Name structure: some patterns are more aesthetically pleasing
  const nameHash = deterministicHash(name, 0xFACE);
  aestheticScore += (nameHash % 11) - 5; // -5 to +5 deterministic variation

  aestheticScore = clamp(aestheticScore, 0, 100);
  baziHarmonyScore = clamp(baziHarmonyScore, 0, 100);

  // Final acceptanceLevel
  const acceptanceLevel = clamp(
    readabilityScore * 0.35 + baziHarmonyScore * 0.35 + aestheticScore * 0.30,
    0,
    100,
  );

  // ─── 4. overallScore (weighted combination) ─────────────────────
  const overallScore = clamp(
    yiXueScore * 0.4 + influencerLevel * 0.3 + acceptanceLevel * 0.3,
    0,
    100,
  );

  return {
    yiXueScore: Math.round(yiXueScore),
    influencerLevel: Math.round(influencerLevel),
    acceptanceLevel: Math.round(acceptanceLevel),
    overallScore: Math.round(overallScore),
  };
}

// ═══════════════════════════════════════════════════════════════════════
// Core: buildBaziContext
// ═══════════════════════════════════════════════════════════════════════

/** Tiangan to element+name label mapping for display */
const TIANGAN_LABELS: Record<string, string> = {
  '甲': '甲木', '乙': '乙木', '丙': '丙火', '丁': '丁火',
  '戊': '戊土', '己': '己土', '庚': '庚金', '辛': '辛金',
  '壬': '壬水', '癸': '癸水',
};

/**
 * Build a bazi context object for LLM narrative generation.
 * Returns structured information about the Day Master, pattern, favorable/unfavorable elements.
 */
export function buildBaziContext(baziBrief: string): BaziContext {
  const parsed = parseBaziBrief(baziBrief);

  const dayMasterLabel = TIANGAN_LABELS[parsed.day.tiangan] || `${parsed.day.tiangan}${parsed.dayMaster}`;

  return {
    dayMaster: dayMasterLabel,
    pattern: parsed.pattern,
    favorable: parsed.favorable,
    unfavorable: parsed.unfavorable,
    strength: parsed.strength,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// Utility exports
// ═══════════════════════════════════════════════════════════════════════

/**
 * Get the wuxing element for a single character.
 * Public API for external use.
 */
export function getCharacterWuxing(ch: string): WuxingElement {
  return getCharWuxing(ch);
}

/**
 * Get all name characters' wuxing elements.
 */
export function getNameWuxing(name: string): WuxingElement[] {
  return Array.from(name).map((ch) => getCharWuxing(ch));
}

/**
 * Get the deterministic stroke count for a character.
 * Public API for external use.
 */
export function getCharacterStrokes(ch: string): number {
  return getDeterministicStrokes(ch);
}
