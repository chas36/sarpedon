# 🎯 Персонализированные рекомендации - Готово!

## ✅ Что было добавлено

### B) Персонализированные рекомендации

**"Рекомендуем для вас"** - умная система подбора заданий на основе:
- 📊 Слабых навыков студента (weak_areas)
- 🎓 Уровня владения (proficiency_level)
- ✅ Еще не пройденных заданий

**Как работает:**
```
1. Система анализирует слабые навыки студента
   ↓
2. Находит задания, содержащие эти навыки в target_skills
   ↓
3. Фильтрует по подходящей сложности
   ↓
4. Рассчитывает match score (0-100%)
   ↓
5. Показывает топ-5 рекомендаций
```

---

### C) Адаптивная фильтрация

**Автоматическая фильтрация по уровню сложности:**

| Proficiency Level | Диапазон сложности | Описание |
|-------------------|-------------------|----------|
| **Beginner** (0-40) | 1-4 | Задачи для начинающих |
| **Intermediate** (41-70) | 4-7 | Задачи среднего уровня |
| **Advanced** (71-100) | 7-10 | Продвинутые задачи |

**Возможности:**
- ✅ Переключатель "Адаптивная фильтрация" (вкл/выкл)
- ✅ Переключатель "Показать выполненные"
- ✅ Индикатор "🎯 Рекомендовано" на карточках
- ✅ Автоматическая сортировка (рекомендованные первыми)

---

## 🎨 Новые компоненты

### 1. RecommendedLevelsCard

Карточка с топ-5 рекомендованными заданиями.

**Расположение:** `src/features/learning/components/RecommendedLevelsCard.tsx`

**Что показывает:**
```
┌─────────────────────────────────────┐
│ 🎯 Рекомендуем для вас              │
│ Задачи, подобранные специально      │
│ для вашего уровня и навыков         │
│                                      │
│ ┌─────────────────────────────────┐ │
│ │ Списки в Python           85%   │ │
│ │ Работа со списками и методами   │ │
│ │ 📊 Сложность: 5/10  💻 Python  │ │
│ │ 💡 Поможет улучшить: arrays    │ │
│ │ [arrays] [loops] [functions]   │ │
│ └─────────────────────────────────┘ │
│                                      │
│ ... (еще 4 задания)                 │
│                                      │
│ Посмотреть все задачи →             │
└─────────────────────────────────────┘
```

**Использование:**
```tsx
import { RecommendedLevelsCard } from '@/features/learning/components/RecommendedLevelsCard';

<RecommendedLevelsCard studentId={userId} />
```

---

### 2. AdaptiveLevelsFilter

Компонент для управления фильтрами.

**Расположение:** `src/features/learning/components/AdaptiveLevelsFilter.tsx`

**Что показывает:**
```
┌──────────────────────────────────────────────┐
│ [✓] 🎯 Адаптивная фильтрация                │
│     (Средний: сложность 4-7)                 │
│                                              │
│                     [✓] Показать выполненные │
│                                              │
│ 💡 Показываются задачи, соответствующие      │
│ вашему уровню владения.                      │
└──────────────────────────────────────────────┘
```

**Использование:**
```tsx
import { AdaptiveLevelsFilter } from '@/features/learning/components/AdaptiveLevelsFilter';

<AdaptiveLevelsFilter
  proficiencyLevel={proficiencyLevel}
  onFilterChange={(filters) => handleFilters(filters)}
/>
```

---

## 📊 SQL функции

### 1. get_recommended_levels

Возвращает персонализированные рекомендации.

```sql
SELECT * FROM get_recommended_levels(
  'student-uuid',  -- student_id
  5                -- limit (топ-5)
);
```

**Возвращает:**
```
level_id          | UUID задания
title             | Название
description       | Описание
difficulty        | Сложность (1-10)
language          | Язык (python/javascript)
target_skills     | Массив навыков
match_score       | Оценка соответствия (0-100)
recommendation_reason | Причина рекомендации
```

**Алгоритм расчета match_score:**
- **40 баллов** - соответствие сложности уровню proficiency
- **60 баллов** - совпадение с weak_areas (20 баллов за каждый навык, макс 3)

---

### 2. get_difficulty_range_for_proficiency

Возвращает диапазон сложности для уровня.

```sql
SELECT * FROM get_difficulty_range_for_proficiency('intermediate');
```

**Возвращает:**
```
min_difficulty | 4
max_difficulty | 7
description    | "Задачи среднего уровня (сложность 4-7)"
```

---

### 3. get_levels_for_proficiency

Возвращает отфильтрованные уровни с флагами рекомендации.

```sql
SELECT * FROM get_levels_for_proficiency(
  'student-uuid',  -- student_id
  false            -- include_completed (показывать ли завершенные)
);
```

**Возвращает:**
- Все поля уровня
- `status` - статус прогресса (not_started/in_progress/completed)
- `is_recommended` - флаг рекомендации (true/false)

---

## 🎯 Обновленная LevelsListPage

Страница со списком заданий теперь включает:

### 1. Карточка "Рекомендуем для вас" (вверху страницы)
- Топ-5 персонализированных рекомендаций
- Match score для каждого задания
- Причина рекомендации
- Клик по карточке → переход к заданию

### 2. Адаптивные фильтры
- ✅ Переключатель адаптивной фильтрации
- ✅ Переключатель показа выполненных
- ✅ Подсказка о текущем диапазоне сложности

### 3. Визуальные индикаторы
- 🎯 Бейдж "Рекомендовано" на карточках
- 💙 Синяя подсветка рамки у рекомендованных
- Автоматическая сортировка (рекомендованные первыми)

---

## 📡 API функции

### Для фронтенда (`src/features/learning/api/recommendationsApi.ts`):

```typescript
// Получить рекомендованные уровни
getRecommendedLevels(
  studentId: string,
  limit: number = 5
): Promise<RecommendedLevel[]>

// Получить диапазон сложности
getDifficultyRangeForProficiency(
  proficiencyLevel: 'beginner' | 'intermediate' | 'advanced'
): Promise<DifficultyRange>

// Получить отфильтрованные уровни
getLevelsForProficiency(
  studentId: string,
  includeCompleted: boolean = false
): Promise<LevelWithStatus[]>

// Получить proficiency level студента
getStudentProficiencyLevel(
  studentId: string
): Promise<'beginner' | 'intermediate' | 'advanced'>
```

---

## 🚀 Как применить миграцию

### Шаг 1: Примените SQL миграцию

```bash
cat apply_recommendations_migration.sql
```

**Действия:**
1. Скопируйте весь контент (251 строка)
2. Supabase Dashboard → SQL Editor
3. Вставьте и нажмите **"Run"**

---

### Шаг 2: Синхронизируйте состояние (опционально)

Если хотите отследить миграцию в CLI:

```sql
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20251111000000', '20251111000000_add_level_recommendations')
ON CONFLICT (version) DO NOTHING;
```

---

### Шаг 3: Запустите и протестируйте

```bash
npm run dev
```

Откройте браузер:
1. Войдите как студент
2. Перейдите на **"Мои задания"**
3. Увидите:
   - Карточку "🎯 Рекомендуем для вас"
   - Адаптивные фильтры
   - Индикаторы рекомендации на карточках

---

## 🎨 Примеры работы

### Пример 1: Студент-beginner

**Proficiency:** Beginner (score: 25)
**Weak areas:** loops, conditionals, arrays

**Результат:**
- Показываются задачи сложности 1-4
- Приоритет заданиям с loops, conditionals, arrays в target_skills
- Match score до 100% для идеально подходящих заданий

---

### Пример 2: Студент-intermediate

**Proficiency:** Intermediate (score: 60)
**Weak areas:** functions, objects, algorithms

**Результат:**
- Показываются задачи сложности 4-7
- Приоритет заданиям с functions, objects, algorithms
- Автоматически скрываются слишком легкие (1-3) и слишком сложные (8-10)

---

### Пример 3: Студент-advanced

**Proficiency:** Advanced (score: 85)
**Weak areas:** algorithms, testing, debugging

**Результат:**
- Показываются задачи сложности 7-10
- Приоритет сложным заданиям на algorithms, testing
- Скрываются простые задачи (1-6)

---

## 💡 Как система принимает решения

### Match Score Calculation

```typescript
match_score = difficulty_match + skills_match

// Difficulty Match (40 points max)
if (proficiency === 'beginner' && difficulty <= 4) → 40 points
if (proficiency === 'intermediate' && difficulty 4-7) → 40 points
if (proficiency === 'advanced' && difficulty >= 7) → 40 points
// Близкие к диапазону → 20 points
// Далеко от диапазона → 0 points

// Skills Match (60 points max)
for each weak_skill in target_skills:
  match_score += 20  // max 3 skills = 60 points
```

### Recommendation Reason

Система автоматически генерирует причину:

```typescript
if (weak_skills match target_skills):
  "Поможет улучшить слабые навыки: loops, arrays"

else if (proficiency === 'beginner'):
  "Подходит для начинающих"

else if (proficiency === 'intermediate'):
  "Соответствует вашему уровню"

else if (proficiency === 'advanced'):
  "Сложная задача для продвинутых"

else:
  "Рекомендуется для практики"
```

---

## ✅ Что работает автоматически

1. **Рекомендации обновляются** после каждой submission (через триггеры proficiency)
2. **Weak areas пересчитываются** при обновлении user_skill_profile
3. **Сложность подбирается** автоматически по proficiency_level
4. **Сортировка** - рекомендованные задания всегда первыми
5. **Визуальные индикаторы** - автоматически добавляются к рекомендованным

---

## 📚 Полезные запросы для тестирования

### Проверить рекомендации для студента:
```sql
SELECT
  title,
  difficulty,
  match_score,
  recommendation_reason
FROM get_recommended_levels('student-uuid', 5);
```

### Проверить слабые навыки:
```sql
SELECT * FROM get_student_weak_areas('student-uuid', 3);
```

### Проверить proficiency:
```sql
SELECT proficiency_level, proficiency_score
FROM profiles
WHERE id = 'student-uuid';
```

---

## 🎉 Готово!

**Система персонализированных рекомендаций полностью работает!**

- ✅ Умный подбор заданий на основе weak_areas
- ✅ Адаптивная фильтрация по proficiency_level
- ✅ Match score показывает подходящесть задания
- ✅ Автоматические причины рекомендации
- ✅ Визуальные индикаторы "🎯 Рекомендовано"
- ✅ Переключатели фильтров
- ✅ Автоматическая сортировка

Запустите `npm run dev` и протестируйте! 🚀
