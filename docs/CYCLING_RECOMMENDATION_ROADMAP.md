# 자전거 라이딩 추천 기능 고도화 로드맵

> **목적**: 날씨 데이터를 활용한 자전거 라이딩 추천 시스템을 점진적으로 고도화

**작성일**: 2025-10-21  
**상태**: 계획 단계  
**관련 문서**: `SESSION_CONTEXT.md`, `FUTURE_FEATURES.md`

---

## 🎯 프로젝트 목표

날씨 조건에 따라 자전거 타기 추천/비추천, 권장 복장을 제공하는 시스템을 3단계로 점진적 고도화하여 실제 사용 가능한 수준의 서비스로 발전시킵니다.

**최종 목표**: 실사용 가능한 개인화된 자전거 라이딩 추천 시스템

---

## 📊 전체 로드맵 개요

| Phase | 기능 | 난이도 | 예상 시간 | 상태 |
|-------|------|--------|----------|------|
| Phase 7 | 기본 점수 시스템 | ⭐⭐ | 2-3시간 | 📋 계획 |
| Phase 8 | 사용자 민감도 설정 | ⭐⭐⭐ | 4-5시간 | 📋 계획 |
| Phase 9 | 프로필 기반 종합 추천 | ⭐⭐⭐⭐ | 6-8시간 | 📋 계획 |
| Phase 10 (선택) | ML 기반 학습 시스템 | ⭐⭐⭐⭐⭐ | 1-2주 | 💡 아이디어 |

**총 예상 시간**: 12-16시간 (Phase 7-9)

---

## 🚴 Phase 7: 기본 점수 시스템 (MVP)

**Git Tag**: `v0.7.0-cycling-basic`  
**난이도**: ⭐⭐ 초급  
**예상 시간**: 2-3시간  
**목표**: 날씨 조건 기반 라이딩 추천 점수 계산 및 기본 UI

### 구현 범위

#### 1. 점수 계산 로직
- ✅ 5가지 날씨 조건 평가:
  1. **기온**: 최적 범위 15-25°C (0점 ~ -20점)
  2. **강수량**: 비/눈 여부 (0점 ~ -30점)
  3. **풍속**: 바람 강도 (0점 ~ -25점)
  4. **습도**: 불쾌지수 (0점 ~ -10점)
  5. **미세먼지**: 공기질 (0점 ~ -15점)

- ✅ 추천도 5단계:
  - 80-100점: 최고! 🚴‍♂️
  - 60-79점: 좋음 👍
  - 40-59점: 보통 🤔
  - 20-39점: 비추천 👎
  - 0-19점: 위험 ⚠️

#### 2. 복장 추천
- ✅ 온도별 기본 복장 (항상 헬멧 포함)
- ✅ 날씨 조건별 추가 장비
  - 비: 레인 재킷, 신발 커버
  - 바람: 방풍 조끼
  - 폭염: 선크림, 물통 2개
  - 한파: 방한 장갑, 넥워머

#### 3. 파일 구조
```
02-weather-app/
├── src/
│   ├── utils/
│   │   └── cyclingRecommender.ts      # 새로 추가
│   ├── components/
│   │   └── CyclingRecommendation.vue  # 새로 추가
│   ├── types/
│   │   └── cycling.ts                  # 새로 추가
│   └── stores/
│       └── weather.ts                  # 수정: 자전거 추천 통합
├── tests/
│   ├── unit/
│   │   └── cyclingRecommender.spec.ts # 새로 추가
│   └── e2e/
│       └── cycling.spec.ts             # 새로 추가
└── docs/
    └── PHASE_7_SUMMARY.md              # 작업 후 생성
```

#### 4. 핵심 코드 (예시)

```typescript
// src/types/cycling.ts
export interface CyclingScore {
  score: number;              // 0-100
  recommendation: RecommendationLevel;
  reasons: string[];
  clothing: ClothingItem[];
}

export type RecommendationLevel = 
  | 'excellent'   // 최고! 🚴‍♂️
  | 'good'        // 좋음 👍
  | 'fair'        // 보통 🤔
  | 'poor'        // 비추천 👎
  | 'dangerous';  // 위험 ⚠️

export interface ClothingItem {
  name: string;
  essential: boolean;  // 필수 여부
}
```

```typescript
// src/utils/cyclingRecommender.ts
import type { CurrentWeather } from '@/types/domain/weather';
import type { CyclingScore } from '@/types/cycling';

export function calculateCyclingScore(weather: CurrentWeather): CyclingScore {
  let score = 100;
  const reasons: string[] = [];
  const clothing: ClothingItem[] = [
    { name: '자전거 헬멧', essential: true },
    { name: '선글라스', essential: true }
  ];

  // 1. 기온 체크 (-20점 ~ 0점)
  const temp = weather.current.temp_c;
  if (temp < 0) {
    score -= 20;
    reasons.push('영하 기온으로 빙판 위험');
    clothing.push(
      { name: '방한 장갑', essential: true },
      { name: '넥워머', essential: true },
      { name: '방풍 재킷', essential: true }
    );
  } else if (temp < 10) {
    score -= 10;
    reasons.push('쌀쌀한 날씨');
    clothing.push(
      { name: '긴팔 저지', essential: true },
      { name: '레그워머', essential: false }
    );
  } else if (temp > 35) {
    score -= 15;
    reasons.push('폭염 주의');
    clothing.push(
      { name: '반팔 저지', essential: true },
      { name: '선크림', essential: true },
      { name: '물통 2개', essential: true }
    );
  } else if (temp >= 15 && temp <= 25) {
    reasons.push('완벽한 라이딩 온도');
    clothing.push({ name: '반팔 저지', essential: true });
  }

  // 2. 강수량 체크 (-30점 ~ 0점)
  const condition = weather.current.condition.text.toLowerCase();
  if (condition.includes('rain') || condition.includes('비')) {
    const isHeavyRain = condition.includes('heavy') || condition.includes('강한');
    const penalty = isHeavyRain ? 30 : 15;
    score -= penalty;
    reasons.push(isHeavyRain ? '강한 비로 시야 불량' : '비가 내림');
    clothing.push(
      { name: '레인 재킷', essential: true },
      { name: '신발 커버', essential: false }
    );
  }

  // 3. 풍속 체크 (-25점 ~ 0점)
  const wind = weather.current.wind_kph;
  if (wind > 15) {
    score -= 25;
    reasons.push('강풍으로 주행 어려움');
  } else if (wind > 10) {
    score -= 10;
    reasons.push('바람이 강함');
    clothing.push({ name: '방풍 조끼', essential: false });
  }

  // 4. 습도 체크 (-10점 ~ 0점)
  const humidity = weather.current.humidity;
  if (humidity > 80) {
    score -= 10;
    reasons.push('높은 습도로 불쾌감');
  }

  // 5. 미세먼지 체크 (-15점 ~ 0점) - API에 있는 경우
  // 현재 WeatherAPI.com은 air quality 데이터 제공
  // 추후 확장 가능

  // 추천도 결정
  const recommendation = getRecommendationLevel(score);

  return { score, recommendation, reasons, clothing };
}

function getRecommendationLevel(score: number): RecommendationLevel {
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 40) return 'fair';
  if (score >= 20) return 'poor';
  return 'dangerous';
}
```

```vue
<!-- src/components/CyclingRecommendation.vue -->
<script setup lang="ts">
import { computed } from 'vue';
import { useWeatherStore } from '@/stores/weather';
import { calculateCyclingScore } from '@/utils/cyclingRecommender';

const store = useWeatherStore();

const cyclingScore = computed(() => {
  if (!store.currentWeather) return null;
  return calculateCyclingScore(store.currentWeather);
});

const scoreClass = computed(() => {
  if (!cyclingScore.value) return '';
  const level = cyclingScore.value.recommendation;
  return `score-${level}`;
});

const emoji = computed(() => {
  if (!cyclingScore.value) return '';
  const map = {
    excellent: '🚴‍♂️',
    good: '👍',
    fair: '🤔',
    poor: '👎',
    dangerous: '⚠️'
  };
  return map[cyclingScore.value.recommendation];
});

const recommendationText = computed(() => {
  if (!cyclingScore.value) return '';
  const map = {
    excellent: '최고!',
    good: '좋음',
    fair: '보통',
    poor: '비추천',
    dangerous: '위험'
  };
  return map[cyclingScore.value.recommendation];
});
</script>

<template>
  <div v-if="cyclingScore" class="cycling-recommendation">
    <h2>🚴 오늘의 라이딩 점수</h2>
    
    <div class="score-display" :class="scoreClass">
      <div class="score-circle">
        <span class="score-number">{{ cyclingScore.score }}</span>
        <span class="score-label">{{ recommendationText }} {{ emoji }}</span>
      </div>
    </div>

    <div class="reasons-section">
      <h3>라이딩 조건</h3>
      <ul class="reasons-list">
        <li v-for="(reason, index) in cyclingScore.reasons" :key="index">
          {{ reason }}
        </li>
      </ul>
    </div>

    <div class="clothing-section">
      <h3>권장 복장</h3>
      <div class="clothing-list">
        <span 
          v-for="(item, index) in cyclingScore.clothing" 
          :key="index"
          :class="['clothing-badge', { essential: item.essential }]">
          {{ item.name }}
          <span v-if="item.essential" class="essential-mark">*</span>
        </span>
      </div>
      <p class="clothing-note">* 필수 항목</p>
    </div>
  </div>
</template>

<style scoped>
.cycling-recommendation {
  background: white;
  border-radius: 12px;
  padding: 24px;
  margin: 20px 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.score-display {
  text-align: center;
  margin: 20px 0;
}

.score-circle {
  display: inline-block;
  width: 150px;
  height: 150px;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.score-number {
  font-size: 48px;
  font-weight: bold;
}

.score-label {
  font-size: 18px;
  margin-top: 8px;
}

.score-excellent .score-circle {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.score-good .score-circle {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
}

.score-fair .score-circle {
  background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%);
  color: #333;
}

.score-poor .score-circle {
  background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%);
  color: #333;
}

.score-dangerous .score-circle {
  background: linear-gradient(135deg, #ff0844 0%, #ffb199 100%);
  color: white;
}

.reasons-section,
.clothing-section {
  margin-top: 24px;
}

.reasons-list {
  list-style: none;
  padding: 0;
}

.reasons-list li {
  padding: 8px 12px;
  margin: 4px 0;
  background: #f5f5f5;
  border-radius: 6px;
}

.clothing-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.clothing-badge {
  padding: 8px 16px;
  background: #e3f2fd;
  color: #1976d2;
  border-radius: 20px;
  font-size: 14px;
}

.clothing-badge.essential {
  background: #fff3e0;
  color: #f57c00;
  font-weight: bold;
}

.essential-mark {
  color: #f57c00;
  margin-left: 4px;
}

.clothing-note {
  margin-top: 8px;
  font-size: 12px;
  color: #666;
}
</style>
```

#### 5. 테스트 계획

**단위 테스트** (`tests/unit/cyclingRecommender.spec.ts`):
```typescript
describe('calculateCyclingScore', () => {
  it('완벽한 날씨 - 최고 점수', () => {
    const weather = createMockWeather({
      temp_c: 20,
      condition: { text: 'Clear' },
      wind_kph: 5,
      humidity: 50
    });
    
    const result = calculateCyclingScore(weather);
    
    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.recommendation).toBe('excellent');
    expect(result.reasons).toContain('완벽한 라이딩 온도');
  });

  it('비 오는 날 - 점수 감소', () => {
    const weather = createMockWeather({
      temp_c: 20,
      condition: { text: 'Rain' },
      wind_kph: 5,
      humidity: 50
    });
    
    const result = calculateCyclingScore(weather);
    
    expect(result.score).toBeLessThan(80);
    expect(result.reasons).toContain('비가 내림');
    expect(result.clothing.some(c => c.name === '레인 재킷')).toBe(true);
  });

  it('강풍 - 큰 점수 감소', () => {
    const weather = createMockWeather({
      temp_c: 20,
      condition: { text: 'Clear' },
      wind_kph: 20,
      humidity: 50
    });
    
    const result = calculateCyclingScore(weather);
    
    expect(result.score).toBeLessThan(75);
    expect(result.reasons).toContain('강풍으로 주행 어려움');
  });

  it('한파 - 방한 복장 추천', () => {
    const weather = createMockWeather({
      temp_c: -5,
      condition: { text: 'Clear' },
      wind_kph: 5,
      humidity: 50
    });
    
    const result = calculateCyclingScore(weather);
    
    expect(result.clothing.some(c => c.name === '방한 장갑')).toBe(true);
    expect(result.clothing.some(c => c.name === '넥워머')).toBe(true);
  });
});
```

**E2E 테스트** (`tests/e2e/cycling.spec.ts`):
```typescript
test('자전거 추천 점수 표시', async ({ page }) => {
  await page.goto('/');
  
  // Mock provider 선택
  await page.selectOption('[data-testid="provider-selector"]', 'mock');
  
  // 서울 검색
  await page.fill('[data-testid="search-input"]', '서울');
  await page.click('[data-testid="search-button"]');
  
  // 자전거 추천 섹션 표시 확인
  await expect(page.locator('.cycling-recommendation')).toBeVisible();
  await expect(page.locator('.score-number')).toBeVisible();
  await expect(page.locator('.reasons-list')).toBeVisible();
  await expect(page.locator('.clothing-list')).toBeVisible();
});

test('점수에 따른 추천도 변경', async ({ page }) => {
  // 완벽한 날씨 (테스트 데이터)
  await page.goto('/');
  await page.selectOption('[data-testid="provider-selector"]', 'mock');
  await page.fill('[data-testid="search-input"]', '서울');
  await page.click('[data-testid="search-button"]');
  
  const scoreText = await page.locator('.score-label').textContent();
  expect(['최고!', '좋음']).toContain(scoreText.replace(/[^\w가-힣]/g, ''));
  
  // 비 오는 날씨
  await page.fill('[data-testid="search-input"]', '테스트_비');
  await page.click('[data-testid="search-button"]');
  
  await expect(page.locator('.reasons-list')).toContainText('비');
  await expect(page.locator('.clothing-list')).toContainText('레인 재킷');
});
```

#### 6. 성공 기준

- ✅ 5가지 날씨 조건에 대한 점수 계산 정확성
- ✅ 추천도 5단계 정확히 구분
- ✅ 최소 10가지 복장 추천 (온도/날씨별)
- ✅ 단위 테스트 5개 이상 통과 (추가)
- ✅ E2E 테스트 2개 이상 통과 (추가)
- ✅ 전체 테스트: 87개 이상 (85 + 7)

#### 7. 작업 순서

**Day 1** (2시간):
1. `src/types/cycling.ts` 타입 정의
2. `src/utils/cyclingRecommender.ts` 구현
3. 단위 테스트 작성 및 실행

**Day 2** (1시간):
4. `src/components/CyclingRecommendation.vue` 컴포넌트
5. `src/stores/weather.ts` 통합
6. E2E 테스트 작성

**Day 3** (선택적, 리팩토링):
7. 스타일링 개선
8. 버그 수정
9. `docs/PHASE_7_SUMMARY.md` 작성
10. 커밋 및 태그 (`v0.7.0-cycling-basic`)

---

## 🎨 Phase 8: 사용자 민감도 설정 추가

**Git Tag**: `v0.8.0-cycling-sensitivity`  
**난이도**: ⭐⭐⭐ 중급  
**예상 시간**: 4-5시간  
**목표**: 개인화 1단계 - 사용자가 날씨 조건별 민감도를 설정

### 구현 범위

#### 1. 민감도 설정 UI
- ✅ 4가지 민감도 조절:
  1. 비 민감도 (strict / normal / flexible)
  2. 바람 민감도 (strict / normal / flexible)
  3. 온도 민감도 (strict / normal / flexible)
  4. 미세먼지 민감도 (strict / normal / flexible)

- ✅ LocalStorage 설정 저장/불러오기
- ✅ 설정 초기화 기능

#### 2. 점수 계산 로직 확장

```typescript
// src/types/cycling.ts (추가)
export interface CyclingSensitivity {
  rain: SensitivityLevel;
  wind: SensitivityLevel;
  temperature: SensitivityLevel;
  airQuality: SensitivityLevel;
}

export type SensitivityLevel = 'strict' | 'normal' | 'flexible';

// src/utils/cyclingRecommender.ts (수정)
export function calculateCyclingScore(
  weather: CurrentWeather,
  sensitivity: CyclingSensitivity  // 파라미터 추가
): CyclingScore {
  let score = 100;
  
  // 민감도에 따른 패널티 조정
  const rainPenalty = calculateRainPenalty(weather, sensitivity.rain);
  const windPenalty = calculateWindPenalty(weather, sensitivity.wind);
  // ...
  
  score -= rainPenalty + windPenalty + /* ... */;
  
  return { score, recommendation, reasons, clothing };
}

function calculateRainPenalty(
  weather: CurrentWeather, 
  sensitivity: SensitivityLevel
): number {
  const condition = weather.current.condition.text.toLowerCase();
  if (!condition.includes('rain') && !condition.includes('비')) {
    return 0;
  }
  
  const isHeavyRain = condition.includes('heavy') || condition.includes('강한');
  const basePenalty = isHeavyRain ? 30 : 15;
  
  // 민감도에 따라 패널티 조정
  if (sensitivity === 'strict') return basePenalty * 1.5;
  if (sensitivity === 'flexible') return basePenalty * 0.5;
  return basePenalty; // normal
}
```

#### 3. 새로운 파일

```
02-weather-app/
├── src/
│   ├── components/
│   │   └── CyclingSensitivitySettings.vue  # 새로 추가
│   ├── stores/
│   │   └── cyclingSettings.ts              # 새로 추가
│   └── utils/
│       └── cyclingRecommender.ts           # 수정
├── tests/
│   └── unit/
│       └── cyclingSensitivity.spec.ts      # 새로 추가
└── docs/
    └── PHASE_8_SUMMARY.md                  # 작업 후 생성
```

#### 4. 설정 UI 예시

```vue
<!-- src/components/CyclingSensitivitySettings.vue -->
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useCyclingSettingsStore } from '@/stores/cyclingSettings';

const store = useCyclingSettingsStore();

const rainSensitivity = ref<SensitivityLevel>('normal');
const windSensitivity = ref<SensitivityLevel>('normal');
const tempSensitivity = ref<SensitivityLevel>('normal');
const airQualitySensitivity = ref<SensitivityLevel>('normal');

onMounted(() => {
  const settings = store.getSensitivity();
  rainSensitivity.value = settings.rain;
  windSensitivity.value = settings.wind;
  tempSensitivity.value = settings.temperature;
  airQualitySensitivity.value = settings.airQuality;
});

const saveSettings = () => {
  store.setSensitivity({
    rain: rainSensitivity.value,
    wind: windSensitivity.value,
    temperature: tempSensitivity.value,
    airQuality: airQualitySensitivity.value
  });
  alert('설정이 저장되었습니다!');
};

const resetSettings = () => {
  store.resetSensitivity();
  rainSensitivity.value = 'normal';
  windSensitivity.value = 'normal';
  tempSensitivity.value = 'normal';
  airQualitySensitivity.value = 'normal';
};
</script>

<template>
  <div class="sensitivity-settings">
    <h3>라이딩 민감도 설정</h3>
    
    <div class="setting-group">
      <label>비 민감도</label>
      <div class="sensitivity-buttons">
        <button 
          @click="rainSensitivity = 'strict'"
          :class="{ active: rainSensitivity === 'strict' }">
          엄격
        </button>
        <button 
          @click="rainSensitivity = 'normal'"
          :class="{ active: rainSensitivity === 'normal' }">
          보통
        </button>
        <button 
          @click="rainSensitivity = 'flexible'"
          :class="{ active: rainSensitivity === 'flexible' }">
          여유
        </button>
      </div>
      <p class="help-text">
        {{ getSensitivityDescription('rain', rainSensitivity) }}
      </p>
    </div>

    <!-- 바람, 온도, 미세먼지 민감도도 동일하게... -->

    <div class="actions">
      <button @click="saveSettings" class="btn-primary">저장</button>
      <button @click="resetSettings" class="btn-secondary">초기화</button>
    </div>
  </div>
</template>
```

#### 5. 테스트 계획

**단위 테스트** (3개 추가):
```typescript
describe('민감도 기반 점수 계산', () => {
  it('엄격한 비 민감도 - 패널티 증가', () => {
    const weather = createRainyWeather();
    const strictSensitivity = { rain: 'strict', wind: 'normal', /* ... */ };
    const normalSensitivity = { rain: 'normal', wind: 'normal', /* ... */ };
    
    const strictScore = calculateCyclingScore(weather, strictSensitivity);
    const normalScore = calculateCyclingScore(weather, normalSensitivity);
    
    expect(strictScore.score).toBeLessThan(normalScore.score);
  });

  it('여유로운 바람 민감도 - 패널티 감소', () => {
    const weather = createWindyWeather();
    const flexibleSensitivity = { rain: 'normal', wind: 'flexible', /* ... */ };
    const normalSensitivity = { rain: 'normal', wind: 'normal', /* ... */ };
    
    const flexibleScore = calculateCyclingScore(weather, flexibleSensitivity);
    const normalScore = calculateCyclingScore(weather, normalSensitivity);
    
    expect(flexibleScore.score).toBeGreaterThan(normalScore.score);
  });
});
```

#### 6. 성공 기준

- ✅ 4가지 민감도 설정 가능
- ✅ 설정 저장/불러오기 동작
- ✅ 민감도별 점수 차이 10점 이상
- ✅ 단위 테스트 3개 추가 (총 90개)
- ✅ 설정 UI 반응형 디자인

---

## 🏆 Phase 9: 프로필 기반 종합 추천 (방안 3 완성)

**Git Tag**: `v0.9.0-cycling-advanced`  
**난이도**: ⭐⭐⭐⭐ 고급  
**예상 시간**: 6-8시간  
**목표**: 실사용 가능한 종합 추천 시스템

### 구현 범위

#### 1. 라이더 프로필 시스템
- ✅ 실력 수준: 초보 / 중급 / 고급
- ✅ 라이딩 목적: 여가 / 운동 / 훈련
- ✅ 선호 거리: 짧음 / 중간 / 길음
- ✅ 프로필별 점수 조정

#### 2. 코스 추천 시스템
- ✅ 4가지 코스 타입:
  1. **sheltered**: 바람 막아주는 숲길
  2. **scenic**: 경치 좋은 장거리
  3. **short**: 집 근처 짧은 코스
  4. **normal**: 일반 코스

- ✅ 날씨별 코스 제안:
  - 강풍: 올림픽공원 둘레길, 서울숲 (차폐된 코스)
  - 완벽한 날씨: 한강 라이딩, 남한산성 힐클라임
  - 비: 집 근처 짧은 코스

#### 3. 시간대 추천
- ✅ 폭염: 이른 아침(5-8시) 또는 저녁(18-20시)
- ✅ 강수 예보: 시간별 예보 체크 (Phase 6 데이터 활용)
- ✅ 일반: 오전 10시 또는 오후 4시

#### 4. 복장 추천 상세화
- ✅ 3단계 분류:
  1. **필수**: 헬멧, 장갑 등
  2. **권장**: 레그워머, 암워머 등
  3. **선택**: 아이스 슬리브, 선크림 등

#### 5. 라이딩 히스토리 관리
- ✅ 라이딩 기록 저장 (LocalStorage)
- ✅ 기록 항목:
  - 날짜, 날씨 조건, 점수
  - 실제로 탔는지 여부
  - 만족도 (선택사항)
  - 거리, 시간 (선택사항)

#### 6. 통계 대시보드
- ✅ 총 라이딩 횟수
- ✅ 이번 달 라이딩 횟수
- ✅ 선호 날씨 (가장 많이 탄 날씨)
- ✅ 평균 라이딩 점수
- ✅ 날씨별 라이딩 분포 (차트)

#### 7. 새로운 파일

```
02-weather-app/
├── src/
│   ├── components/
│   │   ├── CyclingProfileSettings.vue     # 새로 추가
│   │   ├── CyclingRouteRecommendation.vue # 새로 추가
│   │   ├── CyclingTimingRecommendation.vue# 새로 추가
│   │   ├── CyclingHistoryList.vue         # 새로 추가
│   │   └── CyclingStatsChart.vue          # 새로 추가
│   ├── utils/
│   │   └── smartCyclingRecommender.ts     # 새로 추가
│   ├── stores/
│   │   └── cyclingHistory.ts              # 새로 추가
│   └── types/
│       └── cycling.ts                      # 확장
└── docs/
    └── PHASE_9_SUMMARY.md                  # 작업 후 생성
```

#### 8. 핵심 코드 (예시)

```typescript
// src/types/cycling.ts (확장)
export interface CyclingProfile {
  level: 'beginner' | 'intermediate' | 'advanced';
  purpose: 'casual' | 'fitness' | 'training';
  preferredDistance: 'short' | 'medium' | 'long';
}

export interface RouteRecommendation {
  type: 'sheltered' | 'scenic' | 'short' | 'normal';
  description: string;
  suggestions?: string[];
  avoidance?: string[];
}

export interface TimingRecommendation {
  bestTime: string;
  avoidTime?: string;
  reason: string;
}

export interface RideRecord {
  id: string;
  date: string;
  weather: CurrentWeather;
  score: number;
  didRide: boolean;
  satisfaction?: number;  // 1-5
  distance?: number;      // km
  duration?: number;      // minutes
}
```

```typescript
// src/utils/smartCyclingRecommender.ts
import type { CyclingProfile, RouteRecommendation } from '@/types/cycling';

export class SmartCyclingRecommender {
  recommendRoute(
    weather: CurrentWeather, 
    profile: CyclingProfile
  ): RouteRecommendation {
    // 강풍 + 초보자
    if (weather.current.wind_kph > 10 && profile.level === 'beginner') {
      return {
        type: 'sheltered',
        description: '바람 막아주는 숲길 코스',
        suggestions: ['올림픽공원 둘레길', '서울숲', '양재천'],
        avoidance: ['한강 강변도로', '해안도로']
      };
    }

    // 완벽한 날씨 + 훈련 목적
    if (isIdealWeather(weather) && profile.purpose === 'training') {
      return {
        type: 'scenic',
        description: '완벽한 날씨! 장거리 훈련 코스',
        suggestions: [
          '한강 일주 (90km)',
          '팔당댐 왕복 (110km)',
          '남한산성 힐클라임'
        ]
      };
    }

    // 비 오는 날
    if (isRainy(weather)) {
      return {
        type: 'short',
        description: '비가 와서 집 근처 짧은 코스 권장',
        avoidance: ['비포장도로', '산악 코스']
      };
    }

    return {
      type: 'normal',
      description: '일반적인 라이딩 코스',
      suggestions: ['평소 다니던 코스']
    };
  }

  recommendTiming(weather: CurrentWeather): TimingRecommendation {
    const temp = weather.current.temp_c;
    
    if (temp > 30) {
      return {
        bestTime: '이른 아침 (05:00-08:00) 또는 저녁 (18:00-20:00)',
        avoidTime: '한낮 (12:00-16:00)',
        reason: '폭염 시간대 회피'
      };
    }

    // Phase 6 forecast 데이터 활용 가능
    // if (hasRainForecast(weather)) { ... }

    return {
      bestTime: '오전 10시 또는 오후 4시 추천',
      reason: '적정 온도 시간대'
    };
  }
}
```

#### 9. 통계 대시보드 UI

```vue
<!-- src/components/CyclingStatsChart.vue -->
<script setup lang="ts">
import { computed } from 'vue';
import { useCyclingHistoryStore } from '@/stores/cyclingHistory';

const historyStore = useCyclingHistoryStore();

const totalRides = computed(() => historyStore.records.length);

const monthlyRides = computed(() => {
  const now = new Date();
  const thisMonth = historyStore.records.filter(r => {
    const rideDate = new Date(r.date);
    return rideDate.getMonth() === now.getMonth() &&
           rideDate.getFullYear() === now.getFullYear();
  });
  return thisMonth.length;
});

const preferredWeather = computed(() => {
  // 가장 많이 탄 날씨 조건
  const weatherCounts: Record<string, number> = {};
  historyStore.records.forEach(r => {
    const condition = r.weather.current.condition.text;
    weatherCounts[condition] = (weatherCounts[condition] || 0) + 1;
  });
  
  let maxCount = 0;
  let preferred = '데이터 없음';
  for (const [weather, count] of Object.entries(weatherCounts)) {
    if (count > maxCount) {
      maxCount = count;
      preferred = weather;
    }
  }
  return preferred;
});

const averageScore = computed(() => {
  if (historyStore.records.length === 0) return 0;
  const sum = historyStore.records.reduce((acc, r) => acc + r.score, 0);
  return Math.round(sum / historyStore.records.length);
});
</script>

<template>
  <div class="cycling-stats">
    <h3>내 라이딩 통계</h3>
    
    <div class="stats-grid">
      <div class="stat-card">
        <h4>총 라이딩</h4>
        <p class="big-number">{{ totalRides }}회</p>
      </div>
      
      <div class="stat-card">
        <h4>이번 달</h4>
        <p class="big-number">{{ monthlyRides }}회</p>
      </div>
      
      <div class="stat-card">
        <h4>선호 날씨</h4>
        <p>{{ preferredWeather }}</p>
      </div>
      
      <div class="stat-card">
        <h4>평균 점수</h4>
        <p class="big-number">{{ averageScore }}점</p>
      </div>
    </div>

    <!-- 차트는 Chart.js 또는 D3.js 사용 -->
    <div class="weather-distribution">
      <h4>날씨별 라이딩 분포</h4>
      <canvas ref="chartCanvas"></canvas>
    </div>
  </div>
</template>
```

#### 10. 테스트 계획

**단위 테스트** (10개 추가):
- SmartCyclingRecommender 테스트 (5개)
- 히스토리 관리 테스트 (3개)
- 통계 계산 테스트 (2개)

**E2E 테스트** (5개 추가):
- 프로필 설정 플로우
- 코스 추천 표시
- 라이딩 기록 추가
- 통계 대시보드 표시
- 히스토리 목록 페이지

#### 11. 성공 기준

- ✅ 프로필 3단계 구현 및 저장
- ✅ 코스 추천 4가지 타입 동작
- ✅ 시간대 추천 정확도
- ✅ 통계 대시보드 4가지 지표
- ✅ 라이딩 기록 CRUD 동작
- ✅ 단위 테스트 10개 추가 (총 100개)
- ✅ E2E 테스트 5개 추가 (총 12개)

---

## 🤖 Phase 10: ML 기반 학습 시스템 (선택사항)

**Git Tag**: `v1.0.0-cycling-ml`  
**난이도**: ⭐⭐⭐⭐⭐ 고급  
**예상 시간**: 1-2주  
**상태**: 💡 아이디어 단계 (미래 확장)

### 구현 범위 (개요만)

#### 1. 데이터 수집
- ✅ 라이딩 기록 자동 수집 (Phase 9 기반)
- ✅ 날씨 vs 만족도 패턴 학습

#### 2. ML 모델
- ✅ 간단한 회귀 모델 (ml-regression)
- ✅ 특성: [temp, rain, wind, humidity, pm10]
- ✅ 레이블: satisfaction (1-5)

#### 3. 예측 기능
- ✅ "오늘 탈까 말까?" 예측
- ✅ 예측 신뢰도 표시
- ✅ 모델 재학습 (30회 이상 라이딩 시)

**Note**: Phase 9까지 완성 후, 실제 필요성을 판단하여 진행 여부 결정

---

## 📅 전체 일정 (예상)

### Week 1: Phase 7 (기본 점수 시스템)
- **Day 1**: 타입 정의 + 점수 계산 로직 + 단위 테스트
- **Day 2**: UI 컴포넌트 + 통합 + E2E 테스트
- **Day 3**: 리팩토링 + 문서화 + 커밋

### Week 2: Phase 8 (민감도 설정)
- **Day 4-5**: 민감도 설정 UI + 점수 조정 로직
- **Day 6**: 테스트 + 문서화 + 커밋

### Week 3-4: Phase 9 (종합 추천)
- **Day 7-9**: 프로필 시스템 + 코스/시간 추천
- **Day 10-12**: 히스토리 관리 + 통계 대시보드
- **Day 13-14**: 전체 테스트 + 최종 문서화

---

## ✅ 단계별 체크리스트

### Phase 7 체크리스트
- [ ] `src/types/cycling.ts` 타입 정의
- [ ] `src/utils/cyclingRecommender.ts` 구현
- [ ] `src/components/CyclingRecommendation.vue` 구현
- [ ] 단위 테스트 5개 이상 작성
- [ ] E2E 테스트 2개 이상 작성
- [ ] 전체 테스트 87개 이상 통과
- [ ] `docs/PHASE_7_SUMMARY.md` 작성
- [ ] Git 커밋 및 태그 (`v0.7.0-cycling-basic`)

### Phase 8 체크리스트
- [ ] 민감도 타입 확장
- [ ] `src/components/CyclingSensitivitySettings.vue` 구현
- [ ] `src/stores/cyclingSettings.ts` 구현
- [ ] 점수 계산 로직 민감도 적용
- [ ] 단위 테스트 3개 추가
- [ ] 전체 테스트 90개 이상 통과
- [ ] `docs/PHASE_8_SUMMARY.md` 작성
- [ ] Git 커밋 및 태그 (`v0.8.0-cycling-sensitivity`)

### Phase 9 체크리스트
- [ ] 프로필 타입 정의
- [ ] `src/utils/smartCyclingRecommender.ts` 구현
- [ ] 프로필/코스/시간 추천 컴포넌트 구현
- [ ] `src/stores/cyclingHistory.ts` 구현
- [ ] 통계 대시보드 구현
- [ ] 단위 테스트 10개 추가
- [ ] E2E 테스트 5개 추가
- [ ] 전체 테스트 105개 이상 통과
- [ ] `docs/PHASE_9_SUMMARY.md` 작성
- [ ] Git 커밋 및 태그 (`v0.9.0-cycling-advanced`)

---

## 📚 참고 문서

### 내부 문서
- `SESSION_CONTEXT.md`: Weather App 전체 컨텍스트
- `REFACTORING_PLAN.md`: 리팩토링 전략
- `FUTURE_FEATURES.md`: AI 분석 기능 (별도)
- `COMMIT_CONVENTION.md`: 커밋 컨벤션

### 외부 자료
- [Chart.js](https://www.chartjs.org/): 통계 차트 (Phase 9)
- [ml-regression](https://github.com/mljs/regression): ML 모델 (Phase 10)
- [Weather Icon Mapping](https://openweathermap.org/weather-conditions): 아이콘 참고

---

## 🔄 변경 이력

| 날짜 | 버전 | 변경 내용 |
|------|------|----------|
| 2025-10-21 | 1.0 | 초기 로드맵 작성 (Phase 7-10) |

---

## 📝 사용자 의사결정 기록

### Decision 1: 점진적 고도화 방식 채택 (2025-10-21)
**질문**: 방안1(간단), 방안2(ML), 방안3(하이브리드) 중 선택?

**결정**: 방안1 → 방안3 점진적 고도화  
**근거**: 
- AI-DLC 방법론에 부합
- 각 단계마다 학습 및 테스트 가능
- 실사용 가능한 수준까지 단계적 발전
- 필요시 Phase 10 (ML) 추가 가능

**승인**: "실제로 사용할 수 있는 수준으로 끌어올리는게 최종 목표인데 방안1에서 방안3으로 점진적 고도화 어떨까?"

---

*문서 작성일: 2025-10-21*  
*작성자: neisii + Claude Code*  
*버전: 1.0*
