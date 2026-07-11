import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  Search,
  Download,
  Mail,
  Copy,
  Eye,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import api from '../services/api'
import { InvoiceListItem, InvoiceListResponse } from '../types'
import { formatCurrency, formatDateTime } from '../utils/format'
import { useDebounce } from '../hooks/useDebounce'

export default function InvoiceHistoryPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [document, setDocument] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 15

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
    onSuccess: (res) => {
      toast.success(`Factura ${res.data.invoice_number} duplicada`)
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
    },
    onError: () => toast.error('Error al duplicar factura'),
  })

  const resendMutation = useMutation({
    mutationFn: (id: number) => api.post(`/invoices/${id}/resend-email`),
    onSuccess: () => {
      toast.success('Correo reenviado')
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.detail || 'Error al reenviar correo'),
  })

  const invoices: InvoiceListItem[] = data?.items || []
  const totalItems = data?.total || 0
  const totalPages = Math.ceil(totalItems / pageSize)

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative md:col-span-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="input-field pl-10"
              placeholder="Buscar..."
            />
          </div>
          <input
            value={document}
            onChange={(e) => {
              setDocument(e.target.value)
              setPage(1)
            }}
            className="input-field"
            placeholder="Documento cliente"
          />
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value)
              setPage(1)
            }}
            className="input-field"
            placeholder="Desde"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value)
              setPage(1)
            }}
            className="input-field"
            placeholder="Hasta"
          />
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-600">N° Factura</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Cliente</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Documento</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Total</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Pago</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Fecha</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Correo</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-gray-500">
                    Cargando...
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-gray-500">
                    No se encontraron facturas
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {inv.invoice_number}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{inv.client_name}</td>
                    <td className="px-4 py-3 text-gray-500">{inv.client_document}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      {formatCurrency(inv.total)}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{inv.payment_method}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {formatDateTime(inv.created_at)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {inv.email_sent ? (
                        <span className="text-emerald-600 text-xs font-medium">Enviado</span>
                      ) : (
                        <span className="text-gray-400 text-xs">No</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <Link
                          to={`/facturas/${inv.id}`}
                          className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg"
                          title="Ver detalle"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <a
                          href={`/api/invoices/${inv.id}/pdf`}
                          className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg"
                          title="Descargar PDF"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                        <button
                          onClick={() => duplicateMutation.mutate(inv.id)}
                          className="p-1.5 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg"
                          title="Duplicar"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => resendMutation.mutate(inv.id)}
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="Reenviar correo"
                        >
                          <Mail className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <span className="text-sm text-gray-500">
              {totalItems} facturas encontradas
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-700">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
