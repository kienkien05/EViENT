import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  base: '/new_ass_app/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Auth Service
      '/api/auth': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/users': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/upload': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      // Event Service
      '/api/events': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
      '/api/rooms': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
      '/api/banners': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
      '/api/ticket-types': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
      // Order Service
      '/api/orders': {
        target: 'http://localhost:3003',
        changeOrigin: true,
      },
      '/api/tickets': {
        target: 'http://localhost:3003',
        changeOrigin: true,
      },
      // Notification Service
      '/api/notifications': {
        target: 'http://localhost:3004',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          query: ['@tanstack/react-query'],
          ui: ['framer-motion', 'lucide-react'],
        },
      },
    },
  },
})
