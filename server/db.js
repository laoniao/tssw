/**
 * 共享数据层（服务器端 JSON 文件存储）
 * - 所有用户访问同一台服务器，读写同一个 data.json，因此数据天然共享
 * - 首次启动写入种子数据；之后持久化到 disk
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, 'data')
const DATA_FILE = path.join(DATA_DIR, 'data.json')

const DEFAULT_AVATAR = 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'

const SEED = {
  competitions: [
    {
      id: 1,
      name: '智能硬件创新设计大赛',
      description: '面向全校学生的智能硬件与嵌入式创新设计竞赛，鼓励跨专业组队。',
      cover: '',
      status: '报名中',
      category: '创新类',
      startTime: '2026-03-01 00:00:00',
      endTime: '2026-06-30 23:59:59',
      participantCount: 86,
      maxParticipants: 200,
      maxTeams: 40,
      maxLeadTeachers: 2,
      teamCount: 1,
      rules: '以团队形式参赛，每队学生 1-9 人（不含带队老师），需提交作品说明书与演示视频。',
      teachers: [
        { id: 't1', name: '王老师', title: '带队教师', department: '自动化', avatar: DEFAULT_AVATAR, maxStudents: 15, currentStudents: 6 },
        { id: 't3', name: '赵老师', title: '带队教师', department: '电气工程', avatar: DEFAULT_AVATAR, maxStudents: 12, currentStudents: 4 },
      ],
    },
    {
      id: 2,
      name: '电气工程技能竞赛',
      description: '考察电路分析、控制系统与电气安全等综合技能。',
      cover: '',
      status: '报名中',
      category: '技能类',
      startTime: '2026-04-01 00:00:00',
      endTime: '2026-07-15 23:59:59',
      participantCount: 52,
      maxParticipants: 120,
      maxTeams: 30,
      maxLeadTeachers: 1,
      teamCount: 0,
      rules: '以团队形式参赛，每队学生 1-9 人（不含带队老师），现场实操与理论笔试相结合。',
      teachers: [
        { id: 't3', name: '赵老师', title: '带队教师', department: '电气工程', avatar: DEFAULT_AVATAR, maxStudents: 12, currentStudents: 4 },
      ],
    },
    {
      id: 3,
      name: '人工智能应用挑战赛',
      description: '围绕视觉识别、自然语言处理等方向完成应用原型。',
      cover: '',
      status: '进行中',
      category: '学术类',
      startTime: '2026-02-15 00:00:00',
      endTime: '2026-05-20 23:59:59',
      participantCount: 140,
      maxParticipants: 180,
      maxTeams: 50,
      maxLeadTeachers: 2,
      teamCount: 0,
      rules: '以团队形式参赛，每队学生 1-9 人（不含带队老师），需提交代码仓库地址与答辩 PPT。',
      teachers: [
        { id: 't1', name: '王老师', title: '带队教师', department: '自动化', avatar: DEFAULT_AVATAR, maxStudents: 15, currentStudents: 8 },
        { id: 't4', name: '陈老师', title: '带队教师', department: '建筑电气', avatar: DEFAULT_AVATAR, maxStudents: 10, currentStudents: 3 },
      ],
    },
    {
      id: 4,
      name: '建筑电气智能化方案赛',
      description: '针对智慧楼宇场景设计电气与智能化综合方案。',
      cover: '',
      status: '报名中',
      category: '设计类',
      startTime: '2026-03-20 00:00:00',
      endTime: '2026-08-01 23:59:59',
      participantCount: 38,
      maxParticipants: 100,
      maxTeams: 25,
      maxLeadTeachers: 1,
      teamCount: 0,
      rules: '以团队形式参赛，每队学生 1-9 人（不含带队老师），提交方案书与系统架构图。',
      teachers: [
        { id: 't4', name: '陈老师', title: '带队教师', department: '建筑电气', avatar: DEFAULT_AVATAR, maxStudents: 10, currentStudents: 3 },
      ],
    },
    {
      id: 5,
      name: '程序设计校内选拔赛',
      description: '历年优秀赛事，已结束归档，可供查阅往届规则。',
      cover: '',
      status: '已结束',
      category: '技能类',
      startTime: '2025-09-01 00:00:00',
      endTime: '2025-11-30 23:59:59',
      participantCount: 210,
      maxParticipants: 210,
      maxTeams: 60,
      maxLeadTeachers: 1,
      teamCount: 60,
      rules: '以团队形式参赛，每队学生 1-9 人（不含带队老师）。',
      teachers: [
        { id: 't1', name: '王老师', title: '带队教师', department: '自动化', avatar: DEFAULT_AVATAR, maxStudents: 30, currentStudents: 30 },
      ],
    },
  ],
  applications: [
    { id: 1, student: { id: 's1', name: '周晓', studentId: '20240101', major: '计算机科学与技术', grade: '大二', gender: '女', avatar: DEFAULT_AVATAR }, competition: { id: 1, name: '智能硬件创新设计大赛' }, teacherId: 't1', status: '待审核', applyTime: '2026-03-05 10:22:00', reason: '希望参与嵌入式方向' },
    { id: 2, student: { id: 's2', name: '刘洋', studentId: '20230108', major: '自动化', grade: '大三', gender: '男', avatar: DEFAULT_AVATAR }, competition: { id: 1, name: '智能硬件创新设计大赛' }, teacherId: 't1', status: '已通过', applyTime: '2026-03-04 09:10:00', reason: '有单片机项目经验' },
    { id: 3, student: { id: 's3', name: '陈雨', studentId: '20240215', major: '人工智能', grade: '大一', gender: '女', avatar: DEFAULT_AVATAR }, competition: { id: 3, name: '人工智能应用挑战赛' }, teacherId: 't2', status: '待审核', applyTime: '2026-03-06 14:30:00', reason: '对 CV 方向感兴趣' },
    { id: 4, student: { id: 's4', name: '韩梅', studentId: '20220322', major: '电气工程及其自动化', grade: '大四', gender: '女', avatar: DEFAULT_AVATAR }, competition: { id: 2, name: '电气工程技能竞赛' }, teacherId: 't3', status: '待审核', applyTime: '2026-04-02 11:05:00', reason: '准备就业作品集' },
  ],
  teams: [
    {
      id: 1, name: '星火硬件队', description: '专注智能硬件与传感系统设计', status: '招募中', maxMembers: 5, currentMembers: 2,
      leader: { id: 'builtin-student', name: '张同学', avatar: DEFAULT_AVATAR },
      members: [{ id: 'm1', name: '刘洋', avatar: DEFAULT_AVATAR }],
      competitionId: 1, inviteCode: 'ABC123', createdAt: '2026-03-02 12:00:00', auditStatus: '已通过',
      leaderTeachers: [{ id: 't1', name: '王老师', title: '带队教师' }], rejectReason: '',
    },
    {
      id: 2, name: '智联电气组', description: '电气控制与智能化方案', status: '招募中', maxMembers: 4, currentMembers: 1,
      leader: { id: 'l2', name: '韩梅', avatar: DEFAULT_AVATAR }, members: [],
      competitionId: 2, inviteCode: 'TEAM88', createdAt: '2026-04-03 09:00:00', auditStatus: '待审核',
      leaderTeachers: [{ id: 't3', name: '赵老师', title: '带队教师' }], rejectReason: '',
    },
    {
      id: 3, name: '算法突击队', description: '冲刺程序设计与 AI 应用', status: '招募中', maxMembers: 3, currentMembers: 2,
      leader: { id: 'l3', name: '陈雨', avatar: DEFAULT_AVATAR }, members: [{ id: 'm3', name: '周晓', avatar: DEFAULT_AVATAR }],
      competitionId: 3, inviteCode: 'ALG007', createdAt: '2026-02-20 16:00:00', auditStatus: '待审核',
      leaderTeachers: [{ id: 't1', name: '王老师', title: '带队教师' }], rejectReason: '',
    },
  ],
  teamApplications: [
    { id: 1, teamId: 1, teamName: '星火硬件队', inviteCode: 'ABC123', applicantName: '李明', applicantAvatar: DEFAULT_AVATAR, applicantMajor: '自动化', applyTime: '2026-03-08 10:22:00', status: '待审核', remark: '希望加入硬件组' },
    { id: 2, teamId: 1, teamName: '星火硬件队', inviteCode: 'ABC123', applicantName: '王芳', applicantAvatar: DEFAULT_AVATAR, applicantMajor: '计算机科学与技术', applyTime: '2026-03-09 14:05:00', status: '待审核', remark: '擅长嵌入式开发' },
    { id: 3, teamId: 2, teamName: '智联电气组', inviteCode: 'TEAM88', applicantName: '张同学', applicantAvatar: DEFAULT_AVATAR, applicantMajor: '计算机科学与技术', applyTime: '2026-04-05 09:30:00', status: '已通过', remark: '通过邀请码申请', isMine: true },
  ],
  announcements: [
    { id: 1, title: '2026 春季学科竞赛报名开启', content: '本学期多项竞赛已开放报名，请同学们登录平台查看详情并及时组队。', type: '比赛通知', createdAt: '2026-03-01 09:00:00', isTop: true },
    { id: 2, title: '平台使用指南更新', content: '新增带队教师审核流程说明，请教师用户查阅公告资源模块。', type: '系统公告', createdAt: '2026-03-03 15:20:00', isTop: false },
  ],
  works: [
    { id: 1, title: '基于视觉的分拣小车', description: '结合摄像头与机械臂完成物料分拣，获校赛一等奖。', cover: '', likes: 128, comments: 16, author: { id: 'a1', name: '刘洋', avatar: DEFAULT_AVATAR }, competitionId: 1, createdAt: '2025-11-12 10:00:00' },
    { id: 2, title: '智慧宿舍用电监测系统', description: '低功耗传感网络实时监测宿舍用电并预警。', cover: '', likes: 96, comments: 9, author: { id: 'a2', name: '韩梅', avatar: DEFAULT_AVATAR }, competitionId: 2, createdAt: '2025-10-08 14:30:00' },
    { id: 3, title: '校园问答智能助手', description: '面向迎新场景的 RAG 问答机器人。', cover: '', likes: 210, comments: 32, author: { id: 'a3', name: '陈雨', avatar: DEFAULT_AVATAR }, competitionId: 3, createdAt: '2025-12-01 18:00:00' },
  ],
  resources: [
    { id: 1, name: '竞赛报名须知.pdf', description: '学生报名与材料提交说明', type: '文档', fileSize: 520000, size: '508.0KB', downloadCount: 86, uploadTime: '2026-03-01 10:00:00', url: 'https://example.com/files/1/%E7%AB%9E%E8%B5%9B%E6%8A%A5%E5%90%8D%E9%A1%BB%E7%9F%A5.pdf' },
    { id: 2, name: '往届优秀作品集.zip', description: '近三年获奖作品打包', type: '压缩包', fileSize: 8500000, size: '8.1MB', downloadCount: 142, uploadTime: '2026-03-02 11:30:00', url: 'https://example.com/files/2/works.zip' },
  ],
  messages: [
    { id: 1, type: 'system', typeLabel: '系统通知', title: '欢迎使用师生交互平台', content: '您可以在此完成比赛报名、组队与审核等操作。', time: '2026-03-01 08:00:00', isRead: false, role: 'student' },
    { id: 2, type: 'review', typeLabel: '审核结果', title: '报名审核提醒', content: '有新的学生报名待审核，请前往报名管理处理。', time: '2026-03-05 12:00:00', isRead: false, role: 'teacher' },
    { id: 3, type: 'invite', typeLabel: '组队邀请', title: '收到组队邀请', content: '「星火硬件队」邀请您加入，请前往组队中心查看。', time: '2026-03-08 16:20:00', isRead: true, role: 'student' },
  ],
  teamMessages: {}, // { [teamId]: [ {id, type, sender, senderColor, content, fileUrl, fileName, fileSize, time} ] }
  // 系统内置账号（不可删除）
  accounts: [
    { id: 'student', role: 'student', username: 'student', name: '张同学', password: '123456', accountId: '2021001', major: '计算机科学与技术', grade: '大三', gender: '男', email: 'student@example.com', system: true, avatar: DEFAULT_AVATAR },
    { id: 'admin', role: 'teacher', username: 'admin', name: '管理员', password: '123456', accountId: 'admin', title: '管理员', department: '-', teacherType: 'admin', email: '', system: true, avatar: DEFAULT_AVATAR },
    { id: 'teacher', role: 'teacher', username: 'teacher', name: '李老师', password: '123456', accountId: 'T001', title: '管理员', department: '-', teacherType: 'admin', email: '', system: true, avatar: DEFAULT_AVATAR },
    { id: 'leader', role: 'teacher', username: 'leader', name: '王老师', password: '123456', accountId: 't1', title: '带队教师', department: '自动化', teacherType: 'leader', email: '', system: true, avatar: DEFAULT_AVATAR },
  ],
  registeredUsers: [], // 注册账号（学生/教师），与 accounts 合并即全量账号
  idSeq: { applications: 4, teams: 3, teamApplications: 3, announcements: 2, works: 3, resources: 2, messages: 3 },
}

let state = null

function ensureLoaded() {
  if (state) return
  if (fs.existsSync(DATA_FILE)) {
    try {
      state = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'))
      return
    } catch {
      // 损坏则重建
    }
  }
  state = JSON.parse(JSON.stringify(SEED))
  save()
}

function save() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2), 'utf-8')
}

export function getDB() {
  ensureLoaded()
  return state
}

export function saveDB() {
  save()
}

export function nextId(key) {
  const seq = (state.idSeq = state.idSeq || {})
  seq[key] = (seq[key] || 0) + 1
  return seq[key]
}

export function formatDateTime(value) {
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

export const DEFAULT_AVATAR_URL = DEFAULT_AVATAR

export function genCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let s = ''
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return s
}
