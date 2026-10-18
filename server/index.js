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
  return { ...base, role: 'teacher', teacherId: u.accountId || u.username, teacherType: u.teacherType || 'leader', title: u.title || '带队教师', department: u.department || '', gender: u.gender || '' }
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

// ---------- 带队老师池（全部来自真实教师账号：内置账号 + 注册账号） ----------
// 用 accountId（工号）作为老师的稳定标识，与学生端选择的 team.leaderTeachers[].id 直接对应
function toTeacherView(u) {
  return {
    id: u.accountId || u.id,
    name: u.name,
    title: u.title || '带队教师',
    department: u.department || '',
    avatar: u.avatar || DEFAULT_AVATAR_URL,
    username: u.username || '',
    teacherId: u.accountId || u.username || '',
    maxStudents: 20,
    currentStudents: 0,
  }
}
// 可作为带队老师的账号：全部真实教师账号（管理员账号本身也是教师，同样可被指派带队）
function leadTeacherPool() {
  const db = getDB()
  return [...db.accounts, ...db.registeredUsers].filter((u) => u.role === 'teacher').map(toTeacherView)
}
// 全部教师账号（指导分配等场景）
function allTeacherPool() {
  const db = getDB()
  return [...db.accounts, ...db.registeredUsers].filter((u) => u.role === 'teacher').map(toTeacherView)
}
// 比赛上的带队老师改为只存 teacherIds，读取时按真实账号实时解析
function resolveTeachers(comp) {
  const pool = allTeacherPool()
  const ids = Array.isArray(comp?.teacherIds) ? comp.teacherIds : null
  if (ids) {
    return ids
      .map((id) => pool.find((t) => String(t.id) === String(id)))
      .filter(Boolean)
  }
  // 兼容历史数据：按 id 或姓名回填为真实账号
  return (comp?.teachers || []).map((t) => {
    const real = pool.find((r) => String(r.id) === String(t.id)) || pool.find((r) => r.name === t.name)
    return real ? { ...real, maxStudents: t.maxStudents || 20, currentStudents: t.currentStudents || 0 } : t
  })
}
// 统一输出比赛（附带实时解析出的带队老师）
function withTeachers(comp) {
  if (!comp) return comp
  return { ...comp, teachers: resolveTeachers(comp) }
}

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

// 判断一条消息是否属于某个用户
// 规则：1) 有明确收件人的消息，必须按 userId(工号/账号 id/用户名) 或姓名精确命中；
//      2) 只有「系统通知」这类无收件人的消息才允许广播给所有人；
//      3) 审核结果 / 审核提醒 / 组队邀请一律不允许广播，避免所有老师共用一套消息。
function messageTargetsUser(item, user) {
  if (!item || !user) return false
  if (item.role && item.role !== user.role) return false
  const hasTarget = item.userId || item.userName
  if (!hasTarget) return item.type === 'system'
  const keys = [user.id, user.accountId, user.username].filter(Boolean).map(String)
  if (item.userId && keys.includes(String(item.userId))) return true
  if (item.userName && String(item.userName) === String(user.name || '')) return true
  return false
}

// ==================== 学生端 ====================

// 学生登录
app.post('/api/student/login', (req, res) => {
  const { username, password } = req.body || {}
  const db = getDB()
  const allStudents = [...db.accounts, ...db.registeredUsers].filter((u) => u.role === 'student')
  const acc = allStudents.find((u) => u.username === username || u.accountId === username)
  if (!acc) return res.json(fail(401, '账号不存在，请检查学号或先注册'))
  if (acc.password !== password) return res.json(fail(401, '密码错误，请重新输入'))
  res.json(ok({ token: genToken(acc.id), userInfo: publicUser(acc) }))
})

// 学生注册
app.post('/api/student/register', (req, res) => {
  const { username, password, name, major, grade, gender, email } = req.body || {}
  const db = getDB()
  // 学号（username）全局唯一：不能与任何学生/教师账号相同，也不能与内置账号 accountId 冲突
  const conflict = [...db.accounts, ...db.registeredUsers].find(
    (u) => u.username === username || u.accountId === username,
  )
  if (conflict) return res.json(fail(400, '该学号已被占用，请更换'))
  // 学号不能与系统保留账号的学号冲突
  if ([...db.accounts, ...db.registeredUsers].some((u) => u.role === 'student' && u.accountId === username)) {
    return res.json(fail(400, '该学号已被占用，请更换'))
  }
  const id = `s_${Date.now()}`
  const user = { id, role: 'student', username, accountId: username, password, name, major, grade, gender, email: email || '', system: false, avatar: DEFAULT_AVATAR_URL }
  db.registeredUsers.push(user)
  saveDB()
  res.json(ok({ token: genToken(id), userInfo: publicUser(user) }))
})

// 比赛列表 / 详情
app.get('/api/competitions', (req, res) => {
  res.json(ok({ list: getDB().competitions.map(withTeachers) }))
})
app.get('/api/competitions/:id', (req, res) => {
  const list = getDB().competitions
  const comp = list.find((c) => String(c.id) === String(req.params.id)) || list[0] || null
  res.json(ok(withTeachers(comp)))
})

// 队伍报名（唯一报名入口：由队长为学生队伍申请带队老师，带队老师审核）
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
  const available = resolveTeachers(comp)
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
app.get('/api/works', (req, res) => {
  const user = getUserFromToken(req)
  const uid = user ? String(user.id || user.accountId || '') : ''
  const list = getDB().works.map((w) => {
    const { likedBy, ...rest } = w
    const list2 = Array.isArray(likedBy) ? likedBy : []
    return { ...rest, liked: uid ? list2.includes(uid) : false }
  })
  res.json(ok({ list }))
})
// 点赞 = 切换（同一用户再点一次即取消），不再只增不减
app.post('/api/works/:id/like', (req, res) => {
  const db = getDB()
  const work = db.works.find((w) => String(w.id) === String(req.params.id))
  if (!work) return res.json(fail(404, '作品不存在'))
  const user = requireUser(req, res)
  if (!user) return
  const uid = String(user.id || user.accountId || '')
  work.likedBy = Array.isArray(work.likedBy) ? work.likedBy : []
  const idx = work.likedBy.indexOf(uid)
  let liked
  if (idx > -1) {
    work.likedBy.splice(idx, 1)
    work.likes = Math.max(0, (work.likes || 0) - 1)
    liked = false
  } else {
    work.likedBy.push(uid)
    work.likes = (work.likes || 0) + 1
    liked = true
  }
  saveDB()
  res.json(ok({ workId: Number(work.id), liked, likes: work.likes }))
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

function countComments(list) { return list.reduce((s, i) => s + 1 + countComments(i.children || []), 0) }
function findComment(list, id) {
  for (const item of list) {
    if (item.id === id) return item
    if (item.children?.length) { const f = findComment(item.children, id); if (f) return f }
  }
  return null
}

// 个人中心
app.get('/api/student/profile', (req, res) => {
  const user = requireUser(req, res)
  if (!user) return
  const db = getDB()
  const studentId = user.accountId || user.username
  const myApps = db.applications.filter((a) => (a.student?.studentId || '') === studentId)
  const competitionHistory = {
    list: myApps.map((a) => ({ id: a.id, name: a.competition?.name || '未知比赛', status: a.status || '待审核', year: (a.applyTime || '').slice(0, 4) || '-', teamName: a.teamName || '-' })),
  }
  const teacherPool = [
    ...leadTeacherPool(),
    ...db.registeredUsers.filter((u) => u.role === 'teacher').map((u) => ({ id: u.id, name: u.name, title: u.title || '带队教师', department: u.department || '', avatar: u.avatar || DEFAULT_AVATAR_URL })),
  ]
  const teacherMap = new Map()
  myApps.forEach((a) => {
    if (a.guideAssigned && a.teacherId != null) {
      const t = teacherPool.find((x) => String(x.id) === String(a.teacherId))
      if (t && !teacherMap.has(String(t.id))) teacherMap.set(String(t.id), { id: t.id, name: t.name, title: t.title, department: t.department, avatar: t.avatar })
    }
  })
  const myTeachers = { list: [...teacherMap.values()] }
  const myTeams = db.teams.filter((t) => t.leader?.name === user.name || (t.members || []).some((m) => m.name === user.name))
  res.json(ok({ userInfo: publicUser(user), competitionHistory, myTeams, myTeachers }))
})

app.put('/api/profile', (req, res) => { updateProfileHandler(req, res) })

function updateProfileHandler(req, res) {
  const user = requireUser(req, res)
  if (!user) return
  const db = getDB()
  const acc = [...db.accounts, ...db.registeredUsers].find((u) => u.id === user.id)
  if (acc) {
    if (req.body?.nickname) acc.name = req.body.nickname
    if (req.body?.major) acc.major = req.body.major
    if (req.body?.gender !== undefined) acc.gender = req.body.gender
    if (req.body?.bio !== undefined) acc.bio = req.body.bio
    if (req.body?.avatar) acc.avatar = req.body.avatar
    saveDB()
  }
  res.json(ok({ avatar: acc?.avatar || '', nickname: acc?.name || '', major: acc?.major || '', gender: acc?.gender || '', bio: acc?.bio || '' }, '资料更新成功'))
}

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
// 入队统一走 POST /api/teams/apply（队长审核），不再提供直接入队接口
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
  // 兼容前端两种传法：邀请码用 code / inviteCode，直接申请用 teamId
  const inviteCode = body.inviteCode || body.code || ''
  const team = inviteCode ? findTeamByCode(inviteCode) : findTeamById(db.teams, body.teamId)
  if (!team) return res.json(fail(404, inviteCode ? '邀请码无效' : '队伍不存在'))
  const user = requireUser(req, res)
  if (!user) return
  if (team.leader?.name === user.name || (team.members || []).some((m) => m.name === user.name)) {
    return res.json(fail(400, '您已是该队伍成员'))
  }
  if ((team.members || []).length + 1 >= (team.maxMembers || 9)) {
    return res.json(fail(400, '队伍已满员'))
  }
  const pending = db.teamApplications.find((a) => String(a.teamId) === String(team.id) && a.applicantName === user.name && a.status === '待审核')
  if (pending) return res.json(fail(400, '您已提交过申请，请等待队长审核'))
  const item = { id: nextId('teamApplications'), teamId: team.id, teamName: team.name, inviteCode: team.inviteCode, applicantName: user.name, applicantAvatar: user.avatar || DEFAULT_AVATAR_URL, applicantMajor: user.major || '', applyTime: formatDateTime(new Date()), status: '待审核', remark: body.remark || '' }
  db.teamApplications.unshift(item)
  saveDB()
  // 定向通知队长（不广播），队长可在「组队中心 - 队伍审核」处理
  if (team.leader?.name) {
    pushMessage({
      type: 'invite',
      typeLabel: '入队申请',
      title: '收到入队申请',
      content: `「${user.name}」申请加入您的队伍「${team.name}」，请前往组队中心审核。`,
      role: 'student',
      userId: team.leader.id || '',
      userName: team.leader.name || '',
    })
  }
  res.json(ok(item))
})
app.get('/api/teams/:id/applications', (req, res) => {
  res.json(ok({ list: getDB().teamApplications.filter((a) => String(a.teamId) === String(req.params.id)) }))
})
app.post('/api/teams/applications/audit', (req, res) => {
  const db = getDB()
  const row = db.teamApplications.find((a) => String(a.id) === String(req.body?.id))
  if (!row) return res.json(fail(404, '申请不存在'))
  const b = req.body || {}
  const wantReject = b.action === 'reject' || b.action === 'refuse' || b.status === '已拒绝' || b.status === 'reject' || b.pass === false
  const wantPass = b.action === 'pass' || b.action === 'approve' || b.status === '已通过' || b.status === 'pass' || b.pass === true
  if (!wantReject && !wantPass) return res.json(fail(400, '缺少审核结果，请指定 action=pass 或 action=reject'))
  const status = wantReject ? '已拒绝' : '已通过'
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
  const list = getDB().teamApplications.filter((a) => a.applicantName === user.name)
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
  const allTeachers = [...db.accounts, ...db.registeredUsers].filter((u) => u.role === 'teacher')
  const acc = allTeachers.find((u) => u.username === username || u.accountId === username)
  if (!acc) return res.json(fail(401, '账号不存在，请检查工号或先注册'))
  if (acc.password !== password) return res.json(fail(401, '密码错误，请重新输入'))
  res.json(ok({ token: genToken(acc.id), userInfo: publicUser(acc) }))
})
app.post('/api/teacher/register', (req, res) => {
  const { username, password, name, email, gender } = req.body || {}
  const db = getDB()
  if ((getDB().accounts || []).some((a) => a.username === username || a.accountId === username)) return res.json(fail(400, '该工号为系统保留账号'))
  // 工号（username）全局唯一：不能与任何学生/教师账号相同，也不能与内置账号 accountId 冲突
  const conflict = [...db.accounts, ...db.registeredUsers].find(
    (u) => u.username === username || u.accountId === username,
  )
  if (conflict) return res.json(fail(400, '该工号已被占用，请更换'))
  // 同时不能与任何学生的学号冲突
  if ([...db.accounts, ...db.registeredUsers].some((u) => u.role === 'student' && u.accountId === username)) {
    return res.json(fail(400, '该工号已被占用，请更换'))
  }
  const id = `t_${Date.now()}`
  const user = { id, role: 'teacher', username, accountId: username, password, name, email: email || '', gender: gender || '', teacherType: 'leader', title: '带队教师', system: false, avatar: DEFAULT_AVATAR_URL }
  db.registeredUsers.push(user)
  saveDB()
  res.json(ok({ token: genToken(id), userInfo: publicUser(user) }))
})

app.get('/api/teacher/competitions', (req, res) => res.json(ok({ list: getDB().competitions.map(withTeachers) })))
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
    teacherIds: teacherIdsOf(body, []),
    teachers: [],
  }
  db.competitions.unshift(item)
  saveDB()
  res.json(ok(withTeachers(item)))
})
app.put('/api/teacher/competitions/:id', (req, res) => {
  const db = getDB()
  const item = db.competitions.find((c) => String(c.id) === String(req.params.id))
  if (!item) return res.json(fail(404, '比赛不存在'))
  const body = req.body || {}
  const range = body.dateRange || []
  // 先记下原有的带队老师 id，避免本次未传时被清空
  const prevIds = Array.isArray(item.teacherIds) ? item.teacherIds : (item.teachers || []).map((t) => String(t.id))
  Object.assign(item, body, {
    id: item.id,
    startTime: formatDateTime(body.startTime || range[0] || item.startTime),
    endTime: formatDateTime(body.endTime || range[1] || item.endTime),
    maxParticipants: Number(body.maxParticipants) || item.maxParticipants,
    maxTeams: Number(body.maxTeams) || item.maxTeams || 40,
    maxLeadTeachers: Math.max(1, Number(body.maxLeadTeachers) || item.maxLeadTeachers || 1),
    teachers: [],
  })
  delete item.dateRange
  item.teacherIds = teacherIdsOf(body, prevIds)
  saveDB()
  res.json(ok(withTeachers(item)))
})
// 从请求体提取带队老师 id 列表（只存 id，展示时按真实账号实时解析）
function teacherIdsOf(body, fallback = []) {
  if (Array.isArray(body.teacherIds)) return [...new Set(body.teacherIds.map(String).filter(Boolean))]
  if (Array.isArray(body.teachers)) return [...new Set(body.teachers.map((t) => String(t.id)).filter(Boolean))]
  return [...new Set(fallback.map(String).filter(Boolean))]
}
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
app.get('/api/teacher/leader-teachers', (req, res) => {
  // 直接取自真实教师账号（内置 + 注册），不再使用写死的演示老师
  res.json(ok({ list: leadTeacherPool() }))
})

app.get('/api/teacher/teams-audit', (req, res) => {
  const user = requireUser(req, res)
  if (!user) return
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
  // 显式判定审核意图：只有明确要求「通过」或「拒绝」时才改动状态。
  // 旧写法把任何未知取值都当成「已通过」，会出现「点拒绝却变成通过」的问题。
  const wantReject = body.action === 'reject' || body.action === 'refuse' || body.status === '已拒绝' || body.status === 'reject' || body.pass === false
  const wantPass = body.action === 'pass' || body.action === 'approve' || body.status === '已通过' || body.status === 'pass' || body.pass === true
  if (!wantReject && !wantPass) return res.json(fail(400, '缺少审核结果，请指定 action=pass 或 action=reject'))
  const finalStatus = wantReject ? '已拒绝' : '已通过'
  if (finalStatus === '已通过') {
    const approvedCount = db.teams.filter((t) => t.competitionId === team.competitionId && t.auditStatus === '已通过' && t.id !== team.id).length
    if (approvedCount >= (Number(comp?.maxTeams) || 40)) return res.json(fail(400, '本场比赛参赛队伍名额已满'))
    team.auditStatus = '已通过'
    team.rejectReason = ''
    // 比赛可能已被删除，这里容错，避免整条审核接口 500
    if (comp) comp.teamCount = db.teams.filter((t) => t.competitionId === comp.id && t.auditStatus === '已通过').length
  } else {
    team.auditStatus = '已拒绝'
    team.rejectReason = body.reason || ''
    if (comp) comp.teamCount = db.teams.filter((t) => t.competitionId === comp.id && ['待审核', '已通过'].includes(t.auditStatus)).length
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
  const map = new Map()
  allTeacherPool().forEach((t) => { if (!map.has(String(t.id))) map.set(String(t.id), { ...t, currentStudents: 0 }) })
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
app.put('/api/teacher/announcements/:id', (req, res) => {
  const db = getDB()
  const target = db.announcements.find((a) => String(a.id) === String(req.params.id))
  if (!target) return res.json(fail(404, '公告不存在'))
  const body = req.body || {}
  if (body.title !== undefined) target.title = body.title
  if (body.content !== undefined) target.content = body.content
  if (body.type !== undefined) target.type = body.type
  if (body.isTop !== undefined) target.isTop = !!body.isTop
  target.updatedAt = formatDateTime(new Date())
  saveDB()
  res.json(ok(target))
})
app.delete('/api/teacher/announcements/:id', (req, res) => {
  const db = getDB()
  const before = db.announcements.length
  db.announcements = db.announcements.filter((a) => String(a.id) !== String(req.params.id))
  if (db.announcements.length === before) return res.json(fail(404, '公告不存在'))
  saveDB()
  res.json(ok({ success: true, id: req.params.id }))
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
// 内置账号直接从数据文件派生，新增内置账号时无需再维护两份清单
function builtinAccountsView() {
  return (getDB().accounts || []).map((u) => {
    if (u.role === 'student') {
      return { id: u.id, role: 'student', username: u.username, name: u.name, accountId: u.accountId || u.username, major: u.major || '-', grade: u.grade || '-', gender: u.gender || '-', email: u.email || '', system: true }
    }
    return { id: u.id, role: 'teacher', username: u.username, name: u.name, accountId: u.accountId || u.username, title: u.title || '带队教师', gender: u.gender || '-', email: u.email || '', system: true }
  })
}
function normalizeAccount(u) {
  if (u.role === 'student') return { id: u.id, role: 'student', username: u.username, name: u.name, accountId: u.accountId || u.username, major: u.major || '-', grade: u.grade || '-', gender: u.gender || '-', email: u.email || '', system: false }
  return { id: u.id, role: 'teacher', username: u.username, name: u.name, accountId: u.accountId || u.username, title: u.title || '带队教师', gender: u.gender || '-', email: u.email || '', system: false }
}
app.get('/api/admin/accounts', (req, res) => {
  const user = requireUser(req, res)
  if (!user || user.teacherType !== 'admin') return res.json(fail(403, '仅管理员可访问'))
  const db = getDB()
  const { role, keyword, grade, major, gender } = req.query
  let list = [...builtinAccountsView(), ...db.registeredUsers.map(normalizeAccount)]
  if (role === 'student' || role === 'teacher') list = list.filter((a) => a.role === role)
  if (keyword) {
    const k = String(keyword).toLowerCase()
    list = list.filter((a) => (a.name || '').toLowerCase().includes(k) || (a.accountId || '').toLowerCase().includes(k) || (a.username || '').toLowerCase().includes(k))
  }
  if (grade && role !== 'teacher') list = list.filter((a) => a.grade === grade)
  if (major && role !== 'teacher') list = list.filter((a) => a.major === major)
  if (gender) list = list.filter((a) => a.gender === gender)
  res.json(ok({ list, total: list.length }))
})
app.post('/api/admin/accounts/reset-password', (req, res) => {
  const user = requireUser(req, res)
  if (!user || user.teacherType !== 'admin') return res.json(fail(403, '仅管理员可操作'))
  const { id } = req.body || {}
  if (!id) return res.json(fail(400, '缺少账号标识'))
  if (builtinAccountsView().some((a) => a.id === id)) return res.json(fail(400, '系统内置账号不可重置密码'))
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
  if (builtinAccountsView().some((a) => a.id === id)) return res.json(fail(400, '系统内置账号不可删除'))
  const db = getDB()
  if (!db.registeredUsers.some((u) => u.id === id)) return res.json(fail(404, '账号不存在'))
  db.registeredUsers = db.registeredUsers.filter((u) => u.id !== id)
  saveDB()
  res.json(ok({ success: true }))
})

// ==================== 消息 ====================
app.get('/api/messages', (req, res) => {
  const user = getUserFromToken(req)
  const visibleUser = user || { role: 'student', id: '', accountId: '', username: '', name: '' }
  const list = getDB().messages.filter((item) => messageTargetsUser(item, visibleUser)).map((i) => ({ ...i }))
  res.json(ok({ list, total: list.length }))
})
app.put('/api/messages/read-all', (req, res) => {
  const user = getUserFromToken(req)
  const visibleUser = user || { role: 'student', id: '', accountId: '', username: '', name: '' }
  getDB().messages.forEach((i) => {
    if (messageTargetsUser(i, visibleUser)) i.isRead = true
  })
  saveDB()
  res.json(ok({ success: true }))
})
app.put('/api/messages/:id/read', (req, res) => {
  const user = getUserFromToken(req)
  const visibleUser = user || { role: 'student', id: '', accountId: '', username: '', name: '' }
  const target = getDB().messages.find((i) => String(i.id) === String(req.params.id))
  if (target && messageTargetsUser(target, visibleUser)) { target.isRead = true; saveDB() }
  res.json(ok({ success: true, id: req.params.id }))
})

// ==================== 文件上传 ====================
// multer/busboy 以 latin1 解析上传文件名，中文会变成乱码，这里还原为 UTF-8
function decodeUploadName(name = '') {
  if (!name) return '未命名文件'
  let decoded = name
  try {
    const buf = Buffer.from(name, 'latin1')
    const utf8 = buf.toString('utf8')
    // 只有能无损回转时才说明原始字节确实是 UTF-8
    if (utf8 && Buffer.from(utf8, 'utf8').equals(buf)) decoded = utf8
  } catch {
    decoded = name
  }
  return decoded.replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, ' ').trim() || '未命名文件'
}

const uploadDir = path.join(__dirname, 'uploads')
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    // 磁盘上只存 ASCII 安全文件名，避免各系统编码差异导致乱码
    const original = decodeUploadName(file.originalname)
    const dot = original.lastIndexOf('.')
    const ext = dot > -1 ? original.slice(dot).toLowerCase() : ''
    const safeExt = /^\.[a-z0-9]{1,8}$/.test(ext) ? ext : ''
    const rand = Math.random().toString(36).slice(2, 8)
    cb(null, `${Date.now()}-${rand}${safeExt}`)
  },
})
// 与前端提示保持一致：单文件最大 50MB（此前 5MB 会导致稍大的课件/视频上传失败）
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } })
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.json(fail(400, '未收到文件'))
  const url = `/uploads/${encodeURIComponent(req.file.filename)}`
  // name 返回解码后的原始文件名，前端展示/下载用
  res.json(ok({ url, name: decodeUploadName(req.file.originalname), size: req.file.size }))
})
// 按原始文件名下载（兼容中文名）
app.get('/api/files/download', (req, res) => {
  const raw = String(req.query.file || '')
  const base = path.basename(raw)
  const target = path.join(uploadDir, base)
  if (!base || !fs.existsSync(target)) return res.status(404).json(fail(404, '文件不存在'))
  const name = decodeUploadName(String(req.query.name || base))
  res.setHeader('Content-Disposition', `attachment; filename="file"; filename*=UTF-8''${encodeURIComponent(name)}`)
  res.sendFile(target)
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
