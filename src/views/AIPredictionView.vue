<script setup lang="ts">
import { ref } from 'vue';
import { useWeatherStore } from '@/stores/weather';
import { customWeatherPredictor } from '@/services/weather/CustomWeatherPredictor';
import CustomWeatherDisplay from '@/components/CustomWeatherDisplay.vue';
import ProviderComparison from '@/components/ProviderComparison.vue';
import ConfidenceBadge from '@/components/ConfidenceBadge.vue';
import CyclingRecommendationFromAI from '@/components/CyclingRecommendationFromAI.vue';
import SearchBar from '@/components/SearchBar.vue';
import LoadingSpinner from '@/components/LoadingSpinner.vue';
import ErrorMessage from '@/components/ErrorMessage.vue';

const weatherStore = useWeatherStore();

const cityName = ref('');
const isLoading = ref(false);
const errorMessage = ref('');
const customPrediction = ref<any>(null);

const handleSearch = async (city: string) => {
  cityName.value = city;
  errorMessage.value = '';
  isLoading.value = true;
  customPrediction.value = null;

  try {
    // Get weather from all 3 providers
    const allProvidersData = await weatherStore.weatherService.getAllProvidersWeather(city);

    // Generate custom prediction
    const prediction = customWeatherPredictor.predict(allProvidersData);
    customPrediction.value = prediction;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Unknown error';
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <div class="ai-prediction-view">
    <header class="header">
      <h1>🤖 AI 통합 예측</h1>
      <p class="subtitle">3개 Provider의 강점을 결합한 가중 평균 예측</p>
    </header>

    <SearchBar @search="handleSearch" />

    <LoadingSpinner v-if="isLoading" />
    <ErrorMessage v-else-if="errorMessage" :message="errorMessage" />

    <div v-else-if="customPrediction" class="prediction-container">
      <!-- 신뢰도 배지 -->
      <ConfidenceBadge :confidence="customPrediction.confidence" />

      <!-- 커스텀 예측 날씨 정보 -->
      <CustomWeatherDisplay :prediction="customPrediction" />

      <!-- AI 기반 자전거 추천 -->
      <CyclingRecommendationFromAI :prediction="customPrediction" />

      <!-- Provider 비교 -->
      <ProviderComparison :prediction="customPrediction" />
    </div>

    <div v-else class="empty-state">
      <p>도시를 검색하여 AI 통합 예측을 확인하세요</p>
      <p class="info">
        <strong>백테스팅 결과:</strong><br>
        온도 7.9% 개선 | 풍속 26.4% 개선 | 종합 17.1% 향상
      </p>
    </div>
  </div>
</template>

<style scoped>
.ai-prediction-view {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.header {
  text-align: center;
  margin-bottom: 30px;
}

.header h1 {
  font-size: 2rem;
  margin-bottom: 10px;
  color: #6366f1;
}

.subtitle {
  color: #6b7280;
  font-size: 0.95rem;
}

.prediction-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-top: 30px;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #6b7280;
}

.empty-state .info {
  margin-top: 20px;
  padding: 15px;
  background: #f3f4f6;
  border-radius: 8px;
  font-size: 0.9rem;
}

.empty-state .info strong {
  color: #6366f1;
}
</style>
