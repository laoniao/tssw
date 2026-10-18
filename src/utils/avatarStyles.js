/** 头像 / 封面渐变色工具 — 全站统一 */
const AVATAR_COLORS = [
  '#2563eb',
  '#7c3aed',
  '#db2777',
  '#ea580c',
  '#16a34a',
  '#0891b2',
  '#4f46e5',
  '#ca8a04',
]

const TEACHER_COLORS = [
  '#1d4ed8',
  '#0f766e',
  '#7c3aed',
  '#be123c',
  '#b45309',
  '#0369a1',
]

const COVER_GRADIENTS = [
  'linear-gradient(135deg,#2563eb,#1e3a8a)',
  'linear-gradient(135deg,#7c3aed,#4c1d95)',
  'linear-gradient(135deg,#0891b2,#155e75)',
  'linear-gradient(135deg,#16a34a,#14532d)',
  'linear-gradient(135deg,#db2777,#9d174d)',
  'linear-gradient(135deg,#ea580c,#9a3412)',
  'linear-gradient(135deg,#4f46e5,#312e81)',
  'linear-gradient(135deg,#0284c8,#075985)',
]

const TEAM_GRADIENTS = [
  { background: 'linear-gradient(135deg,#2563eb,#1e3a8a)', color: '#fff' },
  { background: 'linear-gradient(135deg,#7c3aed,#4c1d95)', color: '#fff' },
  { background: 'linear-gradient(135deg,#0891b2,#155e75)', color: '#fff' },
  { background: 'linear-gradient(135deg,#16a34a,#14532d)', color: '#fff' },
]

function pick(list, seed = 0) {
  const idx = Math.abs(Number(seed) || 0) % list.length
  return list[idx]
}

export function getAvatarStyle(name = '') {
  const seed = String(name).charCodeAt(0) || 0
  return { background: pick(AVATAR_COLORS, seed), color: '#fff' }
}

export function getTeacherStyle(name = '') {
  const seed = String(name).charCodeAt(0) || 0
  return { background: pick(TEACHER_COLORS, seed), color: '#fff' }
}

export function getCoverStyle(idx = 0) {
  return { background: pick(COVER_GRADIENTS, idx) }
}

export function getTeamColor(id = 0) {
  return pick(TEAM_GRADIENTS, id)
}

/** ECharts 常用色板，与设计令牌对齐 */
export const CHART_COLORS = [
  '#2563eb',
  '#7c3aed',
  '#0891b2',
  '#16a34a',
  '#db2777',
  '#ea580c',
  '#4f46e5',
  '#0284c8',
]
