# macOS Sleep Mode & Local Server Analysis

**작성일**: 2025-10-09  
**목적**: 맥북 Hibernate/Sleep 모드에서 로컬 서버 동작 가능성 조사

---

## 🔍 핵심 질문

**사용자 환경**:
- 맥북에서 개발 중
- 로컬 서버(Node.js 등) 운영
- 맥북을 Hibernate(절전 모드) 사용 - 덮개만 덮어둠
- 매일 자정에 날씨 데이터 수집이 필요함

**질문**: 맥북이 Sleep 상태일 때 로컬 서버가 동작할 수 있는가?

---

## ❌ 결론: Sleep 중엔 서버 동작 불가

### 기술적 제약 사항

#### 1. Cron Jobs
```
❌ Sleep 중 실행 안 됨
❌ Wake 후에도 놓친 작업 자동 실행 안 됨
❌ 맥북이 자정에 잠들어 있으면 데이터 수집 실패
```

**출처**: 
- [crontab to wake osx from sleep - Super User](https://superuser.com/questions/14836/crontab-to-wake-osx-from-sleep)
- "Cron doesn't execute while the computer is asleep"

#### 2. launchd (macOS 권장 방식)
```
✅ Sleep 중 놓친 작업을 Wake 시 1회 실행 (StartCalendarInterval 사용 시)
⚠️ 여러 번 놓쳐도 1번만 실행 (이벤트 coalescing)
⚠️ "Dark Wake" (Power Nap)에선 실행 안 됨 - 사용자가 직접 깨워야 함
❌ Shutdown(전원 꺼짐) 상태에선 실행 안 됨
```

**출처**:
- [Is launchd supposed to pick up "missed" events? - Super User](https://superuser.com/questions/542639/is-launchd-supposed-to-pick-up-missed-events)
- "launchd will start the job the next time the computer wakes up"

**launchd 예시**:
```xml
<!-- ~/Library/LaunchAgents/com.weather.datacollector.plist -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.weather.datacollector</string>
    
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/node</string>
        <string>/path/to/weather-app/scripts/collect-daily-weather.js</string>
    </array>
    
    <key>StartCalendarInterval</key>
    <dict>
        <key>Hour</key>
        <integer>0</integer>
        <key>Minute</key>
        <integer>0</integer>
    </dict>
    
    <key>RunAtLoad</key>
    <false/>
</dict>
</plist>
```

**등록 방법**:
```bash
# plist 파일을 LaunchAgents 디렉토리에 저장
launchctl load ~/Library/LaunchAgents/com.weather.datacollector.plist

# 활성화
launchctl start com.weather.datacollector
```

**동작 방식**:
```
자정(00:00)이 되었을 때:
- 맥북이 깨어있음: ✅ 즉시 실행
- 맥북이 Sleep 상태: ❌ 실행 안 됨
  → 사용자가 오전 9시에 맥북을 깨움
  → ✅ launchd가 자정에 놓친 작업을 오전 9시에 1회 실행
```

---

## 🛠️ 해결 방안

### Option 1: pmset으로 자동 Wake 설정 (권장)

**개념**: 맥북을 자정에 자동으로 깨워서 작업 실행 후 다시 Sleep

```bash
# 매일 자정(00:00)에 맥북 자동 Wake
sudo pmset repeat wake MTWRFSU 00:00:00

# 현재 설정 확인
pmset -g sched

# 설정 삭제
sudo pmset repeat cancel
```

**장점**:
- ✅ 정확한 시간(자정)에 데이터 수집 가능
- ✅ 사용자 개입 불필요
- ✅ launchd와 조합하면 완벽한 자동화

**단점**:
- ⚠️ 맥북이 자정에 깨어남 (배터리 소모)
- ⚠️ 디스플레이는 꺼진 채로 깨어남 (어두운 방에서도 괜찮음)
- ⚠️ 전원이 완전히 꺼지면(shutdown) 작동 안 함

**추천 설정**:
```bash
# Step 1: 자정에 Wake
sudo pmset repeat wake MTWRFSU 00:00:00

# Step 2: 5분 후 다시 Sleep (옵션)
sudo pmset repeat sleep MTWRFSU 00:05:00

# Step 3: launchd로 자정에 스크립트 실행
# (위의 launchd 설정 사용)
```

---

### Option 2: 맥북을 항상 깨어있게 유지

**방법 1: caffeinate 명령어**
```bash
# 특정 시간 동안 깨어있기 (초 단위)
caffeinate -t 3600  # 1시간

# 특정 프로세스가 실행되는 동안 깨어있기
caffeinate -i node server.js

# 무한정 깨어있기 (Ctrl+C로 중단)
caffeinate
```

**방법 2: 시스템 설정 변경**
```bash
# 디스플레이 꺼짐 방지 (AC 전원 연결 시)
sudo pmset -c displaysleep 0

# 시스템 Sleep 방지 (AC 전원 연결 시)
sudo pmset -c sleep 0

# 배터리 사용 시에도 Sleep 방지 (권장하지 않음)
sudo pmset -b sleep 0
```

**방법 3: 서드파티 앱**
- [Amphetamine](https://apps.apple.com/us/app/amphetamine/id937984704) (무료, Mac App Store)
- [Caffeinated](https://caffeinated.app/) (무료)
- 특정 시간대에만 깨어있도록 스케줄링 가능

**장점**:
- ✅ 데이터 수집 100% 보장
- ✅ 복잡한 설정 불필요

**단점**:
- ❌ 배터리 소모 증가
- ❌ 맥북이 항상 뜨거워짐
- ❌ 전력 낭비

---

### Option 3: Wake 시 누락 데이터 보충 (권장 - 사용 패턴에 맞음)

**개념**: 사용자가 맥북을 깨울 때 "놓친 날짜"를 자동 감지하여 소급 수집

```typescript
// services/accuracy/DataCollector.ts

export class DataCollector {
  async checkAndCollectMissedDates(): Promise<void> {
    // 1. 마지막 수집 날짜 확인
    const lastCollectedDate = await this.getLastCollectedDate();
    const today = new Date();
    
    // 2. 놓친 날짜 계산
    const missedDates = this.calculateMissedDates(lastCollectedDate, today);
    
    if (missedDates.length === 0) {
      console.log('✅ No missed dates');
      return;
    }
    
    console.log(`⚠️ Found ${missedDates.length} missed dates: ${missedDates.join(', ')}`);
    
    // 3. 각 날짜의 데이터 소급 수집
    for (const date of missedDates) {
      await this.collectDataForDate(date);
      console.log(`✅ Collected data for ${date}`);
    }
  }
  
  private calculateMissedDates(lastDate: Date, today: Date): string[] {
    const missed: string[] = [];
    const current = new Date(lastDate);
    current.setDate(current.getDate() + 1);
    
    while (current < today) {
      missed.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }
    
    return missed;
  }
  
  private async collectDataForDate(dateStr: string): Promise<void> {
    // 해당 날짜의 "현재 날씨"를 수집
    // 주의: 과거 데이터는 현재 API로 조회 불가
    // → 대안: Forecast API에서 해당 날짜의 예보를 조회 (가능하면)
    
    // 또는: 사용자에게 "X일 데이터 없음" 경고 표시
  }
}
```

**앱 시작 시 자동 실행**:
```typescript
// src/main.ts

import { DataCollector } from '@/services/accuracy/DataCollector';

async function initApp() {
  const collector = new DataCollector();
  
  // 앱 시작 시 누락 데이터 확인
  await collector.checkAndCollectMissedDates();
  
  // Vue 앱 초기화
  const app = createApp(App);
  app.mount('#app');
}

initApp();
```

**장점**:
- ✅ 사용자의 실제 사용 패턴에 맞음 (맥북 열 때 자동 보충)
- ✅ 배터리 소모 없음
- ✅ pmset 설정 불필요

**단점**:
- ⚠️ "실제 날씨" 데이터는 과거로 소급 조회 불가능
  - 대부분의 API는 과거 데이터 조회 시 유료 (Historical API)
  - 무료 API는 현재 + 예보만 제공
- ⚠️ 예보 데이터만 소급 수집 가능 (정확도 계산은 나중에)

---

### Option 4: 외부 서버 활용 (장기 운영 시)

**개념**: 
- 맥북 로컬 서버 대신 24/7 운영되는 외부 서버 사용
- AWS, DigitalOcean, Vercel 등

**장점**:
- ✅ 100% 안정적인 데이터 수집
- ✅ 맥북 상태와 무관

**단점**:
- ❌ 월 비용 발생 ($5-20)
- ❌ 인프라 관리 필요

---

## 📊 방안 비교표

| 방안 | 정확성 | 사용 편의성 | 배터리 영향 | 설정 복잡도 | 비용 |
|------|--------|-------------|-------------|-------------|------|
| **Option 1: pmset Wake** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ (약간) | ⭐⭐⭐⭐ | 무료 |
| **Option 2: 항상 깨어있기** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐ (심각) | ⭐⭐⭐⭐⭐ | 무료 |
| **Option 3: 누락 데이터 보충** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 무료 |
| **Option 4: 외부 서버** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ | $5-20/월 |

---

## 🎯 사용자 상황별 추천

### 시나리오 1: 매일 맥북을 사용하는 경우 (현재 상황)

**추천**: **Option 1 (pmset Wake) + launchd**

```bash
# 1단계: 매일 자정에 맥북 자동 Wake
sudo pmset repeat wake MTWRFSU 00:00:00

# 2단계: launchd로 자정에 스크립트 실행
launchctl load ~/Library/LaunchAgents/com.weather.datacollector.plist

# 3단계: 5분 후 다시 Sleep (선택사항)
sudo pmset repeat sleep MTWRFSU 00:05:00
```

**예상 시나리오**:
```
23:50 - 사용자가 맥북 덮개를 덮음 (Sleep)
00:00 - pmset이 맥북을 자동으로 깨움 (디스플레이는 꺼진 채)
00:00 - launchd가 데이터 수집 스크립트 실행
00:02 - 스크립트 완료
00:05 - pmset이 맥북을 다시 Sleep 상태로 전환
09:00 - 사용자가 맥북 열면 정상적으로 사용
```

**배터리 영향**: 자정 전후 5분간만 깨어있음 → 미미함

---

### 시나리오 2: PoC 단계 (빠른 검증)

**추천**: **Option 3 (누락 데이터 보충) + 수동 실행**

- 첫 30일은 수동으로 앱을 열어 데이터 확인
- 앱 시작 시 자동으로 누락 데이터 감지 및 보충
- PoC 검증 후 Option 1 또는 4로 전환

---

### 시나리오 3: 장기 운영 (실제 서비스)

**추천**: **Option 4 (외부 서버)**

- AWS EC2 t4g.nano ($3-5/월) 또는 Vercel Cron Jobs (무료)
- 24/7 안정적인 데이터 수집
- 여러 사용자와 데이터 공유 가능

---

## ⚠️ 중요 제약 사항

### 1. 과거 데이터 조회 불가

대부분의 무료 날씨 API는 **현재 + 미래 예보**만 제공:
- OpenWeatherMap: Historical API는 유료
- WeatherAPI.com: History API는 유료 (Developer plan 이상)
- Open-Meteo: 과거 데이터 조회 가능 ✅ (단, Historical Weather API 사용 필요)

**결론**: 
- 자정에 데이터를 수집하지 못하면 그날의 "실제 날씨"를 나중에 조회할 수 없음
- **Option 3 (누락 데이터 보충)은 예보 데이터만 소급 가능, 실제 날씨는 불가**

---

### 2. Dark Wake (Power Nap) 제한

macOS의 "Power Nap" 기능:
- 디스플레이를 끈 채로 백그라운드 작업 수행
- **하지만 launchd 작업은 실행 안 됨**

**해결**: pmset Wake를 사용하면 "Full Wake"가 되어 launchd 실행 가능

---

## 🛠️ 구현 가이드

### Step 1: launchd 설정

```bash
# 1. plist 파일 생성
cat > ~/Library/LaunchAgents/com.weather.datacollector.plist << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.weather.datacollector</string>
    
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/node</string>
        <string>/Users/YOUR_USERNAME/Development/playwright-project/02-weather-app/scripts/collect-daily-weather.js</string>
    </array>
    
    <key>StartCalendarInterval</key>
    <dict>
        <key>Hour</key>
        <integer>0</integer>
        <key>Minute</key>
        <integer>0</integer>
    </dict>
    
    <key>StandardOutPath</key>
    <string>/tmp/weather-collector.log</string>
    
    <key>StandardErrorPath</key>
    <string>/tmp/weather-collector-error.log</string>
</dict>
</plist>
EOF

# 2. 권한 설정
chmod 644 ~/Library/LaunchAgents/com.weather.datacollector.plist

# 3. launchd 등록
launchctl load ~/Library/LaunchAgents/com.weather.datacollector.plist

# 4. 즉시 테스트 실행
launchctl start com.weather.datacollector

# 5. 로그 확인
tail -f /tmp/weather-collector.log
```

---

### Step 2: pmset Wake 설정

```bash
# 매일 자정에 맥북 자동 Wake
sudo pmset repeat wake MTWRFSU 00:00:00

# 설정 확인
pmset -g sched

# 출력 예시:
# Scheduled power events:
# wake at 1/1/25 0:00:00 every day
```

---

### Step 3: 데이터 수집 스크립트 작성

```javascript
// scripts/collect-daily-weather.js

const { WeatherService } = require('../dist/services/weather/WeatherService');
const { saveToIndexedDB } = require('../dist/services/database/WeatherDB');

async function main() {
  console.log(`[${new Date().toISOString()}] Starting daily weather collection...`);
  
  try {
    const weatherService = new WeatherService(/* config */);
    const city = '서울';
    
    // 각 Provider에서 내일 예보 수집
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const predictions = await Promise.all([
      weatherService.getForecast('openweather', city),
      weatherService.getForecast('weatherapi', city),
      weatherService.getForecast('openmeteo', city)
    ]);
    
    // IndexedDB에 저장
    for (const prediction of predictions) {
      await saveToIndexedDB('predictions', {
        city,
        provider: prediction.provider,
        target_date: tomorrow.toISOString().split('T')[0],
        predicted_at: new Date().toISOString(),
        data: prediction
      });
    }
    
    console.log(`[${new Date().toISOString()}] ✅ Collection completed`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Error:`, error);
    process.exit(1);
  }
}

main();
```

---

## 📝 최종 권장 사항

### Phase 6 (PoC) - 4주간

**선택**: **Option 1 (pmset + launchd)**

**이유**:
1. ✅ 정확한 시간에 데이터 수집 가능
2. ✅ 사용자 개입 최소화
3. ✅ 배터리 영향 미미 (자정 5분만 깨어있음)
4. ✅ 무료
5. ✅ 설정 간단 (2개 명령어)

**설정 시간**: 10분

---

### Phase 7 (장기 운영) - PoC 성공 시

**선택**: **Option 4 (외부 서버)**

**이유**:
1. ✅ 100% 안정성
2. ✅ 여러 도시 확장 용이
3. ✅ 데이터 공유 가능
4. ✅ 맥북 상태와 무관

**예상 비용**: $3-5/월 (AWS EC2 t4g.nano)

---

**작성자**: Claude (AI)  
**작성일**: 2025-10-09  
**버전**: 1.0
