/**
 * Generate shields.io badge URL
 * @param {Object} options
 * @param {string} options.message - Left side text
 * @param {string} options.value - Right side value
 * @param {string} options.style - Badge style (flat, flat-square, plastic, etc.)
 * @param {string} options.color - Badge color (hex without # or color name)
 * @returns {string} Full badge URL
 */
function generateBadgeUrl(options) {
  const { message, value, style = 'flat-square', color = '3498db' } = options;

  // Validate color format
  let finalColor = color;
  if (!color || color === '') {
    finalColor = '3498db'; // Default blue
  }

  // URL encode the message and value for proper shields.io compatibility
  const encodedMessage = encodeURIComponent(message).replace(/%20/g, '%20');
  const encodedValue = encodeURIComponent(value).replace(/%20/g, '%20');

  // Build shields.io URL
  const baseUrl = 'https://img.shields.io/badge';
  const url = `${baseUrl}/${encodedMessage}-${encodedValue}-${finalColor}?style=${style}`;

  return url;
}

/**
 * Generate markdown badge syntax
 * @param {string} badgeUrl - Badge URL
 * @param {string} linkUrl - Optional link URL (default: empty link)
 * @returns {string} Markdown syntax
 */
function generateBadgeMarkdown(badgeUrl, linkUrl = '') {
  if (linkUrl) {
    return `[![Vibe Index](${badgeUrl})](${linkUrl})`;
  }
  return `![Vibe Index](${badgeUrl})`;
}

/**
 * Generate HTML for badge
 * @param {string} badgeUrl - Badge URL
 * @param {string} altText - Alternative text
 * @returns {string} HTML syntax
 */
function generateBadgeHtml(badgeUrl, altText = 'Vibe Index') {
  return `<img src="${badgeUrl}" alt="${altText}" />`;
}

module.exports = {
  generateBadgeUrl,
  generateBadgeMarkdown,
  generateBadgeHtml,
};
