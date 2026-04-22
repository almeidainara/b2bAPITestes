import { CssBaseline, ThemeProvider } from '@mui/material'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { NotificationBar } from './components/NotificationBar'
import { TokenDialog } from './components/TokenDialog'
import { AppProvider } from './context/AppContext'
import { BatchProposalsPage } from './pages/BatchProposals'
import { CredentialsPage } from './pages/Credentials'
import { EligibilityPage } from './pages/Eligibility'
import { OffersPage } from './pages/Offers'
import { PartnersPage } from './pages/Partners'
import { ProposalsPage } from './pages/Proposals'
import { ProposalsListPage } from './pages/ProposalsList'
import { SettingsPage } from './pages/Settings'
import theme from './theme/theme'

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Navigate to="/proposals" replace />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/partners" element={<PartnersPage />} />
              <Route path="/credentials" element={<CredentialsPage />} />
              <Route path="/eligibility" element={<EligibilityPage />} />
              <Route path="/offers" element={<OffersPage />} />
              <Route path="/proposals" element={<ProposalsPage />} />
              <Route path="/proposals-list" element={<ProposalsListPage />} />
              <Route path="/batch-proposals" element={<BatchProposalsPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
        <TokenDialog />
        <NotificationBar />
      </AppProvider>
    </ThemeProvider>
  )
}
