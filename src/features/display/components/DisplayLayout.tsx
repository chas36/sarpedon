import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { ClassSelector } from './ClassSelector';

export function DisplayLayout() {
  const location = useLocation();
  const [selectedClass, setSelectedClass] = useState<string | null>(() => {
    // Initialize from localStorage immediately
    return localStorage.getItem('displaySelectedClass');
  });
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Debug logging
  useEffect(() => {
    console.log('DisplayLayout mounted, selectedClass:', selectedClass);
  }, []);

  useEffect(() => {
    console.log('selectedClass changed:', selectedClass);
  }, [selectedClass]);

  // Save selected class to localStorage
  const handleClassChange = (className: string) => {
    setSelectedClass(className);
    localStorage.setItem('displaySelectedClass', className);
    setLastUpdate(new Date());
  };

  // Update last update time
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdate(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const getTimeSinceUpdate = () => {
    const seconds = Math.floor((new Date().getTime() - lastUpdate.getTime()) / 1000);
    if (seconds < 60) return `${seconds} сек назад`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes} мин назад`;
  };

  const navItems = [
    { path: '/display', label: 'Dashboard', icon: '📊' },
    { path: '/display/students', label: 'Students', icon: '👥' },
    { path: '/display/stats', label: 'Stats', icon: '📈' },
    { path: '/display/lesson', label: 'Lesson', icon: '🎓' },
    { path: '/display/authors', label: 'Authors', icon: '⭐' },
  ];

  return (
    <div className="flex h-screen bg-learning-bg">
      {/* Sidebar */}
      <aside className="w-20 bg-learning-surface border-r border-learning-muted/10 flex flex-col items-center py-6 space-y-6">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-1 p-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-learning-accent text-white'
                  : 'text-learning-muted hover:bg-learning-muted/10 hover:text-learning-text'
              }`}
              title={item.label}
            >
              <span className="text-2xl">{item.icon}</span>
              <span className="text-xs">{item.label}</span>
            </Link>
          );
        })}
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-learning-surface border-b border-learning-muted/10 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-learning-text">
              Доска мониторинга
            </h1>
            <ClassSelector
              selectedClass={selectedClass}
              onClassChange={handleClassChange}
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-learning-muted">
            <span>🔄</span>
            <span>Обновлено: {getTimeSinceUpdate()}</span>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6">
          {!selectedClass ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-6xl mb-4">📚</div>
                <h2 className="text-2xl font-bold text-learning-text mb-2">
                  Выберите класс
                </h2>
                <p className="text-learning-muted">
                  Выберите класс из выпадающего списка сверху
                </p>
              </div>
            </div>
          ) : (
            <Outlet context={{ selectedClass, onRefresh: () => setLastUpdate(new Date()) }} />
          )}
        </main>
      </div>
    </div>
  );
}
