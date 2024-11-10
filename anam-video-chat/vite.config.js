import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
  root: './src',
  envDir: '../', // This tells Vite to look for .env in the project root
  base: '/',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    }
  }
})
