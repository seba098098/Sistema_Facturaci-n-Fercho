import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Search, Download, Mail, Copy, Eye, Calendar, CreditCard, Receipt, Filter } from 'lucide-react'
import api from '../services/api'
import { InvoiceListItem } from '../types'
import { formatCurrency, formatDateTime } from '../utils/format'
import { useDebounce } from '../hooks/useDebounce'
import { Card } from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import PageHeader from '../components/ui/PageHeader'
import Pagination from '../components/ui/Pagination'
import EmptyState from '../components/ui/EmptyState'
import Loader from '../components/ui/Loader'

export default function InvoiceHistoryPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [document, setDocument] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const [showFilters, setShowFilters] = useState(false)
  const pageSize = 10

  const debouncedSearch = useDebounce(search, 300)

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', debouncedSearch, document, dateFrom, dateTo, page],
    queryFn: () => {
      const params = new URLSearchParams()
      if (debouncedSearch) params.set('search', debouncedSearch)
      if (document) params.set('document', document)
      if (dateFrom) params.set('date_from', dateFrom)
      if (dateTo) params.set('date_to', dateTo)
      params.set('page', page.toString())
      params.set('page_size', pageSize.toString())
      return api.get(`/invoices/?${params}`).then((r) => r.data)
    },
  })

  const duplicateMutation = useMutation({
    mutationFn: (id: number) => api.post(`/invoices/${id}/duplicate`),
    onSuccess: (res) => { toast.success(`Factura ${res.data.invoice_number} duplicada`); queryClient.invalidateQueries({ queryKey: ['invoices'] }) },
    onError: () => toast.error('Error al duplicar factura'),
  })

  const resendMutation = useMutation({
    mutationFn: (id: number) => api.post(`/invoices/${id}/resend-email`),
    onSuccess: () => { toast.success('Correo reenviado'); queryClient.invalidateQueries({ queryKey: ['invoices'] }) },
    onError: (err: any) => toast.error(err.response?.data?.detail || 'Error al reenviar correo'),
  })

  const invoices: InvoiceListItem[] = data?.items || []
  const totalItems = data?.total || 0
  const totalPages = Math.ceil(totalItems / pageSize)

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader
        title="Historial de Facturas"
        description={`${totalItems} facturas en total`}
      />

      <Card padding="none" className="mb-5">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <Input
                placeholder="Buscar por número, cliente..."
                icon={<Search className="w-4 h-4" />}
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              />
            </div>
            <Button variant="secondary" size="md" icon={<Filter className="w-4 h-4" />} onClick={() => setShowFilters(!showFilters)}>
              <span className="hidden sm:inline">Filtros</span>
            </Button>
          </div>
          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3 pt-3 border-t border-gray-100">
              <Input placeholder="Documento cliente" value={document} onChange={(e) => { setDocument(e.target.value); setPage(1) }} />
              <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1) }} placeholder="Desde" />
              <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1) }} placeholder="Hasta" />
            </div>
          )}
        </div>

        {isLoading ? (
          <Loader text="Cargando facturas..." />
        ) : invoices.length === 0 ? (
          <EmptyState
            icon={<Receipt className="w-6 h-6" />}
            title="No se encontraron facturas"
            description="Las facturas creadas aparecerán aquí"
          />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">N° Factura</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Pago</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Correo</th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="px-4 py-3">
                        <Link to={`/facturas/${inv.id}`} className="font-semibold text-blue-600 hover:text-blue-700 hover:underline">
                          {inv.invoice_number}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{inv.client_name}</div>
                        <div className="text-xs text-gray-400">{inv.client_document}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatCurrency(inv.total)}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">{inv.payment_method}</Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{formatDateTime(inv.created_at)}</td>
                      <td className="px-4 py-3 text-center">
                        {inv.email_sent ? (
                          <Badge variant="success" dot>Enviado</Badge>
                        ) : (
                          <Badge variant="default">Pendiente</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-0.5">
                          <Link to={`/facturas/${inv.id}`} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Ver">
                            <Eye className="w-4 h-4" />
                          </Link>
                          <a href={`/api/invoices/${inv.id}/pdf`} className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="PDF">
                            <Download className="w-4 h-4" />
                          </a>
                          <button onClick={() => duplicateMutation.mutate(inv.id)} className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Duplicar">
                            <Copy className="w-4 h-4" />
                          </button>
                          <button onClick={() => resendMutation.mutate(inv.id)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Reenviar">
                            <Mail className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-gray-100">
              {invoices.map((inv) => (
                <div key={inv.id} className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between">
                    <div>
                      <Link to={`/facturas/${inv.id}`} className="font-semibold text-blue-600 text-sm hover:underline">{inv.invoice_number}</Link>
                      <p className="text-sm text-gray-700 font-medium">{inv.client_name}</p>
                      <p className="text-xs text-gray-400">{inv.client_document}</p>
                    </div>
                    <span className="text-base font-bold text-gray-900">{formatCurrency(inv.total)}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                    <Badge variant="outline">{inv.payment_method}</Badge>
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDateTime(inv.created_at)}</span>
                    {inv.email_sent && <Badge variant="success" dot>Enviado</Badge>}
                  </div>
                  <div className="flex items-center gap-1 pt-2 border-t border-gray-100">
                    <Link to={`/facturas/${inv.id}`} className="flex-1 flex items-center justify-center gap-1 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                      <Eye className="w-3.5 h-3.5" /> Ver
                    </Link>
                    <a href={`/api/invoices/${inv.id}/pdf`} className="flex-1 flex items-center justify-center gap-1 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                      <Download className="w-3.5 h-3.5" /> PDF
                    </a>
                    <button onClick={() => duplicateMutation.mutate(inv.id)} className="flex-1 flex items-center justify-center gap-1 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                      <Copy className="w-3.5 h-3.5" /> Duplicar
                    </button>
                    <button onClick={() => resendMutation.mutate(inv.id)} className="flex-1 flex items-center justify-center gap-1 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                      <Mail className="w-3.5 h-3.5" /> Correo
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <Pagination page={page} totalPages={totalPages} totalItems={totalItems} itemLabel="facturas" onPageChange={setPage} />
          </>
        )}
      </Card>
    </div>
  )
}
