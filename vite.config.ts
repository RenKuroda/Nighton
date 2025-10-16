import path from 'path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')

  const isVercel = !!process.env.VERCEL
  const isGitHubPages = !!process.env.GITHUB_PAGES

  return {
    // ✅ Vercelでもローカルでも相対パスでassetsを解決できるようにする
    base: isVercel || isGitHubPages ? './' : '/',

    server: {
      port: Number(env.PORT || 5174),
      host: '0.0.0.0',
    },

    plugins: [react()],

    define: {
      // ✅ APIキーやSupabaseキーを安全にinject
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),

      // ✅ Supabaseキー（NEXT_PUBLIC or VITE両対応）
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(
        env.VITE_SUPABASE_URL ||
          env.NEXT_PUBLIC_SUPABASE_URL ||
          process.env.VITE_SUPABASE_URL ||
          process.env.NEXT_PUBLIC_SUPABASE_URL ||
          ''
      ),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(
        env.VITE_SUPABASE_ANON_KEY ||
          env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
          process.env.VITE_SUPABASE_ANON_KEY ||
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
          ''
      ),
    },

    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },

    build: {
      // ✅ 出力ディレクトリを明示（Vercelのdistと一致）
      outDir: 'dist',
      emptyOutDir: true,
    },
  }
})
