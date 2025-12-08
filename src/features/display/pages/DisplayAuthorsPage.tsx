import { useEffect, useState } from 'react';
import { getTopAuthors } from '../api/displayApi';
import type { AuthorStats } from '../types/display.types';
import { Spinner } from '@/shared/components/ui';

export function DisplayAuthorsPage() {
  const [authors, setAuthors] = useState<AuthorStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAuthors();
  }, []);

  const loadAuthors = async () => {
    try {
      setLoading(true);
      const data = await getTopAuthors(20); // Get top 20 instead of 5
      setAuthors(data);
    } catch (error) {
      console.error('Failed to load authors:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-learning-text mb-2">
          Статистика авторов
        </h1>
        <p className="text-learning-muted">
          Топ авторов уровней по количеству созданных заданий
        </p>
      </div>

      <div className="bg-learning-surface rounded-lg border border-learning-muted/10 overflow-hidden">
        <table className="w-full">
          <thead className="bg-learning-bg">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-learning-text">
                Место
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-learning-text">
                Автор
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-learning-text">
                Уровней создано
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-learning-muted/10">
            {authors.map((author, index) => (
              <tr key={author.authorId} className="hover:bg-learning-bg/50 transition-colors">
                <td className="px-6 py-4 text-learning-text font-bold">
                  {index < 3 ? (
                    <span className="text-2xl">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                    </span>
                  ) : (
                    <span className="text-learning-muted">#{index + 1}</span>
                  )}
                </td>
                <td className="px-6 py-4 text-learning-text">
                  {author.authorName}
                </td>
                <td className="px-6 py-4 text-learning-text font-semibold">
                  {author.levelCount}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
