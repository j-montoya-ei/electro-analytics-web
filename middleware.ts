// ═══════════════════════════════════════════════════════════
// Middleware - Guardia de seguridad de la app
// Se ejecuta ANTES de cada request para verificar autenticación
// ═══════════════════════════════════════════════════════════

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

function hasSupabaseConfig() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith('http')
  )
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  // Falla cerrado: sin configuración de Supabase no se deja pasar a nadie
  if (!hasSupabaseConfig()) {
    return new NextResponse('Servicio no disponible: falta configuración', {
      status: 503,
    })
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  if (!user && !path.startsWith('/login') && !path.startsWith('/auth')) {
    return redirigir(request, supabaseResponse, '/login')
  }

  if (user) {
    // Marca puesta por el administrador en app_metadata (el usuario no puede editarla)
    const debeCambiar = user.app_metadata?.must_change_password === true
    const enCambiar = path.startsWith('/cambiar-password')

    if (debeCambiar && !enCambiar) {
      if (path.startsWith('/api')) {
        return NextResponse.json(
          { error: 'Debes cambiar tu contraseña antes de continuar' },
          { status: 403 }
        )
      }
      return redirigir(request, supabaseResponse, '/cambiar-password')
    }

    if (!debeCambiar && enCambiar) {
      return redirigir(request, supabaseResponse, '/')
    }
  }

  return supabaseResponse
}

// Redirige conservando las cookies de sesión que Supabase haya refrescado
function redirigir(
  request: NextRequest,
  supabaseResponse: NextResponse,
  destino: string
) {
  const url = request.nextUrl.clone()
  url.pathname = destino
  url.search = ''
  const respuesta = NextResponse.redirect(url)
  supabaseResponse.cookies.getAll().forEach((cookie) =>
    respuesta.cookies.set(cookie)
  )
  return respuesta
}

// Config: qué rutas protege el middleware
export const config = {
  matcher: [
    // Protege TODO excepto archivos estáticos y APIs internas
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
