# 향후 기능 (Future Features)

**작성일**: 2025-10-08  
**목적**: 현재 리팩토링 범위에서 제외되었으나 향후 구현 가능한 기능 정리

---

## 📋 개요

이 문서는 Weather App의 향후 확장 가능한 기능들을 정리합니다. 각 기능은 우선순위, 예상 개발 기간, 필요 리소스와 함께 기록됩니다.

---

## 🤖 AI 기반 날씨 분석 시스템

### 개요

API 원본 데이터를 활용하여 AI가 날씨 제공자의 정확도를 분석하고, 패턴 학습 기반 예측을 수행하는 시스템

### 우선순위

⭐⭐⭐ (Medium-Low) - 핵심 기능 완성 후 고려

### 구현 가능한 기능

#### 1. 날씨 제공자 정확도 순위 (권장)

**목적**: 어느 API가 가장 정확한지 자동 분석

**데이터 수집**:
```typescript
// services/analytics/WeatherDataCollector.ts
export interface DailyWeatherComparison {
  date: string; // ISO 8601
  predictions: {
    openweather: CurrentWeather;
    weatherapi: CurrentWeather;
    openmeteo: CurrentWeather;
  };
  actual: CurrentWeather; // 기상청 또는 신뢰 가능한 소스
}

export class WeatherDataCollector {
  async collectDailyData(): Promise<DailyWeatherComparison> {
    const city = '서울';
    
    // 각 Provider에서 현재 날씨 조회
    const [ow, wa, om] = await Promise.all([
      openWeatherProvider.getCurrentWeather(city),
      weatherApiProvider.getCurrentWeather(city),
      openMeteoProvider.getCurrentWeather(city)
    ]);
    
    // 실제 날씨 (기상청 API)
    const actual = await kmaApi.getCurrentWeather(city);
    
    return {
      date: new Date().toISOString(),
      predictions: { openweather: ow, weatherapi: wa, openmeteo: om },
      actual: actual
    };
  }
}
```

**AI 분석** (OpenAI API):
```typescript
// services/analytics/ProviderAccuracyAnalyzer.ts
import OpenAI from 'openai';

export interface ProviderRanking {
  provider: string;
  score: number; // 0-100
  mae: number; // Mean Absolute Error (°C)
  accuracy: number; // 0-1
  metrics: {
    temperatureError: number;
    humidityError: number;
    weatherMatchRate: number;
  };
}

export class ProviderAccuracyAnalyzer {
  private openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  
  async analyzeAccuracy(history: DailyWeatherComparison[]): Promise<ProviderRanking[]> {
    const prompt = `
    다음은 ${history.length}일간의 날씨 예보 vs 실제 데이터입니다.
    
    각 제공자의 정확도를 다음 기준으로 평가하세요:
    1. 온도 정확도 (MAE: Mean Absolute Error)
    2. 습도 정확도
    3. 날씨 상태 일치율
    4. 종합 점수 (0-100)
    
    데이터:
    ${JSON.stringify(history, null, 2)}
    
    JSON 형식으로 순위를 출력하세요:
    {
      "rankings": [
        {
          "provider": "openweather",
          "score": 95,
          "mae": 0.8,
          "accuracy": 0.95,
          "metrics": {
            "temperatureError": 0.8,
            "humidityError": 2.5,
            "weatherMatchRate": 0.92
          }
        },
        ...
      ]
    }
    `;
    
    const response = await this.openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "당신은 기상 데이터 분석 전문가입니다." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    });
    
    const result = JSON.parse(response.choices[0].message.content!);
    return result.rankings;
  }
}
```

**자동화 스크립트**:
```bash
# scripts/daily-weather-collection.sh
# cron: 0 0 * * * (매일 자정 실행)

#!/bin/bash
cd /path/to/weather-app
node --loader ts-node/esm scripts/collect-daily-weather.ts
```

```typescript
// scripts/collect-daily-weather.ts
import { WeatherDataCollector } from '../services/analytics/WeatherDataCollector';
import { saveToDatabase } from '../services/database';

async function main() {
  const collector = new WeatherDataCollector();
  const todayData = await collector.collectDailyData();
  
  // DB에 저장 (IndexedDB 또는 백엔드)
  await saveToDatabase('weather_history', todayData);
  
  console.log(`✅ Collected weather data for ${todayData.date}`);
}

main();
```

**월간 분석 스크립트**:
```typescript
// scripts/monthly-analysis.ts
import { ProviderAccuracyAnalyzer } from '../services/analytics/ProviderAccuracyAnalyzer';
import { loadFromDatabase } from '../services/database';

async function main() {
  // 최근 30일 데이터 로드
  const history = await loadFromDatabase('weather_history', 30);
  
  if (history.length < 30) {
    console.log('⚠️ Not enough data (minimum 30 days required)');
    return;
  }
  
  const analyzer = new ProviderAccuracyAnalyzer();
  const rankings = await analyzer.analyzeAccuracy(history);
  
  console.log('📊 Provider Rankings (Last 30 Days):');
  rankings.forEach((rank, idx) => {
    console.log(`${idx + 1}. ${rank.provider}: ${rank.score}점 (MAE: ${rank.mae}°C)`);
  });
  
  // 결과 저장
  await saveToDatabase('provider_rankings', {
    date: new Date().toISOString(),
    rankings: rankings
  });
}

main();
```

**UI 컴포넌트** (관리자 페이지):
```vue
<!-- components/admin/ProviderRankings.vue -->
<template>
  <div class="rankings-container">
    <h2>Provider Accuracy Rankings</h2>
    <p class="subtitle">Based on last 30 days of data</p>
    
    <div v-if="loading" class="loading">Analyzing...</div>
    
    <table v-else class="rankings-table">
      <thead>
        <tr>
          <th>Rank</th>
          <th>Provider</th>
          <th>Score</th>
          <th>Temp Error (MAE)</th>
          <th>Weather Match Rate</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(rank, idx) in rankings" :key="rank.provider" :class="getRankClass(idx)">
          <td>{{ idx + 1 }}</td>
          <td>{{ rank.provider }}</td>
          <td>{{ rank.score }}/100</td>
          <td>{{ rank.mae }}°C</td>
          <td>{{ (rank.metrics.weatherMatchRate * 100).toFixed(1) }}%</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { loadFromDatabase } from '@/services/database';

const rankings = ref<ProviderRanking[]>([]);
const loading = ref(true);

onMounted(async () => {
  const latestRankings = await loadFromDatabase('provider_rankings', 1);
  rankings.value = latestRankings[0]?.rankings || [];
  loading.value = false;
});

function getRankClass(index: number): string {
  return index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'bronze' : '';
}
</script>

<style scoped>
.gold { background-color: #ffd700; }
.silver { background-color: #c0c0c0; }
.bronze { background-color: #cd7f32; }
</style>
```

**예상 비용**:
- 데이터 수집: 무료 (기존 API 활용)
- AI 분석: ~$1-3/월 (월 1회, GPT-4o)
- 저장소: IndexedDB (무료) 또는 백엔드 (~$5/월)

**예상 개발 기간**: 1-2주

**필요 리소스**:
- OpenAI API Key
- 기상청 API (실제 날씨 데이터) 또는 신뢰 가능한 소스
- 데이터 저장소 (IndexedDB 또는 백엔드 DB)

**우선순위**: ⭐⭐⭐⭐ (유용함)

---

#### 2. AI 패턴 기반 날씨 예측

**목적**: 과거 데이터 학습으로 미래 날씨 예측

**한계**:
```
❌ AI는 물리 법칙을 모름 (기압, 대기 순환 등)
❌ 기상청 슈퍼컴퓨터 대체 불가
⚠️ 단기 예측 (1-3일)에서만 제한적 활용 가능
```

**가능한 범위**:
- 단기 트렌드 예측 (오늘 20°C → 내일 21°C 예상)
- 계절 패턴 ("10월 초 서울은 보통 15-20°C")
- 유사 날 찾기 ("작년 이맘때와 비슷")

**구현 예시**:
```typescript
// services/analytics/WeatherPredictor.ts
export class WeatherPredictor {
  private openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  
  async predictTomorrow(city: string): Promise<PredictionResult> {
    // 1. 과거 1년 데이터 로드
    const history = await loadHistoricalData(city, 365);
    
    // 2. 현재 날씨
    const current = await weatherService.getWeather(city);
    
    // 3. AI 예측
    const prompt = `
    과거 1년간 ${city}의 날씨 데이터:
    ${JSON.stringify(history.slice(-30), null, 2)}
    
    현재 날씨:
    - 온도: ${current.temperature}°C
    - 습도: ${current.humidity}%
    - 날씨: ${current.description}
    
    내일 날씨를 예측하세요:
    1. 최근 30일 트렌드 분석
    2. 계절 패턴 고려
    3. 유사한 과거 사례 참고
    
    출력 (JSON):
    {
      "prediction": { "temp": 21, "condition": "맑음" },
      "confidence": 0.65,
      "reasoning": "최근 3일간 상승 추세, 10월 초 평균 기온 고려"
    }
    `;
    
    const response = await this.openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "기상 패턴 분석 전문가" },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    });
    
    return JSON.parse(response.choices[0].message.content!);
  }
}
```

**정확도 비교**:
| 예보 기간 | 기상청 | AI 패턴 예측 |
|-----------|--------|--------------|
| 1일 | 90-95% | 60-70% |
| 3일 | 80-85% | 40-50% |
| 7일 | 70-75% | 20-30% |

**예상 비용**: ~$10-20/월 (일 1회 예측)

**예상 개발 기간**: 2-3주

**우선순위**: ⭐⭐ (학술적 흥미, 실용성 낮음)

---

#### 3. 실시간 Provider 성능 모니터링

**목적**: Provider별 응답 시간, 가용성 실시간 추적

**구현**:
```typescript
// services/analytics/ProviderMonitor.ts
export class ProviderMonitor {
  async monitorProviders(): Promise<ProviderStatus[]> {
    const results = await Promise.allSettled([
      this.checkProvider('openweather', openWeatherProvider),
      this.checkProvider('weatherapi', weatherApiProvider),
      this.checkProvider('openmeteo', openMeteoProvider)
    ]);
    
    return results.map((result, idx) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          provider: ['openweather', 'weatherapi', 'openmeteo'][idx],
          status: 'error',
          error: result.reason.message
        };
      }
    });
  }
  
  private async checkProvider(
    name: string,
    provider: WeatherProvider
  ): Promise<ProviderStatus> {
    const startTime = Date.now();
    
    try {
      await provider.getCurrentWeather('서울');
      const responseTime = Date.now() - startTime;
      
      return {
        provider: name,
        status: 'available',
        responseTime: responseTime,
        lastCheck: new Date().toISOString()
      };
    } catch (error) {
      return {
        provider: name,
        status: 'unavailable',
        error: error.message,
        lastCheck: new Date().toISOString()
      };
    }
  }
}
```

**UI 표시**:
```vue
<!-- components/admin/ProviderStatus.vue -->
<template>
  <div class="provider-status">
    <h3>Provider Status (Real-time)</h3>
    <div v-for="status in providerStatuses" :key="status.provider" class="status-card">
      <div class="provider-name">{{ status.provider }}</div>
      <div :class="['status-indicator', status.status]">
        {{ status.status === 'available' ? '🟢 Available' : '🔴 Unavailable' }}
      </div>
      <div v-if="status.responseTime" class="response-time">
        {{ status.responseTime }}ms
      </div>
      <div v-if="status.error" class="error-message">{{ status.error }}</div>
    </div>
  </div>
</template>
```

**자동 fallback**:
```typescript
// services/WeatherService.ts
export class WeatherService {
  async getWeatherWithFallback(city: string): Promise<CurrentWeather> {
    const monitor = new ProviderMonitor();
    const statuses = await monitor.monitorProviders();
    
    // 가용한 Provider 찾기
    const availableProvider = statuses.find(s => s.status === 'available');
    
    if (!availableProvider) {
      throw new Error('모든 날씨 제공자를 사용할 수 없습니다');
    }
    
    // 가장 빠른 Provider 사용
    const fastestProvider = statuses
      .filter(s => s.status === 'available')
      .sort((a, b) => a.responseTime! - b.responseTime!)[0];
    
    return this.providers[fastestProvider.provider].getCurrentWeather(city);
  }
}
```

**예상 비용**: 무료 (기존 API 활용)

**예상 개발 기간**: 3-5일

**우선순위**: ⭐⭐⭐⭐ (실용적)

---

## 🎨 관리자 페이지

### 개요

날씨 API 관리, quota 추적, 통계 확인을 위한 관리자 전용 페이지

### 포함 기능

#### 1. Provider 선택 및 상태 관리

```vue
<!-- pages/admin/index.vue -->
<template>
  <div class="admin-container">
    <h1>Weather App Admin</h1>
    
    <!-- Provider 관리 -->
    <section class="provider-management">
      <h2>Provider Management</h2>
      
      <div v-for="provider in providers" :key="provider.name" class="provider-card">
        <div class="provider-header">
          <h3>{{ provider.name }}</h3>
          <toggle v-model="provider.enabled" @change="updateProvider(provider)" />
        </div>
        
        <div class="provider-details">
          <div class="detail-row">
            <span>Status:</span>
            <span :class="['status', getStatusClass(provider)]">
              {{ getStatusText(provider) }}
            </span>
          </div>
          
          <div class="detail-row">
            <span>Quota:</span>
            <span>{{ provider.quota.used }} / {{ provider.quota.limit }}</span>
            <progress 
              :value="provider.quota.used" 
              :max="provider.quota.limit"
              :class="getQuotaClass(provider.quota)"
            />
          </div>
          
          <div class="detail-row">
            <span>Response Time:</span>
            <span>{{ provider.avgResponseTime }}ms</span>
          </div>
        </div>
      </div>
    </section>
    
    <!-- Quota 통계 -->
    <section class="quota-statistics">
      <h2>Quota Statistics</h2>
      <chart :data="quotaChartData" type="line" />
    </section>
    
    <!-- Provider 순위 -->
    <section class="accuracy-rankings">
      <h2>Accuracy Rankings (Last 30 Days)</h2>
      <provider-rankings />
    </section>
  </div>
</template>
```

**UI 디자인**:
- OpenWeatherMap: 🟢 초록 (사용 가능, 350/1000 calls)
- MockWeather: 🟡 노란색 (관리자가 비활성화)
- WeatherAPI: 🔴 빨간색 (quota 80% 초과, 850/1000 calls)

**예상 개발 기간**: 1주

**우선순위**: ⭐⭐⭐⭐ (관리 편의성)

---

## 📊 고급 통계 및 시각화

### 구현 기능

1. **Provider별 정확도 트렌드** (선 그래프)
2. **일일 API 호출 현황** (막대 그래프)
3. **온도 예측 vs 실제** (비교 차트)
4. **지역별 날씨 히트맵**

**사용 라이브러리**: Chart.js 또는 Apache ECharts

**예상 개발 기간**: 1-2주

**우선순위**: ⭐⭐⭐ (선택사항)

---

## 🌍 확장 기능

### 1. 다국어 지원

- i18n 라이브러리 (vue-i18n)
- 영어, 한국어, 일본어, 중국어

**예상 개발 기간**: 3-5일

**우선순위**: ⭐⭐

### 2. 추가 날씨 Provider

- Visual Crossing
- Tomorrow.io
- AccuWeather

**예상 개발 기간**: 어댑터당 1-2일

**우선순위**: ⭐⭐⭐

### 3. 알림 기능

- 날씨 변화 알림 (큰 온도 변화, 비 예보)
- Quota 경고 알림
- Provider 장애 알림

**예상 개발 기간**: 1주

**우선순위**: ⭐⭐⭐⭐

---

## 📅 로드맵

### Phase 1 (현재 리팩토링)
- ✅ 어댑터 패턴 적용
- ✅ Mock Provider
- ✅ Quota 추적 (LocalStorage)

### Phase 2 (3개월 후)
- Provider 성능 모니터링
- 관리자 페이지 (기본)
- 자동 fallback

### Phase 3 (6개월 후)
- AI 정확도 분석 (30일 데이터 수집 필요)
- 관리자 페이지 (통계)
- 알림 기능

### Phase 4 (1년 후)
- AI 패턴 예측 (1년 데이터 필요)
- 다국어 지원
- 추가 Provider

---

## 💰 예상 비용 총합 (월간)

| 기능 | 비용 |
|------|------|
| AI 정확도 분석 | $1-3 |
| AI 패턴 예측 | $10-20 |
| 백엔드 DB (optional) | $5-10 |
| 추가 API (optional) | $0-50 |
| **총 예상** | **$16-83** |

---

## 📝 참고 사항

- 모든 기능은 **선택사항**입니다
- 우선순위는 **실용성 기준**으로 책정했습니다
- 개발 기간은 **1명 기준** 추정치입니다
- AI 관련 기능은 **데이터 수집 기간**이 추가로 필요합니다

---

**작성자**: Claude (AI)  
**최종 업데이트**: 2025-10-08
