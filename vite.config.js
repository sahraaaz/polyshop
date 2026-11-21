import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command, mode }) => ({
  base: command === 'build' ? '/polyshop/' : '/',
  plugins: [react()],
  define: {
    'process.env.NEXT_PUBLIC_ARCADE_API': JSON.stringify(loadEnv(mode, process.cwd(), '').NEXT_PUBLIC_ARCADE_API || loadEnv(mode, process.cwd(), '').VITE_ARCADE_API || ''),
  },
}))
