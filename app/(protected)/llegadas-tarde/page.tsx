// ═══════════════════════════════════════════════════════════
// Página Llegadas tarde - Acumulado por colaborador (paso 2a)
// Server Component: llama la función SQL por RPC y renderiza
// Fuente única: fn_llegadas_tarde_por_colaborador(desde, hasta)
// ═══════════════════════════════════════════════════════════

import { createClient } from '@/lib/supabase/server'
import LlegadasTardeTable from '@/components/LlegadasTardeTable'
import LlegadasTardeFiltro from '@/components/LlegadasTardeFiltro'

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

      <LlegadasTardeTable data={filas} />
    </div>
  )
}
