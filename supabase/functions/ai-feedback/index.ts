import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { checkRateLimit, RATE_LIMITS } from '../_shared/ratelimit.ts'

// ============================================
// SECURITY FIX: Proper CORS configuration
// ============================================
const allowedOrigins = [
  'https://sarpedon.app',
  'https://www.sarpedon.app',
  'https://sarpedon.onrender.com', // Render deployment
  // Development origins
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
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    })
  }

  // ============================================
  // SECURITY FIX: Rate Limiting (CRITICAL-006)
  // ============================================
  // AI feedback uses Groq API (expensive) - strict limit (5 per minute)
  const rateLimitResponse = await checkRateLimit(req, RATE_LIMITS.STRICT)
  if (rateLimitResponse) {
    return new Response(rateLimitResponse.body, {
      status: rateLimitResponse.status,
      headers: { ...corsHeaders, ...Object.fromEntries(rateLimitResponse.headers) },
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
    // AI Feedback Logic - Multi-Provider Support
    // ============================================

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

    // Get provider (default to groq for backwards compatibility)
    const provider = requestBody.provider || 'groq'

    // Get API key - either from request body (teacher custom key) or environment
    let apiKey: string | undefined
    let apiUrl: string

    if (provider === 'groq') {
      apiKey = requestBody.apiKey || Deno.env.get('GROQ_API_KEY')
      apiUrl = GROQ_API_URL
    } else if (provider === 'openrouter') {
      apiKey = requestBody.apiKey || Deno.env.get('OPENROUTER_API_KEY')
      apiUrl = OPENROUTER_API_URL
    } else {
      return new Response(
        JSON.stringify({
          error: 'Invalid provider',
          message: `Provider '${provider}' is not supported. Use 'groq' or 'openrouter'.`
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    if (!apiKey) {
      console.error(`${provider.toUpperCase()}_API_KEY is not set`)
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

    console.log(`Proxying request to ${provider.toUpperCase()} API:`, {
      provider,
      model: requestBody.model,
      messagesCount: requestBody.messages?.length,
      userId: user.id
    })

    // Prepare request payload (remove provider and apiKey fields)
    const { provider: _, apiKey: __, ...aiRequestBody } = requestBody

    // Add OpenRouter-specific headers if using OpenRouter
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    }

    if (provider === 'openrouter') {
      headers['HTTP-Referer'] = 'https://sarpedon.app' // Required by OpenRouter
      headers['X-Title'] = 'Sarpedon Learning Platform' // Optional, for OpenRouter analytics
    }

    // Forward request to AI provider
    const aiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(aiRequestBody)
    })

    console.log(`${provider.toUpperCase()} API response status:`, aiResponse.status)

    if (!aiResponse.ok) {
      const errorData = await aiResponse.text()
      console.error(`${provider.toUpperCase()} API error:`, errorData)

      // Don't leak API details to client
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

    // Get response from AI provider
    const aiData = await aiResponse.json()

    // Return response to client
    return new Response(
      JSON.stringify(aiData),
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
