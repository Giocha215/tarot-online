import { defineConfig } from "vitest/config";

export default defineConfig({
  root: import.meta.dirname,
  // PostCSS inline (vacío) para que Vite NO suba a la raíz del repo buscando
  // configuración y acabe cargando el postcss.config.mjs del frontend.
  css: { postcss: { plugins: [] } },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Fija el entorno ANTES de que cualquier módulo importe config/env.ts.
    setupFiles: ["tests/setup-env.ts"],
    // Las pruebas de integración comparten una misma BD: en paralelo se pisan.
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
});
