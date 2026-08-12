const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

// Promptfoo runs from eval/, so a spawned claude with the default cwd could read
// ../create-prd-tests.md and ../create-architecture-tests.md - i.e. grade itself
// against the criteria it is being graded on. Every generation therefore runs in
// a fresh empty directory, which is the same isolation used for hand-run
// generations.
function makeSandbox() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'promptfoo-claude-'));
}

class ClaudeProvider {
  constructor(options) {
    options = options || {};
    this.providerId = options.id || 'claude';
    this.config = options.config || {};
    this.label = options.label;
  }
  id() { return this.providerId; }
  async callApi(prompt) {
    const model = this.config.model || 'haiku';
    const input = typeof prompt === 'string' ? prompt : JSON.stringify(prompt);
    const sandbox = makeSandbox();
    try {
      const res = spawnSync('claude', ['-p', '--model', model], {
        input: input,
        encoding: 'utf8',
        maxBuffer: 1024 * 1024 * 64,
        windowsHide: true,
        cwd: sandbox
      });
      if (res.error) { return { error: String(res.error.message || res.error) }; }
      if (res.status !== 0) { return { error: String(res.stdout || res.stderr || ('exit ' + res.status)) }; }
      return { output: res.stdout };
    } finally {
      try { fs.rmSync(sandbox, { recursive: true, force: true }); } catch (e) { /* leave it for the OS */ }
    }
  }
}

module.exports = ClaudeProvider;
