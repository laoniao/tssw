import Mock from 'mockjs'
import { db } from '../db'

const responseTemplate = {
  code: 200,
  message: 'success',
  data: null,
}

const pad = (n) => String(n).padStart(2, '0')

Mock.mock('/api/teacher/dashboard/trend', 'get', () => {
  const apps = db.applications()
  const map = {}
  apps.forEach((a) => {
    const key = String(a.applyTime || '').slice(5, 10)
    if (!key) return
    map[key] = (map[key] || 0) + 1
  })
  const now = new Date()
  const list = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(now.getDate() - i)
    const date = `${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    list.push({
      date,
      fullDate: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
      count: map[date] || 0,
    })
  }
  return { ...responseTemplate, data: { list } }
})

Mock.mock('/api/teacher/dashboard/workload', 'get', () => {
  const apps = db.applications()
  const map = {}
  apps.forEach((a) => {
    const tid = a.teacherId || '未分配'
    map[tid] = (map[tid] || 0) + 1
  })
  const nameMap = {
    t1: '王老师',
    t2: '李老师',
    t3: '赵老师',
    t4: '陈老师',
    't-self': '当前教师',
  }
  const list = Object.entries(map).map(([id, studentCount]) => ({
    teacherName: nameMap[id] || id,
    studentCount,
  }))
  return {
    ...responseTemplate,
    data: {
      list: list.length
        ? list
        : [
            { teacherName: '李老师', studentCount: 0 },
            { teacherName: '王老师', studentCount: 0 },
          ],
    },
  }
})

export default Mock
