# 📋 Конвенции именования для Vibe Index Action

## Git Commits

### Формат сообщения

```
<type>: <description>

<body>

<footer>
```

### Types

- **feat**: Новая функциональность
- **fix**: Исправление ошибки
- **docs**: Изменения в документации
- **style**: Форматирование, без изменения логики
- **refactor**: Рефакторинг кода
- **perf**: Оптимизация производительности
- **test**: Добавление или изменение тестов
- **chore**: Изменения конфигурации, зависимостей

### Примеры

```bash
# Новая функция
git commit -m "feat: add support for custom AI keywords"

# Исправление
git commit -m "fix: handle commits with multiple co-authors"

# Документация
git commit -m "docs: add Slack integration example"

# Рефакторинг
git commit -m "refactor: simplify validator functions"
```

### Для AI-ассистента

Всегда включай `Co-Authored-By:` если помогал AI:

```bash
git commit -m "feat: implement new badge color scheme

Add automatic color selection based on Vibe Index score.
Colors scale from red (0) to green (10).

Co-Authored-By: Claude Haiku <noreply@anthropic.com>"
```

---

## Ветки Git

### Структура имён

```
<type>/<description>
```

### Types

- **feature/** — новая функция
- **fix/** — исправление ошибки
- **docs/** — обновление документации
- **refactor/** — рефакторинг

### Примеры

```bash
git checkout -b feature/slack-notifications
git checkout -b fix/handle-binary-files
git checkout -b docs/add-examples
git checkout -b refactor/validator-functions
```

### Правила

- ✅ Используй kebab-case (строчные буквы, дефис вместо пробела)
- ❌ Не используй CamelCase или snake_case
- ❌ Не используй спецсимволы кроме дефиса

---

## Версионирование

Следуем [Semantic Versioning](https://semver.org/):

### Формат

```
MAJOR.MINOR.PATCH
v1.2.3
```

### Правила

- **MAJOR** — несовместимые изменения
  - Изменение формулы Vibe Index
  - Удаление параметра input
  - Переименование output
  
- **MINOR** — новые функции (обратно совместимые)
  - Новый параметр input
  - Новый output
  - Новая фича
  
- **PATCH** — исправления ошибок
  - Исправление валидации
  - Улучшение производительности
  - Исправление документации

### Примеры

```bash
# Новая версия v1.0.0 (первый релиз)
git tag v1.0.0
git push origin v1.0.0

# Новая фича v1.1.0
git tag v1.1.0

# Исправление v1.0.1
git tag v1.0.1

# Несовместимое изменение v2.0.0
git tag v2.0.0
```

---

## Файлы и папки

### Структура

```
✅ ПРАВИЛЬНО
src/                      # Исходный код
  ├── index.js            # Точка входа
  ├── analyzer.js         # Модуль анализа
  ├── calculator.js       # Модуль вычисления
  ├── badge.js            # Модуль генерации
  └── validation.js       # Модуль валидации

tests/
  └── test.js             # Тесты

.github/workflows/
  └── vibe-index.yml      # Workflow пример

❌ НЕПРАВИЛЬНО
Source/                   # Не используй Capital case
lib/analyzer.js           # Не сокращай названия
src/vibeIndexAnalyzer.js  # Не используй camelCase в файлах
src/analyzer_new.js       # Не добавляй суффиксы типа _new
```

### Именование файлов

- ✅ kebab-case: `vibe-index.yml`, `vibe-index-badge.yml`
- ✅ camelCase: `index.js`, `analyzer.js`, `calculator.js` (в src/)
- ✅ UPPERCASE: `README.md`, `LICENSE`, `CHANGELOG.md`
- ❌ snake_case: `vibe_index.js`
- ❌ Mixed: `VibeIndex.js`

---

## Inputs и Outputs

### Naming Convention

```yaml
inputs:
  commits-count:              # kebab-case для inputs
    description: '...'
    default: '500'

outputs:
  vibe-index:                 # kebab-case для outputs
    description: '...'
```

### Правила

- ✅ Используй kebab-case (строчные, дефис)
- ✅ Описательные имена
- ✅ Без сокращений (используй `commits-count`, не `cmts-cnt`)
- ❌ Не используй camelCase: `commitsCount`
- ❌ Не используй snake_case: `commits_count`

### Примеры

```yaml
# ✅ ПРАВИЛЬНО
inputs:
  commits-count:
  co-author-multiplier:
  ai-keywords:
  badge-style:
  assert-index:
  badge-output-file:

# ❌ НЕПРАВИЛЬНО
inputs:
  commitsCount:           # camelCase
  co_author_multiplier:   # snake_case
  AIKeywords:             # Mixed
  badge_style:            # snake_case
```

---

## Документация

### Файлы

| Файл | Назначение |
|------|-----------|
| `README.md` | Основная документация |
| `QUICKSTART.md` | Быстрый старт |
| `EXAMPLES.md` | Примеры использования |
| `DEVELOPMENT.md` | Для разработчиков |
| `STRUCTURE.md` | Обзор структуры |
| `CLAUDE.md` | Для AI разработчиков |
| `CONVENTIONS.md` | Этот файл |
| `CHANGELOG.md` | История изменений (TBD) |

### Markdown форматирование

```markdown
# Главный заголовок

## Подзаголовок

### Третий уровень

#### Четвёртый уровень

**Жирный текст**
*Курсив*
`код`

```код блоком```

- Список
- Элементов

1. Нумерованный
2. Список

> Цитата

[Ссылка](url)
![Изображение](url)
```

### Code примеры

```
use triple backticks с языком:

```yaml
name: Workflow
on: push
```

```bash
npm install
```

```javascript
const x = 42;
```
```

---

## Issues и Pull Requests

### Issue titles

```
[Type] Description

Types:
  [Bug] — ошибка
  [Feature] — новая функция
  [Docs] — документация
  [Question] — вопрос
  [Enhancement] — улучшение
```

Примеры:
```
[Bug] Badge not displaying in README
[Feature] Add Slack notifications support
[Docs] Add examples for custom colors
```

### PR titles

Используй тот же формат что и commits:

```
feat: add support for custom colors
fix: handle empty commit messages
docs: update examples
```

### PR description template

```markdown
## Description
Краткое описание что сделано

## Changes
- Change 1
- Change 2
- Change 3

## Testing
Как это тестировалось

## Checklist
- [ ] Код протестирован
- [ ] Документация обновлена
- [ ] Нет breaking changes
```

---

## Variables и Constants

### Naming

```javascript
// ✅ Constants (UPPER_SNAKE_CASE)
const DEFAULT_COMMITS_COUNT = 500;
const DEFAULT_MULTIPLIER = 0.5;
const MAX_BADGE_MESSAGE_LENGTH = 50;

// ✅ Variables (camelCase)
let commitsCount = 500;
let coAuthorMultiplier = 0.5;
let badgeUrl = '';

// ✅ Functions (camelCase)
function calculateVibeIndex(analysis) { }
function validateInputs(inputs) { }

// ✅ Classes (PascalCase, если будут)
class VibeAnalyzer { }

// ✅ Private methods (_prefix)
function _validateInternal(value) { }

// ❌ Неправильно
const commitsCOUNT = 500;      // Смешанный случай
let Commits_Count = 500;        // snake_case
function CalculateIndex() { }   // PascalCase для функции
```

---

## API Parameters

### Inputs (action.yml)

Всегда используй:
- kebab-case в `action.yml`
- camelCase в JavaScript переменных

```javascript
// action.yml
inputs:
  commits-count:

// src/index.js
const commitsCount = core.getInput('commits-count');
// или после валидации
const { commitsCount } = validation.validated;
```

---

## Тесты

### Файлы

```
tests/
  ├── test.js                    # Все тесты
  └── fixtures/
      └── sample-data.json       # Тестовые данные
```

### Именование тестов

```javascript
describe('calculateVibeIndex', () => {
  it('should return 10.0 for 100% human code', () => {
    // Test code
  });

  it('should return 0.0 for 0% human code', () => {
    // Test code
  });

  it('should handle edge case: empty analysis', () => {
    // Test code
  });
});
```

### Правила

- ✅ Описательные имена (`should return...`, `should handle...`)
- ✅ Проверяй один сценарий на тест
- ✅ Используй `describe()` для группировки
- ❌ Не используй `test1()`, `test2()`
- ❌ Не делай слишком сложные тесты

---

## Environment Variables

```bash
# GitHub Actions
GITHUB_TOKEN        # Автоматически доступен
GITHUB_REPOSITORY   # owner/repo
GITHUB_REF          # refs/heads/branch

# Debug
DEBUG               # Для логирования
ACTIONS_STEP_DEBUG  # Для GitHub Actions debug
```

---

## Сообщения об ошибках

### Формат

```
Error: <краткое описание>
Reason: <почему произошло>
Solution: <как исправить>
```

Примеры:
```
Error: co-author-multiplier must be between 0.0 and 1.0
Reason: Value 1.5 is outside valid range
Solution: Use a value between 0.0 (AI gets 0%) and 1.0 (AI gets 100%)

Error: assert-index min cannot be greater than max
Reason: You specified "8.0-6.0"
Solution: Use format "min-max" where min < max, e.g., "6.0-8.0"
```

---

## URL и линки

### Badge URL

```
https://img.shields.io/badge/<label>-<value>-<color>?style=<style>

Пример:
https://img.shields.io/badge/Vibe%20Index-8.5-27ae60?style=flat-square
```

### GitHub URL

```
https://github.com/roxblnfk/action-vibe-index
https://github.com/roxblnfk/action-vibe-index/issues
https://github.com/roxblnfk/action-vibe-index/pull/1
```

---

## Чек-лист перед коммитом

- [ ] Код следует конвенциям
- [ ] Файлы с правильными именами
- [ ] Нет console.log (используй core.info/core.debug)
- [ ] Тесты написаны (если нужны)
- [ ] Документация обновлена
- [ ] Сообщение коммита формате правильном
- [ ] Co-Authored-By добавлен если нужен

---

## Ссылки

- [Semantic Versioning](https://semver.org/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [JavaScript Style Guide](https://airbnb.io/javascript/)

---

*Последнее обновление: 2026-06-28*
