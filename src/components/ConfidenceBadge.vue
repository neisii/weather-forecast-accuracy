<script setup lang="ts">
import { computed } from 'vue';
import type { ConfidenceMetrics } from '@/types/domain/customPrediction';
import { getConfidenceLevel, CONFIDENCE_MESSAGES, CONFIDENCE_COLORS } from '@/types/domain/customPrediction';

const props = defineProps<{
  confidence: ConfidenceMetrics;
}>();

const level = computed(() => getConfidenceLevel(props.confidence.overall));
const message = computed(() => CONFIDENCE_MESSAGES[level.value]);
const color = computed(() => CONFIDENCE_COLORS[level.value]);
const borderColor = computed(() => color.value.from);
const scoreColor = computed(() => color.value.from);
</script>

<template>
  <div class="confidence-badge" :style="{ borderColor: borderColor }">
    <div class="badge-header">
      <span class="badge-icon">✓</span>
      <span class="badge-title">예측 신뢰도</span>
    </div>

    <div class="confidence-score" :style="{ color: scoreColor }">
      {{ confidence.overall }}%
    </div>

    <p class="confidence-message">{{ message }}</p>

    <div class="metrics">
      <div class="metric">
        <span>온도</span>
        <span>{{ confidence.temperature }}%</span>
      </div>
      <div class="metric">
        <span>습도</span>
        <span>{{ confidence.humidity }}%</span>
      </div>
      <div class="metric">
        <span>풍속</span>
        <span>{{ confidence.windSpeed }}%</span>
      </div>
      <div class="metric">
        <span>날씨</span>
        <span>{{ confidence.condition }}%</span>
      </div>
    </div>

    <div class="uncertainty">
      <p class="uncertainty-title">불확실성</p>
      <div class="uncertainty-values">
        <span>온도: ±{{ confidence.uncertainty.temperature }}°C</span>
        <span>습도: ±{{ confidence.uncertainty.humidity }}%</span>
        <span>풍속: ±{{ confidence.uncertainty.windSpeed }} m/s</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.confidence-badge {
  background: white;
  padding: 20px;
  border-radius: 12px;
  border: 3px solid;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.badge-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 15px;
}

.badge-icon {
  font-size: 1.5rem;
}

.badge-title {
  font-weight: 600;
  font-size: 1.1rem;
  color: #374151;
}

.confidence-score {
  font-size: 3rem;
  font-weight: bold;
  text-align: center;
  margin: 10px 0;
}

.confidence-message {
  text-align: center;
  color: #6b7280;
  font-size: 0.95rem;
  margin-bottom: 20px;
}

.metrics {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-bottom: 20px;
  padding: 15px;
  background: #f9fafb;
  border-radius: 8px;
}

.metric {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}

.metric span:first-child {
  font-size: 0.8rem;
  color: #6b7280;
}

.metric span:last-child {
  font-weight: 600;
  color: #374151;
}

.uncertainty {
  padding-top: 15px;
  border-top: 1px solid #e5e7eb;
}

.uncertainty-title {
  font-size: 0.85rem;
  font-weight: 600;
  color: #6b7280;
  margin-bottom: 10px;
}

.uncertainty-values {
  display: flex;
  gap: 15px;
  font-size: 0.85rem;
  color: #9ca3af;
}
</style>
