import Mock from 'mockjs'
import { db, nextId, formatDateTime } from '../db'

const responseTemplate = {
  code: 200,
  message: 'success',
  data: null,
}

/** 写入一条消息到持久化库 */
export function pushMessage({ type = 'system', typeLabel, title, content, role = 'student', userId = '', userName = '' }) {
  const list = db.messages()
  const item = {
    id: nextId(list),
    type,
    typeLabel: typeLabel || ({ system: '系统通知', review: '审核结果', invite: '组队邀请' }[type] || '系统通知'),
    title,
    content,
    time: formatDateTime(new Date()),
    isRead: false,
    role,
    userId: userId || '',
    userName: userName || '',
  }
  list.unshift(item)
  db.saveMessages(list)
  return item
}

Mock.mock(/\/api\/messages(\?.*)?$/, 'get', () => {
  let role = 'student'
  let userName = ''
  let userId = ''
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}')?.userInfo || {}
    role = localStorage.getItem('role') || 'student'
    userName = user.username || ''
    userId = user.id || user.teacherId || user.studentId || ''
  } catch { /* ignore */ }

  const list = db.messages()
    .filter((item) => {
      if (item.role && item.role !== role) return false
      // 定向消息：有目标用户时仅本人可见；无目标则广播给该角色
      if (item.userId || item.userName) {
        return item.userId === userId
          || item.userName === userName
          || (!userName && !userId)
      }
      return true
    })
    .map((item) => ({ ...item }))
  return {
    ...responseTemplate,
    data: { list, total: list.length },
  }
})

Mock.mock('/api/messages/read-all', 'put', () => {
  const list = db.messages()
  list.forEach((item) => { item.isRead = true })
  db.saveMessages(list)
  return { ...responseTemplate, data: { success: true } }
})

Mock.mock(/\/api\/messages\/\d+\/read/, 'put', (options) => {
  const id = Number(String(options.url).match(/\/api\/messages\/(\d+)\/read/)?.[1])
  const list = db.messages()
  const target = list.find((item) => item.id === id)
  if (target) target.isRead = true
  db.saveMessages(list)
  return { ...responseTemplate, data: { success: true, id } }
})

export default Mock
