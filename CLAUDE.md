# Vibe Index - Project Documentation

## Overview

**Vibe Index** is a GitHub Action that measures the ratio of human-written code to AI-generated/assisted code in a repository. It analyzes commit history and generates a visual badge for README files.

## Project Structure

```
.github/
  workflows/
    vibe-index-badge.yml      # Main workflow example
    vibe-index-assert.yml     # Assertion workflow example

src/
  index.js                    # Entry point (runs in GitHub Actions)
  analyzer.js                 # Git repository analysis
  calculator.js               # Vibe Index calculation logic
  badge.js                    # Badge URL generation (shields.io)

tests/
  test.js                     # Simple test suite

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
  - Detects AI keywords in commit messages
  - Handles co-authored commits with multiplier

- `getRecentCommits(count)` - Fetches last N commits using `git log`
- `analyzeCommit(commit, aiKeywords)` - Analyzes single commit
  - Gets line changes via `git show --numstat`
  - Detects AI keywords
  - Extracts Co-Authored-By trailers

**AI Detection Logic:**
- Direct AI commits: Keywords like "Claude", "GPT", "AI", "Agent" in message
- Co-authored: Has `Co-Authored-By:` trailer
- Co-author multiplier: Splits credit between human and AI
  - Example: 100 lines, multiplier 0.5 → 50 AI + 50 human

#### 2. **calculator.js** - Vibe Index Calculation
Transforms raw metrics into a 0-10 score.

**Formula:**
```
Vibe Index = (human_code_ratio × 0.6 + human_commits_ratio × 0.4) × 10
```

**Weighting:**
- 60%: Code lines (lines added/removed)
- 40%: Commits (commit authorship)

**Color Mapping:**
- 8-10: Green (Very Human-Centric)
- 6-8: Blue (Human-Focused)
- 4-6: Yellow (Balanced)
- 2-4: Orange (AI-Assisted)
- 0-2: Red (AI-Heavy)

#### 3. **badge.js** - Badge Generation
Generates shields.io URLs and markdown.

**Supports:**
- Custom styles (flat, flat-square, plastic, for-the-badge, social)
- Custom colors (hex or named)
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
| `ai-keywords` | String | Claude,GPT,AI,Agent | Keywords to detect AI authorship |
| `badge-style` | String | flat-square | shields.io style |
| `badge-color` | String | 3498db | Badge color (hex) |
| `assert-index` | String | '' | Optional range assertion (e.g., "6.0-10.0") |
| `badge-output-file` | String | '' | File to save badge URL |
| `include-message` | String | Vibe Index | Badge label text |

### Output Parameters

All numeric outputs are formatted to 1 decimal place.

## Usage Scenarios

### 1. **Update README Badge**
Automatically update a badge in README.md after each push to main:

```yaml
- uses: roxblnfk/vibe-index@v1
  id: vibe
- run: sed -i "s|badge/.*|${{ steps.vibe.outputs.badge-url }}|" README.md
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

5. **GitHub Actions Native**
   - No external dependencies beyond Node.js built-ins
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

- `@actions/core`: GitHub Actions API
- `@actions/github`: GitHub REST API client
- Node.js 20+ (git must be available)

## Maintenance

- Keep Node.js version updated with GitHub Actions LTS
- Monitor shields.io API changes
- Update AI keywords as new tools emerge
- Collect user feedback on weighting formula

## License

MIT - See LICENSE file
