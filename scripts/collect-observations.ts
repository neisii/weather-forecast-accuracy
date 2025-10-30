#!/usr/bin/env tsx

/**
 * Collect Weather Observations Script
 *
 * Purpose: Collect today's actual weather from all providers
 * Schedule: Daily at 00:30 UTC (09:30 KST) via GitHub Actions
 * Output: data/observations/YYYY-MM-DD.json
 *
 * Note: This runs 30 minutes after predictions to ensure we're collecting
 * the "actual" weather for the same day we made predictions about yesterday.
 */

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import {
  WeatherService,
  createDefaultConfig,
} from "../src/services/weather/WeatherService.js";
import type { ProviderType } from "../src/services/weather/WeatherService.js";
import type { CurrentWeather } from "../src/types/domain/weather.js";

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
 * Transform CurrentWeather to observation format
 */
function transformToObservation(weather: CurrentWeather) {
  return {
    temp: weather.current.temperature,
    feels_like: weather.current.feelsLike,
    temp_min: weather.current.temperature, // Current weather doesn't have min/max, use current
    temp_max: weather.current.temperature,
    condition_main: weather.weather.main,
    condition_description: weather.weather.description,
    condition_description_ko: weather.weather.descriptionKo,
    condition_icon: weather.weather.icon,
    humidity: weather.current.humidity,
    pressure: weather.current.pressure,
    wind_speed: weather.current.windSpeed,
    wind_direction: weather.current.windDirection,
    cloudiness: weather.current.cloudiness,
    visibility: weather.current.visibility,
    uv_index: weather.current.uvIndex,
    observed_at: weather.timestamp.toISOString(),
    location: {
      name: weather.location.name,
      name_ko: weather.location.nameKo,
      country: weather.location.country,
      lat: weather.location.coordinates.lat,
      lon: weather.location.coordinates.lon,
    },
  };
}

/**
 * Collect observations from all providers
 */
async function collectObservations() {
  const today = new Date();
  const todayStr = formatDate(today);

  console.log(`\n=== Collecting Weather Observations ===`);
  console.log(`Collection Time: ${today.toISOString()}`);
  console.log(`Target Date: ${todayStr}`);
  console.log(`City: 서울\n`);

  // Create weather service with Node.js environment variables
  const config = createDefaultConfig();

  // Override to use process.env (Node.js) instead of import.meta.env (Vite)
  config.providers.openweather.apiKey = process.env.OPENWEATHER_API_KEY || "";
  config.providers.weatherapi.apiKey = process.env.WEATHERAPI_KEY || "";

  const weatherService = new WeatherService(config);
  const city = "서울";

  // Collect current weather from all providers
  const observations = {};
  const providers = ["openweather", "weatherapi", "openmeteo"];

  for (const provider of providers) {
    try {
      console.log(`Collecting from ${provider}...`);

      // Switch to provider
      await weatherService.switchProvider(provider);

      // Get current weather
      const weather = await weatherService.getCurrentWeather(city);

      // Transform to observation format
      observations[provider] = transformToObservation(weather);

      console.log(
        `  ✅ Success: ${weather.weather.main}, ${weather.current.temperature}°C`,
      );
    } catch (error) {
      console.error(`  ❌ Error: ${error.message}`);
      observations[provider] = {
        error: error.message,
        observed_at: today.toISOString(),
      };
    }
  }

  // Create output data
  const output = {
    date: todayStr,
    collected_at: today.toISOString(),
    city: city,
    observations: observations,
  };

  // Ensure output directory exists
  const outputDir = path.join(__dirname, "../data/observations");
  await fs.mkdir(outputDir, { recursive: true });

  // Write to file
  const outputPath = path.join(outputDir, `${todayStr}.json`);
  await fs.writeFile(outputPath, JSON.stringify(output, null, 2), "utf8");

  console.log(`\n✅ Observations saved: ${outputPath}`);

  // Summary
  const successCount = Object.values(observations).filter(
    (o) => o && !o.error,
  ).length;
  console.log(
    `\nSummary: ${successCount}/${providers.length} providers successful\n`,
  );

  return output;
}

// Run script
collectObservations()
  .then(() => {
    console.log("✅ Collection completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Collection failed:", error);
    process.exit(1);
  });
