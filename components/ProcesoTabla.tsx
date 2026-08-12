// ═══════════════════════════════════════════════════════════
// ProcesoTabla - Tabla de puntualidad por proceso, expandible.
// Clic en un proceso → despliega las personas que más llegan tarde.
// ═══════════════════════════════════════════════════════════
'use client'

import { Fragment, useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Search } from 'lucide-react'

type Persona = { nombre: string; tardanzas: number }

export type FilaProceso = {
  proceso: string
  evaluadas: number
  tarde: number
  aTiempo: number
  pct: number
  promMin: number | null
  personas: Persona[]
}

export default function ProcesoTabla({ filas }: { filas: FilaProceso[] }) {
  const [abierto, setAbierto] = useState<string | null>(null)
  const [q, setQ] = useState('')

  const visibles = useMemo(() => {
    const t = q.trim().toLowerCase()
    return t ? filas.filter((f) => f.proceso.toLowerCase().includes(t)) : filas
  }, [filas, q])

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="p-3 border-b border-gray-100">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar proceso..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#00369C]/30"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-100">
              <th className="px-4 py-3 font-medium">Proceso</th>
              <th className="px-4 py-3 font-medium">Evaluadas</th>
              <th className="px-4 py-3 font-medium">Tarde</th>
              <th className="px-4 py-3 font-medium">A tiempo</th>
              <th className="px-4 py-3 font-medium">% Puntualidad</th>
              <th className="px-4 py-3 font-medium">Prom. min. tarde</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {visibles.map((f) => {
              const open = abierto === f.proceso
              const clickable = f.personas.length > 0
              return (
                <Fragment key={f.proceso}>
                  <tr
                    onClick={() => clickable && setAbierto(open ? null : f.proceso)}
                    className={clickable ? 'cursor-pointer hover:bg-gray-50' : ''}
                  >
                    <td className="px-4 py-3 text-gray-800 whitespace-nowrap">
                      <span className="inline-flex items-center gap-2">
                        {clickable ? (
                          open ? (
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          )
                        ) : (
                          <span className="w-4 h-4 inline-block" />
                        )}
                        {f.proceso}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{f.evaluadas}</td>
                    <td className="px-4 py-3 text-gray-700">{f.tarde}</td>
                    <td className="px-4 py-3 text-gray-700">{f.aTiempo}</td>
                    <td className="px-4 py-3 text-gray-700">{f.pct}%</td>
                    <td className="px-4 py-3 text-gray-700">{f.promMin ?? '—'}</td>
                  </tr>

                  {open && clickable && (
                    <tr className="bg-gray-50">
                      <td colSpan={6} className="px-4 py-3">
                        <p className="text-xs font-medium text-gray-500 mb-2">
                          Quién llega tarde en {f.proceso}
                        </p>
                        <ul className="space-y-1 max-w-md">
                          {f.personas.map((p) => (
                            <li
                              key={p.nombre}
                              className="flex items-center justify-between text-sm text-gray-700"
                            >
                              <span>{p.nombre}</span>
                              <span className="text-gray-500">
                                {p.tardanzas} {p.tardanzas === 1 ? 'vez' : 'veces'}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
