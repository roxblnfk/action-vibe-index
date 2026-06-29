<p align="center">
    <img alt="Vibe Index" src="docs/logo.svg" width="420" style="display: block" />
</p>

<p align="center">✨ How hard does your repo vibe? ✨</p>

<div align="center">

[![Vibe Index](https://img.shields.io/static/v1?label=Vibe+Index&message=7.5&color=6c5ce7&style=for-the-badge&logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2ZmZiI%2BPHBhdGggZD0iTTkgNCBROSAxMyAxOCAxMyBROSAxMyA5IDIyIFE5IDEzIDAgMTMgUTkgMTMgOSA0IFoiLz48cGF0aCBkPSJNMTkgMSBRMTkgNiAyNCA2IFExOSA2IDE5IDExIFExOSA2IDE0IDYgUTE5IDYgMTkgMSBaIi8%2BPHBhdGggZD0iTTIwIDE0IFEyMCAxOCAyNCAxOCBRMjAgMTggMjAgMjIgUTIwIDE4IDE2IDE4IFEyMCAxOCAyMCAxNCBaIi8%2BPC9zdmc%2B)](https://github.com/roxblnfk/action-vibe-index)
[![GitHub Marketplace](https://img.shields.io/badge/Marketplace-Vibe%20Index-8a2be2?style=for-the-badge&logo=githubactions&logoColor=white)](https://github.com/marketplace/actions/vibe-index)
[![Support on Boosty](https://img.shields.io/static/v1?style=for-the-badge&label=&message=Sponsorship&logo=Boosty&logoColor=white&color=%23F15F2C)](https://boosty.to/roxblnfk)

</div>

<br />

**Vibe Index** reads your git history and scores how much of your repo was
vibe‑coded by AI vs hand‑written by humans — then turns it into a badge you can
flex. The higher the score, the harder it vibes: **`0.0`** = every line crafted
by human hands, **`10.0`** = pure AI, top to bottom.

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/vibe-scale-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="docs/vibe-scale.svg">
    <img src="docs/vibe-scale.svg" alt="Vibe Index scale: 0 means hand-crafted by a human, 10 means fully written by AI" width="680">
  </picture>
</p>

## 🚀 Usage

Two steps: drop the badge placeholder where you want it, then run the action.

### 1. Add the badge placeholder to your README

```markdown
![Vibe Index](https://img.shields.io/badge/Indexing%20Vibe-6168e5?style=flat-square)
```

The action finds it by its `Vibe Index` alt text and swaps in the real badge on
the first run — the stub above just renders an "Indexing Vibe" badge until then
(an empty `![Vibe Index]()` works too, but shows a broken image meanwhile). It
works on its own line or inline inside a row of badges.

<details>
<summary>Prefer HTML comment markers?</summary>

Wrap the spot in markers instead — an explicit, comment-based anchor:

```markdown
<!-- vibe-index:start --><!-- vibe-index:end -->
```

Between the markers the action writes HTML (so it renders in any context); an
existing `![Vibe Index](...)` image is updated as markdown. With
`badge-discovery: auto` (the default) both styles are found; set it to
`markdown` or `markers` to force one.
</details>

### 2. Run the action

```yaml
name: Vibe Index

on:
  push:                # refresh after each merge to the default branch
  workflow_dispatch:   # ...and on demand

permissions:
  contents: write  # required to commit the refreshed badge

jobs:
  vibe-index:
    # Run only on the default branch — no branch name to hardcode.
    if: github.ref_name == github.event.repository.default_branch
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
        with:
          fetch-depth: 0  # the action needs full git history

      - uses: roxblnfk/action-vibe-index@v1
        with:
          commit: true  # commit & push the refreshed badge in place
          push: true
```

This refreshes the badge whenever the default branch moves, with no branch name
hardcoded. It's cheap: the action only commits when the score actually changes,
and the `GITHUB_TOKEN` commit doesn't retrigger the workflow.

> 💡 **Already have a release workflow?** That's an even better place for it — add
> a single Vibe Index step (e.g. right after your version bump) so the badge is
> refreshed with every release. There, leave `commit`/`push` off and let your
> existing commit step pick up the changed file.

Want fewer runs instead? Trigger on a schedule (works on any default branch too):

```yaml
on:
  schedule:
    - cron: '0 0 * * 0'  # weekly
  workflow_dispatch:
```

## 🖥️ Run it locally (`npx`)

No workflow needed — score any repository straight from your terminal. The
package ships the same analyzer as the action:

```bash
# the current repo
npx vibe-index

# any GitHub repo (cloned shallowly to a temp dir, removed afterwards)
npx vibe-index facebook/react

# a full URL, a specific branch, and the badge URL
npx vibe-index https://github.com/php/php-src --ref master --badge
```

```text
Vibe Index: 5.0 / 10.0  (Balanced)
  AI code:     53.5%   |  Human code:    46.5%
  AI commits:  43.6%   |  Human commits: 56.4%
  Commits analyzed: 250
```

Common options (`npx vibe-index --help` for the full list):

| Option | Default | Purpose |
|---|---|---|
| `-c, --commits <n>` | `250` | Commits to analyze |
| `-m, --co-author-multiplier <f>` | `0.8` | AI share of a co-authored commit |
| `-p, --extra-bot-patterns <re>` | — | Extra identity regex (repeatable) |
| `--ref <branch>` | default branch | Branch/tag to clone (remote sources) |
| `--depth <n>` | `commits + 50` | Clone depth (remote sources) |
| `--token <token>` | `$GITHUB_TOKEN` | Token for private https clones |
| `--json` | off | Machine-readable output |
| `--badge` | off | Also print the badge URL & markdown |

A local path is analyzed in place; an `owner/repo` shorthand or a URL is cloned
to a temp dir and cleaned up when it's done. Private repos use `--token` or the
`GITHUB_TOKEN` / `GH_TOKEN` environment variable.

## ⚙️ Configuration

Every option with its default — keep only what you need:

```yaml
- uses: roxblnfk/action-vibe-index@v1
  with:
    # ─── analysis ───
    commits-count: '250'          # how many recent (non-merge) commits to scan
    co-author-multiplier: '0.8'   # AI share of a co-authored commit, 0..1 (0.8 = 80% AI / 20% human)
    extra-bot-patterns: |         # extra regexes (one per line) matched against the commit
      @my-company-bot\.com        # author and Co-Authored-By identities, merged on top of the
      \bInternalLLM\b             # built-in AI/bot signatures (Claude, Copilot, [bot], …)

    # ─── badge look ───
    include-message: 'Vibe Index' # left-hand label text
    badge-style: 'flat-square'    # flat | flat-square | plastic | for-the-badge | social
    badge-color: 'auto'           # 'auto' = color from the green→purple gradient by score, or a fixed hex / named color
    badge-logo: 'sparkles'        # built-in 'sparkles' ✨, a simple-icons slug (e.g. 'github'), or '' for none
    badge-link: ''                # URL the badge links to (defaults to this repo); '' = no link

    # ─── where to write the badge ───
    update-files: 'README.md'     # comma/newline list of files to update; '' to disable
    badge-discovery: 'auto'       # how to find the badge to replace:
                                  #   auto     = markers, then an existing ![Vibe Index](...) image
                                  #   markers  = only the <!-- vibe-index:start/end --> markers
                                  #   markdown = only an existing ![Vibe Index](...) image
    badge-output-file: ''         # also write the raw badge URL to this file (optional)

    # ─── auto-commit (needs permissions: contents: write) ───
    commit: false                 # commit the updated files
    push: false                   # push the commit to the current branch
    commit-message: 'chore: update Vibe Index badge'
    commit-user-name: 'github-actions[bot]'
    commit-user-email: '41898282+github-actions[bot]@users.noreply.github.com'

    # ─── quality gate ───
    assert-index: ''              # fail the run if the score is outside this range, e.g. '0.0-6.0' (≤ 60% AI)

    # ─── self-fetch (skip actions/checkout) ───
    fetch: false                  # clone the repo here instead of relying on a prior checkout (read-only)
    repository: ''                # 'owner/repo' or a git URL; defaults to the current repository
    ref: ''                       # branch/tag to clone; defaults to the repo default branch
    token: ''                     # token for private clones; defaults to the GITHUB_TOKEN env var
```

### Skip `actions/checkout` with `fetch: true`

By default the action analyzes the repository checked out by a prior
`actions/checkout` step (which needs `fetch-depth: 0`). Set `fetch: true` and it
clones the repo itself — into a temp dir, scoped to the analysis window, removed
afterwards — so a checkout step isn't needed at all:

```yaml
permissions:
  contents: read
steps:
  - uses: roxblnfk/action-vibe-index@v1
    with:
      fetch: true            # no actions/checkout needed
      update-files: ''       # read-only: just compute the score & badge URL
    env:
      GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}  # only needed for a private repo
```

`fetch` mode is **read-only**: it computes the score, the `badge-url` and the
other outputs, but doesn't touch files or commit (the temp clone is discarded).
Use it to score another repo (`repository: owner/other-repo`) or to comment the
score on a PR without a checkout. To rewrite a README in place, use the default
checkout-based flow.

### Outputs

| Output | Description |
|--------|-------------|
| `vibe-index` | Score `0.0`–`10.0` |
| `ai-percentage` / `human-percentage` | Share of code lines by AI / by humans |
| `ai-commits-percentage` / `human-commits-percentage` | Share of commits by AI / by humans |
| `badge-url` | Generated shields.io badge URL |
| `badge-markdown` | Ready-to-paste markdown for the badge |
| `badge-html` | Ready-to-paste HTML for the badge (`<img>`, wrapped in `<a>` when `badge-link` is set) |

### Recipe: comment the score on every pull request

```yaml
- uses: roxblnfk/action-vibe-index@v1
  id: vibe
  with:
    update-files: ''  # don't touch files, just compute the score

- uses: actions/github-script@v7
  with:
    script: |
      github.rest.issues.createComment({
        issue_number: context.issue.number,
        owner: context.repo.owner,
        repo: context.repo.repo,
        body: `Vibe Index: ${{ steps.vibe.outputs.vibe-index }} / 10`
      });
```

## 🎨 Badge styles

A few looks and the options that produce them (score `7.0` shown):

| Options | Badge |
|---|---|
| _(defaults)_ | ![badge](https://img.shields.io/static/v1?label=Vibe+Index&message=7.0&color=6168e5&style=flat-square&logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2ZmZiI%2BPHBhdGggZD0iTTkgNCBROSAxMyAxOCAxMyBROSAxMyA5IDIyIFE5IDEzIDAgMTMgUTkgMTMgOSA0IFoiLz48cGF0aCBkPSJNMTkgMSBRMTkgNiAyNCA2IFExOSA2IDE5IDExIFExOSA2IDE0IDYgUTE5IDYgMTkgMSBaIi8%2BPHBhdGggZD0iTTIwIDE0IFEyMCAxOCAyNCAxOCBRMjAgMTggMjAgMjIgUTIwIDE4IDE2IDE4IFEyMCAxOCAyMCAxNCBaIi8%2BPC9zdmc%2B) |
| `badge-style: for-the-badge` | ![badge](https://img.shields.io/static/v1?label=Vibe+Index&message=7.0&color=6168e5&style=for-the-badge&logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2ZmZiI%2BPHBhdGggZD0iTTkgNCBROSAxMyAxOCAxMyBROSAxMyA5IDIyIFE5IDEzIDAgMTMgUTkgMTMgOSA0IFoiLz48cGF0aCBkPSJNMTkgMSBRMTkgNiAyNCA2IFExOSA2IDE5IDExIFExOSA2IDE0IDYgUTE5IDYgMTkgMSBaIi8%2BPHBhdGggZD0iTTIwIDE0IFEyMCAxOCAyNCAxOCBRMjAgMTggMjAgMjIgUTIwIDE4IDE2IDE4IFEyMCAxOCAyMCAxNCBaIi8%2BPC9zdmc%2B) |
| `badge-style: plastic` | ![badge](https://img.shields.io/static/v1?label=Vibe+Index&message=7.0&color=6168e5&style=plastic&logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2ZmZiI%2BPHBhdGggZD0iTTkgNCBROSAxMyAxOCAxMyBROSAxMyA5IDIyIFE5IDEzIDAgMTMgUTkgMTMgOSA0IFoiLz48cGF0aCBkPSJNMTkgMSBRMTkgNiAyNCA2IFExOSA2IDE5IDExIFExOSA2IDE0IDYgUTE5IDYgMTkgMSBaIi8%2BPHBhdGggZD0iTTIwIDE0IFEyMCAxOCAyNCAxOCBRMjAgMTggMjAgMjIgUTIwIDE4IDE2IDE4IFEyMCAxOCAyMCAxNCBaIi8%2BPC9zdmc%2B) |
| `badge-style: flat` | ![badge](https://img.shields.io/static/v1?label=Vibe+Index&message=7.0&color=6168e5&style=flat&logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2ZmZiI%2BPHBhdGggZD0iTTkgNCBROSAxMyAxOCAxMyBROSAxMyA5IDIyIFE5IDEzIDAgMTMgUTkgMTMgOSA0IFoiLz48cGF0aCBkPSJNMTkgMSBRMTkgNiAyNCA2IFExOSA2IDE5IDExIFExOSA2IDE0IDYgUTE5IDYgMTkgMSBaIi8%2BPHBhdGggZD0iTTIwIDE0IFEyMCAxOCAyNCAxOCBRMjAgMTggMjAgMjIgUTIwIDE4IDE2IDE4IFEyMCAxOCAyMCAxNCBaIi8%2BPC9zdmc%2B) |
| `badge-style: social` | ![badge](https://img.shields.io/static/v1?label=Vibe+Index&message=7.0&color=6168e5&style=social&logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2ZmZiI%2BPHBhdGggZD0iTTkgNCBROSAxMyAxOCAxMyBROSAxMyA5IDIyIFE5IDEzIDAgMTMgUTkgMTMgOSA0IFoiLz48cGF0aCBkPSJNMTkgMSBRMTkgNiAyNCA2IFExOSA2IDE5IDExIFExOSA2IDE0IDYgUTE5IDYgMTkgMSBaIi8%2BPHBhdGggZD0iTTIwIDE0IFEyMCAxOCAyNCAxOCBRMjAgMTggMjAgMjIgUTIwIDE4IDE2IDE4IFEyMCAxOCAyMCAxNCBaIi8%2BPC9zdmc%2B) |
| `badge-color: '8a2be2'` | ![badge](https://img.shields.io/static/v1?label=Vibe+Index&message=7.0&color=8a2be2&style=flat-square&logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2ZmZiI%2BPHBhdGggZD0iTTkgNCBROSAxMyAxOCAxMyBROSAxMyA5IDIyIFE5IDEzIDAgMTMgUTkgMTMgOSA0IFoiLz48cGF0aCBkPSJNMTkgMSBRMTkgNiAyNCA2IFExOSA2IDE5IDExIFExOSA2IDE0IDYgUTE5IDYgMTkgMSBaIi8%2BPHBhdGggZD0iTTIwIDE0IFEyMCAxOCAyNCAxOCBRMjAgMTggMjAgMjIgUTIwIDE4IDE2IDE4IFEyMCAxOCAyMCAxNCBaIi8%2BPC9zdmc%2B) |
| `badge-logo: ''` _(no logo)_ | ![badge](https://img.shields.io/static/v1?label=Vibe+Index&message=7.0&color=6168e5&style=flat-square) |
| `badge-logo: 'github'` | ![badge](https://img.shields.io/static/v1?label=Vibe+Index&message=7.0&color=6168e5&style=flat-square&logo=github) |
| `include-message: 'AI ratio'` | ![badge](https://img.shields.io/static/v1?label=AI+ratio&message=7.0&color=6168e5&style=flat-square&logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2ZmZiI%2BPHBhdGggZD0iTTkgNCBROSAxMyAxOCAxMyBROSAxMyA5IDIyIFE5IDEzIDAgMTMgUTkgMTMgOSA0IFoiLz48cGF0aCBkPSJNMTkgMSBRMTkgNiAyNCA2IFExOSA2IDE5IDExIFExOSA2IDE0IDYgUTE5IDYgMTkgMSBaIi8%2BPHBhdGggZD0iTTIwIDE0IFEyMCAxOCAyNCAxOCBRMjAgMTggMjAgMjIgUTIwIDE4IDE2IDE4IFEyMCAxOCAyMCAxNCBaIi8%2BPC9zdmc%2B) |

## 🧠 How it works

### Detecting AI authorship

Detection is based on commit **identities** — the author `Name <email>` and any
`Co-Authored-By:` identities — matched against a curated list of signatures
(vendor email domains like `@anthropic.com`, GitHub App `[bot]` accounts, the
Copilot agent identity, …). It deliberately does **not** scan the free-text
message, so a human who merely mentions an AI tool, or who happens to be named
"Claude", is never misclassified.

The built-in list lives in [`src/bot-signatures.js`](src/bot-signatures.js) and
grows in new releases. Add tools specific to your team via `extra-bot-patterns`
(one regex per line) — they are merged on top of the built-in signatures.

### Classifying each commit

Merge commits are ignored. Every other commit falls into exactly one bucket:

- **AI** — the commit *author* identity is an AI/bot → counted fully as AI.
- **Co-authored** — a human author with an AI `Co-Authored-By:` identity →
  credit is split by `co-author-multiplier`, applied to **both** lines and the
  commit itself.
- **Human** — neither the author nor any co-author matches a signature.

Example with the default `co-author-multiplier: 0.8`:

```
100 changed lines
Co-Authored-By: Claude <noreply@anthropic.com>
```

→ 80 lines counted as AI, 20 as human; and the commit counts as 0.8 AI / 0.2 human.

### The score

```
Vibe Index = (ai_code_ratio × 0.6 + ai_commits_ratio × 0.4) × 10
```

Code lines weigh 60%, commit authorship 40%. Both ratios are in `0..1`, so the
score is always `0.0`–`10.0`:

| AI code | AI commits | Vibe Index |
|--------:|-----------:|:----------:|
| 0%   | 0%   | **0.0** — fully hand-written |
| 30%  | 30%  | **3.0** — human-focused |
| 50%  | 50%  | **5.0** — balanced |
| 100% | 100% | **10.0** — fully AI |

### Badge color

With `badge-color: auto` (the default) the color is interpolated along a
green → festive purple ramp
(`#27ae60 → #1abc9c → #3498db → #6c5ce7 → #8a2be2`) — green for hand-crafted,
purple for fully vibe-coded. The color tracks the displayed score (quantized to
the same `0.1` step), so it only changes when the number does. Set a fixed hex
or named color to opt out.

## 🐛 Troubleshooting

- **"Failed to get git commits"** — set `fetch-depth: 0` on `actions/checkout`,
  so the action sees the full history.
- **The score is unexpectedly low (often `0.0`)** — the repository is most
  likely shallow, so the action only sees a slice of history. Set
  `fetch-depth: 0` on `actions/checkout`, and make sure no earlier step runs
  `git fetch --depth=…` — that **re-shallows even a full clone** and starves
  this step of history. The action warns when it detects a shallow repo.
- **The badge doesn't update / isn't committed** — enable `commit: true`
  (and `push: true`) and grant `permissions: contents: write`, or commit the
  changed file with your own step.
- **The badge image doesn't render** — keep the marker pair on its own line; a
  line that starts with `<!--` is treated as raw HTML by GitHub, so the action
  writes the badge on its own line there.
