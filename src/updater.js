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
 * Replace the content between the Vibe Index markers with fresh badge HTML.
 *
 * HTML (not markdown) is emitted here: the markers themselves are HTML comments,
 * so a line that *starts* with `<!--` is a raw HTML block on GitHub, where an
 * inline markdown image would not render — an `<img>`/`<a>` always does, inline
 * or block. Uses literal string search (not regex/sed) so ampersands, slashes
 * and other special characters in the badge URL are inserted verbatim, and only
 * the single marked region is touched.
 *
 * @param {string} content
 * @param {string} badgeHtml
 * @returns {{ content: string, updated: boolean, found: boolean }}
 */
function replaceByMarkers(content, badgeHtml) {
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

  // Layout follows the markers: when the start marker begins its own line, put
  // the badge on its own line for a tidy block; when something precedes the
  // marker (e.g. a row of badges), keep it inline so the row is preserved.
  const lineStart = content.lastIndexOf('\n', start - 1) + 1;
  const startsLine = content.slice(lineStart, start).trim() === '';
  const next = startsLine
    ? `${before}\n${badgeHtml}\n${after}`
    : `${before}${badgeHtml}${after}`;

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
 * Find and replace the badge using the requested discovery mode. The badge is
 * passed in both forms so each path emits the right one: markers get HTML, an
 * existing markdown image is replaced with markdown.
 *
 * @param {string} content
 * @param {{ markdown: string, html: string }} badge
 * @param {'auto'|'markers'|'markdown'} [discovery]
 * @returns {{ content: string, updated: boolean, found: boolean }}
 */
function replaceBadge(content, badge, discovery = DISCOVERY.AUTO) {
  if (discovery === DISCOVERY.MARKERS) {
    return replaceByMarkers(content, badge.html);
  }
  if (discovery === DISCOVERY.MARKDOWN) {
    return replaceByMarkdown(content, badge.markdown);
  }

  // auto: prefer the explicit markers (HTML), fall back to an existing markdown
  // badge (markdown).
  const byMarkers = replaceByMarkers(content, badge.html);
  if (byMarkers.found) {
    return byMarkers;
  }
  return replaceByMarkdown(content, badge.markdown);
}

/**
 * Update the badge inside a file in place.
 *
 * @param {string} filePath
 * @param {{ markdown: string, html: string }} badge
 * @param {'auto'|'markers'|'markdown'} [discovery]
 * @returns {{ ok: boolean, changed: boolean, reason?: string }}
 */
function updateBadgeInFile(filePath, badge, discovery = DISCOVERY.AUTO) {
  if (!fs.existsSync(filePath)) {
    return { ok: false, changed: false, reason: `file not found: ${filePath}` };
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const { content: next, updated, found } = replaceBadge(content, badge, discovery);

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
