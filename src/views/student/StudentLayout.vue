<template>
  <el-container class="student-layout">
    <AppHeader />

    <el-main class="layout-main">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </el-main>

    <el-footer height="auto" class="layout-footer">
      <p>&copy; {{ year }} 师生交互平台 · All Rights Reserved</p>
    </el-footer>
  </el-container>
</template>

<script setup>
import AppHeader from '@/components/AppHeader.vue'

const year = new Date().getFullYear()
</script>

<style scoped lang="scss">
.student-layout {
  min-height: 100vh;
  background-color: transparent;
  flex-direction: column;
}

.layout-main {
  flex: 1;
  padding: 0;
  min-height: calc(100vh - #{$header-height} - #{$footer-height});
  background: transparent;
}

.layout-footer {
  text-align: center;
  color: $text-secondary;
  font-size: $font-size-sm;
  background: $bg-card;
  border-top: 1px solid $border-color;
  padding: $spacing-md $spacing-lg;
  height: auto !important;

  p {
    margin: 0;
  }
}
</style>
