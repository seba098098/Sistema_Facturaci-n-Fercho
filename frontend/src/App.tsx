import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import InvoicePage from './pages/InvoicePage'
import InvoiceHistoryPage from './pages/InvoiceHistoryPage'
import InvoiceDetailPage from './pages/InvoiceDetailPage'
import ClientsPage from './pages/ClientsPage'
import SettingsPage from './pages/SettingsPage'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<InvoicePage />} />
        <Route path="/facturas" element={<InvoiceHistoryPage />} />
        <Route path="/facturas/:id" element={<InvoiceDetailPage />} />
        <Route path="/clientes" element={<ClientsPage />} />
        <Route path="/configuracion" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
