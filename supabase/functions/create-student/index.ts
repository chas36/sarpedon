import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { checkRateLimit, RATE_LIMITS } from '../_shared/ratelimit.ts'

// ============================================
// SECURITY FIX: Proper CORS configuration
// ============================================
const allowedOrigins = [
  'https://sarpedon.app',
  'https://www.sarpedon.app',
  // Development origins (remove in production)
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
]

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') || ''
  return {
    'Access-Control-Allow-Origin': allowedOrigins.includes(origin)
      ? origin
      : allowedOrigins[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  }
}

// ============================================
// Generate secure random password
// ============================================
function generateSecurePassword(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const length = 12
  let password = ''
  const randomValues = new Uint8Array(length)
  crypto.getRandomValues(randomValues)

  for (let i = 0; i < length; i++) {
    password += chars[randomValues[i] % chars.length]
  }

  return password
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // ============================================
  // SECURITY FIX: Rate Limiting (CRITICAL-006)
  // ============================================
  // Creating students is expensive - strict limit (5 per minute)
  const rateLimitResponse = await checkRateLimit(req, RATE_LIMITS.STRICT)
  if (rateLimitResponse) {
    return new Response(rateLimitResponse.body, {
      status: rateLimitResponse.status,
      headers: { ...corsHeaders, ...Object.fromEntries(rateLimitResponse.headers) },
    })
  }

  try {
    // ============================================
    // SECURITY FIX: Authentication & Authorization
    // ============================================

    // Check Authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({
          error: 'Unauthorized',
          message: 'Missing authorization header'
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Create Supabase client with user token
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    // Verify user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      console.error('Auth error:', userError)
      return new Response(
        JSON.stringify({
          error: 'Unauthorized',
          message: 'Invalid or expired token'
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Check user role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      console.error('Profile fetch error:', profileError)
      return new Response(
        JSON.stringify({
          error: 'Forbidden',
          message: 'User profile not found'
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Only teachers and editors can create students
    if (!['teacher', 'editor'].includes(profile.role)) {
      return new Response(
        JSON.stringify({
          error: 'Forbidden',
          message: 'Only teachers and editors can create students'
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // ============================================
    // Create Student Logic
    // ============================================

    // Create Supabase Admin client for user creation
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get request body
    const { firstName, lastName, className, login, password } = await req.json()

    // Validate input
    if (!firstName || !lastName || !className || !login) {
      return new Response(
        JSON.stringify({
          error: 'Validation failed',
          message: 'Missing required fields: firstName, lastName, className, login'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const { data: ownedClass, error: ownedClassError } = await supabase
      .from('classes')
      .select('id')
      .eq('name', className)
      .eq('created_by', user.id)
      .maybeSingle()

    if (ownedClassError) {
      console.error('Class ownership check error:', ownedClassError)
      throw new Error('Failed to verify class access')
    }

    if (!ownedClass) {
      return new Response(
        JSON.stringify({
          error: 'Forbidden',
          message: 'You can only create students in your own classes'
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // SECURITY: Generate secure password if not provided
    const generatedPassword = password || generateSecurePassword()

    // Create unique email (timestamp-based for uniqueness)
    // Users login with generated_login, email is only for Supabase Auth
    const email = `student${Date.now()}@test.edu`

    // Create user with Admin API (bypasses email confirmation)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: generatedPassword,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        is_student: true,
        login: login,
      },
    })

    if (authError) {
      console.error('Auth creation error:', authError)
      throw new Error('Failed to create user account')
    }
    if (!authData.user) throw new Error('Failed to create user')

    // SECURITY FIX: Don't store plaintext password in database!
    // Create profile WITHOUT generated_password field
    const { data: profileData, error: profileInsertError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authData.user.id,
        first_name: firstName,
        last_name: lastName,
        full_name: `${firstName} ${lastName}`,
        role: 'student',
        class: className,
        generated_login: login,
        email: email,
      })
      .select()
      .single()

    if (profileInsertError) {
      console.error('Profile creation error:', profileInsertError)
      // Rollback: delete auth user if profile creation failed
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      throw new Error('Failed to create student profile')
    }

    // Return success with password (ONLY this one time!)
    // Password should be displayed to teacher immediately and not stored
    return new Response(
      JSON.stringify({
        success: true,
        student: {
          ...profileData,
          // Return password only in response, never stored in DB
          temporaryPassword: generatedPassword,
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    // SECURITY FIX: Don't leak internal error details
    console.error('Internal error:', error)

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: 'Failed to create student. Please try again.'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})
