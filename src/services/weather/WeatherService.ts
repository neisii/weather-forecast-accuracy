import type { WeatherProvider } from "@/adapters/weather/WeatherProvider";
import { createWeatherProvider } from "@/adapters/weather/WeatherProvider";
import type {
  CurrentWeather,
  QuotaInfo,
  ProviderStatus,
  WeatherProviderConfig,
  WeatherForecast,
} from "@/types/domain/weather";

/**
 * Provider type identifier
 */
export type ProviderType = "mock" | "openweather" | "weatherapi" | "openmeteo";

/**
 * Weather service configuration
 */
export interface WeatherServiceConfig {
  defaultProvider: ProviderType;
  providers: Record<ProviderType, WeatherProviderConfig>;
  cacheEnabled?: boolean;
  cacheTTL?: number; // milliseconds
}

/**
 * Cache entry for weather data
 */
interface CacheEntry {
  data: CurrentWeather;
  timestamp: number;
  provider: ProviderType;
}

/**
 * Weather service
 *
 * This service manages weather providers and handles business logic
 * such as provider selection, quota management, error handling, and caching.
 */
export class WeatherService {
  private currentProvider: WeatherProvider;
  private providerType: ProviderType;
  private config: WeatherServiceConfig;
  private cache: Map<string, CacheEntry> = new Map();
  private readonly CACHE_TTL: number;

  constructor(config: WeatherServiceConfig) {
    this.config = config;
    this.providerType = config.defaultProvider;
    this.currentProvider = this.createProvider(this.providerType);
    this.CACHE_TTL = config.cacheTTL || 5 * 60 * 1000; // Default: 5분
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
    try {
      // Check quota before making request
      const quota = await this.currentProvider.checkQuota();

      if (quota.status === "exceeded") {
        throw new Error(
          `Provider ${this.currentProvider.name} has exceeded its quota. ` +
            `Resets at ${quota.resetTime.toLocaleString()}`,
        );
      }

      // Fetch forecast from API
      console.log(
        `[WeatherService] Forecast API call: ${cityName} (${days} days)`,
      );
      const forecastData = await this.currentProvider.getForecast(
        cityName,
        days,
      );

      return forecastData;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to get forecast: ${error.message}`);
      }
      throw new Error("Failed to get forecast: Unknown error");
    }
  }

  /**
   * Get current weather for a city
   *
   * Caching strategy:
   * - Cache key: `${provider}_${cityName}`
   * - TTL: 5 minutes (configurable)
   * - Cache invalidated on provider switch
   */
  async getCurrentWeather(cityName: string): Promise<CurrentWeather> {
    try {
      // Check cache first (if enabled)
      if (this.config.cacheEnabled !== false) {
        const cachedData = this.getCachedWeather(cityName);
        if (cachedData) {
          console.log(`[WeatherService] Cache hit: ${cityName}`);
          return cachedData;
        }
      }

      // Check quota before making request
      const quota = await this.currentProvider.checkQuota();

      if (quota.status === "exceeded") {
        throw new Error(
          `Provider ${this.currentProvider.name} has exceeded its quota. ` +
            `Resets at ${quota.resetTime.toLocaleString()}`,
        );
      }

      // Fetch from API
      console.log(`[WeatherService] API call: ${cityName}`);
      const weatherData =
        await this.currentProvider.getCurrentWeather(cityName);

      // Store in cache
      if (this.config.cacheEnabled !== false) {
        this.setCachedWeather(cityName, weatherData);
      }

      return weatherData;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to get weather: ${error.message}`);
      }
      throw new Error("Failed to get weather: Unknown error");
    }
  }

  /**
   * Get cached weather data
   */
  private getCachedWeather(cityName: string): CurrentWeather | null {
    const cacheKey = `${this.providerType}_${cityName}`;
    const cached = this.cache.get(cacheKey);

    if (!cached) {
      return null;
    }

    // Check if cache is still valid
    const now = Date.now();
    if (now - cached.timestamp > this.CACHE_TTL) {
      console.log(`[WeatherService] Cache expired: ${cityName}`);
      this.cache.delete(cacheKey);
      return null;
    }

    // Check if provider has changed
    if (cached.provider !== this.providerType) {
      console.log(
        `[WeatherService] Cache invalidated (provider changed): ${cityName}`,
      );
      this.cache.delete(cacheKey);
      return null;
    }

    return cached.data;
  }

  /**
   * Store weather data in cache
   */
  private setCachedWeather(cityName: string, data: CurrentWeather): void {
    const cacheKey = `${this.providerType}_${cityName}`;
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      provider: this.providerType,
    });
    console.log(
      `[WeatherService] Cached: ${cityName} (TTL: ${this.CACHE_TTL}ms)`,
    );
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.cache.clear();
    console.log("[WeatherService] Cache cleared");
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  /**
   * Get quota information for current provider
   */
  async getQuota(): Promise<QuotaInfo> {
    return await this.currentProvider.checkQuota();
  }

  /**
   * Get current provider status
   */
  async getProviderStatus(): Promise<ProviderStatus> {
    const quota = await this.currentProvider.checkQuota();

    return {
      name: this.currentProvider.name,
      isActive: true,
      quotaInfo: quota,
      lastUpdated: new Date(),
    };
  }

  /**
   * Switch to a different weather provider
   */
  async switchProvider(providerType: ProviderType): Promise<void> {
    try {
      const newProvider = this.createProvider(providerType);

      // Validate new provider configuration
      await newProvider.validateConfig();

      // Switch to new provider
      this.currentProvider = newProvider;
      this.providerType = providerType;

      // Clear cache when switching providers
      this.clearCache();
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to switch provider: ${error.message}`);
      }
      throw new Error("Failed to switch provider: Unknown error");
    }
  }

  /**
   * Get current provider type
   */
  getCurrentProviderType(): ProviderType {
    return this.providerType;
  }

  /**
   * Get current provider name
   */
  getCurrentProviderName(): string {
    return this.currentProvider.name;
  }

  /**
   * Get all available provider types
   */
  getAvailableProviders(): ProviderType[] {
    return Object.keys(this.config.providers) as ProviderType[];
  }

  /**
   * Get status for all configured providers
   */
  async getAllProviderStatuses(): Promise<ProviderStatus[]> {
    const statuses: ProviderStatus[] = [];

    for (const providerType of this.getAvailableProviders()) {
      try {
        const provider = this.createProvider(providerType);
        const quota = await provider.checkQuota();

        statuses.push({
          name: provider.name,
          isActive: providerType === this.providerType,
          quotaInfo: quota,
          lastUpdated: new Date(),
        });
      } catch (error) {
        statuses.push({
          name: providerType,
          isActive: false,
          quotaInfo: {
            used: 0,
            limit: 0,
            resetTime: new Date(),
            percentage: 0,
            status: "exceeded",
          },
          lastUpdated: new Date(),
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return statuses;
  }

  /**
   * Validate a provider configuration
   */
  async validateProvider(providerType: ProviderType): Promise<boolean> {
    try {
      const provider = this.createProvider(providerType);
      return await provider.validateConfig();
    } catch (error) {
      return false;
    }
  }

  /**
   * Create a provider instance
   */
  private createProvider(providerType: ProviderType): WeatherProvider {
    const config = this.config.providers[providerType];

    if (!config) {
      throw new Error(`Provider configuration not found: ${providerType}`);
    }

    return createWeatherProvider(providerType, config);
  }

  /**
   * Get current weather from all 3 providers (for Custom AI prediction)
   *
   * @param cityName - City name (Korean or English)
   * @returns Object with weather data from all providers
   */
  async getAllProvidersWeather(cityName: string): Promise<{
    openweather: CurrentWeather;
    weatherapi: CurrentWeather;
    openmeteo: CurrentWeather;
  }> {
    try {
      // Create provider instances
      const openweatherProvider = this.createProvider("openweather");
      const weatherapiProvider = this.createProvider("weatherapi");
      const openmeteoProvider = this.createProvider("openmeteo");

      // Fetch from all providers in parallel
      const [openweather, weatherapi, openmeteo] = await Promise.all([
        openweatherProvider.getCurrentWeather(cityName),
        weatherapiProvider.getCurrentWeather(cityName),
        openmeteoProvider.getCurrentWeather(cityName),
      ]);

      return {
        openweather,
        weatherapi,
        openmeteo,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(
          `Failed to get multi-provider weather: ${error.message}`,
        );
      }
      throw new Error("Failed to get multi-provider weather: Unknown error");
    }
  }
}

/**
 * Create default weather service configuration
 */
export function createDefaultConfig(): WeatherServiceConfig {
  // Support both browser (import.meta.env) and Node.js (process.env)
  const getEnvVar = (key: string): string => {
    if (typeof import.meta !== "undefined" && import.meta.env) {
      return (import.meta.env as Record<string, string>)[key] || "";
    }
    return "";
  };

  return {
    defaultProvider: "mock",
    providers: {
      mock: {
        name: "Mock",
      },
      openweather: {
        name: "OpenWeatherMap",
        apiKey: getEnvVar("VITE_OPENWEATHER_API_KEY"),
        baseUrl: "https://api.openweathermap.org/data/2.5",
        timeout: 10000,
      },
      weatherapi: {
        name: "WeatherAPI",
        apiKey: getEnvVar("VITE_WEATHERAPI_API_KEY"),
        baseUrl: "https://api.weatherapi.com/v1",
        timeout: 10000,
      },
      openmeteo: {
        name: "Open-Meteo",
        baseUrl: "https://api.open-meteo.com/v1",
        timeout: 10000,
      },
    },
  };
}
