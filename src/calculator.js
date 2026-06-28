/**
 * Calculate Vibe Index from analysis metrics
 * Vibe Index = (human_code_ratio * 0.6 + human_commits_ratio * 0.4) * 10
 *
 * The formula weights code lines 60% and commits 40%.
 * A pure human repo scores 10.0, pure AI scores 0.0
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
  const humanCodeRatio = humanPercentage / 100;
  const humanCommitsRatio = humanCommitsPercentage / 100;

  // Weighted formula: code lines 60%, commits 40%
  // Result scales to 0-10
  const vibeIndex = (humanCodeRatio * 0.6 + humanCommitsRatio * 0.4) * 10;

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
 * Get color for Vibe Index score
 * 8-10: Green (excellent human ratio)
 * 6-8: Blue (good)
 * 4-6: Yellow (balanced)
 * 2-4: Orange (AI heavy)
 * 0-2: Red (very AI heavy)
 *
 * @param {number} vibeIndex - Score from 0-10
 * @returns {string} Hex color code
 */
function getColorForIndex(vibeIndex) {
  if (vibeIndex >= 8) return '27ae60'; // Green
  if (vibeIndex >= 6) return '3498db'; // Blue
  if (vibeIndex >= 4) return 'f39c12'; // Yellow
  if (vibeIndex >= 2) return 'e74c3c'; // Orange
  return 'c0392b'; // Red
}

/**
 * Get label/description for Vibe Index
 * @param {number} vibeIndex - Score from 0-10
 * @returns {string} Description
 */
function getDescriptionForIndex(vibeIndex) {
  if (vibeIndex >= 8) return 'Very Human-Centric';
  if (vibeIndex >= 6) return 'Human-Focused';
  if (vibeIndex >= 4) return 'Balanced';
  if (vibeIndex >= 2) return 'AI-Assisted';
  return 'AI-Heavy';
}

module.exports = {
  calculateVibeIndex,
  getColorForIndex,
  getDescriptionForIndex,
};
