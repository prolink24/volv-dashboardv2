import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration optimized for Replit environment
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  /* Maximum time one test can run for. */
  timeout: 60 * 1000, // Increase timeout for Replit's environment
  expect: {
    /**
     * Maximum time expect() should wait for the condition to be met.
     * For example in `await expect(locator).toHaveText();`
     */
    timeout: 10000 // Increased for Replit's potentially slower responses
  },
  /* Disable parallel tests in Replit */
  fullyParallel: false,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: false,
  /* Add retries to handle Replit's environment inconsistencies */
  retries: 1,
  /* Use a single worker to avoid overwhelming Replit */
  workers: 1,
  /* Use a text reporter for easier console output in Replit */
  reporter: 'list',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Maximum time each action such as `click()` can take. */
    actionTimeout: 15000, // Increased for Replit's environment
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:5000',
    /* Run tests in headless mode for Replit */
    headless: true,
    /* Use a simplified viewport */
    viewport: { width: 1280, height: 720 },
    /* Disable videos/screenshots to reduce memory usage */
    video: 'off',
    screenshot: 'off',
    /* Use minimal tracing to save resources */
    trace: 'off',
    /* Reduce color depth for performance */
    colorScheme: 'light',
    /* Disable browser downloads */
    acceptDownloads: false,
    /* User agent that works well with most services */
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'firefox',
      use: { 
        ...devices['Desktop Firefox'],
        launchOptions: {
          // Firefox args for better Replit compatibility
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu',
            '--disable-extensions',
            '--disable-infobars',
            '--window-size=1280,720',
            '--disable-backgrounding-occluded-windows',
            '--disable-background-timer-throttling',
            '--disable-renderer-backgrounding'
          ],
        }
      },
    },
  ],

  /* We'll handle server management in our custom scripts */
  webServer: {
    command: 'echo "Server is managed by run-tests.sh"',
    url: 'http://localhost:5000',
    reuseExistingServer: true,
    timeout: 120000, // 2 minutes for server startup
  },
});