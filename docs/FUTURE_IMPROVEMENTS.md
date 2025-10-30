# Future Improvements

**작성일**: 2025-10-08  
**목적**: Phase 3 이후 개선 과제 정리

---

## 🎯 High Priority

### 1. 도시명 다국어 지원 (Korean ↔ English)

**현재 상황**:
- WeatherAPI.com과 Open-Meteo는 영문 도시명만 인식
- 사용자가 "부산"으로 검색 시 실패 → "Busan"으로 검색해야 성공
- OpenWeatherMap은 한글/영문 모두 지원

**문제 사례**:
```
입력: "부산"
WeatherAPI.com: ❌ "No matching location found"
Open-Meteo: ❌ 좌표를 찾을 수 없음

입력: "Busan"
WeatherAPI.com: ✅ 정상 조회
Open-Meteo: ✅ 정상 조회 (cityCoordinates.ts 활용)
```

**개선 방안**:

#### Option 1: cityCoordinates를 활용한 자동 변환 (권장)
```typescript
// src/config/cityCoordinates.ts 구조 활용
export interface CityCoordinate {
  name: string;       // 한글명
  name_en: string;    // 영문명
  lat: number;
  lon: number;
  country: string;
  timezone: string;
}

// WeatherAPIAdapter에서 사용
async getCurrentWeather(city: string): Promise<CurrentWeather> {
  // 한글 입력 시 영문명으로 자동 변환
  const cityData = CITY_COORDINATES[city];
  const queryCity = cityData ? cityData.name_en : city;
  
  // API 호출
  const response = await axios.get(`${BASE_URL}/current.json`, {
    params: {
      key: this.apiKey,
      q: queryCity,  // 영문명으로 요청
      aqi: 'no'
    }
  });
  // ...
}
```

**장점**:
- 기존 cityCoordinates.ts 데이터 활용
- 추가 API 호출 불필요
- 오프라인에서도 동작

**단점**:
- cityCoordinates에 없는 도시는 변환 불가
- 사전 정의된 도시만 지원

#### Option 2: 실시간 geocoding API 활용
- Nominatim (OpenStreetMap)
- Google Geocoding API
- Mapbox Geocoding API

**장점**:
- 모든 도시명 지원
- 다양한 언어 지원

**단점**:
- 추가 API 호출 필요 (성능 영향)
- Rate limit 고려 필요
- 네트워크 의존성

#### Option 3: UI 레벨 개선 - 도시 선택 드롭다운
```typescript
// 드롭다운에서 한글명 표시, 내부적으로 영문명 사용
<select v-model="selectedCity">
  <option value="Seoul">서울 (Seoul)</option>
  <option value="Busan">부산 (Busan)</option>
  <option value="Incheon">인천 (Incheon)</option>
  <!-- ... -->
</select>
```

**장점**:
- 사용자에게 명확한 선택지 제공
- 변환 로직 불필요
- cityCoordinates 데이터 활용

**단점**:
- 자유 입력 불가
- 사전 정의된 도시만 선택 가능

**권장 구현 순서**:
1. **단기**: Option 1 (cityCoordinates 활용) - 빠른 구현
2. **중기**: Option 3 (드롭다운 UI) - UX 개선
3. **장기**: Option 2 (geocoding API) - 완전한 다국어 지원

**예상 작업 시간**: 2-3 시간

---

## 🔧 Medium Priority

### 2. Open-Meteo 낮/밤 구분 개선

**현재 구현**:
```typescript
// 경도 기반 간단한 계산 (6시~18시 = 낮)
private isDaytime(_latitude: number, longitude: number, currentTime: Date): boolean {
  const utcHour = currentTime.getUTCHours();
  const timezoneOffset = longitude / 15;
  const localHour = (utcHour + timezoneOffset + 24) % 24;
  return localHour >= 6 && localHour < 18;
}
```

**문제점**:
- 실제 일출/일몰 시각을 고려하지 않음
- 위도에 따른 차이 무시
- 계절별 차이 무시

**개선 방안**:

#### Option 1: SunCalc 라이브러리 사용
```bash
npm install suncalc
```

```typescript
import SunCalc from 'suncalc';

private isDaytime(latitude: number, longitude: number, currentTime: Date): boolean {
  const times = SunCalc.getTimes(currentTime, latitude, longitude);
  return currentTime >= times.sunrise && currentTime <= times.sunset;
}
```

**장점**:
- 정확한 일출/일몰 계산
- 위도/경도/계절 모두 고려
- 널리 사용되는 검증된 라이브러리

**단점**:
- 번들 크기 증가 (~10KB)

#### Option 2: Open-Meteo sunrise/sunset API 활용
```typescript
// API 요청에 sunrise/sunset 파라미터 추가
const response = await axios.get(BASE_URL, {
  params: {
    latitude: coordinates.lat,
    longitude: coordinates.lon,
    current: 'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m',
    daily: 'sunrise,sunset',  // 추가
    timezone: 'auto'
  }
});

// 응답에서 sunrise/sunset 사용
const sunrise = new Date(response.data.daily.sunrise[0]);
const sunset = new Date(response.data.daily.sunset[0]);
const isDaytime = currentTime >= sunrise && currentTime <= sunset;
```

**장점**:
- 추가 라이브러리 불필요
- Open-Meteo 데이터와 일관성 유지

**단점**:
- API 응답 구조 복잡해짐

**권장**: Option 1 (SunCalc) - 정확도와 개발 편의성

**예상 작업 시간**: 1시간

---

### 3. E2E 테스트 타임아웃 해결

**현재 상황**:
```bash
npx playwright test
# 결과: Timeout (120초 초과)
```

**조사 필요 사항**:
- [ ] Playwright config 확인 (timeout 설정)
- [ ] 테스트 셀렉터 유효성 검증
- [ ] API 응답 대기 로직 확인
- [ ] 불필요한 waitFor 제거

**예상 작업 시간**: 2시간

---

### 4. Unit Tests 추가 (Vitest)

**Phase 3에서 미완료**:
- [ ] WeatherAPIAdapter.spec.ts
- [ ] OpenMeteoAdapter.spec.ts
- [ ] WeatherService.spec.ts
- [ ] MockWeatherAdapter.spec.ts

**테스트 커버리지 목표**: 80% 이상

**예상 작업 시간**: 4-5시간

---

## 🎨 Low Priority

### 5. 날씨 이력 저장 (LocalStorage)

**기능**:
- 최근 조회한 날씨 기록 저장
- 시간별 온도 변화 그래프
- 일주일 날씨 비교

**예상 작업 시간**: 3-4시간

---

### 6. 즐겨찾기 도시

**기능**:
- 자주 조회하는 도시 즐겨찾기
- 즐겨찾기 목록에서 빠른 조회
- LocalStorage 저장

**예상 작업 시간**: 2시간

---

### 7. 5일 예보 (Forecast)

**현재 상황**:
- CurrentWeather만 구현
- Forecast 타입 정의는 있으나 미사용

**구현 필요**:
- 각 Adapter에 `getForecast()` 메서드 추가
- UI 컴포넌트 추가
- 5일 예보 표시

**예상 작업 시간**: 6-8시간

---

### 8. 테마 변경 (다크 모드)

**기능**:
- 라이트/다크 모드 토글
- 시스템 설정 자동 감지
- LocalStorage에 선호도 저장

**예상 작업 시간**: 2-3시간

---

### 9. 반응형 디자인 개선

**현재 상황**:
- 데스크톱 중심 디자인
- 모바일 최적화 부족

**개선 필요**:
- 모바일/태블릿 breakpoint 추가
- 터치 UI 개선
- 폰트 크기 조정

**예상 작업 시간**: 3-4시간

---

### 10. 접근성 (A11y) 개선

**개선 필요**:
- ARIA 라벨 추가
- 키보드 네비게이션 개선
- 스크린 리더 지원
- 색상 대비 검증

**예상 작업 시간**: 2-3시간

---

## 📊 우선순위 요약

| 우선순위 | 과제 | 예상 시간 | 비즈니스 가치 |
|---------|------|----------|------------|
| 🔴 High | 도시명 다국어 지원 | 2-3h | ⭐⭐⭐⭐⭐ |
| 🟡 Medium | Open-Meteo 낮/밤 개선 | 1h | ⭐⭐⭐ |
| 🟡 Medium | E2E 테스트 수정 | 2h | ⭐⭐⭐⭐ |
| 🟡 Medium | Unit Tests 추가 | 4-5h | ⭐⭐⭐⭐ |
| 🟢 Low | 날씨 이력 저장 | 3-4h | ⭐⭐ |
| 🟢 Low | 즐겨찾기 기능 | 2h | ⭐⭐ |
| 🟢 Low | 5일 예보 | 6-8h | ⭐⭐⭐ |
| 🟢 Low | 다크 모드 | 2-3h | ⭐⭐ |
| 🟢 Low | 반응형 개선 | 3-4h | ⭐⭐⭐ |
| 🟢 Low | 접근성 개선 | 2-3h | ⭐⭐ |

---

**작성일**: 2025-10-08  
**최종 업데이트**: 2025-10-08
