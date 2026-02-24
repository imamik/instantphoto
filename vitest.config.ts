import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['src/__tests__/setup.ts'],
    include: ['src/__tests__/**/*.{test,spec}.{ts,tsx}'],
    css: true,
    // Suppress jsdom "Not implemented: getContext()" noise – WebGL unavailability
    // in jsdom is expected and tested via onError callbacks.
    onConsoleLog: (log: string) => (log.includes('Not implemented') ? false : undefined),
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/__tests__/**',
        'src/**/*.d.ts',
        // Pure TypeScript type declarations — erased at runtime, nothing to cover.
        'src/types.ts',
        // Barrel re-export files — v8 cannot track ESM re-export statements as
        // executable statements; these files contain no logic.
        'src/index.ts',
        'src/**/index.ts',
        // Low-level WebGL GPU code — requires a real GPU/driver context that
        // jsdom cannot provide.  Behaviour is tested indirectly via component
        // tests (onError is called when WebGL is unavailable) and via the
        // mocked-pipeline tests that cover the surrounding hook logic.
        'src/gl/webgl.ts',
        // WebGL render pipeline — shader programs, texture uploads, draw calls.
        // The pure-math helper (computeCrop) is covered by pipeline.test.ts but
        // the rest of the file requires a real GPU; no meaningful unit coverage
        // is possible without hardware.
        'src/gl/pipeline.ts',
      ],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
})
