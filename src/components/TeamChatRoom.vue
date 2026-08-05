<template>
  <el-dialog
    v-model="visible"
    :title="`${team?.name || ''} - 队伍聊天室`"
    width="560px"
    @open="onOpen"
    @closed="onClosed"
  >
    <div class="chat-room">
      <div ref="msgBox" class="chat-messages">
        <div
          v-for="(msg, i) in messages"
          :key="i"
          class="chat-msg"
          :class="isSelf(msg) ? 'self' : 'other'"
        >
          <div v-if="!isSelf(msg)" class="chat-avatar" :style="getAvatarStyle(msg.sender)">
            {{ (msg.sender || '?').charAt(0) }}
          </div>
          <div class="msg-bubble">
            <div v-if="!isSelf(msg)" class="msg-sender">{{ msg.sender }}</div>

            <!-- 文本 -->
            <div v-if="msg.type === 'text'" class="msg-content">{{ msg.content }}</div>

            <!-- 图片 -->
            <div v-else-if="msg.type === 'image'" class="msg-image-wrap">
              <el-image
                :src="msg.content"
                :preview-src-list="[msg.content]"
                fit="cover"
                class="msg-image"
              />
            </div>

            <!-- 文件 -->
            <div v-else-if="msg.type === 'file'" class="msg-file">
              <el-icon class="file-icon"><Document /></el-icon>
              <div class="file-info">
                <div class="file-name" :title="(msg.fileName || msg.content || '文件')">{{ msg.fileName || msg.content }}</div>
                <div class="file-size">{{ formatSize(msg.fileSize || 0) }}</div>
              </div>
              <a
                class="file-download"
                :href="msg.content"
                :download="msg.fileName"
                target="_blank"
                rel="noopener"
              >
                <el-icon><Download /></el-icon>
              </a>
            </div>

            <div class="msg-time">{{ msg.time }}</div>
          </div>
        </div>
      </div>

      <div class="chat-input-row">
        <el-tooltip content="发送图片" placement="top">
          <el-button class="attach-btn" @click="pickImage">
            <el-icon><Picture /></el-icon>
          </el-button>
        </el-tooltip>
        <el-tooltip content="发送文件" placement="top">
          <el-button class="attach-btn" @click="pickFile">
            <el-icon><Folder /></el-icon>
          </el-button>
        </el-tooltip>
        <el-input
          v-model="chatInput"
          placeholder="输入消息，Enter 发送"
          @keyup.enter="sendText"
        />
        <el-button type="primary" @click="sendText">发送</el-button>
      </div>
      <input ref="imageInput" type="file" accept="image/*" hidden @change="onImagePicked" />
      <input ref="fileInput" type="file" hidden @change="onFilePicked" />
    </div>
  </el-dialog>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { getAvatarStyle } from '@/utils/avatarStyles'
import { useUserStore } from '@/store/user'
import http from '@/utils/request'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  team: { type: Object, default: null },
})
const emit = defineEmits(['update:modelValue'])

const userStore = useUserStore()
const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const messages = ref([])
const chatInput = ref('')
const msgBox = ref(null)
const imageInput = ref(null)
const fileInput = ref(null)
const loading = ref(false)

const currentUserName = computed(
  () => userStore.profile?.nickname || userStore.userInfo?.username || '我',
)

const isSelf = (msg) => msg.sender === currentUserName.value

const onOpen = async () => {
  if (!props.team) return
  await loadTeamChat(props.team.id)
}

const onClosed = () => {
  messages.value = []
}

const scrollToBottom = async () => {
  await nextTick()
  if (msgBox.value) msgBox.value.scrollTop = msgBox.value.scrollHeight
}

const loadTeamChat = async (teamId) => {
  loading.value = true
  try {
    const res = await http.get(`/teams/${teamId}/messages`)
    messages.value = res.data.list || []
  } catch (e) {
    messages.value = []
  } finally {
    loading.value = false
    scrollToBottom()
  }
}

const sendMsg = async (payload) => {
  if (!props.team) return
  try {
    const res = await http.post(`/teams/${props.team.id}/messages`, payload)
    const msg = res.data.message
    messages.value.push({
      sender: msg.sender,
      type: msg.type,
      content: msg.content,
      fileUrl: msg.fileUrl,
      fileName: msg.fileName,
      fileSize: msg.fileSize,
      time: msg.time,
    })
    scrollToBottom()
  } catch (e) {
    ElMessage.error('发送失败，请稍后重试')
  }
}

const sendText = () => {
  const text = chatInput.value.trim()
  if (!text || !props.team) return
  sendMsg({ type: 'text', content: text })
  chatInput.value = ''
}

const pickImage = () => imageInput.value?.click()
const pickFile = () => fileInput.value?.click()

// 文件先上传到后端，拿到 URL 再发消息（所有人可访问，非本机）
const uploadAndSend = async (file, type) => {
  const formData = new FormData()
  formData.append('file', file)
  try {
    const res = await http.post('/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
    const { url, name, size } = res.data
    await sendMsg(type === 'image'
      ? { type: 'image', content: url }
      : { type: 'file', content: url, fileName: name, fileSize: size })
  } catch (e) {
    ElMessage.error('上传失败，请稍后重试')
  }
}

const onImagePicked = (e) => {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (!file) return
  if (file.size > 2 * 1024 * 1024) {
    ElMessage.warning('图片过大（上限 2MB），请压缩后再发送')
    return
  }
  uploadAndSend(file, 'image')
}

const onFilePicked = (e) => {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (!file) return
  if (file.size > 3 * 1024 * 1024) {
    ElMessage.warning('文件过大（上限 3MB），请选择更小的文件')
    return
  }
  uploadAndSend(file, 'file')
}

const formatSize = (bytes = 0) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
</script>

<style scoped lang="scss">
.chat-room {
  display: flex;
  flex-direction: column;
  height: 420px;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  background: $bg-body;
  border-radius: 12px;
  margin-bottom: 12px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.chat-msg {
  display: flex;
  gap: 10px;

  &.self {
    flex-direction: row-reverse;

    .msg-bubble {
      background: linear-gradient(135deg, $primary, $primary-dark);

      .msg-content { color: #fff; }
      .msg-sender { display: none; }
      .msg-time { color: rgba(255, 255, 255, 0.6); }
      .file-name, .file-size { color: #fff; }
      .file-icon, .file-download { color: #fff; }
    }
  }
}

.chat-avatar {
  width: 36px; height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  flex-shrink: 0;
  color: #fff;
}

.msg-bubble {
  max-width: 62%;
  background: $bg-card;
  border-radius: 12px;
  padding: 10px 14px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);

  .msg-sender { font-size: 11px; color: $text-muted; margin-bottom: 4px; }
  .msg-content { font-size: 14px; color: $text-primary; line-height: 1.5; white-space: pre-wrap; word-break: break-word; }
  .msg-time { font-size: 10px; color: $text-muted; margin-top: 4px; text-align: right; }
}

.msg-image {
  width: 180px;
  height: 130px;
  border-radius: 8px;
  display: block;
  cursor: zoom-in;
}

.msg-file {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 200px;

  .file-icon {
    font-size: 26px;
    color: $primary;
    flex-shrink: 0;
  }

  .file-info {
    flex: 1;
    min-width: 0;

    .file-name {
      font-size: 13px;
      font-weight: 600;
      color: $text-primary;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .file-size { font-size: 11px; color: $text-muted; }
  }

  .file-download {
    color: $primary;
    font-size: 18px;
    flex-shrink: 0;

    &:hover { opacity: 0.75; }
  }
}

.chat-input-row {
  display: flex;
  gap: $spacing-sm;
  align-items: center;

  .attach-btn {
    flex-shrink: 0;
    padding: 0 12px;
  }
}
</style>
