/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string
  readonly BASE_URL: string
  readonly NODE_ENV: string
  // 他の環境変数があれば追加
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}