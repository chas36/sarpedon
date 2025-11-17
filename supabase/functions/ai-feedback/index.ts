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

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    })
  }

  try {
    // ============================================
    // SECURITY FIX: Authentication (all users)
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

    // Verify user (любой authenticated user может использовать AI feedback)
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

    // Log usage for monitoring
    console.log('AI feedback request from user:', user.id)

    // ============================================
    // AI Feedback Logic
    // ============================================

    // Get Groq API key from environment
    const groqApiKey = Deno.env.get('GROQ_API_KEY')
    if (!groqApiKey) {
      console.error('GROQ_API_KEY is not set')
      return new Response(
        JSON.stringify({
          error: 'Configuration error',
          message: 'AI service is not configured'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Get request body
    const requestBody = await req.json()

    // Validate required fields
    if (!requestBody.model || !requestBody.messages) {
      return new Response(
        JSON.stringify({
          error: 'Validation failed',
          message: 'Missing required fields: model, messages'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    console.log('Proxying request to Groq API:', {
      model: requestBody.model,
      messagesCount: requestBody.messages?.length,
      userId: user.id
    })

    // Forward request to Groq API
    const groqResponse = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    })

    console.log('Groq API response status:', groqResponse.status)

    if (!groqResponse.ok) {
      const errorData = await groqResponse.text()
      console.error('Groq API error:', errorData)

      // Don't leak Groq API details to client
      return new Response(
        JSON.stringify({
          error: 'AI service error',
          message: 'Failed to get AI feedback. Please try again.'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Get response from Groq
    const groqData = await groqResponse.json()

    // Return response to client
    return new Response(
      JSON.stringify(groqData),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 200,
      }
    )

  } catch (error) {
    // SECURITY FIX: Don't leak internal error details
    console.error('Internal error:', error)

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: 'Failed to process AI feedback. Please try again.'
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 500,
      }
    )
  }
})
