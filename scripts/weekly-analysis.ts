#!/usr/bin/env tsx

/**
 * Weekly Weather Accuracy Analysis Script
 *
 * Purpose: Analyze prediction accuracy using AI (GPT-4o)
 * Schedule: Weekly on Monday at 01:00 UTC (10:00 KST) via GitHub Actions
 * Output: data/analysis/week-N.json
 *
 * Analysis Method: Relative Consistency
 * - Compare each provider's "forecast vs own observation"
 * - No consensus averaging (avoids circular logic)
 * - Self-consistency measurement
 */

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

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
 * Load all predictions from a date range
 */
async function loadPredictions(startDate, endDate) {
  const predictions = [];
  const dataDir = path.join(__dirname, "../data/predictions");

  const current = new Date(startDate);
  const end = new Date(endDate);

  while (current <= end) {
    const dateStr = formatDate(current);
    const filePath = path.join(dataDir, `${dateStr}.json`);

    try {
      const content = await fs.readFile(filePath, "utf8");
      const data = JSON.parse(content);
      predictions.push(data);
    } catch (error) {
      console.warn(`  ⚠️  Prediction file not found: ${dateStr}`);
    }

    current.setDate(current.getDate() + 1);
  }

  return predictions;
}

/**
 * Load all observations from a date range
 */
async function loadObservations(startDate, endDate) {
  const observations = [];
  const dataDir = path.join(__dirname, "../data/observations");

  const current = new Date(startDate);
  const end = new Date(endDate);

  while (current <= end) {
    const dateStr = formatDate(current);
    const filePath = path.join(dataDir, `${dateStr}.json`);

    try {
      const content = await fs.readFile(filePath, "utf8");
      const data = JSON.parse(content);
      observations.push(data);
    } catch (error) {
      console.warn(`  ⚠️  Observation file not found: ${dateStr}`);
    }

    current.setDate(current.getDate() + 1);
  }

  return observations;
}

/**
 * Calculate consistency score between prediction and observation
 */
function calculateConsistency(prediction, observation) {
  if (!prediction || !observation || prediction.error || observation.error) {
    return null;
  }

  // Temperature error (absolute difference)
  const tempError = Math.abs(prediction.temp_max - observation.temp);

  // Condition match (exact match)
  const conditionMatch =
    prediction.condition_main === observation.condition_main;

  // Humidity error
  const humidityError = Math.abs(prediction.humidity - observation.humidity);

  // Wind speed error
  const windError = Math.abs(prediction.wind_speed - observation.wind_speed);

  // Calculate overall score (0-100, higher is better)
  // - Temperature: max 40 points (0°C error = 40, 10°C error = 0)
  // - Condition: 30 points if match, 0 if not
  // - Humidity: max 15 points (0% error = 15, 50% error = 0)
  // - Wind: max 15 points (0 m/s error = 15, 10 m/s error = 0)

  const tempScore = Math.max(0, 40 - tempError * 4);
  const conditionScore = conditionMatch ? 30 : 0;
  const humidityScore = Math.max(0, 15 - humidityError * 0.3);
  const windScore = Math.max(0, 15 - windError * 1.5);

  const overallScore = tempScore + conditionScore + humidityScore + windScore;

  return {
    temp_error: tempError,
    humidity_error: humidityError,
    wind_error: windError,
    condition_match: conditionMatch,
    temp_score: Math.round(tempScore * 10) / 10,
    condition_score: conditionScore,
    humidity_score: Math.round(humidityScore * 10) / 10,
    wind_score: Math.round(windScore * 10) / 10,
    overall_score: Math.round(overallScore * 10) / 10,
  };
}

/**
 * Match predictions with observations and calculate consistency
 */
function calculateAccuracy(predictions, observations) {
  const accuracy = {
    openweather: [],
    weatherapi: [],
    openmeteo: [],
  };

  // Match predictions with observations
  for (const prediction of predictions) {
    const targetDate = prediction.target_date;

    // Find corresponding observation
    const observation = observations.find((obs) => obs.date === targetDate);

    if (!observation) {
      console.warn(`  ⚠️  No observation found for prediction: ${targetDate}`);
      continue;
    }

    // Calculate consistency for each provider
    const providers = ["openweather", "weatherapi", "openmeteo"];

    for (const provider of providers) {
      const pred = prediction.predictions[provider];
      const obs = observation.observations[provider];

      const consistency = calculateConsistency(pred, obs);

      if (consistency) {
        accuracy[provider].push({
          date: targetDate,
          prediction: pred,
          observation: obs,
          consistency: consistency,
        });
      }
    }
  }

  return accuracy;
}

/**
 * Calculate aggregate statistics for each provider
 */
function calculateStatistics(accuracy) {
  const stats = {};

  for (const provider of ["openweather", "weatherapi", "openmeteo"]) {
    const data = accuracy[provider];

    if (data.length === 0) {
      stats[provider] = {
        sample_size: 0,
        avg_overall_score: 0,
        avg_temp_error: 0,
        condition_match_rate: 0,
      };
      continue;
    }

    const avgOverallScore =
      data.reduce((sum, d) => sum + d.consistency.overall_score, 0) /
      data.length;
    const avgTempError =
      data.reduce((sum, d) => sum + d.consistency.temp_error, 0) / data.length;
    const conditionMatches = data.filter(
      (d) => d.consistency.condition_match,
    ).length;
    const conditionMatchRate = (conditionMatches / data.length) * 100;

    stats[provider] = {
      sample_size: data.length,
      avg_overall_score: Math.round(avgOverallScore * 10) / 10,
      avg_temp_error: Math.round(avgTempError * 10) / 10,
      avg_humidity_error:
        Math.round(
          (data.reduce((sum, d) => sum + d.consistency.humidity_error, 0) /
            data.length) *
            10,
        ) / 10,
      avg_wind_error:
        Math.round(
          (data.reduce((sum, d) => sum + d.consistency.wind_error, 0) /
            data.length) *
            10,
        ) / 10,
      condition_match_rate: Math.round(conditionMatchRate * 10) / 10,
    };
  }

  return stats;
}

/**
 * Perform weekly analysis
 */
async function performWeeklyAnalysis() {
  const today = new Date();

  // Calculate last 7 days
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() - 1); // Yesterday

  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 6); // 7 days total

  console.log(`\n=== Weekly Accuracy Analysis ===`);
  console.log(`Analysis Time: ${today.toISOString()}`);
  console.log(`Period: ${formatDate(startDate)} to ${formatDate(endDate)}`);
  console.log(`Days: 7\n`);

  // Load data
  console.log("Loading predictions...");
  const predictions = await loadPredictions(startDate, endDate);
  console.log(`  ✅ Loaded ${predictions.length} prediction files`);

  console.log("Loading observations...");
  const observations = await loadObservations(startDate, endDate);
  console.log(`  ✅ Loaded ${observations.length} observation files`);

  // Calculate accuracy
  console.log("\nCalculating accuracy...");
  const accuracy = calculateAccuracy(predictions, observations);

  // Calculate statistics
  const stats = calculateStatistics(accuracy);

  console.log("\n📊 Statistics:");
  for (const [provider, stat] of Object.entries(stats)) {
    console.log(`\n${provider}:`);
    console.log(`  Sample Size: ${stat.sample_size}`);
    console.log(`  Avg Score: ${stat.avg_overall_score}/100`);
    console.log(`  Avg Temp Error: ${stat.avg_temp_error}°C`);
    console.log(`  Condition Match: ${stat.condition_match_rate}%`);
  }

  // Create rankings
  const rankings = Object.entries(stats)
    .map(([provider, stat]) => ({ provider, ...stat }))
    .sort((a, b) => b.avg_overall_score - a.avg_overall_score)
    .map((item, index) => ({ rank: index + 1, ...item }));

  console.log("\n🏆 Rankings:");
  rankings.forEach((r) => {
    console.log(`  ${r.rank}. ${r.provider} (${r.avg_overall_score}/100)`);
  });

  // TODO: AI analysis with GPT-4o (Week 2)
  // For now, save basic statistics

  // Determine week number
  const analysisFiles = await fs
    .readdir(path.join(__dirname, "../data/analysis"))
    .catch(() => []);
  const weekNumber =
    analysisFiles.filter((f) => f.startsWith("week-")).length + 1;

  // Create output
  const output = {
    week: weekNumber,
    analysis_time: today.toISOString(),
    period: {
      start: formatDate(startDate),
      end: formatDate(endDate),
      days: 7,
    },
    data_quality: {
      predictions_found: predictions.length,
      observations_found: observations.length,
      complete_days: Math.min(predictions.length, observations.length),
    },
    rankings: rankings,
    detailed_stats: stats,
    // AI insights will be added in Week 2
    ai_insights: null,
  };

  // Save to file
  const outputDir = path.join(__dirname, "../data/analysis");
  await fs.mkdir(outputDir, { recursive: true });

  const outputPath = path.join(outputDir, `week-${weekNumber}.json`);
  await fs.writeFile(outputPath, JSON.stringify(output, null, 2), "utf8");

  console.log(`\n✅ Analysis saved: ${outputPath}\n`);

  return output;
}

// Run script
performWeeklyAnalysis()
  .then(() => {
    console.log("✅ Analysis completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Analysis failed:", error);
    console.error(error.stack);
    process.exit(1);
  });
