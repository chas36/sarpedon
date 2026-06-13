// Proficiency system types
export type ProficiencyLevel = 'beginner' | 'intermediate' | 'advanced';

export interface ProficiencyData {
  level: ProficiencyLevel;
  score: number; // 0-100
  last_assessed: string | null;
  manual_override: boolean;
}

export interface SkillProficiency {
  skill_name: string;
  skill_display_name: string;
  proficiency_percentage: number; // 0-100
  submissions_count: number;
  successful_count: number;
  last_practiced: string | null;
}

export interface WeakArea {
  skill_name: string;
  skill_display_name: string;
  proficiency_percentage: number;
}

export interface ProficiencyHistory {
  id: string;
  old_level: ProficiencyLevel | null;
  new_level: ProficiencyLevel;
  old_score: number | null;
  new_score: number;
  reason: 'auto_calculation' | 'manual_override' | 'entrance_test' | 'initial_assessment';
  changed_at: string;
  changed_by: string | null;
}

// Helper functions
export const getProficiencyColor = (level: ProficiencyLevel): string => {
  switch (level) {
    case 'beginner':
      return 'text-yellow-400';
    case 'intermediate':
      return 'text-blue-400';
    case 'advanced':
      return 'text-purple-400';
  }
};

export const getProficiencyBadgeColor = (level: ProficiencyLevel): string => {
  switch (level) {
    case 'beginner':
      return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    case 'intermediate':
      return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'advanced':
      return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
  }
};

export const getProficiencyLabel = (level: ProficiencyLevel): string => {
  switch (level) {
    case 'beginner':
      return 'Начинающий';
    case 'intermediate':
      return 'Средний';
    case 'advanced':
      return 'Продвинутый';
  }
};

export const getSkillDisplayName = (skillName: string): string => {
  const skillNames: Record<string, string> = {
    syntax: 'Синтаксис',
    variables: 'Переменные',
    operators: 'Операторы',
    conditionals: 'Условия',
    loops: 'Циклы',
    functions: 'Функции',
    arrays: 'Массивы',
    objects: 'Объекты',
    io: 'Ввод/Вывод',
    debugging: 'Отладка',
    algorithms: 'Алгоритмы',
    testing: 'Тестирование',
  };
  return skillNames[skillName] || skillName;
};
