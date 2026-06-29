# Vibe Index - Project Documentation

## Overview

**Vibe Index** measures the ratio of human-written code to AI-generated/assisted
code in a repository. It analyzes commit history and generates a visual badge for
README files. It ships in two forms from one codebase: a **GitHub Action** and an
**npx CLI** (`npx vibe-index [repo]`).

## Project Structure

```
.github/
  workflows/
    vibe-index.yml            # Updates the README badge and asserts the score

bin/
  cli.js                      # npx entry point (CLI); shares the src/ analyzer

src/
  index.js                    # Action entry point (runs in GitHub Actions)
  core.js                     # Dependency-free @actions/core shim (runner protocol)
  analyzer.js                 # Git repository analysis (accepts an optional cwd)
  repo.js                     # Clone a remote repo to a temp dir (CLI + fetch mode)
  bot-signatures.js           # Versioned, built-in bot/AI detection regexes
  calculator.js               # Vibe Index calculation logic
  badge.js                    # Badge URL generation (shields.io)
  updater.js                  # In-place README badge update (marker-based)
  committer.js                # Optional git commit/push of updated files
  validation.js               # Input parsing and validation

tests/
  test.js                     # Assertion-based test suite

action.yml                    # GitHub Action definition
package.json                  # npm metadata: "bin" (CLI), "files", zero deps
README.md                     # User-facing documentation
CLAUDE.md                     # This file
LICENSE                       # BSD-3-Clause License
```

## Architecture

### Core Components

#### 1. **analyzer.js** - Git Repository Analysis
Analyzes commit history to determine human vs AI authorship.

**Key Functions:**
- `analyzeRepository(options)` - Main analysis function
  - Returns metrics about code lines and commits
  - Applies the co-author multiplier to both lines and commit authorship

- `getRecentCommits(count, cwd)` - Fetches last N non-merge commits with author
  identity (`%an <%ae>`) and numstat in a single `git log --no-merges --numstat`
  call (control-character separators make parsing unambiguous; no per-commit
  `git show`). `cwd` (optional) selects the directory git runs in, so the CLI
  and the action's `fetch` mode can point it at a temp clone.
- `classifyCommit(commit, matchers)` - Classifies one commit as
  `human` / `ai` / `co-authored` by matching identities
- `buildMatchers(extraPatterns)` - Returns the built-in `BOT_SIGNATURES`
  (from `bot-signatures.js`) plus the user's extra regexes

**Built-in signatures (`bot-signatures.js`):** a curated, versioned list of
regexes anchored to identities (vendor email domains like `@anthropic.com`,
GitHub App `[bot]` accounts, the Copilot agent identity, …) covering both AI
agents and automation bots, maintained with the action. Users extend — not
replace — it via the `extra-bot-patterns` input (one regex per line).

**AI Detection Logic (identity-based, case-insensitive):**
- Matching is done against the commit author identity and each `Co-Authored-By:`
  identity — never the free-text message. This avoids flagging humans who merely
  mention an AI tool or are named like one.
- AI (checked first): the author identity matches a signature → fully AI.
- Co-authored: a human author with an AI `Co-Authored-By:` identity → credit
  split by the multiplier (lines AND commit count). Example: 100 lines,
  multiplier 0.8 → 80 AI + 20 human, and 0.8/0.2 of the commit.
- Human: neither matches.

#### 2. **calculator.js** - Vibe Index Calculation
Transforms raw metrics into a 0-10 score.

**Formula:**
```
Vibe Index = (ai_code_ratio × 0.6 + ai_commits_ratio × 0.4) × 10
```
Higher = more AI/vibe: 10.0 = fully AI, 0.0 = fully hand-written (AI-less).

**Weighting:**
- 60%: Code lines (lines added/removed)
- 40%: Commits (commit authorship)

**Color (gradient, higher = more AI):** `getColorForIndex` interpolates along a
green → festive purple ramp (`#27ae60 → #1abc9c → #3498db → #6c5ce7 → #8a2be2`).
The score is quantized to the displayed `0.1` step before interpolating, so the
color is a pure function of the shown number (no badge churn when the number is
unchanged). Used when `badge-color: auto` (the default); the same stops back the
gradient in `docs/vibe-scale.svg`.

#### 3. **badge.js** - Badge Generation
Generates shields.io URLs and markdown using the `static/v1` endpoint, so the
label and message are URL-encoded via `URLSearchParams` (no manual dash/slash
escaping).

**Supports:**
- Custom styles (flat, flat-square, plastic, for-the-badge, social)
- Custom colors (hex or named)
- Optional logo: built-in `sparkles` (AI/magic data-URI icon) or a simple-icons slug
- Markdown embedding (`generateBadgeMarkdown` → `![alt](url)`, link-wrapped)
- HTML embedding (`generateBadgeHtml` → `<img>`, wrapped in `<a>` when a link is
  set); used between the HTML comment markers, where HTML renders reliably

#### 4. **index.js** - GitHub Action Entry Point
Orchestrates the analysis and outputs results.

**Responsibilities:**
- Reads GitHub Actions inputs
- Optionally self-fetches the repo (`fetch: true`, see `repo.js`) instead of
  relying on a prior `actions/checkout`; analysis then runs with `cwd` set to
  the temp clone, which is removed in a `finally`
- Calls analyzer
- Calculates Vibe Index
- Generates badge
- Handles assertions
- Sets GitHub Actions outputs
- Updates badge in files, optionally commits/pushes them (before the assertion).
  Skipped in `fetch` mode, which is read-only (the temp clone is discarded).

#### 5. **repo.js** - Clone for analysis
Clones a remote repository into a throwaway temp dir so its history can be
analyzed without a prior checkout. Shared by the npx CLI and the action's
`fetch` mode.

- `cloneRepository(source, { depth, ref, token, log })` → `{ dir, cleanup }`.
  Shallow (`--depth`, default sized to the analysis window), `--single-branch`,
  **no** `--filter` (blobs must be local so `git log --numstat` never lazily
  fetches over the network mid-analysis). `cleanup()` removes the temp tree.
- `normalizeRepoUrl(source)` - expands an `owner/repo` shorthand to a GitHub
  https URL; a full URL / local path passes through.
- `authenticateUrl(url, token)` - injects `x-access-token:<token>@` into an
  **https** URL for private clones (no-op for ssh/scp-like URLs or no token).
- The token is redacted in all logs and error messages.

#### 6. **bin/cli.js** - npx CLI Entry Point
`npx vibe-index [source] [options]`. Reuses `src/` end to end. A local path is
analyzed in place (`cwd`); an `owner/repo` shorthand or a URL is cloned via
`repo.js` and cleaned up afterwards. Flags: `-c/--commits`,
`-m/--co-author-multiplier`, `-p/--extra-bot-patterns` (repeatable), `--ref`,
`--depth`, `--token` (defaults to `$GITHUB_TOKEN`/`$GH_TOKEN`), `--json`,
`--badge`, `--no-clean`, `-h/--help`, `-v/--version`. Human output goes to
stdout; progress/warnings to stderr (so `--json` stdout stays clean).

## Configuration

### Input Parameters

| Parameter | Type | Default | Purpose |
|-----------|------|---------|---------|
| `commits-count` | Number | 250 | How many recent commits to analyze |
| `fetch` | Bool | false | Clone the repo itself (read-only) instead of using a prior checkout |
| `repository` | String | '' | Repo to clone in `fetch` mode (`owner/repo` or URL); defaults to `$GITHUB_REPOSITORY` |
| `ref` | String | '' | Branch/tag to clone in `fetch` mode; defaults to the repo default branch |
| `token` | String | '' | Token for `fetch` clones; defaults to the `GITHUB_TOKEN` env var |
| `co-author-multiplier` | Float (0-1) | 0.8 | Share of an AI co-authored commit credited to AI |
| `extra-bot-patterns` | String | '' | Extra regexes (one per line) matched against identities, merged on top of the built-in signatures |
| `badge-style` | String | flat-square | shields.io style |
| `badge-color` | String | auto | `auto` interpolates from the gradient by score; or a fixed hex / named color |
| `badge-logo` | String | sparkles | Logo: built-in `sparkles` (AI icon, default), a simple-icons slug, or empty |
| `badge-link` | String | repo URL | URL the badge links to (defaults to the Vibe Index repo); empty = no link |
| `assert-index` | String | '' | Optional range assertion (e.g., "6.0-10.0") |
| `badge-output-file` | String | '' | File to save badge URL |
| `update-files` | String | README.md | Comma/newline list of markdown files to update in place |
| `badge-discovery` | Enum | auto | How to locate the badge: `auto` / `markers` / `markdown` |
| `commit` / `push` | Bool | false | Auto-commit (and push) the updated files |
| `commit-message` / `commit-user-name` / `commit-user-email` | String | bot defaults | Identity/message for the auto-commit |
| `include-message` | String | Vibe Index | Badge label text |

### Output Parameters

All numeric outputs are formatted to 1 decimal place.

## Usage Scenarios

### 1. **Update README Badge**
Place markers in README.md and let the action rewrite the badge in place
(`updater.js`). This uses literal string replacement between the markers, so
it is robust to `&`/`/` in the URL and never touches example badges elsewhere
in the file — unlike a `sed` one-liner, where `&` is special in the
replacement and a global pattern clobbers every badge.

`badge-discovery` selects how the badge is located, and the form written
depends on the path: `markers` (between the comment markers) writes **HTML**
(`<img>`, wrapped in `<a>` when `badge-link` is set), because the markers are
HTML comments and HTML renders reliably there; `markdown` (an existing
`![Vibe Index](...)` image, matched by alt text and replaced in place —
including a link-wrapped `[![…](…)](…)`) writes **markdown**; `auto` tries
markers first, then markdown. Markdown discovery replaces only the first
matching image. The updater receives both forms (`{ markdown, html }`) so each
path emits the right one.

Layout follows the markers: when the start marker begins its own line the badge
is written on its own line for a tidy block; when content precedes the marker
the badge stays inline (badge rows). The badge is wrapped in `badge-link`
(default: the repo URL) so readers can click through to the explanation.

```markdown
<!-- vibe-index:start -->
<a href="..."><img src="..." alt="Vibe Index" /></a>
<!-- vibe-index:end -->
```

`update-files` defaults to `README.md`. The action can commit & push the change
itself (`committer.js`) — this runs *before* the assertion, so the badge is
persisted even when the gate fails; no separate commit step is needed.

```yaml
- uses: roxblnfk/vibe-index@v1
  with:
    update-files: 'README.md, docs/index.md'
    commit: true
    push: true   # needs permissions: contents: write
```

The auto-commit sets a local git identity, stages only the changed files
(skipping an empty commit), and pushes to the branch from `GITHUB_HEAD_REF` /
`GITHUB_REF_NAME`. Failures are surfaced as warnings, not hard errors.

### 2. **PR Comment**
Comment Vibe Index on each pull request:

```yaml
- uses: roxblnfk/vibe-index@v1
  id: vibe
- uses: actions/github-script@v7
  with:
    script: |
      github.rest.issues.createComment({
        issue_number: context.issue.number,
        body: `Vibe Index: ${{ steps.vibe.outputs.vibe-index }}/10.0`
      });
```

### 3. **Assert Quality Gate**
Prevent merging if human code percentage drops:

```yaml
- uses: roxblnfk/vibe-index@v1
  with:
    assert-index: '6.0-10.0'  # Fail if < 6.0 or > 10.0
```

## Key Design Decisions

1. **Weighting (60% code, 40% commits)**
   - Code weight reflects actual work volume
   - Commit weight reflects development pace and methodology
   - Prevents single-file PRs from dominating metrics

2. **Co-author Multiplier**
   - Allows partial credit for collaborative AI work
   - Default 0.8 means AI gets 80% of credit in co-authored commits
   - Customizable for different team philosophies

3. **Recent Commits Only**
   - Default 250 commits — a "how we write now" window that stays responsive
     to a shift in methodology rather than averaging over a long tail
   - Prevents old AI experiments from skewing current metrics
   - Configurable to look at different time windows

4. **Shields.io Integration**
   - Free, no authentication needed
   - Dynamic badge generation (no caching issues)
   - Supports multiple styles and colors
   - Works in README, wikis, anywhere markdown is supported

5. **GitHub Actions Native, zero dependencies**
   - No external dependencies: `src/core.js` implements the small subset of the
     runner protocol the action needs (inputs via `INPUT_*` env vars, outputs via
     the `GITHUB_OUTPUT` file). This means the action runs straight from source —
     no committed `node_modules` and no `ncc`/`dist` bundling step.
   - Direct access to git repository
   - Native outputs for subsequent steps
   - Works in private repositories

## Testing

Run the test suite:
```bash
npm test
```

Tests verify:
- Vibe Index calculation correctness
- Edge cases (0%, 100%, 50%)
- Color mapping by score
- Badge URL generation
- Description labels

## Future Enhancements

1. **Language-Specific Analysis**
   - Different weights for different file types
   - Exclude generated/vendored code

2. **Team Attribution**
   - Per-author breakdown
   - Team vs individual metrics

3. **Historical Trends**
   - Track Vibe Index over time
   - Generate trend charts

4. **Custom AI Signatures**
   - Learn from commit message patterns
   - Machine learning detection

5. **Integration with other Tools**
   - GitHub API webhooks
   - Slack notifications
   - Linear/Jira integration

## Distribution (npm / npx)

The same codebase is published to npm so it runs via `npx vibe-index`.

- `package.json` declares `"bin": { "vibe-index": "bin/cli.js" }` and a `"files"`
  allow-list (`bin/`, `src/`, `action.yml`) so the published tarball stays lean.
- Zero runtime dependencies — `npx` only downloads this package.
- **Publishing** (maintainer): bump the version, then `npm publish` (or a CI
  release workflow with an npm automation token in the `NPM_TOKEN` secret and
  `npm publish --provenance`). The package name `vibe-index` must be available
  on npm; otherwise publish under a scope (`@roxblnfk/vibe-index`, run via
  `npx @roxblnfk/vibe-index`). The GitHub Action keeps using `roxblnfk/...@v1`
  regardless — npm and the Action are independent distribution channels.

## Dependencies

- None at runtime. The action and CLI only use Node.js built-ins plus the `git`
  CLI.
- Node.js (provided by the `node24` action runtime, or `node >=20` for the CLI;
  `git` must be available)

## Maintenance

- Keep Node.js version updated with GitHub Actions LTS
- Monitor shields.io API changes
- Update `src/bot-signatures.js` as new AI tools/bots emerge (bump "Last reviewed")
- Collect user feedback on weighting formula

## License

BSD-3-Clause - See LICENSE file
