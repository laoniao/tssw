<template>
  <div
    v-show="enabled"
    class="bg-glow"
    aria-hidden="true"
    :style="glowStyle"
  >
    <div class="bg-glow__orb bg-glow__orb--primary" />
    <div class="bg-glow__orb bg-glow__orb--secondary" />
    <div class="bg-glow__orb bg-glow__orb--accent" />
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router'

/**
 * 轻量 useMouse：跟踪视口内指针位置（不引入 @vueuse 依赖）
 */
function useMouse() {
  const x = ref(typeof window !== 'undefined' ? window.innerWidth / 2 : 0)
  const y = ref(typeof window !== 'undefined' ? window.innerHeight / 2 : 0)

  const onMove = (e) => {
    x.value = e.clientX
    y.value = e.clientY
  }

  onMounted(() => {
    window.addEventListener('pointermove', onMove, { passive: true })
  })
  onUnmounted(() => {
    window.removeEventListener('pointermove', onMove)
  })

  return { x, y }
}

const route = useRoute()
const { x, y } = useMouse()

/** 登录页自带强渐变背景，关闭光效避免冲突 */
const enabled = computed(() => !route.path.startsWith('/login'))

const glowStyle = computed(() => {
  const vw = typeof window !== 'undefined' ? window.innerWidth || 1 : 1
  const vh = typeof window !== 'undefined' ? window.innerHeight || 1 : 1
  // 将鼠标位置映射为轻微偏移（约 ±4% / ±6%）
  const ox = ((x.value / vw) - 0.5) * 8
  const oy = ((y.value / vh) - 0.5) * 12
  return {
    '--glow-x': `${50 + ox}%`,
    '--glow-y': `${40 + oy}%`,
    '--glow-x2': `${70 - ox * 0.6}%`,
    '--glow-y2': `${65 - oy * 0.5}%`,
  }
})
</script>

<style scoped lang="scss">
.bg-glow {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
  /* 不盖住导航：内容层 z-index > 0，header 自有背景 */
}

.bg-glow__orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.55;
  transition: transform 0.45s cubic-bezier(0.16, 1, 0.3, 1),
    left 0.45s cubic-bezier(0.16, 1, 0.3, 1),
    top 0.45s cubic-bezier(0.16, 1, 0.3, 1);
  will-change: left, top, transform;
}

.bg-glow__orb--primary {
  width: min(52vw, 560px);
  height: min(52vw, 560px);
  left: var(--glow-x, 50%);
  top: var(--glow-y, 40%);
  transform: translate(-50%, -50%);
  background: radial-gradient(
    circle,
    rgba($primary, 0.35) 0%,
    rgba($primary-light, 0.18) 45%,
    transparent 70%
  );
}

.bg-glow__orb--secondary {
  width: min(42vw, 420px);
  height: min(42vw, 420px);
  left: var(--glow-x2, 70%);
  top: var(--glow-y2, 65%);
  transform: translate(-50%, -50%);
  background: radial-gradient(
    circle,
    rgba($primary-dark, 0.22) 0%,
    rgba($info, 0.12) 40%,
    transparent 70%
  );
  opacity: 0.45;
}

.bg-glow__orb--accent {
  width: min(28vw, 280px);
  height: min(28vw, 280px);
  right: 8%;
  top: 18%;
  background: radial-gradient(
    circle,
    rgba($primary-light, 0.2) 0%,
    transparent 68%
  );
  opacity: 0.4;
  animation: orbFloat 14s ease-in-out infinite;
}

@keyframes orbFloat {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(-18px, 22px) scale(1.06); }
}

@media (prefers-reduced-motion: reduce) {
  .bg-glow__orb {
    transition: none;
    animation: none !important;
  }
}
</style>
