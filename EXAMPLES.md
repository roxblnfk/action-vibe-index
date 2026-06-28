# Примеры использования Vibe Index

## Пример 1: Базовое использование

Самый простой вариант — просто запустить анализ:

```yaml
name: Analyze Vibe Index

on:
  push:
    branches: [main]

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

## Пример 2: Комментарий на Pull Request

Автоматически добавлять комментарий с результатами на каждый PR:

```yaml
name: Vibe Index PR Comment

on:
  pull_request:

jobs:
  analyze:
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

      - uses: actions/github-script@v7
        with:
          script: |
            const vibeIndex = '${{ steps.vibe.outputs.vibe-index }}';
            const humanPct = '${{ steps.vibe.outputs.human-percentage }}';
            const aiPct = '${{ steps.vibe.outputs.ai-percentage }}';
            const badgeUrl = '${{ steps.vibe.outputs.badge-url }}';

            const comment = `## 📊 Vibe Index Analysis

![Vibe Index](${badgeUrl})

- **Vibe Index**: ${vibeIndex}/10.0
- **Human Code**: ${humanPct}%
- **AI Code**: ${aiPct}%

### Metrics
- **Human Commits**: ${{ steps.vibe.outputs.human-commits-percentage }}%
- **AI Commits**: ${{ steps.vibe.outputs.ai-commits-percentage }}%
`;

            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: comment
            });
```

## Пример 3: Качественный контроль с assertion

Не позволять сливать PR если Vibe Index слишком низкий:

```yaml
name: Vibe Index Quality Gate

on:
  pull_request:

jobs:
  quality-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - run: npm install

      - name: Check Vibe Index
        uses: ./
        with:
          commits-count: '500'
          assert-index: '6.0-10.0'
          include-message: 'Code Quality'

      - name: Success Message
        if: success()
        run: echo "✅ Vibe Index check passed!"

      - name: Failure Message
        if: failure()
        run: |
          echo "❌ Vibe Index is outside acceptable range!"
          echo "Please ensure this PR maintains good human code ratio."
          exit 1
```

## Пример 4: Обновление README с badge

Автоматически обновлять badge в README после каждого push:

```yaml
name: Update Vibe Badge

on:
  push:
    branches: [main]
  schedule:
    - cron: '0 0 * * 0'  # Еженедельно по воскресеньям

jobs:
  update:
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
        with:
          commits-count: '1000'
          badge-style: 'flat-square'

      - name: Update README
        run: |
          # Заменить существующий badge или добавить новый
          BADGE_URL="${{ steps.vibe.outputs.badge-url }}"
          BADGE_MD="![Vibe Index](${BADGE_URL})"
          
          if grep -q "Vibe Index" README.md; then
            sed -i "0,/!\[Vibe Index\]/s|!\[Vibe Index\].*|${BADGE_MD}|" README.md
          else
            # Добавить в начало README
            sed -i "1i ${BADGE_MD}\n" README.md
          fi

      - uses: stefanzweifel/git-auto-commit-action@v5
        with:
          commit_message: 'chore: update Vibe Index badge'
          file_pattern: 'README.md'
```

## Пример 5: Несколько стилей badge

Генерировать разные стили badge для разных целей:

```yaml
name: Generate Vibe Badges

on:
  push:
    branches: [main]

jobs:
  badges:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - run: npm install

      # Плоский стиль
      - uses: ./
        id: vibe-flat
        with:
          badge-style: 'flat'
          badge-color: '3498db'

      # For-the-badge стиль
      - uses: ./
        id: vibe-large
        with:
          badge-style: 'for-the-badge'
          badge-color: '27ae60'

      # Social стиль
      - uses: ./
        id: vibe-social
        with:
          badge-style: 'social'
          badge-color: 'f39c12'

      - name: Display Badges
        run: |
          echo "## Available Badge Styles"
          echo ""
          echo "### Flat"
          echo "[![Vibe](${{ steps.vibe-flat.outputs.badge-url }})]()"
          echo ""
          echo "### For-the-Badge"
          echo "[![Vibe](${{ steps.vibe-large.outputs.badge-url }})]()"
          echo ""
          echo "### Social"
          echo "[![Vibe](${{ steps.vibe-social.outputs.badge-url }})]()"
```

## Пример 6: Трекинг истории

Сохранять метрики в JSON файл для отслеживания изменений:

```yaml
name: Track Vibe History

on:
  push:
    branches: [main]
  schedule:
    - cron: '0 0 * * *'  # Ежедневно

jobs:
  track:
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

      - name: Save Metrics
        run: |
          mkdir -p .vibe-history
          
          METRICS=$(cat <<EOF
          {
            "date": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
            "vibe_index": ${{ steps.vibe.outputs.vibe-index }},
            "human_percentage": ${{ steps.vibe.outputs.human-percentage }},
            "ai_percentage": ${{ steps.vibe.outputs.ai-percentage }},
            "human_commits": ${{ steps.vibe.outputs.human-commits-percentage }},
            "ai_commits": ${{ steps.vibe.outputs.ai-commits-percentage }}
          }
          EOF
          )
          
          echo "$METRICS" > ".vibe-history/$(date -u +%Y-%m-%d).json"

      - name: Commit History
        uses: stefanzweifel/git-auto-commit-action@v5
        with:
          commit_message: 'chore: record Vibe Index history'
          file_pattern: '.vibe-history/'
```

## Пример 7: Свои AI-ключевые слова

Использовать нестандартные ключевые слова для определения AI:

```yaml
name: Vibe with Custom Keywords

on:
  push:
    branches: [main]

jobs:
  analyze:
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
        with:
          ai-keywords: 'Claude,GPT,ChatGPT,GitHub Copilot,Gemini,Llama,LLM,AI Generated'
          co-author-multiplier: '0.7'  # AI соавтор получает 70% кредита
```

## Пример 8: Разная конфигурация для разных веток

Разные параметры для development vs production веток:

```yaml
name: Vibe Index - Branch-Specific

on:
  push:

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - run: npm install

      - name: Vibe Index - Main Branch
        if: github.ref == 'refs/heads/main'
        uses: ./
        with:
          commits-count: '1000'
          assert-index: '7.0-10.0'  # Строгая проверка для main

      - name: Vibe Index - Dev Branch
        if: github.ref == 'refs/heads/develop'
        uses: ./
        with:
          commits-count: '500'
          assert-index: '5.0-10.0'  # Более свободная проверка для dev
```

## Пример 9: Уведомления в Slack

Отправлять результаты в Slack:

```yaml
name: Vibe to Slack

on:
  push:
    branches: [main]
  schedule:
    - cron: '0 9 * * MON'  # Каждый понедельник в 9:00

jobs:
  notify:
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

      - name: Notify Slack
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "text": "📊 Weekly Vibe Index Report",
              "blocks": [
                {
                  "type": "header",
                  "text": {
                    "type": "plain_text",
                    "text": "📊 Vibe Index Report"
                  }
                },
                {
                  "type": "section",
                  "fields": [
                    {
                      "type": "mrkdwn",
                      "text": "*Vibe Index:*\n${{ steps.vibe.outputs.vibe-index }}/10"
                    },
                    {
                      "type": "mrkdwn",
                      "text": "*Human Code:*\n${{ steps.vibe.outputs.human-percentage }}%"
                    },
                    {
                      "type": "mrkdwn",
                      "text": "*AI Code:*\n${{ steps.vibe.outputs.ai-percentage }}%"
                    },
                    {
                      "type": "mrkdwn",
                      "text": "*Human Commits:*\n${{ steps.vibe.outputs.human-commits-percentage }}%"
                    }
                  ]
                },
                {
                  "type": "image",
                  "image_url": "${{ steps.vibe.outputs.badge-url }}",
                  "alt_text": "Vibe Index Badge"
                }
              ]
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

## Пример 10: Полный pipeline

Комплексный пример с проверками, комментариями и обновлениями:

```yaml
name: Complete Vibe Index Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:

jobs:
  vibe-pipeline:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - run: npm install

      # Анализ
      - uses: ./
        id: vibe
        with:
          commits-count: '500'
          co-author-multiplier: '0.5'
          assert-index: ${{ github.event_name == 'pull_request' && '6.0-10.0' || '7.0-10.0' }}

      # Комментарий на PR
      - if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `![Badge](${{ steps.vibe.outputs.badge-url }})\n\n**Vibe Index**: ${{ steps.vibe.outputs.vibe-index }}/10`
            })

      # Обновление README (только для main)
      - if: github.ref == 'refs/heads/main'
        name: Update Badge in README
        run: |
          sed -i "s|https://img.shields.io/badge/Vibe%20Index-.*|${{ steps.vibe.outputs.badge-url }}|g" README.md

      - if: github.ref == 'refs/heads/main'
        uses: stefanzweifel/git-auto-commit-action@v5
        with:
          commit_message: 'chore: update Vibe Index badge'
          file_pattern: 'README.md'

      # Логирование результатов
      - name: Log Results
        run: |
          echo "📊 Vibe Index Analysis Results"
          echo "==============================="
          echo "Vibe Index: ${{ steps.vibe.outputs.vibe-index }}/10.0"
          echo "Human Code: ${{ steps.vibe.outputs.human-percentage }}%"
          echo "AI Code: ${{ steps.vibe.outputs.ai-percentage }}%"
          echo "Human Commits: ${{ steps.vibe.outputs.human-commits-percentage }}%"
          echo "AI Commits: ${{ steps.vibe.outputs.ai-commits-percentage }}%"
```

---

## Рекомендации

### Для open-source проектов
```yaml
commits-count: '500'
co-author-multiplier: '0.5'
ai-keywords: 'Claude,GPT,AI,Agent,ChatGPT'
badge-style: 'flat-square'
```

### Для enterprise проектов
```yaml
commits-count: '1000'
co-author-multiplier: '0.3'  # Более строгий критерий для AI
ai-keywords: 'Claude,GPT,AI,Agent,ChatGPT,Copilot,Gemini'
assert-index: '7.0-10.0'
```

### Для AI-heavy проектов
```yaml
commits-count: '500'
co-author-multiplier: '0.8'  # Много кредита за AI соавторство
ai-keywords: 'Claude,GPT,AI,Agent,LLM,Generated'
badge-style: 'for-the-badge'
```
