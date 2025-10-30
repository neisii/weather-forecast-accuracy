# Phase 5 Plan - User Experience & Performance

**작성일**: 2025-10-09  
**상태**: 계획 중  
**예상 소요 시간**: 4-6시간

---

## 📋 Phase 5 개요

Phase 4에서 테스트 완성도를 확보한 후, 사용자 경험 개선 및 성능 최적화를 진행합니다.

### Phase 5 목표

1. ✅ **한글 도시명 자동 변환** (HIGH) - 사용자 편의성 핵심
2. ✅ **테스트 커버리지 향상** (HIGH) - 품질 지표
3. ✅ **E2E 테스트 확장** (MEDIUM) - 신뢰성 향상
4. ✅ **도시 선택 UI 개선** (MEDIUM) - UX 개선
5. ✅ **성능 최적화** (LOW) - 추가 개선사항

**제외**: 반응형 디자인 (별도 이슈로 관리)

---

## 🎯 Task 상세 계획

### Task 1: 한글 도시명 자동 변환 (HIGH) ⭐

**우선순위**: HIGH  
**예상 소요 시간**: 1.5-2시간  
**필수 여부**: ✅ 필수

#### 1.1 문제 정의

**현재 상황**:
- WeatherAPI.com: 한글 도시명 미지원 ("부산" → 실패)
- Open-Meteo: 한글 도시명 미지원
- OpenWeatherMap: 한글/영문 모두 지원 ✅

**사용자 불편사항**:
```
사용자 입력: "부산"
WeatherAPI 결과: ❌ "No matching location found"
Open-Meteo 결과: ❌ 좌표를 찾을 수 없음

사용자 입력: "Busan"
WeatherAPI 결과: ✅ 정상 조회
Open-Meteo 결과: ✅ 정상 조회
```

#### 1.2 해결 방안

**Option 1**: cityCoordinates를 활용한 자동 변환 (선택)

**cityCoordinates 확장**:
```typescript
// src/config/cityCoordinates.ts
export interface CityCoordinate {
  name: string;       // 한글명 (기존)
  name_en: string;    // 영문명 (추가) ← NEW
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
    lon: 126.978,
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

**WeatherAPIAdapter 수정**:
```typescript
// src/adapters/weather/WeatherAPIAdapter.ts
import { CITY_COORDINATES } from '@/config/cityCoordinates';

async getCurrentWeather(city: string): Promise<CurrentWeather> {
  // 한글 → 영문 자동 변환
  const cityData = CITY_COORDINATES[city];
  const queryCity = cityData?.name_en || city;  // ← 변환 로직
  
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
// 이미 cityCoordinates 사용 중이므로 변경 최소
// name_en 필드만 활용하면 됨 (기존 로직 유지)
```

#### 1.3 역방향 매핑 추가 (선택사항)

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

export function getEnglishCityName(cityNameKr: string): string | undefined {
  return CITY_COORDINATES[cityNameKr]?.name_en;
}
```

#### 1.4 테스트 추가

**Unit Test 업데이트**:
```typescript
// src/adapters/weather/__tests__/WeatherAPIAdapter.spec.ts
describe('한글 도시명 자동 변환', () => {
  it('should convert Korean city name to English', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: mockResponse });
    
    await adapter.getCurrentWeather('서울');
    
    // 영문명으로 API 호출되었는지 확인
    expect(mockedAxios.get).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        params: expect.objectContaining({ q: 'Seoul' })
      })
    );
  });
  
  it('should restore Korean city name in response', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: mockResponse });
    
    const result = await adapter.getCurrentWeather('부산');
    
    // 응답에 한글명이 복원되었는지 확인
    expect(result.location.name).toBe('부산');
  });
});
```

**E2E Test 추가**:
```typescript
// tests/weather.spec.ts
test('한글 도시명으로 날씨 검색', async ({ page }) => {
  await page.selectOption('select[name="provider"]', 'weatherapi');
  await page.fill('input[placeholder*="도시"]', '부산');
  await page.click('button:has-text("검색")');
  
  await expect(page.locator('text=부산')).toBeVisible();
});
```

#### 1.5 완료 기준
- [ ] `cityCoordinates.ts`에 `name_en` 필드 추가 (8개 도시)
- [ ] WeatherAPIAdapter 한글→영문 변환 로직 구현
- [ ] OpenMeteoAdapter 확인 (이미 좌표 사용 중)
- [ ] Unit Test 추가 (2개 이상)
- [ ] E2E Test 추가 (1개 이상)
- [ ] 수동 테스트: "부산" 입력 시 WeatherAPI에서 정상 조회

---

### Task 2: 테스트 커버리지 향상 (HIGH) ⭐

**우선순위**: HIGH  
**예상 소요 시간**: 1-1.5시간  
**필수 여부**: ✅ 필수

#### 2.1 커버리지 리포트 생성

**설치 패키지**:
```bash
npm install -D @vitest/coverage-v8
```

**실행 명령**:
```bash
npm run test:coverage
```

**목표 커버리지**:
- **Statements**: 80% 이상
- **Branches**: 75% 이상
- **Functions**: 80% 이상
- **Lines**: 80% 이상

#### 2.2 커버리지 분석

**확인 파일**:
```
coverage/
├── index.html          # 시각적 리포트
├── coverage-summary.json
└── lcov.info
```

**분석 항목**:
1. Adapter 클래스: 현재 ~90% 예상 (잘 커버됨)
2. Domain types: 100% (타입 정의만)
3. Services: 확인 필요
4. Components: 제외 (E2E로 커버)

#### 2.3 미커버 영역 보완

**예상 미커버 영역**:
```typescript
// WeatherService.ts - Provider 관리 로직
export class WeatherService {
  private providers: Map<ProviderType, WeatherProvider>;
  
  // 이 메서드들이 Unit Test에서 누락되었을 가능성
  switchProvider(type: ProviderType): void { }
  getCurrentProvider(): WeatherProvider { }
}
```

**추가 테스트 작성**:
```typescript
// src/services/weather/__tests__/WeatherService.spec.ts
describe('WeatherService', () => {
  it('should switch providers correctly', () => {
    service.switchProvider('weatherapi');
    expect(service.getCurrentProvider().name).toBe('WeatherAPI.com');
  });
  
  it('should handle invalid provider type', () => {
    expect(() => service.switchProvider('invalid' as any))
      .toThrow(/Unknown provider/);
  });
});
```

#### 2.4 CI/CD 통합 (선택)

**GitHub Actions 예시** (향후):
```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:coverage
      - run: npx playwright test
```

#### 2.5 완료 기준
- [ ] 커버리지 리포트 생성 성공
- [ ] 전체 커버리지 80% 이상 달성
- [ ] 미커버 영역 분석 완료
- [ ] WeatherService 테스트 추가 (필요 시)
- [ ] 커버리지 리포트 문서화

---

### Task 3: E2E 테스트 확장 (MEDIUM)

**우선순위**: MEDIUM  
**예상 소요 시간**: 1.5-2시간  
**필수 여부**: ⚠️ 선택

#### 3.1 Provider별 테스트 파일 분리

**파일 구조**:
```
tests/
├── weather-mock.spec.ts         # Mock Provider (기존)
├── weather-openweather.spec.ts  # OpenWeatherMap (신규)
├── weather-weatherapi.spec.ts   # WeatherAPI (신규)
└── weather-provider.spec.ts     # Provider 전환 (신규)
```

#### 3.2 OpenWeatherMap Provider E2E

**파일**: `tests/weather-openweather.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Weather App - OpenWeatherMap Provider', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    
    // OpenWeatherMap Provider 선택
    await page.selectOption('select', 'openweather');
    await page.waitForLoadState('networkidle');
  });

  test('서울 날씨 조회 (실제 API)', async ({ page }) => {
    await page.fill('input[placeholder*="도시"]', '서울');
    await page.click('button:has-text("검색")');
    
    // 로딩 표시
    await expect(page.locator('.loading')).toBeVisible({ timeout: 2000 });
    
    // 결과 표시 (실제 API 응답 대기)
    await expect(page.locator('.weather')).toBeVisible({ timeout: 10000 });
    
    // 온도 형식 확인 (숫자 + °C)
    await expect(page.locator('text=/\\d+°C/')).toBeVisible();
  });

  test('Quota 상태 표시', async ({ page }) => {
    const quotaSection = page.locator('.quota, [class*="quota"]');
    await expect(quotaSection).toBeVisible();
    
    // "사용" 또는 "used" 텍스트 확인
    await expect(quotaSection).toContainText(/사용|used/i);
  });

  test('Rate Limit 도달 시 경고 표시', async ({ page }) => {
    // LocalStorage에 quota 95% 설정
    await page.evaluate(() => {
      const now = new Date();
      const resetTime = new Date(now.getTime() + 24*60*60*1000);
      localStorage.setItem('openweather_quota', JSON.stringify({
        used: 57,
        limit: 60,
        resetTime: resetTime.toISOString()
      }));
    });
    
    await page.reload();
    
    // 경고 상태 (🟡 또는 warning 클래스)
    await expect(page.locator('.warning, [class*="warning"]')).toBeVisible();
  });
});
```

#### 3.3 WeatherAPI Provider E2E

**파일**: `tests/weather-weatherapi.spec.ts`

```typescript
test.describe('Weather App - WeatherAPI Provider', () => {
  test('영문 도시명 조회', async ({ page }) => {
    await page.goto('/');
    await page.selectOption('select', 'weatherapi');
    
    await page.fill('input[placeholder*="도시"]', 'Seoul');
    await page.click('button:has-text("검색")');
    
    await expect(page.locator('.weather')).toBeVisible({ timeout: 10000 });
  });

  test('한글 도시명 자동 변환 (Task 1 완료 후)', async ({ page }) => {
    await page.goto('/');
    await page.selectOption('select', 'weatherapi');
    
    await page.fill('input[placeholder*="도시"]', '부산');
    await page.click('button:has-text("검색")');
    
    // 한글명으로 결과 표시
    await expect(page.locator('text=부산')).toBeVisible({ timeout: 10000 });
  });
});
```

#### 3.4 Provider 전환 시나리오

**파일**: `tests/weather-provider.spec.ts`

```typescript
test.describe('Provider 전환 시나리오', () => {
  test('Provider 변경 시 날씨 데이터 재조회', async ({ page }) => {
    await page.goto('/');
    
    // Mock Provider로 서울 검색
    await page.selectOption('select', 'mock');
    await page.fill('input[placeholder*="도시"]', '서울');
    await page.click('button:has-text("검색")');
    await expect(page.locator('.weather')).toBeVisible();
    
    const mockTemp = await page.locator('[class*="temperature"]').textContent();
    
    // OpenWeatherMap으로 전환
    await page.selectOption('select', 'openweather');
    await page.waitForTimeout(2000); // 재조회 대기
    
    const apiTemp = await page.locator('[class*="temperature"]').textContent();
    
    // 온도 값이 변경되었는지 확인 (Mock과 실제 API 다름)
    expect(mockTemp).not.toBe(apiTemp);
  });

  test('Provider 전환 시 Quota 정보 업데이트', async ({ page }) => {
    await page.goto('/');
    
    // Mock: 무제한
    await page.selectOption('select', 'mock');
    await expect(page.locator('text=/무제한|unlimited/i')).toBeVisible();
    
    // OpenWeatherMap: 분당 제한
    await page.selectOption('select', 'openweather');
    await expect(page.locator('text=/60|분당/i')).toBeVisible();
  });
});
```

#### 3.5 Error Handling 시나리오

```typescript
test.describe('에러 처리', () => {
  test('네트워크 오류 처리', async ({ page, context }) => {
    // 오프라인 모드 시뮬레이션
    await context.setOffline(true);
    
    await page.goto('/');
    await page.selectOption('select', 'openweather');
    await page.fill('input[placeholder*="도시"]', '서울');
    await page.click('button:has-text("검색")');
    
    // 에러 메시지 표시
    await expect(page.locator('.error')).toContainText(/네트워크|연결|network/i);
  });

  test('존재하지 않는 도시 처리', async ({ page }) => {
    await page.goto('/');
    await page.selectOption('select', 'openweather');
    await page.fill('input[placeholder*="도시"]', 'NonExistentCity12345');
    await page.click('button:has-text("검색")');
    
    await expect(page.locator('.error')).toContainText(/찾을 수 없|not found/i);
  });
});
```

#### 3.6 완료 기준
- [ ] Provider별 E2E 테스트 파일 분리
- [ ] OpenWeatherMap E2E 테스트 (3개 이상)
- [ ] WeatherAPI E2E 테스트 (2개 이상)
- [ ] Provider 전환 시나리오 (2개 이상)
- [ ] Error Handling 시나리오 (2개 이상)
- [ ] 총 E2E 테스트: 15개 이상 (현재 5개 → 목표 15개)

---

### Task 4: 도시 선택 UI 개선 (MEDIUM)

**우선순위**: MEDIUM  
**예상 소요 시간**: 1.5-2시간  
**필수 여부**: ⚠️ 선택

#### 4.1 문제 정의

**현재 UI**: 텍스트 입력만 가능
```vue
<input type="text" placeholder="도시 이름" />
<button>검색</button>
```

**불편사항**:
- 지원 도시 목록을 모름
- 오타 가능성
- 한글/영문 혼란

#### 4.2 해결 방안 - Option A: Datalist (추천)

**장점**:
- HTML5 표준
- JavaScript 최소화
- 브라우저 네이티브 자동완성

**구현**:
```vue
<!-- src/components/SearchBar.vue -->
<template>
  <div class="search-bar">
    <input
      v-model="cityInput"
      list="city-suggestions"
      type="text"
      placeholder="도시 이름 (한글/영문)"
      @keyup.enter="handleSearch"
    />
    <datalist id="city-suggestions">
      <option v-for="city in availableCities" :key="city.name" :value="city.name">
        {{ city.name_en }}
      </option>
    </datalist>
    <button @click="handleSearch">검색</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { CITY_COORDINATES } from '@/config/cityCoordinates';

const cityInput = ref('');

const availableCities = computed(() => {
  return Object.values(CITY_COORDINATES);
});

const emit = defineEmits<{
  search: [city: string];
}>();

function handleSearch() {
  if (cityInput.value.trim()) {
    emit('search', cityInput.value.trim());
  }
}
</script>
```

#### 4.3 해결 방안 - Option B: Dropdown + Input

**장점**:
- 명확한 선택지 표시
- 모바일 친화적

**구현**:
```vue
<template>
  <div class="search-bar">
    <!-- 드롭다운 -->
    <select v-model="selectedCity" @change="handleCitySelect">
      <option value="">직접 입력</option>
      <option v-for="city in availableCities" :key="city.name" :value="city.name">
        {{ city.name }} ({{ city.name_en }})
      </option>
    </select>
    
    <!-- 또는 직접 입력 -->
    <input
      v-model="cityInput"
      type="text"
      placeholder="또는 직접 입력"
      :disabled="selectedCity !== ''"
      @keyup.enter="handleSearch"
    />
    
    <button @click="handleSearch">검색</button>
  </div>
</template>

<script setup lang="ts">
const selectedCity = ref('');

function handleCitySelect() {
  if (selectedCity.value) {
    cityInput.value = selectedCity.value;
    handleSearch();
  }
}
</script>
```

#### 4.4 사용자 결정 필요

**Q1**: 어떤 UI 방식을 선호하시나요?
- **Option A**: Datalist (자동완성) - 간단하고 표준
- **Option B**: Dropdown + Input - 명확하지만 복잡

**Q2**: 도시 목록 정렬 방식?
- 가나다순 (기본)
- 사용 빈도순 (LocalStorage 추적 필요)
- 지역별 그룹화 (수도권/지방)

#### 4.5 완료 기준
- [ ] UI 방식 결정 (사용자 승인)
- [ ] SearchBar.vue 수정
- [ ] 8개 도시 목록 표시
- [ ] 한글/영문 모두 검색 가능
- [ ] 모바일 반응형 (별도 이슈 아님, 기본 대응만)
- [ ] E2E 테스트 추가 (Datalist 동작 확인)

---

### Task 5: 성능 최적화 (LOW)

**우선순위**: LOW  
**예상 소요 시간**: 1-1.5시간  
**필수 여부**: ❌ 선택

#### 5.1 Bundle Size 분석

**도구**:
```bash
npm run build
# dist/ 폴더 크기 확인

# 또는 Bundle Analyzer 사용
npm install -D rollup-plugin-visualizer
```

**현재 상태** (Phase 3 기준):
```
dist/assets/index-BFYGVQVi.js   131.08 kB │ gzip: 50.08 kB
dist/assets/index-Sr1LaXWw.css    4.48 kB │ gzip:  1.43 kB
```

**목표**:
- JS: < 150KB (gzip < 55KB) ✅ 이미 달성
- CSS: < 10KB (gzip < 3KB) ✅ 이미 달성

#### 5.2 API 응답 캐싱

**현재**: 매 검색마다 API 호출

**개선안**: 5분간 캐싱
```typescript
// src/services/weather/WeatherService.ts
interface CacheEntry {
  data: CurrentWeather;
  timestamp: number;
  provider: ProviderType;
}

export class WeatherService {
  private cache: Map<string, CacheEntry> = new Map();
  private CACHE_TTL = 5 * 60 * 1000; // 5분

  async getWeather(city: string): Promise<CurrentWeather> {
    const cacheKey = `${this.currentProvider}_${city}`;
    const cached = this.cache.get(cacheKey);
    
    // 캐시 유효성 확인
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      console.log('Cache hit:', cacheKey);
      return cached.data;
    }
    
    // API 호출
    const data = await this.provider.getCurrentWeather(city);
    
    // 캐시 저장
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      provider: this.currentProvider
    });
    
    return data;
  }
}
```

**효과**:
- 중복 검색 방지
- API Quota 절약
- 응답 속도 향상 (0ms)

#### 5.3 Lazy Loading (선택)

**현재**: 모든 Adapter가 초기 로드

**개선안**: Dynamic Import
```typescript
// src/services/weather/WeatherService.ts
async switchProvider(type: ProviderType) {
  let provider: WeatherProvider;
  
  switch (type) {
    case 'openweather':
      const { OpenWeatherAdapter } = await import('@/adapters/weather/OpenWeatherAdapter');
      provider = new OpenWeatherAdapter(this.config.openweatherKey);
      break;
    case 'weatherapi':
      const { WeatherAPIAdapter } = await import('@/adapters/weather/WeatherAPIAdapter');
      provider = new WeatherAPIAdapter(this.config.weatherapiKey);
      break;
    // ...
  }
  
  this.provider = provider;
}
```

**효과**:
- 초기 Bundle 크기 감소 (~10-15KB)
- TTI (Time to Interactive) 개선

**단점**:
- 첫 Provider 전환 시 지연 (~100ms)
- 코드 복잡도 증가

#### 5.4 완료 기준
- [ ] Bundle Size 분석 완료
- [ ] API 캐싱 구현 (5분 TTL)
- [ ] 캐싱 Unit Test 추가
- [ ] Lazy Loading 검토 (구현 여부 결정)
- [ ] 성능 측정: Lighthouse 점수 확인

---

## 📊 Task 우선순위 매트릭스

| Task | 우선순위 | 소요시간 | 필수 | 사용자 승인 필요 | 비고 |
|------|---------|---------|------|---------------|-----|
| 1. 한글 도시명 변환 | HIGH | 1.5-2h | ✅ | ❌ | 즉시 시작 가능 |
| 2. 테스트 커버리지 | HIGH | 1-1.5h | ✅ | ❌ | 즉시 시작 가능 |
| 3. E2E 테스트 확장 | MEDIUM | 1.5-2h | ⚠️ | ❌ | 시간 있으면 진행 |
| 4. 도시 선택 UI | MEDIUM | 1.5-2h | ⚠️ | ✅ | Q1, Q2 답변 필요 |
| 5. 성능 최적화 | LOW | 1-1.5h | ❌ | ❌ | 시간 여유 시 |

**Total 예상 소요 시간**:
- **필수 (Task 1-2)**: 2.5-3.5시간
- **전체**: 4-6시간

---

## 🎯 Phase 5 완료 기준

### 필수 조건 (Must Have)
- [ ] Task 1: 한글 도시명 자동 변환 구현
  - [ ] cityCoordinates에 name_en 필드 추가
  - [ ] WeatherAPIAdapter 수정
  - [ ] Unit Test 추가
  - [ ] E2E Test 추가
  - [ ] 수동 테스트: "부산" 검색 성공

- [ ] Task 2: 테스트 커버리지 80% 이상
  - [ ] 커버리지 리포트 생성
  - [ ] 전체 커버리지 80% 달성
  - [ ] 미커버 영역 분석 및 보완

### 선택 조건 (Nice to Have)
- [ ] Task 3: E2E 테스트 15개 이상
- [ ] Task 4: 도시 선택 UI 개선 (사용자 승인 후)
- [ ] Task 5: API 캐싱 구현

---

## 🔍 사용자 결정 필요 사항

### Q1: Task 4 (도시 선택 UI) 진행 여부
- **Option A**: Phase 5에 포함 (예상 시간 +1.5-2h)
- **Option B**: Phase 6 또는 별도 이슈로 분리
- **Option C**: 제외 (현재 텍스트 입력 유지)

**추천**: Option A (Datalist 방식으로 간단히 구현)

### Q2: Task 4 UI 방식 (Q1에서 Option A 선택 시)
- **Option A**: Datalist (자동완성) - 간단
- **Option B**: Dropdown + Input - 명확

**추천**: Option A (표준 HTML5, 추가 코드 최소)

### Q3: Task 5 (성능 최적화) 진행 여부
- **Option A**: Phase 5에 포함 (API 캐싱만)
- **Option B**: Phase 6으로 분리
- **Option C**: 제외 (현재 성능 충분)

**추천**: Option A (API 캐싱만 구현, 30분 소요)

### Q4: E2E 테스트 확장 범위
- **Option A**: Provider별 파일 분리 + 기본 시나리오 (5개 추가)
- **Option B**: 전체 확장 (15개 목표)
- **Option C**: 최소 확장 (현재 5개 유지)

**추천**: Option A (중간 수준, 실용적)

---

## 📝 시작 전 확인사항

### 환경 준비
```bash
# 현재 상태 확인
npm run test        # Unit Tests: 67 passed
npx playwright test # E2E Tests: 5 passed
npm run build       # Build 성공 확인

# 작업 브랜치 생성 (선택)
git checkout -b feature/phase-5
```

### 파일 체크리스트
- [ ] `src/config/cityCoordinates.ts` 존재 확인
- [ ] Adapter 파일 3개 존재 확인
- [ ] 테스트 파일 3개 존재 확인
- [ ] Phase 4 완료 상태 (git tag 확인)

---

## 🚀 작업 순서 제안

### Day 1: 필수 작업 (2.5-3.5h)
1. **Task 1**: 한글 도시명 자동 변환 (1.5-2h)
   - cityCoordinates 수정
   - Adapter 수정
   - 테스트 추가
   - 수동 검증

2. **Task 2**: 테스트 커버리지 (1-1.5h)
   - 커버리지 리포트 생성
   - 분석 및 보완
   - 문서화

**✅ Checkpoint**: 필수 조건 완료 확인

### Day 2: 선택 작업 (1.5-2.5h)
3. **Task 4** (사용자 승인 시): 도시 선택 UI (1.5-2h)
   - SearchBar.vue 수정
   - Datalist 구현
   - 테스트 추가

4. **Task 5** (시간 여유 시): API 캐싱 (0.5-1h)
   - WeatherService 수정
   - 캐싱 로직 구현
   - 테스트 추가

**✅ Checkpoint**: Phase 5 완료 기준 충족 확인

### Day 3: 확장 작업 (선택)
5. **Task 3**: E2E 테스트 확장 (1.5-2h)
   - Provider별 테스트 파일 작성
   - 시나리오 추가
   - 전체 테스트 검증

---

## 📚 참고 문서

### 관련 Phase 문서
- `docs/PHASE_4_SUMMARY.md`: 테스트 현황
- `docs/PHASE_3_SUMMARY.md`: 구현된 Adapter
- `docs/FUTURE_IMPROVEMENTS.md`: 장기 개선 과제

### 기술 문서
- `src/config/cityCoordinates.ts`: 도시 좌표 데이터
- `src/data/README.md`: Mock 데이터 구조
- `docs/WEATHER_API_COMPARISON.md`: API 특성 비교

---

## ✅ 검토 체크리스트

**프로젝트 매니저 검토 항목**:
- [ ] Task 우선순위 적절한가?
- [ ] 예상 소요 시간 합리적인가?
- [ ] Q1-Q4 질문에 대한 답변
- [ ] 추가/수정/제외할 Task가 있는가?
- [ ] Phase 5 범위가 적절한가? (너무 크거나 작지 않은가)

**기술 검토 항목**:
- [ ] 한글 도시명 변환 방식 적절한가?
- [ ] 테스트 커버리지 목표 (80%) 적절한가?
- [ ] UI 개선 방안 (Datalist vs Dropdown) 선호도?
- [ ] 성능 최적화 우선순위 적절한가?

---

**작성자**: Claude (AI)  
**검토 대기 중**: ⏳  
**승인 후 시작 가능**

---

## 📋 사용자 답변 양식

아래 질문에 답변해주시면 Phase 5를 시작하겠습니다:

**Q1** (Task 4 진행 여부):  
답변: `Option A / Option B / Option C`

**Q2** (Task 4 UI 방식, Q1이 Option A인 경우):  
답변: `Option A / Option B`

**Q3** (Task 5 진행 여부):  
답변: `Option A / Option B / Option C`

**Q4** (E2E 테스트 확장 범위):  
답변: `Option A / Option B / Option C`

**추가 요청사항**:  
_있으면 작성_

**승인**:  
답변: `이행 / 수정 필요 / 보류`
