# 🎵 Vibe Index GitHub Action

<!-- vibe-index:start -->
![Vibe Index](https://img.shields.io/static/v1?label=Vibe%20Index&message=8.5%2F10.0&color=27ae60&style=flat-square)
<!-- vibe-index:end -->

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

First, add the markers anywhere in your `README.md` (the action replaces
whatever is between them):

```markdown
<!-- vibe-index:start -->
![Vibe Index](https://img.shields.io/static/v1?label=Vibe%20Index&message=0.0%2F10.0&color=lightgrey&style=flat-square)
<!-- vibe-index:end -->
```

Then let the action keep them up to date and commit the change:

```yaml
name: Update Vibe Index Badge

on:
  push:
    branches: [main]
  schedule:
    - cron: '0 0 * * 0'  # Weekly

permissions:
  contents: write

jobs:
  vibe:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # required: the action needs full commit history

      - uses: roxblnfk/vibe-index@v1
        with:
          update-file: 'README.md'  # rewrites the badge between the markers

      - uses: stefanzweifel/git-auto-commit-action@v5
        with:
          commit_message: 'chore: update Vibe Index badge'
          file_pattern: 'README.md'
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
| `badge-color` | No | `3498db` | Badge color (hex without `#` or color name). When left at the default, the color is picked automatically from the score |
| `badge-logo` | No | `` | Optional logo (a [simple-icons](https://simpleicons.org) slug, e.g. `github`) |
| `assert-index` | No | `` | Assertion range, e.g., `"6.0-10.0"`. Fails if outside range |
| `badge-output-file` | No | `` | File to write badge URL to (e.g., `badge-url.txt`) |
| `update-file` | No | `` | Markdown file to update in place between the `<!-- vibe-index:start -->` / `<!-- vibe-index:end -->` markers |
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

The badge is generated through the shields.io `static/v1` endpoint, so labels
and messages are always safely URL-encoded.

### Default (flat-square)
```
https://img.shields.io/static/v1?label=Vibe%20Index&message=8.5%2F10.0&color=3498db&style=flat-square
```
![Badge](https://img.shields.io/static/v1?label=Vibe%20Index&message=8.5%2F10.0&color=3498db&style=flat-square)

### For the badge
```
https://img.shields.io/static/v1?label=Vibe%20Index&message=8.5%2F10.0&color=27ae60&style=for-the-badge
```
![Badge](https://img.shields.io/static/v1?label=Vibe%20Index&message=8.5%2F10.0&color=27ae60&style=for-the-badge)

### With a logo
```
https://img.shields.io/static/v1?label=Vibe%20Index&message=8.5%2F10.0&color=3498db&style=flat-square&logo=github
```
![Badge](https://img.shields.io/static/v1?label=Vibe%20Index&message=8.5%2F10.0&color=3498db&style=flat-square&logo=github)

## 🎯 Color Coding

Colors automatically adjust based on Vibe Index:
- **Green (27ae60)**: 8.0-10.0 (Very Human-Centric)
- **Blue (3498db)**: 6.0-7.9 (Human-Focused)
- **Yellow (f39c12)**: 4.0-5.9 (Balanced)
- **Orange (e67e22)**: 2.0-3.9 (AI-Assisted)
- **Red (e74c3c)**: 0.0-1.9 (AI-Heavy)

Automatic coloring only applies while `badge-color` is left at its default. Set
`badge-color` explicitly to always use a fixed color.

## 🔍 How Commits are Classified

Keywords are matched as whole words (case-insensitive), so `AI` matches `AI`
but not words like `available`, `maintain` or `email`. Merge commits are
ignored. Each commit falls into exactly one of three categories:

### Co-Authored Commits (checked first)
- Has a `Co-Authored-By: <name>` trailer whose name matches an AI keyword
  (e.g. `Co-Authored-By: Claude <noreply@anthropic.com>`)
- Credit is split by the multiplier, applied to **both** lines and commit count:
  - `multiplier` counts as AI
  - `1 - multiplier` counts as human

### AI Commits
- No AI co-author, but the message itself contains an AI keyword like
  `Claude`, `GPT`, `AI` or `Agent` → fully AI

### Human Commits
- No AI co-author and no AI keyword in the message

**Example** with `co-author-multiplier: 0.5`:
```
Added 100 lines
Co-Authored-By: Claude <noreply@anthropic.com>
```
Results in:
- 50 lines as AI, 50 lines as human
- 0.5 of the commit as AI, 0.5 as human

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
