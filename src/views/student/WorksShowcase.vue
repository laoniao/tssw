<template>
  <div class="page-container">
    <div class="page-header">
      <div>
        <h1 class="page-title">作品展示</h1>
        <p class="page-subtitle">欣赏往届参赛优秀作品，为你的创作带来灵感</p>
      </div>
      <div class="header-right-group">
        <el-radio-group v-model="sortBy" size="small" @change="currentPage = 1">
          <el-radio-button label="hot">最热</el-radio-button>
          <el-radio-button label="latest">最新</el-radio-button>
        </el-radio-group>
      </div>
    </div>

    <!-- 搜索栏 -->
    <div class="filter-bar">
      <el-input v-model="searchKey" placeholder="搜索作品..." prefix-icon="Search" clearable class="filter-input" />
      <el-select v-model="filterComp" placeholder="筛选比赛" clearable class="filter-select-md">
        <el-option v-for="c in compFilterOptions" :key="c.value" :label="c.label" :value="c.value" />
      </el-select>
    </div>

    <!-- 加载骨架 -->
    <div v-if="loading" class="works-loading">
      <div v-for="i in 6" :key="i" class="works-skeleton">
        <div class="skeleton" style="height:200px;border-radius:14px 14px 0 0"></div>
        <div style="padding:14px">
          <div class="skeleton" style="height:18px;width:60%;margin-bottom:8px"></div>
          <div class="skeleton" style="height:12px;width:90%"></div>
        </div>
      </div>
    </div>

    <!-- 瀑布流 -->
    <transition-group
      v-else
      name="works-list"
      tag="div"
      class="works-masonry"
    >
      <div
        v-for="(work, idx) in paginatedWorks"
        :key="work.id"
        class="work-card card card-lift"
        :style="`animation-delay: ${idx * 0.06}s`"
      >
        <!-- 封面 -->
        <div class="work-cover" :style="getCoverStyle(work.id)">
          <div class="cover-icon">
            <el-icon size="36"><PictureFilled /></el-icon>
          </div>
          <div class="cover-overlay">
            <el-button size="small" type="primary" plain @click="openDetail(work)">
              <el-icon><View /></el-icon>
              查看详情
            </el-button>
          </div>
        </div>

        <!-- 信息 -->
        <div class="work-body">
          <h3 class="work-title card-title">{{ work.title }}</h3>
          <p class="work-desc">{{ work.description }}</p>

          <!-- 作者 -->
          <div class="work-author">
            <div class="author-avatar" :style="getAvatarStyle(work.author.name)">{{ work.author.name.charAt(0) }}</div>
            <span class="author-name">{{ work.author.name }}</span>
            <span class="work-date">{{ formatDate(work.createdAt) }}</span>
          </div>

          <!-- 互动 -->
          <div class="work-actions">
            <div
              class="action-btn"
              :class="{ liked: work.liked }"
              @click="toggleLike(work)"
            >
              <el-icon><component :is="work.liked ? 'StarFilled' : 'Star'" /></el-icon>
              <span>{{ work.likes }}</span>
            </div>
            <div class="action-btn" @click="openDetail(work)">
              <el-icon><ChatDotRound /></el-icon>
              <span>{{ work.comments }}</span>
            </div>
            <el-button size="small" type="primary" plain class="detail-link" @click="openDetail(work)">
              详情
              <el-icon><ArrowRight /></el-icon>
            </el-button>
          </div>
        </div>
      </div>
    </transition-group>

    <!-- 空状态 -->
    <div v-if="!loading && filteredWorks.length === 0" class="empty-state">
      <el-icon class="empty-icon" size="56"><PictureFilled /></el-icon>
      <div class="empty-title">暂无作品</div>
    </div>

    <!-- 分页 -->
    <el-pagination
      v-if="!loading && filteredWorks.length > pageSize"
      v-model:current-page="currentPage"
      :page-size="pageSize"
      :total="filteredWorks.length"
      layout="prev, pager, next, jumper, total"
      background
    />

    <!-- 作品详情弹窗 -->
    <WorkDisplay
      v-model="detailVisible"
      :work="currentWork"
      @like-change="onLikeChange"
    />
  </div>
</template>

<script setup>
import { ElMessage } from 'element-plus'
import { getWorks } from '@/api'
import { like } from '@/api/comment'
import { getCoverStyle, getAvatarStyle } from '@/utils/avatarStyles'
import WorkDisplay from './WorkDisplay.vue'

const loading = ref(true)
const allWorks = ref([])
const searchKey = ref('')
const filterComp = ref('')
const sortBy = ref('hot')
const currentPage = ref(1)
const pageSize = 8

const detailVisible = ref(false)
const currentWork = ref(null)

const compFilterOptions = [
  { label: '比赛 1', value: 1 },
  { label: '比赛 2', value: 2 },
  { label: '比赛 3', value: 3 },
  { label: '比赛 4', value: 4 },
  { label: '比赛 5', value: 5 },
]

onMounted(async () => {
  try {
    const res = await getWorks()
    // liked 由后端按当前登录用户返回，不再一律置 false
    allWorks.value = (res.data?.list || []).map(w => ({ ...w, liked: !!w.liked }))
  } finally {
    loading.value = false
  }
})

const filteredWorks = computed(() => {
  let list = allWorks.value.filter(w => {
    const key = searchKey.value
    const keyOk = !key || String(w.title || '').includes(key) || String(w.description || '').includes(key)
    const compOk = !filterComp.value || w.competitionId === filterComp.value
    return keyOk && compOk
  })

  if (sortBy.value === 'hot') list = [...list].sort((a, b) => (b.likes || 0) - (a.likes || 0))
  else list = [...list].sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))

  return list
})

const paginatedWorks = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredWorks.value.slice(start, start + pageSize)
})

const toggleLike = async (work) => {
  try {
    const res = await like(work.id, work.likes)
    work.liked = res.data.liked
    work.likes = res.data.likes
  } catch (e) {
    ElMessage.error(e.message || '点赞失败')
  }
}

const onLikeChange = ({ id, liked, likes }) => {
  const target = allWorks.value.find(w => w.id === id)
  if (target) {
    target.liked = liked
    target.likes = likes
  }
}

const openDetail = (work) => {
  currentWork.value = work
  detailVisible.value = true
}

const formatDate = (dt) => String(dt || '').slice(0, 10)
</script>

<style scoped lang="scss">
.works-loading {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: $spacing-lg;

  .works-skeleton {
    background: $bg-card;
    border-radius: $radius-lg;
    border: 1px solid $border-color;
    overflow: hidden;
  }
}

// 瀑布流
.works-masonry {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: $spacing-lg;
}

.work-card {
  padding: 0;
  overflow: hidden;
  animation: fadeInUp 0.4s both;

  &:hover {
    .cover-overlay { opacity: 1; }
    .cover-icon { transform: scale(1.1); }
  }
}

.work-cover {
  height: 180px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;

  .cover-icon {
    color: rgba(255,255,255,0.3);
    transition: transform 0.4s;
  }

  .cover-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0,0,0,0.35);
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.3s;
  }
}

.work-body {
  padding: 16px 18px;
}

.work-title {
  margin-bottom: $spacing-sm;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.work-desc {
  font-size: 13px;
  color: $text-muted;
  line-height: 1.5;
  margin-bottom: 12px;
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  min-height: 38px;
}

.work-author {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
  padding-bottom: 12px;
  border-bottom: 1px solid $bg-body;

  .author-avatar {
    width: 26px; height: 26px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 700;
  }
  .author-name { font-size: 13px; font-weight: 500; color: $text-secondary; }
  .work-date { margin-left: auto; font-size: 12px; color: $text-muted; }
}

.work-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  color: $text-muted;
  font-size: 13px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 8px;
  transition: all 0.2s;
  user-select: none;

  &:hover { background: $bg-body; color: $primary; }

  &.liked { color: #f59e0b; }
}

.detail-link {
  margin-left: auto;
  border-radius: 8px !important;
}

// 过渡
.works-list-enter-active,
.works-list-leave-active { transition: all 0.3s ease; }
.works-list-enter-from,
.works-list-leave-to { opacity: 0; transform: scale(0.95); }
</style>
