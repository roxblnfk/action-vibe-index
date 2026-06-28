/**
 * Generate a shields.io badge URL using the static/v1 endpoint.
 *
 * The query-string endpoint is used instead of the legacy
 * `/badge/<label>-<message>-<color>` path because it relies on standard URL
 * encoding and therefore handles dashes, slashes and spaces in the label or
 * message without any custom escaping.
 *
 * @param {Object} options
 * @param {string} options.label - Left side text
 * @param {string} options.message - Right side text
 * @param {string} [options.style] - Badge style (flat, flat-square, plastic, for-the-badge, social)
 * @param {string} [options.color] - Badge color (hex without # or color name)
 * @param {string} [options.logo] - Optional logo name (simple-icons slug)
 * @returns {string} Full badge URL
 */
function generateBadgeUrl(options) {
  const { label, message, style = 'flat-square', color = '3498db', logo = '' } = options;

  const params = new URLSearchParams({
    label,
    message,
    color: color || '3498db',
    style,
  });

  if (logo) {
    params.set('logo', logo);
  }

  return `https://img.shields.io/static/v1?${params.toString()}`;
}

/**
 * Generate markdown badge syntax.
 *
 * @param {string} badgeUrl - Badge URL
 * @param {string} [altText] - Alt text for the image
 * @param {string} [linkUrl] - Optional link target
 * @returns {string} Markdown syntax
 */
function generateBadgeMarkdown(badgeUrl, altText = 'Vibe Index', linkUrl = '') {
  const image = `![${altText}](${badgeUrl})`;
  return linkUrl ? `[${image}](${linkUrl})` : image;
}

/**
 * Generate an HTML <img> tag for the badge.
 *
 * @param {string} badgeUrl - Badge URL
 * @param {string} [altText] - Alternative text
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
