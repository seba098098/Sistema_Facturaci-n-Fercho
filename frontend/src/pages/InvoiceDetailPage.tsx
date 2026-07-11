import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { ArrowLeft, Download, Mail, Copy, Printer, CheckCircle, XCircle, User, CreditCard, Package } from 'lucide-react'
import api from '../services/api'
import { Invoice } from '../types'
import { formatCurrency, formatDateTime } from '../utils/format'
import { Card, CardTitle } from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import PageHeader from '../components/ui/PageHeader'
import Loader from '../components/ui/Loader'

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
    onSuccess: (res) => { toast.success(`Factura ${res.data.invoice_number} duplicada`); queryClient.invalidateQueries({ queryKey: ['invoices'] }) },
    onError: () => toast.error('Error al duplicar factura'),
  })

  const resendMutation = useMutation({
    mutationFn: (invoiceId: number) => api.post(`/invoices/${invoiceId}/resend-email`),
    onSuccess: () => { toast.success('Correo reenviado exitosamente'); queryClient.invalidateQueries({ queryKey: ['invoice', id] }) },
    onError: (err: any) => toast.error(err.response?.data?.detail || 'Error al reenviar'),
  })

  if (isLoading) return <Loader text="Cargando factura..." fullPage />
  if (!invoice) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500 mb-4">Factura no encontrada</p>
        <Link to="/facturas"><Button variant="primary">Volver al historial</Button></Link>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/facturas" className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{invoice.invoice_number}</h1>
          <p className="text-sm text-gray-500">{formatDateTime(invoice.created_at)}</p>
        </div>
        <div className="ml-auto">
          {invoice.email_sent ? (
            <Badge variant="success" dot>Correo enviado</Badge>
          ) : invoice.email_error ? (
            <Badge variant="danger" dot>Error correo</Badge>
          ) : (
            <Badge variant="default">Sin correo</Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <User className="w-4 h-4 text-blue-600" />
              </div>
              <CardTitle>Cliente</CardTitle>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-500">Nombre:</span> <span className="font-medium text-gray-900">{invoice.client_name}</span></div>
              <div><span className="text-gray-500">Documento:</span> <span className="font-medium text-gray-900">{invoice.client_document}</span></div>
              <div><span className="text-gray-500">Dirección:</span> <span className="font-medium text-gray-900">{invoice.client_address}</span></div>
              <div><span className="text-gray-500">Correo:</span> <span className="font-medium text-gray-900">{invoice.client_email || '—'}</span></div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <Package className="w-4 h-4 text-blue-600" />
              </div>
              <CardTitle>Productos</CardTitle>
            </div>

            {/* Desktop */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Cant.</th>
                    <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
                    <th className="text-right py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">V. Unitario</th>
                    <th className="text-right py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {invoice.items.map((item: any) => (
                    <tr key={item.id} className="hover:bg-gray-50/50">
                      <td className="py-2.5 text-gray-900">{item.quantity}</td>
                      <td className="py-2.5 text-gray-900 font-medium">{item.description}</td>
                      <td className="py-2.5 text-right text-gray-600">{formatCurrency(item.unit_price)}</td>
                      <td className="py-2.5 text-right font-semibold text-gray-900">{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="sm:hidden space-y-2">
              {invoice.items.map((item: any) => (
                <div key={item.id} className="bg-gray-50 rounded-xl p-3 flex justify-between items-start">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 text-sm truncate">{item.description}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{item.quantity} x {formatCurrency(item.unit_price)}</p>
                  </div>
                  <span className="font-semibold text-gray-900 text-sm ml-3">{formatCurrency(item.total)}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-100 mt-4 pt-4 space-y-2">
              <div className="flex justify-between text-sm"><span className="text-gray-500">Subtotal</span><span className="font-medium">{formatCurrency(invoice.subtotal)}</span></div>
              {invoice.discount > 0 && (
                <div className="flex justify-between text-sm"><span className="text-gray-500">Descuento</span><span className="text-red-500">-{formatCurrency(invoice.discount)}</span></div>
              )}
              <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-3 mt-3">
                <span className="text-gray-900">TOTAL</span>
                <span className="text-blue-600">{formatCurrency(invoice.total)}</span>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-blue-600" />
              </div>
              <CardTitle>Pago</CardTitle>
            </div>
            <div className="space-y-2.5 text-sm">
              <div><span className="text-gray-500">Método:</span> <span className="font-medium text-gray-900">{invoice.payment_method}</span></div>
              {invoice.cash_amount && (
                <>
                  <div><span className="text-gray-500">Efectivo:</span> <span className="font-medium text-gray-900">{formatCurrency(invoice.cash_amount)}</span></div>
                  <div><span className="text-gray-500">Cambio:</span> <span className="font-medium text-gray-900">{formatCurrency(invoice.change_amount || 0)}</span></div>
                </>
              )}
              <div><span className="text-gray-500">Fecha:</span> <span className="font-medium text-gray-900">{formatDateTime(invoice.created_at)}</span></div>
            </div>
          </Card>

          <Card>
            <CardTitle className="mb-3">Acciones</CardTitle>
            <div className="space-y-2">
              <a href={`/api/invoices/${invoice.id}/pdf`} className="btn-primary w-full flex items-center justify-center gap-2 text-sm font-medium bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors">
                <Download className="w-4 h-4" /> Descargar PDF
              </a>
              <a href={`/api/invoices/${invoice.id}/png`} className="w-full flex items-center justify-center gap-2 text-sm font-medium bg-white text-gray-700 border border-gray-200 px-4 py-2.5 rounded-lg hover:bg-gray-50 transition-colors">
                <Printer className="w-4 h-4" /> Descargar Ticket
              </a>
              <button onClick={() => duplicateMutation.mutate(invoice.id)} className="w-full flex items-center justify-center gap-2 text-sm font-medium bg-white text-gray-700 border border-gray-200 px-4 py-2.5 rounded-lg hover:bg-gray-50 transition-colors">
                <Copy className="w-4 h-4" /> Duplicar Factura
              </button>
              <button onClick={() => resendMutation.mutate(invoice.id)} className="w-full flex items-center justify-center gap-2 text-sm font-medium bg-white text-gray-700 border border-gray-200 px-4 py-2.5 rounded-lg hover:bg-gray-50 transition-colors">
                <Mail className="w-4 h-4" /> Reenviar Correo
              </button>
            </div>
          </Card>

          {invoice.email_error && (
            <Card>
              <div className="flex items-start gap-2">
                <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-red-600">Error de envío</p>
                  <p className="text-xs text-gray-500 mt-1">{invoice.email_error}</p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
