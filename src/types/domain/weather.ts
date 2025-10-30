/**
 * Domain types for weather application
 *
 * These types represent the core domain model and are independent
 * of any external API structure. All weather providers must adapt
 * their responses to these types.
 */

/**
 * Current weather information for a specific location
 */
export interface CurrentWeather {
  location: LocationInfo;
  current: CurrentWeatherData;
  weather: WeatherCondition;
  timestamp: Date;
}

/**
 * Location information
 */
export interface LocationInfo {
  name: string;
  nameKo?: string;
  country: string;
  coordinates: Coordinates;
  timezone?: string;
}

/**
 * Geographic coordinates
 */
export interface Coordinates {
  lat: number;
  lon: number;
}

/**
 * Current weather measurements
 */
export interface CurrentWeatherData {
  temperature: number; // Celsius
  feelsLike: number; // Celsius
  humidity: number; // Percentage (0-100)
  pressure: number; // hPa
  windSpeed: number; // m/s
  windDirection: number; // Degrees (0-360)
  cloudiness: number; // Percentage (0-100)
  visibility: number; // Meters
  uvIndex: number; // UV index (0-11+)
}

/**
 * Weather condition description
 */
export interface WeatherCondition {
  main: string; // Main weather condition (e.g., "Clear", "Rain")
  description: string; // Detailed description (English)
  descriptionKo: string; // Detailed description (Korean)
  icon: string; // Weather icon code (OpenWeatherMap standard)
}

/**
 * Weather provider quota information
 */
export interface QuotaInfo {
  used: number; // Number of API calls used
  limit: number; // Maximum API calls allowed
  resetTime: Date; // When the quota resets (UTC)
  percentage: number; // Usage percentage (0-100)
  status: QuotaStatus; // Current quota status
}

/**
 * Quota status indicators
 */
export type QuotaStatus = "normal" | "warning" | "exceeded";

/**
 * Weather provider configuration
 */
export interface WeatherProviderConfig {
  name: string; // Provider name (e.g., "OpenWeatherMap")
  apiKey?: string; // API key (optional for Mock provider)
  baseUrl?: string; // Base URL for API requests
  timeout?: number; // Request timeout in milliseconds
}

/**
 * Weather provider status for UI display
 */
export interface ProviderStatus {
  name: string;
  isActive: boolean;
  quotaInfo: QuotaInfo;
  lastUpdated: Date;
  error?: string;
}

/**
 * Weather forecast for a specific date
 * Used for accuracy tracking in Phase 6
 */
export interface WeatherForecast {
  location: LocationInfo;
  targetDate: Date; // The date this forecast is for
  predictedAt: Date; // When the prediction was made
  temperature: TemperatureForecast;
  weather: WeatherCondition;
  humidity: number; // Percentage (0-100)
  windSpeed: number; // m/s
  precipitationProbability: number; // Percentage (0-100)
}

/**
 * Temperature forecast with min/max values
 */
export interface TemperatureForecast {
  min: number; // Minimum temperature (Celsius)
  max: number; // Maximum temperature (Celsius)
  day: number; // Average day temperature (Celsius)
  night: number; // Average night temperature (Celsius)
}
