# Phase 4 Plan - Quality & Refinement

**작성일**: 2025-10-09  
**상태**: 계획 중  
**목적**: 테스트 완성도 향상 및 사용자 경험 개선

---

## 📋 Phase 4 개요

Phase 3에서 WeatherAPI.com 및 Open-Meteo 어댑터 구현을 완료했으나, 다음 과제들이 미완료 상태로 남아있습니다:

### 미완료 과제 (Phase 3)
1. ⚠️ **Unit Tests 미구현**
   - WeatherAPIAdapter.spec.ts
   - OpenMeteoAdapter.spec.ts
   
2. ⚠️ **E2E 테스트 타임아웃 이슈**
   - Playwright 테스트 120초 초과로 실패
   
3. ⚠️ **한글 도시명 미지원**
   - WeatherAPI.com, Open-Meteo에서 "부산" 검색 실패
   - 영문명 "Busan"으로만 검색 가능

### Phase 4 목표

**1차 목표: 테스트 완성도 향상**
- Unit Tests 작성 및 커버리지 확보
- E2E 테스트 안정화

**2차 목표: 사용자 경험 개선**
- 한글 도시명 자동 변환
- 도시 검색 UI/UX 개선

---

## 🎯 Phase 4 작업 계획

### Task 1: Unit Tests 작성 ✅ (필수)

**우선순위**: HIGH  
**예상 소요 시간**: 2-3시간

#### 1.1 WeatherAPIAdapter Unit Tests

**파일**: `src/adapters/weather/__tests__/WeatherAPIAdapter.spec.ts`

**테스트 케이스**:
```typescript
describe('WeatherAPIAdapter', () => {
  describe('getCurrentWeather', () => {
    it('should fetch and transform weather data correctly', async () => {
      // Mock API 응답
      // 도메인 타입 변환 검증
    });
    
    it('should handle API errors (401, 403, 429)', async () => {
      // 에러 처리 검증
    });
    
    it('should map condition codes to standard icons', async () => {
      // weatherIcon.ts 매핑 검증
    });
    
    it('should distinguish day/night correctly', async () => {
      // is_day 필드 기반 아이콘 선택 검증
    });
  });
  
  describe('checkQuota', () => {
    it('should track monthly API calls', async () => {
      // LocalStorage quota 추적 검증
    });
    
    it('should reset quota on new month', async () => {
      // 월 단위 리셋 로직 검증
    });
    
    it('should calculate quota status correctly', async () => {
      // normal/warning/exceeded 상태 계산 검증
    });
  });
});
```

**Mock 전략**:
- `axios` 모킹 (`vitest.mock` 또는 `msw` 활용)
- LocalStorage 모킹 (`vi.stubGlobal`)
- 환경 변수 모킹 (`import.meta.env`)

#### 1.2 OpenMeteoAdapter Unit Tests

**파일**: `src/adapters/weather/__tests__/OpenMeteoAdapter.spec.ts`

**테스트 케이스**:
```typescript
describe('OpenMeteoAdapter', () => {
  describe('getCurrentWeather', () => {
    it('should fetch and transform weather data correctly', async () => {
      // Mock API 응답
      // WMO code → 아이콘 변환 검증
    });
    
    it('should use cityCoordinates for location lookup', async () => {
      // CITY_COORDINATES 매핑 검증
    });
    
    it('should calculate day/night based on longitude', async () => {
      // isDaytime 로직 검증
    });
    
    it('should handle unknown cities', async () => {
      // cityCoordinates에 없는 도시 에러 처리
    });
  });
  
  describe('checkQuota', () => {
    it('should always return unlimited quota', async () => {
      // 무제한 quota 상태 검증
    });
  });
});
```

#### 1.3 MockWeatherAdapter Unit Tests

**파일**: `src/adapters/weather/__tests__/MockWeatherAdapter.spec.ts`

**테스트 케이스**:
```typescript
describe('MockWeatherAdapter', () => {
  it('should load mock data from JSON', async () => {
    // mockWeather.json 로딩 검증
  });
  
  it('should return predefined city data', async () => {
    // 서울, 부산 등 사전 정의 데이터 검증
  });
  
  it('should handle unknown cities with fallback', async () => {
    // 알 수 없는 도시 처리
  });
  
  it('should simulate API delay', async () => {
    // setTimeout 지연 검증
  });
});
```

#### 1.4 테스트 커버리지 목표

**목표 커버리지**:
- **Statements**: 80% 이상
- **Branches**: 75% 이상
- **Functions**: 80% 이상
- **Lines**: 80% 이상

**커버리지 확인**:
```bash
npm run test:coverage
```

---

### Task 2: E2E 테스트 안정화 🔍 (필수)

**우선순위**: HIGH  
**예상 소요 시간**: 2-3시간

#### 2.1 타임아웃 원인 조사

**현재 상황**:
```bash
npx playwright test
# Timeout: 120초 초과
```

**조사 항목**:
1. **네트워크 요청 타임아웃**
   - API 호출이 응답하지 않는지 확인
   - Mock 서버 사용 검토
   
2. **무한 루프 또는 대기 상태**
   - 특정 selector 대기 중 타임아웃
   - 조건부 렌더링 이슈
   
3. **설정 문제**
   - `playwright.config.ts` timeout 설정 검토
   - Browser launch 시간 초과

**디버깅 방법**:
```bash
# Headed 모드로 실행 (브라우저 화면 표시)
npx playwright test --headed

# 디버그 모드
npx playwright test --debug

# 특정 테스트만 실행
npx playwright test tests/weather.spec.ts
```

#### 2.2 테스트 안정화 전략

**Option 1: Mock API 사용**
```typescript
// tests/weather.spec.ts
test.beforeEach(async ({ page }) => {
  // API 호출 인터셉트
  await page.route('**/api.openweathermap.org/**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ /* mock data */ })
    });
  });
});
```

**Option 2: 환경 변수로 Mock Provider 강제**
```typescript
// playwright.config.ts
use: {
  baseURL: 'http://localhost:5173',
  env: {
    VITE_WEATHER_PROVIDER: 'mock'  // E2E 테스트 시 항상 Mock 사용
  }
}
```

**Option 3: Timeout 증가 (임시 방편)**
```typescript
// playwright.config.ts
use: {
  actionTimeout: 30000,      // 30초
  navigationTimeout: 60000,  // 60초
}
```

#### 2.3 테스트 시나리오 재검토

**기존 테스트 개선**:
```typescript
test('should display weather information', async ({ page }) => {
  await page.goto('/');
  
  // 도시 입력
  await page.fill('input[placeholder*="도시"]', '서울');
  await page.click('button:has-text("검색")');
  
  // 결과 대기 (명확한 selector)
  await page.waitForSelector('[data-testid="weather-result"]', {
    state: 'visible',
    timeout: 10000
  });
  
  // 검증
  const temperature = await page.textContent('[data-testid="temperature"]');
  expect(temperature).toBeTruthy();
});
```

---

### Task 3: 한글 도시명 자동 변환 🌐 (선택)

**우선순위**: MEDIUM  
**예상 소요 시간**: 1-2시간

#### 3.1 cityCoordinates 구조 확장

**현재 구조**:
```typescript
// src/config/cityCoordinates.ts
export const CITY_COORDINATES: Record<string, CityCoordinate> = {
  '서울': { lat: 37.5665, lon: 126.9780, ... },
  '부산': { lat: 35.1796, lon: 129.0756, ... },
  // ...
};
```

**개선 후 구조**:
```typescript
export interface CityCoordinate {
  name: string;       // 한글명
  name_en: string;    // 영문명 (추가)
  lat: number;
  lon: number;
  country: string;
  timezone: string;
}

export const CITY_COORDINATES: Record<string, CityCoordinate> = {
  '서울': {
    name: '서울',
    name_en: 'Seoul',   // ← 추가
    lat: 37.5665,
    lon: 126.9780,
    country: 'KR',
    timezone: 'Asia/Seoul'
  },
  '부산': {
    name: '부산',
    name_en: 'Busan',   // ← 추가
    lat: 35.1796,
    lon: 129.0756,
    country: 'KR',
    timezone: 'Asia/Seoul'
  },
  // ... 나머지 6개 도시
};
```

#### 3.2 Adapter 수정

**WeatherAPIAdapter 수정**:
```typescript
// src/adapters/weather/WeatherAPIAdapter.ts
import { CITY_COORDINATES } from '@/config/cityCoordinates';

async getCurrentWeather(city: string): Promise<CurrentWeather> {
  // 한글 입력 시 영문명으로 변환
  const cityData = CITY_COORDINATES[city];
  const queryCity = cityData?.name_en || city;
  
  const response = await axios.get<WeatherAPIResponse>(
    `${this.BASE_URL}/current.json`,
    {
      params: {
        key: this.apiKey,
        q: queryCity,  // 영문명으로 API 호출
        aqi: 'no'
      }
    }
  );
  
  // 응답의 location.name을 한글명으로 교체
  const currentWeather = this.transformToCurrentWeather(response.data);
  
  if (cityData) {
    currentWeather.location.name = cityData.name;  // 한글명 복원
  }
  
  return currentWeather;
}
```

**OpenMeteoAdapter 수정**:
```typescript
// 이미 cityCoordinates를 사용하므로 name_en 필드만 활용
async getCurrentWeather(city: string): Promise<CurrentWeather> {
  const cityData = CITY_COORDINATES[city];
  if (!cityData) {
    throw new Error(`Unknown city: ${city}`);
  }
  
  // 좌표 기반 API 호출 (변경 없음)
  const response = await axios.get(...);
  
  const currentWeather = this.transformToCurrentWeather(response.data);
  currentWeather.location.name = cityData.name;  // 한글명 유지
  
  return currentWeather;
}
```

#### 3.3 역방향 매핑 추가 (선택사항)

**영문명 → 한글명 조회**:
```typescript
// src/config/cityCoordinates.ts
export const CITY_NAME_EN_TO_KR: Record<string, string> = {
  'Seoul': '서울',
  'Busan': '부산',
  'Incheon': '인천',
  'Daegu': '대구',
  'Gwangju': '광주',
  'Daejeon': '대전',
  'Ulsan': '울산',
  'Jeju': '제주'
};

export function getKoreanCityName(cityNameEn: string): string | undefined {
  return CITY_NAME_EN_TO_KR[cityNameEn];
}
```

---

### Task 4: UI/UX 개선 (선택)

**우선순위**: LOW  
**예상 소요 시간**: 2-3시간

#### 4.1 도시 선택 드롭다운

**현재**: 텍스트 입력 → 타이핑 필요

**개선**: 드롭다운 + 자동완성
```vue
<template>
  <div class="city-selector">
    <!-- 드롭다운 방식 -->
    <select v-model="selectedCity" @change="handleCityChange">
      <option value="">도시 선택</option>
      <option v-for="city in availableCities" :key="city.name" :value="city.name">
        {{ city.name }} ({{ city.name_en }})
      </option>
    </select>
    
    <!-- 또는 자동완성 입력 -->
    <input
      v-model="cityInput"
      @input="handleInput"
      list="city-suggestions"
      placeholder="도시 이름 입력 (한글/영문)"
    />
    <datalist id="city-suggestions">
      <option v-for="city in filteredCities" :key="city.name" :value="city.name">
        {{ city.name_en }}
      </option>
    </datalist>
  </div>
</template>
```

**장점**:
- 오타 방지
- 지원 도시 명확히 표시
- 한글/영문 모두 검색 가능

#### 4.2 Provider 상태 표시 개선

**현재**: Quota 정보만 표시

**개선**: Provider 특성 표시
```vue
<div class="provider-info">
  <span class="provider-name">{{ currentProvider.name }}</span>
  
  <!-- OpenWeatherMap -->
  <span v-if="currentProvider === 'openweather'" class="provider-features">
    ⚡ 실시간 | 🌍 한글 지원 | 📊 분당 60회
  </span>
  
  <!-- WeatherAPI.com -->
  <span v-if="currentProvider === 'weatherapi'" class="provider-features">
    ⚡ 실시간 | 🌏 영문만 | 📊 월 100만회
  </span>
  
  <!-- Open-Meteo -->
  <span v-if="currentProvider === 'open-meteo'" class="provider-features">
    ⚡ 실시간 | 🌏 영문만 | ♾️ 무제한
  </span>
  
  <!-- Mock -->
  <span v-if="currentProvider === 'mock'" class="provider-features">
    🔧 테스트용 | 💾 로컬 데이터
  </span>
</div>
```

---

## 📊 Task 우선순위 요약

| Task | 우선순위 | 소요 시간 | 필수 여부 |
|------|---------|----------|----------|
| 1. Unit Tests 작성 | HIGH | 2-3h | ✅ 필수 |
| 2. E2E 테스트 안정화 | HIGH | 2-3h | ✅ 필수 |
| 3. 한글 도시명 변환 | MEDIUM | 1-2h | ⚠️ 선택 |
| 4. UI/UX 개선 | LOW | 2-3h | ⚠️ 선택 |

**Total 예상 소요 시간**: 
- **필수**: 4-6시간
- **전체**: 7-11시간

---

## 🎯 Phase 4 완료 기준

### 필수 조건 (Must Have)
- [ ] WeatherAPIAdapter Unit Tests 작성 (커버리지 80% 이상)
- [ ] OpenMeteoAdapter Unit Tests 작성 (커버리지 80% 이상)
- [ ] MockWeatherAdapter Unit Tests 작성 (커버리지 80% 이상)
- [ ] E2E 테스트 타임아웃 해결 및 안정화
- [ ] 모든 테스트 통과 (`npm run test`, `npx playwright test`)

### 선택 조건 (Nice to Have)
- [ ] 한글 도시명 자동 변환 구현
- [ ] cityCoordinates 구조 확장 (name_en 필드 추가)
- [ ] 도시 선택 UI 개선 (드롭다운 또는 자동완성)
- [ ] Provider 특성 표시 개선

---

## 🚀 시작 전 확인사항

### 환경 준비
```bash
# 테스트 프레임워크 확인
npm run test --version  # Vitest 확인
npx playwright --version  # Playwright 확인

# 현재 테스트 상태 확인
npm run test  # Unit tests
npx playwright test  # E2E tests
```

### 사용자 결정 필요 사항

#### Q1: 한글 도시명 변환을 Phase 4에 포함할까요?
- **Option A**: Phase 4에 포함 (사용자 경험 즉시 개선)
- **Option B**: Phase 5 또는 별도 작업으로 분리

#### Q2: UI/UX 개선 범위는?
- **Option A**: 드롭다운만 추가 (간단)
- **Option B**: 자동완성 입력 추가 (고급)
- **Option C**: Phase 4에서 제외

#### Q3: E2E 테스트 전략은?
- **Option A**: Mock Provider 강제 사용 (안정성 우선)
- **Option B**: 실제 API 사용 + Timeout 증가 (실제 환경 검증)
- **Option C**: Mock + 선택적 실제 API 테스트

---

## 📝 다음 단계

1. **사용자 결정**: 위 Q1~Q3 질문 답변
2. **작업 시작**: 우선순위 HIGH 작업부터 착수
3. **진행 상황 추적**: PHASE_4_SUMMARY.md 작성 (완료 후)
4. **Git 태깅**: `v0.1.0-refactor-phase4` (완료 후)

---

**작성자**: Claude (AI)  
**검토자**: [사용자 이름]  
**승인 대기**: ⏳

---

## 참고 문서

- `docs/PHASE_3_SUMMARY.md`: Phase 3 완료 상태 및 미완료 과제
- `docs/FUTURE_IMPROVEMENTS.md`: 장기 개선 과제 목록
- `docs/REFACTORING_PLAN.md`: 전체 리팩토링 계획
