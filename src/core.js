const fs = require('fs');
const os = require('os');

/**
 * Minimal, dependency-free implementation of the subset of @actions/core
 * that this action needs. Implementing the GitHub Actions runner protocol
 * directly lets the action run from source (action.yml -> src/index.js)
 * without committing node_modules or bundling with ncc.
 *
 * See: https://docs.github.com/actions/creating-actions/metadata-syntax-for-github-actions
 */

const EOL = os.EOL;

/**
 * Read an action input. Mirrors @actions/core: the runner exposes inputs as
 * environment variables named INPUT_<NAME>, uppercased with spaces replaced
 * by underscores.
 *
 * @param {string} name
 * @param {{ required?: boolean }} [options]
 * @returns {string}
 */
function getInput(name, options = {}) {
  const envName = `INPUT_${name.replace(/ /g, '_').toUpperCase()}`;
  const value = process.env[envName] || '';

  if (options.required && value.trim() === '') {
    throw new Error(`Input required and not supplied: ${name}`);
  }

  return value.trim();
}

/**
 * Set an action output by appending to the file referenced by GITHUB_OUTPUT.
 * Falls back to the deprecated workflow command when the env var is absent
 * (e.g. when running outside the runner).
 *
 * @param {string} name
 * @param {string} value
 */
function setOutput(name, value) {
  const filePath = process.env.GITHUB_OUTPUT;
  const stringValue = toCommandValue(value);

  if (filePath) {
    fs.appendFileSync(filePath, formatKeyValueMessage(name, stringValue));
    return;
  }

  process.stdout.write(`::set-output name=${name}::${stringValue}${EOL}`);
}

function info(message) {
  process.stdout.write(`${message}${EOL}`);
}

function warning(message) {
  process.stdout.write(`::warning::${escapeData(message)}${EOL}`);
}

function error(message) {
  process.stdout.write(`::error::${escapeData(message)}${EOL}`);
}

/**
 * Mark the action as failed: emit an error annotation and set a non-zero
 * exit code.
 *
 * @param {string} message
 */
function setFailed(message) {
  process.exitCode = 1;
  error(message);
}

// --- helpers -------------------------------------------------------------

function toCommandValue(value) {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  return JSON.stringify(value);
}

function formatKeyValueMessage(key, value) {
  // Heredoc-style delimiter required by the GITHUB_OUTPUT file format so that
  // multi-line values are supported safely.
  const delimiter = `ghadelimiter_${key}`;

  if (key.includes(delimiter)) {
    throw new Error(`Unexpected input: name should not contain the delimiter "${delimiter}"`);
  }
  if (value.includes(delimiter)) {
    throw new Error(`Unexpected input: value should not contain the delimiter "${delimiter}"`);
  }

  return `${key}<<${delimiter}${EOL}${value}${EOL}${delimiter}${EOL}`;
}

function escapeData(data) {
  return toCommandValue(data)
    .replace(/%/g, '%25')
    .replace(/\r/g, '%0D')
    .replace(/\n/g, '%0A');
}

module.exports = {
  getInput,
  setOutput,
  info,
  warning,
  error,
  setFailed,
};
