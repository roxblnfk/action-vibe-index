const fs = require('fs');
const core = require('./core');
const { analyzeRepository, isShallowRepository } = require('./analyzer');
const { calculateVibeIndex, getColorForIndex, getDescriptionForIndex } = require('./calculator');
const { generateBadgeUrl, generateBadgeMarkdown, generateBadgeHtml } = require('./badge');
const { updateBadgeInFile } = require('./updater');
const { commitChanges } = require('./committer');
const { cloneRepository } = require('./repo');
const { validateAllInputs } = require('./validation');

async function run() {
  let cleanup = () => {};
  try {
    const rawInputs = {
      commitsCount: core.getInput('commits-count') || '250',
      fetch: core.getInput('fetch'),
      repository: core.getInput('repository'),
      ref: core.getInput('ref'),
      token: core.getInput('token'),
      coAuthorMultiplier: core.getInput('co-author-multiplier') || '0.8',
      extraPatterns: core.getInput('extra-bot-patterns'),
      badgeStyle: core.getInput('badge-style') || 'flat-square',
      badgeColor: core.getInput('badge-color') || 'auto',
      badgeLogo: core.getInput('badge-logo'),
      badgeLink: core.getInput('badge-link'),
      badgeDiscovery: core.getInput('badge-discovery'),
      assertIndex: core.getInput('assert-index'),
      badgeOutputFile: core.getInput('badge-output-file'),
      updateFiles: core.getInput('update-files'),
      commit: core.getInput('commit'),
      push: core.getInput('push'),
      commitMessage: core.getInput('commit-message'),
      commitUserName: core.getInput('commit-user-name'),
      commitUserEmail: core.getInput('commit-user-email'),
      includeMessage: core.getInput('include-message') || 'Vibe Index',
    };

    const validation = validateAllInputs(rawInputs);
    if (!validation.success) {
      core.setFailed(`Input validation failed: ${validation.error}`);
      return;
    }

    const {
      commitsCount,
      fetch,
      repository,
      ref,
      token,
      coAuthorMultiplier,
      extraPatterns,
      badgeStyle,
      badgeColor,
      badgeLogo,
      badgeLink,
      badgeDiscovery,
      assertIndex,
      badgeOutputFile,
      updateFiles,
      commit,
      push,
      commitMessage,
      commitUserName,
      commitUserEmail,
      includeMessage,
    } = validation.validated;

    core.info('Starting Vibe Index analysis...');
    core.info(`  Commits to analyze: ${commitsCount}`);
    core.info(`  Co-author multiplier: ${coAuthorMultiplier}`);
    core.info(`  Extra bot patterns: ${extraPatterns.length ? extraPatterns.map(re => re.source).join(', ') : '(none)'}`);

    // Where to run git. In fetch mode the repo is cloned into a temp dir below;
    // otherwise the prior actions/checkout (the process cwd) is analyzed.
    let analyzeCwd;

    if (fetch) {
      // Self-fetch: clone the repository ourselves so the workflow doesn't need
      // a separate actions/checkout step. The clone depth is sized to the
      // analysis window, so it is never reported as "shallow" below.
      const source = repository || process.env.GITHUB_REPOSITORY;
      if (!source) {
        core.setFailed('fetch is true but no "repository" was given and $GITHUB_REPOSITORY is unset.');
        return;
      }
      const fetchRef = ref || process.env.GITHUB_REF_NAME || '';
      const fetchToken = token || process.env.GITHUB_TOKEN || '';
      try {
        const cloned = cloneRepository(source, {
          depth: commitsCount + 50,
          ref: fetchRef,
          token: fetchToken,
          log: msg => core.info(`  ${msg}`),
        });
        analyzeCwd = cloned.dir;
        cleanup = cloned.cleanup;
      } catch (error) {
        core.setFailed(error.message);
        return;
      }
    } else if (isShallowRepository()) {
      // A shallow checkout truncates history, so the analysis sees only the
      // commits past the boundary and silently understates the score (often
      // 0.0). Warn loudly rather than fail — the run still produces a (skewed)
      // badge.
      core.warning(
        'The git repository is shallow: history is truncated, so the Vibe Index ' +
        'may be understated (commits beyond the shallow boundary are invisible). ' +
        'Use actions/checkout with "fetch-depth: 0", and avoid running ' +
        '"git fetch --depth=..." before this step (it re-shallows a full clone). ' +
        'Alternatively, set "fetch: true" to let this action clone the repo itself.'
      );
    }

    const analysis = await analyzeRepository({
      commitsCount,
      coAuthorMultiplier,
      extraPatterns,
      cwd: analyzeCwd,
    });

    const { vibeIndex, metrics } = calculateVibeIndex(analysis);
    const score = vibeIndex.toFixed(1);
    // Drop the fractional part for a perfect 10 ("10" reads cleaner than "10.0").
    const badgeMessage = score === '10.0' ? '10' : score;

    // "auto" (the default) picks a color from the green->purple gradient at the
    // displayed score (getColorForIndex quantizes to the 0.1 step); any explicit
    // color is used as-is.
    const finalBadgeColor = badgeColor === 'auto'
      ? getColorForIndex(vibeIndex)
      : badgeColor;

    const badgeUrl = generateBadgeUrl({
      label: includeMessage,
      message: badgeMessage,
      style: badgeStyle,
      color: finalBadgeColor,
      logo: badgeLogo,
    });

    const badgeMarkdown = generateBadgeMarkdown(badgeUrl, includeMessage, badgeLink);
    const badgeHtml = generateBadgeHtml(badgeUrl, includeMessage, badgeLink);

    core.setOutput('vibe-index', score);
    core.setOutput('human-percentage', metrics.humanPercentage.toFixed(1));
    core.setOutput('ai-percentage', metrics.aiPercentage.toFixed(1));
    core.setOutput('human-commits-percentage', metrics.humanCommitsPercentage.toFixed(1));
    core.setOutput('ai-commits-percentage', metrics.aiCommitsPercentage.toFixed(1));
    core.setOutput('badge-url', badgeUrl);
    core.setOutput('badge-markdown', badgeMarkdown);
    core.setOutput('badge-html', badgeHtml);

    core.info('\nVibe Index Results:');
    core.info(`  Vibe Index: ${score}/10.0 (${getDescriptionForIndex(vibeIndex)})`);
    core.info(`  Human code: ${metrics.humanPercentage.toFixed(1)}%`);
    core.info(`  AI code: ${metrics.aiPercentage.toFixed(1)}%`);
    core.info(`  Human commits: ${metrics.humanCommitsPercentage.toFixed(1)}%`);
    core.info(`  AI commits: ${metrics.aiCommitsPercentage.toFixed(1)}%`);
    core.info(`  Badge: ${badgeUrl}`);
    core.info(`  Markdown: ${badgeMarkdown}`);

    if (badgeOutputFile) {
      fs.writeFileSync(badgeOutputFile, badgeUrl);
      core.info(`Badge URL written to: ${badgeOutputFile}`);
    }

    // fetch mode is read-only: the repo lives in a throwaway temp dir, so
    // rewriting its README or committing there would be pointless. Skip both,
    // warning only if the caller actually asked for them.
    if (fetch) {
      if (updateFiles.length > 0 || commit) {
        core.warning('fetch mode is read-only: update-files and commit are skipped.');
      }
    } else {
      const changedFiles = [];
      for (const file of updateFiles) {
        const result = updateBadgeInFile(file, { markdown: badgeMarkdown, html: badgeHtml }, badgeDiscovery);
        if (!result.ok) {
          core.warning(`Could not update ${file}: ${result.reason}`);
        } else if (result.changed) {
          changedFiles.push(file);
          core.info(`Updated badge in: ${file}`);
        } else {
          core.info(`Badge in ${file} already up to date.`);
        }
      }

      // Optional auto-commit. Runs before the assertion so the badge is
      // persisted even when the score is out of range and the action fails.
      if (commit) {
        if (changedFiles.length === 0) {
          core.info('Auto-commit: nothing changed, skipping.');
        } else {
          try {
            const result = commitChanges({
              files: changedFiles,
              message: commitMessage,
              userName: commitUserName,
              userEmail: commitUserEmail,
              push,
            });
            if (result.pushed) {
              core.info(`Auto-commit: committed and pushed to ${result.branch}.`);
            } else if (result.committed) {
              core.info('Auto-commit: committed' + (push ? ` (push skipped: ${result.reason})` : '.'));
            } else {
              core.info(`Auto-commit: ${result.reason}.`);
            }
          } catch (error) {
            core.warning(`Auto-commit failed: ${error.message}`);
          }
        }
      }
    }

    // IMPORTANT: the assertion must stay last. All side effects (outputs, the
    // badge file, the README updates, and the auto-commit above) must run
    // *before* it, so the badge is always refreshed and committed even when the
    // score is out of range and the action fails.
    if (assertIndex) {
      const { min, max } = assertIndex;
      if (vibeIndex < min || vibeIndex > max) {
        core.setFailed(
          `Vibe Index ${score} is outside assertion range [${min.toFixed(1)}, ${max.toFixed(1)}]`
        );
        return;
      }
      core.info(`Vibe Index ${score} is within assertion range [${min.toFixed(1)}, ${max.toFixed(1)}]`);
    }

    core.info('Vibe Index analysis completed successfully.');
  } catch (error) {
    core.setFailed(`Error: ${error.message}`);
  } finally {
    // Remove the temp clone created by fetch mode (no-op otherwise).
    cleanup();
  }
}

run();
