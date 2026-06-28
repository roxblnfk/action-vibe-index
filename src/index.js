const core = require('@actions/core');
const github = require('@actions/github');
const { analyzeRepository } = require('./analyzer');
const { calculateVibeIndex, getColorForIndex } = require('./calculator');
const { generateBadgeUrl } = require('./badge');
const { validateAllInputs } = require('./validation');

async function run() {
  try {
    // Get and validate inputs
    const rawInputs = {
      commitsCount: core.getInput('commits-count') || '500',
      coAuthorMultiplier: core.getInput('co-author-multiplier') || '0.5',
      aiKeywords: core.getInput('ai-keywords') || 'Claude,GPT,AI,Agent',
      badgeStyle: core.getInput('badge-style') || 'flat-square',
      badgeColor: core.getInput('badge-color') || '3498db',
      assertIndex: core.getInput('assert-index') || '',
      badgeOutputFile: core.getInput('badge-output-file') || '',
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
      assertIndex,
      badgeOutputFile,
      includeMessage,
    } = validation.validated;

    core.info(`Starting Vibe Index analysis...`);
    core.info(`  Commits to analyze: ${commitsCount}`);
    core.info(`  Co-author multiplier: ${coAuthorMultiplier}`);
    core.info(`  AI keywords: ${aiKeywords.join(', ')}`);

    // Analyze repository
    const analysis = await analyzeRepository({
      commitsCount,
      coAuthorMultiplier,
      aiKeywords,
    });

    // Calculate Vibe Index
    const { vibeIndex, metrics } = calculateVibeIndex(analysis);

    // Choose badge color based on Vibe Index (if default was used)
    let finalBadgeColor = badgeColor;
    if (badgeColor === '3498db') { // Default color
      finalBadgeColor = getColorForIndex(vibeIndex);
    }

    // Generate badge URL
    const badgeUrl = generateBadgeUrl({
      message: includeMessage,
      value: vibeIndex.toFixed(1),
      style: badgeStyle,
      color: finalBadgeColor,
    });

    const badgeMarkdown = `[![Vibe Index](${badgeUrl})]()`;

    // Output results
    core.setOutput('vibe-index', vibeIndex.toFixed(1));
    core.setOutput('human-percentage', metrics.humanPercentage.toFixed(1));
    core.setOutput('ai-percentage', metrics.aiPercentage.toFixed(1));
    core.setOutput('human-commits-percentage', metrics.humanCommitsPercentage.toFixed(1));
    core.setOutput('ai-commits-percentage', metrics.aiCommitsPercentage.toFixed(1));
    core.setOutput('badge-url', badgeUrl);
    core.setOutput('badge-markdown', badgeMarkdown);

    // Log results
    core.info(`\n📊 Vibe Index Results:`);
    core.info(`  Vibe Index: ${vibeIndex.toFixed(1)}/10.0`);
    core.info(`  Human code: ${metrics.humanPercentage.toFixed(1)}%`);
    core.info(`  AI code: ${metrics.aiPercentage.toFixed(1)}%`);
    core.info(`  Human commits: ${metrics.humanCommitsPercentage.toFixed(1)}%`);
    core.info(`  AI commits: ${metrics.aiCommitsPercentage.toFixed(1)}%`);
    core.info(`\n🎯 Badge: ${badgeUrl}`);
    core.info(`\n📝 Markdown: ${badgeMarkdown}`);

    // Check assertion if specified
    if (assertIndex) {
      const { min, max } = assertIndex;

      if (vibeIndex < min || vibeIndex > max) {
        core.setFailed(
          `Vibe Index ${vibeIndex.toFixed(1)} is outside assertion range [${min}, ${max}]`
        );
        return;
      }

      core.info(`✅ Vibe Index ${vibeIndex.toFixed(1)} is within assertion range [${min}, ${max}]`);
    }

    // Write badge URL to file if specified
    if (badgeOutputFile) {
      const fs = require('fs');
      fs.writeFileSync(badgeOutputFile, badgeUrl);
      core.info(`\n📄 Badge URL written to: ${badgeOutputFile}`);
    }

    core.info(`\n✅ Vibe Index analysis completed successfully!`);
  } catch (error) {
    core.setFailed(`Error: ${error.message}`);
  }
}

run();
