<template>
  <div class="page-container">
    <div class="page-header">
      <div>
        <h1 class="page-title">账号管理</h1>
        <p class="page-subtitle">查看学生端 / 教师端账号，支持按年级、专业筛选，按姓名、学号 / 工号搜索，并可重置密码或删除账号</p>
      </div>
    </div>

    <el-tabs v-model="activeTab" class="account-tabs">
      <el-tab-pane name="student">
        <template #label>
          <span class="tab-label"><el-icon><UserFilled /></el-icon> 学生端账号</span>
        </template>
      </el-tab-pane>
      <el-tab-pane name="teacher">
        <template #label>
          <span class="tab-label"><el-icon><Avatar /></el-icon> 教师端账号</span>
        </template>
      </el-tab-pane>
    </el-tabs>

    <!-- 筛选 / 搜索工具条 -->
    <div class="filter-bar">
      <el-input
        v-model="keyword"
        :placeholder="activeTab === 'student' ? '搜索姓名 / 学号' : '搜索姓名 / 工号'"
        prefix-icon="Search"
        clearable
        class="filter-input-lg"
      />
      <el-select v-if="activeTab === 'student'" v-model="gradeFilter" placeholder="年级" clearable class="filter-select-sm">
        <el-option v-for="g in studentGrades" :key="g" :label="g" :value="g" />
      </el-select>
      <el-select v-if="activeTab === 'student'" v-model="majorFilter" placeholder="专业" clearable class="filter-select-sm">
        <el-option v-for="m in studentMajors" :key="m" :label="m" :value="m" />
      </el-select>
      <el-select v-if="activeTab === 'teacher'" v-model="deptFilter" placeholder="部门" clearable class="filter-select-sm">
        <el-option v-for="d in teacherDepts" :key="d" :label="d" :value="d" />
      </el-select>
      <el-tag type="info" effect="plain" class="count-tag">{{ filteredAccounts.length }} 个账号</el-tag>
    </div>

    <el-table v-loading="loading" :data="pagedAccounts" border stripe class="account-table">
      <el-table-column label="头像" width="70" align="center">
        <template #default="{ row }">
          <div class="row-avatar" :style="getAvatarStyle(row.name)">{{ (row.name || '?').charAt(0) }}</div>
        </template>
      </el-table-column>
      <el-table-column prop="name" label="姓名" min-width="110" />
      <el-table-column :label="activeTab === 'student' ? '学号' : '工号'" min-width="130">
        <template #default="{ row }">{{ row.accountId || row.username }}</template>
      </el-table-column>
      <el-table-column v-if="activeTab === 'student'" prop="grade" label="年级" width="100" />
      <el-table-column :label="activeTab === 'student' ? '专业' : '部门'" min-width="150">
        <template #default="{ row }">{{ activeTab === 'student' ? row.major : row.department }}</template>
      </el-table-column>
      <el-table-column prop="gender" label="性别" width="80" v-if="activeTab === 'student'" />
      <el-table-column prop="email" label="邮箱" min-width="160" show-overflow-tooltip />
      <el-table-column label="角色" width="100">
        <template #default="{ row }">
          <el-tag :type="row.role === 'student' ? 'primary' : 'warning'" size="small">
            {{ row.role === 'student' ? '学生' : '教师' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="170" fixed="right">
        <template #default="{ row }">
          <el-button
            v-if="!row.system"
            type="primary"
            link
            :loading="resetId === row.id"
            @click="handleReset(row)"
          >重置密码</el-button>
          <el-button
            v-if="!row.system"
            type="danger"
            link
            :loading="deleteId === row.id"
            @click="handleDelete(row)"
          >删除</el-button>
          <el-tag v-if="row.system" type="info" size="small" effect="plain">系统内置</el-tag>
        </template>
      </el-table-column>
    </el-table>

    <div class="pager">
      <el-pagination
        v-model:current-page="page"
        :page-size="pageSize"
        :total="filteredAccounts.length"
        layout="prev, pager, next"
        background
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getAccounts, resetAccountPassword, deleteAccount } from '@/api'
import { getAvatarStyle } from '@/utils/avatarStyles'

const activeTab = ref('student')
const loading = ref(false)
const allAccounts = ref([])

const keyword = ref('')
const gradeFilter = ref('')
const majorFilter = ref('')
const deptFilter = ref('')

const resetId = ref('')
const deleteId = ref('')

const page = ref(1)
const pageSize = 8

const fetchAccounts = async () => {
  loading.value = true
  try {
    const res = await getAccounts({ role: activeTab.value })
    allAccounts.value = res.data?.list || []
  } finally {
    loading.value = false
  }
}

onMounted(fetchAccounts)

watch(activeTab, () => {
  page.value = 1
  gradeFilter.value = ''
  majorFilter.value = ''
  deptFilter.value = ''
  keyword.value = ''
  fetchAccounts()
})

const studentGrades = computed(() =>
  [...new Set(allAccounts.value.filter(a => a.role === 'student').map(a => a.grade).filter(Boolean))],
)
const studentMajors = computed(() =>
  [...new Set(allAccounts.value.filter(a => a.role === 'student').map(a => a.major).filter(Boolean))],
)
const teacherDepts = computed(() =>
  [...new Set(allAccounts.value.filter(a => a.role === 'teacher').map(a => a.department).filter(Boolean))],
)

const filteredAccounts = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  return allAccounts.value.filter((a) => {
    const matchKw = !kw
      || (a.name || '').toLowerCase().includes(kw)
      || (a.accountId || a.username || '').toLowerCase().includes(kw)
    const matchGrade = !gradeFilter.value || a.grade === gradeFilter.value
    const matchMajor = !majorFilter.value || a.major === majorFilter.value
    const matchDept = !deptFilter.value || a.department === deptFilter.value
    return matchKw && matchGrade && matchMajor && matchDept
  })
})

const pagedAccounts = computed(() => {
  const start = (page.value - 1) * pageSize
  return filteredAccounts.value.slice(start, start + pageSize)
})

watch([filteredAccounts], () => {
  const maxPage = Math.max(1, Math.ceil(filteredAccounts.value.length / pageSize))
  if (page.value > maxPage) page.value = maxPage
})

const handleReset = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定将「${row.name}」的密码重置为默认 123456 吗？`,
      '重置密码',
      { confirmButtonText: '确定重置', cancelButtonText: '取消', type: 'warning' },
    )
  } catch {
    return
  }
  resetId.value = row.id
  try {
    await resetAccountPassword(row.id)
    ElMessage.success(`已重置「${row.name}」的密码为 123456`)
  } finally {
    resetId.value = ''
  }
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(
      `删除后该账号将无法登录且数据不可恢复，确定删除「${row.name}」吗？`,
      '删除账号',
      { confirmButtonText: '确定删除', cancelButtonText: '取消', type: 'danger' },
    )
  } catch {
    return
  }
  deleteId.value = row.id
  try {
    await deleteAccount(row.id)
    ElMessage.success(`已删除账号「${row.name}」`)
    await fetchAccounts()
  } finally {
    deleteId.value = ''
  }
}
</script>

<style scoped lang="scss">
.tab-label {
  display: flex;
  align-items: center;
  gap: 6px;
}

.account-tabs {
  :deep(.el-tabs__header) { margin-bottom: $spacing-lg; }
}

.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-sm;
  align-items: center;
  margin-bottom: $spacing-lg;

  .filter-input-lg { width: 260px; }
  .filter-select-sm { width: 140px; }
  .count-tag { margin-left: auto; }
}

.account-table {
  border-radius: $radius-lg;
  overflow: hidden;

  .row-avatar {
    width: 34px; height: 34px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    font-weight: 700;
    color: #fff;
    margin: 0 auto;
  }
}

.pager {
  display: flex;
  justify-content: center;
  margin-top: $spacing-lg;
}
</style>
