'use client'

import { useMemo } from 'react'
import { AlertTriangle, Banknote, Clock3, Medal, Timer, Users } from 'lucide-react'

// Mismo tipo que devuelve fn_horas_extras_por_colaborador (subconjunto usado aquí)
type FilaHorasExtras = {
  dni: string
  nombre_completo: string | null
  proceso: string
  unidad_negocio: string
  horas_extra_reales: number
  meses_supera_48h: number
  costo_total: number
  sin_salario: boolean
}

function fmtHoras(h: number): string {
  // 1 decimal, sin decimal si es entero
  const r = Math.round(h * 10) / 10
  return Number.isInteger(r) ? `${r} h` : `${r} h`
}

function fmtCOP(v: number): string {
  return '$' + Math.round(v).toLocaleString('es-CO')
}

export default function HorasExtrasKpis({ data }: { data: FilaHorasExtras[] }) {
  const kpis = useMemo(() => {
    const totalColaboradores = data.length
    const totalHorasExtra = data.reduce((s, f) => s + (f.horas_extra_reales ?? 0), 0)
    const costoTotal = data.reduce((s, f) => s + (f.costo_total ?? 0), 0)
    const sinSalario = data.filter((f) => f.sin_salario).length
    const enAlerta = data.filter((f) => (f.meses_supera_48h ?? 0) > 0).length

    // Top colaborador por horas extra reales
    let top: FilaHorasExtras | null = null
    for (const f of data) {
      if (!top || f.horas_extra_reales > top.horas_extra_reales) top = f
    }

    // Proceso con más horas extra: suma directa por proceso (el que más consume).
    // A diferencia de tardanzas, aquí el indicador de GH es el TOTAL, no el
    // promedio, así que no se aplica umbral mínimo.
    const porProceso = new Map<string, { horas: number; costo: number }>()
    for (const f of data) {
      const p = f.proceso ?? '—'
      const prev = porProceso.get(p) ?? { horas: 0, costo: 0 }
      porProceso.set(p, {
        horas: prev.horas + (f.horas_extra_reales ?? 0),
        costo: prev.costo + (f.costo_total ?? 0),
      })
    }
    let procNombre = '—'
    let procHoras = -1
    let procCosto = 0
    for (const [p, v] of porProceso) {
      if (v.horas > procHoras) {
        procHoras = v.horas
        procCosto = v.costo
        procNombre = p
      }
    }

    return {
      totalColaboradores,
      totalHorasExtra,
      costoTotal,
      sinSalario,
      enAlerta,
      topNombre: top?.nombre_completo ?? '—',
      topHoras: top?.horas_extra_reales ?? 0,
      topCosto: top?.costo_total ?? 0,
      topSinSalario: top?.sin_salario ?? false,
      procNombre: procHoras >= 0 ? procNombre : '—',
      procHoras: procHoras >= 0 ? procHoras : 0,
      procCosto,
    }
  }, [data])

  const Card = ({
    label,
    valor,
    sub,
    icon: Icon,
    tone = 'blue',
  }: {
    label: string
    valor: string
    sub?: string
    icon: typeof Users
    tone?: 'blue' | 'amber' | 'red' | 'slate' | 'emerald'
  }) => (
    <div className="group rounded-xl border border-gray-200/80 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">{label}</p>
        <div className={`rounded-lg p-2 ${
          tone === 'amber' ? 'bg-amber-50 text-amber-600' :
          tone === 'red' ? 'bg-red-50 text-red-600' :
          tone === 'slate' ? 'bg-slate-100 text-slate-600' :
          tone === 'emerald' ? 'bg-emerald-50 text-emerald-600' :
          'bg-blue-50 text-[#00369C]'
        }`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-3 truncate text-2xl font-bold tracking-tight text-gray-900">{valor}</p>
      {sub && <p className="mt-1 truncate text-xs text-gray-500">{sub}</p>}
    </div>
  )

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      <Card
        label="Colaboradores con HE"
        valor={String(kpis.totalColaboradores)}
        icon={Users}
      />
      <Card
        label="Costo total HE"
        valor={fmtCOP(kpis.costoTotal)}
        sub={
          kpis.sinSalario > 0
            ? `${kpis.sinSalario} sin salario (no contados)`
            : 'Valor de ley del período'
        }
        icon={Banknote}
        tone="emerald"
      />
      <Card
        label="Total horas extra"
        valor={fmtHoras(kpis.totalHorasExtra)}
        sub="Solo extras, sin recargos"
        icon={Timer}
        tone="amber"
      />
      <Card
        label="En alerta (>48h/mes)"
        valor={String(kpis.enAlerta)}
        sub={kpis.enAlerta === 0 ? 'Ninguno superó el límite' : 'Superaron el límite legal'}
        icon={AlertTriangle}
        tone="red"
      />
      <Card
        label="Proceso con más HE"
        valor={kpis.procNombre}
        sub={`${fmtHoras(kpis.procHoras)} · ${fmtCOP(kpis.procCosto)}`}
        icon={Clock3}
      />
      <Card
        label="Top colaborador"
        valor={(kpis.topNombre ?? '—').split(' ').slice(0, 2).join(' ')}
        sub={
          kpis.topSinSalario
            ? `${fmtHoras(kpis.topHoras)} · sin salario`
            : `${fmtHoras(kpis.topHoras)} · ${fmtCOP(kpis.topCosto)}`
        }
        icon={Medal}
        tone="slate"
      />
    </div>
  )
}
