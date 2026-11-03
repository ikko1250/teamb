import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  // 相対パスにして、GitHub Pages のリポジトリ名に依存しないようにする。
  base: './',
  plugins: [react()],
});
