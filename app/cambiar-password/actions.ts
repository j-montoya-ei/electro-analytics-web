'use server'

import { redirect } from 'next/navigation'
import { createClient as createSupabaseJs } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Reglas acordadas: mínimo 6 caracteres (igual que Supabase), al menos una letra y un número
const MIN_LONGITUD = 6

function esValida(password: string) {
  return (
    password.length >= MIN_LONGITUD &&
    /[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(password) &&
    /\d/.test(password)
  )
}

function volver(error: string): never {
  redirect(`/cambiar-password?error=${error}`)
}

export async function cambiarPassword(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) redirect('/login')

  const actual = String(formData.get('actual') ?? '')
  const nueva = String(formData.get('nueva') ?? '')
  const confirmar = String(formData.get('confirmar') ?? '')

  if (!actual || !nueva || !confirmar) volver('campos')
  if (nueva !== confirmar) volver('no_coinciden')
  if (!esValida(nueva)) volver('debil')
  if (nueva === actual) volver('igual')

  // Verifica la contraseña actual con un cliente aparte que no toca las cookies
  const verificador = createSupabaseJs(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
  const { error: errorActual } = await verificador.auth.signInWithPassword({
    email: user.email,
    password: actual,
  })
  if (errorActual) volver('actual_incorrecta')
  await verificador.auth.signOut({ scope: 'local' })

  // Guarda la contraseña y quita la marca en una sola operación de confianza
  const admin = createAdminClient()
  const { error: errorUpdate } = await admin.auth.admin.updateUserById(user.id, {
    password: nueva,
    app_metadata: { must_change_password: false },
  })
  if (errorUpdate) {
    volver(errorUpdate.code === 'weak_password' ? 'debil' : 'error')
  }

  // Cierra todas las sesiones y obliga a entrar con la nueva contraseña
  await supabase.auth.signOut({ scope: 'global' })
  redirect('/login?mensaje=password_actualizada')
}
