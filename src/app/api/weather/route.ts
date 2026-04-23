import { NextResponse } from 'next/server';
import { STADIUM_WEATHER_LOCATIONS } from '@/data/stadiumWeather';

export const dynamic = 'force-dynamic';

interface WeatherCacheValue {
  expiresAt: number;
  data: {
    success: true;
    stadium: string;
    observedTime: string;
    temperature: number | null;
    precipitation: number | null;
    airQualityPm10: number | null;
    airQualityLabel: string | null;
  };
}

const WEATHER_CACHE_TTL_MS = 5 * 60 * 1000;
const weatherCache = new Map<string, WeatherCacheValue>();

function getAirQualityLabel(pm10: number | null) {
  if (pm10 === null) return null;
  if (pm10 <= 30) return '좋음';
  if (pm10 <= 80) return '보통';
  if (pm10 <= 150) return '나쁨';
  return '매우나쁨';
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const stadium = searchParams.get('stadium');

  if (!stadium) {
    return NextResponse.json(
      { success: false, message: '구장 정보가 없습니다.' },
      { status: 400 }
    );
  }

  const location = STADIUM_WEATHER_LOCATIONS[stadium];
  if (!location) {
    return NextResponse.json(
      { success: false, message: '날씨를 지원하지 않는 구장입니다.' },
      { status: 404 }
    );
  }

  const cacheKey = stadium;
  const cached = weatherCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.data);
  }

  try {
    const weatherUrl = new URL('https://api.open-meteo.com/v1/forecast');
    weatherUrl.searchParams.set('latitude', String(location.latitude));
    weatherUrl.searchParams.set('longitude', String(location.longitude));
    weatherUrl.searchParams.set('current', 'temperature_2m,precipitation,rain');
    weatherUrl.searchParams.set('timezone', 'Asia/Seoul');

    const airQualityUrl = new URL('https://air-quality-api.open-meteo.com/v1/air-quality');
    airQualityUrl.searchParams.set('latitude', String(location.latitude));
    airQualityUrl.searchParams.set('longitude', String(location.longitude));
    airQualityUrl.searchParams.set('hourly', 'pm10');
    airQualityUrl.searchParams.set('forecast_days', '1');
    airQualityUrl.searchParams.set('timezone', 'Asia/Seoul');

    const [weatherResponse, airQualityResponse] = await Promise.all([
      fetch(weatherUrl.toString(), {
        headers: {
          'User-Agent': 'Mozilla/5.0',
        },
        cache: 'no-store',
      }),
      fetch(airQualityUrl.toString(), {
        headers: {
          'User-Agent': 'Mozilla/5.0',
        },
        cache: 'no-store',
      }),
    ]);

    if (!weatherResponse.ok) {
      throw new Error(`날씨 API 오류: ${weatherResponse.status}`);
    }

    if (!airQualityResponse.ok) {
      throw new Error(`미세먼지 API 오류: ${airQualityResponse.status}`);
    }

    const weatherData = await weatherResponse.json();
    const airQualityData = await airQualityResponse.json();
    const current = weatherData.current;

    if (!current) {
      return NextResponse.json(
        { success: false, message: '현재 날씨 정보를 찾지 못했습니다.' },
        { status: 404 }
      );
    }

    const times: string[] = airQualityData.hourly?.time ?? [];
    const pm10Values: number[] = airQualityData.hourly?.pm10 ?? [];
    const observedTime: string = current.time ?? '';

    let index = times.findIndex((value) => value === observedTime);
    if (index < 0 && observedTime) {
      index = times.findIndex((value) => value.startsWith(observedTime.slice(0, 13)));
    }

    const airQualityPm10 = index >= 0 ? (pm10Values[index] ?? null) : null;

    const responseData = {
      success: true,
      stadium,
      observedTime,
      temperature: current.temperature_2m ?? null,
      precipitation: current.precipitation ?? current.rain ?? null,
      airQualityPm10,
      airQualityLabel: getAirQualityLabel(airQualityPm10),
    } as const;

    weatherCache.set(cacheKey, {
      expiresAt: Date.now() + WEATHER_CACHE_TTL_MS,
      data: responseData,
    });

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('날씨 API 에러:', error);
    return NextResponse.json(
      { success: false, message: '날씨 정보를 가져오지 못했어요.' },
      { status: 500 }
    );
  }
}
