import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { FileText, Users, Settings, Receipt, Menu, X, Mail, Phone, MapPin } from 'lucide-react'
import { useState, useEffect } from 'react'
import api from '../services/api'

const navItems = [
  { to: '/', label: 'Nueva Factura', icon: FileText },
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
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out flex flex-col ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-2">
            {hasLogo ? (
              <img
                src={`/api/settings/logo?t=${Date.now()}`}
                alt="Logo"
                className="h-8 w-8 object-contain rounded"
              />
            ) : (
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <Receipt className="w-5 h-5 text-white" />
              </div>
            )}
            <span className="font-bold text-gray-900 text-lg">FacturaPos</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="mt-6 px-3 flex-shrink-0">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.to ||
              (item.to !== '/' && location.pathname.startsWith(item.to))
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-colors ${
                  isActive
                    ? 'bg-primary-50 text-primary-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </nav>

        <div className="mt-auto border-t border-gray-200 px-5 py-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 bg-primary-600 rounded flex items-center justify-center">
              <Receipt className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-gray-900 text-sm">MuxyGo</span>
          </div>
          <p className="text-xs text-gray-400 mb-3 leading-relaxed">
            Transformamos ideas en soluciones tecnológicas robustas.
          </p>
          <div className="flex flex-wrap gap-x-3 gap-y-1 mb-3">
            <a href="https://muxygo.com" target="_blank" rel="noopener noreferrer" className="text-xs text-primary-600 hover:underline">Inicio</a>
            <a href="https://muxygo.com/servicios" target="_blank" rel="noopener noreferrer" className="text-xs text-primary-600 hover:underline">Servicios</a>
            <a href="https://muxygo.com/nosotros" target="_blank" rel="noopener noreferrer" className="text-xs text-primary-600 hover:underline">Nosotros</a>
            <a href="https://muxygo.com/contacto" target="_blank" rel="noopener noreferrer" className="text-xs text-primary-600 hover:underline">Contacto</a>
          </div>
          <div className="space-y-1.5">
            <a href="mailto:comercial@muxygo.com" className="flex items-center gap-2 text-xs text-gray-500 hover:text-primary-600 transition-colors">
              <Mail className="w-3 h-3" />
              comercial@muxygo.com
            </a>
            <a href="tel:+573142585911" className="flex items-center gap-2 text-xs text-gray-500 hover:text-primary-600 transition-colors">
              <Phone className="w-3 h-3" />
              +57 314 258 5911
            </a>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              Sogamoso, Boyacá, Colombia
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-4 lg:px-6 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-gray-500 hover:text-gray-700 mr-3"
          >
            <Menu className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900">
            {navItems.find(
              (i) =>
                i.to === location.pathname ||
                (i.to !== '/' && location.pathname.startsWith(i.to))
            )?.label || 'Sistema de Facturación'}
          </h1>
        </header>

        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
