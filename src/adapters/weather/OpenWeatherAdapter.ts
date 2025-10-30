import type { WeatherProvider } from "./WeatherProvider";
import type {
  CurrentWeather,
  QuotaInfo,
  WeatherProviderConfig,
  CurrentWeatherData,
  WeatherCondition,
  LocationInfo,
  WeatherForecast,
  TemperatureForecast,
} from "@/types/domain/weather";
import { getCityCoordinate } from "@/config/cityCoordinates";
import { getStorageItem, setStorageItem } from "./storage";

/**
 * OpenWeatherMap API response type (Current Weather API 2.5)
 */
interface OpenWeatherResponse {
  coord: { lon: number; lat: number };
  weather: Array<{
    id: number;
    main: string;
    description: string;
    icon: string;
  }>;
  base: string;
  main: {
    temp: number;
    feels_like: number;
    temp_min: number;
    temp_max: number;
    pressure: number;
    humidity: number;
  };
  visibility: number;
  wind: {
    speed: number;
    deg: number;
  };
  clouds: {
    all: number;
  };
  dt: number;
  sys: {
    type: number;
    id: number;
    country: string;
    sunrise: number;
    sunset: number;
  };
  timezone: number;
  id: number;
  name: string;
  cod: number;
}

/**
 * OpenWeatherMap 5 day / 3 hour Forecast API response
 */
interface OpenWeatherForecastResponse {
  cod: string;
  message: number;
  cnt: number;
  list: Array<{
    dt: number;
    main: {
      temp: number;
      feels_like: number;
      temp_min: number;
      temp_max: number;
      pressure: number;
      humidity: number;
    };
    weather: Array<{
      id: number;
      main: string;
      description: string;
      icon: string;
    }>;
    clouds: { all: number };
    wind: { speed: number; deg: number };
    visibility: number;
    pop: number; // Probability of precipitation
    dt_txt: string;
  }>;
  city: {
    id: number;
    name: string;
    coord: { lat: number; lon: number };
    country: string;
    timezone: number;
  };
}

/**
 * LocalStorage key for quota tracking
 */
const QUOTA_STORAGE_KEY = "openweather_quota";

/**
 * Quota data structure in LocalStorage
 */
interface QuotaData {
  callsThisMinute: number[]; // Array of timestamps (ms) for calls in current minute
  dailyUsed: number; // Total calls today
  dailyLimit: number; // 1,000 calls/day (soft limit, not enforced by free tier)
  resetTime: string; // Daily reset time ISO 8601 format (UTC)
}

/**
 * OpenWeatherMap adapter
 *
 * Uses OpenWeatherMap Current Weather API 2.5
 * Free tier limits:
 * - 60 calls/minute (hard limit, enforced by API)
 * - No daily limit on free tier, but recommended to stay under reasonable usage
 * - 5 day / 3 hour forecast available
 * - No credit card required
 */
export class OpenWeatherAdapter implements WeatherProvider {
  readonly name = "OpenWeatherMap";
  private config: WeatherProviderConfig;
  private baseUrl: string;
  private apiKey: string;

  constructor(config: WeatherProviderConfig) {
    this.config = config;
    this.baseUrl = config.baseUrl || "https://api.openweathermap.org/data/2.5";

    if (!config.apiKey) {
      throw new Error("OpenWeatherMap API key is required");
    }
    this.apiKey = config.apiKey;
  }

  /**
   * Get weather forecast for a city (Phase 6: Accuracy Tracking)
   *
   * @param cityName - City name (Korean or English)
   * @param days - Number of days to forecast (default: 1)
   * @returns Array of weather forecasts
   */
  async getForecast(
    cityName: string,
    days: number = 1,
  ): Promise<WeatherForecast[]> {
    // Get coordinates for the city
    const cityCoord = getCityCoordinate(cityName);
    if (!cityCoord) {
      throw new Error(`City coordinates not found: ${cityName}`);
    }

    // Check quota before making request
    const quota = await this.checkQuota();
    if (quota.status === "exceeded") {
      throw new Error(
        `API rate limit exceeded (60 calls/minute). ` +
          `Wait ${Math.ceil((quota.resetTime.getTime() - Date.now()) / 1000)} seconds.`,
      );
    }

    try {
      // Make API request to forecast endpoint
      const url = new URL(`${this.baseUrl}/forecast`);
      url.searchParams.append("lat", cityCoord.lat.toString());
      url.searchParams.append("lon", cityCoord.lon.toString());
      url.searchParams.append("appid", this.apiKey);
      url.searchParams.append("units", "metric");
      url.searchParams.append("lang", "en");
      url.searchParams.append("cnt", (days * 8).toString()); // 8 forecasts per day (3-hour intervals)

      const response = await fetch(url.toString(), {
        timeout: this.config.timeout || 10000,
      } as RequestInit);

      // Handle rate limit response
      if (response.status === 429) {
        this.incrementQuota();
        throw new Error("API rate limit exceeded (HTTP 429)");
      }

      if (!response.ok) {
        throw new Error(
          `API request failed: ${response.status} ${response.statusText}`,
        );
      }

      const data: OpenWeatherForecastResponse = await response.json();

      // Increment quota counter
      this.incrementQuota();

      return this.transformForecastToDomain(
        data,
        cityCoord.name,
        cityCoord.name_en,
        days,
      );
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Failed to fetch forecast data from OpenWeatherMap");
    }
  }

  /**
   * Get current weather for a city
   */
  async getCurrentWeather(cityName: string): Promise<CurrentWeather> {
    // Get coordinates for the city
    const cityCoord = getCityCoordinate(cityName);
    if (!cityCoord) {
      throw new Error(`City coordinates not found: ${cityName}`);
    }

    // Check quota before making request (minute-based limit)
    const quota = await this.checkQuota();
    if (quota.status === "exceeded") {
      throw new Error(
        `API rate limit exceeded (60 calls/minute). ` +
          `Wait ${Math.ceil((quota.resetTime.getTime() - Date.now()) / 1000)} seconds.`,
      );
    }

    try {
      // Make API request
      const url = new URL(`${this.baseUrl}/weather`);
      url.searchParams.append("lat", cityCoord.lat.toString());
      url.searchParams.append("lon", cityCoord.lon.toString());
      url.searchParams.append("appid", this.apiKey);
      url.searchParams.append("units", "metric");
      url.searchParams.append("lang", "en");

      const response = await fetch(url.toString(), {
        timeout: this.config.timeout || 10000,
      } as RequestInit);

      // Handle rate limit response
      if (response.status === 429) {
        this.incrementQuota();
        throw new Error("API rate limit exceeded (HTTP 429)");
      }

      if (!response.ok) {
        throw new Error(
          `API request failed: ${response.status} ${response.statusText}`,
        );
      }

      const data: OpenWeatherResponse = await response.json();

      // Increment quota counter
      this.incrementQuota();

      return this.transformToDomain(data, cityCoord.name, cityCoord.name_en);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Failed to fetch weather data from OpenWeatherMap");
    }
  }

  /**
   * Check current API quota status
   *
   * OpenWeatherMap Free Tier: 60 calls/minute (hard limit)
   */
  async checkQuota(): Promise<QuotaInfo> {
    const quotaData = this.getQuotaData();
    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;

    // Clean up old calls (older than 1 minute)
    const recentCalls = quotaData.callsThisMinute.filter(
      (timestamp) => timestamp > oneMinuteAgo,
    );
    quotaData.callsThisMinute = recentCalls;

    // Save cleaned data
    setStorageItem(QUOTA_STORAGE_KEY, JSON.stringify(quotaData));

    // Check daily reset
    const dailyResetTime = new Date(quotaData.resetTime);
    if (new Date() >= dailyResetTime) {
      this.resetDailyQuota();
      return this.checkQuota(); // Recursive call after reset
    }

    // Minute-based limit (60 calls/minute)
    const callsThisMinute = recentCalls.length;
    const minuteLimit = 60;
    const percentage = (callsThisMinute / minuteLimit) * 100;

    let status: "normal" | "warning" | "exceeded" = "normal";
    if (callsThisMinute >= minuteLimit) {
      status = "exceeded";
    } else if (percentage >= 80) {
      status = "warning";
    }

    // Next reset time is when oldest call expires (1 minute from oldest call)
    const oldestCall = recentCalls[0];
    const nextResetTime = oldestCall
      ? new Date(oldestCall + 60 * 1000)
      : new Date(now + 60 * 1000);

    return {
      used: callsThisMinute,
      limit: minuteLimit,
      resetTime: nextResetTime,
      percentage,
      status,
    };
  }

  /**
   * Validate configuration
   */
  async validateConfig(): Promise<boolean> {
    if (!this.apiKey) {
      throw new Error("API key is required");
    }

    // Test API key with a simple request (서울)
    try {
      const url = new URL(`${this.baseUrl}/weather`);
      url.searchParams.append("lat", "37.5683");
      url.searchParams.append("lon", "126.9778");
      url.searchParams.append("appid", this.apiKey);
      url.searchParams.append("units", "metric");

      const response = await fetch(url.toString(), {
        timeout: 5000,
      } as RequestInit);

      if (response.status === 401) {
        throw new Error("Invalid API key");
      }

      return response.ok;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Failed to validate API configuration");
    }
  }

  /**
   * Transform OpenWeatherMap response to domain types
   */
  private transformToDomain(
    data: OpenWeatherResponse,
    nameKo: string,
    nameEn: string,
  ): CurrentWeather {
    const location: LocationInfo = {
      name: nameEn,
      nameKo: nameKo,
      country: data.sys.country,
      coordinates: {
        lat: data.coord.lat,
        lon: data.coord.lon,
      },
    };

    const current: CurrentWeatherData = {
      temperature: data.main.temp,
      feelsLike: data.main.feels_like,
      humidity: data.main.humidity,
      pressure: data.main.pressure,
      windSpeed: data.wind.speed,
      windDirection: data.wind.deg,
      cloudiness: data.clouds.all,
      visibility: data.visibility,
      uvIndex: 0, // Current Weather API doesn't provide UV index
    };

    const weatherInfo = data.weather[0];
    if (!weatherInfo) {
      throw new Error("Weather information not available in API response");
    }

    const weather: WeatherCondition = {
      main: weatherInfo.main,
      description: weatherInfo.description,
      descriptionKo: this.translateDescription(weatherInfo.description),
      icon: weatherInfo.icon,
    };

    const timestamp = new Date(data.dt * 1000);

    return {
      location,
      current,
      weather,
      timestamp,
    };
  }

  /**
   * Translate English weather description to Korean
   * (Simple static mapping for now)
   */
  private translateDescription(description: string): string {
    const translations: Record<string, string> = {
      "clear sky": "맑음",
      "few clouds": "구름 조금",
      "scattered clouds": "구름 많음",
      "broken clouds": "구름 많음",
      "overcast clouds": "흐림",
      "light rain": "약한 비",
      "moderate rain": "비",
      "heavy rain": "강한 비",
      "shower rain": "소나기",
      thunderstorm: "천둥번개",
      snow: "눈",
      "light snow": "약한 눈",
      "heavy snow": "강한 눈",
      mist: "안개",
      fog: "안개",
      haze: "실안개",
    };

    return translations[description.toLowerCase()] || description;
  }

  /**
   * Get quota data from LocalStorage
   */
  private getQuotaData(): QuotaData {
    const stored = getStorageItem(QUOTA_STORAGE_KEY);

    if (!stored) {
      return this.createNewQuotaData();
    }

    try {
      const data: QuotaData = JSON.parse(stored);
      return data;
    } catch {
      return this.createNewQuotaData();
    }
  }

  /**
   * Create new quota data with next UTC midnight reset time
   */
  private createNewQuotaData(): QuotaData {
    const now = new Date();
    const tomorrow = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + 1,
        0,
        0,
        0,
        0,
      ),
    );

    const data: QuotaData = {
      callsThisMinute: [],
      dailyUsed: 0,
      dailyLimit: 1000, // Soft limit for tracking
      resetTime: tomorrow.toISOString(),
    };

    setStorageItem(QUOTA_STORAGE_KEY, JSON.stringify(data));
    return data;
  }

  /**
   * Increment quota usage counter
   * Records timestamp for minute-based tracking
   */
  private incrementQuota(): void {
    const data = this.getQuotaData();
    const now = Date.now();

    // Add current timestamp to minute tracking
    data.callsThisMinute.push(now);

    // Increment daily counter
    data.dailyUsed += 1;

    setStorageItem(QUOTA_STORAGE_KEY, JSON.stringify(data));
  }

  /**
   * Reset daily quota counter (called at UTC midnight)
   */
  private resetDailyQuota(): void {
    const data = this.createNewQuotaData();
    setStorageItem(QUOTA_STORAGE_KEY, JSON.stringify(data));
  }

  /**
   * Transform forecast response to domain types
   * Groups 3-hour forecasts into daily forecasts
   */
  private transformForecastToDomain(
    data: OpenWeatherForecastResponse,
    nameKo: string,
    nameEn: string,
    days: number,
  ): WeatherForecast[] {
    const location: LocationInfo = {
      name: nameEn,
      nameKo: nameKo,
      country: data.city.country,
      coordinates: {
        lat: data.city.coord.lat,
        lon: data.city.coord.lon,
      },
    };

    // Group forecasts by date
    const forecastsByDate = new Map<string, typeof data.list>();

    for (const forecast of data.list) {
      const date = new Date(forecast.dt * 1000);
      const dateKey = date.toISOString().split("T")[0]; // YYYY-MM-DD

      if (!dateKey) continue; // Skip if date parsing fails

      if (!forecastsByDate.has(dateKey)) {
        forecastsByDate.set(dateKey, []);
      }
      forecastsByDate.get(dateKey)!.push(forecast);
    }

    // Convert to daily forecasts (limit to requested days)
    const dailyForecasts: WeatherForecast[] = [];
    const dateKeys = Array.from(forecastsByDate.keys()).slice(0, days);

    for (const dateKey of dateKeys) {
      const dayForecasts = forecastsByDate.get(dateKey)!;

      // Calculate daily aggregates
      const temps = dayForecasts.map((f) => f.main.temp);
      const minTemp = Math.min(...dayForecasts.map((f) => f.main.temp_min));
      const maxTemp = Math.max(...dayForecasts.map((f) => f.main.temp_max));

      // Average for day (06:00-18:00) and night (18:00-06:00)
      const dayTemps = dayForecasts
        .filter((f) => {
          const hour = new Date(f.dt * 1000).getHours();
          return hour >= 6 && hour < 18;
        })
        .map((f) => f.main.temp);

      const nightTemps = dayForecasts
        .filter((f) => {
          const hour = new Date(f.dt * 1000).getHours();
          return hour < 6 || hour >= 18;
        })
        .map((f) => f.main.temp);

      const avgDayTemp = dayTemps.length
        ? dayTemps.reduce((a, b) => a + b, 0) / dayTemps.length
        : temps[0] || 0;
      const avgNightTemp = nightTemps.length
        ? nightTemps.reduce((a, b) => a + b, 0) / nightTemps.length
        : temps[0] || 0;

      // Use midday forecast for weather condition (12:00)
      const middayForecast =
        dayForecasts.find((f) => {
          const hour = new Date(f.dt * 1000).getHours();
          return hour === 12;
        }) || dayForecasts[Math.floor(dayForecasts.length / 2)];

      if (!middayForecast) {
        throw new Error("No forecast data available for the day");
      }

      const weatherInfo = middayForecast.weather[0];
      if (!weatherInfo) {
        throw new Error("Weather information not available in forecast");
      }

      const weather: WeatherCondition = {
        main: weatherInfo.main,
        description: weatherInfo.description,
        descriptionKo: this.translateDescription(weatherInfo.description),
        icon: weatherInfo.icon,
      };

      // Average humidity and wind speed
      const avgHumidity =
        dayForecasts.reduce((sum, f) => sum + f.main.humidity, 0) /
        dayForecasts.length;
      const avgWindSpeed =
        dayForecasts.reduce((sum, f) => sum + f.wind.speed, 0) /
        dayForecasts.length;

      // Max precipitation probability
      const maxPrecipProb = Math.max(...dayForecasts.map((f) => f.pop)) * 100;

      const temperature: TemperatureForecast = {
        min: minTemp,
        max: maxTemp,
        day: avgDayTemp,
        night: avgNightTemp,
      };

      dailyForecasts.push({
        location,
        targetDate: new Date(dateKey),
        predictedAt: new Date(),
        temperature,
        weather,
        humidity: Math.round(avgHumidity),
        windSpeed: avgWindSpeed,
        precipitationProbability: Math.round(maxPrecipProb),
      });
    }

    return dailyForecasts;
  }
}
