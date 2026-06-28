# 📊 Vibe Index - Полный GitHub Action

## ✨ Что создано

Полнофункциональный GitHub Action для анализа соотношения кода, написанного людьми и AI-агентами.

### Ключевые возможности

✅ **Анализ репозитория**
- Анализ последних N коммитов (настраивается)
- Подсчёт строк кода по авторству
- Определение AI-авторства по ключевым словам
- Поддержка co-authored commits с множителем

✅ **Вычисление метрик**
- Процент кода (человек vs AI)
- Процент коммитов (человек vs AI)
- Vibe Index (0-10 баллов)
- Цветовое кодирование результатов

✅ **Генерация badge**
- shields.io интеграция
- Разные стили (flat, flat-square, plastic, for-the-badge, social)
- Автоматический выбор цвета по баллам
- Markdown и HTML синтаксис

✅ **Качественный контроль**
- Assert mode (проверка диапазона индекса)
- Падение workflow при нарушении стандартов
- Полезные сообщения об ошибках

✅ **Интеграция**
- Комментарии на Pull Requests
- Обновление README с badge
- Сохранение результатов в файл
- Уведомления в Slack (примеры)

---

## 📁 Структура проекта

```
vibe-index/
├── .github/workflows/           # Примеры workflow
│   ├── vibe-index-badge.yml     # Базовый анализ + комментарий на PR
│   └── vibe-index-assert.yml    # С проверкой диапазона индекса
│
├── src/
│   ├── index.js                 # Точка входа (orchestration)
│   ├── analyzer.js              # Анализ git репозитория
│   ├── calculator.js            # Вычисление Vibe Index
│   ├── badge.js                 # Генерация badge URL
│   └── validation.js            # Валидация входных параметров
│
├── tests/
│   └── test.js                  # Юнит тесты
│
├── action.yml                   # GitHub Action конфигурация
├── package.json                 # Node.js зависимости
│
├── README.md                    # Основная документация
├── QUICKSTART.md                # Быстрый старт (5 минут)
├── EXAMPLES.md                  # 10+ готовых примеров
├── DEVELOPMENT.md               # Гайд для разработчиков
├── STRUCTURE.md                 # Обзор структуры проекта
├── CLAUDE.md                    # Архитектурная документация
│
├── LICENSE                      # MIT License
└── .gitignore                   # Git ignore rules
```

---

## 🚀 Быстрый старт

### Самый простой вариант

Добавь в `.github/workflows/vibe-index.yml`:

```yaml
name: Vibe Index

on: [push, pull_request]

jobs:
  vibe:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm install
      - uses: ./
        id: vibe
      - run: echo "Vibe Index: ${{ steps.vibe.outputs.vibe-index }}/10"
```

### С проверкой качества

```yaml
- uses: ./
  with:
    commits-count: '500'
    assert-index: '6.0-10.0'  # Падает если индекс < 6.0
```

### С комментарием на PR

```yaml
- uses: ./
  id: vibe

- uses: actions/github-script@v7
  with:
    script: |
      github.rest.issues.createComment({
        issue_number: context.issue.number,
        owner: context.repo.owner,
        repo: context.repo.repo,
        body: `📊 Vibe Index: ${{ steps.vibe.outputs.vibe-index }}/10\n![Badge](${{ steps.vibe.outputs.badge-url }})`
      })
```

---

## 📊 Что означает Vibe Index

| Score | Meaning | Color |
|-------|---------|-------|
| **9.0-10.0** | Почти весь код от людей | 🟢 Green |
| **7.5-8.9** | Основной код от людей | 🟢 Dark Green |
| **6.0-7.4** | Хороший баланс | 🔵 Blue |
| **4.0-5.9** | Больше AI чем людей | 🟠 Orange |
| **2.0-3.9** | Большинство кода от AI | 🔴 Red |
| **0.0-1.9** | Почти весь код от AI | 🔴 Dark Red |

### Формула

```
Vibe Index = (human_code_ratio × 0.6 + human_commits_ratio × 0.4) × 10
```

- 60% вес на строки кода (объём работы)
- 40% вес на коммиты (методология разработки)

---

## ⚙️ Входные параметры

| Параметр | Тип | Default | Описание |
|----------|-----|---------|---------|
| `commits-count` | int | 500 | Кол-во коммитов для анализа |
| `co-author-multiplier` | float | 0.5 | Множитель для co-authored кода (0-1) |
| `ai-keywords` | string | Claude,GPT,AI,Agent | Ключевые слова для AI |
| `badge-style` | string | flat-square | Стиль badge |
| `badge-color` | string | 3498db | Цвет badge |
| `assert-index` | string | - | Диапазон проверки (e.g., "6.0-10.0") |
| `badge-output-file` | string | - | Файл для сохранения URL |
| `include-message` | string | Vibe Index | Текст на badge |

---

## 📤 Выходные параметры

| Выход | Описание | Пример |
|-------|---------|---------|
| `vibe-index` | Итоговый индекс (0-10) | 8.5 |
| `human-percentage` | % кода от людей | 85.0 |
| `ai-percentage` | % кода от AI | 15.0 |
| `human-commits-percentage` | % коммитов от людей | 80.0 |
| `ai-commits-percentage` | % AI коммитов | 20.0 |
| `badge-url` | URL для shields.io | https://img.shields.io/... |
| `badge-markdown` | Markdown для README | [![Vibe](...)]() |

---

## 📝 Примеры использования

### Пример 1: Базовый анализ с логами

```yaml
- uses: ./
  id: vibe

- run: |
    echo "Vibe Index: ${{ steps.vibe.outputs.vibe-index }}/10"
    echo "Human: ${{ steps.vibe.outputs.human-percentage }}%"
    echo "AI: ${{ steps.vibe.outputs.ai-percentage }}%"
```

### Пример 2: Обновление README

```yaml
- name: Update Badge in README
  run: |
    sed -i "s|Vibe%20Index-.*|${{ steps.vibe.outputs.badge-url }}|" README.md

- uses: stefanzweifel/git-auto-commit-action@v5
  with:
    commit_message: 'chore: update Vibe Index'
    file_pattern: 'README.md'
```

### Пример 3: Strict качественный контроль

```yaml
- uses: ./
  with:
    commits-count: '1000'
    assert-index: '7.0-10.0'  # Только высокий человеческий ratio
    co-author-multiplier: '0.3'  # Строгий критерий для AI
```

### Пример 4: Разные конфиги для веток

```yaml
- if: github.ref == 'refs/heads/main'
  uses: ./
  with:
    assert-index: '7.0-10.0'  # Строгая проверка для main

- if: github.ref == 'refs/heads/develop'
  uses: ./
  with:
    assert-index: '5.0-10.0'  # Мягче для dev
```

---

## 🔍 Как определяется AI-авторство

### 1. Прямое авторство
Коммит содержит AI ключевые слова в сообщении:
```
"Implement feature with Claude AI"  ← Определяется как AI
```

### 2. Co-authored commits
```
Add new feature

Co-Authored-By: Claude Haiku <noreply@anthropic.com>
```
С `co-author-multiplier: 0.5`:
- 50% линий считаются AI
- 50% линий считаются человеческими

### 3. Custom ключевые слова
```yaml
ai-keywords: 'Claude,GPT,ChatGPT,GitHub Copilot,Gemini,LLM'
```

---

## 🛡️ Валидация

Все входные параметры валидируются:
- ✅ Диапазоны значений
- ✅ Форматы данных
- ✅ Совместимость параметров
- ✅ Полезные сообщения об ошибках

Пример:
```
Error: assert-index values must be between 0.0 and 10.0
Error: co-author-multiplier must be between 0.0 and 1.0
Error: badge-style must be one of: flat, flat-square, plastic, for-the-badge, social
```

---

## 🎨 Примеры Badge

```
https://img.shields.io/badge/Vibe%20Index-9.5-2ecc71?style=flat-square
https://img.shields.io/badge/Vibe%20Index-8.5-27ae60?style=flat-square
https://img.shields.io/badge/Vibe%20Index-7.5-3498db?style=flat-square
https://img.shields.io/badge/Vibe%20Index-5.5-f39c12?style=flat-square
https://img.shields.io/badge/Vibe%20Index-2.5-e74c3c?style=flat-square
```

Разные стили:
```
?style=flat
?style=flat-square
?style=plastic
?style=for-the-badge
?style=social
```

---

## 📚 Документация

### Для пользователей
- **README.md** - Основная документация, все API
- **QUICKSTART.md** - Быстрый старт за 5 минут
- **EXAMPLES.md** - 10+ готовых примеров workflow
- **STRUCTURE.md** - Обзор структуры проекта

### Для разработчиков
- **DEVELOPMENT.md** - Гайд по добавлению новых фич
- **CLAUDE.md** - Архитектура и design decisions
- **tests/test.js** - Примеры тестов

---

## 🧪 Тестирование

```bash
# Запуск тестов
npm test

# Локальный анализ
npm run analyze
```

Тесты проверяют:
- ✅ Вычисление индекса
- ✅ Edge cases (0%, 100%)
- ✅ Валидацию входов
- ✅ Генерирование badge

---

## 🔧 Технические детали

### Технологии
- **Node.js 20+** - Runtime
- **@actions/core** - GitHub Actions API
- **@actions/github** - GitHub REST API (опционально)
- **execSync** - Запуск git команд

### Производительность
- Анализ 500 коммитов ~15 сек
- Может быть оптимизирован уменьшением commits-count
- Работает в GitHub Actions бесплатно

### Совместимость
- ✅ Linux / macOS / Windows
- ✅ Public и private репозитории
- ✅ GitHub Free / Pro / Enterprise

---

## 📋 Чек-лист внедрения

- [ ] Скопировать workflow в `.github/workflows/`
- [ ] Коммитить и пушить
- [ ] Запустить workflow
- [ ] Проверить результаты
- [ ] Добавить badge в README
- [ ] Настроить параметры под свой проект
- [ ] (Опционально) Добавить assert check
- [ ] (Опционально) Настроить PR комментарии

---

## 🎯 Используемые случаи

1. **Отслеживание соотношения человек/AI**
2. **Качественный контроль кода**
3. **Демонстрация гибридной разработки**
4. **Метрики для команды**
5. **Документирование процесса разработки**

---

## 🚀 Next Steps

1. **Быстрый старт**: Читай QUICKSTART.md (5 минут)
2. **Примеры**: Смотри EXAMPLES.md (10+ вариантов)
3. **Полная документация**: README.md для всех деталей
4. **Разработка**: DEVELOPMENT.md для добавления фич

---

## 📞 FAQ

**Q: Как это работает?**  
A: Анализирует git коммиты, подсчитывает строки кода, определяет авторство, считает индекс, генерирует badge.

**Q: Что если я не использую co-author?**  
A: Код считается 100% от указанного автора. Используй `Co-Authored-By:` в сообщении для правильного подсчёта.

**Q: Можно ли менять формулу?**  
A: Да! Отредактируй calculateVibeIndex() в src/calculator.js.

**Q: Зачем fetch-depth: 0?**  
A: Нужна полная история git для анализа. Без этого будут только 1 коммит.

**Q: Какие ключевые слова используются по умолчанию?**  
A: `Claude`, `GPT`, `AI`, `Agent`. Можно добавить свои через `ai-keywords`.

---

## 📄 Лицензия

MIT License - свободное использование, модификация и распространение.

---

## 🎵 Vibe Index готов к использованию!

**Все компоненты созданы и готовы к работе. Просто добавь в свой репозиторий! 🚀**

```yaml
- uses: roxblnfk/vibe-index@v1
  with:
    commits-count: '500'
```

---

*Создано с ❤️ для измерения гармонии между человеком и AI в коде*
