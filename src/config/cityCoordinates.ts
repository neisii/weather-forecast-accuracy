/**
 * 날씨 조회 가능 도시 목록 및 좌표
 *
 * 용도:
 * - UI 드롭다운에서 선택 가능한 도시 목록 제공
 * - Open-Meteo 등 좌표 기반 API 호출 시 사용
 * - 역지오코딩 불필요 (사전 정의된 좌표 사용)
 *
 * 좌표 기준: 각 도시의 중심 좌표 (시청 기준)
 */

export interface CityCoordinate {
  /** 도시 이름 (한글) */
  name: string;
  /** 도시 이름 (영문) */
  name_en: string;
  /** 위도 */
  lat: number;
  /** 경도 */
  lon: number;
  /** 시간대 (IANA) */
  timezone: string;
  /** 국가 코드 (ISO 3166-1 alpha-2) */
  country: string;
}

/**
 * 지원 도시 좌표 데이터
 *
 * @example
 * const coords = CITY_COORDINATES['서울'];
 * const weather = await weatherProvider.getWeatherByCoords(coords.lat, coords.lon);
 */
export const CITY_COORDINATES: Record<string, CityCoordinate> = {
  서울: {
    name: "서울",
    name_en: "Seoul",
    lat: 37.5683,
    lon: 126.9778,
    timezone: "Asia/Seoul",
    country: "KR",
  },
  부산: {
    name: "부산",
    name_en: "Busan",
    lat: 35.1796,
    lon: 129.0756,
    timezone: "Asia/Seoul",
    country: "KR",
  },
  제주: {
    name: "제주",
    name_en: "Jeju",
    lat: 33.4996,
    lon: 126.5312,
    timezone: "Asia/Seoul",
    country: "KR",
  },
  인천: {
    name: "인천",
    name_en: "Incheon",
    lat: 37.4563,
    lon: 126.7052,
    timezone: "Asia/Seoul",
    country: "KR",
  },
  대구: {
    name: "대구",
    name_en: "Daegu",
    lat: 35.8714,
    lon: 128.6014,
    timezone: "Asia/Seoul",
    country: "KR",
  },
  대전: {
    name: "대전",
    name_en: "Daejeon",
    lat: 36.3504,
    lon: 127.3845,
    timezone: "Asia/Seoul",
    country: "KR",
  },
  광주: {
    name: "광주",
    name_en: "Gwangju",
    lat: 35.1595,
    lon: 126.8526,
    timezone: "Asia/Seoul",
    country: "KR",
  },
  울산: {
    name: "울산",
    name_en: "Ulsan",
    lat: 35.5384,
    lon: 129.3114,
    timezone: "Asia/Seoul",
    country: "KR",
  },
};

/**
 * 지원 도시 목록 (한글)
 * UI 드롭다운에서 사용
 */
export const AVAILABLE_CITIES = Object.keys(CITY_COORDINATES);

/**
 * 도시 한글명 → 영문명 변환
 */
export const CITY_NAME_MAP_KO_TO_EN: Record<string, string> = Object.entries(
  CITY_COORDINATES,
).reduce(
  (acc, [, value]) => {
    acc[value.name] = value.name_en;
    return acc;
  },
  {} as Record<string, string>,
);

/**
 * 도시 영문명 → 한글명 변환
 */
export const CITY_NAME_MAP_EN_TO_KO: Record<string, string> = Object.entries(
  CITY_COORDINATES,
).reduce(
  (acc, [, value]) => {
    acc[value.name_en] = value.name;
    return acc;
  },
  {} as Record<string, string>,
);

/**
 * 도시 좌표 조회 헬퍼 함수
 *
 * @param cityName - 도시 이름 (한글 또는 영문)
 * @returns 도시 좌표 또는 undefined
 *
 * @example
 * const coords = getCityCoordinate('서울');
 * const coords2 = getCityCoordinate('Seoul');
 */
export function getCityCoordinate(
  cityName: string,
): CityCoordinate | undefined {
  // 한글명으로 조회
  if (CITY_COORDINATES[cityName]) {
    return CITY_COORDINATES[cityName];
  }

  // 영문명으로 조회
  const koreanName = CITY_NAME_MAP_EN_TO_KO[cityName];
  if (koreanName && CITY_COORDINATES[koreanName]) {
    return CITY_COORDINATES[koreanName];
  }

  return undefined;
}

/**
 * 도시 존재 여부 확인
 *
 * @param cityName - 도시 이름 (한글 또는 영문)
 * @returns 지원 도시 여부
 */
export function isSupportedCity(cityName: string): boolean {
  return getCityCoordinate(cityName) !== undefined;
}
