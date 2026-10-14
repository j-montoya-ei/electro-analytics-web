// ═══════════════════════════════════════════════════════════
// Página Recaudo (nuevo · oct-2026)
// Todo se calcula desde la base de incapacidades (vistas vw_recaudo_*),
// desde ene-2025. Lo único que se digita es el ingreso al banco
// (botón "Registrar ingreso" → recaudo_ingresos).
// Server Component: lee las vistas y delega a RecaudoDashboard.
//
// Ubicación: app/(protected)/recaudo/page.tsx
// ═══════════════════════════════════════════════════════════

import { createClient } from '@/lib/supabase/server'
import RegistrarIngresoRecaudo, { type IngresoRow } from '@/components/RegistrarIngresoRecaudo'
import RecaudoDashboard, {
  type ConsolidadoRow,
  type MatrizRow,
  type CarteraRow,
  type ConciliacionRow,
  type DisputaRow,
} from '@/components/RecaudoDashboard'

export const dynamic = 'force-dynamic'

type Sb = Awaited<ReturnType<typeof createClient>>

// PostgREST corta en 1000 filas por petición (límite de Supabase). La cartera
// (entidades × meses) y la conciliación crecen cada mes → se leen por páginas.
async function leerTodo<T>(
  supabase: Sb,
  vista: string,
  orden: string,
): Promise<{ data: T[]; error: { message: string } | null }> {
  const PAGINA = 1000
  const out: T[] = []
  for (let desde = 0; ; desde += PAGINA) {
    const { data, error } = await supabase
      .from(vista)
      .select('*')
      .order(orden, { ascending: true })
      .range(desde, desde + PAGINA - 1)
    if (error) return { data: out, error }
    out.push(...((data ?? []) as T[]))
    if (!data || data.length < PAGINA) return { data: out, error: null }
  }
}

export default async function RecaudoPage() {
  const supabase = await createClient()

  const [consRes, matRes, carRes, conRes, disRes, ingRes] = await Promise.all([
    leerTodo<ConsolidadoRow>(supabase, 'vw_recaudo_consolidado', 'mes'),
    leerTodo<MatrizRow>(supabase, 'vw_recaudo_matriz', 'mes_gen'),
    leerTodo<CarteraRow>(supabase, 'vw_recaudo_cartera', 'mes'),
    leerTodo<ConciliacionRow>(supabase, 'vw_recaudo_conciliacion', 'mes'),
    leerTodo<DisputaRow>(supabase, 'vw_recaudo_disputa', 'entidad'),
    supabase
      .from('recaudo_ingresos')
      .select('id, mes, entidad, valor, observacion, created_at')
      .order('mes', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1000),
  ])

  const error = consRes.error ?? matRes.error ?? carRes.error ?? conRes.error ?? disRes.error ?? ingRes.error

  // Entidades del formulario = las que existen en la base (vienen en la cartera)
  const entidades = [...new Set(carRes.data.map((r) => r.entidad).filter((e) => e && e !== '(sin entidad)'))].sort(
    (a, b) => a.localeCompare(b, 'es'),
  )

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Recaudo</h2>
          <p className="text-sm text-gray-600 mt-1">Electroingeniería S.A.S.</p>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500">
            Recaudo de incapacidades ante EPS/ARL desde enero 2025: causado, recaudado, cartera por
            entidad y conciliación contra el banco. Se calcula solo desde la base de incapacidades;
            lo único que se registra a mano es el ingreso al banco.
          </p>
        </div>
        <RegistrarIngresoRecaudo entidades={entidades} ingresos={(ingRes.data ?? []) as IngresoRow[]} />
      </div>

      {error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm font-medium text-red-800">No se pudo cargar el módulo de recaudo</p>
          <p className="text-sm text-red-600 mt-1">{error.message}</p>
        </div>
      ) : (
        <RecaudoDashboard
          consolidado={consRes.data}
          matriz={matRes.data}
          cartera={carRes.data}
          conciliacion={conRes.data}
          disputa={disRes.data}
        />
      )}
    </div>
  )
}
