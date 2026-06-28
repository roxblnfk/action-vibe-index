const fs = require('fs');
const core = require('./core');
const { analyzeRepository } = require('./analyzer');
const { calculateVibeIndex, getColorForIndex, getDescriptionForIndex } = require('./calculator');
const { generateBadgeUrl, generateBadgeMarkdown } = require('./badge');
const { updateBadgeInFile } = require('./updater');
const { validateAllInputs } = require('./validation');

const DEFAULT_BADGE_COLOR = '3498db';

async function run() {
  try {
    const rawInputs = {
      commitsCount: core.getInput('commits-count') || '500',
      coAuthorMultiplier: core.getInput('co-author-multiplier') || '0.5',
      aiKeywords: core.getInput('ai-keywords') || 'Claude,GPT,AI,Agent',
      badgeStyle: core.getInput('badge-style') || 'flat-square',
      badgeColor: core.getInput('badge-color') || DEFAULT_BADGE_COLOR,
      badgeLogo: core.getInput('badge-logo'),
      assertIndex: core.getInput('assert-index'),
      badgeOutputFile: core.getInput('badge-output-file'),
      updateFile: core.getInput('update-file'),
      includeMessage: core.getInput('include-message') || 'Vibe Index',
    };

    const validation = validateAllInputs(rawInputs);
    if (!validation.success) {
      core.setFailed(`Input validation failed: ${validation.error}`);
      return;
    }

    const {
      commitsCount,
      coAuthorMultiplier,
      aiKeywords,
      badgeStyle,
      badgeColor,
      badgeLogo,
      assertIndex,
      badgeOutputFile,
      updateFile,
      includeMessage,
    } = validation.validated;

    core.info('Starting Vibe Index analysis...');
    core.info(`  Commits to analyze: ${commitsCount}`);
    core.info(`  Co-author multiplier: ${coAuthorMultiplier}`);
    core.info(`  AI keywords: ${aiKeywords.join(', ')}`);

    const analysis = await analyzeRepository({
      commitsCount,
      coAuthorMultiplier,
      aiKeywords,
    });

    const { vibeIndex, metrics } = calculateVibeIndex(analysis);
    const score = vibeIndex.toFixed(1);

    // Auto-pick a color based on the score when the user kept the default.
    const finalBadgeColor = badgeColor === DEFAULT_BADGE_COLOR
      ? getColorForIndex(vibeIndex)
      : badgeColor;

    const badgeUrl = generateBadgeUrl({
      label: includeMessage,
      message: `${score}/10.0`,
      style: badgeStyle,
      color: finalBadgeColor,
      logo: badgeLogo,
    });

    const badgeMarkdown = generateBadgeMarkdown(badgeUrl, includeMessage);

    core.setOutput('vibe-index', score);
    core.setOutput('human-percentage', metrics.humanPercentage.toFixed(1));
    core.setOutput('ai-percentage', metrics.aiPercentage.toFixed(1));
    core.setOutput('human-commits-percentage', metrics.humanCommitsPercentage.toFixed(1));
    core.setOutput('ai-commits-percentage', metrics.aiCommitsPercentage.toFixed(1));
    core.setOutput('badge-url', badgeUrl);
    core.setOutput('badge-markdown', badgeMarkdown);

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

    if (updateFile) {
      const result = updateBadgeInFile(updateFile, badgeMarkdown);
      if (!result.ok) {
        core.warning(`Could not update ${updateFile}: ${result.reason}`);
      } else if (result.changed) {
        core.info(`Updated badge in: ${updateFile}`);
      } else {
        core.info(`Badge in ${updateFile} already up to date.`);
      }
    }

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
  }
}

run();
