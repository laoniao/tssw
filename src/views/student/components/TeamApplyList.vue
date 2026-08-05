<template>

  <div class="team-apply-list card">

    <div class="toolbar">

      <el-radio-group v-model="statusFilter" size="small">

        <el-radio-button label="all">全部</el-radio-button>

        <el-radio-button label="待审核">待审核</el-radio-button>

        <el-radio-button label="已通过">已通过</el-radio-button>

        <el-radio-button label="已拒绝">已拒绝</el-radio-button>

      </el-radio-group>

      <el-button :loading="loading" @click="loadData">刷新</el-button>

    </div>



    <el-table :data="filteredList" v-loading="loading" empty-text="暂无申请记录">

      <el-table-column prop="teamName" label="队伍名称" min-width="140" show-overflow-tooltip />

      <el-table-column prop="inviteCode" label="邀请码" width="110">

        <template #default="{ row }">

          <code class="code">{{ row.inviteCode || '-' }}</code>

        </template>

      </el-table-column>

      <el-table-column prop="applyTime" label="申请时间" width="180" />

      <el-table-column prop="remark" label="备注" min-width="160" show-overflow-tooltip />

      <el-table-column label="状态" width="110">

        <template #default="{ row }">

          <el-tag :type="statusType(row.status)" size="small">{{ row.status }}</el-tag>

        </template>

      </el-table-column>

    </el-table>

  </div>

</template>



<script setup>

import { ElMessage } from 'element-plus'

import { getMyApplications } from '@/api/team'



const loading = ref(false)

const list = ref([])

const statusFilter = ref('all')



const filteredList = computed(() => {

  if (statusFilter.value === 'all') return list.value

  return list.value.filter(item => item.status === statusFilter.value)

})



const statusType = (status) =>

  ({ 待审核: 'warning', 已通过: 'success', 已拒绝: 'danger' }[status] || 'info')



const loadData = async () => {

  loading.value = true

  try {

    const res = await getMyApplications()

    list.value = res.data?.list || []

  } catch (e) {

    ElMessage.error(e.message || '加载申请失败')

  } finally {

    loading.value = false

  }

}



onMounted(loadData)



defineExpose({ refresh: loadData })

</script>



<style scoped lang="scss">

.team-apply-list {

  .toolbar {

    display: flex;

    align-items: center;

    justify-content: space-between;

    gap: $spacing-md;

    margin-bottom: $spacing-md;

    flex-wrap: wrap;

  }



  .code {

    font-family: monospace;

    color: $primary;

    background: $primary-bg;

    padding: 2px 8px;

    border-radius: $radius-sm;

    font-size: $font-size-sm;

  }

}

</style>

