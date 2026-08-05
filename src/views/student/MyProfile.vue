<template>
  <div class="page-container" v-loading="loading">
    <!-- 加载骨架 -->
    <div v-if="loading" class="profile-skeleton">
      <div class="skeleton skeleton-hero"></div>
      <div class="skeleton-grid">
        <div class="skeleton skeleton-block"></div>
        <div class="skeleton skeleton-block"></div>
      </div>
    </div>

    <!-- 个人信息头部 -->
    <div v-else-if="profile" class="profile-hero card">
      <div class="hero-bg"></div>
      <div class="hero-content">
        <div class="hero-avatar">
          <img
            v-if="displayAvatar"
            :src="displayAvatar"
            class="avatar-img"
            alt="头像"
          />
          <div v-else class="avatar-circle" :style="getAvatarStyle(displayName)">
            {{ displayName.charAt(0) }}
          </div>
          <div class="avatar-badge">在读</div>
        </div>
        <div class="hero-info">
          <h1 class="hero-name">{{ displayName }}</h1>
          <p v-if="displayBio" class="hero-bio">{{ displayBio }}</p>
          <div class="hero-meta">
            <span><el-icon><Postcard /></el-icon> {{ profile.userInfo.studentId }}</span>
            <span><el-icon><School /></el-icon> {{ profile.userInfo.major }}</span>
            <span><el-icon><User /></el-icon> {{ profile.userInfo.grade }}</span>
          </div>
          <div class="hero-contact">
            <span><el-icon><Message /></el-icon> {{ profile.userInfo.email }}</span>
            <span><el-icon><Phone /></el-icon> {{ profile.userInfo.phone }}</span>
          </div>
        </div>
        <el-button class="edit-btn" @click="showEditDialog = true">
          <el-icon><Edit /></el-icon>
          编辑资料
        </el-button>
      </div>
      <!-- 统计数字 -->
      <div class="hero-stats">
        <div class="hero-stat-item">
          <span class="hsi-val">{{ profile.competitionHistory?.list?.length || 0 }}</span>
          <span class="hsi-label">参赛记录</span>
        </div>
        <div class="hero-stat-divider"></div>
        <div class="hero-stat-item">
          <span class="hsi-val">{{ profile.myTeams?.length || 0 }}</span>
          <span class="hsi-label">加入队伍</span>
        </div>
        <div class="hero-stat-divider"></div>
        <div class="hero-stat-item">
          <span class="hsi-val">{{ profile.myTeachers?.list?.length || 0 }}</span>
          <span class="hsi-label">指导老师</span>
        </div>
        <div class="hero-stat-divider"></div>
        <div class="hero-stat-item">
          <span class="hsi-val">{{ awardsCount }}</span>
          <span class="hsi-label">获奖次数</span>
        </div>
      </div>
    </div>

    <div v-if="!loading && profile" class="profile-body">
      <!-- 左列 -->
      <div class="profile-left">
        <!-- 我的导师 -->
        <div class="section-card card">
          <div class="card-title-row">
            <span class="card-title"><el-icon><Avatar /></el-icon> 我的导师</span>
          </div>

          <div v-if="profile.myTeachers?.list?.length" class="teachers-list">
            <div v-for="t in profile.myTeachers.list" :key="t.id" class="teacher-row">
              <div class="t-avatar" :style="getTeacherColor(t.name)">{{ t.name.charAt(0) }}</div>
              <div class="t-info">
                <div class="t-name">{{ t.name }}</div>
                <div class="t-detail">{{ t.title }} · {{ t.department }}</div>
              </div>
              <el-tag type="success" size="small">指导中</el-tag>
            </div>
          </div>
          <div v-else class="empty-tip">暂无导师</div>
        </div>

        <!-- 我的队伍 -->
        <div class="section-card card">
          <div class="card-title-row">
            <span class="card-title"><el-icon><UserFilled /></el-icon> 我的队伍</span>
            <el-button size="small" text @click="$router.push('/student/team')">查看全部</el-button>
          </div>

          <div v-if="profile.myTeams?.length" class="my-teams-list">
            <div v-for="team in profile.myTeams" :key="team.id" class="my-team-row">
              <div class="team-row-icon" :style="getTeamColor(team.id)">
                {{ team.name.charAt(0) }}
              </div>
              <div class="team-row-info">
                <div class="team-row-name">{{ team.name }}</div>
                <div class="team-row-meta">{{ team.currentMembers }}/{{ team.maxMembers }} 人 · 比赛 {{ team.competitionId }}</div>
              </div>
              <el-tag :type="getTeamStatusType(team.status)" size="small">{{ team.status }}</el-tag>
            </div>
          </div>
          <div v-else class="empty-tip">暂未加入队伍</div>
        </div>
      </div>

      <!-- 右列：参赛记录时间线 -->
      <div class="profile-right">
        <div class="section-card card">
          <div class="card-title-row">
            <span class="card-title"><el-icon><Trophy /></el-icon> 参赛记录</span>
            <span class="card-count">{{ profile.competitionHistory?.list?.length || 0 }} 场</span>
          </div>

          <el-timeline v-if="profile.competitionHistory?.list?.length">
            <el-timeline-item
              v-for="(rec, i) in profile.competitionHistory.list"
              :key="i"
              :type="getAwardType(rec.status)"
              :timestamp="rec.year"
              placement="top"
              size="large"
            >
              <div class="timeline-card">
                <div class="tl-header">
                  <span class="tl-name">{{ rec.name }}</span>
                  <el-tag :type="getAwardType(rec.status)" size="small">{{ rec.status }}</el-tag>
                </div>
                <div class="tl-team">
                  <el-icon><UserFilled /></el-icon>
                  队伍：{{ rec.teamName }}
                </div>
              </div>
            </el-timeline-item>
          </el-timeline>
          <div v-else class="empty-tip">暂无参赛记录</div>
        </div>
      </div>
    </div>

    <!-- 编辑资料弹窗 -->
    <ProfileEdit
      v-model:visible="showEditDialog"
      :initial-data="editInitialData"
      @success="handleProfileUpdated"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { getStudentProfile } from '@/api'
import { useUserStore } from '@/store/user'
import ProfileEdit from './components/ProfileEdit.vue'
import { getAvatarStyle, getTeacherStyle, getTeamColor } from '@/utils/avatarStyles'

const userStore = useUserStore()
const loading = ref(true)
const profile = ref(null)
const showEditDialog = ref(false)

onMounted(async () => {
  try {
    const res = await getStudentProfile()
    const storeInfo = userStore.userInfo || {}
    // 以当前登录用户为准，避免 Mock 默认「张同学」覆盖新注册账号
    const mergedUser = {
      ...(res.data?.userInfo || {}),
      ...storeInfo,
      username: storeInfo.username || res.data?.userInfo?.username,
      studentId: storeInfo.studentId || res.data?.userInfo?.studentId,
      major: storeInfo.major || res.data?.userInfo?.major,
      grade: storeInfo.grade || res.data?.userInfo?.grade,
      email: storeInfo.email || res.data?.userInfo?.email || '',
      phone: storeInfo.phone || res.data?.userInfo?.phone || '',
      avatar: storeInfo.avatar || res.data?.userInfo?.avatar || '',
      bio: storeInfo.bio || res.data?.userInfo?.bio || '',
    }
    profile.value = {
      ...res.data,
      userInfo: mergedUser,
    }
  } finally {
    loading.value = false
  }
})

const displayName = computed(() => {
  return userStore.profile?.nickname
    || profile.value?.userInfo?.username
    || '同学'
})

const displayAvatar = computed(() => {
  return userStore.profile?.avatar || profile.value?.userInfo?.avatar || ''
})

const displayBio = computed(() => {
  return userStore.profile?.bio || profile.value?.userInfo?.bio || ''
})

const editInitialData = computed(() => {
  const info = profile.value?.userInfo || {}
  return {
    avatar: userStore.profile?.avatar || info.avatar || '',
    nickname: userStore.profile?.nickname || info.username || '',
    major: userStore.profile?.major || info.major || '',
    bio: userStore.profile?.bio || info.bio || '',
  }
})

const awardsCount = computed(() => {
  const list = profile.value?.competitionHistory?.list || []
  return list.filter(r => r.status.includes('奖')).length
})

const handleProfileUpdated = (data) => {
  if (!profile.value?.userInfo) return
  profile.value.userInfo = {
    ...profile.value.userInfo,
    username: data.nickname ?? profile.value.userInfo.username,
    avatar: data.avatar ?? profile.value.userInfo.avatar,
    major: data.major ?? profile.value.userInfo.major,
    bio: data.bio ?? profile.value.userInfo.bio,
  }
}

const getAwardType = (s) => ({
  '一等奖': 'success', '二等奖': 'primary', '三等奖': 'warning', '参与奖': 'info'
}[s] || 'info')

const getTeamStatusType = (s) => ({ '招募中': 'success', '已满员': 'info', '已解散': 'danger' }[s] || 'info')

const getTeacherColor = (name) => getTeacherStyle(name)
</script>

<style scoped lang="scss">
.profile-skeleton {
  .skeleton-hero {
    height: 220px;
    border-radius: $radius-lg;
    margin-bottom: $spacing-lg;
  }

  .skeleton-grid {
    display: grid;
    grid-template-columns: 320px 1fr;
    gap: $spacing-lg;

    @media (max-width: $breakpoint-lg) {
      grid-template-columns: 1fr;
    }
  }

  .skeleton-block {
    height: 240px;
    border-radius: $radius-lg;
  }
}

// 个人信息头部
.profile-hero {
  margin-bottom: $spacing-lg;
  overflow: hidden;
  position: relative;
  padding: 0;
}

.hero-bg {
  height: 100px;
  background: $gradient-brand;
}

.hero-content {
  display: flex;
  align-items: flex-end;
  gap: $spacing-lg;
  padding: 0 $spacing-lg $spacing-md;
  margin-top: -40px;
  position: relative;

  @media (max-width: $breakpoint-sm) {
    flex-direction: column;
    align-items: flex-start;
  }
}

.hero-avatar {
  position: relative;
  flex-shrink: 0;

  .avatar-circle, .avatar-img {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    border: 4px solid $bg-card;
    box-shadow: $shadow-md;
  }

  .avatar-circle {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28px;
    font-weight: 800;
    color: #fff;
  }

  .avatar-img {
    object-fit: cover;
    display: block;
  }

  .avatar-badge {
    position: absolute;
    bottom: 0;
    right: -4px;
    background: $success;
    color: #fff;
    font-size: 10px;
    font-weight: 700;
    padding: 2px 6px;
    border-radius: 10px;
    border: 2px solid $bg-card;
  }
}

.hero-info {
  flex: 1;
  padding-top: 44px;
  min-width: 0;

  .hero-name {
    font-size: $font-size-2xl;
    font-weight: 800;
    color: $text-primary;
    margin-bottom: $spacing-xs;
    letter-spacing: -0.5px;
  }

  .hero-bio {
    font-size: $font-size-sm;
    color: $text-secondary;
    margin: 0 0 $spacing-sm;
    line-height: 1.5;
    max-width: 480px;
  }

  .hero-meta, .hero-contact {
    display: flex;
    gap: $spacing-md;
    flex-wrap: wrap;
    font-size: $font-size-sm;
    color: $text-secondary;
    margin-bottom: $spacing-xs;

    span {
      display: flex;
      align-items: center;
      gap: $spacing-xs;
    }
  }
}

.edit-btn {
  margin-left: auto;
  align-self: flex-end;
  margin-bottom: $spacing-md;
  border-radius: $radius-md !important;
}

.hero-stats {
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: $spacing-md $spacing-lg;
  border-top: 1px solid $border-color;
}

.hero-stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $spacing-xs;

  .hsi-val { font-size: 26px; font-weight: 800; color: $text-primary; letter-spacing: -1px; }
  .hsi-label { font-size: $font-size-sm; color: $text-muted; }
}

.hero-stat-divider {
  height: 32px;
  width: 1px;
  background: $border-color;
}

.profile-body {
  display: flex;
  gap: $spacing-lg;
  align-items: flex-start;

  @media (max-width: $breakpoint-lg) { flex-direction: column; }
}

.profile-left {
  width: 320px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: $spacing-lg;

  @media (max-width: $breakpoint-lg) { width: 100%; }
}

.profile-right {
  flex: 1;
  min-width: 0;
}

.card-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: $spacing-md;

  .card-title { margin-bottom: 0; }

  .card-count {
    font-size: $font-size-sm;
    color: $text-muted;
    background: $bg-body;
    padding: 2px 10px;
    border-radius: $radius-full;
  }
}

.teachers-list, .my-teams-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
}

.teacher-row,
.my-team-row {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  padding: $spacing-sm $spacing-md;
  border-radius: $radius-md;
  background: $bg-body;
  transition: background 0.2s, box-shadow 0.2s;

  &:hover {
    background: $primary-bg;
  }
}

.t-avatar {
  width: 40px; height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
}

.t-info {
  flex: 1;
  .t-name { font-size: $font-size-base; font-weight: 600; color: $text-primary; }
  .t-detail { font-size: $font-size-sm; color: $text-muted; }
}

.team-row-icon {
  width: 38px; height: 38px;
  border-radius: $radius-md;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: $font-size-lg;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
}

.team-row-info {
  flex: 1;
  .team-row-name { font-size: $font-size-base; font-weight: 600; color: $text-primary; }
  .team-row-meta { font-size: $font-size-sm; color: $text-muted; }
}

.timeline-card {
  background: $bg-body;
  border-radius: $radius-md;
  padding: $spacing-sm $spacing-md;

  .tl-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: $spacing-xs;

    .tl-name { font-size: $font-size-base; font-weight: 600; color: $text-primary; }
  }

  .tl-team {
    display: flex;
    align-items: center;
    gap: $spacing-xs;
    font-size: $font-size-sm;
    color: $text-muted;
  }
}

.empty-tip {
  text-align: center;
  padding: $spacing-lg;
  color: $text-muted;
  font-size: $font-size-base;
}
</style>
