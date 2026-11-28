// "Continue with Google". Website: Google Identity Services button. Android app: Google's native
// account picker (Credential Manager, @capgo/capacitor-social-login). Both give us an ID token for
// the WEB client ID below, which the server checks (POST /auth/google). The Android OAuth clients
// (upload key + Play signing key SHA-1) are only registered in Google Cloud, never used here.
// The client ID is public — it is in every page and app that uses Google sign-in.
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

// ── Android app: native Google account picker ────────────────────────────────
let nativeReady = null
// Resolves with Google's ID token, or null if the person closed the picker.
export async function nativeGoogleSignIn() {
  const { SocialLogin } = await import("@capgo/capacitor-social-login")
  if (!nativeReady) {
    // Only the ID token is needed (the server signs in with it), so skip the extra
    // "authorize" step that can hang on Capacitor's stock activity.
    nativeReady = SocialLogin.initialize({ google: { webClientId: GOOGLE_CLIENT_ID, skipAuthOnlyAuthorizationAfterSignIn: true } })
      .catch(e => { nativeReady = null; throw e })
  }
  await nativeReady
  try {
    const res = await SocialLogin.login({ provider: "google", options: {} })
    const token = res?.result?.idToken
    if (!token) throw new Error("Google did not return a sign-in. Please try again.")
    return token
  } catch (e) {
    const why = String(e?.message || e || "").replace(/\s+/g, " ").trim()
    if (/cancel/i.test(why)) return null   // closed the picker
    if (/no credential|no account/i.test(why))
      throw new Error("Add a Google account to this phone (Settings → Accounts), then try again.")
    // 28444 / "Developer console is not set up correctly": Google doesn't yet accept this app's
    // signing key + package for our client ID (new Google Cloud setup can take a few hours)
    if (/28444|developer console|not set up correctly/i.test(why))
      throw new Error("Google hasn't accepted this app yet (setup can take a few hours). Please use email and password for now.")
    // Anything else: show Google's own short reason so it can be fixed
    throw new Error(`Google sign-in did not work${why ? ` (${why.slice(0, 120)})` : ""}. Please try again or use email and password.`)
  }
}
