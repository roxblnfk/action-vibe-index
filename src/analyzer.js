const { execFileSync } = require('child_process');
const { BOT_SIGNATURES } = require('./bot-signatures');

// ASCII control characters used as field/record separators in `git log`
// output. They never appear in commit messages or identities, so parsing
// is unambiguous.
const FIELD_SEP = '\x1f'; // Unit Separator
const RECORD_SEP = '\x1e'; // Record Separator

/**
 * Analyze repository commits and code authorship.
 *
 * @param {Object} options
 * @param {number} options.commitsCount - Number of commits to analyze
 * @param {number} options.coAuthorMultiplier - Share of credit given to AI in co-authored commits (0-1)
 * @param {RegExp[]} options.extraPatterns - User regexes merged on top of the built-in bot signatures
 * @returns {Promise<Object>} Analysis results
 */
async function analyzeRepository(options) {
  const { commitsCount, coAuthorMultiplier, extraPatterns } = options;

  const commits = getRecentCommits(commitsCount);
  const matchers = buildMatchers(extraPatterns);

  let totalLinesChanged = 0;
  let humanLinesChanged = 0;
  let aiLinesChanged = 0;

  let humanCommitsWeight = 0;
  let aiCommitsWeight = 0;

  for (const commit of commits) {
    const { lines, classification } = classifyCommit(commit, matchers);
    totalLinesChanged += lines;

    if (classification === 'ai') {
      aiLinesChanged += lines;
      aiCommitsWeight += 1;
    } else if (classification === 'co-authored') {
      // Split credit between AI and human using the configured multiplier,
      // applied consistently to both lines of code and commit authorship.
      aiLinesChanged += lines * coAuthorMultiplier;
      humanLinesChanged += lines * (1 - coAuthorMultiplier);
      aiCommitsWeight += coAuthorMultiplier;
      humanCommitsWeight += 1 - coAuthorMultiplier;
    } else {
      humanLinesChanged += lines;
      humanCommitsWeight += 1;
    }
  }

  const totalCommits = commits.length;

  const humanPercentage = totalLinesChanged > 0 ? (humanLinesChanged / totalLinesChanged) * 100 : 100;
  const aiPercentage = totalLinesChanged > 0 ? (aiLinesChanged / totalLinesChanged) * 100 : 0;
  const humanCommitsPercentage = totalCommits > 0 ? (humanCommitsWeight / totalCommits) * 100 : 100;
  const aiCommitsPercentage = totalCommits > 0 ? (aiCommitsWeight / totalCommits) * 100 : 0;

  return {
    totalCommits,
    aiCommitsWeight,
    humanCommitsWeight,
    totalLinesChanged,
    humanLinesChanged,
    aiLinesChanged,
    humanPercentage,
    aiPercentage,
    humanCommitsPercentage,
    aiCommitsPercentage,
  };
}

/**
 * Fetch recent non-merge commits together with their author identity and line
 * stats in a single `git log` invocation. Each commit is emitted as:
 *   <RECORD_SEP><hash><FIELD_SEP><author identity><FIELD_SEP><full message><FIELD_SEP>\n<numstat lines>
 *
 * Merge commits are excluded: they don't represent authored code and `git`
 * reports no numstat for them by default.
 *
 * @param {number} count - Number of commits to fetch
 * @returns {Array<{hash: string, author: string, message: string, added: number, removed: number}>}
 */
function getRecentCommits(count) {
  let output;
  try {
    output = execFileSync(
      'git',
      [
        'log',
        `-${count}`,
        '--no-merges',
        '--numstat',
        `--format=${RECORD_SEP}%H${FIELD_SEP}%an <%ae>${FIELD_SEP}%B${FIELD_SEP}`,
      ],
      { encoding: 'utf-8', maxBuffer: 256 * 1024 * 1024 }
    );
  } catch (error) {
    throw new Error(`Failed to get git commits: ${error.message}`);
  }

  const commits = [];
  const records = output.split(RECORD_SEP).filter(block => block.trim());

  for (const record of records) {
    // record = "<hash>\x1f<author>\x1f<message>\x1f\n<numstat>". The message
    // (%B) may span multiple lines but contains no field separator, so a plain
    // split is unambiguous.
    const parts = record.split(FIELD_SEP);
    if (parts.length < 3) {
      continue;
    }

    const hash = parts[0].trim();
    const author = (parts[1] || '').trim();
    const message = parts[2] || '';
    const numstat = parts[3] || '';

    const { added, removed } = parseNumstat(numstat);

    commits.push({ hash, author, message, added, removed });
  }

  return commits;
}

/**
 * Sum added/removed lines from a `git --numstat` block, skipping binary
 * files (reported as "-\t-\t<path>").
 *
 * @param {string} numstat
 * @returns {{ added: number, removed: number }}
 */
function parseNumstat(numstat) {
  let added = 0;
  let removed = 0;

  for (const line of numstat.split('\n')) {
    if (!line.trim()) {
      continue;
    }
    const parts = line.split('\t');
    if (parts.length < 2) {
      continue;
    }
    const [addedStr, removedStr] = parts;
    if (addedStr === '-' || removedStr === '-') {
      continue; // binary file
    }
    added += parseInt(addedStr, 10) || 0;
    removed += parseInt(removedStr, 10) || 0;
  }

  return { added, removed };
}

/**
 * Report whether the current git repository is shallow (its history was
 * truncated by a `--depth` clone/fetch). A shallow repo silently starves the
 * analysis of commits beyond the boundary, understating the Vibe Index — the
 * single most common cause of an unexpectedly low (often 0.0) score in CI.
 *
 * Returns false if the check can't be made (very old git, not a repo): the
 * analysis still runs, we just don't warn.
 *
 * @returns {boolean}
 */
function isShallowRepository(cwd) {
  try {
    const out = execFileSync('git', ['rev-parse', '--is-shallow-repository'], {
      encoding: 'utf-8',
      ...(cwd ? { cwd } : {}),
    });
    return out.trim() === 'true';
  } catch {
    return false;
  }
}

/**
 * Combine the curated, built-in bot signatures with the user's extra regexes.
 *
 * @param {RegExp[]} [extraPatterns]
 * @returns {RegExp[]}
 */
function buildMatchers(extraPatterns = []) {
  return [...BOT_SIGNATURES, ...extraPatterns];
}

/**
 * Classify a commit as 'human', 'ai' (authored by an AI) or 'co-authored'
 * (collaboratively written with an AI).
 *
 * Matching is done against *identities* only — the commit author and each
 * Co-Authored-By identity — never the free-text message. This avoids flagging
 * humans who merely mention an AI tool or are named like one.
 *
 * @param {{author: string, message: string, added: number, removed: number}} commit
 * @param {RegExp[]} matchers
 * @returns {{ lines: number, classification: 'human'|'ai'|'co-authored' }}
 */
function classifyCommit(commit, matchers) {
  const lines = commit.added + commit.removed;
  const message = commit.message || '';
  const author = commit.author || '';

  const isAiIdentity = identity => matchers.some(re => re.test(identity));

  // The author themselves is an AI (e.g. an autonomous agent or bot account).
  if (author && isAiIdentity(author)) {
    return { lines, classification: 'ai' };
  }

  // A human author with an AI listed in a Co-Authored-By trailer.
  const coAuthorPattern = /^\s*Co-Authored-By:\s*(.+)$/gim;
  let match;
  while ((match = coAuthorPattern.exec(message)) !== null) {
    if (isAiIdentity(match[1])) {
      return { lines, classification: 'co-authored' };
    }
  }

  return { lines, classification: 'human' };
}

module.exports = {
  analyzeRepository,
  getRecentCommits,
  classifyCommit,
  buildMatchers,
  isShallowRepository,
};
