<script setup lang="ts">
import { ref, computed } from 'vue';
import { CITY_COORDINATES } from '@/config/cityCoordinates';

const emit = defineEmits<{
  search: [city: string];
}>();

const city = ref('');

// 사용 가능한 도시 목록
const availableCities = computed(() => {
  return Object.values(CITY_COORDINATES);
});

function handleSubmit() {
  const trimmedCity = city.value.trim();
  if (trimmedCity) {
    emit('search', trimmedCity);
  }
}
</script>

<template>
  <form @submit.prevent="handleSubmit" class="search-form">
    <input
      v-model="city"
      type="text"
      list="city-suggestions"
      placeholder="도시 이름 (한글/영문)"
      class="search-input"
    />
    <datalist id="city-suggestions">
      <option
        v-for="cityData in availableCities"
        :key="cityData.name"
        :value="cityData.name"
      >
        {{ cityData.name_en }}
      </option>
    </datalist>
    <button type="submit" class="search-button">검색</button>
  </form>
</template>

<style scoped>
.search-form {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.search-input {
  flex: 1;
  padding: 0.75rem 1rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 1rem;
}

.search-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.search-button {
  padding: 0.75rem 2rem;
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.search-button:hover {
  background-color: #2563eb;
}
</style>
