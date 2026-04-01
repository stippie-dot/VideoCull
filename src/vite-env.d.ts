/// <reference types="vite/client" />

// Allow importing CSS files as modules
declare module '*.css' {
  const content: string;
  export default content;
}
