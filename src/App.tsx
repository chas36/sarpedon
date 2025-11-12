import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './features/auth/pages/LoginPage';
import { RoleGuard } from './shared/components/guards/RoleGuard';
import { StudentLayout } from './layouts/StudentLayout';
import { TeacherLayout } from './layouts/TeacherLayout';
import { LevelsListPage, SolveLevelPage, ProgressPage } from './features/learning/pages';
import { LevelsManagePage } from './features/teacher/pages/LevelsManagePage';
import { LevelEditorPage } from './features/teacher/pages/LevelEditorPage';
import { StudentsPage } from './features/teacher/pages/StudentsPage';
import { StudentDetailsPage } from './features/teacher/pages/StudentDetailsPage';
import { StatisticsPage } from './features/teacher/pages/StatisticsPage';
import { StudentAnalyticsPage } from './features/teacher/pages/StudentAnalyticsPage';
import { LevelAnalyticsPage } from './features/teacher/pages/LevelAnalyticsPage';
import { ClassAnalyticsPage } from './features/teacher/pages/ClassAnalyticsPage';
import { ProficiencyDashboardPage } from './features/teacher/pages/ProficiencyDashboardPage';
import { ModerationPage } from './features/teacher/pages/ModerationPage';
import { AuthorStatsPage } from './features/teacher/pages/AuthorStatsPage';
import { TakeEntranceTestPage } from './features/entrance-test/pages/TakeEntranceTestPage';
import { EntranceTestResultsPage } from './features/entrance-test/pages/EntranceTestResultsPage';
import { EntranceTestManagePage } from './features/entrance-test/pages/EntranceTestManagePage';
import { EntranceTestEditorPage } from './features/entrance-test/pages/EntranceTestEditorPage';
import { EditorLevelsListPage, SimpleLevelEditorPage } from './features/editor/pages';
import { useAuthStore } from './features/auth/store/authStore';
import { getCurrentUser, getProfile } from './features/auth/api/authApi';
import { Spinner } from './shared/components/ui';

function TeacherDashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-admin-text">Панель преподавателя</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-admin-surface rounded-lg p-6 border border-admin-muted/10">
          <h2 className="text-xl font-semibold text-admin-text mb-2">Студенты</h2>
          <p className="text-admin-muted text-sm">Управление учениками и просмотр прогресса</p>
        </div>
        <div className="bg-admin-surface rounded-lg p-6 border border-admin-muted/10">
          <h2 className="text-xl font-semibold text-admin-text mb-2">Уровни</h2>
          <p className="text-admin-muted text-sm">Создание и редактирование заданий</p>
        </div>
        <div className="bg-admin-surface rounded-lg p-6 border border-admin-muted/10">
          <h2 className="text-xl font-semibold text-admin-text mb-2">Статистика</h2>
          <p className="text-admin-muted text-sm">Аналитика и отчеты</p>
        </div>
      </div>
    </div>
  );
}

function App() {
  const { user, setUser, setProfile } = useAuthStore();
  const [initializing, setInitializing] = useState(true);

  // Восстановить сессию при загрузке приложения
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const currentUser = await getCurrentUser();

        if (currentUser) {
          // Получить профиль пользователя
          const userProfile = await getProfile(currentUser.id);

          // Обновить store
          setUser(currentUser);
          setProfile(userProfile);
        }
      } catch (error) {
        // Сессия не найдена или истекла - это нормально
        console.log('No active session');
      } finally {
        setInitializing(false);
      }
    };

    restoreSession();
  }, [setUser, setProfile]);

  // Показать загрузку пока инициализируемся
  if (initializing) {
    return (
      <div className="min-h-screen bg-learning-bg flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route
          path="/login"
          element={
            user ? <Navigate to="/" replace /> : <LoginPage />
          }
        />

        {/* Student routes (также используется редакторами) */}
        <Route
          path="/student/*"
          element={
            <RoleGuard allowedRoles={['student']}>
              <StudentLayout>
                <Routes>
                  <Route index element={<Navigate to="/student/levels" replace />} />
                  <Route path="levels" element={<LevelsListPage />} />
                  <Route path="levels/:levelId/solve" element={<SolveLevelPage />} />
                  <Route path="progress" element={<ProgressPage />} />
                  <Route path="entrance-test/:testId" element={<TakeEntranceTestPage />} />
                  <Route path="competitions" element={<div>Соревнования - в разработке</div>} />
                  {/* Editor routes - только для студентов с is_editor=true */}
                  <Route path="editor/my-levels" element={<EditorLevelsListPage />} />
                  <Route path="editor/levels/:id" element={<SimpleLevelEditorPage />} />
                </Routes>
              </StudentLayout>
            </RoleGuard>
          }
        />

        {/* Teacher routes - только для учителей */}
        <Route
          path="/teacher/*"
          element={
            <RoleGuard allowedRoles={['teacher']}>
              <TeacherLayout>
                <Routes>
                  <Route index element={<TeacherDashboard />} />
                  <Route path="students" element={<StudentsPage />} />
                  <Route path="students/:id" element={<StudentDetailsPage />} />
                  <Route path="students/:id/analytics" element={<StudentAnalyticsPage />} />
                  <Route path="proficiency-analytics" element={<ProficiencyDashboardPage />} />
                  <Route path="levels" element={<LevelsManagePage />} />
                  <Route path="levels/:id" element={<LevelEditorPage />} />
                  <Route path="levels/:id/analytics" element={<LevelAnalyticsPage />} />
                  <Route path="classes/:name" element={<ClassAnalyticsPage />} />
                  <Route path="entrance-tests" element={<EntranceTestManagePage />} />
                  <Route path="entrance-tests/results" element={<EntranceTestResultsPage />} />
                  <Route path="entrance-tests/:testId/edit" element={<EntranceTestEditorPage />} />
                  <Route path="moderation" element={<ModerationPage />} />
                  <Route path="author-stats" element={<AuthorStatsPage />} />
                  <Route path="competitions" element={<div>Соревнования - в разработке</div>} />
                  <Route path="statistics" element={<StatisticsPage />} />
                </Routes>
              </TeacherLayout>
            </RoleGuard>
          }
        />

        {/* Root redirect based on role */}
        <Route
          path="/"
          element={
            user ? (
              <RoleRedirect />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* Catch all - redirect to login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

// Helper component to redirect based on user role
function RoleRedirect() {
  const { role } = useAuthStore();

  if (role === 'student') {
    return <Navigate to="/student" replace />;
  }

  if (role === 'teacher') {
    return <Navigate to="/teacher" replace />;
  }

  // Fallback to login if role is not set
  return <Navigate to="/login" replace />;
}

export default App;
