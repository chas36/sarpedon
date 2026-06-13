# Prompt for New Chat Session

This session is continuing work on Sarpedon - an educational platform for students and teachers.

## Quick Context

**Project**: React 18.3 + TypeScript + Vite + Supabase educational platform
**Current Branch**: `claude/refactor-teacher-navigation-011CV4hXrJ5oqHgZAvTJMk9e`
**User Language**: Russian (use Russian for UI, commit messages, user communication)

## Recent Work Completed

1. **Lesson Monitoring System** - Implemented full real-time lesson monitoring for teachers:
   - Database: `lesson_sessions`, `lesson_grades` tables with RLS policies
   - API: `src/features/lessons/api/lessonsApi.ts`
   - UI: `src/features/lessons/pages/LessonMonitorPage.tsx`
   - Features: Real-time activity tracking, automatic grade suggestions (1-5 scale)

2. **Critical RLS Fix** - Resolved 500 error caused by circular RLS dependency:
   - Problem: RLS policy on `profiles` used EXISTS to query `profiles` → infinite recursion
   - Solution: Created `check_user_role()` SECURITY DEFINER function to bypass RLS
   - Scripts: `fix_rls_circular_dependency_v2.sql`, `fix_teachers_cant_see_students_v2.sql`

3. **Teacher Profile Access** - Fixed teachers unable to see students:
   - Added policy: "Teachers can view student profiles" using safe SECURITY DEFINER function
   - No circular dependencies - checks viewed profile's role directly

## Current System State

✅ **Working**:
- User authentication (500 error resolved)
- Teachers can view student list (0 students bug fixed)
- Lesson monitoring page loads
- RLS policies using SECURITY DEFINER pattern

⏳ **Needs Testing**:
- Creating lessons in "Мониторинг урока"
- Assigning grades during active lesson
- Student view of their grades
- Full end-to-end lesson workflow

📝 **TODO Later**:
- Remove debug logging from LessonMonitorPage.tsx
- Re-enable entrance test (currently disabled due to PostgREST VOID function issue)

## Key Technical Patterns

**RLS Architecture** (IMPORTANT!):
```sql
-- ✅ CORRECT: Use SECURITY DEFINER function
CREATE FUNCTION check_user_role(user_id UUID, roles TEXT[])
RETURNS BOOLEAN
SECURITY DEFINER  -- Bypasses RLS!

-- ✅ CORRECT: Policy uses function
CREATE POLICY "name" USING (
  check_user_role(auth.uid(), ARRAY['teacher'])
)

-- ❌ WRONG: Creates circular dependency
CREATE POLICY "name" ON profiles USING (
  EXISTS (SELECT 1 FROM profiles WHERE ...)  -- DON'T DO THIS!
)
```

**API Pattern**:
- Supabase client for database access
- RPC functions for complex queries
- Real-time subscriptions for live data

**Design System**:
- Admin pages: `bg-admin-surface`, `text-admin-text`, `text-admin-muted`
- Student pages: Custom Tailwind theme

## Important Files

**Detailed Context**: Read `SESSION_SUMMARY.md` for comprehensive history

**SQL Scripts** (`sql-scripts/`):
- `fix_rls_circular_dependency_v2.sql` - Main RLS fix
- `fix_teachers_cant_see_students_v2.sql` - Teacher profile access
- `verify_rls_fix_v2.sql` - Verification queries
- `quick_diagnosis.sql` - Quick health check

**Code**:
- `src/features/lessons/` - Lesson monitoring feature
- `supabase/migrations/20251113000000_add_lesson_sessions_and_grades.sql` - Schema

## Git Workflow

- Always commit to: `claude/refactor-teacher-navigation-011CV4hXrJ5oqHgZAvTJMk9e`
- Use descriptive commit messages
- Push after each logical unit of work

## What to Do Next

1. **Ask user** if lesson creation and monitoring workflow is working
2. **If issues**, use diagnostic scripts in `sql-scripts/`
3. **If working**, offer to:
   - Clean up debug code
   - Add any missing features
   - Improve UX based on feedback

---

**For full context and detailed technical information, read SESSION_SUMMARY.md first!**
