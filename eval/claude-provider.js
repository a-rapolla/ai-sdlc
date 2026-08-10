const { spawnSync } = require('child_process');

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
    const res = spawnSync('claude', ['-p', '--model', model], {
      input: input,
      encoding: 'utf8',
      maxBuffer: 1024 * 1024 * 64,
      windowsHide: true
    });
    if (res.error) { return { error: String(res.error.message || res.error) }; }
    if (res.status !== 0) { return { error: String(res.stdout || res.stderr || ('exit ' + res.status)) }; }
    return { output: res.stdout };
  }
}

module.exports = ClaudeProvider;