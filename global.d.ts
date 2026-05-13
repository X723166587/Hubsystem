/// <reference types="@cloudflare/workers-types" />

declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}

interface CloudflareEnv {
  DB: D1Database;
  AUTH_DB: D1Database;
}