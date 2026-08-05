import { createRouter, createWebHistory } from 'vue-router'

// 登录页面
const Login = () => import('@/views/login/LoginPage.vue')

// 学生端布局和页面
const StudentLayout = () => import('@/views/student/StudentLayout.vue')
const CompetitionHall = () => import('@/views/student/CompetitionHall.vue')
const CompetitionDetail = () => import('@/views/student/CompetitionDetail.vue')
const TeamCenter = () => import('@/views/student/TeamCenter.vue')
const MyProfile = () => import('@/views/student/MyProfile.vue')
const WorksShowcase = () => import('@/views/student/WorksShowcase.vue')
const StudentMessages = () => import('@/views/student/Messages.vue')
const TeamInvite = () => import('@/views/student/TeamInvite.vue')

// 教师端布局和页面
const TeacherLayout = () => import('@/views/teacher/TeacherLayout.vue')
const PublishComp = () => import('@/views/teacher/PublishComp.vue')
const TeamAudit = () => import('@/views/teacher/TeamAudit.vue')
const GuideAssign = () => import('@/views/teacher/GuideAssign.vue')
const DataBoard = () => import('@/views/teacher/DataBoard.vue')
const Announcement = () => import('@/views/teacher/Announcement.vue')
const TeacherMessages = () => import('@/views/teacher/Messages.vue')
const AccountManage = () => import('@/views/teacher/AccountManage.vue')

const routes = [
  {
    path: '/',
    redirect: '/login',
  },
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: { title: '登录注册', requiresAuth: false },
  },
  // ==================== 学生端路由 ====================
  {
    path: '/student',
    component: StudentLayout,
    meta: { requiresAuth: true, role: 'student' },
    redirect: '/student/competitions',
    children: [
      {
        path: 'competitions',
        name: 'CompetitionHall',
        component: CompetitionHall,
        meta: { title: '比赛大厅', icon: 'Trophy' },
      },
      {
        path: 'competition/:id',
        name: 'CompetitionDetail',
        component: CompetitionDetail,
        meta: { title: '比赛详情', icon: 'Document' },
      },
      {
        path: 'team',
        name: 'TeamCenter',
        component: TeamCenter,
        meta: { title: '组队中心', icon: 'UserFilled' },
      },
      {
        path: 'profile',
        name: 'MyProfile',
        component: MyProfile,
        meta: { title: '个人中心', icon: 'User' },
      },
      {
        path: 'works',
        name: 'WorksShowcase',
        component: WorksShowcase,
        meta: { title: '作品展示', icon: 'PictureFilled' },
      },
      {
        path: 'messages',
        name: 'StudentMessages',
        component: StudentMessages,
        meta: { title: '消息中心', icon: 'Bell' },
      },
      {
        path: 'invite',
        name: 'TeamInvite',
        component: TeamInvite,
        meta: { title: '组队邀请', icon: 'Link' },
      },
    ],
  },
  // ==================== 教师端路由 ====================
  {
    path: '/teacher',
    component: TeacherLayout,
    meta: { requiresAuth: true, role: 'teacher' },
    redirect: () => {
      try {
        const user = JSON.parse(localStorage.getItem('user') || '{}')
        return user?.userInfo?.teacherType === 'leader'
          ? '/teacher/team-audit'
          : '/teacher/publish'
      } catch {
        return '/teacher/publish'
      }
    },
    children: [
      {
        path: 'publish',
        name: 'PublishComp',
        component: PublishComp,
        meta: { title: '比赛管理', icon: 'EditPen', teacherTypes: ['admin'] },
      },
      {
        path: 'team-audit',
        name: 'TeamAudit',
        component: TeamAudit,
        meta: { title: '队伍审核', icon: 'Checked', teacherTypes: ['admin', 'leader'] },
      },
      {
        path: 'guide-assign',
        name: 'GuideAssign',
        component: GuideAssign,
        meta: { title: '指导分配', icon: 'Connection', teacherTypes: ['admin'] },
      },
      {
        path: 'data-board',
        name: 'DataBoard',
        component: DataBoard,
        meta: { title: '数据看板', icon: 'DataAnalysis', teacherTypes: ['admin'] },
      },
      {
        path: 'announcement',
        name: 'Announcement',
        component: Announcement,
        meta: { title: '公告资源', icon: 'Bell', teacherTypes: ['admin'] },
      },
      {
        path: 'accounts',
        name: 'AccountManage',
        component: AccountManage,
        meta: { title: '账号管理', icon: 'Setting', teacherTypes: ['admin'] },
      },
      {
        path: 'messages',
        name: 'TeacherMessages',
        component: TeacherMessages,
        meta: { title: '消息中心', icon: 'ChatDotRound', teacherTypes: ['admin', 'leader'] },
      },
    ],
  },
  // 404
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/NotFound.vue'),
    meta: { title: '页面不存在' },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// 路由守卫 - 角色权限控制
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')
  const role = localStorage.getItem('role')

  // 设置页面标题
  if (to.meta.title) {
    document.title = `${to.meta.title} - 师生交互平台`
  }

  // 不需要认证的页面直接放行
  if (!to.meta.requiresAuth) {
    // 已登录用户访问登录页，重定向到对应首页
    if (to.path === '/login' && token && role) {
      next(role === 'student' ? '/student' : '/teacher')
      return
    }
    next()
    return
  }

  // 需要认证但未登录
  if (!token) {
    next('/login')
    return
  }

  // 检查角色权限
  const requiredRole = to.matched.find(r => r.meta.role)?.meta.role
  if (requiredRole && role !== requiredRole) {
    // 角色不匹配，重定向到对应首页
    next(role === 'student' ? '/student' : '/teacher')
    return
  }

  // 带队教师不可访问仅管理员菜单
  const teacherTypes = to.matched.find(r => r.meta.teacherTypes)?.meta.teacherTypes
  if (teacherTypes && role === 'teacher') {
    let teacherType = 'admin'
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}')
      teacherType = user?.userInfo?.teacherType || 'admin'
    } catch { /* ignore */ }
    if (!teacherTypes.includes(teacherType)) {
      next('/teacher/team-audit')
      return
    }
  }

  next()
})

export default router
