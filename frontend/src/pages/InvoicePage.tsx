import { useState, useEffect } from 'react'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Plus, Trash2, Search, FileText, Loader2, User, ShoppingBag } from 'lucide-react'
import api from '../services/api'
import { Client, PAYMENT_METHODS, DOCUMENT_TYPES } from '../types'
import { formatCurrency } from '../utils/format'
import { useDebounce } from '../hooks/useDebounce'
import FormattedNumberInput from '../components/FormattedNumberInput'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import { Card, CardTitle } from '../components/ui/Card'
import PageHeader from '../components/ui/PageHeader'

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

export default function InvoicePage() {
  const queryClient = useQueryClient()
  const [clientSearch, setClientSearch] = useState('')
  const [showClientDropdown, setShowClientDropdown] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)

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
      toast.success(`Factura ${response.data.invoice_number} generada`)
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      reset()
      setSelectedClient(null)
    },
    onError: (error: any) => {
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
    createMutation.mutate(data)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-6xl mx-auto space-y-5">
      <PageHeader
        title="Nueva Factura"
        description="Crea una factura para tu cliente"
      />

      <Card>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
            <User className="w-4 h-4 text-blue-600" />
          </div>
          <CardTitle>Datos del Cliente</CardTitle>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Tipo doc.</label>
            <select {...register('client_document_type')} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
              {DOCUMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="relative">
            <Input
              label="N° Documento"
              {...register('client_document')}
              placeholder="Buscar o registrar..."
              icon={<Search className="w-4 h-4" />}
              onChange={(e) => { setClientSearch(e.target.value); setSelectedClient(null); setValue('client_document', e.target.value) }}
              onBlur={handleDocumentBlur}
            />
            {showClientDropdown && clients && clients.length > 0 && (
              <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-auto">
                {clients.map((client: Client) => (
                  <button key={client.id} type="button" className="w-full text-left px-4 py-2.5 hover:bg-blue-50 border-b border-gray-50 last:border-0 transition-colors" onMouseDown={() => selectClient(client)}>
                    <span className="font-medium text-sm">{client.name}</span>
                    <span className="text-xs text-gray-400 ml-2">{client.document_type}: {client.document_number}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <Input label="Nombre" {...register('client_name', { required: true })} placeholder="Nombre del cliente" />
          <Input label="Dirección" {...register('client_address')} placeholder="Dirección" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Teléfono" {...register('client_phone')} placeholder="Opcional" />
          <Input label="Correo" {...register('client_email')} type="email" placeholder="correo@ejemplo.com" />
        </div>
      </Card>

      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4 text-blue-600" />
            </div>
            <CardTitle>Productos / Servicios</CardTitle>
          </div>
          <Button type="button" variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => append({ quantity: 1, description: '', unit_price: 0 })}>
            Agregar línea
          </Button>
        </div>

        <div className="space-y-2">
          <div className="hidden lg:grid grid-cols-12 gap-3 text-xs font-medium text-gray-500 uppercase tracking-wider px-1">
            <div className="col-span-1">Cant.</div>
            <div className="col-span-5">Descripción</div>
            <div className="col-span-2 text-right">V. Unitario</div>
            <div className="col-span-3 text-right">Total</div>
            <div className="col-span-1"></div>
          </div>

          {fields.map((field, index) => {
            const itemTotal = (items[index]?.quantity || 0) * (items[index]?.unit_price || 0)
            return (
              <div key={field.id} className="border border-gray-200 rounded-xl p-3 lg:border-0 lg:p-0 lg:rounded-none lg:border-b lg:last:border-b-0 lg:border-gray-100 hover:bg-gray-50/50 transition-colors">
                <div className="lg:grid lg:grid-cols-12 lg:gap-3 lg:items-center space-y-2 lg:space-y-0">
                  <div className="lg:col-span-1">
                    <label className="text-xs text-gray-500 lg:hidden mb-1 block">Cant.</label>
                    <input type="number" min="1" {...register(`items.${index}.quantity`, { valueAsNumber: true, min: 1 })}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                  </div>
                  <div className="lg:col-span-5">
                    <label className="text-xs text-gray-500 lg:hidden mb-1 block">Descripción</label>
                    <input {...register(`items.${index}.description`, { required: true })}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" placeholder="Descripción del producto/servicio" />
                  </div>
                  <div className="lg:col-span-2">
                    <label className="text-xs text-gray-500 lg:hidden mb-1 block">V. Unitario</label>
                    <Controller control={control} name={`items.${index}.unit_price`} rules={{ min: 0 }}
                      render={({ field }) => (
                        <FormattedNumberInput value={field.value} onChange={field.onChange}
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" placeholder="0" />
                      )} />
                  </div>
                  <div className="lg:col-span-3 flex items-center justify-between lg:justify-end">
                    <span className="text-xs text-gray-500 lg:hidden">Subtotal:</span>
                    <span className="text-sm font-semibold text-gray-900 pr-1">{formatCurrency(itemTotal)}</span>
                  </div>
                  <div className="flex justify-end lg:justify-center">
                    {fields.length > 1 && (
                      <button type="button" onClick={() => remove(index)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2">
          <CardTitle className="mb-4">Método de Pago</CardTitle>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {PAYMENT_METHODS.map((method) => (
              <label key={method} className={`flex items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition-all text-xs font-medium ${
                paymentMethod === method
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300 text-gray-600'
              }`}>
                <input type="radio" value={method} {...register('payment_method')} className="sr-only" />
                {method}
              </label>
            ))}
          </div>

          {paymentMethod === 'EFECTIVO' && (
            <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-100">
              <Controller control={control} name="cash_amount"
                render={({ field }) => (
                  <Input label="Efectivo recibido" value={field.value} onChange={field.onChange} placeholder="0" />
                )} />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Cambio</label>
                <div className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-900">
                  {formatCurrency((watch('cash_amount') || 0) > total ? (watch('cash_amount') || 0) - total : 0)}
                </div>
              </div>
            </div>
          )}
        </Card>

        <Card>
          <CardTitle className="mb-4">Resumen</CardTitle>
          <div className="space-y-3">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal</span>
              <span className="font-medium text-gray-900">{formatCurrency(subtotal)}</span>
            </div>
            <div>
              <Controller control={control} name="discount"
                render={({ field }) => (
                  <Input label="Descuento" value={field.value} onChange={field.onChange} placeholder="0" />
                )} />
            </div>
            <div className="border-t border-gray-200 pt-3 flex justify-between">
              <span className="text-base font-bold text-gray-900">TOTAL</span>
              <span className="text-base font-bold text-blue-600">{formatCurrency(total)}</span>
            </div>
          </div>

          <Button type="submit" disabled={createMutation.isPending} className="w-full mt-5" size="lg">
            {createMutation.isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Generando...</>
            ) : (
              <><FileText className="w-4 h-4" /> Generar Factura</>
            )}
          </Button>
        </Card>
      </div>
    </form>
  )
}
