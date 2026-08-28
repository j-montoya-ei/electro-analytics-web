// ═══════════════════════════════════════════════════════════
// Página HOME (/) — Caracterización del personal + Operación
// Fusiona: caracterización (vw_caracterizacion) + el bloque operativo
// que aportaba el antiguo Dashboard (top llegadas tarde administrativas).
// Server Component: hace los fetch, cuenta, y pasa lo dibujable al cliente.
// Ubicación: app/(protected)/page.tsx
// ═══════════════════════════════════════════════════════════

import type { ReactNode } from 'react'
import { createClient } from '@/lib/supabase/server'
import KpiCard from '@/components/KpiCard'
import CaracterizacionGraficos from '@/components/CaracterizacionGraficos'
import { Users, Cake, History, Network, MapPin } from 'lucide-react'

export const dynamic = 'force-dynamic'

// Inicio de datos confiables del proyecto. El bloque operativo (llegadas
// tarde) se filtra desde aquí para no arrastrar abril–junio (no confiables).
const CORTE_CONFIABLE = '2026-07-01'

type Fila = {
  documento: string
  nombre_completo: string
  genero: string
  edad: number | null
  rango_edad: string
  antiguedad_anios: number | null
  rango_antiguedad: string
  escolaridad: string
  estrato: string
  tipo_contrato: string
  division: string
  area: string
  sede: string
}

type Conteo = { label: string; value: number }

const SIN_DATO = 'Sin dato'

const ORDEN_EDAD = ['≤25', '26-35', '36-45', '46-55', '≥56']
const ORDEN_ANTIG = ['<1 año', '1-3 años', '3-5 años', '5-10 años', '>10 años']
const ORDEN_ESTRATO = [
  'Estrato 1', 'Estrato 2', 'Estrato 3', 'Estrato 4', 'Estrato 5', 'Estrato 6',
]

function contarPor(rows: Fila[], key: keyof Fila, orden?: string[]): Conteo[] {
  const m = new Map<string, number>()
  for (const r of rows) {
    const raw = r[key]
    const v = raw == null || raw === '' ? SIN_DATO : String(raw)
    m.set(v, (m.get(v) ?? 0) + 1)
  }
  const arr = [...m.entries()].map(([label, value]) => ({ label, value }))
  arr.sort((a, b) => {
    if (a.label === SIN_DATO) return 1
    if (b.label === SIN_DATO) return -1
    if (orden) {
      const ia = orden.indexOf(a.label)
      const ib = orden.indexOf(b.label)
      if (ia === -1 && ib === -1) return b.value - a.value
      if (ia === -1) return 1
      if (ib === -1) return -1
      return ia - ib
    }
    return b.value - a.value
  })
  return arr
}

function Panel({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">{titulo}</h3>
      {children}
    </div>
  )
}

function BarrasSimple({ datos }: { datos: Conteo[] }) {
  const max = Math.max(1, ...datos.map((d) => d.value))
  return (
    <div className="space-y-2">
      {datos.map((d) => (
        <div key={d.label} className="flex items-center gap-3">
          <span
            className="w-44 shrink-0 text-sm text-gray-700 truncate"
            title={d.label}
          >
            {d.label}
          </span>
          <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
            <div
              className="h-full bg-[#00369C] rounded-full"
              style={{ width: `${(d.value / max) * 100}%` }}
            />
          </div>
          <span className="w-8 shrink-0 text-right text-sm font-medium text-gray-900">
            {d.value}
          </span>
        </div>
      ))}
    </div>
  )
}

export default async function HomePage() {
  const supabase = await createClient()

  // Caracterización + bloque operativo (llegadas tarde administrativas).
  // El operativo se acota desde CORTE_CONFIABLE (mañana = momento 'entrada').
  const [carac, late] = await Promise.all([
    supabase.from('vw_caracterizacion').select('*').limit(1000),
    supabase
      .from('vw_puntualidad_admin')
      .select('nombre_completo')
      .eq('momento', 'entrada')
      .eq('llego_tarde', true)
      .gte('fecha_entrada', CORTE_CONFIABLE)
      .limit(1000),
  ])

  if (carac.error) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm font-medium text-red-800">
            No se pudo cargar la caracterización del personal
          </p>
          <p className="text-sm text-red-600 mt-1">{carac.error.message}</p>
        </div>
      </div>
    )
  }

  const filas = (carac.data ?? []) as Fila[]
  const total = filas.length

  // ─── KPIs de planta ─────────────────────────────────────────────────
  const mujeres = filas.filter((f) => /fem/i.test(f.genero)).length
  const hombres = filas.filter((f) => /masc/i.test(f.genero)).length
  const pctG = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0)

  const edades = filas
    .map((f) => f.edad)
    .filter((n): n is number => typeof n === 'number')
  const antigs = filas
    .map((f) => f.antiguedad_anios)
    .filter((n): n is number => typeof n === 'number')
  const edadProm = edades.length
    ? Math.round(edades.reduce((a, b) => a + b, 0) / edades.length)
    : 0
  const antigProm = antigs.length
    ? antigs.reduce((a, b) => a + b, 0) / antigs.length
    : 0

  // ─── Distribuciones ─────────────────────────────────────────────────
  const porGenero = contarPor(filas, 'genero')
  const porEdad = contarPor(filas, 'rango_edad', ORDEN_EDAD)
  const porAntig = contarPor(filas, 'rango_antiguedad', ORDEN_ANTIG)
  const porEscolaridad = contarPor(filas, 'escolaridad')
  const porEstrato = contarPor(filas, 'estrato', ORDEN_ESTRATO)
  const porContrato = contarPor(filas, 'tipo_contrato')
  const porUnidad = contarPor(filas, 'division')
  const porProceso = contarPor(filas, 'area')
  const porSede = contarPor(filas, 'sede')

  const sinEscolaridad =
    porEscolaridad.find((d) => d.label === SIN_DATO)?.value ?? 0

  // ─── Bloque operativo: top llegadas tarde administrativas ───────────
  const conteoTarde = new Map<string, number>()
  for (const r of (late.data ?? []) as { nombre_completo: string }[]) {
    conteoTarde.set(r.nombre_completo, (conteoTarde.get(r.nombre_completo) ?? 0) + 1)
  }
  const topTarde = [...conteoTarde.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10)

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          Caracterización del personal
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          {total} colaboradores activos · Electroingeniería S.A.S.
        </p>
      </div>

      {/* KPIs: planta + operativos (procesos, sedes) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        <KpiCard label="Total activos" value={total} tone="blue" icon={<Users className="w-5 h-5" />} />
        <KpiCard label="Mujeres" value={`${mujeres} · ${pctG(mujeres)}%`} tone="yellow" icon={<Users className="w-5 h-5" />} />
        <KpiCard label="Hombres" value={`${hombres} · ${pctG(hombres)}%`} tone="gray" icon={<Users className="w-5 h-5" />} />
        <KpiCard label="Edad promedio" value={`${edadProm} años`} tone="green" icon={<Cake className="w-5 h-5" />} />
        <KpiCard label="Antigüedad promedio" value={`${antigProm.toFixed(1)} años`} tone="blue" icon={<History className="w-5 h-5" />} />
        <KpiCard label="Procesos" value={porProceso.length} tone="blue" icon={<Network className="w-5 h-5" />} />
        <KpiCard label="Sedes" value={porSede.length} tone="red" icon={<MapPin className="w-5 h-5" />} />
      </div>

      {/* Gráficos de caracterización (cliente) */}
      <CaracterizacionGraficos
        total={total}
        genero={porGenero}
        edad={porEdad}
        antiguedad={porAntig}
        estrato={porEstrato}
        contrato={porContrato}
        escolaridad={porEscolaridad}
        unidad={porUnidad}
        proceso={porProceso}
        sede={porSede}
        sinEscolaridad={sinEscolaridad}
      />

      {/* Bloque operativo rescatado del antiguo Dashboard */}
      <section className="space-y-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Operación</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Llegadas tarde de la mañana · administrativos · desde {CORTE_CONFIABLE}
          </p>
        </div>
        <Panel titulo="Top llegadas tarde · administrativos">
          {topTarde.length ? (
            <BarrasSimple datos={topTarde} />
          ) : (
            <p className="text-sm text-gray-500">
              Sin llegadas tarde registradas.
            </p>
          )}
        </Panel>
      </section>

      {/* El cruce interactivo se monta aquí (archivo pendiente) */}
    </div>
  )
}
