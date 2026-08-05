import request from '@/utils/request'

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

// 获取我的队伍
export function getMyTeams() {
  return request({
    url: '/my-teams',
    method: 'get',
  })
}

// 直接申请加入队伍（找队伍）
export function joinTeam(teamId) {
  return request({
    url: `/teams/${teamId}/join`,
    method: 'post',
  })
}

// 生成邀请链接
export function generateInvite(teamId) {
  return request({
    url: `/teams/${teamId}/invite`,
    method: 'post',
  })
}

// 通过邀请码申请加入
export function apply(code) {
  return request({
    url: '/teams/apply',
    method: 'post',
    data: { code },
  })
}

// 获取邀请详情（邀请页）
export function getInviteDetail(code) {
  return request({
    url: '/teams/invite-detail',
    method: 'get',
    params: { code },
  })
}

// 队长：获取某队伍的申请列表
export function getTeamApplications(teamId) {
  return request({
    url: `/teams/${teamId}/applications`,
    method: 'get',
  })
}

// 队长：审核申请（通过/拒绝）
export function auditApplication(data) {
  return request({
    url: '/teams/applications/audit',
    method: 'post',
    data,
  })
}

// 当前学生发起的申请列表
export function getMyApplications() {
  return request({
    url: '/teams/my-applications',
    method: 'get',
  })
}
