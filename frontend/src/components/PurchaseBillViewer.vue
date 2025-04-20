<script setup lang="ts">
import { ref } from 'vue';
import { api } from '../services/api';

const loading = ref(false);
const error = ref<string | null>(null);

const handleViewBill = async (purchaseId: number) => {
  loading.value = true;
  error.value = null;
  
  try {
    await api.purchases.viewBill(purchaseId);
  } catch (err) {
    console.error('Error viewing bill:', err);
    error.value = 'Failed to load bill';
  } finally {
    loading.value = false;
  }
};

defineExpose({
  handleViewBill
});
</script>

<template>
  <div v-if="error" class="error-message">
    {{ error }}
  </div>
  <div v-if="loading" class="loading-indicator">
    Loading...
  </div>
</template>