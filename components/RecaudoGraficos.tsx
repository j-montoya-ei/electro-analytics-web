// ═══════════════════════════════════════════════════════════
// RecaudoGraficos (client component) — módulo RECAUDO completo.
// Secciones:
//   1. Recaudo (vs. causado por generación + flujo por mes de pago)
//   2. Causado vs. ingreso reconocido por EPS
//   3. Cartera por EPS (saldo actual, abono acumulado, evolución)
// Datos desde las vistas vw_recaudo_* y vw_cartera_*. La lógica vive
// en las vistas; aquí solo se presenta.
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

// ── Formato ──
const num = (v: number | string | null | undefined) => {
  const n = typeof v === 'number' ? v : v == null ? 0 : Number(v)
  return Number.isFinite(n) ? n : 0
}
const fmtCosto = (n: number) =>
  n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `$${(n / 1e3).toFixed(0)}K` : `$${n.toFixed(0)}`
const fmtCOP = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)
const fmtPct = (frac: number) => `${(frac * 100).toFixed(1)}%`
const corto = (s?: string | null, n = 24) => {
  const t = (s ?? '').trim()
  return t.length > n ? `${t.slice(0, n - 1)}…` : t
}

const AZUL = '#00369C'
const NARANJA = '#EA8C00'
const VERDE = '#0F9D58'
const ROJO = '#D14343'

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
export type CarteraEntidadRow = {
  nit: string
  entidad: string | null
  ultimo_corte: string | null
  saldo_actual: number | string | null
  total_abonado: number | string | null
}
export type CarteraCorteRow = {
  mes_corte: string
  periodo: string
  saldo_anterior_total: number | string | null
  abono_total: number | string | null
  saldo_total: number | string | null
}

export default function RecaudoGraficos({
  mensual,
  porPago,
  carteraEntidad,
  carteraCorte,
}: {
  mensual: RecaudoMensualRow[]
  porPago: RecaudoPagoRow[]
  carteraEntidad: CarteraEntidadRow[]
  carteraCorte: CarteraCorteRow[]
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

  const saldoPorEps = useMemo(
    () =>
      [...carteraEntidad]
        .map((r) => ({ label: corto(r.entidad), saldo: num(r.saldo_actual) }))
        .filter((r) => r.saldo > 0)
        .sort((a, b) => b.saldo - a.saldo)
        .slice(0, 10),
    [carteraEntidad],
  )

  const abonoPorEps = useMemo(
    () =>
      [...carteraEntidad]
        .map((r) => ({ label: corto(r.entidad), abonado: num(r.total_abonado) }))
        .filter((r) => r.abonado > 0)
        .sort((a, b) => b.abonado - a.abonado)
        .slice(0, 10),
    [carteraEntidad],
  )

  const evolucion = useMemo(
    () =>
      [...carteraCorte]
        .sort((a, b) => (a.mes_corte < b.mes_corte ? -1 : a.mes_corte > b.mes_corte ? 1 : 0))
        .map((r) => ({
          label: mesLabel(r.periodo),
          saldo: num(r.saldo_total),
          abono: num(r.abono_total),
        })),
    [carteraCorte],
  )

  const totalCausado = useMemo(() => porGen.reduce((s, r) => s + r.causado, 0), [porGen])
  const totalRecaudado = useMemo(() => porGen.reduce((s, r) => s + r.recaudado, 0), [porGen])
  const totalIngreso = useMemo(() => porGen.reduce((s, r) => s + r.ingreso, 0), [porGen])

  const thinGen = Math.max(0, Math.ceil(porGen.length / 12) - 1)
  const thinFlujo = Math.max(0, Math.ceil(flujo.length / 12) - 1)
  const thinEvo = Math.max(0, Math.ceil(evolucion.length / 12) - 1)
  const hayCartera = evolucion.length > 0

  return (
    <div className="space-y-8">
      {/* ── Recaudo ── */}
      <Seccion titulo="Recaudo">
        <Panel titulo="Recaudo vs. causado por mes de generación" nota="barras = COP · línea = % recaudo de la cohorte">
          <Alto h="h-80">
            <ComposedChart data={porGen} margin={{ top: 8, right: 16, bottom: 24, left: 4 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
              <XAxis dataKey="label" tick={tickX} axisLine={false} tickLine={false} interval={thinGen} angle={-35} textAnchor="end" height={48} />
              <YAxis yAxisId="cop" tick={tickX} axisLine={false} tickLine={false} width={56} tickFormatter={(v) => fmtCosto(Number(v))} />
              <YAxis yAxisId="pct" orientation="right" tick={tickX} axisLine={false} tickLine={false} width={48} domain={[0, 'auto']} tickFormatter={(v) => fmtPct(Number(v))} />
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
              <XAxis dataKey="label" tick={tickX} axisLine={false} tickLine={false} interval={thinFlujo} angle={-35} textAnchor="end" height={48} />
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
                  <XAxis dataKey="label" tick={tickX} axisLine={false} tickLine={false} interval={thinGen} angle={-35} textAnchor="end" height={48} />
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
                <span className="font-semibold text-gray-900">Recaudado</span>: lo cobrado.{' '}
                <span className="font-semibold text-gray-900">Ingreso reconocido</span>: lo que la
                EPS acepta en factura (no es recaudo).
              </p>
              <p>
                Recaudado histórico {fmtCOP(totalRecaudado)} de {fmtCOP(totalCausado)} causado. El
                ingreso reconocido ({fmtCOP(totalIngreso)}) puede superar al causado por
                reliquidaciones de la EPS.
              </p>
            </div>
          </Panel>
        </div>
      </Seccion>

      {/* ── Cartera por EPS ── */}
      {hayCartera && (
        <Seccion titulo="Cartera por EPS">
          <Panel titulo="Evolución de la cartera" nota="por mes de corte — saldo pendiente vs. abono (COP)">
            <Alto>
              <ComposedChart data={evolucion} margin={{ top: 8, right: 12, bottom: 24, left: 4 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
                <XAxis dataKey="label" tick={tickX} axisLine={false} tickLine={false} interval={thinEvo} angle={-35} textAnchor="end" height={48} />
                <YAxis tick={tickX} axisLine={false} tickLine={false} width={56} tickFormatter={(v) => fmtCosto(Number(v))} />
                <Tooltip cursor={{ fill: 'rgba(0,54,156,0.04)' }} content={EvoTip} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="abono" name="Abono del corte" fill={VERDE} radius={[3, 3, 0, 0]} maxBarSize={24} />
                <Line type="monotone" dataKey="saldo" name="Saldo pendiente" stroke={ROJO} strokeWidth={2} dot={{ r: 2 }} />
              </ComposedChart>
            </Alto>
          </Panel>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Panel titulo="Cartera actual por EPS" nota="saldo del último corte · top 10">
              <Alto>
                <BarChart data={saldoPorEps} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eef2f7" />
                  <XAxis type="number" tick={tickX} axisLine={false} tickLine={false} tickFormatter={(v) => fmtCosto(Number(v))} />
                  <YAxis type="category" dataKey="label" tick={tickY} axisLine={false} tickLine={false} width={150} />
                  <Tooltip cursor={{ fill: 'rgba(209,67,67,0.06)' }} content={EpsSaldoTip} />
                  <Bar dataKey="saldo" name="Saldo" fill={ROJO} radius={[0, 3, 3, 0]} maxBarSize={18} />
                </BarChart>
              </Alto>
            </Panel>

            <Panel titulo="Abono acumulado por EPS" nota="total recaudado histórico · top 10">
              <Alto>
                <BarChart data={abonoPorEps} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eef2f7" />
                  <XAxis type="number" tick={tickX} axisLine={false} tickLine={false} tickFormatter={(v) => fmtCosto(Number(v))} />
                  <YAxis type="category" dataKey="label" tick={tickY} axisLine={false} tickLine={false} width={150} />
                  <Tooltip cursor={{ fill: 'rgba(15,157,88,0.06)' }} content={EpsAbonoTip} />
                  <Bar dataKey="abonado" name="Abonado" fill={VERDE} radius={[0, 3, 3, 0]} maxBarSize={18} />
                </BarChart>
              </Alto>
            </Panel>
          </div>
        </Seccion>
      )}
    </div>
  )
}

// ── Tooltips ──
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
  const d = payload?.[0]?.payload as { causado: number; recaudado: number; saldo: number; pct: number } | undefined
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
const EvoTip = ({ active, payload, label }: TooltipProps<number, string>) => {
  const d = payload?.[0]?.payload as { saldo: number; abono: number } | undefined
  if (!active || !d) return null
  return (
    <TipShell title={label as string}>
      <Fila k="Saldo pendiente" v={fmtCOP(d.saldo)} tone="text-red-600" />
      <Fila k="Abono del corte" v={fmtCOP(d.abono)} tone="text-emerald-600" />
    </TipShell>
  )
}
const EpsSaldoTip = ({ active, payload }: TooltipProps<number, string>) => {
  const d = payload?.[0]?.payload as { label: string; saldo: number } | undefined
  if (!active || !d) return null
  return (
    <TipShell title={d.label}>
      <Fila k="Saldo actual" v={fmtCOP(d.saldo)} tone="text-red-600" />
    </TipShell>
  )
}
const EpsAbonoTip = ({ active, payload }: TooltipProps<number, string>) => {
  const d = payload?.[0]?.payload as { label: string; abonado: number } | undefined
  if (!active || !d) return null
  return (
    <TipShell title={d.label}>
      <Fila k="Abonado" v={fmtCOP(d.abonado)} tone="text-emerald-600" />
    </TipShell>
  )
}

// ── UI helpers ──
const tickX = { fontSize: 12, fill: '#6b7280' } as const
const tickY = { fontSize: 11, fill: '#6b7280' } as const

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
