import { useState, useEffect } from 'react';
import { Modal } from '@/shared/components/ui';
import { Button, Spinner } from '@/shared/components/ui';
import {
  getAllClasses,
  createClass,
  updateClass,
  deleteClass,
  getClassStudentCount,
  type Class,
} from '../api/classesApi';

interface ManageClassesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ManageClassesModal({ isOpen, onClose }: ManageClassesModalProps) {
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [newClassName, setNewClassName] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadClasses();
    }
  }, [isOpen]);

  const loadClasses = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllClasses();
      setClasses(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки классов');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newClassName.trim()) return;

    try {
      setError(null);
      await createClass(newClassName.trim());
      setNewClassName('');
      await loadClasses();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка создания класса');
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editingName.trim()) return;

    try {
      setError(null);
      await updateClass(id, editingName.trim());
      setEditingId(null);
      setEditingName('');
      await loadClasses();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка обновления класса');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    try {
      const count = await getClassStudentCount(name);

      const message =
        count > 0
          ? `В классе ${name} находится ${count} учеников. Они останутся без класса. Удалить класс?`
          : `Удалить класс ${name}?`;

      const confirmed = window.confirm(message);

      if (confirmed) {
        setError(null);
        await deleteClass(id);
        await loadClasses();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка удаления класса');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Управление классами">
      {error && (
        <div className="bg-admin-danger/10 border border-admin-danger rounded-lg p-3 mb-4">
          <p className="text-admin-danger text-sm">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Classes List */}
          <div className="space-y-2">
            {classes.length === 0 ? (
              <p className="text-admin-muted text-center py-4">Нет классов</p>
            ) : (
              classes.map((cls) => (
                <div
                  key={cls.id}
                  className="flex items-center gap-2 p-3 bg-admin-bg rounded-lg"
                >
                  {editingId === cls.id ? (
                    <>
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="flex-1 px-3 py-2 bg-admin-surface border border-admin-muted/20 rounded-lg text-admin-text focus:outline-none focus:ring-2 focus:ring-admin-accent"
                        autoFocus
                      />
                      <Button
                        size="sm"
                        onClick={() => handleUpdate(cls.id)}
                      >
                        Сохранить
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingId(null);
                          setEditingName('');
                        }}
                      >
                        Отмена
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-admin-text font-medium">
                        {cls.name}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingId(cls.id);
                          setEditingName(cls.name);
                        }}
                      >
                        Редактировать
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(cls.id, cls.name)}
                      >
                        Удалить
                      </Button>
                    </>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Add New Class */}
          <div className="pt-4 border-t border-admin-muted/10">
            <h3 className="text-lg font-semibold text-admin-text mb-3">
              Добавить класс
            </h3>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Название класса (например, 10А)"
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleCreate()}
                className="flex-1 px-3 py-2 bg-admin-surface border border-admin-muted/20 rounded-lg text-admin-text focus:outline-none focus:ring-2 focus:ring-admin-accent"
              />
              <Button onClick={handleCreate}>Добавить</Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
