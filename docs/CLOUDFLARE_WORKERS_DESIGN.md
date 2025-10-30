# Cloudflare Workers 백엔드 프록시 설계

**작성일**: 2025-10-30  
**목적**: Weather API 프록시 서버 상세 설계 문서

---

## 📐 아키텍처 상세 설계

### 디렉토리 구조

```
weather-proxy/                    # Cloudflare Workers 프로젝트
├── src/
│   ├── index.ts                  # 메인 Worker 엔트리포인트
│   ├── handlers/
│   │   ├── openweather.ts        # OpenWeatherMap 핸들러
│   │   ├── weatherapi.ts         # WeatherAPI 핸들러
│   │   └── openmeteo.ts          # Open-Meteo 핸들러
│   ├── utils/
│   │   ├── cors.ts               # CORS 헤더 유틸
│   │   ├── errors.ts             # 에러 핸들링
│   │   └── response.ts           # 표준 응답 포맷
│   └── types/
│       └── env.ts                # 환경 변수 타입
├── wrangler.toml                 # Cloudflare 설정 파일
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🔌 API 엔드포인트 설계

### 1. OpenWeatherMap 프록시

#### Current Weather
```
GET /api/openweather/current?city={city}

Parameters:
  - city (required): 도시 이름 (예: Seoul, Busan)

Response: 200 OK
{
  "coord": { "lon": 126.9778, "lat": 37.5683 },
  "weather": [
    {
      "id": 800,
      "main": "Clear",
      "description": "clear sky",
      "icon": "01d"
    }
  ],
  "main": {
    "temp": 15.2,
    "feels_like": 14.5,
    "temp_min": 13.0,
    "temp_max": 17.0,
    "pressure": 1013,
    "humidity": 65
  },
  "wind": {
    "speed": 3.5,
    "deg": 180
  },
  "name": "Seoul"
}

Error Response: 404 Not Found
{
  "error": {
    "code": "CITY_NOT_FOUND",
    "message": "City not found",
    "provider": "openweather"
  }
}
```

#### Forecast
```
GET /api/openweather/forecast?city={city}

Parameters:
  - city (required): 도시 이름

Response: 200 OK
{
  "city": {
    "name": "Seoul",
    "coord": { "lat": 37.5683, "lon": 126.9778 }
  },
  "list": [
    {
      "dt": 1698667200,
      "main": { "temp": 15.2, ... },
      "weather": [...],
      "wind": { "speed": 3.5, ... }
    },
    ...
  ]
}
```

### 2. WeatherAPI 프록시

#### Current Weather
```
GET /api/weatherapi/current?city={city}

Parameters:
  - city (required): 도시 이름

Response: 200 OK
{
  "location": {
    "name": "Seoul",
    "region": "Seoul",
    "country": "South Korea",
    "lat": 37.57,
    "lon": 126.98
  },
  "current": {
    "temp_c": 15.2,
    "temp_f": 59.4,
    "is_day": 1,
    "condition": {
      "text": "Partly cloudy",
      "icon": "//cdn.weatherapi.com/weather/64x64/day/116.png",
      "code": 1003
    },
    "wind_kph": 12.6,
    "wind_dir": "S",
    "humidity": 65,
    "feelslike_c": 14.5
  }
}
```

#### Forecast
```
GET /api/weatherapi/forecast?city={city}

Parameters:
  - city (required): 도시 이름

Response: 200 OK
{
  "location": { ... },
  "current": { ... },
  "forecast": {
    "forecastday": [
      {
        "date": "2025-10-30",
        "day": {
          "maxtemp_c": 18.0,
          "mintemp_c": 12.0,
          "avgtemp_c": 15.0,
          "condition": { ... }
        },
        "hour": [
          {
            "time": "2025-10-30 00:00",
            "temp_c": 15.2,
            ...
          },
          ...
        ]
      }
    ]
  }
}
```

### 3. Open-Meteo 프록시

#### Current + Forecast
```
GET /api/openmeteo?lat={lat}&lon={lon}

Parameters:
  - lat (required): 위도
  - lon (required): 경도

Response: 200 OK
{
  "latitude": 37.5683,
  "longitude": 126.9778,
  "current_weather": {
    "temperature": 15.2,
    "windspeed": 12.5,
    "winddirection": 180,
    "weathercode": 0,
    "time": "2025-10-30T15:00"
  },
  "hourly": {
    "time": ["2025-10-30T00:00", ...],
    "temperature_2m": [14.5, 15.2, ...],
    "windspeed_10m": [10.0, 12.5, ...],
    "weathercode": [0, 1, ...]
  }
}
```

---

## 💻 구현 상세

### 메인 Worker (src/index.ts)

```typescript
import { handleOpenWeatherCurrent, handleOpenWeatherForecast } from './handlers/openweather';
import { handleWeatherAPICurrent, handleWeatherAPIForecast } from './handlers/weatherapi';
import { handleOpenMeteo } from './handlers/openmeteo';
import { corsHeaders, handleOptions } from './utils/cors';
import { errorResponse } from './utils/errors';

export interface Env {
  OPENWEATHER_API_KEY: string;
  WEATHERAPI_API_KEY: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return handleOptions();
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // OpenWeatherMap 라우팅
      if (path === '/api/openweather/current') {
        return await handleOpenWeatherCurrent(url, env);
      }
      if (path === '/api/openweather/forecast') {
        return await handleOpenWeatherForecast(url, env);
      }

      // WeatherAPI 라우팅
      if (path === '/api/weatherapi/current') {
        return await handleWeatherAPICurrent(url, env);
      }
      if (path === '/api/weatherapi/forecast') {
        return await handleWeatherAPIForecast(url, env);
      }

      // Open-Meteo 라우팅
      if (path === '/api/openmeteo') {
        return await handleOpenMeteo(url);
      }

      // 404 Not Found
      return errorResponse('NOT_FOUND', 'Endpoint not found', 404);
    } catch (error) {
      console.error('Worker error:', error);
      return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
    }
  },
};
```

### OpenWeather Handler (src/handlers/openweather.ts)

```typescript
import { Env } from '../index';
import { corsHeaders } from '../utils/cors';
import { errorResponse } from '../utils/errors';
import { jsonResponse } from '../utils/response';

export async function handleOpenWeatherCurrent(
  url: URL,
  env: Env
): Promise<Response> {
  const city = url.searchParams.get('city');

  if (!city) {
    return errorResponse('MISSING_PARAMETER', 'city parameter is required', 400);
  }

  try {
    const apiUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${env.OPENWEATHER_API_KEY}&units=metric&lang=kr`;
    
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (!response.ok) {
      return errorResponse(
        'PROVIDER_ERROR',
        data.message || 'Failed to fetch weather data',
        response.status,
        'openweather'
      );
    }

    return jsonResponse(data);
  } catch (error) {
    console.error('OpenWeather API error:', error);
    return errorResponse('FETCH_ERROR', 'Failed to fetch from OpenWeather', 502);
  }
}

export async function handleOpenWeatherForecast(
  url: URL,
  env: Env
): Promise<Response> {
  const city = url.searchParams.get('city');

  if (!city) {
    return errorResponse('MISSING_PARAMETER', 'city parameter is required', 400);
  }

  try {
    const apiUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&appid=${env.OPENWEATHER_API_KEY}&units=metric&lang=kr`;
    
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (!response.ok) {
      return errorResponse(
        'PROVIDER_ERROR',
        data.message || 'Failed to fetch forecast data',
        response.status,
        'openweather'
      );
    }

    return jsonResponse(data);
  } catch (error) {
    console.error('OpenWeather Forecast API error:', error);
    return errorResponse('FETCH_ERROR', 'Failed to fetch from OpenWeather', 502);
  }
}
```

### WeatherAPI Handler (src/handlers/weatherapi.ts)

```typescript
import { Env } from '../index';
import { errorResponse } from '../utils/errors';
import { jsonResponse } from '../utils/response';

export async function handleWeatherAPICurrent(
  url: URL,
  env: Env
): Promise<Response> {
  const city = url.searchParams.get('city');

  if (!city) {
    return errorResponse('MISSING_PARAMETER', 'city parameter is required', 400);
  }

  try {
    const apiUrl = `https://api.weatherapi.com/v1/current.json?key=${env.WEATHERAPI_API_KEY}&q=${encodeURIComponent(city)}&aqi=no`;
    
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (!response.ok) {
      return errorResponse(
        'PROVIDER_ERROR',
        data.error?.message || 'Failed to fetch weather data',
        response.status,
        'weatherapi'
      );
    }

    return jsonResponse(data);
  } catch (error) {
    console.error('WeatherAPI error:', error);
    return errorResponse('FETCH_ERROR', 'Failed to fetch from WeatherAPI', 502);
  }
}

export async function handleWeatherAPIForecast(
  url: URL,
  env: Env
): Promise<Response> {
  const city = url.searchParams.get('city');

  if (!city) {
    return errorResponse('MISSING_PARAMETER', 'city parameter is required', 400);
  }

  try {
    // WeatherAPI는 forecast 엔드포인트에서 current도 포함
    const apiUrl = `https://api.weatherapi.com/v1/forecast.json?key=${env.WEATHERAPI_API_KEY}&q=${encodeURIComponent(city)}&days=3&aqi=no`;
    
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (!response.ok) {
      return errorResponse(
        'PROVIDER_ERROR',
        data.error?.message || 'Failed to fetch forecast data',
        response.status,
        'weatherapi'
      );
    }

    return jsonResponse(data);
  } catch (error) {
    console.error('WeatherAPI Forecast error:', error);
    return errorResponse('FETCH_ERROR', 'Failed to fetch from WeatherAPI', 502);
  }
}
```

### Open-Meteo Handler (src/handlers/openmeteo.ts)

```typescript
import { errorResponse } from '../utils/errors';
import { jsonResponse } from '../utils/response';

export async function handleOpenMeteo(url: URL): Promise<Response> {
  const lat = url.searchParams.get('lat');
  const lon = url.searchParams.get('lon');

  if (!lat || !lon) {
    return errorResponse('MISSING_PARAMETER', 'lat and lon parameters are required', 400);
  }

  try {
    const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=temperature_2m,windspeed_10m,weathercode&timezone=Asia/Seoul`;
    
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (!response.ok) {
      return errorResponse(
        'PROVIDER_ERROR',
        'Failed to fetch weather data',
        response.status,
        'openmeteo'
      );
    }

    return jsonResponse(data);
  } catch (error) {
    console.error('Open-Meteo API error:', error);
    return errorResponse('FETCH_ERROR', 'Failed to fetch from Open-Meteo', 502);
  }
}
```

### CORS Utils (src/utils/cors.ts)

```typescript
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // 개발 중에는 *, 프로덕션에서는 특정 도메인
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400', // 24시간
};

export function handleOptions(): Response {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}
```

### Error Utils (src/utils/errors.ts)

```typescript
import { corsHeaders } from './cors';

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    provider?: string;
  };
}

export function errorResponse(
  code: string,
  message: string,
  status: number,
  provider?: string
): Response {
  const body: ErrorResponse = {
    error: {
      code,
      message,
      ...(provider && { provider }),
    },
  };

  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}
```

### Response Utils (src/utils/response.ts)

```typescript
import { corsHeaders } from './cors';

export function jsonResponse(data: any, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}
```

---

## 🔧 Configuration

### wrangler.toml

```toml
name = "weather-proxy"
main = "src/index.ts"
compatibility_date = "2025-10-30"

# Workers 설정
workers_dev = true
route = ""
zone_id = ""

# 빌드 설정
[build]
command = "npm run build"

[build.upload]
format = "modules"
main = "./dist/index.js"

# 개발 환경 변수 (로컬 테스트용)
[vars]
ENVIRONMENT = "development"

# Secrets는 wrangler secret put으로 설정
# OPENWEATHER_API_KEY
# WEATHERAPI_API_KEY
```

### package.json

```json
{
  "name": "weather-proxy",
  "version": "1.0.0",
  "description": "Cloudflare Workers proxy for weather APIs",
  "main": "src/index.ts",
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "tail": "wrangler tail",
    "build": "tsc"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20241022.0",
    "typescript": "^5.6.3",
    "wrangler": "^3.80.4"
  }
}
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "lib": ["ES2022"],
    "types": ["@cloudflare/workers-types"],
    "moduleResolution": "node",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

---

## 🚀 배포 프로세스

### 1. 초기 설정

```bash
# Wrangler 설치 (글로벌)
npm install -g wrangler

# Cloudflare 로그인
wrangler login

# 프로젝트 생성
wrangler init weather-proxy
cd weather-proxy

# 의존성 설치
npm install
```

### 2. 개발

```bash
# 로컬 개발 서버 실행
wrangler dev

# 테스트
curl http://localhost:8787/api/openweather/current?city=Seoul
```

### 3. Secrets 설정

```bash
# OpenWeatherMap API 키 설정
wrangler secret put OPENWEATHER_API_KEY
# 프롬프트에 실제 키 입력 (실제 키는 .env 파일 참조)

# WeatherAPI 키 설정
wrangler secret put WEATHERAPI_API_KEY
# 프롬프트에 실제 키 입력
```

### 4. 배포

```bash
# 프로덕션 배포
wrangler deploy

# 배포 후 URL 확인
# https://weather-proxy.{subdomain}.workers.dev
```

### 5. 테스트

```bash
# 실제 배포된 Worker 테스트
curl https://weather-proxy.{subdomain}.workers.dev/api/openweather/current?city=Seoul

# 로그 확인
wrangler tail
```

---

## 🔒 보안 체크리스트

### 코드 레벨
- [ ] API 키 하드코딩 없음
- [ ] 환경 변수만 사용 (`env.OPENWEATHER_API_KEY`)
- [ ] 에러 메시지에 API 키 노출 없음
- [ ] 로그에 민감 정보 없음

### 설정 레벨
- [ ] wrangler.toml에 API 키 없음
- [ ] Secrets로만 관리
- [ ] CORS 정책 설정 (프로덕션: 특정 도메인만)
- [ ] Rate limiting 고려 (선택적)

### 배포 레벨
- [ ] Git에 .env 커밋 안 됨
- [ ] wrangler.toml에 민감 정보 없음
- [ ] Secrets 별도 설정 완료
- [ ] 배포 후 API 키 노출 확인

---

## 📊 모니터링

### Cloudflare Dashboard

**메트릭 확인**:
1. Cloudflare Dashboard 로그인
2. Workers & Pages → Overview
3. "weather-proxy" 선택
4. Analytics 탭

**제공 정보**:
- Requests/분
- Success rate
- Error rate
- Duration (P50, P99)
- Bandwidth

### 실시간 로그

```bash
# 실시간 로그 스트리밍
wrangler tail

# 특정 상태 코드만 필터링
wrangler tail --status 200
wrangler tail --status error
```

### 알림 설정 (선택적)

Cloudflare Dashboard → Notifications:
- 에러율 10% 이상
- 일일 사용량 80% 이상
- 응답 시간 1초 이상

---

## 🧪 테스트 전략

### 로컬 테스트

```bash
# 개발 서버 실행
wrangler dev

# 각 엔드포인트 테스트
curl http://localhost:8787/api/openweather/current?city=Seoul
curl http://localhost:8787/api/weatherapi/current?city=Busan
curl http://localhost:8787/api/openmeteo?lat=37.5683&lon=126.9778

# 에러 케이스 테스트
curl http://localhost:8787/api/openweather/current?city=InvalidCity
curl http://localhost:8787/api/openweather/current  # city 파라미터 없음
```

### 통합 테스트 (프론트엔드)

```typescript
// 프론트엔드에서 테스트
const response = await fetch(
  'https://weather-proxy.{subdomain}.workers.dev/api/openweather/current?city=Seoul'
);
console.log(await response.json());
```

### 성능 테스트

```bash
# Apache Bench로 부하 테스트
ab -n 1000 -c 10 https://weather-proxy.{subdomain}.workers.dev/api/openweather/current?city=Seoul

# 결과 확인
# - Requests per second
# - Time per request
# - 95th percentile latency
```

---

## 📚 참고 자료

### Cloudflare Workers 문서
- [Get Started Guide](https://developers.cloudflare.com/workers/get-started/)
- [Workers Examples](https://developers.cloudflare.com/workers/examples/)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)
- [Secrets Management](https://developers.cloudflare.com/workers/configuration/secrets/)

### TypeScript 타입
- [@cloudflare/workers-types](https://www.npmjs.com/package/@cloudflare/workers-types)

### CORS 처리
- [CORS Header Proxy Example](https://developers.cloudflare.com/workers/examples/cors-header-proxy/)

---

**작성자**: AI Assistant  
**최종 업데이트**: 2025-10-30  
**다음 단계**: 구현 시작 (Phase 1)
