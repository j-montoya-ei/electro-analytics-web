'use client'

import { useMemo, useState } from 'react'
import LlegadasTardeDrilldown from './LlegadasTardeDrilldown'

type Fila = {
  trab_id: string
  nombre_completo: string
  area: string
  dias_evaluados: number
  tardanzas_oficiales: number
  minutos_oficiales: number
  dias_despues_teorica: number
  minutos_teoricos: number
  tardanzas_tarde: number
  minutos_tarde_oficiales: number
  dias_despues_tarde: number
  minutos_tarde_teoricos: number
  total_dias: number
  total_minutos: number
}

type ColKey =
  | 'nombre_completo'
  | 'area'
  | 'tardanzas_oficiales'
  | 'minutos_oficiales'
  | 'dias_despues_teorica'
  | 'minutos_teoricos'
  | 'tardanzas_tarde'
  | 'minutos_tarde_oficiales'
  | 'dias_despues_tarde'
  | 'minutos_tarde_teoricos'
  | 'total_dias'
  | 'total_minutos'

const TIPO: Record<ColKey, 'texto' | 'num'> = {
  nombre_completo: 'texto',
  area: 'texto',
  tardanzas_oficiales: 'num',
  minutos_oficiales: 'num',
  dias_despues_teorica: 'num',
  minutos_teoricos: 'num',
  tardanzas_tarde: 'num',
  minutos_tarde_oficiales: 'num',
  dias_despues_tarde: 'num',
  minutos_tarde_teoricos: 'num',
  total_dias: 'num',
  total_minutos: 'num',
}

export default function LlegadasTardeTable({
  data,
  desde,
  hasta,
}: {
  data: Fila[]
  desde: string
  hasta: string
}) {
  const [sortKey, setSortKey] = useState<ColKey>('total_minutos')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [seleccionado, setSeleccionado] = useState<Fila | null>(null)

  function ordenarPor(key: ColKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir(TIPO[key] === 'num' ? 'desc' : 'asc')
    }
  }

  const filas = useMemo(() => {
    const copia = [...data]
    const dir = sortDir === 'asc' ? 1 : -1
    copia.sort((a, b) => {
      if (TIPO[sortKey] === 'texto') {
        return String(a[sortKey]).localeCompare(String(b[sortKey]), 'es') * dir
      }
      return ((a[sortKey] as number) - (b[sortKey] as number)) * dir
    })
    return copia
  }, [data, sortKey, sortDir])

  const flecha = (key: ColKey) =>
    key === sortKey ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''

  const thNum =
    'px-3 py-2.5 text-right font-medium text-xs uppercase tracking-wider cursor-pointer select-none hover:text-[#00369C] transition-colors'
  const thTxt =
    'px-4 py-3 text-left font-medium text-xs uppercase tracking-wider cursor-pointer select-none hover:text-[#00369C] align-middle transition-colors'

  return (
    <div className="space-y-3">
      {/* Nota aclaratoria minimalista */}
      <div className="bg-white rounded-lg border border-gray-200 p-3.5 text-xs text-gray-500 leading-relaxed shadow-sm">
        <span className="font-semibold text-[#00369C]">Superó la tolerancia:</span> minutos pasados del límite de gracia (base de descuento).{' '}
        <span className="font-semibold text-gray-700">Entró después de su hora:</span> minutos desde la hora oficial.{' '}
        <span className="text-gray-400">|</span> <span className="italic">Haz clic en cualquier fila para ver el desglose detallado por día.</span>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm divide-y divide-gray-200">
            <thead className="bg-gray-50/75 text-gray-700 font-semibold">
              {/* Fila superior de Categorías de Agrupación */}
              <tr className="border-b border-gray-200 text-xs">
                <th rowSpan={2} onClick={() => ordenarPor('nombre_completo')} className={thTxt}>
                  Colaborador{flecha('nombre_completo')}
                </th>
                <th rowSpan={2} onClick={() => ordenarPor('area')} className={thTxt}>
                  Proceso{flecha('area')}
                </th>
                <th colSpan={2} className="px-3 py-2 text-center font-semibold text-gray-800 bg-gray-100/60 border-l border-gray-200">
                  Mañana (Entrada)
                </th>
                <th colSpan={2} className="px-3 py-2 text-center font-semibold text-gray-800 bg-gray-100/60 border-l border-gray-200">
                  Tarde (Regreso Almuerzo)
                </th>
                <th colSpan={2} className="px-3 py-2 text-center font-bold text-[#00369C] bg-blue-50/50 border-l border-gray-200">
                  Total Acumulado
                </th>
              </tr>
              {/* Fila inferior de Métricas Específicas */}
              <tr className="border-b border-gray-200 text-[11px] text-gray-500 bg-white">
                <th onClick={() => ordenarPor('tardanzas_oficiales')} className={thNum + ' border-l border-gray-200'}>
                  Días (Tol){flecha('tardanzas_oficiales')}
                </th>
                <th onClick={() => ordenarPor('minutos_oficiales')} className={thNum}>
                  Min (Tol){flecha('minutos_oficiales')}
                </th>
                <th onClick={() => ordenarPor('tardanzas_tarde')} className={thNum + ' border-l border-gray-200'}>
                  Días (Tol){flecha('tardanzas_tarde')}
                </th>
                <th onClick={() => ordenarPor('minutos_tarde_oficiales')} className={thNum}>
                  Min (Tol){flecha('minutos_tarde_oficiales')}
                </th>
                <th onClick={() => ordenarPor('total_dias')} className={thNum + ' border-l border-gray-200 font-bold text-gray-900 bg-blue-50/30'}>
                  Días{flecha('total_dias')}
                </th>
                <th onClick={() => ordenarPor('total_minutos')} className={thNum + ' font-bold text-[#00369C] bg-blue-50/30'}>
                  Minutos{flecha('total_minutos')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filas.map((f) => (
                <tr
                  key={f.trab_id}
                  onClick={() => setSeleccionado(f)}
                  className="hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 text-gray-900 font-medium">{f.nombre_completo}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{f.area}</td>
                  
                  {/* Mañana */}
                  <td className="px-3 py-3 text-right text-gray-600 border-l border-gray-100">{f.tardanzas_oficiales}</td>
                  <td className="px-3 py-3 text-right font-medium text-gray-900">{f.minutos_oficiales}</td>

                  {/* Tarde */}
                  <td className="px-3 py-3 text-right text-gray-600 border-l border-gray-100">{f.tardanzas_tarde}</td>
                  <td className="px-3 py-3 text-right font-medium text-amber-700">{f.minutos_tarde_oficiales}</td>

                  {/* Totales */}
                  <td className="px-3 py-3 text-right font-bold text-gray-900 border-l border-gray-200 bg-blue-50/20">{f.total_dias}</td>
                  <td className="px-3 py-3 text-right font-bold text-[#00369C] bg-blue-50/20">{f.total_minutos}</td>
                </tr>
              ))}
              {filas.length === 0 && (
                <tr>
                  <td colSpan={12} className="px-4 py-12 text-center text-gray-400 text-sm">
                    No se registran llegadas tarde en el rango de fechas seleccionado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {seleccionado && (
        <LlegadasTardeDrilldown
          trabId={seleccionado.trab_id}
          nombre={seleccionado.nombre_completo}
          area={seleccionado.area}
          desde={desde}
          hasta={hasta}
          onClose={() => setSeleccionado(null)}
        />
      )}
    </div>
  )
}
