# Структура проекта Vibe Index

```
vibe-index/
│
├── 📄 action.yml                  # GitHub Action конфигурация
│   ├── inputs                     # Входные параметры (commits-count, multiplier, etc.)
│   ├── outputs                    # Выходные значения (vibe-index, badge-url, etc.)
│   └── runs.main                  # Точка входа (src/index.js)
│
├── 📄 package.json                # Зависимости Node.js
│   ├── @actions/core              # GitHub Actions API
│   └── @actions/github            # GitHub REST API
│
├── 📁 src/                        # Исходный код action
│   ├── index.js                   # Точка входа (orchestration)
│   │   ├── Читает inputs
│   │   ├── Валидирует параметры
│   │   ├── Вызывает analyzer
│   │   ├── Устанавливает outputs
│   │   └── Проверяет assertions
│   │
│   ├── analyzer.js                # Анализ git репозитория
│   │   ├── analyzeRepository()    # Главная функция
│   │   ├── getRecentCommits()     # Получает коммиты
│   │   └── analyzeCommit()        # Анализирует один коммит
│   │
│   ├── calculator.js              # Вычисление метрик
│   │   ├── calculateVibeIndex()   # Основная формула
│   │   ├── getColorForIndex()     # Цвет по баллам
│   │   └── getDescriptionForIndex() # Текстовое описание
│   │
│   ├── badge.js                   # Генерация badge
│   │   ├── generateBadgeUrl()     # shields.io URL
│   │   ├── generateBadgeMarkdown() # Markdown синтаксис
│   │   └── generateBadgeHtml()    # HTML синтаксис
│   │
│   └── validation.js              # Валидация входов
│       ├── validateCommitsCount()
│       ├── validateCoAuthorMultiplier()
│       ├── validateAIKeywords()
│       ├── validateBadgeStyle()
│       ├── validateBadgeColor()
│       ├── validateAssertIndex()
│       └── validateAllInputs()
│
├── 📁 .github/workflows/          # GitHub Actions workflows
│   ├── vibe-index-badge.yml       # Пример: базовый анализ + комментарий
│   └── vibe-index-assert.yml      # Пример: с проверкой диапазона
│
├── 📁 tests/                      # Тесты
│   ├── test.js                    # Юнит тесты
│   └── fixtures/
│       └── sample-commits.json    # Тестовые данные (если нужны)
│
├── 📄 README.md                   # Основная документация
│   ├── Что такое Vibe Index
│   ├── Как использовать
│   ├── Inputs/Outputs
│   ├── Примеры использования
│   ├── FAQ
│   └── Troubleshooting
│
├── 📄 QUICKSTART.md               # Быстрый старт (5 минут)
│   ├── Базовая настройка
│   ├── Популярные примеры
│   ├── Что означают баллы
│   └── FAQ
│
├── 📄 EXAMPLES.md                 # Расширенные примеры
│   ├── 10 готовых workflow примеров
│   ├── Интеграция со Slack
│   ├── Трекинг истории
│   ├── Разные стили badge
│   └── Recommendations по конфиг
│
├── 📄 DEVELOPMENT.md              # Гайд для разработчиков
│   ├── Локальное тестирование
│   ├── Структура кода
│   ├── Как добавить новые фичи
│   ├── Best practices
│   ├── Debug режим
│   └── Troubleshooting
│
├── 📄 CLAUDE.md                   # Документация для AI
│   ├── Architecture overview
│   ├── Key components
│   ├── Design decisions
│   └── Future enhancements
│
├── 📄 STRUCTURE.md                # Этот файл
│
├── 📄 LICENSE                     # MIT License
│
└── 📄 .gitignore                  # Git ignore rules
```

## Файлы по функциональности

### Core анализ
```
analyzer.js
├── Получает информацию о коммитах через git log
├── Парсит co-authored-by trailers
├── Подсчитывает строки кода через git show --numstat
└── Определяет авторство (человек/AI)
```

### Вычисления
```
calculator.js
├── Применяет формулу Vibe Index
├── Вычисляет процентали
└── Выбирает цвет по баллам
```

### Выходные данные
```
badge.js
├── Генерирует URL для shields.io
├── Поддерживает разные стили
└── Предоставляет markdown/html синтаксис
```

### Безопасность
```
validation.js
├── Проверяет все входные параметры
├── Возвращает полезные ошибки
└── Предотвращает инъекции
```

## Данные в процессе

```
Inputs (action.yml)
    ↓
    ├── Валидация (validation.js)
    ↓
Git анализ (analyzer.js)
    ├── git log          → список коммитов
    ├── git show --numstat → строки кода
    └── Co-Authored-By   → соавторство
    ↓
Вычисления (calculator.js)
    ├── Подсчёт строк (human/ai)
    ├── Подсчёт коммитов (human/ai)
    └── Формула Vibe Index
    ↓
Badge генерация (badge.js)
    ├── shields.io URL
    ├── Markdown синтаксис
    └── HTML синтаксис
    ↓
Outputs (action.yml)
    └── Используются в других шагах workflow
```

## Жизненный цикл

### 1. Инициализация
```
index.js
  ├── Читает inputs из GitHub Actions
  ├── Валидирует параметры
  └── Логирует конфигурацию
```

### 2. Анализ
```
analyzer.js
  ├── Получает последние N коммитов
  ├── Для каждого коммита:
  │   ├── Парсит message (co-authors)
  │   ├── Получает diff (строки кода)
  │   └── Определяет авторство
  └── Агрегирует результаты
```

### 3. Вычисления
```
calculator.js
  ├── Вычисляет процентали
  ├── Применяет формулу
  ├── Выбирает цвет
  └── Подготавливает метрики
```

### 4. Генерация
```
badge.js
  ├── Создаёт URL для shields.io
  ├── Готовит markdown
  └── Готовит HTML
```

### 5. Результаты
```
index.js
  ├── Устанавливает outputs (GitHub Actions)
  ├── Логирует результаты
  ├── Проверяет assertions (если нужно)
  ├── Пишет файл (если нужно)
  └── Успешно завершается или падает
```

## Зависимости

```javascript
// Core GitHub Actions
@actions/core
  ├── core.getInput()       // Читать inputs
  ├── core.setOutput()      // Устанавливать outputs
  ├── core.info()           // Логирование info
  ├── core.warning()        // Логирование warning
  └── core.setFailed()      // Ошибка

@actions/github
  ├── github.getOctokit()   // REST API (опционально)
  └── github.context        // Context переменные

// Node.js built-ins
child_process.execSync()    // Запуск git команд
fs.writeFileSync()          // Запись файлов

// Нет внешних зависимостей для:
- URL encoding (встроенный encodeURIComponent)
- JSON parsing (встроенный JSON)
- String utilities (встроенные methods)
```

## Расширяемость

### Добавить новый input
```
1. action.yml (добавить in inputs section)
2. validation.js (добавить validate функцию)
3. index.js (использовать параметр)
```

### Добавить новый output
```
1. action.yml (добавить в outputs section)
2. calculator.js или другой модуль (вычислить)
3. index.js (core.setOutput())
```

### Изменить формулу
```
Отредактировать функцию calculateVibeIndex() в calculator.js
Обновить README
Добавить тесты
```

### Добавить новую фичу
```
1. Спроектировать (DEVELOPMENT.md)
2. Добавить валидацию (validation.js)
3. Реализовать логику (appropriate module)
4. Добавить tests (tests/test.js)
5. Документировать (README.md, EXAMPLES.md)
```

## Производительность

```
Операции по времени (примерно):
├── git log (получить 500 коммитов)        ~100ms
├── Парсинг каждого коммита                ~10ms cada
├── git show для каждого (diff)            ~20ms each
├── Вычисления                             <10ms
└── Генерация badge                        <5ms

Total для 500 коммитов: ~15 сек (в GitHub Actions)
```

Оптимизация:
- Уменьшить `commits-count` если медленно
- Использовать shallow clone не рекомендуется (нужна полная история)

## Файлы конфигурации

```yaml
# action.yml
- Определяет inputs (commits-count, multiplier, etc.)
- Определяет outputs (vibe-index, badge-url, etc.)
- Указывает точку входа (src/index.js)
- Указывает runtime (node20)

# package.json
- Dependencies для GitHub Actions
- Scripts для локального запуска
- Metadata проекта

# .gitignore
- node_modules/
- Log файлы
- Temp файлы
- badge-url.txt (output file example)
```

## Testing

```
tests/
├── test.js              # Юнит тесты
│   ├── calculateVibeIndex() tests
│   ├── getColorForIndex() tests
│   ├── generateBadgeUrl() tests
│   └── Edge cases (0%, 100%, etc.)
└── fixtures/            # Test data if needed
```

Запуск: `npm test`

## CI/CD

Все workflows используют:
```yaml
- actions/checkout@v4
  with:
    fetch-depth: 0      # Полная история!

- actions/setup-node@v4
  with:
    node-version: '20'  # Node.js 20

- run: npm install      # Установка зависимостей

- uses: ./              # Запуск action
```

---

**Итого: ~1000 строк кода + документация, полностью функциональный GitHub Action! 🚀**
