import { describe, it, expect } from "vitest";
import { CustomWeatherPredictor } from "@/services/weather/CustomWeatherPredictor";
import type { ProviderPredictions } from "@/types/domain/customPrediction";
import type { CurrentWeather } from "@/types/domain/weather";

describe("CustomWeatherPredictor", () => {
  const predictor = new CustomWeatherPredictor();

  const createMockWeather = (
    temp: number,
    feelsLike: number,
    humidity: number,
    windSpeed: number,
    conditionMain: string,
  ): CurrentWeather => ({
    location: {
      name: "Seoul",
      nameKo: "서울",
      country: "KR",
      coordinates: { lat: 37.5683, lon: 126.9778 },
      timezone: "Asia/Seoul",
    },
    current: {
      temperature: temp,
      feelsLike: feelsLike,
      humidity: humidity,
      pressure: 1013,
      windSpeed: windSpeed,
      windDirection: 180,
      cloudiness: 50,
      visibility: 10000,
      uvIndex: 5,
    },
    weather: {
      main: conditionMain,
      description: "Partly cloudy",
      descriptionKo: "부분 흐림",
      icon: "02d",
    },
    timestamp: new Date("2025-10-23T12:00:00Z"),
  });

  const mockProviders: ProviderPredictions = {
    openweather: createMockWeather(18, 17, 68, 2.0, "Clouds"),
    weatherapi: createMockWeather(17, 16, 62, 2.5, "Partly cloudy"),
    openmeteo: createMockWeather(19, 18, 0, 2.2, "Cloudy"),
  };

  it("should generate custom prediction", () => {
    const prediction = predictor.predict(mockProviders);
    expect(prediction).toBeDefined();
    expect(prediction.location.name).toBe("Seoul");
  });

  it("should calculate weighted temperature correctly", () => {
    const prediction = predictor.predict(mockProviders);
    // Expected: 19*0.45 + 18*0.40 + 17*0.15 = 8.55 + 7.2 + 2.55 = 18.3
    expect(prediction.current.temperature).toBeCloseTo(18.0, 0);
  });

  it("should calculate weighted humidity (excluding OpenMeteo)", () => {
    const prediction = predictor.predict(mockProviders);
    // Expected: 62*0.70 + 68*0.30 = 43.4 + 20.4 = 63.8 ≈ 64
    expect(prediction.current.humidity).toBeCloseTo(64, 0);
  });

  it("should calculate weighted wind speed correctly", () => {
    const prediction = predictor.predict(mockProviders);
    // Expected: 2.2*0.60 + 2.0*0.25 + 2.5*0.15 = 1.32 + 0.5 + 0.375 = 2.195 ≈ 2.2
    expect(prediction.current.windSpeed).toBeCloseTo(2.2, 1);
  });

  it("should use OpenWeather condition", () => {
    const prediction = predictor.predict(mockProviders);
    expect(prediction.weather.main).toBe("Clouds");
  });

  it("should include confidence metrics", () => {
    const prediction = predictor.predict(mockProviders);
    expect(prediction.confidence.overall).toBeGreaterThanOrEqual(0);
    expect(prediction.confidence.overall).toBeLessThanOrEqual(100);
    expect(prediction.confidence.temperature).toBeDefined();
    expect(prediction.confidence.humidity).toBeDefined();
    expect(prediction.confidence.windSpeed).toBeDefined();
  });

  it("should include provider data", () => {
    const prediction = predictor.predict(mockProviders);
    expect(prediction.providers.openweather).toBeDefined();
    expect(prediction.providers.weatherapi).toBeDefined();
    expect(prediction.providers.openmeteo).toBeDefined();
  });

  it("should include weights", () => {
    const prediction = predictor.predict(mockProviders);
    expect(prediction.weights.temperature.openmeteo).toBe(0.45);
    expect(prediction.weights.temperature.openweather).toBe(0.4);
    expect(prediction.weights.temperature.weatherapi).toBe(0.15);
  });
});
