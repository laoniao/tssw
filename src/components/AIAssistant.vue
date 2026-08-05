<template>
  <div v-if="visibleOnRoute" class="ai-assistant" :class="{ 'is-open': open }">
    <!-- 聊天窗口 -->
    <transition name="ai-panel">
      <div v-show="open" class="ai-panel" role="dialog" aria-label="智能助手">
        <header class="ai-panel__header">
          <div class="ai-panel__brand">
            <div class="ai-avatar ai-avatar--lg">
              <RobotIcon />
            </div>
            <div>
              <div class="ai-panel__title">智能助手</div>
              <div class="ai-panel__status">
                <span class="status-dot" />
                在线 · 模拟问答
              </div>
            </div>
          </div>
          <div class="ai-panel__actions">
            <el-button text class="icon-btn" title="清空对话" @click="clearMessages">
              <el-icon :size="16"><Delete /></el-icon>
            </el-button>
            <el-button text class="icon-btn" title="关闭" @click="open = false">
              <el-icon :size="18"><Close /></el-icon>
            </el-button>
          </div>
        </header>

        <div ref="listRef" class="ai-panel__messages">
          <div
            v-for="msg in messages"
            :key="msg.id"
            class="ai-msg"
            :class="msg.role === 'user' ? 'is-user' : 'is-assistant'"
          >
            <div v-if="msg.role === 'assistant'" class="ai-avatar ai-avatar--sm">
              <RobotIcon />
            </div>
            <div class="ai-msg__body">
              <div class="ai-bubble">{{ msg.content }}</div>
              <div class="ai-msg__time">{{ msg.time }}</div>
            </div>
          </div>

          <div v-if="replying" class="ai-msg is-assistant">
            <div class="ai-avatar ai-avatar--sm">
              <RobotIcon />
            </div>
            <div class="ai-msg__body">
              <div class="ai-bubble ai-bubble--typing">
                <span /><span /><span />
              </div>
            </div>
          </div>
        </div>

        <footer class="ai-panel__footer">
          <el-input
            v-model="draft"
            type="textarea"
            :rows="2"
            resize="none"
            maxlength="500"
            placeholder="问问比赛、组队、导师…"
            :disabled="replying"
            @keydown.enter.exact.prevent="sendMessage"
          />
          <el-button
            type="primary"
            class="send-btn"
            :loading="replying"
            :disabled="!draft.trim()"
            @click="sendMessage"
          >
            发送
          </el-button>
        </footer>
      </div>
    </transition>

    <!-- 浮动按钮 -->
    <button
      type="button"
      class="ai-fab"
      :title="open ? '关闭助手' : '打开智能助手'"
      :aria-expanded="open"
      @click="toggle"
    >
      <el-icon v-if="open" :size="26"><Close /></el-icon>
      <RobotIcon v-else />
    </button>
  </div>
</template>

<script setup>
import { nextTick, onMounted, ref, watch, computed, defineComponent, h } from 'vue'
import { useRoute } from 'vue-router'

const STORAGE_KEY = 'ai-assistant-history'

/** 自定义机器人 SVG（Element Plus 无 Robot 图标） */
const RobotIcon = defineComponent({
  name: 'RobotIcon',
  setup() {
    return () =>
      h(
        'svg',
        {
          xmlns: 'http://www.w3.org/2000/svg',
          viewBox: '0 0 24 24',
          fill: 'none',
          width: '1em',
          height: '1em',
          class: 'robot-svg',
        },
        [
          h('rect', {
            x: '5',
            y: '8',
            width: '14',
            height: '11',
            rx: '3',
            stroke: 'currentColor',
            'stroke-width': '1.8',
          }),
          h('circle', { cx: '9.2', cy: '13', r: '1.3', fill: 'currentColor' }),
          h('circle', { cx: '14.8', cy: '13', r: '1.3', fill: 'currentColor' }),
          h('path', {
            d: 'M9 16.5h6',
            stroke: 'currentColor',
            'stroke-width': '1.6',
            'stroke-linecap': 'round',
          }),
          h('path', {
            d: 'M12 8V5.5M12 5.5h2.5',
            stroke: 'currentColor',
            'stroke-width': '1.8',
            'stroke-linecap': 'round',
          }),
          h('circle', {
            cx: '15.2',
            cy: '5.5',
            r: '1.2',
            fill: 'currentColor',
          }),
        ],
      )
  },
})

const KEYWORD_REPLIES = [
  {
    keys: ['比赛', '报名', '竞赛', '大厅'],
    replies: [
      '可以在「比赛大厅」浏览正在报名的赛事，点击卡片即可查看详情并报名。',
      '正在查询比赛信息… 当前有多场报名中的赛事，建议按类别或状态筛选后再报名。',
      '报名成功后可在个人中心查看参赛记录，审核结果会通过消息中心通知您。',
    ],
  },
  {
    keys: ['组队', '队伍', '队友', '邀请'],
    replies: [
      '组队中心可以创建队伍或加入现有队伍，队长还能生成邀请链接分享给同学。',
      '想找队友的话，也可以去「智能推荐」看看匹配度较高的同学哦。',
      '申请加入队伍后，请耐心等待队长审核，结果会显示在申请列表里。',
    ],
  },
  {
    keys: ['导师', '老师', '指导', '教师'],
    replies: [
      '报名时可选择指导教师；名额有限，建议尽早在比赛详情页完成选择。',
      '「智能推荐」会根据专业与技能为您推荐合适的导师，可一键发起邀请。',
      '教师端可进行指导分配与报名审核，如有疑问可联系您的指导老师。',
    ],
  },
  {
    keys: ['作品', '展示', '获奖'],
    replies: [
      '往届优秀作品可在「作品展示」浏览，支持按赛事筛选与查看详情评论。',
      '作品页可以看到作者、赛队与获奖信息，便于学习往届优秀案例。',
    ],
  },
  {
    keys: ['消息', '通知', '审核'],
    replies: [
      '系统通知、审核结果与组队邀请都在「消息中心」，顶部铃铛也可快速查看。',
      '未读消息会有红点提示，建议定期打开消息中心处理待办。',
    ],
  },
  {
    keys: ['你好', '您好', '嗨', 'hello', 'hi'],
    replies: [
      '您好，我是您的智能助手，请问有什么可以帮您？',
      '嗨！我可以帮您了解比赛报名、组队、导师推荐等功能，试试直接提问吧。',
    ],
  },
]

const FALLBACK_REPLIES = [
  '您好，我是您的智能助手，请问有什么可以帮您？',
  '正在为您分析问题… 您可以问问「如何报名比赛」或「怎么组队」。',
  '我可以协助您了解平台功能：比赛大厅、组队中心、智能推荐、作品展示等。',
  '建议先完善个人资料与技能标签，智能推荐会更准确哦。',
  '如需联系老师或查看审核进度，请前往消息中心查看最新通知。',
  '您可以尝试关键词：比赛、组队、导师、作品、消息。',
  '正在查询相关信息… 稍等片刻，我会给您更具体的指引。',
  '这个问题我先按平台流程理解：多数操作都能在左侧/顶部导航快速进入对应页面。',
  '如果遇到报名或组队卡住，请确认账号角色正确，并留意消息中心里的审核结果。',
  '还有其他问题随时问我，我会继续为您解答～',
]

const route = useRoute()
const open = ref(false)
const draft = ref('')
const replying = ref(false)
const listRef = ref(null)
const messages = ref([])

const visibleOnRoute = computed(() => !route.path.startsWith('/login'))

const formatTime = (d = new Date()) => {
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

const scrollToBottom = async () => {
  await nextTick()
  const el = listRef.value
  if (el) el.scrollTop = el.scrollHeight
}

const persist = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.value.slice(-50)))
  } catch {
    /* ignore quota */
  }
}

const loadHistory = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length) {
        messages.value = parsed
        return
      }
    }
  } catch {
    /* ignore */
  }
  messages.value = [
    {
      id: uid(),
      role: 'assistant',
      content: '您好，我是您的智能助手，请问有什么可以帮您？可询问比赛、组队、导师推荐等。',
      time: formatTime(),
    },
  ]
}

const pickReply = (text) => {
  const lower = text.toLowerCase()
  for (const group of KEYWORD_REPLIES) {
    if (group.keys.some((k) => lower.includes(k.toLowerCase()))) {
      const list = group.replies
      return list[Math.floor(Math.random() * list.length)]
    }
  }
  return FALLBACK_REPLIES[Math.floor(Math.random() * FALLBACK_REPLIES.length)]
}

const delay = (ms) => new Promise((r) => setTimeout(r, ms))

const sendMessage = async () => {
  const content = draft.value.trim()
  if (!content || replying.value) return

  messages.value.push({
    id: uid(),
    role: 'user',
    content,
    time: formatTime(),
  })
  draft.value = ''
  persist()
  scrollToBottom()

  replying.value = true
  scrollToBottom()
  await delay(1000 + Math.random() * 1000)

  messages.value.push({
    id: uid(),
    role: 'assistant',
    content: pickReply(content),
    time: formatTime(),
  })
  replying.value = false
  persist()
  scrollToBottom()
}

const clearMessages = () => {
  messages.value = [
    {
      id: uid(),
      role: 'assistant',
      content: '对话已清空。您好，我是您的智能助手，请问有什么可以帮您？',
      time: formatTime(),
    },
  ]
  persist()
}

const toggle = () => {
  open.value = !open.value
}

watch(open, (v) => {
  if (v) scrollToBottom()
})

onMounted(loadHistory)
</script>

<style scoped lang="scss">
.ai-assistant {
  position: fixed;
  right: $spacing-lg;
  bottom: $spacing-lg;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: $spacing-md;
  pointer-events: none;

  > * {
    pointer-events: auto;
  }

  @media (max-width: $breakpoint-sm) {
    right: $spacing-md;
    bottom: $spacing-md;
  }
}

.ai-fab {
  width: 56px;
  height: 56px;
  border: none;
  border-radius: $radius-full;
  background: linear-gradient(135deg, $primary, $primary-dark);
  color: #fff;
  box-shadow: $shadow-lg;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1),
    box-shadow 0.25s ease;

  &:hover {
    transform: scale(1.1);
    box-shadow: $shadow-primary;
  }

  &:active {
    transform: scale(0.96);
  }
}

.ai-panel {
  width: 360px;
  height: 480px;
  max-width: calc(100vw - 32px);
  max-height: calc(100vh - 120px);
  display: flex;
  flex-direction: column;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: $radius-lg;
  box-shadow: $shadow-lg;
  overflow: hidden;
}

.ai-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $spacing-sm;
  padding: $spacing-md;
  border-bottom: 1px solid rgba($border-color, 0.8);
  background: rgba(255, 255, 255, 0.45);
}

.ai-panel__brand {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  min-width: 0;
}

.ai-panel__title {
  font-size: $font-size-lg;
  font-weight: 700;
  color: $text-primary;
  line-height: 1.2;
}

.ai-panel__status {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 2px;
  font-size: $font-size-sm;
  color: $text-muted;
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: $radius-full;
  background: $success;
  box-shadow: 0 0 0 3px rgba($success, 0.18);
}

.ai-panel__actions {
  display: flex;
  align-items: center;
}

.icon-btn {
  color: $text-secondary !important;
  padding: 6px !important;

  &:hover {
    color: $primary !important;
  }
}

.ai-avatar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: $radius-full;
  background: linear-gradient(135deg, $primary, $primary-dark);
  color: #fff;

  &--lg {
    width: 40px;
    height: 40px;
    font-size: 22px;
  }

  &--sm {
    width: 28px;
    height: 28px;
    font-size: 15px;
    margin-top: 2px;
  }
}

.ai-panel__messages {
  flex: 1;
  overflow-y: auto;
  padding: $spacing-md;
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
}

.ai-msg {
  display: flex;
  gap: $spacing-sm;
  max-width: 100%;

  &.is-user {
    flex-direction: row-reverse;

    .ai-bubble {
      background: $primary;
      color: #fff;
      border-bottom-right-radius: 4px;
    }

    .ai-msg__time {
      text-align: right;
    }
  }

  &.is-assistant {
    .ai-bubble {
      background: $bg-body;
      color: $text-primary;
      border-bottom-left-radius: 4px;
    }
  }
}

.ai-msg__body {
  max-width: calc(100% - 40px);
  min-width: 0;
}

.ai-bubble {
  padding: 10px 12px;
  border-radius: $radius-md;
  font-size: $font-size-base;
  line-height: 1.55;
  word-break: break-word;
  box-shadow: $shadow-sm;
}

.ai-msg__time {
  margin-top: 4px;
  font-size: 11px;
  color: $text-muted;
}

.ai-bubble--typing {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-width: 52px;
  padding: 12px 14px;

  span {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: $text-muted;
    animation: typingBounce 1.1s infinite ease-in-out;

    &:nth-child(2) { animation-delay: 0.15s; }
    &:nth-child(3) { animation-delay: 0.3s; }
  }
}

@keyframes typingBounce {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.45; }
  30% { transform: translateY(-4px); opacity: 1; }
}

.ai-panel__footer {
  display: flex;
  gap: $spacing-sm;
  align-items: flex-end;
  padding: $spacing-md;
  border-top: 1px solid rgba($border-color, 0.8);
  background: rgba(255, 255, 255, 0.5);

  :deep(.el-textarea__inner) {
    border-radius: $radius-md;
    box-shadow: 0 0 0 1px $border-color inset;
    background: rgba(255, 255, 255, 0.9);
  }
}

.send-btn {
  flex-shrink: 0;
  height: 52px !important;
  padding: 0 16px !important;
}

.ai-panel-enter-active,
.ai-panel-leave-active {
  transition: opacity 0.25s ease, transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.ai-panel-enter-from,
.ai-panel-leave-to {
  opacity: 0;
  transform: translateY(12px) scale(0.96);
}

@media (prefers-reduced-motion: reduce) {
  .ai-fab:hover { transform: none; }
  .ai-panel-enter-active,
  .ai-panel-leave-active { transition: none; }
}
</style>
