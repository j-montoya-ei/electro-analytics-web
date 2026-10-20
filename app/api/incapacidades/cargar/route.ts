import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from '@e965/xlsx'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const LABELS = {
  id_incapacidad: 'ID INC',
  dni: 'No ID',
  nombre: 'NOMBRES Y APELLIDOS',
  cargo: 'CARGO',
  unidad_negocio: 'UN',
  proceso: 'PROCESO',
  codigo_dx: 'CODIGO DIAG',
  descripcion_dx: 'DESCRIPCIÓN CÓDIGO DIAGNÓSTICO',
  mes: 'MES',
  fecha_inicial: 'FECHA INICIAL',
  fecha_final: 'FECHA FIN',
  nro_dias: 'Nro.DÍAS',
  clase: 'CLASE DE INC',
  es_prorroga: 'PRORROGA',
  valor_ibc: 'VALOR IBC',
  valor_tnl: 'VALOR TNL',
  valor_cia_3dias: 'VALOR CIA. 3 DIAS',
  total_incapacidad: 'TOTAL INC',
  entidad: 'ENTIDAD',
  observacion: 'OBSERVACIÓN',
  an: 'AN',
  radicado: 'RADICADO',
  fecha_radicado: 'FECHA RADICADO',
  dias_radicacion: 'DÍAS',
  radicacion_a_tiempo: 'RADICADO A TIEMPO',
  estado: 'ESTADO',
  fecha_pago: 'FECHA DE PAGO',
  dias_espera: 'DÍAS DE ESPERA',
  valor_pendiente_cobrar: 'VALOR PTE POR COBRAR',
} as const

type Campo = keyof typeof LABELS

const CAMPOS_FECHA: Campo[] = [
  'fecha_inicial',
  'fecha_final',
  'fecha_radicado',
  'fecha_pago',
]


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

const norm = (v: unknown): string =>
  String(v ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim()


const fmtFecha = (v: unknown): string | null => {
  if (v == null) return null
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  const s = String(v).trim()
  if (!s) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const m = s.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/)
  if (m) return `${m[3]}-${m[2]}-${m[1]}`
  return null
}


const num = (v: unknown): string | null => {
  if (v == null) return null
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : null
  const s = String(v).trim()
  if (!s) return null
  return /^-?\d+(\.\d+)?$/.test(s) ? s : null
}

const txt = (v: unknown): string | null =>
  v == null ? null : String(v).trim() || null

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

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

  let filas: Array<Record<string, string | null>>
  try {
    const buf = Buffer.from(await file.arrayBuffer())
    const wb = XLSX.read(buf, { cellDates: true })

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

    const claveId = norm(LABELS.id_incapacidad)
    const hIdx = rows.findIndex(
      (r) => Array.isArray(r) && r.some((c) => norm(c) === claveId),
    )
    if (hIdx === -1) {
      return NextResponse.json(
        {
          error:
            'No se encontró la fila de encabezados (columna "ID INC"). ¿Es el archivo INCAPACIDADES_BASE?',
        },
        { status: 400 },
      )
    }
    const header = (rows[hIdx] as unknown[]).map(norm)

    const idx = Object.fromEntries(
      (Object.entries(LABELS) as [Campo, string][]).map(([k, label]) => [
        k,
        header.indexOf(norm(label)),
      ]),
    ) as Record<Campo, number>

    const faltantes = (Object.keys(LABELS) as Campo[]).filter((k) => idx[k] === -1)
    if (faltantes.length) {
      return NextResponse.json(
        {
          error: `Faltan columnas en el archivo: ${faltantes
            .map((k) => LABELS[k])
            .join(', ')}`,
        },
        { status: 400 },
      )
    }

    const fecha = new Set<Campo>(CAMPOS_FECHA)
    const numero = new Set<Campo>(CAMPOS_NUMERO)
    const formatear = (k: Campo, v: unknown): string | null =>
      fecha.has(k) ? fmtFecha(v) : numero.has(k) ? num(v) : txt(v)

    filas = []
    for (const r of rows.slice(hIdx + 1)) {
      if (!Array.isArray(r)) continue
      if (r.every((c) => c == null || String(c).trim() === '')) continue

      const fila: Record<string, string | null> = {}
      for (const k of Object.keys(LABELS) as Campo[]) {
        fila[k] = formatear(k, r[idx[k]])
      }
      filas.push(fila)
    }
  } catch {
    return NextResponse.json({ error: 'No se pudo leer el archivo Excel' }, { status: 400 })
  }

  if (filas.length === 0) {
    return NextResponse.json(
      { error: 'El archivo no contiene filas de datos' },
      { status: 400 },
    )
  }

  const { data, error } = await supabase.rpc('fn_cargar_incapacidades', {
    p_filas: filas,
  })
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true, resumen: data })
}
