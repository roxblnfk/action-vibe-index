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

function validateExtraKeywords(keywords) {
  // Optional: these are merged on top of the built-in AI signatures, so an
  // empty value is valid and simply means "use the built-in list only".
  if (!keywords || typeof keywords !== 'string') {
    return [];
  }
  return keywords
    .split(',')
    .map(k => k.trim())
    .filter(k => k.length > 0);
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

function validateBadgeLogo(logo) {
  if (!logo || typeof logo !== 'string') {
    return '';
  }
  // Logos are simple-icons slugs (e.g. "github", "javascript"); keep it simple
  // and only allow safe characters.
  const trimmed = logo.trim();
  if (trimmed && !/^[a-zA-Z0-9._-]+$/.test(trimmed)) {
    throw new Error(`badge-logo must be a valid logo slug. Got: "${logo}"`);
  }
  return trimmed;
}

function validateBadgeOutputFile(file) {
  if (!file || typeof file !== 'string') {
    return '';
  }
  return file.trim();
}

function validateUpdateFiles(files) {
  if (!files || typeof files !== 'string') {
    return [];
  }
  return files
    .split(/[\n,]/)
    .map(f => f.trim())
    .filter(f => f.length > 0);
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
    validated.extraKeywords = validateExtraKeywords(inputs.extraKeywords);
    validated.badgeStyle = validateBadgeStyle(inputs.badgeStyle);
    validated.badgeColor = validateBadgeColor(inputs.badgeColor);
    validated.assertIndex = validateAssertIndex(inputs.assertIndex);
    validated.includeMessage = validateIncludeMessage(inputs.includeMessage);
    validated.badgeLogo = validateBadgeLogo(inputs.badgeLogo);
    validated.badgeOutputFile = validateBadgeOutputFile(inputs.badgeOutputFile);
    validated.updateFiles = validateUpdateFiles(inputs.updateFiles);

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
  validateExtraKeywords,
  validateBadgeStyle,
  validateBadgeColor,
  validateAssertIndex,
  validateIncludeMessage,
  validateBadgeLogo,
  validateBadgeOutputFile,
  validateUpdateFiles,
  validateAllInputs,
};
