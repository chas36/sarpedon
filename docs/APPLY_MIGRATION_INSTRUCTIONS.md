# Инструкция по применению миграции рекомендаций

## 🐛 Исправленная ошибка

**Проблема:** `column "jsonb_array_elements_text" does not exist`

**Причина:** Неправильный синтаксис использования функции `jsonb_array_elements_text` в SQL

**Решение:** Исправлен синтаксис в строках 95-97 функции `get_recommended_levels`

---

## 📋 Как применить миграцию

### Способ 1: Через Supabase Dashboard (рекомендуется)

1. **Откройте Supabase Dashboard:**
   - Перейдите на https://supabase.com/dashboard
   - Выберите ваш проект: `uanfulofnrhcqugmxpna`

2. **Откройте SQL Editor:**
   - В левом меню выберите **SQL Editor**
   - Нажмите **New Query**

3. **Скопируйте миграцию:**
   - Откройте файл `apply_recommendations_migration.sql` (251 строка)
   - Выберите всё (Ctrl+A) и скопируйте (Ctrl+C)

4. **Выполните миграцию:**
   - Вставьте скопированный SQL в редактор (Ctrl+V)
   - Нажмите **Run** (или нажмите Ctrl+Enter)
   - Дождитесь сообщения "Success. No rows returned"

5. **Проверьте результат:**
   - Функции должны создаться без ошибок
   - Вы увидите зелёную галочку успешного выполнения

---

### Способ 2: Через Supabase CLI (если установлен)

```bash
# Из корневой директории проекта
supabase db push
```

---

## ✅ После применения миграции

1. **Перезагрузите приложение** (Ctrl+R в браузере)

2. **Войдите как студент** и проверьте:
   - ✅ Блок "🎯 Рекомендуем для вас" отображается без ошибок
   - ✅ Показываются топ-5 рекомендованных заданий
   - ✅ Нет ошибок в консоли браузера

3. **Проверьте адаптивную фильтрацию:**
   - ✅ Включите/выключите "Адаптивная фильтрация"
   - ✅ Проверьте, что задания фильтруются по уровню сложности

---

## 🔍 Что было исправлено?

### Было (неправильно):
```sql
ARRAY(
  SELECT jsonb_array_elements_text(l.target_skills)
  WHERE jsonb_array_elements_text = ANY(v_weak_skills)
  LIMIT 2
)
```

❌ PostgreSQL воспринимал `jsonb_array_elements_text` как название колонки

### Стало (правильно):
```sql
ARRAY(
  SELECT skill
  FROM jsonb_array_elements_text(l.target_skills) AS skill
  WHERE skill = ANY(v_weak_skills)
  LIMIT 2
)
```

✅ Правильный синтаксис: функция в FROM clause, алиас `skill` для результата

---

## 📞 Если возникли проблемы

1. **Проверьте, что функция `get_student_weak_areas` существует:**
   ```sql
   SELECT routine_name
   FROM information_schema.routines
   WHERE routine_name = 'get_student_weak_areas';
   ```

2. **Проверьте, что таблица `profiles` имеет колонку `proficiency_level`:**
   ```sql
   SELECT column_name
   FROM information_schema.columns
   WHERE table_name = 'profiles'
     AND column_name = 'proficiency_level';
   ```

3. **Если ошибка повторяется:**
   - Удалите старые версии функций:
     ```sql
     DROP FUNCTION IF EXISTS get_recommended_levels CASCADE;
     DROP FUNCTION IF EXISTS get_difficulty_range_for_proficiency CASCADE;
     DROP FUNCTION IF EXISTS get_levels_for_proficiency CASCADE;
     ```
   - Затем примените миграцию снова

---

## 📊 Функции, которые будут созданы:

1. **`get_recommended_levels(student_id, limit)`**
   - Возвращает персонализированные рекомендации
   - Match score: 40 баллов (сложность) + 60 баллов (навыки)

2. **`get_difficulty_range_for_proficiency(level)`**
   - Возвращает диапазон сложности для уровня
   - Beginner: 1-4, Intermediate: 4-7, Advanced: 7-10

3. **`get_levels_for_proficiency(student_id, include_completed)`**
   - Возвращает задания с фильтрацией по уровню
   - С флагом `is_recommended` для рекомендованных

---

Готово! После применения миграции система рекомендаций заработает корректно! 🚀
