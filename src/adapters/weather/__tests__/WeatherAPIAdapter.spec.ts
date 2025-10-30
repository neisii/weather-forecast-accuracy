/**
 * WeatherAPIAdapter Unit Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import axios from "axios";
import { WeatherAPIAdapter } from "../WeatherAPIAdapter";
import type { CurrentWeather } from "../WeatherProvider";

// axios 모킹
vi.mock("axios");
const mockedAxios = vi.mocked(axios);

// cityCoordinates 모킹
vi.mock("@/config/cityCoordinates", () => ({
  getCityCoordinate: vi.fn((city: string) => {
    const cityMap: Record<string, any> = {
      서울: { name: "서울", name_en: "Seoul", lat: 37.5683, lon: 126.9778 },
      부산: { name: "부산", name_en: "Busan", lat: 35.1796, lon: 129.0756 },
      Seoul: { name: "서울", name_en: "Seoul", lat: 37.5683, lon: 126.9778 },
    };
    return cityMap[city];
  }),
}));

describe("WeatherAPIAdapter", () => {
  let adapter: WeatherAPIAdapter;
  const mockApiKey = "test_api_key_12345";

  // Mock API 응답 데이터
  const mockWeatherAPIResponse = {
    location: {
      name: "Seoul",
      region: "Seoul",
      country: "South Korea",
      lat: 37.57,
      lon: 126.98,
      tz_id: "Asia/Seoul",
      localtime_epoch: 1696800000,
      localtime: "2023-10-09 12:00",
    },
    current: {
      last_updated_epoch: 1696800000,
      last_updated: "2023-10-09 12:00",
      temp_c: 20.5,
      temp_f: 68.9,
      is_day: 1,
      condition: {
        text: "Partly cloudy",
        icon: "//cdn.weatherapi.com/weather/64x64/day/116.png",
        code: 1003,
      },
      wind_mph: 6.9,
      wind_kph: 11.2,
      wind_degree: 180,
      wind_dir: "S",
      pressure_mb: 1013.0,
      pressure_in: 29.92,
      precip_mm: 0.0,
      precip_in: 0.0,
      humidity: 65,
      cloud: 25,
      feelslike_c: 19.0,
      feelslike_f: 66.2,
      vis_km: 10.0,
      vis_miles: 6.0,
      uv: 5.0,
      gust_mph: 8.5,
      gust_kph: 13.7,
    },
  };

  // LocalStorage 모킹
  const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        store = {};
      },
    };
  })();

  beforeEach(() => {
    adapter = new WeatherAPIAdapter(mockApiKey);

    // LocalStorage 모킹
    Object.defineProperty(global, "localStorage", {
      value: localStorageMock,
      writable: true,
    });
    localStorageMock.clear();

    // axios 모킹 초기화
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("constructor", () => {
    it("should create adapter with API key", () => {
      expect(adapter).toBeInstanceOf(WeatherAPIAdapter);
      expect(adapter.name).toBe("WeatherAPI.com");
    });
  });

  describe("getCurrentWeather", () => {
    it("should fetch and transform weather data correctly", async () => {
      // Arrange
      mockedAxios.get.mockResolvedValueOnce({
        data: mockWeatherAPIResponse,
      });

      // Act
      const result: CurrentWeather = await adapter.getCurrentWeather("Seoul");

      // Assert
      expect(mockedAxios.get).toHaveBeenCalledWith(
        "https://api.weatherapi.com/v1/current.json",
        {
          params: {
            key: mockApiKey,
            q: "Seoul",
            aqi: "no",
          },
        },
      );

      expect(result).toMatchObject({
        location: {
          name: "서울", // 한글명으로 복원됨
          country: "South Korea",
          coordinates: {
            lat: 37.57,
            lon: 126.98,
          },
          timezone: "Asia/Seoul",
        },
        current: {
          temperature: 20.5,
          feelsLike: 19.0,
          humidity: 65,
          pressure: 1013.0,
          windSpeed: expect.closeTo(3.11, 1), // 11.2 kph / 3.6 ≈ 3.11 m/s
          windDirection: 180,
          cloudiness: 25,
          visibility: 10000, // 10 km → 10000 m
          uvIndex: 5.0,
        },
        weather: {
          main: "Partly cloudy",
          description: "Partly cloudy",
          icon: expect.stringMatching(/^0[2-4][dn]$/), // 02d, 03d, 04d 등
        },
        timestamp: expect.any(Date),
      });
    });

    it("should increment quota after successful API call", async () => {
      // Arrange
      mockedAxios.get.mockResolvedValueOnce({
        data: mockWeatherAPIResponse,
      });

      // Act
      await adapter.getCurrentWeather("Seoul");

      // Assert
      const quotaData = JSON.parse(
        localStorage.getItem("weatherapi_quota") || "{}",
      );
      expect(quotaData.callsThisMonth).toBe(1);
    });

    it("should handle 401 authentication error", async () => {
      // Arrange
      mockedAxios.get.mockRejectedValueOnce({
        isAxiosError: true,
        response: {
          status: 401,
          data: {
            error: {
              message: "API key is invalid",
            },
          },
        },
      });

      mockedAxios.isAxiosError = vi.fn().mockReturnValue(true);

      // Act & Assert
      await expect(adapter.getCurrentWeather("Seoul")).rejects.toThrow(
        /인증 실패.*API 키가 유효하지 않습니다/,
      );
    });

    it("should handle 403 forbidden error", async () => {
      // Arrange
      mockedAxios.get.mockRejectedValueOnce({
        isAxiosError: true,
        response: {
          status: 403,
          data: {
            error: {
              message: "API key does not have access",
            },
          },
        },
      });

      mockedAxios.isAxiosError = vi.fn().mockReturnValue(true);

      // Act & Assert
      await expect(adapter.getCurrentWeather("Seoul")).rejects.toThrow(
        /접근 거부.*API 키 권한이 없습니다/,
      );
    });

    it("should handle 400 bad request error", async () => {
      // Arrange
      mockedAxios.get.mockRejectedValueOnce({
        isAxiosError: true,
        response: {
          status: 400,
          data: {
            error: {
              message: "No matching location found",
            },
          },
        },
      });

      mockedAxios.isAxiosError = vi.fn().mockReturnValue(true);

      // Act & Assert
      await expect(adapter.getCurrentWeather("InvalidCity")).rejects.toThrow(
        /잘못된 요청.*도시 이름을 확인하세요/,
      );
    });

    it("should handle 429 rate limit error", async () => {
      // Arrange
      mockedAxios.get.mockRejectedValueOnce({
        isAxiosError: true,
        response: {
          status: 429,
          data: {
            error: {
              message: "Monthly quota exceeded",
            },
          },
        },
      });

      mockedAxios.isAxiosError = vi.fn().mockReturnValue(true);

      // Act & Assert
      await expect(adapter.getCurrentWeather("Seoul")).rejects.toThrow(
        /Rate Limit 초과.*월간 호출 제한을 초과했습니다/,
      );
    });

    it("should map day condition codes correctly", async () => {
      // Arrange
      const dayResponse = {
        ...mockWeatherAPIResponse,
        current: {
          ...mockWeatherAPIResponse.current,
          is_day: 1,
          condition: {
            text: "Sunny",
            icon: "//cdn.weatherapi.com/weather/64x64/day/113.png",
            code: 1000, // Clear/Sunny → 01d
          },
        },
      };

      mockedAxios.get.mockResolvedValueOnce({ data: dayResponse });

      // Act
      const result = await adapter.getCurrentWeather("Seoul");

      // Assert
      expect(result.weather.icon).toBe("01d"); // Clear day
    });

    it("should map night condition codes correctly", async () => {
      // Arrange
      const nightResponse = {
        ...mockWeatherAPIResponse,
        current: {
          ...mockWeatherAPIResponse.current,
          is_day: 0,
          condition: {
            text: "Clear",
            icon: "//cdn.weatherapi.com/weather/64x64/night/113.png",
            code: 1000, // Clear → 01n
          },
        },
      };

      mockedAxios.get.mockResolvedValueOnce({ data: nightResponse });

      // Act
      const result = await adapter.getCurrentWeather("Seoul");

      // Assert
      expect(result.weather.icon).toBe("01n"); // Clear night
    });
  });

  describe("checkQuota", () => {
    it("should return initial quota info", async () => {
      // Act
      const quota = await adapter.checkQuota();

      // Assert
      expect(quota).toMatchObject({
        used: 0,
        limit: 1_000_000,
        percentage: 0,
        status: "normal",
        resetTime: expect.any(Date),
      });
    });

    it("should track monthly API calls", async () => {
      // Arrange
      mockedAxios.get.mockResolvedValue({ data: mockWeatherAPIResponse });

      // Act
      await adapter.getCurrentWeather("Seoul");
      await adapter.getCurrentWeather("Busan");
      await adapter.getCurrentWeather("Incheon");

      const quota = await adapter.checkQuota();

      // Assert
      expect(quota.used).toBe(3);
      expect(quota.limit).toBe(1_000_000);
      expect(quota.percentage).toBeCloseTo(0.0003, 4);
      expect(quota.status).toBe("normal");
    });

    it("should return warning status when quota is 80%+", async () => {
      // Arrange: 미리 80% 사용한 것으로 설정
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

      localStorage.setItem(
        "weatherapi_quota",
        JSON.stringify({
          callsThisMonth: 850_000,
          monthlyLimit: 1_000_000,
          lastResetDate: currentMonth,
        }),
      );

      // Act
      const quota = await adapter.checkQuota();

      // Assert
      expect(quota.status).toBe("warning");
      expect(quota.percentage).toBe(85);
    });

    it("should return exceeded status when quota is 100%", async () => {
      // Arrange
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

      localStorage.setItem(
        "weatherapi_quota",
        JSON.stringify({
          callsThisMonth: 1_000_000,
          monthlyLimit: 1_000_000,
          lastResetDate: currentMonth,
        }),
      );

      // Act
      const quota = await adapter.checkQuota();

      // Assert
      expect(quota.status).toBe("exceeded");
      expect(quota.percentage).toBe(100);
    });

    it("should reset quota on new month", async () => {
      // Arrange: 이전 달 데이터 설정
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthStr = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, "0")}-01`;

      localStorage.setItem(
        "weatherapi_quota",
        JSON.stringify({
          callsThisMonth: 500_000,
          monthlyLimit: 1_000_000,
          lastResetDate: lastMonthStr,
        }),
      );

      // Act
      const quota = await adapter.checkQuota();

      // Assert
      expect(quota.used).toBe(0); // 리셋됨
      expect(quota.status).toBe("normal");

      // LocalStorage도 업데이트되었는지 확인
      const stored = JSON.parse(
        localStorage.getItem("weatherapi_quota") || "{}",
      );
      expect(stored.callsThisMonth).toBe(0);
      expect(stored.lastResetDate).toMatch(/^\d{4}-\d{2}-01$/);
    });

    it("should calculate correct reset time (next month 1st)", async () => {
      // Act
      const quota = await adapter.checkQuota();

      // Assert
      const resetTime = quota.resetTime;
      expect(resetTime.getDate()).toBe(1); // 1일
      expect(resetTime.getHours()).toBe(0); // 0시
      expect(resetTime.getMinutes()).toBe(0); // 0분
      expect(resetTime.getSeconds()).toBe(0); // 0초

      // 다음 달인지 확인
      const now = new Date();
      const expectedMonth = (now.getMonth() + 1) % 12;
      expect(resetTime.getMonth()).toBe(expectedMonth);
    });
  });

  describe("validateConfig", () => {
    it("should validate API key exists", async () => {
      // Act & Assert
      await expect(adapter.validateConfig()).resolves.toBe(true);
    });

    it("should throw error if API key is empty", async () => {
      // Arrange
      const invalidAdapter = new WeatherAPIAdapter("");

      // Act & Assert
      await expect(invalidAdapter.validateConfig()).rejects.toThrow(
        /API 키가 설정되지 않았습니다/,
      );
    });

    it("should throw error if API key is whitespace only", async () => {
      // Arrange
      const invalidAdapter = new WeatherAPIAdapter("   ");

      // Act & Assert
      await expect(invalidAdapter.validateConfig()).rejects.toThrow(
        /API 키가 설정되지 않았습니다/,
      );
    });
  });

  describe("한글 도시명 자동 변환", () => {
    it("should convert Korean city name to English for API call", async () => {
      // Arrange
      mockedAxios.get.mockResolvedValueOnce({
        data: mockWeatherAPIResponse,
      });

      // Act
      await adapter.getCurrentWeather("서울");

      // Assert: 영문명으로 API 호출되었는지 확인
      expect(mockedAxios.get).toHaveBeenCalledWith(
        "https://api.weatherapi.com/v1/current.json",
        expect.objectContaining({
          params: expect.objectContaining({
            q: "Seoul", // 한글 "서울" → 영문 "Seoul"
          }),
        }),
      );
    });

    it("should restore Korean city name in response", async () => {
      // Arrange
      mockedAxios.get.mockResolvedValueOnce({
        data: mockWeatherAPIResponse,
      });

      // Act
      const result = await adapter.getCurrentWeather("부산");

      // Assert: 응답에 한글명이 복원되었는지 확인
      expect(result.location.name).toBe("부산");
    });

    it("should handle English city name directly", async () => {
      // Arrange
      mockedAxios.get.mockResolvedValueOnce({
        data: mockWeatherAPIResponse,
      });

      // Act
      await adapter.getCurrentWeather("Seoul");

      // Assert: 영문명 그대로 사용
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({
            q: "Seoul",
          }),
        }),
      );
    });

    it("should fallback to original name if not in cityCoordinates", async () => {
      // Arrange
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          ...mockWeatherAPIResponse,
          location: {
            ...mockWeatherAPIResponse.location,
            name: "Tokyo",
          },
        },
      });

      // Act
      const result = await adapter.getCurrentWeather("Tokyo");

      // Assert: cityCoordinates에 없으면 원본 이름 사용
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({
            q: "Tokyo",
          }),
        }),
      );
      expect(result.location.name).toBe("Tokyo");
    });
  });
});
