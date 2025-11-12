interface ComingSoonPageProps {
  title: string;
  description: string;
  character?: 'muskva' | 'johnny' | 'panda';
  theme?: 'learning' | 'admin';
}

export function ComingSoonPage({
  title,
  description,
  character = 'johnny',
  theme = 'learning'
}: ComingSoonPageProps) {
  const bgClass = theme === 'learning' ? 'bg-learning-surface' : 'bg-admin-surface';
  const textClass = theme === 'learning' ? 'text-learning-text' : 'text-admin-text';
  const mutedClass = theme === 'learning' ? 'text-learning-muted' : 'text-admin-muted';
  const accentClass = theme === 'learning' ? 'text-learning-accent' : 'text-admin-accent';
  const borderClass = theme === 'learning' ? 'border-learning-muted/20' : 'border-admin-muted/20';

  const characters = {
    muskva: {
      emoji: '🐻',
      name: 'Мусква',
      message: 'Дурачок! Эта функция еще в разработке! Хе-хе-хе!',
      mood: 'Злорадный CEO медведь наблюдает за вашим ожиданием...',
    },
    johnny: {
      emoji: '🧸',
      name: 'Джонни',
      message: 'Ур-ур-ур! Ур-ур-ур-ур-ур!',
      mood: 'Джонни говорит, что эта функция скоро появится!',
      translation: '(Переводчик: "Привет! Эта функция в разработке!")',
    },
    panda: {
      emoji: '🐼',
      name: 'Панда',
      message: 'Хочется капучино... ☕',
      mood: 'Панда мечтательно думает о новых функциях и кофе',
    },
  };

  const selectedChar = characters[character];

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className={`max-w-2xl mx-auto text-center space-y-6 ${bgClass} rounded-lg p-8 border ${borderClass}`}>
        {/* Character */}
        <div className="text-8xl animate-bounce">
          {selectedChar.emoji}
        </div>

        {/* Character Message */}
        <div className="space-y-2">
          <h2 className={`text-2xl font-bold ${textClass}`}>
            {selectedChar.name}
          </h2>
          <p className={`text-lg ${accentClass} font-medium`}>
            {selectedChar.message}
          </p>
          {selectedChar.translation && (
            <p className={`text-sm ${mutedClass} italic`}>
              {selectedChar.translation}
            </p>
          )}
          <p className={`text-sm ${mutedClass}`}>
            {selectedChar.mood}
          </p>
        </div>

        {/* Divider */}
        <div className={`border-t ${borderClass} my-6`} />

        {/* Coming Soon Info */}
        <div className="space-y-3">
          <h3 className={`text-xl font-semibold ${textClass}`}>
            {title}
          </h3>
          <p className={mutedClass}>
            {description}
          </p>
        </div>

        {/* Fun Message */}
        <div className={`${bgClass} border ${borderClass} rounded-md p-4 mt-6`}>
          <p className={`text-sm ${mutedClass}`}>
            💡 <strong>Подсказка:</strong> Пока эта функция готовится, можешь изучить доступные уровни!
          </p>
        </div>

        {/* Loading Animation */}
        <div className="flex items-center justify-center gap-2 pt-4">
          <div className={`w-2 h-2 rounded-full ${theme === 'learning' ? 'bg-learning-accent' : 'bg-admin-accent'} animate-pulse`} />
          <div className={`w-2 h-2 rounded-full ${theme === 'learning' ? 'bg-learning-accent' : 'bg-admin-accent'} animate-pulse`} style={{ animationDelay: '0.2s' }} />
          <div className={`w-2 h-2 rounded-full ${theme === 'learning' ? 'bg-learning-accent' : 'bg-admin-accent'} animate-pulse`} style={{ animationDelay: '0.4s' }} />
        </div>
      </div>
    </div>
  );
}
