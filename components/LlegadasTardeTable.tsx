'use client'

import { useMemo, useState } from 'react'

type Fila = {
  trab_id: string
  nombre_completo: string
  area: string
  dias_evaluados: number
  tardanzas_oficiales: number
  minutos_oficiales: number
  dias_despues_teorica: number
  minutos_teoricos: number
}

type ColKey =
  | 'nombre_completo'
  | 'area'
  | 'tardanzas_oficiales'
  | 'minutos_oficiales'
  | 'dias_despues_teorica'
  | 'minutos_teoricos'

const TIPO: Record<ColKey, 'texto' | 'num'> = {
  nombre_completo: 'texto',
  area: 'texto',
  tardanzas_oficiales: 'num',
  minutos_oficiales: 'num',
  dias_despues_teorica: 'num',
  minutos_teoricos: 'num',
}

export default function LlegadasTardeTable({ data }: { data: Fila[] }) {
  // Arranca por la métrica principal, mayor a menor (igual que la función SQL)
  const [sortKey, setSortKey] = useState<ColKey>('minutos_oficiales')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  function ordenarPor(key: ColKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      // Primer clic: numéricas mayor→menor, texto A→Z
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
    'px-4 py-2 text-right font-semibold cursor-pointer select-none hover:text-[#00369C]'
  const thTxt =
    'px-4 py-3 text-left font-semibold cursor-pointer select-none hover:text-[#00369C] align-bottom bg-gray-50'

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500 leading-relaxed">
        <span className="font-semibold text-[#00369C]">Superó la tolerancia</span>:
        minutos pasados del límite de gracia de su turno (tardanza formal, base de
        descuento).{' '}
        <span className="font-semibold text-gray-600">Entró después de su hora</span>:
        minutos desde su hora oficial (incluye lo consumido dentro de la gracia). Clic
        en cualquier encabezado para ordenar.
      </p>

      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-gray-600">
            {/* Encabezados de grupo */}
            <tr className="border-b border-gray-200">
              <th rowSpan={2} onClick={() => ordenarPor('nombre_completo')} className={thTxt}>
                Colaborador{flecha('nombre_completo')}
              </th>
              <th rowSpan={2} onClick={() => ordenarPor('area')} className={thTxt}>
                Proceso{flecha('area')}
              </th>
              <th
                colSpan={2}
                className="px-4 py-2 text-center text-xs font-bold uppercase tracking-wide text-[#00369C] bg-blue-50 border-l border-gray-200"
              >
                Superó la tolerancia
              </th>
              <th
                colSpan={2}
                className="px-4 py-2 text-center text-xs font-bold uppercase tracking-wide text-gray-500 bg-gray-50 border-l border-gray-200"
              >
                Entró después de su hora
              </th>
            </tr>
            {/* Columnas individuales */}
            <tr className="border-b border-gray-200 bg-gray-50">
              <th onClick={() => ordenarPor('tardanzas_oficiales')} className={thNum + ' border-l border-gray-200'}>
                Días{flecha('tardanzas_oficiales')}
              </th>
              <th onClick={() => ordenarPor('minutos_oficiales')} className={thNum}>
                Minutos{flecha('minutos_oficiales')}
              </th>
              <th onClick={() => ordenarPor('dias_despues_teorica')} className={thNum + ' border-l border-gray-200'}>
                Días{flecha('dias_despues_teorica')}
              </th>
              <th onClick={() => ordenarPor('minutos_teoricos')} className={thNum}>
                Minutos{flecha('minutos_teoricos')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filas.map((f) => (
              <tr key={f.trab_id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-900">{f.nombre_completo}</td>
                <td className="px-4 py-3 text-gray-600">{f.area}</td>
                <td className="px-4 py-3 text-right text-gray-900 border-l border-gray-100">
                  {f.tardanzas_oficiales}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-gray-900">
                  {f.minutos_oficiales}
                </td>
                <td className="px-4 py-3 text-right text-gray-600 border-l border-gray-100">
                  {f.dias_despues_teorica}
                </td>
                <td className="px-4 py-3 text-right text-gray-600">
                  {f.minutos_teoricos}
                </td>
              </tr>
            ))}
            {filas.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  Sin llegadas tarde en el rango seleccionado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
