<script setup lang="ts">
import { computed } from 'vue';
import type { ProviderStatus } from '@/types/domain/weather';

interface Props {
  status: ProviderStatus | null;
}

const props = defineProps<Props>();

const statusColor = computed(() => {
  if (!props.status) return 'gray';

  switch (props.status.quotaInfo.status) {
    case 'normal':
      return 'green';
    case 'warning':
      return 'yellow';
    case 'exceeded':
      return 'red';
    default:
      return 'gray';
  }
});

const statusEmoji = computed(() => {
  if (!props.status) return '⚪';

  switch (props.status.quotaInfo.status) {
    case 'normal':
      return '🟢';
    case 'warning':
      return '🟡';
    case 'exceeded':
      return '🔴';
    default:
      return '⚪';
  }
});

const resetTimeFormatted = computed(() => {
  if (!props.status) return '';

  const date = props.status.quotaInfo.resetTime;
  return date.toLocaleString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
});

const percentageFormatted = computed(() => {
  if (!props.status) return '0';
  return props.status.quotaInfo.percentage.toFixed(1);
});

const isUnlimited = computed(() => {
  if (!props.status) return false;
  return props.status.quotaInfo.limit === Number.POSITIVE_INFINITY;
});

const usageText = computed(() => {
  if (!props.status) return '';

  if (isUnlimited.value) {
    return `${props.status.quotaInfo.used} 사용 (무제한)`;
  }

  return `${props.status.quotaInfo.used} / ${props.status.quotaInfo.limit} 사용 (${percentageFormatted.value}%)`;
});
</script>

<template>
  <div v-if="status" class="quota-status">
    <div class="status-header">
      <span class="status-emoji">{{ statusEmoji }}</span>
      <span class="provider-name">{{ status.name }}</span>
    </div>

    <div class="quota-info">
      <div v-if="!isUnlimited" class="quota-bar-container">
        <div
          class="quota-bar"
          :class="`quota-bar-${statusColor}`"
          :style="{ width: `${status.quotaInfo.percentage}%` }"
        />
      </div>

      <div class="quota-details">
        <span class="quota-text">
          {{ usageText }}
        </span>
        <span class="reset-time" v-if="!isUnlimited && status.quotaInfo.resetTime">
          리셋: {{ resetTimeFormatted }}
        </span>
      </div>
    </div>

    <div v-if="status.error" class="error-text">
      ⚠️ {{ status.error }}
    </div>
  </div>
</template>

<style scoped>
.quota-status {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
}

.status-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.status-emoji {
  font-size: 1.25rem;
}

.provider-name {
  font-weight: 600;
  font-size: 1rem;
  color: #333;
}

.quota-info {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.quota-bar-container {
  width: 100%;
  height: 8px;
  background: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
}

.quota-bar {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.quota-bar-green {
  background: linear-gradient(90deg, #4caf50, #66bb6a);
}

.quota-bar-yellow {
  background: linear-gradient(90deg, #ffa726, #ffb74d);
}

.quota-bar-red {
  background: linear-gradient(90deg, #ef5350, #e57373);
}

.quota-bar-gray {
  background: linear-gradient(90deg, #9e9e9e, #bdbdbd);
}

.quota-details {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.875rem;
  color: #666;
}

.quota-text {
  font-weight: 500;
}

.reset-time {
  font-size: 0.75rem;
  color: #999;
}

.error-text {
  margin-top: 0.5rem;
  padding: 0.5rem;
  background: #ffebee;
  border-radius: 4px;
  font-size: 0.875rem;
  color: #c62828;
}
</style>
