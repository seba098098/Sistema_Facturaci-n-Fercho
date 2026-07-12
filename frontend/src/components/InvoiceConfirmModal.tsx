import { FileText, User, CreditCard, Banknote, ArrowRightLeft, Smartphone, Wallet, MoreHorizontal, Hash, Package } from 'lucide-react'
import Modal from './ui/Modal'
import Button from './ui/Button'
import { formatCurrency } from '../utils/format'

const PAYMENT_LABELS: Record<string, string> = {
  'EFECTIVO': 'Efectivo',
  'TRANSFERENCIA': 'Transferencia',
  'TARJETA DÉBITO': 'T. Débito',
  'TARJETA CRÉDITO': 'T. Crédito',
  'NEQUI': 'Nequi',
  'DAVIPLATA': 'Daviplata',
  'OTRO': 'Otro',
}

const PAYMENT_ICONS: Record<string, typeof Banknote> = {
  'EFECTIVO': Banknote,
  'TRANSFERENCIA': ArrowRightLeft,
  'TARJETA DÉBITO': CreditCard,
  'TARJETA CRÉDITO': CreditCard,
  'NEQUI': Smartphone,
  'DAVIPLATA': Wallet,
  'OTRO': MoreHorizontal,
}

interface InvoiceConfirmData {
  client_document_type: string
  client_document: string
  client_name: string
  client_address: string
  client_phone: string
  client_email: string
  discount: number
  payment_method: string
  cash_amount: number | null
  items: { quantity: number; description: string; unit_price: number }[]
}

interface InvoiceConfirmModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  data: InvoiceConfirmData | null
  subtotal: number
  total: number
  change: number
  loading?: boolean
}

export default function InvoiceConfirmModal({ open, onClose, onConfirm, data, subtotal, total, change, loading }: InvoiceConfirmModalProps) {
  if (!data) return null

  const PaymentIcon = PAYMENT_ICONS[data.payment_method] || MoreHorizontal

  return (
    <Modal open={open} onClose={onClose} size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading} className="w-full sm:w-auto">Cancelar</Button>
          <Button variant="primary" onClick={onConfirm} loading={loading}
            icon={<FileText className="w-4 h-4" />} className="w-full sm:w-auto">
            Confirmar y generar
          </Button>
        </>
      }>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3 p-3.5 sm:p-4 rounded-xl bg-blue-50 border border-blue-100">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-gray-900">Revisa los datos antes de generar</h3>
            <p className="text-xs text-gray-500">Verifica que la información sea correcta</p>
          </div>
        </div>

        {/* Client */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            <User className="w-3.5 h-3.5" />
            Cliente
          </div>
          <div className="p-3.5 rounded-xl border border-gray-100 bg-gray-50/50 space-y-1.5">
            <p className="text-sm font-semibold text-gray-900">{data.client_name || 'Sin nombre'}</p>
            <p className="text-xs text-gray-500">{data.client_document_type}: {data.client_document}</p>
            {data.client_address && <p className="text-xs text-gray-500">{data.client_address}</p>}
            {data.client_phone && <p className="text-xs text-gray-500">Tel: {data.client_phone}</p>}
            {data.client_email && <p className="text-xs text-gray-500">{data.client_email}</p>}
          </div>
        </div>

        {/* Items */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            <Package className="w-3.5 h-3.5" />
            Productos ({data.items.length})
          </div>

          {/* Desktop Table (sm+) */}
          <div className="hidden sm:block border border-gray-100 rounded-xl overflow-x-auto">
            <table className="w-full text-sm table-fixed">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 w-10">#</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Descripción</th>
                  <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500 w-16">Cant.</th>
                  <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500 w-24">V. Unit.</th>
                  <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500 w-24">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item, i) => (
                  <tr key={i} className="border-b border-gray-50 last:border-0">
                    <td className="px-3 py-2.5 text-xs text-gray-400 align-top">{i + 1}</td>
                    <td className="px-3 py-2.5 text-sm text-gray-900 font-medium whitespace-normal break-words align-top">{item.description}</td>
                    <td className="px-3 py-2.5 text-sm text-gray-600 text-center align-top">{item.quantity}</td>
                    <td className="px-3 py-2.5 text-sm text-gray-600 text-right whitespace-nowrap align-top">{formatCurrency(item.unit_price)}</td>
                    <td className="px-3 py-2.5 text-sm text-gray-900 font-semibold text-right whitespace-nowrap align-top">
                      {formatCurrency(item.quantity * item.unit_price)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards (below sm) */}
          <div className="sm:hidden space-y-2">
            {data.items.map((item, i) => (
              <div key={i} className="p-3 rounded-xl border border-gray-100 bg-gray-50/50 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-gray-200 text-xs font-bold text-gray-500 flex-shrink-0">
                      {i + 1}
                    </span>
                    <p className="text-sm font-medium text-gray-900 break-words">{item.description}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs pl-7">
                  <span className="text-gray-500">
                    {item.quantity} x {formatCurrency(item.unit_price)}
                  </span>
                  <span className="font-bold text-gray-900">{formatCurrency(item.quantity * item.unit_price)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Totals + Payment */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {/* Totals */}
          <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span className="font-medium text-gray-900">{formatCurrency(subtotal)}</span>
            </div>
            {data.discount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Descuento</span>
                <span className="font-medium text-red-600">-{formatCurrency(data.discount)}</span>
              </div>
            )}
            <div className="border-t border-gray-200 pt-2 flex justify-between">
              <span className="text-sm font-bold text-gray-900">TOTAL</span>
              <span className="text-lg font-extrabold text-blue-600">{formatCurrency(total)}</span>
            </div>
          </div>

          {/* Payment */}
          <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              <PaymentIcon className="w-3.5 h-3.5" />
              Pago
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-900">
                {PAYMENT_LABELS[data.payment_method] || data.payment_method}
              </span>
            </div>
            {data.payment_method === 'EFECTIVO' && data.cash_amount != null && data.cash_amount > 0 && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Recibido</span>
                  <span className="font-medium text-gray-900">{formatCurrency(data.cash_amount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Cambio</span>
                  <span className={`font-bold ${change > 0 ? 'text-emerald-600' : 'text-gray-400'}`}>
                    {formatCurrency(change)}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}
