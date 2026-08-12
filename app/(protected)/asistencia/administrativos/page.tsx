// ═══════════════════════════════════════════════════════════
// Puntualidad - KPIs + tabla por proceso expandible.
// Hoy: personal administrativo (ADMON L-V), entrada de mañana.
// (a futuro se amplía a toda la empresa)
// ═══════════════════════════════════════════════════════════

import { createClient } from '@/lib/supabase/server'
import KpiCard from '@/components/KpiCard'
import ProcesoTabla, { FilaProceso } from '@/components/ProcesoTabla'
import { Clock, UserCheck, AlertTriangle, Database } from 'lucide-react'

export const dynamic = 'force-dynamic'

const ADMIN_VIEW = 'vw_puntualidad_admin'
const AREA_VIEW = 'vw_puntualidad_admin_por_area'

const fmtFecha = (f?: string | null) =>
  f
    ? new Date(f + 'T00:00:00').toLocaleDateString('es-CO', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '—'

export default async function PuntualidadPage() {
  const supabase = await createClient()

  const [totalRes, tardeRes, minRes, maxRes, area, lateRows] = await Promise.all([
    supabase.from(ADMIN_VIEW).select('*', { count: 'exact', head: true }).eq('momento', 'entrada'),
    supabase
      .from(ADMIN_VIEW)
      .select('*', { count: 'exact', head: true })
      .eq('momento', 'entrada')
      .eq('llego_tarde', true),
    supabase
      .from(ADMIN_VIEW)
      .select('fecha_entrada')
      .eq('momento', 'entrada')
      .order('fecha_entrada', { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from(ADMIN_VIEW)
      .select('fecha_entrada')
      .eq('momento', 'entrada')
      .order('fecha_entrada', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from(AREA_VIEW).select('*'),
    supabase
      .from(ADMIN_VIEW)
      .select('nombre_completo, area')
      .eq('momento', 'entrada')
      .eq('llego_tarde', true)
      .limit(1000),
  ])

  const total = totalRes.count ?? 0
  const tardeN = tardeRes.count ?? 0
  const aTiempo = total - tardeN
  const pct = total > 0 ? ((aTiempo / total) * 100).toFixed(1) + '%' : '—'

  // Agrupar las llegadas tarde por área → conteo por persona
  const porArea = new Map<string, Map<string, number>>()
  for (const r of lateRows.data ?? []) {
    const a = r.area ?? '—'
    const m = porArea.get(a) ?? new Map<string, number>()
    m.set(r.nombre_completo, (m.get(r.nombre_completo) ?? 0) + 1)
    porArea.set(a, m)
  }

  const filas: FilaProceso[] = (area.data ?? []).map((b) => {
    const m = porArea.get(b.proceso) ?? new Map<string, number>()
    const personas = [...m.entries()]
      .map(([nombre, tardanzas]) => ({ nombre, tardanzas }))
      .sort((x, y) => y.tardanzas - x.tardanzas)
    return {
      proceso: b.proceso,
      evaluadas: b.total_evaluable,
      tarde: b.llegadas_tarde,
      aTiempo: b.a_tiempo,
      pct: Number(b.pct_puntualidad),
      promMin: b.min_promedio_retraso == null ? null : Number(b.min_promedio_retraso),
      personas,
    }
  })

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Puntualidad</h2>
        <p className="text-sm text-gray-600 mt-1">
          Personal administrativo (ADMON L-V) · entrada 07:30 (gracia 07:37) ·{' '}
          {fmtFecha(minRes.data?.fecha_entrada)} a {fmtFecha(maxRes.data?.fecha_entrada)}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="% Puntualidad" value={pct} tone="green" icon={<Clock className="w-5 h-5" />} />
        <KpiCard label="A tiempo" value={aTiempo} tone="blue" icon={<UserCheck className="w-5 h-5" />} />
        <KpiCard label="Llegadas tarde" value={tardeN} tone="red" icon={<AlertTriangle className="w-5 h-5" />} />
        <KpiCard label="Mediciones evaluadas" value={total} tone="gray" icon={<Database className="w-5 h-5" />} />
      </div>

      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-gray-900">Puntualidad por proceso</h3>
        <p className="text-xs text-gray-500">Clic en un proceso para ver quién llega tarde.</p>
        <ProcesoTabla filas={filas} />
      </div>

      <p className="text-xs text-gray-500">
        Universo: personal con horario ADMON L-V, entrada de mañana. Regreso de almuerzo
        excluido por baja cobertura (~2%).
      </p>
    </div>
  )
}
