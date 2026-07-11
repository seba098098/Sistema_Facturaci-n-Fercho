import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Save, Upload } from 'lucide-react'
import api from '../services/api'
import { Settings } from '../types'

export default function SettingsPage() {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<Partial<Settings>>({})
  const [logoPreview, setLogoPreview] = useState<string>('')

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings/').then((r) => r.data),
  })

  useEffect(() => {
    if (settings) {
      setForm(settings)
      if (settings.logo_path) {
        setLogoPreview(`/api/settings/logo?t=${Date.now()}`)
      }
    }
  }, [settings])

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Settings>) =>
      api.put('/settings/', { settings: data }),
    onSuccess: () => {
      toast.success('Configuración guardada')
      queryClient.invalidateQueries({ queryKey: ['settings'] })
    },
    onError: () => toast.error('Error al guardar configuración'),
  })

  const uploadLogoMutation = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      return api.post('/settings/logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    },
    onSuccess: () => {
      toast.success('Logo actualizado')
      setLogoPreview(`/api/settings/logo?t=${Date.now()}`)
      queryClient.invalidateQueries({ queryKey: ['settings'] })
    },
    onError: () => toast.error('Error al subir logo'),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateMutation.mutate({ ...form })
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setLogoPreview(URL.createObjectURL(file))
      uploadLogoMutation.mutate(file)
    }
  }

  const updateField = (key: keyof Settings, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  if (isLoading) {
    return <div className="text-center py-12 text-gray-500">Cargando configuración...</div>
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-6">
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Datos de la Empresa</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label-field">Nombre de la empresa</label>
            <input
              value={form.company_name || ''}
              onChange={(e) => updateField('company_name', e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="label-field">Eslogan</label>
            <input
              value={form.slogan || ''}
              onChange={(e) => updateField('slogan', e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="label-field">NIT</label>
            <input
              value={form.nit || ''}
              onChange={(e) => updateField('nit', e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="label-field">Régimen</label>
            <input
              value={form.regime || ''}
              onChange={(e) => updateField('regime', e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="label-field">Dirección</label>
            <input
              value={form.address || ''}
              onChange={(e) => updateField('address', e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="label-field">Teléfono</label>
            <input
              value={form.phone || ''}
              onChange={(e) => updateField('phone', e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="label-field">Correo electrónico</label>
            <input
              type="email"
              value={form.email || ''}
              onChange={(e) => updateField('email', e.target.value)}
              className="input-field"
            />
          </div>
        </div>
        <div className="mt-4">
          <label className="label-field">Pie de factura</label>
          <textarea
            value={form.footer || ''}
            onChange={(e) => updateField('footer', e.target.value)}
            className="input-field"
            rows={4}
          />
        </div>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Logo</h2>
        <div className="flex items-center gap-6">
          <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center overflow-hidden bg-gray-50">
            {logoPreview ? (
              <img
                src={logoPreview.startsWith('blob:') || logoPreview.startsWith('data:') ? logoPreview : `/api/settings/logo?t=${Date.now()}`}
                alt="Logo"
                className="max-w-full max-h-full object-contain"
              />
            ) : (
              <Upload className="w-8 h-8 text-gray-400" />
            )}
          </div>
          <div>
            <input
              type="file"
              accept="image/*"
              onChange={handleLogoChange}
              className="hidden"
              id="logo-upload"
            />
            <label htmlFor="logo-upload" className="btn-secondary cursor-pointer inline-block">
              Seleccionar imagen
            </label>
            <p className="text-xs text-gray-500 mt-2">PNG, JPG. Max 2MB</p>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Numeración</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label-field">Prefijo</label>
            <input
              value={form.invoice_prefix || ''}
              onChange={(e) => updateField('invoice_prefix', e.target.value)}
              className="input-field"
              placeholder="001"
            />
          </div>
          <div>
            <label className="label-field">Consecutivo actual</label>
            <input
              type="number"
              value={form.invoice_consecutive || 1}
              onChange={(e) =>
                updateField('invoice_consecutive', parseInt(e.target.value) || 1)
              }
              className="input-field"
              min="1"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={updateMutation.isPending}
          className="btn-primary flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {updateMutation.isPending ? 'Guardando...' : 'Guardar Configuración'}
        </button>
      </div>
    </form>
  )
}
