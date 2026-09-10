// ═══════════════════════════════════════════════════════════
// RecaudoGraficos (client component)
// Módulo RECAUDO. Paneles:
//   1. Recaudo vs. causado por mes de generación (+ línea % recaudo)
//   2. Recaudo mes a mes (por mes de pago) — flujo de caja
//   3. Causado vs. ingreso reconocido por EPS (por mes)
// Datos desde vw_recaudo_mensual y vw_recaudo_por_mes_pago. Toda la
// lógica (sumas, %, saldo) vive en esas vistas; aquí solo se presenta.
//
// Ubicación: components/RecaudoGraficos.tsx
// ═══════════════════════════════════════════════════════════

'use client'

import { useMemo, type ReactNode, type ReactElement } from 'react'
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import type { TooltipProps } from 'recharts'

// ── Formato (mismo criterio que el resto del proyecto) ──
const num = (v: number | string | null | undefined) => {
  const n = typeof v === 'number' ? v : v == null ? 0 : Number(v)
  return Number.isFinite(n) ? n : 0
}
const fmtCosto = (n: number) =>
  n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `$${(n / 1e3).toFixed(0)}K` : `$${n.toFixed(0)}`
const fmtCOP = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)
const fmtPct = (frac: number) => `${(frac * 100).toFixed(1)}%`

const AZUL = '#00369C'
const NARANJA = '#EA8C00'
const VERDE = '#0F9D58'

const MES_ABBR = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const mesLabel = (periodo?: string) => {
  const [y, m] = (periodo ?? '').split('-')
  return `${MES_ABBR[Number(m) - 1] ?? m} ${(y ?? '').slice(2)}`
}

export type RecaudoMensualRow = {
  mes_generacion: string
  anio: number | string | null
  periodo: string
  valor_causado: number | string | null
  valor_ingreso: number | string | null
  total_recaudado: number | string | null
  pct_recaudo: number | string | null
  saldo_por_recaudar: number | string | null
}
export type RecaudoPagoRow = {
  mes_pago: string
  periodo: string
  total_recaudado: number | string | null
}

export default function RecaudoGraficos({
  mensual,
  porPago,
}: {
  mensual: RecaudoMensualRow[]
  porPago: RecaudoPagoRow[]
}) {
  const porGen = useMemo(
    () =>
      [...mensual]
        .sort((a, b) => (a.mes_generacion < b.mes_generacion ? -1 : a.mes_generacion > b.mes_generacion ? 1 : 0))
        .map((r) => ({
          label: mesLabel(r.periodo),
          causado: num(r.valor_causado),
          ingreso: num(r.valor_ingreso),
          recaudado: num(r.total_recaudado),
          saldo: num(r.saldo_por_recaudar),
          pct: num(r.pct_recaudo),
        })),
    [mensual],
  )

  const flujo = useMemo(
    () =>
      [...porPago]
        .sort((a, b) => (a.mes_pago < b.mes_pago ? -1 : a.mes_pago > b.mes_pago ? 1 : 0))
        .map((r) => ({ label: mesLabel(r.periodo), recaudado: num(r.total_recaudado) })),
    [porPago],
  )

  const totalCausado = useMemo(() => porGen.reduce((s, r) => s + r.causado, 0), [porGen])
  const totalRecaudado = useMemo(() => porGen.reduce((s, r) => s + r.recaudado, 0), [porGen])
  const totalIngreso = useMemo(() => porGen.reduce((s, r) => s + r.ingreso, 0), [porGen])

  const thinGen = Math.max(0, Math.ceil(porGen.length / 12) - 1)
  const thinFlujo = Math.max(0, Math.ceil(flujo.length / 12) - 1)

  return (
    <div className="space-y-8">
      {/* ── Recaudo ── */}
      <Seccion titulo="Recaudo">
        <Panel titulo="Recaudo vs. causado por mes de generación" nota="barras = COP · línea = % recaudo de la cohorte">
          <Alto h="h-80">
            <ComposedChart data={porGen} margin={{ top: 8, right: 16, bottom: 24, left: 4 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
              <XAxis
                dataKey="label"
                tick={tickX}
                axisLine={false}
                tickLine={false}
                interval={thinGen}
                angle={-35}
                textAnchor="end"
                height={48}
              />
              <YAxis
                yAxisId="cop"
                tick={tickX}
                axisLine={false}
                tickLine={false}
                width={56}
                tickFormatter={(v) => fmtCosto(Number(v))}
              />
              <YAxis
                yAxisId="pct"
                orientation="right"
                tick={tickX}
                axisLine={false}
                tickLine={false}
                width={48}
                domain={[0, 'auto']}
                tickFormatter={(v) => fmtPct(Number(v))}
              />
              <Tooltip cursor={{ fill: 'rgba(0,54,156,0.04)' }} content={GenTip} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar yAxisId="cop" dataKey="causado" name="Causado" fill={AZUL} radius={[3, 3, 0, 0]} maxBarSize={22} />
              <Bar yAxisId="cop" dataKey="recaudado" name="Recaudado" fill={VERDE} radius={[3, 3, 0, 0]} maxBarSize={22} />
              <Line yAxisId="pct" type="monotone" dataKey="pct" name="% recaudo" stroke={NARANJA} strokeWidth={2} dot={{ r: 2 }} />
            </ComposedChart>
          </Alto>
        </Panel>

        <Panel titulo="Recaudo mes a mes" nota="por mes de pago — flujo de caja (COP)">
          <Alto>
            <BarChart data={flujo} margin={{ top: 8, right: 12, bottom: 24, left: 4 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
              <XAxis
                dataKey="label"
                tick={tickX}
                axisLine={false}
                tickLine={false}
                interval={thinFlujo}
                angle={-35}
                textAnchor="end"
                height={48}
              />
              <YAxis tick={tickX} axisLine={false} tickLine={false} width={56} tickFormatter={(v) => fmtCosto(Number(v))} />
              <Tooltip cursor={{ fill: 'rgba(15,157,88,0.06)' }} content={FlujoTip} />
              <Bar dataKey="recaudado" name="Recaudado" fill={VERDE} radius={[3, 3, 0, 0]} maxBarSize={28} />
            </BarChart>
          </Alto>
        </Panel>
      </Seccion>

      {/* ── Causado vs. ingreso reconocido ── */}
      <Seccion titulo="Causado vs. ingreso reconocido por EPS">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Panel titulo="Por mes" nota="valor mensual (COP)">
              <Alto>
                <BarChart data={porGen} margin={{ top: 8, right: 12, bottom: 24, left: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
                  <XAxis
                    dataKey="label"
                    tick={tickX}
                    axisLine={false}
                    tickLine={false}
                    interval={thinGen}
                    angle={-35}
                    textAnchor="end"
                    height={48}
                  />
                  <YAxis tick={tickX} axisLine={false} tickLine={false} width={56} tickFormatter={(v) => fmtCosto(Number(v))} />
                  <Tooltip cursor={{ fill: 'rgba(0,54,156,0.04)' }} content={CausadoIngresoTip} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="causado" name="Causado" fill={AZUL} radius={[3, 3, 0, 0]} maxBarSize={22} />
                  <Bar dataKey="ingreso" name="Ingreso reconocido EPS" fill={NARANJA} radius={[3, 3, 0, 0]} maxBarSize={22} />
                </BarChart>
              </Alto>
            </Panel>
          </div>

          <Panel titulo="Lectura" nota="qué muestran estos paneles">
            <div className="space-y-3 text-sm leading-6 text-gray-600">
              <p>
                <span className="font-semibold text-gray-900">Causado</span>: a cobrar.{' '}
                <span className="font-semibold text-gray-900">Recaudado</span>: lo efectivamente
                cobrado.{' '}
                <span className="font-semibold text-gray-900">Ingreso reconocido</span>: lo que la
                EPS acepta en factura (no es recaudo).
              </p>
              <p>
                Recaudado histórico {fmtCOP(totalRecaudado)} de {fmtCOP(totalCausado)} causado. El
                ingreso reconocido ({fmtCOP(totalIngreso)}) puede superar al causado por
                reliquidaciones de la EPS.
              </p>
              <p className="text-gray-500">La cartera por EPS llega cuando se cargue la sección de cartera.</p>
            </div>
          </Panel>
        </div>
      </Seccion>
    </div>
  )
}

// ── Tooltips enriquecidos ──────────────────────────────────────────
function TipShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-sm">
      <p className="mb-1 font-semibold text-gray-900">{title}</p>
      {children}
    </div>
  )
}
function Fila({ k, v, tone }: { k: string; v: string; tone?: string }) {
  return (
    <p className="flex items-center justify-between gap-4 text-gray-600">
      <span>{k}</span>
      <span className={`font-semibold ${tone ?? 'text-gray-900'}`}>{v}</span>
    </p>
  )
}

const GenTip = ({ active, payload, label }: TooltipProps<number, string>) => {
  const d = payload?.[0]?.payload as
    | { causado: number; recaudado: number; saldo: number; pct: number }
    | undefined
  if (!active || !d) return null
  return (
    <TipShell title={label as string}>
      <Fila k="Causado" v={fmtCOP(d.causado)} />
      <Fila k="Recaudado" v={fmtCOP(d.recaudado)} tone="text-emerald-600" />
      <Fila k="Saldo" v={fmtCOP(d.saldo)} tone="text-red-600" />
      <div className="mt-1 border-t border-gray-100 pt-1">
        <Fila k="% recaudo" v={fmtPct(d.pct)} tone="text-[#EA8C00]" />
      </div>
    </TipShell>
  )
}

const FlujoTip = ({ active, payload, label }: TooltipProps<number, string>) => {
  const d = payload?.[0]?.payload as { recaudado: number } | undefined
  if (!active || !d) return null
  return (
    <TipShell title={label as string}>
      <Fila k="Recaudado" v={fmtCOP(d.recaudado)} tone="text-emerald-600" />
    </TipShell>
  )
}

const CausadoIngresoTip = ({ active, payload, label }: TooltipProps<number, string>) => {
  const d = payload?.[0]?.payload as { causado: number; ingreso: number } | undefined
  if (!active || !d) return null
  const dif = d.ingreso - d.causado
  return (
    <TipShell title={label as string}>
      <Fila k="Causado" v={fmtCOP(d.causado)} />
      <Fila k="Ingreso EPS" v={fmtCOP(d.ingreso)} />
      <div className="mt-1 border-t border-gray-100 pt-1">
        <Fila k="Δ ingreso − causado" v={fmtCOP(dif)} tone={dif >= 0 ? 'text-emerald-600' : 'text-red-600'} />
      </div>
    </TipShell>
  )
}

// ── UI helpers ─────────────────────────────────────────────────────
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
