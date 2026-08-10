#!/usr/bin/env node
// Combined Claude Code CLI provider and grader for promptfoo
// PATCHED: sends prompt text via stdin instead of argv, to avoid the Windows
// "spawn ENAMETOOLONG" command-line length limit on large outputs.

const { spawnSync } = require('child_process');

const prompt = process.argv[2];
const options = process.argv[3];

function runClaude(inputText, extraArgs) {
  const result = spawnSync('claude', ['-p'].concat(extraArgs), {
    input: inputText,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 64,
    stdio: ['pipe', 'pipe', 'pipe']
  });
  if (result.error) { console.error(result.error.message); process.exit(1); }
  if (result.status !== 0) { console.error(result.stdout || result.stderr); process.exit(result.status || 1); }
  console.log(result.stdout);
}

let isGraderMode = false;
try {
  const parsed = JSON.parse(prompt);
  if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].role) { isGraderMode = true; }
} catch (e) {}

if (isGraderMode) {
  let systemMsg, userMsg;
  try {
    const messages = JSON.parse(prompt);
    const systemMessage = messages.find(m => m.role === 'system');
    const userMessage = messages.find(m => m.role === 'user');
    if (systemMessage && userMessage) { systemMsg = systemMessage.content; userMsg = userMessage.content; }
    else { throw new Error('Missing system or user message'); }
  } catch (e) {
    systemMsg = 'You are an evaluator. Respond with only valid JSON: {"pass": bool, "score": 0.0-1.0, "reason": "string"}';
    userMsg = prompt;
  }
  runClaude(userMsg, ['--system-prompt', systemMsg, '--model', 'haiku']);
} else {
  let model = 'haiku';
  if (options && options !== '{}') {
    try {
      const optionsObj = JSON.parse(options);
      if (optionsObj.config && optionsObj.config.model) { model = optionsObj.config.model; }
    } catch (e) { model = 'haiku'; }
  }
  runClaude(prompt, ['--model', model]);
}