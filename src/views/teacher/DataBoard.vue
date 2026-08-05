<template>
  <div class="page-container">
    <div class="page-header">
      <div>
        <h1 class="page-title">数据看板</h1>
        <p class="page-subtitle">可视化展示各比赛报名情况与学生分布</p>
      </div>
      <el-button @click="loadData" :loading="loading">
        <el-icon><Refresh /></el-icon>
        刷新数据
      </el-button>
    </div>

    <!-- 概览统计卡片 -->
    <div class="overview-grid">
      <div v-for="(card, i) in overviewCards" :key="i" class="ov-card card-glass fade-in-up" :style="`animation-delay: ${i * 0.08}s`">
        <div class="ov-icon" :style="card.iconStyle">
          <el-icon :size="24" :color="card.iconColor"><component :is="card.icon" /></el-icon>
        </div>
        <div class="ov-info">
          <div class="ov-val">{{ card.value }}</div>
          <div class="ov-label">{{ card.label }}</div>
        </div>
        <div class="ov-trend" :class="card.trendUp ? 'up' : 'down'">
          <el-icon><component :is="card.trendUp ? 'ArrowUp' : 'ArrowDown'" /></el-icon>
          {{ card.trend }}
        </div>
      </div>
    </div>

    <!-- 图表区 -->
    <div class="charts-grid">
      <div class="chart-card wide">
        <div class="chart-title">
          <el-icon><TrendCharts /></el-icon>
          每日报名趋势（最近7天）
        </div>
        <div ref="lineChartRef" class="chart-area"></div>
      </div>

      <div class="chart-card">
        <div class="chart-title">
          <el-icon><PieChart /></el-icon>
          专业分布
        </div>
        <div ref="pieChartRef" class="chart-area"></div>
      </div>

      <div class="chart-card">
        <div class="chart-title">
          <el-icon><UserFilled /></el-icon>
          性别比例
        </div>
        <div ref="genderChartRef" class="chart-area"></div>
      </div>

      <div class="chart-card wide">
        <div class="chart-title">
          <el-icon><DataAnalysis /></el-icon>
          各比赛报名人数
        </div>
        <div ref="barChartRef" class="chart-area"></div>
      </div>

      <div class="chart-card">
        <div class="chart-title">
          <el-icon><Histogram /></el-icon>
          指导教师工作量
        </div>
        <VChart class="chart-area" :option="workloadOption" autoresize />
      </div>
    </div>
  </div>
</template>

<script setup>
import * as echarts from 'echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart, BarChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
} from 'echarts/components'
import VChart from 'vue-echarts'
import { getStatistics } from '@/api'
import { workload } from '@/api/dashboard'
import { CHART_COLORS } from '@/utils/avatarStyles'

use([
  CanvasRenderer,
  LineChart,
  BarChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
])

const loading = ref(false)
const statsData = ref(null)

const lineChartRef = ref()
const pieChartRef = ref()
const genderChartRef = ref()
const barChartRef = ref()

let lineChart = null
let pieChart = null
let genderChart = null
let barChart = null

const workloadOption = ref({})

const overviewCards = ref([
  { icon: 'Trophy', label: '已发布比赛', value: 0, trend: '+2 本月', trendUp: true, iconStyle: { background: '#eef2ff' }, iconColor: CHART_COLORS[0] },
  { icon: 'UserFilled', label: '报名申请', value: 0, trend: '+18 本周', trendUp: true, iconStyle: { background: '#dcfce7' }, iconColor: '#22c55e' },
  { icon: 'Flag', label: '参赛队伍', value: 0, trend: '+5 本周', trendUp: true, iconStyle: { background: '#fef3c7' }, iconColor: '#f59e0b' },
  { icon: 'Avatar', label: '参赛学生', value: 0, trend: '+12 本周', trendUp: true, iconStyle: { background: '#ffe4e6' }, iconColor: '#f43f5e' },
])

const brandGradient = {
  type: 'linear',
  x: 0,
  y: 0,
  x2: 0,
  y2: 1,
  colorStops: [
    { offset: 0, color: 'rgba(37,99,235,0.35)' },
    { offset: 1, color: 'rgba(37,99,235,0.02)' },
  ],
}

const barGradient = {
  type: 'linear',
  x: 0,
  y: 0,
  x2: 0,
  y2: 1,
  colorStops: [
    { offset: 0, color: CHART_COLORS[0] },
    { offset: 1, color: CHART_COLORS[6] },
  ],
}

const buildWorkloadOption = (list = []) => ({
  grid: { top: 28, bottom: 40, left: 44, right: 20 },
  tooltip: { trigger: 'axis' },
  xAxis: {
    type: 'category',
    data: list.map(d => d.teacherName),
    axisLine: { lineStyle: { color: '#e5e7eb' } },
    axisLabel: { color: '#9ca3af', fontSize: 11, interval: 0 },
  },
  yAxis: {
    type: 'value',
    name: '指导学生数',
    nameTextStyle: { color: '#9ca3af', fontSize: 11 },
    splitLine: { lineStyle: { color: '#f1f5f9' } },
    axisLabel: { color: '#9ca3af', fontSize: 11 },
  },
  series: [{
    name: '指导学生数',
    type: 'bar',
    barMaxWidth: 36,
    data: list.map(d => d.studentCount),
    itemStyle: {
      color: barGradient,
      borderRadius: [6, 6, 0, 0],
    },
    label: {
      show: true,
      position: 'top',
      fontSize: 11,
      color: '#374151',
    },
  }],
})

const loadDashboardExtras = async () => {
  const workloadRes = await workload()
  workloadOption.value = buildWorkloadOption(workloadRes.data?.list || [])
}

const loadData = async () => {
  loading.value = true
  try {
    const res = await getStatistics()
    statsData.value = res.data

    const ov = res.data.overview
    overviewCards.value[0].value = ov.totalCompetitions
    overviewCards.value[1].value = ov.totalApplications
    overviewCards.value[2].value = ov.totalTeams
    overviewCards.value[3].value = ov.totalStudents

    await nextTick()
    renderCharts(res.data)
    await loadDashboardExtras()
  } finally {
    loading.value = false
  }
}

const renderCharts = (data) => {
  if (!lineChart) lineChart = echarts.init(lineChartRef.value)
  lineChart.setOption({
    grid: { top: 20, bottom: 30, left: 40, right: 20 },
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: data.trendData.list.map(d => d.date),
      axisLine: { lineStyle: { color: '#e5e7eb' } },
      axisLabel: { color: '#9ca3af', fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: '#f1f5f9' } },
      axisLabel: { color: '#9ca3af', fontSize: 11 },
    },
    series: [{
      name: '新增报名',
      type: 'line',
      data: data.trendData.list.map(d => d.applications),
      smooth: true,
      lineStyle: { color: CHART_COLORS[0], width: 3 },
      itemStyle: { color: CHART_COLORS[0] },
      areaStyle: { color: brandGradient },
      symbol: 'circle',
      symbolSize: 6,
    }],
  })

  if (!pieChart) pieChart = echarts.init(pieChartRef.value)
  pieChart.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: {c}人 ({d}%)' },
    legend: { bottom: 0, textStyle: { color: '#6b7280', fontSize: 11 } },
    series: [{
      type: 'pie',
      radius: ['45%', '75%'],
      center: ['50%', '44%'],
      data: data.majorDistribution.list.map((d, i) => ({
        name: d.major,
        value: d.count,
        itemStyle: { color: CHART_COLORS[i % CHART_COLORS.length] },
      })),
      label: { show: false },
      emphasis: { itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.12)' } },
    }],
  })

  if (!genderChart) genderChart = echarts.init(genderChartRef.value)
  genderChart.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: {c}% ({d}%)' },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      center: ['50%', '44%'],
      data: [
        { name: '男生', value: data.genderRatio.male, itemStyle: { color: CHART_COLORS[0] } },
        { name: '女生', value: data.genderRatio.female, itemStyle: { color: CHART_COLORS[1] } },
      ],
      label: {
        show: true,
        formatter: '{b}\n{c}%',
        color: '#374151',
        fontSize: 12,
      },
      emphasis: { itemStyle: { shadowBlur: 10 } },
    }],
    legend: { bottom: 0, textStyle: { color: '#6b7280', fontSize: 11 } },
  })

  if (!barChart) barChart = echarts.init(barChartRef.value)
  barChart.setOption({
    grid: { top: 20, bottom: 40, left: 60, right: 20 },
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: data.competitionStats.list.map(d => d.name.slice(0, 8)),
      axisLabel: { color: '#9ca3af', fontSize: 11, interval: 0 },
      axisLine: { lineStyle: { color: '#e5e7eb' } },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: '#f1f5f9' } },
      axisLabel: { color: '#9ca3af', fontSize: 11 },
    },
    series: [{
      name: '报名人数',
      type: 'bar',
      barMaxWidth: 36,
      data: data.competitionStats.list.map(d => d.applications),
      itemStyle: {
        color: barGradient,
        borderRadius: [6, 6, 0, 0],
      },
      label: { show: true, position: 'top', fontSize: 11, color: '#374151' },
    }],
  })
}

const handleResize = () => {
  ;[lineChart, pieChart, genderChart, barChart].forEach(c => c?.resize())
}

onMounted(() => {
  loadData()
  window.addEventListener('resize', handleResize)
})

watch(
  () => workloadOption.value,
  () => {
    nextTick(handleResize)
  },
  { deep: true }
)

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  ;[lineChart, pieChart, genderChart, barChart].forEach(c => c?.dispose())
})
</script>

<style scoped lang="scss">
.overview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: $spacing-lg;
  margin-bottom: $spacing-lg;
}

.ov-card {
  display: flex;
  align-items: center;
  gap: $spacing-md;

  &:hover { transform: translateY(-2px); }
}

.ov-icon {
  width: 52px; height: 52px;
  border-radius: $radius-lg;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}

.ov-info {
  flex: 1;

  .ov-val { font-size: 30px; font-weight: 900; color: $text-primary; letter-spacing: -1px; line-height: 1; }
  .ov-label { font-size: $font-size-sm; color: $text-muted; margin-top: $spacing-xs; }
}

.ov-trend {
  font-size: $font-size-sm; font-weight: 600;
  display: flex; align-items: center; gap: 2px;
  padding: 3px $spacing-sm; border-radius: $radius-lg;
  align-self: flex-start;

  &.up   { color: $success; background: $success-bg; }
  &.down { color: $danger; background: $danger-bg; }
}

.charts-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: $spacing-lg;

  .wide {
    grid-column: span 2;

    @media (max-width: 900px) { grid-column: span 1; }
  }

  @media (max-width: 900px) { grid-template-columns: 1fr; }
}
</style>
