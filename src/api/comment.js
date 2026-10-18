import request from '@/utils/request'

// 点赞 / 取消点赞作品
export function like(workId, likes) {
  return request({
    url: `/works/${workId}/like`,
    method: 'post',
    data: { likes },
  })
}

// 获取评论列表（树形）
export function getList(workId) {
  return request({
    url: `/works/${workId}/comments`,
    method: 'get',
  })
}

// 发表评论 / 回复
export function add(workId, content, parentId) {
  return request({
    url: `/works/${workId}/comments`,
    method: 'post',
    data: {
      content,
      parentId: parentId || null,
    },
  })
}

