'use client'

import { useMemo, useState } from 'react'

// Mismo tipo que devuelve fn_horas_extras_por_colaborador (subconjunto usado aquí)
type Fila = {
  dni: string
  nombre_completo: string | null
  proceso: string
  unidad_negocio: string
  meses_con_he: number
  he_diurna_ord: number
  he_nocturna: number
  he_diurna_domfes: number
  he_nocturna_domfes: number
  horas_extra_reales: number
  total_recargos: number
  total_horas: number
  meses_supera_48h: number
}

type ColKey =
  | 'nombre_completo'
  | 'proceso'
  | 'unidad_negocio'
  | 'he_diurna_ord'
  | 'he_nocturna'
  | 'he_diurna_domfes'
  | 'horas_extra_reales'
  | 'meses_supera_48h'

const TIPO: Record<ColKey, 'texto' | 'num'> = {
  nombre_completo: 'texto',
  proceso: 'texto',
  unidad_negocio: 'texto',
  he_diurna_ord: 'num',
  he_nocturna: 'num',
  he_diurna_domfes: 'num',
  horas_extra_reales: 'num',
  meses_supera_48h: 'num',
}

// Formatea horas: 1 decimal, "—" si es 0 (para no saturar la tabla de ceros)
const fmtH = (h: number) => (h > 0 ? (Math.round(h * 10) / 10).toString() : '—')

export default function HorasExtrasTable({
  data,
}: {
  data: Fila[]
  desde: string
  hasta: string
}) {
  // Arranca por total de horas extra reales, mayor a menor (igual que la función SQL)
  const [sortKey, setSortKey] = useState<ColKey>('horas_extra_reales')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

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
        return String(a[sortKey] ?? '').localeCompare(String(b[sortKey] ?? ''), 'es') * dir
      }
      return ((a[sortKey] as number) - (b[sortKey] as number)) * dir
    })
    return copia
  }, [data, sortKey, sortDir])

  const flecha = (key: ColKey) =>
    key === sortKey ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''

  const thNum =
    'px-4 py-3 text-right font-semibold cursor-pointer select-none hover:text-[#00369C] bg-gray-50'
  const thTxt =
    'px-4 py-3 text-left font-semibold cursor-pointer select-none hover:text-[#00369C] bg-gray-50'

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500 leading-relaxed">
        <span className="font-semibold text-[#00369C]">Total HE</span>: horas extra
        reales del rango (diurna + nocturna + dominical/festiva), sin incluir recargos.
        Es la base del límite legal.{' '}
        <span className="font-semibold text-gray-700">Meses &gt;48h</span>: en cuántos
        meses del rango el colaborador superó el tope mensual de horas extra.{' '}
        Clic en un encabezado para ordenar.
      </p>

      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-gray-600">
            {/* Súper-grupos */}
            <tr className="border-b border-gray-200">
              <th rowSpan={2} onClick={() => ordenarPor('nombre_completo')} className={thTxt + ' align-bottom'}>
                Colaborador{flecha('nombre_completo')}
              </th>
              <th rowSpan={2} onClick={() => ordenarPor('proceso')} className={thTxt + ' align-bottom'}>
                Proceso{flecha('proceso')}
              </th>
              <th rowSpan={2} onClick={() => ordenarPor('unidad_negocio')} className={thTxt + ' align-bottom'}>
                Unidad de negocio{flecha('unidad_negocio')}
              </th>
              <th
                colSpan={4}
                className="px-4 py-1.5 text-center text-xs font-bold uppercase tracking-wide text-[#00369C] bg-blue-100 border-l-2 border-gray-300"
              >
                Horas extra (h)
              </th>
              <th
                rowSpan={2}
                onClick={() => ordenarPor('meses_supera_48h')}
                className={thNum + ' align-bottom border-l-2 border-gray-300'}
              >
                Meses &gt;48h{flecha('meses_supera_48h')}
              </th>
            </tr>
            {/* Columnas individuales del grupo Horas extra */}
            <tr className="border-b border-gray-200 bg-gray-50">
              <th onClick={() => ordenarPor('he_diurna_ord')} className={thNum + ' border-l-2 border-gray-300'}>
                Diurna{flecha('he_diurna_ord')}
              </th>
              <th onClick={() => ordenarPor('he_nocturna')} className={thNum}>
                Nocturna{flecha('he_nocturna')}
              </th>
              <th onClick={() => ordenarPor('he_diurna_domfes')} className={thNum}>
                Dom/Fes{flecha('he_diurna_domfes')}
              </th>
              <th onClick={() => ordenarPor('horas_extra_reales')} className={thNum + ' bg-gray-100'}>
                Total HE{flecha('horas_extra_reales')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filas.map((f) => (
              <tr key={f.dni} className="hover:bg-blue-50/50">
                <td className="px-4 py-3 text-gray-900 font-medium">
                  {f.nombre_completo ?? 'Sin dato'}
                </td>
                <td className="px-4 py-3 text-gray-600">{f.proceso}</td>
                <td className="px-4 py-3 text-gray-600">{f.unidad_negocio}</td>
                <td className="px-4 py-3 text-right text-gray-900 border-l-2 border-gray-200">
                  {fmtH(f.he_diurna_ord)}
                </td>
                <td className="px-4 py-3 text-right text-gray-900">{fmtH(f.he_nocturna)}</td>
                <td className="px-4 py-3 text-right text-gray-900">{fmtH(f.he_diurna_domfes)}</td>
                <td className="px-4 py-3 text-right font-bold text-gray-900 border-l border-gray-200 bg-gray-50">
                  {fmtH(f.horas_extra_reales)}
                </td>
                <td className="px-4 py-3 text-right border-l-2 border-gray-300">
                  {f.meses_supera_48h > 0 ? (
                    <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                      {f.meses_supera_48h}
                    </span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
              </tr>
            ))}
            {filas.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  Sin horas extra en el rango seleccionado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
