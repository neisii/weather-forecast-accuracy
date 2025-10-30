# Backend Proxy 구축 결정 사항

**결정일**: 2025-10-30  
**목적**: API 키 보안을 위한 백엔드 프록시 서버 구축

---

## 📋 배경

### 문제점

**GitHub Pages 배포 시 API 키 노출 문제**:
- Vite 환경 변수 (`VITE_*`)는 빌드 시 클라이언트 번들에 포함됨
- 배포된 JavaScript 파일에서 API 키가 평문으로 노출
- GitHub Actions Secrets에 저장해도 결국 클라이언트에 노출됨

**현재 상태**:
- ✅ `.env` 파일에 API 키 저장 (git-ignored)
- ✅ 로컬 개발 환경에서는 안전
- ❌ GitHub Pages 배포 시 API 키 없음 → API 호출 실패
- ❌ API 키를 포함하면 보안 위험

### 보안 사고 이력

프로젝트에서 **3번의 API 키 노출 사고** 발생:
1. `docs/PHASE_2_TO_3_CHECKLIST.md` - OpenWeatherMap + WeatherAPI 키
2. `docs/PHASE_3_PLAN.md` - WeatherAPI 키
3. `docs/SECURITY_INCIDENT_20251008.md` - WeatherAPI 키 (보안 문서 자체에서)

**교훈**:
- 문서에 API 키를 절대 풀 텍스트로 작성하지 않음
- 클라이언트 코드에 API 키 포함은 근본적 위험

---

## 🎯 요구사항

### 기능 요구사항

1. **API 키 보안**
   - 클라이언트에 API 키 노출 금지
   - 서버 측에서만 API 키 관리

2. **3개 Provider 지원**
   - OpenWeatherMap API
   - WeatherAPI.com API
   - Open-Meteo API (API 키 불필요, 프록시 선택적)

3. **기존 코드 호환성**
   - 프론트엔드 코드 최소 변경
   - Adapter 패턴 유지
   - 기존 타입 정의 재사용

4. **성능**
   - 빠른 응답 속도 (< 500ms overhead)
   - 글로벌 엣지 네트워크 활용

### 비기능 요구사항

1. **비용**: 무료 운영 가능
2. **확장성**: 개인 사용 → 소규모 공개 서비스 확장 가능
3. **유지보수**: 간단한 배포 및 업데이트
4. **모니터링**: 사용량 추적 가능

---

## 🔍 대안 검토

### Option 1: Vercel Functions
**장점**:
- ✅ GitHub 연동 자동 배포
- ✅ 설정 매우 간단 (30분 구현)
- ✅ 프론트엔드와 통합 배포
- ✅ 월 100,000 invocations 무료

**단점**:
- ❌ 비상업용만 가능 (Hobby plan)
- ❌ 월 제한 (일일 리셋 없음)
- ❌ 초과 시 월말까지 서비스 중단

**예상 비용**: 무료 (개인 사용 시)

### Option 2: Netlify Functions
**장점**:
- ✅ Vercel과 유사한 간편함
- ✅ 월 125,000 invocations (Vercel보다 높음)
- ✅ 설정 간단

**단점**:
- ❌ 초과 시 사이트 전체 중단
- ❌ 월 제한 (일일 리셋 없음)

**예상 비용**: 무료 (개인 사용 시)

### Option 3: Cloudflare Workers ⭐ (선택)
**장점**:
- ✅ **일일 100,000 requests** (월 제한 아님!)
- ✅ 매일 00:00 UTC 리셋 → 초과 걱정 없음
- ✅ 글로벌 엣지 네트워크 (가장 빠름)
- ✅ 상업용 사용 가능
- ✅ 2025년 신규: Durable Objects 무료
- ✅ Workers KV, D1 포함

**단점**:
- ⚠️ 설정 약간 복잡함 (Wrangler CLI)
- ⚠️ 학습 곡선 존재

**예상 비용**: 무료 (일일 100,000 requests)

### Option 4: AWS Lambda + API Gateway
**장점**:
- ✅ 월 1백만 requests 무료
- ✅ 강력한 확장성

**단점**:
- ❌ 설정 복잡도 높음
- ❌ Cold start 문제
- ❌ 학습 곡선 가파름

**예상 비용**: 무료 (Free Tier)

---

## ✅ 최종 결정

### 선택: Cloudflare Workers

**결정 이유**:

1. **무제한에 가까운 무료 제공**
   - 일일 100,000 requests (매일 리셋)
   - 개인 사용: 하루 100번 검색 = 300 requests
   - **여유도 333배** → 초과 걱정 없음

2. **최고의 성능**
   - 글로벌 엣지 네트워크 (300+ locations)
   - Cold start 없음
   - 평균 응답 속도 < 50ms

3. **상업용 사용 가능**
   - 향후 공개 서비스로 확장 가능
   - 비상업 제약 없음

4. **학습 가치**
   - Cloudflare Workers 경험 축적
   - Edge computing 이해

5. **장기적 안정성**
   - 월 제한이 아닌 일일 리셋
   - 실수로 초과해도 다음 날 자동 복구

**트레이드오프**:
- 초기 설정 시간: 30분 → 1-2시간
- 학습 곡선: 낮음 → 중간
- **판단**: 장기적 이점이 초기 투자 대비 충분히 가치 있음

---

## 🏗️ 아키텍처 설계

### 전체 구조

```
┌─────────────────┐
│  Vue Frontend   │
│  (GitHub Pages) │
└────────┬────────┘
         │ HTTPS
         ↓
┌─────────────────────────┐
│  Cloudflare Workers     │
│  (Edge Network)         │
│  ┌─────────────────┐    │
│  │ /api/openweather│    │
│  │ /api/weatherapi │    │
│  │ /api/openmeteo  │    │
│  └─────────────────┘    │
│  API Keys in Secrets    │
└────────┬────────────────┘
         │ HTTPS
         ↓
┌─────────────────────────┐
│  Weather API Providers  │
│  - OpenWeatherMap       │
│  - WeatherAPI.com       │
│  - Open-Meteo           │
└─────────────────────────┘
```

### 엔드포인트 설계

**Base URL**: `https://weather-proxy.{subdomain}.workers.dev`

#### 1. OpenWeatherMap 프록시
```
GET /api/openweather?city={city}&type={current|forecast}

Response:
{
  "name": "Seoul",
  "main": { "temp": 15.2, ... },
  "weather": [...],
  ...
}
```

#### 2. WeatherAPI 프록시
```
GET /api/weatherapi?city={city}&type={current|forecast}

Response:
{
  "location": { "name": "Seoul", ... },
  "current": { "temp_c": 15.2, ... },
  ...
}
```

#### 3. Open-Meteo 프록시 (선택적)
```
GET /api/openmeteo?lat={lat}&lon={lon}&type={current|forecast}

Response:
{
  "current_weather": { "temperature": 15.2, ... },
  ...
}
```

### 보안 설계

**API 키 관리**:
- Cloudflare Workers Secrets에 저장
- 환경 변수로 주입: `OPENWEATHER_API_KEY`, `WEATHERAPI_API_KEY`
- 클라이언트에 절대 노출 안 됨

**CORS 설정**:
```typescript
headers: {
  'Access-Control-Allow-Origin': 'https://neisii.github.io',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}
```

**Rate Limiting** (선택적):
- Cloudflare Workers KV 활용
- IP별 요청 제한 (예: 100 requests/hour)

### 에러 처리

**프록시 레벨 에러**:
```typescript
{
  "error": {
    "code": "PROXY_ERROR",
    "message": "Failed to fetch from weather provider",
    "status": 502
  }
}
```

**Provider 레벨 에러**:
```typescript
{
  "error": {
    "code": "PROVIDER_ERROR",
    "message": "City not found",
    "status": 404,
    "provider": "openweather"
  }
}
```

---

## 📊 사용량 예측

### 개인 사용 시나리오

**일일 사용 패턴**:
```
검색 횟수: 10회/일
Provider 수: 3개 (OpenWeather, WeatherAPI, OpenMeteo)
총 요청: 10 × 3 = 30 requests/day
```

**무료 제한 대비**:
- Cloudflare 제한: 100,000 requests/day
- 사용량: 30 requests/day
- **여유도**: 3,333배
- **초과 가능성**: 0%

### 소규모 공개 시나리오

**일일 사용자 100명 가정**:
```
사용자: 100명
검색 횟수: 5회/인
총 검색: 500회
Provider 수: 3개
총 요청: 500 × 3 = 1,500 requests/day
```

**무료 제한 대비**:
- 사용량: 1,500 requests/day
- **여유도**: 66배
- **초과 가능성**: 0%

**결론**: 소규모 공개 서비스까지 무료로 충분히 운영 가능

---

## 🚀 구현 계획

### Phase 1: 기본 프록시 구현 (1시간)
- [x] Cloudflare Workers 프로젝트 설정
- [ ] Wrangler CLI 설치 및 설정
- [ ] OpenWeatherMap 프록시 구현
- [ ] WeatherAPI 프록시 구현
- [ ] Open-Meteo 프록시 구현
- [ ] 로컬 테스트 (wrangler dev)

### Phase 2: 배포 및 통합 (30분)
- [ ] Cloudflare에 배포
- [ ] Secrets 설정 (API 키)
- [ ] 프론트엔드 Adapter 수정
- [ ] CORS 설정 확인
- [ ] E2E 테스트

### Phase 3: 문서화 및 정리 (30분)
- [ ] 배포 가이드 작성
- [ ] API 문서화
- [ ] PROGRESS.md 업데이트
- [ ] README.md 업데이트

**총 예상 시간**: 2시간

---

## 📝 프론트엔드 변경 사항

### Adapter 수정

**Before** (직접 호출):
```typescript
const response = await fetch(
  `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}`
);
```

**After** (프록시 호출):
```typescript
const response = await fetch(
  `https://weather-proxy.{subdomain}.workers.dev/api/openweather?city=${city}&type=current`
);
```

### 환경 변수 변경

**Before** (`.env`):
```bash
VITE_OPENWEATHER_API_KEY=ad8d**********************db5d8b
VITE_WEATHERAPI_API_KEY=4bac**********************250810
```

**After** (`.env`):
```bash
VITE_PROXY_BASE_URL=https://weather-proxy.{subdomain}.workers.dev
# 개발 환경
VITE_USE_PROXY=true
```

### Adapter 패턴 유지

기존 Adapter 인터페이스 변경 없음:
- `WeatherProvider` 인터페이스 유지
- `OpenWeatherAdapter`, `WeatherAPIAdapter`, `OpenMeteoAdapter` 유지
- 내부 구현만 프록시 URL로 변경

---

## 🔒 보안 고려사항

### API 키 관리

**Cloudflare Secrets 저장**:
```bash
wrangler secret put OPENWEATHER_API_KEY
wrangler secret put WEATHERAPI_API_KEY
```

**절대 금지**:
- ❌ Workers 코드에 하드코딩
- ❌ wrangler.toml에 평문 저장
- ❌ Git에 커밋

### CORS 정책

**프로덕션**: 특정 도메인만 허용
```typescript
'Access-Control-Allow-Origin': 'https://neisii.github.io'
```

**개발**: localhost 허용
```typescript
'Access-Control-Allow-Origin': 'http://localhost:5173'
```

### Rate Limiting (향후)

**IP 기반 제한**:
- Workers KV에 IP별 요청 카운트 저장
- 시간당 100 requests 제한
- 초과 시 429 Too Many Requests

---

## 📈 모니터링 및 운영

### Cloudflare Analytics

**기본 제공 메트릭**:
- 요청 수 (requests)
- 응답 시간 (duration)
- 에러율 (error rate)
- 대역폭 (bandwidth)

**대시보드**: Cloudflare Dashboard → Workers → Analytics

### 알림 설정 (선택적)

**사용량 알림**:
- 일일 80% 사용 시 이메일
- 일일 100% 도달 시 알림

**에러 알림**:
- 5분간 에러율 10% 이상 시 알림

### 로그 확인

**실시간 로그**:
```bash
wrangler tail
```

**로그 보관**:
- Cloudflare Logpush (유료 기능)
- 또는 Workers 내에서 외부 로깅 서비스 연동

---

## 🎓 학습 리소스

### Cloudflare Workers 공식 문서
- [Get Started](https://developers.cloudflare.com/workers/get-started/)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)
- [Examples](https://developers.cloudflare.com/workers/examples/)

### 참고 프로젝트
- [Cloudflare Workers Examples](https://github.com/cloudflare/workers-sdk/tree/main/templates)
- [API Proxy Example](https://developers.cloudflare.com/workers/examples/cors-header-proxy/)

---

## ✅ 성공 기준

### 기능 테스트
- [ ] 3개 Provider 모두 정상 작동
- [ ] GitHub Pages에서 API 호출 성공
- [ ] 로컬 개발 환경에서도 작동
- [ ] 에러 처리 정상 작동

### 보안 테스트
- [ ] 클라이언트에서 API 키 확인 안 됨
- [ ] CORS 정책 정상 작동
- [ ] 배포된 Workers 코드에 API 키 없음

### 성능 테스트
- [ ] 프록시 오버헤드 < 100ms
- [ ] 전체 응답 시간 < 1초
- [ ] 글로벌 엣지에서 빠른 응답

---

## 📋 체크리스트

### 준비 단계
- [ ] Cloudflare 계정 생성
- [ ] Node.js 설치 확인 (v18+)
- [ ] npm/pnpm 설치 확인
- [ ] Git 저장소 상태 확인

### 구현 단계
- [ ] Wrangler CLI 설치
- [ ] Workers 프로젝트 생성
- [ ] 프록시 함수 구현
- [ ] 로컬 테스트 완료
- [ ] Cloudflare 배포
- [ ] Secrets 설정

### 통합 단계
- [ ] 프론트엔드 Adapter 수정
- [ ] 환경 변수 설정
- [ ] GitHub Pages 재배포
- [ ] E2E 테스트 통과

### 문서화 단계
- [ ] API 문서 작성
- [ ] 배포 가이드 작성
- [ ] PROGRESS.md 업데이트
- [ ] 커밋 및 푸시

---

## 📚 관련 문서

- [SECURITY_INCIDENT_20251008.md](./SECURITY_INCIDENT_20251008.md) - API 키 노출 사고 이력
- [USER_DECISIONS.md](./USER_DECISIONS.md) - 사용자 결정 사항
- [GITHUB_SECRET_SCANNING_SETUP.md](./GITHUB_SECRET_SCANNING_SETUP.md) - GitHub Secret Protection 설정

---

**작성자**: AI Assistant  
**승인자**: 사용자  
**최종 업데이트**: 2025-10-30  
**다음 단계**: Phase 1 구현 시작
