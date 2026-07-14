import { supabase } from '@/lib/supabase'

export default async function Home() {
  const { count, error } = await supabase
    .from('empleados')
    .select('*', { count: 'exact', head: true })

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-white">
      <div className="max-w-2xl w-full text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Electro-Analytics
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Dashboard de Gestión Humana · Electroingeniería S.A.S.
        </p>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-8">
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
    </main>
  )
}
