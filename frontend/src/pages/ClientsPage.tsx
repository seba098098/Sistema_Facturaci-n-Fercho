import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  UserPlus,
} from 'lucide-react'
import api from '../services/api'
import { Client, DOCUMENT_TYPES } from '../types'
import { useDebounce } from '../hooks/useDebounce'

export default function ClientsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [form, setForm] = useState({
    name: '',
    document_type: 'CC',
    document_number: '',
    address: '',
    phone: '',
    email: '',
  })

  const debouncedSearch = useDebounce(search, 300)

  const { data: clients, isLoading } = useQuery({
    queryKey: ['clients', debouncedSearch],
    queryFn: () =>
      api.get(`/clients/?search=${encodeURIComponent(debouncedSearch)}`).then((r) => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => api.post('/clients/', data),
    onSuccess: () => {
      toast.success('Cliente creado')
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      closeModal()
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.detail || 'Error al crear cliente'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<typeof form> }) =>
      api.put(`/clients/${id}`, data),
    onSuccess: () => {
      toast.success('Cliente actualizado')
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      closeModal()
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.detail || 'Error al actualizar'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/clients/${id}`),
    onSuccess: () => {
      toast.success('Cliente eliminado')
      queryClient.invalidateQueries({ queryKey: ['clients'] })
    },
    onError: () => toast.error('Error al eliminar cliente'),
  })

  const openCreate = () => {
    setEditingClient(null)
    setForm({
      name: '',
      document_type: 'CC',
      document_number: '',
      address: '',
      phone: '',
      email: '',
    })
    setShowModal(true)
  }

  const openEdit = (client: Client) => {
    setEditingClient(client)
    setForm({
      name: client.name,
      document_type: client.document_type,
      document_number: client.document_number,
      address: client.address,
      phone: client.phone || '',
      email: client.email || '',
    })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingClient(null)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.document_number) {
      toast.error('Nombre y documento son requeridos')
      return
    }
    if (editingClient) {
      updateMutation.mutate({ id: editingClient.id, data: form })
    } else {
      createMutation.mutate(form)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10"
            placeholder="Buscar clientes..."
          />
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center justify-center gap-2">
          <UserPlus className="w-4 h-4" />
          Nuevo Cliente
        </button>
      </div>

      <div className="card p-0 overflow-hidden">
        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Nombre</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Documento</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Dirección</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Teléfono</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Correo</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-500">
                    Cargando...
                  </td>
                </tr>
              ) : !clients || clients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-500">
                    No se encontraron clientes
                  </td>
                </tr>
              ) : (
                clients.map((client: Client) => (
                  <tr key={client.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{client.name}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {client.document_type}: {client.document_number}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{client.address}</td>
                    <td className="px-4 py-3 text-gray-500">{client.phone || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{client.email || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openEdit(client)}
                          className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('¿Está seguro de eliminar este cliente?')) {
                              deleteMutation.mutate(client.id)
                            }
                          }}
                          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Cargando...</div>
          ) : !clients || clients.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No se encontraron clientes</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {clients.map((client: Client) => (
                <div key={client.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900 truncate">{client.name}</p>
                      <p className="text-sm text-gray-500">
                        {client.document_type}: {client.document_number}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                      <button
                        onClick={() => openEdit(client)}
                        className="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('¿Está seguro de eliminar este cliente?')) {
                            deleteMutation.mutate(client.id)
                          }
                        }}
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                    {client.address && <span>{client.address}</span>}
                    {client.phone && <span>{client.phone}</span>}
                    {client.email && <span>{client.email}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 sm:p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold">
                {editingClient ? 'Editar Cliente' : 'Nuevo Cliente'}
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
              <div>
                <label className="label-field">Nombre *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input-field"
                  required
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="label-field">Tipo</label>
                  <select
                    value={form.document_type}
                    onChange={(e) => setForm({ ...form, document_type: e.target.value })}
                    className="input-field"
                  >
                    {DOCUMENT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="label-field">Documento *</label>
                  <input
                    value={form.document_number}
                    onChange={(e) => setForm({ ...form, document_number: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="label-field">Dirección</label>
                <input
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="input-field"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label-field">Teléfono</label>
                  <input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label-field">Correo</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <button type="button" onClick={closeModal} className="btn-secondary flex-1">
                  Cancelar
                </button>
                <button type="submit" className="btn-primary flex-1">
                  {editingClient ? 'Guardar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
