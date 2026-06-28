# 🎵 Vibe Index GitHub Action

<!-- vibe-index:start -->
[![Vibe Index](https://img.shields.io/static/v1?label=Vibe+Index&message=6.9%2F10.0&color=5e6be4&style=flat-square&logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2ZmZiI%2BPHBhdGggZD0iTTkgNCBROSAxMyAxOCAxMyBROSAxMyA5IDIyIFE5IDEzIDAgMTMgUTkgMTMgOSA0IFoiLz48cGF0aCBkPSJNMTkgMSBRMTkgNiAyNCA2IFExOSA2IDE5IDExIFExOSA2IDE0IDYgUTE5IDYgMTkgMSBaIi8%2BPHBhdGggZD0iTTIwIDE0IFEyMCAxOCAyNCAxOCBRMjAgMTggMjAgMjIgUTIwIDE4IDE2IDE4IFEyMCAxOCAyMCAxNCBaIi8%2BPC9zdmc%2B)](https://github.com/roxblnfk/action-vibe-index)
<!-- vibe-index:end -->

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/vibe-scale-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="docs/vibe-scale.svg">
    <img src="docs/vibe-scale.svg" alt="Vibe Index scale: 0 means hand-crafted by a human, 10 means fully written by AI" width="680">
  </picture>
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
    co-author-multiplier: '0.8'
    badge-style: 'flat-square'
```

### Example 1: Post Badge in README

First, add the markers anywhere in your `README.md` (the action replaces
whatever is between them):

```markdown
<!-- vibe-index:start -->
![Vibe Index](https://img.shields.io/static/v1?label=Vibe%20Index&message=0.0&color=lightgrey&style=flat-square)
<!-- vibe-index:end -->
```

The action replaces whatever sits between the markers. Even an empty pair works:

```markdown
<!-- vibe-index:start --><!-- vibe-index:end -->
```

Layout is chosen so the badge always renders on GitHub: when the start marker
begins its own line, the badge is written on its own line (a line that *starts*
with `<!--` is treated as a raw HTML block by GitHub, so an inline image there
would not render). When other content precedes the marker, the badge stays
inline — so it works inside a row of badges:

```markdown
![build](...) <!-- vibe-index:start -->![Vibe Index](...)<!-- vibe-index:end --> ![license](...)
```

The action updates `README.md` by default and can commit & push the change
itself (`commit`/`push`), so no extra step is needed:

```yaml
name: Update Vibe Index Badge

on:
  push:
    branches: [main]
  schedule:
    - cron: '0 0 * * 0'  # Weekly

permissions:
  contents: write  # required for commit/push

jobs:
  vibe:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # required: the action needs full commit history

      - uses: roxblnfk/vibe-index@v1
        with:
          # update-files defaults to README.md (badge rewritten between markers)
          commit: true
          push: true
```

Prefer a dedicated commit step instead? Leave `commit`/`push` off and pass the
updated file to e.g. `stefanzweifel/git-auto-commit-action`.

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
| `co-author-multiplier` | No | `0.8` | Share of an AI co-authored commit credited to AI (0.0-1.0) |
| `extra-bot-patterns` | No | `` | Extra regexes (one per line) matched against commit identities, merged on top of the built-in bot/AI signatures |
| `badge-style` | No | `flat-square` | Badge style: `flat`, `flat-square`, `plastic`, `for-the-badge`, `social` |
| `badge-color` | No | `auto` | `auto` interpolates a color along the green→purple gradient from the score; or pass a fixed hex (without `#`) / named color |
| `badge-logo` | No | `sparkles` | Logo on the badge: the built-in `sparkles` (AI/magic ✨ icon, default), a [simple-icons](https://simpleicons.org) slug (e.g. `github`), or empty for none |
| `badge-link` | No | repo URL | URL the badge links to (defaults to the Vibe Index repo so readers can learn what it means). Empty = no link |
| `assert-index` | No | `` | Assertion range, e.g., `"6.0-10.0"`. Fails if outside range |
| `badge-output-file` | No | `` | File to write badge URL to (e.g., `badge-url.txt`) |
| `update-files` | No | `README.md` | Comma/newline-separated list of markdown files to update in place between the `<!-- vibe-index:start -->` / `<!-- vibe-index:end -->` markers. Set to empty to disable |
| `commit` | No | `false` | Commit the updated files automatically (needs `permissions: contents: write`) |
| `push` | No | `false` | Push the auto-commit to the current branch (used with `commit`) |
| `commit-message` | No | `chore: update Vibe Index badge` | Message for the auto-commit |
| `commit-user-name` | No | `github-actions[bot]` | `git user.name` for the auto-commit |
| `commit-user-email` | No | `…github-actions[bot]@users.noreply.github.com` | `git user.email` for the auto-commit |
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
https://img.shields.io/static/v1?label=Vibe%20Index&message=8.5&color=3498db&style=flat-square
```
![Badge](https://img.shields.io/static/v1?label=Vibe%20Index&message=8.5&color=3498db&style=flat-square)

### For the badge
```
https://img.shields.io/static/v1?label=Vibe%20Index&message=8.5&color=27ae60&style=for-the-badge
```
![Badge](https://img.shields.io/static/v1?label=Vibe%20Index&message=8.5&color=27ae60&style=for-the-badge)

### With a logo
```
https://img.shields.io/static/v1?label=Vibe%20Index&message=8.5&color=3498db&style=flat-square&logo=github
```
![Badge](https://img.shields.io/static/v1?label=Vibe%20Index&message=8.5&color=3498db&style=flat-square&logo=github)

## 🎯 Color Coding

With `badge-color: auto` (the default), the badge color is interpolated along a
**continuous green → festive purple gradient** at the exact score — green for
hand-crafted, purple for fully AI/vibe-coded:

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/vibe-scale-dark.svg">
  <source media="(prefers-color-scheme: light)" srcset="docs/vibe-scale.svg">
  <img src="docs/vibe-scale.svg" alt="Vibe Index scale" width="680">
</picture>

The ramp runs through `#27ae60` → `#1abc9c` → `#3498db` → `#6c5ce7` → `#8a2be2`.
Set `badge-color` to a fixed hex or named color to opt out of auto-coloring.

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

**Example** with `co-author-multiplier: 0.8` (the default):
```
Added 100 lines
Co-Authored-By: Claude <noreply@anthropic.com>
```
Results in:
- 80 lines as AI, 20 lines as human
- 0.8 of the commit as AI, 0.2 as human

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
