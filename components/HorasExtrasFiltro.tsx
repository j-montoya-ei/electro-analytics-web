'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'

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
    'px-3 py-1.5 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors'
  const btnPrimary =
    'px-3 py-1.5 text-sm rounded-md bg-[#00369C] text-white hover:bg-[#002a7a] transition-colors'

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 flex flex-wrap items-end gap-3">
      {/* Presets */}
      <div className="flex flex-wrap gap-2">
        <button onClick={mesEnCurso} className={btn}>Mes en curso</button>
        <button onClick={ultimos7} className={btn}>Últimos 7 días</button>
        <button onClick={historico} className={btn}>Histórico</button>
      </div>

      <div className="h-8 w-px bg-gray-200 mx-1 hidden sm:block" />

      {/* Rango personalizado */}
      <div className="flex items-end gap-2">
        <div className="flex flex-col">
          <label className="text-xs text-gray-500 mb-1">Desde</label>
          <input
            type="date"
            value={d}
            max={h}
            onChange={(e) => setD(e.target.value)}
            className="border border-gray-300 rounded-md px-2 py-1.5 text-sm"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-gray-500 mb-1">Hasta</label>
          <input
            type="date"
            value={h}
            min={d}
            onChange={(e) => setH(e.target.value)}
            className="border border-gray-300 rounded-md px-2 py-1.5 text-sm"
          />
        </div>
        <button onClick={() => aplicar(d, h)} className={btnPrimary}>
          Aplicar
        </button>
      </div>
    </div>
  )
}
