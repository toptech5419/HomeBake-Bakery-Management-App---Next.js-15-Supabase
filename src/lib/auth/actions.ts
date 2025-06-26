'use server'

import { createServer } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { canViewUsers, User } from './rbac'

export async function login(prevState: { error?: string }, formData: FormData) {
  const supabase = await createServer()
  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    return { error: error.message }
  }

  redirect('/dashboard')
}

export async function logout() {
  const supabase = await createServer()
  await supabase.auth.signOut()
  return redirect('/login')
}

export async function logoutWithoutRedirect() {
  const supabase = await createServer()
  const { error } = await supabase.auth.signOut()
  return { error }
}

export async function getUsers(currentUser: User) {
  if (!canViewUsers(currentUser)) throw new Error('Unauthorized')
  const supabase = await createServer()
  const { data, error } = await supabase.from('users').select('*')
  if (error) throw error
  return data
} 