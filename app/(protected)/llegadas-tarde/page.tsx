// ═══════════════════════════════════════════════════════════
// Página Llegadas tarde - Acumulado por colaborador (paso 2a)
// Server Component: llama la función SQL por RPC y renderiza
// Fuente única: fn_llegadas_tarde_por_colaborador(desde, hasta)
// ═══════════════════════════════════════════════════════════

import { createClient } from '@/lib/supabase/server'

// Fecha actual en horario Colombia (mismo patrón que Inasistencias)
function bogotaNow() {
  const now = new Date()
  return new Date(now.toLocaleString('en-US', { timeZone: 'America/Bogota' }))
}
const pad = (n: number) => String(n).padStart(2, '0')

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

export default async function LlegadasTardePage({
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

  const { data, error } = await supabase.rpc(
    'fn_llegadas_tarde_por_colaborador',
    { desde, hasta }
  )

  if (error) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm font-medium text-red-800">
            No se pudo cargar el reporte de llegadas tarde
          </p>
          <p className="text-sm text-red-600 mt-1">{error.message}</p>
        </div>
      </div>
    )
  }

  const filas = (data ?? []) as Fila[]

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Llegadas tarde</h2>
        <p className="text-sm text-gray-600 mt-1">
          {filas.length} colaboradores · {desde} a {hasta} · Electroingeniería S.A.S.
        </p>
      </div>

      {/* Tabla mínima de verificación · la UI final (encabezados agrupados
          + selector de fechas) llega en el paso 2b */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left font-semibold px-4 py-3">Colaborador</th>
              <th className="text-left font-semibold px-4 py-3">Proceso</th>
              <th className="text-right font-semibold px-4 py-3">Días superó tolerancia</th>
              <th className="text-right font-semibold px-4 py-3">Min. fuera de tolerancia</th>
              <th className="text-right font-semibold px-4 py-3">Días entró tarde</th>
              <th className="text-right font-semibold px-4 py-3">Min. desde su hora</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filas.map((f) => (
              <tr key={f.trab_id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-900">{f.nombre_completo}</td>
                <td className="px-4 py-3 text-gray-600">{f.area}</td>
                <td className="px-4 py-3 text-right text-gray-900">{f.tardanzas_oficiales}</td>
                <td className="px-4 py-3 text-right font-semibold text-gray-900">{f.minutos_oficiales}</td>
                <td className="px-4 py-3 text-right text-gray-600">{f.dias_despues_teorica}</td>
                <td className="px-4 py-3 text-right text-gray-600">{f.minutos_teoricos}</td>
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
