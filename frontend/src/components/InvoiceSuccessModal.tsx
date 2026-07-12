import { useState, useEffect } from 'react'
import { FileText, Download, CheckCircle2, Image, Loader2 } from 'lucide-react'
import Modal from './ui/Modal'
import Button from './ui/Button'
import { formatCurrency } from '../utils/format'

interface InvoiceSuccessModalProps {
  open: boolean
  onClose: () => void
  invoiceId: number | null
  invoiceNumber: string
  total: number
}

export default function InvoiceSuccessModal({ open, onClose, invoiceId, invoiceNumber, total }: InvoiceSuccessModalProps) {
  const [pngUrl, setPngUrl] = useState<string | null>(null)
  const [loadingPng, setLoadingPng] = useState(false)

  useEffect(() => {
    if (open && invoiceId) {
      setLoadingPng(true)
      fetch(`/api/invoices/${invoiceId}/png`)
        .then((res) => {
          if (res.ok) return res.blob()
          throw new Error('No PNG')
        })
        .then((blob) => {
          const url = URL.createObjectURL(blob)
          setPngUrl(url)
        })
        .catch(() => setPngUrl(null))
        .finally(() => setLoadingPng(false))
    }
    return () => {
      if (pngUrl) URL.revokeObjectURL(pngUrl)
    }
  }, [open, invoiceId])

  useEffect(() => {
    if (!open) {
      setPngUrl(null)
    }
  }, [open])

  return (
    <Modal open={open} onClose={onClose} size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cerrar</Button>
          {invoiceId && (
            <Button variant="primary" icon={<Download className="w-4 h-4" />}
              onClick={() => window.open(`/api/invoices/${invoiceId}/pdf`, '_blank')}>
              Descargar PDF
            </Button>
          )}
        </>
      }>
      <div className="space-y-5">
        {/* Success header */}
        <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-100">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Factura generada exitosamente</h3>
            <p className="text-xs text-gray-500">
              {invoiceNumber} — {formatCurrency(total)}
            </p>
          </div>
        </div>

        {/* PNG Preview */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            <Image className="w-3.5 h-3.5" />
            Vista previa del tiquete
          </div>
          <div className="border border-gray-100 rounded-xl bg-gray-50 flex items-center justify-center p-4 min-h-[200px] max-h-[500px] overflow-auto">
            {loadingPng ? (
              <div className="flex flex-col items-center gap-2 text-gray-400">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span className="text-xs">Cargando vista previa...</span>
              </div>
            ) : pngUrl ? (
              <img src={pngUrl} alt={`Factura ${invoiceNumber}`}
                className="max-w-full h-auto rounded-lg shadow-sm" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-gray-400">
                <FileText className="w-8 h-8" />
                <span className="text-xs">Vista previa no disponible</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}
