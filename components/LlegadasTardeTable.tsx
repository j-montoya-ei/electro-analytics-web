'use client'

import { useEffect, useMemo, useState } from 'react'
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

const PAGE_SIZE = 20

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
  const [pagina, setPagina] = useState(1)

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

  const totalPaginas = Math.max(1, Math.ceil(filas.length / PAGE_SIZE))
  const filasVisibles = filas.slice((pagina - 1) * PAGE_SIZE, pagina * PAGE_SIZE)

  useEffect(() => {
    setPagina(1)
  }, [data, sortKey, sortDir])

  useEffect(() => {
    if (pagina > totalPaginas) setPagina(totalPaginas)
  }, [pagina, totalPaginas])

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

      <div className="overflow-hidden rounded-xl border border-gray-200/80 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[860px] w-full text-sm">
            <thead className="sticky top-0 z-10 text-gray-700 font-semibold">
              {/* Fila superior de Categorías de Agrupación */}
              <tr className="border-b border-gray-200 bg-gray-50 text-xs">
                <th rowSpan={2} onClick={() => ordenarPor('nombre_completo')} className={thTxt + ' sticky left-0 z-20 bg-gray-50'}>
                  Colaborador{flecha('nombre_completo')}
                </th>
                <th rowSpan={2} onClick={() => ordenarPor('area')} className={thTxt + ' sticky left-[190px] z-20 bg-gray-50'}>
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
              <tr className="border-b border-gray-200 bg-white text-[11px] text-gray-500">
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
              {filasVisibles.map((f) => (
                <tr
                  key={f.trab_id}
                  onClick={() => setSeleccionado(f)}
                  className="group cursor-pointer border-b border-gray-100 transition-colors odd:bg-white even:bg-slate-50/35 hover:bg-blue-50/50 focus-within:bg-blue-50/50"
                  title={`Ver detalle de ${f.nombre_completo}`}
                >
                  <td className="sticky left-0 z-10 bg-inherit px-4 py-3 font-semibold text-gray-900 group-hover:bg-blue-50/50">{f.nombre_completo}</td>
                  <td className="sticky left-[190px] z-10 bg-inherit px-4 py-3 text-xs text-gray-600 group-hover:bg-blue-50/50">{f.area}</td>
                  
                  {/* Mañana */}
                  <td className="border-l border-gray-100 px-3 py-3 text-right text-gray-600">{f.tardanzas_oficiales}</td>
                  <td className={`px-3 py-3 text-right font-semibold ${f.minutos_oficiales > 0 ? 'text-gray-900' : 'text-gray-400'}`}>{f.minutos_oficiales}</td>

                  {/* Tarde */}
                  <td className="border-l border-gray-100 px-3 py-3 text-right text-gray-600">{f.tardanzas_tarde}</td>
                  <td className={`px-3 py-3 text-right font-semibold ${f.minutos_tarde_oficiales > 0 ? 'text-amber-700' : 'text-gray-400'}`}>{f.minutos_tarde_oficiales}</td>

                  {/* Totales */}
                  <td className="border-l border-gray-200 bg-blue-50/20 px-3 py-3 text-right font-bold text-gray-900">{f.total_dias}</td>
                  <td className="bg-blue-50/20 px-3 py-3 text-right font-bold text-[#00369C]">{f.total_minutos}</td>
                </tr>
              ))}
              {filas.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-gray-400">
                    No se registran llegadas tarde en el rango de fechas seleccionado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {filas.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-gray-200 bg-gray-50/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-gray-500">
              Mostrando {((pagina - 1) * PAGE_SIZE) + 1}–{Math.min(pagina * PAGE_SIZE, filas.length)} de {filas.length} colaboradores
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
                disabled={pagina === 1}
                className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:border-[#00369C] hover:text-[#00369C] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Anterior
              </button>
              {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((numero) => (
                <button
                  key={numero}
                  type="button"
                  onClick={() => setPagina(numero)}
                  className={`min-w-8 rounded-md px-2 py-1.5 text-xs font-semibold transition ${
                    pagina === numero
                      ? 'bg-[#00369C] text-white shadow-sm'
                      : 'border border-gray-200 bg-white text-gray-600 hover:border-[#00369C] hover:text-[#00369C]'
                  }`}
                  aria-current={pagina === numero ? 'page' : undefined}
                >
                  {numero}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                disabled={pagina === totalPaginas}
                className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:border-[#00369C] hover:text-[#00369C] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
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
