import { Loader2 } from 'lucide-react'

interface LoaderProps {
  text?: string
  fullPage?: boolean
}

export default function Loader({ text, fullPage = false }: LoaderProps) {
  const content = (
    <div className="flex flex-col items-center gap-3">
      <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
      {text && <p className="text-sm text-gray-500">{text}</p>}
    </div>
  )

  if (fullPage) {
    return (
      <div className="flex items-center justify-center py-20">{content}</div>
    )
  }

  return <div className="flex items-center justify-center py-8">{content}</div>
}
