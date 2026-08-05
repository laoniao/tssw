<template>
  <el-dialog
    :model-value="visible"
    title="编辑个人资料"
    width="520px"
    destroy-on-close
    @update:model-value="emit('update:visible', $event)"
    @closed="handleClosed"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="80px"
      class="profile-edit-form"
    >
      <el-form-item label="头像">
        <el-upload
          class="avatar-uploader"
          action="/api/upload"
          :show-file-list="false"
          :on-success="handleUploadSuccess"
          :on-error="handleUploadError"
          :before-upload="beforeUpload"
          accept="image/*"
        >
          <img v-if="form.avatar" :src="form.avatar" class="avatar-preview" alt="头像" />
          <div v-else class="avatar-placeholder">
            <el-icon :size="28"><Plus /></el-icon>
            <span>上传头像</span>
          </div>
        </el-upload>
      </el-form-item>

      <el-form-item label="昵称" prop="nickname">
        <el-input v-model="form.nickname" placeholder="请输入昵称" maxlength="20" show-word-limit />
      </el-form-item>

      <el-form-item label="专业" prop="major">
        <el-select v-model="form.major" placeholder="请选择专业" class="w-full">
          <el-option v-for="m in majors" :key="m" :label="m" :value="m" />
        </el-select>
      </el-form-item>

      <el-form-item label="简介" prop="bio">
        <el-input
          v-model="form.bio"
          type="textarea"
          :rows="4"
          placeholder="介绍一下自己吧"
          maxlength="200"
          show-word-limit
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="emit('update:visible', false)">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { update as updateProfileApi, getMajors } from '@/api/profile'
import { useUserStore } from '@/store/user'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  initialData: {
    type: Object,
    default: () => ({}),
  },
})

const emit = defineEmits(['update:visible', 'success'])

const userStore = useUserStore()
const formRef = ref(null)
const submitting = ref(false)
const majors = ref([
  '计算机科学与技术',
  '人工智能',
  '建筑电气与智能化',
  '自动化',
  '电气工程及其自动化',
])

const form = reactive({
  avatar: '',
  nickname: '',
  major: '',
  bio: '',
})

const rules = {
  nickname: [{ required: true, message: '请输入昵称', trigger: 'blur' }],
  major: [{ required: true, message: '请选择专业', trigger: 'change' }],
}

const fillForm = (data = {}) => {
  form.avatar = data.avatar || ''
  form.nickname = data.nickname || data.username || ''
  form.major = data.major || ''
  form.bio = data.bio || ''
}

watch(
  () => props.visible,
  async (val) => {
    if (val) {
      fillForm(props.initialData)
      try {
        const res = await getMajors()
        if (res.data?.list?.length) {
          majors.value = res.data.list
        }
      } catch {
        // 使用本地默认专业列表
      }
    }
  }
)

const beforeUpload = (file) => {
  const isImage = file.type.startsWith('image/')
  const isLt2M = file.size / 1024 / 1024 < 2
  if (!isImage) {
    ElMessage.error('只能上传图片文件')
    return false
  }
  if (!isLt2M) {
    ElMessage.error('头像大小不能超过 2MB')
    return false
  }
  return true
}

const handleUploadSuccess = (response) => {
  const url = response?.data?.url
  if (url) {
    form.avatar = url
    ElMessage.success('头像上传成功')
  } else {
    ElMessage.error('上传失败，请重试')
  }
}

const handleUploadError = () => {
  ElMessage.error('头像上传失败')
}

const handleSubmit = async () => {
  if (!formRef.value) return
  try {
    await formRef.value.validate()
  } catch {
    return
  }

  submitting.value = true
  try {
    const payload = {
      avatar: form.avatar,
      nickname: form.nickname,
      major: form.major,
      bio: form.bio,
    }
    const res = await updateProfileApi(payload)
    const data = res.data || payload
    userStore.updateProfile(data)
    ElMessage.success(res.message || '资料已更新')
    emit('success', data)
    emit('update:visible', false)
  } catch {
    // 错误由 request 拦截器提示
  } finally {
    submitting.value = false
  }
}

const handleClosed = () => {
  formRef.value?.resetFields?.()
}
</script>

<style scoped lang="scss">
.profile-edit-form {
  padding-right: 8px;
}

.avatar-uploader {
  :deep(.el-upload) {
    border: 1px dashed $border-color;
    border-radius: 50%;
    cursor: pointer;
    overflow: hidden;
    transition: border-color 0.2s;

    &:hover {
      border-color: $primary;
    }
  }
}

.avatar-preview {
  width: 96px;
  height: 96px;
  display: block;
  object-fit: cover;
  border-radius: 50%;
}

.avatar-placeholder {
  width: 96px;
  height: 96px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  color: $text-muted;
  font-size: 12px;
  background: $bg-body;
}
</style>
