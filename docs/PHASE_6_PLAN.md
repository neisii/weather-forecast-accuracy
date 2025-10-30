# Phase 6: Weather Accuracy Tracking System - Implementation Plan

**작성일**: 2025-10-09  
**목적**: 30일 이상 날씨 예측 데이터 수집 및 정확도 분석 시스템 구축

---

## 📋 목표

각 날씨 제공자(OpenWeatherMap, WeatherAPI, Open-Meteo)의 **예측 일관성**을 추적하여:
1. 어느 Provider의 예보가 자체 관측값과 가장 일치하는지 분석
2. Provider 간 상대적 일관성 순위 도출
3. 날씨 상태별/시간대별 정확도 패턴 파악

---

## 🎯 사용자 의사결정 (확정)

### ✅ 질문 2: "실제 날씨" 판단 기준

**사용자 질문**:
```
2025-10-01 예보: "흐림"
2025-10-02 실제: "맑음", 예보: "뇌우"
2025-10-03 실제: "흐림", 예보: "맑음"
2025-10-04 실제: "맑음"

과거 데이터 조회 시 결과는? (맑음 vs 흐림)
3개 Provider 평균이 의미 있는 데이터인가?
```

**분석 결과**:

#### 문제 1: Consensus 방식의 한계
```
문제: 순환 논리
→ 3개 Provider 평균을 "실제"로 정의
→ 각 Provider를 평균과 비교
→ 평균에 가까운 Provider가 "정확"하다고 판단

위험:
→ 3개 Provider가 모두 틀리면 평균도 틀림
→ "평균에 가까운" ≠ "실제로 정확한"

예시:
실제: 20°C
예측: 18°C, 19°C, 25°C
평균: 20.7°C (우연히 실제와 비슷)

예측: 15°C, 16°C, 17°C
평균: 16°C (실제와 4°C 차이)
→ 3개 Provider 모두 틀렸는데 서로 일치함
```

#### 해결책: 상대적 일관성 분석

**채택 방식**: **자체 예측 vs 자체 관측 일치도**

```typescript
// 각 Provider를 자기 자신과 비교
interface PredictionConsistency {
  provider: ProviderType;
  date: string;
  
  // D-1일의 "D일 예보"
  forecast_yesterday: {
    temp: number;
    condition: string;
  };
  
  // D일의 "D일 현재 날씨"
  observed_today: {
    temp: number;
    condition: string;
  };
  
  // 일치도
  consistency_score: number; // |forecast - observed|
}
```

**장점**:
- ✅ 각 Provider를 독립적으로 평가
- ✅ "실제 날씨"의 절대 기준 불필요
- ✅ 순환 논리 회피
- ✅ Provider의 자체 일관성 측정

**분석 목표 변경**:
```
❌ "어느 Provider가 실제에 가장 가까운가?"
✅ "어느 Provider의 예보가 자신의 관측값과 가장 일치하는가?"
```

**최종 결정**: 
- **기상청(KMA) API는 보류** (현재 사용 불가)
- **Consensus는 보조 지표로만 활용** (Provider 간 합의도 측정)
- **주 평가 방식은 자체 일관성**

---

### ✅ 질문 3: 데이터 수집 도시

**결정**: **Option B - 서울만** (빠른 PoC)

**이유**:
- 단기간(4-8주) 검증 목적
- 데이터 수집 속도 향상
- 구현 및 분석 단순화
- 검증 후 8개 도시로 확대

**확대 로드맵**:
```
Phase 6 (Week 1-4): 서울만 수집
Phase 6.5 (Week 5-8): 데이터 분석 및 검증
Phase 7: 8개 도시 확대 (서울, 부산, 인천, 대구, 대전, 광주, 울산, 제주)
```

---

### ✅ 질문 4: AI 분석 주기

**결정**: **Option B - 주 1회** (빠른 피드백)

**이유**:
- 단기간에 PoC 결과 확인
- 데이터 수집 품질 모니터링
- 문제 조기 발견 및 수정
- 점진적 확대 전략

**분석 스케줄**:
```
Week 1: 7일 데이터 → 첫 분석 (신뢰도 낮음, 트렌드 확인)
Week 2: 14일 데이터 → 두 번째 분석 (패턴 감지)
Week 3: 21일 데이터 → 세 번째 분석 (신뢰도 증가)
Week 4: 28일 데이터 → 최종 분석 (통계적 유의미성)
```

**비용 계산**:
- 주 1회 분석: $0.05/회
- 4주 총 비용: $0.20
- 이후 월 1회로 전환 가능

---

### ⏳ 질문 1: 데이터 저장 방식 (보류 중)

**사용자 요구사항**:
- 비용 없는 방향 선호
- 복잡하지 않은 방식
- 데이터베이스에 즉시 저장 필수 아님

**조사 대상**: 다른 사람들의 주기적 데이터 수집 운용 사례 (특히 날씨 데이터)

---

## 🔍 주기적 데이터 수집 사례 조사

### Case 1: GitHub Actions (추천 ⭐⭐⭐⭐⭐)

**개요**: GitHub의 무료 CI/CD 서비스로 cron 스케줄 실행

**실제 날씨 데이터 수집 예시**:
- [actions-weather-data-logger](https://github.com/Danigy/actions-weather-data-logger)
  - Python 스크립트로 주 1회 API 호출
  - 응답을 `status.log`에 저장
  - 자동으로 Git commit & push
  - 데이터가 GitHub repository에 누적

**구현 방법**:
```yaml
# .github/workflows/collect-weather.yml
name: Daily Weather Collection

on:
  schedule:
    # 매일 자정 UTC (한국 시간 오전 9시)
    - cron: '0 0 * * *'
  workflow_dispatch: # 수동 실행 가능

jobs:
  collect:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Collect weather data
        run: node scripts/collect-daily-weather.js
        env:
          VITE_OPENWEATHER_API_KEY: ${{ secrets.OPENWEATHER_API_KEY }}
          VITE_WEATHERAPI_API_KEY: ${{ secrets.WEATHERAPI_API_KEY }}
      
      - name: Commit and push data
        run: |
          git config --local user.email "github-actions[bot]@users.noreply.github.com"
          git config --local user.name "github-actions[bot]"
          git add data/predictions/*.json
          git diff --quiet && git diff --staged --quiet || git commit -m "chore: collect weather data $(date +'%Y-%m-%d')"
          git push
```

**데이터 저장 방식**:
```javascript
// scripts/collect-daily-weather.js
const fs = require('fs').promises;
const path = require('path');

async function collectData() {
  const today = new Date().toISOString().split('T')[0];
  const data = {
    date: today,
    predictions: {
      openweather: await fetchOpenWeather(),
      weatherapi: await fetchWeatherAPI(),
      openmeteo: await fetchOpenMeteo()
    }
  };
  
  // JSON 파일로 저장 (Git에 commit됨)
  const filePath = path.join(__dirname, '../data/predictions', `${today}.json`);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  
  console.log(`✅ Data saved: ${filePath}`);
}

collectData();
```

**장점**:
- ✅ **완전 무료** (GitHub Actions 월 2,000분 제공)
- ✅ 데이터가 Git repository에 저장 (버전 관리)
- ✅ 설정 간단 (YAML 파일 하나)
- ✅ Secret 관리 기능 (API Key 보안)
- ✅ 수동 실행 가능 (테스트 편리)
- ✅ 로컬 환경 불필요 (GitHub 서버에서 실행)

**단점**:
- ⚠️ 최소 간격 5분 (하지만 우리는 일 1회라 문제없음)
- ⚠️ 60일 비활성 시 자동 비활성화 (push 1회로 재활성화)
- ⚠️ UTC 시간대만 지원 (한국 시간 계산 필요)

**적합성**: ⭐⭐⭐⭐⭐
- 우리 요구사항에 완벽히 부합
- 무료, 간단, 안정적
- Git에 데이터 누적 (파일 기반)

---

### Case 2: Vercel Cron Jobs (제한적 무료)

**개요**: Vercel의 Serverless Functions를 스케줄 실행

**구현 방법**:
```javascript
// api/cron/collect-weather.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // Vercel Cron 인증 (선택)
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const today = new Date().toISOString().split('T')[0];
  const data = await collectWeatherData();
  
  // Vercel KV (Redis) 또는 외부 DB에 저장
  // 또는 GitHub API로 commit
  
  return res.status(200).json({ success: true, date: today });
}
```

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/collect-weather",
      "schedule": "0 0 * * *"
    }
  ]
}
```

**Free Tier 제약**:
- ⚠️ **최대 2개 cron job**
- ⚠️ **시간 단위만 가능** (분 단위 불가)
- ⚠️ 분 정밀도 보장 안 됨

**장점**:
- ✅ 무료 (Free tier 제공)
- ✅ Serverless (관리 불필요)
- ✅ 한국 시간대 지원 가능

**단점**:
- ❌ 2개 cron만 가능 (확장성 낮음)
- ❌ 데이터 저장소 별도 필요
- ⚠️ Free tier는 시간 단위만 (우리는 일 1회라 괜찮음)

**적합성**: ⭐⭐⭐
- 작동은 하지만 제약이 있음
- 데이터 저장소 고민 필요
- GitHub Actions가 더 나음

---

### Case 3: cron-job.org (외부 스케줄러)

**개요**: 무료 외부 cron 스케줄러 서비스

**작동 방식**:
1. cron-job.org에 계정 생성
2. 우리 API endpoint URL 등록
3. 스케줄 설정 (예: 매일 자정)
4. cron-job.org가 정해진 시간에 URL 호출

**우리 API endpoint** (로컬 서버 또는 Vercel):
```javascript
// api/webhook/collect-weather.js
export default async function handler(req, res) {
  // cron-job.org에서 호출됨
  
  const data = await collectWeatherData();
  
  // GitHub API로 직접 commit
  await commitToGitHub(data);
  
  return res.status(200).json({ success: true });
}
```

**Free Tier**:
- ✅ 시간당 최대 60회 실행
- ✅ 분 단위 스케줄 가능
- ✅ 이메일 알림

**장점**:
- ✅ 완전 무료
- ✅ 분 단위 정밀도
- ✅ 로컬 서버가 꺼져있어도 동작

**단점**:
- ❌ 외부 서비스 의존
- ❌ API endpoint 노출 필요 (보안 고려)
- ❌ 로컬 서버 또는 Vercel 필요

**적합성**: ⭐⭐
- 너무 복잡함
- GitHub Actions보다 장점 없음

---

## 🎯 최종 권장: GitHub Actions

### 채택 이유

1. **완전 무료**
   - GitHub Actions 월 2,000분 제공
   - 일 1회 실행 = 월 약 30분 사용
   - 충분한 여유

2. **데이터 저장 간단**
   - JSON 파일로 저장
   - Git에 자동 commit
   - 별도 DB 불필요

3. **버전 관리**
   - 모든 데이터가 Git history에 보존
   - 특정 날짜 데이터 롤백 가능
   - 투명한 데이터 추적

4. **보안**
   - GitHub Secrets로 API Key 관리
   - Public repository여도 안전

5. **확장성**
   - 나중에 여러 도시 추가 용이
   - 분석 스크립트도 같이 실행 가능

### 데이터 구조

```
02-weather-app/
├── data/
│   ├── predictions/           # 예보 데이터
│   │   ├── 2025-10-09.json
│   │   ├── 2025-10-10.json
│   │   └── ...
│   ├── observations/          # 관측 데이터
│   │   ├── 2025-10-09.json
│   │   ├── 2025-10-10.json
│   │   └── ...
│   └── analysis/              # 분석 결과
│       ├── week-1.json
│       ├── week-2.json
│       └── ...
├── .github/
│   └── workflows/
│       ├── collect-predictions.yml  # 매일 00:00 예보 수집
│       ├── collect-observations.yml # 매일 23:00 관측 수집
│       └── weekly-analysis.yml      # 주 1회 AI 분석
└── scripts/
    ├── collect-predictions.js
    ├── collect-observations.js
    └── analyze-accuracy.js
```

**예시 데이터**:
```json
// data/predictions/2025-10-09.json
{
  "date": "2025-10-09",
  "collected_at": "2025-10-08T00:00:05Z",
  "target_date": "2025-10-09",
  "city": "서울",
  "predictions": {
    "openweather": {
      "temp_max": 22,
      "temp_min": 15,
      "condition": "맑음",
      "humidity": 60,
      "wind_kph": 10
    },
    "weatherapi": {
      "temp_max": 20,
      "temp_min": 14,
      "condition": "맑음",
      "humidity": 65,
      "wind_kph": 12
    },
    "openmeteo": {
      "temp_max": 21,
      "temp_min": 15,
      "condition": "맑음",
      "humidity": 62,
      "wind_kph": 11
    }
  }
}
```

---

## 📊 구현 계획

### Phase 6.1: Forecast API 연동 (Week 1)

**목표**: 각 Provider에서 내일 예보 조회 가능하게 구현

**작업 항목**:

1. **WeatherProvider 인터페이스 확장**
```typescript
// src/adapters/weather/WeatherProvider.ts
export interface WeatherProvider {
  getCurrentWeather(city: string): Promise<CurrentWeather>;
  getForecast(city: string, days: number): Promise<WeatherForecast>; // ← 추가
  checkQuota(): Promise<QuotaInfo>;
  validateConfig(): Promise<boolean>;
}

export interface WeatherForecast {
  location: LocationInfo;
  daily: DailyForecast[]; // 일별 예보 배열
}

export interface DailyForecast {
  date: string;              // "2025-10-10"
  temp_max: number;          // 최고 기온
  temp_min: number;          // 최저 기온
  condition: string;         // "맑음", "흐림" 등
  humidity_avg: number;      // 평균 습도
  wind_kph_avg: number;      // 평균 풍속
}
```

2. **각 Adapter에 getForecast() 구현**
   - OpenWeatherAdapter: `/forecast` endpoint (5일/3시간)
   - WeatherAPIAdapter: `/forecast.json` (3일)
   - OpenMeteoAdapter: `daily` 파라미터 (7일)

3. **Unit Tests 추가**
   - 각 Adapter의 getForecast() 테스트
   - 응답 데이터 변환 테스트

**예상 시간**: 8-10시간

---

### Phase 6.2: GitHub Actions 설정 (Week 1)

**목표**: 매일 자동으로 데이터 수집

**작업 항목**:

1. **Workflow 파일 생성**
```yaml
# .github/workflows/collect-predictions.yml
name: Collect Weather Predictions

on:
  schedule:
    - cron: '0 0 * * *'  # 매일 00:00 UTC (한국 09:00)
  workflow_dispatch:

jobs:
  collect:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - name: Collect predictions
        run: node scripts/collect-predictions.js
        env:
          VITE_OPENWEATHER_API_KEY: ${{ secrets.OPENWEATHER_API_KEY }}
          VITE_WEATHERAPI_API_KEY: ${{ secrets.WEATHERAPI_API_KEY }}
      - name: Commit data
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add data/predictions/
          git diff --quiet && git diff --staged --quiet || \
            git commit -m "chore: collect predictions $(date +'%Y-%m-%d')"
          git push
```

2. **데이터 수집 스크립트**
```javascript
// scripts/collect-predictions.js
const fs = require('fs').promises;
const path = require('path');
const { WeatherService } = require('../dist/services/weather/WeatherService');

async function main() {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  
  const weatherService = new WeatherService(/* config */);
  const city = '서울';
  
  // 각 Provider에서 내일 예보 수집
  const [owForecast, waForecast, omForecast] = await Promise.all([
    weatherService.getForecast('openweather', city),
    weatherService.getForecast('weatherapi', city),
    weatherService.getForecast('openmeteo', city)
  ]);
  
  // 내일 날짜에 해당하는 예보 추출
  const data = {
    date: today.toISOString().split('T')[0],
    collected_at: today.toISOString(),
    target_date: tomorrowStr,
    city: city,
    predictions: {
      openweather: extractForecastForDate(owForecast, tomorrowStr),
      weatherapi: extractForecastForDate(waForecast, tomorrowStr),
      openmeteo: extractForecastForDate(omForecast, tomorrowStr)
    }
  };
  
  // 파일 저장
  const dirPath = path.join(__dirname, '../data/predictions');
  await fs.mkdir(dirPath, { recursive: true });
  
  const filePath = path.join(dirPath, `${tomorrowStr}.json`);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  
  console.log(`✅ Predictions saved: ${filePath}`);
}

main().catch(console.error);
```

3. **GitHub Secrets 설정**
   - Repository Settings → Secrets
   - `OPENWEATHER_API_KEY` 추가
   - `WEATHERAPI_API_KEY` 추가

**예상 시간**: 3-4시간

---

### Phase 6.3: 관측 데이터 수집 (Week 1)

**목표**: 매일 "오늘"의 현재 날씨 수집

**작업 항목**:

1. **Workflow 추가**
```yaml
# .github/workflows/collect-observations.yml
name: Collect Weather Observations

on:
  schedule:
    - cron: '0 15 * * *'  # 매일 15:00 UTC (한국 00:00)
  workflow_dispatch:
```

2. **관측 데이터 수집 스크립트**
```javascript
// scripts/collect-observations.js
// 현재 날씨를 "오늘의 관측값"으로 저장
```

**예상 시간**: 2시간

---

### Phase 6.4: 정확도 계산 (Week 2)

**목표**: 예보 vs 관측 비교 및 일관성 점수 계산

**작업 항목**:

1. **정확도 계산 로직**
```typescript
// services/accuracy/AccuracyCalculator.ts
export class AccuracyCalculator {
  calculateConsistency(
    prediction: DailyForecast,
    observation: CurrentWeather
  ): ConsistencyScore {
    const tempError = Math.abs(prediction.temp_max - observation.temp);
    const humidityError = Math.abs(prediction.humidity_avg - observation.humidity);
    const conditionMatch = prediction.condition === observation.condition;
    
    return {
      temp_error: tempError,
      humidity_error: humidityError,
      condition_match: conditionMatch,
      overall_score: calculateOverallScore(tempError, humidityError, conditionMatch)
    };
  }
}
```

2. **일일 비교 스크립트**
```javascript
// scripts/calculate-daily-accuracy.js
// 어제 예보와 오늘 관측 비교
// data/accuracy/ 에 결과 저장
```

**예상 시간**: 4-5시간

---

### Phase 6.5: 주간 AI 분석 (Week 2)

**목표**: GPT-4o로 Provider 순위 생성

**작업 항목**:

1. **주간 분석 Workflow**
```yaml
# .github/workflows/weekly-analysis.yml
name: Weekly Accuracy Analysis

on:
  schedule:
    - cron: '0 0 * * 0'  # 매주 일요일 00:00 UTC
  workflow_dispatch:

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      # ... (동일)
      - name: Run AI analysis
        run: node scripts/weekly-analysis.js
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

2. **AI 분석 스크립트**
```javascript
// scripts/weekly-analysis.js
const OpenAI = require('openai');

async function analyzeWeeklyData() {
  // 최근 7일 데이터 로드
  const accuracyData = await loadRecentAccuracy(7);
  
  // GPT-4o 분석
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  
  const prompt = `
  다음은 최근 7일간 3개 날씨 제공자의 예보 일관성 데이터입니다.
  
  ${JSON.stringify(accuracyData, null, 2)}
  
  분석 요청:
  1. 각 Provider의 예보와 관측 일치도를 평가하세요
  2. 어느 Provider가 가장 일관성 있는지 순위를 매기세요
  3. 날씨 상태별 강점/약점을 파악하세요
  
  JSON 형식으로 출력:
  {
    "week": 1,
    "period": { "start": "2025-10-01", "end": "2025-10-07" },
    "rankings": [
      {
        "rank": 1,
        "provider": "openmeteo",
        "consistency_score": 87.5,
        "strengths": ["온도 정확도 높음"],
        "weaknesses": ["습도 오차 다소 큼"]
      }
    ]
  }
  `;
  
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: "기상 데이터 분석 전문가" },
      { role: "user", content: prompt }
    ],
    response_format: { type: "json_object" }
  });
  
  const analysis = JSON.parse(response.choices[0].message.content);
  
  // 결과 저장
  await saveAnalysis(analysis);
}
```

**예상 시간**: 4-5시간

---

### Phase 6.6: 관리자 UI (Week 3-4)

**목표**: 수집된 데이터 및 분석 결과 시각화

**작업 항목**:

1. **데이터 조회 API**
```typescript
// src/services/accuracy/DataLoader.ts
export class AccuracyDataLoader {
  async loadPredictions(startDate: string, endDate: string): Promise<Prediction[]> {
    // data/predictions/*.json 파일 읽기
  }
  
  async loadObservations(startDate: string, endDate: string): Promise<Observation[]> {
    // data/observations/*.json 파일 읽기
  }
  
  async loadWeeklyAnalysis(): Promise<WeeklyAnalysis[]> {
    // data/analysis/week-*.json 파일 읽기
  }
}
```

2. **UI 컴포넌트**
```vue
<!-- src/views/AdminAccuracy.vue -->
<template>
  <div class="accuracy-dashboard">
    <h1>Weather Accuracy Tracking</h1>
    
    <!-- 주간 순위 -->
    <section class="rankings">
      <h2>Provider Rankings (Last 4 Weeks)</h2>
      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Provider</th>
            <th>Consistency Score</th>
            <th>Trend</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="rank in rankings" :key="rank.provider">
            <td>{{ rank.rank }}</td>
            <td>{{ rank.provider }}</td>
            <td>{{ rank.consistency_score }}</td>
            <td>{{ rank.trend }}</td>
          </tr>
        </tbody>
      </table>
    </section>
    
    <!-- 일일 비교 차트 -->
    <section class="daily-comparison">
      <h2>Daily Prediction vs Observation</h2>
      <line-chart :data="chartData" />
    </section>
    
    <!-- 날씨 상태별 정확도 -->
    <section class="condition-accuracy">
      <h2>Accuracy by Weather Condition</h2>
      <bar-chart :data="conditionData" />
    </section>
  </div>
</template>
```

**예상 시간**: 8-10시간

---

## 📅 타임라인

### Week 1 (Oct 9-15)
- [x] Phase 6 Plan 문서 작성
- [ ] Forecast API 연동 (OpenWeather, WeatherAPI, OpenMeteo)
- [ ] GitHub Actions 설정 (predictions + observations)
- [ ] 첫 데이터 수집 시작

### Week 2 (Oct 16-22)
- [ ] 정확도 계산 로직 구현
- [ ] 주간 AI 분석 스크립트 작성
- [ ] 첫 주간 분석 실행 (7일 데이터)

### Week 3 (Oct 23-29)
- [ ] 관리자 UI 구현 (기본)
- [ ] 데이터 시각화 (차트)
- [ ] 두 번째 주간 분석

### Week 4 (Oct 30 - Nov 5)
- [ ] UI 개선 (날씨 상태별 분석)
- [ ] 세 번째 주간 분석
- [ ] 문서화

### Week 5-8 (Nov 6 - Dec 3)
- [ ] 데이터 계속 수집
- [ ] 주간 분석 계속 실행
- [ ] 최종 분석 (30일 데이터)
- [ ] PHASE_6_SUMMARY.md 작성

---

## 💰 예상 비용

| 항목 | 비용 |
|------|------|
| GitHub Actions | **무료** (월 2,000분 제공, 사용량 ~30분) |
| Data Storage | **무료** (Git repository) |
| OpenAI API (주 1회) | $0.05 × 4주 = **$0.20/월** |
| **총 예상 비용** | **$0.20/월** |

---

## 🎯 성공 지표

### Week 1
- ✅ 데이터 수집 자동화 완료
- ✅ 7일 연속 데이터 수집 성공

### Week 2
- ✅ 첫 주간 분석 완료
- ✅ Provider 순위 도출 (신뢰도 낮음)

### Week 4
- ✅ 28일 데이터 확보
- ✅ 통계적 유의미한 분석 결과
- ✅ Provider 간 명확한 차이 감지

### Week 8
- ✅ 56일 데이터 확보
- ✅ 계절별 패턴 분석
- ✅ Phase 7 확대 결정 (8개 도시)

---

## 📝 참고 문서

- `docs/WEATHER_ACCURACY_TRACKING_DESIGN.md` - 상세 설계
- `docs/MACOS_SLEEP_LOCAL_SERVER_ANALYSIS.md` - 로컬 서버 분석
- `docs/SESSION_CONTEXT.md` - 프로젝트 전체 컨텍스트

---

**작성자**: Claude (AI)  
**작성일**: 2025-10-09  
**버전**: 1.0
