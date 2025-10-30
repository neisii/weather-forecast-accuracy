/**
 * Mock Weather Data TypeScript 타입 정의
 */

/**
 * Mock 날씨 데이터 전체 구조
 */
export interface MockWeatherData {
  /** 데이터 버전 */
  version: string;
  /** 기본 도시 목록 (실제 데이터) */
  cities: Record<string, CityWeather>;
  /** 테스트 도시 목록 (극단 케이스) */
  testCities: Record<string, CityWeather>;
  /** 기본값 (도시 없을 때) */
  default: CityWeather;
}

/**
 * 도시별 날씨 데이터
 */
export interface CityWeather {
  /** 위치 정보 */
  location: LocationData;
  /** 현재 날씨 */
  current: CurrentWeatherData;
  /** 날씨 설명 */
  weather: WeatherDescription;
  /** 타임스탬프 (선택) */
  timestamp?: string;
}

/**
 * 위치 정보
 */
export interface LocationData {
  /** 도시 이름 (영문) */
  name: string;
  /** 도시 이름 (한글) */
  name_ko: string;
  /** 도시 이름 (영문, 명시적) */
  name_en?: string;
  /** 위도 */
  latitude: number;
  /** 경도 */
  longitude: number;
  /** 시간대 (IANA 형식) */
  timezone: string;
  /** 국가 코드 (ISO 3166-1 alpha-2) */
  country: string;
}

/**
 * 현재 날씨 데이터
 */
export interface CurrentWeatherData {
  /** 온도 (°C) */
  temperature: number;
  /** 체감 온도 (°C) */
  feelsLike: number;
  /** 습도 (%) */
  humidity: number;
  /** 기압 (hPa) */
  pressure: number;
  /** 풍속 (m/s) */
  windSpeed: number;
  /** 풍향 (도, 0-360) */
  windDirection: number;
  /** 구름량 (%) */
  cloudiness: number;
  /** 가시거리 (m) */
  visibility: number;
  /** UV 지수 */
  uvIndex: number;
}

/**
 * 날씨 설명 및 아이콘
 */
export interface WeatherDescription {
  /** 날씨 설명 (한글) */
  description: string;
  /** 날씨 설명 (영문) */
  description_en: string;
  /** 아이콘 코드 (OpenWeatherMap 기준) */
  icon: string;
  /** Provider별 날씨 코드 */
  code: WeatherCodes;
}

/**
 * 날씨 제공자별 코드
 */
export interface WeatherCodes {
  /** OpenWeatherMap 코드 */
  openweather: number;
  /** WeatherAPI.com 코드 */
  weatherapi: number;
  /** Open-Meteo WMO 코드 */
  wmo: number;
}

/**
 * 압축된 Mock 데이터 (JSON 파일)
 *
 * 단축 키 사용:
 * - v: version
 * - c: cities
 * - tc: testCities
 * - def: default
 * - loc: location
 * - cur: current
 * - w: weather
 * - 등...
 */
export interface CompressedMockData {
  v: string;
  c: Record<string, CompressedCityWeather>;
  tc: Record<string, CompressedCityWeather>;
  def: CompressedCityWeather;
}

/**
 * 압축된 도시 날씨 데이터
 */
export interface CompressedCityWeather {
  loc: CompressedLocation;
  cur: CompressedCurrentWeather;
  w: CompressedWeatherDescription;
  ts?: string;
}

/**
 * 압축된 위치 정보
 */
export interface CompressedLocation {
  n: string;      // name
  nk: string;     // name_ko
  ne?: string;    // name_en
  lat: number;    // latitude
  lon: number;    // longitude
  tz: string;     // timezone
  co: string;     // country
}

/**
 * 압축된 현재 날씨
 */
export interface CompressedCurrentWeather {
  t: number;      // temperature
  f: number;      // feelsLike
  h: number;      // humidity
  p: number;      // pressure
  ws: number;     // windSpeed
  wd: number;     // windDirection
  cl: number;     // cloudiness
  vis: number;    // visibility
  uv: number;     // uvIndex
}

/**
 * 압축된 날씨 설명
 */
export interface CompressedWeatherDescription {
  d: string;                          // description
  de: string;                         // description_en
  i: string;                          // icon
  cd: CompressedWeatherCodes;         // code
}

/**
 * 압축된 날씨 코드
 */
export interface CompressedWeatherCodes {
  ow: number;     // openweather
  wa: number;     // weatherapi
  wmo: number;    // wmo
}
