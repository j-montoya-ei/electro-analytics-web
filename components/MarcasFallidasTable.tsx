// ═══════════════════════════════════════════════════════════
// Tabla de ranking de Marcas fallidas (client component)
// Filas clicables → abren el drilldown del colaborador.
//
// Ubicación: components/MarcasFallidasTable.tsx
// ═══════════════════════════════════════════════════════════

'use client'

import { useState } from 'react'
import MarcasFallidasDrilldown from './MarcasFallidasDrilldown'

type FilaColab = {
  rut: string
  nombre: string
  total_fallas: number
  fallas_entrada: number
  fallas_salida: number
}

export default function MarcasFallidasTable({
  data,
  desde,
  hasta,
}: {
  data: FilaColab[]
  desde: string
  hasta: string
}) {
  const [sel, setSel] = useState<{ rut: string; nombre: string } | null>(null)

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200/80 bg-white shadow-sm">
      <div className="border-b border-gray-200 px-5 py-3">
        <h3 className="text-sm font-semibold text-gray-800">
          Ranking de colaboradores por inconsistencias
        </h3>
        <p className="mt-0.5 text-xs text-gray-400">
          Haz clic en un colaborador para ver el detalle de sus intentos fallidos.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-5 py-3 text-left font-semibold">#</th>
              <th className="px-5 py-3 text-left font-semibold">Colaborador</th>
              <th className="px-5 py-3 text-left font-semibold">Documento</th>
              <th className="px-3 py-3 text-right font-semibold">Entrada</th>
              <th className="px-3 py-3 text-right font-semibold">Salida</th>
              <th className="px-5 py-3 text-right font-semibold">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((c, i) => (
              <tr
                key={c.rut}
                onClick={() => setSel({ rut: c.rut, nombre: c.nombre })}
                className="cursor-pointer hover:bg-blue-50/40"
              >
                <td className="px-5 py-3 text-gray-400">{i + 1}</td>
                <td className="px-5 py-3 font-medium text-gray-900">{c.nombre}</td>
                <td className="px-5 py-3 text-gray-500">{c.rut}</td>
                <td className="px-3 py-3 text-right text-gray-600">{c.fallas_entrada}</td>
                <td className="px-3 py-3 text-right text-gray-600">{c.fallas_salida}</td>
                <td className="px-5 py-3 text-right font-bold text-[#00369C]">{c.total_fallas}</td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-sm text-gray-400">
                  No se registran marcas fallidas en el rango seleccionado. Usa &ldquo;Cargar
                  marcas fallidas&rdquo; para subir el reporte de Buk.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {sel && (
        <MarcasFallidasDrilldown
          rut={sel.rut}
          nombre={sel.nombre}
          desde={desde}
          hasta={hasta}
          onClose={() => setSel(null)}
        />
      )}
    </div>
  )
}
