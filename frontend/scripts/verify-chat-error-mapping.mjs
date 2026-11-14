/**
 * Chat / AI error mapping honesty contracts.
 * Keep in sync with chatClient.ts and aiModes classify helpers.
 */
import assert from 'node:assert/strict';

function mapChatHttpError(status, detailMsg = '') {
  if (status === 503) {
    const lower = (detailMsg || '').toLowerCase();
    const isFast =
      lower.includes('gtx') ||
      lower.includes('fast') ||
      lower.includes('local ai is unavailable');
    return {
      status: 'unavailable',
      label: isFast ? 'FAST unavailable' : 'AI provider unavailable',
      detail:
        detailMsg ||
        (isFast
          ? 'FAST is currently offline. Choose another mode to continue.'
          : 'The selected AI mode is unavailable. Choose another mode to continue.'),
    };
  }
  if (status === 401) {
    return {
      status: 'unavailable',
      label: 'Sign in required',
      detail: detailMsg || 'Your session expired. Please sign in again.',
    };
  }
  return {
    status: 'unavailable',
    label: `Server Error (${status})`,
    detail: detailMsg,
  };
}

function classifyGenericUnavailable(message) {
  if (
    message.toLowerCase().includes('unavailable') ||
    message.toLowerCase().includes('503') ||
    message.toLowerCase().includes('timeout')
  ) {
    return {
      message:
        'The selected AI mode is unavailable. There is no silent fallback — please choose another mode explicitly.',
    };
  }
  return { message };
}

const fast503 = mapChatHttpError(503, 'Local AI is unavailable and cloud fallback is disabled.');
assert.equal(fast503.label, 'FAST unavailable');
assert.match(fast503.detail, /unavailable|offline|fallback/i);
assert.doesNotMatch(fast503.detail, /localhost:8080/);

const generic = classifyGenericUnavailable('provider unavailable 503');
assert.doesNotMatch(generic.message, /Automatic failover is standing by/i);
assert.match(generic.message, /no silent fallback/i);

console.log('verify-chat-error-mapping: ok');
