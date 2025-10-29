/**
 * AI Weights Composable
 *
 * Phase 10: Adaptive Learning
 *
 * 기능:
 * - GitHub에서 최신 가중치 로드
 * - 로컬 캐싱 (1시간)
 * - Fallback to default weights
 */

import { ref, computed, onMounted } from "vue";
import type { AIWeightsSnapshot } from "@/types/domain/aiWeights";
import type { PredictionWeights } from "@/types/domain/customPrediction";

const WEIGHTS_URL =
  "https://raw.githubusercontent.com/neisii/toy-5/main/02-weather-app/data/ai-weights/latest.json";
const CACHE_KEY = "ai-weights-cache";
const CACHE_DURATION = 60 * 60 * 1000; // 1시간

/**
 * 기본 가중치 (9일 백테스팅 기반)
 */
const DEFAULT_WEIGHTS: PredictionWeights = {
  temperature: {
    openmeteo: 0.45,
    openweather: 0.4,
    weatherapi: 0.15,
  },
  humidity: {
    weatherapi: 0.7,
    openweather: 0.3,
  },
  windSpeed: {
    openmeteo: 0.6,
    openweather: 0.25,
    weatherapi: 0.15,
  },
  condition: {
    openweather: 1.0,
  },
};

/**
 * 캐시에서 로드
 */
function loadFromCache(): AIWeightsSnapshot | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const data = JSON.parse(cached);
    const age = Date.now() - new Date(data.cachedAt).getTime();

    if (age > CACHE_DURATION) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }

    return data.snapshot;
  } catch {
    return null;
  }
}

/**
 * 캐시에 저장
 */
function saveToCache(snapshot: AIWeightsSnapshot): void {
  try {
    const data = {
      snapshot,
      cachedAt: new Date().toISOString(),
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn("Failed to cache AI weights:", error);
  }
}

/**
 * GitHub에서 최신 가중치 fetch
 */
async function fetchLatestWeights(): Promise<AIWeightsSnapshot | null> {
  try {
    const response = await fetch(WEIGHTS_URL);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const snapshot: AIWeightsSnapshot = await response.json();

    // 검증
    if (!snapshot.weights || !snapshot.version) {
      throw new Error("Invalid weights format");
    }

    return snapshot;
  } catch (error) {
    console.warn("Failed to fetch AI weights from GitHub:", error);
    return null;
  }
}

/**
 * AI Weights Composable
 */
export function useAIWeights() {
  const weights = ref<PredictionWeights>(DEFAULT_WEIGHTS);
  const snapshot = ref<AIWeightsSnapshot | null>(null);
  const loading = ref(true);
  const error = ref<string | null>(null);
  const source = ref<"default" | "cache" | "remote">("default");

  /**
   * 가중치 로드
   */
  async function loadWeights(): Promise<void> {
    loading.value = true;
    error.value = null;

    // 1. 캐시 확인
    const cached = loadFromCache();
    if (cached) {
      weights.value = cached.weights;
      snapshot.value = cached;
      source.value = "cache";
      loading.value = false;
      console.log("✅ Loaded AI weights from cache:", cached.version);

      // 백그라운드에서 업데이트 확인
      fetchAndUpdate();
      return;
    }

    // 2. GitHub에서 fetch
    const remote = await fetchLatestWeights();
    if (remote) {
      weights.value = remote.weights;
      snapshot.value = remote;
      source.value = "remote";
      saveToCache(remote);
      console.log("✅ Loaded AI weights from GitHub:", remote.version);
    } else {
      // 3. Fallback to default
      weights.value = DEFAULT_WEIGHTS;
      snapshot.value = null;
      source.value = "default";
      error.value = "Using default weights (9-day backtesting)";
      console.warn("⚠️  Using default AI weights");
    }

    loading.value = false;
  }

  /**
   * 백그라운드 업데이트
   */
  async function fetchAndUpdate(): Promise<void> {
    const remote = await fetchLatestWeights();
    if (!remote) return;

    // 버전 비교
    if (snapshot.value && remote.version === snapshot.value.version) {
      return; // 동일 버전
    }

    // 업데이트
    weights.value = remote.weights;
    snapshot.value = remote;
    source.value = "remote";
    saveToCache(remote);

    console.log("🔄 AI weights updated in background:", remote.version);
  }

  /**
   * 수동 새로고침
   */
  async function refresh(): Promise<void> {
    localStorage.removeItem(CACHE_KEY);
    await loadWeights();
  }

  /**
   * 가중치 정보 표시용
   */
  const info = computed(() => {
    if (!snapshot.value) {
      return {
        version: "default",
        updatedAt: "N/A",
        dataRange: "Initial 9-day backtesting",
        performance: null,
      };
    }

    return {
      version: snapshot.value.version,
      updatedAt: new Date(snapshot.value.updatedAt).toLocaleDateString("ko-KR"),
      dataRange: `${snapshot.value.analysisPeriod.days}일 (${snapshot.value.analysisPeriod.from} ~ ${snapshot.value.analysisPeriod.to})`,
      performance: snapshot.value.performance,
    };
  });

  // Auto-load on mount
  onMounted(() => {
    loadWeights();
  });

  return {
    weights,
    snapshot,
    loading,
    error,
    source,
    info,
    refresh,
  };
}
