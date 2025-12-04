# Display Board for Interactive Whiteboard - Design Document

**Date:** 2025-12-04
**Author:** Claude Code
**Status:** Approved

## Overview

Create a dedicated display mode for interactive whiteboards/projectors in classrooms. This will be a read-only interface showing student progress, lesson monitoring, and statistics optimized for large screen viewing.

## Requirements

### Functional Requirements
1. New `display` role for authentication
2. Class selector to switch between different classes
3. Dashboard with overview widgets
4. Detailed pages for:
   - Students list with logins
   - Class statistics (overall progress, average scores)
   - Lesson monitoring (real-time student activity)
   - Author statistics
5. Auto-refresh every 5-10 seconds for lesson monitor
6. Read-only mode (no editing capabilities)

### Non-Functional Requirements
- Optimized for large screen display (projector/interactive whiteboard)
- Clean, minimalist interface
- Real-time data updates
- Responsive layout

## Architecture

### Approach: Hybrid (A + C)

**Components:**
1. Dashboard with widgets for quick overview
2. Detailed pages (simplified copies of teacher pages without editing)
3. Auto-refresh for real-time monitoring

**Rationale:**
- Dashboard provides at-a-glance overview perfect for classroom display
- Detailed pages allow drilling down when needed
- Balance between convenience and flexibility

## Database Changes

### 1. Add Display Role

```sql
-- Add new role 'display' to the role enum
ALTER TYPE role ADD VALUE IF NOT EXISTS 'display';

-- Optional: Add assigned_class field to profiles
-- This allows binding a display account to a specific class
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS assigned_class TEXT;

-- Add comment
COMMENT ON COLUMN profiles.assigned_class IS
'Optional: pre-assigned class for display accounts to auto-select on login';
```

### 2. Row Level Security (RLS)

Display role needs read-only access to:
- `profiles` (students)
- `levels`
- `submissions`
- `level_progress`
- `lesson_sessions`
- `lesson_grades`

```sql
-- Grant read access for display role
-- Students
CREATE POLICY "Display can view students"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'display'
    AND role = 'student'
  );

-- Levels
CREATE POLICY "Display can view levels"
  ON levels FOR SELECT
  TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'display');

-- Submissions
CREATE POLICY "Display can view submissions"
  ON submissions FOR SELECT
  TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'display');

-- Level Progress
CREATE POLICY "Display can view level progress"
  ON level_progress FOR SELECT
  TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'display');

-- Lesson Sessions
CREATE POLICY "Display can view lesson sessions"
  ON lesson_sessions FOR SELECT
  TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'display');

-- Lesson Grades
CREATE POLICY "Display can view lesson grades"
  ON lesson_grades FOR SELECT
  TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'display');
```

## Frontend Structure

### Directory Layout

```
src/features/display/
├── components/
│   ├── widgets/
│   │   ├── StudentsListWidget.tsx       # Compact student list
│   │   ├── ClassStatsWidget.tsx         # Class statistics
│   │   ├── LessonMonitorWidget.tsx      # Current lesson monitor
│   │   └── TopAuthorsWidget.tsx         # Top level authors
│   ├── DisplayLayout.tsx                # Layout with nav & class selector
│   └── ClassSelector.tsx                # Dropdown for class selection
├── pages/
│   ├── DisplayDashboard.tsx             # Main dashboard with widgets
│   ├── DisplayStudentsPage.tsx          # Full student table
│   ├── DisplayStatsPage.tsx             # Detailed statistics
│   ├── DisplayLessonPage.tsx            # Detailed lesson monitor
│   └── DisplayAuthorsPage.tsx           # Author statistics
├── api/
│   └── displayApi.ts                    # API functions
├── hooks/
│   └── useAutoRefresh.ts                # Auto-refresh hook (10s interval)
└── types/
    └── display.types.ts                 # TypeScript types
```

### Routes

```typescript
// Add to App.tsx
<Route path="/display" element={<DisplayLayout />}>
  <Route index element={<DisplayDashboard />} />
  <Route path="students" element={<DisplayStudentsPage />} />
  <Route path="stats" element={<DisplayStatsPage />} />
  <Route path="lesson/:lessonId" element={<DisplayLessonPage />} />
  <Route path="authors" element={<DisplayAuthorsPage />} />
</Route>
```

### Key Components

#### 1. DisplayLayout

**Features:**
- Minimal sidebar with icon navigation
- Header with class selector dropdown
- Last update indicator
- No teacher menu/profile - clean interface

**Navigation Items:**
- 📊 Dashboard
- 👥 Students
- 📈 Stats
- 🎓 Lesson
- ⭐ Authors

#### 2. DisplayDashboard

**Layout:** Grid with 4 widgets

```
┌─────────────────────────────────────────────┐
│  Class: [10A ▼]         Last update: 2m ago │
├──────────────────┬──────────────────────────┤
│                  │                          │
│  Students List   │   Class Stats            │
│  Widget          │   Widget                 │
│                  │                          │
├──────────────────┼──────────────────────────┤
│                  │                          │
│  Lesson Monitor  │   Top Authors            │
│  Widget          │   Widget                 │
│                  │                          │
└──────────────────┴──────────────────────────┘
```

#### 3. Widgets

**StudentsListWidget:**
- Table: Login, Name, Class
- Shows first 10 students
- Link to full list

**ClassStatsWidget:**
- Total students
- Average score
- Progress percentage
- Completion rate

**LessonMonitorWidget:**
- Current active lesson
- Real-time student activity
- Submission status
- Auto-refresh every 10s

**TopAuthorsWidget:**
- Top 5 level creators
- Level count
- Average rating

#### 4. ClassSelector Component

```typescript
interface ClassSelectorProps {
  selectedClass: string | null;
  onClassChange: (className: string) => void;
}

// Dropdown with all available classes
// Persists selection in localStorage
```

#### 5. useAutoRefresh Hook

```typescript
interface UseAutoRefreshOptions {
  interval?: number; // default 10000ms
  enabled?: boolean;
}

// Automatically refetch data at specified interval
function useAutoRefresh(
  fetchFn: () => Promise<void>,
  options?: UseAutoRefreshOptions
): void
```

## Data Flow

### 1. Authentication
```
User logs in as 'display' role
  → Redirect to /display
  → Check for assigned_class
  → If assigned_class exists, auto-select
  → Otherwise, prompt for class selection
```

### 2. Class Selection
```
User selects class from dropdown
  → Store in localStorage
  → Fetch data for selected class
  → Update all widgets/pages
```

### 3. Auto-Refresh (Lesson Monitor)
```
Component mounts
  → useAutoRefresh hook starts interval
  → Fetch data every 10 seconds
  → Update UI with new data
  → Show "Last updated: Xs ago" indicator
```

## API Functions

### displayApi.ts

```typescript
// Get students for selected class
export async function getClassStudents(className: string): Promise<Profile[]>

// Get class statistics
export async function getClassStats(className: string): Promise<ClassStats>

// Get active lesson for class
export async function getActiveLesson(className: string): Promise<LessonSession | null>

// Get lesson activity (for monitoring)
export async function getLessonActivity(lessonId: string): Promise<LessonActivity>

// Get top authors
export async function getTopAuthors(limit?: number): Promise<AuthorStats[]>

// Get all available classes
export async function getAvailableClasses(): Promise<string[]>
```

## UI/UX Considerations

### 1. Large Screen Optimization
- Larger fonts (18px+ for body text)
- High contrast colors
- Minimal scrolling
- Clear section separation

### 2. Color Scheme
- Use existing learning theme colors
- High contrast for readability from distance
- Green for positive metrics
- Red for issues/alerts

### 3. Auto-Refresh Indicator
```
┌────────────────────────────────┐
│ 🔄 Last updated: 12 seconds ago │
└────────────────────────────────┘
```

### 4. Empty States
- "No active lesson" when no lesson is running
- "Select a class" when no class selected
- Clear instructions for setup

## Security Considerations

1. **Read-Only Access:** Display role has no write permissions
2. **RLS Policies:** Enforce data access at database level
3. **No Sensitive Data:** Don't show passwords, emails (only logins), API keys
4. **Session Management:** Standard authentication flow

## Implementation Phases

### Phase 1: Database & Auth
- [ ] Add display role migration
- [ ] Create RLS policies
- [ ] Update auth flow to handle display role

### Phase 2: Core Components
- [ ] Create DisplayLayout
- [ ] Create ClassSelector
- [ ] Create useAutoRefresh hook
- [ ] Set up routing

### Phase 3: Dashboard & Widgets
- [ ] Create DisplayDashboard
- [ ] Create StudentsListWidget
- [ ] Create ClassStatsWidget
- [ ] Create LessonMonitorWidget
- [ ] Create TopAuthorsWidget

### Phase 4: Detailed Pages
- [ ] Create DisplayStudentsPage
- [ ] Create DisplayStatsPage
- [ ] Create DisplayLessonPage
- [ ] Create DisplayAuthorsPage

### Phase 5: Polish & Testing
- [ ] Test on actual projector/large screen
- [ ] Optimize for different resolutions
- [ ] Add loading states
- [ ] Add error handling
- [ ] Test auto-refresh performance

## Testing Checklist

- [ ] Display user can log in
- [ ] Class selector shows all classes
- [ ] Dashboard loads all widgets correctly
- [ ] Auto-refresh updates data every 10s
- [ ] Detailed pages show correct data
- [ ] Navigation works between all pages
- [ ] No edit buttons/forms visible
- [ ] Data updates when class changes
- [ ] Readable on projector from 5+ meters
- [ ] Performance is acceptable with auto-refresh

## Future Enhancements (Not in Scope)

- Fullscreen mode
- Multiple display layouts (different widget arrangements)
- Customizable refresh intervals
- Dark mode specifically for projectors
- QR code for quick student login display
- Sound notifications for lesson events
- Multi-class view (split screen)

## Success Metrics

- Display mode is usable on classroom projectors
- Teachers can monitor class progress in real-time
- Students can see their login credentials easily
- No performance issues with auto-refresh
- Zero editing capabilities exposed to display role
