// Components
export { DisplayLayout } from './components/DisplayLayout';
export { ClassSelector } from './components/ClassSelector';

// Widgets
export { StudentsListWidget } from './components/widgets/StudentsListWidget';
export { ClassStatsWidget } from './components/widgets/ClassStatsWidget';
export { LessonMonitorWidget } from './components/widgets/LessonMonitorWidget';
export { TopAuthorsWidget } from './components/widgets/TopAuthorsWidget';

// Pages
export { DisplayDashboard } from './pages/DisplayDashboard';
export { DisplayStudentsPage } from './pages/DisplayStudentsPage';
export { DisplayStatsPage } from './pages/DisplayStatsPage';
export { DisplayLessonPage } from './pages/DisplayLessonPage';
export { DisplayAuthorsPage } from './pages/DisplayAuthorsPage';

// API
export * from './api/displayApi';

// Hooks
export { useAutoRefresh } from './hooks/useAutoRefresh';

// Types
export type * from './types/display.types';
