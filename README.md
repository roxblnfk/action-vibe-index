# 🎵 Vibe Index GitHub Action

<!-- vibe-index:start -->
![Vibe Index](https://img.shields.io/static/v1?label=Vibe+Index&message=4.1%2F10.0&color=f39c12&style=flat-square)
<!-- vibe-index:end -->

<p align="center">
  <img src="docs/vibe-scale.svg" alt="Vibe Index scale: 0 means hand-crafted by a human, 10 means fully written by AI" width="680">
</p>

**The higher the score, the more of your code was written by AI.**
`0.0` = every line hand-written by a human · `10.0` = everything authored by AI agents or bots.

Vibe Index analyzes your git history to measure the ratio of AI-written vs
hand-written code, and turns it into a dynamic badge for your README.

## 📊 What is Vibe Index?

**Vibe Index** is a metric that analyzes your repository's commit history to determine:
- What percentage of code was written by humans
- What percentage was written or assisted by AI
- A combined score from 0.0 to 10.0 (where **10.0 = fully AI/"vibe-coded"** and **0.0 = fully hand-written**)

The metric weighs:
- **60%**: Lines of code ratio (human vs AI)
- **40%**: Commit authorship ratio (human vs AI commits)

### How it detects AI-authored code:

Detection is based on commit **identities** — the author `Name <email>` and any
`Co-Authored-By:` identities — matched against a curated list of AI signatures
(vendor email domains like `@anthropic.com`, GitHub App `[bot]` accounts, the
Copilot agent identity, …). It deliberately does **not** scan the free-text
message, so a human who merely mentions an AI tool, or who happens to be named
"Claude", is never misclassified.

1. **AI author**: the commit author identity is an AI/bot → counted fully as AI
2. **Co-authored with AI**: a `Co-Authored-By:` identity is an AI → credit is
   split with a configurable multiplier (0.0-1.0), giving partial credit to the human

The built-in signature list lives in [`src/bot-signatures.js`](src/bot-signatures.js)
and is expanded in new releases. To detect tools specific to your team, add your
own regexes via `extra-bot-patterns` — they are merged on top of the built-in list.

## 🚀 Usage

### Basic Setup

Add this action to your workflow:

```yaml
- uses: roxblnfk/vibe-index@v1
  id: vibe
  with:
    commits-count: '500'
    co-author-multiplier: '0.5'
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

Then let the action keep them up to date and commit the change. The action
updates `README.md` by default; pass `update-files` to target a different set
of files:

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
        # update-files defaults to README.md; the badge between the markers is
        # rewritten in place. Use e.g. update-files: 'README.md, docs/index.md'
        # to target several files.

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

Keep the AI share within a range — e.g. fail if the repo becomes too AI-heavy
(remember: higher index = more AI):

```yaml
- uses: roxblnfk/vibe-index@v1
  with:
    assert-index: '0.0-6.0'  # Fail if index > 6.0 (i.e. >60% AI)
    commits-count: '500'
```

## 📋 Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `commits-count` | No | `500` | Number of recent commits to analyze |
| `co-author-multiplier` | No | `0.5` | Multiplier for co-authored code (0.0-1.0) |
| `extra-bot-patterns` | No | `` | Extra regexes (one per line) matched against commit identities, merged on top of the built-in bot/AI signatures |
| `badge-style` | No | `flat-square` | Badge style: `flat`, `flat-square`, `plastic`, `for-the-badge`, `social` |
| `badge-color` | No | `3498db` | Badge color (hex without `#` or color name). When left at the default, the color is picked automatically from the score |
| `badge-logo` | No | `` | Optional logo (a [simple-icons](https://simpleicons.org) slug, e.g. `github`) |
| `assert-index` | No | `` | Assertion range, e.g., `"6.0-10.0"`. Fails if outside range |
| `badge-output-file` | No | `` | File to write badge URL to (e.g., `badge-url.txt`) |
| `update-files` | No | `README.md` | Comma/newline-separated list of markdown files to update in place between the `<!-- vibe-index:start -->` / `<!-- vibe-index:end -->` markers. Set to empty to disable |
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

Colors automatically adjust based on Vibe Index (higher = more AI):
- **Red (e74c3c)**: 8.0-10.0 (AI-Heavy)
- **Orange (e67e22)**: 6.0-7.9 (AI-Assisted)
- **Yellow (f39c12)**: 4.0-5.9 (Balanced)
- **Blue (3498db)**: 2.0-3.9 (Human-Focused)
- **Green (27ae60)**: 0.0-1.9 (Hand-Crafted)

Automatic coloring only applies while `badge-color` is left at its default. Set
`badge-color` explicitly to always use a fixed color.

## 🔍 How Commits are Classified

Signatures are matched against commit **identities** (the author and any
`Co-Authored-By:` identity), never the free-text message. Merge commits are
ignored. Each commit falls into exactly one of three categories:

### AI Commits (checked first)
- The commit **author** identity is an AI/bot (e.g. `github-actions[bot] <…>`
  or an agent committing under a vendor email) → counted fully as AI

### Co-Authored Commits
- A human author, but a `Co-Authored-By:` identity is an AI
  (e.g. `Co-Authored-By: Claude <noreply@anthropic.com>`)
- Credit is split by the multiplier, applied to **both** lines and commit count:
  - `multiplier` counts as AI
  - `1 - multiplier` counts as human

### Human Commits
- Neither the author nor any co-author identity matches an AI signature

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
Vibe Index = (ai_code_ratio × 0.6 + ai_commits_ratio × 0.4) × 10
```

Where:
- `ai_code_ratio` = AI lines / total lines
- `ai_commits_ratio` = AI commits / total commits

**Examples:**
- 0% AI code, 0% AI commits → **0.0** (fully hand-written)
- 30% AI code, 30% AI commits → **3.0** (human-focused)
- 50% AI code, 50% AI commits → **5.0** (balanced)
- 100% AI code, 100% AI commits → **10.0** (fully AI / max vibe)

## 🛠️ Advanced Examples

### Custom Signatures

The built-in signatures already cover the common tools. Use `extra-bot-patterns`
(one regex per line, matched against commit identities) to add agents or
automation bots specific to your team — they are merged with the built-in list:

```yaml
- uses: roxblnfk/vibe-index@v1
  with:
    extra-bot-patterns: |
      @acme-ai\.example\b
      \bInternalLLM\b
```

### Strict Quality Gate

```yaml
- uses: roxblnfk/vibe-index@v1
  with:
    assert-index: '0.0-2.0'  # Only near hand-written code allowed (<20% AI)
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
