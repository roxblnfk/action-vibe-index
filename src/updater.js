const fs = require('fs');

const START_MARKER = '<!-- vibe-index:start -->';
const END_MARKER = '<!-- vibe-index:end -->';

/**
 * Replace the content between the Vibe Index markers with fresh badge markdown.
 *
 * Uses literal string search (not regex/sed) so that ampersands, slashes and
 * other special characters in the badge URL are inserted verbatim, and only
 * the single marked region is touched.
 *
 * @param {string} content - Current file content
 * @param {string} badgeMarkdown - Markdown to place between the markers
 * @returns {{ content: string, updated: boolean }}
 */
function replaceBadge(content, badgeMarkdown) {
  const start = content.indexOf(START_MARKER);
  if (start === -1) {
    return { content, updated: false };
  }

  const end = content.indexOf(END_MARKER, start + START_MARKER.length);
  if (end === -1) {
    return { content, updated: false };
  }

  const before = content.slice(0, start + START_MARKER.length);
  const after = content.slice(end);
  const next = `${before}\n${badgeMarkdown}\n${after}`;

  return { content: next, updated: next !== content };
}

/**
 * Update the badge inside a file in place.
 *
 * @param {string} filePath
 * @param {string} badgeMarkdown
 * @returns {{ ok: boolean, changed: boolean, reason?: string }}
 */
function updateBadgeInFile(filePath, badgeMarkdown) {
  if (!fs.existsSync(filePath)) {
    return { ok: false, changed: false, reason: `file not found: ${filePath}` };
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const { content: next, updated } = replaceBadge(content, badgeMarkdown);

  if (!content.includes(START_MARKER) || !content.includes(END_MARKER)) {
    return {
      ok: false,
      changed: false,
      reason: `markers not found. Add "${START_MARKER}" and "${END_MARKER}" around the badge`,
    };
  }

  if (updated) {
    fs.writeFileSync(filePath, next);
  }

  return { ok: true, changed: updated };
}

module.exports = {
  START_MARKER,
  END_MARKER,
  replaceBadge,
  updateBadgeInFile,
};
