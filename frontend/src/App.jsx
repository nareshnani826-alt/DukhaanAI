import { useEffect }                    from "react"
import { BrowserRouter, Routes, Route } from "react-router-dom"
import { initializeSeedTraining }        from "./voice-ai/seedTraining"
import { ThemeProvider }    from "./context/ThemeContext"
import { AuthProvider }     from "./context/AuthContext"
import { PlanProvider }     from "./context/PlanContext"
import { AppModeProvider }  from "./context/AppModeContext"
import Layout            from "./components/Layout"
import UpgradeWall       from "./components/UpgradeWall"
import InstallPrompt     from "./components/InstallPrompt"
import Dashboard         from "./pages/Dashboard"
import Inventory         from "./pages/Inventory"
import Billing           from "./pages/Billing"
import Agent             from "./pages/Agent"
import Insights          from "./pages/Insights"
import Voice             from "./pages/Voice"
import Customers         from "./pages/Customers"
import DayOps            from "./pages/DayOps"
import Settings          from "./pages/Settings"
import Help             from "./pages/Help"
import UdharKhata           from "./pages/UdharKhata"
import DemandIntelligence   from "./pages/DemandIntelligence"
import WastageRecording     from "./pages/Wastage"
import InstallGuide         from "./pages/InstallGuide"
import BulkImport           from "./pages/BulkImport"
import ExpiryIntelligence   from "./pages/ExpiryIntelligence"
import History             from "./pages/History"
import AppScreens           from "./pages/AppScreens"
import HeroLoop             from "./pages/HeroLoop"
import Landing              from "./pages/Landing"
import OfflineBanner        from "./components/OfflineBanner"
import AITest               from "./pages/AITest"
import More                 from "./pages/More"
import ResetPassword        from "./pages/ResetPassword"
import BangleInventory      from "./pages/BangleInventory"
import BangleBilling        from "./pages/BangleBilling"
import BangleFestivals      from "./pages/BangleFestivals"
import BangleInsights      from "./pages/BangleInsights"
import BangleDashboard    from "./pages/BangleDashboard"
import BangleBulkImport  from "./pages/BangleBulkImport"
// Wrapper that gates a page behind a plan feature
function Gated({ feature, children }) {
  return <UpgradeWall feature={feature}>{children}</UpgradeWall>
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
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/hero-loop" element={<HeroLoop />} />
            <Route path="/*" element={
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
                  <Route path="/more"             element={<More />} />
                  <Route path="/bangle-inventory"  element={<BangleInventory />} />
                  <Route path="/bangle-billing"    element={<BangleBilling />} />
                  <Route path="/bangle-festivals"  element={<BangleFestivals />} />
                  <Route path="/bangle-insights"    element={<BangleInsights />} />
                  <Route path="/bangle-dashboard"   element={<BangleDashboard />} />
                  <Route path="/bangle-bulk-import" element={<BangleBulkImport />} />
                  <Route path="/ai-test" element={<Gated feature="voice_agent"><AITest /></Gated>} />
                </Routes>
              </Layout>
            } />
          </Routes>
        </BrowserRouter>
      </AppModeProvider>
      </PlanProvider>
    </AuthProvider>
    </ThemeProvider>
  )
}
