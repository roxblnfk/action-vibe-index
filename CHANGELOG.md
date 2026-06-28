# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Built-in auto-commit: `commit`/`push` inputs (with `commit-message`,
  `commit-user-name`, `commit-user-email`) let the action commit and push the
  updated badge files itself, before the assertion, so no separate
  git-auto-commit step is required.

### Changed

- `co-author-multiplier` default changed from `0.5` to `0.8` (an AI co-authored
  commit is now credited 80% to AI by default).
- **Badge color is now a continuous green → festive purple gradient** instead of
  5 discrete buckets: `getColorForIndex` interpolates the exact color from the
  score (`#27ae60 → #1abc9c → #3498db → #6c5ce7 → #8a2be2`). The `badge-color`
  default changed from `3498db` to `auto`; the README scale (`docs/vibe-scale.svg`)
  uses the same gradient.
- **Vibe Index scale inverted to match its meaning**: `10.0` now means fully
  AI/"vibe-coded" and `0.0` means fully hand-written. The formula uses the AI
  ratios — `(ai_code_ratio × 0.6 + ai_commits_ratio × 0.4) × 10` — and the
  colors/descriptions follow suit (high index → red/AI-Heavy, low → green/Hand-Crafted).
- Bot/AI detection is now **identity-based**: signatures match the commit author
  and `Co-Authored-By:` identities (vendor email domains, GitHub App `[bot]`
  accounts, the Copilot agent identity, …), never the free-text message. This
  stops humans who merely mention an AI — or are named like one — from being
  misclassified. Automation bots (dependabot, github-actions) count as non-human
  too.
- The curated signatures live in a versioned list, `src/bot-signatures.js`,
  expanded in new releases.
- The `ai-keywords` input is replaced by `extra-bot-patterns`: full regexes (one
  per line) merged on top of the built-in signatures instead of replacing them
  (default empty).

## [1.0.0] - 2026-06-28

### Added

- Git repository analyzer that inspects the last N non-merge commits and
  counts changed lines by authorship.
- AI detection via word-boundary keyword matching in commit messages and
  `Co-Authored-By` trailers.
- Configurable co-author multiplier, applied consistently to both lines of
  code and commit authorship.
- Vibe Index calculation (60% code lines, 40% commit authorship) scaled to
  a 0.0-10.0 score, with automatic color selection.
- shields.io badge generation through the `static/v1` endpoint, with custom
  style, color and optional logo.
- Input validation with helpful error messages.
- Optional `assert-index` range that fails the workflow when the score falls
  outside the given bounds.
- Zero runtime dependencies: the action talks to the GitHub Actions runner
  protocol directly, so no `node_modules` or bundling step is required.

[Unreleased]: https://github.com/roxblnfk/vibe-index/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/roxblnfk/vibe-index/releases/tag/v1.0.0
