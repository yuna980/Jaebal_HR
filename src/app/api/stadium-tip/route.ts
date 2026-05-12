import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

const CACHE_CONTROL = 'public, s-maxage=21600, stale-while-revalidate=86400';

type StadiumRow = {
  stadium_name: string;
  public_transport_directions: string;
};

type FoodRow = {
  vendor_name: string;
  main_menu: string;
  is_best: boolean;
  display_order: number;
};

const STADIUM_ALIASES: Record<string, string> = {
  잠실: '잠실야구장',
  문학: 'SSG랜더스필드',
  사직: '사직야구장',
  고척: '고척스카이돔',
  대전: '한화생명볼파크',
  수원: 'KT위즈파크',
  대구: '삼성 라이온즈 파크',
  광주: '기아 챔피언스 필드',
  창원: '창원NC파크',
};

function normalizeStadiumName(value: string) {
  const trimmed = value.trim();
  return STADIUM_ALIASES[trimmed] ?? trimmed;
}

function summarizeTransport(value: string) {
  const firstBlock = value
    .split(/\n+/)
    .map((line) => line.trim())
    .find(Boolean);

  if (!firstBlock) return '대중교통 정보를 확인 중이에요.';
  return firstBlock.replace(/\s+/g, ' ');
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const stadiumName = normalizeStadiumName(searchParams.get('stadium') ?? '');

  if (!stadiumName) {
    return NextResponse.json({ success: false, message: '구장 정보가 없습니다.' }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return NextResponse.json({ success: false, message: 'DB 연결 정보가 없습니다.' }, { status: 500 });
  }

  const [{ data: stadiumRow, error: stadiumError }, { data: foodRows, error: foodError }] =
    await Promise.all([
      supabase
        .from('stadiums')
        .select('stadium_name, public_transport_directions')
        .eq('stadium_name', stadiumName)
        .maybeSingle(),
      supabase
        .from('stadium_food_vendors')
        .select('vendor_name, main_menu, is_best, display_order')
        .eq('stadium_name', stadiumName)
        .order('is_best', { ascending: false })
        .order('display_order', { ascending: true })
        .limit(2),
    ]);

  if (stadiumError || foodError) {
    console.error('직관 꿀팁 조회 실패:', stadiumError ?? foodError);
    return NextResponse.json({ success: false, message: '직관 꿀팁을 가져오지 못했어요.' }, { status: 500 });
  }

  const stadium = stadiumRow as StadiumRow | null;
  const foods = (foodRows ?? []) as FoodRow[];

  const response = NextResponse.json({
    success: true,
    tip: {
      stadiumName: stadium?.stadium_name ?? stadiumName,
      transport: summarizeTransport(stadium?.public_transport_directions ?? ''),
      foods: foods.map((food) => ({
        vendorName: food.vendor_name,
        mainMenu: food.main_menu,
      })),
    },
  });

  response.headers.set('Cache-Control', CACHE_CONTROL);
  return response;
}
