// ═══════════════════════════════════════════════════════════
// Página principal - Dashboard con logout
// Electro Analytics Web
// ═══════════════════════════════════════════════════════════

import { createClient } from '@/lib/supabase/server'
import { logout } from './logout/actions'

export default async function Home() {
  const supabase = await createClient()

  // Datos del usuario logueado
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Conteo de empleados (query original)
  const { count, error } = await supabase
    .from('empleados')
    .select('*', { count: 'exact', head: true })

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Barra superior con info de usuario + logout */}
      <header className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Electro-Analytics
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {user?.email}
            </span>
            <form action={logout}>
              <button
                type="submit"
                className="text-sm text-red-600 hover:text-red-800 font-medium"
              >
                Cerrar sesión
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <div className="max-w-6xl mx-auto p-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Dashboard Gestión Humana
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            Electroingeniería S.A.S.
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 max-w-md mx-auto">
            {error ? (
              <div className="text-red-600">
                <p className="font-semibold">Error al conectar con Supabase:</p>
                <p className="text-sm mt-2 font-mono">{error.message}</p>
              </div>
            ) : (
              <>
                <p className="text-sm uppercase tracking-wider text-blue-700 font-semibold mb-2">
                  Total empleados registrados
                </p>
                <p className="text-6xl font-bold text-blue-900">
                  {count}
                </p>
                <p className="text-sm text-blue-600 mt-4">
                  Datos en vivo desde Supabase
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
