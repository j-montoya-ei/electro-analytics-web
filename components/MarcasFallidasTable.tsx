// ═══════════════════════════════════════════════════════════
// Tabla de ranking de Marcas fallidas (client component)
// Paginación (20 por página, patrón de LlegadasTardeTable) +
// filas clicables → abren el drilldown del colaborador.
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

const PAGE_SIZE = 20

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
  const [pagina, setPagina] = useState(1)

  const totalPaginas = Math.max(1, Math.ceil(data.length / PAGE_SIZE))
  const paginaActual = Math.min(pagina, totalPaginas)
  const inicio = (paginaActual - 1) * PAGE_SIZE
  const visibles = data.slice(inicio, inicio + PAGE_SIZE)

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
            {visibles.map((c, i) => (
              <tr
                key={c.rut}
                onClick={() => setSel({ rut: c.rut, nombre: c.nombre })}
                className="cursor-pointer hover:bg-blue-50/40"
              >
                <td className="px-5 py-3 text-gray-400">{inicio + i + 1}</td>
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

      {data.length > 0 && (
        <div className="flex flex-col gap-3 border-t border-gray-200 bg-gray-50/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-gray-500">
            Mostrando {inicio + 1}–{Math.min(inicio + PAGE_SIZE, data.length)} de {data.length} colaboradores
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPagina((p) => Math.max(1, p - 1))}
              disabled={paginaActual === 1}
              className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:border-[#00369C] hover:text-[#00369C] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Anterior
            </button>
            {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((numero) => (
              <button
                key={numero}
                type="button"
                onClick={() => setPagina(numero)}
                aria-current={paginaActual === numero ? 'page' : undefined}
                className={`min-w-8 rounded-md px-2 py-1.5 text-xs font-semibold transition ${
                  paginaActual === numero
                    ? 'bg-[#00369C] text-white shadow-sm'
                    : 'border border-gray-200 bg-white text-gray-600 hover:border-[#00369C] hover:text-[#00369C]'
                }`}
              >
                {numero}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
              disabled={paginaActual === totalPaginas}
              className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:border-[#00369C] hover:text-[#00369C] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

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
