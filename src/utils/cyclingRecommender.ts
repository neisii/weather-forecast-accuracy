/**
 * 자전거 라이딩 추천 시스템 - 점수 계산 로직
 *
 * Phase 7: 기본 점수 시스템
 *
 * 날씨 조건을 분석하여 자전거 타기 적합도를 0-100점으로 계산합니다.
 * 5가지 주요 요소를 평가하여 종합 점수를 산출합니다:
 * - 기온 (최적: 15-25°C)
 * - 강수량 (비/눈 여부)
 * - 풍속 (바람 강도)
 * - 습도 (불쾌지수)
 * - 미세먼지 (공기질)
 */

import type { CurrentWeather } from "@/types/domain/weather";
import type { CustomPrediction } from "@/types/domain/customPrediction";
import type {
  CyclingScore,
  ClothingItem,
  RecommendationLevel,
} from "@/types/cycling";

/**
 * 날씨 데이터를 기반으로 자전거 라이딩 점수를 계산합니다.
 *
 * @param weather - 현재 날씨 정보
 * @returns 점수, 추천도, 이유, 권장 복장을 포함한 추천 정보
 *
 * @example
 * ```typescript
 * const weather = await weatherService.getCurrentWeather('Seoul');
 * const score = calculateCyclingScore(weather);
 * console.log(score.score); // 85
 * console.log(score.recommendation); // 'excellent'
 * ```
 */
export function calculateCyclingScore(weather: CurrentWeather): CyclingScore {
  let score = 100;
  const reasons: string[] = [];
  const clothing: ClothingItem[] = [
    { name: "자전거 헬멧", essential: true },
    { name: "선글라스", essential: true },
  ];

  // 1. 기온 체크 (-20점 ~ 0점)
  const temp = weather.current.temperature;
  const tempPenalty = evaluateTemperature(temp, reasons, clothing);
  score -= tempPenalty;

  // 2. 강수량 체크 (-30점 ~ 0점)
  const condition = weather.weather.description.toLowerCase();
  const rainPenalty = evaluateRain(condition, reasons, clothing);
  score -= rainPenalty;

  // 3. 풍속 체크 (-25점 ~ 0점)
  // windSpeed is in m/s, convert to km/h
  const wind = weather.current.windSpeed * 3.6;
  const windPenalty = evaluateWind(wind, reasons, clothing);
  score -= windPenalty;

  // 4. 습도 체크 (-10점 ~ 0점)
  const humidity = weather.current.humidity;
  const humidityPenalty = evaluateHumidity(humidity, reasons);
  score -= humidityPenalty;

  // 5. 체감 온도 추가 체크
  const feelsLike = weather.current.feelsLike;
  const feelsLikePenalty = evaluateFeelsLike(temp, feelsLike, reasons);
  score -= feelsLikePenalty;

  // 점수 범위 보정 (0-100)
  score = Math.max(0, Math.min(100, score));

  // 추천도 결정
  const recommendation = getRecommendationLevel(score);

  return {
    score: Math.round(score),
    recommendation,
    reasons,
    clothing,
  };
}

/**
 * 기온을 평가하고 패널티를 계산합니다.
 *
 * 최적 온도: 15-25°C
 * - 영하: -20점
 * - 10도 미만: -10점
 * - 35도 초과: -15점
 */
function evaluateTemperature(
  temp: number,
  reasons: string[],
  clothing: ClothingItem[],
): number {
  if (temp < 0) {
    reasons.push("영하 기온으로 빙판 위험");
    clothing.push(
      { name: "방한 장갑", essential: true },
      { name: "넥워머", essential: true },
      { name: "방풍 재킷", essential: true },
      { name: "방한 레그워머", essential: true },
    );
    return 20;
  }

  if (temp < 10) {
    reasons.push("쌀쌀한 날씨");
    clothing.push(
      { name: "긴팔 저지", essential: true },
      { name: "레그워머", essential: false },
      { name: "장갑", essential: false },
    );
    return 10;
  }

  if (temp > 35) {
    reasons.push("폭염 주의 - 열사병 위험");
    clothing.push(
      { name: "반팔 저지", essential: true },
      { name: "선크림 SPF50+", essential: true },
      { name: "물통 2개 이상", essential: true },
      { name: "아이스 슬리브", essential: false },
    );
    return 15;
  }

  if (temp >= 30) {
    reasons.push("더운 날씨 - 수분 보충 필수");
    clothing.push(
      { name: "반팔 저지", essential: true },
      { name: "선크림", essential: true },
      { name: "물통 2개", essential: true },
    );
    return 5;
  }

  if (temp >= 15 && temp <= 25) {
    reasons.push("완벽한 라이딩 온도");
    clothing.push({ name: "반팔 저지", essential: true });
    return 0;
  }

  if (temp >= 10 && temp < 15) {
    clothing.push({ name: "긴팔 저지 또는 반팔+암워머", essential: true });
    return 0;
  }

  if (temp > 25 && temp < 30) {
    clothing.push({ name: "반팔 저지", essential: true });
    return 0;
  }

  return 0;
}

/**
 * 강수량을 평가하고 패널티를 계산합니다.
 *
 * - 강한 비/눈: -30점
 * - 약한 비/눈: -15점
 */
function evaluateRain(
  condition: string,
  reasons: string[],
  clothing: ClothingItem[],
): number {
  const rainKeywords = ["rain", "비", "drizzle", "이슬비"];
  const snowKeywords = ["snow", "눈", "sleet", "진눈깨비"];
  const heavyKeywords = ["heavy", "강한", "moderate", "중간"];

  const hasRain = rainKeywords.some((keyword) => condition.includes(keyword));
  const hasSnow = snowKeywords.some((keyword) => condition.includes(keyword));
  const isHeavy = heavyKeywords.some((keyword) => condition.includes(keyword));

  if (hasRain) {
    if (isHeavy) {
      reasons.push("강한 비로 시야 불량 및 노면 미끄러움");
      clothing.push(
        { name: "방수 재킷", essential: true },
        { name: "신발 커버", essential: true },
        { name: "방수 장갑", essential: false },
      );
      return 30;
    } else {
      reasons.push("비가 내림 - 노면 주의");
      clothing.push(
        { name: "레인 재킷", essential: true },
        { name: "신발 커버", essential: false },
      );
      return 15;
    }
  }

  if (hasSnow) {
    reasons.push("눈으로 인한 도로 위험");
    clothing.push(
      { name: "방수 방한 재킷", essential: true },
      { name: "방한 장갑", essential: true },
    );
    return isHeavy ? 35 : 25;
  }

  return 0;
}

/**
 * 풍속을 평가하고 패널티를 계산합니다.
 *
 * - 15 km/h 초과: -25점 (강풍)
 * - 10 km/h 초과: -10점 (바람 강함)
 */
function evaluateWind(
  wind: number,
  reasons: string[],
  clothing: ClothingItem[],
): number {
  if (wind > 15) {
    reasons.push("강풍으로 주행 어려움 및 균형 잡기 힘듦");
    clothing.push({ name: "방풍 조끼", essential: false });
    return 25;
  }

  if (wind > 10) {
    reasons.push("바람이 강함 - 체력 소모 증가");
    clothing.push({ name: "방풍 조끼", essential: false });
    return 10;
  }

  if (wind <= 5) {
    reasons.push("바람이 약해 쾌적한 라이딩");
  }

  return 0;
}

/**
 * 습도를 평가하고 패널티를 계산합니다.
 *
 * - 80% 초과: -10점 (불쾌지수 높음)
 */
function evaluateHumidity(humidity: number, reasons: string[]): number {
  if (humidity > 80) {
    reasons.push("높은 습도로 불쾌감 증가");
    return 10;
  }

  if (humidity < 30) {
    reasons.push("건조함 - 수분 보충 주의");
    return 3;
  }

  return 0;
}

/**
 * 체감 온도를 평가하고 추가 패널티를 계산합니다.
 *
 * 실제 온도와 체감 온도의 차이가 큰 경우 추가 패널티
 */
function evaluateFeelsLike(
  temp: number,
  feelsLike: number,
  reasons: string[],
): number {
  const diff = Math.abs(temp - feelsLike);

  if (diff > 10) {
    reasons.push("체감 온도 차이가 커서 주의 필요");
    return 5;
  }

  if (diff > 5) {
    reasons.push("체감 온도 다소 차이");
    return 2;
  }

  return 0;
}

/**
 * 점수를 기반으로 추천도 레벨을 결정합니다.
 *
 * @param score - 종합 점수 (0-100)
 * @returns 추천도 레벨
 */
export function getRecommendationLevel(score: number): RecommendationLevel {
  if (score >= 80) return "excellent";
  if (score >= 60) return "good";
  if (score >= 40) return "fair";
  if (score >= 20) return "poor";
  return "dangerous";
}

/**
 * 특정 조건이 이상적인지 확인합니다.
 *
 * @param weather - 현재 날씨 정보
 * @returns 이상적인 날씨 여부
 */
export function isIdealWeather(weather: CurrentWeather): boolean {
  const score = calculateCyclingScore(weather);
  return score.score >= 80;
}

/**
 * CustomPrediction을 CurrentWeather 형식으로 변환합니다.
 *
 * CustomPrediction은 여러 provider의 가중 평균이므로,
 * 자전거 추천 시스템에서 더 정확한 점수를 계산할 수 있습니다.
 *
 * @param prediction - Custom AI 예측 결과
 * @returns CurrentWeather 형식의 날씨 데이터
 */
export function convertCustomPredictionToWeather(
  prediction: CustomPrediction,
): CurrentWeather {
  // CustomPrediction already extends CurrentWeather, so we can use it directly
  // Just ensure it's a plain CurrentWeather type for compatibility
  return {
    location: prediction.location,
    current: prediction.current,
    weather: prediction.weather,
    timestamp: prediction.timestamp,
  };
}

/**
 * CustomPrediction 기반 자전거 라이딩 점수 계산
 *
 * Custom AI 예측을 사용하여 더 정확한 자전거 추천을 제공합니다.
 *
 * @param prediction - Custom AI 예측 결과
 * @returns 점수, 추천도, 이유, 권장 복장을 포함한 추천 정보
 */
export function calculateCyclingScoreFromCustomPrediction(
  prediction: CustomPrediction,
): CyclingScore {
  const weather = convertCustomPredictionToWeather(prediction);
  return calculateCyclingScore(weather);
}
