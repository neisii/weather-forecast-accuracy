# Phase 6 Data Collection Scripts

이 디렉토리는 Phase 6 (Weather Accuracy Tracking)의 데이터 수집 및 분석 스크립트를 포함합니다.

---

## 📂 파일 구조

```
scripts/
├── collect-predictions.ts   # 내일 날씨 예보 수집
├── collect-observations.ts  # 오늘 실제 날씨 수집
├── weekly-analysis.ts       # 주간 정확도 분석
└── README.md                # 이 문서
```

---

## 🔧 스크립트 설명

### 1. collect-predictions.js

**목적**: 각 Provider에서 내일 날씨 예보 수집

**실행 시간**: 매일 00:00 UTC (한국 09:00)

**출력 파일**: `data/predictions/YYYY-MM-DD.json`

**사용법**:
```bash
# 로컬 테스트 (tsx 사용)
export OPENWEATHER_API_KEY="your_key"
export WEATHERAPI_KEY="your_key"
npx tsx --tsconfig tsconfig.app.json scripts/collect-predictions.ts

# 또는 간단하게
npx tsx scripts/collect-predictions.ts
```

**출력 예시**:
```json
{
  "date": "2025-10-09",
  "collected_at": "2025-10-09T00:00:05Z",
  "target_date": "2025-10-10",
  "city": "서울",
  "predictions": {
    "openweather": {
      "temp_max": 22,
      "temp_min": 15,
      "condition_main": "Clear",
      "humidity": 60,
      "predicted_at": "2025-10-09T00:00:05Z"
    },
    "weatherapi": { ... },
    "openmeteo": { ... }
  }
}
```

---

### 2. collect-observations.js

**목적**: 각 Provider에서 오늘 실제 날씨 수집

**실행 시간**: 매일 00:30 UTC (한국 09:30)

**출력 파일**: `data/observations/YYYY-MM-DD.json`

**사용법**:
```bash
# 로컬 테스트 (tsx 사용)
export OPENWEATHER_API_KEY="your_key"
export WEATHERAPI_KEY="your_key"
npx tsx --tsconfig tsconfig.app.json scripts/collect-observations.ts
```

**출력 예시**:
```json
{
  "date": "2025-10-10",
  "collected_at": "2025-10-10T00:30:05Z",
  "city": "서울",
  "observations": {
    "openweather": {
      "temp": 18,
      "condition_main": "Clear",
      "humidity": 62,
      "observed_at": "2025-10-10T00:30:05Z"
    },
    "weatherapi": { ... },
    "openmeteo": { ... }
  }
}
```

---

### 3. weekly-analysis.js

**목적**: 최근 7일 데이터 기반 정확도 분석

**실행 시간**: 매주 월요일 01:00 UTC (한국 10:00)

**출력 파일**: `data/analysis/week-N.json`

**사용법**:
```bash
# 로컬 테스트 (최근 7일 데이터 필요)
npx tsx --tsconfig tsconfig.app.json scripts/weekly-analysis.ts

# AI 분석 포함 (Week 2부터)
export OPENAI_API_KEY="your_key"
npx tsx --tsconfig tsconfig.app.json scripts/weekly-analysis.ts
```

**출력 예시**:
```json
{
  "week": 1,
  "analysis_time": "2025-10-13T01:00:05Z",
  "period": {
    "start": "2025-10-06",
    "end": "2025-10-12",
    "days": 7
  },
  "rankings": [
    {
      "rank": 1,
      "provider": "openmeteo",
      "avg_overall_score": 87.5,
      "avg_temp_error": 1.2,
      "condition_match_rate": 85.7
    },
    { ... }
  ]
}
```

---

## 🚀 GitHub Actions 연동

각 스크립트는 GitHub Actions workflow에서 자동 실행됩니다:

### collect-predictions.yml
```yaml
- cron: '0 0 * * *'  # 매일 00:00 UTC
```

### collect-observations.yml
```yaml
- cron: '30 0 * * *'  # 매일 00:30 UTC
```

### weekly-analysis.yml
```yaml
- cron: '0 1 * * 1'  # 매주 월요일 01:00 UTC
```

---

## 🔑 환경 변수

스크립트 실행에 필요한 환경 변수:

| 변수명 | 필수 여부 | 설명 |
|--------|-----------|------|
| `OPENWEATHER_API_KEY` | 권장 | OpenWeatherMap API 키 |
| `WEATHERAPI_KEY` | 권장 | WeatherAPI.com API 키 |
| `OPENAI_API_KEY` | Week 2부터 | GPT-4o AI 분석용 (주간 분석) |

**GitHub Secrets 설정**:
1. Repository → Settings → Secrets and variables → Actions
2. "New repository secret" 클릭
3. 위 환경 변수 추가

---

## 📊 데이터 구조

```
data/
├── predictions/           # 예보 데이터
│   ├── 2025-10-09.json
│   ├── 2025-10-10.json
│   └── ...
├── observations/          # 관측 데이터
│   ├── 2025-10-09.json
│   ├── 2025-10-10.json
│   └── ...
└── analysis/              # 분석 결과
    ├── week-1.json
    ├── week-2.json
    └── ...
```

---

## 🧪 로컬 테스트

### 1. 환경 변수 설정
```bash
cd 02-weather-app
export OPENWEATHER_API_KEY="your_key"
export WEATHERAPI_KEY="your_key"
```

### 2. 예보 수집 테스트
```bash
npx tsx scripts/collect-predictions.ts
```

**예상 출력**:
```
=== Collecting Weather Predictions ===
Collection Time: 2025-10-09T01:23:45Z
Target Date: 2025-10-10
City: 서울

Collecting from openweather...
  ✅ Success: Clear, 22°C
Collecting from weatherapi...
  ✅ Success: Clear, 20°C
Collecting from openmeteo...
  ✅ Success: 맑음, 21°C

✅ Predictions saved: ../data/predictions/2025-10-10.json

Summary: 3/3 providers successful
```

### 3. 관측 수집 테스트
```bash
npx tsx scripts/collect-observations.ts
```

### 4. 분석 테스트 (7일 데이터 필요)
```bash
npx tsx scripts/weekly-analysis.ts
```

---

## ⚠️ 주의사항

### API 할당량
- **OpenWeatherMap**: 60 calls/minute (무료)
- **WeatherAPI**: 1,000,000 calls/month (무료)
- **Open-Meteo**: 무제한 (무료)

### 데이터 수집 실패 시
- 스크립트는 실패한 Provider를 건너뛰고 계속 진행
- `error` 필드에 에러 메시지 저장
- GitHub Actions 로그에서 확인 가능

### 로컬 테스트 시 주의
- `tsx`를 사용하여 TypeScript를 직접 실행
- API 키 없으면 Open-Meteo만 작동 (Mock Provider는 forecast 미지원)
- 테스트 데이터는 `.gitignore`에 추가 권장

---

## 📅 개발 로드맵

### Week 1-2 ✅
- [x] 기본 데이터 수집 스크립트
- [x] GitHub Actions 워크플로우
- [x] 통계 기반 분석
- [x] Forecast API 통합
- [x] Cross-environment storage (localStorage + Node.js)

### Week 3-4 ✅
- [x] Accuracy Dashboard UI 구현
- [x] 데이터 시각화 (SVG 차트)
- [x] Demo 모드 (2주 샘플 데이터)
- [x] Vue Router 설정

### 데이터 수집 현황

**첫 번째 수집**: 2025-10-14 ✅
- 예정: 00:00 UTC (09:00 KST)
- 실제: 00:42 UTC (42분 지연)
- 파일: `data/predictions/2025-10-14.json`
- 상태: 성공

**다음 마일스톤**:
- 7일 후: 첫 주간 분석 가능
- 30일 후: 전체 정확도 비교 완료

### 향후 개선 (선택)
- [ ] OpenAI GPT-4o AI 분석 연동
- [ ] 8개 도시로 확장
- [ ] 월간 리포트 자동 생성
- [ ] 실시간 모니터링 대시보드

---

**작성자**: Claude (AI)  
**작성일**: 2025-10-10  
**최종 업데이트**: 2025-10-14  
**버전**: 1.1
