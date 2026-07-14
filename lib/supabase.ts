// ═══════════════════════════════════════════════════════════
// Cliente Supabase - Electro Analytics Web
// Punto único de conexión entre la app y la base de datos
// ═══════════════════════════════════════════════════════════

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Faltan variables de entorno de Supabase. Revisa el archivo .env.local'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
