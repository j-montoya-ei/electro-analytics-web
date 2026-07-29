// ═══════════════════════════════════════════════════════════
// Página Inasistencias - KPIs + tabla (inasistencias)
// ═══════════════════════════════════════════════════════════

import { createClient } from '@/lib/supabase/server'
import DataTable from '@/components/DataTable'
import KpiCard from '@/components/KpiCard'
import { UserX, Users, CalendarX, FileWarning } from 'lucide-react'

function bogotaNow() {
  const now = new Date()
  return new Date(now.toLocaleString('en-US', { timeZone: 'America/Bogota' }))
}
const kpi = (r: { count: number | null; error: unknown }) =>
  r.error ? '—' : (r.count ?? 0)

export default async function InasistenciasPage() {
  const supabase = await createClient()

  const d = bogotaNow()
  const year = d.getFullYear()
  const month = d.getMonth() + 1

  const table = 'inasistencias'

  const [totalMes, codL, codP, dniRows, tabla] = await Promise.all([
    supabase.from(table).select('*', { count: 'exact', head: true }).eq('ano', year).eq('mes', month),
    supabase.from(table).select('*', { count: 'exact', head: true }).eq('ano', year).eq('mes', month).eq('motivo', 'L'),
    supabase.from(table).select('*', { count: 'exact', head: true }).eq('ano', year).eq('mes', month).eq('motivo', 'P'),
    supabase.from(table).select('dni').eq('ano', year).eq('mes', month),
    supabase
      .from(table)
      .select('dni, ano, mes, dia, motivo, fecha_evento')
      .order('fecha_evento', { ascending: false })
      .limit(500),
  ])

  const empleadosAfectados = dniRows.data
    ? new Set(dniRows.data.map((r) => r.dni)).size
    : '—'

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Inasistencias</h2>
        <p className="text-sm text-gray-600 mt-1">
          Novedades del mes en curso · Electroingeniería S.A.S.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total del mes" value={kpi(totalMes)} tone="red" icon={<UserX className="w-5 h-5" />} />
        <KpiCard label="Empleados afectados" value={empleadosAfectados} tone="blue" icon={<Users className="w-5 h-5" />} />
        <KpiCard label="Código L (mes)" value={kpi(codL)} tone="yellow" icon={<CalendarX className="w-5 h-5" />} />
        <KpiCard label="Código P (mes)" value={kpi(codP)} tone="gray" icon={<FileWarning className="w-5 h-5" />} />
      </div>

      <DataTable
        data={tabla.data ?? []}
        searchPlaceholder="Buscar por documento, motivo..."
        emptyMessage="No hay inasistencias registradas."
      />
    </div>
  )
}
