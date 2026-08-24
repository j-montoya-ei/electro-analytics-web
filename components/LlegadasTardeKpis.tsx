'use client'

import { useMemo } from 'react'

// Mismo tipo que devuelve fn_llegadas_tarde_por_colaborador (con totales)
type Fila = {
  trab_id: string
  nombre_completo: string
  area: string
  tardanzas_oficiales: number
  minutos_oficiales: number
  tardanzas_tarde: number
  minutos_tarde_oficiales: number
  total_dias: number
  total_minutos: number
}

// Mínimo de días-tardanza para que un proceso compita en "más impuntual".
// Evita que un proceso salga primero por 1-3 días atípicos (outliers).
const MIN_DIAS_PROCESO = 10

function fmtMin(min: number): string {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m === 0 ? `${h} h` : `${h} h ${m} m`
}

export default function LlegadasTardeKpis({ data }: { data: Fila[] }) {
  const kpis = useMemo(() => {
    const totalColaboradores = data.length
    const totalMinutos = data.reduce((s, f) => s + (f.total_minutos ?? 0), 0)
    const totalDias = data.reduce((s, f) => s + (f.total_dias ?? 0), 0)

    // Top colaborador (más minutos que superaron tolerancia)
    let top: Fila | null = null
    for (const f of data) {
      if (!top || f.total_minutos > top.total_minutos) top = f
    }

    // Proceso más impuntual: PROMEDIO de minutos por día tarde, pero solo entre
    // procesos con al menos MIN_DIAS_PROCESO días-tardanza (para que el promedio
    // sea representativo y no lo defina un caso suelto).
    const porArea = new Map<string, { minutos: number; dias: number }>()
    for (const f of data) {
      const a = f.area ?? '—'
      const acc = porArea.get(a) ?? { minutos: 0, dias: 0 }
      acc.minutos += f.total_minutos ?? 0
      acc.dias += f.total_dias ?? 0
      porArea.set(a, acc)
    }

    let procArea = '—'
    let procProm = -1
    let procDias = 0
    for (const [a, v] of porArea) {
      if (v.dias < MIN_DIAS_PROCESO) continue // no compite: pocos días
      const prom = v.dias > 0 ? v.minutos / v.dias : 0
      if (prom > procProm) {
        procProm = prom
        procArea = a
        procDias = v.dias
      }
    }
    // Si ningún proceso alcanza el mínimo, mostrar aviso en vez de un dato falso.
    const hayProceso = procProm >= 0

    return {
      totalColaboradores,
      totalMinutos,
      totalDias,
      topNombre: top?.nombre_completo ?? '—',
      topMinutos: top?.total_minutos ?? 0,
      procArea: hayProceso ? procArea : '—',
      procProm: hayProceso ? Math.round(procProm) : 0,
      procDias,
      hayProceso,
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
        label="Colaboradores con tardanzas"
        valor={String(kpis.totalColaboradores)}
      />
      <Card
        label="Minutos superó tolerancia"
        valor={fmtMin(kpis.totalMinutos)}
        sub="Mañana + tarde"
        acento
      />
      <Card label="Días-tardanza" valor={String(kpis.totalDias)} sub="Mañana + tarde" />
      <Card
        label="Proceso más impuntual"
        valor={kpis.procArea}
        sub={
          kpis.hayProceso
            ? `${kpis.procProm} min/día · ${kpis.procDias} días`
            : `Ninguno supera ${MIN_DIAS_PROCESO} días`
        }
      />
      <Card
        label="Top colaborador"
        valor={kpis.topNombre.split(' ').slice(0, 2).join(' ')}
        sub={`${fmtMin(kpis.topMinutos)} superó tolerancia`}
      />
    </div>
  )
}
