// ═══════════════════════════════════════════════════════════
// Home - Dashboard principal (versión Fase 3 · placeholder)
// El dashboard con KPIs reales se construye en Fase 4
// ═══════════════════════════════════════════════════════════

import { createClient } from '@/lib/supabase/server'
import { Users, CalendarCheck, TrendingUp, AlertCircle } from 'lucide-react'

export default async function DashboardHome() {
  const supabase = await createClient()

  // Conteo de empleados (query original)
  const { count: totalEmpleados, error } = await supabase
    .from('empleados')
    .select('*', { count: 'exact', head: true })

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Bienvenida */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          Bienvenido a Gestión Humana Analytics
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Panel de indicadores en tiempo real · Electroingeniería S.A.S.
        </p>
      </div>

      {/* Grid de KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total empleados (data real) */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Users className="w-5 h-5 text-[#00369C]" />
            </div>
            <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded">
              EN VIVO
            </span>
          </div>
          <p className="text-sm text-gray-600 mb-1">Total empleados</p>
          <p className="text-3xl font-bold text-gray-900">
            {error ? '—' : totalEmpleados}
          </p>
        </div>

        {/* Card 2: placeholder */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-50 flex items-center justify-center">
              <CalendarCheck className="w-5 h-5 text-[#F6D000]" />
            </div>
            <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded">
              PRÓXIMO
            </span>
          </div>
          <p className="text-sm text-gray-600 mb-1">Tasa de asistencia</p>
          <p className="text-3xl font-bold text-gray-400">—</p>
        </div>

        {/* Card 3: placeholder */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-[#A4A8AB]" />
            </div>
            <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded">
              PRÓXIMO
            </span>
          </div>
          <p className="text-sm text-gray-600 mb-1">Tardanza promedio</p>
          <p className="text-3xl font-bold text-gray-400">—</p>
        </div>

        {/* Card 4: placeholder */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-500" />
            </div>
            <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded">
              PRÓXIMO
            </span>
          </div>
          <p className="text-sm text-gray-600 mb-1">Inasistencias mes</p>
          <p className="text-3xl font-bold text-gray-400">—</p>
        </div>
      </div>

      {/* Mensaje informativo */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-[#00369C] text-white flex items-center justify-center flex-shrink-0 font-bold text-sm">
            i
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">
              Layout corporativo aplicado ✓
            </p>
            <p className="text-sm text-gray-600 mt-1">
              El próximo paso es construir el dashboard con KPIs reales, gráficos y análisis
              cruzado por división. Los cards en gris (—) se activan en Fase 4.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
