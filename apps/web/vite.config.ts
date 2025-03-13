import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import * as path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      buffer: path.resolve(__dirname, 'node_modules/buffer/')
    }
  },
  define: {
    'global.Buffer': 'buffer.Buffer'
  }
})
