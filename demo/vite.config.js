import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  base: '/markdown_editor_sync_scroll_demo/',
  build: {
    outDir: '../',
    sourcemap: true
  }
})
