<template>
  <div class="comment-node" :style="{ marginLeft: depth > 0 ? '28px' : '0' }">
    <div class="comment-item">
      <el-avatar :size="depth > 0 ? 28 : 34" :src="node.avatar">
        {{ (node.user || '?').charAt(0) }}
      </el-avatar>
      <div class="comment-body">
        <div class="comment-top">
          <span class="user">{{ node.user }}</span>
          <span class="time">{{ node.time }}</span>
        </div>
        <div class="content">
          <template v-for="(part, idx) in contentParts" :key="idx">
            <span v-if="part.mention" class="mention">{{ part.text }}</span>
            <span v-else>{{ part.text }}</span>
          </template>
        </div>
        <div class="ops">
          <button class="op-btn" type="button" @click="$emit('reply', node)">
            <el-icon><ChatDotRound /></el-icon>
            回复
          </button>
          <span class="likes">
            <el-icon><Star /></el-icon>
            {{ node.likes || 0 }}
          </span>
        </div>
      </div>
    </div>

    <WorkCommentNode
      v-for="child in node.children || []"
      :key="child.id"
      :node="child"
      :depth="depth + 1"
      @reply="$emit('reply', $event)"
    />
  </div>
</template>

<script setup>
defineOptions({ name: 'WorkCommentNode' })

const props = defineProps({
  node: {
    type: Object,
    required: true,
  },
  depth: {
    type: Number,
    default: 0,
  },
})

defineEmits(['reply'])

const contentParts = computed(() => {
  const text = String(props.node.content || '')
  const match = text.match(/^(@\S+)\s?(.*)$/)
  if (!match) return [{ text, mention: false }]
  return [
    { text: match[1], mention: true },
    { text: match[2] ? ` ${match[2]}` : '', mention: false },
  ]
})
</script>

<style scoped lang="scss">
.comment-node {
  margin-bottom: 12px;
}

.comment-item {
  display: flex;
  gap: 10px;
}

.comment-body {
  flex: 1;
  min-width: 0;
  background: $bg-body;
  border-radius: 10px;
  padding: 10px 12px;
}

.comment-top {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;

  .user {
    font-size: 13px;
    font-weight: 600;
    color: $text-secondary;
  }

  .time {
    font-size: 11px;
    color: $text-muted;
  }
}

.content {
  font-size: 14px;
  color: $text-secondary;
  line-height: 1.6;
  word-break: break-word;

  .mention {
    color: $primary;
    font-weight: 600;
  }
}

.ops {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 6px;
}

.op-btn {
  border: none;
  background: transparent;
  color: $text-muted;
  font-size: 12px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0;

  &:hover {
    color: $primary;
  }
}

.likes {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: $text-muted;
}
</style>
