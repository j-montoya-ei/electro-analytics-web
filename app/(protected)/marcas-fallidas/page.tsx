// ═══════════════════════════════════════════════════════════
// Página Marcas fallidas (Requerimiento #5)
// Server Component: llama las funciones SQL por RPC y renderiza
//   - fn_marcas_fallidas_por_colaborador(desde, hasta)  → ranking
//   - fn_marcas_fallidas_por_error(desde, hasta)         → frecuencia
// El detalle por colaborador (drilldown) lo maneja MarcasFallidasTable.
//
// Ubicación: app/(protected)/marcas-fallidas/page.tsx
// ═══════════════════════════════════════════════════════════

import { createClient } from '@/lib/supabase/server'
import MarcasFallidasFiltro from '@/components/MarcasFallidasFiltro'
import CargarMarcasFallidasBoton from '@/components/CargarMarcasFallidasBoton'
import MarcasFallidasTable from '@/components/MarcasFallidasTable'
import { AlertTriangle, Users, Fingerprint } from 'lucide-react'

function bogotaNow() {
  const now = new Date()
  return new Date(now.toLocaleString('en-US', { timeZone: 'America/Bogota' }))
}
const pad = (n: number) => String(n).padStart(2, '0')

type FilaColab = {
  rut: string
  nombre: string
  total_fallas: number
  fallas_entrada: number
  fallas_salida: number
}
type FilaError = { error: string; total: number }

export default async function MarcasFallidasPage({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; hasta?: string }>
}) {
  const { desde: qDesde, hasta: qHasta } = await searchParams

  // Rango por defecto: mes en curso (Colombia)
  const d = bogotaNow()
  const year = d.getFullYear()
  const month = d.getMonth() + 1
  const ultimoDia = new Date(year, month, 0).getDate()
  const desde = qDesde ?? `${year}-${pad(month)}-01`
  const hasta = qHasta ?? `${year}-${pad(month)}-${pad(ultimoDia)}`

  const supabase = await createClient()
  const [colabRes, errorRes] = await Promise.all([
    supabase.rpc('fn_marcas_fallidas_por_colaborador', { desde, hasta }),
    supabase.rpc('fn_marcas_fallidas_por_error', { desde, hasta }),
  ])

  if (colabRes.error || errorRes.error) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm font-medium text-red-800">
            No se pudo cargar el reporte de marcas fallidas
          </p>
          <p className="text-sm text-red-600 mt-1">
            {colabRes.error?.message ?? errorRes.error?.message}
          </p>
        </div>
      </div>
    )
  }

  const colaboradores = ((colabRes.data ?? []) as FilaColab[]).map((c) => ({
    ...c,
    total_fallas: Number(c.total_fallas),
    fallas_entrada: Number(c.fallas_entrada),
    fallas_salida: Number(c.fallas_salida),
  }))
  const errores = ((errorRes.data ?? []) as FilaError[]).map((e) => ({
    ...e,
    total: Number(e.total),
  }))

  const totalFallas = colaboradores.reduce((s, c) => s + c.total_fallas, 0)
  const errorTop = errores[0]

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Marcas fallidas</h2>
          <p className="text-sm text-gray-600 mt-1">
            {colaboradores.length} colaboradores · {desde} a {hasta} · Electroingeniería S.A.S.
          </p>
          <p className="mt-2 text-sm leading-6 text-gray-500">
            Intentos de marcaje con error y colaboradores con mayor número de inconsistencias en el período.
          </p>
        </div>
        <CargarMarcasFallidasBoton />
      </div>

      <MarcasFallidasFiltro desde={desde} hasta={hasta} />

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Total marcas fallidas
            </p>
            <AlertTriangle className="h-5 w-5 text-amber-500" />
          </div>
          <p className="mt-2 text-3xl font-bold text-gray-900">{totalFallas}</p>
        </div>

        <div className="rounded-xl border border-gray-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Colaboradores afectados
            </p>
            <Users className="h-5 w-5 text-[#00369C]" />
          </div>
          <p className="mt-2 text-3xl font-bold text-gray-900">{colaboradores.length}</p>
        </div>

        <div className="rounded-xl border border-gray-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Error más frecuente
            </p>
            <Fingerprint className="h-5 w-5 text-[#00369C]" />
          </div>
          {errorTop ? (
            <>
              <p className="mt-2 text-sm font-semibold leading-snug text-gray-900">
                {errorTop.error}
              </p>
              <p className="text-xs text-gray-500">{errorTop.total} ocurrencias</p>
            </>
          ) : (
            <p className="mt-2 text-3xl font-bold text-gray-400">—</p>
          )}
        </div>
      </div>

      {/* Ranking por colaborador (con drilldown) */}
      <MarcasFallidasTable data={colaboradores} desde={desde} hasta={hasta} />

      {/* Frecuencia por tipo de error */}
      {errores.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-gray-200/80 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-5 py-3">
            <h3 className="text-sm font-semibold text-gray-800">Tipos de error más frecuentes</h3>
          </div>
          <ul className="divide-y divide-gray-100">
            {errores.map((e) => {
              const pct = totalFallas > 0 ? Math.round((e.total / totalFallas) * 100) : 0
              return (
                <li key={e.error} className="flex items-center gap-4 px-5 py-3">
                  <span className="flex-1 text-sm text-gray-700">{e.error}</span>
                  <div className="hidden h-2 w-40 overflow-hidden rounded-full bg-gray-100 sm:block">
                    <div
                      className="h-full rounded-full bg-[#00369C]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-16 text-right text-sm font-semibold text-gray-900">
                    {e.total} <span className="font-normal text-gray-400">({pct}%)</span>
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
