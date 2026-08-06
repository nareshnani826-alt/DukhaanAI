import { test } from "@playwright/test"
import { smokeCheck } from "../helpers.js"

// Layout.jsx bounces bangle-only routes back to /dashboard whenever the
// session's "storeMode" isn't "bangle_fancy" (real, correct app behavior —
// it's how a kirana-mode session gets kept out of the other store's pages).
// Set it before every navigation so these routes actually render.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("storeMode", "bangle_fancy"))
})

// Every bangle-store route. The seeded E2E vendor has both "kirana" and
// "bangle_fancy" in its modules list so these render fully rather than
// hitting a module-access wall.
const ROUTES = [
  "/bangle-dashboard",
  "/bangle-inventory",
  "/bangle-billing",
  "/bangle-festivals",
  "/bangle-insights",
  "/bangle-bulk-import",
  "/bangle-day",
  "/bangle-history",
  "/bangle-udhar",
  "/reorder",
]

for (const path of ROUTES) {
  test(`${path} loads for authenticated vendor`, async ({ page }) => {
    await smokeCheck(page, path)
  })
}
