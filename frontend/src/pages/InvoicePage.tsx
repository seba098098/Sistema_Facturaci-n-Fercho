import { useState, useEffect } from 'react'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  Plus, Trash2, Search, FileText, Loader2, User, ShoppingBag,
  CreditCard, Banknote, ArrowRightLeft, Smartphone, Wallet,
  MoreHorizontal, X, CheckCircle2, Package,
} from 'lucide-react'
import api from '../services/api'
import { Client, PAYMENT_METHODS, DOCUMENT_TYPES } from '../types'
import { formatCurrency } from '../utils/format'
import { useDebounce } from '../hooks/useDebounce'
import FormattedNumberInput from '../components/FormattedNumberInput'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Badge from '../components/ui/Badge'
import InvoiceConfirmModal from '../components/InvoiceConfirmModal'
import InvoiceSuccessModal from '../components/InvoiceSuccessModal'

interface InvoiceForm {
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

const PAYMENT_ICONS: Record<string, typeof Banknote> = {
  'EFECTIVO': Banknote,
  'TRANSFERENCIA': ArrowRightLeft,
  'TARJETA DÉBITO': CreditCard,
  'TARJETA CRÉDITO': CreditCard,
  'NEQUI': Smartphone,
  'DAVIPLATA': Wallet,
  'OTRO': MoreHorizontal,
}

const PAYMENT_LABELS: Record<string, string> = {
  'EFECTIVO': 'Efectivo',
  'TRANSFERENCIA': 'Transferencia',
  'TARJETA DÉBITO': 'T. Débito',
  'TARJETA CRÉDITO': 'T. Crédito',
  'NEQUI': 'Nequi',
  'DAVIPLATA': 'Daviplata',
  'OTRO': 'Otro',
}

export default function InvoicePage() {
  const queryClient = useQueryClient()
  const [clientSearch, setClientSearch] = useState('')
  const [showClientDropdown, setShowClientDropdown] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [pendingData, setPendingData] = useState<InvoiceForm | null>(null)
  const [createdInvoice, setCreatedInvoice] = useState<{ id: number; invoice_number: string; total: number } | null>(null)

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<InvoiceForm>({
    defaultValues: {
      client_document_type: 'CC',
      client_document: '',
      client_name: '',
      client_address: '',
      client_phone: '',
      client_email: '',
      discount: 0,
      payment_method: 'EFECTIVO',
      cash_amount: null,
      items: [{ quantity: 1, description: '', unit_price: 0 }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const items = watch('items')
  const paymentMethod = watch('payment_method')

  const subtotal = items.reduce((sum, item) => sum + (item.quantity || 0) * (item.unit_price || 0), 0)
  const discount = watch('discount') || 0
  const total = subtotal - discount

  const cashAmount = watch('cash_amount') || 0
  const change = cashAmount > total ? cashAmount - total : 0

  const debouncedSearch = useDebounce(clientSearch, 300)

  const { data: clients } = useQuery({
    queryKey: ['clients-search', debouncedSearch],
    queryFn: () => api.get(`/clients/?search=${encodeURIComponent(debouncedSearch)}`).then((r) => r.data.items || r.data),
    enabled: debouncedSearch.length >= 2,
  })

  useEffect(() => {
    if (clients && clients.length > 0 && debouncedSearch.length >= 2) {
      setShowClientDropdown(true)
    }
  }, [clients, debouncedSearch])

  const selectClient = (client: Client) => {
    setSelectedClient(client)
    setValue('client_document', client.document_number)
    setValue('client_document_type', client.document_type)
    setValue('client_name', client.name)
    setValue('client_address', client.address)
    setValue('client_phone', client.phone || '')
    setValue('client_email', client.email || '')
    setShowClientDropdown(false)
    setClientSearch('')
  }

  const clearClient = () => {
    setSelectedClient(null)
    setValue('client_document', '')
    setValue('client_document_type', 'CC')
    setValue('client_name', '')
    setValue('client_address', '')
    setValue('client_phone', '')
    setValue('client_email', '')
  }

  const handleDocumentBlur = async () => {
    const doc = watch('client_document')
    if (!doc || selectedClient) return
    try {
      const res = await api.get(`/clients/document/${doc}`)
      if (res.data && res.data.id) selectClient(res.data)
    } catch {}
  }

  const createMutation = useMutation({
    mutationFn: (data: InvoiceForm) => {
      return api.post('/invoices/', {
        client_document_type: data.client_document_type,
        client_document: data.client_document,
        client_name: data.client_name,
        client_address: data.client_address,
        client_phone: data.client_phone || null,
        client_email: data.client_email || null,
        discount: data.discount || 0,
        payment_method: data.payment_method,
        cash_amount: data.payment_method === 'EFECTIVO' ? data.cash_amount : null,
        items: data.items.map((item) => ({
          quantity: item.quantity,
          description: item.description,
          unit_price: item.unit_price,
        })),
      })
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      setPendingData(null)
      setCreatedInvoice({
        id: response.data.id,
        invoice_number: response.data.invoice_number,
        total: response.data.total,
      })
    },
    onError: (error: any) => {
      setPendingData(null)
      toast.error(error.response?.data?.detail || 'Error al crear la factura')
    },
  })

  const onSubmit = (data: InvoiceForm) => {
    if (!data.client_document) { toast.error('Ingrese el documento del cliente'); return }
    if (data.items.length === 0) { toast.error('Agregue al menos un producto'); return }
    for (const item of data.items) {
      if (!item.description || item.quantity <= 0 || item.unit_price <= 0) {
        toast.error('Complete todos los campos de los productos'); return
      }
    }
    setPendingData(data)
  }

  const handleConfirmGenerate = () => {
    if (!pendingData) return
    createMutation.mutate(pendingData)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-sm">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Nueva Factura</h1>
            <p className="text-sm text-gray-500">Registra una venta y genera la factura para tu cliente</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6">
        {/* Left Panel - Main Content */}
        <div className="space-y-5 min-w-0">

          {/* Client Section */}
          <section className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-25">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
                    <User className="w-4 h-4 text-violet-600" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-gray-900">Cliente</h2>
                    <p className="text-xs text-gray-500">Datos del cliente receptores</p>
                  </div>
                </div>
                {selectedClient && (
                  <button type="button" onClick={clearClient}
                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-500 transition-colors px-2 py-1 rounded-lg hover:bg-red-50">
                    <X className="w-3.5 h-3.5" />
                    Cambiar
                  </button>
                )}
              </div>
            </div>

            <div className="p-5 space-y-4">
              {/* Selected Client Card */}
              {selectedClient && (
                <div className="flex items-center gap-3 p-3.5 rounded-xl bg-gradient-to-r from-violet-50/80 to-blue-50/60 border border-violet-200/60">
                  <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-violet-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{selectedClient.name}</p>
                    <p className="text-xs text-gray-500">{selectedClient.document_type}: {selectedClient.document_number}</p>
                  </div>
                  <Badge variant="success" dot>Registrado</Badge>
                </div>
              )}

              {/* Document Type + Number Row */}
              <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Tipo Doc.</label>
                  <select {...register('client_document_type')}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-colors appearance-none cursor-pointer">
                    {DOCUMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="relative">
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">N° Documento</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input
                      value={clientSearch}
                      placeholder="Buscar cliente existente..."
                      onChange={(e) => { setClientSearch(e.target.value); setSelectedClient(null); setValue('client_document', e.target.value) }}
                      onBlur={handleDocumentBlur}
                      className="w-full rounded-xl border border-gray-200 bg-white pl-10 pr-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-colors"
                    />
                  </div>
                  {showClientDropdown && clients && clients.length > 0 && (
                    <div className="absolute z-30 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-56 overflow-auto">
                      {clients.map((client: Client) => (
                        <button key={client.id} type="button"
                          className="w-full text-left px-4 py-3 hover:bg-violet-50/50 border-b border-gray-50 last:border-0 transition-colors flex items-center gap-3"
                          onMouseDown={() => selectClient(client)}>
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                            <User className="w-4 h-4 text-gray-500" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{client.name}</p>
                            <p className="text-xs text-gray-400">{client.document_type}: {client.document_number}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Client Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Nombre *</label>
                  <input {...register('client_name', { required: true })}
                    placeholder="Nombre del cliente"
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Dirección</label>
                  <input {...register('client_address')}
                    placeholder="Dirección"
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Teléfono</label>
                  <input {...register('client_phone')}
                    placeholder="Opcional"
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Correo</label>
                  <input {...register('client_email')} type="email"
                    placeholder="correo@ejemplo.com"
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-colors" />
                </div>
              </div>
            </div>
          </section>

          {/* Products Section */}
          <section className="bg-white rounded-2xl border border-gray-200 shadow-xs">
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-25">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Package className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-gray-900">Productos / Servicios</h2>
                    <p className="text-xs text-gray-500">{fields.length} {fields.length === 1 ? 'línea' : 'líneas'} en la factura</p>
                  </div>
                </div>
                <Button type="button" variant="primary" size="sm" icon={<Plus className="w-3.5 h-3.5" />}
                  onClick={() => append({ quantity: 1, description: '', unit_price: 0 })}>
                  Agregar línea
                </Button>
              </div>
            </div>

            <div className="p-5">
              {/* Desktop Table Header */}
              <div className="hidden lg:grid grid-cols-[60px_1fr_120px_140px_120px_40px] gap-3 text-xs font-semibold text-gray-400 uppercase tracking-wider px-1 mb-2">
                <div>#</div>
                <div>Descripción</div>
                <div className="text-center">Cantidad</div>
                <div className="text-right">V. Unitario</div>
                <div className="text-right">Total</div>
                <div></div>
              </div>

              <div className="space-y-2 lg:space-y-0">
                {fields.map((field, index) => {
                  const itemTotal = (items[index]?.quantity || 0) * (items[index]?.unit_price || 0)
                  const hasValues = items[index]?.description || items[index]?.unit_price > 0
                  return (
                    <div key={field.id}
                      className={`group relative border rounded-xl lg:rounded-lg p-3.5 lg:p-0 lg:border-0 lg:border-b lg:last:border-b-0
                        ${hasValues ? 'border-blue-100 bg-blue-50/20 lg:bg-transparent lg:border-blue-50' : 'border-gray-200 hover:border-gray-300 lg:border-gray-100 lg:hover:bg-gray-50/50'}`}>

                      {/* Mobile: row header */}
                      <div className="flex items-center justify-between mb-2 lg:hidden">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-gray-100 text-xs font-bold text-gray-500">
                          {index + 1}
                        </span>
                        {fields.length > 1 && (
                          <button type="button" onClick={() => remove(index)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/* Single set of inputs with responsive layout */}
                      <div className="lg:grid lg:grid-cols-[60px_1fr_120px_140px_120px_40px] lg:gap-3 lg:items-center lg:px-1 lg:py-1.5">
                        {/* Row number (desktop) */}
                        <div className="hidden lg:flex items-center">
                          <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold
                            ${hasValues ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                            {index + 1}
                          </span>
                        </div>

                        {/* Description */}
                        <div className="mb-2 lg:mb-0">
                          <label className="text-xs text-gray-500 mb-1 block lg:hidden">Descripción *</label>
                          <Controller control={control} name={`items.${index}.description`} rules={{ required: true }}
                            render={({ field: f }) => (
                              <input {...f} value={f.value || ''} type="text" placeholder="Descripción del producto o servicio"
                                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 hover:border-gray-300 focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                            )} />
                        </div>

                        {/* Quantity */}
                        <div className="grid grid-cols-2 gap-2 mb-2 lg:mb-0 lg:contents">
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block lg:hidden">Cantidad</label>
                            <Controller control={control} name={`items.${index}.quantity`} rules={{ min: 1 }}
                              render={({ field: f }) => (
                                <input type="number" min="1" {...f} value={f.value ?? 1}
                                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-center text-gray-900 hover:border-gray-300 focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                              )} />
                          </div>

                          {/* Unit price */}
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block lg:hidden">V. Unitario</label>
                            <Controller control={control} name={`items.${index}.unit_price`} rules={{ min: 0 }}
                              render={({ field: f }) => (
                                <FormattedNumberInput value={f.value} onChange={f.onChange}
                                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-right text-gray-900 placeholder:text-gray-400 hover:border-gray-300 focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" placeholder="0" />
                              )} />
                          </div>
                        </div>

                        {/* Delete (desktop) */}
                        <div className="hidden lg:flex items-center justify-center">
                          <span className="text-sm font-semibold text-gray-900">
                            {formatCurrency(itemTotal)}
                          </span>
                        </div>
                        <div className="hidden lg:flex items-center justify-center">
                          {fields.length > 1 && (
                            <button type="button" onClick={() => remove(index)}
                              className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Mobile subtotal */}
                      <div className="flex justify-between items-center pt-2 border-t border-gray-100 lg:hidden">
                        <span className="text-xs text-gray-500">Subtotal línea</span>
                        <span className="text-sm font-bold text-gray-900">{formatCurrency(itemTotal)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Add Line Button */}
              <button type="button"
                onClick={() => append({ quantity: 1, description: '', unit_price: 0 })}
                className="mt-4 w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm font-medium text-gray-400 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50/30 transition-all flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" />
                Agregar otra línea
              </button>
            </div>
          </section>

          {/* Mobile Payment + Summary (shown below on mobile) */}
          <div className="xl:hidden space-y-5">
            <PaymentSection control={control} register={register} paymentMethod={paymentMethod} total={total} change={change} />
            <SummarySection
              subtotal={subtotal} discount={discount} total={total}
              control={control} cashAmount={cashAmount} change={change}
              paymentMethod={paymentMethod} isPending={createMutation.isPending}
            />
          </div>
        </div>

        {/* Right Panel - Desktop Sticky */}
        <div className="hidden xl:block space-y-5">
          <div className="sticky top-6 space-y-5">
            <PaymentSection control={control} register={register} paymentMethod={paymentMethod} total={total} change={change} />
            <SummarySection
              subtotal={subtotal} discount={discount} total={total}
              control={control} cashAmount={cashAmount} change={change}
              paymentMethod={paymentMethod} isPending={createMutation.isPending}
            />
          </div>
        </div>
      </div>

      {/* Confirm Modal */}
      <InvoiceConfirmModal
        open={pendingData !== null}
        onClose={() => setPendingData(null)}
        onConfirm={handleConfirmGenerate}
        data={pendingData}
        subtotal={subtotal}
        total={total}
        change={change}
        loading={createMutation.isPending}
      />

      {/* Success Modal */}
      <InvoiceSuccessModal
        open={createdInvoice !== null}
        onClose={() => {
          setCreatedInvoice(null)
          reset()
          setSelectedClient(null)
          toast.success(`Factura generada exitosamente`)
        }}
        invoiceId={createdInvoice?.id ?? null}
        invoiceNumber={createdInvoice?.invoice_number ?? ''}
        total={createdInvoice?.total ?? 0}
      />
    </form>
  )
}

/* ─────── Payment Section ─────── */

function PaymentSection({ control, register, paymentMethod, total, change }: {
  control: any
  register: any
  paymentMethod: string
  total: number
  change: number
}) {
  return (
    <section className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 bg-gray-25">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
            <CreditCard className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Método de Pago</h2>
            <p className="text-xs text-gray-500">Selecciona cómo paga el cliente</p>
          </div>
        </div>
      </div>

      <div className="p-5">
        <div className="grid grid-cols-2 gap-2">
          {PAYMENT_METHODS.map((method) => {
            const Icon = PAYMENT_ICONS[method] || MoreHorizontal
            const isActive = paymentMethod === method
            return (
              <label key={method}
                className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 cursor-pointer transition-all duration-150
                  ${isActive
                    ? 'border-blue-500 bg-blue-50 shadow-sm shadow-blue-500/10'
                    : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'}`}>
                <input type="radio" value={method} {...register('payment_method')} className="sr-only" />
                <Icon className={`w-5 h-5 transition-colors ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                <span className={`text-xs font-semibold transition-colors ${isActive ? 'text-blue-700' : 'text-gray-600'}`}>
                  {PAYMENT_LABELS[method] || method}
                </span>
                {isActive && (
                  <div className="absolute top-1.5 right-1.5">
                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  </div>
                )}
              </label>
            )
          })}
        </div>

        {paymentMethod === 'EFECTIVO' && (
          <div className="mt-4 p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Efectivo recibido</label>
              <Controller control={control} name="cash_amount"
                render={({ field }) => (
                  <FormattedNumberInput value={field.value} onChange={field.onChange}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-right font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                    placeholder="0" />
                )} />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-white border border-gray-200">
              <span className="text-sm font-medium text-gray-600">Cambio</span>
              <span className={`text-lg font-bold ${change > 0 ? 'text-emerald-600' : 'text-gray-400'}`}>
                {formatCurrency(change)}
              </span>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

/* ─────── Summary Section ─────── */

function SummarySection({ subtotal, discount, total, control, cashAmount, change, paymentMethod, isPending }: {
  subtotal: number
  discount: number
  total: number
  control: any
  cashAmount: number
  change: number
  paymentMethod: string
  isPending: boolean
}) {
  return (
    <section className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 bg-gray-25">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
            <FileText className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Resumen</h2>
            <p className="text-xs text-gray-500">Totales de la factura</p>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Subtotal */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Subtotal</span>
          <span className="text-sm font-semibold text-gray-900">{formatCurrency(subtotal)}</span>
        </div>

        {/* Discount */}
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Descuento</label>
          <Controller control={control} name="discount"
            render={({ field }) => (
              <FormattedNumberInput value={field.value} onChange={field.onChange}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-right font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                placeholder="0" />
            )} />
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200" />

        {/* Total */}
        <div className="flex justify-between items-baseline pt-1">
          <span className="text-base font-bold text-gray-900">TOTAL</span>
          <span className="text-2xl font-extrabold text-blue-600 tracking-tight">{formatCurrency(total)}</span>
        </div>

        {/* Cash change indicator (visible on mobile too) */}
        {paymentMethod === 'EFECTIVO' && cashAmount > 0 && (
          <div className={`flex justify-between items-center p-3 rounded-xl ${change > 0 ? 'bg-emerald-50 border border-emerald-200' : 'bg-gray-50 border border-gray-200'}`}>
            <span className="text-xs font-medium text-gray-600">Cambio</span>
            <span className={`text-sm font-bold ${change > 0 ? 'text-emerald-600' : 'text-gray-400'}`}>
              {formatCurrency(change)}
            </span>
          </div>
        )}

        {/* Submit Button */}
        <button type="submit" disabled={isPending}
          className="w-full mt-2 py-3.5 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold text-sm
            hover:from-blue-700 hover:to-blue-800 active:from-blue-800 active:to-blue-900
            shadow-lg shadow-blue-600/25 hover:shadow-xl hover:shadow-blue-600/30
            disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none
            transition-all duration-200 flex items-center justify-center gap-2.5">
          {isPending ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Generando factura...
            </>
          ) : (
            <>
              <FileText className="w-5 h-5" />
              Generar Factura
            </>
          )}
        </button>
      </div>
    </section>
  )
}
