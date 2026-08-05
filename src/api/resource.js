import request from '@/utils/request'

// 获取资源列表
export function getList(params) {
  return request({
    url: '/teacher/resources',
    method: 'get',
    params,
  })
}

// 上传资源（JSON 元数据；文件通过自定义上传模拟）
export function upload(data) {
  return request({
    url: '/teacher/resources',
    method: 'post',
    data,
  })
}

// 下载资源
export function download(id) {
  return request({
    url: `/teacher/resources/${id}/download`,
    method: 'get',
  })
}

// 删除资源
export function remove(id) {
  return request({
    url: `/teacher/resources/${id}`,
    method: 'delete',
  })
}
