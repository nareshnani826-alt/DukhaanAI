import { BrowserRouter, Routes, Route } from "react-router-dom"
import { ThemeProvider } from "./context/ThemeContext"
import { AuthProvider }  from "./context/AuthContext"
import { PlanProvider }  from "./context/PlanContext"
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
import AppScreens           from "./pages/AppScreens"
import HeroLoop             from "./pages/HeroLoop"
import Landing              from "./pages/Landing"
import OfflineBanner        from "./components/OfflineBanner"
import AITest               from "./pages/AITest"
// Wrapper that gates a page behind a plan feature
function Gated({ feature, children }) {
  return <UpgradeWall feature={feature}>{children}</UpgradeWall>
}

export default function App() {
  return (
    <ThemeProvider>
    <AuthProvider>
      <PlanProvider>
        <BrowserRouter>
          <InstallPrompt />
          <OfflineBanner />
          <Routes>
            <Route path="/" element={<Landing />} />
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
                  <Route path="/app-screens" element={<AppScreens />} />
                  <Route path="/agent"      element={<Agent />} />
                  <Route path="/voice"      element={<Gated feature="voice_agent"><Voice /></Gated>} />
                  <Route path="/customers"  element={<Gated feature="customer_history"><Customers /></Gated>} />
                  <Route path="/day"        element={<Gated feature="day_ops"><DayOps /></Gated>} />
                  <Route path="/insights"   element={<Gated feature="insights"><Insights /></Gated>} />
                  <Route path="/ai-test" element={<Gated feature="voice_agent"><AITest /></Gated>} />
                </Routes>
              </Layout>
            } />
          </Routes>
        </BrowserRouter>
      </PlanProvider>
    </AuthProvider>
    </ThemeProvider>
  )
}
