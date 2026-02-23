import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',

  use: {
    baseURL: 'http://localhost:6007',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Software WebGL so canvas rendering works in headless mode
        launchOptions: {
          args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'],
        },
      },
    },
  ],

  webServer: {
    // Build storybook then serve the static output.
    // Set STORYBOOK_BUILT=1 to skip the build and reuse an existing storybook-static.
    command: process.env.STORYBOOK_BUILT
      ? 'python3 -m http.server 6007 --directory storybook-static'
      : 'bun run build-storybook && python3 -m http.server 6007 --directory storybook-static',
    port: 6007,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
