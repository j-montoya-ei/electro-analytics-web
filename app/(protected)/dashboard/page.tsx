// ═══════════════════════════════════════════════════════════
// Dashboard Gerencial - panel de decisión.
// Estructura de planta (empleados) + llegadas tarde (administrativos).
// ═══════════════════════════════════════════════════════════

import type { ReactNode } from 'react'
import { createClient } from '@/lib/supabase/server'
import KpiCard from '@/components/KpiCard'
import { Users, UserCheck, Network, MapPin } from 'lucide-react'

export const dynamic = 'force-dynamic'

type Conteo = { label: string; value: number }

function contarPor(rows: Record<string, unknown>[], key: string): Conteo[] {
  const m = new Map<string, number>()
  for (const r of rows) {
    const raw = r[key]
    const v = raw == null || raw === '' ? '—' : String(raw)
    m.set(v, (m.get(v) ?? 0) + 1)
  }
  return [...m.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
}

function Barras({ datos }: { datos: Conteo[] }) {
  const max = Math.max(1, ...datos.map((d) => d.value))
  return (
    <div className="space-y-2">
      {datos.map((d) => (
        <div key={d.label} className="flex items-center gap-3">
          <span className="w-40 shrink-0 text-sm text-gray-700 truncate" title={d.label}>
            {d.label}
          </span>
          <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
            <div
              className="h-full bg-[#00369C] rounded-full"
              style={{ width: `${(d.value / max) * 100}%` }}
            />
          </div>
          <span className="w-10 shrink-0 text-right text-sm font-medium text-gray-900">
            {d.value}
          </span>
        </div>
      ))}
    </div>
  )
}

function Panel({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">{titulo}</h3>
      {children}
    </div>
  )
}

export default async function DashboardHome() {
  const supabase = await createClient()

  const [emp, late] = await Promise.all([
    supabase.from('empleados').select('genero, estado, sede, area, division').limit(2000),
    supabase
      .from('vw_puntualidad_admin')
      .select('nombre_completo')
      .eq('momento', 'entrada')
      .eq('llego_tarde', true)
      .limit(1000),
  ])

  const empleados = emp.data ?? []
  const total = empleados.length

  const porGenero = contarPor(empleados, 'genero')
  const porEstado = contarPor(empleados, 'estado')
  const porSede = contarPor(empleados, 'sede')
  const porProceso = contarPor(empleados, 'area')
  const porUnidad = contarPor(empleados, 'division')

  const hombres = porGenero.find((g) => /masc/i.test(g.label))?.value ?? 0
  const mujeres = porGenero.find((g) => /fem/i.test(g.label))?.value ?? 0
  const activos = porEstado.find((e) => /activ/i.test(e.label))?.value ?? total

  const conteoTarde = new Map<string, number>()
  for (const r of late.data ?? []) {
    conteoTarde.set(r.nombre_completo, (conteoTarde.get(r.nombre_completo) ?? 0) + 1)
  }
  const topTarde = [...conteoTarde.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10)

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Dashboard Gerencial</h2>
        <p className="text-sm text-gray-600 mt-1">Panel de decisión · Electroingeniería S.A.S.</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <KpiCard label="Empleados" value={total} tone="blue" icon={<Users className="w-5 h-5" />} />
        <KpiCard label="Activos" value={activos} tone="green" icon={<UserCheck className="w-5 h-5" />} />
        <KpiCard label="Hombres" value={hombres} tone="gray" icon={<Users className="w-5 h-5" />} />
        <KpiCard label="Mujeres" value={mujeres} tone="yellow" icon={<Users className="w-5 h-5" />} />
        <KpiCard label="Procesos" value={porProceso.length} tone="blue" icon={<Network className="w-5 h-5" />} />
        <KpiCard label="Sedes" value={porSede.length} tone="red" icon={<MapPin className="w-5 h-5" />} />
      </div>

      {/* Distribuciones */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel titulo={`Unidades de negocio (${porUnidad.length})`}>
          <Barras datos={porUnidad} />
        </Panel>
        <Panel titulo="Personal por sede">
          <Barras datos={porSede} />
        </Panel>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel titulo={`Personal por proceso (${porProceso.length})`}>
          <Barras datos={porProceso.slice(0, 12)} />
        </Panel>
        <Panel titulo="Top llegadas tarde — administrativos">
          {topTarde.length === 0 ? (
            <p className="text-sm text-gray-500">Sin datos.</p>
          ) : (
            <ul className="space-y-2">
              {topTarde.map((t, i) => (
                <li key={t.label} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">
                    <span className="text-gray-400 mr-2">{i + 1}.</span>
                    {t.label}
                  </span>
                  <span className="font-medium text-gray-900">{t.value} veces</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <p className="text-xs text-gray-500">
        Estructura sobre {total} empleados en sistema. &quot;Unidades de negocio&quot; = campo{' '}
        <code>division</code>. Las llegadas tarde son del personal administrativo (ADMON L-V); el
        resto de turnos entra cuando resolvamos los turnos flexibles.
      </p>
    </div>
  )
}
