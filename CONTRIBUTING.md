# Contributing to Weather App

**작성일**: 2025-10-08  
**목적**: 프로젝트 기여자를 위한 가이드라인

---

## 📋 목차

1. [시작하기](#시작하기)
2. [개발 환경 설정](#개발-환경-설정)
3. [🔒 보안 정책 (필수)](#-보안-정책-필수)
4. [코드 스타일](#코드-스타일)
5. [커밋 가이드라인](#커밋-가이드라인)
6. [Pull Request 프로세스](#pull-request-프로세스)

---

## 시작하기

### 프로젝트 클론

```bash
git clone https://github.com/neisii/toy-5.git
cd toy-5/02-weather-app
```

---

## 개발 환경 설정

### 1. 의존성 설치

```bash
npm install
```

**중요**: `npm install` 실행 시 Husky가 자동으로 설정됩니다.

### 2. 환경 변수 설정

```bash
# .env.example을 복사하여 .env 생성
cp .env.example .env

# API 키 입력 (실제 키 필요)
# VITE_OPENWEATHER_API_KEY=your_openweathermap_api_key_here
# VITE_WEATHERAPI_API_KEY=your_weatherapi_api_key_here
```

**⚠️ 중요**: `.env` 파일은 **절대로 커밋하지 마세요**! (`.gitignore`에 이미 포함됨)

### 3. 개발 서버 실행

```bash
npm run dev
```

---

## 🔒 보안 정책 (필수)

### ⚠️ API 키 및 시크릿 관리 규칙

이 프로젝트는 **3번의 API 키 노출 사고**를 경험했습니다. 
다음 규칙을 **반드시** 준수해야 합니다.

#### Rule 1: API 키는 .env에만 저장

```bash
✅ 올바른 방법:
.env 파일에만 실제 API 키 저장
→ Git에 커밋되지 않음 (.gitignore에 포함)

❌ 잘못된 방법:
문서 파일(*.md, *.txt)에 실제 API 키 작성
코드 파일에 하드코딩
```

#### Rule 2: 문서에는 항상 마스킹 형식 사용

```markdown
✅ 올바른 예시:
VITE_OPENWEATHER_API_KEY=6ee1**********************f9552e
(실제 키는 .env 파일 참조)

❌ 잘못된 예시:
VITE_OPENWEATHER_API_KEY=6ee11a75c5db9be7153ef7d5a1f9552e
```

**마스킹 형식**: 앞 4자 + 별표 22개 + 뒤 6자
```
원본: 6ee11a75c5db9be7153ef7d5a1f9552e (32자)
마스킹: 6ee1**********************f9552e
```

#### Rule 3: Pre-commit Hook 자동 검사

모든 커밋 전에 자동으로 실행됩니다:

```bash
$ git commit -m "Update documentation"

🔍 Scanning staged files for exposed secrets...

❌ ERROR: Potential secrets detected!
⚠️  VITE_ environment variables with values detected:
+VITE_API_KEY=abc123def456...

🔒 Security Policy:
  - API keys must ONLY be in .env file
  - Documentation must use masked format
```

**커밋이 차단되면**:
1. 노출된 API 키 확인
2. 마스킹 형식으로 변경 또는 제거
3. 다시 커밋 시도

#### Rule 4: 우회 방법 (권장하지 않음)

```bash
# Hook을 건너뛰는 방법 (긴급 상황에만)
git commit --no-verify -m "..."

⚠️ 주의: 이 방법은 보안 검사를 우회합니다.
GitHub Secret Scanning이 감지하면 즉시 알림이 옵니다.
```

---

## 🛡️ 보안 자동화 시스템

### 1. Pre-commit Hook (Husky)

**위치**: `.husky/pre-commit`

**검사 항목**:
- 32자 이상 영숫자 문자열
- `VITE_`로 시작하는 환경변수 (값 포함)
- API key, secret, token 등의 키워드

**동작**:
```
git add file.md
git commit -m "..."
  ↓
🔍 Pre-commit hook 실행
  ↓
의심스러운 패턴 발견 시 → ❌ 커밋 차단
패턴 없으면 → ✅ 커밋 진행
```

### 2. GitHub Secret Scanning

**설정 위치**: Repository Settings → Security → Code security and analysis

**기능**:
- 푸시된 코드에서 200+ 종류의 시크릿 패턴 자동 탐지
- 실시간 알림 (이메일)
- Push Protection 활성화 시 푸시 차단

**활성화 방법**:
```
1. GitHub 저장소 페이지
2. Settings → Security
3. "Secret scanning" → Enable
4. "Push protection" → Enable (권장)
```

---

## 📝 보안 체크리스트

커밋 전 다음을 확인하세요:

### 일반 커밋
- [ ] `.env` 파일이 staged 되지 않았는지 확인
- [ ] 문서에 API 키가 마스킹되었는지 확인
- [ ] Pre-commit hook 통과 확인

### API 키 관련 작업 시
- [ ] `.env` 파일에만 실제 키 저장
- [ ] 문서에는 마스킹 형식 사용
- [ ] "실제 키는 .env 파일 참조" 노트 추가
- [ ] `git diff --cached` 로 staged 파일 재확인

### 문서 작성 시
- [ ] API 키, 토큰, 시크릿 등의 단어 주변 확인
- [ ] 32자 이상의 영숫자 문자열이 있는지 확인
- [ ] 코드 예시에 플레이스홀더 사용 (`<your_api_key>`)

---

## 코드 스타일

### TypeScript

```typescript
// ✅ 명확한 타입 정의
interface WeatherData {
  temperature: number;
  humidity: number;
}

// ✅ async/await 사용
async function fetchWeather(): Promise<WeatherData> {
  const response = await axios.get('/api/weather');
  return response.data;
}
```

### Vue 3 Composition API

```vue
<script setup lang="ts">
import { ref, computed } from 'vue';

// ✅ setup 함수 사용
const count = ref(0);
const doubled = computed(() => count.value * 2);
</script>
```

### 파일 구조

```
src/
├── adapters/       # External API adapters
├── components/     # Vue components
├── services/       # Business logic
├── stores/         # Pinia stores
├── types/          # TypeScript types
└── config/         # Configuration
```

---

## 커밋 가이드라인

### 커밋 메시지 형식

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type

- `feat`: 새로운 기능
- `fix`: 버그 수정
- `docs`: 문서 변경
- `style`: 코드 포맷팅 (기능 변경 없음)
- `refactor`: 리팩토링
- `test`: 테스트 추가/수정
- `chore`: 빌드, 설정 등
- `security`: 보안 관련 (API 키, 취약점 등)

### 예시

```bash
feat(weather-app): Add WeatherAPI.com adapter

- Implement monthly quota tracking
- Add condition code mapping
- Handle API errors (401, 403, 429)

Closes #123
```

```bash
security(weather-app): Mask API keys in documentation

SECURITY: API keys were exposed in PHASE_3_PLAN.md
- Masked WeatherAPI key
- Added .gitignore for session-context files
- Updated security incident report

Ref: SECURITY_INCIDENT_20251008.md
```

---

## Pull Request 프로세스

### 1. 브랜치 생성

```bash
git checkout -b feature/add-new-provider
```

### 2. 작업 및 커밋

```bash
git add .
git commit -m "feat: Add new weather provider"
```

### 3. Push 및 PR 생성

```bash
git push origin feature/add-new-provider
```

### 4. PR 체크리스트

- [ ] Pre-commit hook 통과
- [ ] 빌드 성공 (`npm run build`)
- [ ] TypeScript 컴파일 에러 없음
- [ ] 테스트 통과 (있는 경우)
- [ ] **보안 검사 통과** (API 키 노출 없음)
- [ ] 문서 업데이트 (필요 시)

---

## 🚨 보안 사고 발생 시

### API 키가 실수로 커밋된 경우

#### 즉시 조치
1. **키 폐기**: 즉시 해당 API 키 비활성화
2. **새 키 발급**: 새로운 API 키 생성
3. **문서 마스킹**: 커밋된 문서의 키를 마스킹 형식으로 변경
4. **보안 사고 보고**: `docs/SECURITY_INCIDENT_YYYYMMDD.md` 작성

#### 예시
```bash
# 1. 마스킹 커밋
git add docs/file.md
git commit -m "security: Mask exposed API key in documentation"

# 2. .env 업데이트 (새 키)
echo "VITE_API_KEY=new_key_here" >> .env

# 3. 보안 사고 문서 작성
# docs/SECURITY_INCIDENT_20251008.md 참조
```

### 참고 문서
- `docs/SECURITY_INCIDENT_20251008.md`: 3번의 API 키 노출 사고 상세 기록
- 발생 원인, 대응 방법, 예방 조치 포함

---

## 📚 추가 리소스

### 문서
- `README.md`: 프로젝트 개요
- `docs/REFACTORING_PLAN.md`: 리팩토링 계획
- `docs/PHASE_*_SUMMARY.md`: 각 Phase 완료 요약
- `docs/FUTURE_IMPROVEMENTS.md`: 개선 과제

### 보안 관련
- `docs/SECURITY_INCIDENT_20251008.md`: 보안 사고 기록
- `.husky/pre-commit`: Pre-commit hook 스크립트
- `.gitignore`: Git 제외 패턴

---

## ❓ 질문이 있나요?

### GitHub Issues
- 버그 리포트: [Bug Report Template]
- 기능 제안: [Feature Request Template]
- 보안 이슈: **Private하게 maintainer에게 연락**

### 연락처
- GitHub: [@neisii](https://github.com/neisii)
- Repository: [toy-5](https://github.com/neisii/toy-5)

---

## 🙏 감사합니다!

이 프로젝트에 기여해 주셔서 감사합니다.
보안 정책을 준수하여 안전한 개발 환경을 함께 만들어갑시다!

---

## 🎯 현재 프로젝트 상태

### Phase 6 완료 (2025-10-13)
- ✅ Weather Accuracy Tracking System 구현 완료
- ✅ GitHub Actions 자동 데이터 수집
- ✅ Accuracy Dashboard UI
- ✅ 첫 데이터 수집 성공 (2025-10-14)

### 다음 단계
- 30일간 자동 데이터 수집 대기 중
- 7일 후 첫 주간 분석 가능
- 향후 개선사항은 `docs/FUTURE_FEATURES.md` 참조

---

**마지막 업데이트**: 2025-10-14  
**버전**: 1.1.0
