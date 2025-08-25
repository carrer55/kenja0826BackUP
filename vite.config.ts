import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react({
    // React Fast Refreshを最適化
    fastRefresh: true,
    // JSX runtimeを最適化
    jsxRuntime: 'automatic'
  })],
  define: {
    global: 'globalThis',
  },
  server: {
    port: 5173,
    host: true,
    // HMR設定を最適化
    hmr: {
      overlay: false
    }
  },
  build: {
    // ソースマップを無効化してビルドを高速化
    sourcemap: false,
    // チャンク分割を最適化
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js']
        }
      }
    },
    // ビルドサイズを最適化
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  },
  // 開発時の最適化
  optimizeDeps: {
    include: ['react', 'react-dom', '@supabase/supabase-js']
  }
})