/**
 * Demo accuracy data generator
 *
 * Generates realistic 2-week sample data for UI demonstration
 */

import type {
  PredictionData,
  ObservationData,
} from "@/composables/useAccuracyData";

/**
 * Generate demo predictions for 14 days
 */
export function generateDemoPredictions(): PredictionData[] {
  const predictions: PredictionData[] = [];
  const today = new Date();

  for (let i = 0; i < 14; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - (13 - i)); // Start from 14 days ago

    const targetDate = new Date(date);
    targetDate.setDate(targetDate.getDate() + 1); // Tomorrow

    predictions.push({
      date: formatDate(date),
      collected_at: date.toISOString(),
      target_date: formatDate(targetDate),
      city: "서울",
      predictions: {
        openweather: generateProviderPrediction("openweather", i),
        weatherapi: generateProviderPrediction("weatherapi", i),
        openmeteo: generateProviderPrediction("openmeteo", i),
      },
    });
  }

  return predictions;
}

/**
 * Generate demo observations for 14 days
 */
export function generateDemoObservations(): ObservationData[] {
  const observations: ObservationData[] = [];
  const today = new Date();

  for (let i = 0; i < 14; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - (13 - i) + 1); // Start from 13 days ago (day after first prediction)

    observations.push({
      date: formatDate(date),
      collected_at: date.toISOString(),
      city: "서울",
      observations: {
        openweather: generateProviderObservation("openweather", i),
        weatherapi: generateProviderObservation("weatherapi", i),
        openmeteo: generateProviderObservation("openmeteo", i),
      },
    });
  }

  return observations;
}

/**
 * Generate provider prediction with realistic variations
 */
function generateProviderPrediction(provider: string, dayIndex: number) {
  // Base temperature varies by day (simulating seasonal changes)
  const baseTemp = 15 + Math.sin(dayIndex / 3) * 8;

  // Provider-specific accuracy characteristics
  const accuracy = getProviderAccuracy(provider);

  // Add random variation based on provider accuracy
  const tempError = (Math.random() - 0.5) * accuracy.tempVariation;
  const temp_max = Math.round((baseTemp + 5 + tempError) * 10) / 10;
  const temp_min = Math.round((baseTemp - 3 + tempError * 0.8) * 10) / 10;
  const temp_day = Math.round((baseTemp + 3 + tempError) * 10) / 10;
  const temp_night = Math.round((baseTemp - 2 + tempError * 0.8) * 10) / 10;

  // Weather condition (may differ from actual)
  const conditions = ["Clear", "Clouds", "Rain", "Drizzle"];
  const conditionIndex = Math.floor(dayIndex / 3) % conditions.length;
  const condition_main =
    Math.random() < accuracy.conditionAccuracy
      ? conditions[conditionIndex]!
      : conditions[(conditionIndex + 1) % conditions.length]!;

  const conditionDescriptions: Record<string, { en: string; ko: string }> = {
    Clear: { en: "clear sky", ko: "맑음" },
    Clouds: { en: "scattered clouds", ko: "구름 조금" },
    Rain: { en: "light rain", ko: "약한 비" },
    Drizzle: { en: "light intensity drizzle", ko: "가랑비" },
  };

  const description = conditionDescriptions[condition_main]!;

  return {
    temp_max,
    temp_min,
    temp_day,
    temp_night,
    condition_main,
    condition_description: description.en,
    condition_description_ko: description.ko,
    condition_icon: getIconForCondition(condition_main),
    humidity: Math.round(
      60 + (Math.random() - 0.5) * accuracy.humidityVariation,
    ),
    wind_speed:
      Math.round((3 + (Math.random() - 0.5) * accuracy.windVariation) * 10) /
      10,
    precipitation_probability: condition_main === "Rain" ? 80 : 20,
    predicted_at: new Date().toISOString(),
  };
}

/**
 * Generate provider observation (actual weather)
 */
function generateProviderObservation(_provider: string, dayIndex: number) {
  // Base temperature (ground truth)
  const baseTemp = 15 + Math.sin(dayIndex / 3) * 8;

  // Small random variation in observation (weather itself varies)
  const actualVariation = (Math.random() - 0.5) * 2;
  const temp = Math.round((baseTemp + actualVariation) * 10) / 10;
  const temp_max = Math.round((baseTemp + 5 + actualVariation) * 10) / 10;
  const temp_min = Math.round((baseTemp - 3 + actualVariation * 0.8) * 10) / 10;

  // Actual weather condition (ground truth)
  const conditions = ["Clear", "Clouds", "Rain", "Drizzle"];
  const conditionIndex = Math.floor(dayIndex / 3) % conditions.length;
  const condition_main = conditions[conditionIndex]!;

  const conditionDescriptions: Record<string, { en: string; ko: string }> = {
    Clear: { en: "clear sky", ko: "맑음" },
    Clouds: { en: "scattered clouds", ko: "구름 조금" },
    Rain: { en: "light rain", ko: "약한 비" },
    Drizzle: { en: "light intensity drizzle", ko: "가랑비" },
  };

  const description = conditionDescriptions[condition_main]!;

  return {
    temp,
    feels_like: Math.round((temp - 1 + (Math.random() - 0.5) * 2) * 10) / 10,
    temp_max,
    temp_min,
    condition_main,
    condition_description: description.en,
    condition_description_ko: description.ko,
    condition_icon: getIconForCondition(condition_main),
    humidity: Math.round(60 + (Math.random() - 0.5) * 20),
    wind_speed: Math.round((3 + (Math.random() - 0.5) * 4) * 10) / 10,
    observed_at: new Date().toISOString(),
  };
}

/**
 * Provider accuracy characteristics
 *
 * OpenWeather: Good temperature, moderate condition
 * WeatherAPI: Best overall accuracy
 * Open-Meteo: Good condition, moderate temperature
 */
function getProviderAccuracy(provider: string) {
  const profiles = {
    openweather: {
      tempVariation: 3, // ±1.5°C error
      conditionAccuracy: 0.75, // 75% condition match
      humidityVariation: 15,
      windVariation: 2,
    },
    weatherapi: {
      tempVariation: 2, // ±1°C error (best)
      conditionAccuracy: 0.85, // 85% condition match (best)
      humidityVariation: 10,
      windVariation: 1.5,
    },
    openmeteo: {
      tempVariation: 4, // ±2°C error
      conditionAccuracy: 0.8, // 80% condition match
      humidityVariation: 12,
      windVariation: 2.5,
    },
  };

  return profiles[provider as keyof typeof profiles] || profiles.weatherapi;
}

/**
 * Get weather icon for condition
 */
function getIconForCondition(condition: string): string {
  const icons: Record<string, string> = {
    Clear: "01d",
    Clouds: "02d",
    Rain: "10d",
    Drizzle: "09d",
  };
  return icons[condition] || "01d";
}

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(date: Date): string {
  return date.toISOString().split("T")[0]!;
}
