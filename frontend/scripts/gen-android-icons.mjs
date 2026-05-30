// Generates all Android launcher icons from favicon.svg using sharp
import sharp from "sharp"
import { readFileSync, mkdirSync } from "fs"
import { resolve, dirname } from "path"
import { fileURLToPath } from "url"

const __dir  = dirname(fileURLToPath(import.meta.url))
const svgSrc = resolve(__dir, "../public/favicon.svg")
const resDir = resolve(__dir, "../android/app/src/main/res")

const svgBuf = readFileSync(svgSrc)

// ic_launcher + ic_launcher_round sizes (launcher icon)
const launcherSizes = [
  { dir: "mipmap-mdpi",    size: 48  },
  { dir: "mipmap-hdpi",    size: 72  },
  { dir: "mipmap-xhdpi",   size: 96  },
  { dir: "mipmap-xxhdpi",  size: 144 },
  { dir: "mipmap-xxxhdpi", size: 192 },
]

// ic_launcher_foreground (adaptive icon layer — needs padding, 108dp safe zone = 66% of total)
const foregroundSizes = [
  { dir: "mipmap-mdpi",    size: 108 },
  { dir: "mipmap-hdpi",    size: 162 },
  { dir: "mipmap-xhdpi",   size: 216 },
  { dir: "mipmap-xxhdpi",  size: 324 },
  { dir: "mipmap-xxxhdpi", size: 432 },
]

async function rasterise(size, padding = 0) {
  const inner = size - padding * 2
  const resized = await sharp(svgBuf)
    .resize(inner, inner, { fit: "contain", background: { r:0,g:0,b:0,alpha:0 } })
    .png()
    .toBuffer()

  if (padding === 0) return resized

  // Place icon centred on a transparent canvas of `size`
  return sharp({
    create: { width: size, height: size, channels: 4, background: { r:0,g:0,b:0,alpha:0 } }
  })
    .composite([{ input: resized, top: padding, left: padding }])
    .png()
    .toBuffer()
}

async function main() {
  console.log("Generating Android launcher icons from favicon.svg…\n")

  // ic_launcher and ic_launcher_round (square + round, same image)
  for (const { dir, size } of launcherSizes) {
    const outDir = resolve(resDir, dir)
    mkdirSync(outDir, { recursive: true })
    const buf = await rasterise(size)
    await sharp(buf).toFile(resolve(outDir, "ic_launcher.png"))
    await sharp(buf).toFile(resolve(outDir, "ic_launcher_round.png"))
    console.log(`  ✓ ${dir}/ic_launcher.png  (${size}×${size})`)
  }

  // ic_launcher_foreground (adaptive layer — icon at 66% with padding for safe zone)
  for (const { dir, size } of foregroundSizes) {
    const outDir = resolve(resDir, dir)
    mkdirSync(outDir, { recursive: true })
    const padding = Math.round(size * 0.17)   // ~17% padding = icon occupies 66% safe zone
    const buf = await rasterise(size, padding)
    await sharp(buf).toFile(resolve(outDir, "ic_launcher_foreground.png"))
    console.log(`  ✓ ${dir}/ic_launcher_foreground.png  (${size}×${size}, icon at 66%)`)
  }

  console.log("\nAll icons generated. Rebuild the APK to apply.")
}

main().catch(e => { console.error(e); process.exit(1) })
