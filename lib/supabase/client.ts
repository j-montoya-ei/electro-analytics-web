// ═══════════════════════════════════════════════════════════
// Cliente Supabase para el NAVEGADOR (client-side)
// Se usa en componentes React que corren en el navegador
// ═══════════════════════════════════════════════════════════

import { createBrowserClient } from '@supabase/ssr'

export function hasSupabaseConfig() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith('http')
  )
}

export function createClient() {
  if (!hasSupabaseConfig()) {
    const emptyQuery = () => ({
      select: () => ({
        limit: async () => ({ data: [], error: null }),
        order: () => ({
          limit: async () => ({ data: [], error: null }),
        }),
      }),
    })

    return {
      auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
        signInWithPassword: async () => ({ data: { user: null }, error: null }),
        signOut: async () => ({ error: null }),
      },
      from: () => emptyQuery(),
      rpc: async () => ({ data: [], error: null }),
    } as any
  }

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
