import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const allowedOrigins = [
  'https://sarpedon.app',
  'https://www.sarpedon.app',
  'https://sarpedon.onrender.com', // Render deployment
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

const GROQ_API_URL = 'https://api.groq.com/openai/v1/models'
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/models'

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    })
  }

  try {
    // Authentication
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

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
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

    // Get request body
    const { provider, apiKey, model } = await req.json()

    if (!provider) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing provider'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // If no apiKey provided, try to get from database
    let finalApiKey = apiKey
    if (!finalApiKey) {
      const { data: settings, error: settingsError } = await supabase
        .from('teacher_settings')
        .select(provider === 'groq' ? 'groq_api_key' : 'openrouter_api_key')
        .eq('teacher_id', user.id)
        .single()

      if (settingsError) {
        console.error('Error fetching settings:', settingsError)
      } else if (settings) {
        finalApiKey = provider === 'groq' ? settings.groq_api_key : settings.openrouter_api_key
      }
    }

    // If still no apiKey, use environment variable
    if (!finalApiKey) {
      finalApiKey = provider === 'groq'
        ? Deno.env.get('GROQ_API_KEY')
        : Deno.env.get('OPENROUTER_API_KEY')
    }

    if (!finalApiKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `No API key found for ${provider}. Please provide an API key or set it in your settings.`
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Test connection based on provider
    let testUrl: string
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${finalApiKey}`,
      'Content-Type': 'application/json',
    }

    if (provider === 'groq') {
      testUrl = GROQ_API_URL
    } else if (provider === 'openrouter') {
      testUrl = OPENROUTER_API_URL
      headers['HTTP-Referer'] = 'https://sarpedon.app'
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Unknown provider: ${provider}`
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    console.log(`Testing connection to ${provider}...`)

    // Make test request to list models (lightweight endpoint)
    const testResponse = await fetch(testUrl, {
      method: 'GET',
      headers
    })

    console.log(`${provider} response status:`, testResponse.status)

    if (testResponse.ok) {
      // If model is provided, check if it exists
      if (model) {
        const data = await testResponse.json()
        const models = data.data || []
        const modelExists = models.some((m: any) => m.id === model)

        if (!modelExists) {
          return new Response(
            JSON.stringify({
              success: false,
              error: `Model '${model}' not found in ${provider}`
            }),
            {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          )
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          provider,
          message: `Successfully connected to ${provider}`
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    } else {
      const errorText = await testResponse.text()
      console.error(`${provider} error:`, errorText)

      return new Response(
        JSON.stringify({
          success: false,
          error: `Failed to connect to ${provider}: ${testResponse.status} ${testResponse.statusText}`
        }),
        {
          status: 200, // Return 200 so the client can handle the error gracefully
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

  } catch (error) {
    console.error('Test connection error:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
