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
  // ─── Tarde (regreso de almuerzo) ───
  tardanzas_tarde: number
  minutos_tarde_oficiales: number
  dias_despues_tarde: number
  minutos_tarde_teoricos: number
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
}

export default function LlegadasTardeTable({ data }: { data: Fila[] }) {
  // Arranca por la métrica principal de mañana, mayor a menor (igual que la función SQL)
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
        minutos desde su hora oficial (incluye lo consumido dentro de la gracia).{' '}
        Los bloques <span className="font-semibold">Mañana</span> miden la entrada;{' '}
        <span className="font-semibold">Tarde</span> mide el regreso de almuerzo
        (solo turnos con almuerzo definido). Clic en cualquier encabezado para ordenar.
      </p>

      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-gray-600">
            {/* Encabezados de grupo */}
            <tr className="border-b border-gray-200">
              <th rowSpan={3} onClick={() => ordenarPor('nombre_completo')} className={thTxt}>
                Colaborador{flecha('nombre_completo')}
              </th>
              <th rowSpan={3} onClick={() => ordenarPor('area')} className={thTxt}>
                Proceso{flecha('area')}
              </th>
              {/* Súper-grupo MAÑANA */}
              <th
                colSpan={4}
                className="px-4 py-1.5 text-center text-xs font-bold uppercase tracking-wide text-[#00369C] bg-blue-100 border-l-2 border-gray-300"
              >
                Mañana · Entrada
              </th>
              {/* Súper-grupo TARDE */}
              <th
                colSpan={4}
                className="px-4 py-1.5 text-center text-xs font-bold uppercase tracking-wide text-amber-700 bg-amber-100 border-l-2 border-gray-300"
              >
                Tarde · Regreso almuerzo
              </th>
            </tr>
            {/* Sub-grupos */}
            <tr className="border-b border-gray-200">
              <th
                colSpan={2}
                className="px-4 py-2 text-center text-xs font-bold uppercase tracking-wide text-[#00369C] bg-blue-50 border-l-2 border-gray-300"
              >
                Superó la tolerancia
              </th>
              <th
                colSpan={2}
                className="px-4 py-2 text-center text-xs font-bold uppercase tracking-wide text-gray-500 bg-gray-50 border-l border-gray-200"
              >
                Entró después de su hora
              </th>
              <th
                colSpan={2}
                className="px-4 py-2 text-center text-xs font-bold uppercase tracking-wide text-amber-700 bg-amber-50 border-l-2 border-gray-300"
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
              {/* Mañana - tolerancia */}
              <th onClick={() => ordenarPor('tardanzas_oficiales')} className={thNum + ' border-l-2 border-gray-300'}>
                Días{flecha('tardanzas_oficiales')}
              </th>
              <th onClick={() => ordenarPor('minutos_oficiales')} className={thNum}>
                Minutos{flecha('minutos_oficiales')}
              </th>
              {/* Mañana - después de hora */}
              <th onClick={() => ordenarPor('dias_despues_teorica')} className={thNum + ' border-l border-gray-200'}>
                Días{flecha('dias_despues_teorica')}
              </th>
              <th onClick={() => ordenarPor('minutos_teoricos')} className={thNum}>
                Minutos{flecha('minutos_teoricos')}
              </th>
              {/* Tarde - tolerancia */}
              <th onClick={() => ordenarPor('tardanzas_tarde')} className={thNum + ' border-l-2 border-gray-300'}>
                Días{flecha('tardanzas_tarde')}
              </th>
              <th onClick={() => ordenarPor('minutos_tarde_oficiales')} className={thNum}>
                Minutos{flecha('minutos_tarde_oficiales')}
              </th>
              {/* Tarde - después de hora */}
              <th onClick={() => ordenarPor('dias_despues_tarde')} className={thNum + ' border-l border-gray-200'}>
                Días{flecha('dias_despues_tarde')}
              </th>
              <th onClick={() => ordenarPor('minutos_tarde_teoricos')} className={thNum}>
                Minutos{flecha('minutos_tarde_teoricos')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filas.map((f) => (
              <tr key={f.trab_id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-900">{f.nombre_completo}</td>
                <td className="px-4 py-3 text-gray-600">{f.area}</td>
                {/* Mañana - tolerancia */}
                <td className="px-4 py-3 text-right text-gray-900 border-l-2 border-gray-200">
                  {f.tardanzas_oficiales}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-gray-900">
                  {f.minutos_oficiales}
                </td>
                {/* Mañana - después de hora */}
                <td className="px-4 py-3 text-right text-gray-600 border-l border-gray-100">
                  {f.dias_despues_teorica}
                </td>
                <td className="px-4 py-3 text-right text-gray-600">
                  {f.minutos_teoricos}
                </td>
                {/* Tarde - tolerancia */}
                <td className="px-4 py-3 text-right text-gray-900 border-l-2 border-gray-200">
                  {f.tardanzas_tarde}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-amber-800">
                  {f.minutos_tarde_oficiales}
                </td>
                {/* Tarde - después de hora */}
                <td className="px-4 py-3 text-right text-gray-600 border-l border-gray-100">
                  {f.dias_despues_tarde}
                </td>
                <td className="px-4 py-3 text-right text-gray-600">
                  {f.minutos_tarde_teoricos}
                </td>
              </tr>
            ))}
            {filas.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
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
