# 날씨 API 제공자 비교 분석

**작성일**: 2025-10-08  
**목적**: Mock JSON 구조 설계 및 통합 어댑터 패턴 적용을 위한 API 비교

---

## 📊 API 제공자 비교 요약표

| 항목 | OpenWeatherMap | WeatherAPI.com | Open-Meteo |
|------|----------------|----------------|------------|
| **API 버전** | v2.5 | v1 (명시 없음) | v1 |
| **엔드포인트** | `/data/2.5/weather` | `/v1/current.json` | `/v1/forecast` |
| **인증** | API Key 필수 | API Key 필수 | 비상업용 불필요 |
| **무료 한도** | 60 calls/minute | 1,000,000 calls/month | 무제한 (비상업) |
| **리셋 기준** | 1분 rolling | 월별 (매월 1일) | 해당 없음 |
| **응답 형식** | JSON, XML, HTML | JSON, XML | JSON |
| **한글 지원** | ✅ (`lang=kr`) | ✅ | ❌ (영문만) |
| **아이콘 제공** | ✅ (코드 + URL) | ✅ (URL) | ✅ (코드만) |
| **상업적 사용** | 유료 플랜 필요 | 유료 플랜 필요 | API Key로 가능 |

---

## 🔍 상세 비교

### 1. OpenWeatherMap (현재 사용 중)

#### API 정보
- **버전**: v2.5
- **베이스 URL**: `https://api.openweathermap.org/data/2.5`
- **엔드포인트**: `/weather`
- **공식 문서**: https://openweathermap.org/current

#### 인증 및 제약사항
```
✅ 기술적 제약:
- API Key 필수 (환경 변수: VITE_OPENWEATHER_API_KEY)
- 무료: 60 calls/minute (hard limit, API enforced)
- 리셋: Rolling 1-minute window
- 예보: 5 day / 3 hour forecast
- HTTPS 필수

⚠️ 제약사항:
- 일일 한도 초과 시 HTTP 429 (Too Many Requests)
- 무료 계정: 3시간 단위 예보만 제공
- 히스토리 데이터: 유료 플랜만
```

#### 요청 파라미터
```typescript
interface OpenWeatherRequest {
  q: string;        // 도시 이름 (예: "Seoul" 또는 "Seoul,KR")
  appid: string;    // API Key
  units: 'metric' | 'imperial' | 'standard'; // 기본: Kelvin
  lang: string;     // 언어 코드 (예: "kr", "en")
}
```

#### JSON 응답 구조
```json
{
  "coord": {
    "lon": 126.9778,
    "lat": 37.5683
  },
  "weather": [
    {
      "id": 800,
      "main": "Clear",
      "description": "맑음",
      "icon": "01d"
    }
  ],
  "base": "stations",
  "main": {
    "temp": 20.5,
    "feels_like": 18.3,
    "temp_min": 18.0,
    "temp_max": 22.0,
    "pressure": 1013,
    "humidity": 60,
    "sea_level": 1013,
    "grnd_level": 1011
  },
  "visibility": 10000,
  "wind": {
    "speed": 3.5,
    "deg": 180,
    "gust": 5.2
  },
  "clouds": {
    "all": 0
  },
  "dt": 1728345600,
  "sys": {
    "type": 1,
    "id": 8105,
    "country": "KR",
    "sunrise": 1728255600,
    "sunset": 1728298800
  },
  "timezone": 32400,
  "id": 1835848,
  "name": "Seoul",
  "cod": 200
}
```

#### 핵심 필드 매핑 (도메인 타입 변환용)
```typescript
// CurrentWeather 도메인 타입으로 변환
{
  city: data.name,                          // "Seoul"
  temperature: Math.round(data.main.temp),  // 20
  feelsLike: Math.round(data.main.feels_like), // 18
  humidity: data.main.humidity,             // 60
  windSpeed: data.wind.speed,               // 3.5
  description: data.weather[0].description, // "맑음"
  icon: data.weather[0].icon                // "01d"
}
```

#### 아이콘 코드 (일부)
```
01d: 맑음 (낮)
01n: 맑음 (밤)
02d: 약간 흐림
03d: 구름 많음
04d: 흐림
09d: 소나기
10d: 비
11d: 뇌우
13d: 눈
50d: 안개
```

전체 목록: https://openweathermap.org/weather-conditions

---

### 2. WeatherAPI.com

#### API 정보
- **버전**: v1 (명시적 버전 표기 없음)
- **베이스 URL**: `https://api.weatherapi.com/v1`
- **엔드포인트**: `/current.json`
- **공식 문서**: https://www.weatherapi.com/docs/

#### 인증 및 제약사항
```
✅ 기술적 제약:
- API Key 필수 (헤더 또는 쿼리 파라미터)
- 무료: 1,000,000 calls/month (일일 약 33,333 calls)
- 월별 리셋: 매월 1일
- HTTPS 필수

⚠️ 제약사항:
- 월 한도 초과 시 HTTP 403 (Forbidden)
- 무료 계정: 3일 예보만 제공
- 히스토리 데이터: 7일까지만 (유료: 무제한)
```

#### 요청 파라미터
```typescript
interface WeatherAPIRequest {
  key: string;     // API Key
  q: string;       // 도시명, 좌표, IP, 우편번호 등
  lang?: string;   // 언어 코드 (예: "ko")
  aqi?: 'yes' | 'no'; // 공기질 데이터 포함 여부
}
```

#### JSON 응답 구조
```json
{
  "location": {
    "name": "Seoul",
    "region": "",
    "country": "South Korea",
    "lat": 37.57,
    "lon": 126.98,
    "tz_id": "Asia/Seoul",
    "localtime_epoch": 1728345600,
    "localtime": "2025-10-08 12:00"
  },
  "current": {
    "last_updated_epoch": 1728345600,
    "last_updated": "2025-10-08 12:00",
    "temp_c": 20.5,
    "temp_f": 68.9,
    "is_day": 1,
    "condition": {
      "text": "Sunny",
      "icon": "//cdn.weatherapi.com/weather/64x64/day/113.png",
      "code": 1000
    },
    "wind_mph": 8.1,
    "wind_kph": 13.0,
    "wind_degree": 180,
    "wind_dir": "S",
    "pressure_mb": 1013,
    "pressure_in": 29.91,
    "precip_mm": 0,
    "precip_in": 0,
    "humidity": 60,
    "cloud": 0,
    "feelslike_c": 18.3,
    "feelslike_f": 64.9,
    "vis_km": 10,
    "vis_miles": 6,
    "uv": 5,
    "gust_mph": 11.4,
    "gust_kph": 18.4,
    "air_quality": {
      "co": 230.3,
      "no2": 15.5,
      "o3": 62.8,
      "pm2_5": 12.3,
      "pm10": 18.6
    }
  }
}
```

#### 핵심 필드 매핑
```typescript
{
  city: data.location.name,              // "Seoul"
  temperature: Math.round(data.current.temp_c), // 20
  feelsLike: Math.round(data.current.feelslike_c), // 18
  humidity: data.current.humidity,       // 60
  windSpeed: data.current.wind_kph / 3.6, // m/s로 변환 (3.61)
  description: data.current.condition.text, // "Sunny"
  icon: extractIconCode(data.current.condition.icon) // "113.png" → "113"
}
```

#### 아이콘 코드 (일부)
```
1000: Sunny (맑음)
1003: Partly cloudy (부분 흐림)
1006: Cloudy (흐림)
1009: Overcast (완전 흐림)
1063: Patchy rain possible (비 가능)
1180: Patchy light rain (약한 비)
1183: Light rain (비)
1186: Moderate rain (보통 비)
```

전체 목록: https://www.weatherapi.com/docs/weather-conditions.aspx

---

### 3. Open-Meteo

#### API 정보
- **버전**: v1
- **베이스 URL**: `https://api.open-meteo.com/v1`
- **엔드포인트**: `/forecast`
- **공식 문서**: https://open-meteo.com/en/docs

#### 인증 및 제약사항
```
✅ 기술적 제약:
- 비상업용: API Key 불필요
- 상업용: API Key 필수 (customer- prefix)
- 무료 (비상업): 무제한 calls, 10,000 calls/day 권장
- 리셋 기준: 해당 없음
- HTTPS, CORS 지원

⚠️ 제약사항:
- 과도한 사용 시 rate limiting (429) 가능
- 상업용은 유료 플랜 ($60/month ~)
- 한글 미지원 (모든 응답 영어)
```

#### 요청 파라미터
```typescript
interface OpenMeteoRequest {
  latitude: number;
  longitude: number;
  current_weather: boolean; // true for current weather
  hourly?: string;   // 쉼표 구분 변수 (예: "temperature_2m,humidity")
  timezone?: string; // 예: "Asia/Seoul"
  temperature_unit?: 'celsius' | 'fahrenheit';
  windspeed_unit?: 'kmh' | 'ms' | 'mph';
}
```

#### JSON 응답 구조
```json
{
  "latitude": 37.5,
  "longitude": 127.0,
  "generationtime_ms": 0.123,
  "utc_offset_seconds": 32400,
  "timezone": "Asia/Seoul",
  "timezone_abbreviation": "KST",
  "elevation": 38.0,
  "current_weather": {
    "temperature": 20.5,
    "windspeed": 13.0,
    "winddirection": 180,
    "weathercode": 0,
    "is_day": 1,
    "time": "2025-10-08T12:00"
  },
  "hourly_units": {
    "time": "iso8601",
    "temperature_2m": "°C",
    "relative_humidity_2m": "%"
  },
  "hourly": {
    "time": ["2025-10-08T00:00", "2025-10-08T01:00", "..."],
    "temperature_2m": [18.5, 19.0, 19.5, "..."],
    "relative_humidity_2m": [65, 63, 60, "..."]
  }
}
```

#### 핵심 필드 매핑
```typescript
// ⚠️ 주의: 도시 이름 제공 안 함 (역지오코딩 필요)
{
  city: await reverseGeocode(lat, lon), // 외부 서비스 필요
  temperature: Math.round(data.current_weather.temperature), // 20
  feelsLike: calculateApparentTemp(temp, humidity, wind), // 계산 필요
  humidity: data.hourly.relative_humidity_2m[currentHour], // hourly에서 추출
  windSpeed: data.current_weather.windspeed / 3.6, // m/s로 변환
  description: weatherCodeToDescription(data.current_weather.weathercode),
  icon: weatherCodeToIcon(data.current_weather.weathercode)
}
```

#### ⚠️ 중요: Open-Meteo Forecast API 습도 제한사항

**검증 완료 (2025-10-23)**:
- Open-Meteo Forecast API는 습도 데이터를 제공하지 **않습니다**
- 이는 버그가 아니라 **API 사양**입니다
- 모든 예보 응답에서 습도 관련 필드 누락

**영향**:
- Forecast API 사용 시 습도 예측 불가능
- 습도가 중요한 경우 다른 Provider 사용 필수
- 정확도 분석에서 습도 항목 제외됨

**대안**:
1. Current Weather API 사용 (습도 포함)
2. WeatherAPI 또는 OpenWeather 사용
3. Multi-provider 전략으로 습도만 별도 수집

**참고**: 9일간 데이터 수집 결과, 모든 Forecast API 응답에서 습도 0% 반환 확인
- 원인: API 파라미터 설정 오류가 아닌 API 자체 미지원
- 문서: https://open-meteo.com/en/docs (Forecast API는 온도/풍속/강수/날씨코드만 제공)

#### Weather Code (WMO 표준)
```
0: Clear sky (맑음)
1: Mainly clear (대체로 맑음)
2: Partly cloudy (부분 흐림)
3: Overcast (흐림)
45, 48: Fog (안개)
51, 53, 55: Drizzle (이슬비)
61, 63, 65: Rain (비)
71, 73, 75: Snow (눈)
80, 81, 82: Rain showers (소나기)
95: Thunderstorm (뇌우)
```

전체 목록: https://open-meteo.com/en/docs#weathervariables

---

## 🔄 필드 매핑 비교표

| 도메인 필드 | OpenWeatherMap | WeatherAPI.com | Open-Meteo |
|-------------|----------------|----------------|------------|
| **city** | `name` | `location.name` | ❌ (역지오코딩 필요) |
| **temperature** | `main.temp` | `current.temp_c` | `current_weather.temperature` |
| **feelsLike** | `main.feels_like` | `current.feelslike_c` | ❌ (계산 필요) |
| **humidity** | `main.humidity` | `current.humidity` | `hourly.relative_humidity_2m[now]` |
| **windSpeed** | `wind.speed` (m/s) | `current.wind_kph` (÷3.6) | `current_weather.windspeed` (÷3.6) |
| **description** | `weather[0].description` | `current.condition.text` | WMO Code → 변환 |
| **icon** | `weather[0].icon` | `condition.icon` (URL) | WMO Code → 매핑 |

---

## 🎨 아이콘 통합 전략

### 문제점
- OpenWeatherMap: 코드 (`01d`, `02d`, ...)
- WeatherAPI.com: URL (`//cdn.weatherapi.com/.../113.png`)
- Open-Meteo: WMO 코드 (`0`, `1`, `2`, ...)

### 제안: 통합 아이콘 매핑 테이블

**기준**: OpenWeatherMap 아이콘 코드를 표준으로 사용

```typescript
// types/domain/weatherIcon.ts
export const WEATHER_ICON_MAP = {
  // OpenWeatherMap 기준
  '01d': { description: '맑음 (낮)', wmo: [0, 1], weatherapi: 1000 },
  '01n': { description: '맑음 (밤)', wmo: [0, 1], weatherapi: 1000 },
  '02d': { description: '약간 흐림', wmo: [2], weatherapi: 1003 },
  '03d': { description: '구름 많음', wmo: [3], weatherapi: 1006 },
  '04d': { description: '흐림', wmo: [3], weatherapi: 1009 },
  '09d': { description: '소나기', wmo: [80, 81, 82], weatherapi: 1240 },
  '10d': { description: '비', wmo: [61, 63, 65], weatherapi: 1183 },
  '11d': { description: '뇌우', wmo: [95, 96, 99], weatherapi: 1276 },
  '13d': { description: '눈', wmo: [71, 73, 75], weatherapi: 1213 },
  '50d': { description: '안개', wmo: [45, 48], weatherapi: 1135 },
};

// 역변환 함수
export function weatherApiToStandard(code: number): string {
  // WeatherAPI code 1000 → "01d"
}

export function wmoToStandard(code: number, isDay: boolean): string {
  // WMO code 0 + isDay=true → "01d"
}
```

---

## 📋 통합 Mock JSON 구조 제안

### 요구사항
1. 모든 API의 필드를 포함
2. 도메인 타입으로 쉽게 변환 가능
3. 개발자가 데이터 구조 이해 용이

### 제안 구조 (Option A: 도메인 중심)
```json
{
  "version": "1.0",
  "cities": {
    "서울": {
      "location": {
        "name": "Seoul",
        "name_ko": "서울",
        "latitude": 37.5683,
        "longitude": 126.9778,
        "timezone": "Asia/Seoul",
        "country": "KR"
      },
      "current": {
        "temperature": 20.5,
        "feelsLike": 18.3,
        "humidity": 60,
        "pressure": 1013,
        "windSpeed": 3.5,
        "windDirection": 180,
        "cloudiness": 0,
        "visibility": 10000,
        "uvIndex": 5
      },
      "weather": {
        "description": "맑음",
        "description_en": "Clear",
        "icon": "01d",
        "code": {
          "openweather": 800,
          "weatherapi": 1000,
          "wmo": 0
        }
      },
      "timestamp": "2025-10-08T12:00:00+09:00"
    },
    "부산": { "..." },
    "제주": { "..." }
  },
  "default": {
    "location": {
      "name": "Unknown",
      "name_ko": "알 수 없음"
    },
    "current": {
      "temperature": 15,
      "humidity": 50
    },
    "weather": {
      "description": "데이터 없음",
      "icon": "01d"
    }
  }
}
```

### 제안 구조 (Option B: API 원본 포함)
```json
{
  "version": "1.0",
  "cities": {
    "서울": {
      "domain": {
        "city": "서울",
        "temperature": 20,
        "feelsLike": 18,
        "humidity": 60,
        "windSpeed": 3.5,
        "description": "맑음",
        "icon": "01d"
      },
      "raw": {
        "openweather": {
          "name": "Seoul",
          "main": { "temp": 20.5, "feels_like": 18.3, "humidity": 60 },
          "weather": [{ "description": "맑음", "icon": "01d" }],
          "wind": { "speed": 3.5 }
        },
        "weatherapi": {
          "location": { "name": "Seoul" },
          "current": {
            "temp_c": 20.5,
            "feelslike_c": 18.3,
            "humidity": 60,
            "wind_kph": 12.6,
            "condition": { "text": "Sunny", "code": 1000 }
          }
        },
        "openmeteo": {
          "current_weather": {
            "temperature": 20.5,
            "windspeed": 12.6,
            "weathercode": 0
          }
        }
      }
    }
  }
}
```

---

## 🤔 제안 및 질문

### 기술적 제약 관점

**Option A (도메인 중심)의 장점**:
- 간결하고 읽기 쉬움
- 어댑터 구현이 단순 (Mock → Domain 변환 1단계)
- 파일 크기 작음

**Option A의 단점**:
- API 원본 구조를 학습할 수 없음
- 새 API 추가 시 참고 자료 부족

**Option B (원본 포함)의 장점**:
- 실제 API 응답 구조 학습 가능
- 어댑터 개발 시 참고 자료로 사용
- 디버깅 용이 (예상 응답과 비교)

**Option B의 단점**:
- 파일 크기 큼 (3배 이상)
- 구조 복잡

### 사용자 경험 관점

**개발자 경험 (Option A)**:
- 빠른 이해
- 간단한 수정

**개발자 경험 (Option B)**:
- 학습 자료로 활용
- 실제 API와 Mock의 차이 확인 가능

---

## ❓ 사용자 결정 요청

**Q2-1 최종 질문**:

다음 중 선택해주세요:

1. **Mock JSON 구조**:
   - **A**: Option A (도메인 중심, 간결)
   - **B**: Option B (API 원본 포함, 학습 자료)
   - **C**: 하이브리드 (도메인 + OpenWeather 원본만)

2. **포함할 도시**:
   - 기본 제안: 서울, 부산, 제주, 인천, 대구, 대전, 광주, 울산
   - 추가/변경할 도시가 있나요?

3. **날씨 상태 다양성**:
   - 모든 도시 다른 날씨? (서울: 맑음, 부산: 비, 제주: 흐림, ...)
   - 아니면 현실적 데이터? (계절 고려)

4. **Timestamp 처리**:
   - 고정 시간 사용? (예: 2025-10-08 12:00)
   - 현재 시간 사용? (Mock 호출 시점의 실시간)

5. **아이콘 매핑 테이블**:
   - 위 제안대로 OpenWeatherMap 기준 통합?
   - 수정 사항이 있나요?

---

**다음 단계**: 사용자 답변 후 Mock JSON 파일 및 아이콘 매핑 테이블 생성

