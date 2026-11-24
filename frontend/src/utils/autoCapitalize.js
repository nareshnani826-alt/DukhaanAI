// Phone keyboards start every word with a capital letter in text boxes
// (product names, customer names, shop names...). Boxes that set their own
// autoCapitalize, and boxes for emails, UPI IDs, passwords, usernames,
// numbers or links, are left alone. Long text (textarea) capitalizes sentences.

const TEXT_TYPES = new Set(["", "text", "search"])
const SKIP_INPUTMODES = new Set(["numeric", "decimal", "tel", "email", "url", "none"])
const SKIP_AUTOCOMPLETE = /email|username|password|one-time-code|url/i

function decide(el) {
  if (el.hasAttribute("autocapitalize")) return null
  if (el.tagName === "TEXTAREA") return "sentences"
  if (el.tagName !== "INPUT") return null
  if (!TEXT_TYPES.has((el.getAttribute("type") || "").toLowerCase())) return null
  if (SKIP_INPUTMODES.has((el.getAttribute("inputmode") || "").toLowerCase())) return null
  if (SKIP_AUTOCOMPLETE.test(el.getAttribute("autocomplete") || "")) return null
  const hint = `${el.getAttribute("placeholder") || ""} ${el.getAttribute("name") || ""}`
  if (/@|upi|user ?name|login|pin\b|http|www\./i.test(hint)) return null
  return "words"
}

function apply(root) {
  if (root.nodeType !== 1) return
  const list = root.matches?.("input, textarea") ? [root] : []
  root.querySelectorAll?.("input, textarea").forEach(el => list.push(el))
  for (const el of list) {
    const v = decide(el)
    if (v) el.setAttribute("autocapitalize", v)
  }
}

export function installAutoCapitalize() {
  if (typeof document === "undefined") return
  apply(document.body)
  new MutationObserver(records => {
    for (const r of records) {
      if (r.type === "attributes") apply(r.target)
      else r.addedNodes.forEach(apply)
    }
  }).observe(document.body, {
    childList: true, subtree: true,
    attributes: true, attributeFilter: ["type", "inputmode", "placeholder"],
  })
  // Safety net: decide again at focus time, before the keyboard opens
  document.addEventListener("focusin", e => apply(e.target), true)
}
