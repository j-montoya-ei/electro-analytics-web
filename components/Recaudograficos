// ═══════════════════════════════════════════════════════════
// RecaudoGraficos (client component)
// Módulo RECAUDO — tabla (a) causado_mensual. Grafica lo ÚNICO
// disponible hoy: causado vs. ingreso reconocido por EPS, por mes
// y por año. Recaudo mes a mes y cartera dependen de las tablas
// (b) recaudo_pagos y (c) cartera_eps, aún no cargadas.
//
// Tooltips enriquecidos (causado · ingreso · Δ). Agrega en memoria;
// la lógica de negocio vive en vw_causado_mensual.
//
// Ubicación: components/RecaudoGraficos.tsx
// ═══════════════════════════════════════════════════════════

'use client'

import { useMemo, type ReactNode, type ReactElement } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import type { TooltipProps } from 'recharts'

// ── Helpers de formato (mismo criterio que el resto del proyecto) ──
const num = (v: number | string | null | undefined) => {
  const n = typeof v === 'number' ? v : v == null ? 0 : Number(v)
  return Number.isFinite(n) ? n : 0
}
// Compacto para ejes; completo para tooltips (ej. $2.240.262).
const fmtCosto = (n: number) =>
  n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `$${(n / 1e3).toFixed(0)}K` : `$${n.toFixed(0)}`
const fmtCOP = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)

const AZUL = '#00369C'
const NARANJA = '#EA8C00'

const MES_ABBR = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
// '2023-11' → 'nov 23'
const mesLabel = (periodo: string) => {
  const [y, m] = (periodo ?? '').split('-')
  const i = Number(m) - 1
  return `${MES_ABBR[i] ?? m} ${(y ?? '').slice(2)}`
}

export type CausadoRow = {
  mes_generacion: string
  anio: number | string | null
  mes_num: number | string | null
  periodo: string
  valor_causado: number | string | null
  valor_ingreso: number | string | null
}

export default function RecaudoGraficos({ rows }: { rows: CausadoRow[] }) {
  const porMes = useMemo(
    () =>
      [...rows]
        .sort((a, b) => (a.mes_generacion < b.mes_generacion ? -1 : a.mes_generacion > b.mes_generacion ? 1 : 0))
        .map((r) => ({
          label: mesLabel(r.periodo),
          causado: num(r.valor_causado),
          ingreso: num(r.valor_ingreso),
        })),
    [rows],
  )

  const porAnio = useMemo(() => {
    const m = new Map<number, { causado: number; ingreso: number }>()
    for (const r of rows) {
      const a = Number(r.anio)
      if (!Number.isFinite(a)) continue
      const cur = m.get(a) ?? { causado: 0, ingreso: 0 }
      cur.causado += num(r.valor_causado)
      cur.ingreso += num(r.valor_ingreso)
      m.set(a, cur)
    }
    return [...m.entries()].sort((x, y) => x[0] - y[0]).map(([anio, v]) => ({ label: String(anio), ...v }))
  }, [rows])

  // Aviso claro sobre por qué ingreso puede superar al causado.
  const totalCausado = useMemo(() => porAnio.reduce((s, r) => s + r.causado, 0), [porAnio])
  const totalIngreso = useMemo(() => porAnio.reduce((s, r) => s + r.ingreso, 0), [porAnio])

  const thin = Math.max(0, Math.ceil(porMes.length / 12) - 1)

  return (
    <div className="space-y-8">
      <Seccion titulo="Causado vs. ingreso reconocido por EPS">
        <Panel
          titulo="Por mes"
          nota="valor mensual (COP) · barra = causado / ingreso reconocido"
        >
          <Alto h="h-80">
            <BarChart data={porMes} margin={{ top: 8, right: 12, bottom: 24, left: 4 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
              <XAxis
                dataKey="label"
                tick={tickX}
                axisLine={false}
                tickLine={false}
                interval={thin}
                angle={-35}
                textAnchor="end"
                height={48}
              />
              <YAxis
                tick={tickX}
                axisLine={false}
                tickLine={false}
                width={56}
                tickFormatter={(v) => fmtCosto(Number(v))}
              />
              <Tooltip cursor={{ fill: 'rgba(0,54,156,0.04)' }} content={ValorTip} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="causado" name="Causado" fill={AZUL} radius={[3, 3, 0, 0]} maxBarSize={22} />
              <Bar dataKey="ingreso" name="Ingreso reconocido EPS" fill={NARANJA} radius={[3, 3, 0, 0]} maxBarSize={22} />
            </BarChart>
          </Alto>
        </Panel>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Panel titulo="Por año" nota="acumulado anual (COP)">
            <Alto>
              <BarChart data={porAnio} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
                <XAxis dataKey="label" tick={tickX} axisLine={false} tickLine={false} />
                <YAxis
                  tick={tickX}
                  axisLine={false}
                  tickLine={false}
                  width={56}
                  tickFormatter={(v) => fmtCosto(Number(v))}
                />
                <Tooltip cursor={{ fill: 'rgba(0,54,156,0.04)' }} content={ValorTip} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="causado" name="Causado" fill={AZUL} radius={[4, 4, 0, 0]} maxBarSize={48} />
                <Bar dataKey="ingreso" name="Ingreso reconocido EPS" fill={NARANJA} radius={[4, 4, 0, 0]} maxBarSize={48} />
              </BarChart>
            </Alto>
          </Panel>

          <Panel titulo="Lectura" nota="qué muestran estos paneles">
            <div className="space-y-3 text-sm leading-6 text-gray-600">
              <p>
                <span className="font-semibold text-gray-900">Causado</span>: suma a cobrar de las
                incapacidades generadas cada mes.{' '}
                <span className="font-semibold text-gray-900">Ingreso reconocido</span>: valor que la
                EPS acepta en su factura (captura manual). No es lo recaudado.
              </p>
              <p>
                El ingreso reconocido puede superar al causado (histórico:{' '}
                {fmtCOP(totalIngreso)} vs. {fmtCOP(totalCausado)}) por reliquidaciones y ajustes de
                la EPS posteriores al cálculo inicial.
              </p>
              <p className="text-gray-500">
                El recaudo mes a mes, la cartera por EPS y el % de recuperación llegan cuando se
                carguen las tablas de pagos y cartera.
              </p>
            </div>
          </Panel>
        </div>
      </Seccion>
    </div>
  )
}

// ── Tooltip enriquecido: causado · ingreso · Δ ─────────────────────
const ValorTip = ({ active, payload, label }: TooltipProps<number, string>) => {
  const d = payload?.[0]?.payload as { causado: number; ingreso: number } | undefined
  if (!active || !d) return null
  const dif = d.ingreso - d.causado
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-sm">
      <p className="mb-1 font-semibold text-gray-900">{label}</p>
      <p className="flex items-center justify-between gap-4 text-gray-600">
        <span>Causado</span>
        <span className="font-semibold text-gray-900">{fmtCOP(d.causado)}</span>
      </p>
      <p className="flex items-center justify-between gap-4 text-gray-600">
        <span>Ingreso EPS</span>
        <span className="font-semibold text-gray-900">{fmtCOP(d.ingreso)}</span>
      </p>
      <p className="mt-1 flex items-center justify-between gap-4 border-t border-gray-100 pt-1 text-gray-600">
        <span>Δ ingreso − causado</span>
        <span className={`font-semibold ${dif >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
          {fmtCOP(dif)}
        </span>
      </p>
    </div>
  )
}

// ── UI helpers (mismos que el resto de tableros) ───────────────────
const tickX = { fontSize: 12, fill: '#6b7280' } as const

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-gray-400">{titulo}</p>
      {children}
    </section>
  )
}

function Panel({ titulo, nota, children }: { titulo: string; nota?: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200/80 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-baseline gap-2">
        <h3 className="text-sm font-semibold text-gray-800">{titulo}</h3>
        {nota && <span className="text-xs text-gray-400">{nota}</span>}
      </div>
      {children}
    </div>
  )
}

function Alto({ children, h = 'h-72' }: { children: ReactNode; h?: string }) {
  return (
    <div className={h}>
      <ResponsiveContainer width="100%" height="100%">
        {children as ReactElement}
      </ResponsiveContainer>
    </div>
  )
}
