import { useEffect, useState } from 'react';
import { getTopAuthors } from '../../api/displayApi';
import type { AuthorStats } from '../../types/display.types';
import { Spinner } from '@/shared/components/ui';

export function TopAuthorsWidget() {
  const [authors, setAuthors] = useState<AuthorStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAuthors();
  }, []);

  const loadAuthors = async () => {
    try {
      setLoading(true);
      const data = await getTopAuthors(5);
      setAuthors(data);
    } catch (error) {
      console.error('Failed to load authors:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-learning-surface rounded-lg p-6 border border-learning-muted/10">
        <h3 className="text-lg font-semibold text-learning-text mb-4">
          ⭐ Топ авторов
        </h3>
        <div className="flex justify-center py-8">
          <Spinner size="md" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-learning-surface rounded-lg p-6 border border-learning-muted/10">
      <h3 className="text-lg font-semibold text-learning-text mb-4">
        ⭐ Топ авторов уровней
      </h3>

      {authors.length === 0 ? (
        <p className="text-learning-muted text-center py-8">
          Нет данных об авторах
        </p>
      ) : (
        <div className="space-y-3">
          {authors.map((author, index) => (
            <div
              key={author.authorId}
              className="flex items-center justify-between p-3 bg-learning-bg rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className="text-2xl font-bold text-learning-accent">
                  #{index + 1}
                </div>
                <div>
                  <div className="font-medium text-learning-text">
                    {author.authorName}
                  </div>
                  <div className="text-sm text-learning-muted">
                    {author.levelCount} уровней
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
