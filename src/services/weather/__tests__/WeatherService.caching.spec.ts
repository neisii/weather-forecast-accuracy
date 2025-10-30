import { describe, it, expect, beforeEach, vi } from "vitest";
import { WeatherService, createDefaultConfig } from "../WeatherService";
import type { CurrentWeather } from "@/types/domain/weather";

describe("WeatherService - Caching", () => {
  let service: WeatherService;

  const mockWeather: CurrentWeather = {
    location: {
      name: "서울",
      country: "KR",
      latitude: 37.5665,
      longitude: 126.978,
      localtime: "2025-01-08 14:30",
    },
    current: {
      temp_c: 5,
      condition: {
        text: "맑음",
        icon: "//cdn.weatherapi.com/weather/64x64/day/113.png",
      },
      wind_kph: 10,
      humidity: 60,
      feelslike_c: 3,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  describe("Cache enabled", () => {
    beforeEach(() => {
      const config = createDefaultConfig();
      config.cacheEnabled = true;
      config.cacheTTL = 5 * 60 * 1000; // 5 minutes
      service = new WeatherService(config);
    });

    it("should cache weather data on first request", async () => {
      // Mock the adapter's getCurrentWeather method
      const adapter = service["currentProvider"];
      const getCurrentWeatherSpy = vi
        .spyOn(adapter, "getCurrentWeather")
        .mockResolvedValue(mockWeather);

      await service.getCurrentWeather("서울");

      const stats = service.getCacheStats();
      expect(stats.size).toBe(1);
      expect(stats.keys).toContain("mock_서울");
      expect(getCurrentWeatherSpy).toHaveBeenCalledTimes(1);
    });

    it("should return cached data within TTL", async () => {
      const adapter = service["currentProvider"];
      const getCurrentWeatherSpy = vi
        .spyOn(adapter, "getCurrentWeather")
        .mockResolvedValue(mockWeather);

      // First request - cache miss
      const result1 = await service.getCurrentWeather("서울");
      expect(result1).toEqual(mockWeather);
      expect(getCurrentWeatherSpy).toHaveBeenCalledTimes(1);

      // Advance time by 2 minutes (within 5-minute TTL)
      vi.advanceTimersByTime(2 * 60 * 1000);

      // Second request - cache hit
      const result2 = await service.getCurrentWeather("서울");
      expect(result2).toEqual(mockWeather);
      expect(getCurrentWeatherSpy).toHaveBeenCalledTimes(1); // Still only called once
    });

    it("should fetch new data after TTL expires", async () => {
      const adapter = service["currentProvider"];
      const getCurrentWeatherSpy = vi
        .spyOn(adapter, "getCurrentWeather")
        .mockResolvedValue(mockWeather);

      // First request
      await service.getCurrentWeather("서울");
      expect(getCurrentWeatherSpy).toHaveBeenCalledTimes(1);

      // Advance time beyond TTL (6 minutes)
      vi.advanceTimersByTime(6 * 60 * 1000);

      // Second request - cache expired
      await service.getCurrentWeather("서울");
      expect(getCurrentWeatherSpy).toHaveBeenCalledTimes(2);
    });

    it("should maintain separate cache for different cities", async () => {
      const adapter = service["currentProvider"];
      const seoulWeather = { ...mockWeather };
      const busanWeather = {
        ...mockWeather,
        location: { ...mockWeather.location, name: "부산" },
      };

      const getCurrentWeatherSpy = vi
        .spyOn(adapter, "getCurrentWeather")
        .mockResolvedValueOnce(seoulWeather)
        .mockResolvedValueOnce(busanWeather);

      await service.getCurrentWeather("서울");
      await service.getCurrentWeather("부산");

      const stats = service.getCacheStats();
      expect(stats.size).toBe(2);
      expect(stats.keys).toContain("mock_서울");
      expect(stats.keys).toContain("mock_부산");
      expect(getCurrentWeatherSpy).toHaveBeenCalledTimes(2);
    });

    it("should invalidate cache when provider changes", async () => {
      const adapter = service["currentProvider"];
      const getCurrentWeatherSpy = vi
        .spyOn(adapter, "getCurrentWeather")
        .mockResolvedValue(mockWeather);

      // First request with Mock provider
      await service.getCurrentWeather("서울");
      expect(service.getCacheStats().size).toBe(1);

      // Switch provider
      await service.switchProvider("weatherapi");

      // Cache should be cleared after provider switch
      const stats = service.getCacheStats();
      expect(stats.size).toBe(0);
    });

    it("should clear cache manually", async () => {
      const adapter = service["currentProvider"];
      vi.spyOn(adapter, "getCurrentWeather").mockResolvedValue(mockWeather);

      await service.getCurrentWeather("서울");
      await service.getCurrentWeather("부산");

      expect(service.getCacheStats().size).toBe(2);

      service.clearCache();

      expect(service.getCacheStats().size).toBe(0);
    });

    it("should generate correct cache keys with provider prefix", async () => {
      const adapter = service["currentProvider"];
      vi.spyOn(adapter, "getCurrentWeather").mockResolvedValue(mockWeather);

      await service.getCurrentWeather("서울");

      const stats = service.getCacheStats();
      expect(stats.keys[0]).toBe("mock_서울");
      expect(stats.keys[0]).toMatch(/^mock_/);
    });
  });

  describe("Cache disabled", () => {
    beforeEach(() => {
      const config = createDefaultConfig();
      config.cacheEnabled = false;
      service = new WeatherService(config);
    });

    it("should not cache data when caching is disabled", async () => {
      const adapter = service["currentProvider"];
      const getCurrentWeatherSpy = vi
        .spyOn(adapter, "getCurrentWeather")
        .mockResolvedValue(mockWeather);

      // First request
      await service.getCurrentWeather("서울");

      // Second request
      await service.getCurrentWeather("서울");

      // Both requests should call the adapter
      expect(getCurrentWeatherSpy).toHaveBeenCalledTimes(2);
      expect(service.getCacheStats().size).toBe(0);
    });
  });

  describe("Cache statistics", () => {
    beforeEach(() => {
      const config = createDefaultConfig();
      config.cacheEnabled = true;
      service = new WeatherService(config);
    });

    it("should return correct cache statistics", async () => {
      const adapter = service["currentProvider"];
      vi.spyOn(adapter, "getCurrentWeather").mockResolvedValue(mockWeather);

      // Empty cache
      let stats = service.getCacheStats();
      expect(stats.size).toBe(0);
      expect(stats.keys).toEqual([]);

      // Add 3 cities
      await service.getCurrentWeather("서울");
      await service.getCurrentWeather("부산");
      await service.getCurrentWeather("인천");

      stats = service.getCacheStats();
      expect(stats.size).toBe(3);
      expect(stats.keys).toHaveLength(3);
      expect(stats.keys).toContain("mock_서울");
      expect(stats.keys).toContain("mock_부산");
      expect(stats.keys).toContain("mock_인천");
    });
  });
});
