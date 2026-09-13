import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ActivitiesPage, CropsPage } from './screens/Activities'
import { CalendarPage } from './screens/Calendar'
import { ComparePage } from './screens/Compare'
import { DashboardPage } from './screens/Dashboard'
import { FinancePage } from './screens/Finance'
import { MapPage } from './screens/MapPage'
import { PlotDetailPage, PlotsPage } from './screens/Plots'
import { ReportsPage } from './screens/Reports'
import { SettingsPage } from './screens/Settings'
import { AssistantPage } from './screens/Assistant'
import { OpsPage } from './screens/Ops'

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
