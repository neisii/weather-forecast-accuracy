/**
 * Enhanced Accuracy Analysis Script
 *
 * Phase 10: Adaptive Learning
 *
 * 기능:
 * - 최근 30일 데이터 분석
 * - Provider별 정확도 계산
 * - Custom AI 성능 평가
 * - 최적 가중치 계산
 */

import fs from 'fs/promises';
import path from 'path';
import type { ProviderAccuracy, PerformanceMetrics, OptimizationResult } from '../src/types/domain/aiWeights';
import type { PredictionWeights } from '../src/types/domain/customPrediction';

const DATA_DIR = path.join(process.cwd(), 'data');
const PREDICTIONS_DIR = path.join(DATA_DIR, 'predictions');
const OBSERVATIONS_DIR = path.join(DATA_DIR, 'observations');

interface DailyData {
  date: string;
  predictions: any;
  observations: any;
}

/**
 * 최근 N일 데이터 로드
 */
async function loadRecentData(days: number = 30): Promise<DailyData[]> {
  const allFiles = await fs.readdir(PREDICTIONS_DIR);
  const jsonFiles = allFiles
    .filter(f => f.endsWith('.json'))
    .sort()
    .reverse()
    .slice(0, days);

  const data: DailyData[] = [];

  for (const file of jsonFiles) {
    const date = file.replace('.json', '');
    const predPath = path.join(PREDICTIONS_DIR, file);
    const obsPath = path.join(OBSERVATIONS_DIR, file);

    try {
      const predictions = JSON.parse(await fs.readFile(predPath, 'utf-8'));
      const observations = JSON.parse(await fs.readFile(obsPath, 'utf-8'));

      data.push({ date, predictions, observations });
    } catch (error) {
      console.warn(`⚠️  Missing data for ${date}`);
    }
  }

  return data;
}

/**
 * MAE (Mean Absolute Error) 계산
 */
function calculateMAE(predicted: number[], actual: number[]): number {
  if (predicted.length !== actual.length || predicted.length === 0) {
    return 0;
  }

  const sum = predicted.reduce((acc, pred, i) => {
    return acc + Math.abs(pred - actual[i]);
  }, 0);

  return sum / predicted.length;
}

/**
 * 정확도 계산 (매칭률)
 */
function calculateAccuracy(predicted: string[], actual: string[]): number {
  if (predicted.length !== actual.length || predicted.length === 0) {
    return 0;
  }

  const matches = predicted.filter((pred, i) => pred === actual[i]).length;
  return matches / predicted.length;
}

/**
 * Provider별 정확도 분석
 */
function analyzeProviderAccuracy(data: DailyData[]): Record<string, ProviderAccuracy> {
  const providers = ['openmeteo', 'openweather', 'weatherapi'];
  const results: Record<string, ProviderAccuracy> = {};

  for (const provider of providers) {
    const temps: { pred: number[]; actual: number[] } = { pred: [], actual: [] };
    const winds: { pred: number[]; actual: number[] } = { pred: [], actual: [] };
    const humidities: { pred: number[]; actual: number[] } = { pred: [], actual: [] };
    const conditions: { pred: string[]; actual: string[] } = { pred: [], actual: [] };

    for (const day of data) {
      const pred = day.predictions[provider];
      const obs = day.observations;

      if (pred && obs) {
        temps.pred.push(pred.temperature);
        temps.actual.push(obs.temperature);

        winds.pred.push(pred.windSpeed);
        winds.actual.push(obs.windSpeed);

        if (provider !== 'openmeteo') { // OpenMeteo는 습도 없음
          humidities.pred.push(pred.humidity);
          humidities.actual.push(obs.humidity);
        }

        conditions.pred.push(pred.condition);
        conditions.actual.push(obs.condition);
      }
    }

    results[provider] = {
      temperatureMAE: calculateMAE(temps.pred, temps.actual),
      windSpeedMAE: calculateMAE(winds.pred, winds.actual),
      humidityMAE: provider === 'openmeteo' ? 0 : calculateMAE(humidities.pred, humidities.actual),
      conditionAccuracy: calculateAccuracy(conditions.pred, conditions.actual),
      sampleSize: temps.pred.length,
    };
  }

  return results;
}

/**
 * 가중치 최적화 - 통계 기반
 *
 * 간단한 역비례 방식: 오차가 작을수록 높은 가중치
 */
function optimizeWeights(accuracy: Record<string, ProviderAccuracy>): OptimizationResult {
  const providers = ['openmeteo', 'openweather', 'weatherapi'];

  // 1. 온도 가중치 계산
  const tempErrors = providers.map(p => accuracy[p].temperatureMAE);
  const tempWeights = calculateInverseWeights(tempErrors);

  const temperatureWeights = {
    openmeteo: tempWeights[0],
    openweather: tempWeights[1],
    weatherapi: tempWeights[2],
  };

  // 2. 풍속 가중치 계산
  const windErrors = providers.map(p => accuracy[p].windSpeedMAE);
  const windWeights = calculateInverseWeights(windErrors);

  const windSpeedWeights = {
    openmeteo: windWeights[0],
    openweather: windWeights[1],
    weatherapi: windWeights[2],
  };

  // 3. 습도 가중치 계산 (OpenMeteo 제외)
  const humidityProviders = ['openweather', 'weatherapi'];
  const humidityErrors = humidityProviders.map(p => accuracy[p].humidityMAE);
  const humidityWeights = calculateInverseWeights(humidityErrors);

  const humidity = {
    weatherapi: humidityWeights[1],
    openweather: humidityWeights[0],
  };

  // 4. 날씨 상태 - OpenWeather 고정 (가장 정확)
  const conditionAccuracies = providers.map(p => accuracy[p].conditionAccuracy);
  const bestConditionProvider = providers[conditionAccuracies.indexOf(Math.max(...conditionAccuracies))];

  const condition = {
    openweather: bestConditionProvider === 'openweather' ? 1.0 : 0.0,
  };
  if (bestConditionProvider !== 'openweather') {
    console.warn(`⚠️  Best condition provider changed to ${bestConditionProvider}`);
  }

  const newWeights: PredictionWeights = {
    temperature: temperatureWeights,
    humidity,
    windSpeed: windSpeedWeights,
    condition,
  };

  // 예상 성능 계산
  const expectedPerformance = calculateExpectedPerformance(accuracy, newWeights);

  // 신뢰도 계산 (샘플 사이즈 기반)
  const avgSampleSize = Object.values(accuracy).reduce((sum, p) => sum + p.sampleSize, 0) / 3;
  const confidence = Math.min(avgSampleSize / 30, 1.0); // 30일 이상이면 100% 신뢰

  // 적용 권장 여부
  const recommended = confidence > 0.8 && avgSampleSize >= 20;
  const reason = recommended
    ? `충분한 데이터 (${Math.round(avgSampleSize)}일) 기반 최적화`
    : `데이터 부족 (${Math.round(avgSampleSize)}일 < 20일)`;

  return {
    newWeights,
    expectedPerformance,
    method: 'statistical',
    confidence,
    recommended,
    reason,
  };
}

/**
 * 역비례 가중치 계산
 *
 * 오차가 작을수록 높은 가중치
 * 합이 1.0이 되도록 정규화
 */
function calculateInverseWeights(errors: number[]): number[] {
  // 0으로 나누기 방지: 매우 작은 오차는 0.01로 처리
  const safeErrors = errors.map(e => Math.max(e, 0.01));

  // 역수 계산
  const inverses = safeErrors.map(e => 1 / e);

  // 정규화 (합 = 1.0)
  const sum = inverses.reduce((a, b) => a + b, 0);
  const weights = inverses.map(inv => inv / sum);

  // 소수점 2자리 반올림
  return weights.map(w => Math.round(w * 100) / 100);
}

/**
 * 예상 성능 계산
 */
function calculateExpectedPerformance(
  accuracy: Record<string, ProviderAccuracy>,
  weights: PredictionWeights
): PerformanceMetrics {
  // Custom AI 성능 = 가중 평균
  const customTempMAE =
    accuracy.openmeteo.temperatureMAE * weights.temperature.openmeteo +
    accuracy.openweather.temperatureMAE * weights.temperature.openweather +
    accuracy.weatherapi.temperatureMAE * weights.temperature.weatherapi;

  const customWindMAE =
    accuracy.openmeteo.windSpeedMAE * weights.windSpeed.openmeteo +
    accuracy.openweather.windSpeedMAE * weights.windSpeed.openweather +
    accuracy.weatherapi.windSpeedMAE * weights.windSpeed.weatherapi;

  const customHumidityMAE =
    accuracy.openweather.humidityMAE * weights.humidity.openweather +
    accuracy.weatherapi.humidityMAE * weights.humidity.weatherapi;

  const customConditionAccuracy = weights.condition.openweather === 1.0
    ? accuracy.openweather.conditionAccuracy
    : 0;

  // 종합 점수 (0-100)
  const overallScore = 100 - (
    customTempMAE * 10 +
    customWindMAE * 5 +
    customHumidityMAE * 2 +
    (1 - customConditionAccuracy) * 30
  );

  return {
    providers: accuracy as any,
    customAI: {
      temperatureMAE: Math.round(customTempMAE * 100) / 100,
      windSpeedMAE: Math.round(customWindMAE * 100) / 100,
      humidityMAE: Math.round(customHumidityMAE * 100) / 100,
      conditionAccuracy: Math.round(customConditionAccuracy * 100) / 100,
      overallScore: Math.round(overallScore * 10) / 10,
    },
  };
}

/**
 * 메인 실행
 */
async function main() {
  console.log('🔍 Enhanced Accuracy Analysis');
  console.log('================================\n');

  // 1. 데이터 로드
  console.log('📂 Loading recent 30 days data...');
  const data = await loadRecentData(30);
  console.log(`✅ Loaded ${data.length} days\n`);

  if (data.length < 7) {
    console.log('⚠️  Not enough data (minimum 7 days required)');
    process.exit(0);
  }

  // 2. Provider별 정확도 분석
  console.log('📊 Analyzing provider accuracy...');
  const accuracy = analyzeProviderAccuracy(data);

  console.log('\nProvider Accuracy:');
  for (const [provider, acc] of Object.entries(accuracy)) {
    console.log(`\n${provider}:`);
    console.log(`  Temperature: ${acc.temperatureMAE.toFixed(2)}°C`);
    console.log(`  Wind Speed:  ${acc.windSpeedMAE.toFixed(2)} m/s`);
    console.log(`  Humidity:    ${acc.humidityMAE.toFixed(1)}%`);
    console.log(`  Condition:   ${(acc.conditionAccuracy * 100).toFixed(1)}%`);
    console.log(`  Sample Size: ${acc.sampleSize} days`);
  }

  // 3. 가중치 최적화
  console.log('\n🎯 Optimizing weights...');
  const optimization = optimizeWeights(accuracy);

  console.log('\nOptimized Weights:');
  console.log('Temperature:');
  console.log(`  OpenMeteo:   ${(optimization.newWeights.temperature.openmeteo * 100).toFixed(0)}%`);
  console.log(`  OpenWeather: ${(optimization.newWeights.temperature.openweather * 100).toFixed(0)}%`);
  console.log(`  WeatherAPI:  ${(optimization.newWeights.temperature.weatherapi * 100).toFixed(0)}%`);

  console.log('\nWind Speed:');
  console.log(`  OpenMeteo:   ${(optimization.newWeights.windSpeed.openmeteo * 100).toFixed(0)}%`);
  console.log(`  OpenWeather: ${(optimization.newWeights.windSpeed.openweather * 100).toFixed(0)}%`);
  console.log(`  WeatherAPI:  ${(optimization.newWeights.windSpeed.weatherapi * 100).toFixed(0)}%`);

  console.log('\nHumidity:');
  console.log(`  OpenWeather: ${(optimization.newWeights.humidity.openweather * 100).toFixed(0)}%`);
  console.log(`  WeatherAPI:  ${(optimization.newWeights.humidity.weatherapi * 100).toFixed(0)}%`);

  console.log('\n📈 Expected Performance:');
  console.log(`  Temperature MAE: ${optimization.expectedPerformance.customAI.temperatureMAE}°C`);
  console.log(`  Wind Speed MAE:  ${optimization.expectedPerformance.customAI.windSpeedMAE} m/s`);
  console.log(`  Humidity MAE:    ${optimization.expectedPerformance.customAI.humidityMAE}%`);
  console.log(`  Condition Acc:   ${(optimization.expectedPerformance.customAI.conditionAccuracy * 100).toFixed(1)}%`);
  console.log(`  Overall Score:   ${optimization.expectedPerformance.customAI.overallScore}/100`);

  console.log(`\n✓ Confidence: ${(optimization.confidence * 100).toFixed(0)}%`);
  console.log(`${optimization.recommended ? '✅' : '⚠️ '} ${optimization.reason}`);

  // 결과 저장
  const result = {
    analyzedAt: new Date().toISOString(),
    dataRange: {
      from: data[data.length - 1].date,
      to: data[0].date,
      days: data.length,
    },
    accuracy,
    optimization,
  };

  const outputPath = path.join(DATA_DIR, 'analysis', 'latest-optimization.json');
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(result, null, 2));

  console.log(`\n💾 Results saved to: ${outputPath}`);
}

main().catch(console.error);
