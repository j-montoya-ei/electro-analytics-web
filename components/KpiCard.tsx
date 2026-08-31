// ═══════════════════════════════════════════════════════════
// Componente KpiCard - Tarjeta de indicador reutilizable
// API SIN CAMBIOS: { label, value, icon, tone }. Solo rediseño visual.
// Ubicación: components/KpiCard.tsx
// ═══════════════════════════════════════════════════════════

import type { ReactNode } from 'react'

type Tone = 'blue' | 'yellow' | 'gray' | 'red' | 'green'

// Color del chip del ícono (fondo suave + ícono a tono)
const chip: Record<Tone, string> = {
  blue: 'bg-blue-50 text-[#00369C]',
  yellow: 'bg-amber-50 text-[#B58A00]',
  gray: 'bg-gray-100 text-gray-600',
  red: 'bg-red-50 text-red-600',
  green: 'bg-emerald-50 text-emerald-600',
}

// Acento lateral izquierdo: distingue una categoría de indicador de otra
const accent: Record<Tone, string> = {
  blue: 'bg-[#00369C]',
  yellow: 'bg-[#B58A00]',
  gray: 'bg-gray-400',
  red: 'bg-red-500',
  green: 'bg-emerald-500',
}

export default function KpiCard({
  label,
  value,
  icon,
  tone = 'blue',
}: {
  label: string
  value: string | number
  icon: ReactNode
  tone?: Tone
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.06)] transition-shadow hover:shadow-[0_4px_12px_rgba(16,24,40,0.08)]">
      {/* Acento lateral por tono */}
      <span
        className={`absolute inset-y-0 left-0 w-1 ${accent[tone]}`}
        aria-hidden
      />

      <div className="flex items-start justify-between gap-3 p-5 pl-6">
        <div className="min-w-0">
          <p className="text-[13px] font-medium leading-snug text-gray-500">
            {label}
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-gray-900 tabular-nums lg:text-3xl">
            {value}
          </p>
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${chip[tone]}`}
        >
          {icon}
        </div>
      </div>
    </div>
  )
}
