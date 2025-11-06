import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    const requestBody: GenerateLevelRequest = await req.json()

    // Validate required fields
    if (!requestBody.topic || !requestBody.difficulty || !requestBody.language) {
      throw new Error('Missing required fields: topic, difficulty, language')
    }

    const count = Math.min(requestBody.count || 1, 5) // Max 5 levels at once

    console.log('Generating levels:', {
      topic: requestBody.topic,
      difficulty: requestBody.difficulty,
      language: requestBody.language,
      count
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
      throw new Error(`Groq API error: ${groqResponse.status} ${groqResponse.statusText}`)
    }

    const groqData = await groqResponse.json()
    const generatedText = groqData.choices?.[0]?.message?.content

    if (!generatedText) {
      throw new Error('No response from AI model')
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
        levels = JSON.parse(jsonMatch[0])
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
    console.error('Edge function error:', error)

    return new Response(
      JSON.stringify({
        success: false,
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
