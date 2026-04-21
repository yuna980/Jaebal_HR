export interface StadiumWeatherLocation {
  latitude: number;
  longitude: number;
}

export const STADIUM_WEATHER_LOCATIONS: Record<string, StadiumWeatherLocation> = {
  잠실: { latitude: 37.5121, longitude: 127.0719 },
  문학: { latitude: 37.4369, longitude: 126.6933 },
  대구: { latitude: 35.8411, longitude: 128.6811 },
  사직: { latitude: 35.1940, longitude: 129.0616 },
  수원: { latitude: 37.2997, longitude: 127.0098 },
  고척: { latitude: 37.4982, longitude: 126.8671 },
  광주: { latitude: 35.1682, longitude: 126.8889 },
  대전: { latitude: 36.3171, longitude: 127.4304 },
  창원: { latitude: 35.2226, longitude: 128.5828 },
};
