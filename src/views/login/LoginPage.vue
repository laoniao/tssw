<template>
  <div class="login-page">
    <!-- 背景粒子画布 -->
    <canvas ref="canvasRef" class="bg-canvas"></canvas>

    <!-- 背景装饰 -->
    <div class="bg-decoration">
      <div class="blob blob-1"></div>
      <div class="blob blob-2"></div>
      <div class="blob blob-3"></div>
    </div>

    <!-- 主体容器 -->
    <div class="login-wrapper">
      <!-- 左侧品牌区 -->
      <div class="brand-section">
        <div class="brand-content fade-in-up">
          <Robot3D />
          <h1 class="brand-title">师生交互平台</h1>
          <p class="brand-subtitle">连接每一位学生与老师<br />让比赛参与更简单、高效</p>

          <div class="feature-list">
            <div
              v-for="(feat, i) in features"
              :key="i"
              class="feature-item"
              :style="{ animationDelay: `${i * 0.1}s` }"
            >
              <div class="feature-icon">
                <el-icon><component :is="feat.icon" /></el-icon>
              </div>
              <span>{{ feat.text }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧表单区 -->
      <div class="form-section">
        <div class="login-card fade-in-up" style="animation-delay: 0.15s">
          <!-- 角色切换 -->
          <div class="role-switcher">
            <button
              type="button"
              class="role-btn"
              :class="{ active: activeRole === 'student' }"
              @click="activeRole = 'student'"
            >
              <el-icon><UserFilled /></el-icon>
              <span>学生</span>
            </button>
            <button
              type="button"
              class="role-btn"
              :class="{ active: activeRole === 'teacher' }"
              @click="activeRole = 'teacher'"
            >
              <el-icon><Avatar /></el-icon>
              <span>教师</span>
            </button>
          </div>

          <!-- 登录/注册切换 -->
          <div class="mode-tabs">
            <button
              type="button"
              class="mode-tab"
              :class="{ active: formMode === 'login' }"
              @click="formMode = 'login'"
            >登录</button>
            <button
              type="button"
              class="mode-tab"
              :class="{ active: formMode === 'register' }"
              @click="formMode = 'register'"
            >注册</button>
          </div>

          <!-- 表单内容 -->
          <transition name="slide-fade" mode="out-in">
            <!-- ==================== 登录模式 ==================== -->
            <div v-if="formMode === 'login'" key="login">
              <div class="welcome-text">
                <h2>欢迎回来</h2>
                <p>{{ activeRole === 'student' ? '请使用学号和密码登录' : '请使用工号和密码登录' }}</p>
              </div>

              <el-form
                :key="'login-' + activeRole"
                ref="loginFormRef"
                :model="loginForm"
                :rules="activeRole === 'student' ? studentLoginRules : teacherLoginRules"
                class="login-form"
                @submit.prevent="handleLogin"
              >
                <el-form-item prop="username">
                  <div class="input-wrapper">
                    <el-icon class="input-icon"><User /></el-icon>
                    <el-input
                      v-model="loginForm.username"
                      :placeholder="activeRole === 'student' ? '请输入学号' : '请输入工号'"
                      class="custom-input"
                      size="large"
                      clearable
                    />
                  </div>
                </el-form-item>
                <el-form-item prop="password">
                  <div class="input-wrapper">
                    <el-icon class="input-icon"><Lock /></el-icon>
                    <el-input
                      v-model="loginForm.password"
                      type="password"
                      placeholder="请输入密码"
                      class="custom-input"
                      size="large"
                      show-password
                      @keyup.enter="handleLogin"
                    />
                  </div>
                </el-form-item>
                <el-button
                  native-type="submit"
                  type="primary"
                  size="large"
                  class="action-btn"
                  :loading="loading"
                >
                  <span v-if="!loading">登录</span>
                  <span v-else>登录中...</span>
                </el-button>
              </el-form>

              <el-alert
                class="demo-tips"
                type="info"
                :closable="false"
                show-icon
              >
                <template #title>
                  <span v-if="activeRole === 'student'">
                    测试账号：<strong>student</strong>&nbsp;&nbsp;密码：<strong>123456</strong>
                  </span>
                  <span v-else>
                    管理员：<strong>admin</strong> / 带队老师：<strong>leader</strong>，密码均为 <strong>123456</strong>
                  </span>
                </template>
              </el-alert>
            </div>

            <!-- ==================== 注册模式 ==================== -->
            <div v-else key="register">
              <div class="welcome-text">
                <h2>创建账号</h2>
                <p>{{ activeRole === 'student' ? '注册成为学生用户' : '注册成为教师用户' }}</p>
              </div>

              <!-- 学生注册 -->
              <el-form
                v-if="activeRole === 'student'"
                key="reg-student"
                ref="studentRegRef"
                :model="studentRegForm"
                :rules="studentRegRules"
                class="login-form"
                @submit.prevent="handleStudentRegister"
              >
                <el-form-item prop="username">
                  <div class="input-wrapper">
                    <el-icon class="input-icon"><Reading /></el-icon>
                    <el-input v-model="studentRegForm.username" placeholder="请输入学号" class="custom-input" size="large" clearable />
                  </div>
                </el-form-item>
                <el-form-item prop="name">
                  <div class="input-wrapper">
                    <el-icon class="input-icon"><User /></el-icon>
                    <el-input v-model="studentRegForm.name" placeholder="请输入姓名" class="custom-input" size="large" clearable />
                  </div>
                </el-form-item>
                <div class="form-row">
                  <el-form-item prop="major" class="form-row-grow">
                    <el-select v-model="studentRegForm.major" placeholder="选择专业" class="w-full" size="large">
                      <el-option v-for="m in majors" :key="m" :label="m" :value="m" />
                    </el-select>
                  </el-form-item>
                  <el-form-item prop="grade" class="form-row-grade">
                    <el-select v-model="studentRegForm.grade" placeholder="年级" class="w-full" size="large">
                      <el-option v-for="g in grades" :key="g" :label="g" :value="g" />
                    </el-select>
                  </el-form-item>
                  <el-form-item prop="gender" class="form-row-grade">
                    <el-select v-model="studentRegForm.gender" placeholder="性别" class="w-full" size="large">
                      <el-option label="男" value="男" />
                      <el-option label="女" value="女" />
                    </el-select>
                  </el-form-item>
                </div>
                <el-form-item prop="password">
                  <div class="input-wrapper">
                    <el-icon class="input-icon"><Lock /></el-icon>
                    <el-input v-model="studentRegForm.password" type="password" placeholder="设置密码（至少6位）" class="custom-input" size="large" show-password />
                  </div>
                </el-form-item>
                <el-form-item prop="confirmPassword">
                  <div class="input-wrapper">
                    <el-icon class="input-icon"><Key /></el-icon>
                    <el-input v-model="studentRegForm.confirmPassword" type="password" placeholder="确认密码" class="custom-input" size="large" show-password />
                  </div>
                </el-form-item>
                <el-form-item prop="email">
                  <div class="input-wrapper">
                    <el-icon class="input-icon"><Message /></el-icon>
                    <el-input v-model="studentRegForm.email" placeholder="请输入邮箱（选填）" class="custom-input" size="large" clearable />
                  </div>
                </el-form-item>
                <el-button native-type="submit" type="primary" size="large" class="action-btn" :loading="loading">
                  <span v-if="!loading">注册并登录</span>
                  <span v-else>注册中...</span>
                </el-button>
              </el-form>

              <!-- 教师注册 -->
              <el-form
                v-else
                key="reg-teacher"
                ref="teacherRegRef"
                :model="teacherRegForm"
                :rules="teacherRegRules"
                class="login-form"
                @submit.prevent="handleTeacherRegister"
              >
                <el-form-item prop="username">
                  <div class="input-wrapper">
                    <el-icon class="input-icon"><Reading /></el-icon>
                    <el-input v-model="teacherRegForm.username" placeholder="请输入工号" class="custom-input" size="large" clearable />
                  </div>
                </el-form-item>
                <el-form-item prop="name">
                  <div class="input-wrapper">
                    <el-icon class="input-icon"><User /></el-icon>
                    <el-input v-model="teacherRegForm.name" placeholder="请输入姓名" class="custom-input" size="large" clearable />
                  </div>
                </el-form-item>
                <el-form-item prop="password">
                  <div class="input-wrapper">
                    <el-icon class="input-icon"><Lock /></el-icon>
                    <el-input v-model="teacherRegForm.password" type="password" placeholder="设置密码（至少6位）" class="custom-input" size="large" show-password />
                  </div>
                </el-form-item>
                <el-form-item prop="confirmPassword">
                  <div class="input-wrapper">
                    <el-icon class="input-icon"><Key /></el-icon>
                    <el-input v-model="teacherRegForm.confirmPassword" type="password" placeholder="确认密码" class="custom-input" size="large" show-password />
                  </div>
                </el-form-item>
                <el-form-item prop="email">
                  <div class="input-wrapper">
                    <el-icon class="input-icon"><Message /></el-icon>
                    <el-input v-model="teacherRegForm.email" placeholder="请输入邮箱（选填）" class="custom-input" size="large" clearable />
                  </div>
                </el-form-item>
                <el-button native-type="submit" type="primary" size="large" class="action-btn" :loading="loading">
                  <span v-if="!loading">注册并登录</span>
                  <span v-else>注册中...</span>
                </el-button>
              </el-form>
            </div>
          </transition>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/store/user'
import { studentLogin, teacherLogin, studentRegister, teacherRegister } from '@/api'
import Robot3D from '@/components/Robot3D.vue'

const router = useRouter()
const userStore = useUserStore()

const activeRole = ref('student')
const formMode = ref('login') // 'login' | 'register'
const loading = ref(false)
const canvasRef = ref(null)

// 表单 ref
const loginFormRef = ref()
const studentRegRef = ref()
const teacherRegRef = ref()

// ---------- 平台特性 ----------
const features = [
  { icon: 'Trophy', text: '一站式比赛报名与管理' },
  { icon: 'UserFilled', text: '智能队友与导师匹配' },
  { icon: 'DataAnalysis', text: '可视化数据看板' },
  { icon: 'PictureFilled', text: '往届优秀作品展示' },
]

// ---------- 下拉选项 ----------
const majors = [
  '计算机科学与技术',
  '人工智能',
  '建筑电气与智能化',
  '自动化',
  '电气工程及其自动化',
]
const grades = ['大一', '大二', '大三', '大四']

// ============ 登录表单 ============
const loginForm = reactive({ username: '', password: '' })
const studentLoginRules = {
  username: [{ required: true, message: '请输入学号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }, { min: 6, message: '密码长度不能少于6位', trigger: 'blur' }],
}
const teacherLoginRules = {
  username: [{ required: true, message: '请输入工号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }, { min: 6, message: '密码长度不能少于6位', trigger: 'blur' }],
}

// ============ 学生注册表单 ============
const studentRegForm = reactive({
  username: '', name: '', major: '', grade: '', gender: '', password: '', confirmPassword: '', email: '',
})
const validateStudentConfirm = (rule, value, callback) => {
  if (value !== studentRegForm.password) callback(new Error('两次输入的密码不一致'))
  else callback()
}
const studentRegRules = {
  username: [{ required: true, message: '请输入学号', trigger: 'blur' }],
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  major: [{ required: true, message: '请选择专业', trigger: 'change' }],
  grade: [{ required: true, message: '请选择年级', trigger: 'change' }],
  password: [{ required: true, message: '请设置密码', trigger: 'blur' }, { min: 6, message: '密码长度不能少于6位', trigger: 'blur' }],
  confirmPassword: [{ required: true, message: '请确认密码', trigger: 'blur' }, { validator: validateStudentConfirm, trigger: 'blur' }],
  email: [{ type: 'email', message: '邮箱格式不正确', trigger: 'blur' }],
}

// ============ 教师注册表单 ============
const teacherRegForm = reactive({
  username: '', name: '', password: '', confirmPassword: '', email: '',
})
const validateTeacherConfirm = (rule, value, callback) => {
  if (value !== teacherRegForm.password) callback(new Error('两次输入的密码不一致'))
  else callback()
}
const teacherRegRules = {
  username: [{ required: true, message: '请输入工号', trigger: 'blur' }],
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  password: [{ required: true, message: '请设置密码', trigger: 'blur' }, { min: 6, message: '密码长度不能少于6位', trigger: 'blur' }],
  confirmPassword: [{ required: true, message: '请确认密码', trigger: 'blur' }, { validator: validateTeacherConfirm, trigger: 'blur' }],
  email: [{ type: 'email', message: '邮箱格式不正确', trigger: 'blur' }],
}

// 切换角色时清空登录表单
watch(activeRole, () => {
  loginForm.username = ''
  loginForm.password = ''
})

// ============ 登录 ============
const handleLogin = async () => {
  if (!loginFormRef.value) return
  try { await loginFormRef.value.validate() } catch { return }
  loading.value = true
  try {
    const loginFn = activeRole.value === 'student' ? studentLogin : teacherLogin
    const res = await loginFn(loginForm)
    // 成功后再清空上一账号，避免登录失败误登出
    userStore.logout()
    userStore.setToken(res.data.token)
    userStore.setRole(activeRole.value)
    userStore.setUserInfo(res.data.userInfo)
    ElMessage.success('登录成功，欢迎回来！')
    const teacherHome = res.data.userInfo?.teacherType === 'leader'
      ? '/teacher/team-audit'
      : '/teacher/publish'
    await router.push(activeRole.value === 'student' ? '/student' : teacherHome)
  } catch (e) {
    console.error('登录失败:', e)
  } finally {
    loading.value = false
  }
}

// ============ 学生注册 ============
const handleStudentRegister = async () => {
  if (!studentRegRef.value) return
  try { await studentRegRef.value.validate() } catch { return }
  loading.value = true
  try {
    const res = await studentRegister({
      username: studentRegForm.username,
      password: studentRegForm.password,
      name: studentRegForm.name,
      major: studentRegForm.major,
      grade: studentRegForm.grade,
      gender: studentRegForm.gender,
      email: studentRegForm.email,
    })
    userStore.logout()
    userStore.setToken(res.data.token)
    userStore.setRole('student')
    userStore.setUserInfo(res.data.userInfo)
    ElMessage.success('注册成功，欢迎加入！')
    await router.push('/student')
  } catch (e) {
    console.error('注册失败:', e)
  } finally {
    loading.value = false
  }
}

// ============ 教师注册 ============
const handleTeacherRegister = async () => {
  if (!teacherRegRef.value) return
  try { await teacherRegRef.value.validate() } catch { return }
  loading.value = true
  try {
    const res = await teacherRegister({
      username: teacherRegForm.username,
      password: teacherRegForm.password,
      name: teacherRegForm.name,
      email: teacherRegForm.email,
    })
    userStore.logout()
    userStore.setToken(res.data.token)
    userStore.setRole('teacher')
    userStore.setUserInfo(res.data.userInfo)
    ElMessage.success('注册成功，已创建带队教师账号！')
    await router.push('/teacher/team-audit')
  } catch (e) {
    console.error('注册失败:', e)
  } finally {
    loading.value = false
  }
}

// ---- 粒子背景 ----------------------------------------
let animFrameId = null
const initParticles = () => {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  let w = canvas.width = window.innerWidth
  let h = canvas.height = window.innerHeight

  const NUM = 60
  const particles = Array.from({ length: NUM }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    r: Math.random() * 2 + 1,
    dx: (Math.random() - 0.5) * 0.4,
    dy: (Math.random() - 0.5) * 0.4,
    alpha: Math.random() * 0.4 + 0.1,
  }))

  const draw = () => {
    ctx.clearRect(0, 0, w, h)
    particles.forEach(p => {
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(255,255,255,${p.alpha})`
      ctx.fill()
      p.x += p.dx
      p.y += p.dy
      if (p.x < 0 || p.x > w) p.dx *= -1
      if (p.y < 0 || p.y > h) p.dy *= -1
    })
    particles.forEach((a, i) => {
      particles.slice(i + 1).forEach(b => {
        const dist = Math.hypot(a.x - b.x, a.y - b.y)
        if (dist < 100) {
          ctx.beginPath()
          ctx.strokeStyle = `rgba(255,255,255,${0.08 * (1 - dist / 100)})`
          ctx.lineWidth = 0.5
          ctx.moveTo(a.x, a.y)
          ctx.lineTo(b.x, b.y)
          ctx.stroke()
        }
      })
    })
    animFrameId = requestAnimationFrame(draw)
  }
  draw()

  const onResize = () => {
    w = canvas.width = window.innerWidth
    h = canvas.height = window.innerHeight
  }
  window.addEventListener('resize', onResize)
  return () => { window.removeEventListener('resize', onResize) }
}

let cleanupResize = null
onMounted(() => { cleanupResize = initParticles() })
onUnmounted(() => {
  if (animFrameId) cancelAnimationFrame(animFrameId)
  if (cleanupResize) cleanupResize()
})
</script>

<style scoped lang="scss">
.login-page {
  min-height: 100vh;
  background: $gradient-brand;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: $spacing-lg;
  padding-bottom: max($spacing-lg, env(safe-area-inset-bottom));
}

.bg-canvas {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}

.bg-decoration {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}

@keyframes blobFloat {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33%       { transform: translate(30px, -40px) scale(1.05); }
  66%       { transform: translate(-20px, 20px) scale(0.97); }
}

.blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  animation: blobFloat 8s ease-in-out infinite;

  &-1 {
    width: 420px;
    height: 420px;
    background: rgba(255, 255, 255, 0.12);
    top: -120px;
    left: -80px;
  }

  &-2 {
    width: 320px;
    height: 320px;
    background: rgba(30, 58, 138, 0.4);
    bottom: -60px;
    right: 80px;
    animation-delay: -3s;
  }

  &-3 {
    width: 220px;
    height: 220px;
    background: rgba(37, 99, 235, 0.3);
    top: 42%;
    left: 38%;
    animation-delay: -6s;
  }
}

.login-wrapper {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: $spacing-xxl;
  width: min(1080px, 96vw);
}

// ---- 左侧品牌区 ----------------------------------------
.brand-section {
  flex: 1;
  max-width: 480px;
  padding: $spacing-xl $spacing-lg;

  @media (max-width: $breakpoint-md) {
    display: none;
  }
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}

.brand-content {
  animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
}

.brand-icon {
  width: 76px;
  height: 76px;
  background: rgba(255, 255, 255, 0.18);
  border-radius: $radius-xl;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: $spacing-lg;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.35);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.brand-title {
  font-size: $font-size-3xl + 8px;
  font-weight: 800;
  color: #fff;
  letter-spacing: -0.8px;
  margin-bottom: $spacing-md;
  line-height: 1.15;
  text-shadow: 0 2px 16px rgba(15, 23, 42, 0.2);
}

.brand-subtitle {
  font-size: $font-size-lg;
  color: rgba(255, 255, 255, 0.88);
  line-height: 1.7;
  margin-bottom: $spacing-xl;
  font-weight: 500;
}

.feature-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: $spacing-md;
  color: #fff;
  font-size: $font-size-base;
  font-weight: 600;
  animation: fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;

  .feature-icon {
    width: 40px;
    height: 40px;
    background: rgba(255, 255, 255, 0.16);
    border-radius: $radius-md;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    font-size: $font-size-lg;
    color: #fff;
    border: 1px solid rgba(255, 255, 255, 0.28);
    backdrop-filter: blur(6px);
  }
}

// ---- 右侧表单区 ----------------------------------------
.form-section {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  @media (max-width: $breakpoint-md) {
    width: 100%;
  }
}

.login-card {
  width: 420px;
  max-width: 100%;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: $radius-xl;
  box-shadow: $shadow-lg;
  padding: $spacing-xl;
  border: 1px solid rgba(255, 255, 255, 0.55);
  animation: fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;

  @media (max-width: $breakpoint-sm) {
    padding: $spacing-lg $spacing-md;
  }
}

// ---- 角色切换 ----
.role-switcher {
  display: flex;
  gap: $spacing-sm;
  margin-bottom: $spacing-md;
  padding: $spacing-xs;
  background: rgba($primary, 0.08);
  border-radius: $radius-md;
}

.role-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: $spacing-xs;
  padding: $spacing-sm $spacing-md;
  border: none;
  background: transparent;
  border-radius: $radius-md;
  cursor: pointer;
  font-size: $font-size-base;
  font-weight: 500;
  color: $text-secondary;
  transition: $transition-base;

  &.active {
    color: #fff;
    font-weight: 600;
    background: linear-gradient(135deg, $primary, $primary-dark);
    box-shadow: $shadow-primary;
  }

  &:not(.active):hover {
    color: $primary;
    background: rgba($primary, 0.06);
  }
}

// ---- 登录/注册切换 ----
.mode-tabs {
  display: flex;
  gap: $spacing-sm;
  margin-bottom: $spacing-lg;
  padding: $spacing-xs;
  background: $bg-body;
  border-radius: $radius-md;
  border: 1px solid $border-color;
}

.mode-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: $spacing-sm $spacing-md;
  border: none;
  background: transparent;
  border-radius: $radius-md;
  cursor: pointer;
  font-size: $font-size-base;
  font-weight: 500;
  color: $text-secondary;
  transition: $transition-base;

  &.active {
    color: #fff;
    font-weight: 600;
    background: linear-gradient(135deg, $primary, $primary-dark);
    box-shadow: 0 2px 10px rgba($primary, 0.35);
  }

  &:not(.active):hover {
    color: $primary;
  }
}

// ---- 欢迎文字 ----
.welcome-text {
  margin-bottom: $spacing-lg;

  h2 {
    font-size: $font-size-xl + 4px;
    font-weight: 800;
    color: $text-primary;
    letter-spacing: -0.4px;
    margin-bottom: $spacing-xs;
  }

  p {
    font-size: $font-size-base;
    color: $text-muted;
  }
}

// ---- 表单 ----
.login-form {
  :deep(.el-form-item) {
    margin-bottom: $spacing-md;
  }

  :deep(.el-form-item__error) {
    padding-top: $spacing-xs;
  }

  :deep(.el-select .el-select__wrapper) {
    border-radius: $radius-md !important;
    min-height: 44px;
  }
}

.input-wrapper {
  width: 100%;
  position: relative;

  .input-icon {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    z-index: 1;
    color: $text-muted;
    font-size: $font-size-lg;
    pointer-events: none;
  }

  :deep(.custom-input .el-input__wrapper) {
    border-radius: $radius-md !important;
    padding-left: 40px;
    height: 44px;
    box-shadow: 0 0 0 1px $border-color inset !important;
    background: rgba($bg-body, 0.85);
    transition: $transition-fast;

    &:hover {
      box-shadow: 0 0 0 1px $primary inset !important;
    }

    &.is-focus {
      background: $bg-card;
      box-shadow: 0 0 0 1px $primary inset, 0 0 0 3px rgba($primary, 0.15) !important;
    }
  }

  :deep(.custom-input .el-input__inner) {
    font-size: $font-size-base;
  }
}

.form-row {
  display: flex;
  gap: $spacing-sm;

  @media (max-width: $breakpoint-sm) {
    flex-direction: column;
  }
}

.form-row-grow {
  flex: 1;
}

.form-row-grade {
  flex: 0 0 130px;

  @media (max-width: $breakpoint-sm) {
    flex: 1 1 auto;
  }
}

.w-full {
  width: 100%;
}

// ---- 按钮 ----
.action-btn {
  width: 100%;
  height: 44px !important;
  border-radius: $radius-md !important;
  font-size: $font-size-lg !important;
  font-weight: 600;
  letter-spacing: 0.5px;
  background: linear-gradient(135deg, $primary, $primary-dark) !important;
  border: none !important;
  margin-top: $spacing-xs;
  box-shadow: $shadow-primary !important;
  transition: $transition-base !important;
  padding: 0 !important;

  &:not(.is-loading):hover {
    filter: brightness(1.08);
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba($primary, 0.45) !important;
  }

  &:active {
    transform: translateY(0);
    filter: brightness(0.98);
  }
}

// ---- 测试提示 ----
.demo-tips {
  margin-top: $spacing-md;
  border-radius: $radius-md !important;
  background: rgba($primary, 0.08) !important;
  border: 1px solid rgba($primary, 0.18) !important;

  :deep(.el-alert__icon) {
    color: $primary;
  }

  :deep(.el-alert__title) {
    font-size: $font-size-sm;
    color: $text-secondary;
    font-weight: 500;
    line-height: 1.5;

    strong {
      color: $primary;
      font-weight: 700;
    }
  }
}

// ---- 切换动画 ----
.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.slide-fade-enter-from {
  opacity: 0;
  transform: translateX(16px);
}

.slide-fade-leave-to {
  opacity: 0;
  transform: translateX(-16px);
}
</style>
