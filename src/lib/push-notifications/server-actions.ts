'use server'

import { createServer } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface PushNotificationPreference {
  id: string
  user_id: string
  enabled: boolean
  endpoint: string | null
  p256dh_key: string | null
  auth_key: string | null
  user_agent: string | null
  created_at: string
  updated_at: string
}

export async function getUserPushPreferences(userId?: string): Promise<PushNotificationPreference | null> {
  const supabase = await createServer()
  
  let finalUserId = userId
  if (!finalUserId) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    finalUserId = user.id
  }

  const { data, error } = await supabase
    .from('push_notification_preferences')
    .select('*')
    .eq('user_id', finalUserId)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching push preferences:', error)
    return null
  }

  return data
}

export async function createDefaultPushPreferences(userId?: string): Promise<PushNotificationPreference | null> {
  const supabase = await createServer()
  
  let finalUserId = userId
  if (!finalUserId) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('No authenticated user found')
    }
    finalUserId = user.id
  }

  const { data, error } = await supabase
    .from('push_notification_preferences')
    .insert({
      user_id: finalUserId,
      enabled: true,
      endpoint: null,
      p256dh_key: null,
      auth_key: null,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating push preferences:', error)
    throw error
  }

  revalidatePath('/dashboard')
  return data
}

export async function updatePushPreferences(
  preferences: {
    enabled?: boolean
    endpoint?: string | null
    p256dh_key?: string | null
    auth_key?: string | null
    user_agent?: string | null
  },
  userId?: string
): Promise<PushNotificationPreference | null> {
  const supabase = await createServer()
  
  let finalUserId = userId
  if (!finalUserId) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('No authenticated user found')
    }
    finalUserId = user.id
  }

  const updateData: any = {
    ...preferences,
    updated_at: new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('push_notification_preferences')
    .upsert(
      {
        user_id: finalUserId,
        ...updateData
      },
      {
        onConflict: 'user_id'
      }
    )
    .select()
    .single()

  if (error) {
    console.error('Error updating push preferences:', error)
    throw error
  }

  revalidatePath('/dashboard')
  return data
}

export async function deletePushPreferences(userId?: string): Promise<void> {
  const supabase = await createServer()
  
  let finalUserId = userId
  if (!finalUserId) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('No authenticated user found')
    }
    finalUserId = user.id
  }

  const { error } = await supabase
    .from('push_notification_preferences')
    .delete()
    .eq('user_id', finalUserId)

  if (error) {
    console.error('Error deleting push preferences:', error)
    throw error
  }

  revalidatePath('/dashboard')
}