// ═══════════════════════════════════════════════════════════
// Página Recaudo — módulo completo (tablas a + b + c).
// Server Component: lee vw_recaudo_mensual, vw_recaudo_por_mes_pago,
// vw_cartera_por_entidad y vw_cartera_por_corte; calcula KPIs y
// delega los gráficos a RecaudoGraficos. Tres botones de carga.
//
// Ubicación: app/(protected)/recaudo/page.tsx
// ═══════════════════════════════════════════════════════════

import { createClient } from '@/lib/supabase/server'
import CargarCausadoMensualBoton from '@/components/CargarCausadoMensualBoton'
import CargarRecaudoPagosBoton from '@/components/CargarRecaudoPagosBoton'
import CargarCarteraEpsBoton from '@/components/CargarCarteraEpsBoton'
import RecaudoGraficos, {
  type RecaudoMensualRow,
  type RecaudoPagoRow,
  type CarteraEntidadRow,
  type CarteraCorteRow,
} from '@/components/RecaudoGraficos'
import KpiCard from '@/components/KpiCard'
import { Coins, Wallet, TrendingUp, Landmark } from 'lucide-react'

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

  const [mensualRes, pagoRes, entidadRes, corteRes] = await Promise.all([
    supabase.from('vw_recaudo_mensual').select('*').order('mes_generacion', { ascending: true }).limit(5000),
    supabase.from('vw_recaudo_por_mes_pago').select('*').order('mes_pago', { ascending: true }).limit(5000),
    supabase.from('vw_cartera_por_entidad').select('*').limit(5000),
    supabase.from('vw_cartera_por_corte').select('*').order('mes_corte', { ascending: true }).limit(5000),
  ])

  const error = mensualRes.error ?? pagoRes.error ?? entidadRes.error ?? corteRes.error
  const mensual = (mensualRes.data ?? []) as RecaudoMensualRow[]
  const porPago = (pagoRes.data ?? []) as RecaudoPagoRow[]
  const carteraEntidad = (entidadRes.data ?? []) as CarteraEntidadRow[]
  const carteraCorte = (corteRes.data ?? []) as CarteraCorteRow[]

  const totalCausado = mensual.reduce((s, r) => s + nn(r.valor_causado), 0)
  const totalRecaudado = mensual.reduce((s, r) => s + nn(r.total_recaudado), 0)
  const pctGlobal = totalCausado > 0 ? totalRecaudado / totalCausado : 0
  const carteraActual = carteraEntidad.reduce((s, r) => s + nn(r.saldo_actual), 0)

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Recaudo</h2>
          <p className="text-sm text-gray-600 mt-1">Electroingeniería S.A.S.</p>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500">
            Recaudo de incapacidades ante las EPS: causado, recaudado, % de recuperación y cartera
            por entidad.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <CargarCausadoMensualBoton />
          <CargarRecaudoPagosBoton />
          <CargarCarteraEpsBoton />
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
            <KpiCard label="Cartera actual (EPS)" value={fmtCOP(carteraActual)} tone="gray" icon={<Landmark className="w-5 h-5" />} />
          </div>

          {/* Nota de alcance */}
          <div className="rounded-lg border border-blue-100 bg-blue-50/60 px-4 py-3 text-xs leading-5 text-slate-600">
            <span className="font-semibold text-[#092d6b]">Módulo RECAUDO completo:</span> causado e
            ingreso reconocido, recaudo por generación y por mes de pago, y cartera por EPS (saldo,
            abono y evolución). Carga las 3 secciones del libro con los botones.
          </div>

          {mensual.length === 0 && carteraCorte.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
              Aún no hay datos cargados. Usa los botones de carga para subir el libro RECAUDO
              (causado, recaudo y cartera).
            </div>
          ) : (
            <RecaudoGraficos
              mensual={mensual}
              porPago={porPago}
              carteraEntidad={carteraEntidad}
              carteraCorte={carteraCorte}
            />
          )}
        </>
      )}
    </div>
  )
}
