import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { cambiarPassword } from './actions'

const MENSAJES: Record<string, string> = {
  campos: 'Completa todos los campos.',
  no_coinciden: 'La nueva contraseña y su confirmación no coinciden.',
  debil: 'La contraseña debe tener mínimo 10 caracteres, con letras y números.',
  igual: 'La nueva contraseña debe ser distinta de la actual.',
  actual_incorrecta: 'La contraseña actual no es correcta.',
  error: 'No se pudo cambiar la contraseña. Intenta nuevamente.',
}

const inputClass =
  'h-12 w-full rounded-lg border border-slate-300 bg-white px-4 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-[#00369C] focus:outline-none focus:ring-4 focus:ring-blue-100'

export default async function CambiarPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await searchParams
  const mensaje = error ? (MENSAJES[error] ?? MENSAJES.error) : null

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4f6fa] p-4 sm:p-8">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-[0_24px_70px_rgba(15,35,75,0.14)] sm:p-10">
        <h1 className="text-2xl font-bold tracking-tight text-[#092d6b]">
          Cambia tu contraseña
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Por seguridad debes definir una contraseña nueva antes de continuar.
          Luego ingresarás de nuevo con ella.
        </p>
        <p className="mt-1 text-xs text-slate-400">{user.email}</p>

        <form action={cambiarPassword} className="mt-8 space-y-5">
          <div>
            <label htmlFor="actual" className="mb-2 block text-sm font-semibold text-slate-700">
              Contraseña actual (la asignada)
            </label>
            <input id="actual" name="actual" type="password" required autoComplete="current-password" className={inputClass} />
          </div>

          <div>
            <label htmlFor="nueva" className="mb-2 block text-sm font-semibold text-slate-700">
              Nueva contraseña
            </label>
            <input id="nueva" name="nueva" type="password" required minLength={10} autoComplete="new-password" className={inputClass} />
            <p className="mt-1 text-xs text-slate-500">Mínimo 10 caracteres, con letras y números.</p>
          </div>

          <div>
            <label htmlFor="confirmar" className="mb-2 block text-sm font-semibold text-slate-700">
              Confirmar nueva contraseña
            </label>
            <input id="confirmar" name="confirmar" type="password" required minLength={10} autoComplete="new-password" className={inputClass} />
          </div>

          {mensaje && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3">
              <p className="text-sm text-red-700">{mensaje}</p>
            </div>
          )}

          <button
            type="submit"
            className="h-12 w-full rounded-lg bg-[#003b82] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#002e68] focus:outline-none focus:ring-4 focus:ring-blue-200"
          >
            Guardar y volver a ingresar
          </button>
        </form>
      </div>
    </main>
  )
}
