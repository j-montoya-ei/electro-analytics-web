// ═══════════════════════════════════════════════════════════
// POST /api/incapacidades/cargar
// Recibe el libro INCAPACIDADES_BASE_2026 (.xls o .xlsx), hoja
// 'Incapacidades', extrae las filas y las carga vía RPC
// fn_cargar_incapacidades.
//
// El RPC aplica las reglas de negocio (no este handler):
//   - limpia la cédula (deja solo dígitos)
//   - descarta filas sin ID Incapacidad o sin cédula
//   - deduplica por id_incapacidad
//   - upsert idempotente: ON CONFLICT (id_incapacidad) DO NOTHING
//
// Ubicación: app/api/incapacidades/cargar/route.ts
// ═══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from '@e965/xlsx'
import { createClient } from '@/lib/supabase/server'

// El parseo de Excel usa Buffer → requiere runtime Node, no Edge.
export const runtime = 'nodejs'

// Encabezados exactos del reporte. Se localizan por nombre (no por
// posición) para no romperse si se reordenan columnas. La clave de cada
// entrada es el nombre interno que espera el RPC (x->>'clave').
const LABELS = {
  id_incapacidad: 'ID Incapacidad',
  dni: 'Cédula',
  nombre: 'Nombres y apellidos',
  cargo: 'Cargo',
  unidad_negocio: 'Unidad de negocio',
  proceso: 'Proceso',
  codigo_dx: 'Código diagnóstico',
  descripcion_dx: 'Descripción código diagnóstico',
  mes: 'Mes',
  fecha_inicial: 'Fecha Inicial',
  fecha_final: 'Fecha Final',
  nro_dias: 'Nro.Dias',
  clase: 'Clase de incapacidad',
  es_prorroga: 'Es prorroga',
  valor_ibc: 'Valor IBC',
  valor_tnl: 'Valor TNL',
  valor_cia_3dias: 'Valor Cia. 3 Dias',
  total_incapacidad: 'Total Incapacidad',
  entidad: 'Entidad',
  observacion: 'Observación',
  an: 'AN',
  radicado: 'Radicado',
  fecha_radicado: 'Fecha Radicado',
  dias_radicacion: 'Días',
  radicacion_a_tiempo: 'Radicación a tiempo',
  estado: 'Estado',
  fecha_pago: 'Fecha de Pago',
  dias_espera: 'Dias de Espera',
  valor_pendiente_cobrar: 'Valor Pte por cobrar',
} as const

type Campo = keyof typeof LABELS

// Sin estas dos columnas una fila no puede procesarse (el RPC las exige).
const CRITICAS: Campo[] = ['id_incapacidad', 'dni']

// Campos que el RPC castea a date. El resto se envían como texto.
const CAMPOS_FECHA: Campo[] = [
  'fecha_inicial',
  'fecha_final',
  'fecha_radicado',
  'fecha_pago',
]

// Campos numéricos/enteros. Se envían como texto numérico limpio; el RPC
// castea (::numeric / ::int).
const CAMPOS_NUMERO: Campo[] = [
  'nro_dias',
  'valor_ibc',
  'valor_tnl',
  'valor_cia_3dias',
  'total_incapacidad',
  'dias_radicacion',
  'dias_espera',
  'valor_pendiente_cobrar',
]

// Fecha → 'YYYY-MM-DD'. Con cellDates:true los valores de fecha llegan como
// Date en UTC medianoche. Si viniera texto 'DD-MM-YYYY' se reordena; si ya
// viene 'YYYY-MM-DD' se respeta; cualquier otro texto se pasa tal cual y el
// RPC intentará castear.
const fmtFecha = (v: unknown): string | null => {
  if (v == null) return null
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  const s = String(v).trim()
  if (!s) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const m = s.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/)
  if (m) return `${m[3]}-${m[2]}-${m[1]}`
  return s
}

// Número → texto numérico limpio. Con raw:true las celdas numéricas llegan
// como number → String() no introduce separador de miles. El texto se pasa
// sin alterar (el RPC castea y, si falla, el error sube a la respuesta).
const num = (v: unknown): string | null => {
  if (v == null) return null
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : null
  const s = String(v).trim()
  return s || null
}

// Texto → trim, null si queda vacío.
const txt = (v: unknown): string | null =>
  v == null ? null : String(v).trim() || null

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  // 1) Autenticación (el RPC exige rol authenticated; verificamos aquí también)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  // 2) Recibir archivo (.xls o .xlsx)
  let file: File | null = null
  try {
    const form = await request.formData()
    const f = form.get('file')
    if (f instanceof File) file = f
  } catch {
    return NextResponse.json({ error: 'Petición inválida' }, { status: 400 })
  }
  if (!file) {
    return NextResponse.json({ error: 'No se recibió ningún archivo' }, { status: 400 })
  }
  const nombreArchivo = file.name.toLowerCase()
  if (!nombreArchivo.endsWith('.xls') && !nombreArchivo.endsWith('.xlsx')) {
    return NextResponse.json({ error: 'El archivo debe ser .xls o .xlsx' }, { status: 400 })
  }

  // 3) Parsear y extraer filas
  let filas: Array<Record<string, string | null>>
  try {
    const buf = Buffer.from(await file.arrayBuffer())
    const wb = XLSX.read(buf, { cellDates: true })

    // Preferir la hoja 'Incapacidades'; si no existe, usar la primera.
    const nombreHoja =
      wb.SheetNames.find((n) => n.trim().toLowerCase() === 'incapacidades') ??
      wb.SheetNames[0]
    const ws = nombreHoja ? wb.Sheets[nombreHoja] : undefined
    if (!ws) {
      return NextResponse.json({ error: 'El archivo no tiene hojas' }, { status: 400 })
    }

    const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, {
      header: 1,
      raw: true,
      defval: null,
    })

    // Localizar la fila de encabezados por la etiqueta del ID Incapacidad
    const hIdx = rows.findIndex(
      (r) => Array.isArray(r) && r.includes(LABELS.id_incapacidad),
    )
    if (hIdx === -1) {
      return NextResponse.json(
        { error: 'No se encontró la fila de encabezados del reporte de Incapacidades' },
        { status: 400 },
      )
    }
    const header = rows[hIdx] as unknown[]

    const idx = Object.fromEntries(
      (Object.entries(LABELS) as [Campo, string][]).map(([k, label]) => [
        k,
        header.indexOf(label),
      ]),
    ) as Record<Campo, number>

    const faltantes = CRITICAS.filter((k) => idx[k] === -1)
    if (faltantes.length) {
      return NextResponse.json(
        {
          error: `Faltan columnas en el reporte: ${faltantes
            .map((k) => LABELS[k])
            .join(', ')}`,
        },
        { status: 400 },
      )
    }

    // Selector de formateo por campo.
    const fecha = new Set<Campo>(CAMPOS_FECHA)
    const numero = new Set<Campo>(CAMPOS_NUMERO)
    const formatear = (k: Campo, v: unknown): string | null =>
      fecha.has(k) ? fmtFecha(v) : numero.has(k) ? num(v) : txt(v)

    filas = []
    for (const r of rows.slice(hIdx + 1)) {
      if (!Array.isArray(r)) continue
      const idRaw = idx.id_incapacidad === -1 ? null : r[idx.id_incapacidad]
      const id = idRaw == null ? null : String(idRaw).trim()
      if (!id) continue // fila vacía o pie del reporte

      const fila: Record<string, string | null> = {}
      for (const k of Object.keys(LABELS) as Campo[]) {
        const i = idx[k]
        fila[k] = i === -1 ? null : formatear(k, r[i])
      }
      filas.push(fila)
    }
  } catch {
    return NextResponse.json({ error: 'No se pudo leer el archivo Excel' }, { status: 400 })
  }

  if (filas.length === 0) {
    return NextResponse.json(
      { error: 'El reporte no contiene filas de datos' },
      { status: 400 },
    )
  }

  // 4) Cargar vía RPC
  const { data, error } = await supabase.rpc('fn_cargar_incapacidades', {
    p_filas: filas,
  })
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, resumen: data })
}
