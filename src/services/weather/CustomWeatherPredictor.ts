/**
 * Custom Weather Predictor Service
 *
 * Multi-provider weighted average prediction system
 *
 * @see docs/WEATHER_ACCURACY_ANALYSIS_REPORT.md
 * @performance 9-day backtesting results:
 * - Temperature: 1.86°C error (7.9% improvement)
 * - Wind Speed: 0.47 m/s error (26.4% improvement)
 * - Humidity: 11.6% error (WeatherAPI level)
 * - Condition: 66.7% match rate (OpenWeather level)
 */

import type {
  CustomPrediction,
  ProviderPredictions,
  PredictionWeights,
  ConfidenceMetrics,
  PredictionRange,
} from "@/types/domain/customPrediction";

/**
 * 가중 평균 계산 유틸리티
 */
function weightedAverage(values: number[], weights: number[]): number {
  if (values.length !== weights.length) {
    throw new Error("Values and weights must have the same length");
  }

  const sum = values.reduce((acc, val, i) => acc + val * (weights[i] ?? 0), 0);
  const totalWeight = weights.reduce((acc, w) => acc + w, 0);

  return sum / totalWeight;
}

/**
 * 표준편차 계산
 */
function standardDeviation(values: number[]): number {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map((value) => Math.pow(value - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * 신뢰도 계산 (표준편차 기반)
 *
 * @param values - Provider별 예측값
 * @param maxStdDev - 최대 허용 표준편차 (이 값 이상이면 신뢰도 0)
 * @returns 신뢰도 (0-100)
 */
function calculateConfidence(values: number[], maxStdDev: number): number {
  const stdDev = standardDeviation(values);
  const confidence = Math.max(0, 100 - (stdDev / maxStdDev) * 100);
  return Math.round(confidence);
}

/**
 * Custom Weather Predictor
 *
 * 각 Provider의 강점을 활용한 가중 평균 예측
 */
export class CustomWeatherPredictor {
  private weights: PredictionWeights;

  constructor(weights?: PredictionWeights) {
    // Default weights from 9-day backtesting
    this.weights = weights || {
      temperature: {
        openmeteo: 0.45,
        openweather: 0.4,
        weatherapi: 0.15,
      },
      humidity: {
        weatherapi: 0.7,
        openweather: 0.3,
      },
      windSpeed: {
        openmeteo: 0.6,
        openweather: 0.25,
        weatherapi: 0.15,
      },
      condition: {
        openweather: 1.0,
      },
    };
  }

  /**
   * 커스텀 날씨 예측 생성
   *
   * @param providers - 3개 provider의 현재 날씨 데이터
   * @returns 가중 평균 기반 커스텀 예측
   */
  predict(providers: ProviderPredictions): CustomPrediction {
    const { openweather } = providers;

    // 1. 온도 예측 (가중 평균)
    const temperature = this.calculateTemperature(providers);

    // 2. 습도 예측 (OpenMeteo 제외)
    const humidity = this.calculateHumidity(providers);

    // 3. 풍속 예측 (가중 평균)
    const windSpeed = this.calculateWindSpeed(providers);

    // 4. 체감 온도 (가중 평균)
    const feelsLike = this.calculateFeelsLike(providers);

    // 5. 날씨 상태 (OpenWeather 단독)
    const weather = this.selectCondition(providers);

    // 6. 신뢰도 계산 (Phase 9)
    const confidence = this.calculateConfidenceMetrics(providers);

    // 7. 위치 정보 (OpenWeather 우선)
    const location = openweather.location;

    // 8. 기타 기상 데이터 (OpenWeather 기준)
    const { pressure, windDirection, cloudiness, visibility, uvIndex } =
      openweather.current;

    return {
      location,
      current: {
        temperature,
        feelsLike,
        humidity,
        pressure,
        windSpeed,
        windDirection,
        cloudiness,
        visibility,
        uvIndex,
      },
      weather,
      timestamp: new Date(),
      confidence,
      providers,
      weights: this.weights,
    };
  }

  /**
   * 온도 가중 평균 계산
   */
  private calculateTemperature(providers: ProviderPredictions): number {
    const temps = [
      providers.openmeteo.current.temperature,
      providers.openweather.current.temperature,
      providers.weatherapi.current.temperature,
    ];

    const weights = [
      this.weights.temperature.openmeteo,
      this.weights.temperature.openweather,
      this.weights.temperature.weatherapi,
    ];

    return Math.round(weightedAverage(temps, weights) * 10) / 10;
  }

  /**
   * 습도 가중 평균 계산
   */
  private calculateHumidity(providers: ProviderPredictions): number {
    const humidities = [
      providers.weatherapi.current.humidity,
      providers.openweather.current.humidity,
    ];

    const weights = [
      this.weights.humidity.weatherapi,
      this.weights.humidity.openweather,
    ];

    return Math.round(weightedAverage(humidities, weights));
  }

  /**
   * 풍속 가중 평균 계산
   */
  private calculateWindSpeed(providers: ProviderPredictions): number {
    const winds = [
      providers.openmeteo.current.windSpeed,
      providers.openweather.current.windSpeed,
      providers.weatherapi.current.windSpeed,
    ];

    const weights = [
      this.weights.windSpeed.openmeteo,
      this.weights.windSpeed.openweather,
      this.weights.windSpeed.weatherapi,
    ];

    return Math.round(weightedAverage(winds, weights) * 100) / 100;
  }

  /**
   * 체감 온도 가중 평균 계산
   */
  private calculateFeelsLike(providers: ProviderPredictions): number {
    const feelsLikes = [
      providers.openmeteo.current.feelsLike,
      providers.openweather.current.feelsLike,
      providers.weatherapi.current.feelsLike,
    ];

    const weights = [
      this.weights.temperature.openmeteo,
      this.weights.temperature.openweather,
      this.weights.temperature.weatherapi,
    ];

    return Math.round(weightedAverage(feelsLikes, weights) * 10) / 10;
  }

  /**
   * 날씨 상태 선택 (OpenWeather 100%)
   */
  private selectCondition(providers: ProviderPredictions) {
    return providers.openweather.weather;
  }

  /**
   * 신뢰도 메트릭 계산 (Phase 9)
   */
  private calculateConfidenceMetrics(
    providers: ProviderPredictions,
  ): ConfidenceMetrics {
    // 온도 신뢰도
    const temps = [
      providers.openweather.current.temperature,
      providers.weatherapi.current.temperature,
      providers.openmeteo.current.temperature,
    ];
    const tempStdDev = standardDeviation(temps);
    const tempConfidence = calculateConfidence(temps, 3.0);

    // 습도 신뢰도
    const humidities = [
      providers.openweather.current.humidity,
      providers.weatherapi.current.humidity,
    ];
    const humidityStdDev = standardDeviation(humidities);
    const humidityConfidence = calculateConfidence(humidities, 15.0);

    // 풍속 신뢰도
    const winds = [
      providers.openweather.current.windSpeed,
      providers.weatherapi.current.windSpeed,
      providers.openmeteo.current.windSpeed,
    ];
    const windStdDev = standardDeviation(winds);
    const windConfidence = calculateConfidence(winds, 1.5);

    // 날씨 상태 신뢰도
    const conditions = [
      providers.openweather.weather.main,
      providers.weatherapi.weather.main,
      providers.openmeteo.weather.main,
    ];
    const uniqueConditions = new Set(conditions).size;
    const conditionConfidence = Math.round(((4 - uniqueConditions) / 3) * 100);

    // 종합 신뢰도
    const overall = Math.round(
      tempConfidence * 0.4 +
        humidityConfidence * 0.2 +
        windConfidence * 0.2 +
        conditionConfidence * 0.2,
    );

    return {
      overall,
      temperature: tempConfidence,
      humidity: humidityConfidence,
      windSpeed: windConfidence,
      condition: conditionConfidence,
      uncertainty: {
        temperature: Math.round(tempStdDev * 10) / 10,
        humidity: Math.round(humidityStdDev),
        windSpeed: Math.round(windStdDev * 100) / 100,
      },
    };
  }

  /**
   * 예측 범위 계산
   */
  calculatePredictionRange(
    providers: ProviderPredictions,
    metric: "temperature" | "humidity" | "windSpeed",
  ): PredictionRange {
    let values: number[];

    switch (metric) {
      case "temperature":
        values = [
          providers.openweather.current.temperature,
          providers.weatherapi.current.temperature,
          providers.openmeteo.current.temperature,
        ];
        break;
      case "humidity":
        values = [
          providers.openweather.current.humidity,
          providers.weatherapi.current.humidity,
        ];
        break;
      case "windSpeed":
        values = [
          providers.openweather.current.windSpeed,
          providers.weatherapi.current.windSpeed,
          providers.openmeteo.current.windSpeed,
        ];
        break;
    }

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const stdDev = standardDeviation(values);

    return {
      min: Math.min(...values),
      max: Math.max(...values),
      mean: Math.round(mean * 10) / 10,
      stdDev: Math.round(stdDev * 100) / 100,
    };
  }

  /**
   * 가중치 업데이트 (Phase 10: Adaptive Learning)
   */
  updateWeights(newWeights: PredictionWeights): void {
    this.weights = newWeights;
  }

  /**
   * 현재 가중치 반환
   */
  getWeights(): PredictionWeights {
    return { ...this.weights };
  }
}

/**
 * 싱글톤 인스턴스
 */
export const customWeatherPredictor = new CustomWeatherPredictor();
