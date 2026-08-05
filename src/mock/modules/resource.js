import Mock from 'mockjs'
import { db, nextId, formatDateTime } from '../db'

const responseTemplate = {
  code: 200,
  message: 'success',
  data: null,
}

const categories = ['文档', '压缩包', '视频', '课件', '其他']

const formatSize = (bytes) => {
  if (!bytes || bytes < 1024) return `${bytes || 0}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

Mock.mock(/\/api\/teacher\/resources(\?.*)?$/, 'get', () => {
  const list = db.resources()
  return {
    ...responseTemplate,
    data: { list: list.map((r) => ({ ...r })), total: list.length },
  }
})

Mock.mock('/api/teacher/resources', 'post', (options) => {
  const body = JSON.parse(options.body || '{}')
  const list = db.resources()
  const id = nextId(list)
  const fileSize = Number(body.fileSize) || 1024 * 200
  const name = body.name || `资源${id}.pdf`
  const item = {
    id,
    name,
    description: body.description || '',
    type: body.type || body.category || '文档',
    fileSize,
    size: formatSize(fileSize),
    downloadCount: 0,
    uploadTime: formatDateTime(new Date()),
    url: `https://example.com/files/${id}/${encodeURIComponent(name)}`,
  }
  list.unshift(item)
  db.saveResources(list)
  return { ...responseTemplate, message: '上传成功', data: item }
})

Mock.mock(/\/api\/teacher\/resources\/\d+\/download$/, 'get', (options) => {
  const id = Number(String(options.url).match(/\/api\/teacher\/resources\/(\d+)\/download/)?.[1])
  const list = db.resources()
  const target = list.find((r) => r.id === id)
  if (!target) return { code: 404, message: '资源不存在', data: null }
  target.downloadCount += 1
  db.saveResources(list)
  return {
    ...responseTemplate,
    data: {
      id: target.id,
      name: target.name,
      url: target.url,
      fileSize: target.fileSize,
      size: target.size,
      downloadCount: target.downloadCount,
    },
  }
})

Mock.mock(/\/api\/teacher\/resources\/\d+$/, 'delete', (options) => {
  const id = Number(String(options.url).match(/\/api\/teacher\/resources\/(\d+)$/)?.[1])
  db.saveResources(db.resources().filter((r) => r.id !== id))
  return { ...responseTemplate, message: '删除成功', data: { success: true, id } }
})

export const resourceCategories = categories
export default categories
