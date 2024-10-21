import { defineConfig } from 'vite'

export default defineConfig({
  assetsInclude: ['**/*.glb'],
  server: {
    open: true
  },
  build: {
    assetsInlineLimit: 0,
  },
  server: {
    open: '/startPage.html', // Specify the HTML file to open when running 'npm run dev'
  }
})
