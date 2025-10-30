<template>
  <div class="daily-accuracy-table">
    <div class="table-controls">
      <div class="search-box">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="날짜 또는 프로바이더 검색..."
          class="search-input"
        />
      </div>
      <div class="filter-buttons">
        <button
          v-for="provider in providers"
          :key="provider"
          :class="['filter-btn', { active: selectedProvider === provider }]"
          @click="selectedProvider = provider"
        >
          {{ providerDisplayName(provider) }}
        </button>
        <button
          :class="['filter-btn', { active: selectedProvider === null }]"
          @click="selectedProvider = null"
        >
          전체
        </button>
      </div>
    </div>

    <div class="table-wrapper">
      <table class="accuracy-table">
        <thead>
          <tr>
            <th>날짜</th>
            <th>프로바이더</th>
            <th>예측 온도</th>
            <th>실제 온도</th>
            <th>온도 오차</th>
            <th>예측 날씨</th>
            <th>실제 날씨</th>
            <th>일치 여부</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="filteredComparisons.length === 0">
            <td colspan="8" class="empty-row">
              검색 결과가 없습니다
            </td>
          </tr>
          <tr
            v-for="comparison in paginatedComparisons"
            :key="`${comparison.date}-${comparison.provider}`"
            :class="{ 'match-row': comparison.conditionMatch }"
          >
            <td class="date-cell">{{ formatDate(comparison.date) }}</td>
            <td class="provider-cell">
              <span class="provider-badge" :class="`provider-${comparison.provider}`">
                {{ providerDisplayName(comparison.provider) }}
              </span>
            </td>
            <td class="temp-cell">
              {{ comparison.prediction?.temp_max.toFixed(1) }}°C
              <span class="temp-range">
                ({{ comparison.prediction?.temp_min.toFixed(1) }}°C)
              </span>
            </td>
            <td class="temp-cell">
              {{ comparison.observation?.temp_max.toFixed(1) }}°C
              <span class="temp-range">
                ({{ comparison.observation?.temp_min.toFixed(1) }}°C)
              </span>
            </td>
            <td class="error-cell">
              <span :class="['error-badge', errorClass(comparison.tempError)]">
                {{ comparison.tempError.toFixed(1) }}°C
              </span>
            </td>
            <td class="condition-cell">
              <span class="condition-text">
                {{ comparison.prediction?.condition_description_ko }}
              </span>
            </td>
            <td class="condition-cell">
              <span class="condition-text">
                {{ comparison.observation?.condition_description_ko }}
              </span>
            </td>
            <td class="match-cell">
              <span :class="['match-badge', { match: comparison.conditionMatch }]">
                {{ comparison.conditionMatch ? '✓ 일치' : '✗ 불일치' }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="pagination">
      <button
        class="page-btn"
        :disabled="currentPage === 1"
        @click="currentPage--"
      >
        이전
      </button>
      <span class="page-info">
        {{ currentPage }} / {{ totalPages }} 페이지
      </span>
      <button
        class="page-btn"
        :disabled="currentPage === totalPages"
        @click="currentPage++"
      >
        다음
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { AccuracyComparison } from '@/composables/useAccuracyData';

const props = defineProps<{
  comparisons: AccuracyComparison[];
}>();

const searchQuery = ref('');
const selectedProvider = ref<string | null>(null);
const currentPage = ref(1);
const itemsPerPage = 20;

const providers = ['openweather', 'weatherapi', 'openmeteo'];

function providerDisplayName(provider: string): string {
  const names: Record<string, string> = {
    openweather: 'OpenWeather',
    weatherapi: 'WeatherAPI',
    openmeteo: 'Open-Meteo',
  };
  return names[provider] || provider;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function errorClass(error: number): string {
  if (error < 1.5) return 'low';
  if (error < 3) return 'medium';
  return 'high';
}

// Filter comparisons
const filteredComparisons = computed(() => {
  let result = [...props.comparisons];

  // Filter by provider
  if (selectedProvider.value) {
    result = result.filter(c => c.provider === selectedProvider.value);
  }

  // Filter by search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(c =>
      c.date.includes(query) ||
      c.provider.toLowerCase().includes(query) ||
      providerDisplayName(c.provider).toLowerCase().includes(query)
    );
  }

  // Sort by date (descending)
  result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return result;
});

// Pagination
const totalPages = computed(() =>
  Math.ceil(filteredComparisons.value.length / itemsPerPage)
);

const paginatedComparisons = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  return filteredComparisons.value.slice(start, end);
});
</script>

<style scoped>
.daily-accuracy-table {
  width: 100%;
}

.table-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  gap: 1rem;
  flex-wrap: wrap;
}

.search-box {
  flex: 1;
  min-width: 250px;
}

.search-input {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.875rem;
  transition: border-color 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: #3b82f6;
}

.filter-buttons {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.filter-btn {
  padding: 0.5rem 1rem;
  border: 2px solid #e2e8f0;
  background: white;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.filter-btn:hover {
  background: #f7fafc;
}

.filter-btn.active {
  background: #3b82f6;
  border-color: #3b82f6;
  color: white;
}

.table-wrapper {
  overflow-x: auto;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.accuracy-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.accuracy-table thead {
  background: #f7fafc;
}

.accuracy-table th {
  padding: 1rem;
  text-align: left;
  font-weight: 600;
  color: #4a5568;
  border-bottom: 2px solid #e2e8f0;
}

.accuracy-table td {
  padding: 1rem;
  border-bottom: 1px solid #e2e8f0;
}

.accuracy-table tbody tr {
  transition: background-color 0.2s;
}

.accuracy-table tbody tr:hover {
  background: #f7fafc;
}

.accuracy-table tbody tr.match-row {
  background: #f0fdf4;
}

.empty-row {
  text-align: center;
  color: #718096;
  padding: 3rem !important;
}

.date-cell {
  font-weight: 500;
  color: #2d3748;
  white-space: nowrap;
}

.provider-cell {
  white-space: nowrap;
}

.provider-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
}

.provider-badge.provider-openweather {
  background: #fef3c7;
  color: #92400e;
}

.provider-badge.provider-weatherapi {
  background: #dbeafe;
  color: #1e40af;
}

.provider-badge.provider-openmeteo {
  background: #d1fae5;
  color: #065f46;
}

.temp-cell {
  text-align: right;
  font-weight: 500;
}

.temp-range {
  color: #718096;
  font-size: 0.75rem;
  margin-left: 0.25rem;
}

.error-cell {
  text-align: center;
}

.error-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-weight: 600;
}

.error-badge.low {
  background: #d1fae5;
  color: #065f46;
}

.error-badge.medium {
  background: #fef3c7;
  color: #92400e;
}

.error-badge.high {
  background: #fee2e2;
  color: #991b1b;
}

.condition-cell {
  max-width: 150px;
}

.condition-text {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.match-cell {
  text-align: center;
}

.match-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-weight: 600;
  font-size: 0.75rem;
}

.match-badge.match {
  background: #d1fae5;
  color: #065f46;
}

.match-badge:not(.match) {
  background: #fee2e2;
  color: #991b1b;
}

/* Pagination */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin-top: 1.5rem;
}

.page-btn {
  padding: 0.5rem 1rem;
  border: 2px solid #e2e8f0;
  background: white;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.page-btn:hover:not(:disabled) {
  background: #f7fafc;
  border-color: #cbd5e0;
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-info {
  font-size: 0.875rem;
  color: #718096;
}
</style>
