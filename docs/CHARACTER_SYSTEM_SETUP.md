# Character System - Setup Guide

**Дата:** 6 ноября 2025
**Статус:** ✅ Полностью реализовано

---

## 🎉 Система персонажей готова!

Все три фазы завершены:
- ✅ **Phase 1:** Database, Config, API, Logic
- ✅ **Phase 2:** UI Components
- ✅ **Phase 3:** Integration

---

## 📋 Установка и запуск

### Шаг 1: Применить миграцию базы данных

```bash
# Перейти в директорию проекта
cd /path/to/sarpedon

# Применить миграцию через Supabase CLI (если установлен)
supabase db push

# ИЛИ вручную через Supabase Dashboard:
# 1. Открыть SQL Editor в Supabase Dashboard
# 2. Скопировать содержимое файла:
#    supabase/migrations/20251106000001_create_character_system.sql
# 3. Выполнить SQL
```

### Шаг 2: Запустить dev сервер

```bash
npm run dev
```

### Шаг 3: Протестировать систему

1. Зайти как студент
2. Открыть любой уровень (`/student/levels/:id/solve`)
3. Написать и запустить код
4. Наблюдать появление персонажа! 🐻

---

## 🐻 Персонажи и когда они появляются

### 🐻 Мусква (CEO)
**Когда появляется:**
- ✅ Успех с качеством 90+ → "Тебе повезло. Хе-хе-хе!" (rich mood)
- ❌ Ошибка после 3+ попыток → "Опять?! Я тебя обсираю!" (angry mood)
- ❌ Много ошибок подряд → "Быть дурочком - природный дар" (evil_laugh mood)
- 🦉 Случайно 2-8% → ФНС/Совы испуг (scared mood)

### 🧸 Джонни (Стажёр)
**Когда появляется:**
- 👋 Первая попытка → "Ур-ур! Ур-ур-ур-ур!" (greeting)
- ❌ Ошибка на 1-2 попытке → "Ур-ур-ур... Ур-ур!" (supportive mood)
- ✅ Успех → "Ур-ур!!! Ур-ур-ур!" (happy mood)

### 🐼 Панда (Баобао)
**Когда появляется:**
- ☕ Coffee Break Event (5-15% вероятность)
- Вместе с Джонни уходят на капучино!

### 🐻‍❄️ Тапка и Потапка (Коммунисты)
**Когда появляются:**
- 🚩 Union Protest Event (2-30% вероятность)
- 30% на праздники: 1 мая, 7 ноября
- "Раздуем пламя коммунистической революции! Долой Бурого!"

---

## 🎯 События

### ☕ Coffee Break (5-15%)
- Джонни + Панда прячутся
- "Ур-ур-ур прячемся! Ур-ур радость!"
- Длительность: 5 секунд

### 🚩 Union Protest (2-30%)
- Тапка + Потапка с флагами
- "Долой Бурого! Профсоюз стажёров!"
- Мусква: "Опять мои коммунистические дети!"
- Длительность: 8 секунд

### 🦉 FNS Scare (2-8%)
- Мусква убегает от сов
- "Бадютька! Дябя-дябя!"
- Длительность: 4 секунды

### 👻 Glasha Mention (5-10%)
- Джонни дразнит: "Ур-ур Глаша!"
- Мусква паникует: "Глаша?! Где?!"
- Длительность: 6 секунд

---

## 🔧 Конфигурация

### Добавить новую фразу

Редактировать: `src/features/characters/config/characterPhrases.ts`

```typescript
// Пример: Добавить новую фразу для Мусквы
export const MUSKVA_PHRASES = {
  first_error: [
    { mood: 'business', text: 'Дурачок! Хе-хе-хе!', emoji: '🐻' },
    // ===== ДОБАВИТЬ НОВУЮ ФРАЗУ =====
    { mood: 'business', text: 'Опять ошибаешься? Дурачок!', emoji: '👑' },
  ],
  // ...
};
```

### Изменить вероятность события

Редактировать: `src/features/characters/config/eventConfig.ts`

```typescript
export const EVENT_PROBABILITIES = {
  coffee_break: {
    baseChance: 0.10,  // Изменить с 5% на 10%
    cooldown: 5,       // Изменить cooldown с 10 на 5 решений
  },
  // ...
};
```

### Добавить новое настроение

1. Добавить в тип: `src/features/characters/config/characterPhrases.ts`
```typescript
export type MoodType =
  | 'business' | 'angry' | 'rich'
  | 'new_mood'; // <-- Добавить
```

2. Добавить фразы в конфигурацию
3. Добавить цвета в `CharacterMessage.tsx`

---

## 📊 База данных

### Таблицы

1. **character_interactions**
   - Все взаимодействия с персонажами
   - Используется для статистики

2. **character_events_history**
   - История событий
   - Cooldown tracking

3. **user_character_preferences**
   - Предпочтения пользователя
   - Адаптивное поведение

### Запросы для аналитики

```sql
-- Популярность персонажей
SELECT character_name, COUNT(*) as interactions
FROM character_interactions
GROUP BY character_name
ORDER BY interactions DESC;

-- События пользователя
SELECT event_type, COUNT(*) as count
FROM character_interactions
WHERE user_id = 'USER_ID' AND event_type IS NOT NULL
GROUP BY event_type;

-- Любимый персонаж пользователя
SELECT * FROM get_character_stats('USER_ID');
```

---

## 🎨 UI Компоненты

### CharacterDisplay
```typescript
import { CharacterDisplay } from '@/features/characters';

<CharacterDisplay
  character="muskva"
  mood="angry"
  message="Дурачок! Хе-хе-хе!"
  emoji="🐻"
  onComplete={() => console.log('Closed')}
/>
```

### CharacterEventOverlay
```typescript
import { CharacterEventOverlay } from '@/features/characters';

<CharacterEventOverlay
  event={{
    type: 'coffee_break',
    characters: ['johnny', 'panda'],
    message: 'Ур-ур капучино!',
    duration: 5000
  }}
  onComplete={() => console.log('Event finished')}
/>
```

---

## 🧪 Тестирование

### Тест 1: Проверка Мусквы (успех)
1. Открыть уровень
2. Написать **правильное** решение с качеством 90+
3. Ожидать: Мусква в режиме `rich`: "Тебе повезло. Хе-хе-хе!"

### Тест 2: Проверка Мусквы (ошибки)
1. Открыть уровень
2. Отправить **неправильное** решение 3 раза
3. Ожидать: Мусква в режиме `evil_laugh`: "Быть дурочком - природный дар"

### Тест 3: Проверка Джонни (поддержка)
1. Открыть уровень (первый раз)
2. Отправить **неправильное** решение
3. Ожидать: Джонни: "Ур-ур-ур... Ур-ур!"

### Тест 4: Проверка событий
1. Отправлять решения несколько раз подряд
2. С вероятностью 5-15% увидеть Coffee Break
3. С вероятностью 2-5% увидеть Union Protest

---

## 🐛 Troubleshooting

### Персонаж не появляется
- ✅ Проверить миграцию применена: `SELECT * FROM character_interactions LIMIT 1;`
- ✅ Проверить console на ошибки
- ✅ Проверить userId передаётся корректно

### События не срабатывают
- ✅ Проверить cooldown: `SELECT * FROM character_events_history WHERE user_id = 'USER_ID';`
- ✅ Увеличить вероятность в `eventConfig.ts` для тестирования
- ✅ Очистить историю событий:
```sql
DELETE FROM character_events_history WHERE user_id = 'USER_ID';
```

### Аватар не отображается
- ✅ Проверить placeholder SVG рендерится
- ✅ Проверить Framer Motion установлен: `npm list framer-motion`
- ✅ Заменить SVG на настоящие изображения (опционально)

---

## 🚀 Что дальше?

### Immediate Next Steps:
1. ✅ Протестировать в dev
2. ✅ Применить миграцию на production
3. 🎨 Добавить настоящие изображения персонажей (опционально)
4. 🎭 Добавить звуковые эффекты (опционально)

### Future Enhancements:
- 🤖 Адаптивное поведение на основе user_character_preferences
- 📊 Дашборд аналитики для учителей
- 🎨 Больше анимаций (Framer Motion variants)
- 🌍 Интернационализация фраз
- 🎮 Больше случайных событий

---

## 📝 Changelog

### 2025-11-06 - v1.0.0 (Initial Release)
- ✅ Phase 1: Database, Configuration, API, Logic
- ✅ Phase 2: UI Components (CharacterDisplay, CharacterAvatar, CharacterMessage, CharacterEventOverlay)
- ✅ Phase 3: Integration into SolveLevelPage
- 🐻 4 Персонажа: Мусква, Джонни, Панда, Тапка и Потапка
- 🎲 4 События: Coffee Break, Union Protest, FNS Scare, Glasha Mention
- 📊 3 Таблицы БД: interactions, events_history, preferences
- 🎨 Placeholder SVG аватары
- ⚡ Framer Motion анимации

---

## 👏 Credits

**Персонажи созданы на основе собеседований:**
- 🐻 Мусква: Токсичный CEO, "Хе-хе-хе!", боится ФНС
- 🧸 Джонни: Добрый стажёр, говорит только "Ур-ур"
- 🐼 Панда (Баобао): SMM, coffee breaks
- 🐻‍❄️ Тапка и Потапка: Дети Мусквы, коммунисты-революционеры!

**Made with ❤️ and ☕ by Claude**

---

**Система готова к использованию! 🎉**
