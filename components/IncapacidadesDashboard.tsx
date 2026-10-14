// ═══════════════════════════════════════════════════════════
// IncapacidadesDashboard (client component)
// Recibe todas las filas de vw_incapacidades y arma el tablero:
// filtros reactivos (Año · Mes · Clase · Cargo · Entidad) + KPIs.
//
// Segmentador de Año:
//   · Un año elegido  → todo el tablero muestra solo ese año
//                       (KPIs + gráficas + personas, como antes).
//   · "Todos"         → MODO COMPARACIÓN: KPIs con un valor por año y
//                       la variación del último año vs el anterior.
//                       Toggle "Mismo período / Año completo": el corte
//                       viene resuelto desde la vista (en_mismo_periodo).
//                       El detalle (gráficas, rankings, alertas) NO se
//                       muestra mezclando años: las alertas por persona
//                       sumarían años distintos y serían falsas.
//
// Filtra y agrega en memoria (patrón Caracterización). Las reglas de
// negocio vienen resueltas como flags desde la vista SQL.
//
// Ubicación: components/IncapacidadesDashboard.tsx
// ═══════════════════════════════════════════════════════════

'use client'

import { useMemo, useState, type ReactNode } from 'react'
import KpiCard from '@/components/KpiCard'
import IncapacidadesGraficos from '@/components/IncapacidadesGraficos'
import IncapacidadesPersonas from '@/components/IncapacidadesPersonas'
import {
  Stethoscope,
  CalendarDays,
  Gauge,
  Users,
  BadgeCheck,
  Banknote,
  HandCoins,
  Building2,
  RotateCcw,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from 'lucide-react'

const SIN_DATO = '(sin dato)'
const TODOS = ''

const norm = (v: string | null | undefined): string =>
  v == null || v.trim() === '' ? SIN_DATO : v.trim()

// numeric de Postgres llega como string por PostgREST → coerción segura.
const num = (v: number | string | null | undefined): number => {
  const n = typeof v === 'number' ? v : v == null ? 0 : Number(v)
  return Number.isFinite(n) ? n : 0
}

const fmtCosto = (n: number): string =>
  n >= 1e6
    ? `$${(n / 1e6).toFixed(1)}M`
    : n >= 1e3
      ? `$${(n / 1e3).toFixed(0)}K`
      : `$${n.toFixed(0)}`

const fmtCOP = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)

const fmtNum = (n: number) => new Intl.NumberFormat('es-CO').format(n)

// 'YYYY-MM-DD' → '8 oct' (sin pasar por Date para no correr el día por zona horaria)
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const fmtDiaMes = (iso: string | null): string => {
  if (!iso) return '—'
  const [, m, d] = iso.split('-')
  return `${Number(d)} ${MESES_CORTOS[Number(m) - 1] ?? ''}`
}

export type IncapacidadRow = {
  dni: string
  nombre: string | null
  mes: string | null
  mes_num: number | null
  periodo: string | null
  anio: number | null
  clase: string | null
  cargo: string | null
  proceso: string | null
  unidad_negocio: string | null
  descripcion_dx: string | null
  entidad_norm: string
  estado: string | null
  nro_dias: number | string | null
  // TOTAL INC = VALOR TNL (paga la EPS/ARL) + VALOR CIA. 3 DIAS (asume la empresa)
  total_incapacidad: number | string | null
  valor_tnl: number | string | null
  valor_cia_3dias: number | string | null
  valor_pendiente_cobrar: number | string | null
  radicada: boolean
  radicada_a_tiempo: boolean
  // Comparativo (vw_incapacidades)
  fecha_corte: string | null
  en_mismo_periodo: boolean
  es_anio_en_curso: boolean
  // Por cobrar (regla en vw_incapacidades): Radicada → valor_tnl;
  // Derecho Petición → valor_pendiente_cobrar; otros → 0
  por_cobrar_tipo: string | null
  valor_por_cobrar: number | string | null
}

// ── KPIs de un conjunto de filas ──────────────────────────────────
type Kpis = {
  incap: number
  dias: number
  prom: number
  trabajadores: number
  radicadas: number
  aTiempo: number
  pctATiempo: number | null // 0–100; null si no hay radicadas
  valorTotal: number // TOTAL INC
  pagaEps: number // VALOR TNL
  asumeEmpresa: number // VALOR CIA. 3 DIAS
  porCobrar: number
  nPorCobrar: number
}

function calcKpis(rows: IncapacidadRow[]): Kpis {
  const incap = rows.length
  const dias = rows.reduce((s, r) => s + num(r.nro_dias), 0)
  const trabajadores = new Set(rows.map((r) => r.dni)).size
  // Regla: % sobre radicadas (excluye "No aplica"), no sobre el total.
  const radicadas = rows.filter((r) => r.radicada).length
  const aTiempo = rows.filter((r) => r.radicada_a_tiempo).length
  const valorTotal = rows.reduce((s, r) => s + num(r.total_incapacidad), 0)
  const pagaEps = rows.reduce((s, r) => s + num(r.valor_tnl), 0)
  const asumeEmpresa = rows.reduce((s, r) => s + num(r.valor_cia_3dias), 0)
  const porCobrar = rows.reduce((s, r) => s + num(r.valor_por_cobrar), 0)
  const nPorCobrar = rows.filter((r) => r.por_cobrar_tipo != null).length
  return {
    porCobrar,
    nPorCobrar,
    incap,
    dias,
    prom: incap > 0 ? Math.round((dias / incap) * 10) / 10 : 0,
    trabajadores,
    radicadas,
    aTiempo,
    pctATiempo: radicadas > 0 ? Math.round((aTiempo / radicadas) * 100) : null,
    valorTotal,
    pagaEps,
    asumeEmpresa,
  }
}

type Periodo = 'mismo' | 'completo'

export default function IncapacidadesDashboard({
  rows,
  plantilla,
}: {
  rows: IncapacidadRow[]
  plantilla: number | null
}) {
  const [anio, setAnio] = useState(TODOS)
  const [periodo, setPeriodo] = useState<Periodo>('mismo')
  const [mes, setMes] = useState(TODOS)
  const [clase, setClase] = useState(TODOS)
  const [cargo, setCargo] = useState(TODOS)
  const [entidad, setEntidad] = useState(TODOS)

  // Años cargados (ascendente)
  const anios = useMemo(
    () =>
      [...new Set(rows.map((r) => r.anio).filter((a): a is number => a != null))].sort(
        (a, b) => a - b,
      ),
    [rows],
  )
  const fechaCorte = rows[0]?.fecha_corte ?? null

  // Comparación solo si hay 2+ años y no se eligió uno
  const comparando = anio === TODOS && anios.length > 1

  // Base según año y período (antes de los demás filtros)
  const base = useMemo(() => {
    if (anio !== TODOS) return rows.filter((r) => String(r.anio) === anio)
    if (comparando && periodo === 'mismo') return rows.filter((r) => r.en_mismo_periodo)
    return rows
  }, [rows, anio, comparando, periodo])

  // Opciones de cada filtro (derivadas de la base vigente)
  const opciones = useMemo(() => {
    const mesesMap = new Map<string, number>() // label → mes_num (para ordenar por calendario)
    const clases = new Set<string>()
    const cargos = new Set<string>()
    const entidades = new Set<string>()
    for (const r of base) {
      const m = norm(r.mes)
      if (!mesesMap.has(m)) mesesMap.set(m, r.mes_num ?? 99)
      clases.add(norm(r.clase))
      cargos.add(norm(r.cargo))
      entidades.add(r.entidad_norm || SIN_DATO)
    }
    const meses = [...mesesMap.entries()].sort((a, b) => a[1] - b[1]).map(([m]) => m)
    const asc = (s: Set<string>) => [...s].sort((a, b) => a.localeCompare(b, 'es'))
    return { meses, clases: asc(clases), cargos: asc(cargos), entidades: asc(entidades) }
  }, [base])

  // Filtrado en memoria
  const filtradas = useMemo(
    () =>
      base.filter(
        (r) =>
          (mes === TODOS || norm(r.mes) === mes) &&
          (clase === TODOS || norm(r.clase) === clase) &&
          (cargo === TODOS || norm(r.cargo) === cargo) &&
          (entidad === TODOS || (r.entidad_norm || SIN_DATO) === entidad),
      ),
    [base, mes, clase, cargo, entidad],
  )

  // KPIs: un bloque por año (comparación) o uno solo
  const kpisPorAnio = useMemo(
    () => anios.map((a) => ({ anio: a, k: calcKpis(filtradas.filter((r) => r.anio === a)) })),
    [anios, filtradas],
  )
  const kpis = useMemo(() => calcKpis(filtradas), [filtradas])

  const hayFiltro = Boolean(anio || mes || clase || cargo || entidad)
  const limpiar = () => {
    setAnio(TODOS)
    setMes(TODOS)
    setClase(TODOS)
    setCargo(TODOS)
    setEntidad(TODOS)
  }

  return (
    // @container: las grillas de KPIs se acomodan al ANCHO REAL del tablero
    // (cambia con el menú lateral expandido/minimizado/oculto), no al de la pantalla.
    <div className="@container space-y-6">
      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm p-4 md:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 lg:flex-1">
            <Filtro
              label="Año"
              value={anio}
              onChange={setAnio}
              options={[...anios].reverse().map(String)}
              todos="Todos (comparar)"
            />
            <Filtro label="Mes" value={mes} onChange={setMes} options={opciones.meses} />
            <Filtro label="Clase" value={clase} onChange={setClase} options={opciones.clases} />
            <Filtro label="Cargo" value={cargo} onChange={setCargo} options={opciones.cargos} />
            <Filtro label="Entidad" value={entidad} onChange={setEntidad} options={opciones.entidades} />
          </div>
          <button
            type="button"
            onClick={limpiar}
            disabled={!hayFiltro}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RotateCcw className="h-4 w-4" />
            Limpiar
          </button>
        </div>

        {/* Toggle de período: solo en modo comparación */}
        {comparando && (
          <div className="mt-4 flex flex-col gap-2 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="inline-flex rounded-lg border border-gray-300 p-0.5 text-sm">
              <ToggleBtn activo={periodo === 'mismo'} onClick={() => setPeriodo('mismo')}>
                Mismo período
              </ToggleBtn>
              <ToggleBtn activo={periodo === 'completo'} onClick={() => setPeriodo('completo')}>
                Año completo
              </ToggleBtn>
            </div>
            <p className="text-xs text-gray-500">
              {periodo === 'mismo'
                ? `Cada año del 1 ene al ${fmtDiaMes(fechaCorte)} (última incapacidad registrada de ${anios[anios.length - 1]}).`
                : `Años completos. Ojo: ${anios[anios.length - 1]} va hasta el ${fmtDiaMes(fechaCorte)}, la comparación no es pareja.`}
            </p>
          </div>
        )}
      </div>

      {comparando ? (
        <>
          {/* KPIs comparativos */}
          {/* 1 col (<512px) · 2 cols · 4 cols (≥896px) */}
          <div className="grid grid-cols-1 gap-4 @lg:grid-cols-2 @4xl:grid-cols-4">
            <KpiComparativo
              label="Incapacidades"
              tone="blue"
              icon={<Stethoscope className="h-5 w-5" />}
              datos={kpisPorAnio.map(({ anio, k }) => ({ anio, valor: k.incap, texto: fmtNum(k.incap) }))}
              mejorSiBaja
            />
            <KpiComparativo
              label="Días acumulados"
              tone="red"
              icon={<CalendarDays className="h-5 w-5" />}
              datos={kpisPorAnio.map(({ anio, k }) => ({ anio, valor: k.dias, texto: fmtNum(k.dias) }))}
              mejorSiBaja
            />
            <KpiComparativo
              label="Prom. días / incap."
              tone="yellow"
              icon={<Gauge className="h-5 w-5" />}
              datos={kpisPorAnio.map(({ anio, k }) => ({ anio, valor: k.prom, texto: String(k.prom) }))}
              mejorSiBaja
            />
            <KpiComparativo
              label="Trabajadores"
              tone="blue"
              icon={<Users className="h-5 w-5" />}
              datos={kpisPorAnio.map(({ anio, k }) => ({ anio, valor: k.trabajadores, texto: fmtNum(k.trabajadores) }))}
              mejorSiBaja
            />
            <KpiComparativo
              label="Radicadas a tiempo"
              tone="green"
              icon={<BadgeCheck className="h-5 w-5" />}
              datos={kpisPorAnio.map(({ anio, k }) => ({
                anio,
                valor: k.pctATiempo,
                texto: k.pctATiempo == null ? '—' : `${k.pctATiempo}%`,
                detalle: `${k.aTiempo} de ${k.radicadas} radicadas`,
              }))}
              enPuntos
            />
            <KpiComparativo
              label="Valor total incapacidades"
              tone="green"
              icon={<Banknote className="h-5 w-5" />}
              datos={kpisPorAnio.map(({ anio, k }) => ({
                anio,
                valor: k.valorTotal,
                texto: fmtCosto(k.valorTotal),
                detalle: `EPS/ARL ${fmtCosto(k.pagaEps)} · Empresa ${fmtCosto(k.asumeEmpresa)}`,
              }))}
              mejorSiBaja
            />
            <KpiComparativo
              label="Asume la empresa"
              tone="yellow"
              icon={<Building2 className="h-5 w-5" />}
              datos={kpisPorAnio.map(({ anio, k }) => ({
                anio,
                valor: k.asumeEmpresa,
                texto: fmtCosto(k.asumeEmpresa),
                detalle: `${fmtCOP(k.asumeEmpresa)} · primeros días`,
              }))}
              mejorSiBaja
            />
            <KpiComparativo
              label="Por cobrar"
              tone="red"
              icon={<HandCoins className="h-5 w-5" />}
              datos={kpisPorAnio.map(({ anio, k }) => ({
                anio,
                valor: k.porCobrar,
                texto: fmtCosto(k.porCobrar),
                detalle: `${fmtCOP(k.porCobrar)} · ${k.nPorCobrar} incap.`,
              }))}
              // Saldo a hoy (lo que falta cobrar), no un flujo del año:
              // la variación entre años no es comparable → se muestra nota.
              nota="Saldo a hoy. 2025 ya tuvo tiempo de cobrarse; por eso no se compara."
            />
          </div>

          <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
            Elige un año en el filtro <strong>Año</strong> para ver el detalle (gráficas, rankings y
            alertas por persona). En modo comparación no se mezclan años en esos paneles.
          </div>
        </>
      ) : (
        <>
          {/* KPIs de un solo año */}
          {/* 8 tarjetas: 2 cols · 4 (≥992px) → 4 + 4 */}
          <div className="grid grid-cols-2 gap-4 @[62rem]:grid-cols-4">
            <KpiCard label="Incapacidades" value={fmtNum(kpis.incap)} tone="blue" icon={<Stethoscope className="h-5 w-5" />} />
            <KpiCard label="Días acumulados" value={fmtNum(kpis.dias)} tone="red" icon={<CalendarDays className="h-5 w-5" />} />
            <KpiCard label="Prom. días / incap." value={kpis.prom} tone="yellow" icon={<Gauge className="h-5 w-5" />} />
            <KpiCard label="Trabajadores" value={fmtNum(kpis.trabajadores)} tone="blue" icon={<Users className="h-5 w-5" />} />
            <KpiCard
              label="Radicadas a tiempo"
              value={kpis.pctATiempo == null ? '—' : `${kpis.pctATiempo}%`}
              tone="green"
              icon={<BadgeCheck className="h-5 w-5" />}
            />
            <KpiCard label="Valor total incapacidades" value={fmtCosto(kpis.valorTotal)} tone="green" icon={<Banknote className="h-5 w-5" />} />
            <KpiCard label="Asume la empresa" value={fmtCosto(kpis.asumeEmpresa)} tone="yellow" icon={<Building2 className="h-5 w-5" />} />
            <KpiCard label="Por cobrar" value={fmtCosto(kpis.porCobrar)} tone="red" icon={<HandCoins className="h-5 w-5" />} />
          </div>

          {filtradas.length === 0 ? (
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
              No hay incapacidades con los filtros seleccionados.
            </div>
          ) : (
            <>
              <IncapacidadesGraficos rows={filtradas} plantilla={plantilla} />
              <IncapacidadesPersonas rows={filtradas} />
            </>
          )}
        </>
      )}
    </div>
  )
}

// ── Tarjeta comparativa: un valor por año + variación último vs anterior ──
type Tone = 'blue' | 'yellow' | 'red' | 'green'
const chip: Record<Tone, string> = {
  blue: 'bg-blue-50 text-[#00369C]',
  yellow: 'bg-amber-50 text-[#B58A00]',
  red: 'bg-red-50 text-red-600',
  green: 'bg-emerald-50 text-emerald-600',
}
const accent: Record<Tone, string> = {
  blue: 'bg-[#00369C]',
  yellow: 'bg-[#B58A00]',
  red: 'bg-red-500',
  green: 'bg-emerald-500',
}

function KpiComparativo({
  label,
  icon,
  tone,
  datos,
  mejorSiBaja = false,
  enPuntos = false,
  nota,
}: {
  label: string
  icon: ReactNode
  tone: Tone
  datos: { anio: number; valor: number | null; texto: string; detalle?: string }[]
  mejorSiBaja?: boolean // true: subir es malo (rojo)
  enPuntos?: boolean // true: variación en puntos porcentuales (para %)
  nota?: string // si viene, reemplaza la variación (métricas no comparables)
}) {
  // Ordenado del más reciente al más antiguo
  const filas = [...datos].sort((a, b) => b.anio - a.anio)
  const [ult, ant] = filas

  let variacion: { texto: string; dir: 'sube' | 'baja' | 'igual'; bueno: boolean | null } | null =
    null
  if (ult && ant && ult.valor != null && ant.valor != null) {
    const diff = ult.valor - ant.valor
    const dir = diff > 0 ? 'sube' : diff < 0 ? 'baja' : 'igual'
    const bueno = dir === 'igual' ? null : mejorSiBaja ? dir === 'baja' : dir === 'sube'
    let texto: string
    if (enPuntos) {
      texto = `${diff > 0 ? '+' : ''}${diff} pts`
    } else if (ant.valor === 0) {
      texto = diff === 0 ? '0%' : 'sin base'
    } else {
      const pct = Math.round((diff / ant.valor) * 1000) / 10
      texto = `${pct > 0 ? '+' : ''}${pct}%`
    }
    variacion = { texto, dir, bueno }
  }

  const colorVar =
    variacion?.bueno == null
      ? 'bg-gray-100 text-gray-600'
      : variacion.bueno
        ? 'bg-emerald-50 text-emerald-700'
        : 'bg-red-50 text-red-700'

  return (
    <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.06)]">
      <span className={`absolute inset-y-0 left-0 w-1 ${accent[tone]}`} aria-hidden />
      <div className="p-5 pl-6">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[13px] font-medium leading-snug text-gray-500">{label}</p>
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${chip[tone]}`}>
            {icon}
          </div>
        </div>

        <ul className="mt-2 space-y-1.5">
          {filas.map((d, i) => (
            <li key={d.anio} className="flex items-baseline justify-between gap-3">
              <span className={`text-xs font-semibold ${i === 0 ? 'text-gray-900' : 'text-gray-400'}`}>
                {d.anio}
              </span>
              <span className="text-right">
                <span
                  className={`tabular-nums tracking-tight ${
                    i === 0 ? 'text-2xl font-semibold text-gray-900' : 'text-lg font-medium text-gray-500'
                  }`}
                >
                  {d.texto}
                </span>
                {d.detalle && <span className="block text-[11px] text-gray-400">{d.detalle}</span>}
              </span>
            </li>
          ))}
        </ul>

        {nota ? (
          <p className="mt-3 border-t border-gray-100 pt-3 text-xs text-gray-500">{nota}</p>
        ) : variacion && ult && ant && (
          <div className="mt-3 flex items-center gap-2 border-t border-gray-100 pt-3 text-xs">
            <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-semibold ${colorVar}`}>
              {variacion.dir === 'sube' ? (
                <ArrowUpRight className="h-3.5 w-3.5" />
              ) : variacion.dir === 'baja' ? (
                <ArrowDownRight className="h-3.5 w-3.5" />
              ) : (
                <Minus className="h-3.5 w-3.5" />
              )}
              {variacion.texto}
            </span>
            <span className="text-gray-500">
              {ult.anio} vs {ant.anio}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

function ToggleBtn({
  activo,
  onClick,
  children,
}: {
  activo: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
        activo ? 'bg-[#00369C] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
      }`}
    >
      {children}
    </button>
  )
}

function Filtro({
  label,
  value,
  onChange,
  options,
  todos = 'Todas',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: string[]
  todos?: string
}) {
  return (
    <div className="flex flex-col">
      <label className="mb-1.5 text-xs font-medium text-gray-500">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 outline-none transition focus:border-[#00369C] focus:ring-2 focus:ring-[#00369C]/15"
      >
        <option value="">{todos}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  )
}
