import Mock from 'mockjs'
import { db, DEFAULT_AVATAR, nextId, formatDateTime } from '../db'

const responseTemplate = {
  code: 200,
  message: 'success',
  data: null,
}

const genCode = () => Mock.Random.string('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 6)

const getPersistedUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}')?.userInfo || null
  } catch {
    return null
  }
}

const findTeamByCode = (code) =>
  db.teams().find((t) => String(t.inviteCode).toUpperCase() === String(code || '').toUpperCase())

const findTeamById = (id) => db.teams().find((t) => t.id === Number(id))

const clampMembers = (n) => {
  const num = Number(n) || 1
  return Math.min(9, Math.max(1, num))
}

Mock.mock(/\/api\/teams(\?.*)?$/, 'get', () => ({
  ...responseTemplate,
  data: { list: db.teams().map((t) => ({ ...t })) },
}))

Mock.mock('/api/teams', 'post', (options) => {
  const body = JSON.parse(options.body || '{}')
  const user = getPersistedUser()
  const teams = db.teams()
  const maxMembers = clampMembers(body.maxMembers)
  const team = {
    id: nextId(teams),
    name: body.name || `新队伍${teams.length + 1}`,
    description: body.description || '',
    status: '招募中',
    maxMembers,
    currentMembers: 1,
    leader: {
      id: user?.id || 'me',
      name: user?.username || '同学',
      avatar: user?.avatar || DEFAULT_AVATAR,
    },
    members: [],
    // 创建时不绑定比赛；在比赛大厅选择带队老师并确认后再申请
    competitionId: null,
    inviteCode: genCode(),
    createdAt: formatDateTime(new Date()),
    auditStatus: '',
    leaderTeachers: [],
    rejectReason: '',
    isLeader: true,
  }
  teams.unshift(team)
  db.saveTeams(teams)
  return { ...responseTemplate, data: team }
})

Mock.mock('/api/my-teams', 'get', () => {
  const user = getPersistedUser()
  const name = user?.username
  const list = db.teams()
    .filter((t) => {
      if (!name) return t.id <= 2
      return t.leader?.name === name || (t.members || []).some((m) => m.name === name)
    })
    .map((t) => ({
      ...t,
      isLeader: !name ? t.id === 1 : t.leader?.name === name,
    }))
  return { ...responseTemplate, data: { list } }
})

Mock.mock(/\/api\/teams\/\d+\/join$/, 'post', (options) => {
  const id = Number(String(options.url).match(/\/api\/teams\/(\d+)\/join/)?.[1])
  const teams = db.teams()
  const team = teams.find((t) => t.id === id)
  if (!team) return { code: 404, message: '队伍不存在', data: null }
  if (team.status === '已满员' || team.currentMembers >= team.maxMembers) {
    return { code: 400, message: '队伍已满员', data: null }
  }
  const user = getPersistedUser()
  const member = {
    id: user?.id || Mock.Random.id(),
    name: user?.username || '新成员',
    avatar: user?.avatar || DEFAULT_AVATAR,
  }
  team.members = team.members || []
  if (![team.leader?.name, ...team.members.map((m) => m.name)].includes(member.name)) {
    team.members.push(member)
    team.currentMembers = 1 + team.members.length
    if (team.currentMembers >= team.maxMembers) team.status = '已满员'
    db.saveTeams(teams)
  }
  return { ...responseTemplate, data: { success: true, team } }
})

Mock.mock(/\/api\/teams\/\d+\/invite$/, 'post', (options) => {
  const id = Number(String(options.url).match(/\/api\/teams\/(\d+)\/invite/)?.[1])
  const teams = db.teams()
  const team = teams.find((t) => t.id === id)
  if (!team) return { code: 404, message: '队伍不存在', data: null }
  team.inviteCode = genCode()
  db.saveTeams(teams)
  return { ...responseTemplate, data: { inviteCode: team.inviteCode, teamId: team.id } }
})

Mock.mock(/\/api\/teams\/invite-detail(\?.*)?$/, 'get', (options) => {
  const url = new URL(options.url, 'http://local')
  const code = url.searchParams.get('code') || ''
  const team = findTeamByCode(code)
  if (!team) return { code: 404, message: '邀请码无效', data: null }
  return { ...responseTemplate, data: { team } }
})

Mock.mock('/api/teams/apply', 'post', (options) => {
  const body = JSON.parse(options.body || '{}')
  const code = body.inviteCode || body.code
  const team = code ? findTeamByCode(code) : findTeamById(body.teamId)
  if (!team) return { code: 404, message: '队伍不存在', data: null }
  const user = getPersistedUser()
  const apps = db.teamApplications()
  const item = {
    id: nextId(apps),
    teamId: team.id,
    teamName: team.name,
    inviteCode: team.inviteCode,
    applicantName: user?.username || body.applicantName || '同学',
    applicantAvatar: user?.avatar || DEFAULT_AVATAR,
    applicantMajor: user?.major || body.applicantMajor || '',
    applyTime: formatDateTime(new Date()),
    status: '待审核',
    remark: body.remark || '',
    isMine: true,
  }
  apps.unshift(item)
  db.saveTeamApplications(apps)
  return { ...responseTemplate, data: item }
})

Mock.mock(/\/api\/teams\/\d+\/applications$/, 'get', (options) => {
  const id = Number(String(options.url).match(/\/api\/teams\/(\d+)\/applications/)?.[1])
  const list = db.teamApplications().filter((a) => a.teamId === id)
  return { ...responseTemplate, data: { list } }
})

Mock.mock('/api/teams/applications/audit', 'post', (options) => {
  const body = JSON.parse(options.body || '{}')
  const apps = db.teamApplications()
  const row = apps.find((a) => String(a.id) === String(body.id))
  if (!row) return { code: 404, message: '申请不存在', data: null }
  const action = body.action
  row.status = body.status
    || (action === 'reject' || body.pass === false ? '已拒绝' : '已通过')
  db.saveTeamApplications(apps)

  if (row.status === '已通过') {
    const teams = db.teams()
    const team = teams.find((t) => t.id === row.teamId)
    if (team && team.currentMembers < team.maxMembers) {
      team.members = team.members || []
      if (!team.members.some((m) => m.name === row.applicantName)) {
        team.members.push({
          id: Mock.Random.id(),
          name: row.applicantName,
          avatar: row.applicantAvatar || DEFAULT_AVATAR,
        })
        team.currentMembers = 1 + team.members.length
        if (team.currentMembers >= team.maxMembers) team.status = '已满员'
        db.saveTeams(teams)
      }
    }
  }
  return { ...responseTemplate, data: { success: true } }
})

Mock.mock('/api/teams/my-applications', 'get', () => {
  const user = getPersistedUser()
  const name = user?.username
  const list = db.teamApplications().filter((a) => a.isMine || (name && a.applicantName === name))
  return { ...responseTemplate, data: { list } }
})

export default { findTeamById, findTeamByCode, clampMembers }
