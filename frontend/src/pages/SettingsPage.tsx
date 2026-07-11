import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Save, Upload, Building2, Image, Hash } from 'lucide-react'
import api from '../services/api'
import { Settings } from '../types'
import { Card, CardTitle } from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import PageHeader from '../components/ui/PageHeader'
import Loader from '../components/ui/Loader'

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
    mutationFn: (data: Partial<Settings>) => api.put('/settings/', { settings: data }),
    onSuccess: () => { toast.success('Configuración guardada'); queryClient.invalidateQueries({ queryKey: ['settings'] }) },
    onError: () => toast.error('Error al guardar configuración'),
  })

  const uploadLogoMutation = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      return api.post('/settings/logo', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
    },
    onSuccess: () => { toast.success('Logo actualizado'); setLogoPreview(`/api/settings/logo?t=${Date.now()}`); queryClient.invalidateQueries({ queryKey: ['settings'] }) },
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

  if (isLoading) return <Loader text="Cargando configuración..." fullPage />

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader
        title="Configuración"
        description="Administra los datos de tu empresa y preferencias"
      />

      <form onSubmit={handleSubmit} className="space-y-5">
        <Card>
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-blue-600" />
            </div>
            <CardTitle>Datos de la Empresa</CardTitle>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Nombre de la empresa" value={form.company_name || ''} onChange={(e) => updateField('company_name', e.target.value)} placeholder="Nombre de la empresa" />
            <Input label="Eslogan" value={form.slogan || ''} onChange={(e) => updateField('slogan', e.target.value)} placeholder="Tu eslogan" />
            <Input label="NIT" value={form.nit || ''} onChange={(e) => updateField('nit', e.target.value)} placeholder="NIT" />
            <Input label="Régimen" value={form.regime || ''} onChange={(e) => updateField('regime', e.target.value)} placeholder="Régimen tributario" />
            <Input label="Dirección" value={form.address || ''} onChange={(e) => updateField('address', e.target.value)} placeholder="Dirección" />
            <Input label="Teléfono" value={form.phone || ''} onChange={(e) => updateField('phone', e.target.value)} placeholder="Teléfono" />
            <Input label="Correo electrónico" type="email" value={form.email || ''} onChange={(e) => updateField('email', e.target.value)} placeholder="correo@empresa.com" />
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Pie de factura</label>
            <textarea value={form.footer || ''} onChange={(e) => updateField('footer', e.target.value)} rows={3}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none" placeholder="Texto que aparece al pie de la factura" />
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <Image className="w-4 h-4 text-blue-600" />
            </div>
            <CardTitle>Logo</CardTitle>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-5">
            <div className="w-28 h-28 border-2 border-dashed border-gray-200 rounded-2xl flex items-center justify-center overflow-hidden bg-gray-50">
              {logoPreview ? (
                <img src={logoPreview.startsWith('blob:') ? logoPreview : `/api/settings/logo?t=${Date.now()}`} alt="Logo" className="max-w-full max-h-full object-contain p-2" />
              ) : (
                <Upload className="w-8 h-8 text-gray-300" />
              )}
            </div>
            <div>
              <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" id="logo-upload" />
              <label htmlFor="logo-upload" className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                <Upload className="w-4 h-4 mr-2" />
                Seleccionar imagen
              </label>
              <p className="text-xs text-gray-400 mt-2">PNG, JPG. Max 2MB</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <Hash className="w-4 h-4 text-blue-600" />
            </div>
            <CardTitle>Numeración</CardTitle>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Prefijo" value={form.invoice_prefix || ''} readOnly className="bg-gray-50 text-gray-500 cursor-not-allowed" hint="Se establece al crear la primera factura" />
            <Input label="Consecutivo actual" value={String(form.invoice_consecutive || 1)} readOnly className="bg-gray-50 text-gray-500 cursor-not-allowed" hint="Se incrementa automáticamente" />
          </div>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" variant="primary" icon={<Save className="w-4 h-4" />} loading={updateMutation.isPending}>
            Guardar Configuración
          </Button>
        </div>
      </form>
    </div>
  )
}
