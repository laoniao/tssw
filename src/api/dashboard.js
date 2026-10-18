import request from '@/utils/request'

// 指导教师工作量
export function workload() {
  return request({
    url: '/teacher/dashboard/workload',
    method: 'get',
  })
}
