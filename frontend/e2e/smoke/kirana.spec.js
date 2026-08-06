import { test } from "@playwright/test"
import { smokeCheck } from "../helpers.js"

// Every kirana-store route reachable from the sidebar, plus a couple that
// aren't (app-screens, ai-test). Each just proves the page renders for an
// authenticated wholesale-plan vendor without throwing or bouncing away.
const ROUTES = [
  "/dashboard",
  "/inventory",
  "/billing",
  "/settings",
  "/help",
  "/udhar",
  "/demand",
  "/wastage",
  "/install",
  "/bulk-import",
  "/expiry",
  "/history",
  "/app-screens",
  "/agent",
  "/voice",
  "/customers",
  "/day",
  "/insights",
  "/ai-suggestions",
  "/more",
  "/ai-test",
]

for (const path of ROUTES) {
  test(`${path} loads for authenticated vendor`, async ({ page }) => {
    await smokeCheck(page, path)
  })
}
