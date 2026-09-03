// ═══════════════════════════════════════════════════════════
// Página Llegadas tarde - Acumulado por colaborador
// Server Component: llama la función SQL por RPC y renderiza
// Fuente única: fn_llegadas_tarde_por_colaborador(desde, hasta)
// ═══════════════════════════════════════════════════════════
import { createClient } from '@/lib/supabase/server'
import LlegadasTardeTable from '@/components/LlegadasTardeTable'
import LlegadasTardeFiltro from '@/components/LlegadasTardeFiltro'
import LlegadasTardeKpis from '@/components/LlegadasTardeKpis'
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
  // ─── Tarde (regreso de almuerzo) ───
  tardanzas_tarde: number
  minutos_tarde_oficiales: number
  dias_despues_tarde: number
  minutos_tarde_teoricos: number
  // ─── Totales (superó tolerancia: mañana + tarde) ───
  total_dias: number
  total_minutos: number
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
  const filas = ((data ?? []) as Fila[])
    .map((fila) => ({
      ...fila,
      total_dias:
        (fila.tardanzas_oficiales ?? 0) +
        (fila.dias_despues_teorica ?? 0) +
        (fila.tardanzas_tarde ?? 0) +
        (fila.dias_despues_tarde ?? 0),
      total_minutos:
        (fila.minutos_oficiales ?? 0) +
        (fila.minutos_teoricos ?? 0) +
        (fila.minutos_tarde_oficiales ?? 0) +
        (fila.minutos_tarde_teoricos ?? 0),
    }))
    .filter((fila) => fila.total_minutos > 0)
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Llegadas tarde</h2>
        <p className="text-sm text-gray-600 mt-1">
          {filas.length} colaboradores · {desde} a {hasta} · Electroingeniería S.A.S.
        </p>
        <p className="mt-2 text-sm leading-6 text-gray-500">
          Identifica tardanzas al iniciar la jornada y al regresar del almuerzo. Los permisos aprobados se consideran hasta su hora de finalización.
        </p>
      </div>
      <LlegadasTardeFiltro desde={desde} hasta={hasta} />
      <LlegadasTardeKpis data={filas} />
      <LlegadasTardeTable data={filas} desde={desde} hasta={hasta} />
    </div>
  )
}
