/**
 * MockWeatherAdapter Unit Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MockWeatherAdapter } from "../MockWeatherAdapter";
import type { CurrentWeather } from "@/types/domain/weather";
import type { CityWeather } from "@/data/types";

// data/loader 모킹
vi.mock("@/data/loader", () => ({
  loadMockWeatherData: vi.fn().mockResolvedValue({
    서울: {
      location: {
        name: "서울",
        name_en: "Seoul",
        name_ko: "서울",
        latitude: 37.5665,
        longitude: 126.978,
        country: "KR",
        timezone: "Asia/Seoul",
      },
      current: {
        temperature: 20.5,
        feelsLike: 19.0,
        humidity: 65,
        pressure: 1013,
        windSpeed: 3.5,
        windDirection: 180,
        cloudiness: 25,
        visibility: 10000,
        uvIndex: 5,
      },
      weather: {
        icon: "02d",
        description: "구름 조금",
        description_en: "Few clouds",
      },
      timestamp: "2023-10-09T12:00:00Z",
    },
  }),
  getMockWeatherByCity: vi.fn(),
}));

import { loadMockWeatherData, getMockWeatherByCity } from "@/data/loader";

describe("MockWeatherAdapter", () => {
  let adapter: MockWeatherAdapter;

  const mockCityWeather: CityWeather = {
    location: {
      name: "서울",
      name_en: "Seoul",
      name_ko: "서울",
      latitude: 37.5665,
      longitude: 126.978,
      country: "KR",
      timezone: "Asia/Seoul",
    },
    current: {
      temperature: 20.5,
      feelsLike: 19.0,
      humidity: 65,
      pressure: 1013,
      windSpeed: 3.5,
      windDirection: 180,
      cloudiness: 25,
      visibility: 10000,
      uvIndex: 5,
    },
    weather: {
      icon: "02d",
      description: "구름 조금",
      description_en: "Few clouds",
    },
    timestamp: "2023-10-09T12:00:00Z",
  };

  beforeEach(() => {
    adapter = new MockWeatherAdapter();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("constructor", () => {
    it("should create adapter without configuration", () => {
      expect(adapter).toBeInstanceOf(MockWeatherAdapter);
      expect(adapter.name).toBe("Mock");
    });

    it("should accept optional config parameter", () => {
      const adapterWithConfig = new MockWeatherAdapter({});
      expect(adapterWithConfig).toBeInstanceOf(MockWeatherAdapter);
    });
  });

  describe("getCurrentWeather", () => {
    it("should load and transform mock data correctly", async () => {
      // Arrange
      vi.mocked(getMockWeatherByCity).mockResolvedValueOnce(mockCityWeather);

      // Act
      const result: CurrentWeather = await adapter.getCurrentWeather("서울");

      // Assert
      expect(getMockWeatherByCity).toHaveBeenCalledWith("서울");

      expect(result).toMatchObject({
        location: {
          name: "Seoul",
          nameKo: "서울",
          country: "KR",
          coordinates: {
            lat: 37.5665,
            lon: 126.978,
          },
          timezone: "Asia/Seoul",
        },
        current: {
          temperature: 20.5,
          feelsLike: 19.0,
          humidity: 65,
          pressure: 1013,
          windSpeed: 3.5,
          windDirection: 180,
          cloudiness: 25,
          visibility: 10000,
          uvIndex: 5,
        },
        weather: {
          main: "Clouds", // From icon "02d"
          description: "Few clouds",
          descriptionKo: "구름 조금",
          icon: "02d",
        },
        timestamp: expect.any(Date),
      });
    });

    it("should throw error for unknown city", async () => {
      // Arrange
      vi.mocked(getMockWeatherByCity).mockResolvedValueOnce(null);

      // Act & Assert
      await expect(adapter.getCurrentWeather("UnknownCity")).rejects.toThrow(
        /City not found in mock data: UnknownCity/,
      );
    });

    it("should handle clear weather icon (01d)", async () => {
      // Arrange
      const clearWeather = {
        ...mockCityWeather,
        weather: {
          icon: "01d",
          description: "맑음",
          description_en: "Clear sky",
        },
      };
      vi.mocked(getMockWeatherByCity).mockResolvedValueOnce(clearWeather);

      // Act
      const result = await adapter.getCurrentWeather("서울");

      // Assert
      expect(result.weather.main).toBe("Clear");
      expect(result.weather.icon).toBe("01d");
    });

    it("should handle rain icon (10d)", async () => {
      // Arrange
      const rainWeather = {
        ...mockCityWeather,
        weather: {
          icon: "10d",
          description: "비",
          description_en: "Rain",
        },
      };
      vi.mocked(getMockWeatherByCity).mockResolvedValueOnce(rainWeather);

      // Act
      const result = await adapter.getCurrentWeather("서울");

      // Assert
      expect(result.weather.main).toBe("Rain");
      expect(result.weather.icon).toBe("10d");
    });

    it("should handle snow icon (13d)", async () => {
      // Arrange
      const snowWeather = {
        ...mockCityWeather,
        weather: {
          icon: "13d",
          description: "눈",
          description_en: "Snow",
        },
      };
      vi.mocked(getMockWeatherByCity).mockResolvedValueOnce(snowWeather);

      // Act
      const result = await adapter.getCurrentWeather("서울");

      // Assert
      expect(result.weather.main).toBe("Snow");
      expect(result.weather.icon).toBe("13d");
    });

    it("should handle thunderstorm icon (11d)", async () => {
      // Arrange
      const thunderstormWeather = {
        ...mockCityWeather,
        weather: {
          icon: "11d",
          description: "뇌우",
          description_en: "Thunderstorm",
        },
      };
      vi.mocked(getMockWeatherByCity).mockResolvedValueOnce(
        thunderstormWeather,
      );

      // Act
      const result = await adapter.getCurrentWeather("서울");

      // Assert
      expect(result.weather.main).toBe("Thunderstorm");
      expect(result.weather.icon).toBe("11d");
    });

    it("should handle unknown icon gracefully", async () => {
      // Arrange
      const unknownWeather = {
        ...mockCityWeather,
        weather: {
          icon: "99x",
          description: "알 수 없음",
          description_en: "Unknown",
        },
      };
      vi.mocked(getMockWeatherByCity).mockResolvedValueOnce(unknownWeather);

      // Act
      const result = await adapter.getCurrentWeather("서울");

      // Assert
      expect(result.weather.main).toBe("Unknown");
      expect(result.weather.icon).toBe("99x");
    });

    it("should use current timestamp if not provided in data", async () => {
      // Arrange
      const dataWithoutTimestamp = {
        ...mockCityWeather,
        timestamp: undefined,
      };
      vi.mocked(getMockWeatherByCity).mockResolvedValueOnce(
        dataWithoutTimestamp as CityWeather,
      );

      const beforeCall = new Date();

      // Act
      const result = await adapter.getCurrentWeather("서울");

      const afterCall = new Date();

      // Assert
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.timestamp.getTime()).toBeGreaterThanOrEqual(
        beforeCall.getTime(),
      );
      expect(result.timestamp.getTime()).toBeLessThanOrEqual(
        afterCall.getTime(),
      );
    });

    it("should use name_en as location name if provided", async () => {
      // Arrange
      vi.mocked(getMockWeatherByCity).mockResolvedValueOnce(mockCityWeather);

      // Act
      const result = await adapter.getCurrentWeather("서울");

      // Assert
      expect(result.location.name).toBe("Seoul"); // name_en
      expect(result.location.nameKo).toBe("서울"); // name_ko
    });

    it("should fallback to name if name_en is not provided", async () => {
      // Arrange
      const dataWithoutNameEn = {
        ...mockCityWeather,
        location: {
          ...mockCityWeather.location,
          name_en: undefined,
        },
      };
      vi.mocked(getMockWeatherByCity).mockResolvedValueOnce(
        dataWithoutNameEn as CityWeather,
      );

      // Act
      const result = await adapter.getCurrentWeather("서울");

      // Assert
      expect(result.location.name).toBe("서울"); // Fallback to name
    });
  });

  describe("checkQuota", () => {
    it("should always return unlimited quota", async () => {
      // Act
      const quota = await adapter.checkQuota();

      // Assert
      expect(quota).toMatchObject({
        used: 0,
        limit: Infinity,
        percentage: 0,
        status: "normal",
        resetTime: expect.any(Date),
      });
    });

    it("should return reset time approximately 24 hours from now", async () => {
      // Act
      const quota = await adapter.checkQuota();

      // Assert
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const timeDiff = Math.abs(
        quota.resetTime.getTime() - tomorrow.getTime(),
      );

      // 1초 이내 오차 허용
      expect(timeDiff).toBeLessThan(1000);
    });
  });

  describe("validateConfig", () => {
    it("should validate successfully if mock data loads", async () => {
      // Arrange
      vi.mocked(loadMockWeatherData).mockResolvedValueOnce({
        서울: mockCityWeather,
      });

      // Act & Assert
      await expect(adapter.validateConfig()).resolves.toBe(true);
      expect(loadMockWeatherData).toHaveBeenCalled();
    });

    it("should throw error if mock data fails to load", async () => {
      // Arrange
      vi.mocked(loadMockWeatherData).mockRejectedValueOnce(
        new Error("File not found"),
      );

      // Act & Assert
      await expect(adapter.validateConfig()).rejects.toThrow(
        /Failed to load mock weather data/,
      );
    });
  });

  describe("icon to main condition mapping", () => {
    const testCases = [
      { icon: "01d", expected: "Clear" },
      { icon: "01n", expected: "Clear" },
      { icon: "02d", expected: "Clouds" },
      { icon: "02n", expected: "Clouds" },
      { icon: "03d", expected: "Clouds" },
      { icon: "04d", expected: "Clouds" },
      { icon: "09d", expected: "Rain" },
      { icon: "10d", expected: "Rain" },
      { icon: "10n", expected: "Rain" },
      { icon: "11d", expected: "Thunderstorm" },
      { icon: "11n", expected: "Thunderstorm" },
      { icon: "13d", expected: "Snow" },
      { icon: "13n", expected: "Snow" },
      { icon: "50d", expected: "Mist" },
      { icon: "50n", expected: "Mist" },
    ];

    testCases.forEach(({ icon, expected }) => {
      it(`should map icon ${icon} to ${expected}`, async () => {
        // Arrange
        const weather = {
          ...mockCityWeather,
          weather: {
            icon,
            description: "Test",
            description_en: "Test",
          },
        };
        vi.mocked(getMockWeatherByCity).mockResolvedValueOnce(weather);

        // Act
        const result = await adapter.getCurrentWeather("서울");

        // Assert
        expect(result.weather.main).toBe(expected);
      });
    });
  });
});
