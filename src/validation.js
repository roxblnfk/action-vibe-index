/**
 * Validate input parameters
 */

function validateCommitsCount(count) {
  const num = parseInt(count, 10);
  if (isNaN(num) || num < 1) {
    throw new Error('commits-count must be a positive integer');
  }
  if (num > 10000) {
    console.warn(`Warning: commits-count is very large (${num}). Analysis may be slow.`);
  }
  return num;
}

function validateCoAuthorMultiplier(multiplier) {
  const num = parseFloat(multiplier);
  if (isNaN(num) || num < 0 || num > 1) {
    throw new Error('co-author-multiplier must be a number between 0.0 and 1.0');
  }
  return num;
}

function validateAIKeywords(keywords) {
  if (!keywords || typeof keywords !== 'string') {
    throw new Error('ai-keywords must be a string');
  }
  const keywordList = keywords
    .split(',')
    .map(k => k.trim())
    .filter(k => k.length > 0);

  if (keywordList.length === 0) {
    throw new Error('ai-keywords must contain at least one keyword');
  }

  return keywordList;
}

function validateBadgeStyle(style) {
  const validStyles = ['flat', 'flat-square', 'plastic', 'for-the-badge', 'social'];
  if (!validStyles.includes(style)) {
    throw new Error(
      `badge-style must be one of: ${validStyles.join(', ')}. Got: "${style}"`
    );
  }
  return style;
}

function validateBadgeColor(color) {
  // Accept hex color without # or named colors
  if (/^[0-9a-fA-F]{6}$/.test(color)) {
    return color;
  }

  // Common named colors in shields.io
  const namedColors = [
    'blue', 'brightgreen', 'green', 'yellowgreen', 'yellow',
    'orange', 'red', 'lightgrey', 'success', 'important',
    'critical', 'informational', 'inactive',
  ];

  if (namedColors.includes(color.toLowerCase())) {
    return color;
  }

  throw new Error(
    `badge-color must be a 6-digit hex code (without #) or a valid named color. Got: "${color}"`
  );
}

function validateAssertIndex(assertIndex) {
  if (!assertIndex || assertIndex.trim() === '') {
    return null;
  }

  const parts = assertIndex.split('-').map(p => p.trim());
  if (parts.length !== 2) {
    throw new Error(
      'assert-index must be in format "min-max" (e.g., "6.0-10.0")'
    );
  }

  const min = parseFloat(parts[0]);
  const max = parseFloat(parts[1]);

  if (isNaN(min) || isNaN(max)) {
    throw new Error('assert-index values must be valid numbers');
  }

  if (min < 0 || max > 10) {
    throw new Error('assert-index values must be between 0.0 and 10.0');
  }

  if (min > max) {
    throw new Error(`assert-index min (${min}) cannot be greater than max (${max})`);
  }

  return { min, max };
}

function validateIncludeMessage(message) {
  if (!message || typeof message !== 'string') {
    return 'Vibe Index';
  }
  // Limit message length for badge
  if (message.length > 50) {
    console.warn(`Warning: include-message is very long (${message.length} chars). Truncating to 50.`);
    return message.substring(0, 50);
  }
  return message;
}

/**
 * Validate all inputs at once
 */
function validateAllInputs(inputs) {
  const validated = {};

  try {
    validated.commitsCount = validateCommitsCount(inputs.commitsCount);
    validated.coAuthorMultiplier = validateCoAuthorMultiplier(inputs.coAuthorMultiplier);
    validated.aiKeywords = validateAIKeywords(inputs.aiKeywords);
    validated.badgeStyle = validateBadgeStyle(inputs.badgeStyle);
    validated.badgeColor = validateBadgeColor(inputs.badgeColor);
    validated.assertIndex = validateAssertIndex(inputs.assertIndex);
    validated.includeMessage = validateIncludeMessage(inputs.includeMessage);

    return {
      success: true,
      validated,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

module.exports = {
  validateCommitsCount,
  validateCoAuthorMultiplier,
  validateAIKeywords,
  validateBadgeStyle,
  validateBadgeColor,
  validateAssertIndex,
  validateIncludeMessage,
  validateAllInputs,
};
