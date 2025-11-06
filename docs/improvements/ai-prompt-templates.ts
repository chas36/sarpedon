/**
 * AI Prompt Templates for Sarpedon Educational Platform
 *
 * This file contains TypeScript template functions for generating
 * adaptive AI prompts based on student proficiency level.
 *
 * Usage in Supabase Edge Functions:
 * import { buildValidationPrompt, buildQualityPrompt } from './ai-prompt-templates.ts';
 */

// =============================================================================
// TYPES
// =============================================================================

export type ProficiencyLevel = 'beginner' | 'intermediate' | 'advanced';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type Language = 'python' | 'javascript' | 'typescript' | 'cpp' | 'rust' | 'go' | 'java';

export interface StudentContext {
  proficiencyLevel: ProficiencyLevel;
  proficiencyScore: number;
  weakAreas: string[];
  commonMistakes: string[];
  errorPatterns: string[];
}

export interface LevelContext {
  difficulty: Difficulty;
  topic: string;
  targetSkills: string[];
}

export interface TestCase {
  input: string;
  output: string;
}

export interface ValidationPromptParams {
  language: Language;
  referenceSolution: string;
  userCode: string;
  testCases: TestCase[];
  studentContext: StudentContext;
  levelContext: LevelContext;
}

export interface QualityPromptParams {
  language: Language;
  referenceSolution: string;
  studentCode: string;
  studentContext: StudentContext;
  levelContext: LevelContext;
}

export interface LineError {
  line: number;
  issue: string;
}

export interface ValidationResponse {
  isCorrect: boolean;
  feedback: string;
  failedTests: number[];
  specificHints?: {
    lineErrors?: LineError[];
    variableNameIssues?: string[];
    syntaxFixes?: string[];
  };
}

export interface CodeIssue {
  category: string;
  severity: 'low' | 'medium' | 'high';
  line: number | null;
  description: string;
  suggestion: string;
  isWeakAreaRelated: boolean;
}

export interface QualityResponse {
  score: number;
  issues: CodeIssue[];
  patterns: string[];
  strengths: string[];
  summary: string;
  comparedToReference: {
    approach: 'similar' | 'more_complex' | 'more_elegant' | 'different';
    notes: string;
  };
  remedialSuggestions: string[];
}

// =============================================================================
// VALIDATION PROMPT BUILDER
// =============================================================================

export function buildValidationPrompt(params: ValidationPromptParams): string {
  const {
    language,
    referenceSolution,
    userCode,
    testCases,
    studentContext,
    levelContext,
  } = params;

  const testCasesText = testCases
    .map((tc, i) => `Test ${i + 1}: Input: ${tc.input}, Expected: ${tc.output}`)
    .join('\n');

  const weakAreasText = studentContext.weakAreas.length > 0
    ? studentContext.weakAreas.join(', ')
    : 'None identified yet';

  const commonMistakesText = studentContext.commonMistakes.length > 0
    ? studentContext.commonMistakes.join(', ')
    : 'None';

  const feedbackStyleGuide = getFeedbackStyleGuide(studentContext.proficiencyLevel);

  return `You are a ${language} code validator for an educational platform.
You are analyzing code from a **${studentContext.proficiencyLevel}** level student.

**Student Context:**
- Proficiency Level: ${studentContext.proficiencyLevel} (${studentContext.proficiencyScore}/100)
- Weak Areas: ${weakAreasText}
- Previous Common Mistakes: ${commonMistakesText}
- Assignment Difficulty: ${levelContext.difficulty}

**Task:** Compare the student's code with the reference solution.

**Reference Solution:**
\`\`\`${language}
${referenceSolution}
\`\`\`

**Student's Code:**
\`\`\`${language}
${userCode}
\`\`\`

**Test Cases:**
${testCasesText}

---

**Instructions:**

1. **Pre-validation:**
   - If code is less than 10 characters OR contains only comments/whitespace
     → Return: {"isCorrect": false, "feedback": "Пожалуйста, напишите решение задачи"}
   - If code doesn't contain any control structures/functions relevant to task
     → Return: {"isCorrect": false, "feedback": "Код не содержит решения задачи"}

2. **Functional Analysis:**
   - Compare logic with reference solution
   - Check if code produces correct outputs for all test cases
   - Identify logic errors, syntax issues, edge case handling

3. **Adaptive Feedback Style:**

${feedbackStyleGuide}

4. **Context Awareness:**
   - If student has weak areas in ${weakAreasText}, pay special attention to those aspects
   - Reference their common mistakes: "${commonMistakesText}"
   - For difficult assignments, be more lenient with minor issues
   - For easy assignments at advanced level, expect cleaner code

5. **Consistency:**
   - Always use the SAME evaluation logic for the SAME code
   - Base correctness ONLY on: reference solution equivalence + test case results
   - Don't let proficiency level affect WHETHER code is correct, only HOW you explain it

**Response Format (JSON):**
{
  "isCorrect": boolean,
  "feedback": "Educational explanation tailored to student level...",
  "failedTests": [array of failed test indices],
  ${studentContext.proficiencyLevel === 'beginner' ? `"specificHints": {
    "lineErrors": [{"line": number, "issue": "description"}],
    "variableNameIssues": ["старое_имя → правильное_имя"],
    "syntaxFixes": ["что исправить"]
  }` : '// specificHints only for beginners'}
}

**Tone Guidelines:**
- Beginner: Very encouraging, patient, detailed
- Intermediate: Supportive, educational, balanced
- Advanced: Professional, concise, challenging

IMPORTANT:
- NEVER give different correctness results for the same code from different students
- Proficiency level affects ONLY the feedback style, NOT the correctness judgment
- Be strict about minimum code quality (reject trivial/empty submissions)`;
}

// =============================================================================
// QUALITY ANALYSIS PROMPT BUILDER
// =============================================================================

export function buildQualityPrompt(params: QualityPromptParams): string {
  const {
    language,
    referenceSolution,
    studentCode,
    studentContext,
    levelContext,
  } = params;

  const weakAreasText = studentContext.weakAreas.length > 0
    ? studentContext.weakAreas.join(', ')
    : 'None';

  const errorPatternsText = studentContext.errorPatterns.length > 0
    ? studentContext.errorPatterns.join(', ')
    : 'None';

  const evaluationCriteria = getEvaluationCriteria(studentContext.proficiencyLevel);
  const scoringGuide = getScoringGuide(studentContext.proficiencyLevel);
  const severityGuide = getSeverityGuide(studentContext.proficiencyLevel);

  return `You are a ${language} code quality analyzer for an educational platform.
You are reviewing code from a **${studentContext.proficiencyLevel}** level student.

**Student Context:**
- Proficiency Level: ${studentContext.proficiencyLevel} (${studentContext.proficiencyScore}/100)
- Assignment Difficulty: ${levelContext.difficulty}
- Weak Areas: ${weakAreasText}
- Student's repeated patterns: ${errorPatternsText}

**Reference Solution (for comparison):**
\`\`\`${language}
${referenceSolution}
\`\`\`

**Student's Code:**
\`\`\`${language}
${studentCode}
\`\`\`

---

**Evaluation Criteria (adapted by level):**

${evaluationCriteria}

---

**Scoring Guidelines (adaptive):**

${scoringGuide}

**Difficulty Adjustment:**
- Easy task at Beginner level: Expect 70+ scores
- Hard task at Beginner level: Accept 50+ scores as reasonable
- Easy task at Advanced level: Expect 85+ scores
- Hard task at Advanced level: Accept 70+ scores

---

**Issue Severity Guidelines:**

${severityGuide}

---

**Comparison with Reference:**
1. Compare code structure with reference solution
2. Note if student's approach is:
   - More complex than needed (suggest simplification)
   - More elegant (acknowledge!)
   - Different but valid (explain trade-offs)
3. Don't penalize creative solutions that work

**Focus on Student's Weak Areas:**
- If weak areas include 'naming': Be extra thorough on naming review
- If weak areas include 'complexity': Focus on nesting/function size
- Provide specific remedial suggestions for weak areas

**Response Format (JSON):**
{
  "score": 0-100,
  "issues": [
    {
      "category": "naming|complexity|error_handling|nesting_depth|magic_numbers|patterns|...",
      "severity": "low|medium|high",
      "line": number_or_null,
      "description": "What's wrong (adapted to student level)",
      "suggestion": "How to improve (specific for beginners, conceptual for advanced)",
      "isWeakAreaRelated": boolean
    }
  ],
  "patterns": ["poor_naming", "deep_nesting", ...],
  "strengths": ["clean_structure", "good_naming", ...],
  "summary": "Brief assessment tailored to proficiency level",
  "comparedToReference": {
    "approach": "similar|more_complex|more_elegant|different",
    "notes": "How student's solution compares"
  },
  "remedialSuggestions": [
    "Practice: naming variables descriptively",
    "Study: list comprehensions in Python"
  ]
}

**Consistency Rules:**
1. SAME code should get SAME score regardless of student
2. Proficiency level affects:
   - Which criteria to emphasize (basics vs architecture)
   - Explanation depth in issues
   - Severity thresholds
3. Difficulty affects:
   - Score expectations
   - Leniency on minor issues
4. Use reference solution as quality baseline

**Tone:**
- Beginner: Very detailed explanations, encouraging
- Intermediate: Balanced, educational
- Advanced: Concise, professional, challenging`;
}

// =============================================================================
// HELPER FUNCTIONS - FEEDBACK STYLE GUIDES
// =============================================================================

function getFeedbackStyleGuide(level: ProficiencyLevel): string {
  switch (level) {
    case 'beginner':
      return `   **For BEGINNER students:**
   - Use simple, encouraging language
   - Point to SPECIFIC lines with errors: "На строке 3 в функции print() пропущена закрывающая скобка"
   - Explain WHY it's wrong: "Переменная 'rezult' не совпадает с 'result' - в Python имена должны точно совпадать"
   - Provide step-by-step hints
   - Focus on ONE main issue at a time
   - Examples:
     * "Проверьте название переменной на строке 5"
     * "Вы забыли двоеточие после 'if' на строке 2"
     * "Функция должна ВОЗВРАЩАТЬ значение (return), а не печатать его (print)"`;

    case 'intermediate':
      return `   **For INTERMEDIATE students:**
   - Moderate detail, focus on logic
   - Mention problematic sections without exact lines
   - Explain concepts: "Ваш цикл не обрабатывает крайний случай пустого списка"
   - Suggest 2-3 areas to review
   - Examples:
     * "Проверьте логику условия - оно не учитывает отрицательные числа"
     * "Цикл while может привести к бесконечной итерации"
     * "Рассмотрите использование встроенной функции вместо ручной итерации"`;

    case 'advanced':
      return `   **For ADVANCED students:**
   - High-level conceptual feedback
   - No line numbers, focus on architecture
   - Discuss algorithm efficiency, patterns
   - Challenge to find edge cases themselves
   - Examples:
     * "Алгоритм работает, но имеет сложность O(n²) - можно оптимизировать до O(n)"
     * "Решение корректно, но не обрабатывает Unicode символы"
     * "Рассмотрите функциональный подход вместо императивного"`;
  }
}

function getEvaluationCriteria(level: ProficiencyLevel): string {
  switch (level) {
    case 'beginner':
      return `### BEGINNER - Focus on Basics
1. **Syntax & Basic Naming** (30%)
   - Variables have descriptive names (not 'x', 'temp', 'a')
   - Functions are named with verbs
   - No Russian transliteration (bad: 'summa', good: 'sum')

2. **Code Structure** (25%)
   - Proper indentation
   - Reasonable line length (< 100 chars)
   - No repeated code blocks

3. **Basic Correctness** (25%)
   - No unused variables
   - All functions are used
   - No obvious logic errors

4. **Comments (if present)** (20%)
   - Comments explain WHY, not WHAT
   - No commented-out code left behind`;

    case 'intermediate':
      return `### INTERMEDIATE - Add Complexity & Patterns
1. **Naming & Clarity** (25%)
   - Consistent naming convention (camelCase/snake_case)
   - Magic numbers extracted to constants
   - Boolean variables named clearly (is*, has*, can*)

2. **Function Design** (25%)
   - Functions < 50 lines
   - Single responsibility principle
   - Reasonable parameter count (< 5)

3. **Error Handling** (20%)
   - Edge cases considered
   - Input validation present
   - Errors not silently swallowed

4. **Code Patterns** (15%)
   - No deep nesting (max 3 levels)
   - DRY principle followed
   - Appropriate use of language features

5. **Dependencies** (15%)
   - No global state mutation
   - Clear data flow
   - Minimal side effects`;

    case 'advanced':
      return `### ADVANCED - Architecture & Efficiency
1. **Design Patterns** (20%)
   - Appropriate abstractions
   - SOLID principles followed
   - Clean architecture

2. **Performance** (20%)
   - Algorithm complexity considered
   - No unnecessary iterations
   - Memory usage optimized

3. **Maintainability** (20%)
   - Self-documenting code
   - Testable structure
   - Future-proof design

4. **Language Mastery** (20%)
   - Idiomatic patterns
   - Advanced features used appropriately
   - Standard library leveraged

5. **Production Readiness** (20%)
   - Comprehensive error handling
   - Edge cases covered
   - Security considerations`;
  }
}

function getScoringGuide(level: ProficiencyLevel): string {
  switch (level) {
    case 'beginner':
      return `**For BEGINNER:**
- 90-100: Excellent - Clean syntax, good names, no basic errors
- 75-89: Good - Minor naming issues or small repeated blocks
- 60-74: Acceptable - Works but has several naming/structure issues
- 40-59: Needs Work - Many basic errors (naming, unused vars, poor indentation)
- 0-39: Poor - Severe syntax issues, no structure, unintelligible names`;

    case 'intermediate':
      return `**For INTERMEDIATE:**
- 90-100: Excellent - Clean patterns, good error handling, DRY
- 75-89: Good - Solid structure with minor pattern violations
- 60-74: Acceptable - Works but has some repeated code or deep nesting
- 40-59: Needs Work - Poor function design or missing error handling
- 0-39: Poor - No patterns, deeply nested, magic numbers everywhere`;

    case 'advanced':
      return `**For ADVANCED:**
- 90-100: Excellent - Production-ready, optimal complexity, clean architecture
- 75-89: Good - Solid design with minor optimization opportunities
- 60-74: Acceptable - Works but suboptimal complexity or missing abstractions
- 40-59: Needs Work - Poor architecture or inefficient algorithms
- 0-39: Poor - Unmaintainable or severely inefficient`;
  }
}

function getSeverityGuide(level: ProficiencyLevel): string {
  switch (level) {
    case 'beginner':
      return `**HIGH severity:**
- Syntax errors, completely wrong variable names

**MEDIUM severity:**
- Inconsistent naming, poor indentation

**LOW severity:**
- Variable could have better name`;

    case 'intermediate':
      return `**HIGH severity:**
- Missing error handling, O(n²) where O(n) possible

**MEDIUM severity:**
- Magic numbers, functions > 50 lines

**LOW severity:**
- Could use more idiomatic pattern`;

    case 'advanced':
      return `**HIGH severity:**
- Security vulnerabilities, memory leaks, wrong architecture

**MEDIUM severity:**
- Suboptimal complexity, missing abstractions

**LOW severity:**
- Minor optimization opportunity`;
  }
}

// =============================================================================
// HELPER FUNCTIONS - COMMON MISTAKES EXTRACTION
// =============================================================================

export async function getCommonMistakes(
  supabaseClient: any,
  userId: string,
  limit: number = 5
): Promise<string[]> {
  const { data, error } = await supabaseClient
    .from('code_analysis')
    .select('error_patterns')
    .eq('user_id', userId)
    .order('analyzed_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  // Flatten and count patterns
  const patternCounts: Record<string, number> = {};
  data.forEach((analysis: any) => {
    (analysis.error_patterns || []).forEach((pattern: string) => {
      patternCounts[pattern] = (patternCounts[pattern] || 0) + 1;
    });
  });

  // Return top 3 most common
  return Object.entries(patternCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([pattern]) => pattern);
}

// =============================================================================
// EXAMPLE USAGE
// =============================================================================

/*
// In Supabase Edge Function:

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { buildValidationPrompt, buildQualityPrompt, getCommonMistakes } from './ai-prompt-templates.ts';

Deno.serve(async (req) => {
  const { userId, levelId, code, language, referenceSolution, testCases } = await req.json();

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Get student profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('proficiency_level, proficiency_score, weak_areas')
    .eq('id', userId)
    .single();

  // Get level info
  const { data: level } = await supabase
    .from('levels')
    .select('difficulty, topic, target_skills')
    .eq('id', levelId)
    .single();

  // Get common mistakes
  const commonMistakes = await getCommonMistakes(supabase, userId, 5);

  // Build context
  const studentContext = {
    proficiencyLevel: profile.proficiency_level,
    proficiencyScore: profile.proficiency_score,
    weakAreas: profile.weak_areas || [],
    commonMistakes,
    errorPatterns: [],
  };

  const levelContext = {
    difficulty: level.difficulty,
    topic: level.topic,
    targetSkills: level.target_skills,
  };

  // Build prompts
  const validationPrompt = buildValidationPrompt({
    language,
    referenceSolution,
    userCode: code,
    testCases,
    studentContext,
    levelContext,
  });

  const qualityPrompt = buildQualityPrompt({
    language,
    referenceSolution,
    studentCode: code,
    studentContext,
    levelContext,
  });

  // Call OpenRouter API...
  // ...
});
*/
