# Vibe Index - Project Documentation

## Overview

**Vibe Index** is a GitHub Action that measures the ratio of human-written code to AI-generated/assisted code in a repository. It analyzes commit history and generates a visual badge for README files.

## Project Structure

```
.github/
  workflows/
    vibe-index.yml            # Updates the README badge and asserts the score

src/
  index.js                    # Entry point (runs in GitHub Actions)
  core.js                     # Dependency-free @actions/core shim (runner protocol)
  analyzer.js                 # Git repository analysis
  bot-signatures.js           # Versioned, built-in bot/AI detection regexes
  calculator.js               # Vibe Index calculation logic
  badge.js                    # Badge URL generation (shields.io)
  updater.js                  # In-place README badge update (marker-based)
  validation.js               # Input parsing and validation

tests/
  test.js                     # Assertion-based test suite

action.yml                    # GitHub Action definition
package.json                  # Node.js dependencies
README.md                     # User-facing documentation
CLAUDE.md                     # This file
LICENSE                       # MIT License
```

## Architecture

### Core Components

#### 1. **analyzer.js** - Git Repository Analysis
Analyzes commit history to determine human vs AI authorship.

**Key Functions:**
- `analyzeRepository(options)` - Main analysis function
  - Returns metrics about code lines and commits
  - Applies the co-author multiplier to both lines and commit authorship

- `getRecentCommits(count)` - Fetches last N non-merge commits with author
  identity (`%an <%ae>`) and numstat in a single `git log --no-merges --numstat`
  call (control-character separators make parsing unambiguous; no per-commit
  `git show`)
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
  multiplier 0.5 → 50 AI + 50 human, and 0.5/0.5 of the commit.
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

**Color Mapping (higher = more AI):**
- 8-10: Red (e74c3c, AI-Heavy)
- 6-8: Orange (e67e22, AI-Assisted)
- 4-6: Yellow (f39c12, Balanced)
- 2-4: Blue (3498db, Human-Focused)
- 0-2: Green (27ae60, Hand-Crafted)

Auto-coloring only applies while `badge-color` is left at its default.

#### 3. **badge.js** - Badge Generation
Generates shields.io URLs and markdown using the `static/v1` endpoint, so the
label and message are URL-encoded via `URLSearchParams` (no manual dash/slash
escaping).

**Supports:**
- Custom styles (flat, flat-square, plastic, for-the-badge, social)
- Custom colors (hex or named)
- Optional logo (simple-icons slug)
- Markdown embedding
- HTML embedding

#### 4. **index.js** - GitHub Action Entry Point
Orchestrates the analysis and outputs results.

**Responsibilities:**
- Reads GitHub Actions inputs
- Calls analyzer
- Calculates Vibe Index
- Generates badge
- Handles assertions
- Sets GitHub Actions outputs
- Writes to files if specified

## Configuration

### Input Parameters

| Parameter | Type | Default | Purpose |
|-----------|------|---------|---------|
| `commits-count` | Number | 500 | How many recent commits to analyze |
| `co-author-multiplier` | Float (0-1) | 0.5 | Credit split for co-authored commits |
| `extra-bot-patterns` | String | '' | Extra regexes (one per line) matched against identities, merged on top of the built-in signatures |
| `badge-style` | String | flat-square | shields.io style |
| `badge-color` | String | 3498db | Badge color (hex); auto-picked from score when left at default |
| `badge-logo` | String | '' | Optional logo (simple-icons slug) |
| `assert-index` | String | '' | Optional range assertion (e.g., "6.0-10.0") |
| `badge-output-file` | String | '' | File to save badge URL |
| `update-files` | String | README.md | Comma/newline list of markdown files to update in place between markers |
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

```markdown
<!-- vibe-index:start -->
![Vibe Index](...)
<!-- vibe-index:end -->
```

`update-files` defaults to `README.md`; pass a comma/newline list to target
several files, or an empty string to disable.

```yaml
- uses: roxblnfk/vibe-index@v1
  with:
    update-files: 'README.md, docs/index.md'
- uses: stefanzweifel/git-auto-commit-action@v5
  with:
    commit_message: 'chore: update Vibe Index badge'
    file_pattern: 'README.md docs/index.md'
```

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
   - Default 0.5 means AI gets 50% of credit in co-authored commits
   - Customizable for different team philosophies

3. **Recent Commits Only**
   - Default 500 commits (~1-3 months for active projects)
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

## Dependencies

- None at runtime. The action only uses Node.js built-ins plus the `git` CLI.
- Node.js (provided by the `node24` action runtime; `git` must be available)

## Maintenance

- Keep Node.js version updated with GitHub Actions LTS
- Monitor shields.io API changes
- Update `src/bot-signatures.js` as new AI tools/bots emerge (bump "Last reviewed")
- Collect user feedback on weighting formula

## License

MIT - See LICENSE file
