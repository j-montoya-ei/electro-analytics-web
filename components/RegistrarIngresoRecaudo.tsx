// ═══════════════════════════════════════════════════════════
// Botón "Registrar ingreso" (client component) · módulo Recaudo
// Único dato que digita GH: lo que entró al banco por incapacidades.
// Cada registro = mes + entidad (opcional) + valor + observación.
// Varios ingresos del mismo mes se SUMAN (la suma la hace la vista
// vw_recaudo_consolidado / vw_recaudo_conciliacion, no el frontend).
// Escribe vía RPC fn_registrar_ingreso / fn_eliminar_ingreso
// (la tabla recaudo_ingresos no tiene política INSERT/DELETE).
//
// Ubicación: components/RegistrarIngresoRecaudo.tsx
// ═══════════════════════════════════════════════════════════

'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Plus, Loader2, Trash2, CheckCircle2, AlertCircle, Landmark } from 'lucide-react'

export type IngresoRow = {
  id: number
  mes: string // 'YYYY-MM-01'
  entidad: string | null
  valor: number | string
  observacion: string | null
  created_at: string
}

const SIN_ENTIDAD = ''
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

const num = (v: number | string | null | undefined) => {
  const n = typeof v === 'number' ? v : v == null ? 0 : Number(v)
  return Number.isFinite(n) ? n : 0
}
const fmtCOP = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)
// 'YYYY-MM-01' → 'mar-2026' (sin Date para no correr el mes por zona horaria)
const fmtMes = (iso: string) => {
  const [y, m] = iso.split('-')
  return `${MESES[Number(m) - 1] ?? m}-${y}`
}
// Mes actual en Bogotá → 'YYYY-MM'
const mesActual = () => {
  const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Bogota' }))
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function RegistrarIngresoRecaudo({
  entidades,
  ingresos,
}: {
  entidades: string[]
  ingresos: IngresoRow[]
}) {
  const router = useRouter()
  const [abierto, setAbierto] = useState(false)
  const [mes, setMes] = useState(mesActual())
  const [entidad, setEntidad] = useState(SIN_ENTIDAD)
  const [valorTxt, setValorTxt] = useState('')
  const [obs, setObs] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [borrando, setBorrando] = useState<number | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Solo dígitos; se muestra con separador de miles
  const valor = Number(valorTxt.replace(/\D/g, '')) || 0
  const valorFmt = valor ? new Intl.NumberFormat('es-CO').format(valor) : ''

  // Ingresos del mes seleccionado (la lista que ve ella al registrar)
  const delMes = useMemo(
    () => ingresos.filter((i) => i.mes.slice(0, 7) === mes),
    [ingresos, mes],
  )
  const totalMes = delMes.reduce((s, i) => s + num(i.valor), 0)

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    setOk(null)
    setError(null)
    if (!mes) return setError('Selecciona el mes')
    if (valor <= 0) return setError('Escribe un valor mayor que cero')

    setGuardando(true)
    const supabase = createClient()
    const { error: err } = await supabase.rpc('fn_registrar_ingreso', {
      p_mes: `${mes}-01`,
      p_valor: valor,
      p_entidad: entidad || null,
      p_observacion: obs.trim() || null,
    })
    setGuardando(false)
    if (err) return setError(err.message)

    setOk(`Registrado: ${fmtCOP(valor)} en ${fmtMes(`${mes}-01`)}${entidad ? ` · ${entidad}` : ''}`)
    setValorTxt('')
    setObs('')
    router.refresh() // recalcula la página con los totales nuevos
  }

  async function borrar(row: IngresoRow) {
    const txt = `${fmtCOP(num(row.valor))} · ${fmtMes(row.mes)}${row.entidad ? ` · ${row.entidad}` : ''}`
    if (!window.confirm(`¿Borrar este ingreso?\n\n${txt}`)) return
    setOk(null)
    setError(null)
    setBorrando(row.id)
    const supabase = createClient()
    const { error: err } = await supabase.rpc('fn_eliminar_ingreso', { p_id: row.id })
    setBorrando(null)
    if (err) return setError(err.message)
    setOk(`Ingreso borrado: ${txt}`)
    router.refresh()
  }

  const input =
    'h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 outline-none transition focus:border-[#00369C] focus:ring-2 focus:ring-[#00369C]/15'

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#00369C] px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-blue-900/20 transition-colors hover:bg-[#002a7a] focus:outline-none focus:ring-2 focus:ring-[#00369C]/30"
      >
        <Plus className="h-4 w-4" />
        Registrar ingreso
      </button>

      {abierto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setAbierto(false)}
        >
          <div
            className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-ingreso"
          >
            {/* Encabezado */}
            <div className="flex items-start justify-between border-b border-gray-200 px-6 py-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-[#00369C]">
                  <Landmark className="h-5 w-5" />
                </div>
                <div>
                  <h3 id="titulo-ingreso" className="text-lg font-bold text-gray-900">
                    Registrar ingreso
                  </h3>
                  <p className="text-sm text-gray-500">
                    Lo que entró al banco por incapacidades (según el extracto). Si hubo varios
                    ingresos en el mes, regístralos uno por uno: se suman solos.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAbierto(false)}
                className="text-xl leading-none text-gray-400 hover:text-gray-700"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={guardar} className="grid grid-cols-1 gap-4 px-6 py-5 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-gray-600">Mes del ingreso *</span>
                <input
                  type="month"
                  value={mes}
                  min="2025-01"
                  max={mesActual()}
                  onChange={(e) => setMes(e.target.value)}
                  className={input}
                  required
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-gray-600">Entidad (EPS / ARL)</span>
                <select value={entidad} onChange={(e) => setEntidad(e.target.value)} className={input}>
                  <option value={SIN_ENTIDAD}>Sin entidad / no identificada</option>
                  {entidades.map((e) => (
                    <option key={e} value={e}>
                      {e}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-gray-600">Valor *</span>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                    $
                  </span>
                  <input
                    inputMode="numeric"
                    placeholder="0"
                    value={valorFmt}
                    onChange={(e) => setValorTxt(e.target.value)}
                    className={`${input} pl-7 text-right tabular-nums`}
                    required
                  />
                </div>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-gray-600">Observación</span>
                <input
                  value={obs}
                  onChange={(e) => setObs(e.target.value)}
                  placeholder="Ej. consignación 12-mar, ref. 4587"
                  maxLength={200}
                  className={input}
                />
              </label>

              <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-h-[20px] text-xs">
                  {ok && (
                    <span className="inline-flex items-center gap-1.5 text-green-700">
                      <CheckCircle2 className="h-4 w-4" /> {ok}
                    </span>
                  )}
                  {error && (
                    <span className="inline-flex items-center gap-1.5 text-red-700">
                      <AlertCircle className="h-4 w-4" /> {error}
                    </span>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={guardando}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#00369C] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#002a7a] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  {guardando ? 'Guardando…' : 'Agregar ingreso'}
                </button>
              </div>
            </form>

            {/* Ingresos del mes seleccionado */}
            <div className="flex items-baseline justify-between border-t border-gray-200 bg-gray-50 px-6 py-3">
              <p className="text-sm font-semibold text-gray-800">
                Ingresos de {mes ? fmtMes(`${mes}-01`) : '—'}
              </p>
              <p className="text-sm text-gray-600">
                {delMes.length} registro(s) · total{' '}
                <span className="font-semibold text-gray-900">{fmtCOP(totalMes)}</span>
              </p>
            </div>
            <div className="overflow-y-auto">
              {delMes.length === 0 ? (
                <p className="px-6 py-8 text-center text-sm text-gray-400">
                  Aún no hay ingresos registrados en este mes.
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white text-xs uppercase tracking-wide text-gray-500">
                    <tr className="border-b border-gray-200">
                      <th className="px-6 py-2 text-left font-semibold">Entidad</th>
                      <th className="px-3 py-2 text-right font-semibold">Valor</th>
                      <th className="px-3 py-2 text-left font-semibold">Observación</th>
                      <th className="px-6 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {delMes.map((i) => (
                      <tr key={i.id} className="border-b border-gray-100">
                        <td className="px-6 py-2 text-gray-800">{i.entidad ?? 'Sin entidad'}</td>
                        <td className="px-3 py-2 text-right font-medium tabular-nums text-gray-900">
                          {fmtCOP(num(i.valor))}
                        </td>
                        <td className="max-w-[220px] truncate px-3 py-2 text-gray-500" title={i.observacion ?? ''}>
                          {i.observacion ?? '—'}
                        </td>
                        <td className="px-6 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => borrar(i)}
                            disabled={borrando === i.id}
                            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                            title="Borrar este ingreso"
                          >
                            {borrando === i.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                            Borrar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
