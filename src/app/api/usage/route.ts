import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fingerprint = searchParams.get('fingerprint');

    if (!fingerprint) {
      return NextResponse.json(
        { error: '缺少用户标识参数' },
        { status: 400 }
      );
    }

    const usageLimit = await db.usageLimit.findUnique({
      where: { fingerprint },
    });

    const evaluateCount = usageLimit?.evaluateCount ?? 0;
    const generateCount = usageLimit?.generateCount ?? 0;

    return NextResponse.json({
      evaluateCount,
      generateCount,
      evaluateUsed: evaluateCount >= 1,
      generateUsed: generateCount >= 1,
    });
  } catch (error) {
    console.error('Usage API error:', error);
    return NextResponse.json(
      { error: '查询使用次数异常，请稍后重试' },
      { status: 500 }
    );
  }
}
