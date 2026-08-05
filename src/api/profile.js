import request from '@/utils/request'

// 更新个人资料
export function update(data) {
  return request({
    url: '/profile',
    method: 'put',
    data,
  })
}

// 获取专业列表
export function getMajors() {
  return request({
    url: '/profile/majors',
    method: 'get',
  })
}
