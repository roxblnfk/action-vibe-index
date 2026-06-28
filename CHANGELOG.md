# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0](https://github.com/roxblnfk/action-vibe-index/compare/v1.0.0...v1.0.0) (2026-06-28)


### Documentation

* add a Badge styles gallery to the README ([56c6121](https://github.com/roxblnfk/action-vibe-index/commit/56c612162ea712af928c9f187aef08d6141995ed))
* add an SVG Vibe Index scale to the README ([a544af6](https://github.com/roxblnfk/action-vibe-index/commit/a544af6b1fc426672aec471511beba5032b0b8cb))
* add changelog template and versioning guide ([9391792](https://github.com/roxblnfk/action-vibe-index/commit/939179226b6e437b8cd0904e8e47df8797a31084))
* add dark-theme scale and switch README to theme-aware &lt;picture&gt; ([40b12f6](https://github.com/roxblnfk/action-vibe-index/commit/40b12f6866d728a0ba5118786c9abde656421c6b))
* add green-to-purple gradient palette example (proposal) ([bb1b54b](https://github.com/roxblnfk/action-vibe-index/commit/bb1b54b47f2a4d56f107920bb5c39a0f007f8193))
* add naming conventions guide ([b02d2f8](https://github.com/roxblnfk/action-vibe-index/commit/b02d2f8fac84288aec1f74fac9cb67b14495af65))
* polish the Usage section ([55735d3](https://github.com/roxblnfk/action-vibe-index/commit/55735d3ea33f9b8c30d0cfb4171643979489c5a3))


### Miscellaneous

* release 1.0.0 ([1b4f107](https://github.com/roxblnfk/action-vibe-index/commit/1b4f1070cb2516e41d0d1e1af65a282a30ce1055))

## [Unreleased]

### Added

- `badge-discovery` input (`auto` | `markers` | `markdown`): the badge can now be
  located either by the `<!-- vibe-index:start/end -->` markers or by an existing
  `![Vibe Index](...)` markdown image (matched by alt text, link-wrapped form
  supported). `auto` (default) tries markers first, then markdown.
- Built-in `sparkles` logo (now the **default** `badge-logo`): an AI/magic ✨
  icon (a large four-pointed star plus two small ones), shipped as an SVG data
  URI. Set `badge-logo` to a simple-icons slug for a different logo, or empty
  for none.
- `badge-link` input (default: the Vibe Index repository URL) wraps the badge in
  a link so readers can learn what the metric means; set empty to disable.
- Built-in auto-commit: `commit`/`push` inputs (with `commit-message`,
  `commit-user-name`, `commit-user-email`) let the action commit and push the
  updated badge files itself, before the assertion, so no separate
  git-auto-commit step is required.

### Fixed

- A badge written inline on a line that starts with `<!--` did not render on
  GitHub (such a line is a raw HTML block). The updater now writes the badge on
  its own line when the start marker begins a line, and only stays inline when
  other content precedes the marker (badge rows).

### Changed

- License changed from MIT to BSD-3-Clause (LICENSE, `package.json`, docs).
- The badge message is now just the score (e.g. `7.4`) instead of `7.4/10.0`,
  and a perfect score shows as `10` (no `.0`).
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
