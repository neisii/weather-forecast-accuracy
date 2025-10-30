# Phase 3 Implementation Plan

**작성일**: 2025-10-08  
**목표**: 추가 Weather Provider 구현 및 테스트 완성

---

## 📋 Phase 3 목표

### 주요 작업
1. **WeatherAPI.com Adapter 구현**
2. **Open-Meteo Adapter 구현**
3. **Unit Tests 추가 (Vitest)**
4. **E2E 테스트 개선**
5. **Phase 3 문서화**

### 예상 소요 시간
- WeatherAPI.com Adapter: 1시간
- Open-Meteo Adapter: 1.5시간 (feelsLike 계산 포함)
- Unit Tests: 1시간
- E2E 테스트 개선: 30분
- 문서화: 30분
- **총 예상 시간**: 4.5시간

---

## 🎯 작업 1: WeatherAPI.com Adapter 구현

### 1.1 API 사양 확인

**Base URL**: `https://api.weatherapi.com/v1`

**현재 계정 정보**:
- API Key: `4fc7**********************250810` (실제 키는 .env 파일 참조)
- Pro Plus Plan Trial: 2025/10/22까지
- Free Plan Limit: 월 1,000,000 호출

**API Endpoints**:
```bash
# Current Weather
GET /current.json?key={API_KEY}&q={CITY}&aqi=no

# Forecast (Phase 3에서 사용)
GET /forecast.json?key={API_KEY}&q={CITY}&days=5&aqi=no
```

**응답 구조**:
```json
{
  "location": {
    "name": "Seoul",
    "country": "South Korea",
    "lat": 37.57,
    "lon": 127.0
  },
  "current": {
    "temp_c": 20.0,
    "condition": {
      "text": "Partly cloudy",
      "icon": "//cdn.weatherapi.com/weather/64x64/day/116.png",
      "code": 1003
    },
    "humidity": 60,
    "feelslike_c": 19.5,
    "wind_kph": 15.0
  }
}
```

### 1.2 구현 체크리스트

**파일**: `src/adapters/weather/WeatherAPIAdapter.ts`

- [ ] WeatherProvider 인터페이스 구현
- [ ] getCurrentWeather() 메서드
  - [ ] API 호출 (axios)
  - [ ] 응답 → CurrentWeather 변환
  - [ ] 에러 처리 (401, 404, 429, 500)
- [ ] Weather Condition Code → WeatherIcon 매핑
  - [ ] WeatherAPI.com condition codes 분석
  - [ ] weatherIcon.ts에 매핑 추가
- [ ] Quota 관리
  - [ ] localStorage에 월간 호출 수 저장
  - [ ] checkQuota() 구현
  - [ ] incrementQuota() 구현
  - [ ] 매월 1일 0시 자동 리셋
- [ ] TypeScript 타입 정의
  - [ ] WeatherAPIResponse 인터페이스
  - [ ] WeatherAPICondition 인터페이스

### 1.3 Condition Code 매핑

WeatherAPI.com의 condition codes를 표준 WeatherIcon으로 매핑:

| Condition Code | Description | WeatherIcon |
|----------------|-------------|-------------|
| 1000 | Sunny/Clear | `clear-day` / `clear-night` |
| 1003 | Partly cloudy | `partly-cloudy-day` / `partly-cloudy-night` |
| 1006 | Cloudy | `cloudy` |
| 1009 | Overcast | `cloudy` |
| 1030 | Mist | `fog` |
| 1063-1072 | Rain variants | `rain` |
| 1087 | Thundery | `thunderstorm` |
| 1114-1117 | Blowing snow | `snow` |
| 1135-1147 | Fog | `fog` |
| 1150-1201 | Rain | `rain` |
| 1204-1237 | Sleet | `sleet` |
| 1240-1246 | Rain showers | `rain` |
| 1249-1264 | Sleet showers | `sleet` |
| 1273-1282 | Thunderstorm | `thunderstorm` |

**참고**: WeatherAPI.com은 낮/밤 구분을 자동으로 제공 (`is_day` 필드)

### 1.4 Quota 관리 전략

```typescript
interface WeatherAPIQuotaData {
  callsThisMonth: number;
  monthlyLimit: number;
  lastResetDate: string; // ISO 8601 format (YYYY-MM-01)
}

// localStorage key: 'weatherapi_quota'
```

**리셋 로직**:
- 현재 날짜가 `lastResetDate`의 다음 달인지 확인
- 다음 달이면 `callsThisMonth`를 0으로 리셋
- `lastResetDate`를 현재 월의 1일로 업데이트

---

## 🎯 작업 2: Open-Meteo Adapter 구현

### 2.1 API 사양 확인

**Base URL**: `https://api.open-meteo.com/v1`

**특징**:
- ✅ 완전 무료
- ✅ API 키 불필요
- ✅ 무제한 호출 (Rate limit: 10,000 calls/day per IP)
- ⚠️ `feelsLike` 직접 제공 안함 → 계산 필요

**API Endpoint**:
```bash
GET /forecast?latitude={LAT}&longitude={LON}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,apparent_temperature
```

**응답 구조**:
```json
{
  "latitude": 37.5665,
  "longitude": 126.978,
  "current": {
    "time": "2025-10-08T10:00",
    "temperature_2m": 20.0,
    "relative_humidity_2m": 60,
    "weather_code": 3,
    "wind_speed_10m": 15.0,
    "apparent_temperature": 19.5
  }
}
```

### 2.2 구현 체크리스트

**파일**: `src/adapters/weather/OpenMeteoAdapter.ts`

- [ ] WeatherProvider 인터페이스 구현
- [ ] getCurrentWeather() 메서드
  - [ ] 도시 이름 → 좌표 변환 (`cityCoordinates.ts` 활용)
  - [ ] API 호출 (axios)
  - [ ] 응답 → CurrentWeather 변환
  - [ ] 에러 처리 (400, 500)
- [ ] WMO Weather Code → WeatherIcon 매핑
  - [ ] WMO codes 분석 (0-99)
  - [ ] weatherIcon.ts에 매핑 추가
- [ ] Quota 관리
  - [ ] checkQuota() - 항상 정상 반환 (무제한)
  - [ ] QuotaInfo에 "Unlimited" 표시
- [ ] TypeScript 타입 정의
  - [ ] OpenMeteoResponse 인터페이스
  - [ ] OpenMeteoCurrent 인터페이스

### 2.3 WMO Weather Code 매핑

Open-Meteo는 WMO (World Meteorological Organization) 표준 코드 사용:

| WMO Code | Description | WeatherIcon |
|----------|-------------|-------------|
| 0 | Clear sky | `clear-day` / `clear-night` |
| 1, 2, 3 | Mainly clear, partly cloudy, overcast | `partly-cloudy-day` / `cloudy` |
| 45, 48 | Fog | `fog` |
| 51, 53, 55 | Drizzle | `rain` |
| 61, 63, 65 | Rain | `rain` |
| 71, 73, 75 | Snow fall | `snow` |
| 77 | Snow grains | `snow` |
| 80, 81, 82 | Rain showers | `rain` |
| 85, 86 | Snow showers | `snow` |
| 95, 96, 99 | Thunderstorm | `thunderstorm` |

**참고**: Open-Meteo는 낮/밤 구분 없음 → 현재 시간으로 판단 필요

### 2.4 낮/밤 구분 로직

```typescript
function isDaytime(latitude: number, longitude: number): boolean {
  const now = new Date();
  const hour = now.getUTCHours();
  
  // 간단한 구현: 6시~18시는 낮, 나머지는 밤
  // 정확한 구현은 sunrise/sunset API 사용 또는 sun position 계산
  
  // 경도 기반 시차 보정
  const timezoneOffset = longitude / 15; // 경도 15도당 1시간
  const localHour = (hour + timezoneOffset + 24) % 24;
  
  return localHour >= 6 && localHour < 18;
}
```

**개선안 (선택사항)**:
- Open-Meteo의 sunrise/sunset 데이터 활용
- 더 정확한 일출/일몰 계산 라이브러리 사용

---

## 🎯 작업 3: Unit Tests 추가 (Vitest)

### 3.1 테스트 파일 구조

```
src/
├── adapters/
│   └── weather/
│       ├── __tests__/
│       │   ├── OpenWeatherAdapter.spec.ts
│       │   ├── WeatherAPIAdapter.spec.ts
│       │   ├── OpenMeteoAdapter.spec.ts
│       │   └── MockWeatherAdapter.spec.ts
│       └── ...
└── services/
    └── weather/
        └── __tests__/
            └── WeatherService.spec.ts
```

### 3.2 테스트 체크리스트

#### OpenWeatherAdapter.spec.ts
- [ ] getCurrentWeather() 성공 케이스
  - [ ] 정상 응답 변환 확인
  - [ ] 도메인 타입 매핑 검증
- [ ] getCurrentWeather() 에러 케이스
  - [ ] 401 Unauthorized (잘못된 API 키)
  - [ ] 404 Not Found (존재하지 않는 도시)
  - [ ] 429 Too Many Requests (quota 초과)
  - [ ] 500 Server Error
- [ ] checkQuota() 테스트
  - [ ] 분당 호출 수 추적
  - [ ] Rolling window 로직 검증
  - [ ] Quota 상태 계산 (normal/warning/exceeded)
- [ ] Quota 리셋 로직 테스트

#### WeatherAPIAdapter.spec.ts
- [ ] getCurrentWeather() 성공 케이스
- [ ] getCurrentWeather() 에러 케이스
- [ ] Condition code 매핑 검증
- [ ] checkQuota() 테스트 (월간 제한)
- [ ] 월간 리셋 로직 테스트

#### OpenMeteoAdapter.spec.ts
- [ ] getCurrentWeather() 성공 케이스
- [ ] 도시 이름 → 좌표 변환 테스트
- [ ] WMO code 매핑 검증
- [ ] 낮/밤 구분 로직 테스트
- [ ] checkQuota() - 무제한 확인

#### MockWeatherAdapter.spec.ts
- [ ] getCurrentWeather() 동작 확인
- [ ] Mock 데이터 로딩 검증
- [ ] 압축 해제 로직 테스트

#### WeatherService.spec.ts
- [ ] Provider 주입 테스트
- [ ] getWeather() 메서드 테스트
- [ ] Provider 전환 테스트
- [ ] 에러 전파 검증

### 3.3 Mock 전략

```typescript
// Vitest에서 axios mock
import { vi } from 'vitest';

vi.mock('axios');

// 성공 응답 mock
axios.get = vi.fn().mockResolvedValue({
  data: { /* mock response */ }
});

// 에러 응답 mock
axios.get = vi.fn().mockRejectedValue({
  response: { status: 404, data: { message: 'city not found' } }
});
```

---

## 🎯 작업 4: E2E 테스트 개선

### 4.1 현재 이슈
- ⚠️ 테스트 타임아웃 (120초 초과)
- 원인 미확인

### 4.2 개선 계획

**조사 항목**:
- [ ] Playwright 설정 확인 (`playwright.config.ts`)
- [ ] 테스트 셀렉터 유효성 확인
- [ ] API 응답 대기 시간 확인
- [ ] 불필요한 대기 제거

**최적화 방안**:
- [ ] Mock provider 사용으로 API 호출 최소화
- [ ] Parallel 실행 설정
- [ ] Timeout 조정 (필요 시)

### 4.3 새로운 테스트 추가

**파일**: `tests/weather.spec.ts`

- [ ] WeatherAPI.com Provider 테스트
  - [ ] Provider 선택
  - [ ] 날씨 조회
  - [ ] Quota 표시 확인
- [ ] Open-Meteo Provider 테스트
  - [ ] Provider 선택
  - [ ] 날씨 조회
  - [ ] "Unlimited" quota 확인
- [ ] Provider 전환 테스트
  - [ ] Mock → OpenWeather 전환
  - [ ] OpenWeather → WeatherAPI 전환
  - [ ] 상태 초기화 확인

---

## 🎯 작업 5: 문서화

### 5.1 생성할 문서

#### PHASE_3_SUMMARY.md
- [ ] Phase 3 완료 항목 정리
- [ ] 구현된 Adapter 목록
- [ ] 테스트 결과 요약
- [ ] 알려진 이슈 및 제한사항

#### API_INTEGRATION_GUIDE.md
- [ ] 각 Provider별 API 사양
- [ ] Condition/Weather Code 매핑 표
- [ ] Quota 관리 전략
- [ ] 새 Provider 추가 방법

#### TESTING_GUIDE.md
- [ ] Unit 테스트 실행 방법
- [ ] E2E 테스트 실행 방법
- [ ] 테스트 작성 가이드
- [ ] Mocking 전략

### 5.2 업데이트할 문서

- [ ] README.md
  - [ ] 지원 Provider 목록 추가
  - [ ] 환경 변수 설명 업데이트
- [ ] WEATHER_API_COMPARISON.md
  - [ ] WeatherAPI.com 상세 정보 추가
  - [ ] Open-Meteo 상세 정보 추가
- [ ] USER_DECISIONS.md
  - [ ] Phase 3 결정사항 추가

---

## 📊 작업 우선순위

### High Priority (필수)
1. ✅ WeatherAPI.com Adapter 구현
2. ✅ Open-Meteo Adapter 구현
3. ✅ Unit Tests 추가
4. ✅ PHASE_3_SUMMARY.md 작성

### Medium Priority (권장)
5. ⚠️ E2E 테스트 개선
6. 📄 API_INTEGRATION_GUIDE.md 작성
7. 📄 README.md 업데이트

### Low Priority (선택)
8. 📄 TESTING_GUIDE.md 작성
9. 🔧 낮/밤 구분 로직 개선 (Open-Meteo)
10. 🔧 추가 E2E 테스트 케이스

---

## ✅ 완료 조건

### Phase 3 완료 기준
- [x] Phase 2 완료 확인
- [ ] WeatherAPI.com Adapter 구현 및 테스트 완료
- [ ] Open-Meteo Adapter 구현 및 테스트 완료
- [ ] 3개 Provider 모두 UI에서 정상 작동 확인
- [ ] Unit 테스트 커버리지 80% 이상
- [ ] E2E 테스트 통과
- [ ] 문서화 완료

### 검증 체크리스트
- [ ] `npm run build` 성공
- [ ] `npm run test` 성공 (unit tests)
- [ ] `npx playwright test` 성공 (E2E tests)
- [ ] 개발 서버에서 3개 Provider 모두 테스트 완료
- [ ] TypeScript 에러 0개
- [ ] ESLint 에러 0개

---

## 🚀 시작 절차

### 1. 환경 확인
```bash
cd 02-weather-app
npm install
npm run dev
```

### 2. API 키 확인
```bash
# .env 파일 확인
cat .env

# 필요한 변수:
# VITE_OPENWEATHER_API_KEY=<your_openweathermap_key>
# VITE_WEATHERAPI_API_KEY=<your_weatherapi_key>
```

### 3. Phase 3 시작
```bash
# WeatherAPIAdapter 구현부터 시작
# 파일: src/adapters/weather/WeatherAPIAdapter.ts
```

---

**작성일**: 2025-10-08  
**상태**: 준비 완료 ✅  
**다음 단계**: WeatherAPI.com Adapter 구현 시작
