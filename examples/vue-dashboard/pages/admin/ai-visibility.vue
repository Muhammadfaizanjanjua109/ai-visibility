<!--
  Vue 3 / Nuxt 3
  AI Visibility Dashboard Page

  Place this file at: pages/admin/ai-visibility.vue
  Access at: http://localhost:3000/admin/ai-visibility
-->

<template>
    <div v-html="dashboardHtml"></div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { AIVisitorLogger, createDashboard } from '@Muhammadfaizanjunjua109/ai-visibility'

const dashboardHtml = ref('')

onMounted(() => {
    // Initialize logger
    const logger = new AIVisitorLogger({
        storage: 'file',
        logFilePath: './logs/ai-crawler.json',
    })

    // Get stats from last 30 days
    const stats = logger.getStats(30)
    const logs = logger.getLogs({ days: 30 })

    // Create dashboard and render with data
    const dashboard = createDashboard()
    dashboardHtml.value = dashboard.render(stats, logs, {
        autoRefresh: false,
        refreshInterval: 30000,
    })
})
</script>
