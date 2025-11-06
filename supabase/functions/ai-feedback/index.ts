import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    })
  }

  try {
    // Get Groq API key from environment
    const groqApiKey = Deno.env.get('GROQ_API_KEY')
    if (!groqApiKey) {
      throw new Error('GROQ_API_KEY is not set in environment variables')
    }

    // Get request body
    const requestBody = await req.json()

    // Validate required fields
    if (!requestBody.model || !requestBody.messages) {
      throw new Error('Missing required fields: model, messages')
    }

    console.log('Proxying request to Groq API:', {
      model: requestBody.model,
      messagesCount: requestBody.messages?.length,
      hasApiKey: !!groqApiKey
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
      throw new Error(`Groq API error: ${groqResponse.status} ${groqResponse.statusText}`)
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
    console.error('Edge function error:', error)

    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
        details: error.toString()
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
