<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppLayout from '@/components/AppLayout.vue'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const userStore = useUserStore()

const showLayout = computed(() => {
  return route.path !== '/login' && userStore.isLoggedIn
})
</script>

<template>
  <AppLayout v-if="showLayout" />
  <router-view v-else />
</template>
