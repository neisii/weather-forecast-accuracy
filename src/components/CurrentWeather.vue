<script setup lang="ts">
import { computed } from 'vue';
import type { CurrentWeather } from '@/types/domain/weather';

const props = defineProps<{
  weather: CurrentWeather;
}>();

function getIconUrl(icon: string) {
  return `https://openweathermap.org/img/wn/${icon}@2x.png`;
}

const cityName = computed(() => {
  return props.weather.location.nameKo || props.weather.location.name;
});

const temperature = computed(() => {
  return Math.round(props.weather.current.temperature);
});

const feelsLike = computed(() => {
  return Math.round(props.weather.current.feelsLike);
});

const description = computed(() => {
  return props.weather.weather.descriptionKo || props.weather.weather.description;
});

const formattedTime = computed(() => {
  return props.weather.timestamp.toLocaleString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
});

const windSpeed = computed(() => {
  return props.weather.current.windSpeed.toFixed(2);
});
</script>

<template>
  <div class="weather-card">
    <div class="header">
      <h2 class="city-name">{{ cityName }}</h2>
      <span class="timestamp">{{ formattedTime }}</span>
    </div>

    <div class="weather-main">
      <img
        :src="getIconUrl(weather.weather.icon)"
        :alt="description"
        class="weather-icon"
      />
      <div class="temperature">{{ temperature }}°C</div>
    </div>

    <p class="description">{{ description }}</p>

    <div class="weather-details">
      <div class="detail-item">
        <span class="detail-label">체감온도</span>
        <span class="detail-value">{{ feelsLike }}°C</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">습도</span>
        <span class="detail-value">{{ weather.current.humidity }}%</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">풍속</span>
        <span class="detail-value">{{ windSpeed }} m/s</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">기압</span>
        <span class="detail-value">{{ weather.current.pressure }} hPa</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">구름</span>
        <span class="detail-value">{{ weather.current.cloudiness }}%</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">가시거리</span>
        <span class="detail-value">{{ (weather.current.visibility / 1000).toFixed(1) }} km</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.weather-card {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.city-name {
  font-size: 2rem;
  font-weight: 700;
  margin: 0;
}

.timestamp {
  font-size: 0.875rem;
  color: #999;
}

.weather-main {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.weather-icon {
  width: 100px;
  height: 100px;
}

.temperature {
  font-size: 3.5rem;
  font-weight: 700;
}

.description {
  text-align: center;
  font-size: 1.25rem;
  color: #666;
  margin: 0 0 2rem 0;
  text-transform: capitalize;
}

.weather-details {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  padding-top: 1.5rem;
  border-top: 1px solid #eee;
}

.detail-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.detail-label {
  font-size: 0.875rem;
  color: #999;
}

.detail-value {
  font-size: 1.125rem;
  font-weight: 600;
}
</style>
