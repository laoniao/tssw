import request from '@/utils/request'

// 近 7 日报名趋势
export function trend() {
  return request({
    url: '/teacher/dashboard/trend',
    method: 'get',
  })
}

// 指导教师工作量
export function workload() {
  return request({
    url: '/teacher/dashboard/workload',
    method: 'get',
  })
}
