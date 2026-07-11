import { useState, useEffect, useRef } from 'react'

interface FormattedNumberInputProps {
  value: number | null
  onChange: (value: number | null) => void
  placeholder?: string
  className?: string
  min?: number
  step?: number
}

export default function FormattedNumberInput({
  value,
  onChange,
  placeholder = '0',
  className = '',
  min = 0,
  step = 100,
}: FormattedNumberInputProps) {
  const [display, setDisplay] = useState('')
  const focused = useRef(false)

  const format = (num: number | null): string => {
    if (num === null || num === 0) return ''
    return num.toLocaleString('es-CO')
  }

  useEffect(() => {
    if (!focused.current) {
      setDisplay(format(value))
    }
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '')
    const num = raw ? parseInt(raw, 10) : 0
    setDisplay(raw ? num.toLocaleString('es-CO') : '')
    onChange(num || null)
  }

  const handleFocus = () => {
    focused.current = true
    if (value && value > 0) {
      setDisplay(value.toString())
    }
  }

  const handleBlur = () => {
    focused.current = false
    setDisplay(format(value))
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      value={display}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder={placeholder}
      className={className}
      min={min}
      step={step}
    />
  )
}
