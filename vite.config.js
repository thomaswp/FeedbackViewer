import { defineConfig } from 'vite'
import string from 'vite-plugin-string'
import react from '@vitejs/plugin-react'
import ViteYaml from '@modyfi/vite-plugin-yaml';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    string({
      include: ["**/*.mustache"], // extensions you want
      compress: false,
    }),
    ViteYaml(),
    // tailwindcss()
  ],
  base: '/FeedbackViewer/'
})
