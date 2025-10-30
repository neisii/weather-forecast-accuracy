<script setup lang="ts">
import { computed } from 'vue';
import type { CustomPrediction } from '@/types/domain/customPrediction';
import type { CyclingScore } from '@/types/cycling';
import { calculateCyclingScoreFromCustomPrediction } from '@/utils/cyclingRecommender';
import { RECOMMENDATION_DISPLAY } from '@/types/cycling';

const props = defineProps<{
  prediction: CustomPrediction;
}>();

const cyclingScore = computed<CyclingScore>(() => {
  return calculateCyclingScoreFromCustomPrediction(props.prediction);
});

const display = computed(() => {
  return RECOMMENDATION_DISPLAY[cyclingScore.value.recommendation];
});

const confidenceNote = computed(() => {
  const confidence = props.prediction.confidence.overall;
  if (confidence >= 70) {
    return '신뢰도 높은 예측으로 자전거 추천 점수를 계산했습니다';
  } else if (confidence >= 40) {
    return '보통 수준의 신뢰도로 자전거 추천 점수를 계산했습니다';
  } else {
    return '예측 신뢰도가 낮아 자전거 추천 점수가 부정확할 수 있습니다';
  }
});
</script>

<template>
  <div class="cycling-recommendation-ai">
    <div class="header">
      <h2 class="cycling-title">🚴‍♂️ AI 기반 자전거 라이딩 추천</h2>
      <p class="confidence-note">{{ confidenceNote }}</p>
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

    <div class="ai-advantage">
      <h3 class="section-title">AI 예측의 장점</h3>
      <ul class="advantage-list">
        <li>
          <strong>온도:</strong> 3개 Provider 가중 평균으로
          {{ prediction.confidence.uncertainty.temperature.toFixed(1) }}°C 오차 범위
        </li>
        <li>
          <strong>풍속:</strong> OpenMeteo 중심으로
          {{ prediction.confidence.uncertainty.windSpeed.toFixed(2) }} m/s 오차 범위
        </li>
        <li>
          <strong>습도:</strong> WeatherAPI 중심으로
          {{ prediction.confidence.uncertainty.humidity }}% 오차 범위
        </li>
        <li>
          <strong>날씨 상태:</strong> OpenWeather 66.7% 정확도 (단일 Provider 대비 최고)
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.cycling-recommendation-ai {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  border: 2px solid #6366f1;
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

.confidence-note {
  font-size: 14px;
  color: #6366f1;
  margin: 0;
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
.clothing-section,
.ai-advantage {
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
  color: #6366f1;
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
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
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

.advantage-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.advantage-list li {
  padding: 10px 12px;
  background: linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%);
  border-radius: 8px;
  margin-bottom: 8px;
  color: #333;
  font-size: 14px;
}

.advantage-list li strong {
  color: #6366f1;
}

/* Responsive design */
@media (max-width: 768px) {
  .cycling-recommendation-ai {
    padding: 16px;
  }

  .cycling-title {
    font-size: 20px;
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
  .clothing-item,
  .advantage-list li {
    font-size: 13px;
  }
}
</style>
