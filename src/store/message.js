import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getMessageList, markMessageRead, markAllMessagesRead } from '@/api/message'

export const useMessageStore = defineStore('message', () => {
  const list = ref([])
  const loading = ref(false)

  // 未读数量
  const unreadCount = computed(() => list.value.filter(item => !item.isRead).length)

  // 最近 5 条（下拉预览）
  const recentMessages = computed(() => list.value.slice(0, 5))

  // 拉取消息列表
  const fetchMessages = async (params = {}) => {
    loading.value = true
    try {
      const res = await getMessageList(params)
      const data = res.data
      list.value = Array.isArray(data) ? data : (data?.list || [])
      return list.value
    } finally {
      loading.value = false
    }
  }

  // 标记单条已读
  const markAsRead = async (id) => {
    const target = list.value.find(item => item.id === id)
    if (!target || target.isRead) return

    await markMessageRead(id)
    target.isRead = true
  }

  // 全部标记已读
  const markAllAsRead = async () => {
    await markAllMessagesRead()
    list.value.forEach(item => {
      item.isRead = true
    })
  }

  return {
    list,
    loading,
    unreadCount,
    recentMessages,
    fetchMessages,
    markAsRead,
    markAllAsRead,
  }
}, {
  persist: {
    paths: ['list'],
  },
})
