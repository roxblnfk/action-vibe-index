const { execSync } = require('child_process');

/**
 * Analyze repository commits and code authorship
 * @param {Object} options
 * @param {number} options.commitsCount - Number of commits to analyze
 * @param {number} options.coAuthorMultiplier - Multiplier for co-authored code (0-1)
 * @param {string[]} options.aiKeywords - Keywords to detect AI authorship
 * @returns {Promise<Object>} Analysis results
 */
async function analyzeRepository(options) {
  const { commitsCount, coAuthorMultiplier, aiKeywords } = options;

  // Get recent commits
  const commits = getRecentCommits(commitsCount);

  let totalLinesAdded = 0;
  let totalLinesRemoved = 0;
  let humanLinesAdded = 0;
  let humanLinesRemoved = 0;
  let aiLinesAdded = 0;
  let aiLinesRemoved = 0;
  let aiCoAuthoredLinesAdded = 0;
  let aiCoAuthoredLinesRemoved = 0;

  let totalCommits = commits.length;
  let aiCommits = 0;

  // Analyze each commit
  for (const commit of commits) {
    const { added, removed, isAI, isCoAuthored } = analyzeCommit(commit, aiKeywords);

    totalLinesAdded += added;
    totalLinesRemoved += removed;

    if (isAI) {
      aiCommits++;

      if (isCoAuthored) {
        // Co-authored with AI - apply multiplier
        aiCoAuthoredLinesAdded += added;
        aiCoAuthoredLinesRemoved += removed;
        humanLinesAdded += added * (1 - coAuthorMultiplier);
        humanLinesRemoved += removed * (1 - coAuthorMultiplier);
      } else {
        // Pure AI commit
        aiLinesAdded += added;
        aiLinesRemoved += removed;
      }
    } else {
      // Human commit
      humanLinesAdded += added;
      humanLinesRemoved += removed;
    }
  }

  // Calculate percentages
  const totalLinesChanged = totalLinesAdded + totalLinesRemoved;
  const humanLinesChanged = humanLinesAdded + humanLinesRemoved;
  const aiLinesChanged = aiLinesAdded + aiLinesRemoved + aiCoAuthoredLinesAdded + aiCoAuthoredLinesRemoved;

  const humanPercentage = totalLinesChanged > 0 ? (humanLinesChanged / totalLinesChanged) * 100 : 0;
  const aiPercentage = totalLinesChanged > 0 ? (aiLinesChanged / totalLinesChanged) * 100 : 0;
  const humanCommitsPercentage = totalCommits > 0 ? ((totalCommits - aiCommits) / totalCommits) * 100 : 0;
  const aiCommitsPercentage = totalCommits > 0 ? (aiCommits / totalCommits) * 100 : 0;

  return {
    totalCommits,
    aiCommits,
    humanCommits: totalCommits - aiCommits,
    totalLinesAdded,
    totalLinesRemoved,
    totalLinesChanged,
    humanLinesAdded,
    humanLinesRemoved,
    humanLinesChanged,
    aiLinesAdded,
    aiLinesRemoved,
    aiCoAuthoredLinesAdded,
    aiCoAuthoredLinesRemoved,
    aiLinesChanged,
    humanPercentage,
    aiPercentage,
    humanCommitsPercentage,
    aiCommitsPercentage,
  };
}

/**
 * Get recent commits
 * @param {number} count - Number of commits to fetch
 * @returns {Array<Object>} Array of commits
 */
function getRecentCommits(count) {
  try {
    const output = execSync(
      `git log -${count} --format=%H%n%s%n%B%n---COMMIT_END---`,
      { encoding: 'utf-8' }
    );

    const commits = [];
    const commitBlocks = output.split('---COMMIT_END---').filter(block => block.trim());

    for (const block of commitBlocks) {
      const lines = block.trim().split('\n');
      if (lines.length >= 2) {
        const hash = lines[0];
        const subject = lines[1];
        const body = lines.slice(2).join('\n');

        commits.push({
          hash,
          subject,
          body,
          fullMessage: block.trim(),
        });
      }
    }

    return commits;
  } catch (error) {
    throw new Error(`Failed to get git commits: ${error.message}`);
  }
}

/**
 * Analyze a single commit for AI authorship and line changes
 * @param {Object} commit - Commit object
 * @param {string[]} aiKeywords - Keywords to detect AI
 * @returns {Object} Analysis results
 */
function analyzeCommit(commit, aiKeywords) {
  const fullMessage = `${commit.subject}\n${commit.body}`;

  // Check for AI authorship
  const isAI = aiKeywords.some(keyword =>
    fullMessage.toLowerCase().includes(keyword.toLowerCase())
  );

  // Check if it's co-authored (has Co-Authored-By but not pure AI)
  const coAuthorPattern = /Co-Authored-By:\s*(.+)/gi;
  const coAuthors = [];
  let match;
  while ((match = coAuthorPattern.exec(fullMessage)) !== null) {
    coAuthors.push(match[1]);
  }

  const isCoAuthored = coAuthors.length > 0 && isAI;

  // Get line changes
  const diffOutput = execSync(`git show --numstat ${commit.hash} --pretty=format:`, {
    encoding: 'utf-8',
  });

  let added = 0;
  let removed = 0;

  const lines = diffOutput.trim().split('\n');
  for (const line of lines) {
    if (line.trim()) {
      const parts = line.split('\t');
      if (parts.length >= 2) {
        const addedStr = parts[0];
        const removedStr = parts[1];

        // Skip binary files (marked with -)
        if (addedStr !== '-' && removedStr !== '-') {
          added += parseInt(addedStr, 10) || 0;
          removed += parseInt(removedStr, 10) || 0;
        }
      }
    }
  }

  return {
    added,
    removed,
    isAI,
    isCoAuthored,
    coAuthors,
  };
}

module.exports = {
  analyzeRepository,
  getRecentCommits,
  analyzeCommit,
};
