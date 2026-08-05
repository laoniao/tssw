import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import path from 'path'

export default defineConfig({
  plugins: [
    vue(),
    AutoImport({
      resolvers: [ElementPlusResolver()],
      imports: ['vue', 'vue-router', 'pinia'],
      dts: true,
    }),
    Components({
      resolvers: [ElementPlusResolver()],
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: (content, filepath) => {
          const normalized = String(filepath || '').replace(/\\/g, '/')
          // 避免对变量文件 / 全局入口重复注入导致 @use 冲突
          if (
            normalized.includes('/styles/variables.scss') ||
            normalized.includes('/styles/global.scss')
          ) {
            return content
          }
          return `@use "@/styles/variables.scss" as *;\n${content}`
        },
      },
    },
  },
  server: {
    port: 3000,
    open: true,
    proxy: {
      // 本地开发时把 /api 与 /uploads 代理到真实后端（默认 3001），避免跨域
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
