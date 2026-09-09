// ═══════════════════════════════════════════════════════════
// Página Recaudo (parcial — tabla a: causado_mensual)
// Server Component: jala vw_causado_mensual, calcula KPIs de
// causado e ingreso reconocido por EPS y delega los gráficos al
// cliente RecaudoGraficos. Mantiene el botón de carga.
//
// Recaudo mes a mes y cartera por EPS se agregan cuando se carguen
// las tablas (b) recaudo_pagos y (c) cartera_eps.
//
// Ubicación: app/(protected)/recaudo/page.tsx
// ═══════════════════════════════════════════════════════════

import { createClient } from '@/lib/supabase/server'
import CargarCausadoMensualBoton from '@/components/CargarCausadoMensualBoton'
import RecaudoGraficos, { type CausadoRow } from '@/components/RecaudoGraficos'
import KpiCard from '@/components/KpiCard'
import { Coins, Landmark, CalendarRange, ArrowLeftRight } from 'lucide-react'

export const dynamic = 'force-dynamic'

const nn = (v: number | string | null | undefined) => {
  const n = typeof v === 'number' ? v : v == null ? 0 : Number(v)
  return Number.isFinite(n) ? n : 0
}
const fmtCOP = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)

const MES_ABBR = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const mesLabel = (periodo?: string) => {
  const [y, m] = (periodo ?? '').split('-')
  return `${MES_ABBR[Number(m) - 1] ?? m} ${(y ?? '').slice(2)}`
}

export default async function RecaudoPage() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('vw_causado_mensual')
    .select('*')
    .order('mes_generacion', { ascending: true })
    .limit(5000)

  const rows = (data ?? []) as CausadoRow[]

  const totalCausado = rows.reduce((s, r) => s + nn(r.valor_causado), 0)
  const totalIngreso = rows.reduce((s, r) => s + nn(r.valor_ingreso), 0)
  const meses = rows.length
  const rango =
    meses > 0 ? `${mesLabel(rows[0].periodo)} – ${mesLabel(rows[meses - 1].periodo)}` : '—'

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Recaudo</h2>
          <p className="text-sm text-gray-600 mt-1">Electroingeniería S.A.S.</p>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500">
            Seguimiento del recaudo de incapacidades ante las EPS. Esta vista muestra el valor{' '}
            <span className="font-medium text-gray-700">causado</span> (a cobrar) y el{' '}
            <span className="font-medium text-gray-700">ingreso reconocido</span> por la EPS, por
            mes de generación.
          </p>
        </div>
        <CargarCausadoMensualBoton />
      </div>

      {error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm font-medium text-red-800">No se pudo cargar el módulo de recaudo</p>
          <p className="text-sm text-red-600 mt-1">{error.message}</p>
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Total causado" value={fmtCOP(totalCausado)} tone="blue" icon={<Coins className="w-5 h-5" />} />
            <KpiCard label="Ingreso reconocido EPS" value={fmtCOP(totalIngreso)} tone="green" icon={<Landmark className="w-5 h-5" />} />
            <KpiCard label="Meses con datos" value={meses} tone="gray" icon={<CalendarRange className="w-5 h-5" />} />
            <KpiCard label="Rango" value={rango} tone="yellow" icon={<ArrowLeftRight className="w-5 h-5" />} />
          </div>

          {/* Nota de alcance */}
          <div className="rounded-lg border border-blue-100 bg-blue-50/60 px-4 py-3 text-xs leading-5 text-slate-600">
            <span className="font-semibold text-[#092d6b]">Alcance actual:</span> causado e ingreso
            reconocido por EPS (tabla de causado). El recaudo mes a mes, la cartera por EPS y el % de
            recuperación se habilitan al cargar las tablas de pagos y cartera.
          </div>

          {meses === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
              Aún no hay datos cargados. Usa <span className="font-medium text-gray-700">Cargar causado mensual</span> para subir el libro RECAUDO.
            </div>
          ) : (
            <RecaudoGraficos rows={rows} />
          )}
        </>
      )}
    </div>
  )
}
