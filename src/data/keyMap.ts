/**
 * Mock JSON 단축 키 매핑 테이블
 *
 * 목적:
 * - JSON 파일 크기 최소화 (~75% 감소)
 * - 긴 필드명을 짧은 키로 변환
 * - Gzip 압축과 함께 사용 시 최대 효과
 *
 * 사용 방법:
 * 1. Mock 데이터는 단축 키로 저장
 * 2. 런타임에 expandKeys() 함수로 전체 키로 변환
 * 3. 프로덕션 빌드 시 Vite가 자동으로 Gzip 압축
 */

/**
 * 단축 키 → 전체 키 매핑
 *
 * 네이밍 규칙:
 * - 1-2자 단축 키 사용
 * - 의미 유추 가능한 약어 선호 (c: city, t: temperature)
 * - 충돌 방지를 위해 컨텍스트별 구분
 */
export const KEY_MAP: Record<string, string> = {
  // Root level
  v: 'version',
  c: 'cities',
  tc: 'testCities',
  def: 'default',

  // City data
  loc: 'location',
  cur: 'current',
  w: 'weather',
  ts: 'timestamp',

  // Location
  n: 'name',
  ne: 'name_en',
  nk: 'name_ko',
  lat: 'latitude',
  lon: 'longitude',
  tz: 'timezone',
  co: 'country',

  // Current weather
  t: 'temperature',
  f: 'feelsLike',
  h: 'humidity',
  p: 'pressure',
  ws: 'windSpeed',
  wd: 'windDirection',
  cl: 'cloudiness',
  vis: 'visibility',
  uv: 'uvIndex',

  // Weather description
  d: 'description',
  de: 'description_en',
  i: 'icon',
  cd: 'code',

  // Weather codes
  ow: 'openweather',
  wa: 'weatherapi',
  wmo: 'wmo'
};

/**
 * 역매핑: 전체 키 → 단축 키
 * compressKeys() 함수에서 사용
 */
export const REVERSE_KEY_MAP: Record<string, string> = Object.entries(KEY_MAP).reduce(
  (acc, [short, full]) => {
    acc[full] = short;
    return acc;
  },
  {} as Record<string, string>
);

/**
 * 단축 키로 작성된 객체를 전체 키로 확장
 *
 * @param obj - 단축 키 객체
 * @returns 전체 키로 확장된 객체
 *
 * @example
 * const compressed = { c: { t: 20, h: 60 } };
 * const expanded = expandKeys(compressed);
 * // { cities: { temperature: 20, humidity: 60 } }
 */
export function expandKeys(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => expandKeys(item));
  }

  const expanded: any = {};

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = KEY_MAP[key] || key;
    expanded[fullKey] = expandKeys(value);
  }

  return expanded;
}

/**
 * 전체 키 객체를 단축 키로 압축
 * (Mock 데이터 생성 시 사용)
 *
 * @param obj - 전체 키 객체
 * @returns 단축 키로 압축된 객체
 *
 * @example
 * const full = { cities: { temperature: 20, humidity: 60 } };
 * const compressed = compressKeys(full);
 * // { c: { t: 20, h: 60 } }
 */
export function compressKeys(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => compressKeys(item));
  }

  const compressed: any = {};

  for (const [key, value] of Object.entries(obj)) {
    const shortKey = REVERSE_KEY_MAP[key] || key;
    compressed[shortKey] = compressKeys(value);
  }

  return compressed;
}

/**
 * 키 매핑 통계
 *
 * @returns 단축 키 효과 통계
 */
export function getKeyMapStats() {
  const totalKeys = Object.keys(KEY_MAP).length;
  const avgOriginalLength = Object.values(KEY_MAP).reduce(
    (sum, key) => sum + key.length,
    0
  ) / totalKeys;
  const avgShortLength = Object.keys(KEY_MAP).reduce(
    (sum, key) => sum + key.length,
    0
  ) / totalKeys;
  const savings = ((avgOriginalLength - avgShortLength) / avgOriginalLength) * 100;

  return {
    totalMappings: totalKeys,
    avgOriginalKeyLength: avgOriginalLength.toFixed(2),
    avgShortKeyLength: avgShortLength.toFixed(2),
    averageSavings: `${savings.toFixed(1)}%`
  };
}
