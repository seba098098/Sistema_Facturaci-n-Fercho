import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Search, Edit2, Trash2, Users, UserPlus } from 'lucide-react'
import api from '../services/api'
import { Client, DOCUMENT_TYPES } from '../types'
import { useDebounce } from '../hooks/useDebounce'
import { Card } from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Modal from '../components/ui/Modal'
import PageHeader from '../components/ui/PageHeader'
import Pagination from '../components/ui/Pagination'
import EmptyState from '../components/ui/EmptyState'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import Loader from '../components/ui/Loader'

export default function ClientsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null)
  const [form, setForm] = useState({
    name: '', document_type: 'CC', document_number: '', address: '', phone: '', email: '',
  })
  const pageSize = 10

  const debouncedSearch = useDebounce(search, 300)

  const { data, isLoading } = useQuery({
    queryKey: ['clients', debouncedSearch, page],
    queryFn: () => {
      const params = new URLSearchParams()
      if (debouncedSearch) params.set('search', debouncedSearch)
      params.set('page', page.toString())
      params.set('page_size', pageSize.toString())
      return api.get(`/clients/?${params}`).then((r) => r.data)
    },
  })

  const clients: Client[] = data?.items || []
  const totalItems = data?.total || 0
  const totalPages = Math.ceil(totalItems / pageSize)

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => api.post('/clients/', data),
    onSuccess: () => { toast.success('Cliente creado'); queryClient.invalidateQueries({ queryKey: ['clients'] }); closeModal() },
    onError: (err: any) => toast.error(err.response?.data?.detail || 'Error al crear cliente'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<typeof form> }) => api.put(`/clients/${id}`, data),
    onSuccess: () => { toast.success('Cliente actualizado'); queryClient.invalidateQueries({ queryKey: ['clients'] }); closeModal() },
    onError: (err: any) => toast.error(err.response?.data?.detail || 'Error al actualizar'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/clients/${id}`),
    onSuccess: () => { toast.success('Cliente eliminado'); queryClient.invalidateQueries({ queryKey: ['clients'] }); setDeleteTarget(null) },
    onError: () => toast.error('Error al eliminar cliente'),
  })

  const openCreate = () => {
    setEditingClient(null)
    setForm({ name: '', document_type: 'CC', document_number: '', address: '', phone: '', email: '' })
    setShowModal(true)
  }

  const openEdit = (client: Client) => {
    setEditingClient(client)
    setForm({ name: client.name, document_type: client.document_type, document_number: client.document_number, address: client.address, phone: client.phone || '', email: client.email || '' })
    setShowModal(true)
  }

  const closeModal = () => { setShowModal(false); setEditingClient(null) }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.document_number) { toast.error('Nombre y documento son requeridos'); return }
    if (editingClient) {
      updateMutation.mutate({ id: editingClient.id, data: form })
    } else {
      createMutation.mutate(form)
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader
        title="Clientes"
        description={`${totalItems} clientes registrados`}
        actions={<Button icon={<UserPlus className="w-4 h-4" />} onClick={openCreate}>Nuevo Cliente</Button>}
      />

      <Card padding="none" className="mb-5">
        <div className="p-4 border-b border-gray-100">
          <Input
            placeholder="Buscar por nombre, documento, correo..."
            icon={<Search className="w-4 h-4" />}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          />
        </div>

        {isLoading ? (
          <Loader text="Cargando clientes..." />
        ) : clients.length === 0 ? (
          <EmptyState
            icon={<Users className="w-6 h-6" />}
            title="No se encontraron clientes"
            description="Crea tu primer cliente para comenzar"
            action={{ label: 'Nuevo Cliente', onClick: openCreate }}
          />
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Documento</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Dirección</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Teléfono</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Correo</th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {clients.map((client) => (
                    <tr key={client.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">{client.name}</td>
                      <td className="px-4 py-3 text-gray-500">{client.document_type}: {client.document_number}</td>
                      <td className="px-4 py-3 text-gray-500">{client.address}</td>
                      <td className="px-4 py-3 text-gray-500">{client.phone || '—'}</td>
                      <td className="px-4 py-3 text-gray-500">{client.email || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-0.5">
                          <button onClick={() => openEdit(client)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => setDeleteTarget(client)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-gray-100">
              {clients.map((client) => (
                <div key={client.id} className="p-4">
                  <div className="flex items-start justify-between mb-1.5">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900 text-sm">{client.name}</p>
                      <p className="text-xs text-gray-500">{client.document_type}: {client.document_number}</p>
                    </div>
                    <div className="flex items-center gap-0.5 ml-2 flex-shrink-0">
                      <button onClick={() => openEdit(client)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => setDeleteTarget(client)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-500">
                    {client.address && <span>{client.address}</span>}
                    {client.phone && <span>{client.phone}</span>}
                    {client.email && <span>{client.email}</span>}
                  </div>
                </div>
              ))}
            </div>

            <Pagination page={page} totalPages={totalPages} totalItems={totalItems} itemLabel="clientes" onPageChange={setPage} />
          </>
        )}
      </Card>

      <Modal
        open={showModal}
        onClose={closeModal}
        title={editingClient ? 'Editar Cliente' : 'Nuevo Cliente'}
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>Cancelar</Button>
            <Button onClick={handleSubmit} loading={createMutation.isPending || updateMutation.isPending}>
              {editingClient ? 'Guardar Cambios' : 'Crear Cliente'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Nombre *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nombre completo" required />
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Tipo</label>
              <select value={form.document_type} onChange={(e) => setForm({ ...form, document_type: e.target.value })} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
                {DOCUMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <Input label="Documento *" value={form.document_number} onChange={(e) => setForm({ ...form, document_number: e.target.value })} placeholder="Número" required />
            </div>
          </div>
          <Input label="Dirección" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Dirección" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Teléfono" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Teléfono" />
            <Input label="Correo" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="correo@ejemplo.com" />
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        title="Eliminar cliente"
        message={`¿Estás seguro de eliminar a "${deleteTarget?.name}"? Esta acción no se puede deshacer.`}
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
