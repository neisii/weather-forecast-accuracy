import { defineStore } from "pinia";
import { ref } from "vue";
import type { CurrentWeather } from "@/types/domain/weather";
import type { ProviderStatus } from "@/types/domain/weather";
import {
  WeatherService,
  createDefaultConfig,
  type ProviderType,
} from "@/services/weather/WeatherService";

export const useWeatherStore = defineStore("weather", () => {
  // Initialize weather service with default config
  const weatherService = new WeatherService(createDefaultConfig());

  // State
  const currentWeather = ref<CurrentWeather | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const currentProvider = ref<ProviderType>(
    weatherService.getCurrentProviderType(),
  );
  const providerStatus = ref<ProviderStatus | null>(null);

  /**
   * Fetch weather for a city using current provider
   */
  async function fetchWeather(cityName: string) {
    loading.value = true;
    error.value = null;

    try {
      const weather = await weatherService.getCurrentWeather(cityName);
      currentWeather.value = weather;

      // Update provider status after successful request
      await updateProviderStatus();
    } catch (err: any) {
      if (err.message?.includes("quota exceeded")) {
        error.value =
          "API 사용량이 초과되었습니다. 다른 제공자를 선택하거나 리셋 시간을 기다려주세요.";
      } else if (err.message?.includes("not found")) {
        error.value = "도시를 찾을 수 없습니다";
      } else if (err.message?.includes("API key")) {
        error.value = "API 키가 유효하지 않습니다";
      } else {
        error.value = err.message || "오류가 발생했습니다. 다시 시도해주세요";
      }
      currentWeather.value = null;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Switch to a different weather provider
   */
  async function switchProvider(providerType: ProviderType) {
    try {
      await weatherService.switchProvider(providerType);
      currentProvider.value = providerType;
      await updateProviderStatus();

      // Clear current weather and error when switching providers
      currentWeather.value = null;
      error.value = null;
    } catch (err: any) {
      error.value = err.message || "제공자 전환에 실패했습니다";
    }
  }

  /**
   * Update current provider status
   */
  async function updateProviderStatus() {
    try {
      providerStatus.value = await weatherService.getProviderStatus();
    } catch (err) {
      console.error("Failed to update provider status:", err);
    }
  }

  /**
   * Get all available providers with their status
   */
  async function getAllProviderStatuses(): Promise<ProviderStatus[]> {
    return await weatherService.getAllProviderStatuses();
  }

  /**
   * Get available provider types
   */
  function getAvailableProviders(): ProviderType[] {
    return weatherService.getAvailableProviders();
  }

  /**
   * Clear error message
   */
  function clearError() {
    error.value = null;
  }

  /**
   * Get current provider name
   */
  function getCurrentProviderName(): string {
    return weatherService.getCurrentProviderName();
  }

  return {
    // State
    currentWeather,
    loading,
    error,
    currentProvider,
    providerStatus,

    // Actions
    fetchWeather,
    switchProvider,
    updateProviderStatus,
    getAllProviderStatuses,
    getAvailableProviders,
    getCurrentProviderName,
    clearError,

    // Service (for advanced use cases like custom AI prediction)
    weatherService,
  };
});
