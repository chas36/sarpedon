import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { checkRateLimit, RATE_LIMITS } from '../_shared/ratelimit.ts'

const allowedOrigins = [
  'https://sarpedon.app',
  'https://www.sarpedon.app',
  'https://sarpedon.onrender.com',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
]

const MAX_CODE_LENGTH = 100_000
const MAX_STDIN_LENGTH = 32_000
const RUN_TIMEOUT_MS = 3_000
const REQUEST_TIMEOUT_MS = 8_000

interface ExecuteRequest {
  language?: string
  code?: string
  stdin?: string
}

interface RunnerStage {
  stdout?: unknown
  stderr?: unknown
  code?: unknown
  wall_time?: unknown
}

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

function jsonResponse(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...getCorsHeaders(req),
      'Content-Type': 'application/json',
    },
  })
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse(req, { error: 'Method not allowed' }, 405)
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return jsonResponse(req, { error: 'Unauthorized' }, 401)
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    )

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return jsonResponse(req, { error: 'Unauthorized' }, 401)
    }

    // Run the shared limiter only after the JWT has been verified. Otherwise an
    // attacker could forge arbitrary JWT subjects to evade per-user limits.
    const rateLimitResponse = await checkRateLimit(req, RATE_LIMITS.NORMAL)
    if (rateLimitResponse) {
      return new Response(rateLimitResponse.body, {
        status: rateLimitResponse.status,
        headers: {
          ...corsHeaders,
          ...Object.fromEntries(rateLimitResponse.headers),
        },
      })
    }

    const body = await req.json() as ExecuteRequest
    const code = typeof body.code === 'string' ? body.code : ''
    const stdin = typeof body.stdin === 'string' ? body.stdin : ''

    if (body.language !== 'elementscript' || !code.trim()) {
      return jsonResponse(req, {
        error: 'Validation failed',
        message: 'language must be elementscript and code must not be empty',
      }, 400)
    }

    if (code.length > MAX_CODE_LENGTH || stdin.length > MAX_STDIN_LENGTH) {
      return jsonResponse(req, {
        error: 'Validation failed',
        message: 'Code or standard input is too large',
      }, 413)
    }

    const runnerUrl = Deno.env.get('ELEMENT_SCRIPT_RUNNER_URL')
    const runnerToken = Deno.env.get('ELEMENT_SCRIPT_RUNNER_TOKEN')
    if (!runnerUrl || !runnerToken) {
      console.error('Element Script runner is not configured')
      return jsonResponse(req, {
        error: 'Configuration error',
        message: 'Среда выполнения 1С:Элемент Скрипт пока не настроена',
      }, 503)
    }

    const runnerResponse = await fetch(runnerUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${runnerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        language: 'elementscript',
        version: Deno.env.get('ELEMENT_SCRIPT_VERSION') || '*',
        files: [{ name: 'main.sbsl', content: code }],
        stdin,
        args: [],
        run_timeout: RUN_TIMEOUT_MS,
        run_memory_limit: 256 * 1024 * 1024,
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })

    if (!runnerResponse.ok) {
      console.error('Element Script runner error:', runnerResponse.status)
      return jsonResponse(req, {
        error: 'Execution service error',
        message: 'Среда выполнения 1С:Элемент Скрипт временно недоступна',
      }, 502)
    }

    const runnerData = await runnerResponse.json() as { run?: RunnerStage }
    const run = runnerData.run
    if (!run || typeof run.code !== 'number') {
      console.error('Invalid Element Script runner response')
      return jsonResponse(req, {
        error: 'Execution service error',
        message: 'Среда выполнения вернула некорректный ответ',
      }, 502)
    }

    return jsonResponse(req, {
      success: run.code === 0,
      results: {
        stdout: typeof run.stdout === 'string' ? run.stdout : '',
        stderr: typeof run.stderr === 'string' ? run.stderr : '',
        exitCode: run.code,
        executionTime: typeof run.wall_time === 'number' ? run.wall_time : undefined,
      },
    })
  } catch (error) {
    console.error('Element Script execution failed:', error)
    const isTimeout = error instanceof DOMException && error.name === 'TimeoutError'
    return jsonResponse(req, {
      error: isTimeout ? 'Execution timeout' : 'Internal server error',
      message: isTimeout
        ? 'Превышено время ожидания среды выполнения'
        : 'Не удалось выполнить программу',
    }, isTimeout ? 504 : 500)
  }
})
