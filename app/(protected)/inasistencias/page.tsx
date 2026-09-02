// ═══════════════════════════════════════════════════════════
// Página Inasistencias - KPIs + tabla enriquecida desde vw_inasistencias
// La lógica de cruce (cargo + turno dominante) vive en la vista SQL.
// El frontend solo lee y presenta.
// Ubicación: app/(protected)/inasistencias/page.tsx
// ═══════════════════════════════════════════════════════════

import { createClient } from '@/lib/supabase/server'
import DataTable from '@/components/DataTable'
import KpiCard from '@/components/KpiCard'
import { UserX, Users, CalendarX, FileWarning } from 'lucide-react'

function bogotaNow() {
  const now = new Date()
  return new Date(now.toLocaleString('en-US', { timeZone: 'America/Bogota' }))
}
const pad = (n: number) => String(n).padStart(2, '0')
const kpi = (r: { count: number | null; error: unknown }) =>
  r.error ? '—' : (r.count ?? 0)

export default async function InasistenciasPage() {
  const supabase = await createClient()

  const d = bogotaNow()
  const year = d.getFullYear()
  const month = d.getMonth() + 1

  const table = 'inasistencias'

  const [totalMes, codL, codP, dniRows, filas] = await Promise.all([
    // KPIs y "empleados afectados" se calculan sobre la tabla cruda (sin cambios)
    supabase.from(table).select('*', { count: 'exact', head: true }).eq('ano', year).eq('mes', month),
    supabase.from(table).select('*', { count: 'exact', head: true }).eq('ano', year).eq('mes', month).eq('motivo', 'L'),
    supabase.from(table).select('*', { count: 'exact', head: true }).eq('ano', year).eq('mes', month).eq('motivo', 'P'),
    supabase.from(table).select('dni').eq('ano', year).eq('mes', month),
    // La tabla se alimenta de la vista, que ya trae nombre, cargo, area y turno
    supabase
      .from('vw_inasistencias')
      .select('dni, ano, mes, dia, motivo, nombre_completo, cargo, area, turno')
      .eq('ano', year)
      .eq('mes', month)
      .order('ano', { ascending: false })
      .order('mes', { ascending: false })
      .order('dia', { ascending: false })
      .limit(2000),
  ])

  // Filas ya enriquecidas por la vista. Se mantienen las mismas llaves para
  // no alterar los encabezados de la tabla: especialidad = cargo.
  const rows = (filas.data ?? []).map((r) => ({
    nombre_completo: (r.nombre_completo as string) ?? '—',
    area: (r.area as string) ?? '—',
    especialidad: (r.cargo as string) ?? '—',
    turno: (r.turno as string) ?? '—',
    fecha: `${r.ano}-${pad(r.mes)}-${pad(r.dia)}`,
    motivo: r.motivo ?? '—',
  }))

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
        <p className="mt-2 text-sm leading-6 text-gray-500">
          Revisa las ausencias registradas y los colaboradores afectados durante el mes seleccionado.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total del mes" value={kpi(totalMes)} tone="red" icon={<UserX className="w-5 h-5" />} />
        <KpiCard label="Empleados afectados" value={empleadosAfectados} tone="blue" icon={<Users className="w-5 h-5" />} />
        <KpiCard label="Código L (mes)" value={kpi(codL)} tone="yellow" icon={<CalendarX className="w-5 h-5" />} />
        <KpiCard label="Código P (mes)" value={kpi(codP)} tone="gray" icon={<FileWarning className="w-5 h-5" />} />
      </div>

      <DataTable
        data={rows}
        searchPlaceholder="Buscar por nombre, área, motivo..."
        emptyMessage="No hay inasistencias registradas."
        pageSize={20}
      />
    </div>
  )
}
