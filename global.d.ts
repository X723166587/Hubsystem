/// <reference types="@cloudflare/workers-types" />

declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}