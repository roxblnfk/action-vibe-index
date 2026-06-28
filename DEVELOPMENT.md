# Разработка Vibe Index Action

## Локальное тестирование

### Предварительные требования

- Node.js 20+
- Git
- npm

### Установка

```bash
npm install
```

### Запуск тестов

```bash
npm test
```

Тесты проверяют:
- Вычисление Vibe Index
- Обработку edge cases
- Генерирование badge URL
- Валидацию входных данных

### Локальный запуск анализатора

Для анализа текущего репозитория:

```bash
node src/analyzer.js
```

Или скрипт анализа:

```bash
npm run analyze
```

## Структура кода

### `src/index.js` - Точка входа
- Читает GitHub Actions inputs
- Валидирует входные параметры
- Вызывает анализатор
- Устанавливает outputs
- Обрабатывает assertion checks

### `src/analyzer.js` - Анализ репозитория
- `analyzeRepository(options)` - главная функция анализа
- Получает информацию о коммитах через git
- Подсчитывает строки кода
- Определяет авторство (человек/AI)

### `src/calculator.js` - Вычисление метрик
- `calculateVibeIndex(analysis)` - преобразует метрики в Vibe Index
- `getColorForIndex(vibeIndex)` - выбор цвета по баллам
- `getDescriptionForIndex(vibeIndex)` - текстовое описание

### `src/badge.js` - Генерация badge
- `generateBadgeUrl(options)` - создает URL shields.io
- `generateBadgeMarkdown(url)` - markdown синтаксис
- `generateBadgeHtml(url)` - HTML синтаксис

### `src/validation.js` - Валидация параметров
- `validateAllInputs(inputs)` - проверка всех параметров
- Отдельные функции валидации для каждого параметра

## Добавление новых AI-ключевых слов

Для добавления нового сервиса AI в список ключевых слов по умолчанию:

1. Отредактировать `action.yml`:
```yaml
ai-keywords:
  description: 'Keywords to detect AI authorship in co-author field'
  required: false
  default: 'Claude,GPT,AI,Agent,NewAIService'  # <- добавить здесь
```

2. Обновить README с новым ключевым словом

3. Добавить пример использования в EXAMPLES.md

## Изменение формулы Vibe Index

Текущая формула:
```
Vibe Index = (human_code_ratio × 0.6 + human_commits_ratio × 0.4) × 10
```

Для изменения:

1. Отредактировать функцию в `src/calculator.js`:
```javascript
function calculateVibeIndex(analysis) {
  const humanCodeRatio = humanPercentage / 100;
  const humanCommitsRatio = humanCommitsPercentage / 100;

  // Новая формула здесь
  const vibeIndex = (humanCodeRatio * 0.5 + humanCommitsRatio * 0.5) * 10;
  
  return {
    vibeIndex: Math.max(0, Math.min(10, vibeIndex)),
    metrics: { /* ... */ }
  };
}
```

2. Обновить тесты в `tests/test.js`
3. Документировать изменение в README

## Добавление новых outputs

1. Добавить в `action.yml`:
```yaml
outputs:
  new-metric:
    description: 'Description of the new metric'
```

2. Установить в `src/index.js`:
```javascript
core.setOutput('new-metric', value);
```

3. Добавить в README раздел "Outputs"
4. Обновить примеры в EXAMPLES.md

## Добавление новых inputs

1. Добавить в `action.yml`:
```yaml
inputs:
  new-param:
    description: 'Description'
    required: false
    default: 'default-value'
```

2. Добавить валидацию в `src/validation.js`:
```javascript
function validateNewParam(value) {
  // validation logic
  return validatedValue;
}

// В validateAllInputs:
validated.newParam = validateNewParam(inputs.newParam);
```

3. Использовать в `src/index.js`:
```javascript
const { newParam } = validation.validated;
```

4. Обновить README и EXAMPLES.md

## Лучшие практики

### Валидация
- Всегда валидировать inputs в `validation.js`
- Возвращать ошибки вместо молчаливого fallback
- Давать полезные сообщения об ошибках

### Логирование
- Использовать `core.info()` для нормальных сообщений
- Использовать `core.warning()` для предупреждений
- Использовать `core.error()` для ошибок (не используй `throw`)

### Outputs
- Всегда округлять числа до 1 десятичного места
- Предоставлять несколько форматов (markdown, URL, HTML)
- Сохранять совместимость с предыдущими версиями

### Тестирование
- Покрывать edge cases (0%, 100%, неправильные входы)
- Тестировать все ветви кода
- Добавлять новые тесты при добавлении фич

## Debug режим

Для более детального логирования:

```bash
DEBUG=* npm test
```

Или в GitHub Actions:

```yaml
- uses: ./
  env:
    DEBUG: true
```

## Версионирование

Следуем semver:
- **MAJOR**: Несовместимые изменения (e.g., изменение формулы Index)
- **MINOR**: Новые функции (e.g., новый output)
- **PATCH**: Исправления ошибок

## Ci/CD

GitHub Actions для проверки кода:

```yaml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm install
      - run: npm test
      - run: npm run lint  # при добавлении eslint
```

## Отладка анализатора

Для отладки git анализа:

```javascript
// In analyzer.js
const core = require('@actions/core');

// Добавить логирование
core.debug(`Processing commit: ${commit.sha}`);
core.debug(`Lines: +${added} -${removed}`);
core.debug(`Is AI: ${isAI}`);
```

Затем запустить с debug флагом:

```bash
node -e "process.env.ACTIONS_STEP_DEBUG='true'; require('./src/index.js')"
```

## Публикация

Для публикации новой версии:

1. Обновить версию в `package.json`
2. Обновить CHANGELOG
3. Тегировать: `git tag v1.0.0`
4. Пушить: `git push origin v1.0.0`
5. GitHub автоматически создаст release

## Troubleshooting

### Action не находится
```bash
npm install
```

### Неправильные результаты
- Проверить `fetch-depth: 0` в checkout action
- Проверить локальный git history: `git log --oneline | head -20`

### Медленный анализ
- Уменьшить `commits-count`
- Проверить размер репозитория

### Badge не отображается
- Проверить URL в браузере
- Убедиться, что color в правильном формате (hex или name)

## Ресурсы

- [GitHub Actions API](https://docs.github.com/en/actions)
- [shields.io Documentation](https://shields.io/)
- [Node.js Child Process](https://nodejs.org/api/child_process.html)
