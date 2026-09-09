// ═══════════════════════════════════════════════════════════
// IncapacidadesGraficos (client component)
// Recibe las filas YA filtradas y dibuja los paneles del tablero
// con Recharts. Agrega en memoria; sin reglas de negocio nuevas.
// Sección 1 (Volumen y distribución). Secciones 2–3 se agregan
// en entregables posteriores.
//
// Ubicación: components/IncapacidadesGraficos.tsx
// ═══════════════════════════════════════════════════════════

'use client'

import { useMemo, type ReactNode } from 'react'
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

const SIN_DATO = '(sin dato)'
const norm = (v: string | null | undefined) =>
  v == null || v.trim() === '' ? SIN_DATO : v.trim()
const num = (v: number | string | null | undefined) => {
  const n = typeof v === 'number' ? v : v == null ? 0 : Number(v)
  return Number.isFinite(n) ? n : 0
}

const AZUL = '#00369C'
const NARANJA = '#EA8C00'
const PALETA = ['#00369C', '#2563EB', '#60A5FA', '#93C5FD', '#1E3A8A', '#3B82F6']

// Subconjunto de columnas que estos paneles consumen.
type Row = {
  mes: string | null
  mes_num: number | null
  nro_dias: number | string | null
  clase: string | null
}

export default function IncapacidadesGraficos({ rows }: { rows: Row[] }) {
  // Incapacidades y días por mes (ordenado por calendario)
  const porMes = useMemo(() => {
    const m = new Map<string, { orden: number; incapacidades: number; dias: number }>()
    for (const r of rows) {
      const label = norm(r.mes)
      const cur = m.get(label) ?? { orden: r.mes_num ?? 99, incapacidades: 0, dias: 0 }
      cur.incapacidades += 1
      cur.dias += num(r.nro_dias)
      m.set(label, cur)
    }
    return [...m.entries()]
      .map(([mes, v]) => ({ mes, mesLabel: mes.slice(0, 3), ...v }))
      .sort((a, b) => a.orden - b.orden)
  }, [rows])

  // Participación por clase de incapacidad
  const porClase = useMemo(() => {
    const m = new Map<string, number>()
    for (const r of rows) m.set(norm(r.clase), (m.get(norm(r.clase)) ?? 0) + 1)
    return [...m.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [rows])

  return (
    <section className="space-y-4">
      <SeccionTitulo>Volumen y distribución</SeccionTitulo>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel titulo="Incapacidades y días por mes" nota="cantidad · días">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={porMes} margin={{ top: 8, right: 12, bottom: 4, left: -12 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
                <XAxis
                  dataKey="mesLabel"
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(0,54,156,0.04)' }}
                  contentStyle={{
                    borderRadius: 8,
                    border: '1px solid #e5e7eb',
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar
                  dataKey="incapacidades"
                  name="Incapacidades"
                  fill={AZUL}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={48}
                />
                <Line
                  type="monotone"
                  dataKey="dias"
                  name="Días"
                  stroke={NARANJA}
                  strokeWidth={2}
                  dot={{ r: 3, fill: NARANJA }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel titulo="Por clase de incapacidad" nota="participación">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={porClase}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={62}
                  outerRadius={96}
                  paddingAngle={porClase.length > 1 ? 2 : 0}
                >
                  {porClase.map((_, i) => (
                    <Cell key={i} fill={PALETA[i % PALETA.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: number, n: string) => [`${v} incapacidad(es)`, n]}
                  contentStyle={{
                    borderRadius: 8,
                    border: '1px solid #e5e7eb',
                    fontSize: 12,
                  }}
                />
                <Legend
                  layout="vertical"
                  align="right"
                  verticalAlign="middle"
                  wrapperStyle={{ fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      {/* Secciones 2–3 (Duración / cargo / diagnósticos / entidad · Personas · Alertas): entregables 4–5 */}
    </section>
  )
}

function SeccionTitulo({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-gray-400">
      {children}
    </p>
  )
}

function Panel({
  titulo,
  nota,
  children,
}: {
  titulo: string
  nota?: string
  children: ReactNode
}) {
  return (
    <div className="rounded-xl border border-gray-200/80 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-gray-800">{titulo}</h3>
        {nota && <span className="text-xs text-gray-400">{nota}</span>}
      </div>
      {children}
    </div>
  )
}
