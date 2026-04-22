import { NextRequest, NextResponse } from 'next/server';
import { Solar, Lunar } from 'lunar-javascript';

// WuXing (Five Elements) mapping for Gan (Heavenly Stems)
const GAN_WUXING: Record<string, string> = {
  '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土',
  '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水',
};

// WuXing mapping for Zhi (Earthly Branches)
const ZHI_WUXING: Record<string, string> = {
  '子': '水', '丑': '土', '寅': '木', '卯': '木', '辰': '土', '巳': '火',
  '午': '火', '未': '土', '申': '金', '酉': '金', '戌': '土', '亥': '水',
};

const ALL_ELEMENTS = ['金', '木', '水', '火', '土'];

// Islamic calendar approximate conversion (simplified Tabular Islamic Calendar)
function islamicToSolar(year: number, month: number, day: number): { year: number; month: number; day: number } {
  // Approximate conversion using Julian Day Number
  // Islamic epoch: July 16, 622 CE (Julian)
  const islamicEpochJD = 1948439.5;
  
  // Calculate Julian Day from Islamic date
  const n = day + Math.ceil(29.5001 * (month - 1)) + (year - 1) * 354
    + Math.floor((3 + (11 * (year - 1))) / 30);
  const jd = n + islamicEpochJD - 385;
  
  // Convert JD to Gregorian
  const z = Math.floor(jd + 0.5);
  const a = Math.floor((z - 1867216.25) / 36524.25);
  const b = z + 1 + a - Math.floor(a / 4);
  const c = b + 1524;
  const d = Math.floor((c - 122.1) / 365.25);
  const e = Math.floor(365.25 * d);
  const f = Math.floor((c - e) / 30.6001);
  
  const dayG = c - e - Math.floor(30.6001 * f);
  const monthG = f < 14 ? f - 1 : f - 13;
  const yearG = monthG > 2 ? d - 4716 : d - 4715;
  
  return { year: yearG, month: monthG, day: dayG };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { birthDate, birthTime, calendarType, birthPlace } = body;

    if (!birthDate || typeof birthDate !== 'string') {
      return NextResponse.json(
        { error: '请提供出生日期' },
        { status: 400 }
      );
    }

    const calendar = calendarType || 'solar';
    const timeParts = birthTime ? birthTime.split(':') : ['12', '0'];
    const hour = parseInt(timeParts[0]) || 12;
    const minute = parseInt(timeParts[1]) || 0;

    let solar: InstanceType<typeof Solar>;
    let lunarDateStr = '';

    if (calendar === 'lunar') {
      // birthDate format for lunar: YYYY-MM-DD or YYYY-MM-DD-L (leap month)
      const parts = birthDate.split('-');
      const lYear = parseInt(parts[0]);
      const lMonth = parseInt(parts[1]);
      const lDay = parseInt(parts[2]);
      const isLeap = parts[3] === '1';

      const lunar = Lunar.fromYmdHms(lYear, lMonth, lDay, hour, minute, 0);
      solar = lunar.getSolar();

      // Get display lunar date
      const displayLunar = Lunar.fromYmdHms(lYear, lMonth, lDay, hour, minute, 0);
      lunarDateStr = `${displayLunar.getYearInChinese()}年${isLeap ? '闰' : ''}${displayLunar.getMonthInChinese()}月${displayLunar.getDayInChinese()}`;
    } else if (calendar === 'islamic') {
      // Islamic calendar conversion (approximate)
      const parts = birthDate.split('-');
      const iYear = parseInt(parts[0]);
      const iMonth = parseInt(parts[1]);
      const iDay = parseInt(parts[2]);
      
      const gregorian = islamicToSolar(iYear, iMonth, iDay);
      solar = Solar.fromYmdHms(gregorian.year, gregorian.month, gregorian.day, hour, minute, 0);
      lunarDateStr = `伊斯兰历 ${iYear}年${iMonth}月${iDay}日 (近似转换)`;
    } else {
      // Solar calendar (default)
      const parts = birthDate.split('-');
      const sYear = parseInt(parts[0]);
      const sMonth = parseInt(parts[1]);
      const sDay = parseInt(parts[2]);

      if (!sYear || !sMonth || !sDay) {
        return NextResponse.json(
          { error: '日期格式不正确，请使用 YYYY-MM-DD' },
          { status: 400 }
        );
      }

      solar = Solar.fromYmdHms(sYear, sMonth, sDay, hour, minute, 0);
    }

    // Get Lunar and Bazi
    const lunar = solar.getLunar();
    const bazi = lunar.getEightChar();

    // If lunarDateStr wasn't set from input, compute it now
    if (!lunarDateStr || calendar === 'solar') {
      lunarDateStr = `${lunar.getYearInChinese()}年${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`;
    }

    // Calculate WuXing distribution
    const yearWx = bazi.getYearWuXing(); // e.g., "金土"
    const monthWx = bazi.getMonthWuXing();
    const dayWx = bazi.getDayWuXing();
    const timeWx = bazi.getTimeWuXing();

    // Collect all WuXing elements present
    const allWxChars = (yearWx + monthWx + dayWx + timeWx).split('');
    const presentElements = [...new Set(allWxChars.filter(c => ALL_ELEMENTS.includes(c)))];
    const missingElements = ALL_ELEMENTS.filter(e => !presentElements.includes(e));

    // Build bazi string
    const baziStr = `${bazi.getYear()}年${bazi.getMonth()}月${bazi.getDay()}日${bazi.getTime()}时`;
    const baziBrief = `${bazi.getYear()} ${bazi.getMonth()} ${bazi.getDay()} ${bazi.getTime()}`;

    // Build wuxing summary
    const wuxingStr = `${yearWx} ${monthWx} ${dayWx} ${timeWx}`;

    // Build nayin summary
    const nayinStr = `${bazi.getYearNaYin()} ${bazi.getMonthNaYin()} ${bazi.getDayNaYin()} ${bazi.getTimeNaYin()}`;

    // Get shengxiao and xingzuo
    const shengxiao = lunar.getYearShengXiao();
    const xingzuo = solar.getXingZuo();

    // Solar date string
    const solarDateStr = `${solar.getYear()}-${String(solar.getMonth()).padStart(2, '0')}-${String(solar.getDay()).padStart(2, '0')}`;

    return NextResponse.json({
      success: true,
      data: {
        bazi: baziStr,
        baziBrief,
        wuxing: wuxingStr,
        nayin: nayinStr,
        solarDate: solarDateStr,
        lunarDate: lunarDateStr,
        shengxiao,
        xingzuo,
        presentElements,
        missingElements,
        // Individual pillar details for UI display
        pillars: {
          year: { ganzhi: bazi.getYear(), gan: bazi.getYearGan(), zhi: bazi.getYearZhi(), wuxing: yearWx, nayin: bazi.getYearNaYin() },
          month: { ganzhi: bazi.getMonth(), gan: bazi.getMonthGan(), zhi: bazi.getMonthZhi(), wuxing: monthWx, nayin: bazi.getMonthNaYin() },
          day: { ganzhi: bazi.getDay(), gan: bazi.getDayGan(), zhi: bazi.getDayZhi(), wuxing: dayWx, nayin: bazi.getDayNaYin() },
          time: { ganzhi: bazi.getTime(), gan: bazi.getTimeGan(), zhi: bazi.getTimeZhi(), wuxing: timeWx, nayin: bazi.getTimeNaYin() },
        },
      },
    });
  } catch (error) {
    console.error('Bazi calculation error:', error);
    return NextResponse.json(
      { error: '八字计算异常，请检查日期格式后重试' },
      { status: 500 }
    );
  }
}
