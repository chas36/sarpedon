import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/shared/components/ui';
import { useAuthStore } from '@/features/auth/store/authStore';
import {
  hasCompletedEntranceTest,
  getActiveEntranceTests
} from '../api/entranceTestApi';
import type { EntranceTest } from '../api/entranceTestApi';

export function EntranceTestPrompt() {
  // TODO: Временно отключено из-за проблем с RPC endpoint complete_entrance_test
  // После переработки системы входного тестирования - вернуть функциональность
  return null;

  /* DISABLED CODE - будет использоваться после исправления
  const { user, profile } = useAuthStore();
  const navigate = useNavigate();
  const [showPrompt, setShowPrompt] = useState(false);
  const [availableTest, setAvailableTest] = useState<EntranceTest | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkEntranceTestStatus();
  }, [user, profile]);

  const checkEntranceTestStatus = async () => {
    if (!user || !profile || profile.role !== 'student') {
      setLoading(false);
      return;
    }

    // Check if student already has proficiency set (either from test or manual)
    if (profile.proficiency_level && profile.proficiency_level !== 'beginner') {
      setLoading(false);
      return;
    }

    try {
      // Check if student has completed entrance test
      const completed = await hasCompletedEntranceTest(user.id);

      if (completed) {
        setLoading(false);
        return;
      }

      // Get available entrance tests
      const tests = await getActiveEntranceTests();

      if (tests.length > 0) {
        setAvailableTest(tests[0]);

        // Check if we should show prompt (only on first visit or if dismissed < 3 times)
        const dismissCount = parseInt(localStorage.getItem('entrance_test_dismiss_count') || '0');
        if (dismissCount < 3) {
          setShowPrompt(true);
        }
      }
    } catch (err) {
      console.error('Error checking entrance test status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTakeTest = () => {
    if (availableTest) {
      navigate(`/student/entrance-test/${availableTest.id}`);
    }
  };

  const handleDismiss = () => {
    const currentCount = parseInt(localStorage.getItem('entrance_test_dismiss_count') || '0');
    localStorage.setItem('entrance_test_dismiss_count', (currentCount + 1).toString());
    setShowPrompt(false);
  };

  if (loading || !showPrompt || !availableTest) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-learning-accent/10 to-learning-accent/5 border border-learning-accent/20 rounded-lg p-6 mb-6">
      <div className="flex items-start gap-4">
        <div className="text-4xl">🎯</div>
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-learning-text mb-2">
            Пройдите входное тестирование
          </h3>
          <p className="text-learning-muted mb-4">
            Мы подготовили короткий тест, который поможет определить ваш начальный уровень.
            Это позволит нам давать вам подходящие задания и персонализированные подсказки.
          </p>
          <div className="flex items-center gap-3">
            <div className="text-sm text-learning-muted">
              📝 {availableTest.title}
            </div>
            {availableTest.time_limit_minutes && (
              <div className="text-sm text-learning-muted">
                ⏱️ ~{availableTest.time_limit_minutes} минут
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Button onClick={handleTakeTest} size="sm">
            Пройти тест
          </Button>
          <Button onClick={handleDismiss} variant="ghost" size="sm">
            Позже
          </Button>
        </div>
      </div>
    </div>
  );
  */
}
