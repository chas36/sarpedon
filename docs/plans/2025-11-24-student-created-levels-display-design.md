# Student-Created Levels Display Design

**Date:** 2025-11-24
**Status:** Approved
**Author:** Claude Code

## Overview

Implement visual indicators and author attribution for levels created by student editors, distinguishing them from teacher-created levels throughout the platform.

## Requirements

### Functional Requirements

1. Display author information for all student-created levels (role = 'student' AND is_editor = true)
2. Show student author's full name with distinctive visual marker
3. Apply special styling (purple theme) to student-created level cards
4. Display author info in two locations:
   - Level cards in LevelsListPage
   - Level header in SolveLevelPage

### Visual Requirements

- **Icon:** 🎓 (graduation cap emoji)
- **Color scheme:** Purple (#a855f7 and variants)
- **Border:** Purple border with shadow for level cards
- **Badge:** Purple background badge with author name

## Architecture

### Data Flow

```
Database (levels + profiles)
    ↓ (JOIN on created_by)
Supabase API
    ↓ (LevelWithAuthor type)
React Components
    ↓ (utility functions)
UI Display (badges, borders, text)
```

### Technology Stack

- **Database:** PostgreSQL (Supabase) with JOIN queries
- **API Layer:** Supabase client with nested select
- **Frontend:** React + TypeScript
- **Styling:** Tailwind CSS (purple-500 palette)

## Data Model Changes

### Extended Type Definition

```typescript
// New type extending Level
export interface LevelWithAuthor extends Level {
  author?: {
    id: string;
    full_name: string;
    first_name: string;
    last_name: string;
    role: Role;
    is_editor: boolean;
  };
}
```

**Design decisions:**
- Optional `author` field maintains backward compatibility
- Nested object structure matches Supabase JOIN response
- Includes role and is_editor for student detection logic

### Database Schema

No schema changes required. Uses existing:
- `levels.created_by` → foreign key to profiles.id
- `profiles` table with role and is_editor columns

## API Changes

### Modified Functions

#### `getLevels()`

**Before:**
```typescript
.from('levels')
.select('*')
```

**After:**
```typescript
.from('levels')
.select(`
  *,
  author:profiles!created_by(
    id,
    full_name,
    first_name,
    last_name,
    role,
    is_editor
  )
`)
```

#### `getLevelById(id)`

Same modification pattern as `getLevels()`.

**Performance impact:** Single JOIN query, no N+1 problem. Minimal overhead (~50-100ms typical).

## Component Changes

### New Utility Functions

**File:** `src/features/learning/utils/authorUtils.ts`

```typescript
export function isStudentCreated(level: LevelWithAuthor): boolean {
  return Boolean(
    level.author &&
    level.author.role === 'student' &&
    level.author.is_editor
  );
}

export function getAuthorDisplayName(level: LevelWithAuthor): string | null {
  if (!level.author) return null;
  return level.author.full_name ||
         `${level.author.first_name} ${level.author.last_name}`.trim();
}
```

### LevelsListPage Updates

**Location:** `src/features/learning/pages/LevelsListPage.tsx`

#### Border Styling Logic

Update `getCardBorderClass()`:

```typescript
const getCardBorderClass = (level: LevelWithProgress) => {
  // Priority: student-created → recommended → status
  if (isStudentCreated(level)) {
    return 'border-purple-500/50 hover:border-purple-500/70 shadow-lg shadow-purple-500/10';
  }
  if (level.isRecommended) {
    return 'border-learning-accent/50 hover:border-learning-accent shadow-lg shadow-learning-accent/10';
  }
  // ... existing status-based logic
}
```

#### Author Badge

Add in card header (after difficulty badge):

```tsx
{isStudentCreated(level) && (
  <span className="text-xs px-2 py-0.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-full font-medium flex items-center gap-1">
    🎓 {getAuthorDisplayName(level)}
  </span>
)}
```

### SolveLevelPage Updates

**Location:** `src/features/learning/pages/SolveLevelPage.tsx`

Add author info below title in header section:

```tsx
<div className="flex items-center gap-3 flex-wrap">
  {level.topic && (
    <p className="text-sm text-learning-muted">
      {level.topic}
    </p>
  )}
  {isStudentCreated(level) && (
    <span className="text-xs px-2 py-1 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-full font-medium flex items-center gap-1">
      🎓 Создано учеником: {getAuthorDisplayName(level)}
    </span>
  )}
</div>
```

## UI/UX Specifications

### Color Palette

| Element | Color | Tailwind Class |
|---------|-------|----------------|
| Border | Purple 500/50% | `border-purple-500/50` |
| Border hover | Purple 500/70% | `hover:border-purple-500/70` |
| Shadow | Purple 500/10% | `shadow-purple-500/10` |
| Badge bg | Purple 500/10% | `bg-purple-500/10` |
| Badge text | Purple 400 | `text-purple-400` |
| Badge border | Purple 500/20% | `border-purple-500/20` |

### Visual Priority

1. **Student-created** (purple border) - highest priority
2. **Recommended** (blue/accent border) - medium priority
3. **Status-based** (green/yellow/gray) - lowest priority

This ensures student-created levels are immediately recognizable.

### Responsive Behavior

- Mobile: Full author name may wrap to second line in badge
- Desktop: Single-line display
- All breakpoints: Icon (🎓) always visible

## Edge Cases

### Missing Author Data

**Scenario:** `created_by` is NULL or profile deleted

**Handling:**
```typescript
if (!level.author) return null; // Don't show badge
```

No error thrown, graceful degradation.

### Multiple Name Fields

**Priority:**
1. `full_name` (if present)
2. `first_name + last_name` (fallback)

### Non-Student Editors

**Scenario:** Teacher with is_editor = true

**Handling:** Check both `role === 'student'` AND `is_editor === true`. Teachers never show student badge.

## Testing Considerations

### Manual Testing Checklist

- [ ] Student-created level shows purple border in list
- [ ] Student-created level shows 🎓 badge with name
- [ ] Author info appears on solve page
- [ ] Teacher-created level has no purple styling
- [ ] Missing author data doesn't crash UI
- [ ] Badge wraps correctly on mobile
- [ ] Border priority works (student > recommended > status)

### Test Data Requirements

- At least one level created by student editor
- At least one level created by teacher
- At least one level with NULL created_by

## Implementation Plan

See separate implementation plan document for step-by-step tasks.

## Security Considerations

### RLS Policies

No changes to existing RLS policies. Author information is non-sensitive (names are already visible to students in same class).

### Data Exposure

Only public profile data exposed (name, role). No email, password, or sensitive fields included in JOIN.

## Performance Impact

### Database

- Single JOIN adds ~10-20% query time
- Index on `levels.created_by` (likely already exists for FK)
- No N+1 queries introduced

### Frontend

- Minimal: 2 additional utility function calls per level card
- No additional network requests
- CSS classes cached by browser

## Future Enhancements

Potential future additions (out of scope):

1. Click author name to see their other levels
2. Filter levels by student authors
3. Author avatar/profile picture
4. "Popular student creators" leaderboard
5. Author rating/feedback system

## Success Metrics

1. Students can identify peer-created levels visually
2. Author attribution clearly visible in both list and solve views
3. No performance degradation (< 50ms added latency)
4. No accessibility issues (color + icon + text)

## Accessibility

- Purple border + icon + text provides multiple indicators (not color-only)
- Emoji 🎓 has semantic meaning across cultures
- Screen readers announce badge text correctly
- Sufficient color contrast (purple-400 on dark bg)

## Rollout Plan

1. Implement type changes
2. Update API functions
3. Create utility functions
4. Update LevelsListPage
5. Update SolveLevelPage
6. Manual testing
7. Deploy to production

## Approvals

- [x] User requirements gathered
- [x] Architecture approach selected (JOIN)
- [x] UI/UX design approved
- [x] Implementation ready to proceed
