// ═══════════════════════════════════════════════════════════
// IncapacidadesGraficos (client component)
// Recibe las filas YA filtradas y dibuja los paneles con Recharts.
// Tooltips ENRIQUECIDOS: cada categoría muestra incap · días · valor
// (como el HTML original). Agrega en memoria; las reglas de negocio
// vienen resueltas desde vw_incapacidades. Cubre lo del BASE; el
// recaudo va en la pista RECAUDO.
//
// Ubicación: components/IncapacidadesGraficos.tsx
// ═══════════════════════════════════════════════════════════

'use client'

import { useMemo, useState, type ReactNode, type ReactElement } from 'react'
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  LineChart,
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
import type { TooltipProps } from 'recharts'

const SIN_DATO = '(sin dato)'
const norm = (v: string | null | undefined) =>
  v == null || v.trim() === '' ? SIN_DATO : v.trim()
const num = (v: number | string | null | undefined) => {
  const n = typeof v === 'number' ? v : v == null ? 0 : Number(v)
  return Number.isFinite(n) ? n : 0
}
// Compacto para KPIs y ejes; completo para tooltips (ej. $2.240.262).
const fmtCosto = (n: number) =>
  n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `$${(n / 1e3).toFixed(0)}K` : `$${n.toFixed(0)}`
const fmtCOP = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)
const trunc = (s: string, n = 22) => (s.length > n ? s.slice(0, n - 1) + '…' : s)

const AZUL = '#00369C'
const NARANJA = '#EA8C00'
const TEAL = '#0E7490'
const PALETA = ['#00369C', '#2563EB', '#60A5FA', '#93C5FD', '#1E3A8A', '#3B82F6', '#0E7490']

export type Row = {
  dni: string
  nombre: string | null
  cargo: string | null
  proceso: string | null
  unidad_negocio: string | null
  descripcion_dx: string | null
  mes: string | null
  mes_num: number | null
  periodo: string | null
  anio: number | null
  clase: string | null
  entidad_norm: string
  estado: string | null
  nro_dias: number | string | null
  total_incapacidad: number | string | null
  valor_pendiente_cobrar: number | string | null
}

// Métricas agregadas por categoría (cargo, proceso, entidad, diagnóstico…)
type Cat = { name: string; incap: number; dias: number; valor: number }

type Dim = 'proceso' | 'unidad' | 'cargo' | 'diagnostico'
const DIM_LABEL: Record<Dim, string> = {
  proceso: 'Proceso',
  unidad: 'Unidad de negocio',
  cargo: 'Cargo',
  diagnostico: 'Diagnóstico',
}
const DIM_ACCESSOR: Record<Dim, (r: Row) => string> = {
  proceso: (r) => norm(r.proceso),
  unidad: (r) => norm(r.unidad_negocio),
  cargo: (r) => norm(r.cargo),
  diagnostico: (r) => norm(r.descripcion_dx),
}

export default function IncapacidadesGraficos({
  rows,
  plantilla,
}: {
  rows: Row[]
  plantilla: number | null
}) {
  const [dim, setDim] = useState<Dim>('proceso')

  // ── Agregaciones ──────────────────────────────────────────────────
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

  const porClase = useMemo(() => {
    const m = new Map<string, number>()
    for (const r of rows) m.set(norm(r.clase), (m.get(norm(r.clase)) ?? 0) + 1)
    return [...m.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
  }, [rows])
  const totalClase = useMemo(() => porClase.reduce((s, c) => s + c.value, 0), [porClase])

  const porEntidad = useMemo(() => metricasPor(rows, (r) => r.entidad_norm || SIN_DATO, 'incap'), [rows])
  const porDx = useMemo(() => metricasPor(rows, (r) => norm(r.descripcion_dx), 'incap').slice(0, 8), [rows])
  const diasPorCargo = useMemo(() => metricasPor(rows, (r) => norm(r.cargo), 'dias').slice(0, 8), [rows])
  const diasPorProceso = useMemo(() => metricasPor(rows, (r) => norm(r.proceso), 'dias').slice(0, 8), [rows])
  const diasPorUnidad = useMemo(() => metricasPor(rows, (r) => norm(r.unidad_negocio), 'dias').slice(0, 8), [rows])

  const porDuracion = useMemo(() => {
    const m = new Map<number, number>()
    for (const r of rows) {
      const d = num(r.nro_dias)
      if (d > 0) m.set(d, (m.get(d) ?? 0) + 1)
    }
    return [...m.entries()].sort((a, b) => a[0] - b[0]).map(([d, value]) => ({ name: String(d), value }))
  }, [rows])

  const carteraEstado = useMemo(() => {
    const m = new Map<string, number>()
    for (const r of rows) m.set(norm(r.estado), (m.get(norm(r.estado)) ?? 0) + num(r.valor_pendiente_cobrar))
    return [...m.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
  }, [rows])

  const derechoPeticion = useMemo(() => {
    const m = new Map<string, number>()
    for (const r of rows) {
      if (!(r.estado ?? '').toLowerCase().includes('petici')) continue
      m.set(r.entidad_norm || SIN_DATO, (m.get(r.entidad_norm || SIN_DATO) ?? 0) + num(r.valor_pendiente_cobrar))
    }
    return [...m.entries()].map(([entidad, valor]) => ({ entidad, valor })).sort((a, b) => b.valor - a.valor)
  }, [rows])

  const porAnio = useMemo(() => {
    const m = new Map<number, { incap: number; trab: Set<string> }>()
    for (const r of rows) {
      const a = r.anio ?? 0
      const cur = m.get(a) ?? { incap: 0, trab: new Set<string>() }
      cur.incap += 1
      cur.trab.add(r.dni)
      m.set(a, cur)
    }
    return [...m.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([anio, v]) => ({
        anio: anio === 0 ? SIN_DATO : String(anio),
        incap: v.incap,
        trabajadores: v.trab.size,
        pct: plantilla && plantilla > 0 ? Math.round((v.trab.size / plantilla) * 100) : null,
      }))
  }, [rows, plantilla])

  const tendencia = useMemo(() => {
    const accessor = DIM_ACCESSOR[dim]
    const totals = new Map<string, number>()
    for (const r of rows) totals.set(accessor(r), (totals.get(accessor(r)) ?? 0) + 1)
    const top = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([v]) => v)
    const topSet = new Set(top)
    const grid = new Map<string, Map<string, number>>()
    const periodos = new Set<string>()
    let hayOtros = false
    for (const r of rows) {
      const p = r.periodo ?? SIN_DATO
      periodos.add(p)
      let v = accessor(r)
      if (!topSet.has(v)) {
        v = 'Otros'
        hayOtros = true
      }
      const g = grid.get(p) ?? new Map<string, number>()
      g.set(v, (g.get(v) ?? 0) + 1)
      grid.set(p, g)
    }
    // Claves sintéticas: evitan que etiquetas con "." o "," rompan el dataKey.
    const labels = hayOtros ? [...top, 'Otros'] : top
    const series = labels.map((label, i) => ({ key: `s${i}`, label }))
    const data = [...periodos].sort().map((p) => {
      const g = grid.get(p) ?? new Map<string, number>()
      const row: Record<string, string | number> = { periodo: p }
      for (const s of series) row[s.key] = g.get(s.label) ?? 0
      return row
    })
    return { data, series }
  }, [rows, dim])

  return (
    <div className="space-y-8">
      {/* ── Volumen y distribución ── */}
      <Seccion titulo="Volumen y distribución">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Panel titulo="Incapacidades y días por mes" nota="cantidad · días">
            <Alto>
              <ComposedChart data={porMes} margin={{ top: 8, right: 12, bottom: 4, left: -12 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
                <XAxis dataKey="mesLabel" tick={tickX} axisLine={false} tickLine={false} />
                <YAxis tick={tickX} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip cursor={{ fill: 'rgba(0,54,156,0.04)' }} contentStyle={tipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="incapacidades" name="Incapacidades" fill={AZUL} radius={[4, 4, 0, 0]} maxBarSize={48} />
                <Line type="monotone" dataKey="dias" name="Días" stroke={NARANJA} strokeWidth={2} dot={{ r: 3, fill: NARANJA }} />
              </ComposedChart>
            </Alto>
          </Panel>

          <Panel titulo="Por clase de incapacidad" nota="participación">
            <Alto>
              <PieChart>
                <Pie data={porClase} dataKey="value" nameKey="name" innerRadius={62} outerRadius={96} paddingAngle={porClase.length > 1 ? 2 : 0}>
                  {porClase.map((_, i) => (
                    <Cell key={i} fill={PALETA[i % PALETA.length]} />
                  ))}
                </Pie>
                <Tooltip
                  content={(p: TooltipProps<number, string>) => {
                    const d = p.payload?.[0]?.payload as { name: string; value: number } | undefined
                    if (!p.active || !d) return null
                    const pct = totalClase > 0 ? Math.round((d.value / totalClase) * 100) : 0
                    return <TipBox title={d.name}>{d.value} incap. ({pct}%)</TipBox>
                  }}
                />
                <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </Alto>
          </Panel>
        </div>
      </Seccion>

      {/* ── Duración y diagnóstico ── */}
      <Seccion titulo="Duración y diagnóstico">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Panel titulo="Duración más frecuente" nota="nº de incapacidades por días">
            <Alto>
              <BarChart data={porDuracion} margin={{ top: 8, right: 12, bottom: 4, left: -12 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
                <XAxis dataKey="name" tick={tickX} axisLine={false} tickLine={false} />
                <YAxis tick={tickX} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip cursor={{ fill: 'rgba(0,54,156,0.04)' }} contentStyle={tipStyle} formatter={(v) => [`${v} incapacidad(es)`, 'Cantidad']} labelFormatter={(l) => `${l} día(s)`} />
                <Bar dataKey="value" fill={AZUL} radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </Alto>
          </Panel>

          <Panel titulo="Ausentismo por cargo" nota="top · días perdidos">
            <BarrasH data={diasPorCargo} color={AZUL} metric="dias" />
          </Panel>

          <Panel titulo="Diagnósticos más representativos" nota="top · frecuencia (incap · días)">
            <BarrasH data={porDx} color="#2563EB" metric="incap" />
          </Panel>

          <Panel titulo="Por entidad" nota="incapacidades · valor">
            <Alto>
              <BarChart data={porEntidad} margin={{ top: 8, right: 12, bottom: 4, left: -12 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
                <XAxis dataKey="name" tick={{ ...tickX, fontSize: 10 }} axisLine={false} tickLine={false} interval={0} angle={-15} textAnchor="end" height={50} />
                <YAxis tick={tickX} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(0,54,156,0.04)' }}
                  content={(p: TooltipProps<number, string>) => {
                    const d = p.payload?.[0]?.payload as Cat | undefined
                    if (!p.active || !d) return null
                    return (
                      <TipBox title={d.name}>
                        {d.incap} incap. · {fmtCOP(d.valor)}
                      </TipBox>
                    )
                  }}
                />
                <Bar dataKey="incap" fill={TEAL} radius={[4, 4, 0, 0]} maxBarSize={44} />
              </BarChart>
            </Alto>
          </Panel>
        </div>
      </Seccion>

      {/* ── Ausentismo por área ── */}
      <Seccion titulo="Ausentismo por área">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Panel titulo="Por proceso" nota="días perdidos (incap · días)">
            <BarrasH data={diasPorProceso} color={AZUL} metric="dias" />
          </Panel>
          <Panel titulo="Por unidad de negocio" nota="días perdidos (incap · días)">
            <BarrasH data={diasPorUnidad} color="#1E3A8A" metric="dias" />
          </Panel>
        </div>
      </Seccion>

      {/* ── Tendencia (selector de dimensión) ── */}
      <Seccion titulo="Tendencia">
        <Panel
          titulo={`Dónde se incapacitan más · por ${DIM_LABEL[dim].toLowerCase()}`}
          nota="incapacidades en el tiempo"
          accion={
            <select
              value={dim}
              onChange={(e) => setDim(e.target.value as Dim)}
              className="h-8 rounded-lg border border-gray-300 bg-white px-2 text-xs text-gray-700 outline-none focus:border-[#00369C] focus:ring-2 focus:ring-[#00369C]/15"
            >
              {(Object.keys(DIM_LABEL) as Dim[]).map((d) => (
                <option key={d} value={d}>
                  {DIM_LABEL[d]}
                </option>
              ))}
            </select>
          }
        >
          <Alto h="h-80">
            <LineChart data={tendencia.data} margin={{ top: 8, right: 16, bottom: 4, left: -12 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
              <XAxis dataKey="periodo" tick={tickX} axisLine={false} tickLine={false} />
              <YAxis tick={tickX} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={tipStyle} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {tendencia.series.map((s, i) => (
                <Line key={s.key} type="monotone" dataKey={s.key} name={trunc(s.label, 18)} stroke={PALETA[i % PALETA.length]} strokeWidth={2} dot={{ r: 2 }} />
              ))}
            </LineChart>
          </Alto>
        </Panel>
      </Seccion>

      {/* ── Cartera y radicación ── */}
      <Seccion titulo="Cartera y radicación">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Panel titulo="Cartera por estado" nota="valor pendiente por cobrar">
            <Alto>
              <BarChart data={carteraEstado} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
                <XAxis dataKey="name" tick={{ ...tickX, fontSize: 10 }} axisLine={false} tickLine={false} interval={0} angle={-15} textAnchor="end" height={50} />
                <YAxis tick={tickX} axisLine={false} tickLine={false} tickFormatter={(v) => fmtCosto(Number(v))} width={64} />
                <Tooltip cursor={{ fill: 'rgba(0,54,156,0.04)' }} contentStyle={tipStyle} formatter={(v) => [fmtCOP(Number(v)), 'Pendiente']} />
                <Bar dataKey="value" fill={NARANJA} radius={[4, 4, 0, 0]} maxBarSize={44} />
              </BarChart>
            </Alto>
          </Panel>

          <Panel titulo="Derecho de petición · valor a recaudar por EPS" nota="estado = Derecho Petición">
            {derechoPeticion.length === 0 ? (
              <Vacio texto="Sin incapacidades en derecho de petición." />
            ) : (
              <ul className="divide-y divide-gray-100">
                {derechoPeticion.map((d) => (
                  <li key={d.entidad} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <span className="truncate text-gray-700" title={d.entidad}>
                      {d.entidad}
                    </span>
                    <span className="shrink-0 font-semibold text-gray-900">{fmtCOP(d.valor)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </Seccion>

      {/* ── Por año ── */}
      <Seccion titulo="Por año">
        <Panel titulo="Ausentismos por año" nota="proporción sobre plantilla activa">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="py-2 pr-4 font-semibold">Año</th>
                  <th className="py-2 pr-4 font-semibold">Incapacidades</th>
                  <th className="py-2 pr-4 font-semibold">Trabajadores</th>
                  <th className="py-2 font-semibold">% de la plantilla</th>
                </tr>
              </thead>
              <tbody>
                {porAnio.map((a) => (
                  <tr key={a.anio} className="border-b border-gray-50">
                    <td className="py-2 pr-4 font-medium text-gray-900">{a.anio}</td>
                    <td className="py-2 pr-4 text-gray-700">{a.incap}</td>
                    <td className="py-2 pr-4 text-gray-700">{a.trabajadores}</td>
                    <td className="py-2 font-semibold text-[#00369C]">{a.pct == null ? '—' : `${a.pct}%`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {plantilla == null && (
            <p className="mt-3 text-xs text-gray-400">Plantilla activa no disponible; no se calcula el porcentaje.</p>
          )}
        </Panel>
      </Seccion>
    </div>
  )
}

// ── Agregación por categoría con las 3 métricas ────────────────────
function metricasPor(rows: Row[], key: (r: Row) => string, sortBy: 'dias' | 'incap'): Cat[] {
  const m = new Map<string, Cat>()
  for (const r of rows) {
    const k = key(r)
    const c = m.get(k) ?? { name: k, incap: 0, dias: 0, valor: 0 }
    c.incap += 1
    c.dias += num(r.nro_dias)
    c.valor += num(r.total_incapacidad)
    m.set(k, c)
  }
  return [...m.values()].sort((a, b) => b[sortBy] - a[sortBy])
}

// ── Tooltip enriquecido reutilizable ───────────────────────────────
function TipBox({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-sm">
      <p className="mb-0.5 font-semibold text-gray-900">{title}</p>
      <p className="text-gray-600">{children}</p>
    </div>
  )
}

const CatTip = ({ active, payload }: TooltipProps<number, string>) => {
  const d = payload?.[0]?.payload as Cat | undefined
  if (!active || !d) return null
  return (
    <TipBox title={d.name}>
      {d.incap} incap. · {d.dias} días
    </TipBox>
  )
}

// ── UI helpers ─────────────────────────────────────────────────────
const tickX = { fontSize: 12, fill: '#6b7280' } as const
const tipStyle = { borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 } as const

function Alto({ children, h = 'h-72' }: { children: ReactNode; h?: string }) {
  return (
    <div className={h}>
      <ResponsiveContainer width="100%" height="100%">
        {children as ReactElement}
      </ResponsiveContainer>
    </div>
  )
}

function BarrasH({
  data,
  color,
  metric,
}: {
  data: Cat[]
  color: string
  metric: 'dias' | 'incap'
}) {
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eef2f7" />
          <XAxis type="number" tick={tickX} axisLine={false} tickLine={false} allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="name"
            width={150}
            tick={{ fontSize: 11, fill: '#374151' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: string) => trunc(v, 22)}
          />
          <Tooltip cursor={{ fill: 'rgba(0,54,156,0.04)' }} content={CatTip} />
          <Bar dataKey={metric} fill={color} radius={[0, 4, 4, 0]} maxBarSize={22} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-gray-400">{titulo}</p>
      {children}
    </section>
  )
}

function Panel({
  titulo,
  nota,
  accion,
  children,
}: {
  titulo: string
  nota?: string
  accion?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="rounded-xl border border-gray-200/80 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <h3 className="text-sm font-semibold text-gray-800">{titulo}</h3>
          {nota && <span className="text-xs text-gray-400">{nota}</span>}
        </div>
        {accion}
      </div>
      {children}
    </div>
  )
}

function Vacio({ texto }: { texto: string }) {
  return <div className="flex h-64 items-center justify-center text-center text-sm text-gray-400">{texto}</div>
}
