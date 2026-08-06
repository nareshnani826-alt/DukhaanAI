import { useEffect, lazy, Suspense }     from "react"
import { BrowserRouter, Routes, Route } from "react-router-dom"
import { initializeSeedTraining }        from "./voice-ai/seedTraining"
import { ThemeProvider }    from "./context/ThemeContext"
import { AuthProvider }     from "./context/AuthContext"
import { PlanProvider }     from "./context/PlanContext"
import { AppModeProvider }  from "./context/AppModeContext"
import Layout            from "./components/Layout"
import UpgradeWall       from "./components/UpgradeWall"
import InstallPrompt     from "./components/InstallPrompt"
import OfflineBanner     from "./components/OfflineBanner"

const Dashboard         = lazy(() => import("./pages/Dashboard"))
const Inventory         = lazy(() => import("./pages/Inventory"))
const Billing           = lazy(() => import("./pages/Billing"))
const Agent             = lazy(() => import("./pages/Agent"))
const Insights          = lazy(() => import("./pages/Insights"))
const Voice             = lazy(() => import("./pages/Voice"))
const Customers         = lazy(() => import("./pages/Customers"))
const DayOps            = lazy(() => import("./pages/DayOps"))
const Settings          = lazy(() => import("./pages/Settings"))
const Help              = lazy(() => import("./pages/Help"))
const UdharKhata        = lazy(() => import("./pages/UdharKhata"))
const DemandIntelligence = lazy(() => import("./pages/DemandIntelligence"))
const WastageRecording  = lazy(() => import("./pages/Wastage"))
const InstallGuide      = lazy(() => import("./pages/InstallGuide"))
const BulkImport        = lazy(() => import("./pages/BulkImport"))
const ExpiryIntelligence = lazy(() => import("./pages/ExpiryIntelligence"))
const History           = lazy(() => import("./pages/History"))
const AppScreens        = lazy(() => import("./pages/AppScreens"))
const HeroLoop          = lazy(() => import("./pages/HeroLoop"))
const LoginHome         = lazy(() => import("./pages/LoginHome"))
const AITest            = lazy(() => import("./pages/AITest"))
const More              = lazy(() => import("./pages/More"))
const ResetPassword     = lazy(() => import("./pages/ResetPassword"))
const BangleInventory   = lazy(() => import("./pages/BangleInventory"))
const BangleBilling     = lazy(() => import("./pages/BangleBilling"))
const BangleFestivals   = lazy(() => import("./pages/BangleFestivals"))
const BangleInsights    = lazy(() => import("./pages/BangleInsights"))
const BangleDashboard   = lazy(() => import("./pages/BangleDashboard"))
const BangleBulkImport  = lazy(() => import("./pages/BangleBulkImport"))
const BangleDayOps      = lazy(() => import("./pages/BangleDayOps"))
const BangleHistory     = lazy(() => import("./pages/BangleHistory"))
const BangleUdhar       = lazy(() => import("./pages/BangleUdhar"))
const ReorderHub        = lazy(() => import("./pages/ReorderHub"))
const AgentSuggestions  = lazy(() => import("./pages/AgentSuggestions"))
const Onboarding        = lazy(() => import("./pages/Onboarding"))
const PublicInvoice     = lazy(() => import("./pages/PublicInvoice"))
// Wrapper that gates a page behind a plan feature
function Gated({ feature, children }) {
  return <UpgradeWall feature={feature}>{children}</UpgradeWall>
}
// Redirect first-time users to onboarding before showing any app page
function FirstRunGuard({ children }) {
  const done = (() => { try { return !!localStorage.getItem("dk_onboarding_done") } catch { return true } })()
  if (!done) { window.location.replace("/onboarding"); return null }
  return children
}

export default function App() {
  useEffect(() => { initializeSeedTraining() }, [])

  return (
    <ThemeProvider>
    <AuthProvider>
      <PlanProvider>
      <AppModeProvider>
        <BrowserRouter>
          <InstallPrompt />
          <OfflineBanner />
          <Suspense fallback={
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
              height:"100vh", fontSize:13, color:"var(--ink-faint,#aaa)" }}>
              Loading…
            </div>
          }>
          <Routes>
            <Route path="/" element={<FirstRunGuard><LoginHome /></FirstRunGuard>} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/hero-loop" element={<HeroLoop />} />
            <Route path="/invoice/:id" element={<PublicInvoice />} />
            <Route path="/*" element={
              <FirstRunGuard>
              <Layout>
                <Routes>
                  <Route path="/dashboard"  element={<Dashboard />} />
                  <Route path="/inventory"  element={<Inventory />} />
                  <Route path="/billing"    element={<Billing />} />
                  <Route path="/settings"   element={<Settings />} />
                  <Route path="/help"       element={<Help />} />
                  <Route path="/udhar"      element={<UdharKhata />} />
                  <Route path="/demand"     element={<DemandIntelligence />} />
                  <Route path="/wastage"    element={<WastageRecording />} />
                  <Route path="/install"    element={<InstallGuide />} />
                  <Route path="/bulk-import" element={<BulkImport />} />
                  <Route path="/expiry"     element={<ExpiryIntelligence />} />
                  <Route path="/history"    element={<History />} />
                  <Route path="/app-screens" element={<AppScreens />} />
                  <Route path="/agent"      element={<Agent />} />
                  <Route path="/voice"      element={<Gated feature="voice_agent"><Voice /></Gated>} />
                  <Route path="/customers"  element={<Gated feature="customer_history"><Customers /></Gated>} />
                  <Route path="/day"        element={<Gated feature="day_ops"><DayOps /></Gated>} />
                  <Route path="/insights"   element={<Gated feature="insights"><Insights /></Gated>} />
                  <Route path="/ai-suggestions" element={<Gated feature="insights"><AgentSuggestions /></Gated>} />
                  <Route path="/more"             element={<More />} />
                  <Route path="/bangle-inventory"  element={<BangleInventory />} />
                  <Route path="/bangle-billing"    element={<BangleBilling />} />
                  <Route path="/bangle-festivals"  element={<BangleFestivals />} />
                  <Route path="/bangle-insights"    element={<BangleInsights />} />
                  <Route path="/bangle-dashboard"   element={<BangleDashboard />} />
                  <Route path="/bangle-bulk-import" element={<BangleBulkImport />} />
                  <Route path="/bangle-day"         element={<BangleDayOps />} />
                  <Route path="/bangle-history"     element={<BangleHistory />} />
                  <Route path="/bangle-udhar"       element={<BangleUdhar />} />
                  <Route path="/reorder"           element={<ReorderHub />} />
                  <Route path="/ai-test" element={<Gated feature="voice_agent"><AITest /></Gated>} />
                </Routes>
              </Layout>
            </FirstRunGuard>} />
          </Routes>
          </Suspense>
        </BrowserRouter>
      </AppModeProvider>
      </PlanProvider>
    </AuthProvider>
    </ThemeProvider>
  )
}
