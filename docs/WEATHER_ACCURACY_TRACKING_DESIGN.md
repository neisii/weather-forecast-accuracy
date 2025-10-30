# Weather Accuracy Tracking System Design

**작성일**: 2025-10-09  
**목적**: 날씨 예측 정확도 비교를 위한 데이터 수집 및 분석 시스템 설계

---

## 📋 목표

각 날씨 제공자(OpenWeatherMap, WeatherAPI, Open-Meteo)의 예측 정확도를 1개월 이상 추적하여:
1. 어느 Provider가 가장 정확한지 판단
2. 온도/습도/날씨 상태별 정확도 비교
3. 시간대별/계절별 정확도 패턴 분석

---

## 🎯 핵심 개념

### 문제 정의

**우리가 비교해야 할 것**:
```
T0 (오늘 자정): 각 Provider가 말하는 "내일(T1) 예상 날씨"
T1 (내일 자정): 각 Provider가 말하는 "오늘(T1) 현재 날씨"
→ T0의 예측이 T1의 실제와 얼마나 일치하는가?
```

**예시**:
```
2025-10-09 00:00 (T0):
- OpenWeather 예측: "내일(10/10) 서울 최고기온 22°C, 맑음"
- WeatherAPI 예측: "내일(10/10) 서울 최고기온 20°C, 맑음"
- OpenMeteo 예측: "내일(10/10) 서울 최고기온 21°C, 구름 조금"

2025-10-10 00:00 (T1):
- OpenWeather 현재: "오늘(10/10) 서울 최고기온 21°C, 맑음"
- WeatherAPI 현재: "오늘(10/10) 서울 최고기온 21°C, 맑음"
- OpenMeteo 현재: "오늘(10/10) 서울 최고기온 21°C, 맑음"

→ 정확도 계산:
- OpenWeather: |22-21| = 1°C 오차 ✅
- WeatherAPI: |20-21| = 1°C 오차 ✅
- OpenMeteo: |21-21| = 0°C 오차 ⭐ (가장 정확)
```

---

## 🏗️ 시스템 아키텍처

### Option A: 프론트엔드 중심 (권장 - Phase 1)

```
┌─────────────────────────────────────────┐
│     Browser (사용자 디바이스)           │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │ Service Worker / Background Task │  │
│  │ - 매일 자정 실행                  │  │
│  │ - 예보 수집                       │  │
│  │ - 실제 날씨 비교                  │  │
│  └──────────────────────────────────┘  │
│              ↓          ↑               │
│  ┌──────────────────────────────────┐  │
│  │      IndexedDB (로컬 저장소)     │  │
│  │ - predictions 테이블              │  │
│  │ - actual_weather 테이블           │  │
│  │ - accuracy_scores 테이블          │  │
│  └──────────────────────────────────┘  │
│              ↓                          │
│  ┌──────────────────────────────────┐  │
│  │   AI Analysis (OpenAI API)       │  │
│  │ - 월 1회 실행                     │  │
│  │ - Provider 순위 생성              │  │
│  └──────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

**장점**:
- ✅ 백엔드 서버 불필요
- ✅ 빠른 구현 가능
- ✅ 사용자 데이터 로컬 보관 (프라이버시)

**단점**:
- ❌ 사용자 디바이스가 꺼져있으면 데이터 수집 안 됨
- ❌ 여러 디바이스 간 데이터 동기화 불가
- ❌ Service Worker 지원 브라우저만 가능

**적합한 경우**:
- 개인 프로젝트 또는 PoC (Proof of Concept)
- 빠르게 시작하고 싶은 경우

---

### Option B: 백엔드 중심 (권장 - Phase 2)

```
┌──────────────────────────────────────────┐
│         Frontend (Vue App)               │
│  - 순위 조회 및 표시                     │
│  - 관리자 페이지                         │
└──────────────────────────────────────────┘
              ↓ HTTP API
┌──────────────────────────────────────────┐
│      Backend Server (Node.js/Python)     │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │     Cron Job (Daily 00:00 UTC)     │ │
│  │  1. Collect tomorrow's forecast    │ │
│  │  2. Compare yesterday's prediction │ │
│  │  3. Calculate accuracy scores      │ │
│  └────────────────────────────────────┘ │
│              ↓          ↑                │
│  ┌────────────────────────────────────┐ │
│  │    Database (PostgreSQL/MongoDB)   │ │
│  │  - weather_predictions             │ │
│  │  - weather_actual                  │ │
│  │  - provider_accuracy_scores        │ │
│  └────────────────────────────────────┘ │
│              ↓                           │
│  ┌────────────────────────────────────┐ │
│  │  AI Analysis API (Monthly)         │ │
│  │  - GPT-4o for pattern analysis     │ │
│  │  - Generate provider rankings      │ │
│  └────────────────────────────────────┘ │
└──────────────────────────────────────────┘
```

**장점**:
- ✅ 안정적인 데이터 수집 (서버 항상 켜져있음)
- ✅ 여러 도시/지역 동시 추적 가능
- ✅ 중앙화된 데이터 관리
- ✅ 여러 사용자 간 데이터 공유 가능

**단점**:
- ❌ 백엔드 서버 비용 ($5-20/월)
- ❌ 구현 시간 증가
- ❌ 인프라 관리 필요

**적합한 경우**:
- 실제 서비스로 운영할 경우
- 여러 사용자에게 공유할 경우

---

## 📊 데이터 모델

### 1. Predictions (예측 데이터)

```typescript
interface WeatherPrediction {
  id: string;                    // UUID
  city: string;                  // "서울"
  provider: ProviderType;        // "openweather" | "weatherapi" | "openmeteo"
  
  // 예측 시점
  predicted_at: string;          // ISO 8601, "2025-10-09T00:00:00Z"
  target_date: string;           // ISO 8601, "2025-10-10" (예측 대상일)
  
  // 예측 데이터
  predicted_temp_max: number;    // 최고 기온 (°C)
  predicted_temp_min: number;    // 최저 기온 (°C)
  predicted_humidity: number;    // 습도 (%)
  predicted_condition: string;   // "맑음", "흐림", "비" 등
  predicted_wind_kph: number;    // 풍속 (km/h)
  
  // 메타데이터
  created_at: string;            // ISO 8601
}
```

**예시 데이터**:
```json
{
  "id": "uuid-1",
  "city": "서울",
  "provider": "openweather",
  "predicted_at": "2025-10-09T00:00:00Z",
  "target_date": "2025-10-10",
  "predicted_temp_max": 22,
  "predicted_temp_min": 15,
  "predicted_humidity": 60,
  "predicted_condition": "맑음",
  "predicted_wind_kph": 10,
  "created_at": "2025-10-09T00:00:05Z"
}
```

---

### 2. ActualWeather (실제 날씨)

```typescript
interface ActualWeather {
  id: string;                    // UUID
  city: string;                  // "서울"
  date: string;                  // ISO 8601, "2025-10-10"
  
  // 실제 날씨 (하루의 대표값)
  actual_temp_max: number;       // 최고 기온 (°C)
  actual_temp_min: number;       // 최저 기온 (°C)
  actual_humidity_avg: number;   // 평균 습도 (%)
  actual_condition: string;      // "맑음", "흐림", "비" 등
  actual_wind_kph_avg: number;   // 평균 풍속 (km/h)
  
  // 수집 방법
  source: string;                // "consensus" | "kma" | "provider_avg"
  collected_at: string;          // ISO 8601
}
```

**실제 날씨 결정 방법**:

#### Option 1: Consensus (Provider 합의) - 권장
```typescript
// 3개 Provider의 현재 날씨 평균값을 "실제"로 간주
actual_temp_max = (openweather.temp + weatherapi.temp + openmeteo.temp) / 3
```

**장점**:
- 추가 API 불필요
- 구현 간단

**단점**:
- Provider들이 모두 틀리면 "실제"도 틀림

#### Option 2: 기상청 API 활용
```typescript
// 기상청(KMA) 공식 데이터를 "실제"로 간주
actual_temp_max = kma.getCurrentWeather('서울').temp
```

**장점**:
- 공식 데이터로 신뢰도 높음

**단점**:
- 기상청 API 추가 연동 필요
- Rate limit 고려 필요

**권장**: **Option 1 (Consensus)** → 충분한 데이터 확보 후 Option 2 고려

---

### 3. AccuracyScores (정확도 점수)

```typescript
interface AccuracyScore {
  id: string;                    // UUID
  city: string;                  // "서울"
  provider: ProviderType;        // "openweather"
  target_date: string;           // "2025-10-10"
  
  // 오차 계산 (MAE: Mean Absolute Error)
  temp_max_error: number;        // |predicted - actual|
  temp_min_error: number;        // |predicted - actual|
  humidity_error: number;        // |predicted - actual|
  wind_error: number;            // |predicted - actual|
  
  // 날씨 상태 일치 여부
  condition_match: boolean;      // true if 맑음 == 맑음
  
  // 종합 점수 (0-100)
  overall_score: number;         // 100 - (weighted error sum)
  
  // 메타데이터
  calculated_at: string;         // ISO 8601
}
```

**점수 계산 알고리즘**:
```typescript
function calculateOverallScore(score: AccuracyScore): number {
  const tempWeight = 0.4;      // 온도가 가장 중요
  const humidityWeight = 0.2;
  const windWeight = 0.1;
  const conditionWeight = 0.3; // 날씨 상태도 중요
  
  // 오차를 0-100 점수로 변환
  const tempScore = Math.max(0, 100 - score.temp_max_error * 10);
  const humidityScore = Math.max(0, 100 - score.humidity_error);
  const windScore = Math.max(0, 100 - score.wind_error);
  const conditionScore = score.condition_match ? 100 : 0;
  
  return (
    tempScore * tempWeight +
    humidityScore * humidityWeight +
    windScore * windWeight +
    conditionScore * conditionWeight
  );
}
```

---

## 🔄 데이터 수집 워크플로우

### Daily Job (매일 00:00 UTC 실행)

```typescript
// services/accuracy/DailyWeatherCollector.ts

export class DailyWeatherCollector {
  async runDailyJob(): Promise<void> {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    console.log(`[DailyJob] Running for ${today.toISOString()}`);
    
    // Step 1: 내일 예보 수집
    await this.collectPredictions(tomorrow);
    
    // Step 2: 어제 예측과 오늘 실제 비교
    await this.compareAndScore(today);
    
    console.log('[DailyJob] Completed');
  }
  
  private async collectPredictions(targetDate: Date): Promise<void> {
    const cities = ['서울', '부산', '인천', '대구', '대전', '광주', '울산', '제주'];
    
    for (const city of cities) {
      // 각 Provider에서 내일 예보 수집
      const predictions = await Promise.all([
        this.getPredictionFrom('openweather', city, targetDate),
        this.getPredictionFrom('weatherapi', city, targetDate),
        this.getPredictionFrom('openmeteo', city, targetDate)
      ]);
      
      // IndexedDB 또는 DB에 저장
      for (const prediction of predictions) {
        await this.savePrediction(prediction);
      }
      
      console.log(`[Collect] ${city} predictions saved for ${targetDate.toISOString()}`);
    }
  }
  
  private async getPredictionFrom(
    provider: ProviderType,
    city: string,
    targetDate: Date
  ): Promise<WeatherPrediction> {
    // Provider에서 예보 API 호출
    // 주의: OpenWeatherMap/WeatherAPI는 Forecast API 사용 필요
    const forecast = await this.weatherService.getForecast(provider, city);
    
    // targetDate에 해당하는 예보 추출
    const targetForecast = forecast.daily.find(day => 
      new Date(day.date).toDateString() === targetDate.toDateString()
    );
    
    return {
      id: generateUUID(),
      city: city,
      provider: provider,
      predicted_at: new Date().toISOString(),
      target_date: targetDate.toISOString().split('T')[0],
      predicted_temp_max: targetForecast.temp_max,
      predicted_temp_min: targetForecast.temp_min,
      predicted_humidity: targetForecast.humidity,
      predicted_condition: targetForecast.condition,
      predicted_wind_kph: targetForecast.wind_kph,
      created_at: new Date().toISOString()
    };
  }
  
  private async compareAndScore(today: Date): Promise<void> {
    const cities = ['서울', '부산', '인천', '대구', '대전', '광주', '울산', '제주'];
    const todayStr = today.toISOString().split('T')[0];
    
    for (const city of cities) {
      // Step 2-1: 어제 저장된 예측들 로드
      const predictions = await this.loadPredictions(city, todayStr);
      
      // Step 2-2: 오늘의 실제 날씨 수집 (Consensus)
      const actual = await this.collectActualWeather(city, today);
      
      // Step 2-3: 각 Provider 정확도 계산
      for (const prediction of predictions) {
        const score = this.calculateAccuracy(prediction, actual);
        await this.saveAccuracyScore(score);
      }
      
      console.log(`[Compare] ${city} accuracy scores calculated for ${todayStr}`);
    }
  }
  
  private async collectActualWeather(
    city: string,
    date: Date
  ): Promise<ActualWeather> {
    // Consensus 방식: 3개 Provider의 현재 날씨 평균
    const [ow, wa, om] = await Promise.all([
      this.weatherService.getCurrentWeather('openweather', city),
      this.weatherService.getCurrentWeather('weatherapi', city),
      this.weatherService.getCurrentWeather('openmeteo', city)
    ]);
    
    return {
      id: generateUUID(),
      city: city,
      date: date.toISOString().split('T')[0],
      actual_temp_max: (ow.temp + wa.temp + om.temp) / 3,
      actual_temp_min: Math.min(ow.temp, wa.temp, om.temp), // 임시
      actual_humidity_avg: (ow.humidity + wa.humidity + om.humidity) / 3,
      actual_condition: this.getConsensusCondition([ow, wa, om]),
      actual_wind_kph_avg: (ow.wind_kph + wa.wind_kph + om.wind_kph) / 3,
      source: 'consensus',
      collected_at: new Date().toISOString()
    };
  }
  
  private calculateAccuracy(
    prediction: WeatherPrediction,
    actual: ActualWeather
  ): AccuracyScore {
    const tempError = Math.abs(prediction.predicted_temp_max - actual.actual_temp_max);
    const humidityError = Math.abs(prediction.predicted_humidity - actual.actual_humidity_avg);
    const windError = Math.abs(prediction.predicted_wind_kph - actual.actual_wind_kph_avg);
    const conditionMatch = prediction.predicted_condition === actual.actual_condition;
    
    const score: AccuracyScore = {
      id: generateUUID(),
      city: prediction.city,
      provider: prediction.provider,
      target_date: prediction.target_date,
      temp_max_error: tempError,
      temp_min_error: 0, // TODO: 최저 기온 추가
      humidity_error: humidityError,
      wind_error: windError,
      condition_match: conditionMatch,
      overall_score: 0, // 아래에서 계산
      calculated_at: new Date().toISOString()
    };
    
    score.overall_score = calculateOverallScore(score);
    
    return score;
  }
}
```

---

### Monthly Analysis (매월 1일 실행)

```typescript
// services/accuracy/MonthlyAccuracyAnalyzer.ts

export class MonthlyAccuracyAnalyzer {
  private openai = new OpenAI({ apiKey: process.env.VITE_OPENAI_API_KEY });
  
  async runMonthlyAnalysis(): Promise<ProviderRanking[]> {
    console.log('[MonthlyAnalysis] Starting...');
    
    // Step 1: 최근 30일 정확도 데이터 로드
    const scores = await this.loadRecentScores(30);
    
    if (scores.length < 30) {
      throw new Error(`Insufficient data: ${scores.length} days (minimum 30 required)`);
    }
    
    // Step 2: 기본 통계 계산
    const basicStats = this.calculateBasicStats(scores);
    
    // Step 3: AI 분석 (GPT-4o)
    const aiAnalysis = await this.analyzeWithAI(scores, basicStats);
    
    // Step 4: 순위 저장
    await this.saveRankings(aiAnalysis.rankings);
    
    console.log('[MonthlyAnalysis] Completed');
    return aiAnalysis.rankings;
  }
  
  private calculateBasicStats(scores: AccuracyScore[]): ProviderStats[] {
    const providers: ProviderType[] = ['openweather', 'weatherapi', 'openmeteo'];
    
    return providers.map(provider => {
      const providerScores = scores.filter(s => s.provider === provider);
      
      const avgTempError = average(providerScores.map(s => s.temp_max_error));
      const avgHumidityError = average(providerScores.map(s => s.humidity_error));
      const conditionMatchRate = providerScores.filter(s => s.condition_match).length / providerScores.length;
      const avgOverallScore = average(providerScores.map(s => s.overall_score));
      
      return {
        provider,
        avgTempError,
        avgHumidityError,
        conditionMatchRate,
        avgOverallScore,
        sampleSize: providerScores.length
      };
    });
  }
  
  private async analyzeWithAI(
    scores: AccuracyScore[],
    basicStats: ProviderStats[]
  ): Promise<AIAnalysisResult> {
    const prompt = `
다음은 최근 30일간 3개 날씨 제공자의 예측 정확도 데이터입니다.

## 기본 통계
${JSON.stringify(basicStats, null, 2)}

## 상세 데이터 (샘플 10개)
${JSON.stringify(scores.slice(0, 10), null, 2)}

## 분석 요청
1. 각 제공자의 강점과 약점을 분석하세요
2. 온도/습도/날씨 상태 중 어느 항목이 가장 정확한지 평가하세요
3. 최종 순위를 1-3위로 매기고 이유를 설명하세요
4. 종합 점수(0-100)를 부여하세요

## 출력 형식 (JSON)
{
  "rankings": [
    {
      "rank": 1,
      "provider": "openmeteo",
      "score": 87.5,
      "strengths": ["온도 정확도 매우 높음", "날씨 상태 일치율 90%"],
      "weaknesses": ["습도 오차 다소 큼"],
      "recommendation": "전반적으로 가장 정확하며 특히 온도 예측에 강점"
    },
    ...
  ],
  "insights": [
    "3개 제공자 모두 맑은 날씨 예측이 가장 정확함",
    "비 예보는 WeatherAPI가 가장 정확"
  ]
}
`;

    const response = await this.openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { 
          role: "system", 
          content: "당신은 기상 데이터 분석 전문가입니다. 통계적 사실에 기반하여 객관적으로 분석하세요." 
        },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    });
    
    return JSON.parse(response.choices[0].message.content!);
  }
}
```

---

## 🚀 구현 단계

### Phase 1: 기본 데이터 수집 (2주)

**목표**: 30일간 예측 데이터 수집

**구현 항목**:
1. ✅ Forecast API 연동
   - OpenWeatherMap: `/forecast` endpoint
   - WeatherAPI.com: `/forecast.json` endpoint
   - Open-Meteo: `daily` 파라미터 활용

2. ✅ IndexedDB 스키마 생성
   - `predictions` 테이블
   - `actual_weather` 테이블
   - `accuracy_scores` 테이블

3. ✅ DailyWeatherCollector 구현
   - 매일 자정 예보 수집
   - 실제 날씨 수집 (Consensus 방식)
   - 정확도 계산

4. ✅ Service Worker 설정
   - 백그라운드 작업 스케줄링
   - `chrome.alarms` API 또는 `setInterval` 활용

**예상 작업 시간**: 16-20시간

---

### Phase 2: 정확도 분석 (1주)

**목표**: 30일 데이터 기반 Provider 순위 생성

**구현 항목**:
1. ✅ MonthlyAccuracyAnalyzer 구현
   - 기본 통계 계산 (평균, 표준편차)
   - AI 분석 (GPT-4o)
   - 순위 생성

2. ✅ UI 컴포넌트
   - ProviderRankings.vue (순위 표시)
   - AccuracyChart.vue (정확도 그래프)
   - HistoricalComparison.vue (시계열 비교)

**예상 작업 시간**: 10-12시간

---

### Phase 3: 관리자 대시보드 (1주)

**목표**: 데이터 시각화 및 관리 기능

**구현 항목**:
1. ✅ 관리자 페이지 (`/admin`)
   - 데이터 수집 현황
   - 수동 데이터 수집 트리거
   - 데이터 내보내기 (CSV/JSON)

2. ✅ 차트 라이브러리 연동
   - Chart.js 또는 Apache ECharts
   - 선 그래프, 막대 그래프, 히트맵

**예상 작업 시간**: 8-10시간

---

## 💡 주요 질문과 답변

### Q1: 왜 "내일 예보"를 저장해야 하나요? 오늘 날씨만 비교하면 안 되나요?

**A**: 날씨 예보의 목적은 "미래를 예측"하는 것입니다. 오늘 현재 날씨는 이미 관측된 데이터이므로 예측이 아닙니다.

```
❌ 잘못된 비교:
  T0 (오늘): OpenWeather "현재 20°C"
  T0 (오늘): WeatherAPI "현재 19°C"
  → 어느 것이 정확한가? (둘 다 현재 관측값)

✅ 올바른 비교:
  T-1 (어제): OpenWeather "내일(오늘) 22°C로 예상"
  T0 (오늘): OpenWeather "현재 21°C"
  → 1°C 오차 = 예측 정확도 측정 가능
```

---

### Q2: Forecast API가 없는 Provider는 어떻게 하나요?

**A**: 모든 주요 Provider가 Forecast API를 제공합니다.

| Provider | Forecast API | 무료 제공 |
|----------|--------------|-----------|
| OpenWeatherMap | `/forecast` (5일/3시간) | ✅ 60 calls/min |
| WeatherAPI.com | `/forecast.json` (3일) | ✅ Free tier |
| Open-Meteo | `daily` (7일) | ✅ 무제한 |

**구현 필요**:
```typescript
// src/adapters/weather/WeatherProvider.ts
export interface WeatherProvider {
  getCurrentWeather(city: string): Promise<CurrentWeather>;
  getForecast(city: string, days: number): Promise<WeatherForecast>; // ← 추가
  checkQuota(): Promise<QuotaInfo>;
}
```

---

### Q3: 30일 동안 사용자가 앱을 안 켜면 데이터 수집이 안 되지 않나요?

**A**: **Service Worker**가 해결책입니다.

```typescript
// public/service-worker.js
self.addEventListener('install', (event) => {
  console.log('Service Worker installed');
});

// 매일 자정에 실행되도록 알람 설정
chrome.alarms.create('daily-weather-collection', {
  when: getNextMidnight(),
  periodInMinutes: 1440 // 24시간
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'daily-weather-collection') {
    const collector = new DailyWeatherCollector();
    await collector.runDailyJob();
  }
});
```

**제약사항**:
- Chrome/Edge: ✅ 지원 (`chrome.alarms`)
- Firefox: ⚠️ 제한적 지원
- Safari: ❌ 미지원

**대안 (백엔드 없이)**:
- 사용자가 앱을 열 때마다 "누락된 날짜"를 확인하여 보충
- 예: 3일 동안 안 열었으면 → 지난 3일 데이터를 소급 수집

---

### Q4: IndexedDB vs 백엔드 DB, 어느 것이 나을까요?

| 기준 | IndexedDB | 백엔드 DB |
|------|-----------|-----------|
| 구현 속도 | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| 안정성 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 비용 | 무료 | $5-20/월 |
| 데이터 공유 | ❌ | ✅ |
| 프라이버시 | ✅ (로컬 저장) | ⚠️ (서버 저장) |

**권장 전략**:
1. **Phase 1**: IndexedDB로 시작 (빠른 PoC)
2. **Phase 2**: 30일 데이터 확보 후 백엔드 마이그레이션 고려

---

### Q5: AI 분석 비용은 얼마나 드나요?

**예상 비용** (GPT-4o):
- 입력 토큰: ~2,000 (30일 데이터 요약)
- 출력 토큰: ~500 (순위 + 분석)
- 총 비용: ~$0.05/회
- 월 1회 실행: **$0.05/월**

**참고**: GPT-4o-mini 사용 시 **$0.01/월** 이하

---

## 📌 다음 단계

### 즉시 시작 가능한 작업 (Phase 1)

1. **Forecast API 연동** (우선순위: 최상)
   - `src/adapters/weather/WeatherProvider.ts`에 `getForecast()` 추가
   - 각 Adapter 구현 (OpenWeather, WeatherAPI, OpenMeteo)

2. **IndexedDB 설정** (우선순위: 높음)
   - `src/services/database/WeatherDB.ts` 생성
   - Dexie.js 또는 idb 라이브러리 사용

3. **DailyWeatherCollector 구현** (우선순위: 높음)
   - 예보 수집 로직
   - 실제 날씨 수집 (Consensus)
   - 정확도 계산

4. **Service Worker 설정** (우선순위: 중간)
   - 매일 자정 실행 스케줄링

---

## 🤔 사용자 의사결정 필요 사항

### 질문 1: 데이터 저장 방식

**Option A**: IndexedDB (프론트엔드만)
- ✅ 빠른 구현
- ✅ 무료
- ❌ 사용자 디바이스 의존

**Option B**: 백엔드 서버 + DB
- ✅ 안정적
- ✅ 데이터 공유 가능
- ❌ 서버 비용

**Option C**: Hybrid (IndexedDB → 나중에 백엔드 마이그레이션)
- ✅ 빠른 시작
- ✅ 나중에 확장 가능

**어느 방식을 선호하시나요?**

---

### 질문 2: "실제 날씨" 판단 기준

**Option A**: Consensus (3개 Provider 평균)
- ✅ 추가 API 불필요
- ❌ Provider 모두 틀리면 정확도 측정 불가

**Option B**: 기상청 API
- ✅ 공식 데이터
- ❌ API 연동 추가 작업

**어느 방식을 선호하시나요?**

---

### 질문 3: 데이터 수집 도시 범위

**Option A**: 8개 도시 (현재 cityCoordinates)
- 서울, 부산, 인천, 대구, 대전, 광주, 울산, 제주

**Option B**: 서울만 (빠른 PoC)
- 데이터 수집 속도 빠름
- 나중에 확장 가능

**어느 방식을 선호하시나요?**

---

### 질문 4: AI 분석 주기

**Option A**: 월 1회
- 비용: $0.05/월
- 충분한 데이터 (30일)

**Option B**: 주 1회
- 비용: $0.20/월
- 더 빈번한 순위 업데이트

**어느 방식을 선호하시나요?**

---

**작성자**: Claude (AI)  
**작성일**: 2025-10-09  
**버전**: 1.0
