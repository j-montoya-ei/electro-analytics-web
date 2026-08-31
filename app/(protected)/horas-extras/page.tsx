// ═══════════════════════════════════════════════════════════
// Página Horas extras - Acumulado por colaborador
// Server Component: llama la función SQL por RPC y renderiza
// Fuente única (v1): fn_horas_extras_por_colaborador(desde, hasta)
// ═══════════════════════════════════════════════════════════
import { createClient } from '@/lib/supabase/server'
import HorasExtrasTable from '@/components/HorasExtrasTable'
import HorasExtrasFiltro from '@/components/HorasExtrasFiltro'
import HorasExtrasKpis from '@/components/HorasExtrasKpis'

// Fecha actual en horario Colombia (mismo patrón que Llegadas tarde / Inasistencias)
function bogotaNow() {
  const now = new Date()
  return new Date(now.toLocaleString('en-US', { timeZone: 'America/Bogota' }))
}
const pad = (n: number) => String(n).padStart(2, '0')

export type FilaHorasExtras = {
  dni: string
  nombre_completo: string | null
  proceso: string
  unidad_negocio: string
  meses_con_he: number
  // ─── Conceptos de hora extra (horas) ───
  he_diurna_ord: number
  he_nocturna: number
  he_diurna_domfes: number
  he_nocturna_domfes: number
  // ─── Agregados (horas) ───
  horas_extra_reales: number // 4 conceptos he_* — base del ranking y la alerta 48h
  total_recargos: number
  total_horas: number // extras + recargos (para costo futuro)
  meses_supera_48h: number // en cuántos meses del rango superó 48h
}

export default async function HorasExtrasPage({
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
    'fn_horas_extras_por_colaborador',
    { desde, hasta }
  )

  if (error) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm font-medium text-red-800">
            No se pudo cargar el reporte de horas extras
          </p>
          <p className="text-sm text-red-600 mt-1">{error.message}</p>
        </div>
      </div>
    )
  }

  const filas = (data ?? []) as FilaHorasExtras[]

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Horas extras</h2>
        <p className="text-sm text-gray-600 mt-1">
          {filas.length} colaboradores · {desde} a {hasta} · Electroingeniería S.A.S.
        </p>
      </div>

      <HorasExtrasFiltro desde={desde} hasta={hasta} />
      <HorasExtrasKpis data={filas} />
      <HorasExtrasTable data={filas} desde={desde} hasta={hasta} />
    </div>
  )
}
