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

// Continuous color ramp: green (hand-crafted, 0) -> festive purple (AI, 10).
// Keep these stops in sync with the gradient in docs/vibe-scale.svg.
const GRADIENT_STOPS = [
  { at: 0, rgb: [0x27, 0xae, 0x60] },    // green
  { at: 0.25, rgb: [0x1a, 0xbc, 0x9c] }, // teal
  { at: 0.5, rgb: [0x34, 0x98, 0xdb] },  // blue
  { at: 0.75, rgb: [0x6c, 0x5c, 0xe7] }, // indigo
  { at: 1, rgb: [0x8a, 0x2b, 0xe2] },    // festive purple
];

/**
 * Get the badge color for a Vibe Index score by interpolating along the
 * green -> purple gradient (continuous, not bucketed). Higher index = more AI.
 *
 * @param {number} vibeIndex - Score from 0-10
 * @returns {string} 6-digit hex color (no '#')
 */
function getColorForIndex(vibeIndex) {
  // Quantize to the same 0.1 step the badge displays (`toFixed(1)`), so the
  // color is a pure function of the shown number. Without this, a tiny shift in
  // the raw ratios repaints the badge a slightly different shade while the
  // number reads identical — needless churn (and auto-commits) every run.
  const quantized = Math.round(vibeIndex * 10) / 10;
  const t = Math.max(0, Math.min(1, quantized / 10));

  let lo = GRADIENT_STOPS[0];
  let hi = GRADIENT_STOPS[GRADIENT_STOPS.length - 1];
  for (let i = 0; i < GRADIENT_STOPS.length - 1; i++) {
    if (t >= GRADIENT_STOPS[i].at && t <= GRADIENT_STOPS[i + 1].at) {
      lo = GRADIENT_STOPS[i];
      hi = GRADIENT_STOPS[i + 1];
      break;
    }
  }

  const span = hi.at - lo.at;
  const f = span === 0 ? 0 : (t - lo.at) / span;
  const channel = i => Math.round(lo.rgb[i] + (hi.rgb[i] - lo.rgb[i]) * f);

  return [channel(0), channel(1), channel(2)]
    .map(v => v.toString(16).padStart(2, '0'))
    .join('');
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
