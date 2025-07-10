import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with the Auth context of the logged in user.
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Get the user from the request
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    
    if (userError || !user) {
      throw new Error('User not authenticated')
    }

    // Check if profile already exists
    const { data: existingProfile } = await supabaseClient
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single()

    if (existingProfile) {
      return new Response(
        JSON.stringify({ message: 'Profile already exists' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create profile
    const { error: profileError } = await supabaseClient
      .from('profiles')
      .insert({
        id: user.id,
        name: user.user_metadata?.name || user.email,
        role: user.user_metadata?.role || 'sales_rep',
        is_active: true,
      })

    if (profileError) {
      throw new Error(`Failed to create profile: ${profileError.message}`)
    }

    // Create user entry
    const { error: userError2 } = await supabaseClient
      .from('users')
      .insert({
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name || user.email,
        role: user.user_metadata?.role || 'sales_rep',
        is_active: true,
      })

    if (userError2) {
      console.warn('Failed to create user entry:', userError2)
    }

    return new Response(
      JSON.stringify({ message: 'Profile created successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}) 