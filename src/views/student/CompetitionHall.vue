<template>
  <div class="page-container">
    <!-- 页面头部 -->
    <div class="page-header">
      <div>
        <h1 class="page-title">比赛大厅</h1>
        <p class="page-subtitle">探索并参加各类精彩比赛，展示你的才华</p>
      </div>
      <div class="header-stats">
        <span class="stat-chip">
          <el-icon><Trophy /></el-icon>
          共 {{ filteredList.length }} 场比赛
        </span>
      </div>
    </div>

    <!-- 搜索筛选栏 -->
    <div class="filter-bar">
      <el-input
        v-model="searchKey"
        placeholder="搜索比赛名称..."
        prefix-icon="Search"
        clearable
        class="filter-input"
        @input="handleSearch"
      />
      <el-select v-model="filterCategory" placeholder="比赛类别" clearable class="filter-select-sm" @change="handleSearch">
        <el-option v-for="c in categories" :key="c" :label="c" :value="c" />
      </el-select>
      <el-select v-model="filterStatus" placeholder="比赛状态" clearable class="filter-select-sm" @change="handleSearch">
        <el-option label="报名中" value="报名中" />
        <el-option label="进行中" value="进行中" />
        <el-option label="已结束" value="已结束" />
      </el-select>
      <div class="filter-divider"></div>
      <div class="view-toggle">
        <el-tooltip content="卡片视图">
          <el-button :type="viewMode === 'grid' ? 'primary' : 'default'" :icon="Grid" circle size="small" @click="viewMode = 'grid'" />
        </el-tooltip>
        <el-tooltip content="列表视图">
          <el-button :type="viewMode === 'list' ? 'primary' : 'default'" :icon="List" circle size="small" @click="viewMode = 'list'" />
        </el-tooltip>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-grid">
      <div v-for="i in 6" :key="i" class="skeleton-card">
        <div class="skeleton" style="height:180px;border-radius:12px 12px 0 0"></div>
        <div style="padding:16px">
          <div class="skeleton" style="height:20px;width:60%;margin-bottom:10px"></div>
          <div class="skeleton" style="height:14px;width:90%;margin-bottom:6px"></div>
          <div class="skeleton" style="height:14px;width:70%"></div>
        </div>
      </div>
    </div>

    <!-- 卡片视图 -->
    <transition-group
      v-else-if="viewMode === 'grid'"
      name="card-list"
      tag="div"
      class="competitions-grid"
    >
      <div
        v-for="(comp, idx) in paginatedList"
        :key="comp.id"
        class="comp-card card card-lift"
        :style="`animation-delay: ${idx * 0.05}s`"
        @click="goDetail(comp.id)"
      >
        <!-- 封面图 -->
        <div class="card-cover">
          <div class="cover-placeholder" :style="getCoverStyle(idx)">
            <el-icon size="48"><Trophy /></el-icon>
          </div>
          <div class="card-status-badge">
            <el-tag :type="getStatusType(comp.status)" size="small" effect="dark">
              {{ comp.status }}
            </el-tag>
          </div>
          <div class="card-category-badge">{{ comp.category }}</div>
        </div>

        <!-- 卡片内容 -->
        <div class="card-body">
          <h3 class="card-title">{{ comp.name }}</h3>
          <p class="card-desc">{{ comp.description }}</p>

          <div class="card-meta">
            <span class="meta-item">
              <el-icon><Calendar /></el-icon>
              {{ formatDate(comp.startTime) }}
            </span>
            <span class="meta-item">
              <el-icon><User /></el-icon>
              {{ comp.participantCount }} / {{ comp.maxParticipants }} 人
            </span>
          </div>

          <!-- 进度条 -->
          <div class="enroll-progress">
            <div class="progress-bar">
              <div
                class="progress-fill"
                :style="`width: ${Math.min((comp.participantCount / comp.maxParticipants) * 100, 100)}%`"
                :class="getProgressClass(comp.participantCount / comp.maxParticipants)"
              ></div>
            </div>
            <span class="progress-text">
              报名进度 {{ Math.round((comp.participantCount / comp.maxParticipants) * 100) }}%
            </span>
          </div>

          <!-- 教师头像组 -->
          <div class="card-teachers">
            <span class="teachers-label">带队老师</span>
            <div class="avatar-stack">
              <el-tooltip
                v-for="t in comp.teachers.slice(0, 3)"
                :key="t.id"
                :content="`${t.name} - ${t.title}`"
              >
                <div class="avatar-item" :style="getAvatarStyle(t.name)">
                  {{ t.name.charAt(0) }}
                </div>
              </el-tooltip>
              <div v-if="comp.teachers.length > 3" class="avatar-more">
                +{{ comp.teachers.length - 3 }}
              </div>
            </div>
          </div>
        </div>

        <div class="card-footer">
          <el-button type="primary" size="small" class="apply-btn" @click.stop="goDetail(comp.id)">
            查看详情
            <el-icon class="el-icon--right"><ArrowRight /></el-icon>
          </el-button>
        </div>
      </div>
    </transition-group>

    <!-- 列表视图 -->
    <div v-else class="competitions-list">
      <div
        v-for="comp in paginatedList"
        :key="comp.id"
        class="list-item card"
        @click="goDetail(comp.id)"
      >
        <div class="list-cover" :style="getCoverStyle(comp.id)">
          <el-icon size="24" color="white"><Trophy /></el-icon>
        </div>
        <div class="list-info">
          <div class="list-name">{{ comp.name }}</div>
          <div class="list-desc">{{ comp.description }}</div>
          <div class="list-meta">
            <el-tag :type="getStatusType(comp.status)" size="small">{{ comp.status }}</el-tag>
            <span class="meta-item"><el-icon><User /></el-icon>{{ comp.participantCount }} 人报名</span>
            <span class="meta-item"><el-icon><Calendar /></el-icon>{{ formatDate(comp.startTime) }}</span>
          </div>
        </div>
        <div class="list-action">
          <el-button type="primary" size="small">查看详情</el-button>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="!loading && filteredList.length === 0" class="empty-state">
      <el-icon class="empty-icon" size="60"><Trophy /></el-icon>
      <div class="empty-title">暂无符合条件的比赛</div>
      <div class="empty-desc">尝试调整搜索条件，或稍后再来看看</div>
    </div>

    <!-- 分页 -->
    <el-pagination
      v-if="!loading && filteredList.length > pageSize"
      v-model:current-page="currentPage"
      :page-size="pageSize"
      :total="filteredList.length"
      layout="prev, pager, next, jumper, total"
      background
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, markRaw } from 'vue'
import { useRouter } from 'vue-router'
import { getCompetitions } from '@/api'
import { getCoverStyle, getAvatarStyle } from '@/utils/avatarStyles'
import { Grid, List } from '@element-plus/icons-vue'

const router = useRouter()

const loading = ref(true)
const allList = ref([])
const searchKey = ref('')
const filterCategory = ref('')
const filterStatus = ref('')
const viewMode = ref('grid')
const currentPage = ref(1)
const pageSize = 9

const categories = ['创新类', '技能类', '学术类', '设计类']

// 获取比赛列表
onMounted(async () => {
  try {
    const res = await getCompetitions()
    allList.value = res.data.list
  } finally {
    loading.value = false
  }
})

// 过滤后列表
const filteredList = computed(() => {
  return allList.value.filter(c => {
    const keyMatch = !searchKey.value || c.name.includes(searchKey.value)
    const catMatch = !filterCategory.value || c.category === filterCategory.value
    const statMatch = !filterStatus.value || c.status === filterStatus.value
    return keyMatch && catMatch && statMatch
  })
})

// 当前页数据
const paginatedList = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredList.value.slice(start, start + pageSize)
})

const handleSearch = () => { currentPage.value = 1 }

const goDetail = (id) => router.push(`/student/competition/${id}`)

const getStatusType = (s) => ({
  '报名中': 'success', '进行中': 'warning', '已结束': 'info'
}[s] || 'info')

const getProgressClass = (ratio) => {
  if (ratio > 0.9) return 'danger'
  if (ratio > 0.7) return 'warning'
  return 'normal'
}

const formatDate = (dt) => {
  if (!dt) return ''
  return String(dt).slice(0, 10)
}
</script>

<style scoped lang="scss">
.filter-divider {
  flex: 1;
}

.stat-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: $primary-bg;
  color: $primary;
  border-radius: $radius-full;
  font-size: $font-size-sm;
  font-weight: 600;
}

// 骨架屏
.loading-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: $spacing-lg;
}
.skeleton-card {
  background: $bg-card;
  border-radius: $radius-lg;
  border: 1px solid $border-color;
  overflow: hidden;
}

// 比赛卡片网格
.competitions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: $spacing-lg;

  @media (max-width: $breakpoint-md) {
    grid-template-columns: 1fr;
  }
}

.comp-card {
  padding: 0;
  overflow: hidden;
  cursor: pointer;
  animation: fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
  display: flex;
  flex-direction: column;

  &:hover {
    border-color: $primary;

    .card-cover .cover-placeholder {
      transform: scale(1.04);
    }
  }
}

// 卡片封面
.card-cover {
  height: 160px;
  overflow: hidden;
  position: relative;

  .cover-placeholder {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgba(255,255,255,0.6);
    transition: transform 0.4s cubic-bezier(0.16,1,0.3,1);
  }

  .card-status-badge {
    position: absolute;
    top: 12px;
    right: 12px;
  }

  .card-category-badge {
    position: absolute;
    bottom: 12px;
    left: 12px;
    background: rgba(0,0,0,0.35);
    backdrop-filter: blur(6px);
    color: #fff;
    font-size: 11px;
    font-weight: 600;
    padding: 3px 10px;
    border-radius: 20px;
    letter-spacing: 0.5px;
  }
}

// 卡片内容
.card-body {
  padding: $spacing-md $spacing-lg;
  flex: 1;

  .card-title {
    display: -webkit-box;
    margin-bottom: $spacing-sm;
    line-height: 1.4;
    overflow: hidden;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 1;
  }

  .card-desc {
    font-size: $font-size-sm;
    color: $text-muted;
    line-height: 1.5;
    margin-bottom: $spacing-sm;
    overflow: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    min-height: 38px;
  }
}

.card-meta {
  display: flex;
  gap: $spacing-md;
  margin-bottom: $spacing-sm;

  .meta-item {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: $text-muted;
  }
}

// 进度条
.enroll-progress {
  margin-bottom: 14px;

  .progress-bar {
    height: 4px;
    background: $bg-body;
    border-radius: 2px;
    overflow: hidden;
    margin-bottom: 4px;
  }

  .progress-fill {
    height: 100%;
    border-radius: 2px;
    transition: width 0.5s ease;

    &.normal  { background: linear-gradient(90deg, $primary, $primary-dark); }
    &.warning { background: linear-gradient(90deg, #f59e0b, #f97316); }
    &.danger  { background: linear-gradient(90deg, #ef4444, #dc2626); }
  }

  .progress-text {
    font-size: 11px;
    color: $text-muted;
  }
}

// 教师头像
.card-teachers {
  display: flex;
  align-items: center;
  gap: 10px;

  .teachers-label {
    font-size: 12px;
    color: $text-muted;
    flex-shrink: 0;
  }

  .avatar-item, .avatar-more {
    width: 28px; height: 28px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 700;
    cursor: pointer;
    transition: transform 0.2s;

    &:hover { transform: scale(1.15); z-index: 1; }
  }

  .avatar-more {
    background: $bg-body;
    color: $text-muted;
    font-size: 10px;
  }
}

// 卡片底部
.card-footer {
  padding: 12px 18px 16px;
  border-top: 1px solid $bg-body;

  .apply-btn {
    width: 100%;
    border-radius: 8px !important;
    font-weight: 600;
  }
}

// 列表视图
.competitions-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-lg;
}

.list-item {
  display: flex;
  align-items: center;
  gap: $spacing-md;
  cursor: pointer;

  &:hover {
    border-color: $primary;
    transform: translateX(4px);
  }

  .list-cover {
    width: 60px; height: 60px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .list-info {
    flex: 1;

    .list-name {
      font-size: 15px;
      font-weight: 600;
      color: $text-primary;
      margin-bottom: 4px;
    }

    .list-desc {
      font-size: 13px;
      color: $text-muted;
      margin-bottom: 8px;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    .list-meta {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;

      .meta-item {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 12px;
        color: $text-muted;
      }
    }
  }
}

// 过渡动画
.card-list-enter-active,
.card-list-leave-active {
  transition: all 0.3s ease;
}
.card-list-enter-from,
.card-list-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
