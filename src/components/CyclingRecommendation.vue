<script setup lang="ts">
import { computed } from 'vue';
import { useWeatherStore } from '../stores/weather';
import { calculateCyclingScore } from '../utils/cyclingRecommender';
import { RECOMMENDATION_DISPLAY } from '../types/cycling';
import type { CyclingScore } from '../types/cycling';

const weatherStore = useWeatherStore();

const cyclingScore = computed<CyclingScore | null>(() => {
  if (!weatherStore.currentWeather) return null;
  return calculateCyclingScore(weatherStore.currentWeather);
});

const display = computed(() => {
  if (!cyclingScore.value) return null;
  return RECOMMENDATION_DISPLAY[cyclingScore.value.recommendation];
});
</script>

<template>
  <div v-if="cyclingScore && display" class="cycling-recommendation">
    <div class="header">
      <h2 class="cycling-title">🚴‍♂️ 자전거 라이딩 추천</h2>
      <p class="provider-note">
        현재 Provider: {{ weatherStore.currentProvider }}
        <router-link to="/ai-prediction" class="ai-link">
          🤖 AI 통합 예측으로 더 정확한 추천 받기
        </router-link>
      </p>
    </div>

    <div class="score-container">
      <div
        class="score-circle"
        :class="display.className"
        :style="{
          background: `linear-gradient(135deg, ${display.color.from} 0%, ${display.color.to} 100%)`
        }"
      >
        <div class="score-value">{{ cyclingScore.score }}</div>
        <div class="score-emoji">{{ display.emoji }}</div>
        <div class="score-text">{{ display.text }}</div>
      </div>
    </div>

    <div v-if="cyclingScore.reasons.length > 0" class="reasons-section">
      <h3 class="section-title">평가 이유</h3>
      <ul class="reasons-list">
        <li v-for="(reason, index) in cyclingScore.reasons" :key="index" class="reason-item">
          {{ reason }}
        </li>
      </ul>
    </div>

    <div v-if="cyclingScore.clothing.length > 0" class="clothing-section">
      <h3 class="section-title">권장 복장</h3>
      <div class="clothing-list">
        <span
          v-for="(item, index) in cyclingScore.clothing"
          :key="index"
          class="clothing-item"
          :class="{ essential: item.essential }"
        >
          {{ item.name }}
          <span v-if="item.essential" class="badge">필수</span>
        </span>
      </div>
    </div>
  </div>

  <div v-else class="cycling-recommendation loading">
    <p>날씨 정보를 불러오는 중...</p>
  </div>
</template>

<style scoped>
.cycling-recommendation {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  margin: 20px 0;
}

.cycling-recommendation.loading {
  text-align: center;
  color: #666;
}

.header {
  text-align: center;
  margin-bottom: 24px;
}

.cycling-title {
  font-size: 24px;
  font-weight: bold;
  margin: 0 0 8px 0;
  color: #333;
}

.provider-note {
  font-size: 13px;
  color: #666;
  margin: 0;
}

.ai-link {
  display: block;
  margin-top: 4px;
  color: #6366f1;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s;
}

.ai-link:hover {
  color: #4f46e5;
  text-decoration: underline;
}

.score-container {
  display: flex;
  justify-content: center;
  margin-bottom: 32px;
}

.score-circle {
  width: 200px;
  height: 200px;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
  transition: transform 0.3s ease;
}

.score-circle:hover {
  transform: scale(1.05);
}

.score-value {
  font-size: 48px;
  font-weight: bold;
  line-height: 1;
}

.score-emoji {
  font-size: 40px;
  margin: 8px 0;
}

.score-text {
  font-size: 20px;
  font-weight: 600;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.reasons-section,
.clothing-section {
  margin-top: 24px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin: 0 0 12px 0;
}

.reasons-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.reason-item {
  padding: 8px 12px;
  background: #f5f5f5;
  border-radius: 8px;
  margin-bottom: 8px;
  color: #555;
  font-size: 14px;
}

.reason-item:before {
  content: "•";
  color: #667eea;
  font-weight: bold;
  margin-right: 8px;
}

.clothing-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.clothing-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #f0f0f0;
  border-radius: 20px;
  font-size: 14px;
  color: #555;
  transition: all 0.2s ease;
}

.clothing-item.essential {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-weight: 500;
}

.clothing-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.badge {
  background: rgba(255, 255, 255, 0.3);
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
}

/* Responsive design */
@media (max-width: 768px) {
  .cycling-recommendation {
    padding: 16px;
    margin: 16px 0;
  }

  .cycling-title {
    font-size: 20px;
    margin-bottom: 20px;
  }

  .score-circle {
    width: 160px;
    height: 160px;
  }

  .score-value {
    font-size: 40px;
  }

  .score-emoji {
    font-size: 32px;
  }

  .score-text {
    font-size: 16px;
  }

  .section-title {
    font-size: 16px;
  }

  .reason-item,
  .clothing-item {
    font-size: 13px;
  }
}
</style>
