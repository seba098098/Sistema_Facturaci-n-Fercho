import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  ArrowLeft,
  Download,
  Mail,
  Copy,
  Printer,
  CheckCircle,
  XCircle,
} from 'lucide-react'
import api from '../services/api'
import { Invoice } from '../types'
import { formatCurrency, formatDateTime } from '../utils/format'

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()

  const { data: invoice, isLoading } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => api.get(`/invoices/${id}`).then((r) => r.data),
    enabled: !!id,
  })

  const duplicateMutation = useMutation({
    mutationFn: (invoiceId: number) => api.post(`/invoices/${invoiceId}/duplicate`),
    onSuccess: (res) => {
      toast.success(`Factura ${res.data.invoice_number} duplicada`)
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
    },
    onError: () => toast.error('Error al duplicar factura'),
  })

  const resendMutation = useMutation({
    mutationFn: (invoiceId: number) => api.post(`/invoices/${invoiceId}/resend-email`),
    onSuccess: () => {
      toast.success('Correo reenviado exitosamente')
      queryClient.invalidateQueries({ queryKey: ['invoice', id] })
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.detail || 'Error al reenviar'),
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Cargando factura...</div>
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Factura no encontrada</p>
        <Link to="/facturas" className="btn-primary mt-4 inline-block">
          Volver al historial
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
      <div className="flex items-center gap-3 sm:gap-4">
        <Link
          to="/facturas"
          className="text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h2 className="text-lg sm:text-xl font-bold text-gray-900">
          {invoice.invoice_number}
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-3">Cliente</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-sm">
              <div>
                <span className="text-gray-500">Nombre:</span>{' '}
                <span className="font-medium">{invoice.client_name}</span>
              </div>
              <div>
                <span className="text-gray-500">Documento:</span>{' '}
                <span className="font-medium">{invoice.client_document}</span>
              </div>
              <div>
                <span className="text-gray-500">Dirección:</span>{' '}
                <span className="font-medium">{invoice.client_address}</span>
              </div>
              <div>
                <span className="text-gray-500">Correo:</span>{' '}
                <span className="font-medium">{invoice.client_email || '—'}</span>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-3">Productos</h3>

            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 text-gray-500">Cant.</th>
                    <th className="text-left py-2 text-gray-500">Descripción</th>
                    <th className="text-right py-2 text-gray-500">V. Unitario</th>
                    <th className="text-right py-2 text-gray-500">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {invoice.items.map((item: any) => (
                    <tr key={item.id}>
                      <td className="py-2">{item.quantity}</td>
                      <td className="py-2">{item.description}</td>
                      <td className="py-2 text-right">{formatCurrency(item.unit_price)}</td>
                      <td className="py-2 text-right font-medium">{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="sm:hidden space-y-2">
              {invoice.items.map((item: any) => (
                <div key={item.id} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">{item.description}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {item.quantity} x {formatCurrency(item.unit_price)}
                      </p>
                    </div>
                    <span className="font-semibold text-gray-900 text-sm ml-2">
                      {formatCurrency(item.total)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-200 mt-4 pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span>{formatCurrency(invoice.subtotal)}</span>
              </div>
              {invoice.discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Descuento</span>
                  <span>-{formatCurrency(invoice.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2">
                <span>TOTAL</span>
                <span className="text-primary-600">{formatCurrency(invoice.total)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4 sm:space-y-6">
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-3">Pago</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-500">Método:</span>{' '}
                <span className="font-medium">{invoice.payment_method}</span>
              </div>
              {invoice.cash_amount && (
                <>
                  <div>
                    <span className="text-gray-500">Efectivo:</span>{' '}
                    <span className="font-medium">{formatCurrency(invoice.cash_amount)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Cambio:</span>{' '}
                    <span className="font-medium">{formatCurrency(invoice.change_amount || 0)}</span>
                  </div>
                </>
              )}
              <div>
                <span className="text-gray-500">Fecha:</span>{' '}
                <span className="font-medium">{formatDateTime(invoice.created_at)}</span>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-3">Estado de Correo</h3>
            {invoice.email_sent ? (
              <div className="flex items-center gap-2 text-emerald-600">
                <CheckCircle className="w-5 h-5" />
                <span className="text-sm font-medium">Enviado</span>
              </div>
            ) : invoice.email_error ? (
              <div className="flex items-center gap-2 text-red-500">
                <XCircle className="w-5 h-5" />
                <span className="text-sm">{invoice.email_error}</span>
              </div>
            ) : (
              <span className="text-sm text-gray-400">No enviado</span>
            )}
          </div>

          <div className="card space-y-2 sm:space-y-3">
            <h3 className="font-semibold text-gray-900 mb-2">Acciones</h3>
            <div className="grid grid-cols-2 gap-2">
              <a
                href={`/api/invoices/${invoice.id}/pdf`}
                className="btn-primary flex items-center justify-center gap-2 text-sm"
              >
                <Download className="w-4 h-4" />
                PDF
              </a>
              <a
                href={`/api/invoices/${invoice.id}/png`}
                className="btn-secondary flex items-center justify-center gap-2 text-sm"
              >
                <Printer className="w-4 h-4" />
                Ticket
              </a>
              <button
                onClick={() => duplicateMutation.mutate(invoice.id)}
                className="btn-secondary flex items-center justify-center gap-2 text-sm"
              >
                <Copy className="w-4 h-4" />
                Duplicar
              </button>
              <button
                onClick={() => resendMutation.mutate(invoice.id)}
                className="btn-secondary flex items-center justify-center gap-2 text-sm"
              >
                <Mail className="w-4 h-4" />
                Correo
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
