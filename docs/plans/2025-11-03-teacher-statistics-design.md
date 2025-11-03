# Дизайн системы статистики для преподавателей

**Дата:** 2025-11-03
**Автор:** Brainstorming Session
**Статус:** Утверждено

---

## 1. Обзор

Комплексная система статистики и аналитики для преподавателей платформы Sarpedon. Включает общий дашборд, детальную статистику учеников, аналитику по уровням и сравнение классов.

### Основные требования

1. **Общий дашборд (StatisticsPage):**
   - Топ учеников
   - Проблемные ученики (низкая активность/успешность)
   - Графики: прогресс во времени, распределение, тепловая карта

2. **Детальная статистика ученика (StudentAnalyticsPage):**
   - История решений
   - Прогресс по каждому уровню
   - Временные метрики (среднее время, самое быстрое/медленное)

3. **Статистика по уровням (LevelAnalyticsPage):**
   - Сложность уровней (процент успешных решений)
   - Популярность (сколько учеников пытались)
   - Среднее количество попыток
   - Детали по каждому уровню

4. **Сравнение классов (ClassAnalyticsPage):**
   - Детальные страницы по каждому классу
   - Рейтинг учеников внутри класса
   - Статистика класса с визуализацией

5. **Визуализация:**
   - Chart.js для графиков
   - Линейные графики прогресса
   - Bar charts для распределения
   - Тепловая карта активности (стиль GitHub)
   - Простые прогресс-бары

---

## 2. Архитектура

### 2.1 Гибридный подход к агрегации данных

**API уровень (Supabase):**
- Простые запросы с aggregate functions: `COUNT()`, `AVG()`, `SUM()`
- Получение сырых данных для клиентской обработки
- Минимальное использование RPC функций

**Клиентский уровень (React):**
- Вычисление сложных метрик (проценты, рейтинги, распределения)
- Группировка и трансформация данных
- Chart.js для рендеринга графиков

**Преимущества:**
- Простота реализации (не нужны сложные Postgres функции)
- Гибкость на клиенте
- Достаточная производительность для образовательной платформы

### 2.2 Структура компонентов

```
src/features/teacher/
├── pages/
│   ├── StatisticsPage.tsx              # Общий дашборд (новая)
│   ├── StudentAnalyticsPage.tsx        # Детали ученика (расширить)
│   ├── LevelAnalyticsPage.tsx          # Аналитика уровня (новая)
│   └── ClassAnalyticsPage.tsx          # Аналитика класса (новая)
├── components/
│   ├── charts/
│   │   ├── ProgressLineChart.tsx       # Линейный график прогресса
│   │   ├── DistributionBarChart.tsx    # Bar chart распределения
│   │   ├── ActivityHeatmap.tsx         # Тепловая карта активности
│   │   └── SimpleProgressBar.tsx       # CSS прогресс-бар
│   ├── StatCard.tsx                    # Карточка статистики
│   ├── TopStudentsList.tsx             # Список топ учеников
│   ├── StrugglingStudentsList.tsx      # Проблемные ученики
│   └── SubmissionsTable.tsx            # Таблица решений
├── api/
│   └── statisticsApi.ts                # API функции (новый)
└── utils/
    ├── statsCalculations.ts            # Вычисление метрик
    └── dateUtils.ts                    # Работа с датами
```

### 2.3 Маршруты

```
/teacher/statistics              # Общий дашборд
/teacher/students/:id            # Детали ученика (существующий, расширить)
/teacher/levels/:id/analytics    # Аналитика уровня (новый)
/teacher/classes/:name           # Аналитика класса (новый)
```

---

## 3. API слой

### 3.1 statisticsApi.ts

#### Общая статистика

```typescript
/**
 * Получить общую статистику платформы
 */
export async function getOverallStatistics(): Promise<{
  totalStudents: number;
  totalLevels: number;
  totalSubmissions: number;
  averageSuccessRate: number;
  activeStudentsLast7Days: number;
}>

/**
 * Топ учеников по решенным задачам
 */
export async function getTopStudents(limit: number = 10): Promise<Array<{
  student: Profile;
  completedLevels: number;
  successRate: number;
  rank: number;
}>>

/**
 * Проблемные ученики
 * Критерии: низкая успешность (<50%), мало решенных задач, неактивность >7 дней
 */
export async function getStrugglingStudents(): Promise<Array<{
  student: Profile;
  completedLevels: number;
  successRate: number;
  lastActivityDate: string | null;
  issue: 'low_success' | 'low_activity' | 'inactive';
}>>

/**
 * Последняя активность всех учеников
 */
export async function getRecentActivity(limit: number = 20): Promise<Array<{
  submission: Submission;
  student: Profile;
  level: Level;
}>>

/**
 * Прогресс всех учеников за период (для графика)
 */
export async function getProgressOverTime(days: number = 30): Promise<Array<{
  date: string;
  totalCompletedLevels: number;
  totalSubmissions: number;
}>>

/**
 * Распределение учеников по прогрессу
 */
export async function getStudentsDistribution(): Promise<{
  '0-25': number;
  '25-50': number;
  '50-75': number;
  '75-100': number;
}>

/**
 * Агрегированная активность за период
 */
export async function getAggregatedActivity(days: number = 60): Promise<Array<{
  date: string;
  activityCount: number;
}>>
```

#### Статистика ученика

```typescript
/**
 * История всех решений ученика
 */
export async function getStudentSubmissions(
  studentId: string
): Promise<Array<Submission & { level: Level }>>

/**
 * Прогресс ученика по каждому уровню
 */
export async function getStudentLevelProgress(
  studentId: string
): Promise<Array<{
  level: Level;
  status: 'not_started' | 'in_progress' | 'completed';
  attempts: number;
  timeSpent: number;
  lastAttempt: string | null;
  isCorrect: boolean;
}>>

/**
 * Активность ученика за период
 */
export async function getStudentActivity(
  studentId: string,
  days: number = 30
): Promise<Array<{
  date: string;
  submissions: number;
}>>

/**
 * Временные метрики ученика
 */
export async function getStudentTimeMetrics(
  studentId: string
): Promise<{
  averageSolveTime: number;
  fastestSolveTime: number;
  slowestSolveTime: number;
}>
```

#### Статистика уровней

```typescript
/**
 * Статистика по всем уровням
 */
export async function getAllLevelsStatistics(): Promise<Array<{
  level: Level;
  totalAttempts: number;
  uniqueStudents: number;
  completedCount: number;
  successRate: number;
  averageAttempts: number;
}>>

/**
 * Детальная статистика конкретного уровня
 */
export async function getLevelStatistics(levelId: string): Promise<{
  level: Level;
  totalAttempts: number;
  uniqueStudents: number;
  completedCount: number;
  successRate: number;
  averageAttempts: number;
  attemptsDistribution: {
    '1': number;
    '2-3': number;
    '4-5': number;
    '6+': number;
    'unsolved': number;
  };
  submissions: Array<{
    student: Profile;
    attempts: number;
    isCorrect: boolean;
    lastSubmittedAt: string;
  }>;
}>

/**
 * Последние решения уровня
 */
export async function getLevelRecentSubmissions(
  levelId: string,
  limit: number = 20
): Promise<Array<Submission & { student: Profile }>>
```

#### Статистика классов

```typescript
/**
 * Статистика по классу
 */
export async function getClassStatistics(className: string): Promise<{
  className: string;
  totalStudents: number;
  averageCompletedLevels: number;
  averageSuccessRate: number;
  activeStudentsLast7Days: number;
  distribution: {
    '0-25': number;
    '25-50': number;
    '50-75': number;
    '75-100': number;
  };
  students: Array<{
    student: Profile;
    completedLevels: number;
    totalLevels: number;
    successRate: number;
    lastActivity: string | null;
    rank: number;
  }>;
}>

/**
 * Прогресс класса за период
 */
export async function getClassProgressOverTime(
  className: string,
  days: number = 30
): Promise<Array<{
  date: string;
  totalCompletedLevels: number;
}>>

/**
 * Активность класса за период
 */
export async function getClassActivity(
  className: string,
  days: number = 60
): Promise<Array<{
  date: string;
  activityCount: number;
}>>
```

### 3.2 Примеры реализации запросов

**Получение топ учеников:**
```typescript
export async function getTopStudents(limit: number = 10) {
  // 1. Получить всех учеников с прогрессом
  const { data: students } = await supabase
    .from('profiles')
    .select('*, level_progress(status)')
    .eq('role', 'student');

  // 2. Получить submissions для подсчета успешности
  const { data: submissions } = await supabase
    .from('submissions')
    .select('user_id, is_correct');

  // 3. Вычислить метрики на клиенте
  const studentsWithStats = students.map(student => {
    const completed = student.level_progress.filter(
      p => p.status === 'completed'
    ).length;

    const studentSubmissions = submissions.filter(
      s => s.user_id === student.id
    );
    const successRate = calculateSuccessRate(
      studentSubmissions.filter(s => s.is_correct).length,
      studentSubmissions.length
    );

    return {
      student,
      completedLevels: completed,
      successRate
    };
  });

  // 4. Сортировать и вернуть топ
  return studentsWithStats
    .sort((a, b) => b.completedLevels - a.completedLevels)
    .slice(0, limit)
    .map((s, index) => ({ ...s, rank: index + 1 }));
}
```

**Получение статистики уровня:**
```typescript
export async function getLevelStatistics(levelId: string) {
  // 1. Получить уровень
  const { data: level } = await supabase
    .from('levels')
    .select('*')
    .eq('id', levelId)
    .single();

  // 2. Получить все submissions для уровня
  const { data: submissions } = await supabase
    .from('submissions')
    .select('*, profiles(*)')
    .eq('level_id', levelId)
    .order('submitted_at', { ascending: false });

  // 3. Вычислить метрики
  const uniqueStudents = new Set(submissions.map(s => s.user_id)).size;
  const totalAttempts = submissions.length;
  const completedCount = submissions.filter(s => s.is_correct).length;
  const successRate = calculateSuccessRate(completedCount, totalAttempts);

  // 4. Группировать по студентам
  const studentMap = new Map();
  submissions.forEach(s => {
    if (!studentMap.has(s.user_id)) {
      studentMap.set(s.user_id, {
        student: s.profiles,
        attempts: 0,
        isCorrect: false,
        lastSubmittedAt: s.submitted_at
      });
    }
    const student = studentMap.get(s.user_id);
    student.attempts++;
    if (s.is_correct) student.isCorrect = true;
  });

  // 5. Вычислить распределение попыток
  const attemptsDistribution = calculateAttemptsDistribution(
    Array.from(studentMap.values())
  );

  return {
    level,
    totalAttempts,
    uniqueStudents,
    completedCount,
    successRate,
    averageAttempts: totalAttempts / uniqueStudents,
    attemptsDistribution,
    submissions: Array.from(studentMap.values())
  };
}
```

---

## 4. Компоненты визуализации

### 4.1 Chart.js интеграция

**Установка:**
```bash
npm install chart.js react-chartjs-2
```

**Базовая настройка (chartConfig.ts):**
```typescript
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions
} from 'chart.js';

// Регистрация компонентов Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

// Темная тема для графиков
export const defaultChartOptions: ChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: {
        color: '#e4e7eb', // admin-text
        font: {
          family: 'system-ui',
          size: 12
        }
      }
    },
    tooltip: {
      backgroundColor: '#131824', // admin-surface
      titleColor: '#e4e7eb',
      bodyColor: '#8892a6',
      borderColor: '#2a3142',
      borderWidth: 1
    }
  },
  scales: {
    x: {
      ticks: {
        color: '#8892a6', // admin-muted
        font: { size: 11 }
      },
      grid: {
        color: 'rgba(136, 146, 166, 0.1)',
        drawBorder: false
      }
    },
    y: {
      ticks: {
        color: '#8892a6',
        font: { size: 11 }
      },
      grid: {
        color: 'rgba(136, 146, 166, 0.1)',
        drawBorder: false
      }
    }
  }
};
```

### 4.2 ProgressLineChart.tsx

```typescript
import { Line } from 'react-chartjs-2';
import { defaultChartOptions } from './chartConfig';

interface ProgressLineChartProps {
  data: Array<{ date: string; count: number }>;
  label?: string;
  color?: string;
}

export function ProgressLineChart({
  data,
  label = 'Прогресс',
  color = '#00d9ff'
}: ProgressLineChartProps) {
  const chartData = {
    labels: data.map(d => {
      const date = new Date(d.date);
      return date.toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' });
    }),
    datasets: [
      {
        label,
        data: data.map(d => d.count),
        borderColor: color,
        backgroundColor: `${color}20`,
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 5
      }
    ]
  };

  return (
    <div className="h-64">
      <Line data={chartData} options={defaultChartOptions} />
    </div>
  );
}
```

### 4.3 DistributionBarChart.tsx

```typescript
import { Bar } from 'react-chartjs-2';
import { defaultChartOptions } from './chartConfig';

interface DistributionBarChartProps {
  data: Array<{ label: string; count: number; color?: string }>;
}

export function DistributionBarChart({ data }: DistributionBarChartProps) {
  const chartData = {
    labels: data.map(d => d.label),
    datasets: [
      {
        label: 'Количество учеников',
        data: data.map(d => d.count),
        backgroundColor: data.map(d => d.color || '#00d9ff'),
        borderWidth: 0,
        borderRadius: 4
      }
    ]
  };

  const options = {
    ...defaultChartOptions,
    plugins: {
      ...defaultChartOptions.plugins,
      legend: {
        display: false
      }
    }
  };

  return (
    <div className="h-64">
      <Bar data={chartData} options={options} />
    </div>
  );
}
```

### 4.4 ActivityHeatmap.tsx

```typescript
import { useMemo } from 'react';

interface ActivityHeatmapProps {
  data: Array<{ date: string; activityCount: number }>;
  tooltip?: (date: string, count: number) => string;
}

export function ActivityHeatmap({ data, tooltip }: ActivityHeatmapProps) {
  // Группировать данные по неделям и дням
  const weeks = useMemo(() => {
    const weekMap = new Map<number, Array<{ date: string; count: number }>>();

    data.forEach(item => {
      const date = new Date(item.date);
      const week = Math.floor(
        (date.getTime() - new Date(data[0].date).getTime()) / (7 * 24 * 60 * 60 * 1000)
      );

      if (!weekMap.has(week)) {
        weekMap.set(week, []);
      }
      weekMap.get(week)!.push({ date: item.date, count: item.activityCount });
    });

    return Array.from(weekMap.values());
  }, [data]);

  // Определить цвет ячейки по активности
  const getColor = (count: number) => {
    if (count === 0) return 'bg-admin-bg';
    if (count < 5) return 'bg-admin-accent/20';
    if (count < 10) return 'bg-admin-accent/40';
    if (count < 20) return 'bg-admin-accent/60';
    return 'bg-admin-accent';
  };

  return (
    <div className="overflow-x-auto">
      <div className="inline-flex gap-1">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="flex flex-col gap-1">
            {week.map((day, dayIndex) => (
              <div
                key={dayIndex}
                className={`w-3 h-3 rounded-sm ${getColor(day.count)} transition-colors hover:ring-2 hover:ring-admin-accent cursor-pointer`}
                title={tooltip ? tooltip(day.date, day.count) : `${day.date}: ${day.count}`}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Легенда */}
      <div className="flex items-center gap-2 mt-4 text-xs text-admin-muted">
        <span>Меньше</span>
        <div className="flex gap-1">
          <div className="w-3 h-3 bg-admin-bg rounded-sm" />
          <div className="w-3 h-3 bg-admin-accent/20 rounded-sm" />
          <div className="w-3 h-3 bg-admin-accent/40 rounded-sm" />
          <div className="w-3 h-3 bg-admin-accent/60 rounded-sm" />
          <div className="w-3 h-3 bg-admin-accent rounded-sm" />
        </div>
        <span>Больше</span>
      </div>
    </div>
  );
}
```

### 4.5 SimpleProgressBar.tsx

```typescript
interface SimpleProgressBarProps {
  value: number;
  max?: number;
  color?: 'green' | 'yellow' | 'orange' | 'red' | 'accent';
  height?: number;
  showLabel?: boolean;
}

export function SimpleProgressBar({
  value,
  max = 100,
  color = 'accent',
  height = 16,
  showLabel = false
}: SimpleProgressBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const colorClasses = {
    green: 'bg-learning-success',
    yellow: 'bg-yellow-400',
    orange: 'bg-orange-500',
    red: 'bg-red-500',
    accent: 'bg-admin-accent'
  };

  return (
    <div>
      {showLabel && (
        <div className="flex justify-between text-xs text-admin-muted mb-1">
          <span>{value}</span>
          <span>{max}</span>
        </div>
      )}
      <div
        className="w-full bg-admin-bg rounded-full overflow-hidden"
        style={{ height: `${height}px` }}
      >
        <div
          className={`h-full ${colorClasses[color]} transition-all duration-500 ease-out rounded-full`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
```

---

## 5. Страницы

### 5.1 StatisticsPage - общий дашборд

**Структура:**

```typescript
export function StatisticsPage() {
  const [stats, setStats] = useState<OverallStatistics | null>(null);
  const [topStudents, setTopStudents] = useState<Student[]>([]);
  const [strugglingStudents, setStrugglingStudents] = useState<Student[]>([]);
  const [progressData, setProgressData] = useState<ProgressData[]>([]);
  const [distribution, setDistribution] = useState<Distribution | null>(null);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [recentSubmissions, setRecentSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStatistics();
  }, []);

  async function loadStatistics() {
    try {
      const [
        statsData,
        topData,
        strugglingData,
        progressData,
        distributionData,
        activityData,
        recentData
      ] = await Promise.all([
        getOverallStatistics(),
        getTopStudents(10),
        getStrugglingStudents(),
        getProgressOverTime(30),
        getStudentsDistribution(),
        getAggregatedActivity(60),
        getRecentActivity(20)
      ]);

      setStats(statsData);
      setTopStudents(topData);
      setStrugglingStudents(strugglingData);
      setProgressData(progressData);
      setDistribution(distributionData);
      setActivity(activityData);
      setRecentSubmissions(recentData);
    } catch (error) {
      // Handle error
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-admin-text">Статистика</h1>
        <p className="text-admin-muted mt-1">
          Общий обзор успеваемости всех учеников
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Всего учеников" value={stats.totalStudents} />
        <StatCard title="Всего уровней" value={stats.totalLevels} />
        <StatCard title="Всего попыток" value={stats.totalSubmissions} />
        <StatCard
          title="Средняя успешность"
          value={`${stats.averageSuccessRate}%`}
        />
      </div>

      {/* Progress Chart */}
      <Card>
        <h2 className="text-xl font-semibold text-admin-text mb-4">
          Прогресс за последние 30 дней
        </h2>
        <ProgressLineChart
          data={progressData}
          label="Решенных задач"
        />
      </Card>

      {/* Distribution */}
      <Card>
        <h2 className="text-xl font-semibold text-admin-text mb-4">
          Распределение учеников по прогрессу
        </h2>
        <DistributionBarChart
          data={[
            { label: '0-25%', count: distribution['0-25'], color: '#ef4444' },
            { label: '25-50%', count: distribution['25-50'], color: '#f59e0b' },
            { label: '50-75%', count: distribution['50-75'], color: '#10b981' },
            { label: '75-100%', count: distribution['75-100'], color: '#00d9ff' }
          ]}
        />
      </Card>

      {/* Activity Heatmap */}
      <Card>
        <h2 className="text-xl font-semibold text-admin-text mb-4">
          Активность учеников за последние 60 дней
        </h2>
        <ActivityHeatmap
          data={activity}
          tooltip={(date, count) => `${date}: ${count} решений`}
        />
      </Card>

      {/* Top & Struggling Students */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <h2 className="text-xl font-semibold text-admin-text mb-4">
            Топ 10 учеников
          </h2>
          <TopStudentsList students={topStudents} />
        </Card>

        <Card>
          <h2 className="text-xl font-semibold text-admin-text mb-4">
            Требуют внимания
          </h2>
          <StrugglingStudentsList students={strugglingStudents} />
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <h2 className="text-xl font-semibold text-admin-text mb-4">
          Последняя активность
        </h2>
        <SubmissionsTable
          submissions={recentSubmissions}
          showStudent={true}
          limit={20}
        />
      </Card>
    </div>
  );
}
```

### 5.2 StudentAnalyticsPage - расширение

**Добавить к существующей странице:**

```typescript
// После существующих карточек статистики

{/* История решений */}
<Card>
  <h2 className="text-xl font-semibold text-admin-text mb-4">
    История решений
  </h2>
  <SubmissionsTable
    submissions={studentSubmissions}
    showStudent={false}
    showLevel={true}
    showCode={true}
  />
</Card>

{/* Прогресс по уровням */}
<Card>
  <h2 className="text-xl font-semibold text-admin-text mb-4">
    Прогресс по уровням
  </h2>
  <div className="space-y-2">
    {levelProgress.map(lp => (
      <div
        key={lp.level.id}
        className="flex items-center gap-4 p-3 bg-admin-bg rounded-lg"
      >
        <div className={`w-3 h-3 rounded-full ${
          lp.status === 'completed' ? 'bg-learning-success' :
          lp.status === 'in_progress' ? 'bg-yellow-400' :
          'bg-admin-muted'
        }`} />

        <div className="flex-1">
          <div className="font-medium text-admin-text">{lp.level.title}</div>
          <div className="text-xs text-admin-muted">
            {lp.attempts} попыток • {lp.timeSpent}с
          </div>
        </div>

        <div className="text-sm text-admin-muted">
          {lp.lastAttempt ? formatDate(lp.lastAttempt) : 'Не начато'}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/teacher/levels/${lp.level.id}/analytics`)}
        >
          Подробнее
        </Button>
      </div>
    ))}
  </div>
</Card>

{/* График активности - заменяет placeholder */}
<Card>
  <h2 className="text-xl font-semibold text-admin-text mb-4">
    Активность за последние 30 дней
  </h2>
  <ProgressLineChart
    data={studentActivity}
    label="Попыток решений"
  />
</Card>

{/* Временные метрики - дополнить существующую секцию */}
<div className="flex justify-between items-center py-2 border-b border-admin-muted/10">
  <span>Среднее время решения:</span>
  <span className="text-admin-text font-medium">
    {formatTime(timeMetrics.averageSolveTime)}
  </span>
</div>
<div className="flex justify-between items-center py-2 border-b border-admin-muted/10">
  <span>Самое быстрое решение:</span>
  <span className="text-admin-text font-medium">
    {formatTime(timeMetrics.fastestSolveTime)}
  </span>
</div>
<div className="flex justify-between items-center py-2">
  <span>Самое долгое решение:</span>
  <span className="text-admin-text font-medium">
    {formatTime(timeMetrics.slowestSolveTime)}
  </span>
</div>
```

### 5.3 LevelAnalyticsPage

```typescript
export function LevelAnalyticsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [levelStats, setLevelStats] = useState<LevelStatistics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadLevelStatistics(id);
    }
  }, [id]);

  async function loadLevelStatistics(levelId: string) {
    try {
      const stats = await getLevelStatistics(levelId);
      setLevelStats(stats);
    } catch (error) {
      // Handle error
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <Spinner />;
  if (!levelStats) return <div>Уровень не найден</div>;

  const { level, totalAttempts, uniqueStudents, completedCount,
          successRate, averageAttempts, attemptsDistribution, submissions } = levelStats;

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumbs items={[
        { label: 'Уровни', path: '/teacher/levels' },
        { label: level.title }
      ]} />

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-admin-text">{level.title}</h1>
        <div className="flex gap-2 mt-2">
          <Badge>{level.difficulty}</Badge>
          <Badge variant="secondary">{level.topic}</Badge>
        </div>
        <p className="text-admin-muted mt-2">{level.description}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Всего попыток" value={totalAttempts} />
        <StatCard title="Уникальных студентов" value={uniqueStudents} />
        <StatCard
          title="Успешно решили"
          value={completedCount}
          subtitle={`${successRate}%`}
        />
        <StatCard title="Средняя попыток" value={averageAttempts.toFixed(1)} />
      </div>

      {/* Difficulty Assessment */}
      <Card>
        <h2 className="text-xl font-semibold text-admin-text mb-4">
          Оценка сложности
        </h2>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-admin-muted">Успешных решений</span>
              <span className="text-admin-text font-medium">{successRate}%</span>
            </div>
            <SimpleProgressBar
              value={successRate}
              color={
                successRate >= 75 ? 'green' :
                successRate >= 50 ? 'yellow' :
                successRate >= 25 ? 'orange' : 'red'
              }
            />
          </div>

          <div className="text-right">
            <div className="text-2xl font-bold">
              {successRate >= 75 ? '😊 Легко' :
               successRate >= 50 ? '🤔 Средне' :
               successRate >= 25 ? '😰 Сложно' : '😱 Очень сложно'}
            </div>
            <div className="text-xs text-admin-muted">
              на основе {completedCount} из {uniqueStudents} студентов
            </div>
          </div>
        </div>
      </Card>

      {/* Attempts Distribution */}
      <Card>
        <h2 className="text-xl font-semibold text-admin-text mb-4">
          Распределение попыток до успеха
        </h2>
        <DistributionBarChart
          data={[
            { label: '1 попытка', count: attemptsDistribution['1'] },
            { label: '2-3 попытки', count: attemptsDistribution['2-3'] },
            { label: '4-5 попыток', count: attemptsDistribution['4-5'] },
            { label: '6+ попыток', count: attemptsDistribution['6+'] },
            { label: 'Не решили', count: attemptsDistribution['unsolved'] }
          ]}
        />
      </Card>

      {/* Students Results Table */}
      <Card>
        <h2 className="text-xl font-semibold text-admin-text mb-4">
          Результаты студентов
        </h2>
        <table className="w-full">
          <thead className="bg-admin-bg border-b border-admin-muted/10">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-admin-muted uppercase">
                Студент
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-admin-muted uppercase">
                Класс
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-admin-muted uppercase">
                Попыток
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-admin-muted uppercase">
                Статус
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-admin-muted uppercase">
                Последняя попытка
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-admin-muted uppercase">
                Действия
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-admin-muted/10">
            {submissions.map(s => (
              <tr key={s.student.id} className="hover:bg-admin-bg/50">
                <td className="px-6 py-4">
                  {s.student.first_name} {s.student.last_name}
                </td>
                <td className="px-6 py-4">{s.student.class}</td>
                <td className="px-6 py-4">{s.attempts}</td>
                <td className="px-6 py-4">
                  {s.isCorrect ? (
                    <Badge variant="success">✓ Решено</Badge>
                  ) : (
                    <Badge variant="warning">В процессе</Badge>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-admin-muted">
                  {formatDate(s.lastSubmittedAt)}
                </td>
                <td className="px-6 py-4 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/teacher/students/${s.student.id}`)}
                  >
                    Профиль
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
```

### 5.4 ClassAnalyticsPage

```typescript
export function ClassAnalyticsPage() {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const [classStats, setClassStats] = useState<ClassStatistics | null>(null);
  const [classProgress, setClassProgress] = useState<ProgressData[]>([]);
  const [classActivity, setClassActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (name) {
      loadClassStatistics(name);
    }
  }, [name]);

  async function loadClassStatistics(className: string) {
    try {
      const [stats, progress, activity] = await Promise.all([
        getClassStatistics(className),
        getClassProgressOverTime(className, 30),
        getClassActivity(className, 60)
      ]);

      setClassStats(stats);
      setClassProgress(progress);
      setClassActivity(activity);
    } catch (error) {
      // Handle error
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <Spinner />;
  if (!classStats) return <div>Класс не найден</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Button variant="ghost" onClick={() => navigate('/teacher/students')}>
          ← Назад к студентам
        </Button>
        <h1 className="text-3xl font-bold text-admin-text mt-4">
          Класс {classStats.className}
        </h1>
        <p className="text-admin-muted mt-1">
          Детальная статистика и рейтинг учеников
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Всего учеников" value={classStats.totalStudents} />
        <StatCard
          title="Средняя решенных задач"
          value={classStats.averageCompletedLevels.toFixed(1)}
        />
        <StatCard
          title="Средняя успешность"
          value={`${classStats.averageSuccessRate}%`}
        />
        <StatCard
          title="Активных за 7 дней"
          value={classStats.activeStudentsLast7Days}
        />
      </div>

      {/* Progress Chart */}
      <Card>
        <h2 className="text-xl font-semibold text-admin-text mb-4">
          Прогресс класса за последние 30 дней
        </h2>
        <ProgressLineChart
          data={classProgress}
          label="Всего решенных задач классом"
        />
      </Card>

      {/* Distribution */}
      <Card>
        <h2 className="text-xl font-semibold text-admin-text mb-4">
          Распределение учеников по прогрессу
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-red-500/10 border border-red-500 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-red-500">
              {classStats.distribution['0-25']}
            </div>
            <div className="text-sm text-admin-muted">0-25%</div>
          </div>
          <div className="bg-yellow-500/10 border border-yellow-500 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-yellow-500">
              {classStats.distribution['25-50']}
            </div>
            <div className="text-sm text-admin-muted">25-50%</div>
          </div>
          <div className="bg-green-500/10 border border-green-500 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-500">
              {classStats.distribution['50-75']}
            </div>
            <div className="text-sm text-admin-muted">50-75%</div>
          </div>
          <div className="bg-admin-accent/10 border border-admin-accent rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-admin-accent">
              {classStats.distribution['75-100']}
            </div>
            <div className="text-sm text-admin-muted">75-100%</div>
          </div>
        </div>
        <DistributionBarChart
          data={[
            { label: '0-25%', count: classStats.distribution['0-25'], color: '#ef4444' },
            { label: '25-50%', count: classStats.distribution['25-50'], color: '#f59e0b' },
            { label: '50-75%', count: classStats.distribution['50-75'], color: '#10b981' },
            { label: '75-100%', count: classStats.distribution['75-100'], color: '#00d9ff' }
          ]}
        />
      </Card>

      {/* Ranking */}
      <Card>
        <h2 className="text-xl font-semibold text-admin-text mb-4">
          Рейтинг учеников класса
        </h2>
        <div className="space-y-2">
          {classStats.students
            .sort((a, b) => b.completedLevels - a.completedLevels)
            .map((student, index) => (
              <div
                key={student.student.id}
                className="flex items-center gap-4 p-3 bg-admin-bg rounded-lg hover:bg-admin-surface transition-colors cursor-pointer"
                onClick={() => navigate(`/teacher/students/${student.student.id}`)}
              >
                <div className={`text-2xl font-bold ${
                  index === 0 ? 'text-yellow-400' :
                  index === 1 ? 'text-gray-400' :
                  index === 2 ? 'text-orange-400' :
                  'text-admin-muted'
                }`}>
                  #{index + 1}
                </div>

                <div className="flex-1">
                  <div className="font-medium text-admin-text">
                    {student.student.first_name} {student.student.last_name}
                  </div>
                  <div className="text-xs text-admin-muted">
                    {student.student.generated_login}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm font-medium text-admin-text">
                    {student.completedLevels} задач
                  </div>
                  <div className="text-xs text-admin-muted">
                    {student.successRate}% успешность
                  </div>
                </div>

                <div className="w-16">
                  <SimpleProgressBar
                    value={(student.completedLevels / student.totalLevels) * 100}
                    height={8}
                  />
                </div>
              </div>
            ))}
        </div>
      </Card>

      {/* Activity Heatmap */}
      <Card>
        <h2 className="text-xl font-semibold text-admin-text mb-4">
          Активность класса за последние 60 дней
        </h2>
        <ActivityHeatmap
          data={classActivity}
          tooltip={(date, value) => `${date}: ${value} решений от класса`}
        />
      </Card>
    </div>
  );
}
```

---

## 6. Утилиты

### 6.1 statsCalculations.ts

Описаны в Секции 8 дизайна выше.

### 6.2 dateUtils.ts

Описаны в Секции 8 дизайна выше.

---

## 7. Навигация и маршруты

### 7.1 Обновление App.tsx

```typescript
// Добавить новые роуты
<Route path="/teacher/statistics" element={<StatisticsPage />} />
<Route path="/teacher/levels/:id/analytics" element={<LevelAnalyticsPage />} />
<Route path="/teacher/classes/:name" element={<ClassAnalyticsPage />} />
```

### 7.2 Навигационные элементы

**В StudentsPage - ссылки на классы:**
```typescript
{classes.map(cls => (
  <Link
    to={`/teacher/classes/${cls}`}
    className="px-3 py-1 bg-admin-surface hover:bg-admin-accent/20 rounded-lg"
  >
    {cls}
  </Link>
))}
```

**В LevelsManagePage - кнопка аналитики:**
```typescript
<Button onClick={() => navigate(`/teacher/levels/${level.id}/analytics`)}>
  📊 Статистика
</Button>
```

### 7.3 Breadcrumbs компонент

```typescript
interface BreadcrumbItem {
  label: string;
  path?: string;
}

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <div className="flex items-center gap-2 text-sm text-admin-muted mb-4">
      {items.map((item, index) => (
        <Fragment key={index}>
          {index > 0 && <span>/</span>}
          {item.path ? (
            <Link to={item.path} className="hover:text-admin-accent">
              {item.label}
            </Link>
          ) : (
            <span className="text-admin-text">{item.label}</span>
          )}
        </Fragment>
      ))}
    </div>
  );
}
```

---

## 8. Производительность и оптимизация

### 8.1 Кеширование

**Опционально: React Query**
```typescript
import { useQuery } from '@tanstack/react-query';

function useStatistics() {
  return useQuery({
    queryKey: ['statistics', 'overall'],
    queryFn: getOverallStatistics,
    staleTime: 5 * 60 * 1000, // 5 минут
  });
}
```

**Или простой useMemo:**
```typescript
const memoizedStats = useMemo(
  () => calculateStatistics(rawData),
  [rawData]
);
```

### 8.2 Lazy loading графиков

```typescript
const ProgressLineChart = lazy(() =>
  import('./components/charts/ProgressLineChart')
);

// В компоненте
<Suspense fallback={<Spinner />}>
  <ProgressLineChart data={data} />
</Suspense>
```

### 8.3 Пагинация больших таблиц

```typescript
// Для таблиц с >100 записями
const [page, setPage] = useState(1);
const pageSize = 20;
const paginatedData = data.slice((page - 1) * pageSize, page * pageSize);
```

---

## 9. Responsive дизайн

### 9.1 Адаптивные сетки

```typescript
// Desktop: 4 колонки, Tablet: 2, Mobile: 1
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  <StatCard />
</div>
```

### 9.2 Таблицы на мобильных

```typescript
// Скрыть колонки на маленьких экранах
<th className="hidden md:table-cell">Класс</th>
<td className="hidden md:table-cell">{student.class}</td>

// Или карточки вместо таблицы
<div className="md:hidden space-y-2">
  {students.map(s => (
    <Card key={s.id}>
      {/* Карточка вместо строки таблицы */}
    </Card>
  ))}
</div>
```

---

## 10. Тестирование

### 10.1 Unit тесты

**API функции:**
- `statisticsApi.test.ts` - тесты всех API функций
- `statsCalculations.test.ts` - тесты утилит вычислений
- `dateUtils.test.ts` - тесты работы с датами

**Компоненты:**
- `ProgressLineChart.test.tsx`
- `DistributionBarChart.test.tsx`
- `ActivityHeatmap.test.tsx`
- `TopStudentsList.test.tsx`
- `StrugglingStudentsList.test.tsx`

### 10.2 Интеграционные тесты

**Сценарии:**
1. Загрузка общего дашборда со всеми данными
2. Переход к деталям ученика из топ-листа
3. Просмотр статистики уровня
4. Навигация между страницами статистики
5. Фильтрация и сортировка данных

---

## 11. План миграции

### 11.1 База данных

Новых миграций не требуется - используем существующие таблицы:
- `profiles`
- `levels`
- `submissions`
- `level_progress`

### 11.2 Обратная совместимость

**Существующая StudentAnalyticsPage:**
- Расширяется новыми секциями, старые остаются
- Placeholder "Последняя активность" заменяется на график

**Навигация:**
- Добавляются новые роуты, старые не меняются
- Существующая ссылка /teacher/statistics теперь ведет на StatisticsPage

---

## 12. Roadmap реализации

### Phase 1: Инфраструктура
- [ ] Установка Chart.js и react-chartjs-2
- [ ] Создание statisticsApi.ts
- [ ] Создание statsCalculations.ts и dateUtils.ts
- [ ] Базовая настройка Chart.js (chartConfig.ts)

### Phase 2: Базовые компоненты
- [ ] StatCard компонент
- [ ] SimpleProgressBar компонент
- [ ] Breadcrumbs компонент
- [ ] SubmissionsTable компонент

### Phase 3: Графики
- [ ] ProgressLineChart компонент
- [ ] DistributionBarChart компонент
- [ ] ActivityHeatmap компонент

### Phase 4: Списки
- [ ] TopStudentsList компонент
- [ ] StrugglingStudentsList компонент

### Phase 5: Страницы
- [ ] StatisticsPage (общий дашборд)
- [ ] Расширение StudentAnalyticsPage
- [ ] LevelAnalyticsPage
- [ ] ClassAnalyticsPage

### Phase 6: Интеграция
- [ ] Добавление роутов в App.tsx
- [ ] Навигационные ссылки
- [ ] Breadcrumbs на страницах
- [ ] Тестирование навигации

### Phase 7: Оптимизация и полировка
- [ ] Lazy loading графиков
- [ ] Мемоизация вычислений
- [ ] Responsive дизайн
- [ ] Тестирование производительности

### Phase 8: Тестирование
- [ ] Unit тесты API
- [ ] Unit тесты утилит
- [ ] Component тесты
- [ ] Интеграционные тесты

---

## 13. Известные ограничения

1. **Производительность при больших данных** - клиентская агрегация может быть медленной при >1000 учеников. Решение: переход на RPC функции.

2. **Тепловая карта активности** - упрощенная реализация без сложных библиотек (cal-heatmap). Достаточно для MVP.

3. **Отсутствие реального времени** - данные не обновляются автоматически. Требуется ручное обновление страницы.

4. **Chart.js ограничения** - некоторые продвинутые визуализации могут быть сложны. При необходимости можно добавить D3.js.

5. **Нет экспорта данных** - отсутствует функционал экспорта статистики в CSV/PDF. Можно добавить в будущем.

---

## 14. Заключение

Этот дизайн обеспечивает полную систему статистики и аналитики для преподавателей платформы Sarpedon:

- **Общий дашборд** - быстрый обзор всей платформы
- **Детальная статистика ученика** - полная картина прогресса
- **Аналитика уровней** - понимание сложности заданий
- **Сравнение классов** - конкуренция и мотивация

Архитектура гибридная (клиент+сервер), визуализация через Chart.js, интеграция со всеми существующими страницами платформы.
