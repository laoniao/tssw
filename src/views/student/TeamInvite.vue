<template>
  <div class="page-container invite-page">
    <div v-loading="loading" class="card invite-card">
      <template v-if="error">
        <el-result icon="warning" title="邀请无效" :sub-title="error">
          <template #extra>
            <el-button type="primary" @click="$router.push('/student/team')">返回组队中心</el-button>
          </template>
        </el-result>
      </template>

      <template v-else-if="team">
        <div class="invite-hero">
          <div class="team-avatar" :style="avatarStyle">{{ team.name?.charAt(0) }}</div>
          <div>
            <el-tag size="small" effect="plain">组队邀请</el-tag>
            <h1 class="page-title">{{ team.name }}</h1>
            <p class="desc">{{ team.description }}</p>
          </div>
        </div>

        <el-descriptions :column="2" border class="meta">
          <el-descriptions-item label="邀请码">
            <code class="code">{{ code }}</code>
          </el-descriptions-item>
          <el-descriptions-item label="队伍状态">
            <el-tag :type="team.status === '招募中' ? 'success' : 'info'" size="small">
              {{ team.status }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="人数">
            {{ team.currentMembers }}/{{ team.maxMembers }}
          </el-descriptions-item>
          <el-descriptions-item label="队长">
            {{ team.leader?.name || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="比赛 ID">
            {{ team.competitionId }}
          </el-descriptions-item>
        </el-descriptions>

        <div class="actions">
          <el-button @click="$router.push('/student/team')">返回</el-button>
          <el-button
            type="primary"
            :loading="applying"
            :disabled="team.status !== '招募中'"
            @click="handleApply"
          >
            {{ team.status === '招募中' ? '申请加入该队伍' : '暂不可申请' }}
          </el-button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ElMessage } from 'element-plus'
import { apply, getInviteDetail } from '@/api/team'
import { getTeamColor } from '@/utils/avatarStyles'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const applying = ref(false)
const team = ref(null)
const error = ref('')
const code = computed(() => String(route.query.code || '').trim())

const avatarStyle = computed(() => getTeamColor(team.value?.id || 0))

const loadDetail = async () => {
  if (!code.value) {
    error.value = '缺少邀请码参数'
    loading.value = false
    return
  }
  loading.value = true
  error.value = ''
  try {
    const res = await getInviteDetail(code.value)
    team.value = res.data?.team || null
    if (!team.value) error.value = '未找到对应队伍'
  } catch (e) {
    error.value = e.message || '邀请码无效或已过期'
    team.value = null
  } finally {
    loading.value = false
  }
}

const handleApply = async () => {
  applying.value = true
  try {
    await apply(code.value)
    ElMessage.success('申请已提交，请等待队长审核')
    router.push('/student/team?tab=apply')
  } catch (e) {
    ElMessage.error(e.message || '申请失败')
  } finally {
    applying.value = false
  }
}

onMounted(loadDetail)
watch(() => route.query.code, loadDetail)
</script>

<style scoped lang="scss">
.invite-page {
  max-width: 720px;
  margin: 0 auto;
}

.invite-hero {
  display: flex;
  gap: $spacing-md;
  align-items: flex-start;
  margin-bottom: $spacing-lg;

  .team-avatar {
    width: 64px;
    height: 64px;
    border-radius: $radius-lg;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 26px;
    font-weight: 700;
    flex-shrink: 0;
  }

  .page-title {
    margin: $spacing-sm 0 6px;
  }

  .desc {
    margin: 0;
    color: $text-secondary;
    line-height: 1.6;
    font-size: $font-size-base;
  }
}

.meta {
  margin-bottom: $spacing-lg;
}

.code {
  font-family: monospace;
  color: $primary;
  background: $primary-bg;
  padding: 2px 8px;
  border-radius: $radius-sm;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: $spacing-sm;
  flex-wrap: wrap;
}
</style>
