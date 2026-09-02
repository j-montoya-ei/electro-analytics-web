// ═══════════════════════════════════════════════════════════
// Página Inasistencias - KPIs + tabla enriquecida desde vw_inasistencias
// La lógica de cruce (cargo + turno dominante) vive en la vista SQL.
// El frontend solo lee y presenta.
// Ubicación: app/(protected)/inasistencias/page.tsx
// ═══════════════════════════════════════════════════════════

import { createClient } from '@/lib/supabase/server'
import DataTable from '@/components/DataTable'
import KpiCard from '@/components/KpiCard'
import LlegadasTardeFiltro from '@/components/LlegadasTardeFiltro'
import { UserX, Users, CalendarX, FileWarning } from 'lucide-react'

function bogotaNow() {
  const now = new Date()
  return new Date(now.toLocaleString('en-US', { timeZone: 'America/Bogota' }))
}
const pad = (n: number) => String(n).padStart(2, '0')
export default async function InasistenciasPage({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; hasta?: string }>
}) {
  const supabase = await createClient()
  const params = await searchParams

  const d = bogotaNow()
  const year = d.getFullYear()
  const month = d.getMonth() + 1
  const ultimoDia = new Date(year, month, 0).getDate()
  const desde = params.desde ?? `${year}-${pad(month)}-01`
  const hasta = params.hasta ?? `${year}-${pad(month)}-${pad(ultimoDia)}`
  const desdeAno = Number(desde.slice(0, 4))
  const hastaAno = Number(hasta.slice(0, 4))

  const { data: filas, error } = await supabase
    .from('vw_inasistencias')
    .select('dni, ano, mes, dia, motivo, nombre_completo, cargo, area, turno')
    .gte('ano', Math.min(desdeAno, hastaAno))
    .lte('ano', Math.max(desdeAno, hastaAno))
    .order('ano', { ascending: false })
    .order('mes', { ascending: false })
    .order('dia', { ascending: false })
    .limit(10000)

  if (error) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm font-medium text-red-800">No se pudieron cargar las inasistencias</p>
          <p className="text-sm text-red-600 mt-1">{error.message}</p>
        </div>
      </div>
    )
  }

  const rows = (filas ?? [])
    .filter((r) => {
      const fecha = `${r.ano}-${pad(r.mes)}-${pad(r.dia)}`
      return fecha >= desde && fecha <= hasta
    })
    .map((r) => ({
      dni: r.dni,
      ano: r.ano,
      mes: r.mes,
      dia: r.dia,
      motivo: r.motivo,
      nombre_completo: (r.nombre_completo as string) ?? '—',
      area: (r.area as string) ?? '—',
      especialidad: (r.cargo as string) ?? '—',
      turno: (r.turno as string) ?? '—',
      fecha: `${r.ano}-${pad(r.mes)}-${pad(r.dia)}`,
    }))

  const totalRegistros = rows.length
  const empleadosAfectados = new Set(rows.map((r) => r.dni)).size
  const codigoL = rows.filter((r) => r.motivo === 'L').length
  const codigoP = rows.filter((r) => r.motivo === 'P').length

  const tableRows = rows.map((r) => ({
    nombre_completo: r.nombre_completo,
    area: r.area,
    especialidad: r.especialidad,
    turno: r.turno,
    fecha: r.fecha,
    motivo: r.motivo ?? '—',
  }))

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Inasistencias</h2>
        <p className="text-sm text-gray-600 mt-1">
          {desde} a {hasta} · Electroingeniería S.A.S.
        </p>
        <p className="mt-2 text-sm leading-6 text-gray-500">
          Revisa las ausencias registradas y los colaboradores afectados durante el mes seleccionado.
        </p>
      </div>

      <LlegadasTardeFiltro desde={desde} hasta={hasta} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Registros de inasistencia" value={totalRegistros} tone="red" icon={<UserX className="w-5 h-5" />} />
        <KpiCard label="Personas con inasistencia" value={empleadosAfectados} tone="blue" icon={<Users className="w-5 h-5" />} />
        <KpiCard label="Inasistencias código L" value={codigoL} tone="yellow" icon={<CalendarX className="w-5 h-5" />} />
        <KpiCard label="Inasistencias código P" value={codigoP} tone="gray" icon={<FileWarning className="w-5 h-5" />} />
      </div>

      <div className="rounded-lg border border-blue-100 bg-blue-50/60 px-4 py-3 text-xs leading-5 text-slate-600">
        <span className="font-semibold text-[#092d6b]">Cómo leer estos indicadores:</span>{' '}
        los registros corresponden al total de novedades de inasistencia; las personas
        cuentan colaboradores únicos. Una persona puede tener varios registros dentro del período.
        Los códigos L y P corresponden al motivo registrado en la fuente de asistencia.
      </div>

      <DataTable
        data={tableRows}
        searchPlaceholder="Buscar por nombre, área, motivo..."
        emptyMessage="No hay inasistencias registradas."
        pageSize={20}
      />
    </div>
  )
}
