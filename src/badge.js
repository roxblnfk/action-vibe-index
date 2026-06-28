// Built-in "AI / magic" sparkles logo (one large + two small four-pointed
// stars), white so it reads on the badge label. shields.io accepts a custom
// logo as a base64 SVG data URI, so we ship our own instead of relying on a
// simple-icons slug.
const SPARKLES_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#fff">' +
  '<path d="M9 4 Q9 13 18 13 Q9 13 9 22 Q9 13 0 13 Q9 13 9 4 Z"/>' +
  '<path d="M19 1 Q19 6 24 6 Q19 6 19 11 Q19 6 14 6 Q19 6 19 1 Z"/>' +
  '<path d="M20 14 Q20 18 24 18 Q20 18 20 22 Q20 18 16 18 Q20 18 20 14 Z"/>' +
  '</svg>';

const BUILT_IN_LOGOS = {
  sparkles: `data:image/svg+xml;base64,${Buffer.from(SPARKLES_SVG).toString('base64')}`,
};

/**
 * Resolve a logo input to what shields.io expects. A reserved keyword (e.g.
 * "sparkles") maps to a built-in data-URI logo; anything else is treated as a
 * simple-icons slug and passed through.
 *
 * @param {string} logo
 * @returns {string}
 */
function resolveLogo(logo) {
  if (!logo) return '';
  return BUILT_IN_LOGOS[logo.toLowerCase()] || logo;
}

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
 * @param {string} [options.logo] - Logo: a simple-icons slug or the built-in "sparkles"
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

  const resolvedLogo = resolveLogo(logo);
  if (resolvedLogo) {
    params.set('logo', resolvedLogo);
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
 * Generate HTML badge markup: an `<img>`, wrapped in an `<a>` when a link is
 * given. Used between the HTML comment markers, where HTML is the natural fit
 * and renders regardless of inline/block context (unlike a markdown image right
 * after a `<!--` line, which GitHub treats as a raw HTML block).
 *
 * @param {string} badgeUrl - Badge URL
 * @param {string} [altText] - Alternative text
 * @param {string} [linkUrl] - Optional link target
 * @returns {string} HTML syntax
 */
function generateBadgeHtml(badgeUrl, altText = 'Vibe Index', linkUrl = '') {
  const img = `<img src="${badgeUrl}" alt="${altText}" />`;
  return linkUrl ? `<a href="${linkUrl}">${img}</a>` : img;
}

module.exports = {
  generateBadgeUrl,
  generateBadgeMarkdown,
  generateBadgeHtml,
  resolveLogo,
};
