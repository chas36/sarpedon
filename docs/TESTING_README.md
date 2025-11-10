# 🧪 Тестирование системы Sarpedon

Документация для тестирования адаптивной системы обучения.

## 📚 Доступные документы

### 1. **MIGRATION_AND_TESTING_GUIDE.md** (Полное руководство)
Подробное руководство с пошаговыми инструкциями:
- Применение всех миграций
- Проверка успешности
- Обновление существующих данных
- Детальный план тестирования всех функций
- Устранение проблем

**Когда использовать:** Для полного цикла развертывания и тестирования

### 2. **QUICK_TEST_CHECKLIST.md** (Быстрый чеклист)
Краткая версия для быстрой проверки за 15 минут:
- 6 основных тестов
- Быстрая диагностика проблем
- Финальная проверка одним запросом

**Когда использовать:** Для быстрой проверки после изменений

### 3. **verification_queries.sql** (SQL скрипт)
Готовый SQL скрипт для автоматической проверки:
- Проверка структуры БД
- Проверка данных
- Проверка RLS политик
- Статистика системы
- Итоговый отчет

**Когда использовать:** Для автоматизированной проверки через psql

## 🚀 Быстрый старт

### Шаг 1: Применить миграции

**Через Supabase Dashboard:**
```
1. Откройте https://app.supabase.com
2. Выберите проект
3. SQL Editor
4. Скопируйте и выполните каждую миграцию:
   - supabase/migrations/20251108000000_add_proficiency_levels.sql
   - supabase/migrations/20251109000000_add_skill_tracking.sql
   - supabase/migrations/20251110000000_add_entrance_tests.sql
```

**Через CLI:**
```bash
cd /home/user/sarpedon
npx supabase db push
```

### Шаг 2: Проверить миграции

```bash
# Запустить verification скрипт
psql $DATABASE_URL -f docs/verification_queries.sql

# Или вручную проверить
psql $DATABASE_URL -c "SELECT COUNT(*) FROM skill_categories;" # Должно быть 12
psql $DATABASE_URL -c "SELECT COUNT(*) FROM entrance_tests;" # Минимум 1
```

### Шаг 3: Обновить target_skills

```sql
-- Выполните в SQL Editor
-- Содержимое файла: docs/improvements/update_target_skills.sql
```

### Шаг 4: Запустить тесты

**Вариант A - Быстрый (15 мин):**
```bash
# Следуйте QUICK_TEST_CHECKLIST.md
# 6 основных тестов + финальная проверка
```

**Вариант B - Полный (60 мин):**
```bash
# Следуйте MIGRATION_AND_TESTING_GUIDE.md
# 7 детальных тестов + e2e проверка
```

## ✅ Критерии успеха

После тестирования система должна:

- [x] **Базовая структура**
  - 7/7 таблиц созданы
  - 9/9 функций созданы
  - 2/2 триггера созданы
  - 12 категорий навыков

- [x] **Proficiency система**
  - Автоматически обновляется после submissions
  - История изменений ведется
  - Ручное управление работает

- [x] **Skill tracking**
  - Навыки отслеживаются по target_skills
  - Weak areas определяются
  - Статистика доступна

- [x] **AI адаптация**
  - Разные подсказки для разных уровней
  - Beginner: конкретные (с номерами строк)
  - Intermediate: концептуальные
  - Advanced: архитектурные

- [x] **Teacher Dashboard**
  - Просмотр proficiency всех студентов
  - Детальная информация по навыкам
  - Ручное управление уровнями
  - История изменений доступна

- [x] **Entrance tests**
  - Студенты могут проходить тесты
  - Уровень определяется автоматически
  - Преподаватели могут создавать тесты
  - Управление вопросами работает

## 🔍 Быстрая диагностика

### Проблема: "Миграция не применяется"

```sql
-- Проверьте ошибки
SELECT * FROM _supabase_migrations ORDER BY version DESC;
```

### Проблема: "Proficiency не обновляется"

```sql
-- Проверьте триггер
SELECT * FROM pg_trigger WHERE tgname = 'after_submission_update_proficiency';

-- Проверьте manual_override
SELECT id, proficiency_manual_override FROM profiles WHERE role = 'student';
```

### Проблема: "Навыки не отслеживаются"

```sql
-- Проверьте target_skills
SELECT COUNT(*) FROM levels WHERE target_skills IS NOT NULL;

-- Должно быть > 0
```

### Проблема: "Входной тест не показывается"

```sql
-- Проверьте активные тесты
SELECT * FROM entrance_tests WHERE is_active = true;

-- Проверьте, не завершил ли студент уже
SELECT * FROM entrance_test_attempts WHERE student_id = 'ID' AND status = 'completed';
```

## 📊 Один SQL для проверки всего

```sql
-- Быстрая проверка всей системы
SELECT
  (SELECT COUNT(*) FROM skill_categories) as skills, -- Должно быть 12
  (SELECT COUNT(*) FROM profiles WHERE proficiency_level IS NOT NULL) as proficiency_count,
  (SELECT COUNT(*) FROM user_skill_profile) as skill_records,
  (SELECT COUNT(*) FROM proficiency_history) as proficiency_changes,
  (SELECT COUNT(*) FROM entrance_tests WHERE is_active = true) as active_tests, -- Минимум 1
  (SELECT COUNT(*) FROM entrance_test_questions) as test_questions, -- Минимум 12
  (SELECT COUNT(*) FROM entrance_test_attempts WHERE status = 'completed') as completed_tests;
```

## 🎯 Следующие шаги после успешного тестирования

1. **Персонализированные рекомендации**
   - Рекомендация уровней на основе weak_areas
   - Remedial задания для проблемных навыков

2. **Адаптивный выбор заданий**
   - Фильтрация по proficiency_level
   - "Рекомендуется для вас"

3. **Улучшенная аналитика**
   - Графики прогресса
   - Тепловая карта навыков класса

## 📞 Поддержка

При проблемах проверьте:
1. Логи Supabase: Dashboard → Database → Logs
2. Browser Console: DevTools → Console
3. Network requests: DevTools → Network

## 🎉 Готово!

После успешного тестирования ваша система полностью функциональна и готова к использованию в продакшене!
