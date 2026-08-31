import { defineConfig, devices, chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function globalSetup() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto("http://localhost:5173", { waitUntil: "networkidle" });
  const results = await new AxeBuilder({ page }).analyze();
  await browser.close();
  if (results.violations.length > 0) {
    console.error("Accessibility violations found:");
    console.error(JSON.stringify(results.violations, null, 2));
    process.exit(1);
  }
}

export default defineConfig({
  globalSetup,
  testDir: "./src/test/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["list"], {"html", { outputFolder: "playwright-report" }}],
  snapshotPathTemplate: "{testDir}/__screenshots__{projectName}/{arg{x}",
  timeout: 60000,
  expect: {
    timeout: 15000,
  },
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "tablet",
      use: { ...devices["iPad Mini"] },
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 5"] },
    },
  ],
  webServer: {
    command: "yarn start",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    env: {
      PUBLIC_STELLAR_NETWORK: "TESTNET",
      PUBLIC_STELLAR_NETWORK_PASSPHRASE: "Test SDF Network ; September 2015",
      PUBLIC_STELLAR_RPC_URL: "https://soroban-testnet.stellar.org",
      PUBLIC_STELLAR_HORIZON_URL: "https://horizon-testnet.stellar.org",
      PUBLIC_PROMPT_HASH_CONTRACT_ID:
        "CC6P4I3KZQ7VMA27SPQ3PYT6XTV4QFK3BVG2K3SJQK5NZ2QNKM6QVZ5Q",
      PUBLIC_STELLAR_NATIVE_ASSET_CONTRACT_ID:
        "CDLZFC3SYJZDV7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVUL2HHGCYSC",
      PUBLIC_STELLAR_SIMIULMATION_ACCOUNT:
        "GCREATORACCOUNT1234567890ABCDEFGH1234567890ABCDEFGH1234567890ABCDEFGH1234567890ABCDEFGH1234567890ABCDEFGH1234567890ABCDEFGH1234567890",
      PUBLIC_CHAT_API_BASE: "https://secret-ai-gateway.onrender.com",
      PUBLIC_UNLOCK_PUBLIC_KEY: "ZHVmbXktcHVibGljLWtleS12YWx1ZS1hZXl=",
    },
  },
});