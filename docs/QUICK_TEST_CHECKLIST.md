# ✅ Быстрый чеклист тестирования Sarpedon

Краткая версия для быстрой проверки основных функций.

## 🔧 Предварительная подготовка

```bash
# 1. Применить миграции
cd /home/user/sarpedon
# Через Dashboard или CLI

# 2. Проверить применение
psql $DATABASE_URL -c "SELECT COUNT(*) FROM skill_categories;" # Должно быть 12
psql $DATABASE_URL -c "SELECT COUNT(*) FROM entrance_tests;" # Должен быть 1
```

## 📝 Быстрые тесты (15 минут)

### ✅ Тест 1: Proficiency (3 мин)

**Действия:**
1. Войти как студент
2. Решить любую задачу
3. Проверить в БД:

```sql
SELECT proficiency_level, proficiency_score FROM profiles WHERE id = 'STUDENT_ID';
SELECT COUNT(*) FROM proficiency_history WHERE student_id = 'STUDENT_ID';
```

**✓ Ожидается:** proficiency обновлен, запись в history создана

---

### ✅ Тест 2: Навыки (3 мин)

**Действия:**
1. Обновить уровень:
```sql
UPDATE levels SET target_skills = '["loops"]'::jsonb WHERE id = 'LEVEL_ID';
```
2. Решить этот уровень как студент
3. Проверить:
```sql
SELECT * FROM user_skill_profile WHERE user_id = 'STUDENT_ID';
```

**✓ Ожидается:** Запись для "loops" создана

---

### ✅ Тест 3: AI подсказки (2 мин)

**Действия:**
1. Установить разные proficiency для 2 студентов:
```sql
UPDATE profiles SET proficiency_level = 'beginner' WHERE id = 'STUDENT_A';
UPDATE profiles SET proficiency_level = 'advanced' WHERE id = 'STUDENT_B';
```
2. Отправить одинаковый неправильный код от обоих
3. Сравнить AI ответы

**✓ Ожидается:** Разные стили подсказок (конкретные vs архитектурные)

---

### ✅ Тест 4: Teacher Dashboard (3 мин)

**Действия:**
1. Войти как teacher
2. Открыть `/teacher/students`
3. Кликнуть "Подробнее" на студенте
4. Проверить секцию "Уровень владения"

**✓ Ожидается:**
- Уровень и score видны
- Слабые места отображены
- Кнопки "История", "Установить вручную", "Пересчитать" работают

---

### ✅ Тест 5: Входной тест - Студент (2 мин)

**Действия:**
1. Создать студента без proficiency:
```sql
UPDATE profiles SET proficiency_level = NULL WHERE id = 'NEW_STUDENT';
```
2. Войти как этот студент
3. Начать и завершить входной тест
4. Проверить:
```sql
SELECT proficiency_level FROM profiles WHERE id = 'NEW_STUDENT';
```

**✓ Ожидается:** proficiency_level установлен автоматически

---

### ✅ Тест 6: Входной тест - Teacher (2 мин)

**Действия:**
1. Войти как teacher
2. Открыть `/teacher/entrance-tests`
3. Создать тест
4. Добавить 2-3 вопроса
5. Активировать тест

**✓ Ожидается:** Тест создан, вопросы добавлены, активация работает

---

## 🐛 Быстрая проверка проблем

### Если proficiency не обновляется:
```sql
-- Проверить триггер
SELECT tgname FROM pg_trigger WHERE tgrelid = 'submissions'::regclass;
-- Должен быть: after_submission_update_proficiency
```

### Если навыки не обновляются:
```sql
-- Проверить target_skills
SELECT target_skills FROM levels LIMIT 5;
-- Не должны быть все NULL
```

### Если тест не показывается:
```sql
-- Проверить активные тесты
SELECT * FROM entrance_tests WHERE is_active = true;
-- Должен быть минимум 1
```

---

## 📊 Финальная SQL проверка (1 запрос)

```sql
-- Быстрая проверка всей системы
SELECT
  (SELECT COUNT(*) FROM skill_categories) as skills,
  (SELECT COUNT(*) FROM profiles WHERE proficiency_level IS NOT NULL) as students_with_proficiency,
  (SELECT COUNT(*) FROM user_skill_profile) as skill_records,
  (SELECT COUNT(*) FROM proficiency_history) as proficiency_changes,
  (SELECT COUNT(*) FROM entrance_tests WHERE is_active = true) as active_tests,
  (SELECT COUNT(*) FROM entrance_test_questions) as test_questions,
  (SELECT COUNT(*) FROM entrance_test_attempts WHERE status = 'completed') as completed_tests;
```

**✓ Ожидаемые минимумы:**
- skills: 12
- active_tests: 1
- test_questions: 12

---

## 🎯 Результат

Если все 6 тестов прошли успешно - **система работает корректно! ✅**

Переходите к следующему этапу: персонализированные рекомендации.
