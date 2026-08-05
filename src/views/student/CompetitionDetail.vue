<template>
  <div class="page-container">
    <div class="back-nav" @click="router.back()">
      <el-icon><ArrowLeft /></el-icon>
      <span>返回比赛大厅</span>
    </div>

    <div v-if="loading" class="loading-wrapper card">
      <el-skeleton :rows="8" animated />
    </div>

    <div v-else-if="competition" class="detail-layout">
      <div class="comp-banner" :style="bannerStyle">
        <div class="banner-overlay">
          <div class="banner-content">
            <div class="banner-tags">
              <el-tag :type="getStatusType(competition.status)" effect="dark" size="default">
                {{ competition.status }}
              </el-tag>
              <el-tag type="info" effect="dark">{{ competition.category }}</el-tag>
            </div>
            <h1 class="banner-title">{{ competition.name }}</h1>
            <div class="banner-meta">
              <span><el-icon><Calendar /></el-icon> 报名截止：{{ formatDate(competition.endTime) }}</span>
              <span><el-icon><UserFilled /></el-icon> {{ teamProgressText }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="detail-body">
        <div class="detail-main">
          <div class="section-card card">
            <div class="section-title card-title">
              <el-icon><Document /></el-icon>
              比赛简介
            </div>
            <p class="comp-description">{{ competition.description }}</p>
          </div>

          <div class="section-card card">
            <div class="section-title card-title">
              <el-icon><List /></el-icon>
              参赛须知
            </div>
            <div class="rules-list">
              <div v-for="(rule, i) in displayRules" :key="i" class="rule-item">
                <span class="rule-num">{{ i + 1 }}</span>
                <span>{{ rule }}</span>
              </div>
            </div>
          </div>

          <!-- 步骤1：选择带队老师 -->
          <div class="section-card card">
            <div class="section-title card-title">
              <el-icon><Avatar /></el-icon>
              选择带队老师
              <span class="section-subtitle">
                本场每队最多可选 {{ competition.maxLeadTeachers || 1 }} 位带队老师
              </span>
            </div>

            <div v-if="!(competition.teachers || []).length" class="empty-teachers">
              管理员尚未为本场比赛配置带队老师
            </div>
            <div v-else class="teachers-grid">
              <div
                v-for="teacher in competition.teachers"
                :key="teacher.id"
                class="teacher-card card"
                :class="{ selected: selectedTeacherIds.includes(teacher.id) }"
                @click="toggleTeacher(teacher)"
              >
                <div class="teacher-avatar" :style="getAvatarStyle(teacher.name)">
                  {{ teacher.name.charAt(0) }}
                </div>
                <div class="teacher-info">
                  <div class="teacher-name">{{ teacher.name }}</div>
                  <div class="teacher-title">{{ teacher.title }} · {{ teacher.department || '未填院系' }}</div>
                </div>
                <div v-if="selectedTeacherIds.includes(teacher.id)" class="selected-check">
                  <el-icon><Check /></el-icon>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="detail-sidebar">
          <div class="apply-card card">
            <div class="apply-card-header">
              <span class="apply-title">队伍参赛申请</span>
              <el-tag :type="getStatusType(competition.status)" size="small">{{ competition.status }}</el-tag>
            </div>

            <el-steps :active="step" finish-status="success" align-center class="apply-steps">
              <el-step title="选老师" />
              <el-step title="选队伍" />
              <el-step title="确认" />
            </el-steps>

            <div class="apply-progress">
              <div class="progress-info">
                <span>参赛队伍</span>
                <span class="progress-ratio">{{ approvedTeamCount }}/{{ competition.maxTeams || 40 }}</span>
              </div>
              <div class="prog-bar">
                <div
                  class="prog-fill"
                  :style="`width:${Math.min((approvedTeamCount / (competition.maxTeams || 40)) * 100, 100)}%`"
                ></div>
              </div>
            </div>

            <div class="apply-info-list">
              <div class="info-row">
                <span class="info-label"><el-icon><Calendar /></el-icon> 报名开始</span>
                <span>{{ formatDate(competition.startTime) }}</span>
              </div>
              <div class="info-row">
                <span class="info-label"><el-icon><Clock /></el-icon> 报名截止</span>
                <span>{{ formatDate(competition.endTime) }}</span>
              </div>
              <div class="info-row">
                <span class="info-label"><el-icon><Avatar /></el-icon> 已选老师</span>
                <span>{{ selectedTeacherIds.length }}/{{ competition.maxLeadTeachers || 1 }}</span>
              </div>
            </div>

            <div v-if="selectedTeachers.length" class="selected-teacher-tip">
              <el-icon><Check /></el-icon>
              已选：{{ selectedTeachers.map((t) => t.name).join('、') }}
            </div>

            <div v-if="selectedTeam" class="selected-team-tip">
              <el-icon><UserFilled /></el-icon>
              参赛队伍：{{ selectedTeam.name }}（{{ selectedTeam.currentMembers }}/{{ selectedTeam.maxMembers }} 人）
            </div>

            <el-button
              v-if="step === 0"
              type="primary"
              class="apply-btn-main"
              :disabled="competition.status === '已结束' || !selectedTeacherIds.length"
              @click="goSelectTeam"
            >
              <template v-if="competition.status === '已结束'">报名已截止</template>
              <template v-else-if="!selectedTeacherIds.length">请先选择带队老师</template>
              <template v-else>下一步：选择队伍</template>
            </el-button>

            <template v-else-if="step === 1">
              <el-button type="primary" class="apply-btn-main" @click="teamDialogVisible = true">
                {{ selectedTeamId ? '重新选择队伍' : '请选择参赛队伍' }}
              </el-button>
              <el-button class="apply-btn-sub" @click="step = 0">返回选老师</el-button>
            </template>

            <template v-else>
              <el-button type="primary" class="apply-btn-main" :loading="applying" @click="handleConfirm">
                确认申请带队老师
              </el-button>
              <el-button class="apply-btn-sub" @click="teamDialogVisible = true">返回选队伍</el-button>
            </template>

            <div class="apply-hint">确认后将自动向带队老师提交申请，审核结果将通知至消息中心</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 选择队伍弹窗 -->
    <el-dialog v-model="teamDialogVisible" title="选择参赛队伍" width="560px" destroy-on-close>
      <p class="dialog-tip">请选择你担任队长的队伍（学生人数 1-9，不含带队老师）</p>
      <div v-if="captainTeams.length === 0" class="empty-teams">
        <p>你还没有可申请的队伍</p>
        <el-button type="primary" @click="goCreateTeam">去组队中心创建</el-button>
      </div>
      <div v-else class="team-pick-list">
        <div
          v-for="team in captainTeams"
          :key="team.id"
          class="team-pick-item"
          :class="{
            selected: selectedTeamId === team.id,
            disabled: !canPickTeam(team),
          }"
          @click="pickTeam(team)"
        >
          <div class="tp-avatar" :style="getTeamColor(team.id)">{{ team.name.charAt(0) }}</div>
          <div class="tp-info">
            <div class="tp-name">{{ team.name }}</div>
            <div class="tp-meta">
              {{ team.currentMembers }}/{{ team.maxMembers }} 人
              <template v-if="team.auditStatus"> · {{ team.auditStatus }}</template>
            </div>
            <div class="tp-desc">{{ team.description || '暂无介绍' }}</div>
          </div>
          <el-tag v-if="!canPickTeam(team)" type="info" size="small">不可用</el-tag>
          <el-icon v-else-if="selectedTeamId === team.id" color="var(--el-color-primary)"><Check /></el-icon>
        </div>
      </div>
      <template #footer>
        <el-button @click="teamDialogVisible = false">取消</el-button>
        <el-button type="primary" :disabled="!selectedTeamId" @click="confirmPickTeam">确认选择</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getCompetitionDetail, registerTeamCompetition } from '@/api'
import { getMyTeams } from '@/api/team'
import { getAvatarStyle, getCoverStyle, getTeamColor } from '@/utils/avatarStyles'

const router = useRouter()
const route = useRoute()

const loading = ref(true)
const competition = ref(null)
const selectedTeacherIds = ref([])
const selectedTeamId = ref(null)
const myTeams = ref([])
const applying = ref(false)
const step = ref(0)
const teamDialogVisible = ref(false)

const defaultRules = [
  '参赛者以团队形式报名，由队长选择带队老师并提交队伍信息',
  '每队学生人数 1-9 人（不含带队老师）',
  '带队老师审核通过后队伍正式获得参赛资格',
  '审核结果将发送至消息中心，请及时查看',
]

const bannerStyle = computed(() => getCoverStyle(competition.value?.id || 0))

const displayRules = computed(() => {
  const raw = competition.value?.rules
  if (!raw) return defaultRules
  if (Array.isArray(raw)) return raw
  return String(raw).split(/[；;\n]/).map((s) => s.trim()).filter(Boolean)
})

const selectedTeachers = computed(() =>
  (competition.value?.teachers || []).filter((t) => selectedTeacherIds.value.includes(t.id)),
)

const captainTeams = computed(() => myTeams.value.filter((t) => t.isLeader))

const selectedTeam = computed(() =>
  myTeams.value.find((t) => t.id === selectedTeamId.value) || null,
)

const approvedTeamCount = computed(() => Number(competition.value?.teamCount) || 0)

const teamProgressText = computed(() => {
  const max = competition.value?.maxTeams || 40
  return `${approvedTeamCount.value}/${max} 支队伍`
})

const canPickTeam = (team) => {
  if (team.auditStatus === '待审核') return false
  if (team.auditStatus === '已通过' && team.competitionId === competition.value?.id) return false
  return true
}

onMounted(async () => {
  const id = route.params.id
  try {
    const [compRes, teamsRes] = await Promise.all([
      getCompetitionDetail(id),
      getMyTeams(),
    ])
    competition.value = compRes.data
    myTeams.value = teamsRes.data?.list || []
  } finally {
    loading.value = false
  }
})

const toggleTeacher = (teacher) => {
  const max = Number(competition.value?.maxLeadTeachers) || 1
  const idx = selectedTeacherIds.value.indexOf(teacher.id)
  if (idx >= 0) {
    selectedTeacherIds.value.splice(idx, 1)
    return
  }
  if (selectedTeacherIds.value.length >= max) {
    if (max === 1) {
      selectedTeacherIds.value = [teacher.id]
    } else {
      ElMessage.warning(`本场比赛每队最多可选 ${max} 位带队老师`)
    }
    return
  }
  selectedTeacherIds.value.push(teacher.id)
}

const goSelectTeam = () => {
  teamDialogVisible.value = true
}

const pickTeam = (team) => {
  if (!canPickTeam(team)) {
    ElMessage.warning(team.auditStatus === '待审核' ? '该队伍已有待审核申请' : '该队伍已通过本场比赛')
    return
  }
  selectedTeamId.value = team.id
}

const confirmPickTeam = () => {
  if (!selectedTeamId.value) return
  teamDialogVisible.value = false
  step.value = 2
}

const goCreateTeam = () => {
  teamDialogVisible.value = false
  router.push('/student/team')
}

const handleConfirm = async () => {
  if (!selectedTeamId.value || !selectedTeacherIds.value.length) return
  applying.value = true
  try {
    await registerTeamCompetition({
      competitionId: competition.value.id,
      teamId: selectedTeamId.value,
      teacherIds: selectedTeacherIds.value,
    })
    ElMessage.success('已向带队老师提交申请，请等待审核')
    setTimeout(() => router.push('/student/team'), 1200)
  } catch (e) {
    ElMessage.error(e?.message || e?.response?.data?.message || '申请失败')
  } finally {
    applying.value = false
  }
}

const getStatusType = (s) => ({ '报名中': 'success', '进行中': 'warning', '已结束': 'info' }[s] || 'info')
const formatDate = (dt) => String(dt || '').slice(0, 10)
</script>

<style scoped lang="scss">
.back-nav {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: $font-size-base;
  color: $primary;
  cursor: pointer;
  margin-bottom: $spacing-lg;
  padding: 6px 12px;
  border-radius: $radius-md;
  transition: background 0.2s;
  font-weight: 500;

  &:hover { background: $primary-bg; }
}

.comp-banner {
  border-radius: 20px;
  overflow: hidden;
  margin-bottom: $spacing-lg;
  min-height: 220px;
}

.banner-overlay {
  background: linear-gradient(to bottom right, rgba(0,0,0,0.1), rgba(0,0,0,0.4));
  min-height: 220px;
  padding: 40px 44px;
  display: flex;
  align-items: flex-end;
}

.banner-content {
  .banner-tags {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
  }

  .banner-title {
    font-size: 30px;
    font-weight: 800;
    color: #fff;
    margin-bottom: 14px;
    text-shadow: 0 2px 8px rgba(0,0,0,0.2);
    letter-spacing: -0.5px;
  }

  .banner-meta {
    display: flex;
    gap: 24px;
    color: rgba(255,255,255,0.85);
    font-size: 14px;

    span {
      display: flex;
      align-items: center;
      gap: 6px;
    }
  }
}

.detail-body {
  display: flex;
  gap: $spacing-lg;
  align-items: flex-start;

  @media (max-width: 900px) {
    flex-direction: column;
  }
}

.detail-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: $spacing-lg;
}

.section-card {
  .section-title {
    .section-subtitle {
      font-size: $font-size-sm;
      font-weight: 400;
      color: $text-muted;
      margin-left: $spacing-sm;
    }
  }

  .comp-description {
    font-size: 14px;
    line-height: 1.8;
    color: $text-secondary;
  }
}

.rules-list {
  display: flex;
  flex-direction: column;
  gap: 10px;

  .rule-item {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    font-size: 14px;
    color: $text-secondary;
    line-height: 1.6;

    .rule-num {
      width: 22px; height: 22px;
      border-radius: 50%;
      background: $primary-bg;
      color: $primary;
      font-size: 11px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-top: 1px;
    }
  }
}

.empty-teachers {
  padding: 24px;
  text-align: center;
  color: $text-muted;
  font-size: 14px;
}

.teachers-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: $spacing-md;
}

.teacher-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: $spacing-md;
  border: 2px solid $border-color;
  cursor: pointer;
  transition: $transition-base;
  position: relative;
  overflow: hidden;

  &:hover {
    border-color: $primary;
    background: $primary-bg;
    transform: translateY(-2px);
  }

  &.selected {
    border-color: $primary;
    background: $primary-bg;
  }
}

.teacher-avatar {
  width: 50px; height: 50px;
  border-radius: 50%;
  color: #fff;
  font-size: 18px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.teacher-info {
  flex: 1;
  min-width: 0;

  .teacher-name { font-size: 14px; font-weight: 700; color: $text-primary; margin-bottom: 2px; }
  .teacher-title { font-size: 12px; color: $text-muted; }
}

.selected-check {
  width: 22px; height: 22px;
  background: $primary;
  border-radius: 50%;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  flex-shrink: 0;
}

.detail-sidebar { width: 300px; flex-shrink: 0; }

.apply-card {
  position: sticky;
  top: 80px;

  .apply-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: $spacing-md;

    .apply-title {
      font-size: $font-size-lg;
      font-weight: 600;
      color: $text-primary;
    }
  }
}

.apply-steps {
  margin-bottom: 18px;
  :deep(.el-step__title) { font-size: 12px; }
}

.apply-progress {
  margin-bottom: 20px;

  .progress-info {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
    color: $text-secondary;
    margin-bottom: 6px;

    .progress-ratio { font-weight: 600; color: $text-primary; }
  }

  .prog-bar {
    height: 6px;
    background: $bg-body;
    border-radius: 3px;
    overflow: hidden;

    .prog-fill {
      height: 100%;
      background: linear-gradient(90deg, $primary, $primary-dark);
      border-radius: 3px;
      transition: width 0.5s;
    }
  }
}

.apply-info-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;

  .info-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 13px;
    color: $text-secondary;

    .info-label {
      display: flex;
      align-items: center;
      gap: 6px;
      color: $text-muted;
      font-size: 12px;
    }
  }
}

.selected-teacher-tip,
.selected-team-tip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  border-radius: $radius-md;
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 12px;
}

.selected-teacher-tip {
  background: $success-bg;
  color: $success;
}

.selected-team-tip {
  background: $primary-bg;
  color: $primary;
}

.apply-btn-main {
  width: 100%;
  height: 46px !important;
  border-radius: 10px !important;
  font-size: 15px;
  font-weight: 600;
  background: linear-gradient(135deg, $primary, $primary-dark) !important;
  border: none !important;
  box-shadow: 0 4px 16px rgba(102,126,234,0.3) !important;
  margin-bottom: 10px;
}

.apply-btn-sub {
  width: 100%;
  margin-bottom: 12px;
}

.apply-hint {
  font-size: 12px;
  color: $text-muted;
  text-align: center;
  line-height: 1.5;
}

.dialog-tip {
  font-size: 13px;
  color: $text-secondary;
  margin-bottom: 14px;
}

.empty-teams {
  text-align: center;
  padding: 32px 16px;
  color: $text-muted;
  p { margin-bottom: 16px; }
}

.team-pick-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 420px;
  overflow-y: auto;
}

.team-pick-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border: 2px solid $border-color;
  border-radius: $radius-lg;
  cursor: pointer;
  transition: $transition-base;

  &:hover:not(.disabled) {
    border-color: $primary;
    background: $primary-bg;
  }

  &.selected {
    border-color: $primary;
    background: $primary-bg;
  }

  &.disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
}

.tp-avatar {
  width: 42px; height: 42px;
  border-radius: $radius-md;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
}

.tp-info {
  flex: 1;
  min-width: 0;
  .tp-name { font-weight: 700; color: $text-primary; margin-bottom: 2px; }
  .tp-meta { font-size: 12px; color: $text-muted; margin-bottom: 2px; }
  .tp-desc {
    font-size: 12px;
    color: $text-secondary;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>
