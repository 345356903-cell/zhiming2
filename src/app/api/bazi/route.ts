import { NextRequest, NextResponse } from 'next/server';
import { Solar, Lunar } from 'lunar-javascript';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { birthDate, birthTime, calendarType, birthPlace } = body;

    if (!birthDate) {
      return NextResponse.json(
        { error: '请提供出生日期' },
        { status: 400 }
      );
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(birthDate)) {
      return NextResponse.json(
        { error: '日期格式错误，请使用 YYYY-MM-DD' },
        { status: 400 }
      );
    }

    // Validate calendar type
    const validCalendarTypes = ['solar', 'lunar', 'islamic'];
    const calType = calendarType || 'solar';
    if (!validCalendarTypes.includes(calType)) {
      return NextResponse.json(
        { error: '日历类型无效' },
        { status: 400 }
      );
    }

    // Parse and validate date
    const [year, month, day] = birthDate.split('-').map(Number);
    if (isNaN(year) || isNaN(month) || isNaN(day) || month < 1 || month > 12 || day < 1 || day > 31) {
      return NextResponse.json(
        { error: '日期无效' },
        { status: 400 }
      );
    }

    const time = birthTime || '12:00';
    // Validate time format if provided
    if (birthTime && !/^\d{2}:\d{2}$/.test(birthTime)) {
      return NextResponse.json(
        { error: '时间格式错误，请使用 HH:mm' },
        { status: 400 }
      );
    }

    const [hour, minute] = time.split(':').map(Number);
    if (isNaN(hour) || isNaN(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      return NextResponse.json(
        { error: '时间无效' },
        { status: 400 }
      );
    }

    let solar: Solar;
    let lunar: Lunar;

    if (calType === 'lunar') {
      // Lunar calendar input: birthDate format is YYYY-MM-DD, may have isLeap
      const [y, m, d] = birthDate.split('-').map(Number);
      const isLeap = body.isLeapMonth === true;
      lunar = Lunar.fromYmd(y, m, d, isLeap);
      solar = lunar.getSolar();
    } else if (calType === 'islamic') {
      // Islamic/Hijri calendar: approximate conversion
      // Islamic year is ~354 days, so we convert approximately
      const [iy, im, id] = birthDate.split('-').map(Number);
      // Approximate: Islamic date to Julian Day Number
      const jd = Math.floor((11 * iy + 3) / 30) + 354 * iy + 30 * im - Math.floor((im - 1) / 2) + id + 1948440 - 385;
      // Julian Day to Gregorian (approximate)
      const l = jd + 68569;
      const n = Math.floor(4 * l / 146097);
      const l2 = l - Math.floor((146097 * n + 3) / 4);
      const i = Math.floor(4000 * (l2 + 1) / 1461001);
      const l3 = l2 - Math.floor(1461 * i / 4) + 31;
      const j = Math.floor(80 * l3 / 2447);
      const day = l3 - Math.floor(2447 * j / 80);
      const l4 = Math.floor(j / 11);
      const month = j + 2 - 12 * l4;
      const year = 100 * (n - 49) + i + l4;
      solar = Solar.fromYmd(year, month, day);
      lunar = solar.getLunar();
    } else {
      // Solar/Gregorian calendar (default)
      const [y, m, d] = birthDate.split('-').map(Number);
      solar = Solar.fromYmd(y, m, d);
      lunar = solar.getLunar();
    }

    // Get Eight Characters (Bazi)
    const eightChar = lunar.getEightChar();

    const yearGan = eightChar.getYearGan();
    const yearZhi = eightChar.getYearZhi();
    const monthGan = eightChar.getMonthGan();
    const monthZhi = eightChar.getMonthZhi();
    const dayGan = eightChar.getDayGan();
    const dayZhi = eightChar.getDayZhi();
    const timeGan = eightChar.getTimeGan();
    const timeZhi = eightChar.getTimeZhi();

    const bazi = `${yearGan}${yearZhi}年${monthGan}${monthZhi}月${dayGan}${dayZhi}日${timeGan}${timeZhi}时`;
    const baziBrief = `${yearGan}${yearZhi} ${monthGan}${monthZhi} ${dayGan}${dayZhi} ${timeGan}${timeZhi}`;

    // Get Nayin (纳音)
    const yearNayin = eightChar.getYearNaYin();
    const monthNayin = eightChar.getMonthNaYin();
    const dayNayin = eightChar.getDayNaYin();
    const timeNayin = eightChar.getTimeNaYin();
    const nayin = `${yearNayin} ${monthNayin} ${dayNayin} ${timeNayin}`;

    // Get Wu Xing (五行) directly from library
    const yearWuxing = eightChar.getYearWuXing();
    const monthWuxing = eightChar.getMonthWuXing();
    const dayWuxing = eightChar.getDayWuXing();
    const timeWuxing = eightChar.getTimeWuXing();
    const wuxing = `${yearWuxing} ${monthWuxing} ${dayWuxing} ${timeWuxing}`;

    // Calculate missing elements
    const ganWuxing: Record<string, string> = { '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土', '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水' };
    const zhiWuxing: Record<string, string> = { '子': '水', '丑': '土', '寅': '木', '卯': '木', '辰': '土', '巳': '火', '午': '火', '未': '土', '申': '金', '酉': '金', '戌': '土', '亥': '水' };
    const allElements = new Set<string>();
    [yearGan, monthGan, dayGan, timeGan].forEach(g => { if (ganWuxing[g]) allElements.add(ganWuxing[g]); });
    [yearZhi, monthZhi, dayZhi, timeZhi].forEach(z => { if (zhiWuxing[z]) allElements.add(zhiWuxing[z]); });
    const fullSet = new Set(['金', '木', '水', '火', '土']);
    const missingElements = [...fullSet].filter(e => !allElements.has(e));

    // Sheng Xiao (生肖)
    const shengxiao = lunar.getYearShengXiao();

    // Xing Zuo (星座) - from solar date
    const xingzuo = solar.getXingZuo();

    // Format dates
    const solarDateStr = `${solar.getYear()}-${String(solar.getMonth()).padStart(2, '0')}-${String(solar.getDay()).padStart(2, '0')}`;
    const lunarDateStr = `${lunar.getYearInChinese()}年${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`;

    return NextResponse.json({
      success: true,
      data: {
        bazi,
        baziBrief,
        wuxing,
        nayin,
        solarDate: solarDateStr,
        lunarDate: lunarDateStr,
        shengxiao,
        xingzuo,
        missingElements,
        yearPillar: `${yearGan}${yearZhi}`,
        monthPillar: `${monthGan}${monthZhi}`,
        dayPillar: `${dayGan}${dayZhi}`,
        hourPillar: `${timeGan}${timeZhi}`,
      },
    });
  } catch (error) {
    console.error('Bazi API error:', error);
    return NextResponse.json(
      { error: '八字计算失败，请检查日期格式' },
      { status: 500 }
    );
  }
}
