# Быстрый старт Vibe Index

## За 5 минут

### 1. Добавь action в свой репозиторий

Скопируй в `.github/workflows/vibe-index.yml`:

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

### 2. Коммитим и пушим

```bash
git add .github/workflows/vibe-index.yml
git commit -m "Add Vibe Index workflow"
git push
```

### 3. Видим результаты

В Actions → Logs видишь результаты анализа. 🎉

---

## Что означает Vibe Index?

| Score | Meaning |
|-------|---------|
| 9-10 | Почти весь код от людей ✅ |
| 7-9 | Хороший баланс 😊 |
| 5-7 | Много AI помощи 🤖 |
| 0-5 | Большинство кода от AI 🤔 |

---

## Популярные примеры

### Добавить badge в README

```markdown
# My Project

![Vibe Index](https://img.shields.io/badge/Vibe%20Index-8.5-27ae60?style=flat-square)
```

### Проверить качество кода в PR

```yaml
- uses: ./
  with:
    assert-index: '6.0-10.0'  # Падает если < 6.0
```

### Комментарий на PR

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
        body: `Vibe Index: ${{ steps.vibe.outputs.vibe-index }}/10`
      })
```

---

## Параметры

| Параметр | Значение | Описание |
|----------|----------|---------|
| `commits-count` | 500 | Сколько последних коммитов анализировать |
| `co-author-multiplier` | 0.5 | Процент кредита для AI в соавторстве |
| `ai-keywords` | Claude,GPT,AI,Agent | Ключевые слова для AI |
| `badge-style` | flat-square | Стиль badge |
| `assert-index` | - | Диапазон проверки (e.g., "6.0-10.0") |

---

## FAQ

**Q: Как Action знает, какой код от AI?**  
A: Ищет ключевые слова в сообщениях коммитов и trailers вроде `Co-Authored-By: Claude ...`

**Q: Что если я не указываю co-author?**  
A: Код считается от человека. Используй `Co-Authored-By:` в сообщении коммита для правильного подсчёта.

**Q: Как действительно использовать Vibe Index?**  
A: Это способ увидеть, сколько в проекте человеческого код vs AI-ассистента. Высокий индекс = больше человеческой работы.

**Q: Можно ли менять формулу?**  
A: Да, но нужно отредактировать `src/calculator.js`. Смотри DEVELOPMENT.md

**Q: Зачем нужна полная история git?**  
A: Для анализа всех коммитов. Используй `fetch-depth: 0` в checkout action.

---

## Следующие шаги

1. **Прочитай** полный [README.md](README.md)
2. **Изучи** примеры в [EXAMPLES.md](EXAMPLES.md)
3. **Развивай** используя [DEVELOPMENT.md](DEVELOPMENT.md)

---

## Нужна помощь?

- Смотри примеры в `.github/workflows/`
- Проверь [EXAMPLES.md](EXAMPLES.md) для разных сценариев
- Отправь issue на GitHub

---

**Готово! Теперь у тебя есть Vibe Index в проекте! 🎵**
