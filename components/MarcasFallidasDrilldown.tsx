// ═══════════════════════════════════════════════════════════
// Modal de detalle (drilldown) de Marcas fallidas
// Muestra los intentos fallidos de un colaborador día por día.
// Fuente: fn_marcas_fallidas_detalle(p_rut, desde, hasta)
//
// Ubicación: components/MarcasFallidasDrilldown.tsx
// ═══════════════════════════════════════════════════════════

'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Detalle = {
  fecha: string
  hora: string
  sentido: string
  error: string
  id_dispositivo: string | null
}

export default function MarcasFallidasDrilldown({
  rut,
  nombre,
  desde,
  hasta,
  onClose,
}: {
  rut: string
  nombre: string
  desde: string
  hasta: string
  onClose: () => void
}) {
  const [dias, setDias] = useState<Detalle[]>([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let activo = true
    ;(async () => {
      setCargando(true)
      const supabase = createClient()
      const { data } = await supabase.rpc('fn_marcas_fallidas_detalle', {
        p_rut: rut,
        desde,
        hasta,
      })
      if (activo) {
        setDias((data ?? []) as Detalle[])
        setCargando(false)
      }
    })()
    return () => {
      activo = false
    }
  }, [rut, desde, hasta])

  const total = dias.length
  const entrada = dias.filter((d) => d.sentido === 'Entrada').length
  const salida = dias.filter((d) => d.sentido === 'Salida').length

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
              {rut} · {desde} a {hasta}
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
        <div className="grid grid-cols-3 gap-3 px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Total intentos</p>
            <p className="text-xl font-bold text-gray-900">{total}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Entrada</p>
            <p className="text-xl font-bold text-gray-900">{entrada}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Salida</p>
            <p className="text-xl font-bold text-gray-900">{salida}</p>
          </div>
        </div>

        {/* Detalle */}
        <div className="overflow-y-auto">
          {cargando ? (
            <p className="px-6 py-12 text-center text-sm text-gray-400">Cargando…</p>
          ) : dias.length === 0 ? (
            <p className="px-6 py-12 text-center text-sm text-gray-400">
              Sin intentos fallidos en el rango.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-6 py-2 text-left font-semibold">Fecha</th>
                  <th className="px-3 py-2 text-left font-semibold">Hora</th>
                  <th className="px-3 py-2 text-left font-semibold">Sentido</th>
                  <th className="px-3 py-2 text-left font-semibold">Error</th>
                  <th className="px-6 py-2 text-left font-semibold">Dispositivo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {dias.map((d, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-6 py-2 whitespace-nowrap text-gray-700">{d.fecha}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-gray-700">{d.hora}</td>
                    <td className="px-3 py-2 text-gray-600">{d.sentido}</td>
                    <td className="px-3 py-2 text-gray-600">{d.error}</td>
                    <td className="px-6 py-2 text-gray-500">{d.id_dispositivo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
