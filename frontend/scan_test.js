const { chromium } = require("playwright");
const fs = require("fs");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    permissions: ["camera"],
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120"
  });
  const page = await ctx.newPage();
  const consoleErrors = [];
  page.on("console", msg => { if (msg.type() === "error") consoleErrors.push(msg.text()); });
  page.on("pageerror", e => consoleErrors.push("PAGE ERROR: " + e.message));

  // 1. Load the bangle billing page
  await page.goto("http://localhost:5174/bangle-billing", { waitUntil: "networkidle", timeout: 30000 });
  await page.screenshot({ path: "scan_step1_loaded.png" });

  // 2. Check the scan button is present
  const scanBtn = await page.$('button[title="Scan barcode"]');
  const scanBtnText = scanBtn ? "FOUND" : "NOT FOUND";
  fs.writeFileSync("scan_results.txt", `Scan button: ${scanBtnText}\n`);

  // 3. Click scan button (web path: opens ScanBillModal)
  if (scanBtn) {
    await scanBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: "scan_step2_modal.png" });

    // Check if ScanBillModal opened (look for camera/keyboard toggle)
    const camBtn = await page.$('button:has-text("??")');
    const kbBtn  = await page.$('button:has-text("??")');
    fs.appendFileSync("scan_results.txt", `Camera toggle: ${camBtn ? "FOUND" : "NOT FOUND"}\n`);
    fs.appendFileSync("scan_results.txt", `Keyboard toggle: ${kbBtn ? "FOUND" : "NOT FOUND"}\n`);

    // 4. Switch to keyboard mode and type a fake barcode
    if (kbBtn) {
      await kbBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: "scan_step3_keyboard.png" });

      // Type a fake barcode and hit Enter
      const kbInput = await page.$('input[placeholder="Waiting for scanner…"]');
      if (kbInput) {
        await kbInput.fill("TESTBARCODE999");
        await kbInput.press("Enter");
        await page.waitForTimeout(800);
        await page.screenshot({ path: "scan_step4_after_scan.png" });
        const feedback = await page.$('div:has-text("No product for this barcode")');
        fs.appendFileSync("scan_results.txt", `Keyboard scan executed: YES\n`);
        fs.appendFileSync("scan_results.txt", `No-match feedback shown: ${feedback ? "YES" : "NO"}\n`);
      }
    }

    // 5. Close modal
    const closeBtn = await page.$('button[style*="fontSize:22"]');
    if (closeBtn) await closeBtn.click();
  }

  fs.appendFileSync("scan_results.txt", `Console errors: ${consoleErrors.length}\n`);
  if (consoleErrors.length) {
    fs.appendFileSync("scan_results.txt", consoleErrors.slice(0, 5).join("\n") + "\n");
  }

  await browser.close();
})().catch(e => { require("fs").writeFileSync("scan_results.txt", "FATAL: " + e.message); });
