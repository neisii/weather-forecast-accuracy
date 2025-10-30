/**
 * OpenMeteoAdapter Unit Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import axios from "axios";
import { OpenMeteoAdapter } from "../OpenMeteoAdapter";
import type { CurrentWeather } from "../WeatherProvider";

// axios 모킹
vi.mock("axios");
const mockedAxios = vi.mocked(axios);

// cityCoordinates 모킹
vi.mock("@/config/cityCoordinates", () => ({
  CITY_COORDINATES: {
    서울: {
      name: "서울",
      lat: 37.5665,
      lon: 126.978,
      country: "KR",
      timezone: "Asia/Seoul",
    },
    부산: {
      name: "부산",
      lat: 35.1796,
      lon: 129.0756,
      country: "KR",
      timezone: "Asia/Seoul",
    },
  },
}));

describe("OpenMeteoAdapter", () => {
  let adapter: OpenMeteoAdapter;

  // Mock API 응답 데이터
  const mockOpenMeteoResponse = {
    latitude: 37.5665,
    longitude: 126.978,
    generationtime_ms: 0.123,
    utc_offset_seconds: 32400,
    timezone: "Asia/Seoul",
    timezone_abbreviation: "KST",
    elevation: 38,
    current_units: {
      time: "iso8601",
      interval: "seconds",
      temperature_2m: "°C",
      relative_humidity_2m: "%",
      apparent_temperature: "°C",
      weather_code: "wmo code",
      wind_speed_10m: "km/h",
    },
    current: {
      time: "2023-10-09T12:00",
      interval: 900,
      temperature_2m: 20.5,
      relative_humidity_2m: 65,
      apparent_temperature: 19.0,
      weather_code: 3, // Overcast
      wind_speed_10m: 11.2,
    },
  };

  beforeEach(() => {
    adapter = new OpenMeteoAdapter();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("constructor", () => {
    it("should create adapter without API key", () => {
      expect(adapter).toBeInstanceOf(OpenMeteoAdapter);
      expect(adapter.name).toBe("Open-Meteo");
    });
  });

  describe("getCurrentWeather", () => {
    it("should fetch and transform weather data correctly", async () => {
      // Arrange
      mockedAxios.get.mockResolvedValueOnce({
        data: mockOpenMeteoResponse,
      });

      // Act
      const result: CurrentWeather = await adapter.getCurrentWeather("서울");

      // Assert
      expect(mockedAxios.get).toHaveBeenCalledWith(
        "https://api.open-meteo.com/v1/forecast",
        {
          params: {
            latitude: 37.5665,
            longitude: 126.978,
            current:
              "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m",
            timezone: "auto",
          },
        },
      );

      expect(result).toMatchObject({
        location: {
          name: "서울",
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
          pressure: 1013, // Default value
          windSpeed: expect.closeTo(3.11, 1), // 11.2 kph / 3.6 ≈ 3.11 m/s
          windDirection: 0, // Not available
          cloudiness: 0, // Not available
          visibility: 10000, // Default 10km
          uvIndex: 0, // Not available
        },
        weather: {
          main: "흐림", // WMO code 3
          description: "흐림",
          descriptionKo: "흐림",
          icon: expect.stringMatching(/^0[34][dn]$/), // 03d, 03n, 04d, or 04n (overcast)
        },
        timestamp: expect.any(Date),
      });
    });

    it("should use cityCoordinates for location lookup", async () => {
      // Arrange
      mockedAxios.get.mockResolvedValueOnce({
        data: mockOpenMeteoResponse,
      });

      // Act
      await adapter.getCurrentWeather("서울");

      // Assert
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({
            latitude: 37.5665,
            longitude: 126.978,
          }),
        }),
      );
    });

    it("should throw error for unknown city", async () => {
      // Act & Assert
      await expect(adapter.getCurrentWeather("UnknownCity")).rejects.toThrow(
        /도시 "UnknownCity"의 좌표 정보를 찾을 수 없습니다/,
      );

      // API 호출이 발생하지 않아야 함
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    it("should handle 400 bad request error", async () => {
      // Arrange
      mockedAxios.get.mockRejectedValueOnce({
        isAxiosError: true,
        response: {
          status: 400,
          data: {
            reason: "Invalid coordinates",
          },
        },
      });

      mockedAxios.isAxiosError = vi.fn().mockReturnValue(true);

      // Act & Assert
      await expect(adapter.getCurrentWeather("서울")).rejects.toThrow(
        /잘못된 요청.*좌표 정보가 잘못되었습니다/,
      );
    });

    it("should handle 429 rate limit error", async () => {
      // Arrange
      mockedAxios.get.mockRejectedValueOnce({
        isAxiosError: true,
        response: {
          status: 429,
          data: {
            reason: "Too many requests",
          },
        },
      });

      mockedAxios.isAxiosError = vi.fn().mockReturnValue(true);

      // Act & Assert
      await expect(adapter.getCurrentWeather("서울")).rejects.toThrow(
        /Rate Limit 초과.*일일 10,000회 제한을 초과했습니다/,
      );
    });

    it("should map WMO code 0 (clear) to correct icon during day", async () => {
      // Arrange
      const clearDayResponse = {
        ...mockOpenMeteoResponse,
        current: {
          ...mockOpenMeteoResponse.current,
          time: "2023-10-09T12:00", // 12시 (낮)
          weather_code: 0, // Clear sky
        },
      };

      mockedAxios.get.mockResolvedValueOnce({ data: clearDayResponse });

      // Act
      const result = await adapter.getCurrentWeather("서울");

      // Assert
      expect(result.weather.icon).toBe("01d"); // Clear day
      expect(result.weather.description).toBe("맑음");
    });

    it("should map WMO code 0 (clear) to correct icon during night", async () => {
      // Arrange
      const clearNightResponse = {
        ...mockOpenMeteoResponse,
        current: {
          ...mockOpenMeteoResponse.current,
          time: "2023-10-09T22:00", // 22시 (밤)
          weather_code: 0, // Clear sky
        },
      };

      mockedAxios.get.mockResolvedValueOnce({ data: clearNightResponse });

      // Act
      const result = await adapter.getCurrentWeather("서울");

      // Assert
      expect(result.weather.icon).toBe("01n"); // Clear night
      expect(result.weather.description).toBe("맑음");
    });

    it("should map WMO code 61 (rain) correctly", async () => {
      // Arrange
      const rainResponse = {
        ...mockOpenMeteoResponse,
        current: {
          ...mockOpenMeteoResponse.current,
          weather_code: 61, // Light rain
        },
      };

      mockedAxios.get.mockResolvedValueOnce({ data: rainResponse });

      // Act
      const result = await adapter.getCurrentWeather("서울");

      // Assert
      expect(result.weather.icon).toMatch(/^10[dn]$/); // Rain icon
      expect(result.weather.description).toBe("가벼운 비");
    });

    it("should map WMO code 71 (snow) correctly", async () => {
      // Arrange
      const snowResponse = {
        ...mockOpenMeteoResponse,
        current: {
          ...mockOpenMeteoResponse.current,
          weather_code: 71, // Light snow
        },
      };

      mockedAxios.get.mockResolvedValueOnce({ data: snowResponse });

      // Act
      const result = await adapter.getCurrentWeather("서울");

      // Assert
      expect(result.weather.icon).toMatch(/^13[dn]$/); // Snow icon
      expect(result.weather.description).toBe("가벼운 눈");
    });

    it("should map WMO code 95 (thunderstorm) correctly", async () => {
      // Arrange
      const thunderstormResponse = {
        ...mockOpenMeteoResponse,
        current: {
          ...mockOpenMeteoResponse.current,
          weather_code: 95, // Thunderstorm
        },
      };

      mockedAxios.get.mockResolvedValueOnce({ data: thunderstormResponse });

      // Act
      const result = await adapter.getCurrentWeather("서울");

      // Assert
      expect(result.weather.icon).toMatch(/^11[dn]$/); // Thunderstorm icon
      expect(result.weather.description).toBe("뇌우");
    });

    it("should handle unknown WMO code", async () => {
      // Arrange
      const unknownWeatherResponse = {
        ...mockOpenMeteoResponse,
        current: {
          ...mockOpenMeteoResponse.current,
          weather_code: 999, // Unknown code
        },
      };

      mockedAxios.get.mockResolvedValueOnce({ data: unknownWeatherResponse });

      // Act
      const result = await adapter.getCurrentWeather("서울");

      // Assert
      expect(result.weather.description).toBe("알 수 없음");
    });

    it("should calculate day/night correctly based on longitude", async () => {
      // Arrange: 서울(경도 126.978)에서 12시 UTC = 21시 local (밤)
      const nightTimeResponse = {
        ...mockOpenMeteoResponse,
        current: {
          ...mockOpenMeteoResponse.current,
          time: "2023-10-09T12:00Z", // 12:00 UTC
          weather_code: 0,
        },
      };

      mockedAxios.get.mockResolvedValueOnce({ data: nightTimeResponse });

      // Act
      const result = await adapter.getCurrentWeather("서울");

      // Assert: 서울 기준 21시는 밤이므로 01n
      expect(result.weather.icon).toBe("01n");
    });
  });

  describe("checkQuota", () => {
    it("should always return unlimited quota", async () => {
      // Act
      const quota = await adapter.checkQuota();

      // Assert
      expect(quota).toMatchObject({
        used: 0,
        limit: Number.POSITIVE_INFINITY,
        percentage: 0,
        status: "normal",
        resetTime: expect.any(Date),
      });
    });

    it("should return positive infinity as limit", async () => {
      // Act
      const quota = await adapter.checkQuota();

      // Assert
      expect(quota.limit).toBe(Number.POSITIVE_INFINITY);
      expect(Number.isFinite(quota.limit)).toBe(false);
    });
  });

  describe("validateConfig", () => {
    it("should always validate successfully (no API key required)", async () => {
      // Act & Assert
      await expect(adapter.validateConfig()).resolves.toBe(true);
    });
  });

  describe("daytime calculation", () => {
    it("should detect daytime correctly at 10:00 local", async () => {
      // Arrange: 서울(경도 126.978)에서 01:00 UTC = 10:00 local (낮)
      const morningResponse = {
        ...mockOpenMeteoResponse,
        current: {
          ...mockOpenMeteoResponse.current,
          time: "2023-10-09T01:00Z", // 01:00 UTC
          weather_code: 0,
        },
      };

      mockedAxios.get.mockResolvedValueOnce({ data: morningResponse });

      // Act
      const result = await adapter.getCurrentWeather("서울");

      // Assert
      expect(result.weather.icon).toBe("01d"); // Day icon
    });

    it("should detect nighttime correctly at 22:00 local", async () => {
      // Arrange: 서울(경도 126.978)에서 13:00 UTC = 22:00 local (밤)
      const nightResponse = {
        ...mockOpenMeteoResponse,
        current: {
          ...mockOpenMeteoResponse.current,
          time: "2023-10-09T13:00Z", // 13:00 UTC
          weather_code: 0,
        },
      };

      mockedAxios.get.mockResolvedValueOnce({ data: nightResponse });

      // Act
      const result = await adapter.getCurrentWeather("서울");

      // Assert
      expect(result.weather.icon).toBe("01n"); // Night icon
    });
  });
});
