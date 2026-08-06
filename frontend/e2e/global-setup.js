// Seeds a dedicated E2E test vendor (see scripts/e2e_seed_vendor.py) and logs
// Playwright's browser context in as that vendor by writing the same localStorage
// keys the real app writes on login (see frontend/src/sync/db.js). This app stores
// auth in localStorage, not cookies, so Playwright's storageState captures it fine
// as long as we set it under the right origin first.
import { execSync } from "node:child_process"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { chromium } from "@playwright/test"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, "..", "..")

export default async function globalSetup(config) {
  const baseURL = config.projects[0].use.baseURL

  const raw = execSync("py scripts/e2e_seed_vendor.py", {
    cwd: REPO_ROOT,
    env: { ...process.env, PYTHONPATH: REPO_ROOT },
    encoding: "utf-8",
  })
  const vendor = JSON.parse(raw.trim().split("\n").pop())
  if (vendor.error) throw new Error(`E2E vendor seed failed: ${vendor.error}`)

  const browser = await chromium.launch()
  const page = await browser.newPage()
  await page.goto(baseURL)
  await page.evaluate(({ token, vendor }) => {
    localStorage.setItem("dk_access", token)
    localStorage.setItem("dk_refresh", "e2e-fake-refresh-not-validated")
    localStorage.setItem("dk_storage", "local")
    localStorage.setItem("dk_vendor", JSON.stringify(vendor))
    localStorage.setItem("dk_onboarding_done", "1") // skip FirstRunGuard's onboarding redirect
  }, {
    token: vendor.access_token,
    vendor: {
      id: vendor.id,
      email: vendor.email,
      store_name: vendor.store_name,
      plan: vendor.plan,
      modules: ["kirana", "bangle_fancy"],
    },
  })
  await page.context().storageState({ path: path.join(__dirname, ".auth", "state.json") })
  await browser.close()
}
