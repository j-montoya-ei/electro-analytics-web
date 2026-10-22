// ═══════════════════════════════════════════════════════════
// Cliente Supabase ADMIN (service_role) — SOLO SERVIDOR
// Salta RLS. Úsalo únicamente en Server Actions / Route Handlers
// y solo después de verificar al usuario con getUser().
// NUNCA importarlo desde un componente 'use client'.
// ═══════════════════════════════════════════════════════════

import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  if (typeof window !== 'undefined') {
    throw new Error('createAdminClient solo puede usarse en el servidor')
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  // Sin prefijo NEXT_PUBLIC_: Next.js nunca la incluye en el navegador
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    // Falla cerrado: sin clave no hay operación admin
    throw new Error('Falta SUPABASE_SERVICE_ROLE_KEY o NEXT_PUBLIC_SUPABASE_URL')
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
