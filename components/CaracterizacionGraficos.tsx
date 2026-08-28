// ═══════════════════════════════════════════════════════════
// CaracterizacionGraficos — gráficos del módulo de caracterización
// Client Component (Recharts corre en el navegador).
// Recibe las distribuciones YA contadas desde la página (server).
// Ubicación: components/CaracterizacionGraficos.tsx
// ═══════════════════════════════════════════════════════════
'use client'

import type { ReactNode } from 'react'
import {
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

type Conteo = { label: string; value: number }

// ─── Colores corporativos + variaciones del azul para series largas ─────
const AZUL = '#00369C'
const GRIS = '#A4A8AB'
const PALETA = [
  '#00369C', '#F6D000', '#A4A8AB', '#2E5BB8', '#5C82D4',
  '#001E5C', '#8AA9E6', '#0A4FD1', '#6B7B8C', '#B8CFF2',
]

// "Sin dato" siempre gris; el resto entra por la paleta.
function colorDe(label: string, i: number, mono = false): string {
  if (label === 'Sin dato') return GRIS
  if (mono) return AZUL
  return PALETA[i % PALETA.length]
}

const pct = (n: number, total: number) =>
  total > 0 ? Math.round((n / total) * 100) : 0

// ─── Contenedor de tarjeta (mismo estilo que el resto de la app) ────────
function Panel({
  titulo,
  children,
  nota,
  className = '',
}: {
  titulo: string
  children: ReactNode
  nota?: string
  className?: string
}) {
  return (
    <div
      className={`bg-white rounded-lg border border-gray-200 p-6 shadow-sm ${className}`}
    >
      <h3 className="text-sm font-semibold text-gray-900 mb-4">{titulo}</h3>
      {children}
      {nota && <p className="mt-3 text-xs text-gray-400">{nota}</p>}
    </div>
  )
}

// ─── Anillo (dona con hueco) — para 2–5 categorías ──────────────────────
function Anillo({ datos, total }: { datos: Conteo[]; total: number }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={datos}
          dataKey="value"
          nameKey="label"
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={2}
        >
          {datos.map((d, i) => (
            <Cell key={d.label} fill={colorDe(d.label, i)} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number, name: string) => [
            `${value} · ${pct(value, total)}%`,
            name,
          ]}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}

// ─── Barras verticales (histograma) — mono azul, orden natural ──────────
function BarrasVert({
  datos,
  total,
}: {
  datos: Conteo[]
  total: number
}) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={datos} margin={{ top: 8, right: 8, left: -18, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
        <Tooltip
          formatter={(value: number) => [
            `${value} · ${pct(value, total)}%`,
            'Personas',
          ]}
        />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {datos.map((d) => (
            <Cell key={d.label} fill={colorDe(d.label, 0, true)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// ─── Barras horizontales — paleta variada, alto según nº de categorías ──
function BarrasHoriz({
  datos,
  total,
}: {
  datos: Conteo[]
  total: number
}) {
  const alto = Math.max(180, datos.length * 34)
  return (
    <ResponsiveContainer width="100%" height={alto}>
      <BarChart
        data={datos}
        layout="vertical"
        margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
        <YAxis
          type="category"
          dataKey="label"
          width={140}
          tick={{ fontSize: 12 }}
        />
        <Tooltip
          formatter={(value: number) => [
            `${value} · ${pct(value, total)}%`,
            'Personas',
          ]}
        />
        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
          {datos.map((d, i) => (
            <Cell key={d.label} fill={colorDe(d.label, i)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// ─── Componente principal: arma la cuadrícula mezclada ──────────────────
export default function CaracterizacionGraficos({
  total,
  genero,
  edad,
  antiguedad,
  estrato,
  contrato,
  escolaridad,
  unidad,
  proceso,
  sede,
  sinEscolaridad,
}: {
  total: number
  genero: Conteo[]
  edad: Conteo[]
  antiguedad: Conteo[]
  estrato: Conteo[]
  contrato: Conteo[]
  escolaridad: Conteo[]
  unidad: Conteo[]
  proceso: Conteo[]
  sede: Conteo[]
  sinEscolaridad: number
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Panel titulo="Género">
        <Anillo datos={genero} total={total} />
      </Panel>
      <Panel titulo="Tipo de contrato">
        <Anillo datos={contrato} total={total} />
      </Panel>

      <Panel titulo="Rango de edad">
        <BarrasVert datos={edad} total={total} />
      </Panel>
      <Panel titulo="Antigüedad">
        <BarrasVert datos={antiguedad} total={total} />
      </Panel>

      <Panel titulo="Estrato socioeconómico">
        <BarrasVert datos={estrato} total={total} />
      </Panel>
      <Panel
        titulo="Nivel educativo"
        nota={`Dato manual en Buk: ${sinEscolaridad} de ${total} sin diligenciar.`}
      >
        <BarrasHoriz datos={escolaridad} total={total} />
      </Panel>

      <Panel titulo={`Unidad de negocio (${unidad.length})`}>
        <BarrasHoriz datos={unidad} total={total} />
      </Panel>
      <Panel titulo={`Proceso (${proceso.length})`}>
        <BarrasHoriz datos={proceso} total={total} />
      </Panel>

      <Panel titulo={`Sede (${sede.length})`} className="lg:col-span-2">
        <BarrasHoriz datos={sede} total={total} />
      </Panel>
    </div>
  )
}
