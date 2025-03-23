import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ["@scure/btc-signer"],
  },
  resolve: {
    alias: {
      "@scure/btc-signer": resolve(__dirname, "node_modules/@scure/btc-signer/esm/index.js")
    }
  }
})
