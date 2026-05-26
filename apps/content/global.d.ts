// Allow CSS file imports in TypeScript (Next.js handles them via PostCSS)
declare module '*.css' {
  const content: Record<string, string>;
  export default content;
}
