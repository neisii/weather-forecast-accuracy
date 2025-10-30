<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router';
</script>

<template>
  <div class="app">
    <nav class="nav">
      <div class="nav-container">
        <div class="nav-brand">
          <span class="brand-icon">🌤️</span>
          <span class="brand-text">Weather App</span>
        </div>
        <div class="nav-links">
          <RouterLink to="/" class="nav-link">날씨 검색</RouterLink>
          <RouterLink to="/ai-prediction" class="nav-link">🤖 AI 예측</RouterLink>
          <RouterLink to="/accuracy" class="nav-link">정확도 분석</RouterLink>
        </div>
      </div>
    </nav>
    <RouterView />
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
}

.nav {
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 100;
}

.nav-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.nav-brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.25rem;
  font-weight: 700;
  color: #1a202c;
}

.brand-icon {
  font-size: 1.5rem;
}

.nav-links {
  display: flex;
  gap: 1rem;
}

.nav-link {
  padding: 0.5rem 1rem;
  border-radius: 8px;
  text-decoration: none;
  color: #4a5568;
  font-weight: 500;
  transition: all 0.2s;
}

.nav-link:hover {
  background: #f7fafc;
  color: #2d3748;
}

.nav-link.router-link-active {
  background: #667eea;
  color: white;
}
</style>
