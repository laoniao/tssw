<template>
  <div class="page-container">
    <div class="page-header">
      <div>
        <h1 class="page-title">比赛管理</h1>
        <p class="page-subtitle">发布、编辑或下架比赛，并配置参赛队伍与带队老师</p>
      </div>
      <el-button type="primary" @click="openPublishDialog()">
        <el-icon><Plus /></el-icon>
        发布新比赛
      </el-button>
    </div>

    <div class="filter-bar">
      <el-input v-model="searchKey" placeholder="搜索比赛..." prefix-icon="Search" clearable class="filter-input-md" />
      <el-select v-model="filterStatus" placeholder="状态筛选" clearable class="filter-select-sm">
        <el-option label="报名中" value="报名中" />
        <el-option label="进行中" value="进行中" />
        <el-option label="已结束" value="已结束" />
      </el-select>
      <el-select v-model="filterCategory" placeholder="类别筛选" clearable class="filter-select-sm">
        <el-option v-for="c in categories" :key="c" :label="c" :value="c" />
      </el-select>
    </div>

    <div v-if="loading" class="loading-grid">
      <div v-for="i in 4" :key="i" class="skeleton-card">
        <div class="skeleton" style="height:140px;border-radius:14px 14px 0 0"></div>
        <div style="padding:16px">
          <div class="skeleton" style="height:20px;width:60%;margin-bottom:8px"></div>
          <div class="skeleton" style="height:14px;width:80%"></div>
        </div>
      </div>
    </div>

    <div v-else class="comps-table-view">
      <div v-for="comp in filteredComps" :key="comp.id" class="comp-manage-card card">
        <div class="cmc-left">
          <div class="cmc-cover" :style="getCoverStyle(comp.id)">
            <el-icon size="24" color="white"><Trophy /></el-icon>
          </div>
          <div class="cmc-info">
            <div class="cmc-name card-title">{{ comp.name }}</div>
            <div class="cmc-meta">
              <el-tag :type="getStatusType(comp.status)" size="small">{{ comp.status }}</el-tag>
              <el-tag type="info" size="small">{{ comp.category }}</el-tag>
              <span class="meta-txt"><el-icon><Calendar /></el-icon> {{ formatDate(comp.startTime) }} ~ {{ formatDate(comp.endTime) }}</span>
            </div>
            <div class="cmc-progress">
              <div class="prog-mini">
                <div class="prog-fill" :style="`width:${Math.min(((comp.teamCount || 0)/(comp.maxTeams || 40))*100,100)}%`"></div>
              </div>
              <span class="prog-txt">{{ comp.teamCount || 0 }}/{{ comp.maxTeams || 40 }} 队 · 带队老师上限 {{ comp.maxLeadTeachers || 1 }}</span>
            </div>
            <div class="cmc-teachers" v-if="comp.teachers?.length">
              可带队：{{ comp.teachers.map(t => t.name).join('、') }}
            </div>
          </div>
        </div>

        <div class="cmc-actions">
          <el-button size="small" @click="openPublishDialog(comp)">
            <el-icon><Edit /></el-icon> 编辑
          </el-button>
          <el-button
            size="small"
            :type="comp.status === '已结束' ? 'success' : 'warning'"
            @click="toggleStatus(comp)"
          >
            {{ comp.status === '已结束' ? '重新发布' : '下架' }}
          </el-button>
          <el-button size="small" type="danger" plain @click="deleteComp(comp)">
            <el-icon><Delete /></el-icon>
          </el-button>
        </div>
      </div>

      <div v-if="filteredComps.length === 0" class="empty-state">
        <el-icon class="empty-icon" size="56"><Trophy /></el-icon>
        <div class="empty-title">还没有发布任何比赛</div>
        <el-button type="primary" class="mt-md" @click="openPublishDialog()">立即发布</el-button>
      </div>
    </div>

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑比赛' : '发布新比赛'" width="680px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="130px">
        <el-form-item label="比赛名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入比赛名称" maxlength="30" show-word-limit />
        </el-form-item>
        <el-form-item label="比赛类别" prop="category">
          <el-select v-model="form.category" placeholder="选择类别" class="w-full">
            <el-option v-for="c in categories" :key="c" :label="c" :value="c" />
          </el-select>
        </el-form-item>
        <el-form-item label="报名时间" prop="dateRange">
          <el-date-picker
            v-model="form.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            class="w-full"
          />
        </el-form-item>
        <el-form-item label="最大报名人数" prop="maxParticipants">
          <el-input-number v-model="form.maxParticipants" :min="10" :max="2000" :step="10" />
        </el-form-item>
        <el-form-item label="参赛队伍数量" prop="maxTeams">
          <el-input-number v-model="form.maxTeams" :min="1" :max="500" :step="1" />
          <span class="field-hint">本场比赛最多可录取的队伍数</span>
        </el-form-item>
        <el-form-item label="每队带队老师上限" prop="maxLeadTeachers">
          <el-input-number v-model="form.maxLeadTeachers" :min="1" :max="5" :step="1" />
          <span class="field-hint">一支队伍最多可设带队老师数量</span>
        </el-form-item>
        <el-form-item label="可选带队老师" prop="teacherIds">
          <el-select
            v-model="form.teacherIds"
            multiple
            filterable
            placeholder="选择本场比赛可由哪些带队老师带领"
            class="w-full"
          >
            <el-option
              v-for="t in leaderTeachers"
              :key="t.id"
              :label="`${t.name}${t.department ? ' · ' + t.department : ''}`"
              :value="t.id"
            />
          </el-select>
          <div class="field-hint block">仅管理员可配置；带队老师本人不能自行选择可带领的比赛</div>
        </el-form-item>
        <el-form-item label="比赛简介" prop="description">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="4"
            placeholder="请输入比赛简介..."
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="参赛规则">
          <el-input
            v-model="form.rules"
            type="textarea"
            :rows="3"
            placeholder="参赛须知、评分标准等..."
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">
          {{ isEdit ? '保存修改' : '立即发布' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getTeacherCompetitions,
  publishCompetition,
  editCompetition,
  offlineCompetition,
  deleteCompetition,
  getLeaderTeachers,
} from '@/api'
import { getCoverStyle } from '@/utils/avatarStyles'

const loading = ref(true)
const allComps = ref([])
const leaderTeachers = ref([])
const searchKey = ref('')
const filterStatus = ref('')
const filterCategory = ref('')
const categories = ['创新类', '技能类', '学术类', '设计类']

const dialogVisible = ref(false)
const isEdit = ref(false)
const submitting = ref(false)
const formRef = ref()

const emptyForm = () => ({
  name: '',
  category: '',
  dateRange: null,
  maxParticipants: 100,
  maxTeams: 40,
  maxLeadTeachers: 1,
  teacherIds: [],
  description: '',
  rules: '',
})

const form = ref(emptyForm())

const rules = {
  name: [{ required: true, message: '请输入比赛名称' }],
  category: [{ required: true, message: '请选择类别' }],
  description: [{ required: true, message: '请输入简介' }],
  maxTeams: [{ required: true, message: '请设置参赛队伍数量' }],
  maxLeadTeachers: [{ required: true, message: '请设置每队带队老师上限' }],
  teacherIds: [{ required: true, type: 'array', min: 1, message: '请至少选择一位带队老师' }],
}

const fetchList = async () => {
  loading.value = true
  try {
    const res = await getTeacherCompetitions()
    allComps.value = res.data?.list || []
  } finally {
    loading.value = false
  }
}

const fetchLeaders = async () => {
  const res = await getLeaderTeachers()
  leaderTeachers.value = res.data?.list || []
}

onMounted(async () => {
  await Promise.all([fetchList(), fetchLeaders()])
})

const filteredComps = computed(() => {
  return allComps.value.filter(c => {
    const keyOk = !searchKey.value || c.name.includes(searchKey.value)
    const statOk = !filterStatus.value || c.status === filterStatus.value
    const catOk = !filterCategory.value || c.category === filterCategory.value
    return keyOk && statOk && catOk
  })
})

const openPublishDialog = (comp = null) => {
  isEdit.value = !!comp
  if (comp) {
    form.value = {
      ...comp,
      dateRange: [comp.startTime, comp.endTime],
      rules: comp.rules || '',
      maxTeams: comp.maxTeams || 40,
      maxLeadTeachers: comp.maxLeadTeachers || 1,
      teacherIds: (comp.teachers || []).map((t) => t.id),
    }
  } else {
    form.value = emptyForm()
  }
  dialogVisible.value = true
}

const buildTeachersPayload = () => {
  const ids = form.value.teacherIds || []
  return ids
    .map((id) => leaderTeachers.value.find((t) => String(t.id) === String(id)))
    .filter(Boolean)
    .map((t) => ({
      id: t.id,
      name: t.name,
      title: t.title || '带队教师',
      department: t.department || '',
      avatar: t.avatar,
      maxStudents: t.maxStudents || 20,
      currentStudents: t.currentStudents || 0,
    }))
}

const handleSubmit = async () => {
  if (formRef.value) {
    try { await formRef.value.validate() } catch { return }
  }
  submitting.value = true
  try {
    const payload = {
      ...form.value,
      startTime: form.value.dateRange?.[0],
      endTime: form.value.dateRange?.[1],
      teachers: buildTeachersPayload(),
    }
    delete payload.teacherIds
    delete payload.dateRange
    if (isEdit.value) {
      await editCompetition(form.value.id, payload)
      ElMessage.success('比赛信息已更新')
    } else {
      await publishCompetition(payload)
      ElMessage.success('比赛发布成功！')
    }
    dialogVisible.value = false
    await fetchList()
  } finally {
    submitting.value = false
  }
}

const toggleStatus = async (comp) => {
  const action = comp.status === '已结束' ? '重新发布' : '下架'
  await ElMessageBox.confirm(`确定要${action}「${comp.name}」吗？`, '确认操作', { type: 'warning' })
  await offlineCompetition(comp.id)
  ElMessage.success(`已${action}`)
  await fetchList()
}

const deleteComp = async (comp) => {
  await ElMessageBox.confirm(`确定要删除「${comp.name}」吗？此操作不可恢复`, '删除确认', { type: 'danger' })
  await deleteCompetition(comp.id)
  ElMessage.success('已删除')
  await fetchList()
}

const formatDate = (dt) => String(dt || '').slice(0, 10)
const getStatusType = (s) => ({ '报名中': 'success', '进行中': 'warning', '已结束': 'info' }[s] || 'info')
</script>

<style scoped lang="scss">
.loading-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: $spacing-lg;
}

.comps-table-view {
  display: flex;
  flex-direction: column;
  gap: $spacing-lg;
}

.comp-manage-card {
  display: flex;
  align-items: center;
  gap: $spacing-lg;
  padding: 18px 22px;

  &:hover { border-color: color-mix(in srgb, $primary 30%, $border-color); }

  @media (max-width: $breakpoint-md) {
    flex-direction: column;
    align-items: stretch;

    .cmc-actions {
      width: 100%;
      justify-content: flex-end;
      flex-wrap: wrap;
    }
  }
}

.cmc-left {
  display: flex;
  align-items: center;
  gap: $spacing-md;
  flex: 1;
  min-width: 0;
}

.cmc-cover {
  width: 60px; height: 60px;
  border-radius: $radius-lg;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}

.cmc-info {
  flex: 1;
  min-width: 0;

  .cmc-name { margin-bottom: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  .cmc-meta {
    display: flex; align-items: center; gap: $spacing-sm; margin-bottom: $spacing-sm; flex-wrap: wrap;

    .meta-txt { display: flex; align-items: center; gap: $spacing-xs; font-size: $font-size-sm; color: $text-muted; }
  }
}

.cmc-progress {
  display: flex; align-items: center; gap: $spacing-sm;

  .prog-mini {
    width: 100px; height: 4px;
    background: $bg-body; border-radius: 2px; overflow: hidden;

    .prog-fill {
      height: 100%;
      background: linear-gradient(90deg, $primary, $primary-dark);
      border-radius: 2px;
      transition: width 0.4s;
    }
  }

  .prog-txt { font-size: 11px; color: $text-muted; white-space: nowrap; }
}

.cmc-teachers {
  margin-top: 6px;
  font-size: 12px;
  color: $text-secondary;
}

.cmc-actions {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  flex-shrink: 0;
}

.field-hint {
  margin-left: 10px;
  font-size: 12px;
  color: $text-muted;

  &.block {
    display: block;
    margin-left: 0;
    margin-top: 6px;
  }
}
</style>
