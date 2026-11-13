/**
 * Contract test for Fast-mode selection migration rules.
 * Keep in sync with shouldAutoMigrateAwayFromFast() in src/config/aiModes.ts
 */
import assert from 'node:assert/strict';

function shouldAutoMigrateAwayFromFast(gtxFastModeEnabled) {
  return gtxFastModeEnabled !== true;
}

assert.equal(shouldAutoMigrateAwayFromFast(true), false, 'keep FAST when GTX Fast Mode enabled (even if offline)');
assert.equal(shouldAutoMigrateAwayFromFast(false), true, 'migrate away when GTX Fast Mode disabled');
assert.equal(shouldAutoMigrateAwayFromFast(undefined), true, 'migrate away when flag unknown/disabled');
assert.equal(shouldAutoMigrateAwayFromFast(null), true, 'migrate away when flag null');

console.log('verify-ai-mode-selection: ok');
