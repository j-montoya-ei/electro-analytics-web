// ═══════════════════════════════════════════════════════════
// Página Incapacidades (Requerimiento nuevo)
// Server Component mínimo para habilitar la CARGA end-to-end:
//   - encabezado + botón CargarIncapacidadesBoton
//   - KPI con el total de filas en public.incapacidades
// La analítica (tipos, días, costo, ranking, por proceso/unidad)
// se agrega después como paso aparte.
//
// Ubicación: app/(protected)/incapacidades/page.tsx
// ═══════════════════════════════════════════════════════════

import { createClient } from '@/lib/supabase/server'
import CargarIncapacidadesBoton from '@/components/CargarIncapacidadesBoton'
import { Stethoscope } from 'lucide-react'

export default async function IncapacidadesPage() {
  const supabase = await createClient()

  // Conteo de control (RLS: SELECT permitido a authenticated).
  const { count, error } = await supabase
    .from('incapacidades')
    .select('*', { count: 'exact', head: true })

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Incapacidades</h2>
          <p className="text-sm text-gray-600 mt-1">Electroingeniería S.A.S.</p>
          <p className="mt-2 text-sm leading-6 text-gray-500">
            Carga del archivo de incapacidades (INCAPACIDADES_BASE_2026, hoja
            «Incapacidades»). La analítica del módulo se habilitará a
            continuación.
          </p>
        </div>
        <CargarIncapacidadesBoton />
      </div>

      {error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm font-medium text-red-800">
            No se pudo leer la tabla de incapacidades
          </p>
          <p className="text-sm text-red-600 mt-1">{error.message}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-gray-200/80 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Incapacidades cargadas
              </p>
              <Stethoscope className="h-5 w-5 text-[#00369C]" />
            </div>
            <p className="mt-2 text-3xl font-bold text-gray-900">{count ?? 0}</p>
          </div>
        </div>
      )}
    </div>
  )
}
