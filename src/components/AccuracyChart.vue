<template>
  <div class="accuracy-chart">
    <div class="chart-header">
      <div class="legend">
        <div v-for="provider in providers" :key="provider" class="legend-item">
          <span class="legend-color" :style="{ backgroundColor: providerColor(provider) }"></span>
          <span class="legend-label">{{ providerDisplayName(provider) }}</span>
        </div>
      </div>
    </div>

    <div v-if="chartData.length === 0" class="empty-chart">
      <p>표시할 데이터가 없습니다</p>
    </div>

    <svg v-else class="chart-svg" :viewBox="`0 0 ${width} ${height}`">
      <!-- Grid lines -->
      <g class="grid">
        <line
          v-for="i in 5"
          :key="`grid-${i}`"
          :x1="padding.left"
          :y1="padding.top + (chartHeight / 4) * (i - 1)"
          :x2="width - padding.right"
          :y2="padding.top + (chartHeight / 4) * (i - 1)"
          stroke="#e2e8f0"
          stroke-width="1"
        />
      </g>

      <!-- Y-axis labels (Temperature error) -->
      <g class="y-axis">
        <text
          v-for="i in 5"
          :key="`y-label-${i}`"
          :x="padding.left - 10"
          :y="padding.top + (chartHeight / 4) * (i - 1) + 5"
          text-anchor="end"
          font-size="12"
          fill="#718096"
        >
          {{ (5 - (i - 1) * 1.25).toFixed(1) }}°C
        </text>
      </g>

      <!-- X-axis labels (Dates) -->
      <g class="x-axis">
        <text
          v-for="(date, i) in xAxisDates"
          :key="`x-label-${i}`"
          :x="padding.left + (chartWidth / (xAxisDates.length - 1)) * i"
          :y="height - padding.bottom + 20"
          text-anchor="middle"
          font-size="11"
          fill="#718096"
        >
          {{ formatShortDate(date) }}
        </text>
      </g>

      <!-- Lines for each provider -->
      <g v-for="provider in providers" :key="`line-${provider}`" class="provider-line">
        <polyline
          :points="getLinePoints(provider)"
          :stroke="providerColor(provider)"
          stroke-width="3"
          fill="none"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <!-- Data points -->
        <circle
          v-for="(point, i) in getProviderPoints(provider)"
          :key="`point-${provider}-${i}`"
          :cx="point.x"
          :cy="point.y"
          r="4"
          :fill="providerColor(provider)"
          class="data-point"
        >
          <title>{{ point.tooltip }}</title>
        </circle>
      </g>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { AccuracyComparison } from '@/composables/useAccuracyData';

const props = defineProps<{
  comparisons: AccuracyComparison[];
}>();

const providers = ['openweather', 'weatherapi', 'openmeteo'];

const width = 800;
const height = 400;
const padding = { top: 20, right: 20, bottom: 40, left: 50 };
const chartWidth = width - padding.left - padding.right;
const chartHeight = height - padding.top - padding.bottom;

function providerDisplayName(provider: string): string {
  const names: Record<string, string> = {
    openweather: 'OpenWeather',
    weatherapi: 'WeatherAPI',
    openmeteo: 'Open-Meteo',
  };
  return names[provider] || provider;
}

function providerColor(provider: string): string {
  const colors: Record<string, string> = {
    openweather: '#f59e0b',
    weatherapi: '#3b82f6',
    openmeteo: '#10b981',
  };
  return colors[provider] || '#718096';
}

function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

// Group comparisons by date
const chartData = computed(() => {
  const grouped = new Map<string, Record<string, number>>();

  for (const comparison of props.comparisons) {
    if (!grouped.has(comparison.date)) {
      grouped.set(comparison.date, {});
    }
    grouped.get(comparison.date)![comparison.provider] = comparison.tempError;
  }

  // Convert to sorted array
  return Array.from(grouped.entries())
    .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
    .map(([date, providers]) => ({ date, providers }));
});

// X-axis dates (show every 3rd date for readability)
const xAxisDates = computed(() => {
  return chartData.value
    .filter((_, i) => i % 3 === 0 || i === chartData.value.length - 1)
    .map(d => d.date);
});

// Get line points for a provider
function getLinePoints(provider: string): string {
  return getProviderPoints(provider)
    .map(p => `${p.x},${p.y}`)
    .join(' ');
}

// Get data points for a provider
function getProviderPoints(provider: string) {
  return chartData.value
    .map((data, i) => {
      const tempError = data.providers[provider];
      if (tempError === undefined) return null;

      const x = padding.left + (chartWidth / (chartData.value.length - 1)) * i;
      // Scale: 0-5°C error maps to chartHeight-0
      const y = padding.top + chartHeight - (tempError / 5) * chartHeight;

      return {
        x,
        y,
        tooltip: `${formatShortDate(data.date)}: ${tempError.toFixed(1)}°C`,
      };
    })
    .filter(p => p !== null);
}
</script>

<style scoped>
.accuracy-chart {
  width: 100%;
}

.chart-header {
  display: flex;
  justify-content: center;
  margin-bottom: 1.5rem;
}

.legend {
  display: flex;
  gap: 2rem;
  flex-wrap: wrap;
  justify-content: center;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.legend-color {
  width: 16px;
  height: 16px;
  border-radius: 50%;
}

.legend-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #4a5568;
}

.chart-svg {
  width: 100%;
  height: auto;
  max-width: 800px;
  margin: 0 auto;
  display: block;
}

.data-point {
  cursor: pointer;
  transition: r 0.2s;
}

.data-point:hover {
  r: 6;
}

.empty-chart {
  text-align: center;
  padding: 4rem 2rem;
  color: #718096;
  font-size: 0.875rem;
}

@media (max-width: 768px) {
  .legend {
    gap: 1rem;
  }

  .legend-item {
    font-size: 0.75rem;
  }
}
</style>
