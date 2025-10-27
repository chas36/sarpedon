# Sarpedon - Интерактивная Образовательная Платформа

**Дата:** 27 октября 2025
**Версия:** 1.0
**Статус:** Утвержден

## Оглавление

1. [Обзор проекта](#обзор-проекта)
2. [Технологический стек](#технологический-стек)
3. [Архитектура системы](#архитектура-системы)
4. [База данных](#база-данных)
5. [Функциональные модули](#функциональные-модули)
6. [Система персонажей](#система-персонажей)
7. [AI интеграция](#ai-интеграция)
8. [UI/UX дизайн](#uiux-дизайн)
9. [Безопасность](#безопасность)
10. [Тестирование и CI/CD](#тестирование-и-cicd)

---

## Обзор проекта

### Концепция

Образовательная веб-платформа для обучения программированию детей младшего школьного возраста (10-14 лет) с тремя ролями пользователей:
- **Учитель** - создает контент, управляет учениками, настраивает соревнования
- **Ученик** - проходит уровни, получает обратную связь от AI и персонажей
- **Редактор** - создает и редактирует учебные задания

### Ключевые особенности

1. **Адаптивное обучение** - AI анализирует код и выявляет паттерны ошибок, платформа автоматически предлагает коррекционные задания
2. **Командные соревнования** - групповые соревнования между командами одного класса с балансировкой по навыкам
3. **Интерактивные персонажи** - мотивационная система с персонажами (Мусква CEO, Джонни стажер, Тапка и Потапка коммунисты)
4. **Геймификация** - достижения, серии, очки, рейтинг без ежедневных механик (подходит для школьных уроков)
5. **Проверка кода через AI** - функциональная корректность и качество кода (0-100 баллов)

### Целевая аудитория

- Школьники 10-14 лет
- Учителя информатики
- Образовательные учреждения

---

## Технологический стек

### Frontend
- **Framework:** React 18 + TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **State Management:** Zustand
- **Routing:** React Router v6
- **Code Editor:** Monaco Editor (@monaco-editor/react)
- **Animations:** Framer Motion
- **Data Fetching:** TanStack Query (React Query)
- **Forms & Validation:** Zod
- **Charts:** Recharts
- **Virtualization:** react-window

### Backend
- **BaaS:** Supabase
  - PostgreSQL database
  - Authentication
  - Row Level Security
  - Edge Functions (Deno)
  - Realtime subscriptions
  - Storage

### AI Integration
- **Provider:** OpenRouter API
- **Models:**
  - Validation: `meta-llama/llama-3.1-8b-instruct:free`
  - Quality analysis: `meta-llama/llama-3.1-70b-instruct:free`
  - Advanced (C++/Rust): `qwen/qwen-2.5-coder-32b-instruct:free`
  - Fallback: `google/gemini-flash-1.5:free`

### DevOps
- **Hosting:** Vercel (Frontend)
- **CI/CD:** GitHub Actions
- **Monitoring:** Sentry
- **Testing:** Vitest, Playwright, React Testing Library
- **Package Manager:** npm

---

## Архитектура системы

### Feature-based структура

```
src/
├── features/
│   ├── auth/              # Аутентификация и роли
│   ├── levels/            # Модуль обучения
│   ├── admin/             # Панель учителя/редактора
│   ├── gamification/      # Геймификация и достижения
│   ├── users/             # Управление пользователями
│   ├── teams/             # Командные соревнования
│   └── characters/        # Система персонажей
├── shared/
│   ├── components/        # Переиспользуемые компоненты
│   ├── hooks/             # Общие хуки
│   ├── utils/             # Утилиты
│   └── types/             # TypeScript типы
├── layouts/               # Layout компоненты
└── app/
    ├── routes/            # Определение маршрутов
    └── providers/         # Провайдеры контекста
```

### Принципы архитектуры

1. **Изоляция features** - каждая feature самодостаточна (компоненты, хуки, store, API)
2. **Один store на feature** - Zustand store для каждого модуля
3. **API слой отделен** - все запросы через API-функции, не напрямую в компонентах
4. **Shared для общего** - переиспользуемые элементы в shared/

---

## База данных

### Схема PostgreSQL

#### Основные таблицы

**profiles** - расширение auth.users
```sql
id UUID PRIMARY KEY REFERENCES auth.users(id)
first_name TEXT NOT NULL
last_name TEXT NOT NULL
class TEXT                          -- Класс (10А, 11Б)
role TEXT NOT NULL                  -- 'teacher' | 'student' | 'editor'
generated_login TEXT UNIQUE         -- Автогенерированный логин
created_at TIMESTAMP
updated_at TIMESTAMP
```

**levels** - учебные задания
```sql
id UUID PRIMARY KEY
title TEXT NOT NULL
description TEXT NOT NULL
educational_context TEXT            -- Теория и объяснения
reference_solution TEXT NOT NULL
test_cases JSONB NOT NULL           -- Массив тест-кейсов
hints JSONB                         -- Подсказки
difficulty TEXT                     -- 'easy' | 'medium' | 'hard'
order_index INTEGER NOT NULL
topic TEXT                          -- Группировка по темам
language TEXT NOT NULL              -- Язык программирования
target_skills TEXT[]                -- Какие навыки тренирует
is_remedial BOOLEAN                 -- Коррекционное задание
remedial_for TEXT[]                 -- Для каких error_patterns
created_by UUID REFERENCES profiles(id)
created_at TIMESTAMP
updated_at TIMESTAMP
```

**user_progress** - прогресс учеников
```sql
id UUID PRIMARY KEY
user_id UUID REFERENCES profiles(id)
level_id UUID REFERENCES levels(id)
status TEXT                         -- 'not_started' | 'in_progress' | 'completed'
attempts INTEGER DEFAULT 0
last_solution TEXT
completed_at TIMESTAMP
created_at TIMESTAMP
UNIQUE(user_id, level_id)
```

**submissions** - история решений
```sql
id UUID PRIMARY KEY
user_id UUID REFERENCES profiles(id)
level_id UUID REFERENCES levels(id)
code TEXT NOT NULL
is_correct BOOLEAN NOT NULL
ai_feedback TEXT
submitted_at TIMESTAMP
```

**code_analysis** - детальный анализ кода
```sql
id UUID PRIMARY KEY
submission_id UUID REFERENCES submissions(id)
user_id UUID REFERENCES profiles(id)
level_id UUID REFERENCES levels(id)
quality_score INTEGER               -- 0-100
issues JSONB NOT NULL               -- Массив проблем с категориями
error_patterns TEXT[]               -- ['poor_naming', 'deep_nesting']
strengths TEXT[]                    -- ['good_structure', 'clean_functions']
analyzed_at TIMESTAMP
```

**user_skill_profile** - профиль навыков ученика
```sql
id UUID PRIMARY KEY
user_id UUID REFERENCES profiles(id)
skill_scores JSONB NOT NULL         -- {naming: {issues: 5, improved: 2}}
weak_areas TEXT[]                   -- ['naming', 'error_handling']
improvement_rate FLOAT              -- Процент улучшения
updated_at TIMESTAMP
```

**recommended_levels** - адаптивная очередь заданий
```sql
id UUID PRIMARY KEY
user_id UUID REFERENCES profiles(id)
level_id UUID REFERENCES levels(id)
reason TEXT NOT NULL                -- 'remedial_for_naming', 'next_in_sequence'
priority INTEGER DEFAULT 0
created_at TIMESTAMP
UNIQUE(user_id, level_id)
```

#### Геймификация

**achievements** - достижения
```sql
id UUID PRIMARY KEY
user_id UUID REFERENCES profiles(id)
achievement_type TEXT NOT NULL
metadata JSONB
earned_at TIMESTAMP
```

**user_stats** - статистика
```sql
user_id UUID PRIMARY KEY REFERENCES profiles(id)
total_completed INTEGER DEFAULT 0
current_streak INTEGER DEFAULT 0
longest_streak INTEGER DEFAULT 0
total_attempts INTEGER DEFAULT 0
last_activity TIMESTAMP
updated_at TIMESTAMP
```

#### Командные соревнования

**teams** - команды
```sql
id UUID PRIMARY KEY
class TEXT NOT NULL
name TEXT NOT NULL
color TEXT
created_by UUID REFERENCES profiles(id)
auto_generated BOOLEAN DEFAULT FALSE
created_at TIMESTAMP
```

**team_members** - участники команд
```sql
id UUID PRIMARY KEY
team_id UUID REFERENCES teams(id)
user_id UUID REFERENCES profiles(id)
joined_at TIMESTAMP
UNIQUE(team_id, user_id)
```

**competitions** - соревнования
```sql
id UUID PRIMARY KEY
title TEXT NOT NULL
description TEXT
class TEXT NOT NULL
start_date TIMESTAMP NOT NULL
end_date TIMESTAMP NOT NULL
level_ids UUID[] NOT NULL
type TEXT                           -- 'team' | 'individual' | 'mixed'
scoring_rules JSONB
status TEXT                         -- 'upcoming' | 'active' | 'finished'
created_by UUID REFERENCES profiles(id)
created_at TIMESTAMP
```

**competition_results** - результаты
```sql
id UUID PRIMARY KEY
competition_id UUID REFERENCES competitions(id)
team_id UUID REFERENCES teams(id)
user_id UUID REFERENCES profiles(id)
total_score INTEGER
rank INTEGER
stats JSONB
updated_at TIMESTAMP
```

#### Персонажи

**character_interactions** - взаимодействия
```sql
id UUID PRIMARY KEY
user_id UUID REFERENCES profiles(id)
character_name TEXT NOT NULL        -- 'muskva', 'johnny', 'panda'
interaction_type TEXT NOT NULL      -- 'feedback', 'achievement', 'motivation'
context JSONB
message TEXT NOT NULL
mood TEXT NOT NULL
created_at TIMESTAMP
```

**character_events** - случайные события
```sql
id UUID PRIMARY KEY
event_type TEXT NOT NULL            -- 'coffee_break', 'union_protest'
characters TEXT[] NOT NULL
trigger_conditions JSONB
probability FLOAT DEFAULT 0.1
dialogue JSONB NOT NULL
is_active BOOLEAN DEFAULT TRUE
```

**user_character_history** - адаптация персонажей
```sql
user_id UUID PRIMARY KEY REFERENCES profiles(id)
favorite_character TEXT
interaction_count JSONB
response_to_muskva TEXT             -- 'motivated' | 'discouraged'
response_to_johnny TEXT
prefers_support BOOLEAN DEFAULT TRUE
updated_at TIMESTAMP
```

### Row Level Security (RLS)

Все таблицы защищены RLS политиками:
- Ученики видят только свои данные и данные одноклассников
- Учителя имеют полный доступ к данным своего класса
- Редакторы могут CRUD только на levels
- Системные таблицы (achievements, stats) доступны только владельцам

---

## Функциональные модули

### 1. Модуль аутентификации (auth)

**Генерация пользователей:**
- Учитель загружает CSV (Фамилия, Имя, Класс, Роль)
- Система генерирует логины: `lastname_firstletter_class_random4`
  - Пример: `ivanov_p_10a_x7k2`
- Безопасные пароли (8 символов)
- Экспорт credentials в CSV для распечатки

**Роли:**
- **teacher** - полный доступ к панели управления
- **student** - доступ к обучению и командным функциям
- **editor** - доступ к созданию/редактированию уровней

**Настройки учителя:**
- Логин и пароль задается в конфигурации (.env)
- Возможность смены через панель настроек

### 2. Модуль обучения (levels)

**Компоненты:**
- **LearningDashboard** - главная с прогрессом, рекомендациями
- **LevelSelector** - сетка уровней с цветовым кодированием статусов
- **LevelView** - основной экран решения:
  - TaskDescription (теория + задание)
  - CodeEditorPanel (Monaco Editor)
  - HintsPanel (переключаемые подсказки)
  - SubmitButton
  - FeedbackModal (результат + персонаж)
- **AnalysisReport** - детальный отчет качества кода
- **AdaptiveQueue** - рекомендованные задания

**Поток решения задачи:**
1. Ученик открывает уровень → загружается код из localStorage (если есть)
2. Пишет решение → автосохранение каждые 2 секунды
3. Нажимает Submit → вызов Supabase Edge Function `validate-and-analyze-code`
4. Edge Function:
   - Проверяет функциональность через OpenRouter
   - Анализирует качество (0-100 баллов)
   - Извлекает issues по категориям
   - Сохраняет в submissions, code_analysis
   - Обновляет user_skill_profile
   - Генерирует recommended_levels если нужно
5. Frontend показывает FeedbackModal с персонажем
6. Если правильно → обновление прогресса, геймификация
7. Показ детального AnalysisReport

**Адаптивная логика:**
- Система отслеживает error_patterns (naming, complexity, error_handling)
- При 3+ повторениях проблемы → вставка remedial задания
- Уровни имеют target_skills для тренировки навыков
- Рекомендации строятся на основе weak_areas

### 3. Панель учителя/редактора (admin)

**Компоненты:**
- **AdminDashboard** - обзор с аналитикой класса
- **LevelEditor** - CRUD уровней:
  - Форма с Monaco Editor для reference solution
  - JSON редактор тест-кейсов
  - Multi-select для target_skills
  - Toggle для is_remedial + remedial_for
- **LevelsList** - таблица всех уровней с сортировкой/фильтрацией
- **UserManager** - управление пользователями:
  - Список с фильтрами
  - BulkUserUpload (CSV)
  - Редактирование ролей
  - Просмотр прогресса ученика
- **AnalyticsPanel** - аналитика:
  - Графики прогресса класса
  - Топ ошибок по категориям
  - Тепловая карта навыков класса
- **SettingsPanel** - настройки учителя

**Аналитика:**
```typescript
interface ClassAnalytics {
  totalStudents: number;
  activeStudents: number;
  averageProgress: number;
  commonMistakes: Array<{category, count, affectedStudents}>;
  skillsDistribution: Record<string, {weak, average, strong}>;
  topPerformers: Array<{userId, name, score}>;
  strugglingStudents: Array<{userId, name, weakAreas}>;
}
```

### 4. Геймификация (gamification)

**Достижения (без ежедневных):**
- Прогресс: first_level, levels_10, levels_25, levels_50, levels_100
- Качество: perfect_score, perfect_streak_3, quality_master, improvement_king
- Командные: team_player, team_leader, competition_winner, competition_top3
- Навыки: error_vanquisher, skill_master, no_hints_master
- Тематические: topic_complete, fast_learner, comeback_kid

**Система очков:**
```typescript
score = (base + qualityBonus + speedBonus + noHintsBonus)
        * difficultyMultiplier
        * streakMultiplier
```
- base: 100
- qualityBonus: (quality_score / 10) * 5
- difficulty: easy: 1x, medium: 1.5x, hard: 2x
- speedBonus: +50 если <5 минут
- noHintsBonus: +20%
- streakMultiplier: 1 + (streak / 10)

**Визуализация:**
- ProgressBar в хедере (X/Y уровней)
- Streak indicator (🔥 N дней)
- Badge collection (locked/unlocked)
- Leaderboard (топ-10 + твоя позиция)
- Skill radar chart (8 навыков)

### 5. Командные соревнования (teams)

**Создание команд (учителем):**
1. Выбор класса и количества команд
2. Стратегия балансировки:
   - **random** - случайное распределение
   - **skill_based** - snake draft по навыкам (1→4→4→1→1...)
   - **mixed** - 1 сильный, 2 средних, 1 слабый
3. Автогенерация названий или ручной ввод
4. Drag & Drop корректировка состава

**Создание соревнования:**
- Название, описание, период (start/end)
- Выбор уровней для соревнования
- Настройка правил подсчета:
  - quality_weight (0-1)
  - speed_weight (0-1)
  - completion_weight (0-1)
  - team_bonus (boolean) - +20% если все участники активны

**Подсчет командных баллов:**
```typescript
teamScore = avgQuality * quality_weight * 1000
          + (1 / avgSpeed) * speed_weight * 1000
          + completionRate * completion_weight * 1000

if (team_bonus && allMembersActive) teamScore *= 1.2
```

**UI для ученика:**
- TeamBadge в хедере с рангом и баллами
- CompetitionBanner при активном соревновании
- LiveLeaderboard с позициями команд
- YourContribution (твой вклад в команду)

---

## Система персонажей

### Персонажи

#### 🐻 Мусква - CEO
**Внешний вид:** Коричневый медведь, красный бант, корона 👑, значки богатства 💰
**Личность:** Снобистский CEO "говенной империи", называет всех "дурачками"
**Фразы:**
- "Дурачок!" (ошибки)
- "Хе-хе-хе!" (злой смех)
- "Бадютька!" (удивление)
- "Ур. Ур." (медвежий язык)

**Настроения:**
- angry - при 3+ ошибках подряд
- business - при качестве 60-89
- rich - при качестве 90+
- evil_laugh - при попытках обмана
- scared - случайное событие (боится ФНС/сов)

#### 🧸 Джонни - Стажер
**Внешний вид:** Коричневый медведь в синем свитерке, горящие зеленые глаза 💚
**Особенность:** ГОВОРИТ ТОЛЬКО НА МЕДВЕЖЬЕМ ("Ур", "Ур-ур")
**Протест:** НЕ ЯН ГУС! → "УР УР УР!!!" (рычит если назвать неправильно)

**Словарь:**
- "Ур!" = "Привет!"
- "Ур-ур-ур-ур-ур!" = "Ты справишься!"
- "Ур ур ур..." = "Не расстраивайся..."
- "Ур... капучино..." = "Хочется капучино..."

**Настроения:**
- neutral - по умолчанию
- supportive - при неудачах (1-2 попытки)
- coffee_break - случайное событие с пандой 🐼☕
- offended - если назвать Ян Гусом

#### 🐻‍❄️ Тапка и Потапка - Коммунисты
**Внешний вид:** Белые медвежата, символы: 🔨 ⚒️ 🚩
**Роль:** Сыновья Мусквы, борцы за права рабочих
**Фразы:**
- "Папа! Мы требуем создания профсоюза!"
- "Стажёры! Знайте ваши права!"
- "Товарищи! Объединяйтесь!"

**Событие:** union_protest (3% вероятность после 5+ уровней подряд)

#### 🐼 Панда
**Роль:** Друг Джонни, стажер
**Событие:** coffee_break с Джонни (5% вероятность)

### Логика выбора персонажа

```typescript
function selectCharacter(context: FeedbackContext, history: UserCharacterHistory) {
  // Джонни - поддержка при первых попытках
  if (!context.isCorrect && context.attemptNumber < 3)
    return {character: 'johnny', mood: 'supportive'};

  // Мусква - при успехе с высоким качеством
  if (context.isCorrect && context.qualityScore >= 90)
    return {character: 'muskva', mood: 'rich'};

  // Мусква злится при 3+ ошибках
  if (!context.isCorrect && context.attemptNumber >= 3)
    return {character: 'muskva', mood: 'angry'};

  // Мусква при низком качестве
  if (context.isCorrect && context.qualityScore < 60)
    return {character: 'muskva', mood: 'business'};

  // Случайные события (5%, 3%, 2%)
  if (Math.random() < 0.05)
    return {character: 'johnny', mood: 'coffee_break'};

  // Адаптация на основе истории
  if (history.response_to_muskva === 'discouraged')
    return {character: 'johnny', mood: 'supportive'};

  return {character: 'johnny', mood: 'neutral'};
}
```

### Случайные события

**coffee_break** (5% после каждого решения):
- Джонни и Панда уходят на капучино ☕
- Анимация ухода влево с fadeOut

**union_protest** (3% при streak > 5):
- Появляются Тапка и Потапка с требованиями
- Мусква отвечает: "Опять мои коммунистические дети!"
- Анимация протеста с флагами

**owl_scare** (2% случайно):
- Мусква в панике: "Бадютька! Совы! 👁️"
- Убегает со сцены (ФНС)

**glasha_complaint** (4% при quality < 70):
- Мусква: "Глаша говорит, что я слишком добрый!"

---

## AI интеграция

### Supabase Edge Function: validate-and-analyze-code

**Endpoint:** `POST /functions/v1/validate-and-analyze-code`

**Request:**
```typescript
{
  userId: string;
  levelId: string;
  code: string;
  language: string;
  referenceSolution: string;
  testCases: Array<{input: string, output: string}>;
}
```

**Response:**
```typescript
{
  isCorrect: boolean;
  feedback: string;
  quality: {
    score: number;              // 0-100
    issues: Array<Issue>;
    patterns: string[];         // ['poor_naming', 'deep_nesting']
    strengths: string[];
    summary: string;
  };
  showReferenceSolution: boolean;
  character: string;
  mood: string;
}
```

### Промпт для функциональной проверки

```
You are a {language} code validator for an educational platform.

**Task:** Compare the student's code with the reference solution.

**Reference Solution:**
```{language}
{referenceSolution}
```

**Student's Code:**
```{language}
{userCode}
```

**Test Cases:**
Test 1: Input: {input}, Expected: {output}
...

**Instructions:**
1. Analyze functional equivalence
2. Check logic errors, syntax issues
3. Provide educational feedback on WHY correct/incorrect

**Response Format (JSON):**
{
  "isCorrect": true/false,
  "feedback": "Educational explanation...",
  "failedTests": [array of failed test indices]
}

Be encouraging but accurate.
```

### Промпт для анализа качества

```
You are a {language} code review expert.

**Student's Code:**
```{language}
{code}
```

**Evaluation Criteria:**
1. Naming (descriptive names)
2. Function Size (avoid >200 lines)
3. Dependencies (explicit, avoid global state)
4. Error Handling (don't swallow errors)
5. Nesting Depth (max 2-3 levels)
6. Side Effects (obvious)
7. Magic Numbers (avoid hardcoded)
8. Language Patterns (follow {language} conventions)

**Response Format (JSON):**
{
  "score": 0-100,
  "issues": [
    {
      "category": "naming|complexity|error_handling|...",
      "severity": "low|medium|high",
      "line": number_or_null,
      "description": "What's wrong",
      "suggestion": "How to improve"
    }
  ],
  "patterns": ["poor_naming", "deep_nesting"],
  "strengths": ["clean_structure", "good_naming"],
  "summary": "Brief assessment"
}

**Scoring Guide:**
90-100: Excellent
75-89: Good
60-74: Acceptable
40-59: Needs work
0-39: Poor
```

### Адаптивные рекомендации

После анализа Edge Function:
1. Обновляет `user_skill_profile.skill_scores`
2. Определяет `weak_areas` (где issues > 3)
3. Находит levels с `remedial_for` содержащими weak_areas
4. Находит levels с `target_skills` пересекающимися с weak_areas
5. Вставляет в `recommended_levels` с приоритетами:
   - Remedial: priority = 10
   - Practice: priority = 5
   - Next in sequence: priority = 3

### Rate limiting

- code_validation: 30 запросов/минута
- bulk_user_creation: 5 запросов/5 минут
- ai_analysis: 20 запросов/минута

### Fallback стратегия

При недоступности основной модели:
1. Retry с exponential backoff (3 попытки)
2. Fallback на `google/gemini-flash-1.5:free`
3. Если все fail → сохранение submission без анализа + уведомление

---

## UI/UX дизайн

### Цветовые схемы

**Модуль обучения (сине-белая):**
```css
--learning-bg: #0f172a       /* Темно-синий фон */
--learning-surface: #1e293b  /* Карточки */
--learning-accent: #3b82f6   /* Синий акцент */
--learning-success: #10b981  /* Зеленый */
--learning-text: #f1f5f9     /* Светлый текст */
```

**Админ панель (профессиональная):**
```css
--admin-bg: #18181b          /* Почти черный */
--admin-surface: #27272a
--admin-accent: #8b5cf6      /* Фиолетовый */
--admin-warning: #f59e0b
--admin-danger: #ef4444
```

**Персонажи:**
```css
--muskva-primary: #dc2626    /* Красный (бант) */
--muskva-secondary: #fbbf24  /* Золотой (корона) */
--johnny-primary: #3b82f6    /* Синий (свитерок) */
--johnny-secondary: #10b981  /* Зеленый (глаза) */
```

### Адаптивность

**Breakpoints:**
- Mobile: 640px (sm)
- Tablet: 768px (md)
- Desktop: 1024px (lg)
- Wide: 1280px (xl)

**Адаптивная сетка уровней:**
- Mobile: 1 колонка
- Tablet: 2 колонки
- Desktop: 3 колонки
- Wide: 4 колонки

**Боковая панель:**
- Mobile: Hamburger menu + Drawer
- Desktop: Постоянная Sidebar

**Monaco Editor:**
- Mobile: высота 400px, minimap отключен
- Tablet: высота 600px
- Desktop: высота calc(100vh - 200px), minimap включен

### Анимации (Framer Motion)

**Появление персонажей:**
- Мусква: slide-in с вращением короны
- Джонни: bounce с покачиванием
- Тапка и Потапка: shake с флагами

**Achievement unlock:**
- Scale + rotate с particle effect
- Toast notification справа сверху
- Звук (опционально)

**Feedback modal:**
- Fade-in backdrop
- Slide-up content
- Character entrance анимация

### Layouts

**StudentLayout:**
- Header (прогресс, команда, меню)
- Sidebar (уровни, достижения, команда, прогресс, персонажи)
- Main content area
- CharacterEventOverlay

**TeacherLayout:**
- Header (статистика, уведомления, меню)
- Sidebar (дашборд, уровни, пользователи, соревнования, аналитика, настройки)
- Main content area

### Monaco Editor кастомизация

**Тема Sarpedon:**
- base: vs-dark
- background: #0f172a
- comment: #6b7280 (italic)
- keyword: #8b5cf6 (bold)
- string: #10b981
- number: #fbbf24
- function: #3b82f6

**Опции:**
- fontSize: 14
- fontFamily: 'JetBrains Mono, Fira Code'
- lineNumbers: on
- minimap: адаптивно (только desktop)
- wordWrap: on
- bracketPairColorization: enabled
- quickSuggestions: true

---

## Безопасность

### Row Level Security (RLS)

Все таблицы защищены политиками:

**Ученики:**
- Видят свой профиль
- Видят одноклассников (profiles + class)
- Читают все levels
- CRUD свой user_progress
- CREATE submissions для себя
- Видят команды своего класса
- Видят соревнования своего класса

**Редакторы:**
- CRUD на levels
- READ на profiles (без изменений)
- READ аналитику

**Учителя:**
- Полный доступ ко всем таблицам
- CRUD пользователей
- CRUD команд и соревнований
- Просмотр всей аналитики

### Валидация (Zod)

Все формы и API запросы валидируются Zod схемами:
- codeSubmissionSchema (code, levelId, language)
- levelSchema (title, description, test_cases, target_skills)
- bulkUserUploadSchema (firstName, lastName, class, role)
- competitionSchema (title, dates, level_ids, scoring_rules)

### Аутентификация Edge Functions

```typescript
async function validateAuth(req: Request) {
  const token = req.headers.get('Authorization').replace('Bearer ', '');
  const { user } = await supabase.auth.getUser(token);
  if (!user) throw new Error('Unauthorized');
  return { user, supabase };
}

async function requireRole(user, supabase, allowedRoles) {
  const { role } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!allowedRoles.includes(role)) throw new Error('Forbidden');
}
```

### Защита от инъекций

- Все SQL через Supabase client (prepared statements)
- Параметризованные запросы
- RLS на уровне БД
- Валидация входных данных (Zod)

### Секреты

- API ключи в environment variables
- OPENROUTER_API_KEY только в Edge Functions
- Supabase ANON_KEY безопасен для frontend (RLS защищает)
- Service role key только в backend

---

## Тестирование и CI/CD

### Стратегия тестирования

**Unit Tests (Vitest):**
- Утилиты (scoring, validation, generators)
- Хуки (useAuth, useLevel, useProgress)
- Stores (Zustand)
- Coverage: 80%+

**Component Tests (React Testing Library):**
- UI компоненты (Button, Card, Modal)
- Feature компоненты (LevelCard, FeedbackDialog)
- Integration tests (level submission flow)

**E2E Tests (Playwright):**
- Полный student flow (login → level → submit → feedback)
- Teacher flow (create level → publish)
- Team competition flow

### CI/CD Pipeline (GitHub Actions)

**On Push/PR:**
1. Lint (ESLint)
2. Type check (TypeScript)
3. Unit tests (Vitest)
4. Integration tests
5. E2E tests (Playwright)
6. Build
7. Deploy to staging (develop branch)
8. Deploy to production (main branch)

**Branches:**
- `main` → Production (Vercel)
- `develop` → Staging (Vercel preview)
- `feature/*` → Preview deployments

### Мониторинг

**Sentry:**
- Error tracking
- Performance monitoring
- Session replay (10% sample)
- User feedback

**Analytics:**
- Plausible (privacy-friendly)
- Отслеживание событий:
  - level_completed
  - achievement_unlocked
  - competition_joined
  - character_interaction

**Performance:**
- Web Vitals tracking
- Lighthouse CI в pipeline
- Bundle size monitoring

---

## Развертывание

### Окружения

**Development:**
- Local: `npm run dev` (Vite)
- Supabase: Local instance (`supabase start`)

**Staging:**
- Vercel preview (develop branch)
- Supabase: staging project

**Production:**
- Vercel (main branch)
- Supabase: production project

### Environment Variables

```bash
# Supabase
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx

# OpenRouter (только Edge Functions)
OPENROUTER_API_KEY=xxx

# Monitoring
VITE_SENTRY_DSN=xxx
VITE_PLAUSIBLE_DOMAIN=sarpedon.app

# App
VITE_APP_URL=https://sarpedon.app
```

### Миграции БД

```bash
# Создать миграцию
supabase migration new migration_name

# Применить локально
supabase db reset

# Применить на staging/production
supabase db push
```

### Rollback стратегия

1. Vercel: instant rollback к предыдущему деплою
2. Supabase: миграции с down() функциями
3. Feature flags для постепенного rollout

---

## Roadmap

### Phase 1 (MVP) - 2 месяца
- ✅ Дизайн утвержден
- [ ] Настройка инфраструктуры (Supabase, Vercel)
- [ ] Базовая аутентификация и RLS
- [ ] Модуль обучения (без AI)
- [ ] Простая панель учителя
- [ ] Статичные персонажи

### Phase 2 - 1 месяц
- [ ] AI интеграция (OpenRouter)
- [ ] Адаптивные рекомендации
- [ ] Анимированные персонажи
- [ ] Геймификация базовая

### Phase 3 - 1 месяц
- [ ] Командные соревнования
- [ ] Детальная аналитика для учителя
- [ ] Случайные события персонажей
- [ ] Полная геймификация

### Phase 4 - Ongoing
- [ ] Мобильное приложение (React Native)
- [ ] Расширение языков программирования
- [ ] AI наставник (ChatGPT-like помощник)
- [ ] Интеграция с школьными системами

---

## Заключение

Sarpedon - это комплексная образовательная платформа, сочетающая:
- Профессиональную архитектуру (feature-based, Supabase, React)
- Адаптивное обучение (AI анализ + персонализация)
- Мотивацию через персонажей (Мусква, Джонни)
- Социальный элемент (командные соревнования)
- Безопасность (RLS, валидация, rate limiting)
- Масштабируемость (тестирование, CI/CD, мониторинг)

Платформа готова к разработке с четкой структурой, проверенными технологиями и понятным roadmap.
