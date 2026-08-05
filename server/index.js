/**
 * 师生交互平台 — 真实后端
 * 数据全部存放在 server/data/data.json，所有访问者共享同一份数据。
 */
import express from 'express'
import cors from 'cors'
import multer from 'multer'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { getDB, saveDB, nextId, formatDateTime, DEFAULT_AVATAR_URL, genCode } from './db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = process.env.PORT || 3001
const app = express()
app.use(cors())
app.use(express.json({ limit: '5mb' }))
app.use(express.urlencoded({ extended: true }))

// ---------- 工具 ----------
const ok = (data, message = 'success') => ({ code: 200, message, data })
const fail = (code, message, data = null) => ({ code, message, data })

function getUserFromToken(req) {
  const header = req.headers['authorization'] || ''
  const token = header.replace(/^Bearer\s+/i, '')
  if (!token || !token.startsWith('tk-')) return null
  const userId = token.split('-')[1]
  if (!userId) return null
  const db = getDB()
  const all = [...db.accounts, ...db.registeredUsers]
  const acc = all.find((a) => a.id === userId)
  return acc || null
}

function requireUser(req, res) {
  const user = getUserFromToken(req)
  if (!user) {
    res.json(fail(401, '登录已过期，请重新登录'))
    return null
  }
  return user
}

function publicUser(u) {
  if (!u) return null
  const base = {
    id: u.id,
    username: u.name || u.username,
    email: u.email || '',
    avatar: u.avatar || DEFAULT_AVATAR_URL,
  }
  if (u.role === 'student') {
    return { ...base, role: 'student', studentId: u.accountId || u.username, major: u.major || '', grade: u.grade || '', gender: u.gender || '', bio: u.bio || '', phone: u.phone || '' }
  }
  return { ...base, role: 'teacher', teacherId: u.accountId || u.username, teacherType: u.teacherType || 'leader', title: u.title || '带队教师', department: u.department || '' }
}

function genToken(userId) {
  return `tk-${userId}-${Math.random().toString(36).slice(2, 10)}`
}

function findTeamById(teams, id) {
  return teams.find((t) => String(t.id) === String(id))
}
function findTeamByCode(code) {
  if (!code) return null
  const c = String(code).toUpperCase()
  return getDB().teams.find((t) => String(t.inviteCode).toUpperCase() === c)
}

function isTeamParticipant(team, user) {
  if (!team || !user) return false
  if (team.leader?.name === user.name) return true
  if ((team.members || []).some((m) => m.name === user.name)) return true
  // 带队老师
  if (user.role === 'teacher') {
    const key = user.id || user.accountId
    if ((team.leaderTeachers || []).some((lt) => String(lt.id) === String(key) || String(lt.id) === String(user.accountId))) return true
  }
  return false
}

const BUILTIN_LEAD_TEACHERS = [
  { id: 't1', name: '王老师', title: '带队教师', department: '自动化', avatar: DEFAULT_AVATAR_URL, maxStudents: 15, currentStudents: 0 },
  { id: 't3', name: '赵老师', title: '带队教师', department: '电气工程', avatar: DEFAULT_AVATAR_URL, maxStudents: 12, currentStudents: 0 },
  { id: 't4', name: '陈老师', title: '带队教师', department: '建筑电气', avatar: DEFAULT_AVATAR_URL, maxStudents: 10, currentStudents: 0 },
]

// 写入一条消息（通知）
function pushMessage({ type = 'system', typeLabel, title, content, role = 'student', userId = '', userName = '' }) {
  const db = getDB()
  const item = { id: nextId('messages'), type, typeLabel: typeLabel || ({ system: '系统通知', review: '审核结果', invite: '组队邀请' }[type] || '系统通知'), title, content, time: formatDateTime(new Date()), isRead: false, role, userId, userName }
  db.messages.unshift(item)
  saveDB()
  return item
}
function notifyTeamMembers(team, { title, content }) {
  const people = [team.leader, ...(team.members || [])].filter(Boolean)
  const seen = new Set()
  people.forEach((p) => {
    const key = p.id || p.name
    if (!key || seen.has(key)) return
    seen.add(key)
    pushMessage({ type: 'review', typeLabel: '审核结果', title, content, role: 'student', userId: p.id || '', userName: p.name || '' })
  })
}
function notifyLeadTeachers(teachers, { title, content }) {
  ;(teachers || []).forEach((t) => pushMessage({ type: 'review', typeLabel: '审核提醒', title, content, role: 'teacher', userId: t.id || '', userName: t.name || '' }))
}

// ==================== 学生端 ====================

// 学生登录
app.post('/api/student/login', (req, res) => {
  const { username, password } = req.body || {}
  const db = getDB()
  const acc = [...db.accounts, ...db.registeredUsers].find((u) => u.role === 'student' && u.username === username && u.password === password)
  if (!acc) return res.json(fail(401, '用户名或密码错误'))
  res.json(ok({ token: genToken(acc.id), userInfo: publicUser(acc) }))
})

// 学生注册
app.post('/api/student/register', (req, res) => {
  const { username, password, name, major, grade, gender, email } = req.body || {}
  const db = getDB()
  if ([...db.accounts, ...db.registeredUsers].some((u) => u.role === 'student' && u.username === username)) {
    return res.json(fail(400, '该学号已注册'))
  }
  const id = `s_${Date.now()}`
  const user = { id, role: 'student', username, password, name, major, grade, gender, email: email || '', system: false, avatar: DEFAULT_AVATAR_URL }
  db.registeredUsers.push(user)
  saveDB()
  res.json(ok({ token: genToken(id), userInfo: publicUser(user) }))
})

// 比赛列表 / 详情
app.get('/api/competitions', (req, res) => {
  res.json(ok({ list: getDB().competitions }))
})
app.get('/api/competitions/:id', (req, res) => {
  const list = getDB().competitions
  const comp = list.find((c) => String(c.id) === String(req.params.id)) || list[0] || null
  res.json(ok(comp))
})

// 旧个人报名
app.post('/api/competitions/register', (req, res) => {
  const db = getDB()
  const body = req.body || {}
  const comp = db.competitions.find((c) => String(c.id) === String(body.competitionId || body.id))
  if (!comp) return res.json(fail(404, '比赛不存在'))
  if (comp.status === '已结束') return res.json(fail(400, '比赛已结束，无法报名'))
  const user = requireUser(req, res)
  if (!user) return
  const exists = db.applications.find((a) => String(a.competition?.id) === String(comp.id) && a.student?.studentId === (user.accountId || user.username))
  if (exists) return res.json(fail(400, '您已报名该比赛'))
  const teacher = (comp.teachers || []).find((t) => String(t.id) === String(body.teacherId)) || (comp.teachers || [])[0]
  db.applications.unshift({
    id: nextId('applications'),
    student: { id: user.id, name: user.name, studentId: user.accountId || user.username, major: user.major || '', grade: user.grade || '', gender: user.gender || '', avatar: user.avatar || DEFAULT_AVATAR_URL },
    competition: { id: comp.id, name: comp.name },
    teacherId: teacher?.id || '',
    status: '待审核',
    applyTime: formatDateTime(new Date()),
    reason: body.reason || '申请参赛',
  })
  comp.participantCount = (comp.participantCount || 0) + 1
  saveDB()
  res.json(ok({ success: true }))
})

// 队伍报名（新流程）
app.post('/api/competitions/team-register', (req, res) => {
  const db = getDB()
  const body = req.body || {}
  const competitionId = Number(body.competitionId || body.id)
  const teamId = Number(body.teamId)
  const comp = db.competitions.find((c) => c.id === competitionId)
  if (!comp) return res.json(fail(404, '比赛不存在'))
  if (comp.status === '已结束') return res.json(fail(400, '比赛已结束，无法报名'))
  const approvedCount = db.teams.filter((t) => t.competitionId === competitionId && t.auditStatus === '已通过').length
  if (approvedCount >= (Number(comp.maxTeams) || 40)) return res.json(fail(400, '本场比赛参赛队伍已满'))
  const team = findTeamById(db.teams, teamId)
  if (!team) return res.json(fail(404, '队伍不存在'))
  const user = requireUser(req, res)
  if (!user) return
  if (team.leader?.name && team.leader.name !== user.name) return res.json(fail(403, '仅队长可为队伍申请带队老师'))
  if (team.auditStatus === '待审核' && team.competitionId) return res.json(fail(400, '该队伍已有待审核的参赛申请'))
  if (team.auditStatus === '已通过' && team.competitionId === competitionId) return res.json(fail(400, '该队伍已通过本场比赛审核'))
  let teacherIds = body.teacherIds || (body.teacherId != null ? [body.teacherId] : [])
  teacherIds = [...new Set(teacherIds.map(String))].filter(Boolean)
  if (!teacherIds.length) return res.json(fail(400, '请选择带队老师'))
  if (teacherIds.length > (Number(comp.maxLeadTeachers) || 1)) return res.json(fail(400, `每支队伍最多可选 ${Number(comp.maxLeadTeachers) || 1} 位带队老师`))
  const available = comp.teachers || []
  const selected = teacherIds.map((tid) => available.find((t) => String(t.id) === String(tid))).filter(Boolean)
  if (selected.length !== teacherIds.length) return res.json(fail(400, '所选带队老师不在本场比赛可选范围内'))
  team.competitionId = competitionId
  team.leaderTeachers = selected.map((t) => ({ id: t.id, name: t.name, title: t.title || '带队教师', department: t.department || '' }))
  team.auditStatus = '待审核'
  team.rejectReason = ''
  team.applyTime = formatDateTime(new Date())
  comp.teamCount = db.teams.filter((t) => t.competitionId === competitionId && ['待审核', '已通过'].includes(t.auditStatus)).length
  saveDB()
  notifyLeadTeachers(selected, { title: '收到队伍带队申请', content: `「${team.name}」申请参加「${comp.name}」并由您带队，请前往队伍审核处理。` })
  res.json(ok({ success: true, team }))
})

// 作品
app.get('/api/works', (req, res) => res.json(ok({ list: getDB().works })))
app.post('/api/works/:id/like', (req, res) => {
  const work = getDB().works.find((w) => String(w.id) === String(req.params.id))
  if (work) { work.likes = (work.likes || 0) + 1; saveDB() }
  res.json(ok({ workId: Number(req.params.id), liked: true, likes: work?.likes || 0 }))
})
app.get('/api/works/:id/comments', (req, res) => {
  const list = (getDB().works.find((w) => String(w.id) === String(req.params.id))?.commentList) || []
  res.json(ok({ list, total: countComments(list) }))
})
app.post('/api/works/:id/comments', (req, res) => {
  const db = getDB()
  const work = db.works.find((w) => String(w.id) === String(req.params.id))
  if (!work) return res.json(fail(404, '作品不存在'))
  const user = requireUser(req, res)
  if (!user) return
  if (!work.commentList) work.commentList = []
  const newComment = { id: `c_${Date.now()}`, user: user.name, avatar: user.avatar, content: req.body?.content || '', time: formatDateTime(new Date()), likes: 0, children: [] }
  if (req.body?.parentId) {
    const parent = findComment(work.commentList, req.body.parentId)
    if (parent) {
      parent.children = parent.children || []
      if (!String(newComment.content).includes(`@${parent.user}`)) newComment.content = `@${parent.user} ${newComment.content}`.trim()
      parent.children.push(newComment)
    } else work.commentList.unshift(newComment)
  } else work.commentList.unshift(newComment)
  saveDB()
  res.json(ok({ comment: newComment, list: work.commentList, total: countComments(work.commentList) }, '评论成功'))
})
app.post('/api/comments/:id/like', (req, res) => res.json(ok({ success: true })))

function countComments(list) { return list.reduce((s, i) => s + 1 + countComments(i.children || []), 0) }
function findComment(list, id) {
  for (const item of list) {
    if (item.id === id) return item
    if (item.children?.length) { const f = findComment(item.children, id); if (f) return f }
  }
  return null
}

// 智能推荐（静态）
app.get('/api/recommendations', (req, res) => res.json(ok(getDB().recommendations || { recommendedTeachers: { list: [] }, recommendedTeammates: { list: [] } })))

// 个人中心
app.get('/api/student/profile', (req, res) => {
  const user = requireUser(req, res)
  if (!user) return
  const db = getDB()
  const studentId = user.accountId || user.username
  const myApps = db.applications.filter((a) => (a.student?.studentId || '') === studentId)
  const competitionHistory = {
    list: myApps.length
      ? myApps.map((a) => ({ id: a.id, name: a.competition?.name || '未知比赛', status: a.status || '待审核', year: (a.applyTime || '').slice(0, 4) || '-', teamName: a.teamName || '-' }))
      : [{ id: 1, name: '程序设计校内选拔赛', status: '二等奖', year: '2025', teamName: '算法突击队' }],
  }
  const teacherPool = [
    ...BUILTIN_LEAD_TEACHERS.map((t) => ({ ...t })),
    ...db.registeredUsers.filter((u) => u.role === 'teacher').map((u) => ({ id: u.id, name: u.name, title: u.title || '带队教师', department: u.department || '', avatar: u.avatar || DEFAULT_AVATAR_URL })),
  ]
  const teacherMap = new Map()
  myApps.forEach((a) => {
    if (a.guideAssigned && a.teacherId != null) {
      const t = teacherPool.find((x) => String(x.id) === String(a.teacherId))
      if (t && !teacherMap.has(String(t.id))) teacherMap.set(String(t.id), { id: t.id, name: t.name, title: t.title, department: t.department, avatar: t.avatar })
    }
  })
  const myTeachers = { list: teacherMap.size ? [...teacherMap.values()] : [{ id: 't2', name: '李老师', title: '管理员', department: '计算机', avatar: DEFAULT_AVATAR_URL }] }
  const myTeams = db.teams.filter((t) => t.leader?.name === user.name || (t.members || []).some((m) => m.name === user.name))
  res.json(ok({ userInfo: publicUser(user), competitionHistory, myTeams, myTeachers }))
})

app.put('/api/student/profile', (req, res) => {
  const user = requireUser(req, res)
  if (!user) return
  const db = getDB()
  const acc = [...db.accounts, ...db.registeredUsers].find((u) => u.id === user.id)
  if (acc) {
    if (req.body?.nickname) { acc.name = req.body.nickname; acc.username = req.body.nickname }
    if (req.body?.major) acc.major = req.body.major
    if (req.body?.bio !== undefined) acc.bio = req.body.bio
    if (req.body?.avatar) acc.avatar = req.body.avatar
    saveDB()
  }
  res.json(ok({ avatar: acc?.avatar || '', nickname: acc?.name || '', major: acc?.major || '', bio: acc?.bio || '' }, '资料更新成功'))
})

app.get('/api/profile/majors', (req, res) => res.json(ok({ list: ['计算机科学与技术', '人工智能', '建筑电气与智能化', '自动化', '电气工程及其自动化'] })))

// ==================== 队伍 ====================
app.get('/api/teams', (req, res) => res.json(ok({ list: getDB().teams.map((t) => ({ ...t })) })))
app.post('/api/teams', (req, res) => {
  const db = getDB()
  const user = requireUser(req, res)
  if (!user) return
  const maxMembers = Math.min(9, Math.max(1, Number(req.body?.maxMembers) || 1))
  const team = {
    id: nextId('teams'),
    name: req.body?.name || `新队伍${db.teams.length + 1}`,
    description: req.body?.description || '',
    status: '招募中',
    maxMembers,
    currentMembers: 1,
    leader: { id: user.id, name: user.name, avatar: user.avatar || DEFAULT_AVATAR_URL },
    members: [],
    competitionId: null,
    inviteCode: genCode(),
    createdAt: formatDateTime(new Date()),
    auditStatus: '',
    leaderTeachers: [],
    rejectReason: '',
    isLeader: true,
  }
  db.teams.unshift(team)
  saveDB()
  res.json(ok(team))
})
app.post('/api/teams/:id/join', (req, res) => {
  const db = getDB()
  const team = findTeamById(db.teams, req.params.id)
  if (!team) return res.json(fail(404, '队伍不存在'))
  if (team.status === '已满员' || team.currentMembers >= team.maxMembers) return res.json(fail(400, '队伍已满员'))
  const user = requireUser(req, res)
  if (!user) return
  team.members = team.members || []
  if (![team.leader?.name, ...team.members.map((m) => m.name)].includes(user.name)) {
    team.members.push({ id: user.id, name: user.name, avatar: user.avatar || DEFAULT_AVATAR_URL })
    team.currentMembers = 1 + team.members.length
    if (team.currentMembers >= team.maxMembers) team.status = '已满员'
    saveDB()
  }
  res.json(ok({ success: true, team }))
})
app.get('/api/my-teams', (req, res) => {
  const user = requireUser(req, res)
  if (!user) return
  const list = getDB().teams.filter((t) => t.leader?.name === user.name || (t.members || []).some((m) => m.name === user.name))
    .map((t) => ({ ...t, isLeader: t.leader?.name === user.name }))
  res.json(ok({ list }))
})
app.post('/api/teams/:id/invite', (req, res) => {
  const db = getDB()
  const team = findTeamById(db.teams, req.params.id)
  if (!team) return res.json(fail(404, '队伍不存在'))
  team.inviteCode = genCode()
  saveDB()
  res.json(ok({ inviteCode: team.inviteCode, teamId: team.id }))
})
app.get('/api/teams/invite-detail', (req, res) => {
  const team = findTeamByCode(req.query.code)
  if (!team) return res.json(fail(404, '邀请码无效'))
  res.json(ok({ team }))
})
app.post('/api/teams/apply', (req, res) => {
  const db = getDB()
  const body = req.body || {}
  const team = body.inviteCode ? findTeamByCode(body.inviteCode) : findTeamById(db.teams, body.teamId)
  if (!team) return res.json(fail(404, '队伍不存在'))
  const user = requireUser(req, res)
  if (!user) return
  const item = { id: nextId('teamApplications'), teamId: team.id, teamName: team.name, inviteCode: team.inviteCode, applicantName: user.name, applicantAvatar: user.avatar || DEFAULT_AVATAR_URL, applicantMajor: user.major || '', applyTime: formatDateTime(new Date()), status: '待审核', remark: body.remark || '', isMine: true }
  db.teamApplications.unshift(item)
  saveDB()
  res.json(ok(item))
})
app.get('/api/teams/:id/applications', (req, res) => {
  res.json(ok({ list: getDB().teamApplications.filter((a) => String(a.teamId) === String(req.params.id)) }))
})
app.post('/api/teams/applications/audit', (req, res) => {
  const db = getDB()
  const row = db.teamApplications.find((a) => String(a.id) === String(req.body?.id))
  if (!row) return res.json(fail(404, '申请不存在'))
  const status = req.body?.status || (req.body?.action === 'reject' || req.body?.pass === false ? '已拒绝' : '已通过')
  row.status = status
  if (status === '已通过') {
    const team = findTeamById(db.teams, row.teamId)
    if (team && team.currentMembers < team.maxMembers) {
      team.members = team.members || []
      if (!team.members.some((m) => m.name === row.applicantName)) {
        team.members.push({ id: `m_${row.id}`, name: row.applicantName, avatar: row.applicantAvatar || DEFAULT_AVATAR_URL })
        team.currentMembers = 1 + team.members.length
        if (team.currentMembers >= team.maxMembers) team.status = '已满员'
        saveDB()
      }
    }
  }
  saveDB()
  res.json(ok({ success: true }))
})
app.get('/api/teams/my-applications', (req, res) => {
  const user = requireUser(req, res)
  if (!user) return
  const list = getDB().teamApplications.filter((a) => a.isMine || a.applicantName === user.name)
  res.json(ok({ list }))
})

// 队伍聊天（共享存储）
app.get('/api/teams/:id/messages', (req, res) => {
  const db = getDB()
  const team = findTeamById(db.teams, req.params.id)
  if (!team) return res.json(fail(404, '队伍不存在'))
  const user = getUserFromToken(req)
  if (!user) return res.json(fail(401, '请先登录'))
  if (!isTeamParticipant(team, user)) return res.json(fail(403, '仅队伍成员或带队老师可查看聊天'))
  const list = db.teamMessages[String(team.id)] || []
  res.json(ok({ list }))
})
app.post('/api/teams/:id/messages', (req, res) => {
  const db = getDB()
  const team = findTeamById(db.teams, req.params.id)
  if (!team) return res.json(fail(404, '队伍不存在'))
  const user = requireUser(req, res)
  if (!user) return
  if (!isTeamParticipant(team, user)) return res.json(fail(403, '仅队伍成员或带队老师可发言'))
  const body = req.body || {}
  const msg = {
    id: `tm_${Date.now()}`,
    type: body.type || 'text',
    sender: user.name,
    content: body.content || '',
    fileUrl: body.fileUrl || '',
    fileName: body.fileName || '',
    fileSize: body.fileSize || 0,
    time: formatDateTime(new Date()),
  }
  db.teamMessages[String(team.id)] = db.teamMessages[String(team.id)] || []
  db.teamMessages[String(team.id)].push(msg)
  saveDB()
  res.json(ok({ message: msg }))
})

// ==================== 教师端 ====================
app.post('/api/teacher/login', (req, res) => {
  const { username, password } = req.body || {}
  const db = getDB()
  const acc = [...db.accounts, ...db.registeredUsers].find((u) => u.role === 'teacher' && u.username === username && u.password === password)
  if (!acc) return res.json(fail(401, '用户名或密码错误'))
  res.json(ok({ token: genToken(acc.id), userInfo: publicUser(acc) }))
})
app.post('/api/teacher/register', (req, res) => {
  const { username, password, name, email } = req.body || {}
  const db = getDB()
  if (['admin', 'teacher', 'leader', 'student'].includes(username)) return res.json(fail(400, '该工号为系统保留账号'))
  if ([...db.accounts, ...db.registeredUsers].some((u) => u.role === 'teacher' && u.username === username)) return res.json(fail(400, '该工号已注册'))
  const id = `t_${Date.now()}`
  const user = { id, role: 'teacher', username, password, name, email: email || '', teacherType: 'leader', title: '带队教师', department: '', system: false, avatar: DEFAULT_AVATAR_URL }
  db.registeredUsers.push(user)
  saveDB()
  res.json(ok({ token: genToken(id), userInfo: publicUser(user) }))
})

app.get('/api/teacher/competitions', (req, res) => res.json(ok({ list: getDB().competitions })))
app.post('/api/teacher/competitions', (req, res) => {
  const db = getDB()
  const body = req.body || {}
  const range = body.dateRange || []
  const item = {
    id: nextId('competitions'),
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
    teachers: Array.isArray(body.teachers) ? body.teachers : [],
  }
  db.competitions.unshift(item)
  saveDB()
  res.json(ok(item))
})
app.put('/api/teacher/competitions/:id', (req, res) => {
  const db = getDB()
  const item = db.competitions.find((c) => String(c.id) === String(req.params.id))
  if (!item) return res.json(fail(404, '比赛不存在'))
  const body = req.body || {}
  const range = body.dateRange || []
  Object.assign(item, body, {
    id: item.id,
    startTime: formatDateTime(body.startTime || range[0] || item.startTime),
    endTime: formatDateTime(body.endTime || range[1] || item.endTime),
    maxParticipants: Number(body.maxParticipants) || item.maxParticipants,
    maxTeams: Number(body.maxTeams) || item.maxTeams || 40,
    maxLeadTeachers: Math.max(1, Number(body.maxLeadTeachers) || item.maxLeadTeachers || 1),
    teachers: Array.isArray(body.teachers) ? body.teachers : (item.teachers || []),
  })
  delete item.dateRange
  saveDB()
  res.json(ok(item))
})
app.put('/api/teacher/competitions/:id/status', (req, res) => {
  const db = getDB()
  const item = db.competitions.find((c) => String(c.id) === String(req.params.id))
  if (!item) return res.json(fail(404, '比赛不存在'))
  const body = req.body || {}
  if (body.status === 'offline' || body.status === '已结束') item.status = item.status === '已结束' ? '报名中' : '已结束'
  else if (body.status) item.status = body.status
  saveDB()
  res.json(ok(item))
})
app.delete('/api/teacher/competitions/:id', (req, res) => {
  const db = getDB()
  db.competitions = db.competitions.filter((c) => String(c.id) !== String(req.params.id))
  saveDB()
  res.json(ok({ success: true, id: req.params.id }))
})

app.get('/api/teacher/applications', (req, res) => {
  const list = getDB().applications
  res.json(ok({ list, total: list.length }))
})
app.post('/api/teacher/applications/audit', (req, res) => {
  const db = getDB()
  const body = req.body || {}
  const ids = body.ids || (body.id != null ? [body.id] : [])
  const status = body.status || (body.action === 'reject' ? '已拒绝' : '已通过')
  ids.forEach((id) => { const row = db.applications.find((a) => String(a.id) === String(id)); if (row) row.status = status })
  saveDB()
  res.json(ok({ success: true }))
})

app.get('/api/teacher/leader-teachers', (req, res) => {
  const db = getDB()
  const registered = db.registeredUsers.filter((u) => u.role === 'teacher' && (u.teacherType || 'leader') === 'leader')
    .map((u) => ({ id: u.id, name: u.name, title: u.title || '带队教师', department: u.department || '', avatar: u.avatar || DEFAULT_AVATAR_URL, maxStudents: 20, currentStudents: 0, teacherId: u.username }))
  const map = new Map()
  ;[...BUILTIN_LEAD_TEACHERS, ...registered].forEach((t) => { if (!map.has(String(t.id))) map.set(String(t.id), t) })
  res.json(ok({ list: [...map.values()] }))
})

app.get('/api/teacher/teams-audit', (req, res) => {
  const user = requireUser(req, res)
  if (!user) return
  if (user.teacherType === 'admin') return res.json(ok({ list: [], total: 0, disabled: true }))
  const db = getDB()
  const teacherKey = user.id || user.accountId
  const teacherName = user.name
  const list = db.teams.filter((t) => {
    if (!t.auditStatus) return false
    const teachers = t.leaderTeachers || []
    if (!teachers.length) return false
    return teachers.some((lt) => String(lt.id) === String(teacherKey) || String(lt.id) === String(user.accountId) || lt.name === teacherName)
  }).map((t) => ({
    id: t.id, name: t.name, description: t.description, status: t.auditStatus || '待审核', applyTime: t.applyTime || t.createdAt, rejectReason: t.rejectReason || '',
    leaderTeachers: t.leaderTeachers || [],
    competition: { id: t.competitionId, name: (db.competitions.find((c) => c.id === t.competitionId) || {}).name || `比赛${t.competitionId}` },
    members: { list: [...(t.leader ? [{ ...t.leader, studentId: '-', major: '-', role: '队长' }] : []), ...(t.members || []).map((m) => ({ ...m, role: '队员' }))] },
  }))
  res.json(ok({ list, total: list.length }))
})
app.post('/api/teacher/teams-audit', (req, res) => {
  const user = requireUser(req, res)
  if (!user) return
  if (user.teacherType === 'admin') return res.json(fail(403, '管理员无权审核学生组队申请，请由带队老师处理'))
  const db = getDB()
  const body = req.body || {}
  const team = findTeamById(db.teams, body.id)
  if (!team) return res.json(fail(404, '队伍不存在'))
  const comp = db.competitions.find((c) => c.id === team.competitionId)
  const compName = comp?.name || '比赛'
  const finalStatus = (body.action === 'reject' || body.status === '已拒绝') ? '已拒绝' : '已通过'
  if (finalStatus === '已通过') {
    const approvedCount = db.teams.filter((t) => t.competitionId === team.competitionId && t.auditStatus === '已通过' && t.id !== team.id).length
    if (approvedCount >= (Number(comp?.maxTeams) || 40)) return res.json(fail(400, '本场比赛参赛队伍名额已满'))
    team.auditStatus = '已通过'
    team.rejectReason = ''
    comp.teamCount = db.teams.filter((t) => t.competitionId === comp.id && t.auditStatus === '已通过').length
  } else {
    team.auditStatus = '已拒绝'
    team.rejectReason = body.reason || ''
    comp.teamCount = db.teams.filter((t) => t.competitionId === comp.id && ['待审核', '已通过'].includes(t.auditStatus)).length
  }
  saveDB()
  notifyTeamMembers(team, finalStatus === '已通过'
    ? { title: '队伍审核已通过', content: `您的队伍「${team.name}」参加「${compName}」的申请已通过，带队老师已确认。` }
    : { title: '队伍审核未通过', content: `您的队伍「${team.name}」参加「${compName}」的申请已被拒绝。${body.reason ? `原因：${body.reason}` : '请调整队伍信息后可重新申请。'}` })
  res.json(ok({ success: true, status: finalStatus }))
})

app.post('/api/teacher/guide-assign', (req, res) => {
  const db = getDB()
  const body = req.body || {}
  const row = db.applications.find((a) => String(a.id) === String(body.applicationId || body.id))
  if (row) { row.teacherId = body.teacherId || row.teacherId; row.guideAssigned = true; saveDB() }
  res.json(ok({ success: true }))
})
app.get('/api/teacher/guide-teachers', (req, res) => {
  const db = getDB()
  const pool = [
    ...BUILTIN_LEAD_TEACHERS.map((t) => ({ ...t })),
    ...db.registeredUsers.filter((u) => u.role === 'teacher').map((u) => ({ id: u.id, name: u.name, title: u.title || '带队教师', department: u.department || '', avatar: u.avatar || DEFAULT_AVATAR_URL, maxStudents: 20 })),
  ]
  const map = new Map()
  pool.forEach((t) => { if (!map.has(String(t.id))) map.set(String(t.id), { ...t, currentStudents: 0 }) })
  db.applications.forEach((a) => { if (a.guideAssigned && a.teacherId != null) { const t = map.get(String(a.teacherId)); if (t) t.currentStudents += 1 } })
  res.json(ok({ list: [...map.values()] }))
})

app.get('/api/teacher/statistics', (req, res) => {
  const db = getDB()
  const comps = db.competitions
  const apps = db.applications
  const teams = db.teams
  const majorMap = {}
  apps.forEach((a) => { const m = a.student?.major || '未填写'; majorMap[m] = (majorMap[m] || 0) + 1 })
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
  const pad = (n) => String(n).padStart(2, '0')
  const dayMap = {}
  apps.forEach((a) => { const key = String(a.applyTime || '').slice(5, 10); if (key) dayMap[key] = (dayMap[key] || 0) + 1 })
  const now = new Date()
  const trendList = []
  for (let i = 6; i >= 0; i--) { const d = new Date(now); d.setDate(now.getDate() - i); const date = `${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; trendList.push({ date, applications: dayMap[date] || 0 }) }
  res.json(ok({
    overview: { totalCompetitions: comps.length, totalApplications: apps.length, totalTeams: teams.length, totalStudents: new Set(apps.map((a) => a.student?.studentId).filter(Boolean)).size },
    competitionStats: { list: comps.map((c) => ({ name: c.name, applications: apps.filter((a) => a.competition?.id === c.id).length, teams: teams.filter((t) => t.competitionId === c.id).length, students: c.participantCount || 0 })) },
    majorDistribution: { list: Object.entries(majorMap).map(([major, count]) => ({ major, count })) },
    genderRatio: genderTotal ? { male: genderMap.男, female: genderMap.女 } : { male: 0, female: 0 },
    trendData: { list: trendList },
  }))
})
app.get('/api/teacher/dashboard/trend', (req, res) => {
  const apps = getDB().applications
  const map = {}
  apps.forEach((a) => { const key = String(a.applyTime || '').slice(5, 10); if (key) map[key] = (map[key] || 0) + 1 })
  const pad = (n) => String(n).padStart(2, '0')
  const now = new Date()
  const list = []
  for (let i = 6; i >= 0; i--) { const d = new Date(now); d.setDate(now.getDate() - i); const date = `${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; list.push({ date, fullDate: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, count: map[date] || 0 }) }
  res.json(ok({ list }))
})
app.get('/api/teacher/dashboard/workload', (req, res) => {
  const apps = getDB().applications
  const map = {}
  apps.forEach((a) => { const tid = a.teacherId || '未分配'; map[tid] = (map[tid] || 0) + 1 })
  const nameMap = { t1: '王老师', t2: '李老师', t3: '赵老师', t4: '陈老师', 't-self': '当前教师' }
  const list = Object.entries(map).map(([id, studentCount]) => ({ teacherName: nameMap[id] || id, studentCount }))
  res.json(ok({ list: list.length ? list : [{ teacherName: '李老师', studentCount: 0 }, { teacherName: '王老师', studentCount: 0 }] }))
})

// 公告
app.get('/api/teacher/announcements', (req, res) => res.json(ok({ list: getDB().announcements })))
app.post('/api/teacher/announcements', (req, res) => {
  const db = getDB()
  const body = req.body || {}
  const item = { id: nextId('announcements'), title: body.title || '未命名公告', content: body.content || '', type: body.type || '系统公告', createdAt: formatDateTime(new Date()), isTop: !!body.isTop }
  db.announcements.unshift(item)
  saveDB()
  res.json(ok(item))
})

// 资源
app.get('/api/teacher/resources', (req, res) => {
  const list = getDB().resources
  res.json(ok({ list: list.map((r) => ({ ...r })), total: list.length }))
})
app.post('/api/teacher/resources', (req, res) => {
  const db = getDB()
  const body = req.body || {}
  const id = nextId('resources')
  const fileSize = Number(body.fileSize) || 1024 * 200
  const name = body.name || `资源${id}.pdf`
  const item = { id, name, description: body.description || '', type: body.type || body.category || '文档', fileSize, size: formatSize(fileSize), downloadCount: 0, uploadTime: formatDateTime(new Date()), url: body.url || `https://example.com/files/${id}/${encodeURIComponent(name)}` }
  db.resources.unshift(item)
  saveDB()
  res.json(ok(item, '上传成功'))
})
app.get('/api/teacher/resources/:id/download', (req, res) => {
  const db = getDB()
  const target = db.resources.find((r) => String(r.id) === String(req.params.id))
  if (!target) return res.json(fail(404, '资源不存在'))
  target.downloadCount += 1
  saveDB()
  res.json(ok({ id: target.id, name: target.name, url: target.url, fileSize: target.fileSize, size: target.size, downloadCount: target.downloadCount }))
})
app.delete('/api/teacher/resources/:id', (req, res) => {
  const db = getDB()
  db.resources = db.resources.filter((r) => String(r.id) !== String(req.params.id))
  saveDB()
  res.json(ok({ success: true, id: req.params.id }))
})
function formatSize(bytes) {
  if (!bytes || bytes < 1024) return `${bytes || 0}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

// ==================== 账号管理（管理员） ====================
const BUILTIN_ACCOUNTS_VIEW = [
  { id: 'student', role: 'student', username: 'student', name: '张同学', accountId: '2021001', major: '计算机科学与技术', grade: '大三', gender: '男', email: 'student@example.com', system: true },
  { id: 'admin', role: 'teacher', username: 'admin', name: '管理员', accountId: 'admin', title: '管理员', department: '-', email: '', system: true },
  { id: 'teacher', role: 'teacher', username: 'teacher', name: '李老师', accountId: 'T001', title: '管理员', department: '-', email: '', system: true },
  { id: 'leader', role: 'teacher', username: 'leader', name: '王老师', accountId: 't1', title: '带队教师', department: '自动化', email: '', system: true },
]
function normalizeAccount(u) {
  if (u.role === 'student') return { id: u.id, role: 'student', username: u.username, name: u.name, accountId: u.accountId || u.username, major: u.major || '-', grade: u.grade || '-', gender: u.gender || '-', email: u.email || '', system: false }
  return { id: u.id, role: 'teacher', username: u.username, name: u.name, accountId: u.accountId || u.username, title: u.title || '带队教师', department: u.department || '-', email: u.email || '', system: false }
}
app.get('/api/admin/accounts', (req, res) => {
  const user = requireUser(req, res)
  if (!user || user.teacherType !== 'admin') return res.json(fail(403, '仅管理员可访问'))
  const db = getDB()
  const { role, keyword, grade, major } = req.query
  let list = [...BUILTIN_ACCOUNTS_VIEW, ...db.registeredUsers.map(normalizeAccount)]
  if (role === 'student' || role === 'teacher') list = list.filter((a) => a.role === role)
  if (keyword) {
    const k = String(keyword).toLowerCase()
    list = list.filter((a) => (a.name || '').toLowerCase().includes(k) || (a.accountId || '').toLowerCase().includes(k) || (a.username || '').toLowerCase().includes(k))
  }
  if (grade && role !== 'teacher') list = list.filter((a) => a.grade === grade)
  if (major && role !== 'teacher') list = list.filter((a) => a.major === major)
  res.json(ok({ list, total: list.length }))
})
app.post('/api/admin/accounts/reset-password', (req, res) => {
  const user = requireUser(req, res)
  if (!user || user.teacherType !== 'admin') return res.json(fail(403, '仅管理员可操作'))
  const { id } = req.body || {}
  if (!id) return res.json(fail(400, '缺少账号标识'))
  if (BUILTIN_ACCOUNTS_VIEW.some((a) => a.id === id)) return res.json(fail(400, '系统内置账号不可重置密码'))
  const db = getDB()
  const target = db.registeredUsers.find((u) => u.id === id)
  if (!target) return res.json(fail(404, '账号不存在'))
  target.password = '123456'
  saveDB()
  res.json(ok({ success: true }))
})
app.post('/api/admin/accounts/delete', (req, res) => {
  const user = requireUser(req, res)
  if (!user || user.teacherType !== 'admin') return res.json(fail(403, '仅管理员可操作'))
  const { id } = req.body || {}
  if (!id) return res.json(fail(400, '缺少账号标识'))
  if (BUILTIN_ACCOUNTS_VIEW.some((a) => a.id === id)) return res.json(fail(400, '系统内置账号不可删除'))
  const db = getDB()
  if (!db.registeredUsers.some((u) => u.id === id)) return res.json(fail(404, '账号不存在'))
  db.registeredUsers = db.registeredUsers.filter((u) => u.id !== id)
  saveDB()
  res.json(ok({ success: true }))
})

// ==================== 消息 ====================
app.get('/api/messages', (req, res) => {
  const user = getUserFromToken(req)
  const role = (user?.role) || 'student'
  const userName = user?.name || ''
  const userId = user?.id || user?.accountId || ''
  const list = getDB().messages.filter((item) => {
    if (item.role && item.role !== role) return false
    if (item.userId || item.userName) return item.userId === userId || item.userName === userName || (!userName && !userId)
    return true
  }).map((i) => ({ ...i }))
  res.json(ok({ list, total: list.length }))
})
app.put('/api/messages/read-all', (req, res) => {
  getDB().messages.forEach((i) => { i.isRead = true })
  saveDB()
  res.json(ok({ success: true }))
})
app.put('/api/messages/:id/read', (req, res) => {
  const target = getDB().messages.find((i) => String(i.id) === String(req.params.id))
  if (target) { target.isRead = true; saveDB() }
  res.json(ok({ success: true, id: req.params.id }))
})

// ==================== 文件上传 ====================
const uploadDir = path.join(__dirname, 'uploads')
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/[^\w.\-一-龥]/g, '_')}`),
})
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } })
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.json(fail(400, '未收到文件'))
  const url = `/uploads/${req.file.filename}`
  res.json(ok({ url, name: req.file.originalname, size: req.file.size }))
})
app.use('/uploads', express.static(uploadDir))

// ==================== 静态前端（生产部署时由后端直接托管） ====================
const distDir = path.join(__dirname, '..', 'dist')
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir))
  app.get(/^\/(?!api\/|uploads\/).*/, (req, res) => {
    res.sendFile(path.join(distDir, 'index.html'))
  })
}

app.listen(PORT, () => {
  console.log(`✅ 师生交互平台后端已启动: http://localhost:${PORT}`)
  console.log(`   数据文件: ${path.join(__dirname, 'data', 'data.json')}`)
})
