// ═══════════════════════════════════════════════════════════
// RecaudoDashboard (client component) · módulo Recaudo (nuevo)
// Todo sale de vistas SQL calculadas desde la base de incapacidades
// (vw_recaudo_*) + los ingresos digitados (recaudo_ingresos).
// Reglas de negocio en SQL; aquí solo se filtra por año/mes y se dibuja.
//
// Secciones:
//   1. KPIs
//   2. Causado vs recaudado por mes de generación (+ % recaudo)
//   3. Flujo por mes: pagado según base vs ingreso al banco
//   4. Matriz mes de generación × mes de pago
//   5. Cartera por entidad (mes seleccionable) + evolución del saldo
//   6. Conciliación banco vs base por entidad (mes seleccionable)
//
// Ubicación: components/RecaudoDashboard.tsx
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
} from 'recharts'
import type { TooltipProps } from 'recharts'
import { Coins, Wallet, TrendingUp, Landmark, Scale, AlertTriangle } from 'lucide-react'

// ── tipos (columnas de las vistas) ──
export type ConsolidadoRow = {
  mes: string
  causado: number | string
  recaudado_cohorte: number | string
  pagado_base_mes: number | string
  ingreso_banco_mes: number | string
  n_ingresos: number | string
}
export type MatrizRow = { mes_gen: string; mes_pago: string; valor: number | string; n_incap: number | string }
export type CarteraRow = {
  entidad: string
  mes: string
  saldo_anterior: number | string
  radicado_mes: number | string
  abono_mes: number | string
  nuevo_saldo: number | string
}
export type ConciliacionRow = {
  entidad: string
  mes: string
  ingreso_banco: number | string
  pagado_base: number | string
  diferencia: number | string
  n_ingresos: number | string
  n_pagadas: number | string
}
export type DisputaRow = { entidad: string; en_disputa: number | string; n_incap: number | string }

// ── formato ──
const num = (v: number | string | null | undefined) => {
  const n = typeof v === 'number' ? v : v == null ? 0 : Number(v)
  return Number.isFinite(n) ? n : 0
}
const fmtCOP = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)
const fmtM = (n: number) =>
  Math.abs(n) >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : Math.abs(n) >= 1e3 ? `$${(n / 1e3).toFixed(0)}K` : `$${n.toFixed(0)}`
const fmtPct = (f: number) => `${(f * 100).toFixed(1)}%`
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const fmtMes = (iso: string) => {
  const [y, m] = iso.split('-')
  return `${MESES[Number(m) - 1]}-${y.slice(2)}`
}
const fmtMesLargo = (iso: string) => {
  const [y, m] = iso.split('-')
  return `${MESES[Number(m) - 1]}-${y}`
}
const anioDe = (iso: string) => iso.slice(0, 4)

const AZUL = '#00369C'
const VERDE = '#059669'
const NARANJA = '#EA8C00'
const TEAL = '#0E7490'
const PALETA = ['#00369C', '#0E7490', '#EA8C00', '#7C3AED', '#DB2777', '#9CA3AF']
const TODOS = ''

export default function RecaudoDashboard({
  consolidado,
  matriz,
  cartera,
  conciliacion,
  disputa,
}: {
  consolidado: ConsolidadoRow[]
  matriz: MatrizRow[]
  cartera: CarteraRow[]
  conciliacion: ConciliacionRow[]
  disputa: DisputaRow[]
}) {
  const anios = useMemo(() => [...new Set(consolidado.map((r) => anioDe(r.mes)))].sort(), [consolidado])
  const [anio, setAnio] = useState(TODOS)

  // ── consolidado filtrado por año ──
  const cons = useMemo(
    () =>
      consolidado
        .filter((r) => anio === TODOS || anioDe(r.mes) === anio)
        .map((r) => {
          const causado = num(r.causado)
          const recaudado = num(r.recaudado_cohorte)
          return {
            mes: r.mes,
            label: fmtMes(r.mes),
            causado,
            recaudado,
            pendiente: causado - recaudado,
            pct: causado > 0 ? recaudado / causado : null,
            pagadoBase: num(r.pagado_base_mes),
            ingresoBanco: num(r.ingreso_banco_mes),
            nIngresos: num(r.n_ingresos),
          }
        }),
    [consolidado, anio],
  )

  // ── KPIs ──
  const ultimoMesCartera = useMemo(() => cartera.reduce((m, r) => (r.mes > m ? r.mes : m), ''), [cartera])
  const kpi = useMemo(() => {
    const causado = cons.reduce((s, r) => s + r.causado, 0)
    const recaudado = cons.reduce((s, r) => s + r.recaudado, 0)
    const banco = cons.reduce((s, r) => s + r.ingresoBanco, 0)
    const base = cons.reduce((s, r) => s + r.pagadoBase, 0)
    const mesesConIngreso = cons.filter((r) => r.nIngresos > 0).length
    const carteraHoy = cartera.filter((r) => r.mes === ultimoMesCartera).reduce((s, r) => s + num(r.nuevo_saldo), 0)
    const disp = disputa.reduce((s, r) => s + num(r.en_disputa), 0)
    const nDisp = disputa.reduce((s, r) => s + num(r.n_incap), 0)
    return { causado, recaudado, pct: causado > 0 ? recaudado / causado : 0, banco, base, mesesConIngreso, carteraHoy, disp, nDisp }
  }, [cons, cartera, disputa, ultimoMesCartera])

  // ── matriz (filas del año filtrado; columnas = meses de pago con dato) ──
  const mat = useMemo(() => {
    const filas = matriz.filter((r) => anio === TODOS || anioDe(r.mes_gen) === anio)
    const cols = [...new Set(filas.map((r) => r.mes_pago))].sort()
    const map = new Map<string, { valor: number; n: number }>()
    let max = 0
    for (const r of filas) {
      const v = num(r.valor)
      map.set(`${r.mes_gen}|${r.mes_pago}`, { valor: v, n: num(r.n_incap) })
      if (v > max) max = v
    }
    return { cols, map, max }
  }, [matriz, anio])

  return (
    <div className="@container space-y-8">
      {/* Filtro de año */}
      <div className="flex flex-col gap-3 rounded-xl border border-gray-200/80 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between md:p-5">
        <div className="flex items-center gap-3">
          <label className="text-xs font-medium text-gray-500" htmlFor="anio-recaudo">
            Año (mes de generación)
          </label>
          <select
            id="anio-recaudo"
            value={anio}
            onChange={(e) => setAnio(e.target.value)}
            className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 outline-none focus:border-[#00369C] focus:ring-2 focus:ring-[#00369C]/15"
          >
            <option value={TODOS}>Todos</option>
            {[...anios].reverse().map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
        <p className="text-xs text-gray-500">
          Calculado desde la base de incapacidades. Pagada = TNL completo; en Derecho Petición se
          descuenta el saldo pendiente que registra GH (la base no trae “valor pagado”).
        </p>
      </div>

      {/* 1 · KPIs */}
      <div className="grid grid-cols-1 gap-4 @lg:grid-cols-2 @4xl:grid-cols-3 @[90rem]:grid-cols-6">
        <Kpi label="Causado (TNL)" value={fmtM(kpi.causado)} detalle={fmtCOP(kpi.causado)} tone="blue" icon={<Coins className="h-5 w-5" />} />
        <Kpi label="Recaudado" value={fmtM(kpi.recaudado)} detalle={fmtCOP(kpi.recaudado)} tone="green" icon={<Wallet className="h-5 w-5" />} />
        <Kpi
          label="% de recaudo"
          value={fmtPct(kpi.pct)}
          detalle={`pendiente ${fmtM(kpi.causado - kpi.recaudado)}`}
          tone="yellow"
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <Kpi
          label="Cartera por cobrar"
          value={fmtM(kpi.carteraHoy)}
          detalle={ultimoMesCartera ? `al cierre de ${fmtMesLargo(ultimoMesCartera)} · todas las entidades` : '—'}
          tone="red"
          icon={<Landmark className="h-5 w-5" />}
        />
        <Kpi
          label="En disputa (Derecho Petición)"
          value={fmtM(kpi.disp)}
          detalle={`${kpi.nDisp} incapacidades · saldo a hoy`}
          tone="red"
          icon={<AlertTriangle className="h-5 w-5" />}
        />
        <Kpi
          label="Ingreso al banco (registrado)"
          value={fmtM(kpi.banco)}
          detalle={
            kpi.mesesConIngreso === 0
              ? 'aún no hay ingresos registrados'
              : `base ${fmtM(kpi.base)} · ${kpi.mesesConIngreso} mes(es) con registro`
          }
          tone="gray"
          icon={<Scale className="h-5 w-5" />}
        />
      </div>

      {/* 2 · Causado vs recaudado */}
      <Seccion titulo="Recaudo por mes de generación">
        <Panel titulo="Causado vs recaudado" nota="barras = COP · línea = % recaudado de las incapacidades de ese mes">
          <Alto h="h-80">
            <ComposedChart data={cons} margin={{ top: 8, right: 8, bottom: 4, left: 4 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
              <XAxis dataKey="label" tick={tickX} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis yAxisId="v" tick={tickX} axisLine={false} tickLine={false} tickFormatter={(v) => fmtM(Number(v))} width={60} />
              <YAxis yAxisId="p" orientation="right" tick={tickX} axisLine={false} tickLine={false} domain={[0, 1]} tickFormatter={(v) => `${Math.round(Number(v) * 100)}%`} width={44} />
              <Tooltip
                cursor={{ fill: 'rgba(0,54,156,0.04)' }}
                content={(p: TooltipProps<number, string>) => {
                  const d = p.payload?.[0]?.payload as (typeof cons)[number] | undefined
                  if (!p.active || !d) return null
                  return (
                    <TipBox title={`Incapacidades de ${fmtMesLargo(d.mes)}`}>
                      <TipRow c={AZUL} k="Causado" v={fmtCOP(d.causado)} />
                      <TipRow c={VERDE} k="Recaudado" v={fmtCOP(d.recaudado)} />
                      <TipRow c="#9CA3AF" k="Pendiente" v={fmtCOP(d.pendiente)} />
                      <TipRow c={NARANJA} k="% recaudo" v={d.pct == null ? '—' : fmtPct(d.pct)} />
                    </TipBox>
                  )
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar yAxisId="v" dataKey="causado" name="Causado" fill={AZUL} radius={[3, 3, 0, 0]} maxBarSize={22} />
              <Bar yAxisId="v" dataKey="recaudado" name="Recaudado" fill={VERDE} radius={[3, 3, 0, 0]} maxBarSize={22} />
              <Line yAxisId="p" type="linear" dataKey="pct" name="% recaudo" stroke={NARANJA} strokeWidth={2} dot={{ r: 3, fill: NARANJA }} connectNulls />
            </ComposedChart>
          </Alto>
          <p className="mt-2 text-xs text-gray-400">
            Los meses recientes tienen % bajo porque las EPS tardan en pagar; no es mora necesariamente.
          </p>
        </Panel>
      </Seccion>

      {/* 3 · Flujo por mes de pago */}
      <Seccion titulo="Flujo por mes (calendario)">
        <Panel titulo="Pagado según la base vs ingreso al banco" nota="lo que la base marca como pagado en el mes · lo registrado del extracto">
          <Alto>
            <BarChart data={cons} margin={{ top: 8, right: 8, bottom: 4, left: 4 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
              <XAxis dataKey="label" tick={tickX} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis tick={tickX} axisLine={false} tickLine={false} tickFormatter={(v) => fmtM(Number(v))} width={60} />
              <Tooltip
                cursor={{ fill: 'rgba(0,54,156,0.04)' }}
                content={(p: TooltipProps<number, string>) => {
                  const d = p.payload?.[0]?.payload as (typeof cons)[number] | undefined
                  if (!p.active || !d) return null
                  const dif = d.ingresoBanco - d.pagadoBase
                  return (
                    <TipBox title={fmtMesLargo(d.mes)}>
                      <TipRow c={AZUL} k="Pagado según base" v={fmtCOP(d.pagadoBase)} />
                      <TipRow
                        c={TEAL}
                        k="Ingreso al banco"
                        v={d.nIngresos ? `${fmtCOP(d.ingresoBanco)} (${d.nIngresos} reg.)` : 'sin registrar'}
                      />
                      {d.nIngresos > 0 && (
                        <TipRow c={dif === 0 ? '#9CA3AF' : '#DC2626'} k="Diferencia banco − base" v={fmtCOP(dif)} />
                      )}
                    </TipBox>
                  )
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="pagadoBase" name="Pagado según base" fill={AZUL} radius={[3, 3, 0, 0]} maxBarSize={22} />
              <Bar dataKey="ingresoBanco" name="Ingreso al banco" fill={TEAL} radius={[3, 3, 0, 0]} maxBarSize={22} />
            </BarChart>
          </Alto>
        </Panel>
      </Seccion>

      {/* 4 · Matriz */}
      <Seccion titulo="Pagos por mes de generación × mes de pago">
        <Panel titulo="Matriz de recaudo" nota="fila = mes de la incapacidad · columna = mes en que se pagó">
          {mat.cols.length === 0 ? (
            <Vacio texto="Aún no hay pagos registrados en la base." />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-0 text-xs">
                <thead>
                  <tr className="text-gray-500">
                    <th className="sticky left-0 z-10 bg-white px-2 py-2 text-left font-semibold">Generación</th>
                    <th className="px-2 py-2 text-right font-semibold">Causado</th>
                    {mat.cols.map((c) => (
                      <th key={c} className="whitespace-nowrap px-2 py-2 text-right font-semibold">
                        {fmtMes(c)}
                      </th>
                    ))}
                    <th className="px-2 py-2 text-right font-semibold">Recaudado</th>
                    <th className="px-2 py-2 text-right font-semibold">%</th>
                  </tr>
                </thead>
                <tbody>
                  {cons.map((r) => (
                    <tr key={r.mes} className="border-t border-gray-100">
                      <td className="sticky left-0 z-10 whitespace-nowrap bg-white px-2 py-1.5 font-semibold text-gray-800">
                        {fmtMesLargo(r.mes)}
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-gray-700">{fmtM(r.causado)}</td>
                      {mat.cols.map((c) => {
                        const cell = mat.map.get(`${r.mes}|${c}`)
                        const alpha = cell ? 0.08 + 0.55 * (cell.valor / (mat.max || 1)) : 0
                        return (
                          <td
                            key={c}
                            className="px-2 py-1.5 text-right tabular-nums text-gray-800"
                            style={cell ? { background: `rgba(5,150,105,${alpha.toFixed(2)})` } : undefined}
                            title={
                              cell
                                ? `Incapacidades de ${fmtMesLargo(r.mes)} pagadas en ${fmtMesLargo(c)}: ${fmtCOP(cell.valor)} · ${cell.n} incap.`
                                : undefined
                            }
                          >
                            {cell ? fmtM(cell.valor) : ''}
                          </td>
                        )
                      })}
                      <td className="px-2 py-1.5 text-right font-semibold tabular-nums text-gray-900">{fmtM(r.recaudado)}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-gray-700">{r.pct == null ? '—' : fmtPct(r.pct)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-2 text-xs text-gray-400">Pasa el mouse sobre una celda para ver el valor exacto y cuántas incapacidades son.</p>
        </Panel>
      </Seccion>

      {/* 5 · Cartera */}
      <CarteraEntidad cartera={cartera} disputa={disputa} />

      {/* 6 · Conciliación */}
      <Conciliacion conciliacion={conciliacion} />
    </div>
  )
}

// ═════════ Cartera por entidad ═════════
function CarteraEntidad({ cartera, disputa }: { cartera: CarteraRow[]; disputa: DisputaRow[] }) {
  const meses = useMemo(() => [...new Set(cartera.map((r) => r.mes))].sort().reverse(), [cartera])
  const [mes, setMes] = useState(meses[0] ?? '')
  const dispMap = useMemo(() => new Map(disputa.map((d) => [d.entidad, d])), [disputa])

  const filas = useMemo(
    () =>
      cartera
        .filter((r) => r.mes === mes)
        .map((r) => ({
          entidad: r.entidad,
          sa: num(r.saldo_anterior),
          rad: num(r.radicado_mes),
          ab: num(r.abono_mes),
          ns: num(r.nuevo_saldo),
          disp: num(dispMap.get(r.entidad)?.en_disputa),
        }))
        .filter((r) => r.sa || r.rad || r.ab || r.ns || r.disp)
        .sort((a, b) => b.ns - a.ns || b.disp - a.disp),
    [cartera, mes, dispMap],
  )
  const tot = filas.reduce(
    (t, r) => ({ sa: t.sa + r.sa, rad: t.rad + r.rad, ab: t.ab + r.ab, ns: t.ns + r.ns, disp: t.disp + r.disp }),
    { sa: 0, rad: 0, ab: 0, ns: 0, disp: 0 },
  )

  // Evolución: top 5 entidades por saldo del último mes + "Otras"
  const evol = useMemo(() => {
    const ult = meses[0]
    const top = cartera
      .filter((r) => r.mes === ult)
      .sort((a, b) => num(b.nuevo_saldo) - num(a.nuevo_saldo))
      .slice(0, 5)
      .filter((r) => num(r.nuevo_saldo) > 0)
      .map((r) => r.entidad)
    const keys = [...top, 'Otras']
    const byMes = new Map<string, Record<string, number | string>>()
    for (const r of cartera) {
      const row = byMes.get(r.mes) ?? { mes: r.mes, label: fmtMes(r.mes), Total: 0 }
      const k = top.includes(r.entidad) ? r.entidad : 'Otras'
      row[k] = num(row[k]) + num(r.nuevo_saldo)
      row.Total = num(row.Total) + num(r.nuevo_saldo)
      byMes.set(r.mes, row)
    }
    const data = [...byMes.values()].sort((a, b) => String(a.mes).localeCompare(String(b.mes)))
    return { keys, data }
  }, [cartera, meses])

  return (
    <Seccion titulo="Cartera por entidad">
      <Panel
        titulo="Cartera del mes"
        nota="saldo = radicado sin pago (sin negadas) · Derecho Petición por su saldo pendiente"
        accion={
          <select
            value={mes}
            onChange={(e) => setMes(e.target.value)}
            className="h-8 rounded-lg border border-gray-300 bg-white px-2 text-xs text-gray-700 outline-none focus:border-[#00369C] focus:ring-2 focus:ring-[#00369C]/15"
            aria-label="Mes de la cartera"
          >
            {meses.map((m) => (
              <option key={m} value={m}>
                {fmtMesLargo(m)}
              </option>
            ))}
          </select>
        }
      >
        {filas.length === 0 ? (
          <Vacio texto="Sin cartera en este mes." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="py-2 pr-3 font-semibold">Entidad</th>
                  <th className="py-2 pr-3 text-right font-semibold">Saldo anterior</th>
                  <th className="py-2 pr-3 text-right font-semibold">+ Radicado en el mes</th>
                  <th className="py-2 pr-3 text-right font-semibold">− Abono (pagado)</th>
                  <th className="py-2 pr-3 text-right font-semibold">= Nuevo saldo</th>
                  <th className="py-2 text-right font-semibold">En disputa (hoy)</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((r) => (
                  <tr key={r.entidad} className="border-b border-gray-50">
                    <td className="py-2 pr-3 font-medium text-gray-900">{r.entidad}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-gray-700">{fmtCOP(r.sa)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-gray-700">{fmtCOP(r.rad)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-emerald-700">{fmtCOP(r.ab)}</td>
                    <td className="py-2 pr-3 text-right font-semibold tabular-nums text-gray-900">{fmtCOP(r.ns)}</td>
                    <td className="py-2 text-right tabular-nums text-amber-700">{r.disp ? fmtCOP(r.disp) : '—'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 font-semibold text-gray-900">
                  <td className="py-2 pr-3">Total</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{fmtCOP(tot.sa)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{fmtCOP(tot.rad)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{fmtCOP(tot.ab)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{fmtCOP(tot.ns)}</td>
                  <td className="py-2 text-right tabular-nums">{fmtCOP(tot.disp)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Panel>

      <Panel titulo="Evolución del saldo por entidad" nota="cierre de cada mes · top 5 entidades + otras">
        <Alto h="h-80">
          <LineChart data={evol.data} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
            <XAxis dataKey="label" tick={tickX} axisLine={false} tickLine={false} interval="preserveStartEnd" />
            <YAxis tick={tickX} axisLine={false} tickLine={false} tickFormatter={(v) => fmtM(Number(v))} width={60} />
            <Tooltip
              content={(p: TooltipProps<number, string>) => {
                const d = p.payload?.[0]?.payload as Record<string, number | string> | undefined
                if (!p.active || !d) return null
                return (
                  <TipBox title={`Saldo al cierre de ${fmtMesLargo(String(d.mes))}`}>
                    {evol.keys.map((k, i) => (
                      <TipRow key={k} c={PALETA[i % PALETA.length]} k={k} v={fmtCOP(num(d[k]))} />
                    ))}
                    <TipRow c="#111827" k="Total" v={fmtCOP(num(d.Total))} bold />
                  </TipBox>
                )
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {evol.keys.map((k, i) => (
              <Line
                key={k}
                type="linear"
                dataKey={k}
                name={k}
                stroke={PALETA[i % PALETA.length]}
                strokeWidth={2}
                strokeDasharray={k === 'Otras' ? '4 3' : undefined}
                dot={false}
              />
            ))}
          </LineChart>
        </Alto>
      </Panel>
    </Seccion>
  )
}

// ═════════ Conciliación banco vs base ═════════
function Conciliacion({ conciliacion }: { conciliacion: ConciliacionRow[] }) {
  const meses = useMemo(() => [...new Set(conciliacion.map((r) => r.mes))].sort().reverse(), [conciliacion])
  const conIngreso = useMemo(
    () => meses.find((m) => conciliacion.some((r) => r.mes === m && num(r.n_ingresos) > 0)),
    [meses, conciliacion],
  )
  const [mes, setMes] = useState(conIngreso ?? meses[0] ?? '')
  const filas = conciliacion
    .filter((r) => r.mes === mes)
    .map((r) => ({
      entidad: r.entidad,
      banco: num(r.ingreso_banco),
      base: num(r.pagado_base),
      dif: num(r.diferencia),
      nIng: num(r.n_ingresos),
      nPag: num(r.n_pagadas),
    }))
    .sort((a, b) => Math.abs(b.dif) - Math.abs(a.dif))
  const tot = filas.reduce((t, r) => ({ banco: t.banco + r.banco, base: t.base + r.base, dif: t.dif + r.dif }), {
    banco: 0,
    base: 0,
    dif: 0,
  })
  const hayIngresos = filas.some((r) => r.nIng > 0)

  return (
    <Seccion titulo="Conciliación banco vs base">
      <Panel
        titulo="Ingreso al banco vs pagado según la base"
        nota="por entidad · diferencia = banco − base"
        accion={
          <select
            value={mes}
            onChange={(e) => setMes(e.target.value)}
            className="h-8 rounded-lg border border-gray-300 bg-white px-2 text-xs text-gray-700 outline-none focus:border-[#00369C] focus:ring-2 focus:ring-[#00369C]/15"
            aria-label="Mes de la conciliación"
          >
            {meses.map((m) => (
              <option key={m} value={m}>
                {fmtMesLargo(m)}
              </option>
            ))}
          </select>
        }
      >
        {!hayIngresos && (
          <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            No hay ingresos registrados en {mes ? fmtMesLargo(mes) : 'este mes'}. Regístralos con el botón
            “Registrar ingreso” para conciliar contra lo que la base marca como pagado.
          </p>
        )}
        {filas.length === 0 ? (
          <Vacio texto="Sin movimientos en este mes." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="py-2 pr-3 font-semibold">Entidad</th>
                  <th className="py-2 pr-3 text-right font-semibold">Ingreso al banco</th>
                  <th className="py-2 pr-3 text-right font-semibold">Pagado según base</th>
                  <th className="py-2 text-right font-semibold">Diferencia</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((r) => (
                  <tr key={r.entidad} className="border-b border-gray-50">
                    <td className="py-2 pr-3 font-medium text-gray-900">{r.entidad}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-gray-700">
                      {r.nIng ? `${fmtCOP(r.banco)}` : '—'}
                      {r.nIng > 1 && <span className="ml-1 text-xs text-gray-400">({r.nIng})</span>}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums text-gray-700">
                      {r.nPag ? fmtCOP(r.base) : '—'}
                      {r.nPag > 0 && <span className="ml-1 text-xs text-gray-400">({r.nPag} incap.)</span>}
                    </td>
                    <td
                      className={`py-2 text-right font-semibold tabular-nums ${
                        r.dif === 0 ? 'text-gray-400' : r.dif > 0 ? 'text-amber-700' : 'text-red-700'
                      }`}
                    >
                      {r.dif === 0 ? '✓ cuadra' : fmtCOP(r.dif)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 font-semibold text-gray-900">
                  <td className="py-2 pr-3">Total</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{fmtCOP(tot.banco)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{fmtCOP(tot.base)}</td>
                  <td className="py-2 text-right tabular-nums">{fmtCOP(tot.dif)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
        <p className="mt-2 text-xs text-gray-400">
          Diferencia positiva (ámbar): entró más al banco de lo que la base marca pagado → falta marcar pagos en la base o el
          ingreso no es de incapacidades. Negativa (rojo): la base marca pagos que no se ven en el banco.
        </p>
      </Panel>
    </Seccion>
  )
}

// ═════════ UI helpers ═════════
type Tone = 'blue' | 'green' | 'yellow' | 'red' | 'gray'
const chip: Record<Tone, string> = {
  blue: 'bg-blue-50 text-[#00369C]',
  green: 'bg-emerald-50 text-emerald-600',
  yellow: 'bg-amber-50 text-[#B58A00]',
  red: 'bg-red-50 text-red-600',
  gray: 'bg-gray-100 text-gray-600',
}
const accent: Record<Tone, string> = {
  blue: 'bg-[#00369C]',
  green: 'bg-emerald-500',
  yellow: 'bg-[#B58A00]',
  red: 'bg-red-500',
  gray: 'bg-gray-400',
}

function Kpi({ label, value, detalle, icon, tone }: { label: string; value: string; detalle: string; icon: ReactNode; tone: Tone }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.06)]">
      <span className={`absolute inset-y-0 left-0 w-1 ${accent[tone]}`} aria-hidden />
      <div className="flex items-start justify-between gap-3 p-5 pl-6">
        <div className="min-w-0">
          <p className="text-[13px] font-medium leading-snug text-gray-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-gray-900 tabular-nums">{value}</p>
          <p className="mt-1 text-xs text-gray-400">{detalle}</p>
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${chip[tone]}`}>{icon}</div>
      </div>
    </div>
  )
}

function TipBox({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-sm">
      <p className="mb-1 font-semibold text-gray-900">{title}</p>
      <div className="space-y-0.5">{children}</div>
    </div>
  )
}
function TipRow({ c, k, v, bold }: { c: string; k: string; v: string; bold?: boolean }) {
  return (
    <p className={`flex items-center justify-between gap-4 ${bold ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-block h-2 w-2 rounded-full" style={{ background: c }} />
        {k}
      </span>
      <span className="tabular-nums">{v}</span>
    </p>
  )
}

const tickX = { fontSize: 11, fill: '#6b7280' } as const

function Alto({ children, h = 'h-72' }: { children: ReactNode; h?: string }) {
  return (
    <div className={h}>
      <ResponsiveContainer width="100%" height="100%">
        {children as ReactElement}
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
function Panel({ titulo, nota, accion, children }: { titulo: string; nota?: string; accion?: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200/80 bg-white p-5 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-baseline gap-x-2">
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
  return <div className="flex h-40 items-center justify-center text-center text-sm text-gray-400">{texto}</div>
}
