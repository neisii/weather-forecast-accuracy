<script setup lang="ts">
import type { CustomPrediction } from '@/types/domain/customPrediction';

defineProps<{
  prediction: CustomPrediction;
}>();
</script>

<template>
  <div class="custom-weather">
    <div class="location">
      <h2>{{ prediction.location.name }}</h2>
      <p>{{ prediction.location.country }}</p>
    </div>

    <div class="main-info">
      <div class="temperature">
        <span class="temp-value">{{ Math.round(prediction.current.temperature) }}°C</span>
        <span class="feels-like">체감 {{ Math.round(prediction.current.feelsLike) }}°C</span>
      </div>

      <div class="condition">
        <span class="condition-icon">{{ prediction.weather.icon }}</span>
        <span class="condition-text">{{ prediction.weather.descriptionKo }}</span>
      </div>
    </div>

    <div class="details">
      <div class="detail-item">
        <span class="label">습도</span>
        <span class="value">{{ prediction.current.humidity }}%</span>
      </div>
      <div class="detail-item">
        <span class="label">풍속</span>
        <span class="value">{{ prediction.current.windSpeed.toFixed(1) }} m/s</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.custom-weather {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 30px;
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
}

.location h2 {
  font-size: 1.8rem;
  margin-bottom: 5px;
}

.location p {
  opacity: 0.9;
  font-size: 0.95rem;
}

.main-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 20px 0;
}

.temperature {
  display: flex;
  flex-direction: column;
}

.temp-value {
  font-size: 3.5rem;
  font-weight: bold;
}

.feels-like {
  font-size: 0.9rem;
  opacity: 0.9;
}

.condition {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.condition-icon {
  font-size: 3rem;
}

.condition-text {
  font-size: 1.1rem;
}

.details {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 15px;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.3);
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.label {
  font-size: 0.85rem;
  opacity: 0.9;
}

.value {
  font-size: 1.3rem;
  font-weight: 600;
}
</style>
