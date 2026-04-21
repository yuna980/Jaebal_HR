import { NextResponse } from 'next/server';
import { STADIUM_WEATHER_LOCATIONS } from '@/data/stadiumWeather';

export const dynamic = 'force-dynamic';

function getTargetHour(timeText: string | null) {
  if (!timeText) return new Date().getHours();

  const [hourText] = timeText.split(':');
  const parsedHour = Number(hourText);
  return Number.isFinite(parsedHour) ? parsedHour : new Date().getHours();
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const stadium = searchParams.get('stadium');
  const time = searchParams.get('time');

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

  try {
    const weatherUrl = new URL('https://api.open-meteo.com/v1/forecast');
    weatherUrl.searchParams.set('latitude', String(location.latitude));
    weatherUrl.searchParams.set('longitude', String(location.longitude));
    weatherUrl.searchParams.set('hourly', 'temperature_2m,precipitation_probability');
    weatherUrl.searchParams.set('forecast_days', '2');
    weatherUrl.searchParams.set('timezone', 'Asia/Seoul');

    const response = await fetch(weatherUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`날씨 API 오류: ${response.status}`);
    }

    const data = await response.json();
    const times: string[] = data.hourly?.time ?? [];
    const temperatures: number[] = data.hourly?.temperature_2m ?? [];
    const precipitationProbabilities: number[] = data.hourly?.precipitation_probability ?? [];

    const now = new Date();
    const targetHour = getTargetHour(time);
    const targetDateText = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')}`;
    const targetTimePrefix = `${targetDateText}T${String(targetHour).padStart(2, '0')}:00`;

    let index = times.findIndex((value) => value === targetTimePrefix);
    if (index < 0) {
      index = times.findIndex((value) => value.startsWith(targetDateText));
    }

    if (index < 0) {
      return NextResponse.json(
        { success: false, message: '날씨 예보를 찾지 못했습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      stadium,
      forecastTime: times[index],
      temperature: temperatures[index] ?? null,
      precipitationProbability: precipitationProbabilities[index] ?? null,
    });
  } catch (error) {
    console.error('날씨 API 에러:', error);
    return NextResponse.json(
      { success: false, message: '날씨 정보를 가져오지 못했어요.' },
      { status: 500 }
    );
  }
}
