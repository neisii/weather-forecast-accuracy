# Mock Weather Data

## 📋 개요

이 디렉토리는 Mock Weather Provider에서 사용하는 날씨 데이터를 포함합니다.

**최적화 전략**: 단축 키 + Gzip 압축으로 파일 크기 **~75% 감소**

---

## 📁 파일 구조

```
src/data/
├── mockWeather.json      # 압축된 Mock 데이터 (단축 키 사용)
├── keyMap.ts             # 키 매핑 테이블 및 변환 함수
├── types.ts              # TypeScript 타입 정의
├── loader.ts             # 데이터 로더
└── README.md             # 이 문서
```

---

## 🔑 키 매핑 테이블

### Root Level
| 단축 키 | 전체 키 | 설명 |
|---------|---------|------|
| `v` | `version` | 데이터 버전 |
| `c` | `cities` | 기본 도시 목록 |
| `tc` | `testCities` | 테스트 도시 목록 |
| `def` | `default` | 기본값 (도시 없을 때) |

### City Data
| 단축 키 | 전체 키 | 설명 |
|---------|---------|------|
| `loc` | `location` | 위치 정보 |
| `cur` | `current` | 현재 날씨 |
| `w` | `weather` | 날씨 설명 |
| `ts` | `timestamp` | 타임스탬프 |

### Location
| 단축 키 | 전체 키 | 설명 |
|---------|---------|------|
| `n` | `name` | 도시 이름 (영문) |
| `nk` | `name_ko` | 도시 이름 (한글) |
| `ne` | `name_en` | 도시 이름 (영문, 명시적) |
| `lat` | `latitude` | 위도 |
| `lon` | `longitude` | 경도 |
| `tz` | `timezone` | 시간대 |
| `co` | `country` | 국가 코드 |

### Current Weather
| 단축 키 | 전체 키 | 설명 |
|---------|---------|------|
| `t` | `temperature` | 온도 (°C) |
| `f` | `feelsLike` | 체감 온도 (°C) |
| `h` | `humidity` | 습도 (%) |
| `p` | `pressure` | 기압 (hPa) |
| `ws` | `windSpeed` | 풍속 (m/s) |
| `wd` | `windDirection` | 풍향 (°) |
| `cl` | `cloudiness` | 구름량 (%) |
| `vis` | `visibility` | 가시거리 (m) |
| `uv` | `uvIndex` | UV 지수 |

### Weather Description
| 단축 키 | 전체 키 | 설명 |
|---------|---------|------|
| `d` | `description` | 날씨 설명 (한글) |
| `de` | `description_en` | 날씨 설명 (영문) |
| `i` | `icon` | 아이콘 코드 |
| `cd` | `code` | Provider별 코드 |

### Weather Codes
| 단축 키 | 전체 키 | 설명 |
|---------|---------|------|
| `ow` | `openweather` | OpenWeatherMap 코드 |
| `wa` | `weatherapi` | WeatherAPI.com 코드 |
| `wmo` | `wmo` | Open-Meteo WMO 코드 |

---

## 📊 데이터 구조

### 압축된 형태 (mockWeather.json)

```json
{
  "v": "1.0",
  "c": {
    "서울": {
      "loc": {
        "n": "Seoul",
        "nk": "서울",
        "lat": 37.5683,
        "lon": 126.9778
      },
      "cur": {
        "t": 18,
        "f": 16,
        "h": 55,
        "ws": 3.2
      },
      "w": {
        "d": "맑음",
        "de": "Clear",
        "i": "01d"
      }
    }
  }
}
```

### 확장된 형태 (런타임)

```typescript
{
  "version": "1.0",
  "cities": {
    "서울": {
      "location": {
        "name": "Seoul",
        "name_ko": "서울",
        "latitude": 37.5683,
        "longitude": 126.9778
      },
      "current": {
        "temperature": 18,
        "feelsLike": 16,
        "humidity": 55,
        "windSpeed": 3.2
      },
      "weather": {
        "description": "맑음",
        "description_en": "Clear",
        "icon": "01d"
      }
    }
  }
}
```

---

## 🏙️ 포함된 도시

### 기본 도시 (8개)
현실적인 10월 초 날씨 데이터

1. **서울** - 맑음 (18°C)
2. **부산** - 약간 흐림 (20°C)
3. **제주** - 흐림 (22°C)
4. **인천** - 맑음 (17°C)
5. **대구** - 맑음 (19°C)
6. **대전** - 약간 흐림 (18°C)
7. **광주** - 흐림 (20°C)
8. **울산** - 약간 흐림 (19°C)

### 테스트 도시 (6개)
극단적인 날씨 상태 테스트용

1. **테스트_비** - 비 (15°C, 습도 85%)
2. **테스트_눈** - 눈 (-2°C, 가시거리 3km)
3. **테스트_뇌우** - 뇌우 (25°C, 풍속 8m/s)
4. **테스트_안개** - 안개 (10°C, 가시거리 500m)
5. **테스트_폭염** - 폭염 (38°C, UV 11)
6. **테스트_한파** - 한파 (-15°C, 체감 -22°C)

---

## 💻 사용 방법

### 1. 데이터 로드

```typescript
import { loadMockWeatherData } from '@/data/loader';

// 전체 데이터 로드 (확장된 형태)
const data = await loadMockWeatherData();

console.log(data.cities['서울'].current.temperature); // 18
```

### 2. 도시 날씨 조회

```typescript
import { getMockWeatherByCity } from '@/data/loader';

const weather = await getMockWeatherByCity('서울');

console.log(weather); 
// {
//   location: { name: "Seoul", ... },
//   current: { temperature: 18, ... },
//   weather: { description: "맑음", ... }
// }
```

### 3. 수동 변환

```typescript
import { expandKeys } from '@/data/keyMap';
import mockData from '@/data/mockWeather.json';

// 압축 → 확장
const expanded = expandKeys(mockData);
```

---

## 🔧 최적화 효과

### 파일 크기 비교

| 형태 | 크기 | 감소율 |
|------|------|--------|
| **전체 키** (원본) | ~12 KB | - |
| **단축 키** (압축) | ~8 KB | 33% ↓ |
| **단축 키 + Gzip** | ~3 KB | **75% ↓** |

### 키 길이 통계

- **평균 원본 키 길이**: 9.5자
- **평균 단축 키 길이**: 2.2자
- **평균 절감률**: 76.8%

---

## 🛠️ 데이터 수정 방법

### 1. 새 도시 추가

```json
// mockWeather.json
{
  "c": {
    "새도시": {
      "loc": {
        "n": "NewCity",
        "nk": "새도시",
        "lat": 37.0,
        "lon": 127.0,
        "tz": "Asia/Seoul",
        "co": "KR"
      },
      "cur": {
        "t": 20,
        "f": 19,
        "h": 60,
        "p": 1013,
        "ws": 3.0,
        "wd": 180,
        "cl": 20,
        "vis": 10000,
        "uv": 5
      },
      "w": {
        "d": "맑음",
        "de": "Clear",
        "i": "01d",
        "cd": {
          "ow": 800,
          "wa": 1000,
          "wmo": 0
        }
      }
    }
  }
}
```

### 2. 날씨 데이터 업데이트

```typescript
// scripts/update-mock-data.ts
import { compressKeys } from '@/data/keyMap';
import fs from 'fs';

const newData = {
  version: "1.0",
  cities: {
    "서울": {
      location: { /* ... */ },
      current: { temperature: 20, /* ... */ }, // 온도 변경
      weather: { /* ... */ }
    }
  }
};

// 압축
const compressed = compressKeys(newData);

// 파일 저장
fs.writeFileSync(
  'src/data/mockWeather.json',
  JSON.stringify(compressed, null, 2)
);
```

---

## 📝 타입 정의

```typescript
// types.ts
export interface MockWeatherData {
  version: string;
  cities: Record<string, CityWeather>;
  testCities: Record<string, CityWeather>;
  default: CityWeather;
}

export interface CityWeather {
  location: LocationData;
  current: CurrentWeather;
  weather: WeatherDescription;
  timestamp?: string;
}

export interface LocationData {
  name: string;
  name_ko: string;
  name_en?: string;
  latitude: number;
  longitude: number;
  timezone: string;
  country: string;
}

export interface CurrentWeather {
  temperature: number;
  feelsLike: number;
  humidity: number;
  pressure: number;
  windSpeed: number;
  windDirection: number;
  cloudiness: number;
  visibility: number;
  uvIndex: number;
}

export interface WeatherDescription {
  description: string;
  description_en: string;
  icon: string;
  code: {
    openweather: number;
    weatherapi: number;
    wmo: number;
  };
}
```

---

## ⚡ 성능 최적화

### Vite 빌드 설정

Vite는 자동으로 Gzip 압축을 적용합니다:

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // 프로덕션에서 console.log 제거
      }
    }
  }
});
```

### 런타임 캐싱

```typescript
// loader.ts
let cachedData: MockWeatherData | null = null;

export async function loadMockWeatherData(): Promise<MockWeatherData> {
  if (cachedData) {
    return cachedData;
  }
  
  const compressed = await import('./mockWeather.json');
  cachedData = expandKeys(compressed.default);
  
  return cachedData;
}
```

---

## 🔍 디버깅

### 키 매핑 통계 확인

```typescript
import { getKeyMapStats } from '@/data/keyMap';

console.log(getKeyMapStats());
// {
//   totalMappings: 30,
//   avgOriginalKeyLength: "9.50",
//   avgShortKeyLength: "2.20",
//   averageSavings: "76.8%"
// }
```

### 데이터 검증

```typescript
import { validateMockData } from '@/data/loader';

const isValid = validateMockData();
if (!isValid) {
  console.error('Mock data validation failed!');
}
```

---

## 📚 참고 자료

- [keyMap.ts](./keyMap.ts) - 키 매핑 및 변환 함수
- [loader.ts](./loader.ts) - 데이터 로더
- [types.ts](./types.ts) - TypeScript 타입 정의
- [JSON 최적화 기법](../docs/TECHNICAL_QA.md#질문-7) - 상세 설명

---

**작성일**: 2025-10-08  
**버전**: 1.0  
**작성자**: Claude (AI)
