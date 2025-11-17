import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
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

    // Only teachers can delete students
    if (profile.role !== 'teacher') {
      return new Response(
        JSON.stringify({
          error: 'Forbidden',
          message: 'Only teachers can delete students'
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // ============================================
    // Delete Student Logic
    // ============================================

    // Create Supabase Admin client for deletion
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
    const { studentId } = await req.json()

    // Validate input
    if (!studentId) {
      return new Response(
        JSON.stringify({
          error: 'Validation failed',
          message: 'Missing required field: studentId'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // SECURITY: Verify the student exists and is actually a student
    const { data: studentProfile, error: studentCheckError } = await supabaseAdmin
      .from('profiles')
      .select('id, role')
      .eq('id', studentId)
      .single()

    if (studentCheckError || !studentProfile) {
      return new Response(
        JSON.stringify({
          error: 'Not found',
          message: 'Student not found'
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Prevent deletion of non-students (teachers, editors)
    if (studentProfile.role !== 'student') {
      return new Response(
        JSON.stringify({
          error: 'Forbidden',
          message: 'Cannot delete non-student users'
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Delete auth user (cascade will delete profile via FK)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(studentId)

    if (deleteError) {
      console.error('Delete error:', deleteError)
      throw new Error('Failed to delete student')
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Student deleted successfully'
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
        message: 'Failed to delete student. Please try again.'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})
