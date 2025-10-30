/**
 * Composable for loading and managing accuracy tracking data
 *
 * Loads prediction and observation data from data/ directory
 */

import { ref, computed } from "vue";
import {
  generateDemoPredictions,
  generateDemoObservations,
} from "@/data/demoAccuracyData";

/**
 * Prediction data structure
 */
export interface PredictionData {
  date: string;
  collected_at: string;
  target_date: string;
  city: string;
  predictions: {
    [provider: string]: {
      temp_max: number;
      temp_min: number;
      temp_day: number;
      temp_night: number;
      condition_main: string;
      condition_description: string;
      condition_description_ko: string;
      condition_icon: string;
      humidity: number;
      wind_speed: number;
      precipitation_probability: number;
      predicted_at: string;
    } | null;
  };
}

/**
 * Observation data structure
 */
export interface ObservationData {
  date: string;
  collected_at: string;
  city: string;
  observations: {
    [provider: string]: {
      temp: number;
      feels_like: number;
      temp_min: number;
      temp_max: number;
      condition_main: string;
      condition_description: string;
      condition_description_ko: string;
      condition_icon: string;
      humidity: number;
      wind_speed: number;
      observed_at: string;
    } | null;
  };
}

/**
 * Accuracy comparison result
 */
export interface AccuracyComparison {
  date: string;
  provider: string;
  prediction: PredictionData["predictions"][string];
  observation: ObservationData["observations"][string];
  tempError: number;
  conditionMatch: boolean;
  humidityError: number;
  windSpeedError: number;
}

/**
 * Provider accuracy statistics
 */
export interface ProviderStats {
  provider: string;
  totalDays: number;
  avgTempError: number;
  conditionMatchRate: number;
  avgHumidityError: number;
  avgWindSpeedError: number;
  overallScore: number;
}

export function useAccuracyData() {
  const predictions = ref<PredictionData[]>([]);
  const observations = ref<ObservationData[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  /**
   * Load predictions from data/predictions/
   */
  async function loadPredictions() {
    try {
      loading.value = true;
      error.value = null;

      // For now, return empty array
      // In production, this would fetch from API or load from files
      predictions.value = [];

      console.log(
        "[useAccuracyData] Predictions loaded:",
        predictions.value.length,
      );
    } catch (e) {
      error.value =
        e instanceof Error ? e.message : "Failed to load predictions";
      console.error("[useAccuracyData] Error loading predictions:", e);
    } finally {
      loading.value = false;
    }
  }

  /**
   * Load observations from data/observations/
   */
  async function loadObservations() {
    try {
      loading.value = true;
      error.value = null;

      // For now, return empty array
      // In production, this would fetch from API or load from files
      observations.value = [];

      console.log(
        "[useAccuracyData] Observations loaded:",
        observations.value.length,
      );
    } catch (e) {
      error.value =
        e instanceof Error ? e.message : "Failed to load observations";
      console.error("[useAccuracyData] Error loading observations:", e);
    } finally {
      loading.value = false;
    }
  }

  /**
   * Compare predictions with observations
   */
  const comparisons = computed<AccuracyComparison[]>(() => {
    const result: AccuracyComparison[] = [];

    for (const prediction of predictions.value) {
      // Find matching observation (target_date matches observation date)
      const observation = observations.value.find(
        (obs) => obs.date === prediction.target_date,
      );

      if (!observation) continue;

      // Compare each provider
      const providers = Object.keys(prediction.predictions);
      for (const provider of providers) {
        const pred = prediction.predictions[provider];
        const obs = observation.observations[provider];

        if (!pred || !obs) continue;

        result.push({
          date: prediction.target_date,
          provider,
          prediction: pred,
          observation: obs,
          tempError: Math.abs(pred.temp_max - obs.temp_max),
          conditionMatch: pred.condition_main === obs.condition_main,
          humidityError: Math.abs(pred.humidity - obs.humidity),
          windSpeedError: Math.abs(pred.wind_speed - obs.wind_speed),
        });
      }
    }

    return result;
  });

  /**
   * Calculate provider statistics
   */
  const providerStats = computed<ProviderStats[]>(() => {
    const providers = ["openweather", "weatherapi", "openmeteo"];

    return providers.map((provider) => {
      const providerComparisons = comparisons.value.filter(
        (c) => c.provider === provider,
      );

      if (providerComparisons.length === 0) {
        return {
          provider,
          totalDays: 0,
          avgTempError: 0,
          conditionMatchRate: 0,
          avgHumidityError: 0,
          avgWindSpeedError: 0,
          overallScore: 0,
        };
      }

      const totalDays = providerComparisons.length;
      const avgTempError =
        providerComparisons.reduce((sum, c) => sum + c.tempError, 0) /
        totalDays;
      const conditionMatches = providerComparisons.filter(
        (c) => c.conditionMatch,
      ).length;
      const conditionMatchRate = (conditionMatches / totalDays) * 100;
      const avgHumidityError =
        providerComparisons.reduce((sum, c) => sum + c.humidityError, 0) /
        totalDays;
      const avgWindSpeedError =
        providerComparisons.reduce((sum, c) => sum + c.windSpeedError, 0) /
        totalDays;

      // Overall score calculation (same as weekly-analysis.ts)
      const tempScore = Math.max(0, 40 - avgTempError * 4);
      const conditionScore = conditionMatchRate * 0.3;
      const humidityScore = Math.max(0, 15 - avgHumidityError * 0.15);
      const windScore = Math.max(0, 15 - avgWindSpeedError * 1.5);
      const overallScore =
        tempScore + conditionScore + humidityScore + windScore;

      return {
        provider,
        totalDays,
        avgTempError,
        conditionMatchRate,
        avgHumidityError,
        avgWindSpeedError,
        overallScore,
      };
    });
  });

  /**
   * Get best provider by overall score
   */
  const bestProvider = computed<ProviderStats | null>(() => {
    if (providerStats.value.length === 0) return null;

    let best = providerStats.value[0];
    if (!best) return null;

    for (const current of providerStats.value) {
      if (current.overallScore > best.overallScore) {
        best = current;
      }
    }
    return best;
  });

  /**
   * Load demo data for UI preview
   */
  function loadDemoData() {
    predictions.value = generateDemoPredictions();
    observations.value = generateDemoObservations();
    console.log(
      "[useAccuracyData] Demo data loaded:",
      predictions.value.length,
      "predictions",
    );
  }

  /**
   * Clear all data
   */
  function clearData() {
    predictions.value = [];
    observations.value = [];
    console.log("[useAccuracyData] Data cleared");
  }

  return {
    predictions,
    observations,
    loading,
    error,
    loadPredictions,
    loadObservations,
    loadDemoData,
    clearData,
    comparisons,
    providerStats,
    bestProvider,
  };
}
