# Дизайн системы управления учениками

**Дата:** 2025-11-02
**Автор:** Brainstorming Session
**Статус:** Утверждено

---

## 1. Обзор

Система управления учениками для учителей платформы Sarpedon. Позволяет учителям добавлять, редактировать, удалять учеников, управлять их учетными данными и классами.

### Основные требования

1. **Управление учениками:**
   - Добавление одного ученика
   - Добавление списком (построчный ввод)
   - Редактирование профиля
   - Удаление ученика
   - Просмотр детальной информации и статистики

2. **Управление учетными данными:**
   - Автогенерация логинов (кириллица + цифры, например: ОКРУГ460)
   - Возможность установить существующие логины
   - Пароль по умолчанию = логин
   - Сброс пароля (пароль = логин)
   - Ручное изменение логина/пароля

3. **Управление классами:**
   - Добавление класса
   - Удаление класса
   - Переименование класса
   - CRUD операции

---

## 2. Архитектура

### 2.1 Архитектурный подход

**Гибридная архитектура:**
- **StudentsPage** - список учеников с фильтрами (существующая страница, расширяется)
- **StudentDetailsPage** - детальная страница ученика с полным профилем
- **Модальные окна** - для быстрых операций (добавление, bulk import, управление классами)

### 2.2 Структура компонентов

```
src/features/teacher/
├── pages/
│   ├── StudentsPage.tsx              # Список учеников (расширить)
│   └── StudentDetailsPage.tsx        # Детали ученика (новая)
├── components/
│   ├── AddStudentModal.tsx           # Добавление одного ученика
│   ├── BulkImportStudentsModal.tsx   # Импорт списком
│   ├── EditStudentModal.tsx          # Редактирование профиля
│   ├── EditCredentialsModal.tsx      # Изменение логина/пароля
│   ├── ManageClassesModal.tsx        # Управление классами
│   └── StudentCredentialsCard.tsx    # Карточка учетных данных
├── api/
│   ├── studentsApi.ts                # API для учеников (расширить)
│   └── classesApi.ts                 # API для классов (новый)
└── utils/
    └── loginGenerator.ts             # Генерация логинов (новый)
```

### 2.3 Маршруты

```
/teacher/students          # Список учеников
/teacher/students/:id      # Детали ученика (новый)
```

---

## 3. База данных

### 3.1 Изменения в таблице profiles

```sql
-- Добавить поле для хранения пароля
ALTER TABLE public.profiles
ADD COLUMN generated_password TEXT;

-- Комментарий
COMMENT ON COLUMN public.profiles.generated_password IS
  'Пароль в открытом виде для отображения учителю (по умолчанию = логин)';
```

### 3.2 Новая таблица classes

```sql
CREATE TABLE public.classes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Индексы
CREATE INDEX idx_classes_name ON public.classes(name);
CREATE INDEX idx_classes_created_by ON public.classes(created_by);

-- Trigger для updated_at
CREATE TRIGGER update_classes_updated_at BEFORE UPDATE ON public.classes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Комментарий
COMMENT ON TABLE public.classes IS 'Классы/группы учеников';
```

### 3.3 Row Level Security (RLS)

```sql
-- Включить RLS для classes
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

-- Политика: только учителя могут управлять классами
CREATE POLICY teacher_manage_classes ON public.classes
  FOR ALL USING (
    auth.uid() IN (
      SELECT id FROM public.profiles WHERE role = 'teacher'
    )
  );

-- Политика: только учителя могут управлять учениками
CREATE POLICY teacher_manage_students ON public.profiles
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT id FROM public.profiles WHERE role = 'teacher'
    )
  );

CREATE POLICY teacher_delete_students ON public.profiles
  FOR DELETE USING (
    auth.uid() IN (
      SELECT id FROM public.profiles WHERE role = 'teacher'
    )
  );
```

---

## 4. API

### 4.1 studentsApi.ts (расширение)

```typescript
/**
 * Создание одного ученика
 */
export async function createStudent(data: {
  firstName: string;
  lastName: string;
  className: string;
  login?: string;  // Опционально, если не указан - генерируем
  password?: string; // Опционально, по умолчанию = login
}): Promise<Profile>

/**
 * Массовое создание учеников
 */
export async function bulkCreateStudents(
  students: Array<{
    firstName: string;
    lastName: string;
    className: string;
    login?: string;
  }>
): Promise<{
  success: Profile[];
  errors: Array<{ student: any; error: string }>;
}>

/**
 * Обновление профиля ученика
 */
export async function updateStudent(
  id: string,
  data: {
    firstName?: string;
    lastName?: string;
    className?: string;
  }
): Promise<Profile>

/**
 * Удаление ученика
 */
export async function deleteStudent(id: string): Promise<void>

/**
 * Сброс пароля (пароль = логин)
 */
export async function resetPassword(id: string): Promise<void>

/**
 * Изменение логина и пароля
 */
export async function updateCredentials(
  id: string,
  login: string,
  password: string
): Promise<void>
```

### 4.2 classesApi.ts (новый файл)

```typescript
/**
 * Получить все классы
 */
export async function getAllClasses(): Promise<Class[]>

/**
 * Создать класс
 */
export async function createClass(name: string): Promise<Class>

/**
 * Обновить название класса
 */
export async function updateClass(id: string, name: string): Promise<Class>

/**
 * Удалить класс (ученики остаются без класса)
 */
export async function deleteClass(id: string): Promise<void>

/**
 * Получить количество учеников в классе
 */
export async function getClassStudentCount(className: string): Promise<number>
```

### 4.3 loginGenerator.ts (новый файл)

```typescript
/**
 * Словарь слов для генерации логинов
 * Реки, озера, животные, географические объекты
 */
const WORDS = [
  // Существующие логины с другого сайта
  'ОКРУГ', 'ГРАНАТ', 'ГЛОБУС', 'ЭНЦЕЛАД', 'КОРДОБА',
  'ГАЛИСИЯ', 'ГУДЗОН', 'НЕМАН',

  // Реки
  'ВОЛГА', 'ДНЕПР', 'ДОН', 'АМУР', 'ЛЕНА', 'ОБЬ', 'ЕНИСЕЙ',
  'АМАЗОНКА', 'НИЛ', 'МИССИСИПИ', 'ЯНЦЗЫ', 'КОНГО',

  // Озёра
  'БАЙКАЛ', 'ЛАДОГА', 'ОНЕЖСКОЕ', 'КАСПИЙ', 'ВИКТОРИЯ',

  // Горы и географические объекты
  'ЭВЕРЕСТ', 'АЛЬПЫ', 'АНДЫ', 'УРАЛ', 'КАВКАЗ', 'АТЛАС',
  'КИЛИМАНДЖАРО', 'МОНБЛАН', 'ЭЛЬБРУС',

  // Животные
  'ТИГР', 'ЛЕВ', 'МЕДВЕДЬ', 'ВОЛК', 'ОРЁЛ', 'СОКОЛ',
  'ДЕЛЬФИН', 'АКУЛА', 'КИТ', 'ПАНТЕРА', 'ГЕПАРД',

  // Планеты и космос
  'МАРС', 'ЮПИТЕР', 'САТУРН', 'ПЛУТОН', 'НЕПТУН',
  'ТИТАН', 'ЕВРОПА', 'ГАНИМЕД'
];

/**
 * Генерация логина: СЛОВО + 3 цифры
 * Пример: ОКРУГ460, ГРАНАТ622
 */
export function generateLogin(): string {
  const word = WORDS[Math.floor(Math.random() * WORDS.length)];
  const digits = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, '0');
  return `${word}${digits}`;
}

/**
 * Генерация уникального логина (проверка в БД)
 */
export async function generateUniqueLogin(): Promise<string> {
  const maxAttempts = 10;

  for (let i = 0; i < maxAttempts; i++) {
    const login = generateLogin();

    // Проверка уникальности
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('generated_login', login)
      .single();

    if (!data) {
      return login;
    }
  }

  throw new Error('Не удалось сгенерировать уникальный логин');
}

/**
 * Валидация логина
 */
export function validateLogin(login: string): string | null {
  // Только заглавные русские буквы и цифры
  const regex = /^[А-ЯЁ0-9]+$/;

  if (!login || login.length < 5 || login.length > 15) {
    return 'Логин должен быть от 5 до 15 символов';
  }

  if (!regex.test(login)) {
    return 'Логин должен содержать только заглавные русские буквы и цифры';
  }

  return null;
}
```

---

## 5. UI Компоненты

### 5.1 StudentsPage (расширение)

**Добавить кнопки в header:**

```tsx
<div className="flex items-center justify-between">
  <div>
    <h1 className="text-3xl font-bold text-admin-text">Студенты</h1>
    <p className="text-admin-muted mt-1">Просмотр и управление учениками</p>
  </div>

  <div className="flex gap-2">
    <Button onClick={() => setShowAddModal(true)}>
      Добавить ученика
    </Button>
    <Button
      variant="secondary"
      onClick={() => setShowBulkImportModal(true)}
    >
      Импорт списком
    </Button>
    <Button
      variant="ghost"
      onClick={() => setShowManageClassesModal(true)}
    >
      Управление классами
    </Button>
  </div>
</div>
```

**Добавить действия в таблицу:**

```tsx
<td className="px-6 py-4 whitespace-nowrap text-right">
  <div className="flex gap-2 justify-end">
    <Button
      variant="ghost"
      size="sm"
      onClick={() => navigate(`/teacher/students/${student.id}`)}
    >
      Подробнее
    </Button>
    <Button
      variant="ghost"
      size="sm"
      onClick={() => handleEdit(student)}
    >
      Редактировать
    </Button>
    <Button
      variant="ghost"
      size="sm"
      onClick={() => handleDelete(student.id)}
    >
      Удалить
    </Button>
  </div>
</td>
```

### 5.2 AddStudentModal

```tsx
interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (student: Profile) => void;
}

export function AddStudentModal({ isOpen, onClose, onSuccess }: AddStudentModalProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [className, setClassName] = useState('');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [showCredentials, setShowCredentials] = useState(false);

  // Генерация логина
  const handleGenerateLogin = async () => {
    const generated = await generateUniqueLogin();
    setLogin(generated);
    setPassword(generated); // Пароль = логин по умолчанию
  };

  const handleSubmit = async () => {
    // Валидация
    // Создание ученика
    // Показать карточку с учетными данными
    setShowCredentials(true);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      {!showCredentials ? (
        <form>
          <Input label="Имя" value={firstName} onChange={setFirstName} />
          <Input label="Фамилия" value={lastName} onChange={setLastName} />
          <Select label="Класс" value={className} onChange={setClassName}>
            {/* Список классов */}
          </Select>

          <div className="flex gap-2">
            <Input label="Логин" value={login} onChange={setLogin} />
            <Button onClick={handleGenerateLogin}>Сгенерировать</Button>
          </div>

          <Input
            label="Пароль (по умолчанию = логин)"
            value={password}
            onChange={setPassword}
          />

          <Button onClick={handleSubmit}>Создать ученика</Button>
        </form>
      ) : (
        <CredentialsCard
          login={login}
          password={password}
          onClose={onClose}
        />
      )}
    </Modal>
  );
}
```

### 5.3 BulkImportStudentsModal

```tsx
interface BulkImportStudentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (students: Profile[]) => void;
}

export function BulkImportStudentsModal({ isOpen, onClose, onSuccess }: BulkImportStudentsModalProps) {
  const [input, setInput] = useState('');
  const [useExistingLogins, setUseExistingLogins] = useState(false);
  const [preview, setPreview] = useState<ParsedStudent[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [results, setResults] = useState<ImportResults | null>(null);

  // Парсинг построчного ввода
  const handlePreview = () => {
    const lines = input.split('\n').filter(line => line.trim());
    const parsed = lines.map(line => {
      const parts = line.trim().split(/\s+/);

      if (useExistingLogins) {
        // Формат: Имя Фамилия Класс ЛОГИН123
        const [firstName, lastName, className, login] = parts;
        return { firstName, lastName, className, login };
      } else {
        // Формат: Имя Фамилия Класс
        const [firstName, lastName, className] = parts;
        return {
          firstName,
          lastName,
          className,
          login: generateLogin() // Генерируем
        };
      }
    });

    setPreview(parsed);
    setShowPreview(true);
  };

  const handleImport = async () => {
    const result = await bulkCreateStudents(preview);
    setResults(result);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="large">
      {!showPreview && !results && (
        <>
          <h2>Импорт учеников списком</h2>
          <p>Введите учеников построчно:</p>

          <Checkbox
            label="Использовать существующие логины"
            checked={useExistingLogins}
            onChange={setUseExistingLogins}
          />

          {useExistingLogins ? (
            <p className="text-sm text-admin-muted">
              Формат: Имя Фамилия Класс ЛОГИН123
              <br />
              Пример: Иван Иванов 10А ОКРУГ460
            </p>
          ) : (
            <p className="text-sm text-admin-muted">
              Формат: Имя Фамилия Класс
              <br />
              Пример: Иван Иванов 10А
            </p>
          )}

          <Textarea
            value={input}
            onChange={setInput}
            rows={10}
            placeholder="Иван Иванов 10А&#10;Петр Петров 10А&#10;Мария Сидорова 10Б"
          />

          <Button onClick={handlePreview}>Предпросмотр</Button>
        </>
      )}

      {showPreview && !results && (
        <>
          <h2>Предпросмотр ({preview.length} учеников)</h2>
          <table>
            <thead>
              <tr>
                <th>Имя</th>
                <th>Фамилия</th>
                <th>Класс</th>
                <th>Логин</th>
                <th>Пароль</th>
              </tr>
            </thead>
            <tbody>
              {preview.map((student, idx) => (
                <tr key={idx}>
                  <td>{student.firstName}</td>
                  <td>{student.lastName}</td>
                  <td>{student.className}</td>
                  <td>{student.login}</td>
                  <td>{student.login}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex gap-2">
            <Button onClick={() => setShowPreview(false)}>Назад</Button>
            <Button onClick={handleImport}>Импортировать</Button>
          </div>
        </>
      )}

      {results && (
        <>
          <h2>Результаты импорта</h2>
          <div className="mb-4">
            <p className="text-green-500">
              Успешно создано: {results.success.length}
            </p>
            <p className="text-red-500">
              Ошибок: {results.errors.length}
            </p>
          </div>

          {results.success.length > 0 && (
            <CredentialsTable students={results.success} />
          )}

          {results.errors.length > 0 && (
            <ErrorTable errors={results.errors} />
          )}

          <div className="flex gap-2">
            <Button onClick={() => downloadCredentials(results.success)}>
              Скачать учетные данные (CSV)
            </Button>
            <Button variant="secondary" onClick={onClose}>
              Закрыть
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}
```

### 5.4 ManageClassesModal

```tsx
interface ManageClassesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ManageClassesModal({ isOpen, onClose }: ManageClassesModalProps) {
  const [classes, setClasses] = useState<Class[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [newClassName, setNewClassName] = useState('');

  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    const data = await getAllClasses();
    setClasses(data);
  };

  const handleCreate = async () => {
    await createClass(newClassName);
    setNewClassName('');
    loadClasses();
  };

  const handleUpdate = async (id: string) => {
    await updateClass(id, editingName);
    setEditingId(null);
    loadClasses();
  };

  const handleDelete = async (id: string, name: string) => {
    const count = await getClassStudentCount(name);

    const confirmed = window.confirm(
      count > 0
        ? `В классе ${name} находится ${count} учеников. Они останутся без класса. Удалить класс?`
        : `Удалить класс ${name}?`
    );

    if (confirmed) {
      await deleteClass(id);
      loadClasses();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h2>Управление классами</h2>

      <div className="space-y-2">
        {classes.map(cls => (
          <div key={cls.id} className="flex items-center gap-2">
            {editingId === cls.id ? (
              <>
                <Input
                  value={editingName}
                  onChange={setEditingName}
                />
                <Button onClick={() => handleUpdate(cls.id)}>
                  Сохранить
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setEditingId(null)}
                >
                  Отмена
                </Button>
              </>
            ) : (
              <>
                <span className="flex-1">{cls.name}</span>
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
        ))}
      </div>

      <div className="mt-4 pt-4 border-t">
        <h3>Добавить класс</h3>
        <div className="flex gap-2">
          <Input
            placeholder="Название класса (например, 10А)"
            value={newClassName}
            onChange={setNewClassName}
          />
          <Button onClick={handleCreate}>Добавить</Button>
        </div>
      </div>
    </Modal>
  );
}
```

### 5.5 StudentDetailsPage

```tsx
export function StudentDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [student, setStudent] = useState<StudentWithProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showEditCredentialsModal, setShowEditCredentialsModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    loadStudent();
  }, [id]);

  const loadStudent = async () => {
    const data = await getStudentWithProgress(id);
    setStudent(data);
    setLoading(false);
  };

  const handleResetPassword = async () => {
    const confirmed = window.confirm(
      'Сбросить пароль? Новый пароль будет равен логину.'
    );

    if (confirmed) {
      await resetPassword(id);
      loadStudent();
      toast.success('Пароль сброшен');
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(
      `Удалить ученика ${student.first_name} ${student.last_name}? ` +
      `Все данные о прогрессе будут удалены. Это действие нельзя отменить.`
    );

    if (confirmed) {
      await deleteStudent(id);
      toast.success('Ученик удален');
      navigate('/teacher/students');
    }
  };

  if (loading) return <Spinner />;
  if (!student) return <div>Ученик не найден</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-admin-text">
            {student.first_name} {student.last_name}
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge>{student.class || 'Без класса'}</Badge>
            <Badge variant="secondary">{student.role}</Badge>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={() => setShowEditModal(true)}>
            Редактировать профиль
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            Удалить ученика
          </Button>
        </div>
      </div>

      {/* Учетные данные */}
      <Card>
        <h3 className="text-xl font-semibold mb-4">Учетные данные</h3>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-admin-muted">Логин:</label>
            <div className="flex gap-2 mt-1">
              <Input
                value={student.generated_login || student.id.slice(0, 8)}
                readOnly
              />
              <Button
                variant="ghost"
                onClick={() => copyToClipboard(student.generated_login)}
              >
                Копировать
              </Button>
            </div>
          </div>

          <div>
            <label className="text-sm text-admin-muted">Пароль:</label>
            <div className="flex gap-2 mt-1">
              <Input
                value={student.generated_password || '******'}
                readOnly
                type={showPassword ? 'text' : 'password'}
              />
              <Button
                variant="ghost"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? 'Скрыть' : 'Показать'}
              </Button>
              <Button
                variant="ghost"
                onClick={() => copyToClipboard(student.generated_password)}
              >
                Копировать
              </Button>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="secondary"
              onClick={handleResetPassword}
            >
              Сбросить пароль (пароль = логин)
            </Button>
            <Button
              variant="secondary"
              onClick={() => setShowEditCredentialsModal(true)}
            >
              Изменить логин/пароль
            </Button>
          </div>
        </div>
      </Card>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Всего задач"
          value={student.total_levels || 0}
        />
        <StatCard
          title="Решено"
          value={student.completed_levels || 0}
          variant="success"
        />
        <StatCard
          title="В процессе"
          value={student.in_progress_levels || 0}
          variant="warning"
        />
        <StatCard
          title="Успешность"
          value={`${student.success_rate || 0}%`}
          variant="info"
        />
      </div>

      {/* История решений */}
      <Card>
        <h3 className="text-xl font-semibold mb-4">История решений</h3>
        <SubmissionsTable studentId={id} />
      </Card>

      {/* Модальные окна */}
      {showEditModal && (
        <EditStudentModal
          student={student}
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            loadStudent();
            setShowEditModal(false);
          }}
        />
      )}

      {showEditCredentialsModal && (
        <EditCredentialsModal
          student={student}
          isOpen={showEditCredentialsModal}
          onClose={() => setShowEditCredentialsModal(false)}
          onSuccess={() => {
            loadStudent();
            setShowEditCredentialsModal(false);
          }}
        />
      )}
    </div>
  );
}
```

### 5.6 EditStudentModal

```tsx
interface EditStudentModalProps {
  student: Profile;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditStudentModal({ student, isOpen, onClose, onSuccess }: EditStudentModalProps) {
  const [firstName, setFirstName] = useState(student.first_name);
  const [lastName, setLastName] = useState(student.last_name);
  const [className, setClassName] = useState(student.class || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await updateStudent(student.id, {
        firstName,
        lastName,
        className
      });
      toast.success('Профиль обновлен');
      onSuccess();
    } catch (error) {
      toast.error('Ошибка при обновлении профиля');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h2>Редактировать профиль</h2>

      <form onSubmit={handleSubmit}>
        <Input
          label="Имя"
          value={firstName}
          onChange={setFirstName}
          required
        />

        <Input
          label="Фамилия"
          value={lastName}
          onChange={setLastName}
          required
        />

        <Select
          label="Класс"
          value={className}
          onChange={setClassName}
        >
          <option value="">Без класса</option>
          {/* Список классов */}
        </Select>

        <div className="flex gap-2 mt-4">
          <Button type="submit" loading={loading}>
            Сохранить
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Отмена
          </Button>
        </div>
      </form>
    </Modal>
  );
}
```

### 5.7 EditCredentialsModal

```tsx
interface EditCredentialsModalProps {
  student: Profile;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditCredentialsModal({ student, isOpen, onClose, onSuccess }: EditCredentialsModalProps) {
  const [login, setLogin] = useState(student.generated_login || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    // Валидация
    const loginError = validateLogin(login);
    if (loginError) {
      setError(loginError);
      return;
    }

    if (password !== confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }

    if (password.length < 6) {
      setError('Пароль должен быть минимум 6 символов');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await updateCredentials(student.id, login, password);
      toast.success('Учетные данные обновлены');
      onSuccess();
    } catch (error) {
      setError(error.message || 'Ошибка при обновлении');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h2>Изменить логин и пароль</h2>

      {error && (
        <div className="bg-red-500/10 border border-red-500 rounded p-3 mb-4">
          <p className="text-red-500">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <Input
          label="Новый логин"
          value={login}
          onChange={setLogin}
          placeholder="ОКРУГ460"
          required
        />

        <Input
          label="Новый пароль"
          type="password"
          value={password}
          onChange={setPassword}
          required
        />

        <Input
          label="Подтвердите пароль"
          type="password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          required
        />

        <div className="flex gap-2 mt-4">
          <Button type="submit" loading={loading}>
            Сохранить
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Отмена
          </Button>
        </div>
      </form>
    </Modal>
  );
}
```

---

## 6. Безопасность

### 6.1 Валидация данных

**На клиенте:**
- **Имя/Фамилия:** не пустые, минимум 2 символа, только буквы
- **Логин:** кириллица (заглавные) + цифры, 5-15 символов, уникальный
- **Класс:** выбор из существующих или создание нового
- **Пароль:** минимум 6 символов

**На сервере:**
- `UNIQUE` constraint на `generated_login`
- `CHECK` constraint на формат полей
- Foreign key integrity
- RLS policies для доступа

### 6.2 Обработка ошибок

**При создании ученика:**
- Логин занят → предложить новый сгенерированный
- Ошибка сети → toast с возможностью повтора
- Ошибка валидации → показать под полем

**При bulk import:**
- Ошибка парсинга → пометить строку красным
- Частичный успех → таблица результатов (успех/ошибка)
- Возможность скачать только успешные или повторить ошибочные

**При удалении:**
- Подтверждение с предупреждением
- Cascade delete для связанных данных
- Toast с информацией об успехе

**При удалении класса:**
- Показать количество учеников в классе
- Предупреждение, что ученики останутся без класса
- Подтверждение действия

### 6.3 Хранение паролей

**Важно:**
- Пароль хранится в `generated_password` в открытом виде для отображения учителю
- Это допустимо для образовательной платформы со сгенерированными паролями
- Учителю нужно выдавать пароли ученикам
- В `auth.users` пароль хешируется Supabase Auth автоматически

**Альтернатива (если нужна большая безопасность):**
- Не хранить пароль после создания
- Показывать пароль только один раз при создании
- Сброс пароля генерирует новый (не восстанавливает старый)

---

## 7. Дополнительные функции

### 7.1 Экспорт учетных данных

**Форматы:**
- **CSV:** для импорта в Excel
- **PDF:** для печати и раздачи ученикам
- **Копирование в буфер обмена**

**Содержимое:**
```
Имя, Фамилия, Класс, Логин, Пароль
Иван, Иванов, 10А, ОКРУГ460, ОКРУГ460
Петр, Петров, 10А, ГРАНАТ622, ГРАНАТ622
```

### 7.2 Фильтрация и поиск

**На странице StudentsPage:**
- Фильтр по классу (уже есть)
- Поиск по имени/фамилии (добавить)
- Сортировка по столбцам (добавить)

### 7.3 Уведомления

**Toast notifications для:**
- Успешное создание ученика
- Успешное обновление
- Успешное удаление
- Ошибки с описанием проблемы

---

## 8. План миграции данных

### 8.1 Миграция базы данных

**Новый файл:** `supabase/migrations/20251102000000_student_management.sql`

```sql
-- Добавить поле generated_password в profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS generated_password TEXT;

COMMENT ON COLUMN public.profiles.generated_password IS
  'Пароль в открытом виде для отображения учителю';

-- Создать таблицу classes
CREATE TABLE IF NOT EXISTS public.classes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_classes_name ON public.classes(name);
CREATE INDEX idx_classes_created_by ON public.classes(created_by);

CREATE TRIGGER update_classes_updated_at BEFORE UPDATE ON public.classes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE public.classes IS 'Классы/группы учеников';

-- RLS для classes
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY teacher_manage_classes ON public.classes
  FOR ALL USING (
    auth.uid() IN (
      SELECT id FROM public.profiles WHERE role = 'teacher'
    )
  );

-- Заполнить таблицу classes из существующих данных
INSERT INTO public.classes (name)
SELECT DISTINCT class
FROM public.profiles
WHERE role = 'student' AND class IS NOT NULL
ON CONFLICT (name) DO NOTHING;
```

### 8.2 Обратная совместимость

**Существующие ученики:**
- Поле `class` остается в `profiles` (не удаляем)
- Новая таблица `classes` используется для управления
- Существующие ученики без `generated_login` - отображать `id.slice(0, 8)`
- Существующие ученики без `generated_password` - показывать "******"

---

## 9. Тестирование

### 9.1 Unit тесты

**API функции:**
- `loginGenerator.test.ts` - тесты генерации и валидации логинов
- `studentsApi.test.ts` - тесты CRUD операций
- `classesApi.test.ts` - тесты управления классами

**Компоненты:**
- `AddStudentModal.test.tsx`
- `BulkImportStudentsModal.test.tsx`
- `ManageClassesModal.test.tsx`
- `StudentDetailsPage.test.tsx`

### 9.2 Интеграционные тесты

**Сценарии:**
1. Создание ученика с автогенерацией логина
2. Создание ученика с существующим логином
3. Bulk import списка учеников
4. Редактирование профиля ученика
5. Сброс пароля
6. Изменение учетных данных
7. Удаление ученика
8. Управление классами (CRUD)

### 9.3 E2E тесты

**User flows:**
1. Учитель добавляет ученика → видит учетные данные → копирует их
2. Учитель импортирует список учеников → скачивает CSV с учетными данными
3. Учитель открывает детали ученика → сбрасывает пароль → копирует новый пароль
4. Учитель редактирует профиль → изменяет класс → видит изменения в списке
5. Учитель удаляет класс → ученики остаются без класса

---

## 10. Roadmap

### Phase 1: Базовый функционал (MVP)
- ✅ Дизайн утвержден
- [ ] Миграции базы данных
- [ ] API функции (studentsApi, classesApi, loginGenerator)
- [ ] AddStudentModal
- [ ] EditStudentModal
- [ ] StudentDetailsPage базовый
- [ ] Расширение StudentsPage (кнопки, действия)

### Phase 2: Bulk import
- [ ] BulkImportStudentsModal
- [ ] Парсинг построчного ввода
- [ ] Предпросмотр данных
- [ ] Экспорт учетных данных (CSV)

### Phase 3: Управление классами
- [ ] ManageClassesModal
- [ ] CRUD операции для классов
- [ ] Интеграция с выбором класса

### Phase 4: Расширенный функционал
- [ ] EditCredentialsModal
- [ ] Поиск и продвинутая фильтрация
- [ ] Сортировка в таблице
- [ ] Экспорт в PDF

### Phase 5: Тестирование и полировка
- [ ] Unit тесты
- [ ] Интеграционные тесты
- [ ] E2E тесты
- [ ] UX улучшения
- [ ] Accessibility

---

## 11. Известные ограничения

1. **Хранение паролей в открытом виде** - допустимо для образовательной платформы, но может быть проблемой безопасности в других контекстах

2. **Генерация логинов** - ограниченный словарь слов может привести к коллизиям при большом количестве учеников (решается расширением словаря)

3. **Удаление класса** - не каскадно удаляет учеников, они остаются без класса (это намеренно)

4. **Bulk import** - нет валидации формата email, если в будущем добавится email

5. **Без истории изменений** - нет аудита изменений учетных данных (можно добавить в будущем)

---

## 12. Заключение

Этот дизайн обеспечивает полный функционал управления учениками для учителей платформы Sarpedon:

- **Гибкое добавление:** одиночное или массовое
- **Управление учетными данными:** генерация, сброс, ручное изменение
- **Управление классами:** полный CRUD
- **Детальная информация:** профиль, статистика, история

Архитектура расширяема, безопасна и соответствует существующей структуре проекта.
