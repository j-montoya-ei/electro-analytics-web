// ═══════════════════════════════════════════════════════════
// Página Asistencia - KPIs + tabla de marcas (asistencias_marcas)
// ═══════════════════════════════════════════════════════════

import { createClient } from '@/lib/supabase/server'
import DataTable from '@/components/DataTable'
import KpiCard from '@/components/KpiCard'
import { CalendarDays, CalendarCheck, Moon, History } from 'lucide-react'

function bogotaNow() {
  const now = new Date()
  return new Date(now.toLocaleString('en-US', { timeZone: 'America/Bogota' }))
}
const pad = (n: number) => String(n).padStart(2, '0')
const kpi = (r: { count: number | null; error: unknown }) =>
  r.error ? '—' : (r.count ?? 0)

export default async function AsistenciaPage() {
  const supabase = await createClient()

  const d = bogotaNow()
  const year = d.getFullYear()
  const month = d.getMonth() + 1
  const today = `${year}-${pad(month)}-${pad(d.getDate())}`
  const firstDay = `${year}-${pad(month)}-01`
  const lastDay = `${year}-${pad(month)}-${pad(new Date(year, month, 0).getDate())}`

  const table = 'asistencias_marcas'

  const [marcasHoy, marcasMes, turnosNoche, total, tabla] = await Promise.all([
    supabase.from(table).select('*', { count: 'exact', head: true }).eq('fecha_entrada', today),
    supabase.from(table).select('*', { count: 'exact', head: true }).gte('fecha_entrada', firstDay).lte('fecha_entrada', lastDay),
    supabase.from(table).select('*', { count: 'exact', head: true }).eq('turno_noche', true).gte('fecha_entrada', firstDay).lte('fecha_entrada', lastDay),
    supabase.from(table).select('*', { count: 'exact', head: true }),
    supabase
      .from(table)
      .select('nombre_completo, area, especialidad, turno, fecha_entrada, hora_entrada, fecha_salida, hora_salida')
      .order('fecha_entrada', { ascending: false })
      .limit(500),
  ])

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Asistencia</h2>
        <p className="text-sm text-gray-600 mt-1">
          Marcas de entrada y salida · Electroingeniería S.A.S.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Marcas hoy" value={kpi(marcasHoy)} tone="blue" icon={<CalendarCheck className="w-5 h-5" />} />
        <KpiCard label="Marcas del mes" value={kpi(marcasMes)} tone="green" icon={<CalendarDays className="w-5 h-5" />} />
        <KpiCard label="Turnos noche (mes)" value={kpi(turnosNoche)} tone="gray" icon={<Moon className="w-5 h-5" />} />
        <KpiCard label="Total histórico" value={kpi(total)} tone="yellow" icon={<History className="w-5 h-5" />} />
      </div>

      <DataTable
        data={tabla.data ?? []}
        searchPlaceholder="Buscar por nombre, área, turno..."
        emptyMessage="No hay marcas de asistencia registradas."
      />
    </div>
  )
}
