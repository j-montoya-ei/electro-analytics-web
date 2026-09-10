// ═══════════════════════════════════════════════════════════
// Página Recaudo (tablas a + b: causado_mensual + recaudo_pagos)
// Server Component: lee vw_recaudo_mensual (por generación) y
// vw_recaudo_por_mes_pago (flujo), calcula KPIs de recaudo y delega
// los gráficos al cliente RecaudoGraficos. Dos botones de carga.
//
// La cartera por EPS se agrega cuando se cargue la tabla (c) cartera_eps.
//
// Ubicación: app/(protected)/recaudo/page.tsx
// ═══════════════════════════════════════════════════════════

import { createClient } from '@/lib/supabase/server'
import CargarCausadoMensualBoton from '@/components/CargarCausadoMensualBoton'
import CargarRecaudoPagosBoton from '@/components/CargarRecaudoPagosBoton'
import RecaudoGraficos, {
  type RecaudoMensualRow,
  type RecaudoPagoRow,
} from '@/components/RecaudoGraficos'
import KpiCard from '@/components/KpiCard'
import { Coins, Wallet, TrendingUp, Receipt } from 'lucide-react'

export const dynamic = 'force-dynamic'

const nn = (v: number | string | null | undefined) => {
  const n = typeof v === 'number' ? v : v == null ? 0 : Number(v)
  return Number.isFinite(n) ? n : 0
}
const fmtCOP = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)
const fmtPct = (frac: number) => `${(frac * 100).toFixed(1)}%`

export default async function RecaudoPage() {
  const supabase = await createClient()

  const [mensualRes, pagoRes] = await Promise.all([
    supabase.from('vw_recaudo_mensual').select('*').order('mes_generacion', { ascending: true }).limit(5000),
    supabase.from('vw_recaudo_por_mes_pago').select('*').order('mes_pago', { ascending: true }).limit(5000),
  ])

  const error = mensualRes.error ?? pagoRes.error
  const mensual = (mensualRes.data ?? []) as RecaudoMensualRow[]
  const porPago = (pagoRes.data ?? []) as RecaudoPagoRow[]

  const totalCausado = mensual.reduce((s, r) => s + nn(r.valor_causado), 0)
  const totalRecaudado = mensual.reduce((s, r) => s + nn(r.total_recaudado), 0)
  const saldo = totalCausado - totalRecaudado
  const pctGlobal = totalCausado > 0 ? totalRecaudado / totalCausado : 0

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Recaudo</h2>
          <p className="text-sm text-gray-600 mt-1">Electroingeniería S.A.S.</p>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500">
            Seguimiento del recaudo de incapacidades ante las EPS: valor{' '}
            <span className="font-medium text-gray-700">causado</span> (a cobrar),{' '}
            <span className="font-medium text-gray-700">recaudado</span> y % de recuperación, por
            mes de generación y por mes de pago.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <CargarCausadoMensualBoton />
          <CargarRecaudoPagosBoton />
        </div>
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
            <KpiCard label="Total recaudado" value={fmtCOP(totalRecaudado)} tone="green" icon={<Wallet className="w-5 h-5" />} />
            <KpiCard label="% recaudo global" value={fmtPct(pctGlobal)} tone="yellow" icon={<TrendingUp className="w-5 h-5" />} />
            <KpiCard label="Saldo por recaudar" value={fmtCOP(saldo)} tone="gray" icon={<Receipt className="w-5 h-5" />} />
          </div>

          {/* Nota de alcance */}
          <div className="rounded-lg border border-blue-100 bg-blue-50/60 px-4 py-3 text-xs leading-5 text-slate-600">
            <span className="font-semibold text-[#092d6b]">Alcance actual:</span> causado, ingreso
            reconocido y recaudo (por generación y por pago). La cartera por EPS se habilita al
            cargar la sección de cartera del libro RECAUDO.
          </div>

          {mensual.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
              Aún no hay datos cargados. Usa{' '}
              <span className="font-medium text-gray-700">Cargar causado mensual</span> y{' '}
              <span className="font-medium text-gray-700">Cargar recaudo (pagos)</span> para subir el
              libro RECAUDO.
            </div>
          ) : (
            <RecaudoGraficos mensual={mensual} porPago={porPago} />
          )}
        </>
      )}
    </div>
  )
}
