const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

/**
 * Clone a remote repository into a throwaway temp directory so its history can
 * be analyzed without a prior `git checkout`. Shared by the npx CLI and the
 * GitHub Action's `fetch` mode.
 *
 * The clone is intentionally shallow (`--depth`): the analysis only looks at
 * the most recent commits, and fetching the full history of a large repo is
 * slow. Blobs are included locally (no `--filter`) so `git log --numstat`
 * never has to lazily fetch objects over the network mid-analysis.
 */

/**
 * Normalize a repository source into a clonable git URL. Accepts a full URL
 * (https/ssh, used as-is) or an "owner/repo" shorthand (expanded to a GitHub
 * https URL).
 *
 * @param {string} source
 * @returns {string}
 */
function normalizeRepoUrl(source) {
  const s = String(source || '').trim();
  // "owner/repo" shorthand -> GitHub. A bare path or URL is left untouched.
  if (/^[\w.-]+\/[\w.-]+$/.test(s)) {
    return `https://github.com/${s}.git`;
  }
  return s;
}

/**
 * Inject a token into an https URL so private repositories can be cloned.
 * Non-https URLs (ssh, scp-like) are returned unchanged.
 *
 * @param {string} url
 * @param {string} [token]
 * @returns {string}
 */
function authenticateUrl(url, token) {
  if (!token) {
    return url;
  }
  try {
    const u = new URL(url);
    if (u.protocol === 'https:') {
      // "x-access-token" is the documented username for a GITHUB_TOKEN / PAT.
      u.username = 'x-access-token';
      u.password = token;
      return u.toString();
    }
  } catch {
    // Not a parseable URL (e.g. scp-like git@github.com:owner/repo) — leave it.
  }
  return url;
}

/**
 * Clone a repository for analysis.
 *
 * @param {string} source - "owner/repo", or a full git URL
 * @param {Object} [options]
 * @param {number} [options.depth=600] - Shallow clone depth (0/undefined = full)
 * @param {string} [options.ref] - Branch/tag to clone (default branch otherwise)
 * @param {string} [options.token] - Token for authenticated https clones
 * @param {(msg: string) => void} [options.log] - Progress logger
 * @returns {{ dir: string, cleanup: () => void }}
 */
function cloneRepository(source, options = {}) {
  const { depth = 600, ref, token, log = () => {} } = options;
  const url = authenticateUrl(normalizeRepoUrl(source), token);
  const safeUrl = redactUrl(url);

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-index-'));

  const args = ['clone', '--quiet', '--no-tags', '--single-branch'];
  if (depth && depth > 0) {
    args.push(`--depth=${depth}`);
  }
  if (ref) {
    args.push('--branch', ref);
  }
  args.push(url, dir);

  log(`Cloning ${safeUrl}${ref ? ` (ref: ${ref})` : ''}${depth ? ` (depth: ${depth})` : ''}...`);
  try {
    execFileSync('git', args, { stdio: 'pipe' });
  } catch (error) {
    safeRemove(dir);
    const detail = (error.stderr && error.stderr.toString()) || error.message || '';
    throw new Error(`Failed to clone ${safeUrl}: ${redactToken(detail, token).trim()}`);
  }

  return {
    dir,
    cleanup() {
      safeRemove(dir);
    },
  };
}

function safeRemove(dir) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    // Best effort: a leftover temp dir is harmless and the OS reclaims it.
  }
}

/** Mask the token in a URL before logging or surfacing it in an error. */
function redactUrl(url) {
  try {
    const u = new URL(url);
    if (u.password) {
      u.password = '***';
    }
    return u.toString();
  } catch {
    return url;
  }
}

/** Strip any literal occurrence of the token from text (e.g. git's stderr). */
function redactToken(text, token) {
  if (!token) {
    return text;
  }
  return text.split(token).join('***');
}

module.exports = {
  cloneRepository,
  normalizeRepoUrl,
  authenticateUrl,
};
