import type { WeatherProviderConfig } from "@/types/domain/weather";
import type {
  CurrentWeather,
  QuotaInfo,
  WeatherForecast,
} from "@/types/domain/weather";
import { MockWeatherAdapter } from "./MockWeatherAdapter";
import { OpenWeatherAdapter } from "./OpenWeatherAdapter";
import { WeatherAPIAdapter } from "./WeatherAPIAdapter";
import { OpenMeteoAdapter } from "./OpenMeteoAdapter";

/**
 * Re-export types for use in adapters
 */
export type { CurrentWeather, QuotaInfo, WeatherForecast };

/**
 * Weather provider interface
 *
 * All weather API adapters must implement this interface to ensure
 * consistent behavior across different providers.
 */
export interface WeatherProvider {
  /**
   * Provider name (e.g., "OpenWeatherMap", "Mock")
   */
  readonly name: string;

  /**
   * Get current weather for a city
   *
   * @param cityName - Name of the city (Korean or English)
   * @returns Promise resolving to current weather data in domain format
   * @throws Error if the city is not found or API request fails
   */
  getCurrentWeather(cityName: string): Promise<CurrentWeather>;

  /**
   * Get weather forecast for a city (Phase 6: Accuracy Tracking)
   *
   * @param cityName - Name of the city (Korean or English)
   * @param days - Number of days to forecast (default: 1, for tomorrow's weather)
   * @returns Promise resolving to weather forecast data in domain format
   * @throws Error if the city is not found or API request fails
   */
  getForecast(cityName: string, days?: number): Promise<WeatherForecast[]>;

  /**
   * Check current API quota status
   *
   * @returns Promise resolving to quota information
   */
  checkQuota(): Promise<QuotaInfo>;

  /**
   * Validate provider configuration
   *
   * @returns Promise resolving to true if configuration is valid
   * @throws Error if configuration is invalid
   */
  validateConfig(): Promise<boolean>;
}

/**
 * Factory function to create weather provider instances
 *
 * @param type - Provider type ('mock', 'openweather', 'weatherapi', 'openmeteo')
 * @param config - Provider configuration
 * @returns WeatherProvider instance
 * @throws Error if provider type is unknown
 */
export function createWeatherProvider(
  type: "mock" | "openweather" | "weatherapi" | "openmeteo",
  config?: WeatherProviderConfig,
): WeatherProvider {
  switch (type) {
    case "mock":
      return new MockWeatherAdapter(config);
    case "openweather":
      if (!config) {
        throw new Error("OpenWeatherAdapter requires configuration");
      }
      return new OpenWeatherAdapter(config);
    case "weatherapi":
      if (!config || !config.apiKey) {
        throw new Error("WeatherAPIAdapter requires API key in configuration");
      }
      return new WeatherAPIAdapter(config.apiKey);
    case "openmeteo":
      return new OpenMeteoAdapter();
    default:
      throw new Error(`Unknown provider type: ${type}`);
  }
}
