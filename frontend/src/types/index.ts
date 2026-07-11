export interface Client {
  id: number
  name: string
  document_type: string
  document_number: string
  address: string
  phone: string | null
  email: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface InvoiceItem {
  id?: number
  quantity: number
  description: string
  unit_price: number
  total: number
}

export interface Invoice {
  id: number
  invoice_number: string
  client_id: number
  client_name: string
  client_document: string
  client_address: string
  client_email: string
  subtotal: number
  discount: number
  total: number
  payment_method: string
  cash_amount: number | null
  change_amount: number | null
  pdf_path: string | null
  png_path: string | null
  email_sent: boolean
  email_sent_at: string | null
  email_error: string | null
  created_at: string
  items: InvoiceItem[]
}

export interface InvoiceListItem {
  id: number
  invoice_number: string
  client_name: string
  client_document: string
  total: number
  payment_method: string
  email_sent: boolean
  created_at: string
}

export interface InvoiceListResponse {
  items: InvoiceListItem[]
  total: number
  page: number
  page_size: number
}

export interface Settings {
  company_name: string
  slogan: string
  nit: string
  regime: string
  address: string
  phone: string
  email: string
  footer: string
  invoice_prefix: string
  invoice_consecutive: number
  logo_path: string
  smtp_host: string
  smtp_port: number
  smtp_user: string
  smtp_password: string
  smtp_from: string
  smtp_use_tls: boolean
}

export const PAYMENT_METHODS = [
  'EFECTIVO',
  'TRANSFERENCIA',
  'TARJETA DÉBITO',
  'TARJETA CRÉDITO',
  'NEQUI',
  'DAVIPLATA',
  'OTRO',
]

export const DOCUMENT_TYPES = ['CC', 'NIT', 'CE', 'TI', 'PP']
