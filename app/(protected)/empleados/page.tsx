// ═══════════════════════════════════════════════════════════
// Página Empleados - Listado con data real de Supabase
// Server Component: hace el fetch y lo pasa a la DataTable unificada.
// Ubicación: app/(protected)/empleados/page.tsx
// ═══════════════════════════════════════════════════════════

import { createClient } from '@/lib/supabase/server'
import DataTable from '@/components/DataTable'

export default async function EmpleadosPage() {
  const supabase = await createClient()

  const { data: empleados, error } = await supabase
    .from('empleados')
    .select('*')
    .limit(1000)

  if (error) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm font-medium text-red-800">
            No se pudo cargar la lista de empleados
          </p>
          <p className="text-sm text-red-600 mt-1">{error.message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Empleados</h2>
        <p className="text-sm text-gray-600 mt-1">
          {empleados?.length ?? 0} registros · Electroingeniería S.A.S.
        </p>
      </div>

      <DataTable
        data={empleados ?? []}
        searchPlaceholder="Buscar por nombre, cargo, área..."
        emptyMessage={
          <>
            No hay empleados para mostrar. Verifica que la tabla{' '}
            <code className="bg-gray-100 px-1 rounded">empleados</code> tenga
            datos y que las políticas RLS permitan la lectura al usuario
            autenticado.
          </>
        }
      />
    </div>
  )
}
