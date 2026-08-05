<template>
  <div class="work-comment">
    <div class="comment-header">
      <h4 class="card-title">评论 ({{ total }})</h4>
      <el-button text type="primary" :loading="loading" @click="loadComments">刷新</el-button>
    </div>

    <div class="composer">
      <el-input
        v-model="input"
        type="textarea"
        :rows="2"
        :placeholder="replyTarget ? `回复 @${replyTarget.user}` : '写下你的评论...'"
        maxlength="300"
        show-word-limit
      />
      <div class="composer-actions">
        <el-button v-if="replyTarget" text @click="cancelReply">取消回复</el-button>
        <el-button type="primary" :loading="submitting" @click="submitComment">
          {{ replyTarget ? '回复' : '发表评论' }}
        </el-button>
      </div>
    </div>

    <div v-loading="loading" class="comment-tree">
      <template v-if="comments.length">
        <CommentNode
          v-for="item in comments"
          :key="item.id"
          :node="item"
          :depth="0"
          @reply="onReply"
        />
      </template>
      <el-empty v-else description="还没有评论，来抢沙发吧" :image-size="72" />
    </div>
  </div>
</template>

<script setup>
import { ElMessage } from 'element-plus'
import { add, getList } from '@/api/comment'
import CommentNode from './WorkCommentNode.vue'

const props = defineProps({
  workId: {
    type: [Number, String],
    required: true,
  },
})

const emit = defineEmits(['count-change'])

const loading = ref(false)
const submitting = ref(false)
const comments = ref([])
const total = ref(0)
const input = ref('')
const replyTarget = ref(null)

const loadComments = async () => {
  if (!props.workId) return
  loading.value = true
  try {
    const res = await getList(props.workId)
    comments.value = res.data?.list || []
    total.value = res.data?.total ?? comments.value.length
    emit('count-change', total.value)
  } finally {
    loading.value = false
  }
}

const onReply = (node) => {
  replyTarget.value = node
}

const cancelReply = () => {
  replyTarget.value = null
}

const submitComment = async () => {
  const content = input.value.trim()
  if (!content) {
    ElMessage.warning('请输入评论内容')
    return
  }
  submitting.value = true
  try {
    const parentId = replyTarget.value?.id
    const res = await add(props.workId, content, parentId)
    comments.value = res.data?.list || comments.value
    total.value = res.data?.total ?? total.value
    emit('count-change', total.value)
    input.value = ''
    replyTarget.value = null
    ElMessage.success(parentId ? '回复成功' : '评论成功')
  } finally {
    submitting.value = false
  }
}

watch(
  () => props.workId,
  () => {
    input.value = ''
    replyTarget.value = null
    loadComments()
  },
  { immediate: true }
)

defineExpose({ refresh: loadComments })
</script>

<style scoped lang="scss">
.work-comment {
  .comment-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: $spacing-md;

    .card-title {
      margin-bottom: 0;
    }
  }

  .composer {
    margin-bottom: 16px;

    .composer-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 10px;
    }
  }

  .comment-tree {
    min-height: 80px;
  }
}
</style>
