/**
 * AI Weights Types
 *
 * Adaptive Learning System (Phase 10)
 */

import type { PredictionWeights } from './customPrediction';

/**
 * AI 가중치 스냅샷
 */
export interface AIWeightsSnapshot {
  /** 가중치 버전 (날짜 기반: YYYY-MM-DD) */
  version: string;

  /** 업데이트 날짜 (ISO 8601) */
  updatedAt: string;

  /** 가중치 */
  weights: PredictionWeights;

  /** 이 가중치로 달성한 정확도 메트릭 */
  performance: PerformanceMetrics;

  /** 분석 기간 */
  analysisPeriod: {
    from: string; // ISO 8601
    to: string;   // ISO 8601
    days: number;
  };

  /** 변경 사유 */
  changeReason?: string;
}

/**
 * 성능 메트릭
 */
export interface PerformanceMetrics {
  /** Provider별 정확도 */
  providers: {
    openmeteo: ProviderAccuracy;
    openweather: ProviderAccuracy;
    weatherapi: ProviderAccuracy;
  };

  /** Custom AI 종합 성능 */
  customAI: {
    temperatureMAE: number;  // Mean Absolute Error (°C)
    windSpeedMAE: number;    // Mean Absolute Error (m/s)
    humidityMAE: number;     // Mean Absolute Error (%)
    conditionAccuracy: number; // 0-1
    overallScore: number;    // 0-100
  };

  /** 개선율 (이전 버전 대비) */
  improvement?: {
    temperature: number;  // % (양수 = 개선)
    windSpeed: number;
    humidity: number;
    overall: number;
  };
}

/**
 * Provider 정확도
 */
export interface ProviderAccuracy {
  temperatureMAE: number;
  windSpeedMAE: number;
  humidityMAE: number;
  conditionAccuracy: number;
  sampleSize: number;
}

/**
 * 가중치 변경 이력
 */
export interface WeightChangeHistory {
  /** 전체 이력 */
  history: AIWeightsSnapshot[];

  /** 최신 버전 */
  latest: AIWeightsSnapshot;

  /** 초기 버전 (백테스팅 기반) */
  initial: AIWeightsSnapshot;
}

/**
 * 가중치 최적화 결과
 */
export interface OptimizationResult {
  /** 새로운 가중치 */
  newWeights: PredictionWeights;

  /** 예상 성능 */
  expectedPerformance: PerformanceMetrics;

  /** 최적화 방법 */
  method: 'gradient-descent' | 'brute-force' | 'statistical';

  /** 신뢰도 (0-1) */
  confidence: number;

  /** 권장 적용 여부 */
  recommended: boolean;

  /** 권장 사유 */
  reason: string;
}
