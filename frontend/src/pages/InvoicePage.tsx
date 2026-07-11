import { useState, useEffect, useCallback } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Plus, Trash2, Search, FileText, Loader2 } from 'lucide-react'
import api from '../services/api'
import { Client, PAYMENT_METHODS, DOCUMENT_TYPES } from '../types'
import { formatCurrency } from '../utils/format'
import { useDebounce } from '../hooks/useDebounce'

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

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  })

  const items = watch('items')
  const paymentMethod = watch('payment_method')

  const subtotal = items.reduce(
    (sum, item) => sum + (item.quantity || 0) * (item.unit_price || 0),
    0
  )
  const discount = watch('discount') || 0
  const total = subtotal - discount

  const debouncedSearch = useDebounce(clientSearch, 300)

  const { data: clients } = useQuery({
    queryKey: ['clients-search', debouncedSearch],
    queryFn: () =>
      api.get(`/clients/?search=${encodeURIComponent(debouncedSearch)}`).then((r) => r.data),
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
      if (res.data && res.data.id) {
        selectClient(res.data)
      }
    } catch {
      // Client doesn't exist, allow manual entry
    }
  }

  const createMutation = useMutation({
    mutationFn: (data: InvoiceForm) => {
      const payload: any = {
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
      }
      return api.post('/invoices/', payload)
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
    if (!data.client_document) {
      toast.error('Ingrese el documento del cliente')
      return
    }
    if (data.items.length === 0) {
      toast.error('Agregue al menos un producto')
      return
    }
    for (const item of data.items) {
      if (!item.description || item.quantity <= 0 || item.unit_price <= 0) {
        toast.error('Complete todos los campos de los productos')
        return
      }
    }
    createMutation.mutate(data)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-5xl mx-auto space-y-6">
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Datos del Cliente</h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="label-field">Tipo de documento</label>
            <select {...register('client_document_type')} className="input-field">
              {DOCUMENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2 relative">
            <label className="label-field">Número de documento</label>
            <div className="relative">
              <input
                {...register('client_document')}
                className="input-field pr-10"
                placeholder="Buscar o registrar..."
                onChange={(e) => {
                  setClientSearch(e.target.value)
                  setSelectedClient(null)
                  setValue('client_document', e.target.value)
                }}
                onBlur={handleDocumentBlur}
              />
              <Search className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" />
            </div>
            {showClientDropdown && clients && clients.length > 0 && (
              <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                {clients.map((client: Client) => (
                  <button
                    key={client.id}
                    type="button"
                    className="w-full text-left px-4 py-2 hover:bg-primary-50 border-b border-gray-100 last:border-0"
                    onMouseDown={() => selectClient(client)}
                  >
                    <span className="font-medium">{client.name}</span>
                    <span className="text-sm text-gray-500 ml-2">
                      {client.document_type}: {client.document_number}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="label-field">Nombre</label>
            <input
              {...register('client_name', { required: true })}
              className="input-field"
              placeholder="Nombre del cliente"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="label-field">Dirección</label>
            <input {...register('client_address')} className="input-field" placeholder="Dirección" />
          </div>
          <div>
            <label className="label-field">Teléfono (opcional)</label>
            <input {...register('client_phone')} className="input-field" placeholder="Teléfono" />
          </div>
          <div>
            <label className="label-field">Correo electrónico (opcional)</label>
            <input
              {...register('client_email')}
              className="input-field"
              type="email"
              placeholder="correo@ejemplo.com"
            />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Productos / Servicios</h2>
          <button
            type="button"
            onClick={() => append({ quantity: 1, description: '', unit_price: 0 })}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            Agregar
          </button>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-12 gap-3 text-sm font-medium text-gray-500 px-1">
            <div className="col-span-2 md:col-span-1">Cant.</div>
            <div className="col-span-5 md:col-span-6">Descripción</div>
            <div className="col-span-2">V. Unitario</div>
            <div className="col-span-2 text-right">Total</div>
            <div className="col-span-1"></div>
          </div>

          {fields.map((field, index) => {
            const itemTotal =
              (items[index]?.quantity || 0) * (items[index]?.unit_price || 0)
            return (
              <div key={field.id} className="grid grid-cols-12 gap-3 items-center">
                <div className="col-span-2 md:col-span-1">
                  <input
                    type="number"
                    min="1"
                    {...register(`items.${index}.quantity`, {
                      valueAsNumber: true,
                      min: 1,
                    })}
                    className="input-field text-center"
                  />
                </div>
                <div className="col-span-5 md:col-span-6">
                  <input
                    {...register(`items.${index}.description`, { required: true })}
                    className="input-field"
                    placeholder="Descripción del producto/servicio"
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    min="0"
                    step="100"
                    {...register(`items.${index}.unit_price`, {
                      valueAsNumber: true,
                      min: 0,
                    })}
                    className="input-field text-right"
                  />
                </div>
                <div className="col-span-2 text-right font-medium text-gray-900 pr-1">
                  {formatCurrency(itemTotal)}
                </div>
                <div className="col-span-1 flex justify-center">
                  {fields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="text-red-400 hover:text-red-600 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card lg:col-span-2">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Método de Pago</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {PAYMENT_METHODS.map((method) => (
              <label
                key={method}
                className={`flex items-center justify-center p-3 rounded-lg border-2 cursor-pointer transition-all text-sm font-medium ${
                  paymentMethod === method
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-200 hover:border-gray-300 text-gray-600'
                }`}
              >
                <input
                  type="radio"
                  value={method}
                  {...register('payment_method')}
                  className="sr-only"
                />
                {method}
              </label>
            ))}
          </div>

          {paymentMethod === 'EFECTIVO' && (
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="label-field">Efectivo recibido</label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  {...register('cash_amount', { valueAsNumber: true })}
                  className="input-field"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="label-field">Cambio</label>
                <div className="input-field bg-gray-50 text-gray-700 font-semibold">
                  {formatCurrency(
                    (watch('cash_amount') || 0) > total
                      ? (watch('cash_amount') || 0) - total
                      : 0
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Resumen</h2>
          <div className="space-y-3">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span className="font-medium">{formatCurrency(subtotal)}</span>
            </div>
            <div>
              <label className="label-field">Descuento</label>
              <input
                type="number"
                min="0"
                step="100"
                {...register('discount', { valueAsNumber: true })}
                className="input-field"
                placeholder="0"
              />
            </div>
            <div className="border-t border-gray-200 pt-3 flex justify-between">
              <span className="text-lg font-bold text-gray-900">TOTAL</span>
              <span className="text-lg font-bold text-primary-600">
                {formatCurrency(total)}
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={createMutation.isPending}
            className="btn-primary w-full mt-6 flex items-center justify-center gap-2"
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generando...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" />
                Generar Factura
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  )
}
