// ═══════════════════════════════════════════════════════════
// Componente DataTable - Tabla interactiva genérica (cliente)
// Buscador + orden por columna + paginación · esquema-agnóstica
// ═══════════════════════════════════════════════════════════

'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

type Row = Record<string, unknown>

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
  emptyMessage?: string
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

  // Reinicia a la página 1 cuando cambia el filtro o el orden
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

  if (!data.length) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <p className="text-sm text-gray-600">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#00369C] focus:border-transparent"
        />
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col}
                    onClick={() => toggleSort(col)}
                    className="px-4 py-3 text-left font-semibold text-gray-700 whitespace-nowrap cursor-pointer select-none hover:bg-gray-100"
                  >
                    <span className="inline-flex items-center gap-1">
                      {prettifyHeader(col)}
                      {sortKey === col ? (
                        sortDir === 'asc' ? (
                          <ArrowUp className="w-3.5 h-3.5" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-gray-300" />
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pageRows.map((row, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  {columns.map((col) => (
                    <td
                      key={col}
                      className="px-4 py-3 text-gray-700 whitespace-nowrap"
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

      {/* Paginación */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">
          {filtered.length === 0
            ? 'Sin resultados'
            : `Mostrando ${start + 1}–${Math.min(
                start + pageSize,
                filtered.length
              )} de ${filtered.length}`}
        </p>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={current <= 1}
            className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Anterior
          </button>

          <span className="text-sm text-gray-600 px-1">
            Página {current} de {totalPages}
          </span>

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={current >= totalPages}
            className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Siguiente
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
