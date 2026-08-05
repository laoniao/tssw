import Mock from 'mockjs'
import { db, DEFAULT_AVATAR, nextId, formatDateTime } from './db'
import { pushMessage } from './modules/message'
import './modules/profile'
import './modules/comment'
import './modules/resource'
import './modules/dashboard'
import './modules/team'

// 模拟延迟
Mock.setup({
  timeout: '200-600',
})

// 通用响应格式
const responseTemplate = {
  code: 200,
  message: 'success',
  data: null,
}

// ==================== 学生端模拟数据 ====================

const getRegisteredUsers = () => JSON.parse(localStorage.getItem('registeredUsers') || '[]')
const saveRegisteredUsers = (list) => localStorage.setItem('registeredUsers', JSON.stringify(list))

/** 从 Pinia 持久化数据读取当前登录用户 */
const getPersistedUserInfo = () => {
  try {
    const raw = localStorage.getItem('user')
    if (!raw) return null
    const data = JSON.parse(raw)
    return data?.userInfo || null
  } catch {
    return null
  }
}

// 学生登录
Mock.mock('/api/student/login', 'post', (options) => {
  const { username, password } = JSON.parse(options.body)
  // 内置测试账号
  if (username === 'student' && password === '123456') {
    return {
      ...responseTemplate,
      data: {
        token: 'student-token-' + Mock.Random.guid(),
        userInfo: {
          id: 'builtin-student',
          username: '张同学',
          studentId: '2021001',
          major: '计算机科学与技术',
          grade: '大三',
          email: 'student@example.com',
          phone: '138****8888',
          avatar: DEFAULT_AVATAR,
        },
      },
    }
  }
  // 检查注册用户
  const registeredUsers = getRegisteredUsers()
  const user = registeredUsers.find(u => u.role === 'student' && u.username === username && u.password === password)
  if (user) {
    return {
      ...responseTemplate,
      data: {
        token: 'student-token-' + Mock.Random.guid(),
        userInfo: {
          id: user.id || Mock.Random.id(),
          username: user.name,
          studentId: username,
          major: user.major,
          grade: user.grade,
          email: user.email || '',
          phone: user.phone || '',
          avatar: user.avatar || DEFAULT_AVATAR,
          bio: user.bio || '',
        },
      },
    }
  }
  return {
    code: 401,
    message: '用户名或密码错误',
    data: null,
  }
})

// 学生注册
Mock.mock('/api/student/register', 'post', (options) => {
  const { username, password, name, major, grade, gender, email } = JSON.parse(options.body)
  const registeredUsers = getRegisteredUsers()
  if (registeredUsers.find(u => u.role === 'student' && u.username === username)) {
    return { code: 400, message: '该学号已注册', data: null }
  }
  const id = Mock.Random.id()
  registeredUsers.push({
    role: 'student', id, username, password, name, major, grade, gender, email, avatar: DEFAULT_AVATAR,
  })
  saveRegisteredUsers(registeredUsers)
  return {
    ...responseTemplate,
    data: {
      token: 'student-token-' + Mock.Random.guid(),
      userInfo: {
        id,
        username: name,
        studentId: username,
        major,
        grade,
        gender,
        email: email || '',
        phone: '',
        avatar: DEFAULT_AVATAR,
      },
    },
  }
})

// ==================== 比赛（持久化） ====================
Mock.mock('/api/competitions', 'get', () => ({
  ...responseTemplate,
  data: { list: db.competitions() },
}))

Mock.mock(/\/api\/competitions\/\d+$/, 'get', (options) => {
  const id = parseInt(String(options.url).split('/').pop(), 10)
  const list = db.competitions()
  const competition = list.find((c) => c.id === id)
  return {
    ...responseTemplate,
    data: competition || list[0] || null,
  }
})

/** 通知队伍全体成员 */
const notifyTeamMembers = (team, { title, content }) => {
  const people = [
    team.leader,
    ...(team.members || []),
  ].filter(Boolean)
  const seen = new Set()
  people.forEach((p) => {
    const key = p.id || p.name
    if (!key || seen.has(key)) return
    seen.add(key)
    pushMessage({
      type: 'review',
      typeLabel: '审核结果',
      title,
      content,
      role: 'student',
      userId: p.id || '',
      userName: p.name || '',
    })
  })
}

/** 通知指定带队老师 */
const notifyLeadTeachers = (teachers, { title, content }) => {
  ;(teachers || []).forEach((t) => {
    pushMessage({
      type: 'review',
      typeLabel: '审核提醒',
      title,
      content,
      role: 'teacher',
      userId: t.id || '',
      userName: t.name || '',
    })
  })
}

// 队长确认队伍后申请带队老师（新报名流）
Mock.mock('/api/competitions/team-register', 'post', (options) => {
  const body = JSON.parse(options.body || '{}')
  const competitionId = Number(body.competitionId || body.id)
  const teamId = Number(body.teamId)
  const list = db.competitions()
  const comp = list.find((c) => c.id === competitionId)
  if (!comp) return { code: 404, message: '比赛不存在', data: null }
  if (comp.status === '已结束') return { code: 400, message: '比赛已结束，无法报名', data: null }

  const approvedCount = db.teams().filter(
    (t) => t.competitionId === competitionId && t.auditStatus === '已通过',
  ).length
  const maxTeams = Number(comp.maxTeams) || 40
  if (approvedCount >= maxTeams) {
    return { code: 400, message: '本场比赛参赛队伍已满', data: null }
  }

  const teams = db.teams()
  const team = teams.find((t) => t.id === teamId)
  if (!team) return { code: 404, message: '队伍不存在', data: null }

  const user = getPersistedUserInfo()
  if (user?.username && team.leader?.name !== user.username) {
    return { code: 403, message: '仅队长可为队伍申请带队老师', data: null }
  }

  if (team.auditStatus === '待审核' && team.competitionId) {
    return { code: 400, message: '该队伍已有待审核的参赛申请', data: null }
  }
  if (team.auditStatus === '已通过' && team.competitionId === competitionId) {
    return { code: 400, message: '该队伍已通过本场比赛审核', data: null }
  }

  const maxLead = Number(comp.maxLeadTeachers) || 1
  let teacherIds = body.teacherIds || (body.teacherId != null ? [body.teacherId] : [])
  teacherIds = [...new Set(teacherIds.map(String))].filter(Boolean)
  if (!teacherIds.length) return { code: 400, message: '请选择带队老师', data: null }
  if (teacherIds.length > maxLead) {
    return { code: 400, message: `每支队伍最多可选 ${maxLead} 位带队老师`, data: null }
  }

  const available = comp.teachers || []
  const selected = teacherIds.map((tid) => available.find((t) => String(t.id) === String(tid))).filter(Boolean)
  if (selected.length !== teacherIds.length) {
    return { code: 400, message: '所选带队老师不在本场比赛可选范围内', data: null }
  }

  team.competitionId = competitionId
  team.leaderTeachers = selected.map((t) => ({
    id: t.id,
    name: t.name,
    title: t.title || '带队教师',
    department: t.department || '',
  }))
  team.auditStatus = '待审核'
  team.rejectReason = ''
  team.applyTime = formatDateTime(new Date())
  db.saveTeams(teams)

  comp.teamCount = db.teams().filter(
    (t) => t.competitionId === competitionId && ['待审核', '已通过'].includes(t.auditStatus),
  ).length
  db.saveCompetitions(list)

  notifyLeadTeachers(selected, {
    title: '收到队伍带队申请',
    content: `「${team.name}」申请参加「${comp.name}」并由您带队，请前往队伍审核处理。`,
  })

  return { ...responseTemplate, data: { success: true, team } }
})

// 兼容旧个人报名接口（队伍参赛请使用 team-register）
Mock.mock('/api/competitions/register', 'post', (options) => {
  const body = JSON.parse(options.body || '{}')
  const competitionId = Number(body.competitionId || body.id)
  const list = db.competitions()
  const comp = list.find((c) => c.id === competitionId)
  if (!comp) return { code: 404, message: '比赛不存在', data: null }
  if (comp.status === '已结束') return { code: 400, message: '比赛已结束，无法报名', data: null }

  const persisted = getPersistedUserInfo() || {}
  const apps = db.applications()
  const studentId = persisted.studentId || 'guest'
  const exists = apps.find(
    (a) => a.competition?.id === competitionId && a.student?.studentId === studentId,
  )
  if (exists) return { code: 400, message: '您已报名该比赛', data: null }

  const teacher = (comp.teachers || []).find((t) => t.id === body.teacherId) || (comp.teachers || [])[0]
  apps.unshift({
    id: nextId(apps),
    student: {
      id: persisted.id || studentId,
      name: persisted.username || '同学',
      studentId,
      major: persisted.major || '',
      grade: persisted.grade || '',
      gender: persisted.gender || '',
      avatar: persisted.avatar || DEFAULT_AVATAR,
    },
    competition: { id: comp.id, name: comp.name },
    teacherId: teacher?.id || '',
    status: '待审核',
    applyTime: formatDateTime(new Date()),
    reason: body.reason || '申请参赛',
  })
  db.saveApplications(apps)

  comp.participantCount = (comp.participantCount || 0) + 1
  db.saveCompetitions(list)

  return { ...responseTemplate, data: { success: true } }
})

// 智能推荐（固定数据）
Mock.mock('/api/recommendations', 'get', () => ({
  ...responseTemplate,
  data: db.recommendations(),
}))

// 作品展示（固定数据）
Mock.mock('/api/works', 'get', () => ({
  ...responseTemplate,
  data: { list: db.works() },
}))

// 作品点赞 / 评论 Mock 见 ./modules/comment.js

// 个人中心数据（优先返回当前登录/注册用户，避免始终显示张同学）
Mock.mock('/api/student/profile', 'get', () => {
  const persisted = getPersistedUserInfo()
  const registeredUsers = getRegisteredUsers()
  let userInfo = null

  if (persisted?.studentId || persisted?.username) {
    const studentId = persisted.studentId || ''
    const reg = registeredUsers.find(
      (u) => u.role === 'student' && (u.username === studentId || u.name === persisted.username),
    )
    if (reg) {
      userInfo = {
        id: reg.id || persisted.id,
        username: reg.name,
        studentId: reg.username,
        major: reg.major,
        grade: reg.grade,
        email: reg.email || persisted.email || '',
        phone: reg.phone || persisted.phone || '',
        avatar: reg.avatar || persisted.avatar || DEFAULT_AVATAR,
        bio: reg.bio || persisted.bio || '',
      }
    } else if (persisted.studentId === '2021001' || persisted.username === '张同学') {
      userInfo = {
        id: 'builtin-student',
        username: '张同学',
        studentId: '2021001',
        major: '计算机科学与技术',
        grade: '大三',
        email: 'student@example.com',
        phone: '138****8888',
        avatar: DEFAULT_AVATAR,
      }
    } else {
      userInfo = {
        id: persisted.id,
        username: persisted.username,
        studentId: persisted.studentId || '',
        major: persisted.major || '',
        grade: persisted.grade || '',
        email: persisted.email || '',
        phone: persisted.phone || '',
        avatar: persisted.avatar || DEFAULT_AVATAR,
        bio: persisted.bio || '',
      }
    }
  }

  if (!userInfo) {
    userInfo = {
      id: 'builtin-student',
      username: '张同学',
      studentId: '2021001',
      major: '计算机科学与技术',
      grade: '大三',
      email: 'student@example.com',
      phone: '138****8888',
      avatar: DEFAULT_AVATAR,
    }
  }

  const isBuiltin = userInfo.studentId === '2021001'
  const myApps = db.applications().filter(
    (a) => (a.student?.studentId || '') === userInfo.studentId,
  )

  // 真实参赛历史：从本人报名记录派生
  const rawHistory = myApps.map((a) => ({
    id: a.id,
    name: a.competition?.name || '未知比赛',
    status: a.status || '待审核',
    year: (a.applyTime || '').slice(0, 4) || '-',
    teamName: a.teamName || '-',
  }))
  const competitionHistory = {
    list: rawHistory.length
      ? rawHistory
      : isBuiltin
        ? [
            { id: 1, name: '程序设计校内选拔赛', status: '二等奖', year: '2025', teamName: '算法突击队' },
            { id: 2, name: '智能硬件创新设计大赛', status: '参与奖', year: '2024', teamName: '星火硬件队' },
          ]
        : [],
  }

  // 真实指导老师：从已分配指导的申请派生
  const teacherPool = [
    ...BUILTIN_LEAD_TEACHERS.map((t) => ({ ...t })),
    ...getRegisteredUsers()
      .filter((u) => u.role === 'teacher')
      .map((u) => ({
        id: u.id || u.username,
        name: u.name,
        title: u.title || '带队教师',
        department: u.department || '',
        avatar: u.avatar || DEFAULT_AVATAR,
      })),
  ]
  const teacherMap = new Map()
  myApps.forEach((a) => {
    if (a.guideAssigned && a.teacherId != null) {
      const t = teacherPool.find((x) => String(x.id) === String(a.teacherId))
      if (t && !teacherMap.has(String(t.id))) {
        teacherMap.set(String(t.id), {
          id: t.id,
          name: t.name,
          title: t.title,
          department: t.department,
          avatar: t.avatar,
        })
      }
    }
  })
  const myTeachers = {
    list: teacherMap.size
      ? [...teacherMap.values()]
      : isBuiltin
        ? [
            { id: 't2', name: '李老师', title: '管理员', department: '计算机', avatar: DEFAULT_AVATAR },
            { id: 't1', name: '王老师', title: '带队教师', department: '自动化', avatar: DEFAULT_AVATAR },
          ]
        : [],
  }

  const myTeams = db.teams().filter((t) => {
    if (isBuiltin) return t.id <= 2
    const name = userInfo.username
    return t.leader?.name === name || (t.members || []).some((m) => m.name === name)
  })
  return {
    ...responseTemplate,
    data: {
      userInfo,
      competitionHistory,
      myTeams,
      myTeachers,
    },
  }
})

// ==================== 教师端模拟数据 ====================

// 教师登录
// admin / 123456 → 管理员老师（全部菜单）
// 新注册教师 → 带队教师（可审核报名与队伍）
Mock.mock('/api/teacher/login', 'post', (options) => {
  const { username, password } = JSON.parse(options.body)
  // 管理员老师账号
  if (username === 'admin' && password === '123456') {
    return {
      ...responseTemplate,
      data: {
        token: 'teacher-token-admin-' + Mock.Random.guid(),
        userInfo: {
          id: 'builtin-admin',
          username: '管理员',
          teacherId: 'admin',
          teacherType: 'admin',
          title: '管理员',
          avatar: DEFAULT_AVATAR,
        },
      },
    }
  }
  // 兼容旧测试账号，同样视为管理员
  if (username === 'teacher' && password === '123456') {
    return {
      ...responseTemplate,
      data: {
        token: 'teacher-token-admin-' + Mock.Random.guid(),
        userInfo: {
          id: 'builtin-teacher',
          username: '李老师',
          teacherId: 'T001',
          teacherType: 'admin',
          title: '管理员',
          avatar: DEFAULT_AVATAR,
        },
      },
    }
  }
  // 内置带队教师账号（用于队伍审核演示）
  if (username === 'leader' && password === '123456') {
    return {
      ...responseTemplate,
      data: {
        token: 'teacher-token-leader-' + Mock.Random.guid(),
        userInfo: {
          id: 't1',
          username: '王老师',
          teacherId: 'leader',
          teacherType: 'leader',
          title: '带队教师',
          department: '自动化',
          avatar: DEFAULT_AVATAR,
        },
      },
    }
  }
  // 检查注册用户（默认为带队教师）
  const registeredUsers = getRegisteredUsers()
  const user = registeredUsers.find(u => u.role === 'teacher' && u.username === username && u.password === password)
  if (user) {
    return {
      ...responseTemplate,
      data: {
        token: 'teacher-token-' + Mock.Random.guid(),
        userInfo: {
          id: user.id || Mock.Random.id(),
          username: user.name,
          teacherId: username,
          teacherType: user.teacherType || 'leader',
          title: user.title || '带队教师',
          email: user.email || '',
          avatar: user.avatar || DEFAULT_AVATAR,
        },
      },
    }
  }
  return {
    code: 401,
    message: '用户名或密码错误',
    data: null,
  }
})

// 教师注册 → 默认带队教师
Mock.mock('/api/teacher/register', 'post', (options) => {
  const { username, password, name, email } = JSON.parse(options.body)
  const registeredUsers = getRegisteredUsers()
  if (username === 'admin' || username === 'teacher') {
    return { code: 400, message: '该工号为系统保留账号', data: null }
  }
  if (registeredUsers.find(u => u.role === 'teacher' && u.username === username)) {
    return { code: 400, message: '该工号已注册', data: null }
  }
  const id = Mock.Random.id()
  registeredUsers.push({
    role: 'teacher',
    id,
    username,
    password,
    name,
    email,
    teacherType: 'leader',
    title: '带队教师',
    avatar: DEFAULT_AVATAR,
  })
  saveRegisteredUsers(registeredUsers)
  return {
    ...responseTemplate,
    data: {
      token: 'teacher-token-' + Mock.Random.guid(),
      userInfo: {
        id,
        username: name,
        teacherId: username,
        teacherType: 'leader',
        title: '带队教师',
        email: email || '',
        avatar: DEFAULT_AVATAR,
      },
    },
  }
})

// 教师比赛列表（全部持久化数据）
Mock.mock('/api/teacher/competitions', 'get', () => ({
  ...responseTemplate,
  data: { list: db.competitions() },
}))

// 发布比赛
Mock.mock('/api/teacher/competitions', 'post', (options) => {
  const body = JSON.parse(options.body || '{}')
  const list = db.competitions()
  const range = body.dateRange || []
  const teachers = Array.isArray(body.teachers) ? body.teachers : []
  const item = {
    id: nextId(list),
    name: body.name || '未命名比赛',
    description: body.description || '',
    cover: body.cover || '',
    status: body.status || '报名中',
    category: body.category || '创新类',
    startTime: formatDateTime(body.startTime || range[0] || new Date()),
    endTime: formatDateTime(body.endTime || range[1] || new Date()),
    participantCount: 0,
    maxParticipants: Number(body.maxParticipants) || 100,
    maxTeams: Number(body.maxTeams) || 40,
    maxLeadTeachers: Math.max(1, Number(body.maxLeadTeachers) || 1),
    teamCount: 0,
    rules: body.rules || '',
    teachers,
  }
  list.unshift(item)
  db.saveCompetitions(list)
  return { ...responseTemplate, data: item }
})

// 编辑比赛
Mock.mock(/\/api\/teacher\/competitions\/\d+$/, 'put', (options) => {
  const id = parseInt(String(options.url).match(/\/api\/teacher\/competitions\/(\d+)/)?.[1], 10)
  const body = JSON.parse(options.body || '{}')
  const list = db.competitions()
  const idx = list.findIndex((c) => c.id === id)
  if (idx < 0) return { code: 404, message: '比赛不存在', data: null }
  const range = body.dateRange || []
  list[idx] = {
    ...list[idx],
    ...body,
    id,
    startTime: formatDateTime(body.startTime || range[0] || list[idx].startTime),
    endTime: formatDateTime(body.endTime || range[1] || list[idx].endTime),
    maxParticipants: Number(body.maxParticipants) || list[idx].maxParticipants,
    maxTeams: Number(body.maxTeams) || list[idx].maxTeams || 40,
    maxLeadTeachers: Math.max(1, Number(body.maxLeadTeachers) || list[idx].maxLeadTeachers || 1),
    teachers: Array.isArray(body.teachers) ? body.teachers : (list[idx].teachers || []),
  }
  delete list[idx].dateRange
  db.saveCompetitions(list)
  return { ...responseTemplate, data: list[idx] }
})

// 下架 / 重新发布
Mock.mock(/\/api\/teacher\/competitions\/\d+\/status$/, 'put', (options) => {
  const id = parseInt(String(options.url).match(/\/api\/teacher\/competitions\/(\d+)/)?.[1], 10)
  const body = JSON.parse(options.body || '{}')
  const list = db.competitions()
  const item = list.find((c) => c.id === id)
  if (!item) return { code: 404, message: '比赛不存在', data: null }
  if (body.status === 'offline' || body.status === '已结束') {
    item.status = item.status === '已结束' ? '报名中' : '已结束'
  } else if (body.status) {
    item.status = body.status
  }
  db.saveCompetitions(list)
  return { ...responseTemplate, data: item }
})

// 删除比赛
Mock.mock(/\/api\/teacher\/competitions\/\d+$/, 'delete', (options) => {
  const id = parseInt(String(options.url).match(/\/api\/teacher\/competitions\/(\d+)/)?.[1], 10)
  const list = db.competitions().filter((c) => c.id !== id)
  db.saveCompetitions(list)
  return { ...responseTemplate, data: { success: true, id } }
})

// 报名学生列表（扁平 list，兼容旧的 list.list 读取）
Mock.mock('/api/teacher/applications', 'get', () => {
  const list = db.applications()
  return {
    ...responseTemplate,
    data: { list, total: list.length },
  }
})

// 审核报名
Mock.mock('/api/teacher/applications/audit', 'post', (options) => {
  const body = JSON.parse(options.body || '{}')
  const ids = body.ids || (body.id != null ? [body.id] : [])
  const status = body.status || (body.action === 'reject' ? '已拒绝' : '已通过')
  const list = db.applications()
  ids.forEach((id) => {
    const row = list.find((a) => String(a.id) === String(id))
    if (row) row.status = status
  })
  db.saveApplications(list)
  return { ...responseTemplate, data: { success: true } }
})

/** 内置演示带队老师（管理员可将其分配到比赛） */
const BUILTIN_LEAD_TEACHERS = [
  { id: 't1', name: '王老师', title: '带队教师', department: '自动化', avatar: DEFAULT_AVATAR, maxStudents: 15, currentStudents: 0 },
  { id: 't3', name: '赵老师', title: '带队教师', department: '电气工程', avatar: DEFAULT_AVATAR, maxStudents: 12, currentStudents: 0 },
  { id: 't4', name: '陈老师', title: '带队教师', department: '建筑电气', avatar: DEFAULT_AVATAR, maxStudents: 10, currentStudents: 0 },
]

// 管理员获取可选带队老师列表（带队老师本人不可配置自己可带的比赛）
Mock.mock('/api/teacher/leader-teachers', 'get', () => {
  const registered = getRegisteredUsers()
    .filter((u) => u.role === 'teacher' && (u.teacherType || 'leader') === 'leader')
    .map((u) => ({
      id: u.id || u.username,
      name: u.name,
      title: u.title || '带队教师',
      department: u.department || '',
      avatar: u.avatar || DEFAULT_AVATAR,
      maxStudents: 20,
      currentStudents: 0,
      teacherId: u.username,
    }))
  const map = new Map()
  ;[...BUILTIN_LEAD_TEACHERS, ...registered].forEach((t) => {
    if (!map.has(String(t.id))) map.set(String(t.id), t)
  })
  return { ...responseTemplate, data: { list: [...map.values()] } }
})

// 队伍审核列表：仅带队老师可见自己收到的申请（管理员无组队审核权）
Mock.mock('/api/teacher/teams-audit', 'get', () => {
  const user = getPersistedUserInfo()
  if (user?.teacherType === 'admin') {
    return { ...responseTemplate, data: { list: [], total: 0, disabled: true } }
  }
  const comps = db.competitions()
  const teacherKey = user?.id || user?.teacherId || ''
  const teacherName = user?.username || ''
  const list = db.teams()
    .filter((t) => {
      if (!t.auditStatus) return false
      const teachers = t.leaderTeachers || []
      if (!teachers.length) return false
      return teachers.some(
        (lt) => String(lt.id) === String(teacherKey)
          || String(lt.id) === String(user?.teacherId)
          || lt.name === teacherName,
      )
    })
    .map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      status: t.auditStatus || '待审核',
      applyTime: t.applyTime || t.createdAt,
      rejectReason: t.rejectReason || '',
      leaderTeachers: t.leaderTeachers || [],
      competition: {
        id: t.competitionId,
        name: comps.find((c) => c.id === t.competitionId)?.name || `比赛${t.competitionId}`,
      },
      members: {
        list: [
          ...(t.leader ? [{ ...t.leader, studentId: '-', major: '-', role: '队长' }] : []),
          ...(t.members || []).map((m) => ({ ...m, role: '队员' })),
        ],
      },
    }))
  return { ...responseTemplate, data: { list, total: list.length } }
})

// 带队老师审核队伍：通过/拒绝后通知学生；拒绝后解除比赛绑定以便重新申请
Mock.mock('/api/teacher/teams-audit', 'post', (options) => {
  const body = JSON.parse(options.body || '{}')
  const user = getPersistedUserInfo()
  if (user?.teacherType === 'admin') {
    return { code: 403, message: '管理员无权审核学生组队申请，请由带队老师处理', data: null }
  }

  const id = body.id
  const finalStatus = (body.action === 'reject' || body.status === '已拒绝')
    ? '已拒绝'
    : '已通过'

  const teams = db.teams()
  const team = teams.find((t) => String(t.id) === String(id))
  if (!team) return { code: 404, message: '队伍不存在', data: null }

  const comps = db.competitions()
  const comp = comps.find((c) => c.id === team.competitionId)
  const compName = comp?.name || '比赛'

  if (finalStatus === '已通过') {
    const approvedCount = teams.filter(
      (t) => t.competitionId === team.competitionId && t.auditStatus === '已通过' && t.id !== team.id,
    ).length
    const maxTeams = Number(comp?.maxTeams) || 40
    if (approvedCount >= maxTeams) {
      return { code: 400, message: '本场比赛参赛队伍名额已满', data: null }
    }
    team.auditStatus = '已通过'
    team.rejectReason = ''
    db.saveTeams(teams)
    if (comp) {
      comp.teamCount = teams.filter(
        (t) => t.competitionId === comp.id && t.auditStatus === '已通过',
      ).length
      db.saveCompetitions(comps)
    }
    notifyTeamMembers(team, {
      title: '队伍审核已通过',
      content: `您的队伍「${team.name}」参加「${compName}」的申请已通过，带队老师已确认。`,
    })
  } else {
    const reason = body.reason || ''
    team.auditStatus = '已拒绝'
    team.rejectReason = reason
    db.saveTeams(teams)
    if (comp) {
      comp.teamCount = teams.filter(
        (t) => t.competitionId === comp.id && ['待审核', '已通过'].includes(t.auditStatus),
      ).length
      db.saveCompetitions(comps)
    }
    notifyTeamMembers(team, {
      title: '队伍审核未通过',
      content: `您的队伍「${team.name}」参加「${compName}」的申请已被拒绝。${reason ? `原因：${reason}` : '请调整队伍信息后可重新申请。'}`,
    })
  }

  return { ...responseTemplate, data: { success: true, status: finalStatus } }
})

// 指导分配（记录到申请上）
Mock.mock('/api/teacher/guide-assign', 'post', (options) => {
  const body = JSON.parse(options.body || '{}')
  const apps = db.applications()
  const row = apps.find((a) => String(a.id) === String(body.applicationId || body.id))
  if (row) {
    row.teacherId = body.teacherId || row.teacherId
    row.guideAssigned = true
    db.saveApplications(apps)
  }
  return { ...responseTemplate, data: { success: true } }
})

// 指导分配：可选指导教师池（真实账号，currentStudents 由已分配记录统计）
Mock.mock('/api/teacher/guide-teachers', 'get', () => {
  const apps = db.applications()
  const registered = getRegisteredUsers()
    .filter((u) => u.role === 'teacher')
    .map((u) => ({
      id: u.id || u.username,
      name: u.name,
      title: u.title || '带队教师',
      department: u.department || '',
      avatar: u.avatar || DEFAULT_AVATAR,
      maxStudents: 20,
    }))
  const pool = [...BUILTIN_LEAD_TEACHERS.map((t) => ({ ...t })), ...registered]
  const map = new Map()
  pool.forEach((t) => {
    if (!map.has(String(t.id))) map.set(String(t.id), { ...t, currentStudents: 0 })
  })
  apps.forEach((a) => {
    if (a.guideAssigned && a.teacherId != null) {
      const t = map.get(String(a.teacherId))
      if (t) t.currentStudents += 1
    }
  })
  return { ...responseTemplate, data: { list: [...map.values()] } }
})

// 数据看板：基于真实持久化数据汇总
Mock.mock('/api/teacher/statistics', 'get', () => {
  const comps = db.competitions()
  const apps = db.applications()
  const teams = db.teams()
  const majorMap = {}
  apps.forEach((a) => {
    const m = a.student?.major || '未填写'
    majorMap[m] = (majorMap[m] || 0) + 1
  })

  // 性别比例：按学生去重后统计真实性别
  const genderMap = { 男: 0, 女: 0 }
  const seenStudent = new Set()
  apps.forEach((a) => {
    const g = a.student?.gender
    const sid = a.student?.studentId || a.student?.name
    if (!g || seenStudent.has(sid)) return
    seenStudent.add(sid)
    if (g === '男' || g === '女') genderMap[g] += 1
  })
  const genderTotal = genderMap.男 + genderMap.女

  // 近 7 日报名趋势：按真实申请日期聚合
  const pad = (n) => String(n).padStart(2, '0')
  const dayMap = {}
  apps.forEach((a) => {
    const key = String(a.applyTime || '').slice(5, 10)
    if (!key) return
    dayMap[key] = (dayMap[key] || 0) + 1
  })
  const now = new Date()
  const trendList = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(now.getDate() - i)
    const date = `${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    trendList.push({ date, applications: dayMap[date] || 0 })
  }

  return {
    ...responseTemplate,
    data: {
      overview: {
        totalCompetitions: comps.length,
        totalApplications: apps.length,
        totalTeams: teams.length,
        totalStudents: new Set(apps.map((a) => a.student?.studentId).filter(Boolean)).size,
      },
      competitionStats: {
        list: comps.map((c) => ({
          name: c.name,
          applications: apps.filter((a) => a.competition?.id === c.id).length,
          teams: teams.filter((t) => t.competitionId === c.id).length,
          students: c.participantCount || 0,
        })),
      },
      majorDistribution: {
        list: Object.entries(majorMap).map(([major, count]) => ({ major, count })),
      },
      genderRatio: genderTotal
        ? { male: genderMap.男, female: genderMap.女 }
        : { male: 0, female: 0 },
      trendData: { list: trendList },
    },
  }
})

// 公告
Mock.mock('/api/teacher/announcements', 'get', () => ({
  ...responseTemplate,
  data: { list: db.announcements() },
}))

Mock.mock('/api/teacher/announcements', 'post', (options) => {
  const body = JSON.parse(options.body || '{}')
  const list = db.announcements()
  const item = {
    id: nextId(list),
    title: body.title || '未命名公告',
    content: body.content || '',
    type: body.type || '系统公告',
    createdAt: formatDateTime(new Date()),
    isTop: !!body.isTop,
  }
  list.unshift(item)
  db.saveAnnouncements(list)
  return { ...responseTemplate, data: item }
})

// ==================== 账号管理（仅管理员） ====================
// 内置系统账号（不可删除，密码重置受保护）
const BUILTIN_ACCOUNTS = [
  {
    id: 'student',
    role: 'student',
    username: 'student',
    name: '张同学',
    accountId: '2021001',
    major: '计算机科学与技术',
    grade: '大三',
    gender: '-',
    email: 'student@example.com',
    system: true,
  },
  {
    id: 'admin',
    role: 'teacher',
    username: 'admin',
    name: '管理员',
    accountId: 'admin',
    title: '管理员',
    department: '-',
    email: '',
    system: true,
  },
  {
    id: 'teacher',
    role: 'teacher',
    username: 'teacher',
    name: '李老师',
    accountId: 'T001',
    title: '管理员',
    department: '-',
    email: '',
    system: true,
  },
  {
    id: 'leader',
    role: 'teacher',
    username: 'leader',
    name: '王老师',
    accountId: 't1',
    title: '带队教师',
    department: '自动化',
    email: '',
    system: true,
  },
]

const normalizeAccount = (u) => {
  if (u.role === 'student') {
    return {
      id: u.username,
      role: 'student',
      username: u.username,
      name: u.name,
      accountId: u.username,
      major: u.major || '-',
      grade: u.grade || '-',
      gender: u.gender || '-',
      email: u.email || '',
      system: false,
    }
  }
  return {
    id: u.username,
    role: 'teacher',
    username: u.username,
    name: u.name,
    accountId: u.username,
    title: u.title || '带队教师',
    department: u.department || '-',
    email: u.email || '',
    system: false,
  }
}

// 账号列表（可按 role 过滤）
Mock.mock(/\/api\/admin\/accounts(\?.*)?$/, 'get', (options) => {
  const role = (options.url.split('?')[1] || '')
    .split('&')
    .find((p) => p.startsWith('role='))
    ?.split('=')[1]
  const registered = getRegisteredUsers().map(normalizeAccount)
  let list = [...BUILTIN_ACCOUNTS, ...registered]
  if (role === 'student' || role === 'teacher') {
    list = list.filter((a) => a.role === role)
  }
  return { ...responseTemplate, data: { list, total: list.length } }
})

// 重置密码（仅注册账号可重置为默认 123456，内置账号受保护）
Mock.mock('/api/admin/accounts/reset-password', 'post', (options) => {
  const { id } = JSON.parse(options.body || '{}')
  if (!id) return { code: 400, message: '缺少账号标识', data: null }
  if (BUILTIN_ACCOUNTS.some((a) => a.id === id)) {
    return { code: 400, message: '系统内置账号不可重置密码', data: null }
  }
  const list = getRegisteredUsers()
  const user = list.find((u) => u.username === id)
  if (!user) return { code: 404, message: '账号不存在', data: null }
  user.password = '123456'
  saveRegisteredUsers(list)
  return { ...responseTemplate, data: { success: true } }
})

// 删除账号（仅注册账号可删除，内置账号受保护）
Mock.mock('/api/admin/accounts/delete', 'post', (options) => {
  const { id } = JSON.parse(options.body || '{}')
  if (!id) return { code: 400, message: '缺少账号标识', data: null }
  if (BUILTIN_ACCOUNTS.some((a) => a.id === id)) {
    return { code: 400, message: '系统内置账号不可删除', data: null }
  }
  let list = getRegisteredUsers()
  if (!list.some((u) => u.username === id)) {
    return { code: 404, message: '账号不存在', data: null }
  }
  list = list.filter((u) => u.username !== id)
  saveRegisteredUsers(list)
  return { ...responseTemplate, data: { success: true } }
})

// 资源相关 Mock 见 ./modules/resource.js

export default Mock
