/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ACCESS_KEY: string;
  readonly VITE_ACCESS_KEY_HASH: string;
  readonly VITE_ADMIN_USERNAME: string;
  readonly VITE_ADMIN_PASSWORD: string;
  readonly VITE_ADMIN_PASS_HASH: string;
  readonly VITE_ADMIN_SECRET: string;
  readonly VITE_MAX_SESSIONS: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}