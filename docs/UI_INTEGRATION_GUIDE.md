# 🎨 Руководство по интеграции Proficiency UI

## ✅ Что было добавлено

### Для студентов:

#### 1. **ProficiencyCard** - Карточка уровня владения
Показывает текущий уровень студента (beginner/intermediate/advanced) с баллами.

**Расположение:** `src/features/learning/components/ProficiencyCard.tsx`

**Использование:**
```tsx
import { ProficiencyCard } from '@/features/learning/components/ProficiencyCard';

<ProficiencyCard studentId={userId} />
```

**Что отображает:**
- Бейдж с уровнем (Начинающий/Средний/Продвинутый)
- Прогресс-бар с текущим баллом (0-100)
- Описание уровня
- Дата последней оценки
- Индикатор ручной установки учителем

---

#### 2. **SkillsProgressCard** - Карточка прогресса по навыкам
Показывает прогресс по 12 категориям навыков программирования.

**Расположение:** `src/features/learning/components/SkillsProgressCard.tsx`

**Использование:**
```tsx
import { SkillsProgressCard } from '@/features/learning/components/SkillsProgressCard';

<SkillsProgressCard studentId={userId} />
```

**Что отображает:**
- 12 навыков с процентом владения (0-100%)
- Цветовые индикаторы: красный (0-39%), желтый (40-69%), зеленый (70-100%)
- Количество попыток по каждому навыку
- Успешность (правильные/всего попытки)
- Дата последней практики

**Навыки:**
1. Синтаксис (syntax)
2. Переменные (variables)
3. Операторы (operators)
4. Условия (conditionals)
5. Циклы (loops)
6. Функции (functions)
7. Массивы (arrays)
8. Объекты (objects)
9. Ввод/Вывод (io)
10. Отладка (debugging)
11. Алгоритмы (algorithms)
12. Тестирование (testing)

---

#### 3. **ProficiencyBadge** - Бейдж уровня
Универсальный компонент для отображения бейджа с уровнем.

**Расположение:** `src/shared/components/ui/ProficiencyBadge.tsx`

**Использование:**
```tsx
import { ProficiencyBadge } from '@/shared/components/ui';

<ProficiencyBadge
  level="intermediate"
  score={65}
  showScore={true}
  size="md"
/>
```

**Параметры:**
- `level`: 'beginner' | 'intermediate' | 'advanced'
- `score?`: number (0-100)
- `showScore?`: boolean - показывать ли балл
- `size?`: 'sm' | 'md' | 'lg'

---

### Для учителей:

#### 1. **Обновленный StudentDetailsPage**
Уже имеет интеграцию с proficiency system.

**Функциональность:**
- Просмотр уровня студента
- История изменений уровня
- Профиль навыков студента
- Слабые места
- Ручная установка уровня
- Пересчет уровня

---

## 📊 API функции

### Для студентов (`src/shared/api/proficiencyApi.ts`):

```typescript
// Получить данные о proficiency студента
getStudentProficiency(studentId: string): Promise<ProficiencyData | null>

// Получить все навыки студента
getStudentSkills(studentId: string): Promise<SkillProficiency[]>

// Получить слабые места (топ N навыков с низким уровнем)
getStudentWeakAreas(studentId: string, limit?: number): Promise<WeakArea[]>

// Получить историю изменений уровня
getProficiencyHistory(studentId: string, limit?: number): Promise<ProficiencyHistory[]>
```

### Для учителей (`src/features/teacher/api/proficiencyApi.ts`):

```typescript
// Установить уровень вручную
setStudentProficiency(
  studentId: string,
  level: ProficiencyLevel,
  score: number,
  reason?: string
): Promise<void>

// Включить автоматический расчет
enableAutoProficiency(studentId: string): Promise<void>

// Пересчитать уровень
recalculateStudentProficiency(studentId: string): Promise<{
  score: number;
  level: ProficiencyLevel;
}>

// Получить всех студентов с уровнями
getAllStudentsWithProficiency(): Promise<StudentWithProficiency[]>

// Статистика по классу
getClassProficiencyStats(className?: string): Promise<ProficiencyStats>
```

---

## 🎯 Типы данных

### ProficiencyLevel
```typescript
type ProficiencyLevel = 'beginner' | 'intermediate' | 'advanced'
```

### ProficiencyData
```typescript
interface ProficiencyData {
  level: ProficiencyLevel;
  score: number; // 0-100
  last_assessed: string | null;
  manual_override: boolean;
}
```

### SkillProficiency
```typescript
interface SkillProficiency {
  skill_name: string;
  skill_display_name: string;
  proficiency_percentage: number; // 0-100
  submissions_count: number;
  successful_count: number;
  last_practiced: string | null;
}
```

---

## 🚀 Как использовать в новых компонентах

### Пример 1: Показать уровень в профиле студента

```tsx
import { ProficiencyBadge } from '@/shared/components/ui';
import { useAuthStore } from '@/features/auth/store/authStore';

function StudentProfile() {
  const { profile } = useAuthStore();

  if (!profile || !profile.proficiency_level) return null;

  return (
    <div>
      <h2>Ваш уровень</h2>
      <ProficiencyBadge
        level={profile.proficiency_level}
        score={profile.proficiency_score}
        showScore={true}
      />
    </div>
  );
}
```

### Пример 2: Список студентов с уровнями (для учителя)

```tsx
import { useEffect, useState } from 'react';
import { getAllStudentsWithProficiency } from '@/features/teacher/api/proficiencyApi';
import { ProficiencyBadge } from '@/shared/components/ui';

function StudentsList() {
  const [students, setStudents] = useState([]);

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    const data = await getAllStudentsWithProficiency();
    setStudents(data);
  };

  return (
    <div>
      {students.map(student => (
        <div key={student.id}>
          <span>{student.full_name}</span>
          <ProficiencyBadge
            level={student.proficiency_level}
            score={student.proficiency_score}
          />
        </div>
      ))}
    </div>
  );
}
```

### Пример 3: Показать слабые места студента

```tsx
import { useEffect, useState } from 'react';
import { getStudentWeakAreas } from '@/shared/api/proficiencyApi';

function WeakAreasWidget({ studentId }: { studentId: string }) {
  const [weakAreas, setWeakAreas] = useState([]);

  useEffect(() => {
    loadWeakAreas();
  }, [studentId]);

  const loadWeakAreas = async () => {
    const data = await getStudentWeakAreas(studentId, 3);
    setWeakAreas(data);
  };

  return (
    <div>
      <h3>Требуют внимания:</h3>
      <ul>
        {weakAreas.map(area => (
          <li key={area.skill_name}>
            {area.skill_display_name}: {area.proficiency_percentage}%
          </li>
        ))}
      </ul>
    </div>
  );
}
```

---

## 🎨 Цветовая схема

### Уровни proficiency:

- **Beginner (0-40)**: Желтый
  - Badge: `bg-yellow-500/20 text-yellow-400 border-yellow-500/30`

- **Intermediate (41-70)**: Синий
  - Badge: `bg-blue-500/20 text-blue-400 border-blue-500/30`

- **Advanced (71-100)**: Фиолетовый
  - Badge: `bg-purple-500/20 text-purple-400 border-purple-500/30`

### Навыки (SkillsProgressCard):

- **0-39%**: Красный → Оранжевый градиент (требует внимания)
- **40-69%**: Желтый → Янтарный градиент (хорошо)
- **70-100%**: Зеленый → Изумрудный градиент (отлично)

---

## 📱 Где используется

### Студенты:
- ✅ **ProgressPage** (`src/features/learning/pages/ProgressPage.tsx`)
  - Отображает ProficiencyCard и SkillsProgressCard

### Учителя:
- ✅ **StudentDetailsPage** (`src/features/teacher/pages/StudentDetailsPage.tsx`)
  - Полная информация о proficiency студента
  - История изменений
  - Профиль навыков
  - Управление уровнем

---

## 🔄 Автоматическое обновление

Система proficiency обновляется **автоматически** после каждой submission студента через триггеры базы данных:

1. Студент отправляет код → создается submission
2. Trigger `update_proficiency_on_submission` → обновляет proficiency_level
3. Trigger `update_skills_on_submission` → обновляет user_skill_profile

**UI автоматически подгружает свежие данные** при загрузке страницы.

---

## 🧪 Тестирование

### Проверить работу UI:

1. **Как студент:**
   - Перейти на страницу "Прогресс"
   - Должны отобразиться карточки с уровнем и навыками

2. **Как учитель:**
   - Открыть StudentDetailsPage для любого студента
   - Должны отобразиться:
     - Уровень proficiency
     - Профиль навыков
     - История изменений (если есть)
     - Кнопки управления уровнем

---

## 📝 Полезные хелперы

В `src/shared/types/proficiency.types.ts`:

```typescript
// Получить цвет для уровня
getProficiencyColor(level: ProficiencyLevel): string

// Получить цвет бейджа
getProficiencyBadgeColor(level: ProficiencyLevel): string

// Получить русское название уровня
getProficiencyLabel(level: ProficiencyLevel): string

// Получить русское название навыка
getSkillDisplayName(skillName: string): string
```

---

## 🚀 Следующие шаги

### Рекомендуемые улучшения:

1. **Radar Chart** для визуализации навыков
   - Использовать библиотеку типа `recharts` или `chart.js`
   - Круговая диаграмма с 12 осями (по одной на навык)

2. **График истории proficiency**
   - Линейный график изменения score во времени
   - Показывать точки изменения уровня

3. **Уведомления о повышении уровня**
   - Toast notification когда студент повышает уровень
   - Анимация/конфетти

4. **Badges/Достижения**
   - "Первый продвинутый навык"
   - "Мастер всех навыков"
   - "Быстрый прогресс"

5. **Страница "Навыки" в навигации студента**
   - Отдельная страница только для навыков
   - Детальная информация по каждому навыку
   - Рекомендации по улучшению

---

## 🎉 Готово!

UI интеграция профициенси завершена и работает!

Студенты теперь видят свой уровень и прогресс по навыкам.
Учителя могут отслеживать и управлять уровнями студентов.
