// ═══════════════════════════════════════════════════════════
// Cliente Supabase para el SERVIDOR (server-side)
// Se usa en Server Components y API Routes
// Maneja cookies para leer la sesión del usuario
// ═══════════════════════════════════════════════════════════

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function hasSupabaseConfig() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith('http')
  )
}

export async function createClient() {
  const cookieStore = await cookies()

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

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Ignorado: se llama desde Server Component
          }
        },
      },
    }
  )
}
