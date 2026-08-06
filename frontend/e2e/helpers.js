// Shared smoke-test helper: navigate to a route as the authenticated E2E test
// vendor and assert the page rendered without throwing — the baseline bar for
// "does this page work at all" across ~30 routes.
import { expect } from "@playwright/test"

async function baseCheck(page, path) {
  const pageErrors = []
  page.on("pageerror", (err) => pageErrors.push(err))

  // page.goto() already waits for the "load" event by default. Deliberately NOT
  // waiting for "networkidle" here — pages that poll or call slow external APIs
  // (e.g. DemandIntelligence's news-feed fetch) would never settle, hanging the
  // test on an irrelevant background request instead of the page's own render.
  const response = await page.goto(path)
  await page.waitForTimeout(500) // let mount-time effects fire/throw

  expect(response?.ok(), `${path} — navigation response not ok`).toBeTruthy()
  expect(pageErrors, `${path} — uncaught JS error(s): ${pageErrors.map(e => e.message).join("; ")}`).toHaveLength(0)
}

// Strict: for authenticated app routes, where a silent redirect away almost
// always means the route crashed/guarded unexpectedly rather than intentional
// app behavior (see the FirstRunGuard→/onboarding bug this caught).
export async function smokeCheck(page, path) {
  await baseCheck(page, path)
  const escaped = path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  await expect(page, `${path} — unexpectedly redirected away`).toHaveURL(new RegExp(escaped + "/?($|\\?)"))
}

// Loose: for routes where the app may legitimately redirect elsewhere
// (e.g. LoginHome sends an already-authenticated session straight to its
// dashboard) — only asserts the page loaded without throwing.
export async function smokeCheckLoose(page, path) {
  await baseCheck(page, path)
}
