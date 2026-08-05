<template>
  <el-container class="teacher-layout">
    <!-- 桌面侧栏 -->
    <el-aside :width="asideWidth" class="layout-aside desktop-aside">
      <div class="logo-container">
        <h1 class="logo">师生交互平台</h1>
        <p class="subtitle">{{ teacherType === 'leader' ? '带队教师工作台' : '管理员工作台' }}</p>
      </div>
      <el-menu :default-active="activeMenu" class="aside-menu" router>
        <el-menu-item v-for="item in menus" :key="item.path" :index="item.path">
          <el-icon><component :is="item.icon" /></el-icon>
          <span>{{ item.label }}</span>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <el-container class="layout-body">
      <div class="mobile-bar">
        <el-button class="menu-toggle" text @click="drawerOpen = true">
          <el-icon :size="22"><Menu /></el-icon>
        </el-button>
        <span class="mobile-title">{{ teacherType === 'leader' ? '带队教师' : '管理员' }}工作台</span>
      </div>

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

    <!-- 移动端抽屉导航 -->
    <el-drawer
      v-model="drawerOpen"
      direction="ltr"
      size="260px"
      :with-header="false"
      class="aside-drawer"
    >
      <div class="logo-container drawer-logo">
        <h1 class="logo">师生交互平台</h1>
        <p class="subtitle">{{ teacherType === 'leader' ? '带队教师工作台' : '管理员工作台' }}</p>
      </div>
      <el-menu :default-active="activeMenu" class="aside-menu" router @select="drawerOpen = false">
        <el-menu-item v-for="item in menus" :key="item.path" :index="item.path">
          <el-icon><component :is="item.icon" /></el-icon>
          <span>{{ item.label }}</span>
        </el-menu-item>
      </el-menu>
    </el-drawer>
  </el-container>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import AppHeader from '@/components/AppHeader.vue'
import { useUserStore } from '@/store/user'

const route = useRoute()
const userStore = useUserStore()
const drawerOpen = ref(false)
const year = new Date().getFullYear()
const asideWidth = '232px'
const activeMenu = computed(() => route.path)

// 管理员：全部菜单；带队教师：队伍审核 + 消息
const allMenus = [
  { path: '/teacher/publish', label: '比赛管理', icon: 'EditPen', roles: ['admin'] },
  { path: '/teacher/team-audit', label: '队伍审核', icon: 'Checked', roles: ['admin', 'leader'] },
  { path: '/teacher/guide-assign', label: '指导分配', icon: 'Connection', roles: ['admin'] },
  { path: '/teacher/data-board', label: '数据看板', icon: 'DataAnalysis', roles: ['admin'] },
  { path: '/teacher/announcement', label: '公告资源', icon: 'Bell', roles: ['admin'] },
  { path: '/teacher/accounts', label: '账号管理', icon: 'Setting', roles: ['admin'] },
  { path: '/teacher/messages', label: '消息中心', icon: 'ChatDotRound', roles: ['admin', 'leader'] },
]

const teacherType = computed(() => userStore.userInfo?.teacherType || 'admin')
const menus = computed(() =>
  allMenus.filter((item) => item.roles.includes(teacherType.value)),
)
</script>

<style scoped lang="scss">
.teacher-layout {
  min-height: 100vh;
  background-color: transparent;
}

.layout-aside {
  background: $bg-card;
  box-shadow: 1px 0 0 $border-color;
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-y: auto;
  z-index: 20;
}

.logo-container {
  padding: $spacing-lg $spacing-md;
  text-align: left;
  border-bottom: 1px solid $border-color;

  .logo {
    font-size: $font-size-lg;
    font-weight: 800;
    color: $primary;
    margin: 0 0 $spacing-xs;
    letter-spacing: -0.3px;
  }

  .subtitle {
    font-size: $font-size-sm;
    color: $text-muted;
    margin: 0;
    font-weight: 500;
  }
}

.aside-menu {
  border-right: none;
  padding: $spacing-sm;

  :deep(.el-menu-item) {
    font-size: $font-size-base;
    height: 44px;
    line-height: 44px;
    margin-bottom: 2px;
    border-radius: $radius-md;
  }

  :deep(.el-menu-item.is-active) {
    background-color: $primary-bg;
    color: $primary;
    font-weight: 600;
  }

  :deep(.el-menu-item:hover) {
    background-color: $bg-body;
  }
}

.layout-body {
  flex-direction: column;
  min-width: 0;
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

  p { margin: 0; }
}

.mobile-bar {
  display: none;
  align-items: center;
  gap: $spacing-sm;
  height: 48px;
  padding: 0 $spacing-sm;
  background: $bg-card;
  border-bottom: 1px solid $border-color;
  position: sticky;
  top: 0;
  z-index: 30;

  .mobile-title {
    font-weight: 700;
    color: $text-primary;
    font-size: $font-size-base;
  }

  .menu-toggle {
    color: $text-secondary;
  }
}

.drawer-logo {
  margin-bottom: $spacing-sm;
}

@media (max-width: $breakpoint-lg) {
  .desktop-aside {
    display: none;
  }

  .mobile-bar {
    display: flex;
  }
}
</style>
