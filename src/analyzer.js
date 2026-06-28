const { execFileSync } = require('child_process');

// ASCII control characters used as field/record separators in `git log`
// output. They never appear in commit messages or numstat lines, so parsing
// is unambiguous.
const FIELD_SEP = '\x1f'; // Unit Separator
const RECORD_SEP = '\x1e'; // Record Separator

/**
 * Analyze repository commits and code authorship.
 *
 * @param {Object} options
 * @param {number} options.commitsCount - Number of commits to analyze
 * @param {number} options.coAuthorMultiplier - Share of credit given to AI in co-authored commits (0-1)
 * @param {string[]} options.aiKeywords - Keywords used to detect AI authorship
 * @returns {Promise<Object>} Analysis results
 */
async function analyzeRepository(options) {
  const { commitsCount, coAuthorMultiplier, aiKeywords } = options;

  const commits = getRecentCommits(commitsCount);
  const matchers = buildKeywordMatchers(aiKeywords);

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
 * Fetch recent non-merge commits together with their line stats in a single
 * `git log` invocation. Each commit is emitted as:
 *   <RECORD_SEP><hash><FIELD_SEP><full message><FIELD_SEP>\n<numstat lines>
 *
 * Merge commits are excluded: they don't represent authored code and `git`
 * reports no numstat for them by default.
 *
 * @param {number} count - Number of commits to fetch
 * @returns {Array<{hash: string, message: string, added: number, removed: number}>}
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
        `--format=${RECORD_SEP}%H${FIELD_SEP}%B${FIELD_SEP}`,
      ],
      { encoding: 'utf-8', maxBuffer: 256 * 1024 * 1024 }
    );
  } catch (error) {
    throw new Error(`Failed to get git commits: ${error.message}`);
  }

  const commits = [];
  const records = output.split(RECORD_SEP).filter(block => block.trim());

  for (const record of records) {
    const sepIndex = record.indexOf(FIELD_SEP);
    if (sepIndex === -1) {
      continue;
    }

    const hash = record.slice(0, sepIndex).trim();
    const rest = record.slice(sepIndex + 1);

    // `rest` is "<message><FIELD_SEP>\n<numstat block>". Splitting on the
    // second separator cleanly divides the (possibly multi-line) message from
    // the numstat lines, which keeps message content out of the line counting.
    const secondSep = rest.indexOf(FIELD_SEP);
    const message = secondSep === -1 ? rest : rest.slice(0, secondSep);
    const numstat = secondSep === -1 ? '' : rest.slice(secondSep + 1);

    const { added, removed } = parseNumstat(numstat);

    commits.push({ hash, message, added, removed });
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
 * Build case-insensitive, word-boundary regexes for each AI keyword.
 * Word boundaries prevent false positives such as "AI" matching inside
 * "available", "maintain" or "email".
 *
 * @param {string[]} keywords
 * @returns {RegExp[]}
 */
function buildKeywordMatchers(keywords) {
  return keywords.map(keyword => {
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`\\b${escaped}\\b`, 'i');
  });
}

/**
 * Classify a commit as 'human', 'ai' (authored by AI) or 'co-authored'
 * (collaboratively written with AI). Co-authorship is detected specifically
 * from Co-Authored-By trailers that name an AI; a generic AI keyword anywhere
 * else in the message marks the commit as AI-authored.
 *
 * @param {{message: string, added: number, removed: number}} commit
 * @param {RegExp[]} matchers
 * @returns {{ lines: number, classification: 'human'|'ai'|'co-authored' }}
 */
function classifyCommit(commit, matchers) {
  const lines = commit.added + commit.removed;
  const message = commit.message || '';

  const coAuthorLines = [];
  const coAuthorPattern = /^\s*Co-Authored-By:\s*(.+)$/gim;
  let match;
  while ((match = coAuthorPattern.exec(message)) !== null) {
    coAuthorLines.push(match[1]);
  }

  const hasAiCoAuthor = coAuthorLines.some(line =>
    matchers.some(re => re.test(line))
  );
  if (hasAiCoAuthor) {
    return { lines, classification: 'co-authored' };
  }

  const messageMentionsAi = matchers.some(re => re.test(message));
  if (messageMentionsAi) {
    return { lines, classification: 'ai' };
  }

  return { lines, classification: 'human' };
}

module.exports = {
  analyzeRepository,
  getRecentCommits,
  classifyCommit,
  buildKeywordMatchers,
};
