'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { CalendarDays, Check, History, RotateCcw } from 'lucide-react'

const pad = (n: number) => String(n).padStart(2, '0')
const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

// "Hoy" en horario Colombia
function bogotaHoy() {
  const now = new Date()
  return new Date(now.toLocaleString('en-US', { timeZone: 'America/Bogota' }))
}

export default function HorasExtrasFiltro({
  desde,
  hasta,
}: {
  desde: string
  hasta: string
}) {
  const router = useRouter()
  const params = useSearchParams()
  const [d, setD] = useState(desde)
  const [h, setH] = useState(hasta)

  function aplicar(nuevoDesde: string, nuevoHasta: string) {
    const p = new URLSearchParams(params.toString())
    p.set('desde', nuevoDesde)
    p.set('hasta', nuevoHasta)
    router.push(`?${p.toString()}`)
  }

  function mesEnCurso() {
    const t = bogotaHoy()
    const y = t.getFullYear()
    const m = t.getMonth() + 1
    const ini = `${y}-${pad(m)}-01`
    const fin = `${y}-${pad(m)}-${pad(new Date(y, m, 0).getDate())}`
    setD(ini); setH(fin)
    aplicar(ini, fin)
  }

  function ultimos7() {
    const fin = bogotaHoy()
    const ini = new Date(fin)
    ini.setDate(fin.getDate() - 6)
    setD(fmt(ini)); setH(fmt(fin))
    aplicar(fmt(ini), fmt(fin))
  }

  function historico() {
    const ini = '2026-07-01' // migración de turnos a Buk
    const fin = fmt(bogotaHoy())
    setD(ini); setH(fin)
    aplicar(ini, fin)
  }

  const btn =
    'inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 hover:text-[#00369C] hover:bg-blue-50 transition-colors'
  const btnPrimary =
    'inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-[#00369C] text-white shadow-sm shadow-blue-900/20 hover:bg-[#002a7a] focus:outline-none focus:ring-2 focus:ring-[#00369C]/30 transition-colors'

  return (
    <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm p-4 md:p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Periodo de análisis</p>
          <div className="mt-2 inline-flex flex-wrap rounded-lg border border-gray-200 bg-gray-50 p-1">
            <button onClick={mesEnCurso} className={btn}>
              <CalendarDays className="h-4 w-4" />
              Mes en curso
            </button>
            <button onClick={ultimos7} className={btn}>
              <RotateCcw className="h-4 w-4" />
              Últimos 7 días
            </button>
            <button onClick={historico} className={btn}>
              <History className="h-4 w-4" />
              Histórico
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex flex-col">
            <label htmlFor="horas-desde" className="mb-1.5 text-xs font-medium text-gray-500">Desde</label>
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                id="horas-desde"
                type="date"
                value={d}
                max={h}
                onChange={(e) => setD(e.target.value)}
                className="h-10 rounded-lg border border-gray-300 bg-white pl-9 pr-3 text-sm text-gray-700 outline-none transition focus:border-[#00369C] focus:ring-2 focus:ring-[#00369C]/15"
              />
            </div>
          </div>
          <div className="hidden h-10 items-center text-gray-300 sm:flex">—</div>
          <div className="flex flex-col">
            <label htmlFor="horas-hasta" className="mb-1.5 text-xs font-medium text-gray-500">Hasta</label>
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                id="horas-hasta"
                type="date"
                value={h}
                min={d}
                onChange={(e) => setH(e.target.value)}
                className="h-10 rounded-lg border border-gray-300 bg-white pl-9 pr-3 text-sm text-gray-700 outline-none transition focus:border-[#00369C] focus:ring-2 focus:ring-[#00369C]/15"
              />
            </div>
          </div>
          <button onClick={() => aplicar(d, h)} className={btnPrimary}>
            <Check className="h-4 w-4" />
            Aplicar periodo
          </button>
        </div>
      </div>
    </div>
  )
}
