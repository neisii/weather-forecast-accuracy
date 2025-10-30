# Weather App 리팩토링 기획서
## AI-DLC 방법론 기반 날씨 API 어댑터 패턴 적용

**작성일**: 2025-10-07  
**방법론**: AI-Driven Development Life Cycle (AI-DLC)  
**목적**: 날씨 API 교체 가능성 확보 및 코어 로직과 외부 서비스 분리

---

## 📋 Executive Summary

### 현재 상황
- OpenWeatherMap API에 직접 의존
- API 키 없이 실제 서비스 연동 불가
- 무료 일 1000회 제한, 초과 시 과금 위험
- 테스트용 대체 API 사용 불가능

### 목표
날씨 API 제공자를 교체 가능하도록 **어댑터 패턴**을 적용하여 코어 비즈니스 로직과 외부 서비스를 분리

### 예상 효과
1. **유연성**: OpenWeatherMap ↔ 다른 API 쉽게 교체
2. **테스트 용이성**: Mock API 제공자 추가로 과금 걱정 없이 개발
3. **유지보수성**: API 변경 시 어댑터만 수정
4. **확장성**: 다중 API 지원 (fallback 전략)

---

## 🎯 AI-DLC 적용 방법론

### Phase 1: Inception (요구사항 명확화)
- **AI 역할**: 현재 아키텍처 분석, 리팩토링 계획 제안
- **인간 역할**: 비즈니스 요구사항 검증, 기술적 제약사항 명확화

### Phase 2: Construction (구현)
- **AI 역할**: 어댑터 패턴 코드 생성, 테스트 작성
- **인간 역할**: 아키텍처 결정, 코드 리뷰, 통합 검증

### Phase 3: Operation (배포 및 검증)
- **AI 역할**: 마이그레이션 가이드 작성, 문서화
- **인간 역할**: 최종 승인, 배포 결정

---

## 📐 현재 아키텍처 분석

### 계층 구조
```
[Vue Component] 
    ↓
[Pinia Store] 
    ↓
[weatherApi.ts] ← OpenWeatherMap API 직접 호출
    ↓
[OpenWeatherMap API]
```

### 문제점
1. **강한 결합**: Pinia Store가 OpenWeatherMap API 응답 타입에 의존
2. **교체 불가**: 다른 API 사용 시 전체 코드 수정 필요
3. **테스트 어려움**: 실제 API 키 없이 개발 불가

### 의존성 분석
```typescript
// stores/weather.ts
import { weatherApi } from '../services/weatherApi';

// weatherApi는 OpenWeatherMap 전용
const data = await weatherApi.getCurrentWeather(city);
// data는 WeatherAPIResponse 타입 (OpenWeatherMap 구조)

currentWeather.value = {
  city: data.name,              // ← OpenWeatherMap 필드명
  temperature: Math.round(data.main.temp),  // ← OpenWeatherMap 구조
  // ...
};
```

---

## 🏗️ 목표 아키텍처 (어댑터 패턴)

### 새로운 계층 구조
```
[Vue Component]
    ↓
[Pinia Store] ← 표준 도메인 타입 사용 (CurrentWeather)
    ↓
[WeatherService] ← 도메인 로직 (비즈니스 규칙)
    ↓
[WeatherProviderAdapter Interface] ← 추상화 계층
    ↓         ↓              ↓
[OpenWeather] [MockWeather] [OtherAPI]
Adapter       Adapter       Adapter
```

### 핵심 설계 원칙

#### 1. 도메인 타입 (코어)
```typescript
// types/domain/weather.ts
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
- **변경 불가**: 외부 API 변경과 무관
- **비즈니스 중심**: 애플리케이션이 필요로 하는 데이터 구조

#### 2. Provider Interface (추상화)
```typescript
// services/providers/WeatherProvider.ts
export interface WeatherProvider {
  getCurrentWeather(city: string): Promise<CurrentWeather>;
  getForecast(city: string): Promise<Forecast>;
  getName(): string; // 제공자 이름
}
```
- **계약(Contract)**: 모든 제공자가 구현해야 할 메서드
- **교체 가능**: 같은 인터페이스를 구현하면 언제든 교체 가능

#### 3. Adapter 구현체
```typescript
// services/providers/OpenWeatherAdapter.ts
export class OpenWeatherAdapter implements WeatherProvider {
  private apiKey: string;
  private baseUrl = 'https://api.openweathermap.org/data/2.5';
  
  async getCurrentWeather(city: string): Promise<CurrentWeather> {
    const response = await this.fetchFromAPI(city);
    return this.transformToDomain(response); // ← 변환 로직
  }
  
  private transformToDomain(data: OpenWeatherAPIResponse): CurrentWeather {
    return {
      city: data.name,
      temperature: Math.round(data.main.temp),
      // ... OpenWeatherMap → 도메인 타입 변환
    };
  }
}
```

#### 4. WeatherService (비즈니스 로직)
```typescript
// services/WeatherService.ts
export class WeatherService {
  private provider: WeatherProvider;
  
  constructor(provider: WeatherProvider) {
    this.provider = provider;
  }
  
  async getWeather(city: string): Promise<CurrentWeather> {
    // 비즈니스 규칙 (예: 캐싱, 검증, 로깅)
    if (!city || city.trim().length === 0) {
      throw new Error('도시 이름을 입력하세요');
    }
    
    return await this.provider.getCurrentWeather(city);
  }
  
  // Provider 교체 가능
  setProvider(provider: WeatherProvider) {
    this.provider = provider;
  }
}
```

---

## 🔧 리팩토링 단계별 계획

### Phase 1: Inception (요구사항 명확화) - 30분

#### 1.1 비즈니스 요구사항 검증 (인간 작업)
**담당**: 사용자  
**소요 시간**: 10분  
**작업 내용**:
- [ ] 날씨 API 교체 우선순위 확인
- [ ] Mock API 제공자 요구사항 결정
  - [ ] 고정된 응답 반환? (예: 항상 서울 20°C)
  - [ ] 랜덤 데이터 생성?
  - [ ] 로컬 JSON 파일 기반?
- [ ] 지원할 API 제공자 목록 확정
  - [ ] OpenWeatherMap (기존)
  - [ ] MockWeatherProvider (테스트용)
  - [ ] 추가 제공자? (예: WeatherAPI.com, OpenMeteo)

#### 1.2 기술적 제약사항 명확화 (AI가 질문 → 인간 답변)
**담당**: AI 질문 → 사용자 답변  
**소요 시간**: 10분  
**AI 질문 목록**:
1. **Provider 선택 방식**:
   - 환경 변수로 선택? (`VITE_WEATHER_PROVIDER=openweather`)
   - UI에서 사용자 선택?
   - 우선순위 fallback? (OpenWeather 실패 시 Mock으로)

2. **기존 코드 호환성**:
   - 기존 `weatherApi.ts` 완전 교체?
   - 점진적 마이그레이션? (legacy 코드 일시 유지)

3. **타입 안전성**:
   - TypeScript strict 모드 유지?
   - 런타임 검증 추가? (Zod 등)

4. **테스트 전략**:
   - Playwright 테스트 수정 필요?
   - 어댑터별 단위 테스트 추가?

#### 1.3 아키텍처 설계 검증 (AI 제안 → 인간 승인)
**담당**: AI 제안 → 사용자 검토  
**소요 시간**: 10분  
**AI 제안**:
```
제안된 디렉토리 구조:

src/
├── types/
│   ├── domain/          ← 새로 추가
│   │   └── weather.ts   (도메인 타입, API 독립적)
│   └── api/             ← 새로 추가
│       └── openweather.ts (API 전용 타입)
├── services/
│   ├── WeatherService.ts         ← 새로 추가 (비즈니스 로직)
│   ├── providers/                ← 새로 추가
│   │   ├── WeatherProvider.ts    (인터페이스)
│   │   ├── OpenWeatherAdapter.ts (구현체)
│   │   ├── MockWeatherAdapter.ts (테스트용)
│   │   └── index.ts              (Provider 팩토리)
│   └── weatherApi.ts             (레거시, 점진적 제거)
├── stores/
│   └── weather.ts       (수정: WeatherService 사용)
└── config/
    └── weatherConfig.ts ← 새로 추가 (Provider 설정)
```

**사용자 확인 필요**:
- [ ] 디렉토리 구조 승인
- [ ] 파일명 컨벤션 승인
- [ ] 마이그레이션 전략 승인 (점진적 vs 일괄)

---

### Phase 2: Construction (구현) - 2시간

#### 2.1 도메인 타입 정의 (AI 작업)
**담당**: AI 자동 수행  
**소요 시간**: 5분  
**작업 내용**:
- [ ] `types/domain/weather.ts` 생성
  - CurrentWeather (기존과 동일, 위치만 이동)
  - Forecast (필요 시)
- [ ] `types/api/openweather.ts` 생성
  - WeatherAPIResponse (기존 내용 이동)
  - ForecastAPIResponse

**검증 포인트 (인간)**:
- [ ] 도메인 타입이 비즈니스 요구사항 충족하는지 확인

#### 2.2 Provider Interface 정의 (AI 작업)
**담당**: AI 자동 수행  
**소요 시간**: 10분  
**작업 내용**:
- [ ] `services/providers/WeatherProvider.ts` 인터페이스 생성
- [ ] 메서드 시그니처 정의
- [ ] JSDoc 주석 추가

**검증 포인트 (인간)**:
- [ ] 인터페이스 설계 검토
- [ ] 메서드 이름 적절성 확인

#### 2.3 OpenWeatherAdapter 구현 (AI 작업)
**담당**: AI 자동 수행  
**소요 시간**: 20분  
**작업 내용**:
- [ ] `services/providers/OpenWeatherAdapter.ts` 생성
- [ ] 기존 `weatherApi.ts` 로직 이식
- [ ] API 응답 → 도메인 타입 변환 로직
- [ ] 에러 처리 (404, 401 등)

**검증 포인트 (인간)**:
- [ ] 변환 로직 정확성 검증
- [ ] 에러 메시지 적절성 확인

#### 2.4 MockWeatherAdapter 구현 (AI 작업)
**담당**: AI 자동 수행  
**소요 시간**: 15분  
**작업 내용**:
- [ ] `services/providers/MockWeatherAdapter.ts` 생성
- [ ] 고정 응답 또는 랜덤 데이터 생성 로직
- [ ] 인위적 지연 추가 (실제 API 시뮬레이션)

**사용자 결정 필요**:
- Mock 데이터 전략:
  - [ ] 고정 데이터 (항상 동일 응답)
  - [ ] 도시별 사전 정의 데이터
  - [ ] 랜덤 생성

**AI 제안**:
```typescript
// MockWeatherAdapter.ts 예시
export class MockWeatherAdapter implements WeatherProvider {
  private mockData = {
    '서울': { temp: 20, humidity: 60, description: '맑음' },
    '부산': { temp: 22, humidity: 70, description: '흐림' },
    // ...
  };
  
  async getCurrentWeather(city: string): Promise<CurrentWeather> {
    await this.simulateDelay(500); // 실제 API 지연 시뮬레이션
    
    const data = this.mockData[city] || this.generateRandomData();
    return this.transformToDomain(data);
  }
}
```

#### 2.5 WeatherService 구현 (AI 작업)
**담당**: AI 자동 수행  
**소요 시간**: 15분  
**작업 내용**:
- [ ] `services/WeatherService.ts` 생성
- [ ] Provider 주입 로직
- [ ] 비즈니스 규칙 구현 (검증, 캐싱 등)
- [ ] Provider 교체 메서드

#### 2.6 Provider 팩토리 구현 (AI 작업)
**담당**: AI 자동 수행  
**소요 시간**: 15분  
**작업 내용**:
- [ ] `services/providers/index.ts` 생성
- [ ] 환경 변수 기반 Provider 선택 로직
- [ ] 싱글톤 패턴 (필요 시)

**AI 제안**:
```typescript
// services/providers/index.ts
export function createWeatherProvider(): WeatherProvider {
  const providerType = import.meta.env.VITE_WEATHER_PROVIDER || 'openweather';
  
  switch (providerType) {
    case 'openweather':
      return new OpenWeatherAdapter(import.meta.env.VITE_OPENWEATHER_API_KEY);
    case 'mock':
      return new MockWeatherAdapter();
    default:
      throw new Error(`Unknown provider: ${providerType}`);
  }
}
```

**사용자 결정 필요**:
- [ ] Provider 선택 방식 확정 (환경 변수 vs UI 선택)

#### 2.7 Pinia Store 리팩토링 (AI 작업)
**담당**: AI 자동 수행  
**소요 시간**: 15분  
**작업 내용**:
- [ ] `stores/weather.ts` 수정
- [ ] `weatherApi` 대신 `WeatherService` 사용
- [ ] 에러 처리 유지 (기존 로직 보존)

**Before/After 비교**:
```typescript
// Before
import { weatherApi } from '../services/weatherApi';
const data = await weatherApi.getCurrentWeather(city);

// After
import { weatherService } from '../services/WeatherService';
const data = await weatherService.getWeather(city);
```

#### 2.8 설정 파일 추가 (AI 작업)
**담당**: AI 자동 수행  
**소요 시간**: 10분  
**작업 내용**:
- [ ] `config/weatherConfig.ts` 생성
- [ ] `.env.example` 업데이트

```bash
# .env.example
VITE_WEATHER_PROVIDER=openweather  # or 'mock'
VITE_OPENWEATHER_API_KEY=your_api_key_here
```

#### 2.9 테스트 업데이트 (AI 작업)
**담당**: AI 자동 수행  
**소요 시간**: 20분  
**작업 내용**:
- [ ] Playwright 테스트 수정 (필요 시)
- [ ] 어댑터별 단위 테스트 추가
  - [ ] OpenWeatherAdapter.spec.ts
  - [ ] MockWeatherAdapter.spec.ts
- [ ] WeatherService.spec.ts

**검증 포인트 (인간)**:
- [ ] 모든 테스트 통과 확인
- [ ] 테스트 커버리지 확인

---

### Phase 3: Operation (배포 및 검증) - 30분

#### 3.1 마이그레이션 가이드 작성 (AI 작업)
**담당**: AI 자동 수행  
**소요 시간**: 15분  
**작업 내용**:
- [ ] `docs/MIGRATION_GUIDE.md` 생성
- [ ] 환경 변수 설정 방법
- [ ] Provider 교체 방법
- [ ] 새로운 Provider 추가 방법

#### 3.2 문서화 업데이트 (AI 작업)
**담당**: AI 자동 수행  
**소요 시간**: 10분  
**작업 내용**:
- [ ] `README.md` 업데이트
- [ ] `PROGRESS.md` 업데이트
- [ ] 아키텍처 다이어그램 추가

#### 3.3 최종 검증 (인간 작업)
**담당**: 사용자  
**소요 시간**: 15분  
**작업 내용**:
- [ ] 개발 서버 실행 (`npm run dev`)
- [ ] Mock Provider 테스트
  - [ ] `.env`에서 `VITE_WEATHER_PROVIDER=mock` 설정
  - [ ] 서울 날씨 검색 → Mock 데이터 반환 확인
- [ ] OpenWeather Provider 테스트 (API 키 있는 경우)
  - [ ] `VITE_WEATHER_PROVIDER=openweather` 설정
  - [ ] 실제 API 호출 확인
- [ ] Playwright 테스트 실행
- [ ] 코드 리뷰 및 최종 승인

---

## 📊 작업 분담 요약

### AI 자동 수행 작업 (총 2시간 5분)
1. ✅ 도메인 타입 정의 (5분)
2. ✅ Provider Interface 정의 (10분)
3. ✅ OpenWeatherAdapter 구현 (20분)
4. ✅ MockWeatherAdapter 구현 (15분)
5. ✅ WeatherService 구현 (15분)
6. ✅ Provider 팩토리 구현 (15분)
7. ✅ Pinia Store 리팩토링 (15분)
8. ✅ 설정 파일 추가 (10분)
9. ✅ 테스트 작성 (20분)
10. ✅ 마이그레이션 가이드 작성 (15분)
11. ✅ 문서화 업데이트 (10분)

**AI 작업 특징**:
- 코드 생성 및 변환
- 패턴 적용 (어댑터, 팩토리)
- 테스트 코드 작성
- 문서 작성

### 인간 필수 작업 (총 45분)
1. ⚠️ 비즈니스 요구사항 검증 (10분)
   - Mock API 전략 결정
   - 지원할 Provider 목록 확정
2. ⚠️ 기술적 제약사항 명확화 (10분)
   - Provider 선택 방식 결정
   - 마이그레이션 전략 승인
3. ⚠️ 아키텍처 설계 승인 (10분)
   - 디렉토리 구조 검토
   - 인터페이스 설계 승인
4. ⚠️ 최종 검증 및 승인 (15분)
   - 실제 동작 테스트
   - 코드 리뷰
   - 배포 결정

**인간 작업 특징**:
- 의사결정 (비즈니스, 아키텍처)
- 검증 및 승인
- 컨텍스트 제공 (AI가 모르는 정보)

---

## 🎯 즉시 필요한 결정 사항 (사용자 답변 요청)

AI가 구현을 시작하기 전에 다음 질문에 답변해주세요:

### Q1. Mock Weather Provider 데이터 전략
다음 중 선택:
- [ ] **A**: 고정 데이터 (항상 서울 20°C, 부산 22°C 등)
- [ ] **B**: 랜덤 데이터 (매번 다른 날씨)
- [ ] **C**: 도시별 JSON 파일 기반 (`mock-data/weather.json`)

**추천**: A (고정 데이터) - 테스트와 디버깅이 가장 쉬움

### Q2. Provider 선택 방식
다음 중 선택:
- [ ] **A**: 환경 변수만 (`VITE_WEATHER_PROVIDER=openweather|mock`)
- [ ] **B**: UI에서 사용자 선택 (설정 페이지 추가)
- [ ] **C**: 자동 Fallback (OpenWeather 실패 시 Mock 사용)

**추천**: A (환경 변수) - 가장 간단하고 명확

### Q3. 마이그레이션 전략
다음 중 선택:
- [ ] **A**: 점진적 (기존 `weatherApi.ts` 유지, 새 코드와 공존)
- [ ] **B**: 일괄 교체 (기존 코드 완전 삭제)

**추천**: B (일괄 교체) - 코드베이스가 작아 일괄 전환 가능

### Q4. 추가 Provider 지원
다음 중 선택:
- [ ] **A**: OpenWeather + Mock만 (현재 범위)
- [ ] **B**: WeatherAPI.com 추가 (무료 API)
- [ ] **C**: Open-Meteo 추가 (완전 무료, 키 불필요)

**추천**: A (OpenWeather + Mock) - 패턴 검증 후 확장

### Q5. 테스트 범위
다음 중 선택:
- [ ] **A**: Playwright E2E만 유지
- [ ] **B**: 어댑터별 단위 테스트 추가 (Vitest)
- [ ] **C**: 통합 테스트 추가 (WeatherService)

**추천**: B (단위 테스트 추가) - 어댑터 로직 검증 필수

---

## 🚀 다음 단계

### 사용자가 위 질문에 답변하면:

1. **AI가 즉시 시작**:
   - Phase 2 (Construction) 자동 수행
   - 모든 코드 파일 생성 및 리팩토링
   - 테스트 작성
   
2. **사용자는 중간 검증**:
   - 주요 마일스톤마다 AI가 보고
   - 사용자가 승인하면 다음 단계 진행

3. **최종 검증 및 배포**:
   - 사용자가 직접 테스트
   - 승인 후 커밋

---

## 📈 예상 타임라인

```
사용자 결정 (10분)
    ↓
AI 구현 (2시간, 자동)
    ↓
사용자 검증 (15분)
    ↓
완료 ✅
```

**총 소요 시간**: 약 2시간 30분

---

## 🔗 참고 자료

- **어댑터 패턴**: https://refactoring.guru/design-patterns/adapter
- **의존성 주입**: https://en.wikipedia.org/wiki/Dependency_injection
- **AI-DLC 개념**: `/docs/ai-dlc.txt`

---

**작성자**: Claude (AI)  
**승인자**: [사용자 이름]  
**상태**: 승인 대기 중
