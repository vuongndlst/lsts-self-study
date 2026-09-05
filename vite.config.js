import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    // Vite không tự đọc biến PORT. Máy này còn chạy dự án khác ở 5173, nên phải
    // tôn trọng cổng được cấp thay vì bám cứng một số.
    port: Number(process.env.PORT) || 5173,
  },
})
