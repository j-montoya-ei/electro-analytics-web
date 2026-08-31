'use client'

import { useMemo } from 'react'

// Mismo tipo que devuelve fn_horas_extras_por_colaborador (subconjunto usado aquí)
type FilaHorasExtras = {
  dni: string
  nombre_completo: string | null
  proceso: string
  unidad_negocio: string
  horas_extra_reales: number
  meses_supera_48h: number
}

function fmtHoras(h: number): string {
  // 1 decimal, sin decimal si es entero
  const r = Math.round(h * 10) / 10
  return Number.isInteger(r) ? `${r} h` : `${r} h`
}

export default function HorasExtrasKpis({ data }: { data: FilaHorasExtras[] }) {
  const kpis = useMemo(() => {
    const totalColaboradores = data.length
    const totalHorasExtra = data.reduce((s, f) => s + (f.horas_extra_reales ?? 0), 0)
    const enAlerta = data.filter((f) => (f.meses_supera_48h ?? 0) > 0).length

    // Top colaborador por horas extra reales
    let top: FilaHorasExtras | null = null
    for (const f of data) {
      if (!top || f.horas_extra_reales > top.horas_extra_reales) top = f
    }

    // Proceso con más horas extra: suma directa por proceso (el que más consume).
    // A diferencia de tardanzas, aquí el indicador de GH es el TOTAL, no el
    // promedio, así que no se aplica umbral mínimo.
    const porProceso = new Map<string, number>()
    for (const f of data) {
      const p = f.proceso ?? '—'
      porProceso.set(p, (porProceso.get(p) ?? 0) + (f.horas_extra_reales ?? 0))
    }
    let procNombre = '—'
    let procHoras = -1
    for (const [p, horas] of porProceso) {
      if (horas > procHoras) {
        procHoras = horas
        procNombre = p
      }
    }

    return {
      totalColaboradores,
      totalHorasExtra,
      enAlerta,
      topNombre: top?.nombre_completo ?? '—',
      topHoras: top?.horas_extra_reales ?? 0,
      procNombre: procHoras >= 0 ? procNombre : '—',
      procHoras: procHoras >= 0 ? procHoras : 0,
    }
  }, [data])

  const Card = ({
    label,
    valor,
    sub,
    acento = false,
  }: {
    label: string
    valor: string
    sub?: string
    acento?: boolean
  }) => (
    <div
      className={
        'rounded-lg border p-4 bg-white ' +
        (acento ? 'border-[#00369C]/30' : 'border-gray-200')
      }
    >
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p
        className={
          'mt-1 text-2xl font-bold ' + (acento ? 'text-[#00369C]' : 'text-gray-900')
        }
      >
        {valor}
      </p>
      {sub && <p className="mt-0.5 text-xs text-gray-500 truncate">{sub}</p>}
    </div>
  )

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      <Card
        label="Colaboradores con HE"
        valor={String(kpis.totalColaboradores)}
      />
      <Card
        label="Total horas extra"
        valor={fmtHoras(kpis.totalHorasExtra)}
        sub="Solo extras, sin recargos"
        acento
      />
      <Card
        label="En alerta (>48h/mes)"
        valor={String(kpis.enAlerta)}
        sub={kpis.enAlerta === 0 ? 'Ninguno superó el límite' : 'Superaron el límite legal'}
      />
      <Card
        label="Proceso con más HE"
        valor={kpis.procNombre}
        sub={`${fmtHoras(kpis.procHoras)} en total`}
      />
      <Card
        label="Top colaborador"
        valor={(kpis.topNombre ?? '—').split(' ').slice(0, 2).join(' ')}
        sub={`${fmtHoras(kpis.topHoras)} de HE`}
      />
    </div>
  )
}
