// Shared barcode → product lookup used by both Kirana (Inventory.jsx) and
// Bangle (BangleInventory.jsx) Add Product flows.
//
// Tries multiple free public databases in order:
//   1. UPCItemDB trial   — general retail / electronics / household
//   2. OpenFoodFacts     — packaged food & beverages
//   3. OpenBeautyFacts   — cosmetics & personal care
//   4. OpenProductsFacts — general non-food
//
// Returns { name, brand, barcode, category, mrp, diag } — name is empty
// if nothing was found. `diag` is a short string useful for debugging.

const KIRANA_CATS = ["Staples","Dairy","Oils","Beverages","Snacks","Personal Care","Other"]

function mapKiranaCategory(textParts) {
  const t = (textParts || []).join(" ").toLowerCase()
  if (!t.trim()) return "Other"
  if (/(milk|dairy|cheese|butter|paneer|curd|yogurt|yoghurt|ghee)/.test(t)) return "Dairy"
  if (/(oil|ghee|olive|sunflower|mustard oil|coconut oil)/.test(t))         return "Oils"
  if (/(juice|drink|soda|cola|coke|pepsi|sprite|fanta|water|beverage|tea|coffee|energy)/.test(t)) return "Beverages"
  if (/(chips|biscuit|cookie|chocolate|candy|snack|namkeen|wafer|crisp|noodle|popcorn)/.test(t)) return "Snacks"
  if (/(soap|shampoo|toothpaste|deodorant|lotion|cream|brush|hygiene|sanitary|detergent|wash)/.test(t)) return "Personal Care"
  if (/(rice|flour|atta|dal|pulse|sugar|salt|spice|masala|grain|cereal|pasta|wheat|maida|besan|sooji|rava)/.test(t)) return "Staples"
  return "Other"
}

function mapBangleCategory(textParts) {
  const t = (textParts || []).join(" ").toLowerCase()
  if (!t.trim()) return "Other"
  if (t.includes("bangle") || t.includes("kada"))      return "Bangles"
  if (t.includes("earring") || t.includes("jhumka"))   return "Earrings"
  if (t.includes("necklace") || t.includes("haar"))    return "Necklace"
  if (t.includes("ring"))                              return "Ring"
  if (t.includes("bracelet"))                          return "Bracelet"
  if (t.includes("anklet") || t.includes("payal"))     return "Anklet"
  if (t.includes("hair clip") || t.includes("hair pin")) return "Hair Clip"
  if (t.includes("bindi"))                             return "Bindi"
  if (t.includes("tikka") || t.includes("maang"))      return "Maang Tikka"
  if (t.includes("nose ring") || t.includes("nath"))   return "Nose Ring"
  return "Other"
}

/**
 * Look up a barcode across multiple free databases.
 * @param {string} barcode
 * @param {"kirana"|"bangle"} storeType
 * @returns {Promise<{name:string,brand:string,barcode:string,category:string,mrp:string,diag:string,found:boolean}>}
 */
export async function lookupBarcode(barcode, storeType = "kirana") {
  const mapCat = storeType === "bangle" ? mapBangleCategory : mapKiranaCategory
  const defaultCat = storeType === "bangle" ? "Bangles" : "Other"
  let result = { name:"", brand:"", barcode, category: defaultCat, mrp:"", found:false }
  const diag = []

  // 1) UPCItemDB
  try {
    const r = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${barcode}`)
    diag.push(`upc:${r.status}`)
    if (r.ok) {
      const d = await r.json()
      const item = d.items?.[0]
      if (item?.title) {
        result = {
          name: item.title,
          brand: item.brand || "",
          barcode,
          category: mapCat([item.category || "", item.title || "", item.brand || ""]),
          mrp: item.lowest_recorded_price ? String(item.lowest_recorded_price) : "",
          found: true,
        }
      } else diag.push("upc:empty")
    }
  } catch (e) { diag.push(`upc-err:${e.message}`) }

  // 2) OpenFoodFacts
  if (!result.found) {
    try {
      const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`)
      diag.push(`off:${r.status}`)
      const d = await r.json()
      if ((d.status === 1 || d.status === "success") && d.product) {
        const p = d.product
        const name = p.product_name_en || p.product_name || p.generic_name || ""
        const brand = p.brands?.split(",")[0]?.trim() || ""
        if (name) {
          const tags = [...(p.categories_tags || []), ...(p.labels_tags || []), name, brand]
          result = { name, brand, barcode, category: mapCat(tags), mrp:"", found:true }
        } else diag.push("off:no-name")
      } else diag.push(`off:status=${d.status}`)
    } catch (e) { diag.push(`off-err:${e.message}`) }
  }

  // 3) OpenBeautyFacts
  if (!result.found) {
    try {
      const r = await fetch(`https://world.openbeautyfacts.org/api/v2/product/${barcode}.json`)
      diag.push(`obf:${r.status}`)
      const d = await r.json()
      if ((d.status === 1 || d.status === "success") && d.product) {
        const p = d.product
        const name = p.product_name_en || p.product_name || ""
        const brand = p.brands?.split(",")[0]?.trim() || ""
        if (name) {
          result = { name, brand, barcode, category: mapCat([name, brand, "personal care"]), mrp:"", found:true }
        }
      }
    } catch (e) { diag.push(`obf-err:${e.message}`) }
  }

  // 4) OpenProductsFacts
  if (!result.found) {
    try {
      const r = await fetch(`https://world.openproductsfacts.org/api/v2/product/${barcode}.json`)
      diag.push(`opf:${r.status}`)
      const d = await r.json()
      if ((d.status === 1 || d.status === "success") && d.product) {
        const p = d.product
        const name = p.product_name_en || p.product_name || ""
        const brand = p.brands?.split(",")[0]?.trim() || ""
        if (name) {
          result = { name, brand, barcode, category: mapCat([name, brand]), mrp:"", found:true }
        }
      }
    } catch (e) { diag.push(`opf-err:${e.message}`) }
  }

  result.diag = diag.join(" | ")
  return result
}

export { KIRANA_CATS }
