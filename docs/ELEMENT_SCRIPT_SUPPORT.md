# Поддержка 1С:Элемент Скрипт

Sarpedon использует идентификатор языка `elementscript` и расширение файлов
`.sbsl`. Интерфейс, подсветка Monaco и клиентский маршрут выполнения уже
поддерживают этот язык.

## Схема выполнения

```text
браузер -> Supabase Edge Function -> изолированный runner -> executor main.sbsl
```

Edge Function `execute-element-script`:

- принимает запрос только от авторизованного пользователя Supabase;
- ограничивает частоту, размер кода и стандартного ввода;
- не передаёт секрет runner в браузер;
- устанавливает лимиты времени и памяти в запросе к runner;
- приводит ответ runner к общему формату Sarpedon.

Сам `executor` нельзя запускать внутри Supabase Edge Function. Runner должен
работать в отдельном изолированном окружении. Не запускайте пользовательский
код непосредственно на хосте Sarpedon или eJudge без контейнерной песочницы,
ограничения процессов, сети и доступной файловой системы.

## Контракт runner

Edge Function отправляет `POST` на `ELEMENT_SCRIPT_RUNNER_URL`:

```json
{
  "language": "elementscript",
  "version": "9.1.8-1",
  "files": [
    { "name": "main.sbsl", "content": "..." }
  ],
  "stdin": "",
  "args": [],
  "run_timeout": 3000,
  "run_memory_limit": 268435456
}
```

Заголовок авторизации:

```text
Authorization: Bearer <ELEMENT_SCRIPT_RUNNER_TOKEN>
```

Ожидаемый ответ совместим с Piston:

```json
{
  "run": {
    "stdout": "результат\n",
    "stderr": "",
    "code": 0,
    "wall_time": 125
  }
}
```

Runner обязан сохранить первый файл во временный каталог как `main.sbsl`,
выполнить `executor main.sbsl`, передать процессу `stdin`, а затем полностью
удалить временный каталог. Значения лимитов из запроса нельзя считать
доверенными: runner должен применять собственные верхние границы.

## Настройка Supabase

Перед развёртыванием функции задайте секреты:

```bash
supabase secrets set \
  ELEMENT_SCRIPT_RUNNER_URL=https://runner.example/api/v2/execute \
  ELEMENT_SCRIPT_RUNNER_TOKEN=<случайный-длинный-токен> \
  ELEMENT_SCRIPT_VERSION=9.1.8-1
```

Затем разверните функцию:

```bash
supabase functions deploy execute-element-script
```

После развёртывания проверьте две программы через пользовательский интерфейс:

1. корректную программу с выводом и чтением `stdin`;
2. программу с синтаксической ошибкой — текст ошибки должен появиться в
   `stderr`, а `exitCode` должен быть ненулевым.

До настройки секретов функция намеренно отвечает HTTP 503 и сообщает, что
среда выполнения ещё не настроена.
