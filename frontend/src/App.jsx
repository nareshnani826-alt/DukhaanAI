import { BrowserRouter, Routes, Route } from "react-router-dom"
import { AuthProvider } from "./context/AuthContext"
import Layout from "./components/Layout"
import Dashboard from "./pages/Dashboard"
import Inventory from "./pages/Inventory"
import Billing from "./pages/Billing"
import Agent from "./pages/Agent"
import Insights from "./pages/Insights"

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/"          element={<Dashboard />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/billing"   element={<Billing />} />
            <Route path="/agent"     element={<Agent />} />
            <Route path="/insights"  element={<Insights />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </AuthProvider>
  )
}
