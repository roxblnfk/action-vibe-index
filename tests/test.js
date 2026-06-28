const { calculateVibeIndex, getColorForIndex, getDescriptionForIndex } = require('../src/calculator');
const { generateBadgeUrl, generateBadgeMarkdown } = require('../src/badge');

// Test calculation
const mockAnalysis = {
  humanPercentage: 75,
  aiPercentage: 25,
  humanCommitsPercentage: 80,
  aiCommitsPercentage: 20,
};

const { vibeIndex, metrics } = calculateVibeIndex(mockAnalysis);

console.log('📊 Vibe Index Test Results:');
console.log('===========================');
console.log(`Human Code: ${metrics.humanPercentage.toFixed(1)}%`);
console.log(`AI Code: ${metrics.aiPercentage.toFixed(1)}%`);
console.log(`Human Commits: ${metrics.humanCommitsPercentage.toFixed(1)}%`);
console.log(`AI Commits: ${metrics.aiCommitsPercentage.toFixed(1)}%`);
console.log(`\nVibe Index: ${vibeIndex.toFixed(1)}/10.0`);
console.log(`Color: #${getColorForIndex(vibeIndex)}`);
console.log(`Description: ${getDescriptionForIndex(vibeIndex)}`);

// Test badge generation
const badgeUrl = generateBadgeUrl({
  message: 'Vibe Index',
  value: vibeIndex.toFixed(1),
  style: 'flat-square',
  color: getColorForIndex(vibeIndex),
});

console.log(`\nBadge URL: ${badgeUrl}`);
console.log(`Markdown: ${generateBadgeMarkdown(badgeUrl)}`);

// Test edge cases
console.log('\n\n📈 Edge Cases:');
console.log('==============');

const testCases = [
  { human: 100, aiCode: 0, aiCommits: 0, label: 'Pure human code' },
  { human: 0, aiCode: 100, aiCommits: 100, label: 'Pure AI code' },
  { human: 50, aiCode: 50, aiCommits: 50, label: 'Balanced (50/50)' },
  { human: 80, aiCode: 20, aiCommits: 90, label: 'Human focused (80% code, 90% commits)' },
];

testCases.forEach(test => {
  const analysis = {
    humanPercentage: test.human,
    aiPercentage: test.aiCode,
    humanCommitsPercentage: 100 - test.aiCommits,
    aiCommitsPercentage: test.aiCommits,
  };
  const { vibeIndex: index } = calculateVibeIndex(analysis);
  console.log(`${test.label}: ${index.toFixed(1)}/10.0 (${getDescriptionForIndex(index)})`);
});

console.log('\n✅ Tests completed!');
