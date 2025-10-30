<script setup lang="ts">
import { onMounted } from 'vue';
import { useWeatherStore } from '@/stores/weather';
import type { ProviderType } from '@/services/weather/WeatherService';
import SearchBar from '@/components/SearchBar.vue';
import CurrentWeather from '@/components/CurrentWeather.vue';
import LoadingSpinner from '@/components/LoadingSpinner.vue';
import ErrorMessage from '@/components/ErrorMessage.vue';
import ProviderSelector from '@/components/ProviderSelector.vue';
import QuotaStatus from '@/components/QuotaStatus.vue';
import CyclingRecommendation from '@/components/CyclingRecommendation.vue';

const weatherStore = useWeatherStore();

onMounted(async () => {
  // Update provider status on mount
  await weatherStore.updateProviderStatus();
});

function handleSearch(city: string) {
  weatherStore.fetchWeather(city);
}

async function handleProviderChange(provider: ProviderType) {
  await weatherStore.switchProvider(provider);
}
</script>

<template>
  <div class="home-view">
    <div class="container">
      <h1 class="title">날씨 검색 앱</h1>

      <ProviderSelector
        :current-provider="weatherStore.currentProvider"
        :available-providers="weatherStore.getAvailableProviders()"
        @change="handleProviderChange"
      />

      <QuotaStatus :status="weatherStore.providerStatus" />

      <SearchBar @search="handleSearch" />

      <LoadingSpinner v-if="weatherStore.loading" />

      <ErrorMessage
        v-else-if="weatherStore.error"
        :message="weatherStore.error"
      />

      <CurrentWeather
        v-else-if="weatherStore.currentWeather"
        :weather="weatherStore.currentWeather"
      />

      <CyclingRecommendation v-if="weatherStore.currentWeather" />
    </div>
  </div>
</template>

<style scoped>
.home-view {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 2rem;
}

.container {
  max-width: 600px;
  margin: 0 auto;
}

.title {
  color: white;
  font-size: 2.5rem;
  font-weight: 700;
  text-align: center;
  margin: 0 0 2rem 0;
}
</style>
