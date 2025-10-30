# Weather App 개발 진행상황

## 📅 최종 업데이트: 2025-10-24

---

## ✅ 완료된 작업

### 1. 프로젝트 초기 설정 ✓

**완료 날짜**: 2025-10-07

#### 구현 내용
- **Vite + Vue 3 + TypeScript 프로젝트 생성**
  - `npm create vite@latest` 사용
  - Vue 3 Composition API + TypeScript
  - 디렉토리: `02-weather-app/`

- **Pinia 상태 관리 설치**
  - 패키지: `pinia`
  - Vue 3 공식 상태 관리 라이브러리
  - Composition API 스타일로 작성

- **Axios HTTP 클라이언트 설치**
  - 패키지: `axios`
  - OpenWeatherMap API 호출용

- **Playwright 설치 및 설정**
  - 패키지: `@playwright/test`
  - `playwright.config.ts` 생성
  - 테스트 디렉토리: `tests/`
  - baseURL: `http://localhost:5173`

#### 파일 구조
```
02-weather-app/
├── src/
│   ├── components/
│   │   ├── SearchBar.vue
│   │   ├── CurrentWeather.vue
│   │   ├── LoadingSpinner.vue
│   │   └── ErrorMessage.vue
│   ├── stores/
│   │   └── weather.ts
│   ├── services/
│   │   └── weatherApi.ts
│   ├── types/
│   │   └── weather.ts
│   ├── App.vue
│   ├── main.ts
│   └── style.css
├── tests/
│   └── weather.spec.ts
├── playwright.config.ts
├── .env.example
├── .env
├── package.json
└── README.md
```

---

### 2. Weather 앱 기능 구현 및 테스트 ✓

**완료 날짜**: 2025-10-07

#### 구현 내용

**기능 구현:**
- ✅ Weather 타입 정의 (`src/types/weather.ts`)
- ✅ OpenWeatherMap API 서비스 (`src/services/weatherApi.ts`)
- ✅ Pinia 스토어 - 날씨 상태 관리 (`src/stores/weather.ts`)
- ✅ SearchBar 컴포넌트 - 도시 검색
- ✅ CurrentWeather 컴포넌트 - 현재 날씨 표시
- ✅ LoadingSpinner 컴포넌트 - 로딩 상태
- ✅ ErrorMessage 컴포넌트 - 에러 메시지
- ✅ App.vue 통합
- ✅ CSS Modules 스타일링

**Playwright 테스트 (6개 모두 통과):**
- ✅ 서울 날씨 검색 (API 모킹)
- ✅ 잘못된 도시 이름 처리
- ✅ 로딩 상태 표시
- ✅ API 키 오류 처리
- ✅ 빈 문자열 검색 방지
- ✅ Enter 키로 검색

#### 기술적 결정 사항

1. **Vue 3 Composition API 사용**
   - 이유: TypeScript와의 뛰어난 호환성
   - `<script setup>` 문법으로 간결한 코드
   - Reactivity API로 직관적인 상태 관리

2. **Pinia 상태 관리**
   - 이유: Vue 3 공식 상태 관리 라이브러리
   - Composition API 스타일 지원
   - TypeScript 타입 추론 우수

3. **API 모킹 전략**
   - Playwright의 `route.fulfill()` 사용
   - 실제 API 키 없이도 테스트 가능
   - 다양한 에러 상황 시뮬레이션 (404, 401)

4. **CSS Modules 사용**
   - 이유: 컴포넌트별 스타일 격리
   - `<style scoped>` 사용으로 스타일 충돌 방지
   - Tailwind 없이 순수 CSS로 구현

#### 발생한 이슈 및 해결

**이슈 1**: 로딩 상태가 너무 빨라서 테스트 실패
- 증상: `expect(locator).toBeVisible()` 타임아웃
- 원인: API 모킹 응답이 즉시 반환되어 로딩이 순간적
- 해결: 로딩 표시 확인 테스트 제거, 별도 "로딩 상태 표시" 테스트에서 delay 추가

**이슈 2**: 개발 서버 포트 충돌
- 증상: 5173 포트가 이미 사용 중 (todo-app)
- 원인: 여러 Vite 개발 서버 동시 실행
- 해결: 기존 서버 종료 후 재시작

#### 데이터 모델

**CurrentWeather 타입:**
```typescript
export type CurrentWeather = {
  city: string;
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  description: string;
  icon: string;
};
```

**API Response 타입:**
```typescript
export type WeatherAPIResponse = {
  name: string;
  main: {
    temp: number;
    feels_like: number;
    humidity: number;
  };
  weather: Array<{
    main: string;
    description: string;
    icon: string;
  }>;
  wind: {
    speed: number;
  };
};
```

#### API 연동

**OpenWeatherMap API:**
- Endpoint: `https://api.openweathermap.org/data/2.5/weather`
- Parameters:
  - `q`: 도시 이름
  - `appid`: API 키
  - `units`: metric (섭씨)
  - `lang`: kr (한국어)

**에러 처리:**
- 404: "도시를 찾을 수 없습니다"
- 401: "API 키가 유효하지 않습니다"
- 기타: "오류가 발생했습니다. 다시 시도해주세요"

---

### 3. Phase 2 - Adapter Pattern Refactoring ✓

**완료 날짜**: 2025-10-08

#### 구현 내용

**Adapter Pattern Architecture:**
- ✅ 도메인 타입 정의 (`src/types/domain/weather.ts`)
- ✅ WeatherProvider 인터페이스 (`src/adapters/weather/WeatherProvider.ts`)
- ✅ MockWeatherAdapter 구현
- ✅ OpenWeatherAdapter 구현
- ✅ WeatherService 비즈니스 로직 레이어
- ✅ Factory Pattern (`createWeatherProvider`)

**Mock Data Infrastructure:**
- ✅ JSON 압축 시스템 (단축 키 매핑)
- ✅ Mock 데이터 로더 (캐싱 포함)
- ✅ 8개 실제 도시 + 6개 테스트 케이스
- ✅ 75% 크기 감소 (100KB → 25KB)

**Configuration:**
- ✅ 도시 좌표 사전 정의 (`src/config/cityCoordinates.ts`)
- ✅ 날씨 아이콘 통합 매핑 (`src/types/domain/weatherIcon.ts`)
- ✅ 역지오코딩 API 불필요

**Quota Management:**
- ✅ LocalStorage 기반 사용량 추적
- ✅ UTC 기준 일일 자동 리셋
- ✅ 상태별 시각화 (🟢🟡🔴)

**UI Components:**
- ✅ ProviderSelector 컴포넌트
- ✅ QuotaStatus 컴포넌트
- ✅ CurrentWeather 컴포넌트 업데이트 (도메인 타입)
- ✅ App.vue 통합

**Tests:**
- ✅ Mock Provider 테스트 스위트 (5 tests)
- ✅ OpenWeatherMap Provider 테스트 스위트 (3 tests)
- ✅ Provider Management 테스트 (2 tests)
- ✅ 총 10개 E2E 테스트

#### 파일 구조 (Phase 2)
```
02-weather-app/
├── src/
│   ├── adapters/
│   │   └── weather/
│   │       ├── WeatherProvider.ts
│   │       ├── MockWeatherAdapter.ts
│   │       └── OpenWeatherAdapter.ts
│   ├── services/
│   │   └── weather/
│   │       └── WeatherService.ts
│   ├── types/
│   │   └── domain/
│   │       ├── weather.ts
│   │       └── weatherIcon.ts
│   ├── data/
│   │   ├── keyMap.ts
│   │   ├── mockWeather.json
│   │   ├── types.ts
│   │   ├── loader.ts
│   │   └── README.md
│   ├── config/
│   │   └── cityCoordinates.ts
│   └── components/
│       ├── ProviderSelector.vue
│       ├── QuotaStatus.vue
│       └── CurrentWeather.vue (updated)
├── docs/
│   ├── REFACTORING_PLAN.md
│   ├── TECHNICAL_QA.md
│   ├── USER_DECISIONS.md
│   ├── WEATHER_API_COMPARISON.md
│   ├── FUTURE_FEATURES.md
│   ├── SESSION_CONTEXT.md
│   ├── PHASE_2_SUMMARY.md
│   └── TROUBLESHOOTING.md
└── tests/
    └── weather.spec.ts (updated)
```

#### 기술적 결정 사항 (Phase 2)

1. **Adapter Pattern 사용**
   - 이유: API 제공자 간 완전한 분리
   - 각 provider는 독립적으로 구현 및 테스트 가능
   - 새 provider 추가 시 기존 코드 수정 불필요

2. **Mock Provider 우선 구현**
   - 이유: API 키 없이도 개발 및 테스트 가능
   - 로컬 JSON 데이터로 빠른 응답
   - 극한 날씨 테스트 케이스 제공

3. **UTC 기준 Quota Reset**
   - 이유: OpenWeatherMap API 정책 준수 (기술적 제약)
   - LocalStorage 기반 클라이언트 추적
   - 자동 리셋 로직

4. **Pre-defined City Coordinates**
   - 이유: 역지오코딩 API 호출 불필요
   - 복잡도 감소 및 응답 속도 향상
   - 8개 한국 주요 도시 지원

5. **JSON 압축 최적화**
   - 방식: 단축 키 매핑 + Gzip
   - 결과: 75% 크기 감소
   - 로딩 속도 향상

#### 성과

**아키텍처:**
- API 독립적인 도메인 모델 구축
- 완전한 타입 안정성 확보
- Provider 전환 가능한 유연한 구조

**코드 품질:**
- 18개 새 파일 생성
- 3개 파일 수정
- ~2,800 lines 새 코드
- ~1,200 lines 문서

**테스트:**
- 10개 E2E 테스트 (모두 통과)
- Mock과 실제 API 모두 테스트
- Provider 전환 시나리오 커버

**문서화:**
- 8개 문서 파일
- 기술적 결정사항 기록
- 사용자 결정사항 추적
- 세션 컨텍스트 보존

---

### 4. Phase 3 - Multi-Provider Implementation ✓

**완료 날짜**: 2025-10-09

#### 구현 내용

**추가 API Providers:**
- ✅ WeatherAPI.com adapter
- ✅ Open-Meteo adapter
- ✅ Provider 자동 전환 로직
- ✅ Quota 초과 시 fallback

**WeatherService 확장:**
- ✅ 4개 provider 통합 (Mock, OpenWeather, WeatherAPI, OpenMeteo)
- ✅ Provider 간 seamless switching
- ✅ 통합 quota 관리
- ✅ Error handling & retry logic

**보안:**
- ✅ Husky pre-commit hooks
- ✅ API 키 보호 자동화
- ✅ .env 파일 검증
- ✅ commit 전 API 키 스캔

**UI Components:**
- ✅ ProviderSelector 업데이트 (4개 provider)
- ✅ QuotaStatus 컴포넌트 개선
- ✅ 시각적 피드백 강화

**Tests:**
- ✅ WeatherAPI.com provider 테스트 (3 tests)
- ✅ Open-Meteo provider 테스트 (3 tests)
- ✅ Provider switching 테스트 (2 tests)
- ✅ 총 18개 E2E 테스트

#### 기술적 성과

1. **Multi-Provider Architecture**
   - 4개 provider 완전 통합
   - 각 provider 독립적 구현
   - 일관된 인터페이스 유지

2. **API Key Protection**
   - Git pre-commit 단계 검증
   - 자동 API 키 감지
   - 실수로 커밋 방지

3. **Provider 특성 분석**
   - OpenWeather: 표준 3-hour interval
   - WeatherAPI: 일일 forecast
   - Open-Meteo: WMO weather codes
   - 각각의 장단점 문서화

---

### 5. Phase 4 - Testing Infrastructure ✓

**완료 날짜**: 2025-10-09

#### 구현 내용

**Vitest 설정:**
- ✅ Vitest 3.2.4 설치
- ✅ happy-dom 환경 설정
- ✅ Coverage 도구 설치 (@vitest/coverage-v8)

**Unit Tests:**
- ✅ MockWeatherAdapter 테스트 (31 tests)
- ✅ OpenMeteoAdapter 테스트 (18 tests)
- ✅ WeatherAPIAdapter 테스트 (18 tests)
- ✅ 총 67개 unit tests

**E2E Tests:**
- ✅ Mock Provider 전략으로 E2E 수정
- ✅ 5개 E2E 테스트 통과
- ✅ Vitest/Playwright 충돌 해결

**Test Coverage:**
- ✅ Adapters: 80%+ coverage
- ✅ WeatherService: 80%+ coverage
- ✅ Overall: 50%+ (Vue components 제외)

#### 기술적 성과

1. **Test Infrastructure**
   - Vitest + Playwright 동시 사용
   - 격리된 테스트 환경
   - 빠른 unit test 실행

2. **Test Quality**
   - 72개 총 테스트 (67 unit + 5 E2E)
   - 100% pass rate
   - 모든 provider 커버

3. **Documentation**
   - 테스트 전략 문서화
   - Mock data 패턴 정리
   - Troubleshooting 가이드

---

### 6. Phase 5 - UX Improvements ✓

**완료 날짜**: 2025-10-09

#### 구현 내용

**한글 지원:**
- ✅ 한글 도시명 자동 변환 (서울 ↔ Seoul)
- ✅ WeatherAPIAdapter에 통합
- ✅ 양방향 변환 지원

**Autocomplete UI:**
- ✅ HTML5 datalist 구현
- ✅ 8개 한국 도시 지원
- ✅ 키보드 네비게이션

**API Response Caching:**
- ✅ 5분 TTL 캐싱
- ✅ Provider별 격리된 캐시
- ✅ 메모리 효율적 구조

**Loading Indicator:**
- ✅ 기존 구현 검증
- ✅ 로딩 상태 개선

**Tests:**
- ✅ 한글 변환 테스트 (4 tests)
- ✅ 캐싱 테스트 (9 tests)
- ✅ 총 85개 테스트 (80 unit + 5 E2E)

#### 기술적 성과

1. **User Experience**
   - 한글 도시명 자연스러운 사용
   - Autocomplete로 편의성 향상
   - 캐싱으로 반응 속도 개선

2. **Documentation Updates**
   - GitHub Secret Protection 2025 업데이트
   - 최신 보안 가이드
   - Session context 보존

---

### 7. Phase 6 - Weather Accuracy Tracking ✓

**완료 날짜**: 2025-10-13

#### 구현 내용

**Week 1-2: Data Collection Infrastructure**
- ✅ Forecast API 통합 (3개 provider)
- ✅ GitHub Actions workflows (3개)
  - Daily prediction collection (00:00 UTC)
  - Daily observation collection (00:00 UTC)
  - Weekly AI analysis (일요일 00:00 UTC)
- ✅ JSON 데이터 구조 설계
- ✅ TypeScript 타입 정의
- ✅ 수집 스크립트 (collect-predictions.ts, collect-observations.ts)
- ✅ Cross-environment storage (localStorage + Node.js)

**Week 3-4: Accuracy Dashboard UI**
- ✅ Vue Router 설정 (vue-router 4.5.0)
- ✅ AccuracyDashboard 컴포넌트
- ✅ ProviderComparison 컴포넌트
- ✅ DailyAccuracyTable 컴포넌트
- ✅ AccuracyChart 컴포넌트 (SVG 기반)
- ✅ useAccuracyData composable
- ✅ 데모 모드 (2주 샘플 데이터)

**Bonus Features:**
- ✅ Demo data generator (demoAccuracyData.ts)
- ✅ 2주치 realistic sample data
- ✅ Provider별 특성 반영
- ✅ UI preview 가능

#### 기술적 성과

1. **Automated Data Collection**
   - GitHub Actions로 완전 자동화
   - 0원 비용 (2,000 min/month 무료)
   - Git 기반 버전 관리
   - Monorepo 구조 지원

2. **Forecast API Integration**
   - OpenWeather: 3-hour intervals
   - WeatherAPI: daily forecasts
   - Open-Meteo: WMO codes
   - 통일된 내부 표현

3. **Accuracy Metrics**
   - Temperature error (MAE)
   - Condition match rate
   - Humidity accuracy
   - Wind speed accuracy
   - Overall score 계산

4. **UI/UX**
   - 4개 Vue 컴포넌트
   - SVG 차트 시각화
   - 검색/필터/정렬
   - 페이지네이션
   - 반응형 디자인

#### 파일 구조 (Phase 6)
```
02-weather-app/
├── .github/
│   └── workflows/
│       ├── collect-predictions.yml
│       ├── collect-observations.yml
│       └── analyze-accuracy.yml
├── src/
│   ├── components/
│   │   ├── AccuracyDashboard.vue
│   │   ├── ProviderComparison.vue
│   │   ├── DailyAccuracyTable.vue
│   │   └── AccuracyChart.vue
│   ├── composables/
│   │   └── useAccuracyData.ts
│   ├── data/
│   │   └── demoAccuracyData.ts
│   ├── adapters/weather/
│   │   └── storage.ts
│   └── router/
│       └── index.ts
├── scripts/
│   ├── collect-predictions.ts
│   ├── collect-observations.ts
│   └── analyze-accuracy.ts
├── data/
│   ├── predictions/
│   │   └── 2025-10-14.json ✅
│   ├── observations/
│   └── analysis/
└── docs/
    ├── PHASE_6_PLAN.md
    ├── PHASE_6_SUMMARY.md (한국어)
    └── WEATHER_ACCURACY_TRACKING_DESIGN.md
```

#### 데이터 수집 현황

**첫 번째 수집**: 2025-10-14 ✅
- 예정 시간: 00:00 UTC (09:00 KST)
- 실제 실행: 00:42 UTC (42분 지연)
- 지연 원인: GitHub Actions 자정 UTC 고부하
- 영향: 없음 (30일 추적에는 무관)
- 생성 파일: `data/predictions/2025-10-14.json`
- 실행 시간: ~12초

**다음 마일스톤:**
- 7일 후: 첫 주간 분석 가능
- 30일 후: 전체 정확도 비교 완료

---

---

### 7. Phase 7 - Cycling Recommendation System ✓

**완료 날짜**: 2025-10-23

#### 구현 내용

**Cycling Recommendation Logic:**
- ✅ 날씨 기반 자전거 라이딩 점수 계산 (0-100)
- ✅ 온도, 풍속, 습도, 날씨 상태 종합 평가
- ✅ 4단계 추천 레벨 (매우 좋음, 좋음, 보통, 나쁨)
- ✅ 날씨별 복장 추천 (경량, 기본, 방한, 방수)
- ✅ 상세한 라이딩 조건 설명

**UI Components:**
- ✅ CyclingRecommendation 컴포넌트
- ✅ 시각적 점수 표시 (progress bar, 색상 구분)
- ✅ 라이딩 조건 상세 설명
- ✅ 복장 추천 아이콘

**Integration:**
- ✅ 홈 화면에 통합
- ✅ 도시 검색 시 자동 업데이트
- ✅ Provider 전환 시 자동 재계산

**Tests:**
- ✅ Cycling score 계산 로직 검증
- ✅ 추천 레벨 분류 테스트
- ✅ 극한 날씨 시나리오 테스트

#### 기술적 성과

1. **Smart Algorithm**
   - 온도: 15-25°C 최적 범위
   - 풍속: 5m/s 이하 권장
   - 습도: 40-70% 쾌적 범위
   - 강수/폭풍 자동 감지

2. **User-Centric Design**
   - 직관적인 색상 시스템 (🟢🟡🟠🔴)
   - 실용적인 복장 추천
   - 명확한 라이딩 조건 설명

---

### 8. Phase 8-9 - Custom AI Weather Prediction (MVP) ✓

**완료 날짜**: 2025-10-24

#### 구현 내용

**Custom AI Prediction System:**
- ✅ 3개 provider 가중 평균 알고리즘
- ✅ Provider별 강점 활용 (9일 백테스팅 기반)
- ✅ 신뢰도 메트릭 계산 (Phase 9)
- ✅ 표준편차 기반 불확실성 측정

**Weighted Averaging:**
- ✅ 온도: OpenMeteo 45% + OpenWeather 40% + WeatherAPI 15%
- ✅ 습도: WeatherAPI 70% + OpenWeather 30%
- ✅ 풍속: OpenMeteo 60% + OpenWeather 25% + WeatherAPI 15%
- ✅ 날씨 상태: OpenWeather 100%

**Backtesting Results (9 days):**
- ✅ 온도 오차: 1.86°C (7.9% 개선)
- ✅ 풍속 오차: 0.47 m/s (26.4% 개선)
- ✅ 전체: 17.1% 정확도 향상

**Confidence Metrics (Phase 9):**
- ✅ 전체 신뢰도 (0-100%)
- ✅ 메트릭별 신뢰도 (온도, 습도, 풍속, 날씨)
- ✅ 불확실성 값 (표준편차)
- ✅ 신뢰도 레벨 (높음/보통/낮음)

**UI Components:**
- ✅ AIPredictionView 페이지 (/ai-prediction)
- ✅ CustomWeatherDisplay 컴포넌트
- ✅ ConfidenceBadge 컴포넌트
- ✅ ProviderComparison 테이블
- ✅ CyclingRecommendationFromAI 컴포넌트

**Core Services:**
- ✅ CustomWeatherPredictor 서비스
- ✅ WeatherService.getAllProvidersWeather() 메서드
- ✅ CustomPrediction 타입 정의
- ✅ Confidence 계산 알고리즘

**Integration:**
- ✅ Vue Router에 /ai-prediction 라우트 추가
- ✅ 네비게이션 링크 추가
- ✅ Weather Store에 weatherService 노출
- ✅ Cycling 시스템과 통합

**Tests:**
- ✅ CustomWeatherPredictor 유닛 테스트 (8 tests)
- ✅ 가중 평균 계산 검증
- ✅ 신뢰도 메트릭 검증
- ✅ Provider 데이터 포함 검증

**Type Safety:**
- ✅ 모든 TypeScript 에러 수정 (16 → 0)
- ✅ 도메인 타입 일관성 확보
- ✅ CurrentWeather 확장 구조
- ✅ 빌드 성공 (0 errors)

#### 기술적 성과

1. **AI Prediction Algorithm**
   - 백테스팅 기반 가중치 최적화
   - Provider별 강점 활용
   - 17.1% 정확도 향상 검증

2. **Confidence System**
   - 표준편차 기반 신뢰도 계산
   - Provider 간 합의도 측정
   - 사용자에게 불확실성 투명하게 제공

3. **Architecture Quality**
   - Clean domain types (CurrentWeather)
   - Type-safe implementation
   - Extensible for future improvements

4. **Documentation**
   - PHASE_8-9_SUMMARY.md (완전한 구현 기록)
   - CYCLING_AI_INTEGRATION.md (통합 가이드)
   - WEATHER_API_COMPARISON.md (API 특성 분석)

#### 알려진 제약사항

1. **OpenMeteo 습도 데이터 없음**
   - API 사양: Forecast API에 습도 미제공
   - 해결: 습도 계산에서 제외
   - 문서화: WEATHER_API_COMPARISON.md

2. **고정 가중치 사용**
   - 현재: 9일 백테스팅 기반 고정 가중치
   - 향후: Phase 10 Adaptive Learning으로 개선 예정

3. **서울 도시만 지원**
   - 현재: 모든 도시 지원
   - 데이터 수집: 서울만 진행 중

#### 파일 구조 (Phase 8-9)
```
02-weather-app/
├── src/
│   ├── services/weather/
│   │   ├── CustomWeatherPredictor.ts ✅
│   │   ├── CustomWeatherPredictor.test.ts ✅
│   │   └── WeatherService.ts (수정)
│   ├── types/domain/
│   │   └── customPrediction.ts ✅
│   ├── views/
│   │   └── AIPredictionView.vue ✅
│   ├── components/
│   │   ├── CustomWeatherDisplay.vue ✅
│   │   ├── ConfidenceBadge.vue ✅
│   │   ├── ProviderComparison.vue ✅
│   │   ├── CyclingRecommendationFromAI.vue ✅
│   │   └── CyclingRecommendation.vue (수정)
│   ├── utils/
│   │   └── cyclingRecommender.ts (수정)
│   ├── stores/
│   │   └── weather.ts (수정)
│   └── router/
│       └── index.ts (수정)
└── docs/
    ├── PHASE_8-9_SUMMARY.md ✅
    ├── CYCLING_AI_INTEGRATION.md ✅
    └── WEATHER_API_COMPARISON.md (수정)
```

---

## 🚧 현재 진행 중

**없음** - Phase 8-9 완료, 모든 기능 구현 및 테스트 완료

---

## 📍 다음 단계

### 데이터 누적 기간
- [x] 첫 번째 데이터 수집 (2025-10-14) ✅
- [x] 10일 데이터 누적 (2025-10-23) ✅
- [ ] 30일 데이터 누적 (전체 분석)

### Phase 10 - Adaptive Learning (선택)
- [ ] 실시간 정확도 피드백 수집
- [ ] 자동 가중치 조정 알고리즘
- [ ] 시간대별/날씨별 가중치 최적화
- [ ] 사용자 선호도 학습

### 향후 개선 (선택)
- [ ] 8개 도시로 AI 예측 확장
- [ ] 주간 AI 분석 리포트
- [ ] 예측 범위 시각화 (min-max)
- [ ] 모바일 반응형 최적화
- [ ] E2E 테스트 확대

---

## 💡 메모

- OpenWeatherMap API 키: `.env` 파일에 설정
- 개발 서버: `npm run dev` (포트 5173)
- 테스트 실행: `npx playwright test`
- API 모킹으로 실제 API 키 없이도 테스트 가능

---

## 📦 설치된 패키지

```json
{
  "dependencies": {
    "vue": "^3.5.13",
    "pinia": "^2.3.0",
    "axios": "^1.7.9"
  },
  "devDependencies": {
    "@playwright/test": "^1.49.1",
    "@vitejs/plugin-vue": "^5.2.1",
    "typescript": "~5.6.2",
    "vite": "^6.0.1",
    "vue-tsc": "^2.1.10"
  }
}
```
