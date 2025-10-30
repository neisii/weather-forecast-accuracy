/**
 * Open-Meteo Adapter
 *
 * 공식 문서: https://open-meteo.com/en/docs
 *
 * API 특징:
 * - 완전 무료 (API 키 불필요)
 * - 무제한 호출 (실제로는 10,000 calls/day per IP)
 * - WMO Weather Code 사용 (World Meteorological Organization 표준)
 * - Apparent Temperature 제공 (체감 온도)
 *
 * 주의사항:
 * - 도시 이름 대신 위도/경도 좌표 필요
 * - 낮/밤 구분 미제공 → 현재 시각 기반 판단 필요
 */

import axios from "axios";
import type {
  WeatherProvider,
  CurrentWeather,
  QuotaInfo,
  WeatherForecast,
} from "./WeatherProvider";
import type {
  WeatherCondition,
  TemperatureForecast,
  LocationInfo,
} from "@/types/domain/weather";
import { wmoToStandard } from "../../types/domain/weatherIcon";
import { CITY_COORDINATES } from "../../config/cityCoordinates";

/**
 * Open-Meteo API 응답 타입
 */
interface OpenMeteoResponse {
  latitude: number;
  longitude: number;
  generationtime_ms: number;
  utc_offset_seconds: number;
  timezone: string;
  timezone_abbreviation: string;
  elevation: number;
  current_units: {
    time: string;
    interval: string;
    temperature_2m: string;
    relative_humidity_2m: string;
    apparent_temperature: string;
    weather_code: string;
    wind_speed_10m: string;
  };
  current: {
    time: string;
    interval: number;
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    weather_code: number;
    wind_speed_10m: number;
  };
}

/**
 * Open-Meteo Forecast API 응답 타입
 */
interface OpenMeteoForecastResponse {
  latitude: number;
  longitude: number;
  generationtime_ms: number;
  utc_offset_seconds: number;
  timezone: string;
  timezone_abbreviation: string;
  elevation: number;
  daily_units: {
    time: string;
    weather_code: string;
    temperature_2m_max: string;
    temperature_2m_min: string;
    apparent_temperature_max: string;
    apparent_temperature_min: string;
    precipitation_sum: string;
    precipitation_probability_max: string;
    wind_speed_10m_max: string;
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    apparent_temperature_max: number[];
    apparent_temperature_min: number[];
    precipitation_sum: number[];
    precipitation_probability_max: number[];
    wind_speed_10m_max: number[];
  };
}

const BASE_URL = "https://api.open-meteo.com/v1/forecast";

/**
 * Open-Meteo Adapter 구현체
 */
export class OpenMeteoAdapter implements WeatherProvider {
  readonly name = "Open-Meteo";

  /**
   * Get weather forecast for a city (Phase 6: Accuracy Tracking)
   */
  async getForecast(
    cityName: string,
    days: number = 1,
  ): Promise<WeatherForecast[]> {
    // 1. 도시 이름 → 좌표 변환
    const coordinates = this.getCityCoordinates(cityName);
    if (!coordinates) {
      throw new Error(
        `Open-Meteo: 도시 "${cityName}"의 좌표 정보를 찾을 수 없습니다. ` +
          `지원되는 도시 목록을 확인하세요.`,
      );
    }

    try {
      // 2. API 호출
      const response = await axios.get<OpenMeteoForecastResponse>(BASE_URL, {
        params: {
          latitude: coordinates.lat,
          longitude: coordinates.lon,
          daily: [
            "weather_code",
            "temperature_2m_max",
            "temperature_2m_min",
            "apparent_temperature_max",
            "apparent_temperature_min",
            "precipitation_sum",
            "precipitation_probability_max",
            "wind_speed_10m_max",
          ].join(","),
          timezone: "auto",
          forecast_days: days,
        },
      });

      // 3. 응답 → 도메인 타입 변환
      return this.transformForecastToDomain(
        response.data,
        cityName,
        coordinates.country,
      );
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const message = error.response?.data?.reason || error.message;

        switch (status) {
          case 400:
            throw new Error(
              `Open-Meteo 잘못된 요청: 좌표 정보가 잘못되었습니다. (${message})`,
            );
          case 429:
            throw new Error(
              `Open-Meteo Rate Limit 초과: 일일 10,000회 제한을 초과했습니다. (${message})`,
            );
          default:
            throw new Error(`Open-Meteo 에러: ${message}`);
        }
      }
      throw error;
    }
  }

  /**
   * 현재 날씨 조회
   */
  async getCurrentWeather(city: string): Promise<CurrentWeather> {
    // 1. 도시 이름 → 좌표 변환
    const coordinates = this.getCityCoordinates(city);
    if (!coordinates) {
      throw new Error(
        `Open-Meteo: 도시 "${city}"의 좌표 정보를 찾을 수 없습니다. ` +
          `지원되는 도시 목록을 확인하세요.`,
      );
    }

    try {
      // 2. API 호출
      const response = await axios.get<OpenMeteoResponse>(BASE_URL, {
        params: {
          latitude: coordinates.lat,
          longitude: coordinates.lon,
          current: [
            "temperature_2m",
            "relative_humidity_2m",
            "apparent_temperature",
            "weather_code",
            "wind_speed_10m",
          ].join(","),
          timezone: "auto",
        },
      });

      // 3. 응답 → 도메인 타입 변환
      return this.transformToDomain(response.data, city, coordinates.country);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const message = error.response?.data?.reason || error.message;

        switch (status) {
          case 400:
            throw new Error(
              `Open-Meteo 잘못된 요청: 좌표 정보가 잘못되었습니다. (${message})`,
            );
          case 429:
            throw new Error(
              `Open-Meteo Rate Limit 초과: 일일 10,000회 제한을 초과했습니다. (${message})`,
            );
          default:
            throw new Error(`Open-Meteo 에러: ${message}`);
        }
      }
      throw error;
    }
  }

  /**
   * Quota 정보 조회
   * Open-Meteo는 무료/무제한이므로 항상 정상 상태 반환
   */
  async checkQuota(): Promise<QuotaInfo> {
    return {
      used: 0,
      limit: Number.POSITIVE_INFINITY, // 무제한 표시
      resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24시간 후 (의미 없음)
      percentage: 0,
      status: "normal",
    };
  }

  /**
   * Open-Meteo 응답 → 도메인 타입 변환
   */
  private transformToDomain(
    data: OpenMeteoResponse,
    cityName: string,
    country: string,
  ): CurrentWeather {
    const { current } = data;

    // 낮/밤 구분
    const isDay = this.isDaytime(
      data.latitude,
      data.longitude,
      new Date(current.time),
    );

    // WMO code → OpenWeatherMap 표준 아이콘
    const iconCode = wmoToStandard(current.weather_code, isDay);

    // WMO code → 설명
    const description = this.getWeatherDescription(current.weather_code);

    return {
      location: {
        name: cityName,
        country: country,
        coordinates: {
          lat: data.latitude,
          lon: data.longitude,
        },
        timezone: data.timezone,
      },
      current: {
        temperature: current.temperature_2m,
        feelsLike: current.apparent_temperature,
        humidity: current.relative_humidity_2m,
        pressure: 1013, // Open-Meteo doesn't provide pressure in basic call
        windSpeed: current.wind_speed_10m / 3.6, // kph → m/s
        windDirection: 0, // Not available in basic call
        cloudiness: 0, // Not available in basic call
        visibility: 10000, // Default 10km
        uvIndex: 0, // Not available in basic call
      },
      weather: {
        main: description,
        description: description,
        descriptionKo: description,
        icon: iconCode,
      },
      timestamp: new Date(current.time),
    };
  }

  /**
   * 도시 이름 → 좌표 변환
   */
  private getCityCoordinates(
    city: string,
  ): { lat: number; lon: number; country: string } | null {
    const cityData = CITY_COORDINATES[city];
    if (!cityData) {
      return null;
    }

    return {
      lat: cityData.lat,
      lon: cityData.lon,
      country: cityData.country,
    };
  }

  /**
   * 낮/밤 구분 로직
   *
   * Open-Meteo는 is_day 필드를 제공하지 않으므로,
   * 현재 시각과 위도/경도 기반으로 간단히 판단
   *
   * 간단한 구현: 6시~18시는 낮, 나머지는 밤
   * (경도 기반 시차 보정 포함)
   *
   * @param _latitude - 위도 (현재 미사용, 향후 일출/일몰 계산에 사용 가능)
   * @param longitude - 경도
   * @param currentTime - 현재 시각 (UTC)
   * @returns true: 낮, false: 밤
   */
  private isDaytime(
    _latitude: number,
    longitude: number,
    currentTime: Date,
  ): boolean {
    // UTC 시간 가져오기
    const utcHour = currentTime.getUTCHours();

    // 경도 기반 시차 보정 (경도 15도당 1시간)
    const timezoneOffset = longitude / 15;
    const localHour = (utcHour + timezoneOffset + 24) % 24;

    // 간단한 낮/밤 구분: 6시~18시는 낮
    // 더 정확한 구현을 원하면 sunrise/sunset 계산 라이브러리 사용 가능
    return localHour >= 6 && localHour < 18;
  }

  /**
   * WMO Weather Code → 한글 설명
   *
   * WMO Code 기준:
   * - 0: Clear sky
   * - 1, 2, 3: Mainly clear, partly cloudy, overcast
   * - 45, 48: Fog
   * - 51, 53, 55: Drizzle
   * - 61, 63, 65: Rain
   * - 71, 73, 75: Snow fall
   * - 77: Snow grains
   * - 80, 81, 82: Rain showers
   * - 85, 86: Snow showers
   * - 95: Thunderstorm
   * - 96, 99: Thunderstorm with hail
   *
   * @param wmoCode - WMO 날씨 코드
   * @returns 한글 설명
   */
  private getWeatherDescription(wmoCode: number): string {
    const descriptions: Record<number, string> = {
      0: "맑음",
      1: "대체로 맑음",
      2: "부분적으로 흐림",
      3: "흐림",
      45: "안개",
      48: "짙은 안개",
      51: "가벼운 이슬비",
      53: "이슬비",
      55: "강한 이슬비",
      56: "가벼운 어는 이슬비",
      57: "강한 어는 이슬비",
      61: "가벼운 비",
      63: "비",
      65: "강한 비",
      66: "가벼운 어는 비",
      67: "강한 어는 비",
      71: "가벼운 눈",
      73: "눈",
      75: "강한 눈",
      77: "진눈깨비",
      80: "가벼운 소나기",
      81: "소나기",
      82: "강한 소나기",
      85: "가벼운 눈 소나기",
      86: "강한 눈 소나기",
      95: "뇌우",
      96: "약한 우박을 동반한 뇌우",
      99: "강한 우박을 동반한 뇌우",
    };

    return descriptions[wmoCode] || "알 수 없음";
  }

  /**
   * Provider 설정 검증
   * Open-Meteo는 API 키가 필요없으므로 항상 유효
   */
  async validateConfig(): Promise<boolean> {
    return true;
  }

  /**
   * Transform forecast response to domain types
   */
  private transformForecastToDomain(
    data: OpenMeteoForecastResponse,
    cityName: string,
    country: string,
  ): WeatherForecast[] {
    const location: LocationInfo = {
      name: cityName,
      country: country,
      coordinates: {
        lat: data.latitude,
        lon: data.longitude,
      },
      timezone: data.timezone,
    };

    const forecasts: WeatherForecast[] = [];

    for (let i = 0; i < data.daily.time.length; i++) {
      const timeValue = data.daily.time[i];
      const weatherCode = data.daily.weather_code[i];
      const tempMin = data.daily.temperature_2m_min[i];
      const tempMax = data.daily.temperature_2m_max[i];
      const windSpeed = data.daily.wind_speed_10m_max[i];
      const precipProb = data.daily.precipitation_probability_max?.[i];

      // Skip if required data is missing
      if (
        timeValue === undefined ||
        weatherCode === undefined ||
        tempMin === undefined ||
        tempMax === undefined ||
        windSpeed === undefined
      ) {
        continue;
      }

      const targetDate = new Date(timeValue);

      // WMO code → OpenWeatherMap 표준 아이콘 (assume daytime for daily forecast)
      const iconCode = wmoToStandard(weatherCode, true);
      const description = this.getWeatherDescription(weatherCode);

      const weather: WeatherCondition = {
        main: description,
        description: description,
        descriptionKo: description,
        icon: iconCode,
      };

      const temperature: TemperatureForecast = {
        min: tempMin,
        max: tempMax,
        day: (tempMax + tempMin) / 2, // Average
        night: tempMin, // Use min as night temp
      };

      forecasts.push({
        location,
        targetDate,
        predictedAt: new Date(),
        temperature,
        weather,
        humidity: 0, // Open-Meteo doesn't provide humidity in daily forecast
        windSpeed: windSpeed / 3.6, // kph → m/s
        precipitationProbability: precipProb || 0,
      });
    }

    return forecasts;
  }
}
