const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const { calculateVibeIndex, getColorForIndex, getDescriptionForIndex } = require('../src/calculator');
const { generateBadgeUrl, generateBadgeMarkdown, generateBadgeHtml, resolveLogo } = require('../src/badge');
const { analyzeRepository, classifyCommit, buildMatchers, isShallowRepository } = require('../src/analyzer');
const { replaceBadge, START_MARKER, END_MARKER } = require('../src/updater');
const { commitChanges } = require('../src/committer');
const { normalizeRepoUrl, authenticateUrl } = require('../src/repo');
const {
  validateCommitsCount,
  validateCoAuthorMultiplier,
  validateExtraPatterns,
  validateBadgeStyle,
  validateBadgeColor,
  validateAssertIndex,
  validateUpdateFiles,
  validateBoolean,
  validateBadgeDiscovery,
  validateAllInputs,
} = require('../src/validation');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ok   ${name}`);
  } catch (error) {
    failed++;
    console.error(`  FAIL ${name}`);
    console.error(`       ${error.message}`);
  }
}

function approx(actual, expected, name) {
  assert.ok(Math.abs(actual - expected) < 1e-9, `${name}: expected ${expected}, got ${actual}`);
}

// Built-in signatures only (no user extras).
const matchers = buildMatchers();

const HUMAN = 'Alexei Gagarin <alexei.gagarin@example.com>';

console.log('calculator');

test('100% human -> 0.0 (AI-less)', () => {
  const { vibeIndex } = calculateVibeIndex({
    humanPercentage: 100,
    aiPercentage: 0,
    humanCommitsPercentage: 100,
    aiCommitsPercentage: 0,
  });
  approx(vibeIndex, 0, 'vibeIndex');
});

test('100% AI -> 10.0 (max vibe)', () => {
  const { vibeIndex } = calculateVibeIndex({
    humanPercentage: 0,
    aiPercentage: 100,
    humanCommitsPercentage: 0,
    aiCommitsPercentage: 100,
  });
  approx(vibeIndex, 10, 'vibeIndex');
});

test('50/50 -> 5.0', () => {
  const { vibeIndex } = calculateVibeIndex({
    humanPercentage: 50,
    aiPercentage: 50,
    humanCommitsPercentage: 50,
    aiCommitsPercentage: 50,
  });
  approx(vibeIndex, 5, 'vibeIndex');
});

test('weighting 60/40 (ai code 20%, ai commits 70%)', () => {
  const { vibeIndex } = calculateVibeIndex({
    humanPercentage: 80,
    aiPercentage: 20,
    humanCommitsPercentage: 30,
    aiCommitsPercentage: 70,
  });
  // 0.2 * 0.6 + 0.7 * 0.4 = 0.4 -> 4.0
  approx(vibeIndex, 4, 'vibeIndex');
});

test('vibeIndex stays within 0..10 across the full ai-share grid', () => {
  for (let code = 0; code <= 100; code += 5) {
    for (let commits = 0; commits <= 100; commits += 5) {
      const { vibeIndex } = calculateVibeIndex({
        humanPercentage: 100 - code,
        aiPercentage: code,
        humanCommitsPercentage: 100 - commits,
        aiCommitsPercentage: commits,
      });
      assert.ok(vibeIndex >= 0 && vibeIndex <= 10, `code=${code} commits=${commits} -> ${vibeIndex}`);
    }
  }
});

test('vibeIndex clamps even on out-of-range inputs', () => {
  assert.strictEqual(calculateVibeIndex({ aiPercentage: 150, aiCommitsPercentage: 150 }).vibeIndex, 10);
  assert.strictEqual(calculateVibeIndex({ aiPercentage: -50, aiCommitsPercentage: -50 }).vibeIndex, 0);
});

test('color is interpolated along the green->purple gradient', () => {
  // Exact gradient stops at 0, 2.5, 5, 7.5, 10.
  assert.strictEqual(getColorForIndex(0), '27ae60');   // green (hand-crafted)
  assert.strictEqual(getColorForIndex(2.5), '1abc9c'); // teal
  assert.strictEqual(getColorForIndex(5), '3498db');   // blue
  assert.strictEqual(getColorForIndex(7.5), '6c5ce7'); // indigo
  assert.strictEqual(getColorForIndex(10), '8a2be2');  // festive purple

  // Between stops it blends: index 1.25 sits between green and teal.
  const mid = getColorForIndex(1.25);
  assert.ok(/^[0-9a-f]{6}$/.test(mid), 'returns 6-digit lowercase hex');
  assert.notStrictEqual(mid, '27ae60');
  assert.notStrictEqual(mid, '1abc9c');

  // Out-of-range clamps to the ends.
  assert.strictEqual(getColorForIndex(-5), '27ae60');
  assert.strictEqual(getColorForIndex(99), '8a2be2');
});

test('color is quantized to the displayed 0.1 step (no churn at equal scores)', () => {
  // Two raw indices that round to the same shown number must share a color, so
  // the badge isn't repainted while the number reads identical.
  assert.strictEqual(getColorForIndex(7.41), getColorForIndex(7.4));
  assert.strictEqual(getColorForIndex(7.449), getColorForIndex(7.4));
  // A different shown number gets a different color.
  assert.notStrictEqual(getColorForIndex(7.4), getColorForIndex(7.5));
});

test('description by score (higher = more AI)', () => {
  assert.strictEqual(getDescriptionForIndex(9), 'AI-Heavy');
  assert.strictEqual(getDescriptionForIndex(0), 'Hand-Crafted');
});

console.log('badge');

test('badge URL uses static/v1 with encoded params', () => {
  const url = generateBadgeUrl({
    label: 'Vibe Index',
    message: '8.5/10.0',
    style: 'flat-square',
    color: '27ae60',
  });
  assert.ok(url.startsWith('https://img.shields.io/static/v1?'), 'base URL');
  assert.ok(url.includes('label=Vibe+Index') || url.includes('label=Vibe%20Index'), 'label encoded');
  assert.ok(url.includes('message=8.5%2F10.0'), 'slash in message encoded');
  assert.ok(url.includes('color=27ae60'), 'color present');
  assert.ok(url.includes('style=flat-square'), 'style present');
});

test('badge URL includes logo when provided', () => {
  const url = generateBadgeUrl({ label: 'X', message: 'Y', logo: 'github' });
  assert.ok(url.includes('logo=github'), 'logo present');
});

test('built-in "sparkles" logo resolves to an SVG data URI', () => {
  const resolved = resolveLogo('sparkles');
  assert.ok(resolved.startsWith('data:image/svg+xml;base64,'), 'data URI');
  const svg = Buffer.from(resolved.split(',')[1], 'base64').toString('utf-8');
  assert.ok(svg.includes('<svg') && svg.includes('<path'), 'decodes back to SVG');

  // case-insensitive; other values pass through as slugs.
  assert.strictEqual(resolveLogo('SPARKLES'), resolved);
  assert.strictEqual(resolveLogo('github'), 'github');
  assert.strictEqual(resolveLogo(''), '');

  const url = generateBadgeUrl({ label: 'X', message: 'Y', logo: 'sparkles' });
  assert.ok(url.includes('logo=data%3Aimage%2Fsvg'), 'data URI is URL-encoded in the badge URL');
});

test('markdown image, with and without link', () => {
  assert.strictEqual(generateBadgeMarkdown('U', 'Alt'), '![Alt](U)');
  assert.strictEqual(generateBadgeMarkdown('U', 'Alt', 'L'), '[![Alt](U)](L)');
});

test('html image, with and without link', () => {
  assert.strictEqual(generateBadgeHtml('U', 'Alt'), '<img src="U" alt="Alt" />');
  assert.strictEqual(generateBadgeHtml('U', 'Alt', 'L'), '<a href="L"><img src="U" alt="Alt" /></a>');
});

console.log('analyzer.classifyCommit (identity-based)');

test('plain human commit', () => {
  const r = classifyCommit({ author: HUMAN, message: 'fix: correct off-by-one', added: 10, removed: 2 }, matchers);
  assert.strictEqual(r.classification, 'human');
  assert.strictEqual(r.lines, 12);
});

test('AI mentioned only in the message does NOT flag a human', () => {
  const r = classifyCommit(
    { author: HUMAN, message: 'refactor GPT prompt handling and the claude adapter', added: 5, removed: 0 },
    matchers
  );
  assert.strictEqual(r.classification, 'human');
});

test('a human merely named like an AI is NOT flagged', () => {
  const r = classifyCommit(
    { author: 'Claude Monet <claude.monet@gmail.com>', message: 'paint', added: 5, removed: 0 },
    matchers
  );
  assert.strictEqual(r.classification, 'human');
});

test('AI as author (vendor email) -> full ai', () => {
  const r = classifyCommit({ author: 'Claude <noreply@anthropic.com>', message: 'gen', added: 5, removed: 0 }, matchers);
  assert.strictEqual(r.classification, 'ai');
});

test('bot account as author -> full ai', () => {
  const r = classifyCommit(
    { author: 'github-actions[bot] <41898282+github-actions[bot]@users.noreply.github.com>', message: 'ci', added: 5, removed: 0 },
    matchers
  );
  assert.strictEqual(r.classification, 'ai');
});

test('co-authored detected from a vendor-email Co-Authored-By trailer', () => {
  const message = 'feat: add feature\n\nCo-Authored-By: Claude <noreply@anthropic.com>';
  const r = classifyCommit({ author: HUMAN, message, added: 5, removed: 0 }, matchers);
  assert.strictEqual(r.classification, 'co-authored');
});

test('human co-author is not treated as AI', () => {
  const message = 'feat: add feature\n\nCo-Authored-By: Jane Doe <jane@example.com>';
  const r = classifyCommit({ author: HUMAN, message, added: 5, removed: 0 }, matchers);
  assert.strictEqual(r.classification, 'human');
});

console.log('bot-signatures (built-in list)');

test('built-in [bot] signature detects app bot co-authors', () => {
  const message = 'chore: bump deps\n\nCo-Authored-By: dependabot[bot] <49699333+dependabot[bot]@users.noreply.github.com>';
  const r = classifyCommit({ author: HUMAN, message, added: 3, removed: 1 }, matchers);
  assert.strictEqual(r.classification, 'co-authored');
});

test('built-in Copilot identity signature', () => {
  const message = 'feat: x\n\nCo-Authored-By: Copilot <198982749+Copilot@users.noreply.github.com>';
  const r = classifyCommit({ author: HUMAN, message, added: 1, removed: 0 }, matchers);
  assert.strictEqual(r.classification, 'co-authored');
});

test('extra-bot-patterns extend the built-in list', () => {
  const author = 'Acme Agent <agent@acme-ai.example>';
  const base = classifyCommit({ author, message: 'work', added: 1, removed: 0 }, matchers);
  assert.strictEqual(base.classification, 'human');

  const extended = buildMatchers([/@acme-ai\.example\b/i]);
  const r = classifyCommit({ author, message: 'work', added: 1, removed: 0 }, extended);
  assert.strictEqual(r.classification, 'ai');
});

console.log('updater.replaceBadge');

// Badge in both forms, as the action now passes it: markers get HTML, an
// existing markdown image is replaced with markdown.
const NEW_URL = 'https://img.shields.io/static/v1?label=Vibe%20Index&message=6.9%2F10.0&color=3498db&style=flat-square';
function badgeForms(url, alt = 'Vibe Index', link = '') {
  return { markdown: generateBadgeMarkdown(url, alt, link), html: generateBadgeHtml(url, alt, link) };
}
const NEW_BADGE = badgeForms(NEW_URL);

test('replaces only content between markers (with HTML)', () => {
  const doc = [
    '# Title',
    START_MARKER,
    '![old](https://img.shields.io/static/v1?label=X&message=1.0&color=red)',
    END_MARKER,
    '',
    '## Examples',
    '![example](https://img.shields.io/static/v1?label=Y&message=2.0&color=blue)',
  ].join('\n');

  const { content, updated } = replaceBadge(doc, NEW_BADGE);
  assert.strictEqual(updated, true);
  assert.ok(content.includes(NEW_BADGE.html), 'new badge inserted as HTML');
  assert.ok(content.includes('<img src='), 'HTML img markup, not markdown');
  assert.ok(!content.includes('message=1.0'), 'old marked badge replaced');
  assert.ok(content.includes('message=2.0'), 'example badge outside markers untouched');
  // Ampersands in the URL survive verbatim (the sed approach mangled them).
  assert.ok(content.includes('&color=3498db'), 'ampersands preserved');
});

test('idempotent on second run', () => {
  const doc = `${START_MARKER}\nold\n${END_MARKER}`;
  const once = replaceBadge(doc, NEW_BADGE).content;
  const twice = replaceBadge(once, NEW_BADGE);
  assert.strictEqual(twice.updated, false);
  assert.strictEqual(twice.content, once);
});

test('no markers -> no change', () => {
  const doc = '# Just a readme without markers';
  const { content, updated } = replaceBadge(doc, NEW_BADGE);
  assert.strictEqual(updated, false);
  assert.strictEqual(content, doc);
});

test('inline markers in a row (content precedes) stay on one line', () => {
  const doc = `![build](b.svg) ${START_MARKER}![old](old.svg)${END_MARKER} ![license](l.svg)`;
  const { content, updated } = replaceBadge(doc, NEW_BADGE);
  assert.strictEqual(updated, true);
  assert.ok(!content.includes('\n'), 'no newline introduced into the row');
  assert.strictEqual(
    content,
    `![build](b.svg) ${START_MARKER}${NEW_BADGE.html}${END_MARKER} ![license](l.svg)`
  );
});

test('marker pair alone on a line becomes a block', () => {
  const doc = `# t\n\n${START_MARKER}${END_MARKER}\n\ntext`;
  const { content, updated } = replaceBadge(doc, NEW_BADGE);
  assert.strictEqual(updated, true);
  assert.ok(content.includes(`${START_MARKER}\n${NEW_BADGE.html}\n${END_MARKER}`), 'badge placed on its own line');
});

test('block markers keep the badge on its own line', () => {
  const doc = `# t\n${START_MARKER}\n![old](old.svg)\n${END_MARKER}\ntext`;
  const { content } = replaceBadge(doc, NEW_BADGE);
  assert.ok(content.includes(`${START_MARKER}\n${NEW_BADGE.html}\n${END_MARKER}`), 'badge stays on its own line');
});

console.log('updater badge-discovery');

test('markdown discovery replaces a bare ![Vibe Index](...) image with markdown', () => {
  const doc = '# t\n\n![Vibe Index](https://img.shields.io/static/v1?label=Vibe+Index&message=1.0&color=red)\n\nx';
  const { content, updated, found } = replaceBadge(doc, NEW_BADGE, 'markdown');
  assert.strictEqual(found, true);
  assert.strictEqual(updated, true);
  assert.ok(content.includes(NEW_BADGE.markdown));
  assert.ok(!content.includes('<img src='), 'markdown discovery keeps markdown, not HTML');
  assert.ok(!content.includes('message=1.0'));
});

test('markdown discovery detects an empty ![Vibe Index]() starter placeholder', () => {
  const doc = '# t\n\n![Vibe Index]()\n\nx';
  const { content, updated, found } = replaceBadge(doc, NEW_BADGE, 'markdown');
  assert.strictEqual(found, true);
  assert.strictEqual(updated, true);
  assert.ok(content.includes(NEW_BADGE.markdown), 'placeholder filled with the real badge');
  assert.ok(!content.includes('![Vibe Index]()'), 'empty placeholder is gone');
});

test('markdown discovery replaces the documented "Indexing Vibe" stub placeholder', () => {
  // The README recommends a non-broken colored stub badge as the placeholder.
  const doc = '# t\n\n![Vibe Index](https://img.shields.io/badge/Indexing%20Vibe-6168e5?style=flat-square)\n\nx';
  const { content, updated, found } = replaceBadge(doc, NEW_BADGE, 'markdown');
  assert.strictEqual(found, true);
  assert.strictEqual(updated, true);
  assert.ok(content.includes(NEW_BADGE.markdown), 'stub filled with the real badge');
  assert.ok(!content.includes('Indexing'), 'stub is gone');
});

test('markdown discovery replaces a link-wrapped badge whole', () => {
  const doc = '[![Vibe Index](https://x/old)](https://old-link)';
  const { content, found } = replaceBadge(doc, NEW_BADGE, 'markdown');
  assert.strictEqual(found, true);
  assert.strictEqual(content, NEW_BADGE.markdown);
});

test('markdown discovery ignores images with a different alt', () => {
  const doc = '![build](b.svg) ![coverage](c.svg)';
  const { updated, found } = replaceBadge(doc, NEW_BADGE, 'markdown');
  assert.strictEqual(found, false);
  assert.strictEqual(updated, false);
});

test('markers mode does not touch a markdown-only badge', () => {
  const doc = '![Vibe Index](old.svg)';
  const { found } = replaceBadge(doc, NEW_BADGE, 'markers');
  assert.strictEqual(found, false);
});

test('link is added around a bare badge when badge-link is set', () => {
  const linked = badgeForms('https://x', 'Vibe Index', 'https://repo');
  // markdown discovery on a bare placeholder -> link-wrapped markdown
  assert.strictEqual(
    replaceBadge('![Vibe Index]()', linked, 'markdown').content,
    '[![Vibe Index](https://x)](https://repo)'
  );
  // markers discovery wraps too, as HTML <a><img>
  assert.ok(
    replaceBadge('<!-- vibe-index:start -->![Vibe Index]()<!-- vibe-index:end -->', linked, 'markers')
      .content.includes('<a href="https://repo"><img src="https://x" alt="Vibe Index" /></a>')
  );
});

test('link is removed around a linked badge when badge-link is empty', () => {
  const bare = badgeForms('https://x', 'Vibe Index', '');
  // markdown discovery on a link-wrapped badge -> bare markdown
  assert.strictEqual(
    replaceBadge('[![Vibe Index](https://o/old)](https://o/lnk)', bare, 'markdown').content,
    '![Vibe Index](https://x)'
  );
  // markers discovery unwraps too: bare <img>, no link
  const unwrapped = replaceBadge(
    '<!-- vibe-index:start -->[![Vibe Index](https://o/old)](https://o/lnk)<!-- vibe-index:end -->',
    bare,
    'markers'
  ).content;
  assert.ok(!unwrapped.includes('https://o/lnk'), 'old link gone');
  assert.ok(!unwrapped.includes('<a '), 'no link wrapper');
  assert.ok(unwrapped.includes('<img src="https://x" alt="Vibe Index" />'), 'bare img');
});

test('auto prefers markers, falls back to markdown', () => {
  // markers present -> use them (HTML)
  const withMarkers = `${START_MARKER}${END_MARKER}\n\n![Vibe Index](old.svg)`;
  const a = replaceBadge(withMarkers, NEW_BADGE, 'auto');
  assert.ok(a.content.includes(`${START_MARKER}\n${NEW_BADGE.html}\n${END_MARKER}`), 'markers win');
  assert.ok(a.content.includes('![Vibe Index](old.svg)'), 'the separate markdown badge is left alone');

  // no markers -> markdown fallback (markdown)
  const mdOnly = '# t\n\n![Vibe Index](old.svg)\n';
  const b = replaceBadge(mdOnly, NEW_BADGE, 'auto');
  assert.strictEqual(b.found, true);
  assert.ok(b.content.includes(NEW_BADGE.markdown));
});

console.log('committer (temp git repo)');

test('commitChanges commits changed files and applies identity (no push)', () => {
  const dir = path.join(os.tmpdir(), 'vibe-commit-test');
  const run = args => execFileSync('git', args, { cwd: dir, encoding: 'utf-8' });
  try {
    fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3 });
    fs.mkdirSync(dir, { recursive: true });
    run(['init', '-q']);
    run(['config', 'user.email', 'init@example.com']);
    run(['config', 'user.name', 'init']);
    fs.writeFileSync(path.join(dir, 'README.md'), 'start');
    run(['add', '-A']);
    run(['commit', '-qm', 'init']);

    // Change the file, then auto-commit it.
    fs.writeFileSync(path.join(dir, 'README.md'), 'changed');
    const res = commitChanges({
      files: ['README.md'],
      message: 'chore: update Vibe Index badge',
      userName: 'github-actions[bot]',
      userEmail: 'bot@example.com',
      push: false,
      cwd: dir,
    });
    assert.strictEqual(res.committed, true);
    assert.strictEqual(res.pushed, false);
    assert.ok(run(['log', '--oneline']).includes('update Vibe Index badge'));
    assert.strictEqual(run(['log', '-1', '--format=%an']).trim(), 'github-actions[bot]');

    // Nothing changed -> no empty commit.
    const res2 = commitChanges({
      files: ['README.md'],
      message: 'noop',
      userName: 'x',
      userEmail: 'x@e',
      push: false,
      cwd: dir,
    });
    assert.strictEqual(res2.committed, false);
  } finally {
    try { fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3 }); } catch (_) { /* ignore */ }
  }
});

console.log('shallow repository detection');

test('isShallowRepository distinguishes a full clone from a --depth=1 fetch', () => {
  const base = path.join(os.tmpdir(), 'vibe-shallow-test');
  const originDir = path.join(base, 'origin');
  const cloneDir = path.join(base, 'clone');
  const git = (dir, args) => execFileSync('git', args, { cwd: dir, encoding: 'utf-8' });
  try {
    fs.rmSync(base, { recursive: true, force: true, maxRetries: 3 });
    fs.mkdirSync(originDir, { recursive: true });

    git(originDir, ['init', '-q']);
    git(originDir, ['config', 'user.email', 'init@example.com']);
    git(originDir, ['config', 'user.name', 'init']);
    for (let i = 1; i <= 4; i++) {
      fs.writeFileSync(path.join(originDir, `f${i}`), String(i));
      git(originDir, ['add', '-A']);
      git(originDir, ['commit', '-qm', `commit ${i}`]);
    }

    // A full clone is not shallow.
    git(base, ['clone', '-q', originDir, cloneDir]);
    assert.strictEqual(isShallowRepository(cloneDir), false, 'full clone is not shallow');

    // A `git fetch --depth=1` re-shallows even a complete clone — the exact
    // footgun that silently understated the Vibe Index to 0.0 in CI.
    git(cloneDir, ['fetch', '-q', '--depth=1', 'origin', 'master']);
    assert.strictEqual(isShallowRepository(cloneDir), true, 'depth-1 fetch makes it shallow');
  } finally {
    try { fs.rmSync(base, { recursive: true, force: true, maxRetries: 3 }); } catch (_) { /* ignore */ }
  }
});

console.log('repo (clone helpers)');

test('normalizeRepoUrl expands owner/repo shorthand, leaves URLs alone', () => {
  assert.strictEqual(normalizeRepoUrl('octocat/Hello-World'), 'https://github.com/octocat/Hello-World.git');
  assert.strictEqual(normalizeRepoUrl('  facebook/react  '), 'https://github.com/facebook/react.git');
  assert.strictEqual(normalizeRepoUrl('https://gitlab.com/g/p.git'), 'https://gitlab.com/g/p.git');
  assert.strictEqual(normalizeRepoUrl('git@github.com:o/r.git'), 'git@github.com:o/r.git');
  // a local absolute path is not "owner/repo" shaped -> left untouched
  assert.strictEqual(normalizeRepoUrl('/tmp/some/repo'), '/tmp/some/repo');
});

test('authenticateUrl injects a token into https only, no-op otherwise', () => {
  assert.strictEqual(
    authenticateUrl('https://github.com/o/r.git', 'secret'),
    'https://x-access-token:secret@github.com/o/r.git'
  );
  // no token -> unchanged
  assert.strictEqual(authenticateUrl('https://github.com/o/r.git'), 'https://github.com/o/r.git');
  // ssh / scp-like is left untouched even with a token
  assert.strictEqual(authenticateUrl('git@github.com:o/r.git', 'secret'), 'git@github.com:o/r.git');
});

console.log('validation');

test('validateAllInputs parses the fetch-mode inputs', () => {
  const result = validateAllInputs({
    commitsCount: '10',
    coAuthorMultiplier: '0.8',
    extraPatterns: '',
    badgeStyle: 'flat-square',
    badgeColor: 'auto',
    includeMessage: 'Vibe Index',
    fetch: 'true',
    repository: 'octocat/Hello-World',
    ref: 'main',
    token: 'abc',
  });
  assert.strictEqual(result.success, true);
  assert.strictEqual(result.validated.fetch, true);
  assert.strictEqual(result.validated.repository, 'octocat/Hello-World');
  assert.strictEqual(result.validated.ref, 'main');
  assert.strictEqual(result.validated.token, 'abc');
});

test('fetch-mode inputs default to off / empty', () => {
  const result = validateAllInputs({
    commitsCount: '10', coAuthorMultiplier: '0.8', extraPatterns: '',
    badgeStyle: 'flat-square', badgeColor: 'auto', includeMessage: 'Vibe Index',
  });
  assert.strictEqual(result.success, true);
  assert.strictEqual(result.validated.fetch, false);
  assert.strictEqual(result.validated.repository, '');
  assert.strictEqual(result.validated.ref, '');
  assert.strictEqual(result.validated.token, '');
});

test('badge-discovery enum (default auto)', () => {
  assert.strictEqual(validateBadgeDiscovery(''), 'auto');
  assert.strictEqual(validateBadgeDiscovery(undefined), 'auto');
  assert.strictEqual(validateBadgeDiscovery('MARKERS'), 'markers');
  assert.strictEqual(validateBadgeDiscovery('markdown'), 'markdown');
  assert.throws(() => validateBadgeDiscovery('xml'));
});

test('boolean parsing', () => {
  assert.strictEqual(validateBoolean('commit', 'true'), true);
  assert.strictEqual(validateBoolean('commit', 'FALSE'), false);
  assert.strictEqual(validateBoolean('commit', ''), false);
  assert.strictEqual(validateBoolean('commit', undefined), false);
  assert.throws(() => validateBoolean('commit', 'yes'));
});

test('commits-count parsing and bounds', () => {
  assert.strictEqual(validateCommitsCount('500'), 500);
  assert.throws(() => validateCommitsCount('0'));
  assert.throws(() => validateCommitsCount('abc'));
});

test('co-author-multiplier bounds', () => {
  assert.strictEqual(validateCoAuthorMultiplier('0.5'), 0.5);
  assert.throws(() => validateCoAuthorMultiplier('1.5'));
  assert.throws(() => validateCoAuthorMultiplier('-0.1'));
});

test('extra-bot-patterns: one regex per line, compiled', () => {
  const result = validateExtraPatterns('@acme\\.com\nFooBot\\[bot\\]');
  assert.strictEqual(result.length, 2);
  assert.ok(result[0] instanceof RegExp);
  assert.ok(result[0].test('x <dev@acme.com>'));
  assert.ok(result[1].test('FooBot[bot] <a@b>'));
});

test('extra-bot-patterns: empty is allowed', () => {
  assert.deepStrictEqual(validateExtraPatterns(''), []);
  assert.deepStrictEqual(validateExtraPatterns('\n  \n'), []);
});

test('extra-bot-patterns: invalid regex throws', () => {
  assert.throws(() => validateExtraPatterns('valid\n([unclosed'), /invalid regular expression/i);
});

test('badge-style allow-list', () => {
  assert.strictEqual(validateBadgeStyle('for-the-badge'), 'for-the-badge');
  assert.throws(() => validateBadgeStyle('rounded'));
});

test('badge-color auto, hex and named', () => {
  assert.strictEqual(validateBadgeColor('auto'), 'auto');
  assert.strictEqual(validateBadgeColor('AUTO'), 'auto');
  assert.strictEqual(validateBadgeColor('27ae60'), '27ae60');
  assert.strictEqual(validateBadgeColor('blue'), 'blue');
  assert.throws(() => validateBadgeColor('#27ae60'));
  assert.throws(() => validateBadgeColor('notacolor'));
});

test('assert-index parsing', () => {
  assert.deepStrictEqual(validateAssertIndex('6.0-10.0'), { min: 6, max: 10 });
  assert.strictEqual(validateAssertIndex(''), null);
  assert.throws(() => validateAssertIndex('10-6'));
  assert.throws(() => validateAssertIndex('0-11'));
});

test('update-files parsing (comma and newline separated)', () => {
  assert.deepStrictEqual(validateUpdateFiles('README.md'), ['README.md']);
  assert.deepStrictEqual(validateUpdateFiles('README.md, docs/index.md'), ['README.md', 'docs/index.md']);
  assert.deepStrictEqual(validateUpdateFiles('a.md\n b.md \n'), ['a.md', 'b.md']);
  assert.deepStrictEqual(validateUpdateFiles(''), []);
  assert.deepStrictEqual(validateUpdateFiles(' , '), []);
});

test('validateAllInputs passes through badge-output-file (regression)', () => {
  const result = validateAllInputs({
    commitsCount: '10',
    coAuthorMultiplier: '0.5',
    extraPatterns: '@acme\\.com',
    badgeStyle: 'flat',
    badgeColor: 'blue',
    badgeLogo: 'github',
    badgeLink: 'https://example.com/vibe',
    assertIndex: '',
    badgeOutputFile: 'badge-url.txt',
    updateFiles: 'README.md, CONTRIBUTING.md',
    includeMessage: 'Vibe Index',
  });
  assert.strictEqual(result.success, true);
  assert.strictEqual(result.validated.badgeOutputFile, 'badge-url.txt');
  assert.strictEqual(result.validated.badgeLogo, 'github');
  assert.strictEqual(result.validated.badgeLink, 'https://example.com/vibe');
  assert.strictEqual(result.validated.badgeDiscovery, 'auto');
  assert.strictEqual(result.validated.extraPatterns.length, 1);
  assert.ok(result.validated.extraPatterns[0] instanceof RegExp);
  assert.deepStrictEqual(result.validated.updateFiles, ['README.md', 'CONTRIBUTING.md']);
  // commit options default off / to sane values when omitted
  assert.strictEqual(result.validated.commit, false);
  assert.strictEqual(result.validated.push, false);
  assert.strictEqual(result.validated.commitMessage, 'chore: update Vibe Index badge');
  assert.strictEqual(result.validated.commitUserName, 'github-actions[bot]');
});

console.log('integration (action entry point)');

test('badge is updated even when the assertion fails', () => {
  const indexJs = path.join(__dirname, '..', 'src', 'index.js');
  const dir = path.join(os.tmpdir(), 'vibe-assert-test');
  const git = args => execFileSync('git', args, { cwd: dir, encoding: 'utf-8' });
  const target = 'BADGE.md';
  const placeholder = '![Vibe Index](https://img.shields.io/static/v1?label=Vibe%20Index&message=PLACEHOLDER&color=lightgrey)';
  try {
    fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3 });
    fs.mkdirSync(dir, { recursive: true });

    // A deterministic repo: a single human-authored commit -> Vibe Index 0.0,
    // so the 10.0-10.0 assertion always fails. (Running against this project's
    // own live history made the test flaky — its score drifts with each commit
    // and could land exactly on 10.0, which would *pass* the assertion.)
    git(['init', '-q']);
    git(['config', 'user.email', 'human@example.com']);
    git(['config', 'user.name', 'Test Human']);
    fs.writeFileSync(path.join(dir, 'code.txt'), 'a\nb\nc\n');
    fs.writeFileSync(path.join(dir, target), `# Tmp\n${START_MARKER}\n${placeholder}\n${END_MARKER}\n`);
    git(['add', '-A']);
    git(['commit', '-qm', 'init']);

    let status = 0;
    try {
      // The badge must still be written before the assertion fails the run.
      execFileSync('node', [indexJs], {
        cwd: dir,
        env: {
          ...process.env,
          'INPUT_COMMITS-COUNT': '50',
          'INPUT_ASSERT-INDEX': '10.0-10.0',
          'INPUT_UPDATE-FILES': target,
        },
        stdio: 'ignore',
      });
    } catch (err) {
      status = err.status;
    }

    const content = fs.readFileSync(path.join(dir, target), 'utf-8');
    assert.strictEqual(status, 1, 'action should fail the assertion (exit 1)');
    assert.ok(!content.includes('PLACEHOLDER'), 'badge was updated despite the failure');
    assert.ok(content.includes('shields.io/static/v1'), 'a real badge URL is present');
    assert.ok(content.includes('<img src='), 'markers path writes HTML');
  } finally {
    try { fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3 }); } catch (_) { /* ignore */ }
  }
});

async function testAsync(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ok   ${name}`);
  } catch (error) {
    failed++;
    console.error(`  FAIL ${name}`);
    console.error(`       ${error.message}`);
  }
}

(async () => {
  console.log('analyzer cwd (temp repo)');

  await testAsync('analyzeRepository honors the cwd option (analyzes the temp repo, not this project)', async () => {
    const dir = path.join(os.tmpdir(), 'vibe-cwd-test');
    const git = args => execFileSync('git', args, { cwd: dir, encoding: 'utf-8' });
    try {
      fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3 });
      fs.mkdirSync(dir, { recursive: true });
      git(['init', '-q']);
      git(['config', 'user.email', 'human@example.com']);
      git(['config', 'user.name', 'Test Human']);
      fs.writeFileSync(path.join(dir, 'a.txt'), 'x\ny\n');
      git(['add', '-A']);
      git(['commit', '-qm', 'only commit']);

      const analysis = await analyzeRepository({
        commitsCount: 50, coAuthorMultiplier: 0.8, extraPatterns: [], cwd: dir,
      });
      // If cwd were ignored, it would analyze this AI-heavy project instead.
      assert.strictEqual(analysis.totalCommits, 1, 'sees exactly the temp repo single commit');
      assert.strictEqual(analysis.humanPercentage, 100);
      assert.strictEqual(analysis.aiPercentage, 0);
    } finally {
      try { fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3 }); } catch (_) { /* ignore */ }
    }
  });

  console.log('property: index within bounds for any co-author-multiplier (real repo)');

  await testAsync('vibeIndex in [0,10] and shares in [0,100] across multipliers 0..1', async () => {
    for (const multiplier of [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1]) {
      const analysis = await analyzeRepository({
        commitsCount: 80,
        coAuthorMultiplier: multiplier,
        extraPatterns: [],
      });
      const { vibeIndex } = calculateVibeIndex(analysis);

      assert.ok(
        vibeIndex >= 0 && vibeIndex <= 10,
        `multiplier ${multiplier}: vibeIndex ${vibeIndex} out of [0,10]`
      );
      for (const key of ['humanPercentage', 'aiPercentage', 'humanCommitsPercentage', 'aiCommitsPercentage']) {
        assert.ok(
          analysis[key] >= 0 && analysis[key] <= 100,
          `multiplier ${multiplier}: ${key}=${analysis[key]} out of [0,100]`
        );
      }
      // human + AI shares must add up to 100% (no double counting / leakage).
      assert.ok(Math.abs(analysis.humanPercentage + analysis.aiPercentage - 100) < 1e-6 || analysis.totalLinesChanged === 0);
      assert.ok(Math.abs(analysis.humanCommitsPercentage + analysis.aiCommitsPercentage - 100) < 1e-6 || analysis.totalCommits === 0);
    }
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  }
})();
