<template>
  <div class="page-container">
    <div class="page-header">
      <div>
        <h1 class="page-title">公告与资源</h1>
        <p class="page-subtitle">发布比赛通知，管理下载资源</p>
      </div>
      <div class="header-btns">
        <el-button type="primary" @click="openAnnoDialog()">
          <el-icon><Bell /></el-icon>
          发布公告
        </el-button>
        <el-button @click="showResourceDialog = true">
          <el-icon><FolderAdd /></el-icon>
          上传资源
        </el-button>
      </div>
    </div>

    <el-tabs v-model="activeTab" class="anno-tabs">
      <el-tab-pane name="announcements">
        <template #label>
          <span class="tab-label-inner"><el-icon><Bell /></el-icon> 公告管理</span>
        </template>

        <div class="anno-list">
          <div
            v-for="anno in filteredAnnouncements"
            :key="anno.id"
            class="anno-card card fade-in-up"
            :class="{ top: anno.isTop }"
          >
            <div v-if="anno.isTop" class="top-ribbon">置顶</div>

            <div class="anno-header">
              <div class="anno-title-row">
                <h3 class="card-title">{{ anno.title }}</h3>
                <el-tag :type="getAnnoTypeTag(anno.type)" size="small">{{ anno.type }}</el-tag>
              </div>
              <span class="anno-date">
                <el-icon><Clock /></el-icon>
                {{ formatDate(anno.createdAt) }}
              </span>
            </div>
            <p class="anno-content">{{ anno.content }}</p>
            <div class="anno-actions">
              <el-button size="small" text @click="editAnno(anno)">
                <el-icon><Edit /></el-icon> 编辑
              </el-button>
              <el-button size="small" text type="danger" @click="deleteAnno(anno.id)">
                <el-icon><Delete /></el-icon> 删除
              </el-button>
            </div>
          </div>

          <div v-if="filteredAnnouncements.length === 0" class="empty-state">
            <el-icon size="48" class="empty-icon"><Bell /></el-icon>
            <div class="empty-title">暂无公告</div>
            <el-button type="primary" class="mt-md" @click="openAnnoDialog()">发布第一条</el-button>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane name="resources">
        <template #label>
          <span class="tab-label-inner"><el-icon><FolderOpened /></el-icon> 资源管理</span>
        </template>

        <div class="resource-toolbar">
          <el-button type="primary" @click="showResourceDialog = true">
            <el-icon><Upload /></el-icon>
            上传资源
          </el-button>
          <el-button :loading="resLoading" @click="loadResources">刷新</el-button>
        </div>

        <div class="resources-list" v-loading="resLoading">
          <div v-for="res in resourceList" :key="res.id" class="resource-card card fade-in-up">
            <div class="res-icon" :style="getResIconStyle(res.type)">
              <el-icon size="20"><Document /></el-icon>
            </div>
            <div class="res-info">
              <div class="res-name">{{ res.name }}</div>
              <div class="res-desc" v-if="res.description">{{ res.description }}</div>
              <div class="res-meta">
                <el-tag :type="getResTagType(res.type)" size="small">{{ res.type }}</el-tag>
                <span>{{ res.size || formatFileSize(res.fileSize) }}</span>
                <span><el-icon><Download /></el-icon> {{ res.downloadCount }} 次</span>
                <span>{{ formatDate(res.uploadTime) }}</span>
              </div>
            </div>
            <div class="res-actions">
              <el-tooltip content="下载">
                <el-button size="small" text type="primary" :loading="downloadingId === res.id" @click="downloadRes(res)">
                  <el-icon><Download /></el-icon>
                </el-button>
              </el-tooltip>
              <el-button size="small" text type="danger" @click="deleteRes(res.id)">
                <el-icon><Delete /></el-icon>
              </el-button>
            </div>
          </div>

          <div v-if="!resLoading && resourceList.length === 0" class="empty-state">
            <el-icon size="48" class="empty-icon"><FolderOpened /></el-icon>
            <div class="empty-title">暂无资源</div>
            <el-button type="primary" class="mt-md" @click="showResourceDialog = true">上传资源</el-button>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>

    <el-dialog v-model="showAnnoDialog" :title="isEditing ? '编辑公告' : '发布公告'" width="560px" destroy-on-close>
      <el-form :model="annoForm" :rules="annoRules" ref="annoFormRef" label-width="90px">
        <el-form-item label="公告标题" prop="title">
          <el-input v-model="annoForm.title" placeholder="请输入公告标题" maxlength="50" show-word-limit />
        </el-form-item>
        <el-form-item label="公告类型" prop="type">
          <el-select v-model="annoForm.type" class="w-full">
            <el-option label="比赛通知" value="比赛通知" />
            <el-option label="系统公告" value="系统公告" />
            <el-option label="资源更新" value="资源更新" />
          </el-select>
        </el-form-item>
        <el-form-item label="置顶">
          <el-switch v-model="annoForm.isTop" />
        </el-form-item>
        <el-form-item label="公告内容" prop="content">
          <el-input
            v-model="annoForm.content"
            type="textarea"
            :rows="6"
            placeholder="请输入公告内容..."
            maxlength="1000"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAnnoDialog = false">取消</el-button>
        <el-button type="primary" :loading="annoSubmitting" @click="handleAnnoSubmit">
          {{ isEditing ? '保存' : '发布公告' }}
        </el-button>
      </template>
    </el-dialog>

    <ResourceUpload v-model="showResourceDialog" @success="onUploadSuccess" />
  </div>
</template>

<script setup>
import { ElMessage, ElMessageBox } from 'element-plus'
import { getAnnouncements, publishAnnouncement, editAnnouncement, deleteAnnouncement } from '@/api'
import { getList, download, remove } from '@/api/resource'
import ResourceUpload from './components/ResourceUpload.vue'

const activeTab = ref('announcements')

const announcements = ref([])
const showAnnoDialog = ref(false)
const isEditing = ref(false)
const annoSubmitting = ref(false)
const annoFormRef = ref()
const annoForm = reactive({ id: '', title: '', type: '比赛通知', content: '', isTop: false })
const annoRules = {
  title: [{ required: true, message: '请输入公告标题' }],
  type: [{ required: true, message: '请选择公告类型' }],
  content: [{ required: true, message: '请输入公告内容' }],
}

const resourceList = ref([])
const showResourceDialog = ref(false)
const resLoading = ref(false)
const downloadingId = ref(null)

const loadAnnouncements = async () => {
  const annoRes = await getAnnouncements()
  const data = annoRes.data?.list
  announcements.value = Array.isArray(data) ? data : (data?.list || [])
}

const loadResources = async () => {
  resLoading.value = true
  try {
    const resRes = await getList()
    const data = resRes.data?.list
    resourceList.value = Array.isArray(data) ? data : (data?.list || [])
  } finally {
    resLoading.value = false
  }
}

onMounted(async () => {
  await Promise.all([loadAnnouncements(), loadResources()])
})

const filteredAnnouncements = computed(() => {
  return [...announcements.value].sort((a, b) => {
    if (a.isTop && !b.isTop) return -1
    if (!a.isTop && b.isTop) return 1
    return String(b.createdAt || '').localeCompare(String(a.createdAt || ''))
  })
})

const openAnnoDialog = () => {
  isEditing.value = false
  Object.assign(annoForm, { id: '', title: '', type: '比赛通知', content: '', isTop: false })
  showAnnoDialog.value = true
}

const editAnno = (anno) => {
  isEditing.value = true
  Object.assign(annoForm, {
    id: anno.id,
    title: anno.title,
    type: anno.type,
    content: anno.content,
    isTop: anno.isTop,
  })
  showAnnoDialog.value = true
}

const handleAnnoSubmit = async () => {
  try {
    await annoFormRef.value?.validate()
  } catch {
    return
  }
  annoSubmitting.value = true
  try {
    const { id, ...payload } = annoForm
    if (isEditing.value && id) {
      await editAnnouncement(id, payload)
      ElMessage.success('公告已保存')
    } else {
      await publishAnnouncement(payload)
      ElMessage.success('公告已发布')
    }
    showAnnoDialog.value = false
    await loadAnnouncements()
  } finally {
    annoSubmitting.value = false
  }
}

const deleteAnno = async (id) => {
  try {
    await ElMessageBox.confirm('确定删除这条公告吗？', '确认删除', { type: 'warning' })
  } catch {
    return
  }
  await deleteAnnouncement(id)
  await loadAnnouncements()
  ElMessage.success('已删除')
}

const onUploadSuccess = async () => {
  activeTab.value = 'resources'
  await loadResources()
}

const deleteRes = async (id) => {
  try {
    await ElMessageBox.confirm('确定删除这个资源吗？', '确认删除', { type: 'warning' })
  } catch {
    return
  }
  await remove(id)
  resourceList.value = resourceList.value.filter(r => r.id !== id)
  ElMessage.success('已删除')
}

const downloadRes = async (res) => {
  downloadingId.value = res.id
  try {
    const result = await download(res.id)
    const rawUrl = result.data?.url || ''
    res.downloadCount = result.data?.downloadCount ?? (res.downloadCount + 1)
    if (rawUrl) {
      // 本地文件走 download 接口，保证下载下来的是中文原始文件名
      const diskName = rawUrl.split('/').pop()
      const href = rawUrl.startsWith('/uploads/') && diskName
        ? `/api/files/download?file=${encodeURIComponent(diskName)}&name=${encodeURIComponent(result.data?.name || res.name)}`
        : rawUrl
      const a = document.createElement('a')
      a.href = href
      a.target = '_blank'
      a.rel = 'noopener'
      a.download = result.data?.name || res.name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    }
    ElMessage.success(`开始下载「${res.name}」`)
  } catch (e) {
    ElMessage.error(e.message || '下载失败')
  } finally {
    downloadingId.value = null
  }
}

const formatDate = (dt) => String(dt || '').slice(0, 10)
const formatFileSize = (bytes) => {
  if (!bytes) return '-'
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}
const getAnnoTypeTag = (t) => ({ '比赛通知': 'primary', '系统公告': 'success', '资源更新': 'warning' }[t] || 'info')
const getResTagType = (t) => ({ '文档': 'success', '压缩包': 'warning', '视频': 'danger', '课件': 'primary', '其他': 'info' }[t] || 'info')
const getResIconStyle = (t) => ({
  '文档': { background: 'rgba(22, 163, 74, 0.12)', color: '#16a34a' },
  '压缩包': { background: 'rgba(217, 119, 6, 0.12)', color: '#d97706' },
  '视频': { background: 'rgba(220, 38, 38, 0.12)', color: '#dc2626' },
  '课件': { background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb' },
  '其他': { background: '#f1f5f9', color: '#64748b' },
}[t] || { background: '#f1f5f9', color: '#64748b' })
</script>

<style scoped lang="scss">
.header-btns { display: flex; gap: $spacing-sm; }
.tab-label-inner { display: flex; align-items: center; gap: 6px; }
.anno-tabs { :deep(.el-tabs__header) { margin-bottom: 20px; } }

.anno-list { display: flex; flex-direction: column; gap: $spacing-lg; }

.anno-card {
  position: relative;
  overflow: hidden;
  padding: 20px $spacing-lg;

  &.top { border-color: color-mix(in srgb, $primary 30%, $border-color); border-left: 4px solid $primary; }
}

.top-ribbon {
  position: absolute;
  top: 10px; right: -28px;
  background: linear-gradient(135deg, $primary, $primary-dark);
  color: $bg-card;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 32px;
  transform: rotate(45deg);
  letter-spacing: 1px;
}

.anno-header {
  display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;
  .anno-title-row {
    display: flex; align-items: center; gap: 10px;
    .card-title { margin-bottom: 0; }
  }
  .anno-date {
    display: flex; align-items: center; gap: $spacing-xs;
    font-size: $font-size-sm; color: $text-muted; flex-shrink: 0;
  }
}

.anno-content {
  font-size: $font-size-base; color: $text-secondary; line-height: 1.7; margin-bottom: 12px;
}

.anno-actions {
  display: flex; gap: $spacing-sm; padding-top: 10px; border-top: 1px solid $bg-body;
}

.resource-toolbar {
  display: flex;
  gap: $spacing-sm;
  margin-bottom: $spacing-md;
}

.resources-list { display: flex; flex-direction: column; gap: $spacing-lg; min-height: 120px; }

.resource-card {
  display: flex; align-items: center; gap: 14px;
  padding: 14px 18px;

  &:hover { border-color: color-mix(in srgb, $primary 30%, $border-color); transform: translateX(2px); }
}

.res-icon {
  width: 44px; height: 44px;
  border-radius: $radius-lg;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}

.res-info {
  flex: 1; min-width: 0;
  .res-name { font-size: $font-size-base; font-weight: 600; color: $text-primary; margin-bottom: $spacing-xs; }
  .res-desc {
    font-size: $font-size-sm; color: $text-muted; margin-bottom: 6px;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .res-meta { display: flex; align-items: center; gap: 10px; font-size: $font-size-sm; color: $text-muted; flex-wrap: wrap; }
  span { display: flex; align-items: center; gap: $spacing-xs; }
}

.res-actions { display: flex; gap: $spacing-xs; flex-shrink: 0; }
</style>
