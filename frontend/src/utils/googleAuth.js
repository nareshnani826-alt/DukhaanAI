// "Continue with Google" on the website (Google Identity Services). Google gives us an ID token;
// the server checks it (POST /auth/google). The client ID is public — it is in every page that
// uses Google sign-in. The Android app needs Google's native account picker instead (not yet).
const SCRIPT = "https://accounts.google.com/gsi/client"
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
  || "2056383600-ddgj7ko9n3ve17lnlujn611aoeku5gah.apps.googleusercontent.com"

let loading = null
function loadGoogle() {
  if (window.google?.accounts?.id) return Promise.resolve()
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const s = document.createElement("script")
      s.src = SCRIPT; s.async = true
      s.onload = () => resolve()
      s.onerror = () => { loading = null; reject(new Error("Could not load Google sign-in")) }
      document.head.appendChild(s)
    })
  }
  return loading
}

// What runs after the person picks a Google account: onToken(idToken). The form sets it on every
// render so it always sees the current tab and store type; the button itself is drawn only once.
const holder = { onToken: null }
let initialised = false
export const setGoogleHandler = onToken => { holder.onToken = onToken }

// Draws Google's own button into `el`
export async function renderGoogleButton(el, { text = "continue_with", width } = {}) {
  await loadGoogle()
  if (!initialised) {
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: r => holder.onToken?.(r.credential),
      ux_mode: "popup",
      auto_select: false,
      cancel_on_tap_outside: true,
    })
    initialised = true
  }
  if (!el) return
  el.innerHTML = ""
  window.google.accounts.id.renderButton(el, {
    type: "standard", theme: "outline", size: "large", shape: "pill", text, logo_alignment: "center",
    width: Math.max(200, Math.min(400, width || el.offsetWidth || 320)),
  })
}
