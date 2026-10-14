// ═══════════════════════════════════════════════════════════
// leerTodo · lee una vista/tabla completa por páginas
// Supabase (PostgREST) devuelve como máximo 1000 filas por petición y
// corta SIN avisar; .limit(5000) no lo evita. Esta función pide de a 1000
// hasta traer todo.
// `orden` debe identificar cada fila de forma única (ej. ['anio','id_incapacidad']);
// si no, la paginación puede repetir o saltar filas.
//
// Ubicación: lib/supabase/leerTodo.ts
// ═══════════════════════════════════════════════════════════

import type { createClient } from '@/lib/supabase/server'

type Sb = Awaited<ReturnType<typeof createClient>>

export async function leerTodo<T>(
  supabase: Sb,
  vista: string,
  orden: string[],
  columnas = '*',
): Promise<{ data: T[]; error: { message: string } | null }> {
  const PAGINA = 1000
  const out: T[] = []
  for (let desde = 0; ; desde += PAGINA) {
    let q = supabase.from(vista).select(columnas)
    for (const col of orden) q = q.order(col, { ascending: true })
    const { data, error } = await q.range(desde, desde + PAGINA - 1)
    if (error) return { data: out, error }
    out.push(...((data ?? []) as T[]))
    if (!data || data.length < PAGINA) return { data: out, error: null }
  }
}
