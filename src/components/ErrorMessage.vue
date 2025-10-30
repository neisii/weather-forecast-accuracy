<script setup lang="ts">
defineProps<{
  message: string;
}>();
</script>

<template>
  <div class="error">
    <p>{{ message }}</p>
  </div>
</template>

<style scoped>
.error {
  background-color: #fee;
  border: 1px solid #fcc;
  color: #c33;
  padding: 1rem;
  border-radius: 8px;
  text-align: center;
}

.error p {
  margin: 0;
}
</style>
