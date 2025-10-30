/**
 * 날씨 아이콘 통합 매핑 테이블
 *
 * 목적:
 * - 여러 날씨 API 제공자의 아이콘 코드를 OpenWeatherMap 표준으로 통합
 * - 일관된 아이콘 표시
 * - 한글 설명 제공
 *
 * 기준: OpenWeatherMap 아이콘 코드를 표준으로 사용
 * - 01d: 맑음 (낮), 01n: 맑음 (밤)
 * - d: day (낮), n: night (밤)
 */

/**
 * 날씨 아이콘 메타데이터
 */
export interface WeatherIconMetadata {
  /** OpenWeatherMap 아이콘 코드 (표준) */
  code: string;
  /** 한글 설명 */
  description_ko: string;
  /** 영문 설명 */
  description_en: string;
  /** WeatherAPI.com 대응 코드 */
  weatherapi_codes: number[];
  /** Open-Meteo WMO 대응 코드 */
  wmo_codes: number[];
}

/**
 * OpenWeatherMap 아이콘 코드 기준 통합 매핑 테이블
 *
 * 구조: Record<OpenWeatherIconCode, Metadata>
 *
 * @example
 * const metadata = WEATHER_ICON_MAP['01d'];
 * console.log(metadata.description_ko); // "맑음 (낮)"
 * console.log(metadata.wmo_codes); // [0, 1]
 */
export const WEATHER_ICON_MAP: Record<string, WeatherIconMetadata> = {
  // 맑음
  '01d': {
    code: '01d',
    description_ko: '맑음 (낮)',
    description_en: 'Clear sky (day)',
    weatherapi_codes: [1000],
    wmo_codes: [0, 1]
  },
  '01n': {
    code: '01n',
    description_ko: '맑음 (밤)',
    description_en: 'Clear sky (night)',
    weatherapi_codes: [1000],
    wmo_codes: [0, 1]
  },

  // 약간 흐림
  '02d': {
    code: '02d',
    description_ko: '약간 흐림 (낮)',
    description_en: 'Few clouds (day)',
    weatherapi_codes: [1003],
    wmo_codes: [2]
  },
  '02n': {
    code: '02n',
    description_ko: '약간 흐림 (밤)',
    description_en: 'Few clouds (night)',
    weatherapi_codes: [1003],
    wmo_codes: [2]
  },

  // 구름 많음
  '03d': {
    code: '03d',
    description_ko: '구름 많음',
    description_en: 'Scattered clouds',
    weatherapi_codes: [1006],
    wmo_codes: [3]
  },
  '03n': {
    code: '03n',
    description_ko: '구름 많음',
    description_en: 'Scattered clouds',
    weatherapi_codes: [1006],
    wmo_codes: [3]
  },

  // 흐림
  '04d': {
    code: '04d',
    description_ko: '흐림',
    description_en: 'Broken clouds',
    weatherapi_codes: [1009],
    wmo_codes: [3]
  },
  '04n': {
    code: '04n',
    description_ko: '흐림',
    description_en: 'Broken clouds',
    weatherapi_codes: [1009],
    wmo_codes: [3]
  },

  // 소나기
  '09d': {
    code: '09d',
    description_ko: '소나기',
    description_en: 'Shower rain',
    weatherapi_codes: [1240, 1243, 1246],
    wmo_codes: [80, 81, 82]
  },
  '09n': {
    code: '09n',
    description_ko: '소나기',
    description_en: 'Shower rain',
    weatherapi_codes: [1240, 1243, 1246],
    wmo_codes: [80, 81, 82]
  },

  // 비
  '10d': {
    code: '10d',
    description_ko: '비 (낮)',
    description_en: 'Rain (day)',
    weatherapi_codes: [1063, 1180, 1183, 1186, 1189, 1192, 1195],
    wmo_codes: [61, 63, 65]
  },
  '10n': {
    code: '10n',
    description_ko: '비 (밤)',
    description_en: 'Rain (night)',
    weatherapi_codes: [1063, 1180, 1183, 1186, 1189, 1192, 1195],
    wmo_codes: [61, 63, 65]
  },

  // 뇌우
  '11d': {
    code: '11d',
    description_ko: '뇌우',
    description_en: 'Thunderstorm',
    weatherapi_codes: [1087, 1273, 1276, 1279, 1282],
    wmo_codes: [95, 96, 99]
  },
  '11n': {
    code: '11n',
    description_ko: '뇌우',
    description_en: 'Thunderstorm',
    weatherapi_codes: [1087, 1273, 1276, 1279, 1282],
    wmo_codes: [95, 96, 99]
  },

  // 눈
  '13d': {
    code: '13d',
    description_ko: '눈',
    description_en: 'Snow',
    weatherapi_codes: [1066, 1114, 1117, 1210, 1213, 1216, 1219, 1222, 1225, 1255, 1258],
    wmo_codes: [71, 73, 75, 77, 85, 86]
  },
  '13n': {
    code: '13n',
    description_ko: '눈',
    description_en: 'Snow',
    weatherapi_codes: [1066, 1114, 1117, 1210, 1213, 1216, 1219, 1222, 1225, 1255, 1258],
    wmo_codes: [71, 73, 75, 77, 85, 86]
  },

  // 안개
  '50d': {
    code: '50d',
    description_ko: '안개',
    description_en: 'Mist',
    weatherapi_codes: [1030, 1135, 1147],
    wmo_codes: [45, 48]
  },
  '50n': {
    code: '50n',
    description_ko: '안개',
    description_en: 'Mist',
    weatherapi_codes: [1030, 1135, 1147],
    wmo_codes: [45, 48]
  },

  // 이슬비 (Drizzle)
  '09d-drizzle': {
    code: '09d',
    description_ko: '이슬비',
    description_en: 'Drizzle',
    weatherapi_codes: [1150, 1153, 1168, 1171],
    wmo_codes: [51, 53, 55, 56, 57]
  },
  '09n-drizzle': {
    code: '09n',
    description_ko: '이슬비',
    description_en: 'Drizzle',
    weatherapi_codes: [1150, 1153, 1168, 1171],
    wmo_codes: [51, 53, 55, 56, 57]
  }
};

/**
 * WeatherAPI.com 코드 → OpenWeatherMap 표준 코드 변환
 *
 * @param weatherapiCode - WeatherAPI.com 날씨 코드
 * @param isDay - 낮/밤 구분 (1: 낮, 0: 밤)
 * @returns OpenWeatherMap 표준 아이콘 코드
 *
 * @example
 * const icon = weatherApiToStandard(1000, 1); // "01d" (맑음-낮)
 * const icon2 = weatherApiToStandard(1000, 0); // "01n" (맑음-밤)
 */
export function weatherApiToStandard(weatherapiCode: number, isDay: number): string {
  const suffix = isDay === 1 ? 'd' : 'n';

  for (const [standardCode, metadata] of Object.entries(WEATHER_ICON_MAP)) {
    if (
      metadata.weatherapi_codes.includes(weatherapiCode) &&
      standardCode.endsWith(suffix)
    ) {
      return metadata.code;
    }
  }

  // 기본값: 맑음
  return isDay === 1 ? '01d' : '01n';
}

/**
 * Open-Meteo WMO 코드 → OpenWeatherMap 표준 코드 변환
 *
 * WMO Weather Code 기준:
 * - 0: Clear sky
 * - 1, 2, 3: Mainly clear, partly cloudy, overcast
 * - 45, 48: Fog
 * - 51, 53, 55: Drizzle
 * - 61, 63, 65: Rain
 * - 71, 73, 75: Snow
 * - 80, 81, 82: Rain showers
 * - 95, 96, 99: Thunderstorm
 *
 * @param wmoCode - WMO 날씨 코드 (0-99)
 * @param isDay - 낮/밤 구분 (true: 낮, false: 밤)
 * @returns OpenWeatherMap 표준 아이콘 코드
 *
 * @example
 * const icon = wmoToStandard(0, true); // "01d" (맑음-낮)
 * const icon2 = wmoToStandard(61, false); // "10n" (비-밤)
 */
export function wmoToStandard(wmoCode: number, isDay: boolean): string {
  const suffix = isDay ? 'd' : 'n';

  for (const [standardCode, metadata] of Object.entries(WEATHER_ICON_MAP)) {
    if (
      metadata.wmo_codes.includes(wmoCode) &&
      standardCode.endsWith(suffix)
    ) {
      return metadata.code;
    }
  }

  // 기본값: 맑음
  return isDay ? '01d' : '01n';
}

/**
 * OpenWeatherMap 아이콘 코드 → 한글 설명
 *
 * @param iconCode - OpenWeatherMap 아이콘 코드 (예: "01d")
 * @returns 한글 설명
 *
 * @example
 * const desc = getIconDescription('01d'); // "맑음 (낮)"
 */
export function getIconDescription(iconCode: string): string {
  return WEATHER_ICON_MAP[iconCode]?.description_ko || '알 수 없음';
}

/**
 * OpenWeatherMap 아이콘 코드 → 영문 설명
 *
 * @param iconCode - OpenWeatherMap 아이콘 코드
 * @returns 영문 설명
 */
export function getIconDescriptionEn(iconCode: string): string {
  return WEATHER_ICON_MAP[iconCode]?.description_en || 'Unknown';
}

/**
 * 아이콘 URL 생성 (OpenWeatherMap CDN)
 *
 * @param iconCode - OpenWeatherMap 아이콘 코드
 * @param size - 아이콘 크기 ('2x' | '4x', 기본: '2x')
 * @returns 아이콘 이미지 URL
 *
 * @example
 * const url = getIconUrl('01d');
 * // "https://openweathermap.org/img/wn/01d@2x.png"
 */
export function getIconUrl(iconCode: string, size: '2x' | '4x' = '2x'): string {
  return `https://openweathermap.org/img/wn/${iconCode}@${size}.png`;
}
