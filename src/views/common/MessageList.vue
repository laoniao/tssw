<template>
  <div class="page-container messages-page">
    <div class="page-header">
      <div>
        <h2 class="page-title">消息中心</h2>
        <p class="page-subtitle">查看系统通知、审核结果与组队邀请</p>
      </div>
      <div class="header-actions">
        <el-button
          type="primary"
          plain
          :disabled="unreadCount === 0"
          @click="handleMarkAll"
        >
          全部标记已读
        </el-button>
        <el-button :loading="loading" @click="refresh">刷新</el-button>
      </div>
    </div>

    <div class="card filter-card">
      <el-radio-group v-model="filterType" @change="handleFilterChange">
        <el-radio-button label="all">全部</el-radio-button>
        <el-radio-button label="system">系统通知</el-radio-button>
        <el-radio-button label="review">审核结果</el-radio-button>
        <el-radio-button label="invite">组队邀请</el-radio-button>
      </el-radio-group>
      <el-radio-group v-model="filterRead" class="read-filter" @change="handleFilterChange">
        <el-radio-button label="all">全部状态</el-radio-button>
        <el-radio-button label="unread">未读</el-radio-button>
        <el-radio-button label="read">已读</el-radio-button>
      </el-radio-group>
    </div>

    <div class="card">
      <el-table :data="pagedList" v-loading="loading">
        <el-table-column label="类型" width="120">
          <template #default="{ row }">
            <el-tag :type="typeTagMap[row.type]" size="small" effect="plain">
              {{ row.typeLabel || typeLabelMap[row.type] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="title" label="标题" min-width="160" show-overflow-tooltip />
        <el-table-column prop="content" label="内容" min-width="260" show-overflow-tooltip />
        <el-table-column prop="time" label="时间" width="180" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.isRead ? 'info' : 'danger'" size="small">
              {{ row.isRead ? '已读' : '未读' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button
              type="primary"
              link
              :disabled="row.isRead"
              @click="handleMarkRead(row)"
            >
              标记已读
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrap">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[5, 10, 20]"
          layout="total, sizes, prev, pager, next"
          :total="filteredList.length"
          background
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/store/user'
import { useMessageStore } from '@/store/message'

const userStore = useUserStore()
const messageStore = useMessageStore()
const { list, loading, unreadCount } = storeToRefs(messageStore)

const filterType = ref('all')
const filterRead = ref('all')
const currentPage = ref(1)
const pageSize = ref(10)

const typeLabelMap = {
  system: '系统通知',
  review: '审核结果',
  invite: '组队邀请',
}

const typeTagMap = {
  system: 'info',
  review: 'success',
  invite: 'warning',
}

const filteredList = computed(() => {
  return list.value.filter(item => {
    const typeOk = filterType.value === 'all' || item.type === filterType.value
    const readOk =
      filterRead.value === 'all' ||
      (filterRead.value === 'unread' && !item.isRead) ||
      (filterRead.value === 'read' && item.isRead)
    return typeOk && readOk
  })
})

const pagedList = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredList.value.slice(start, start + pageSize.value)
})

const refresh = async () => {
  await messageStore.fetchMessages({ role: userStore.role })
}

const handleFilterChange = () => {
  currentPage.value = 1
}

const handleMarkRead = async (row) => {
  await messageStore.markAsRead(row.id)
  ElMessage.success('已标记为已读')
}

const handleMarkAll = async () => {
  await messageStore.markAllAsRead()
  ElMessage.success('已全部标记为已读')
}

onMounted(() => {
  refresh()
})
</script>

<style scoped lang="scss">
.messages-page {
  .header-actions {
    display: flex;
    gap: $spacing-sm;
  }

  .filter-card {
    margin-bottom: $spacing-lg;
    display: flex;
    flex-wrap: wrap;
    gap: $spacing-md;
    align-items: center;

    .read-filter {
      margin-left: auto;
    }
  }

  .pagination-wrap {
    display: flex;
    justify-content: flex-end;
    margin-top: $spacing-md;
  }
}
</style>
