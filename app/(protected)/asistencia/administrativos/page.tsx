// ═══════════════════════════════════════════════════════════
// Puntualidad Administrativos - KPIs + desglose por área + detalle tarde
// Universo: horario ADMON L-V, entrada de mañana (sin marcas de tarde).
// ═══════════════════════════════════════════════════════════

import { createClient } from '@/lib/supabase/server'
import DataTable from '@/components/DataTable'
import KpiCard from '@/components/KpiCard'
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

export default async function AsistenciaAdministrativosPage() {
  const supabase = await createClient()

  const [totalRes, tardeRes, minRes, maxRes, area, tarde] = await Promise.all([
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
      .select('nombre_completo, area, fecha_entrada, hora_real, minutos_retraso')
      .eq('momento', 'entrada')
      .eq('llego_tarde', true)
      .order('fecha_entrada', { ascending: false })
      .limit(500),
  ])

  const total = totalRes.count ?? 0
  const tardeN = tardeRes.count ?? 0
  const aTiempo = total - tardeN
  const pct = total > 0 ? ((aTiempo / total) * 100).toFixed(1) + '%' : '—'

  const areaRows = (area.data ?? []).map((r) => ({
    'Área': r.proceso,
    'Evaluadas': r.total_evaluable,
    'Tarde': r.llegadas_tarde,
    'A tiempo': r.a_tiempo,
    '% Puntualidad': Number(r.pct_puntualidad),
    'Prom. min. tarde': r.min_promedio_retraso == null ? '—' : Number(r.min_promedio_retraso),
  }))

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Puntualidad Administrativos</h2>
        <p className="text-sm text-gray-600 mt-1">
          Turno ADMON L-V · entrada 07:30 (gracia 07:37) ·{' '}
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
        <h3 className="text-lg font-semibold text-gray-900">Puntualidad por área</h3>
        <DataTable
          data={areaRows}
          searchPlaceholder="Buscar área..."
          emptyMessage="Sin datos por área."
        />
      </div>

      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-gray-900">Detalle de llegadas tarde</h3>
        <DataTable
          data={tarde.data ?? []}
          searchPlaceholder="Buscar por nombre, área..."
          emptyMessage="No hay llegadas tarde registradas."
        />
      </div>

      <p className="text-xs text-gray-500">
        Universo: personal con horario ADMON L-V, entrada de mañana. Regreso de almuerzo
        excluido por baja cobertura (~2%).
      </p>
    </div>
  )
}
