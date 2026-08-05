<template>
  <div class="not-found">
    <div class="content">
      <div class="error-code">404</div>
      <h1 class="error-title">页面不存在</h1>
      <p class="error-desc">抱歉，您访问的页面不存在或已被删除</p>
      <el-button type="primary" @click="goHome">返回首页</el-button>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

const goHome = () => {
  const role = localStorage.getItem('role')
  router.push(role === 'teacher' ? '/teacher' : '/student')
}
</script>

<style scoped lang="scss">
.not-found {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: $gradient-brand;

  .content {
    text-align: center;
    color: white;

    .error-code {
      font-size: 120px;
      font-weight: 700;
      line-height: 1;
      margin-bottom: 20px;
      text-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }

    .error-title {
      font-size: 32px;
      font-weight: 600;
      margin-bottom: 12px;
    }

    .error-desc {
      font-size: 16px;
      margin-bottom: 32px;
      opacity: 0.9;
    }
  }
}
</style>
