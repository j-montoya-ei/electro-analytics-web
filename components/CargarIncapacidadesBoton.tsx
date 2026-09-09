// ═══════════════════════════════════════════════════════════
// Botón "Cargar incapacidades" (client component)
// Sube el libro INCAPACIDADES_BASE_2026 (.xls/.xlsx) a
// /api/incapacidades/cargar, muestra el resumen y refresca.
//
// Ubicación: components/CargarIncapacidadesBoton.tsx
// ═══════════════════════════════════════════════════════════

'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

type Resumen = {
  recibidas: number
  validas: number
  insertados: number
  ya_existentes: number
  descartadas: number
}

export default function CargarIncapacidadesBoton() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [cargando, setCargando] = useState(false)
  const [resumen, setResumen] = useState<Resumen | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function onArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // permite volver a subir el mismo archivo
    if (!file) return

    setCargando(true)
    setResumen(null)
    setError(null)

    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/incapacidades/cargar', {
        method: 'POST',
        body: form,
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json?.error ?? 'No se pudo cargar el archivo')
      } else {
        setResumen(json.resumen as Resumen)
        router.refresh()
      }
    } catch {
      setError('Error de red al subir el archivo')
    } finally {
      setCargando(false)
    }
  }

  const btnPrimary =
    'inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-[#00369C] text-white shadow-sm shadow-blue-900/20 hover:bg-[#002a7a] focus:outline-none focus:ring-2 focus:ring-[#00369C]/30 transition-colors disabled:opacity-60 disabled:cursor-not-allowed'

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={cargando}
        className={btnPrimary}
      >
        {cargando ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Upload className="h-4 w-4" />
        )}
        {cargando ? 'Cargando…' : 'Cargar incapacidades'}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept=".xls,.xlsx"
        onChange={onArchivo}
        className="hidden"
      />

      {resumen && (
        <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-800">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
          <span>
            {resumen.insertados} incapacidad(es) nueva(s) · {resumen.ya_existentes} ya
            existían · {resumen.descartadas} descartadas
          </span>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
