// ═══════════════════════════════════════════════════════════
// Componente DataTable - Tabla interactiva genérica (cliente)
// Buscador + orden + paginación · esquema-agnóstica
// Responsive: tabla en ≥md, tarjetas apiladas en móvil
// Ubicación: components/DataTable.tsx  (componente ÚNICO de tabla)
// ═══════════════════════════════════════════════════════════

'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

type Row = Record<string, unknown>

// 'nombre_completo' → 'Nombre Completo'
function prettifyHeader(key: string) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Sí' : 'No'
  return String(value)
}

export default function DataTable({
  data,
  searchPlaceholder = 'Buscar...',
  emptyMessage = 'No hay registros para mostrar.',
  pageSize = 25,
}: {
  data: Row[]
  searchPlaceholder?: string
  emptyMessage?: ReactNode
  pageSize?: number
}) {
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(1)

  const columns = useMemo(
    () => (data.length ? Object.keys(data[0]) : []),
    [data]
  )

  const filtered = useMemo(() => {
    let rows = data

    if (query.trim()) {
      const q = query.toLowerCase()
      rows = rows.filter((row) =>
        Object.values(row).some((v) =>
          String(v ?? '').toLowerCase().includes(q)
        )
      )
    }

    if (sortKey) {
      rows = [...rows].sort((a, b) => {
        const av = a[sortKey]
        const bv = b[sortKey]
        if (av == null) return 1
        if (bv == null) return -1
        if (av < bv) return sortDir === 'asc' ? -1 : 1
        if (av > bv) return sortDir === 'asc' ? 1 : -1
        return 0
      })
    }

    return rows
  }, [data, query, sortKey, sortDir])

  // Vuelve a la página 1 cuando cambia el filtro o el orden
  useEffect(() => {
    setPage(1)
  }, [query, sortKey, sortDir])

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const current = Math.min(page, totalPages)
  const start = (current - 1) * pageSize
  const pageRows = filtered.slice(start, start + pageSize)

  // Ícono de orden por columna (encabezados de la tabla desktop)
  const sortIcon = (col: string) =>
    sortKey === col ? (
      sortDir === 'asc' ? (
        <ArrowUp className="h-3.5 w-3.5" />
      ) : (
        <ArrowDown className="h-3.5 w-3.5" />
      )
    ) : (
      <ArrowUpDown className="h-3.5 w-3.5 text-gray-300" />
    )

  // Sin datos de origen
  if (!data.length) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
        <p className="text-sm text-gray-600">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Barra superior: buscador + orden (el orden por select solo en móvil) */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm text-gray-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#00369C]"
          />
        </div>

        {/* Orden para móvil: en desktop se ordena tocando los encabezados */}
        <div className="flex items-center gap-2 md:hidden">
          <label className="text-xs text-gray-500">Ordenar</label>
          <select
            value={sortKey ?? ''}
            onChange={(e) => setSortKey(e.target.value || null)}
            className="rounded-lg border border-gray-300 py-1.5 pl-2 pr-7 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#00369C]"
          >
            <option value="">Sin orden</option>
            {columns.map((c) => (
              <option key={c} value={c}>
                {prettifyHeader(c)}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
            disabled={!sortKey}
            aria-label="Cambiar dirección de orden"
            className="rounded-lg border border-gray-300 p-1.5 text-gray-600 disabled:opacity-40"
          >
            {sortDir === 'asc' ? (
              <ArrowUp className="h-4 w-4" />
            ) : (
              <ArrowDown className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
          <p className="text-sm text-gray-600">
            No se encontraron resultados para “{query}”.
          </p>
        </div>
      ) : (
        <>
          {/* ── Vista tabla (≥ md) ─────────────────────────────── */}
          <div className="hidden overflow-hidden rounded-xl border border-gray-200 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.06)] md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-200 bg-gray-50">
                  <tr>
                    {columns.map((col) => (
                      <th
                        key={col}
                        onClick={() => toggleSort(col)}
                        className="cursor-pointer select-none whitespace-nowrap px-4 py-3 text-left font-semibold text-gray-700 hover:bg-gray-100"
                      >
                        <span className="inline-flex items-center gap-1.5">
                          {prettifyHeader(col)}
                          {sortIcon(col)}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pageRows.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50/70">
                      {columns.map((col) => (
                        <td
                          key={col}
                          className="whitespace-nowrap px-4 py-3 text-gray-700"
                        >
                          {formatValue(row[col])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Vista tarjetas (< md) ──────────────────────────── */}
          <div className="space-y-3 md:hidden">
            {pageRows.map((row, i) => (
              <div
                key={i}
                className="rounded-xl border border-gray-200 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.06)]"
              >
                <dl className="space-y-1.5">
                  {columns.map((col) => (
                    <div
                      key={col}
                      className="flex items-start justify-between gap-3"
                    >
                      <dt className="shrink-0 text-xs font-medium text-gray-500">
                        {prettifyHeader(col)}
                      </dt>
                      <dd className="text-right text-sm text-gray-900">
                        {formatValue(row[col])}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>

          {/* ── Paginación ─────────────────────────────────────── */}
          <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            <p className="text-xs text-gray-500">
              Mostrando {start + 1}–
              {Math.min(start + pageSize, filtered.length)} de {filtered.length}
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={current === 1}
                aria-label="Página anterior"
                className="rounded-lg border border-gray-300 p-1.5 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-transparent"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-2 text-sm text-gray-600">
                Página {current} de {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={current === totalPages}
                aria-label="Página siguiente"
                className="rounded-lg border border-gray-300 p-1.5 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-transparent"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
