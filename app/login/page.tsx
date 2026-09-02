// ═══════════════════════════════════════════════════════════
// Página de Login - Electro Analytics
// Formulario para autenticar usuarios via Supabase Auth
// ═══════════════════════════════════════════════════════════

import { login } from './actions'
import Image from 'next/image'

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4f6fa] p-4 sm:p-8">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,35,75,0.14)] md:grid-cols-[0.88fr_1.12fr]">
        <section className="relative flex min-h-[240px] flex-col justify-between overflow-hidden bg-[#092d6b] px-8 py-8 text-white sm:px-11 sm:py-10 md:min-h-[530px]">
          <span className="absolute left-0 top-0 h-full w-1.5 bg-[#f6d000]" />
          <div className="relative">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#f6d000]">
              Electroingeniería S.A.S.
            </p>
            <div className="mt-10 max-w-xs md:mt-28">
              <h1 className="text-3xl font-bold leading-tight sm:text-4xl">
                Datos claros para decisiones estratégicas.
              </h1>
              <p className="mt-5 text-sm leading-6 text-blue-100">
                Analítica de Gestión Humana para conocer, analizar y gestionar
                mejor nuestro talento.
              </p>
            </div>
          </div>
          <p className="relative mt-8 text-xs leading-5 text-blue-200">
            Plataforma interna para el seguimiento y análisis del personal.
          </p>
        </section>

        <section className="flex items-center px-8 py-10 sm:px-14 sm:py-12">
          <div className="w-full max-w-md">
            <Image
              src="/logos/electroingenieria-logo.png"
              alt="Electroingeniería"
              width={320}
              height={120}
              className="mb-8 h-auto w-56 object-contain object-left"
              priority
            />
            <h2 className="text-3xl font-bold tracking-tight text-[#092d6b]">
              Gestión Humana
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Ingresa con tus credenciales corporativas
            </p>

            <form action={login} className="mt-8 space-y-5">
              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-semibold text-slate-700">
                  Correo electrónico
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="usuario@ei.com.co"
                  className="h-12 w-full rounded-lg border border-slate-300 bg-white px-4 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-[#00369C] focus:outline-none focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <div>
                <label htmlFor="password" className="mb-2 block text-sm font-semibold text-slate-700">
                  Contraseña
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  placeholder="Ingresa tu contraseña"
                  className="h-12 w-full rounded-lg border border-slate-300 bg-white px-4 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-[#00369C] focus:outline-none focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <ErrorMessage searchParams={searchParams} />

              <button
                type="submit"
                className="h-12 w-full rounded-lg bg-[#003b82] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#002e68] focus:outline-none focus:ring-4 focus:ring-blue-200"
              >
                Ingresar
              </button>
            </form>

            <p className="mt-8 text-xs leading-5 text-slate-400">
              © 2026 Electroingeniería S.A.S. · Uso interno
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}

// Componente que muestra error si viene ?error=xxx en la URL
async function ErrorMessage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const params = await searchParams
  if (!params.error) return null

  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-3">
      <p className="text-sm text-red-700">
        Credenciales incorrectas. Verifica tu correo y contraseña.
      </p>
    </div>
  )
}
