<template>
  <div class="accuracy-dashboard">
    <div class="dashboard-header">
      <h1>날씨 예보 정확도 추적</h1>
      <p class="subtitle">30일간의 예측 데이터를 실제 관측 데이터와 비교합니다</p>
      <button v-if="!demoMode && comparisons.length === 0" @click="enableDemoMode" class="demo-button">
        📊 데모 데이터로 미리보기
      </button>
      <button v-if="demoMode" @click="disableDemoMode" class="demo-button active">
        ✅ 데모 모드 (2주 샘플 데이터)
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>데이터를 불러오는 중...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-state">
      <p>⚠️ {{ error }}</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="comparisons.length === 0" class="empty-state">
      <div class="empty-icon">📊</div>
      <h2>아직 수집된 데이터가 없습니다</h2>
      <p>
        GitHub Actions 워크플로우가 매일 자동으로 날씨 예측과 관측 데이터를 수집합니다.
        <br />
        데이터 수집이 시작되면 여기에 정확도 분석 결과가 표시됩니다.
      </p>
      <div class="empty-info">
        <div class="info-item">
          <span class="icon">🔮</span>
          <span>예측 수집: 매일 00:00 UTC</span>
        </div>
        <div class="info-item">
          <span class="icon">🌡️</span>
          <span>관측 수집: 매일 00:30 UTC</span>
        </div>
        <div class="info-item">
          <span class="icon">📈</span>
          <span>분석 리포트: 매주 월요일</span>
        </div>
      </div>
    </div>

    <!-- Dashboard Content -->
    <div v-else class="dashboard-content">
      <!-- Overall Summary -->
      <section class="summary-section">
        <h2>전체 요약</h2>
        <div class="summary-cards">
          <div class="summary-card">
            <div class="card-icon">📅</div>
            <div class="card-content">
              <div class="card-label">분석 기간</div>
              <div class="card-value">{{ comparisons.length }}일</div>
            </div>
          </div>
          <div class="summary-card best-provider">
            <div class="card-icon">🏆</div>
            <div class="card-content">
              <div class="card-label">최고 정확도</div>
              <div class="card-value">{{ bestProvider?.provider || 'N/A' }}</div>
              <div class="card-detail">
                {{ bestProvider?.overallScore.toFixed(1) }}점
              </div>
            </div>
          </div>
          <div class="summary-card">
            <div class="card-icon">🎯</div>
            <div class="card-content">
              <div class="card-label">평균 온도 오차</div>
              <div class="card-value">
                {{ avgTempError.toFixed(1) }}°C
              </div>
            </div>
          </div>
          <div class="summary-card">
            <div class="card-icon">☁️</div>
            <div class="card-content">
              <div class="card-label">날씨 일치율</div>
              <div class="card-value">
                {{ avgConditionMatch.toFixed(0) }}%
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Provider Comparison -->
      <!-- Temporarily disabled - ProviderComparison repurposed for Custom AI prediction -->
      <!-- <section class="comparison-section">
        <h2>프로바이더 비교</h2>
        <ProviderComparison :provider-stats="providerStats" />
      </section> -->

      <!-- Accuracy Chart -->
      <section class="chart-section">
        <h2>정확도 추이</h2>
        <AccuracyChart :comparisons="comparisons" />
      </section>

      <!-- Daily Details -->
      <section class="details-section">
        <h2>일별 상세 데이터</h2>
        <DailyAccuracyTable :comparisons="comparisons" />
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useAccuracyData } from '@/composables/useAccuracyData';
// import ProviderComparison from './ProviderComparison.vue'; // Repurposed for Custom AI prediction
import AccuracyChart from './AccuracyChart.vue';
import DailyAccuracyTable from './DailyAccuracyTable.vue';

const demoMode = ref(false);

const {
  loading,
  error,
  comparisons,
  // providerStats, // Temporarily unused - ProviderComparison repurposed for Custom AI
  bestProvider,
  loadPredictions,
  loadObservations,
  loadDemoData,
  clearData,
} = useAccuracyData();

// Computed statistics
const avgTempError = computed(() => {
  if (comparisons.value.length === 0) return 0;
  const sum = comparisons.value.reduce((acc, c) => acc + c.tempError, 0);
  return sum / comparisons.value.length;
});

const avgConditionMatch = computed(() => {
  if (comparisons.value.length === 0) return 0;
  const matches = comparisons.value.filter(c => c.conditionMatch).length;
  return (matches / comparisons.value.length) * 100;
});

// Demo mode functions
function enableDemoMode() {
  demoMode.value = true;
  loadDemoData();
}

function disableDemoMode() {
  demoMode.value = false;
  clearData();
}

// Load data on mount
onMounted(async () => {
  await loadPredictions();
  await loadObservations();
});
</script>

<style scoped>
.accuracy-dashboard {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.dashboard-header {
  margin-bottom: 2rem;
  text-align: center;
}

.dashboard-header h1 {
  font-size: 2rem;
  font-weight: 700;
  color: #1a202c;
  margin-bottom: 0.5rem;
}

.subtitle {
  color: #718096;
  font-size: 1rem;
  margin-bottom: 1rem;
}

.demo-button {
  margin-top: 1rem;
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.demo-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.demo-button.active {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
}

/* Loading State */
.loading-state {
  text-align: center;
  padding: 4rem 2rem;
}

.spinner {
  width: 48px;
  height: 48px;
  margin: 0 auto 1rem;
  border: 4px solid #e2e8f0;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Error State */
.error-state {
  text-align: center;
  padding: 4rem 2rem;
  color: #e53e3e;
  font-size: 1.125rem;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  color: #4a5568;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.empty-state h2 {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: #2d3748;
}

.empty-state p {
  color: #718096;
  line-height: 1.6;
  margin-bottom: 2rem;
}

.empty-info {
  display: flex;
  justify-content: center;
  gap: 2rem;
  flex-wrap: wrap;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  background: #f7fafc;
  border-radius: 8px;
  font-size: 0.875rem;
}

.info-item .icon {
  font-size: 1.25rem;
}

/* Dashboard Content */
.dashboard-content section {
  margin-bottom: 3rem;
}

.dashboard-content h2 {
  font-size: 1.5rem;
  font-weight: 600;
  color: #2d3748;
  margin-bottom: 1.5rem;
}

/* Summary Cards */
.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1.5rem;
}

.summary-card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 1rem;
  transition: transform 0.2s, box-shadow 0.2s;
}

.summary-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.summary-card.best-provider {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.card-icon {
  font-size: 2rem;
}

.best-provider .card-icon {
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
}

.card-content {
  flex: 1;
}

.card-label {
  font-size: 0.875rem;
  opacity: 0.8;
  margin-bottom: 0.25rem;
}

.best-provider .card-label {
  opacity: 0.95;
}

.card-value {
  font-size: 1.75rem;
  font-weight: 700;
}

.card-detail {
  font-size: 0.875rem;
  margin-top: 0.25rem;
  opacity: 0.9;
}

/* Sections */
.comparison-section,
.chart-section,
.details-section {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}
</style>
