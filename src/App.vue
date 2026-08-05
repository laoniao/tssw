<template>
  <div class="app-shell">
    <BackgroundGlow />
    <div class="app-content">
      <router-view v-slot="{ Component, route }">
        <transition name="fade" mode="out-in">
          <component :is="Component" :key="route.matched[0]?.path || route.path" />
        </transition>
      </router-view>
    </div>
    <AIAssistant />
  </div>
</template>

<script setup>
import BackgroundGlow from '@/components/BackgroundGlow.vue'
import AIAssistant from '@/components/AIAssistant.vue'
</script>

<style>
#app {
  height: 100%;
  min-height: 100vh;
}

.app-shell {
  position: relative;
  min-height: 100vh;
}

.app-content {
  position: relative;
  z-index: 1;
  min-height: 100vh;
}
</style>
