/**
 * Calculate Vibe Index from analysis metrics
 * Vibe Index = (ai_code_ratio * 0.6 + ai_commits_ratio * 0.4) * 10
 *
 * The formula weights code lines 60% and commits 40%.
 * Higher = more AI/"vibe": a pure AI repo scores 10.0, a fully hand-written
 * (AI-less) repo scores 0.0.
 *
 * @param {Object} analysis - Results from analyzeRepository
 * @returns {Object} { vibeIndex, metrics }
 */
function calculateVibeIndex(analysis) {
  const {
    humanPercentage,
    aiPercentage,
    humanCommitsPercentage,
    aiCommitsPercentage,
  } = analysis;

  // Normalize to 0-1 range
  const aiCodeRatio = aiPercentage / 100;
  const aiCommitsRatio = aiCommitsPercentage / 100;

  // Weighted formula: code lines 60%, commits 40%
  // Result scales to 0-10 (higher = more AI/vibe)
  const vibeIndex = (aiCodeRatio * 0.6 + aiCommitsRatio * 0.4) * 10;

  // Clamp to 0-10 range
  const clampedIndex = Math.max(0, Math.min(10, vibeIndex));

  return {
    vibeIndex: clampedIndex,
    metrics: {
      humanPercentage,
      aiPercentage,
      humanCommitsPercentage,
      aiCommitsPercentage,
    },
  };
}

/**
 * Get color for Vibe Index score. Higher index = more AI/vibe.
 * 8-10: Red (AI-heavy)
 * 6-8: Orange (AI-assisted)
 * 4-6: Yellow (balanced)
 * 2-4: Blue (human-focused)
 * 0-2: Green (hand-crafted / AI-less)
 *
 * @param {number} vibeIndex - Score from 0-10
 * @returns {string} Hex color code
 */
function getColorForIndex(vibeIndex) {
  if (vibeIndex >= 8) return 'e74c3c'; // Red
  if (vibeIndex >= 6) return 'e67e22'; // Orange
  if (vibeIndex >= 4) return 'f39c12'; // Yellow
  if (vibeIndex >= 2) return '3498db'; // Blue
  return '27ae60'; // Green
}

/**
 * Get label/description for Vibe Index. Higher index = more AI/vibe.
 * @param {number} vibeIndex - Score from 0-10
 * @returns {string} Description
 */
function getDescriptionForIndex(vibeIndex) {
  if (vibeIndex >= 8) return 'AI-Heavy';
  if (vibeIndex >= 6) return 'AI-Assisted';
  if (vibeIndex >= 4) return 'Balanced';
  if (vibeIndex >= 2) return 'Human-Focused';
  return 'Hand-Crafted';
}

module.exports = {
  calculateVibeIndex,
  getColorForIndex,
  getDescriptionForIndex,
};
