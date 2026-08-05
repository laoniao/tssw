<template>
  <el-dialog
    :model-value="modelValue"
    :title="work?.title || '作品详情'"
    width="760px"
    destroy-on-close
    class="work-display-dialog"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div v-if="work" class="work-display">
      <div class="detail-cover" :style="coverStyle">
        <div class="detail-cover-badge">
          <el-icon size="40"><PictureFilled /></el-icon>
          <span>优秀作品</span>
        </div>
      </div>

      <div class="detail-section">
        <h4 class="card-title">作品简介</h4>
        <p>{{ work.description }}</p>
      </div>

      <div class="detail-meta card">
        <div class="meta-row">
          <span class="meta-label">作者</span>
          <span class="meta-value">{{ work.author?.name }}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">创建时间</span>
          <span class="meta-value">{{ formatDate(work.createdAt) }}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">所属比赛</span>
          <span class="meta-value">比赛 ID: {{ work.competitionId }}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">互动</span>
          <span class="meta-value actions">
            <button
              class="like-btn"
              type="button"
              :class="{ liked: work.liked }"
              @click="handleLike"
            >
              <el-icon><component :is="work.liked ? 'StarFilled' : 'Star'" /></el-icon>
              {{ work.likes }}
            </button>
            <span class="comment-count">
              <el-icon><ChatDotRound /></el-icon>
              {{ commentCount }}
            </span>
          </span>
        </div>
      </div>

      <WorkComment
        :work-id="work.id"
        @count-change="onCountChange"
      />
    </div>
  </el-dialog>
</template>

<script setup>
import { ElMessage } from 'element-plus'
import { like } from '@/api/comment'
import { getCoverStyle } from '@/utils/avatarStyles'
import WorkComment from './components/WorkComment.vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  work: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['update:modelValue', 'like-change'])

const commentCount = ref(0)

const coverStyle = computed(() => getCoverStyle(props.work?.id || 0))

const formatDate = (dt) => String(dt || '').slice(0, 10)

const onCountChange = (count) => {
  commentCount.value = count
  if (props.work) {
    props.work.comments = count
  }
}

const handleLike = async () => {
  if (!props.work) return
  try {
    const res = await like(props.work.id, props.work.likes)
    const { liked, likes } = res.data || {}
    props.work.liked = liked
    props.work.likes = likes
    emit('like-change', { id: props.work.id, liked, likes })
  } catch (e) {
    ElMessage.error(e.message || '点赞失败')
  }
}

watch(
  () => props.work?.id,
  () => {
    commentCount.value = props.work?.comments || 0
  },
  { immediate: true }
)
</script>

<style scoped lang="scss">
.work-display {
  .detail-cover {
    height: 200px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 20px;
  }

  .detail-cover-badge {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    color: rgba(255, 255, 255, 0.7);
    font-size: 14px;
    font-weight: 600;
  }
}

.detail-section {
  margin-bottom: $spacing-lg;

  p {
    font-size: $font-size-base;
    color: $text-secondary;
    line-height: 1.7;
    margin: 0;
  }
}

.detail-meta {
  margin-bottom: $spacing-lg;

  .meta-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 6px 0;
    font-size: 13px;

    .meta-label {
      color: $text-muted;
    }

    .meta-value {
      color: $text-primary;
      font-weight: 500;
    }

    &:not(:last-child) {
      border-bottom: 1px solid $border-color;
    }
  }

  .actions {
    display: inline-flex;
    align-items: center;
    gap: 14px;
  }

  .like-btn {
    border: none;
    background: transparent;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    cursor: pointer;
    color: $text-muted;
    font-size: 13px;
    padding: 0;

    &.liked,
    &:hover {
      color: #f59e0b;
    }
  }

  .comment-count {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: $text-muted;
  }
}
</style>
