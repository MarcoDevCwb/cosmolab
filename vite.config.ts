import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Expõe o dev server na rede (necessário no WSL2 para abrir no navegador do Windows).
    host: true,
  },
})
