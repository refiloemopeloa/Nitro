import { defineConfig } from 'vite'

export default defineConfig({
  assetsInclude: ['**/*.glb'],
  server: {
    open: true
  },
  build: {
    assetsInlineLimit: 0,
  }
})
