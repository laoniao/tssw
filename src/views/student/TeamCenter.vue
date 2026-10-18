<template>
  <div class="page-container">
    <div class="page-header">
      <div>
        <h1 class="page-title">组队中心</h1>
        <p class="page-subtitle">创建或加入队伍，与志同道合的同学一起参赛</p>
      </div>
      <el-button type="primary" @click="showCreateDialog = true">
        <el-icon><Plus /></el-icon>
        创建队伍
      </el-button>
    </div>

    <!-- 标签页 -->
    <el-tabs v-model="activeTab" class="team-tabs">
      <!-- 我的队伍 -->
      <el-tab-pane name="my">
        <template #label>
          <span class="tab-label"><el-icon><UserFilled /></el-icon> 我的队伍</span>
        </template>

        <div v-if="myTeams.length === 0" class="empty-state">
          <el-icon class="empty-icon" size="56"><UserFilled /></el-icon>
          <div class="empty-title">还没有加入任何队伍</div>
          <div class="empty-desc">创建一支队伍或搜索加入现有队伍</div>
          <el-button type="primary" class="mt-md" @click="activeTab = 'find'">去寻找队伍</el-button>
        </div>

        <div v-else class="my-teams-grid">
          <div v-for="team in myTeams" :key="team.id" class="my-team-card card card-lift">
            <div class="team-card-header">
              <div class="team-avatar-large" :style="getTeamColor(team.id)">
                {{ team.name.charAt(0) }}
              </div>
              <div class="team-header-info">
                <div class="team-name-row">
                  <h3>{{ team.name }}</h3>
                  <el-tag :type="getTeamStatusType(team.status)" size="small">{{ team.status }}</el-tag>
                  <el-tag v-if="team.auditStatus" :type="getAuditStatusType(team.auditStatus)" size="small">
                    {{ team.auditStatus }}
                  </el-tag>
                </div>
                <div class="team-comp">
                  <template v-if="team.competitionId">
                    参赛：{{ getCompName(team.competitionId) }}
                    <template v-if="team.leaderTeachers?.length">
                      · 带队：{{ team.leaderTeachers.map(t => t.name).join('、') }}
                    </template>
                  </template>
                  <template v-else>尚未申请比赛（请在比赛大厅选择带队老师后提交）</template>
                </div>
                <div v-if="team.rejectReason" class="team-reject">拒绝原因：{{ team.rejectReason }}</div>
              </div>
            </div>

            <p class="team-desc">{{ team.description }}</p>

            <!-- 成员列表 -->
            <div class="team-members">
              <div class="members-header">
                <span class="members-label">队伍成员</span>
                <span class="members-count">{{ team.currentMembers }}/{{ team.maxMembers }}</span>
              </div>
              <div class="members-list">
                <div class="member-item leader">
                  <div class="member-avatar" :style="getAvatarStyle(team.leader.name)">
                    {{ team.leader.name.charAt(0) }}
                  </div>
                  <div class="member-info">
                    <span class="member-name">{{ team.leader.name }}</span>
                    <span class="member-role leader-badge">队长</span>
                  </div>
                </div>
                <div v-for="m in team.members" :key="m.id" class="member-item">
                  <div class="member-avatar" :style="getAvatarStyle(m.name)">{{ m.name.charAt(0) }}</div>
                  <div class="member-info">
                    <span class="member-name">{{ m.name }}</span>
                    <span class="member-role">队员</span>
                  </div>
                </div>
                <!-- 空位 -->
                <div
                  v-for="i in Math.max(0, team.maxMembers - team.currentMembers)"
                  :key="`empty-${i}`"
                  class="member-item empty-slot"
                >
                  <div class="member-avatar empty">
                    <el-icon><Plus /></el-icon>
                  </div>
                  <div class="member-info">
                    <span class="member-name empty-text">等待加入</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 邀请与审核（队长） -->
            <div class="invite-section">
              <div class="invite-code">
                <span class="invite-label">邀请码</span>
                <code class="invite-val">{{ team.inviteCode || `TEAM-${String(team.id).padStart(4, '0')}` }}</code>
                <el-button size="small" type="primary" plain @click="copyInvite(team)">
                  <el-icon><CopyDocument /></el-icon>
                  复制
                </el-button>
              </div>
              <div v-if="team.isLeader" class="leader-actions">
                <el-button size="small" type="primary" :loading="inviteLoadingId === team.id" @click="handleGenerateInvite(team)">
                  <el-icon><Link /></el-icon>
                  生成邀请链接
                </el-button>
                <el-button size="small" @click="openAudit(team)">
                  <el-icon><Checked /></el-icon>
                  队伍审核
                </el-button>
              </div>
            </div>

            <!-- 聊天室入口（学生与带队老师均可进入发言） -->
            <div class="chat-preview" @click="openChat(team)">
              <div class="chat-icon"><el-icon><ChatDotRound /></el-icon></div>
              <div class="chat-text">
                <span class="chat-title">队伍聊天室</span>
                <span class="chat-hint">点击进入聊天（可发文字 / 图片 / 文件）</span>
              </div>
              <el-icon class="chat-arrow"><ArrowRight /></el-icon>
            </div>
          </div>
        </div>
      </el-tab-pane>

      <!-- 找队伍 -->
      <el-tab-pane name="find">
        <template #label>
          <span class="tab-label"><el-icon><Search /></el-icon> 找队伍</span>
        </template>

        <div class="filter-bar">
          <el-input v-model="teamSearch" placeholder="搜索队伍名称..." prefix-icon="Search" clearable class="filter-input-md" />
          <el-select v-model="teamStatusFilter" placeholder="队伍状态" clearable class="filter-select-sm">
            <el-option label="招募中" value="招募中" />
            <el-option label="已满员" value="已满员" />
          </el-select>
          <el-input
            v-model="inviteCodeInput"
            placeholder="输入邀请码加入"
            clearable
            class="filter-input-md invite-code-input"
            maxlength="12"
          >
            <template #append>
              <el-button type="primary" :loading="applyingByCode" @click="handleApplyByCode">申请</el-button>
            </template>
          </el-input>
        </div>

        <div class="all-teams-grid">
          <div v-for="team in filteredAllTeams" :key="team.id" class="all-team-card card card-lift">
            <div class="all-team-top">
              <div class="all-team-avatar" :style="getTeamColor(team.id)">{{ team.name.charAt(0) }}</div>
              <div>
                <div class="all-team-name">{{ team.name }}</div>
                <div class="all-team-comp">
                  <template v-if="team.competitionId">比赛：{{ getCompName(team.competitionId) }}</template>
                  <template v-else>未绑定比赛</template>
                  <template v-if="team.auditStatus"> · {{ team.auditStatus }}</template>
                </div>
              </div>
              <el-tag :type="getTeamStatusType(team.status)" size="small" class="status-tag-end">{{ team.status }}</el-tag>
            </div>
            <p class="all-team-desc">{{ team.description }}</p>
            <div class="all-team-meta">
              <span><el-icon><UserFilled /></el-icon> {{ team.currentMembers }}/{{ team.maxMembers }} 人</span>
              <span><el-icon><Clock /></el-icon> {{ formatDate(team.createdAt) }}</span>
            </div>
            <div class="all-team-leader">
              <div class="mini-avatar" :style="getAvatarStyle(team.leader.name)">{{ team.leader.name.charAt(0) }}</div>
              <span>队长：{{ team.leader.name }}</span>
            </div>
            <el-button
              type="primary"
              size="small"
              class="join-btn"
              :disabled="team.status !== '招募中'"
              :loading="joiningId === team.id"
              @click="handleJoin(team)"
            >
              {{ team.status === '招募中' ? '申请加入' : '已满员' }}
            </el-button>
          </div>
        </div>

        <div v-if="filteredAllTeams.length === 0" class="empty-state">
          <el-icon class="empty-icon" size="56"><Search /></el-icon>
          <div class="empty-title">没有找到符合条件的队伍</div>
        </div>
      </el-tab-pane>

      <!-- 我的申请 -->
      <el-tab-pane name="apply">
        <template #label>
          <span class="tab-label"><el-icon><Document /></el-icon> 我的申请</span>
        </template>
        <TeamApplyList ref="applyListRef" />
      </el-tab-pane>
    </el-tabs>

    <!-- 邀请链接结果 -->
    <el-dialog v-model="showInviteDialog" title="邀请链接" width="520px">
      <el-alert type="success" :closable="false" show-icon title="邀请链接已生成，可复制分享给同学" class="mb-md" />
      <el-form label-width="80px">
        <el-form-item label="邀请码">
          <el-input :model-value="inviteResult?.inviteCode" readonly>
            <template #append>
              <el-button @click="copyText(inviteResult?.inviteCode)">复制</el-button>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item label="邀请链接">
          <el-input :model-value="inviteResult?.inviteLink" readonly type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showInviteDialog = false">关闭</el-button>
        <el-button type="primary" @click="copyText(inviteResult?.inviteLink)">复制链接</el-button>
        <el-button type="success" @click="openInvitePage">打开邀请页</el-button>
      </template>
    </el-dialog>

    <!-- 队长：队伍审核 -->
    <el-dialog v-model="showAuditDialog" :title="`队伍审核 - ${auditTeam?.name || ''}`" width="720px" destroy-on-close>
      <el-table :data="auditList" v-loading="auditLoading" empty-text="暂无入队申请">
        <el-table-column label="申请人" min-width="160">
          <template #default="{ row }">
            <div class="applicant-cell">
              <el-avatar :size="28" :src="row.applicantAvatar">{{ row.applicantName?.charAt(0) }}</el-avatar>
              <div>
                <div class="name">{{ row.applicantName }}</div>
                <div class="major">{{ row.applicantMajor || '-' }}</div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="applyTime" label="申请时间" width="170" />
        <el-table-column prop="remark" label="备注" min-width="140" show-overflow-tooltip />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="applyStatusType(row.status)" size="small">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <template v-if="row.status === '待审核'">
              <el-button type="success" link @click="handleAudit(row, 'approve')">通过</el-button>
              <el-button type="danger" link @click="handleAudit(row, 'reject')">拒绝</el-button>
            </template>
            <span v-else class="muted">已处理</span>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>

    <!-- 创建队伍弹窗 -->
    <el-dialog v-model="showCreateDialog" title="创建队伍" width="520px" destroy-on-close>
      <el-form ref="createFormRef" :model="createForm" :rules="createRules" label-width="90px">
        <el-form-item label="队伍名称" prop="name">
          <el-input v-model="createForm.name" placeholder="起一个霸气的队伍名吧" maxlength="20" show-word-limit />
        </el-form-item>
        <el-form-item label="队伍人数" prop="maxMembers">
          <el-radio-group v-model="createForm.maxMembers">
            <el-radio-button v-for="n in 9" :key="n" :label="n">{{ n }}人</el-radio-button>
          </el-radio-group>
          <div class="form-tip">不含带队老师，学生人数范围 1-9</div>
        </el-form-item>
        <el-form-item label="队伍介绍" prop="description">
          <el-input
            v-model="createForm.description"
            type="textarea"
            :rows="3"
            placeholder="介绍你的队伍，吸引更多同学加入..."
            maxlength="200"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" :loading="creating" @click="handleCreate">创建队伍</el-button>
      </template>
    </el-dialog>

    <!-- 聊天室弹窗（支持文字、图片、文件；学生与带队老师均可发言） -->
    <TeamChatRoom v-model="showChat" :team="chatTeam" />
  </div>
</template>

<script setup>
import { ElMessage } from 'element-plus'
import {
  getTeams,
  getMyTeams,
  createTeam,
  applyTeam,
  generateInvite,
  apply,
  getTeamApplications,
  auditApplication,
} from '@/api/team'
import { getCompetitions } from '@/api'
import { getAvatarStyle, getTeamColor } from '@/utils/avatarStyles'
import TeamApplyList from './components/TeamApplyList.vue'
import TeamChatRoom from '@/components/TeamChatRoom.vue'

const route = useRoute()
const router = useRouter()

const activeTab = ref(route.query.tab === 'apply' ? 'apply' : 'my')
const applyListRef = ref()

const myTeams = ref([])
const allTeams = ref([])
const allCompetitions = ref([])
const teamSearch = ref('')
const teamStatusFilter = ref('')
const inviteCodeInput = ref('')
const applyingByCode = ref(false)
const joiningId = ref(null)

const showCreateDialog = ref(false)
const creating = ref(false)
const createFormRef = ref()
const createForm = ref({ name: '', maxMembers: 3, description: '' })
const createRules = {
  name: [{ required: true, message: '请输入队伍名称' }],
  maxMembers: [{ required: true, message: '请选择队伍人数' }],
}

const showChat = ref(false)
const chatTeam = ref(null)

const inviteLoadingId = ref(null)
const showInviteDialog = ref(false)
const inviteResult = ref(null)

const showAuditDialog = ref(false)
const auditTeam = ref(null)
const auditList = ref([])
const auditLoading = ref(false)

const loadTeams = async () => {
  const [myRes, allRes, compRes] = await Promise.all([
    getMyTeams(), getTeams(), getCompetitions(),
  ])
  myTeams.value = myRes.data.list || []
  allTeams.value = allRes.data.list || []
  allCompetitions.value = compRes.data.list || []
}

onMounted(loadTeams)

watch(
  () => route.query.tab,
  (tab) => {
    if (tab === 'apply' || tab === 'find' || tab === 'my') {
      activeTab.value = tab
    }
  }
)

const filteredAllTeams = computed(() => {
  return allTeams.value.filter(t => {
    const keyMatch = !teamSearch.value || t.name.includes(teamSearch.value)
    const statMatch = !teamStatusFilter.value || t.status === teamStatusFilter.value
    return keyMatch && statMatch
  })
})

const handleCreate = async () => {
  try {
    await createFormRef.value?.validate()
  } catch {
    return
  }
  creating.value = true
  try {
    await createTeam(createForm.value)
    ElMessage.success('队伍创建成功！可在比赛大厅选择带队老师并提交参赛申请')
    showCreateDialog.value = false
    createForm.value = { name: '', maxMembers: 3, description: '' }
    await loadTeams()
  } finally {
    creating.value = false
  }
}

const handleJoin = async (team) => {
  joiningId.value = team.id
  try {
    // 走「提交申请 → 队长审核」流程，而不是直接把自己塞进队伍
    await applyTeam(team.id)
    ElMessage.success(`已申请加入「${team.name}」，等待队长审核`)
    activeTab.value = 'apply'
    applyListRef.value?.refresh?.()
    await loadTeams()
  } catch (e) {
    ElMessage.error(e.message || '申请失败')
  } finally {
    joiningId.value = null
  }
}

const handleApplyByCode = async () => {
  const code = inviteCodeInput.value.trim()
  if (!code) {
    ElMessage.warning('请输入邀请码')
    return
  }
  applyingByCode.value = true
  try {
    await apply(code)
    ElMessage.success('申请已提交，等待队长审核')
    inviteCodeInput.value = ''
    activeTab.value = 'apply'
    applyListRef.value?.refresh?.()
  } finally {
    applyingByCode.value = false
  }
}

const copyText = async (text) => {
  if (!text) return
  try {
    await navigator.clipboard?.writeText(text)
    ElMessage.success('已复制到剪贴板')
  } catch {
    ElMessage.info(text)
  }
}

const copyInvite = (team) => {
  copyText(team.inviteCode || `TEAM-${String(team.id).padStart(4, '0')}`)
}

const handleGenerateInvite = async (team) => {
  inviteLoadingId.value = team.id
  try {
    const res = await generateInvite(team.id)
    const data = res.data || {}
    // 后端只返回 inviteCode，邀请链接在前端拼出来（此前读 inviteLink 恒为空）
    inviteResult.value = {
      ...data,
      inviteLink: `${window.location.origin}/student/invite?code=${encodeURIComponent(data.inviteCode || '')}`,
    }
    team.inviteCode = data.inviteCode
    showInviteDialog.value = true
  } catch (e) {
    ElMessage.error(e.message || '生成邀请码失败')
  } finally {
    inviteLoadingId.value = null
  }
}

const openInvitePage = () => {
  if (!inviteResult.value?.inviteCode) return
  showInviteDialog.value = false
  router.push({ path: '/student/invite', query: { code: inviteResult.value.inviteCode } })
}

const openChat = (team) => {
  chatTeam.value = team
  showChat.value = true
}

const openAudit = async (team) => {  auditTeam.value = team
  showAuditDialog.value = true
  auditLoading.value = true
  try {
    const res = await getTeamApplications(team.id)
    auditList.value = res.data?.list || []
  } finally {
    auditLoading.value = false
  }
}

const handleAudit = async (row, action) => {
  try {
    await auditApplication({ id: row.id, action })
    ElMessage.success(action === 'approve' ? '已通过申请' : '已拒绝申请')
    const res = await getTeamApplications(auditTeam.value.id)
    auditList.value = res.data?.list || []
    await loadTeams()
  } catch (e) {
    ElMessage.error(e.message || '审核失败')
  }
}

const applyStatusType = (status) =>
  ({ 待审核: 'warning', 已通过: 'success', 已拒绝: 'danger' }[status] || 'info')

const formatDate = (dt) => String(dt || '').slice(0, 10)
const getTeamStatusType = (s) => ({ '招募中': 'success', '已满员': 'info', '已解散': 'danger' }[s] || 'info')
const getAuditStatusType = (s) => ({ '待审核': 'warning', '已通过': 'success', '已拒绝': 'danger' }[s] || 'info')
const getCompName = (id) => allCompetitions.value.find((c) => c.id === id)?.name || `比赛 ${id}`
</script>

<style scoped lang="scss">
.tab-label {
  display: flex;
  align-items: center;
  gap: 6px;
}

.team-tabs {
  :deep(.el-tabs__header) { margin-bottom: $spacing-lg; }
}

.invite-code-input {
  margin-left: auto;

  @media (max-width: $breakpoint-md) {
    margin-left: 0;
    width: 100%;
    flex: 1 1 100%;
  }
}

// 我的队伍
.my-teams-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: $spacing-lg;

  @media (max-width: $breakpoint-md) {
    grid-template-columns: 1fr;
  }
}

.my-team-card {
  animation: fadeInUp 0.4s both;
}

.team-card-header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 14px;
}

.team-avatar-large {
  width: 54px; height: 54px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  font-weight: 700;
  flex-shrink: 0;
}

.team-header-info {
  flex: 1;
  .team-name-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
    h3 { font-size: 16px; font-weight: 700; color: $text-primary; }
  }
  .team-comp { font-size: 12px; color: $text-muted; }
  .team-reject { font-size: 12px; color: $danger; margin-top: 4px; }
}

.team-desc {
  font-size: 13px;
  color: $text-secondary;
  margin-bottom: 16px;
  line-height: 1.6;
}

// 成员
.team-members {
  margin-bottom: 16px;

  .members-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;

    .members-label { font-size: 13px; font-weight: 600; color: $text-secondary; }
    .members-count { font-size: 12px; color: $text-muted; }
  }
}

.members-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.member-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 10px;
  background: $bg-body;
  transition: background 0.2s;

  &.leader { background: $primary-bg; }
  &.empty-slot { border: 1.5px dashed $border-color; background: transparent; }
  &:hover:not(.empty-slot) { background: $bg-body; }
}

.member-avatar {
  width: 30px; height: 30px;
  border-radius: 50%;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  &.empty {
    background: $border-color;
    color: $text-muted;
    border: 1.5px dashed $border-color;
  }
}

.member-info {
  display: flex;
  flex-direction: column;
  min-width: 0;

  .member-name { font-size: 12px; font-weight: 600; color: $text-secondary; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .member-role { font-size: 11px; color: $text-muted; }
  .leader-badge { color: $primary; font-weight: 600; }
  .empty-text { color: $text-muted; }
}

// 邀请链接
.invite-section {
  margin-bottom: 14px;
  padding: 10px 14px;
  background: $bg-body;
  border-radius: 10px;
  border: 1px dashed $border-color;
}

.invite-code {
  display: flex;
  align-items: center;
  gap: 8px;

  .invite-label { font-size: 12px; color: $text-muted; }
  .invite-val {
    font-family: monospace;
    font-size: $font-size-sm;
    color: $primary;
    background: $primary-bg;
    padding: 2px 8px;
    border-radius: 6px;
    letter-spacing: 0.5px;
    flex: 1;
  }
}

.leader-actions {
  display: flex;
  gap: 8px;
  margin-top: 10px;
  flex-wrap: wrap;
}

.applicant-cell {
  display: flex;
  align-items: center;
  gap: 10px;

  .name { font-size: 13px; font-weight: 600; color: $text-secondary; }
  .major { font-size: 12px; color: $text-muted; }
}

.muted { color: $text-muted; font-size: 12px; }

// 聊天入口
.chat-preview {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: linear-gradient(135deg,#f0f4ff,#f8f0ff);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid #e0e7ff;

  &:hover {
    transform: translateX(4px);
    box-shadow: 0 2px 12px rgba(102,126,234,0.15);
  }

  .chat-icon {
    width: 38px; height: 38px;
    background: $primary;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-size: 18px;
    flex-shrink: 0;
  }

  .chat-text {
    flex: 1;
    .chat-title { display: block; font-size: 13px; font-weight: 600; color: $text-primary; }
    .chat-hint  { display: block; font-size: 11px; color: $text-muted; }
  }

  .chat-arrow { color: $primary; }
}

// 找队伍
.all-teams-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: $spacing-lg;

  @media (max-width: $breakpoint-md) {
    grid-template-columns: 1fr;
  }
}

.all-team-card {
  animation: fadeInUp 0.4s both;
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
}

.status-tag-end {
  margin-left: auto;
}

.all-team-top {
  display: flex;
  align-items: center;
  gap: 10px;

  .all-team-avatar {
    width: 42px; height: 42px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    font-weight: 700;
    flex-shrink: 0;
  }

  .all-team-name { font-size: 14px; font-weight: 700; color: $text-primary; }
  .all-team-comp { font-size: 12px; color: $text-muted; }
}

.all-team-desc {
  font-size: 13px;
  color: $text-secondary;
  line-height: 1.5;
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.all-team-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: $text-muted;

  span {
    display: flex;
    align-items: center;
    gap: 4px;
  }
}

.all-team-leader {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: $text-secondary;

  .mini-avatar {
    width: 22px; height: 22px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: 700;
  }
}

.join-btn { width: 100%; border-radius: 8px !important; margin-top: 4px; }

// 聊天室
.chat-room {
  display: flex;
  flex-direction: column;
  height: 400px;
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
      .msg-time { color: rgba(255,255,255,0.6); }
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
}

.msg-bubble {
  max-width: 60%;
  background: $bg-card;
  border-radius: 12px;
  padding: 10px 14px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);

  .msg-sender { font-size: 11px; color: $text-muted; margin-bottom: 4px; }
  .msg-content { font-size: 14px; color: $text-primary; line-height: 1.5; }
  .msg-time { font-size: 10px; color: $text-muted; margin-top: 4px; text-align: right; }
}

.chat-input-row {
  display: flex;
  gap: $spacing-sm;
}

.form-tip {
  width: 100%;
  margin-top: 6px;
  font-size: 12px;
  color: $text-muted;
}
</style>
