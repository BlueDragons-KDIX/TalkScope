import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

const VECTOR_API_PATH_PREFIX = '/analysis';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const target = env.VITE_BACKEND_URL?.trim() || undefined
  const proxy: Record<string, { target: string; changeOrigin: boolean }> | undefined = target
    ? {
        [VECTOR_API_PATH_PREFIX]: {
          target,
          changeOrigin: true,
        },
      }
    : undefined

  return {
    plugins: [
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5173,
      strictPort: true, // 5173 が使えない場合は別ポートにせずエラーにする
      proxy,
    },
  }
})
