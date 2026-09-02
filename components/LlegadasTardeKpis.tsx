'use client'

import { useMemo } from 'react'
import { AlertTriangle, Clock3, Medal, Timer, Users } from 'lucide-react'

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
    icon: Icon,
    tone = 'blue',
  }: {
    label: string
    valor: string
    sub?: string
    icon: typeof Users
    tone?: 'blue' | 'amber' | 'red' | 'slate'
  }) => (
    <div className="group rounded-xl border border-gray-200/80 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">{label}</p>
        <div className={`rounded-lg p-2 ${
          tone === 'amber' ? 'bg-amber-50 text-amber-600' :
          tone === 'red' ? 'bg-red-50 text-red-600' :
          tone === 'slate' ? 'bg-slate-100 text-slate-600' :
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
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      <Card
        label="Colaboradores con tardanzas"
        valor={String(kpis.totalColaboradores)}
        icon={Users}
      />
      <Card
        label="Minutos superó tolerancia"
        valor={fmtMin(kpis.totalMinutos)}
        sub="Mañana + tarde"
        icon={Timer}
        tone="amber"
      />
      <Card label="Días-tardanza" valor={String(kpis.totalDias)} sub="Mañana + tarde" icon={Clock3} />
      <Card
        label="Proceso más impuntual"
        valor={kpis.procArea}
        sub={
          kpis.hayProceso
            ? `${kpis.procProm} min/día · ${kpis.procDias} días`
            : `Ninguno supera ${MIN_DIAS_PROCESO} días`
        }
        icon={AlertTriangle}
        tone="red"
      />
      <Card
        label="Top colaborador"
        valor={kpis.topNombre.split(' ').slice(0, 2).join(' ')}
        sub={`${fmtMin(kpis.topMinutos)} superó tolerancia`}
        icon={Medal}
        tone="slate"
      />
    </div>
  )
}
