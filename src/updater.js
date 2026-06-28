const fs = require('fs');

const START_MARKER = '<!-- vibe-index:start -->';
const END_MARKER = '<!-- vibe-index:end -->';

// Badge discovery modes (see the `badge-discovery` input).
const DISCOVERY = {
  AUTO: 'auto',       // markers first, then an existing ![label](...) image
  MARKERS: 'markers', // only the <!-- vibe-index:start/end --> markers
  MARKDOWN: 'markdown', // only an existing ![label](...) image
};

/**
 * Replace the content between the Vibe Index markers with fresh badge markdown.
 *
 * Uses literal string search (not regex/sed) so that ampersands, slashes and
 * other special characters in the badge URL are inserted verbatim, and only
 * the single marked region is touched.
 *
 * @param {string} content
 * @param {string} badgeMarkdown
 * @returns {{ content: string, updated: boolean, found: boolean }}
 */
function replaceByMarkers(content, badgeMarkdown) {
  const start = content.indexOf(START_MARKER);
  if (start === -1) {
    return { content, updated: false, found: false };
  }

  const end = content.indexOf(END_MARKER, start + START_MARKER.length);
  if (end === -1) {
    return { content, updated: false, found: false };
  }

  const before = content.slice(0, start + START_MARKER.length);
  const after = content.slice(end);

  // GitHub (CommonMark) treats a line that *starts* with `<!--` as a raw HTML
  // block, so markdown placed inline right after a leading marker is NOT
  // rendered. So: when the start marker begins its own line, put the badge on
  // its own line (a block, which renders). When something precedes the marker
  // on the line (e.g. a row of badges), keep it inline — there the line does
  // not start with `<!--`, so the image renders fine and the row is preserved.
  const lineStart = content.lastIndexOf('\n', start - 1) + 1;
  const startsLine = content.slice(lineStart, start).trim() === '';
  const next = startsLine
    ? `${before}\n${badgeMarkdown}\n${after}`
    : `${before}${badgeMarkdown}${after}`;

  return { content: next, updated: next !== content, found: true };
}

/**
 * Replace an existing badge written as markdown — `![<label>](...)`, optionally
 * wrapped in a link `[![<label>](...)](...)` — with fresh badge markdown. The
 * label to look for is taken from the new badge's own alt text, so a custom
 * `include-message` is matched automatically. Only the first match is replaced.
 *
 * @param {string} content
 * @param {string} badgeMarkdown
 * @returns {{ content: string, updated: boolean, found: boolean }}
 */
function replaceByMarkdown(content, badgeMarkdown) {
  const altMatch = badgeMarkdown.match(/!\[([^\]]*)\]/);
  if (!altMatch) {
    return { content, updated: false, found: false };
  }
  const alt = altMatch[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Link-wrapped form first (longer match), then the bare image.
  const pattern = new RegExp(
    `\\[!\\[${alt}\\]\\([^)]*\\)\\]\\([^)]*\\)|!\\[${alt}\\]\\([^)]*\\)`
  );
  if (!pattern.test(content)) {
    return { content, updated: false, found: false };
  }

  // Function replacer so `$` in the badge markdown is inserted literally.
  const next = content.replace(pattern, () => badgeMarkdown);
  return { content: next, updated: next !== content, found: true };
}

/**
 * Find and replace the badge using the requested discovery mode.
 *
 * @param {string} content
 * @param {string} badgeMarkdown
 * @param {'auto'|'markers'|'markdown'} [discovery]
 * @returns {{ content: string, updated: boolean, found: boolean }}
 */
function replaceBadge(content, badgeMarkdown, discovery = DISCOVERY.AUTO) {
  if (discovery === DISCOVERY.MARKERS) {
    return replaceByMarkers(content, badgeMarkdown);
  }
  if (discovery === DISCOVERY.MARKDOWN) {
    return replaceByMarkdown(content, badgeMarkdown);
  }

  // auto: prefer the explicit markers, fall back to an existing markdown badge.
  const byMarkers = replaceByMarkers(content, badgeMarkdown);
  if (byMarkers.found) {
    return byMarkers;
  }
  return replaceByMarkdown(content, badgeMarkdown);
}

/**
 * Update the badge inside a file in place.
 *
 * @param {string} filePath
 * @param {string} badgeMarkdown
 * @param {'auto'|'markers'|'markdown'} [discovery]
 * @returns {{ ok: boolean, changed: boolean, reason?: string }}
 */
function updateBadgeInFile(filePath, badgeMarkdown, discovery = DISCOVERY.AUTO) {
  if (!fs.existsSync(filePath)) {
    return { ok: false, changed: false, reason: `file not found: ${filePath}` };
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const { content: next, updated, found } = replaceBadge(content, badgeMarkdown, discovery);

  if (!found) {
    const what =
      discovery === DISCOVERY.MARKERS
        ? `the "${START_MARKER}" / "${END_MARKER}" markers`
        : discovery === DISCOVERY.MARKDOWN
          ? 'an existing "![Vibe Index](...)" badge'
          : 'markers or an existing "![Vibe Index](...)" badge';
    return { ok: false, changed: false, reason: `${what} not found` };
  }

  if (updated) {
    fs.writeFileSync(filePath, next);
  }

  return { ok: true, changed: updated };
}

module.exports = {
  START_MARKER,
  END_MARKER,
  DISCOVERY,
  replaceByMarkers,
  replaceByMarkdown,
  replaceBadge,
  updateBadgeInFile,
};
