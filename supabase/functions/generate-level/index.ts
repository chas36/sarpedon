import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { checkRateLimit, RATE_LIMITS } from '../_shared/ratelimit.ts'

// ============================================
// SECURITY FIX: Proper CORS configuration
// ============================================
const allowedOrigins = [
  'https://sarpedon.app',
  'https://www.sarpedon.app',
  'https://sarpedon.onrender.com',
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

interface GenerateLevelRequest {
  topic: string
  difficulty: 'easy' | 'medium' | 'hard'
  language: string
  count: number
  additionalContext?: string
}

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
  // Generating levels uses Groq API (expensive) - strict limit (5 per minute)
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

    // Check user role - only teachers and editors can generate levels
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

    // Only teachers and editors can generate levels
    if (!['teacher', 'editor'].includes(profile.role)) {
      return new Response(
        JSON.stringify({
          error: 'Forbidden',
          message: 'Only teachers and editors can generate levels'
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Log usage for monitoring
    console.log('Generate level request from user:', user.id, profile.role)

    // ============================================
    // Level Generation Logic
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
    const requestBody: GenerateLevelRequest = await req.json()

    // Validate required fields
    if (!requestBody.topic || !requestBody.difficulty || !requestBody.language) {
      return new Response(
        JSON.stringify({
          error: 'Validation failed',
          message: 'Missing required fields: topic, difficulty, language'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const count = Math.min(requestBody.count || 1, 5) // Max 5 levels at once

    console.log('Generating levels:', {
      topic: requestBody.topic,
      difficulty: requestBody.difficulty,
      language: requestBody.language,
      count,
      userId: user.id
    })

    // Create prompt for level generation
    const prompt = createLevelGenerationPrompt(requestBody, count)

    // Call Groq API
    const groqResponse = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          {
            role: 'system',
            content: 'You are an expert programming educator. You create engaging, educational programming challenges for students aged 10-16.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: 2000,
        top_p: 0.95
      })
    })

    console.log('Groq API response status:', groqResponse.status)

    if (!groqResponse.ok) {
      const errorData = await groqResponse.text()
      console.error('Groq API error:', errorData)

      // Don't leak Groq API details to client
      return new Response(
        JSON.stringify({
          error: 'AI service error',
          message: 'Failed to generate levels. Please try again.'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const groqData = await groqResponse.json()
    const generatedText = groqData.choices?.[0]?.message?.content

    if (!generatedText) {
      return new Response(
        JSON.stringify({
          error: 'AI service error',
          message: 'No response from AI model'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    console.log('Generated text:', generatedText)

    // Parse the generated levels from JSON
    let levels
    try {
      levels = JSON.parse(generatedText)
    } catch (parseError) {
      // If JSON parsing fails, try to extract JSON from the text
      const jsonMatch = generatedText.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        try {
          levels = JSON.parse(jsonMatch[0])
        } catch {
          throw new Error('Failed to parse generated levels as JSON')
        }
      } else {
        throw new Error('Failed to parse generated levels as JSON')
      }
    }

    // Return generated levels
    return new Response(
      JSON.stringify({
        success: true,
        levels: Array.isArray(levels) ? levels : [levels]
      }),
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
        message: 'Failed to generate levels. Please try again.'
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

function createLevelGenerationPrompt(request: GenerateLevelRequest, count: number): string {
  const difficultyDescriptions = {
    easy: 'простые задачи для начинающих (базовый синтаксис, простые операции)',
    medium: 'средние задачи (циклы, условия, функции)',
    hard: 'сложные задачи (алгоритмы, структуры данных, оптимизация)'
  }

  return `Создай ${count} программистских ${count === 1 ? 'задание' : 'заданий'} на тему "${request.topic}" на языке ${request.language}.

Уровень сложности: ${request.difficulty} (${difficultyDescriptions[request.difficulty]})

${request.additionalContext ? `Дополнительный контекст: ${request.additionalContext}` : ''}

Требования к каждому заданию:
1. Название должно быть привлекательным для детей 10-16 лет
2. Описание должно объяснять задачу простым языком
3. Должно быть минимум 3 тестовых случая (с входными данными и ожидаемым выводом)
4. Должно быть 2-3 подсказки (не давать готовое решение!)
5. Эталонное решение на ${request.language}
6. Список целевых навыков (2-4 навыка)

Верни ТОЛЬКО валидный JSON массив без дополнительного текста. Формат:

[
  {
    "title": "Название задания",
    "description": "Подробное описание задачи. Объясни что нужно сделать, какие входные данные будут, какой результат ожидается.",
    "difficulty": "${request.difficulty}",
    "language": "${request.language}",
    "test_cases": [
      {
        "input": "входные данные (или пустая строка)",
        "output": "ожидаемый вывод",
        "description": "описание теста"
      }
    ],
    "hints": [
      "Подсказка 1",
      "Подсказка 2",
      "Подсказка 3"
    ],
    "reference_solution": "код эталонного решения",
    "target_skills": ["навык 1", "навык 2"]
  }
]

ВАЖНО:
- Используй русский язык для названия, описания и подсказок
- Код должен быть на ${request.language}
- Тестовые случаи должны покрывать базовые и граничные случаи
- Подсказки должны направлять, но не давать готовое решение`
}
