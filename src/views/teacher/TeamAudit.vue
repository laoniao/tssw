<template>
  <div class="page-container">
    <div class="page-header">
      <div>
        <h1 class="page-title">队伍审核</h1>
        <p class="page-subtitle">审核申请由您带队的参赛队伍，通过或拒绝后将通知学生</p>
      </div>
      <div class="status-counts">
        <span class="sc-item warning">{{ pendingCount }} 待审核</span>
        <span class="sc-item success">{{ passedCount }} 已通过</span>
        <span class="sc-item danger">{{ rejectedCount }} 已拒绝</span>
      </div>
    </div>

    <div class="filter-bar">
      <el-input v-model="searchKey" placeholder="搜索队伍名称..." prefix-icon="Search" clearable class="filter-input-md" />
      <el-select v-model="filterStatus" placeholder="审核状态" clearable class="filter-select-sm">
        <el-option label="待审核" value="待审核" />
        <el-option label="已通过" value="已通过" />
        <el-option label="已拒绝" value="已拒绝" />
      </el-select>
    </div>

    <div v-loading="loading" class="teams-audit-grid">
      <div
        v-for="team in filteredTeams"
        :key="team.id"
        class="team-audit-card card fade-in-up"
        :class="`status-${team.status}`"
      >
        <div class="tac-header">
          <div class="tac-icon" :style="getTeamColor(team.id)">{{ team.name.charAt(0) }}</div>
          <div class="tac-title-info">
            <div class="tac-name card-title">{{ team.name }}</div>
            <div class="tac-comp">{{ team.competition?.name }}</div>
          </div>
          <el-tag :type="getStatusType(team.status)" size="small">{{ team.status }}</el-tag>
        </div>

        <p class="tac-desc">{{ team.description }}</p>

        <div class="tac-members">
          <div class="tac-members-label">队伍成员 ({{ team.members?.list?.length || 0 }} 人)</div>
          <div class="tac-members-list">
            <div v-for="m in team.members?.list" :key="m.id || m.name" class="tac-member">
              <div class="m-avatar" :style="getAvatarStyle(m.name)">{{ m.name.charAt(0) }}</div>
              <div class="m-info">
                <div class="m-name">{{ m.name }} <span v-if="m.role" class="m-role">{{ m.role }}</span></div>
                <div class="m-detail">{{ m.studentId }} · {{ m.major }}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="tac-time">
          <el-icon><Clock /></el-icon>
          申请时间：{{ formatDate(team.applyTime) }}
        </div>

        <div v-if="team.rejectReason" class="tac-reason">拒绝原因：{{ team.rejectReason }}</div>

        <div class="tac-actions" v-if="team.status === '待审核'">
          <el-button type="success" size="small" class="audit-btn" :loading="actingId === team.id" @click="auditTeam(team, 'pass')">
            <el-icon><Check /></el-icon> 通过审核
          </el-button>
          <el-button type="danger" size="small" plain class="audit-btn" @click="openReject(team)">
            <el-icon><Close /></el-icon> 拒绝
          </el-button>
        </div>
        <div v-else class="tac-result">
          <el-icon :color="team.status === '已通过' ? '#22c55e' : '#ef4444'">
            <component :is="team.status === '已通过' ? 'CircleCheck' : 'CircleClose'" />
          </el-icon>
          {{ team.status === '已通过' ? '审核已通过' : '审核已拒绝' }}
        </div>

        <div class="tac-actions tac-secondary" v-if="team.status === '已通过'">
          <el-button size="small" type="primary" plain @click="openChat(team)">
            <el-icon><ChatDotRound /></el-icon> 进入聊天室
          </el-button>
        </div>
      </div>

      <div v-if="!loading && filteredTeams.length === 0" class="empty-state">
        <el-icon size="56" class="empty-icon"><Checked /></el-icon>
        <div class="empty-title">暂无队伍申请</div>
        <div class="empty-desc">学生在比赛大厅选择您为带队老师后，申请将出现在这里</div>
      </div>
    </div>

    <el-dialog v-model="rejectVisible" title="填写拒绝原因" width="440px">
      <el-form>
        <el-form-item label="拒绝原因">
          <el-input v-model="rejectReason" type="textarea" :rows="3" placeholder="请说明拒绝原因，将通知队伍成员..." />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="rejectVisible = false">取消</el-button>
        <el-button type="danger" :loading="rejecting" @click="confirmReject">确认拒绝</el-button>
      </template>
    </el-dialog>

    <!-- 带队教师进入队伍聊天室（可发言，支持文字 / 图片 / 文件） -->
    <TeamChatRoom v-model="chatVisible" :team="chatTeam" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getTeamAuditList, auditTeam as auditTeamApi } from '@/api'
import { getAvatarStyle, getTeamColor } from '@/utils/avatarStyles'
import TeamChatRoom from '@/components/TeamChatRoom.vue'

const loading = ref(true)
const allTeams = ref([])
const searchKey = ref('')
const filterStatus = ref('')
const actingId = ref(null)

const rejectVisible = ref(false)
const rejectReason = ref('')
const rejectTarget = ref(null)
const rejecting = ref(false)

const fetchList = async () => {
  loading.value = true
  try {
    const res = await getTeamAuditList()
    const raw = res.data?.list
    allTeams.value = Array.isArray(raw) ? raw : (raw?.list || [])
  } finally {
    loading.value = false
  }
}

onMounted(fetchList)

const filteredTeams = computed(() => {
  return allTeams.value.filter(t => {
    const keyOk = !searchKey.value || t.name.includes(searchKey.value)
    const statOk = !filterStatus.value || t.status === filterStatus.value
    return keyOk && statOk
  })
})

const pendingCount = computed(() => allTeams.value.filter(t => t.status === '待审核').length)
const passedCount = computed(() => allTeams.value.filter(t => t.status === '已通过').length)
const rejectedCount = computed(() => allTeams.value.filter(t => t.status === '已拒绝').length)

const auditTeam = async (team, action) => {
  actingId.value = team.id
  try {
    await auditTeamApi({ id: team.id, action, status: action === 'pass' ? '已通过' : '已拒绝' })
    ElMessage.success(action === 'pass' ? '队伍审核通过，已通知学生' : '已拒绝该队伍')
    await fetchList()
  } finally {
    actingId.value = null
  }
}

const openReject = (team) => {
  rejectTarget.value = team
  rejectReason.value = ''
  rejectVisible.value = true
}

const confirmReject = async () => {
  rejecting.value = true
  try {
    await auditTeamApi({
      id: rejectTarget.value.id,
      action: 'reject',
      status: '已拒绝',
      reason: rejectReason.value,
    })
    rejectVisible.value = false
    ElMessage.success('已拒绝该队伍，学生将收到通知')
    await fetchList()
  } finally {
    rejecting.value = false
  }
}

const formatDate = (dt) => String(dt || '').slice(0, 10)
const getStatusType = (s) => ({ '待审核': 'warning', '已通过': 'success', '已拒绝': 'danger' }[s] || 'info')

// 队伍聊天室（带队教师可进入发言）
const chatVisible = ref(false)
const chatTeam = ref(null)
const openChat = (team) => {
  chatTeam.value = {
    id: team.id,
    name: team.name,
    leader: team.leader || { name: '队长' },
    createdAt: team.applyTime,
  }
  chatVisible.value = true
}
</script>

<style scoped lang="scss">
.status-counts {
  display: flex; gap: $spacing-sm; align-items: center;

  .sc-item {
    padding: $spacing-xs 12px; border-radius: $radius-full; font-size: $font-size-sm; font-weight: 600;

    &.warning { background: $warning-bg; color: $warning; }
    &.success { background: $success-bg; color: $success; }
    &.danger  { background: $danger-bg; color: $danger; }
  }
}

.teams-audit-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: $spacing-lg;
}

.team-audit-card {
  &.status-待审核 { border-left: 4px solid $warning; }
  &.status-已通过 { border-left: 4px solid $success; }
  &.status-已拒绝 { border-left: 4px solid $danger; opacity: 0.8; }
}

.tac-header {
  display: flex; align-items: center; gap: 12px; margin-bottom: 12px;
}

.tac-icon {
  width: 46px; height: 46px; border-radius: $radius-lg;
  display: flex; align-items: center; justify-content: center;
  font-size: $font-size-lg; font-weight: 700; flex-shrink: 0;
}

.tac-title-info {
  flex: 1;
  .tac-name { margin-bottom: 0; }
  .tac-comp { font-size: $font-size-sm; color: $text-muted; }
}

.tac-desc {
  font-size: $font-size-sm; color: $text-secondary; line-height: 1.6; margin-bottom: 14px;
  overflow: hidden; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2;
}

.tac-members {
  margin-bottom: 14px;

  .tac-members-label { font-size: $font-size-sm; font-weight: 600; color: $text-secondary; margin-bottom: $spacing-sm; }
  .tac-members-list { display: flex; flex-direction: column; gap: 6px; }
}

.tac-member {
  display: flex; align-items: center; gap: $spacing-sm;
  padding: 6px 10px; background: $bg-body; border-radius: $radius-md;

  .m-avatar {
    width: 28px; height: 28px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 11px; font-weight: 700; flex-shrink: 0;
  }
  .m-name { font-size: $font-size-sm; font-weight: 600; color: $text-primary; }
  .m-role { font-size: 11px; color: $primary; font-weight: 500; margin-left: 4px; }
  .m-detail { font-size: 11px; color: $text-muted; }
}

.tac-time {
  display: flex; align-items: center; gap: $spacing-xs;
  font-size: $font-size-sm; color: $text-muted; margin-bottom: 10px;
  padding-top: 10px; border-top: 1px solid $bg-body;
}

.tac-reason {
  font-size: 12px;
  color: $danger;
  margin-bottom: 12px;
}

.tac-actions {
  display: flex; gap: $spacing-sm;
  .audit-btn { flex: 1; border-radius: $radius-md !important; }

  &.tac-secondary { margin-top: $spacing-sm; }
}

.tac-result {
  display: flex; align-items: center; gap: 6px;
  font-size: $font-size-sm; color: $text-secondary;
  padding: $spacing-sm 0;
}

.empty-state {
  grid-column: 1 / -1;
}
.empty-desc {
  margin-top: 8px;
  font-size: 13px;
  color: $text-muted;
}
</style>
