import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUserStore = defineStore('user', () => {
  // 用户信息
  const userInfo = ref(null)
  const token = ref('')
  const role = ref('') // 'student' | 'teacher'
  // 可编辑个人资料（头像、昵称、专业、简介）
  const profile = ref({
    avatar: '',
    nickname: '',
    major: '',
    bio: '',
  })

  // 设置用户信息（以本次登录/注册信息为准，不沿用上一账号资料）
  const setUserInfo = (info) => {
    userInfo.value = info
    if (info) {
      profile.value = {
        avatar: info.avatar || '',
        nickname: info.username || info.nickname || '',
        major: info.major || '',
        bio: info.bio || '',
      }
    } else {
      profile.value = { avatar: '', nickname: '', major: '', bio: '' }
    }
  }

  // 设置token
  const setToken = (newToken) => {
    token.value = newToken
    if (newToken) {
      localStorage.setItem('token', newToken)
    } else {
      localStorage.removeItem('token')
    }
  }

  // 设置角色
  const setRole = (newRole) => {
    role.value = newRole
    if (newRole) {
      localStorage.setItem('role', newRole)
    } else {
      localStorage.removeItem('role')
    }
  }

  // 登出
  const logout = () => {
    userInfo.value = null
    token.value = ''
    role.value = ''
    profile.value = { avatar: '', nickname: '', major: '', bio: '' }
    localStorage.removeItem('token')
    localStorage.removeItem('role')
  }

  // 更新个人资料，并同步到 userInfo
  const updateProfile = (data) => {
    profile.value = { ...profile.value, ...data }
    if (userInfo.value) {
      const synced = { ...userInfo.value }
      if (data.nickname !== undefined) synced.username = data.nickname
      if (data.avatar !== undefined) synced.avatar = data.avatar
      if (data.major !== undefined) synced.major = data.major
      if (data.bio !== undefined) synced.bio = data.bio
      userInfo.value = synced
    }
  }

  return {
    userInfo,
    token,
    role,
    profile,
    setUserInfo,
    setToken,
    setRole,
    logout,
    updateProfile,
  }
}, {
  persist: true,
})
