# 🎵 Vibe Index GitHub Action

[![Vibe Index](https://img.shields.io/badge/Vibe%20Index-8.5%2F10.0-27ae60?style=flat-square)](/)

Measure the ratio of human-written code vs AI-generated code in your repository and generate a dynamic badge for your README.

## 📊 What is Vibe Index?

**Vibe Index** is a metric that analyzes your repository's commit history to determine:
- What percentage of code was written by humans
- What percentage was written or assisted by AI
- A combined score from 0.0 to 10.0 (where 10.0 = 100% human-written)

The metric weighs:
- **60%**: Lines of code ratio (human vs AI)
- **40%**: Commit authorship ratio (human vs AI commits)

### How it detects AI-authored code:

1. **Direct AI authorship**: Commits with AI keywords in the message (`Claude`, `GPT`, `AI`, `Agent`, etc.)
2. **Co-authored with AI**: Commits with `Co-Authored-By:` trailers mentioning AI
   - Applied with a configurable multiplier (0.0-1.0) to give partial credit to human developers

## 🚀 Usage

### Basic Setup

Add this action to your workflow:

```yaml
- uses: roxblnfk/vibe-index@v1
  id: vibe
  with:
    commits-count: '500'
    co-author-multiplier: '0.5'
    ai-keywords: 'Claude,GPT,AI,Agent'
    badge-style: 'flat-square'
```

### Example 1: Post Badge in README

```yaml
name: Update Vibe Index Badge

on:
  push:
    branches: [main]
  schedule:
    - cron: '0 0 * * 0'  # Weekly

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

      - uses: roxblnfk/vibe-index@v1
        id: vibe

      - name: Update README
        run: |
          badge_url="${{ steps.vibe.outputs.badge-url }}"
          # Replace badge in README
          sed -i "s|https://img.shields.io/badge/Vibe%20Index-.*|$badge_url|g" README.md

      - uses: stefanzweifel/git-auto-commit-action@v5
        with:
          commit_message: 'Update Vibe Index badge'
```

### Example 2: Comment on Pull Requests

```yaml
- uses: roxblnfk/vibe-index@v1
  id: vibe

- uses: actions/github-script@v7
  with:
    script: |
      github.rest.issues.createComment({
        issue_number: context.issue.number,
        owner: context.repo.owner,
        repo: context.repo.repo,
        body: `## 📊 Vibe Index: ${{ steps.vibe.outputs.vibe-index }}/10.0\n![Badge](${{ steps.vibe.outputs.badge-url }})`
      });
```

### Example 3: Assert Vibe Index Range

Prevent merging if Vibe Index drops below a threshold:

```yaml
- uses: roxblnfk/vibe-index@v1
  with:
    assert-index: '6.0-10.0'  # Fail if index < 6.0 or > 10.0
    commits-count: '500'
```

## 📋 Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `commits-count` | No | `500` | Number of recent commits to analyze |
| `co-author-multiplier` | No | `0.5` | Multiplier for co-authored code (0.0-1.0) |
| `ai-keywords` | No | `Claude,GPT,AI,Agent` | Comma-separated keywords to detect AI authorship |
| `badge-style` | No | `flat-square` | Badge style: `flat`, `flat-square`, `plastic`, `for-the-badge`, `social` |
| `badge-color` | No | `3498db` | Badge color (hex without `#` or color name) |
| `assert-index` | No | `` | Assertion range, e.g., `"6.0-10.0"`. Fails if outside range |
| `badge-output-file` | No | `` | File to write badge URL to (e.g., `badge-url.txt`) |
| `include-message` | No | `Vibe Index` | Custom label for badge |

## 📤 Outputs

| Output | Description |
|--------|-------------|
| `vibe-index` | Vibe Index score (0.0-10.0) |
| `human-percentage` | Percentage of code written by humans |
| `ai-percentage` | Percentage of code written by AI |
| `human-commits-percentage` | Percentage of commits from humans |
| `ai-commits-percentage` | Percentage of commits from AI |
| `badge-url` | Generated shields.io badge URL |
| `badge-markdown` | Markdown syntax for embedding badge |

## 🎨 Badge Styles

All examples use `commit-count: 100` and `co-author-multiplier: 0.5`:

### Default (flat-square)
```
https://img.shields.io/badge/Vibe%20Index-8.5%2F10.0-3498db?style=flat-square
```
![Badge](https://img.shields.io/badge/Vibe%20Index-8.5%2F10.0-3498db?style=flat-square)

### For Badge
```
https://img.shields.io/badge/Vibe%20Index-8.5%2F10.0-27ae60?style=for-the-badge
```
![Badge](https://img.shields.io/badge/Vibe%20Index-8.5%2F10.0-27ae60?style=for-the-badge)

### Social
```
https://img.shields.io/badge/Vibe%20Index-8.5%2F10.0-3498db?style=social
```
![Badge](https://img.shields.io/badge/Vibe%20Index-8.5%2F10.0-3498db?style=social)

## 🎯 Color Coding

Colors automatically adjust based on Vibe Index:
- **Green (27ae60)**: 8.0-10.0 (Very Human-Centric)
- **Blue (3498db)**: 6.0-7.9 (Human-Focused)
- **Yellow (f39c12)**: 4.0-5.9 (Balanced)
- **Orange (e74c3c)**: 2.0-3.9 (AI-Assisted)
- **Red (c0392b)**: 0.0-1.9 (AI-Heavy)

## 🔍 How Commits are Classified

### Human Commits
- No AI keywords in commit message
- No AI in co-authors

### AI Commits
- Contains AI keywords like `Claude`, `GPT`, `AI`, `Agent`

### Co-Authored Commits
- Has `Co-Authored-By: <name>` trailer with AI keywords
- Lines are counted as:
  - `multiplier × lines` count as AI
  - `(1 - multiplier) × lines` count as human

**Example** with `co-author-multiplier: 0.5`:
```
Added 100 lines
Co-Authored-By: Claude <claude@anthropic.com>
```
Results in:
- 50 lines as AI
- 50 lines as human

## 📊 Vibe Index Formula

```
Vibe Index = (human_code_ratio × 0.6 + human_commits_ratio × 0.4) × 10
```

Where:
- `human_code_ratio` = human lines / total lines
- `human_commits_ratio` = human commits / total commits

**Examples:**
- 100% human code, 100% human commits → **10.0** (Pure human)
- 70% human code, 70% human commits → **7.0** (Human-focused)
- 50% human code, 50% human commits → **5.0** (Balanced)
- 0% human code, 0% human commits → **0.0** (Pure AI)

## 🛠️ Advanced Examples

### Custom Keywords

Detect additional AI patterns:

```yaml
- uses: roxblnfk/vibe-index@v1
  with:
    ai-keywords: 'Claude,GPT,ChatGPT,GitHub Copilot,Gemini'
```

### Strict Quality Gate

```yaml
- uses: roxblnfk/vibe-index@v1
  with:
    assert-index: '8.0-10.0'  # Only pure human code allowed
    commits-count: '1000'
```

### Generate Multiple Badge Styles

```yaml
- uses: roxblnfk/vibe-index@v1
  id: vibe1

- uses: roxblnfk/vibe-index@v1
  id: vibe2
  with:
    badge-style: 'for-the-badge'

- name: Store Badges
  run: |
    echo "${{ steps.vibe1.outputs.badge-url }}" > badge-flat.txt
    echo "${{ steps.vibe2.outputs.badge-url }}" > badge-large.txt
```

## 🐛 Troubleshooting

### "Failed to get git commits"
Ensure `fetch-depth: 0` is set in `checkout` action:
```yaml
- uses: actions/checkout@v4
  with:
    fetch-depth: 0
```

### Assertion fails unexpectedly
Check the action output:
```yaml
- run: echo "Vibe Index: ${{ steps.vibe.outputs.vibe-index }}"
```

### Co-authored commits not detected
Verify the trailer format in commits:
```
Co-Authored-By: Name <email@example.com>
```

## 📝 License

MIT

## 🤝 Contributing

Contributions welcome! Please feel free to submit issues and pull requests.

---

**Made with ❤️ by Alexei Gagarin**
