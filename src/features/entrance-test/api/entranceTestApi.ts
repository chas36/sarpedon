import { supabase } from '@/shared/lib/supabase';
import type { ProficiencyLevel } from '@/shared/types';

// ============================================
// Types
// ============================================

export type QuestionType = 'multiple_choice' | 'code' | 'true_false';
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';
export type AttemptStatus = 'in_progress' | 'completed' | 'abandoned';

export interface EntranceTest {
  id: string;
  title: string;
  description: string | null;
  language: string;
  is_active: boolean;
  passing_score: number;
  time_limit_minutes: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface EntranceTestQuestion {
  id: string;
  test_id: string;
  question_type: QuestionType;
  question_text: string;
  code_template: string | null;
  correct_answer: string | null;
  test_cases: Array<{ input: string; output: string }> | null;
  options: string[] | null;
  skill_category: string | null;
  difficulty_level: DifficultyLevel;
  points: number;
  order_index: number;
  created_at: string;
}

export interface EntranceTestAttempt {
  id: string;
  test_id: string;
  student_id: string;
  started_at: string;
  completed_at: string | null;
  time_spent_seconds: number;
  score: number | null;
  total_points_earned: number;
  total_points_possible: number;
  proficiency_level_assigned: ProficiencyLevel | null;
  proficiency_score_assigned: number | null;
  status: AttemptStatus;
  created_at: string;
  updated_at: string;
}

export interface EntranceTestAnswer {
  id: string;
  attempt_id: string;
  question_id: string;
  student_answer: string | null;
  is_correct: boolean | null;
  points_earned: number;
  feedback: string | null;
  answered_at: string;
}

export interface TestWithQuestions extends EntranceTest {
  questions: EntranceTestQuestion[];
}

export interface AttemptWithAnswers extends EntranceTestAttempt {
  answers: EntranceTestAnswer[];
  test?: EntranceTest;
}

// ============================================
// Get active entrance tests
// ============================================

export async function getActiveEntranceTests(): Promise<EntranceTest[]> {
  const { data, error } = await supabase
    .from('entrance_tests')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// ============================================
// Get entrance test by ID with questions
// ============================================

export async function getEntranceTestWithQuestions(testId: string): Promise<TestWithQuestions> {
  const { data: test, error: testError } = await supabase
    .from('entrance_tests')
    .select('*')
    .eq('id', testId)
    .single();

  if (testError) throw testError;

  const { data: questions, error: questionsError } = await supabase
    .from('entrance_test_questions')
    .select('*')
    .eq('test_id', testId)
    .order('order_index', { ascending: true });

  if (questionsError) throw questionsError;

  return {
    ...test,
    questions: questions || []
  };
}

// ============================================
// Check if student has completed entrance test
// ============================================

export async function hasCompletedEntranceTest(studentId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('entrance_test_attempts')
    .select('id')
    .eq('student_id', studentId)
    .eq('status', 'completed')
    .limit(1);

  if (error) throw error;
  return (data?.length || 0) > 0;
}

// ============================================
// Get student's entrance test attempts
// ============================================

export async function getStudentAttempts(studentId: string): Promise<EntranceTestAttempt[]> {
  const { data, error } = await supabase
    .from('entrance_test_attempts')
    .select('*')
    .eq('student_id', studentId)
    .order('started_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// ============================================
// Get attempt by ID with details
// ============================================

export async function getAttemptWithDetails(attemptId: string): Promise<AttemptWithAnswers> {
  const { data: attempt, error: attemptError } = await supabase
    .from('entrance_test_attempts')
    .select('*')
    .eq('id', attemptId)
    .single();

  if (attemptError) throw attemptError;

  const { data: answers, error: answersError } = await supabase
    .from('entrance_test_answers')
    .select('*')
    .eq('attempt_id', attemptId);

  if (answersError) throw answersError;

  const { data: test, error: testError } = await supabase
    .from('entrance_tests')
    .select('*')
    .eq('id', attempt.test_id)
    .single();

  if (testError) throw testError;

  return {
    ...attempt,
    answers: answers || [],
    test
  };
}

// ============================================
// Start entrance test attempt
// ============================================

export async function startEntranceTest(testId: string, studentId: string): Promise<string> {
  const { data, error } = await supabase.rpc('start_entrance_test', {
    p_test_id: testId,
    p_student_id: studentId
  });

  if (error) throw error;
  return data;
}

// ============================================
// Submit answer to question
// ============================================

export async function submitAnswer(
  attemptId: string,
  questionId: string,
  answer: string,
  isCorrect: boolean,
  pointsEarned: number
): Promise<void> {
  const { error } = await supabase
    .from('entrance_test_answers')
    .upsert({
      attempt_id: attemptId,
      question_id: questionId,
      student_answer: answer,
      is_correct: isCorrect,
      points_earned: pointsEarned,
      answered_at: new Date().toISOString()
    }, {
      onConflict: 'attempt_id,question_id'
    });

  if (error) throw error;
}

// ============================================
// Complete entrance test
// ============================================

export async function completeEntranceTest(attemptId: string): Promise<void> {
  const { error } = await supabase.rpc('complete_entrance_test', {
    p_attempt_id: attemptId
  });

  if (error) throw error;
}

// ============================================
// Update attempt time spent
// ============================================

export async function updateTimeSpent(attemptId: string, seconds: number): Promise<void> {
  const { error } = await supabase
    .from('entrance_test_attempts')
    .update({ time_spent_seconds: seconds })
    .eq('id', attemptId);

  if (error) throw error;
}

// ============================================
// Teacher: Get all entrance tests
// ============================================

export async function getAllEntranceTests(): Promise<EntranceTest[]> {
  const { data, error } = await supabase
    .from('entrance_tests')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// ============================================
// Teacher: Get test statistics
// ============================================

export interface TestStatistics {
  test_id: string;
  test_title: string;
  total_attempts: number;
  completed_attempts: number;
  average_score: number;
  beginner_count: number;
  intermediate_count: number;
  advanced_count: number;
}

export async function getTestStatistics(testId: string): Promise<TestStatistics> {
  const { data: test, error: testError } = await supabase
    .from('entrance_tests')
    .select('id, title')
    .eq('id', testId)
    .single();

  if (testError) throw testError;

  const { data: attempts, error: attemptsError } = await supabase
    .from('entrance_test_attempts')
    .select('*')
    .eq('test_id', testId);

  if (attemptsError) throw attemptsError;

  const completed = attempts?.filter(a => a.status === 'completed') || [];
  const avgScore = completed.length > 0
    ? Math.round(completed.reduce((sum, a) => sum + (a.score || 0), 0) / completed.length)
    : 0;

  const beginnerCount = completed.filter(a => a.proficiency_level_assigned === 'beginner').length;
  const intermediateCount = completed.filter(a => a.proficiency_level_assigned === 'intermediate').length;
  const advancedCount = completed.filter(a => a.proficiency_level_assigned === 'advanced').length;

  return {
    test_id: testId,
    test_title: test.title,
    total_attempts: attempts?.length || 0,
    completed_attempts: completed.length,
    average_score: avgScore,
    beginner_count: beginnerCount,
    intermediate_count: intermediateCount,
    advanced_count: advancedCount
  };
}

// ============================================
// Teacher: Create entrance test
// ============================================

export async function createEntranceTest(data: {
  title: string;
  description?: string;
  language: string;
  passing_score?: number;
  time_limit_minutes?: number;
}): Promise<EntranceTest> {
  const { data: test, error } = await supabase
    .from('entrance_tests')
    .insert({
      title: data.title,
      description: data.description || null,
      language: data.language,
      passing_score: data.passing_score || 60,
      time_limit_minutes: data.time_limit_minutes || null,
      is_active: false // Start as inactive
    })
    .select()
    .single();

  if (error) throw error;
  return test;
}

// ============================================
// Teacher: Update entrance test
// ============================================

export async function updateEntranceTest(
  testId: string,
  data: Partial<EntranceTest>
): Promise<void> {
  const { error } = await supabase
    .from('entrance_tests')
    .update(data)
    .eq('id', testId);

  if (error) throw error;
}

// ============================================
// Teacher: Add question to test
// ============================================

export async function addQuestion(data: {
  test_id: string;
  question_type: QuestionType;
  question_text: string;
  difficulty_level: DifficultyLevel;
  points: number;
  correct_answer?: string;
  options?: string[];
  code_template?: string;
  test_cases?: Array<{ input: string; output: string }>;
  skill_category?: string;
  order_index?: number;
}): Promise<EntranceTestQuestion> {
  const { data: question, error } = await supabase
    .from('entrance_test_questions')
    .insert({
      test_id: data.test_id,
      question_type: data.question_type,
      question_text: data.question_text,
      difficulty_level: data.difficulty_level,
      points: data.points,
      correct_answer: data.correct_answer || null,
      options: data.options ? JSON.stringify(data.options) : null,
      code_template: data.code_template || null,
      test_cases: data.test_cases ? JSON.stringify(data.test_cases) : null,
      skill_category: data.skill_category || null,
      order_index: data.order_index || 0
    })
    .select()
    .single();

  if (error) throw error;
  return question;
}

// ============================================
// Teacher: Delete question
// ============================================

export async function deleteQuestion(questionId: string): Promise<void> {
  const { error } = await supabase
    .from('entrance_test_questions')
    .delete()
    .eq('id', questionId);

  if (error) throw error;
}

// ============================================
// Teacher: Get all attempts for a test
// ============================================

export async function getTestAttempts(testId: string): Promise<EntranceTestAttempt[]> {
  const { data, error } = await supabase
    .from('entrance_test_attempts')
    .select(`
      *,
      profiles:student_id (
        first_name,
        last_name,
        class
      )
    `)
    .eq('test_id', testId)
    .order('started_at', { ascending: false });

  if (error) throw error;
  return data || [];
}
