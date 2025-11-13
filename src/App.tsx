import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './features/auth/pages/LoginPage';
import { RoleGuard } from './shared/components/guards/RoleGuard';
import { StudentLayout } from './layouts/StudentLayout';
import { TeacherLayout } from './layouts/TeacherLayout';
import { LevelsListPage, SolveLevelPage, ProgressPage } from './features/learning/pages';
import { StudentDashboardPage } from './features/learning/pages/StudentDashboardPage';
import { TeacherDashboardPage } from './features/teacher/pages/TeacherDashboardPage';
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
import { LessonMonitorPage } from './features/lessons/pages/LessonMonitorPage';
// TODO: Entrance test pages temporarily disabled - will be re-enabled after refactoring
// import { TakeEntranceTestPage } from './features/entrance-test/pages/TakeEntranceTestPage';
import { EntranceTestResultsPage } from './features/entrance-test/pages/EntranceTestResultsPage';
import { EntranceTestManagePage } from './features/entrance-test/pages/EntranceTestManagePage';
import { EntranceTestEditorPage } from './features/entrance-test/pages/EntranceTestEditorPage';
import { EditorLevelsListPage, SimpleLevelEditorPage } from './features/editor/pages';
import { useAuthStore } from './features/auth/store/authStore';
import { getCurrentUser, getProfile } from './features/auth/api/authApi';
import { Spinner } from './shared/components/ui';
import { ComingSoonPage } from './shared/components/ComingSoonPage';

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
                  <Route index element={<StudentDashboardPage />} />
                  <Route path="levels" element={<LevelsListPage />} />
                  <Route path="levels/:levelId/solve" element={<SolveLevelPage />} />
                  <Route path="progress" element={<ProgressPage />} />
                  {/* TODO: Временно отключено - требуется переработка системы входного тестирования */}
                  {/* <Route path="entrance-test/:testId" element={<TakeEntranceTestPage />} /> */}
                  <Route
                    path="competitions"
                    element={
                      <ComingSoonPage
                        title="Командные соревнования"
                        description="Здесь ты сможешь участвовать в командных турнирах, соревноваться с одноклассниками и зарабатывать награды! Функция уже близко к запуску."
                        character="johnny"
                        theme="learning"
                      />
                    }
                  />
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
                  <Route index element={<TeacherDashboardPage />} />
                  <Route path="lesson-monitor" element={<LessonMonitorPage />} />
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
                  <Route
                    path="competitions"
                    element={
                      <ComingSoonPage
                        title="Командные соревнования"
                        description="Здесь вы сможете создавать турниры для ваших классов, формировать команды и отслеживать результаты. Функция находится в активной разработке."
                        character="muskva"
                        theme="admin"
                      />
                    }
                  />
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
