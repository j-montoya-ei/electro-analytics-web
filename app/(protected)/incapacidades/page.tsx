// ═══════════════════════════════════════════════════════════
// Página Incapacidades
// Server Component: jala vw_incapacidades y delega el tablero
// (filtros + KPIs + gráficos) al cliente IncapacidadesDashboard.
// Mantiene el botón de carga en el encabezado.
//
// Ubicación: app/(protected)/incapacidades/page.tsx
// ═══════════════════════════════════════════════════════════

import { createClient } from '@/lib/supabase/server'
import CargarIncapacidadesBoton from '@/components/CargarIncapacidadesBoton'
import IncapacidadesDashboard, {
  type IncapacidadRow,
} from '@/components/IncapacidadesDashboard'

export const dynamic = 'force-dynamic'

export default async function IncapacidadesPage() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('vw_incapacidades')
    .select(
      'dni,mes,mes_num,clase,cargo,entidad_norm,nro_dias,total_incapacidad,radicada,radicada_a_tiempo',
    )
    .order('mes_num', { ascending: true })
    .limit(5000)

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Incapacidades</h2>
          <p className="text-sm text-gray-600 mt-1">Electroingeniería S.A.S.</p>
          <p className="mt-2 text-sm leading-6 text-gray-500">
            Ausentismo por incapacidad médica: volumen, duración, diagnósticos,
            entidades y costo. Usa los filtros para segmentar el análisis.
          </p>
        </div>
        <CargarIncapacidadesBoton />
      </div>

      {error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm font-medium text-red-800">
            No se pudo cargar el módulo de incapacidades
          </p>
          <p className="text-sm text-red-600 mt-1">{error.message}</p>
        </div>
      ) : (
        <IncapacidadesDashboard rows={(data ?? []) as IncapacidadRow[]} />
      )}
    </div>
  )
}
