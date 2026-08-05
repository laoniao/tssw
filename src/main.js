import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import App from './App.vue'
import router from './router'
import '@/styles/global.scss'

// 数据层：默认加载浏览器内 mock（纯前端演示）。
// 当 VITE_USE_REAL_API=true 时（对接真实后端），跳过 mock 拦截，改用真实 API。
if (!import.meta.env.VITE_USE_REAL_API) {
  await import('./mock')
}

const app = createApp(App)

// Pinia 状态管理 + 持久化
const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)
app.use(pinia)

// Element Plus 中文语言包
app.use(ElementPlus, { locale: zhCn })

// 注册图标组件
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

// 路由
app.use(router)

app.mount('#app')
