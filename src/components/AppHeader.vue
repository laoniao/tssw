<template>
  <el-header class="app-header" :class="{ 'is-teacher': isTeacher }">
    <div class="header-inner">
      <!-- Logo -->
      <div class="header-left">
        <h1 class="logo" @click="goHome">师生交互平台</h1>
        <el-breadcrumb v-if="isTeacher" class="teacher-breadcrumb" separator="/">
          <el-breadcrumb-item
            v-for="item in breadcrumbs"
            :key="item.path"
            :to="item.path"
          >
            {{ item.meta.title }}
          </el-breadcrumb-item>
        </el-breadcrumb>
      </div>

      <!-- 学生端导航：桌面 -->
      <nav v-if="isStudent" class="header-nav desktop-nav">
        <router-link
          v-for="item in studentMenus"
          :key="item.path"
          :to="item.path"
          class="nav-link"
          :class="{ active: isActiveMenu(item.path) }"
        >
          <el-icon><component :is="item.icon" /></el-icon>
          <span>{{ item.label }}</span>
        </router-link>
      </nav>

      <!-- 用户区域 -->
      <div class="header-right">
        <!-- 小屏折叠菜单 -->
        <el-dropdown v-if="isStudent" class="mobile-nav" trigger="click" @command="goPath">
          <el-button text class="mobile-menu-btn">
            <el-icon :size="20"><Menu /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item
                v-for="item in studentMenus"
                :key="item.path"
                :command="item.path"
              >
                <el-icon><component :is="item.icon" /></el-icon>
                {{ item.label }}
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>

        <!-- 消息铃铛 -->
        <el-dropdown
          trigger="click"
          placement="bottom-end"
          popper-class="message-dropdown-popper"
          :hide-on-click="false"
          @visible-change="onDropdownVisible"
        >
          <div class="message-trigger" title="消息通知">
            <el-badge :value="unreadCount" :hidden="unreadCount === 0" :max="99">
              <el-icon :size="20" class="bell-icon"><Bell /></el-icon>
            </el-badge>
          </div>
          <template #dropdown>
            <div class="message-dropdown">
              <div class="message-dropdown__header">
                <span>消息通知</span>
                <el-button
                  v-if="unreadCount > 0"
                  link
                  type="primary"
                  size="small"
                  @click="handleMarkAll"
                >
                  全部已读
                </el-button>
              </div>

              <div v-if="recentMessages.length" class="message-dropdown__list">
                <div
                  v-for="msg in recentMessages"
                  :key="msg.id"
                  class="message-item"
                  :class="{ unread: !msg.isRead }"
                  @click="handleMessageClick(msg)"
                >
                  <div class="message-item__top">
                    <div class="message-item__type">
                      <span class="status-dot" :class="msg.isRead ? 'is-read' : 'is-unread'" />
                      <el-tag :type="typeTagMap[msg.type]" size="small" effect="plain">
                        {{ msg.typeLabel || typeLabelMap[msg.type] }}
                      </el-tag>
                    </div>
                    <span class="message-item__time">{{ msg.time }}</span>
                  </div>
                  <div class="message-item__title">{{ msg.title }}</div>
                  <div class="message-item__content">{{ msg.content }}</div>
                  <div class="message-item__status">
                    {{ msg.isRead ? '已读' : '未读' }}
                  </div>
                </div>
              </div>
              <el-empty v-else description="暂无消息" :image-size="64" />

              <div class="message-dropdown__footer">
                <el-button type="primary" link @click="goAllMessages">查看全部</el-button>
              </div>
            </div>
          </template>
        </el-dropdown>

        <!-- 用户信息 + 退出 -->
        <div class="user-area">
          <el-dropdown trigger="click" popper-class="header-dropdown-popper" @command="handleCommand">
            <div class="user-info">
              <el-avatar :size="30" :src="userStore.userInfo?.avatar">
                {{ (userStore.userInfo?.username || '用').charAt(0) }}
              </el-avatar>
              <span class="username">{{ userStore.userInfo?.username }}</span>
              <el-icon class="user-caret"><ArrowDown /></el-icon>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item v-if="isStudent" command="profile">
                  <el-icon><User /></el-icon>
                  个人中心
                </el-dropdown-item>
                <el-dropdown-item command="messages">
                  <el-icon><Bell /></el-icon>
                  消息中心
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          <el-button class="logout-btn" text type="primary" @click="logout">
            退出
          </el-button>
        </div>
      </div>
    </div>
  </el-header>
</template>

<script setup>
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/store/user'
import { useMessageStore } from '@/store/message'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const messageStore = useMessageStore()

const { unreadCount, recentMessages } = storeToRefs(messageStore)

const isStudent = computed(() => userStore.role === 'student')
const isTeacher = computed(() => userStore.role === 'teacher')

const studentMenus = [
  { path: '/student/competitions', label: '比赛大厅', icon: 'Trophy' },
  { path: '/student/team', label: '组队中心', icon: 'UserFilled' },
  { path: '/student/works', label: '作品展示', icon: 'PictureFilled' },
  { path: '/student/profile', label: '个人中心', icon: 'User' },
]

const breadcrumbs = computed(() =>
  route.matched.filter(item => item.meta && item.meta.title)
)

const typeLabelMap = {
  system: '系统通知',
  review: '审核结果',
  invite: '组队邀请',
}

const typeTagMap = {
  system: 'info',
  review: 'success',
  invite: 'warning',
}

const messagesPath = computed(() =>
  isTeacher.value ? '/teacher/messages' : '/student/messages'
)

const isActiveMenu = (path) => {
  if (path === '/student/competitions' && route.path.startsWith('/student/competition/')) {
    return true
  }
  return route.path === path || route.path.startsWith(`${path}/`)
}

const goHome = () => {
  router.push(isTeacher.value ? '/teacher' : '/student')
}

const goPath = (path) => {
  router.push(path)
}

onMounted(() => {
  messageStore.fetchMessages({ role: userStore.role })
})

const onDropdownVisible = (visible) => {
  if (visible) {
    messageStore.fetchMessages({ role: userStore.role })
  }
}

const handleMessageClick = async (msg) => {
  if (!msg.isRead) {
    await messageStore.markAsRead(msg.id)
  }
}

const handleMarkAll = async () => {
  await messageStore.markAllAsRead()
  ElMessage.success('已全部标记为已读')
}

const goAllMessages = () => {
  router.push(messagesPath.value)
}

const logout = async () => {
  try {
    await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
    userStore.logout()
    ElMessage.success('已退出登录')
    router.push('/login')
  } catch {
    // 用户取消
  }
}

const handleCommand = async (command) => {
  switch (command) {
    case 'profile':
      router.push('/student/profile')
      break
    case 'messages':
      goAllMessages()
      break
  }
}
</script>

<style scoped lang="scss">
.app-header {
  position: sticky;
  top: 0;
  z-index: 100;
  height: 64px !important;
  padding: 0 !important;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid $border-color;
  box-shadow: none;
}

.header-inner {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $spacing-md;
  padding: 0 $spacing-xl;
}

.header-left {
  display: flex;
  align-items: center;
  gap: $spacing-lg;
  min-width: 0;
  flex-shrink: 0;
}

.logo {
  margin: 0;
  font-size: $font-size-xl;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
  background: $gradient-brand;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  transition: $transition-base;

  &:hover {
    opacity: 0.9;
  }
}

.teacher-breadcrumb {
  min-width: 0;

  :deep(.el-breadcrumb__inner) {
    color: $text-secondary;
    font-weight: 500;
  }

  :deep(.el-breadcrumb__item:last-child .el-breadcrumb__inner) {
    color: $text-primary;
  }
}

.header-nav {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: $spacing-lg;
  min-width: 0;
}

.nav-link {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: $spacing-xs;
  height: 64px;
  padding: 0 2px;
  font-size: $font-size-base;
  color: $text-secondary;
  text-decoration: none;
  border-bottom: 2px solid transparent;
  transition: $transition-base;
  white-space: nowrap;

  &:hover {
    color: $primary;
  }

  &.active {
    color: $primary;
    border-bottom-color: $primary;
    font-weight: 600;
  }

  .el-icon {
    font-size: 16px;
  }
}

.header-right {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  margin-left: auto;
  flex-shrink: 0;
}

.mobile-nav {
  display: none;
}

.mobile-menu-btn {
  color: $text-secondary;
  padding: $spacing-sm;

  &:hover {
    color: $primary;
  }
}

.message-trigger {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: $radius-full;
  cursor: pointer;
  color: $text-secondary;
  transition: $transition-base;
  outline: none;

  &:hover {
    color: $primary;
    background: $bg-body;

    .bell-icon {
      animation: bellRing 0.5s ease;
    }
  }

  &:active {
    transform: scale(0.94);
  }
}

@keyframes bellRing {
  0%, 100% { transform: rotate(0); }
  20% { transform: rotate(14deg); }
  40% { transform: rotate(-12deg); }
  60% { transform: rotate(8deg); }
  80% { transform: rotate(-4deg); }
}

.user-area {
  display: flex;
  align-items: center;
  gap: $spacing-xs;
}

.user-info {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  padding: 4px 8px;
  border-radius: $radius-md;
  cursor: pointer;
  transition: $transition-base;

  &:hover {
    background: $bg-body;
  }

  .username {
    max-width: 96px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: $font-size-base;
    color: $text-primary;
    font-weight: 500;
  }

  .user-caret {
    color: $text-muted;
    font-size: 12px;
  }
}

.logout-btn {
  color: $text-secondary !important;
  font-size: $font-size-base;
  transition: $transition-base !important;

  &:hover {
    color: $primary !important;
  }
}

.message-dropdown {
  width: 360px;
  max-height: 400px;
  padding: $spacing-md;
  box-sizing: border-box;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: $spacing-sm;
    margin-bottom: $spacing-sm;
    border-bottom: 1px solid $border-color;
    font-weight: 600;
    color: $text-primary;
  }

  &__list {
    max-height: 280px;
    overflow-y: auto;
    margin: 0 (-$spacing-sm);
  }

  &__footer {
    padding-top: $spacing-sm;
    margin-top: $spacing-sm;
    text-align: center;
    border-top: 1px solid $border-color;
  }
}

.message-item {
  padding: $spacing-sm $spacing-sm;
  border-radius: $radius-md;
  cursor: pointer;
  transition: $transition-base;

  &:hover {
    background: $bg-body;
  }

  &.unread {
    .message-item__title {
      color: $text-primary;
    }
  }

  &__top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 6px;
    gap: $spacing-sm;
  }

  &__type {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
  }

  &__time {
    font-size: $font-size-sm;
    color: $text-muted;
    flex-shrink: 0;
  }

  &__title {
    font-size: $font-size-base;
    font-weight: 600;
    color: $text-primary;
    margin-bottom: 4px;
  }

  &__content {
    font-size: 13px;
    color: $text-secondary;
    line-height: 1.5;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  &__status {
    margin-top: 6px;
    font-size: $font-size-sm;
    color: $text-muted;
  }
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: $radius-full;
  flex-shrink: 0;

  &.is-unread {
    background: $danger;
    box-shadow: 0 0 0 3px rgba($danger, 0.15);
  }

  &.is-read {
    background: $text-muted;
  }
}

@media (max-width: $breakpoint-lg) {
  .desktop-nav {
    display: none;
  }

  .mobile-nav {
    display: inline-flex;
  }

  .header-inner {
    padding: 0 $spacing-md;
  }

  .username {
    display: none;
  }

  .teacher-breadcrumb {
    display: none;
  }
}
</style>
