# Phase 10: Adaptive Learning System

## 목표

날씨 예측 정확도를 자동으로 최적화하는 적응형 학습 시스템 구현

## 핵심 개념

### 1. Adaptive Learning (적응형 학습)

수집된 실제 날씨 데이터를 기반으로 AI 가중치를 자동으로 최적화

- **Rolling Window Analysis**: 최근 30일 데이터 기반 분석
- **Statistical Optimization**: 역오차 가중치 방법론 (Inverse-Error Weighting)
- **Continuous Improvement**: 데이터가 쌓일수록 정확도 향상

### 2. Zero-Maintenance Architecture

사용자 개입 없이 완전 자동화된 시스템

- **GitHub Actions**: 주간 자동 업데이트 (매주 일요일 00:00 UTC)
- **Git-based Distribution**: GitHub를 통한 가중치 배포
- **Automatic Commits**: 가중치 변경 자동 커밋
- **Optional Notifications**: Slack/Discord 웹훅 알림

### 3. Dynamic Weight Loading

프론트엔드가 런타임에 최신 가중치를 동적으로 로드

- **Remote Fetching**: `raw.githubusercontent.com`에서 가져오기
- **Local Cache**: 1시간 로컬 캐싱으로 성능 최적화
- **Fallback Strategy**: 기본 가중치 → 캐시 → 원격
- **No Deployment**: 가중치 업데이트 시 재배포 불필요

## 아키텍처

### 데이터 흐름

```
[GitHub Actions Scheduler]
         ↓
[analyze-accuracy-enhanced.ts]
    ↓ (30일 데이터 분석)
[Optimization Algorithm]
    ↓ (역오차 가중치 계산)
[update-ai-weights.ts]
    ↓ (가중치 파일 생성)
[Git Auto-Commit]
    ↓
[GitHub Repository]
    ↓ (raw.githubusercontent.com)
[Frontend: useAIWeights]
    ↓ (1시간 캐시)
[CustomWeatherPredictor]
```

### 파일 구조

```
02-weather-app/
├── data/
│   └── ai-weights/
│       ├── latest.json           # 최신 가중치
│       ├── YYYY-MM-DD.json       # 버전 히스토리
│       └── history.json          # 변경 이력
├── scripts/
│   ├── analyze-accuracy-enhanced.ts    # 정확도 분석 + 최적화
│   └── update-ai-weights.ts            # 가중치 업데이트 오케스트레이터
├── .github/
│   └── workflows/
│       └── update-ai-weights.yml       # GitHub Actions 워크플로우
├── src/
│   ├── composables/
│   │   └── useAIWeights.ts             # 동적 가중치 로더
│   └── types/domain/
│       └── aiWeights.ts                # 타입 정의
```

## 최적화 알고리즘

### Inverse-Error Weighting (역오차 가중치)

오차가 낮을수록 높은 가중치 부여

```typescript
// 예시: 온도 예측 오차
// OpenMeteo: 1.86°C MAE
// OpenWeather: 2.03°C MAE  
// WeatherAPI: 2.13°C MAE

// 1. 역수 계산
inverses = [1/1.86, 1/2.03, 1/2.13]
        = [0.538, 0.493, 0.469]

// 2. 정규화 (합계 = 1)
weights = [0.538/1.5, 0.493/1.5, 0.469/1.5]
        = [0.45, 0.40, 0.15]
```

### 신뢰도 체크

가중치 업데이트 조건:

- **Confidence > 80%**: 통계적 유의성 확보
- **Sample Size >= 20 days**: 충분한 데이터 확보
- **Improvement Potential**: 개선 가능성 존재

## 구현 세부사항

### 1. analyze-accuracy-enhanced.ts

**기능**: 30일 데이터 분석 + 가중치 최적화

**주요 함수**:
```typescript
loadRecentData(days: 30)           // 최근 데이터 로드
calculateMAE(predicted, actual)     // 평균 절대 오차
analyzeProviderAccuracy(data)       // Provider별 정확도 분석
optimizeWeights(accuracy)           // 가중치 최적화
```

**출력**:
```json
{
  "accuracy": {
    "openmeteo": { "temperatureMAE": 1.86, ... },
    "openweather": { "temperatureMAE": 2.03, ... },
    "weatherapi": { "temperatureMAE": 2.13, ... }
  },
  "optimization": {
    "weights": { ... },
    "confidence": 95.2,
    "recommended": true,
    "improvement": { "temperature": 7.9, ... }
  }
}
```

### 2. update-ai-weights.ts

**기능**: 가중치 업데이트 오케스트레이터

**워크플로우**:
1. `analyze-accuracy-enhanced.ts` 실행
2. 업데이트 권장 여부 확인 (`recommended: true`)
3. 가중치 파일 생성 (`latest.json`, `YYYY-MM-DD.json`)
4. 히스토리 파일 업데이트 (`history.json`)
5. Git 자동 커밋 (if `AUTO_COMMIT=true`)
6. 알림 전송 (if 웹훅 설정)

**환경 변수**:
- `AUTO_COMMIT`: Git 자동 커밋 활성화
- `SLACK_WEBHOOK_URL`: Slack 알림
- `DISCORD_WEBHOOK_URL`: Discord 알림

### 3. useAIWeights.ts

**기능**: 프론트엔드 동적 가중치 로더

**로딩 전략**:
```typescript
1. 캐시 확인 (1시간 이내)
   ↓ 캐시 존재 → 즉시 사용 + 백그라운드 업데이트
   ↓ 캐시 없음
2. 원격 페치 (raw.githubusercontent.com)
   ↓ 성공 → 캐시 저장
   ↓ 실패
3. 기본 가중치 사용 (9-day backtesting)
```

**캐시 구조**:
```typescript
{
  weights: PredictionWeights,
  timestamp: number,           // 캐시 저장 시각
  version: string,             // YYYY-MM-DD
  source: 'remote' | 'default'
}
```

### 4. GitHub Actions Workflow

**트리거**:
- **Scheduled**: 매주 일요일 00:00 UTC
- **Manual**: `workflow_dispatch` 수동 실행

**작업 흐름**:
```yaml
1. Checkout repository
2. Setup Node.js (v20)
3. Install dependencies (npm ci)
4. Run update-ai-weights.ts
5. Commit changes (if AUTO_COMMIT=true)
6. Push to repository
7. Upload artifacts (90일 보관)
8. Create GitHub summary
```

**아티팩트**:
- `analysis-result.json`: 분석 결과
- `latest.json`: 최신 가중치
- `history.json`: 변경 이력

## 성능 메트릭

### Provider 정확도

각 Provider의 예측 정확도 추적:

```typescript
{
  openmeteo: {
    temperatureMAE: 1.86,      // °C
    windSpeedMAE: 0.47,         // m/s
    humidityMAE: 0,             // % (사용 안 함)
    conditionAccuracy: 0,       // % (사용 안 함)
    sampleSize: 30              // days
  }
}
```

### Custom AI 성능

가중 평균 예측의 전체 성능:

```typescript
{
  temperatureMAE: 1.86,         // °C
  windSpeedMAE: 0.47,           // m/s
  humidityMAE: 11.6,            // %
  conditionAccuracy: 66.7,      // %
  overallScore: 85.2            // 종합 점수
}
```

### 개선도 추적

이전 가중치 대비 개선율:

```typescript
{
  temperature: 7.9,             // % 개선
  windSpeed: 26.4,              // % 개선
  humidity: 0,                  // % 변화 없음
  overall: 11.4                 // % 전체 개선
}
```

## 안전 장치

### 1. 업데이트 조건

- **최소 샘플 크기**: 20일 이상 데이터
- **신뢰도 임계값**: 80% 이상
- **개선 가능성**: 현재 가중치보다 나은 경우만

### 2. 버전 관리

- **Version History**: 모든 가중치 버전 보관
- **Rollback**: 이전 버전으로 쉽게 복구 가능
- **Git Tracking**: 모든 변경사항 Git으로 추적

### 3. 폴백 전략

프론트엔드 로딩 실패 시:

1. **원격 페치 실패** → 캐시 사용
2. **캐시 없음** → 기본 가중치 사용
3. **항상 동작 보장**

## 확장 가능성

### Phase 11: Advanced Optimization

- **A/B Testing**: 복수 가중치 전략 테스트
- **Seasonal Weights**: 계절별 최적 가중치
- **Location-based**: 지역별 최적화
- **Hourly Weights**: 시간대별 가중치

### Phase 12: ML Integration

- **Neural Networks**: 딥러닝 기반 예측
- **LSTM**: 시계열 데이터 학습
- **Feature Engineering**: 추가 기상 변수 활용
- **Ensemble Learning**: 다중 모델 앙상블

### Phase 13: Real-time Learning

- **Streaming Updates**: 실시간 가중치 조정
- **Anomaly Detection**: 이상 데이터 감지
- **Adaptive Scheduling**: 동적 업데이트 주기
- **Performance Alerts**: 성능 저하 자동 알림

## 예상 효과

### 단기 (1-3개월)

- **데이터 축적**: 30일 → 90일
- **정확도 향상**: +5-10% 개선
- **계절 적응**: 계절별 패턴 학습

### 중기 (3-6개월)

- **데이터 풍부**: 90일 → 180일
- **정확도 향상**: +10-15% 개선
- **안정적 예측**: 표준편차 감소

### 장기 (6-12개월)

- **연간 데이터**: 365일 전체 사이클
- **정확도 향상**: +15-20% 개선
- **최적 가중치**: 계절/날씨 패턴별 최적화

## 모니터링

### GitHub Actions 대시보드

- **Workflow Runs**: 실행 이력 확인
- **Artifacts**: 분석 결과 다운로드
- **Job Summary**: 성능 메트릭 확인

### 로컬 테스트

```bash
# 분석 실행
npm run analyze:enhanced

# 가중치 업데이트 (드라이런)
npm run update:weights

# 가중치 업데이트 (실제 커밋)
AUTO_COMMIT=true npm run update:weights
```

### 프론트엔드 확인

개발자 도구에서 확인:

```javascript
// 현재 가중치 소스
console.log(weights.source)  // 'default' | 'cache' | 'remote'

// 가중치 정보
console.log(weights.info)
// { version: '2025-10-29', updatedAt: '...', ... }
```

## 참고 문서

- [Phase 8-9 Summary](./PHASE_8-9_SUMMARY.md): Custom AI Prediction 구현
- [Weather Accuracy Analysis](./WEATHER_ACCURACY_ANALYSIS_REPORT.md): 9-day Backtesting
- [Future Features](./FUTURE_FEATURES.md): 향후 개발 방향
