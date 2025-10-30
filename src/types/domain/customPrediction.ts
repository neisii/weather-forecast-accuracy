/**
 * Custom Weather Prediction Types
 *
 * Phase 8-9: Multi-provider weighted average prediction system
 *
 * @see docs/PHASE_8-9_SUMMARY.md
 * @see docs/WEATHER_ACCURACY_ANALYSIS_REPORT.md
 */

import type { CurrentWeather } from "./weather";

/**
 * Provider predictions from all 3 sources
 */
export interface ProviderPredictions {
  openweather: CurrentWeather;
  weatherapi: CurrentWeather;
  openmeteo: CurrentWeather;
}

/**
 * Prediction weights for each metric and provider
 *
 * Based on 9-day backtesting results (2025-10-14 to 2025-10-22)
 */
export interface PredictionWeights {
  temperature: {
    openmeteo: number; // 0.45 (best temp accuracy: 2.02°C)
    openweather: number; // 0.40 (good temp accuracy: 2.03°C)
    weatherapi: number; // 0.15 (worst temp accuracy: 2.13°C)
  };
  humidity: {
    weatherapi: number; // 0.70 (best humidity: 10.4% error)
    openweather: number; // 0.30 (good humidity: 11.8% error)
    // Note: OpenMeteo excluded - no humidity data
  };
  windSpeed: {
    openmeteo: number; // 0.60 (best wind: 0.65 m/s error)
    openweather: number; // 0.25 (good wind: 0.82 m/s error)
    weatherapi: number; // 0.15 (worst wind: 0.96 m/s error)
  };
  condition: {
    openweather: number; // 1.0 (best condition match: 66.7%)
  };
}

/**
 * Confidence metrics (Phase 9)
 *
 * Based on standard deviation between providers
 */
export interface ConfidenceMetrics {
  /** Overall confidence (0-100) */
  overall: number;
  /** Temperature confidence (0-100) */
  temperature: number;
  /** Humidity confidence (0-100) */
  humidity: number;
  /** Wind speed confidence (0-100) */
  windSpeed: number;
  /** Condition confidence (0-100) */
  condition: number;
  /** Uncertainty values (standard deviation) */
  uncertainty: {
    temperature: number; // °C
    humidity: number; // %
    windSpeed: number; // m/s
  };
}

/**
 * Confidence level classification
 */
export type ConfidenceLevel = "high" | "medium" | "low";

/**
 * Prediction range for a metric
 */
export interface PredictionRange {
  min: number;
  max: number;
  mean: number;
  stdDev: number;
}

/**
 * Custom prediction result
 *
 * Combines weighted average predictions with confidence metrics
 * Extends CurrentWeather with additional metadata
 */
export interface CustomPrediction extends CurrentWeather {
  confidence: ConfidenceMetrics;
  providers: ProviderPredictions;
  weights: PredictionWeights;
}

/**
 * Type guard to check if a weather object is a CustomPrediction
 */
export function isCustomPrediction(
  weather: CurrentWeather,
): weather is CustomPrediction {
  return (
    "confidence" in weather && "providers" in weather && "weights" in weather
  );
}

/**
 * Get confidence level from confidence percentage
 */
export function getConfidenceLevel(confidence: number): ConfidenceLevel {
  if (confidence >= 70) return "high";
  if (confidence >= 40) return "medium";
  return "low";
}

/**
 * Confidence level display messages
 */
export const CONFIDENCE_MESSAGES: Record<ConfidenceLevel, string> = {
  high: "예측 신뢰도가 높습니다",
  medium: "예측 신뢰도가 보통입니다",
  low: "Provider 간 차이가 커서 불확실합니다",
};

/**
 * Confidence level colors
 */
export const CONFIDENCE_COLORS: Record<
  ConfidenceLevel,
  { from: string; to: string }
> = {
  high: { from: "#10b981", to: "#059669" },
  medium: { from: "#f59e0b", to: "#d97706" },
  low: { from: "#ef4444", to: "#dc2626" },
};
