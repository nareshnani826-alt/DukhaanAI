// Generates assets/icon.png (1024x1024) and assets/splash.png (2732x2732)
// from public/favicon.svg using Playwright Chromium.
const { chromium } = require("playwright-core")
const fs  = require("fs")
const path = require("path")

const SVG = fs.readFileSync(path.join(__dirname, "public", "favicon.svg"), "utf8")

;(async () => {
  const browser = await chromium.launch()
  const page    = await browser.newPage()

  // ── Icon 1024×1024 ────────────────────────────────────────────
  await page.setViewportSize({ width: 1024, height: 1024 })
  await page.setContent(`<!DOCTYPE html><html><body style="margin:0;padding:0;background:#E87722">
    <div style="width:1024px;height:1024px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#F7973A,#C25500)">
      <div style="width:820px;height:820px">
        ${SVG.replace('width="48"', 'width="820"').replace('height="48"', 'height="820"').replace('viewBox="0 0 48 48"', 'viewBox="0 0 48 48"')}
      </div>
    </div>
  </body></html>`)
  const iconBuf = await page.screenshot({ type: "png" })
  fs.mkdirSync(path.join(__dirname, "assets"), { recursive: true })
  fs.writeFileSync(path.join(__dirname, "assets", "icon.png"), iconBuf)
  console.log("✓ assets/icon.png (1024×1024)")

  // ── Splash 2732×2732 ─────────────────────────────────────────
  await page.setViewportSize({ width: 2732, height: 2732 })
  await page.setContent(`<!DOCTYPE html><html><body style="margin:0;padding:0">
    <div style="width:2732px;height:2732px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#E87722;background:linear-gradient(135deg,#F7973A 0%,#C25500 100%)">
      <div style="width:600px;height:600px;margin-bottom:60px">
        ${SVG.replace('width="48"', 'width="600"').replace('height="48"', 'height="600"').replace('viewBox="0 0 48 48"', 'viewBox="0 0 48 48"')}
      </div>
      <div style="font-family:sans-serif;font-size:140px;font-weight:900;color:#fff;letter-spacing:-2px;text-align:center;line-height:1">
        दुकान<span style="color:rgba(255,255,255,0.6)">•</span>AI
      </div>
    </div>
  </body></html>`)
  const splashBuf = await page.screenshot({ type: "png" })
  fs.writeFileSync(path.join(__dirname, "assets", "splash.png"), splashBuf)
  console.log("✓ assets/splash.png (2732×2732)")

  await browser.close()
  console.log("Done.")
})()
