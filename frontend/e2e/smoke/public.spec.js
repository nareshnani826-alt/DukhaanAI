import { test } from "@playwright/test"
import { smokeCheckLoose } from "../helpers.js"

// Public/unauthenticated-shaped routes. Loose checks only: LoginHome ("/")
// legitimately redirects an already-authenticated session onward, so we just
// confirm nothing throws rather than pin an exact destination URL.
const ROUTES = [
  "/",
  "/reset-password",
  "/hero-loop",
  "/invoice/00000000-0000-0000-0000-000000000000", // nonexistent id — should show a graceful not-found state
]

for (const path of ROUTES) {
  test(`${path} loads without throwing`, async ({ page }) => {
    await smokeCheckLoose(page, path)
  })
}
