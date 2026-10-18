<template>
  <el-dialog
    :model-value="modelValue"
    title="上传资源"
    width="520px"
    destroy-on-close
    @update:model-value="emit('update:modelValue', $event)"
    @closed="resetForm"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
      <el-form-item label="选择文件" prop="fileName" required>
        <el-upload
          class="resource-uploader w-full"
          drag
          :limit="1"
          :http-request="customUpload"
          :show-file-list="true"
          :on-remove="handleRemove"
          :on-exceed="() => ElMessage.warning('一次只能上传一个文件')"
          accept=".pdf,.doc,.docx,.ppt,.pptx,.zip,.rar,.mp4,.png,.jpg"
        >
          <el-icon class="el-icon--upload" size="40"><UploadFilled /></el-icon>
          <div class="el-upload__text">将文件拖到此处，或 <em>点击选择</em></div>
          <template #tip>
            <div class="el-upload__tip">支持 PDF / DOC / ZIP / PPT / 视频等，单文件不超过 50MB</div>
          </template>
        </el-upload>
      </el-form-item>

      <el-form-item v-if="progressVisible" label="上传进度">
        <el-progress :percentage="progress" :status="progress >= 100 ? 'success' : undefined" class="w-full" />
      </el-form-item>

      <el-form-item label="资源名称" prop="name">
        <el-input v-model="form.name" placeholder="请输入资源名称" maxlength="60" show-word-limit />
      </el-form-item>

      <el-form-item label="分类" prop="type">
        <el-select v-model="form.type" placeholder="请选择分类" class="w-full">
          <el-option v-for="c in categories" :key="c" :label="c" :value="c" />
        </el-select>
      </el-form-item>

      <el-form-item label="描述">
        <el-input
          v-model="form.description"
          type="textarea"
          :rows="3"
          placeholder="可选，补充资源说明"
          maxlength="200"
          show-word-limit
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" :loading="submitting" :disabled="progressVisible && progress < 100" @click="handleSubmit">
        确认上传
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ElMessage } from 'element-plus'
import { upload } from '@/api/resource'
import { uploadFile } from '@/api'

defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:modelValue', 'success'])

const categories = ['文档', '压缩包', '视频', '课件', '其他']

const formRef = ref()
const submitting = ref(false)
const progress = ref(0)
const progressVisible = ref(false)
const selectedFile = ref(null)
const uploadTimer = ref(null)

const form = reactive({
  name: '',
  type: '文档',
  description: '',
  fileName: '',
  fileSize: 0,
  url: '',
})

const rules = {
  name: [{ required: true, message: '请输入资源名称', trigger: 'blur' }],
  type: [{ required: true, message: '请选择分类', trigger: 'change' }],
  fileName: [{ required: true, message: '请选择要上传的文件', trigger: 'change' }],
}

const guessType = (filename = '') => {
  const lower = filename.toLowerCase()
  if (/\.(zip|rar|7z)$/.test(lower)) return '压缩包'
  if (/\.(mp4|avi|mov|mkv)$/.test(lower)) return '视频'
  if (/\.(ppt|pptx)$/.test(lower)) return '课件'
  if (/\.(pdf|doc|docx|txt|xls|xlsx)$/.test(lower)) return '文档'
  return '其他'
}

const clearTimer = () => {
  if (uploadTimer.value) {
    clearInterval(uploadTimer.value)
    uploadTimer.value = null
  }
}

// 真正把文件上传到后端（此前只伪造进度条，文件从未落盘）
const customUpload = async (options) => {
  const file = options.file
  selectedFile.value = file
  form.fileName = file.name
  form.fileSize = file.size || 0
  if (!form.name) {
    form.name = file.name.replace(/\.[^.]+$/, '') || file.name
  }
  form.type = guessType(file.name)

  progressVisible.value = true
  progress.value = 0
  clearTimer()

  try {
    const res = await uploadFile(file, (p) => {
      progress.value = Math.min(100, p)
    })
    form.url = res.data?.url || ''
    if (!form.url) throw new Error('上传返回地址为空')
    progress.value = 100
    options.onSuccess?.({ name: file.name, url: form.url })
  } catch (e) {
    progress.value = 0
    progressVisible.value = false
    selectedFile.value = null
    form.fileName = ''
    form.fileSize = 0
    form.url = ''
    options.onError?.(e)
    ElMessage.error(e.message || '文件上传失败')
  }
}

const handleRemove = () => {
  clearTimer()
  selectedFile.value = null
  form.fileName = ''
  form.fileSize = 0
  form.url = ''
  progress.value = 0
  progressVisible.value = false
}

const resetForm = () => {
  clearTimer()
  selectedFile.value = null
  progress.value = 0
  progressVisible.value = false
  submitting.value = false
  Object.assign(form, {
    name: '',
    type: '文档',
    description: '',
    fileName: '',
    fileSize: 0,
    url: '',
  })
  formRef.value?.resetFields?.()
}

const handleSubmit = async () => {
  try {
    await formRef.value.validate()
  } catch {
    return
  }

  if (!form.fileName) {
    ElMessage.warning('请先选择文件')
    return
  }

  if (progressVisible.value && progress.value < 100) {
    ElMessage.warning('文件仍在上传中，请稍候')
    return
  }

  if (!form.url) {
    ElMessage.warning('文件尚未上传成功，请重新选择文件')
    return
  }

  submitting.value = true
  try {
    const res = await upload({
      name: form.name.includes('.') ? form.name : `${form.name}${guessExt(form.fileName)}`,
      description: form.description,
      type: form.type,
      category: form.type,
      fileSize: form.fileSize,
      fileName: form.fileName,
      url: form.url,
    })
    ElMessage.success('资源上传成功')
    emit('success', res.data)
    emit('update:modelValue', false)
  } finally {
    submitting.value = false
  }
}

const guessExt = (filename = '') => {
  const m = filename.match(/(\.[^.]+)$/)
  return m ? m[1] : ''
}

onBeforeUnmount(clearTimer)
</script>

<style scoped lang="scss">
.resource-uploader {
  :deep(.el-upload) {
    width: 100%;
  }

  :deep(.el-upload-dragger) {
    width: 100%;
    border-radius: $radius-lg;
  }
}
</style>
