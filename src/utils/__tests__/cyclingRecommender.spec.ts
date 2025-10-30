/**
 * CyclingRecommender Unit Tests
 */

import { describe, it, expect } from "vitest";
import {
  calculateCyclingScore,
  getRecommendationLevel,
} from "../cyclingRecommender";
import type { CurrentWeather } from "@/adapters/weather/WeatherProvider";

describe("cyclingRecommender", () => {
  describe("getRecommendationLevel", () => {
    it("should return excellent for score >= 80", () => {
      expect(getRecommendationLevel(100)).toBe("excellent");
      expect(getRecommendationLevel(85)).toBe("excellent");
      expect(getRecommendationLevel(80)).toBe("excellent");
    });

    it("should return good for score 60-79", () => {
      expect(getRecommendationLevel(79)).toBe("good");
      expect(getRecommendationLevel(70)).toBe("good");
      expect(getRecommendationLevel(60)).toBe("good");
    });

    it("should return fair for score 40-59", () => {
      expect(getRecommendationLevel(59)).toBe("fair");
      expect(getRecommendationLevel(50)).toBe("fair");
      expect(getRecommendationLevel(40)).toBe("fair");
    });

    it("should return poor for score 20-39", () => {
      expect(getRecommendationLevel(39)).toBe("poor");
      expect(getRecommendationLevel(30)).toBe("poor");
      expect(getRecommendationLevel(20)).toBe("poor");
    });

    it("should return dangerous for score < 20", () => {
      expect(getRecommendationLevel(19)).toBe("dangerous");
      expect(getRecommendationLevel(10)).toBe("dangerous");
      expect(getRecommendationLevel(0)).toBe("dangerous");
    });
  });

  describe("calculateCyclingScore", () => {
    const createMockWeather = (
      overrides: {
        temperature?: number;
        feelsLike?: number;
        humidity?: number;
        windSpeed?: number;
        condition?: string;
      } = {},
    ): CurrentWeather => ({
      location: {
        name: "서울",
        country: "KR",
        coordinates: { lat: 37.5665, lon: 126.978 },
      },
      current: {
        temperature: overrides.temperature ?? 20,
        feelsLike: overrides.feelsLike ?? 20,
        humidity: overrides.humidity ?? 50,
        windSpeed: overrides.windSpeed ?? 5 / 3.6, // Convert km/h to m/s
        pressure: 1013,
        windDirection: 180,
        cloudiness: 20,
        visibility: 10000,
        uvIndex: 5,
      },
      weather: {
        main: overrides.condition ?? "Clear",
        description: overrides.condition ?? "clear sky",
        descriptionKo: "맑음",
        icon: "01d",
      },
      timestamp: new Date(),
    });

    describe("Temperature evaluation", () => {
      it("should give excellent score for ideal temperature (15-25°C)", () => {
        const weather = createMockWeather({ temperature: 20, feelsLike: 20 });
        const result = calculateCyclingScore(weather);

        expect(result.score).toBeGreaterThanOrEqual(80);
        expect(result.recommendation).toBe("excellent");
        expect(result.reasons).toContain("완벽한 라이딩 온도");
      });

      it("should penalize freezing temperature (<0°C)", () => {
        const weather = createMockWeather({ temperature: -5, feelsLike: -5 });
        const result = calculateCyclingScore(weather);

        expect(result.score).toBeLessThanOrEqual(80);
        expect(result.reasons.some((r) => r.includes("영하"))).toBe(true);
        expect(result.clothing.some((c) => c.name === "방한 장갑")).toBe(true);
      });

      it("should penalize extreme heat (>35°C)", () => {
        const weather = createMockWeather({ temperature: 38, feelsLike: 38 });
        const result = calculateCyclingScore(weather);

        expect(result.score).toBeLessThanOrEqual(85);
        expect(result.reasons.some((r) => r.includes("폭염"))).toBe(true);
      });

      it("should handle cold weather (0-10°C)", () => {
        const weather = createMockWeather({ temperature: 5, feelsLike: 5 });
        const result = calculateCyclingScore(weather);

        expect(result.clothing.some((c) => c.name === "긴팔 저지")).toBe(true);
        expect(result.clothing.some((c) => c.name === "장갑")).toBe(true);
      });

      it("should handle hot weather (30-35°C)", () => {
        const weather = createMockWeather({ temperature: 32, feelsLike: 32 });
        const result = calculateCyclingScore(weather);

        expect(result.reasons.some((r) => r.includes("더운"))).toBe(true);
        expect(result.clothing.some((c) => c.name === "선크림")).toBe(true);
      });
    });

    describe("Rain evaluation", () => {
      it("should heavily penalize heavy rain", () => {
        const weather = createMockWeather({ condition: "heavy rain" });
        const result = calculateCyclingScore(weather);

        expect(result.score).toBeLessThan(75);
        expect(result.recommendation).toMatch(/good|fair|poor|dangerous/);
        expect(result.reasons.some((r) => r.includes("비"))).toBe(true);
      });

      it("should moderately penalize light rain", () => {
        const weather = createMockWeather({ condition: "light rain" });
        const result = calculateCyclingScore(weather);

        expect(result.score).toBeLessThan(90);
        expect(result.reasons.some((r) => r.includes("비"))).toBe(true);
        expect(result.clothing.some((c) => c.name === "레인 재킷")).toBe(true);
      });

      it("should heavily penalize snow", () => {
        const weather = createMockWeather({
          condition: "snow",
          temperature: -2,
        });
        const result = calculateCyclingScore(weather);

        expect(result.score).toBeLessThanOrEqual(55);
        expect(result.reasons.some((r) => r.includes("눈"))).toBe(true);
      });

      it("should handle cloudy weather well", () => {
        const weather = createMockWeather({ condition: "Clouds" });
        const result = calculateCyclingScore(weather);

        expect(result.score).toBeGreaterThanOrEqual(70);
      });
    });

    describe("Wind evaluation", () => {
      it("should not penalize light wind (<10 km/h)", () => {
        const weather = createMockWeather({ windSpeed: 8 / 3.6 }); // Convert km/h to m/s
        const result = calculateCyclingScore(weather);

        expect(result.score).toBeGreaterThanOrEqual(75);
      });

      it("should moderately penalize moderate wind (10-20 km/h)", () => {
        const weather = createMockWeather({ windSpeed: 12 / 3.6 }); // Convert km/h to m/s
        const result = calculateCyclingScore(weather);

        expect(result.reasons.some((r) => r.includes("바람"))).toBe(true);
      });

      it("should heavily penalize strong wind (20-30 km/h)", () => {
        const weather = createMockWeather({ windSpeed: 25 / 3.6 }); // Convert km/h to m/s
        const result = calculateCyclingScore(weather);

        expect(result.score).toBeLessThan(80);
        expect(result.reasons.some((r) => r.includes("강풍"))).toBe(true);
      });

      it("should severely penalize very strong wind (>30 km/h)", () => {
        const weather = createMockWeather({ windSpeed: 35 / 3.6 }); // Convert km/h to m/s
        const result = calculateCyclingScore(weather);

        expect(result.score).toBeLessThan(80);
        expect(result.reasons.some((r) => r.includes("강풍"))).toBe(true);
      });
    });

    describe("Humidity evaluation", () => {
      it("should not penalize comfortable humidity (30-70%)", () => {
        const weather = createMockWeather({ humidity: 50 });
        const result = calculateCyclingScore(weather);

        expect(result.score).toBeGreaterThanOrEqual(80);
      });

      it("should penalize high humidity (>80%)", () => {
        const weather = createMockWeather({ humidity: 85 });
        const result = calculateCyclingScore(weather);

        expect(result.reasons.some((r) => r.includes("습도"))).toBe(true);
      });

      it("should penalize very high humidity (>90%)", () => {
        const weather = createMockWeather({ humidity: 95 });
        const result = calculateCyclingScore(weather);

        expect(result.score).toBeLessThanOrEqual(90);
      });
    });

    describe("Feels-like temperature evaluation", () => {
      it("should penalize large feels-like difference", () => {
        const weather = createMockWeather({ temperature: 20, feelsLike: 8 });
        const result = calculateCyclingScore(weather);

        // Temperature 20 is ideal, but feelsLike 8 creates a diff of 12 (>10)
        expect(result.reasons.some((r) => r.includes("체감"))).toBe(true);
      });

      it("should not penalize small feels-like difference", () => {
        const weather = createMockWeather({ temperature: 20, feelsLike: 19 });
        const result = calculateCyclingScore(weather);

        expect(result.reasons.every((r) => !r.includes("체감온도"))).toBe(true);
      });
    });

    describe("Comprehensive scenarios", () => {
      it("should give perfect score for ideal conditions", () => {
        const weather = createMockWeather({
          temperature: 20,
          feelsLike: 20,
          condition: "clear sky",
          humidity: 50,
          windSpeed: 5 / 3.6, // Convert km/h to m/s
        });
        const result = calculateCyclingScore(weather);

        expect(result.score).toBeGreaterThanOrEqual(80);
        expect(result.recommendation).toBe("excellent");
        expect(result.clothing.length).toBeGreaterThan(0);
        expect(
          result.clothing.every(
            (c) => c.name && typeof c.essential === "boolean",
          ),
        ).toBe(true);
      });

      it("should give dangerous score for terrible conditions", () => {
        const weather = createMockWeather({
          temperature: -5,
          feelsLike: -10,
          condition: "Heavy snow",
          humidity: 95,
          windSpeed: 40,
        });
        const result = calculateCyclingScore(weather);

        expect(result.score).toBeLessThan(20);
        expect(result.recommendation).toBe("dangerous");
        expect(result.reasons.length).toBeGreaterThan(3);
      });

      it("should always include essential safety items", () => {
        const weather = createMockWeather();
        const result = calculateCyclingScore(weather);

        expect(
          result.clothing.some((c) => c.name === "자전거 헬멧" && c.essential),
        ).toBe(true);
        expect(
          result.clothing.some((c) => c.name === "선글라스" && c.essential),
        ).toBe(true);
      });

      it("should clamp score between 0 and 100", () => {
        // Test extreme negative scenario
        const badWeather = createMockWeather({
          temperature: -10,
          feelsLike: -20,
          condition: "Heavy snow",
          humidity: 100,
          windSpeed: 50,
        });
        const badResult = calculateCyclingScore(badWeather);
        expect(badResult.score).toBeGreaterThanOrEqual(0);
        expect(badResult.score).toBeLessThanOrEqual(100);

        // Test perfect scenario
        const goodWeather = createMockWeather({
          temperature: 20,
          feelsLike: 20,
          condition: "Clear",
          humidity: 50,
          windSpeed: 5,
        });
        const goodResult = calculateCyclingScore(goodWeather);
        expect(goodResult.score).toBeGreaterThanOrEqual(0);
        expect(goodResult.score).toBeLessThanOrEqual(100);
      });
    });
  });
});
