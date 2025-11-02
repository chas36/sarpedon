# Student Management System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement comprehensive student management system for teachers, including CRUD operations for students and classes, credential management, and bulk import functionality.

**Architecture:** Hybrid approach with existing StudentsPage extended, new StudentDetailsPage for detailed view, and modal dialogs for quick operations. API layer expanded with student and class management functions. Login generation utility with Russian words + digits pattern.

**Tech Stack:** React 18, TypeScript, Supabase (PostgreSQL + Auth), React Router 7, Zustand, Tailwind CSS

---

## Phase 1: Database Setup

### Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/20251102000000_student_management.sql`

**Step 1: Create migration file**

Create `supabase/migrations/20251102000000_student_management.sql` with:

```sql
-- Add generated_password field to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS generated_password TEXT;

COMMENT ON COLUMN public.profiles.generated_password IS
  'Password in plain text for teacher display (default = login)';

-- Create classes table
CREATE TABLE IF NOT EXISTS public.classes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_classes_name ON public.classes(name);
CREATE INDEX IF NOT EXISTS idx_classes_created_by ON public.classes(created_by);

-- Trigger for updated_at
CREATE TRIGGER update_classes_updated_at BEFORE UPDATE ON public.classes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE public.classes IS 'Student classes/groups';

-- Enable RLS
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

-- RLS policy: only teachers can manage classes
CREATE POLICY teacher_manage_classes ON public.classes
  FOR ALL USING (
    auth.uid() IN (
      SELECT id FROM public.profiles WHERE role = 'teacher'
    )
  );

-- RLS policies for student management
CREATE POLICY teacher_update_students ON public.profiles
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT id FROM public.profiles WHERE role = 'teacher'
    )
  );

CREATE POLICY teacher_delete_students ON public.profiles
  FOR DELETE USING (
    auth.uid() IN (
      SELECT id FROM public.profiles WHERE role = 'teacher'
    )
  );

-- Populate classes from existing student data
INSERT INTO public.classes (name)
SELECT DISTINCT class
FROM public.profiles
WHERE role = 'student' AND class IS NOT NULL
ON CONFLICT (name) DO NOTHING;
```

**Step 2: Apply migration**

In Supabase Dashboard → SQL Editor, run the migration file.

Expected: Success message, tables and policies created.

**Step 3: Verify migration**

Run in SQL Editor:
```sql
-- Check generated_password column added
SELECT column_name FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name = 'generated_password';

-- Check classes table exists
SELECT * FROM public.classes LIMIT 5;

-- Check RLS enabled
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'classes';
```

Expected: Column exists, classes populated from existing data, RLS enabled.

**Step 4: Commit design documents**

```bash
git add docs/plans/2025-11-02-student-management-design.md
git add docs/plans/2025-11-02-student-management-implementation.md
git add supabase/migrations/20251102000000_student_management.sql
git commit -m "docs: add student management design and migration"
```

---

## Phase 2: Utility and API Layer

### Task 2: Login Generator Utility

**Files:**
- Create: `src/features/teacher/utils/loginGenerator.ts`
- Create: `src/features/teacher/utils/__tests__/loginGenerator.test.ts`

**Step 1: Write failing test for login generation**

Create `src/features/teacher/utils/__tests__/loginGenerator.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { generateLogin, validateLogin, generateUniqueLogin } from '../loginGenerator';

describe('loginGenerator', () => {
  describe('generateLogin', () => {
    it('should generate login with word and 3 digits', () => {
      const login = generateLogin();

      expect(login).toMatch(/^[А-ЯЁ]+\d{3}$/);
      expect(login.length).toBeGreaterThanOrEqual(5);
      expect(login.length).toBeLessThanOrEqual(15);
    });

    it('should generate different logins on multiple calls', () => {
      const logins = new Set();
      for (let i = 0; i < 10; i++) {
        logins.add(generateLogin());
      }

      expect(logins.size).toBeGreaterThan(1);
    });
  });

  describe('validateLogin', () => {
    it('should accept valid cyrillic login', () => {
      expect(validateLogin('ОКРУГ460')).toBeNull();
      expect(validateLogin('ВОЛГА123')).toBeNull();
    });

    it('should reject login with latin characters', () => {
      expect(validateLogin('OKRUG460')).toBe('Логин должен содержать только заглавные русские буквы и цифры');
    });

    it('should reject too short login', () => {
      expect(validateLogin('АБ12')).toBe('Логин должен быть от 5 до 15 символов');
    });

    it('should reject too long login', () => {
      expect(validateLogin('АБВГДЕЖЗИКЛМНОП1234')).toBe('Логин должен быть от 5 до 15 символов');
    });

    it('should reject login with lowercase', () => {
      expect(validateLogin('округ460')).toBe('Логин должен содержать только заглавные русские буквы и цифры');
    });

    it('should reject empty login', () => {
      expect(validateLogin('')).toBe('Логин должен быть от 5 до 15 символов');
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- loginGenerator.test.ts
```

Expected: FAIL - module not found

**Step 3: Implement login generator**

Create `src/features/teacher/utils/loginGenerator.ts`:

```typescript
import { supabase } from '@/shared/lib/supabase';

/**
 * Dictionary of words for login generation
 * Rivers, lakes, animals, geographic objects
 */
const WORDS = [
  // Existing logins from other site
  'ОКРУГ', 'ГРАНАТ', 'ГЛОБУС', 'ЭНЦЕЛАД', 'КОРДОБА',
  'ГАЛИСИЯ', 'ГУДЗОН', 'НЕМАН',

  // Rivers
  'ВОЛГА', 'ДНЕПР', 'ДОН', 'АМУР', 'ЛЕНА', 'ОБЬ', 'ЕНИСЕЙ',
  'АМАЗОНКА', 'НИЛ', 'МИССИСИПИ', 'ЯНЦЗЫ', 'КОНГО', 'ТЕМЗА',
  'СЕНА', 'РИО', 'ДУНАЙ', 'РЕЙН',

  // Lakes
  'БАЙКАЛ', 'ЛАДОГА', 'ОНЕЖСКОЕ', 'КАСПИЙ', 'ВИКТОРИЯ',
  'ТАНГАНЬИКА', 'ГУРОН', 'МИЧИГАН',

  // Mountains and geographic objects
  'ЭВЕРЕСТ', 'АЛЬПЫ', 'АНДЫ', 'УРАЛ', 'КАВКАЗ', 'АТЛАС',
  'КИЛИМАНДЖАРО', 'МОНБЛАН', 'ЭЛЬБРУС', 'ГИМАЛАИ',

  // Animals
  'ТИГР', 'ЛЕВ', 'МЕДВЕДЬ', 'ВОЛК', 'ОРЁЛ', 'СОКОЛ',
  'ДЕЛЬФИН', 'АКУЛА', 'КИТ', 'ПАНТЕРА', 'ГЕПАРД', 'БАРС',
  'РЫСЬ', 'СОВА', 'ЯСТРЕБ',

  // Planets and space
  'МАРС', 'ЮПИТЕР', 'САТУРН', 'ПЛУТОН', 'НЕПТУН',
  'ТИТАН', 'ЕВРОПА', 'ГАНИМЕД', 'ЦЕРЕРА',

  // Cities and places
  'ПАРИЖ', 'ЛОНДОН', 'ТОКИО', 'ПЕКИН', 'ДЕЛИ', 'КАИР',
  'РИМ', 'АФИНЫ', 'ОСЛО', 'КИЕВ', 'МИНСК',
];

/**
 * Generate login: WORD + 3 digits
 * Example: ОКРУГ460, ГРАНАТ622
 */
export function generateLogin(): string {
  const word = WORDS[Math.floor(Math.random() * WORDS.length)];
  const digits = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, '0');
  return `${word}${digits}`;
}

/**
 * Generate unique login (checks database for uniqueness)
 */
export async function generateUniqueLogin(): Promise<string> {
  const maxAttempts = 10;

  for (let i = 0; i < maxAttempts; i++) {
    const login = generateLogin();

    // Check uniqueness
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('generated_login', login)
      .maybeSingle();

    if (!data) {
      return login;
    }
  }

  throw new Error('Не удалось сгенерировать уникальный логин после 10 попыток');
}

/**
 * Validate login format
 * @returns null if valid, error message if invalid
 */
export function validateLogin(login: string): string | null {
  // Only uppercase Cyrillic letters and digits
  const regex = /^[А-ЯЁ0-9]+$/;

  if (!login || login.length < 5 || login.length > 15) {
    return 'Логин должен быть от 5 до 15 символов';
  }

  if (!regex.test(login)) {
    return 'Логин должен содержать только заглавные русские буквы и цифры';
  }

  return null;
}
```

**Step 4: Run tests to verify they pass**

```bash
npm test -- loginGenerator.test.ts
```

Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/features/teacher/utils/loginGenerator.ts
git add src/features/teacher/utils/__tests__/loginGenerator.test.ts
git commit -m "feat: add login generator utility with validation"
```

---

### Task 3: Classes API

**Files:**
- Create: `src/features/teacher/api/classesApi.ts`
- Create: `src/features/teacher/api/__tests__/classesApi.test.ts`

**Step 1: Write failing tests for classes API**

Create `src/features/teacher/api/__tests__/classesApi.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { supabase } from '@/shared/lib/supabase';
import {
  getAllClasses,
  createClass,
  updateClass,
  deleteClass,
  getClassStudentCount,
} from '../classesApi';

// Mock supabase
vi.mock('@/shared/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('classesApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAllClasses', () => {
    it('should fetch all classes ordered by name', async () => {
      const mockClasses = [
        { id: '1', name: '10А' },
        { id: '2', name: '10Б' },
      ];

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockClasses, error: null }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockChain as any);

      const result = await getAllClasses();

      expect(supabase.from).toHaveBeenCalledWith('classes');
      expect(mockChain.select).toHaveBeenCalledWith('*');
      expect(mockChain.order).toHaveBeenCalledWith('name', { ascending: true });
      expect(result).toEqual(mockClasses);
    });

    it('should throw error on failure', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: new Error('DB error') }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockChain as any);

      await expect(getAllClasses()).rejects.toThrow('DB error');
    });
  });

  describe('createClass', () => {
    it('should create new class', async () => {
      const mockClass = { id: '1', name: '10А' };

      const mockChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockClass, error: null }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockChain as any);

      const result = await createClass('10А');

      expect(supabase.from).toHaveBeenCalledWith('classes');
      expect(mockChain.insert).toHaveBeenCalledWith({ name: '10А' });
      expect(result).toEqual(mockClass);
    });
  });

  describe('getClassStudentCount', () => {
    it('should return student count for class', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        count: vi.fn().mockResolvedValue({ count: 15, error: null }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockChain as any);

      const result = await getClassStudentCount('10А');

      expect(supabase.from).toHaveBeenCalledWith('profiles');
      expect(mockChain.eq).toHaveBeenCalledWith('role', 'student');
      expect(mockChain.eq).toHaveBeenCalledWith('class', '10А');
      expect(result).toBe(15);
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- classesApi.test.ts
```

Expected: FAIL - module not found

**Step 3: Implement classes API**

Create `src/features/teacher/api/classesApi.ts`:

```typescript
import { supabase } from '@/shared/lib/supabase';

export interface Class {
  id: string;
  name: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Get all classes ordered by name
 */
export async function getAllClasses(): Promise<Class[]> {
  const { data, error } = await supabase
    .from('classes')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Create new class
 */
export async function createClass(name: string): Promise<Class> {
  const { data, error } = await supabase
    .from('classes')
    .insert({ name })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update class name
 */
export async function updateClass(id: string, name: string): Promise<Class> {
  const { data, error } = await supabase
    .from('classes')
    .update({ name })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete class
 */
export async function deleteClass(id: string): Promise<void> {
  const { error } = await supabase
    .from('classes')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/**
 * Get number of students in class
 */
export async function getClassStudentCount(className: string): Promise<number> {
  const { count, error } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'student')
    .eq('class', className);

  if (error) throw error;
  return count || 0;
}
```

**Step 4: Run tests to verify they pass**

```bash
npm test -- classesApi.test.ts
```

Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/features/teacher/api/classesApi.ts
git add src/features/teacher/api/__tests__/classesApi.test.ts
git commit -m "feat: add classes API with CRUD operations"
```

---

### Task 4: Extended Students API

**Files:**
- Modify: `src/features/teacher/api/studentsApi.ts`
- Create: `src/features/teacher/api/__tests__/studentsApi.test.ts` (if doesn't exist)

**Step 1: Write failing tests for new student API functions**

Create or extend `src/features/teacher/api/__tests__/studentsApi.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/shared/lib/supabase';
import {
  createStudent,
  updateStudent,
  deleteStudent,
  resetPassword,
  updateCredentials,
  bulkCreateStudents,
} from '../studentsApi';
import * as loginGenerator from '../../utils/loginGenerator';

vi.mock('@/shared/lib/supabase');
vi.mock('../../utils/loginGenerator');

describe('studentsApi - new functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createStudent', () => {
    it('should create student with generated login', async () => {
      const mockLogin = 'ОКРУГ460';
      vi.mocked(loginGenerator.generateUniqueLogin).mockResolvedValue(mockLogin);

      const authMock = {
        signUp: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      };

      const profileMock = {
        from: vi.fn().mockReturnValue({
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'user-123',
              first_name: 'Иван',
              last_name: 'Иванов',
              class: '10А',
              generated_login: mockLogin,
              generated_password: mockLogin,
            },
            error: null,
          }),
        }),
      };

      vi.mocked(supabase).auth = authMock as any;
      vi.mocked(supabase.from).mockImplementation(profileMock.from as any);

      const result = await createStudent({
        firstName: 'Иван',
        lastName: 'Иванов',
        className: '10А',
      });

      expect(loginGenerator.generateUniqueLogin).toHaveBeenCalled();
      expect(authMock.signUp).toHaveBeenCalledWith({
        email: expect.stringContaining('@sarpedon.local'),
        password: mockLogin,
      });
      expect(result.generated_login).toBe(mockLogin);
    });

    it('should create student with provided login', async () => {
      const customLogin = 'ГРАНАТ622';

      const authMock = {
        signUp: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      };

      const profileMock = {
        from: vi.fn().mockReturnValue({
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'user-123',
              first_name: 'Петр',
              last_name: 'Петров',
              generated_login: customLogin,
            },
            error: null,
          }),
        }),
      };

      vi.mocked(supabase).auth = authMock as any;
      vi.mocked(supabase.from).mockImplementation(profileMock.from as any);

      await createStudent({
        firstName: 'Петр',
        lastName: 'Петров',
        className: '10А',
        login: customLogin,
      });

      expect(loginGenerator.generateUniqueLogin).not.toHaveBeenCalled();
      expect(authMock.signUp).toHaveBeenCalledWith({
        email: expect.any(String),
        password: customLogin,
      });
    });
  });

  describe('updateStudent', () => {
    it('should update student profile', async () => {
      const mockChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: '123', first_name: 'Новое Имя' },
          error: null,
        }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockChain as any);

      await updateStudent('123', { firstName: 'Новое Имя' });

      expect(mockChain.update).toHaveBeenCalledWith({
        first_name: 'Новое Имя',
      });
    });
  });

  describe('resetPassword', () => {
    it('should reset password to match login', async () => {
      const mockStudent = {
        data: { generated_login: 'ОКРУГ460' },
        error: null,
      };

      const selectMock = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockStudent),
      };

      const updateMock = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };

      vi.mocked(supabase.from)
        .mockReturnValueOnce(selectMock as any)
        .mockReturnValueOnce(updateMock as any);

      const authMock = {
        admin: {
          updateUserById: vi.fn().mockResolvedValue({ error: null }),
        },
      };

      vi.mocked(supabase).auth = authMock as any;

      await resetPassword('user-123');

      expect(authMock.admin.updateUserById).toHaveBeenCalledWith('user-123', {
        password: 'ОКРУГ460',
      });
    });
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
npm test -- studentsApi.test.ts
```

Expected: FAIL - functions not implemented

**Step 3: Extend studentsApi.ts with new functions**

Add to `src/features/teacher/api/studentsApi.ts`:

```typescript
import { generateUniqueLogin } from '../utils/loginGenerator';

/**
 * Create new student
 */
export async function createStudent(data: {
  firstName: string;
  lastName: string;
  className: string;
  login?: string;
  password?: string;
}): Promise<Profile> {
  // Generate login if not provided
  const login = data.login || await generateUniqueLogin();
  const password = data.password || login;

  // Create auth user with temporary email
  const email = `${login}@sarpedon.local`;

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (authError) throw authError;
  if (!authData.user) throw new Error('Failed to create user');

  // Create profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .insert({
      id: authData.user.id,
      first_name: data.firstName,
      last_name: data.lastName,
      role: 'student',
      class: data.className,
      generated_login: login,
      generated_password: password,
    })
    .select()
    .single();

  if (profileError) throw profileError;
  return profile;
}

/**
 * Bulk create students
 */
export async function bulkCreateStudents(
  students: Array<{
    firstName: string;
    lastName: string;
    className: string;
    login?: string;
  }>
): Promise<{
  success: Profile[];
  errors: Array<{ student: any; error: string }>;
}> {
  const success: Profile[] = [];
  const errors: Array<{ student: any; error: string }> = [];

  for (const student of students) {
    try {
      const created = await createStudent(student);
      success.push(created);
    } catch (error) {
      errors.push({
        student,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return { success, errors };
}

/**
 * Update student profile
 */
export async function updateStudent(
  id: string,
  data: {
    firstName?: string;
    lastName?: string;
    className?: string;
  }
): Promise<Profile> {
  const updates: any = {};
  if (data.firstName) updates.first_name = data.firstName;
  if (data.lastName) updates.last_name = data.lastName;
  if (data.className !== undefined) updates.class = data.className;

  const { data: profile, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return profile;
}

/**
 * Delete student
 */
export async function deleteStudent(id: string): Promise<void> {
  // Delete auth user (cascade will delete profile via FK)
  const { error } = await supabase.auth.admin.deleteUser(id);
  if (error) throw error;
}

/**
 * Reset password (password = login)
 */
export async function resetPassword(id: string): Promise<void> {
  // Get student's login
  const { data: student, error: fetchError } = await supabase
    .from('profiles')
    .select('generated_login')
    .eq('id', id)
    .single();

  if (fetchError) throw fetchError;
  if (!student.generated_login) throw new Error('Student has no login');

  // Update password in auth
  const { error: authError } = await supabase.auth.admin.updateUserById(id, {
    password: student.generated_login,
  });

  if (authError) throw authError;

  // Update generated_password in profile
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ generated_password: student.generated_login })
    .eq('id', id);

  if (profileError) throw profileError;
}

/**
 * Update credentials (login and password)
 */
export async function updateCredentials(
  id: string,
  login: string,
  password: string
): Promise<void> {
  // Update password in auth
  const { error: authError } = await supabase.auth.admin.updateUserById(id, {
    password,
  });

  if (authError) throw authError;

  // Update login and password in profile
  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      generated_login: login,
      generated_password: password,
    })
    .eq('id', id);

  if (profileError) throw profileError;
}
```

**Step 4: Run tests to verify they pass**

```bash
npm test -- studentsApi.test.ts
```

Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/features/teacher/api/studentsApi.ts
git add src/features/teacher/api/__tests__/studentsApi.test.ts
git commit -m "feat: extend students API with CRUD and credential management"
```

---

## Phase 3: UI Components - Modals

### Task 5: Shared Modal Component (if needed)

**Files:**
- Check: `src/shared/components/ui/Modal.tsx`

**Step 1: Verify Modal component exists**

```bash
ls src/shared/components/ui/Modal.tsx
```

If exists, skip to Task 6.
If not exists, create basic Modal component:

```typescript
import { ReactNode } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  size?: 'small' | 'medium' | 'large';
  title?: string;
}

export function Modal({ isOpen, onClose, children, size = 'medium', title }: ModalProps) {
  if (!isOpen) return null;

  const sizeClasses = {
    small: 'max-w-md',
    medium: 'max-w-2xl',
    large: 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className={`relative bg-admin-surface rounded-lg p-6 w-full ${sizeClasses[size]} max-h-[90vh] overflow-y-auto`}>
        {title && (
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-admin-text">{title}</h2>
            <button
              onClick={onClose}
              className="text-admin-muted hover:text-admin-text"
            >
              ✕
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
```

**Step 2: Export from index**

Update `src/shared/components/ui/index.ts`:

```typescript
export { Modal } from './Modal';
```

**Step 3: Commit if created**

```bash
git add src/shared/components/ui/Modal.tsx
git add src/shared/components/ui/index.ts
git commit -m "feat: add Modal component"
```

---

### Task 6: ManageClassesModal Component

**Files:**
- Create: `src/features/teacher/components/ManageClassesModal.tsx`
- Create: `src/features/teacher/components/__tests__/ManageClassesModal.test.tsx`

**Step 1: Write failing test**

Create `src/features/teacher/components/__tests__/ManageClassesModal.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ManageClassesModal } from '../ManageClassesModal';
import * as classesApi from '../../api/classesApi';

vi.mock('../../api/classesApi');

describe('ManageClassesModal', () => {
  it('should render classes list', async () => {
    vi.mocked(classesApi.getAllClasses).mockResolvedValue([
      { id: '1', name: '10А', created_at: '', updated_at: '' },
      { id: '2', name: '10Б', created_at: '', updated_at: '' },
    ]);

    render(<ManageClassesModal isOpen={true} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('10А')).toBeInTheDocument();
      expect(screen.getByText('10Б')).toBeInTheDocument();
    });
  });

  it('should create new class', async () => {
    vi.mocked(classesApi.getAllClasses).mockResolvedValue([]);
    vi.mocked(classesApi.createClass).mockResolvedValue({
      id: '3',
      name: '11А',
      created_at: '',
      updated_at: '',
    });

    const user = userEvent.setup();
    render(<ManageClassesModal isOpen={true} onClose={vi.fn()} />);

    const input = screen.getByPlaceholderText(/название класса/i);
    await user.type(input, '11А');

    const addButton = screen.getByRole('button', { name: /добавить/i });
    await user.click(addButton);

    await waitFor(() => {
      expect(classesApi.createClass).toHaveBeenCalledWith('11А');
    });
  });

  it('should delete class with confirmation', async () => {
    vi.mocked(classesApi.getAllClasses).mockResolvedValue([
      { id: '1', name: '10А', created_at: '', updated_at: '' },
    ]);
    vi.mocked(classesApi.getClassStudentCount).mockResolvedValue(5);
    vi.mocked(classesApi.deleteClass).mockResolvedValue();

    window.confirm = vi.fn(() => true);

    const user = userEvent.setup();
    render(<ManageClassesModal isOpen={true} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('10А')).toBeInTheDocument();
    });

    const deleteButton = screen.getAllByRole('button', { name: /удалить/i })[0];
    await user.click(deleteButton);

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalled();
      expect(classesApi.deleteClass).toHaveBeenCalledWith('1');
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- ManageClassesModal.test.tsx
```

Expected: FAIL - component not found

**Step 3: Implement ManageClassesModal**

Create `src/features/teacher/components/ManageClassesModal.tsx`:

```typescript
import { useState, useEffect } from 'react';
import { Modal } from '@/shared/components/ui';
import { Button, Spinner } from '@/shared/components/ui';
import {
  getAllClasses,
  createClass,
  updateClass,
  deleteClass,
  getClassStudentCount,
  type Class,
} from '../api/classesApi';

interface ManageClassesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ManageClassesModal({ isOpen, onClose }: ManageClassesModalProps) {
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [newClassName, setNewClassName] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadClasses();
    }
  }, [isOpen]);

  const loadClasses = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllClasses();
      setClasses(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки классов');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newClassName.trim()) return;

    try {
      setError(null);
      await createClass(newClassName.trim());
      setNewClassName('');
      await loadClasses();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка создания класса');
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editingName.trim()) return;

    try {
      setError(null);
      await updateClass(id, editingName.trim());
      setEditingId(null);
      setEditingName('');
      await loadClasses();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка обновления класса');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    try {
      const count = await getClassStudentCount(name);

      const message =
        count > 0
          ? `В классе ${name} находится ${count} учеников. Они останутся без класса. Удалить класс?`
          : `Удалить класс ${name}?`;

      const confirmed = window.confirm(message);

      if (confirmed) {
        setError(null);
        await deleteClass(id);
        await loadClasses();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка удаления класса');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Управление классами">
      {error && (
        <div className="bg-admin-danger/10 border border-admin-danger rounded-lg p-3 mb-4">
          <p className="text-admin-danger text-sm">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Classes List */}
          <div className="space-y-2">
            {classes.length === 0 ? (
              <p className="text-admin-muted text-center py-4">Нет классов</p>
            ) : (
              classes.map((cls) => (
                <div
                  key={cls.id}
                  className="flex items-center gap-2 p-3 bg-admin-bg rounded-lg"
                >
                  {editingId === cls.id ? (
                    <>
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="flex-1 px-3 py-2 bg-admin-surface border border-admin-muted/20 rounded-lg text-admin-text focus:outline-none focus:ring-2 focus:ring-admin-accent"
                        autoFocus
                      />
                      <Button
                        size="sm"
                        onClick={() => handleUpdate(cls.id)}
                      >
                        Сохранить
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingId(null);
                          setEditingName('');
                        }}
                      >
                        Отмена
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-admin-text font-medium">
                        {cls.name}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingId(cls.id);
                          setEditingName(cls.name);
                        }}
                      >
                        Редактировать
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(cls.id, cls.name)}
                      >
                        Удалить
                      </Button>
                    </>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Add New Class */}
          <div className="pt-4 border-t border-admin-muted/10">
            <h3 className="text-lg font-semibold text-admin-text mb-3">
              Добавить класс
            </h3>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Название класса (например, 10А)"
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleCreate()}
                className="flex-1 px-3 py-2 bg-admin-surface border border-admin-muted/20 rounded-lg text-admin-text focus:outline-none focus:ring-2 focus:ring-admin-accent"
              />
              <Button onClick={handleCreate}>Добавить</Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
```

**Step 4: Run tests to verify they pass**

```bash
npm test -- ManageClassesModal.test.tsx
```

Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/features/teacher/components/ManageClassesModal.tsx
git add src/features/teacher/components/__tests__/ManageClassesModal.test.tsx
git commit -m "feat: add ManageClassesModal component"
```

---

### Task 7: AddStudentModal Component

**Files:**
- Create: `src/features/teacher/components/AddStudentModal.tsx`
- Create: `src/features/teacher/components/__tests__/AddStudentModal.test.tsx`

**Step 1: Write failing test**

Create test file with basic rendering and form submission tests.

**Step 2: Run test to verify it fails**

**Step 3: Implement AddStudentModal**

Create `src/features/teacher/components/AddStudentModal.tsx`:

```typescript
import { useState, useEffect } from 'react';
import { Modal, Button, Spinner } from '@/shared/components/ui';
import { createStudent } from '../api/studentsApi';
import { getAllClasses } from '../api/classesApi';
import { generateUniqueLogin, validateLogin } from '../utils/loginGenerator';
import type { Profile } from '@/shared/types';

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (student: Profile) => void;
}

export function AddStudentModal({ isOpen, onClose, onSuccess }: AddStudentModalProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [className, setClassName] = useState('');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [classes, setClasses] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCredentials, setShowCredentials] = useState(false);
  const [createdStudent, setCreatedStudent] = useState<Profile | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadClasses();
      resetForm();
    }
  }, [isOpen]);

  const loadClasses = async () => {
    try {
      const data = await getAllClasses();
      setClasses(data.map((c) => c.name));
    } catch (err) {
      console.error('Failed to load classes:', err);
    }
  };

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setClassName('');
    setLogin('');
    setPassword('');
    setError(null);
    setShowCredentials(false);
    setCreatedStudent(null);
  };

  const handleGenerateLogin = async () => {
    try {
      const generated = await generateUniqueLogin();
      setLogin(generated);
      setPassword(generated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка генерации логина');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!firstName.trim() || !lastName.trim()) {
      setError('Имя и фамилия обязательны');
      return;
    }

    if (!className.trim()) {
      setError('Выберите класс');
      return;
    }

    if (!login.trim()) {
      setError('Логин обязателен');
      return;
    }

    const loginError = validateLogin(login);
    if (loginError) {
      setError(loginError);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const student = await createStudent({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        className: className.trim(),
        login: login.trim(),
        password: password.trim() || login.trim(),
      });

      setCreatedStudent(student);
      setShowCredentials(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка создания ученика');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (createdStudent && showCredentials) {
      onSuccess(createdStudent);
    }
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={showCredentials ? 'Ученик создан' : 'Добавить ученика'}
    >
      {!showCredentials ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-admin-danger/10 border border-admin-danger rounded-lg p-3">
              <p className="text-admin-danger text-sm">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-admin-text mb-1">
              Имя *
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full px-3 py-2 bg-admin-surface border border-admin-muted/20 rounded-lg text-admin-text focus:outline-none focus:ring-2 focus:ring-admin-accent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-admin-text mb-1">
              Фамилия *
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full px-3 py-2 bg-admin-surface border border-admin-muted/20 rounded-lg text-admin-text focus:outline-none focus:ring-2 focus:ring-admin-accent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-admin-text mb-1">
              Класс *
            </label>
            <select
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              className="w-full px-3 py-2 bg-admin-surface border border-admin-muted/20 rounded-lg text-admin-text focus:outline-none focus:ring-2 focus:ring-admin-accent"
              required
            >
              <option value="">Выберите класс</option>
              {classes.map((cls) => (
                <option key={cls} value={cls}>
                  {cls}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-admin-text mb-1">
              Логин *
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={login}
                onChange={(e) => setLogin(e.target.value.toUpperCase())}
                placeholder="ОКРУГ460"
                className="flex-1 px-3 py-2 bg-admin-surface border border-admin-muted/20 rounded-lg text-admin-text focus:outline-none focus:ring-2 focus:ring-admin-accent"
                required
              />
              <Button
                type="button"
                variant="secondary"
                onClick={handleGenerateLogin}
              >
                Сгенерировать
              </Button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-admin-text mb-1">
              Пароль (по умолчанию = логин)
            </label>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={login || 'Будет равен логину'}
              className="w-full px-3 py-2 bg-admin-surface border border-admin-muted/20 rounded-lg text-admin-text focus:outline-none focus:ring-2 focus:ring-admin-accent"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" loading={loading} className="flex-1">
              Создать ученика
            </Button>
            <Button type="button" variant="ghost" onClick={onClose}>
              Отмена
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="bg-admin-accent/10 border border-admin-accent rounded-lg p-4">
            <h3 className="text-lg font-semibold text-admin-text mb-2">
              {createdStudent?.first_name} {createdStudent?.last_name}
            </h3>
            <p className="text-admin-muted text-sm mb-4">
              Класс: {createdStudent?.class}
            </p>

            <div className="space-y-2">
              <div>
                <label className="text-xs text-admin-muted">Логин:</label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="text"
                    value={createdStudent?.generated_login || ''}
                    readOnly
                    className="flex-1 px-3 py-2 bg-admin-surface rounded-lg text-admin-text"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      navigator.clipboard.writeText(
                        createdStudent?.generated_login || ''
                      )
                    }
                  >
                    Копировать
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-xs text-admin-muted">Пароль:</label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="text"
                    value={createdStudent?.generated_password || ''}
                    readOnly
                    className="flex-1 px-3 py-2 bg-admin-surface rounded-lg text-admin-text"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      navigator.clipboard.writeText(
                        createdStudent?.generated_password || ''
                      )
                    }
                  >
                    Копировать
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <p className="text-admin-muted text-sm">
            Сохраните эти данные! Передайте их ученику для входа в систему.
          </p>

          <Button onClick={handleClose} className="w-full">
            Готово
          </Button>
        </div>
      )}
    </Modal>
  );
}
```

**Step 4: Run tests to verify they pass**

**Step 5: Commit**

```bash
git add src/features/teacher/components/AddStudentModal.tsx
git add src/features/teacher/components/__tests__/AddStudentModal.test.tsx
git commit -m "feat: add AddStudentModal component with login generation"
```

---

### Task 8: BulkImportStudentsModal Component

**Files:**
- Create: `src/features/teacher/components/BulkImportStudentsModal.tsx`

**Implementation:** Similar pattern to AddStudentModal - parse input, preview, import, show results.

Due to length constraints, follow the same TDD pattern:
1. Write test
2. Run to fail
3. Implement component with:
   - Textarea for input
   - Checkbox for "use existing logins"
   - Preview table
   - Import and results display
   - CSV download functionality
4. Run tests to pass
5. Commit

---

## Phase 4: UI Components - Pages

### Task 9: Extend StudentsPage

**Files:**
- Modify: `src/features/teacher/pages/StudentsPage.tsx`

**Step 1: Add modal state and handlers**

**Step 2: Add action buttons to header**

**Step 3: Add action buttons to table rows**

**Step 4: Integrate modals**

**Step 5: Test manually**

Navigate to `/teacher/students`, verify:
- "Добавить ученика" button opens AddStudentModal
- "Импорт списком" button opens BulkImportStudentsModal
- "Управление классами" button opens ManageClassesModal
- Table shows edit/delete actions

**Step 6: Commit**

```bash
git add src/features/teacher/pages/StudentsPage.tsx
git commit -m "feat: extend StudentsPage with modals and actions"
```

---

### Task 10: StudentDetailsPage

**Files:**
- Create: `src/features/teacher/pages/StudentDetailsPage.tsx`
- Update: `src/App.tsx` (add route)

**Implementation:**
1. Fetch student with progress
2. Display profile header
3. Credentials card with show/copy/reset
4. Statistics cards
5. Edit/delete actions
6. Modals for editing

**Step 6: Add route**

Update `src/App.tsx`:

```typescript
<Route path="/teacher/students/:id" element={<StudentDetailsPage />} />
```

**Step 7: Commit**

```bash
git add src/features/teacher/pages/StudentDetailsPage.tsx
git add src/App.tsx
git commit -m "feat: add StudentDetailsPage with credential management"
```

---

## Phase 5: Integration Testing

### Task 11: Manual Testing Checklist

**Test each flow:**

1. **Add Single Student**
   - [ ] Open modal
   - [ ] Generate login
   - [ ] Create student
   - [ ] See credentials
   - [ ] Copy to clipboard
   - [ ] Student appears in list

2. **Bulk Import**
   - [ ] Open modal
   - [ ] Paste list
   - [ ] Preview shows correct data
   - [ ] Import all
   - [ ] Download CSV
   - [ ] All students in list

3. **Edit Student**
   - [ ] Click "Подробнее"
   - [ ] Edit name/class
   - [ ] Save changes
   - [ ] Changes reflected

4. **Reset Password**
   - [ ] Open student details
   - [ ] Click reset
   - [ ] Confirm
   - [ ] Password = login

5. **Delete Student**
   - [ ] Click delete
   - [ ] Confirm
   - [ ] Student removed

6. **Manage Classes**
   - [ ] Open modal
   - [ ] Create class
   - [ ] Edit class
   - [ ] Delete class with warning

**Step: Document any bugs found**

Create issues in GitHub or notes file.

**Step: Fix critical bugs**

**Step: Commit fixes**

```bash
git add .
git commit -m "fix: address manual testing issues"
```

---

## Phase 6: Final Polish

### Task 12: Error Handling and UX

**Check:**
- [ ] All API errors show user-friendly messages
- [ ] Loading states on all async operations
- [ ] Disabled buttons during loading
- [ ] Success toasts on operations
- [ ] Form validation feedback
- [ ] Confirmation dialogs for destructive actions

**Step: Add missing error handling**

**Step: Add loading spinners**

**Step: Commit**

```bash
git add .
git commit -m "polish: improve error handling and loading states"
```

---

### Task 13: Documentation Updates

**Files:**
- Update: `README.md`

**Step 1: Update README with new features**

Add to Features section:

```markdown
### Для преподавателей 👨‍🏫

- 📝 **Управление студентами** — добавляйте, редактируйте, удаляйте учеников
- 📊 **Импорт списком** — массовое добавление учеников
- 🔐 **Управление учетными данными** — генерация логинов, сброс паролей
- 🏫 **Управление классами** — создавайте и организуйте классы
- 📈 **Детальная статистика** — просматривайте прогресс каждого ученика
```

**Step 2: Commit**

```bash
git add README.md
git commit -m "docs: update README with student management features"
```

---

## Final Commit and Summary

### Task 14: Create Feature Branch and PR

**Step 1: Ensure all changes committed**

```bash
git status
```

Expected: clean working tree

**Step 2: Push branch**

```bash
git push origin develop
```

**Step 3: Create PR (if using feature branch)**

If working on feature branch:
```bash
gh pr create --title "feat: Student Management System" --body "$(cat <<'EOF'
## Summary
Implements comprehensive student management system for teachers:

- ✅ CRUD operations for students
- ✅ Bulk import with preview
- ✅ Login generation (Cyrillic + digits)
- ✅ Credential management (reset, manual change)
- ✅ Class management (CRUD)
- ✅ Student details page with statistics
- ✅ Database migrations with RLS

## Test Plan
- [x] Manual testing of all flows
- [x] Unit tests for API and utilities
- [x] Component tests for modals
- [x] Integration testing

## Screenshots
[Add screenshots of key features]

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

**Step 4: Celebrate! 🎉**

Feature complete and ready for review.

---

## Appendix: Key Files Reference

**API Layer:**
- `src/features/teacher/api/studentsApi.ts` - Student CRUD + credentials
- `src/features/teacher/api/classesApi.ts` - Class CRUD
- `src/features/teacher/utils/loginGenerator.ts` - Login generation/validation

**Components:**
- `src/features/teacher/components/AddStudentModal.tsx` - Single student creation
- `src/features/teacher/components/BulkImportStudentsModal.tsx` - Bulk import
- `src/features/teacher/components/ManageClassesModal.tsx` - Class management
- `src/features/teacher/components/EditStudentModal.tsx` - Profile editing
- `src/features/teacher/components/EditCredentialsModal.tsx` - Credential editing

**Pages:**
- `src/features/teacher/pages/StudentsPage.tsx` - Student list (extended)
- `src/features/teacher/pages/StudentDetailsPage.tsx` - Student details (new)

**Database:**
- `supabase/migrations/20251102000000_student_management.sql` - Schema changes

**Documentation:**
- `docs/plans/2025-11-02-student-management-design.md` - Design document
- `docs/plans/2025-11-02-student-management-implementation.md` - This plan
