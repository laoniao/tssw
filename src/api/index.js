import request from '@/utils/request'

// ==================== 通用接口 ====================

// 上传文件（onProgress 回调可选，用于渲染真实上传进度）
export function uploadFile(file, onProgress) {
  const formData = new FormData()
  formData.append('file', file)
  return request({
    url: '/upload',
    method: 'post',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    // 上传单独放宽超时：全局 15s 会让稍大的课件/视频还没传完就被中断
    timeout: 120000,
    onUploadProgress: (e) => {
      if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100))
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

// 队长选择队伍后申请带队老师
export function registerTeamCompetition(data) {
  return request({
    url: '/competitions/team-register',
    method: 'post',
    data,
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

// 获取个人中心数据
export function getStudentProfile() {
  return request({
    url: '/student/profile',
    method: 'get',
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

// 编辑公告
export function editAnnouncement(id, data) {
  return request({
    url: `/teacher/announcements/${id}`,
    method: 'put',
    data,
  })
}

// 删除公告
export function deleteAnnouncement(id) {
  return request({
    url: `/teacher/announcements/${id}`,
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
