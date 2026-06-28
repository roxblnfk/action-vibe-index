const { execFileSync } = require('child_process');

function git(args, cwd) {
  try {
    return execFileSync('git', args, { cwd, encoding: 'utf-8' });
  } catch (error) {
    const stderr = error.stderr ? `: ${String(error.stderr).trim()}` : '';
    throw new Error(`git ${args.join(' ')} failed${stderr}`);
  }
}

/**
 * Commit (and optionally push) the given files.
 *
 * Designed to run inside a GitHub Actions job: it sets a local git identity,
 * stages only the listed files, commits if something is actually staged, and
 * pushes to the current branch when requested. The branch is resolved from the
 * runner env (GITHUB_HEAD_REF for pull requests, otherwise GITHUB_REF_NAME).
 *
 * @param {Object} opts
 * @param {string[]} opts.files - Files to stage and commit
 * @param {string} opts.message - Commit message
 * @param {string} opts.userName - git user.name
 * @param {string} opts.userEmail - git user.email
 * @param {boolean} [opts.push] - Push after committing
 * @param {string} [opts.cwd] - Working directory (defaults to process.cwd())
 * @returns {{ committed: boolean, pushed: boolean, branch?: string, reason?: string }}
 */
function commitChanges(opts) {
  const { files, message, userName, userEmail, push = false, cwd } = opts;

  if (!files || files.length === 0) {
    return { committed: false, pushed: false, reason: 'no files to commit' };
  }

  git(['config', 'user.name', userName], cwd);
  git(['config', 'user.email', userEmail], cwd);
  git(['add', '--', ...files], cwd);

  // `git diff --cached --quiet` exits 0 when nothing is staged, non-zero
  // otherwise — so a thrown error here means there ARE staged changes.
  let hasStaged = false;
  try {
    git(['diff', '--cached', '--quiet'], cwd);
  } catch (_) {
    hasStaged = true;
  }
  if (!hasStaged) {
    return { committed: false, pushed: false, reason: 'nothing staged' };
  }

  git(['commit', '-m', message], cwd);

  if (!push) {
    return { committed: true, pushed: false };
  }

  const branch = process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME;
  if (!branch) {
    return { committed: true, pushed: false, reason: 'could not resolve branch to push' };
  }

  git(['push', 'origin', `HEAD:refs/heads/${branch}`], cwd);
  return { committed: true, pushed: true, branch };
}

module.exports = { commitChanges };
