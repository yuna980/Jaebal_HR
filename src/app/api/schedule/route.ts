import { NextResponse } from 'next/server';
import { fetchKboSchedule } from '@/lib/kboScraper';

// 이 API의 결과를 1시간(3600초) 동안 캐싱합니다.
export const revalidate = 3600;

export async function GET() {
  try {
    const schedules = await fetchKboSchedule();

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
