import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path' // Added this import for 'resolve'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    lib: process.env.BUILD_LIB ? {
      entry: resolve(__dirname, 'src/lib/index.ts'),
      name: 'TakumiMarkdown',
      fileName: 'takumi-markdown',
    } : undefined,
    rollupOptions: process.env.BUILD_LIB ? {
      external: ['react', 'react-dom', 'react/jsx-runtime'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
        },
      },
    } : undefined,
  },
  base: process.env.BUILD_LIB ? '/' : '/takumi-markdown/', // GitHub Pages base URL for demo app
})
