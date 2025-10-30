<script setup lang="ts">
import type { CustomPrediction } from '@/types/domain/customPrediction';

defineProps<{
  prediction: CustomPrediction;
}>();
</script>

<template>
  <div class="provider-comparison">
    <h3>📊 Provider 비교</h3>

    <table>
      <thead>
        <tr>
          <th>Provider</th>
          <th>온도</th>
          <th>습도</th>
          <th>풍속</th>
          <th>날씨</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="provider-name">OpenWeather</td>
          <td>{{ Math.round(prediction.providers.openweather.current.temperature) }}°C</td>
          <td>{{ prediction.providers.openweather.current.humidity }}%</td>
          <td>{{ prediction.providers.openweather.current.windSpeed.toFixed(1) }}</td>
          <td>{{ prediction.providers.openweather.weather.main }}</td>
        </tr>
        <tr>
          <td class="provider-name">WeatherAPI</td>
          <td>{{ Math.round(prediction.providers.weatherapi.current.temperature) }}°C</td>
          <td>{{ prediction.providers.weatherapi.current.humidity }}%</td>
          <td>{{ prediction.providers.weatherapi.current.windSpeed.toFixed(1) }}</td>
          <td>{{ prediction.providers.weatherapi.weather.main }}</td>
        </tr>
        <tr>
          <td class="provider-name">OpenMeteo</td>
          <td>{{ Math.round(prediction.providers.openmeteo.current.temperature) }}°C</td>
          <td>-</td>
          <td>{{ prediction.providers.openmeteo.current.windSpeed.toFixed(1) }}</td>
          <td>{{ prediction.providers.openmeteo.weather.main }}</td>
        </tr>
        <tr class="ai-row">
          <td class="provider-name">🤖 Custom AI</td>
          <td><strong>{{ Math.round(prediction.current.temperature) }}°C</strong></td>
          <td><strong>{{ prediction.current.humidity }}%</strong></td>
          <td><strong>{{ prediction.current.windSpeed.toFixed(1) }}</strong></td>
          <td><strong>{{ prediction.weather.main }}</strong></td>
        </tr>
      </tbody>
    </table>

    <div class="weights-info">
      <p class="info-title">가중치 설정:</p>
      <ul>
        <li>온도: OpenMeteo 45% + OpenWeather 40% + WeatherAPI 15%</li>
        <li>습도: WeatherAPI 70% + OpenWeather 30%</li>
        <li>풍속: OpenMeteo 60% + OpenWeather 25% + WeatherAPI 15%</li>
        <li>날씨: OpenWeather 100%</li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.provider-comparison {
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

h3 {
  margin-bottom: 15px;
  color: #374151;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th {
  background: #f3f4f6;
  padding: 12px;
  text-align: left;
  font-weight: 600;
  color: #374151;
  font-size: 0.9rem;
}

td {
  padding: 12px;
  border-bottom: 1px solid #e5e7eb;
  color: #6b7280;
}

.provider-name {
  font-weight: 600;
  color: #374151;
}

.ai-row {
  background: #f0fdf4;
}

.ai-row td {
  color: #059669;
}

.weights-info {
  margin-top: 20px;
  padding: 15px;
  background: #fef3c7;
  border-radius: 8px;
  border-left: 4px solid #f59e0b;
}

.info-title {
  font-weight: 600;
  color: #92400e;
  margin-bottom: 10px;
}

.weights-info ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.weights-info li {
  color: #78350f;
  font-size: 0.85rem;
  padding: 3px 0;
}
</style>
