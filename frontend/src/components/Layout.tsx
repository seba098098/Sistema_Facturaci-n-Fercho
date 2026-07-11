import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { FileText, Users, Settings, Receipt, Menu, X, Mail, Phone, MapPin } from 'lucide-react'
import { useState, useEffect } from 'react'
import api from '../services/api'

const navItems = [
  { to: '/', label: 'Facturar', icon: FileText },
  { to: '/facturas', label: 'Historial', icon: Receipt },
  { to: '/clientes', label: 'Clientes', icon: Users },
  { to: '/configuracion', label: 'Configuración', icon: Settings },
]

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [hasLogo, setHasLogo] = useState(false)
  const location = useLocation()

  useEffect(() => {
    api.get('/settings/').then((r) => {
      setHasLogo(!!r.data.logo_path)
    }).catch(() => {})
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-[260px] bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out flex flex-col ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="h-14 flex items-center gap-2.5 px-5 border-b border-gray-100 flex-shrink-0">
          {hasLogo ? (
            <img
              src={`/api/settings/logo?t=${Date.now()}`}
              alt="Logo"
              className="h-7 w-7 object-contain rounded-md"
            />
          ) : (
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
              <Receipt className="w-4 h-4 text-white" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <span className="font-bold text-gray-900 text-sm tracking-tight">FacturaPos</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-3 space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.to ||
              (item.to !== '/' && location.pathname.startsWith(item.to))
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon className="w-[18px] h-[18px]" />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </nav>

        <div className="border-t border-gray-100 px-4 py-3.5">
          <div className="flex items-center gap-2 mb-1.5">
            <img src="/logo_muxygo.png" alt="MuxyGo" className="h-5 w-5 object-contain" />
            <span className="font-semibold text-gray-800 text-xs">MuxyGo</span>
          </div>
          <div className="space-y-1">
            <a href="mailto:comercial@muxygo.com" className="flex items-center gap-1.5 text-[11px] text-gray-400 hover:text-blue-600 transition-colors">
              <Mail className="w-3 h-3" />
              comercial@muxygo.com
            </a>
            <a href="tel:+573142585911" className="flex items-center gap-1.5 text-[11px] text-gray-400 hover:text-blue-600 transition-colors">
              <Phone className="w-3 h-3" />
              +57 314 258 5911
            </a>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-white border-b border-gray-200 flex items-center px-4 lg:px-6 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-1.5 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 mr-3"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-[15px] font-semibold text-gray-900">
            {navItems.find(
              (i) =>
                i.to === location.pathname ||
                (i.to !== '/' && location.pathname.startsWith(i.to))
            )?.label || 'Sistema de Facturación'}
          </h1>

          <div className="ml-auto hidden lg:flex items-center gap-5 text-[12px] text-gray-400">
            <a href="https://muxygo.com" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 font-medium text-blue-600 transition-colors">Inicio</a>
            <a href="https://muxygo.com/servicios" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 transition-colors">Servicios</a>
            <a href="https://muxygo.com/nosotros" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 transition-colors">Nosotros</a>
            <a href="https://muxygo.com/contacto" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 transition-colors">Contacto</a>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <Outlet />
        </main>

        <footer className="border-t border-gray-100 bg-white px-4 lg:px-6 py-3 flex-shrink-0">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-gray-400">
            <div className="flex items-center gap-2">
              <img src="/logo_muxygo.png" alt="MuxyGo" className="h-4 w-4 object-contain" />
              <span className="font-medium text-gray-500">MuxyGo</span>
              <span className="hidden sm:inline">— Transformamos ideas en soluciones tecnológicas</span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
              <a href="mailto:comercial@muxygo.com" className="flex items-center gap-1 hover:text-blue-600 transition-colors">
                <Mail className="w-3 h-3" />
                comercial@muxygo.com
              </a>
              <a href="tel:+573142585911" className="flex items-center gap-1 hover:text-blue-600 transition-colors">
                <Phone className="w-3 h-3" />
                +57 314 258 5911
              </a>
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                Sogamoso, Boyacá
              </span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
