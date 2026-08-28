// ═══════════════════════════════════════════════════════════
// Página Caracterización del personal (#8)
// Server Component: jala vw_caracterizacion (planta activa) y
// arma KPIs + distribuciones. El conteo/agrupación es presentación;
// las reglas (buckets, etiquetas, universo) viven en la vista SQL.
// Ubicación: app/(protected)/caracterizacion/page.tsx
// ═══════════════════════════════════════════════════════════

import type { ReactNode } from 'react'
import { createClient } from '@/lib/supabase/server'
import KpiCard from '@/components/KpiCard'
import { Users, Cake, History } from 'lucide-react'

export const dynamic = 'force-dynamic'

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

// Órdenes naturales para las dimensiones ordinales (espejo de los buckets del SQL).
const ORDEN_EDAD = ['≤25', '26-35', '36-45', '46-55', '≥56']
const ORDEN_ANTIG = ['<1 año', '1-3 años', '3-5 años', '5-10 años', '>10 años']
const ORDEN_ESTRATO = [
  'Estrato 1', 'Estrato 2', 'Estrato 3', 'Estrato 4', 'Estrato 5', 'Estrato 6',
]

// Cuenta filas por una dimensión. Con `orden` respeta ese orden; sin él, ordena
// por conteo desc. En ambos casos "Sin dato" queda de último.
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

function Barras({ datos, total }: { datos: Conteo[]; total: number }) {
  const max = Math.max(1, ...datos.map((d) => d.value))
  return (
    <div className="space-y-2">
      {datos.map((d) => {
        const pct = total > 0 ? Math.round((d.value / total) * 100) : 0
        return (
          <div key={d.label} className="flex items-center gap-3">
            <span
              className="w-36 shrink-0 text-sm text-gray-700 truncate"
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
            <span className="w-16 shrink-0 text-right text-sm font-medium text-gray-900">
              {d.value}{' '}
              <span className="text-gray-400 font-normal">· {pct}%</span>
            </span>
          </div>
        )
      })}
    </div>
  )
}

function Panel({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">{titulo}</h3>
      {children}
    </div>
  )
}

export default async function CaracterizacionPage() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('vw_caracterizacion')
    .select('*')
    .limit(1000)

  if (error) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm font-medium text-red-800">
            No se pudo cargar la caracterización del personal
          </p>
          <p className="text-sm text-red-600 mt-1">{error.message}</p>
        </div>
      </div>
    )
  }

  const filas = (data ?? []) as Fila[]
  const total = filas.length

  // ─── KPIs ───────────────────────────────────────────────────────────
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

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <KpiCard
          label="Total activos"
          value={total}
          tone="blue"
          icon={<Users className="w-5 h-5" />}
        />
        <KpiCard
          label="Mujeres"
          value={`${mujeres} · ${pctG(mujeres)}%`}
          tone="yellow"
          icon={<Users className="w-5 h-5" />}
        />
        <KpiCard
          label="Hombres"
          value={`${hombres} · ${pctG(hombres)}%`}
          tone="gray"
          icon={<Users className="w-5 h-5" />}
        />
        <KpiCard
          label="Edad promedio"
          value={`${edadProm} años`}
          tone="green"
          icon={<Cake className="w-5 h-5" />}
        />
        <KpiCard
          label="Antigüedad promedio"
          value={`${antigProm.toFixed(1)} años`}
          tone="blue"
          icon={<History className="w-5 h-5" />}
        />
      </div>

      {/* Distribuciones */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel titulo="Género">
          <Barras datos={porGenero} total={total} />
        </Panel>
        <Panel titulo="Rango de edad">
          <Barras datos={porEdad} total={total} />
        </Panel>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel titulo="Antigüedad">
          <Barras datos={porAntig} total={total} />
        </Panel>
        <Panel titulo="Estrato socioeconómico">
          <Barras datos={porEstrato} total={total} />
        </Panel>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel titulo="Nivel educativo">
          <Barras datos={porEscolaridad} total={total} />
          <p className="mt-3 text-xs text-gray-400">
            Dato manual en Buk: {sinEscolaridad} de {total} sin diligenciar.
          </p>
        </Panel>
        <Panel titulo="Tipo de contrato">
          <Barras datos={porContrato} total={total} />
        </Panel>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel titulo={`Unidad de negocio (${porUnidad.length})`}>
          <Barras datos={porUnidad} total={total} />
        </Panel>
        <Panel titulo={`Proceso (${porProceso.length})`}>
          <Barras datos={porProceso} total={total} />
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <Panel titulo={`Sede (${porSede.length})`}>
          <Barras datos={porSede} total={total} />
        </Panel>
      </div>

      {/* El cruce interactivo se monta aquí (archivo 2 de 3) */}
    </div>
  )
}
