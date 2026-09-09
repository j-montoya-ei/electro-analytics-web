// ═══════════════════════════════════════════════════════════
// IncapacidadesDashboard (client component)
// Recibe todas las filas de vw_incapacidades y arma el tablero:
// filtros reactivos (Mes · Clase · Cargo · Entidad) + KPIs.
// Filtra y agrega en memoria (patrón Caracterización). Las reglas
// de negocio ya vienen resueltas como flags desde la vista SQL.
// Los gráficos se agregan en entregables posteriores.
//
// Ubicación: components/IncapacidadesDashboard.tsx
// ═══════════════════════════════════════════════════════════

'use client'

import { useMemo, useState } from 'react'
import KpiCard from '@/components/KpiCard'
import {
  Stethoscope,
  CalendarDays,
  Gauge,
  Users,
  BadgeCheck,
  Banknote,
  RotateCcw,
} from 'lucide-react'

const SIN_DATO = '(sin dato)'

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

export type IncapacidadRow = {
  dni: string
  mes: string | null
  mes_num: number | null
  clase: string | null
  cargo: string | null
  entidad_norm: string
  nro_dias: number | string | null
  total_incapacidad: number | string | null
  radicada: boolean
  radicada_a_tiempo: boolean
}

export default function IncapacidadesDashboard({ rows }: { rows: IncapacidadRow[] }) {
  const [mes, setMes] = useState('')
  const [clase, setClase] = useState('')
  const [cargo, setCargo] = useState('')
  const [entidad, setEntidad] = useState('')

  // Opciones de cada filtro (derivadas de los datos)
  const opciones = useMemo(() => {
    const mesesMap = new Map<string, number>() // label → mes_num (para ordenar por calendario)
    const clases = new Set<string>()
    const cargos = new Set<string>()
    const entidades = new Set<string>()
    for (const r of rows) {
      const m = norm(r.mes)
      if (!mesesMap.has(m)) mesesMap.set(m, r.mes_num ?? 99)
      clases.add(norm(r.clase))
      cargos.add(norm(r.cargo))
      entidades.add(r.entidad_norm || SIN_DATO)
    }
    const meses = [...mesesMap.entries()].sort((a, b) => a[1] - b[1]).map(([m]) => m)
    const asc = (s: Set<string>) => [...s].sort((a, b) => a.localeCompare(b, 'es'))
    return { meses, clases: asc(clases), cargos: asc(cargos), entidades: asc(entidades) }
  }, [rows])

  // Filtrado en memoria
  const filtradas = useMemo(
    () =>
      rows.filter(
        (r) =>
          (mes === '' || norm(r.mes) === mes) &&
          (clase === '' || norm(r.clase) === clase) &&
          (cargo === '' || norm(r.cargo) === cargo) &&
          (entidad === '' || (r.entidad_norm || SIN_DATO) === entidad),
      ),
    [rows, mes, clase, cargo, entidad],
  )

  // KPIs (sobre el conjunto filtrado)
  const kpis = useMemo(() => {
    const incap = filtradas.length
    const dias = filtradas.reduce((s, r) => s + num(r.nro_dias), 0)
    const trabajadores = new Set(filtradas.map((r) => r.dni)).size
    const radicadas = filtradas.filter((r) => r.radicada).length
    const aTiempo = filtradas.filter((r) => r.radicada_a_tiempo).length
    const costo = filtradas.reduce((s, r) => s + num(r.total_incapacidad), 0)
    return {
      incap,
      dias,
      prom: incap > 0 ? Math.round((dias / incap) * 10) / 10 : 0,
      trabajadores,
      pctATiempo: radicadas > 0 ? `${Math.round((aTiempo / radicadas) * 100)}%` : '—',
      costo,
    }
  }, [filtradas])

  const hayFiltro = Boolean(mes || clase || cargo || entidad)
  const limpiar = () => {
    setMes('')
    setClase('')
    setCargo('')
    setEntidad('')
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm p-4 md:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:flex-1">
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
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Incapacidades" value={kpis.incap} tone="blue" icon={<Stethoscope className="h-5 w-5" />} />
        <KpiCard label="Días acumulados" value={kpis.dias} tone="red" icon={<CalendarDays className="h-5 w-5" />} />
        <KpiCard label="Prom. días / incap." value={kpis.prom} tone="yellow" icon={<Gauge className="h-5 w-5" />} />
        <KpiCard label="Trabajadores" value={kpis.trabajadores} tone="blue" icon={<Users className="h-5 w-5" />} />
        <KpiCard label="Radicadas a tiempo" value={kpis.pctATiempo} tone="green" icon={<BadgeCheck className="h-5 w-5" />} />
        <KpiCard label="Costo total" value={fmtCosto(kpis.costo)} tone="green" icon={<Banknote className="h-5 w-5" />} />
      </div>

      {filtradas.length === 0 && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
          No hay incapacidades con los filtros seleccionados.
        </div>
      )}

      {/* Gráficos: entregables 3–5 */}
    </div>
  )
}

function Filtro({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: string[]
}) {
  return (
    <div className="flex flex-col">
      <label className="mb-1.5 text-xs font-medium text-gray-500">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 outline-none transition focus:border-[#00369C] focus:ring-2 focus:ring-[#00369C]/15"
      >
        <option value="">Todas</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  )
}
