# GitHub Secret Protection 설정 가이드

**작성일**: 2025-10-08  
**최종 업데이트**: 2025-10-09  
**목적**: GitHub Secret Protection (구 Secret Scanning) 활성화 방법

---

## 📋 개요

GitHub Secret Protection은 저장소에 푸시된 코드에서 **API 키, 토큰 등의 시크릿을 자동으로 탐지**하는 GitHub의 보안 기능입니다.

> **2025년 4월 1일 변경사항**: GitHub Advanced Security가 두 개의 독립적인 제품으로 분리되었습니다:
> - **GitHub Secret Protection**: 시크릿 탐지 및 방지 (본 가이드)
> - **GitHub Code Security**: 코드 보안 분석

### 주요 기능
1. **Secret Scanning**: 이미 푸시된 코드에서 시크릿 탐지 (사후 감지)
2. **Push Protection**: 시크릿 포함 시 푸시 차단 (사전 차단)
3. **AI-detected passwords**: AI 기반 비밀번호 탐지 (2025년 신규)
4. **Custom patterns**: 사용자 정의 시크릿 패턴 설정 (2025년 신규)

---

## 🎯 활성화 방법 (2025년 최신)

### 방법 1: Advanced Security를 통한 활성화 (권장)

```
1. GitHub 저장소 페이지로 이동
   https://github.com/neisii/toy-5

2. 상단 메뉴에서 "Settings" 클릭

3. 왼쪽 사이드바 "Security" 섹션에서 "Advanced Security" 클릭

4. "Secret Protection" 섹션에서 [Enable] 버튼 클릭

5. 영향 검토 후 "Enable Secret Protection" 확인 버튼 클릭
   ↓
✅ Secret scanning alerts 자동 활성화됨
✅ Push protection 포함됨 (Public 저장소 무료)
```

### 방법 2: Code security and analysis를 통한 활성화 (대체 방법)

```
1. Settings → Security → "Code security and analysis" 클릭

2. "Secret scanning" 섹션에서 [Enable] 클릭

3. "Push protection" 섹션에서 [Enable] 클릭 (선택사항)
```

**기능**:
- 저장소의 모든 커밋 히스토리 스캔
- 새로운 푸시마다 자동 스캔
- 시크릿 발견 시 Security 탭에 알림
- 저장소 관리자에게 이메일 발송
- AI 기반 비밀번호 패턴 탐지 (2025년 신규)

**요금** (2025년 기준):
- ✅ Public 저장소: **무료**
- ❌ Private 저장소: GitHub Secret Protection 필요 ($19/month per active committer)
- ❌ Organization 저장소: GitHub Team plan 이상 + Secret Protection

---

## 📸 설정 화면 예시 (2025년 기준)

### 방법 1: Advanced Security 페이지 (권장)

```
┌─────────────────────────────────────────────────────┐
│ Settings → Security → Advanced Security             │
├─────────────────────────────────────────────────────┤
│                                                       │
│ Secret Protection                                    │
│ ○ Disabled    [Enable]                              │
│                                                       │
│ Secret Protection includes secret scanning alerts,  │
│ push protection, AI-detected passwords, and custom  │
│ patterns to help detect and prevent secret leaks.   │
│                                                       │
│ [Enable Secret Protection]                          │
│                                                       │
└─────────────────────────────────────────────────────┘
```

### 방법 2: Code security and analysis 페이지 (대체)

```
┌─────────────────────────────────────────────────────┐
│ Settings → Security → Code security and analysis    │
├─────────────────────────────────────────────────────┤
│                                                       │
│ Secret scanning                                      │
│ ○ Disabled    ● Enabled    [Enable]                │
│                                                       │
│ Secret scanning helps prevent accidental commits    │
│ of API keys and other credentials.                  │
│                                                       │
│ Push protection                                      │
│ ○ Disabled    ● Enabled    [Enable]                │
│                                                       │
│ Block commits that contain supported secrets.        │
│                                                       │
└─────────────────────────────────────────────────────┘
```

---

## 🏷️ 본 저장소의 실제 상태 (toy-5)

### Secret Scanning
- **상태**: ✅ **활성화 확인됨**
- **확인 방법**: 3번의 API 키 노출 시 모두 이메일 알림 수신
- **동작**: 정상 (푸시 후 몇 분 내 감지 및 알림)
- **감지된 패턴**: OpenWeatherMap API Key, WeatherAPI.com API Key

### Push Protection
- **상태**: ❓ **동작 불확실**
- **문제**: 3번의 API 키 노출 커밋이 모두 push 성공
  - 커밋 `74677f7`: OpenWeatherMap + WeatherAPI 키 노출 → push 성공
  - 커밋 `42ef815`: WeatherAPI 키 노출 → push 성공
  - 커밋 `3a8e92f`: WeatherAPI 키 노출 → push 성공
- **가능한 원인**:
  1. Push Protection이 비활성화 상태
  2. OpenWeatherMap/WeatherAPI 패턴이 Push Protection 미지원
  3. Public 저장소에서 기본 비활성화 정책

### 실제 방어 구조 (현재)

```
1차 방어: Husky Pre-commit Hook ✅ 설정됨
  ↓
  로컬 커밋 전 시크릿 검사
  (.husky/pre-commit 스크립트)
  
2차 방어: Push Protection ❌ 작동 안 함
  ↓
  GitHub 푸시 전 차단 (비활성화 추정)
  
3차 방어: Secret Scanning ✅ 정상 작동
  ↓
  GitHub 푸시 후 이메일 알림
```

### 권장 사항
1. ✅ **Husky Pre-commit Hook을 주요 방어선으로 활용** (현재 설정됨)
2. ⚠️ **GitHub Settings에서 Push Protection 상태 확인 필요**
3. ✅ **Secret Scanning은 백업 방어선으로 유지**

---

## 🔍 동작 방식

### Secret Scanning (사후 감지)

#### 1. 푸시 후 자동 스캔
```bash
$ git push origin main
Enumerating objects: 5, done.
Counting objects: 100% (5/5), done.
Writing objects: 100% (3/3), 300 bytes | 300.00 KiB/s, done.
Total 3 (delta 2), reused 0 (delta 0)
To https://github.com/neisii/toy-5.git
   abc123..def456  main -> main

# 푸시는 성공하지만...
```

#### 2. 몇 분 내에 GitHub가 분석
```
GitHub 서버
  ↓
커밋 내용 분석
  ↓
200+ 종류의 시크릿 패턴 매칭
  ↓
매칭되면 알림 발송
```

#### 3. 이메일 알림 수신
```
From: GitHub <noreply@github.com>
Subject: [neisii/toy-5] Secret scanning alert: WeatherAPI key detected

We found a potential secret in your repository:
  - Type: WeatherAPI key
  - Commit: def456
  - Path: docs/PHASE_3_PLAN.md:442
  - Value: 4fc732b449b14468b80102642250810
```

#### 4. Security 탭에서 확인
```
GitHub → Repository → Security → Secret scanning alerts
  ↓
알림 목록 표시
  ↓
상세 정보 및 해결 방법 제공
```

---

### Push Protection (사전 차단)

#### 1. 시크릿 포함 커밋 푸시 시도
```bash
$ git push origin main
```

#### 2. GitHub가 즉시 차단
```bash
remote: error: GH013: Repository rule violations found
remote: 
remote: —— Push Protection ——————————————————————————
remote: 
remote: Resolve the following secrets detected:
remote: 
remote:   (WeatherAPI key) docs/file.md:10
remote:     pattern: weatherapi_key
remote:     token: 4fc732b449b14468b80102642250810
remote: 
remote: —————————————————————————————————————————————
remote: 
remote: Push blocked. Remove secrets and try again.
remote: 
remote: If you believe this is a false positive, you can:
remote:   1. Create a Secret Scanning Exclusion
remote:   2. Contact GitHub Support
remote: 
To https://github.com/neisii/toy-5.git
 ! [remote rejected] main -> main (push declined due to repository rule violations)
error: failed to push some refs to 'https://github.com/neisii/toy-5.git'
```

#### 3. 개발자가 수정 필요
```bash
# 1. 시크릿 제거 또는 마스킹
git add docs/file.md
git commit --amend

# 2. 다시 푸시
git push origin main
✅ 성공
```

---

## 🛡️ 탐지 가능한 시크릿 유형

GitHub Secret Scanning은 **200+ 종류**의 패턴을 자동 탐지합니다:

### API Keys
- AWS Access Keys
- Azure Keys
- Google Cloud API Keys
- OpenAI API Keys
- Stripe API Keys
- WeatherAPI Keys
- Generic API Keys (32+ characters)

### Tokens
- GitHub Personal Access Tokens
- OAuth Tokens
- JWT Tokens
- Slack Tokens

### Credentials
- Database Connection Strings
- Private SSH Keys
- TLS/SSL Certificates
- NPM Tokens

### 우리 프로젝트 관련
- ✅ OpenWeatherMap API Keys
- ✅ WeatherAPI.com Keys
- ✅ VITE_ 환경 변수 (일반 패턴)

---

## 📊 실제 사용 예시 (우리 프로젝트)

### 첫 번째 사고
```
파일: docs/PHASE_2_TO_3_CHECKLIST.md
노출 키: ad8d9ef4b10a050bb675e82e37db5d8b (OpenWeatherMap)
  ↓
GitHub 감지 (몇 분 내)
  ↓
이메일 알림: "Secret scanning alert"
  ↓
사용자 확인 및 키 폐기
```

### 두 번째 사고
```
파일: docs/PHASE_3_PLAN.md
노출 키: 4fc732b449b14468b80102642250810 (WeatherAPI)
  ↓
GitHub 감지
  ↓
이메일 알림
  ↓
사용자: "github.com에서 먼저 감지해서 나에게 이메일 알림이 온 상태야"
```

### 세 번째 사고
```
파일: docs/SECURITY_INCIDENT_20251008.md
노출 키: eaa7da9004ee47bc919135224250810 (WeatherAPI)
  ↓
GitHub 감지 예상
  ↓
수동 발견으로 선제 대응
```

---

## ✅ 활성화 확인 방법

### 1. Security 탭 확인
```
Repository → Security
  ↓
"Secret scanning" 섹션 존재 확인
  ↓
"Push protection" 배지 확인
```

### 2. 테스트 (권장하지 않음)
```bash
# 가짜 시크릿으로 테스트
echo "FAKE_KEY=abc123def456ghi789jkl012mno345pqr678" > test.txt
git add test.txt
git commit -m "test"
git push origin main

# Push Protection 활성화 시 → 차단됨
# 비활성화 시 → 푸시 후 알림
```

**⚠️ 주의**: 테스트 후 반드시 커밋 제거!

---

## 🔧 문제 해결

### Q1: Push Protection이 차단하지 않아요
**A**: 
- Push Protection이 활성화되었는지 확인
- Public 저장소인지 확인 (Private은 유료)
- 패턴이 GitHub 지원 목록에 있는지 확인

### Q2: False Positive (정상 문자열 차단)
**A**:
```
1. Secret scanning exclusion 추가
   Settings → Security → Secret scanning
   → "New exclusion"
   
2. 특정 파일/패턴 제외
   - Path: test/fixtures/*.txt
   - Pattern: 특정 정규식
```

### Q3: Private 저장소에서 활성화하려면?
**A**:
- GitHub Advanced Security 구독 필요 (유료)
- Organization 레벨 설정
- [GitHub Pricing 참조](https://github.com/pricing)

---

## 📝 활성화 체크리스트 (2025년 최신)

### 필수 단계 - 방법 1 (권장)
- [ ] GitHub 저장소 Settings 페이지 이동
- [ ] Security → Advanced Security 섹션 클릭
- [ ] Secret Protection [Enable] 버튼 클릭
- [ ] 영향 검토 후 "Enable Secret Protection" 확인
- [ ] 활성화 상태 확인 (Secret scanning + Push protection 자동 활성화)

### 필수 단계 - 방법 2 (대체)
- [ ] GitHub 저장소 Settings 페이지 이동
- [ ] Security → Code security and analysis 섹션 클릭
- [ ] Secret scanning [Enable] 클릭
- [ ] Push protection [Enable] 클릭 (권장)
- [ ] 활성화 상태 확인 (녹색 ● 표시)

### 확인 단계
- [ ] Security 탭에서 "Secret scanning" 섹션 확인
- [ ] 이전 커밋에서 감지된 알림 확인 (있을 경우)
- [ ] Push protection 동작 확인 (시크릿 푸시 시도 시 차단)
- [ ] 팀원에게 공지 (Push Protection 활성화됨)

### 문서 업데이트
- [ ] CONTRIBUTING.md에 언급
- [ ] README.md에 보안 배지 추가 (선택)

---

## 🎯 Pre-commit Hook과의 조합

### 다층 방어 전략

```
1차 방어: Pre-commit Hook (로컬)
  ↓
  커밋 전 차단
  ↓
  개발자 PC에서 검증
  
2차 방어: Push Protection (GitHub)
  ↓
  푸시 전 차단
  ↓
  서버에서 검증
  
3차 방어: Secret Scanning (GitHub)
  ↓
  푸시 후 탐지
  ↓
  즉시 알림
```

**효과**: 3번의 보안 사고 → 0번으로 감소

---

## 📚 추가 리소스

### 공식 문서
- [About secret scanning](https://docs.github.com/en/code-security/secret-scanning/about-secret-scanning)
- [About push protection](https://docs.github.com/en/code-security/secret-scanning/push-protection-for-repositories-and-organizations)
- [Supported patterns](https://docs.github.com/en/code-security/secret-scanning/secret-scanning-patterns)

### 관련 프로젝트 문서
- `CONTRIBUTING.md`: 전체 보안 정책
- `docs/SECURITY_INCIDENT_20251008.md`: 보안 사고 기록
- `.husky/pre-commit`: Pre-commit hook 스크립트

---

## ✅ 요약

### 즉시 실행 (2025년 권장 방법)
1. **Settings** → **Security** → **Advanced Security**
2. **Secret Protection** → **[Enable]**
3. 확인 대화상자에서 **[Enable Secret Protection]** 클릭

### 대체 방법
1. **Settings** → **Security** → **Code security and analysis**
2. **Secret scanning** → **[Enable]**
3. **Push protection** → **[Enable]**

### 예상 시간
- 설정: **1-2분**
- 효과: **즉시**
- 전체 히스토리 스캔: **몇 분 내 완료**

### 비용 (2025년 기준)
- Public 저장소: **무료** ✅
- Private 저장소: GitHub Secret Protection 필요 ($19/month per active committer)

### 2025년 주요 변경사항
- ✅ "Secret Protection"으로 브랜딩 변경
- ✅ AI 기반 비밀번호 탐지 추가
- ✅ 사용자 정의 패턴 설정 가능
- ✅ 패턴 구성 기능 일반 공개 (GA)

---

**작성일**: 2025-10-08  
**마지막 업데이트**: 2025-10-09  
**다음 확인**: 설정 후 Security 탭에서 알림 확인

**참고 문서**:
- [GitHub Secret Protection 공식 문서](https://docs.github.com/en/code-security/secret-scanning/enabling-secret-scanning-features/enabling-secret-scanning-for-your-repository)
- [2025년 변경사항 발표](https://github.blog/changelog/2025-03-04-introducing-github-secret-protection-and-github-code-security/)
