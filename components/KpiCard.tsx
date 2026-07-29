// ═══════════════════════════════════════════════════════════
// Componente KpiCard - Tarjeta de indicador reutilizable
// ═══════════════════════════════════════════════════════════

import type { ReactNode } from 'react'

type Tone = 'blue' | 'yellow' | 'gray' | 'red' | 'green'

const tones: Record<Tone, string> = {
  blue: 'bg-blue-50 text-[#00369C]',
  yellow: 'bg-yellow-50 text-[#B58A00]',
  gray: 'bg-gray-100 text-[#6b6e70]',
  red: 'bg-red-50 text-red-500',
  green: 'bg-green-50 text-green-600',
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
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center ${tones[tone]}`}
        >
          {icon}
        </div>
      </div>
      <p className="text-sm text-gray-600 mb-1">{label}</p>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
    </div>
  )
}
