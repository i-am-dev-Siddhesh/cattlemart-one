import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ActivitiesPage, CropsPage } from './pages/Activities'
import { CalendarPage } from './pages/Calendar'
import { ComparePage } from './pages/Compare'
import { DashboardPage } from './pages/Dashboard'
import { FinancePage } from './pages/Finance'
import { MapPage } from './pages/MapPage'
import { PlotDetailPage, PlotsPage } from './pages/Plots'
import { ReportsPage } from './pages/Reports'
import { SettingsPage } from './pages/Settings'
import { AssistantPage } from './pages/Assistant'
import { OpsPage } from './pages/Ops'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/plots" element={<PlotsPage />} />
          <Route path="/plots/:plotId" element={<PlotDetailPage />} />
          <Route path="/assistant" element={<AssistantPage />} />
          <Route path="/ops" element={<OpsPage />} />
          <Route path="/activities" element={<ActivitiesPage />} />
          <Route path="/crops" element={<CropsPage />} />
          <Route path="/finance" element={<FinancePage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/compare" element={<ComparePage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
