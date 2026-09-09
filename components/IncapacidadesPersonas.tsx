// ═══════════════════════════════════════════════════════════
// IncapacidadesPersonas (client component)
// Rankings por persona + alertas tipo semáforo. Recibe las filas
// ya filtradas y agrega por trabajador (dni).
//
// Reglas de las alertas (definidas con GH):
//   · Cortas repetidas: ≥3 incapacidades de 1 o 2 días.
//   · Recurrentes:      ≥3 incapacidades en el período.
//   · Acumulado >90:    suma de días > 90 (posible pago al 50% del IBC).
//
// Ubicación: components/IncapacidadesPersonas.tsx
// ═══════════════════════════════════════════════════════════

'use client'

import { useMemo, type ReactNode } from 'react'
import { AlertTriangle, Users, CalendarClock } from 'lucide-react'

const num = (v: number | string | null | undefined) => {
  const n = typeof v === 'number' ? v : v == null ? 0 : Number(v)
  return Number.isFinite(n) ? n : 0
}

export type Row = {
  dni: string
  nombre: string | null
  cargo: string | null
  nro_dias: number | string | null
}

type Persona = {
  dni: string
  nombre: string
  cargo: string
  incap: number
  dias: number
  cortas: number
}

export default function IncapacidadesPersonas({ rows }: { rows: Row[] }) {
  const personas = useMemo<Persona[]>(() => {
    const m = new Map<string, Persona>()
    for (const r of rows) {
      const p =
        m.get(r.dni) ??
        { dni: r.dni, nombre: r.nombre ?? '—', cargo: r.cargo ?? '—', incap: 0, dias: 0, cortas: 0 }
      p.incap += 1
      p.dias += num(r.nro_dias)
      if (num(r.nro_dias) === 1 || num(r.nro_dias) === 2) p.cortas += 1
      m.set(r.dni, p)
    }
    return [...m.values()]
  }, [rows])

  const masIncap = useMemo(
    () => [...personas].sort((a, b) => b.incap - a.incap || b.dias - a.dias).slice(0, 9),
    [personas],
  )
  const masDias = useMemo(
    () => [...personas].sort((a, b) => b.dias - a.dias || b.incap - a.incap).slice(0, 9),
    [personas],
  )

  const cortasRepetidas = personas.filter((p) => p.cortas >= 3)
  const recurrentes = personas.filter((p) => p.incap >= 3)
  const acumulado90 = personas.filter((p) => p.dias > 90)

  return (
    <div className="space-y-8">
      {/* ── Personas ── */}
      <section className="space-y-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-gray-400">Personas</p>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Ranking titulo="Más incapacidades" nota="en el período filtrado" data={masIncap} />
          <Ranking titulo="Más días de incapacidad" nota="en el período filtrado" data={masDias} />
        </div>
      </section>

      {/* ── Alertas · semáforo ── */}
      <section className="space-y-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-gray-400">Alertas · semáforo</p>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Alerta
            tono="red"
            icon={<AlertTriangle className="h-4 w-4" />}
            titulo="Incapacidades cortas repetidas"
            subtitulo="≥3 incapacidades de 1 o 2 días"
            personas={cortasRepetidas}
            valor={(p) => `${p.cortas} cortas`}
          />
          <Alerta
            tono="amber"
            icon={<Users className="h-4 w-4" />}
            titulo="Trabajadores recurrentes"
            subtitulo="≥3 incapacidades en el período"
            personas={recurrentes}
            valor={(p) => `${p.incap} incapacidades`}
          />
          <Alerta
            tono="amber"
            icon={<CalendarClock className="h-4 w-4" />}
            titulo="Acumulado mayor a 90 días"
            subtitulo="posible pago al 50% del IBC"
            personas={acumulado90}
            valor={(p) => `${p.dias} días`}
          />
        </div>
      </section>
    </div>
  )
}

function Ranking({
  titulo,
  nota,
  data,
}: {
  titulo: string
  nota: string
  data: Persona[]
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200/80 bg-white shadow-sm">
      <div className="flex items-baseline justify-between border-b border-gray-200 px-5 py-3">
        <h3 className="text-sm font-semibold text-gray-800">{titulo}</h3>
        <span className="text-xs text-gray-400">{nota}</span>
      </div>
      {data.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-gray-400">Sin datos.</div>
      ) : (
        <ul className="divide-y divide-gray-100">
          {data.map((p, i) => (
            <li key={p.dni} className="flex items-center gap-3 px-5 py-2.5">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#092d6b] text-xs font-bold text-white">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900" title={p.nombre}>
                  {p.nombre}
                </p>
                <p className="truncate text-xs text-gray-500" title={p.cargo}>
                  {p.cargo}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <span className="text-sm font-semibold text-gray-900">{p.incap}</span>
                <span className="ml-2 text-xs text-gray-400">{p.dias} d</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

const TONOS = {
  red: { accent: 'bg-red-500', chip: 'bg-red-50 text-red-600' },
  amber: { accent: 'bg-amber-400', chip: 'bg-amber-50 text-[#B58A00]' },
} as const

function Alerta({
  tono,
  icon,
  titulo,
  subtitulo,
  personas,
  valor,
}: {
  tono: keyof typeof TONOS
  icon: ReactNode
  titulo: string
  subtitulo: string
  personas: Persona[]
  valor: (p: Persona) => string
}) {
  const t = TONOS[tono]
  return (
    <div className="relative overflow-hidden rounded-xl border border-gray-200/80 bg-white p-5 shadow-sm">
      <span className={`absolute inset-y-0 left-0 w-1 ${t.accent}`} aria-hidden />
      <div className="flex items-start gap-3 pl-1">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${t.chip}`}>{icon}</div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-gray-800">{titulo}</h3>
          <p className="text-xs text-gray-500">{subtitulo}</p>
        </div>
      </div>
      <div className="mt-3 pl-1">
        {personas.length === 0 ? (
          <p className="text-sm text-gray-400">Sin casos con los datos actuales.</p>
        ) : (
          <ul className="space-y-1.5">
            {personas.map((p) => (
              <li key={p.dni} className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate text-gray-700" title={p.nombre}>
                  {p.nombre}
                </span>
                <span className="shrink-0 font-semibold text-[#00369C]">{valor(p)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
