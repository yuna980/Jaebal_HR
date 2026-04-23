import { NextResponse } from 'next/server';
import { fetchKboSchedule } from '@/lib/kboScraper';
import { checkRateLimit } from '@/lib/apiSecurity';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const rateLimit = checkRateLimit(request, 'schedule');
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { success: false, schedules: [], message: '요청이 너무 많아요. 잠시 후 다시 시도해주세요.' },
      { status: 429 }
    );
  }

  const { searchParams } = new URL(request.url);
  const rawYear = searchParams.get('year');
  const rawMonth = searchParams.get('month');
  const regularSeasonOnly = searchParams.get('regularSeasonOnly') === '1';
  const yearParam = rawYear ? Number(rawYear) : undefined;
  const monthParam = rawMonth ? Number(rawMonth) : undefined;

  if (yearParam !== undefined && (!Number.isInteger(yearParam) || yearParam < 2000 || yearParam > 2100)) {
    return NextResponse.json(
      { success: false, schedules: [], message: '잘못된 연도 값입니다.' },
      { status: 400 }
    );
  }

  if (monthParam !== undefined && (!Number.isInteger(monthParam) || monthParam < 1 || monthParam > 12)) {
    return NextResponse.json(
      { success: false, schedules: [], message: '잘못된 월 값입니다.' },
      { status: 400 }
    );
  }

  try {
    const schedules = await fetchKboSchedule(
      typeof yearParam === 'number' && Number.isFinite(yearParam) ? yearParam : undefined,
      typeof monthParam === 'number' && Number.isFinite(monthParam) ? monthParam : undefined,
      { regularSeasonOnly }
    );

    return NextResponse.json({
      success: true,
      schedules,
    });
  } catch (error) {
    console.error('KBO 일정 API 에러:', error);
    return NextResponse.json(
      { success: false, schedules: [], message: '데이터를 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
