import request from '@/utils/request'

// ==================== 通用接口 ====================

// 上传文件
export function uploadFile(file) {
  const formData = new FormData()
  formData.append('file', file)
  return request({
    url: '/upload',
    method: 'post',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
}

// ==================== 学生端接口 ====================

// 学生登录
export function studentLogin(data) {
  return request({
    url: '/student/login',
    method: 'post',
    data,
  })
}

// 学生注册
export function studentRegister(data) {
  return request({
    url: '/student/register',
    method: 'post',
    data,
  })
}

// 获取比赛列表
export function getCompetitions(params) {
  return request({
    url: '/competitions',
    method: 'get',
    params,
  })
}

// 获取比赛详情
export function getCompetitionDetail(id) {
  return request({
    url: `/competitions/${id}`,
    method: 'get',
  })
}

// 报名比赛（旧个人报名）
export function registerCompetition(data) {
  return request({
    url: '/competitions/register',
    method: 'post',
    data,
  })
}

// 队长选择队伍后申请带队老师
export function registerTeamCompetition(data) {
  return request({
    url: '/competitions/team-register',
    method: 'post',
    data,
  })
}

// 获取队伍列表
export function getTeams(params) {
  return request({
    url: '/teams',
    method: 'get',
    params,
  })
}

// 创建队伍
export function createTeam(data) {
  return request({
    url: '/teams',
    method: 'post',
    data,
  })
}

// 加入队伍
export function joinTeam(teamId) {
  return request({
    url: `/teams/${teamId}/join`,
    method: 'post',
  })
}

// 获取我的队伍
export function getMyTeams() {
  return request({
    url: '/my-teams',
    method: 'get',
  })
}

// 获取智能推荐
export function getRecommendations() {
  return request({
    url: '/recommendations',
    method: 'get',
  })
}

// 获取作品列表
export function getWorks(params) {
  return request({
    url: '/works',
    method: 'get',
    params,
  })
}

// 点赞作品
export function likeWork(workId) {
  return request({
    url: `/works/${workId}/like`,
    method: 'post',
  })
}

// 评论作品
export function commentWork(workId, data) {
  return request({
    url: `/works/${workId}/comments`,
    method: 'post',
    data,
  })
}

// 获取个人中心数据
export function getStudentProfile() {
  return request({
    url: '/student/profile',
    method: 'get',
  })
}

// 更新个人信息
export function updateStudentProfile(data) {
  return request({
    url: '/student/profile',
    method: 'put',
    data,
  })
}

// ==================== 教师端接口 ====================

// 教师登录
export function teacherLogin(data) {
  return request({
    url: '/teacher/login',
    method: 'post',
    data,
  })
}

// 教师注册
export function teacherRegister(data) {
  return request({
    url: '/teacher/register',
    method: 'post',
    data,
  })
}

// 获取教师发布的比赛列表
export function getTeacherCompetitions(params) {
  return request({
    url: '/teacher/competitions',
    method: 'get',
    params,
  })
}

// 发布比赛
export function publishCompetition(data) {
  return request({
    url: '/teacher/competitions',
    method: 'post',
    data,
  })
}

// 编辑比赛
export function editCompetition(id, data) {
  return request({
    url: `/teacher/competitions/${id}`,
    method: 'put',
    data,
  })
}

// 下架比赛
export function offlineCompetition(id) {
  return request({
    url: `/teacher/competitions/${id}/status`,
    method: 'put',
    data: { status: 'offline' },
  })
}

// 删除比赛
export function deleteCompetition(id) {
  return request({
    url: `/teacher/competitions/${id}`,
    method: 'delete',
  })
}

// 获取报名学生列表
export function getApplications(params) {
  return request({
    url: '/teacher/applications',
    method: 'get',
    params,
  })
}

// 审核报名
export function auditApplication(data) {
  return request({
    url: '/teacher/applications/audit',
    method: 'post',
    data,
  })
}

// 获取队伍审核列表
export function getTeamAuditList(params) {
  return request({
    url: '/teacher/teams-audit',
    method: 'get',
    params,
  })
}

// 审核队伍（仅带队老师）
export function auditTeam(data) {
  return request({
    url: '/teacher/teams-audit',
    method: 'post',
    data,
  })
}

// 管理员：获取可选带队老师列表
export function getLeaderTeachers() {
  return request({
    url: '/teacher/leader-teachers',
    method: 'get',
  })
}

// 指导分配
export function assignGuide(data) {
  return request({
    url: '/teacher/guide-assign',
    method: 'post',
    data,
  })
}

// 指导分配：可选指导教师池
export function getGuideTeachers() {
  return request({
    url: '/teacher/guide-teachers',
    method: 'get',
  })
}

// 获取统计数据
export function getStatistics() {
  return request({
    url: '/teacher/statistics',
    method: 'get',
  })
}

// 获取公告列表
export function getAnnouncements(params) {
  return request({
    url: '/teacher/announcements',
    method: 'get',
    params,
  })
}

// 发布公告
export function publishAnnouncement(data) {
  return request({
    url: '/teacher/announcements',
    method: 'post',
    data,
  })
}

// 获取资源列表
export function getResources(params) {
  return request({
    url: '/teacher/resources',
    method: 'get',
    params,
  })
}

// 上传资源
export function uploadResource(data) {
  return request({
    url: '/teacher/resources',
    method: 'post',
    data,
  })
}

// 删除资源
export function deleteResource(id) {
  return request({
    url: `/teacher/resources/${id}`,
    method: 'delete',
  })
}

// ==================== 账号管理（仅管理员） ====================

// 获取账号列表（role: 'student' | 'teacher' | 不传=全部）
export function getAccounts(params) {
  return request({
    url: '/admin/accounts',
    method: 'get',
    params,
  })
}

// 重置密码（注册账号重置为 123456）
export function resetAccountPassword(id) {
  return request({
    url: '/admin/accounts/reset-password',
    method: 'post',
    data: { id },
  })
}

// 删除账号
export function deleteAccount(id) {
  return request({
    url: '/admin/accounts/delete',
    method: 'post',
    data: { id },
  })
}
