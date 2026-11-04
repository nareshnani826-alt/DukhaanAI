// Public legal pages: /privacy and /delete-account (Google Play needs both as web links).
// Keep these in plain words; update "Last updated" whenever the text changes.
import { Link } from "react-router-dom"

const UPDATED = "4 November 2026"
const EMAIL = "support@dukhaanai.in"

function Page({ title, children }) {
  return (
    <div style={{ minHeight:"100vh", background:"var(--bg, #fffaf5)", color:"var(--ink, #1f0e03)" }}>
      <div style={{ maxWidth:760, margin:"0 auto", padding:"28px 16px 60px", lineHeight:1.65, fontSize:15 }}>
        <Link to="/" style={{ color:"var(--jade, #b45309)", fontWeight:700, textDecoration:"none", fontSize:14 }}>← DukhaanAI</Link>
        <h1 style={{ fontSize:28, fontWeight:800, margin:"14px 0 4px" }}>{title}</h1>
        <div style={{ fontSize:13, opacity:0.65, marginBottom:20 }}>Last updated: {UPDATED}</div>
        <div className="legal">{children}</div>
        <style>{`
          .legal h2 { font-size:19px; font-weight:800; margin:26px 0 8px; }
          .legal p, .legal li { margin:0 0 8px; }
          .legal ul, .legal ol { padding-left:22px; margin:0 0 10px; }
          .legal ul { list-style:disc; } .legal ol { list-style:decimal; }
          .legal a { color:var(--jade, #b45309); text-decoration:underline; }
          .legal table { border-collapse:collapse; width:100%; font-size:14px; margin:6px 0 12px; }
          .legal td, .legal th { border:1px solid rgba(127,127,127,0.3); padding:6px 8px; text-align:left; vertical-align:top; }
        `}</style>
      </div>
    </div>
  )
}

export function PrivacyPolicy() {
  return (
    <Page title="Privacy Policy">
      <p>
        DukhaanAI ("we", "us") makes the DukhaanAI app for Android and the website dukhaanai.in —
        billing, stock, khata and reports for small shops in India. This policy explains what data
        we collect, why, who we share it with, and how you can delete it. It applies to the app
        (package <b>com.dukaanai.app</b>) and the website.
      </p>

      <h2>1. Data we collect</h2>
      <table>
        <thead><tr><th>Data</th><th>Why we need it</th></tr></thead>
        <tbody>
          <tr><td>Account: shop name, your email, phone number, password (stored only as a secure hash), address and GSTIN if you enter them</td><td>To create your account, sign you in, send sign-up codes and password-reset emails, and print your shop details on bills</td></tr>
          <tr><td>Shop data: products, prices, stock, bills, sales, wastage, khata (credit) entries, daily reports, staff usernames</td><td>This is the service — so you can bill, track stock and see reports on any device</td></tr>
          <tr><td>Your customers' details that you enter: names, phone numbers, amounts owed and purchases</td><td>To keep your khata and customer history and to send bills on WhatsApp when you ask</td></tr>
          <tr><td>Voice (microphone)</td><td>Only while you press the Speak / voice button, to turn your speech into bill items or questions</td></tr>
          <tr><td>Photos (camera)</td><td>Only when you scan a barcode, a supplier invoice or a product photo</td></tr>
          <tr><td>Payment details for a paid plan</td><td>Handled by Razorpay. We receive the subscription status and ID, never your card or UPI PIN</td></tr>
          <tr><td>Basic technical data: IP address, app version, error logs</td><td>Security (rate limits, stopping misuse) and fixing bugs</td></tr>
        </tbody>
      </table>
      <p>
        <b>Free plan without sign-in:</b> your shop data is saved only on your phone and is not sent
        to our servers. <b>Pro plan:</b> your shop data is stored on our servers so it syncs between devices.
      </p>
      <p>We do <b>not</b> show ads, do not sell your data, and do not use your data to track you across other apps or websites.</p>

      <h2>2. Microphone and camera</h2>
      <p>
        The app asks for microphone and camera permission only when you use voice billing or scanning.
        It never records in the background. Voice and images are used to read the items or text and are
        not kept as recordings or photos after they are processed.
      </p>

      <h2>3. Who we share data with</h2>
      <p>We share data only with the service providers that run DukhaanAI, only for the purposes above:</p>
      <ul>
        <li><b>Supabase</b> — database where account and Pro shop data are stored (servers in Japan)</li>
        <li><b>Render</b> — our app servers (Singapore)</li>
        <li><b>Groq</b> and <b>Google Gemini</b> — AI that answers your questions about your shop and reads scanned invoices or photos</li>
        <li><b>AssemblyAI</b> and your phone's speech service (Google) — turn voice into text</li>
        <li><b>Razorpay</b> — payments for paid plans</li>
        <li><b>Brevo</b> — sends sign-up and password-reset emails</li>
        <li><b>Meta (WhatsApp)</b> — sends login codes and, when you choose, bills to your customers</li>
      </ul>
      <p>
        Because some of these providers are outside India, your data may be processed in other countries.
        We may also disclose data if Indian law or a court order requires it.
      </p>

      <h2>4. Security</h2>
      <p>
        All data is sent over encrypted HTTPS connections. Passwords and staff PINs are stored only as
        one-way hashes. Each shop can only see its own data, and staff logins have limited access set by the owner.
      </p>

      <h2>5. How long we keep data</h2>
      <p>
        We keep your data while your account exists. When you delete your account, your account and shop
        data are deleted from our database immediately and from backups within 30 days. Records of payments
        made to us may be kept for up to 8 years where Indian tax law requires it.
      </p>

      <h2>6. Your rights and choices</h2>
      <ul>
        <li>See and correct your data inside the app at any time (Settings, Inventory, Khata, History).</li>
        <li>Export your data — ask us at <a href={`mailto:${EMAIL}`}>{EMAIL}</a>.</li>
        <li>Delete your account and all its data — in the app, or see <Link to="/delete-account">how to delete your account</Link>.</li>
        <li>Withdraw microphone or camera permission at any time in your phone's settings.</li>
      </ul>
      <p>These rights follow India's Digital Personal Data Protection Act, 2023.</p>

      <h2>7. Children</h2>
      <p>DukhaanAI is a business tool for shop owners and is not meant for anyone under 18. We do not knowingly collect data from children.</p>

      <h2>8. Changes to this policy</h2>
      <p>If we change this policy we will update the date at the top and, for important changes, tell you in the app.</p>

      <h2>9. Contact and grievances</h2>
      <p>
        For any question, request or complaint about your data, email <a href={`mailto:${EMAIL}`}>{EMAIL}</a>.
        We reply within 7 days and resolve complaints within 30 days.
      </p>
    </Page>
  )
}

export function DeleteAccountInfo() {
  return (
    <Page title="Delete your DukhaanAI account">
      <p>
        This page explains how to delete your <b>DukhaanAI</b> account (Android app <b>com.dukaanai.app</b> and
        dukhaanai.in) and what happens to your data.
      </p>

      <h2>Option 1 — Delete it yourself (instant)</h2>
      <ol>
        <li>Open the DukhaanAI app, or sign in at <a href="https://dukhaanai.in">dukhaanai.in</a>.</li>
        <li>Go to <b>Settings</b> and scroll to the bottom (<b>Account actions</b>).</li>
        <li>Tap <b>Delete my account</b>.</li>
        <li>Type your password, tick <b>I understand my data cannot be recovered</b>, and tap <b>Delete forever</b>.</li>
      </ol>
      <p>Only the shop owner can do this — staff logins cannot delete the shop.
        If you run more than one kind of shop (for example kirana and chai), each is a separate account; delete each one.</p>

      <h2>Option 2 — Ask us by email</h2>
      <p>
        If you can't sign in, email <a href={`mailto:${EMAIL}?subject=Delete%20my%20DukhaanAI%20account`}>{EMAIL}</a> from
        the email address of your account, with the subject "Delete my account" and your shop name. We will
        confirm it is your account and delete it within 7 days.
      </p>

      <h2>What gets deleted</h2>
      <ul>
        <li>Your account: shop name, email, phone number, password, address, GSTIN</li>
        <li>All shop data: products, stock, bills, sales, wastage, khata entries, customers, staff logins, daily reports and AI suggestions</li>
        <li>Any paid plan is cancelled so you are not charged again</li>
        <li>On the phone you delete from, all DukhaanAI data saved on that phone</li>
      </ul>

      <h2>What we keep, and for how long</h2>
      <ul>
        <li>Deleted data is removed from our database at once and from backups within <b>30 days</b>.</li>
        <li>Records of payments you made to us (amount, date, Razorpay reference) may be kept for up to <b>8 years</b> because Indian tax law requires it. They are no longer linked to your account.</li>
        <li>Product names you added to the shared product catalogue stay in the catalogue but are no longer linked to you.</li>
      </ul>

      <p>See our <Link to="/privacy">Privacy Policy</Link> for more.</p>
    </Page>
  )
}
