import request from '@/utils/request'

// 获取消息列表
export function getMessageList(params) {
  return request({
    url: '/messages',
    method: 'get',
    params,
  })
}

// 标记单条消息已读
export function markMessageRead(id) {
  return request({
    url: `/messages/${id}/read`,
    method: 'put',
  })
}

// 全部标记已读
export function markAllMessagesRead() {
  return request({
    url: '/messages/read-all',
    method: 'put',
  })
}
