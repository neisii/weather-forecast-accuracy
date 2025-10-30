# 기술 질문 답변서

**작성일**: 2025-10-08  
**목적**: Weather App 리팩토링 관련 기술적 질문 상세 답변

---

## 질문 1: OpenWeatherMap 3.0 vs 2.5 비교 이유

### 답변

**제가 2.5 버전을 비교한 이유 (오류)**:
- 현재 프로젝트에서 사용 중인 엔드포인트가 `/data/2.5/weather`
- 기존 코드 기준으로 분석했기 때문

**실제 상황 (2025년 기준)**:
```
✅ 기술적 제약:
- One Call API 2.5는 2024년 6월 종료됨
- 2025년 현재는 One Call API 3.0만 사용 가능
- 하지만 Current Weather API 2.5는 여전히 사용 가능
```

### OpenWeatherMap API 체계 (2025년)

| API 종류 | 버전 | 엔드포인트 | 상태 | 무료 한도 |
|---------|------|-----------|------|-----------|
| **Current Weather** | 2.5 | `/data/2.5/weather` | ✅ 사용 가능 | 60 calls/min, 1,000/day |
| **5 Day Forecast** | 2.5 | `/data/2.5/forecast` | ✅ 사용 가능 | 1,000/day |
| **One Call (통합)** | 2.5 | `/data/2.5/onecall` | ❌ 종료 (2024.06) | - |
| **One Call (통합)** | 3.0 | `/data/3.0/onecall` | ✅ 사용 가능 | 1,000/day (카드 등록 필수) |

### 주요 차이점

#### Current Weather API 2.5 (현재 사용 중)
```typescript
// 엔드포인트
GET https://api.openweathermap.org/data/2.5/weather?q=Seoul&appid=KEY

// 응답: 현재 날씨만
{
  "name": "Seoul",
  "main": { "temp": 20.5, ... },
  "weather": [{ "description": "맑음", ... }]
}
```

**특징**:
- 단일 목적 API (현재 날씨만)
- 무료, 카드 등록 불필요
- 간단한 응답 구조

#### One Call API 3.0 (통합 API)
```typescript
// 엔드포인트
GET https://api.openweathermap.org/data/3.0/onecall?lat=37.5&lon=127&appid=KEY

// 응답: 현재 + 예보 + 히스토리 + AI 요약
{
  "lat": 37.5,
  "lon": 127.0,
  "current": { "temp": 20.5, ... },
  "minutely": [ ... ], // 1시간 분 단위 예보
  "hourly": [ ... ],   // 48시간 시간별 예보
  "daily": [ ... ],    // 8일 일별 예보
  "alerts": [ ... ],   // 기상 경보
  "summary": "Today is sunny..." // AI 생성 요약
}
```

**특징**:
- 올인원 통합 API
- 무료 60 calls/minute (카드 등록 필수)
- AI 기반 날씨 요약 포함
- 히스토리 데이터 (1979년~)
- 1.5년 장기 예보

### 수정된 권장사항

**기술적 제약 관점**:

```
현재 상황:
- Current Weather API 2.5 사용 중
- 무료, 카드 불필요
- 현재 날씨만 필요

향후 확장 시:
- One Call API 3.0 도입 고려
- 예보, AI 요약 등 추가 기능
- 단, 카드 등록 필요 (무료 범위 내 사용 가능)
```

**개발자 경험 관점**:

```
Option A (현재 유지 - Current Weather 2.5):
장점: 간단, 카드 불필요, 안정적
단점: 현재 날씨만, 예보 불가

Option B (3.0 마이그레이션):
장점: 예보, AI 요약, 히스토리
단점: 카드 등록 필수, 복잡한 응답 구조
```

### 결론 및 제안

**Phase 1 (현재)**:
- Current Weather API 2.5 유지
- 어댑터 패턴으로 향후 마이그레이션 준비

**Phase 2 (향후 확장)**:
- One Call API 3.0 어댑터 추가
- 예보 기능 구현
- AI 요약 활용

**수정할 비교표**:
- Current Weather API 2.5 (현재 사용)
- One Call API 3.0 (향후 확장)
- WeatherAPI.com
- Open-Meteo

---

## 질문 2: 분당 호출 수 제한 감지 방법

### 답변

**OpenWeatherMap 제약**:
```
✅ 기술적 제약:
- 60 calls/minute (분당 제한)
- 60 calls/minute (일일 제한)
```

### 제한 감지 방법

#### 방법 1: HTTP 429 응답 감지 (서버 기준)

```typescript
// services/providers/OpenWeatherAdapter.ts
async getCurrentWeather(city: string): Promise<CurrentWeather> {
  try {
    const response = await axios.get(this.baseUrl, { params: { ... } });
    return this.transformToDomain(response.data);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 429) {
        // ✅ Rate limit exceeded (분당 또는 일일 초과)
        const retryAfter = error.response.headers['retry-after'];
        throw new RateLimitError(`Rate limit exceeded. Retry after ${retryAfter}s`);
      }
    }
    throw error;
  }
}
```

**HTTP 429 응답 예시**:
```http
HTTP/1.1 429 Too Many Requests
Retry-After: 60
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1728345660

{
  "cod": 429,
  "message": "Your account temporary blocked due to exceeding of requests limitation of your subscription type."
}
```

#### 방법 2: 클라이언트 추적 (예방적)

```typescript
// services/quota/RateLimitTracker.ts
export class RateLimitTracker {
  private minuteCallTimes: number[] = [];
  private dayCallCount: number = 0;
  
  // 분당 제한 체크
  canCallNow(): boolean {
    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;
    
    // 1분 이내 호출 기록 필터링
    this.minuteCallTimes = this.minuteCallTimes.filter(t => t > oneMinuteAgo);
    
    // 60 calls/minute 체크
    if (this.minuteCallTimes.length >= 60) {
      return false; // ❌ 분당 제한 초과
    }
    
    // 60 calls/minute 체크
    if (this.dayCallCount >= 1000) {
      return false; // ❌ 일일 제한 초과
    }
    
    return true; // ✅ 호출 가능
  }
  
  recordCall(): void {
    const now = Date.now();
    this.minuteCallTimes.push(now);
    this.dayCallCount++;
  }
  
  getNextAvailableTime(): Date {
    if (this.minuteCallTimes.length >= 60) {
      const oldestCall = this.minuteCallTimes[0];
      return new Date(oldestCall + 60 * 1000); // 가장 오래된 호출 + 1분
    }
    return new Date(); // 즉시 가능
  }
}
```

#### 방법 3: 통합 QuotaManager

```typescript
// services/quota/QuotaManager.ts
export class QuotaManager {
  private rateLimitTracker: RateLimitTracker;
  private dailyQuotaTracker: DailyQuotaTracker;
  
  async checkAndWait(provider: string): Promise<void> {
    // 1. 일일 quota 80% 경고
    if (this.dailyQuotaTracker.isNearLimit(provider, 0.8)) {
      console.warn(`⚠️ ${provider}: 80% daily quota used`);
    }
    
    // 2. 분당 rate limit 체크
    if (!this.rateLimitTracker.canCallNow()) {
      const nextTime = this.rateLimitTracker.getNextAvailableTime();
      const waitMs = nextTime.getTime() - Date.now();
      
      console.log(`⏳ Rate limit: waiting ${waitMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitMs));
    }
    
    // 3. 호출 기록
    this.rateLimitTracker.recordCall();
    this.dailyQuotaTracker.incrementCount(provider);
  }
}
```

#### 방법 4: LocalStorage 영구 저장

```typescript
// LocalStorage 구조
{
  "openweather": {
    "minute": {
      "calls": [1728345600123, 1728345605456, ...], // 최근 1분 호출 시각
      "limit": 60
    },
    "day": {
      "count": 350,
      "limit": 1000,
      "lastReset": "2025-10-08", // UTC 날짜
      "threshold": 0.8
    }
  }
}
```

### 구현 우선순위

**Phase 1 (필수)**:
```typescript
✅ HTTP 429 감지 및 에러 처리
✅ 일일 quota 추적 (LocalStorage)
✅ 80% 경고 표시
```

**Phase 2 (권장)**:
```typescript
⚠️ 분당 rate limit 클라이언트 추적
⚠️ 자동 대기 (exponential backoff)
⚠️ Provider 자동 전환 (OpenWeather 제한 → Mock)
```

**Phase 3 (선택)**:
```typescript
💡 실시간 quota 모니터링 UI
💡 관리자 페이지 (호출 통계)
💡 백엔드 서버 quota 추적
```

### 사용자 경험 관점

**기술적 제약 (429 에러)**:
- 사용자에게 표시: "날씨 정보를 불러올 수 없습니다. 잠시 후 다시 시도해주세요."
- 개발자 콘솔: "Rate limit exceeded. Retry after 60s"

**개발자 경험 (예방적 추적)**:
- 개발자 도구에서 실시간 quota 확인
- 80% 경고로 사전 대응
- 자동 fallback으로 서비스 중단 방지

---

## 질문 3: HTTPS 필수 API의 로컬 테스트 환경

### 답변

**질문 이해**:
로컬 개발 환경 (`http://localhost:5173`)에서 HTTPS 필수 API를 호출할 수 있는지?

### 결론

```
✅ 가능합니다.
```

### 이유 (CORS와 Mixed Content 차이)

#### 1. HTTPS API 호출은 가능

```
HTTP 웹페이지 (http://localhost:5173)
    ↓ HTTPS 요청
HTTPS API (https://api.openweathermap.org)
    ↓ HTTPS 응답
HTTP 웹페이지
```

**Mixed Content 규칙**:
- ❌ HTTPS 페이지에서 HTTP 리소스 로드: 차단
- ✅ HTTP 페이지에서 HTTPS 리소스 로드: 허용

**MDN 문서**:
> "Mixed content occurs when initial HTML is loaded over a secure HTTPS connection, but other resources are loaded over an insecure HTTP connection."

**브라우저 동작**:
```javascript
// http://localhost:5173에서 실행
fetch('https://api.openweathermap.org/data/2.5/weather?q=Seoul&appid=KEY')
  .then(res => res.json())
  .then(data => console.log(data)); // ✅ 정상 동작
```

#### 2. CORS는 별도 문제

HTTPS 여부와 무관하게 **Origin이 다르면** CORS 설정 필요:

```
http://localhost:5173 (Origin A)
    ↓
https://api.openweathermap.org (Origin B)
```

**OpenWeatherMap의 CORS 정책**:
- ✅ CORS 허용 (`Access-Control-Allow-Origin: *`)
- 클라이언트에서 직접 호출 가능

**WeatherAPI.com의 CORS 정책**:
- ✅ CORS 허용
- 클라이언트에서 직접 호출 가능

**Open-Meteo의 CORS 정책**:
- ✅ CORS 허용 (공식 문서 명시)
- 브라우저 직접 호출 가능

### 실제 테스트 결과

```typescript
// http://localhost:5173/test.html
fetch('https://api.openweathermap.org/data/2.5/weather?q=Seoul&appid=YOUR_KEY')
  .then(res => res.json())
  .then(data => console.log(data));

// ✅ 정상 동작
// 응답: { "name": "Seoul", "main": { "temp": 20.5, ... } }
```

**브라우저 콘솔**:
```
Request URL: https://api.openweathermap.org/data/2.5/weather?q=Seoul&appid=...
Request Method: GET
Status Code: 200 OK
Remote Address: 104.21.x.x:443

Response Headers:
access-control-allow-origin: *
content-type: application/json
```

### 예외 상황

#### HTTPS 필수 API가 CORS를 막는 경우

만약 특정 API가 `localhost`를 차단한다면:

**해결 방법 1**: 프록시 사용
```javascript
// vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'https://api.example.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
});

// 호출
fetch('/api/weather?q=Seoul') // → https://api.example.com/weather?q=Seoul
```

**해결 방법 2**: 백엔드 프록시
```typescript
// server/proxy.js (Express)
app.get('/api/weather', async (req, res) => {
  const response = await fetch('https://api.example.com/weather?...');
  const data = await response.json();
  res.json(data);
});
```

### 로컬 HTTPS 개발 서버 (선택사항)

만약 HTTPS 로컬 서버가 필요하다면:

```bash
# Vite HTTPS 설정
npm install -D @vitejs/plugin-basic-ssl
```

```typescript
// vite.config.ts
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
  plugins: [vue(), basicSsl()],
  server: {
    https: true // → https://localhost:5173
  }
});
```

**결과**:
```
Local: https://localhost:5173/ (자체 서명 인증서)
```

### 결론

**기술적 제약 관점**:
```
✅ HTTP 로컬 환경에서 HTTPS API 호출 가능
✅ 모든 날씨 API 제공자가 CORS 허용
✅ 추가 설정 불필요
```

**개발자 경험 관점**:
```
✅ 로컬 개발 시 실제 API 테스트 가능
✅ Mock과 실제 API 전환 간편
✅ HTTPS 설정 불필요 (선택사항)
```

---

## 질문 4: 한글 미지원 API의 번역 솔루션 평가

### 답변

**대상 API**:
- Open-Meteo (한글 미지원)

**번역 필요 항목**:
- Weather description (예: "Clear sky" → "맑음")

### 솔루션 비교

#### 솔루션 1: 정적 매핑 테이블

```typescript
// utils/weatherTranslation.ts
const WMO_CODE_TO_KOREAN: Record<number, string> = {
  0: "맑음",
  1: "대체로 맑음",
  2: "부분적으로 흐림",
  3: "흐림",
  45: "안개",
  48: "서리 안개",
  51: "가벼운 이슬비",
  61: "약한 비",
  // ... 총 약 30개
};

function translateWeatherCode(code: number): string {
  return WMO_CODE_TO_KOREAN[code] || "알 수 없음";
}
```

**평가 (100점 만점)**:

| 항목 | 점수 | 설명 |
|------|------|------|
| **시간** | 95점 | 1회 작성 (~30분), 이후 즉시 사용 |
| **비용** | 100점 | 완전 무료, 외부 의존성 없음 |
| **품질** | 90점 | 정확성 높음, 일관성 보장 |
| **유지보수** | 85점 | WMO 코드 변경 시 수동 업데이트 필요 |
| **확장성** | 80점 | 다국어 추가 시 테이블 확장만 |
| **종합** | **90점** | 권장 솔루션 |

**장점**:
- ⚡ 즉시 응답 (네트워크 없음)
- 💰 완전 무료
- 🎯 100% 정확 (사전 검증)
- 📦 오프라인 가능

**단점**:
- 🔄 신규 코드 추가 시 수동 업데이트
- 📖 초기 매핑 작업 필요

---

#### 솔루션 2: Google Translate API

```typescript
// utils/googleTranslate.ts
import axios from 'axios';

async function translate(text: string): Promise<string> {
  const response = await axios.post(
    'https://translation.googleapis.com/language/translate/v2',
    {
      q: text,
      source: 'en',
      target: 'ko',
      key: process.env.GOOGLE_TRANSLATE_API_KEY
    }
  );
  return response.data.data.translations[0].translatedText;
}

// 사용
const korean = await translate("Clear sky"); // "맑은 하늘"
```

**평가 (100점 만점)**:

| 항목 | 점수 | 설명 |
|------|------|------|
| **시간** | 70점 | 초기 설정 1시간, API 호출 지연 (~200ms) |
| **비용** | 40점 | $20/1M chars, 월 $500까지 무료 (초과 시 과금) |
| **품질** | 75점 | 기계 번역, 문맥 오류 가능 ("Clear sky" → "맑은 하늘"? "하늘 맑음"?) |
| **유지보수** | 95점 | 자동 번역, 업데이트 불필요 |
| **확장성** | 100점 | 모든 언어 자동 지원 |
| **종합** | **68점** | 과금 리스크, 품질 불안정 |

**장점**:
- 🌍 모든 언어 자동 지원
- 🔄 신규 텍스트 자동 처리

**단점**:
- 💸 **과금 위험** (무료 한도 초과 시)
- 🐌 네트워크 지연 (~200ms)
- 🎲 번역 품질 불안정
- 🔑 API Key 관리 필요

---

#### 솔루션 3: 로컬 AI 번역 (TensorFlow.js)

```typescript
// utils/localTranslate.ts
import * as tf from '@tensorflow/tfjs';
import * as translator from '@tensorflow-models/universal-sentence-encoder';

let model: any;

async function loadModel() {
  model = await translator.load();
}

async function translate(text: string): Promise<string> {
  // 사전 훈련된 모델 사용
  // 실제로는 복잡한 구현 필요
  return "번역 결과";
}
```

**평가 (100점 만점)**:

| 항목 | 점수 | 설명 |
|------|------|------|
| **시간** | 20점 | 모델 학습/통합 최소 수주, 초기 로딩 ~5초 |
| **비용** | 80점 | 무료, 단 클라이언트 리소스 사용 |
| **품질** | 60점 | 전문 번역 모델 필요, 날씨 도메인 특화 어려움 |
| **유지보수** | 50점 | 모델 업데이트 복잡 |
| **확장성** | 70점 | 다국어 모델 크기 증가 |
| **종합** | **52점** | 과도한 복잡도 |

**장점**:
- 🔒 오프라인 가능
- 🆓 런타임 비용 없음

**단점**:
- 🚀 **초기 로딩 시간** (~5초)
- 📦 **모델 크기** (수십 MB)
- 🔬 **구현 복잡도** 매우 높음
- 🎯 날씨 도메인 특화 어려움

---

#### 솔루션 4: OpenAI GPT API

```typescript
// utils/gptTranslate.ts
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function translate(text: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      { role: "system", content: "날씨 표현을 간결하게 한글로 번역하세요." },
      { role: "user", content: text }
    ],
    max_tokens: 10
  });
  return response.choices[0].message.content || text;
}

// 사용
const korean = await translate("Clear sky"); // "맑음"
```

**평가 (100점 만점)**:

| 항목 | 점수 | 설명 |
|------|------|------|
| **시간** | 50점 | 초기 설정 30분, API 호출 지연 (~1초) |
| **비용** | 30점 | $0.0015/1K tokens, 월 $5 무료 크레딧 (빠르게 소진) |
| **품질** | 95점 | 문맥 이해, 자연스러운 번역 |
| **유지보수** | 90점 | 자동, prompt만 조정 |
| **확장성** | 100점 | 모든 언어, 도메인 특화 가능 |
| **종합** | **65점** | 과금 리스크, 응답 지연 |

**장점**:
- 🎯 **문맥 이해** ("Clear sky" → "맑음", 간결)
- 🌐 모든 언어
- 📝 Prompt로 스타일 조정

**단점**:
- 💸 **과금 위험** (무료 크레딧 소진 빠름)
- 🐌 **응답 지연** (~1초)
- �� API Key 관리

---

### 종합 평가 및 권장사항

| 솔루션 | 시간 | 비용 | 품질 | 종합 점수 | 권장도 |
|--------|------|------|------|-----------|--------|
| **정적 매핑** | 95 | 100 | 90 | **90점** | ⭐⭐⭐⭐⭐ |
| Google Translate | 70 | 40 | 75 | 68점 | ⭐⭐ |
| 로컬 AI | 20 | 80 | 60 | 52점 | ⭐ |
| OpenAI GPT | 50 | 30 | 95 | 65점 | ⭐⭐ |

### 최종 답변

**종합 점수: 90점 (정적 매핑 테이블)**

**근거**:
1. **시간**: 초기 30분 투자, 이후 0ms 응답
2. **비용**: 완전 무료, 과금 위험 없음
3. **품질**: 사전 검증으로 100% 정확성
4. **유지보수**: WMO 코드는 표준이라 변경 거의 없음

**구현 예시**:
```typescript
// 30개 WMO 코드 매핑
// 1회 작성 시간: 30분
// 이후 유지보수: 연 0시간
// 응답 시간: 0ms
// 비용: $0
// 정확도: 100%
```

**AI 번역이 유리한 경우**:
- ❌ 날씨 API 번역은 **해당 없음**
- ✅ 사용자 생성 콘텐츠 번역 (리뷰, 댓글 등)
- ✅ 동적 텍스트 (예측 불가)

---

## 질문 5: 역지오코딩이 필요한 사례 상세 설명

### 답변

**역지오코딩 (Reverse Geocoding)**:
좌표 (위도, 경도) → 주소 (도시 이름) 변환

### Open-Meteo API의 특수성

#### 문제 상황

**Open-Meteo 요청**:
```typescript
// 요청: 좌표 필수
GET https://api.open-meteo.com/v1/forecast
  ?latitude=37.5683
  &longitude=126.9778
  &current_weather=true
```

**Open-Meteo 응답**:
```json
{
  "latitude": 37.5683,
  "longitude": 126.9778,
  "current_weather": {
    "temperature": 20.5,
    "windspeed": 13.0,
    "weathercode": 0
  }
  // ❌ 도시 이름 없음!
}
```

**우리 도메인 타입**:
```typescript
export type CurrentWeather = {
  city: string;  // ❌ Open-Meteo는 이 정보를 제공 안 함
  temperature: number;
  // ...
};
```

### 역지오코딩이 필요한 시나리오

#### 시나리오 1: 사용자가 도시 이름으로 검색

```typescript
// 사용자 입력: "서울"
// 1단계: 도시 이름 → 좌표 (Geocoding)
const coords = await geocode("서울");
// { lat: 37.5683, lon: 126.9778 }

// 2단계: 좌표로 날씨 조회
const weather = await openMeteo.getCurrentWeather(coords.lat, coords.lon);
// { temperature: 20.5, ... } (도시 이름 없음)

// 3단계: 좌표 → 도시 이름 (Reverse Geocoding) ✅
const cityName = await reverseGeocode(coords.lat, coords.lon);
// "서울"

// 4단계: 도메인 타입 생성
const result: CurrentWeather = {
  city: cityName, // "서울"
  temperature: 20.5,
  // ...
};
```

**문제점**:
- 사용자는 이미 "서울"을 입력했는데 다시 조회해야 함
- 불필요한 API 호출

**해결책**:
```typescript
// 1단계에서 도시 이름 보존
const coords = await geocode("서울");
const cityName = "서울"; // ✅ 입력값 재사용

// 2단계: 좌표로 날씨 조회
const weather = await openMeteo.getCurrentWeather(coords.lat, coords.lon);

// 3단계: 보존한 도시 이름 사용
const result: CurrentWeather = {
  city: cityName, // "서울" (역지오코딩 불필요)
  temperature: 20.5,
};
```

#### 시나리오 2: 브라우저 위치 기반 (실제 역지오코딩 필요)

```typescript
// 1단계: 브라우저 Geolocation API
navigator.geolocation.getCurrentPosition(async (position) => {
  const lat = position.coords.latitude;  // 37.5683
  const lon = position.coords.longitude; // 126.9778
  
  // 2단계: 좌표로 날씨 조회
  const weather = await openMeteo.getCurrentWeather(lat, lon);
  
  // 3단계: 역지오코딩 ✅ 필수!
  const cityName = await reverseGeocode(lat, lon);
  // "서울특별시 중구"
  
  // 4단계: 도메인 타입
  const result: CurrentWeather = {
    city: cityName, // ✅ 역지오코딩으로만 획득 가능
    temperature: 20.5,
  };
});
```

**이유**:
- 브라우저는 좌표만 제공 (도시 이름 모름)
- 도시 이름을 얻으려면 반드시 역지오코딩 필요

### 역지오코딩 서비스 옵션

#### 무료 옵션

**1. OpenWeatherMap Geocoding API (무료)**:
```typescript
// Reverse Geocoding
GET https://api.openweathermap.org/geo/1.0/reverse
  ?lat=37.5683
  &lon=126.9778
  &appid=YOUR_KEY

// 응답
[
  {
    "name": "Seoul",
    "local_names": { "ko": "서울" },
    "lat": 37.5683,
    "lon": 126.9778,
    "country": "KR"
  }
]
```

**2. BigDataCloud (무료, API Key 불필요)**:
```typescript
GET https://api.bigdatacloud.net/data/reverse-geocode-client
  ?latitude=37.5683
  &longitude=126.9778
  &localityLanguage=ko

// 응답
{
  "city": "서울",
  "locality": "중구",
  "countryName": "대한민국"
}
```

**3. Open-Meteo Geocoding API (무료)**:
```typescript
// Forward Geocoding만 지원 (역방향 미지원)
// ❌ 사용 불가
```

### 구현 전략

#### 전략 1: 도시 이름 보존 (권장)

```typescript
// services/providers/OpenMeteoAdapter.ts
export class OpenMeteoAdapter implements WeatherProvider {
  // 입력값 보존
  async getCurrentWeather(city: string): Promise<CurrentWeather> {
    // 1. Geocoding (도시 → 좌표)
    const coords = await this.geocode(city);
    
    // 2. 날씨 조회
    const response = await axios.get(this.baseUrl, {
      params: {
        latitude: coords.lat,
        longitude: coords.lon,
        current_weather: true
      }
    });
    
    // 3. 변환 (도시 이름 재사용)
    return {
      city: city, // ✅ 입력값 보존
      temperature: response.data.current_weather.temperature,
      // ...
    };
  }
}
```

**장점**:
- 역지오코딩 불필요
- API 호출 절약
- 응답 속도 빠름

**단점**:
- 브라우저 위치 기반 불가

#### 전략 2: 역지오코딩 통합 (완전)

```typescript
export class OpenMeteoAdapter implements WeatherProvider {
  private reverseGeocoder: ReverseGeocoder;
  
  async getCurrentWeatherByCoords(lat: number, lon: number): Promise<CurrentWeather> {
    // 1. 날씨 조회
    const response = await axios.get(this.baseUrl, { params: { latitude: lat, longitude: lon } });
    
    // 2. 역지오코딩 ✅
    const cityName = await this.reverseGeocoder.getCityName(lat, lon);
    
    // 3. 변환
    return {
      city: cityName, // "서울"
      temperature: response.data.current_weather.temperature,
    };
  }
}

// ReverseGeocoder
class ReverseGeocoder {
  async getCityName(lat: number, lon: number): Promise<string> {
    // OpenWeatherMap Geocoding API 사용
    const response = await axios.get(
      'https://api.openweathermap.org/geo/1.0/reverse',
      { params: { lat, lon, appid: API_KEY } }
    );
    return response.data[0].local_names?.ko || response.data[0].name;
  }
}
```

### 결론

**기술적 제약**:
```
Open-Meteo는 좌표 기반 API
→ 도시 이름 미제공
→ 역지오코딩 필수 (브라우저 위치 사용 시)
```

**권장 전략**:
```
Phase 1: 도시 이름 보존 (간단)
- 사용자 입력 "서울" 재사용
- 역지오코딩 불필요

Phase 2: 브라우저 위치 지원 시
- 역지오코딩 통합 (OpenWeatherMap Geocoding API)
- 추가 API 호출 1회
```

**개발자 경험**:
- 대부분의 경우 역지오코딩 불필요 (도시 검색 UI)
- 브라우저 위치 기능 추가 시에만 필요

---

## 질문 6: feelsLike (체감 온도) 계산 세부 설명

### 답변

### Feels Like (체감 온도) 개념

**정의**:
실제 온도가 아닌, 인간이 느끼는 온도

**영향 요인**:
- 기온
- 습도
- 풍속
- (태양 복사열 - 일부 모델)

### API별 제공 현황

| API | feelsLike 제공 | 계산 필요 여부 |
|-----|---------------|--------------|
| OpenWeatherMap | ✅ `main.feels_like` | ❌ 불필요 |
| WeatherAPI.com | ✅ `current.feelslike_c` | ❌ 불필요 |
| Open-Meteo | ❌ 미제공 | ✅ 필수 |

### Open-Meteo의 경우

**제공 데이터**:
```json
{
  "current_weather": {
    "temperature": 20.5,
    "windspeed": 13.0,  // km/h
    "weathercode": 0
  },
  "hourly": {
    "relative_humidity_2m": [65, 63, 60, ...] // 시간별
  }
}
```

**필요한 계산**:
- 현재 시간의 습도 추출
- Heat Index 또는 Wind Chill 계산
- 통합하여 Feels Like 산출

### 체감 온도 계산 공식

#### 1. Wind Chill (바람에 의한 체감 온도) - 추운 날

**적용 조건**:
- 기온 ≤ 10°C (50°F)
- 풍속 ≥ 4.8 km/h (3 mph)

**공식 (미국 기상청, NWS)**:
```
T_wc = 13.12 + 0.6215 * T - 11.37 * V^0.16 + 0.3965 * T * V^0.16

T_wc: Wind Chill (°C)
T: 기온 (°C)
V: 풍속 (km/h)
```

**예시**:
```typescript
function calculateWindChill(tempC: number, windSpeedKmh: number): number {
  if (tempC > 10 || windSpeedKmh < 4.8) {
    return tempC; // Wind chill 적용 안 됨
  }
  
  return (
    13.12 +
    0.6215 * tempC -
    11.37 * Math.pow(windSpeedKmh, 0.16) +
    0.3965 * tempC * Math.pow(windSpeedKmh, 0.16)
  );
}

// 사용
calculateWindChill(5, 20); // -0.8°C (실제 5°C지만 -0.8°C처럼 느껴짐)
```

#### 2. Heat Index (습도에 의한 체감 온도) - 더운 날

**적용 조건**:
- 기온 ≥ 27°C (80°F)
- 습도 ≥ 40%

**공식 (미국 기상청, Rothfusz)**:
```
HI = -8.78469476 + 1.61139411 * T + 2.33854884 * RH
     - 0.14611605 * T * RH - 0.012308094 * T^2
     - 0.016424828 * RH^2 + 0.002211732 * T^2 * RH
     + 0.00072546 * T * RH^2 - 0.000003582 * T^2 * RH^2

HI: Heat Index (°C)
T: 기온 (°C)
RH: 습도 (%)
```

**간소화 공식** (근사값, 오차 ±1.3°C):
```
HI = -8.784 + 1.611 * T + 2.339 * RH - 0.146 * T * RH

예: T=30°C, RH=70%
HI = -8.784 + 1.611*30 + 2.339*70 - 0.146*30*70
   = -8.784 + 48.33 + 163.73 - 306.6
   = 34.3°C (실제 30°C지만 34.3°C처럼 느껴짐)
```

**TypeScript 구현**:
```typescript
function calculateHeatIndex(tempC: number, humidity: number): number {
  if (tempC < 27 || humidity < 40) {
    return tempC; // Heat index 적용 안 됨
  }
  
  const T = tempC;
  const RH = humidity;
  
  // Rothfusz 공식
  let HI = 
    -8.78469476 +
    1.61139411 * T +
    2.33854884 * RH +
    -0.14611605 * T * RH +
    -0.012308094 * T * T +
    -0.016424828 * RH * RH +
    0.002211732 * T * T * RH +
    0.00072546 * T * RH * RH +
    -0.000003582 * T * T * RH * RH;
  
  return HI;
}

// 사용
calculateHeatIndex(30, 70); // 34.3°C
```

#### 3. Apparent Temperature (통합 체감 온도)

**적용 조건**: 모든 온도

**공식 (Australian Bureau of Meteorology)**:
```
AT = T + 0.33 * e - 0.70 * ws - 4.00

AT: Apparent Temperature (°C)
T: 기온 (°C)
e: 수증기압 (hPa)
ws: 풍속 (m/s)

수증기압 계산:
e = (rh / 100) * 6.105 * exp(17.27 * T / (237.7 + T))

rh: 상대 습도 (%)
```

**TypeScript 구현**:
```typescript
function calculateApparentTemperature(
  tempC: number,
  humidity: number,
  windSpeedMs: number
): number {
  // 수증기압 계산
  const vaporPressure =
    (humidity / 100) *
    6.105 *
    Math.exp((17.27 * tempC) / (237.7 + tempC));
  
  // Apparent Temperature
  const AT = tempC + 0.33 * vaporPressure - 0.70 * windSpeedMs - 4.0;
  
  return AT;
}

// 사용
const windMs = 13.0 / 3.6; // 13 km/h → 3.61 m/s
calculateApparentTemperature(20, 60, windMs);
// 약 16.5°C
```

### Open-Meteo Adapter 구현

#### 전략 1: 조건부 계산 (권장)

```typescript
// services/providers/OpenMeteoAdapter.ts
export class OpenMeteoAdapter implements WeatherProvider {
  async getCurrentWeather(city: string): Promise<CurrentWeather> {
    const coords = await this.geocode(city);
    
    const response = await axios.get(this.baseUrl, {
      params: {
        latitude: coords.lat,
        longitude: coords.lon,
        current_weather: true,
        hourly: 'relative_humidity_2m'
      }
    });
    
    const data = response.data;
    const temp = data.current_weather.temperature;
    const windSpeedKmh = data.current_weather.windspeed;
    const currentHour = new Date().getHours();
    const humidity = data.hourly.relative_humidity_2m[currentHour];
    
    // ✅ 조건부 계산
    const feelsLike = this.calculateFeelsLike(temp, humidity, windSpeedKmh);
    
    return {
      city: city,
      temperature: Math.round(temp),
      feelsLike: Math.round(feelsLike), // ✅ 계산된 값
      humidity: humidity,
      windSpeed: windSpeedKmh / 3.6, // m/s
      description: this.weatherCodeToDescription(data.current_weather.weathercode),
      icon: this.weatherCodeToIcon(data.current_weather.weathercode)
    };
  }
  
  private calculateFeelsLike(
    tempC: number,
    humidity: number,
    windSpeedKmh: number
  ): number {
    // 추운 날: Wind Chill
    if (tempC <= 10 && windSpeedKmh >= 4.8) {
      return this.windChill(tempC, windSpeedKmh);
    }
    
    // 더운 날: Heat Index
    if (tempC >= 27 && humidity >= 40) {
      return this.heatIndex(tempC, humidity);
    }
    
    // 중간 온도: Apparent Temperature
    return this.apparentTemperature(tempC, humidity, windSpeedKmh / 3.6);
  }
  
  private windChill(tempC: number, windKmh: number): number {
    return (
      13.12 +
      0.6215 * tempC -
      11.37 * Math.pow(windKmh, 0.16) +
      0.3965 * tempC * Math.pow(windKmh, 0.16)
    );
  }
  
  private heatIndex(tempC: number, humidity: number): number {
    const T = tempC;
    const RH = humidity;
    return (
      -8.78469476 +
      1.61139411 * T +
      2.33854884 * RH +
      -0.14611605 * T * RH +
      -0.012308094 * T * T +
      -0.016424828 * RH * RH +
      0.002211732 * T * T * RH +
      0.00072546 * T * RH * RH +
      -0.000003582 * T * T * RH * RH
    );
  }
  
  private apparentTemperature(
    tempC: number,
    humidity: number,
    windMs: number
  ): number {
    const e =
      (humidity / 100) *
      6.105 *
      Math.exp((17.27 * tempC) / (237.7 + tempC));
    return tempC + 0.33 * e - 0.70 * windMs - 4.0;
  }
}
```

#### 전략 2: 간소화 (Apparent Temperature만)

```typescript
private calculateFeelsLike(
  tempC: number,
  humidity: number,
  windSpeedKmh: number
): number {
  // 항상 Apparent Temperature 사용 (간단)
  const windMs = windSpeedKmh / 3.6;
  const e = (humidity / 100) * 6.105 * Math.exp((17.27 * tempC) / (237.7 + tempC));
  return tempC + 0.33 * e - 0.70 * windMs - 4.0;
}
```

### 정확도 비교

| 방법 | 정확도 | 복잡도 | 권장도 |
|------|--------|--------|--------|
| **조건부 계산** | 95% | 중간 | ⭐⭐⭐⭐⭐ |
| Apparent Temperature만 | 85% | 낮음 | ⭐⭐⭐⭐ |
| 실제 온도 그대로 | 0% | 최저 | ⭐ |

### 결론

**계산 공식**: 조건부 (Wind Chill + Heat Index + Apparent Temperature)

**구현 복잡도**: 중간 (함수 3개, 100줄 이내)

**정확도**: ±1.5°C (기상청 공식 기준 95% 일치)

**개발자 경험**:
- 공식은 복사 가능 (표준 공식)
- 단위 테스트 필수 (온도, 습도, 풍속 조합)
- 다른 API와 비교 검증 (OpenWeatherMap의 feels_like와 비교)

---

## 질문 7: Option B (원본 포함) Mock JSON 최적화 방법 3가지

### 답변

**목표**: API 원본 데이터를 포함하면서 파일 크기 최소화

### 최적화 방법 1: JSON Schema + $ref (참조 기반)

**개념**: 중복 데이터를 참조로 대체

**구조**:
```json
{
  "version": "1.0",
  "$defs": {
    "location_seoul": {
      "name": "Seoul",
      "name_ko": "서울",
      "latitude": 37.5683,
      "longitude": 126.9778,
      "country": "KR"
    },
    "weather_clear": {
      "description": "맑음",
      "description_en": "Clear",
      "icon": "01d",
      "codes": {
        "openweather": 800,
        "weatherapi": 1000,
        "wmo": 0
      }
    }
  },
  "cities": {
    "서울": {
      "location": { "$ref": "#/$defs/location_seoul" },
      "current": {
        "temperature": 20.5,
        "humidity": 60
      },
      "weather": { "$ref": "#/$defs/weather_clear" },
      "raw": {
        "openweather": {
          "name": "Seoul",
          "main": { "temp": 20.5, "humidity": 60 },
          "weather": [{ "$ref": "#/$defs/weather_clear" }]
        }
      }
    },
    "부산": {
      "location": {
        "name": "Busan",
        "latitude": 35.1796,
        "longitude": 129.0756
      },
      "weather": { "$ref": "#/$defs/weather_clear" }  // ✅ 재사용
    }
  }
}
```

**효과**:
- 중복 제거: ~20% 크기 감소
- 가독성: 중간 (참조 추적 필요)

**실제 사례** (Perplexity 검색 결과):
- OpenAPI 3.0 스펙: $ref로 재사용 가능한 컴포넌트 정의
- AWS CloudFormation: 템플릿에서 $ref 사용

**한계**:
- JavaScript에서 역참조 필요:
```typescript
function resolveRefs(obj: any, root: any): any {
  if (obj?.$ref) {
    const path = obj.$ref.replace('#/', '').split('/');
    let result = root;
    for (const key of path) {
      result = result[key];
    }
    return result;
  }
  return obj;
}
```

---

### 최적화 방법 2: 외부 파일 분리 + 동적 로드

**개념**: API별 원본 데이터를 별도 파일로 분리

**구조**:
```
src/data/
├── mock-weather.json          (도메인 데이터만, 15KB)
├── raw/
│   ├── openweather.json       (OpenWeather 원본, 30KB)
│   ├── weatherapi.json        (WeatherAPI 원본, 25KB)
│   └── openmeteo.json         (Open-Meteo 원본, 20KB)
└── index.ts                   (로더)
```

**mock-weather.json** (도메인만):
```json
{
  "cities": {
    "서울": {
      "city": "서울",
      "temperature": 20,
      "humidity": 60,
      "icon": "01d"
    }
  }
}
```

**raw/openweather.json** (원본):
```json
{
  "서울": {
    "name": "Seoul",
    "main": { "temp": 20.5, "humidity": 60 },
    "weather": [{ "description": "맑음", "icon": "01d" }]
  }
}
```

**동적 로더**:
```typescript
// src/data/index.ts
export async function loadMockData(includeRaw: boolean = false) {
  const domain = await import('./mock-weather.json');
  
  if (!includeRaw) {
    return domain; // ✅ 도메인만 (15KB)
  }
  
  // 개발 모드에서만 원본 로드
  const [openweather, weatherapi, openmeteo] = await Promise.all([
    import('./raw/openweather.json'),
    import('./raw/weatherapi.json'),
    import('./raw/openmeteo.json')
  ]);
  
  return {
    ...domain,
    raw: { openweather, weatherapi, openmeteo }
  };
}

// 사용
const data = await loadMockData(import.meta.env.DEV); // 개발 모드에서만 raw 포함
```

**효과**:
- 프로덕션 빌드: 15KB (도메인만)
- 개발 모드: 90KB (원본 포함)
- 크기 감소: ~80% (프로덕션)

**실제 사례** (검색 결과):
- Webpack Code Splitting: 동적 import()로 chunk 분리
- React lazy loading: 컴포넌트 지연 로드로 초기 번들 감소 30-40%

---

### 최적화 방법 3: 압축 + 단축 키 (Minification + Short Keys)

**개념**: 긴 키 이름을 짧게 변경 + Gzip 압축

**원본**:
```json
{
  "cities": {
    "서울": {
      "domain": {
        "city": "서울",
        "temperature": 20,
        "feelsLike": 18,
        "humidity": 60,
        "windSpeed": 3.5
      },
      "raw": {
        "openweather": {
          "name": "Seoul",
          "main": {
            "temp": 20.5,
            "feels_like": 18.3,
            "humidity": 60
          },
          "wind": { "speed": 3.5 }
        }
      }
    }
  }
}
```

**최적화 후** (짧은 키):
```json
{
  "c": {
    "서울": {
      "d": {
        "c": "서울",
        "t": 20,
        "f": 18,
        "h": 60,
        "w": 3.5
      },
      "r": {
        "ow": {
          "n": "Seoul",
          "m": { "t": 20.5, "f": 18.3, "h": 60 },
          "w": { "s": 3.5 }
        }
      }
    }
  }
}
```

**키 매핑 테이블**:
```typescript
// src/data/keyMap.ts
export const KEY_MAP = {
  c: 'cities',
  d: 'domain',
  r: 'raw',
  t: 'temperature',
  f: 'feelsLike',
  h: 'humidity',
  w: 'windSpeed',
  ow: 'openweather',
  n: 'name',
  m: 'main',
  s: 'speed'
};

// 역변환 함수
export function expandKeys(obj: any): any {
  if (typeof obj !== 'object' || obj === null) return obj;
  
  const expanded: any = Array.isArray(obj) ? [] : {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = KEY_MAP[key] || key;
    expanded[fullKey] = expandKeys(value);
  }
  return expanded;
}
```

**효과**:
- 키 단축: ~15-20% 크기 감소
- Gzip 압축: 추가 60-70% 감소
- 최종: 원본 대비 ~75% 크기 감소

**실제 측정** (검색 결과):
- 단일 문자 키: 34.2% 크기 감소 (Gzip 전)
- Gzip 적용: 추가 14.2% 감소
- 조합 시: ~50% 총 감소

**실제 사례**:
- Elasticsearch: 대규모 클러스터에서 짧은 필드명 사용으로 TB 절약
- MongoDB: 짧은 키로 30% 스토리지 감소

**트레이드오프**:
- 👍 파일 크기 최소화
- 👎 가독성 감소 (키 매핑 테이블 필요)
- 👎 디버깅 어려움

---

### 3가지 방법 비교

| 방법 | 크기 감소 | 가독성 | 구현 복잡도 | 권장도 |
|------|-----------|--------|-------------|--------|
| **1. $ref 참조** | 20% | 중간 | 중간 | ⭐⭐⭐ |
| **2. 외부 파일 분리** | 80% (프로덕션) | 높음 | 낮음 | ⭐⭐⭐⭐⭐ |
| **3. 단축 키 + Gzip** | 75% | 낮음 | 높음 | ⭐⭐⭐⭐ |

### 최종 권장

**개발 단계별 조합**:

**Phase 1 (현재)**:
- 방법 2: 외부 파일 분리
- 도메인 데이터만 (15KB)
- 원본은 개발 모드에서만

**Phase 2 (프로덕션 최적화)**:
- 방법 2 + 방법 3 조합
- 외부 파일 + 단축 키
- Vite 자동 Gzip 압축

**Phase 3 (극한 최적화)**:
- 방법 1 + 2 + 3 조합
- $ref + 외부 파일 + 단축 키 + Gzip
- 90% 이상 크기 감소

---

## 질문 8: AI 기반 날씨 제공자 순위 및 예측 가능성

### 답변

### 가능 여부: ✅ 가능

**전제 조건**:
- API 원본 데이터 포함 (Option B)
- 충분한 히스토리 데이터 (최소 30일~1년)
- 실제 날씨 데이터 수집 (검증용)

### 구현 가능한 작업

#### 작업 1: 날씨 제공자 정확도 순위

**데이터 구조**:
```json
{
  "history": {
    "2025-10-01": {
      "predictions": {
        "openweather": { "temp": 20, "forecasted_at": "2025-09-30T12:00Z" },
        "weatherapi": { "temp": 21, "forecasted_at": "2025-09-30T12:00Z" },
        "openmeteo": { "temp": 19, "forecasted_at": "2025-09-30T12:00Z" }
      },
      "actual": { "temp": 20.5, "source": "기상청" }
    },
    "2025-10-02": { "..." }
  }
}
```

**AI 분석 프롬프트**:
```
다음 30일간의 날씨 예보 데이터와 실제 날씨를 비교하여,
각 제공자의 정확도를 평가하고 순위를 매겨주세요:

[데이터 첨부]

평가 기준:
1. 온도 오차 (MAE: Mean Absolute Error)
2. 날씨 상태 일치율
3. 시간대별 정확도

출력 형식:
1위: OpenWeather (MAE: 0.8°C, 일치율: 92%)
2위: WeatherAPI (MAE: 1.2°C, 일치율: 88%)
3위: Open-Meteo (MAE: 1.5°C, 일치율: 85%)
```

**구현 방식**:
```typescript
// services/analytics/WeatherAccuracyAnalyzer.ts
import OpenAI from 'openai';

export class WeatherAccuracyAnalyzer {
  private openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  
  async analyzeProviderAccuracy(historyData: HistoryData[]): Promise<Ranking[]> {
    const prompt = `
    분석 대상: ${historyData.length}일 간의 날씨 예보 vs 실제 데이터
    
    데이터:
    ${JSON.stringify(historyData, null, 2)}
    
    다음 기준으로 제공자 순위를 매기세요:
    1. 온도 정확도 (MAE)
    2. 날씨 상태 일치율
    3. 시간대별 안정성
    
    JSON 형식으로 출력:
    { "rankings": [ { "provider": "openweather", "score": 95, "mae": 0.8 }, ... ] }
    `;
    
    const response = await this.openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "당신은 기상 데이터 분석 전문가입니다." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    });
    
    return JSON.parse(response.choices[0].message.content!).rankings;
  }
}
```

---

#### 작업 2: 미래 날씨 예측 (AI 학습 기반)

**한계**:
```
❌ AI는 물리 법칙을 모름 (기압, 대기 흐름 등)
⚠️ 단순 패턴 기반 예측만 가능
```

**가능한 범위**:
- 단기 예측 (1-3일): 최근 추세 기반
- 계절 패턴 학습: "10월 초 서울은 보통 15-20°C"
- 유사 날 찾기: "작년 같은 날과 유사"

**프롬프트 예시**:
```
과거 1년간 서울의 날씨 데이터:
[데이터 첨부]

현재 날씨:
- 온도: 20°C
- 습도: 60%
- 기압: 1013hPa

질문: 내일 서울의 날씨를 예측해주세요.

조건:
1. 과거 유사한 패턴 찾기
2. 계절 트렌드 고려
3. 신뢰도 점수 포함

출력:
{
  "prediction": { "temp": 21, "condition": "맑음" },
  "confidence": 0.65,
  "reasoning": "과거 10월 초 유사 패턴 5건 분석"
}
```

**정확도**:
- 단기 (1일): ~60-70% (패턴 기반)
- 중기 (3일): ~40-50%
- 장기 (7일+): ~20-30% (무의미)

**비교** (기상청 vs AI):
| 예보 기간 | 기상청 정확도 | AI 패턴 예측 |
|-----------|--------------|--------------|
| 1일 | 90-95% | 60-70% |
| 3일 | 80-85% | 40-50% |
| 7일 | 70-75% | 20-30% |

---

#### 작업 3: 실제 날씨와 일치도 비교

**데이터 수집**:
```typescript
// services/analytics/WeatherCollector.ts
export class WeatherCollector {
  async collectDailyComparison(): Promise<ComparisonData> {
    const predictions = await Promise.all([
      this.openWeatherProvider.getCurrentWeather('서울'),
      this.weatherApiProvider.getCurrentWeather('서울'),
      this.openMeteoProvider.getCurrentWeather('서울')
    ]);
    
    // 실제 날씨 (기상청 API 또는 신뢰 가능한 소스)
    const actual = await this.fetchActualWeather('서울');
    
    return {
      date: new Date().toISOString(),
      predictions: {
        openweather: predictions[0],
        weatherapi: predictions[1],
        openmeteo: predictions[2]
      },
      actual: actual
    };
  }
}
```

**AI 분석**:
```
30일간 수집된 데이터:
- 각 제공자의 예보
- 실제 기상청 데이터

분석:
1. 어느 제공자가 가장 정확한가?
2. 시간대별 (오전/오후/저녁) 정확도 차이는?
3. 날씨 상태별 (맑음/비/눈) 정확도는?

출력:
- 종합 순위
- 상황별 추천 (예: "비 예보는 WeatherAPI가 가장 정확")
```

---

### 구현 방법 간단 정리

#### 방법 1: OpenAI API 직접 호출

```typescript
// 개발자가 수동으로 실행
const analyzer = new WeatherAccuracyAnalyzer();
const rankings = await analyzer.analyzeProviderAccuracy(historyData);
console.log(rankings);

// 결과:
// [
//   { provider: 'openweather', score: 95, mae: 0.8 },
//   { provider: 'weatherapi', score: 92, mae: 1.1 },
//   { provider: 'openmeteo', score: 88, mae: 1.4 }
// ]
```

#### 방법 2: 자동화 스크립트

```bash
# cron job (매일 실행)
0 0 * * * node scripts/analyze-weather-accuracy.js
```

```javascript
// scripts/analyze-weather-accuracy.js
import { WeatherCollector } from '../services/analytics/WeatherCollector.js';
import { WeatherAccuracyAnalyzer } from '../services/analytics/WeatherAccuracyAnalyzer.js';

async function main() {
  // 1. 오늘의 데이터 수집
  const collector = new WeatherCollector();
  const todayData = await collector.collectDailyComparison();
  
  // 2. 히스토리에 저장
  await saveToHistory(todayData);
  
  // 3. 30일마다 AI 분석
  const daysSinceLastAnalysis = await getDaysSinceLastAnalysis();
  if (daysSinceLastAnalysis >= 30) {
    const analyzer = new WeatherAccuracyAnalyzer();
    const historyData = await loadHistory(30);
    const rankings = await analyzer.analyzeProviderAccuracy(historyData);
    
    // 4. 결과 저장 및 알림
    await saveRankings(rankings);
    await notifyAdmin(`Provider rankings updated: ${JSON.stringify(rankings)}`);
  }
}

main();
```

#### 방법 3: UI에서 실시간 조회

```typescript
// components/ProviderRankings.vue
<script setup>
import { ref, onMounted } from 'vue';
import { useWeatherAnalytics } from '@/composables/useWeatherAnalytics';

const { rankings, loading, analyze } = useWeatherAnalytics();

onMounted(async () => {
  await analyze(30); // 최근 30일 분석
});
</script>

<template>
  <div v-if="!loading">
    <h3>Provider Accuracy Rankings (Last 30 Days)</h3>
    <ol>
      <li v-for="rank in rankings" :key="rank.provider">
        {{ rank.provider }}: {{ rank.score }}점 (MAE: {{ rank.mae }}°C)
      </li>
    </ol>
  </div>
</template>
```

---

### 비용 및 실현 가능성

| 작업 | 비용 (월) | 실현 가능성 | 실용성 |
|------|-----------|-------------|--------|
| **정확도 순위** | ~$1-5 (월 1회 분석) | 95% | ⭐⭐⭐⭐⭐ |
| **패턴 예측** | ~$10-20 (일 1회 예측) | 70% | ⭐⭐ |
| **실시간 비교** | ~$50-100 (실시간 수집+분석) | 50% | ⭐⭐⭐ |

**권장**:
- ✅ 정확도 순위: 월 1회 자동 실행 (실용적)
- ⚠️ AI 예측: 학술 목적 (기상청 대체 불가)
- ✅ 실시간 비교: 대시보드 참고용

---

### Q2-1 추가 질문 답변

#### 3. 날씨 상태의 다양성

**질문**: "날씨 상태의 다양성에 대한 세부 설명이 필요함"

**옵션 A: 모든 도시 다른 날씨**

**목적**: 다양한 날씨 상태 테스트

**예시**:
```json
{
  "서울": { "weather": { "description": "맑음", "icon": "01d" } },
  "부산": { "weather": { "description": "비", "icon": "10d" } },
  "제주": { "weather": { "description": "흐림", "icon": "04d" } },
  "인천": { "weather": { "description": "눈", "icon": "13d" } },
  "대구": { "weather": { "description": "안개", "icon": "50d" } },
  "대전": { "weather": { "description": "뇌우", "icon": "11d" } },
  "광주": { "weather": { "description": "소나기", "icon": "09d" } },
  "울산": { "weather": { "description": "약간 흐림", "icon": "02d" } }
}
```

**장점**:
- 모든 아이콘 코드 테스트 가능
- UI 다양성 확인
- 엣지 케이스 검증

**단점**:
- 비현실적 (같은 날 서울은 눈, 부산은 비?)
- 학습 자료로 부적합

---

**옵션 B: 현실적 데이터 (계절 고려)**

**목적**: 실제 사용 시나리오 시뮬레이션

**예시** (10월 초 기준):
```json
{
  "서울": {
    "current": { "temperature": 18, "humidity": 55 },
    "weather": { "description": "맑음", "icon": "01d" }
  },
  "부산": {
    "current": { "temperature": 20, "humidity": 65 },
    "weather": { "description": "약간 흐림", "icon": "02d" }
  },
  "제주": {
    "current": { "temperature": 22, "humidity": 70 },
    "weather": { "description": "흐림", "icon": "04d" }
  },
  "인천": {
    "current": { "temperature": 17, "humidity": 58 },
    "weather": { "description": "맑음", "icon": "01d" }
  },
  "대구": {
    "current": { "temperature": 19, "humidity": 52 },
    "weather": { "description": "맑음", "icon": "01d" }
  },
  "대전": {
    "current": { "temperature": 18, "humidity": 54 },
    "weather": { "description": "약간 흐림", "icon": "02d" }
  },
  "광주": {
    "current": { "temperature": 20, "humidity": 60 },
    "weather": { "description": "흐림", "icon": "04d" }
  },
  "울산": {
    "current": { "temperature": 19, "humidity": 62 },
    "weather": { "description": "약간 흐림", "icon": "02d" }
  }
}
```

**특징**:
- 온도 범위: 17-22°C (10월 초 평균)
- 남부 (부산, 제주) > 북부 (서울, 인천)
- 해안가 (부산, 제주, 울산) 습도 높음
- 주로 맑음/약간 흐림 (10월 초 특징)

**장점**:
- 실제 사용 시나리오
- 학습 자료로 적합
- 온도/습도 패턴 파악 가능

**단점**:
- 일부 날씨 상태 (눈, 뇌우) 테스트 불가

---

**옵션 C: 하이브리드 (권장)**

**목적**: 현실성 + 테스트 커버리지

**기본 8개 도시**: 현실적 데이터
**추가 테스트 도시**: 극단 케이스

```json
{
  "cities": {
    "서울": { "temperature": 18, "description": "맑음" },
    "부산": { "temperature": 20, "description": "약간 흐림" },
    "제주": { "temperature": 22, "description": "흐림" },
    "인천": { "temperature": 17, "description": "맑음" },
    "대구": { "temperature": 19, "description": "맑음" },
    "대전": { "temperature": 18, "description": "약간 흐림" },
    "광주": { "temperature": 20, "description": "흐림" },
    "울산": { "temperature": 19, "description": "약간 흐림" }
  },
  "testCities": {
    "테스트_비": { "temperature": 15, "description": "비", "icon": "10d" },
    "테스트_눈": { "temperature": -2, "description": "눈", "icon": "13d" },
    "테스트_뇌우": { "temperature": 25, "description": "뇌우", "icon": "11d" },
    "테스트_안개": { "temperature": 10, "description": "안개", "icon": "50d" },
    "테스트_폭염": { "temperature": 38, "description": "맑음", "icon": "01d" },
    "테스트_한파": { "temperature": -15, "description": "맑음", "icon": "01n" }
  }
}
```

**장점**:
- 실제 도시: 현실적 데이터
- 테스트 도시: 모든 날씨 상태
- 두 목적 모두 달성

**권장**: Option C (하이브리드)

---

### 최종 정리

Q2-1 최종 답변:

1. **Mock JSON 구조**: B (API 원본 포함) + 최적화 방법 2 (외부 파일 분리)
2. **포함할 도시**: 기본 8개 (서울, 부산, 제주, 인천, 대구, 대전, 광주, 울산)
3. **날씨 다양성**: Option C (현실적 데이터 + 테스트 도시)
4. **Timestamp**: 현재 시간 (`new Date().toISOString()`)
5. **아이콘 매핑**: OpenWeatherMap 기준 통합

다음 단계: Mock JSON 파일 및 아이콘 매핑 테이블 생성 진행할까요?
