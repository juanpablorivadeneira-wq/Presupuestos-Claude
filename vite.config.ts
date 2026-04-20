import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

export default defineConfig({
  plugins: [react()],
  // Docker: base = '/' (default). GitHub Pages: set VITE_BASE=/Presupuestos-Claude/ in CI.
  base: process.env.VITE_BASE ?? '/',
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
