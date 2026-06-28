# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- AI detection is now **identity-based**: signatures match the commit author and
  `Co-Authored-By:` identities (vendor email domains, GitHub App `[bot]`
  accounts, the Copilot agent identity, …), never the free-text message. This
  stops humans who merely mention an AI — or are named like one — from being
  misclassified.
- The curated signatures live in a versioned list, `src/ai-signatures.js`,
  expanded in new releases.
- The `ai-keywords` input is replaced by `extra-ai-patterns`: full regexes (one
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
