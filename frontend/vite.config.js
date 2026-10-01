import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const proxy = {}
  // Tuỳ chọn khi dev: VITE_USE_PROXY=true → frontend gọi /gas, Vite chuyển tiếp tới VITE_API_URL.
  // Production KHÔNG cần proxy (GAS trả header CORS cho GET và POST text/plain).
  if (env.VITE_USE_PROXY === 'true' && env.VITE_API_URL) {
    const target = new URL(env.VITE_API_URL)
    proxy['/gas'] = {
      target: target.origin,
      changeOrigin: true,
      followRedirects: true,
      rewrite: () => target.pathname,
    }
  }
  return {
    base: env.VITE_BASE || '/',
    plugins: [vue(), tailwindcss()],
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    server: { port: 5173, proxy },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/swiper')) return 'swiper'
            if (id.includes('node_modules')) return 'vendor'
          },
        },
      },
    },
  }
})
