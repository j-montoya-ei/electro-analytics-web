// ═══════════════════════════════════════════════════════════
// Página Puntualidad Administrativos - KPIs entrada (vw_puntualidad_admin)
// Opción 1: solo entrada mañana (07:30). Regreso de almuerzo excluido.
// ═══════════════════════════════════════════════════════════

import { createClient } from '@/lib/supabase/server'
import DataTable from '@/components/DataTable'
import KpiCard from '@/components/KpiCard'
import { Clock, UserCheck, AlertTriangle, Users } from 'lucide-react'

const VIEW = 'vw_puntualidad_admin'

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

  const [totalRes, tardeRes, minRes, maxRes, personasRes, tabla] = await Promise.all([
    supabase.from(VIEW).select('*', { count: 'exact', head: true }).eq('momento', 'entrada'),
    supabase
      .from(VIEW)
      .select('*', { count: 'exact', head: true })
      .eq('momento', 'entrada')
      .eq('llego_tarde', true),
    supabase
      .from(VIEW)
      .select('fecha_entrada')
      .eq('momento', 'entrada')
      .order('fecha_entrada', { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from(VIEW)
      .select('fecha_entrada')
      .eq('momento', 'entrada')
      .order('fecha_entrada', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from(VIEW).select('trab_id').eq('momento', 'entrada'),
    supabase
      .from(VIEW)
      .select('nombre_completo, area, fecha_entrada, hora_real, minutos_retraso')
      .eq('momento', 'entrada')
      .eq('llego_tarde', true)
      .order('fecha_entrada', { ascending: false })
      .limit(500),
  ])

  const total = totalRes.count ?? 0
  const tarde = tardeRes.count ?? 0
  const aTiempo = total - tarde
  const pct = total > 0 ? ((aTiempo / total) * 100).toFixed(1) + '%' : '—'
  const personas = new Set((personasRes.data ?? []).map((r) => r.trab_id)).size

  const fechaMin = fmtFecha(minRes.data?.fecha_entrada)
  const fechaMax = fmtFecha(maxRes.data?.fecha_entrada)

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Puntualidad Administrativos</h2>
        <p className="text-sm text-gray-600 mt-1">
          Turno ADMON L-V · entrada 07:30 (gracia 07:37) · {fechaMin} a {fechaMax}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="% Puntualidad" value={pct} tone="green" icon={<Clock className="w-5 h-5" />} />
        <KpiCard label="A tiempo" value={aTiempo} tone="blue" icon={<UserCheck className="w-5 h-5" />} />
        <KpiCard label="Llegadas tarde" value={tarde} tone="red" icon={<AlertTriangle className="w-5 h-5" />} />
        <KpiCard label={`Mediciones (${personas} personas)`} value={total} tone="gray" icon={<Users className="w-5 h-5" />} />
      </div>

      <DataTable
        data={tabla.data ?? []}
        searchPlaceholder="Buscar por nombre, área..."
        emptyMessage="No hay llegadas tarde registradas."
      />

      <p className="text-xs text-gray-500">
        Regreso de almuerzo excluido del % por baja cobertura (~2% de marcas). Se retoma después.
      </p>
    </div>
  )
}
