import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './features/auth/pages/LoginPage';
import { RoleGuard } from './shared/components/guards/RoleGuard';
import { StudentLayout } from './layouts/StudentLayout';
import { TeacherLayout } from './layouts/TeacherLayout';
import { LevelsListPage, SolveLevelPage, ProgressPage } from './features/learning/pages';
import { useAuthStore } from './features/auth/store/authStore';
import { getCurrentUser, getProfile } from './features/auth/api/authApi';
import { Spinner } from './shared/components/ui';

// Placeholder components for routes (will be implemented in future tasks)
function StudentDashboard() {
  return <div className="text-learning-text">Панель студента - в разработке</div>;
}

function TeacherDashboard() {
  return <div className="text-admin-text">Панель преподавателя - в разработке</div>;
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

        {/* Student routes */}
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
                  <Route path="competitions" element={<div>Соревнования - в разработке</div>} />
                </Routes>
              </StudentLayout>
            </RoleGuard>
          }
        />

        {/* Teacher routes */}
        <Route
          path="/teacher/*"
          element={
            <RoleGuard allowedRoles={['teacher', 'editor']}>
              <TeacherLayout>
                <Routes>
                  <Route index element={<TeacherDashboard />} />
                  <Route path="students" element={<div>Ученики - в разработке</div>} />
                  <Route path="levels" element={<div>Уровни - в разработке</div>} />
                  <Route path="competitions" element={<div>Соревнования - в разработке</div>} />
                  <Route path="statistics" element={<div>Статистика - в разработке</div>} />
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

  if (role === 'teacher' || role === 'editor') {
    return <Navigate to="/teacher" replace />;
  }

  // Fallback to login if role is not set
  return <Navigate to="/login" replace />;
}

export default App;
