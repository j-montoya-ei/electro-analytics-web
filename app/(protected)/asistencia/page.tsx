// ═══════════════════════════════════════════════════════════
// Página Asistencia - KPIs de puntualidad (vw_llegadas_tarde)
// Universo evaluable = estado_horario 'mapeado' · histórico completo
// ═══════════════════════════════════════════════════════════

import { createClient } from '@/lib/supabase/server'
import KpiCard from '@/components/KpiCard'
import { Percent, Clock, CalendarCheck, Database } from 'lucide-react'

const VIEW = 'vw_llegadas_tarde'

const pct = (num: number, den: number) =>
  den > 0 ? `${((num / den) * 100).toFixed(1)}%` : '—'

export default async function AsistenciaPage() {
  const supabase = await createClient()

  const [totalRes, evaluableRes, tardeRes] = await Promise.all([
    // Total de marcas en la vista (histórico completo)
    supabase.from(VIEW).select('*', { count: 'exact', head: true }),
    // Evaluables = con horario oficial (estado_horario 'mapeado')
    supabase
      .from(VIEW)
      .select('*', { count: 'exact', head: true })
      .eq('estado_horario', 'mapeado'),
    // Tarde = evaluables que llegaron tarde
    supabase
      .from(VIEW)
      .select('*', { count: 'exact', head: true })
      .eq('estado_horario', 'mapeado')
      .eq('llego_tarde', true),
  ])

  const err = totalRes.error || evaluableRes.error || tardeRes.error

  const total = totalRes.count ?? 0
  const evaluable = evaluableRes.count ?? 0
  const tarde = tardeRes.count ?? 0
  const aTiempo = evaluable - tarde

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Asistencia</h2>
        <p className="text-sm text-gray-600 mt-1">
          Puntualidad sobre histórico completo · Electroingeniería S.A.S.
        </p>
      </div>

      {err ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm font-medium text-red-800">
            No se pudo cargar la puntualidad
          </p>
          <p className="text-sm text-red-600 mt-1">{err.message}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="% Puntualidad"
            value={pct(aTiempo, evaluable)}
            tone="green"
            icon={<Percent className="w-5 h-5" />}
          />
          <KpiCard
            label="Llegadas tarde"
            value={tarde.toLocaleString('es-CO')}
            tone="red"
            icon={<Clock className="w-5 h-5" />}
          />
          <KpiCard
            label="A tiempo"
            value={aTiempo.toLocaleString('es-CO')}
            tone="blue"
            icon={<CalendarCheck className="w-5 h-5" />}
          />
          <KpiCard
            label="Cobertura evaluable"
            value={pct(evaluable, total)}
            tone="gray"
            icon={<Database className="w-5 h-5" />}
          />
        </div>
      )}
    </div>
  )
}
