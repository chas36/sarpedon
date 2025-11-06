# Система персонажей Sarpedon - Дизайн документ

**Дата создания:** 6 ноября 2025
**Версия:** 1.0
**Статус:** Ready for Implementation

---

## 📋 Оглавление

1. [Обзор системы](#обзор-системы)
2. [Персонажи](#персонажи)
3. [Логика выбора персонажа](#логика-выбора-персонажа)
4. [События](#события)
5. [База данных](#база-данных)
6. [UI/UX компоненты](#uiux-компоненты)
7. [Анимации](#анимации)
8. [Интеграция](#интеграция)

---

## Обзор системы

### Цель
Создать интерактивную систему персонажей-наставников, которые:
- Дают обратную связь на решения учеников
- Реагируют эмоционально в зависимости от контекста
- Создают атмосферу вовлечённости через юмор и характер
- Мотивируют/демотивируют учеников (токсичный CEO стиль)

### Основные принципы
- **Контекстная реакция** - персонаж выбирается на основе качества кода и попыток
- **Личность** - каждый персонаж имеет уникальный стиль общения
- **События** - случайные события добавляют непредсказуемость
- **Адаптивность** - система запоминает реакции ученика

---

## Персонажи

### 🐻 Мусква (CEO, бурый медведь)

**Внешний вид:**
- Коричневый медведь
- Красный бант 🎀
- Золотая корона 👑
- Значки богатства: 💰💎
- Бизнес-костюм (опционально)

**Личность:**
- Снобистский CEO "говённой империи"
- Токсичный, но считает себя добрым
- Самовлюбленный мультимилиардер и филантроп
- НЕ УМЕЕТ ЧИТАТЬ (медведь же!)
- Боится ФНС, сов, Глаши

**Фразы по контексту:**

| Ситуация | Настроение | Фраза |
|----------|-----------|-------|
| Ошибка (первая) | `business` | "Дурачок! Хе-хе-хе! Попробуй еще раз." |
| Ошибка (2-3) | `angry` | "Опять?! Я тебя обсираю! Хе-хе-хе!" |
| Ошибка (4+) | `evil_laugh` | "Не расстраивайся. Быть дурочком - это природный дар. Хе-хе-хе!" |
| Успех (качество 90+) | `rich` | "Тебе повезло. В следующий раз сделаю посложнее. Хе-хе-хе!" |
| Успех (качество 60-89) | `business` | "Ну, сойдёт. Я ведь великолепный учитель!" |
| Успех (качество <60) | `business` | "Работает, но код как... ну ладно. Я слишком добр к тебе." |
| ФНС/Совы (событие) | `scared` | "Бадютька! Дябя-дябя! *прикидывается бабулькой* Я тут не при делах!" |
| Упоминание Глаши | `scared` | "Глаша?! Где?! *убегает*" |

**Настроения (moods):**
- `business` - деловой, снобистский
- `angry` - злой, унижает
- `rich` - довольный, снисходительный
- `evil_laugh` - злорадный "хе-хе-хе"
- `scared` - паникует (ФНС, совы, Глаша)

---

### 🧸 Джонни (Стажер, коричневый медведь)

**Внешний вид:**
- Коричневый медведь
- Синий свитерок 💙
- Горящие зелёные глаза 💚
- Маленький, милый

**Личность:**
- ГОВОРИТ ТОЛЬКО НА МЕДВЕЖЬЕМ ("Ур", "Ур-ур")
- Добрый, поддерживающий
- Жертва детского труда у Мусквы
- Любит малину-капучино ☕
- Друг Панды

**ВАЖНО: НЕ ЯН ГУС!**
- Если назвать "Ян Гус" → расстраивается: "Ур-ур Джонни 😢"
- Мусква часто называет его "Ян Гус"

**Фразы по контексту:**

| Ситуация | Настроение | Фраза (медвежий + перевод) |
|----------|-----------|---------------------------|
| Новичок | `supportive` | "Ур-ур! Ур-ур-ур-ур!" (Привет! Ты справишься!) |
| Ошибка (1-2) | `supportive` | "Ур-ур-ур... Ур-ур!" (Не расстраивайся... Попробуй ещё!) |
| Ошибка (3+) | `supportive` | "Ур... Ур-ур-ур-ур-ур..." (Ур... Всё получится...) *обнимашки* |
| Успех | `neutral` | "Ур-ур!!! Ур-ур-ур!" (Отлично!!! Ты молодец!) |
| Назвали "Ян Гус" | `offended` | "Ур-ур Джонни! 😢" (Я Джонни, а не Ян Гус!) |
| Видит Панду | `happy` | "Ур-ур!!! Ур-ур радость!" (Панда!!! Друг!) |
| Хочет кофе | `coffee_break` | "Ур... капучино..." (Ур... хочется капучино...) |

**Настроения (moods):**
- `neutral` - спокойный
- `supportive` - поддерживает
- `happy` - радостный (Панда, успех)
- `offended` - обиженный (Ян Гус)
- `coffee_break` - хочет кофе

**Словарь медвежьего:**
- "Ур!" = Привет! / Да!
- "Ур-ур" = Хорошо / Молодец
- "Ур-ур-ур-ур-ур" = Длинная фраза (поддержка)
- "Ур..." = Грустно / Задумчиво
- "Ур-ур капучино" = Хочу капучино
- "Ур-ур Джонни" = Я Джонни (не Ян Гус!)
- "Ур-ур-ур!!!" = Радость!!!

---

### 🐼 Панда (Баобао, SMM/PR стажер)

**Внешний вид:**
- Панда (чёрно-белая)
- Милая, дружелюбная
- Возможно с телефоном 📱 (SMM)

**Личность:**
- SMM и PR специалист
- Друг Джонни
- Говорит на медвежьем + немного по-русски
- Жертва Мусквы ("Понанимал на свою голову!")

**Фразы:**

| Ситуация | Фраза |
|----------|-------|
| Приветствие | "Ур-ур! Привет! Баобао." |
| Coffee break | "Ур-ур-ур прячемся, ур-ур-ур-ур-ур радуемся!" |
| С Джонни | "Ур-ур Панда, ур-ур Джонни" |
| Работа | "Ур-ур работа. Ур-ур." |

**Настроения:**
- `friendly` - дружелюбная
- `coffee_break` - перерыв с Джонни
- `working` - работает (SMM)

---

### 🐻‍❄️ Тапка и Потапка (Коммунисты, белые медвежата)

**Внешний вид:**
- Два белых медвежонка
- Красные флаги 🚩
- Молот и серп ⚒️🔨
- Решительные, активисты

**Личность:**
- Якобы "сыновья Мусквы" (но отрицают: "Мы его не знаем. Дяяяя!")
- Коммунисты-революционеры
- Защитники прав стажёров
- Называют Мускву "Бурый", "злой мудила"

**Фразы:**

| Ситуация | Фраза |
|----------|-------|
| Появление | "Привет! Мы Тапка и Потапка! Мы его не знаем. Дяяяя!" |
| Протест | "Раздуем пламя коммунистической революции! Долой Бурого!" |
| Про Мускву | "Этот злой мудила обижает стажёров! Защитите нас от Бурого!" |
| Обвинения | "Он нас ненавидит, хочет убить, репрессирует! Снимаем побои!" |
| Мусква отвечает | **Мусква:** "Это всё неправда! Я их пипи, законный представитель!" <br> **Т&П:** "Мы тебя впервые видим!" |

**Триггеры протеста:**
- После 5+ успешных решений подряд (3% вероятность)
- На праздники
- При упоминании "несправедливости"
- Случайно (2% после любого решения)

---

### 👻 Глаша (Бухгалтер/Инспектор) - NPC

**Статус:** НЕ ПОЯВЛЯЕТСЯ ФИЗИЧЕСКИ

**Роль:**
- Упоминание пугает Мускву
- Джонни дразнит Мускву: "Ур-ур Глаша!"
- Панда: "Ур-ур инспектор"

**Эффект:**
- При упоминании Мусква в режиме `scared`
- Может быть триггером события "Бухгалтерская проверка"

---

## Логика выбора персонажа

### Основной алгоритм

```typescript
function selectCharacter(context: FeedbackContext): CharacterResponse {
  const {
    isCorrect,
    attemptNumber,
    qualityScore,
    consecutiveErrors,
    totalCompleted
  } = context;

  // 1. Случайные события (проверяются первыми)
  if (shouldTriggerEvent('coffee_break', totalCompleted)) {
    return {
      characters: ['johnny', 'panda'],
      event: 'coffee_break',
      message: "Ур-ур-ур прячемся! ☕",
      duration: 5000
    };
  }

  if (shouldTriggerEvent('union_protest', totalCompleted)) {
    return {
      characters: ['tapka', 'potapka'],
      event: 'union_protest',
      message: "Раздуем пламя коммунистической революции! Долой Бурого! 🚩",
      duration: 8000,
      interruptsMuskva: true
    };
  }

  if (shouldTriggerEvent('fns_scare', totalCompleted)) {
    return {
      characters: ['muskva'],
      mood: 'scared',
      event: 'fns_scare',
      message: "Бадютька! Дябя-дябя! Совы! *убегает* 🦉",
      duration: 4000
    };
  }

  // 2. Джонни для новичков и поддержки
  if (attemptNumber <= 2 && !isCorrect) {
    return {
      characters: ['johnny'],
      mood: 'supportive',
      message: generateJohnnyMessage(attemptNumber)
    };
  }

  // 3. Мусква для успехов
  if (isCorrect && qualityScore >= 90) {
    return {
      characters: ['muskva'],
      mood: 'rich',
      message: "Тебе повезло. В следующий раз сделаю посложнее. Хе-хе-хе! 👑"
    };
  }

  // 4. Мусква для множественных ошибок
  if (consecutiveErrors >= 3) {
    return {
      characters: ['muskva'],
      mood: 'evil_laugh',
      message: "Не расстраивайся. Быть дурочком - это природный дар. Хе-хе-хе! 🐻"
    };
  }

  // 5. Мусква для ошибок
  if (!isCorrect && attemptNumber > 2) {
    return {
      characters: ['muskva'],
      mood: 'angry',
      message: "Опять?! Я тебя обсираю! Хе-хе-хе! 💩"
    };
  }

  // 6. Мусква для обычных успехов
  if (isCorrect) {
    const mood = qualityScore >= 60 ? 'business' : 'business';
    return {
      characters: ['muskva'],
      mood,
      message: getMuskvaSuccessMessage(qualityScore)
    };
  }

  // Default: Джонни
  return {
    characters: ['johnny'],
    mood: 'neutral',
    message: "Ур-ур! Ур-ур-ур!"
  };
}
```

### Вероятности событий

```typescript
const EVENT_PROBABILITIES = {
  coffee_break: {
    baseChance: 0.05,        // 5% после любого решения
    increasedAfter: 3,       // Увеличивается после 3+ решений подряд
    increasedChance: 0.15,   // До 15%
    cooldown: 10             // Минимум 10 решений между coffee breaks
  },

  union_protest: {
    baseChance: 0.02,        // 2% базовая
    afterStreak: 0.05,       // 5% после streak > 5
    onHolidays: 0.30,        // 30% на праздники
    cooldown: 15             // Минимум 15 решений между протестами
  },

  fns_scare: {
    baseChance: 0.02,        // 2% случайно
    whenMuskvaAngry: 0.08,   // 8% когда Мусква злой
    cooldown: 20             // Минимум 20 решений между ФНС
  },

  glasha_mention: {
    whenMuskvaRich: 0.10,    // 10% когда Мусква в режиме rich
    johnnyTeasing: 0.05      // 5% Джонни дразнит
  }
};
```

---

## События

### Event: Coffee Break ☕

**Участники:** Джонни + Панда

**Триггер:**
- 5% после любого решения
- 15% после 3+ решений подряд
- Cooldown: 10 решений

**Сценарий:**
1. Появляются Джонни и Панда
2. Джонни: "Ур... капучино..."
3. Панда: "Ур-ур! Баобао!"
4. Вместе: "Ур-ур-ур прячемся, ур-ур-ур-ур-ур радуемся!"
5. Анимация: уход влево с fadeOut
6. Длительность: 5 секунд

**Эффект:** Перерыв, смена обстановки, юмор

---

### Event: Union Protest 🚩

**Участники:** Тапка + Потапка (+ Мусква реагирует)

**Триггер:**
- 5% после streak > 5
- 30% на праздники (1 мая, 7 ноября)
- 2% случайно
- Cooldown: 15 решений

**Сценарий:**
1. Тапка и Потапка врываются с флагами
2. Т&П: "Раздуем пламя коммунистической революции! Долой Бурого! 🚩⚒️"
3. Т&П: "Защитите стажёров от этого злого мудилы!"
4. Мусква (если был на экране): "Опять мои коммунистические дети! Это всё неправда!"
5. Т&П: "Мы тебя впервые видим! Дяяяя!"
6. Анимация: shake с флагами
7. Длительность: 8 секунд

**Эффект:** Комедия, социальный комментарий, разнообразие

---

### Event: ФНС/Совы Scare 🦉

**Участники:** Мусква

**Триггер:**
- 2% случайно
- 8% когда Мусква злой (`angry` mood)
- Cooldown: 20 решений

**Сценарий:**
1. Звук совы / сирена
2. Мусква: "Бадютька! Дябя-дябя!"
3. Мусква: "Дурацкие совы/ФНС, ненавижу!"
4. *прикидывается бабулькой*
5. Анимация: убегает со сцены (slide-out)
6. Длительность: 4 секунды

**Эффект:** Юмор, уязвимость "всемогущего" CEO

---

### Event: Glasha Mention 👻

**Триггер:**
- 10% когда Мусква в режиме `rich`
- 5% Джонни дразнит

**Сценарий:**
1. Джонни: "Ур-ур Глаша! Ур-ур!"
2. Панда: "Ур-ур инспектор"
3. Мусква: "Глаша?! Где?! *паника* *убегает*"

**Эффект:** Внутренний юмор, характерная слабость Мусквы

---

## База данных

### Новые таблицы

```sql
-- Таблица взаимодействий с персонажами
CREATE TABLE character_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE,

  character_name TEXT NOT NULL, -- 'muskva', 'johnny', 'panda', 'tapka_potapka'
  mood TEXT NOT NULL,           -- настроение персонажа
  message TEXT NOT NULL,        -- сообщение персонажа

  interaction_type TEXT NOT NULL, -- 'feedback', 'event', 'random'
  event_type TEXT,              -- 'coffee_break', 'union_protest', 'fns_scare', null

  context JSONB,                -- {attemptNumber, qualityScore, isCorrect, ...}

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы
CREATE INDEX idx_character_interactions_user ON character_interactions(user_id);
CREATE INDEX idx_character_interactions_character ON character_interactions(character_name);
CREATE INDEX idx_character_interactions_type ON character_interactions(interaction_type);

-- История событий (для cooldown)
CREATE TABLE character_events_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  cooldown_until TIMESTAMPTZ
);

CREATE INDEX idx_events_history_user ON character_events_history(user_id);
CREATE INDEX idx_events_history_cooldown ON character_events_history(cooldown_until);

-- Предпочтения ученика (адаптация)
CREATE TABLE user_character_preferences (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,

  favorite_character TEXT,          -- Кого видят чаще
  interaction_counts JSONB,         -- {muskva: 10, johnny: 15, ...}

  response_to_muskva TEXT,          -- 'motivated' | 'discouraged' | 'neutral'
  response_to_johnny TEXT,

  prefers_support BOOLEAN DEFAULT TRUE, -- Нужна поддержка?

  last_event JSONB,                 -- Последнее событие
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### RLS политики

```sql
-- Ученики видят только свои взаимодействия
CREATE POLICY "Users can view own interactions"
  ON character_interactions FOR SELECT
  USING (auth.uid() = user_id);

-- Учителя видят всё
CREATE POLICY "Teachers can view all interactions"
  ON character_interactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'teacher'
    )
  );

-- Система создаёт взаимодействия
CREATE POLICY "System can create interactions"
  ON character_interactions FOR INSERT
  WITH CHECK (true);
```

---

## UI/UX компоненты

### Структура компонентов

```
src/features/characters/
├── components/
│   ├── CharacterDisplay.tsx       # Главный компонент персонажа
│   ├── CharacterAvatar.tsx        # SVG/изображение персонажа
│   ├── CharacterMessage.tsx       # Речевой пузырь
│   ├── CharacterEventOverlay.tsx  # Оверлей для событий
│   │
│   ├── characters/
│   │   ├── Muskva.tsx            # Компонент Мусквы
│   │   ├── Johnny.tsx            # Компонент Джонни
│   │   ├── Panda.tsx             # Компонент Панды
│   │   └── TapkaPotapka.tsx      # Компонент коммунистов
│   │
│   └── events/
│       ├── CoffeeBreakEvent.tsx
│       ├── UnionProtestEvent.tsx
│       └── FnsScareEvent.tsx
│
├── hooks/
│   ├── useCharacterSelection.ts   # Логика выбора персонажа
│   ├── useCharacterEvents.ts      # Управление событиями
│   └── useCharacterHistory.ts     # История взаимодействий
│
├── store/
│   └── characterStore.ts          # Zustand store для персонажей
│
├── api/
│   └── characterApi.ts            # API для взаимодействий
│
└── utils/
    ├── characterSelector.ts       # Алгоритм выбора
    ├── eventTriggers.ts          # Логика триггеров событий
    └── messageGenerator.ts        # Генерация сообщений
```

### Пример CharacterDisplay

```typescript
interface CharacterDisplayProps {
  character: 'muskva' | 'johnny' | 'panda' | 'tapka_potapka';
  mood: string;
  message: string;
  event?: CharacterEvent;
  onComplete?: () => void;
}

export const CharacterDisplay: React.FC<CharacterDisplayProps> = ({
  character,
  mood,
  message,
  event,
  onComplete
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -50 }}
      className="character-display"
    >
      <CharacterAvatar character={character} mood={mood} />
      <CharacterMessage message={message} character={character} />

      {event && (
        <CharacterEventOverlay
          event={event}
          onComplete={onComplete}
        />
      )}
    </motion.div>
  );
};
```

---

## Анимации

### Framer Motion варианты

```typescript
// Мусква - появление с вращением короны
const muskvaVariants = {
  enter: {
    opacity: 0,
    scale: 0.5,
    rotate: -180
  },
  center: {
    opacity: 1,
    scale: 1,
    rotate: 0,
    transition: {
      duration: 0.6,
      ease: "easeOut"
    }
  },
  exit: {
    opacity: 0,
    x: -200,
    transition: { duration: 0.4 }
  }
};

// Джонни - bounce с покачиванием
const johnnyVariants = {
  enter: {
    opacity: 0,
    y: 100
  },
  center: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 200,
      damping: 10
    }
  },
  idle: {
    y: [0, -10, 0],
    transition: {
      repeat: Infinity,
      duration: 2,
      ease: "easeInOut"
    }
  }
};

// Тапка и Потапка - shake с флагами
const protestVariants = {
  enter: {
    x: -300,
    opacity: 0
  },
  shake: {
    x: 0,
    opacity: 1,
    rotate: [0, -5, 5, -5, 5, 0],
    transition: {
      rotate: {
        repeat: Infinity,
        duration: 0.5
      }
    }
  }
};

// Coffee break - уход влево
const coffeeBreakVariants = {
  exit: {
    x: -400,
    opacity: 0,
    transition: {
      duration: 1,
      ease: "easeIn"
    }
  }
};
```

### Эмоции персонажей (SVG состояния)

Каждый персонаж имеет SVG с разными выражениями лица:

**Мусква:**
- `business` - нейтральный, снобистский прищур
- `angry` - нахмуренный, рычит
- `rich` - довольный, улыбка
- `evil_laugh` - злорадный смех, широкая улыбка
- `scared` - испуганный, глаза широко открыты

**Джонни:**
- `neutral` - спокойный, добрый взгляд
- `supportive` - тёплый, улыбается
- `happy` - радостный, прыгает
- `offended` - грустный (Ян Гус)
- `coffee_break` - мечтательный, думает о кофе

---

## Интеграция

### Интеграция в SolveLevelPage

```typescript
// В SolveLevelPage.tsx после получения feedback от AI

const handleSubmit = async () => {
  // ... существующий код выполнения ...

  const feedback = await getAIFeedback({
    code,
    levelId,
    testResults
  });

  // НОВОЕ: Выбор персонажа
  const characterResponse = selectCharacter({
    isCorrect: feedback.allTestsPassed,
    attemptNumber: attempts + 1,
    qualityScore: feedback.quality.overall_score,
    consecutiveErrors: userStats.consecutiveErrors,
    totalCompleted: userProgress.completed
  });

  // Сохранение взаимодействия
  await saveCharacterInteraction({
    userId: user.id,
    submissionId: submission.id,
    character: characterResponse.characters[0],
    mood: characterResponse.mood,
    message: characterResponse.message,
    interactionType: characterResponse.event ? 'event' : 'feedback',
    eventType: characterResponse.event,
    context: { ... }
  });

  // Показываем персонажа
  setCharacterDisplay(characterResponse);
  setShowCharacterModal(true);
};
```

### Модальное окно с персонажем

Заменяет/дополняет существующий FeedbackModal:

```typescript
<AnimatePresence>
  {showCharacterModal && (
    <Modal onClose={() => setShowCharacterModal(false)}>
      <CharacterDisplay
        character={characterDisplay.characters[0]}
        mood={characterDisplay.mood}
        message={characterDisplay.message}
        event={characterDisplay.event}
        onComplete={() => {
          setShowCharacterModal(false);
          // Показываем обычный feedback
          setShowFeedbackModal(true);
        }}
      />

      {/* AI Feedback под персонажем */}
      <div className="mt-4">
        <FeedbackContent feedback={feedback} />
      </div>
    </Modal>
  )}
</AnimatePresence>
```

---

## Аналитика для учителя

### Дашборд "Взаимодействия с персонажами"

**Метрики:**
- Частота появления каждого персонажа
- Реакции учеников (время до закрытия модалки)
- Эффективность (улучшение после Джонни vs Мусквы)
- Популярность событий

**Компоненты:**
- CharacterInteractionChart.tsx - график взаимодействий
- CharacterEffectivenessTable.tsx - эффективность по персонажам
- EventsTimeline.tsx - лента событий

---

## Приоритеты реализации

### Phase 1: Базовые персонажи (1 неделя)
1. ✅ Database migrations (tables)
2. ✅ CharacterDisplay компонент
3. ✅ Мусква (3 настроения: business, angry, rich)
4. ✅ Джонни (2 настроения: neutral, supportive)
5. ✅ Базовый selectCharacter алгоритм
6. ✅ Интеграция в SolveLevelPage

### Phase 2: События (3-4 дня)
1. ✅ Панда компонент
2. ✅ Coffee Break событие
3. ✅ Тапка и Потапка компоненты
4. ✅ Union Protest событие
5. ✅ Event cooldown система

### Phase 3: Анимации (2-3 дня)
1. ✅ Framer Motion интеграция
2. ✅ Entrance/exit анимации
3. ✅ Idle анимации
4. ✅ Event анимации
5. ✅ Transitions между персонажами

### Phase 4: Полировка (2-3 дня)
1. ✅ SVG персонажей (разные эмоции)
2. ✅ Звуковые эффекты (опционально)
3. ✅ Адаптивная логика (user preferences)
4. ✅ Аналитика для учителя
5. ✅ Тестирование и баг-фиксы

**Общее время: 2-3 недели**

---

## Заключение

Система персонажей добавляет:
- ✅ Эмоциональную связь с платформой
- ✅ Юмор и развлечение
- ✅ Мотивацию (Джонни) и вызов (Мусква)
- ✅ Запоминающиеся моменты (события)
- ✅ Уникальность платформы

**Готово к реализации!** 🎭🐻🎉
