import Mock from 'mockjs'

const responseTemplate = {
  code: 200,
  message: 'success',
  data: null,
}

export const majors = [
  '计算机科学与技术',
  '人工智能',
  '建筑电气与智能化',
  '自动化',
  '电气工程及其自动化',
]

// GET /api/profile/majors
Mock.mock('/api/profile/majors', 'get', () => ({
  ...responseTemplate,
  data: { list: majors },
}))

// PUT /api/profile —— 同步回写注册用户，保证个人中心与登录信息一致
Mock.mock('/api/profile', 'put', (options) => {
  const body = JSON.parse(options.body || '{}')
  const data = {
    avatar: body.avatar || '',
    nickname: body.nickname || '',
    major: body.major || '',
    bio: body.bio || '',
  }
  try {
    const userRaw = localStorage.getItem('user')
    const userState = userRaw ? JSON.parse(userRaw) : null
    const studentId = userState?.userInfo?.studentId
    if (studentId) {
      const list = JSON.parse(localStorage.getItem('registeredUsers') || '[]')
      const idx = list.findIndex((u) => u.role === 'student' && u.username === studentId)
      if (idx >= 0) {
        if (data.nickname) list[idx].name = data.nickname
        if (data.major) list[idx].major = data.major
        if (data.bio !== undefined) list[idx].bio = data.bio
        if (data.avatar) list[idx].avatar = data.avatar
        localStorage.setItem('registeredUsers', JSON.stringify(list))
      }
    }
  } catch { /* ignore */ }
  return {
    ...responseTemplate,
    message: '资料更新成功',
    data,
  }
})

// POST /api/upload — 头像上传
Mock.mock('/api/upload', 'post', () => ({
  ...responseTemplate,
  data: {
    url: Mock.Random.image('200x200', '#667eea', '#ffffff', 'png', 'avatar'),
  },
}))

export default majors
