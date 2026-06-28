const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const { calculateVibeIndex, getColorForIndex, getDescriptionForIndex } = require('../src/calculator');
const { generateBadgeUrl, generateBadgeMarkdown } = require('../src/badge');
const { analyzeRepository, classifyCommit, buildMatchers } = require('../src/analyzer');
const { replaceBadge, START_MARKER, END_MARKER } = require('../src/updater');
const {
  validateCommitsCount,
  validateCoAuthorMultiplier,
  validateExtraPatterns,
  validateBadgeStyle,
  validateBadgeColor,
  validateAssertIndex,
  validateUpdateFiles,
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

test('markdown image, with and without link', () => {
  assert.strictEqual(generateBadgeMarkdown('U', 'Alt'), '![Alt](U)');
  assert.strictEqual(generateBadgeMarkdown('U', 'Alt', 'L'), '[![Alt](U)](L)');
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

const NEW_BADGE = '![Vibe Index](https://img.shields.io/static/v1?label=Vibe%20Index&message=6.9%2F10.0&color=3498db&style=flat-square)';

test('replaces only content between markers', () => {
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
  assert.ok(content.includes(NEW_BADGE), 'new badge inserted');
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

test('inline markers keep a row of badges on one line', () => {
  const doc = `![build](b.svg) ${START_MARKER}![old](old.svg)${END_MARKER} ![license](l.svg)`;
  const { content, updated } = replaceBadge(doc, NEW_BADGE);
  assert.strictEqual(updated, true);
  assert.ok(!content.includes('\n'), 'no newline introduced into the row');
  assert.strictEqual(
    content,
    `![build](b.svg) ${START_MARKER}${NEW_BADGE}${END_MARKER} ![license](l.svg)`
  );
});

test('block markers keep the badge on its own line', () => {
  const doc = `# t\n${START_MARKER}\n![old](old.svg)\n${END_MARKER}\ntext`;
  const { content } = replaceBadge(doc, NEW_BADGE);
  assert.ok(content.includes(`${START_MARKER}\n${NEW_BADGE}\n${END_MARKER}`), 'badge stays on its own line');
});

console.log('validation');

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
    assertIndex: '',
    badgeOutputFile: 'badge-url.txt',
    updateFiles: 'README.md, CONTRIBUTING.md',
    includeMessage: 'Vibe Index',
  });
  assert.strictEqual(result.success, true);
  assert.strictEqual(result.validated.badgeOutputFile, 'badge-url.txt');
  assert.strictEqual(result.validated.badgeLogo, 'github');
  assert.strictEqual(result.validated.extraPatterns.length, 1);
  assert.ok(result.validated.extraPatterns[0] instanceof RegExp);
  assert.deepStrictEqual(result.validated.updateFiles, ['README.md', 'CONTRIBUTING.md']);
});

console.log('integration (action entry point)');

test('badge is updated even when the assertion fails', () => {
  const repoRoot = path.join(__dirname, '..');
  const tmpFile = path.join(__dirname, '.tmp-assert-target.md');
  const placeholder = '![Vibe Index](https://img.shields.io/static/v1?label=Vibe%20Index&message=PLACEHOLDER&color=lightgrey)';
  fs.writeFileSync(tmpFile, `# Tmp\n${START_MARKER}\n${placeholder}\n${END_MARKER}\n`);

  let status = 0;
  try {
    // assert-index 10.0-10.0 fails for any repo that isn't 100% human, which
    // forces the failure path; the badge must still be written first.
    execFileSync('node', ['src/index.js'], {
      cwd: repoRoot,
      env: {
        ...process.env,
        'INPUT_COMMITS-COUNT': '50',
        'INPUT_ASSERT-INDEX': '10.0-10.0',
        'INPUT_UPDATE-FILES': tmpFile,
      },
      stdio: 'ignore',
    });
  } catch (err) {
    status = err.status;
  }

  try {
    const content = fs.readFileSync(tmpFile, 'utf-8');
    assert.strictEqual(status, 1, 'action should fail the assertion (exit 1)');
    assert.ok(!content.includes('PLACEHOLDER'), 'badge was updated despite the failure');
    assert.ok(content.includes('shields.io/static/v1'), 'a real badge URL is present');
  } finally {
    fs.unlinkSync(tmpFile);
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
