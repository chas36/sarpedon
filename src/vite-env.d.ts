/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_APP_URL: string
  // GROQ_API_KEY should be in Edge Functions environment only
  // add more env variables as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
