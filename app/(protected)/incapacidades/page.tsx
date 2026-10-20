import { createClient } from '@/lib/supabase/server'
import { leerTodo } from '@/lib/supabase/leerTodo'
import CargarIncapacidadesBoton from '@/components/CargarIncapacidadesBoton'
import IncapacidadesDashboard, {
  type IncapacidadRow,
} from '@/components/IncapacidadesDashboard'

export const dynamic = 'force-dynamic'

export default async function IncapacidadesPage() {
  const supabase = await createClient()

  const [incap, planta] = await Promise.all([
    leerTodo<IncapacidadRow>(supabase, 'vw_incapacidades', ['anio', 'id_incapacidad']),
    supabase.from('vw_caracterizacion').select('*', { count: 'exact', head: true }),
  ])

  const rows = incap.data
  const plantilla = planta.count ?? null

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Incapacidades</h2>
          <p className="text-sm text-gray-600 mt-1">Electroingeniería S.A.S.</p>
          <p className="mt-2 text-sm leading-6 text-gray-500">
            Ausentismo por incapacidad médica: volumen, duración, diagnósticos,
            entidades, áreas y costo. Usa los filtros para segmentar el análisis.
          </p>
        </div>
        <CargarIncapacidadesBoton />
      </div>

      {incap.error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm font-medium text-red-800">
            No se pudo cargar el módulo de incapacidades
          </p>
          <p className="text-sm text-red-600 mt-1">{incap.error.message}</p>
        </div>
      ) : (
        <IncapacidadesDashboard rows={rows} plantilla={plantilla} />
      )}
    </div>
  )
}
