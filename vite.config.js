import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    forwardConsole: {
      unhandledErrors: true, // Forces Edge/Chrome runtime crashes to print to your terminal logs!
      // 2. Instructs Vite to forward every possible console log level
      logLevels: ['log', 'info', 'warn', 'error', 'debug'],
    },
    proxy: {
      '/api': 'http://127.0.0.1:8000',
    },
  },
})

