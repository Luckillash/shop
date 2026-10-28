import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Vite 8 resuelve el alias @/* de tsconfig.json sin plugin. preserveSymlinks: OneDrive convierte
  // node_modules en archivos en la nube (reparse points) y el resolver los toma por enlaces: sin
  // esto, ningún paquete se resuelve (trampa 90)
  resolve: { tsconfigPaths: true, preserveSymlinks: true },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["src/test/setup.ts"],
  },
});
