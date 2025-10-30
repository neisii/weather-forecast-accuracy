<script setup lang="ts">
import type { ProviderType } from '@/services/weather/WeatherService';

interface Props {
  currentProvider: ProviderType;
  availableProviders: ProviderType[];
}

defineProps<Props>();

const emit = defineEmits<{
  (e: 'change', provider: ProviderType): void;
}>();

function handleChange(event: Event) {
  const target = event.target as HTMLSelectElement;
  emit('change', target.value as ProviderType);
}

function getProviderDisplayName(provider: ProviderType): string {
  const names: Record<ProviderType, string> = {
    mock: 'Mock (로컬 데이터)',
    openweather: 'OpenWeatherMap',
    weatherapi: 'WeatherAPI.com',
    openmeteo: 'Open-Meteo'
  };
  return names[provider] || provider;
}
</script>

<template>
  <div class="provider-selector">
    <label for="provider-select" class="label">날씨 제공자</label>
    <select
      id="provider-select"
      name="provider"
      :value="currentProvider"
      @change="handleChange"
      class="select"
    >
      <option
        v-for="provider in availableProviders"
        :key="provider"
        :value="provider"
      >
        {{ getProviderDisplayName(provider) }}
      </option>
    </select>
  </div>
</template>

<style scoped>
.provider-selector {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.label {
  font-size: 0.875rem;
  font-weight: 600;
  color: white;
}

.select {
  padding: 0.75rem 1rem;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.9);
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
}

.select:hover {
  border-color: rgba(255, 255, 255, 0.6);
  background: white;
}

.select:focus {
  outline: none;
  border-color: white;
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.2);
}
</style>
