'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type DetalleDia = {
  fecha: string
  momento: string // 'Mañana' | 'Tarde'
  hora_teorica: string
  limite_gracia: string
  hora_real: string
  minutos: number
}

function fmtMin(min: number): string {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m === 0 ? `${h} h` : `${h} h ${m} m`
}

// '13:30:00' → '13:30'
const hhmm = (t: string) => (t ? t.slice(0, 5) : '—')

function minutosDesdeMedianoche(t: string): number {
  const [horas, minutos] = t.slice(0, 5).split(':').map(Number)
  return horas * 60 + minutos
}

function hhmmDesdeMinutos(total: number): string {
  const minutosDelDia = ((total % 1440) + 1440) % 1440
  return `${String(Math.floor(minutosDelDia / 60)).padStart(2, '0')}:${String(
    minutosDelDia % 60
  ).padStart(2, '0')}`
}

export default function LlegadasTardeDrilldown({
  trabId,
  nombre,
  area,
  desde,
  hasta,
  onClose,
}: {
  trabId: string
  nombre: string
  area: string
  desde: string
  hasta: string
  onClose: () => void
}) {
  const [dias, setDias] = useState<DetalleDia[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Cerrar con tecla Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    let activo = true
    ;(async () => {
      setCargando(true)
      setError(null)
      const supabase = createClient()
      const { data, error } = await supabase.rpc('fn_detalle_llegadas_tarde', {
        p_trab_id: trabId,
        desde,
        hasta,
      })
      if (!activo) return
      if (error) {
        setError(error.message)
      } else {
        setDias((data ?? []) as DetalleDia[])
      }
      setCargando(false)
    })()
    return () => {
      activo = false
    }
  }, [trabId, desde, hasta])

  // KPIs del colaborador
  const totalDias = dias.length
  const totalMin = dias.reduce((s, d) => s + d.minutos, 0)
  const peor = dias.reduce<DetalleDia | null>(
    (max, d) => (!max || d.minutos > max.minutos ? d : max),
    null
  )
  const diasManana = dias.filter((d) => d.momento === 'Mañana').length
  const diasTarde = dias.filter((d) => d.momento === 'Tarde').length

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Encabezado */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-bold text-gray-900">{nombre}</h3>
            <p className="text-sm text-gray-500">
              {area} · {desde} a {hasta}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 text-xl leading-none"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        {/* KPIs del colaborador */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Días tarde</p>
            <p className="text-xl font-bold text-gray-900">{totalDias}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">
              Superó tolerancia
            </p>
            <p className="text-xl font-bold text-[#00369C]">{fmtMin(totalMin)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Peor día</p>
            <p className="text-xl font-bold text-gray-900">
              {peor ? `${peor.minutos} min` : '—'}
            </p>
            {peor && <p className="text-xs text-gray-500">{peor.fecha}</p>}
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">
              Mañana / Tarde
            </p>
            <p className="text-xl font-bold text-gray-900">
              {diasManana} / {diasTarde}
            </p>
          </div>
        </div>

        {/* Tabla de días */}
        <div className="overflow-y-auto px-6 py-4">
          {cargando && (
            <p className="text-sm text-gray-500 py-8 text-center">Cargando detalle…</p>
          )}
          {error && (
            <p className="text-sm text-red-600 py-8 text-center">
              No se pudo cargar el detalle: {error}
            </p>
          )}
          {!cargando && !error && dias.length === 0 && (
            <p className="text-sm text-gray-500 py-8 text-center">
              Sin días que superaran la tolerancia en el rango.
            </p>
          )}
          {!cargando && !error && dias.length > 0 && (
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200">
                  <th className="py-2 pr-4 font-semibold">Fecha</th>
                  <th className="py-2 pr-4 font-semibold">Momento</th>
                  <th className="py-2 pr-4 font-semibold">Debía marcar</th>
                  <th className="py-2 pr-4 font-semibold">Marcó</th>
                  <th className="py-2 text-right font-semibold">Superó tolerancia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {dias.map((d, i) => (
                  (() => {
                    const tienePermiso =
                      minutosDesdeMedianoche(d.limite_gracia) >
                      minutosDesdeMedianoche(d.hora_teorica) + 7
                    const finPermiso = tienePermiso
                      ? hhmmDesdeMinutos(minutosDesdeMedianoche(d.limite_gracia) - 7)
                      : null
                    const minutosDespuesPermiso = finPermiso
                      ? minutosDesdeMedianoche(d.hora_real) -
                        minutosDesdeMedianoche(finPermiso)
                      : null

                    return (
                  <tr key={`${d.fecha}-${d.momento}-${i}`} className="hover:bg-gray-50">
                    <td className="py-2 pr-4 text-gray-900">{d.fecha}</td>
                    <td className="py-2 pr-4">
                      <span
                        className={
                          'inline-block px-2 py-0.5 rounded text-xs font-medium ' +
                          (d.momento === 'Mañana'
                            ? 'bg-blue-100 text-[#00369C]'
                            : 'bg-amber-100 text-amber-800')
                        }
                      >
                        {d.momento}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-gray-600">
                      <div>{hhmm(d.hora_teorica)}</div>
                      {finPermiso && (
                        <div className="mt-1 text-xs font-medium text-emerald-700">
                          Permiso hasta {finPermiso}
                        </div>
                      )}
                    </td>
                    <td className="py-2 pr-4 text-gray-900 font-medium">
                      {hhmm(d.hora_real)}
                    </td>
                    <td className="py-2 text-right font-semibold text-gray-900">
                      <div>{d.minutos} min</div>
                      {finPermiso && (
                        <div className="mt-1 text-xs font-normal text-gray-500">
                          {minutosDespuesPermiso} min después del permiso
                        </div>
                      )}
                    </td>
                  </tr>
                    )
                  })()
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
