# Weather App 트러블슈팅 가이드

## 📋 개요

이 문서는 Weather App (Vue 3 + Pinia) 개발 과정에서 마주한 모든 기술적 이슈와 해결 과정을 상세히 기록합니다.

**프로젝트**: 02-weather-app  
**프레임워크**: Vue 3 (Composition API) + Pinia + TypeScript  
**개발 기간**: 2025-10-07  
**마주친 이슈 수**: 4개 (Critical: 1, Medium: 2, Minor: 1)

---

## 🔴 Critical Issues

### Issue #1: 로딩 상태 테스트 타임아웃

**심각도**: Critical  
**발생 시각**: 2025-10-07  
**소요 시간**: ~20분  
**영향 범위**: Playwright E2E 테스트

#### 증상

Playwright 테스트 실행 시 로딩 스피너를 확인하는 테스트가 타임아웃으로 실패:

```bash
Error: expect(locator).toBeVisible()
Timeout 5000ms exceeded waiting for visibility
```

구체적인 실패 테스트:
```typescript
test('should display loading state while fetching weather', async ({ page }) => {
  await page.goto('/');
  await page.fill('[data-testid="search-input"]', '서울');
  await page.click('[data-testid="search-button"]');
  
  // ❌ 이 assertion이 실패
  await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible();
});
```

#### 원인 분석

1. **API 모킹의 즉시 응답**
   - Playwright의 `route.fulfill()` 메서드는 즉시 응답을 반환
   - 실제 네트워크 지연이 없어 로딩 상태가 1ms 미만으로 지속
   - 로딩 스피너가 표시되기도 전에 데이터가 이미 로드됨

2. **Vue의 Reactivity 업데이트 속도**
   - Pinia store의 `loading.value = true` 설정
   - 즉시 API 호출
   - 즉시 응답 수신
   - `loading.value = false` 설정
   - DOM 업데이트가 완료되기 전에 로딩 상태가 이미 `false`

3. **테스트 실행 순서**
   ```
   1. 버튼 클릭
   2. store.loading = true
   3. API 호출 (모킹, 즉시 반환)
   4. store.loading = false
   5. DOM 업데이트 (비동기)
   6. expect(loading).toBeVisible() 실행 ❌ 이미 false
   ```

#### 해결 방법

**방법 1**: 빠른 테스트에서 로딩 체크 제거

일반 검색 테스트에서는 로딩 상태 확인을 제거하고 결과만 확인:

```typescript
test('should search for Seoul weather', async ({ page }) => {
  await page.route('**/api.openweathermap.org/data/2.5/weather**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        name: '서울',
        main: { temp: 15, feels_like: 13, humidity: 60 },
        weather: [{ description: '맑음', icon: '01d' }],
        wind: { speed: 3.5 }
      })
    });
  });

  await page.goto('/');
  await page.fill('[data-testid="search-input"]', '서울');
  await page.click('[data-testid="search-button"]');

  // 로딩 체크 제거, 바로 결과 확인
  await expect(page.locator('text=서울')).toBeVisible();
  await expect(page.locator('text=15°C')).toBeVisible();
});
```

**방법 2**: 별도의 로딩 테스트에 인위적 지연 추가

로딩 상태를 확인하는 전용 테스트 작성:

```typescript
test('should display loading state while fetching weather', async ({ page }) => {
  await page.route('**/api.openweathermap.org/data/2.5/weather**', async (route) => {
    // ✅ 1초 지연 추가
    await new Promise(resolve => setTimeout(resolve, 1000));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        name: '서울',
        main: { temp: 15, feels_like: 13, humidity: 60 },
        weather: [{ description: '맑음', icon: '01d' }],
        wind: { speed: 3.5 }
      })
    });
  });

  await page.goto('/');
  await page.fill('[data-testid="search-input"]', '서울');
  
  // 클릭과 동시에 로딩 체크 시작
  const clickPromise = page.click('[data-testid="search-button"]');
  await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible();
  await clickPromise;
});
```

#### 학습 포인트

1. **API 모킹 시 타이밍 고려**
   - 실제 네트워크 지연을 시뮬레이션하려면 `setTimeout` 추가 필요
   - UI 상태 전환 테스트는 실제 지연이 필요할 수 있음

2. **Vue Reactivity의 비동기성**
   - `loading.value` 변경과 DOM 업데이트는 비동기적
   - `nextTick()`을 사용하면 DOM 업데이트 완료를 보장 가능

3. **테스트 전략 분리**
   - 빠른 기능 테스트: 결과만 확인
   - UI 상태 테스트: 인위적 지연으로 상태 전환 확인

#### 참고 자료

- [Playwright Network Mocking](https://playwright.dev/docs/network)
- [Vue Reactivity in Depth](https://vuejs.org/guide/extras/reactivity-in-depth.html)
- [Pinia Testing Guide](https://pinia.vuejs.org/cookbook/testing.html)

---

## 🟡 Medium Issues

### Issue #2: 개발 서버 포트 충돌

**심각도**: Medium  
**발생 시각**: 2025-10-07  
**소요 시간**: ~5분  
**영향 범위**: 개발 환경

#### 증상

Weather App 개발 서버 실행 시 포트 5173이 이미 사용 중:

```bash
$ npm run dev

Port 5173 is in use, trying another one...
Port 5174 is in use, trying another one...
Port 5175 is in use, trying another one...
Port 5176 is in use, trying another one...
```

#### 원인 분석

1. **다중 Vite 프로젝트 동시 실행**
   - todo-app (5173)
   - 이전 weather-app 인스턴스 (5174, 5175)
   - 기타 Vite 프로젝트들

2. **백그라운드에서 실행 중인 프로세스**
   - 터미널 종료 후에도 프로세스가 살아있음
   - `Ctrl+C`로 종료했지만 일부 프로세스 잔존

#### 해결 방법

**방법 1**: 특정 포트의 프로세스 종료

```bash
# 5173 포트 사용 중인 프로세스 찾기
lsof -ti:5173

# 해당 프로세스 종료
lsof -ti:5173 | xargs kill -9
```

**방법 2**: 여러 포트 일괄 정리

```bash
# 5173~5176 포트 모두 정리
lsof -ti:5173,5174,5175,5176 | xargs kill -9
```

**방법 3**: Vite 설정에서 포트 명시

`vite.config.ts` 수정:

```typescript
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5200, // 고정 포트 사용
    strictPort: true, // 포트 충돌 시 에러 발생
  }
});
```

#### 학습 포인트

1. **프로세스 관리 중요성**
   - 개발 서버 종료 시 제대로 종료되었는지 확인
   - `lsof` 명령어로 포트 사용 확인 습관화

2. **Vite 포트 자동 할당**
   - 기본적으로 5173부터 순차적으로 시도
   - 충돌 시 자동으로 다음 포트 시도
   - `strictPort: true`로 명시적 에러 처리 가능

#### 참고 자료

- [Vite Server Options](https://vitejs.dev/config/server-options.html)
- [lsof command guide](https://www.howtogeek.com/426031/how-to-use-the-linux-lsof-command/)

---

### Issue #3: API 키 환경변수 관리

**심각도**: Medium  
**발생 시각**: 2025-10-07  
**소요 시간**: ~10분  
**영향 범위**: 보안, 개발 설정

#### 증상

1. **초기 API 호출 실패**
   ```
   401 Unauthorized
   Invalid API key
   ```

2. **환경변수 인식 실패**
   ```typescript
   const API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY;
   console.log(API_KEY); // undefined
   ```

#### 원인 분석

1. **`.env` 파일 누락**
   - `.env` 파일이 Git에서 제외되어 있음 (`.gitignore`)
   - `.env.example`만 존재, 실제 `.env` 파일 생성 안 됨

2. **Vite 환경변수 prefix 규칙**
   - Vite는 `VITE_` prefix가 붙은 환경변수만 클라이언트에 노출
   - `OPENWEATHER_API_KEY` → 접근 불가
   - `VITE_OPENWEATHER_API_KEY` → 접근 가능

3. **개발 서버 재시작 필요**
   - `.env` 파일 변경 후 서버 재시작 안 함
   - 환경변수는 서버 시작 시점에 로드됨

#### 해결 방법

**Step 1**: `.env` 파일 생성

```bash
# .env.example을 복사
cp .env.example .env

# API 키 입력
echo "VITE_OPENWEATHER_API_KEY=your_actual_api_key_here" > .env
```

**Step 2**: 환경변수 사용 코드

```typescript
// src/services/weatherApi.ts
const API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY;

if (!API_KEY) {
  console.warn('OpenWeatherMap API key is not set');
}

const BASE_URL = 'https://api.openweathermap.org/data/2.5';

export const getCurrentWeather = async (city: string) => {
  const response = await axios.get(`${BASE_URL}/weather`, {
    params: {
      q: city,
      appid: API_KEY,
      units: 'metric',
      lang: 'kr'
    }
  });
  return response.data;
};
```

**Step 3**: 개발 서버 재시작

```bash
# 서버 종료 (Ctrl+C)
# 재시작
npm run dev
```

**Step 4**: `.env.example` 문서화

```bash
# .env.example
# OpenWeatherMap API Key
# Get your key from: https://openweathermap.org/api
VITE_OPENWEATHER_API_KEY=your_api_key_here
```

#### 보안 고려사항

1. **`.gitignore` 확인**
   ```
   .env
   .env.local
   .env.*.local
   ```

2. **API 키 노출 방지**
   - 클라이언트 코드에 API 키 직접 노출됨 (Vite의 특성)
   - 프로덕션에서는 백엔드 프록시 사용 권장
   - Rate limiting 설정 필수

3. **테스트 환경**
   - Playwright 테스트에서는 API 모킹 사용
   - 실제 API 키 불필요

#### 학습 포인트

1. **Vite 환경변수 규칙**
   - `VITE_` prefix 필수
   - `import.meta.env.VITE_*`로 접근
   - 서버 재시작 필요

2. **보안 베스트 프랙티스**
   - API 키는 절대 Git에 커밋하지 않기
   - `.env.example`로 필요한 변수 문서화
   - 프로덕션에서는 서버사이드 프록시 고려

#### 참고 자료

- [Vite Env Variables](https://vitejs.dev/guide/env-and-mode.html)
- [OpenWeatherMap API](https://openweathermap.org/api)
- [Environment Variable Security](https://12factor.net/config)

---

## 🟢 Minor Issues

### Issue #4: TypeScript 타입 추론 경고

**심각도**: Minor  
**발생 시각**: 2025-10-07  
**소요 시간**: ~5분  
**영향 범위**: TypeScript 타입 안정성

#### 증상

Pinia store에서 TypeScript 경고:

```typescript
// src/stores/weather.ts
const error = ref<string | null>(null);

async function fetchWeather(city: string) {
  try {
    // ...
  } catch (err: any) {
    // ⚠️ TypeScript warning: 'any' type is not safe
    if (err.response?.status === 404) {
      error.value = '도시를 찾을 수 없습니다';
    }
  }
}
```

#### 원인 분석

1. **Axios 에러 타입 불명확**
   - `catch` 블록의 `err`는 기본적으로 `unknown` 타입
   - Axios의 `AxiosError` 타입 사용 필요

2. **암묵적 `any` 사용**
   - `err: any`로 명시하면 타입 안정성 상실
   - Optional chaining (`?.`)으로 런타임 에러는 방지되지만 타입 체크는 우회

#### 해결 방법

**최종 구현** (타입 안전):

```typescript
import axios, { AxiosError } from 'axios';
import type { WeatherAPIResponse } from '../types/weather';

export const useWeatherStore = defineStore('weather', () => {
  const currentWeather = ref<CurrentWeather | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function fetchWeather(city: string) {
    loading.value = true;
    error.value = null;
    
    try {
      const data = await weatherApi.getCurrentWeather(city);
      currentWeather.value = {
        city: data.name,
        temperature: Math.round(data.main.temp),
        feelsLike: Math.round(data.main.feels_like),
        humidity: data.main.humidity,
        windSpeed: data.wind.speed,
        description: data.weather[0].description,
        icon: data.weather[0].icon,
      };
    } catch (err) {
      // ✅ Type guard for AxiosError
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 404) {
          error.value = '도시를 찾을 수 없습니다';
        } else if (err.response?.status === 401) {
          error.value = 'API 키가 유효하지 않습니다';
        } else {
          error.value = '오류가 발생했습니다. 다시 시도해주세요';
        }
      } else {
        error.value = '알 수 없는 오류가 발생했습니다';
      }
    } finally {
      loading.value = false;
    }
  }

  return {
    currentWeather,
    loading,
    error,
    fetchWeather,
  };
});
```

#### 개선 포인트

1. **Type Guard 사용**
   - `axios.isAxiosError(err)` 사용으로 타입 안전성 확보
   - `err.response?.status` 접근 시 타입 체크 완료

2. **명시적 에러 처리**
   - 404: 도시를 찾을 수 없음
   - 401: API 키 오류
   - 기타: 일반 에러 메시지

3. **사용자 친화적 메시지**
   - HTTP 상태 코드를 한글 메시지로 변환
   - 사용자가 다음 액션을 알 수 있도록 안내

#### 학습 포인트

1. **Axios Error Handling**
   - `axios.isAxiosError()` type guard 활용
   - `AxiosError<T>` 제네릭 타입으로 응답 타입 지정 가능

2. **TypeScript Best Practices**
   - `any` 타입 최소화
   - Type guard로 런타임 타입 체크
   - `unknown` → type guard → 구체적 타입

#### 참고 자료

- [Axios Error Handling](https://axios-http.com/docs/handling_errors)
- [TypeScript Type Guards](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)
- [Pinia TypeScript Support](https://pinia.vuejs.org/core-concepts/#TypeScript)

---

## 📊 이슈 통계

| 심각도 | 개수 | 평균 해결 시간 | 총 소요 시간 |
|--------|------|----------------|--------------|
| Critical | 1 | 20분 | 20분 |
| Medium | 2 | 7.5분 | 15분 |
| Minor | 1 | 5분 | 5분 |
| **합계** | **4** | **10분** | **40분** |

---

## 🎯 핵심 학습 내용

### 1. Vue 3 + Pinia 패턴

**Composition API Store:**
```typescript
export const useWeatherStore = defineStore('weather', () => {
  // State
  const currentWeather = ref<CurrentWeather | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Actions
  async function fetchWeather(city: string) {
    loading.value = true;
    try {
      const data = await weatherApi.getCurrentWeather(city);
      currentWeather.value = transformData(data);
    } catch (err) {
      handleError(err);
    } finally {
      loading.value = false;
    }
  }

  // Return (expose)
  return { currentWeather, loading, error, fetchWeather };
});
```

### 2. Playwright API Mocking

**기본 모킹:**
```typescript
await page.route('**/api.openweathermap.org/data/2.5/weather**', async (route) => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(mockData)
  });
});
```

**지연 추가 (로딩 테스트):**
```typescript
await page.route('**/api.openweathermap.org/**', async (route) => {
  await new Promise(resolve => setTimeout(resolve, 1000));
  await route.fulfill({ status: 200, body: JSON.stringify(mockData) });
});
```

**에러 시뮬레이션:**
```typescript
// 404 Not Found
await route.fulfill({ status: 404 });

// 401 Unauthorized
await route.fulfill({ status: 401 });
```

### 3. Vue Component Testing Patterns

**data-testid 사용:**
```vue
<template>
  <input 
    data-testid="search-input"
    v-model="searchQuery"
  />
  <button data-testid="search-button">검색</button>
  <div v-if="loading" data-testid="loading-spinner">Loading...</div>
  <div v-if="error" data-testid="error-message">{{ error }}</div>
</template>
```

**Playwright 테스트:**
```typescript
await page.fill('[data-testid="search-input"]', '서울');
await page.click('[data-testid="search-button"]');
await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible();
```

---

## 🛡️ 예방 전략

### 개발 시작 전 체크리스트

- [ ] `.env.example` 확인 및 `.env` 파일 생성
- [ ] 환경변수 prefix 규칙 확인 (Vite: `VITE_`)
- [ ] 개발 서버 포트 충돌 확인 (`lsof -ti:5173`)
- [ ] TypeScript strict 모드 활성화
- [ ] Pinia devtools 설치 (디버깅용)

### 코딩 중 베스트 프랙티스

1. **타입 안정성**
   - `any` 타입 최소화
   - Axios 에러는 `axios.isAxiosError()` 사용
   - Type-only imports: `import type { ... }`

2. **API 모킹 전략**
   - 빠른 테스트: 즉시 응답
   - UI 상태 테스트: 인위적 지연 추가
   - 에러 시나리오 테스트: HTTP 상태 코드 시뮬레이션

3. **환경변수 관리**
   - API 키는 `.env`에만 저장
   - `.env.example`로 필요한 변수 문서화
   - 서버 재시작으로 환경변수 반영 확인

### 테스트 작성 가이드

1. **API 모킹 필수**
   - 실제 API 호출 대신 `page.route()` 사용
   - 다양한 응답 시나리오 테스트

2. **로딩 상태 테스트**
   - 별도 테스트로 분리
   - 인위적 지연 추가

3. **에러 처리 테스트**
   - 404, 401 등 HTTP 상태 코드별 테스트
   - 사용자 친화적 메시지 확인

---

## 📚 참고 자료

### 공식 문서
- [Vue 3 Documentation](https://vuejs.org/)
- [Pinia Documentation](https://pinia.vuejs.org/)
- [Vite Documentation](https://vitejs.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Axios Documentation](https://axios-http.com/)

### API 문서
- [OpenWeatherMap API](https://openweathermap.org/api)
- [Current Weather Data API](https://openweathermap.org/current)

### TypeScript
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/)
- [Type Guards and Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)

### Testing
- [Playwright Network Mocking](https://playwright.dev/docs/network)
- [Testing Vue Components](https://vuejs.org/guide/scaling-up/testing.html)

---

## 🔄 회고

### 잘한 점

1. **체계적인 타입 정의**
   - `CurrentWeather`, `WeatherAPIResponse` 타입 분리
   - API 응답과 UI 모델 명확히 구분

2. **효과적인 API 모킹**
   - 실제 API 키 없이도 완전한 테스트 가능
   - 다양한 에러 시나리오 커버

3. **사용자 친화적 에러 메시지**
   - HTTP 상태 코드를 한글 메시지로 변환
   - 각 에러 상황에 맞는 구체적 안내

### 개선할 점

1. **초기 환경 설정 문서화**
   - `.env` 설정 가이드 README에 명시 필요
   - API 키 발급 방법 안내

2. **로딩 상태 테스트 전략**
   - 초기부터 인위적 지연을 고려한 테스트 설계
   - 실제 네트워크 환경 시뮬레이션 고려

3. **에러 바운더리 패턴**
   - Vue 3 Error Handling 메커니즘 활용 검토
   - 전역 에러 핸들러 고려

### 다음 프로젝트 적용 사항

1. **환경변수 체크리스트**
   - 프로젝트 시작 시 `.env` 설정 먼저 확인
   - README에 필수 환경변수 명시

2. **타입 안정성 우선**
   - `any` 타입 사용 시 즉시 리팩토링
   - Type guard 패턴 적극 활용

3. **테스트 전략 사전 계획**
   - API 모킹 전략 먼저 수립
   - 로딩/에러 상태 테스트 시나리오 사전 정의

---

**문서 작성일**: 2025-10-07  
**작성자**: Claude Code Assistant  
**프로젝트 버전**: 1.0.0
