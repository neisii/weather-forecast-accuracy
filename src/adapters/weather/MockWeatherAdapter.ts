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
import { loadMockWeatherData, getMockWeatherByCity } from "@/data/loader";
import type { CityWeather } from "@/data/types";

/**
 * Mock weather provider adapter
 *
 * This adapter uses local JSON data instead of making API calls.
 * Useful for development and testing without API keys.
 */
export class MockWeatherAdapter implements WeatherProvider {
  readonly name = "Mock";

  constructor(_config?: WeatherProviderConfig) {
    // Mock provider doesn't need configuration
  }

  /**
   * Get weather forecast for a city (Phase 6: Mock data)
   *
   * Mock provider returns simulated forecast data based on current weather
   */
  async getForecast(
    cityName: string,
    days: number = 1,
  ): Promise<WeatherForecast[]> {
    const cityWeather = await getMockWeatherByCity(cityName);

    if (!cityWeather) {
      throw new Error(`City not found in mock data: ${cityName}`);
    }

    // Generate mock forecast based on current weather
    const forecasts: WeatherForecast[] = [];
    const baseTemp = cityWeather.current.temperature;

    for (let i = 0; i < days; i++) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + i + 1); // Tomorrow onwards

      // Simulate temperature variation
      const tempVariation = (Math.random() - 0.5) * 4; // ±2°C
      const dayTemp = baseTemp + tempVariation;
      const nightTemp = dayTemp - 5;

      const location: LocationInfo = {
        name: cityWeather.location.name_en || cityWeather.location.name,
        nameKo: cityWeather.location.name_ko,
        country: cityWeather.location.country,
        coordinates: {
          lat: cityWeather.location.latitude,
          lon: cityWeather.location.longitude,
        },
        timezone: cityWeather.location.timezone,
      };

      const weather: WeatherCondition = {
        main: this.getMainCondition(cityWeather.weather.icon),
        description: cityWeather.weather.description_en,
        descriptionKo: cityWeather.weather.description,
        icon: cityWeather.weather.icon,
      };

      const temperature: TemperatureForecast = {
        min: nightTemp,
        max: dayTemp,
        day: dayTemp,
        night: nightTemp,
      };

      forecasts.push({
        location,
        targetDate,
        predictedAt: new Date(),
        temperature,
        weather,
        humidity: cityWeather.current.humidity,
        windSpeed: cityWeather.current.windSpeed,
        precipitationProbability: 0, // Mock: no precipitation
      });
    }

    return forecasts;
  }

  /**
   * Get current weather for a city from mock data
   */
  async getCurrentWeather(cityName: string): Promise<CurrentWeather> {
    const cityWeather = await getMockWeatherByCity(cityName);

    if (!cityWeather) {
      throw new Error(`City not found in mock data: ${cityName}`);
    }

    return this.transformToDomain(cityWeather);
  }

  /**
   * Check quota status (Mock provider has unlimited quota)
   */
  async checkQuota(): Promise<QuotaInfo> {
    return {
      used: 0,
      limit: Infinity,
      resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      percentage: 0,
      status: "normal",
    };
  }

  /**
   * Validate configuration (Mock provider always valid)
   */
  async validateConfig(): Promise<boolean> {
    // Check if mock data can be loaded
    try {
      await loadMockWeatherData();
      return true;
    } catch (error) {
      throw new Error("Failed to load mock weather data");
    }
  }

  /**
   * Transform mock data to domain types
   */
  private transformToDomain(cityWeather: CityWeather): CurrentWeather {
    const location: LocationInfo = {
      name: cityWeather.location.name_en || cityWeather.location.name,
      nameKo: cityWeather.location.name_ko,
      country: cityWeather.location.country,
      coordinates: {
        lat: cityWeather.location.latitude,
        lon: cityWeather.location.longitude,
      },
      timezone: cityWeather.location.timezone,
    };

    const current: CurrentWeatherData = {
      temperature: cityWeather.current.temperature,
      feelsLike: cityWeather.current.feelsLike,
      humidity: cityWeather.current.humidity,
      pressure: cityWeather.current.pressure,
      windSpeed: cityWeather.current.windSpeed,
      windDirection: cityWeather.current.windDirection,
      cloudiness: cityWeather.current.cloudiness,
      visibility: cityWeather.current.visibility,
      uvIndex: cityWeather.current.uvIndex,
    };

    const weather: WeatherCondition = {
      main: this.getMainCondition(cityWeather.weather.icon),
      description: cityWeather.weather.description_en,
      descriptionKo: cityWeather.weather.description,
      icon: cityWeather.weather.icon,
    };

    const timestamp = cityWeather.timestamp
      ? new Date(cityWeather.timestamp)
      : new Date();

    return {
      location,
      current,
      weather,
      timestamp,
    };
  }

  /**
   * Get main weather condition from icon code
   */
  private getMainCondition(icon: string): string {
    const mainConditions: Record<string, string> = {
      "01": "Clear",
      "02": "Clouds",
      "03": "Clouds",
      "04": "Clouds",
      "09": "Rain",
      "10": "Rain",
      "11": "Thunderstorm",
      "13": "Snow",
      "50": "Mist",
    };

    const iconPrefix = icon.substring(0, 2);
    return mainConditions[iconPrefix] || "Unknown";
  }
}
