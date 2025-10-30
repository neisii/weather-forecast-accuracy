#!/usr/bin/env tsx

/**
 * Collect Weather Predictions Script
 *
 * Purpose: Collect tomorrow's weather forecast from all providers
 * Schedule: Daily at 00:00 UTC (09:00 KST) via GitHub Actions
 * Output: data/predictions/YYYY-MM-DD.json
 */

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import {
  WeatherService,
  createDefaultConfig,
} from "../src/services/weather/WeatherService.js";
import type { ProviderType } from "../src/services/weather/WeatherService.js";

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(date) {
  return date.toISOString().split("T")[0];
}

/**
 * Get tomorrow's date
 */
function getTomorrow() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow;
}

/**
 * Extract forecast for specific date from forecast array
 */
function extractForecastForDate(forecasts, targetDate) {
  const targetDateStr = formatDate(targetDate);

  for (const forecast of forecasts) {
    const forecastDateStr = formatDate(new Date(forecast.targetDate));
    if (forecastDateStr === targetDateStr) {
      return {
        temp_max: forecast.temperature.max,
        temp_min: forecast.temperature.min,
        temp_day: forecast.temperature.day,
        temp_night: forecast.temperature.night,
        condition_main: forecast.weather.main,
        condition_description: forecast.weather.description,
        condition_description_ko: forecast.weather.descriptionKo,
        condition_icon: forecast.weather.icon,
        humidity: forecast.humidity,
        wind_speed: forecast.windSpeed,
        precipitation_probability: forecast.precipitationProbability,
        predicted_at: forecast.predictedAt.toISOString(),
      };
    }
  }

  return null;
}

/**
 * Collect predictions from all providers
 */
async function collectPredictions() {
  const today = new Date();
  const tomorrow = getTomorrow();
  const tomorrowStr = formatDate(tomorrow);

  console.log(`\n=== Collecting Weather Predictions ===`);
  console.log(`Collection Time: ${today.toISOString()}`);
  console.log(`Target Date: ${tomorrowStr}`);
  console.log(`City: 서울\n`);

  // Create weather service with Node.js environment variables
  const config = createDefaultConfig();

  // Override to use process.env (Node.js) instead of import.meta.env (Vite)
  config.providers.openweather.apiKey = process.env.OPENWEATHER_API_KEY || "";
  config.providers.weatherapi.apiKey = process.env.WEATHERAPI_KEY || "";

  const weatherService = new WeatherService(config);
  const city = "서울";

  // Collect forecasts from all providers
  const predictions = {};
  const providers = ["openweather", "weatherapi", "openmeteo"];

  for (const provider of providers) {
    try {
      console.log(`Collecting from ${provider}...`);

      // Switch to provider
      await weatherService.switchProvider(provider);

      // Get forecast (days parameter varies by provider)
      // OpenWeather/WeatherAPI: days=1 means first N days from now
      // We request more days to ensure we get tomorrow's data
      const forecasts = await weatherService.getForecast(city, 3);

      // Debug: Log all forecast dates
      console.log(
        `  📅 Received ${forecasts.length} forecasts:`,
        forecasts.map((f) => formatDate(new Date(f.targetDate))).join(", "),
      );

      // Extract tomorrow's forecast
      const tomorrowForecast = extractForecastForDate(forecasts, tomorrow);

      if (!tomorrowForecast) {
        console.error(`  ❌ No forecast found for ${tomorrowStr}`);
        predictions[provider] = null;
        continue;
      }

      predictions[provider] = tomorrowForecast;
      console.log(
        `  ✅ Success: ${tomorrowForecast.condition_main}, ${tomorrowForecast.temp_max}°C`,
      );
    } catch (error) {
      console.error(`  ❌ Error: ${error.message}`);
      predictions[provider] = {
        error: error.message,
        collected_at: today.toISOString(),
      };
    }
  }

  // Create output data
  const output = {
    date: formatDate(today),
    collected_at: today.toISOString(),
    target_date: tomorrowStr,
    city: city,
    predictions: predictions,
  };

  // Ensure output directory exists
  const outputDir = path.join(__dirname, "../data/predictions");
  await fs.mkdir(outputDir, { recursive: true });

  // Write to file
  const outputPath = path.join(outputDir, `${tomorrowStr}.json`);
  await fs.writeFile(outputPath, JSON.stringify(output, null, 2), "utf8");

  console.log(`\n✅ Predictions saved: ${outputPath}`);

  // Summary
  const successCount = Object.values(predictions).filter(
    (p) => p && !p.error,
  ).length;
  console.log(
    `\nSummary: ${successCount}/${providers.length} providers successful\n`,
  );

  return output;
}

// Run script
collectPredictions()
  .then(() => {
    console.log("✅ Collection completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Collection failed:", error);
    process.exit(1);
  });
