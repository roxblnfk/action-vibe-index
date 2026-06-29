#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');

const { analyzeRepository, isShallowRepository } = require('../src/analyzer');
const { calculateVibeIndex, getColorForIndex, getDescriptionForIndex } = require('../src/calculator');
const { generateBadgeUrl, generateBadgeMarkdown } = require('../src/badge');
const { validateExtraPatterns } = require('../src/validation');
const { cloneRepository } = require('../src/repo');

const pkg = require('../package.json');

const HELP = `vibe-index — measure the ratio of human-written vs AI-generated code

Usage:
  npx ${pkg.name} [source] [options]

Source:
  A repository to analyze. One of:
    .                       the current directory (default)
    /path/to/repo           a local git repository
    owner/repo              a GitHub shorthand (cloned to a temp dir)
    https://host/owner/repo  any git URL (cloned to a temp dir)
  Remote sources are cloned shallowly to a temp dir and removed afterwards.

Options:
  -c, --commits <n>              commits to analyze (default: 250)
  -m, --co-author-multiplier <f> AI share of a co-authored commit, 0..1 (default: 0.8)
  -p, --extra-bot-patterns <re>  extra identity regex (repeatable)
      --ref <branch>             branch/tag to clone (remote sources)
      --depth <n>                clone depth (remote sources; default: commits + 50)
      --token <token>            token for private https clones
                                 (default: $GITHUB_TOKEN / $GH_TOKEN)
      --json                     print the result as JSON
      --badge                    also print the shields.io badge URL & markdown
      --no-clean                 keep the temp clone (debug)
  -h, --help                     show this help
  -v, --version                  show the version

Examples:
  npx ${pkg.name}                         # score the current repo
  npx ${pkg.name} facebook/react --badge  # score a GitHub repo, print badge
  npx ${pkg.name} . --commits 500 --json
`;

function fail(message) {
  process.stderr.write(`Error: ${message}\n`);
  process.exit(1);
}

function parseArgs(argv) {
  const opts = {
    source: '',
    commits: 250,
    coAuthorMultiplier: 0.8,
    extraPatterns: [],
    ref: '',
    depth: null,
    token: process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '',
    json: false,
    badge: false,
    clean: true,
  };

  const need = (flag, value) => {
    if (value === undefined) {
      fail(`${flag} requires a value`);
    }
    return value;
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case '-h': case '--help':
        process.stdout.write(HELP);
        process.exit(0);
        break;
      case '-v': case '--version':
        process.stdout.write(`${pkg.version}\n`);
        process.exit(0);
        break;
      case '-c': case '--commits':
        opts.commits = parseInt(need(arg, argv[++i]), 10);
        break;
      case '-m': case '--co-author-multiplier':
        opts.coAuthorMultiplier = parseFloat(need(arg, argv[++i]));
        break;
      case '-p': case '--extra-bot-patterns':
        opts.extraPatterns.push(need(arg, argv[++i]));
        break;
      case '--ref':
        opts.ref = need(arg, argv[++i]);
        break;
      case '--depth':
        opts.depth = parseInt(need(arg, argv[++i]), 10);
        break;
      case '--token':
        opts.token = need(arg, argv[++i]);
        break;
      case '--json':
        opts.json = true;
        break;
      case '--badge':
        opts.badge = true;
        break;
      case '--no-clean':
        opts.clean = false;
        break;
      default:
        if (arg.startsWith('-')) {
          fail(`unknown option: ${arg}`);
        }
        if (opts.source) {
          fail(`unexpected extra argument: ${arg}`);
        }
        opts.source = arg;
    }
  }

  if (!Number.isInteger(opts.commits) || opts.commits < 1) {
    fail('--commits must be a positive integer');
  }
  if (isNaN(opts.coAuthorMultiplier) || opts.coAuthorMultiplier < 0 || opts.coAuthorMultiplier > 1) {
    fail('--co-author-multiplier must be a number between 0 and 1');
  }

  return opts;
}

/**
 * Decide whether the source is a local directory (analyze in place) or a
 * remote repo (clone to temp). A path that exists on disk wins; everything
 * else ("owner/repo", a URL) is treated as remote.
 */
function isLocalSource(source) {
  if (!source || source === '.') {
    return true;
  }
  try {
    return fs.statSync(source).isDirectory();
  } catch {
    return false;
  }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  let extraPatterns;
  try {
    extraPatterns = validateExtraPatterns(opts.extraPatterns.join('\n'));
  } catch (error) {
    fail(error.message);
  }

  const log = msg => { if (!opts.json) process.stderr.write(`${msg}\n`); };

  let cwd;
  let cleanup = () => {};
  const local = isLocalSource(opts.source);

  if (local) {
    cwd = opts.source && opts.source !== '.' ? path.resolve(opts.source) : process.cwd();
    if (isShallowRepository(cwd)) {
      log('Warning: this repository is shallow — the Vibe Index may be understated.');
    }
  } else {
    const depth = opts.depth != null ? opts.depth : opts.commits + 50;
    try {
      const cloned = cloneRepository(opts.source, { depth, ref: opts.ref, token: opts.token, log });
      cwd = cloned.dir;
      cleanup = opts.clean ? cloned.cleanup : () => {};
    } catch (error) {
      fail(error.message);
    }
  }

  try {
    const analysis = await analyzeRepository({
      commitsCount: opts.commits,
      coAuthorMultiplier: opts.coAuthorMultiplier,
      extraPatterns,
      cwd,
    });
    const { vibeIndex, metrics } = calculateVibeIndex(analysis);
    const score = vibeIndex.toFixed(1);

    if (opts.json) {
      const out = {
        vibeIndex: Number(score),
        description: getDescriptionForIndex(vibeIndex),
        commitsAnalyzed: analysis.totalCommits,
        aiPercentage: Number(metrics.aiPercentage.toFixed(1)),
        humanPercentage: Number(metrics.humanPercentage.toFixed(1)),
        aiCommitsPercentage: Number(metrics.aiCommitsPercentage.toFixed(1)),
        humanCommitsPercentage: Number(metrics.humanCommitsPercentage.toFixed(1)),
      };
      if (opts.badge) {
        out.badgeUrl = badgeUrlFor(score, vibeIndex);
        out.badgeMarkdown = generateBadgeMarkdown(out.badgeUrl);
      }
      process.stdout.write(`${JSON.stringify(out, null, 2)}\n`);
    } else {
      printHuman(score, vibeIndex, metrics, analysis);
      if (opts.badge) {
        const url = badgeUrlFor(score, vibeIndex);
        process.stdout.write(`\n  Badge:    ${url}\n`);
        process.stdout.write(`  Markdown: ${generateBadgeMarkdown(url)}\n`);
      }
    }
  } catch (error) {
    cleanup();
    fail(error.message);
  } finally {
    cleanup();
  }
}

function badgeUrlFor(score, vibeIndex) {
  const message = score === '10.0' ? '10' : score;
  return generateBadgeUrl({
    label: 'Vibe Index',
    message,
    style: 'flat-square',
    color: getColorForIndex(vibeIndex),
    logo: 'sparkles',
  });
}

function printHuman(score, vibeIndex, metrics, analysis) {
  const pct = n => `${n.toFixed(1)}%`.padStart(6);
  process.stdout.write(`\nVibe Index: ${score} / 10.0  (${getDescriptionForIndex(vibeIndex)})\n`);
  process.stdout.write(`  AI code:    ${pct(metrics.aiPercentage)}   |  Human code:    ${pct(metrics.humanPercentage)}\n`);
  process.stdout.write(`  AI commits: ${pct(metrics.aiCommitsPercentage)}   |  Human commits: ${pct(metrics.humanCommitsPercentage)}\n`);
  process.stdout.write(`  Commits analyzed: ${analysis.totalCommits}\n`);
}

main().catch(error => fail(error.message));
