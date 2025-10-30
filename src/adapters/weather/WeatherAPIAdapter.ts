/**
 * WeatherAPI.com Adapter
 *
 * 공식 문서: https://www.weatherapi.com/docs/
 *
 * API 특징:
 * - Free tier: 1,000,000 calls/month
 * - Pro Plus Plan Trial: 2025/10/22까지
 * - Real-time weather, 14 day forecast
 * - 자동 낮/밤 구분 (is_day 필드 제공)
 *
 * Rate Limits:
 * - Free: 1,000,000 calls/month
 * - Pro Plus: 더 높은 제한 (trial 기간 동안 적용)
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
import { weatherApiToStandard } from "../../types/domain/weatherIcon";
import { getCityCoordinate } from "@/config/cityCoordinates";
import { getStorageItem, setStorageItem } from "./storage";

/**
 * WeatherAPI.com API 응답 타입
 */
interface WeatherAPIResponse {
  location: {
    name: string;
    region: string;
    country: string;
    lat: number;
    lon: number;
    tz_id: string;
    localtime_epoch: number;
    localtime: string;
  };
  current: {
    last_updated_epoch: number;
    last_updated: string;
    temp_c: number;
    temp_f: number;
    is_day: number; // 1: day, 0: night
    condition: {
      text: string;
      icon: string;
      code: number;
    };
    wind_mph: number;
    wind_kph: number;
    wind_degree: number;
    wind_dir: string;
    pressure_mb: number;
    pressure_in: number;
    precip_mm: number;
    precip_in: number;
    humidity: number;
    cloud: number;
    feelslike_c: number;
    feelslike_f: number;
    vis_km: number;
    vis_miles: number;
    uv: number;
    gust_mph: number;
    gust_kph: number;
  };
}

/**
 * WeatherAPI.com Forecast API 응답 타입
 */
interface WeatherAPIForecastResponse {
  location: {
    name: string;
    region: string;
    country: string;
    lat: number;
    lon: number;
    tz_id: string;
    localtime_epoch: number;
    localtime: string;
  };
  forecast: {
    forecastday: Array<{
      date: string; // YYYY-MM-DD
      date_epoch: number;
      day: {
        maxtemp_c: number;
        maxtemp_f: number;
        mintemp_c: number;
        mintemp_f: number;
        avgtemp_c: number;
        avgtemp_f: number;
        maxwind_mph: number;
        maxwind_kph: number;
        totalprecip_mm: number;
        totalprecip_in: number;
        avgvis_km: number;
        avgvis_miles: number;
        avghumidity: number;
        daily_will_it_rain: number; // 0 or 1
        daily_chance_of_rain: number; // 0-100
        daily_will_it_snow: number; // 0 or 1
        daily_chance_of_snow: number; // 0-100
        condition: {
          text: string;
          icon: string;
          code: number;
        };
        uv: number;
      };
    }>;
  };
}

/**
 * Quota 데이터 구조
 */
interface WeatherAPIQuotaData {
  /** 이번 달 사용한 호출 수 */
  callsThisMonth: number;
  /** 월간 제한 (1,000,000) */
  monthlyLimit: number;
  /** 마지막 리셋 날짜 (YYYY-MM-01 형식) */
  lastResetDate: string;
}

const BASE_URL = "https://api.weatherapi.com/v1";
const QUOTA_STORAGE_KEY = "weatherapi_quota";
const MONTHLY_LIMIT = 1_000_000;

/**
 * WeatherAPI.com Adapter 구현체
 */
export class WeatherAPIAdapter implements WeatherProvider {
  readonly name = "WeatherAPI.com";
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Get weather forecast for a city (Phase 6: Accuracy Tracking)
   */
  async getForecast(
    cityName: string,
    days: number = 1,
  ): Promise<WeatherForecast[]> {
    try {
      // 한글 → 영문 자동 변환
      const cityData = getCityCoordinate(cityName);
      const queryCity = cityData?.name_en || cityName;

      const response = await axios.get<WeatherAPIForecastResponse>(
        `${BASE_URL}/forecast.json`,
        {
          params: {
            key: this.apiKey,
            q: queryCity,
            days: days,
            aqi: "no",
          },
        },
      );

      // Quota 증가
      this.incrementQuota();

      // 응답 → 도메인 타입 변환
      return this.transformForecastToDomain(response.data, cityData);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const message = error.response?.data?.error?.message || error.message;

        switch (status) {
          case 401:
            throw new Error(
              `WeatherAPI.com 인증 실패: API 키가 유효하지 않습니다. (${message})`,
            );
          case 403:
            throw new Error(
              `WeatherAPI.com 접근 거부: API 키 권한이 없습니다. (${message})`,
            );
          case 400:
            throw new Error(
              `WeatherAPI.com 잘못된 요청: 도시 이름을 확인하세요. (${message})`,
            );
          case 429:
            throw new Error(
              `WeatherAPI.com Rate Limit 초과: 월간 호출 제한을 초과했습니다. (${message})`,
            );
          default:
            throw new Error(`WeatherAPI.com 에러: ${message}`);
        }
      }
      throw error;
    }
  }

  /**
   * 현재 날씨 조회
   *
   * 한글 도시명 자동 변환:
   * - 한글 입력 시 영문명으로 자동 변환하여 API 호출
   * - 응답의 location.name은 한글명으로 복원
   */
  async getCurrentWeather(city: string): Promise<CurrentWeather> {
    try {
      // 한글 → 영문 자동 변환
      const cityData = getCityCoordinate(city);
      const queryCity = cityData?.name_en || city;

      const response = await axios.get<WeatherAPIResponse>(
        `${BASE_URL}/current.json`,
        {
          params: {
            key: this.apiKey,
            q: queryCity, // 영문명으로 API 호출
            aqi: "no", // Air Quality Index 제외
          },
        },
      );

      // Quota 증가
      this.incrementQuota();

      // 응답 → 도메인 타입 변환
      const currentWeather = this.transformToDomain(response.data);

      // 한글명으로 복원 (cityData가 있으면)
      if (cityData) {
        currentWeather.location.name = cityData.name; // 한글명
      }

      return currentWeather;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const message = error.response?.data?.error?.message || error.message;

        switch (status) {
          case 401:
            throw new Error(
              `WeatherAPI.com 인증 실패: API 키가 유효하지 않습니다. (${message})`,
            );
          case 403:
            throw new Error(
              `WeatherAPI.com 접근 거부: API 키 권한이 없습니다. (${message})`,
            );
          case 400:
            throw new Error(
              `WeatherAPI.com 잘못된 요청: 도시 이름을 확인하세요. (${message})`,
            );
          case 429:
            throw new Error(
              `WeatherAPI.com Rate Limit 초과: 월간 호출 제한을 초과했습니다. (${message})`,
            );
          default:
            throw new Error(`WeatherAPI.com 에러: ${message}`);
        }
      }
      throw error;
    }
  }

  /**
   * Quota 정보 조회
   */
  async checkQuota(): Promise<QuotaInfo> {
    const quotaData = this.getQuotaData();
    const now = new Date();

    // 월간 리셋 확인
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

    if (currentMonth !== quotaData.lastResetDate) {
      // 새로운 달 → 리셋
      quotaData.callsThisMonth = 0;
      quotaData.lastResetDate = currentMonth;
      setStorageItem(QUOTA_STORAGE_KEY, JSON.stringify(quotaData));
    }

    // 사용률 계산
    const percentage =
      (quotaData.callsThisMonth / quotaData.monthlyLimit) * 100;

    // 상태 결정
    let status: "normal" | "warning" | "exceeded" = "normal";
    if (quotaData.callsThisMonth >= quotaData.monthlyLimit) {
      status = "exceeded";
    } else if (percentage >= 80) {
      status = "warning";
    }

    // 다음 리셋 시간 계산 (다음 달 1일 0시)
    const nextMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      1,
      0,
      0,
      0,
      0,
    );

    return {
      used: quotaData.callsThisMonth,
      limit: quotaData.monthlyLimit,
      resetTime: nextMonth,
      percentage,
      status,
    };
  }

  /**
   * WeatherAPI.com 응답 → 도메인 타입 변환
   */
  private transformToDomain(data: WeatherAPIResponse): CurrentWeather {
    // WeatherAPI condition code → OpenWeatherMap 표준 아이콘
    const iconCode = weatherApiToStandard(
      data.current.condition.code,
      data.current.is_day,
    );

    return {
      location: {
        name: data.location.name,
        country: data.location.country,
        coordinates: {
          lat: data.location.lat,
          lon: data.location.lon,
        },
        timezone: data.location.tz_id,
      },
      current: {
        temperature: data.current.temp_c,
        feelsLike: data.current.feelslike_c,
        humidity: data.current.humidity,
        pressure: data.current.pressure_mb,
        windSpeed: data.current.wind_kph / 3.6, // kph → m/s
        windDirection: data.current.wind_degree,
        cloudiness: data.current.cloud,
        visibility: data.current.vis_km * 1000, // km → m
        uvIndex: data.current.uv,
      },
      weather: {
        main: data.current.condition.text,
        description: data.current.condition.text,
        descriptionKo: data.current.condition.text, // WeatherAPI doesn't provide Korean
        icon: iconCode,
      },
      timestamp: new Date(data.current.last_updated_epoch * 1000),
    };
  }

  /**
   * localStorage에서 Quota 데이터 가져오기
   */
  private getQuotaData(): WeatherAPIQuotaData {
    const stored = getStorageItem(QUOTA_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }

    // 기본값: 현재 월 1일로 초기화
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

    const defaultData: WeatherAPIQuotaData = {
      callsThisMonth: 0,
      monthlyLimit: MONTHLY_LIMIT,
      lastResetDate: currentMonth,
    };

    setStorageItem(QUOTA_STORAGE_KEY, JSON.stringify(defaultData));
    return defaultData;
  }

  /**
   * Quota 증가 (API 호출 후)
   */
  private incrementQuota(): void {
    const data = this.getQuotaData();
    data.callsThisMonth += 1;
    setStorageItem(QUOTA_STORAGE_KEY, JSON.stringify(data));
  }

  /**
   * Provider 설정 검증
   */
  async validateConfig(): Promise<boolean> {
    if (!this.apiKey || this.apiKey.trim() === "") {
      throw new Error("WeatherAPI.com API 키가 설정되지 않았습니다.");
    }
    return true;
  }

  /**
   * Transform forecast response to domain types
   */
  private transformForecastToDomain(
    data: WeatherAPIForecastResponse,
    cityData: ReturnType<typeof getCityCoordinate> | null,
  ): WeatherForecast[] {
    const location: LocationInfo = {
      name: cityData?.name || data.location.name,
      nameKo: cityData?.name,
      country: data.location.country,
      coordinates: {
        lat: data.location.lat,
        lon: data.location.lon,
      },
      timezone: data.location.tz_id,
    };

    return data.forecast.forecastday.map((day) => {
      // WeatherAPI condition code → OpenWeatherMap 표준 아이콘
      const iconCode = weatherApiToStandard(day.day.condition.code, 1); // day = 1

      const weather: WeatherCondition = {
        main: day.day.condition.text,
        description: day.day.condition.text,
        descriptionKo: day.day.condition.text, // WeatherAPI doesn't provide Korean
        icon: iconCode,
      };

      const temperature: TemperatureForecast = {
        min: day.day.mintemp_c,
        max: day.day.maxtemp_c,
        day: day.day.avgtemp_c,
        night: day.day.avgtemp_c, // WeatherAPI doesn't separate day/night avg
      };

      // Precipitation probability (rain or snow)
      const precipProb = Math.max(
        day.day.daily_chance_of_rain,
        day.day.daily_chance_of_snow,
      );

      return {
        location,
        targetDate: new Date(day.date),
        predictedAt: new Date(),
        temperature,
        weather,
        humidity: day.day.avghumidity,
        windSpeed: day.day.maxwind_kph / 3.6, // kph → m/s
        precipitationProbability: precipProb,
      };
    });
  }
}
