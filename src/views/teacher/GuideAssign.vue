<template>
  <div class="page-container">
    <div class="page-header">
      <div>
        <h1 class="page-title">指导分配</h1>
        <p class="page-subtitle">管理学生与指导教师的匹配关系</p>
      </div>
      <div class="header-stats-row">
        <span class="stat-pill blue">{{ unassignedStudents.length }} 待分配</span>
        <span class="stat-pill green">{{ assignedPairs.length }} 已分配</span>
      </div>
    </div>

    <div class="assign-layout">
      <!-- 左：待分配学生 -->
      <div class="assign-panel card">
        <div class="panel-title card-title">
          <el-icon><User /></el-icon>
          待分配学生
          <el-badge :value="unassignedStudents.length" type="danger" />
        </div>

        <div class="filter-mini">
          <el-input v-model="studentSearch" placeholder="搜索学生..." prefix-icon="Search" clearable size="small" class="w-full" />
        </div>

        <div class="student-queue">
          <div
            v-for="stu in filteredUnassigned"
            :key="stu.id"
            class="queue-item"
            :class="{ selected: selectedStudent === stu.id }"
            @click="selectedStudent = selectedStudent === stu.id ? null : stu.id"
          >
            <div class="qi-avatar" :style="getAvatarStyle(stu.student.name)">{{ stu.student.name.charAt(0) }}</div>
            <div class="qi-info">
              <div class="qi-name">{{ stu.student.name }}</div>
              <div class="qi-detail">{{ stu.student.major }} · {{ stu.student.grade }}</div>
              <div class="qi-comp">{{ stu.competition?.name }}</div>
            </div>
            <div v-if="selectedStudent === stu.id" class="qi-check">
              <el-icon><Check /></el-icon>
            </div>
          </div>

          <div v-if="filteredUnassigned.length === 0" class="panel-empty">
            <el-icon size="32"><UserFilled /></el-icon>
            <span>暂无待分配学生</span>
          </div>
        </div>
      </div>

      <!-- 中：分配按钮 -->
      <div class="assign-center">
        <div class="assign-arrow-box card">
          <div class="assign-arrow-icon">
            <el-icon size="20"><ArrowRight /></el-icon>
          </div>
          <div class="assign-hint">
            <div class="hint-step">1. 选择学生</div>
            <div class="hint-step">2. 选择导师</div>
            <div class="hint-step">3. 点击分配</div>
          </div>
          <el-button
            type="primary"
            class="assign-action-btn w-full"
            :disabled="!selectedStudent || !selectedTeacher"
            :loading="assigning"
            @click="handleAssign"
          >
            <el-icon><Connection /></el-icon>
            立即分配
          </el-button>
        </div>
      </div>

      <!-- 右：可用教师 -->
      <div class="assign-panel card">
        <div class="panel-title card-title">
          <el-icon><Avatar /></el-icon>
          指导教师
        </div>

        <div class="filter-mini">
          <el-input v-model="teacherSearch" placeholder="搜索教师..." prefix-icon="Search" clearable size="small" class="w-full" />
        </div>

        <div class="teacher-queue">
          <div
            v-for="t in filteredTeachers"
            :key="t.id"
            class="queue-item"
            :class="{ selected: selectedTeacher === t.id, full: t.currentStudents >= t.maxStudents }"
            @click="t.currentStudents < t.maxStudents && (selectedTeacher = selectedTeacher === t.id ? null : t.id)"
          >
            <div class="qi-avatar teacher-av" :style="getTeacherStyle(t.name)">{{ t.name.charAt(0) }}</div>
            <div class="qi-info">
              <div class="qi-name">{{ t.name }}</div>
              <div class="qi-detail">{{ t.title }} · {{ t.department }}</div>
              <div class="qi-capacity">
                <div class="cap-bar">
                  <div class="cap-fill" :style="`width:${Math.min((t.currentStudents/t.maxStudents)*100,100)}%`"></div>
                </div>
                <span class="cap-txt">{{ t.currentStudents }}/{{ t.maxStudents }}</span>
              </div>
            </div>
            <div v-if="t.currentStudents >= t.maxStudents" class="full-tag">已满</div>
            <div v-else-if="selectedTeacher === t.id" class="qi-check">
              <el-icon><Check /></el-icon>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 已分配记录 -->
    <div class="assigned-section card">
      <div class="section-title-row">
        <span class="sec-title card-title"><el-icon><Connection /></el-icon> 已分配记录</span>
        <span class="sec-count">{{ assignedPairs.length }} 条</span>
      </div>
      <el-table :data="assignedPairs" class="assigned-table">
        <el-table-column label="学生" min-width="140">
          <template #default="{ row }">
            <div class="pair-cell">
              <div class="pair-avatar" :style="getAvatarStyle(row.student.name)">{{ row.student.name.charAt(0) }}</div>
              <div>
                <div class="pair-name">{{ row.student.name }}</div>
                <div class="pair-detail">{{ row.student.major }}</div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="参加比赛" prop="competition.name" min-width="160" show-overflow-tooltip />
        <el-table-column label="指导教师" min-width="140">
          <template #default="{ row }">
            <div class="pair-cell">
              <div class="pair-avatar teacher-av" :style="getTeacherStyle(row.teacher?.name || 'T')">
                {{ (row.teacher?.name || 'T').charAt(0) }}
              </div>
              <span class="pair-name">{{ row.teacher?.name || '未分配' }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="状态">
          <template #default="{ row }">
            <el-tag :type="row.status === '已通过' ? 'success' : 'warning'" size="small">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getApplications, assignGuide, getGuideTeachers } from '@/api'
import { getAvatarStyle, getTeacherStyle } from '@/utils/avatarStyles'

const loading = ref(true)
const allApplications = ref([])
const studentSearch = ref('')
const teacherSearch = ref('')
const selectedStudent = ref(null)
const selectedTeacher = ref(null)
const assigning = ref(false)
const assignedPairs = ref([])

// 真实指导教师池（来自账号，currentStudents 由已分配记录统计）
const teachers = ref([])

onMounted(async () => {
  const [appRes, teacherRes] = await Promise.all([getApplications(), getGuideTeachers()])
  const raw = appRes.data?.list
  allApplications.value = Array.isArray(raw) ? raw : (raw?.list || [])
  teachers.value = teacherRes.data?.list || []
  // 已分配指导老师的展示在「已分配记录」
  assignedPairs.value = allApplications.value
    .filter(r => r.guideAssigned)
    .map(r => ({ ...r, teacher: teachers.value.find(t => String(t.id) === String(r.teacherId)) || null }))
  loading.value = false
})

const unassignedStudents = computed(() =>
  allApplications.value.filter(r => !r.guideAssigned)
)

const filteredUnassigned = computed(() =>
  unassignedStudents.value.filter(r =>
    !studentSearch.value || r.student.name.includes(studentSearch.value)
  )
)

const filteredTeachers = computed(() =>
  teachers.value.filter(t =>
    !teacherSearch.value || t.name.includes(teacherSearch.value)
  )
)

const handleAssign = async () => {
  assigning.value = true
  try {
    const student = allApplications.value.find(r => r.id === selectedStudent.value)
    const teacher = teachers.value.find(t => t.id === selectedTeacher.value)
    if (!student || !teacher) return
    await assignGuide({ applicationId: student.id, teacherId: teacher.id })

    // 更新本地状态并写入「已分配记录」
    student.guideAssigned = true
    student.teacherId = teacher.id
    if (teacher.currentStudents < teacher.maxStudents) teacher.currentStudents++
    assignedPairs.value.push({ ...student, teacher })

    selectedStudent.value = null
    selectedTeacher.value = null
    ElMessage.success(`已将 ${student.student.name} 分配给 ${teacher.name}`)
  } finally {
    assigning.value = false
  }
}
</script>

<style scoped lang="scss">
.header-stats-row {
  display: flex; gap: $spacing-sm;
  .stat-pill {
    padding: $spacing-xs 14px; border-radius: $radius-full; font-size: $font-size-sm; font-weight: 600;
    &.blue  { background: $primary-bg; color: $primary; }
    &.green { background: $success-bg; color: $success; }
  }
}

.assign-layout {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: $spacing-lg;
  align-items: start;
  margin-bottom: $spacing-xl;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
    .assign-center { display: none; }
  }
}

.assign-panel {
  padding: 18px;

  .panel-title { margin-bottom: 14px; }
}

.filter-mini { margin-bottom: 14px; }

.student-queue, .teacher-queue {
  max-height: 440px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
}

.queue-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: $radius-lg;
  border: 1.5px solid $border-color;
  cursor: pointer;
  transition: $transition-fast;
  position: relative;

  &:hover:not(.full) { border-color: $primary; background: $bg-body; }
  &.selected { border-color: $primary; background: $primary-bg; }
  &.full { opacity: 0.5; cursor: not-allowed; }
}

.qi-avatar {
  width: 38px; height: 38px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: $font-size-base; font-weight: 700; flex-shrink: 0;

  &.teacher-av { border-radius: 10px; }
}

.qi-info {
  flex: 1; min-width: 0;
  .qi-name { font-size: $font-size-sm; font-weight: 600; color: $text-primary; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .qi-detail { font-size: 11px; color: $text-muted; }
  .qi-comp { font-size: 11px; color: $primary; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
}

.qi-capacity {
  display: flex; align-items: center; gap: 6px; margin-top: $spacing-xs;
  .cap-bar { width: 60px; height: 3px; background: $bg-body; border-radius: 2px; overflow: hidden;
    .cap-fill { height: 100%; background: linear-gradient(90deg,$primary,$primary-dark); border-radius: 2px; }
  }
  .cap-txt { font-size: 10px; color: $text-muted; }
}

.qi-check {
  width: 22px; height: 22px; border-radius: 50%;
  background: $primary; color: $bg-card;
  display: flex; align-items: center; justify-content: center;
  font-size: $font-size-sm; flex-shrink: 0;
}

.full-tag {
  font-size: 11px; color: $text-muted; padding: 2px 6px;
  background: $bg-body; border-radius: 6px; flex-shrink: 0;
}

.panel-empty {
  display: flex; flex-direction: column; align-items: center; gap: $spacing-sm;
  padding: 40px; color: $text-muted; font-size: $font-size-base;
}

.assign-center {
  display: flex;
  align-items: center;
  justify-content: center;
}

.assign-arrow-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 20px;
  width: 120px;
}

.assign-arrow-icon {
  width: 44px; height: 44px;
  border-radius: 50%;
  background: linear-gradient(135deg, $primary, $primary-dark);
  color: $bg-card;
  display: flex; align-items: center; justify-content: center;
}

.hint-step {
  font-size: 11px;
  color: $text-muted;
  text-align: center;
  line-height: 1.6;
  background: $bg-body;
  padding: 2px $spacing-sm;
  border-radius: 6px;
  width: 100%;
}

.assigned-section {
  padding: 20px;
}

.section-title-row {
  display: flex; align-items: center; justify-content: space-between; margin-bottom: $spacing-md;

  .sec-count { font-size: $font-size-sm; color: $text-muted; background: $bg-body; padding: 2px 10px; border-radius: $radius-full; }
}

.pair-cell {
  display: flex; align-items: center; gap: $spacing-sm;
  .pair-avatar { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: $font-size-sm; font-weight: 700; flex-shrink: 0; &.teacher-av { border-radius: $radius-md; } }
  .pair-name   { font-size: $font-size-sm; font-weight: 600; color: $text-primary; }
  .pair-detail { font-size: 11px; color: $text-muted; }
}
</style>
